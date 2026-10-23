/* 進度曲線回歸：不操作、不花金幣的線上掛機，檢查等級、深度與死亡次數落在 docs/progression-curve-2026-10-23.md 的區間內。預設跑 1 小時、2 個種子；FULL=1 跑 6 小時（離線上限）、3 個種子，約 4 分鐘。
   區間是以 2026-10-23 實測基線為中心，上下留餘裕；調整經驗或難度後若出界，要先更新文件再改區間。 */
const assert = require('node:assert/strict');
const { createRuntime } = require('./lib/offline-runtime.cjs');
const FULL = process.env.FULL === '1', HOURS = FULL ? 6 : 1, SEEDS = FULL ? [11, 29, 83] : [11, 29], BANDS = {   // 分鐘 → [等級下限, 等級上限, 深度下限, 深度上限]
  10:[12, 19, 7, 11], 30:[18, 26, 9, 14], 60:[20, 30, 9, 15], 120:[23, 31, 10, 14], 240:[26, 34, 10, 14], 360:[28, 36, 10, 15],
};
const MAX_DEATHS_PER_HOUR = 20;
for (const seed of SEEDS){
  const r = createRuntime(seed);
  r.evaluate('G.autoCard=true; G.paused=false; G.offline=false; lootToast=()=>{}; bossLoot=()=>{}; showOverlay=()=>{}');
  let t = 0;
  while (t < HOURS * 3600){
    r.evaluate(`for(let i=0;i<3000;i++){ update(.2); for(const d of G.drops) if(!d.done){ d.done=true; pickup(d); } G.drops=[]; }`);
    t += 600;
    const m = t / 60, s = r.evaluate('({lvl:G.lvl,depth:G.maxDepth,deaths:G.deaths})');
    if (BANDS[m]){
      const [l0, l1, d0, d1] = BANDS[m];
      assert(s.lvl >= l0 && s.lvl <= l1, `seed ${seed} ${m} 分鐘等級 ${s.lvl} 不在 ${l0}–${l1}`);
      assert(s.depth >= d0 && s.depth <= d1, `seed ${seed} ${m} 分鐘深度 ${s.depth} 不在 ${d0}–${d1}`);
    }
    if (m === 60) assert(s.deaths <= MAX_DEATHS_PER_HOUR, `seed ${seed} 第一小時死亡 ${s.deaths} 次，超過 ${MAX_DEATHS_PER_HOUR}`);
    console.log(`PASS seed ${seed} ${m} 分鐘：Lv.${s.lvl} 深度 ${s.depth} 死亡 ${s.deaths}`);
  }
}
console.log('progress curve checks passed');
