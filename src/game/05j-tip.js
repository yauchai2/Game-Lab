/* 滑鼠提示：桌機移到按鈕、格子、配件上，稍等一下就在游標旁顯示說明。
   取用順序：data-tip → title（接手後移除原生 title，避免雙重提示）→ 格子與卡片的 aria-label。觸控裝置不顯示，改用點選後的詳情。 */
(function(){
  if (typeof document === 'undefined' || !document.body) return;
  const SEL = '[data-tip],[title],.pc,.gt,.ui-item-tile,.ui-mapcard', LABEL_ONLY = '.pc,.gt,.ui-item-tile,.ui-mapcard';
  let tip = null, timer = 0, cur = null, mx = 0, my = 0;
  const fine = () => !window.matchMedia || window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function textOf(el){
    if (el.hasAttribute('title')){ const t = el.getAttribute('title'); el.removeAttribute('title'); if (t){ el.dataset.tip = t; if (!el.hasAttribute('aria-description')) el.setAttribute('aria-description', t); } }
    let t = el.dataset.tip;
    if (!t && el.matches(LABEL_ONLY)){ const a = el.getAttribute('aria-label'); if (a && a.replace(/\s/g, '') !== (el.textContent || '').replace(/\s/g, '') && !el.disabled) t = a.replace(/，/g, '\n'); }
    return t || '';
  }
  function place(){
    if (!tip) return; const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = mx + 14, y = my + 18;
    if (x + w + pad > innerWidth) x = Math.max(pad, mx - w - 10);
    if (y + h + pad > innerHeight) y = Math.max(pad, my - h - 14);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function show(text){
    if (!tip){ tip = document.createElement('div'); tip.id = 'uxtip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = text; tip.style.display = 'block'; place();
  }
  function hide(){ clearTimeout(timer); timer = 0; cur = null; if (tip) tip.style.display = 'none'; }
  document.addEventListener('mouseover', e => {
    if (!fine()) return;
    const el = e.target.closest && e.target.closest(SEL); if (el === cur) return;
    hide(); if (!el) return;
    const t = textOf(el); if (!t) return;
    cur = el; mx = e.clientX; my = e.clientY;
    timer = setTimeout(() => { if (cur === el && document.contains(el)) show(t); }, 220);
  }, true);
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (tip && tip.style.display === 'block'){ if (cur && !document.contains(cur)) hide(); else place(); } }, true);
  for (const ev of ['mousedown', 'keydown', 'wheel', 'touchstart']) document.addEventListener(ev, hide, true);
  document.addEventListener('scroll', hide, true);
  const st = document.createElement('style');
  st.textContent = '.battle-hud [data-tip]{pointer-events:auto}#uxtip{position:fixed;z-index:99999;display:none;max-width:240px;padding:6px 8px;pointer-events:none;white-space:pre-line;font:12px/1.5 var(--ux-body,system-ui,sans-serif);color:#eef4ff;background:#1d2748;border:2px solid #fff;outline:1px solid #5d6bb0;box-shadow:2px 2px 0 #0006}@media(prefers-reduced-motion:no-preference){#uxtip{animation:uxtipin .08s steps(2)}}@keyframes uxtipin{from{opacity:0}}';
  document.head.appendChild(st);
})();
