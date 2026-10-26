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
function streetChapterHtml(){const i=storyChapter(),chapter=STORY_CHAPTERS[i];return `<div class="street-chapter"><b>${chapter?'第'+(i+1)+'章・'+uxEsc(chapter.title):'六章主線・廣播已恢復'}</b><span>${chapter?'追查下一段訊號，找回'+uxEsc(chapter.item)+'。':'各處的地方留言仍可繼續收錄。'}</span></div>`;}

function streetMusicTrack(){
 if(typeof INTRO!=='undefined'&&INTRO.active)return 'drift';
 if(G.mons?.some(m=>m.boss&&!m.dead))return 'rush';
 if(G.run?.tower)return 'haze';
 const sky=BIOMES[biomeNow()]?.sky?.[0]||'#3aa6ea',c=new T3.Color(sky);
 return c.r+c.g+c.b<.35?'haze':'drift';
}
