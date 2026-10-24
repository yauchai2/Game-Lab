/* ---------- 倒下畫面：戰場上方的「死亡」大字與復活倒數（不擋操作、不暫停掛機） ---------- */
const DEATHFX = { el:null, shown:false, sec:-1, total:3, hideT:0 };
(function(){
  const css=document.createElement('style');css.textContent=`#deathfx{position:fixed;z-index:12;pointer-events:none;display:none;align-items:center;justify-content:center;overflow:hidden}#deathfx.on{display:flex}#deathfx{pointer-events:none;font-family:"Cubic 11",system-ui,sans-serif}#deathfx .df-win{pointer-events:auto;width:min(90%,340px);box-shadow:var(--ux-bevel);border:2px solid var(--ux-edge);outline:0;animation:none}#deathfx .df-title{display:flex;align-items:center;justify-content:space-between;background:var(--ux-blue);color:var(--ux-screen);padding:8px 12px;font-size:14px;letter-spacing:0;border-bottom:1px solid var(--ux-edge)}#deathfx .df-title .mb{min-width:44px;min-height:44px;padding:2px;font-size:18px}#deathfx .df-body{background:var(--ux-screen);text-align:left;padding:12px}#deathfx .df-big{font-size:22px;color:var(--ux-ink);line-height:1.5;letter-spacing:0;padding:0;text-shadow:none;animation:none}#deathfx #df-cause{font-size:12px;line-height:1.5;color:var(--ux-muted)}#deathfx .df-count{justify-content:flex-start;font-size:13px}#deathfx .df-count b{font-size:24px;text-shadow:none}#deathfx .df-body .mb{min-height:44px;margin-top:8px}`;
  document.head.appendChild(css);
})();
function deathFxEl(){
 if(DEATHFX.el)return DEATHFX.el;const el=DEATHFX.el=document.createElement('section');el.id='deathfx';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.innerHTML='<div class="df-win"><div class="df-title"><span>重新連線中</span><button type="button" class="mb" aria-label="關閉死亡提示" onclick="deathDismiss()">×</button></div><div class="df-body"><span class="df-big">倒下了</span><p id="df-cause"></p><div class="df-count">復活倒數 <b id="df-n">3</b> 秒</div><div class="df-bar"><i id="df-fill"></i></div><button type="button" class="mb" onclick="showDeathSummary()">死亡總結</button></div></div>';document.body.appendChild(el);return el;
}
function deathFxUpdate(){
  const d = G.h.dead, D = DEATHFX;
  if (d > 0 && !G.offline&&G.time>=(D.dismissUntil||0)) {
    const el = deathFxEl(), cv = typeof R3 !== 'undefined' && R3.rd ? R3.rd.domElement : document.getElementById('fig'), r = cv.getBoundingClientRect();
    if (!D.shown) { D.shown = true; D.total = Math.max(d, 3); D.sec = -1; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
    const width=Math.min(340,innerWidth-24);el.style.left=Math.max(12,Math.min(innerWidth-width-12,r.width?r.left+(r.width-width)/2:(innerWidth-width)/2))+'px';el.style.top=Math.max(12,Math.min(innerHeight-260,r.top+12))+'px';el.style.width=width+'px';el.style.height='auto';
    const cause=document.getElementById('df-cause');if(cause)cause.textContent=G.deathReport?.cause||'承傷資料不足，可在總結查看。';
    const n = Math.max(1, Math.ceil(d)); if (n !== D.sec) { D.sec = n; document.getElementById('df-n').textContent = n; el.setAttribute('aria-label', '你倒下了，' + n + ' 秒後復活'); }
    document.getElementById('df-fill').style.width = (Math.max(0, Math.min(1, 1 - d / D.total)) * 100).toFixed(1) + '%';
  } else if (D.shown) { D.shown = false; D.el?.classList.remove('on'); }
}

function deathDismiss(){DEATHFX.dismissUntil=G.time+Math.max(.2,G.h.dead+.2);DEATHFX.shown=false;DEATHFX.el?.classList.remove('on');}
