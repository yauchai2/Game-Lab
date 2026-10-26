/* Behavioral regressions for scheduling, preview, control, provenance and linked builds. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const GridLab=require('../src/game/00-grid.js');let checks=0;
function run(name,code){const math=Object.create(Math);math.random=()=>.99;const c={Math:math,console,Date,GridLab,
 tPick:a=>a[0],tRand:(a,b)=>(a+b)/2,tClamp:(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),tFmt:String,SFX:()=>{},closeModal:()=>{}};
 vm.createContext(c);for(const f of ['01-data.js','02-state.js','02b-careers.js','02g-rift.js','03-combat.js'])vm.runInContext(fs.readFileSync(__dirname+'/../src/game/'+f,'utf8'),c);
 c.assert=assert;vm.runInContext(`
 G.lvl=60;G.offline=true;G.ach=Object.fromEntries(Object.keys(ACHS).map(id=>[id,1]));G.equip.weapon=makeItem('weapon',0,1);recalc();moveHero=()=>{};
 function board(ids,modes={}){G.h.x=HX;G.h.y=HY;G.board=GridLab.createBoard('extreme');G.circuits=['pocket','extreme'];for(const id of ids){const spot=GridLab.findSpot(G.board,'active',id);assert(spot);const piece=GridLab.place(G.board,'active',id,spot.x,spot.y,spot.rot);piece.mode=modes[id]||null;const sock=GridLab.sockIndex(piece,G.board);G.board.wires.push({sock,cells:GridLab.route(G.board,sock)});}recalc();G.readySince={};for(const id of ids)G.cds[id]=999;G.h.castT=-1;G.h.atkCd=999;G.h.blinkCount=0;G.h.blinkWindow=G.time;G.h.blinkRestUntil=0;G.summons=[];}
 function dummy(boss=false){return {type:'slime',boss,x:HX,y:HY-10,hp:1e12,hpMax:1e12,dmg:0,spdK:0,atkInt:1e9,atkCd:1e9,slot:0,ph:0,skillCd:3,fall:0,dead:false,deadT:0,hurtT:0,lunge:-1,frozen:0};}
 function target(boss=false){G.mons=[dummy(boss)];G.train={start:G.time,t:10000,total:0,dmg:{}};return G.mons[0];}
 function tick(seconds){for(let t=0;t<seconds-1e-8;t+=.05)update(.05);}
 ${code}`,c);checks++;console.log('PASS',name);
}
run('shared cooldown math handles reduction, focus cost and the same 60% limit',`
 const keys=['HASTE','HASTE','HASTE','FOCUS'];board(['FIRE']);G.supp.FIRE=keys;G.st=calc(G.equip,[],['FIRE'],G.supp);
 assert.equal(G.st.sk.FIRE.cd,GridLab.cooldown(SKILLS.FIRE.cd,keys));assert.equal(G.st.sk.FIRE.cd,SKILLS.FIRE.cd*1.15*.4);
`);
run('all six sockets cast after reversing skill order on the same high-haste board',`
 function sample(reverse){G.time=0;G.proj=[];G.timers=[];G.h.x=HX;G.h.y=HY;board(reverse?Object.keys(SKILLS).slice(0,6).reverse():Object.keys(SKILLS).slice(0,6));G.equip.ring={slot:'ring',imp:{k:'crit',v:2},aff:[{k:'haste',v:60}]};

 recalc();const preview=G.st.dps;target();for(const id of G.slots)G.cds[id]=0;tick(60);return {preview,counts:Object.fromEntries(Object.entries(G.train.stats).map(([id,r])=>[id,r.casts]))};}
 const a=sample(false),b=sample(true);assert(Object.values(G.train.stats).some(r=>r.maxWait>.4));assert.equal(Object.keys(a.counts).length,6);assert(Object.values(a.counts).every(n=>n>0));assert.deepEqual(a.counts,b.counts);assert(Math.abs(a.preview-b.preview)<=a.preview*1e-9);
`);
run('every standard and mode preview matches direct single-target hits, excluding conditional reactions',`
 Math.random=()=>.5;for(const id of Object.keys(SKILLS))for(const mode of [null,...Object.keys(MODES).filter(m=>MODES[m].sk===id)]){
  G.proj=[];G.timers=[];board([id],{[id]:mode});target();const k=G.st.sk[id];k.hit=10;k.crit=0;
  castSkill(id);tick(4.2);const actual=Object.entries(G.train.damage||{}).filter(([label])=>label===SKILLS[id].n||label.startsWith(SKILLS[id].n+'·')&&!label.includes('·召喚')).reduce((n,[,d])=>n+d,0);
  assert(Math.abs(actual-10*skillDirectFactor(id,k.pattern))<1e-7,id+' '+mode+' '+actual);
 }
`);
run('mode and casting capacity affect preview, while conditional burst is excluded',`
 board(['METEOR']);const a=G.st.sk.METEOR.direct;G.board.pieces[0].mode='METEOR_COMET';recalc();assert(Math.abs(G.st.sk.METEOR.direct/a-2.2)<1e-8);
 board(Object.keys(SKILLS).slice(0,6));G.equip.ring={slot:'ring',imp:{k:'crit',v:2},aff:[{k:'haste',v:60}]};recalc();assert(G.st.queueDelay>0);assert(Object.values(G.st.sk).reduce((n,k)=>n+k.estimatedCasts,0)<=1/GridLab.LIMITS.castTime+1e-7);
`);
run('microscopic hits cannot freeze a boss and adaptation cannot be refreshed away',`
 const m=dummy(true);assert.equal(applyFreeze(m,1.4,.001),false);assert.equal(m.frozen,0);
 applyFreeze(m,1.4,m.hpMax*.1);assert(applyFreeze(m,1.4,m.hpMax*.1));const guard=m.freezeGuard;m.frozen=0;
 for(let i=0;i<100;i++)assert.equal(applyFreeze(m,2,m.hpMax),false);assert.equal(m.freezeGuard,guard);
 G.time=guard+.01;assert.equal(applyFreeze(m,1.4,m.hpMax),false);assert(applyFreeze(m,1.4,m.hpMax));
 const normal=dummy();assert(applyFreeze(normal));assert.equal(normal.frozen,1.4);
`);
run('high-haste storm leaves real boss action windows instead of permanent control',`
 board(['FROST'],{FROST:'FROST_STORM'});G.st.sk.FROST.hit=10000;G.st.sk.FROST.cd=1.68;const m=target(true);m.hp=m.hpMax=100000;G.cds.FROST=0;
 let controlled=0;for(let i=0;i<1200;i++){update(.05);if(m.frozen>0)controlled++;}assert(controlled/1200<.35);assert((G.train.combos?.freezes||0)>0);assert((m.skillsUsed||0)>0);
`);
run('only original unique infrared hits charge; forks and repeats cannot feed themselves',`
 board(['CHAIN','BEAM'],{BEAM:'BEAM_CAPACITOR'});const m=target(true);castSkill('CHAIN');assert.equal(G.signalCharge,2);
 castSkill('CHAIN',1,'repeat');applySkillHit('CHAIN',m,1,'proc');assert.equal(G.signalCharge,2);
 for(let i=0;i<8;i++)castSkill('CHAIN');assert.equal(G.signalCharge,8);const gain=G.train.combos.chargeGain;
 castSkill('BEAM');assert.equal(G.signalCharge,0);assert.equal(G.train.combos.chargeSpent,8);castSkill('BEAM',1,'repeat');assert.equal(G.signalCharge,0);assert.equal(G.train.combos.chargeGain,gain);
`);
run('single original cast has a bounded charge budget even across many forked targets',`
 board(['CHAIN','BEAM'],{CHAIN:'CHAIN_FORK',BEAM:'BEAM_CAPACITOR'});target();G.mons=Array.from({length:20},(_,i)=>({...dummy(),x:HX+i*.2}));castSkill('CHAIN');assert(G.signalCharge>0&&G.signalCharge<=4);
`);
run('cold-start reserves one frozen target and obeys its landing radius',`
 board(['METEOR'],{METEOR:'METEOR_COLDSTART'});const m=target();m.frozen=1.4;const far={...dummy(),x:HX+100};G.mons.push(far);
 castSkill('METEOR');assert.equal(m.frozen,0);assert.equal(G.train.combos.coldBursts,1);assert(G.proj[0].coldBoost);const p=G.proj[0];p.t=1;const hp=m.hp;resolveProj(p);assert(m.hp<hp);assert.equal(far.hp,far.hpMax);
 m.frozen=1.4;castSkill('METEOR',1,'repeat');assert.equal(m.frozen,1.4);assert.equal(G.train.combos.coldBursts,1);
`);
run('combo policy has a fallback when no generator is equipped',`
 board(['METEOR'],{METEOR:'METEOR_COLDSTART'});target();G.castPolicy='combo';G.cds.METEOR=0;tick(10);assert(G.train.stats.METEOR.casts>=1);
`);
run('training restores live charge and cooldowns on cancel and never grants rewards',`
 board(['CHAIN','BEAM'],{BEAM:'BEAM_CAPACITOR'});G.signalCharge=6;G.cds.CHAIN=2;const before={gold:G.gold,parts:G.parts,chips:G.chips};G.trainingPreset='single';G.train=null;trainStart();assert.equal(G.mons.length,1);assert.equal(G.signalCharge,0);tick(3);const testDummy=G.mons[0];testDummy.hp=1;hitMon(testDummy,100);assert(!testDummy.dead);trainEnd(true);assert.equal(G.signalCharge,6);assert.equal(G.cds.CHAIN,2);assert.deepEqual({gold:G.gold,parts:G.parts,chips:G.chips},before);assert.equal(G.trainLast,undefined);
`);
run('recipes unlock once, reject unknown IDs, preserve funds and all old save holdings',`
 G.chips=40;assert(buyCircuitMode('METEOR_COLDSTART'));assert.equal(G.chips,20);assert.equal(buyCircuitMode('METEOR_COLDSTART'),false);assert.equal(buyCircuitMode('bad'),false);assert.equal(G.chips,20);
 G.castPolicy='combo';const old=JSON.parse(JSON.stringify(serialize()));assert(applySave(old));assert.equal(G.castPolicy,'combo');assert.equal(G.carts.METEOR_COLDSTART,1);delete old.castPolicy;G.signalCharge=8;assert(applySave(old));assert.equal(G.castPolicy,'balanced');assert.equal(G.signalCharge,0);
`);
run('effective damage excludes overkill and preserves secondary source attribution',`
 target();const m=G.mons[0];m.hp=10;hitMon(m,100,false,'測試回放');assert.equal(G.train.damage['測試回放'],10);assert.equal(G.train.total,10);
`);
console.log(checks+' mechanics checks passed');
