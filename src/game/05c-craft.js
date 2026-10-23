/* ---------- 改機：把用不到的裝備拆成零件，拿去重洗、替換、升級或腐化手上的裝備 ---------- */
const CRAFT = {
  recal:   { n:'重新校準', d:'只重洗同階內數值；保留詞綴種類與階級，已鎖定的詞綴不變', cost:it => 20 + 10*it.r + (it.lk != null ? 15 : 0), ok:it => it.aff.length > 0 },
  swap:    { n:'改裝詞綴', d:'隨機替換一條沒鎖定的詞綴', cost:it => 40 + 20*it.r, ok:it => it.r < 3 && it.aff.length > (it.lk != null ? 1 : 0) },
  upgrade: { n:'升級稀有度', d:'普通→魔法→稀有，各多一到兩條詞綴', cost:it => [100, 250][it.r] || 0, ok:it => it.r < 2 },
  corrupt: { n:'腐化', d:'賭一把：25% 數值 +20%、25% 多一條詞綴、25% 沒變化、25% 數值 -15%；腐化後不能再改機', cost:it => 60 + 20*it.r, ok:it => !it.cr },
};
const craftCost = (act, it) => CRAFT[act].cost(it);
const CRAFT_RESULTS = {};
let craftPending = null;
function craftState(slot, act){
  const it = G.equip[slot], op = CRAFT[act];
  if (!it || !op) return { ok:false, cost:0, reason:'尚未裝備道具' };
  const cost = op.cost(it); let reason = '';
  if (it.cr) reason = '已腐化，不能再改機';
  else if (act === 'recal' && !it.aff.some((a,i) => i !== it.lk)) reason = '沒有可校準的未鎖定詞綴';
  else if (act === 'swap' && it.r >= 3) reason = '傳奇裝備不能替換詞綴';
  else if (act === 'swap' && !it.aff.some((a,i) => i !== it.lk)) reason = '沒有可改裝的未鎖定詞綴';
  else if (act === 'swap' && !POOL[slot].some(k => !it.aff.some(a => a.k === k))) reason = '沒有可替換的新詞綴';
  else if (act === 'upgrade' && it.r >= 2) reason = it.lg?'傳奇裝備可使用下方的核心重構':'已達可升級的稀有度上限';
  else if (!op.ok(it)) reason = '這件裝備無法進行此操作';
  else if ((G.parts || 0) < cost) reason = `需要 ${cost} 零件，還差 ${cost - (G.parts || 0)}`;
  return { ok:!reason, cost, reason };
}
function craftLock(slot, i){ const it = G.equip[slot]; if (!it || it.cr) return; it.lk = it.lk === i ? null : i; renderModal(); }
function craftConfirm(){
  const p = craftPending; craftPending = null;
  hideOverlay(); if (!p) return;
  if (G.equip[p.slot] !== p.it || JSON.stringify(p.it) !== p.stamp){ logLine('裝備已變動，請重新選擇改機。', '#a64b25'); renderModal(); return; }
  craftDo(p.slot,p.act,true);
}
function craftDo(slot, act, confirmed = false){
  const state = craftState(slot,act); if (!state.ok){ uxAnnounce(state.reason); return; }
  const it = G.equip[slot], C = CRAFT[act];
  if (act === 'corrupt' && !confirmed){
    craftPending = { slot, act, it, stamp:JSON.stringify(it) };
    showOverlay(`<h2 class="uxdialog-title">腐化「${uxEsc(it.name)}」？</h2><p>消耗 ${state.cost} 零件。可能提升數值、增加詞綴、沒有變化或降低數值。</p><p class="uxwarning">腐化後，這件裝備不能再改機。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="craftPending=null;hideOverlay()">取消</button><button class="mb pri" onclick="craftConfirm()">腐化裝備</button></div>`); return;
  }
  const cost = state.cost, before = it.aff.map(a => AFF[a.k].t(a.v)).join('、') || '無額外詞綴';
  G.parts -= cost; G.craftN = (G.craftN || 0) + 1; checkQuest(); const have = new Set(it.aff.map(a => a.k)), free = () => POOL[slot].filter(k => !have.has(k)), add = () => { const f = free(); if (!f.length) return false; const k = tPick(f); have.add(k); it.aff.push(rollAff(k, it.il)); return true; };
  let msg = '';
  if (act === 'recal'){ it.aff = it.aff.map((a,i)=>i===it.lk?a:recalibrateAff(a,it)); msg = '數值重洗完成'; }
  else if (act === 'swap'){ const idx = it.aff.map((a, i) => i).filter(i => i !== it.lk); const i = tPick(idx), k = tPick(free()); it.aff[i] = rollAff(k,it.il); msg = `詞綴換成：${AFF[k].t(it.aff[i].v)}`; }
  else if (act === 'upgrade'){ it.r++; const n = it.r === 1 ? 1 : 2; for (let i = 0; i < n; i++) add(); it.name = it.r === 1 ? PREF[it.aff[0].k] + BASES[slot][Math.min(3, Math.floor(it.il/6))] : tPick(RARE_NAMES[slot]); msg = `升級成${RAR[it.r].n}`; }
  else if (act === 'corrupt'){ it.cr = 1; const r = Math.random();
    if (r < .25){ for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*12)/10 : Math.max(1, Math.round(a.v*1.2)); msg = '腐化成功：數值 +20%'; }
    else if (r < .5) msg = add() ? '腐化成功：多了一條詞綴' : '腐化：沒有變化';
    else if (r < .75) msg = '腐化：沒有變化';
    else { for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*8.5)/10 : Math.max(1, Math.round(a.v*.85)); msg = '腐化失敗：數值 -15%'; } }
  it.lk = it.lk != null && it.lk < it.aff.length ? it.lk : null;
  const after = it.aff.map(a => AFF[a.k].t(a.v)).join('、') || '無額外詞綴';
  CRAFT_RESULTS[slot] = { it, msg, cost, before, after };
  recalc(); logLine(`改機（${SLOTN[slot]}）：${msg}`, '#1f9bbf'); addFloat(G.h.x + 3, G.h.y, BZ + 22, C.n, '#1f9bbf', 3.8); SFX('card'); G.dirty = true; renderModal(); uxAnnounce(`${msg}，消耗 ${cost} 零件。`);
}

