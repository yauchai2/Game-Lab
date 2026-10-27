/* Title presentation: a responsive cover from original artwork; INTRO remains the sole story/save owner. */
const INTRO_TITLE={timer:0};
function introCoverRender(){
 const o=$('ovl');introLogoDispose();document.body.classList.add('title-screen-active');
 o.innerHTML=`<section class="intro-title entry-surface entry-cover" aria-label="Hello, Static! 哈囉，雜訊！"><picture class="title-scene cover-picture" aria-hidden="true"><source media="(min-aspect-ratio:1/1)" srcset="${PIXEL_ART.wide}"><img class="title-art cover-art" src="${PIXEL_ART.bg}" width="${PIXEL_ART.bgW}" height="${PIXEL_ART.bgH}" alt="" draggable="false"></picture><h1 class="title-wordmark cover-brand" aria-hidden="true"><img src="${PIXEL_ART.logo}" width="${PIXEL_ART.logoW}" height="${PIXEL_ART.logoH}" alt="" draggable="false"></h1><span class="title-hint cover-hint" aria-hidden="true">點擊畫面開始</span><button type="button" class="title-start" data-initial-focus aria-label="開始遊戲" onclick="introTitleStart()"></button></section>`;
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
function introLogoDispose(){if(typeof introCareerDispose==='function')introCareerDispose();if(typeof introComicDispose==='function')introComicDispose();clearTimeout(INTRO_TITLE.timer);INTRO_TITLE.timer=0;document.body.classList.remove('title-screen-active');}
addEventListener('pagehide',introLogoDispose);
addEventListener('pageshow',event=>{if(event.persisted&&INTRO.active&&INTRO.cover)introCoverRender();});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('title-screen-paused',document.hidden));
const INTRO_TITLE_CSS=`
body.intro-active.title-screen-active #ovl{padding:0!important;align-items:center!important;overflow:hidden!important;background:#efff50!important;max-height:none}
body.intro-active.title-screen-active #ovl>.intro-title{flex:none;min-height:0;margin:0;animation:title-arrive 240ms ease-out both}
body.ui-material #ovl .title-start,body.ui-material #ovl .title-start:enabled:hover,body.ui-material #ovl .title-start:enabled:active,body.ui-material #ovl .title-start:focus-visible{filter:none!important;position:absolute;inset:0;width:100%;height:100%;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:transparent!important;box-shadow:none!important;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
body.ui-material #ovl .title-start:focus-visible{outline:none!important}
body.ui-material #ovl .title-start:disabled{cursor:default}
.intro-title:has(.title-start:focus-visible) .title-hint{outline:3px solid #101a3c;outline-offset:4px}
.intro-title:has(.title-start:enabled:hover) .title-hint{background:#101a3c;color:#efff50}
.intro-title:has(.title-start:enabled:active) .title-hint{transform:translateX(-50%) translateY(2px)}
.intro-title.is-leaving{animation:title-leave 320ms ease-out both!important;pointer-events:none}
body.title-screen-paused .intro-title *,body.reduced-effects #ovl .intro-title,body.reduced-effects #ovl .intro-title *{animation:none!important;transition:none!important}
@keyframes title-arrive{from{opacity:0}to{opacity:1}}
@keyframes title-leave{from{opacity:1}to{opacity:0}}
@media(min-aspect-ratio:1/1){.intro-title:has(.title-start:enabled:active) .title-hint{transform:translateY(2px)}}
@media(prefers-reduced-motion:reduce){body.title-screen-active #ovl .intro-title,body.title-screen-active #ovl .intro-title *{animation:none!important;transition:none!important}}
@media(forced-colors:active){.intro-title:has(.title-start:focus-visible) .title-hint{outline-color:Highlight!important}}
`;
{const s=document.createElement('style');s.textContent=INTRO_TITLE_CSS;document.head.appendChild(s);}
