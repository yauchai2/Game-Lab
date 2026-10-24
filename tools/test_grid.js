// node tools/test_grid.js：接線板邏輯測試（B3 色塊接線板）
const G = require('../src/game/00-grid.js');
const assert = require('assert');
const padOf = (b, i, col) => { const w = G.getWire(b, i); return w.cells.find(c => G.isPad(c[0], c[1]) && (!col || G.padColor(c[0], c[1]) === col)); };

// 技能只能放在插槽；配件只能放在色塊襯墊上；壞軌與電源不能放
let b = G.createBoard();
assert.strictEqual(G.place(b, 'active', 'FIRE', 4, 4), null, '技能不能放在棋盤中間');
const [sx, sy] = G.SOCKS[0];
assert(G.place(b, 'active', 'FIRE', sx, sy), '插槽放得下技能');
assert.strictEqual(G.place(b, 'active', 'FROST', sx, sy), null, '同一個插槽只能放一個技能');
assert.strictEqual(G.place(b, 'support', 'HEAVY', G.SRCS[0][0], G.SRCS[0][1]), null, '電源不能放配件');
assert.strictEqual(G.place(b, 'support', 'HEAVY', G.ROCKS[0][0], G.ROCKS[0][1]), null, '壞軌不能放配件');
const np = [1, 5]; assert(!G.isPad(1, 5) || true);
let free = null; for (let y = 1; y < G.H - 1 && !free; y++) for (let x = 1; x < G.W - 1; x++) if (!G.isPad(x, y) && !G.isRock(x, y)) { free = [x, y]; break; }
assert.strictEqual(G.place(b, 'support', 'HEAVY', free[0], free[1]), null, '不是襯墊不能放配件');
assert(G.connected(b, 0), '放下技能時自動接上最短的線');
assert(G.getWire(b, 0).cells.length >= 8, '第一個插槽的線至少 8 格');

// 插槽、電源顏色成對；線只能從自己的電源出發
for (let i = 0; i < 6; i++) { assert(G.SOCK_COL[i]); const c = G.SRCS[i]; assert.strictEqual(G.sockAt(G.SOCKS[i][0], G.SOCKS[i][1]), i); assert(!G.isPad(c[0], c[1]) || true); }
b = G.createBoard();
G.place(b, 'active', 'FIRE', sx, sy, 0, { noWire: true });
const st = G.startOf(0), en = G.endOf(0);
const other = G.startOf(1);
assert.strictEqual(G.extend(b, 0, other[0], other[1]).ok, false, '不能從別的電源開始');
assert(G.extend(b, 0, st[0], st[1]).ok, '從自己的電源旁邊開始');
assert.strictEqual(G.extend(b, 0, G.ROCKS[0][0], G.ROCKS[0][1]).ok, false, '壞軌不能走線');
assert.strictEqual(G.connected(b, 0), false, '還沒走到插槽旁');
// 自動補格：點遠處的格子，線自動沿路補上
const far = G.extendTo(b, 0, en[0], en[1], 30);
assert(far.ok && G.connected(b, 0), 'extendTo 補格到插槽旁就接通 ' + JSON.stringify(far));
assert.strictEqual(G.extend(b, 0, en[0], en[1] + 1).ok, false, '接通後不能再延伸');
const L = G.getWire(b, 0).cells.length;
G.shrink(b, 0);
assert.strictEqual(G.getWire(b, 0).cells.length, L - 1);
assert.strictEqual(G.connected(b, 0), false, '收回最後一格就斷線');
// 別條線佔用的格子不能再走
b = G.createBoard();
G.place(b, 'active', 'FIRE', sx, sy); G.place(b, 'active', 'FROST', G.SOCKS[1][0], G.SOCKS[1][1], 0, { noWire: true });
const cs = G.getWire(b, 0).cells[1];
assert.strictEqual(G.extendTo(b, 1, cs[0], cs[1], 30).ok, false, '兩條線不能共用格子');

