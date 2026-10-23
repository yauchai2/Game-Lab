/* Real catchUp, update, pickup and save/load; isolated browser IO and seeded randomness. */
const assert = require('node:assert/strict');
const { createRuntime } = require('./lib/offline-runtime.cjs');
let passed = 0;
function check(name, test) { test(); passed++; console.log('PASS', name); }
function progress(saved) {
  // applySave may register an untracked starting item and initialize empty city data.
  // Assert the player's earned state, rather than internal normalization bookkeeping.
  const keys = ['lvl','xp','gold','depth','maxDepth','kills','deaths','totalKills',
    'coreDust','chips','parts','picks','relicPicks','deferChoices','cards','relics',
    'gems','carts','maps','run','groundDrops','armory','board','pass','ach'];
  return Object.fromEntries(keys.map(key => [key, saved[key]]));
}

check('suspended manual return preserves old choices without creating more after combat and reload', () => {
  const r = createRuntime();
  r.evaluate('G.autoCard=false;G.picks=2;G.relicPicks=1');
  r.settle(120);
  const saved = r.snapshot();
  assert(saved.totalKills > 0);
  assert.equal(saved.picks, 2); assert.equal(saved.relicPicks, 1);
  assert.equal(saved.deferChoices, false); assert.deepEqual(saved.cards, {});
  assert.deepEqual(saved.relics, {}); assert.equal(r.saves, 1);
  assert(r.reload());
  assert.deepEqual(progress(r.snapshot()), progress(saved));
});
check('suspended automatic return preserves queued decisions and previous acquisitions', () => {
  const r = createRuntime();
  r.evaluate('G.autoCard=true;G.picks=2;G.relicPicks=1;G.cards[Object.keys(CARDS)[0]]=2;G.relics.FOOD=1');
  const before=r.snapshot();r.settle(120);
  const saved = r.snapshot(), summary = r.reports[0].summary;
  assert.equal(saved.picks, 2); assert.equal(saved.relicPicks, 1);
  assert.deepEqual(saved.cards,before.cards);assert.deepEqual(saved.relics,before.relics);
  assert.equal(summary.cards.length,0);
  assert(r.reload()); assert.deepEqual(progress(r.snapshot()), progress(saved));
});
check('settlement flushes saved ground currency once, then reload cannot grant it again', () => {
  const r = createRuntime();
  r.evaluate(`G.spawnCd=1e9;G.drops=[
    {kind:'gold',amount:123,x:HX+30,y:HY+30,t:0},
    {kind:'chip',amount:7,x:HX+30,y:HY+30,t:0}];`);
  r.settle(0);
  const saved = r.snapshot();
  assert.equal(saved.gold, 123); assert.equal(saved.chips, 7);
  assert.equal(saved.groundDrops.length, 0);
  assert(r.reload()); r.settle(0);
  assert.equal(r.snapshot().gold, 123); assert.equal(r.snapshot().chips, 7);
});
check('60-second threshold changes the penalty only beyond the existing boundary', () => {
  for (const [seconds, expected] of [[3.1, false], [60, false], [60.1, true]]) {
    const r = createRuntime(); r.settle(seconds);
    assert.equal(r.evaluate('G.offPen'), expected);
    assert.equal(r.reports[0].seconds, seconds);
    assert.equal(r.reports[0].away, seconds);
  }
});
check('an overlapping catch-up request cannot simulate, report or save twice', () => {
  const r = createRuntime();
  r.evaluate('catchUp(1800,true);catchUp(1800,true)');
  r.drain();
  assert.equal(r.reports.length, 1); assert.equal(r.saves, 1);
  assert(Math.abs(r.evaluate('G.time') - 1800) < .201);
});
check('no-report return still saves once and leaves no settlement lock', () => {
  const r = createRuntime(); r.settle(120, false);
  assert.equal(r.reports.length, 0); assert.equal(r.saves, 1);
  assert(r.snapshot().totalKills > 0);
});
check('unavailable storage is reported without losing earned choices or locking the game', () => {
  const r = createRuntime();
  r.evaluate(`G.autoCard=false;G.picks=2;
    localStorage.setItem=()=>{throw Error('Test storage is full');};`);
  r.settle(120);
  assert.equal(r.reports[0].saved, false);
  assert(r.snapshot().picks >= 2);
  assert.equal(r.snapshot().deferChoices, false);
  assert.equal(r.evaluate('G.paused || G.offline || G.off !== null'), false);
});
console.log(passed + ' source-backed offline return checks passed');
