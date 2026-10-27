/* Supplied logo, bounded web derivative; one transient title renderer. */
const INTRO_LOGO={view:null,paused:false};
function introCoverRender(){const o=$('ovl');introLogoDispose();o.innerHTML=`<div class="mbox intro-shell intro-title"><div class="title-label"><span>IDLE HERO</span><span>RADIO／07</span></div><div id="intro-logo-stage" class="intro-logo-stage" role="img" aria-label="Idle Hero立體標誌"><img src="${LOGO_3D.poster||''}" alt="Idle Hero" class="intro-logo-poster"><div class="logo-orbit" aria-hidden="true"></div></div><div class="intro-title-body"><p>街角電台，今天也準時開播。</p><button type="button" class="mb pri title-start" data-initial-focus onclick="introStep(0)">開始遊戲</button><div class="title-options"><button type="button" class="mb" onclick="introStep(3)">略過故事</button></div></div></div>`;uxOpenDialog(o,'Idle Hero',introEscape);introLogoMount(document.getElementById('intro-logo-stage'));introPersist();}
function introLogoModel(){const bytes=Uint8Array.from(atob(LOGO_3D.glb),c=>c.charCodeAt(0)),dv=new DataView(bytes.buffer);if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw Error('Invalid logo model');const n=dv.getUint32(12,true),d=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n))),base=28+n;const p=d.meshes[0].primitives[0],g=new T3.BufferGeometry(),width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array};const read=i=>{const a=d.accessors[i],v=d.bufferViews[a.bufferView],Type=types[a.componentType],size=width[a.type],out=new Type(a.count*size),stride=v.byteStride||size*Type.BYTES_PER_ELEMENT,start=base+(v.byteOffset||0)+(a.byteOffset||0);for(let k=0;k<a.count;k++)out.set(new Type(bytes.buffer.slice(start+k*stride,start+k*stride+size*Type.BYTES_PER_ELEMENT)),k*size);return new T3.BufferAttribute(out,size,a.normalized===true)};for(const [key,name]of[['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']])if(p.attributes[key]!==undefined)g.setAttribute(name,read(p.attributes[key]));g.setIndex(read(p.indices));g.computeBoundingBox();const mesh=new T3.Mesh(g,new T3.MeshStandardMaterial({roughness:.5,metalness:.16,side:T3.DoubleSide}));const node=d.nodes.find(x=>x.mesh===0);if(node?.rotation)mesh.quaternion.fromArray(node.rotation);if(node?.scale)mesh.scale.fromArray(node.scale);if(node?.translation)mesh.position.fromArray(node.translation);mesh.updateMatrixWorld();const box=new T3.Box3().setFromObject(mesh),center=box.getCenter(new T3.Vector3()),size=box.getSize(new T3.Vector3()),group=new T3.Group();mesh.position.sub(center);group.add(mesh);group.scale.setScalar(2/Math.max(size.x,size.y,size.z));const textures=[],urls=[];const texture=(index,srgb)=>{const image=d.images[d.textures[index].source??d.textures[index].extensions.EXT_texture_webp.source],v=d.bufferViews[image.bufferView],url=URL.createObjectURL(new Blob([bytes.subarray(base+(v.byteOffset||0),base+(v.byteOffset||0)+v.byteLength)],{type:image.mimeType}));urls.push(url);const t=new T3.Texture();t.flipY=false;if(srgb)t.colorSpace=T3.SRGBColorSpace;t.minFilter=T3.LinearMipmapLinearFilter;t.magFilter=T3.LinearFilter;const img=new Image();img.onload=()=>{t.image=img;t.needsUpdate=true};img.src=url;textures.push(t);return t};const material=d.materials[p.material].pbrMetallicRoughness;if(material.baseColorTexture)mesh.material.map=texture(material.baseColorTexture.index,true);if(material.metallicRoughnessTexture){const t=texture(material.metallicRoughnessTexture.index,false);mesh.material.roughnessMap=t;mesh.material.metalnessMap=t;}return{group,mesh,textures,urls};}
function introLogoMount(el){introLogoDispose();if(!el)return;let model,rd;try{model=introLogoModel();rd=new T3.WebGLRenderer({antialias:false,alpha:true,powerPreference:'low-power'});rd.setPixelRatio(1);rd.setSize(320,180,false);rd.setClearColor('#17233f',0);rd.outputColorSpace=T3.SRGBColorSpace;const sc=new T3.Scene(),cam=new T3.OrthographicCamera(-1.25,1.25,.703125,-.703125,.1,20);cam.position.set(0,.08,4);cam.lookAt(0,0,0);sc.add(new T3.HemisphereLight('#e8f5ff','#536198',2));const key=new T3.DirectionalLight('#ffffff',3);key.position.set(-2,3,4);sc.add(key);const rim=new T3.DirectionalLight('#75cfff',2);rim.position.set(3,0,-2);sc.add(rim);sc.add(model.group);const cv=rd.domElement;cv.className='intro-logo-canvas';cv.setAttribute('aria-hidden','true');el.appendChild(cv);const v={el,rd,sc,cam,...model,last:performance.now(),draw:0,angle:-.12,raf:0,frames:0};INTRO_LOGO.view=v;INTRO_LOGO.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;const frame=now=>{if(INTRO_LOGO.view!==v)return;if(!el.isConnected||(el.dataset.always&&!el.offsetWidth)||(!el.dataset.always&&(!INTRO.active||!INTRO.cover))){introLogoDispose();return;}const dt=Math.min(.1,Math.max(0,(now-v.last)/1000));v.last=now;if(!document.hidden){if(!INTRO_LOGO.paused)v.angle+=dt*Math.PI/6;if(now-v.draw>=1000/24&&(!INTRO_LOGO.paused||!el.classList.contains('logo-ready'))){v.group.rotation.y=v.angle;rd.render(sc,cam);v.draw=now;v.frames++;if(v.textures.every(t=>t.image?.complete))el.classList.add('logo-ready');}}v.raf=requestAnimationFrame(frame);};frame(performance.now());}catch(e){if(model){model.mesh.geometry.dispose();model.mesh.material.dispose();for(const t of model.textures)t.dispose();for(const u of model.urls)URL.revokeObjectURL(u);}if(rd){rd.dispose();rd.forceContextLoss();rd.domElement.remove();}el.classList.add('logo-fallback');}}
function introLogoDispose(){const v=INTRO_LOGO.view;if(!v)return;INTRO_LOGO.view=null;cancelAnimationFrame(v.raf);for(const t of v.textures)t.dispose();v.mesh.geometry.dispose();v.mesh.material.dispose();for(const u of v.urls)URL.revokeObjectURL(u);v.rd.dispose();v.rd.forceContextLoss();v.rd.domElement.remove();}
addEventListener('pagehide',introLogoDispose);document.addEventListener('visibilitychange',()=>{if(INTRO_LOGO.view)INTRO_LOGO.view.last=performance.now();});
const INTRO_LOGO_CSS=`
body.intro-active #ovl>.intro-title{background:#c8d5e6!important;border:2px solid #ecf4ff!important;outline:2px solid #68799c;padding:10px!important}.title-label{display:flex;justify-content:space-between;padding:8px 8px 12px;color:#364c6a;font-size:12px;letter-spacing:.1em}.intro-logo-stage{position:relative;aspect-ratio:16/9;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#41638b,#17233f 80%);border:2px inset #91a7c4;isolation:isolate}.intro-logo-poster,.intro-logo-canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.intro-logo-poster{z-index:1}.intro-logo-canvas{z-index:2;opacity:0}.logo-ready .intro-logo-canvas{opacity:1}.logo-ready .intro-logo-poster{visibility:hidden}.logo-orbit{position:absolute;inset:11px;border:1px solid #8aaad83b;pointer-events:none;z-index:3}.logo-orbit::before,.logo-orbit::after{content:'';position:absolute;bottom:-1px;width:22px;height:3px;background:#93d3e6}.logo-orbit::before{left:0}.logo-orbit::after{right:0}.intro-title-body{padding:16px 8px 6px;text-align:center}.intro-title-body>p{font-size:14px;line-height:1.7;color:#30496b;margin:0 0 16px}.title-start{width:100%;min-height:52px;font-size:20px!important}.title-options{display:flex;justify-content:center;gap:12px;margin-top:12px}.title-options .mb{min-height:44px;font-size:12px}body.intro-active #ovl>.intro-title .title-label span{display:inline}.intro-logo-stage:focus-within{outline:2px solid #63bfd2}@media(max-height:500px){body.intro-active #ovl>.intro-title{max-width:470px!important}.intro-logo-stage{max-height:180px}.intro-title-body{padding-top:8px}.intro-title-body>p{margin-bottom:8px}.title-options{margin-top:6px}}
`;
{const s=document.createElement('style');s.textContent=INTRO_LOGO_CSS;document.head.appendChild(s);}


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
 if(G.mons?.some(m=>m.boss&&!m.dead))return 'rush';
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
 {contact:'唱片店 阿夏',request:'找回電台天線零件，確認前街為何收到重複的試音。',lead:'沿前街追查走音喇叭，讓店家先恢復各自的廣播。',text:'阿夏把掉下的天線零件收好，請你先別碰還在供電的總線。喇叭裡的試音每次都帶著一聲車鈴；橋下修理攤的小禾，正好在找她的鈴。',radio:'前街已恢復連線。帶著車鈴的線索，去問橋下的小禾。'},
 {contact:'修理工 小禾',request:'找回腳踏車鈴，排查橋墩旁的回音接口。',lead:'鈴聲是追查方向，不是故障源；先隔離錯頻的回音柱。',text:'車鈴卡在回音柱的接口旁，隨每次重播輕響。小禾把它裝回腳踏車，再將接口切回正確頻道；剩下的雜訊裡，有夜市老闆娘報出的餐牌。',radio:'橋下恢復回應。下一段試播來自商店街與夜市。'},
 {contact:'夜市老闆娘',request:'取回店裡的收音機，讓點餐和報站各自回到正確頻道。',lead:'攔下失控招牌，讓客人沿原來的路回家。',text:'老闆娘接過收音機，先替等候的客人播回點餐號。錯頻的錄音仍留下半句月台提示；她把時間寫在餐牌背面，請你交給河邊站務員核對。',radio:'夜市的歌回來了。沿站務呼號，追查車站與河邊。'},
 {contact:'河邊站務員',request:'找回麥克風，把月台提示與轉播排程對上。',lead:'讓失控廣播停止循環，留出乘客上下車的空間。',text:'站務員用找回的麥克風重新報站，乘客照常趕上末班。那段重播並非現場廣播，而是山路舊發射機的試音排程；小禾帶著工具，先去找開機鑰匙。',radio:'月台報站恢復。下一段訊號：山路電塔與商場地下。'},
 {contact:'修理工 小禾',request:'取回舊發射機鑰匙，修正把試音送往全街的排程。',lead:'電仍要留給店家；只處理重播機的錯頻指令。',text:'小禾用鑰匙打開發射機，發現「暑假最後一天」是忘了撤下的試音標題。她沒有拔掉街區電源，只改正配送到各站的排程；最後還需要屋頂電台確認每一站都能回覆。',radio:'重播排程已修正。帶著各站的回覆，回屋頂試音。'},
 {contact:'街角電台的大家',request:'完成最後一輪試音，確認每個街區都能各自選台。',lead:'回覆不是要變成同一首歌，而是讓每一站都被聽見。',text:'天線零件裝回電台，車鈴、收音機、麥克風和鑰匙各自回到主人手上。大家在屋頂輪流試音：候船、點餐、報站與晚間節目都能各自播出。小收音機留下那張貼紙，記住今天一起接好線的人。',radio:'各站已恢復。街區仍有各自的歌，請慢慢走回家。'}
].forEach((note,i)=>Object.assign(STORY_CHAPTERS[i],note));
function neighborhoodJournalHtml(){
 const p=terrainNow();if(G.run?.tower||G.train||!g1On())return '';
 const site=STREET_NEIGHBORHOODS[p.profile];return `<div class="street-chapter"><b>${uxEsc(site.name)} · ${uxEsc(site.site)}</b><p>${uxEsc(site.activity)}</p></div>`;
}