/* 金幣補給站：金幣的長期用途（補給箱、倉庫擴建、離線儲備）。 */
const crateCost=()=>Math.round(300*Math.max(1,lvlNow())),whUpCost=()=>20000*((G.whUp||0)+1),offUpCost=()=>60000*((G.offUp||0)+1)**2;
function crateRar(){const r=Math.random()*100;return r<40?2:1;}
function buyCrate(n){
  let bought=0,best=null;
  for(let i=0;i<n;i++){
    const cost=crateCost();if(G.gold<cost)break;
    const it=makeItem(tPick(['weapon','armor','ring']),crateRar(),Math.max(1,lvlNow()));
    if(!storeGear(it)){uxAnnounce('倉庫已滿，請先整理再開箱。');break;}
    G.gold-=cost;bought++;if(!best||it.r>best.r)best=it;
  }
  if(bought){G.dirty=true;logLine(`補給箱 ×${bought}：最好的是 ${best.name}`,RAR[best.r].c);uxAnnounce(`開了 ${bought} 個補給箱，最好的是${best.name}，已放進背包。`);}
  else if(G.gold<crateCost())uxAnnounce('金幣不夠。');
  renderModal();
}
function buyWhUp(){if((G.whUp||0)>=WH_UP_MAX||G.gold<whUpCost())return;G.gold-=whUpCost();G.whUp++;G.dirty=true;uxAnnounce(`背包容量增加到 ${whCap()}。`);renderModal();}
function buyOffUp(){if((G.offUp||0)>=OFF_UP_MAX||G.gold<offUpCost())return;G.gold-=offUpCost();G.offUp++;G.dirty=true;uxAnnounce(`離線收益上限延長到 ${offCapSec()/3600} 小時。`);renderModal();}
function goldShopHtml(){
  const row=(name,desc,btns)=>`<div class="ui-shoprow"><div><b>${name}</b><small>${desc}</small></div><div class="ui-shopbtns">${btns}</div></div>`;
  const btn=(label,ok,fn,tip)=>`<button class="mb"${ok?'':' disabled'} data-tip="${uxEsc(tip)}" onclick="${fn}">${label}</button>`;
  const c=crateCost(),wMax=(G.whUp||0)>=WH_UP_MAX,oMax=(G.offUp||0)>=OFF_UP_MAX;
  return `<details class="ui-section ui-goldshop"><summary>補給站 · 金幣 ${tFmt(G.gold)}</summary>`+
   row('補給箱','隨機一件目前等級的裝備：魔法 60%、稀有 40%',btn(`開 1 個 · ${tFmt(c)}`,G.gold>=c,'buyCrate(1)','暗金只能靠守關者與城市遠征取得')+btn(`開 10 個 · ${tFmt(c*10)}`,G.gold>=c*10,'buyCrate(10)','一次開十個，倉庫放不下就會停'))+
   row('背包擴建',`容量 ${whCap()}／${200+20*WH_UP_MAX}，每次 +20`,wMax?'<span class="uxmeta">已滿</span>':btn(`擴建 · ${tFmt(whUpCost())}`,G.gold>=whUpCost(),'buyWhUp()','永久增加背包容量'))+
   row('離線儲備',`離線收益最多 ${offCapSec()/3600} 小時，每次 +1 小時（上限 ${6+OFF_UP_MAX}）`,oMax?'<span class="uxmeta">已滿</span>':btn(`延長 · ${tFmt(offUpCost())}`,G.gold>=offUpCost(),'buyOffUp()','永久延長離線結算時數'))+
   `<p class="uxmeta">金幣另外可用在：混沌重鑄、技能升級、天賦重置、角色裝扮。</p></details>`;
}
function craftHtml(){
  const sl=UI_WORK.craftSlot,act=UI_WORK.craftAct,it=G.equip[sl],op=CRAFT[act],state=craftState(sl,act);
  const slots=`<div class="ui-craft-slots" role="group" aria-label="改機裝備">${Object.keys(SLOTN).map(k=>`<button aria-pressed="${sl===k}" onclick="uiWork('craftSlot','${k}')" data-focus="craftSlot-${k}">${eqico(k,G.equip[k]?.r||0,24,G.equip[k])}<b>${SLOTN[k]}</b><small>${G.equip[k]?RAR[G.equip[k].r].n:'尚未裝備'}</small></button>`).join('')}</div>`;
  const tabs=uiSegments('craftAct',Object.entries(CRAFT).map(([k,c])=>[k,k==='upgrade'&&it?.lg?'核心重構':c.n,c.d]),'改機動作');
  let detail='<section class="ui-section"><h3>尚未裝備道具</h3><p>繼續冒險，自動換上裝備後即可改機。</p></section>';
  if(it){
    const lines=[`<li><span>${AFF[it.imp.k].t(it.imp.v)}</span><small>固定屬性</small></li>`].concat(it.aff.map((a,i)=>`<li><span>T${affTier(a,it.il)} · ${AFF[a.k].t(a.v)}<br><small>同階區間 ${affRange(a,it).min}–${affRange(a,it).max}${a.v>affRange(a,it).max?' · 舊值高於區間，校準可能降低':''}</small></span><button class="mb lk${it.lk===i?' on':''}" ${it.cr?'disabled':''} aria-label="${it.lk===i?'解除鎖定':'鎖定'}${uxEsc(AFF[a.k].t(a.v))}" onclick="craftLock('${sl}',${i})">${spr(it.lk===i?'lock':'unlock',20)}</button></li>`));
    const result=CRAFT_RESULTS[sl];
    detail=`<section class="ui-section ui-craft-detail"><div class="nm">${eqico(sl,it.r,36,it)}<div><h3>${uxEsc(it.name)}</h3><span class="uxmeta">${RAR[it.r].n} · 等級 ${it.il}${it.cr?' · 已腐化':''}</span></div></div><ul>${lines.join('')}</ul>${act==='upgrade'&&it.lg?coreRefineHtml(sl,it):`<div class="ui-craft-operation"><p class="uxmeta">${op.d}</p>${!state.ok?`<p id="craft-reason" class="uxwarning">${state.reason}</p>`:'<span id="craft-reason" hidden></span>'}<button class="mb pri" data-focus="craft-${sl}-${act}" aria-describedby="craft-reason" ${state.ok?'':'disabled'} onclick="craftDo('${sl}','${act}')">${act==='corrupt'?'確認腐化風險':op.n} · ${state.cost} 零件</button></div>`}${act==='recal'?affTierHtml(sl,it):''}${result&&result.it===it?`<div class="uxcraft-result" role="status"><b>${uxEsc(result.msg)}</b> · 消耗 ${result.cost} 零件<details><summary>查看變化</summary><p>之前：${uxEsc(result.before)}</p><p>之後：${uxEsc(result.after)}</p></details></div>`:''}</section>`;
  }
  return `<div class="ui-craft-wallet"><span>可用零件</span><strong>${G.parts||0}</strong><span>核心殘晶 ${G.coreDust||0}</span><span>電路點數 ${G.chips||0}</span></div>${slots}${tabs}${detail}<details class="ui-rules"><summary>拾取與自動拆解規則</summary><p class="uxmeta">回收裝備得到零件：普通 1、魔法 2、稀有 5、暗金 12。重複核心另外得到一枚殘晶；構築引用的裝備不會被回收。</p>${rulesBar()}</details>${goldShopHtml()}${circuitShopHtml()}`;
}

