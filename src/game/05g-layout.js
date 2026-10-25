/* 操作台：共用導覽、工作分類與響應式外框。UI 暫存不改遊戲規則。 */
const UI_NAV = [
  {k:'char',n:'角色',icon:'role',pages:['char','dress','tree']},
  {k:'warehouse',n:'背包',icon:'bag',pages:['warehouse']},
  {k:'skills',n:'技能',icon:'battle',pages:['skills']},
  {k:'craft',n:'打造',icon:'craft',pages:['craft']},
  {k:'maps',n:'冒險',icon:'adventure',pages:['maps']},
  {k:'menu',n:'設定',icon:'more',pages:['menu','goals','ach','dex','rank','log','save','settings','feedback','support']}
];
const UI_TITLE = {warehouse:'背包',char:'角色',dress:'裝扮',skills:'技能',craft:'打造',tree:'天賦',maps:'冒險',menu:'設定',goals:'目標',ach:'成就',dex:'圖鑑',rank:'排行榜',log:'更新日誌',save:'存檔與備份',settings:'遊戲設定',feedback:'意見回饋',support:'贊助'};
const UI_WORK = {inventory:'support',craftSlot:'weapon',craftAct:'upgrade',adventure:'maps'};
function uiNavHtml(){
  return UI_NAV.map(g=>{const current=g.pages.includes(modalTab),locked=!tabOpen(g.k),dot=g.k==='warehouse'?(G.unread?.gear?.length||G.unread?.cores?.length):g.k==='skills'?(G.unread?.skills?.length||G.unread?.gems?.length||G.unread?.carts?.length||G.unread?.boards?.length||dotOn('skills')):g.k==='menu' ? dotOn('col')||logNew() : g.k==='char' ? passPoints()>0&&tabOpen('tree') : dotOn(g.k);
    return `<button class="tab${current?' on':''}${locked?' lock':''}" data-focus="nav-${g.k}" aria-label="${g.n}" ${locked?`aria-describedby="nav-lock-${g.k}"`:dot?`aria-describedby="nav-new-${g.k}"`:""} aria-current="${current?'page':'false'}"  onclick="${locked?`lockTip('${g.k}')`:`openModal('${g.k}')`}">${spr(g.icon,24)}<span>${g.n}</span>${locked?`<span class="uxsr" id="nav-lock-${g.k}">等級 ${TAB_LVL[g.k]} 解鎖，按下查看說明</span>`:''}${dot&&!locked?`<i class="rd" aria-hidden="true"></i><span class="uxsr" id="nav-new-${g.k}">有新內容</span>`:''}</button>`;
  }).join('');
}
function uiTitle(){
  const box=document.querySelector('#modal > .mbox');if(!box)return;
  let el=$('mttl');if(!el){el=document.createElement('div');el.id='mttl';box.insertBefore(el,$('mbody'));}
  const root=UI_NAV.find(g=>g.pages.includes(modalTab)),back=root&&modalTab!==root.k&&modalTab!=='tree';
  const rankBack=modalTab==='rank'&&RANK_UI.open,backName=rankBack?'排行榜':root?.n;
  const hk=MHELP[modalTab],cz=uiBattleSize();document.body.classList.toggle('battle-fold',!GAME_VIEW.watch&&((MOB()&&cz===3)||GAME_VIEW.prefs.hideBattle));
  uiSyncBattleFrame();if(typeof installPlayStyle==='function')installPlayStyle();
  if(typeof lootWorldStyles==='function'){lootWorldStyles();lootBattleRestore();}
  if(typeof audSyncBattle==='function')audSyncBattle(!GAME_VIEW.watch&&(document.body.classList.contains('battle-fold')||!!GAME_VIEW.prefs.hideBattle));
  el.innerHTML=`<h2>${UI_TITLE[modalTab]||'更多'}</h2>${hk?`<button aria-label="${HELP[hk][0]}" onclick="showHelp('${hk}')">?</button>`:''}${MOB()?`<button aria-label="${document.body.classList.contains('battle-fold')?'顯示戰場':'切換戰場大小，目前'+CZN[cz]}" onclick="${document.body.classList.contains('battle-fold')?'restoreBattleView()':'cycleCz()'}">${document.body.classList.contains('battle-fold')?'展':CZN[cz]}</button>`:''}${back?`<button class="window-back" aria-label="返回${backName}" title="返回${backName}" onclick="${rankBack?'rankOpen(null)':`openModal('${root.k}')`}">←</button>`:''}`;
}
function uiSegments(key,items,label){return `<div class="ui-segments" role="group" aria-label="${label}">${items.map(([id,name,tip,dot])=>`<button aria-pressed="${UI_WORK[key]===id}"${tip?` data-tip="${uxEsc(tip)}"`:''} data-focus="${key}-${id}" onclick="uiWork('${key}','${id}')">${key==='adventure'&&id==='season'?'<img src="'+studioMachine('core')+'" alt="" width="24" height="24">':''}${name}${dot?'<i class="rd" aria-hidden="true"></i><span class="uxsr">有新內容</span>':''}</button>`).join('')}</div>`;}
function uiWork(key,id){
  const allowed={inventory:['active','support','cart'],craftSlot:Object.keys(SLOTN),craftAct:Object.keys(CRAFT),adventure:['maps','city','tower','training','season','rift']};
  if(!allowed[key]?.includes(id))return;UI_WORK[key]=id;renderModal();
}
function uiMenuHtml(){return deviceMenuHtml();}

