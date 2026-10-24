const fs=require('node:fs'),assert=require('node:assert/strict'),{createRuntime}=require('./lib/offline-runtime.cjs');const r=createRuntime(66);
r.evaluate(fs.readFileSync('src/game/05u-loot-world.js','utf8'));
r.evaluate(`
let checks=0;function ok(value,message){checks++;if(!value)throw Error(message)}
function target(x=HX+10,y=HY){return {type:'slime',x,y,hp:1e9,hpMax:1e9,dead:false,fall:0,frozen:0,shock:0,burn:0,hurtT:0,atkCd:999,lunge:-1,slot:0,skillCd:999,ph:0};}
G.lvl=50;G.maxDepth=30;G.h.hp=1e9;
ok(Object.keys(SKILLS).length===15&&Object.keys(SUPPS).length===18,'catalog expanded');
for(const id of Object.keys(SKILLS))ok(GridLab.ACTIVES[id]&&SKILLS[id].cd===GridLab.ACTIVES[id].cd,'active parity '+id);
for(const id of Object.keys(SUPPS))ok(GridLab.SUPPORTS[id]&&GridLab.GEM_COLOR[id],'support registry and category '+id);
for(const id of EXPANSION_SKILLS){G.board=GridLab.createBoard('extreme');GridLab.place(G.board,'active',id,...GridLab.layout(G.board).socks[0]);G.board.wires=[{sock:0,cells:GridLab.route(G.board,0)}];recalc();const m=target();G.mons=[m];G.h.hp=G.st.life;G.timers=[];G.proj=[];castSkill(id);for(const timer of G.timers.filter(t=>t.expansion))expansionPulse(timer);ok(m.hp<1e9,'actual damage '+id);ok(G.timers.filter(t=>t.expansion).length<=4,'bounded ticks '+id);ok(Number.isFinite(G.st.sk[id].direct),'honest finite preview '+id);const saved=serialize();ok(applySave(saved)&&G.board.pieces.some(p=>p.key===id),'save preserves '+id);}
ok(GridLab.fits('SPREAD',{key:'RAIL'})&&!GridLab.fits('SPREAD',{key:'DEFRAG'}),'range support compatibility meaningful');
G.board=GridLab.createBoard('extreme');GridLab.place(G.board,'active','RAIL',...GridLab.layout(G.board).socks[0]);G.board.wires=[{sock:0,cells:GridLab.route(G.board,0)}];recalc();G.st.crit=0;G.st.sk.RAIL.crit=0;
function damage(support,config={}){const m=target();Object.assign(m,config);G.mons=[m];G.st.sk.RAIL.has=support?[support]:[];G.h.hp=G.st.life;const before=m.hp;applySkillHit('RAIL',m);return before-m.hp;}
const oldRandom=Math.random;Math.random=()=>.99;
ok(damage('EXECUTE',{hp:1e8})>damage(null,{hp:1e8})*1.44,'low-health enemy payoff');ok(damage('LONG',{x:HX+40})>damage(null,{x:HX+40})*1.39,'distance payoff');ok(damage('CONDUCT',{burn:2})>damage(null,{burn:2})*1.34,'status payoff');Math.random=oldRandom;
G.inventory=[];G.equip=Object.fromEntries(Object.keys(SLOTN).map(k=>[k,null]));G.equipBackup={};G.builds=[null,null,null];
const normal=makeItem('weapon',0,10),kept=makeItem('head',0,10),worn=makeItem('armor',0,10),locked=makeItem('ring',1,10),corrupt=makeItem('boots',1,10),rare=makeItem('offhand',2,10),previous=makeItem('gloves',0,10),referenced=makeItem('weapon',0,10);
for(const it of [normal,kept,worn,locked,corrupt,rare,previous,referenced])storeGear(it);
kept.kept=true;G.equip.armor=worn;locked.lk=0;corrupt.cr=true;G.equipBackup.gloves=previous;G.builds[0]={equipment:{weapon:{kind:'gear',uid:referenced.uid}}};
ok(lootCandidates().length===1&&lootCandidates()[0]===normal,'all legacy protections and rarity defaults');
normal.aff=[{k:'dmg',v:20,tier:0}];ok(!lootMatches(normal),'top-tier affix opt-out protection');LOOT_UI.preserveTop=false;ok(lootMatches(normal),'explicitly allow top-tier affix cleanup');normal.aff=[];LOOT_UI.preserveTop=true;normal.junk=true;LOOT_UI.junk=true;ok(lootCandidates().length===1,'junk filter');LOOT_UI.maxLevel=5;ok(lootCandidates().length===0,'item-level filter');LOOT_UI.maxLevel=9999;LOOT_UI.junk=false;
// UI IO stubs only; production lifecycle remains intact.
document.querySelector=()=>null;showOverlay=()=>{};hideOverlay=()=>{};renderModal=()=>{};uxAnnounce=()=>{};
lootCleanupAsk();const fresh=makeItem('weapon',0,10);storeGear(fresh);normal.kept=true;const before=G.parts;lootCleanupConfirm();ok(G.parts===before&&G.inventory.includes(normal)&&G.inventory.includes(fresh),'stale protection and new arrivals never removed');
normal.kept=false;lootCleanupAsk();const expected=lootTotals([normal,fresh]);lootCleanupConfirm();ok(G.parts===before+expected.parts&&!G.inventory.includes(normal)&&!G.inventory.includes(fresh),'bulk recycler gives exact resources');const after=G.parts;lootCleanupConfirm();ok(G.parts===after,'double confirm pays once');
G.whUp=5;G.inventory=[];G.equip={};G.equipBackup={};G.builds=[null,null,null];for(let i=0;i<330;i++)storeGear(makeItem('head',0,10));const saved=serialize();ok(whCap()===700,'expansion capacity');G.whUp=0;ok(applySave(saved)&&G.inventory.length===330&&whCap()===700,'expanded inventory loads before capacity clamp');
ok(BIOMES.length===18&&REGION_MOBS.length===18,'new regions reachable');for(const id of NEW_MONSTERS)ok(MTYPES[id]&&MONSTER_TRAITS[id]&&MONSTER_GUIDE.some(r=>r[0]===id),'new enemy fully registered '+id);
console.log('PASS',checks,'catalog, real combat, conditional supports, safe bulk salvage, old saves and world assertions');
`);
