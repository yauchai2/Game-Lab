/* 角色手機：從角色頁開啟的全屏 3D 手機（CSS 3D，貼圖見 phone-assets.js），螢幕顯示角色資訊。
   不改任何遊戲規則，只讀 G；關閉後回到原頁面。 */
const PH = { open:false, tab:0, zoom:false, drag:null, rx:0, ry:0, tx:0, ty:0, raf:0, t0:0, timer:0, scroll:0, closing:false };
const PH_TABS = ['名片', '裝備', '屬性', '技能', '連結'];
/* 版面座標（單位＝貼圖像素，畫布 640×960） */
const PH_SCREEN = { x:156, y:164, w:328, h:431 };
const PH_KEYS = [  // 按鍵熱區：中心座標與大小，act 為動作
  { id:'back', x:192, y:675, w:76, h:68, act:'close', tip:'返回' },
  { id:'call', x:449, y:675, w:76, h:68, act:'links', tip:'連結' },
  { id:'up', x:320, y:628, w:50, h:34, act:'up', tip:'上捲' },
  { id:'down', x:320, y:731, w:50, h:34, act:'down', tip:'下捲' },
  { id:'left', x:267, y:679, w:34, h:50, act:'prev', tip:'上一頁' },
  { id:'right', x:372, y:679, w:34, h:50, act:'next', tip:'下一頁' },
  { id:'ok', x:320, y:679, w:50, h:50, act:'zoom', tip:'放大／縮小螢幕' },
  { id:'menu', x:239, y:783, w:76, h:40, act:'next', tip:'下一頁' },
  { id:'home', x:320, y:783, w:76, h:40, act:'home', tip:'名片' },
  { id:'star', x:401, y:783, w:76, h:40, act:'zoom', tip:'放大／縮小螢幕' }
];
const phEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const phNum = n => (n | 0).toString().padStart(6, '0');

