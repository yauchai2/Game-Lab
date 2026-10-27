/* Four-class entry presentation. INTRO, CHARS and introBegin own drafts/rules/creation. */
const INTRO_CAST_ORDER=['street','frost','beep','volt'];
function introCareerRender(){
 const o=$('ovl'),id=INTRO.selected,c=CHARS[id],code=(c.model||id).toUpperCase();
 document.body.classList.add('career-screen-active');
 const polygon=key=>'polygon('+INTRO_CAST_ART.polygons[key].map(p=>p[0]+'% '+p[1]+'%').join(',')+')';
 o.innerHTML=`<section class="cs-screen entry-surface" aria-label="選擇角色"><div class="cs-top"><button type="button" class="cs-back" onclick="introStep(2)" aria-label="返回故事">← 返回故事</button><h1>選擇角色</h1></div><div class="cs-body"><div class="cs-cast"><div class="cs-stage" onpointerleave="introCareerPreview()"><img class="cs-group" src="${INTRO_CAST_ART.src}" width="${INTRO_CAST_ART.width}" height="${INTRO_CAST_ART.height}" alt="戰士、樂師、獵手和寵機師的四人合照" draggable="false" onerror="introCareerImageError(this)">${INTRO_CAST_ORDER.map(key=>`<img class="cs-layer ${id===key?'is-active':''}" data-layer="${key}" src="${INTRO_CAST_ART.layers[key]}" width="${INTRO_CAST_ART.width}" height="${INTRO_CAST_ART.height}" alt="" aria-hidden="true" draggable="false" onerror="this.closest('.cs-stage').classList.add('no-layers')">`).join('')}${['frost','street','beep','volt'].map(key=>`<button type="button" class="cs-hotspot" tabindex="-1" style="clip-path:${polygon(key)}" aria-label="從圖片選擇${uxEsc(CHARS[key].n)}" onpointerenter="introCareerPreview('${key}')" onclick="introChoose('${key}')"></button>`).join('')}<p class="cs-art-error" hidden>角色圖片暫時未能顯示。<br>仍可使用下方按鍵選擇。</p></div><p class="cs-hint">點選人物，或用下方職業按鍵</p><div class="cs-roles" role="group" aria-label="選擇職業" onkeydown="introCareerKeys(event)">${INTRO_CAST_ORDER.map(key=>`<button type="button" class="intro-choice cs-role" data-intro-char="${key}" aria-pressed="${id===key}" ${id===key?'data-initial-focus':''} onpointerenter="introCareerPreview('${key}')" onpointerleave="introCareerPreview()" onfocus="introCareerPreview('${key}')" onblur="introCareerPreview()" onclick="introChoose('${key}')"><span>${uxEsc(CHARS[key].n)}</span></button>`).join('')}</div></div><div class="cs-details"><div class="cs-identity"><div><span class="cs-code">${uxEsc(code)}</span><h2>${uxEsc(c.n)}</h2></div><span class="cs-title">${uxEsc(c.title)}</span></div><p class="cs-role-copy">${uxEsc(c.role)}</p><details class="cs-abilities"><summary tabindex="0">職業能力</summary><div><h3>${uxEsc(c.sig.n)}</h3><p>${uxEsc(c.sig.d)}</p><p>${uxEsc(c.passive)}</p></div></details><form class="cs-form" novalidate onsubmit="event.preventDefault();introBegin()"><label for="intro-name">玩家名稱 <span id="cs-name-help" class="cs-name-help">1 至 12 字</span></label><input id="intro-name" type="text" maxlength="12" autocomplete="nickname" value="${uxEsc(INTRO.name)}" placeholder="輸入你的名字" aria-describedby="cs-name-help intro-name-error" oninput="introCareerName(this)"><p id="intro-name-error" class="cs-error" role="alert"></p><div class="intro-pick cs-actions"><button type="submit" class="mb pri cs-begin">以${uxEsc(c.n)}開始冒險 <span aria-hidden="true">↗</span></button></div></form><p class="cs-footnote">職業創立後固定 · 每位角色獨立存檔</p>${PROFILE_SESSION.pending?'<button type="button" class="cs-cancel" onclick="introCareerCancel()">返回原角色</button>':''}</div></div></section>`;
 uxOpenDialog(o,'選擇角色',introEscape);
 o.querySelector('[data-initial-focus]')?.focus({preventScroll:true});
}
function introCareerPreview(id){
 const stage=document.querySelector('.cs-stage');if(!stage)return;
 const active=Object.hasOwn(CHARS,id)?id:INTRO.selected;
 for(const layer of stage.querySelectorAll('[data-layer]'))layer.classList.toggle('is-active',layer.dataset.layer===active);
 stage.dataset.active=active;
}
function introCareerKeys(e){
 if(e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
 const current=e.target.closest('[data-intro-char]');if(!current)return;
 let i=INTRO_CAST_ORDER.indexOf(current.dataset.introChar);
 if(['ArrowRight','ArrowDown'].includes(e.key))i=(i+1)%4;
 else if(['ArrowLeft','ArrowUp'].includes(e.key))i=(i+3)%4;
 else if(e.key==='Home')i=0;else if(e.key==='End')i=3;else return;
 e.preventDefault();introChoose(INTRO_CAST_ORDER[i]);
 document.querySelector(`.cs-role[data-intro-char="${INTRO_CAST_ORDER[i]}"]`)?.focus({preventScroll:true});
}
function introCareerName(input){
 INTRO.name=input.value;input.removeAttribute('aria-invalid');
 const error=document.getElementById('intro-name-error');if(error)error.textContent='';introPersist();
}
function introCareerImageError(image){const stage=image.closest('.cs-stage');if(!stage)return;stage.classList.add('is-unavailable');stage.querySelector('.cs-art-error').hidden=false;for(const b of stage.querySelectorAll('button'))b.disabled=true;}
function introCareerDispose(){document.body.classList.remove('career-screen-active');}
function introCareerCancel(){if(PROFILE_SESSION.pending){introCareerDispose();profileCancelNew();}}
addEventListener('pageshow',e=>{if(e.persisted&&INTRO.active&&!INTRO.cover&&INTRO.step===3)introCareerRender();});
const INTRO_CAREER_CSS=`
/* Character selection owns its scroll surface, leaving comic/title geometry untouched. */
body.intro-active.career-screen-active #ovl{padding:12px!important;align-items:center!important;background:#191919!important;overflow:auto!important}
body.intro-active.career-screen-active #ovl>.cs-screen{--cs-paper:#fff;--cs-blue:#303d9b;--cs-ink:#172751;position:relative;flex:none;width:min(920px,100%);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);margin:auto;padding:20px 24px;box-sizing:border-box;overflow:auto;overscroll-behavior:contain;background:var(--cs-paper);color:var(--cs-ink);font:16px/1.5 var(--ux-body);border:1px solid #c8cedc}
.cs-top{display:flex;align-items:center;justify-content:space-between;min-height:44px;gap:16px;margin-bottom:8px}
.cs-top h1{margin:0;font:20px/1.4 var(--ux-display);font-weight:400;white-space:nowrap}
body.ui-material #ovl .cs-screen .cs-back,body.ui-material #ovl .cs-screen .cs-cancel{min-height:44px;padding:6px 0;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0;color:#475778!important;font:14px/1.5 var(--ux-body);cursor:pointer}
.cs-body{display:grid;grid-template-columns:1.15fr 1fr;gap:32px;align-items:center}
.cs-cast{min-width:0}.cs-stage{position:relative;width:100%;aspect-ratio:192/231;isolation:isolate;overflow:visible;background:#fff}
.cs-group,.cs-layer{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:contain;image-rendering:pixelated;user-select:none;pointer-events:none}
.cs-group{filter:saturate(.35) brightness(.87)}
.cs-layer{opacity:0;transform:translateY(0);transition:opacity 140ms,transform 180ms;filter:brightness(1.04) drop-shadow(2px 0 #c5d9f3) drop-shadow(-2px 0 #c5d9f3)}
.cs-layer.is-active{opacity:1;transform:translateY(-3px);animation:cs-select 240ms ease-out both}
/* Contour buttons are pointer alternatives to the fully labeled keyboard/touch row. */
body.ui-material #ovl .cs-hotspot{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;min-height:0;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important;outline:none!important;filter:none!important;cursor:pointer;touch-action:manipulation}
.cs-hint{font-size:12px;text-align:center;color:#475778;margin:8px 0 10px}
.cs-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
body.ui-material #ovl .cs-roles .intro-choice{display:flex!important;align-items:center;justify-content:center;min-height:44px;padding:8px 2px!important;border:1px solid #bdc7db!important;border-radius:0;background:#f0f3fa!important;color:#172751!important;box-shadow:none!important;cursor:pointer}
body.ui-material #ovl .cs-roles .intro-choice[aria-pressed=true]{background:#303d9b!important;border-color:#303d9b!important;color:#fff!important;box-shadow:inset 0 -3px #171e60!important}
body.ui-material #ovl .cs-roles .intro-choice>span{font-size:14px!important;line-height:20px}
body.ui-material #ovl .cs-roles .intro-choice[aria-pressed=true]>span{color:#fff!important}
.cs-identity{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #dce2ed}
.cs-code{display:block;color:#475778;font-size:12px;letter-spacing:.16em}
body.ui-material #ovl .cs-identity h2{font-size:28px!important;font-weight:400;line-height:1.3;margin:4px 0 0}
.cs-title{font-size:14px;color:#475778;text-align:right}.cs-role-copy{margin:12px 0;font-size:14px;min-height:42px}
.cs-abilities{margin-bottom:20px;border-bottom:1px solid #dce2ed;padding-bottom:10px}
.cs-abilities summary{min-height:36px;cursor:pointer;font-size:14px}
.cs-abilities h3{font-size:16px;font-weight:400;margin:4px 0}.cs-abilities p{font-size:14px;margin:8px 0;color:#475778}
.cs-form{position:relative;display:grid;gap:6px}.cs-form label{display:flex;align-items:baseline;justify-content:space-between;font-size:14px}
body.ui-material #ovl .cs-form input{box-sizing:border-box;width:100%;height:48px;padding:10px 12px;border:1px solid #8d9db9!important;border-radius:0;background:#f7f9fe!important;color:#172751!important;box-shadow:inset 1px 1px #bdc7db!important;font:16px/1.5 var(--ux-body)}
body.ui-material #ovl .cs-form input[aria-invalid=true]{border-color:#b94732!important}
.cs-name-help{font-size:12px;color:#475778}.cs-error{font-size:14px;line-height:20px;min-height:20px;margin:0;color:#a53526}
body.ui-material #ovl .cs-screen .cs-begin{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:50px;padding:10px 16px;background:var(--ux-accent)!important;color:var(--ux-screen)!important;border:2px solid var(--ux-accent);border-radius:0;box-shadow:var(--ux-key-shadow);font:18px/1.4 var(--ux-display);font-weight:400;cursor:pointer;touch-action:manipulation}
.cs-footnote{font-size:12px;line-height:20px;color:#475778;margin:12px 0 0}
body.ui-material #ovl .cs-screen button:focus-visible,.cs-screen summary:focus-visible,.cs-screen input:focus-visible{outline:2px solid #1f3fb0!important;outline-offset:3px}
@media(hover:hover){body.ui-material #ovl .cs-roles button:not([aria-pressed=true]):hover{background:#e3e9f8!important}body.ui-material #ovl .cs-screen .cs-begin:hover{filter:brightness(1.06)}}
body.ui-material #ovl .cs-screen .cs-begin:active{box-shadow:var(--ux-inset)!important}
/* Keep entry copy compact despite the game's broad modal text-size rules. */
body.ui-material #ovl .cs-screen .cs-hint,body.ui-material #ovl .cs-screen .cs-name-help,body.ui-material #ovl .cs-screen .cs-footnote,body.ui-material #ovl .cs-screen .cs-code{font-size:12px!important;line-height:20px!important}
body.ui-material #ovl .cs-screen .cs-role-copy,body.ui-material #ovl .cs-screen .cs-title,body.ui-material #ovl .cs-screen .cs-form label,body.ui-material #ovl .cs-screen .cs-abilities summary{font-size:14px!important;line-height:22px!important}
body.ui-material #ovl .cs-screen .cs-error{font-size:14px!important;line-height:20px!important}
.cs-art-error{position:absolute;inset:40% 8% auto;text-align:center;font-size:14px;color:#475778}
.cs-art-error[hidden]{display:none}.cs-stage.is-unavailable .cs-group,.cs-stage.is-unavailable .cs-layer{display:none}.cs-stage.no-layers .cs-layer{display:none}.cs-stage.no-layers .cs-group{filter:none}
@keyframes cs-select{0%{transform:translateY(0)}55%{transform:translateY(-5px)}100%{transform:translateY(-3px)}}
@media(max-width:759px){body.intro-active.career-screen-active #ovl>.cs-screen{width:min(480px,100%);padding:14px 16px}.cs-body{grid-template-columns:1fr;gap:18px}.cs-stage{width:min(100%,calc(35dvh * 192 / 231));margin:0 auto}.cs-top{margin-bottom:0}.cs-top h1{font-size:18px}.cs-identity{padding-bottom:8px}.cs-role-copy{min-height:0;margin:8px 0}.cs-abilities{margin-bottom:12px;padding-bottom:4px}.cs-footnote{margin-top:10px}.cs-hint{margin:5px 0 8px}}
@media(max-height:620px) and (max-width:759px){.cs-stage{width:min(100%,calc(30dvh * 192 / 231))}.cs-body{gap:12px}.cs-top{min-height:36px}.cs-top h1{font-size:16px}}
@media(min-width:760px) and (max-height:620px){body.intro-active.career-screen-active #ovl>.cs-screen{padding:12px 20px}.cs-body{gap:24px;align-items:start}.cs-stage{width:min(100%,calc(57dvh * 192 / 231));margin:0 auto}}
@media(prefers-reduced-motion:reduce){.cs-screen *{animation:none!important;transition:none!important}.cs-layer.is-active{transform:none}}
body.reduced-effects .cs-screen *,body.title-screen-paused .cs-screen *{animation:none!important;transition:none!important}body.reduced-effects .cs-layer.is-active{transform:none}
@media(forced-colors:active){body.intro-active.career-screen-active #ovl>.cs-screen{background:Canvas;color:CanvasText}.cs-code,.cs-title,.cs-role-copy,.cs-hint,.cs-name-help,.cs-footnote{color:CanvasText}body.ui-material #ovl .cs-roles .intro-choice{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText!important}body.ui-material #ovl .cs-roles .intro-choice[aria-pressed=true]{background:Highlight!important;color:HighlightText!important}body.ui-material #ovl .cs-screen .cs-begin{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText}}
`;
{const s=document.createElement('style');s.textContent=INTRO_CAREER_CSS;document.head.appendChild(s);}

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
 // Authored scene identity owns mood; sky brightness is only a legacy fallback.
 const id=typeof ISLAND_SERIES!=='undefined'?ISLAND_SERIES.select()?.id:null;
 const theme={FI01:'drift',FI02:'drift',FI03:'underpass',FI04:'haze',FI05:'haze',FI06:'drift',FI07:'haze',FI08:'underpass',FI09:'underpass',FI10:'drift',FI11:'haze',FI12:'haze',FI13:'haze',FI14:'underpass',FI15:'underpass',FI16:'haze',FI17:'underpass',FI18:'drift',FT01:'underpass',FT02:'underpass',FT03:'underpass',FP01:'drift'}[id];if(theme)return theme;
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
