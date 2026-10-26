const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.GAME_LAB_FIX_URL||'http://localhost:8783/',mode=process.env.GAME_LAB_FIX_MODE||'fixed',out=process.env.GAME_LAB_FIX_OUTPUT||'docs/g1-fixes/fixed.json';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});const errors=[],failures=[];try{const p=await b.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>typeof R3!=='undefined'&&R3.hero);await p.evaluate(()=>{G.paused=true;G.mons=[];ui.render();});
const toggle=await p.evaluate(()=>{const result=[];const change=enabled=>{g1Storage.setItem('ih-street',enabled?'1':'0');TERRAIN_CACHE=null;R3.terrainKey=null;G.dirty=true;ui.render();};
 const state=()=>{const gear=[];R3.hero.traverse(o=>{if(o.isMesh&&o.material.userData?.g1Material)gear.push(o.material.userData.g1Material);});return{hero:R3.hero.userData.mesh.material.name,g1:g1On(),materials:[...new Set(gear)]};};
 change(false);result.push({step:'on-to-off',...state()});
 // Starting from a fresh original hero models opening a save with G1 disabled.
 g1RebuildHero();change(true);result.push({step:'off-to-on',...state()});change(false);result.push({step:'off-again',...state()});change(true);result.push({step:'restore',...state()});return result;});
for(const t of toggle){const expect=t.g1?'g1_summer_aki':'';if(t.hero!==expect)failures.push('toggle:'+t.step);if(!t.g1&&t.materials.length)failures.push('gear:'+t.step);}
const fades=[];for(const type of ['skel','drone','bomb','mole','spider','crab','ranger','lantern','speaker','wisp']){
 const r=await p.evaluate(type=>{G.mons=[];spawnRiftMonster({id:0},type,...terrainProject(HX+12,HY));const m=G.mons[0];m.born=G.time-1;m.ph=.3;ui.render();const g=R3.ent.get(m);m.hurtT=.1;monLook(m,g);m.hurtT=0;m.frozen=.5;monLook(m,g);m.frozen=0;
 const samples=[];for(const t of [.1,.3,.4]){m.dead=true;m.deadT=t;monLook(m,g);const faces=[];g.traverse(o=>{if(o.isMesh&&o.material.map&&o.material.isMeshBasicMaterial)faces.push(o.material.opacity);});samples.push({time:t,faces});}
 return{type,samples,flashListHasBasic:(g.userData.mats||[]).some(m=>m.isMeshBasicMaterial)};},type);fades.push(r);
 if(r.flashListHasBasic)failures.push('flash-list:'+type);
 for(const sample of r.samples){const u=Math.min(1,sample.time/.4),expected=type==='drone'?1-u*u:1-u;if(!sample.faces.length||sample.faces.some(x=>Math.abs(x-expected)>1e-8))failures.push('face-fade:'+type+':'+sample.time);}
}
const shared=await p.evaluate(()=>{G.mons=[];for(let i=0;i<2;i++){spawnRiftMonster({id:0},'slime',...terrainProject(HX+10+i*10,HY));G.mons.at(-1).born=G.time-1;}ui.render();const first=R3.ent.get(G.mons[0]),second=R3.ent.get(G.mons[1]);G.mons[0].dead=true;G.mons[0].deadT=.3;monLook(G.mons[0],first);const opacity=[];second.traverse(o=>{if(o.isMesh&&o.material.vertexColors)opacity.push(o.material.opacity);});return{m01:first.userData.m01&&second.userData.m01,aliveOpacity:opacity};});
if(!shared.m01||!shared.aliveOpacity.length||shared.aliveOpacity.some(x=>x!==1))failures.push('shared-m01-material');
assert.deepEqual(errors,[]);if(mode==='fixed')assert.deepEqual(failures,[]);else assert(failures.some(x=>x.startsWith('toggle:'))&&failures.some(x=>x.startsWith('face-fade:')));
fs.writeFileSync(out,JSON.stringify({source:await p.evaluate(()=>G1_SOURCE),mode,toggle,fades,shared,errors,failures,limits:['Local Chromium software WebGL; two targeted regression groups, not full device certification.']},null,2)+'\n');console.log(mode,failures.length?'expected failures '+failures.length:'PASS toggle, ten face types and shared M01');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