function charSegHtml(){return `<div class="ui-segments" role="group" aria-label="角色分頁"><button aria-pressed="${modalTab==='char'}" data-focus="char-stats" onclick="openModal('char')">總覽</button><button aria-pressed="${modalTab==='tree'}" data-focus="char-talent"${tabOpen('tree')?'':' class="lock"'} onclick="${tabOpen('tree')?"openModal('tree')":"lockTip('tree')"}">${tabOpen('tree')?'天賦':'天賦 Lv'+TAB_LVL.tree}${passPoints()>0&&tabOpen('tree')?' <span class="attention-dot" role="img" aria-label="有可用天賦點">●</span>':''}</button><button aria-pressed="${modalTab==='dress'}" data-focus="char-dress" onclick="openModal('dress')">裝扮</button></div>`;}
let UI_CHARACTER_PICK = null, UI_CHARACTER_STAGE_VISIT = '';
function uiCharacterCode(id=G.char){return {street:'PULSE',frost:'SPECTRUM',beep:'TRACKER',volt:'MECHANIST'}[id]||'';}
function uiCharacterIdentity(){
  const c=CHARS[G.char];
  return `<div class="cv-identity" role="group" aria-label="目前角色"><div><span class="cv-kicker">${uxEsc(c.title||c.d)}</span><h3>${uxEsc(G.heroName||'未命名')}<span>Lv. ${G.lvl}</span></h3></div><button class="mb" data-focus="character-switch" onclick="uiChooseCharacter()">角色列表 ↗</button></div>`;
}
function uiCharacterStage(dress=false){
  const c=CHARS[G.char],visit=modalTab+':'+G.char,arrive=UI_CHARACTER_STAGE_VISIT!==visit;UI_CHARACTER_STAGE_VISIT=visit;
  return `<div class="cv-stage${arrive?' cv-arrive':''}" aria-label="${uxEsc(c.n)}角色展示"><span class="cv-code" aria-hidden="true">${uxEsc(uiCharacterCode())}</span><span class="cv-stage-label" aria-hidden="true">${dress?'STYLE / 外觀':'CHARACTER / 角色'}</span><div id="pvhost" class="cv-preview" aria-label="${dress?'外觀試穿':'目前角色'}3D 預覽"><div class="cv-fallback"><span>${uxEsc(c.n)}</span><small id="cv-preview-status">正在準備角色…</small><button class="mb" hidden id="cv-preview-retry" onclick="dressRetry()">重試預覽</button></div></div><div class="cv-phone">${phoneButtonHtml()}<span>個人手機</span></div><blockquote class="cv-quote">「${uxEsc(c.quote||c.title||c.d)}」</blockquote><div class="cv-stage-footer"><span>${uxEsc(c.role||c.title||'')}</span>${dressPreviewControls()}</div></div>`;
}
function uiCharacterProfile(){
  const [bm,bd]=G.born;
  return `<details class="cv-profile"><summary>個人資料</summary><label for="hname">玩家暱稱<input id="hname" maxlength="12" value="${uxEsc(G.heroName||'')}" onchange="setName(this.value)"></label><p>生日 ${bm} / ${bd} · ${STAR_SIGNS[bm-1]}</p><p>${rankOf()}</p></details>`;
}
function uiCharacterStats(){
  const s=G.st;
  return `<section class="cv-performance" aria-label="戰鬥能力摘要"><div class="cv-stat cv-stat-main"><span>DPS</span><strong>${tFmt(s.dps)}<small>DPS</small></strong></div><div class="cv-stat"><span>最大生命</span><strong>${tFmt(s.life)}</strong></div><div class="cv-stat"><span>會心率</span><strong>${s.crit.toFixed(0)}<small>%</small></strong></div><div class="cv-stat"><span>傷害減免</span><strong>${(s.red*100).toFixed(0)}<small>%</small></strong></div></section><details class="cv-detail"><summary>完整能力與計算說明</summary><dl class="ui-stat-list">${[['普通攻擊傷害',tFmt(s.hit)],['每秒普通攻擊',s.aps.toFixed(2)+' 次'],['會心傷害',s.cm.toFixed(0)+'%'],['護甲',tFmt(s.armor)],['基礎生命回復',s.regen.toFixed(1)+' / 秒']].map(([n,v])=>`<div><dt>${n}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="uxmeta">直傷預估不含持續傷害、條件連動及角色專技。回復仍受戰鬥上限影響，實際傷害可到冒險的訓練場測量。</p></details>`;
}
function uiChooseCharacter(){careerProfiles();}
function uiConfirmCharacter(){careerProfiles();}
function uiCharacterHtml(){return uiCharacterSheetHtml();}

/* 共用物品格：精簡讀數，完整名稱與屬性由點選詳情取得。 */
function uiMapThumbSvg(m){const B=BIOMES[m.biome],blocky=m.biome>=4;let h=0;for(const ch of String(m.id))h=(h*31+ch.charCodeAt(0))>>>0;const sp=[[26,22],[50,18],[36,30],[56,27],[20,27],[44,25]];let o='';for(let i=0;i<4;i++){const [x,y]=sp[(h+i*2)%sp.length],big=(h>>(i+3))&1?1:0.8;o+=blocky?`<path d="M${x-4*big} ${y}h${8*big}v${-7*big}h${-8*big}z" fill="${i%2?B.t1:B.t2}"/><path d="M${x-4*big} ${y-7*big}l${4*big} ${-3*big}l${4*big} ${3*big}z" fill="${B.board.l}"/>`:`<path d="M${x} ${y-12*big}l${5*big} ${12*big}h${-10*big}z" fill="${i%2?B.t1:B.t2}"/><path d="M${x-1} ${y}h2v3h-2z" fill="${B.board.d}"/>`;}return `<svg class="ui-mapthumb" viewBox="0 0 80 56" aria-hidden="true"><ellipse cx="40" cy="50" rx="34" ry="5" fill="#0002"/><path d="M4 24L40 42v9L4 33z" fill="${B.board.d}"/><path d="M76 24L40 42v9l36-18z" fill="${B.board.m}" opacity=".85"/><path d="M40 6L76 24L40 42L4 24z" fill="${B.board.l}" stroke="${B.board.d}" stroke-width="1"/><ellipse cx="40" cy="24" rx="7" ry="3.5" fill="${B.portal}" opacity=".75"/><ellipse cx="40" cy="23" rx="3.5" ry="1.8" fill="${B.glow}"/>${o}</svg>`;}
const UI_THUMB={};
function uiMapThumb(m){const u3=typeof icon3dMapUrl==='function'?icon3dMapUrl(m):'';if(u3)return `<img class="ui-mapthumb" alt="" aria-hidden="true" src="${u3}" style="image-rendering:pixelated">`;   // 地圖縮圖：向量圖先縮成 40×28 再像素化放大，和 3D 畫面的低畫質感一致
  const svg=uiMapThumbSvg(m),key=m.id+':'+m.biome,url=UI_THUMB[key];
  if(url)return `<img class="ui-mapthumb" alt="" aria-hidden="true" src="${url}" style="image-rendering:pixelated">`;
  if(url===undefined){UI_THUMB[key]='';const img=new Image();img.onload=()=>{try{const c=document.createElement('canvas');c.width=40;c.height=28;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.drawImage(img,0,0,40,28);UI_THUMB[key]=c.toDataURL('image/png');if(typeof renderModal==='function'&&!$('modal').hidden)renderModal();}catch(e){UI_THUMB[key]=null;}};img.onerror=()=>{UI_THUMB[key]=null;};img.src='data:image/svg+xml;charset=utf8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" '));}
  return svg;
}
function uiMapCard(m){const B=BIOMES[m.biome],c=mapChallenge(m.mods);return `<button type="button" class="ui-mapcard" data-focus="map-${uxEsc(m.id)}" aria-label="${uxEsc(B.n)}，等級 ${m.lvl}，挑戰詞綴 ${c}，查看詳情" style="--b1:${B.board.l};--b2:${B.board.m};--b3:${B.board.d};--t1:${B.t1};--t2:${B.t2}" onclick="uiInspectMap('${encodeURIComponent(m.id).replace(/'/g,'%27')}')">${uiMapThumb(m)}<b>${uxEsc(B.n)}${playNewBadge('maps',m.id)}</b><span class="lv">Lv. ${m.lvl}</span><span class="ch">挑戰詞綴 ${c}</span></button>`;}
function rarityBadge(r){const i=Math.max(0,Math.min(3,r|0));return `<span class="rarity-tag rarity-${i}" data-rarity="${i}"><i aria-hidden="true">${['▪','◇','◆','✦'][i]}</i>${['普通','魔法','稀有','傳奇'][i]}</span>`;}
function uiItemTile({focus,icon,name,meta='',state='',action,rarity=0,tip='',fresh=false}){return `<button type="button" class="ui-item-tile"${tip?` data-tip="${uxEsc(tip)}"`:''} data-rarity="${rarity}" style="--item-rarity:${RAR[rarity]?.c||'var(--ux-edge)'}" data-focus="${uxEsc(focus)}" aria-label="${uxEsc(name)}，${fresh?'新獲得，':''}${RAR[rarity]?RAR[rarity].n+'，':''}${uxEsc(meta)}${state?'，'+uxEsc(state):''}，查看詳情" onclick="${action}"><span class="ui-item-state">${uxEsc(state)}</span>${icon}${fresh?'<i class="item-new-dot" role="img" aria-label="新獲得"></i>':''}${rarityBadge(rarity)}<b>${uxEsc(name)}</b><small>${uxEsc(meta)}</small></button>`;}
function uiGearState(it){return G.equip[it.slot]===it?'穿著':it.kept?'鎖定':gearReferenced(it)?'構築':G.equipBackup[it.slot]===it?'上一件':it.cr?'腐化':it.lk!=null?'詞綴鎖':'';}
function uiGearTile(it,core=false){return uiItemTile({focus:core?'core-'+it.lg:'gear-'+it.uid,icon:core?xico('legend',it.lg,28):eqico(it.slot,it.r,52,it),name:it.name,meta:`Lv. ${it.il} · ${it.aff.length?'T'+Math.min(...it.aff.map(a=>affTier(a,it.il))):RAR[it.r].n}`,fresh:noticeHas(core?'cores':'gear',core?it.lg:it.uid),state:uiGearState(it)||'',action:core?`uiInspectCore('${it.lg}')`:`uiInspectGear(${it.uid})`,rarity:it.r,tip:[it.name+'（'+SLOTN[it.slot]+' · '+RAR[it.r].n+'）',...itemLines(it).map(l=>l.t)].join('\n')});}
function uiEquippedTile(slot){const it=G.equip[slot];return it?uiItemTile({focus:'equipped-'+slot,icon:it.lg?xico('legend',it.lg,28):eqico(slot,it.r,52,it),name:it.name,meta:`${SLOTN[slot]} · Lv. ${it.il}`,state:'穿著',action:`uiInspectEquipped('${slot}')`,rarity:it.r}):`<button class="ui-item-tile ui-item-empty" data-focus="equipped-${slot}" aria-label="${SLOTN[slot]}空欄位，前往背包選擇裝備" onclick="openModal('warehouse')">${eqico(slot,0,52)}<b>${SLOTN[slot]}</b><small>空欄位 · 選擇裝備</small></button>`;}
function uiInspectEquipped(slot){const it=G.equip[slot];if(!it)return;if(it.lg)return uiInspectCore(it.lg);if(G.inventory.includes(it))return uiInspectGear(it.uid);showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[slot]} · ${RAR[it.r].n} · 物品等級 ${it.il} · 穿著中</p><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><p class="uxmeta">${it.lg?gearSourceLabel(it.lg):'一般冒險與地圖掉落'}</p><button class="mb" data-initial-focus onclick="hideOverlay()">返回角色</button>`);}
function uiGearComparison(it){const next=calc({...G.equip,[it.slot]:it}),current=G.st;return `<dl class="ui-stat-list"><div><dt>預估傷害</dt><dd>${tFmt(current.dps)} → ${tFmt(next.dps)}</dd></div><div><dt>最大生命</dt><dd>${tFmt(current.life)} → ${tFmt(next.life)}</dd></div><div><dt>會心率</dt><dd>${current.crit.toFixed(1)}% → ${next.crit.toFixed(1)}%</dd></div></dl>`;}
function uiInspectCore(id){const it=G.armory[id];if(!it)return;noticeRead('cores',id);const on=G.equip[it.slot]===it,back=modalTab==='warehouse'?'返回倉庫':'返回收藏';showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · 暗金 · 物品等級 ${it.il}${on?' · 穿著中':''}</p><p>${uxEsc(LEGEND_BY[id].d)}</p><p class="uxmeta">${gearSourceLabel(id)}</p>${uiGearCompareSheet(it)}<div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">${back}</button><button class="mb pri" ${on||!canUseGear(it)?'disabled':''} onclick="uiEquipCore('${id}')">${on?'已裝備':!canUseGear(it)?'角色不符':'換上'+uxEsc(it.name)}</button></div>`);}
function uiCoreCollection(){const ids=Object.keys(LEGEND_BY).filter(id=>G.armory[id]);return `<button class="mb" onclick="uiCityGo()">城市遠征 · 定向追求核心</button><details class="ui-section ui-core-collection"><summary>傳奇核心收藏 ${ids.length}／${Object.keys(LEGEND_BY).length}</summary><p>角色專裝：雜兵 0.001%、精英 0.01%、BOSS 0.1% 各自抽一件，不受一般暗金保底影響，僅對應職業可裝備。</p>${ids.length?`<div class="ui-item-grid ui-core-grid" role="group" aria-label="核心收藏">${ids.map(id=>uiGearTile(G.armory[id],true)).join('')}</div>`:'<p>尚未收藏核心。冒險掉落或城市定向合成都會加入這裡。</p>'}<details><summary>收藏與重複品規則</summary><p>職業專裝只可由對應職業裝備，保留在各角色的收藏。專裝另作獨立掉落判定，不受暗金保底或城市合成影響。同款保留一件。穿著、構築引用、詞綴鎖定或腐化的核心不會自動替換。重複品提供零件及殘晶，打造可提高核心等級。</p></details><div class="uxactions">${Object.keys(SLOTN).filter(slot=>G.equipBackup[slot]).map(slot=>`<button class="mb" onclick="uiRestoreEquipment('${slot}')">切回上一件${SLOTN[slot]}</button>`).join('')}</div></details>`;}
function uiEquipCore(id){ if(equipCore(id)){hideOverlay();renderModal();uxAnnounce(`已換上${LEGEND_BY[id].name}，可切回上一件裝備。`);} }
function uiRestoreEquipment(slot){ if(restoreEquipment(slot)){renderModal();uxAnnounce(`已切回上一件${SLOTN[slot]}。`);} }
function uiRevealSelection(){/* Selection keeps the current reading position. */}
function uiApplyLayout(initial=false){
  const desktop=innerWidth>=1180,wasDesktop=DESK();
  document.body.classList.toggle('d',desktop);document.body.classList.toggle('m',!desktop);
  if(!initial&&desktop===wasDesktop)return;
  if(!initial){uiTitle();return;}
  $('modal').hidden=false;modalTab=desktop?'skills':'char';renderModal(true);
}
function uiInitLayout(){
  const st=document.createElement('style');st.id='layoutstyles';st.textContent=UI_LAYOUT_CSS;document.head.appendChild(st);
  const menu=document.createElement('div');menu.id='mmenu';menu.hidden=true;
  // 指令仍使用引擎原有的事件處理，不建立另一套設定狀態。
  $('mbody').appendChild(menu);
  const b=$('btns');if(b){menu.appendChild(b);b.querySelectorAll('.act').forEach(x=>{if(['技能','天賦盤','地圖','存檔'].includes(x.textContent.trim()))(x.closest('.stepwrap')||x).style.display='none';});}
  const settings=document.createElement('div');settings.id='uisettings';settings.hidden=true;settings.innerHTML='<section class="ui-settings-intro"><h3>戰鬥與工具</h3></section>';settings.appendChild(menu);document.querySelector('#modal > .mbox').appendChild(settings);uiInstallSettings();
  uiApplyLayout(true);let frame;
  addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>uiApplyLayout());});
}
const UI_LAYOUT_CSS=`
body.m.battle-fold>canvas,body.m.battle-fold>.world-travel{display:none!important}
body.m .stage{min-width:0;max-width:100%;overflow:hidden}body.m #fig{max-width:100%;overflow:hidden}

/* Character cover: scoped business variant; the global blue-violet shell stays unchanged. */
.character-view{--cv-ink:#241d59;--cv-blue:#4141bb;--cv-signal:#8bdeff;--cv-accent:#e4ff74;--cv-paper:#f4f5ff;container-type:inline-size}
.character-view[data-character="frost"]{--cv-signal:#bdb3ff;--cv-accent:#9bffe1}
.character-view[data-character="beep"]{--cv-signal:#ffc7b0;--cv-accent:#ffec7c}
.character-view[data-character="volt"]{--cv-signal:#a5eed3;--cv-accent:#ffd178}
body.ui-material #mbody .character-view .ui-segments{margin-bottom:10px}
body.ui-material #mbody .cv-identity{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:3px 0 10px;min-width:0;color:var(--cv-ink)}
body.ui-material #mbody .cv-identity>div{min-width:0}
body.ui-material #mbody .cv-kicker{font:12px/1.4 var(--ux-body);letter-spacing:.08em;color:var(--cv-blue)}
body.ui-material #mbody .cv-identity h3{display:flex;align-items:baseline;gap:10px;margin:2px 0 0;font:27px/1.25 var(--ux-display);color:var(--cv-ink)}
body.ui-material #mbody .cv-identity h3>span{font:13px var(--ux-body);white-space:nowrap}
body.ui-material #mbody .cv-identity>.mb{font-size:13px!important;min-height:44px;flex:none;padding:7px!important}
body.ui-material #mbody .cv-stage{position:relative;isolation:isolate;height:330px;overflow:hidden;background:linear-gradient(155deg,var(--cv-signal) 0 47%,#e8edff 47% 100%);border:2px solid var(--cv-ink);box-shadow:3px 3px 0 var(--cv-ink);margin:0 3px 0 0;color:var(--cv-ink)}
.cv-stage::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.25;background:repeating-linear-gradient(135deg,transparent 0 28px,#ffffffb0 28px 30px);pointer-events:none}
.character-view[data-character="frost"] .cv-stage::before{background:repeating-radial-gradient(circle at 32% 48%,transparent 0 20px,#ffffffc0 21px 23px,transparent 24px 38px)}
.character-view[data-character="beep"] .cv-stage::before{background:repeating-linear-gradient(0deg,transparent 0 35px,#ffffffd0 35px 37px),repeating-linear-gradient(90deg,transparent 0 35px,#ffffffd0 35px 37px)}
.character-view[data-character="volt"] .cv-stage::before{background:repeating-linear-gradient(90deg,transparent 0 30px,#ffffffd0 30px 45px,transparent 45px 70px);transform:skewY(-18deg)}
body.ui-material #mbody .cv-code{position:absolute;left:3%;top:23px;right:0;z-index:0;font:clamp(80px,29cqw,152px)/1 var(--ux-display);letter-spacing:-.08em;color:var(--cv-blue);transform:skewY(-8deg);white-space:nowrap;pointer-events:none;user-select:none}
body.ui-material #mbody .cv-stage-label{position:absolute;left:10px;top:9px;z-index:3;font:11px/1 var(--ux-body);letter-spacing:.1em}
body.ui-material #mbody .cv-preview{position:absolute;left:0;right:68px;top:30px;bottom:42px;z-index:1}
.cv-preview canvas{position:relative;z-index:1}
.cv-fallback{position:absolute;inset:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px;text-align:center;background:var(--cv-paper);font:14px/1.5 var(--ux-body)}
.cv-preview[data-preview="ready"] .cv-fallback{display:none}
.cv-preview[data-preview="failed"] .cv-fallback{z-index:4}
.cv-fallback [hidden]{display:none!important}
body.ui-material #mbody .cv-phone{position:absolute;right:10px;top:56px;z-index:2;width:76px;display:flex;flex-direction:column;gap:5px;align-items:center}
body.ui-material #mbody .cv-phone .ph-open{position:relative;inset:auto;width:76px;height:108px;min-height:108px!important;border:1px solid #fff!important;outline:1px solid var(--cv-ink);border-radius:0!important;background:#eef0ff8c!important;box-shadow:2px 2px 0 #241d5933!important}
.cv-phone .ph-mini2{transform:scale(.7)}
.cv-phone>span{font:11px/1.3 var(--ux-body);background:var(--cv-paper);padding:3px 5px}
body.ui-material #mbody .cv-quote{position:absolute;right:10px;top:189px;width:90px;margin:0;z-index:3;padding:7px 5px;background:var(--cv-accent);font:12px/1.55 var(--ux-body);color:var(--cv-ink);border:1px solid var(--cv-ink);box-shadow:2px 2px 0 #241d5926;transform:rotate(-3deg)}
body.ui-material #mbody .cv-stage-footer{position:absolute;inset:auto 0 0;min-height:44px;padding:0 8px;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:5px;background:var(--cv-blue);color:#fff}
.cv-stage-footer>span{font:11px/1.5 var(--ux-body);min-width:0;max-width:58%;overflow-wrap:anywhere}
.cv-rotate{display:flex;align-items:center;gap:3px;flex:none}
body.ui-material #mbody .cv-rotate>.mb{min-width:44px;min-height:44px;height:auto!important;padding:2px 5px!important;font:12px var(--ux-body)!important;background:transparent!important;border:0!important;box-shadow:none!important;color:#fff!important}
body.ui-material #mbody .cv-rotate>.mb:hover{background:#ffffff26!important}
body.ui-material #mbody .cv-rotate>.mb:focus-visible{outline:2px solid var(--cv-accent)!important;outline-offset:-3px}
body.ui-material #mbody .cv-loadout{padding:14px 0 8px}
.cv-section-label{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;color:var(--cv-ink);font:14px/1.4 var(--ux-body)}
body.ui-material #mbody .cv-section-label>h3{font:17px/1.4 var(--ux-display);margin:0;color:var(--cv-ink)}
body.ui-material #mbody .cv-section-label>.mb{font-size:12px!important;min-height:44px;padding:4px 6px!important}
body.ui-material #mbody .character-view .ui-equipment{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:5px 0 0}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile{position:relative;min-width:0;min-height:124px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;padding:7px 5px 5px!important;background:linear-gradient(#f7f9ff 0 65%,#dfe4f5 65%)!important;border:1px solid #fff!important;border-bottom:3px solid var(--item-rarity,var(--ux-edge))!important;border-radius:0!important;outline:1px solid #7f88ae;box-shadow:2px 2px 0 #7f88ae44!important;color:var(--cv-ink)!important}
body.ui-material #mbody .character-view .ui-equipment .ui-item-state{position:static;align-self:flex-start;font:10px/1.4 var(--ux-body);color:#445274;background:none;min-height:14px;padding:0}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile>.spr{flex:none;width:52px!important;height:52px!important;margin:0!important;object-fit:contain}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile>b{font:12px/1.4 var(--ux-body)!important;color:var(--cv-ink)!important;white-space:normal;overflow-wrap:anywhere;max-width:100%;text-align:center;display:block;-webkit-line-clamp:unset;min-height:1.4em}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile>small{margin-top:auto;font:10px/1.4 var(--ux-body)!important;color:#445274!important;text-align:center}
body.ui-material #mbody .character-view .ui-equipment button:hover{outline:2px solid var(--cv-blue);transform:translateY(-1px)}
body.ui-material #mbody .character-view .ui-equipment button:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:2px}
body.ui-material #mbody .cv-performance{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--cv-ink);border:2px solid var(--cv-ink);margin:10px 0 8px}
body.ui-material #mbody .cv-stat{padding:11px 12px;background:#f3f3ff;color:var(--cv-ink);min-width:0}
body.ui-material #mbody .cv-stat-main{background:var(--cv-blue);color:#fff}
.cv-stat>span{display:block;font:12px/1.4 var(--ux-body)}
body.ui-material #mbody .cv-stat>strong{display:block;margin-top:3px;font:25px/1.2 var(--ux-display);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.cv-stat strong>small{font:12px var(--ux-body);margin-left:5px}
body.ui-material #mbody .cv-signature{margin:18px 0;padding:10px 12px 12px;border-left:5px solid var(--cv-blue);background:linear-gradient(110deg,#ffffffb0,transparent);color:var(--cv-ink)}
body.ui-material #mbody .cv-signature>h3{font:22px/1.3 var(--ux-display);margin:4px 0 6px;background:none;border:0;color:var(--cv-ink)}
.cv-signature>p,.cv-roster-detail>p{font:14px/1.65 var(--ux-body);margin:5px 0}
body.ui-material #mbody .cv-progress{font:12px/1.6 var(--ux-body);color:var(--ux-muted);margin:12px 0}
.cv-detail>p,.cv-profile>p{font:13px/1.6 var(--ux-body)}
.cv-profile label{display:block;font:14px/1.5 var(--ux-body);padding:10px 0}
body.ui-material #mbody .cv-profile input{display:block;max-width:100%;width:240px;min-height:44px;font:16px var(--ux-body);margin-top:5px}
.cv-wardrobe{padding-top:15px}
.cv-wardrobe .dcats{display:flex;gap:5px;margin:8px 0}
body.ui-material #mbody .cv-wardrobe .dcats>.mb{flex:1;min-height:44px;font:14px var(--ux-body)!important}
body.ui-material #mbody .cv-wardrobe .dcats>.mb[aria-pressed="true"]{background:var(--cv-blue)!important;color:#fff!important}
.cv-styles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
body.ui-material #mbody .cv-style{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:120px;padding:7px 5px!important;white-space:normal;font:12px/1.4 var(--ux-body)!important;min-width:0;border-radius:0!important}
.cv-style-art{height:56px;display:flex;align-items:center;justify-content:center}
.cv-style-art>img{object-fit:contain;image-rendering:pixelated}
.cv-style>small{font:11px/1.3 var(--ux-body);margin-top:auto}
body.ui-material #mbody .cv-style[aria-pressed="true"]{outline:2px solid var(--cv-blue)!important;background:var(--cv-blue)!important;color:#fff!important}
body.ui-material #mbody .cv-style[aria-pressed="true"]>small{color:#fff}
body.ui-material #mbody .cv-dress-action{margin:14px 0 10px;padding:12px;border-left:5px solid var(--cv-blue);background:#f4f6ff}
.cv-dress-action strong{font:18px var(--ux-display)}
.cv-dress-action p{font:13px/1.5 var(--ux-body);margin:6px 0 10px}
.cv-dress-action .uxactions{display:flex;flex-wrap:wrap;gap:7px}
body.ui-material #mbody .cv-dress-action .pri{background:var(--cv-blue)!important;color:#fff!important}
body.ui-material #mbody .cv-dress-action button:disabled{background:#ccd3e1!important;color:#596880!important}
body.ui-material #ovl .cv-roster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
body.ui-material #ovl .cv-roster>.mb{min-width:0;min-height:130px;display:flex;flex-direction:column;align-items:center;gap:4px;white-space:normal;padding:8px!important;font:14px/1.5 var(--ux-body)!important}
.cv-roster img{image-rendering:pixelated;object-fit:contain;background:#c9d5f7;flex:none}
.cv-roster small{font:12px var(--ux-body)}
body.ui-material #ovl .cv-roster>.mb[aria-pressed="true"]{background:var(--ux-blue-face)!important;color:#fff!important;outline:2px solid var(--ux-focus)}
.cv-roster-detail{padding:10px;background:#edf0fc;color:var(--ux-ink);border-left:4px solid var(--ux-blue)}
.cv-roster-detail h3{font:18px/1.5 var(--ux-display);margin:0 0 6px}
@keyframes cv-cover-enter{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
@keyframes cv-code-enter{from{opacity:0;transform:translateX(-14px) skewY(-8deg)}to{opacity:1;transform:skewY(-8deg)}}
.cv-arrive .cv-preview{animation:cv-cover-enter .5s ease-out both}
.cv-arrive .cv-code{animation:cv-code-enter .4s ease-out both}
@media(max-width:559px){body.ui-material #mbody .cv-stage{height:260px}body.ui-material #mbody .cv-preview{right:62px;top:22px;bottom:40px}body.ui-material #mbody .cv-phone{right:7px;top:39px;width:65px}body.ui-material #mbody .cv-phone .ph-open{width:65px;height:96px;min-height:96px!important}body.ui-material #mbody .cv-quote{right:7px;top:165px;width:75px;font-size:11px;padding:4px;line-height:1.4}.cv-stage-footer>span{max-width:55%;font-size:10px}body.ui-material #mbody .cv-identity h3{font-size:24px}body.ui-material #mbody .character-view .ui-equipment .ui-item-tile{min-height:117px}.cv-rotate{gap:0}}
@media(max-height:680px) and (max-width:559px){body.ui-material #mbody .cv-stage{height:215px}body.ui-material #mbody .cv-quote{display:none}body.ui-material #mbody .cv-phone{top:35px}}
@media(max-width:359px){body.ui-material #mbody .cv-identity h3{font-size:22px;gap:6px}body.ui-material #mbody .cv-identity>.mb{font-size:12px!important}body.ui-material #mbody .cv-stat{padding:9px}body.ui-material #mbody .cv-stat>strong{font-size:22px}.cv-styles{grid-template-columns:repeat(2,minmax(0,1fr))}body.ui-material #mbody .cv-rotate>.mb{min-width:44px;padding:2px 4px!important}}
@media(prefers-reduced-motion:reduce){.cv-arrive .cv-preview,.cv-arrive .cv-code{animation:none}body.ui-material #mbody .character-view .ui-equipment button:hover{transform:none}}
@media(forced-colors:active){body.ui-material #mbody .cv-stage,body.ui-material #mbody .cv-stat,body.ui-material #mbody .cv-stage-footer{background:Canvas;color:CanvasText;border:1px solid CanvasText}.cv-stage::before,.cv-code{display:none}body.ui-material #mbody .cv-rotate>.mb{color:ButtonText!important;border:1px solid ButtonText!important}}

.ui-feedback{display:grid;gap:12px;max-width:680px;margin:auto}.ui-feedback label{display:grid;gap:6px}.ui-feedback input,.ui-feedback textarea,.ui-feedback select{width:100%;min-height:44px;padding:10px;border:1px solid var(--ux-frame);background:var(--ux-lcd);color:var(--ux-ink)}.ui-feedback textarea{resize:none;min-height:160px}.ui-feedback .ui-feedback-consent{display:flex;align-items:center;gap:8px}.ui-feedback-consent input{width:24px;min-height:24px}.ui-feedback-error{color:#982b25;min-height:24px}.ui-feedback-preview{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--ux-lcd);padding:12px;border:1px solid var(--ux-edge)}

body.d{grid-template-columns:minmax(0,1fr) clamp(480px,34vw,620px)!important;grid-template-areas:"hd rt" "st rt"!important;grid-template-rows:48px minmax(0,1fr);height:100dvh;max-width:1920px;overflow:hidden;padding:16px 18px 34px!important;gap:12px 16px}
body.d>.rpg,body.m>.rpg{display:none!important}body.d>header{grid-area:hd;align-self:center;margin:0;padding:0 8px}body.d>header h1 .wm{width:194px!important}body.d .stage{grid-area:st;min-width:0;align-self:start;position:relative;margin:0;padding-bottom:40px}body.d #fig{width:100%;margin:0}
body.d #modal{grid-area:rt;position:relative;inset:auto;width:100%;height:100%;min-height:0;top:0;align-self:stretch}body.d #modal>.mbox{padding:0!important;display:flex;flex-direction:column;overflow:hidden;height:100%;background:var(--ux-screen)!important}body.d #modal>.mbox::before{display:none}
body.m{padding-bottom:env(safe-area-inset-bottom)!important}body.m #mtabs{position:static!important;flex:none;height:auto!important;padding:5px 5px 4px!important;box-shadow:inset 0 -1px #fff!important;border:0!important;border-bottom:1px solid var(--ux-edge)!important}body.m #mtabs .tab{min-height:48px}
body.d #mtabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;flex:none;margin:0;padding:7px;border-bottom:1px solid var(--ux-edge)}
body.d #mtabs .tab{min-width:0;min-height:56px;display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;padding:5px 2px!important;font:13px system-ui,sans-serif;position:relative;border-radius:7px!important;background:transparent!important;border:1px solid transparent!important;box-shadow:none!important;text-shadow:none}
body.d #mtabs .tab.on{background:var(--ux-blue)!important;color:#fff!important;border-color:#2446a1!important;box-shadow:inset 0 1px 0 #ffffff66,0 2px 0 #203f87!important}
#mtabs .rd{position:absolute;right:7px;top:5px}#mtabs .lock{opacity:.6}
#mttl{flex:none;display:flex;align-items:center;gap:8px;min-height:52px;padding:6px 12px;background:var(--ux-blue);color:#fff;border-bottom:1px solid #244691}
#mttl h2{margin:0;flex:1;font:18px/1.3 "Cubic 11",system-ui,sans-serif;letter-spacing:.02em}#mttl button{min-width:44px;min-height:40px;padding:4px;border-radius:7px;border:1px solid #a9bce2;background:#edf3ff;color:var(--ux-ink);font:16px system-ui,sans-serif;box-shadow:inset 0 1px 0 #fff}
body.d #mbody,body.m #mbody{flex:1;min-height:0;overflow:auto;padding:12px;scroll-padding:12px;overscroll-behavior:contain;background:var(--ux-screen)}
body.d #uisettings,body.m #uisettings{flex:1;min-height:0;overflow:auto;padding:12px}#uisettings #mmenu,#uisettings #btns{position:static;max-width:none}#uisettings .actions{display:flex;gap:10px;flex-wrap:wrap}#uisettings .act{min-height:44px}
body.m #modal{min-height:0}body.m #mttl{min-height:44px;padding:4px 8px 4px 12px}body.m #mttl h2{font-size:16px}body.m #mttl button{width:44px;height:40px}body.m .stage{padding-bottom:38px}body.m #nexthint,body.d #nexthint{position:absolute;left:8px;bottom:4px;top:auto;transform:none;max-width:calc(100% - 16px);width:auto;min-height:30px;padding:4px 12px;border:1px solid var(--ux-edge);border-radius:6px;background:#eff5ff;font:12px/1.4 system-ui,sans-serif;color:var(--ux-ink);box-shadow:inset 0 1px 0 #fff}
body.d .stats{position:absolute;left:8px;right:8px;top:4px;margin:0;max-width:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-height:50px;padding:6px 12px!important;background:#f4f8ffe8}body.d .stats::before{display:none}body.d .stat .v{font-size:20px!important}body.d .stat .k{font-size:11px}
.ui-section,.ui-menu-group{margin:12px 0;padding:12px;border:1px solid #bac9e4;border-radius:9px;background:#fff}.ui-section h3,.ui-menu-group h3,.ui-inventory h3{font:15px/1.4 "Cubic 11",system-ui,sans-serif;margin:0 0 10px;color:var(--ux-ink)}
#mbody{font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}#mbody p{overflow-wrap:anywhere}#mbody .mc,#mbody .rc{box-shadow:none!important;border:1px solid #bdcae3!important;background:#f3f7ff!important;outline:none;padding:12px;border-radius:9px!important}#mbody .rh{background:none!important;box-shadow:none!important;color:var(--ux-muted);font:12px/1.4 system-ui,sans-serif;letter-spacing:0}
#mbody .mb,#mbody .pzbar button{min-height:44px;box-shadow:inset 0 1px 0 #fff,0 2px 0 #8396c0!important;border-radius:7px!important;font:13px/1.4 system-ui,sans-serif;letter-spacing:0}#mbody .mb.pri{box-shadow:inset 0 1px 0 #ffd9ce,0 2px 0 #a43b2d!important}
.ui-character-head{padding:16px;background:transparent}.ui-eyebrow{font-size:12px;color:var(--ux-muted)}.ui-character-head h3{display:flex;align-items:baseline;gap:12px;font:24px "Cubic 11",system-ui,sans-serif;margin:5px 0}.ui-character-head small{font:13px system-ui,sans-serif;color:var(--ux-muted)}.ui-character-head p{font-size:13px;margin:7px 0 12px}.ui-equipment{display:grid;grid-template-columns:1fr;gap:8px;margin:12px 0}.ui-equipment .nm{gap:12px}.ui-equipment .rc ul{font-size:13px;line-height:1.6}.ui-stat-list{margin:0}.ui-stat-list>div{display:flex;gap:12px;justify-content:space-between;border-bottom:1px solid #e2e9f5;padding:7px 0}.ui-stat-list dd{margin:0;font-variant-numeric:tabular-nums;font-weight:650}
.ui-segments{display:flex;gap:4px;padding:4px;margin:10px 0;background:#e4ecfa;border:1px solid #b7c7e6;border-radius:8px}.ui-segments>button{flex:1;min-width:0;min-height:40px;border:1px solid transparent;border-radius:5px;background:transparent;color:var(--ux-muted);font:13px system-ui,sans-serif;padding:5px}.ui-segments>button[aria-pressed="true"]{color:var(--ux-ink);background:#fff;border-color:var(--ux-edge);box-shadow:0 1px 2px #31467c20}
.ui-inventory{margin:16px 0}.ui-inventory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#mbody .gt{min-width:0;min-height:80px;border-radius:7px!important;padding:9px!important;position:relative;border-color:#aabbdc!important;box-shadow:none!important;font:13px/1.4 system-ui,sans-serif}#mbody .gt small{font:12px/1.5 system-ui,sans-serif}#mbody .gt .shp{grid-column:2/4;justify-self:start;margin-top:5px}.ui-inventory .skrow{grid-template-columns:1fr 1fr}.ui-inventory .gems{grid-template-columns:1fr}#mbody .gt[disabled]{opacity:1;filter:grayscale(.45);color:#64728e;background:#eaf0fa!important}#mbody .gt.on{outline:2px solid var(--ux-blue)}
#mbody .dpsbar{position:static!important;margin:8px 0;padding:10px;border:1px solid var(--ux-edge);border-radius:8px;background:#eaf1fd}.dpsbar>div:first-child{font:13px system-ui,sans-serif}.dpsbar>div:first-child b{font-size:22px;font-variant-numeric:tabular-nums}.shares{margin-top:6px}.shares span{font:11px system-ui,sans-serif!important}.uxinspect{scroll-margin-top:12px}#mbody .ui-map-grid{display:grid;grid-template-columns:1fr!important;gap:6px}#mbody .ui-mapcard{position:relative;display:block;width:100%;min-height:56px;padding:0!important;text-align:left;overflow:hidden;border:2px solid #fff!important;outline:1px solid #7d8bbd;border-radius:0!important;background:var(--b2)!important;color:#12202a!important;box-shadow:0 2px 0 #8c9bd0!important}#mbody .ui-mapcard i{position:absolute;inset:0;background:linear-gradient(180deg,var(--b1) 0 40%,var(--b2) 40% 70%,var(--b3) 70%);image-rendering:pixelated;opacity:.95}#mbody .ui-mapcard i::after{content:"";position:absolute;right:10px;bottom:8px;width:14px;height:14px;background:var(--t1);box-shadow:-18px 4px 0 -2px var(--t2),-34px 0 0 -3px var(--t1)}#mbody .ui-mapcard b,#mbody .ui-mapcard span{position:absolute;z-index:1;font-family:var(--ux-body)!important;text-shadow:1px 1px 0 #ffffffb0}#mbody .ui-mapcard b{left:8px;top:6px;font-size:14px}#mbody .ui-mapcard .lv{right:8px;top:6px;font-size:12px}#mbody .ui-mapcard .ch{left:8px;bottom:5px;font-size:12px}#mbody .ui-mapcard{min-height:64px!important;padding-left:88px!important;background:linear-gradient(90deg,var(--b3) 0 84px,var(--b1) 84px)!important}#mbody .ui-mapcard .ui-scene{width:auto;height:84px;max-width:100%;display:block;margin:0 auto 2px;image-rendering:pixelated}.ui-scene.tall{width:auto;height:120px;margin:0}.ui-towerbox{display:flex;align-items:center;gap:14px}.ui-towernum b{font-size:34px;line-height:1.1}.view-options.ui-scenes{grid-template-columns:repeat(auto-fit,minmax(88px,1fr))}.ui-scenebtn{display:flex!important;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;min-height:104px!important}.ui-scenes{margin-bottom:8px}.ui-scenebtn[aria-pressed=true]{outline:3px solid #ffd24d;outline-offset:-3px}.ui-scenebtn i{position:absolute;right:4px;top:2px;font-style:normal;color:#19865a;font-weight:700}.ui-mapthumb{position:absolute;left:4px;top:4px;width:78px;height:56px}#mbody .ui-mapcard b{left:92px!important}#mbody .ui-mapcard .ch{left:92px!important}.ui-shoprow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-top:1px dashed #9aa6d0}.ui-shoprow>div:first-child{min-width:0}.ui-shoprow b{display:block;font-size:14px}.ui-shoprow small{display:block;font-size:12px;opacity:.8}.ui-shopbtns{display:flex;flex-direction:column;gap:4px;flex:none}.ui-shopbtns .mb{font-size:12px;padding:4px 8px}.whact{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.whcard ul{margin:4px 0;padding-left:16px}.whcard .ui-stat-list{margin:4px 0}.uxinspect .uxeffect{font-weight:600}.uxinspect-head{flex-wrap:wrap}.uxinspect-head>b{flex:1}.uxinspect-head .shp{display:none}.uxinspect-head .uxboard-link{margin:0;min-height:40px}.uxinspect-head .uxquiet{margin:0}.uxgrid-help{margin:10px 0;font-size:12px}#mbody .pz{max-width:336px;margin:12px auto;gap:4px;padding:7px;background:#c4d0e8;border:1px solid #8e9fc6;border-radius:9px}#mbody .pzbar{position:static!important;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;background:none;border:0}#mbody .rz{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:8px 0}.ui-resolved article{padding:10px 0;border-bottom:1px solid #e1e8f4}.ui-resolved article>div{display:flex;align-items:center;gap:8px}.ui-resolved article>div>span:last-child{margin-left:auto;font-size:12px;color:var(--ux-muted)}.ui-resolved article p{font-size:13px;margin:5px 0;color:var(--ux-muted)}.ui-resolved details{margin-top:10px}.ui-resolved summary{min-height:36px;padding:8px 0}
.ui-directory{display:grid;gap:8px}.ui-directory button,.ui-wiki{display:flex;align-items:center;gap:10px;min-height:64px;padding:10px 12px;text-align:left;border:1px solid #b9c8e3;border-radius:7px;background:#f3f7ff;color:var(--ux-ink);font:14px system-ui,sans-serif}.ui-directory button{display:grid;grid-template-columns:auto 1fr auto;column-gap:12px;align-items:center}.ui-directory button .ui-obj3d{grid-row:1/3;grid-column:1}.ui-directory button b,.ui-directory button span{grid-column:2}.ui-directory button i{grid-column:3;grid-row:1/3}.ui-directory button b{font-weight:600}.ui-directory button span{font-size:12px;color:var(--ux-muted)}.ui-directory i{grid-column:2;grid-row:1/3;font-style:normal}.ui-wiki{width:100%;background:#e6eefa}.ui-wiki span{display:grid;gap:4px}.ui-wiki small{color:var(--ux-muted)}.ui-wiki i{margin-left:auto;font-style:normal}
.ui-craft-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.ui-craft-slots button{min-height:82px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:9px;border:1px solid #b1c1de;border-radius:8px;background:#eaf0fb;color:var(--ux-ink);font:13px system-ui,sans-serif}.ui-craft-slots button[aria-pressed="true"]{border:2px solid var(--ux-blue);background:#fff}.ui-craft-slots small{font-size:11px}.ui-craft-wallet{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:baseline;padding:6px 0}.ui-craft-wallet strong{font:22px "Cubic 11",system-ui,sans-serif}.ui-craft-detail>ul{list-style:none;padding:0;margin:12px 0}.ui-craft-detail li{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #e0e8f6;padding:6px 0;font-size:13px}.ui-craft-operation{padding:12px;background:#eaf1fb;border-radius:8px;margin:10px 0}.ui-craft-operation h3{font-size:16px;margin:0 0 6px}.ui-craft-operation p{font-size:13px;margin:5px 0}.ui-craft-operation .mb{width:100%;margin-top:10px}.ui-craft-result{margin:12px 0}.ui-rules{margin-top:12px;border-top:1px solid #c7d3e8;padding-top:10px}.ui-rules summary{padding:8px 0}
.ui-map-list{display:grid;gap:12px}.ui-map-card{overflow:hidden;border:1px solid #a9bbdc;border-radius:9px;background:#fff}.ui-map-banner{position:relative;padding:16px;min-height:92px;background:var(--land);color:#15263d;overflow:hidden}.ui-map-banner h3{position:relative;margin:6px 0 0;font:21px "Cubic 11",system-ui,sans-serif;z-index:1}.ui-map-banner span{font:12px system-ui,sans-serif}.ui-map-info{padding:12px}.ui-map-info .rchips{gap:6px;margin:0 0 8px}.ui-map-info details{font-size:13px;margin:10px 0}.ui-map-info summary{min-height:36px;padding:7px 0}.ui-map-info ul{padding-left:18px;line-height:1.7}.ui-map-info .mb.pri{width:100%}.ui-map-state{display:flex;justify-content:space-between;gap:8px;font-size:13px}.ui-progress{height:7px;background:#dce5f4;border-radius:4px;overflow:hidden;margin:8px 0}.ui-progress i{display:block;height:100%;background:var(--ux-blue)}
#mbody .ui-segments>button{background:transparent!important;border:1px solid transparent!important;border-radius:5px!important;box-shadow:none!important;color:var(--ux-muted)!important;text-shadow:none!important;font:13px/1.4 system-ui,sans-serif!important;padding:6px!important}
#mbody .ui-segments>button[aria-pressed="true"]{background:var(--ux-blue)!important;color:#fff!important;border-color:#244691!important;box-shadow:inset 0 1px 0 #ffffff50!important}
#mbody .ui-craft-slots>button{background:#edf3fc!important;border:1px solid var(--ux-edge)!important;border-radius:8px!important;box-shadow:none!important;text-shadow:none!important}
#mbody .ui-craft-slots>button[aria-pressed="true"]{border:2px solid var(--ux-blue)!important;background:#dce8ff!important}
.ui-equipment .rh,.ui-equipment .rh span{color:var(--ux-muted)!important;text-shadow:none!important}
#mbody .mb:disabled{opacity:1!important;background:#dfe7f4!important;color:#53617b!important;border-color:#acb9d0!important;box-shadow:none!important;text-shadow:none!important}
#mbody .ui-directory button,#mbody .ui-wiki{background:#f3f7ff!important;border:1px solid #b9c8e3!important;border-radius:7px!important;box-shadow:none!important;text-shadow:none!important}
.ui-build{padding:8px 10px;border:1px solid #bccbe6;border-radius:8px;background:#edf3ff}.ui-build>div{display:flex;align-items:center;gap:7px}.ui-build b{margin-right:4px;font:13px system-ui,sans-serif}.ui-build .mb{min-width:44px}.ui-build p{margin:5px 0 0}#mbody .ui-build .mb[aria-pressed="true"]{background:var(--ux-blue)!important;color:#fff!important;box-shadow:inset 0 1px 0 #ffffff66,0 2px 0 #244691!important;text-shadow:none!important}
.ui-settings-intro h3{font:18px "Cubic 11",system-ui,sans-serif;margin:4px 0 8px}.ui-settings-intro p{font:13px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:0 0 16px}body #uisettings #mmenu{padding:0}body #uisettings #btns{display:grid!important;grid-template-columns:1fr!important;align-items:stretch;gap:10px!important;margin:0;width:100%}#uisettings .stepwrap{display:block;width:100%}#uisettings .act{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;min-height:48px;padding:10px 14px!important;background:#edf3ff!important;border:1px solid #a7badc!important;border-radius:8px!important;box-shadow:inset 0 1px 0 #fff!important;font:14px system-ui,sans-serif;text-shadow:none!important}#uisettings .chips{position:static;width:100%;margin:7px 0 12px;padding:8px;max-width:none;box-sizing:border-box;background:#e0eaf9;border:1px solid #b6c6e1;border-radius:8px;gap:6px;flex-wrap:wrap}#uisettings .chip{min-height:40px;padding:6px 10px!important;border-radius:6px!important;font:13px system-ui,sans-serif!important;box-shadow:none!important}#uisettings .chip.current{background:var(--ux-blue)!important;color:#fff!important;text-shadow:none!important}
.ui-map-banner h3,.ui-map-banner>span{background:#ffffffdd;padding:3px 7px;border-radius:4px;width:fit-content}.ui-map-banner>span{display:inline-block}
@media(max-width:1179px){body.m #mbody{padding:10px}#mbody .pz{max-width:300px}.ui-segments>button{min-height:44px}body.m .ui-inventory-grid{gap:7px}}
@media(min-width:560px) and (max-width:1179px){body.m #mbody{padding:14px 24px}.ui-inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.ui-equipment{grid-template-columns:repeat(3,minmax(0,1fr))}.ui-character-head,.ui-menu-group,.ui-wiki{max-width:900px;margin-left:auto;margin-right:auto}}
body.d.battle-fold #fig,body.d.battle-fold #fxo{display:none!important}body.d.battle-fold .stage{position:relative;min-height:72vh}body.d.battle-fold .stage::after{content:"戰鬥畫面已隱藏，戰鬥與收益照常進行（設定 → 畫面與觀戰 可重新顯示）";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(80%,420px);padding:14px 16px;text-align:center;line-height:1.6;color:#1d2552;background:#e6e8f6;border:2px solid #fff;outline:2px solid #33407f;box-shadow:4px 4px 0 #1d2552aa}
body.m.battle-fold .stage{height:88px;min-height:88px;padding:0!important;box-sizing:border-box}body.m.battle-fold #fig,body.m.battle-fold #nexthint,body.m.battle-fold #ctxbtn,body.m.battle-fold #fxo{display:none!important}body.m.battle-fold .stats{position:static!important;margin:4px 6px!important}
@media(max-height:500px){body.m .stats{top:0}body.m #mttl{min-height:40px}body.m .stage{padding-bottom:30px}body.m #fig{max-height:110px}body.m #mbody{padding:8px}body.m #mtabs{height:48px}body.m{padding-bottom:calc(48px + env(safe-area-inset-bottom))!important}}
body.ui-material #mbody .ui-menu-group .ui-directory{grid-template-columns:repeat(2,minmax(0,1fr))}
body.ui-material #mbody .ui-map-grid .ui-item-state{font-size:var(--ux-small)!important}
/* Compact inventory cells share the console material and native button semantics. */
body.ui-material #mbody .ui-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:6px;margin:8px 0}
body.ui-material #mbody .ui-equipment{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}
body.ui-material #mbody .ui-item-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;gap:4px;min-width:0;min-height:94px;padding:24px 3px 5px!important;white-space:normal;text-align:center;border-bottom:3px solid var(--item-rarity,var(--ux-edge))!important;scroll-margin:8px;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;overflow-wrap:anywhere}
body.ui-material #mbody .ui-item-tile b{font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:calc(var(--ux-small-line) * 2);max-width:100%}
body.ui-material #mbody .ui-item-tile small,body.ui-material #mbody .ui-item-state{font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important}
.ui-item-state{position:absolute;top:2px;left:3px;right:3px;text-align:left;color:var(--ux-muted);pointer-events:none}
.ui-item-empty{background:var(--ux-screen);border:1px dashed var(--ux-edge);color:var(--ux-muted)}
.ui-grid-empty{grid-column:1/-1;padding:12px 0}.ui-grid-pagination{justify-content:space-between;align-items:center;flex-wrap:nowrap!important}.ui-grid-pagination span{font-size:12px;white-space:nowrap}
.ui-warehouse-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.ui-warehouse-summary b{font-size:16px}.ui-warehouse-tools .ui-segments{margin:6px 0}.ui-warehouse-tools .uxmeta{margin:6px 0}
body.ui-material #mbody .ui-inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
body.ui-material #mbody .ui-cart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:100px;padding:24px 4px 5px!important;white-space:normal;text-align:center;scroll-margin:8px;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt :is(b,small){font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;max-width:100%;overflow-wrap:anywhere}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
body.ui-material #mbody .ui-inventory-grid .gt .shp{margin:2px 0 0;padding:0!important;align-self:center}
body.ui-material #mbody .gt[data-availability="unavailable"]{background:var(--ux-screen)!important;border-style:dashed!important;color:var(--ux-muted)!important}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt:hover{background:var(--ux-key-hover)!important}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt:active{box-shadow:var(--ux-inset)!important}
body.ui-material #mbody .gt.on{outline:2px solid var(--ux-focus);outline-offset:1px}
body.ui-material #uisettings{scroll-padding:8px;padding:10px!important}
body.ui-material #uisettings #btns{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
#uisettings #btns>.cap{display:none}#uisettings #btns .stepwrap{min-width:0}#uisettings #btns .stepwrap.open{grid-column:1/-1}
body.ui-material #uisettings #btns .act{gap:4px;min-height:72px;padding:8px!important;white-space:normal;line-height:24px!important}
.ui-setting-copy{display:flex;flex-direction:column;min-width:0;gap:4px}.ui-setting-copy b{font-size:var(--ux-text)!important}.ui-setting-copy small{font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;color:var(--ux-muted)}
body.ui-material #uisettings #btns .chips{display:none;margin:6px 0 0;padding:6px;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;box-shadow:none!important;border:1px solid var(--ux-edge)!important;background:var(--ux-screen)!important}
body.ui-material #uisettings #btns .stepwrap.open .chips{display:grid}body.ui-material #uisettings #btns .chip{white-space:normal;min-width:0;min-height:44px;font-size:var(--ux-text)!important;padding:6px!important}
body.ui-material #uisettings .view-settings{margin-top:12px;padding-top:12px!important}
.ui-setting-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;align-items:start}.ui-setting-grid>.view-options{display:contents}
body.ui-material #uisettings .ui-setting-grid> :is(button,.ui-setting-block){min-width:0;margin:0;padding:8px!important;box-sizing:border-box}
body.ui-material #uisettings .ui-setting-grid>button{width:100%;min-height:60px;font-size:var(--ux-text)!important;white-space:normal}
.ui-setting-block h4{margin:0 0 6px;font-size:16px}.ui-setting-block .view-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.ui-setting-block .view-options button{min-width:0;min-height:44px;padding:4px!important;font-size:var(--ux-small)!important}
.ui-setting-grid>.view-fx-control{grid-column:1/-1;border:1px solid var(--ux-edge);background:var(--ux-screen)}.view-fx-control>div:first-child{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ui-setting-grid>.ui-setting-block:not(.view-fx-control){grid-column:1/-1}.ui-setting-grid>.ui-setting-block .view-options{grid-template-columns:repeat(4,minmax(0,1fr))}.ui-setting-grid>#watch-now{grid-column:1/-1;min-height:44px!important}
#uisettings .ui-rules>summary{min-height:44px;padding:10px 0;box-sizing:border-box}.ui-settings-intro h3{margin:0 0 8px!important}
`;
function uiAdventureHtml(){
  if(UI_WORK.adventure==='rift')UI_WORK.adventure='season';
  if(G.run?.city?.awaitChoice)UI_WORK.adventure='city';
  const R=G.run,mode=UI_WORK.adventure;
  const nav=uiSegments('adventure',[['maps','地圖','消耗地圖卡進入挑戰，打贏有額外獎勵'],['city','城市遠征','三段路線加BOSS，取得傳奇核心碎片'],['season','賽季','本期裂隙、巡迴與專屬核心'],['tower','無限之塔','一路往上爬，死亡就結束，記錄最高層'],['training','訓練場','對假人測試 DPS，不影響進度']],'冒險分類');
  const current=R?.city?uiCityRunHtml():R?`<section class="ui-section"><div class="ui-map-state"><b>${R.tower?'無限之塔 第 '+R.floor+' 層':BIOMES[R.map.biome].n}</b><span>進行中</span></div><div class="ui-progress" role="progressbar" aria-label="地圖討伐進度" aria-valuemin="0" aria-valuemax="${R.need}" aria-valuenow="${Math.min(R.kills,R.need)}"><i style="width:${Math.min(100,R.kills/R.need*100)}%"></i></div><p id="ui-run-count" class="uxmeta">討伐 ${Math.min(R.kills,R.need)}／${R.need}</p>${runMods(R)}<button class="mb" onclick="uiLeaveMap()">離開目前挑戰</button></section>`:`<section class="ui-section"><div class="ui-map-state"><b>一般冒險</b><span>深度 ${G.depth}</span></div><p id="ui-normal-count" class="uxmeta">討伐 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'':'，原地刷怪'}</p></section>`;
  if(mode==='rift'){UI_WORK.adventure='season';return nav+seasonHubHtml();}
  if(mode==='season')return nav+seasonHubHtml();
  if(mode==='tower')return nav+towerConsoleHtml();
  if(mode==='city')return (R?current:'')+nav+(R?.city?'<details class="ui-section"><summary>查看城市目標與下次出發設定</summary>'+uiCityHtml()+'</details>':uiCityHtml());
  if(mode==='training'){
    const L=G.trainLast,mx=L?.rows.length?L.rows[0][1]:1;
    return current+nav+`<section class="ui-section"><h3>訓練場</h3><p class="uxmeta">選目標，測 30 秒傷害。</p><div class="view-options ui-scenes" role="group" aria-label="訓練目標">${[['single','單體假人','dummy1'],['crowd','群體假人','dummy5']].map(([id,name,k])=>`<button class="mb ui-scenebtn" aria-pressed="${(G.trainingPreset||'crowd')===id}" ${G.train?'disabled':''} onclick="uiTrainingPreset('${id}')">${(u=>u?`<img class="ui-scene" alt="" aria-hidden="true" src="${u}" style="image-rendering:pixelated">`:'')(icon3dSceneUrl(k))}<span>${name}</span></button>`).join('')}</div>${G.train?`<p id="ui-train-time">測量中，剩 ${Math.ceil(G.train.t)} 秒</p><button class="mb" onclick="trainEnd(true)">取消測量</button>`:`<button class="mb pri" ${R?'disabled':''} onclick="trainStart()">開始測量</button>`}<details><summary>測量說明</summary><p class="uxmeta">測試不掉落獎勵；開始時清空測試電荷，結束或取消後還原原有電荷。單體預估不等同多目標實測。</p></details>${L?`<p>上次結果：每秒約 <b>${tFmt(L.dps)}</b>（${L.n||5} 隻合計）</p>${L.rows.map(([k,v])=>`<div class="gl"><b>${uxEsc(k)}</b><i style="--p:${Math.round(v/mx*100)}%"></i><em>${L.total?Math.round(v/L.total*100):0}%　${tFmt(v/(L.duration||30))}／秒</em></div>`).join('')}<details><summary>出手與連動結果</summary>${Object.entries(L.stats||{}).map(([id,row])=>`<p>${SKILLS[id].n}：${row.casts} 次出手／${row.repeats} 次回放，最長等候 ${row.maxWait.toFixed(1)} 秒</p>`).join('')}${uiComboSummary(L.combos)}</details>`:'<p class="uxmeta">完成測量後，保留傷害分布、出手次數與連動結果。</p>'}</section>`;
  }
  return nav+(R?current:'')+`<div class="ui-map-state"><h3>可用地圖</h3><span class="uxmeta">${G.maps.length}／15 張</span></div><div class="ui-mgroups" role="group" aria-label="地圖庫存">${G.maps.length?uiMapGroups():'<p class="ui-grid-empty">還沒有地圖。繼續一般冒險，打贏BOSS便有機會取得。</p>'}</div>`;
}
let UI_MAP_PENDING=null;
function uiInspectMap(encoded){let id;try{id=decodeURIComponent(encoded);}catch(_){return;}const m=G.maps.find(x=>x.id===id);if(!m)return;noticeRead('maps',id);UI_MAP_PENDING={id,stamp:JSON.stringify(m)};const biome=BIOMES[m.biome],land=terrainBuild('map:'+m.id+':0'),q=m.mods.reduce((sum,k)=>sum+(MODS[k]?.q||0),0);showOverlay(`<h2 class="uxdialog-title">${biome.n} · Lv. ${m.lvl}</h2><div class="ui-map-banner" style="--land:${biome.board.l};--land2:${biome.board.m}"><span>挑戰詞綴 ${mapChallenge(m.mods)} · 戰利品 +${Math.round(q*100)}%</span></div><p>${land.name} · ${land.bounds[1]-land.bounds[0]} × ${land.bounds[3]-land.bounds[2]} · 起伏最高 ${land.amplitude} 單位</p><ul>${m.mods.length?m.mods.map(k=>`<li>${mapKind(k)} · ${MODS[k].n}</li>`).join(''):'<li>沒有額外詞綴</li>'}</ul>${m.mods.includes('rich')?'<p>金幣 +60%</p>':''}${m.mods.includes('lucky')?'<p>稀有度提升</p>':''}<p>進入會消耗這張地圖，離開不退還。${G.run||G.train?'先結束目前挑戰或訓練。':''}</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回地圖</button><button class="mb pri" ${G.run||G.train?'disabled':''} onclick="uiUseMapPreview()">進入 · 消耗這張地圖</button></div>`);}
function uiUseMapPreview(){const p=UI_MAP_PENDING;hideOverlay();if(!p||G.run||G.train||JSON.stringify(G.maps.find(x=>x.id===p.id))!==p.stamp){uxAnnounce('地圖或挑戰狀態已變動，沒有消耗地圖。');return;}enterMap(p.id);}
function uiLeaveMap(){
  if(!G.run)return;
  if(G.run.city){showOverlay('<h2 class="uxdialog-title">撤離城市遠征？</h2><p>保留已完成路段的碎片，放棄本次收尾獎勵；中樞已消耗的憑證不退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續遠征</button><button class="mb pri" onclick="hideOverlay();abandonMap()">撤離並帶回碎片</button></div>');return;}
  showOverlay(`<h2 class="uxdialog-title">離開目前挑戰？</h2><p>目前的進度會結束，已消耗的地圖不會退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續挑戰</button><button class="mb pri" onclick="hideOverlay();abandonMap()">離開挑戰</button></div>`);
}

