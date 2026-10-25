/* Fixed jobs, bounded ascensions, collectible boards and isolated character profiles. */
const ASCENSIONS={
 street:[{id:'ground',n:'接地鐵衛',d:'護盾上限提高至生命9%，生命+12%、護甲+30；專技傷害降低15%。',eff:{lifePct:12,armor:30}},
 {id:'arc',n:'電弧破陣',d:'專技可再跳兩個目標，閃電傷害+12%；專技單次傷害降低10%。',eff:{light:12}},
 {id:'drive',n:'超載鬥士',d:'攻速+15%，專技間隔縮短10%；基礎回復每秒降低0.8。',eff:{apsInc:15,regen:-.8}}],
 frost:[{id:'echo',n:'回聲奏者',d:'音波專技在0.45秒後回放35%傷害；本體專技傷害降低20%，技能傷害+8%。',eff:{sinc:8}},
 {id:'still',n:'靜域調音師',d:'音波專技嘗試凍結0.5秒，BOSS仍需累積控制；技能急速+12%、增加傷害降低8%。',eff:{haste:12,inc:-8}},
 {id:'pace',n:'疾拍行者',d:'連擊節拍上限提高至8，攻速+12%；最大生命降低4%。',eff:{apsInc:12,lifePct:-4}}],
 beep:[{id:'snipe',n:'定頻狙手',d:'專技只鎖定2個目標，每發倍率由2.8提高至4.3；會心率+5%、會心傷害+10%。',eff:{crit:5,cm:10}},
 {id:'split',n:'分流追獵者',d:'專技最多鎖定8個目標，每發倍率降至2.4；增加傷害降低5%。',eff:{inc:-5}},
 {id:'shadow',n:'殘影速行者',d:'閃避率+8%、攻速+8%；最大生命降低6%。',eff:{dodge:8,apsInc:8,lifePct:-6}}],
 volt:[{id:'dual',n:'雙核馭機師',d:'寵機每0.8秒攻擊，直擊倍率0.78，另擊次目標30%；最大生命降低5%。',eff:{lifePct:-5}},
 {id:'repair',n:'維修監督',d:'生命+8%、每秒回復+1；寵機每8擊修復3%生命，但攻擊傷害降低20%。回復仍受共用額度限制。',eff:{lifePct:8,regen:1}},
 {id:'melt',n:'熔核改裝師',d:'寵機改為每1.5秒直擊105%傷害，向附近最多3個其他目標濺射25%。',eff:{}}]
};
const ASC_UNLOCK={lvl:20,depth:8,boss:10};
function ascendInfo(id=G.ascension,job=G.char){return ASCENSIONS[job]?.find(a=>a.id===id)||null;}
function canAscend(){return G.lvl>=ASC_UNLOCK.lvl&&G.maxDepth>=ASC_UNLOCK.depth&&G.bossKills>=ASC_UNLOCK.boss;}
function ascensionState(id){const a=ascendInfo(id),cost=G.ascension&&G.ascension!==id?500*G.lvl:0;return {a,cost,ok:!!a&&canAscend()&&!G.run&&!G.train&&G.ascension!==id&&G.gold>=cost};}
function chooseAscension(id,expected){const state=ascensionState(id);if(!state.ok||expected&&(expected.job!==G.char||expected.prev!==(G.ascension||null)||expected.cost!==state.cost))return false;G.gold-=state.cost;G.ascension=id;G.ascensionNodes=[];G.characterRuntime=null;recalc();return true;}
function circuitAllowed(id){const t=GridLab.TEMPLATES[id];return !!t&&(t.legacy||G.lvl>=t.lvl&&G.maxDepth>=t.depth);}
function circuitPool(){return Object.keys(GridLab.TEMPLATES).filter(id=>!GridLab.TEMPLATES[id].legacy&&id!=='pocket'&&circuitAllowed(id));}
function circuitDrop(kind){
 const pool=circuitPool();if(!pool.length)return null;G.circuitPity=(G.circuitPity||0)+(kind==='boss'?1:0);
 const pending=new Set(G.drops.filter(d=>d.kind==='circuit'&&!d.done).map(d=>d.id)),fresh=pool.filter(id=>!G.circuits.includes(id)&&!pending.has(id)),guarantee=kind==='boss'&&G.circuitPity>=3&&fresh.length;
 if(!guarantee&&Math.random()>({normal:.02,elite:.08,boss:.3}[kind]||0))return null;
 const id=tPick(guarantee?fresh:pool);if(kind==='boss'&&fresh.includes(id))G.circuitPity=0;return id;
}
function collectCircuit(id){if(!Object.hasOwn(GridLab.TEMPLATES,id))return false;G.circuits=G.circuits||['pocket'];if(G.circuits.includes(id)){G.parts+=8;logLine('重複電路板回收為8零件。','#687ba9');}else{G.circuits.push(id);noticeNew('boards',id);logLine('入手電路板：'+GridLab.TEMPLATES[id].n,'#2f9e4f');}G.dirty=true;return true;}
function cleanCircuitInventory(){
 G.circuits=[...new Set(['pocket',...(Array.isArray(G.circuits)?G.circuits:[]),G.board.template].filter(id=>Object.hasOwn(GridLab.TEMPLATES,id)))];
 const used={};G.board.pieces=G.board.pieces.filter(p=>p.kind!=='support'||(used[p.key+':'+(p.t||1)]=(used[p.key+':'+(p.t||1)]||0)+1)<=gemOwnT(p.key,p.t||1));
}
function equipCircuit(id){
 if(!G.circuits.includes(id)||!circuitAllowed(id)||G.run||G.train||G.board.template===id)return false;
 G.circuitLayouts[G.board.template]=copyState(G.board);const saved=G.circuitLayouts[id];G.board=saved?.v===6&&saved.template===id?GridLab.adopt(saved):GridLab.createBoard(id);cleanCircuitInventory();recalc();G.timers=[];G.proj=[];G.h.castT=-1;return true;
}

