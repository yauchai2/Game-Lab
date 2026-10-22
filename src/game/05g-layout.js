/* 操作台：共用導覽、工作分類與響應式外框。UI 暫存不改遊戲規則。 */
const UI_NAV = [
  {k:'char',n:'角色',icon:'role',pages:['char','dress','warehouse']},
  {k:'skills',n:'戰鬥',icon:'battle',pages:['skills']},
  {k:'craft',n:'打造',icon:'craft',pages:['craft']},
  {k:'tree',n:'成長',icon:'growth',pages:['tree']},
  {k:'maps',n:'冒險',icon:'adventure',pages:['maps']},
  {k:'menu',n:'更多',icon:'more',pages:['menu','goals','ach','dex','log','save','settings']}
];
const UI_TITLE = {warehouse:'裝備倉庫',char:'角色總覽',dress:'角色與裝扮',skills:'戰鬥構築',craft:'打造工作台',tree:'天賦成長',maps:'冒險',menu:'更多',goals:'目標',ach:'成就',dex:'圖鑑',log:'更新日誌',save:'存檔與備份',settings:'遊戲設定'};
const UI_WORK = {inventory:'support',craftSlot:'weapon',craftAct:'upgrade',adventure:'maps'};
function uiNavHtml(){
  return UI_NAV.map(g=>{const current=g.pages.includes(modalTab),locked=!tabOpen(g.k),dot=g.k==='menu' ? dotOn('col')||logNew() : g.k==='tree' ? passPoints()>0 : dotOn(g.k);
    return `<button class="tab${current?' on':''}${locked?' lock':''}" data-focus="nav-${g.k}" aria-label="${g.n}" ${locked?`aria-describedby="nav-lock-${g.k}"`:dot?`aria-describedby="nav-new-${g.k}"`:""} aria-current="${current?'page':'false'}"  onclick="${locked?`lockTip('${g.k}')`:`openModal('${g.k}')`}">${spr(g.icon,24)}<span>${g.n}</span>${locked?`<span class="uxsr" id="nav-lock-${g.k}">等級 ${TAB_LVL[g.k]} 解鎖，按下查看說明</span>`:''}${dot&&!locked?`<i class="rd" aria-hidden="true"></i><span class="uxsr" id="nav-new-${g.k}">有新內容</span>`:''}</button>`;
  }).join('');
}
function uiTitle(){
  const box=document.querySelector('#modal > .mbox');if(!box)return;
  let el=$('mttl');if(!el){el=document.createElement('div');el.id='mttl';box.insertBefore(el,$('mbody'));}
  const root=UI_NAV.find(g=>g.pages.includes(modalTab)),back=root&&modalTab!==root.k;
  const hk=MHELP[modalTab],cz=(modalTab==='skills'||modalTab==='craft')&&!G.userCz?2:G.cz==null?1:G.cz;
  el.innerHTML=`${back?`<button class="ui-back" aria-label="返回${root.n}" onclick="openModal('${root.k}')">‹</button>`:''}<h2>${UI_TITLE[modalTab]||'更多'}</h2>${hk?`<button aria-label="${HELP[hk][0]}" onclick="showHelp('${hk}')">?</button>`:''}${MOB()?`<button aria-label="切換戰場大小，目前${CZN[cz]}" onclick="cycleCz()">${CZN[cz]}</button>`:''}`;
}
function uiSegments(key,items,label){return `<div class="ui-segments" role="group" aria-label="${label}">${items.map(([id,name])=>`<button aria-pressed="${UI_WORK[key]===id}" data-focus="${key}-${id}" onclick="uiWork('${key}','${id}')">${name}</button>`).join('')}</div>`;}
function uiWork(key,id){
  const allowed={inventory:['active','support','cart'],craftSlot:Object.keys(SLOTN),craftAct:Object.keys(CRAFT),adventure:['maps','tower','training']};
  if(!allowed[key]?.includes(id))return;UI_WORK[key]=id;renderModal();
}
function uiMenuHtml(){
  const group=(name,items)=>`<section class="ui-menu-group"><h3>${name}</h3><div class="ui-directory">${items.map(([k,n,d])=>`<button onclick="openModal('${k}')"><b>${n}</b><span>${d}</span><i aria-hidden="true">↗</i></button>`).join('')}</div></section>`;
  return group('進度與收藏',[['goals','目標','下一個里程碑與獎勵'],['ach','成就','已達成的挑戰'],['dex','圖鑑','技能、卡匣與收藏紀錄']])+group('系統工具',[['log','更新日誌','查看版本與更新'],['save','存檔與備份','本機保存、匯入及匯出'],['settings','遊戲設定','戰鬥規則、拾取與音效']])+`<button class="ui-wiki" aria-label="編年史" onclick="wikiOpen()">${spr('star',24)}<span><b>編年史</b><small>查看所有遊戲資訊</small></span><i aria-hidden="true">↗</i></button>`;
}
function uiCharacterHtml(){
  const s=G.st;
  const rows=[['預估傷害',tFmt(s.dps)+' DPS'],['最大生命',tFmt(s.life)],['暴擊率',s.crit.toFixed(0)+'%'],['傷害減免',(s.red*100).toFixed(0)+'%']];
  return `<section class="ui-character-head"><span class="ui-eyebrow">${CHARS[G.char].n}</span><h3>${uxEsc(G.heroName||'阿街')}<small>LV. ${G.lvl}</small></h3><p id="ui-char-progress">深度 ${G.depth} · 累計擊殺 ${tFmt(G.totalKills)}</p><button class="mb" onclick="openModal('dress')">角色與裝扮 ↗</button></section><section class="ui-section"><button class="mb pri" onclick="openModal('warehouse')">裝備倉庫（<span id="ui-gear-count">${G.inventory.length}</span>／200）</button><p>拾到與替換的裝備留在倉庫。電路點數：${G.chips}。</p></section><div class="ui-equipment">${Object.keys(SLOTN).map(slotHtml).join('')}</div>${uiCoreCollection()}<section class="ui-section"><h3>戰鬥狀態</h3><dl class="ui-stat-list">${rows.map(([n,v])=>`<div><dt>${n}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="uxmeta">自動換裝可在倉庫調整。傳奇核心保留，可在收藏中換用或還原。</p></section>${charHtml()}${cardsHtml()}<details class="ui-section"><summary>事件紀錄</summary><ol class="log">${G.log.map(l=>`<li>${uxEsc(l.txt)}</li>`).join('')}</ol></details>`;
}
function uiCoreCollection(){
  const ids=Object.keys(LEGEND_BY).filter(id=>G.armory[id]);
  return `<details class="ui-section ui-core-collection"><summary>傳奇核心收藏 ${ids.length}／${Object.keys(LEGEND_BY).length}</summary><p class="uxmeta">不同核心會留下來供你研究；裝備中的核心不會被自動替換。同款只保留一件，未裝備、未鎖定且未腐化的收藏會比較升級，其餘重複品拆成零件。</p>${ids.length?ids.map(id=>{const it=G.armory[id],on=G.equip[it.slot]?.lg===id;return `<article class="ui-core-item"><div class="nm">${xico('legend',id,28)}<b>${uxEsc(it.name)}</b><small>${SLOTN[it.slot]} · 等級 ${it.il}</small></div><p>${uxEsc(LEGEND_BY[id].d)}</p><details><summary>屬性與效果</summary><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul></details><button class="mb" ${on?'disabled':''} onclick="uiEquipCore('${id}')">${on?'已裝備':`換上${uxEsc(it.name)}`}</button></article>`}).join(''):'<p>打到第一件傳奇後，就能在這裡保留及換用它的特殊效果。</p>'}<div class="uxactions">${Object.keys(SLOTN).filter(slot=>G.equipBackup[slot]).map(slot=>`<button class="mb" onclick="uiRestoreEquipment('${slot}')">切回上一件${SLOTN[slot]}</button>`).join('')}</div></details>`;
}
function uiEquipCore(id){ if(equipCore(id)){renderModal();uxAnnounce(`已換上${LEGEND_BY[id].name}，可切回上一件裝備。`);} }
function uiRestoreEquipment(slot){ if(restoreEquipment(slot)){renderModal();uxAnnounce(`已切回上一件${SLOTN[slot]}。`);} }
function uiInventoryHtml(){
  const kind=UI_WORK.inventory;
  const head=uiSegments('inventory',[['active','主動技能'],['support','輔助配件'],['cart','模式卡匣']],'機件庫存分類');
  let content='';
  if(kind==='active')content=`<div class="ui-inventory-grid">${Object.entries(SKILLS).map(([id,K])=>{const unlocked=G.lvl>=K.lvl,used=G.slots.includes(id);return `<button class="gt${held?.key===id?' on':''}" data-focus="active-${id}" ${!unlocked||used?'disabled':''} aria-label="${uxEsc(K.n+'：'+K.d)}" onclick="pzHold('active','${id}')" onpointerdown="pzDown(event,'active','${id}')">${sico(id,26)}<b>${K.n}</b>${shapeIcon('active',id)}<small>${!unlocked?`等級 ${K.lvl} 解鎖`:used?'已放在盤面':K.d}</small></button>`}).join('')}</div>`;
  else if(kind==='support')content=`<div class="ui-inventory-grid">${Object.entries(SUPPS).map(([id,S])=>{const n=G.gems[id]||0,f=gemFree(id);return `<button class="gt${held?.key===id?' on':''}" data-focus="support-${id}" ${f?'':'disabled'} aria-label="${uxEsc(S.n)}，${f}／${n}，${uxEsc(S.d)}" onclick="pzHold('support','${id}')" onpointerdown="pzDown(event,'support','${id}')">${G.newSnap&&n>(G.newSnap.g[id]||0)?'<i class="nw">NEW</i>':''}${gemIco(id,26)}<b>${S.n}</b><em>${f}/${n}</em><small>${S.d}</small>${shapeIcon('support',id)}</button>`}).join('')}</div>`;
  else content=cartsHtml();
  return `<section id="uxinventory" class="ui-inventory" aria-label="機件庫存"><h3>機件庫存</h3>${head}${content}</section>`;
}
function uiResolvedHtml(){
  const resolved=GridLab.resolve(G.board),pieces=new Map(G.board.pieces.map(p=>[p.id,p]));
  const supports=G.board.pieces.filter(p=>p.kind==='support');
  const linked=new Set(resolved.flatMap(r=>r.linked));
  const adjacent=(a,b)=>GridLab.cellsOf(a).some(([x,y])=>GridLab.cellsOf(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
  const unused=supports.filter(p=>!linked.has(p.id));
  return `<section class="ui-section ui-resolved" aria-label="目前生效技能"><h3>目前生效</h3>${resolved.length?resolved.map(r=>{const s=G.st.sk[r.key];return `<article><div>${sico(r.key,24)}<b>${SKILLS[r.key].n}</b><span>${s?`冷卻 ${s.cd.toFixed(1)} 秒`:''}</span></div><p>${r.linked.length?r.linked.map(id=>SUPPS[pieces.get(id).key].n).join('、'):'尚未連接輔助配件'}</p>${s?.mode?`<p>模式：${MODES[s.mode].n}</p>`:''}</article>`}).join(''):'<p>盤面沒有主動技能，放置一個即可開始構築。</p>'}${unused.length?`<details><summary>未生效配件 ${unused.length} 件</summary><ul>${unused.map(p=>`<li><b>${SUPPS[p.key].n}</b>：${G.board.pieces.some(a=>a.kind==='active'&&adjacent(a,p))?'相鄰技能的標籤不符':'未與主動技能相鄰'}</li>`).join('')}</ul></details>`:''}<p class="uxmeta">DPS 為構築估算；實戰測量可前往冒險的訓練場。</p></section>`;
}
function uiRevealSelection(){requestAnimationFrame(()=>{const el=document.querySelector('.uxinspect');if(el){el.scrollIntoView({block:'start'});el.querySelector('.uxboard-link,button')?.focus({preventScroll:true});}});}
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
  const settings=document.createElement('div');settings.id='uisettings';settings.hidden=true;settings.innerHTML='<section class="ui-settings-intro"><h3>戰鬥與音效</h3><p>調整自動戰鬥、拾取及音效，或使用裝備重鑄。</p></section>';settings.appendChild(menu);document.querySelector('#modal > .mbox').appendChild(settings);
  uiApplyLayout(true);let frame;
  addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>uiApplyLayout());});
}
const UI_LAYOUT_CSS=`
body.d{grid-template-columns:minmax(0,1fr) clamp(440px,34vw,520px)!important;grid-template-areas:"hd rt" "st rt"!important;grid-template-rows:48px minmax(0,1fr);height:100dvh;max-width:1920px;overflow:hidden;padding:16px 18px 34px!important;gap:12px 16px}
body.d>.rpg,body.m>.rpg{display:none!important}body.d>header{grid-area:hd;align-self:center;margin:0;padding:0 8px}body.d>header h1 .wm{width:194px!important}body.d .stage{grid-area:st;min-width:0;align-self:start;position:relative;margin:0;padding-bottom:40px}body.d #fig{width:100%;margin:0}
body.d #modal{grid-area:rt;position:relative;inset:auto;width:100%;height:100%;min-height:0;top:0;align-self:stretch}body.d #modal>.mbox{padding:0!important;display:flex;flex-direction:column;overflow:hidden;height:100%;background:var(--ux-screen)!important}body.d #modal>.mbox::before{display:none}
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
#mbody .dpsbar{position:static!important;margin:8px 0;padding:10px;border:1px solid var(--ux-edge);border-radius:8px;background:#eaf1fd}.dpsbar>div:first-child{font:13px system-ui,sans-serif}.dpsbar>div:first-child b{font-size:22px;font-variant-numeric:tabular-nums}.shares{margin-top:6px}.shares span{font:11px system-ui,sans-serif!important}.uxinspect{scroll-margin-top:12px}.uxinspect .uxeffect{font-weight:600}.uxinspect-head{flex-wrap:wrap}.uxinspect-head>b{flex:1}.uxinspect-head .shp{display:none}.uxinspect-head .uxboard-link{margin:0;min-height:40px}.uxinspect-head .uxquiet{margin:0}.uxgrid-help{margin:10px 0;font-size:12px}#mbody .pz{max-width:336px;margin:12px auto;gap:4px;padding:7px;background:#c4d0e8;border:1px solid #8e9fc6;border-radius:9px}#mbody .pzbar{position:static!important;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;background:none;border:0}#mbody .rz{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:8px 0}.ui-resolved article{padding:10px 0;border-bottom:1px solid #e1e8f4}.ui-resolved article>div{display:flex;align-items:center;gap:8px}.ui-resolved article>div>span:last-child{margin-left:auto;font-size:12px;color:var(--ux-muted)}.ui-resolved article p{font-size:13px;margin:5px 0;color:var(--ux-muted)}.ui-resolved details{margin-top:10px}.ui-resolved summary{min-height:36px;padding:8px 0}
.ui-directory{display:grid;gap:8px}.ui-directory button,.ui-wiki{display:flex;align-items:center;gap:10px;min-height:64px;padding:10px 12px;text-align:left;border:1px solid #b9c8e3;border-radius:7px;background:#f3f7ff;color:var(--ux-ink);font:14px system-ui,sans-serif}.ui-directory button{display:grid;grid-template-columns:1fr auto}.ui-directory button b{font-weight:600}.ui-directory button span{grid-column:1;font-size:12px;color:var(--ux-muted)}.ui-directory i{grid-column:2;grid-row:1/3;font-style:normal}.ui-wiki{width:100%;background:#e6eefa}.ui-wiki span{display:grid;gap:4px}.ui-wiki small{color:var(--ux-muted)}.ui-wiki i{margin-left:auto;font-style:normal}
.ui-craft-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.ui-craft-slots button{min-height:82px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:9px;border:1px solid #b1c1de;border-radius:8px;background:#eaf0fb;color:var(--ux-ink);font:13px system-ui,sans-serif}.ui-craft-slots button[aria-pressed="true"]{border:2px solid var(--ux-blue);background:#fff}.ui-craft-slots small{font-size:11px}.ui-craft-wallet{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0}.ui-craft-wallet strong{font:22px "Cubic 11",system-ui,sans-serif}.ui-craft-detail>ul{list-style:none;padding:0;margin:12px 0}.ui-craft-detail li{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #e0e8f6;padding:6px 0;font-size:13px}.ui-craft-operation{padding:12px;background:#eaf1fb;border-radius:8px;margin:10px 0}.ui-craft-operation h3{font-size:16px;margin:0 0 6px}.ui-craft-operation p{font-size:13px;margin:5px 0}.ui-craft-operation .mb{width:100%;margin-top:10px}.ui-craft-result{margin:12px 0}.ui-rules{margin-top:12px;border-top:1px solid #c7d3e8;padding-top:10px}.ui-rules summary{padding:8px 0}
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
@media(max-height:500px){body.m .stats{top:0}body.m #mttl{min-height:40px}body.m .stage{padding-bottom:30px}body.m #fig{max-height:110px}body.m #mbody{padding:8px}body.m #mtabs{height:48px}body.m{padding-bottom:calc(48px + env(safe-area-inset-bottom))!important}}
`;
function uiAdventureHtml(){
  const R=G.run,mode=UI_WORK.adventure;
  const nav=uiSegments('adventure',[['maps','地圖'],['tower','無限之塔'],['training','訓練場']],'冒險分類');
  const current=R?`<section class="ui-section"><div class="ui-map-state"><b>${R.tower?'無限之塔 第 '+R.floor+' 層':BIOMES[R.map.biome].n}</b><span>進行中</span></div><div class="ui-progress" role="progressbar" aria-label="地圖擊殺進度" aria-valuemin="0" aria-valuemax="${R.need}" aria-valuenow="${Math.min(R.kills,R.need)}"><i style="width:${Math.min(100,R.kills/R.need*100)}%"></i></div><p id="ui-run-count" class="uxmeta">擊殺 ${Math.min(R.kills,R.need)}／${R.need}</p>${runMods(R)}<button class="mb" onclick="uiLeaveMap()">離開目前挑戰</button></section>`:`<section class="ui-section"><div class="ui-map-state"><b>一般冒險</b><span>深度 ${G.depth}</span></div><p id="ui-normal-count" class="uxmeta">擊殺 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'，持續推進並挑戰守關者':'，目前原地刷怪'}</p></section>`;
  if(mode==='tower')return current+nav+`<section class="ui-section"><h3>無限之塔</h3><p>最高紀錄 ${G.towerBest||0} 層</p><p class="uxmeta">${G.maxDepth<8?'深度 8 解鎖':'逐層挑戰更強的守關者。'}</p><button class="mb pri" ${R||G.maxDepth<8?'disabled':''} onclick="towerStart()">挑戰無限之塔</button>${R?'<p class="uxmeta">請先完成或離開目前挑戰。</p>':''}</section>`;
  if(mode==='training'){
    const L=G.trainLast,mx=L?.rows.length?L.rows[0][1]:1;
    return current+nav+`<section class="ui-section"><h3>訓練場</h3><p>5 隻不還手的假人，測量 30 秒實際傷害。</p>${G.train?`<p id="ui-train-time">測量中，剩 ${Math.ceil(G.train.t)} 秒</p><button class="mb" onclick="trainEnd(true)">取消測量</button>`:`<button class="mb pri" ${R?'disabled':''} onclick="trainStart()">開始測量</button>`}${L?`<p>上次結果：每秒約 <b>${tFmt(L.dps)}</b>（5 隻合計）</p>${L.rows.map(([k,v])=>`<div class="gl"><b>${uxEsc(k)}</b><i style="--p:${Math.round(v/mx*100)}%"></i><em>${L.total?Math.round(v/L.total*100):0}%　${tFmt(v/30)}／秒</em></div>`).join('')}`:'<p class="uxmeta">完成一次測量後，會在這裡保留技能傷害分布。</p>'}</section>`;
  }
  return current+nav+`<div class="ui-map-state"><h3>可用地圖</h3><span class="uxmeta">${G.maps.length}／15 張</span></div><div class="ui-map-list">${G.maps.length?G.maps.map(m=>{const biome=BIOMES[m.biome],q=m.mods.reduce((sum,k)=>sum+(MODS[k]?.q||0),0);return `<article class="ui-map-card"><div class="ui-map-banner" style="--land:${biome.board.l};--land2:${biome.board.m}"><span>LV. ${m.lvl} · ${R?'挑戰中，暫不可進入':'可進入'}</span><h3>${biome.n}</h3></div><div class="ui-map-info"><div class="rchips"><span class="chip bad">挑戰詞綴 ${mapChallenge(m.mods)}</span><span class="chip ok">戰利品 +${Math.round(q*100)}%</span></div><details><summary>查看詞綴與獎勵</summary><ul>${m.mods.length?m.mods.map(k=>`<li><b>${mapKind(k)}</b> · ${MODS[k].n}</li>`).join(''):'<li>沒有額外詞綴</li>'}</ul>${m.mods.includes('rich')?'<p>金幣 +60%</p>':''}${m.mods.includes('lucky')?'<p>稀有度提升</p>':''}</details><button class="mb pri" ${R?'disabled':''} onclick="enterMap('${m.id}')">進入 · 消耗這張地圖</button></div></article>`}).join(''):'<section class="ui-section"><h3>還沒有地圖</h3><p>繼續一般冒險，打贏守關者便有機會取得地圖。</p></section>'}</div>`;
}
function uiLeaveMap(){
  if(!G.run)return;
  showOverlay(`<h2 class="uxdialog-title">離開目前挑戰？</h2><p>目前的進度會結束，已消耗的地圖不會退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續挑戰</button><button class="mb pri" onclick="hideOverlay();abandonMap()">離開挑戰</button></div>`);
}

let UI_LIVE_SIGNATURE='';
function uiLiveSignature(){
  if(modalTab==='warehouse')return JSON.stringify([G.inventoryRevision,G.autoEquip,G.storageRecycled]);
  if(modalTab==='skills')return JSON.stringify([G.lvl,G.board,G.gems,G.carts,G.seen,G.st.dps,G.chips]);
  if(modalTab==='char')return JSON.stringify([G.lvl,G.equip,G.armory,G.equipBackup,G.char,G.heroName,G.cards,G.picks,G.relicPicks]);
  if(modalTab==='craft')return JSON.stringify([G.parts,G.equip]);
  if(modalTab==='maps')return JSON.stringify([G.maps,G.run?.map.id,G.run?.floor,G.towerBest,!!G.train,G.trainLast,G.maxDepth]);
  return modalTab;
}
function uiRefreshLive(){
  if(G.offline||document.body.classList.contains('watch-mode'))return;
  if(!$('modal')||$('modal').hidden)return;
  const signature=uiLiveSignature();
  if(signature!==UI_LIVE_SIGNATURE&&!drag&&!UX_LAYERS.length&&!document.querySelector('#mbody input:focus,#mbody textarea:focus'))renderModal();
  const gearCount=$('ui-gear-count');if(gearCount&&gearCount.textContent!==String(G.inventory.length))gearCount.textContent=G.inventory.length;
  const progress=$('ui-char-progress'),text=`深度 ${G.depth} · 累計擊殺 ${tFmt(G.totalKills)}`;
  if(progress&&progress.textContent!==text)progress.textContent=text;
  const R=G.run,count=$('ui-run-count'),bar=document.querySelector('[aria-label="地圖擊殺進度"]');
  if(R&&count){count.textContent=`擊殺 ${Math.min(R.kills,R.need)}／${R.need}`;if(bar){bar.setAttribute('aria-valuenow',Math.min(R.kills,R.need));bar.querySelector('i').style.width=Math.min(100,R.kills/R.need*100)+'%';}}
  const normal=$('ui-normal-count');if(normal&&!R)normal.textContent=`擊殺 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'，持續推進並挑戰守關者':'，目前原地刷怪'}`;
  const timer=$('ui-train-time');if(timer&&G.train)timer.textContent=`測量中，剩 ${Math.ceil(G.train.t)} 秒`;
}

let UI_RESPEC=null;
function uiRespec(){
  const cost=100*G.lvl;if(!G.pass.length||G.gold<cost)return;
  UI_RESPEC={lvl:G.lvl,pass:JSON.stringify(G.pass),cost};
  showOverlay(`<h2 class="uxdialog-title">重置目前構築的天賦？</h2><p>消耗 ${cost} 金幣，清除目前配置，點數可重新分配。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="UI_RESPEC=null;hideOverlay()">保留天賦</button><button class="mb pri" onclick="uiConfirmRespec()">重置天賦</button></div>`);
}
function uiConfirmRespec(){
  const pending=UI_RESPEC;UI_RESPEC=null;hideOverlay();if(!pending)return;
  if(G.lvl!==pending.lvl||JSON.stringify(G.pass)!==pending.pass||G.gold<pending.cost){uxAnnounce('天賦或金幣已變動，請重新確認。');return;}
  respec();uxAnnounce(`已重置天賦，消耗 ${pending.cost} 金幣。`);
}

/* 倉庫與電路合成沿用同一外殼、確認及焦點系統。 */
const WAREHOUSE_UI={slot:'all',page:0};
function warehouseHtml(){
 const list=G.inventory.filter(it=>WAREHOUSE_UI.slot==='all'||it.slot===WAREHOUSE_UI.slot).slice().reverse(),pages=Math.max(1,Math.ceil(list.length/12));WAREHOUSE_UI.page=Math.min(WAREHOUSE_UI.page,pages-1);
 return `<section class="ui-section"><h3>裝備倉庫 ${G.inventory.length}／200</h3><p>拾到與換下的裝備留在這裡；傳奇在角色的核心收藏。</p><button class="mb" data-focus="warehouse-auto" aria-pressed="${G.autoEquip}" onclick="G.autoEquip=!G.autoEquip;G.dirty=true;renderModal()">自動換裝：${G.autoEquip?'開':'關'}</button><p class="uxmeta">滿倉優先保留高稀有度與高階詞綴，僅回收未保護裝備；低於過濾門檻也會回收。累計回收 ${G.storageRecycled} 件。</p><div class="ui-segments" role="group" aria-label="倉庫部位">${[['all','全部'],...Object.entries(SLOTN)].map(([id,n])=>`<button data-focus="warehouse-filter-${id}" aria-pressed="${WAREHOUSE_UI.slot===id}" onclick="WAREHOUSE_UI.slot='${id}';WAREHOUSE_UI.page=0;renderModal()">${n}</button>`).join('')}</div></section><div class="ui-warehouse-list">${list.slice(WAREHOUSE_UI.page*12,WAREHOUSE_UI.page*12+12).map(it=>`<article class="ui-section"><div class="nm">${eqico(it.slot,it.r,28)}<b>${uxEsc(it.name)}</b><small>${RAR[it.r].n} · Lv. ${it.il}</small></div><p>${it.kept?'已鎖定 · ':''}${G.equip[it.slot]===it?'穿著中':G.equipBackup[it.slot]===it?'上一件裝備':'倉庫保管'}</p><ul>${itemLines(it).slice(0,3).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><button class="mb" data-focus="gear-${it.uid}" onclick="uiInspectGear(${it.uid})">比較與管理</button></article>`).join('')||'<p>目前沒有這個部位的裝備。角色走近掉落物後會自動拾入。</p>'}</div><div class="uxactions"><button class="mb" data-focus="warehouse-prev" ${WAREHOUSE_UI.page===0?'disabled':''} onclick="warehouseMove(-1)">上一頁</button><span>第 ${WAREHOUSE_UI.page+1}／${pages} 頁 · ${list.length} 件</span><button class="mb" data-focus="warehouse-next" ${WAREHOUSE_UI.page>=pages-1?'disabled':''} onclick="warehouseMove(1)">下一頁</button></div>`;
}
function uiInspectGear(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;const next=calc({...G.equip,[it.slot]:it}),current=G.st,on=G.equip[it.slot]===it,guard=it.kept||it.cr||it.lk!=null||on||Object.values(G.equipBackup).includes(it);
 showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · ${RAR[it.r].n} · 物品等級 ${it.il}</p><dl class="ui-stat-list"><div><dt>預估傷害</dt><dd>${tFmt(current.dps)} → ${tFmt(next.dps)}</dd></div><div><dt>最大生命</dt><dd>${tFmt(current.life)} → ${tFmt(next.life)}</dd></div><div><dt>暴擊率</dt><dd>${current.crit.toFixed(1)}% → ${next.crit.toFixed(1)}%</dd></div></dl><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回倉庫</button><button class="mb pri" ${on?'disabled':''} onclick="uiWearStored(${uid})">${on?'穿著中':'換上這件裝備'}</button><button class="mb" onclick="uiKeepStored(${uid})">${it.kept?'解除保管鎖定':'鎖定保管'}</button><button class="mb" ${guard?'disabled':''} onclick="uiRecycleAsk(${uid})">回收裝備</button></div>${guard?'<p class="uxmeta">穿著、上一件、鎖定、詞綴鎖定或已腐化的裝備受保護，不能直接回收。</p>':''}`);
}
function uiWearStored(uid){if(!equipStored(uid)){uxAnnounce('裝備狀態已變更，請重新查看。');return;}hideOverlay();renderModal();uxAnnounce('已換裝，自動換裝已關閉，上一件裝備保留。');}
function uiKeepStored(uid){const it=G.inventory.find(x=>x.uid===uid);if(!it)return;it.kept=!it.kept;G.inventoryRevision++;G.dirty=true;hideOverlay();renderModal();uxAnnounce(it.kept?'裝備已鎖定保管。':'已解除保管鎖定。');}
function uiRecycleAsk(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;
 hideOverlay();showOverlay(`<h2 class="uxdialog-title">回收 ${uxEsc(it.name)}？</h2><p>裝備會消失，轉為 ${itemValue(it)} 金幣及零件；不能還原。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備</button><button class="mb pri" onclick="uiRecycleConfirm(${uid})">確認回收</button></div>`);
}
function uiRecycleConfirm(uid){const ok=recycleStored(uid);hideOverlay();renderModal();document.querySelector('[data-focus="warehouse-auto"]')?.focus();uxAnnounce(ok?'已回收為金幣與零件。':'裝備受到保護或已不存在，沒有回收。');}
function circuitShopHtml(){return `<details class="ui-section"><summary>電路合成 · <span id="ui-chip-count">${G.chips}</span> 點</summary><p>拾取敵人掉落的電路點數，用來指定合成配件；所有角色都能使用，相鄰及標籤規則照常生效。</p>${['FOCUS','FORK','RECOVER','DELAY'].map(id=>`<article><p>${gemIco(id,24)} ${SUPPS[id].n} · ${SUPPS[id].d}</p><button class="mb" ${G.chips<20?'disabled':''} onclick="uiBuySupport('${id}')">20 點合成 ${SUPPS[id].n}</button></article>`).join('')}</details>`;}
function uiBuySupport(id){if(!buyCircuitSupport(id)){uxAnnounce('電路點數不足，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${SUPPS[id].n}，消耗 20 電路點數。`);}
function treeAvailableHtml(){
 const open=Object.values(TREE).filter(n=>nodeOpen(n.id)),branch={A:'耐久',B:'元素',C:'暴擊',D:'超頻',E:'回授',F:'電池',R:'接線'};
 return `<details class="ui-section"><summary>可連接節點清單（${open.length}）</summary><p>可用清單選擇，不必瞄準盤面的小圓點。每個節點消耗 1 天賦點，所有角色共用。</p><div class="ui-directory">${open.map(n=>`<button data-focus="talent-${n.id}" ${passPoints()<=0?'disabled':''} onclick="uiAllocateTalent('${n.id}')"><b>${branch[n.id[0]]}支線</b><span>${uxEsc(n.name)}</span></button>`).join('')||'<p>已點亮目前所有可連接節點。</p>'}</div></details>`;
}
function uiAllocateTalent(id){const before=G.pass.length;allocPass(id);if(G.pass.length>before){document.querySelector(`[data-tree="${id}"]`)?.focus();uxAnnounce(`已點亮${TREE[id].name}。`);uxAnimatePanel();}}

function warehouseMove(delta){WAREHOUSE_UI.page=Math.max(0,WAREHOUSE_UI.page+delta);renderModal();const id=delta>0?'warehouse-next':'warehouse-prev',next=document.querySelector(`[data-focus="${id}"]`);(next&&!next.disabled?next:document.querySelector(`[data-focus="${delta>0?'warehouse-prev':'warehouse-next'}"]`))?.focus();}
