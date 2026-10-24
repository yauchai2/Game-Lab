/* Stable legacy save keys deliberately retained: street→AKI, frost→MILO,
   beep→PING, volt→NULL. Story is opt-in; no arrival dialog is added. */
const CHARACTER_PROFILES={
 street:{model:'aki',n:'茜 AKANE',title:'街電の先鋒',quote:'壞掉了嗎？交給我吧，敲兩下就好了。',identity:'22 歲｜下町電器行見習',role:'近戰、連鎖電擊、護盾續戰',passive:'接地：普通攻擊連續命中，累積短暫護盾；上限為生命 5%。',eff:{inc:10},sig:{n:'短路連打',cd:7,d:'每 7 秒重擊附近目標，並向最多 3 個鄰近敵人跳電。'},story:['茜在高架橋下的電器維修店長大。鄰居換掉的耳機、手機和風扇，都會先送到她桌上。她相信大部分東西還能修，尤其是那些別人已經不想要的。','師父拆開一批來路不明的舊機件後失去消息，只留下一張寫著浮島座標的維修單。她帶著拼裝電棍出發，追查那套遍布浮島的設備工程。','她習慣以「修好東西」照顧別人，卻不擅長承認自己也需要幫助。']},
 frost:{model:'milo',n:'蓮 REN',title:'音軌の旅人',quote:'只要跟上節拍，就不會慢下來。',identity:'24 歲｜街頭 DJ／地下唱片店店員',role:'中距離、環形傷害、連擊加速',passive:'踩拍：持續普通攻擊最多提高音波節奏 20%；中斷 3 秒重置。',eff:{apsInc:8},sig:{n:'低頻環流',cd:7,d:'向周圍釋放音波，命中半徑 42 內的敵人；連續命中可縮短間隔。'},story:['蓮替一間快要結業的唱片店整理舊貨時，找到一張沒有標題的 MD。裡面錄著街道廣播、列車聲，以及一段從未聽過的音樂。','每到一座新浮島，錄音中模糊的部分就會變得清晰，彷彿那張碟正記錄一條路線。他開始收集各地被遺忘的聲音，希望完成這張音軌。','他擅長炒熱氣氛，卻害怕安靜，因為安靜時就得面對自己一直拖延的告別。']},
 beep:{model:'ping',n:'結衣 YUI',title:'折訊の狩人',quote:'收到。前面的路，我會自己找出來。',identity:'21 歲｜浮島宅配員',role:'遠程投射、標記追蹤、會心',passive:'簽收確認：普通攻擊擊敗目標後，下一輪訊號連射傷害提高 25%。',eff:{crit:6,apsInc:6},sig:{n:'訊號連射',cd:6,d:'向最多 6 個目標發出鎖定訊號彈，依角色會心率判定會心。'},story:['結衣最自豪的紀錄，是從未遺失任何一件包裹。某天，她接到一份地址早已不存在的委託：姓名空白，電話停用，每當準備退件，手機就收到下一段路線。','公司要求銷毀包裹。她卻發現，沿途有人認得包裹上的舊標記，並替她指出被地圖刪去的道路。','她總說自己只負責送件，卻一次次為收件人的故事改變路線。這次要送達的，也許是某個人一直等不到的消息。']},
 volt:{model:'null',n:'太一 TAICHI',title:'寵機の技師',quote:'這孩子可是有個性的，才不是故障喔。',identity:'26 歲｜二手電子攤老闆／電子雞改造師',role:'召喚、持續輸出、修復與增益',passive:'備用電池：寵機每 8 次有效攻擊可修復少量生命，受既有回復上限約束。',eff:{inc:8},sig:{n:'寵機出動',cd:8,d:'寵機持續自動索敵；每 8 秒啟動 4 秒增幅，寵機傷害提高 50%。'},story:['太一收購沒人要的電子寵物機，換電池、修按鍵，再放回攤位等新主人。其中一部無論如何重置，都保留著同一個存檔。','裡面的寵物每天走到畫面邊緣，朝同一方向等待。太一替它製作移動外殼，小傢伙竟開始帶路，尋找一位多年沒有登入的主人。','太一希望替每件舊物找到歸屬，卻始終把自己的生活維持在隨時可以搬走的狀態。']}
};
for(const [key,p]of Object.entries(CHARACTER_PROFILES))Object.assign(CHARS[key],p,{d:p.title+'。'+p.role});
ACHS.boss10.d='擊敗關主 30 次，解鎖角色「結衣 YUI」';
function characterRuntime(){if(!G.characterRuntime||G.characterRuntime.id!==G.char)G.characterRuntime={id:G.char,combo:0,lastHit:-10,petCd:0,battery:0,boostUntil:0,receipt:false};return G.characterRuntime;}
function characterBasicHit(target){
 if(G.train)return;const r=characterRuntime(),h=G.h;
 if(G.char==='street'){const old=G.time<(h.bufferUntil||0)?h.buffer||0:0;h.buffer=Math.max(old,Math.min(G.st.life*.05,old+G.st.life*.005));h.bufferUntil=Math.max(h.bufferUntil||0,G.time+2);}
 if(G.char==='frost'){r.combo=G.time-r.lastHit<3?Math.min(5,r.combo+1):1;r.lastHit=G.time;}
 if(G.char==='beep'&&target.dead)r.receipt=true;
}
function characterCombatTick(dt){
 if(G.train||G.h.dead>0)return;const r=characterRuntime();
 if(G.char==='frost'){if(G.time-r.lastHit>=3)r.combo=0;if(aliveMons().length)G.sigT=(G.sigT||0)+dt*r.combo*.04;}
 if(G.char!=='volt')return;const target=nearestMon(false);if(!target)return;
 r.petCd=Math.max(0,r.petCd-dt);if(r.petCd>0)return;r.petCd=1.1;
 hitMon(target,G.st.hit*(G.time<r.boostUntil?1.5:1),false,'寵機');r.battery++;
 if(!G.offline)addFx({k:'bolt',pts:[[G.h.x+7,G.h.y-2,BZ+12],[target.x,target.y,BZ+7]],t:0,dur:.15});
 if(r.battery>=8){r.battery=0;heroRecover(G.st.life*.015);}
}
function y2kSignature(al,s){
 const r=characterRuntime(),h=G.h,origin=[h.x,h.y,BZ+13];h.characterCastUntil=G.time+.45;
 if(G.char==='street'){
  const targets=al.slice().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y));const first=targets.find(m=>Math.hypot(m.x-h.x,m.y-h.y)<30);if(!first)return;
  const chain=[first,...targets.filter(m=>m!==first&&Math.hypot(m.x-first.x,m.y-first.y)<30).slice(0,3)];let from=origin;
  chain.forEach((m,i)=>{const to=[m.x,m.y,BZ+8];hitMon(m,s.hit*(i?2.2:6),false);if(!G.offline)addFx({k:'bolt',pts:[from,to],t:0,dur:.22});from=to;});
 }else if(G.char==='frost'){
  addFx({k:'ring',x:h.x,y:h.y,col:'#a5d9c1',t:0,dur:.5});for(const m of al)if(Math.hypot(m.x-h.x,m.y-h.y)<42)hitMon(m,s.hit*4.5,false);
 }else if(G.char==='beep'){
  const boost=r.receipt?1.25:1;r.receipt=false;for(const m of al.slice().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y)).slice(0,6)){const shot=rollDmg(s.hit*2.8*boost);hitMon(m,shot.dmg,shot.crit);if(!G.offline)addFx({k:'bolt',pts:[origin,[m.x,m.y,BZ+8]],t:0,dur:.2});}
 }else if(G.char==='volt'){r.boostUntil=G.time+4;addFx({k:'ring',x:h.x+7,y:h.y-2,col:'#9bcbb6',t:0,dur:.45});}
}
function characterStoryHtml(){const p=CHARACTER_PROFILES[G.char];if(!p)return '';return `<details class="ui-section"><summary>${p.title}｜角色故事</summary><p>${p.identity}</p><p>「${p.quote}」</p>${p.story.map(t=>`<p>${t}</p>`).join('')}<p>四人的線索都帶著同一張舊維修標籤：維修單、MD 封面、包裹和寵機存檔，正指向同一套浮島設備。</p></details>`;}