function phoneProfile(){ return (typeof CHARACTER_PROFILES !== 'undefined' && CHARACTER_PROFILES[G.char]) || {}; }
function phoneHead(){
  const P = phoneProfile(), need = xpNeed(G.lvl), xp = Math.max(0, Math.min(1, G.xp / need)), hp = Math.max(0, Math.min(1, G.h.hp / G.st.life));
  return `<div class="phs-hello"><span class="phs-star">☆</span> 歡迎光臨 <b>${phEsc(G.heroName || P.n || '阿街')}</b> 的主頁 <span class="phs-star">☆</span></div>
   <div class="phs-rainbow"></div>
   <table class="phs-card"><tr><td class="phs-av">${spr('role', 44)}</td><td><b>${phEsc(P.n || '')}</b><br><small>${phEsc(P.title || '')}</small><br><span class="phs-lv">LV ${G.lvl}</span></td></tr></table>
   <div class="phs-bar" title="經驗"><i style="width:${(xp * 100).toFixed(1)}%"></i><span>EXP ${(xp * 100).toFixed(0)}%</span></div>
   <div class="phs-bar hp" title="生命"><i style="width:${(hp * 100).toFixed(1)}%"></i><span>HP ${tFmt(Math.max(0, G.h.hp))}／${tFmt(G.st.life)}</span></div>`;
}
function phonePage(){
  const s = G.st, P = phoneProfile();
  if (PH.tab === 0) return `${phoneHead()}
    <fieldset><legend>自我介紹</legend><p>${phEsc(P.identity || '')}</p><p class="phs-q">「${phEsc(P.quote || '…')}」</p></fieldset>
    <fieldset><legend>冒險紀錄</legend><dl class="phs-dl"><dt>目前深度</dt><dd>${G.depth}</dd><dt>最深紀錄</dt><dd>${G.maxDepth}</dd><dt>累計擊殺</dt><dd>${tFmt(G.totalKills)}</dd><dt>金幣</dt><dd>${tFmt(G.gold)}</dd></dl></fieldset>`;
  if (PH.tab === 1) return `<div class="phs-hello">★ 隨身裝備 ★</div><div class="phs-rainbow"></div>` + Object.keys(SLOTN).map(k => {
    const it = G.equip[k];
    if (!it) return `<fieldset><legend>${SLOTN[k]}</legend><p class="phs-dim">（空）</p></fieldset>`;
    return `<fieldset><legend>${SLOTN[k]}</legend><div class="phs-gear">${eqico(k, it.r, 28)}<div><b style="color:${phRar(it.r)}">${phEsc(it.name)}</b><br><small>${RAR[it.r].n} · Lv.${it.il}</small></div></div><ul class="phs-ul">${itemLines(it).slice(0, 5).map(l => `<li>${phEsc(l.t)}</li>`).join('')}</ul></fieldset>`;
  }).join('');
  if (PH.tab === 2) {
    const rows = [['單體直傷預估', tFmt(s.dps) + ' DPS'], ['最大生命', tFmt(s.life)], ['暴擊率', s.crit.toFixed(0) + '%'], ['暴擊傷害', Math.round(s.cm) + '%'], ['攻擊速度', s.aps ? s.aps.toFixed(2) + ' 次／秒' : '—'], ['傷害減免', (s.red * 100).toFixed(0) + '%'], ['每秒回復', tFmt(s.regen || 0)], ['吸血', (s.leech || 0) + '%'], ['戰力評分', tFmt(s.power)]];
    return `<div class="phs-hello">◆ 能力值 ◆</div><div class="phs-rainbow"></div><table class="phs-tbl">${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>`;
  }
  if (PH.tab === 3) return `<div class="phs-hello">✦ 技能一覽 ✦</div><div class="phs-rainbow"></div>` + (G.slots.length ? G.slots.map(id => { const k = SKILLS[id]; return k ? `<fieldset><legend style="color:${k.col}">${phEsc(k.n)}</legend><p>${phEsc(k.d)}</p><small class="phs-dim">冷卻 ${k.cd} 秒</small></fieldset>` : ''; }).join('') : '<p class="phs-dim">還沒有技能，繼續冒險吧。</p>');
  return `<div class="phs-hello">♪ 友情連結 ♪</div><div class="phs-rainbow"></div><p class="phs-dim">點一下就會關掉手機，直接前往：</p><ul class="phs-links">${[['tree', '天賦盤'], ['dress', '角色與裝扮'], ['warehouse', '背包'], ['skills', '技能接線板'], ['craft', '打造與補給站'], ['maps', '冒險地圖']].map(([k, n]) => `<li><a href="#" data-go="${k}">» ${n}</a></li>`).join('')}</ul>`;
}
function phRar(r){ return ['#9fb3c8', '#6fb0ff', '#ffd45a', '#ff8a4c'][r] || '#cfeaff'; }
function phoneScreenHtml(){
  const last = (G.log && G.log[0] && G.log[0].txt) || '一切正常。';
  return `<div class="phs-win"><div class="phs-title"><span>▣ ${phEsc(phoneProfile().n || 'HERO')}.HOME</span><button data-act="zoom" aria-label="放大或縮小螢幕">□</button><button data-act="close" aria-label="關閉手機">×</button></div>
   <div class="phs-tabs" role="tablist">${PH_TABS.map((n, i) => `<button role="tab" aria-selected="${PH.tab === i}" data-tab="${i}">${n}</button>`).join('')}</div>
   <div class="phs-tick"><span>${phEsc(last)}　★　${phEsc(last)}</span></div>
   <div class="phs-body" id="ph-body">${phonePage()}</div>
   <div class="phs-status"><span>完成</span><span>您是第 <b>${phNum(G.totalKills + G.lvl * 7)}</b> 位訪客</span></div></div>`;
}
function phoneBuild(){
  const M = PHONE_META, T = M.sideW, b0 = M.body[0], b1 = M.body[1], I = PHONE_IMG;
  let slices = ''; const N = 9; for (let i = 0; i < N; i++) { const z = (-T / 2 + 4 + (T - 8) * i / (N - 1)).toFixed(1); slices += `<div class="ph-plane ph-slice" style="transform:translateZ(${z}px)"></div>`; }
  return `<div class="ph-root" id="ph-root" role="dialog" aria-modal="true" aria-label="角色手機">
   <div class="ph-bg"><div class="ph-stars"></div><div class="ph-grid"></div><div class="ph-mq"><span>★ 歡迎來到角色手機 ★ BEST VIEWED WITH ANY BROWSER ★ 請勿關閉電源 ★ UNDER CONSTRUCTION ★ 拖曳可以轉動手機 ★ 按 ESC 離開 ★</span></div></div>
   <button class="ph-close" data-act="close" aria-label="關閉手機">× 關閉</button>
   <div class="ph-stage" id="ph-stage"><div class="ph-fit" id="ph-fit"><div class="ph-enter" id="ph-enter"><div class="ph-tilt" id="ph-tilt">
    <div class="ph-phone" style="width:${M.w}px;height:${M.h}px">
     ${slices}
     <div class="ph-plane ph-back" style="transform:rotateY(180deg) translateZ(${T / 2}px)"></div>
     <div class="ph-plane ph-front" style="transform:translateZ(${T / 2}px)">
      <div class="ph-screen" id="ph-screen" style="left:${PH_SCREEN.x}px;top:${PH_SCREEN.y}px;width:${PH_SCREEN.w}px;height:${PH_SCREEN.h}px"><div class="ph-crt" id="ph-crt"></div></div>
      <div class="ph-led"></div>
      ${PH_KEYS.map(k => `<button class="ph-key" data-act="${k.act}" aria-label="${k.tip}" data-tip="${k.tip}" style="left:${k.x - k.w / 2}px;top:${k.y - k.h / 2}px;width:${k.w}px;height:${k.h}px"></button>`).join('')}
     </div>
    </div></div></div></div></div>
   <div class="ph-hint">拖曳轉動 · 方向鍵換頁 · ✦ 放大螢幕</div></div>`;
}
function phoneFit(){
  const root = document.getElementById('ph-root'); if (!root) return;
  const vw = innerWidth, vh = innerHeight, M = PHONE_META;
  const sN = Math.min(vw * .94 / (M.body[1] - M.body[0]), vh * .92 / 830, 1.5), sZ = Math.min(vw * .98 / PH_SCREEN.w, vh * .96 / (PH_SCREEN.h + 60), 3);
  const s = PH.zoom ? sZ : sN, shift = PH.zoom ? (PH_SCREEN.y + PH_SCREEN.h / 2 - M.h / 2) : (435 - M.h / 2);
  const fit = document.getElementById('ph-fit'); fit.style.setProperty('--s', s); fit.style.setProperty('--dy', (-shift * s) + 'px');
  root.classList.toggle('zoom', PH.zoom);
}
function phoneRender(keepScroll){
  const sc = document.getElementById('ph-screen'); if (!sc) return;
  const body = document.getElementById('ph-body'), top = body ? body.scrollTop : 0;
  const crt = document.getElementById('ph-crt'); sc.innerHTML = ''; sc.appendChild(crt);
  const wrap = document.createElement('div'); wrap.className = 'phs'; wrap.innerHTML = phoneScreenHtml(); sc.appendChild(wrap);
  const nb = document.getElementById('ph-body'); if (nb && keepScroll) nb.scrollTop = top;
}
function phoneRefresh(){   // 每秒只更新內容，不重建按鈕與分頁
  const b = document.getElementById('ph-body'); if (!b || PH.drag) return;
  const top = b.scrollTop; b.innerHTML = phonePage(); b.scrollTop = top;
  const st = document.querySelector('.phs-status b'); if (st) st.textContent = phNum(G.totalKills + G.lvl * 7);
}
function phoneSet(tab){ PH.tab = (tab + PH_TABS.length) % PH_TABS.length; phoneRender(false); }
function phoneAct(a){
  try { SFX('snap'); } catch (e) {}
  if (a === 'close') return phoneClose();
  if (a === 'zoom') { PH.zoom = !PH.zoom; phoneFit(); return; }
  if (a === 'next') return phoneSet(PH.tab + 1);
  if (a === 'prev') return phoneSet(PH.tab - 1);
  if (a === 'home') return phoneSet(0);
  if (a === 'links') return phoneSet(PH_TABS.length - 1);
  const b = document.getElementById('ph-body'); if (b) b.scrollBy({ top:a === 'up' ? -90 : 90, behavior:'smooth' });
}
function phonePress(ev){
  const k = ev.target.closest('[data-act]'); if (k) { ev.preventDefault(); k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 140); return phoneAct(k.dataset.act); }
  const t = ev.target.closest('[data-tab]'); if (t) { try { SFX('snap'); } catch (e) {} return phoneSet(+t.dataset.tab); }
  const g = ev.target.closest('[data-go]'); if (g) { ev.preventDefault(); const to = g.dataset.go; phoneClose(true); return openModal(to); }
}
function phoneKey(ev){
  if (!PH.open) return;
  const m = { Escape:'close', ArrowLeft:'prev', ArrowRight:'next', ArrowUp:'up', ArrowDown:'down', Enter:'zoom' }[ev.key];
  if (!m || (ev.key === 'Enter' && ev.target.closest('button,a'))) return;
  ev.preventDefault(); ev.stopPropagation(); phoneAct(m);
}
function phoneDown(ev){
  if (ev.target.closest('.ph-screen,.ph-key,.ph-close')) return;
  PH.drag = { x:ev.clientX, y:ev.clientY, ox:PH.ry, oy:PH.rx }; ev.currentTarget.setPointerCapture?.(ev.pointerId);
}
function phoneMove(ev){
  if (PH.drag) { PH.ry = PH.drag.ox + (ev.clientX - PH.drag.x) * .45; PH.rx = Math.max(-40, Math.min(40, PH.drag.oy - (ev.clientY - PH.drag.y) * .3)); }
  else if (!PH.zoom && ev.pointerType === 'mouse') { PH.ty = (ev.clientX / innerWidth - .5) * 14; PH.tx = -(ev.clientY / innerHeight - .5) * 8; }
}
function phoneUp(){ if (PH.drag) { PH.drag = null; PH.release = performance.now(); } }
function phoneLoop(now){
  if (!PH.open) return;
  const el = document.getElementById('ph-tilt'); if (!el) return;
  if (!PH.drag) {   // 放開後緩緩回正，再輕輕晃動
    const settle = PH.release ? Math.min(1, (now - PH.release) / 900) : 1;
    PH.ry += ((Math.round(PH.ry / 360) * 360) - PH.ry) * .06 * settle; PH.rx *= 1 - .06 * settle;
  }
  const sway = PH.zoom ? 0 : 1, t = (now - PH.t0) / 1000;
  const ry = PH.ry + PH.ty * sway + Math.sin(t * .9) * 4 * sway, rx = PH.rx + PH.tx * sway + Math.sin(t * .7) * 2 * sway;
  el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  PH.raf = requestAnimationFrame(phoneLoop);
}
function phoneOpen(){
  if (PH.open || typeof PHONE_IMG === 'undefined') return;
  PH.open = true; PH.closing = false; PH.tab = 0; PH.zoom = false; PH.rx = PH.ry = PH.tx = PH.ty = 0; PH.release = 0; PH.t0 = performance.now();
  const host = document.createElement('div'); host.id = 'ph-host'; host.innerHTML = phoneBuild(); document.body.appendChild(host);
  const root = document.getElementById('ph-root');
  root.addEventListener('click', phonePress); root.addEventListener('pointerdown', phoneDown); root.addEventListener('pointermove', phoneMove); root.addEventListener('pointerup', phoneUp); root.addEventListener('pointercancel', phoneUp);
  document.addEventListener('keydown', phoneKey, true); addEventListener('resize', phoneFit);
  phoneFit(); phoneRender(false); document.getElementById('ph-enter').classList.add('in');
  setTimeout(() => { if (PH.open) { document.getElementById('ph-crt')?.classList.add('on'); try { SFX('lvl'); } catch (e) {} } }, 900);
  PH.timer = setInterval(phoneRefresh, 1000); PH.raf = requestAnimationFrame(phoneLoop);
  root.querySelector('.ph-close')?.focus({ preventScroll:true });
}
function phoneClose(instant){
  if (!PH.open || PH.closing) return;
  const done = () => { PH.open = false; clearInterval(PH.timer); cancelAnimationFrame(PH.raf); document.removeEventListener('keydown', phoneKey, true); removeEventListener('resize', phoneFit); document.getElementById('ph-host')?.remove(); };
  PH.closing = true;
  if (instant === true) { done(); return; }
  document.getElementById('ph-crt')?.classList.remove('on'); const en = document.getElementById('ph-enter'); en.classList.remove('in'); en.classList.add('out');
  document.getElementById('ph-root').classList.add('leaving');
  setTimeout(done, 520);
}
function phoneButtonHtml(){
  return typeof PHONE_IMG === 'undefined' ? '' : `<button class="ph-open" data-tip="全屏的 3D 手機，查看角色資訊" onclick="phoneOpen()"><img alt="" src="${PHONE_IMG.front}"><span><b>角色手機</b><small>全屏查看角色資訊</small></span><i aria-hidden="true">↗</i></button>`;
}

