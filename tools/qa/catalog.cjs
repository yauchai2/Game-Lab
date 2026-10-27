/* 內容清單比對：把「上一個正式版」與目前程式的資料表逐項對照。
   被刪掉的項目（技能、詞綴、傳奇、角色、成就、更新日誌……）= 失敗；數值被改 = 警告並列出差異，供作者確認是否有意。
   用法：node tools/qa/catalog.cjs [--base v0.78.0] [--out result.json] */
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), { execFileSync } = require('node:child_process');
const { ROOT, Results } = require('./lib.cjs');
const FILES = ['00-grid.js', '01-data.js', '02-state.js', '02b-careers.js', '02c-ascension-talents.js', '02d-season.js', '02e-player-status.js', '02f-tower-systems.js', '02g-rift.js', 'street-creatures.js', 'equipment-catalog.js'];

function readAt(ref, file) {
  try {
    const rel = 'src/game/' + file;
    return ref ? execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString() : fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (e) { return null; }
}
function extract(ref) {
  const math = Object.create(Math); math.random = () => .4;
  const c = { console: { log() {}, warn() {}, error() {} }, Math: math, Date, tPick: a => a[0], tRand: (a, b) => (a + b) / 2, tClamp: (v, a, b) => Math.max(a, Math.min(b, v)), tFmt: String, SFX: () => {}, localStorage: { getItem: () => null, setItem() {} }, document: undefined };
  c.GridLab = (() => { const code = readAt(ref, '00-grid.js'); if (!code) return {}; const m = { exports: {} }; try { new Function('module', 'exports', code)(m, m.exports); } catch (e) { return {}; } return m.exports; })();
  vm.createContext(c);
  const tables = {};
  for (const f of FILES.slice(1)) {
    const code = readAt(ref, f); if (!code) continue;
    try { vm.runInContext(code, c, { timeout: 5000 }); } catch (e) { /* 部分檔案需要 DOM；已定義的常數仍可讀 */ }
    const names = [...code.matchAll(/^(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*=/gm)].map(m => m[1]);
    for (const n of names) {
      let v; try { v = vm.runInContext(`typeof ${n}==='undefined'?undefined:${n}`, c); } catch (e) { continue; }
      if (v && typeof v === 'object' && !(v instanceof Set) && !(v instanceof Map)) tables[`${f}:${n}`] = v;
    }
  }
  return tables;
}
const norm = v => JSON.stringify(v, (k, x) => typeof x === 'function' ? 'fn:' + x.toString().replace(/\s+/g, '') : x instanceof Set ? [...x] : x);
function entries(v) {
  if (Array.isArray(v)) return Object.fromEntries(v.map((e, i) => [e && typeof e === 'object' && (e.id || e.k || e.v || e.n) ? String(e.id || e.k || e.v || e.n) : '#' + i, e]));
  return v;
}
function shallowDiff(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [`${norm(a)} → ${norm(b)}`.slice(0, 120)];
  const out = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (norm(a[k]) !== norm(b[k])) out.push(`${k}: ${norm(a[k])} → ${norm(b[k])}`.slice(0, 140));
  return out.slice(0, 6);
}
function compare(oldT, newT) {
  const removed = [], changed = [], added = [], missingTables = [];
  for (const t of Object.keys(oldT)) {
    if (!newT[t]) { missingTables.push(t); continue; }
    const a = entries(oldT[t]), b = entries(newT[t]);
    for (const k of Object.keys(a)) {
      if (!(k in b)) removed.push(`${t}.${k}`);
      else if (norm(a[k]) !== norm(b[k])) changed.push({ id: `${t}.${k}`, diff: shallowDiff(a[k], b[k]) });
    }
    for (const k of Object.keys(b)) if (!(k in a)) added.push(`${t}.${k}`);
  }
  return { removed, changed, added, missingTables };
}
function latestTag() {
  const tags = execFileSync('git', ['tag', '--list', 'v[0-9]*'], { cwd: ROOT }).toString().split('\n').filter(Boolean).filter(t => !/-/.test(t));
  tags.sort((x, y) => { const p = s => s.slice(1).split('.').map(Number); const [a, b] = [p(x), p(y)]; for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
  return tags.pop();
}
function run(base) {
  base = base || latestTag();
  const R = new Results('catalog');
  const oldT = extract(base), newT = extract(null);
  const d = compare(oldT, newT);
  R.add(`比對基準 ${base}：共 ${Object.keys(oldT).length} 張資料表、${Object.values(oldT).reduce((n, v) => n + Object.keys(entries(v)).length, 0)} 項`, Object.keys(oldT).length > 10, '基準資料表過少，可能是載入失敗');
  R.add(`資料表沒有消失（${d.missingTables.length}）`, !d.missingTables.length, d.missingTables.join('、'));
  R.add(`沒有項目被刪除（${d.removed.length}）`, !d.removed.length, d.removed.slice(0, 40).join('、'));
  R.add(`既有項目數值／文字未改（${d.changed.length}，改動需作者確認是否有意）`, !d.changed.length, d.changed.slice(0, 25).map(c => c.id + ' ← ' + c.diff.join('；')).join('\n'), true);
  console.log(`新增 ${d.added.length} 項`);
  R.extra = { base, ...d, added: d.added.length };
  return R;
}
module.exports = { run, extract, compare, latestTag };
if (require.main === module) {
  const a = process.argv, base = a.includes('--base') ? a[a.indexOf('--base') + 1] : null, R = run(base);
  if (a.includes('--out')) fs.writeFileSync(a[a.indexOf('--out') + 1], JSON.stringify({ suite: 'catalog', items: R.items, extra: R.extra }, null, 1));
  process.exit(R.failed.length ? 1 : 0);
}
