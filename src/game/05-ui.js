/* ---------- UI: side panel, modal, overlay ---------- */
// 全介面共用 Signal 24 圖集，座標及順序只讀取產生器的索引。
function uiSprite(sheet,id,size=24,extra='',tag='span'){
  const S=ART_SHEETS[sheet],index=S?.ids.indexOf(id);if(index==null||index<0)return '';
  const x=index%S.cols*size,y=Math.floor(index/S.cols)*size;
  return `<${tag} class="spr${tag==='i'?' gem':''}" aria-hidden="true" data-icon="${sheet}:${id}" style="width:${size}px;height:${size}px;background:var(--pixel-${sheet},var(--a-${sheet})) -${x}px -${y}px/${S.cols*size}px ${S.rows*size}px no-repeat;${extra}"></${tag}>`;
}
const ICON_IDX=ART_SHEETS.icons.ids,SK_IDX=ART_SHEETS.skills.ids;
function spr(name,size=30){return uiSprite('icons',name,size);}
function sico(id,size=30){const url=typeof icon3dCircuitUrl==='function'?icon3dCircuitUrl('skill',id):'';return url?`<img class="spr" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated">`:uiSprite('skills',id,size);}
const SHEETS={relic:['relics'],legend:['legends'],badge:['badges']};
function xico(kind,id,size=24){if((kind==='relic'||kind==='badge')&&typeof icon3dCollectibleUrl==='function'){const url=icon3dCollectibleUrl(kind,id);if(url)return `<img class="spr eq3d" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">`;}if(kind==='legend'&&typeof EQUIPMENT_ICONS!=='undefined'&&SIGNATURE_GEAR[id]&&EQUIPMENT_ICONS[SIGNATURE_GEAR[id].model])return `<img class="spr eq3d" src="${EQUIPMENT_ICONS[SIGNATURE_GEAR[id].model]}" width="${size}" height="${size}" alt="" style="vertical-align:middle;margin-right:4px;object-fit:contain;image-rendering:pixelated">`;if(kind==='legend'&&typeof icon3dLegendUrl==='function'){const url=icon3dLegendUrl(id);if(url)return `<img class="spr eq3d" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">`;}return SHEETS[kind]?uiSprite(SHEETS[kind][0],id,size,'vertical-align:middle;margin-right:4px'):'';}
function eqico(slot,r,size=32,it){
  if(typeof icon3dUrl==='function'){const url=icon3dUrl(slot,it&&typeof aTier==='function'?aTier(it):0,r|0);if(url)return `<img class="spr eq3d" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">`;}
  return uiSprite('equips',slot+'-'+Math.max(0,Math.min(r|0,3)),size,'vertical-align:middle;margin-right:4px');}