/* One atomic localStorage value contains the active save and all character slots. */
const PROFILE_MAX=12,PROFILE_SESSION={profiles:[],active:null,draft:null,returnTo:null,pending:false};
function profileLoad(){
 try{const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!raw)return null;
  if(raw.v===3&&Array.isArray(raw.profiles)){PROFILE_SESSION.profiles=raw.profiles.filter(p=>typeof p?.id==='string'&&/^[a-zA-Z0-9_-]{1,39}$/.test(p.id)&&p.save?.v===2&&Object.hasOwn(CHARS,p.save.char)).slice(0,PROFILE_MAX);const p=PROFILE_SESSION.profiles.find(p=>p.id===raw.active)||PROFILE_SESSION.profiles[0];PROFILE_SESSION.active=p?.id||null;return p?copyState(p.save):null;}
  if(raw.v===2){raw.char=Object.hasOwn(CHARS,raw.char)?raw.char:'street';PROFILE_SESSION.profiles=[{id:'legacy',save:copyState(raw)}];PROFILE_SESSION.active='legacy';return raw;}
 }catch(e){}return null;
}
function profileSave(){
 if(G.__wipe||typeof INTRO!=='undefined'&&INTRO.active)return false;
 const save=serialize(),old=PROFILE_SESSION.profiles.find(p=>p.id===PROFILE_SESSION.active);if(old&&old.save.char!==G.char)return false;
 const id=PROFILE_SESSION.active||PROFILE_SESSION.draft||(PROFILE_SESSION.draft='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
 const profiles=PROFILE_SESSION.profiles.filter(p=>p.id!==id);if(profiles.length>=PROFILE_MAX)return false;profiles.push({id,save});
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({v:3,active:id,profiles}));PROFILE_SESSION.profiles=profiles;PROFILE_SESSION.active=id;PROFILE_SESSION.pending=false;PROFILE_SESSION.draft=null;PROFILE_SESSION.returnTo=null;return true;}catch(e){return false;}
}
function profileResetRuntime(){for(const k of Object.keys(G))delete G[k];Object.assign(G,copyState(GAME_NEW_STATE));PV.sig='';PV.lastTime=null;}
function profileRestore(id){const p=PROFILE_SESSION.profiles.find(p=>p.id===id);if(!p)return false;profileResetRuntime();if(!applySave(copyState(p.save)))return false;PROFILE_SESSION.active=id;PROFILE_SESSION.pending=false;PROFILE_SESSION.draft=null;PROFILE_SESSION.returnTo=null;G.lastWall=Date.now();G.paused=false;return true;}
function profileSwitch(id){if(G.run||G.train||PROFILE_SESSION.pending||id===PROFILE_SESSION.active||!PROFILE_SESSION.profiles.some(p=>p.id===id)||!saveGame())return false;const previous=PROFILE_SESSION.active;if(!profileRestore(id))return false;if(!saveGame()){profileRestore(previous);return false;}return true;}
function profileNew(){if(G.run||G.train||PROFILE_SESSION.pending||PROFILE_SESSION.profiles.length>=PROFILE_MAX||!saveGame())return false;const id=PROFILE_SESSION.active;profileResetRuntime();PROFILE_SESSION.active=null;PROFILE_SESSION.returnTo=id;PROFILE_SESSION.pending=true;PROFILE_SESSION.draft=null;INTRO.step=0;INTRO.selected='street';INTRO.name='';introStart(true);return true;}
function profileCancelNew(){const id=PROFILE_SESSION.returnTo;if(!id||!PROFILE_SESSION.pending)return false;INTRO.active=false;document.body.classList.remove('intro-active');uxCloseDialog($('ovl'));if(!profileRestore(id))return false;openModal('char');return true;}
function profileImportNew(raw){if(G.run||G.train||PROFILE_SESSION.profiles.length>=PROFILE_MAX||!raw||raw.v!==2||!Object.hasOwn(CHARS,raw.char)||!saveGame())return false;const returnTo=PROFILE_SESSION.active;profileResetRuntime();if(!applySave(copyState(raw))){profileRestore(returnTo);return false;}PROFILE_SESSION.active=null;PROFILE_SESSION.pending=true;PROFILE_SESSION.returnTo=returnTo;if(!saveGame()){profileRestore(returnTo);return false;}return true;}

function profileDeleteCurrent(){
 if(G.run||G.train||PROFILE_SESSION.pending||!PROFILE_SESSION.active)return false;
 const profiles=PROFILE_SESSION.profiles.filter(p=>p.id!==PROFILE_SESSION.active),active=profiles[0]?.id||null;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({v:3,active,profiles}));PROFILE_SESSION.profiles=profiles;PROFILE_SESSION.active=active;G.__wipe=true;return true;}catch(e){return false;}
}
