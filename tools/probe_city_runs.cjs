/* Source simulation: fixed equipment budget, real movement/AI, no kill or reward shortcuts. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const rows=[];const out=process.argv[2]||'/tmp/game-lab-city-simulation.json';
for(const char of ['street','frost','beep','volt'])for(const build of ['cold','signal'])for(const route of ['signal','memory','power'])for(const seed0 of [11,29,83]){
 let seed=seed0;const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const c={Math:math,Date,console,GridLab:require('../src/game/00-grid.js'),tPick:a=>a[Math.floor(math.random()*a.length)],tRand:(a,b)=>a+math.random()*(b-a),tClamp:(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),tFmt:String,SFX:()=>{}};vm.createContext(c);for(const f of ['01-data.js','02-state.js','03-combat.js'])vm.runInContext(fs.readFileSync(__dirname+'/../src/game/'+f,'utf8'),c);
 c.scenario={char,build,route};vm.runInContext(`
 G.offline=true;G.lvl=50;G.maxDepth=12;G.city=newCity();G.city.policy='safe';if(!CHARS[scenario.char])throw Error('unknown character');G.char=scenario.char;G.autoEquip=false;G.ach=Object.fromEntries(Object.keys(ACHS).map(id=>[id,1]));
 // Same plain, attainable stat budget for every run, independent of loot RNG.
 G.equip={weapon:{slot:'weapon',r:2,il:30,name:'測試武器',imp:{k:'dmg',v:49},aff:[{k:'inc',v:35},{k:'crit',v:8},{k:'haste',v:12}]},armor:{slot:'armor',r:2,il:30,name:'測試外套',imp:{k:'armor',v:95},aff:[{k:'life',v:120},{k:'armor',v:80},{k:'regen',v:8}]},ring:{slot:'ring',r:2,il:30,name:'測試配件',imp:{k:'crit',v:2},aff:[{k:'cm',v:30},{k:'life',v:80},{k:'regen',v:5}]}};
 G.pass=[...Array.from({length:8},(_,i)=>'A'+i),'AK',...Array.from({length:8},(_,i)=>'B'+i),'BK',...Array.from({length:8},(_,i)=>'C'+i),...Array.from({length:8},(_,i)=>'D'+i)].slice(0,36);
 if(scenario.build==='cold')G.pass=[...Array.from({length:8},(_,i)=>'A'+i),'AK',...Array.from({length:8},(_,i)=>'C'+i),'CK',...Array.from({length:8},(_,i)=>'D'+i),...Array.from({length:8},(_,i)=>'B'+i)].slice(0,36);
 G.board=GridLab.createBoard(6,6);const skills=scenario.build==='cold'?['FROST','METEOR','MAGNET']:['CHAIN','BEAM','FROST'];for(const id of skills){const s=GridLab.findSpot(G.board,'active',id),p=GridLab.place(G.board,'active',id,s.x,s.y,s.rot);if(id==='METEOR')p.mode='METEOR_COLDSTART';if(id==='BEAM')p.mode='BEAM_CAPACITOR';}
 for(const id of ['FOCUS','HASTE','HEAVY','RECOVER']){const p=G.board.pieces.find(p=>p.kind==='active'&&p.key===(scenario.build==='cold'?'METEOR':'BEAM')),s=GridLab.findSpot(G.board,'support',id,p.id);if(s)GridLab.place(G.board,'support',id,s.x,s.y,s.rot);}
 G.gems={FOCUS:1,HASTE:1,HEAVY:1,RECOVER:1};G.carts={METEOR_COLDSTART:1,BEAM_CAPACITOR:1};if(!connectedTalents(G.pass))throw Error('disconnected sample');G.castPolicy='combo';recalc();const before=JSON.stringify(G.pass);cityStart(scenario.route,1);let elapsed=0;while(G.run&&elapsed<240){update(.1);elapsed+=.1;}this.result={elapsed:+elapsed.toFixed(1),success:G.city.seals[1]?.[scenario.route]===1,deaths:G.deaths,fragments:G.city.fragments[scenario.route],stalled:!!G.run,passUnchanged:JSON.stringify(G.pass)===before,firmware:firmwareCount(G.pass),points:G.pass.length};`,c);
 rows.push({...c.scenario,seed:seed0,...c.result});
}
assert(rows.every(r=>!r.stalled&&r.passUnchanged&&r.firmware<=2&&r.points<=36));
const grouped={};for(const r of rows){const k=r.build+':'+r.route;grouped[k]||={runs:0,wins:0,totalSeconds:0};grouped[k].runs++;grouped[k].wins+=+r.success;grouped[k].totalSeconds+=r.elapsed;}
fs.writeFileSync(out,JSON.stringify({note:'Three fixed seeds, real source simulation, shared level-50 rare equipment and 36-point budget. Feasibility sample, not class balance or retention proof.',grouped,rows},null,2));console.log(JSON.stringify(grouped,null,2));console.log('PASS '+rows.length+' real-AI runs settle without stuck state, point changes or repeated expeditions');
