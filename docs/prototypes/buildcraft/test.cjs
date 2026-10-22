const assert = require('node:assert/strict');
const B = require('./engine.js');
const results = {};
function simulate(mode, config, scenario = 'swarm') {
  const r = new B.Run(mode, config, scenario);
  for (let i = 0; i < 601 && !r.done; i++) r.tick(.05);
  assert(r.done); assert(r.hp >= 0 && r.hp <= 120); assert(r.enemies.length <= 18);
  return r;
}
for (const mode of Object.keys(B.DEFAULTS)) {
  results[mode] = {};
  for (const scene of ['swarm', 'boss']) {
    const a = simulate(mode, B.DEFAULTS[mode], scene).result();
    assert.deepEqual(a, simulate(mode, B.DEFAULTS[mode], scene).result());
    assert(a.damage > 0);
    results[mode][scene] = a;
  }
}
const disconnected = simulate('circuit', { edges: [] });
assert(disconnected.wasted > 0);
assert(disconnected.damage < results.circuit.swarm.damage);
let c = { edges: [[0, 1], [1, 2], [2, 3]] };
assert.equal(B.circuitConnect(c, 2, 1).ok, false);
assert.equal(B.circuitConnect(c, 3, 4).ok, false);
assert.equal(B.circuitConnect(c, 0, 4).ok, true);
assert.deepEqual(c.edges.filter(e => e[0] === 0), [[0, 4]]);
const raw = simulate('tape', { steps: ['burst', 'burst', 'burst', 'burst'] }, 'boss');
assert.equal(raw.combos, 0); assert(results.tape.boss.combos > 0);
const hot = simulate('overclock', { rate: 1.8, weapons: [true, true], cooling: 'fins' });
const steady = simulate('overclock', { rate: .7, weapons: [false, true], cooling: 'fins' });
assert(hot.downtime > 0); assert.equal(steady.downtime, 0);
const sync = simulate('frequency', { phases: [0, 0, 0] }, 'boss');
const staggered = simulate('frequency', { phases: [0, 1, 2] }, 'boss');
assert(sync.damage > staggered.damage); assert.equal(staggered.combos, 0);
const side = simulate('firmware', { chips: ['side'] }, 'boss');
const orbit = simulate('firmware', { chips: ['side', 'orbit'] }, 'boss');
assert(orbit.damage > side.damage);
const echo = simulate('firmware', { chips: ['echo', 'leech'] }, 'boss');
assert(echo.combos > 0);
assert.equal(B.cityNetwork({ selected: [0, 4] }).counts.power, 0);
assert.equal(B.cityNetwork({ selected: [0, 1, 4] }).counts.power, 1);
assert(simulate('city', { selected: [0, 1, 4] }).damage > simulate('city', { selected: [0, 4] }).damage);
const independent = new B.Run('tape', B.DEFAULTS.tape); independent.config.steps[0] = 'burst';
assert.equal(B.DEFAULTS.tape.steps[0], 'cold');
console.log(JSON.stringify({ passed: true, checks: '12 deterministic scene pairs, six behavior changes, cycles, disconnection, overheat, chip synergy, connectivity, config isolation', results }, null, 2));
