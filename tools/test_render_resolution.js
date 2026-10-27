/* Real resolution policy: device defaults, explicit preferences, DPR and aspect. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={THREE:{},URLSearchParams,location:{search:''}};
vm.runInNewContext(fs.readFileSync('src/game/04-render.js','utf8')+'\nthis.bufferSize=r3BufferSize;this.quality=r3Quality;',ctx);
const size=(...args)=>JSON.parse(JSON.stringify(ctx.bufferSize(...args)));
assert.equal(ctx.quality('auto',390),'medium');assert.equal(ctx.quality('auto',1440),'high');
assert.equal(ctx.quality('low',1440),'low');assert.equal(ctx.quality('high',390),'high');
assert.deepEqual(size(1920,1080,1),{width:1000,height:562});
assert.deepEqual(size(1920,1080,3),size(1920,1080,1));
assert.deepEqual(size(390,260,3),{width:234,height:156});
assert.deepEqual(size(390,844,3),{width:234,height:506});
assert.deepEqual(size(3840,2160,2),{width:1000,height:562});
assert.deepEqual(size(390,260,3,true),{width:780,height:520});
for(const [w,h]of [[320,568],[768,1024],[898.40625,749.984375],[2560,1080],[844,390]])for(const q of ['low','medium','high']){
 const s=size(w,h,3,false,q),cap={low:420,medium:820,high:1000}[q];assert(s.width<=cap&&s.height<=cap);assert(s.width<=w&&s.height<=h);assert(Math.abs(s.width/s.height-w/h)<.02,`${w}x${h} ${q} aspect`);
}
for(const [w,h]of [[390,260],[1440,900]]){const low=size(w,h,3,false,'low'),medium=size(w,h,3,false,'medium'),high=size(w,h,3,false,'high');assert(low.width<medium.width&&medium.width<high.width);}
assert.deepEqual(size(0,NaN),{width:1,height:1});
console.log('PASS auto mobile/desktop defaults, low/medium/high overrides, DPR independence, resolution budgets and aspect safety');
