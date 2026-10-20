// node tools/test_grid.js：配件拼圖邏輯測試
const G = require('../src/lab/grid.js');
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

// 標籤不符：雙卡雙待只對投射物，冷氣爆發是範圍
b = G.createBoard(3, 3);
G.place(b, 'active', 'FROST', 0, 1);
G.place(b, 'support', 'TWIN', 0, 2);
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
console.log('grid tests ok');
