/* Title presentation; INTRO remains the sole story/save owner. */
const INTRO_TITLE={timer:0};
function introCoverRender(){
 const o=$('ovl');introLogoDispose();document.body.classList.add('title-screen-active');
 o.innerHTML=`<section class="intro-title entry-surface" aria-label="Hello, Static! 哈囉，雜訊！"><div class="title-scene" aria-hidden="true"><img class="title-art" src="${TITLE_SCREEN.background}" width="941" height="1672" alt="" draggable="false" fetchpriority="high"><span class="title-radio-light"></span><span class="title-coast-light"></span></div><h1 class="title-wordmark"><img src="${ASSET.logo}" width="${TITLE_SCREEN.logoWidth}" height="${TITLE_SCREEN.logoHeight}" alt="Hello, Static! 哈囉，雜訊！" draggable="false" fetchpriority="high"></h1><div class="title-actions"><button type="button" class="title-start" data-initial-focus onclick="introTitleStart()"><span>開始遊戲</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg></button></div></section>`;
 uxOpenDialog(o,'Hello, Static! 哈囉，雜訊！',introEscape);introPersist();
}
function introTitleStart(){
 if(!INTRO.active||!INTRO.cover||INTRO_TITLE.timer)return;
 const button=$('ovl').querySelector('.title-start');if(button)button.disabled=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||GAME_VIEW.prefs.reducedEffects){introStep(0);return;}
 $('ovl').querySelector('.intro-title')?.classList.add('is-leaving');
 INTRO_TITLE.timer=setTimeout(()=>{INTRO_TITLE.timer=0;if(INTRO.active&&INTRO.cover)introStep(0);},220);
}
/* Existing intro lifecycle hook, now without a WebGL renderer. */
function introLogoDispose(){if(typeof introComicDispose==='function')introComicDispose();clearTimeout(INTRO_TITLE.timer);INTRO_TITLE.timer=0;document.body.classList.remove('title-screen-active');}
addEventListener('pagehide',introLogoDispose);
addEventListener('pageshow',event=>{if(event.persisted&&INTRO.active&&INTRO.cover)introCoverRender();});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('title-screen-paused',document.hidden));
const INTRO_TITLE_CSS=`
/* Full-viewport brand surface outside the silver dialog shell. */
body.intro-active.title-screen-active #ovl{padding:0!important;align-items:center!important;overflow:hidden!important;background:#191919!important;max-height:none}
.entry-surface{--title-ink:#142c57;--title-key:#e5edfc;--title-edge:#8d9db9}
body.intro-active.title-screen-active #ovl>.intro-title{position:relative;isolation:isolate;flex:none;width:min(100vw,56.25vh);width:min(100vw,56.25dvh);height:100vh;height:100dvh;min-height:0;margin:0;overflow:hidden;background:#4e77d0;animation:title-arrive 600ms ease-out both;transition:opacity 220ms ease}
/* Artwork and decorative lights share coordinates even when narrow phones crop the sides. */
.title-scene{position:absolute;top:0;left:50%;transform:translateX(-50%);width:max(100%,56.28vh);width:max(100%,56.28dvh);height:100%;pointer-events:none}
.title-art{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;user-select:none}
.title-radio-light,.title-coast-light{position:absolute;pointer-events:none;animation:title-signal 6s steps(1,end) infinite}
.title-radio-light{left:30.71%;top:72.79%;width:1.17%;height:.54%;background:#c6e96c}
.title-coast-light{left:91.3%;top:60.1%;width:.25%;height:.2%;background:#ffe6a1;animation-delay:1.5s}
.title-wordmark{position:absolute;top:max(15.8%,env(safe-area-inset-top));left:9%;width:82%;margin:0;line-height:0;animation:title-logo-arrive 700ms 80ms ease-out both}
.title-wordmark img{display:block;width:100%;height:auto;user-select:none}
.title-actions{position:absolute;bottom:max(11.6%,calc(env(safe-area-inset-bottom) + 20px));left:0;right:0;display:flex;justify-content:center;padding:0 16px}
/* Specificity and important values isolate this key from the generic game control skin. */
body.ui-material #ovl .title-start{display:inline-flex;align-items:center;justify-content:center;gap:12px;width:auto;max-width:100%;min-height:48px;padding:9px 18px;border:2px solid var(--title-edge);border-radius:0;background:var(--title-key)!important;color:var(--title-ink)!important;box-shadow:inset 2px 2px #fff,inset -2px -2px #b0bfd5,3px 3px 0 #20386480;font:20px/1.2 var(--ux-display);font-weight:400;letter-spacing:.06em;cursor:pointer;touch-action:manipulation;transition:background 120ms,box-shadow 120ms}
.title-start svg{width:12px;height:12px;flex:none;fill:currentColor}
body.ui-material #ovl .title-start:focus-visible{outline:2px solid #fff!important;outline-offset:3px}
@media(hover:hover){body.ui-material #ovl .title-start:not(:disabled):hover{background:#fff!important;filter:none;outline:2px solid #d2e8ff;outline-offset:3px}}
body.ui-material #ovl .title-start:not(:disabled):active{background:#cbdaf0!important;box-shadow:inset 2px 2px #9eafcc,inset -2px -2px #fff!important;filter:none}
body.ui-material #ovl .title-start:disabled{cursor:default}
.intro-title.is-leaving{opacity:0}
body.title-screen-active #ovl .intro-title.is-leaving{pointer-events:none}
body.title-screen-paused .intro-title *,body.reduced-effects #ovl .intro-title,body.reduced-effects #ovl .intro-title *{animation:none!important;transition:none!important}
@keyframes title-arrive{from{opacity:0}to{opacity:1}}
@keyframes title-logo-arrive{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes title-signal{0%,12%,24%,100%{opacity:.9}6%,18%{opacity:.35}}
@media(max-aspect-ratio:1/2) and (min-height:501px){.title-wordmark{top:max(18%,env(safe-area-inset-top))}}
@media(max-height:500px){body.ui-material #ovl .title-start{font-size:16px;min-height:44px;padding:7px 10px;gap:8px}.title-wordmark{top:14%;left:5%;width:90%}.title-actions{bottom:max(8%,env(safe-area-inset-bottom))}}
@media(prefers-reduced-motion:reduce){body.title-screen-active #ovl .intro-title,body.title-screen-active #ovl .intro-title *{animation:none!important;transition:none!important}}
@media(forced-colors:active){body.ui-material #ovl .title-start{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText;box-shadow:none}.title-radio-light,.title-coast-light{display:none}}
`;
{const s=document.createElement('style');s.textContent=INTRO_TITLE_CSS;document.head.appendChild(s);}