;
/* ---------- boot ---------- */
const Q = new URLSearchParams(location.search);
G.equip.weapon = makeItem('weapon', 0, 1); G.equip.weapon.name = '新手摺疊傘';
G.equip.armor = makeItem('armor', 0, 1); G.equip.armor.name = '粗布衣';
recalc(); G.h.hp = G.st.life;
G.ascension=null;G.ascensionNodes=[];G.circuits=['pocket'];G.circuitLayouts={};G.circuitPity=0;
const GAME_NEW_STATE=copyState(G);
let loadedT = 0,hasLoadedGame=false;
if (!Q.has('fresh')){ const o = loadGame(); if (o && applySave(o)){loadedT = o.t || 0;hasLoadedGame=true;} }
G.speed = 1;   // 已拿掉遊戲速度選項
if (!loadedT) logLine('冒險開始！英雄會自動戰鬥並走近拾取掉落物，裝備可到角色的倉庫管理。', '#2b2552');

let ui;
const simulate = sec => { G.offline = true; for (let i = 0; i < sec/.05; i++){ while (GAME_FEATURES.cardChoices && G.picks > 0){ const c = rollCards(1)[0]; if (!c) break; takeCard(c); } while (GAME_FEATURES.cardChoices && G.relicPicks > 0){ const r = rollRelics(1)[0]; if (!r){ G.relicPicks = 0; break; } takeRelic(r); } update(.05); } G.offline = false; G.floats = []; G.fx = []; };
ui = mountFigure({
  fig:'06', title:'Idle Hero', hint:'', size:[BXW, BYW, 36], palette:'mint', state:G, credit:false, header:false,
  scene, buttonsLabel:'英雄指令',
  onChoiceChange:()=>uiSyncSettings(),
  choiceMessages:{current:label=>label+'：目前設定。',unavailable:label=>label+'：目前無法使用。'},
  stats: () => [], // HUD 的唯一呈現由 viewRenderHUD 管理。
  buttons:[
    { label:'技能', onClick:() => openModal('skills') },
    { label:'編年史', onClick:() => wikiOpen() },
    { label:'扮工模式 ( ` )', onClick:() => toggleBoss(true) },
    { label:'天賦盤', onClick:() => openModal('tree') },
    { label:'地圖', onClick:() => openModal('maps') },
    { label:'模式', choices: () => [ { label:'推進（打BOSS）', current:G.push, onClick:() => { G.push = true; logLine('模式：推進', '#2b2552'); } }, { label:'原地刷怪（經驗與金幣 +30%）', current:!G.push, onClick:() => { G.push = false; G.bossOut = false; logLine('模式：原地刷怪', '#2b2552'); } } ] },
    { label:'挑戰BOSS', choices: () => [[0, '一律挑戰'], [50, '生命 50% 以上'], [80, '生命 80% 以上']].map(([v, n]) => ({ label:n, current:(G.bossHp || 0) === v, onClick:() => { G.bossHp = v; } })) },
    { label:'戰利品過濾', choices: () => ['全部撿','魔法以上','稀有以上'].map((n, i) => ({ label:n, current:G.filter === i, onClick:() => { G.filter = i; } })) },
    { label:'戰鬥畫面', choices: () => [['auto','自動（按頁面調整）'],[1,'大'],[2,'小'],[3,'收起']].map(([v, n]) => ({ label:n, current:v === 'auto' ? !G.userCz : G.userCz && Math.max(1, G.cz) === v, onClick:() => { if (v === 'auto'){ G.userCz = false; G.autoFold = true; } else { G.cz = v; G.userCz = true; } G.dirty = true; uiTitle(); } })) },
    { label:'小視窗', choices: () => [[true, '開啟（置頂縮圖）'], [false, '關閉']].map(([v, n]) => ({ label:n, current:!!(typeof BG!=='undefined'&&BG.pip) === v, onClick:() => { if (typeof bgPipToggle==='function' && !!BG.pip !== v) bgPipToggle(); } })) },
    { label:'倒下表現', choices: () => [['none', '無'], ['blood', '紅色液體'], ['signal', '訊號碎片']].map(([v, n]) => ({ label:n, current:deathFxStyle() === v, onClick:() => { try{localStorage.setItem('ih-deathfx', v);}catch(e){} } })) },
    { label:'音效', choices: () => [['all', '音樂＋音效'], ['sfx', '只有音效'], ['off', '靜音']].map(([m, n]) => ({ label:n, current:AUD.mode === m, onClick:() => { audInit(); audMode(m); } })) },
    { label:'存檔', onClick:() => openModal('save') },
  ],
  params:(s, q) => {
    if (q.has('fresh')&&q.has('char')&&Object.hasOwn(CHARS,q.get('char'))){ G.char = q.get('char'); recalc(); }
    if (q.has('lvl')){ G.lvl = +q.get('lvl'); recalc(); }
    if (q.has('depth')){ G.depth = +q.get('depth'); G.maxDepth = Math.max(G.maxDepth, G.depth); }
    if (q.has('speed')) G.speed = +q.get('speed');
    if (q.has('sim')){ simulate(+q.get('sim')); document.documentElement.dataset.sim = JSON.stringify({ lvl:G.lvl, depth:G.depth, gold:Math.round(G.gold), deaths:G.deaths, dps:Math.round(G.st.dps), life:Math.round(G.st.life), maps:G.maps.length, pts:passPoints(), eq:Object.fromEntries(Object.entries(G.equip).map(([k, v]) => [k, v && (v.name + ' r' + v.r + ' il' + v.il)])), gems:G.gems }); }
  },
});
setupPanel();
document.documentElement.style.setProperty('--ver', '"v' + VERSION() + '"');
if (Q.has('legend')){ for (const id of Q.get('legend').split(',')){ const L = LEGEND_BY[id]; if (!L) continue; const sl = Object.keys(LEGENDS).find(k => LEGENDS[k].includes(L)); G.equip[sl] = makeItem(sl, 3, 20, id); } recalc(); }
if (Q.has('give')){ // testing helpers
  for (const id of Object.keys(SUPPS)) G.gems[id] = 2;
  for (const id of Object.keys(MODES)) G.carts[id] = 1;
  for (let i = 0; i < 3; i++) G.maps.push(makeMap(Math.max(1, G.depth)));
  if (Q.has('slots')){ boardFromLegacy(Q.get('slots').split(',').map(x => x || null), {}); G.slots.forEach(id => { if (id && G.cds[id] == null) G.cds[id] = 0; }); }
  recalc();
}
if (Q.has('pass')) for (const id of Q.get('pass').split(',')) if (TREE[id] && !G.pass.includes(id)) G.pass.push(id);
if (Q.has('run')) enterMap((G.maps[0] || (G.maps.push(makeMap(G.depth)), G.maps[0])).id);
if (Q.has('selftest')){ const c = encodeSave(), o = decodeSave(c); const ok = !!o && o.lvl === G.lvl; const before = JSON.stringify(serialize().equip); applySave(o); document.documentElement.dataset.selftest = JSON.stringify({ ok, same:before === JSON.stringify(serialize().equip), len:c.length }); }
if (Q.has('static')){ G.spawnCd = 1e9; G.paused = true; G.mons = []; }   /* 測試用：?static 沒有怪、不跑模擬，拿來拍主角與武器特寫 */
if (Q.has('mons')){   // testing: ?mons=slime,skel,brute,boss&at=48 lines up frozen monsters (one every 9 units from y = at) for screenshots
  G.spawnCd = 1e9; G.paused = true; G.mons = []; G.drops = []; G.fx = []; G.floats = []; G.proj = []; G.run = null; if (Q.has('d')) G.depth = +Q.get('d');
  Q.get('mons').split(',').forEach((t, i) => G.mons.push({ type:t, boss:t === 'boss', x:15 + (i % 2 ? 4 : -2), y:(+Q.get('at') || 48) - i*9, hp:80, hpMax:100, dmg:1, atkInt:2, spdK:1, atkCd:1, slot:i,
    fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:i*1.7 }));
}
if (Q.has('picks')) G.picks = +Q.get('picks');
if (Q.has('modal')) openModal(Q.get('modal'));
const gap0 = Q.has('away') ? +Q.get('away') : loadedT ? (Date.now() - loadedT)/1000 : 0;
if (gap0 > 20) catchUp(gap0, gap0 >= 180);
const introWanted=!hasLoadedGame&&(Q.has('intro')||![...Q.keys()].some(k=>['fresh','static','modal','sim','selftest','give','lvl','char','mons','away'].includes(k)));
if(introWanted)introStart();
ui.renderInterval=1000/30;
ui.suspendRender=()=>G.offline||document.hidden||FXO.stop>0;
ui.animate(dt => {
  const now = Date.now(), gap = (now - G.lastWall)/1000; G.lastWall = now;
  if (G.paused) return true;
  if (FXO.stop > 0) FXO.stop -= dt;
  if (GAME_FEATURES.cardChoices && G.relicPicks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offerR && $('ovl').hidden))) openRelics();
  else if (GAME_FEATURES.cardChoices && G.picks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offer && $('ovl').hidden))) openCards();
  if (gap > 3){ catchUp(gap, gap >= 180); return true; }
  stepSim(gap>=0?gap:dt); return true;
});
setInterval(() => { if (!G.paused) saveGame(); }, 5000);
addEventListener('pagehide', () => { if (!G.paused) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.paused) saveGame(); });
document.getElementById('boot')?.remove();


