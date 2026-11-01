/* 舊版存檔相容：用舊版本實際玩一段並存檔，再放進目前的版本載入，進度不可遺失、不可出錯。
   node tools/qa/old_saves.cjs [--tags v0.67.0,v0.73.1,v0.78.0] [--out file.json] */
const fs = require('node:fs'), { execFileSync } = require('node:child_process');
const { ROOT, launch, buildSingle, openGame, sysErrors, Results } = require('./lib.cjs');
const P = require('./probes.cjs');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const R = new Results('old-saves');
function defaultTags() {
  const all = execFileSync('git', ['tag', '--list', 'v[0-9]*'], { cwd: ROOT }).toString().split('\n').filter(t => t && !/-/.test(t));
  const key = t => t.slice(1).split('.').map(Number); all.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  const pick = new Set(); for (const t of all.slice(-3)) pick.add(t);             // 最近三個正式版
  for (const minor of [30, 50, 60, 70]) { const t = all.filter(x => key(x)[1] === minor).pop(); if (t) pick.add(t); }   // 加上幾個較舊的世代
  return [...pick];
}
(async () => {
  const browser = await launch(), cur = buildSingle(null), tags = arg('tags', null) ? arg('tags').split(',') : defaultTags();
  try {
    for (const tag of tags) {
      let save = null, before = null;
      try {
        const old = buildSingle(tag), o = await openGame(browser, old, { wait: 3000 });
        before = await o.page.evaluate(() => {
          if (typeof stepSim !== 'function') return null;
          for (let i = 0; i < 30000; i++) stepSim(.05);
          try { saveGame(); } catch (e) {}
          const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^idle-hero/.test(k) && !/syslog/.test(k)) ls[k] = localStorage.getItem(k); }
          return { ls, lvl: G.lvl, depth: G.maxDepth, inv: G.inventory.length, kills: G.totalKills, gold: G.gold, ver: typeof VERSION === 'function' ? VERSION() : '?' };
        });
        await o.ctx.close();
      } catch (e) { R.add(`${tag} 無法產生測試存檔`, false, e.message, true); continue; }
      if (!before || !Object.keys(before.ls).length) { R.add(`${tag} 無法產生測試存檔（沒有存檔資料）`, false, '', true); continue; }
      const n = await openGame(browser, cur, { fresh: false, wait: 3500, init: { fn: ls => { if (!localStorage.getItem('qa-seeded')) { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); localStorage.setItem('qa-seeded', '1'); } }, arg: before.ls } });
      const after = await n.page.evaluate(`(() => { const o = { lvl: G.lvl, depth: G.maxDepth, inv: G.inventory.length, kills: G.totalKills, gold: G.gold }; try { for (let i = 0; i < 4000; i++) stepSim(.05); o.inv2 = ${P.invariants}; } catch (e) { o.err = e.message; } return o; })()`);
      const se = await sysErrors(n.page), bad = [];
      if (after.lvl < before.lvl) bad.push(`等級倒退 ${before.lvl} → ${after.lvl}`);
      if (after.depth < before.depth) bad.push(`最深深度倒退 ${before.depth} → ${after.depth}`);
      if (after.kills < before.kills) bad.push(`擊殺數倒退 ${before.kills} → ${after.kills}`);
      if (after.inv < before.inv - 2) bad.push(`背包裝備減少 ${before.inv} → ${after.inv}`);
      if (after.err) bad.push('載入後掛機丟錯：' + after.err);
      bad.push(...(after.inv2 || []), ...n.errors, ...se);
      R.add(`${tag}（Lv${before.lvl}、背包 ${before.inv}）的存檔可在目前版本載入並續玩`, !bad.length, bad.join('\n'));
      await n.ctx.close();
    }
  } finally { await browser.close(); }
  const o = arg('out', null); if (o) fs.writeFileSync(o, JSON.stringify({ suite: 'old-saves', items: R.items }, null, 1));
  console.log(`\n通過 ${R.items.filter(i => i.ok).length}／警告 ${R.warned.length}／失敗 ${R.failed.length}`);
  process.exit(R.failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
