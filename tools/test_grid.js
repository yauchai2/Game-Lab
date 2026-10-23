// node tools/test_grid.js：接線板邏輯測試
const G = require('../src/game/00-grid.js');
const assert = require('assert');

// 技能只能放在插槽，配件只能放在中間的格子，壞軌不能放
let b = G.createBoard();
assert.strictEqual(G.place(b, 'active', 'FIRE', 3, 3), null, '技能不能放在棋盤中間');
const fire = G.place(b, 'active', 'FIRE', 7, 3);
assert(fire, '插槽放得下技能');
assert.strictEqual(G.place(b, 'active', 'FROST', 7, 3), null, '同一個插槽只能放一個技能');
assert.strictEqual(G.place(b, 'support', 'HEAVY', 0, 3), null, '電源欄不能放配件');
assert.strictEqual(G.place(b, 'support', 'HEAVY', G.ROCKS[0][0], G.ROCKS[0][1]), null, '壞軌不能放配件');
assert(G.connected(b, 0), '放下技能時自動接上最短的線');
assert.strictEqual(G.getWire(b, 0).cells.length, 6, '第一個插槽的直線是 6 格');

// 拉線規則
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3, 0, { noWire: true });
assert.strictEqual(G.extend(b, 0, 3, 3).ok, false, '線要從電源旁邊（第 1 欄）開始');
assert(G.extend(b, 0, 1, 3).ok);
assert.strictEqual(G.extend(b, 0, 3, 3).ok, false, '只能接在線尾旁邊');
assert.strictEqual(G.extend(b, 0, G.ROCKS[0][0], G.ROCKS[0][1]).ok, false, '壞軌不能走線');
for (let x = 2; x <= 5; x++) assert(G.extend(b, 0, x, 3).ok);
assert.strictEqual(G.connected(b, 0), false, '還沒走到插槽旁');
const done = G.extend(b, 0, 6, 3);
assert(done.ok && done.connected, '走到插槽旁就接通');
assert.strictEqual(G.extend(b, 0, 6, 4).ok, false, '接通後不能再延伸');
G.shrink(b, 0);
assert.strictEqual(G.connected(b, 0), false, '收回最後一格就斷線');
assert.strictEqual(G.wireOf(b, 6, 3), undefined);
// 別條線佔用的格子不能再走
G.place(b, 'active', 'FROST', 7, 4, 0, { noWire: true });
assert(G.extend(b, 1, 1, 4).ok);
assert.strictEqual(G.extend(b, 1, 2, 4).ok && G.extend(b, 1, 2, 3).ok, false, '兩條線不能共用格子');

// 線長與配件上限隨等級成長
assert.strictEqual(G.unlockedCount(G.createBoard(), 1), 1);
assert.strictEqual(G.unlockedCount(G.createBoard(), 9), 3);
assert.strictEqual(G.unlockedCount(G.createBoard(), 30), 6);
assert(G.wireMax(G.createBoard(), 1) >= 6, '第一級的線長要夠走一條直線');
assert.strictEqual(G.gemCap(1), 2); assert.strictEqual(G.gemCap(15), 5);
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3, 0, { noWire: true });
for (let x = 1; x <= 6; x++) { const r = G.extend(b, 0, x, 3, 1); if (x <= G.wireMax(b, 1)) assert(r.ok, '線長內可以走'); }
assert.strictEqual(G.extend(b, 0, 6, 4, 1).ok, false);

// 結算：線經過才生效，依序取到上限；相鄰同款 ×1.2；強化格 ×1.4（等級 6 起）
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3);
const spot = (k) => G.findSpot(b, 'support', k, 1);
G.place(b, 'support', 'HEAVY', 1, 3);
G.place(b, 'support', 'CRITS', 2, 5);      // 不在線上
let r = G.resolve(b, 1)[0];
assert.deepStrictEqual(r.linked.length, 1, '不在線上的配件不生效');
assert.strictEqual(r.stat.dmg, 0.45);
assert.strictEqual(r.stat.crit, 0);
G.place(b, 'support', 'HEAVY', 2, 3);
r = G.resolve(b, 1)[0];
assert.deepStrictEqual(r.weights.map(w => +w.toFixed(2)), [1.2, 1.2], '相鄰同款各 ×1.2');
G.place(b, 'support', 'HASTE', 3, 3);
r = G.resolve(b, 1)[0];
assert.strictEqual(r.linked.length, 2, '等級 1 一條線最多 2 個配件生效');
assert.strictEqual(r.over.length, 1, '超過上限的配件記在 over');
r = G.resolve(b, 4)[0];
assert.strictEqual(r.linked.length, 3, '等級 4 可以到 3 個');
// 強化格
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3);
const [bx, by] = G.BOOSTS.find(c => c[1] === 3);
G.place(b, 'support', 'HEAVY', bx, by);
assert.strictEqual(G.resolve(b, 5)[0].weights[0], 1, '等級 6 以前強化格不生效');
assert.strictEqual(G.resolve(b, 6)[0].weights[0], G.BOOST_MUL, '等級 6 起強化格 ×1.4');
assert(Math.abs(G.resolve(b, 6)[0].stat.dmg - .45*1.4) < 1e-9);
// 標籤不符：廣播只對投射物，冷氣爆發是範圍
b = G.createBoard();
G.place(b, 'active', 'FROST', 7, 3);
G.place(b, 'support', 'AREA', 1, 3);
r = G.resolve(b, 9)[0];
assert.strictEqual(r.linked.length, 0, '標籤不符不生效');
assert.strictEqual(r.missed.length, 1);
// 沒接通的線不生效
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3, 0, { noWire: true });
G.extend(b, 0, 1, 3); G.place(b, 'support', 'HEAVY', 1, 3);
assert.strictEqual(G.resolve(b, 9)[0].linked.length, 0);

