/* QA 共用工具：啟動瀏覽器、載入遊戲、收集所有錯誤。只讀取遊戲，不修改 src/。 */
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');

function loadPlaywright() {
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', path.join(ROOT, 'node_modules/playwright')]) {
    try { return require(p); } catch (e) { /* 試下一個位置 */ }
  }
  throw new Error('找不到 playwright（npm i -D playwright 或使用雲端預裝版本）');
}
async function launch() {
  const { chromium } = loadPlaywright();
  const opts = { args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc', '--enable-precise-memory-info'] };
  for (const exe of [process.env.QA_CHROMIUM, '/usr/bin/chromium', '/opt/pw-browsers/chromium']) {
    if (exe && fs.existsSync(exe) && fs.statSync(exe).isFile()) { opts.executablePath = exe; break; }
  }
  return chromium.launch(opts);
}
/* 建置單檔版（與玩家的離線版相同）。ref 為 git 版本時，建置該版本的程式。 */
function buildSingle(ref, out) {
  out = out || path.join(os.tmpdir(), `qa-build-${(ref || 'work').replace(/\W/g, '_')}-${process.pid}.html`);
  if (!ref) { execFileSync('python3', [path.join(ROOT, 'tools/build.py'), out], { cwd: ROOT, stdio: 'ignore' }); return out; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-src-'));
  execFileSync('bash', ['-c', `git archive ${ref} | tar -x -C ${dir}`], { cwd: ROOT });
  execFileSync('python3', [path.join(dir, 'tools/build.py'), out], { cwd: dir, stdio: 'ignore' });
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}
/* 開新頁並累積錯誤。console 的 error 與 pageerror 都算；三方庫的棄用警告不算。 */
async function openGame(browser, file, { viewport = { width: 1280, height: 800 }, fresh = true, init, wait = 2500, touch = false } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('js: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + file + (fresh ? '?fresh' : ''));
  await page.waitForTimeout(wait);
  return { ctx, page, errors };
}
/* 遊戲自己的系統記錄（SYS）內的錯誤，也算測試失敗。 */
const sysErrors = page => page.evaluate(() => (window.SYS ? SYS.report(true).split('\n').filter(l => / E [a-z]+ /.test(l)) : []));

/* 簡單的結果收集：每項 {name, ok, detail, warn} */
class Results {
  constructor(suite) { this.suite = suite; this.items = []; }
  add(name, ok, detail = '', warn = false) { this.items.push({ name, ok: !!ok, warn: !!warn && !ok, detail: String(detail).slice(0, 1500) }); console.log(`${ok ? 'PASS' : warn ? 'WARN' : 'FAIL'} [${this.suite}] ${name}${detail && !ok ? ' — ' + String(detail).slice(0, 300) : ''}`); }
  get failed() { return this.items.filter(i => !i.ok && !i.warn); }
  get warned() { return this.items.filter(i => i.warn); }
  save(file) { fs.writeFileSync(file, JSON.stringify({ suite: this.suite, items: this.items }, null, 1)); }
}
module.exports = { ROOT, launch, buildSingle, openGame, sysErrors, Results, loadPlaywright };
