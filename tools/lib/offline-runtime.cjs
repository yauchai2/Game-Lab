/* Source-backed offline harness. Only browser IO is replaced; simulation is original. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

function createRuntime(seed = 11) {
  const root = path.resolve(__dirname, '../..');
  let rng = seed >>> 0;
  const math = Object.create(Math);
  math.random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const tasks = [], storage = new Map(), reports = [];
  let saves = 0;
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-22T04:00:00Z'])); }
    static now() { return 1792641600000; }
  }
  const context = {
    console, Math: math, Date: Clock, performance,
    GridLab: require('../../src/game/00-grid.js'),
    ART_SHEETS: { icons: { ids: [] }, skills: { ids: [] }, gems: { ids: [] } },
    document: { getElementById: () => null },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); saves++; },
    },
    setTimeout: callback => { tasks.push(callback); return tasks.length; },
    SFX: () => {},
    uxEsc: value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    tPick: values => values[Math.floor(math.random() * values.length)],
    tRand: (min, max) => min + math.random() * (max - min),
    tClamp: (value, min = 0, max = 1) => Math.max(min, Math.min(max, value)),
    tFmt: String,
    recordReport: (summary, before, away, seconds, saved) => {
      reports.push(JSON.parse(JSON.stringify({ summary, before, away, seconds, saved })));
      return 'offline-report';
    },
  };
  vm.createContext(context);
  for (const file of ['01-data.js', '02-state.js', '02b-careers.js','02c-ascension-talents.js', '03-combat.js', 'characters-data.js', '05-ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/game', file), 'utf8'), context, { filename: file });
  }
  const evaluate = code => vm.runInContext(code, context, { timeout: 120000 });
  evaluate(`
    showOverlay = () => {};
    closeModal = () => {};
    uxOfflineReport = recordReport;
    G.equip.weapon = makeItem('weapon', 0, 1);
    G.equip.armor = makeItem('armor', 0, 1);
    recalc(); G.h.hp = G.st.life;
  `);
  function drain() {
    let chunks = 0;
    while (tasks.length) {
      if (++chunks > 100000) throw Error('Offline scheduler did not finish');
      tasks.shift()();
    }
    if (evaluate('G.offline || G.paused')) throw Error('Offline settlement stayed locked');
    return chunks;
  }
  return {
    evaluate, drain, reports, storage,
    get saves() { return saves; },
    settle(seconds, report = true) {
      context.seconds = seconds; context.report = report;
      evaluate('catchUp(seconds, report)');
      return drain();
    },
    snapshot() { return JSON.parse(evaluate('JSON.stringify(serialize())')); },
    reload() {
      const raw=JSON.parse(storage.get('idle-hero-save-v2'));context.savedState=raw?.v===3?raw.profiles.find(p=>p.id===raw.active)?.save:raw;
      return evaluate('applySave(savedState)');
    },
    get rngState() { return rng; },
  };
}
module.exports = { createRuntime };