// 冷卻縮減上限 60%
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3);
for (const x of [1, 3, 5]) G.place(b, 'support', 'HASTE', x, 3);
assert.strictEqual(G.resolve(b, 15)[0].stat.cd, -0.6, '三個寬頻 -90% 要被上限卡在 -60%');

// DPS：無輔助 = 武器傷害 × 倍率 ÷ 冷卻；強度會放大配件效果
b = G.createBoard();
G.place(b, 'active', 'FIRE', 7, 3);
const hero = { hit: 100, crit: 0, cm: 150 };
let d = G.dps(b, hero, 9)[0];
assert(Math.abs(d.dps - 100 * 2.6 / 2.6) < 1e-9, '基礎 DPS');
G.place(b, 'support', 'HEAVY', 1, 3);
d = G.dps(b, hero, 9)[0];
assert(Math.abs(d.dps - 100 * 1.45) < 1e-9, '一個超頻 +45%');
G.place(b, 'support', 'HEAVY', 2, 3);
d = G.dps(b, hero, 9)[0];
assert(Math.abs(d.dps - 100 * (1 + .45*2.4) * 1.0) < 1e-9, '相鄰兩個超頻各 ×1.2：+108%');
const hc = G.dps(b, { hit: 100, crit: 50, cm: 200 }, 9)[0];
assert(Math.abs(hc.hit / d.hit - 1.5) < 1e-9, '50% 暴擊、暴傷 200% 的期望倍率 1.5');

// 自動接線：六個插槽可以同時接通，總長度不超過 30 級的線長
b = G.createBoard();
Object.keys(G.ACTIVES).slice(0, 6).forEach((k, i) => G.place(b, 'active', k, G.SOCKS[i][0], G.SOCKS[i][1], 0, { noWire: true }));
const all = G.autoWireAll(b, 30);
assert(all.ok && all.count === 6, '六條線全部接通');
assert(G.wireLen(b) <= G.wireMax(b, 30), '總線長在上限內');
const seen = new Set();
for (const w of b.wires) for (const c of w.cells) { assert(!seen.has(c.join()), '線不重疊'); seen.add(c.join()); assert(!G.isRock(c[0], c[1])); }
// 每個插槽單獨接線，也不會比直線多走超過 3 格
for (let i = 0; i < 6; i++) { const t = G.createBoard(); G.place(t, 'active', 'FIRE', G.SOCKS[i][0], G.SOCKS[i][1], 0, { noWire: true }); assert(G.autoWire(t, i).ok); assert(G.getWire(t, i).cells.length <= 9, '插槽 ' + i + ' 的路線太繞'); }

// 讀檔整理：不合法的線與配件會被丟掉，合法的原樣保留
const messy = JSON.parse(JSON.stringify(b));
messy.wires.push({ sock: 0, cells: [[1, 0]] });                 // 重複插槽
messy.wires.push({ sock: 9, cells: [[1, 0]] });                 // 不存在的插槽
messy.pieces.push({ id: 99, kind: 'support', key: 'HEAVY', x: G.ROCKS[0][0], y: G.ROCKS[0][1] });   // 壓在壞軌上
messy.pieces.push({ id: 98, kind: 'support', key: 'NOPE', x: 2, y: 2 });
const clean = G.normalize(messy);
assert.strictEqual(clean.wires.length, 6);
assert.strictEqual(clean.pieces.filter(p => p.kind === 'support').length, 0);
assert.deepStrictEqual(G.normalize(JSON.parse(JSON.stringify(b))), b, '合法的接線板整理後完全相同');

