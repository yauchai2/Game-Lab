/* 小型 GLB 讀取器（只接受建置時內嵌的怪物檔，不連網）：節點樹、頂點色網格與剛性分件動作。
   目前用於街區樣板的 M01 插頭跳豆；接進戰鬥時只換外觀，數值與行為不變。 */
const G1_MONSTER_CACHE=new Map();
function g1MonsterAsset(id,encoded){
 if(G1_MONSTER_CACHE.has(id))return G1_MONSTER_CACHE.get(id);
 const bin=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bin.buffer);
 if(view.getUint32(0,true)!==0x46546c67)throw new Error('Invalid monster GLB');
 const n=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bin.subarray(20,20+n))),start=28+n;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],w=widths[a.type];if(!C||!w||v.byteStride||a.sparse)throw new Error('Unsupported monster accessor');const off=start+(v.byteOffset||0)+(a.byteOffset||0);return new T3.BufferAttribute(new C(bin.buffer.slice(off,off+a.count*w*C.BYTES_PER_ELEMENT)),w,!!a.normalized);};
 const material=new T3.MeshBasicMaterial({vertexColors:true,side:T3.DoubleSide});material.userData.equipmentShared=true;
 const geos=doc.meshes.map(m=>m.primitives.map(p=>{const g=new T3.BufferGeometry();g.userData.equipmentShared=true;for(const [k,name] of [['POSITION','position'],['NORMAL','normal'],['COLOR_0','color']])if(p.attributes[k]!=null)g.setAttribute(name,access(p.attributes[k]));if(p.indices!=null)g.setIndex(access(p.indices));return g;}));
 const clips=doc.animations.map(a=>new T3.AnimationClip(a.name,-1,a.channels.map(ch=>{const s=a.samplers[ch.sampler],node=doc.nodes[ch.target.node],prop={rotation:'quaternion',translation:'position',scale:'scale'}[ch.target.path],C=prop==='quaternion'?T3.QuaternionKeyframeTrack:T3.VectorKeyframeTrack;return new C(node.name+'.'+prop,Array.from(access(s.input).array),Array.from(access(s.output).array),s.interpolation==='STEP'?T3.InterpolateDiscrete:undefined);})));
 const asset={doc,geos,material,clips};G1_MONSTER_CACHE.set(id,asset);return asset;
}
function g1MonsterBuild(id,encoded){
 const asset=g1MonsterAsset(id,encoded),doc=asset.doc;
 const nodes=doc.nodes.map(node=>{const g=new T3.Group();g.name=node.name;if(node.translation)g.position.fromArray(node.translation);if(node.rotation)g.quaternion.fromArray(node.rotation);if(node.scale)g.scale.fromArray(node.scale);
  if(node.mesh!=null)for(const geo of asset.geos[node.mesh])g.add(new T3.Mesh(geo,asset.material));return g;});
 doc.nodes.forEach((node,i)=>(node.children||[]).forEach(j=>nodes[i].add(nodes[j])));
 const root=new T3.Group();for(const i of doc.scenes[doc.scene||0].nodes)root.add(nodes[i]);
 const holder=new T3.Group();holder.add(root);
 const mixer=new T3.AnimationMixer(root),actions={};for(const c of asset.clips)actions[c.name]=mixer.clipAction(c);
 holder.userData={m01:true,mixer,actions,cur:null,last:null,s:18};addShadow(holder,1.3);
 return holder;
}
/* 依怪物狀態選動作：受擊 Hurt、移動 Hop、其餘 Idle。 */
function g1MonsterPlay(g,m){
 const u=g.userData,want=m.hurtT>0&&!m.dead?'Hurt':(!m.fight&&!m.dead?'Hop':'Idle'),dt=Math.min(.1,Math.max(0,G.time-(u.last??G.time)));u.last=G.time;
 if(u.cur!==want&&u.actions[want]){const a=u.actions[want],p=u.actions[u.cur];if(p)p.fadeOut(.12);a.reset().fadeIn(.12).play();u.cur=want;}
 u.mixer.update(dt);
}