// 沒有線長與配件數上限
assert.strictEqual(G.unlockedCount(G.createBoard(), 1), 1);
assert.strictEqual(G.unlockedCount(G.createBoard(), 9), 3);
assert.strictEqual(G.unlockedCount(G.createBoard(), 30), 6);
assert(G.wireMax(G.createBoard(), 1) >= 60 && G.gemCap(1) >= 20);

// 結算：線經過的襯墊才生效；同色襯墊 ×2，異色 ×1
b = G.createBoard();
G.place(b, 'active', 'FIRE', sx, sy);
const col = G.SOCK_COL[0];
const same = padOf(b, 0, col), diff = G.getWire(b, 0).cells.find(c => G.isPad(c[0], c[1]) && G.padColor(c[0], c[1]) !== col);
assert(same, '線上有同色襯墊');
G.place(b, 'support', 'HEAVY', same[0], same[1]);
let r = G.resolve(b, 1)[0];
assert.strictEqual(r.linked.length, 1);
assert.strictEqual(r.weights[0], G.PAD_MATCH, '同色襯墊 ×2');
assert(Math.abs(r.stat.dmg - .45 * G.PAD_MATCH) < 1e-9);
if (diff) { const pc = G.place(b, 'support', 'CRITS', diff[0], diff[1]); r = G.resolve(b, 1)[0]; assert.strictEqual(r.weights[r.linked.indexOf(pc.id)], 1, '異色襯墊 ×1'); }
// 不在線上的襯墊不生效
b = G.createBoard(); G.place(b, 'active', 'FIRE', sx, sy);
const onWire = new Set(G.getWire(b, 0).cells.map(c => c.join()));
const offPad = G.PADS.find(p => !onWire.has(p[0] + ',' + p[1]));
G.place(b, 'support', 'HEAVY', offPad[0], offPad[1]);
assert.strictEqual(G.resolve(b, 1)[0].linked.length, 0, '不在線上的配件不生效');
// 標籤不符：廣播只對投射物，冷氣爆發是範圍
b = G.createBoard(); G.place(b, 'active', 'FROST', sx, sy);
const pp = padOf(b, 0); G.place(b, 'support', 'AREA', pp[0], pp[1]);
r = G.resolve(b, 9)[0];
assert.strictEqual(r.linked.length, 0, '標籤不符不生效'); assert.strictEqual(r.missed.length, 1);
// 沒接通的線不生效
b = G.createBoard(); G.place(b, 'active', 'FIRE', sx, sy, 0, { noWire: true });
G.extend(b, 0, G.startOf(0)[0], G.startOf(0)[1]);
assert.strictEqual(G.resolve(b, 9)[0].linked.length, 0);

// 冷卻縮減上限 60%
b = G.createBoard(); G.place(b, 'active', 'FIRE', sx, sy);
for (const c of G.getWire(b, 0).cells.filter(c => G.isPad(c[0], c[1])).slice(0, 4)) G.place(b, 'support', 'HASTE', c[0], c[1]);
assert(G.resolve(b, 15)[0].stat.cd >= -0.6 - 1e-9, '冷卻縮減被上限卡在 -60%');

// DPS：無輔助 = 武器傷害 × 倍率 ÷ 冷卻；同色襯墊放大配件效果
b = G.createBoard(); G.place(b, 'active', 'FIRE', sx, sy);
const hero = { hit: 100, crit: 0, cm: 150 };
let d = G.dps(b, hero, 9)[0];
assert(Math.abs(d.dps - 100 * 2.6 / 2.6) < 1e-9, '基礎 DPS');
const sp = padOf(b, 0, G.SOCK_COL[0]); G.place(b, 'support', 'HEAVY', sp[0], sp[1]);
d = G.dps(b, hero, 9)[0];
assert(Math.abs(d.dps - 100 * (1 + .45 * G.PAD_MATCH)) < 1e-9, '同色襯墊上一個超頻 +90%');
const hc = G.dps(b, { hit: 100, crit: 50, cm: 200 }, 9)[0];
assert(Math.abs(hc.hit / d.hit - 1.5) < 1e-9, '50% 會心、暴傷 200% 的期望倍率 1.5');

