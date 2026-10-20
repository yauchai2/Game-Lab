// node tools/test_grid.js：配件拼圖邏輯測試
const G = require('../src/game/00-grid.js');
const assert = require('assert');

let b = G.createBoard(3, 3);
const fire = G.place(b, 'active', 'FIRE', 1, 1);
assert(fire, '放得下');
assert.strictEqual(G.place(b, 'active', 'FROST', 1, 1), null, '重疊不能放');
assert.strictEqual(G.place(b, 'active', 'FROST', 2, 0), null, '超出邊界不能放');

// 相鄰才有效，對角無效
G.place(b, 'support', 'HEAVY', 1, 0);   // 上方
G.place(b, 'support', 'HASTE', 0, 0);   // 對角
let r = G.resolve(b)[0];
assert.deepStrictEqual(r.linked.length, 1);
assert.strictEqual(r.stat.dmg, 0.45);
assert.strictEqual(r.stat.cd, 0);

// 標籤不符：廣播只對投射物，冷氣爆發是範圍
b = G.createBoard(3, 3);
G.place(b, 'active', 'FROST', 0, 1);
G.place(b, 'support', 'AREA', 0, 2);
assert.strictEqual(G.resolve(b)[0].linked.length, 0, '標籤不符不生效');

// 冷卻縮減上限 70%
b = G.createBoard(3, 3);
G.place(b, 'active', 'FIRE', 1, 1);
for (const [x, y] of [[1, 0], [0, 1], [2, 1], [1, 2]]) G.place(b, 'support', 'HASTE', x, y);
assert.strictEqual(G.resolve(b)[0].stat.cd, -0.7);

// 旋轉：L 形可原地旋轉，卡牆時失敗
b = G.createBoard(3, 3);
const m = G.place(b, 'active', 'METEOR', 0, 0);
assert(G.rotate(b, m.id));
assert.deepStrictEqual(G.shapeOf('active', 'METEOR', 4), G.shapeOf('active', 'METEOR', 0), '轉四次回原形');
const bar = G.place(b, 'active', 'CHAIN', 2, 0);
assert(bar, '直條放在右側');
assert.strictEqual(G.rotate(b, bar.id), false, '貼牆旋轉會超出，維持原樣');
assert(G.remove(b, bar.id));
// DPS：無輔助 = 武器傷害 × 倍率 ÷ 冷卻；暴擊用期望值
b = G.createBoard(3, 3);
G.place(b, 'active', 'FIRE', 1, 1);
const hero = { hit: 100, crit: 0, cm: 150 };
let d = G.dps(b, hero)[0];
assert(Math.abs(d.dps - 100 * 2.6 / 2.6) < 1e-9, '基礎 DPS');
G.place(b, 'support', 'HEAVY', 1, 0);   // +45% 傷害
G.place(b, 'support', 'HASTE', 0, 1);   // 冷卻 -30%
d = G.dps(b, hero)[0];
assert(Math.abs(d.dps - (100 * 2.6 * 1.45) / (2.6 * 0.7)) < 1e-9, '加成後 DPS');
assert(G.place(b, 'support', 'TWIN', 2, 1));    // 重複施放一次，60% 傷害
d = G.dps(b, hero)[0];
assert(Math.abs(d.dps - (100 * 2.6 * 1.45 * 1.6) / (2.6 * 0.7)) < 1e-9, '重複施放');
const hc = G.dps(b, { hit: 100, crit: 50, cm: 200 })[0];
assert(Math.abs(hc.hit / d.hit - 1.5) < 1e-9, '50% 暴擊、暴傷 200% 的期望倍率 1.5');
// findSpot：輔助會找到能連到指定主動機件的位置
b = G.createBoard(3, 1);
const f1 = G.place(b, 'active', 'FIRE', 0, 0);
const sp = G.findSpot(b, 'support', 'HEAVY', f1.id);
assert.deepStrictEqual([sp.x, sp.y], [1, 0]);
G.place(b, 'support', 'HEAVY', sp.x, sp.y, sp.rot);
const b2 = G.createBoard(3, 1);
G.place(b2, 'support', 'HASTE', 1, 0);
const f2 = G.place(b2, 'active', 'FIRE', 0, 0);
G.place(b2, 'support', 'HEAVY', 2, 0);
assert.strictEqual(G.findSpot(b2, 'support', 'CRITS', f2.id), null, '沒有相鄰空位');

// 與遊戲資料不漂移：技能倍率與冷卻要和 01-data.js 一致
const vm = require('vm'), fs = require('fs');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/game/01-data.js', 'utf8') + ';this.SKILLS=SKILLS;this.SUPPS=SUPPS;', ctx);
for (const k of Object.keys(G.ACTIVES)) { assert(ctx.SKILLS[k], k); assert.strictEqual(G.ACTIVES[k].mult, ctx.SKILLS[k].mult, k + ' mult'); assert.strictEqual(G.ACTIVES[k].cd, ctx.SKILLS[k].cd, k + ' cd'); }
assert.deepStrictEqual(Object.keys(G.SUPPORTS).sort(), Object.keys(ctx.SUPPS).sort(), '輔助清單一致');
console.log('grid tests ok');