let UI_LIVE_SIGNATURE='';
function uiLiveSignature(){
  if(modalTab==='warehouse')return JSON.stringify([G.inventoryRevision,G.autoEquip,G.storageRecycled,G.armory,G.equip,G.builds]);
  if(modalTab==='tree')return JSON.stringify([G.lvl,G.maxDepth,G.pass,G.st,!!G.run,!!G.train,G.legacyMode]);
  if(modalTab==='skills')return JSON.stringify([G.lvl,G.board,G.circuits,G.gems,G.carts,G.seen,G.st.dps,G.chips]);
  if(modalTab==='char')return JSON.stringify([G.lvl,G.equip,G.armory,G.equipBackup,G.char,G.heroName,G.ascension,G.ascensionNodes,G.bossKills,G.maxDepth,G.st,G.cos,G.cards,G.picks,G.relicPicks]);
  if(modalTab==='dress'){const e=cosGet(dSel.cat,dSel.id);return JSON.stringify([G.lvl,G.equip,G.char,G.cos,G.own,e?G.gold>=e[3]:true]);}
  if(modalTab==='craft')return JSON.stringify([G.parts,G.equip,G.coreDust,G.city?.fragments,G.city?.maxTier,G.maxDepth,!!G.run,!!G.train]);
  if(modalTab==='maps')return JSON.stringify([G.maps,G.run?.map.id,G.run?.floor,!!G.run?.stair,G.run?.city,G.city,G.towerBest,G.season,G.activityLoot,['rift','season'].includes(UI_WORK.adventure)?[G.rift?.shards,G.rift?.clears,G.rift?.encounter?.id,G.rift?.encounter?.phase,G.rift?.encounter?.track]:null,!!G.run?.stair,!!G.train,G.trainLast,G.maxDepth]);
  return modalTab;
}
function uiRefreshLive(){
  if(typeof guidanceViewSettings==='function'){guidanceViewSettings();ailmentView();secretView();}
  if(typeof careerTalentRefresh==='function')careerTalentRefresh();
  if(modalTab==='settings')uiSyncSettings();
  const gold=$('cv-gold');if(gold)gold.textContent=tFmt(G.gold);
  if(G.offline||document.body.classList.contains('watch-mode'))return;
  if(!$('modal')||$('modal').hidden)return;
  const signature=uiLiveSignature();
  if(signature!==UI_LIVE_SIGNATURE&&!drag&&!UX_LAYERS.length&&!document.querySelector('#mbody input:focus,#mbody textarea:focus'))renderModal();
  const gearCount=$('ui-gear-count');if(gearCount&&gearCount.textContent!==String(G.inventory.length))gearCount.textContent=G.inventory.length;
  const progress=$('ui-char-progress'),text=`深度 ${G.depth} · 累計討伐 ${tFmt(G.totalKills)}`;
  if(progress&&progress.textContent!==text)progress.textContent=text;
  const R=G.run,count=$('ui-run-count'),bar=document.querySelector('[aria-label="地圖討伐進度"]');
  if(R&&count){count.textContent=`討伐 ${Math.min(R.kills,R.need)}／${R.need}`;if(bar){bar.setAttribute('aria-valuenow',Math.min(R.kills,R.need));bar.querySelector('i').style.width=Math.min(100,R.kills/R.need*100)+'%';}}
  const normal=$('ui-normal-count');if(normal&&!R)normal.textContent=`討伐 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'':'，原地刷怪'}`;
  const choice=$('ui-city-choice-time');if(choice&&G.run?.city?.awaitChoice)choice.textContent=`${Math.max(0,15-Math.floor((Date.now()-(G.run.city.choiceAt||Date.now()))/1000))} 秒後依出發策略自動選路，也可立即選擇。`;
  uiCombatRefresh();
  const timer=$('ui-train-time');if(timer&&G.train)timer.textContent=`測量中，剩 ${Math.ceil(G.train.t)} 秒`;
}

