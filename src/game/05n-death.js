/* ---------- 倒下畫面：戰場上方的「死亡」大字與復活倒數（不擋操作、不暫停掛機） ---------- */
const DEATHFX = { el:null, shown:false, sec:-1, total:3, hideT:0 };
(function(){
  const css = document.createElement('style'); css.textContent = `
#deathfx{position:fixed;z-index:12;pointer-events:none;display:none;align-items:center;justify-content:center;overflow:hidden;font-family:"Cubic 11",system-ui,sans-serif;user-select:none}
#deathfx.on{display:flex}
#deathfx .df-veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#2a1f5c00 0,#2a1f5c88 55%,#120c33dd 100%),repeating-linear-gradient(0deg,#0000 0 2px,#00000030 2px 3px);backdrop-filter:grayscale(.55) brightness(.78) blur(.6px);-webkit-backdrop-filter:grayscale(.55) brightness(.78);animation:dfVeil .5s ease-out both}
@keyframes dfVeil{from{opacity:0}}
#deathfx .df-win{position:relative;width:min(86%,330px);background:#e9eefb;border:2px solid #fff;outline:1px solid #4b5aa8;box-shadow:4px 4px 0 #120c3399,0 0 0 4px #ff8fc844;animation:dfPop .45s steps(6,end) both}
@keyframes dfPop{0%{transform:scale(.3,.05);opacity:0}60%{transform:scale(1.06,1.02);opacity:1}100%{transform:none}}
#deathfx .df-title{display:flex;align-items:center;gap:6px;padding:3px 6px;background:linear-gradient(90deg,#5a1a4a,#c84a8a 60%,#ff9ad0);color:#fff;font-size:12px;letter-spacing:.06em;text-shadow:0 1px 0 #3a0a2a}
#deathfx .df-title i{margin-left:auto;font-style:normal;width:16px;height:14px;line-height:12px;text-align:center;background:#c8d0e4;color:#555;border:1px solid;border-color:#fff #555 #555 #fff;font-size:12px}
#deathfx .df-body{padding:10px 12px 12px;text-align:center;background:linear-gradient(#f4f6ff,#d9e0f4)}
#deathfx .df-big{display:block;font-size:clamp(48px,11vw,76px);line-height:1.05;letter-spacing:.12em;padding-left:.12em;color:transparent;background:linear-gradient(#fff 0,#e8eaff 38%,#b9c2ee 50%,#f6c4e6 52%,#ff9ad0 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(1px 0 0 #3b2a7a) drop-shadow(-1px 0 0 #3b2a7a) drop-shadow(0 1px 0 #3b2a7a) drop-shadow(0 -1px 0 #3b2a7a) drop-shadow(2px 3px 0 #ff5fa8) drop-shadow(4px 6px 0 #3b2a7a66);animation:dfGlitch 2.4s steps(1) infinite}
@keyframes dfGlitch{0%,86%,100%{transform:none}88%{transform:translate(-3px,0) skewX(-6deg)}90%{transform:translate(3px,1px)}92%{transform:translate(-1px,-1px) skewX(4deg)}}
#deathfx .df-sub{display:block;margin:2px 0 8px;color:#6a4a9a;font-size:12px;letter-spacing:.3em}
#deathfx .df-count{display:flex;align-items:baseline;justify-content:center;gap:8px;color:#3b2a7a;font-size:15px}
#deathfx .df-count b{display:inline-block;min-width:1.2em;font-size:34px;line-height:1;color:#c01868;text-shadow:2px 2px 0 #fff,3px 3px 0 #3b2a7a55;font-variant-numeric:tabular-nums}
#deathfx .df-bar{position:relative;height:14px;margin:8px 0 2px;background:#12203a;border:1px solid #6d788a;border-radius:7px;overflow:hidden;box-shadow:inset 0 2px 3px #000a}
#deathfx .df-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:repeating-linear-gradient(90deg,#ffc2d4 0 5px,#ff5a8a 5px 8px)}
#deathfx .df-note{margin-top:4px;color:#6a4a9a;font-size:12px}#deathfx .df-note::after{content:"_";animation:dfBlink 1s steps(1) infinite}
@keyframes dfBlink{50%{opacity:0}}
@media(prefers-reduced-motion:reduce){#deathfx .df-big,#deathfx .df-win,#deathfx .df-veil{animation:none}}`;
  document.head.appendChild(css);
})();
function deathFxEl(){
  if (DEATHFX.el) return DEATHFX.el; const el = DEATHFX.el = document.createElement('div'); el.id = 'deathfx'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<div class="df-veil"></div><div class="df-win"><div class="df-title">▣ SYSTEM.EXE<i>×</i></div><div class="df-body"><span class="df-big">死亡</span><span class="df-sub">GAME OVER?</span><div class="df-count">復活倒數<b id="df-n">3</b>秒</div><div class="df-bar"><i id="df-fill"></i></div><div class="df-note">重新開機中</div></div></div>';
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
