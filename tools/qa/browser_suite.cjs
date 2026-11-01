/* 瀏覽器端 QA：冒煙、介面清單、多種畫面大小、隨機壓力、掛機、離線與存檔往返。
   node tools/qa/browser_suite.cjs [--base v0.78.0] [--only boot,ui,fuzz,...] [--soak-hours 3] [--seed N] [--out file.json] */
const fs = require('node:fs'), assert = require('node:assert/strict');
const { launch, buildSingle, openGame, sysErrors, Results } = require('./lib.cjs');
const P = require('./probes.cjs');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const SEED = +arg('seed', Date.now() % 1e9), SOAK_H = +arg('soak-hours', 2), only = arg('only', '').split(',').filter(Boolean);
const want = n => !only.length || only.includes(n);
const R = new Results('browser');
const guard = async (name, fn, ctx) => { try { await fn(); } catch (e) { R.add(name, false, (e && e.message || e) + (ctx ? '\n' + ctx() : '')); } };

async function suite(browser, cur, base) {
  /* 1. 冒煙：全新玩家開局無任何錯誤 */
  if (want('boot')) await guard('全新開局無錯誤', async () => {
    const { ctx, page, errors } = await openGame(browser, cur, { wait: 4000 });
    const ok = await page.evaluate(() => typeof G === 'object' && !!document.querySelector('#btns') && G.lvl >= 1);
    const se = await sysErrors(page);
    R.add('全新開局無錯誤', ok && !errors.length && !se.length, [...errors, ...se].join('\n') || '遊戲物件或主選單缺失');
    await ctx.close();
  });

  /* 2. 介面清單：上一版有的分頁／按鈕／設定，不可消失 */
  if (want('ui') && base) await guard('介面清單', async () => {
    const probe = async file => {
      const { ctx, page, errors } = await openGame(browser, file, { wait: 3000 });
      const dom = await page.evaluate(P.domManifest), tabs = {};
      for (const t of P.TABS) tabs[t] = await page.evaluate(`(${P.tabProbe})(${JSON.stringify(t)})`);
      await ctx.close(); return { dom, tabs, errors };
    };
    const [a, b] = [await probe(base), await probe(cur)];
    R.add('各分頁可開啟且沒有錯誤', Object.values(b.tabs).every(t => t.ok) && !b.errors.length, Object.values(b.tabs).filter(t => !t.ok).map(t => t.tab + '：' + t.err).concat(b.errors).join('\n'));
    const dead = P.TABS.filter(t => a.tabs[t].ok && a.tabs[t].len > 20 && b.tabs[t].len <= 20);
    R.add('上一版有內容的分頁沒有變空白', !dead.length, dead.join('、'));
    const lost = (x, y) => x.filter(v => !y.includes(v));
    R.add('主選單按鈕沒有消失', !lost(a.dom.menu.map(s => s.replace(/[^一-龥A-Za-z]/g, '').slice(0, 4)), b.dom.menu.map(s => s.replace(/[^一-龥A-Za-z]/g, '').slice(0, 4))).length, lost(a.dom.menu, b.dom.menu).join('、'), true);
    R.add('設定項目沒有消失', !lost(a.dom.settings, b.dom.settings).length, lost(a.dom.settings, b.dom.settings).join('、'));
    R.add('頁面元素 id 沒有消失', !lost(a.dom.ids, b.dom.ids).length, lost(a.dom.ids, b.dom.ids).join('、'), true);
    const miss = [];
    for (const t of P.TABS) for (const l of lost(a.tabs[t].labels, b.tabs[t].labels)) miss.push(`${t}:「${l}」`);
    R.add(`分頁內按鈕／標題沒有消失（${miss.length}，改名或移動需確認）`, !miss.length, miss.slice(0, 40).join('、'), true);
  });

  /* 3. 多種畫面大小 */
  if (want('viewports')) for (const [n, vp, touch] of [['手機直向 390x844', { width: 390, height: 844 }, true], ['手機橫向 844x390', { width: 844, height: 390 }, true], ['平板 820x1180', { width: 820, height: 1180 }, true], ['電腦 1440x900', { width: 1440, height: 900 }, false]])
    await guard('畫面 ' + n, async () => {
      const { ctx, page, errors } = await openGame(browser, cur, { viewport: vp, touch, wait: 3000 });
      const over = [];
      for (const t of P.TABS) {
        const r = await page.evaluate(`(${P.tabProbe})(${JSON.stringify(t)})`); if (!r.ok) errors.push(t + ' 開啟失敗：' + r.err);
        await page.evaluate(`openModal(${JSON.stringify(t)})`); await page.waitForTimeout(80);
        const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
        if (w.s > w.c + 2) over.push(`${t}(${w.s}>${w.c})`);
        await page.evaluate(() => { document.getElementById('modal').hidden = true; });
      }
      R.add(`畫面 ${n}：分頁無錯誤`, !errors.length, errors.join('\n'));
      R.add(`畫面 ${n}：沒有橫向溢出`, !over.length, over.join('、'), true);
      await ctx.close();
    });

  /* 4. 隨機裝備壓力：產生大量裝備，驗證詞綴與數值、再逐一穿戴重算與渲染 */
  if (want('fuzz')) await guard('隨機裝備壓力', async () => {
    const { ctx, page, errors } = await openGame(browser, cur, { wait: 2500 });
    await page.evaluate(P.seedRng(SEED));
    const res = await page.evaluate(`(() => {
      const bad = [], slots = Object.keys(SLOTN); let n = 0;
      for (let i = 0; i < 4000; i++) {
        const slot = slots[i % slots.length], rar = [0, 1, 2, 2, 3][i % 5], il = 1 + (i * 7) % 90;
        try {
          if (rar === 3 && !(LEGENDS[slot] || []).length) continue;
          const it = makeItem(slot, rar, il); n++;
          G.equip[slot] = it; recalc();
          for (const [k, v] of Object.entries(G.st)) if (typeof v === 'number' && !Number.isFinite(v)) { bad.push('G.st.' + k + '=' + v + ' ← ' + it.name + ' ' + JSON.stringify(it.aff.map(a => a.k))); break; }
          if (i % 40 === 0) G.inventory.push(it);
        } catch (e) { bad.push(slot + '/' + rar + '/' + il + ' → ' + e.message); }
        if (bad.length > 15) break;
      }
      return { n, bad, inv: ${P.invariants} };
    })()`);
    R.add(`隨機生成並穿戴 ${res.n} 件裝備，屬性重算全為有限數值（seed ${SEED}）`, !res.bad.length, res.bad.join('\n'));
    R.add('裝備與詞綴不變式', !res.inv.length, res.inv.join('\n'));
    for (const t of ['char', 'warehouse', 'skills', 'craft', 'dex']) { const r = await page.evaluate(`(${P.tabProbe})(${JSON.stringify(t)})`); if (!r.ok) errors.push(`裝備滿載時 ${t} 分頁渲染失敗：${r.err}`); }
    R.add('裝備滿載時各分頁仍可渲染', !errors.length, errors.join('\n'));
    await ctx.close();
  });

  /* 5. 每個技能、每件傳奇、每件簽名裝備都實際跑一遍 */
  if (want('content')) await guard('內容逐項實測', async () => {
    const { ctx, page, errors } = await openGame(browser, cur, { wait: 2500 });
    await page.evaluate(P.seedRng(SEED));
    const res = await page.evaluate(`(() => {
      const bad = [], n = { skills: 0, legends: 0, chars: 0 };
      G.lvl = 60; recalc();
      for (const id of Object.keys(SKILLS)) {
        try { for (let i = 0; i < 40; i++) stepSim(.05); G.h.hp = G.st.life; castSkill(id); for (let i = 0; i < 60; i++) stepSim(.05); n.skills++; }
        catch (e) { bad.push('技能 ' + id + ' → ' + e.message); }
      }
      for (const slot of Object.keys(LEGENDS)) for (const L of LEGENDS[slot]) {
        try { const it = makeItem(slot, 3, 40, L.id); G.armory[L.id] = it; G.equip[slot] = it; recalc(); for (let i = 0; i < 80; i++) stepSim(.05); n.legends++; }
        catch (e) { bad.push('傳奇 ' + L.id + ' → ' + e.message); }
      }
      const keep = G.char;
      for (const c of Object.keys(CHARS)) {
        try { G.char = c; recalc(); for (let i = 0; i < 200; i++) stepSim(.05); n.chars++; }
        catch (e) { bad.push('角色 ' + c + ' → ' + e.message); }
      }
      G.char = keep; recalc();
      return { bad, n, inv: ${P.invariants} };
    })()`);
    R.add(`逐一施放 ${res.n.skills} 個技能、穿戴 ${res.n.legends} 件傳奇、切換 ${res.n.chars} 位角色`, !res.bad.length && !res.inv.length && !errors.length, [...res.bad, ...res.inv, ...errors].join('\n'));
    await ctx.close();
  });

  /* 5b. 深度挑戰：直接跳到各深度，裝備與等級配套，逼首領出現並連續戰鬥（掛機錯誤常出現在深層） */
  if (want('deep')) await guard('深度挑戰', async () => {
    const { ctx, page, errors } = await openGame(browser, cur, { wait: 2500 });
    const chars = await page.evaluate(() => Object.keys(CHARS)), bad = [];
    let ran = 0;
    for (const ch of chars) for (const d of [3, 7, 12, 18, 20, 25, 35, 50, 80]) {
      await page.evaluate(P.seedRng(SEED + d));
      const r = await page.evaluate(`(() => {
        const d = ${d}; try {
          G.char = ${JSON.stringify(ch)}; G.run = null; G.lvl = Math.min(150, 8 + d * 2); G.depth = d; G.maxDepth = Math.max(G.maxDepth, d); G.push = true; G.mons = []; G.bossOut = false; G.kills = G.need;
          for (const slot of Object.keys(SLOTN)) { const lg = LEGENDS[slot] && LEGENDS[slot].length && (d % 3 === 0); G.equip[slot] = makeItem(slot, lg ? 3 : 2, 6 + d * 2); }
          recalc(); G.h.hp = G.st.life; G.h.dead = 0;
          for (let i = 0; i < 6000; i++) { stepSim(.05); if (G.h.dead) { G.h.dead = 0; G.h.hp = G.st.life; } }
          return { inv: ${P.invariants}, depth: G.depth, mons: G.mons.length };
        } catch (e) { return { err: e.message + ' @' + (e.stack || '').split('\\n')[1] }; } })()`);
      ran++;
      if (r.err) bad.push(`${ch} 深度 ${d}：${r.err}`); else if (r.inv.length) bad.push(`${ch} 深度 ${d}：${r.inv.join('；')}`);
      if (bad.length > 6) break;
    }
    R.add(`深度挑戰 ${ran} 組（4 角色 × 9 個深度，含首領）`, !bad.length && !errors.length, [...bad, ...errors].join('\n'));
    await ctx.close();
  });

  /* 6. 掛機浸泡：每位角色連續掛機數小時，定期檢查不變式與記憶體 */
  if (want('soak')) {
    const chars = await (async () => { const { ctx, page } = await openGame(browser, cur, { wait: 1500 }); const c = await page.evaluate(() => Object.keys(CHARS)); await ctx.close(); return c; })();
    for (const ch of chars) await guard(`掛機 ${SOAK_H} 小時：${ch}`, async () => {
      const { ctx, page, errors } = await openGame(browser, cur, { wait: 2000 });
      await page.evaluate(`(() => { G.char = ${JSON.stringify(ch)}; G.autoEquip = true; recalc(); })()`);
      await page.evaluate(P.seedRng(SEED + ch.length));
      const heap0 = await page.evaluate(() => { try { gc(); } catch (e) {} return performance.memory ? performance.memory.usedJSHeapSize : 0; });
      const stepsPerH = 3600 / .05, probs = []; let deaths0 = 0;
      for (let h = 0; h < SOAK_H * 4; h++) {            // 每 15 分鐘（遊戲內）檢查一次
        const out = await page.evaluate(`(() => { try { for (let i = 0; i < ${stepsPerH / 4}; i++) stepSim(.05); } catch (e) { return { err: e.message + ' @' + (e.stack || '').split('\\n')[1] }; } return { inv: ${P.invariants}, lvl: G.lvl, depth: G.depth, maxDepth: G.maxDepth, deaths: G.deaths || 0, stuck: G.h.dead }; })()`);
        if (out.err) { probs.push('第 ' + (h + 1) + ' 段丟出錯誤：' + out.err); break; }
        if (out.inv.length) { probs.push('第 ' + (h + 1) + ' 段不變式：' + out.inv.join('；')); break; }
        deaths0 = out.deaths;
      }
      const fin = await page.evaluate(() => ({ lvl: G.lvl, depth: G.depth, maxDepth: G.maxDepth, kills: G.totalKills }));
      const heap1 = await page.evaluate(() => { try { gc(); } catch (e) {} return performance.memory ? performance.memory.usedJSHeapSize : 0; });
      const grow = (heap1 - heap0) / 1048576;
      R.add(`掛機 ${SOAK_H} 小時：${ch}（Lv${fin.lvl}、最深 ${fin.maxDepth}、擊殺 ${fin.kills}）`, !probs.length && !errors.length, [...probs, ...errors].join('\n'));
      R.add(`掛機記憶體增長 ${ch}：${grow.toFixed(0)}MB`, grow < 250, `${grow.toFixed(0)}MB`, true);
      R.add(`掛機有進展 ${ch}（不卡關／不停擺）`, fin.kills > 200 && fin.lvl > 5, JSON.stringify(fin));
      await ctx.close();
    });
  }

  /* 7. 離線結算與存檔往返 */
  if (want('save')) await guard('離線與存檔', async () => {
    const { ctx, page, errors } = await openGame(browser, cur, { wait: 2500 });
    await page.evaluate(P.seedRng(SEED));
    const res = await page.evaluate(`(() => {
      const bad = []; for (let i = 0; i < 40000; i++) stepSim(.05);
      const before = { lvl: G.lvl, gold: G.gold, inv: G.inventory.length, kills: G.totalKills };
      for (const sec of [30, 600, 3600, 8 * 3600, 3 * 86400]) { try { catchUp(sec, false); G.offline = false; G.paused = false; } catch (e) { bad.push('離線 ' + sec + ' 秒：' + e.message); } }
      const after = { lvl: G.lvl, gold: G.gold, inv: G.inventory.length, kills: G.totalKills };
      if (after.lvl < before.lvl || after.gold < 0 || after.kills < before.kills) bad.push('離線後進度倒退：' + JSON.stringify({ before, after }));
      const inv1 = ${P.invariants};
      let snap, again;
      try { snap = JSON.parse(JSON.stringify(serialize())); applySave(snap); again = JSON.parse(JSON.stringify(serialize())); } catch (e) { bad.push('存檔往返丟錯：' + e.message); }
      if (snap && again) { for (const k of ['lvl', 'gold', 'depth', 'maxDepth', 'chips', 'coreDust']) if (snap[k] !== again[k]) bad.push('存檔往返後 ' + k + ' 改變：' + snap[k] + ' → ' + again[k]);
        if ((snap.inventory || []).length !== (again.inventory || []).length) bad.push('存檔往返後背包數量改變：' + snap.inventory.length + ' → ' + again.inventory.length); }
      for (let i = 0; i < 2000; i++) stepSim(.05);
      return { bad, inv: inv1.concat(${P.invariants}) };
    })()`);
    R.add('離線結算（30 秒到 3 天）與存檔往返', !res.bad.length && !res.inv.length && !errors.length, [...res.bad, ...res.inv, ...errors].join('\n'));
    await ctx.close();
  });
}

(async () => {
  const browser = await launch();
  try {
    const cur = arg('cur', null) || buildSingle(null), baseRef = arg('base', null);
    let base = null; if (baseRef && baseRef !== 'none') { try { base = buildSingle(baseRef); } catch (e) { R.add('建置比對基準 ' + baseRef, false, e.message, true); } }
    console.log(`QA 瀏覽器套件：seed ${SEED}，基準 ${baseRef || '（無）'}`);
    await suite(browser, cur, base);
  } finally { await browser.close(); }
  R.extra = { seed: SEED, soakHours: SOAK_H };
  const o = arg('out', null); if (o) fs.writeFileSync(o, JSON.stringify({ suite: 'browser', items: R.items, extra: R.extra }, null, 1));
  console.log(`\n通過 ${R.items.filter(i => i.ok).length}／警告 ${R.warned.length}／失敗 ${R.failed.length}`);
  process.exit(R.failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