let UI_RESPEC=null;
function uiRespec(){
  if(G.run?.city||G.train){uxAnnounce('先結束城市遠征或訓練，再重置天賦。');return;}
  const cost=100*G.lvl;if(!G.pass.length||G.gold<cost)return;
  UI_RESPEC={lvl:G.lvl,pass:JSON.stringify(G.pass),cost};
  showOverlay(`<h2 class="uxdialog-title">重置目前構築的天賦？</h2><p>消耗 ${cost} 金幣，清除目前配置，點數可重新分配。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="UI_RESPEC=null;hideOverlay()">保留天賦</button><button class="mb pri" onclick="uiConfirmRespec()">重置天賦</button></div>`);
}
function uiConfirmRespec(){
  const pending=UI_RESPEC;UI_RESPEC=null;hideOverlay();if(!pending)return;
  if(G.run?.city||G.train||G.lvl!==pending.lvl||JSON.stringify(G.pass)!==pending.pass||G.gold<pending.cost){uxAnnounce('天賦或金幣已變動，請重新確認。');return;}
  respec();uxAnnounce(`已重置天賦，消耗 ${pending.cost} 金幣。`);
}

/* 倉庫與電路合成沿用同一外殼、確認及焦點系統。 */
const WAREHOUSE_UI={limit:48,slot:'all',kind:'all',page:0,sel:null,sort:'new'};const WAREHOUSE_PAGE_SIZE=36;
function uiWarehouseFilter(key,value){if(key==='slot'&&!['all',...Object.keys(SLOTN)].includes(value)||key==='kind'&&!['all','gear','core'].includes(value)||key==='sort'&&!['new','dps'].includes(value)||!['slot','kind','sort'].includes(key))return;WAREHOUSE_UI[key]=value;WAREHOUSE_UI.page=0;WAREHOUSE_UI.limit=48;renderModal();}
const WAREHOUSE_DPS_CACHE={stamp:'',values:new Map()};
function uiSortByDps(list,mode){if(mode!=='dps')return list;const stamp=JSON.stringify([G.inventoryRevision,G.char,G.lvl,G.maxDepth,G.equip,G.pass,G.board,G.suppW,G.cards,G.relics,G.ach,G.ascension,G.ascensionNodes,G.run?.city?.branches]);if(stamp!==WAREHOUSE_DPS_CACHE.stamp){WAREHOUSE_DPS_CACHE.stamp=stamp;WAREHOUSE_DPS_CACHE.values.clear();}const values=WAREHOUSE_DPS_CACHE.values;for(const it of list)if(!values.has(it))values.set(it,calc({...G.equip,[it.slot]:it}).dps);return list.slice().sort((a,b)=>values.get(b)-values.get(a));}

