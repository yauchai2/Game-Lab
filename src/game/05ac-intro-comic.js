/* Prologue: three full-screen cut-and-paste collages of mosaic panels. No text, no buttons:
   panels pop in one by one, a countdown turns the page, and a tap skips ahead. */
const INTRO_STAGE={timers:[],shown:0,count:0,tapReady:false};
/* Portrait: stacked cut-outs (k = width scale, dx = sideways nudge, r = tilt).
   Wide: scattered collage (cx/cy = centre, wf = width as a share of the screen). */
const INTRO_LAYOUT=[
 {bg:'#1d2f6f',pat:'stripe',tall:[{k:.96,dx:-.03,r:-2.2},{k:.8,dx:.06,r:2.6},{k:.9,dx:-.04,r:-1.6}],wide:[{cx:.24,cy:.42,wf:.32,r:-2.5},{cx:.70,cy:.28,wf:.46,r:2},{cx:.60,cy:.72,wf:.32,r:-1.5}]},
 {bg:'#a8324a',pat:'check',tall:[{k:.9,dx:.05,r:2.4},{k:.98,dx:-.04,r:-2},{k:.84,dx:.05,r:3}],wide:[{cx:.30,cy:.30,wf:.44,r:2},{cx:.70,cy:.56,wf:.46,r:-2},{cx:.26,cy:.74,wf:.32,r:-3}]},
 {bg:'#2b2f69',pat:'dusk',tall:[{k:.96,dx:-.03,r:-2.4},{k:.96,dx:.03,r:1.8}],wide:[{cx:.30,cy:.50,wf:.34,r:-2.5},{cx:.68,cy:.50,wf:.34,r:2}]}
];
const INTRO_STAGE_GAP=820,INTRO_STAGE_HOLD=2600;
function introStageClear(){for(const t of INTRO_STAGE.timers)clearTimeout(t);INTRO_STAGE.timers=[];}
function introStageLayout(){
 const stage=$('ovl')?.querySelector('.story-stage');if(!stage)return;
 const W=stage.clientWidth,H=stage.clientHeight,cuts=[...stage.querySelectorAll('.cut')],lay=INTRO_LAYOUT[INTRO.step],ar=cuts.map(c=>+c.dataset.w/+c.dataset.h);
 const rects=[];
 if(W<H*.9){
  const base=Math.min(W*.94,H*.5),w=lay.tall.map((p,i)=>base*p.k),h=w.map((x,i)=>x/ar[i]),gap=(H-h.reduce((a,b)=>a+b,0))/(cuts.length+1);let y=gap;
  cuts.forEach((c,i)=>{rects.push({x:W/2+lay.tall[i].dx*W-w[i]/2,y,w:w[i],r:lay.tall[i].r});y+=h[i]+gap;});
 }else cuts.forEach((c,i)=>{const p=lay.wide[i],w=Math.min(p.wf*W,H*.56*ar[i]),h=w/ar[i];rects.push({x:p.cx*W-w/2,y:p.cy*H-h/2,w,r:p.r});});
 cuts.forEach((c,i)=>{const r=rects[i];c.style.cssText=`left:${r.x.toFixed(1)}px;top:${r.y.toFixed(1)}px;width:${r.w.toFixed(1)}px;--r:${r.r}deg;--pad:${Math.max(3,r.w*.022).toFixed(1)}px;--fx:${i%2?'60vw':'-60vw'};--fy:${i%2?'-12vh':'12vh'}`;});
}
function introStageReveal(){$('ovl')?.querySelectorAll('.story-stage .cut').forEach(c=>c.classList.add('on','now'));}
function introStageNext(){
 if(!INTRO.active||INTRO.cover||INTRO.step>=3)return;
 if(INTRO_STAGE.shown<INTRO_STAGE.count){
  /* Tap while the collage is still building: finish it at once, then give the viewer a beat. */
  introStageClear();INTRO_STAGE.shown=INTRO_STAGE.count;introStageReveal();if(typeof SFX==='function')SFX('snap');
  INTRO_STAGE.timers.push(setTimeout(()=>introStep(INTRO.step+1),INTRO_STAGE_HOLD));introStageTimer(INTRO_STAGE_HOLD);return;
 }
 introStageClear();if(typeof SFX==='function')SFX('card');introStep(INTRO.step+1);
}
function introStageTimer(ms){const bar=$('ovl')?.querySelector('.story-timer i');if(!bar)return;bar.style.animation='none';void bar.offsetWidth;bar.style.animation=`story-timer ${ms}ms steps(16,end) forwards`;}
function introComicRender(){
 const step=INTRO.step,[title,text]=INTRO_STORY[step],pages=PIXEL_ART.pages[step],lay=INTRO_LAYOUT[step],o=$('ovl'),calm=matchMedia('(prefers-reduced-motion: reduce)').matches||GAME_VIEW.prefs.reducedEffects;
 introStageClear();document.body.classList.add('comic-screen-active');
 INTRO_STAGE.count=pages.length;INTRO_STAGE.shown=calm?pages.length:0;
 const bg=lay.pat==='dusk'?`<img class="story-dusk" src="${PIXEL_ART.bg}" alt="" draggable="false">`:'';
 o.innerHTML=`<section class="story-stage pat-${lay.pat}" style="--bg:${lay.bg}" role="group" aria-label="${uxEsc(title)}。${uxEsc(text)}">${bg}<div class="story-dots" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div>${pages.map((p,i)=>`<figure class="cut${calm?' on now':''}" data-w="${p.w}" data-h="${p.h}" aria-hidden="true"><img src="${p.src}" width="${p.w}" height="${p.h}" alt="" draggable="false"></figure>`).join('')}<div class="story-timer" aria-hidden="true"><i></i></div><button type="button" class="story-tap" data-initial-focus aria-label="${step<2?'下一頁':'選擇職業'}" onclick="introStageNext()"></button></section>`;
 introStageLayout();
 const hold=calm?INTRO_STAGE_HOLD+1800:INTRO_STAGE_HOLD,first=260;
 if(!calm)pages.forEach((p,i)=>INTRO_STAGE.timers.push(setTimeout(()=>{const c=o.querySelectorAll('.cut')[i];if(!c)return;c.classList.add('on');INTRO_STAGE.shown=i+1;if(typeof SFX==='function')SFX(i%2?'snap':'card');},first+i*INTRO_STAGE_GAP)));
 const total=(calm?0:first+(pages.length-1)*INTRO_STAGE_GAP)+hold;
 INTRO_STAGE.timers.push(setTimeout(()=>{if(INTRO.active&&!INTRO.cover&&INTRO.step===step&&INTRO_STAGE.shown>=INTRO_STAGE.count)introStep(step+1);},total));
 introStageTimer(total);
 uxOpenDialog(o,`序章 ${step+1}／3`,introEscape);
}
function introComicCover(){if(!INTRO.active)return;INTRO.cover=true;introRender();}
function introComicDispose(){introStageClear();document.body.classList.remove('comic-screen-active');}
addEventListener('resize',()=>{if(INTRO.active&&!INTRO.cover&&INTRO.step<3)introStageLayout();});
addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.isComposing||!INTRO.active||INTRO.cover||INTRO.step>=3||e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if(e.key==='ArrowRight'){e.preventDefault();introStageNext();}
 else if(e.key==='ArrowLeft'){e.preventDefault();if(INTRO.step)introStep(INTRO.step-1);else introComicCover();}
});
const INTRO_COMIC_CSS=`
/* A full-screen surface; the character form that follows keeps its own shell. */
body.intro-active.comic-screen-active #ovl{padding:0!important;align-items:center!important;overflow:hidden!important;background:#101428!important;max-height:none}
body.intro-active.comic-screen-active #ovl>.story-stage{position:relative;flex:none;width:100vw;height:100vh;height:100dvh;margin:0;overflow:hidden;background:var(--bg,#1d2f6f);isolation:isolate;animation:story-in 300ms steps(4,end) both}
/* Backdrops are built from whole blocks so they read as the same mosaic as the panels. */
.story-stage.pat-stripe{background-image:repeating-linear-gradient(135deg,#ffffff14 0 24px,#0000 24px 48px)}
.story-stage.pat-check{background-image:conic-gradient(#ffffff12 25%,#0000 0 50%,#ffffff12 0 75%,#0000 0);background-size:56px 56px}
.story-dusk{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 78%;image-rendering:pixelated;filter:brightness(.55) saturate(1.1);user-select:none}
.story-dots{position:absolute;top:max(14px,env(safe-area-inset-top));left:0;right:0;display:flex;justify-content:center;gap:10px;z-index:3;pointer-events:none}
.story-dots i{width:10px;height:10px;background:#ffffff40;box-shadow:2px 2px 0 #0006}.story-dots i.on{background:#fff}
.cut{position:absolute;margin:0;padding:var(--pad,4px);background:#fff9df;box-shadow:calc(var(--pad,4px) * 1.4) calc(var(--pad,4px) * 1.4) 0 #0007;transform:rotate(var(--r,0deg));visibility:hidden;pointer-events:none;z-index:1}
.cut::before{content:'';position:absolute;top:calc(var(--pad,4px) * -3);left:50%;width:calc(var(--pad,4px) * 9);height:calc(var(--pad,4px) * 4);margin-left:calc(var(--pad,4px) * -4.5);background:#ffe27acc;transform:rotate(-4deg);box-shadow:0 0 0 1px #0002}
.cut:nth-of-type(even)::before{transform:rotate(5deg);left:22%}
.cut img{display:block;width:100%;height:auto;image-rendering:pixelated;user-select:none}
.cut.on{visibility:visible;animation:cut-pop 380ms steps(6,end) both}
.cut.on.now{animation:none}
.story-timer{position:absolute;left:0;right:0;bottom:0;height:8px;background:#0006;z-index:3;pointer-events:none}
.story-timer i{display:block;height:100%;width:100%;background:#fff;transform-origin:0 50%;transform:scaleX(0)}
body.ui-material #ovl .story-tap,body.ui-material #ovl .story-tap:enabled:hover,body.ui-material #ovl .story-tap:enabled:active,body.ui-material #ovl .story-tap:focus-visible{filter:none!important;outline:none!important;position:absolute;inset:0;width:100%;height:100%;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:transparent!important;box-shadow:none!important;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;z-index:4}
@keyframes story-in{from{filter:brightness(2.4) contrast(.5)}to{filter:none}}
@keyframes cut-pop{from{transform:translate(var(--fx,0),var(--fy,0)) rotate(calc(var(--r,0deg) * 5)) scale(.45)}60%{transform:translate(0,0) rotate(calc(var(--r,0deg) * -1.4)) scale(1.06)}to{transform:rotate(var(--r,0deg)) scale(1)}}
@keyframes story-timer{from{transform:scaleX(0)}to{transform:scaleX(1)}}
body.reduced-effects .story-stage,body.reduced-effects .story-stage *{animation:none!important}body.reduced-effects .story-timer i{transform:none}
@media(prefers-reduced-motion:reduce){.story-stage,.story-stage *{animation:none!important}.story-timer i{transform:none}}
@media(forced-colors:active){.cut{background:Canvas;forced-color-adjust:none}}
`;
{const s=document.createElement('style');s.textContent=INTRO_COMIC_CSS;document.head.appendChild(s);}
