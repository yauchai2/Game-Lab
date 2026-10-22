/* Reproducible long-return scenarios using production catchUp; no renderer or player saves. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { createRuntime } = require('./lib/offline-runtime.cjs');
const output = process.argv[2];
const seeds = [11, 29, 83, 127, 251];
const rows = [], capChecks = [], cityChecks = [];
const root = path.resolve(__dirname, '..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const fingerprints = Object.fromEntries(['src/game/00-grid.js','src/game/01-data.js',
  'src/game/02-state.js','src/game/03-combat.js','src/game/05-ui.js'].map(f => [f, hash(f)]));
function run(seed, autoCard, seconds) {
  const r = createRuntime(seed);
  r.evaluate(`G.autoCard=${autoCard}`);
  const started = performance.now(); r.settle(seconds);
  const saved = r.snapshot();
  assert.equal(r.saves, 1);
  assert(saved.inventory.length <= 200); assert(saved.maps.length <= 15);
  assert.equal(saved.groundDrops.length, 0);
  for (const key of ['gold','xp','parts','chips','coreDust','lvl','deaths']) assert(Number.isFinite(saved[key]) && saved[key] >= 0, key);
  if (autoCard) { assert.equal(saved.picks, 0); assert.equal(saved.relicPicks, 0); }
  else { assert.deepEqual(saved.cards, {}); assert.deepEqual(saved.relics, {}); }
  const earned = s => JSON.stringify(['gold','xp','parts','chips','coreDust','lvl','deaths',
    'totalKills','picks','relicPicks','cards','relics','maps','armory'].map(k => s[k]));
  assert(r.reload()); assert.equal(earned(r.snapshot()), earned(saved));
  return { r, saved, row: { seed, autoCard, awaySeconds: seconds,
    simulatedSeconds: +r.evaluate('G.time').toFixed(6), lvl: saved.lvl, depth: saved.maxDepth,
    kills: saved.totalKills, deaths: saved.deaths, gold: saved.gold, parts: saved.parts,
    chips: saved.chips, coreDust: saved.coreDust, cores: Object.keys(saved.armory).length,
    inventory: saved.inventory.length, overflowRecycled: saved.storageRecycled,
    picks: saved.picks, relicPicks: saved.relicPicks,
    cards: Object.values(saved.cards).reduce((a,b) => a+b,0), relics: Object.keys(saved.relics).length,
    localComputeMs: Math.round(performance.now()-started), reloadPreservesEarnedState: true } };
}
function returnJob({ autoCard, seed }) {
  const jobRows = [], jobCaps = [];
  for (const seconds of [120, 21600]) {
    const result = run(seed, autoCard, seconds); jobRows.push(result.row);
    if (seed === seeds[0] && seconds === 21600) {
      const overnight = run(seed, autoCard, 43200);
      assert.deepEqual(overnight.saved, result.saved);
      assert.equal(overnight.r.rngState, result.r.rngState);
      jobCaps.push({ seed, autoCard, sixHoursEqualsTwelveHours: true });
    }
  }
  return { rows: jobRows, capChecks: jobCaps, cityChecks: [] };
}
// A formed build enters once; a long absence must not buy or start another expedition.
function cityJob({ route }) {
  const r = createRuntime(11);
  r.evaluate(`
    G.lvl=50;G.maxDepth=12;G.city=newCity();G.city.policy='safe';G.autoCard=false;G.autoEquip=false;
    G.equip.weapon=makeItem('weapon',2,30);G.equip.armor=makeItem('armor',2,30);
    G.equip.ring=makeItem('ring',2,30);G.pass=talentPlan(Object.keys(TREE));
    G.board=GridLab.createBoard(6,6);
    for(const id of ['FROST','METEOR','MAGNET']){const spot=GridLab.findSpot(G.board,'active',id);const p=GridLab.place(G.board,'active',id,spot.x,spot.y,spot.rot);if(id==='METEOR')p.mode='METEOR_COLDSTART';}
    recalc();G.h.hp=G.st.life;
    G.city.fragments={signal:100,memory:100,power:100};G.coreDust=10;
    G.city.seals[1]={signal:1,memory:1,power:1};
    if(!cityStart('${route}',1))throw Error('City fixture could not enter');
  `);
  r.settle(21600);
  const saved = r.snapshot(), city = saved.city;
  assert.equal(saved.run, null);
  assert(Object.values(city.clears).reduce((a,b)=>a+b,0) <= 1);
  // Seals are 0/1 availability flags, not a stackable currency.
  assert.deepEqual(city.seals[1], { signal: 1, memory: 1, power: 1 });
  assert.equal(city.maxTier,1); assert.equal(city.nexusWins,0);
  for(const key of ['signal','memory','power'])assert(city.fragments[key]>=100);
  assert(saved.coreDust>=10);
  return { rows: [], capChecks: [], cityChecks: [{ route, singleDeparture: true, clears: city.clears,
    fragments: city.fragments, seals: city.seals[1], noAutomaticCraftingOrNexus: true }] };
}
const quantile = (values, p) => {
  const sorted = [...values].sort((a,b)=>a-b), i=(sorted.length-1)*p, low=Math.floor(i);
  return +(sorted[low]+(sorted[Math.ceil(i)]-sorted[low])*(i-low)).toFixed(2);
};
async function main() {
if (!output) throw Error('Usage: node tools/probe_offline_returns.cjs OUTPUT.json');
const jobs = [false,true].flatMap(autoCard => seeds.map(seed => ({type:'return',autoCard,seed})));
jobs.push(...['signal','memory','power'].map(route => ({type:'city',route})));
const results = new Array(jobs.length);
const checkpointPath = output+'.checkpoint.json';
const scenarioVersion = 1;
if(fs.existsSync(checkpointPath)) {
  const previous = JSON.parse(fs.readFileSync(checkpointPath,'utf8'));
  if(previous.scenarioVersion===scenarioVersion && JSON.stringify(previous.fingerprints)===JSON.stringify(fingerprints) &&
    JSON.stringify(previous.jobs)===JSON.stringify(jobs))
    previous.results.forEach((result,index)=>{if(result)results[index]=result;});
}
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
function checkpoint() {
  const temporary = checkpointPath+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify({scenarioVersion,fingerprints,jobs,results},null,2)+'\n');
  fs.renameSync(temporary,checkpointPath);
}
let next = 0;
async function runner() {
  while (next < jobs.length) {
    const index = next++, job = jobs[index];
    if(results[index]) { console.log('REUSE scenario',JSON.stringify(job)); continue; }
    results[index] = await new Promise((resolve,reject) => {
      const worker = new Worker(__filename,{workerData:job});
      let received = false;
      worker.once('message',value => { received = true; resolve(value); });
      worker.once('error',reject);
      worker.once('exit',code => { if(code || !received)reject(Error('Scenario worker exited '+code)); });
    });
    checkpoint();
    console.log('PASS scenario',JSON.stringify(job));
  }
}
await Promise.all(Array.from({length:4},runner));
for(const result of results){rows.push(...result.rows);capChecks.push(...result.capChecks);cityChecks.push(...result.cityChecks);}
const groups = [];
for(const autoCard of [false,true])for(const seconds of [120,21600]) {
  const selected = rows.filter(r=>r.autoCard===autoCard&&r.awaySeconds===seconds), metrics={};
  for(const key of ['lvl','depth','kills','deaths','gold','parts','chips','cores','picks','overflowRecycled'])
    metrics[key]=Object.fromEntries([['min',0],['p10',.1],['p50',.5],['p90',.9],['max',1]].map(([n,p])=>[n,quantile(selected.map(r=>r[key]),p)]));
  groups.push({autoCard,awaySeconds:seconds,sampleSize:selected.length,metrics});
}
const report={version:createRuntime().evaluate('VERSION()'),seeds,fingerprints,
  method:'Production catchUp/update/pickup/save/load. Browser IO only is mocked. Fixed wall clock, seeded gameplay RNG, default new-player gear/board, no renderer/audio RNG calls. Automatic choices resolve at the end, following existing source. Five seeds per group; interpolated quantiles are exploratory, not population estimates.',
  limitations:['No Safari/FPS/memory/real user retention evidence','Not online/offline distribution equivalence: step size, penalties and visual RNG differ','City assertions test single departure and resource safety, not route success balance'],
  rows,groups,capChecks,cityChecks};
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
fs.unlinkSync(checkpointPath);
console.log('PASS',rows.length,'returns,',capChecks.length,'six/twelve-hour cap comparisons,',cityChecks.length,'city returns');
}
if(isMainThread)main().catch(error=>{console.error(error);process.exit(1);});
else parentPort.postMessage(workerData.type==='city'?cityJob(workerData):returnJob(workerData));
