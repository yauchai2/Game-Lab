/* ---------- 下方工作列：開始選單、音效切換、時鐘與小彩蛋 ---------- */
(function(){
  function init(){
  const tb = document.querySelector('.tfoot'); if (!tb) return false;
  const NAV = [['char', '角色'], ['warehouse', '背包'], ['skills', '技能'], ['craft', '打造'], ['maps', '冒險'], ['settings', '設定']];
  const sfx = n => { try { if (typeof SFX === 'function') SFX(n); } catch (e) {} };
  const snd = () => (typeof AUD !== 'undefined' && AUD.mode === 'off') ? '♪×' : '♪';
  tb.innerHTML = '<span class="start" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" id="tb-start">★ Start</span><span class="task" role="button" tabindex="0" id="tb-task">Idle Hero</span><span class="tray"><span class="tb-snd" role="button" tabindex="0" id="tb-snd" aria-label="切換音效" data-tip="音效開關"></span><span class="clk" id="clk" role="button" tabindex="0" aria-label="時間"></span></span>';
  const css = document.createElement('style'); css.textContent = `
.tfoot .start,.tfoot .task,.tfoot .tb-snd,.tfoot .clk{cursor:pointer;user-select:none}
.tfoot .start:active,.tfoot .start[aria-expanded=true]{filter:brightness(.82)}
.tfoot .task:hover{background:#ffffff48}
.tfoot .tray{margin-left:auto;display:flex;align-items:center;gap:2px;background:#1f3fb040;border-left:1px solid #ffffff50}
.tfoot .tray .clk{margin:0;background:none;border:0}.tfoot .tb-snd{padding:6px 6px}.tfoot .tb-snd:hover,.tfoot .tray .clk:hover{background:#ffffff30}
.tb-menu{position:fixed;left:0;bottom:30px;z-index:9100;width:210px;display:flex;background:#e9eefb;border:2px solid #fff;outline:1px solid #5b6fb8;box-shadow:3px -3px 0 #2f3f8f55;font:14px/1.2 "Cubic 11",system-ui,sans-serif;color:#172751}
.tb-menu[hidden]{display:none}
.tb-side{width:26px;flex:none;background:linear-gradient(0deg,#2f5fd0,#7fa8f5);color:#fff;writing-mode:vertical-rl;transform:rotate(180deg);text-align:left;padding:8px 5px;font-size:15px;letter-spacing:.12em;text-shadow:0 1px 0 #1a3a99}
.tb-list{flex:1;display:flex;flex-direction:column;padding:3px 0}
.tb-menu .tb-list button{all:unset;box-sizing:border-box;display:block;padding:9px 12px;cursor:pointer;color:#172751;background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;text-shadow:none!important;min-height:0!important;font:14px/1.2 "Cubic 11",system-ui,sans-serif!important}
.tb-menu .tb-list button:hover,.tb-menu .tb-list button:focus-visible{background:#2f5fd0!important;color:#fff!important;text-shadow:none!important}
.tb-list hr{margin:3px 6px;border:0;border-top:1px solid #9ca9c8;border-bottom:1px solid #fff}
.tb-pop{position:fixed;right:6px;bottom:36px;z-index:9100;max-width:260px;padding:8px 12px;background:#fffbd8;border:1px solid #7a6a2a;box-shadow:2px 2px 0 #0003;font:13px/1.5 "Cubic 11",system-ui,sans-serif;color:#2a2410;animation:tbPop .2s ease-out}
@keyframes tbPop{from{opacity:0;transform:translateY(6px)}}
.tb-off{position:fixed;inset:0;z-index:9500;background:#000;color:#ffb000;display:flex;align-items:center;justify-content:center;text-align:center;font:18px/1.9 "Cubic 11",monospace;cursor:pointer;animation:tbOff .7s ease-in both}
@keyframes tbOff{0%{clip-path:inset(0 0 0 0);filter:brightness(2.2)}55%{clip-path:inset(48% 0 48% 0)}100%{clip-path:inset(0 0 0 0);filter:none}}
.tb-off small{display:block;color:#a07000;font-size:13px}
.tb-rb{position:fixed;inset:0;z-index:9400;pointer-events:none;background:linear-gradient(90deg,#ff5a5a,#ffb84a,#fff25a,#6aff7a,#5ad8ff,#b07aff,#ff6ad8);opacity:0;mix-blend-mode:soft-light;animation:tbRb 2.4s ease-in-out}
@keyframes tbRb{50%{opacity:.75}}
@media(prefers-reduced-motion:reduce){.tb-off,.tb-rb,.tb-pop{animation:none}}`;
  document.head.appendChild(css);
  const menu = document.createElement('div'); menu.className = 'tb-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  const ver = (typeof CHANGELOG !== 'undefined' && CHANGELOG[0]) ? CHANGELOG[0].v : '';
  menu.innerHTML = '<div class="tb-side">Idle Hero</div><div class="tb-list">' + NAV.map(([k, n]) => `<button role="menuitem" data-nav="${k}">${n}</button>`).join('') + '<hr><button role="menuitem" data-act="about">關於 Idle Hero…</button><button role="menuitem" data-act="off">關機…</button></div>';
  document.body.appendChild(menu);
  const $s = document.getElementById('tb-start'), $snd = document.getElementById('tb-snd'), $clk = document.getElementById('clk'), $task = document.getElementById('tb-task');
  const setMenu = on => { menu.hidden = !on; $s.setAttribute('aria-expanded', String(on)); if (on) sfx('ph_tab'); };
  const act = fn => e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); e.stopPropagation(); fn(); };
  [$s, $snd, $clk, $task].forEach(el => { el.addEventListener('click', e => e.stopPropagation()); });
  const bind = (el, fn) => { el.addEventListener('click', act(fn)); el.addEventListener('keydown', act(fn)); };
  bind($s, () => setMenu(menu.hidden));
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); $s.focus(); } });
  let pop = null, popT = 0;
  const say = html => { pop?.remove(); pop = document.createElement('div'); pop.className = 'tb-pop'; pop.setAttribute('role', 'status'); pop.innerHTML = html; document.body.appendChild(pop); clearTimeout(popT); popT = setTimeout(() => { pop?.remove(); pop = null; }, 4200); };
  const rainbow = () => { const d = document.createElement('div'); d.className = 'tb-rb'; document.body.appendChild(d); setTimeout(() => d.remove(), 2500); sfx('ph_key'); };
  const shutdown = () => {
    const d = document.createElement('div'); d.className = 'tb-off'; d.tabIndex = 0; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '現在可以安全地關閉電腦了');
    d.innerHTML = '<div>現在可以安全地關閉電腦了。<small>（點一下任何地方，重新開機）</small></div>'; document.body.appendChild(d); sfx('ph_off'); d.focus();
    const back = () => { d.remove(); sfx('ph_on'); }; d.addEventListener('click', back); d.addEventListener('keydown', back);
  };
  menu.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; setMenu(false);
    if (b.dataset.nav) { if (typeof openModal === 'function') openModal(b.dataset.nav); return; }
    if (b.dataset.act === 'about') say(`<b>Idle Hero</b> ${ver}<br>一個掛機也能玩的小冒險。<br>祝你刷到好東西。`);
    if (b.dataset.act === 'off') shutdown();
  });
  // 工作列按鈕：點「Idle Hero」回到角色頁；右下角音效鍵與時鐘
  bind($task, () => { if (typeof openModal === 'function') openModal('char'); sfx('ph_tab'); });
  const paintSnd = () => { $snd.textContent = snd(); $snd.setAttribute('aria-pressed', String(!(typeof AUD !== 'undefined' && AUD.mode === 'off'))); };
  bind($snd, () => { if (typeof audMode !== 'function') return; audInit?.(); audMode(AUD.mode === 'off' ? 'all' : 'off'); paintSnd(); if (AUD.mode !== 'off') sfx('ph_tab'); });
  paintSnd();
  const pad = n => String(n).padStart(2, '0');
  const tick = () => { const d = new Date(); $clk.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()); }; tick(); setInterval(tick, 20000);
  let clicks = 0, clickT = 0; const days = '日一二三四五六';
  bind($clk, () => {
    const d = new Date(); clicks++; clearTimeout(clickT); clickT = setTimeout(() => { clicks = 0; }, 900);
    if (clicks >= 7) { clicks = 0; rainbow(); say('★ 時間是彩虹色的 ★'); return; }
    say(`${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${days[d.getDay()]}`);
  });
  // 彩蛋：↑↑↓↓←→←→ 讓畫面閃一道彩虹
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight']; let at = 0;
  document.addEventListener('keydown', e => { if (e.target.closest?.('input,textarea,select')) return; at = e.key === seq[at] ? at + 1 : (e.key === seq[0] ? 1 : 0); if (at === seq.length) { at = 0; rainbow(); say('★ 隱藏彩蛋：歡迎回到 2000 年代 ★'); } });
  return true;
  }
  if (!init()){ const t = setInterval(() => { if (init()) clearInterval(t); }, 150); }
})();
