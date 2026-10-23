const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const noop=()=>{},ctx={console,Math,Date,URLSearchParams,TextDecoder,atob,btoa,location:{search:''},GridLab:require('../src/game/00-grid.js'),tPick:a=>a[0],tRand:(a,b)=>(a+b)/2,tClamp:(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),tFmt:String,SFX:noop,ease:x=>x};
ctx.document={createElement:tag=>tag==='img'?{}:{getContext:()=>new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop})}};vm.createContext(ctx);
for(const f of ['vendor/three.min.js','game/01-data.js','game/characters-data.js','game/02-state.js','game/03-combat.js','game/models.js','game/models-mon.js','game/models-weapon.js','game/04-render.js','game/characters-assets.js','game/equipment-assets.js','game/characters-equipment-masks.js','game/equipment-render.js','game/characters-render.js'])vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx);
ctx.assert=assert;
vm.runInContext(`
const expected=['idle','walk','run','attack','cast','hurt','dash','death','victory'];
for(const id of Object.keys(CHARS)){
 G.char=id;const hero=buildHero(0,0,0,0),u=hero.userData,geo=u.mesh.geometry;
 assert(u.y2k);assert.equal(u.skeleton.bones.length,16);assert.equal(geo.index.count/3<=14000,true);assert.equal(Object.keys(u.actions).sort().join(),expected.slice().sort().join());
 const weights=geo.attributes.skinWeight,joints=geo.attributes.skinIndex;
 for(let i=0;i<weights.count;i++){let sum=0;for(let j=0;j<4;j++){sum+=weights.array[i*4+j];assert(joints.array[i*4+j]<16);}assert(Math.abs(sum-1)<.0001);}
 for(const kind of expected){
  u.animation='';characterPlay(hero,kind,0);
  for(const fraction of [.05,.3,.6,.95]){
   u.mixer.setTime(u.actions[kind].getClip().duration*fraction);hero.updateMatrixWorld(true);u.skeleton.update();
   for(let i=0;i<geo.attributes.position.count;i+=11){const p=u.mesh.getVertexPosition(i,new T3.Vector3());assert([p.x,p.y,p.z].every(Number.isFinite));assert(p.length()<65,'skin escaped bounds: '+id+'/'+kind);}
  }
  u.mixer.stopAllAction();
 }
 characterAnimate(hero,.016,{speed:10});assert.equal(u.animation,'run');characterAnimate(hero,.016,{hurt:true,speed:10});assert.equal(u.animation,'hurt');characterAnimate(hero,.016,{dead:true,attack:true});assert.equal(u.animation,'death');characterDispose(hero);
 for(const weaponStyle of ['0','umbrella','bat','tube','saber'])for(const offhandStyle of ['0','disc','radio'])for(const accessoryStyle of ['0','pager','charm']){const variant=buildHero(0,0,0,0,{...G.cos,weaponStyle,offhandStyle,accessoryStyle});variant.updateMatrixWorld(true);const box=new T3.Box3().setFromObject(variant);assert(!box.isEmpty()&&Number.isFinite(box.max.y));characterDispose(variant);}
 const old=serialize();old.char=id;assert(applySave(old));assert.equal(G.char,id);
}
console.log('PASS all four original GLBs: 16-bone skins, normalized weights, bounded deformations, nine real clips, state priority and legacy-key save round trips');
G.char='street';recalc();G.time=5;G.h.buffer=0;G.h.bufferUntil=0;for(let i=0;i<100;i++)characterBasicHit({dead:false});assert(G.h.buffer<=G.st.life*.05001);G.time=8;characterBasicHit({dead:false});assert(G.h.buffer<=G.st.life*.00501);
G.char='frost';G.characterRuntime=null;G.time=10;for(let i=0;i<10;i++)characterBasicHit({dead:false});assert.equal(characterRuntime().combo,5);G.time=14;characterCombatTick(.1);assert.equal(characterRuntime().combo,0);
G.char='beep';G.characterRuntime=null;characterBasicHit({dead:true});assert(characterRuntime().receipt);G.h.characterCastUntil=0;y2kSignature([],G.st);assert(!characterRuntime().receipt);
G.char='volt';G.characterRuntime=null;G.train={};characterCombatTick(2);assert.equal(characterRuntime().battery,0);G.train=null;
G.offline=true;G.train=null;G.time=20;
function target(x,y){return {x,y,hp:100000,hpMax:100000,dead:false,fall:0,fight:true,boss:true,type:'slime'};}
for(const id of ['street','frost','beep']){G.char=id;recalc();G.characterRuntime=null;G.mons=Array.from({length:8},(_,i)=>target(G.h.x+5+i,G.h.y+2));const before=G.mons.map(m=>m.hp);y2kSignature(G.mons,G.st);const hits=G.mons.filter((m,i)=>m.hp<before[i]).length;assert.equal(hits,id==='street'?4:id==='frost'?8:6);}
G.char='volt';recalc();G.characterRuntime=null;G.mons=[target(G.h.x+5,G.h.y+3)];const beforePet=G.mons[0].hp;characterCombatTick(.1);assert(G.mons[0].hp<beforePet);const afterPet=G.mons[0].hp;characterCombatTick(.1);assert.equal(G.mons[0].hp,afterPet);G.offline=false;
console.log('PASS distinct live combat signatures: four-target chain, radial wave, six locks and rate-limited companion attacks');
assert(!JSON.stringify(serialize()).includes('characterRuntime'));assert(!JSON.stringify(serialize()).includes('CHARACTER_GLB'));
console.log('PASS bounded Aki shield, Milo combo timeout, Ping one-use receipt and no training pet rewards or runtime data in saves');
`,ctx);
const manifest=JSON.parse(fs.readFileSync('assets/characters/manifest.json'));for(const a of manifest.assets){const b=fs.readFileSync('assets/characters/'+a.id+'.glb');assert.equal(require('crypto').createHash('sha256').update(b).digest('hex'),a.sha256);assert(a.bytes<2200000);assert(a.triangles<=14000);}
console.log('PASS canonical GLB hashes and texture/triangle/file budgets');
