/* 在遊戲頁面內執行的檢查函式（以字串注入，不改遊戲程式）。 */
exports.TABS = ['skills', 'char', 'warehouse', 'tree', 'maps', 'goals', 'ach', 'craft', 'dress', 'rank', 'dex', 'log', 'feedback', 'support', 'save', 'settings'];

/* 狀態不變式：回傳問題清單（空 = 健康）。壞詞綴、非有限數值、物件數量暴增都在這裡抓。 */
exports.invariants = `(() => {
  const bad = [], fin = (v) => typeof v === 'number' && Number.isFinite(v);
  for (const k of ['gold', 'xp', 'lvl', 'depth', 'maxDepth', 'totalKills', 'chips', 'parts', 'coreDust']) if (!fin(G[k]) || G[k] < 0) bad.push('G.' + k + ' = ' + G[k]);
  if (G.st) for (const [k, v] of Object.entries(G.st)) if (typeof v === 'number' && !Number.isFinite(v)) bad.push('G.st.' + k + ' = ' + v);
  if (!fin(G.h.hp)) bad.push('G.h.hp = ' + G.h.hp);
  const items = [...G.inventory, ...Object.values(G.equip), ...Object.values(G.armory || {})].filter(Boolean);
  for (const it of items) {
    if (!Array.isArray(it.aff)) { bad.push('裝備沒有詞綴陣列：' + it.name); continue; }
    if (it.aff.length > 6) bad.push('詞綴超過 6 條：' + it.name);
    const seen = new Set();
    for (const a of it.aff) {
      if (!AFF[a.k]) bad.push('不存在的詞綴 ' + a.k + '（' + it.name + ' / slot ' + it.slot + ' / lg ' + it.lg + '）');
      else if (!fin(a.v)) bad.push('詞綴數值非有限 ' + a.k + '=' + a.v + '（' + it.name + '）');
      if (seen.has(a.k)) bad.push('重複詞綴 ' + a.k + '（' + it.name + '）'); seen.add(a.k);
    }
    if (!it.name || typeof it.name !== 'string') bad.push('裝備沒有名稱 slot ' + it.slot);
  }
  const cap = { mons: 600, fx: 4000, drops: 3000, floats: 1500, proj: 3000, log: 3000 };
  for (const [k, m] of Object.entries(cap)) if ((G[k] || []).length > m) bad.push('G.' + k + ' 數量失控：' + G[k].length);
  try { const n = JSON.stringify(serialize()).length; if (n > 6e6) bad.push('存檔過大：' + n + ' bytes'); } catch (e) { bad.push('serialize 失敗：' + e.message); }
  return bad.slice(0, 30);
})()`;

/* 重現用的可播種亂數 */
exports.seedRng = seed => `(() => { let a = ${seed >>> 0} || 1; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })()`;

/* 開啟某分頁並回報內容摘要；渲染丟錯會被抓到。 */
exports.tabProbe = `(tab) => {
  try { G.lvl = Math.max(G.lvl, 60); openModal(tab); } catch (e) { return { tab, ok: false, err: String(e && e.message) }; }
  const body = document.getElementById(tab === 'settings' ? 'uisettings' : 'mbody');
  const labels = [...(body || document).querySelectorAll('button, [role=button], summary, h2, h3')].map(b => b.textContent.replace(/\\s+/g, ' ').trim()).filter(t => t && t.length < 30 && !/\\d{4}|Lv\\.?\\d/.test(t));
  const out = { tab, ok: true, len: body ? body.textContent.length : 0, labels: [...new Set(labels)].sort() };
  try { document.getElementById('modal').hidden = true; } catch (e) {}
  return out;
}`;

exports.domManifest = `(() => ({
  ids: [...document.querySelectorAll('[id]')].map(e => e.id).filter(i => !/\\d{4,}/.test(i)).sort(),
  settings: [...document.querySelectorAll('[data-setting]')].map(e => e.dataset.setting).sort(),
  menu: [...document.querySelectorAll('#btns button')].map(b => b.textContent.replace(/\\s+/g, ' ').trim()).sort()
}))()`;