// 舊版方塊拼圖搬家：技能依序放進插槽，原本相鄰的輔助放到各自的線上，其他的留在庫存
const old = { w: 6, h: 3, v: 3, nextId: 9, pieces: [
  { id: 1, kind: 'active', key: 'FIRE', x: 1, y: 1, rot: 0 },
  { id: 2, kind: 'support', key: 'HEAVY', x: 1, y: 0, rot: 0 },    // 橫兩格 (1,0)(2,0)，貼著 FIRE
  { id: 3, kind: 'support', key: 'CRITS', x: 0, y: 1, rot: 0 },    // 貼著 FIRE 左邊
  { id: 4, kind: 'support', key: 'LEECH', x: 5, y: 2, rot: 0 },    // 沒貼著任何技能
  { id: 5, kind: 'active', key: 'FROST', x: 3, y: 1, rot: 0, mode: 'FROST_STORM' },
  { id: 6, kind: 'support', key: 'AREA', x: 3, y: 2, rot: 0 },     // 廣播只對投射物：冷氣爆發不適用
] };
const mig = G.adopt(old, 12);
assert.strictEqual(mig.v, 4);
const rs = G.resolve(mig, 12);
assert.deepStrictEqual(rs.map(x => x.key), ['FIRE', 'FROST'], '技能依原本的上下左右順序進插槽');
assert.deepStrictEqual(rs[0].linked.map(id => mig.pieces.find(p => p.id === id).key).sort(), ['CRITS', 'HEAVY']);
assert.strictEqual(rs[1].linked.length, 0);
assert.strictEqual(mig.pieces.find(p => p.key === 'FROST').mode, 'FROST_STORM', '模式卡匣跟著技能');
assert(rs.every(x => x.wired), '搬家後每個技能都有接通的線');
assert.strictEqual(mig.pieces.filter(p => p.kind === 'support').length, 2, '貼不到技能的輔助不放上板子，留在庫存');
// 技能多過等級解鎖的插槽：搬家時保留，不讓玩家少掉技能
const many = { v: 3, pieces: ['FIRE', 'FROST', 'CHAIN'].map((k, i) => ({ id: i + 1, kind: 'active', key: k, x: i * 2, y: 0, rot: 0 })) };
const keep = G.adopt(many, 1);
assert.deepStrictEqual(G.resolve(keep, 1).map(x => x.key), ['FIRE', 'FROST', 'CHAIN']);
assert.strictEqual(G.unlockedCount(keep, 1), 3);
// 很舊的存檔
const lg = G.fromLegacy(['FIRE'], { FIRE: ['HEAVY', 'CRITS'] }, 1);
assert.deepStrictEqual(G.resolve(lg, 1)[0].linked.length, 2);

// 配件階級：Ⅱ ×1.5、Ⅲ ×2，存進棋盤並能通過正規化
{
  const b = G.createBoard(); G.place(b, 'active', 'FIRE', G.W - 1, 3, 0, { lvl: 1 });
  const w = G.getWire(b, 0), c = w.cells.find(q => !G.isRock(q[0], q[1]) && !G.isBoost(q[0], q[1]));
  const p2 = G.place(b, 'support', 'HEAVY', c[0], c[1], 0, { t: 2 });
  assert.deepStrictEqual(G.resolve(b, 1)[0].weights, [1.5]);
  p2.t = 3; assert.deepStrictEqual(G.resolve(b, 1)[0].weights, [2]);
  assert.strictEqual(G.adopt(JSON.parse(JSON.stringify(b)), 1).pieces.find(q => q.kind === 'support').t, 3);
}

// 與遊戲資料不漂移：技能倍率與冷卻要和 01-data.js 一致
const vm = require('vm'), fs = require('fs');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/game/01-data.js', 'utf8') + ';this.SKILLS=SKILLS;this.SUPPS=SUPPS;this.SLOT_LV=SLOT_LV;', ctx);
for (const k of Object.keys(G.ACTIVES)) { assert(ctx.SKILLS[k], k); assert.strictEqual(G.ACTIVES[k].mult, ctx.SKILLS[k].mult, k + ' mult'); assert.strictEqual(G.ACTIVES[k].cd, ctx.SKILLS[k].cd, k + ' cd'); }
assert.deepStrictEqual(Object.keys(G.SUPPORTS).sort(), Object.keys(ctx.SUPPS).sort(), '輔助清單一致');
assert.deepStrictEqual(Array.from(G.SOCK_LV), Array.from(ctx.SLOT_LV), '插槽解鎖等級與 SLOT_LV 一致');
console.log('grid tests ok');