/* 分離同階校準、指定升階及核心物品等級重構。 */
const CRAFT_AFFIX_UI={weapon:0,armor:0,ring:0};let GEAR_PENDING=null;
const tierLevel=tier=>tier===0?25:tier===1?12:tier===2?5:1;
function affTierState(slot,index){const it=G.equip[slot],a=it?.aff[index],route={weapon:'signal',armor:'memory',ring:'power'}[slot];if(!it||!a)return {ok:false,reason:'先選擇一條詞綴',parts:0,fragments:0,dust:0};
 const from=affTier(a,it.il),to=Math.max(0,from-1),parts=from===0?0:[240,140,80,40][to],fragments=from!==0&&to===0?8:0,dust=from!==0&&it.lg?1:0,level=tierLevel(to);
 let reason=G.run||G.train?'先結束挑戰或訓練':it.cr?'已腐化，不能升階':it.lk===index?'先解除這條詞綴的鎖定':from===0?'已達 T0 上限':it.il<level?`T${to} 需要物品等級 ${level}`:G.parts<parts?`需要 ${parts} 零件`:((G.city?.fragments[route]||0)<fragments)?`需要 ${fragments} 枚${CITY_ROUTES[route].n}碎片`:(G.coreDust||0)<dust?`需要 ${dust} 核心殘晶`:'';
 const next={...a,tier:to,v:Math.max(a.v,affValue(a.k,it.il,to,affQuality(a,it),it.r===3?1.35:1))};
 return {ok:!reason,reason,it,index,from,to,parts,fragments,dust,route,next};
}
function coreRefineState(slot){const it=G.equip[slot],route=cityRouteForCore(it?.lg),cap=Math.max(8,G.maxDepth+2*((G.city?.maxTier||1)-1));
 if(!it||!route)return {ok:false,reason:'先裝備一件傳奇核心',parts:0,fragments:0,dust:0,cap};
 const parts=60+3*it.il,fragments=4+Math.floor(it.il/10),dust=1+Math.floor(it.il/10);
 const reason=G.run||G.train?'先結束挑戰或訓練':it.cr?'已腐化，不能重構':it.lk!=null?'先解除詞綴鎖定':!cityReady()?'先解鎖城市並使用有限天賦':it.il>=cap?`已達目前重構等級 ${cap}，推進深度或城市階級再提高上限`:G.parts<parts?`需要 ${parts} 零件`:(G.city?.fragments[route]||0)<fragments?`需要 ${fragments} 枚${CITY_ROUTES[route].n}碎片`:(G.coreDust||0)<dust?`需要 ${dust} 核心殘晶`:'';
 return {ok:!reason,reason,it,route,cap,parts,fragments,dust,nextLevel:it.il+1};
}
function gearOperationState(kind,slot,index){return kind==='tier'?affTierState(slot,index):kind==='refine'?coreRefineState(slot):{ok:false,reason:'未知操作'};}
function gearOperationCost(s){return `${s.parts} 零件${s.fragments?'、'+s.fragments+' 枚'+CITY_ROUTES[s.route].n+'碎片':''}${s.dust?'、'+s.dust+' 核心殘晶':''}`;}
function gearOperationAsk(kind,slot,index=0){const s=gearOperationState(kind,slot,index);if(!s.ok){uxAnnounce(s.reason);return;}GEAR_PENDING={kind,slot,index,it:s.it,stamp:JSON.stringify(s.it),cost:gearOperationCost(s)};
 showOverlay(`<h2 class="uxdialog-title">${kind==='tier'?'詞綴升階':'核心重構'}：${uxEsc(s.it.name)}</h2><p>${kind==='tier'?`T${s.from} → T${s.to} · ${AFF[s.it.aff[index].k].t(s.it.aff[index].v)} → ${AFF[s.next.k].t(s.next.v)}`:`物品等級 ${s.it.il} → ${s.nextLevel}；保留特殊效果、詞綴種類及階級，數值不會降低。`}</p><p>消耗 ${gearOperationCost(s)}。同一裝備的所有構築引用會同步更新。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="GEAR_PENDING=null;hideOverlay()">保留材料</button><button class="mb pri" onclick="gearOperationConfirm()">${kind==='tier'?'消耗材料升階':'消耗材料重構'}</button></div>`);
}
function gearOperationConfirm(){const p=GEAR_PENDING;GEAR_PENDING=null;hideOverlay();if(!p)return;const s=gearOperationState(p.kind,p.slot,p.index);
 if(!s.ok||G.equip[p.slot]!==p.it||JSON.stringify(p.it)!==p.stamp||gearOperationCost(s)!==p.cost){uxAnnounce('裝備、成本或挑戰狀態已變動，沒有扣除材料。');return;}
 G.parts-=s.parts;if(s.fragments)G.city.fragments[s.route]-=s.fragments;G.coreDust=(G.coreDust||0)-s.dust;
 if(p.kind==='tier')p.it.aff[p.index]=s.next;
 else{const old={...p.it};p.it.aff=p.it.aff.map(a=>({...a,tier:affTier(a,old.il),v:Math.max(a.v,affValue(a.k,s.nextLevel,affTier(a,old.il),affQuality(a,old),1.35))}));p.it.il=s.nextLevel;const value=p.slot==='weapon'?Math.round(4+p.it.il*1.5):p.slot==='armor'?Math.round(5+p.it.il*3):2;p.it.imp={...p.it.imp,v:Math.max(p.it.imp.v,value)};}
 G.craftN++;G.inventoryRevision++;checkQuest();recalc();renderModal();uxAnnounce(`${p.kind==='tier'?'詞綴升階':'核心重構'}完成，消耗 ${p.cost}。`);
}
function uiAffixPick(slot,index){if(!G.equip[slot]?.aff[index])return;CRAFT_AFFIX_UI[slot]=index;renderModal();}
function affTierHtml(slot,it){if(!it.aff.length)return '';const index=Math.min(CRAFT_AFFIX_UI[slot]||0,it.aff.length-1),s=affTierState(slot,index);
 return `<details class="ui-rules"><summary>指定詞綴升階</summary><p>每次提升一階，保留種類與階內位置，數值不降低。T2／T1／T0 分別需要物品等級 5／12／25。T0 另需區域碎片；核心裝另需一枚殘晶。</p><div class="view-options" role="group" aria-label="升階詞綴">${it.aff.map((a,i)=>`<button class="mb" data-focus="affix-${slot}-${i}" aria-pressed="${i===index}" onclick="uiAffixPick('${slot}',${i})">T${affTier(a,it.il)} · ${AFF[a.k].t(a.v)}</button>`).join('')}</div><p>${s.from===0?'T0 已達上限':`T${s.from} → T${s.to}，預計 ${AFF[s.next.k].t(s.next.v)}`} · ${gearOperationCost(s)}</p>${!s.ok?`<p class="uxmeta">${s.reason}</p>`:''}<button class="mb" data-focus="affix-upgrade-${slot}" ${s.ok?'':'disabled'} onclick="gearOperationAsk('tier','${slot}',${index})">預覽詞綴升階</button></details>`;
}
function coreRefineHtml(slot,it){if(!it.lg)return '';const s=coreRefineState(slot);return `<details class="ui-rules"><summary>核心重構 · 目前上限 ${s.cap}</summary><p>重複核心會留下殘晶。用殘晶、來源區碎片及零件，把這件核心的物品等級提高一級；保留特殊效果、詞綴種類及階級，數值不降低。推進深度或城市階級可提高上限。</p><p>核心殘晶 ${G.coreDust||0} · ${gearOperationCost(s)}</p>${s.ok?`<p>物品等級 ${it.il} → ${s.nextLevel}</p>`:`<p class="uxmeta">${s.reason}</p>`}<button class="mb" data-focus="core-refine-${slot}" ${s.ok?'':'disabled'} onclick="gearOperationAsk('refine','${slot}')">預覽核心重構</button></details>`;}
