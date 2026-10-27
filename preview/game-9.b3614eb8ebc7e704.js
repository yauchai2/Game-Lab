/* Title presentation: a full-screen mosaic scene; INTRO remains the sole story/save owner. */
const INTRO_TITLE={timer:0};
function introCoverRender(){
 const o=$('ovl');introLogoDispose();document.body.classList.add('title-screen-active');
 o.innerHTML=`<section class="intro-title entry-surface" aria-label="Hello, Static! 哈囉，雜訊！"><div class="title-scene" aria-hidden="true"><img class="title-art" src="${PIXEL_ART.bg}" width="${PIXEL_ART.bgW}" height="${PIXEL_ART.bgH}" alt="" draggable="false"><i class="title-cloud c1"></i><i class="title-cloud c2"></i><i class="title-star s1"></i><i class="title-star s2"></i><i class="title-star s3"></i><i class="title-star s4"></i><span class="title-radio-light"></span><span class="title-coast-light"></span></div><i class="title-scan" aria-hidden="true"></i><h1 class="title-wordmark" aria-hidden="true"><img src="${PIXEL_ART.logo}" width="${PIXEL_ART.logoW}" height="${PIXEL_ART.logoH}" alt="" draggable="false"></h1><span class="title-hint" aria-hidden="true">點擊畫面開始</span><button type="button" class="title-start" data-initial-focus aria-label="開始遊戲" onclick="introTitleStart()"></button></section>`;
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

;
/* Prologue: three full-screen cut-and-paste collages of mosaic panels. No text, no buttons:
   panels pop in one by one, a countdown turns the page, and a tap skips ahead. */
const INTRO_STAGE={timers:[],shown:0,count:0,tapReady:false};
/* Portrait: stacked cut-outs (k = width scale, dx = sideways nudge, r = tilt).
   Wide: scattered collage (cx/cy = centre, wf = width as a share of the screen). */
const INTRO_LAYOUT=[
 {bg:'#1d2f6f',pat:'stripe',tall:[{k:.96,dx:-.03,r:-2.2},{k:.8,dx:.06,r:2.6},{k:.9,dx:-.04,r:-1.6}],wide:[{cx:.24,cy:.42,wf:.32,r:-2.5},{cx:.70,cy:.24,wf:.44,r:2},{cx:.62,cy:.72,wf:.27,r:-1.5}]},
 {bg:'#a8324a',pat:'check',tall:[{k:.9,dx:.05,r:2.4},{k:.98,dx:-.04,r:-2},{k:.84,dx:.05,r:3}],wide:[{cx:.30,cy:.25,wf:.42,r:2},{cx:.72,cy:.58,wf:.42,r:-2},{cx:.26,cy:.73,wf:.27,r:-3}]},
 {bg:'#2b2f69',pat:'dusk',tall:[{k:.96,dx:-.03,r:-2.4},{k:.96,dx:.03,r:1.8}],wide:[{cx:.30,cy:.50,wf:.34,r:-2.5},{cx:.68,cy:.50,wf:.34,r:2}]}
];
const INTRO_STAGE_GAP=1600,INTRO_STAGE_HOLD=4200,INTRO_STAGE_FIRST=550;
/* One cue per panel, in story order: fan repair, ferry, radio shout / coins, runaway plug, pointing / handset, new street. */
const INTRO_STAGE_SFX=[['st_fan','st_horn','st_static'],['st_coin','st_skid','st_ding'],['st_chime','st_jingle']];
/* One short line under each panel; together they carry the story into character selection. */
const INTRO_CAPS=[['午後三點，小禾在修風扇。','阿澄的渡船剛靠岸。','電台突然自己開麥。'],['販賣機亂找零。','連拖板都跑掉了。','訊號跑去高架橋了。'],['先清前街，再揪出那個頻道。','穿好拖鞋，選你的職業。']];
const introCapFs=(W,H)=>Math.max(12,Math.min(20,Math.min(W,H*.9)*.045)),introCapH=fs=>fs*1.9;
function introStageClear(){for(const t of INTRO_STAGE.timers)clearTimeout(t);INTRO_STAGE.timers=[];}
function introStageLayout(){
 const stage=$('ovl')?.querySelector('.story-stage');if(!stage)return;
 const W=stage.clientWidth,H=stage.clientHeight,cuts=[...stage.querySelectorAll('.cut')],lay=INTRO_LAYOUT[INTRO.step],ar=cuts.map(c=>+c.dataset.w/+c.dataset.h),fs=introCapFs(W,H);
 const rects=[];
 if(W<H*.9){
  const base=Math.min(W*.94,H*.44),w=lay.tall.map((p,i)=>base*p.k),h=w.map((x,i)=>x/ar[i]+introCapH(fs)),gap=(H-h.reduce((a,b)=>a+b,0))/(cuts.length+1);let y=gap;
  cuts.forEach((c,i)=>{rects.push({x:W/2+lay.tall[i].dx*W-w[i]/2,y,w:w[i],r:lay.tall[i].r});y+=h[i]+gap;});
 }else cuts.forEach((c,i)=>{const p=lay.wide[i],w=Math.min(p.wf*W,H*.42*ar[i]),h=w/ar[i]+introCapH(fs);rects.push({x:p.cx*W-w/2,y:p.cy*H-h/2,w,r:p.r});});
 cuts.forEach((c,i)=>{const r=rects[i];c.style.cssText=`left:${r.x.toFixed(1)}px;top:${r.y.toFixed(1)}px;width:${r.w.toFixed(1)}px;--r:${r.r}deg;--pad:${Math.max(3,r.w*.022).toFixed(1)}px;--fs:${Math.min(fs,r.w/13.5).toFixed(1)}px;--fx:${i%2?'60vw':'-60vw'};--fy:${i%2?'-12vh':'12vh'}`;});
}
function introStageReveal(){$('ovl')?.querySelectorAll('.story-stage .cut').forEach(c=>c.classList.add('on','now'));}
function introStageNext(){
 if(!INTRO.active||INTRO.cover||INTRO.step>=3)return;
 if(INTRO_STAGE.shown<INTRO_STAGE.count){
  /* Tap while the collage is still building: finish it at once, then give the viewer a beat. */
  introStageClear();INTRO_STAGE.shown=INTRO_STAGE.count;introStageReveal();if(typeof SFX==='function')SFX('snap');
  INTRO_STAGE.timers.push(setTimeout(()=>introStep(INTRO.step+1),2400));introStageTimer(2400);return;
 }
 introStageClear();if(typeof SFX==='function')SFX('card');introStep(INTRO.step+1);
}
function introStageTimer(ms){const bar=$('ovl')?.querySelector('.story-timer i');if(!bar)return;bar.style.animation='none';void bar.offsetWidth;bar.style.animation=`story-timer ${ms}ms steps(16,end) forwards`;}
function introComicRender(){
 const step=INTRO.step,[title,text]=INTRO_STORY[step],pages=PIXEL_ART.pages[step],lay=INTRO_LAYOUT[step],o=$('ovl'),calm=matchMedia('(prefers-reduced-motion: reduce)').matches||GAME_VIEW.prefs.reducedEffects;
 introStageClear();document.body.classList.add('comic-screen-active');
 INTRO_STAGE.count=pages.length;INTRO_STAGE.shown=calm?pages.length:0;
 const bg=lay.pat==='dusk'?`<img class="story-dusk" src="${PIXEL_ART.bg}" alt="" draggable="false">`:'';
 o.innerHTML=`<section class="story-stage pat-${lay.pat}" style="--bg:${lay.bg}" role="group" aria-label="${uxEsc(title)}。${uxEsc(text)}">${bg}<div class="story-dots" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div>${pages.map((p,i)=>`<figure class="cut${calm?' on now':''}" data-w="${p.w}" data-h="${p.h}" aria-hidden="true"><img src="${p.src}" width="${p.w}" height="${p.h}" alt="" draggable="false"><figcaption>${uxEsc(INTRO_CAPS[step][i]||'')}</figcaption></figure>`).join('')}<div class="story-timer" aria-hidden="true"><i></i></div><button type="button" class="story-tap" data-initial-focus aria-label="${step<2?'下一頁':'選擇職業'}" onclick="introStageNext()"></button></section>`;
 introStageLayout();
 const hold=calm?INTRO_STAGE_HOLD+1800:INTRO_STAGE_HOLD,first=INTRO_STAGE_FIRST;
 if(!calm)pages.forEach((p,i)=>INTRO_STAGE.timers.push(setTimeout(()=>{const c=o.querySelectorAll('.cut')[i];if(!c)return;c.classList.add('on');INTRO_STAGE.shown=i+1;if(typeof SFX==='function')SFX(INTRO_STAGE_SFX[step]?.[i]||'snap');},first+i*INTRO_STAGE_GAP)));
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
.cut figcaption{margin-top:calc(var(--pad,4px) * 1.2);color:#3a2418;font:var(--fs,14px)/1.5 var(--ux-display);text-align:center;white-space:nowrap}
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

;
/* Ice Cream direction: inhabited neighborhoods, readable regional color layers.
   Presentation-only data; biome indices, terrain navigation, loot and saves stay canonical. */
const STREET_WORLD_PALETTES=[
 ['#B9D3A8','#93B481','#4C7965','#42BD75','#7ACD94'],
 ['#F2DBAB','#D2B279','#8D7659','#7EA26B','#B6C78B'],
 ['#E9F1F6','#BDCFDD','#718BA8','#74A6B6','#ADC9CF'],
 ['#BCB3B1','#897A7C','#4D4758','#B96149','#D18B62'],
 ['#8E9DBC','#657993','#364A64','#269BA9','#B982A7'],
 ['#C9D3D3','#99ACAD','#506B75','#4A9B8F','#A4C6B4'],
 ['#A8C6C9','#759CA8','#385C77','#4DA8B0','#8BC7C8'],
 ['#D1C5B2','#A89986','#5D6272','#D18B66','#ADAA8A'],
 ['#BFCCA8','#8DA77B','#4F6F62','#4A9E76','#93BD8E'],
 ['#C5CDDA','#97A6BC','#4C637E','#6A96B4','#B5CDD9'],
 ['#C3C5BA','#949F91','#506660','#61A385','#B7C6A3'],
 ['#CABDA6','#9C9382','#555B62','#648E89','#C4AD79']
];
BIOMES.forEach((b,i)=>{const p=STREET_WORLD_PALETTES[i%12];b.board={l:p[0],m:p[1],d:p[2]};b.t1=p[3];b.t2=p[4];});
// Main progression is owned by Claude's six STORY_CHAPTERS; no parallel chapter state.
const STREET_CHAPTERS=STORY_CHAPTERS;
STORY_CHAPTERS[4].text='小禾用找回的鑰匙打開舊發射機。它一直把「暑假最後一天」送到每個頻道；切回正確排程後，山路與商場終於能各自選台。';
STORY_CHAPTERS[5].text='大家帶著找回的失物到屋頂試音。各站輪流回覆，整條街的收音機又能各自選台；電台同伴在天線旁留下今天的節拍。';
const streetStories=[
 ['海風先收到的歌','渡船員 阿澄','阿澄把收音機掛在渡輪售票窗。今天開船提示比時刻表快了半拍，海邊幾台MD也跟著轉。先記下重播的那一句，別耽誤乘客上船。','器材安靜下來，售票窗傳回小禾的聲音：前街收到同一段歌，沿海纜再找找。'],
 ['送錯的山路班次','巡線員 阿嶺','山路便利店還開著，送貨車卻一趟趟繞回同一盞路燈。阿嶺留下一張寫著天線方向的便條，請你幫忙清出巡線路。','路燈恢復正常節奏。便條背面多了一筆：高架橋下的轉播箱，也在發出同樣的脈衝。'],
 ['河灣的午間廣播','渡船員 阿澄','河灣小攤在試播點餐廣播，音箱卻把報站和餐牌混在一起。阿澄先替客人指路，請你把失控音箱帶離候船區。','岸邊重新播出正確船班。小販把錯頻時間抄在紙上，託阿澄送到前街電台。'],
 ['橋下的修理清單','修理工 小禾','橋下修理攤排著電風扇和摺機。小禾沒有關掉全條街的電，只把異常線路圈出來，請你沿著會閃三下的接口追查。','拖板不再亂爬。接口裡傳出貨運站的呼號，清單上又找到一條能走的線。'],
 ['海岸轉播站','渡船員 阿澄','岸邊天線正替另一個街區轉播。訊息只剩半句「送往……」，速遞車卻已出發。先在平台上攔住它們，別讓包裹掉進海裡。','阿澄接回最後半句：送往港口，不是送往海岸。你把更正交給值班員，下一站便有了方向。'],
 ['前街還沒收工','鄰居廣播','唱片店在試新喇叭，藥房、洗衣店和修理攤都還有人。怪異節拍沿店面傳開，大家請你把器材引到空路面，留出回家的路。','商店恢復各自的聲音。唱片店借出一張空白MD，讓你錄下橋下、山路和港口的回覆。'],
 ['營地的接線桌','巡線員 阿嶺','營地不是避難所，而是大家週末搭帳篷的地方。阿嶺把巡線圖攤在桌上：高處幾盞修理燈正在替錯誤頻道接力。','修理燈回到工作位置。營友用短波機替你試音，這次港口值班員聽清了呼號。'],
 ['廣場的換帶時間','唱片店 阿夏','廣場每週都有交換唱片的小攤。今天攤主們收到同一份空白播放表，連分揀塔也把每個包裹掃成同一地址。','播放表背面印著轉播器編號。阿夏替它換上空白帶，留下乾淨的一段給你比對。'],
 ['風車旁的電源線','巡線員 阿嶺','風車替山路小店供電，燈仍亮著，頻道卻一直跳。阿嶺在檢查供電端，你負責讓亂跑的設備離開轉軸與路口。','供電沒問題，錯的是控制訊息。阿嶺把量測結果傳回小禾，請大家別再白白拆掉好好的機器。'],
 ['雪線上的值班回覆','高地值班員','高地轉播亭有人值班，熱水和維修燈都備好了。下山提示被雜訊蓋住，先清出亭前的器材，再讓值班員重新試播。','回程提示終於完整。值班員替空白MD補上這一站的錄音，託你帶回港口核對。'],
 ['石拱下的公共頻道','修理工 小禾','舊石拱現在是市民散步的地方，長椅旁裝了公共留言終端。外殼鬆開後，未登出的廣播排程一直重播；先讓附近的人安全通過。','終端停止重播。小禾找出那份被誤送到各站的排程，請你把最後一段回覆送回電台。'],
 ['貨運站的最後一箱','港口值班員','港口照常收貨，只是一批收音機被貼錯了配送順序。總掣、捲盤機和分揀塔正在重試同一道指令；你替值班員清出操作空間。','配送表更正完成，各站輪流回覆。前街電台終於播出新的開場：今天的歌，留給每一個幫忙接線的人。']
];
FIELD_STORIES.splice(0,FIELD_STORIES.length,...streetStories);
const streetNames={slime:'插頭跳豆',skel:'摺機巡訊者',brute:'錯址速遞車',drone:'MD滑翔盤',bomb:'過載存檔器',spider:'拖板爬蟲',speaker:'低頻箱蟹',wisp:'浮游MD',crab:'存檔游魂',ranger:'摺訊飛蛾',lantern:'補丁燈籠',mole:'地線拖板',golem:'總掣工頭'};
for(const row of MONSTER_GUIDE){if(streetNames[row[0]])row[1]=streetNames[row[0]];}
for(const [id,text]of Object.entries({street:'每天巡街修電，也替小店接好試音的延長線。今天第一次遇上會自己逃走的拖板。',frost:'唱片店換帶時間的常客，能從走調的廣播裡聽出重複節拍。這次想讓整條街各自的聲音回來。',beep:'熟記店家、班車與送貨路線，靠摺機和通訊器追查錯送的訊息。出發前總會先回覆鄰居。',volt:'把舊寵機修成可靠的小幫手，常替修理攤試零件。希望每一台被修好的設備都有地方回去。'}))CHARACTER_PROFILES[id].story[0]=text;
// Update the same profile objects already copied into CHARS, without touching combat fields.
for(const [id,p]of Object.entries(CHARACTER_PROFILES))CHARS[id].story=p.story;
const STREET_WORLD_CSS=`body.street-style::before{display:none!important}body.street-style .intro-logo-stage{background:linear-gradient(#40b7e7 0 64%,#d7e9d8 64% 100%)}body.street-style .intro-title-body{background:#e7e9f7}body.street-style .intro-scene-title{color:#172751}body.street-style .field-entry p{line-height:1.75}.street-chapter{padding:10px;border-left:4px solid #259bb5;background:#e7eaf5;color:#172751}.street-chapter b{display:block;margin-bottom:5px}`;
{const style=document.createElement('style');style.textContent=STREET_WORLD_CSS;document.head.appendChild(style);document.body.classList.toggle('street-style',g1On());}
function streetChapterHtml(){const i=storyChapter(),c=STORY_CHAPTERS[i];if(!c)return '<div class="street-chapter"><b>六章主線 · 各站已恢復</b><p>各處的地方留言仍可繼續收錄，失物已歸還，電台留著今晚的節目。</p></div>';const route=G.run?'回到街區討伐首領，接續這段主線。':G.depth<c.depth?'沿街探索至深度 '+c.depth+'，再追查首領。':'本段首領：'+c.boss+'。';return `<div class="street-chapter"><b>第${i+1}章 · ${uxEsc(c.title)}</b><p>${uxEsc(c.contact||'街角電台')}：${uxEsc(c.request||c.item)}</p><p>${uxEsc(c.lead||'沿訊號繼續追查。')}</p><span>${uxEsc(route)}</span></div>`;}

function streetMusicTrack(){
 if(typeof INTRO!=='undefined'&&INTRO.active)return 'radio';
 if(G.mons?.some(m=>m.boss&&!m.dead))return 'boss';
 if(G.mons?.some(m=>m.elite&&!m.dead))return 'rush';
 if(G.run?.tower)return 'underpass';
 if([5,9,12,13,16,17].includes(biomeNow()))return 'underpass';
 const sky=BIOMES[biomeNow()]?.sky?.[0]||'#3aa6ea',c=new T3.Color(sky);
 return c.r+c.g+c.b<.35?'haze':'drift';
}

;
/* Inhabited local scenes. Terrain owns placement/collision, existing storyFlags
   owns progress; these stations introduce no quest collectibles or save fields. */
const STREET_NEIGHBORHOODS=[
 {name:'海風候船口',site:'候船人的收音機',activity:'候船長椅旁留著船班表和收音機，阿澄正替下一班乘客核對提示。',kind:'ferry'},
 {name:'山路便利店',site:'路邊補給桌',activity:'送貨籃、保溫壺與巡線便條放在同一張桌上，店員仍替經過的人留著燈。',kind:'supply'},
 {name:'河灣渡口',site:'河灣點餐亭',activity:'候船區的小攤照常備餐，外送箱與售票機正在分開各自的廣播。',kind:'kiosk'},
 {name:'橋下修理坪',site:'小禾的修理桌',activity:'摺機、風扇和幾段電纜等著維修；小禾只隔離錯頻接口，沒有停掉整條街的電。',kind:'repair'},
 {name:'海岸轉播台',site:'值班轉播桌',activity:'值班員把速遞箱排回正確次序，一台收音機正替港口試播呼號。',kind:'relay'},
 {name:'前街唱片巷',site:'街角試音攤',activity:'唱片、空白MD與杯子留在試音桌上，洗衣店和唱片店還沒有收工。',kind:'records'},
 {name:'山麓週末營地',site:'營友的接線桌',activity:'保溫壺和短波機放在野餐桌上，營友一面收帳篷，一面替巡線員試音。',kind:'camp'},
 {name:'廣場換帶市集',site:'交換唱片攤',activity:'大家把唱片裝進不同顏色的收納箱，留下一卷空白帶比對錯送的播放表。',kind:'exchange'},
 {name:'風車巡線站',site:'供電量測點',activity:'線轆、工具箱和量測器都已備妥，燈仍亮著，巡線員在確認真正出錯的是哪一段訊息。',kind:'power'},
 {name:'雪線值班亭',site:'熱水與試播桌',activity:'值班亭外備有熱水、杯子與維修燈，準備把完整的下山提示再播一遍。',kind:'warm'},
 {name:'石拱散步道',site:'公共留言終端',activity:'長椅朝向公共留言終端；散步的人暫時繞開鬆動的機殼，等小禾接好最後一條線。',kind:'terminal'},
 {name:'港口收貨坪',site:'值班員的派送台',activity:'收音機、配送箱與手推車排在操作台旁，港口照常收貨，值班員正在更正配送順序。',kind:'dispatch'}
];
function neighborhoodSitePlan(p){
 const radius=6,ideal=p.clearRadius+18;let best=null,bestScore=Infinity;
 for(const c of p.groundCells){
  const distance=Math.hypot(c.x-HX,c.y-HY);if(distance<p.clearRadius+radius+6||distance>p.clearRadius+42)continue;
  if(Math.hypot((c.x-HX)/p.w,(c.y-HY)/p.h)>.78)continue;
  if(p.landmarks.some(o=>Math.hypot(o.x-c.x,o.y-c.y)<o.radius+radius+7))continue;
  const samples=[[-6,-6],[6,-6],[-6,6],[6,6],[0,0]],heights=[];let valid=true;
  for(const [dx,dy]of samples){const x=c.x+dx,y=c.y+dy,i=Math.floor((x-p.ox)/p.cell),j=Math.floor((y-p.oy)/p.cell);if(i<0||i>=p.nx||j<0||j>=p.ny||!p.lookup.has(j*p.nx+i)){valid=false;break;}heights.push(terrainHeight(x,y,p));}
  if(!valid)continue;const slope=Math.max(...heights)-Math.min(...heights);if(slope>3)continue;
  const score=slope*8+Math.abs(distance-ideal)+terrainHash(p.key+':site:'+c.k)%100/1000;
  if(score<bestScore){bestScore=score;best={x:c.x,y:c.y,radius,kind:'worksite',scale:1,variant:p.profile,rotation:c.y<HY?0:Math.PI,siteSlope:slope};}
 }
 return best;
}
function buildNeighborhoodSite(profile){
 const site=STREET_NEIGHBORHOODS[profile],g=new T3.Group(),dark=m3('#30434D'),metal=m3('#B5C2C4'),wood=m3('#B19A73'),paper=m3('#E4DFCA'),blue=m3('#5B9DAF'),warm=m3('#D6A24F');
 const box=(w,h,d,mat,x=0,y=0,z=0)=>mk(new T3.BoxGeometry(w,h,d),mat,x,y,z,g);
 const cyl=(r,h,mat,x,y,z,n=8)=>mk(new T3.CylinderGeometry(r,r,h,n),mat,x,y,z,g);
 function table(){box(8,.45,4.2,wood,0,3.5,0);for(const x of[-3.2,3.2])for(const z of[-1.5,1.5])box(.4,3.5,.4,dark,x,1.7,z);}
 function radio(x=0,y=4.4,z=0){box(2.4,1.5,.9,blue,x,y,z);box(1,.4,.13,paper,x-.4,y+.2,z+.5);cyl(.42,.14,dark,x+.65,y-.15,z+.51).rotation.x=Math.PI/2;box(.10,1.4,.10,metal,x+.85,y+1.2,z);}
 function cup(x,z){cyl(.34,.65,paper,x,4.05,z);cyl(.25,.05,dark,x,4.40,z);}
 function crate(x,z,y=1,color=warm){box(2.6,2,2.5,color,x,y,z);box(.4,2.08,2.6,paper,x,y,z);}
 function bench(){box(6,.4,2,wood,-.5,1.6,2.6);box(6,1.6,.3,wood,-.5,2.5,3.45);for(const x of[-2.7,1.7])box(.35,1.6,1.8,dark,x,.8,2.6);}
 function board(x=4.6){box(.35,6,.35,dark,x,3,-1.6);box(2.3,2,.3,blue,x,5.2,-1.6);box(1.5,.25,.1,paper,x,5.5,-1.4);box(1.1,.25,.1,paper,x-.2,4.9,-1.4);}
 function reel(x,y,z){for(const dz of[-.35,.35]){const o=cyl(1.05,.18,metal,x,y,z+dz);o.rotation.x=Math.PI/2;}const o=cyl(.60,.7,dark,x,y,z);o.rotation.x=Math.PI/2;}
 const kind=site.kind;
 if(kind==='ferry'){bench();board();radio(-2,3.5,3.5);const ring=mk(new T3.TorusGeometry(.9,.22,4,10),warm,3,1.5,2.6,g);box(2.1,.15,1.4,paper,-1,1.95,2.7);}
 else if(kind==='kiosk'){box(6,3.5,3.3,blue,0,1.75,0);box(7.4,.35,4.2,paper,0,3.7,0);radio(-1.3,4.6,0);box(1.5,.2,1,paper,1.4,3.98,.7);crate(4,1.5);board(-4.3);}
 else if(kind==='terminal'){bench();box(2.8,5,1.7,metal,3,2.5,-.8);box(2.1,1.6,.2,dark,3,3.7,.15);box(1.3,.25,.15,blue,2.8,3.9,.3);box(1.5,.2,.4,dark,3,2.3,.3);}
 else{
  table();radio(-2,4.5,-.5);cup(2.3,1);
  if(['records','exchange'].includes(kind)){for(const x of[-3,1]){crate(x,3);for(let i=0;i<3;i++){const disc=cyl(.8,.12,i%2?blue:dark,x,2.3+i*.18,3);disc.rotation.z=.2;}}box(2,.18,1.4,paper,.5,3.85,0);}
  if(['repair','power'].includes(kind)){box(2.4,.8,1.3,blue,.8,4,-.4);box(1.5,.1,.5,metal,.8,4.45,-.3);reel(-3,1.2,3);box(1.7,.25,.8,metal,-.5,3.9,1);}
  if(['relay','dispatch'].includes(kind)){crate(-3,3);crate(1,3);crate(1,3,3,blue);box(1.8,.12,1.7,paper,.6,3.85,-.4);board();}
  if(['camp','warm','supply'].includes(kind)){cyl(.55,1.6,metal,.6,4.5,-.3);cyl(.6,.2,dark,.6,5.4,-.3);cup(2.8,0);box(2.5,1.8,2,blue,-3,1,3);if(kind==='warm'){box(.35,5.5,.35,dark,-4.4,2.75,-1);box(1.8,.6,1,paper,-4.4,5.6,-1);}}
 }
 g.userData.neighborhoodSite=site.kind;return g;
}
// Extend the existing six chapter records: no new progression owner or gates.
[
 {contact:'唱片店 阿夏',request:'撿回天線零件，查出前街一直重播試音的原因。',lead:'走音喇叭不肯收聲，先讓它閉嘴。',text:'喇叭倒地，天線零件滾到腳邊。阿夏用唱片套擦了擦，說：「試音每次都夾一聲車鈴，這是暗號，不是故障。」旁邊的貓懶得理。',radio:'前街接通。下一站：橋下，找小禾。'},
 {contact:'修理工 小禾',request:'找回腳踏車鈴，拆掉橋墩旁的回音接口。',lead:'鈴聲是線索，回音柱才是問題。',text:'回音柱一倒，車鈴叮一聲，剛好掉進小禾手裡。她把接口掰回正確頻道，雜訊裡冒出一串餐牌：夜市在叫人。',radio:'橋下有回應。下一站：夜市。'},
 {contact:'夜市老闆娘',request:'取回店裡的收音機，讓點餐和報站各歸各位。',lead:'招牌跑出來亂喊，抓住它。',text:'招牌被按回原位，老闆娘一把搶回收音機，先替排隊的客人叫號。錯頻錄音還剩半句月台提示，她寫在餐牌背面：「拿去給站務員。」',radio:'夜市開火。下一站：車站與河邊。'},
 {contact:'河邊站務員',request:'找回麥克風，把月台與轉播的排程對上。',lead:'廣播在循環，切掉它，讓末班車開走。',text:'麥克風還燙手。站務員清清喉嚨，重新報站，末班車準點進月台。那段重播不是現場，是山上舊發射機的排程。小禾已經扛著工具出發。',radio:'月台恢復報站。下一站：山路電塔與商場地下。'},
 {contact:'修理工 小禾',request:'拿鑰匙，改掉把試音送往全街的排程。',lead:'別斷電，店還要開，只改指令。',text:'鑰匙一轉，發射機吐出真相：「暑假最後一天」只是沒人撤下的試音標題，旁邊還睡著一隻貓。小禾不拔電，只逐站改排程。最後要屋頂電台點名確認。',radio:'重播排程已改。回屋頂，最後點名。'},
 {contact:'街角電台的大家',request:'完成最後一輪試音，每一站各自選台。',lead:'不必同一首歌，每一站都要被聽見。',text:'天線零件上架，車鈴、收音機、麥克風、鑰匙各回原主。屋頂開麥輪流試音：候船、點餐、報站、晚間節目，各播各的，誰也沒蓋過誰。小收音機留下一張貼紙，當作簽名。',radio:'全站在線。街區各有各的歌，慢慢走回家。'}
].forEach((note,i)=>Object.assign(STORY_CHAPTERS[i],note));
function neighborhoodJournalHtml(){
 const p=terrainNow();if(G.run?.tower||G.train||!g1On())return '';
 const site=STREET_NEIGHBORHOODS[p.profile];return `<div class="street-chapter"><b>${uxEsc(site.name)} · ${uxEsc(site.site)}</b><p>${uxEsc(site.activity)}</p></div>`;
}
