/* Title presentation: a full-screen mosaic scene; INTRO remains the sole story/save owner. */
const INTRO_TITLE={timer:0};
function introCoverRender(){
 const o=$('ovl');introLogoDispose();document.body.classList.add('title-screen-active');
 o.innerHTML=`<section class="intro-title entry-surface" aria-label="Hello, Static! 哈囉，雜訊！"><div class="title-scene" aria-hidden="true"><img class="title-art" src="${PIXEL_ART.bg}" width="${PIXEL_ART.bgW}" height="${PIXEL_ART.bgH}" alt="" draggable="false"><i class="title-cloud c1"></i><i class="title-cloud c2"></i><i class="title-star s1"></i><i class="title-star s2"></i><i class="title-star s3"></i><i class="title-star s4"></i><span class="title-radio-light"></span><span class="title-coast-light"></span></div><i class="title-scan" aria-hidden="true"></i><h1 class="title-wordmark" aria-hidden="true"><img src="${PIXEL_ART.logo}" width="${PIXEL_ART.logoW}" height="${PIXEL_ART.logoH}" alt="" draggable="false"></h1><span class="title-hint" aria-hidden="true">點擊畫面開始</span><button type="button" class="title-start" data-initial-focus aria-label="開始遊戲" onclick="introTitleStart()"></button>${introCancelButton()}</section>`;
 uxOpenDialog(o,'Hello, Static! 哈囉，雜訊！',introEscape);introPersist();
}
function introTitleStart(){
 if(!INTRO.active||!INTRO.cover||INTRO_TITLE.timer)return;
 const button=$('ovl').querySelector('.title-start');if(button)button.disabled=true;
 if(typeof SFX==='function')SFX('card');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||GAME_VIEW.prefs.reducedEffects){introStep(0);return;}
 $('ovl').querySelector('.intro-title')?.classList.add('is-leaving');
 INTRO_TITLE.timer=setTimeout(()=>{INTRO_TITLE.timer=0;if(INTRO.active&&INTRO.cover)introStep(0);},320);
}
/* Existing intro lifecycle hook, now without a WebGL renderer. */
function introLogoDispose(){if(typeof introComicDispose==='function')introComicDispose();clearTimeout(INTRO_TITLE.timer);INTRO_TITLE.timer=0;document.body.classList.remove('title-screen-active');}
addEventListener('pagehide',introLogoDispose);
addEventListener('pageshow',event=>{if(event.persisted&&INTRO.active&&INTRO.cover)introCoverRender();});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('title-screen-paused',document.hidden));
const INTRO_TITLE_CSS=`
/* Full-viewport surface outside the silver dialog shell. One mosaic block = one source pixel of the scene. */
body.intro-active.title-screen-active #ovl{padding:0!important;align-items:center!important;overflow:hidden!important;background:#3a4f9a!important;max-height:none}
.entry-surface{--title-ink:#142c57;--title-key:#e5edfc;--title-edge:#8d9db9}
body.intro-active.title-screen-active #ovl>.intro-title{--u:max(calc(100vw / 157),calc(100vh / 279));--u:max(calc(100vw / 157),calc(100dvh / 279));position:relative;isolation:isolate;flex:none;width:100vw;height:100vh;height:100dvh;min-height:0;margin:0;overflow:hidden;background:#3a4f9a;animation:title-arrive 360ms steps(4,end) both}
.title-scene{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:calc(var(--u) * 157);height:calc(var(--u) * 279);pointer-events:none}
.title-art{display:block;width:100%;height:100%;image-rendering:pixelated;user-select:none}
.title-radio-light,.title-coast-light{position:absolute;pointer-events:none;animation:title-signal 3s steps(1,end) infinite}
.title-radio-light{left:30.71%;top:72.79%;width:1.17%;height:.54%;background:#c6e96c}
.title-coast-light{left:91.3%;top:60.1%;width:.25%;height:.2%;background:#ffe6a1;animation-delay:1.5s}
/* Blocky clouds and stars drift in whole-block steps so they stay on the mosaic grid. */
.title-cloud{position:absolute;display:block;width:calc(var(--u) * 7);height:calc(var(--u) * 2);background:#e7ecff;opacity:.85;box-shadow:calc(var(--u) * 2) calc(var(--u) * -1) #e7ecff,calc(var(--u) * 4) calc(var(--u) * -1) #e7ecff,calc(var(--u) * 9) calc(var(--u) * 1) #e7ecff;animation:title-drift 36s steps(60,end) infinite}
.title-cloud.c1{left:-12%;top:30%}.title-cloud.c2{left:-40%;top:46%;animation-duration:54s;animation-delay:-20s;opacity:.65}
.title-star{position:absolute;display:block;width:calc(var(--u) * 1);height:calc(var(--u) * 1);background:#fff;animation:title-twinkle 2.4s steps(1,end) infinite}
.title-star.s1{left:18%;top:8%}.title-star.s2{left:71%;top:14%;animation-delay:.7s}.title-star.s3{left:44%;top:5%;animation-delay:1.3s}.title-star.s4{left:88%;top:26%;animation-delay:.3s}
.title-scan{position:absolute;left:0;right:0;top:0;height:calc(var(--u) * 1);background:#fff;opacity:.16;pointer-events:none;animation:title-sweep 5.5s steps(48,end) infinite}
.title-wordmark{position:absolute;top:max(15%,env(safe-area-inset-top));left:50%;width:min(88vw,calc(var(--u) * 134));margin:0;line-height:0;transform:translateX(-50%);animation:title-logo-arrive 520ms steps(6,end) 80ms both}
.title-wordmark img{display:block;width:100%;height:auto;image-rendering:pixelated;user-select:none;animation:title-bob 2.2s steps(1,end) infinite}
.title-hint{position:absolute;left:0;right:0;bottom:max(12%,calc(env(safe-area-inset-bottom) + 24px));text-align:center;color:#fff;font:20px/1.2 var(--ux-display);letter-spacing:.14em;text-shadow:2px 2px 0 #142c57,-2px 2px 0 #142c57,2px -2px 0 #142c57,-2px -2px 0 #142c57;pointer-events:none;animation:title-blink 1.2s steps(1,end) infinite}
/* The whole screen is the start key; the generic game control skin must not paint it. */
body.ui-material #ovl .title-start,body.ui-material #ovl .title-start:enabled:hover,body.ui-material #ovl .title-start:enabled:active,body.ui-material #ovl .title-start:focus-visible{filter:none!important;outline:none!important;position:absolute;inset:0;width:100%;height:100%;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:transparent!important;box-shadow:none!important;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
body.ui-material #ovl .title-start:disabled{cursor:default}
.intro-title.is-leaving{animation:title-leave 320ms steps(5,end) both}
body.title-screen-active #ovl .intro-title.is-leaving{pointer-events:none}
body.title-screen-paused .intro-title *,body.reduced-effects #ovl .intro-title,body.reduced-effects #ovl .intro-title *{animation:none!important;transition:none!important}
@keyframes title-arrive{from{opacity:0}to{opacity:1}}
@keyframes title-leave{0%{filter:none;opacity:1}40%{filter:brightness(2.4) contrast(.6);opacity:1}100%{filter:brightness(3) contrast(.4);opacity:0}}
@keyframes title-logo-arrive{from{opacity:0;margin-top:calc(var(--u) * -6)}to{opacity:1;margin-top:0}}
@keyframes title-bob{0%,100%{transform:none}50%{transform:translateY(calc(var(--u) * -1))}}
@keyframes title-signal{0%,12%,24%,100%{opacity:.95}6%,18%{opacity:.3}}
@keyframes title-drift{from{transform:translateX(0)}to{transform:translateX(calc(var(--u) * 220))}}
@keyframes title-twinkle{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes title-sweep{from{transform:translateY(0)}to{transform:translateY(100vh);transform:translateY(100dvh)}}
@keyframes title-blink{0%,60%{opacity:1}61%,100%{opacity:.25}}
@media(min-aspect-ratio:1/1){.title-scene{bottom:auto;top:calc(62vh - var(--u) * 176);top:calc(62dvh - var(--u) * 176)}}
@media(max-height:500px){.title-wordmark{top:9%;width:min(60vw,calc(var(--u) * 100))}.title-hint{font-size:16px;bottom:max(7%,env(safe-area-inset-bottom))}}
@media(prefers-reduced-motion:reduce){body.title-screen-active #ovl .intro-title,body.title-screen-active #ovl .intro-title *{animation:none!important;transition:none!important}}
@media(forced-colors:active){.title-radio-light,.title-coast-light,.title-scan{display:none}.title-hint{color:CanvasText;text-shadow:none}}
`;
{const s=document.createElement('style');s.textContent=INTRO_TITLE_CSS;document.head.appendChild(s);}