function warehouseHtml(){return uiWarehouseSheetHtml();}
function uiInspectGear(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;noticeRead('gear',uid);

 const on=G.equip[it.slot]===it,guard=it.kept||it.cr||it.lk!=null||on||Object.values(G.equipBackup).includes(it)||gearReferenced(it);
 showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · ${RAR[it.r].n} · 物品等級 ${it.il}</p>${uiGearCompareSheet(it)}<div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回倉庫</button><button class="mb pri" ${on?'disabled':''} onclick="uiWearStored(${uid})">${on?'穿著中':'換上這件裝備'}</button><button class="mb" onclick="uiKeepStored(${uid})">${it.kept?'解除保管鎖定':'鎖定保管'}</button><button class="mb" onclick="lootMark(${uid})">${it.junk?'取消待拆':'標記待拆'}</button><button class="mb" ${guard?'disabled':''} onclick="uiRecycleAsk(${uid})">回收裝備</button></div>${guard?'<p class="uxmeta">穿著、上一件、構築引用、鎖定、詞綴鎖定或已腐化的裝備受保護，不能直接回收。</p>':''}`);
}
function uiWearStored(uid){if(!equipStored(uid)){uxAnnounce('裝備狀態已變更，請重新查看。');return;}hideOverlay();renderModal();uxAnnounce('已手動換裝，上一件裝備保留。');}
function uiKeepStored(uid){const it=G.inventory.find(x=>x.uid===uid);if(!it)return;it.kept=!it.kept;G.inventoryRevision++;G.dirty=true;hideOverlay();renderModal();document.querySelector(`[data-focus="gear-${uid}"]`)?.focus();uxAnnounce(it.kept?'裝備已鎖定保管。':'已解除保管鎖定。');}
function uiRecycleAsk(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;
 hideOverlay();showOverlay(`<h2 class="uxdialog-title">回收 ${uxEsc(it.name)}？</h2><p>裝備會消失，轉為 ${itemValue(it)} 金幣及零件；不能還原。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備</button><button class="mb pri" onclick="uiRecycleConfirm(${uid})">確認回收</button></div>`);
}
function uiRecycleConfirm(uid){const ok=recycleStored(uid);hideOverlay();renderModal();document.querySelector('[data-focus="warehouse-auto"]')?.focus();uxAnnounce(ok?'已回收為金幣與零件。':'裝備受到保護或已不存在，沒有回收。');}
function circuitShopHtml(){return `<details class="ui-section"><summary>電路合成 · <span id="ui-chip-count">${G.chips}</span> 點</summary><p>拾取敵人掉落的電路點數，用來指定合成配件；所有角色都能使用，相鄰及標籤規則照常生效。</p>${['FOCUS','FORK','RECOVER','DELAY','ANCHOR','EXECUTE','BLOOD','CONDUCT','LONG','SPREAD','RIME','KINDLE'].map(id=>`<article><p>${gemIco(id,24)} ${SUPPS[id].n} · ${SUPPS[id].d}</p><button class="mb" ${G.chips<20?'disabled':''} onclick="uiBuySupport('${id}')">20 點合成 ${SUPPS[id].n}</button></article>`).join('')}<h3>連動模式</h3><p>選取衛星或雷射，再到模式卡匣裝上。搭配連動優先，會先準備凍結或電荷；所有角色可用。</p>${['METEOR_COLDSTART','BEAM_CAPACITOR'].map(id=>`<article><p><b>${MODES[id].n}</b> · ${MODES[id].d}</p><button class="mb" data-focus="recipe-${id}" ${G.chips<20||G.carts[id]||G.lvl<SKILLS[MODES[id].sk].lvl?'disabled':''} onclick="uiBuyCircuitMode('${id}')">${G.carts[id]?'已持有 '+MODES[id].n:G.lvl<SKILLS[MODES[id].sk].lvl?'等級 '+SKILLS[MODES[id].sk].lvl+' 解鎖':'20 點合成 '+MODES[id].n}</button></article>`).join('')}</details>`;}
function uiBuySupport(id){if(!buyCircuitSupport(id)){uxAnnounce('電路點數不足，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${SUPPS[id].n}，消耗 20 電路點數。`);}
function treeAvailableHtml(){
 const open=Object.values(TREE).filter(n=>canAllocateTalent(n.id)),branch={A:'耐久',B:'元素',C:'會心',D:'超頻',E:'回授',F:'電池',R:'接線'};
 return `<details class="ui-section"><summary>可連接節點清單（${open.length}）</summary><p>可用清單選擇，不必瞄準盤面的小圓點。每個節點消耗 1 天賦點，所有角色共用。</p><div class="ui-directory">${open.map(n=>`<button data-focus="talent-${n.id}" ${passPoints()<=0?'disabled':''} onclick="uiAllocateTalent('${n.id}')"><b>${branch[n.id[0]]}支線</b><span>${uxEsc(talentName(n.id))}</span></button>`).join('')||'<p>點數或韌體已達上限，或目前沒有可分配節點。可退回末端點後重新選路。</p>'}</div></details>`;
}
function uiAllocateTalent(id){const before=G.pass.length;allocPass(id);if(G.pass.length>before){document.querySelector(`[data-tree="${id}"]`)?.focus({preventScroll:true});uxAnnounce(`已點亮${talentName(id)}。`);uxAnimatePanel();}}

