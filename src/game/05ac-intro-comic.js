/* Portrait comic presentation; INTRO/INTRO_STORY remain the only progression/copy owners. */
const INTRO_COMIC={gesture:null};
function introComicRender(){
 const step=INTRO.step,[title,text]=INTRO_STORY[step],asset=INTRO_COMICS[step],o=$('ovl');
 document.body.classList.add('comic-screen-active');
 o.innerHTML=`<section class="comic-reader entry-surface" aria-label="${uxEsc(title)}"><nav class="comic-utility" aria-label="序章閱讀工具"><button type="button" class="comic-back" aria-label="${step?'上一頁':'返回封面'}" onclick="${step?'introStep(INTRO.step-1)':'introComicCover()'}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4l-6 6 6 6"/></svg></button><span class="comic-progress">0${step+1}／03</span><details class="comic-transcript"><summary tabindex="0">故事文字</summary><div class="comic-copy" tabindex="0" role="region" aria-label="故事文字"><h2>${uxEsc(title)}</h2><p id="comic-copy-${step}">${uxEsc(text)}</p></div></details><button type="button" class="comic-skip" aria-label="略過故事" onclick="introStep(3)">略過</button></nav><div class="comic-sheet"><img class="comic-art" src="${asset.src}" width="${asset.width}" height="${asset.height}" alt="${uxEsc(title)}，直幅漫畫分鏡" aria-describedby="comic-copy-${step}" draggable="false" onerror="introComicImageError(this)"><div class="comic-fallback" tabindex="0" role="region" aria-label="故事文字" hidden><h2>${uxEsc(title)}</h2><p>${uxEsc(text)}</p></div><button type="button" class="title-start comic-next" data-initial-focus onclick="introStep(INTRO.step+1)">${step===2?'選擇角色':'下一頁'}</button></div></section>`;
 const sheet=o.querySelector('.comic-sheet');
 sheet.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||!['touch','pen'].includes(e.pointerType)||e.target.closest('button,.comic-fallback'))return;
  INTRO_COMIC.gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};
  sheet.setPointerCapture(e.pointerId);
 });
 sheet.addEventListener('pointerup',e=>{
  const g=INTRO_COMIC.gesture;INTRO_COMIC.gesture=null;if(!g||g.id!==e.pointerId)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(performance.now()-g.time>750||Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*.4)return;
  if(dx<0)introStep(INTRO.step+1);else if(INTRO.step)introStep(INTRO.step-1);else introComicCover();
 });
 sheet.addEventListener('pointercancel',()=>{INTRO_COMIC.gesture=null;});
 uxOpenDialog(o,`序章 ${step+1}／3：${title}`,introEscape);
}
function introComicCover(){if(!INTRO.active)return;INTRO.cover=true;introRender();}
function introComicDispose(){INTRO_COMIC.gesture=null;document.body.classList.remove('comic-screen-active');}
function introComicImageError(image){const sheet=image.closest('.comic-sheet');if(!sheet)return;sheet.classList.add('comic-art-unavailable');sheet.querySelector('.comic-fallback').hidden=false;}
addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.isComposing||!INTRO.active||INTRO.cover||INTRO.step>=3||e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('.comic-transcript[open]'))return;
 if(e.key==='ArrowRight'){e.preventDefault();introStep(INTRO.step+1);}
 else if(e.key==='ArrowLeft'){e.preventDefault();if(INTRO.step)introStep(INTRO.step-1);else introComicCover();}
});
const INTRO_COMIC_CSS=`
/* Independent reader surface; never constrain the following character form. */
body.intro-active.comic-screen-active #ovl{padding:0!important;align-items:center!important;overflow:hidden!important;background:#191919!important;max-height:none}
body.intro-active.comic-screen-active #ovl>.comic-reader{--comic-height:min(900px,calc(100vh - 112px));--comic-height:min(900px,calc(100dvh - 112px));position:relative;flex:none;width:min(100vw,calc(var(--comic-height)*.562799));aspect-ratio:941/1672;margin:0;isolation:isolate}
.comic-sheet{position:relative;width:100%;height:100%;background:#fff9df;touch-action:pan-y pinch-zoom;animation:comic-arrive 200ms ease-out both}
.comic-art{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;user-select:none}
.comic-utility{position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);width:max(100%,280px);display:flex;align-items:center;gap:6px;height:44px;color:#e5edfc;font:12px/1.5 var(--ux-body);z-index:3}
.comic-progress{flex:1;white-space:nowrap;letter-spacing:.08em}
/* These quiet reader controls are intentionally outside the silver window skin. */
body.ui-material #ovl .comic-utility button,.comic-transcript summary{box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:8px;border:0;border-radius:0;background:transparent!important;color:#e5edfc!important;box-shadow:none!important;font:12px/1.5 var(--ux-body);font-weight:400;white-space:nowrap;cursor:pointer;touch-action:manipulation;list-style:none}
.comic-transcript summary::-webkit-details-marker{display:none}
.comic-transcript summary::after{content:'＋';margin-left:4px}
.comic-transcript[open] summary::after{content:'−'}
.comic-back svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:square}
body.ui-material #ovl .comic-utility button:focus-visible,.comic-transcript summary:focus-visible{outline:2px solid #e5edfc!important;outline-offset:-4px}
@media(hover:hover){body.ui-material #ovl .comic-utility button:hover,.comic-transcript summary:hover{background:#303d68!important;filter:none;outline:none}}
body.ui-material #ovl .comic-utility button:active,.comic-transcript summary:active{background:#303d68!important}
.comic-copy{position:absolute;top:48px;left:0;right:0;max-height:min(55dvh,420px);overflow:auto;overscroll-behavior:contain;padding:16px 20px;border:2px solid #8d9db9;background:#fff9df;color:#142c57;box-shadow:0 4px 0 #0004;font:16px/1.7 var(--ux-body)}
.comic-copy h2,.comic-fallback h2{font-size:20px;font-weight:400;line-height:1.5;margin:0 0 12px}.comic-copy p,.comic-fallback p{margin:0}
body.ui-material #ovl .comic-next{position:absolute;right:5%;bottom:4%;max-width:90%;z-index:1}
.comic-fallback{position:absolute;inset:8% 7% 18%;overflow:auto;color:#142c57;font:16px/1.7 var(--ux-body)}
.comic-fallback[hidden]{display:none}.comic-art-unavailable .comic-art{visibility:hidden}
@keyframes comic-arrive{from{opacity:.55}to{opacity:1}}
@media(max-height:500px){body.intro-active.comic-screen-active #ovl>.comic-reader{--comic-height:calc(100vh - 100px);--comic-height:calc(100dvh - 100px)}body.ui-material #ovl .comic-next{right:4%;bottom:3%;padding:6px 8px;font-size:14px;min-height:44px}.comic-utility{gap:0}.comic-progress{font-size:10px;letter-spacing:0}.comic-transcript summary{font-size:10px;padding:4px}.comic-copy{padding:12px;font-size:14px}}
@media(prefers-reduced-motion:reduce){.comic-sheet{animation:none!important}}
body.reduced-effects .comic-sheet{animation:none!important}
@media(forced-colors:active){body.ui-material #ovl .comic-utility button,.comic-transcript summary{color:ButtonText!important;background:Canvas!important}.comic-copy,.comic-fallback{color:CanvasText;background:Canvas;border-color:CanvasText}}
`;
{const s=document.createElement('style');s.textContent=INTRO_COMIC_CSS;document.head.appendChild(s);}
