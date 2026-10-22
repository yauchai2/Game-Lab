/* Drawing-buffer policy: DPR independence, aspect safety and large/tiny viewports. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={THREE:{},URLSearchParams,location:{search:''}};
vm.runInNewContext(fs.readFileSync('src/game/04-render.js','utf8')+'\nthis.bufferSize=r3BufferSize;',ctx);
const size=(...args)=>JSON.parse(JSON.stringify(ctx.bufferSize(...args)));
assert.deepEqual(size(1920,1080,1),{width:640,height:360});
assert.deepEqual(size(1920,1080,3),size(1920,1080,1));
assert.deepEqual(size(390,260,3),{width:195,height:130});
assert.deepEqual(size(390,844,3),{width:195,height:422});
assert.deepEqual(size(3840,2160,2),{width:640,height:360});
assert.deepEqual(size(390,260,3,true),{width:780,height:520});
for(const [w,h]of [[320,568],[768,1024],[898.40625,749.984375],[2560,1080],[844,390]]){
 const s=size(w,h,3);assert(s.width<=640&&s.height<=640);
 assert(s.width<=w/2&&s.height<=h/2);
 assert(Math.abs(s.width/s.height-w/h)<.02,`${w}x${h} aspect`);
}
assert.deepEqual(size(0,NaN),{width:1,height:1});
console.log('PASS buffer policy: mobile, tablet, desktop, 4K, ultrawide, portrait, DPR and clean comparison');