;
/* 背景運行與小視窗：分頁被切到背景時，由 Worker 計時續跑模擬；支援的瀏覽器可開啟置頂小視窗，顯示戰鬥縮圖與狀態。 */
function bgSupported(){return typeof documentPictureInPicture!=='undefined'&&!!documentPictureInPicture.requestWindow;}
function bgTick(){
  if(G.paused||G.offline)return;
  if(document.hidden){const now=Date.now(),gap=(now-G.lastWall)/1000;if(gap>=.25&&gap<=60){G.lastWall=now;stepSim(gap);}}
  if(BG.pip)bgPipDraw(performance.now());
}
function bgStart(){
  try{BG.worker=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),500)'],{type:'text/javascript'})));BG.worker.onmessage=bgTick;}
  catch(e){BG.worker=null;setInterval(bgTick,1000);}
  try{navigator.locks?.request('idle-hero-background',()=>new Promise(()=>{}));}catch(e){}
}
function bgPipDraw(now){
  if(!BG.pip||!BG.ctx||now-BG.last<120)return;BG.last=now;
  try{if(typeof scene==='function')scene();const cv=R3.rd&&R3.rd.domElement;if(cv&&cv.width>0){const w=BG.ctx.canvas.width,h=BG.ctx.canvas.height,k=Math.max(w/cv.width,h/cv.height),dw=cv.width*k,dh=cv.height*k;BG.ctx.imageSmoothingEnabled=false;BG.ctx.fillStyle='#9fd4f6';BG.ctx.fillRect(0,0,w,h);BG.ctx.drawImage(cv,(w-dw)/2,(h-dh)/2,dw,dh);}}catch(e){}
  if(BG.stats){const hp=Math.max(0,Math.ceil(G.h.hp)),life=Math.max(1,Math.ceil(G.st?.life||1));BG.stats.textContent=`LV ${G.lvl}　HP ${hp}/${life}　深度 ${G.depth}　金幣 ${G.gold}`;}
}
async function bgPipToggle(){
  if(BG.pip){try{BG.pip.close();}catch(e){}BG.pip=null;return;}
  if(!bgSupported()){ui.flash('此瀏覽器不支援小視窗，請改用 Chrome 或 Edge。',2600);return;}
  try{
    const w=await documentPictureInPicture.requestWindow({width:320,height:220});BG.pip=w;
    w.document.head.innerHTML='<style>html,body{margin:0;background:#2b2552;color:#f7faff;font:12px/1.4 "Cubic 11",system-ui,sans-serif}canvas{display:block;width:100%;image-rendering:pixelated}#s{padding:6px 8px;text-align:center}</style>';
    const cv=w.document.createElement('canvas');cv.width=320;cv.height=180;const s=w.document.createElement('div');s.id='s';w.document.body.append(cv,s);
    BG.ctx=cv.getContext('2d');BG.stats=s;
    const loop=t=>{if(BG.pip!==w)return;bgPipDraw(t);w.requestAnimationFrame(loop);};w.requestAnimationFrame(loop);
    w.addEventListener('pagehide',()=>{if(BG.pip===w){BG.pip=null;BG.ctx=null;BG.stats=null;}});
  }catch(e){BG.pip=null;ui.flash('小視窗開啟失敗。',2000);}
}
bgStart();
