const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const mask=JSON.parse(fs.readFileSync('assets/characters/equipment-masks.json')).aki_headphones,b=fs.readFileSync('assets/characters/aki.glb');
assert.equal(crypto.createHash('sha256').update(b).digest('hex'),mask.source_sha256);
assert(mask.remove.length>100&&mask.remove.length<4000);assert.equal(new Set(mask.remove).size,mask.remove.length);assert(mask.remove.every(n=>Number.isInteger(n)&&n>=0&&n<mask.triangles));
const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),start=28+b.readUInt32LE(12),p=g.meshes[0].primitives[0];
function array(i,C,w){const a=g.accessors[i],v=g.bufferViews[a.bufferView];return new C(b.buffer,b.byteOffset+start+(v.byteOffset||0)+(a.byteOffset||0),a.count*w);}
const pos=array(p.attributes.POSITION,Float32Array,3),indices=array(p.indices,g.accessors[p.indices].componentType===5123?Uint16Array:Uint32Array,1);
assert.equal(pos.length/3,mask.vertices);assert.equal(indices.length/3,mask.triangles);
for(const t of mask.remove){const c=[0,0,0];for(let j=0;j<3;j++)for(let k=0;k<3;k++)c[k]+=pos[indices[t*3+j]*3+k]/3;assert(c[1]>18.5,'mask reaches torso');assert(!(Math.abs(c[0])<4&&c[1]<24&&c[2]>1.5),'mask cuts central face');}
const ctx={};vm.runInNewContext(fs.readFileSync('src/game/characters-equipment-masks.js','utf8')+';this.mask=CHARACTER_EQUIPMENT_MASKS;',ctx);assert.deepEqual(JSON.parse(JSON.stringify(ctx.mask.aki_headphones)),mask);
console.log('PASS source-bound headset mask, unchanged source GLB, unique valid triangle roster, central face protection and generated data parity');
