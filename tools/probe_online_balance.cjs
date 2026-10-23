/* 線上長時間掛機探針：用正式 update() 逐步推進，每 10 分鐘取樣成長與死亡；不替玩家操作。 */
const { createRuntime } = require('./lib/offline-runtime.cjs');
const hours = +process.argv[2] || 2, seeds = [11, 29, 83];
for (const seed of seeds) {
  const r = createRuntime(seed), rows = [];
  r.evaluate('G.autoCard=true; G.paused=false; G.offline=false; lootToast=()=>{}; bossLoot=()=>{}; showOverlay=()=>{}');
  let t = 0, lastD = 0;
  while (t < hours * 3600) {
    r.evaluate(`for(let i=0;i<3000;i++){ update(.2); for(const d of G.drops) if(!d.done){ d.done=true; pickup(d); } G.drops=[]; }`);
    t += 600;
    rows.push(r.evaluate(`({m:${t / 60},lvl:G.lvl,depth:G.maxDepth,dps:Math.round(G.st.dps),life:Math.round(G.st.life),deaths:G.deaths,dDelta:G.deaths-${lastD},gold:G.gold})`));
    lastD = rows[rows.length - 1].deaths;
  }
  console.log('seed', seed); for (const x of rows) console.log(JSON.stringify(x));
}