(function(){ const s = document.createElement('style'); s.textContent = `
.ph-open{display:flex;align-items:center;gap:10px;width:100%;margin:6px 0;padding:6px 10px!important;text-align:left;background:linear-gradient(90deg,#16264f,#2b4a9c)!important;color:#e6f3ff!important;border:2px solid #fff!important;outline:1px solid #7d8bbd;border-radius:0!important;box-shadow:0 2px 0 #8c9bd0!important}
.ph-open img{width:34px;height:52px;object-fit:contain;filter:drop-shadow(0 2px 0 #0006);transform:rotate(-8deg)}.ph-open span{flex:1;display:flex;flex-direction:column}.ph-open b{font-size:15px;font-family:var(--ux-body)!important}.ph-open small{font-size:12px;opacity:.85;font-family:var(--ux-body)!important}.ph-open:hover img{transform:rotate(0) scale(1.08)}.ph-open img{transition:transform .2s}
.ph-root{position:fixed;inset:0;z-index:9000;overflow:hidden;background:#0b1030;color:#cfeaff;font-family:"Cubic 11",system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;animation:phBgIn .45s ease both}
.ph-root.leaving{animation:phBgOut .5s ease both}@keyframes phBgIn{from{opacity:0}to{opacity:1}}@keyframes phBgOut{to{opacity:0}}
.ph-bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,#2a3a9c 0,#141a55 55%,#080b24 100%)}
.ph-grid{position:absolute;left:-50%;right:-50%;bottom:0;height:55%;background:linear-gradient(#7cf0ff55 1px,transparent 1px) 0 0/48px 48px,linear-gradient(90deg,#7cf0ff55 1px,transparent 1px) 0 0/48px 48px;transform:perspective(380px) rotateX(62deg);transform-origin:50% 100%;opacity:.55;mask-image:linear-gradient(transparent,#000 60%);animation:phGrid 3s linear infinite}
@keyframes phGrid{to{background-position:0 48px,0 0}}
.ph-stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 12% 18%,#fff,transparent),radial-gradient(2px 2px at 78% 12%,#ffe45c,transparent),radial-gradient(1.5px 1.5px at 42% 30%,#9ff,transparent),radial-gradient(2px 2px at 90% 44%,#ff9ad9,transparent),radial-gradient(1.5px 1.5px at 24% 62%,#fff,transparent),radial-gradient(2px 2px at 64% 70%,#9ff,transparent),radial-gradient(1.5px 1.5px at 8% 86%,#ffe45c,transparent),radial-gradient(2px 2px at 54% 8%,#fff,transparent);animation:phTw 2.4s steps(2) infinite}
@keyframes phTw{50%{opacity:.55}}
.ph-mq{position:absolute;left:0;right:0;top:0;height:22px;overflow:hidden;background:#000a;border-bottom:1px solid #7cf0ff66;font-size:12px;line-height:22px;color:#ffe45c;white-space:nowrap}.ph-mq span{display:inline-block;padding-left:100%;animation:phMq 28s linear infinite}@keyframes phMq{to{transform:translateX(-100%)}}
#ph-root .ph-close{position:absolute;right:10px;top:30px;z-index:5;padding:6px 12px;font:14px "Cubic 11",system-ui;color:#12202a;background:#e8ecf8;border:2px solid #fff;outline:1px solid #7d8bbd;box-shadow:0 2px 0 #8c9bd0;cursor:pointer}
.ph-hint{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:12px;color:#9fd6ffcc;pointer-events:none;text-shadow:0 1px 0 #000}
.ph-stage{position:absolute;inset:0;perspective:1700px;perspective-origin:50% 45%;transform-style:preserve-3d}
.ph-fit{--s:.5;--dy:0px;position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;transform:translate(0,var(--dy)) scale(var(--s));transition:transform .6s cubic-bezier(.3,.8,.25,1)}
.ph-enter,.ph-tilt{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d}
.ph-enter{transform:translateZ(-2200px) rotateY(-220deg) rotateX(40deg) translateY(900px)}
.ph-enter.in{animation:phIn 1.15s cubic-bezier(.18,.9,.25,1.04) both}.ph-enter.out{animation:phOut .5s cubic-bezier(.6,0,.9,.4) both}
@keyframes phIn{0%{transform:translateZ(-2200px) rotateY(-220deg) rotateX(40deg) translateY(900px)}55%{transform:translateZ(160px) rotateY(-24deg) rotateX(-8deg) translateY(-30px)}78%{transform:translateZ(-30px) rotateY(8deg) rotateX(3deg) translateY(6px)}100%{transform:none}}
@keyframes phOut{0%{transform:none}100%{transform:translateZ(-2000px) rotateY(200deg) rotateX(-30deg) translateY(-700px)}}
.ph-phone{position:absolute;left:-320px;top:-480px;transform-style:preserve-3d}
.ph-plane{position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;background-repeat:no-repeat;background-size:100% 100%}
.ph-front{backface-visibility:hidden}.ph-back{backface-visibility:hidden}
.ph-slice{background-image:var(--ph-slice)}.ph-side{background-size:100% 100%;filter:none}.ph-sideL{transform-origin:center}
.ph-screen{position:absolute;background:#04132b;overflow:hidden;border-radius:6px;box-shadow:inset 0 0 18px #000a;transform:translateZ(1px)}
.ph-crt{position:absolute;inset:0;z-index:5;background:#bfefff;pointer-events:none;transform:scaleY(.005) scaleX(.2);opacity:1;transition:none}
.ph-crt.on{animation:phCrt .7s ease-out forwards}
@keyframes phCrt{0%{transform:scaleY(.005) scaleX(.2);opacity:1}35%{transform:scaleY(.01) scaleX(1);opacity:1}70%{transform:scaleY(1) scaleX(1);opacity:.9}100%{transform:scaleY(1) scaleX(1);opacity:0}}
.ph-screen::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 2px,#0000002e 2px 3px),radial-gradient(120% 100% at 50% 40%,transparent 60%,#0008);z-index:6}
.ph-led{position:absolute;left:477px;top:121px;width:22px;height:22px;border-radius:50%;background:#9bff3a;box-shadow:0 0 14px 4px #9bff3a99;animation:phLed 1.6s ease-in-out infinite;pointer-events:none;mix-blend-mode:screen;opacity:.0}
@keyframes phLed{50%{opacity:.5}}
#ph-root .ph-key{position:absolute;padding:0!important;min-height:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:14px!important;cursor:pointer;-webkit-tap-highlight-color:transparent;transform:translateZ(2px)}
#ph-root .ph-key:hover{background:#ffffff26!important;box-shadow:0 0 12px #8ff8!important}#ph-root .ph-key.hit,#ph-root .ph-key:active{background:#0004!important;box-shadow:inset 0 3px 8px #0008!important}
#ph-root .ph-key:focus-visible{outline:3px solid #ffe45c}
/* 螢幕內：舊網路時代網頁風 */
.phs{position:absolute;inset:0;font:15px/1.4 "Cubic 11",system-ui,sans-serif;color:#d8efff;background:#06214a;display:flex;flex-direction:column}
.phs-win{display:flex;flex-direction:column;height:100%}
.phs-title{display:flex;align-items:center;gap:3px;padding:2px 3px 2px 6px;background:linear-gradient(90deg,#0a1f7a,#3a86e8);color:#fff;font-size:13px}.phs-title span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.phs-title button,.phs-tabs button{font:inherit;cursor:pointer}#ph-root .phs button{min-height:0!important;border-radius:0!important}.phs-title button{width:19px;height:17px;padding:0;line-height:14px;background:#c8d0e4;color:#000;border:1px solid;border-color:#fff #555 #555 #fff;font-size:13px}
.phs-tabs{display:flex;gap:2px;padding:3px 3px 0;background:#0b2d63}.phs-tabs button{flex:1;padding:2px 0;font-size:13px;background:#9fb3d8;color:#05153a;border:1px solid;border-color:#fff #46557e #46557e #fff;border-bottom:0}.phs-tabs button[aria-selected=true]{background:#e8f2ff;font-weight:700}
.phs-tick{height:18px;overflow:hidden;background:#000;border-top:1px solid #7cf0ff66;border-bottom:1px solid #7cf0ff66;color:#9bff3a;font-size:12px;line-height:18px;white-space:nowrap}.phs-tick span{display:inline-block;padding-left:100%;animation:phTick 16s linear infinite}@keyframes phTick{to{transform:translateX(-100%)}}
.phs-body{flex:1;overflow-y:auto;padding:6px 8px;background:linear-gradient(#06214a,#0a2c63);scrollbar-width:thin;scrollbar-color:#8aa7e0 #0b2d63;touch-action:pan-y}
.phs-status{display:flex;justify-content:space-between;padding:1px 6px;background:#c8d0e4;color:#10204a;font-size:11px;border-top:1px solid #fff}
.phs-hello{text-align:center;font-size:16px;color:#ffe45c;text-shadow:1px 1px 0 #000}.phs-star{display:inline-block;color:#ff9ad9;animation:phSpin 1.4s steps(4) infinite}@keyframes phSpin{50%{transform:scale(.6)}}
.phs-rainbow{height:4px;margin:4px 0 6px;background:linear-gradient(90deg,#f33,#fa3,#ee3,#3d3,#3cf,#63f,#e3c);background-size:200% 100%;animation:phRb 2s linear infinite}@keyframes phRb{to{background-position:200% 0}}
.phs-card{width:100%;border-collapse:collapse;margin:2px 0 6px}.phs-card td{padding:2px 4px;vertical-align:middle}.phs-av{width:54px;text-align:center;background:#0e3f86;border:1px solid #7cf0ff88}.phs-lv{display:inline-block;margin-top:2px;padding:0 5px;background:#ffe45c;color:#2a1a00;font-size:12px}.phs-card small{color:#9fd6ff}
.phs-bar{position:relative;height:15px;margin:3px 0;background:#031433;border:1px solid #7cf0ff88}.phs-bar i{position:absolute;left:0;top:0;bottom:0;background:repeating-linear-gradient(90deg,#3ec6ff 0 5px,#2a9ad8 5px 6px)}.phs-bar.hp i{background:repeating-linear-gradient(90deg,#ff5a7a 0 5px,#c93a58 5px 6px)}.phs-bar span{position:absolute;inset:0;text-align:center;font-size:11px;line-height:13px;color:#fff;text-shadow:1px 1px 0 #000}
.phs fieldset{margin:6px 0;padding:3px 7px 5px;border:2px groove #7aa6e8;min-width:0}.phs legend{padding:0 4px;color:#ffe45c;font-size:13px}.phs p{margin:2px 0}.phs-q{color:#ffb8e6}.phs-dim{color:#8fb0d8}
.phs-dl{display:grid;grid-template-columns:auto 1fr;gap:1px 8px;margin:0}.phs-dl dt{color:#9fd6ff}.phs-dl dd{margin:0;text-align:right;color:#fff}
.phs-tbl{width:100%;border-collapse:collapse}.phs-tbl th,.phs-tbl td{padding:3px 4px;border:1px solid #3a63a8;font-weight:400;font-size:14px}.phs-tbl th{text-align:left;color:#9fd6ff;background:#0a2a5c}.phs-tbl td{text-align:right;color:#fff}
.phs-gear{display:flex;align-items:center;gap:6px}.phs-ul{margin:3px 0 0;padding-left:16px;font-size:13px;color:#cfeaff}
.phs-links{list-style:none;margin:0;padding:0}.phs-links li{padding:4px 0}.phs a{color:#7fc4ff;text-decoration:underline;cursor:pointer;font-size:16px}.phs a:visited,.phs a:hover{color:#d49cff}
.ph-root.zoom .ph-hint{opacity:.4}
@media (prefers-reduced-motion:reduce){.ph-enter.in{animation-duration:.01s}.ph-grid,.ph-stars,.ph-mq span,.phs-tick span,.phs-rainbow{animation:none}}
`; document.head.appendChild(s);
 const f = document.createElement('style'); f.textContent = typeof PHONE_IMG === 'undefined' ? '' : `.ph-front{background-image:url(${PHONE_IMG.front})}.ph-back{background-image:url(${PHONE_IMG.back})}.ph-side{background-image:url(${PHONE_IMG.side})}.ph-sideL{background-image:url(${PHONE_IMG.side});transform-style:preserve-3d}.ph-slice{background-image:url(${PHONE_IMG.slice})}`; document.head.appendChild(f); })();