// 自動接線：六個插槽可以同時接通，線互不重疊
b = G.createBoard();
Object.keys(G.ACTIVES).slice(0, 6).forEach((k, i) => G.place(b, 'active', k, G.SOCKS[i][0], G.SOCKS[i][1], 0, { noWire: true }));
const all = G.autoWireAll(b, 30);
assert(all.ok && all.count === 6, '六條線全部接通');
const seen = new Set();
for (const w of b.wires) for (const c of w.cells) { assert(!seen.has(c.join()), '線不重疊'); seen.add(c.join()); assert(!G.isRock(c[0], c[1])); }
// 每個插槽單獨接線都走得通
for (let i = 0; i < 6; i++) { const t = G.createBoard(); G.place(t, 'active', 'FIRE', G.SOCKS[i][0], G.SOCKS[i][1], 0, { noWire: true }); assert(G.autoWire(t, i).ok, '插槽 ' + i); }
// 推薦擺放：優先同色襯墊
b = G.createBoard(); G.place(b, 'active', 'FIRE', sx, sy);
const spot = G.findSpot(b, 'support', 'HEAVY', b.pieces[0].id);
assert(spot && G.padColor(spot.x, spot.y) === G.SOCK_COL[0], '推薦擺放先找同色襯墊');

// 讀檔整理：不合法的線與配件會被丟掉，合法的原樣保留
const messy = JSON.parse(JSON.stringify(b));
messy.wires.push({ sock: 0, cells: [[1, 0]] });
messy.wires.push({ sock: 9, cells: [[1, 0]] });
messy.pieces.push({ id: 99, kind: 'support', key: 'HEAVY', x: G.ROCKS[0][0], y: G.ROCKS[0][1] });
messy.pieces.push({ id: 98, kind: 'support', key: 'NOPE', x: 2, y: 2 });
const clean = G.normalize(messy);
assert.strictEqual(clean.wires.length, 1);
assert.strictEqual(clean.pieces.filter(p => p.kind === 'support').length, 0);
assert.deepStrictEqual(G.normalize(JSON.parse(JSON.stringify(b))), b, '合法的接線板整理後完全相同');

// v4（0.33–0.40 舊接線板）搬家：技能保留並自動接線，配件依線的順序重新放到襯墊上
const v4 = { w: 8, h: 8, v: 4, nextId: 9, pieces: [
  { id: 1, kind: 'active', key: 'FIRE', x: 7, y: 3 },
  { id: 2, kind: 'support', key: 'HEAVY', x: 1, y: 3 },
  { id: 3, kind: 'support', key: 'CRITS', x: 2, y: 3, t: 2 },
], wires: [{ sock: 0, cells: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3]] }] };
const m4 = G.adopt(v4, 12);
assert.strictEqual(m4.v, 5);
const r4 = G.resolve(m4, 12);
assert.deepStrictEqual(r4.map(x => x.key), ['FIRE']);
assert(r4[0].wired, '搬家後技能有接通的線');
assert(m4.pieces.filter(p => p.kind === 'support').length >= 1, '配件重新放到襯墊上');
assert(m4.pieces.some(p => p.t === 2), '配件階級保留');

// 很舊的存檔
const lg = G.fromLegacy(['FIRE'], { FIRE: ['HEAVY', 'CRITS'] }, 12);
assert(G.resolve(lg, 12)[0].linked.length >= 1);

// 配件階級：Ⅱ ×1.5、Ⅲ ×2（異色襯墊）
{
  const b = G.createBoard(); G.place(b, 'active', 'FIRE', sx, sy, 0, { lvl: 1 });
  const c = G.getWire(b, 0).cells.find(q => G.isPad(q[0], q[1]) && G.padColor(q[0], q[1]) !== G.SOCK_COL[0]);
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
