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