function warehouseMove(delta){WAREHOUSE_UI.page=Math.max(0,WAREHOUSE_UI.page+delta);renderModal();const id=delta>0?'warehouse-next':'warehouse-prev',next=document.querySelector(`[data-focus="${id}"]`);(next&&!next.disabled?next:document.querySelector(`[data-focus="${delta>0?'warehouse-prev':'warehouse-next'}"]`))?.focus();}

function uiPolicyHtml(){return `<div class="view-options" role="group" aria-label="出手策略">${[['balanced','均衡出手','讓就緒較久的技能先出手'],['combo','連動優先','先鋪墊凍結或電荷，最多額外等候 1.2 秒']].map(([id,name,tip])=>`<button class="mb" title="${tip}" aria-pressed="${G.castPolicy===id}" data-focus="cast-policy-${id}" onclick="uiSetCastPolicy('${id}')">${key==='adventure'&&id==='season'?'<img src="'+studioMachine('core')+'" alt="" width="24" height="24">':''}${name}</button>`).join('')}</div>`;}
function uiSetCastPolicy(id){if(!['balanced','combo'].includes(id))return;G.castPolicy=id;G.dirty=true;renderModal();uxAnnounce(id==='combo'?'已使用連動優先。':'已使用均衡出手。');}
function uiTrainingPreset(id){if(G.train||!['single','crowd'].includes(id))return;G.trainingPreset=id;renderModal();}
function uiComboSummary(c={}){return `<p>產生電荷 ${c.chargeGain||0} 格／消耗 ${c.chargeSpent||0} 格；冷啟動鎖定 ${c.coldBursts||0} 次；凍結 ${c.freezes||0} 次。</p>`;}
function uiCombatHtml(){return `<details id="ui-combat-report" class="ui-section"><summary>本段出手戰報</summary><p id="ui-combat-time" class="uxmeta">展開後更新。戰報從本次載入或重設起累積，不寫入存檔。</p><p id="ui-charge-live"></p><div class="ui-resolved">${G.slots.map(id=>`<article data-combat-id="${id}"><div><b>${SKILLS[id].n}</b><span data-combat-status>尚未出手</span></div><p data-combat-count>0 次出手</p></article>`).join('')}</div><p id="ui-combat-combos"></p><button class="mb" data-focus="reset-combat" onclick="uiResetCombatReport()">重設本段戰報</button></details>`;}
function uiResetCombatReport(){if(G.train){uxAnnounce('訓練進行中，請先完成或取消。');return;}resetCombatReport();uiCombatRefresh();uxAnnounce('已重設本段戰報，遊戲進度不變。');}
function uiCombatRefresh(){
  const el=$('ui-combat-report');if(!el?.open)return;
  const book=G.train||G.combat||{start:G.time},elapsed=Math.max(0,G.time-(book.start??G.time));
  $('ui-combat-time').textContent=`${G.train?'目前訓練':'本段戰鬥'}：${elapsed.toFixed(0)} 秒。傷害只記實際扣除生命，不含溢傷。`;
  $('ui-charge-live').textContent=G.st.sk.BEAM?.pattern.capacitor?`訊號電荷：${G.signalCharge}／${COMBAT_RULES.chargeMax}，由紅外線原始命中產生。`:'';
  for(const row of el.querySelectorAll('[data-combat-id]')){
    const id=row.dataset.combatId,stats=book.stats?.[id],k=G.st.sk[id];
    const damage=Object.entries(book.damage||{}).filter(([name])=>name===SKILLS[id].n||name.startsWith(SKILLS[id].n+'·')).reduce((sum,[,n])=>sum+n,0);
    row.querySelector('[data-combat-count]').textContent=`${stats?.casts||0} 次出手／${stats?.repeats||0} 次回放；有效傷害 ${tFmt(damage)}；最長等候 ${(stats?.maxWait||0).toFixed(1)} 秒`;
    row.querySelector('[data-combat-status]').textContent=G.h.castT>=0&&G.h.castSk===id?'正在出手':!G.mons.some(m=>!m.dead&&!(m.fall>0))?'等待敵人':G.cds[id]>0?`冷卻 ${G.cds[id].toFixed(1)} 秒`:G.castPolicy==='combo'&&k?.pattern.capacitor&&G.signalCharge<4?'等候電荷或後備出手':G.castPolicy==='combo'&&k?.pattern.coldStart&&!G.mons.some(m=>m.frozen>0&&!m.dead)?'等候凍結或後備出手':'已就緒，輪候出手';
  }
  const c=book.combos||{};$('ui-combat-combos').textContent=`產生／消耗電荷 ${c.chargeGain||0}／${c.chargeSpent||0} 格；冷啟動 ${c.coldBursts||0} 次。`;
}
function uiBuyCircuitMode(id){if(!buyCircuitMode(id)){uxAnnounce('尚未解鎖、點數不足或已持有，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${MODES[id].n}，消耗 20 電路點數。選取對應技能，再到模式卡匣裝上。`);}

/* 城市流程延伸既有冒險與確認視窗，不新增頂層導覽。 */
const CITY_UI={route:'memory',tier:1};let CITY_CONFIRM=null,TALENT_CONFIRM=null;
function uiTalentBudget(){return `<section class="ui-section"><h3 title="路徑上限 ${TALENT_LIMIT} 點，等級與深度解鎖；最多兩個韌體，效果與代價同時生效">路徑 ${G.pass.length}／${talentBudget()} · 韌體 ${firmwareCount(G.pass)}／${FIRMWARE_LIMIT}</h3>${G.run?.city||G.train?'<p>先結束城市遠征或訓練，再更動天賦。</p>':''}${passiveLegacy()?'<p>目前保留舊制配置，未刪除任何節點。先預覽並免費轉換，才可進入城市遠征。</p><button class="mb pri" onclick="uiTalentPreview()">預覽免費轉換</button>':''}${G.legacyTalent&&!G.legacyMode?'<button class="mb" onclick="uiRestoreTalents()">還原改版前天賦</button>':''}<details><summary>六種韌體與代價</summary>${Object.entries(FIRMWARE).map(([id,f])=>`<p><b>${f.n}</b>：${f.d}${G.pass.includes(id)?'（已選）':''}</p>`).join('')}</details><details><summary>退回末端節點（免費）</summary><p>只可退回不會切斷其他節點的點。進行挑戰或訓練時暫不可更動。</p>${G.pass.filter(id=>connectedTalents(G.pass.filter(k=>k!==id))).map(id=>`<button class="mb" data-focus="refund-${id}" ${G.run||G.train?'disabled':''} onclick="uiRefundTalent('${id}')">退回 ${uxEsc(talentName(id))}</button>`).join('')||'<p>尚未分配節點。</p>'}</details></section>`;}
function uiTalentPreview(){if(G.run||G.train){uxAnnounce('先結束挑戰或訓練，再轉換天賦。');return;}const plan=talentPlan(),after=calc(G.equip,plan,G.slots,G.supp,true);TALENT_CONFIRM={pass:JSON.stringify(G.pass),plan:JSON.stringify(plan),legacy:G.legacyMode,bi:G.bi||0};showOverlay(`<h2 class="uxdialog-title">預覽有限天賦配置</h2><p>保留 ${plan.length} 點／${firmwareCount(plan)} 個韌體，移出 ${G.pass.length-plan.length} 個節點；永久裝備與庫存保留。原配置另存快照，可還原。</p><p>DPS：${tFmt(G.st.dps)} → ${tFmt(after.dps)}<br>最大生命：${tFmt(G.st.life)} → ${tFmt(after.life)}</p><details><summary>預覽保留節點</summary>${plan.map(id=>`<p>${uxEsc(FIRMWARE[id]?.n||TREE[id].name)}</p>`).join('')}</details><p>轉換免費，不會自動購買或分配其他節點。城市挑戰需要使用有限預算。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="TALENT_CONFIRM=null;hideOverlay()">保留原配置</button><button class="mb pri" onclick="uiConfirmTalents()">免費轉換</button></div>`);}
function uiConfirmTalents(){const pending=TALENT_CONFIRM;TALENT_CONFIRM=null;hideOverlay();if(!pending||pending.pass!==JSON.stringify(G.pass)||pending.plan!==JSON.stringify(talentPlan())||pending.legacy!==G.legacyMode||pending.bi!==(G.bi||0)||!convertTalents()){uxAnnounce('配置已變動或挑戰進行中，請重新預覽。');return;}renderModal();uxAnnounce('已免費轉換，原天賦快照可還原。');}
function uiRestoreTalents(){showOverlay('<h2 class="uxdialog-title">還原改版前天賦？</h2><p>恢復改版前的天賦與三套配置，裝備與新取得道具保留。還原後暫停城市入口，可再次免費轉換。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留目前配置</button><button class="mb pri" onclick="hideOverlay();if(restoreLegacyTalents()){renderModal();uxAnnounce(\'已還原舊天賦。\')}">還原舊天賦</button></div>');}
function uiRefundTalent(id){if(!refundTalent(id)){uxAnnounce('節點會切斷路徑或挑戰進行中，未退回。');return;}renderModal();uxAnnounce('已退回一點天賦，可重新分配。');}
function uiCityConfig(key,value){if(key==='route'&&CITY_ROUTES[value])CITY_UI.route=value;if(key==='tier')CITY_UI.tier=Math.max(1,Math.min(G.city?.maxTier||1,Number(value)||1));renderModal();}
function uiCityPolicy(id){if(!['safe','risk'].includes(id))return;G.city||=newCity();G.city.policy=id;G.dirty=true;renderModal();}
function uiCityTarget(id){if(!LEGEND_BY[id])return;G.city||=newCity();G.city.target=id;G.dirty=true;renderModal();uxAnnounce(`追求目標：${LEGEND_BY[id].name}。已出發遠征保留原目標。`);}
function uiCityGo(){UI_WORK.adventure='city';openModal('maps');}
function uiCityStart(nexus=false){const route=CITY_UI.route,tier=CITY_UI.tier;if(!cityCanStart(route,tier,nexus)){uxAnnounce('尚未解鎖、憑證不足或挑戰進行中，未出發。');return;}
 if(!nexus){cityStart(route,tier);closeModal();return;}
 CITY_CONFIRM={route,tier,target:G.city.target};showOverlay(`<h2 class="uxdialog-title">挑戰第 ${tier} 階城市中樞？</h2><p>消耗本階三區憑證各一枚。勝利保證掉落出發時選定的核心，並解鎖下一階（最高八階）；失敗不退憑證，已完成路段碎片保留。</p><p>目標：${LEGEND_BY[G.city.target].name}</p><div class="uxactions"><button class="mb" data-initial-focus onclick="CITY_CONFIRM=null;hideOverlay()">先不挑戰</button><button class="mb pri" onclick="uiCityConfirmStart()">消耗三區憑證並出發</button></div>`);}
function uiCityConfirmStart(){const c=CITY_CONFIRM;CITY_CONFIRM=null;hideOverlay();if(!c||c.target!==G.city.target||!cityStart(c.route,c.tier,true)){uxAnnounce('遠征狀態已變動，沒有消耗憑證。');return;}closeModal();}
function uiCityChoose(id,stage){if(cityChoose(id,stage)){renderModal();uxAnnounce('已套用當局協定，繼續遠征。');}else uxAnnounce('路段已變動，沒有重複選路。');}
function uiForgeCore(id){const C=G.city||(G.city=newCity()),route=cityRouteForCore(id);if(!route)return;showOverlay(`<h2 class="uxdialog-title">定向合成${LEGEND_BY[id].name}？</h2><p>消耗 ${CITY_ROUTES[route].n}的 24 枚碎片（持有 ${C.fragments[route]}）。生成等級 ${Math.max(8,G.maxDepth)}，詞綴數值隨機；特殊效果固定。加入核心收藏，不自動換裝。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留碎片</button><button class="mb pri" onclick="uiConfirmForge('${id}')">消耗 24 碎片合成</button></div>`);}
function uiConfirmForge(id){hideOverlay();if(forgeTargetCore(id)){renderModal();uxAnnounce('合成完成，已加入角色的傳奇核心收藏；未改動裝備。');}else uxAnnounce('碎片不足、已持有或挑戰進行中，沒有扣款。');}
function uiCityRunHtml(){const R=G.run,c=R.city;return `<section class="ui-section"><h3>${c.nexus?'城市中樞':CITY_ROUTES[c.route].n} · 第 ${c.tier} 階</h3><p>路段 ${c.stage}／3 · ${c.stage===3?'收尾BOSS':`<span id="ui-run-count">討伐 ${Math.min(R.kills,R.need)}／${R.need}</span>`}</p><p>已存 ${c.bank} 枚${CITY_ROUTES[c.route].n}碎片；撤離或死亡仍帶回。核心目標：${LEGEND_BY[c.target].name}。</p>${c.branches.length?`<p>當局協定：${c.branches.map(id=>CITY_BRANCHES[id].n).join('、')}</p>`:''}${c.awaitChoice?`<h3>下一段走哪條路？</h3><p>效果累加，只在本次遠征生效。</p><p id="ui-city-choice-time">15 秒後依出發策略自動選路，也可立即選擇。</p><div class="ui-directory">${Object.entries(CITY_BRANCHES).map(([id,b])=>`<button data-focus="city-branch-${id}" onclick="uiCityChoose('${id}',${c.stage})"><b>${b.n}</b><span>${b.d}</span></button>`).join('')}</div>`:`<p>${c.nexus?'訊號、護盾與重裝威脅依路段輪替，BOSS在生命 65%／30% 時加速。':CITY_ROUTES[c.route].threat}</p>`}<button class="mb" onclick="uiLeaveMap()">撤離並帶回碎片</button></section>`;}
function uiCityHtml(){const C=G.city||(G.city=newCity());CITY_UI.tier=Math.min(C.maxTier,CITY_UI.tier);const route=CITY_UI.route,tier=CITY_UI.tier,target=C.target,tr=cityRouteForCore(target),active=!!G.run||!!G.train;
 return `<section class="ui-section"><h3>城市遠征</h3><details><summary>遠征規則與進度</summary><p>選擇路線，追求對應核心。完成三區後挑戰中樞。</p><p>三個路段、兩次選路、一次收尾BOSS。三區憑證開啟同階中樞；完成中樞推進下一階。各階憑證分開保存，沒有每日重置。</p></details>${!cityReady()?`<p>${G.maxDepth<8?'最深第 8 層解鎖。':'先到成長頁預覽並轉換有限天賦。'}</p>`:''}${C.last?`<p>${uxEsc(C.last.text)}</p>`:''}<div class="view-options" role="group" aria-label="遠征階級">${Array.from({length:C.maxTier},(_,i)=>i+1).map(t=>`<button class="mb" aria-pressed="${t===tier}" data-focus="city-tier-${t}" onclick="uiCityConfig('tier',${t})">第 ${t} 階</button>`).join('')}</div><p class="uxmeta">第 ${tier} 階憑證：${Object.keys(CITY_ROUTES).map(id=>`${CITY_ROUTES[id].n} ${C.seals[tier]?.[id]?'✓':'未取得'}`).join('／')}</p></section><section class="ui-section"><div class="view-options ui-scenes ui-routes" role="group" aria-label="城市路線">${Object.entries(CITY_ROUTES).map(([id,r])=>`<button class="mb ui-scenebtn" aria-pressed="${route===id}" data-focus="city-route-${id}" onclick="uiCityConfig('route','${id}')">${(u=>u?`<img class="ui-scene" alt="" aria-hidden="true" src="${u}" style="image-rendering:pixelated">`:'')(icon3dSceneUrl('route_'+id))}<span>${r.n}</span><i>${C.seals[tier]?.[id]?'✓':''}</i></button>`).join('')}</div><h3>${CITY_ROUTES[route].n}</h3><p>${CITY_ROUTES[route].threat}。敵人等級 ${Math.max(8,G.maxDepth)+2*(tier-1)}。</p><p>碎片 <b>${C.fragments[route]}</b>／24　掉落：${CITY_ROUTES[route].cores.map(id=>LEGEND_BY[id].name).join('、')}</p><details><summary>路線說明</summary><p>${CITY_ROUTES[route].d}</p><p>當局增益與代價結束後移除。首階完整遠征至少 14 枚，安全路線兩次即可合成一款未持有核心；收尾另有 15% 區域核心機會。</p></details><button class="mb pri" data-focus="city-start" ${cityCanStart(route,tier)?'':'disabled'} onclick="uiCityStart()">出發第 ${tier} 階遠征</button><button class="mb" ${cityCanStart(route,tier,true)?'':'disabled'} onclick="uiCityStart(true)">挑戰第 ${tier} 階中樞 · 消耗三區憑證</button>${active?'<p>先結束目前挑戰或訓練。</p>':''}<details><summary>離線出發策略</summary><p>出發即授權離線自動選路：${C.policy==='risk'?'帶電捷徑':'旁路校準'}。只完成當前遠征；失敗不重開、不自動消耗其他門票。前景到分岔可自行選擇，15 秒後依出發策略自動繼續。</p><div class="view-options">${[['safe','保守選路'],['risk','碎片優先']].map(([id,n])=>`<button class="mb" aria-pressed="${C.policy===id}" onclick="uiCityPolicy('${id}')">${n}</button>`).join('')}</div></details></section><section class="ui-section"><h3>追求：${LEGEND_BY[target].name}</h3><p>${LEGEND_BY[target].d}</p><p>來源：${CITY_ROUTES[tr].n}。${C.fragments[tr]}／24 枚碎片；城市中樞勝利保證掉落出發時目標。遠征中的目標不隨此處變更。</p><button class="mb" ${!active&&cityReady()&&!G.armory[target]&&C.fragments[tr]>=24?'':'disabled'} onclick="uiForgeCore('${target}')">${G.armory[target]?'已收藏 '+LEGEND_BY[target].name:'24 碎片合成 '+LEGEND_BY[target].name}</button><button class="mb" onclick="openModal('char')">查看核心收藏</button><details><summary>選擇追求核心 · 九款</summary><div class="ui-directory">${Object.entries(CITY_ROUTES).flatMap(([rid,r])=>r.cores.map(id=>`<button data-focus="city-target-${id}" aria-pressed="${target===id}" onclick="uiCityTarget('${id}')"><b>${LEGEND_BY[id].name}${G.armory[id]?' · 已收藏':''}</b><span>${r.n} · ${LEGEND_BY[id].d}</span></button>`)).join('')}</div></details></section>`;
}

let CITY_CHECKPOINT_REVEALED=null;
function uiCityRevealCheckpoint(){const c=G.run?.city;if(modalTab!=='maps'||!c?.awaitChoice||UX_LAYERS.length)return;const key=G.run.map.id+':'+c.stage;if(CITY_CHECKPOINT_REVEALED===key)return;CITY_CHECKPOINT_REVEALED=key;requestAnimationFrame(()=>{if(modalTab!=='maps'||!G.run?.city?.awaitChoice)return;$('mbody').scrollTop=0;document.querySelector('[data-focus="city-branch-safe"]')?.focus({preventScroll:true});});}

const UI_SETTING_LABELS={'模式':['模式',()=>G.push?'持續推進':'原地刷怪'],'挑戰BOSS':['BOSS條件',()=>(G.bossHp||0)?'生命 '+G.bossHp+'% 以上':'一律挑戰'],'戰利品過濾':['拾取門檻',()=>['全部撿','魔法以上','稀有以上'][G.filter]],'音效':['音效',()=>({all:'音樂＋音效',sfx:'只有音效',off:'靜音'})[AUD.mode]||'靜音'],'戰鬥畫面':['戰鬥畫面（手機）',()=>G.userCz?['大','大','小','收起'][Math.max(1,G.cz==null?1:G.cz)]:'自動'],'混沌重鑄':['混沌重鑄',()=>`金幣 ${tFmt(G.gold)}`],'編年史':['編年史',()=>'查看遊戲資訊'],'扮工模式 ( ` )':['扮工模式',()=>'快捷鍵 `']};
function uiInstallSettings(){const root=$('uisettings');if(!root||root.dataset.gridReady)return;root.dataset.gridReady='true';for(const wrap of root.querySelectorAll('#btns .stepwrap')){const button=wrap.querySelector('.act'),label=button.textContent.replace('▾','').trim();if(UI_SETTING_LABELS[label]){wrap.dataset.setting=label;button.dataset.focus='setting-'+label;}}
 const order=['模式','挑戰BOSS','戰利品過濾','戰鬥畫面','音效','混沌重鑄','編年史','扮工模式 ( ` )'];for(const key of order){const wrap=[...root.querySelectorAll('[data-setting]')].find(w=>w.dataset.setting===key);if(wrap)$('btns').appendChild(wrap);}
 uiSyncSettings();}
function uiSyncSettings(){for(const wrap of document.querySelectorAll('#uisettings [data-setting]')){const [label,value]=UI_SETTING_LABELS[wrap.dataset.setting],button=wrap.querySelector('.act'),text=value(),html=`<span class="ui-setting-copy"><b>${label}</b><small>${uxEsc(text)}</small></span>${wrap.querySelector('.chips')?'<span aria-hidden="true">▾</span>':'<span aria-hidden="true">↗</span>'}`;if(button.innerHTML!==html)button.innerHTML=html;}}

/* Feedback UI stays in-game; server configuration owns delivery credentials. */
const FEEDBACK_DRAFT={category:'錯誤',title:'',details:'',device:false};let FEEDBACK_PREVIEW=null;
function feedbackText(d,device=''){return `類別：${d.category}\n版本：${VERSION()}\n\n${d.details.trim()}${d.device&&device?'\n\n裝置資訊：'+device:''}`;}
function feedbackPayload(d,device=''){const title=d.title.trim(),details=d.details.trim();if(!title||!details||title.length>60||details.length>700||!['錯誤','平衡','玩法建議','其他'].includes(d.category))return null;return {title:'['+d.category+'] '+title,body:feedbackText(d,device)};}
function feedbackClearError(input){input.removeAttribute('aria-invalid');const e=$('feedback-error');if(e)e.textContent='';FEEDBACK_STATE.requestId=null;}
function feedbackDownload(){FEEDBACK_PREVIEW=feedbackPayload(FEEDBACK_DRAFT);if(!FEEDBACK_PREVIEW){uxAnnounce('先填寫標題與內容再下載。');return;}const p=FEEDBACK_PREVIEW,url=URL.createObjectURL(new Blob([p.title+'\n\n'+p.body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='game-lab-feedback.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);uxAnnounce('已下載草稿，尚未送出。');}

function fieldJournalHtml(){const count=FIELD_STORIES.filter((_,i)=>G.storyFlags['p'+i]).length;return `<details class="ui-rules"><summary>電台手記 · 已收錄 ${count}／${FIELD_STORIES.length}</summary><p>停電後第七年。你帶著舊卡匣，沿各島微弱的訊號尋找山頂電台。</p>${FIELD_STORIES.map((e,i)=>{const f=G.storyFlags['p'+i]||0;return f?`<details class="field-entry"><summary>${uxEsc(e[0])}${f&2?' · 歸途已收錄':''}</summary><p class="uxmeta">${uxEsc(e[1])}</p><p>${uxEsc(e[2])}</p>${f&2?`<p>歸途：${uxEsc(e[3])}</p>`:''}</details>`:'';}).join('')||'<p>到達新的地景後，會收錄當地留言。</p>'}</details>`;}

function uiWorldViewHtml(){const p=terrainNow(),size={regular:'一般',medium:'中型',large:'大型',giant:'巨型',training:'訓練場'}[p.sizeClass];return `<div class="direct-map-tools"><span>${uxEsc(p.name)} · ${size}</span><button class="mb" aria-pressed="${!!FXO.overview}" onclick="toggleWorldOverview()">${FXO.overview?'跟隨鏡頭':'全景'}</button><button class="mb" onclick="directJournal()">手記 ${FIELD_STORIES.filter((_,i)=>G.storyFlags['p'+i]).length}／12</button>${directHelpButton('maps')}</div>`;}

/* 可用地圖：依地貌分組、同款（地貌＋等級＋詞綴）合併成一張並標示數量，方塊卡放大 3D 小島 */
function uiMapGroups(){
  const by=new Map();
  for(const m of G.maps){const key=m.biome+'|'+m.lvl+'|'+m.mods.slice().sort().join(','),g=by.get(key);if(g){g.n++;}else by.set(key,{m,n:1});}
  const list=[...by.values()].sort((a,b)=>a.m.biome-b.m.biome||b.m.lvl-a.m.lvl);
  return `<div class="ui-mgrid">`+list.map(({m,n})=>{const B=BIOMES[m.biome],c=mapChallenge(m.mods),pips='◆'.repeat(c)+'◇'.repeat(Math.max(0,3-c));
    return `<button type="button" class="ui-mtile" data-focus="map-${uxEsc(m.id)}" aria-label="${uxEsc(B.n)}，等級 ${m.lvl}，挑戰詞綴 ${c}，共 ${n} 張，查看詳情" style="--b1:${B.board.l};--b2:${B.board.m};--b3:${B.board.d}" onclick="uiInspectMap('${encodeURIComponent(m.id).replace(/'/g,'%27')}')">${uiMapThumb(m)}<span class="lv">Lv.${m.lvl}</span>${n>1?`<span class="cnt">×${n}</span>`:''}<b>${uxEsc(B.n)}</b><span class="pip" title="挑戰詞綴 ${c}">${pips}</span></button>`;}).join('')+`</div>`;
}
(function(){const st=document.createElement('style');st.textContent=`
#mbody .ui-mgroups{display:flex;flex-direction:column;gap:12px;margin:8px 0}
#mbody .ui-mgroup h4{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:3px 8px;font:15px var(--ux-body,system-ui);color:#12202a;background:linear-gradient(90deg,var(--b1),#ffffff00);border-left:6px solid var(--b3)}
#mbody .ui-mgroup h4 i{display:none}#mbody .ui-mgroup h4 small{margin-left:auto;font-size:12px;opacity:.7}
#mbody .ui-mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
#mbody .ui-mtile{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:flex-end;min-height:132px;padding:6px 4px 4px!important;border:2px solid #fff!important;outline:1px solid #7d8bbd;border-radius:0!important;background:linear-gradient(180deg,var(--b1) 0 55%,var(--b2) 55% 100%)!important;color:#12202a!important;box-shadow:0 2px 0 #8c9bd0!important;overflow:hidden}
#mbody .ui-mtile .ui-mapthumb{width:92px;height:auto;margin:0 0 2px;image-rendering:pixelated}
#mbody .ui-mtile:hover,#mbody .ui-mtile:focus-visible{outline:2px solid #2f6bff;transform:translateY(-1px)}
#mbody .ui-mtile span{font-family:var(--ux-body,system-ui)!important;text-shadow:1px 1px 0 #ffffffb0;line-height:1}
#mbody .ui-mtile .lv{position:absolute;left:4px;top:4px;padding:2px 4px;font-size:12px;background:#12202acc;color:#fff;text-shadow:none}
#mbody .ui-mtile .cnt{position:absolute;right:4px;top:4px;padding:2px 4px;font-size:13px;background:#ffe45c;color:#12202a;border:1px solid #12202a;text-shadow:none}
#mbody .ui-mtile b{font:13px var(--ux-body,system-ui);text-shadow:1px 1px 0 #ffffffb0;margin-bottom:3px}
#mbody .ui-mtile .pip{font-size:12px;letter-spacing:2px;color:#b3261e}
`;document.head.appendChild(st);})();
/* 角色選擇：復古選角視窗，頭像框加資料欄，延續藍紫窗口配色 */
(function(){const st=document.createElement('style');st.textContent=`
#mbody .char-card .chars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#mbody .char-card .chr{display:flex!important;flex-direction:row!important;align-items:stretch!important;gap:8px;min-height:84px;padding:5px!important;text-align:left;white-space:normal;background:#d9dff0!important;color:#1d2552!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:0 2px 0 #8c9bd0!important}
#mbody .char-card .chr .chr-pic{flex:0 0 66px;width:66px;height:66px;align-self:center;background:linear-gradient(180deg,#b8c8ee,#8fa3d8);border:2px solid #5c6a8e;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #33407f;overflow:hidden;display:block}
#mbody .char-card .chr .chr-pic img{width:100%;height:100%;display:block}
#mbody .char-card .chr .chr-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px}
#mbody .char-card .chr .chr-info b{display:block;color:#1d2552;padding:2px 4px;background:#fff;border:1px solid #8c9bd0;font-size:14px;line-height:1.15}
#mbody .char-card .chr .chr-info b small{margin-left:4px;font-size:11px;opacity:.7}
#mbody .char-card .chr .chr-info i{font-style:normal;font-size:12px;line-height:1.25}
#mbody .char-card .chr .chr-info em{font-style:normal;align-self:flex-start;padding:1px 5px;font-size:12px;background:#ffe45c;color:#1d2552;border:1px solid #1d2552}
#mbody .char-card .chr.on{background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%)!important;color:#fff!important;outline:2px solid #1d2552}
#mbody .char-card .chr.on .chr-pic{border-color:#ffe45c}
#mbody .char-card .chr.lock{opacity:.6}#mbody .char-card .chr.lock .chr-pic img{filter:grayscale(1) brightness(.6)}
#mbody .chr-data{margin:8px 0 4px;padding:8px 10px;background:#05060d;border:3px solid #8c9bd0;outline:1px solid #1d2552;color:#fff;font-family:var(--ux-body,system-ui)}
#mbody .chr-data p{display:flex;gap:10px;margin:0;line-height:1.5}#mbody .chr-data p span{flex:0 0 3em;color:#9fb4ff;letter-spacing:.1em}#mbody .chr-data p b{font-weight:normal;min-width:0}
@media(max-width:420px){#mbody .char-card .chr .chr-pic{flex-basis:52px;width:52px;height:52px}#mbody .char-card .chr{gap:6px;padding:4px!important}#mbody .char-card .chr .chr-info b{font-size:13px}}
`;document.head.appendChild(st);})();
/* 統一窗口風：區塊標題變標題列、摺疊列變小視窗列、數據列變黑底資料欄、日誌與空狀態變卡片 */
(function(){const st=document.createElement('style');st.textContent=`
#mbody .ui-section>h3,#mbody .ui-map-state h3,#mbody .mct,#uisettings h3,#mbody .rc>.rh{display:flex;align-items:center;gap:6px;margin:10px 0 6px;padding:3px 8px;font:14px var(--ux-body,system-ui);letter-spacing:.06em;color:#fff;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);border:2px solid #fff;outline:1px solid #1d2552;box-shadow:0 2px 0 #8c9bd0}
#mbody .ui-section>h3::before,#mbody .ui-map-state h3::before,#mbody .mct::before,#uisettings h3::before{content:"";width:8px;height:8px;background:#ffe45c;border:1px solid #1d2552;flex:none}
#mbody .ui-map-state{align-items:center}
#mbody details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;margin:6px 0 2px;padding:5px 8px;color:#1d2552;background:linear-gradient(#f2f4fa,#c3cbdc);border:2px solid #fff;outline:1px solid #5c6a8e;box-shadow:0 2px 0 #8c9bd0}
#mbody details>summary::-webkit-details-marker{display:none}
#mbody details>summary::before{content:"▶";font-size:10px;color:#33407f}
#mbody details[open]>summary::before{content:"▼"}
#mbody details[open]>summary{background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);color:#fff}#mbody details[open]>summary::before{color:#ffe45c}
#mbody .ui-stat-list{margin:6px 0;padding:6px 10px;background:#05060d;border:3px solid #8c9bd0;outline:1px solid #1d2552}
#mbody .ui-stat-list>div{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border:0!important;line-height:1.5}
#mbody .ui-stat-list dt{color:#9fb4ff;letter-spacing:.08em}#mbody .ui-stat-list dd{margin:0;color:#fff;font-variant-numeric:tabular-nums}
#mbody .lg{margin:8px 0;padding:6px 10px 8px;background:#f4f6ff;border:2px solid #fff;outline:1px solid #8c9bd0;box-shadow:0 2px 0 #c3cbdc}
#mbody .lg>b{display:inline-block;padding:1px 8px;margin-right:6px;background:#33407f;color:#fff;border:1px solid #1d2552}
#mbody .lg ul{margin:6px 0 0;padding-left:16px;list-style:square}
#mbody .ui-grid-empty{display:flex;flex-direction:column;align-items:center;gap:8px;margin:8px 0;padding:18px 12px!important;text-align:center;color:#33407f;background:#f4f6ff;border:2px dashed #8c9bd0}
#mbody .ui-grid-empty::before{content:"";width:34px;height:34px;background:linear-gradient(#b8c8ee,#8fa3d8);border:2px solid #5c6a8e;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #33407f}
#mbody .rpgm .rc,#mbody .ui-section{background:transparent}
`;document.head.appendChild(st);})();
(function(){const st=document.createElement('style');st.textContent=`#mbody .rc>.rh,#mbody .rc.wide>.rh{border-radius:0!important;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%)!important;color:#fff!important;border:2px solid #fff!important;padding:3px 8px!important}`;document.head.appendChild(st);})();
/* 設定頁：每組設定做成小視窗（標題列＋內容），圖示格、像素滑桿與檸檬黃數值標籤 */
(function(){const st=document.createElement('style');st.textContent=`
body.ui-material #uisettings .ui-setting-grid>.ui-setting-block,body #uisettings .ui-setting-block{position:relative;margin:10px 0!important;padding:0 10px 10px!important;background:#e6e8f6!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:3px 3px 0 #8c9bd0}
body #uisettings .ui-setting-block>h4,body #uisettings .view-fx-control>div:first-child{display:flex;align-items:center;justify-content:flex-start;gap:6px;margin:0 -10px 10px!important;padding:4px 8px;font:14px var(--ux-body,system-ui);color:#fff;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);border-bottom:2px solid #1d2552}
body #uisettings .ui-setting-block>h4::before,body #uisettings .view-fx-control>div:first-child label::before{content:"";display:inline-block;width:8px;height:8px;margin-right:6px;background:#ffe45c;border:1px solid #1d2552}
body #uisettings .view-fx-control label{color:#fff;font:14px var(--ux-body,system-ui)}
body #uisettings .view-fx-control output{margin-left:auto;padding:1px 8px;background:#ffe45c;color:#1d2552;border:1px solid #1d2552;font-size:12px}
body #uisettings .view-fx-ticks span{color:#33407f}
body #uisettings input#ui-fx-level{-webkit-appearance:none;appearance:none;background:transparent}
body #uisettings input#ui-fx-level::-webkit-slider-runnable-track{height:12px;background:#18233d;border:2px solid #1d2552;box-shadow:1px 1px 0 #fff}
body #uisettings input#ui-fx-level::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:22px;margin-top:-7px;background:linear-gradient(#fff3bf,#efce68);border:2px solid #1d2552;border-radius:0}
body #uisettings input#ui-fx-level::-moz-range-track{height:12px;background:#18233d;border:2px solid #1d2552}
body #uisettings input#ui-fx-level::-moz-range-thumb{width:14px;height:20px;background:#efce68;border:2px solid #1d2552;border-radius:0}
body.ui-material #uisettings #btns .act{position:relative;padding-left:14px!important;border-left:6px solid #33407f!important}
body.ui-material #uisettings #btns .act::after{content:"";position:absolute;left:-6px;top:0;width:6px;height:100%;background:linear-gradient(#ffe45c 0 30%,#33407f 30% 100%);opacity:0}
body #uisettings .view-settings .view-options>button,body #uisettings #watch-now{border-radius:0!important}
body #uisettings .ui-rules{margin-top:8px}
`;document.head.appendChild(st);})();
/* 更多選單：分組改為藍紫小窗口，入口卡片與編年史同色系 */
(function(){const st=document.createElement('style');st.textContent=`
body #mbody .ui-menu-group{margin:12px 0!important;padding:0 10px 10px!important;background:#e6e8f6!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:3px 3px 0 #8c9bd0!important}
body #mbody .ui-menu-group>h3{display:flex;align-items:center;gap:6px;margin:0 -10px 10px;padding:4px 8px;font:14px var(--ux-body,system-ui);letter-spacing:.06em;color:#fff;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);border-bottom:2px solid #1d2552}
body #mbody .ui-menu-group>h3::before{content:"";width:8px;height:8px;background:#ffe45c;border:1px solid #1d2552;flex:none}
body #mbody .ui-directory button,body #mbody .ui-wiki{background:#f4f5ff!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important;color:#1d2552!important}
body #mbody .ui-directory button:active,body #mbody .ui-wiki:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #8c9bd0!important}
body #mbody .ui-directory button b,body #mbody .ui-wiki b{color:#1d2552}
body #mbody .ui-directory button span,body #mbody .ui-wiki small{color:#5c6a8e!important}
body #mbody .ui-directory button i,body #mbody .ui-wiki i{color:#33407f;font-size:13px}
body #mbody .ui-wiki{margin-top:12px;background:linear-gradient(#fffbe0,#f6e9a8)!important}
`;document.head.appendChild(st);})();
/* 設定頁選項按鈕：由灰色斜面鈕改成淡紫扁平卡 */
(function(){const st=document.createElement('style');st.textContent=`
body #uisettings .ui-setting-grid>button,body #uisettings .view-settings .view-options>button,body #uisettings #watch-now{background:#f4f5ff!important;color:#1d2552!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important;text-shadow:none!important}
body #uisettings .ui-setting-grid>button:active,body #uisettings .view-settings .view-options>button:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #8c9bd0!important}
body #uisettings .ui-setting-grid>button small,body #uisettings .ui-setting-grid>button span{color:#5c6a8e!important}
body #uisettings .view-options>button[aria-pressed=true],body #uisettings .view-options>button.on,body #uisettings .view-options>button.sel{background:linear-gradient(#4a5aa8,#33407f)!important;color:#fff!important}
`;document.head.appendChild(st);})();
(function(){const st=document.createElement('style');st.textContent=`
body.ui-material #uisettings #btns button.act,body.ui-material #uisettings .ui-setting-grid>button.act,body.ui-material #uisettings button.act{background:#f4f5ff!important;background-image:none!important;color:#1d2552!important;border:2px solid #fff!important;border-left:6px solid #33407f!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important}
body #uisettings button.act b{color:#1d2552}body #uisettings button.act small{color:#5c6a8e!important}
body.ui-material #mbody .ui-menu-group{margin:12px 0!important;padding:0 10px 10px!important;background:#e6e8f6!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:3px 3px 0 #8c9bd0!important}
body.ui-material #mbody .ui-menu-group .ui-directory,body.m.ui-material #mbody .ui-menu-group .ui-directory{grid-template-columns:1fr!important}
body.ui-material #mbody .ui-directory button{background-image:none!important;grid-template-columns:auto 1fr auto}
`;document.head.appendChild(st);})();
(function(){const st=document.createElement('style');st.textContent=`html body.ui-material :is(#mbody,#ovl) .mct,html body.ui-material :is(#mbody,#ovl) .mct *{color:#fff!important}html body.ui-material :is(#mbody,#ovl) .mct small,html body.ui-material :is(#mbody,#ovl) .mct button{color:#1d2552!important}`;document.head.appendChild(st);})();
(function(){const s=document.createElement('style');s.textContent='.ui-segments>button,.device-directory-card{position:relative}.ui-segments>button .rd,.device-directory-card .rd{position:absolute;top:3px;right:3px;margin:0}.device-affix.legend p{color:#ffd88a}';document.head.appendChild(s)})();
(function(){const s=document.createElement('style');s.textContent='body.ui-material #mbody .pz.wb button.pc.ac{background:rgba(22,35,63,.34)!important}body.ui-material #mbody .pz.wb button.pc.ac>img{width:min(66%,48px)!important;height:auto!important;aspect-ratio:1;max-width:none!important;max-height:none!important}.pz.wb .pc.ac.lnk{animation:gem-glow 1.6s ease-in-out infinite}@keyframes gem-glow{0%,100%{filter:none}50%{filter:drop-shadow(0 0 5px var(--padc))}}body.reduced-effects .pz.wb .pc.ac.lnk{animation:none}.wsvg .wire-current{stroke-width:.09;opacity:1;filter:drop-shadow(0 0 .06px #fff)}';document.head.appendChild(s)})();
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')||e.target?.isContentEditable)return;const k=e.key.toLowerCase();
  if(k==='m'&&typeof audMode==='function'){const off=(typeof AUD!=='undefined'&&AUD.mode)==='off';audMode(off?'all':'off');if(typeof uxAnnounce==='function')uxAnnounce(off?'已開啟音樂與音效。':'已關閉音樂與音效。');}
  else if(k==='b'&&typeof viewApplyPrefs==='function'){GAME_VIEW.prefs.hideBattle=!GAME_VIEW.prefs.hideBattle;viewSavePrefs();viewApplyPrefs();if(typeof uxAnnounce==='function')uxAnnounce(GAME_VIEW.prefs.hideBattle?'已隱藏戰鬥畫面。':'已顯示戰鬥畫面。');}
});
(function(){const s=document.createElement('style');s.textContent='.stage{position:relative}.stage::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0;transition:opacity 1.2s;background:radial-gradient(ellipse at 50% 45%,rgba(176,96,255,.18),rgba(92,24,168,.55));mix-blend-mode:multiply}body.rift-on .stage::after{opacity:1}body.rift-on.reduced-effects .stage::after{transition:none}.cart-guide{margin:6px 0 10px;padding:8px 10px 8px 26px;font-size:13px;line-height:1.7;border:1px solid #92a7c466;border-radius:6px}.cart-guide li.now{font-weight:700}@media(pointer:coarse){.talent-viewport{touch-action:none!important;overflow:hidden!important}}.audio-hint{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;padding:8px 14px;border-radius:6px;background:#14123aee;color:#fff;font-size:14px;pointer-events:none;transition:opacity .6s}';document.head.appendChild(s)})();
(function(){let el=null;const done=()=>{if(el){el.style.opacity=0;setTimeout(()=>el?.remove(),700);el=null}};
addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{if(typeof AUD==='undefined'||AUD.ctx||AUD.mode!=='all')return;el=document.createElement('div');el.className='audio-hint';el.textContent='點一下畫面即可開啟音樂（按 M 可關閉）';document.body.appendChild(el);},1200)});
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,done,{passive:true}));})();
(function(){const s=document.createElement('style');s.textContent='.pz.wb .pc.ac .gflow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible;fill:none}.pz.wb .pc.ac .gflow polyline{stroke:var(--padc);stroke-width:.07;stroke-dasharray:.1 .09;stroke-linecap:round;stroke-linejoin:round;opacity:.55}.pz.wb .pc.ac .gflow.lit polyline{opacity:.95;animation:gflow 1s linear infinite}@keyframes gflow{to{stroke-dashoffset:-.38}}body.reduced-effects .pz.wb .pc.ac .gflow.lit polyline{animation:none}';document.head.appendChild(s)})();
