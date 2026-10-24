/* Stable legacy save keys deliberately retained: street→AKI, frost→MILO,
   beep→PING, volt→NULL. Story is opt-in; no arrival dialog is added. */
const CHARACTER_PROFILES={
 street:{model:'aki',n:'脈衝衛士',title:'近戰與護盾',quote:'接地，再突破。',identity:'職業｜街區電力維護',role:'近戰、連鎖電擊、護盾續戰',passive:'普通攻擊連續命中可累積短暫護盾，上限生命5%。',eff:{inc:10},sig:{n:'短路連打',cd:7,d:'每7秒重擊近處目標，再向最多3個鄰近敵人跳電。'},story:['擅長把城市廢棄的電力裝置改成武器，以護盾承受壓力，再用連鎖電流打開缺口。','三條昇華在接地防護、多人跳電與超載攻勢之間取捨。所有技能與電路配件仍可自由配搭。']},
 frost:{model:'milo',n:'頻譜遊俠',title:'音波與節拍',quote:'讓節拍穿過靜默。',identity:'職業｜聲場調律',role:'中距離、環形音波、連擊加速',passive:'持續普攻可累積5層節拍，最多加快音波節奏20%；中斷3秒重置。',eff:{apsInc:8},sig:{n:'低頻環流',cd:7,d:'每7秒向半徑42內釋放音波，持續命中可縮短間隔。'},story:['透過舊播放器與共振裝置塑造戰場，用節奏和頻率改變攻勢。','回聲、靜域及疾拍各有不同的施放節奏，並非限定只能使用冰霜或音波技能。']},
 beep:{model:'ping',n:'訊號獵手',title:'投射與鎖定',quote:'確認訊號，鎖定目標。',identity:'職業｜訊號追蹤',role:'遠程投射、標記追蹤、會心',passive:'普攻討伐目標後，下一輪職業連射傷害提高25%。',eff:{crit:6,apsInc:6},sig:{n:'訊號連射',cd:6,d:'每6秒向最多6個目標發出2.8倍訊號彈，依會心率判定。'},story:['以城市通訊裝置追蹤敵人，在單體精度、多人分流與快速走位之間建立攻勢。','選擇定頻狙擊會犧牲清場，分流則降低每發傷害；技能盤仍不鎖武器或元素。']},
 volt:{model:'null',n:'寵機技師',title:'寵機與修復',quote:'啟動，保持連線。',identity:'職業｜電子寵機改裝',role:'召喚、持續輸出、修復增益',passive:'寵機每8次有效攻擊可修復1.5%生命，受共用回復額度限制。',eff:{inc:8},sig:{n:'寵機出動',cd:8,d:'寵機持續自動索敵，每8秒增幅4秒，期間寵機傷害提高50%。'},story:['透過可移動的電子寵機提供持續火力，在雙核連擊、維修與熔核濺射中選擇改裝方向。','寵機是職業能力，其他技能仍需手動組裝並接通電路才能生效。']}
};
for(const[key,p]of Object.entries(CHARACTER_PROFILES))Object.assign(CHARS[key],p,{d:p.title+'。'+p.role});
ACHS.boss10.d='討伐關主30次，留下資深討伐紀錄。';
function characterRuntime(){if(!G.characterRuntime||G.characterRuntime.id!==G.char)G.characterRuntime={id:G.char,combo:0,lastHit:-10,petCd:0,battery:0,boostUntil:0,receipt:false};return G.characterRuntime;}
function characterBasicHit(target){
 if(G.train)return;const r=characterRuntime(),h=G.h;
 if(G.char==='street'){const old=G.time<(h.bufferUntil||0)?h.buffer||0:0;h.buffer=Math.max(old,Math.min(G.st.life*(G.ascension==='ground'?.09:.05),old+G.st.life*.005));h.bufferUntil=Math.max(h.bufferUntil||0,G.time+2);}
 if(G.char==='frost'){r.combo=G.time-r.lastHit<3?Math.min(G.ascension==='pace'?8:5,r.combo+1):1;r.lastHit=G.time;}
 if(G.char==='beep'&&target.dead)r.receipt=true;
}
function characterCombatTick(dt){
 if(G.train||G.h.dead>0)return;const r=characterRuntime();
 if(G.char==='frost'){if(G.time-r.lastHit>=3)r.combo=0;if(aliveMons().length)G.sigT=(G.sigT||0)+dt*r.combo*.04;}
 if(r.echoAt&&G.time>=r.echoAt){r.echoAt=0;y2kSignature(aliveMons(),G.st,true);}
 if(G.char!=='volt')return;const target=nearestMon(false);if(!target)return;
 r.petCd=Math.max(0,r.petCd-dt);if(r.petCd>0)return;r.petCd=G.ascension==='dual'?.8:G.ascension==='melt'?1.5:1.1;
 const petMul=G.ascension==='dual'?.78:G.ascension==='repair'?.8:G.ascension==='melt'?1.05:1;hitMon(target,G.st.hit*petMul*(G.time<r.boostUntil?1.5:1),false,'寵機');r.battery++;
 if(G.ascension==='dual'){const second=aliveMons().find(m=>m!==target&&Math.hypot(m.x-target.x,m.y-target.y)<24);if(second)hitMon(second,G.st.hit*.3,false,'副核');}
 if(G.ascension==='melt'){for(const m of aliveMons().filter(m=>m!==target&&Math.hypot(m.x-target.x,m.y-target.y)<10).slice(0,3))hitMon(m,G.st.hit*.25,false,'熔核濺射');if(!G.offline)addFx({k:'boom',x:target.x,y:target.y,z:BZ+5,t:0,dur:.3});}
 if(!G.offline)addFx({k:'bolt',pts:[[G.h.x+7,G.h.y-2,BZ+12],[target.x,target.y,BZ+7]],t:0,dur:.15});
 if(r.battery>=8){r.battery=0;heroRecover(G.st.life*(G.ascension==='repair'?.03:.015));}
}
function y2kSignature(al,s,echo=false){
 const r=characterRuntime(),h=G.h,origin=[h.x,h.y,BZ+13];h.characterCastUntil=G.time+.45;
 if(G.char==='street'){
  const targets=al.slice().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y));const first=targets.find(m=>Math.hypot(m.x-h.x,m.y-h.y)<30);if(!first)return;
  const chain=[first,...targets.filter(m=>m!==first&&Math.hypot(m.x-first.x,m.y-first.y)<30).slice(0,G.ascension==='arc'?5:3)];let from=origin;
  chain.forEach((m,i)=>{const to=[m.x,m.y,BZ+8];hitMon(m,s.hit*(i?2.2:6)*(G.ascension==='ground'?.85:G.ascension==='arc'?.9:1),false);if(!G.offline)addFx({k:'bolt',pts:[from,to],t:0,dur:.22});from=to;});
 }else if(G.char==='frost'){
  addFx({k:'ring',x:h.x,y:h.y,col:'#a5d9c1',t:0,dur:.5});for(const m of al)if(Math.hypot(m.x-h.x,m.y-h.y)<42){hitMon(m,s.hit*4.5*(G.ascension==='echo'?(echo?.28:.8):1),false);if(G.ascension==='still')applyFreeze(m,.5,s.hit*.5);}
  if(G.ascension==='echo'&&!echo)r.echoAt=G.time+.45;
 }else if(G.char==='beep'){
  const boost=r.receipt?1.25:1;r.receipt=false;for(const m of al.slice().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y)).slice(0,G.ascension==='snipe'?2:G.ascension==='split'?8:6)){const shot=rollDmg(s.hit*(G.ascension==='snipe'?4.3:G.ascension==='split'?2.4:2.8)*boost);hitMon(m,shot.dmg,shot.crit);if(!G.offline)addFx({k:'bolt',pts:[origin,[m.x,m.y,BZ+8]],t:0,dur:.2});}
 }else if(G.char==='volt'){r.boostUntil=G.time+4;addFx({k:'ring',x:h.x+7,y:h.y-2,col:'#9bcbb6',t:0,dur:.45});}
}
function characterStoryHtml(){const p=CHARACTER_PROFILES[G.char];return `<section><h3>${p.n}</h3>${p.story.map(t=>`<p>${uxEsc(t)}</p>`).join('')}</section>`;}
