/* ---------- 倒下畫面：戰場上方的「死亡」大字與復活倒數（不擋操作、不暫停掛機） ---------- */
const DEATHFX = { el:null, shown:false, sec:-1, total:3, hideT:0 };
(function(){
  const css = document.createElement('style'); css.textContent = `
#deathfx{position:fixed;z-index:12;pointer-events:none;display:none;align-items:center;justify-content:center;overflow:hidden;font-family:"Cubic 11",system-ui,sans-serif;user-select:none}
#deathfx.on{display:flex}
#deathfx .df-veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#0b153500 0,#0b153566 55%,#0b1535cc 100%),repeating-linear-gradient(0deg,#0000 0 2px,#00000026 2px 3px);backdrop-filter:grayscale(.5) brightness(.8);-webkit-backdrop-filter:grayscale(.5) brightness(.8);animation:dfVeil .5s ease-out both}
@keyframes dfVeil{from{opacity:0}}
#deathfx .df-win{position:relative;width:min(86%,330px);background:#e6e8f6;border:2px solid #fff;outline:2px solid #5c6a8e;box-shadow:3px 3px 0 #0b153599;animation:dfPop .45s steps(6,end) both}
@keyframes dfPop{0%{transform:scale(.3,.05);opacity:0}60%{transform:scale(1.06,1.02);opacity:1}100%{transform:none}}
#deathfx .df-title{display:flex;align-items:center;gap:6px;padding:4px 7px;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);color:#fff;font-size:13px;letter-spacing:.06em;border-bottom:2px solid #1d2552}
#deathfx .df-title i{margin-left:auto;font-style:normal;width:16px;height:14px;line-height:12px;text-align:center;background:linear-gradient(#f2f4fa,#c3cbdc);color:#333;border:1px solid;border-color:#fff #6d788a #6d788a #fff;font-size:12px}
#deathfx .df-body{padding:10px 12px 12px;text-align:center;background:#e6e8f6}
#deathfx .df-big{display:block;font-size:clamp(48px,11vw,76px);line-height:1.05;letter-spacing:.12em;padding-left:.12em;color:#c8341f;text-shadow:2px 2px 0 #fff,4px 4px 0 #1d2552;animation:dfGlitch 2.4s steps(1) infinite}
@keyframes dfGlitch{0%,86%,100%{transform:none}88%{transform:translate(-3px,0) skewX(-6deg)}90%{transform:translate(3px,1px)}92%{transform:translate(-1px,-1px) skewX(4deg)}}
#deathfx .df-sub{display:block;margin:2px 0 8px;color:#5c6a8e;font-size:12px;letter-spacing:.3em}
#deathfx .df-count{display:flex;align-items:baseline;justify-content:center;gap:8px;color:#1d2552;font-size:15px}
#deathfx .df-count b{display:inline-block;min-width:1.2em;font-size:34px;line-height:1;color:#1d2552;text-shadow:2px 2px 0 #fff;font-variant-numeric:tabular-nums}
#deathfx .df-bar{position:relative;height:14px;margin:8px 0 2px;background:#18233de8;border:2px solid #17203b;box-shadow:1px 1px #ffffff90,inset 0 1px #030b23;overflow:hidden}
#deathfx .df-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#fff3bf 0 2px,#efce68 2px 4px,#a38c3b 4px 100%)}
#deathfx .df-note{margin-top:4px;color:#5c6a8e;font-size:12px}#deathfx .df-note::after{content:"_";animation:dfBlink 1s steps(1) infinite}
@keyframes dfBlink{50%{opacity:0}}
@media(prefers-reduced-motion:reduce){#deathfx .df-big,#deathfx .df-win,#deathfx .df-veil{animation:none}}`;
  document.head.appendChild(css);
})();
function deathFxEl(){
  if (DEATHFX.el) return DEATHFX.el; const el = DEATHFX.el = document.createElement('div'); el.id = 'deathfx'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<div class="df-veil"></div><div class="df-win"><div class="df-title">▣ SYSTEM.EXE<i>×</i></div><div class="df-body"><span class="df-big">力盡</span><span class="df-sub">YOU DIED</span><div class="df-count">復活倒數<b id="df-n">3</b>秒</div><div class="df-bar"><i id="df-fill"></i></div><div class="df-note">重新開機中</div></div></div>';
  document.body.appendChild(el); return el;
}
function deathFxUpdate(){
  const d = G.h.dead, D = DEATHFX;
  if (d > 0 && !G.offline) {
    const el = deathFxEl(), cv = typeof R3 !== 'undefined' && R3.rd ? R3.rd.domElement : document.getElementById('fig'), r = cv.getBoundingClientRect();
    if (!D.shown) { D.shown = true; D.total = Math.max(d, 3); D.sec = -1; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
    const n = Math.max(1, Math.ceil(d)); if (n !== D.sec) { D.sec = n; document.getElementById('df-n').textContent = n; el.setAttribute('aria-label', '你倒下了，' + n + ' 秒後復活'); }
    document.getElementById('df-fill').style.width = (Math.max(0, Math.min(1, 1 - d / D.total)) * 100).toFixed(1) + '%';
  } else if (D.shown) { D.shown = false; D.el?.classList.remove('on'); }
}
