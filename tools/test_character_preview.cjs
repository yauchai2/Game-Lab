const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={console,Math};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/vendor/three.min.js','utf8'),ctx);
vm.runInContext('const T3=THREE;',ctx);
vm.runInContext(fs.readFileSync('src/game/characters-render.js','utf8'),ctx);
ctx.assert=assert;
vm.runInContext(`
// Real Three.js bones/mixer; no browser, save state or replacement GLB required.
function fixture(id){
 const g=new T3.Group(),B={};
 for(const name of ['hips','torso','head','hairBack','armL','foreL','handL','armR','foreR','handR','legL','shinL','footL','legR','shinR','footR']){const b=B[name]=new T3.Bone();b.name=name;g.add(b);}
 const mixer=new T3.AnimationMixer(g),actions={};
 for(const name of ['idle','run','walk','attack','cast','hurt','death','dash']){
  // Constant nonzero local transforms expose accidental accumulation/erasure.
  const tracks=Object.keys(B).map(n=>new T3.QuaternionKeyframeTrack(n+'.quaternion',[0,1],[.02,0,0,Math.sqrt(1-.02*.02),.02,0,0,Math.sqrt(1-.02*.02)]));
  actions[name]=mixer.clipAction(new T3.AnimationClip(name,1,tracks));
 }
 g.userData={y2k:true,id,B,mixer,actions,animation:'',skeleton:new T3.Skeleton(Object.values(B)),pet:id==='null'?new T3.Group():null};
 characterPlay(g,'idle',0);characterAnimate(g,0);return g;
}
function snapshot(g){return Object.values(g.userData.B).flatMap(b=>b.quaternion.toArray());}
function close(a,b){assert.equal(a.length,b.length);a.forEach((v,i)=>assert(Math.abs(v-b[i])<1e-6));}
const signatures=[];
for(const id of ['aki','milo','ping','null']){
 const hero=fixture(id),u=hero.userData,base=snapshot(hero),feet=u.B.footL.quaternion.clone();
 let moved=false;
 for(let i=0;i<150;i++){characterPreviewAnimate(hero,1/25);if(snapshot(hero).some((v,j)=>Math.abs(v-base[j])>.001))moved=true;}
 signatures.push(snapshot(hero).map(v=>v.toFixed(5)).join(','));
 assert(moved,id+' must animate');
 close(u.B.footL.quaternion.toArray(),feet.toArray());
 assert.equal(hero.rotation.y,0,'preview cannot rotate the whole model');
 for(let i=0;i<7500;i++){
  characterPreviewAnimate(hero,.04);
  for(const b of Object.values(u.B)){assert(b.quaternion.toArray().every(Number.isFinite));assert(Math.abs(b.quaternion.length()-1)<1e-5);assert(b.quaternion.angleTo(new T3.Quaternion())<1,'bounded gesture, no accumulating rotations');}
 }
 characterAnimate(hero,0,{speed:10});assert.equal(u.animation,'run');
 // Finish crossfade before checking that the preview offset has been removed.
 characterAnimate(hero,.1,{speed:10});close(snapshot(hero),base);
 characterPreviewAnimate(hero,.04,true);const reduced=snapshot(hero),time=u.previewTime,pet=u.pet?.position.clone();
 for(let i=0;i<50;i++)characterPreviewAnimate(hero,.04,true);
 close(snapshot(hero),reduced);assert.equal(u.previewTime,time);if(pet)assert(u.pet.position.equals(pet));
 characterPreviewAnimate(hero,NaN);characterPreviewAnimate(hero,Infinity);assert(Number.isFinite(u.previewTime));
 characterDispose(hero);
 const a=fixture(id),b=fixture(id);
 for(let i=0;i<100;i++)characterPreviewAnimate(a,.04);
 for(let i=0;i<200;i++)characterPreviewAnimate(b,.02);
 close(snapshot(a),snapshot(b));characterDispose(a);characterDispose(b);
}
assert.equal(new Set(signatures).size,4,'each character has a distinct pose sequence');
console.log('PASS four distinct gestures, five-minute bounds, planted feet, combat reset, reduced motion, finite clocks and frame-rate independence');
`,ctx);