const SLOT_ICON = { head:'role', armor:'shield', gloves:'craft', ring:'coin', boots:'adventure', weapon:'sword', offhand:'shield' }, SKILL_ICON = { FIRE:'fire', FROST:'ice', CHAIN:'bolt', METEOR:'meteor', PULSE:'headphones', MAGNET:'coin', SPAM:'star', FLICKER:'sword', BEAM:'heart' };
function slotHtml(slot){
  const it = G.equip[slot];
  if (!it) return `<div class="rc"><div class="rh">${SLOTN[slot]}</div><div class="nm">${spr(SLOT_ICON[slot], 32)}<div class="mute">空</div></div></div>`;
  const lines = itemLines(it).slice(0, 3).map(l => `<li class="${l.imp ? 'imp' : l.lg ? 'lgd' : ''}">${l.t}</li>`).join('');
  return `<div class="rc item" style="--rc:${RAR[it.r].c}"><div class="rh"><span>${SLOTN[slot]}</span><span class="mute">ilvl ${it.il}</span></div><div class="nm">${it.lg && xico('legend', it.lg, 64) ? xico('legend', it.lg, 64) : eqico(slot, it.r, 64, it)}<div><b style="color:${RAR[it.r].c}">${it.name}</b><div class="mute">${RAR[it.r].n}</div></div></div><ul>${lines}</ul></div>`;
}
function panelHtml(){
  const s = G.st, h = G.h, R = G.run;
  const sk = G.slots.map((id, i) => id ? `<li><b>${SKILLS[id].n}</b> <span class="mute">${(G.supp[id] || []).filter(Boolean).map(g => SUPPS[g].n).join('、') || '無輔助'}</span></li>` : `<li class="mute">槽 ${i+1}：${G.lvl >= SLOT_LV[i] ? '空' : '等級 ' + SLOT_LV[i] + ' 解鎖'}</li>`).join('');
  const prog = R ? `${R.tower ? `無限之塔 第 ${R.floor} 層` : '地圖進度'} ${Math.min(R.kills, R.need)} / ${R.need}${R.tower ? '' : `（${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}）`}` : `討伐 ${Math.min(G.kills, G.need)} / ${G.need}${G.push ? '（滿了出關主）' : '（刷怪模式）'}`;
  const stats = `<li>生命 ${tFmt(Math.max(0, h.hp))} / ${tFmt(s.life)}</li><li>預估 DPS ${tFmt(s.dps)}</li><li>會心 ${s.crit.toFixed(0)}%　減傷 ${(s.red*100).toFixed(0)}%</li><li>${prog}</li>`;
  return `${slotHtml('weapon')}${slotHtml('armor')}${slotHtml('ring')}
    <div class="rc"><div class="rh">技能</div><ul>${sk}</ul></div>
    <div class="rc"><div class="rh">狀態</div><ul>${stats}</ul></div>${charHtml()}${cardsHtml()}
    <div class="rc wide"><div class="rh">事件</div><ol class="log">${G.log.map(l => `<li style="color:${l.col}">${l.txt}</li>`).join('')}</ol></div>`;
}
function codexHtml(){
  const lg = Object.values(LEGEND_BY), nl = lg.filter(L => G.legSeen[L.id]).length, md = Object.keys(MODES), nm = md.filter(id => G.seen[id]).length, sk = Object.keys(SKILLS), ns = sk.filter(id => G.lvl >= SKILLS[id].lvl).length;
  const slotOf = id => Object.keys(LEGENDS).find(k => LEGENDS[k].some(L => L.id === id));
  return `<div class="rc wide"><div class="rh">圖鑑</div><div class="mute">關主暗金保底：連續 ${G.pity || 0} 件沒出，下一件暗金機率 ${Math.round(Math.min(1, .1 + .06*(G.pity || 0))*100)}%</div>
    <div class="mct" style="margin:8px 0 3px">元素反應</div><ul class="ach"><li class="got">${obj3d('orb:#ff7a3d',28)}<b>火焰</b> 命中的敵人燃燒 3 秒，持續受到傷害</li><li class="got">${obj3d('orb:#ffe04a',28)}<b>閃電</b> 命中的敵人被標記 4 秒</li><li class="got">${obj3d('orb:#ff9ad0',28)}<b>融化</b> 火焰打到凍結的敵人：傷害 +40%，解除凍結</li><li class="got">${obj3d('orb:#8fe8ff',28)}<b>超導</b> 閃電打到凍結的敵人：傷害 +30%</li><li class="got">${obj3d('orb:#c9d3ff',28)}<b>蒸氣</b> 冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒</li><li class="got">${obj3d('orb:#ff5a8a',28)}<b>過載</b> 火焰或冰霜打到被閃電標記的敵人：傷害 +25%</li></ul>
    <div class="mct" style="margin:8px 0 3px">遺物 ${Object.keys(G.relics).length} / ${Object.keys(RELICS).length}</div><ul class="ach">${Object.entries(RELICS).map(([id, r]) => `<li class="${G.relics[id] ? 'got' : 'mute'}">${xico('relic', id, 22)}<b>${G.relics[id] ? r.n : '？？？'}</b> ${G.relics[id] ? r.d : ''}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">傳奇裝備 ${nl} / ${lg.length}</div><ul class="ach">${lg.map(L => `<li class="${G.legSeen[L.id] ? 'got' : 'mute'}">${xico('legend', L.id, 24)}<b>${G.legSeen[L.id] ? L.name : '？？？'}</b> ${G.legSeen[L.id] ? L.d : `（暗金${SLOTN[slotOf(L.id)]}）`}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">模式卡匣 ${nm} / ${md.length}</div><ul class="ach">${md.map(id => { const M = MODES[id], has = G.seen[id]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? M.n : '？？？'}</b> ${has ? `（${SKILLS[M.sk].n}）${M.d}` : `（${SKILLS[M.sk].n}）${M.hint}${G.carts[id] ? '　已持有未鑑定' : ''}`}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">魔物</div><ul class="ach">${MONSTER_GUIDE.map(([id, n, d]) => { const k = (G.mk || {})[id] || 0; return `<li class="${k ? 'got' : 'mute'}"><b>${k ? n : '？？？'}</b> ${k ? `${d}（討伐 ${k}）` : '還沒遇到'}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">輔助配件</div><ul class="ach">${Object.keys(SUPPS).map(g => { const has = (G.gems[g] || 0) > 0 || (G.seenG || {})[g]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? SUPPS[g].n : '？？？'}</b> ${has ? SUPPS[g].d : '還沒取得'}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">技能 ${ns} / ${sk.length}</div><ul class="ach">${sk.map(id => { const K = SKILLS[id], has = G.lvl >= K.lvl; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? K.n : '？？？'}</b> ${has ? K.d : `（Lv. ${K.lvl} 解鎖）`}</li>`; }).join('')}</ul></div>`;
}
function logHtml(){
  try { localStorage.setItem('ih_log_seen', CHANGELOG[0].v); } catch (e) {}
  return `<div class="rpgm"><div class="rc wide"><div class="rh">更新日誌</div>${CHANGELOG.map(c => `<div class="lg"><b>v${c.v}</b> <span class="mute">${c.d}</span><ul>${c.t.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
}
const logNew = () => { try { return localStorage.getItem('ih_log_seen') !== CHANGELOG[0].v; } catch (e) { return false; } };
let modalTab = 'skills', resetArm = false;
const $ = id => document.getElementById(id);
const invN = () => Object.values(G.gems).reduce((a, b) => a + b, 0) + Object.values(G.carts).reduce((a, b) => a + b, 0);
const dotOn = k => k === 'skills' ? invN() > (G.seenInv || 0) : k === 'craft' ? (G.parts || 0) >= 6 && G.parts > (G.seenParts || 0) : k === 'col' ? Object.keys(G.goals).length > (G.seenGoals || 0) : false;
function markSeen(t){ if (t === 'skills'){ if (!G.newSnap || modalTabPrev !== 'skills') G.newSnap = { g:{ ...(G.seenG || G.gems) }, c:{ ...(G.seenC || G.carts) } }; G.seenG = { ...G.gems }; G.seenC = { ...G.carts }; G.seenInv = invN(); } else if (t === 'craft') G.seenParts = G.parts || 0; else if (['goals', 'ach', 'dex'].includes(t)) G.seenGoals = Object.keys(G.goals).length; }
let modalTabPrev = '';
function openModal(tab){ if(typeof WIRE_MOVE!=='undefined'&&tab&&tab!=='skills'){WIRE_MOVE=null;if(drag)wireUp({type:'pointercancel'});}modalTabPrev = modalTab; modalTab = tab || modalTab; markSeen(modalTab); resetArm = false; $('modal').hidden = false; renderModal(true); }
const MOB = () => document.body.classList.contains('m');   // 手機直式：上面戰鬥畫面，下面固定的分頁面板（彈窗變成面板）
const DESK = () => document.body.classList.contains('d');   // 桌機寬螢幕：左邊角色與紀錄、中間戰鬥、右邊常駐分頁面板
function closeModal(){ if(MOB()||DESK()){renderModal(true);return;} $('modal').hidden=true; }
function renderModal(resetScroll = false){ const uxPanel = uxCapturePanel(); setTimeout(() => { if (typeof dressMount === 'function' && ['char','dress'].includes(modalTab)) dressMount();if(modalTab==='tree'&&typeof uiTreeMount==='function')uiTreeMount(); }, 0);
  if ($('modal').hidden) return;
  $('mtabs').innerHTML=uiNavHtml(); uiTitle();
  const settings=modalTab==='settings';if(settings)uiSyncSettings(); $('uisettings').hidden=!settings; $('mmenu').hidden=false; $('mbody').hidden=settings;
  if(!settings) $('mbody').innerHTML = modalTab === 'warehouse' ? warehouseHtml() : modalTab === 'char' ? uiCharacterHtml() : modalTab === 'skills' ? skillsHtml() : modalTab === 'tree' ? treeHtml() : modalTab === 'maps' ? mapsHtml() : modalTab === 'goals' ? goalsHtml() : modalTab === 'ach' ? `<div class="rpgm">${achHtml()}</div>` : modalTab === 'craft' ? craftHtml() : modalTab === 'dress' ? dressHtml() : modalTab === 'rank' ? rankHtml() : modalTab === 'dex' ? `<div class="rpgm">${codexHtml()}</div>` : modalTab === 'log' ? logHtml() : modalTab === 'feedback' ? feedbackHtml() : modalTab === 'save' ? saveHtml() : uiMenuHtml();
  uxRestorePanel(uxPanel,resetScroll);if(resetScroll)uxAnimatePanel();
  UI_LIVE_SIGNATURE=uiLiveSignature();uiCityRevealCheckpoint();
}
let held = null, heldRot = 0, selPiece = null, selSock = -1;   // 接線板：held 是手上準備放下的配件；selPiece 是選取的機件 id；selSock 是選取的插槽
const GEM_COL=Object.fromEntries(Object.entries(GridLab.GEM_COLOR).map(([id,c])=>[id,{r:'#ed967d',b:'#8db7ef',g:'#80cebd'}[c]]));
const GEM_IDX=ART_SHEETS.gems.ids;
const gemIco=(id,size=22)=>{const url=typeof icon3dCircuitUrl==='function'?icon3dCircuitUrl('support',id):'';return url?`<img class="spr gem" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated">`:uiSprite('gems',id,size,'','i');};
function buildBar(){
  return `<section class="ui-build" aria-label="構築配置"><div><b>構築</b>${[0,1,2].map(i=>`<button class="mb" aria-label="構築 ${i+1}" aria-pressed="${(G.bi||0)===i}" onclick="switchBuild(${i})">${i+1}</button>`).join('')}</div><button class="mb" data-focus="build-save" title="${G.builds[G.bi||0]?.equipment?'已記住此職業的七部位裝備':'此配置尚未記住裝備'}；切換構築時會自動保存目前配置" onclick="uiSaveBuild()">${G.builds[G.bi||0]?.equipment?'更新構築':'儲存構築'}</button>${uiBuildGearHtml()}${uiPolicyHtml()}</section>`;
}
function dpsBar(){
  const sk = G.st.sk || {}, ids = Object.keys(sk), tot = ids.reduce((a, id) => a+sk[id].direct*sk[id].estimatedCasts, 0) || 1;
  return `<div class="dpsbar" title="包含模式與共享出手時間，不含燃燒、條件連動、角色專屬及討伐收益；實測可到冒險的訓練場"><div>單體直傷預估 <b>${tFmt(G.st.dps)}</b> <span id="pzdelta" class="mute"></span></div><div class="shares">${ids.map(id => `<span style="flex:${Math.max(1, Math.round(sk[id].direct*sk[id].estimatedCasts/tot*100))}" title="${SKILLS[id].n}">${SKILLS[id].n}</span>`).join('')}</div>${uxPieceDetails()}</div>`;
}
let BUILD_PENDING=null;
function switchBuild(i){if(i===(G.bi||0))return;const result=restoreBuild(i);if(result.missing?.length&&!result.ok){BUILD_PENDING={index:i,target:JSON.stringify(G.builds[i])};showOverlay(`<h2 class="uxdialog-title">構築 ${i+1} 缺少裝備</h2><p>${result.missing.map(slot=>SLOTN[slot]).join('、')}已不存在，尚未切換。可保留缺件部位的目前裝備，載入其餘配置。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="BUILD_PENDING=null;hideOverlay()">保留目前構築</button><button class="mb pri" onclick="uiConfirmBuildFallback()">缺件沿用目前裝備</button></div>`);return;}uiFinishBuild(result,i);}
function uiFinishBuild(result,i){if(!result.ok){uxAnnounce(result.reason);return;}selPiece=null;held=null;renderModal();uxAnnounce(`已切換構築 ${i+1}${result.legacy?'，舊配置沿用目前裝備':'，已載入手動保存的裝備'}。`);}
function uiConfirmBuildFallback(){const p=BUILD_PENDING;BUILD_PENDING=null;hideOverlay();if(!p||JSON.stringify(G.builds[p.index])!==p.target){uxAnnounce('配置已變動，請重新確認。');return;}uiFinishBuild(restoreBuild(p.index,true),p.index);}
function uiSaveBuild(){if(!saveBuild()){uxAnnounce('城市或訓練進行中，或倉庫已滿，尚未更新構築。');return;}renderModal();uxAnnounce('已保存技能、天賦、策略及七部位裝備；引用裝備受回收保護。');}
function skillsHtml(){return deviceSkillsHtml();}

function treeHtml(){
  return uiTalentWorkspaceHtml();
}
function nextStep(){
  if(G.run?.city?.awaitChoice)return {t:'城市路段完成，選擇下一段或帶回碎片',tab:'maps'};
  const q = QUESTS[G.quest || 0];
  if (q) return { t:`${q.n}（${q.t}）`, tab:'goals' };
  if (passPoints() > 0 && tabOpen('tree')) return { t:`有 ${passPoints()} 點天賦可以分配`, tab:'tree' };
  if ((G.parts || 0) >= 6 && tabOpen('craft')) return { t:`有 ${G.parts} 個零件可以改機`, tab:'craft' };
  if (!G.run && !G.train && G.maxDepth >= 8 && !(G.towerBest > 0)) return { t:'試試無限之塔', tab:'maps' };
  return null;
}
function questHtml(){
  const q = QUESTS[G.quest || 0];
  if (!q) return '';
  const v = Math.min(q.goal, GOAL_STAT[q.k]());
  return `<div class="mct">新手任務　${G.quest || 0}/${QUESTS.length}</div><div class="gls"><div class="gl"><b>${obj3d('goals',30)}${q.n}</b><span class="mute">${q.t}　獎勵：${goalRewardText(q.rw)}${q.un ? '　（完成後開放：' + (q.un === 'craft' ? '改機' : '天賦盤') + '）' : ''}</span><i style="--p:${Math.round(v/q.goal*100)}%"></i><em>${v} / ${q.goal}</em></div></div>`;
}
function goalsHtml(){
  const done = GOALS.filter(a => G.goals[a.id]).length;
  return questHtml() + `<div class="mct">目標　${done}/${GOALS.length}${qm('goals')}</div><div class="gls">` + GOALS.map(a => { const v = Math.min(a.goal, GOAL_STAT[a.k]()), ok = G.goals[a.id];
    return `<div class="gl${ok ? ' ok' : ''}"><b>${obj3d(ok?'ach':'goals',30)}${a.n}</b><span class="mute">${a.goal} ${GOAL_UNIT[a.k]}　獎勵：${goalRewardText(a.rw)}</span><i style="--p:${Math.round(v/a.goal*100)}%"></i><em>${ok ? '完成' : v + ' / ' + a.goal}</em></div>`; }).join('') + '</div>';
}
function mapsHtml(){ return uiAdventureHtml(); }

function lootToast(it){
  let box = $('loot'); const host = document.querySelector('.stage') || document.body; if (!box){ box = document.createElement('div'); box.id = 'loot'; } if (box.parentNode !== host) host.appendChild(box);
  const R = RAR[it.r], ls = itemLines(it).filter(l => l.lg).slice(0, 1).concat(itemLines(it).filter(l => !l.lg).slice(0, 1)).slice(0, it.lg ? 2 : 1), d = document.createElement('div');
  d.className = 'lt r' + it.r; d.style.setProperty('--rc', R.c); d.style.setProperty('--rg', R.g);
  d.innerHTML = `<div class="lh">${it.lg && xico('legend', it.lg, 56) ? xico('legend', it.lg, 56) : eqico(it.slot || it.sl, it.r, 56, it)}<b>${it.name}</b></div>`;
  box.prepend(d); while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => d.classList.add('out'), it.r >= 3 ? 3200 : 1800); setTimeout(() => d.remove(), it.r >= 3 ? 3800 : 2400);
}
function setDmgNum(v){ G.dmgNum = v; G.dirty = true; renderModal(); }
function saveHtml(){
  const dn = G.dmgNum == null ? 1 : G.dmgNum;
  return `<div class="mrow" style="margin-bottom:8px"><button class="mb pri" onclick="wikiOpen()">編年史（查看所有遊戲資訊）</button></div><div class="mct">傷害數字</div><div class="mrow">${[[2, '全部'], [1, '精簡'], [0, '關閉']].map(([v, n]) => `<button class="mb" aria-pressed="${dn === v}" style="${dn === v ? 'background:#1f3fb0;color:#fff' : ''}" onclick="setDmgNum(${v})">${n}</button>`).join('')}</div>` + `<div class="hint">每5秒在此瀏覽器保存角色列表；只有目前角色結算離線收益（最多6小時）。匯出碼只包含目前角色，其他角色請各自匯出。刪除只影響目前角色。</div>
    <div class="mrow"><button class="mb" onclick="doSave()">立即存檔</button><button class="mb" onclick="doExport()">匯出存檔碼</button><button class="mb" onclick="doImport()">匯入存檔碼</button><button class="mb" id="rbtn" onclick="doReset()">${resetArm ? '確認刪除目前角色' : '刪除目前角色'}</button></div>
    <textarea id="sv" class="sv" placeholder="匯出的存檔碼會顯示在這裡；要匯入時把存檔碼貼在這裡再按「匯入」"></textarea><div id="smsg" class="hint"></div>`;
}
/* modal actions */
function cartsHtml(){const sp=G.board.pieces.find(p=>p.id===selPiece&&p.kind==='active'),ids=Object.keys(MODES).filter(id=>(G.carts[id]||0)>0);let h=sp?`<p class="uxmeta">${SKILLS[sp.key].n} · ${sp.mode?MODES[sp.mode].n:'標準模式'} ${sp.mode?'<button class="mb" onclick="equipCart(\'\')">卸下</button>':''}</p>`:'<p class="uxmeta">先選盤面技能才可裝卡匣；點格子可查看提示，裝上才鑑定。</p>';
 if(!ids.length)return h+'<p>還沒有卡匣。冒險或電路合成都能取得。</p>';
 return h+'<div class="ui-cart-grid">'+ids.map(id=>{const M=MODES[id],f=cartFree(id),n=G.carts[id],seen=G.seen[id],ok=sp&&sp.key===M.sk&&f>0,name=seen?M.n:'未鑑定・'+SKILLS[M.sk].n;return `<button class="gt" data-focus="cart-${id}" data-availability="${ok?'available':'unavailable'}" aria-label="${uxEsc(name)}，可用 ${f}／${n}，${uxEsc(seen?M.d:M.hint)}" onclick="uiCartPick('${id}')">${G.newSnap&&n>(G.newSnap.c?.[id]||0)?'<i class="nw">NEW</i>':''}${sico(M.sk,26)}<b>${uxEsc(name)}</b><small>可用 ${f}／${n}</small></button>`;}).join('')+'</div>';
}
function uiCartPick(id){const M=MODES[id],sp=G.board.pieces.find(p=>p.id===selPiece&&p.kind==='active');if(!M||!G.carts[id])return;if(sp?.key===M.sk&&cartFree(id)>0)return equipCart(id);const reason=!sp?'先選盤面上的主動技能':sp.key!==M.sk?'適用於'+SKILLS[M.sk].n+'，目前選了'+SKILLS[sp.key].n:'全部已裝上，先卸下其他同款卡匣';showOverlay(`<h2 class="uxdialog-title">${uxEsc(G.seen[id]?M.n:'未鑑定的'+SKILLS[M.sk].n+'卡匣')}</h2><p>${uxEsc(G.seen[id]?M.d:M.hint)}</p><p>${reason}</p><button class="mb" data-initial-focus onclick="hideOverlay()">返回卡匣</button>`);}
function equipCart(id){
  const p = G.board.pieces.find(q => q.id === selPiece && q.kind === 'active'); if (!p) return;
  if (!id){ delete p.mode; recalc(); renderModal(); return; }
  if (MODES[id].sk !== p.key || cartFree(id) <= 0) return;
  p.mode = id;
  if (!G.seen[id]){ G.seen[id] = 1; logLine(`鑑定完成：${MODES[id].n}，${MODES[id].d}`, '#1f9bbf'); checkGoals(); }
  recalc(); renderModal();
}
function allocPass(id){ if (G.run?.city||G.train||!canAllocateTalent(id)) return; G.pass.push(id); recalc(); logLine(`天賦：${talentName(id)}`, '#2f7fc4'); renderModal(); }
function respec(){if(G.run?.city||G.train)return; const cost = 100*G.lvl; if (!G.pass.length || G.gold < cost) return; G.gold -= cost; G.pass = [];G.legacyMode=false; recalc(); renderModal(); }
function enterMap(id){
  if (G.run||G.train) return; const i = G.maps.findIndex(m => m.id === id); if (i < 0) return;
  const map = G.maps.splice(i, 1)[0]; G.run = { map, kills:0, need:80, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine(`進入地圖：${BIOMES[map.biome].n} Lv. ${map.lvl}`, '#2f7fc4'); closeModal();
}
function abandonMap(){if(G.run?.city){cityFinish(false);renderModal();return;} if (!G.run) return; G.run = null; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8; logLine('放棄了地圖', '#857d6e'); renderModal(); }
const smsg = t => { const e = $('smsg'); if (e) e.textContent = t; };
function doSave(){ smsg(saveGame() ? '已存檔。' : '這個環境不允許瀏覽器存檔，請改用「匯出存檔碼」。'); }
function doExport(){ const c = encodeSave(); $('sv').value = c; $('sv').select(); smsg('存檔碼已產生，請整段複製保存。'); }
function doImport(){const o=decodeSave($('sv').value);if(!o||o.v!==2){smsg('存檔碼無效。');return;}if(o.char!==G.char){careerImportOther(o);return;}if(!applySave(o)){smsg('存檔碼無效。');return;}const saved=saveGame();smsg(saved?'匯入完成。':'已載入，但本機保存失敗，請匯出備份。');renderModal();}
function doReset(){ if (!resetArm){ resetArm = true; renderModal(); return; } if(!profileDeleteCurrent()){uxAnnounce('未能清除目前角色，其他角色已保留');return;}G.__wipe=true;location.search='?intro=1'; }

/* 升級三選一 */
function toggleAuto(){ if(!GAME_FEATURES.cardChoices)return; G.autoCard = !G.autoCard; if (G.autoCard) openCards(); else if (G.picks > 0) openCards(); G.dirty = true; renderModal(); }
function openCards(){ if(!GAME_FEATURES.cardChoices)return;
  if (G.picks <= 0 || G.offline) return;
  G.deferChoices = false;
  if (G.autoCard){ while (G.picks > 0){ const o = rollCards(3); if (!o.length) break; takeCard(tPick(o)); } hideOverlay(); return; }   /* 自動隨機：直接抽一張 */ if (!G.offer || !G.offer.length) G.offer = rollCards();
  const h = G.offer.map(id => { const c = CARDS[id], v = !!c.sk; return `<button class="card${v ? ' var' : ''}" onclick="pickCard('${id}')"><span class="ct">${v ? '技能變體 · ' + SKILLS[c.sk].n : '改裝'}</span><b>${c.n}</b><span class="cd">${c.d}</span>${cardN(id) ? `<span class="mute">已有 ${cardN(id)} 張</span>` : ''}</button>`; }).join('');
  showOverlay(`<b>升級了！選一張改裝卡</b><div class="mute">還有 ${G.picks} 次選擇。遊戲不會暫停。</div><div class="cards">${h}</div><button class="mb" onclick="deferChoices()">稍後再選</button> <button class="mb" onclick="toggleAuto()">自動隨機選卡</button>`);
}
function deferChoices(){ G.deferChoices = true; G.dirty = true; hideOverlay(); }
function openPendingChoices(){ if(!GAME_FEATURES.cardChoices)return; hideOverlay(); if (G.relicPicks > 0) openRelics(); else if (G.picks > 0) openCards(); }
function openRelics(){ if(!GAME_FEATURES.cardChoices)return;
  if (G.relicPicks <= 0 || G.offline) return;
  G.deferChoices = false;
  if (G.autoCard){ while (G.relicPicks > 0){ const o = rollRelics(); if (!o.length){ G.relicPicks = 0; break; } takeRelic(tPick(o)); } hideOverlay(); return; }
  if (!G.offerR || !G.offerR.length) G.offerR = rollRelics(); if (!G.offerR.length){ G.relicPicks = 0; return; }
  showOverlay(`<b>擊敗關主！選一件遺物</b><div class="mute">永久生效。還有 ${G.relicPicks} 次選擇。</div><div class="cards">${G.offerR.map(id => `<button class="card var" onclick="pickRelic('${id}')"><span class="ct">遺物</span>${xico('relic', id, 40)}<b>${RELICS[id].n}</b><span class="cd">${RELICS[id].d}</span></button>`).join('')}</div><button class="mb" onclick="deferChoices()">稍後再選</button>`);
}
function pickRelic(id){ if(!GAME_FEATURES.cardChoices)return; SFX('card'); takeRelic(id); hideOverlay(); G.dirty = true; if (G.relicPicks > 0) openRelics(); }
function pickCard(id){ if(!GAME_FEATURES.cardChoices)return; SFX('card'); takeCard(id); hideOverlay(); G.dirty = true; if (G.picks > 0) openCards(); }
function charHtml(){const c=CHARS[G.char];return `<section class="rc char-card"><h3>${uxEsc(G.heroName||'未命名')}</h3><p>${c.n} · ${ascendInfo()?.n||'尚未昇華'}</p><p>${c.role}</p><button class="mb" onclick="careerProfiles()">角色列表</button></section>${characterStoryHtml()}`;}
function achHtml(){
  const n = achCount(), tot = Object.keys(ACHS).filter(id=>GAME_FEATURES.cardChoices||id!=='card10'||G.ach[id]).length;
  return `<div class="rc wide"><div class="rh">成就 ${n} / ${tot}</div><div class="mute">每個成就永久傷害 +1%，目前共 +${n}%</div><ul class="ach">${Object.entries(ACHS).filter(([id])=>GAME_FEATURES.cardChoices||id!=='card10'||G.ach[id]).map(([id, a]) => `<li class="${G.ach[id] ? 'got' : 'mute'}">${obj3d('medal:'+['#8fd0ff','#ffd24d','#ff9ad0','#5dffa3','#ff9a5a','#c9a8ff'][(id.length+id.charCodeAt(0))%6],36)||xico('badge', id, 26)}<b>${a.n}</b><span>${a.d}</span><small>${G.ach[id]?'已達成':'未達成'}</small></li>`).join('')}</ul></div>`;
}
function cardsHtml(){
  const e = Object.entries(G.cards);if(!GAME_FEATURES.cardChoices)return e.length?`<section class="ui-section"><h3>既有改裝效果</h3><ul>${e.map(([id,n])=>`<li>${uxEsc(CARDS[id].n)} ×${n} · ${uxEsc(CARDS[id].d)}</li>`).join('')}</ul></section>`:''; const pend = (G.picks > 0 ? `<button class="mb" onclick="openCards()">有 ${G.picks} 次改裝待選</button> ` : '') + (G.relicPicks > 0 ? `<button class="mb" onclick="openRelics()">有 ${G.relicPicks} 次遺物待選</button> ` : '') + `<button class="mb" onclick="toggleAuto()">自動隨機：${G.autoCard ? '開' : '關'}</button>`;
  return `<div class="rc"><div class="rh">改裝卡</div>${pend}<ul>${e.length ? e.map(([id, n]) => `<li><b>${CARDS[id].n}</b> ×${n} <span class="mute">${CARDS[id].d.split('，')[0]}</span></li>`).join('') : '<li class="mute">升級時可選擇</li>'}</ul></div>`;
}

/* offline progress */
const HELP = {
  skills:['接線板說明','電路板以可用格數、洞色與供電構成。先在終點手動裝技能，再從對應起點逐格拉線；完整接通才亮燈並施放。<br>紅、藍、綠配件只可裝在同色洞，每技能最多三枚。Ⅰ／Ⅱ／Ⅲ效果為1／1.35／1.65倍，耗電1／2／3。<br>電路板可在冒險中取得，尺寸由3×3至8×8，不會自動裝備或自動接線。'],
  craft:['改機說明', '用不到的裝備會自動拆成零件。零件可以重新校準數值、改裝詞綴、升級稀有度，或賭一把腐化。<br>鎖定一條詞綴可以保住它；已腐化的裝備不能再改。'],
  maps:['冒險說明', '挑戰詞綴只表示敵人強化或取捨詞綴的數量，不是難度評分。<br>地圖詞綴讓敵人更強，但戰利品更好；每張卡下方的標籤是風險與回報彙總。<br>無限之塔每層殺滿怪上樓，每 10 層是關主，死亡就結束。<br>訓練場用不還手的假人量 30 秒傷害。'],
  goals:['任務與目標', '新手任務一次一個，完成後解鎖新系統。目標達成會自動給獎勵，不用手動領取。']
};
const MTN = { char:'角色', skills:'戰鬥', craft:'打造', tree:'成長', maps:'冒險', menu:'更多', dress:'角色', goals:'收藏', ach:'收藏', dex:'收藏', log:'更多', save:'更多' };
const MHELP = { skills:'skills', craft:'craft', maps:'maps', goals:'goals' };
// 戰場大小：0 大、1 中、2 小、3 收起；自動模式下，編輯技能接線時收起，其他整理頁縮小
const uiBattleSize=()=>{if(G.userCz)return Math.max(1,G.cz==null?1:G.cz);if(['skills','tree','warehouse','craft','menu','settings','rank','char','dress'].includes(modalTab))return G.autoFold===false?2:3;if(['char','dress','craft','warehouse','settings'].includes(modalTab))return 2;return G.cz==null?1:G.cz;};
const CZN = ['大', '大', '小', '收'];
function mobTitle(){ uiTitle(); }
function cycleCz(){ const current = uiBattleSize(); G.cz = current >= 3 ? 1 : current + 1; G.userCz = true; G.dirty = true; mobTitle(); }
const mobRatio = () => { const i=uiBattleSize(),h=visualViewport?.height||innerHeight; return Math.min([340,260,168,40][i],h*[.5,.36,.25,.05][i])/Math.max(1,innerWidth); };
const RISKM = Object.keys(MODS).filter(k => ['challenge','mixed'].includes(MODS[k].kind));
function runMods(R){
  const mods = R.map.mods || []; if (!mods.length) return '';
  const q = mods.reduce((a, k) => a + MODS[k].q, 0);
  return `<ul>${mods.map(k => `<li style="color:${RISKM.includes(k) ? '#d03a3a' : '#1d8a4c'}">${MODS[k].n}</li>`).join('')}</ul><div class="agg"><span>挑戰詞綴 <b>${mapChallenge(mods)}</b></span><span>戰利品 <b>+${Math.round(q*100)}%</b></span><span>金幣 <b>${mods.includes('rich') ? '+60%' : '+0%'}</b></span><span>稀有度 <b>${mods.includes('lucky') ? '提升' : '一般'}</b></span></div>`;
}
function setFilter(i){ G.filter = i; G.dirty = true; renderModal(); }
function rulesBar(){
  return `<div class="mc" style="margin:0 0 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>拾取規則</b>${['全部撿', '魔法以上', '稀有以上'].map((n, i) => `<button class="mb" style="${G.filter === i ? 'background:#1f3fb0;color:#fff;' : ''}" onclick="setFilter(${i})">${n}</button>`).join('')}${qm('craft')}</div>`;
}
function lockTip(k){ const L = TAB_LVL[k]; showOverlay(`<div class="mct">尚未開放.txt</div><div style="font-size:13px;line-height:1.7">升到 ${L} 級開放${k === 'craft' ? '改機（拆裝備得零件，重洗與改裝詞綴）' : '天賦盤（升級得到的點數在這裡分配）'}。</div><button class="mb" onclick="hideOverlay()">知道了</button>`); }
function showHelp(k){ const H = HELP[k]; if (H) showOverlay(`<div class="mct">${H[0]}.txt</div><div style="font-size:13px;line-height:1.7">${H[1]}</div><button class="mb" onclick="hideOverlay()">知道了</button>`); }
const qm = k => `<button aria-label="${HELP[k] ? HELP[k][0] : '說明'}" class="qm" onclick="showHelp('${k}')">?</button>`;
let OVERLAY_CLOSE=null;
function windowCloseOverlay(){const close=OVERLAY_CLOSE||hideOverlay;OVERLAY_CLOSE=null;close();}
function showOverlay(html,options={}){
 const o=$('ovl');o.innerHTML=`<div class="mbox small">${html}</div>`;OVERLAY_CLOSE=options.close||hideOverlay;
 const box=o.firstElementChild;if(options.surface)box.classList.add(options.surface);const heading=box.querySelector('h2,.mct'),label=options.title||heading?.textContent||box.querySelector('b')?.textContent||'遊戲提示';
 const bar=document.createElement('div');bar.className='window-titlebar';const title=document.createElement('span');title.className='window-title';title.setAttribute('role','heading');title.setAttribute('aria-level','2');title.textContent=label;bar.append(title);
 if(heading)heading.remove();const close=document.createElement('button');close.type='button';close.className='mb window-close';close.setAttribute('aria-label',options.closeLabel||'關閉視窗');close.title=options.closeLabel||'關閉視窗';close.textContent='×';close.addEventListener('click',windowCloseOverlay);bar.append(close);box.prepend(bar);
 for(const button of [...box.querySelectorAll('button')])if(button.getAttribute('onclick')==='hideOverlay()'&&/^(返回|知道了|關閉)/.test(button.textContent.trim())){if(button.hasAttribute('data-initial-focus'))close.setAttribute('data-initial-focus','');button.remove();}
 const cancel=box.querySelector('[data-initial-focus]:not(:disabled)');if(!options.close&&cancel&&/^(取消|保留|繼續)/.test(cancel.textContent.trim()))OVERLAY_CLOSE=()=>cancel.click();
 uxOpenDialog(o,label,windowCloseOverlay);
}
function hideOverlay(){ OVERLAY_CLOSE=null;if(typeof CAREER_UI!=='undefined')CAREER_UI.pending=null;UI_CHARACTER_PICK=null;UI_MAP_PENDING=null;craftPending=null;UI_RESPEC=null;GEAR_PENDING=null;BUILD_PENDING=null;TALENT_CONFIRM=null;CITY_CONFIRM=null;FORGET_BUILD_PENDING=null;uxCloseDialog($('ovl')); }
function fmtDur(s){ s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? h + ' 小時 ' : '') + (m ? m + ' 分' : (h ? '' : s + ' 秒')); }
const offYield = fn => { if (typeof MessageChannel === 'function'){ const c = new MessageChannel(); c.port1.onmessage = () => { c.port1.close(); fn(); }; c.port2.postMessage(0); } else setTimeout(fn, 0); };
const OFF_WINDOW = 600;   // 離線只精確模擬前 10 分鐘，其餘用這段的收益率放大
function offlineBulk(R, f, w){
  // 放大段遞減：前 2 小時 ×0.5、之後 2 小時 ×0.3、其餘 ×0.15，離線越久越不划算，上班族不會因為關機一晚爆賺
  const eff = Math.min(R, 7200)*.5 + Math.max(0, Math.min(R - 7200, 7200))*.3 + Math.max(0, R - 14400)*.15;
  f *= eff/Math.max(1, R);
  const K = Math.round(w.kills*f), d = lvlNow(), q = runQ();
  G.totalKills += K; G.gold += Math.round(w.gold*f); G.chips += Math.round(w.chips*f); G.deaths += Math.round(w.deaths*f);
  if (w.xp > 0) gainXp(w.xp*f);
  const hit = p => { let n = 0; for (let i = 0; i < K; i++) if (Math.random() < p) n++; return n; };
  const nItems = Math.min(800, hit(HORDE.drop*(1 + q)*(offPen() ? .25 : 1)));
  // Bulk kills use the conservative normal-monster rate; never multiply an observed rare item.
  for(let i=hit(SIGNATURE_DROP.normal);i>0;i--){const gear=tPick(Object.values(SIGNATURE_GEAR));pickup({kind:'item',it:makeItem(gear.slot,3,d,gear.id)});}
  for (let i = 0; i < nItems; i++) pickup({ kind:'item', it:makeItem(tPick(Object.keys(SLOTN)), rarityRoll(false), d) });
  for (let i = hit(.012); i > 0; i--) pickup({ kind:'cart', id:tPick(Object.keys(MODES)) });
  for (let i = hit(.025); i > 0; i--) pickup({ kind:'gem', id:tPick(Object.keys(SUPPS)) });
  for (let i = Math.min(15, hit(.03)); i > 0; i--) pickup({ kind:'map', map:makeMap(d) });
  // Bulk settlement uses normal-board odds and is bounded by the finite collection.
  for(const id of circuitPool().filter(id=>!G.circuits.includes(id)))if(Math.random()<1-Math.pow(1-.02/Math.max(1,circuitPool().length),K))collectCircuit(id);
  const boss = Math.min(Math.floor(w.boss*f), Math.floor(R/3600)); if (boss > 0){ G.bossKills = (G.bossKills || 0) + boss; if (G.push && !G.run){ G.depth += boss; G.maxDepth = Math.max(G.maxDepth, G.depth); } }
}
function catchUp(sec, report){
  if (G.paused) return; const away = sec; sec = Math.min(sec, offCapSec());
  const b = { lvl:G.lvl, depth:G.depth, gold:G.gold, kills:G.totalKills, deaths:G.deaths, inventory:G.inventory.length,chips:G.chips, gems:{...G.gems}, carts:{...G.carts} };
  G.off = { lvls:0, eq:0, maps:0, gems:0, carts:0, cores:0, xp:0, cards:[] }; G.offline = true; G.offPen = sec > 60; G.paused = true; G.floats = []; G.fx = [];
  const simSec = Math.min(sec, OFF_WINDOW), w0 = { gold:G.gold, kills:G.totalKills, chips:G.chips, deaths:G.deaths, boss:G.bossKills || 0 };
  let left = simSec; const total = simSec;
  if (report) showOverlay(typeof returnLoadingHtml==='function'?returnLoadingHtml():`<b>離線結算中…</b><div class="mute" id="oprog">0%</div>`);
  (function chunk(){
    const t0 = performance.now();
    while (left > 0 && performance.now() - t0 < 30){
      update(.2); left -= .2;
    }
    if (left > 0){ if (report && $('oprog')) {$('oprog').textContent = Math.round((1 - left/total)*100) + '%';const bar=$('oprogbar');if(bar)bar.value=Math.round((1-left/total)*100);} offYield(chunk); return; }
    for (const d of G.drops) if (!d.done){ d.done = true; pickup(d); } G.drops = []; G.proj = []; G.timers = []; G.mons = []; G.spawnCd = .5; G.h.swingT = -1; G.h.castT = -1; G.h.dead = 0;
    if (sec > simSec){
      const w = { gold:G.gold - w0.gold, kills:G.totalKills - w0.kills, chips:G.chips - w0.chips, deaths:G.deaths - w0.deaths, boss:(G.bossKills || 0) - w0.boss, xp:G.off.xp };
      offlineBulk(sec - simSec, (sec - simSec)/simSec, w);
    }
    resolveOfflineChoices(G.off);
    if (G.h.hp <= 0) G.h.hp = G.st.life;
    G.offline = false; G.paused = false; G.lastWall = Date.now(); const o = G.off; G.off = null; G.dirty = true; const saved = saveGame();
    if (report) showOverlay(uxOfflineReport(o,b,away,sec,saved));
  })();
}
function setupPanel(){
  const st = document.createElement('style');
  st.textContent = `.rpg{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:6px 0 14px;font-size:12px}
    .rc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;background:color-mix(in srgb,var(--paper) 88%,#fff);box-shadow:0 3px 0 #b9c6ee}  .nm{display:flex;align-items:center;gap:8px;margin:2px 0 4px} .nm b{font-size:13px} .ico{flex:none;overflow:visible} .rc.wide{grid-column:1/-1}
    .rh{display:flex;justify-content:space-between;gap:8px;font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:4px}
    .rc ul,.rc ol{margin:4px 0 0;padding-left:16px} .rc li{margin:1px 0} .rc li.imp{color:var(--muted)} .mute{color:var(--muted);font-size:11px}
    .log{max-height:130px;overflow:auto;list-style:none;padding-left:0 !important} .log li{margin:2px 0}
    .actions{gap:5px !important} .act{padding:3px 12px !important;font-size:12px}
    .modal{position:fixed;inset:0;background:rgba(43,37,82,.45);display:flex;align-items:center;justify-content:center;z-index:20;padding:12px} .modal[hidden]{display:none}
    .mbox{background:var(--paper);border:1.5px solid var(--ink);border-radius:14px;box-shadow:0 4px 0 #b9c6ee;width:min(720px,100%);max-height:90vh;overflow:auto;padding:14px;font-size:12.5px} .mbox.small{width:min(420px,100%)}
    .mtabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap} .tab{padding:3px 12px;font-size:12px} .tab.on{background:var(--ink);color:var(--paper)} .tab.x{margin-left:auto} .mb.pri{background:#e2583d !important;color:#fff !important;border-color:#8a2a18 !important;font-weight:700} .mct::before{content:'✦ ';color:#e2583d} .nw{position:absolute;top:-6px;right:-4px;background:#e2583d;color:#fff;font-style:normal;font-size:10px;padding:0 4px;z-index:2} .gt{position:relative} #modtxt{position:absolute;left:8px;top:8px;z-index:3;font-size:11px;line-height:1.5;opacity:.5;pointer-events:none;color:#2b2552;text-shadow:0 0 3px #fff,0 0 3px #fff} body.m #modtxt{top:64px} .pzbar{position:sticky;bottom:-8px;background:var(--paper);padding:4px 0;z-index:4} .agg{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-top:4px;font-size:12px}
    /* Y2K 低像素感：階梯狀切角、掃描線標題、方形圓點 */
    body{-webkit-font-smoothing:none;text-rendering:optimizeSpeed} #loot{position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:35;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;width:min(300px,86vw)}
    .lt{width:100%;background:var(--paper);border:2px solid var(--rc);box-shadow:3px 3px 0 var(--rc);padding:4px 10px;animation:ltin .35s cubic-bezier(.2,1.6,.4,1);transition:opacity .6s,transform .6s;font-size:12px}
    .lt.out{opacity:0;transform:translateY(-12px)} .lt .lh{display:flex;gap:8px;align-items:baseline} .lt .lh span{background:var(--rc);color:#fff;padding:0 6px;font-size:11px} .lt .lh b{font-size:15px;color:var(--rc);flex:1} .lt .lh i{font-style:normal;color:#8a8a99;font-size:11px} .lt .ll.lg{color:#c4501f}
    .lt.r2{background:linear-gradient(#fff8dc,var(--paper))} .lt.r3{background:linear-gradient(#ffe2cf,var(--paper));animation:ltin .35s cubic-bezier(.2,1.6,.4,1),ltglow 1s ease-in-out infinite alternate;padding:8px 12px;font-size:13px} .lt.r3 .lh b{font-size:19px}
    @keyframes ltin{from{transform:scale(.5) translateY(-20px);opacity:0}to{transform:none;opacity:1}} @keyframes ltglow{from{box-shadow:3px 3px 0 var(--rc),0 0 6px var(--rg)}to{box-shadow:3px 3px 0 var(--rc),0 0 22px var(--rg)}} .dpsbar{position:sticky;top:-8px;z-index:5;background:var(--paper);border:1.5px solid var(--ink);padding:4px 8px;margin:0 0 8px;font-size:13px} .dpsbar .shares{display:flex;gap:2px;margin-top:3px} .dpsbar .shares span{background:#ffb4d2;font-size:11px;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:clip;min-width:0} .rchips{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0} .chip{font-size:11px;padding:0 8px;border-radius:999px;border:1.5px solid} .chip.ok{color:#1d8a4c;border-color:#1d8a4c} .chip.bad{color:#d03a3a;border-color:#d03a3a} .qm{display:inline-block;width:16px;height:16px;line-height:14px;text-align:center;font-size:11px;border:1.5px solid var(--ink);border-radius:50%;background:var(--paper);cursor:pointer;margin-left:6px;vertical-align:middle;padding:0} .rd{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e2483d;margin-left:4px;vertical-align:middle} #pzdelta b.up{color:#1d8a4c} #pzdelta b.dn{color:#d03a3a} #nexthint{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:30;background:var(--paper);color:var(--ink);border:1.5px solid var(--ink);border-radius:999px;padding:3px 14px;font-size:12px;cursor:pointer;box-shadow:2px 2px 0 rgba(31,63,176,.35);max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #nexthint[hidden]{display:none} .subtabs{flex:1 0 100%;display:flex;gap:4px;padding-top:2px} .tab.sub{font-size:11px;padding:1px 10px;border-style:dashed}
    .mrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px} .mc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;box-shadow:0 2px 0 #b9c6ee} .mc.dim{opacity:.5} .mc.run{margin-bottom:10px;border-style:dashed}
    .mc ul{margin:4px 0 6px;padding-left:16px} .hint{color:var(--muted);font-size:11.5px;margin:4px 0 8px;line-height:1.5} .hint b{color:var(--ink)}
    .srow{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px} select,.sv{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:3px 6px;max-width:100%}
    .mc>select{display:block;margin:6px 0} .treebox{position:relative;width:100%;max-width:520px;margin:0 auto 6px} .treebox .treecv{display:block;width:100%;aspect-ratio:1;image-rendering:pixelated;image-rendering:crisp-edges;border:3px solid #fff;box-shadow:0 0 0 2px #7d8bbd;box-sizing:border-box;background:#dfe9ff} body #mbody .treebox svg.tree{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);margin:0!important;max-width:none;background:none!important;border:0!important;box-shadow:none!important;outline:none} body.ui-material #mbody .treebox svg.tree{background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important} body.ui-material #mbody .treebox svg.tree .tn :is(circle,polygon){fill:transparent!important;stroke:none!important;animation:none!important} body.ui-material #mbody .treebox svg.tree>line{display:none} .treebox .tn.open .tnb{animation:tnblink 1s steps(2) infinite} .treebox .tn:focus-visible .tnb,.treebox .tn:focus-visible circle{outline:none;stroke:#e2583d} @keyframes tnblink{50%{opacity:0}} @media(prefers-reduced-motion:reduce){.treebox .tn.open .tnb{animation:none}} .tree{width:100%;max-width:520px;display:block;margin:0 auto 6px;background:radial-gradient(circle,rgba(111,196,245,.22) 1.6px,transparent 2px) 0 0/16px 16px,linear-gradient(#ffffff,#e6f1ff);border:3px solid #fff;box-shadow:0 0 0 2px #aab8ee;border-radius:18px} .tn.open circle,.tn.open polygon{animation:tp 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center} @keyframes tp{50%{transform:scale(1.12)}}
    .ach{padding-left:0;list-style:none;margin:6px 0 0}.ach li{margin:3px 0}.ach .got{color:#a87400}
    .chars{display:flex;gap:6px;margin:4px 0}.chr{font:inherit;flex:1;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px;cursor:pointer;display:flex;flex-direction:column;font-size:13px}.chr.on{background:#d9e6ff;box-shadow:inset 0 0 0 2px #4a7fdc}.chr[disabled]{opacity:.5;cursor:default}.chr .mute{font-size:10px}
    .cards{display:flex;gap:8px;margin:10px 0}.mbox.small:has(.cards){width:min(470px,94vw)}
    .card{font:inherit;color:var(--ink);background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:8px 10px;flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px;text-align:left;cursor:pointer;box-shadow:3px 3px 0 var(--ink)}
    .card.var{background:#efe3ff;border-color:#8e3fd1}.card .ct{font-size:11px;opacity:.7}.card .cd{font-size:12px}.card:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
    .mb.on{background:var(--ink);color:var(--paper)} .mb{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:4px 14px;cursor:pointer} .mb[disabled]{opacity:.4;cursor:default}
    .sv{width:100%;height:90px;margin-top:8px;resize:vertical} .hbar{display:block;width:96px;height:8px;border:1.5px solid var(--ink);border-radius:5px;margin:4px 0 0 auto;background:#fffb;overflow:hidden;box-shadow:0 1px 0 #b9c6ee} .hbar i{display:block;height:100%;border-right:1.5px solid var(--ink)} .gl{margin:4px 0;padding-left:16px}`;

  /* Y2K 童話風介面：泡泡視窗（白到淡藍漸層、白色內框、粉彩外框）、糖果按鈕、緞帶標題、膠囊血條 */
  st.textContent += `
    :root{--bub:#b9c6ee;--bubd:#8f9fe0;--cream:#fffaf0}
    body{font-family:"Cubic 11","Arial Rounded MT Bold","Hiragino Maru Gothic ProN","jf-openhuninn","Microsoft JhengHei","PingFang TC","Noto Sans TC",system-ui,sans-serif}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#ffffff 0%,#edf5ff 100%) !important;border:3px solid #fff !important;border-radius:20px !important;
      box-shadow:0 0 0 2px var(--rc,var(--bub)),0 5px 0 2px var(--rc,var(--bubd)),0 10px 18px #7f90d840 !important;padding:10px 12px !important}
    .rc.item{--rc:#b9c6ee}
    .rh{background:var(--rc,var(--bub));color:#fff !important;border-radius:12px;padding:2px 10px;margin:-4px -2px 8px !important;font-weight:800;letter-spacing:.06em !important;text-shadow:0 1px 0 #00000030}
    .rh .mute{color:#ffffffd0 !important}
    .act,.chip,.mb,.tab,button:not(.sw){background:linear-gradient(180deg,#ffffff 0%,#d9e6ff 100%) !important;border:2px solid var(--bubd) !important;color:var(--ink) !important;font-weight:700;
      box-shadow:0 3px 0 var(--bubd),inset 0 1px 0 #fff !important;transition:transform .08s}
    .act:hover,.chip:hover,.mb:hover,.tab:hover{transform:translateY(-1px);background:linear-gradient(180deg,#fff 0%,#e3f0ff 100%) !important}
    .act:active,.chip:active,.mb:active{transform:translateY(2px);box-shadow:0 1px 0 var(--bubd) !important}
    .tab.on,.chip.current{background:linear-gradient(180deg,#8fb6ff,#5f8fe8) !important;color:#fff !important;text-shadow:0 1px 0 #00000030}
    .chips{background:linear-gradient(180deg,#fff,#edf5ff) !important;border:3px solid #fff !important;border-radius:18px !important;box-shadow:0 0 0 2px var(--bub),0 5px 0 2px var(--bubd) !important}
    .hbar{height:11px !important;width:104px !important;border:2px solid var(--bubd) !important;border-radius:999px !important;background:#fff !important;box-shadow:inset 0 2px 0 #00000012 !important}
    .hbar i{border-right:0 !important;border-radius:999px;background-image:linear-gradient(180deg,#ffffff70,#ffffff00 55%,#00000018) }
    .toast{border-radius:999px !important;border:2px solid var(--bubd) !important;box-shadow:0 3px 0 var(--bubd) !important}
    .modal{background:rgba(120,140,210,.45) !important;backdrop-filter:blur(3px)}
    select,.sv{border:2px solid var(--bubd) !important;border-radius:12px !important}
    header h1{font-size:15px !important;letter-spacing:.08em;color:#fff;text-shadow:0 2px 0 var(--bubd),0 0 8px #7f90d8}
    .actions .cap{color:#fff !important;text-shadow:0 1px 0 var(--bubd)}
    .stat .k{color:#5b6aa8 !important} .stat .v{text-shadow:0 2px 0 #fff,0 0 10px #fff}
  `;
  st.textContent += `
    body::before{content:'';position:fixed;left:0;right:0;top:0;height:45%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(255,255,255,.4) 3px,transparent 3.5px) 0 0/28px 28px;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)}
    header h1{display:block;margin:0;line-height:0} header h1 .wm{width:min(230px,42vw);height:auto;overflow:visible;filter:drop-shadow(0 2px 0 rgba(43,37,82,.25))}
    header h1 .lg{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:3px solid #fff;color:#fff;font:900 16px/1 'Arial Rounded MT Bold','Nunito',system-ui,sans-serif;text-shadow:0 1px 0 rgba(43,37,82,.35);box-shadow:0 2px 0 rgba(43,37,82,.25);letter-spacing:0}
    header h1 .lg:nth-child(4n+1){background:#ff8fc4}header h1 .lg:nth-child(4n+2){background:#ffd35a}header h1 .lg:nth-child(4n+3){background:#6fc4f5}header h1 .lg:nth-child(4n){background:#7fdcae}
    header h1 .gap{width:8px}
    .spr{display:inline-block;vertical-align:middle;flex:none;image-rendering:auto}
    .controls{display:none}`;
  /* 作業系統視窗風：藍色漸層標題列、視窗鈕、斜角邊框、凹陷內容區、黑底事件框、底部工作列（參考 Win98／XP 與 Y2K 個人網頁參考圖） */
  st.textContent += `
    :root{--win:#e6ecfa;--wlt:#ffffff;--wdk:#7d8bbd;--wbd:#2f3f8f}
    .rc,.mc,.mbox{background:var(--win) !important;border:1px solid var(--wbd) !important;border-radius:4px !important;
      box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855 !important;padding:8px 10px 10px !important}
    .rh{background:linear-gradient(90deg,var(--rc,#1f3fb0),#7fb0ff) !important;border-radius:2px !important;margin:-4px -6px 8px !important;padding:2px 6px 2px 8px !important;display:flex;align-items:center;font-size:11.5px}
    .rh::after{content:none;display:none;margin-left:8px;flex:none;font-size:9px;letter-spacing:2px;color:var(--wbd);background:var(--win);border:1px solid #fff;border-right-color:var(--wdk);border-bottom-color:var(--wdk);padding:0 4px;text-shadow:none;line-height:13px}
    .rh>:first-child{margin-right:auto}
    .rc ul,.rc ol{background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:2px;padding:6px 8px 6px 22px !important;margin-top:2px}
    .rc .nm+ul,.rc .nm~ul{margin-top:4px}
    .rc.wide ol.log{background:#14123a;border-color:#000 #5a6bb8 #5a6bb8 #000;padding:6px 10px !important;line-height:1.55}
    .rc.wide ol.log li{color:#f2f6ff !important} .rc.wide ol.log li::before{content:'♥ ';color:#ff8fb8}
    .mbox::before{content:'★ Idle Hero.exe  ' var(--ver);display:block;margin:-8px -10px 10px;padding:3px 10px;color:#fff;font-weight:800;font-size:12px;letter-spacing:.06em;white-space:pre;overflow:hidden;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);text-shadow:0 1px 0 #00000040;position:sticky;top:-8px;z-index:2}
    .stats{background:var(--win);border:1px solid var(--wbd);border-radius:4px;box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855;padding:22px 12px 8px !important;gap:6px !important}
    .stats::before{content:'STATUS';position:absolute;left:0;right:0;top:0;padding:1px 8px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.08em;color:#fff;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);border-radius:3px 3px 0 0}
    .stat .k{color:#3a4a90 !important} .stat .v{text-shadow:none !important}
    .tfoot{position:fixed;left:0;right:0;bottom:0;height:30px;z-index:15;display:flex;align-items:center;gap:8px;padding:0 8px;background:linear-gradient(180deg,#6fa0f5,#2f5fd0);border-top:2px solid #9fc4ff;color:#fff;font:700 12px/1 system-ui,sans-serif;box-shadow:0 -2px 8px #2f3f8f40}
    .tfoot .start{background:linear-gradient(180deg,#5fd07a,#2f9f4a);border:1px solid #1f7a35;border-radius:0 10px 10px 0;padding:5px 12px 5px 8px;font-style:italic;text-shadow:0 1px 0 #00000050}
    .tfoot .task{background:#ffffff30;border:1px solid #ffffff60;border-radius:3px;padding:4px 10px;font-weight:600}
    .tfoot .clk{margin-left:auto;background:#1f3fb040;border-left:1px solid #ffffff50;padding:6px 10px}
    .stat .v{font-size:24px !important} .stat.small .v{font-size:17px !important} .stats{min-width:120px}
    @media (max-width:560px){.stats{position:relative !important;display:grid !important;grid-template-columns:1.2fr 1.4fr .8fr .8fr;align-items:end;gap:4px 10px !important;text-align:center !important}.stats .stat{display:flex;flex-direction:column;align-items:center}.stats .hbar{margin:4px auto 0 !important;width:64px !important}
      body .rpg{grid-template-columns:repeat(2,minmax(0,1fr)) !important}body .rpg .rc.wide{grid-column:1/-1}.stats .stat{width:100%}.rc{font-size:11.5px}}
    header,.stage,#fig,.rpg{max-width:1040px !important} .rpg{grid-template-columns:repeat(auto-fit,minmax(190px,1fr)) !important}
    .actions .cap{display:none !important}
    .mct{font-weight:800;font-size:12.5px;color:var(--wbd)}
    .mc.slot{cursor:pointer} .mc.slot.act{box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk),0 0 0 2px #ff8fb8,3px 4px 0 #5a6bb855 !important}
    .gls{display:grid;gap:6px;margin-top:6px} .gl{position:relative;display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:6px 8px 10px;background:#fff;border:1px solid var(--wdk);border-radius:4px;font-size:12px}
    .ui-obj3d{display:inline-block;vertical-align:middle;margin-right:6px;flex:none}.ach li.mute .ui-obj3d{filter:grayscale(1);opacity:.45}.gl b{display:flex;align-items:center}
    .gl span{grid-column:1/2;font-size:11px} .gl em{grid-row:1;grid-column:2;font-style:normal;font-size:11px;color:var(--muted)} .gl.ok{background:#fff6d6} .gl.ok em{color:#a07000;font-weight:700}
    .gl i{position:absolute;left:0;bottom:0;height:4px;width:var(--p);background:#ff8fb8;border-radius:0 2px 0 4px}
    .pz{display:grid;width:100%;gap:3px;margin:8px 0;max-width:420px;touch-action:pan-y}
    .pc{aspect-ratio:1;min-width:0;overflow:hidden;max-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:700;text-align:center;cursor:pointer;color:var(--ink);padding:2px;border-radius:3px;
      background:radial-gradient(circle at 50% 50%,#c7d0ee 0 1.5px,transparent 2px) 0 0/10px 10px,#f1f4ff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;box-shadow:inset 1px 1px 0 #9aa6d6;user-select:none;-webkit-user-select:none}
    .pc.lock{background:repeating-linear-gradient(45deg,#cfd6ef 0 4px,#dfe5f7 4px 8px);color:var(--muted);cursor:default;font-weight:400;box-shadow:none}
    .pc.fill{touch-action:none;background:linear-gradient(135deg,#ffffffaa 0,#ffffff00 45%),var(--pc);border:2px solid #fff;border-right-color:#0003;border-bottom-color:#0003;box-shadow:none}
    .pc.fill.jr{border-right:0;margin-right:-4px;padding-right:6px;border-top-right-radius:0;border-bottom-right-radius:0} .pc.fill.jb{border-bottom:0;margin-bottom:-4px;padding-bottom:6px;border-bottom-left-radius:0;border-bottom-right-radius:0}
    .pc.fill.jr + .pc.fill{border-left:0;border-top-left-radius:0;border-bottom-left-radius:0}
    .pc.sel{outline:3px solid #2f7fc4;outline-offset:-3px;z-index:1} .pc.lnk{outline:3px solid #3fd88a;outline-offset:-3px} .pc.sel.lnk{outline-color:#2f7fc4}
    .pc.pv.ok{background:#b8f5d0 !important;border:2px solid #3fd88a !important} .pc.pv.bad{background:#ffc4c4 !important;border:2px solid #e2483d !important}
    .pzbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap} .gt.on{box-shadow:0 0 0 2px #ff8fb8 !important}
    .shp{display:inline-grid;gap:1px;vertical-align:middle;margin:0 2px} .shp i{width:9px;height:9px;border:1px solid #fff;border-radius:1px} .shp i.e{border:0;background:none}
    .pzghost{position:fixed;z-index:99;pointer-events:none;transform:translate(-50%,-50%) scale(1.8);opacity:.85;filter:drop-shadow(2px 3px 0 #2f3f8f66)}
    .skb{touch-action:none} .gt .shp{touch-action:none;padding:8px 6px}
    .skb{width:auto !important;min-width:40px;gap:4px;padding:0 4px !important;display:flex !important;align-items:center}
    .skrow{display:flex;gap:6px;margin:8px 0 6px;flex-wrap:wrap}
    .skb{width:40px;height:40px;padding:0 !important;border-radius:4px !important;display:grid;place-items:center;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .skb.on{background:#fff !important;box-shadow:inset 1px 1px 0 var(--wdk),inset -1px -1px 0 #fff,0 0 0 2px #ff8fb8 !important} .skb[disabled]{opacity:.35;filter:grayscale(1)}
    .socks{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 6px}
    .sock{min-height:34px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--muted);background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:3px;padding:2px 4px !important}
    button.sock{box-shadow:none !important;background:#fff !important;border-radius:3px !important;font-weight:700;color:var(--ink) !important}
    .gem{display:inline-block;flex:none}
    .gems{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
    .gt{display:grid !important;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:0 8px;align-items:center;text-align:left;border-radius:4px !important;padding:6px 8px !important;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .gt .gem{grid-row:1/3} .gt em{font-style:normal;font-size:11px;background:#14123a;color:#fff;border-radius:3px;padding:0 5px} .gt small{grid-column:2/4;font-size:10.5px;color:var(--muted);font-weight:500;line-height:1.35}
    .gt[disabled]{opacity:.45}
    select{appearance:none;-webkit-appearance:none;background:#fff linear-gradient(var(--win),var(--win)) no-repeat right/22px 100% !important;border-radius:3px !important;border:1px solid var(--wdk) !important;padding:3px 26px 3px 6px !important}
    .dlg{position:absolute;left:50%;transform:translate(-50%,12px);width:min(520px,92%);z-index:4;background:#14123a;color:#f2f6ff;border:2px solid #fff;outline:2px solid var(--wbd);border-radius:6px;padding:8px 34px 12px 12px;font-size:13px;line-height:1.5;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;box-shadow:4px 5px 0 #2f3f8f55}
    .dlg.show{opacity:1;transform:translate(-50%,0)} .dlg b{display:block;color:#8fd0ff;font-size:11px;letter-spacing:.12em} .dlg::after{content:'♥';position:absolute;right:10px;bottom:6px;color:#ff8fb8;animation:dlgb 1s infinite}
    .dlg i{position:absolute;left:12px;right:34px;bottom:4px;height:3px;background:repeating-linear-gradient(90deg,#8fb6ff 0 8px,transparent 8px 11px);transform-origin:left;animation:dlgt 2.6s linear forwards}
    @keyframes dlgb{50%{transform:translateY(-2px)}} @keyframes dlgt{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    body.m{height:100vh;height:100dvh;overflow:hidden;padding:env(safe-area-inset-top) 0 calc(56px + env(safe-area-inset-bottom)) !important;gap:0;display:flex;flex-direction:column}   /* 手機：戰鬥區在上、面板在下，分頁列固定在最底 */
    body.m header,body.m #readout{display:none}
    body.m .stage{flex:none;position:relative;width:100%} body.m #fig{margin:0;display:block;width:100%}
    body.m .stats{position:absolute !important;top:4px;left:6px;right:6px;z-index:4;padding:3px 8px !important;margin:0 !important;background:rgba(242,247,255,.82);border:1.5px solid var(--ink);grid-template-columns:1.3fr 1.5fr .8fr .8fr .9fr} body.m .stats::before{display:none}
    body.m .stat .k{font-size:11px} body.m .stat .v{font-size:16px !important} body.m .stat.small .v{font-size:15px !important}
    body.m #nexthint{position:absolute;left:6px;bottom:6px;top:auto;transform:none;max-width:62%;z-index:4;font-size:12px;padding:4px 10px;min-height:28px}
    body.m #ctxbtn{position:absolute;right:8px;bottom:8px;width:56px;height:56px;z-index:4;font:inherit;font-size:13px;background:var(--paper);border:2px solid var(--ink);box-shadow:2px 2px 0 rgba(31,63,176,.4);cursor:pointer;clip-path:none;border-radius:50%}
    body.m #loot{top:64px}
    #ctxbtn{display:none} body.m #ctxbtn:not([hidden]){display:block}
    body.m #mttl{flex:none;height:32px;display:flex;align-items:center;gap:6px;padding:0 6px 0 10px;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);color:#fff;font-size:14px;font-weight:700;border-bottom:2px solid #0b1f6b}
    body.m #mttl span{flex:1} body.m #mttl button{width:28px;height:28px;padding:0;background:var(--paper);border:1.5px solid var(--ink);font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}
    body.m .rpg{display:none}
    body.m #modal{position:static;display:flex;flex:1 1 0;min-height:0;height:auto;width:100%;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.m .mbox{width:100%;max-height:none;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:0 !important}
    body.m .mbox::before{display:none}
    body.m .mtabs{display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin:0;position:fixed;left:0;right:0;bottom:0;z-index:40;height:calc(56px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:linear-gradient(90deg,#1f3fb0,#7fb0ff);box-shadow:0 -2px 0 #0b1f6b} body.m .tab .rd{position:absolute;top:4px;right:calc(50% - 20px);margin:0} body.m .tab{position:relative} body.m .tab.lock{opacity:.55} body.m .tab svg,body.m .tab canvas,body.m .tab .spr{width:24px !important;height:24px !important}
    body.m .tab{display:flex !important;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 0 3px !important;font-size:12px;min-height:44px;border-radius:0 !important;border:0 !important;border-right:1px solid #ffffff55 !important;box-shadow:none !important;background:transparent !important;color:#fff !important;text-shadow:0 1px 0 #00000040}
    body.m .tab.on{background:var(--win) !important;color:var(--wbd) !important;text-shadow:none;margin-top:-4px;padding-top:8px !important;border-radius:6px 6px 0 0 !important;box-shadow:0 -2px 0 #fff inset !important}
    body.m #mbody{flex:1;overflow:auto;padding:8px;-webkit-overflow-scrolling:touch}
    body .idc{background:#fff6cf;border:3px solid #2b2552;border-radius:6px;padding:8px 10px 10px;margin-bottom:8px;box-shadow:inset 0 0 0 2px #fff6cf,inset 0 0 0 4px #b8884a;color:#3a2330}
    body .idh{font-size:18px;letter-spacing:.12em;text-align:center;font-weight:700} body .ids{text-align:center;background:#5a2a3a;color:#fff6cf;margin:4px 14px 8px;border-radius:10px;font-size:11px;padding:1px 0}
    body .idb{display:flex;gap:10px} body .idp{flex:0 0 38%;aspect-ratio:3/4;border:3px solid #5a2a3a;background:linear-gradient(180deg,#d8efff,#f4fbff);border-radius:3px;overflow:hidden}
    body .idf{flex:1;display:flex;flex-direction:column;justify-content:space-between} body .idr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5a2a3a;padding:2px 2px;font-size:12px}
    body .idr input{width:7em;text-align:right;font:inherit;border:0;background:transparent;color:inherit;border-bottom:1px dashed #5a2a3a} body .idt{text-align:center;margin-top:6px;border-top:2px solid #5a2a3a;padding-top:4px;font-size:14px}
    body .isr{display:flex;justify-content:center;gap:3px;margin-top:3px} body .isr i{width:12px;height:12px;background:#d8c6a0;clip-path:polygon(50% 0,62% 36%,100% 38%,70% 60%,80% 100%,50% 76%,20% 100%,30% 60%,0 38%,38% 36%)} body .isr i.on{background:#ff9a3c} body .isr.big i{width:22px;height:22px}
    body .dcats{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0} body .dcats .mb.on{background:#ffd6ea !important} body .dsw{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
    body .sw{width:100%;display:flex !important;flex-direction:column;align-items:center;gap:2px;height:auto !important;min-height:72px;padding:5px 2px !important;border-radius:6px !important;font-size:11px;line-height:1.15;white-space:normal !important;overflow:visible} body .sw span{display:block} body .sw i{width:30px;height:30px;border:2px solid #2b2552;border-radius:4px;display:block;font-style:normal;text-align:center;line-height:26px;font-size:14px} body .sw.on{background:#ffd6ea !important;outline:2px solid #ff6aa8} body .sw.cur{box-shadow:0 0 0 2px #3fa86a} body .sw em{font-style:normal;color:var(--muted);font-size:10px}
    body .dact{display:flex;align-items:center;gap:8px;margin-top:8px}
    body .cft li{display:flex;justify-content:space-between;gap:6px;align-items:center} body .cft .lk{cursor:pointer;opacity:.5;padding:0 8px !important;min-width:0;height:22px;line-height:18px;flex:none} body .cft .rc{margin-top:6px} body .cft .lk.on{opacity:1} body .cft .cb{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    body .rc li.lgd{color:#c4501f;font-weight:bold} body .lg{margin:6px 0 10px} body .lg ul{margin:3px 0 0 18px;padding:0} body .lg li{margin:2px 0}
    body.m #mmenu{padding:8px 8px 0} body.m #mmenu .actions{position:static !important;display:flex !important;flex-direction:row !important;flex-wrap:wrap;gap:6px !important;max-width:none}
    body.m #mmenu .chips{left:0 !important;top:calc(100% + 6px) !important}
    .rpgm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:11.5px} .rpgm .rc.wide{grid-column:1/-1}
    body.m .mrow{grid-template-columns:1fr} body.m .gems{grid-template-columns:1fr 1fr}
    body{padding-bottom:44px !important}
    body.d{display:grid !important;grid-template-columns:272px minmax(0,1fr) 350px;grid-template-areas:"hd hd hd" "lf st rt";gap:12px;align-items:start;justify-items:stretch;max-width:1680px;margin:0 auto !important;padding:8px 16px 44px !important}
    body.d header{grid-area:hd;max-width:none !important} body.d .stage{grid-area:st;max-width:none !important;width:100%} body.d #fig{max-width:none !important}
    body.d .rpg{grid-area:lf;display:flex !important;flex-direction:column;max-width:none !important;margin:0;gap:8px;max-height:calc(100vh - 122px);overflow:auto}
    body.d #modal{grid-area:rt;position:sticky;top:8px;display:flex;width:100%;height:calc(100vh - 122px);min-height:480px;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.d .mbox{width:100%;max-height:none;height:100%;overflow:auto;padding:14px}
    body.m .mbox.small,body.d .mbox.small,body .mbox.small{width:min(520px,92vw) !important;height:auto !important;max-height:80vh !important;overflow:auto !important;padding:10px 14px 14px !important;display:block !important}
    body.m .mbox.small::before,body.d .mbox.small::before{display:block}
    body.d .mtabs{margin-bottom:8px}`;
  { const tb = document.createElement('div'); tb.className = 'tfoot'; tb.innerHTML = '<span class="start">★ Start</span><span class="task">Idle Hero</span><span class="clk" id="clk"></span>'; document.body.appendChild(tb);
    const tick = () => { const d = new Date(); $('clk').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }; tick(); setInterval(tick, 20000); }   // the engine's wobble slider and colour swatches are not part of the game

  st.textContent += `
    /* 老式擬真 3D 質感：玻璃凝膠按鈕、金屬斜角視窗框、LCD 像素格、螢幕玻璃反光 */
    .mb,.tab,.chip{background:linear-gradient(180deg,#ffffff 0%,#e6efff 46%,#bccdf0 52%,#dbe7ff 100%) !important;border:1.5px solid #6f82c8 !important;border-radius:999px !important;color:#2b2552;text-shadow:0 1px 0 #fff;
      box-shadow:0 0 0 2px #fff,0 3px 0 2px #7d8bbd,0 6px 8px rgba(43,37,82,.28),inset 0 1px 0 #fff !important;transition:transform .08s}
    .mb:hover,.tab:hover{background:linear-gradient(180deg,#ffffff 0%,#f0f6ff 46%,#cddcf7 52%,#e8f0ff 100%) !important} .mb:active,.tab:active{transform:translateY(2px);box-shadow:0 0 0 2px #fff,0 1px 0 2px #7d8bbd,inset 0 2px 3px rgba(43,37,82,.25) !important}
    .mb[disabled]{opacity:.55;filter:grayscale(.6)} .tab.on{background:linear-gradient(180deg,#b9d2ff 0%,#6f9cf0 48%,#3f74dc 52%,#6f9cf0 100%) !important;color:#fff !important;text-shadow:0 1px 0 #1a3a99}
    .mb.pri{background:linear-gradient(180deg,#ffd2c2 0%,#ff9a7c 46%,#e2483d 52%,#f2755a 100%) !important;border-color:#8a2a18 !important;color:#fff !important;text-shadow:0 1px 0 #8a2a18}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#f6f9ff 0%,#dfe8fa 100%) !important;border:2px solid #fff !important;outline:1px solid #7d8bbd;border-radius:10px !important;
      box-shadow:inset 0 1px 0 #fff,0 2px 0 #aab6dc !important}
    .rh,.mbox::before{border-radius:6px 6px 2px 2px !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(0,0,60,.25)}
    .stats{background:linear-gradient(180deg,rgba(240,247,255,.92),rgba(196,216,250,.86)) !important;border:2px solid #fff !important;border-radius:12px !important;box-shadow:0 0 0 1px #7d8bbd,0 3px 6px rgba(43,37,82,.3),inset 0 1px 0 #fff !important}
    body:not(.m) .stats{flex-direction:row !important;align-items:center;gap:12px !important;top:8px !important;right:8px !important;padding:3px 12px !important} body:not(.m) .stats::before{display:none}
    body:not(.m) .stat{display:flex !important;flex-direction:row;align-items:baseline;gap:5px;width:auto} body:not(.m) .stat .k{font-size:10px} body:not(.m) .stat .v{font-size:15px !important} body:not(.m) .hbar{width:64px !important;height:9px !important;margin-left:4px}
    body.m .stat .k{font-size:9px;line-height:1} body.m .stat .v{font-size:14px !important;line-height:1.1} body.m .stats{padding:2px 8px !important;top:6px;left:8px;right:8px} body.m .hbar{height:8px !important}
    body.m .mtabs{background:linear-gradient(180deg,#eef2fa 0%,#b9c3dc 50%,#cfd7ea 52%,#a3afcf 100%) !important;border-top:2px solid #fff;box-shadow:0 -3px 8px rgba(43,37,82,.3) !important}
    body.m .tab{margin:4px 3px !important;min-height:46px;border-radius:14px !important;color:#2b2552 !important;text-shadow:0 1px 0 #fff !important;background:linear-gradient(180deg,#fff 0%,#e9f0ff 46%,#c0d0f2 52%,#dfe9ff 100%) !important;border:1.5px solid #6f82c8 !important;box-shadow:0 2px 0 #7d8bbd,inset 0 1px 0 #fff !important}
    body.m .tab.on{margin-top:0 !important;color:#fff !important;text-shadow:0 1px 0 #1a3a99 !important;background:linear-gradient(180deg,#b9d2ff 0%,#6f9cf0 48%,#3f74dc 52%,#6f9cf0 100%) !important;border-radius:14px !important;box-shadow:0 1px 0 #1a3a99,inset 0 1px 0 #fff !important}
    svg.tree{border-radius:12px !important;border:2px solid #fff !important;outline:1px solid #7d8bbd;background:radial-gradient(circle at 50% 45%,#ffffff,#dbe6fb) !important;box-shadow:inset 0 3px 8px rgba(40,60,130,.28),0 2px 0 #8c9bd0 !important}
    .rc ul,.rc ol{background:linear-gradient(180deg,#f3f8ff,#e6eefc) !important;border:1px solid #8c9bd0 !important;border-radius:6px !important;box-shadow:inset 0 2px 3px rgba(40,60,130,.22),0 1px 0 #fff}
    .gt,.skb,.gl{border-radius:8px !important;box-shadow:inset 0 1px 0 #fff,0 2px 0 #aab6dc !important}
    .pz{padding:6px;background:linear-gradient(180deg,#9fb0d8,#c6d2ee);border:2px solid #fff;outline:1px solid #7d8bbd;border-radius:12px;box-shadow:inset 0 3px 6px rgba(30,40,100,.35),0 2px 0 #8c9bd0}
    .pc:not(.fill):not(.lock){background:radial-gradient(circle at 50% 50%,#8294c4 0 18%,#b4c2e6 20%);border-radius:7px;border:1px solid #7d8bbd;box-shadow:inset 0 2px 3px rgba(30,40,100,.4),0 1px 0 #fff}
    .pc.fill{border-radius:8px;box-shadow:inset 0 2px 0 rgba(255,255,255,.85),inset 0 -3px 0 rgba(0,0,60,.28),0 2px 0 rgba(30,40,100,.4) !important;text-shadow:0 1px 0 rgba(255,255,255,.7)}
    .ach li.mute .spr{filter:grayscale(1);opacity:.45}
    .rz{font-size:11.5px;margin:2px 0 4px;color:#1f3fb0;background:#eaf1ff;border:1px solid #9fb2e8;border-radius:6px;padding:2px 8px}
    .stage #loot{position:absolute;left:8px;bottom:8px;top:auto;transform:none;align-items:flex-start;width:min(240px,60%);z-index:5;flex-direction:column-reverse}
    body.m .stage #loot{left:auto;right:6px;bottom:auto;top:52px;align-items:flex-end;width:min(190px,54%);flex-direction:column}
    .lt{padding:1px 8px !important;border-radius:8px;font-size:11px !important;background:rgba(255,255,255,.72) !important;border:0 !important;border-left:3px solid var(--rc) !important;box-shadow:none !important;animation:none !important} .lt.r3{animation:none !important;background:rgba(255,245,220,.88) !important} .lt .lh b{font-size:13px !important} .lt.r3{padding:2px 9px !important;font-size:12px !important} .lt.r3 .lh b{font-size:13px !important}
  `;
  document.head.appendChild(st);
  { // 重要事件用黑底對話框跳出：升級、關主登場、地圖完成、倒下、撿到暗金
    const dl = document.createElement('div'); dl.className = 'dlg'; document.querySelector('.stage').appendChild(dl);
    const q = [], who = t => /關主/.test(t) ? 'WARNING' : /倒下/.test(t) ? 'GAME OVER?' : /暗金/.test(t) ? 'LEGENDARY' : 'SYSTEM';
    let busy = false; const next = () => { if (!q.length){ busy = false; return; } busy = true; const fr = $('fig').getBoundingClientRect(), sr = dl.parentElement.getBoundingClientRect(); dl.style.top = (fr.top - sr.top + fr.height*.78) + 'px'; const t = q.shift(); dl.innerHTML = `<b>${who(t)}</b>${t}<i></i>`; dl.classList.add('show'); setTimeout(() => { dl.classList.remove('show'); setTimeout(next, 300); }, 2600); };
    const base = logLine; logLine = (t, c) => { base(t, c); if (!G.offline && /升級了|關主|地圖完成/.test(t) && q.length < 3){ q.push(t); if (!busy) next(); } };
  }
  const el = document.createElement('div'); el.className = 'rpg'; el.id = 'rpg'; document.querySelector('.stage').after(el);
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.hidden = true; m.innerHTML = `<div class="mbox"><div class="mtabs" id="mtabs"></div><div id="mbody"></div></div>`;
  m.addEventListener('pointerdown', e => { if (e.target === m && !MOB() && !DESK()) closeModal(); });
  const o = document.createElement('div'); o.className = 'modal'; o.id = 'ovl'; o.hidden = true;
  document.body.append(m, o);
  // 跨尺寸使用同一操作台，不重新載入或重建引擎指令。
  const hint = () => { let h = $('nexthint');
    if (!h){ h = document.createElement('button'); h.type = 'button'; h.id = 'nexthint'; h.onclick = () => { if (h.dataset.tab) openModal(h.dataset.tab); }; document.body.appendChild(h); }
    let cb = $('ctxbtn'); if (!cb){ cb = document.createElement('button'); cb.id = 'ctxbtn'; cb.onclick = () => uiLeaveMap(); }
    const stg = document.querySelector('.stage'); if (stg){ if (h.parentNode !== stg) stg.appendChild(h); if (cb.parentNode !== stg) stg.appendChild(cb); } else { if (h.parentNode !== document.body) document.body.appendChild(h); }
    cb.hidden = !G.run; cb.textContent = '離開';
    { let mt = $('modtxt'); if (!mt){ mt = document.createElement('div'); mt.id = 'modtxt'; } const R = G.run, ms = R && R.map ? (R.map.mods || []).slice(0, 3).map(k => MODS[k].n) : []; if (R && R.tower) ms.unshift('無限之塔 第 ' + R.floor + ' 層');
      if (stg && mt.parentNode !== stg) stg.appendChild(mt); const t = ms.join('\n'); if (mt._t !== t){ mt._t = t; mt.innerText = t; } }
    const n = nextStep(); h.hidden = !n; if (n){ h.textContent = '下一步：' + n.t; h.dataset.tab = n.tab || ''; } };
  const draw=()=>{hint();uiRefreshLive();if(typeof viewTick==='function')viewTick();};
  setInterval(draw, 300); draw();
  uxInit();
  uiInitLayout();
  viewInit();
  document.getElementById('lblctl'); const pc = document.getElementById('pals'); if (pc) pc.parentElement.style.display = 'none';
}

function uiBuildGearHtml(){return `<details><summary>管理構築裝備記憶</summary><p class="uxmeta">解除記憶不刪除物品；只取消該配置的回收保護。改版前天賦備份、穿著及上一件的保護仍生效。</p>${G.builds.map((b,i)=>b?.equipment?`<p>構築 ${i+1}：${Object.entries(b.equipment).map(([slot,r])=>{const it=r?.kind==='core'?G.armory[r.id]:r?.kind==='gear'?G.inventory.find(x=>x.uid===r.uid):null;return SLOTN[slot]+' '+(r===null?'空欄位':it?uxEsc(it.name):'缺件');}).join('、')}<button class="mb" ${i===(G.bi||0)||G.run?.city||G.train?'disabled':''} onclick="uiForgetBuild(${i})">解除構築 ${i+1} 裝備記憶</button>${i===(G.bi||0)?'<small>先切換到其他構築，再解除這套記憶。</small>':''}</p>`:'').join('')||'<p>尚未保存裝備。</p>'}</details>`;}
let FORGET_BUILD_PENDING=null;
function uiForgetBuild(index){if(index===(G.bi||0)||!G.builds[index]?.equipment)return;FORGET_BUILD_PENDING={index,stamp:JSON.stringify(G.builds[index].equipment)};showOverlay(`<h2 class="uxdialog-title">解除構築 ${index+1} 的裝備記憶？</h2><p>保留物品、技能與天賦；取消這套配置對裝備的回收保護。其他構築、改版備份、穿著與上一件的保護仍有效。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備記憶</button><button class="mb pri" onclick="uiConfirmForgetBuild()">解除裝備記憶</button></div>`);}
function uiConfirmForgetBuild(){const p=FORGET_BUILD_PENDING;FORGET_BUILD_PENDING=null;hideOverlay();if(!p||JSON.stringify(G.builds[p.index]?.equipment)!==p.stamp||!forgetBuildGear(p.index)){uxAnnounce('配置已變動，沒有解除記憶。');return;}renderModal();uxAnnounce('已解除裝備記憶，物品仍在原處。');}
