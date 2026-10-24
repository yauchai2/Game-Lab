const assert=require('node:assert/strict'),Grid=require('../src/game/00-grid.js'),{createRuntime}=require('./lib/offline-runtime.cjs');
let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++};
for(const id of Object.keys(Grid.TEMPLATES)){
 const b=Grid.createBoard(id),L=Grid.layout(b);ok(L.size<=8,'bounded size');
 for(let i=0;i<L.socks.length;i++){if(L.legacy)b.wires=[];const path=Grid.route(b,i);ok(path,'all endpoints reachable even after other straight routes');b.wires.push({sock:i,cells:path});ok(Grid.connected(b,i),'legal path connected');}
 if(L.legacy){b.wires=[];b.wires.push({sock:0,cells:Grid.route(b,0)});}
 const skill=Grid.place(b,'active','FIRE',...L.socks[0]);ok(skill,'active placement');ok(Grid.resolve(b).find(r=>r.id===skill.id).wired,'active live');
 const saved=JSON.stringify(b);Grid.autoWireAll(b);Grid.autoWire(b,0);Grid.dress(b);ok(JSON.stringify(b)===saved,'automation cannot modify');
 b.wires[0].cells.pop();ok(!Grid.resolve(b).find(r=>r.id===skill.id).wired,'broken endpoint disabled');ok(!Grid.dps(b,{hit:10,crit:5,cm:150},99).length,'broken endpoint contributes zero DPS');
}
for(const key of Object.keys(Grid.GEM_COLOR)){
 const b=Grid.createBoard('extreme'),L=Grid.layout(b),good=L.pads.find(p=>p[2]===Grid.GEM_COLOR[key]),bad=L.pads.find(p=>p[2]!==Grid.GEM_COLOR[key]);
 ok(Grid.place(b,'support',key,...good.slice(0,2)),'matching color');ok(!Grid.place(b,'support',key,...bad.slice(0,2)),'wrong color rejected');
}
for(const cells of [[[2,2],[3,2]],[[1,2],[3,2]],[[1,2],[2,2],[1,2]],[[1,2],[2,2],[3,1]]]){const b=Grid.createBoard();Grid.place(b,'active','FIRE',...Grid.layout(b).socks[0]);b.wires=[{sock:0,cells}];ok(!Grid.connected(b,0),'forged, jumping, looping paths never activate');}
{const b=Grid.createBoard();Grid.place(b,'support','HEAVY',...Grid.layout(b).pads.find(p=>p[2]==='r').slice(0,2),0,{t:3});ok(Grid.powerUsed(b)===3,'tier III cost');ok(!Grid.canPlace(b,'support','AREA',...Grid.layout(b).pads.find(p=>p[2]==='g')),'power is global hard cap');}
{const b=Grid.createBoard('extreme');Grid.place(b,'active','FIRE',...Grid.layout(b).socks[0]);b.wires=[{sock:0,cells:Grid.route(b,0)}];for(const [x,y]of b.wires[0].cells)Grid.place(b,'support',{r:'HEAVY',b:'HASTE',g:'FORK'}[Grid.padColor(x,y,b)],x,y);const resolved=Grid.resolve(b)[0];ok(resolved.linked.length===3&&resolved.over.length>0,'three effective supports is a hard cap');}
const r=createRuntime(19);
r.evaluate(`
 let stateChecks=0;const ensure=(x,m)=>{stateChecks++;if(!x)throw Error(m)};const GAME_NEW_STATE=copyState(G);const PV={sig:'',lastTime:0};const INTRO={active:false};
 G.board=GridLab.createBoard();GridLab.place(G.board,'active','FIRE',...GridLab.layout(G.board).socks[0]);recalc();ensure(!G.slots.length,'unwired does not enter combat');
 for(const c of GridLab.route(G.board,0))GridLab.extend(G.board,0,...c);recalc();ensure(G.slots[0]==='FIRE','manual complete enables skill');GridLab.shrink(G.board,0);recalc();ensure(!G.slots.length,'cut instantly disables combat');
 const before=G.equip.weapon;G.autoEquip=true;pickup({kind:'item',it:makeItem('weapon',2,35)});ensure(G.equip.weapon===before,'rare does not auto equip');
 const core=Object.values(SIGNATURE_GEAR).find(g=>g.slot==='weapon');pickup({kind:'item',it:makeItem('weapon',3,35,core.id)});ensure(G.equip.weapon===before,'core does not auto equip');
 G.lvl=35;G.maxDepth=20;G.bossKills=10;G.gold=50000;G.run=null;G.train=null;
 for(const job of Object.keys(CHARS)){G.char=job;G.ascension=null;ensure(ASCENSIONS[job].length===3,'three ascensions');for(const a of ASCENSIONS[job]){G.ascension=null;const gold=G.gold;ensure(chooseAscension(a.id),'ascension selectable');ensure(G.gold===gold,'first free');ensure(ascendInfo().id===a.id,'selection affects source');}ensure(!chooseAscension(ASCENSIONS[Object.keys(CHARS).find(k=>k!==job)][0].id),'no cross job ascension');}
 G.char='street';G.ascension='ground';recalc();G.h.buffer=0;G.h.bufferUntil=0;for(let i=0;i<40;i++)characterBasicHit({dead:false});ensure(G.h.buffer<=G.st.life*.09+1e-8,'ground shield remains capped');G.char='frost';G.ascension='pace';G.characterRuntime=null;for(let i=0;i<40;i++)characterBasicHit({dead:false});ensure(characterRuntime().combo===8,'pace has exactly eight beats');
 G.char='volt';G.ascension='repair';recalc();G.h.hp=G.st.life*.5;G.h.recoverCredit=0;G.h.recoverAt=G.time;ensure(heroRecover(G.st.life)===0,'repair cannot bypass exhausted shared credit');G.time+=1;ensure(heroRecover(G.st.life)<=G.st.life*.025+1e-8,'repair shares 2.5 percent per second credit');
 G.char='street';G.ascension='ground';const gold=G.gold;ensure(!chooseAscension('arc',{job:'beep',prev:'ground',cost:17500})&&G.gold===gold,'stale class cannot pay');ensure(chooseAscension('arc',{job:'street',prev:'ground',cost:17500}),'same-job paid respec');ensure(G.gold===gold-17500,'one charge');ensure(!chooseAscension('arc'),'duplicate cannot pay');
 const rand=Math.random;Math.random=()=>0;G.circuits=['pocket','pocket_v'];G.drops=[];G.circuitPity=0;const drops=[circuitDrop('boss'),circuitDrop('boss'),circuitDrop('boss')];ensure(!G.circuits.includes(drops[2]),'third boss guarantees unowned even if first two rolls duplicate');Math.random=rand;
 G.circuits=['pocket'];G.circuitLayouts={};G.board=GridLab.createBoard();ensure(!equipCircuit('extreme'),'unowned board rejected');collectCircuit('matrix');ensure(equipCircuit('matrix'),'earned board manually equip');GridLab.place(G.board,'active','FIRE',...GridLab.layout(G.board).socks[0]);ensure(equipCircuit('pocket')&&equipCircuit('matrix')&&G.board.pieces.length===1,'manual layout remembered');
 G.builds=[null,{character:'street',board:{v:5,pieces:[],wires:[]},pass:[]},null];G.bi=0;ensure(!restoreBuild(1).ok,'legacy build cannot grant unowned 8x8');
 G.builds[1]={character:'beep',board:GridLab.createBoard(),pass:[]};ensure(!restoreBuild(1).ok&&G.char==='street','build cannot change job');
 G.heroName='一號';ensure(saveGame(),'create profile');const first=PROFILE_SESSION.active;const saved=JSON.stringify(PROFILE_SESSION.profiles);G.char='beep';ensure(!saveGame()&&JSON.stringify(PROFILE_SESSION.profiles)===saved,'job immutable in account');G.char='street';
 profileResetRuntime();G.char='beep';G.heroName='二號';PROFILE_SESSION.active=null;ensure(saveGame(),'create independent second');const second=PROFILE_SESSION.active;ensure(profileSwitch(first)&&G.char==='street'&&G.heroName==='一號','first restored');ensure(profileSwitch(second)&&G.char==='beep'&&G.heroName==='二號','second restored');
 const setter=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')};ensure(!profileSwitch(first)&&G.char==='beep'&&PROFILE_SESSION.active===second,'save failure preserves current');ensure(!profileDeleteCurrent()&&PROFILE_SESSION.profiles.length===2,'delete failure preserves all');localStorage.setItem=setter;
 ensure(profileDeleteCurrent()&&PROFILE_SESSION.profiles.length===1&&PROFILE_SESSION.profiles[0].id===first,'delete only current character');
 ensure(!saveGame(),'pagehide cannot recreate deleted character or overwrite another');
 const persisted=JSON.parse(localStorage.getItem(SAVE_KEY));ensure(persisted.v===3&&persisted.profiles.length===1,'atomic envelope');
`);checks+=r.evaluate('stateChecks');
const migration=createRuntime(9);migration.evaluate(`
 const snapshot=serialize();snapshot.char='frost';snapshot.heroName='舊玩家';snapshot.board=GridLab.fromLegacy(['FIRE'],{FIRE:['HEAVY']},20);delete snapshot.careerVersion;delete snapshot.circuits;
 localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot));const loaded=loadGame();if(!applySave(loaded)||G.char!=='frost'||G.heroName!=='舊玩家'||!saveGame())throw Error('v2 migration');
 const envelope=JSON.parse(localStorage.getItem(SAVE_KEY));if(envelope.v!==3||envelope.profiles.length!==1||!G.circuits.includes('legacy'))throw Error('legacy account geometry');
 const GAME_NEW_STATE=copyState(G),PV={sig:''};G.char='frost';
 while(PROFILE_SESSION.profiles.length<12){PROFILE_SESSION.active=null;G.heroName='角色'+PROFILE_SESSION.profiles.length;if(!saveGame())throw Error('12 slots');}
 const original=localStorage.getItem(SAVE_KEY);PROFILE_SESSION.active=null;if(saveGame()||localStorage.getItem(SAVE_KEY)!==original)throw Error('13th profile overwrites account');
`);checks+=5;
console.log('PASS',checks,'circuit topology, color, power, combat gating, manual equipment, 12 ascensions, acquisition, immutable jobs and atomic multi-character storage checks');
