const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BUILDCRAFT_URL || 'http://127.0.0.1:8784/docs/prototypes/buildcraft/';
const out = path.join(__dirname, 'evidence'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const results = [];
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width === 390 ? 3 : 1, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(() => window.BuildcraftLab && window.BuildcraftLab.run.t > .1);
    await page.locator('#pause').click();
    const before = await page.evaluate(() => BuildcraftLab.run.t);
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => BuildcraftLab.run.t), before);
    await page.locator('#pause').click();
    await page.waitForFunction(t => BuildcraftLab.run.t > t, before);
    for (const mode of ['circuit', 'tape', 'overclock', 'frequency', 'firmware', 'city']) {
      await page.locator('[data-action="demo"][data-value="' + mode + '"]').click();
      assert.equal(await page.locator('[data-action="demo"][data-value="' + mode + '"]').getAttribute('aria-pressed'), 'true');
      if (mode === 'circuit') {
        await page.locator('[data-action="preset"][data-value="empty"]').click();
        await page.locator('[data-action="node"][data-value="0"]').click();
        await page.locator('[data-action="node"][data-value="4"]').click();
        assert.deepEqual(await page.evaluate(() => BuildcraftLab.state.configs.circuit.edges), [[0, 4]]);
        await page.locator('[data-action="wire"]').click();
        assert.equal(await page.evaluate(() => BuildcraftLab.state.configs.circuit.edges.length), 0);
      }
      if (mode === 'tape') {
        await page.locator('[data-action="slot"][data-value="2"]').click();
        await page.locator('[data-action="step"][data-value="recharge"]').click();
        assert.equal(await page.evaluate(() => BuildcraftLab.state.configs.tape.steps[2]), 'recharge');
      }
      if (mode === 'overclock') {
        await page.locator('#rate').focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => BuildcraftLab.state.configs.overclock.rate), 1.3);
        await page.locator('[data-action="weapon"][data-value="0"]').click();
        assert.equal(await page.evaluate(() => BuildcraftLab.state.configs.overclock.weapons[0]), false);
      }
      if (mode === 'frequency') {
        await page.locator('[data-action="phase"][data-value="1-2"]').click();
        assert.equal(await page.evaluate(() => BuildcraftLab.state.configs.frequency.phases[1]), 2);
      }
      if (mode === 'firmware') {
        await page.locator('[data-action="chip"][data-value="echo"]').click();
        assert.match(await page.locator('#feedback').textContent(), /已滿/);
        await page.locator('[data-action="chip"][data-value="pierce"]').click();
        await page.locator('[data-action="chip"][data-value="echo"]').click();
        assert.deepEqual(await page.evaluate(() => BuildcraftLab.state.configs.firmware.chips), ['side', 'echo']);
      }
      if (mode === 'city') {
        await page.locator('[data-action="district"][data-value="8"]').click();
        await page.locator('[data-action="district"][data-value="3"]').click();
        assert.match(await page.locator('#feedback').textContent(), /不足/);
        await page.locator('[data-action="district"][data-value="1"]').click();
        assert.match(await page.locator('[data-action="district"][data-value="0"]').textContent(), /未接通/);
      }
      await page.locator('#reset').click();
      assert(await page.evaluate(mode => JSON.stringify(BuildcraftLab.state.configs[mode]) === JSON.stringify(Buildcraft.DEFAULTS[mode]), mode));
      await page.locator('#speed').click();
      await page.locator('#restart').click();
      const time = await page.evaluate(() => { const l = BuildcraftLab; l.state.paused = true; while (!l.run.done) l.run.tick(.05); l.update(); return l.run.t; });
      assert(time <= 30);
      assert.equal(await page.locator('#end-banner').isVisible(), true);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(out, mode + '-' + width + '.png'), fullPage: true });
      results.push({ width, mode, ...await page.evaluate(() => BuildcraftLab.run.result()) });
    }
    // Config retention on navigation, valid fallback hash, no production save access.
    await page.locator('[data-action="demo"][data-value="tape"]').click();
    await page.locator('[data-action="step"][data-value="burst"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-action="demo"][data-value="city"]').click();
    await page.locator('[data-action="demo"][data-value="tape"]').click();
    assert.equal(await page.evaluate(() => BuildcraftLab.state.configs.tape.steps[0]), 'burst');
    await page.evaluate(() => { location.hash = 'unknown'; });
    await page.waitForFunction(() => BuildcraftLab.state.mode === 'circuit');
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    assert.deepEqual(errors, []);
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log('PASS: six playable editors, 3 widths, pause/resume, keyboard, reset, budget, config retention, finish, no overflow or page errors.');
})().catch(e => { console.error(e); process.exit(1); });
