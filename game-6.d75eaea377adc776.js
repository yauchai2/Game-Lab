/* Geometry-only roles for shared base GLBs. Combat/type keys remain unchanged.
   These are rigid hardware modules, not extra independent GLB creatures. */
const STREET_VARIANT_ROLES={mole:'drill',spider:'outriggers',roller:'cart',cable:'cables',skel:'carrier',wisp:'signal-tail',bomb:'fuse',crab:'claws',antenna:'aerial',furnace:'chimney',jailer:'barrier',scanner:'wings'};
function streetCreatureVariant(m,height){
 if(m.boss||m.towerBoss||!STREET_VARIANT_ROLES[m.type])return null;
 const key=m.type,H=height;
 const geometry=geo('street-role-'+key,()=>{
  const parts=[],V=T3.Vector3,colors={dark:'#2C414B',metal:'#B7C3C5',signal:'#6AB3BC',warm:'#D7A253'};
  const add=(geometry,color,x,y,z,rotation)=>{const mesh=new T3.Mesh(geometry);mesh.position.set(x*H,y*H,z*H);if(rotation)mesh.rotation.set(...rotation);parts.push([mesh,new T3.Color(colors[color])]);return mesh;};
  const box=(w,h,d,color,x,y,z,rot)=>add(new T3.BoxGeometry(w*H,h*H,d*H),color,x,y,z,rot);
  const cyl=(r,h,color,x,y,z,rot)=>add(new T3.CylinderGeometry(r*H,r*H,h*H,8),color,x,y,z,rot);
  if(key==='mole'){add(new T3.ConeGeometry(.19*H,.42*H,6),'metal',0,.5,.65,[Math.PI/2,0,0]);box(.45,.10,.16,'warm',0,.58,.5);}
  if(key==='spider')for(const side of[-1,1])for(const z of[-.22,.22]){box(.35,.09,.09,'dark',side*.68,.28,z,[0,0,side*.35]);box(.09,.28,.1,'metal',side*.83,.15,z);}
  if(key==='roller'){for(const side of[-1,1])for(const z of[-.25,.25])cyl(.20,.15,'dark',side*.54,.2,z,[0,0,Math.PI/2]);for(const side of[-1,1])box(.06,.55,.06,'metal',side*.4,.67,-.35);box(.86,.07,.07,'warm',0,.95,-.35);}
  if(key==='cable'){for(let i=0;i<5;i++){const x=(i-2)*.16,z=.15+Math.abs(i-2)*.05;box(.045,.42+(i%2)*.12,.045,'dark',x,.28,z,[0,0,(i-2)*.13]);box(.09,.10,.08,'metal',x*1.2,.06+(i%2)*.05,z);}}
  if(key==='skel'){box(.72,.48,.34,'metal',0,.5,-.23);box(.14,.51,.37,'warm',.13,.5,-.23);for(const side of[-1,1])box(.14,.46,.18,'dark',side*.42,.62,.15);}
  if(key==='wisp'){for(const side of[-1,1])box(.10,.08,.55,'signal',side*.38,.58,-.25,[0,side*.35,0]);box(.055,.43,.055,'metal',0,.85,-.10);box(.13,.1,.08,'warm',0,1.08,-.1);}
  if(key==='bomb'){cyl(.055,.3,'dark',0,1.05,0);add(new T3.OctahedronGeometry(.09*H,0),'warm',0,1.25,0);box(.4,.13,.19,'warm',0,.45,.29);}
  if(key==='crab')for(const side of[-1,1]){box(.32,.15,.15,'dark',side*.43,.35,.23,[0,side*-.5,0]);for(const z of[.35,.50])box(.26,.15,.07,'metal',side*.63,.35,z,[0,side*.2,0]);}
  if(key==='antenna'){box(.07,.5,.07,'metal',0,1.08,0);for(const y of[1.05,1.25]){box(.66,.055,.055,'signal',0,y,0);for(const x of[-.3,.3])box(.05,.16,.05,'warm',x,y,0);}}
  if(key==='furnace'){for(const x of[-.22,.22])cyl(.09,.44,'dark',x,1.03,-.12);box(.48,.3,.15,'dark',0,.47,.4);for(const x of[-.16,0,.16])box(.045,.17,.03,'warm',x,.47,.49);}
  if(key==='jailer'){for(const x of[-.28,0,.28])box(.045,.76,.06,'metal',x,.53,.48);for(const y of[.18,.9])box(.72,.07,.07,'dark',0,y,.48);box(.14,.15,.08,'warm',.24,.52,.55);}
  if(key==='scanner')for(const side of[-1,1]){box(.48,.08,.24,'metal',side*.43,.65,0,[0,0,side*.18]);box(.09,.28,.16,'dark',side*.63,.57,0);}
  const positions=[],palette=[];
  for(const [mesh,color]of parts){mesh.updateMatrix();const source=mesh.geometry,buffer=(source.index?source.toNonIndexed():source.clone()).applyMatrix4(mesh.matrix);positions.push(...buffer.attributes.position.array);for(let i=0;i<buffer.attributes.position.count;i++)palette.push(color.r,color.g,color.b);buffer.dispose();source.dispose();}
  const out=new T3.BufferGeometry();out.setAttribute('position',new T3.Float32BufferAttribute(positions,3));out.setAttribute('color',new T3.Float32BufferAttribute(palette,3));out.computeBoundingBox();return out;
 });
 const material=R3.cache.streetRoleMaterial||(R3.cache.streetRoleMaterial=new T3.MeshBasicMaterial({vertexColors:true}));material.userData.streetFlat=true;
 const mesh=new T3.Mesh(geometry,material);mesh.name='role_'+key;mesh.userData.streetVariant=STREET_VARIANT_ROLES[key];return mesh;
}

;
/* Shared visual catalog; only presentation changes. Stable type keys still own AI/collision/rewards. */
const STREET_CREATURES={
 slime:['M01',10],skel:['M05',13],drone:['M03',10,5],bomb:['M07',11],brute:['M06',17],
 mole:['M02',7],spider:['M02',7],crab:['M07',11],ranger:['M05',13],lantern:['M08',12,4],
 speaker:['M04',14.5],wisp:['M03',10,6],golem:['B01',20],scanner:['B03',14],roller:['M02',9],
 antenna:['M08',14,2],cable:['M02',8],furnace:['B01',20],shard:['B04',13,2],
 jailer:['B01',21],specimen:['B02',22],sentinel:['B03',23]
};
function streetCreatureBuild(m){
 if(!g1On()||typeof STREET_MONSTER_GLB==='undefined')return null;
 let spec=STREET_CREATURES[m.type];
 if(m.towerBoss)spec=[{warden:'B01',chimera:'B02',executor:'B03'}[m.towerBoss]||'B04',27];
 else if(m.boss)spec=[['B01','B02','B03','B04'][((m.bossForm??biomeNow())%4+4)%4],27];
 if(m.boss&&!m.towerBoss&&Number.isInteger(m.chap)&&m.chap>=0&&m.chap<6)spec=[['M04','B01','B03','M04','B02','B04'][m.chap],27];
 if(!spec)return null;
 const [id,height,hover=0]=spec,g=g1MonsterBuild(id,STREET_MONSTER_GLB[id]),u=g.userData;
 u.streetCreature=true;u.assetId=id;u.hover=hover;u.m01=false;
 u.s=height/(STREET_MONSTER_META[id].height*CK*(MONSTER_TRAITS[m.type]?.scale||1));
 u.actions.Move=u.actions.Move||u.actions.Hop;
 const variant=streetCreatureVariant(m,STREET_MONSTER_META[id].height);if(variant){g.add(variant);u.variant=variant.userData.streetVariant;}
 // Shared geometry, per-instance material ownership: death never changes another actor.
 if(Number.isInteger(m.chap)){const mark=streetChapterMark(m.chap),k=STREET_MONSTER_META[id].height/70;mark.scale.setScalar(k);mark.position.y=STREET_MONSTER_META[id].height-34*k;g.add(mark);}
 const materials=new Map();g.traverse(o=>{if(o.isMesh&&(o.material.vertexColors||o.material.userData.streetFlat)){const src=o.material;if(!materials.has(src)){const mat=src.clone();mat.userData.equipmentShared=false;materials.set(src,mat);}o.material=materials.get(src);}});
 u.mats=[...materials.values()];return g;
}
function streetCreatureLook(m,g,base,pop,lg){
 const u=g.userData,visual=base*(m.elite?1.3:1);g.scale.setScalar(visual*Math.max(.2,pop));
 if(m.elite&&!u.eliteRing){u.eliteRing=new T3.Mesh(new T3.RingGeometry(.5,.66,16).rotateX(-Math.PI/2),new T3.MeshBasicMaterial({color:0xFFD35A,side:T3.DoubleSide}));u.eliteRing.position.y=.045;g.add(u.eliteRing);}
 if(u.eliteRing)u.eliteRing.visible=!m.dead;
 g.position.y+=(u.hover?u.hover+Math.sin(G.time*3+m.ph)*.4:0);
 // Collision movement and lunges remain owned by monLook; only add a small visual lean.
 g.rotation.x=m.warning?-.08:lg*.18;
 if(m.dead){const k=Math.min(1,m.deadT/.4);g.scale.setScalar(visual*(1-k*.25));g.rotation.x=-k*.7;for(const mat of u.mats){mat.transparent=true;mat.opacity=1-k;}if(u.sh)u.sh.visible=false;u.mixer.stopAllAction();return;}
 const tint=m.frozen>0?'#A7DEFF':m.burn>0?'#FFC291':m.shock>0?'#FFF1A8':'#FFFFFF';for(const material of u.mats)material.color.set(tint);
 const key=m.hurtT>0?'Hurt':m.warning||m.fight?'Idle':'Move';const action=u.actions[key]||u.actions.Idle;
 if(u.cur!==key&&action){u.actions[u.cur]?.fadeOut(.1);action.reset().fadeIn(.1).play();u.cur=key;}
 const dt=Math.min(.1,Math.max(0,G.time-(u.last??G.time)));u.last=G.time;u.mixer.update(dt);
}
function streetCreatureMode(){
 const mode=g1On();document.body.classList.toggle('street-style',mode);if(R3.streetCreatureMode===mode)return;R3.streetCreatureMode=mode;if(typeof ICON3D!=='undefined')ICON3D.cache={};
 const active=new Set(G.mons);for(const [m,g]of R3.ent)if(active.has(m)){R3.world.remove(g);disposeWorldObject(g);R3.ent.delete(m);}
}

function streetChapterMark(chap){const ex=new T3.Group(),dark=m3('#394d61'),silver=m3('#bdc8cf'),signal=m3('#63b5c7');
 if(chap!==null){   // 主線首領：在身體上加一個一眼認得出的標記
  const hot=m3('#ff9a6e'),warm=m3('#ffd36a'),pale=m3('#e8eef2');
  if(chap===0){const h=mk(new T3.ConeGeometry(7,16,8,1,true),warm,0,40,0,ex);h.rotation.z=Math.PI/2;mk(new T3.CylinderGeometry(2,2,6,8),dark,-8,40,0,ex).rotation.z=Math.PI/2;}
  if(chap===1){for(const y of [34,40,46])mk(new T3.TorusGeometry(8-(y-34)/4,.9,4,14),signal,0,y,0,ex).rotation.x=Math.PI/2;}
  if(chap===2){mk(roundedG(26,12,2),pale,0,42,-2,ex);mk(roundedG(22,8,1),hot,0,42,-.5,ex);for(const x of [-9,0,9])mk(new T3.SphereGeometry(1.3,6,5),warm,x,42,.4,ex);}
  if(chap===3){for(const x of [-14,0,14]){mk(new T3.CylinderGeometry(3,5,7,8),dark,x,38,0,ex);mk(new T3.CircleGeometry(2.6,10),warm,x,38,5.2,ex);}}
  if(chap===4){for(const x of [-9,9]){const r=mk(new T3.TorusGeometry(6,1.6,5,12),pale,x,38,0,ex);r.rotation.y=Math.PI/2;mk(new T3.CylinderGeometry(1,1,3,6),hot,x,38,0,ex).rotation.z=Math.PI/2;}}
  if(chap===5){for(let i=0;i<5;i++){const a=(i-2)*.5;mk(new T3.ConeGeometry(1.6,18,5),i%2?hot:signal,Math.sin(a)*8,44+Math.cos(a)*4,0,ex).rotation.z=-a;}mk(new T3.IcosahedronGeometry(3.2,0),warm,0,38,0,ex);}
 }
 return bake(ex);}
/* Fast transformed mesh bounds, not legacy type heights. Include chapter marks,
   hover, elite scale and pose offsets; exclude the floor shadow / elite ring. */
function streetCreatureBarAnchor(m){
 const g=R3.ent.get(m);if(!g?.userData.streetCreature)return null;
 const cache=streetCreatureBarAnchor.cache||(streetCreatureBarAnchor.cache={box:new T3.Box3(),position:new T3.Vector3()});
 g.updateWorldMatrix(true,true);let top=-Infinity;
 g.traverse(o=>{if(!o.isMesh||!o.visible||o===g.userData.sh||o===g.userData.eliteRing)return;const geo=o.geometry;if(!geo.boundingBox)geo.computeBoundingBox();cache.box.copy(geo.boundingBox).applyMatrix4(o.matrixWorld);top=Math.max(top,cache.box.max.y);});
 g.getWorldPosition(cache.position);const x=cache.position.x,y=cache.position.z;
 return Number.isFinite(top)?{x,y,z:top+1.4-terrainHeight(x,y)}:null;
}

;
/* Static reader for build-time normalized user meshes. No runtime network requests. */
const EQUIPMENT_RENDER={cache:new Map()};
function equipmentModel(id){
 const authored=typeof EQUIPMENT_COMPLETION_GLB!=='undefined'&&EQUIPMENT_COMPLETION_GLB[id];
 if(!authored&&(typeof EQUIPMENT_GLB==='undefined'||!EQUIPMENT_GLB[id]))return typeof equipmentProxyModel==='function'?equipmentProxyModel(id):null;
 const ck=id+(typeof g1On==='function'&&g1On()?'+g1':'');if(EQUIPMENT_RENDER.cache.has(ck))return EQUIPMENT_RENDER.cache.get(ck).clone(true);
 const flat=!!authored||(typeof STREET_EQUIPMENT_GLB!=='undefined'&&g1On());
 const bin=Uint8Array.from(atob(authored||(flat?STREET_EQUIPMENT_GLB[id]:EQUIPMENT_GLB[id])),c=>c.charCodeAt(0)),view=new DataView(bin.buffer),n=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bin.subarray(20,20+n))),start=28+n;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],w=widths[a.type];if(!C||!w||v.byteStride||a.sparse)throw Error('Unsupported equipment accessor');const off=start+(v.byteOffset||0)+(a.byteOffset||0);return new T3.BufferAttribute(new C(bin.buffer.slice(off,off+a.count*w*C.BYTES_PER_ELEMENT)),w,!!a.normalized);};
 const materials=(doc.materials||[]).map(m=>{
  const p=m.pbrMetallicRoughness||{},c=p.baseColorFactor||[1,1,1,1],mat=flat?new T3.MeshBasicMaterial({vertexColors:true,side:T3.DoubleSide}):new T3.MeshLambertMaterial({color:new T3.Color().fromArray(c),side:T3.DoubleSide});
  if(flat)mat.userData.streetFlat=true;
  mat.userData.equipmentShared=true;
  if(p.baseColorTexture){const image=doc.images[doc.textures[p.baseColorTexture.index].source],v=doc.bufferViews[image.bufferView],bytes=bin.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));const tex=new T3.Texture();tex.colorSpace=T3.SRGBColorSpace;tex.flipY=false;mat.map=tex;const img=document.createElement('img');img.onload=()=>{tex.image=img;tex.needsUpdate=true;};img.onerror=()=>{mat.map=null;mat.needsUpdate=true;};img.src='data:'+image.mimeType+';base64,'+btoa(s);}
  return mat;
 });
 const nodes=doc.nodes.map(node=>{const g=new T3.Group();g.name=id;if(node.matrix)new T3.Matrix4().fromArray(node.matrix).decompose(g.position,g.quaternion,g.scale);else{if(node.translation)g.position.fromArray(node.translation);if(node.rotation)g.quaternion.fromArray(node.rotation);if(node.scale)g.scale.fromArray(node.scale);}
  if(node.mesh!=null)for(const p of doc.meshes[node.mesh].primitives){const geo=new T3.BufferGeometry();geo.userData.equipmentShared=true;for(const [key,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['COLOR_0','color']])if(p.attributes[key]!=null)geo.setAttribute(name,access(p.attributes[key]));if(p.indices!=null)geo.setIndex(access(p.indices));if(!flat&&!geo.attributes.normal)geo.computeVertexNormals();g.add(new T3.Mesh(geo,g1EquipMaterial(id,materials[p.material]||m3('#bbc8d2'))));}return g;});
 doc.nodes.forEach((node,i)=>(node.children||[]).forEach(j=>nodes[i].add(nodes[j])));const root=new T3.Group();for(const i of doc.scenes[doc.scene||0].nodes)root.add(nodes[i]);if(id==='aki_baton')root.rotation.x=-Math.PI/2;root.userData.equipmentModel=id;EQUIPMENT_RENDER.cache.set(ck,root);return root.clone(true);
}
// Socket dimensions use the existing character rig's units; assets are centered with max span 1.
const EQUIPMENT_SOCKETS={
 aki_headphones:['head',15,0,1.3,-.3],aki_baton:['handR',10,0,0,.4],aki_chain:['hips',5.8,3.3,-1.1,2.4],aki_charm:['hips',1.6,5,-2.5,2.7],
 milo_headphones:['head',12.8,0,4.2,-.6],milo_md:['hips',3.3,-3.3,1.5,3.1],milo_disc:['hips',3.5,4.3,.1,1.2],milo_belt:['hips',3.5,1.8,-2.3,3],milo_md_strap:['torso',10,0,-.5,1.2],
 ping_clip:['head',2.8,-4.0,4.2,3.0],ping_comm:['head',3.2,-5.3,1.4,.3],ping_bag:['hips',5.2,-5.4,-1.2,1.8],ping_launcher:['foreR',5.4,0,-1.5,.6],ping_phone:['handL',2.5,0,0,.6],ping_bag_strap:['torso',11,0,-.5,1.2],
 null_goggles:['head',10.5,0,5.5,-.2],null_controller:['handR',2.8,0,.2,.8],null_box:['hips',3.2,-4.5,.5,.8],null_pet:['pet',4,8,13,-2],null_lanyard:['torso',6,0,3,3]
};
// Object-local contact points, measured in normalized source coordinates. The
// wrapper moves that contact to a bone socket; cached source meshes stay untouched.
const EQUIPMENT_FITS={
 ping_clip:{rotation:[0,0,-.3]},
 aki_headphones:{scale:[1,.9,1]},
 aki_baton:{pivot:[0,-.38,0]},
 aki_chain:{rotation:[0,.4,0]},aki_charm:{rotation:[0,.2,0]},
 milo_md:{rotation:[0,-.25,0]},milo_disc:{rotation:[0,.6,0]},
 ping_bag:{rotation:[0,-.65,0]},ping_comm:{rotation:[0,-.35,-.1]},
 ping_launcher:{rotation:[Math.PI/2,0,0]},ping_phone:{pivot:[0,-.28,0],rotation:[-.4,0,-.12]},
 null_controller:{pivot:[0,-.25,0],rotation:[-.3,0,.1]},null_box:{rotation:[0,-.8,0]}
};
function attachSignatureGear(g,it){
 const spec=signatureOf(it);if(!spec||!canUseGear(it))return false;
 const model=equipmentModel(spec.model),socket=EQUIPMENT_SOCKETS[spec.model];if(!model||!socket)return false;
 const [bone,size,x,y,z]=socket,fit=EQUIPMENT_FITS[spec.model]||{},mount=new T3.Group();
 mount.name='equipment_socket_'+spec.model;mount.position.set(x,y,z);
 if(fit.rotation)mount.rotation.fromArray(fit.rotation);
 model.scale.setScalar(size);if(fit.scale)model.scale.multiply(new T3.Vector3().fromArray(fit.scale));
 if(fit.pivot)model.position.fromArray(fit.pivot).multiplyScalar(-size);
 mount.add(model);(bone==='pet'?g:g.userData.B[bone]).add(mount);
 (g.userData.equipment||=[]).push({id:spec.model,mount,bone,rest:mount.rotation.clone()});
 if(spec.model==='milo_disc'){
  const other=mount.clone(true);other.position.x=-x;other.rotation.y=-mount.rotation.y;
  g.userData.B[bone].add(other);g.userData.equipment.push({id:spec.model,mount:other,bone,rest:other.rotation.clone()});
 }
 if(bone==='pet')g.userData.pet=mount;
 return true;
}
function animateEquipment(g,state={}){
 const u=g.userData,B=u.B,t=u.mixer.time,holding=new Set((u.equipment||[]).map(e=>e.id));
 // The mixer restores authored bone tracks before these small local grip offsets.
 if(holding.has('ping_phone'))B.handL.rotation.x-=.18;
 if(holding.has('null_controller'))B.handR.rotation.x-=.2;
 const gentle=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const e of u.equipment||[]){
  e.mount.rotation.copy(e.rest);
  if(!gentle&&!state.dead&&['aki_chain','aki_charm','milo_belt'].includes(e.id))e.mount.rotation.z+=Math.sin(t*(state.speed>1?6:2))*(state.speed>1?.035:.012);
 }
 if(u.pet){const active=!state.dead&&!gentle;u.pet.position.set(9+(active?Math.sin(t*1.7)*.4:0),13+(active?Math.sin(t*3)*.5:0),-3);u.pet.rotation.y=active?Math.sin(t)*.15:0;}
}

function characterEquipmentGeometry(asset,id){
 if(id!=='aki'||typeof CHARACTER_EQUIPMENT_MASKS==='undefined')return asset.geometry;
 const gear=G.equip.head,mask=CHARACTER_EQUIPMENT_MASKS.aki_headphones;
 if(signatureOf(gear)?.model!=='aki_headphones'||!canUseGear(gear)||!mask)return asset.geometry;
 if((asset.flat?asset.sourceVertices:asset.geometry.attributes.position.count)!==mask.vertices||asset.geometry.index.count!==mask.triangles*3)throw Error('Character equipment mask is stale');
 if(!asset.headsetVariant){const removed=new Set(mask.remove),indices=asset.geometry.index.array,kept=[];for(let i=0;i<indices.length;i+=3)if(!removed.has(i/3))kept.push(indices[i],indices[i+1],indices[i+2]);asset.headsetVariant=asset.geometry.clone();asset.headsetVariant.setIndex(kept);}
 return asset.headsetVariant;
}

;
/* Imported Y2K characters. The small reader accepts only our build-time validated GLBs;
   no runtime URL, provider, loader dependency or player save is involved. */
const CHARACTER_RENDER = {cache:new Map()};
function characterAsset(id){
 const flat=typeof STREET_CHARACTER_GLB!=='undefined'&&g1On(),cacheKey=id+(flat?'+flat':'');
 if(CHARACTER_RENDER.cache.has(cacheKey))return CHARACTER_RENDER.cache.get(cacheKey);
 const encoded=flat?STREET_CHARACTER_GLB[id]:CHARACTER_GLB[id];if(!encoded)throw new Error('Unknown character asset: '+id);
 const bin=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bin.buffer);
 if(view.getUint32(0,true)!==0x46546c67)throw new Error('Invalid character GLB');
 const size=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bin.subarray(20,20+size))),start=28+size;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],n=widths[a.type];if(v.byteStride||a.sparse||!C||!n)throw new Error('Unsupported packed character attribute');const off=start+(v.byteOffset||0)+(a.byteOffset||0);return new T3.BufferAttribute(new C(bin.buffer.slice(off,off+a.count*n*C.BYTES_PER_ELEMENT)),n,!!a.normalized);};
 const primitive=doc.meshes[0].primitives[0],geometry=new T3.BufferGeometry();
 for(const [from,to] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']])if(primitive.attributes[from]!=null)geometry.setAttribute(to,access(primitive.attributes[from]));
 geometry.setIndex(access(primitive.indices));
 if(primitive.attributes.COLOR_0!=null)geometry.setAttribute('color',access(primitive.attributes.COLOR_0));
 let material;
 if(flat){material=new T3.MeshBasicMaterial({vertexColors:true,side:T3.DoubleSide});material.userData.streetFlat=true;}else{
 const materialDef=doc.materials[primitive.material],imageDef=doc.images[doc.textures[materialDef.pbrMetallicRoughness.baseColorTexture.index].source],imageView=doc.bufferViews[imageDef.bufferView];
 const bytes=bin.subarray(start+(imageView.byteOffset||0),start+(imageView.byteOffset||0)+imageView.byteLength);
 let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const texture=new T3.Texture();texture.colorSpace=T3.SRGBColorSpace;texture.flipY=false;texture.minFilter=T3.LinearMipmapLinearFilter;texture.magFilter=T3.LinearFilter;
 material=new T3.MeshLambertMaterial({map:texture,color:0xffffff,side:T3.DoubleSide});
 const image=document.createElement('img');image.onload=()=>{texture.image=image;texture.needsUpdate=true;};image.onerror=()=>{material.map=null;material.color.set('#8092a0');material.needsUpdate=true;};image.src='data:'+imageDef.mimeType+';base64,'+btoa(text);
 }
 const clips=doc.animations.map(a=>new T3.AnimationClip(a.name,-1,a.channels.map(ch=>{const sa=a.samplers[ch.sampler],node=doc.nodes[ch.target.node],prop={rotation:'quaternion',translation:'position',scale:'scale'}[ch.target.path],C=prop==='quaternion'?T3.QuaternionKeyframeTrack:T3.VectorKeyframeTrack;return new C(node.name+'.'+prop,access(sa.input).array,access(sa.output).array,sa.interpolation==='STEP'?T3.InterpolateDiscrete:T3.InterpolateLinear);})));
 const asset={doc,geometry,material,access,clips,flat,sourceVertices:doc.extras?.streetSourceVertices};CHARACTER_RENDER.cache.set(cacheKey,asset);return asset;
}
function buildY2KHero(at,ar,wt,wr,cos){
 const profile=CHARS[G.char],id=profile.model||'aki',asset=characterAsset(id),doc=asset.doc,g=new T3.Group(),joints=new Set(doc.skins[0].joints),B={};
 const nodes=doc.nodes.map((n,i)=>{const o=joints.has(i)?new T3.Bone():new T3.Group();o.name=n.name||'node_'+i;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.matrix)new T3.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);if(joints.has(i))B[o.name]=o;return o;});
 doc.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));for(const i of doc.scenes[doc.scene||0].nodes)g.add(nodes[i]);
 const s=doc.skins[0],inv=asset.access(s.inverseBindMatrices).array,skeleton=new T3.Skeleton(s.joints.map(i=>nodes[i]),s.joints.map((_,i)=>new T3.Matrix4().fromArray(inv,i*16)));
 const mesh=new T3.SkinnedMesh(characterEquipmentGeometry(asset,id),g1HeroMaterial(id,asset.material));mesh.name=id+'_skin';mesh.frustumCulled=false;
 const meshNode=doc.nodes.findIndex(n=>n.mesh===0);nodes[meshNode].add(mesh);g.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld);mesh.normalizeSkinWeights();
 const mixer=new T3.AnimationMixer(g),actions=Object.fromEntries(asset.clips.map(clip=>[clip.name,mixer.clipAction(clip)]));
 for(const [name,action]of Object.entries(actions)){if(!['idle','walk','run'].includes(name)){action.setLoop(T3.LoopOnce,1);action.clampWhenFinished=true;}}
 g.userData={y2k:true,id,B,mesh,skeleton,mixer,actions,animation:'',face:Math.PI};
 characterPlay(g,'idle',0);characterEquipment(g,cos||G.cos,wt,wr);g.userData.aura=buildBodyAura(g,(cos||G.cos).auraStyle);
 mk(new T3.RingGeometry(8,9,28).rotateX(-Math.PI/2),basic('#7ef0ff',.7),0,.2,0,g);
 const orb=mk(ico(1.2,1),basic('#81cbd1',.8),0,0,0,B.handL);orb.position.set(0,0,2);orb.visible=false;g.userData.orb=orb;
 addShadow(g,5.5);g.scale.setScalar(.85*CK);return g;
}
function characterEquipment(g,cos,wt,wr){
 const B=g.userData.B;
 const grip=new T3.Group();B.handR.add(grip);grip.rotation.x=Math.PI/2;g.userData.sword=grip;
 for(const slot of Object.keys(SLOTN)){
  const it=G.equip[slot];if(it&&attachSignatureGear(g,it))continue;
  if(slot==='weapon'){const style={umbrella:0,bat:1,tube:2,saber:3}[cos.weaponStyle]??wt;buildWeapon(grip,style,wr);}
  else if(it){
   if(slot==='offhand'&&cos.offhandStyle&&cos.offhandStyle!=='0')continue;
   const add=(bone,x,y,z)=>{const item=buildSimpleEquipment(slot,Math.min(3,Math.floor(it.il/6)),it.r);if(slot==='boots')item.scale.set(1.7,1.4,1.65);if(slot==='gloves')item.scale.setScalar(1.25);item.position.set(x,y,z);B[bone].add(item);};
   if(slot==='head')add('head',0,5,0);
   else if(slot==='gloves'){add('handL',0,1,0);add('handR',0,1,0);}
   else if(slot==='boots'){add('footL',0,.7,0);add('footR',0,.7,0);}
   else if(slot==='offhand')add('handL',0,1,1);
   else add('torso',slot==='armor'?0:3,slot==='armor'?1:0,3.3);
  }
 }
 if(g.userData.id==='null'&&!g.userData.pet){const pet=buildSimpleEquipment('ring',0,0);pet.position.set(8,13,-2);g.add(pet);g.userData.pet=pet;}
 // Existing cosmetic owner expects forearm origins. Socket adapters put the item in the palm.
 const proxy={...B};for(const side of['L','R']){const socket=new T3.Group();socket.position.set(0,4,-1);B['hand'+side].add(socket);proxy['fore'+side]=socket;}
 const occupiedLeft=(g.userData.equipment||[]).some(e=>e.id==='ping_phone');
 g.userData.offhandCosmeticSuppressed=occupiedLeft&&!!cos.offhandStyle&&cos.offhandStyle!=='0';
 buildHeroAccessories(proxy,occupiedLeft?{...cos,offhandStyle:'0'}:cos);
}
function characterPlay(g,name,fade=.1){
 const u=g.userData,next=u.actions[name];if(!next||u.animation===name)return;
 const previous=u.actions[u.animation];u.animation=name;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();if(previous)previous.crossFadeTo(next,fade,false);else next.fadeIn(fade);
}
/* 身體特效：純外觀，掛在角色群組上，跟著移動與旋轉；低面數、不加光源。 */
function buildBodyAura(parent,kind){
 if(!kind||kind==='0')return null;
 const root=new T3.Group(),M=(c,o=1)=>{const m=basic(c,o);m.transparent=true;m.depthWrite=false;return m;},cubes=[],rnd=(a,b)=>a+Math.random()*(b-a);let step=()=>{};
 parent.add(root);
 if(kind==='circuit'){
  const r1=mk(new T3.TorusGeometry(7.2,.55,4,24).rotateX(Math.PI/2),M('#69e0ff',.9),0,5,0,root),r2=mk(new T3.TorusGeometry(6.2,.55,4,24).rotateX(Math.PI/2),M('#b49bff',.9),0,17,0,root);
  for(let i=0;i<6;i++)cubes.push(mk(new T3.BoxGeometry(1.5,1.5,1.5),M(i%2?'#69e0ff':'#fff0a0',1),0,0,0,root));
  step=t=>{r1.rotation.y=t*1.4;r2.rotation.y=-t*1.1;r1.position.y=5+Math.sin(t*1.6)*1.2;r2.position.y=17+Math.cos(t*1.6)*1.2;cubes.forEach((c,i)=>{const a=t*1.8+i*Math.PI/3;c.position.set(Math.cos(a)*7.6,3+((i*4+t*5)%20),Math.sin(a)*7.6);c.rotation.set(t*2+i,t*3,0);});};
 }else if(kind==='spark'){
  for(let i=0;i<9;i++)cubes.push(mk(new T3.BoxGeometry(.6,3.4,.6),M(i%3?'#fff3a0':'#8fe8ff',.95),0,-99,0,root));
  let acc=1;step=(t,dt)=>{acc+=dt;if(acc>.11){acc=0;for(const c of cubes){const on=Math.random()<.55;c.visible=on;if(on){const a=Math.random()*6.283,rr=rnd(3.5,7.5);c.position.set(Math.cos(a)*rr,rnd(1,24),Math.sin(a)*rr);c.rotation.set(rnd(-.8,.8),rnd(0,3),rnd(-1.2,1.2));c.scale.y=rnd(.5,1.6);}}}};
  for(const c of cubes){c.position.set(rnd(-6,6),rnd(2,22),rnd(-6,6));c.rotation.z=rnd(-1,1);}
 }else if(kind==='wave'){
  for(let i=0;i<3;i++)cubes.push(mk(new T3.RingGeometry(.72,1,28).rotateX(-Math.PI/2),M('#ff7ad9',.9),0,.35,0,root));
  step=t=>{cubes.forEach((c,i)=>{const k=((t*.55+i/3)%1);c.scale.setScalar(3+k*10);c.material.opacity=.95*(1-k*k);});};
 }else if(kind==='pixel'){
  const cols=['#7ef0ff','#ff9be3','#fff0a0'];
  for(let i=0;i<22;i++){const c=mk(new T3.BoxGeometry(1.4,1.4,1.4),M(cols[i%3],.95),0,0,0,root);c.userData={a:rnd(0,6.283),rr:rnd(3,7),ph:i/16,sp:rnd(.18,.32)};cubes.push(c);}
  step=t=>{for(const c of cubes){const d=c.userData,k=(t*d.sp+d.ph)%1;c.position.set(Math.cos(d.a+t*.6)*d.rr,1+k*24,Math.sin(d.a+t*.6)*d.rr);c.material.opacity=Math.min(1,k*6,(1-k)*3);c.rotation.y=t*2;}};
 }
 const a={root,t:0,update(dt){a.t+=dt;step(a.t,dt);}};step(.5,.2);return a;
}
function characterAnimate(g,dt,state={}){
 const u=g.userData;if(!u.y2k)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 // Preview offsets are temporary: remove them before the mixer writes the next pose.
 if(u.previewApplied){for(const [name,q]of Object.entries(u.previewPose))u.B[name].quaternion.copy(q);u.previewApplied=false;}
 const mode=state.dead?'death':state.hurt?'hurt':state.dash?'dash':state.speed>8?'run':state.attack?'attack':state.cast?'cast':state.speed>7?'run':state.speed>1?'walk':'idle';
 if(state.attack&&u.lastSwing!=null&&state.swing<u.lastSwing&&u.animation==='attack')u.actions.attack.reset().play();u.lastSwing=state.swing;
 if(state.cast&&u.lastCast!=null&&state.castTime<u.lastCast&&u.animation==='cast')u.actions.cast.reset().play();u.lastCast=state.castTime;
 characterPlay(g,mode,mode==='hurt'?.045:.1);const action=u.actions[mode];if(action&&mode==='attack')action.timeScale=.6/.3;if(action&&mode==='cast')action.timeScale=.8/.45;
 u.mixer.update(dt);animateEquipment(g,state);if(u.aura){u.aura.root.visible=!state.dead;u.aura.update(dt);}
 g.updateMatrixWorld(true);u.skeleton.update();
}
// Presentation only. No game clocks, combat flags, save data or model assets change.
function characterPreviewAnimate(g,dt,reduced=false){
 if(!g?.userData.y2k)return;
 const u=g.userData;
 characterAnimate(g,reduced?0:dt);
 if(reduced)return;
 dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 u.previewTime=(u.previewTime||0)+dt;
 const phase={aki:0,milo:1.7,ping:3.1,null:4.6}[u.id]||0,t=u.previewTime+phase;
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 // Long rests between gestures, with soft acceleration and a separate return.
 const gesture=(period,start,hold,end)=>{const p=t%period;return smooth((p-start)/.8)*(1-smooth((p-hold)/(end-hold)));};
 if(!u.previewPose)u.previewPose={};
 if(!u.previewEuler)u.previewEuler=new T3.Euler();
 if(!u.previewOffset)u.previewOffset=new T3.Quaternion();
 const turn=(name,x=0,y=0,z=0)=>{
  const bone=u.B[name];if(!bone)return;
  (u.previewPose[name]||(u.previewPose[name]=new T3.Quaternion())).copy(bone.quaternion);
  bone.quaternion.multiply(u.previewOffset.setFromEuler(u.previewEuler.set(x,y,z)));
 };
 const breath=Math.sin(t*1.55);
 if(u.id==='aki'){
  const look=gesture(11,2,3.8,5.8);
  turn('torso',.008*breath,0,-.025);
  turn('head',-.025*look,0,.16*look);
  turn('foreR',-.10*look);turn('handR',0,.09*look,0);
 }else if(u.id==='milo'){
  const beat=Math.sin(t*2.5),tap=gesture(9,3,4.4,6.2);
  turn('torso',.012*breath,0,.04*beat);
  turn('head',.055*Math.sin(t*2.5-.45),0,-.025*beat);
  turn('foreL',-.16*tap);turn('handL',.04*tap,0,.07*tap);
 }else if(u.id==='ping'){
  const check=gesture(12,2,4.8,7);
  turn('torso',.035*check,0,0);
  turn('head',.13*check,0,-.10*check);
  turn('armL',-.25*check,0,-.04*check);
  turn('foreL',-.42*check);turn('handL',0,.06*check,0);
 }else if(u.id==='null'){
  const greet=gesture(13,2.5,5.3,7.8);
  turn('torso',.015*breath,0,-.04*greet);
  turn('head',.065*greet,0,.18*greet);
  turn('armR',-.20*greet,0,.08*greet);
  turn('foreR',-.26*greet);turn('handR',0,.08*Math.sin(t*2)*greet,0);
 }
 u.previewApplied=true;g.updateMatrixWorld(true);u.skeleton.update();
}
function characterHeroLook(g){
 const h=G.h,u=g.userData;characterAnimate(g,typeof heroFrozen==='function'&&heroFrozen()?0:R3.frameDt||1/60,{dead:h.dead>0,hurt:h.hurtT>0,dash:!!h.dash,attack:h.swingT>=0,swing:h.swingT,cast:h.castT>=0||G.time<(h.characterCastUntil||0),castTime:h.castT,speed:h.mv||0});
 at3(g,h.x,h.y,BZ+terrainHeight(h.x,h.y));const target=nearestMon(false);if(h.drama?.kind==='climb')u.face=Math.atan2(h.vx,h.vy);else if((h.mv||0)>8&&h.dead<=0)u.face=Math.atan2(h.vx,h.vy);else if(target&&h.dead<=0)u.face=Math.atan2(target.x-h.x,target.y-h.y);const d=Math.atan2(Math.sin(u.face-g.rotation.y),Math.cos(u.face-g.rotation.y));g.rotation.y+=d*(1-Math.exp(-12*(R3.frameDt||1/60)));
 g.scale.setScalar(.85*CK);u.orb.visible=h.castT>=0&&h.dead<=0;
}
function characterDispose(g){if(!g?.userData.y2k)return;const u=g.userData;u.mixer.stopAllAction();u.mixer.uncacheRoot(g);u.skeleton.dispose();}


;
/* ---------- UI: side panel, modal, overlay ---------- */
// 全介面共用 Signal 24 圖集，座標及順序只讀取產生器的索引。
function uiSprite(sheet,id,size=24,extra='',tag='span'){
  const S=ART_SHEETS[sheet],index=S?.ids.indexOf(id);if(index==null||index<0)return '';
  const x=index%S.cols*size,y=Math.floor(index/S.cols)*size;
  return `<${tag} class="spr${tag==='i'?' gem':''}" aria-hidden="true" data-icon="${sheet}:${id}" style="width:${size}px;height:${size}px;background:var(--pixel-${sheet},var(--a-${sheet})) -${x}px -${y}px/${S.cols*size}px ${S.rows*size}px no-repeat;${extra}"></${tag}>`;
}
const ICON_IDX=ART_SHEETS.icons.ids,SK_IDX=ART_SHEETS.skills.ids;
function spr(name,size=30){return uiSprite('icons',name,size);}
function sico(id,size=30){const url=typeof icon3dCircuitUrl==='function'?icon3dCircuitUrl('skill',id):'';return url?`<img class="spr" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated">`:uiSprite('skills',id,size);}
const SHEETS={relic:['relics'],legend:['legends'],badge:['badges']};
function xico(kind,id,size=24){if((kind==='relic'||kind==='badge')&&typeof icon3dCollectibleUrl==='function'){const url=icon3dCollectibleUrl(kind,id);if(url)return `<img class="spr eq3d" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">`;}if(kind==='legend'&&typeof icon3dLegendUrl==='function'){const url=icon3dLegendUrl(id);if(url)return `<img class="spr eq3d" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">`;}return SHEETS[kind]?uiSprite(SHEETS[kind][0],id,size,'vertical-align:middle;margin-right:4px'):'';}
function eqico(slot,r,size=32,it){
  if(typeof icon3dUrl==='function'){const url=icon3dUrl(slot,it&&typeof aTier==='function'?aTier(it):0,r|0);if(url)return `<img class="spr eq3d" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">`;}
  return uiSprite('equips',slot+'-'+Math.max(0,Math.min(r|0,3)),size,'vertical-align:middle;margin-right:4px');}
const SLOT_ICON = { head:'role', armor:'shield', gloves:'craft', ring:'coin', boots:'adventure', weapon:'sword', offhand:'shield' }, SKILL_ICON = { FIRE:'fire', FROST:'ice', CHAIN:'bolt', METEOR:'meteor', PULSE:'headphones', MAGNET:'coin', SPAM:'star', FLICKER:'sword', BEAM:'heart' };
function slotHtml(slot){
  const it = G.equip[slot];
  if (!it) return `<div class="rc"><div class="rh">${SLOTN[slot]}</div><div class="nm">${spr(SLOT_ICON[slot], 32)}<div class="mute">空</div></div></div>`;
  const lines = itemLines(it).slice(0, 3).map(l => `<li class="${l.imp ? 'imp' : l.lg ? 'lgd' : ''}">${l.t}</li>`).join('');
  return `<div class="rc item" style="--rc:${RAR[it.r].c}"><div class="rh"><span>${SLOTN[slot]}</span><span class="mute">ilvl ${it.il}</span></div><div class="nm">${it.lg && xico('legend', it.lg, 64) ? xico('legend', it.lg, 64) : eqico(slot, it.r, 64, it)}<div><b style="color:${RAR[it.r].c}">${it.name}</b><div class="mute">${RAR[it.r].n}</div></div></div><ul>${lines}</ul></div>`;
}
function panelHtml(){
  const s = G.st, h = G.h, R = G.run;
  const sk = G.slots.map((id, i) => id ? `<li><b>${SKILLS[id].n}</b> <span class="mute">${(G.supp[id] || []).filter(Boolean).map(g => SUPPS[g].n).join('、') || '無輔助'}</span></li>` : `<li class="mute">槽 ${i+1}：${G.lvl >= SLOT_LV[i] ? '空' : '等級 ' + SLOT_LV[i] + ' 解鎖'}</li>`).join('');
  const prog = R ? `${R.tower ? `無限之塔 第 ${R.floor} 層` : '地圖進度'} ${Math.min(R.kills, R.need)} / ${R.need}${R.tower ? '' : `（${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}）`}` : `討伐 ${Math.min(G.kills, G.need)} / ${G.need}${G.push ? '（滿了出BOSS）' : '（刷怪模式）'}`;
  const stats = `<li>生命 ${tFmt(Math.max(0, h.hp))} / ${tFmt(s.life)}</li><li>預估 DPS ${tFmt(s.dps)}</li><li>會心 ${s.crit.toFixed(0)}%　減傷 ${(s.red*100).toFixed(0)}%</li><li>${prog}</li>`;
  return `${slotHtml('weapon')}${slotHtml('armor')}${slotHtml('ring')}
    <div class="rc"><div class="rh">技能</div><ul>${sk}</ul></div>
    <div class="rc"><div class="rh">狀態</div><ul>${stats}</ul></div>${charHtml()}${cardsHtml()}
    <div class="rc wide"><div class="rh">事件</div><ol class="log">${G.log.map(l => `<li style="color:${l.col}">${l.txt}</li>`).join('')}</ol></div>`;
}
function codexHtml(){
  const lg = Object.values(LEGEND_BY), nl = lg.filter(L => G.legSeen[L.id]).length, md = Object.keys(MODES), nm = md.filter(id => G.seen[id]).length, sk = Object.keys(SKILLS), ns = sk.filter(id => typeof skillAvailable==='function'?skillAvailable(id):G.lvl>=SKILLS[id].lvl).length;
  const slotOf = id => Object.keys(LEGENDS).find(k => LEGENDS[k].some(L => L.id === id));
  return `<p class="uxmeta">圖鑑記錄你的收藏與解鎖；完整效果與機制請查編年史。</p><div class="rc wide"><div class="rh">圖鑑</div><div class="mute">BOSS暗金保底：連續 ${G.pity || 0} 件沒出，下一件暗金機率 ${Math.round(Math.min(1, .1 + .06*(G.pity || 0))*100)}%</div>
    <div class="mct" style="margin:8px 0 3px">元素反應</div><ul class="ach"><li class="got">${obj3d('orb:#ff7a3d',28)}<b>火焰</b> 命中的敵人燃燒 3 秒，持續受到傷害</li><li class="got">${obj3d('orb:#ffe04a',28)}<b>閃電</b> 命中的敵人被標記 4 秒</li><li class="got">${obj3d('orb:#ff9ad0',28)}<b>融化</b> 火焰打到凍結的敵人：傷害 +40%，解除凍結</li><li class="got">${obj3d('orb:#8fe8ff',28)}<b>超導</b> 閃電打到凍結的敵人：傷害 +30%</li><li class="got">${obj3d('orb:#c9d3ff',28)}<b>蒸氣</b> 冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒</li><li class="got">${obj3d('orb:#ff5a8a',28)}<b>過載</b> 火焰或冰霜打到被閃電標記的敵人：傷害 +25%</li></ul>
    <div class="mct" style="margin:8px 0 3px">遺物 ${Object.keys(G.relics).length} / ${Object.keys(RELICS).length}</div><ul class="ach">${Object.entries(RELICS).map(([id, r]) => `<li class="${G.relics[id] ? 'got' : 'mute'}">${xico('relic', id, 22)}<b>${G.relics[id] ? r.n : '？？？'}</b> ${G.relics[id] ? r.d : ''}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">傳奇裝備 ${nl} / ${lg.length}</div><ul class="ach">${lg.map(L => `<li class="${G.legSeen[L.id] ? 'got' : 'mute'}">${xico('legend', L.id, 24)}<b>${G.legSeen[L.id] ? L.name : '？？？'}</b> ${G.legSeen[L.id] ? L.d : `（暗金${SLOTN[slotOf(L.id)]}）`}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">模式卡匣 ${nm} / ${md.length}</div><ul class="ach">${md.map(id => { const M = MODES[id], has = G.seen[id]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? M.n : '？？？'}</b> ${has ? `（${SKILLS[M.sk].n}）${M.d}` : `（${SKILLS[M.sk].n}）${M.hint}${G.carts[id] ? '　已持有未鑑定' : ''}`}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">魔物</div><ul class="ach">${MONSTER_GUIDE.map(([id, n, d]) => { const k = (G.mk || {})[id] || 0; return `<li class="${k ? 'got' : 'mute'}"><b>${k ? n : '？？？'}</b> ${k ? `${d}（討伐 ${k}）` : '還沒遇到'}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">輔助配件</div><ul class="ach">${Object.keys(SUPPS).map(g => { const has = (G.gems[g] || 0) > 0 || (G.seenG || {})[g]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? SUPPS[g].n : '？？？'}</b> ${has ? SUPPS[g].d : '還沒取得'}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">技能 ${ns} / ${sk.length}</div><ul class="ach">${sk.map(id => { const K = SKILLS[id], has = typeof skillAvailable==='function'?skillAvailable(id):G.lvl>=K.lvl; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? K.n : '？？？'}</b> ${has ? K.d : `（Lv. ${K.lvl} 解鎖）`}</li>`; }).join('')}</ul></div>`;
}
function logHtml(){
  try { localStorage.setItem('ih_log_seen', CHANGELOG[0].v); } catch (e) {}
  return `<div class="rpgm"><div class="rc wide"><div class="rh">更新日誌</div>${CHANGELOG.map(c => `<div class="lg"><b>v${c.v}</b> <span class="mute">${c.d}</span><ul>${c.t.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
}
const logNew = () => { try { return localStorage.getItem('ih_log_seen') !== CHANGELOG[0].v; } catch (e) { return false; } };
let modalTab = 'skills', resetArm = false;
const $ = id => document.getElementById(id);
const invN = () => Object.values(G.gems).reduce((a, b) => a + b, 0) + Object.values(G.carts).reduce((a, b) => a + b, 0);
const dotOn = k => k === 'skills' ? invN() > (G.seenInv || 0) : k === 'craft' ? (G.parts || 0) >= 6 && G.parts > (G.seenParts || 0) : k === 'col' ? Object.keys(G.goals).length > (G.seenGoals || 0) : false;
function markSeen(t){ if (t === 'skills'){ if (!G.newSnap || modalTabPrev !== 'skills') G.newSnap = { g:{ ...(G.seenG || G.gems) }, c:{ ...(G.seenC || G.carts) } }; G.seenG = { ...G.gems }; G.seenC = { ...G.carts }; G.seenInv = invN(); } else if (t === 'craft') G.seenParts = G.parts || 0; else if (['goals', 'ach', 'dex'].includes(t)) G.seenGoals = Object.keys(G.goals).length; }
let modalTabPrev = '';
function openModal(tab){if(typeof TASK_GUIDE!=='undefined'&&TASK_GUIDE&&TASK_GUIDE.page!==tab)TASK_GUIDE=null; if(typeof WIRE_MOVE!=='undefined'&&tab&&tab!=='skills'){WIRE_MOVE=null;if(drag)wireUp({type:'pointercancel'});}modalTabPrev = modalTab; modalTab = tab || modalTab; markSeen(modalTab); resetArm = false; $('modal').hidden = false; renderModal(true); }
const MOB = () => document.body.classList.contains('m');   // 手機直式：上面戰鬥畫面，下面固定的分頁面板（彈窗變成面板）
const DESK = () => document.body.classList.contains('d');   // 桌機寬螢幕：左邊角色與紀錄、中間戰鬥、右邊常駐分頁面板
function closeModal(){ if(MOB()||DESK()){renderModal(true);return;} $('modal').hidden=true; }
function renderModal(resetScroll = false){ if(typeof wireHistoryObserve==='function')wireHistoryObserve(); const uxPanel = uxCapturePanel(); setTimeout(() => { if (typeof dressMount === 'function' && ['char','dress'].includes(modalTab)) dressMount();if(modalTab==='tree'&&typeof uiTreeMount==='function')uiTreeMount();if(typeof uiWarehouseMount==='function')uiWarehouseMount(); }, 0);
  if ($('modal').hidden) return;
  $('mtabs').innerHTML=uiNavHtml(); uiTitle();
  const settings=modalTab==='settings';if(settings)uiSyncSettings(); $('uisettings').hidden=!settings; $('mmenu').hidden=false; $('mbody').hidden=settings;
  if(!settings) $('mbody').innerHTML = modalTab === 'warehouse' ? warehouseHtml() : modalTab === 'char' ? uiCharacterHtml() : modalTab === 'skills' ? skillsHtml() : modalTab === 'tree' ? treeHtml() : modalTab === 'maps' ? mapsHtml() : modalTab === 'goals' ? goalsHtml() : modalTab === 'ach' ? `<div class="rpgm">${achHtml()}</div>` : modalTab === 'craft' ? craftHtml() : modalTab === 'dress' ? dressHtml() : modalTab === 'rank' ? rankHtml() : modalTab === 'dex' ? `<div class="rpgm">${codexHtml()}</div>` : modalTab === 'log' ? logHtml() : modalTab === 'feedback' ? feedbackHtml() : modalTab === 'support' ? supportHtml() : modalTab === 'save' ? saveHtml() : uiMenuHtml();
  if(!settings&&typeof taskGuideHtml==='function'){const inventory=TASK_GUIDE?.key==='modes'?document.getElementById('uxinventory'):null;if(inventory)inventory.insertAdjacentHTML('beforebegin',taskGuideHtml());else $('mbody').insertAdjacentHTML('afterbegin',taskGuideHtml());}
  uxRestorePanel(uxPanel,resetScroll);if(resetScroll)uxAnimatePanel();
  if(typeof onboardingMount==='function')onboardingMount();UI_LIVE_SIGNATURE=uiLiveSignature();uiCityRevealCheckpoint();
}
let held = null, heldRot = 0, selPiece = null, selSock = -1;   // 接線板：held 是手上準備放下的配件；selPiece 是選取的機件 id；selSock 是選取的插槽
const GEM_COL=Object.fromEntries(Object.entries(GridLab.GEM_COLOR).map(([id,c])=>[id,{r:'#ed967d',b:'#8db7ef',g:'#80cebd'}[c]]));
const GEM_IDX=ART_SHEETS.gems.ids;
const gemIco=(id,size=22)=>{const url=typeof icon3dCircuitUrl==='function'?icon3dCircuitUrl('support',id):'';return url?`<img class="spr gem" alt="" aria-hidden="true" src="${url}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated">`:uiSprite('gems',id,size,'','i');};
function buildBar(){
  return `<section class="ui-build" aria-label="構築配置"><div><b>構築</b>${[0,1,2].map(i=>`<button class="mb" aria-label="構築 ${i+1}" aria-pressed="${(G.bi||0)===i}" onclick="switchBuild(${i})">${i+1}</button>`).join('')}</div><button class="mb" data-focus="build-save" title="${G.builds[G.bi||0]?.equipment?'已記住此職業的七部位裝備':'此配置尚未記住裝備'}；切換構築時會自動保存目前配置" onclick="uiSaveBuild()">${G.builds[G.bi||0]?.equipment?'更新構築':'儲存構築'}</button>${uiBuildGearHtml()}${uiPolicyHtml()}</section>`;
}
function dpsBar(){
  const sk = G.st.sk || {}, ids = Object.keys(sk), tot = ids.reduce((a, id) => a+sk[id].direct*sk[id].estimatedCasts, 0) || 1;
  return `<div class="dpsbar" title="包含模式與共享出手時間，不含燃燒、條件連動、角色專屬及討伐收益；實測可到冒險的訓練場"><div>DPS <b>${tFmt(G.st.dps)}</b> <span id="pzdelta" class="mute"></span></div><div class="shares">${ids.map(id => `<span style="flex:${Math.max(1, Math.round(sk[id].direct*sk[id].estimatedCasts/tot*100))}" title="${SKILLS[id].n}">${SKILLS[id].n}</span>`).join('')}</div>${uxPieceDetails()}</div>`;
}
let BUILD_PENDING=null;
function switchBuild(i){if(i===(G.bi||0))return;const result=restoreBuild(i);if(result.missing?.length&&!result.ok){BUILD_PENDING={index:i,target:JSON.stringify(G.builds[i])};showOverlay(`<h2 class="uxdialog-title">構築 ${i+1} 缺少裝備</h2><p>${result.missing.map(slot=>SLOTN[slot]).join('、')}已不存在，尚未切換。可保留缺件部位的目前裝備，載入其餘配置。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="BUILD_PENDING=null;hideOverlay()">保留目前構築</button><button class="mb pri" onclick="uiConfirmBuildFallback()">缺件沿用目前裝備</button></div>`);return;}uiFinishBuild(result,i);}
function uiFinishBuild(result,i){if(!result.ok){uxAnnounce(result.reason);return;}selPiece=null;held=null;renderModal();uxAnnounce(`已切換構築 ${i+1}${result.legacy?'，舊配置沿用目前裝備':'，已載入手動保存的裝備'}。`);}
function uiConfirmBuildFallback(){const p=BUILD_PENDING;BUILD_PENDING=null;hideOverlay();if(!p||JSON.stringify(G.builds[p.index])!==p.target){uxAnnounce('配置已變動，請重新確認。');return;}uiFinishBuild(restoreBuild(p.index,true),p.index);}
function uiSaveBuild(){if(!saveBuild()){uxAnnounce('城市或訓練進行中，或倉庫已滿，尚未更新構築。');return;}renderModal();uxAnnounce('已保存技能、天賦、策略及七部位裝備；引用裝備受回收保護。');}
function skillsHtml(){return deviceSkillsHtml();}

function treeHtml(){
  return uiTalentWorkspaceHtml();
}
function nextStep(){
  if(G.run?.city?.awaitChoice)return {t:'城市路段完成，選擇下一段或帶回碎片',tab:'maps'};
  const q = QUESTS[G.quest || 0];
  if (q) return { t:`${q.n}（${q.t}）`, tab:'goals' };
  if (passPoints() > 0 && tabOpen('tree')) return { t:`有 ${passPoints()} 點天賦可以分配`, tab:'tree' };
  if ((G.parts || 0) >= 6 && tabOpen('craft')) return { t:`有 ${G.parts} 個零件可以改機`, tab:'craft' };
  if (!G.run && !G.train && G.maxDepth >= 8 && !(G.towerBest > 0)) return { t:'試試無限之塔', tab:'maps' };
  return null;
}
function questHtml(){
  const q = QUESTS[G.quest || 0];
  if (!q) return '';
  const v = Math.min(q.goal, GOAL_STAT[q.k]());
  return `<div class="mct">新手任務　${G.quest || 0}/${QUESTS.length}</div><div class="gls"><div class="gl"><b>${obj3d('goals',30)}${q.n}</b><span class="mute">${q.t}　獎勵：${goalRewardText(q.rw)}${q.un ? '　（完成後開放：' + (q.un === 'craft' ? '改機' : '天賦盤') + '）' : ''}</span><i style="--p:${Math.round(v/q.goal*100)}%"></i><em>${v} / ${q.goal}</em>${taskButton(q)}</div></div>`;
}
const GOAL_GROUP={kills:['討伐魔物','隻'],lvl:['角色等級','級'],depth:['最深街區','層'],runs:['地圖通關','張'],modes:['卡匣鑑定','種']};
const goalRewardShort=r=>[r.gold&&`金幣 ${r.gold}`,r.parts&&`零件 ${r.parts}`,r.gem&&`配件·${SUPPS[r.gem].n}`,r.cart&&`卡匣·${G.seen[r.cart]?MODES[r.cart].n:SKILLS[MODES[r.cart].sk].n}`].filter(Boolean).join('、');
function goalsHtml(){
  const done = GOALS.filter(a => G.goals[a.id]).length;
  const groups=Object.keys(GOAL_GROUP).map(k=>{const list=GOALS.filter(a=>a.k===k);if(!list.length)return '';const cur=GOAL_STAT[k](),next=list.find(a=>!G.goals[a.id]),top=list[list.length-1].goal;
    return `<article class="goal-card"><div class="goal-head">${obj3d(next?'goals':'ach',30)}<b>${GOAL_GROUP[k][0]}</b><strong>${cur}</strong><small>${GOAL_GROUP[k][1]}</small></div><i class="goal-track"><u style="width:${Math.min(100,Math.round(cur/top*100))}%"></u>${list.map(a=>`<s class="${G.goals[a.id]?'ok':''}" style="left:${Math.min(100,Math.round(a.goal/top*100))}%"></s>`).join('')}</i><ul class="goal-steps">${list.map(a=>`<li class="${G.goals[a.id]?'ok':a===next?'next':''}" title="${uxEsc(a.n)}"><span>${G.goals[a.id]?'✓':a===next?'▶':'·'}</span><b>${a.goal}</b><em>${uxEsc(goalRewardShort(a.rw))}</em>${a===next?taskButton(a).replace(/>[^<]*→</,'>→<'):''}</li>`).join('')}</ul></article>`}).join('');
  return questHtml() + `<div class="mct">目標　${done}/${GOALS.length}${qm('goals')}</div><div class="goal-list">${groups}</div>`;
}
function mapsHtml(){ return uiAdventureHtml(); }

function lootToast(it){
  let box = $('loot'); const host = document.querySelector('.stage') || document.body; if (!box){ box = document.createElement('div'); box.id = 'loot'; } if (box.parentNode !== host) host.appendChild(box);
  const R = RAR[it.r], ls = itemLines(it).filter(l => l.lg).slice(0, 1).concat(itemLines(it).filter(l => !l.lg).slice(0, 1)).slice(0, it.lg ? 2 : 1), d = document.createElement('div');
  d.className = 'lt r' + it.r; d.style.setProperty('--rc', R.c); d.style.setProperty('--rg', R.g);
  d.innerHTML = `<div class="lh">${it.lg && xico('legend', it.lg, 56) ? xico('legend', it.lg, 56) : eqico(it.slot || it.sl, it.r, 56, it)}<b>${it.name}</b></div>`;
  box.prepend(d); while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => d.classList.add('out'), it.r >= 3 ? 3200 : 1800); setTimeout(() => d.remove(), it.r >= 3 ? 3800 : 2400);
}
function setDmgNum(v){ G.dmgNum = v; G.dirty = true; renderModal(); }
function saveHtml(){
  const dn = G.dmgNum == null ? 1 : G.dmgNum;
  return `<div class="mrow" style="margin-bottom:8px"><button class="mb pri" onclick="wikiOpen()">編年史（查看所有遊戲資訊）</button></div><div class="mct">傷害數字</div><div class="mrow">${[[2, '全部'], [1, '精簡'], [0, '關閉']].map(([v, n]) => `<button class="mb" aria-pressed="${dn === v}" style="${dn === v ? 'background:#1f3fb0;color:#fff' : ''}" onclick="setDmgNum(${v})">${n}</button>`).join('')}</div>` + `<div class="hint">每5秒在此瀏覽器保存角色列表；只有目前角色結算離線收益（最多6小時）。匯出碼只包含目前角色，其他角色請各自匯出。刪除只影響目前角色。</div>
    <div class="mrow"><button class="mb" onclick="doSave()">立即存檔</button><button class="mb" onclick="doExport()">匯出存檔碼</button><button class="mb" onclick="doImport()">匯入存檔碼</button><button class="mb" id="rbtn" onclick="doReset()">${resetArm ? '確認刪除目前角色' : '刪除目前角色'}</button></div>
    <textarea id="sv" class="sv" placeholder="匯出的存檔碼會顯示在這裡；要匯入時把存檔碼貼在這裡再按「匯入」"></textarea><div id="smsg" class="hint"></div>`;
}
/* modal actions */
function cartsHtml(){const sp=G.board.pieces.find(p=>p.id===selPiece&&p.kind==='active'),ids=Object.keys(MODES).filter(id=>(G.carts[id]||0)>0);let h=`<ol class="cart-guide"><li class="now">點下面的卡匣</li><li>在彈出的視窗選要裝到哪個技能</li><li>裝上後才鑑定效果；再點同一個技能可以卸下</li></ol>`;
 if(!ids.length)return h+'<p>還沒有卡匣。冒險或電路合成都能取得。</p>';
 const eq=id=>G.board.pieces.some(p=>p.kind==='active'&&p.key===MODES[id].sk)&&cartFree(id)>0;ids.sort((x,y)=>eq(y)-eq(x));const nOk=ids.filter(eq).length;h+=`<p class="cart-sum">${nOk?`有 ${nOk} 張可以裝到已裝備的技能，排在最前面；其餘變暗，要先裝上對應技能。`:'目前沒有可裝的卡匣：先把對應的主動技能裝上。'}</p>`;
 return h+'<div class="ui-cart-grid">'+ids.map(id=>{const M=MODES[id],f=cartFree(id),n=G.carts[id],seen=G.seen[id],has=G.board.pieces.some(p=>p.kind==='active'&&p.key===M.sk),ok=has&&f>0,name=seen?M.n:'未鑑定・'+SKILLS[M.sk].n;return `<button class="gt" data-focus="cart-${id}" data-availability="${ok?'available':'unavailable'}" aria-label="${uxEsc(name)}，可用 ${f}／${n}，${uxEsc(seen?M.d:M.hint)}" onclick="uiCartPick('${id}')">${noticeHas('carts',id)?'<i class="nw">NEW</i>':''}${sico(M.sk,26)}<b>${uxEsc(name)}</b><small>${has?(f>0?`${SKILLS[M.sk].n}已裝備・可用 ${f}／${n}・點選裝上`:`全部已裝在別處（${n}／${n}）・點選可移過來`):`需先裝上${SKILLS[M.sk].n}`}</small></button>`;}).join('')+'</div>';
}
function uiCartPick(id){
  noticeRead('carts',id);const M=MODES[id];if(!M||!G.carts[id])return;
  const name=G.seen[id]?M.n:'未鑑定的'+SKILLS[M.sk].n+'卡匣',ps=G.board.pieces.filter(p=>p.kind==='active'&&p.key===M.sk);
  const rows=ps.map(p=>{const cur=p.mode?(p.mode===id?'已裝這張':'目前：'+(G.seen[p.mode]?MODES[p.mode].n:'未鑑定卡匣')):'目前：標準模式';return `<button class="mb cart-target" data-initial-focus onclick="equipCartTo('${id}','${p.id}')">${sico(p.key,22)}<b>${SKILLS[p.key].n}</b><small>插槽 ${GridLab.sockIndex(p,G.board)+1}　${cur}</small></button>`}).join('');
  const body=ps.length?`<p class="uxmeta">要裝到哪個技能？${cartFree(id)<=0?'（這張已裝在別處，選擇後會移過來）':''}</p><div class="cart-targets">${rows}</div>`:`<p>這張卡匣只能用在${SKILLS[M.sk].n}，盤面上還沒有這個技能。先到「主動技能」把它裝上，再回來裝卡匣。</p>`;
  showOverlay(`<h2 class="uxdialog-title">${uxEsc(name)}</h2><p>${uxEsc(G.seen[id]?M.d:M.hint)}</p>${body}<button class="mb" onclick="hideOverlay()">取消</button>`);
}
function equipCartTo(id,pieceId){
  const p=G.board.pieces.find(q=>String(q.id)===String(pieceId)&&q.kind==='active');if(!p||!MODES[id]||MODES[id].sk!==p.key||!G.carts[id])return;
  if(p.mode===id){delete p.mode;}
  else{if(cartFree(id)<=0){const o=G.board.pieces.find(q=>q!==p&&q.mode===id);if(o)delete o.mode;}p.mode=id;
    if(!G.seen[id]){G.seen[id]=1;logLine(`鑑定完成：${MODES[id].n}，${MODES[id].d}`,'#1f9bbf');checkGoals();}}
  hideOverlay();recalc();renderModal();uxAnnounce(p.mode?`已把${MODES[id].n}裝到${SKILLS[p.key].n}。`:`已卸下${SKILLS[p.key].n}的卡匣。`);
}
function equipCart(id){
  const p = G.board.pieces.find(q => q.id === selPiece && q.kind === 'active'); if (!p) return;
  if (!id){ delete p.mode; recalc(); renderModal(); return; }
  if (MODES[id].sk !== p.key || cartFree(id) <= 0) return;
  p.mode = id;
  if (!G.seen[id]){ G.seen[id] = 1; logLine(`鑑定完成：${MODES[id].n}，${MODES[id].d}`, '#1f9bbf'); checkGoals(); }
  recalc(); renderModal();
}
function allocPass(id){ if (G.run?.city||G.train||!canAllocateTalent(id)) return; G.pass.push(id); recalc(); logLine(`天賦：${talentName(id)}`, '#2f7fc4'); renderModal(); }
function respec(){if(G.run?.city||G.train)return; const cost = 100*G.lvl; if (!G.pass.length || G.gold < cost) return; G.gold -= cost; G.pass = [];G.legacyMode=false; recalc(); renderModal(); }
function enterMap(id){
  if (G.run||G.train) return; const i = G.maps.findIndex(m => m.id === id); if (i < 0) return;
  const map = G.maps.splice(i, 1)[0]; G.run = { map, kills:0, need:80, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine(`進入地圖：${BIOMES[map.biome].n} Lv. ${map.lvl}`, '#2f7fc4'); closeModal();
}
function abandonMap(){if(G.run?.city){cityFinish(false);renderModal();return;} if (!G.run) return; G.run = null; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8; logLine('放棄了地圖', '#857d6e'); renderModal(); }
const smsg = t => { const e = $('smsg'); if (e) e.textContent = t; };
function doSave(){ smsg(saveGame() ? '已存檔。' : '這個環境不允許瀏覽器存檔，請改用「匯出存檔碼」。'); }
function doExport(){ const c = encodeSave(); $('sv').value = c; $('sv').select(); smsg('存檔碼已產生，請整段複製保存。'); }
function doImport(){const o=decodeSave($('sv').value);if(!o||o.v!==2){smsg('存檔碼無效。');return;}if(o.char!==G.char){careerImportOther(o);return;}if(!applySave(o)){smsg('存檔碼無效。');return;}const saved=saveGame();smsg(saved?'匯入完成。':'已載入，但本機保存失敗，請匯出備份。');renderModal();}
function doReset(){ if (!resetArm){ resetArm = true; renderModal(); return; } if(!profileDeleteCurrent()){uxAnnounce('未能清除目前角色，其他角色已保留');return;}G.__wipe=true;location.search='?intro=1'; }

/* 升級三選一 */
function toggleAuto(){ if(!GAME_FEATURES.cardChoices)return; G.autoCard = !G.autoCard; if (G.autoCard) openCards(); else if (G.picks > 0) openCards(); G.dirty = true; renderModal(); }
function openCards(){ if(!GAME_FEATURES.cardChoices)return;
  if (G.picks <= 0 || G.offline) return;
  G.deferChoices = false;
  if (G.autoCard){ while (G.picks > 0){ const o = rollCards(3); if (!o.length) break; takeCard(tPick(o)); } hideOverlay(); return; }   /* 自動隨機：直接抽一張 */ if (!G.offer || !G.offer.length) G.offer = rollCards();
  const h = G.offer.map(id => { const c = CARDS[id], v = !!c.sk; return `<button class="card${v ? ' var' : ''}" onclick="pickCard('${id}')"><span class="ct">${v ? '技能變體 · ' + SKILLS[c.sk].n : '改裝'}</span><b>${c.n}</b><span class="cd">${c.d}</span>${cardN(id) ? `<span class="mute">已有 ${cardN(id)} 張</span>` : ''}</button>`; }).join('');
  showOverlay(`<b>升級了！選一張改裝卡</b><div class="mute">還有 ${G.picks} 次選擇。遊戲不會暫停。</div><div class="cards">${h}</div><button class="mb" onclick="deferChoices()">稍後再選</button> <button class="mb" onclick="toggleAuto()">自動隨機選卡</button>`);
}
function deferChoices(){ G.deferChoices = true; G.dirty = true; hideOverlay(); }
function openPendingChoices(){ if(!GAME_FEATURES.cardChoices)return; hideOverlay(); if (G.relicPicks > 0) openRelics(); else if (G.picks > 0) openCards(); }
function openRelics(){ if(!GAME_FEATURES.cardChoices)return;
  if (G.relicPicks <= 0 || G.offline) return;
  G.deferChoices = false;
  if (G.autoCard){ while (G.relicPicks > 0){ const o = rollRelics(); if (!o.length){ G.relicPicks = 0; break; } takeRelic(tPick(o)); } hideOverlay(); return; }
  if (!G.offerR || !G.offerR.length) G.offerR = rollRelics(); if (!G.offerR.length){ G.relicPicks = 0; return; }
  showOverlay(`<b>擊敗BOSS！選一件遺物</b><div class="mute">永久生效。還有 ${G.relicPicks} 次選擇。</div><div class="cards">${G.offerR.map(id => `<button class="card var" onclick="pickRelic('${id}')"><span class="ct">遺物</span>${xico('relic', id, 40)}<b>${RELICS[id].n}</b><span class="cd">${RELICS[id].d}</span></button>`).join('')}</div><button class="mb" onclick="deferChoices()">稍後再選</button>`);
}
function pickRelic(id){ if(!GAME_FEATURES.cardChoices)return; SFX('card'); takeRelic(id); hideOverlay(); G.dirty = true; if (G.relicPicks > 0) openRelics(); }
function pickCard(id){ if(!GAME_FEATURES.cardChoices)return; SFX('card'); takeCard(id); hideOverlay(); G.dirty = true; if (G.picks > 0) openCards(); }
function charHtml(){const c=CHARS[G.char];return `<section class="rc char-card"><h3>${uxEsc(G.heroName||'未命名')}</h3><p>${c.n} · ${ascendInfo()?.n||'尚未昇華'}</p><p>${c.role}</p><button class="mb" onclick="careerProfiles()">角色列表</button></section>${characterStoryHtml()}`;}
function achHtml(){
  const n = achCount(), tot = Object.keys(ACHS).filter(id=>GAME_FEATURES.cardChoices||id!=='card10'||G.ach[id]).length;
  return `<div class="rc wide"><div class="rh">成就 ${n} / ${tot}</div><div class="mute">每個成就永久傷害 +1%，目前共 +${n}%</div><ul class="ach">${Object.entries(ACHS).filter(([id])=>GAME_FEATURES.cardChoices||id!=='card10'||G.ach[id]).map(([id, a]) => `<li class="${G.ach[id] ? 'got' : 'mute'}">${obj3d('medal:'+['#8fd0ff','#ffd24d','#ff9ad0','#5dffa3','#ff9a5a','#c9a8ff'][(id.length+id.charCodeAt(0))%6],36)||xico('badge', id, 26)}<b>${a.n}</b><span>${a.d}</span><small>${G.ach[id]?'已達成':'未達成'}</small></li>`).join('')}</ul></div>`;
}
function cardsHtml(){
  const e = Object.entries(G.cards);if(!GAME_FEATURES.cardChoices)return e.length?`<section class="ui-section"><h3>既有改裝效果</h3><ul>${e.map(([id,n])=>`<li>${uxEsc(CARDS[id].n)} ×${n} · ${uxEsc(CARDS[id].d)}</li>`).join('')}</ul></section>`:''; const pend = (G.picks > 0 ? `<button class="mb" onclick="openCards()">有 ${G.picks} 次改裝待選</button> ` : '') + (G.relicPicks > 0 ? `<button class="mb" onclick="openRelics()">有 ${G.relicPicks} 次遺物待選</button> ` : '') + `<button class="mb" onclick="toggleAuto()">自動隨機：${G.autoCard ? '開' : '關'}</button>`;
  return `<div class="rc"><div class="rh">改裝卡</div>${pend}<ul>${e.length ? e.map(([id, n]) => `<li><b>${CARDS[id].n}</b> ×${n} <span class="mute">${CARDS[id].d.split('，')[0]}</span></li>`).join('') : '<li class="mute">升級時可選擇</li>'}</ul></div>`;
}

/* offline progress */
const HELP = {
  skills:['接線板說明','電路板以可用格數、洞色與供電構成。先在終點手動裝技能，再從對應起點逐格拉線；完整接通才亮燈並施放。<br>紅、藍、綠配件只可裝在同色洞，每技能最多三枚。Ⅰ／Ⅱ／Ⅲ效果為1／1.35／1.65倍，耗電1／2／3。<br>電路板可在冒險中取得，尺寸由3×3至8×8，不會自動裝備或自動接線。'],
  craft:['改機說明', '用不到的裝備會自動拆成零件。零件可以重新校準數值、改裝詞綴、升級稀有度，或賭一把腐化。<br>鎖定一條詞綴可以保住它；已腐化的裝備不能再改。'],
  maps:['冒險說明', '挑戰詞綴只表示敵人強化或取捨詞綴的數量，不是難度評分。<br>地圖詞綴讓敵人更強，但戰利品更好；每張卡下方的標籤是風險與回報彙總。<br>無限之塔每層殺滿怪上樓，每 10 層是BOSS，死亡就結束。<br>訓練場用不還手的假人量 30 秒傷害。'],
  goals:['任務與目標', '新手任務一次一個，完成後解鎖新系統。目標達成會自動給獎勵，不用手動領取。']
};
const MTN = { char:'角色', skills:'戰鬥', craft:'打造', tree:'成長', maps:'冒險', menu:'更多', dress:'角色', goals:'收藏', ach:'收藏', dex:'收藏', log:'更多', save:'更多' };
const MHELP = { skills:'skills', craft:'craft', maps:'maps', goals:'goals' };
// 戰場大小：0 大、1 中、2 小、3 收起；自動模式下，編輯技能接線時收起，其他整理頁縮小
const AUTO_FOLD={on:false,t:0,last:0};
const CUSTOM_H={v:(()=>{try{const x=parseFloat(localStorage.getItem('ih-custh'));return x>=0?x:null}catch(e){return null}})()};
const uiBattleSize=()=>AUTO_FOLD.on&&!G.userCz?3:CUSTOM_H.v!=null&&typeof MOB==='function'&&MOB()?(CUSTOM_H.v<=70?3:2):G.userCz?Math.max(1,Math.min(3,G.cz==null?1:G.cz)):AUTO_FOLD.on?3:['warehouse','skills','craft','tree','dress'].includes(modalTab)?2:1;
const CZN = ['大', '大', '小', '收'];
function mobTitle(){ uiTitle(); }
function cycleCz(){ const current = uiBattleSize(); G.cz = current >= 3 ? 1 : current + 1; G.userCz = true; G.dirty = true; mobTitle(); }
const uiHudPad=()=>MOB()&&document.body.classList.contains('ui-material')&&!document.body.classList.contains('battle-fold')&&!document.body.classList.contains('watch-mode')?72:0;
function battleFrameRatio(fig){return document.body.classList.contains('watch-mode')?(visualViewport?.height||innerHeight)/Math.max(1,fig.getBoundingClientRect().width):MOB()?mobRatio()+uiHudPad()/Math.max(1,innerWidth):Math.max(.45,Math.min(1.1,(innerHeight-150)/Math.max(1,fig.getBoundingClientRect().width)));}
function uiSyncBattleFrame(){const fig=$('fig'),vb=fig?.viewBox?.baseVal;if(!vb?.width)return;const ratio=battleFrameRatio(fig);if(Math.abs(vb.height/vb.width-ratio)>.01)fig.setAttribute('viewBox',`0 0 ${vb.width} ${vb.width*ratio}`);}
const mobRatio = () => { const i=uiBattleSize(),h=visualViewport?.height||innerHeight; if(CUSTOM_H.v!=null&&!AUTO_FOLD.on)return Math.max(30,Math.min(CUSTOM_H.v,h*.62))/Math.max(1,innerWidth); return Math.min([340,260,168,40][i],h*[.5,.36,.25,.05][i])/Math.max(1,innerWidth); };
const RISKM = Object.keys(MODS).filter(k => ['challenge','mixed'].includes(MODS[k].kind));
function runMods(R){
  const mods = R.map.mods || []; if (!mods.length) return '';
  const q = mods.reduce((a, k) => a + MODS[k].q, 0);
  return `<ul>${mods.map(k => `<li style="color:${RISKM.includes(k) ? '#d03a3a' : '#1d8a4c'}">${MODS[k].n}</li>`).join('')}</ul><div class="agg"><span>挑戰詞綴 <b>${mapChallenge(mods)}</b></span><span>戰利品 <b>+${Math.round(q*100)}%</b></span><span>金幣 <b>${mods.includes('rich') ? '+60%' : '+0%'}</b></span><span>稀有度 <b>${mods.includes('lucky') ? '提升' : '一般'}</b></span></div>`;
}
function setFilter(i){ G.filter = i; G.dirty = true; renderModal(); if(typeof uxAnnounce==='function')uxAnnounce('拾取規則：'+['全部撿','魔法以上','稀有以上'][i]); }
function rulesBar(){
  return `<div class="mc" style="margin:0 0 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>拾取規則</b>${['全部撿', '魔法以上', '稀有以上'].map((n, i) => `<button class="mb${G.filter === i ? ' on' : ''}" aria-pressed="${G.filter === i}" onclick="setFilter(${i})">${G.filter === i ? '✓ ' : ''}${n}</button>`).join('')}${qm('craft')}</div>`;
}
function lockTip(k){ const L = TAB_LVL[k]; showOverlay(`<div class="mct">尚未開放.txt</div><div style="font-size:13px;line-height:1.7">升到 ${L} 級開放${k === 'craft' ? '改機（拆裝備得零件，重洗與改裝詞綴）' : '天賦盤（升級得到的點數在這裡分配）'}。</div><button class="mb" onclick="hideOverlay()">知道了</button>`); }
function showHelp(k){ if(k==='maps')return directHelp('maps');const H = HELP[k]; if (H) showOverlay(`<div class="mct">${H[0]}.txt</div><div style="font-size:13px;line-height:1.7">${H[1]}</div><button class="mb" onclick="hideOverlay()">知道了</button>`); }
const qm = k => `<button aria-label="${HELP[k] ? HELP[k][0] : '說明'}" class="qm" onclick="showHelp('${k}')">?</button>`;
let OVERLAY_CLOSE=null;
function windowCloseOverlay(){const close=OVERLAY_CLOSE||hideOverlay;OVERLAY_CLOSE=null;close();}
function showOverlay(html,options={}){
 const o=$('ovl');o.innerHTML=`<div class="mbox small">${html}</div>`;OVERLAY_CLOSE=options.close||hideOverlay;
 const box=o.firstElementChild;if(options.surface)box.classList.add(options.surface);const heading=box.querySelector('h2,.mct'),label=options.title||heading?.textContent||box.querySelector('b')?.textContent||'遊戲提示';
 const bar=document.createElement('div');bar.className='window-titlebar';const title=document.createElement('span');title.className='window-title';title.setAttribute('role','heading');title.setAttribute('aria-level','2');title.textContent=label;bar.append(title);
 if(heading)heading.remove();const close=document.createElement('button'),back=!!options.close&&/返回/.test(options.closeLabel||'');close.type='button';close.className='mb '+(back?'window-back':'window-close');const closeLabel=back?options.closeLabel.slice(options.closeLabel.indexOf('返回')):options.closeLabel||'關閉視窗';close.setAttribute('aria-label',closeLabel);close.title=closeLabel;close.textContent=back?'←':'×';close.addEventListener('click',windowCloseOverlay);if(back)bar.prepend(close);else bar.append(close);box.prepend(bar);
 for(const button of [...box.querySelectorAll('button')])if(button.getAttribute('onclick')==='hideOverlay()'&&/^(返回|知道了|關閉)/.test(button.textContent.trim())){if(button.hasAttribute('data-initial-focus'))close.setAttribute('data-initial-focus','');button.remove();}
 const cancel=box.querySelector('[data-initial-focus]:not(:disabled)');if(!options.close&&cancel&&/^(取消|保留|繼續)/.test(cancel.textContent.trim()))OVERLAY_CLOSE=()=>cancel.click();
 uxOpenDialog(o,label,windowCloseOverlay);
}
function hideOverlay(){ OVERLAY_CLOSE=null;if(typeof LOOT_UI!=='undefined')LOOT_UI.pending=null;if(typeof CAREER_UI!=='undefined')CAREER_UI.pending=null;UI_CHARACTER_PICK=null;UI_MAP_PENDING=null;craftPending=null;UI_RESPEC=null;GEAR_PENDING=null;BUILD_PENDING=null;TALENT_CONFIRM=null;CITY_CONFIRM=null;FORGET_BUILD_PENDING=null;uxCloseDialog($('ovl')); }
function fmtDur(s){ s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? h + ' 小時 ' : '') + (m ? m + ' 分' : (h ? '' : s + ' 秒')); }
const offYield = fn => { if (typeof MessageChannel === 'function'){ const c = new MessageChannel(); c.port1.onmessage = () => { c.port1.close(); fn(); }; c.port2.postMessage(0); } else setTimeout(fn, 0); };
const OFF_WINDOW = 600;   // 離線只精確模擬前 10 分鐘，其餘用這段的收益率放大
function offlineBulk(R, f, w){
  // 放大段遞減：前 2 小時 ×0.5、之後 2 小時 ×0.3、其餘 ×0.15，離線越久越不划算，上班族不會因為關機一晚爆賺
  const eff = Math.min(R, 7200)*.5 + Math.max(0, Math.min(R - 7200, 7200))*.3 + Math.max(0, R - 14400)*.15;
  f *= eff/Math.max(1, R);
  const K = Math.round(w.kills*f), d = lvlNow(), q = runQ();
  G.totalKills += K; G.gold += Math.round(w.gold*f); G.chips += Math.round(w.chips*f); G.deaths += Math.round(w.deaths*f);
  if (w.xp > 0) gainXp(w.xp*f);
  const hit = p => { let n = 0; for (let i = 0; i < K; i++) if (Math.random() < p) n++; return n; };
  const nItems = Math.min(800, hit(HORDE.drop*(1 + q)*(offPen() ? .25 : 1)));
  // Bulk kills use the conservative normal-monster rate; never multiply an observed rare item.
  for(let i=hit(SIGNATURE_DROP.normal);i>0;i--){const gear=tPick(Object.values(SIGNATURE_GEAR));pickup({kind:'item',it:makeItem(gear.slot,3,d,gear.id)});}
  for (let i = 0; i < nItems; i++) pickup({ kind:'item', it:makeItem(tPick(Object.keys(SLOTN)), rarityRoll(false), d) });
  if(typeof skillDropFor==='function')for(let i=Math.min(8,hit(.004));i>0;i--){const id=skillDropFor({boss:false},true);if(id)pickup({kind:'skill',id});}
  for (let i = hit(.012); i > 0; i--) pickup({ kind:'cart', id:tPick(Object.keys(MODES)) });
  for (let i = hit(.025); i > 0; i--) pickup({ kind:'gem', id:tPick(Object.keys(SUPPS)) });
  for (let i = Math.min(15, hit(.03)); i > 0; i--) pickup({ kind:'map', map:makeMap(d) });
  // Bulk settlement uses normal-board odds and is bounded by the finite collection.
  for(const id of circuitPool().filter(id=>!G.circuits.includes(id)))if(Math.random()<1-Math.pow(1-.02/Math.max(1,circuitPool().length),K))collectCircuit(id);
  const boss = Math.min(Math.floor(w.boss*f), Math.floor(R/3600)); if (boss > 0){ G.bossKills = (G.bossKills || 0) + boss; if (G.push && !G.run){ G.depth += boss; G.maxDepth = Math.max(G.maxDepth, G.depth); } }
}
function catchUp(sec, report){
  if (G.paused) return;report=!!report&&sec>=180; const away = sec; sec = Math.min(sec, offCapSec());
  const b = { lvl:G.lvl, depth:G.depth, gold:G.gold, kills:G.totalKills, deaths:G.deaths, inventory:G.inventory.length,chips:G.chips, gems:{...G.gems}, carts:{...G.carts} };
  G.off = { lvls:0, eq:0, maps:0, gems:0, carts:0, cores:0, xp:0, cards:[] }; G.offline = true; G.offPen = sec > 60; G.paused = true; G.floats = []; G.fx = [];
  const simSec = Math.min(sec, OFF_WINDOW), w0 = { gold:G.gold, kills:G.totalKills, chips:G.chips, deaths:G.deaths, boss:G.bossKills || 0 };
  let left = simSec; const total = simSec;
  if (report) showOverlay(typeof returnLoadingHtml==='function'?returnLoadingHtml():`<b>離線結算中…</b><div class="mute" id="oprog">0%</div>`);
  (function chunk(){
    const t0 = performance.now();
    while (left > 0 && performance.now() - t0 < 30){
      update(.2); left -= .2;
    }
    if (left > 0){ if (report && $('oprog')) {$('oprog').textContent = Math.round((1 - left/total)*100) + '%';const bar=$('oprogbar');if(bar)bar.value=Math.round((1-left/total)*100);} offYield(chunk); return; }
    for (const d of G.drops) if (!d.done){ d.done = true; pickup(d); } G.drops = []; G.proj = []; G.timers = []; G.mons = []; G.spawnCd = .5; G.h.swingT = -1; G.h.castT = -1; G.h.dead = 0;
    if (sec > simSec){
      const w = { gold:G.gold - w0.gold, kills:G.totalKills - w0.kills, chips:G.chips - w0.chips, deaths:G.deaths - w0.deaths, boss:(G.bossKills || 0) - w0.boss, xp:G.off.xp };
      offlineBulk(sec - simSec, (sec - simSec)/simSec, w);
    }
    resolveOfflineChoices(G.off);
    if (G.h.hp <= 0) G.h.hp = G.st.life;
    G.offline = false; G.paused = false; G.lastWall = Date.now(); const o = G.off; G.off = null; G.dirty = true; const saved = saveGame();
    if (report){ showOverlay(uxOfflineReport(o,b,away,sec,saved)); }
  })();
}
function setupPanel(){
  const st = document.createElement('style');
  st.textContent = `.rpg{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:6px 0 14px;font-size:12px}
    .rc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;background:color-mix(in srgb,var(--paper) 88%,#fff);box-shadow:0 3px 0 #b9c6ee}  .nm{display:flex;align-items:center;gap:8px;margin:2px 0 4px} .nm b{font-size:13px} .ico{flex:none;overflow:visible} .rc.wide{grid-column:1/-1}
    .rh{display:flex;justify-content:space-between;gap:8px;font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:4px}
    .rc ul,.rc ol{margin:4px 0 0;padding-left:16px} .rc li{margin:1px 0} .rc li.imp{color:var(--muted)} .mute{color:var(--muted);font-size:11px}
    .log{max-height:130px;overflow:auto;list-style:none;padding-left:0 !important} .log li{margin:2px 0}
    .actions{gap:5px !important} .act{padding:3px 12px !important;font-size:12px}
    .modal{position:fixed;inset:0;background:rgba(43,37,82,.45);display:flex;align-items:center;justify-content:center;z-index:20;padding:12px} .modal[hidden]{display:none}
    .mbox{background:var(--paper);border:1.5px solid var(--ink);border-radius:14px;box-shadow:0 4px 0 #b9c6ee;width:min(720px,100%);max-height:90vh;overflow:auto;padding:14px;font-size:12.5px} .mbox.small{width:min(420px,100%)}
    .mtabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap} .tab{padding:3px 12px;font-size:12px} .tab.on{background:var(--ink);color:var(--paper)} .tab.x{margin-left:auto} .mb.pri{background:#e2583d !important;color:#fff !important;border-color:#8a2a18 !important;font-weight:700} .mct::before{content:'✦ ';color:#e2583d} .nw{position:absolute;top:-6px;right:-4px;background:#e2583d;color:#fff;font-style:normal;font-size:10px;padding:0 4px;z-index:2} .gt{position:relative} #modtxt{position:absolute;left:8px;top:8px;z-index:3;font-size:11px;line-height:1.5;opacity:.5;pointer-events:none;color:#2b2552;text-shadow:0 0 3px #fff,0 0 3px #fff} body.m #modtxt{top:64px} .pzbar{position:sticky;bottom:-8px;background:var(--paper);padding:4px 0;z-index:4} .agg{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-top:4px;font-size:12px}
    /* Y2K 低像素感：階梯狀切角、掃描線標題、方形圓點 */
    body{-webkit-font-smoothing:none;text-rendering:optimizeSpeed} #loot{position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:35;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;width:min(300px,86vw)}
    .lt{width:100%;background:var(--paper);border:2px solid var(--rc);box-shadow:3px 3px 0 var(--rc);padding:4px 10px;animation:ltin .35s cubic-bezier(.2,1.6,.4,1);transition:opacity .6s,transform .6s;font-size:12px}
    .lt.out{opacity:0;transform:translateY(-12px)} .lt .lh{display:flex;gap:8px;align-items:baseline} .lt .lh span{background:var(--rc);color:#fff;padding:0 6px;font-size:11px} .lt .lh b{font-size:15px;color:var(--rc);flex:1} .lt .lh i{font-style:normal;color:#8a8a99;font-size:11px} .lt .ll.lg{color:#c4501f}
    .lt.r2{background:linear-gradient(#fff8dc,var(--paper))} .lt.r3{background:linear-gradient(#ffe2cf,var(--paper));animation:ltin .35s cubic-bezier(.2,1.6,.4,1),ltglow 1s ease-in-out infinite alternate;padding:8px 12px;font-size:13px} .lt.r3 .lh b{font-size:19px}
    @keyframes ltin{from{transform:scale(.5) translateY(-20px);opacity:0}to{transform:none;opacity:1}} @keyframes ltglow{from{box-shadow:3px 3px 0 var(--rc),0 0 6px var(--rg)}to{box-shadow:3px 3px 0 var(--rc),0 0 22px var(--rg)}} .dpsbar{position:sticky;top:-8px;z-index:5;background:var(--paper);border:1.5px solid var(--ink);padding:4px 8px;margin:0 0 8px;font-size:13px} .dpsbar .shares{display:flex;gap:2px;margin-top:3px} .dpsbar .shares span{background:#ffb4d2;font-size:11px;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:clip;min-width:0} .rchips{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0} .chip{font-size:11px;padding:0 8px;border-radius:999px;border:1.5px solid} .chip.ok{color:#1d8a4c;border-color:#1d8a4c} .chip.bad{color:#d03a3a;border-color:#d03a3a} .qm{display:inline-block;width:16px;height:16px;line-height:14px;text-align:center;font-size:11px;border:1.5px solid var(--ink);border-radius:50%;background:var(--paper);cursor:pointer;margin-left:6px;vertical-align:middle;padding:0} .rd{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e2483d;margin-left:4px;vertical-align:middle} #pzdelta b.up{color:#1d8a4c} #pzdelta b.dn{color:#d03a3a} #nexthint{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:30;background:var(--paper);color:var(--ink);border:1.5px solid var(--ink);border-radius:999px;padding:3px 14px;font-size:12px;cursor:pointer;box-shadow:2px 2px 0 rgba(31,63,176,.35);max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #nexthint[hidden]{display:none} .subtabs{flex:1 0 100%;display:flex;gap:4px;padding-top:2px} .tab.sub{font-size:11px;padding:1px 10px;border-style:dashed}
    .mrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px} .mc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;box-shadow:0 2px 0 #b9c6ee} .mc.dim{opacity:.5} .mc.run{margin-bottom:10px;border-style:dashed}
    .mc ul{margin:4px 0 6px;padding-left:16px} .hint{color:var(--muted);font-size:11.5px;margin:4px 0 8px;line-height:1.5} .hint b{color:var(--ink)}
    .srow{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px} select,.sv{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:3px 6px;max-width:100%}
    .mc>select{display:block;margin:6px 0} .treebox{position:relative;width:100%;max-width:520px;margin:0 auto 6px} .treebox .treecv{display:block;width:100%;aspect-ratio:1;image-rendering:pixelated;image-rendering:crisp-edges;border:3px solid #fff;box-shadow:0 0 0 2px #7d8bbd;box-sizing:border-box;background:#dfe9ff} body #mbody .treebox svg.tree{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);margin:0!important;max-width:none;background:none!important;border:0!important;box-shadow:none!important;outline:none} body.ui-material #mbody .treebox svg.tree{background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important} body.ui-material #mbody .treebox svg.tree .tn :is(circle,polygon){fill:transparent!important;stroke:none!important;animation:none!important} body.ui-material #mbody .treebox svg.tree>line{display:none} .treebox .tn.open .tnb{animation:tnblink 1s steps(2) infinite} .treebox .tn:focus-visible .tnb,.treebox .tn:focus-visible circle{outline:none;stroke:#e2583d} @keyframes tnblink{50%{opacity:0}} @media(prefers-reduced-motion:reduce){.treebox .tn.open .tnb{animation:none}} .tree{width:100%;max-width:520px;display:block;margin:0 auto 6px;background:radial-gradient(circle,rgba(111,196,245,.22) 1.6px,transparent 2px) 0 0/16px 16px,linear-gradient(#ffffff,#e6f1ff);border:3px solid #fff;box-shadow:0 0 0 2px #aab8ee;border-radius:18px} .tn.open circle,.tn.open polygon{animation:tp 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center} @keyframes tp{50%{transform:scale(1.12)}}
    .ach{padding-left:0;list-style:none;margin:6px 0 0}.ach li{margin:3px 0}.ach .got{color:#a87400}
    .chars{display:flex;gap:6px;margin:4px 0}.chr{font:inherit;flex:1;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px;cursor:pointer;display:flex;flex-direction:column;font-size:13px}.chr.on{background:#d9e6ff;box-shadow:inset 0 0 0 2px #4a7fdc}.chr[disabled]{opacity:.5;cursor:default}.chr .mute{font-size:10px}
    .cards{display:flex;gap:8px;margin:10px 0}.mbox.small:has(.cards){width:min(470px,94vw)}
    .card{font:inherit;color:var(--ink);background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:8px 10px;flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px;text-align:left;cursor:pointer;box-shadow:3px 3px 0 var(--ink)}
    .card.var{background:#efe3ff;border-color:#8e3fd1}.card .ct{font-size:11px;opacity:.7}.card .cd{font-size:12px}.card:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
    .mb.on{background:var(--ink);color:var(--paper)} .mb{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:4px 14px;cursor:pointer} .mb[disabled]{opacity:.4;cursor:default}
    .sv{width:100%;height:90px;margin-top:8px;resize:vertical} .hbar{display:block;width:96px;height:8px;border:1.5px solid var(--ink);border-radius:5px;margin:4px 0 0 auto;background:#fffb;overflow:hidden;box-shadow:0 1px 0 #b9c6ee} .hbar i{display:block;height:100%;border-right:1.5px solid var(--ink)} .gl{margin:4px 0;padding-left:16px}`;

  /* Y2K 童話風介面：泡泡視窗（白到淡藍漸層、白色內框、粉彩外框）、糖果按鈕、緞帶標題、膠囊血條 */
  st.textContent += `
    :root{--bub:#b9c6ee;--bubd:#8f9fe0;--cream:#fffaf0}
    body{font-family:"Cubic 11","Arial Rounded MT Bold","Hiragino Maru Gothic ProN","jf-openhuninn","Microsoft JhengHei","PingFang TC","Noto Sans TC",system-ui,sans-serif}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#ffffff 0%,#edf5ff 100%) !important;border:3px solid #fff !important;border-radius:20px !important;
      box-shadow:0 0 0 2px var(--rc,var(--bub)),0 5px 0 2px var(--rc,var(--bubd)),0 10px 18px #7f90d840 !important;padding:10px 12px !important}
    .rc.item{--rc:#b9c6ee}
    .rh{background:var(--rc,var(--bub));color:#fff !important;border-radius:12px;padding:2px 10px;margin:-4px -2px 8px !important;font-weight:800;letter-spacing:.06em !important;text-shadow:0 1px 0 #00000030}
    .rh .mute{color:#ffffffd0 !important}
    .act,.chip,.mb,.tab,button:not(.sw){background:linear-gradient(180deg,#ffffff 0%,#d9e6ff 100%) !important;border:2px solid var(--bubd) !important;color:var(--ink) !important;font-weight:700;
      box-shadow:0 3px 0 var(--bubd),inset 0 1px 0 #fff !important;transition:transform .08s}
    .act:hover,.chip:hover,.mb:hover,.tab:hover{transform:translateY(-1px);background:linear-gradient(180deg,#fff 0%,#e3f0ff 100%) !important}
    .act:active,.chip:active,.mb:active{transform:translateY(2px);box-shadow:0 1px 0 var(--bubd) !important}
    .tab.on,.chip.current{background:linear-gradient(180deg,#8fb6ff,#5f8fe8) !important;color:#fff !important;text-shadow:0 1px 0 #00000030}
    .chips{background:linear-gradient(180deg,#fff,#edf5ff) !important;border:3px solid #fff !important;border-radius:18px !important;box-shadow:0 0 0 2px var(--bub),0 5px 0 2px var(--bubd) !important}
    .hbar{height:11px !important;width:104px !important;border:2px solid var(--bubd) !important;border-radius:999px !important;background:#fff !important;box-shadow:inset 0 2px 0 #00000012 !important}
    .hbar i{border-right:0 !important;border-radius:999px;background-image:linear-gradient(180deg,#ffffff70,#ffffff00 55%,#00000018) }
    .toast{border-radius:999px !important;border:2px solid var(--bubd) !important;box-shadow:0 3px 0 var(--bubd) !important}
    .modal{background:rgba(120,140,210,.45) !important;backdrop-filter:blur(3px)}
    select,.sv{border:2px solid var(--bubd) !important;border-radius:12px !important}
    header h1{font-size:15px !important;letter-spacing:.08em;color:#fff;text-shadow:0 2px 0 var(--bubd),0 0 8px #7f90d8}
    .actions .cap{color:#fff !important;text-shadow:0 1px 0 var(--bubd)}
    .stat .k{color:#5b6aa8 !important} .stat .v{text-shadow:0 2px 0 #fff,0 0 10px #fff}
  `;
  st.textContent += `
    body::before{content:'';position:fixed;left:0;right:0;top:0;height:45%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(255,255,255,.4) 3px,transparent 3.5px) 0 0/28px 28px;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)}
    header h1{display:block;margin:0;line-height:0} header h1 .wm{width:min(230px,42vw);height:auto;overflow:visible;filter:drop-shadow(0 2px 0 rgba(43,37,82,.25))}
    header h1 .lg{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:3px solid #fff;color:#fff;font:900 16px/1 'Arial Rounded MT Bold','Nunito',system-ui,sans-serif;text-shadow:0 1px 0 rgba(43,37,82,.35);box-shadow:0 2px 0 rgba(43,37,82,.25);letter-spacing:0}
    header h1 .lg:nth-child(4n+1){background:#ff8fc4}header h1 .lg:nth-child(4n+2){background:#ffd35a}header h1 .lg:nth-child(4n+3){background:#6fc4f5}header h1 .lg:nth-child(4n){background:#7fdcae}
    header h1 .gap{width:8px}
    .spr{display:inline-block;vertical-align:middle;flex:none;image-rendering:auto}
    .controls{display:none}`;
  /* 作業系統視窗風：藍色漸層標題列、視窗鈕、斜角邊框、凹陷內容區、黑底事件框、底部工作列（參考 Win98／XP 與 Y2K 個人網頁參考圖） */
  st.textContent += `
    :root{--win:#e6ecfa;--wlt:#ffffff;--wdk:#7d8bbd;--wbd:#2f3f8f}
    .rc,.mc,.mbox{background:var(--win) !important;border:1px solid var(--wbd) !important;border-radius:4px !important;
      box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855 !important;padding:8px 10px 10px !important}
    .rh{background:linear-gradient(90deg,var(--rc,#1f3fb0),#7fb0ff) !important;border-radius:2px !important;margin:-4px -6px 8px !important;padding:2px 6px 2px 8px !important;display:flex;align-items:center;font-size:11.5px}
    .rh::after{content:none;display:none;margin-left:8px;flex:none;font-size:9px;letter-spacing:2px;color:var(--wbd);background:var(--win);border:1px solid #fff;border-right-color:var(--wdk);border-bottom-color:var(--wdk);padding:0 4px;text-shadow:none;line-height:13px}
    .rh>:first-child{margin-right:auto}
    .rc ul,.rc ol{background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:2px;padding:6px 8px 6px 22px !important;margin-top:2px}
    .rc .nm+ul,.rc .nm~ul{margin-top:4px}
    .rc.wide ol.log{background:#14123a;border-color:#000 #5a6bb8 #5a6bb8 #000;padding:6px 10px !important;line-height:1.55}
    .rc.wide ol.log li{color:#f2f6ff !important} .rc.wide ol.log li::before{content:'♥ ';color:#ff8fb8}
    .mbox::before{content:'★ Idle Hero.exe  ' var(--ver);display:block;margin:-8px -10px 10px;padding:3px 10px;color:#fff;font-weight:800;font-size:12px;letter-spacing:.06em;white-space:pre;overflow:hidden;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);text-shadow:0 1px 0 #00000040;position:sticky;top:-8px;z-index:2}
    .stats{background:var(--win);border:1px solid var(--wbd);border-radius:4px;box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855;padding:22px 12px 8px !important;gap:6px !important}
    .stats::before{content:'STATUS';position:absolute;left:0;right:0;top:0;padding:1px 8px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.08em;color:#fff;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);border-radius:3px 3px 0 0}
    .stat .k{color:#3a4a90 !important} .stat .v{text-shadow:none !important}
    .tfoot{position:fixed;left:0;right:0;bottom:0;height:30px;z-index:15;display:flex;align-items:center;gap:8px;padding:0 8px;background:linear-gradient(180deg,#6fa0f5,#2f5fd0);border-top:2px solid #9fc4ff;color:#fff;font:700 12px/1 system-ui,sans-serif;box-shadow:0 -2px 8px #2f3f8f40}
    .tfoot .start{background:linear-gradient(180deg,#5fd07a,#2f9f4a);border:1px solid #1f7a35;border-radius:0 10px 10px 0;padding:5px 12px 5px 8px;font-style:italic;text-shadow:0 1px 0 #00000050}
    .tfoot .task{background:#ffffff30;border:1px solid #ffffff60;border-radius:3px;padding:4px 10px;font-weight:600}
    .tfoot .clk{margin-left:auto;background:#1f3fb040;border-left:1px solid #ffffff50;padding:6px 10px}
    .stat .v{font-size:24px !important} .stat.small .v{font-size:17px !important} .stats{min-width:120px}
    @media (max-width:560px){.stats{position:relative !important;display:grid !important;grid-template-columns:1.2fr 1.4fr .8fr .8fr;align-items:end;gap:4px 10px !important;text-align:center !important}.stats .stat{display:flex;flex-direction:column;align-items:center}.stats .hbar{margin:4px auto 0 !important;width:64px !important}
      body .rpg{grid-template-columns:repeat(2,minmax(0,1fr)) !important}body .rpg .rc.wide{grid-column:1/-1}.stats .stat{width:100%}.rc{font-size:11.5px}}
    header,.stage,#fig,.rpg{max-width:1040px !important} .rpg{grid-template-columns:repeat(auto-fit,minmax(190px,1fr)) !important}
    .actions .cap{display:none !important}
    .mct{font-weight:800;font-size:12.5px;color:var(--wbd)}
    .mc.slot{cursor:pointer} .mc.slot.act{box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk),0 0 0 2px #ff8fb8,3px 4px 0 #5a6bb855 !important}
    .gls{display:grid;gap:6px;margin-top:6px} .gl{position:relative;display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:6px 8px 10px;background:#fff;border:1px solid var(--wdk);border-radius:4px;font-size:12px}
    .ui-obj3d{display:inline-block;vertical-align:middle;margin-right:6px;flex:none}.ach li.mute .ui-obj3d{filter:grayscale(1);opacity:.45}.gl b{display:flex;align-items:center}
    .gl span{grid-column:1/2;font-size:11px} .gl em{grid-row:1;grid-column:2;font-style:normal;font-size:11px;color:var(--muted)} .gl.ok{background:#fff6d6} .gl.ok em{color:#a07000;font-weight:700}
    .gl i{position:absolute;left:0;bottom:0;height:4px;width:var(--p);background:#ff8fb8;border-radius:0 2px 0 4px}
    .pz{display:grid;width:100%;gap:3px;margin:8px 0;max-width:420px;touch-action:pan-y}
    .pc{aspect-ratio:1;min-width:0;overflow:hidden;max-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:700;text-align:center;cursor:pointer;color:var(--ink);padding:2px;border-radius:3px;
      background:radial-gradient(circle at 50% 50%,#c7d0ee 0 1.5px,transparent 2px) 0 0/10px 10px,#f1f4ff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;box-shadow:inset 1px 1px 0 #9aa6d6;user-select:none;-webkit-user-select:none}
    .pc.lock{background:repeating-linear-gradient(45deg,#cfd6ef 0 4px,#dfe5f7 4px 8px);color:var(--muted);cursor:default;font-weight:400;box-shadow:none}
    .pc.fill{touch-action:none;background:linear-gradient(135deg,#ffffffaa 0,#ffffff00 45%),var(--pc);border:2px solid #fff;border-right-color:#0003;border-bottom-color:#0003;box-shadow:none}
    .pc.fill.jr{border-right:0;margin-right:-4px;padding-right:6px;border-top-right-radius:0;border-bottom-right-radius:0} .pc.fill.jb{border-bottom:0;margin-bottom:-4px;padding-bottom:6px;border-bottom-left-radius:0;border-bottom-right-radius:0}
    .pc.fill.jr + .pc.fill{border-left:0;border-top-left-radius:0;border-bottom-left-radius:0}
    .pc.sel{outline:3px solid #2f7fc4;outline-offset:-3px;z-index:1} .pc.lnk{outline:3px solid #3fd88a;outline-offset:-3px} .pc.sel.lnk{outline-color:#2f7fc4}
    .pc.pv.ok{background:#b8f5d0 !important;border:2px solid #3fd88a !important} .pc.pv.bad{background:#ffc4c4 !important;border:2px solid #e2483d !important}
    .pzbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap} .gt.on{box-shadow:0 0 0 2px #ff8fb8 !important}
    .shp{display:inline-grid;gap:1px;vertical-align:middle;margin:0 2px} .shp i{width:9px;height:9px;border:1px solid #fff;border-radius:1px} .shp i.e{border:0;background:none}
    .pzghost{position:fixed;z-index:99;pointer-events:none;transform:translate(-50%,-50%) scale(1.8);opacity:.85;filter:drop-shadow(2px 3px 0 #2f3f8f66)}
    .skb{touch-action:none} .gt .shp{touch-action:none;padding:8px 6px}
    .skb{width:auto !important;min-width:40px;gap:4px;padding:0 4px !important;display:flex !important;align-items:center}
    .skrow{display:flex;gap:6px;margin:8px 0 6px;flex-wrap:wrap}
    .skb{width:40px;height:40px;padding:0 !important;border-radius:4px !important;display:grid;place-items:center;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .skb.on{background:#fff !important;box-shadow:inset 1px 1px 0 var(--wdk),inset -1px -1px 0 #fff,0 0 0 2px #ff8fb8 !important} .skb[disabled]{opacity:.35;filter:grayscale(1)}
    .socks{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 6px}
    .sock{min-height:34px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--muted);background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:3px;padding:2px 4px !important}
    button.sock{box-shadow:none !important;background:#fff !important;border-radius:3px !important;font-weight:700;color:var(--ink) !important}
    .gem{display:inline-block;flex:none}
    .gems{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
    .gt{display:grid !important;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:0 8px;align-items:center;text-align:left;border-radius:4px !important;padding:6px 8px !important;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .gt .gem{grid-row:1/3} .gt em{font-style:normal;font-size:11px;background:#14123a;color:#fff;border-radius:3px;padding:0 5px} .gt small{grid-column:2/4;font-size:10.5px;color:var(--muted);font-weight:500;line-height:1.35}
    .gt[disabled]{opacity:.45}
    select{appearance:none;-webkit-appearance:none;background:#fff linear-gradient(var(--win),var(--win)) no-repeat right/22px 100% !important;border-radius:3px !important;border:1px solid var(--wdk) !important;padding:3px 26px 3px 6px !important}
    .dlg{position:absolute;left:50%;transform:translate(-50%,12px);width:min(520px,92%);z-index:4;background:#14123a;color:#f2f6ff;border:2px solid #fff;outline:2px solid var(--wbd);border-radius:6px;padding:8px 34px 12px 12px;font-size:13px;line-height:1.5;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;box-shadow:4px 5px 0 #2f3f8f55}
    .dlg.show{opacity:1;transform:translate(-50%,0)} .dlg b{display:block;color:#8fd0ff;font-size:11px;letter-spacing:.12em} .dlg::after{content:'♥';position:absolute;right:10px;bottom:6px;color:#ff8fb8;animation:dlgb 1s infinite}
    .dlg i{position:absolute;left:12px;right:34px;bottom:4px;height:3px;background:repeating-linear-gradient(90deg,#8fb6ff 0 8px,transparent 8px 11px);transform-origin:left;animation:dlgt 2.6s linear forwards}
    @keyframes dlgb{50%{transform:translateY(-2px)}} @keyframes dlgt{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    body.m{height:100vh;height:100dvh;overflow:hidden;padding:env(safe-area-inset-top) 0 calc(56px + env(safe-area-inset-bottom)) !important;gap:0;display:flex;flex-direction:column}   /* 手機：戰鬥區在上、面板在下，分頁列固定在最底 */
    body.m>header,body.m #readout{display:none}
    body.m .stage{flex:none;position:relative;width:100%} body.m #fig{margin:0;display:block;width:100%}
    body.m .stats{position:absolute !important;top:4px;left:6px;right:6px;z-index:4;padding:3px 8px !important;margin:0 !important;background:rgba(242,247,255,.82);border:1.5px solid var(--ink);grid-template-columns:1.3fr 1.5fr .8fr .8fr .9fr} body.m .stats::before{display:none}
    body.m .stat .k{font-size:11px} body.m .stat .v{font-size:16px !important} body.m .stat.small .v{font-size:15px !important}
    body.m #nexthint{position:absolute;left:6px;bottom:6px;top:auto;transform:none;max-width:62%;z-index:4;font-size:12px;padding:4px 10px;min-height:28px}
    body.m #ctxbtn{position:absolute;right:8px;bottom:8px;width:56px;height:56px;z-index:4;font:inherit;font-size:13px;background:var(--paper);border:2px solid var(--ink);box-shadow:2px 2px 0 rgba(31,63,176,.4);cursor:pointer;clip-path:none;border-radius:50%}
    body.m #loot{top:64px}
    #ctxbtn{display:none} body.m #ctxbtn:not([hidden]){display:block}
    body.m #mttl{flex:none;height:32px;display:flex;align-items:center;gap:6px;padding:0 6px 0 10px;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);color:#fff;font-size:14px;font-weight:700;border-bottom:2px solid #0b1f6b}
    body.m #mttl span{flex:1} body.m #mttl button{width:28px;height:28px;padding:0;background:var(--paper);border:1.5px solid var(--ink);font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}
    body.m .rpg{display:none}
    body.m #modal{position:static;display:flex;flex:1 1 0;min-height:0;height:auto;width:100%;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.m .mbox{width:100%;max-height:none;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:0 !important}
    body.m .mbox::before{display:none}
    body.m .mtabs{display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin:0;position:fixed;left:0;right:0;bottom:0;z-index:40;height:calc(56px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:linear-gradient(90deg,#1f3fb0,#7fb0ff);box-shadow:0 -2px 0 #0b1f6b} body.m .tab .rd{position:absolute;top:4px;right:calc(50% - 20px);margin:0} body.m .tab{position:relative} body.m .tab.lock{opacity:.55} body.m .tab svg,body.m .tab canvas,body.m .tab .spr{width:24px !important;height:24px !important}
    body.m .tab{display:flex !important;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 0 3px !important;font-size:12px;min-height:44px;border-radius:0 !important;border:0 !important;border-right:1px solid #ffffff55 !important;box-shadow:none !important;background:transparent !important;color:#fff !important;text-shadow:0 1px 0 #00000040}
    body.m .tab.on{background:var(--win) !important;color:var(--wbd) !important;text-shadow:none;margin-top:-4px;padding-top:8px !important;border-radius:6px 6px 0 0 !important;box-shadow:0 -2px 0 #fff inset !important}
    body.m #mbody{flex:1;overflow:auto;padding:8px;-webkit-overflow-scrolling:touch}
    body .idc{background:#fff6cf;border:3px solid #2b2552;border-radius:6px;padding:8px 10px 10px;margin-bottom:8px;box-shadow:inset 0 0 0 2px #fff6cf,inset 0 0 0 4px #b8884a;color:#3a2330}
    body .idh{font-size:18px;letter-spacing:.12em;text-align:center;font-weight:700} body .ids{text-align:center;background:#5a2a3a;color:#fff6cf;margin:4px 14px 8px;border-radius:10px;font-size:11px;padding:1px 0}
    body .idb{display:flex;gap:10px} body .idp{flex:0 0 38%;aspect-ratio:3/4;border:3px solid #5a2a3a;background:linear-gradient(180deg,#d8efff,#f4fbff);border-radius:3px;overflow:hidden}
    body .idf{flex:1;display:flex;flex-direction:column;justify-content:space-between} body .idr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5a2a3a;padding:2px 2px;font-size:12px}
    body .idr input{width:7em;text-align:right;font:inherit;border:0;background:transparent;color:inherit;border-bottom:1px dashed #5a2a3a} body .idt{text-align:center;margin-top:6px;border-top:2px solid #5a2a3a;padding-top:4px;font-size:14px}
    body .isr{display:flex;justify-content:center;gap:3px;margin-top:3px} body .isr i{width:12px;height:12px;background:#d8c6a0;clip-path:polygon(50% 0,62% 36%,100% 38%,70% 60%,80% 100%,50% 76%,20% 100%,30% 60%,0 38%,38% 36%)} body .isr i.on{background:#ff9a3c} body .isr.big i{width:22px;height:22px}
    body .dcats{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0} body .dcats .mb.on{background:#ffd6ea !important} body .dsw{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
    body .sw{width:100%;display:flex !important;flex-direction:column;align-items:center;gap:2px;height:auto !important;min-height:72px;padding:5px 2px !important;border-radius:6px !important;font-size:11px;line-height:1.15;white-space:normal !important;overflow:visible} body .sw span{display:block} body .sw i{width:30px;height:30px;border:2px solid #2b2552;border-radius:4px;display:block;font-style:normal;text-align:center;line-height:26px;font-size:14px} body .sw.on{background:#ffd6ea !important;outline:2px solid #ff6aa8} body .sw.cur{box-shadow:0 0 0 2px #3fa86a} body .sw em{font-style:normal;color:var(--muted);font-size:10px}
    body .dact{display:flex;align-items:center;gap:8px;margin-top:8px}
    body .cft li{display:flex;justify-content:space-between;gap:6px;align-items:center} body .cft .lk{cursor:pointer;opacity:.5;padding:0 8px !important;min-width:0;height:22px;line-height:18px;flex:none} body .cft .rc{margin-top:6px} body .cft .lk.on{opacity:1} body .cft .cb{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    body .rc li.lgd{color:#c4501f;font-weight:bold} body .lg{margin:6px 0 10px} body .lg ul{margin:3px 0 0 18px;padding:0} body .lg li{margin:2px 0}
    body.m #mmenu{padding:8px 8px 0} body.m #mmenu .actions{position:static !important;display:flex !important;flex-direction:row !important;flex-wrap:wrap;gap:6px !important;max-width:none}
    body.m #mmenu .chips{left:0 !important;top:calc(100% + 6px) !important}
    .rpgm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:11.5px} .rpgm .rc.wide{grid-column:1/-1}
    body.m .mrow{grid-template-columns:1fr} body.m .gems{grid-template-columns:1fr 1fr}
    body{padding-bottom:44px !important}
    body.d{display:grid !important;grid-template-columns:272px minmax(0,1fr) 350px;grid-template-areas:"hd hd hd" "lf st rt";gap:12px;align-items:start;justify-items:stretch;max-width:1680px;margin:0 auto !important;padding:8px 16px 44px !important}
    body.d header{grid-area:hd;max-width:none !important} body.d .stage{grid-area:st;max-width:none !important;width:100%} body.d #fig{max-width:none !important}
    body.d .rpg{grid-area:lf;display:flex !important;flex-direction:column;max-width:none !important;margin:0;gap:8px;max-height:calc(100vh - 122px);overflow:auto}
    body.d #modal{grid-area:rt;position:sticky;top:8px;display:flex;width:100%;height:calc(100vh - 122px);min-height:480px;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.d .mbox{width:100%;max-height:none;height:100%;overflow:auto;padding:14px}
    body.m .mbox.small,body.d .mbox.small,body .mbox.small{width:min(520px,92vw) !important;height:auto !important;max-height:80vh !important;overflow:auto !important;padding:10px 14px 14px !important;display:block !important}
    body.m .mbox.small::before,body.d .mbox.small::before{display:block}
    body.d .mtabs{margin-bottom:8px}`;
  { const tb = document.createElement('div'); tb.className = 'tfoot'; tb.innerHTML = '<span class="start">★ Start</span><span class="task">Idle Hero</span><span class="clk" id="clk"></span>'; document.body.appendChild(tb);
    const tick = () => { const d = new Date(); $('clk').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }; tick(); setInterval(tick, 20000); }   // the engine's wobble slider and colour swatches are not part of the game

  st.textContent += `
    /* 老式擬真 3D 質感：玻璃凝膠按鈕、金屬斜角視窗框、LCD 像素格、螢幕玻璃反光 */
    .mb,.tab,.chip{background:linear-gradient(180deg,#ffffff 0%,#e6efff 46%,#bccdf0 52%,#dbe7ff 100%) !important;border:1.5px solid #6f82c8 !important;border-radius:999px !important;color:#2b2552;text-shadow:0 1px 0 #fff;
      box-shadow:0 0 0 2px #fff,0 3px 0 2px #7d8bbd,0 6px 8px rgba(43,37,82,.28),inset 0 1px 0 #fff !important;transition:transform .08s}
    .mb:hover,.tab:hover{background:linear-gradient(180deg,#ffffff 0%,#f0f6ff 46%,#cddcf7 52%,#e8f0ff 100%) !important} .mb:active,.tab:active{transform:translateY(2px);box-shadow:0 0 0 2px #fff,0 1px 0 2px #7d8bbd,inset 0 2px 3px rgba(43,37,82,.25) !important}
    .mb[disabled]{opacity:.55;filter:grayscale(.6)} .tab.on{background:linear-gradient(180deg,#b9d2ff 0%,#6f9cf0 48%,#3f74dc 52%,#6f9cf0 100%) !important;color:#fff !important;text-shadow:0 1px 0 #1a3a99}
    .mb.pri{background:linear-gradient(180deg,#ffd2c2 0%,#ff9a7c 46%,#e2483d 52%,#f2755a 100%) !important;border-color:#8a2a18 !important;color:#fff !important;text-shadow:0 1px 0 #8a2a18}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#f6f9ff 0%,#dfe8fa 100%) !important;border:2px solid #fff !important;outline:1px solid #7d8bbd;border-radius:10px !important;
      box-shadow:inset 0 1px 0 #fff,0 2px 0 #aab6dc !important}
    .rh,.mbox::before{border-radius:6px 6px 2px 2px !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(0,0,60,.25)}
    .stats{background:linear-gradient(180deg,rgba(240,247,255,.92),rgba(196,216,250,.86)) !important;border:2px solid #fff !important;border-radius:12px !important;box-shadow:0 0 0 1px #7d8bbd,0 3px 6px rgba(43,37,82,.3),inset 0 1px 0 #fff !important}
    body:not(.m) .stats{flex-direction:row !important;align-items:center;gap:12px !important;top:8px !important;right:8px !important;padding:3px 12px !important} body:not(.m) .stats::before{display:none}
    body:not(.m) .stat{display:flex !important;flex-direction:row;align-items:baseline;gap:5px;width:auto} body:not(.m) .stat .k{font-size:10px} body:not(.m) .stat .v{font-size:15px !important} body:not(.m) .hbar{width:64px !important;height:9px !important;margin-left:4px}
    body.m .stat .k{font-size:9px;line-height:1} body.m .stat .v{font-size:14px !important;line-height:1.1} body.m .stats{padding:2px 8px !important;top:6px;left:8px;right:8px} body.m .hbar{height:8px !important}
    body.m .mtabs{background:linear-gradient(180deg,#eef2fa 0%,#b9c3dc 50%,#cfd7ea 52%,#a3afcf 100%) !important;border-top:2px solid #fff;box-shadow:0 -3px 8px rgba(43,37,82,.3) !important}
    body.m .tab{margin:4px 3px !important;min-height:46px;border-radius:14px !important;color:#2b2552 !important;text-shadow:0 1px 0 #fff !important;background:linear-gradient(180deg,#fff 0%,#e9f0ff 46%,#c0d0f2 52%,#dfe9ff 100%) !important;border:1.5px solid #6f82c8 !important;box-shadow:0 2px 0 #7d8bbd,inset 0 1px 0 #fff !important}
    body.m .tab.on{margin-top:0 !important;color:#fff !important;text-shadow:0 1px 0 #1a3a99 !important;background:linear-gradient(180deg,#b9d2ff 0%,#6f9cf0 48%,#3f74dc 52%,#6f9cf0 100%) !important;border-radius:14px !important;box-shadow:0 1px 0 #1a3a99,inset 0 1px 0 #fff !important}
    svg.tree{border-radius:12px !important;border:2px solid #fff !important;outline:1px solid #7d8bbd;background:radial-gradient(circle at 50% 45%,#ffffff,#dbe6fb) !important;box-shadow:inset 0 3px 8px rgba(40,60,130,.28),0 2px 0 #8c9bd0 !important}
    .rc ul,.rc ol{background:linear-gradient(180deg,#f3f8ff,#e6eefc) !important;border:1px solid #8c9bd0 !important;border-radius:6px !important;box-shadow:inset 0 2px 3px rgba(40,60,130,.22),0 1px 0 #fff}
    .gt,.skb,.gl{border-radius:8px !important;box-shadow:inset 0 1px 0 #fff,0 2px 0 #aab6dc !important}
    .pz{padding:6px;background:linear-gradient(180deg,#9fb0d8,#c6d2ee);border:2px solid #fff;outline:1px solid #7d8bbd;border-radius:12px;box-shadow:inset 0 3px 6px rgba(30,40,100,.35),0 2px 0 #8c9bd0}
    .pc:not(.fill):not(.lock){background:radial-gradient(circle at 50% 50%,#8294c4 0 18%,#b4c2e6 20%);border-radius:7px;border:1px solid #7d8bbd;box-shadow:inset 0 2px 3px rgba(30,40,100,.4),0 1px 0 #fff}
    .pc.fill{border-radius:8px;box-shadow:inset 0 2px 0 rgba(255,255,255,.85),inset 0 -3px 0 rgba(0,0,60,.28),0 2px 0 rgba(30,40,100,.4) !important;text-shadow:0 1px 0 rgba(255,255,255,.7)}
    .ach li.mute .spr{filter:grayscale(1);opacity:.45}
    .rz{font-size:11.5px;margin:2px 0 4px;color:#1f3fb0;background:#eaf1ff;border:1px solid #9fb2e8;border-radius:6px;padding:2px 8px}
    .stage #loot{position:absolute;left:8px;bottom:8px;top:auto;transform:none;align-items:flex-start;width:min(240px,60%);z-index:5;flex-direction:column-reverse}
    body.m .stage #loot{left:auto;right:6px;bottom:auto;top:52px;align-items:flex-end;width:min(190px,54%);flex-direction:column}
    .lt{padding:1px 8px !important;border-radius:8px;font-size:11px !important;background:rgba(255,255,255,.72) !important;border:0 !important;border-left:3px solid var(--rc) !important;box-shadow:none !important;animation:none !important} .lt.r3{animation:none !important;background:rgba(255,245,220,.88) !important} .lt .lh b{font-size:13px !important} .lt.r3{padding:2px 9px !important;font-size:12px !important} .lt.r3 .lh b{font-size:13px !important}
  `;
  document.head.appendChild(st);
  { // 重要事件用黑底對話框跳出：升級、BOSS登場、地圖完成、倒下、撿到暗金
    const dl = document.createElement('div'); dl.className = 'dlg'; document.querySelector('.stage').appendChild(dl);
    const q = [], who = t => /BOSS/.test(t) ? 'WARNING' : /倒下/.test(t) ? 'GAME OVER?' : /暗金/.test(t) ? 'LEGENDARY' : 'SYSTEM';
    let busy = false; const next = () => { if (!q.length){ busy = false; return; } busy = true; const fr = $('fig').getBoundingClientRect(), sr = dl.parentElement.getBoundingClientRect(); dl.style.top = (fr.top - sr.top + fr.height*.78) + 'px'; const t = q.shift(); dl.innerHTML = `<b>${who(t)}</b>${t}<i></i>`; dl.classList.add('show'); setTimeout(() => { dl.classList.remove('show'); setTimeout(next, 300); }, 2600); };
    const base = logLine; logLine = (t, c) => { base(t, c); if (!G.offline && /升級了|地圖完成/.test(t) && q.length < 3){ q.push(t); if (!busy) next(); } };
  }
  const el = document.createElement('div'); el.className = 'rpg'; el.id = 'rpg'; document.querySelector('.stage').after(el);
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.hidden = true; m.innerHTML = `<div class="mbox"><div class="mtabs" id="mtabs"></div><div id="mbody"></div></div>`;
  m.addEventListener('pointerdown', e => { if (e.target === m && !MOB() && !DESK()) closeModal(); });
  const o = document.createElement('div'); o.className = 'modal'; o.id = 'ovl'; o.hidden = true;
  document.body.append(m, o);
  // 點彈窗外面的空位也可關閉（劇情開場與無法取消的視窗除外）。
  o.addEventListener('click',e=>{if(e.target!==o||o.hidden||(typeof INTRO!=='undefined'&&INTRO.active)||!OVERLAY_CLOSE)return;windowCloseOverlay();});
  // 跨尺寸使用同一操作台，不重新載入或重建引擎指令。
  const hint = () => { let h = $('nexthint');
    if (!h){ h = document.createElement('button'); h.type = 'button'; h.id = 'nexthint'; h.onclick = () => { if (h.dataset.tab) openModal(h.dataset.tab); }; document.body.appendChild(h); }
    let cb = $('ctxbtn'); if (!cb){ cb = document.createElement('button'); cb.id = 'ctxbtn'; cb.onclick = () => uiLeaveMap(); }
    const stg = document.querySelector('.stage'); if (stg){ if (h.parentNode !== stg) stg.appendChild(h); if (cb.parentNode !== stg) stg.appendChild(cb); } else { if (h.parentNode !== document.body) document.body.appendChild(h); }
    cb.hidden = !G.run; cb.textContent = '離開';
    { let mt = $('modtxt'); if (!mt){ mt = document.createElement('div'); mt.id = 'modtxt'; } const R = G.run, ms = R && R.map ? (R.map.mods || []).slice(0, 3).map(k => MODS[k].n) : []; if (R && R.tower) ms.unshift('無限之塔 第 ' + R.floor + ' 層');
      if (stg && mt.parentNode !== stg) stg.appendChild(mt); const t = ms.join('\n'); if (mt._t !== t){ mt._t = t; mt.innerText = t; } }
    const n = nextStep(); h.hidden = !n; if (n){ h.textContent = '下一步：' + n.t; h.dataset.tab = n.tab || ''; } };
  const draw=()=>{hint();uiRefreshLive();if(typeof viewTick==='function')viewTick();};
  setInterval(draw, 300); draw();
  uxInit();
  uiInitLayout();
  viewInit();
  document.getElementById('lblctl'); const pc = document.getElementById('pals'); if (pc) pc.parentElement.style.display = 'none';
}

function uiBuildGearHtml(){return `<details><summary>管理構築裝備記憶</summary><p class="uxmeta">解除記憶不刪除物品；只取消該配置的回收保護。改版前天賦備份、穿著及上一件的保護仍生效。</p>${G.builds.map((b,i)=>b?.equipment?`<p>構築 ${i+1}：${Object.entries(b.equipment).map(([slot,r])=>{const it=r?.kind==='core'?G.armory[r.id]:r?.kind==='gear'?G.inventory.find(x=>x.uid===r.uid):null;return SLOTN[slot]+' '+(r===null?'空欄位':it?uxEsc(it.name):'缺件');}).join('、')}<button class="mb" ${i===(G.bi||0)||G.run?.city||G.train?'disabled':''} onclick="uiForgetBuild(${i})">解除構築 ${i+1} 裝備記憶</button>${i===(G.bi||0)?'<small>先切換到其他構築，再解除這套記憶。</small>':''}</p>`:'').join('')||'<p>尚未保存裝備。</p>'}</details>`;}
let FORGET_BUILD_PENDING=null;
function uiForgetBuild(index){if(index===(G.bi||0)||!G.builds[index]?.equipment)return;FORGET_BUILD_PENDING={index,stamp:JSON.stringify(G.builds[index].equipment)};showOverlay(`<h2 class="uxdialog-title">解除構築 ${index+1} 的裝備記憶？</h2><p>保留物品、技能與天賦；取消這套配置對裝備的回收保護。其他構築、改版備份、穿著與上一件的保護仍有效。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備記憶</button><button class="mb pri" onclick="uiConfirmForgetBuild()">解除裝備記憶</button></div>`);}
function uiConfirmForgetBuild(){const p=FORGET_BUILD_PENDING;FORGET_BUILD_PENDING=null;hideOverlay();if(!p||JSON.stringify(G.builds[p.index]?.equipment)!==p.stamp||!forgetBuildGear(p.index)){uxAnnounce('配置已變動，沒有解除記憶。');return;}renderModal();uxAnnounce('已解除裝備記憶，物品仍在原處。');}

;
/* One preview owner for character overview and cosmetic trials. Trial state never enters saves. */
let dSel = {cat:'weaponStyle',id:null};
const PV={cv:null,rd:null,sc:null,cam:null,hero:null,sig:'',yaw:.5,drag:null,lastTime:null,failed:false,plinth:null};
const cosGet=(cat,id)=>(COS[cat]||[]).find(x=>x[0]===id);
const cosOwned=(cat,id)=>!!cosGet(cat,id)&&(cosGet(cat,id)[3]===0||!!G.own[cat+':'+id]);
function cosPreview(){const c={...G.cos};if(dSel.id&&cosAvailable(dSel.cat)&&cosGet(dSel.cat,dSel.id))c[dSel.cat]=dSel.id;return c;}
function rankOf(){let r=RANKS[0][1];for(const [l,n]of RANKS)if(G.lvl>=l)r=n;return r;}
function setName(v){G.heroName=(v||'').trim().slice(0,12)||G.heroName;G.dirty=true;}
function dressPick(cat,id){if(!cosAvailable(cat)||!cosGet(cat,id))return;dSel={cat,id};renderModal();}
function dressCat(cat){if(!cosAvailable(cat))return;dSel={cat,id:null};renderModal();}
function dressBuy(){
  const {cat,id}=dSel,e=cosGet(cat,id);if(!cosAvailable(cat)||!id||!e)return;
  if(!cosOwned(cat,id)){
    if(G.gold<e[3]){renderModal();uxAnnounce('金幣不足，尚未購買。');return;}
    G.gold-=e[3];G.own[cat+':'+id]=1;logLine('買下裝扮：'+e[1],'#c28a00');SFX('rare');
  }
  G.cos[cat]=id;dSel={cat,id:null};G.dirty=true;renderModal();uxAnnounce('已穿上'+e[1]+'，能力不變。');
}
function dressPreviewControls(){return `<div class="cv-rotate" role="group" aria-label="旋轉角色預覽"><button class="mb" aria-label="向左旋轉角色" onclick="dressRotate(-1)">↶</button><button class="mb" aria-label="還原角色角度" onclick="dressRotate(0)">正面</button><button class="mb" aria-label="向右旋轉角色" onclick="dressRotate(1)">↷</button></div>`;}
function dressRotate(dir){PV.yaw=dir===0?.5:PV.yaw+dir*Math.PI/4;}
function dressHtml(){
  if(!cosAvailable(dSel.cat))dSel={cat:'weaponStyle',id:null};
  const cat=dSel.cat,cur=cosGet(cat,G.cos[cat])?G.cos[cat]:'0',sel=dSel.id||cur,e=cosGet(cat,sel),owned=cosOwned(cat,sel),worn=sel===cur;
  const state=worn?'目前穿著':owned?'試穿中 · 尚未套用':G.gold>=e[3]?'試穿中 · 購買後立即穿上':'金幣不足 · 還差 '+tFmt(e[3]-G.gold)+' 金幣';
  const action=worn?`<button class="mb" disabled>目前穿著</button>`:owned?`<button class="mb pri" data-focus="dress-apply" onclick="dressBuy()">穿上</button>`:`<button class="mb pri" data-focus="dress-apply" ${G.gold>=e[3]?'':'disabled'} onclick="dressBuy()">購買並穿上 · ${tFmt(e[3])} 金幣</button>`;
  return `<div class="character-view device-wardrobe" data-character="${G.char}">${charSegHtml()}${uiCharacterIdentity()}${uiCharacterStage(true)}<section class="cv-wardrobe"><div class="cv-section-label"><h3>外觀試穿</h3><span>金幣 <span id="cv-gold">${tFmt(G.gold)}</span></span></div><p class="uxmeta">武器、副手與飾品只改變外觀，不影響能力。</p><div class="dcats" role="group" aria-label="裝扮部位">${COS_CATS.map(([k,n])=>`<button class="mb" aria-pressed="${k===cat}" data-focus="dress-cat-${k}" onclick="dressCat('${k}')">${n}</button>`).join('')}</div><h4 class="cv-style-title">${COS_CATS.find(([k])=>k===cat)[1]}款式<small>${COS[cat].length} 款</small></h4><div class="cv-styles" role="group" aria-label="${COS_CATS.find(([k])=>k===cat)[1]}款式">${COS[cat].map(([id,n,col,price])=>{const url=typeof icon3dCosmeticUrl==='function'?icon3dCosmeticUrl(cat,id):'',icon=url?`<img src="${url}" alt="" width="56" height="56">`:spr(cat==='weaponStyle'?'sword':cat==='offhandStyle'?'shield':'coin',40);return `<button class="mb cv-style" aria-pressed="${id===sel}" data-focus="dress-item-${cat}-${id}" onclick="dressPick('${cat}','${id}')"><span class="cv-style-art">${icon}</span><span>${uxEsc(n)}</span><small>${id===cur?'穿著中':cosOwned(cat,id)?'已擁有':tFmt(price)+' 金幣'}</small></button>`;}).join('')}</div><div class="cv-dress-action"><div><strong>${uxEsc(e[1])}</strong><p role="status">${state}</p></div><div class="uxactions">${action}${!worn?'<button class="mb" data-focus="dress-cancel" onclick="dressCat(dSel.cat)">取消試穿</button>':''}</div></div><details class="cv-detail"><summary>目前三件外觀</summary><dl class="ui-stat-list">${COS_CATS.map(([k,n])=>`<div><dt>${n}</dt><dd>${uxEsc(cosGet(k,G.cos[k])?.[1]||cosGet(k,'0')[1])}</dd></div>`).join('')}</dl></details></section>${uiCharacterProfile()}</div>`;
}
function dressPreviewFailure(host){
  host.dataset.preview='failed';const status=$('cv-preview-status');if(status)status.textContent='3D 預覽暫時無法顯示，仍可管理裝備及外觀。';const retry=$('cv-preview-retry');if(retry)retry.hidden=false;
}
function dressDisposePreview(){
  const hero=PV.hero;if(!hero)return;
  const shared=hero.userData.mesh?.geometry,owned=new Set();
  hero.traverse(o=>{if(o.isMesh&&o.geometry!==shared&&!o.geometry.userData.equipmentShared)owned.add(o.geometry);});
  if(typeof characterDispose==='function')characterDispose(hero);
  for(const geometry of owned)geometry.dispose();PV.sc?.remove(hero);PV.hero=null;PV.sig='';
}
function dressRetry(){
  PV.rd?.dispose();PV.cv?.remove();
  dressDisposePreview();
  PV.plinth?.geometry.dispose();PV.plinth?.material.dispose();
  Object.assign(PV,{rd:null,cv:null,sc:null,cam:null,hero:null,plinth:null,sig:'',failed:false,lastTime:null,drag:null});dressMount();
}
function dressMount(){
  const host=$('pvhost');if(!host||host.closest('details')?.open===false)return;
  if(PV.failed){dressPreviewFailure(host);return;}
  try{
    if(!PV.rd){
      PV.cv=document.createElement('canvas');PV.cv.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';PV.cv.setAttribute('aria-hidden','true');
      PV.rd=new T3.WebGLRenderer({canvas:PV.cv,antialias:false,alpha:true});PV.rd.setPixelRatio(1);PV.rd.setClearColor(0x000000,0);PV.rd.outputColorSpace=T3.SRGBColorSpace;
      PV.sc=new T3.Scene();studioWorldLighting(PV.sc);
      PV.cam=new T3.OrthographicCamera(-1,1,1,-1,.1,300);
      PV.plinth=new T3.Mesh(new T3.CylinderGeometry(13,14,1,12),new T3.MeshLambertMaterial({color:0xb4c4ec,flatShading:true}));PV.sc.add(PV.plinth);
      PV.cv.addEventListener('pointerdown',e=>{if(e.button!==0)return;PV.drag={x:e.clientX,y:e.clientY,yaw:PV.yaw,id:e.pointerId,active:false};});
      PV.cv.addEventListener('pointermove',e=>{const d=PV.drag;if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.active&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){d.active=true;PV.cv.setPointerCapture(e.pointerId);PV.cv.style.cursor='grabbing';}if(d.active)PV.yaw=d.yaw+dx*.012;});
      const end=()=>{PV.drag=null;PV.cv.style.cursor='grab';};PV.cv.addEventListener('pointerup',end);PV.cv.addEventListener('pointercancel',end);PV.cv.addEventListener('lostpointercapture',end);
      if(!PV.timer)PV.timer=setInterval(dressTick,40);
    }
    PV.cv.style.pointerEvents=host.dataset.framing==='portrait'?'none':'auto';host.appendChild(PV.cv);PV.lastTime=null;dressTick();
  }catch(e){PV.failed=true;PV.rd?.dispose();PV.rd=null;PV.cv?.remove();dressPreviewFailure(host);}
}
function dressTick(){
  if(!PV.rd||!PV.cv.isConnected||!['char','dress'].includes(modalTab)||$('modal').hidden||document.hidden||(typeof UX_LAYERS!=='undefined'&&UX_LAYERS.length)){PV.lastTime=null;PV.drag=null;return;}
  // A scrolled-out stage must not spend GPU time while the player reads lower sections.
  const host=PV.cv.parentElement,rect=host.getBoundingClientRect(),panel=$('mbody').getBoundingClientRect();
  if(rect.bottom<panel.top||rect.top>panel.bottom){PV.lastTime=null;return;}
  const now=performance.now(),dt=PV.lastTime===null?0:Math.min(.1,(now-PV.lastTime)/1000);PV.lastTime=now;
  const w=PV.cv.clientWidth,h=PV.cv.clientHeight;if(w<4||h<4)return;
  try{
    const A=G.equip.armor,W=G.equip.weapon,cos=modalTab==='dress'?cosPreview():G.cos,sig=[aTier(A),A?A.r:0,aTier(W),W?W.r:0,...Object.values(G.equip).map(it=>it?.lg||''),G.char,JSON.stringify(cos)].join();
    if(sig!==PV.sig){
      dressDisposePreview();
      const g=buildHero(aTier(A),A?A.r:0,aTier(W),W?W.r:0,cos);g.scale.setScalar(1);PV.hero=g;PV.sc.add(g);g.updateMatrixWorld(true);
      const box=new T3.Box3();g.traverse(o=>{if(o.isMesh&&o.visible&&!['RingGeometry','CircleGeometry'].includes(o.geometry.type)){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
      if(box.isEmpty())throw Error('Empty character model');PV.box=box;PV.sig=sig;const head=Object.values(g.userData.B||{}).find(b=>/head/i.test(b.name));PV.portraitFocus=head?head.getWorldPosition(new T3.Vector3()):new T3.Vector3((box.min.x+box.max.x)/2,box.min.y+(box.max.y-box.min.y)*.82,0);
      PV.plinth.position.set((box.min.x+box.max.x)/2,box.min.y-.8,0);
    }
    if(PV.hero.userData.y2k)characterPreviewAnimate(PV.hero,dt,matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Keep NULL's companion outside the body silhouette in this presentation instance.
    if(PV.hero.userData.pet){PV.hero.userData.pet.position.x+=6;PV.hero.userData.pet.position.z+=4;}
    if(!PV.drag&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&modalTab==='dress')PV.yaw+=dt*Math.PI*2/60;
    PV.hero.rotation.y=PV.yaw+(modalTab==='char'&&!matchMedia('(prefers-reduced-motion: reduce)').matches?Math.sin(now/1800)*.055:0);
    const buffer=r3BufferSize(w,h,devicePixelRatio||1,R3.clean,r3ViewQuality(),innerWidth);PV.cv.style.imageRendering=R3.clean?'auto':'pixelated';
    if(PV.cv.width!==buffer.width||PV.cv.height!==buffer.height)PV.rd.setSize(buffer.width,buffer.height,false);
    const portrait=host.dataset.framing==='portrait',b=PV.box,cx=portrait?PV.portraitFocus.x:(b.min.x+b.max.x)/2,cy=portrait?PV.portraitFocus.y-.8:(b.min.y+b.max.y)/2,span=Math.hypot(b.max.x-b.min.x,b.max.z-b.min.z),vh=portrait?(b.max.y-b.min.y)*.44:Math.max((b.max.y-b.min.y)*1.18,span*h/w*1.1),vw=vh*w/h;
    PV.cam.left=-vw/2;PV.cam.right=vw/2;PV.cam.top=vh/2;PV.cam.bottom=-vh/2;PV.cam.position.set(cx,cy+1,80);PV.cam.lookAt(cx,cy,0);PV.cam.updateProjectionMatrix();PV.rd.render(PV.sc,PV.cam);host.dataset.preview='ready';
  }catch(e){PV.failed=true;PV.cv.remove();dressPreviewFailure(host);}
}

;
/* ---------- 改機：把用不到的裝備拆成零件，拿去重洗、替換、升級或腐化手上的裝備 ---------- */
const CRAFT = {
  recal:   { n:'重新校準', d:'只重洗同階內數值；保留詞綴種類與階級，已鎖定的詞綴不變', cost:it => 20 + 10*it.r + (it.lk != null ? 15 : 0), ok:it => it.aff.length > 0 },
  swap:    { n:'改裝詞綴', d:'隨機替換一條沒鎖定的詞綴', cost:it => 40 + 20*it.r, ok:it => it.r < 3 && it.aff.length > (it.lk != null ? 1 : 0) },
  upgrade: { n:'升級稀有度', d:'普通→魔法→稀有，各多一到兩條詞綴', cost:it => [100, 250][it.r] || 0, ok:it => it.r < 2 },
  extend:  { n:'追加詞綴', d:'替稀有裝備再加一條新詞綴，最多 6 條；打造出來的裝備大多只有 4 條', cost:it => 80 + 60*Math.max(0, it.aff.length - 3), ok:it => it.r === 2 && !it.lg && it.aff.length < 6 },
  corrupt: { n:'腐化', d:'賭一把：25% 數值 +20%、25% 多一條詞綴、25% 沒變化、25% 數值 -15%；腐化後不能再改機', cost:it => 60 + 20*it.r, ok:it => !it.cr },
};
const craftCost = (act, it) => CRAFT[act].cost(it);
const CRAFT_RESULTS = {};
let craftPending = null;
const affGroupCount=(it,g)=>it.aff.filter(a=>(AFF[a.k]?.g||'m')===g).length;
function craftSwapChoices(slot,it){const have=it.aff.map(a=>a.k);return it.aff.some((a,i)=>i!==it.lk)?POOL[slot].filter(k=>!have.includes(k)):[];}
function craftState(slot, act){
  const it = G.equip[slot], op = CRAFT[act];
  if (!it || !op) return { ok:false, cost:0, reason:'尚未裝備道具' };
  const cost = op.cost(it); let reason = '';
  if (it.cr) reason = '已腐化，不能再改機';
  else if (act === 'recal' && !it.aff.some((a,i) => i !== it.lk)) reason = '沒有可校準的未鎖定詞綴';
  else if (act === 'swap' && it.r >= 3) reason = '傳奇裝備不能替換詞綴';
  else if (act === 'swap' && !it.aff.some((a,i) => i !== it.lk)) reason = '沒有可改裝的未鎖定詞綴';
  else if (act === 'swap' && !craftSwapChoices(slot,it).length) reason = '沒有可替換的新詞綴';
  else if (act === 'extend' && it.r < 2) reason = '要先升級成稀有才能追加詞綴';
  else if (act === 'extend' && it.lg) reason = '傳奇裝備的詞綴固定';
  else if (act === 'extend' && it.aff.length >= 6) reason = '詞綴已滿 6 條';
  else if (act === 'extend' && !affPickKeys(slot,it.aff.map(a=>a.k),1).length) reason = '主機位與副機位都已滿 3 條，無法再追加';
  else if (act === 'upgrade' && it.r >= 2) reason = it.lg?'傳奇裝備可使用下方的核心重構':'已達可升級的稀有度上限';
  else if (!op.ok(it)) reason = '這件裝備無法進行此操作';
  else if ((G.parts || 0) < cost) reason = `需要 ${cost} 零件，還差 ${cost - (G.parts || 0)}`;
  return { ok:!reason, cost, reason };
}
function craftLock(slot, i){ const it = G.equip[slot]; if (!it || it.cr) return; it.lk = it.lk === i ? null : i; renderModal(); }
function craftConfirm(){
  const p = craftPending; craftPending = null;
  hideOverlay(); if (!p) return;
  if (G.equip[p.slot] !== p.it || JSON.stringify(p.it) !== p.stamp){ logLine('裝備已變動，請重新選擇改機。', '#a64b25'); renderModal(); return; }
  craftDo(p.slot,p.act,true);
}
function craftDo(slot, act, confirmed = false){
  const state = craftState(slot,act); if (!state.ok){ uxAnnounce(state.reason); return; }
  const it = G.equip[slot], C = CRAFT[act];
  if (act === 'corrupt' && !confirmed){
    craftPending = { slot, act, it, stamp:JSON.stringify(it) };
    showOverlay(`<h2 class="uxdialog-title">腐化「${uxEsc(it.name)}」？</h2><p>消耗 ${state.cost} 零件。可能提升數值、增加詞綴、沒有變化或降低數值。</p><p class="uxwarning">腐化後，這件裝備不能再改機。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="craftPending=null;hideOverlay()">取消</button><button class="mb pri" onclick="craftConfirm()">腐化裝備</button></div>`); return;
  }
  const beforeRows=copyState(it.aff);
  const cost = state.cost, before = it.aff.map(a => AFF[a.k].t(a.v)).join('、') || '無額外詞綴';
  G.parts -= cost; G.craftN = (G.craftN || 0) + 1; checkQuest(); const have = new Set(it.aff.map(a => a.k)), free = () => POOL[slot].filter(k => !have.has(k)), add = () => { if (it.aff.length >= 6) return false; const f = affPickKeys(slot,[...have],1); if (!f.length) return false; const k = f[0]; have.add(k); it.aff.push(rollAff(k, it.il)); return true; };
  let msg = '';
  if (act === 'recal'){ it.aff = it.aff.map((a,i)=>i===it.lk?a:recalibrateAff(a,it)); msg = '數值重洗完成'; }
  else if (act === 'swap'){ const idx = it.aff.map((a, i) => i).filter(i => i !== it.lk); const i = tPick(idx), g = AFF[it.aff[i].k]?.g || 'm', rest = it.aff.filter((_, j) => j !== i).map(x => x.k), same = affPickKeys(slot, rest, 1, g), k = same.length ? same[0] : tPick(free()); it.aff[i] = rollAff(k,it.il); msg = `詞綴換成：${AFF[k].t(it.aff[i].v)}`; }
  else if (act === 'extend'){ add(); const last = it.aff[it.aff.length-1]; msg = `追加詞綴：${AFF[last.k].t(last.v)}（${it.aff.length}／6）`; }
  else if (act === 'upgrade'){ it.r++; const n = it.r === 1 ? 1 : 2; for (let i = 0; i < n; i++) add(); it.name = it.r === 1 ? PREF[it.aff[0].k] + baseName(slot, it.il, it.bs || 0) : tPick(RARE_NAMES[slot]); msg = `升級成${RAR[it.r].n}`; }
  else if (act === 'corrupt'){ it.cr = 1; const r = Math.random();
    if (r < .25){ for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*12)/10 : Math.max(1, Math.round(a.v*1.2)); msg = '腐化成功：數值 +20%'; }
    else if (r < .5) msg = add() ? '腐化成功：多了一條詞綴' : '腐化：沒有變化';
    else if (r < .75) msg = '腐化：沒有變化';
    else { for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*8.5)/10 : Math.max(1, Math.round(a.v*.85)); msg = '腐化失敗：數值 -15%'; } }
  it.lk = it.lk != null && it.lk < it.aff.length ? it.lk : null;
  const after = it.aff.map(a => AFF[a.k].t(a.v)).join('、') || '無額外詞綴';
  CRAFT_RESULTS[slot] = { it, msg, cost, before, after,beforeRows,afterRows:copyState(it.aff) };
  recalc(); logLine(`改機（${SLOTN[slot]}）：${msg}`, '#1f9bbf'); addFloat(G.h.x + 3, G.h.y, BZ + 22, C.n, '#1f9bbf', 3.8); SFX('card'); G.dirty = true; renderModal(); uxAnnounce(`${msg}，消耗 ${cost} 零件。`);if(act==='corrupt')showCraftOutcome(slot);
}

/* 金幣補給站：金幣的長期用途（補給箱、倉庫擴建、離線儲備）。 */
const crateCost=()=>Math.round(300*Math.max(1,lvlNow())),whUpCost=()=>20000*((G.whUp||0)+1),offUpCost=()=>60000*((G.offUp||0)+1)**2;
function crateRar(){const r=Math.random()*100;return r<40?2:1;}
function buyCrate(n){
  let bought=0,best=null;
  for(let i=0;i<n;i++){
    const cost=crateCost();if(G.gold<cost)break;
    const it=makeItem(tPick(Object.keys(SLOTN)),crateRar(),Math.max(1,lvlNow()));
    if(!storeGear(it)){uxAnnounce('倉庫已滿，請先整理再開箱。');break;}
    G.gold-=cost;bought++;if(!best||it.r>best.r)best=it;
  }
  if(bought){G.dirty=true;logLine(`補給箱 ×${bought}：最好的是 ${best.name}`,RAR[best.r].c);uxAnnounce(`開了 ${bought} 個補給箱，最好的是${best.name}，已放進背包。`);}
  else if(G.gold<crateCost())uxAnnounce('金幣不夠。');
  renderModal();
}
function buyWhUp(){if((G.whUp||0)>=WH_UP_MAX||G.gold<whUpCost())return;G.gold-=whUpCost();G.whUp++;G.dirty=true;uxAnnounce(`背包容量增加到 ${whCap()}。`);renderModal();}
function buyOffUp(){if((G.offUp||0)>=OFF_UP_MAX||G.gold<offUpCost())return;G.gold-=offUpCost();G.offUp++;G.dirty=true;uxAnnounce(`離線收益上限延長到 ${offCapSec()/3600} 小時。`);renderModal();}
function goldShopHtml(){
  const card=(ico,name,desc,extra,btns)=>`<article class="shop-card"><div class="shop-ico">${ico}</div><div class="shop-info"><b>${name}</b><span>${desc}</span>${extra||''}</div><div class="shop-btns">${btns}</div></article>`;
  const btn=(label,ok,fn,tip)=>`<button class="mb"${ok?'':' disabled'} data-tip="${uxEsc(tip)}" onclick="${fn}">${label}</button>`;
  const bar=(v,m)=>`<i class="shop-bar"><u style="width:${Math.round(v/m*100)}%"></u></i>`;
  const c=crateCost(),wMax=(G.whUp||0)>=WH_UP_MAX,oMax=(G.offUp||0)>=OFF_UP_MAX,wTop=200+100*WH_UP_MAX;
  return `<details class="ui-section ui-goldshop" open><summary>補給站 · 金幣 ${tFmt(G.gold)}</summary><p class="shop-intro">用金幣買裝備與永久升級。</p><div class="shop-list">`+
   card(eqico('armor',2,52),'補給箱','開箱得到一件目前等級的裝備：魔法 60%、稀有 40%。','',btn(`開 1 個<small>${tFmt(c)} 金幣</small>`,G.gold>=c,'buyCrate(1)','暗金只能靠BOSS與城市遠征取得')+btn(`開 10 個<small>${tFmt(c*10)} 金幣</small>`,G.gold>=c*10,'buyCrate(10)','一次開十個，倉庫放不下就會停'))+
   card(spr('adventure',40),'背包擴建','增加背包格數，每次 +100。',`<em>${whCap()}／${wTop} 格</em>${bar(whCap()-200,100*WH_UP_MAX)}`,wMax?'<span class="shop-max">已滿</span>':btn(`擴建<small>${tFmt(whUpCost())} 金幣</small>`,G.gold>=whUpCost(),'buyWhUp()','永久增加背包容量'))+
   card(spr('heart',40),'離線儲備','離開遊戲期間最多累積幾小時的收益，每次 +1 小時。',`<em>${offCapSec()/3600}／${6+OFF_UP_MAX} 小時</em>${bar(offCapSec()/3600-6,OFF_UP_MAX)}`,oMax?'<span class="shop-max">已滿</span>':btn(`延長<small>${tFmt(offUpCost())} 金幣</small>`,G.gold>=offUpCost(),'buyOffUp()','永久延長離線結算時數'))+
   `</div><p class="uxmeta">金幣另外可用在：混沌重鑄、技能升級、天賦重置、角色裝扮。</p></details>`;
}
function craftHtml(){return deviceCraftHtml();}

/* 分離同階校準、指定升階及核心物品等級重構。 */
const CRAFT_AFFIX_UI={weapon:0,armor:0,ring:0};let GEAR_PENDING=null;
const tierLevel=tier=>tier===0?25:tier===1?12:tier===2?5:1;
function affTierState(slot,index){const it=G.equip[slot],a=it?.aff[index],route=GEAR_ROUTE[slot];if(!it||!a)return {ok:false,reason:'先選擇一條詞綴',parts:0,fragments:0,dust:0};
 const from=affTier(a,it.il),to=Math.max(0,from-1),parts=from===0?0:[240,140,80,40][to],fragments=from!==0&&to===0?8:0,dust=from!==0&&it.lg?1:0,level=tierLevel(to);
 let reason=G.run||G.train?'先結束挑戰或訓練':it.cr?'已腐化，不能升階':it.lk===index?'先解除這條詞綴的鎖定':from===0?'已達 T0 上限':it.il<level?`T${to} 需要物品等級 ${level}`:G.parts<parts?`需要 ${parts} 零件`:((G.city?.fragments[route]||0)<fragments)?`需要 ${fragments} 枚${CITY_ROUTES[route].n}碎片`:(G.coreDust||0)<dust?`需要 ${dust} 核心殘晶`:'';
 const next={...a,tier:to,v:Math.max(a.v,affValue(a.k,it.il,to,affQuality(a,it),it.r===3?1.35:1))};
 return {ok:!reason,reason,it,index,from,to,parts,fragments,dust,route,next};
}
function coreRefineState(slot){const it=G.equip[slot],route=cityRouteForCore(it?.lg),cap=Math.max(8,G.maxDepth+2*((G.city?.maxTier||1)-1));
 if(!it||!route)return {ok:false,reason:it?'這件裝備不支援城市核心重構，可改用校準或詞綴升階':'先裝備一件傳奇核心',parts:0,fragments:0,dust:0,cap};
 const parts=60+3*it.il,fragments=4+Math.floor(it.il/10),dust=1+Math.floor(it.il/10);
 const reason=G.run||G.train?'先結束挑戰或訓練':it.cr?'已腐化，不能重構':it.lk!=null?'先解除詞綴鎖定':!cityReady()?'先解鎖城市並使用有限天賦':it.il>=cap?`已達目前重構等級 ${cap}，推進深度或城市階級再提高上限`:G.parts<parts?`需要 ${parts} 零件`:(G.city?.fragments[route]||0)<fragments?`需要 ${fragments} 枚${CITY_ROUTES[route].n}碎片`:(G.coreDust||0)<dust?`需要 ${dust} 核心殘晶`:'';
 return {ok:!reason,reason,it,route,cap,parts,fragments,dust,nextLevel:it.il+1};
}
function gearOperationState(kind,slot,index){return kind==='tier'?affTierState(slot,index):kind==='refine'?coreRefineState(slot):{ok:false,reason:'未知操作'};}
function gearOperationCost(s){return `${s.parts} 零件${s.fragments?'、'+s.fragments+' 枚'+CITY_ROUTES[s.route].n+'碎片':''}${s.dust?'、'+s.dust+' 核心殘晶':''}`;}
function gearOperationAsk(kind,slot,index=0){const s=gearOperationState(kind,slot,index);if(!s.ok){uxAnnounce(s.reason);return;}GEAR_PENDING={kind,slot,index,it:s.it,stamp:JSON.stringify(s.it),cost:gearOperationCost(s)};
 showOverlay(`<h2 class="uxdialog-title">${kind==='tier'?'詞綴升階':'核心重構'}：${uxEsc(s.it.name)}</h2><p>${kind==='tier'?`T${s.from} → T${s.to} · ${AFF[s.it.aff[index].k].t(s.it.aff[index].v)} → ${AFF[s.next.k].t(s.next.v)}`:`物品等級 ${s.it.il} → ${s.nextLevel}；保留特殊效果、詞綴種類及階級，數值不會降低。`}</p><p>消耗 ${gearOperationCost(s)}。同一裝備的所有構築引用會同步更新。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="GEAR_PENDING=null;hideOverlay()">保留材料</button><button class="mb pri" onclick="gearOperationConfirm()">${kind==='tier'?'消耗材料升階':'消耗材料重構'}</button></div>`);
}
function gearOperationConfirm(){const p=GEAR_PENDING;GEAR_PENDING=null;hideOverlay();if(!p)return;const s=gearOperationState(p.kind,p.slot,p.index);
 if(!s.ok||G.equip[p.slot]!==p.it||JSON.stringify(p.it)!==p.stamp||gearOperationCost(s)!==p.cost){uxAnnounce('裝備、成本或挑戰狀態已變動，沒有扣除材料。');return;}
 G.parts-=s.parts;if(s.fragments)G.city.fragments[s.route]-=s.fragments;G.coreDust=(G.coreDust||0)-s.dust;
 if(p.kind==='tier')p.it.aff[p.index]=s.next;
 else{const old={...p.it};p.it.aff=p.it.aff.map(a=>({...a,tier:affTier(a,old.il),v:Math.max(a.v,affValue(a.k,s.nextLevel,affTier(a,old.il),affQuality(a,old),1.35))}));p.it.il=s.nextLevel;const value=refinedImplicitValue(p.it,s.nextLevel);p.it.imp={...p.it.imp,v:Math.max(p.it.imp.v,value)};}
 G.craftN++;G.inventoryRevision++;checkQuest();recalc();renderModal();uxAnnounce(`${p.kind==='tier'?'詞綴升階':'核心重構'}完成，消耗 ${p.cost}。`);
}
function uiAffixPick(slot,index){if(!G.equip[slot]?.aff[index])return;CRAFT_AFFIX_UI[slot]=index;renderModal();}
function affTierHtml(slot,it){if(!it.aff.length)return '';const index=Math.min(CRAFT_AFFIX_UI[slot]||0,it.aff.length-1),s=affTierState(slot,index);
 return `<details class="ui-rules"><summary>指定詞綴升階</summary><p>每次提升一階，保留種類與階內位置，數值不降低。T2／T1／T0 分別需要物品等級 5／12／25。T0 另需區域碎片；核心裝另需一枚殘晶。</p><div class="view-options" role="group" aria-label="升階詞綴">${it.aff.map((a,i)=>`<button class="mb" data-focus="affix-${slot}-${i}" aria-pressed="${i===index}" onclick="uiAffixPick('${slot}',${i})">T${affTier(a,it.il)} · ${AFF[a.k].t(a.v)}</button>`).join('')}</div><p>${s.from===0?'T0 已達上限':`T${s.from} → T${s.to}，預計 ${AFF[s.next.k].t(s.next.v)}`} · ${gearOperationCost(s)}</p>${!s.ok?`<p class="uxmeta">${s.reason}</p>`:''}<button class="mb" data-focus="affix-upgrade-${slot}" ${s.ok?'':'disabled'} onclick="gearOperationAsk('tier','${slot}',${index})">預覽詞綴升階</button></details>`;
}
function coreRefineHtml(slot,it){if(!it.lg)return '';const s=coreRefineState(slot);return `<details class="ui-rules"><summary>核心重構 · 目前上限 ${s.cap}</summary><p>重複核心會留下殘晶。用殘晶、來源區碎片及零件，把這件核心的物品等級提高一級；保留特殊效果、詞綴種類及階級，數值不降低。推進深度或城市階級可提高上限。</p><p>核心殘晶 ${G.coreDust||0} · ${gearOperationCost(s)}</p>${s.ok?`<p>物品等級 ${it.il} → ${s.nextLevel}</p>`:`<p class="uxmeta">${s.reason}</p>`}<button class="mb" data-focus="core-refine-${slot}" ${s.ok?'':'disabled'} onclick="gearOperationAsk('refine','${slot}')">預覽核心重構</button></details>`;}

;
/* 扮工模式：整個畫面換成命令行介面，只留重要資訊與掉寶；Esc 或輸入 exit 回到遊戲 */
const BOSS = { on:false, lines:[], title:document.title };
const bossClock = () => new Date().toTimeString().slice(0, 8);
function bossPush(txt, col, tag){
  const L = { t:bossClock(), txt, col:col || '#c8d3c0', tag:tag || 'INFO' }; BOSS.lines.push(L); if (BOSS.lines.length > 400) BOSS.lines.shift();
  if (BOSS.on) bossAppend(L);
}
function bossLoot(it){ const R = RAR[it.r]; bossPush(`${R.n} ${it.name}  ilvl ${it.il}${it.lg && LEGEND_BY[it.lg] ? '  ★ ' + LEGEND_BY[it.lg].d : ''}`, it.r >= 3 ? '#ff8a4c' : '#f4c542', 'LOOT'); }
function bossAppend(L){
  const log = $('bosslog'); if (!log) return; const d = document.createElement('div'); d.className = 'bl';
  d.innerHTML = `<span class="bt">${L.t}</span> <span class="bg bg-${L.tag}">[${L.tag}]</span> <span style="color:${L.col}">${L.txt}</span>`;
  log.appendChild(d); while (log.children.length > 400) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
}
const bossBar = (p, n = 20) => '█'.repeat(Math.round(tClamp(p)*n)) + '░'.repeat(n - Math.round(tClamp(p)*n));
function bossStatus(){
  const h = G.h; return `LV ${G.lvl}  HP ${bossBar(h.hp/G.st.life, 16)} ${tFmt(Math.max(0, h.hp))}/${tFmt(G.st.life)}  XP ${bossBar(G.xp/xpNeed(G.lvl), 8)}  DEPTH ${G.run ? (G.run.tower ? 'T' + G.run.floor : 'MAP') : G.depth}  GOLD ${tFmt(G.gold)}  DPS ${tFmt(G.st.dps)}  KILLS ${G.totalKills}`;
}
const BOSS_CMDS = {
  help:() => ['commands: status  loot  equip  skills  log  clear  exit', 'press ` or Esc to return'],
  status:() => [bossStatus(), `deaths ${G.deaths}  crit ${G.st.crit.toFixed(0)}%x${G.st.cm.toFixed(0)}  armor-red ${(G.st.red*100).toFixed(0)}%  dodge ${G.st.dodge.toFixed(0)}%`],
  loot:() => { const l = BOSS.lines.filter(x => x.tag === 'LOOT').slice(-10); return l.length ? l.map(x => `${x.t} ${x.txt}`) : ['(no loot yet)']; },
  equip:() => Object.entries(G.equip).filter(([, it]) => it).map(([k, it]) => `${SLOTN[k]}: ${RAR[it.r].n} ${it.name} ilvl ${it.il}  ${itemLines(it).map(l => l.t).join(' | ')}`),
  skills:() => G.slots.filter(Boolean).map(id => `${SKILLS[id].n}  hit ${tFmt(G.st.sk[id].hit)}  cd ${G.st.sk[id].cd.toFixed(1)}s  [${(G.supp[id] || []).map(g => SUPPS[g].n).join(', ') || '-'}]`),
  log:() => BOSS.lines.slice(-12).map(x => `${x.t} [${x.tag}] ${x.txt}`),
  clear:() => { $('bosslog').innerHTML = ''; return []; },
  exit:() => { toggleBoss(false); return []; }
};
function bossCmd(v){
  v = v.trim(); if (!v) return; bossAppend({ t:bossClock(), txt:'$ ' + v, col:'#7fe0a0', tag:'CMD' });
  const f = BOSS_CMDS[v.toLowerCase()] || (v === 'q' || v === 'quit' ? BOSS_CMDS.exit : null);
  const out = f ? f() : [`bash: ${v}: command not found (try: help)`];
  out.forEach(t => bossAppend({ t:'', txt:t, col:'#c8d3c0', tag:'OUT' }));
}
function toggleBoss(on){
  on = on == null ? !BOSS.on : on; if (on === BOSS.on) return; BOSS.on = on; window.BOSSON = on;
  let o = $('bossov');
  if (on){
    if (!o){ o = document.createElement('div'); o.id = 'bossov'; o.innerHTML = `<div id="bosshead"></div><div id="bosslog"></div><div id="bossin"><span>user@build:~$</span><input id="bosscmd" autocomplete="off" spellcheck="false"></div>`; document.body.appendChild(o);
      $('bosscmd').addEventListener('keydown', e => { if (e.key === '`' || e.code === 'Backquote'){ e.preventDefault(); toggleBoss(false); } else if (e.key === 'Enter'){ bossCmd(e.target.value); e.target.value = ''; } e.stopPropagation(); }); o.addEventListener('click', () => $('bosscmd').focus()); }
    o.hidden = false; document.title = 'bash - build@ci'; $('bosslog').innerHTML = ''; BOSS.lines.slice(-120).forEach(bossAppend);
    bossAppend({ t:bossClock(), txt:'type "help" for commands, ` or Esc to exit', col:'#7a8a74', tag:'INFO' }); $('bosscmd').focus();
    BOSS.tm = setInterval(() => { $('bosshead').textContent = bossStatus(); }, 500); $('bosshead').textContent = bossStatus();
  } else { if (o) o.hidden = true; document.title = BOSS.title; clearInterval(BOSS.tm); }
}
(function(){
  const css = document.createElement('style'); css.textContent = `#bossov{position:fixed;inset:0;z-index:200;background:#0c0f0c;color:#c8d3c0;font:14px/1.55 "Cubic 11",ui-monospace,Menlo,Consolas,monospace;display:flex;flex-direction:column;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom))} #bossov[hidden]{display:none}
    #bosshead{color:#7fe0a0;border-bottom:1px solid #2a3a2a;padding-bottom:4px;margin-bottom:4px;white-space:pre-wrap;word-break:break-all} #bosslog{flex:1;overflow:auto} .bl{white-space:pre-wrap;word-break:break-all} .bt{color:#5a6a56} .bg-LOOT{color:#f4c542} .bg-CMD{color:#7fe0a0} .bg-OUT{color:#5a6a56}
    #bossin{display:flex;gap:8px;border-top:1px solid #2a3a2a;padding-top:6px} #bossin span{color:#7fe0a0} #bosscmd{flex:1;background:none;border:0;outline:0;color:#e8f0e0;font:inherit}`;
  document.head.appendChild(css);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && BOSS.on) toggleBoss(false); else if ((e.key === '`' || e.code === 'Backquote') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); toggleBoss(); } });
  setInterval(() => { if (!G.paused && !G.offline) bossPush(bossStatus(), '#7a8a74', 'STAT'); }, 60000);
})();

;
/* 共用操作契約：液晶詳情、盤面鍵盤及視窗焦點。暫存 UI 狀態不寫入遊戲存檔。 */
const UX_THEME = `:root{--ux-ink:#172751;--ux-muted:#475778;--ux-screen:#e6e8f7;--ux-blue:#303d9b;--ux-edge:#9ca9c8;--ux-accent:#b94732;--ux-signal-red:#ed967d;--ux-signal-blue:#8db7ef;--ux-signal-green:#80cebd;--ux-focus:#1f3fb0;--ux-scroll:#8297c6;--ux-track:#e3ebfa;--ux-face:#c8cedc;--ux-key:#dae1ed;--ux-lcd:#edf4f1;--ux-frame:#5b6781;--ux-rule:#b9c2d7;--ux-body:"Cubic 11",system-ui,sans-serif;--ux-display:"Cubic 11",system-ui,sans-serif;--ux-text:16px;--ux-line:24px;--ux-small:14px;--ux-small-line:20px;--ux-heading:20px;--ux-heading-line:28px;--ux-shell-radius:10px;--ux-key-radius:4px;--ux-metal:linear-gradient(180deg,#f1f4fb 0%,#d2d9e7 8%,#c8cedc 50%,#aeb9cf 100%) #c8cedc;--ux-key-face:linear-gradient(180deg,#fff 0px,#e9eef7 2px,#d5dfed 48%,#c9d4e6 50%,#d7dfed 100%) #dae1ed;--ux-key-hover:linear-gradient(180deg,#fff 0px,#edf8ff 2px,#daeafa 48%,#c0d9ed 50%,#d4e7f7 100%) #e6f1ff;--ux-blue-face:linear-gradient(180deg,#8f9de6 0%,#5567bf 8%,#4858af 46%,#303d9b 48%,#334794 100%) #303d9b;--ux-title-face:linear-gradient(180deg,#b9c6f0 0px,#6575be 2px,#4858a9 3px,#303d86 100%) #303d86;--ux-key-shadow:inset 1px 1px #fff,inset -1px -1px #8492b0,0 2px #727f9c;--ux-inset:inset 1px 1px #677694,inset -1px -1px #fff}`;
/* 銀灰掌機外殼、藍紫液晶與短鍵程按鍵；內容不疊卡，兩種編年史共用。 */
const UX_MATERIAL_CSS=`
/* 像素字只有常規字重，禁止瀏覽器合成粗體破壞格線。 */
body.ui-material,body.ui-material *{font-family:var(--ux-body)!important;font-weight:400!important;font-synthesis:none!important}

body.ui-material :is(#modal>.mbox,#ovl>.mbox,#wiki>.wkb){border:2px solid var(--ux-frame)!important;border-radius:var(--ux-shell-radius)!important;outline:none!important;background:var(--ux-metal)!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #8794ad,3px 3px 0 #34446780!important}
body.ui-material #modal>.mbox{padding:4px!important}
body.ui-material :is(#mttl,.wkt){background:var(--ux-title-face)!important;border-radius:5px 5px 0 0!important;box-shadow:inset 1px 0 #d5dfff,inset -1px 0 #24366d!important;border:1px solid #293a78;border-bottom:2px solid #1c2c66;color:#fff}
body.ui-material :is(#mttl h2,.wkt h2){font-family:var(--ux-display);font-weight:400;text-shadow:1px 1px #1c2c66}
body.ui-material #mttl::before{display:block;content:"";width:5px;height:20px;flex:none;background:linear-gradient(#b9f1f0 0 40%,#6bbacb 40% 65%,#b9f1f0 65%);box-shadow:1px 0 #1c2c66}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)){background:var(--ux-key-face)!important;border:1px solid var(--ux-frame)!important;border-radius:var(--ux-key-radius)!important;box-shadow:var(--ux-key-shadow)!important;text-shadow:none!important;color:var(--ux-ink)!important;transform:none!important;font-family:var(--ux-body)!important}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt):not([aria-pressed="true"]):not(.on)):enabled:hover{background:var(--ux-key-hover)!important}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)):enabled:active{box-shadow:var(--ux-inset)!important}
body.ui-material #mtabs{background:var(--ux-metal)!important;box-shadow:inset 0 1px #fff!important;border:0!important;gap:4px!important}
body.ui-material #mtabs button.tab{background:var(--ux-key-face)!important;border:1px solid #8492ae!important;border-radius:4px 4px 6px 6px!important;box-shadow:var(--ux-key-shadow)!important;text-shadow:none!important;color:var(--ux-ink)!important}
body.ui-material #mtabs button.tab:hover{background:var(--ux-key-hover)!important}
body.ui-material #mtabs button.tab.on{background:linear-gradient(180deg,#f1f5ff,#c1cef3)!important;color:#243884!important;border-color:#4c60a5!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #8096d1,inset 0 -3px #4057aa!important}
body.ui-material :is(#modal,#ovl,#wiki) button[aria-pressed="true"],body.ui-material #mbody button.on:not(.pc):not(.gt),body.ui-material #wiki button.wkc.on{background:var(--ux-blue-face)!important;border:1px solid #26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important;color:#fff!important}
body.ui-material :is(#mbody,#ovl) button.mb.pri{background:linear-gradient(180deg,#eeb39e 0%,#c45b42 10%,#b94732 55%,#a1392e 56%,#b94732 100%)!important;border:1px solid #79382e!important;color:#fff!important;box-shadow:inset 1px 1px #f4c5af,inset -1px -1px #7e392d,0 2px #643527!important}
body.ui-material :is(#modal,#ovl,#wiki) button:disabled{background:#ccd3e1!important;color:#596880!important;border-color:#9ba7bd!important;box-shadow:inset 1px 1px #edf0f8!important;text-shadow:none!important;opacity:1}
body.ui-material :is(#mbody,#uisettings){background:var(--ux-screen)!important;border:1px solid #9ba7c5;border-top:0;box-shadow:inset 1px 0 #fff,inset -1px 0 #b5bdd6}
body.ui-material #mbody :is(.rc,.mc,.ui-section,.ui-menu-group,.ui-character-head,.ui-build),body.ui-material .view-settings{background:transparent!important;border:0!important;border-bottom:1px solid var(--ux-rule)!important;border-radius:0!important;box-shadow:none!important;outline:none;padding:12px 0!important;margin:0 0 14px}
body.ui-material #mbody .ui-character-head{background:linear-gradient(110deg,#d4dcf1,var(--ux-screen))!important;border-left:3px solid #8091c0!important;padding:10px!important}
body.ui-material #mbody .ui-build{padding:4px 0 12px!important}
body.ui-material #mbody .ui-core-collection>summary{min-height:44px;padding:10px 0;font-family:var(--ux-display)}
body.ui-material #mbody .ui-core-item{padding:12px 0;border-bottom:1px solid var(--ux-rule)}
body.ui-material #mbody .ui-core-item .nm{flex-wrap:wrap}.ui-core-item small{font-size:12px;color:var(--ux-muted)}
body.ui-material #mbody .ui-core-item p{font-size:13px;line-height:1.6;margin:6px 0}.ui-core-item>details{margin:8px 0}.ui-core-item>details>summary{padding:8px 0;min-height:40px}

body.ui-material #mbody :is(.ui-equipment .rc ul,.ui-equipment .rc li,.ui-craft-operation){background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
body.ui-material #mbody .ui-craft-operation{padding:12px 0}
body.ui-material #mbody .rh{background:none!important;box-shadow:none!important;border:0!important;color:var(--ux-muted)!important;text-shadow:none!important}
body.ui-material #mbody :is(.mute,.hint,.rc li.imp){color:var(--ux-muted)!important}body.ui-material #mbody .mute{font-size:12px}
body.ui-material #mbody svg.tree{background:#27385d!important;border:2px solid #7181a2!important;border-radius:5px!important;outline:none;box-shadow:inset 1px 1px #102347,0 1px #fff!important}
body.ui-material #mbody svg.tree>line.inactive{stroke:#788bb1}
body.ui-material #mbody svg.tree .tn.locked :is(circle,polygon){fill:#8798b8;stroke:#b8c8df}
body.ui-material #mbody svg.tree .tn.open :is(circle,polygon){fill:#edf7ff;stroke:#98dcea;animation:none}
body.ui-material #mbody .idc{background:var(--ux-metal);border:1px solid var(--ux-frame);border-radius:5px;box-shadow:inset 1px 1px #fff,inset -1px -1px #8794ad;color:var(--ux-ink)}
body.ui-material #mbody .idh{font-family:var(--ux-display);font-weight:400}
body.ui-material #mbody .ids{background:var(--ux-title-face);color:#fff;border-radius:2px}
body.ui-material #mbody .idp{background:#c6ddeb;border:2px solid #7181a2;box-shadow:var(--ux-inset)}
body.ui-material #mbody .idt{border-color:var(--ux-rule)}
body.ui-material #mbody .idr{border-bottom:1px solid var(--ux-rule)}
body.ui-material #mbody .isr i{background:#a4aec4}body.ui-material #mbody .isr i.on{background:#b07830}
body.ui-material :is(#mbody,#ovl) .mct{color:var(--ux-ink)!important;text-shadow:none}
body.ui-material #mbody .lg ul{background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:4px 0 0 18px!important}
body.ui-material #mbody .ach li.got{color:var(--ux-ink)}body.ui-material #mbody .ach li.got>b{color:#74531f}
body.ui-material #ovl>.mbox::before{background:var(--ux-title-face)!important;border-radius:3px!important;box-shadow:inset 0 1px #d5dfff;color:#fff}

body.ui-material #mbody .sw.on{background:var(--ux-blue-face)!important;outline:2px solid var(--ux-blue)}
body.ui-material #mbody .sw.on em{color:#f0f5ff}
body.ui-material #mbody .gls{gap:0}
body.ui-material #mbody .gl{border:0;border-bottom:1px solid var(--ux-rule);border-radius:0!important;background:none;box-shadow:none!important;padding:10px 0 14px}
body.ui-material #mbody .rc ul.ach{background:none!important;border:0!important;box-shadow:none!important;padding:0!important}
body.ui-material #mbody .ach li{padding:10px 0;border-bottom:1px solid var(--ux-rule)}

body.ui-material #mbody :is(.dpsbar,.uxinspect){background:#d8e0f2!important;border:1px solid #8e9cbe!important;border-radius:3px!important;box-shadow:var(--ux-inset)!important}
body.ui-material #mbody .uxinspect{padding:10px!important;margin-top:8px}
body.ui-material #mbody .dpsbar .uxinspect{border:0!important;border-top:1px solid #a9b6d5!important;padding:10px 0 0!important;box-shadow:none!important}
body.ui-material #mbody .shares span{background:#bbc9e8;color:var(--ux-ink);border-left:2px solid #677fbb}
body.ui-material #mbody .ui-segments{padding:4px;gap:4px;background:var(--ux-face);border:1px solid #9ba8c1;border-radius:5px;box-shadow:var(--ux-inset)}
body.ui-material #mbody .ui-segments>button{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:3px!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #a4b0c7!important;color:var(--ux-ink)!important;font-family:var(--ux-body)!important;padding:6px 3px!important}
body.ui-material #mbody .ui-segments>button[aria-pressed="true"]{background:var(--ux-blue-face)!important;color:#fff!important;border-color:#26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important}
body.ui-material #mbody :is(.ui-directory button,.ui-wiki){background:linear-gradient(90deg,#d5deef,var(--ux-screen))!important;border:0!important;border-bottom:1px solid #a5b2cf!important;border-left:3px solid #97a8cc!important;border-radius:0!important;box-shadow:none!important;padding-inline:10px}
body.ui-material #mbody :is(.ui-directory button,.ui-wiki):hover{background:#d2e1f4!important}
body.ui-material #mbody .ui-craft-slots>button{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:5px!important;box-shadow:var(--ux-key-shadow)!important}
body.ui-material #mbody .ui-craft-slots>button[aria-pressed="true"]{background:linear-gradient(#d2dcf8,#bac9ee)!important;border-color:#41589c!important;box-shadow:inset 1px 1px #7185b6,inset -1px -1px #fff,inset 0 -3px #4057aa!important;color:var(--ux-ink)!important}
body.ui-material #mbody .ui-map-card{border:1px solid #8f9cbb;border-radius:5px;background:#d8e0f0;box-shadow:inset 1px 1px #fff}
body.ui-material #mbody .rchips>*{border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;padding:2px 8px 2px 0!important}
body.ui-material #mbody .ui-map-banner{background:linear-gradient(120deg,#273961,#435582);border:0;border-left:6px solid var(--land);box-shadow:inset 0 1px #8294bd;color:#f0f4ff}
body.ui-material #mbody .ui-map-banner::after{display:none}
body.ui-material #mbody .ui-map-banner :is(h3,span){background:none;color:#f0f4ff;padding:0;border-radius:0}
body.ui-material #mbody button.gt{background:linear-gradient(135deg,#f2f5ff,#d8e2f3)!important;border:1px solid #9baac8!important;border-radius:3px!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #bbc7dc!important}
body.ui-material #mbody button.gt.on{outline:2px solid var(--ux-blue);outline-offset:1px}
body.ui-material #mbody .pz{border-radius:6px;border:2px solid #7181a2;background:#bec9dd;box-shadow:inset 1px 1px #edf3ff,inset -1px -1px #6b7a9b,0 1px #fff!important}
body.ui-material #mbody .pz button.pc{border-radius:2px!important;background:#d6def0!important;box-shadow:inset 1px 1px #a0adca,inset -1px -1px #f2f5ff!important}
body.ui-material #mbody .pz button.pc.fill{background:var(--pc)!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #66779280!important}
body.ui-material #mbody .pz button.pc.pv.ok{background:#b8f5d0!important;border-color:#19865a!important}
body.ui-material #mbody .pz button.pc.pv.bad{background:#ffc4c4!important;border-color:#bd342b!important}
body.ui-material :is(#modal,#ovl,#wiki) :is(input:not([type="range"]),textarea){background:var(--ux-lcd)!important;border:2px solid!important;border-color:#7486a1 #f8fbff #f8fbff #7486a1!important;border-radius:2px!important;box-shadow:inset 1px 1px #c2ced6!important;color:var(--ux-ink)!important;font:14px/1.5 system-ui,"Microsoft JhengHei",sans-serif}
body.ui-material #wiki>.wkb{padding:4px}
body.ui-material #wiki .wkn{background:var(--ux-metal);border-color:#9ba8c1;gap:4px;padding:8px;box-shadow:inset 1px 1px #fff,inset -1px -1px #a3b0cb}
body.ui-material #wiki button.wkc{background:transparent!important;border:1px solid transparent!important;border-radius:3px!important;box-shadow:none!important;min-height:40px;padding:7px 8px;text-align:left;font-family:var(--ux-display)}
body.ui-material #wiki button.wkc:hover{background:var(--ux-key-face)!important;border-color:#8b99b5!important;box-shadow:inset 1px 1px #fff!important}
body.ui-material #wiki button.wkc.on{background:var(--ux-blue-face)!important;border-color:#26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important;color:#fff!important;outline:none}
body.ui-material #wiki .wkcontent{background:var(--ux-screen);border:1px solid #9ba7c5;border-top:0;box-shadow:inset 1px 1px #fff}
body.ui-material #wiki .wkl{display:block;padding:0 12px}
body.ui-material #wiki .wke{margin:0;padding:14px 0;border:0;border-bottom:1px solid var(--ux-rule);border-radius:0;background:none;box-shadow:none}
body.ui-material #wiki .wkm{color:var(--ux-muted)}body.ui-material #wiki .wkempty{border:0;background:none;padding:18px 0}
body.ui-material #wiki .wksearch input{min-height:40px}body.ui-material #wiki .wksearch{gap:4px}
body.ui-material #wiki .wkcaption{display:none}
body.ui-material :is(#modal,#ovl,#wiki) :where(button,input,textarea,summary):focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:2px}
body.ui-material.ui-fx-document{background:var(--ux-face)}
body.ui-material.ui-fx-document header,body.ui-material.ui-fx-document h2{background:var(--ux-title-face);border-radius:4px 4px 0 0;box-shadow:inset 1px 1px #becbf3,inset -1px -1px #26357e}
body.ui-material.ui-fx-document h1,body.ui-material.ui-fx-document h2,body.ui-material.ui-fx-document nav a{font-family:var(--ux-display)}
body.ui-material.ui-fx-document nav{gap:4px;padding:8px;background:var(--ux-metal);border:1px solid #8f9cbb;border-radius:5px;box-shadow:inset 1px 1px #fff,inset -1px -1px #a3b0cb}
body.ui-material.ui-fx-document nav a{border:1px solid transparent;border-radius:3px;background:transparent;color:var(--ux-ink);box-shadow:none;padding:8px 9px;min-height:40px}
body.ui-material.ui-fx-document nav a:hover{background:var(--ux-key-face);border-color:#8b99b5;box-shadow:inset 1px 1px #fff}
body.ui-material.ui-fx-document nav a[aria-current="location"]{background:var(--ux-blue-face);border-color:#26357e;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70;color:#fff}
body.ui-material.ui-fx-document main>section{border:1px solid #8f9cbb;border-radius:4px;box-shadow:inset 1px 1px #fff;background:var(--ux-screen)}
body.ui-material.ui-fx-document :is(input,button){border-radius:3px;box-shadow:none;font:14px system-ui,sans-serif}
body.ui-material.ui-fx-document input{background:var(--ux-lcd);border:2px solid;border-color:#7486a1 #f8fbff #f8fbff #7486a1;box-shadow:inset 1px 1px #c2ced6;color:var(--ux-ink)}
body.ui-material.ui-fx-document button{background:var(--ux-key-face);border:1px solid var(--ux-frame);box-shadow:var(--ux-key-shadow);color:var(--ux-ink)}
body.ui-material.ui-fx-document :is(td,tr){border-color:var(--ux-rule)}body.ui-material.ui-fx-document .m{color:var(--ux-muted)}
body.ui-material #nexthint{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:3px!important;box-shadow:var(--ux-key-shadow)!important;color:var(--ux-ink)!important}
@media(max-width:1179px){body.ui-material.m #modal>.mbox{border-radius:8px 8px 0 0!important}body.ui-material.m #mtabs{padding:4px 5px 6px!important;box-shadow:inset 0 1px #fff,0 -2px #8794ad!important;gap:4px!important}}
@media(max-width:700px){body.ui-material #wiki .wkn{max-height:148px}body.ui-material #wiki .wkt{padding:8px;gap:6px}body.ui-material.ui-fx-document .w{padding:8px}}
/* LCD pixel mode. Geometry stays native; the 16px optical face is baked on a
   one CSS-pixel grid. No live DOM rasterizer, full-panel filter or pointer proxy. */
body.ui-material.ui-pixelfx{
 --ux-body:"Cubic 11",system-ui,sans-serif;--ux-display:"Cubic 11",system-ui,sans-serif;
 --ux-shell-radius:2px;--ux-key-radius:0px;
 --ux-metal:linear-gradient(180deg,#f1f4fb 0 4px,#dce2ed 4px 12px,#c8cedc 12px 62%,#b7c2d5 62% 94%,#9baac4 94% 100%) #c8cedc;
 --ux-key-face:linear-gradient(180deg,#fff 0 2px,#e9eef7 2px 6px,#d5dfed 6px 52%,#c5d1e3 52% 80%,#d7dfed 80% 100%) #dae1ed;
 --ux-key-hover:linear-gradient(180deg,#fff 0 2px,#edf8ff 2px 6px,#daeafa 6px 52%,#c0d9ed 52% 80%,#d4e7f7 80% 100%) #e6f1ff;
 --ux-blue-face:linear-gradient(180deg,#8f9de6 0 2px,#6574c9 2px 6px,#4858af 6px 48%,#303d9b 48% 84%,#334794 84% 100%) #303d9b;
 --ux-title-face:linear-gradient(180deg,#b9c6f0 0 2px,#6575be 2px 6px,#4858a9 6px 48%,#303d86 48% 100%) #303d86;
 --ux-key-shadow:inset 2px 2px #fff,inset -2px -2px #8492b0,0 2px #727f9c;
 --ux-inset:inset 2px 2px #677694,inset -2px -2px #fff;
}
body.ui-material,body.ui-material :is(p,li,label,button,input,textarea,select,summary,td,th){font-size:var(--ux-text)!important;line-height:var(--ux-line);letter-spacing:.015em!important}
body.ui-material :is(h1,h2,h3,.hud-level b,.hud-right b){font-family:"Cubic 11",system-ui,sans-serif!important;font-size:var(--ux-heading)!important;line-height:var(--ux-heading-line)}
body.ui-material :is(small,.mute,.hint,.wkstate,.wkm,.wkcount,.view-fx-ticks,.hud-progress,.hud-healthline,.hud-healthline *, .hud-level span,.hud-right span,#mtabs button,#mtabs button *,#watch-return>span){font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)}
body.ui-material :is(input,textarea,select){font-size:var(--ux-text)!important;line-height:var(--ux-line);letter-spacing:.015em!important}
@media(min-width:768px){:root{--ux-text:17px;--ux-line:24px;--ux-small:15px;--ux-small-line:22px;--ux-heading:24px;--ux-heading-line:32px}}
@media(min-width:1180px){:root{--ux-text:18px;--ux-line:26px;--ux-small:16px;--ux-small-line:22px;--ux-heading:26px;--ux-heading-line:34px}}
body.ui-material.ui-pixelfx :is(#mttl,.wkt,#mtabs button.tab,#wiki .wkn,#wiki .wkc,#wiki .wke,#wiki input,#wiki .wkempty,#mbody .ui-segments,#mbody .ui-segments>button,#mbody .ui-craft-slots>button,#mbody .ui-map-card,#mbody .pz,#mbody button.pc,#mbody button.gt,#mbody svg.tree,#mbody .idc,#mbody .ids,#mbody .dpsbar,#mbody .uxinspect,#nexthint,#ctxbtn,#loot,header,.tfoot){border-radius:0!important}
body.ui-material.ui-pixelfx :is(button,input,textarea,select,.toast,.chips),body.ui-material.ui-pixelfx #mbody button{border-radius:0!important}
body.ui-material.ui-pixelfx :is(.toast,.chips){background:var(--ux-screen);border:2px solid var(--ux-frame);box-shadow:2px 2px #172751}
body.ui-material.ui-pixelfx .modal{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.ui-material.ui-pixelfx :is(header,.tfoot,#readout) :is(button,a){background:var(--ux-key-face)!important;box-shadow:var(--ux-key-shadow)!important;color:var(--ux-ink)!important}
body.ui-material.ui-pixelfx ::-webkit-scrollbar-thumb{border-radius:0}
body.ui-material.ui-pixelfx #mtabs button.tab.on{background:linear-gradient(180deg,#f1f5ff 0 4px,#d9e2fa 4px 52%,#c1cef3 52% 100%)!important}
body.ui-material.ui-pixelfx :is(#mbody,#ovl) button.mb.pri{background:linear-gradient(180deg,#eeb39e 0 2px,#c45b42 2px 6px,#b94732 6px 56%,#a1392e 56% 84%,#b94732 84% 100%)!important}
body.ui-material.ui-pixelfx #mbody .ui-character-head{background:#d4dcf1!important;border-left-width:4px!important}
body.ui-material.ui-pixelfx #mbody :is(.ui-directory button,.ui-wiki){background:#d5deef!important;border-left-width:4px!important}
body.ui-material.ui-pixelfx #mbody .ui-map-banner{background:#273961!important}
body.ui-material.ui-pixelfx #mbody button.gt{background:#d8e2f3!important}
body.ui-material.ui-pixelfx #mbody .ui-craft-slots>button[aria-pressed="true"]{background:#bac9ee!important}
body.ui-material.ui-pixelfx.ui-fx-document :is(header,h2,nav,nav a,main>section,input,button){border-radius:0!important}
body.ui-material.ui-pixelfx:not(.ui-fx-document) :is(header,.tfoot,#readout,#ctxbtn){background:var(--ux-metal)!important;color:var(--ux-ink)!important;text-shadow:none!important}
body.ui-material.ui-pixelfx.ui-fx-document header{background:var(--ux-title-face)!important;color:#fff!important}
body.ui-material.ui-pixelfx svg{shape-rendering:crispEdges}
body.ui-material.ui-pixelfx .hud-meter{height:18px;box-shadow:2px 2px #ffffff90,inset 0 2px #030b23}
body.ui-material.ui-pixelfx .hud-meter>i{width:var(--pixel-fill,var(--fill));background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#ffb5c7 0 2px,#eb526a 2px 8px,#a22e58 8px 100%);box-shadow:none}
body.ui-material.ui-pixelfx .hud-meter.hud-xp{height:10px;margin-top:4px}
body.ui-material.ui-pixelfx .hud-xp>i{background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#fff3bf 0 2px,#efce68 2px 4px,#a38c3b 4px 100%)}
body.ui-material.ui-pixelfx .hud-xp>span{font-size:0!important}
body.ui-material.ui-pixelfx .hud-level{height:52px}
body.ui-material.ui-pixelfx .hud-right b{line-height:24px}
body.ui-material.ui-pixelfx .hud-right>div{padding:2px 4px;gap:4px}
body.ui-material.ui-pixelfx #watch-return i{font-size:0!important;line-height:0}
@media(max-width:480px){body.ui-material.ui-pixelfx .hud-right b{font-size:20px!important}body.ui-material.ui-pixelfx .hud-right{gap:4px}}
@media(forced-colors:active){body.ui-material :is(#modal,#ovl,#wiki) :where(button,input,textarea),body.ui-material.ui-fx-document :is(a,button,input){border:1px solid ButtonText!important}body.ui-material #wiki button.wkc.on,body.ui-material.ui-fx-document nav a[aria-current="location"]{outline:2px solid Highlight}body.ui-material #mttl::before{background:Highlight}}
`;
const uxEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const UX_GRID = { x:0, y:0 };
let UX_LAST_SOURCE = null;
const UX_LAYERS = [], UX_INERT = new Map();
function uxFocusToken(el = document.activeElement){
  if (!el || el === document.body) return null;
  return { el, id:el.id, key:el.dataset.focus, action:el.getAttribute('onclick'), scope:el.closest('#mbody,#mtabs,#mttl')?.id };
}
function uxRestoreFocus(t){
  if (!t) return;
  let el = t.el?.isConnected ? t.el : t.id ? document.getElementById(t.id) : null;
  const scope = t.scope ? document.getElementById(t.scope) : document;
  if (!el && scope) el = t.key ? [...scope.querySelectorAll('[data-focus]')].find(e => e.dataset.focus === t.key) : t.action ? [...scope.querySelectorAll('[onclick]')].find(e => e.getAttribute('onclick') === t.action) : null;
  if (el && !el.closest('[inert]') && !el.disabled) el.focus({ preventScroll:true });
}
function uxCapturePanel(){ return { focus:uxFocusToken(), scroll:document.getElementById('mbody')?.scrollTop || 0, scrollers:Object.fromEntries([...document.querySelectorAll('#mbody [data-scroll-key]')].map(el=>[el.dataset.scrollKey,{left:el.scrollLeft,top:el.scrollTop}])), details:[...document.querySelectorAll('#mbody details')].map(el=>el.open) }; }
function uxRestorePanel(s, reset){ if(reset){document.getElementById('mbody').scrollTop=0;const settings=document.getElementById('uisettings');if(settings)settings.scrollTop=0;} if (!reset){ for(const el of document.querySelectorAll('#mbody [data-scroll-key]')){const pos=s.scrollers?.[el.dataset.scrollKey];if(pos){el.scrollLeft=pos.left;el.scrollTop=pos.top;}}document.getElementById('mbody').scrollTop = s.scroll;document.querySelectorAll('#mbody details').forEach((el,i)=>{if(s.details[i]!=null)el.open=s.details[i]});uxRestoreFocus(s.focus);document.getElementById('mbody').scrollTop=s.scroll; } }
function uxLayerSync(){
  for (const [el, was] of UX_INERT) el.inert = was;
  UX_INERT.clear();
  const top = UX_LAYERS.at(-1); if (!top) return;
  for (const el of document.body.children) if (el !== top.el && !el.contains(top.el) && !['SCRIPT','STYLE'].includes(el.tagName) && el.id !== 'uxstatus'){
    UX_INERT.set(el, el.inert); el.inert = true;
  }
}
function uxOpenDialog(el, label, close){
  if(typeof viewExitWatch==='function')viewExitWatch();
  let layer = UX_LAYERS.find(l => l.el === el);
  if (!layer){ layer = { el, trigger:uxFocusToken(), close }; UX_LAYERS.push(layer); }
  layer.close=close;
  el.hidden = false; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label',label); el.tabIndex = -1;
  uxLayerSync();
  requestAnimationFrame(() => {
    if (UX_LAYERS.at(-1) !== layer) return;
    const target = el.querySelector('[data-initial-focus]') || el.querySelector('button:not([disabled]),input,textarea,[tabindex="0"]') || el;
    target.focus({ preventScroll:true });
  });
}
function uxCloseDialog(el){
  const i = UX_LAYERS.findIndex(l => l.el === el); el.hidden = true;
  if (i < 0) return;
  const [layer] = UX_LAYERS.splice(i, 1); uxLayerSync(); uxRestoreFocus(layer.trigger);
}
function uxAnnounce(text){ const el = document.getElementById('uxstatus'); if (el){ el.textContent = ''; requestAnimationFrame(() => { el.textContent = text; }); } }
function uxCancelPiece(){ held = null; selPiece = null; selSock = -1; heldRot = 0; pzHover(-1,-1); renderModal(); uxRestoreFocus(UX_LAST_SOURCE); uxAnnounce('已取消選取，盤面沒有變更。'); }
const UX_TAG = { proj:'投射物', area:'範圍', melee:'近戰', fire:'火焰', cold:'冰霜', light:'閃電' };
function uxGridFocus(el){
  UX_GRID.x = +el.dataset.x; UX_GRID.y = +el.dataset.y;
  for (const c of document.querySelectorAll('.pz [data-x]')) c.tabIndex = c === el ? 0 : -1;
  pzHover(UX_GRID.x,UX_GRID.y);
}
function uxGridActivate(x,y){ UX_GRID.x=x; UX_GRID.y=y; pzCell(x,y); }
function uxGoBoard(){ const el = document.querySelector(`.pz [data-x="${UX_GRID.x}"][data-y="${Math.min(UX_GRID.y,G.board.h-1)}"]`); if (el){ el.focus(); el.scrollIntoView({ block:'nearest' }); } }
function uxInputTarget(e){ return e.isComposing || e.target.closest('input,textarea,select,[contenteditable="true"]'); }
function uxKeydown(e){
  const layer = UX_LAYERS.at(-1);
  if (layer){
    if (!uxInputTarget(e) && ['q','e','`'].includes(e.key.toLowerCase())) e.stopImmediatePropagation();
    if (e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); layer.close(); return; }
    if (e.key === 'Tab'){
      const list = [...layer.el.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,a[href],[tabindex="0"]')].filter(el => !el.closest('[hidden]') && el.getClientRects().length);
      const first=list[0] || layer.el, last=list.at(-1) || layer.el;
      if (e.shiftKey && (document.activeElement === first || !layer.el.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !layer.el.contains(document.activeElement))){ e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (uxInputTarget(e) || modalTab !== 'skills' || $('modal')?.hidden) return;
  const cell = e.target.closest('.pz [data-x]');
  const delta = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[e.key];
  if (cell && delta){ e.preventDefault(); const x=Math.max(0,Math.min(G.board.w-1,+cell.dataset.x+delta[0])), y=Math.max(0,Math.min(G.board.h-1,+cell.dataset.y+delta[1])); const el=document.querySelector(`.pz [data-x="${x}"][data-y="${y}"]`); el?.focus(); el?.scrollIntoView({block:'nearest'}); }
  else if (e.key.toLowerCase() === 'r'){ e.preventDefault(); pzRot(); }
  else if (e.key === 'Escape' && (held || selPiece != null)){ e.preventDefault(); uxCancelPiece(); }
}
function mapChallenge(mods){ return mods.filter(k => ['challenge','mixed'].includes(MODS[k]?.kind)).length; }
function mapKind(k){ return MODS[k]?.kind === 'mixed' ? '取捨' : MODS[k]?.kind === 'challenge' ? '挑戰' : MODS[k]?.kind === 'reward' ? '獎勵' : '未分類'; }
let UX_RETURN_NEW=null;
function uxOfflineGo(tab){
  const fresh=UX_RETURN_NEW;
  if(tab==='warehouse'){WAREHOUSE_UI.kind='core';WAREHOUSE_UI.slot='all';WAREHOUSE_UI.page=0;}
  if(tab==='skills')UI_WORK.inventory=fresh?.kind||'support';
  if(tab==='maps')UI_WORK.adventure='maps';
  hideOverlay();openModal(tab);
  if(tab==='skills'&&fresh){G.newSnap={g:fresh.g,c:fresh.c};UX_RETURN_NEW=null;renderModal(true);}
  requestAnimationFrame(()=>{const el=tab==='skills'?document.getElementById('uxinventory'):document.querySelector('#mbody .ui-map-list');if(el){el.tabIndex=-1;el.focus({preventScroll:true});el.scrollIntoView({block:'start'});}});
}
function uxOfflineReport(o,b,away,sec,saved){
  UX_RETURN_NEW=o.gems||o.carts?{kind:o.gems?'support':'cart',g:b.gems||{},c:b.carts||{}}:null;
  const newPieces=(o.gems||0)+(o.carts || 0), cores=o.cores||0, pending=GAME_FEATURES.cardChoices?G.picks+G.relicPicks:0;
  const action = cores ? `<button class="mb pri" onclick="uxOfflineGo('warehouse')">查看新核心</button>` : o.skillBooks ? `<button class="mb pri" onclick="UX_RETURN_NEW=null;UI_WORK.inventory='active';uxOfflineGo('skills')">查看新技能</button>` : newPieces ? `<button class="mb pri" onclick="uxOfflineGo('skills')">查看新配件</button>` : o.maps && tabOpen('maps') ? `<button class="mb pri" onclick="uxOfflineGo('maps')">查看新地圖</button>` : '';
  return `<h2 class="uxdialog-title">歡迎回家！</h2><p class="uxmeta">離開 ${fmtDur(away)}${away > sec ? `，最多結算 ${fmtDur(sec)}` : ''}</p><div class="uxreturn-summary"><div><span>成長</span><b>等級 ${b.lvl} → ${G.lvl}</b><small>金幣 +${tFmt(G.gold-b.gold)}</small></div><div><span>裝備</span><b>收進 ${o.stored||0} 件</b><small>${cores?`新收藏 ${cores} 種傳奇核心`:`倉庫收進 ${o.stored||0} 件；回來可比較換裝`}</small></div><div><span>新資源</span><b>${newPieces} 件配件／卡匣</b><small>${o.maps} 張地圖${o.skillBooks?` · 新技能圖紙 ${o.skillBooks}`:''}${o.coreDust?` · 核心殘晶 +${o.coreDust}`:''}</small></div>${pending?`<div><span>待選</span><b>${G.picks} 次改裝 · ${G.relicPicks} 次遺物</b><small>選擇已保留，可以稍後處理。</small></div>`:''}</div>${G.deaths>b.deaths ? `<p class="uxwarning">這段時間倒下 ${G.deaths-b.deaths} 次，可先檢查防禦與構築。</p>` : ''}${saved ? '' : '<p class="uxwarning">本機存檔未成功，請至存檔頁匯出存檔碼保存。</p>'}<details class="uxreturn-log"><summary>完整紀錄</summary><ul><li>討伐 ${tFmt(G.totalKills-b.kills)} 隻魔物</li><li>深度 ${b.depth} → ${G.depth}</li><li>倒下 ${G.deaths-b.deaths} 次</li>${o.cards.length ? `<li>依自動隨機設定完成：${o.cards.map(uxEsc).join('、')}</li>` : ''}</ul></details><div class="uxactions">${pending?'<button class="mb pri" onclick="openPendingChoices()">查看待選內容</button>':''}${action}<button class="mb" onclick="hideOverlay()">繼續掛機</button>${saved ? '' : '<button class="mb" onclick="uxOfflineGo(\'save\')">備份存檔</button>'}</div>`;
}
const UX_CSS = `
${UX_THEME}
html{scrollbar-color:var(--ux-scroll) var(--ux-track);scrollbar-width:thin}*{scrollbar-color:var(--ux-scroll) var(--ux-track)}
::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-thumb{background:var(--ux-scroll);border:2px solid var(--ux-track);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--ux-muted)}::-webkit-scrollbar-track{background:var(--ux-track)}
button:enabled,a[href],summary{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:3px}
.uxsr{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
#mbody .dpsbar{top:-8px;background:var(--ux-screen);border-color:var(--ux-edge);margin-bottom:8px}
.uxinspect{margin:6px 0 0;padding:8px 2px 2px;border-top:1px solid #b5c4e5;text-align:left;font-family:system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}
.uxinspect-head{display:flex;align-items:center;gap:7px;font-size:14px}.uxinspect-head .uxquiet{margin-left:auto}.uxinspect-head.big3d{gap:12px;font-size:17px}.uxinspect-head.big3d .eq3d{margin:0!important;flex:none}.uxeffect{font-size:14px;line-height:1.5;font-weight:650;margin-top:4px}.uxmeta{font:12px/1.5 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-muted);margin:4px 0}
.uxinspect .uxquiet,.uxinspect .uxboard-link{min-height:32px;padding:3px 10px!important;font-size:12px;border-radius:6px!important}.uxinspect .uxboard-link{margin-top:4px}
#mbody .pz button.pc{font:inherit;font-size:10px;padding:2px!important;margin:0;aspect-ratio:1;min-width:0;box-shadow:inset 0 2px 3px #1e286440!important;border:1px solid #7d8bbd!important;border-radius:7px!important;background:radial-gradient(circle at 50% 50%,#8294c4 0 18%,#b4c2e6 20%)!important;color:var(--ux-ink)!important;transition:none}
#mbody .pz button.pc.fill{background:linear-gradient(135deg,#ffffffaa,#ffffff00 45%),var(--pc)!important;border:2px solid #fff!important;box-shadow:inset 0 2px 0 #fffd,inset 0 -3px 0 #00003c35!important}
#mbody .pz button.pc:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:-3px;z-index:2}#mbody .pz button.pc.pv.ok{background:#b8f5d0!important;border-color:#19865a!important}#mbody .pz button.pc.pv.bad{background:#ffc4c4!important;border-color:#bd342b!important}
#mbody .pzbar{bottom:0;background:var(--ux-screen);border-top:1px solid #b6c5e6;padding:6px 0}.pzbar button{min-height:36px}.uxgrid-help{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted)}
#ovl{z-index:70}#ovl .mbox{max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}.uxdialog-title{font-size:17px;margin:2px 0 10px}.uxactions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.uxactions button{min-height:40px}.uxwarning{font:13px/1.5 system-ui,sans-serif;color:#8f3526;background:#fff0e5;padding:8px;border-left:3px solid var(--ux-accent)}
#mbody .char-card{grid-column:1/-1}.char-card .chars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.char-card .chr{min-width:0;min-height:60px;align-items:flex-start;text-align:left;gap:4px;padding:8px!important;white-space:normal}.char-card .chr b{font-size:14px;word-break:keep-all}.char-card .chr .mute{font:12px/1.45 system-ui,sans-serif;color:var(--ux-muted)}.char-card .rh{align-items:center}.char-card .rh button{min-height:36px;letter-spacing:0}.char-card .char-description{font:13px/1.55 system-ui,sans-serif;margin:8px 0 0}
.uxcraft-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.uxcraft-action{min-width:0}.uxcraft-action button{width:100%;min-height:40px;padding:5px 6px!important;font-size:12px!important;white-space:normal}.uxcraft-action p{font:12px/1.5 system-ui,sans-serif;margin:5px 0 0;color:var(--ux-muted)}.uxcraft-result{font:13px/1.5 system-ui,sans-serif;padding:8px;background:#e5f1ea;border-left:3px solid #26805c}.sv{resize:none!important}
.uxreturn-summary{display:grid;gap:7px;margin:12px 0}.uxreturn-summary>div{display:grid;grid-template-columns:60px 1fr;gap:3px 8px;background:#eef3fd;border:1px solid #bdcae6;border-radius:7px;padding:8px 10px}.uxreturn-summary span{grid-row:1/3;color:var(--ux-muted);font-size:12px}.uxreturn-summary b{font-size:15px}.uxreturn-summary small{font-size:12px;color:var(--ux-muted)}.uxreturn-log{font-size:13px;margin-top:10px}.uxreturn-log summary{padding:6px 0}
body.m #mttl{height:auto;min-height:44px;padding:2px 6px 2px 10px}body.m #mttl button{width:40px;height:40px;font-size:14px}body.m #mbody .qm{width:36px;height:36px;line-height:30px;font-size:14px}body.m .uxinspect .uxquiet,body.m .uxinspect .uxboard-link{min-height:40px}body.m .pzbar button{min-height:40px}body.m #mbody{scroll-padding-top:140px;scroll-padding-bottom:60px}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}}
@media(forced-colors:active){*{scrollbar-color:auto}button:focus-visible,[tabindex]:focus-visible{outline-color:Highlight!important}.uxinspect{border-color:CanvasText}}
`;
function uxInit(){
  for(const [key,src] of Object.entries(ASSET))document.documentElement.style.setProperty('--a-'+key,`url("${src}")`);
  const st=document.createElement('style');st.id='uxstyles';st.textContent=UX_CSS;document.head.appendChild(st);
  const live=document.createElement('div');live.id='uxstatus';live.className='uxsr';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
  document.addEventListener('keydown',uxKeydown,true);
  document.addEventListener('click',e=>{const b=e.target.closest('button:enabled');if(b&&uxMotionEnabled()&&b.animate)b.animate([{filter:'brightness(1.25)'},{filter:'brightness(1)'}],{duration:140,easing:'steps(3,end)'});});
}

let UX_PANEL_MOTION=null;
function uxMotionEnabled(){return !matchMedia('(prefers-reduced-motion: reduce)').matches&&GAME_VIEW.prefs.glitch;}
function uxAnimatePanel(){if(!uxMotionEnabled()||!$('mbody')?.animate)return;UX_PANEL_MOTION?.cancel();UX_PANEL_MOTION=$('mbody').animate([{opacity:.7},{opacity:1}],{duration:140,easing:'steps(3,end)'});}

;
/* ---------- 編年史：全螢幕資料頁，查看所有遊戲資訊（技能、配件、遺物、傳奇裝備、魔物、地圖、角色、規則） ---------- */
const WK = { cat:'skill', q:'' };
const wkEl = { cap:'火', fire:'火', cold:'冰', light:'電' };
const WIKI = {
  skill:{ n:'技能', rows:() => Object.entries(SKILLS).map(([id, K]) => ({ t:K.n, tag:`Lv. ${K.lvl}　${{ fire:'火', cold:'冰', light:'電' }[K.el]}`, d:K.d, s:`${skillFindLabel(id)} · 冷卻 ${K.cd} 秒　倍率 ×${K.mult}`, got:skillAvailable(id), col:K.col, ico:sico(id, 28), mods:Object.values(MODES).filter(M => M.sk === id).map(M => `${M.n}：${M.d}`) })) },
  supp:{ n:'輔助配件', rows:() => Object.entries(SUPPS).map(([id, S]) => ({ t:S.n, d:S.d, s:`${WIRE_COLNAME[GridLab.GEM_COLOR[id]]}色寶石，只可入同色洞；接通後才生效，每技能最多三枚${GridLab.SUPPORTS[id].needs.length ? '　限' + GridLab.SUPPORTS[id].needs.map(k => UX_TAG[k] || k).join('、') : ''}`, got:(G.gems[id] || 0) > 0 || (G.seenG || {})[id], ico:gemIco(id, 28) })) },
  mode:{ n:'模式卡匣', rows:() => Object.entries(MODES).map(([id, M]) => ({ t:M.n, tag:SKILLS[M.sk].n, d:M.d, s:'', got:!!G.seen[id]||!!G.carts[id] })) },
  relic:{ n:'遺物', rows:() => Object.entries(RELICS).filter(([id])=>GAME_FEATURES.cardChoices||G.relics[id]).map(([id, r]) => ({ t:r.n, d:r.d, s:'', got:!!G.relics[id], ico:xico('relic', id, 28) })) },
  legend:{ n:'傳奇裝備', rows:() => Object.entries(LEGENDS).flatMap(([slot, arr]) => arr.map(L => ({ t:L.name, tag:'暗金' + SLOTN[slot], d:L.d, s:gearSourceLabel(L.id), got:!!G.legSeen[L.id], ico:xico('legend', L.id, 30) }))) },
  ach:{ n:'成就', rows:() => Object.entries(ACHS).filter(([id])=>GAME_FEATURES.cardChoices||id!=='card10'||G.ach[id]).map(([id, a]) => ({ t:a.n, tag:'永久傷害 +1%', d:a.d, s:'', got:!!G.ach[id], ico:xico('badge', id, 28) })) },
  card:{ n:GAME_FEATURES.cardChoices?'升級卡':'既有改裝', rows:() => Object.entries(CARDS).filter(([id])=>GAME_FEATURES.cardChoices||G.cards[id]).map(([id, c]) => ({ t:c.n, d:c.d, s:c.sk ? '技能變體：' + SKILLS[c.sk].n : '', got:(G.cards[id] || 0) > 0 })) },
  react:{ n:'元素反應', rows:() => [['火焰', '命中的敵人燃燒 3 秒，持續受到傷害'], ['閃電', '命中的敵人被標記 4 秒'], ['融化', '火焰打到凍結的敵人：傷害 +40%，解除凍結'], ['超導', '閃電打到凍結的敵人：傷害 +30%'], ['蒸氣', '冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒'], ['過載', '火焰或冰霜打到被閃電標記的敵人：傷害 +25%']].map(([t, d]) => ({ t, d, s:'', got:true })) },
  mon:{ n:'魔物', rows:() => MONSTER_GUIDE.map(([id, t, d]) => ({ t, tag:MONSTER_TRAITS[id]?.size,d:d+' · '+(MONSTER_SKILL_NAMES[MONSTER_TRAITS[id]?.skill]||''),s:`生命 ×${MTYPES[id].hp}　傷害 ×${MTYPES[id].dmg}　速度 ${MTYPES[id].spd}`, got:((G.mk || {})[id] || 0) > 0 })).concat([{ t:'精英', tag:'變體', d:'任何雜兵都可能變成精英（深度 6 起）：體型較大、腳下有金環，生命 ×3.2、傷害 ×1.3，金幣與經驗 ×4，必掉裝備', s:'', got:G.maxDepth >= 6 }]) },
  map:{ n:'地圖與詞綴', rows:() => BIOMES.map(b => ({ t:b.n, tag:b.towerOnly?'塔樓':'生態', d:b.towerOnly?'無限之塔專用樓層，每十層更換主題；不會掉落成一般地圖':'BOSS與地圖怪會掉落這個生態的地圖', s:'', got:true })).concat(Object.entries(MODS).map(([id, m]) => ({ t:m.n, tag:mapKind(id), d:m.kind === 'mixed' ? '同時有強化與減弱，計入挑戰詞綴數' : m.kind === 'challenge' ? '計入挑戰詞綴數，數量不是難度評分' : '額外獎勵', s:'', got:true }))) },
  char:{ n:'角色', rows:() => Object.entries(CHARS).map(([id, c]) => ({ t:c.n, tag:'創立角色時選擇', d:c.d, s:`專屬技能「${c.sig.n}」：${c.sig.d}`, got:true })) },
  cos:{ n:'裝扮', rows:() => COS_CATS.map(([k, n]) => ({ t:n, d:COS[k].map(e => e[1]).join('、'), s:`${COS[k].length} 款　價格 ${Math.min(...COS[k].filter(e => e[3] > 0).map(e => e[3]))} 至 ${Math.max(...COS[k].map(e => e[3]))} 金幣`, got:true })) },
  rule:{ n:'規則', rows:() => [['回復與防禦','護甲最多減傷 60%；吸血、回復輔助與討伐回復共享每秒 2.5% 最大生命額度。受傷後兩秒自然回復降至四分之一，最多每秒 1% 最大生命。藥水每 20 秒可回復 25% 生命。'],['改裝選擇','升級改裝卡及BOSS遺物選擇暫停；既有加成及舊待選資料保留。技能拼圖、天賦及模式卡匣照常使用。'],['地形','每張地圖以固定種子生成自然島岸、尺寸與連續坡地，大型物件會影響行走。大型與巨型地圖可切換戰鬥跟隨／全景。雜兵由海岸或玩家周邊遠處入場，普通地圖不設傳送門；BOSS空降。攻擊距離仍以平面計算。'],['技能拼圖', '6×6 面板隨等級逐列解鎖。輔助配件只強化上下左右相鄰的技能；連到 3 個以上輔助「滿載」，每多一個傷害 +8%。'], ['有限天賦','路徑最多 36 點，韌體最多兩個；等級與深度解鎖可用點數。末端節點可免費退回，不能切斷其他節點。舊配置保留快照，可預覽、免費轉換與還原；城市需要有限預算。'],['韌體核心',Object.values(FIRMWARE).map(f=>f.n+'：'+f.d).join('；')],['城市遠征','最深第 8 層開放，三個路段、兩次選路、一次收尾BOSS。三區分別為高速分散、停火回充護盾及可用異常解除的重裝減傷。當局協定不寫入永久卡片。'],['定向核心','區域碎片 24 枚可合成一款對應區域的未持有核心，特殊效果固定、詞綴隨機，不手動換裝；安全首階完整遠征至少 14 枚。收尾另有 15% 區域核心機會。'],['城市中樞','同階三區憑證各一枚開啟中樞，失敗不退憑證；勝利保證掉落出發時目標核心，並解鎖下一階，最高八階。憑證沒有每日重置。'],['城市離線','出發時授權保守或碎片優先選路，前景分岔有 15 秒可自行選路，逾時或離線依出發策略繼續；只完成當前遠征，不重開或消耗其他門票。撤離及死亡保留已完成路段碎片；BOSS未完成便不發收尾獎勵。'],['技能出手','共用 0.4 秒出手時段，依就緒時間輪流。均衡策略先服務最早就緒技能；連動優先可短暫等待凍結或電荷，等不到也會出手。冷卻縮減最多 60%。'],['DPS','直傷預估，包含模式、回放與出手容量的單體直傷期望；不含燃燒、條件反應、角色專技或討伐觸發。命中範圍、移動與連動會令實戰不同。'],['BOSS凍結','單次凍結需累積相當於最大生命 12% 的控制傷害，每次最多推進 75%；累積會逐秒衰減。凍結後適應 4 秒，期間不能再累積。'],['連動卡匣','冷啟動碎星消耗凍結換取三倍單點命中；撥號放電由紅外線原始命中產生電荷，每次最多 4 格，雷射消耗最多 8 格。回放與觸發不會產電。兩款可用 20 電路點數合成。'],['訓練場','可選單體或五個群體假人，持續 30 秒。測量有效傷害、出手、回放與連動；不發放獎勵，結束或取消會還原入場前電荷與冷卻。'],['裝備倉庫','角色頁可開啟 200 格倉庫，比較、鎖定、換裝及回收。手動換裝關閉手動換裝；滿倉優先保留高稀有度及高階詞綴，僅回收未保護裝備。'],['掉落拾取','金幣、電路點數與道具落地後，角色走近才拾取；未拾物會保存。經驗仍由討伐入手，離線補算會完成收集。'],['詞綴階級','T0 最高、T4 最低。新詞綴的 T2、T1、T0 分別在物品等級 5、12、25 解鎖，T0 機率為 1.5%。'],['電路合成','戰鬥頁可花 20 電路點數指定合成鎖頻晶片、分線器、備用電池或延遲緩衝，所有角色都能搭配。'],['共鳴', '塞滿整列：全隊傷害 +12%；塞滿整欄：會心率 +5%；元素相同的兩個技能緊貼：各自傷害 +15%。'], ['改機', '用不到的裝備拆成零件（普通 1、魔法 2、稀有 5、暗金 12）。零件可重新校準、改裝詞綴、升級稀有度，或腐化賭一把。'], ['構築記憶','三套構築保存角色、技能拼圖、天賦、出手策略及實際裝備。切換先保存目前配置；被引用物品受回收保護，改機同步影響所有引用。舊構築沿用目前裝備，保存後才記住；缺件須明確選擇保留目前欄位。'],['校準與升階','校準只重洗同階內數值，種類及階級不變，舊超額數值也可能洗低。指定升階保留種類及階內位置，數值不降低；T2／T1／T0 需要物品等級 5／12／25。T0 另需部位對應區域碎片，核心裝另需一枚殘晶。'],['核心重構','每件重複核心得到一枚殘晶。裝備核心後可在打造的升級頁，以殘晶、來源區碎片及零件提升一級物品等級；保留特殊效果及詞綴階級，數值不降低。深度與城市階級提高上限，腐化及鎖定時不可重構。'],['BOSS保底', '連續沒出暗金時，下一件暗金的機率逐次提高。'], ['離線收益', '離開頁面後回來會結算離線收益，基礎最多 6 小時，可在打造頁的補給站延長。暗金資格與BOSS保底與線上相同；原有經驗 75%、一般裝備掉落 25% 折減仍適用。'], ['無限之塔', '每層殺滿怪就上樓，每 10 層是BOSS，打贏多一條規則，遺物選擇暫停。死亡就結束。'], ['操作', '拖曳旋轉浮島，滾輪或雙指縮放；Q、E 轉向；` 鍵進入扮工模式。']].map(([t, d]) => ({ t, d, s:'', got:true })) },
};
const wikiText = r => [r.t,r.d,r.tag,r.s,...(r.mods || [])].filter(Boolean).join(' ').toLocaleLowerCase();
function wikiRows(q = WK.q, cat = WK.cat){
  const needle = q.trim().toLocaleLowerCase(), cats = needle ? Object.keys(WIKI) : [cat];
  return cats.flatMap(c => WIKI[c].rows().map(r => ({ ...r,c }))).filter(r => !needle || wikiText(r).includes(needle));
}
function wikiCard(r, showCategory){
  return `<article class="wke${r.got ? '' : ' dim'}"><div class="wkh">${r.ico || ''}<b>${uxEsc(r.t)}</b><span class="wkstate">${r.got ? '✓ 已取得' : '未取得'}</span></div>${r.tag || showCategory ? `<div class="uxmeta">${showCategory ? WIKI[r.c].n + ' · ' : ''}${uxEsc(r.tag || '')}</div>` : ''}<p>${uxEsc(r.d)}</p>${r.s ? `<div class="wkm">${uxEsc(r.s)}</div>` : ''}${(r.mods || []).map(m => `<div class="wkm">${uxEsc(m)}</div>`).join('')}</article>`;
}
function wikiEmpty(q){ return `<div class="wkempty"><b>找不到符合「${uxEsc(q)}」的資料</b><p>試試技能名稱、效果或其他關鍵字。</p><button onclick="wikiClear()">清除搜尋</button></div>`; }
function wikiList(){ const rows=wikiRows(); return rows.map(r => wikiCard(r,!!WK.q.trim())).join('') || wikiEmpty(WK.q); }
function wikiHtml(){
  const q=WK.q;
  return `<div class="wkb"><div class="wkt"><h2>編年史</h2><button class="wkclose" aria-label="關閉編年史" onclick="wikiClose()">✕</button><div class="wksearch"><label class="uxsr" for="wkq">搜尋全部分類</label><input id="wkq" placeholder="搜尋名稱或效果" value="${uxEsc(q)}" oncompositionstart="this.dataset.composing='yes'" oncompositionend="this.dataset.composing='';wikiSearch(this.value)" oninput="if(!this.dataset.composing)wikiSearch(this.value)"><button id="wkclear" aria-label="清除搜尋" ${q ? '' : 'hidden'} onclick="wikiClear()">清除</button></div></div><div class="wkm2"><nav class="wkn" aria-label="編年史分類">${Object.keys(WIKI).map(c => `<button data-wk-cat="${c}" class="wkc${!q.trim() && c === WK.cat ? ' on' : ''}" aria-pressed="${!q.trim() && c === WK.cat}" onclick="wikiCategory('${c}')">${WIKI[c].n}</button>`).join('')}</nav><div class="wkcontent"><p id="wkcount" class="wkcount" role="status">找到 ${wikiRows().length} 筆${q ? '，搜尋全部分類' : ''}</p><div class="wkl">${wikiList()}</div></div></div></div>`;
}
function wikiRender(keep){
  const el=$('wiki'); if (!el) return;
  if (!keep) el.innerHTML=wikiHtml();
  else { el.querySelectorAll('.wkc').forEach(b=>{const on=!WK.q.trim()&&b.dataset.wkCat===WK.cat;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});el.querySelector('.wkl').innerHTML=wikiList(); $('wkcount').textContent=`找到 ${wikiRows().length} 筆${WK.q.trim() ? '，搜尋全部分類' : ''}`; $('wkclear').hidden=!WK.q; }
}
function wikiSearch(value){ WK.q=value; wikiRender(true); }
function wikiClear(){ WK.q=''; $('wkq').value=''; wikiRender(true); $('wkq').focus(); }
function wikiCategory(cat){ WK.cat=cat; WK.q=''; wikiRender(); requestAnimationFrame(() => { const el=$('wiki').querySelector('.wkc.on'); el?.focus({preventScroll:true}); }); }
const WIKI_CSS = `
${UX_THEME}
.wkb{width:min(980px,100%);height:min(760px,100%);background:var(--ux-screen);border:2px solid #fff;outline:1px solid var(--ux-edge);border-radius:12px;box-shadow:0 8px 30px #141e7355;display:flex;flex-direction:column;overflow:hidden;font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}
.wkt{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 12px;background:var(--ux-blue);color:#fff}.wkt h2{font-size:18px;margin:0}.wkcaption{font-size:12px}.wkclose{margin-left:auto}.wksearch{display:flex;gap:6px;min-width:0;margin-left:auto}.wksearch input{width:min(280px,40vw);min-width:0;padding:8px 10px;border-radius:8px;border:1px solid var(--ux-edge);font:14px system-ui,sans-serif;color:var(--ux-ink);background:#fff}.wksearch button,.wkt button{min-height:36px;border-radius:7px;padding:5px 10px;border:1px solid var(--ux-edge);cursor:pointer}
.wkm2{display:flex;flex:1;min-height:0}.wkn{width:145px;flex:none;display:flex;flex-direction:column;gap:6px;padding:10px;overflow:auto;border-right:1px solid #bdcae6}.wkc{font:13px/1.4 system-ui,sans-serif;text-align:left;border:1px solid var(--ux-edge);border-radius:7px;background:transparent;color:var(--ux-ink);padding:8px;cursor:pointer;min-height:36px}.wkc.on{outline:2px solid var(--ux-blue)}.wkcontent{flex:1;overflow:auto;min-width:0}.wkcount{padding:8px 12px;margin:0;color:var(--ux-muted);font-size:13px}.wkl{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:10px;padding:0 10px 12px;align-content:start}.wke{background:#fff;border:1px solid #b6c5e5;border-left:3px solid var(--ux-blue);border-radius:9px;padding:10px 12px;min-width:0;overflow-wrap:anywhere}.wke p{margin:6px 0}.wke.dim{border-left-color:#96a0b8}.wke.dim .spr{filter:grayscale(1)}.wkh{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.wkh b{font-size:15px}.wkstate{font-size:12px;margin-left:auto;color:var(--ux-muted)}.wkm{font-size:13px;color:var(--ux-blue);margin-top:4px}.wkempty{grid-column:1/-1;padding:24px 12px;border:1px dashed var(--ux-edge);border-radius:10px}.wkempty p{color:var(--ux-muted)}
[hidden]{display:none!important}.wkb :focus-visible{outline:3px solid var(--ux-focus);outline-offset:2px}
@media(max-width:700px){.wkt h2{white-space:nowrap}.wksearch{order:3;flex:1 0 100%;margin-left:0}.wksearch input{flex:1;width:0}.wkm2{flex-direction:column}.wkn{flex-direction:row;width:auto;max-height:105px;flex-wrap:wrap;border-right:0;border-bottom:1px solid #bdcae6;gap:6px;padding:8px}.wkc{flex:none;min-height:40px}.wkl{grid-template-columns:1fr}.wkt button{min-height:40px}}
`;
function wikiOverlay(){
  let el=$('wiki');
  if (!el){ el=document.createElement('div');el.id='wiki';document.body.appendChild(el);const st=document.createElement('style');st.textContent=`#wiki{position:fixed;inset:0;z-index:60;background:#28326e70;display:flex;align-items:center;justify-content:center;padding:12px}#wiki[hidden]{display:none}${WIKI_CSS}${UX_MATERIAL_CSS}`;document.head.appendChild(st); }
  wikiRender();uxOpenDialog(el,'編年史',wikiClose);
}
function wikiClose(){ const el=$('wiki');if(el)uxCloseDialog(el); }
/* 新分頁保留開啟當下的進度，資料及搜尋語意與遊戲內版一致。 */
function wikiPage(){
  const fx=typeof viewFxSnapshot==='function'?viewFxSnapshot():{head:'',body:'',defs:''};
  const cats=Object.keys(WIKI), vars=Object.keys(ASSET).filter(k => k !== 'wordmark').map(k => `--a-${k}:url("${ASSET[k]}")`).join(';');
  const sections=cats.map(c => { const rows=WIKI[c].rows(); return `<section id="c-${c}"><h2 tabindex="-1">${WIKI[c].n}<small>已取得 ${rows.filter(r=>r.got).length}／${rows.length}</small></h2><table aria-label="${WIKI[c].n}"><thead><tr><th scope="col">名稱</th><th scope="col">效果</th><th scope="col">取得狀態</th></tr></thead><tbody>${rows.map(r => `<tr data-search="${uxEsc(wikiText(r))}"><td class="n">${r.ico || ''}<b>${uxEsc(r.t)}</b>${r.tag ? `<span class="tg">${uxEsc(r.tag)}</span>` : ''}</td><td class="desc">${uxEsc(r.d)}${r.s ? `<div class="s">${uxEsc(r.s)}</div>` : ''}${(r.mods || []).map(m=>`<div class="m">${uxEsc(m)}</div>`).join('')}</td><td class="g">${r.got ? '✓ 已取得' : '未取得'}</td></tr>`).join('')}</tbody></table></section>`; }).join('');
  const script = `const input=document.getElementById('q'),clear=document.getElementById('clear'),count=document.getElementById('count'),empty=document.getElementById('empty');let composing=false,currentSection=document.querySelector('nav a[aria-current]')?.getAttribute('href');function filter(){const v=input.value.trim().toLocaleLowerCase();document.querySelectorAll('nav a').forEach(a=>{if(!v&&a.getAttribute('href')===currentSection)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});let total=0;document.querySelectorAll('main section').forEach(s=>{let n=0;s.querySelectorAll('tbody tr').forEach(r=>{r.hidden=!!v&&!r.dataset.search.includes(v);if(!r.hidden)n++});s.hidden=!n;total+=n});clear.hidden=!input.value;empty.hidden=total>0;document.getElementById('empty-query').textContent=input.value;count.textContent='找到 '+total+' 筆'+(v?'，搜尋全部分類':'')}function reset(){input.value='';filter();input.focus()}input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>{composing=false;filter()});input.addEventListener('input',()=>{if(!composing)filter()});clear.onclick=reset;document.getElementById('empty-clear').onclick=reset;document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();currentSection=a.getAttribute('href');input.value='';filter();const target=document.querySelector(a.getAttribute('href'));if(target){target.scrollIntoView();target.querySelector('h2').focus({preventScroll:true})}}));const header=document.querySelector('header');new ResizeObserver(()=>{document.documentElement.style.setProperty('--wiki-header',header.offsetHeight+'px')}).observe(header);filter();`;
  let page=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>編年史 · Idle Hero</title><link rel="icon" type="image/svg+xml" href="${ASSET.favicon}"><style>:root{${vars}}${UX_THEME}
*{box-sizing:border-box}body{margin:0;background:#d9e6fb;color:var(--ux-ink);font:14px/1.6 system-ui,"Microsoft JhengHei",sans-serif;scrollbar-color:var(--ux-scroll) var(--ux-track)}header{position:sticky;top:0;z-index:5;background:var(--ux-blue);color:#fff;display:flex;gap:8px 16px;align-items:center;flex-wrap:wrap;padding:10px 16px;box-shadow:0 2px 6px #17295a33}h1{margin:0;font-size:19px;white-space:nowrap}.caption{font-size:12px}.search{margin-left:auto;display:flex;gap:6px;min-width:0}input{min-width:0;width:280px;padding:9px 12px;border:1px solid var(--ux-edge);border-radius:8px;font:14px system-ui,sans-serif}button{cursor:pointer;min-height:40px;border:1px solid var(--ux-edge);border-radius:7px;background:transparent;color:var(--ux-ink);padding:6px 12px;font:inherit}.w{display:flex;max-width:1200px;margin:auto;padding:16px;gap:16px}nav{position:sticky;top:calc(var(--wiki-header,64px) + 12px);align-self:flex-start;width:145px;flex:none;display:flex;flex-direction:column;gap:6px}nav a{padding:7px 10px;border:1px solid var(--ux-edge);border-radius:7px;background:transparent;color:var(--ux-ink);text-decoration:none}main{min-width:0;flex:1}#count{margin:0 0 10px;color:var(--ux-muted)}section{scroll-margin-top:calc(var(--wiki-header,80px) + 12px);margin-bottom:16px;border:1px solid var(--ux-edge);border-radius:10px;background:var(--ux-screen);overflow:hidden}h2{margin:0;padding:8px 12px;background:var(--ux-blue);color:#fff;font-size:16px}h2 small{margin-left:12px;font-size:12px;font-weight:400}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:12px;color:var(--ux-muted);padding:6px 12px}td{padding:10px 12px;border-top:1px solid #bdcae6;vertical-align:top}.n{width:29%}.n b{margin-left:5px}.tg{font-size:12px;display:block;color:var(--ux-muted)}.g{width:100px;white-space:nowrap;color:var(--ux-muted);font-size:12px}.s{color:var(--ux-muted);font-size:13px}.m{color:var(--ux-blue);font-size:13px}.spr{display:inline-block;vertical-align:middle}.wkempty{background:var(--ux-screen);padding:24px;border:1px dashed var(--ux-edge);border-radius:10px}.sr{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}[hidden]{display:none!important}:focus-visible{outline:3px solid var(--ux-focus);outline-offset:2px}a:hover,button:hover{background:#e2ecff}
@media(max-width:700px){header{padding:10px 12px}.caption{flex:1;font-size:12px}.search{flex:1 0 100%;margin:0}.search input{flex:1;width:0}.w{display:block;padding:10px}nav{position:static;width:auto;display:flex;flex-direction:row;flex-wrap:wrap;margin-bottom:12px}nav a{font-size:13px;min-height:40px}thead{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}table,tbody{display:block}tr{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:12px;gap:6px 8px;border-top:1px solid #bdcae6}td{display:block;border:0;padding:0}.n{width:auto;grid-column:1;grid-row:1}.g{width:auto;grid-column:2;grid-row:1}.desc{grid-column:1/-1}.n b{font-size:15px}.tg{margin:3px 0 0}h2 small{display:inline-block}.n .spr{width:28px!important;height:28px!important}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}@media(forced-colors:active){body{scrollbar-color:auto}}
</style>${fx.head}</head><body ${fx.body}>${fx.defs}<header><h1>編年史</h1><span class="caption">開啟當下的進度快照<br>關閉此分頁即可回到遊戲</span><div class="search"><label for="q" class="sr">搜尋全部分類</label><input id="q" placeholder="搜尋名稱或效果"><button id="clear" aria-label="清除搜尋" hidden>清除</button></div></header><div class="w"><nav aria-label="編年史分類">${cats.map(c=>`<a href="#c-${c}"${c===cats[0]?' aria-current="location"':''}>${WIKI[c].n}</a>`).join('')}</nav><main><p id="count" role="status"></p><div id="empty" class="wkempty" hidden><b>找不到符合「<span id="empty-query"></span>」的資料</b><p>試試技能名稱、效果或其他關鍵字。</p><button id="empty-clear">清除搜尋</button></div>${sections}</main></div><script>${script}${'<'+'/script>'}</body></html>`;
  return page;
}
function wikiOpen(){
  try{ const url=URL.createObjectURL(new Blob([wikiPage()],{type:'text/html;charset=utf-8'})),w=window.open(url,'_blank');if(w){setTimeout(()=>URL.revokeObjectURL(url),60000);return;}URL.revokeObjectURL(url); }catch(e){}
  wikiOverlay();
}

;
/* 操作台：共用導覽、工作分類與響應式外框。UI 暫存不改遊戲規則。 */
const UI_NAV = [
  {k:'char',n:'角色',icon:'role',pages:['char','dress','tree']},
  {k:'warehouse',n:'背包',icon:'bag',pages:['warehouse']},
  {k:'skills',n:'技能',icon:'battle',pages:['skills']},
  {k:'craft',n:'打造',icon:'craft',pages:['craft']},
  {k:'maps',n:'冒險',icon:'adventure',pages:['maps']},
  {k:'menu',n:'設定',icon:'more',pages:['menu','goals','ach','dex','rank','log','save','settings','feedback','support']}
];
const UI_TITLE = {warehouse:'背包',char:'角色',dress:'裝扮',skills:'技能',craft:'打造',tree:'天賦',maps:'冒險',menu:'設定',goals:'目標',ach:'成就',dex:'圖鑑',rank:'排行榜',log:'更新日誌',save:'存檔與備份',settings:'遊戲設定',feedback:'意見回饋',support:'贊助'};
const UI_WORK = {inventory:'support',craftSlot:'weapon',craftAct:'upgrade',adventure:'maps'};
function uiNavHtml(){
  return UI_NAV.map(g=>{const current=g.pages.includes(modalTab),locked=!tabOpen(g.k),dot=g.k==='warehouse'?(G.unread?.gear?.length||G.unread?.cores?.length):g.k==='skills'?(G.unread?.skills?.length||G.unread?.gems?.length||G.unread?.carts?.length||G.unread?.boards?.length||dotOn('skills')):g.k==='menu' ? dotOn('col')||logNew() : g.k==='char' ? passPoints()>0&&tabOpen('tree') : dotOn(g.k);
    return `<button class="tab${current?' on':''}${locked?' lock':''}" data-focus="nav-${g.k}" aria-label="${g.n}" ${locked?`aria-describedby="nav-lock-${g.k}"`:dot?`aria-describedby="nav-new-${g.k}"`:""} aria-current="${current?'page':'false'}"  onclick="${locked?`lockTip('${g.k}')`:`openModal('${g.k}')`}">${spr(g.icon,24)}<span>${g.n}</span>${locked?`<span class="uxsr" id="nav-lock-${g.k}">等級 ${TAB_LVL[g.k]} 解鎖，按下查看說明</span>`:''}${dot&&!locked?`<i class="rd" aria-hidden="true"></i><span class="uxsr" id="nav-new-${g.k}">有新內容</span>`:''}</button>`;
  }).join('');
}
function uiTitle(){
  const box=document.querySelector('#modal > .mbox');if(!box)return;
  let el=$('mttl');if(!el){el=document.createElement('div');el.id='mttl';box.insertBefore(el,$('mbody'));}
  const root=UI_NAV.find(g=>g.pages.includes(modalTab)),back=root&&modalTab!==root.k&&modalTab!=='tree';
  const rankBack=modalTab==='rank'&&RANK_UI.open,backName=rankBack?'排行榜':root?.n;
  const hk=MHELP[modalTab],cz=uiBattleSize();document.body.classList.toggle('battle-fold',!GAME_VIEW.watch&&((MOB()&&cz===3)||GAME_VIEW.prefs.hideBattle));
  uiSyncBattleFrame();if(typeof installPlayStyle==='function')installPlayStyle();
  if(typeof lootWorldStyles==='function'){lootWorldStyles();lootBattleRestore();}
  if(typeof audSyncBattle==='function')audSyncBattle(!GAME_VIEW.watch&&(document.body.classList.contains('battle-fold')||!!GAME_VIEW.prefs.hideBattle));
  el.innerHTML=`${back?`<button class="window-back" aria-label="返回${backName}" title="返回${backName}" onclick="${rankBack?'rankOpen(null)':`openModal('${root.k}')`}">←</button>`:''}<h2>${UI_TITLE[modalTab]||'更多'}</h2>${hk?`<button aria-label="${HELP[hk][0]}" onclick="showHelp('${hk}')">?</button>`:''}`;
}
function uiSegments(key,items,label){return `<div class="ui-segments" role="group" aria-label="${label}">${items.map(([id,name,tip,dot])=>`<button aria-pressed="${UI_WORK[key]===id}"${tip?` data-tip="${uxEsc(tip)}"`:''} data-focus="${key}-${id}" onclick="uiWork('${key}','${id}')">${key==='adventure'&&id==='season'?'<img src="'+studioMachine('core')+'" alt="" width="24" height="24">':''}${name}${dot?'<i class="rd" aria-hidden="true"></i><span class="uxsr">有新內容</span>':''}</button>`).join('')}</div>`;}
function uiWork(key,id){
  const allowed={inventory:['active','support','cart'],craftSlot:Object.keys(SLOTN),craftAct:Object.keys(CRAFT),adventure:['maps','city','tower','training','season','rift']};
  if(!allowed[key]?.includes(id))return;UI_WORK[key]=id;renderModal();
}
function uiMenuHtml(){return deviceMenuHtml();}

function charSegHtml(){return `<div class="ui-segments" role="group" aria-label="角色分頁"><button aria-pressed="${modalTab==='char'}" data-focus="char-stats" onclick="openModal('char')">總覽</button><button aria-pressed="${modalTab==='tree'}" data-focus="char-talent"${tabOpen('tree')?'':' class="lock"'} onclick="${tabOpen('tree')?"openModal('tree')":"lockTip('tree')"}">${tabOpen('tree')?'天賦':'天賦 Lv'+TAB_LVL.tree}${passPoints()>0&&tabOpen('tree')?' <span class="attention-dot" role="img" aria-label="有可用天賦點">●</span>':''}</button><button aria-pressed="${modalTab==='dress'}" data-focus="char-dress" onclick="openModal('dress')">裝扮</button></div>`;}
let UI_CHARACTER_PICK = null, UI_CHARACTER_STAGE_VISIT = '';
function uiCharacterCode(id=G.char){return {street:'PULSE',frost:'SPECTRUM',beep:'TRACKER',volt:'MECHANIST'}[id]||'';}
function uiCharacterIdentity(){
  const c=CHARS[G.char];
  return `<div class="cv-identity" role="group" aria-label="目前角色"><div><span class="cv-kicker">${uxEsc(c.title||c.d)}</span><h3>${uxEsc(G.heroName||'未命名')}<span>Lv. ${G.lvl}</span></h3></div><button class="mb" data-focus="character-switch" onclick="uiChooseCharacter()">角色列表 ↗</button></div>`;
}
function uiCharacterStage(dress=false){
  const c=CHARS[G.char],visit=modalTab+':'+G.char,arrive=UI_CHARACTER_STAGE_VISIT!==visit;UI_CHARACTER_STAGE_VISIT=visit;
  return `<div class="cv-stage${arrive?' cv-arrive':''}" aria-label="${uxEsc(c.n)}角色展示"><span class="cv-code" aria-hidden="true">${uxEsc(uiCharacterCode())}</span><span class="cv-stage-label" aria-hidden="true">${dress?'STYLE / 外觀':'CHARACTER / 角色'}</span><div id="pvhost" class="cv-preview" aria-label="${dress?'外觀試穿':'目前角色'}3D 預覽"><div class="cv-fallback"><span>${uxEsc(c.n)}</span><small id="cv-preview-status">正在準備角色…</small><button class="mb" hidden id="cv-preview-retry" onclick="dressRetry()">重試預覽</button></div></div><div class="cv-phone">${phoneButtonHtml()}<span>個人手機</span></div><blockquote class="cv-quote">「${uxEsc(c.quote||c.title||c.d)}」</blockquote><div class="cv-stage-footer"><span>${uxEsc(c.role||c.title||'')}${c.quote?`<small class="cv-q">「${uxEsc(c.quote)}」</small>`:''}</span>${dressPreviewControls()}</div></div>`;
}
function uiCharacterProfile(){
  const [bm,bd]=G.born;
  return `<details class="cv-profile"><summary>個人資料</summary><label for="hname">玩家暱稱<input id="hname" maxlength="12" value="${uxEsc(G.heroName||'')}" onchange="setName(this.value)"></label><p>生日 ${bm} / ${bd} · ${STAR_SIGNS[bm-1]}</p><p>${rankOf()}</p></details>`;
}
function uiCharacterStats(){
  const s=G.st;
  return `<section class="cv-performance" aria-label="戰鬥能力摘要"><div class="cv-stat cv-stat-main"><span>DPS</span><strong>${tFmt(s.dps)}<small>DPS</small></strong></div><div class="cv-stat"><span>最大生命</span><strong>${tFmt(s.life)}</strong></div><div class="cv-stat"><span>會心率</span><strong>${s.crit.toFixed(0)}<small>%</small></strong></div><div class="cv-stat"><span>傷害減免</span><strong>${(s.red*100).toFixed(0)}<small>%</small></strong></div></section><details class="cv-detail"><summary>完整能力與計算說明</summary><dl class="ui-stat-list">${[['普通攻擊傷害',tFmt(s.hit)],['每秒普通攻擊',s.aps.toFixed(2)+' 次'],['會心傷害',s.cm.toFixed(0)+'%'],['護甲',tFmt(s.armor)],['基礎生命回復',s.regen.toFixed(1)+' / 秒']].map(([n,v])=>`<div><dt>${n}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="uxmeta">DPS 為直傷預估，不含持續傷害、條件連動及角色專技。回復仍受戰鬥上限影響，實際傷害可到冒險的訓練場測量。</p></details>`;
}
function uiChooseCharacter(){careerProfiles();}
function uiConfirmCharacter(){careerProfiles();}
function uiCharacterHtml(){return uiCharacterSheetHtml();}

/* 共用物品格：精簡讀數，完整名稱與屬性由點選詳情取得。 */
function uiMapThumbSvg(m){const B=BIOMES[m.biome],blocky=m.biome>=4;let h=0;for(const ch of String(m.id))h=(h*31+ch.charCodeAt(0))>>>0;const sp=[[26,22],[50,18],[36,30],[56,27],[20,27],[44,25]];let o='';for(let i=0;i<4;i++){const [x,y]=sp[(h+i*2)%sp.length],big=(h>>(i+3))&1?1:0.8;o+=blocky?`<path d="M${x-4*big} ${y}h${8*big}v${-7*big}h${-8*big}z" fill="${i%2?B.t1:B.t2}"/><path d="M${x-4*big} ${y-7*big}l${4*big} ${-3*big}l${4*big} ${3*big}z" fill="${B.board.l}"/>`:`<path d="M${x} ${y-12*big}l${5*big} ${12*big}h${-10*big}z" fill="${i%2?B.t1:B.t2}"/><path d="M${x-1} ${y}h2v3h-2z" fill="${B.board.d}"/>`;}return `<svg class="ui-mapthumb" viewBox="0 0 80 56" aria-hidden="true"><ellipse cx="40" cy="50" rx="34" ry="5" fill="#0002"/><path d="M4 24L40 42v9L4 33z" fill="${B.board.d}"/><path d="M76 24L40 42v9l36-18z" fill="${B.board.m}" opacity=".85"/><path d="M40 6L76 24L40 42L4 24z" fill="${B.board.l}" stroke="${B.board.d}" stroke-width="1"/><ellipse cx="40" cy="24" rx="7" ry="3.5" fill="${B.portal}" opacity=".75"/><ellipse cx="40" cy="23" rx="3.5" ry="1.8" fill="${B.glow}"/>${o}</svg>`;}
const UI_THUMB={};
function uiMapThumb(m){const u3=typeof icon3dMapUrl==='function'?icon3dMapUrl(m):'';if(u3)return `<img class="ui-mapthumb" alt="" aria-hidden="true" src="${u3}" style="image-rendering:pixelated">`;   // 地圖縮圖：向量圖先縮成 40×28 再像素化放大，和 3D 畫面的低畫質感一致
  const svg=uiMapThumbSvg(m),key=m.id+':'+m.biome,url=UI_THUMB[key];
  if(url)return `<img class="ui-mapthumb" alt="" aria-hidden="true" src="${url}" style="image-rendering:pixelated">`;
  if(url===undefined){UI_THUMB[key]='';const img=new Image();img.onload=()=>{try{const c=document.createElement('canvas');c.width=40;c.height=28;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.drawImage(img,0,0,40,28);UI_THUMB[key]=c.toDataURL('image/png');if(typeof renderModal==='function'&&!$('modal').hidden)renderModal();}catch(e){UI_THUMB[key]=null;}};img.onerror=()=>{UI_THUMB[key]=null;};img.src='data:image/svg+xml;charset=utf8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" '));}
  return svg;
}
function uiMapCard(m){const B=BIOMES[m.biome],c=mapChallenge(m.mods);return `<button type="button" class="ui-mapcard" data-focus="map-${uxEsc(m.id)}" aria-label="${uxEsc(B.n)}，等級 ${m.lvl}，挑戰詞綴 ${c}，查看詳情" style="--b1:${B.board.l};--b2:${B.board.m};--b3:${B.board.d};--t1:${B.t1};--t2:${B.t2}" onclick="uiInspectMap('${encodeURIComponent(m.id).replace(/'/g,'%27')}')">${uiMapThumb(m)}<b>${uxEsc(B.n)}${playNewBadge('maps',m.id)}</b><span class="lv">Lv. ${m.lvl}</span><span class="ch">挑戰詞綴 ${c}</span></button>`;}
function rarityBadge(r){const i=Math.max(0,Math.min(3,r|0));return `<span class="rarity-tag rarity-${i}" data-rarity="${i}"><i aria-hidden="true">${['▪','◇','◆','✦'][i]}</i>${['普通','魔法','稀有','傳奇'][i]}</span>`;}
function uiItemTile({focus,icon,name,meta='',state='',action,rarity=0,tip='',fresh=false}){return `<button type="button" class="ui-item-tile"${tip?` data-tip="${uxEsc(tip)}"`:''} data-rarity="${rarity}" style="--item-rarity:${RAR[rarity]?.c||'var(--ux-edge)'}" data-focus="${uxEsc(focus)}" aria-label="${uxEsc(name)}，${fresh?'新獲得，':''}${RAR[rarity]?RAR[rarity].n+'，':''}${uxEsc(meta)}${state?'，'+uxEsc(state):''}，查看詳情" onclick="${action}"><span class="ui-item-state">${uxEsc(state)}</span>${icon}${fresh?'<i class="item-new-dot" role="img" aria-label="新獲得"></i>':''}${rarityBadge(rarity)}<b>${uxEsc(name)}</b><small>${uxEsc(meta)}</small></button>`;}
function uiGearState(it){return G.equip[it.slot]===it?'穿著':it.kept?'鎖定':gearReferenced(it)?'構築':G.equipBackup[it.slot]===it?'上一件':it.cr?'腐化':it.lk!=null?'詞綴鎖':'';}
function uiGearTile(it,core=false){return uiItemTile({focus:core?'core-'+it.lg:'gear-'+it.uid,icon:core?xico('legend',it.lg,28):eqico(it.slot,it.r,52,it),name:it.name,meta:`Lv. ${it.il} · ${it.aff.length?'T'+Math.min(...it.aff.map(a=>affTier(a,it.il))):RAR[it.r].n}`,fresh:noticeHas(core?'cores':'gear',core?it.lg:it.uid),state:uiGearState(it)||'',action:core?`uiInspectCore('${it.lg}')`:`uiInspectGear(${it.uid})`,rarity:it.r,tip:[it.name+'（'+SLOTN[it.slot]+' · '+RAR[it.r].n+'）',...itemLines(it).map(l=>l.t)].join('\n')});}
function uiEquippedTile(slot){const it=G.equip[slot];return it?uiItemTile({focus:'equipped-'+slot,icon:it.lg?xico('legend',it.lg,28):eqico(slot,it.r,52,it),name:it.name,meta:`${SLOTN[slot]} · Lv. ${it.il}`,state:'穿著',action:`uiInspectEquipped('${slot}')`,rarity:it.r}):`<button class="ui-item-tile ui-item-empty" data-focus="equipped-${slot}" aria-label="${SLOTN[slot]}空欄位，前往背包選擇裝備" onclick="openModal('warehouse')">${eqico(slot,0,52)}<b>${SLOTN[slot]}</b><small>空欄位 · 選擇裝備</small></button>`;}
function uiInspectEquipped(slot){const it=G.equip[slot];if(!it)return;if(it.lg)return uiInspectCore(it.lg);if(G.inventory.includes(it))return uiInspectGear(it.uid);showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[slot]} · ${RAR[it.r].n} · 物品等級 ${it.il} · 穿著中</p><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><p class="uxmeta">${it.lg?gearSourceLabel(it.lg):'一般冒險與地圖掉落'}</p><button class="mb" data-initial-focus onclick="hideOverlay()">返回角色</button>`);}
function uiGearComparison(it){const next=calc({...G.equip,[it.slot]:it}),current=G.st;return `<dl class="ui-stat-list"><div><dt>預估傷害</dt><dd>${tFmt(current.dps)} → ${tFmt(next.dps)}</dd></div><div><dt>最大生命</dt><dd>${tFmt(current.life)} → ${tFmt(next.life)}</dd></div><div><dt>會心率</dt><dd>${current.crit.toFixed(1)}% → ${next.crit.toFixed(1)}%</dd></div></dl>`;}
function uiInspectCore(id){const it=G.armory[id];if(!it)return;noticeRead('cores',id);const on=G.equip[it.slot]===it,back=modalTab==='warehouse'?'返回倉庫':'返回收藏';showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · 暗金 · 物品等級 ${it.il}${on?' · 穿著中':''}</p><p>${uxEsc(LEGEND_BY[id].d)}</p><p class="uxmeta">${gearSourceLabel(id)}</p>${uiGearCompareSheet(it)}<div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">${back}</button><button class="mb pri" ${on||!canUseGear(it)?'disabled':''} onclick="uiEquipCore('${id}')">${on?'已裝備':!canUseGear(it)?'角色不符':'換上'+uxEsc(it.name)}</button></div>`);}
function uiCoreCollection(){const ids=Object.keys(LEGEND_BY).filter(id=>G.armory[id]);return `<button class="mb" onclick="uiCityGo()">城市遠征 · 定向追求核心</button><details class="ui-section ui-core-collection"><summary>傳奇核心收藏 ${ids.length}／${Object.keys(LEGEND_BY).length}</summary><p>角色專裝：雜兵 0.001%、精英 0.01%、BOSS 0.1% 各自抽一件，不受一般暗金保底影響，僅對應職業可裝備。</p>${ids.length?`<div class="ui-item-grid ui-core-grid" role="group" aria-label="核心收藏">${ids.map(id=>uiGearTile(G.armory[id],true)).join('')}</div>`:'<p>尚未收藏核心。冒險掉落或城市定向合成都會加入這裡。</p>'}<details><summary>收藏與重複品規則</summary><p>職業專裝只可由對應職業裝備，保留在各角色的收藏。專裝另作獨立掉落判定，不受暗金保底或城市合成影響。同款保留一件。穿著、構築引用、詞綴鎖定或腐化的核心不會自動替換。重複品提供零件及殘晶，打造可提高核心等級。</p></details><div class="uxactions">${Object.keys(SLOTN).filter(slot=>G.equipBackup[slot]).map(slot=>`<button class="mb" onclick="uiRestoreEquipment('${slot}')">切回上一件${SLOTN[slot]}</button>`).join('')}</div></details>`;}
function uiEquipCore(id){ if(equipCore(id)){hideOverlay();renderModal();uxAnnounce(`已換上${LEGEND_BY[id].name}，可切回上一件裝備。`);} }
function uiRestoreEquipment(slot){ if(restoreEquipment(slot)){renderModal();uxAnnounce(`已切回上一件${SLOTN[slot]}。`);} }
function uiRevealSelection(){/* Selection keeps the current reading position. */}
function uiApplyLayout(initial=false){
  const desktop=innerWidth>=1180,wasDesktop=DESK();
  document.body.classList.toggle('d',desktop);document.body.classList.toggle('m',!desktop);
  if(!initial&&desktop===wasDesktop)return;
  if(!initial){uiTitle();return;}
  $('modal').hidden=false;modalTab=desktop?'skills':'char';renderModal(true);
}
function uiInitLayout(){
  const st=document.createElement('style');st.id='layoutstyles';st.textContent=UI_LAYOUT_CSS;document.head.appendChild(st);
  const menu=document.createElement('div');menu.id='mmenu';menu.hidden=true;
  // 指令仍使用引擎原有的事件處理，不建立另一套設定狀態。
  $('mbody').appendChild(menu);
  const b=$('btns');if(b){menu.appendChild(b);b.querySelectorAll('.act').forEach(x=>{if(['技能','天賦盤','地圖','存檔'].includes(x.textContent.trim()))(x.closest('.stepwrap')||x).style.display='none';});}
  const settings=document.createElement('div');settings.id='uisettings';settings.hidden=true;settings.innerHTML='<section class="ui-settings-intro"><h3>戰鬥與工具</h3></section>';settings.appendChild(menu);document.querySelector('#modal > .mbox').appendChild(settings);uiInstallSettings();
  uiApplyLayout(true);let frame;
  addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>uiApplyLayout());});
}
const UI_LAYOUT_CSS=`
body.m.battle-fold>canvas,body.m.battle-fold>.world-travel{display:none!important}
body.m .stage{min-width:0;max-width:100%;overflow:hidden}body.m #fig{max-width:100%;overflow:hidden}

/* Character cover: scoped business variant; the global blue-violet shell stays unchanged. */
.character-view{--cv-ink:#241d59;--cv-blue:#4141bb;--cv-signal:#8bdeff;--cv-accent:#e4ff74;--cv-paper:#f4f5ff;container-type:inline-size}
.character-view[data-character="frost"]{--cv-signal:#bdb3ff;--cv-accent:#9bffe1}
.character-view[data-character="beep"]{--cv-signal:#ffc7b0;--cv-accent:#ffec7c}
.character-view[data-character="volt"]{--cv-signal:#a5eed3;--cv-accent:#ffd178}
body.ui-material #mbody .character-view .ui-segments{margin-bottom:10px}
body.ui-material #mbody .cv-identity{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:3px 0 10px;min-width:0;color:var(--cv-ink)}
body.ui-material #mbody .cv-identity>div{min-width:0}
body.ui-material #mbody .cv-kicker{font:12px/1.4 var(--ux-body);letter-spacing:.08em;color:var(--cv-blue)}
body.ui-material #mbody .cv-identity h3{display:flex;align-items:baseline;gap:10px;margin:2px 0 0;font:27px/1.25 var(--ux-display);color:var(--cv-ink)}
body.ui-material #mbody .cv-identity h3>span{font:13px var(--ux-body);white-space:nowrap}
body.ui-material #mbody .cv-identity>.mb{font-size:13px!important;min-height:44px;flex:none;padding:7px!important}
body.ui-material #mbody .cv-stage{position:relative;isolation:isolate;height:330px;overflow:hidden;background:linear-gradient(155deg,var(--cv-signal) 0 47%,#e8edff 47% 100%);border:2px solid var(--cv-ink);box-shadow:3px 3px 0 var(--cv-ink);margin:0 3px 0 0;color:var(--cv-ink)}
.cv-stage::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.25;background:repeating-linear-gradient(135deg,transparent 0 28px,#ffffffb0 28px 30px);pointer-events:none}
.character-view[data-character="frost"] .cv-stage::before{background:repeating-radial-gradient(circle at 32% 48%,transparent 0 20px,#ffffffc0 21px 23px,transparent 24px 38px)}
.character-view[data-character="beep"] .cv-stage::before{background:repeating-linear-gradient(0deg,transparent 0 35px,#ffffffd0 35px 37px),repeating-linear-gradient(90deg,transparent 0 35px,#ffffffd0 35px 37px)}
.character-view[data-character="volt"] .cv-stage::before{background:repeating-linear-gradient(90deg,transparent 0 30px,#ffffffd0 30px 45px,transparent 45px 70px);transform:skewY(-18deg)}
body.ui-material #mbody .cv-code{position:absolute;left:3%;top:23px;right:0;z-index:0;font:clamp(80px,29cqw,152px)/1 var(--ux-display);letter-spacing:-.08em;color:var(--cv-blue);transform:skewY(-8deg);white-space:nowrap;pointer-events:none;user-select:none}
body.ui-material #mbody .cv-stage-label{position:absolute;left:10px;top:9px;z-index:3;font:11px/1 var(--ux-body);letter-spacing:.1em}
body.ui-material #mbody .cv-preview{position:absolute;left:0;right:68px;top:30px;bottom:42px;z-index:1}
.cv-preview canvas{position:relative;z-index:1}
.cv-fallback{position:absolute;inset:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px;text-align:center;background:var(--cv-paper);font:14px/1.5 var(--ux-body)}
.cv-preview[data-preview="ready"] .cv-fallback{display:none}
.cv-preview[data-preview="failed"] .cv-fallback{z-index:4}
.cv-fallback [hidden]{display:none!important}
body.ui-material #mbody .cv-phone{position:absolute;right:10px;top:56px;z-index:2;width:76px;display:flex;flex-direction:column;gap:5px;align-items:center}
body.ui-material #mbody .cv-phone .ph-open{position:relative;inset:auto;width:76px;height:108px;min-height:108px!important;border:1px solid #fff!important;outline:1px solid var(--cv-ink);border-radius:0!important;background:#eef0ff8c!important;box-shadow:2px 2px 0 #241d5933!important}
.cv-phone .ph-mini2{transform:scale(.7)}
.cv-phone>span{font:11px/1.3 var(--ux-body);background:var(--cv-paper);padding:3px 5px}
.cv-stage-footer .cv-q{display:block;font-size:10px;line-height:1.4;opacity:.85}body.ui-material #mbody .cv-quote{display:none!important}
body.ui-material #mbody .cv-quote{position:absolute;right:10px;top:189px;width:90px;margin:0;z-index:3;padding:7px 5px;background:var(--cv-accent);font:12px/1.55 var(--ux-body);color:var(--cv-ink);border:1px solid var(--cv-ink);box-shadow:2px 2px 0 #241d5926;transform:rotate(-3deg)}
body.ui-material #mbody .cv-stage-footer{position:absolute;inset:auto 0 0;min-height:44px;padding:0 8px;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:5px;background:var(--cv-blue);color:#fff}
.cv-stage-footer>span{font:11px/1.5 var(--ux-body);min-width:0;max-width:58%;overflow-wrap:anywhere}
.cv-rotate{display:flex;align-items:center;gap:3px;flex:none}
body.ui-material #mbody .cv-rotate>.mb{min-width:44px;min-height:44px;height:auto!important;padding:2px 5px!important;font:12px var(--ux-body)!important;background:transparent!important;border:0!important;box-shadow:none!important;color:#fff!important}
body.ui-material #mbody .cv-rotate>.mb:hover{background:#ffffff26!important}
body.ui-material #mbody .cv-rotate>.mb:focus-visible{outline:2px solid var(--cv-accent)!important;outline-offset:-3px}
body.ui-material #mbody .cv-loadout{padding:14px 0 8px}
.cv-section-label{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;color:var(--cv-ink);font:14px/1.4 var(--ux-body)}
body.ui-material #mbody .cv-section-label>h3{font:17px/1.4 var(--ux-display);margin:0;color:var(--cv-ink)}
body.ui-material #mbody .cv-section-label>.mb{font-size:12px!important;min-height:44px;padding:4px 6px!important}
body.ui-material #mbody .character-view .ui-equipment{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:5px 0 0}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile{position:relative;min-width:0;min-height:124px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;padding:7px 5px 5px!important;background:linear-gradient(#f7f9ff 0 65%,#dfe4f5 65%)!important;border:1px solid #fff!important;border-bottom:3px solid var(--item-rarity,var(--ux-edge))!important;border-radius:0!important;outline:1px solid #7f88ae;box-shadow:2px 2px 0 #7f88ae44!important;color:var(--cv-ink)!important}
body.ui-material #mbody .character-view .ui-equipment .ui-item-state{position:static;align-self:flex-start;font:10px/1.4 var(--ux-body);color:#445274;background:none;min-height:14px;padding:0}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile>.spr{flex:none;width:52px!important;height:52px!important;margin:0!important;object-fit:contain}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile>b{font:12px/1.4 var(--ux-body)!important;color:var(--cv-ink)!important;white-space:normal;overflow-wrap:anywhere;max-width:100%;text-align:center;display:block;-webkit-line-clamp:unset;min-height:1.4em}
body.ui-material #mbody .character-view .ui-equipment .ui-item-tile>small{margin-top:auto;font:10px/1.4 var(--ux-body)!important;color:#445274!important;text-align:center}
body.ui-material #mbody .character-view .ui-equipment button:hover{outline:2px solid var(--cv-blue);transform:translateY(-1px)}
body.ui-material #mbody .character-view .ui-equipment button:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:2px}
body.ui-material #mbody .cv-performance{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--cv-ink);border:2px solid var(--cv-ink);margin:10px 0 8px}
body.ui-material #mbody .cv-stat{padding:11px 12px;background:#f3f3ff;color:var(--cv-ink);min-width:0}
body.ui-material #mbody .cv-stat-main{background:var(--cv-blue);color:#fff}
.cv-stat>span{display:block;font:12px/1.4 var(--ux-body)}
body.ui-material #mbody .cv-stat>strong{display:block;margin-top:3px;font:25px/1.2 var(--ux-display);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.cv-stat strong>small{font:12px var(--ux-body);margin-left:5px}
body.ui-material #mbody .cv-signature{margin:18px 0;padding:10px 12px 12px;border-left:5px solid var(--cv-blue);background:linear-gradient(110deg,#ffffffb0,transparent);color:var(--cv-ink)}
body.ui-material #mbody .cv-signature>h3{font:22px/1.3 var(--ux-display);margin:4px 0 6px;background:none;border:0;color:var(--cv-ink)}
.cv-signature>p,.cv-roster-detail>p{font:14px/1.65 var(--ux-body);margin:5px 0}
body.ui-material #mbody .cv-progress{font:12px/1.6 var(--ux-body);color:var(--ux-muted);margin:12px 0}
.cv-detail>p,.cv-profile>p{font:13px/1.6 var(--ux-body)}
.cv-profile label{display:block;font:14px/1.5 var(--ux-body);padding:10px 0}
body.ui-material #mbody .cv-profile input{display:block;max-width:100%;width:240px;min-height:44px;font:16px var(--ux-body);margin-top:5px}
.cv-wardrobe{padding-top:15px}
.cv-wardrobe .dcats{display:flex;gap:5px;margin:8px 0}
body.ui-material #mbody .cv-wardrobe .dcats>.mb{flex:1;min-height:44px;font:14px var(--ux-body)!important}
body.ui-material #mbody .cv-wardrobe .dcats>.mb[aria-pressed="true"]{background:var(--cv-blue)!important;color:#fff!important}
.cv-styles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
body.ui-material #mbody .cv-style{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:120px;padding:7px 5px!important;white-space:normal;font:12px/1.4 var(--ux-body)!important;min-width:0;border-radius:0!important}
.cv-style-art{height:56px;display:flex;align-items:center;justify-content:center}
.cv-style-art>img{object-fit:contain;image-rendering:pixelated}
.cv-style>small{font:11px/1.3 var(--ux-body);margin-top:auto}
body.ui-material #mbody .cv-style[aria-pressed="true"]{outline:2px solid var(--cv-blue)!important;background:var(--cv-blue)!important;color:#fff!important}
body.ui-material #mbody .cv-style[aria-pressed="true"]>small{color:#fff}
body.ui-material #mbody .cv-dress-action{margin:14px 0 10px;padding:12px;border-left:5px solid var(--cv-blue);background:#f4f6ff}
.cv-dress-action strong{font:18px var(--ux-display)}
.cv-dress-action p{font:13px/1.5 var(--ux-body);margin:6px 0 10px}
.cv-dress-action .uxactions{display:flex;flex-wrap:wrap;gap:7px}
body.ui-material #mbody .cv-dress-action .pri{background:var(--cv-blue)!important;color:#fff!important}
body.ui-material #mbody .cv-dress-action button:disabled{background:#ccd3e1!important;color:#596880!important}
body.ui-material #ovl .cv-roster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
body.ui-material #ovl .cv-roster>.mb{min-width:0;min-height:130px;display:flex;flex-direction:column;align-items:center;gap:4px;white-space:normal;padding:8px!important;font:14px/1.5 var(--ux-body)!important}
.cv-roster img{image-rendering:pixelated;object-fit:contain;background:#c9d5f7;flex:none}
.cv-roster small{font:12px var(--ux-body)}
body.ui-material #ovl .cv-roster>.mb[aria-pressed="true"]{background:var(--ux-blue-face)!important;color:#fff!important;outline:2px solid var(--ux-focus)}
.cv-roster-detail{padding:10px;background:#edf0fc;color:var(--ux-ink);border-left:4px solid var(--ux-blue)}
.cv-roster-detail h3{font:18px/1.5 var(--ux-display);margin:0 0 6px}
@keyframes cv-cover-enter{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
@keyframes cv-code-enter{from{opacity:0;transform:translateX(-14px) skewY(-8deg)}to{opacity:1;transform:skewY(-8deg)}}
.cv-arrive .cv-preview{animation:cv-cover-enter .5s ease-out both}
.cv-arrive .cv-code{animation:cv-code-enter .4s ease-out both}
@media(max-width:559px){body.ui-material #mbody .cv-stage{height:260px}body.ui-material #mbody .cv-preview{right:62px;top:22px;bottom:40px}body.ui-material #mbody .cv-phone{right:7px;top:39px;width:65px}body.ui-material #mbody .cv-phone .ph-open{width:65px;height:96px;min-height:96px!important}body.ui-material #mbody .cv-quote{right:7px;top:165px;width:75px;font-size:11px;padding:4px;line-height:1.4}.cv-stage-footer>span{max-width:55%;font-size:10px}body.ui-material #mbody .cv-identity h3{font-size:24px}body.ui-material #mbody .character-view .ui-equipment .ui-item-tile{min-height:117px}.cv-rotate{gap:0}}
@media(max-height:680px) and (max-width:559px){body.ui-material #mbody .cv-stage{height:215px}body.ui-material #mbody .cv-quote{display:none}body.ui-material #mbody .cv-phone{top:35px}}
@media(max-width:359px){body.ui-material #mbody .cv-identity h3{font-size:22px;gap:6px}body.ui-material #mbody .cv-identity>.mb{font-size:12px!important}body.ui-material #mbody .cv-stat{padding:9px}body.ui-material #mbody .cv-stat>strong{font-size:22px}.cv-styles{grid-template-columns:repeat(2,minmax(0,1fr))}body.ui-material #mbody .cv-rotate>.mb{min-width:44px;padding:2px 4px!important}}
@media(prefers-reduced-motion:reduce){.cv-arrive .cv-preview,.cv-arrive .cv-code{animation:none}body.ui-material #mbody .character-view .ui-equipment button:hover{transform:none}}
@media(forced-colors:active){body.ui-material #mbody .cv-stage,body.ui-material #mbody .cv-stat,body.ui-material #mbody .cv-stage-footer{background:Canvas;color:CanvasText;border:1px solid CanvasText}.cv-stage::before,.cv-code{display:none}body.ui-material #mbody .cv-rotate>.mb{color:ButtonText!important;border:1px solid ButtonText!important}}

.ui-feedback{display:grid;gap:12px;max-width:680px;margin:auto}.ui-feedback label{display:grid;gap:6px}.ui-feedback input,.ui-feedback textarea,.ui-feedback select{width:100%;min-height:44px;padding:10px;border:1px solid var(--ux-frame);background:var(--ux-lcd);color:var(--ux-ink)}.ui-feedback textarea{resize:none;min-height:160px}.ui-feedback .ui-feedback-consent{display:flex;align-items:center;gap:8px}.ui-feedback-consent input{width:24px;min-height:24px}.ui-feedback-error{color:#982b25;min-height:24px}.ui-feedback-preview{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--ux-lcd);padding:12px;border:1px solid var(--ux-edge)}

body.d{grid-template-columns:minmax(0,1fr) clamp(480px,34vw,620px)!important;grid-template-areas:"hd rt" "st rt"!important;grid-template-rows:48px minmax(0,1fr);height:100dvh;max-width:1920px;overflow:hidden;padding:16px 18px 34px!important;gap:12px 16px}
body.d>.rpg,body.m>.rpg{display:none!important}body.d>header{grid-area:hd;align-self:center;margin:0;padding:0 8px}body.d>header h1 .wm{width:194px!important}body.d .stage{grid-area:st;min-width:0;align-self:start;position:relative;margin:0;padding-bottom:40px}body.d #fig{width:100%;margin:0}
body.d #modal{grid-area:rt;position:relative;inset:auto;width:100%;height:100%;min-height:0;top:0;align-self:stretch}body.d #modal>.mbox{padding:0!important;display:flex;flex-direction:column;overflow:hidden;height:100%;background:var(--ux-screen)!important}body.d #modal>.mbox::before{display:none}
body.m{padding-bottom:env(safe-area-inset-bottom)!important}body.m #mtabs{position:static!important;flex:none;height:auto!important;padding:5px 5px 4px!important;box-shadow:inset 0 -1px #fff!important;border:0!important;border-bottom:1px solid var(--ux-edge)!important}body.m #mtabs .tab{min-height:48px}
body.d #mtabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;flex:none;margin:0;padding:7px;border-bottom:1px solid var(--ux-edge)}
body.d #mtabs .tab{min-width:0;min-height:56px;display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;padding:5px 2px!important;font:13px system-ui,sans-serif;position:relative;border-radius:7px!important;background:transparent!important;border:1px solid transparent!important;box-shadow:none!important;text-shadow:none}
body.d #mtabs .tab.on{background:var(--ux-blue)!important;color:#fff!important;border-color:#2446a1!important;box-shadow:inset 0 1px 0 #ffffff66,0 2px 0 #203f87!important}
#mtabs .rd{position:absolute;right:7px;top:5px}#mtabs .lock{opacity:.6}
#mttl{flex:none;display:flex;align-items:center;gap:8px;min-height:52px;padding:6px 12px;background:var(--ux-blue);color:#fff;border-bottom:1px solid #244691}
#mttl h2{margin:0;flex:1;font:18px/1.3 "Cubic 11",system-ui,sans-serif;letter-spacing:.02em}#mttl button{min-width:44px;min-height:40px;padding:4px;border-radius:7px;border:1px solid #a9bce2;background:#edf3ff;color:var(--ux-ink);font:16px system-ui,sans-serif;box-shadow:inset 0 1px 0 #fff}
body.d #mbody,body.m #mbody{flex:1;min-height:0;overflow:auto;padding:12px;scroll-padding:12px;overscroll-behavior:contain;background:var(--ux-screen)}
body.d #uisettings,body.m #uisettings{flex:1;min-height:0;overflow:auto;padding:12px}#uisettings #mmenu,#uisettings #btns{position:static;max-width:none}#uisettings .actions{display:flex;gap:10px;flex-wrap:wrap}#uisettings .act{min-height:44px}
body.m #modal{min-height:0}body.m #mttl{min-height:44px;padding:4px 8px 4px 12px}body.m #mttl h2{font-size:16px}body.m #mttl button{width:44px;height:40px}body.m .stage{padding-bottom:38px}body.m #nexthint,body.d #nexthint{position:absolute;left:8px;bottom:4px;top:auto;transform:none;max-width:calc(100% - 16px);width:auto;min-height:30px;padding:4px 12px;border:1px solid var(--ux-edge);border-radius:6px;background:#eff5ff;font:12px/1.4 system-ui,sans-serif;color:var(--ux-ink);box-shadow:inset 0 1px 0 #fff}
body.d .stats{position:absolute;left:8px;right:8px;top:4px;margin:0;max-width:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-height:50px;padding:6px 12px!important;background:#f4f8ffe8}body.d .stats::before{display:none}body.d .stat .v{font-size:20px!important}body.d .stat .k{font-size:11px}
.ui-section,.ui-menu-group{margin:12px 0;padding:12px;border:1px solid #bac9e4;border-radius:9px;background:#fff}.ui-section h3,.ui-menu-group h3,.ui-inventory h3{font:15px/1.4 "Cubic 11",system-ui,sans-serif;margin:0 0 10px;color:var(--ux-ink)}
#mbody{font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}#mbody p{overflow-wrap:anywhere}#mbody .mc,#mbody .rc{box-shadow:none!important;border:1px solid #bdcae3!important;background:#f3f7ff!important;outline:none;padding:12px;border-radius:9px!important}#mbody .rh{background:none!important;box-shadow:none!important;color:var(--ux-muted);font:12px/1.4 system-ui,sans-serif;letter-spacing:0}
#mbody .mb,#mbody .pzbar button{min-height:44px;box-shadow:inset 0 1px 0 #fff,0 2px 0 #8396c0!important;border-radius:7px!important;font:13px/1.4 system-ui,sans-serif;letter-spacing:0}#mbody .mb.pri{box-shadow:inset 0 1px 0 #ffd9ce,0 2px 0 #a43b2d!important}
.ui-character-head{padding:16px;background:transparent}.ui-eyebrow{font-size:12px;color:var(--ux-muted)}.ui-character-head h3{display:flex;align-items:baseline;gap:12px;font:24px "Cubic 11",system-ui,sans-serif;margin:5px 0}.ui-character-head small{font:13px system-ui,sans-serif;color:var(--ux-muted)}.ui-character-head p{font-size:13px;margin:7px 0 12px}.ui-equipment{display:grid;grid-template-columns:1fr;gap:8px;margin:12px 0}.ui-equipment .nm{gap:12px}.ui-equipment .rc ul{font-size:13px;line-height:1.6}.ui-stat-list{margin:0}.ui-stat-list>div{display:flex;gap:12px;justify-content:space-between;border-bottom:1px solid #e2e9f5;padding:7px 0}.ui-stat-list dd{margin:0;font-variant-numeric:tabular-nums;font-weight:650}
.ui-segments{display:flex;gap:4px;padding:4px;margin:10px 0;background:#e4ecfa;border:1px solid #b7c7e6;border-radius:8px}.ui-segments>button{flex:1;min-width:0;min-height:40px;border:1px solid transparent;border-radius:5px;background:transparent;color:var(--ux-muted);font:13px system-ui,sans-serif;padding:5px}.ui-segments>button[aria-pressed="true"]{color:var(--ux-ink);background:#fff;border-color:var(--ux-edge);box-shadow:0 1px 2px #31467c20}
.ui-inventory{margin:16px 0}.ui-inventory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#mbody .gt{min-width:0;min-height:80px;border-radius:7px!important;padding:9px!important;position:relative;border-color:#aabbdc!important;box-shadow:none!important;font:13px/1.4 system-ui,sans-serif}#mbody .gt small{font:12px/1.5 system-ui,sans-serif}#mbody .gt .shp{grid-column:2/4;justify-self:start;margin-top:5px}.ui-inventory .skrow{grid-template-columns:1fr 1fr}.ui-inventory .gems{grid-template-columns:1fr}#mbody .gt[disabled]{opacity:1;filter:grayscale(.45);color:#64728e;background:#eaf0fa!important}#mbody .gt.on{outline:2px solid var(--ux-blue)}
#mbody .dpsbar{position:static!important;margin:8px 0;padding:10px;border:1px solid var(--ux-edge);border-radius:8px;background:#eaf1fd}.dpsbar>div:first-child{font:13px system-ui,sans-serif}.dpsbar>div:first-child b{font-size:22px;font-variant-numeric:tabular-nums}.shares{margin-top:6px}.shares span{font:11px system-ui,sans-serif!important}.uxinspect{scroll-margin-top:12px}#mbody .ui-map-grid{display:grid;grid-template-columns:1fr!important;gap:6px}#mbody .ui-mapcard{position:relative;display:block;width:100%;min-height:56px;padding:0!important;text-align:left;overflow:hidden;border:2px solid #fff!important;outline:1px solid #7d8bbd;border-radius:0!important;background:var(--b2)!important;color:#12202a!important;box-shadow:0 2px 0 #8c9bd0!important}#mbody .ui-mapcard i{position:absolute;inset:0;background:linear-gradient(180deg,var(--b1) 0 40%,var(--b2) 40% 70%,var(--b3) 70%);image-rendering:pixelated;opacity:.95}#mbody .ui-mapcard i::after{content:"";position:absolute;right:10px;bottom:8px;width:14px;height:14px;background:var(--t1);box-shadow:-18px 4px 0 -2px var(--t2),-34px 0 0 -3px var(--t1)}#mbody .ui-mapcard b,#mbody .ui-mapcard span{position:absolute;z-index:1;font-family:var(--ux-body)!important;text-shadow:1px 1px 0 #ffffffb0}#mbody .ui-mapcard b{left:8px;top:6px;font-size:14px}#mbody .ui-mapcard .lv{right:8px;top:6px;font-size:12px}#mbody .ui-mapcard .ch{left:8px;bottom:5px;font-size:12px}#mbody .ui-mapcard{min-height:64px!important;padding-left:88px!important;background:linear-gradient(90deg,var(--b3) 0 84px,var(--b1) 84px)!important}#mbody .ui-mapcard .ui-scene{width:auto;height:84px;max-width:100%;display:block;margin:0 auto 2px;image-rendering:pixelated}.ui-scene.tall{width:auto;height:120px;margin:0}.ui-towerbox{display:flex;align-items:center;gap:14px}.ui-towernum b{font-size:34px;line-height:1.1}.view-options.ui-scenes{grid-template-columns:repeat(auto-fit,minmax(88px,1fr))}.ui-scenebtn{display:flex!important;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;min-height:104px!important}.ui-scenes{margin-bottom:8px}.ui-scenebtn[aria-pressed=true]{outline:3px solid #ffd24d;outline-offset:-3px}.ui-scenebtn i{position:absolute;right:4px;top:2px;font-style:normal;color:#19865a;font-weight:700}.ui-mapthumb{position:absolute;left:4px;top:4px;width:78px;height:56px}#mbody .ui-mapcard b{left:92px!important}#mbody .ui-mapcard .ch{left:92px!important}.ui-shoprow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-top:1px dashed #9aa6d0}.ui-shoprow>div:first-child{min-width:0}.ui-shoprow b{display:block;font-size:14px}.ui-shoprow small{display:block;font-size:12px;opacity:.8}.ui-shopbtns{display:flex;flex-direction:column;gap:4px;flex:none}.ui-shopbtns .mb{font-size:12px;padding:4px 8px}.whact{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.whcard ul{margin:4px 0;padding-left:16px}.whcard .ui-stat-list{margin:4px 0}.uxinspect .uxeffect{font-weight:600}.uxinspect-head{flex-wrap:wrap}.uxinspect-head>b{flex:1}.uxinspect-head .shp{display:none}.uxinspect-head .uxboard-link{margin:0;min-height:40px}.uxinspect-head .uxquiet{margin:0}.uxgrid-help{margin:10px 0;font-size:12px}#mbody .pz{max-width:336px;margin:12px auto;gap:4px;padding:7px;background:#c4d0e8;border:1px solid #8e9fc6;border-radius:9px}#mbody .pzbar{position:static!important;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;background:none;border:0}#mbody .rz{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:8px 0}.ui-resolved article{padding:10px 0;border-bottom:1px solid #e1e8f4}.ui-resolved article>div{display:flex;align-items:center;gap:8px}.ui-resolved article>div>span:last-child{margin-left:auto;font-size:12px;color:var(--ux-muted)}.ui-resolved article p{font-size:13px;margin:5px 0;color:var(--ux-muted)}.ui-resolved details{margin-top:10px}.ui-resolved summary{min-height:36px;padding:8px 0}
.ui-directory{display:grid;gap:8px}.ui-directory button,.ui-wiki{display:flex;align-items:center;gap:10px;min-height:64px;padding:10px 12px;text-align:left;border:1px solid #b9c8e3;border-radius:7px;background:#f3f7ff;color:var(--ux-ink);font:14px system-ui,sans-serif}.ui-directory button{display:grid;grid-template-columns:auto 1fr auto;column-gap:12px;align-items:center}.ui-directory button .ui-obj3d{grid-row:1/3;grid-column:1}.ui-directory button b,.ui-directory button span{grid-column:2}.ui-directory button i{grid-column:3;grid-row:1/3}.ui-directory button b{font-weight:600}.ui-directory button span{font-size:12px;color:var(--ux-muted)}.ui-directory i{grid-column:2;grid-row:1/3;font-style:normal}.ui-wiki{width:100%;background:#e6eefa}.ui-wiki span{display:grid;gap:4px}.ui-wiki small{color:var(--ux-muted)}.ui-wiki i{margin-left:auto;font-style:normal}
.ui-craft-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.ui-craft-slots button{min-height:82px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:9px;border:1px solid #b1c1de;border-radius:8px;background:#eaf0fb;color:var(--ux-ink);font:13px system-ui,sans-serif}.ui-craft-slots button[aria-pressed="true"]{border:2px solid var(--ux-blue);background:#fff}.ui-craft-slots small{font-size:11px}.ui-craft-wallet{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:baseline;padding:6px 0}.ui-craft-wallet strong{font:22px "Cubic 11",system-ui,sans-serif}.ui-craft-detail>ul{list-style:none;padding:0;margin:12px 0}.ui-craft-detail li{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #e0e8f6;padding:6px 0;font-size:13px}.ui-craft-operation{padding:12px;background:#eaf1fb;border-radius:8px;margin:10px 0}.ui-craft-operation h3{font-size:16px;margin:0 0 6px}.ui-craft-operation p{font-size:13px;margin:5px 0}.ui-craft-operation .mb{width:100%;margin-top:10px}.ui-craft-result{margin:12px 0}.ui-rules{margin-top:12px;border-top:1px solid #c7d3e8;padding-top:10px}.ui-rules summary{padding:8px 0}
.ui-map-list{display:grid;gap:12px}.ui-map-card{overflow:hidden;border:1px solid #a9bbdc;border-radius:9px;background:#fff}.ui-map-banner{position:relative;padding:16px;min-height:92px;background:var(--land);color:#15263d;overflow:hidden}.ui-map-banner h3{position:relative;margin:6px 0 0;font:21px "Cubic 11",system-ui,sans-serif;z-index:1}.ui-map-banner span{font:12px system-ui,sans-serif}.ui-map-info{padding:12px}.ui-map-info .rchips{gap:6px;margin:0 0 8px}.ui-map-info details{font-size:13px;margin:10px 0}.ui-map-info summary{min-height:36px;padding:7px 0}.ui-map-info ul{padding-left:18px;line-height:1.7}.ui-map-info .mb.pri{width:100%}.ui-map-state{display:flex;justify-content:space-between;gap:8px;font-size:13px}.ui-progress{height:7px;background:#dce5f4;border-radius:4px;overflow:hidden;margin:8px 0}.ui-progress i{display:block;height:100%;background:var(--ux-blue)}
#mbody .ui-segments>button{background:transparent!important;border:1px solid transparent!important;border-radius:5px!important;box-shadow:none!important;color:var(--ux-muted)!important;text-shadow:none!important;font:13px/1.4 system-ui,sans-serif!important;padding:6px!important}
#mbody .ui-segments>button[aria-pressed="true"]{background:var(--ux-blue)!important;color:#fff!important;border-color:#244691!important;box-shadow:inset 0 1px 0 #ffffff50!important}
#mbody .ui-craft-slots>button{background:#edf3fc!important;border:1px solid var(--ux-edge)!important;border-radius:8px!important;box-shadow:none!important;text-shadow:none!important}
#mbody .ui-craft-slots>button[aria-pressed="true"]{border:2px solid var(--ux-blue)!important;background:#dce8ff!important}
.ui-equipment .rh,.ui-equipment .rh span{color:var(--ux-muted)!important;text-shadow:none!important}
#mbody .mb:disabled{opacity:1!important;background:#dfe7f4!important;color:#53617b!important;border-color:#acb9d0!important;box-shadow:none!important;text-shadow:none!important}
#mbody .ui-directory button,#mbody .ui-wiki{background:#f3f7ff!important;border:1px solid #b9c8e3!important;border-radius:7px!important;box-shadow:none!important;text-shadow:none!important}
.ui-build{padding:8px 10px;border:1px solid #bccbe6;border-radius:8px;background:#edf3ff}.ui-build>div{display:flex;align-items:center;gap:7px}.ui-build b{margin-right:4px;font:13px system-ui,sans-serif}.ui-build .mb{min-width:44px}.ui-build p{margin:5px 0 0}#mbody .ui-build .mb[aria-pressed="true"]{background:var(--ux-blue)!important;color:#fff!important;box-shadow:inset 0 1px 0 #ffffff66,0 2px 0 #244691!important;text-shadow:none!important}
.ui-settings-intro h3{font:18px "Cubic 11",system-ui,sans-serif;margin:4px 0 8px}.ui-settings-intro p{font:13px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:0 0 16px}body #uisettings #mmenu{padding:0}body #uisettings #btns{display:grid!important;grid-template-columns:1fr!important;align-items:stretch;gap:10px!important;margin:0;width:100%}#uisettings .stepwrap{display:block;width:100%}#uisettings .act{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;min-height:48px;padding:10px 14px!important;background:#edf3ff!important;border:1px solid #a7badc!important;border-radius:8px!important;box-shadow:inset 0 1px 0 #fff!important;font:14px system-ui,sans-serif;text-shadow:none!important}#uisettings .chips{position:static;width:100%;margin:7px 0 12px;padding:8px;max-width:none;box-sizing:border-box;background:#e0eaf9;border:1px solid #b6c6e1;border-radius:8px;gap:6px;flex-wrap:wrap}#uisettings .chip{min-height:40px;padding:6px 10px!important;border-radius:6px!important;font:13px system-ui,sans-serif!important;box-shadow:none!important}#uisettings .chip.current{background:var(--ux-blue)!important;color:#fff!important;text-shadow:none!important}
.ui-map-banner h3,.ui-map-banner>span{background:#ffffffdd;padding:3px 7px;border-radius:4px;width:fit-content}.ui-map-banner>span{display:inline-block}
@media(max-width:1179px){body.m #mbody{padding:10px}#mbody .pz{max-width:300px}.ui-segments>button{min-height:44px}body.m .ui-inventory-grid{gap:7px}}
@media(min-width:560px) and (max-width:1179px){body.m #mbody{padding:14px 24px}.ui-inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.ui-equipment{grid-template-columns:repeat(3,minmax(0,1fr))}.ui-character-head,.ui-menu-group,.ui-wiki{max-width:900px;margin-left:auto;margin-right:auto}}
body.d.battle-fold #fig,body.d.battle-fold #fxo{display:none!important}body.d.battle-fold .stage{position:relative;min-height:72vh}body.d.battle-fold .stage::after{content:"戰鬥畫面已隱藏，戰鬥與收益照常進行（設定 → 畫面與觀戰 可重新顯示）";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(80%,420px);padding:14px 16px;text-align:center;line-height:1.6;color:#1d2552;background:#e6e8f6;border:2px solid #fff;outline:2px solid #33407f;box-shadow:4px 4px 0 #1d2552aa}
body.m.battle-fold .stage{height:88px;min-height:88px;padding:0!important;box-sizing:border-box}body.m.battle-fold #fig,body.m.battle-fold #nexthint,body.m.battle-fold #ctxbtn,body.m.battle-fold #fxo{display:none!important}body.m.battle-fold .stats{position:static!important;margin:4px 6px!important}
@media(max-height:500px){body.m .stats{top:0}body.m #mttl{min-height:40px}body.m .stage{padding-bottom:30px}body.m #fig{max-height:110px}body.m #mbody{padding:8px}body.m #mtabs{height:48px}body.m{padding-bottom:calc(48px + env(safe-area-inset-bottom))!important}}
body.ui-material #mbody .ui-menu-group .ui-directory{grid-template-columns:repeat(2,minmax(0,1fr))}
body.ui-material #mbody .ui-map-grid .ui-item-state{font-size:var(--ux-small)!important}
/* Compact inventory cells share the console material and native button semantics. */
body.ui-material #mbody .ui-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:6px;margin:8px 0}
body.ui-material #mbody .ui-equipment{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}
body.ui-material #mbody .ui-item-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;gap:4px;min-width:0;min-height:94px;padding:24px 3px 5px!important;white-space:normal;text-align:center;border-bottom:3px solid var(--item-rarity,var(--ux-edge))!important;scroll-margin:8px;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;overflow-wrap:anywhere}
body.ui-material #mbody .ui-item-tile b{font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:calc(var(--ux-small-line) * 2);max-width:100%}
body.ui-material #mbody .ui-item-tile small,body.ui-material #mbody .ui-item-state{font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important}
.ui-item-state{position:absolute;top:2px;left:3px;right:3px;text-align:left;color:var(--ux-muted);pointer-events:none}
.ui-item-empty{background:var(--ux-screen);border:1px dashed var(--ux-edge);color:var(--ux-muted)}
.ui-grid-empty{grid-column:1/-1;padding:12px 0}.ui-grid-pagination{justify-content:space-between;align-items:center;flex-wrap:nowrap!important}.ui-grid-pagination span{font-size:12px;white-space:nowrap}
.ui-warehouse-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.ui-warehouse-summary b{font-size:16px}.ui-warehouse-tools .ui-segments{margin:6px 0}.ui-warehouse-tools .uxmeta{margin:6px 0}
body.ui-material #mbody .ui-inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
body.ui-material #mbody .ui-cart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:100px;padding:24px 4px 5px!important;white-space:normal;text-align:center;scroll-margin:8px;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt :is(b,small){font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;max-width:100%;overflow-wrap:anywhere}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
body.ui-material #mbody .ui-inventory-grid .gt .shp{margin:2px 0 0;padding:0!important;align-self:center}
body.ui-material #mbody .ui-cart-grid .gt[data-availability="available"]{border:2px solid var(--ux-blue,#2f5fd0)!important;box-shadow:inset 0 0 0 1px #fff!important}body.ui-material #mbody .ui-cart-grid .gt[data-availability="unavailable"]{opacity:.65;filter:grayscale(.6)}body.ui-material #mbody .cart-sum{margin:4px 0 8px;color:var(--ux-muted)}
body.ui-material #mbody .gt[data-availability="unavailable"]{background:var(--ux-screen)!important;border-style:dashed!important;color:var(--ux-muted)!important}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt:hover{background:var(--ux-key-hover)!important}
body.ui-material #mbody :is(.ui-inventory-grid,.ui-cart-grid) .gt:active{box-shadow:var(--ux-inset)!important}
body.ui-material #mbody .gt.on{outline:2px solid var(--ux-focus);outline-offset:1px}
body.ui-material #uisettings{scroll-padding:8px;padding:10px!important}
body.ui-material #uisettings #btns{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
#uisettings #btns>.cap{display:none}#uisettings #btns .stepwrap{min-width:0}#uisettings #btns .stepwrap{position:relative}#uisettings #btns .stepwrap.open{z-index:40}
body.ui-material #uisettings #btns .act{gap:4px;min-height:72px;padding:8px!important;white-space:normal;line-height:24px!important}
.ui-setting-copy{display:flex;flex-direction:column;min-width:0;gap:4px}.ui-setting-copy b{font-size:var(--ux-text)!important}.ui-setting-copy small{font-family:var(--ux-body)!important;font-size:var(--ux-small)!important;line-height:var(--ux-small-line)!important;color:var(--ux-muted)}
body.ui-material #uisettings #btns .chips{display:none;position:absolute;left:0;right:0;top:calc(100% - 2px);z-index:41;margin:0;padding:6px;grid-template-columns:minmax(0,1fr);gap:6px;box-shadow:0 4px 0 #17275155,0 0 0 2px var(--ux-frame,#172751)!important;border:1px solid var(--ux-edge)!important;background:var(--ux-screen)!important}
body.ui-material #uisettings #btns .stepwrap.open .chips{display:grid}body.ui-material #uisettings #btns .chip{white-space:normal;min-width:0;min-height:44px;font-size:var(--ux-text)!important;padding:6px!important}
body.ui-material #uisettings .view-settings{margin-top:12px;padding-top:12px!important}
.ui-setting-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;align-items:start}.ui-setting-grid>.view-options{display:contents}
body.ui-material #uisettings .ui-setting-grid> :is(button,.ui-setting-block){min-width:0;margin:0;padding:8px!important;box-sizing:border-box}
body.ui-material #uisettings .ui-setting-grid>button{width:100%;min-height:60px;font-size:var(--ux-text)!important;white-space:normal}
.ui-setting-block h4{margin:0 0 6px;font-size:16px}.ui-setting-block .view-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.ui-setting-block .view-options button{min-width:0;min-height:44px;padding:4px!important;font-size:var(--ux-small)!important}
.ui-setting-grid>.view-fx-control{grid-column:1/-1;border:1px solid var(--ux-edge);background:var(--ux-screen)}.view-fx-control>div:first-child{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ui-setting-grid>.ui-setting-block:not(.view-fx-control){grid-column:1/-1}.ui-setting-grid>.ui-setting-block .view-options{grid-template-columns:repeat(4,minmax(0,1fr))}.ui-setting-grid>#watch-now{grid-column:1/-1;min-height:44px!important}
#uisettings .ui-rules>summary{min-height:44px;padding:10px 0;box-sizing:border-box}.ui-settings-intro h3{margin:0 0 8px!important}
`;
function uiAdventureHtml(){
  if(UI_WORK.adventure==='rift')UI_WORK.adventure='season';
  if(G.run?.city?.awaitChoice)UI_WORK.adventure='city';
  const R=G.run,mode=UI_WORK.adventure;
  const nav=uiSegments('adventure',[['maps','地圖','消耗地圖卡進入挑戰，打贏有額外獎勵'],['city','城市遠征','三段路線加BOSS，取得傳奇核心碎片'],['season','賽季','本期裂隙、巡迴與專屬核心'],['tower','無限之塔','一路往上爬，死亡就結束，記錄最高層'],['training','訓練場','對假人測試 DPS，不影響進度']],'冒險分類');
  const current=R?.city?uiCityRunHtml():R?`<section class="ui-section"><div class="ui-map-state"><b>${R.tower?'無限之塔 第 '+R.floor+' 層':BIOMES[R.map.biome].n}</b><span>進行中</span></div><div class="ui-progress" role="progressbar" aria-label="地圖討伐進度" aria-valuemin="0" aria-valuemax="${R.need}" aria-valuenow="${Math.min(R.kills,R.need)}"><i style="width:${Math.min(100,R.kills/R.need*100)}%"></i></div><p id="ui-run-count" class="uxmeta">討伐 ${Math.min(R.kills,R.need)}／${R.need}</p>${runMods(R)}<button class="mb" onclick="uiLeaveMap()">離開目前挑戰</button></section>`:`<section class="ui-section"><div class="ui-map-state"><b>一般冒險</b><span>深度 ${G.depth}</span></div><p id="ui-normal-count" class="uxmeta">討伐 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'':'，原地刷怪'}</p></section>`;
  if(mode==='rift'){UI_WORK.adventure='season';return nav+seasonHubHtml();}
  if(mode==='season')return nav+seasonHubHtml();
  if(mode==='tower')return nav+towerConsoleHtml();
  if(mode==='city')return (R?current:'')+nav+(R?.city?'<details class="ui-section"><summary>查看城市目標與下次出發設定</summary>'+uiCityHtml()+'</details>':uiCityHtml());
  if(mode==='training'){
    const L=G.trainLast,mx=L?.rows.length?L.rows[0][1]:1;
    const pre=G.trainingPreset||'crowd';
    return current+nav+`<section class="ui-section train-page"><h3>訓練場</h3><p class="shop-intro">對假人打 30 秒，測出目前配置的每秒傷害。測試不掉落獎勵，也不消耗資源。</p><div class="train-targets city-routes" role="group" aria-label="訓練目標">${[['single','單體假人','dummy1','一隻假人，測單體輸出'],['crowd','群體假人','dummy5','五隻假人，測範圍與連鎖']].map(([id,name,k,d])=>`<button class="mb ui-scenebtn" aria-pressed="${pre===id}" ${G.train?'disabled':''} onclick="uiTrainingPreset('${id}')">${(u=>u?`<img class="ui-scene" alt="" aria-hidden="true" src="${u}" style="image-rendering:pixelated">`:'')(icon3dSceneUrl(k))}<span>${name}</span><i>${d}</i></button>`).join('')}</div>${G.train?`<div class="train-run"><span id="ui-train-time">測量中，剩 ${Math.ceil(G.train.t)} 秒</span><button class="mb" onclick="trainEnd(true)">取消測量</button></div>`:`<button class="mb pri train-start" ${R?'disabled':''} onclick="trainStart()">開始測量<small>${R?'先離開目前挑戰':'約 30 秒'}</small></button>`}${L?`<article class="city-card train-result"><div class="city-head"><b>上次結果</b><small>${L.n||5} 隻合計</small></div><div class="train-dps"><strong>${tFmt(L.dps)}</strong><span>每秒傷害</span></div>${L.rows.map(([k,v])=>`<div class="gl"><b>${uxEsc(k)}</b><i style="--p:${Math.round(v/mx*100)}%"></i><em>${L.total?Math.round(v/L.total*100):0}%　${tFmt(v/(L.duration||30))}／秒</em></div>`).join('')}<details><summary>出手與連動結果</summary>${Object.entries(L.stats||{}).map(([id,row])=>`<p>${SKILLS[id].n}：${row.casts} 次出手／${row.repeats} 次回放，最長等候 ${row.maxWait.toFixed(1)} 秒</p>`).join('')}${uiComboSummary(L.combos)}</details></article>`:'<p class="uxmeta">完成測量後，這裡會顯示各技能的傷害占比、出手次數與連動結果。</p>'}<details class="city-more"><summary>測量說明</summary><p class="uxmeta">開始時清空測試電荷，結束或取消後還原原有電荷。單體預估不等同多目標實測。</p></details></section>`;
  }
  return nav+(R?current:'')+`<div class="ui-map-state"><h3>可用地圖</h3><span class="uxmeta">${G.maps.length}／15 張</span></div><div class="ui-mgroups" role="group" aria-label="地圖庫存">${G.maps.length?uiMapGroups():'<p class="ui-grid-empty">還沒有地圖。繼續一般冒險，打贏BOSS便有機會取得。</p>'}</div>`;
}
let UI_MAP_PENDING=null;
function uiInspectMap(encoded){let id;try{id=decodeURIComponent(encoded);}catch(_){return;}const m=G.maps.find(x=>x.id===id);if(!m)return;noticeRead('maps',id);UI_MAP_PENDING={id,stamp:JSON.stringify(m)};const biome=BIOMES[m.biome],land=terrainBuild('map:'+m.id+':0'),q=m.mods.reduce((sum,k)=>sum+(MODS[k]?.q||0),0);showOverlay(`<h2 class="uxdialog-title">${biome.n} · Lv. ${m.lvl}</h2><div class="ui-map-banner" style="--land:${biome.board.l};--land2:${biome.board.m}"><span>挑戰詞綴 ${mapChallenge(m.mods)} · 戰利品 +${Math.round(q*100)}%</span></div><p>${land.name} · ${land.bounds[1]-land.bounds[0]} × ${land.bounds[3]-land.bounds[2]} · 起伏最高 ${land.amplitude} 單位</p><ul>${m.mods.length?m.mods.map(k=>`<li>${mapKind(k)} · ${MODS[k].n}</li>`).join(''):'<li>沒有額外詞綴</li>'}</ul>${m.mods.includes('rich')?'<p>金幣 +60%</p>':''}${m.mods.includes('lucky')?'<p>稀有度提升</p>':''}<p>進入會消耗這張地圖，離開不退還。${G.run||G.train?'先結束目前挑戰或訓練。':''}</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回地圖</button><button class="mb pri" ${G.run||G.train?'disabled':''} onclick="uiUseMapPreview()">進入 · 消耗這張地圖</button></div>`);}
function uiUseMapPreview(){const p=UI_MAP_PENDING;hideOverlay();if(!p||G.run||G.train||JSON.stringify(G.maps.find(x=>x.id===p.id))!==p.stamp){uxAnnounce('地圖或挑戰狀態已變動，沒有消耗地圖。');return;}enterMap(p.id);}
function uiLeaveMap(){
  if(!G.run)return;
  if(G.run.city){showOverlay('<h2 class="uxdialog-title">撤離城市遠征？</h2><p>保留已完成路段的碎片，放棄本次收尾獎勵；中樞已消耗的憑證不退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續遠征</button><button class="mb pri" onclick="hideOverlay();abandonMap()">撤離並帶回碎片</button></div>');return;}
  showOverlay(`<h2 class="uxdialog-title">離開目前挑戰？</h2><p>目前的進度會結束，已消耗的地圖不會退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續挑戰</button><button class="mb pri" onclick="hideOverlay();abandonMap()">離開挑戰</button></div>`);
}

let UI_LIVE_SIGNATURE='';
function uiLiveSignature(){
  if(modalTab==='warehouse')return JSON.stringify([G.inventoryRevision,G.autoEquip,G.storageRecycled,G.armory,G.equip,G.builds]);
  if(modalTab==='tree')return JSON.stringify([G.lvl,G.maxDepth,G.pass,G.st,!!G.run,!!G.train,G.legacyMode]);
  if(modalTab==='skills')return JSON.stringify([G.lvl,G.board,G.circuits,G.gems,G.carts,G.seen,G.st.dps,G.chips]);
  if(modalTab==='char')return JSON.stringify([G.lvl,G.equip,G.armory,G.equipBackup,G.char,G.heroName,G.ascension,G.ascensionNodes,G.bossKills,G.maxDepth,G.st,G.cos,G.cards,G.picks,G.relicPicks]);
  if(modalTab==='dress'){const e=cosGet(dSel.cat,dSel.id);return JSON.stringify([G.lvl,G.equip,G.char,G.cos,G.own,e?G.gold>=e[3]:true]);}
  if(modalTab==='craft')return JSON.stringify([G.parts,G.equip,G.coreDust,G.city?.fragments,G.city?.maxTier,G.maxDepth,!!G.run,!!G.train]);
  if(modalTab==='maps')return JSON.stringify([G.maps,G.run?.map.id,G.run?.floor,!!G.run?.stair,G.run?.city,G.city,G.towerBest,G.season,G.activityLoot,['rift','season'].includes(UI_WORK.adventure)?[G.rift?.shards,G.rift?.clears,G.rift?.encounter?.id,G.rift?.encounter?.phase,G.rift?.encounter?.track]:null,!!G.run?.stair,!!G.train,G.trainLast,G.maxDepth]);
  return modalTab;
}
function uiRefreshLive(){
  if(typeof guidanceViewSettings==='function'){guidanceViewSettings();ailmentView();secretView();}
  if(typeof careerTalentRefresh==='function')careerTalentRefresh();
  if(modalTab==='settings')uiSyncSettings();
  const gold=$('cv-gold');if(gold)gold.textContent=tFmt(G.gold);
  if(G.offline||document.body.classList.contains('watch-mode'))return;
  if(!$('modal')||$('modal').hidden)return;
  const signature=uiLiveSignature();
  if(signature!==UI_LIVE_SIGNATURE&&!drag&&!UX_LAYERS.length&&!document.querySelector('#mbody input:focus,#mbody textarea:focus'))renderModal();
  const gearCount=$('ui-gear-count');if(gearCount&&gearCount.textContent!==String(G.inventory.length))gearCount.textContent=G.inventory.length;
  const progress=$('ui-char-progress'),text=`深度 ${G.depth} · 累計討伐 ${tFmt(G.totalKills)}`;
  if(progress&&progress.textContent!==text)progress.textContent=text;
  const R=G.run,count=$('ui-run-count'),bar=document.querySelector('[aria-label="地圖討伐進度"]');
  if(R&&count){count.textContent=`討伐 ${Math.min(R.kills,R.need)}／${R.need}`;if(bar){bar.setAttribute('aria-valuenow',Math.min(R.kills,R.need));bar.querySelector('i').style.width=Math.min(100,R.kills/R.need*100)+'%';}}
  const normal=$('ui-normal-count');if(normal&&!R)normal.textContent=`討伐 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'':'，原地刷怪'}`;
  const choice=$('ui-city-choice-time');if(choice&&G.run?.city?.awaitChoice)choice.textContent=`${Math.max(0,15-Math.floor((Date.now()-(G.run.city.choiceAt||Date.now()))/1000))} 秒後依出發策略自動選路，也可立即選擇。`;
  uiCombatRefresh();
  const timer=$('ui-train-time');if(timer&&G.train)timer.textContent=`測量中，剩 ${Math.ceil(G.train.t)} 秒`;
}

let UI_RESPEC=null;
function uiRespec(){
  if(G.run?.city||G.train){uxAnnounce('先結束城市遠征或訓練，再重置天賦。');return;}
  const cost=100*G.lvl;if(!G.pass.length||G.gold<cost)return;
  UI_RESPEC={lvl:G.lvl,pass:JSON.stringify(G.pass),cost};
  showOverlay(`<h2 class="uxdialog-title">重置目前構築的天賦？</h2><p>消耗 ${cost} 金幣，清除目前配置，點數可重新分配。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="UI_RESPEC=null;hideOverlay()">保留天賦</button><button class="mb pri" onclick="uiConfirmRespec()">重置天賦</button></div>`);
}
function uiConfirmRespec(){
  const pending=UI_RESPEC;UI_RESPEC=null;hideOverlay();if(!pending)return;
  if(G.run?.city||G.train||G.lvl!==pending.lvl||JSON.stringify(G.pass)!==pending.pass||G.gold<pending.cost){uxAnnounce('天賦或金幣已變動，請重新確認。');return;}
  respec();uxAnnounce(`已重置天賦，消耗 ${pending.cost} 金幣。`);
}

/* 倉庫與電路合成沿用同一外殼、確認及焦點系統。 */
const WAREHOUSE_UI={limit:48,slot:'all',kind:'all',page:0,sel:null,sort:'new'};const WAREHOUSE_PAGE_SIZE=36;
function uiWarehouseFilter(key,value){if(key==='slot'&&!['all',...Object.keys(SLOTN)].includes(value)||key==='kind'&&!['all','gear','core'].includes(value)||key==='sort'&&!['new','dps'].includes(value)||!['slot','kind','sort'].includes(key))return;WAREHOUSE_UI[key]=value;WAREHOUSE_UI.page=0;WAREHOUSE_UI.limit=48;renderModal();}
const WAREHOUSE_DPS_CACHE={stamp:'',values:new Map()};
function uiSortByDps(list,mode){if(mode!=='dps')return list;const stamp=JSON.stringify([G.inventoryRevision,G.char,G.lvl,G.maxDepth,G.equip,G.pass,G.board,G.suppW,G.cards,G.relics,G.ach,G.ascension,G.ascensionNodes,G.run?.city?.branches]);if(stamp!==WAREHOUSE_DPS_CACHE.stamp){WAREHOUSE_DPS_CACHE.stamp=stamp;WAREHOUSE_DPS_CACHE.values.clear();}const values=WAREHOUSE_DPS_CACHE.values;for(const it of list)if(!values.has(it))values.set(it,calc({...G.equip,[it.slot]:it}).dps);return list.slice().sort((a,b)=>values.get(b)-values.get(a));}

function warehouseHtml(){return uiWarehouseSheetHtml();}
function uiInspectGear(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;noticeRead('gear',uid);

 const on=G.equip[it.slot]===it,guard=it.kept||it.cr||it.lk!=null||on||Object.values(G.equipBackup).includes(it)||gearReferenced(it);
 showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · ${RAR[it.r].n} · 物品等級 ${it.il}</p>${uiGearCompareSheet(it)}<div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回倉庫</button><button class="mb pri" ${on?'disabled':''} onclick="uiWearStored(${uid})">${on?'穿著中':'換上這件裝備'}</button><button class="mb" onclick="uiKeepStored(${uid})">${it.kept?'解除保管鎖定':'鎖定保管'}</button><button class="mb" onclick="lootMark(${uid})">${it.junk?'取消待拆':'標記待拆'}</button><button class="mb" ${guard?'disabled':''} onclick="uiRecycleAsk(${uid})">回收裝備</button></div>${guard?'<p class="uxmeta">穿著、上一件、構築引用、鎖定、詞綴鎖定或已腐化的裝備受保護，不能直接回收。</p>':''}`);
}
function uiWearStored(uid){if(!equipStored(uid)){uxAnnounce('裝備狀態已變更，請重新查看。');return;}hideOverlay();renderModal();uxAnnounce('已手動換裝，上一件裝備保留。');}
function uiKeepStored(uid){const it=G.inventory.find(x=>x.uid===uid);if(!it)return;it.kept=!it.kept;G.inventoryRevision++;G.dirty=true;hideOverlay();renderModal();document.querySelector(`[data-focus="gear-${uid}"]`)?.focus();uxAnnounce(it.kept?'裝備已鎖定保管。':'已解除保管鎖定。');}
function uiRecycleAsk(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;
 hideOverlay();showOverlay(`<h2 class="uxdialog-title">回收 ${uxEsc(it.name)}？</h2><p>裝備會消失，轉為 ${itemValue(it)} 金幣及零件；不能還原。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備</button><button class="mb pri" onclick="uiRecycleConfirm(${uid})">確認回收</button></div>`);
}
function uiRecycleConfirm(uid){const ok=recycleStored(uid);hideOverlay();renderModal();document.querySelector('[data-focus="warehouse-auto"]')?.focus();uxAnnounce(ok?'已回收為金幣與零件。':'裝備受到保護或已不存在，沒有回收。');}
function circuitShopHtml(){const can=G.chips>=20;return `<details class="ui-section" open><summary>電路合成 · <span id="ui-chip-count">${G.chips}</span> 點</summary><p class="shop-intro">擊殺怪物會掉電路點數。20 點可合成一個指定配件，放進接線板的襯墊強化技能。所有角色都能用。</p><div class="shop-list">${['FOCUS','FORK','RECOVER','DELAY','ANCHOR','EXECUTE','BLOOD','CONDUCT','LONG','SPREAD','RIME','KINDLE'].map(id=>`<article class="shop-card"><div class="shop-ico">${gemIco(id,40)}</div><div class="shop-info"><b>${SUPPS[id].n}</b><span>${SUPPS[id].d}</span></div><div class="shop-btns"><button class="mb" ${can?'':'disabled'} onclick="uiBuySupport('${id}')">合成<small>20 點</small></button></div></article>`).join('')}</div><h3 class="shop-sub">連動模式卡匣</h3><p class="shop-intro">合成後到「模式卡匣」裝到衛星或雷射上，搭配時會先準備凍結或電荷。</p><div class="shop-list">${['METEOR_COLDSTART','BEAM_CAPACITOR'].map(id=>{const lock=G.lvl<SKILLS[MODES[id].sk].lvl;return `<article class="shop-card"><div class="shop-ico">${typeof sico==='function'?sico(MODES[id].sk,40):''}</div><div class="shop-info"><b>${MODES[id].n}</b><span>${MODES[id].d}</span></div><div class="shop-btns"><button class="mb" data-focus="recipe-${id}" ${!can||G.carts[id]||lock?'disabled':''} onclick="uiBuyCircuitMode('${id}')">${G.carts[id]?'已持有':lock?'Lv '+SKILLS[MODES[id].sk].lvl+' 解鎖':'合成<small>20 點</small>'}</button></div></article>`}).join('')}</div></details>`;}
function uiBuySupport(id){if(!buyCircuitSupport(id)){uxAnnounce('電路點數不足，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${SUPPS[id].n}，消耗 20 電路點數。`);}
function treeAvailableHtml(){
 const open=Object.values(TREE).filter(n=>canAllocateTalent(n.id)),branch={A:'耐久',B:'元素',C:'會心',D:'超頻',E:'回授',F:'電池',R:'接線'};
 return `<details class="ui-section"><summary>可連接節點清單（${open.length}）</summary><p>可用清單選擇，不必瞄準盤面的小圓點。每個節點消耗 1 天賦點，所有角色共用。</p><div class="ui-directory">${open.map(n=>`<button data-focus="talent-${n.id}" ${passPoints()<=0?'disabled':''} onclick="uiAllocateTalent('${n.id}')"><b>${branch[n.id[0]]}支線</b><span>${uxEsc(talentName(n.id))}</span></button>`).join('')||'<p>點數或韌體已達上限，或目前沒有可分配節點。可退回末端點後重新選路。</p>'}</div></details>`;
}
function uiAllocateTalent(id){const before=G.pass.length;allocPass(id);if(G.pass.length>before){document.querySelector(`[data-tree="${id}"]`)?.focus({preventScroll:true});uxAnnounce(`已點亮${talentName(id)}。`);uxAnimatePanel();}}

function warehouseMove(delta){WAREHOUSE_UI.page=Math.max(0,WAREHOUSE_UI.page+delta);renderModal();const id=delta>0?'warehouse-next':'warehouse-prev',next=document.querySelector(`[data-focus="${id}"]`);(next&&!next.disabled?next:document.querySelector(`[data-focus="${delta>0?'warehouse-prev':'warehouse-next'}"]`))?.focus();}

function uiPolicyHtml(){return `<div class="view-options" role="group" aria-label="出手策略">${[['balanced','均衡出手','讓就緒較久的技能先出手'],['combo','連動優先','先鋪墊凍結或電荷，最多額外等候 1.2 秒']].map(([id,name,tip])=>`<button class="mb" title="${tip}" aria-pressed="${G.castPolicy===id}" data-focus="cast-policy-${id}" onclick="uiSetCastPolicy('${id}')">${key==='adventure'&&id==='season'?'<img src="'+studioMachine('core')+'" alt="" width="24" height="24">':''}${name}</button>`).join('')}</div>`;}
function uiSetCastPolicy(id){if(!['balanced','combo'].includes(id))return;G.castPolicy=id;G.dirty=true;renderModal();uxAnnounce(id==='combo'?'已使用連動優先。':'已使用均衡出手。');}
function uiTrainingPreset(id){if(G.train||!['single','crowd'].includes(id))return;G.trainingPreset=id;renderModal();}
function uiComboSummary(c={}){return `<p>產生電荷 ${c.chargeGain||0} 格／消耗 ${c.chargeSpent||0} 格；冷啟動鎖定 ${c.coldBursts||0} 次；凍結 ${c.freezes||0} 次。</p>`;}
function uiCombatHtml(){return `<details id="ui-combat-report" class="ui-section"><summary>本段出手戰報</summary><p id="ui-combat-time" class="uxmeta">展開後更新。戰報從本次載入或重設起累積，不寫入存檔。</p><p id="ui-charge-live"></p><div class="ui-resolved">${G.slots.map(id=>`<article data-combat-id="${id}"><div><b>${SKILLS[id].n}</b><span data-combat-status>尚未出手</span></div><p data-combat-count>0 次出手</p></article>`).join('')}</div><p id="ui-combat-combos"></p><button class="mb" data-focus="reset-combat" onclick="uiResetCombatReport()">重設本段戰報</button></details>`;}
function uiResetCombatReport(){if(G.train){uxAnnounce('訓練進行中，請先完成或取消。');return;}resetCombatReport();uiCombatRefresh();uxAnnounce('已重設本段戰報，遊戲進度不變。');}
function uiCombatRefresh(){
  const el=$('ui-combat-report');if(!el?.open)return;
  const book=G.train||G.combat||{start:G.time},elapsed=Math.max(0,G.time-(book.start??G.time));
  $('ui-combat-time').textContent=`${G.train?'目前訓練':'本段戰鬥'}：${elapsed.toFixed(0)} 秒。傷害只記實際扣除生命，不含溢傷。`;
  $('ui-charge-live').textContent=G.st.sk.BEAM?.pattern.capacitor?`訊號電荷：${G.signalCharge}／${COMBAT_RULES.chargeMax}，由紅外線原始命中產生。`:'';
  for(const row of el.querySelectorAll('[data-combat-id]')){
    const id=row.dataset.combatId,stats=book.stats?.[id],k=G.st.sk[id];
    const damage=Object.entries(book.damage||{}).filter(([name])=>name===SKILLS[id].n||name.startsWith(SKILLS[id].n+'·')).reduce((sum,[,n])=>sum+n,0);
    row.querySelector('[data-combat-count]').textContent=`${stats?.casts||0} 次出手／${stats?.repeats||0} 次回放；有效傷害 ${tFmt(damage)}；最長等候 ${(stats?.maxWait||0).toFixed(1)} 秒`;
    row.querySelector('[data-combat-status]').textContent=G.h.castT>=0&&G.h.castSk===id?'正在出手':!G.mons.some(m=>!m.dead&&!(m.fall>0))?'等待敵人':G.cds[id]>0?`冷卻 ${G.cds[id].toFixed(1)} 秒`:G.castPolicy==='combo'&&k?.pattern.capacitor&&G.signalCharge<4?'等候電荷或後備出手':G.castPolicy==='combo'&&k?.pattern.coldStart&&!G.mons.some(m=>m.frozen>0&&!m.dead)?'等候凍結或後備出手':'已就緒，輪候出手';
  }
  const c=book.combos||{};$('ui-combat-combos').textContent=`產生／消耗電荷 ${c.chargeGain||0}／${c.chargeSpent||0} 格；冷啟動 ${c.coldBursts||0} 次。`;
}
function uiBuyCircuitMode(id){if(!buyCircuitMode(id)){uxAnnounce('尚未解鎖、點數不足或已持有，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${MODES[id].n}，消耗 20 電路點數。選取對應技能，再到模式卡匣裝上。`);}

/* 城市流程延伸既有冒險與確認視窗，不新增頂層導覽。 */
const CITY_UI={route:'memory',tier:1};let CITY_CONFIRM=null,TALENT_CONFIRM=null;
function uiTalentBudget(){return `<section class="ui-section"><h3 title="路徑上限 ${TALENT_LIMIT} 點，等級與深度解鎖；最多兩個韌體，效果與代價同時生效">路徑 ${G.pass.length}／${talentBudget()} · 韌體 ${firmwareCount(G.pass)}／${FIRMWARE_LIMIT}</h3>${G.run?.city||G.train?'<p>先結束城市遠征或訓練，再更動天賦。</p>':''}${passiveLegacy()?'<p>目前保留舊制配置，未刪除任何節點。先預覽並免費轉換，才可進入城市遠征。</p><button class="mb pri" onclick="uiTalentPreview()">預覽免費轉換</button>':''}${G.legacyTalent&&!G.legacyMode?'<button class="mb" onclick="uiRestoreTalents()">還原改版前天賦</button>':''}<details><summary>六種韌體與代價</summary>${Object.entries(FIRMWARE).map(([id,f])=>`<p><b>${f.n}</b>：${f.d}${G.pass.includes(id)?'（已選）':''}</p>`).join('')}</details><details><summary>退回末端節點（免費）</summary><p>只可退回不會切斷其他節點的點。進行挑戰或訓練時暫不可更動。</p>${G.pass.filter(id=>connectedTalents(G.pass.filter(k=>k!==id))).map(id=>`<button class="mb" data-focus="refund-${id}" ${G.run||G.train?'disabled':''} onclick="uiRefundTalent('${id}')">退回 ${uxEsc(talentName(id))}</button>`).join('')||'<p>尚未分配節點。</p>'}</details></section>`;}
function uiTalentPreview(){if(G.run||G.train){uxAnnounce('先結束挑戰或訓練，再轉換天賦。');return;}const plan=talentPlan(),after=calc(G.equip,plan,G.slots,G.supp,true);TALENT_CONFIRM={pass:JSON.stringify(G.pass),plan:JSON.stringify(plan),legacy:G.legacyMode,bi:G.bi||0};showOverlay(`<h2 class="uxdialog-title">預覽有限天賦配置</h2><p>保留 ${plan.length} 點／${firmwareCount(plan)} 個韌體，移出 ${G.pass.length-plan.length} 個節點；永久裝備與庫存保留。原配置另存快照，可還原。</p><p>DPS：${tFmt(G.st.dps)} → ${tFmt(after.dps)}<br>最大生命：${tFmt(G.st.life)} → ${tFmt(after.life)}</p><details><summary>預覽保留節點</summary>${plan.map(id=>`<p>${uxEsc(FIRMWARE[id]?.n||TREE[id].name)}</p>`).join('')}</details><p>轉換免費，不會自動購買或分配其他節點。城市挑戰需要使用有限預算。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="TALENT_CONFIRM=null;hideOverlay()">保留原配置</button><button class="mb pri" onclick="uiConfirmTalents()">免費轉換</button></div>`);}
function uiConfirmTalents(){const pending=TALENT_CONFIRM;TALENT_CONFIRM=null;hideOverlay();if(!pending||pending.pass!==JSON.stringify(G.pass)||pending.plan!==JSON.stringify(talentPlan())||pending.legacy!==G.legacyMode||pending.bi!==(G.bi||0)||!convertTalents()){uxAnnounce('配置已變動或挑戰進行中，請重新預覽。');return;}renderModal();uxAnnounce('已免費轉換，原天賦快照可還原。');}
function uiRestoreTalents(){showOverlay('<h2 class="uxdialog-title">還原改版前天賦？</h2><p>恢復改版前的天賦與三套配置，裝備與新取得道具保留。還原後暫停城市入口，可再次免費轉換。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留目前配置</button><button class="mb pri" onclick="hideOverlay();if(restoreLegacyTalents()){renderModal();uxAnnounce(\'已還原舊天賦。\')}">還原舊天賦</button></div>');}
function uiRefundTalent(id){if(!refundTalent(id)){uxAnnounce('節點會切斷路徑或挑戰進行中，未退回。');return;}renderModal();uxAnnounce('已退回一點天賦，可重新分配。');}
function uiCityConfig(key,value){if(key==='route'&&CITY_ROUTES[value])CITY_UI.route=value;if(key==='tier')CITY_UI.tier=Math.max(1,Math.min(G.city?.maxTier||1,Number(value)||1));renderModal();}
function uiCityPolicy(id){if(!['safe','risk'].includes(id))return;G.city||=newCity();G.city.policy=id;G.dirty=true;renderModal();}
function uiCityTarget(id){if(!LEGEND_BY[id])return;G.city||=newCity();G.city.target=id;G.dirty=true;renderModal();uxAnnounce(`追求目標：${LEGEND_BY[id].name}。已出發遠征保留原目標。`);}
function uiCityGo(){UI_WORK.adventure='city';openModal('maps');}
function uiCityStart(nexus=false){const route=CITY_UI.route,tier=CITY_UI.tier;if(!cityCanStart(route,tier,nexus)){uxAnnounce('尚未解鎖、憑證不足或挑戰進行中，未出發。');return;}
 if(!nexus){cityStart(route,tier);closeModal();return;}
 CITY_CONFIRM={route,tier,target:G.city.target};showOverlay(`<h2 class="uxdialog-title">挑戰第 ${tier} 階城市中樞？</h2><p>消耗本階三區憑證各一枚。勝利保證掉落出發時選定的核心，並解鎖下一階（最高八階）；失敗不退憑證，已完成路段碎片保留。</p><p>目標：${LEGEND_BY[G.city.target].name}</p><div class="uxactions"><button class="mb" data-initial-focus onclick="CITY_CONFIRM=null;hideOverlay()">先不挑戰</button><button class="mb pri" onclick="uiCityConfirmStart()">消耗三區憑證並出發</button></div>`);}
function uiCityConfirmStart(){const c=CITY_CONFIRM;CITY_CONFIRM=null;hideOverlay();if(!c||c.target!==G.city.target||!cityStart(c.route,c.tier,true)){uxAnnounce('遠征狀態已變動，沒有消耗憑證。');return;}closeModal();}
function uiCityChoose(id,stage){if(cityChoose(id,stage)){renderModal();uxAnnounce('已套用當局協定，繼續遠征。');}else uxAnnounce('路段已變動，沒有重複選路。');}
function uiForgeCore(id){const C=G.city||(G.city=newCity()),route=cityRouteForCore(id);if(!route)return;showOverlay(`<h2 class="uxdialog-title">定向合成${LEGEND_BY[id].name}？</h2><p>消耗 ${CITY_ROUTES[route].n}的 24 枚碎片（持有 ${C.fragments[route]}）。生成等級 ${Math.max(8,G.maxDepth)}，詞綴數值隨機；特殊效果固定。加入核心收藏，不自動換裝。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留碎片</button><button class="mb pri" onclick="uiConfirmForge('${id}')">消耗 24 碎片合成</button></div>`);}
function uiConfirmForge(id){hideOverlay();if(forgeTargetCore(id)){renderModal();uxAnnounce('合成完成，已加入角色的傳奇核心收藏；未改動裝備。');}else uxAnnounce('碎片不足、已持有或挑戰進行中，沒有扣款。');}
function uiCityRunHtml(){const R=G.run,c=R.city;return `<section class="ui-section"><h3>${c.nexus?'城市中樞':CITY_ROUTES[c.route].n} · 第 ${c.tier} 階</h3><p>路段 ${c.stage}／3 · ${c.stage===3?'收尾BOSS':`<span id="ui-run-count">討伐 ${Math.min(R.kills,R.need)}／${R.need}</span>`}</p><p>已存 ${c.bank} 枚${CITY_ROUTES[c.route].n}碎片；撤離或死亡仍帶回。核心目標：${LEGEND_BY[c.target].name}。</p>${c.branches.length?`<p>當局協定：${c.branches.map(id=>CITY_BRANCHES[id].n).join('、')}</p>`:''}${c.awaitChoice?`<h3>下一段走哪條路？</h3><p>效果累加，只在本次遠征生效。</p><p id="ui-city-choice-time">15 秒後依出發策略自動選路，也可立即選擇。</p><div class="ui-directory">${Object.entries(CITY_BRANCHES).map(([id,b])=>`<button data-focus="city-branch-${id}" onclick="uiCityChoose('${id}',${c.stage})"><b>${b.n}</b><span>${b.d}</span></button>`).join('')}</div>`:`<p>${c.nexus?'訊號、護盾與重裝威脅依路段輪替，BOSS在生命 65%／30% 時加速。':CITY_ROUTES[c.route].threat}</p>`}<button class="mb" onclick="uiLeaveMap()">撤離並帶回碎片</button></section>`;}
function uiCityHtml(){const C=G.city||(G.city=newCity());CITY_UI.tier=Math.min(C.maxTier,CITY_UI.tier);const route=CITY_UI.route,tier=CITY_UI.tier,target=C.target,tr=cityRouteForCore(target),active=!!G.run||!!G.train,frag=C.fragments[route],seals=Object.keys(CITY_ROUTES).filter(id=>C.seals[tier]?.[id]).length,tfrag=C.fragments[tr],canForge=!active&&cityReady()&&!G.armory[target]&&tfrag>=24;
 const bar=(v,m)=>`<i class="shop-bar"><u style="width:${Math.min(100,Math.round(v/m*100))}%"></u></i>`;
 return `<section class="ui-section city-page"><h3>城市遠征</h3><ol class="city-steps"><li><b>1</b>選路線</li><li><b>2</b>出發收集碎片</li><li><b>3</b>集齊三區憑證，挑戰中樞</li></ol>${!cityReady()?`<p class="uxwarning">${G.maxDepth<8?'最深第 8 層解鎖。':'先到成長頁預覽並轉換有限天賦。'}</p>`:''}${C.last?`<p class="city-last">${uxEsc(C.last.text)}</p>`:''}<div class="city-tier"><span>階級</span><div class="view-options" role="group" aria-label="遠征階級">${Array.from({length:C.maxTier},(_,i)=>i+1).map(t=>`<button class="mb" aria-pressed="${t===tier}" data-focus="city-tier-${t}" onclick="uiCityConfig('tier',${t})">第 ${t} 階</button>`).join('')}</div><small>憑證 ${seals}／3</small></div>
 <div class="view-options ui-scenes ui-routes city-routes" role="group" aria-label="城市路線">${Object.entries(CITY_ROUTES).map(([id,r])=>`<button class="mb ui-scenebtn" aria-pressed="${route===id}" data-focus="city-route-${id}" onclick="uiCityConfig('route','${id}')">${(u=>u?`<img class="ui-scene" alt="" aria-hidden="true" src="${u}" style="image-rendering:pixelated">`:'')(icon3dSceneUrl('route_'+id))}<span>${r.n}</span><i>${C.seals[tier]?.[id]?'✓ 憑證':'未取得'}</i></button>`).join('')}</div>
 <article class="city-card"><div class="city-head"><b>${CITY_ROUTES[route].n}</b><small>敵人等級 ${Math.max(8,G.maxDepth)+2*(tier-1)}</small></div><p>${CITY_ROUTES[route].threat}。</p><div class="city-prog"><span>區域碎片 ${frag}／24</span>${bar(frag,24)}</div><p class="uxmeta">可掉落：${CITY_ROUTES[route].cores.map(id=>LEGEND_BY[id].name).join('、')}</p><div class="city-go"><button class="mb pri" data-focus="city-start" ${cityCanStart(route,tier)?'':'disabled'} onclick="uiCityStart()">出發第 ${tier} 階遠征</button><button class="mb" ${cityCanStart(route,tier,true)?'':'disabled'} onclick="uiCityStart(true)">挑戰中樞<small>消耗三區憑證</small></button></div>${active?'<p class="uxmeta">先結束目前挑戰或訓練。</p>':''}<details><summary>路線說明</summary><p>${CITY_ROUTES[route].d}</p><p>當局增益與代價結束後移除。首階完整遠征至少 14 枚，安全路線兩次即可合成一款未持有核心；收尾另有 15% 區域核心機會。</p></details></article>
 <article class="city-card city-goal"><div class="city-head"><b>追求：${LEGEND_BY[target].name}</b><small>${CITY_ROUTES[tr].n}</small></div><p>${LEGEND_BY[target].d}</p><div class="city-prog"><span>碎片 ${tfrag}／24</span>${bar(tfrag,24)}</div><p class="uxmeta">城市中樞勝利保證掉落出發時選定的目標；遠征中的目標不隨此處變更。</p><div class="city-go"><button class="mb" ${canForge?'':'disabled'} onclick="uiForgeCore('${target}')">${G.armory[target]?'已收藏':'24 碎片合成'}</button><button class="mb" onclick="openModal('char')">查看核心收藏</button></div><details><summary>更換追求核心 · 九款</summary><div class="ui-directory">${Object.entries(CITY_ROUTES).flatMap(([rid,r])=>r.cores.map(id=>`<button data-focus="city-target-${id}" aria-pressed="${target===id}" onclick="uiCityTarget('${id}')"><b>${LEGEND_BY[id].name}${G.armory[id]?' · 已收藏':''}</b><span>${r.n} · ${LEGEND_BY[id].d}</span></button>`)).join('')}</div></details></article>
 <details class="city-more"><summary>遠征規則</summary><p>三個路段、兩次選路、一次收尾BOSS。三區憑證開啟同階中樞；完成中樞推進下一階。各階憑證分開保存，沒有每日重置。</p></details><details class="city-more"><summary>離線出發策略</summary><p>出發即授權離線自動選路：${C.policy==='risk'?'帶電捷徑':'旁路校準'}。只完成當前遠征；失敗不重開、不自動消耗其他門票。前景到分岔可自行選擇，15 秒後依出發策略自動繼續。</p><div class="view-options">${[['safe','保守選路'],['risk','碎片優先']].map(([id,n])=>`<button class="mb" aria-pressed="${C.policy===id}" onclick="uiCityPolicy('${id}')">${n}</button>`).join('')}</div></details></section>`;
}

let CITY_CHECKPOINT_REVEALED=null;
function uiCityRevealCheckpoint(){const c=G.run?.city;if(modalTab!=='maps'||!c?.awaitChoice||UX_LAYERS.length)return;const key=G.run.map.id+':'+c.stage;if(CITY_CHECKPOINT_REVEALED===key)return;CITY_CHECKPOINT_REVEALED=key;requestAnimationFrame(()=>{if(modalTab!=='maps'||!G.run?.city?.awaitChoice)return;$('mbody').scrollTop=0;document.querySelector('[data-focus="city-branch-safe"]')?.focus({preventScroll:true});});}

const UI_SETTING_LABELS={'模式':['模式',()=>G.push?'持續推進':'原地刷怪'],'挑戰BOSS':['BOSS條件',()=>(G.bossHp||0)?'生命 '+G.bossHp+'% 以上':'一律挑戰'],'戰利品過濾':['拾取門檻',()=>['全部撿','魔法以上','稀有以上'][G.filter]],'倒下表現':['倒下表現',()=>deathFxStyle()==='signal'?'訊號碎片':'紅色液體'],'小視窗':['小視窗',()=>typeof BG!=='undefined'&&BG.pip?'已開啟':'關閉'],'街區地圖':['街區地圖',()=>streetSampleOn()?'街區樣板':'原版地形'],'音效':['音效',()=>({all:'音樂＋音效',sfx:'只有音效',off:'靜音'})[AUD.mode]||'靜音'],'戰鬥畫面':['戰鬥畫面（手機）',()=>G.userCz?['大','大','小','收起'][Math.max(1,G.cz==null?1:G.cz)]:'自動'],'混沌重鑄':['混沌重鑄',()=>`金幣 ${tFmt(G.gold)}`],'編年史':['編年史',()=>'查看遊戲資訊'],'扮工模式 ( ` )':['扮工模式',()=>'快捷鍵 `']};
function uiInstallSettings(){const root=$('uisettings');if(!root||root.dataset.gridReady)return;root.dataset.gridReady='true';for(const wrap of root.querySelectorAll('#btns .stepwrap')){const button=wrap.querySelector('.act'),label=button.textContent.replace('▾','').trim();if(UI_SETTING_LABELS[label]){wrap.dataset.setting=label;button.dataset.focus='setting-'+label;}}
 const order=['模式','挑戰BOSS','戰利品過濾','戰鬥畫面','街區地圖','倒下表現','小視窗','音效','混沌重鑄','編年史','扮工模式 ( ` )'];for(const key of order){const wrap=[...root.querySelectorAll('[data-setting]')].find(w=>w.dataset.setting===key);if(wrap)$('btns').appendChild(wrap);}
 uiSyncSettings();}
function uiSyncSettings(){for(const wrap of document.querySelectorAll('#uisettings [data-setting]')){const [label,value]=UI_SETTING_LABELS[wrap.dataset.setting],button=wrap.querySelector('.act'),text=value(),html=`<span class="ui-setting-copy"><b>${label}</b><small>${uxEsc(text)}</small></span>${wrap.querySelector('.chips')?'<span aria-hidden="true">▾</span>':'<span aria-hidden="true">↗</span>'}`;if(button.innerHTML!==html)button.innerHTML=html;}}

/* Feedback UI stays in-game; server configuration owns delivery credentials. */
const FEEDBACK_DRAFT={category:'錯誤',title:'',details:'',device:false};let FEEDBACK_PREVIEW=null;
function feedbackText(d,device=''){return `類別：${d.category}\n版本：${VERSION()}\n\n${d.details.trim()}${d.device&&device?'\n\n裝置資訊：'+device:''}`;}
function feedbackPayload(d,device=''){const title=d.title.trim(),details=d.details.trim();if(!title||!details||title.length>60||details.length>700||!['錯誤','平衡','玩法建議','其他'].includes(d.category))return null;return {title:'['+d.category+'] '+title,body:feedbackText(d,device)};}
function feedbackClearError(input){input.removeAttribute('aria-invalid');const e=$('feedback-error');if(e)e.textContent='';FEEDBACK_STATE.requestId=null;}
function feedbackDownload(){FEEDBACK_PREVIEW=feedbackPayload(FEEDBACK_DRAFT);if(!FEEDBACK_PREVIEW){uxAnnounce('先填寫標題與內容再下載。');return;}const p=FEEDBACK_PREVIEW,url=URL.createObjectURL(new Blob([p.title+'\n\n'+p.body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='game-lab-feedback.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);uxAnnounce('已下載草稿，尚未送出。');}

function storyJournalHtml(){const n=storyChapter();return `<details class="ui-rules"><summary>夏日主線 · 已找回 ${n}／${STORY_CHAPTERS.length}</summary>${n>=STORY_CHAPTERS.length?streetChapterHtml():''}${STORY_CHAPTERS.map((c,i)=>i<n?`<details class="field-entry"><summary>第${'一二三四五六'[i]}章　${uxEsc(c.title)} · ${uxEsc(c.item)}</summary><p class="uxmeta">${uxEsc(c.boss)}</p><p>${uxEsc(c.text)}</p><p>${uxEsc(c.radio)}</p></details>`:i===n?streetChapterHtml():'').join('')}</details>`;}
function fieldJournalHtml(){const count=FIELD_STORIES.filter((_,i)=>G.storyFlags['p'+i]).length;return `<details class="ui-rules"><summary>電台手記 · 已收錄 ${count}／${FIELD_STORIES.length}</summary><p>街區照常生活，錯頻的設備卻送出了同一道指令。沿各處回覆追查，讓電台重新聽見大家。</p>${FIELD_STORIES.map((e,i)=>{const f=G.storyFlags['p'+i]||0;return f?`<details class="field-entry"><summary>${uxEsc(e[0])}${f&2?' · 歸途已收錄':''}</summary><p class="uxmeta">${uxEsc(e[1])}</p><p>${uxEsc(e[2])}</p>${f&2?`<p>歸途：${uxEsc(e[3])}</p>`:''}</details>`:'';}).join('')||'<p>到達新的地景後，會收錄當地留言。</p>'}</details>`;}

function uiWorldViewHtml(){const p=terrainNow(),size={regular:'一般',medium:'中型',large:'大型',giant:'巨型',training:'訓練場'}[p.sizeClass];return `<div class="direct-map-tools"><span>${uxEsc(p.name)} · ${size}</span><button class="mb" aria-pressed="${!!FXO.overview}" onclick="toggleWorldOverview()">${FXO.overview?'跟隨鏡頭':'全景'}</button><button class="mb" onclick="directJournal()">手記 ${FIELD_STORIES.filter((_,i)=>G.storyFlags['p'+i]).length}／12</button>${directHelpButton('maps')}</div>`;}

/* 可用地圖：依地貌分組、同款（地貌＋等級＋詞綴）合併成一張並標示數量，方塊卡放大 3D 小島 */
function uiMapGroups(){
  const by=new Map();
  for(const m of G.maps){const key=m.biome+'|'+m.lvl+'|'+m.mods.slice().sort().join(','),g=by.get(key);if(g){g.n++;}else by.set(key,{m,n:1});}
  const list=[...by.values()].sort((a,b)=>a.m.biome-b.m.biome||b.m.lvl-a.m.lvl);
  return `<div class="ui-mgrid">`+list.map(({m,n})=>{const B=BIOMES[m.biome],c=mapChallenge(m.mods),pips='◆'.repeat(c)+'◇'.repeat(Math.max(0,3-c));
    return `<button type="button" class="ui-mtile" data-focus="map-${uxEsc(m.id)}" aria-label="${uxEsc(B.n)}，等級 ${m.lvl}，挑戰詞綴 ${c}，共 ${n} 張，查看詳情" style="--b1:${B.board.l};--b2:${B.board.m};--b3:${B.board.d}" onclick="uiInspectMap('${encodeURIComponent(m.id).replace(/'/g,'%27')}')">${uiMapThumb(m)}<span class="lv">Lv.${m.lvl}</span>${n>1?`<span class="cnt">×${n}</span>`:''}<b>${uxEsc(B.n)}</b><span class="pip" title="挑戰詞綴 ${c}">${pips}</span></button>`;}).join('')+`</div>`;
}
(function(){const st=document.createElement('style');st.textContent=`
#mbody .ui-mgroups{display:flex;flex-direction:column;gap:12px;margin:8px 0}
#mbody .ui-mgroup h4{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:3px 8px;font:15px var(--ux-body,system-ui);color:#12202a;background:linear-gradient(90deg,var(--b1),#ffffff00);border-left:6px solid var(--b3)}
#mbody .ui-mgroup h4 i{display:none}#mbody .ui-mgroup h4 small{margin-left:auto;font-size:12px;opacity:.7}
#mbody .ui-mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
#mbody .ui-mtile{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:flex-end;min-height:132px;padding:6px 4px 4px!important;border:2px solid #fff!important;outline:1px solid #7d8bbd;border-radius:0!important;background:linear-gradient(180deg,var(--b1) 0 55%,var(--b2) 55% 100%)!important;color:#12202a!important;box-shadow:0 2px 0 #8c9bd0!important;overflow:hidden}
#mbody .ui-mtile .ui-mapthumb{width:92px;height:auto;margin:0 0 2px;image-rendering:pixelated}
#mbody .ui-mtile:hover,#mbody .ui-mtile:focus-visible{outline:2px solid #2f6bff;transform:translateY(-1px)}
#mbody .ui-mtile span{font-family:var(--ux-body,system-ui)!important;text-shadow:1px 1px 0 #ffffffb0;line-height:1}
#mbody .ui-mtile .lv{position:absolute;left:4px;top:4px;padding:2px 4px;font-size:12px;background:#12202acc;color:#fff;text-shadow:none}
#mbody .ui-mtile .cnt{position:absolute;right:4px;top:4px;padding:2px 4px;font-size:13px;background:#ffe45c;color:#12202a;border:1px solid #12202a;text-shadow:none}
#mbody .ui-mtile b{font:13px var(--ux-body,system-ui);text-shadow:1px 1px 0 #ffffffb0;margin-bottom:3px}
#mbody .ui-mtile .pip{font-size:12px;letter-spacing:2px;color:#b3261e}
`;document.head.appendChild(st);})();
/* 角色選擇：復古選角視窗，頭像框加資料欄，延續藍紫窗口配色 */
(function(){const st=document.createElement('style');st.textContent=`
#mbody .char-card .chars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#mbody .char-card .chr{display:flex!important;flex-direction:row!important;align-items:stretch!important;gap:8px;min-height:84px;padding:5px!important;text-align:left;white-space:normal;background:#d9dff0!important;color:#1d2552!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:0 2px 0 #8c9bd0!important}
#mbody .char-card .chr .chr-pic{flex:0 0 66px;width:66px;height:66px;align-self:center;background:linear-gradient(180deg,#b8c8ee,#8fa3d8);border:2px solid #5c6a8e;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #33407f;overflow:hidden;display:block}
#mbody .char-card .chr .chr-pic img{width:100%;height:100%;display:block}
#mbody .char-card .chr .chr-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px}
#mbody .char-card .chr .chr-info b{display:block;color:#1d2552;padding:2px 4px;background:#fff;border:1px solid #8c9bd0;font-size:14px;line-height:1.15}
#mbody .char-card .chr .chr-info b small{margin-left:4px;font-size:11px;opacity:.7}
#mbody .char-card .chr .chr-info i{font-style:normal;font-size:12px;line-height:1.25}
#mbody .char-card .chr .chr-info em{font-style:normal;align-self:flex-start;padding:1px 5px;font-size:12px;background:#ffe45c;color:#1d2552;border:1px solid #1d2552}
#mbody .char-card .chr.on{background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%)!important;color:#fff!important;outline:2px solid #1d2552}
#mbody .char-card .chr.on .chr-pic{border-color:#ffe45c}
#mbody .char-card .chr.lock{opacity:.6}#mbody .char-card .chr.lock .chr-pic img{filter:grayscale(1) brightness(.6)}
#mbody .chr-data{margin:8px 0 4px;padding:8px 10px;background:#05060d;border:3px solid #8c9bd0;outline:1px solid #1d2552;color:#fff;font-family:var(--ux-body,system-ui)}
#mbody .chr-data p{display:flex;gap:10px;margin:0;line-height:1.5}#mbody .chr-data p span{flex:0 0 3em;color:#9fb4ff;letter-spacing:.1em}#mbody .chr-data p b{font-weight:normal;min-width:0}
@media(max-width:420px){#mbody .char-card .chr .chr-pic{flex-basis:52px;width:52px;height:52px}#mbody .char-card .chr{gap:6px;padding:4px!important}#mbody .char-card .chr .chr-info b{font-size:13px}}
`;document.head.appendChild(st);})();
/* 統一窗口風：區塊標題變標題列、摺疊列變小視窗列、數據列變黑底資料欄、日誌與空狀態變卡片 */
(function(){const st=document.createElement('style');st.textContent=`
#mbody .ui-section>h3,#mbody .ui-map-state h3,#mbody .mct,#uisettings h3,#mbody .rc>.rh{display:flex;align-items:center;gap:6px;margin:10px 0 6px;padding:3px 8px;font:14px var(--ux-body,system-ui);letter-spacing:.06em;color:#fff;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);border:2px solid #fff;outline:1px solid #1d2552;box-shadow:0 2px 0 #8c9bd0}
#mbody .ui-section>h3::before,#mbody .ui-map-state h3::before,#mbody .mct::before,#uisettings h3::before{content:"";width:8px;height:8px;background:#ffe45c;border:1px solid #1d2552;flex:none}
#mbody .ui-map-state{align-items:center}
#mbody details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;margin:6px 0 2px;padding:5px 8px;color:#1d2552;background:linear-gradient(#f2f4fa,#c3cbdc);border:2px solid #fff;outline:1px solid #5c6a8e;box-shadow:0 2px 0 #8c9bd0}
#mbody details>summary::-webkit-details-marker{display:none}
#mbody details>summary::before{content:"▶";font-size:10px;color:#33407f}
#mbody details[open]>summary::before{content:"▼"}
#mbody details[open]>summary{background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);color:#fff}#mbody details[open]>summary::before{color:#ffe45c}
#mbody .ui-stat-list{margin:6px 0;padding:6px 10px;background:#05060d;border:3px solid #8c9bd0;outline:1px solid #1d2552}
#mbody .ui-stat-list>div{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border:0!important;line-height:1.5}
#mbody .ui-stat-list dt{color:#9fb4ff;letter-spacing:.08em}#mbody .ui-stat-list dd{margin:0;color:#fff;font-variant-numeric:tabular-nums}
#mbody .lg{margin:8px 0;padding:6px 10px 8px;background:#f4f6ff;border:2px solid #fff;outline:1px solid #8c9bd0;box-shadow:0 2px 0 #c3cbdc}
#mbody .lg>b{display:inline-block;padding:1px 8px;margin-right:6px;background:#33407f;color:#fff;border:1px solid #1d2552}
#mbody .lg ul{margin:6px 0 0;padding-left:16px;list-style:square}
#mbody .ui-grid-empty{display:flex;flex-direction:column;align-items:center;gap:8px;margin:8px 0;padding:18px 12px!important;text-align:center;color:#33407f;background:#f4f6ff;border:2px dashed #8c9bd0}
#mbody .ui-grid-empty::before{content:"";width:34px;height:34px;background:linear-gradient(#b8c8ee,#8fa3d8);border:2px solid #5c6a8e;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #33407f}
#mbody .rpgm .rc,#mbody .ui-section{background:transparent}
`;document.head.appendChild(st);})();
(function(){const st=document.createElement('style');st.textContent=`#mbody .rc>.rh,#mbody .rc.wide>.rh{border-radius:0!important;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%)!important;color:#fff!important;border:2px solid #fff!important;padding:3px 8px!important}`;document.head.appendChild(st);})();
/* 設定頁：每組設定做成小視窗（標題列＋內容），圖示格、像素滑桿與檸檬黃數值標籤 */
(function(){const st=document.createElement('style');st.textContent=`
body.ui-material #uisettings .ui-setting-grid>.ui-setting-block,body #uisettings .ui-setting-block{position:relative;margin:10px 0!important;padding:0 10px 10px!important;background:#e6e8f6!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:3px 3px 0 #8c9bd0}
body #uisettings .ui-setting-block>h4,body #uisettings .view-fx-control>div:first-child{display:flex;align-items:center;justify-content:flex-start;gap:6px;margin:0 -10px 10px!important;padding:4px 8px;font:14px var(--ux-body,system-ui);color:#fff;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);border-bottom:2px solid #1d2552}
body #uisettings .ui-setting-block>h4::before,body #uisettings .view-fx-control>div:first-child label::before{content:"";display:inline-block;width:8px;height:8px;margin-right:6px;background:#ffe45c;border:1px solid #1d2552}
body #uisettings .view-fx-control label{color:#fff;font:14px var(--ux-body,system-ui)}
body #uisettings .view-fx-control output{margin-left:auto;padding:1px 8px;background:#ffe45c;color:#1d2552;border:1px solid #1d2552;font-size:12px}
body #uisettings .view-fx-ticks span{color:#33407f}
body #uisettings input#ui-fx-level{-webkit-appearance:none;appearance:none;background:transparent}
body #uisettings input#ui-fx-level::-webkit-slider-runnable-track{height:12px;background:#18233d;border:2px solid #1d2552;box-shadow:1px 1px 0 #fff}
body #uisettings input#ui-fx-level::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:22px;margin-top:-7px;background:linear-gradient(#fff3bf,#efce68);border:2px solid #1d2552;border-radius:0}
body #uisettings input#ui-fx-level::-moz-range-track{height:12px;background:#18233d;border:2px solid #1d2552}
body #uisettings input#ui-fx-level::-moz-range-thumb{width:14px;height:20px;background:#efce68;border:2px solid #1d2552;border-radius:0}
body.ui-material #uisettings #btns .act{position:relative;padding-left:14px!important;border-left:6px solid #33407f!important}
body.ui-material #uisettings #btns .act::after{content:"";position:absolute;left:-6px;top:0;width:6px;height:100%;background:linear-gradient(#ffe45c 0 30%,#33407f 30% 100%);opacity:0}
body #uisettings .view-settings .view-options>button,body #uisettings #watch-now{border-radius:0!important}
body #uisettings .ui-rules{margin-top:8px}
`;document.head.appendChild(st);})();
/* 更多選單：分組改為藍紫小窗口，入口卡片與編年史同色系 */
(function(){const st=document.createElement('style');st.textContent=`
body #mbody .ui-menu-group{margin:12px 0!important;padding:0 10px 10px!important;background:#e6e8f6!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:3px 3px 0 #8c9bd0!important}
body #mbody .ui-menu-group>h3{display:flex;align-items:center;gap:6px;margin:0 -10px 10px;padding:4px 8px;font:14px var(--ux-body,system-ui);letter-spacing:.06em;color:#fff;background:linear-gradient(#4a5aa8 0 45%,#33407f 45% 100%);border-bottom:2px solid #1d2552}
body #mbody .ui-menu-group>h3::before{content:"";width:8px;height:8px;background:#ffe45c;border:1px solid #1d2552;flex:none}
body #mbody .ui-directory button,body #mbody .ui-wiki{background:#f4f5ff!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important;color:#1d2552!important}
body #mbody .ui-directory button:active,body #mbody .ui-wiki:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #8c9bd0!important}
body #mbody .ui-directory button b,body #mbody .ui-wiki b{color:#1d2552}
body #mbody .ui-directory button span,body #mbody .ui-wiki small{color:#5c6a8e!important}
body #mbody .ui-directory button i,body #mbody .ui-wiki i{color:#33407f;font-size:13px}
body #mbody .ui-wiki{margin-top:12px;background:linear-gradient(#fffbe0,#f6e9a8)!important}
`;document.head.appendChild(st);})();
/* 設定頁選項按鈕：由灰色斜面鈕改成淡紫扁平卡 */
(function(){const st=document.createElement('style');st.textContent=`
body #uisettings .ui-setting-grid>button,body #uisettings .view-settings .view-options>button,body #uisettings #watch-now{background:#f4f5ff!important;color:#1d2552!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important;text-shadow:none!important}
body #uisettings .ui-setting-grid>button:active,body #uisettings .view-settings .view-options>button:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #8c9bd0!important}
body #uisettings .ui-setting-grid>button small,body #uisettings .ui-setting-grid>button span{color:#5c6a8e!important}
body #uisettings .view-options>button[aria-pressed=true],body #uisettings .view-options>button.on,body #uisettings .view-options>button.sel{background:linear-gradient(#4a5aa8,#33407f)!important;color:#fff!important}
`;document.head.appendChild(st);})();
(function(){const st=document.createElement('style');st.textContent=`
body.ui-material #uisettings #btns button.act,body.ui-material #uisettings .ui-setting-grid>button.act,body.ui-material #uisettings button.act{background:#f4f5ff!important;background-image:none!important;color:#1d2552!important;border:2px solid #fff!important;border-left:6px solid #33407f!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important}
body #uisettings button.act b{color:#1d2552}body #uisettings button.act small{color:#5c6a8e!important}
body.ui-material #mbody .ui-menu-group{margin:12px 0!important;padding:0 10px 10px!important;background:#e6e8f6!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:3px 3px 0 #8c9bd0!important}
body.ui-material #mbody .ui-menu-group .ui-directory,body.m.ui-material #mbody .ui-menu-group .ui-directory{grid-template-columns:1fr!important}
body.ui-material #mbody .ui-directory button{background-image:none!important;grid-template-columns:auto 1fr auto}
`;document.head.appendChild(st);})();
(function(){const st=document.createElement('style');st.textContent=`html body.ui-material :is(#mbody,#ovl) .mct,html body.ui-material :is(#mbody,#ovl) .mct *{color:#fff!important}html body.ui-material :is(#mbody,#ovl) .mct small,html body.ui-material :is(#mbody,#ovl) .mct button{color:#1d2552!important}`;document.head.appendChild(st);})();
(function(){const s=document.createElement('style');s.textContent='.ui-segments>button,.device-directory-card{position:relative}.ui-segments>button .rd,.device-directory-card .rd{position:absolute;top:3px;right:3px;margin:0}.device-affix.legend p{color:#ffd88a}';document.head.appendChild(s)})();
(function(){const s=document.createElement('style');s.textContent='body.ui-material #mbody .pz.wb button.pc.ac{background:rgba(22,35,63,.34)!important}body.ui-material #mbody .pz.wb button.pc.ac>img{width:min(66%,48px)!important;height:auto!important;aspect-ratio:1;max-width:none!important;max-height:none!important}.pz.wb .pc.ac.lnk{animation:gem-glow 1.6s ease-in-out infinite}@keyframes gem-glow{0%,100%{filter:none}50%{filter:drop-shadow(0 0 5px var(--padc))}}body.reduced-effects .pz.wb .pc.ac.lnk{animation:none}.wsvg .wire-current{stroke-width:.09;opacity:1;filter:drop-shadow(0 0 .06px #fff)}';document.head.appendChild(s)})();
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')||e.target?.isContentEditable)return;const k=e.key.toLowerCase();
  if(k==='m'&&typeof audMode==='function'){const off=(typeof AUD!=='undefined'&&AUD.mode)==='off';audMode(off?'all':'off');if(typeof uxAnnounce==='function')uxAnnounce(off?'已開啟音樂與音效。':'已關閉音樂與音效。');}
  else if(k==='b'&&typeof viewApplyPrefs==='function'){GAME_VIEW.prefs.hideBattle=!GAME_VIEW.prefs.hideBattle;viewSavePrefs();viewApplyPrefs();if(typeof uxAnnounce==='function')uxAnnounce(GAME_VIEW.prefs.hideBattle?'已隱藏戰鬥畫面。':'已顯示戰鬥畫面。');}
});
(function(){const s=document.createElement('style');s.textContent='.stage{position:relative}.stage::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0;transition:opacity 1.2s;background:radial-gradient(ellipse at 50% 45%,rgba(176,96,255,.18),rgba(92,24,168,.55));mix-blend-mode:multiply}body.rift-on .stage::after{opacity:1}body.rift-on.reduced-effects .stage::after{transition:none}.cart-guide{margin:6px 0 10px;padding:8px 10px 8px 26px;font-size:13px;line-height:1.7;border:1px solid #92a7c466;border-radius:6px}.cart-guide li.now{font-weight:700}@media(pointer:coarse){.talent-viewport{touch-action:none!important;overflow:hidden!important}}.audio-hint{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;padding:8px 14px;border-radius:6px;background:#14123aee;color:#fff;font-size:14px;pointer-events:none;transition:opacity .6s}';document.head.appendChild(s)})();
(function(){let el=null;const done=()=>{if(el){el.style.opacity=0;setTimeout(()=>el?.remove(),700);el=null}};
addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{if(typeof AUD==='undefined'||AUD.ctx||AUD.mode!=='all'||document.body.classList.contains('m')||matchMedia('(pointer:coarse)').matches)return;el=document.createElement('div');el.className='audio-hint';el.textContent='點一下畫面即可開啟音樂（按 M 可關閉）';document.body.appendChild(el);},1200)});
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,done,{passive:true}));})();
(function(){const s=document.createElement('style');s.textContent='.pz.wb .pc.ac .gflow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible;fill:none}.pz.wb .pc.ac .gflow polyline{stroke:var(--padc);stroke-width:.07;stroke-dasharray:.1 .09;stroke-linecap:round;stroke-linejoin:round;opacity:.55}.pz.wb .pc.ac .gflow.lit polyline{opacity:.95;animation:gflow 1s linear infinite}@keyframes gflow{to{stroke-dashoffset:-.38}}body.reduced-effects .pz.wb .pc.ac .gflow.lit polyline{animation:none}';document.head.appendChild(s)})();
(function(){const s=document.createElement('style');s.textContent='.pzbar>.mb[onclick^="wireHistoryStep"]{display:inline-flex;align-items:center;gap:4px;min-width:44px;min-height:44px;font-size:13px;padding:0 10px}.pzbar>.mb[onclick^="wireHistoryStep"] svg{flex:none;width:22px;height:22px}.pzbar>.mb[onclick^="wireHistoryStep"]:disabled{opacity:.45}';document.head.appendChild(s)})();
(function(){const s=document.createElement('style');s.textContent='.cart-targets{display:grid;gap:8px;margin:8px 0}.cart-target{display:grid!important;grid-template-columns:28px 1fr;grid-template-rows:auto auto;column-gap:10px;text-align:left;min-height:52px}.cart-target>img,.cart-target>svg{grid-row:1/3}.cart-target small{font-size:12px;opacity:.85}';document.head.appendChild(s)})();
(function(){const s=document.createElement('style');s.textContent='.uxforge>summary{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.forge-chip{display:inline-flex;gap:6px;align-items:baseline;padding:2px 10px;border-radius:999px;background:#ffffff1f;font-size:13px}.forge-chip em{font-style:normal;opacity:.8;font-size:12px}.uxforge h4{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin:14px 0 8px}.uxforge h4 small{font-weight:400;font-size:12px;opacity:.8}.forge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}.forge-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;min-height:104px;border-radius:8px;text-align:center}.forge-card:not(:disabled):hover{transform:translateY(-1px)}.forge-card b{font-size:14px}.forge-card small{font-size:12px;opacity:.85}.forge-card.short{opacity:.55}.forge-row{display:flex;align-items:center;gap:6px}.forge-arrow{font-size:18px;color:#ffd04a}.forge-gem{position:relative;display:inline-flex}.forge-gem i{position:absolute;right:-6px;bottom:-6px;font-style:normal;font-size:11px;line-height:1;padding:2px 4px;border-radius:4px;background:#14123a;color:#fff}.forge-gem.up{filter:drop-shadow(0 0 6px #ffd04a)}.forge-card.over:not(:disabled) .forge-gem{filter:drop-shadow(0 0 5px #ff8a4a)}.forge-empty{opacity:.75;font-size:13px;padding:12px;border:1px dashed #92a7c466;border-radius:8px;text-align:center}';document.head.appendChild(s)})();

(function(){const st=document.createElement('style');st.textContent=`.shop-intro{font-size:13px;line-height:1.7;margin:6px 0 10px;color:var(--ux-muted)}.shop-list{display:flex;flex-direction:column;gap:8px}.shop-card{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;background:linear-gradient(#f2f5fc,#dfe6f4);border:1px solid #9fb2cc;box-shadow:inset 0 -3px #c3d0e2}.shop-ico{width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:#16233f;border:2px solid #7990ac;box-shadow:inset 0 0 0 2px #0006}.shop-ico img{width:44px!important;height:44px!important;margin:0!important;image-rendering:pixelated}.shop-info{display:flex;flex-direction:column;gap:3px;min-width:0}.shop-info b{font-size:16px;font-weight:400;color:#1b3358}.shop-info span{font-size:12px;line-height:1.6;color:#44526e}.shop-info em{font-style:normal;font-size:12px;color:#1b3358}.shop-bar{display:block;height:8px;background:#263b59;box-shadow:inset 0 0 0 2px #172b47}.shop-bar u{display:block;height:100%;background:linear-gradient(90deg,#4fb7a8,#9fe6d4)}.shop-btns{display:flex;flex-direction:column;gap:5px}.shop-btns .mb{min-width:92px;min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.3}.shop-btns .mb small{font-size:11px;opacity:.85}.shop-max{font-size:12px;color:var(--ux-muted)}.shop-sub{font-size:16px;margin:16px 0 4px}@media(max-width:420px){.shop-card{grid-template-columns:48px minmax(0,1fr);}.shop-ico{width:48px;height:48px}.shop-btns{grid-column:1/-1;flex-direction:row}.shop-btns .mb{flex:1}}`;document.head.appendChild(st)})();
(function(){const st=document.createElement('style');st.textContent=`.city-steps{display:flex;gap:6px;list-style:none;margin:8px 0;padding:0}.city-steps li{flex:1;display:flex;align-items:center;gap:6px;padding:6px 8px;font-size:12px;line-height:1.4;background:#e8edf8;border:1px solid #9fb2cc}.city-steps b{flex:none;width:20px;height:20px;display:grid;place-items:center;background:#24406e;color:#fff;font-weight:400;font-size:12px}.city-last{font-size:13px;color:#1b3358}.city-tier{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0}.city-tier>span,.city-tier>small{font-size:12px;color:var(--ux-muted)}.city-tier .view-options{margin:0}.city-routes{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.city-routes .ui-scenebtn{width:auto!important;min-width:0}.city-routes .ui-scenebtn i{font-style:normal;font-size:11px}.city-card{margin:10px 0;padding:12px;background:linear-gradient(#f2f5fc,#dfe6f4);border:1px solid #9fb2cc;box-shadow:inset 0 -3px #c3d0e2}.city-card>.city-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:6px 10px;margin:-12px -12px 8px;background:#24406e;color:#eaf2fa}.city-card>.city-head b{font-size:16px;font-weight:400}.city-card>.city-head small{font-size:12px;color:#a9c4e6}.city-card p{font-size:13px;line-height:1.7;margin:6px 0}.city-prog{display:flex;flex-direction:column;gap:4px;margin:8px 0}.city-prog>span{font-size:12px;color:#1b3358}.city-go{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.city-go .mb{min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center}.city-go small{font-size:11px;opacity:.85}.city-more{margin:8px 0}.train-targets{margin:8px 0}.train-start{width:100%;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:8px 0}.train-start small{font-size:11px;opacity:.85}.train-run{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;background:#e8edf8;border:1px solid #9fb2cc;margin:8px 0}.train-dps{display:flex;align-items:baseline;gap:8px;margin:4px 0 10px}.train-dps strong{font-size:40px;font-weight:400;color:#1b3358;line-height:1.1}.train-dps span{font-size:12px;color:var(--ux-muted)}.train-targets{grid-template-columns:repeat(2,minmax(0,1fr))!important}.train-targets .ui-scenebtn i{font-size:11px;font-style:normal;line-height:1.4;white-space:normal}@media(max-width:420px){.city-steps{flex-direction:column}.city-go{grid-template-columns:1fr}}`;document.head.appendChild(st)})();
/* 字級依畫面寬度調整：手機維持原大小並設下限，平板約 +10%，電腦版約 +20%（含下限），套用在面板與彈窗內。 */
(function(){
 const spec=()=>innerWidth>=1180?{k:1.2,fl:16}:innerWidth>=768?{k:1.1,fl:14}:{k:1,fl:13},SKIP='canvas,svg,.hud,.hud *,#mtabs,#mtabs *,.talent-node,.talent-node *,.tower-floor-select button,.pc,.pc *,.wsvg *,.dmg,.tip';
 let queue=new Set(),raf=0;
 const apply=(el,base,sp)=>{const t=Math.round(Math.max(base*sp.k,sp.fl)*10)/10;if(Math.abs(t-base)>.4)el.style.setProperty('font-size',t+'px','important');else el.style.removeProperty('font-size');};
 const run=()=>{raf=0;const sp=spec(),els=[];for(const root of queue){if(!root.isConnected)continue;els.push(root);root.querySelectorAll&&els.push(...root.querySelectorAll('*'));}queue=new Set();
  const todo=[];for(const el of els){if(el.nodeType!==1||el.dataset.fs0||el.matches?.(SKIP))continue;let own=false;for(const n of el.childNodes)if(n.nodeType===3&&n.nodeValue.trim()){own=true;break;}if(own)todo.push([el,parseFloat(getComputedStyle(el).fontSize)]);}
  for(const[el,b]of todo)if(b){el.dataset.fs0=b;apply(el,b,sp);}};
 const add=n=>{if(n.nodeType!==1)return;const host=n.closest?.('#mbody,#ovl');if(!host)return;queue.add(n);if(!raf)raf=requestAnimationFrame(run);};
 const start=()=>{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)add(n);}).observe(document.body,{childList:true,subtree:true});for(const id of['mbody','ovl']){const h=document.getElementById(id);if(h)add(h);}
  let last=spec().k;addEventListener('resize',()=>{const sp=spec();if(sp.k===last)return;last=sp.k;document.querySelectorAll('[data-fs0]').forEach(el=>apply(el,parseFloat(el.dataset.fs0),sp));});};
 if(document.body)start();else addEventListener('DOMContentLoaded',start);
})();
(function(){const st=document.createElement('style');st.textContent=`body.d:not(:has(>header)){grid-template-areas:"st rt"!important;grid-template-rows:minmax(0,1fr)!important}`;document.head.appendChild(st)})();
/* 手機版：面板上方的把手，可上下自由拖到任何高度，放手即固定；輕點則回到自動大小。 */
(function(){const st=document.createElement('style');st.textContent=`#panel-grip{display:none}body.m #panel-grip{display:flex;align-items:center;justify-content:center;height:26px;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}#panel-grip i{display:block;width:56px;height:6px;background:#7990ac;box-shadow:0 1px #fff}`;document.head.appendChild(st);
 const mount=()=>{const m=document.querySelector('#modal>.mbox');if(!m||m.querySelector('#panel-grip'))return;const g=document.createElement('div');g.id='panel-grip';g.setAttribute('role','separator');g.setAttribute('aria-label','拖曳調整戰鬥畫面高度，輕點恢復自動');g.innerHTML='<i></i>';
  let y0=null,h0=0,moved=false,prev=null;const save=()=>{try{CUSTOM_H.v==null?localStorage.removeItem('ih-custh'):localStorage.setItem('ih-custh',String(Math.round(CUSTOM_H.v)));}catch(e){}};
  g.addEventListener('pointerdown',e=>{y0=e.clientY;moved=false;prev=CUSTOM_H.v;h0=(document.getElementById('fig')?.getBoundingClientRect().height||200)-uiHudPad();g.setPointerCapture?.(e.pointerId);});
  g.addEventListener('pointermove',e=>{if(y0==null)return;const dy=e.clientY-y0;if(Math.abs(dy)>6)moved=true;if(!moved)return;const vh=visualViewport?.height||innerHeight,was=uiBattleSize(),v=Math.max(30,Math.min(h0+dy,vh*.62));CUSTOM_H.v=v;AUTO_FOLD.on=false;if(uiBattleSize()!==was)uiTitle();else uiSyncBattleFrame();});
  g.addEventListener('pointerup',()=>{if(y0==null)return;y0=null;if(moved){const vh=visualViewport?.height||innerHeight;if(CUSTOM_H.v>=vh*.62-8&&typeof viewEnterWatch==='function'){CUSTOM_H.v=prev!=null&&prev<vh*.62-8?prev:null;save();uiTitle();setTimeout(()=>{if(!viewEnterWatch())uxAnnounce('請先完成目前的操作，再進入觀戰。');},80);return;}save();uiTitle();}else{CUSTOM_H.v=null;save();AUTO_FOLD.on=false;uiTitle();}});
  g.addEventListener('pointercancel',()=>{y0=null;});m.insertBefore(g,m.firstChild);};
 const go=()=>{mount();new MutationObserver(mount).observe(document.getElementById('modal')||document.body,{childList:true,subtree:true});};
 if(document.getElementById('modal'))go();else addEventListener('DOMContentLoaded',go);})();
/* 手機版：面板內容往下捲時自動收起戰鬥畫面讓面板變大，捲回頂部時自動恢復；手動選過戰鬥畫面大小就不再自動切換。 */
(function(){document.addEventListener('scroll',e=>{const t=e.target;if(!t||t.id!=='mbody'||!document.body.classList.contains('m')||G.userCz||document.body.classList.contains('watch-mode'))return;
 const st=t.scrollTop,dir=st-AUTO_FOLD.last;AUTO_FOLD.last=st;const now=performance.now();
 if(!AUTO_FOLD.on&&dir>0&&st>90&&t.scrollHeight-t.clientHeight>340){AUTO_FOLD.on=true;AUTO_FOLD.t=now;mobTitle();}
 else if(AUTO_FOLD.on&&dir<0&&st<8&&now-AUTO_FOLD.t>600){AUTO_FOLD.on=false;mobTitle();}},true);})();
(function(){const st=document.createElement('style');st.textContent=`.goal-list{display:flex;flex-direction:column;gap:8px;margin:8px 0}.goal-card{padding:10px;background:linear-gradient(#f2f5fc,#dfe6f4);border:1px solid #9fb2cc;box-shadow:inset 0 -3px #c3d0e2}.goal-head{display:flex;align-items:center;gap:8px}.goal-head b{flex:1;font-size:15px;font-weight:400;color:#1b3358}.goal-head strong{font-size:24px;font-weight:400;color:#1b3358}.goal-head small{font-size:12px;color:var(--ux-muted)}.goal-track{position:relative;display:block;height:8px;margin:10px 4px 8px;background:#263b59;box-shadow:inset 0 0 0 2px #172b47}.goal-track u{position:absolute;left:0;top:0;height:100%;background:linear-gradient(90deg,#4fb7a8,#9fe6d4)}.goal-track s{position:absolute;top:-3px;width:4px;height:14px;margin-left:-2px;background:#7990ac}.goal-track s.ok{background:#9fe6d4}.goal-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}.goal-steps li{display:flex;align-items:center;gap:8px;min-height:30px;font-size:13px;color:#44526e}.goal-steps li span{width:14px;text-align:center}.goal-steps li b{min-width:44px;font-weight:400;color:#1b3358}.goal-steps li em{flex:1;font-style:normal;min-width:0}.goal-steps li.ok{opacity:.55}.goal-steps li.next{color:#1b3358}.goal-steps .task-go{min-width:44px;min-height:34px;padding:0 10px}`;document.head.appendChild(st)})();

/* 彈窗內容比畫面長時，底部顯示「更多」提示，捲到底就消失。 */
(function(){const st=document.createElement('style');st.textContent=`#ovl>.mbox>.scroll-hint{position:sticky;bottom:0;display:none;justify-content:center;pointer-events:none;height:0;overflow:visible;z-index:5}#ovl>.mbox>.scroll-hint.on{display:flex}#ovl>.mbox>.scroll-hint i{position:absolute;bottom:6px;font-style:normal;font-size:13px;line-height:1;padding:5px 12px;background:#2f3b86;color:#fff;border:1px solid #e8eeff;box-shadow:1px 1px #141c4e;animation:hint-bob 1.1s steps(2,end) infinite}@keyframes hint-bob{50%{transform:translateY(3px)}}@media(prefers-reduced-motion:reduce){#ovl>.mbox>.scroll-hint i{animation:none}}`;document.head.appendChild(st);
 const upd=m=>{let h=m.querySelector(':scope>.scroll-hint');if(!h){h=document.createElement('div');h.className='scroll-hint';h.setAttribute('aria-hidden','true');h.innerHTML='<i>▼ 更多</i>';m.appendChild(h);}h.on=0;h.classList.toggle('on',m.scrollHeight-m.clientHeight>12&&m.scrollHeight-m.clientHeight-m.scrollTop>12);};
 let raf=0;const run=()=>{raf=0;const m=document.querySelector('#ovl>.mbox');if(m&&!document.body.classList.contains('intro-active')){if(!m._hint){m._hint=1;m.addEventListener('scroll',()=>upd(m),{passive:true});}upd(m);}};
 const go=()=>{const o=document.getElementById('ovl');if(!o)return;new MutationObserver(()=>{if(!raf)raf=requestAnimationFrame(run);}).observe(o,{childList:true,subtree:true});addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(run);});};
 if(document.getElementById('ovl'))go();else addEventListener('DOMContentLoaded',go);})();
/* 手機連點兩下不再放大整個畫面。 */
(function(){const st=document.createElement('style');st.textContent='html,body,body *{touch-action:manipulation}';document.head.appendChild(st);})();

/* 外觀頁：上方為部位分頁，下方為該部位的款式，兩者外觀要分得開。 */
(function(){const st=document.createElement('style');st.textContent=`body #mbody .cv-wardrobe .dcats>.mb{white-space:nowrap;padding:0 2px!important;font-size:13px!important}body #mbody .cv-wardrobe .dcats{gap:0;margin:10px 0 0;border-bottom:3px solid #2f3b86}body.ui-material #mbody .cv-wardrobe .dcats>.mb{flex:1;min-height:40px;border-radius:6px 6px 0 0!important;border-bottom:0!important;margin:0 2px -3px 0;box-shadow:none!important;background:#c9d1e6!important;color:#3a4569!important}body.ui-material #mbody .cv-wardrobe .dcats>.mb[aria-pressed="true"]{background:#2f3b86!important;color:#fff!important;font-weight:700}#mbody .cv-wardrobe .cv-style-title{display:flex;justify-content:space-between;align-items:baseline;margin:10px 0 6px;padding:0 2px;font-size:15px;color:var(--ux-ink)}#mbody .cv-wardrobe .cv-style-title small{font-size:12px;opacity:.7}html body.ui-material #mbody .device-wardrobe .cv-wardrobe button.cv-style[aria-pressed="true"]{background:#fff4d6!important;color:#2a2f55!important;outline:3px solid #e0a02a;outline-offset:-3px}html body.ui-material #mbody .device-wardrobe .cv-wardrobe button.cv-style[aria-pressed="true"] span{color:#2a2f55!important;background:transparent!important}html body.ui-material #mbody .device-wardrobe .cv-wardrobe button.cv-style[aria-pressed="true"] small{color:#8a5a00!important;font-weight:700}`;document.head.appendChild(st);})();
/* 離線結算頁的 3D 低解像標誌。 */
(function(){const st=document.createElement('style');st.textContent='#ovl .return-logo{width:min(320px,100%);max-height:150px;margin:6px auto 12px}';document.head.appendChild(st);})();


;
/* 戰場讀數、像素圖集及全視窗觀戰。只保存本機呈現偏好，不改遊戲存檔。 */
const VIEW_KEY='idle-hero-view-v1', VIEW_ATLASES=Object.fromEntries(Object.entries(ART_SHEETS).map(([key,s])=>[key,[s.cols,s.rows]]));
const GAME_VIEW={prefs:{idle:60,pixels:true,glitch:true,uiFx:1,uiFxVersion:2,quality:'auto',hideBattle:false,shake:true,reducedEffects:false},atlases:{},ready:Promise.resolve(),watch:false,last:performance.now(),pointers:new Set(),swallow:new Set(),clickUntil:0,trigger:null,inert:new Map(),scroll:[],tab:null,initialized:false,pulseAt:-1000,pulseTimer:0};
const UI_FX_NAMES=['關閉','標準','強烈'];
const UI_FX_CSS=`
.view-fx-sample{display:flex;align-items:center;gap:14px;position:relative;min-height:68px;padding:10px;border:2px solid var(--ux-edge);background:#d0dcec;color:#172751;overflow:hidden}.view-fx-sample i{width:72px;height:18px;background:linear-gradient(90deg,#5086ae 75%,#172751 75%);border:2px solid #172751}.view-fx-sample b{font-weight:400;font-size:16px}.view-fx-sample::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#13264d66 0 var(--ui-lines,1px),transparent var(--ui-lines,1px) var(--ui-step,4px));opacity:var(--ui-grain,0)}body[data-ui-fx="2"] .view-fx-sample::after{background-image:repeating-linear-gradient(0deg,#13264d66 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,#13264d22 0 1px,transparent 1px 4px)}

:root{--ui-fx-cyan:#57efff;--ui-fx-magenta:#ff73be}
body[data-ui-fx="1"]{--ui-grain:.12;--ui-lines:1px;--ui-step:5px}
body[data-ui-fx="2"]{--ui-grain:.24;--ui-lines:1px;--ui-step:4px}

/* 色彩由材質與預先量化圖集提供；LCD 字模預先生成，不做整面 SVG 合成。 */
body.ui-pixelfx :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb),body.ui-pixelfx.ui-fx-document main>section{position:relative}
body.ui-pixelfx :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after,body.ui-pixelfx.ui-fx-document header::after{content:"";position:absolute;inset:0;z-index:40;pointer-events:none;opacity:var(--ui-grain);background-image:repeating-linear-gradient(0deg,#13264d50 0 var(--ui-lines,1px),transparent var(--ui-lines,1px) var(--ui-step,4px)),linear-gradient(90deg,transparent 8%,var(--ui-fx-cyan) 8% 29%,transparent 29% 62%,var(--ui-fx-magenta) 62% 77%,transparent 77%);background-size:100% 100%,100% 2px;background-position:0 var(--ui-band-top,0px),0 -10px;background-repeat:no-repeat;mix-blend-mode:multiply}
body.d #modal>.mbox{--ui-band-top:70px;--ui-band-height:52px}body.m #modal>.mbox{--ui-band-height:44px}#ovl>.mbox{--ui-band-height:26px}
body.pixel-icons .spr,body.pixel-icons .gem{image-rendering:pixelated!important}
body.ui-pixelfx.signal-fx.ui-fx-pulse :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after{animation:ui-signal-burst .32s steps(2,end) 1}
@keyframes ui-signal-burst{0%,100%{background-position:0 var(--ui-band-top,0px),0 -10px}22%{background-position:0 var(--ui-band-top,0px),0 calc(var(--ui-band-top,0px) + 8px)}48%{background-position:0 var(--ui-band-top,0px),0 calc(var(--ui-band-top,0px) + 28px)}75%{background-position:0 var(--ui-band-top,0px),0 calc(var(--ui-band-top,0px) + 18px)}}
.view-fx-control{margin:12px 0 16px}.view-fx-control>div:first-child{display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:700}.view-fx-control output{color:var(--ux-blue);background:#fff;border:1px solid var(--ux-edge);padding:1px 8px;min-width:52px;text-align:center;font-weight:400}
body #uisettings input#ui-fx-level{display:block;box-sizing:border-box;width:100%;min-width:0;height:44px;margin:0;padding:8px 0;border:0;accent-color:var(--ux-blue);cursor:pointer;touch-action:pan-y}.view-fx-ticks{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--ux-muted)}.view-fx-control p{font-size:12px;line-height:1.6;margin-bottom:0}
@media(prefers-reduced-motion:reduce){body.ui-pixelfx.signal-fx.ui-fx-pulse :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after{animation:none!important}}
@media(forced-colors:active){body.ui-pixelfx :where(#mbody,#mttl,#mtabs,#uisettings,#ovl>.mbox,#wiki .wkt,#wiki .wkn,#wiki .wkcontent,header,.tfoot,#nexthint,#ctxbtn,#loot,.battle-hud,#watch-return>span),body.ui-pixelfx.ui-fx-document :where(nav,main>section,#count,#empty){filter:none!important}body.ui-pixelfx :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after,body.ui-pixelfx.ui-fx-document :where(header,main>section)::after{display:none}}
`;
function viewFxDefs(){return ''; }
function viewFxSnapshot(){
  const level=GAME_VIEW.prefs.uiFx,pixels=GAME_VIEW.prefs.pixels;
  const fontCSS=[...document.querySelectorAll('style')].map(s=>s.textContent).find(css=>css.trim().startsWith('@font-face')&&css.includes('Cubic 11'))||'';
  const vars=pixels?Object.entries(GAME_VIEW.atlases).map(([k,v])=>`--pixel-${k}:url("${v}")`).join(';'):'';
  return {head:`<style>${fontCSS}:root{${vars}}${UI_FX_CSS}${UX_MATERIAL_CSS}</style>`,body:`class="ui-fx-document ui-material${level?' ui-pixelfx':''}${pixels?' pixel-icons':''}" data-ui-fx="${level}"`,defs:viewFxDefs()};
}
function viewFxPulse(){
  const now=performance.now();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){clearTimeout(GAME_VIEW.pulseTimer);document.body.classList.remove('ui-fx-pulse');return;}
  if(!document.body.classList.contains('signal-fx')||document.hidden||GAME_VIEW.watch||now-GAME_VIEW.pulseAt<700)return;
  GAME_VIEW.pulseAt=now;document.body.classList.add('ui-fx-pulse');clearTimeout(GAME_VIEW.pulseTimer);
  GAME_VIEW.pulseTimer=setTimeout(()=>document.body.classList.remove('ui-fx-pulse'),340);
}
function viewSavePrefs(){try{localStorage.setItem(VIEW_KEY,JSON.stringify(GAME_VIEW.prefs));}catch(_){/* 儲存受限時保留本次設定。 */}}
function viewApplyPrefs(){
  const motion=GAME_VIEW.prefs.uiFx>0&&GAME_VIEW.prefs.glitch&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.toggle('signal-fx',motion);
  document.body.classList.toggle('ui-pixelfx',GAME_VIEW.prefs.uiFx>0);document.body.dataset.uiFx=GAME_VIEW.prefs.uiFx;
  if(!GAME_VIEW.prefs.glitch||GAME_VIEW.prefs.reducedEffects||matchMedia('(prefers-reduced-motion: reduce)').matches){FXO.shake=0;FXO.flash=0;FXO.punch=0;FXO.stop=0;}
  if(!motion){clearTimeout(GAME_VIEW.pulseTimer);document.body.classList.remove('ui-fx-pulse');}
  const range=$('ui-fx-level'),name=$('ui-fx-name');if(range){range.value=GAME_VIEW.prefs.uiFx;range.setAttribute('aria-valuetext',UI_FX_NAMES[GAME_VIEW.prefs.uiFx]);}if(name)name.textContent=UI_FX_NAMES[GAME_VIEW.prefs.uiFx];
  document.querySelectorAll('[data-view-quality]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.viewQuality===GAME_VIEW.prefs.quality)));
  const qualityLabel=$('view-quality-summary');if(qualityLabel)qualityLabel.textContent='目前：'+({low:'低',medium:'中',high:'高'}[r3Quality(GAME_VIEW.prefs.quality,innerWidth)])+(GAME_VIEW.prefs.quality==='auto'?'（依裝置自動）':'');
  document.body.classList.toggle('pixel-icons',GAME_VIEW.prefs.pixels);
  for(const key of Object.keys(VIEW_ATLASES)){
    if(GAME_VIEW.prefs.pixels&&GAME_VIEW.atlases[key])document.documentElement.style.setProperty('--pixel-'+key,`url("${GAME_VIEW.atlases[key]}")`);
    else document.documentElement.style.removeProperty('--pixel-'+key);
  }
  document.querySelectorAll('[data-view-idle]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.viewIdle===GAME_VIEW.prefs.idle)));
  document.querySelectorAll('[data-view-setting]').forEach(b=>{const on=GAME_VIEW.prefs[b.dataset.viewSetting];b.setAttribute('aria-pressed',String(on));b.textContent=b.dataset.viewSetting==='pixels'?(on?'像素圖示':'原始圖示'):b.dataset.viewSetting==='hideBattle'?(on?'戰鬥畫面：隱藏':'戰鬥畫面：顯示'):(on?'動態衝擊：開':'動態衝擊：關');});
  document.body.classList.toggle('battle-off',!GAME_VIEW.watch&&!!GAME_VIEW.prefs.hideBattle);document.body.classList.toggle('reduced-effects',!!GAME_VIEW.prefs.reducedEffects);if(typeof audSyncBattle==='function')audSyncBattle(!GAME_VIEW.watch&&(GAME_VIEW.prefs.hideBattle||document.body.classList.contains('battle-fold')));if(GAME_VIEW.prefs.shake===false){FXO.shake=0;FXO.punch=0;}if(typeof uiTitle==='function'&&GAME_VIEW.initialized)uiTitle();if(typeof guidanceViewSettings==='function')guidanceViewSettings();
}
function viewPreparePixels(){
  // 原圖保持不變。以每格 24 邏輯像素取樣，所有尺寸共用同一份圖集。
  return Promise.allSettled(Object.entries(VIEW_ATLASES).map(async([key,[cols,rows]])=>{
    if(!ASSET[key])return;
    const img=new Image();img.src=ASSET[key];await img.decode();
    const canvas=document.createElement('canvas');canvas.width=cols*24;canvas.height=rows*24;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      if(pixels.data[i+3]<32){pixels.data[i+3]=0;continue;}
      for(let c=0;c<3;c++)pixels.data[i+c]=Math.round(pixels.data[i+c]/17)*17;
    }
    ctx.putImageData(pixels,0,0);GAME_VIEW.atlases[key]=canvas.toDataURL('image/png');
  })).then(()=>{viewApplyPrefs();});
}
function viewRenderHUD(){
  if(!GAME_VIEW.hud)return;
  const hp=Math.max(0,Math.round(G.h.hp)),max=Math.max(1,Math.round(G.st.life)),need=Math.max(1,xpNeed(G.lvl)),xp=Math.max(0,Math.floor(G.xp));
  const hpRatio=tClamp(hp/max),xpRatio=tClamp(xp/need),R=G.run;
  const values={level:G.lvl,hp:`${tFmt(hp)} / ${tFmt(max)}`,gold:tFmt(G.gold),dps:tFmt(G.st.dps),progress:`${R?(R.tower?'塔 '+R.floor+' 層':'地圖 '+lvlNow()):'深度 '+lvlNow()} · 擊殺 ${Math.min(R?R.kills:G.kills,R?R.need:G.need)}／${R?R.need:G.need}${G.h.dead>0?' · 復活中':G.mons.some(m=>m.boss&&!m.dead)?' · BOSS':''}`};
  for(const [key,value] of Object.entries(values))if(GAME_VIEW.fields[key].textContent!==String(value))GAME_VIEW.fields[key].textContent=value;
  const hpBar=GAME_VIEW.fields.hpbar,xpBar=GAME_VIEW.fields.xpbar;
  const setBar=(el,ratio,now,max)=>{const percent=String(Math.round(ratio*100)),pixel=Math.ceil(ratio*50)*2+'%';if(el.getAttribute('aria-valuenow')!==percent){el.setAttribute('aria-valuenow',percent);el.style.setProperty('--fill',percent+'%');}if(el.style.getPropertyValue('--pixel-fill')!==pixel)el.style.setProperty('--pixel-fill',pixel);const text=`${now}／${max}`;if(el.getAttribute('aria-valuetext')!==text)el.setAttribute('aria-valuetext',text);};
  setBar(hpBar,hpRatio,hp,max);setBar(xpBar,xpRatio,xp,need);
  GAME_VIEW.hud.classList.toggle('hud-danger',hpRatio<.3&&G.h.dead<=0);GAME_VIEW.hud.classList.toggle('hud-dead',G.h.dead>0);
  if(typeof deathFxUpdate==='function')deathFxUpdate();
}
function viewBlocked(){
  const active=document.activeElement;
  return !!(G.tutorial?.active&&!G.tutorial.done)||document.hidden||(typeof PH!=='undefined'&&PH.open)||G.offline||BOSS.on||UX_LAYERS.length>0||!!held||!!drag||GAME_VIEW.pointers.size>0||(GAME_FEATURES.cardChoices&&!G.deferChoices&&(G.picks>0||G.relicPicks>0))||
    !!active?.closest('input,textarea,select,[contenteditable="true"]')||!!document.querySelector('.stepwrap.open');
}
function viewEnterWatch(){
  if(GAME_VIEW.watch||viewBlocked())return false;
  GAME_VIEW.trigger=uxFocusToken();GAME_VIEW.scroll=[...document.querySelectorAll('#mbody,#uisettings')].map(el=>[el,el.scrollTop]);GAME_VIEW.pageScroll=[scrollX,scrollY];
  GAME_VIEW.watch=true;document.body.classList.add('watch-mode');viewApplyPrefs();
  // 與共用 dialog 的 inert 分開持有；開啟 dialog 前一定先離開觀戰。
  for(const el of document.body.children)if(el!==document.querySelector('.stage')&&el.id!=='watch-return'&&!['SCRIPT','STYLE','CANVAS'].includes(el.tagName)&&el.id!=='fxo'&&el.id!=='uxstatus'){
    GAME_VIEW.inert.set(el,el.inert);el.inert=true;
  }
  uiSyncBattleFrame();$('watch-return').hidden=false;$('watch-return').focus({preventScroll:true});viewRenderHUD();
  uxAnnounce('已進入觀戰。點一下或按 Escape 返回操作台。');return true;
}
function viewExitWatch(){
  GAME_VIEW.last=performance.now();if(!GAME_VIEW.watch)return false;
  GAME_VIEW.watch=false;document.body.classList.remove('watch-mode');viewApplyPrefs();uiSyncBattleFrame();$('watch-return').hidden=true;
  for(const [el,inert] of GAME_VIEW.inert)el.inert=inert;GAME_VIEW.inert.clear();
  // 布局恢復後才還原捲動與焦點；不重建面板或輸入欄位。
  for(const [el,top] of GAME_VIEW.scroll)el.scrollTop=top;
  if(GAME_VIEW.pageScroll)scrollTo(...GAME_VIEW.pageScroll);uxRestoreFocus(GAME_VIEW.trigger);return true;
}
function viewTick(now=performance.now()){
  if(!GAME_VIEW.initialized)return;
  viewRenderHUD();
  if(viewBlocked()){GAME_VIEW.last=now;if(GAME_VIEW.watch)viewExitWatch();return;}
  if(!GAME_VIEW.watch&&!GAME_VIEW.prefs.hideBattle&&GAME_VIEW.prefs.idle>0&&now-GAME_VIEW.last>=GAME_VIEW.prefs.idle*1000)viewEnterWatch();
  if(GAME_VIEW.tab!==modalTab){GAME_VIEW.tab=modalTab;viewFxPulse();}
}
function viewRestorePrefs(prefs){
 if(!prefs||typeof prefs!=='object')return;
 GAME_VIEW.prefs.quality=['auto','low','medium','high'].includes(prefs.quality)?prefs.quality:'auto';
 if([0,30,60,120].includes(prefs.idle))GAME_VIEW.prefs.idle=prefs.idle;
 GAME_VIEW.prefs.hideBattle=prefs.hideBattle===true;
 if([0,1,2,3].includes(prefs.uiFx))GAME_VIEW.prefs.uiFx=prefs.uiFxVersion===2?Math.min(2,prefs.uiFx):prefs.uiFx===0?0:prefs.uiFx===3?2:1;GAME_VIEW.prefs.uiFxVersion=2;
 for(const k of ['pixels','glitch','shake','reducedEffects'])if(typeof prefs[k]==='boolean')GAME_VIEW.prefs[k]=prefs[k];
}
function viewInit(){
  try{viewRestorePrefs(JSON.parse(localStorage.getItem(VIEW_KEY)));}catch(_){}
  document.body.insertAdjacentHTML('beforeend',viewFxDefs());
  const style=document.createElement('style');style.id='viewstyles';style.textContent=VIEW_CSS+UI_FX_CSS+UX_MATERIAL_CSS;document.body.classList.add('ui-material');document.head.appendChild(style);
  const hud=$('stats');hud.className='stats battle-hud';hud.setAttribute('role','group');hud.setAttribute('aria-label','戰場狀態');
  hud.innerHTML='<div class="hud-left"><div class="hud-level" data-tip="角色等級；討伐魔物入手經驗"><span>LV</span><b data-hud="level"></b></div><div class="hud-vitals"><div class="hud-healthline"><span>HP</span><b data-hud="hp"></b></div><div class="hud-meter hud-hp" data-hud="hpbar" role="progressbar" aria-label="生命" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="hud-meter hud-xp" data-hud="xpbar" role="progressbar" aria-label="經驗" aria-valuemin="0" aria-valuemax="100"><span>XP</span><i></i></div></div><div class="hud-progress" data-hud="progress"></div></div><div class="hud-right"><div data-tip="金幣：升級天賦、洗點與購買用"><span>G</span><b data-hud="gold"></b></div><div data-tip="DPS（DPS），實戰會因範圍與連動不同"><span>DPS</span><b data-hud="dps"></b></div></div>';
  GAME_VIEW.hud=hud;GAME_VIEW.fields=Object.fromEntries([...hud.querySelectorAll('[data-hud]')].map(el=>[el.dataset.hud,el]));ui.drawStats=viewRenderHUD;
  const back=document.createElement('button');back.id='watch-return';back.type='button';back.hidden=true;back.setAttribute('aria-label','返回操作台');back.innerHTML='<span><i aria-hidden="true"></i>觀戰中 · 點一下返回<span class="watch-key"> ／ Esc</span></span>';back.onclick=()=>viewExitWatch();document.body.appendChild(back);
  const settings=document.createElement('section');settings.className='view-settings';settings.setAttribute('aria-label','畫面與觀戰');settings.innerHTML='<h3>畫面與觀戰</h3><div class="ui-setting-grid"><div class="view-options" role="group" aria-label="圖示與動態效果"><button type="button" data-view-setting="hideBattle" data-tip="隱藏 3D 戰鬥畫面並停止繪製，戰鬥與收益照常進行；電腦較慢或長時間掛機時可省電"></button><button type="button" data-view-setting="pixels"></button><button type="button" data-view-setting="glitch"></button></div><div class="ui-setting-block"><h4>自動觀戰</h4><div class="view-options" role="group" aria-label="自動觀戰等待時間">'+[[0,'關閉'],[30,'30 秒'],[60,'60 秒'],[120,'2 分鐘']].map(([s,t])=>`<button type="button" data-view-idle="${s}">${t}</button>`).join('')+'</div></div><button type="button" id="watch-now">立即觀戰 ↗</button></div><details class="ui-rules"><summary>畫面與觀戰說明</summary><p>像素質感套用整個操作介面。震動、衝擊與訊號可獨立關閉；系統減少動態效果時會停用動畫。觀戰填滿遊戲視窗，點一下或按 Esc 返回；編輯、拖曳及選獎勵時不自動切換。</p></details>';
  $('uisettings').append(settings);
  const quality=document.createElement('section');quality.className='ui-setting-block view-quality';quality.innerHTML='<h4>3D 畫質</h4><div class="view-options" role="group" aria-label="3D 畫質">'+[['auto','自動'],['low','低'],['medium','中'],['high','高']].map(([key,label])=>`<button type="button" data-view-quality="${key}" aria-pressed="false">${label}</button>`).join('')+'</div><p id="view-quality-summary" class="uxmeta"></p><p class="uxmeta">自動：手機中畫質，桌機高畫質。只調整 3D 清晰度，像素字體保持不變。</p>';settings.querySelector('.ui-setting-grid').prepend(quality);
  const control=document.createElement('div');control.className='view-fx-control ui-setting-block';control.innerHTML='<div><label for="ui-fx-level">介面像素質感</label><output for="ui-fx-level" id="ui-fx-name"></output></div><div class="view-fx-sample" aria-hidden="true"><span>像素訊號</span><i></i><b>24 / 48</b></div><input id="ui-fx-level" type="range" min="0" max="2" step="1" aria-describedby="ui-fx-help"><div class="view-fx-ticks" aria-hidden="true"><span>關閉</span><span>標準</span><span>強烈</span></div><p id="ui-fx-help" class="uxsr">即時預覽紋理密度及深度。關閉時保留像素字體，標準為疏線，強烈為細網格；不降低文字可讀性。</p>';
  settings.querySelector('.ui-setting-grid').prepend(control);
  control.addEventListener('input',()=>{GAME_VIEW.prefs.uiFx=+$('ui-fx-level').value;GAME_VIEW.last=performance.now();viewSavePrefs();viewApplyPrefs();viewFxPulse();});
  settings.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='watch-now'){if(!viewEnterWatch())uxAnnounce('請先完成目前的輸入、機件放置或選擇，再開始觀戰。');return;}if(b.dataset.viewQuality)GAME_VIEW.prefs.quality=b.dataset.viewQuality;else if(b.dataset.viewSetting)GAME_VIEW.prefs[b.dataset.viewSetting]=!GAME_VIEW.prefs[b.dataset.viewSetting];else if(b.dataset.viewIdle!==undefined)GAME_VIEW.prefs.idle=+b.dataset.viewIdle;GAME_VIEW.last=performance.now();viewSavePrefs();viewApplyPrefs();});
  addEventListener('resize',viewApplyPrefs);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',viewApplyPrefs);
  // capture 在世界及盤面輸入之前執行。首次點擊的 down/up/click 都被消耗。
  const eat=e=>{e.preventDefault();e.stopImmediatePropagation();};
  addEventListener('pointerdown',e=>{
    if(GAME_VIEW.watch){GAME_VIEW.swallow.add(e.pointerId);GAME_VIEW.clickUntil=performance.now()+1500;viewExitWatch();eat(e);return;}
    GAME_VIEW.clickUntil=0;GAME_VIEW.pointers.add(e.pointerId);GAME_VIEW.last=performance.now();
  },true);
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{
    GAME_VIEW.pointers.delete(e.pointerId);GAME_VIEW.last=performance.now();
    if(GAME_VIEW.swallow.delete(e.pointerId)){GAME_VIEW.clickUntil=performance.now()+(type==='pointerup'?600:0);eat(e);}
  },true);
  addEventListener('click',e=>{if(GAME_VIEW.clickUntil>performance.now()){GAME_VIEW.clickUntil=0;eat(e);return;}if(GAME_VIEW.watch){viewExitWatch();eat(e);return;}if(e.target.closest('button:not([disabled])'))viewFxPulse();},true);
  addEventListener('keydown',e=>{if(GAME_VIEW.watch&&!['Shift','Control','Alt','Meta'].includes(e.key)){viewExitWatch();eat(e);}GAME_VIEW.last=performance.now();},true);
  addEventListener('pointermove',()=>{if(!GAME_VIEW.watch)GAME_VIEW.last=performance.now();},{passive:true});
  addEventListener('wheel',e=>{if(GAME_VIEW.watch){viewExitWatch();eat(e);}GAME_VIEW.last=performance.now();},{capture:true,passive:false});
  addEventListener('blur',()=>{GAME_VIEW.pointers.clear();GAME_VIEW.swallow.clear();GAME_VIEW.clickUntil=0;GAME_VIEW.last=performance.now();});
  document.addEventListener('visibilitychange',()=>{GAME_VIEW.pointers.clear();GAME_VIEW.last=performance.now();});
  GAME_VIEW.initialized=true;GAME_VIEW.last=performance.now();viewApplyPrefs();viewRenderHUD();GAME_VIEW.ready=viewPreparePixels();
}
const VIEW_CSS=`
.world-travel{position:fixed;z-index:5;pointer-events:none;overflow:hidden;contain:paint}.world-travel[hidden]{display:none}.world-travel::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 10%,#a8bbd244 43%,#e6edf777 50%,#a8bbd244 57%,transparent 90%);transform:translateX(calc(-160% + var(--travel)*320%));opacity:calc(.65 - var(--travel)*.65)}.world-travel::after{content:"";position:absolute;inset:0;border-block:2px solid #a4b6ca;opacity:calc(.32 - var(--travel)*.32)}
@media(prefers-reduced-motion:reduce){.world-travel{display:none!important}}

/* Responsive pixel-text metrics also own the surrounding HUD geometry. */
body.ui-material .battle-hud .hud-level{height:48px}
body.ui-material .battle-hud .hud-level span{font-size:12px!important;line-height:18px}
body.ui-material .battle-hud .hud-level b{font-size:20px!important;line-height:28px}
@media(min-width:1180px){body.ui-material .battle-hud .hud-left{grid-template-columns:56px minmax(100px,260px);max-width:324px}body.ui-material .battle-hud .hud-level{height:58px}body.ui-material .battle-hud .hud-level span{font-size:16px!important;line-height:24px}body.ui-material .battle-hud .hud-level b{font-size:26px!important;line-height:34px}body.ui-material .battle-hud .hud-meter{height:22px}body.ui-material .battle-hud .hud-meter.hud-xp{height:14px}}
@media(min-width:1180px){body.ui-material .battle-hud .hud-left,body.ui-material .battle-hud .hud-right{zoom:1.45}body.ui-material .battle-hud .hud-left{max-width:324px}}
body.ui-material.m:not(.battle-fold) .stage{padding-top:0!important}body.ui-material:not(.battle-fold) .stage{padding-bottom:0!important}body.ui-material.m .stage #loot{top:80px!important}

/* 覆蓋原先 STATUS 櫃體。HUD 是世界上方的獨立讀數；共用色階不改變字形與位置。 */
.stage #stats.battle-hud{position:absolute!important;inset:8px 8px auto!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;pointer-events:none;z-index:6;color:#f6f9ff;font-family:"Cubic 11",monospace;text-align:left;text-shadow:1px 1px #151c38,-1px 0 #151c38,0 -1px #151c38;line-height:1.1}
.stage #stats.battle-hud::before,.stage #stats.battle-hud::after{display:none!important}
.battle-hud .hud-left{display:grid;grid-template-columns:48px minmax(90px,240px);gap:5px 8px;flex:1;min-width:0;max-width:296px}.battle-hud .hud-level{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1px;min-width:0;height:51px;border:2px solid #17203b;background:#192749e8;box-shadow:inset 2px 2px #536b9e,inset -2px -2px #0d152e,2px 2px #ffffff80}.hud-level span{font-size:12px;letter-spacing:.12em;color:#c3d2f4}.hud-level b{font-size:25px;color:#ffe68f;font-weight:400}
.battle-hud .hud-vitals{min-width:0}.hud-healthline{display:flex;justify-content:space-between;gap:4px;margin-bottom:3px;font-size:13px}.hud-healthline>span{color:#fff0f2}.hud-healthline>b{font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap}
.hud-meter{--fill:0%;position:relative;height:17px;box-sizing:border-box;border:2px solid #17203b;background:#18233de8;box-shadow:1px 1px #ffffff90,inset 0 1px #030b23;overflow:hidden}.hud-meter>i{display:block;width:var(--fill);height:100%;background:#eb526a;box-shadow:inset 0 2px #ffb5c7,inset 0 -2px #a22e58}.hud-meter.hud-xp{height:11px;margin-top:5px}.hud-xp>i{background:#efce68;box-shadow:inset 0 1px #fff3bf,inset 0 -1px #a38c3b}.hud-xp>span{position:absolute;left:3px;top:-1px;color:#fff7d7;font-size:8px;line-height:9px;text-shadow:1px 1px #17203b;z-index:1}
.hud-progress{grid-column:1/-1;justify-self:start;font-size:12px;color:#f1f6ff;white-space:nowrap;padding:2px 4px;background:#192749dc;text-shadow:1px 1px #151c38}.battle-hud .hud-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:80px;padding-top:1px}.hud-right>div{display:flex;justify-content:flex-end;align-items:baseline;gap:6px;white-space:nowrap;padding:2px 5px;background:#192749dc;text-shadow:1px 1px #151c38}.hud-right span{color:#d6e4ff;font-size:13px}.hud-right>div:first-child span{color:#ffe68f}.hud-right b{font-size:24px;font-weight:400;font-variant-numeric:tabular-nums}.battle-hud.hud-danger .hud-hp{outline:2px solid #ffcfdd}.battle-hud.hud-danger .hud-healthline>span{color:#ffd3df}.battle-hud.hud-dead .hud-hp{opacity:.6}
body.m:not(.battle-fold) .stage{padding-top:68px!important}body.m .stage #loot{top:76px!important}
.view-settings{padding:12px;margin-bottom:16px;border:1px solid var(--ux-edge);border-radius:4px;background:#edf3ff;color:var(--ux-ink);font:14px/1.55 system-ui,sans-serif}.view-settings h3{margin:0 0 6px;font:18px "Cubic 11",system-ui,sans-serif}.view-settings h4{margin:14px 0 6px;font-size:14px}.view-settings p{color:var(--ux-muted);margin:6px 0 10px}.view-options{display:flex;flex-wrap:wrap;gap:7px}.view-settings button{min-height:44px;padding:7px 12px;border:1px solid var(--ux-edge);border-radius:3px;background:#fff;color:var(--ux-ink);font:14px system-ui,sans-serif;box-shadow:0 2px #a9b9dd}body .view-settings button[aria-pressed="true"]{background:var(--ux-blue)!important;border-color:#2446a1!important;color:#fff!important;box-shadow:inset 0 1px #ffffff66,0 2px #203f87!important}body .view-settings #watch-now{margin-top:5px;background:#192749!important;color:#fff!important}.view-settings button:focus-visible,#watch-return:focus-visible{outline:3px solid #f5b851;outline-offset:3px}
body.watch-mode{display:block!important;position:relative!important;width:100%!important;height:100dvh!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
body.watch-mode>header,body.watch-mode>#modal,body.watch-mode>#readout,body.watch-mode>.rpg,body.watch-mode>.tfoot,body.watch-mode>footer,body.watch-mode::after{display:none!important}
body.watch-mode .stage{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important;margin:0!important;padding:0!important;min-height:0!important}
body.watch-mode #fig{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important}
body.watch-mode .stage #nexthint,body.watch-mode .stage #ctxbtn,body.watch-mode .stage #modtxt,body.watch-mode .stage #loot,body.watch-mode .stage .dlg{display:none!important}
body.watch-mode .stage #stats.battle-hud{inset:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) auto max(16px,env(safe-area-inset-left))!important}
#watch-return[hidden]{display:none!important}#watch-return{position:fixed;inset:0;z-index:25;width:100%;height:100%;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;cursor:pointer;touch-action:manipulation;transform:none!important}#watch-return>span{position:absolute;bottom:max(22px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);white-space:nowrap;padding:9px 13px;border:1px solid #a9c5f3;background:#192749e8;color:#f6f9ff;font:13px "Cubic 11",system-ui,sans-serif;box-shadow:2px 2px #17203b}#watch-return i{display:inline-block;width:6px;height:6px;background:#a2e5d0;margin-right:8px;box-shadow:2px 0 #5687a3}#watch-return:focus-visible{outline-offset:-5px}
@media(max-width:480px){.stage #stats.battle-hud{gap:8px!important}.battle-hud .hud-left{grid-template-columns:40px minmax(70px,1fr);gap:5px 6px;max-width:240px}.battle-hud .hud-level{height:48px}.hud-level b{font-size:23px}.hud-healthline{font-size:12px}.battle-hud .hud-right{min-width:65px;gap:8px}.hud-right b{font-size:20px}.hud-right span{font-size:11px}.hud-progress{font-size:11px}.watch-key{display:none}body.watch-mode .stage #stats.battle-hud{inset:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) auto max(10px,env(safe-area-inset-left))!important}}

`;

/* Decorative travel sweep; all narrative stays in the field journal. */
function worldTravelRender(){
 let el=document.getElementById('world-travel');
 if(!el){el=document.createElement('div');el.id='world-travel';el.className='world-travel';el.hidden=true;el.setAttribute('aria-hidden','true');document.body.appendChild(el);}
 const travel=WORLD_TRAVEL,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(travel.remaining<=0||reduced||!GAME_VIEW.prefs.glitch){el.hidden=true;return;}
 const rect=document.getElementById('fig')?.getBoundingClientRect();if(!rect)return;
 el.hidden=false;el.style.left=rect.left+'px';el.style.top=rect.top+'px';el.style.width=rect.width+'px';el.style.height=rect.height+'px';el.style.setProperty('--travel',String(1-travel.remaining/travel.duration));
}

;
/* 技能頁：接線板介面。邏輯在 00-grid.js；這裡負責畫面、點選、拖線與提示。
   狀態：selSock 目前選的插槽、held 手上的輔助配件、selPiece 選取的機件 id（都是暫存，不進存檔）。 */
let WIRE_UNDO = null, drag = null, WIRE_MOVE = null,WIRE_ZOOM=true;   // drag：拖線中的狀態，其他檔案用它判斷「正在操作盤面」
const WIRE_TAG_NAME = { proj:'投射物', area:'範圍', melee:'近戰', fire:'火焰', cold:'冰霜', light:'閃電' };
const WIRE_PRIORITY = ['HEAVY', 'CRITS', 'HASTE', 'COOL', 'CRYSTAL', 'TWIN', 'FOCUS', 'AREA', 'LEECH', 'FORK', 'RECOVER', 'DELAY'];
const wActive = i => G.board.pieces.find(p => p.kind === 'active' && GridLab.sockIndex(p,G.board) === i);
const wOpen = i => i >= 0 && i < GridLab.unlockedCount(G.board, G.lvl);
const wSupportAt = (x, y) => G.board.pieces.find(p => p.kind === 'support' && p.x === x && p.y === y);
const wName = p => p.kind === 'active' ? SKILLS[p.key].n : SUPPS[p.key].n;

function wireInstallStyles(){
  if (document.getElementById('wirestyles')) return;
  const st = document.createElement('style'); st.id = 'wirestyles'; st.textContent = WIRE_CSS; document.head.appendChild(st);
}
/* Grid size and endpoint count belong to the equipped circuit, never automatic configuration. */
const wTier = () => 3;
const WIRE_COLNAME = {r:'紅',b:'藍',g:'綠',y:'金',v:'紫',c:'青'};
const PORT_COLORS={r:'#ff6d60',b:'#528fff',g:'#58dc83',y:'#ffd34e',v:'#c793ff',c:'#4ce9ef'};
const WIRE_SHAPES=['▲','●','■','◆','✚','✦'];
function wireStatus(){
  const B = G.board, used = GridLab.wireLen(B), pads = B.wires.reduce((a, w) => a + w.cells.filter(c => GridLab.isPad(c[0], c[1],G.board)).length, 0), put = B.pieces.filter(p => p.kind === 'support' && GridLab.wireOf(B, p.x, p.y)).length;
  return `線 ${used} 格　線經過襯墊 ${pads}　已放配件 ${put}`;
}
function wireGemFlow(x, y, w, lit){   // 線穿過配件格時，在格內畫出隱約的虛線，接通時流動
  if (!w) return '';
  const L = GridLab.layout(G.board), i = w.cells.findIndex(c => c[0] === x && c[1] === y); if (i < 0) return '';
  const prev = i ? w.cells[i - 1] : L.srcs[w.sock], next = i < w.cells.length - 1 ? w.cells[i + 1] : (GridLab.connected(G.board, w.sock) ? L.socks[w.sock] : null);
  const m = n => `${.5 + (n[0] - x) / 2},${.5 + (n[1] - y) / 2}`, pts = [prev && m(prev), '.5,.5', next && m(next)].filter(Boolean).join(' ');
  return `<svg class="gflow${lit ? ' lit' : ''}" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function wireSvg(){
  const B = G.board, pt = (x, y) => `${(x + .5).toFixed(2)},${(y + .5).toFixed(2)}`;
  const liveSockets=new Set(GridLab.resolve(B,G.lvl).filter(r=>r.wired).map(r=>r.sock));let o = '', holes = '';
  for (const w of B.wires){
    if (!w.cells.length) continue;
    const done = GridLab.connected(B, w.sock), col = GridLab.layout(G.board).colors[w.sock], s = GridLab.layout(G.board).srcs[w.sock], k = GridLab.layout(G.board).socks[w.sock], pts = [pt(s[0], s[1]), ...w.cells.map(c => pt(c[0], c[1]))];
    if (done) pts.push(pt(k[0], k[1]));
    const p = pts.join(' '), sel = w.sock === selSock;
    for (const c of w.cells) if (wTier() > 1 && GridLab.isPad(c[0], c[1],G.board) && !wSupportAt(c[0], c[1])) holes += `<circle class="wk k${GridLab.padColor(c[0], c[1],G.board)}" cx="${c[0] + .5}" cy="${c[1] + .5}" r=".15"/>`;
    o += `<polyline class="wo" points="${p}"/><polyline style="stroke:${PORT_COLORS[col]}" class="wl c-${col} ${done ? 'done' : 'part'}${sel ? ' sel' : ''}" points="${p}"/><polyline class="wh" points="${p}"/>${liveSockets.has(w.sock)?`<polyline class="wire-current" points="${p}"/>`:""}${sel || !done ? `<polyline class="wf" points="${p}"/>` : ''}`;
  }
  return `<svg class="wsvg" viewBox="0 0 ${GridLab.layout(G.board).w} ${GridLab.layout(G.board).h}" preserveAspectRatio="none" aria-hidden="true">${o}${holes}</svg>`;
}
function wireStep(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), hasSkill = B.pieces.some(p => p.kind === 'active'), wired = res.some(r => r.wired), parts = res.some(r => r.linked.length);
  return !hasSkill ? 1 : !wired ? 2 : !parts ? 3 : 4;
}
function wireHints(){
  const B = G.board, step = wireStep(), h = new Set(), key = (x, y) => x + ',' + y;
  if (step === 1){ for (let i = 0; i < GridLab.layout(G.board).socks.length; i++) if (wOpen(i) && !wActive(i)){ h.add(key(...GridLab.layout(G.board).socks[i])); break; } }
  else if (step === 2){
    const a = B.pieces.filter(p => p.kind === 'active').map(p => GridLab.sockIndex(p,G.board)).filter(i => i >= 0 && !GridLab.connected(B, i)).sort((x, y) => (x === selSock ? -1 : y === selSock ? 1 : x - y))[0];
    if (a != null){ h.add(key(...GridLab.layout(G.board).srcs[a])); h.add(key(...GridLab.layout(G.board).socks[a])); }
  } else if (step === 3 && wTier() > 1){
    const a = B.pieces.filter(p => p.kind === 'active').map(p => GridLab.sockIndex(p,G.board)).find(i => i >= 0 && GridLab.connected(B, i));
    if (a != null){ const free = GridLab.getWire(B, a).cells.filter(c => GridLab.isPad(c[0], c[1],G.board) && !wSupportAt(c[0], c[1])), m = free.filter(c => GridLab.padColor(c[0], c[1],G.board) === GridLab.layout(G.board).colors[a]); (m.length ? m : free).slice(0, 3).forEach(c => h.add(key(c[0], c[1]))); }
  }
  return h;
}
function wireCell(x, y, ctx){
  const B = G.board, L = G.lvl, ev = `data-x="${x}" data-y="${y}" data-focus="cell-${x}-${y}" tabindex="${UX_GRID.x === x && UX_GRID.y === y ? 0 : -1}" title="${uxEsc(uxGridLabel(x,y))}" aria-label="${uxEsc(uxGridLabel(x, y))}" onfocus="uxGridFocus(this)" onclick="wireTap(${x},${y})" onpointerdown="wireDown(event,${x},${y})" onmouseenter="pzHover(${x},${y})"`;
  const W = GridLab.layout(G.board).w, H = GridLab.layout(G.board).h, edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
  if (edge){
    const si = GridLab.sockAt(x, y,G.board);
    if (si >= 0){
      const i = si, col = GridLab.layout(G.board).colors[i],portStyle=`style="--padc:${PORT_COLORS[col]}"`;
      if (!wOpen(i) && wTier() < 3) return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
      if (!wOpen(i)) return `<button type="button" class="pc lock k${col}" ${ev}><span>L${GridLab.layout(G.board).levels[i]}</span></button>`;
      const a = wActive(i), wired = GridLab.connected(B, i);
      if (!a) return `<button type="button" class="pc sk empty k${col}${selSock === i ? ' sel' : ''}" ${portStyle} ${ev}><span>終</span></button>`;
      return `<button type="button" class="pc fill sk chip k${col}${selSock === i ? ' sel' : ''}${wired ? ' lnk' : ' open'}" data-skill="${a.key}" ${portStyle} ${ev}>${sico(a.key,20)}<span class="port-word">終</span>${wired?'<i class="port-ok" aria-hidden="true"></i>':''}</button>`;
    }
    const ri = GridLab.layout(G.board).srcs.findIndex(s => s[0] === x && s[1] === y);
    if (ri >= 0 && !wOpen(ri) && wTier() < 3) return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
    if (ri >= 0) return `<button type="button" class="pc bus src s${GridLab.layout(G.board).colors[ri]}${wOpen(ri) ? '' : ' off'}${selSock === ri ? ' sel' : ''}" style="--padc:${PORT_COLORS[GridLab.layout(G.board).colors[ri]]}" ${ev}><span>起</span></button>`;
    return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
  }
  if (GridLab.isRock(x, y,G.board)) return `<button type="button" class="pc rk" ${ev}><span>✕</span></button>`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), pc = (wTier() === 1 && !s) ? '' : GridLab.padColor(x, y,G.board), match = !!(pc && w && GridLab.layout(G.board).colors[w.sock] === pc);
  if (s){
    const lk = ctx.linked.has(s.id), cls = ['pc', 'fill', 'ac', 'pd', 'p' + pc, lk ? 'lnk' : w ? 'off' : '', s.id === selPiece ? 'sel' : '', match ? 'mt' : '', (s.t || 1) > 1 ? 't' + s.t : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" style="--pc:${PORT_COLORS[GridLab.GEM_COLOR[s.key]]};--padc:${PORT_COLORS[GridLab.GEM_COLOR[s.key]]}" ${ev}>${wireGemFlow(x, y, w, lk)}${gemIco(s.key, 20)}<span>${SUPPS[s.key].n}${TIER_NAME[(s.t || 1) - 1]}</span></button>`;
  }
  return `<button type="button" class="pc${pc ? ' pd p' + pc : ''}${w ? ' wr' : ''}${match ? ' mt' : ''}" ${ev}>${pc ? `<span></span>` : ''}</button>`;
}
function wireBoardHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), ctx = { linked:new Set(res.flatMap(r => r.linked)) };
  let cells = '';
  const hint = wireHints();
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++){ const c = wireCell(x, y, ctx); cells += hint.has(x + ',' + y) ? c.replace('class="pc', 'class="pc hint') : c; }
  return `<div class="pz wb" role="group" aria-label="接線板，方向鍵移動，Enter 選取或放置" onmouseleave="pzHover(-1,-1)" style="--board-min:${B.w*48+20}px;grid-template-columns:repeat(${B.w},1fr)">${cells}${wireSvg()}</div>`;
}
function wireBar(){
 return `<div class="pzbar"><button class="mb" aria-label="上一步" data-tip="上一步" ${WIRE_HISTORY.index>0?'':'disabled'} onclick="wireHistoryStep(-1)"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 7 4 12l5 5M5 12h9a5 5 0 0 1 0 10h-3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -4)"/></svg><span>上一步</span></button><button class="mb" aria-label="下一步" data-tip="下一步" ${WIRE_HISTORY.index<WIRE_HISTORY.rows.length-1?'':'disabled'} onclick="wireHistoryStep(1)"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m15 7 5 5-5 5M19 12h-9a5 5 0 0 0 0 10h3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -4)"/></svg><span>下一步</span></button><button class="mb wreset" onclick="wireClearAll()" aria-label="全部清空，線與配件收回"><i></i>全部清空</button><span class="mute wstat">${wireStatus()}</span><span id="pzmsg" class="mute"></span></div>`;
}
function wireSelCard(){
  const B = G.board;
  if (held){ const S = SUPPS[held.key]; return `<section class="uxinspect wsel" aria-label="手上的配件"><div class="uxinspect-head">${gemIco(held.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(held.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">點接線板上的空格放置；線經過的格子才會生效。${GridLab.SUPPORTS[held.key].needs.length ? '適用：' + GridLab.SUPPORTS[held.key].needs.map(k => WIRE_TAG_NAME[k]).join('、') + '技能。' : ''}</div></section>`; }
  if (selSock >= 0){
    const a = wActive(selSock), done = GridLab.connected(B, selSock), w = GridLab.getWire(B, selSock), r = a && GridLab.resolve(B, G.lvl).find(q => q.id === a.id);
    const state = !a ? '空插槽：先選一個技能' : done ? `已接通，線長 ${w.cells.length} 格，生效配件 ${r ? r.linked.length : 0}，經過襯墊 ${w.cells.filter(c => GridLab.isPad(c[0], c[1],G.board)).length}` : w && w.cells.length ? `接線中，已走 ${w.cells.length} 格：繼續點線尾旁邊的格子，或拖曳畫線` : `尚未接線：從${WIRE_COLNAME[GridLab.layout(G.board).colors[selSock]]}色電源（⚡）開始，逐格點選相鄰格，或按住電源手動拖線`;
    return `<section class="uxinspect wsel" aria-label="選中的插槽"><div class="uxinspect-head">${a ? sico(a.key, 24) : ''}<b>插槽 ${selSock + 1}${a ? '　' + uxEsc(SKILLS[a.key].n) : ''}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${a ? uxEsc(SKILLS[a.key].d) : '選下面的技能裝上。'}</div><div class="uxmeta">${state}</div><div class="uxactions"><button class="mb" ${w ? '' : 'disabled'} onclick="wireClear()">清除接線</button><button class="mb" ${a ? '' : 'disabled'} onclick="wireUnassign()">卸下技能</button></div><button class="mb" onclick="playInventory('active')">${a?'更換技能':'選擇技能'}</button></section>`;
  }
  const p = B.pieces.find(q => q.id === selPiece && q.kind === 'support');
  if (p){
    const S = SUPPS[p.key], res = GridLab.resolve(B, G.lvl), r = res.find(q => q.linked.includes(p.id)), k = r ? r.linked.indexOf(p.id) : -1, wt = k >= 0 ? r.weights[k] : 0;
    const why = r ? `${SKILLS[r.key].n}${wt !== 1 ? `，強度 ×${wt.toFixed(2)}` : ''}` : res.some(q => q.missed.includes(p.id)) ? '技能標籤不符，不生效' : GridLab.wireOf(B, p.x, p.y) ? '這條線尚未接通' : '沒有線經過，尚未生效';
    const pcol = GridLab.padColor(p.x, p.y,G.board), bonus = pcol ? `　${WIRE_COLNAME[pcol]}色襯墊` : '';
    return `<section class="uxinspect wsel" aria-label="選中的配件"><div class="uxinspect-head">${gemIco(p.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(p.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">${uxEsc(why)}${bonus}</div><div class="uxactions"><button class="mb" onclick="wireTake(${p.id})">收回庫存</button></div></section>`;
  }
  const first = B.pieces.some(p => p.kind === 'active');
  return first ? '' : `<p class="uxgrid-help">點板邊的插槽（上面與右邊），選一個技能裝上。</p>`;
}

function wireNextUnlock(){return '取得不同電路板可增加可用格與終點。';}
function wireGuideHtml(){const n=GridLab.resolve(G.board,G.lvl).filter(r=>r.wired).length;return `<p class="device-wire-note">${n?'已接通 '+n+' 個技能。':'點起點選技能，或按住起點拖線。'}配件只可入同色洞，供電 ${GridLab.powerUsed(G.board)}／${GridLab.layout(G.board).power}。</p>`;}
function wireLegendHtml(){return '<p>起點 ⚡ → 相鄰電線 → 對應終點，完整接通才會亮燈及施放技能。紅、藍、綠寶石只可入同色洞；每技能最多三枚配件，Ⅰ／Ⅱ／Ⅲ耗電1／2／3。</p>';}
function wireZoom(){WIRE_ZOOM=!WIRE_ZOOM;renderModal();}
function wireTopHtml(){wireInstallStyles();return `<div data-scroll-key="wire-board" class="wire-board-scroll${WIRE_ZOOM?' zoomed':''}" tabindex="0" aria-label="電路板視窗，放大時可水平捲動">${wireBoardHtml()}</div>${wireBar()}`;}

/* ---------- 說明與可及性 ---------- */
function uxPieceDetails(){ return ''; }   // 選取詳情改放在接線板下方（wireSelCard）
function uxGridLabel(x, y){
  const B = G.board, pos = `第 ${y + 1} 列第 ${x + 1} 格`, W = GridLab.layout(G.board).w, H = GridLab.layout(G.board).h;
  if (x === 0 || y === 0 || x === W - 1 || y === H - 1){
    const i = GridLab.sockAt(x, y,G.board);
    if (i >= 0){ if (!wOpen(i)) return `${pos}，插槽 ${i + 1}，等級 ${GridLab.layout(G.board).levels[i]} 解鎖`; const a = wActive(i); return `${pos}，${WIRE_COLNAME[GridLab.layout(G.board).colors[i]]}色插槽 ${i + 1}，${a ? SKILLS[a.key].n + (GridLab.connected(B, i) ? '，已接通' : '，尚未接線') : '空'}`; }
    const r = GridLab.layout(G.board).srcs.findIndex(s => s[0] === x && s[1] === y);
    return r >= 0 ? `${pos}，${WIRE_COLNAME[GridLab.layout(G.board).colors[r]]}色電源，接插槽 ${r + 1}` : `${pos}，不能使用`;
  }
  if (GridLab.isRock(x, y,G.board)) return `${pos}，壞軌，不能放配件也不能走線`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), pc = GridLab.padColor(x, y,G.board);
  return `${pos}，${s ? SUPPS[s.key].n : pc ? '空襯墊' : '空格'}${w ? '，有線經過' : ''}${pc ? '，' + WIRE_COLNAME[pc] + '色襯墊' : ''}`;
}

/* ---------- 點選與動作 ---------- */
let noClick = false;   // 剛拖完線的那一下 click 要略過
function pzMsg(t){ renderModal(); const e = $('pzmsg'); if (e) e.textContent = t || ''; uxAnnounce(t || ''); }
function pzRot(){}      // 接線板沒有旋轉，保留給鍵盤 R 的舊綁定
function pzHold(kind, key, t = 1){
  if (noClick) return;
  UX_LAST_SOURCE = uxFocusToken(); held = held && held.key === key && (held.t || 1) === t ? null : { kind, key, t }; heldRot = 0; selPiece = null; selSock = -1;
  renderModal(); if (held) uiRevealSelection();if(kind==='active'&&held)skillPreview(key);
}
function pzDel(){ if (selPiece != null) wireTake(selPiece); }
function wireSelectSock(i){
  if (!wOpen(i)){ pzMsg(`插槽 ${i + 1} 要到等級 ${GridLab.layout(G.board).levels[i]} 才解鎖`); return; }
  held = null;
  if (selSock === i){ selSock = -1; selPiece = null; renderModal(); return; }
  selSock = i; const a = wActive(i); selPiece = a ? a.id : null; renderModal(); uiRevealSelection();
}
function wireExtend(x, y){
  const B = G.board; if (!wActive(selSock)){ pzMsg('先在下面選一個技能裝到這個插槽'); return; }
  const r = GridLab.extendTo(B, selSock, x, y, G.lvl);
  if (!r.ok){ pzMsg(r.reason); return; }
  if(r.connected){selSock=-1;selPiece=null;}recalc(); renderModal(); wireSnap(r.connected ? 'pick' : 'snap'); if (r.connected) uxAnnounce('已接通，目前預估 DPS ' + tFmt(G.st.dps));
}
function wirePlace(x, y){
  const B = G.board;
  if (!GridLab.isInner(x, y,G.board) || GridLab.isRock(x, y,G.board)){ pzMsg('這格不能放配件'); return; }
  if (!GridLab.isPad(x, y,G.board)){ pzMsg('配件只能放在色塊襯墊上'); return; }
  if(GridLab.padColor(x,y,G.board)!==GridLab.GEM_COLOR[held.key]){pzMsg('寶石顏色與洞不符，不能放置。');return;}
  if(GridLab.powerUsed(B)+GridLab.TIER_COST[(held.t||1)-1]>GridLab.layout(B).power){pzMsg('供電不足，移除配件或換用更高供電電路板。');return;}
  if (wSupportAt(x, y)){ pzMsg('這格已經有配件了'); return; }
  const before=JSON.stringify(B);const p = GridLab.place(B, 'support', held.key, x, y, 0, { t:held.t }); if (!p){ pzMsg('這裡放不下'); return; }
  WIRE_UNDO=before;const on = !!GridLab.wireOf(B, x, y); if (gemFreeT(held.key, held.t || 1) <= 0) held = null;
  recalc(); renderModal(); wireSnap('snap'); pzMsg(on ? '已放置，目前預估 DPS ' + tFmt(G.st.dps) : '已放置，但這格沒有線經過，尚未生效');
}
/* ---------- 點格子的選單：點終點選技能、點色塊選配件，一步完成 ---------- */
function wirePickClose(){ const e = document.getElementById('wpick'); if (e) e.remove(); }
function wirePickOpen(x, y, html){
  wirePickClose();
  const cell = document.querySelector(`.wb .pc[data-x="${x}"][data-y="${y}"]`); if (!cell) return;
  const d = document.createElement('div'); d.id = 'wpick'; d.className = 'wpick'; d.innerHTML = html; document.body.appendChild(d);
  const r = cell.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
  let left = Math.min(Math.max(6, r.left + r.width / 2 - w / 2), innerWidth - w - 6), top = r.bottom + 6;
  if (top + h > innerHeight - 6) top = Math.max(6, r.top - h - 6);
  d.style.left = left + 'px'; d.style.top = top + 'px';
}
function wirePickSock(i,atSource=false){
  if (!wOpen(i)){ pzMsg(`這個終點要到等級 ${GridLab.layout(G.board).levels[i]} 才解鎖`); return; }
  const a = wActive(i), col = WIRE_COLNAME[GridLab.layout(G.board).colors[i]];
  const items = Object.entries(SKILLS).filter(([id, K]) => skillAvailable(id)).map(([id, K]) => { const here = a && a.key === id, at = G.board.pieces.find(p => p.kind === 'active' && p.key === id); return `<button class="wpi${here ? ' on' : ''}" onclick="wirePickSkill(${i},'${id}')">${sico(id,26)}<b>${K.n}${playNewBadge('skills',id)}</b><small>${here?'已裝上':at?'換位到這裡':'點選裝上'}</small></button>`; }).join('');
  const [x, y] = (atSource?GridLab.layout(G.board).srcs:GridLab.layout(G.board).socks)[i];
  wirePickOpen(x, y, `<div class="wph">${col}色線路：選一個技能<button class="wpx" onclick="wirePickClose()" aria-label="關閉">✕</button></div><div class="wpg">${items}</div>${a ? `<button class="mb skill-preview-link" onclick="skillPreview('${a.key}')">攻擊預覽</button><button class="mb" onclick="wirePrepareMove(${a.id})">移動技能</button><button class="wpd" onclick="wirePickUnassign(${i})">卸下這個技能</button>` : ''}`);
}
function wirePickSkill(i, key){
  wirePickClose(); const keep = selSock; selSock = i; wireAssign(key);

  selSock = -1; selPiece = null; renderModal(); wireSnap('pick');pzMsg(`已裝上 ${SKILLS[key].n}。下一步：按住「起」拖到「終」接線。想看效果可點終點的「攻擊預覽」。`);
}
function wirePickUnassign(i){ wirePickClose(); const keep = selSock; selSock = i; wireUnassign(); selSock = -1; selPiece = null; renderModal(); }
function wirePickPad(x, y, w){
  const a = wActive(w.sock), col = WIRE_COLNAME[GridLab.padColor(x, y,G.board)], same = GridLab.padColor(x, y,G.board) === GridLab.layout(G.board).colors[w.sock];
  const items = [];
  const padCol=GridLab.padColor(x,y,G.board),left=GridLab.layout(G.board).power-GridLab.powerUsed(G.board);
  for (const k of Object.keys(SUPPS)) for (const t of [3, 2, 1]){ if (gemFreeT(k, t) <= 0) continue; const fit=a&&GridLab.fits(k,a),colOk=GridLab.GEM_COLOR[k]===padCol,pw=left>=GridLab.TIER_COST[t-1],ok=fit&&colOk&&pw,why=!a?'這條線尚未接技能':!fit?'此技能不適用':!colOk?'顏色不符，要放'+WIRE_COLNAME[GridLab.GEM_COLOR[k]]+'色塊':'供電不足';items.push([ok?0:1,`<button class="wpi${ok ? '' : ' no'}" ${ok ? '' : 'disabled'} onclick="wirePickGem(${x},${y},'${k}',${t})">${gemIco(k, 30)}<span class="wpt"><b>${SUPPS[k].n}${TIER_NAME[t - 1]}</b><small>${ok?uxEsc(SUPPS[k].d):why}</small></span><em>${ok?'×'+gemFreeT(k, t):''}</em></button>`]); }
  items.sort((u,v)=>u[0]-v[0]);const list=items.map(r=>r[1]);
  wirePickOpen(x, y, `<div class="wph">${col}色色塊洞 · 剩餘供電 ${GridLab.layout(G.board).power-GridLab.powerUsed(G.board)}：選配件<button class="wpx" onclick="wirePickClose()" aria-label="關閉">✕</button></div>${list.length ? `<div class="wpg wpl">${list.join('')}</div>` : '<p class="wpe">庫存沒有配件。打怪或到「打造」頁取得。</p>'}`);
}
function wirePickGem(x, y, key, t){ wirePickClose(); held = { kind:'support', key, t }; wirePlace(x, y); held = null; renderModal(); }
function wirePickPiece(x, y, p){
  selPiece=p.id;selSock=-1;
  const S = SUPPS[p.key];
  wirePickOpen(x, y, `<div class="wph">${uxEsc(S.n + TIER_NAME[(p.t || 1) - 1])}<button class="wpx" onclick="wirePickClose()" aria-label="關閉">✕</button></div><p class="wpe">${uxEsc(S.d)}</p><button class="mb" onclick="wirePrepareMove(${p.id})">移動配件</button><button class="wpd" onclick="wirePickTake(${p.id})">收回庫存</button>`);
}
function wirePickTake(id){ wirePickClose(); wireTake(id); }
document.addEventListener('pointerdown', e => { if (!e.target.closest || e.target.closest('#wpick') || e.target.closest('.wb')) return; wirePickClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape'){wirePickClose();if(WIRE_MOVE){WIRE_MOVE=null;uxAnnounce('已取消移動。');}if(drag)wireUp({type:'pointercancel'});} });
function wireTap(x, y){
  if (noClick) return;
  const B = G.board; UX_GRID.x = x; UX_GRID.y = y;
  if(WIRE_MOVE){const move=WIRE_MOVE;wireMovePiece(move.id,x,y,move.signature);return;}
  if (x === 0 || y === 0 || x === GridLab.layout(G.board).w - 1 || y === GridLab.layout(G.board).h - 1){ const i = GridLab.sockAt(x, y,G.board), r = GridLab.layout(G.board).srcs.findIndex(s => s[0] === x && s[1] === y); if (i >= 0) wirePickSock(i); else if(r>=0){selSock=r;selPiece=null;wirePickClose();renderModal();wirePickSock(r,true);} return; }
  wirePickClose();
  if (held){ wirePlace(x, y); return; }
  if(selSock>=0&&wActive(selSock)&&GridLab.isInner(x,y,G.board)){const w=GridLab.getWire(B,selSock);if(w?.cells.length&&w.cells.at(-1)[0]===x&&w.cells.at(-1)[1]===y){WIRE_UNDO=JSON.stringify(B);GridLab.shrink(B,selSock);recalc();renderModal();return;}wireExtend(x,y);return;}
  { const sp = wSupportAt(x, y), wr = GridLab.wireOf(B, x, y);
    if (sp){ wirePickPiece(x, y, sp); return; }
    if (wTier() > 1 && GridLab.isPad(x, y,G.board) && !GridLab.isRock(x, y,G.board)){ if (wr) wirePickPad(x, y, wr); else pzMsg('電線要經過這個色塊才能放配件：按住起點拖線經過它'); return; } }
  const w = selSock >= 0 ? GridLab.getWire(B, selSock) : null, s = wSupportAt(x, y);
  if (selSock >= 0){
    if (w && GridLab.wireOf(B, x, y) === w){
      const last = w.cells[w.cells.length - 1];
      if (last[0] === x && last[1] === y){ GridLab.shrink(B, selSock); recalc(); renderModal(); return; }
      if (s){ selPiece = s.id; selSock = -1; renderModal(); return; }
      pzMsg('點線尾可以收回一格，或按「清除接線」'); return;
    }
    wireExtend(x, y); return;
  }
  if (s){ selPiece = s.id; renderModal(); uiRevealSelection(); return; }
  const wo = GridLab.wireOf(B, x, y); if (wo){ wireSelectSock(wo.sock); return; }
  if (GridLab.isRock(x, y,G.board)) pzMsg('壞軌：不能放配件，線也不能經過');
}
function wireSnap(n){ if (typeof SFX === 'function') SFX(n); }
// 技能出手時，對應晶片的 LED 閃一下（只在接線板開著時才做）
function wireBlink(id){ const el = document.querySelector(`.wb .pc.chip[data-skill="${id}"]`); if (!el) return; el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink'); }
function wireClearAll(){ const B = G.board; if (!B.wires.length && !B.pieces.some(p => p.kind === 'support')) return; WIRE_UNDO = JSON.stringify(B); B.wires = []; B.pieces = B.pieces.filter(p => p.kind === 'active'); selSock = -1; selPiece = null; held = null; recalc(); renderModal(); wireSnap('snap'); uxAnnounce('已全部清空，配件回到庫存，可以按復原'); }
function wireTake(id){
  const p = G.board.pieces.find(q => q.id === id); if (!p || p.kind !== 'support') return;
  WIRE_UNDO=JSON.stringify(G.board);GridLab.remove(G.board, id); selPiece = null; recalc(); renderModal(); uxAnnounce('已收回庫存');
}
function wireClear(){ if (selSock < 0) return; WIRE_UNDO=JSON.stringify(G.board);GridLab.clearWire(G.board, selSock); recalc(); renderModal(); uxAnnounce('已清除這條線'); }
function wireAutoOne(){pzMsg('請手動逐格接線。');}

function wireUnassign(){
  const a = wActive(selSock); if (!a) return;
  WIRE_UNDO=JSON.stringify(G.board);GridLab.remove(G.board, a.id); selPiece = null; recalc(); renderModal(); uxAnnounce('已卸下技能，線保留');
}
function wireAssign(key){
  const B = G.board; if (!skillAvailable(key)) return;
  if(selSock<0||!wOpen(selSock)){pzMsg('先手動點選一個終點，再選技能。');return;}
  const cur = wActive(selSock), other = B.pieces.find(p => p.kind === 'active' && p.key === key);
  if (cur && cur.key === key) return;
  WIRE_UNDO=JSON.stringify(B);
  if (other && cur){ const k = cur.key, m = cur.mode; cur.key = key; cur.mode = other.mode; other.key = k; other.mode = m; if (!cur.mode) delete cur.mode; if (!other.mode) delete other.mode; }
  else if (other){ other.x = GridLab.layout(G.board).socks[selSock][0]; other.y = GridLab.layout(G.board).socks[selSock][1]; }
  else if (cur){ cur.key = key; delete cur.mode; }
  else GridLab.place(B, 'active', key, GridLab.layout(G.board).socks[selSock][0], GridLab.layout(G.board).socks[selSock][1], 0, { lvl:G.lvl });
  selPiece = wActive(selSock)?.id ?? null; recalc(); renderModal();
  const a = wActive(selSock); uxAnnounce(a && !GridLab.connected(B, selSock) ? `${SKILLS[key].n} 已裝上，但還沒接線` : `已裝上 ${SKILLS[key].n}，目前預估 DPS ${tFmt(G.st.dps)}`);
}
/* Compatibility entry points never configure a player board. */
function wireAuto(){pzMsg('請自行裝配機件及接線。');}

function wireUndo(){
  if(typeof wireHistoryStep==='function'){wireHistoryStep(-1);return;}
  if (!WIRE_UNDO) return;
  G.board = GridLab.adopt(JSON.parse(WIRE_UNDO), G.lvl); WIRE_UNDO = null; selSock = -1; selPiece = null; held = null; recalc(); renderModal(); uxAnnounce('已復原');
}

/* ---------- 拖曳畫線（滑鼠與觸控） ---------- */
function wireCellAt(px, py){ const e = document.elementFromPoint(px, py), c = e && e.closest && e.closest('.wb .pc[data-x]'); return c ? [+c.dataset.x, +c.dataset.y] : null; }
function wireCanMove(p,x,y){
 if(!p)return false;
 if(p.kind==='active'){const i=GridLab.sockAt(x,y,G.board);return wOpen(i);}
 return GridLab.isInner(x,y,G.board)&&!GridLab.isRock(x,y,G.board)&&GridLab.isPad(x,y,G.board)&&GridLab.padColor(x,y,G.board)===GridLab.GEM_COLOR[p.key];
}
function wireMovePiece(id,x,y,signature){
 const p=G.board.pieces.find(q=>q.id===id);
 if(!p||(signature&&JSON.stringify(p)!==signature)){WIRE_MOVE=null;pzMsg('機件已變動，請重新選取。');return false;}
 if(p.x===x&&p.y===y){WIRE_MOVE=null;uxAnnounce('位置沒有改變。');return false;}
 if(!wireCanMove(p,x,y)){pzMsg(p.kind==='active'?'技能只可移到已開放的終點。':'配件只可移到色塊位。');return false;}
 const target=G.board.pieces.find(q=>q.id!==id&&q.x===x&&q.y===y);
 if(target&&target.kind!==p.kind){pzMsg('這格不能交換，盤面沒有變更。');return false;}
 WIRE_UNDO=JSON.stringify(G.board);if(target){target.x=p.x;target.y=p.y;}p.x=x;p.y=y;WIRE_MOVE=null;held=null;selPiece=p.id;selSock=p.kind==='active'?GridLab.sockIndex(p,G.board):-1;wirePickClose();recalc();renderModal();uxAnnounce((target?'已交換':'已移動')+wName(p)+'；接線位置保留，可按復原。');return true;
}
function wirePrepareMove(id){const p=G.board.pieces.find(q=>q.id===id);if(!p)return;wirePickClose();WIRE_MOVE={id,signature:JSON.stringify(p)};selPiece=id;selSock=-1;uxAnnounce('已選取'+wName(p)+'，點選新的'+(p.kind==='active'?'終點':'色塊位')+'，或按 Escape 取消。');}
function wireRemovePiece(id,signature){const p=G.board.pieces.find(q=>q.id===id);if(!p||signature&&JSON.stringify(p)!==signature){uxAnnounce('機件已變動，未收回。');return false;}WIRE_UNDO=JSON.stringify(G.board);GridLab.remove(G.board,id);WIRE_MOVE=null;selPiece=null;selSock=-1;wirePickClose();recalc();renderModal();uxAnnounce('已收回'+wName(p)+'，沒有銷毀；可按復原。');return true;}
function wireRemoveSelected(){const id=WIRE_MOVE?.id??selPiece;if(id!=null)wireRemovePiece(id);else uxAnnounce('把機件拖出接線板邊框後放開可收回；也可點選後收回。');}
function wirePieceDragMove(ev){
 const d=drag;if(!d||d.piece==null||ev.pointerId!==d.pointer)return;
 if(!d.moved&&Math.hypot(ev.clientX-d.sx,ev.clientY-d.sy)<8)return;
 ev.preventDefault();
 if(!d.moved){d.moved=true;wirePickClose();const p=G.board.pieces.find(p=>p.id===d.piece);if(!p)return;const ghost=document.createElement('div');ghost.id='wire-ghost';ghost.setAttribute('aria-hidden','true');ghost.textContent=wName(p);document.body.appendChild(ghost);document.querySelector('.wb')?.classList.add('piece-dragging');uxAnnounce('正在移動'+wName(p)+'。');}
 const ghost=document.getElementById('wire-ghost');if(ghost){ghost.style.left=Math.min(innerWidth-170,Math.max(8,ev.clientX+12))+'px';ghost.style.top=Math.max(8,ev.clientY-42)+'px';}
 document.querySelectorAll('.wire-target,.wire-target-bad').forEach(e=>e.classList.remove('wire-target','wire-target-bad'));
 const hit=document.elementFromPoint(ev.clientX,ev.clientY),cell=hit?.closest('.wb .pc[data-x]'),p=G.board.pieces.find(p=>p.id===d.piece);if(cell)cell.classList.add(wireCanMove(p,+cell.dataset.x,+cell.dataset.y)?'wire-target':'wire-target-bad');document.querySelector('[data-wire-remove]')?.classList.toggle('drag-over',!!hit?.closest('[data-wire-remove]'));
}
addEventListener('blur',()=>{if(drag)wireUp({type:'pointercancel'});});
document.addEventListener('dragstart',e=>{if(e.target.closest?.('.wb,.ui-inventory-grid'))e.preventDefault();});
function wireDown(ev, x, y){
  if (ev.button > 0 || drag || held) return;
  const piece=G.board.pieces.find(p=>p.x===x&&p.y===y);
  if(piece&&!WIRE_MOVE){drag={piece:piece.id,signature:JSON.stringify(piece),sx:ev.clientX,sy:ev.clientY,moved:false,pointer:ev.pointerId};document.addEventListener('pointermove',wireMove,{passive:false});document.addEventListener('pointerup',wireUp);document.addEventListener('pointercancel',wireUp);return;}
  const si = GridLab.layout(G.board).srcs.findIndex(c => c[0] === x && c[1] === y);
  if (si >= 0 && wOpen(si)){   // 按住起點：選取此線，再逐格手動繪製
    drag = { sx:ev.clientX,sy:ev.clientY,px:ev.clientX,py:ev.clientY,pointer:ev.pointerId,moved:false,at:[x,y],src:si,before:JSON.stringify(G.board),undo:WIRE_UNDO };
    document.addEventListener('pointermove',wireMove,{passive:false}); document.addEventListener('pointerup', wireUp); document.addEventListener('pointercancel', wireUp);
    return;
  }
  if (selSock < 0 || !wActive(selSock)) return;
  const w = GridLab.getWire(G.board, selSock), last = w && w.cells[w.cells.length - 1];
  const st = GridLab.startOf(selSock,G.board), ok = (!w && x === st[0] && y === st[1]) || (last && last[0] === x && last[1] === y && !GridLab.connected(G.board, selSock));
  if (!ok) return;
  drag = { sx:ev.clientX,sy:ev.clientY,px:ev.clientX,py:ev.clientY,pointer:ev.pointerId,moved:false,at:[x,y],before:JSON.stringify(G.board),undo:WIRE_UNDO };
  document.addEventListener('pointermove',wireMove,{passive:false}); document.addEventListener('pointerup', wireUp); document.addEventListener('pointercancel', wireUp);
}
function wireMove(ev){
 const d=drag;if(!d||ev.pointerId!==d.pointer)return;
 if(d.piece!=null){wirePieceDragMove(ev);return;}
 if(!d.moved&&Math.hypot(ev.clientX-d.sx,ev.clientY-d.sy)<8)return;
 ev.preventDefault();
 if(!d.moved){WIRE_UNDO=d.before;d.moved=true;wirePickClose();const wb=document.body;try{wb.setPointerCapture(d.pointer);d.capture=wb;}catch(e){}}
 if(d.src!=null){selSock=d.src;selPiece=null;GridLab.clearWire(G.board,selSock);d.src=null;recalc();}
 const rect=document.querySelector('.wb')?.getBoundingClientRect(),step=Math.max(2,(rect?.width||300)/G.board.w/4),distance=Math.hypot(ev.clientX-d.px,ev.clientY-d.py),count=Math.min(512,Math.max(1,Math.ceil(distance/step)));
 let changed=false,done=false;
 for(let i=1;i<=count;i++){
  const c=wireCellAt(d.px+(ev.clientX-d.px)*i/count,d.py+(ev.clientY-d.py)*i/count);if(!c||c[0]===d.at[0]&&c[1]===d.at[1])continue;
  const w=GridLab.getWire(G.board,selSock);d.at=c;
  if(w?.cells.length>=2&&w.cells.at(-2)[0]===c[0]&&w.cells.at(-2)[1]===c[1]){GridLab.shrink(G.board,selSock);changed=true;continue;}
  if(!GridLab.isInner(...c,G.board))continue;
  const result=GridLab.extend(G.board,selSock,...c,G.lvl);if(result.ok){changed=true;if(result.connected){done=true;break;}}
 }
 d.px=ev.clientX;d.py=ev.clientY;
 if(changed){recalc();wireRedrawLive();}if(done)wireUp();else wireSchedulePan(d);
}
function wireSchedulePan(d){
 if(d.panFrame||drag!==d)return;const sc=document.querySelector('.wire-board-scroll'),body=$('mbody');if(!sc||!body)return;
 const r=sc.getBoundingClientRect(),v=body.getBoundingClientRect(),dx=d.px>r.right-28?10:d.px<r.left+28?-10:0,dy=d.py>v.bottom-28?10:d.py<v.top+28?-10:0;
 const horizontal=dx&&(dx>0?sc.scrollLeft+sc.clientWidth<sc.scrollWidth:sc.scrollLeft>0),vertical=dy&&(dy>0?body.scrollTop+body.clientHeight<body.scrollHeight:body.scrollTop>0);if(!horizontal&&!vertical)return;
 d.panFrame=requestAnimationFrame(()=>{d.panFrame=null;if(drag!==d)return;if(horizontal)sc.scrollLeft+=dx;if(vertical)body.scrollTop+=dy;wireMove({pointerId:d.pointer,clientX:d.px,clientY:d.py,preventDefault(){}});});
}
function wireLostCapture(ev){if(drag?.capture===ev.currentTarget&&drag.pointer===ev.pointerId)wireUp({type:'pointercancel'});}
function wireRedrawLive(){   // 拖曳中只更新線與格子，不重建整個面板，手指不會被打斷
  const wb = document.querySelector('.wb'); if (!wb) return;
  const html = wireBoardHtml(), t = document.createElement('div'); t.innerHTML = html; const nb = t.firstElementChild;
  wb.innerHTML = nb.innerHTML;
}
function wireUp(ev){
  document.removeEventListener('pointermove', wireMove); document.removeEventListener('pointerup', wireUp); document.removeEventListener('pointercancel', wireUp);
  const d = drag; drag = null;if(d?.panFrame)cancelAnimationFrame(d.panFrame);
  if(d?.piece!=null){document.getElementById('wire-ghost')?.remove();document.querySelector('.wb')?.classList.remove('piece-dragging');document.querySelectorAll('.wire-target,.wire-target-bad').forEach(e=>e.classList.remove('wire-target','wire-target-bad'));document.querySelector('[data-wire-remove]')?.classList.remove('drag-over');if(!d.moved)return;noClick=true;setTimeout(()=>noClick=false,250);if(!ev||ev.type==='pointercancel'){uxAnnounce('已取消移動，盤面沒有變更。');return;}const hit=document.elementFromPoint(ev.clientX,ev.clientY);const box=document.querySelector('.wb')?.getBoundingClientRect(),clip=document.querySelector('.wire-board-scroll')?.getBoundingClientRect(),outside=box&&(ev.clientX<Math.max(box.left,clip?.left??box.left)||ev.clientX>Math.min(box.right,clip?.right??box.right)||ev.clientY<box.top||ev.clientY>box.bottom);if(outside)wireRemovePiece(d.piece,d.signature);else{const target=wireCellAt(ev.clientX,ev.clientY);if(target)wireMovePiece(d.piece,...target,d.signature);else uxAnnounce('已取消移動，盤面沒有變更。');}return;}
  if(d?.capture){d.capture.removeEventListener('lostpointercapture',wireLostCapture);try{if(d.capture.hasPointerCapture(d.pointer))d.capture.releasePointerCapture(d.pointer);}catch(e){}}
  if (!d || !d.moved) return;
  if(ev?.type==='pointercancel'){G.board=JSON.parse(d.before);WIRE_UNDO=d.undo;selSock=-1;selPiece=null;recalc();renderModal();noClick=true;setTimeout(()=>noClick=false,250);uxAnnounce('已取消接線，還原原有配置。');return;}
  noClick = true; setTimeout(() => { noClick = false; }, 0);
  const port=selSock,done=GridLab.connected(G.board,selSock),empty=!wActive(selSock);if(done){selSock=-1;selPiece=null;}renderModal();if(done&&empty)wirePickSock(port,true);uxAnnounce(done?'已接通，目前預估 DPS '+tFmt(G.st.dps):'接線中');
}
function dpsWith(B){ const keep = G.board; G.board = B; syncBoard(); const d = calc().dps; G.board = keep; syncBoard(); return d; }
function pzHover(x, y){
  document.querySelectorAll('.pc.pv').forEach(e => e.classList.remove('pv', 'ok', 'bad'));
  const el = $('pzdelta'); if (el && !(held && x >= 0)) { if (!el.dataset.keep) el.innerHTML = ''; }
  if (!held || x < 0) return;
  const ok = GridLab.canPlace(G.board,held.kind,held.key,x,y,0,null,held.t||1), e = document.querySelector(`.pc[data-x="${x}"][data-y="${y}"]`);
  if (e) e.classList.add('pv', ok ? 'ok' : 'bad');
  if (el){ el.innerHTML = ''; if (ok){ const B = JSON.parse(JSON.stringify(G.board)); if (GridLab.place(B, held.kind, held.key, x, y, 0, { t:held.t })){ const d = dpsWith(B) - G.st.dps, pc = G.st.dps > 0 ? Math.round(d/G.st.dps*100) : 0; el.innerHTML = d ? `放這裡：傷害 <b class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${pc}%</b>` : '放這裡：沒有線經過，沒有效果'; } } }
}


/* ---------- 合成與超頻：三個同階合成一個高階（零件）；超頻賭一把（電路點數） ---------- */
const FORGE_LV = { merge:8, over:12 }, MERGE_COST = [10, 30], OVER_COST = 8;
function wireMerge(id, t){
  if (G.lvl < FORGE_LV.merge || t > 2 || gemFreeT(id, t) < 3 || (G.parts || 0) < MERGE_COST[t - 1]) return;
  G.parts -= MERGE_COST[t - 1]; const a = (G.gemTier = G.gemTier || {}, G.gemTier[id] = gemTierN(id).slice());
  if (t === 2) a[0] -= 3; a[t - 1] += 1; G.gems[id] -= 2; G.dirty = true; wireSnap('pick');
  renderModal(); uxAnnounce(`合成成功：${SUPPS[id].n}${TIER_NAME[t]}`);
}
function wireOver(id, t){
  const free = [];  for (const k of Object.keys(SUPPS)) for (const u of [1, 2, 3]) for (let i = gemFreeT(k, u) - (k === id && u === t ? 1 : 0); i > 0; i--) free.push([k, u]);
  if (G.lvl < FORGE_LV.over || t > 2 || gemFreeT(id, t) < 1 || !free.length || G.chips < OVER_COST) return;
  free.sort((a, b) => a[1] - b[1]); const [fk, ft] = free[0];   // 拿最低階的當祭品
  G.chips -= OVER_COST; G.gemTier = G.gemTier || {};
  const drop = (k, u) => { const a = G.gemTier[k] = gemTierN(k).slice(); if (u > 1) a[u - 2]--; G.gems[k]--; };
  drop(fk, ft); const r = Math.random(); let msg;
  if (r < .5){ const a = G.gemTier[id] = gemTierN(id).slice(); if (t === 2) a[0]--; a[t - 1]++; msg = `超頻成功：${SUPPS[id].n}${TIER_NAME[t]}`; wireSnap('pick'); }
  else if (r < .85){ msg = '超頻沒有變化'; wireSnap('snap'); }
  else { drop(id, t); msg = `${SUPPS[id].n}${TIER_NAME[t - 1]}燒毀了`; wireSnap('snap'); }
  G.dirty = true; recalc(); renderModal(); uxAnnounce(`${msg}（獻祭 ${SUPPS[fk].n}${TIER_NAME[ft - 1]}）`);
}
function wireForgeHtml(){
  if (G.lvl < FORGE_LV.merge) return '';
  const over = G.lvl >= FORGE_LV.over, m = [], o = [], tier = n => TIER_NAME[n - 1];
  for (const [id, S] of Object.entries(SUPPS)) for (const t of [1, 2]){
    if (gemFreeT(id, t) >= 3){ const ok = (G.parts || 0) >= MERGE_COST[t - 1];
      m.push(`<button class="forge-card${ok ? '' : ' short'}" ${ok ? '' : 'disabled'} onclick="wireMerge('${id}',${t})" aria-label="${uxEsc(S.n + tier(t))}三個合成${tier(t + 1)}，零件 ${MERGE_COST[t - 1]}"><span class="forge-row"><span class="forge-gem">${gemIco(id, 30)}<i>×3</i></span><span class="forge-arrow" aria-hidden="true">➜</span><span class="forge-gem up t${t + 1}">${gemIco(id, 36)}<i>${tier(t + 1)}</i></span></span><b>${S.n}</b><small>零件 ${MERGE_COST[t - 1]}${ok ? '' : '（不足）'}</small></button>`); }
    if (over && gemFreeT(id, t) >= 1){ const ok = G.chips >= OVER_COST;
      o.push(`<button class="forge-card over${ok ? '' : ' short'}" ${ok ? '' : 'disabled'} onclick="wireOver('${id}',${t})" aria-label="超頻${uxEsc(S.n + tier(t))}"><span class="forge-row"><span class="forge-gem">${gemIco(id, 34)}<i>${tier(t)}</i></span></span><b>${S.n}</b><small>${OVER_COST} 電路點數</small></button>`); }
  }
  const chip = (k, v) => `<span class="forge-chip"><em>${k}</em><b>${v}</b></span>`;
  return `<details class="uxforge"><summary>合成${over ? '與超頻' : ''}　${chip('零件', G.parts || 0)}${over ? chip('電路點數', G.chips) : ''}</summary>
    <h4>合成<small>三個同款同階合成一個更高階：Ⅱ ×1.35、Ⅲ ×1.65</small></h4>${m.length ? `<div class="forge-grid">${m.join('')}</div>` : '<p class="forge-empty">需要三個同款同階的可用配件</p>'}
    ${over ? `<h4>超頻<small>獻祭最低階的另一個配件，花 ${OVER_COST} 點：50% 升階　35% 不變　15% 燒毀</small></h4>${o.length ? `<div class="forge-grid">${o.join('')}</div>` : '<p class="forge-empty">需要至少兩個可用配件</p>'}` : ''}</details>`;
}

/* ---------- 庫存與目前生效 ---------- */
function uiInventoryHtml(){
  const kind = UI_WORK.inventory;
  const head = uiSegments('inventory', [['support', '輔助配件', '放在接線上強化技能；點選後再點板上的格子', !!G.unread?.gems?.length], ['active', '主動技能', '點選後裝到選取的插槽', !!G.unread?.skills?.length], ['cart', '模式卡匣', '改變技能的出手方式，裝在技能晶片上', !!G.unread?.carts?.length]], '機件庫存分類');
  let content = '';
  if (kind === 'active') content = `<div class="ui-inventory-grid">${Object.entries(SKILLS).filter(([id])=>playInventoryMatch('active',id)).map(([id, K]) => { const unlocked = skillAvailable(id), at = G.board.pieces.find(p => p.kind === 'active' && p.key === id); return `<button class="gt" data-focus="active-${id}" data-availability="${unlocked ? 'available' : 'unavailable'}" aria-label="${uxEsc(K.n + '：' + K.d)}" onclick="uiInventoryPick('active','${id}')">${sico(id, 26)}<b>${K.n}${playNewBadge("skills",id)}</b><small>${!unlocked ? (G.lvl<K.lvl?`Lv. ${K.lvl}`:skillFindLabel(id)+'未取得') : at ? `插槽 ${GridLab.sockIndex(at,G.board) + 1}` : '點選裝上'}</small></button>`; }).join('')}</div>`;
  else if (kind === 'support') content = `<div class="ui-inventory-grid">${Object.entries(SUPPS).filter(([id])=>playInventoryMatch('support',id)).flatMap(([id, S]) => [1, 2, 3].filter(t => t === 1 || gemOwnT(id, t) > 0).map(t => { const n = gemOwnT(id, t), f = gemFreeT(id, t), tn = TIER_NAME[t - 1], on = held?.key === id && (held.t || 1) === t; return `<button class="gt${on ? ' on' : ''}${t > 1 ? ' tier' + t : ''}" data-focus="support-${id}${t > 1 ? '-' + t : ''}" data-availability="${f ? 'available' : 'unavailable'}" aria-label="${uxEsc(S.n + tn)}，${f}／${n}，${uxEsc(S.d)}" onclick="uiInventoryPick('support','${id}',${t})">${t === 1 && noticeHas('gems',id) ? '<i class="nw">NEW</i>' : ''}${gemIco(id, 26)}<b>${S.n}${tn}</b><small>${WIRE_COLNAME[GridLab.GEM_COLOR[id]]} · 耗電${GridLab.TIER_COST[t-1]} · 剩${f}個</small></button>`; })).join('')}</div>${wireForgeHtml()}`;
  else content = cartsHtml();
  return `<section id="uxinventory" class="ui-inventory" aria-label="機件庫存">${head}${playInventoryFilters()}${content}${kind==='active'?skillBlueprintShelf():''}</section>`;
}
function uiInventoryPick(kind, key, t = 1){
  if (noClick) return;
  const def = kind === 'active' ? SKILLS[key] : SUPPS[key]; if (!def) return;if(kind==='active'&&!skillAvailable(key)){if(G.lvl<def.lvl){pzMsg('等級'+def.lvl+'開放這個技能。')}else skillBlueprintBuy(key);return;}noticeRead(kind==='active'?'skills':'gems',key);
  const reason = kind === 'active' ? (G.lvl < def.lvl ? `等級 ${def.lvl} 解鎖` : '') : gemFreeT(key, t) <= 0 ? (gemOwnT(key, t) ? '全部已放在接線板上，先收回一個' : '尚未持有，可繼續冒險或用合成取得') : '';
  if (!reason){ if (kind === 'active'){if(selSock>=0&&wOpen(selSock)){wireAssign(key);pzMsg(`已裝上 ${SKILLS[key].n}。下一步：按住「起」拖到「終」接線。`);}else skillPreview(key,true);return;}noticeRead('gems',key);pzHold(kind,key,t);return; }
  showOverlay(`<h2 class="uxdialog-title">${uxEsc(def.n)}</h2><p>${uxEsc(def.d)}</p><p>${reason}</p><button class="mb" data-initial-focus onclick="hideOverlay()">返回機件庫存</button>`);
}
function uiResolvedHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), pieces = new Map(B.pieces.map(p => [p.id, p]));
  const effective = new Set(res.flatMap(r => r.linked)), unused = B.pieces.filter(p => p.kind === 'support' && !effective.has(p.id));
  const reason = p => { const r = res.find(q => q.over.includes(p.id) || q.missed.includes(p.id)); return r ? (r.over.includes(p.id) ? `${SKILLS[r.key].n}的配件已達上限` : `${SKILLS[r.key].n}的標籤不符`) : GridLab.wireOf(B, p.x, p.y) ? '線還沒接通' : '沒有線經過'; };
  return `<section class="ui-section ui-resolved" aria-label="目前生效技能"><h3>目前生效</h3>${res.length ? res.map(r => { const s = G.st.sk[r.key]; return `<article><div>${sico(r.key, 24)}<b>${SKILLS[r.key].n}</b><span>${s ? `冷卻 ${s.cd.toFixed(1)} 秒` : ''}</span></div><p>${!r.wired ? '尚未接線，不會出手' : r.linked.length ? r.linked.map((id, k) => SUPPS[pieces.get(id).key].n + (Math.abs(r.weights[k] - 1) > .005 ? `×${r.weights[k].toFixed(2)}` : '')).join('、') : '線上沒有輔助配件'}</p>${s?.mode ? `<p>模式：${MODES[s.mode].n}</p>` : ''}</article>`; }).join('') : ''}${unused.length ? `<details><summary>未生效配件 ${unused.length} 件</summary><ul>${unused.map(p => `<li><b>${SUPPS[p.key].n}</b>：${reason(p)}</li>`).join('')}</ul></details>` : ''}</section>`;
}

const WIRE_CSS = `
body.ui-material #mbody .pz.wb{--cr:var(--ux-signal-red);--cb:var(--ux-signal-blue);--cg:var(--ux-signal-green);--ink:var(--ux-ink);position:relative;display:grid;max-width:460px!important;width:100%;box-sizing:border-box;margin:0 auto;padding:8px;gap:0;border:2px solid var(--ux-edge)!important;outline:0;box-shadow:inset 0 0 0 2px #0004!important;background:var(--ux-ink)!important;touch-action:pan-y;image-rendering:pixelated}
#mbody .pz.wb .pc.pr,#mbody .pz.wb .pc.sr,#mbody .pz.wb .pc.kr{--padc:var(--cr)}#mbody .pz.wb .pc.pb,#mbody .pz.wb .pc.sb,#mbody .pz.wb .pc.kb{--padc:var(--cb)}#mbody .pz.wb .pc.pg,#mbody .pz.wb .pc.sg,#mbody .pz.wb .pc.kg{--padc:var(--cg)}
body.ui-material #mbody .pz.wb button.pc{position:relative;z-index:1;box-sizing:border-box;margin:2px;min-width:0;min-height:0;aspect-ratio:1;padding:0!important;font-size:9px!important;line-height:1!important;border:1px solid #8b9ab629!important;border-radius:2px!important;background:#ffffff04!important;box-shadow:inset 0 1px #ffffff08!important;color:var(--ux-screen)!important;text-shadow:none!important;overflow:visible;cursor:pointer;isolation:isolate}
body.ui-material #mbody .pz.wb button.pc.dead{visibility:hidden;pointer-events:none}body.ui-material #mbody .pz.wb button.pc.rk{border:1px solid #6b7d9a!important;background:#34435d!important;box-shadow:inset 1px 1px #96a7bd!important;color:#a5b4cc!important}.pz.wb .pc.rk span{font-size:12px}
body.ui-material #mbody .pz.wb button.pc.pd{border-color:#92a7c426!important;background:#111d33!important;box-shadow:inset 1px 1px #0004!important}.pz.wb .pc.pd::after{content:"";position:absolute;inset:calc(50% - 3px);border-radius:50%;border:1px solid var(--padc);background:var(--padc);opacity:.8;pointer-events:none}
body.ui-material #mbody .pz.wb button.pc.src,body.ui-material #mbody .pz.wb button.pc.sk,body.ui-material #mbody .pz.wb button.pc.chip{z-index:3;border:2px solid var(--padc)!important;background:linear-gradient(#354667,#192a46)!important;box-shadow:inset 1px 1px #c3d2ed55,0 1px 0 #0008!important;color:#f1f4ff!important}
#mbody .pz.wb .pc.src,#mbody .pz.wb .pc.sk,#mbody .pz.wb .pc.wr,#mbody .pz.wb .pc.ac{touch-action:none}
body.ui-material #mbody .pz.wb button.pc.src{background:linear-gradient(#d3dcea,#a6b7d0)!important;color:var(--ux-ink)!important}.pz.wb .pc.src>span{position:absolute;inset:2px 0 8px;font-size:13px!important;display:grid;place-items:center}.pz.wb .pc .lb{position:absolute;bottom:1px;left:0;right:0;font:7px/1 "Cubic 11",sans-serif!important;font-style:normal;text-align:center;letter-spacing:0!important;pointer-events:none;white-space:nowrap}
.pz.wb .pc.sk>span,.pz.wb .pc.ac>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.pz.wb .pc.sk.empty>span{position:static;clip-path:none;width:auto;height:auto;display:block;font-size:8px!important;line-height:1!important;white-space:nowrap}.pz.wb .pc.sk>img{position:absolute;left:50%;top:2px;transform:translateX(-50%);margin:0!important;width:16px!important;height:16px!important}
body.ui-material #mbody .pz.wb button.pc.lock{background:#29364e!important;color:#9badc8!important;border-color:#697b97!important;box-shadow:inset 1px 1px #ffffff12!important}.pz.wb .pc.lock>span{font-size:8px!important;line-height:1;white-space:nowrap}
body.ui-material #mbody .pz.wb button.pc.ac{z-index:3;background:#16233f!important;border:1px solid var(--padc)!important;box-shadow:none!important}body.ui-material #mbody .pz.wb button.pc.ac.off{opacity:.55}.pz.wb .pc.ac>img{position:relative;z-index:2;width:20px!important;height:20px!important;max-width:95%;max-height:95%;object-fit:contain;margin:0!important}.pz.wb .pc.ac::after{display:none}.pz.wb .pc.mt::before{content:"";position:absolute;right:-1px;top:-3px;font:8px/1 "Cubic 11",sans-serif;color:#f5f8ff;background:var(--ux-ink);padding:1px;z-index:4;pointer-events:none}
body.ui-material #mbody .pz.wb button.pc.sel{outline:2px solid #fff!important;outline-offset:1px;z-index:4}.pz.wb .pc.hint{outline:1px dashed #e5e5b1;outline-offset:1px}.pz.wb .pc:focus-visible{outline:3px solid #fff!important;outline-offset:1px;z-index:5}.pz.wb .pc.chip.blink{outline:2px solid #fff}
.wsvg{position:absolute;inset:10px;width:calc(100% - 20px);height:calc(100% - 20px);pointer-events:none;z-index:2;overflow:visible;fill:none;stroke-linecap:round;stroke-linejoin:round}.wsvg .wo{stroke:#071323;stroke-width:.34}.wsvg .wl{stroke-width:.18}.wsvg .c-r{stroke:var(--cr)}.wsvg .c-b{stroke:var(--cb)}.wsvg .c-g{stroke:var(--cg)}.wsvg .wh{stroke:#ffffff90;stroke-width:.035}.wsvg .wf{stroke:#fff7;stroke-width:.03;stroke-dasharray:.12 .3}.wsvg .wk{fill:var(--ux-ink);stroke-width:.04}.wsvg .wk.kr{stroke:var(--cr)}.wsvg .wk.kb{stroke:var(--cb)}.wsvg .wk.kg{stroke:var(--cg)}
.device-console .pzbar{display:flex;gap:5px;flex-wrap:wrap;margin:10px 0 0!important;padding:0!important;position:static!important;background:none!important}.device-console .pzbar .mb{min-height:44px;font-size:12px!important;padding:5px 8px!important}body.ui-material #mbody .device-console .pzbar .wstat{width:100%;margin:4px 0 0;color:var(--ux-screen)!important;font-size:11px!important}.device-console #pzmsg{color:var(--ux-screen)!important;font-size:12px}.wreset i{display:none}
.device-wire-note{font-size:12px!important;line-height:1.6!important;margin:0 0 8px;color:var(--ux-muted)}.device-wire-note b{font-weight:400}.device-wire-help{margin-top:8px;font-size:12px}.device-wire-help summary{min-height:36px;display:flex;align-items:center;cursor:pointer}.wlegend{display:flex;gap:8px;flex-wrap:wrap;padding:8px 0;font-size:12px}.wlegend>span{display:flex;gap:6px;align-items:center}.wlegend .lg{display:inline-block;width:16px;height:16px;border:1px solid var(--ux-edge);font-size:12px;font-style:normal;line-height:16px;text-align:center}.wlegend .src{background:#aebdd3;color:var(--ux-ink)}.wlegend .sock{background:var(--ux-ink)}.wlegend .pad{color:#80cebd;background:var(--ux-ink)}
.wpick{position:fixed;z-index:70;width:min(320px,calc(100vw - 16px));box-sizing:border-box;background:var(--ux-screen);color:var(--ux-ink);border:2px solid var(--ux-edge);box-shadow:3px 3px 0 #17275180}.wph{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--ux-blue);color:#fff;padding:6px 10px;font-size:13px}.wpx{min-width:44px;min-height:44px}.wpg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:8px;max-height:45vh;overflow:auto}.wpi{min-width:0;min-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;gap:4px;font-family:"Cubic 11",sans-serif;color:var(--ux-ink);background:#d5dfed;border:1px solid var(--ux-edge)}.wpi b,.wpi small{font-size:12px;line-height:1.4;font-weight:400}.wpi.on{outline:2px solid var(--ux-blue);outline-offset:-3px}.wpi.no{opacity:.5}.wpd{display:block;margin:6px 8px;width:calc(100% - 16px);min-height:44px}.wpick:has(.wpl){width:min(380px,calc(100vw - 16px))}.wpg.wpl{grid-template-columns:1fr;max-height:55vh}.wpl .wpi{flex-direction:row;justify-content:flex-start;text-align:left;min-height:56px;gap:10px;padding:6px 10px}.wpl .wpt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.wpl .wpt b{font-size:14px;font-weight:400}.wpl .wpt small{font-size:12px;line-height:1.5;color:#44526e}.wpl .wpi.no .wpt small{color:#8a94aa}.wpl .wpi em{font-style:normal;font-size:14px;color:#1b3358}.wpe{font-size:13px;line-height:1.6;margin:10px}
.wsel .wchips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.wsel .wch{min-width:0;min-height:44px;white-space:normal;font-size:12px}.wsel .wch b{font-size:12px}.device-skills .ui-inventory .nw{display:inline-block;font:10px/1.4 "Cubic 11",sans-serif;color:#28374a;background:#fae0a1;padding:0 3px}
@media(prefers-reduced-motion:reduce){.pz.wb .pc{animation:none!important;transition:none!important}}
@media(forced-colors:active){.wsvg .wl,.wsvg .wo{stroke:CanvasText}.pz.wb .pc.pd::after{border-color:CanvasText}.pz.wb .pc.sel{outline-color:Highlight!important}}
`;


/* ---------- 從庫存直接拖到接線板：配件拖到格子、技能拖到右邊插槽（滑鼠移動 6 像素或觸控長按後開始） ---------- */
(function(){
  let dr = null, ghost = null, timer = 0;
  const parse = b => { const m = /uiInventoryPick\('(active|support)','([^']+)'(?:,(\d))?\)/.exec(b.getAttribute('onclick') || ''); return m ? { kind:m[1], key:m[2], t:+(m[3] || 1) } : null; };
  const cellAt = (x, y) => { if (ghost) ghost.style.display = 'none'; const c = wireCellAt(x, y); if (ghost) ghost.style.display = ''; return c; };
  const hot = c => { document.querySelectorAll('.wb .pc.dropok').forEach(e => e.classList.remove('dropok')); if (c){ const e = document.querySelector(`.wb .pc[data-x="${c[0]}"][data-y="${c[1]}"]`); if (e) e.classList.add('dropok'); } };
  function start(){ if (!dr) return; dr.on = true; ghost = document.createElement('div'); ghost.className = 'wdrag'; ghost.innerHTML = dr.el.innerHTML; document.body.appendChild(ghost); move(dr.last); }
  function move(ev){ dr.last = ev; if (!dr.on){ if (Math.hypot(ev.clientX - dr.sx, ev.clientY - dr.sy) > 8 && ev.pointerType === 'touch') end(true); else if (ev.pointerType !== 'touch' && Math.hypot(ev.clientX - dr.sx, ev.clientY - dr.sy) > 6) start(); return; }
    ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; hot(cellAt(ev.clientX, ev.clientY)); ev.cancelable && ev.preventDefault(); }
  function end(cancel){ document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancelUp); document.removeEventListener('touchmove', tm); clearTimeout(timer);
    const d = dr; dr = null; if (ghost){ ghost.remove(); ghost = null; } hot(null); if (!d || !d.on || cancel) return;
    noClick = true; setTimeout(() => { noClick = false; }, 60); d.drop && d.drop(); }
  function up(ev){ if (dr && dr.on){ const info = dr.info, cc = cellAt(ev.clientX, ev.clientY); dr.drop = () => dropOn(info, cc); } end(false); }
  function cancelUp(){ end(true); }
  function tm(ev){ if (dr && dr.on) ev.preventDefault(); }
  function dropOn(info, c){
    if (!c){ uxAnnounce('沒有放到格子上'); return; }
    if (info.kind === 'support'){ if (gemFreeT(info.key, info.t) <= 0){ pzMsg('這個配件都已經放在板上了'); return; } held = { kind:'support', key:info.key, t:info.t }; heldRot = 0; selPiece = null; selSock = -1; wirePlace(c[0], c[1]); held = null; renderModal(); }
    else { const i = GridLab.sockAt(c[0], c[1],G.board); if (i < 0){ pzMsg('技能要拖到板邊的插槽上'); return; } if (!wOpen(i)){ pzMsg('這個插槽還沒解鎖'); return; } selSock = i; held = null; wireAssign(info.key); }
  }
  document.addEventListener('pointerdown', ev => {
    if (dr || ev.button > 0 || ev.pointerType === 'touch') return; const b = ev.target.closest && ev.target.closest('#mbody .ui-inventory-grid .gt'); if (!b) return;
    const info = parse(b); if (!info) return;
    dr = { el:b, info, sx:ev.clientX, sy:ev.clientY, on:false, last:ev };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancelUp); document.addEventListener('touchmove', tm, { passive:false });
    if (ev.pointerType === 'touch') timer = setTimeout(() => { if (dr && !dr.on) start(); }, 220);
  });
  const st = document.createElement('style'); st.textContent = '.wdrag{position:fixed;z-index:60;pointer-events:none;transform:translate(-50%,-60%) scale(1.1);padding:6px 10px;background:#e6e8f6;border:2px solid #fff;outline:2px solid #33407f;box-shadow:3px 3px 0 #1d2552aa;color:#1d2552;font-size:13px;opacity:.95;display:flex;align-items:center;gap:6px}.wdrag *{pointer-events:none}.wb .pc.dropok{outline:2px solid #ffe45c!important;outline-offset:-2px}'; document.head.appendChild(st);
})();
(function(){const st=document.createElement('style');st.textContent='#mbody .ui-inventory-grid .gt,.wb .pc{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}';document.head.appendChild(st);})();

(function(){const s=document.createElement('style');s.textContent='.wb .chip.open>img{filter:grayscale(1);opacity:.4}body.ui-material #mbody .pz.wb button.pc.lnk{outline:none!important}.wb .chip.lnk::after{display:none!important}.wb .port-ok{position:absolute;right:7px;bottom:9px;width:10px;height:5px;border-left:3px solid #7be0a3;border-bottom:3px solid #7be0a3;transform:rotate(-45deg);pointer-events:none}';document.head.appendChild(s)})();

;
/* 滑鼠提示：桌機移到按鈕、格子、配件上，稍等一下就在游標旁顯示說明。
   取用順序：data-tip → title（接手後移除原生 title，避免雙重提示）→ 格子與卡片的 aria-label。觸控裝置不顯示，改用點選後的詳情。 */
(function(){
  if (typeof document === 'undefined' || !document.body) return;
  const SEL = '[data-tip],[title],.pc,.gt,.ui-item-tile,.ui-mapcard', LABEL_ONLY = '.pc,.gt,.ui-item-tile,.ui-mapcard';
  let tip = null, timer = 0, cur = null, mx = 0, my = 0;
  const fine = () => !window.matchMedia || window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function textOf(el){
    if (el.hasAttribute('title')){ const t = el.getAttribute('title'); el.removeAttribute('title'); if (t){ el.dataset.tip = t; if (!el.hasAttribute('aria-description')) el.setAttribute('aria-description', t); } }
    let t = el.dataset.tip;
    if (!t && el.matches(LABEL_ONLY)){ const a = el.getAttribute('aria-label'); if (a && a.replace(/\s/g, '') !== (el.textContent || '').replace(/\s/g, '') && !el.disabled) t = a.replace(/，/g, '\n'); }
    return t || '';
  }
  function place(){
    if (!tip) return; const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = mx + 14, y = my + 18;
    if (x + w + pad > innerWidth) x = Math.max(pad, mx - w - 10);
    if (y + h + pad > innerHeight) y = Math.max(pad, my - h - 14);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function show(text){
    if (!tip){ tip = document.createElement('div'); tip.id = 'uxtip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = text; tip.style.display = 'block'; place();
  }
  function hide(){ clearTimeout(timer); timer = 0; cur = null; if (tip) tip.style.display = 'none'; }
  document.addEventListener('mouseover', e => {
    if (!fine()) return;
    const el = e.target.closest && e.target.closest(SEL); if (el === cur) return;
    hide(); if (!el) return;
    const t = textOf(el); if (!t) return;
    cur = el; mx = e.clientX; my = e.clientY;
    timer = setTimeout(() => { if (cur === el && document.contains(el)) show(t); }, 220);
  }, true);
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (tip && tip.style.display === 'block'){ if (cur && !document.contains(cur)) hide(); else place(); } }, true);
  for (const ev of ['mousedown', 'keydown', 'wheel', 'touchstart']) document.addEventListener(ev, hide, true);
  document.addEventListener('scroll', hide, true);
  const st = document.createElement('style');
  st.textContent = '.battle-hud [data-tip]{pointer-events:auto}#uxtip{position:fixed;z-index:99999;display:none;max-width:240px;padding:6px 8px;pointer-events:none;white-space:pre-line;font:12px/1.5 var(--ux-body,system-ui,sans-serif);color:#eef4ff;background:#1d2748;border:2px solid #fff;outline:1px solid #5d6bb0;box-shadow:2px 2px 0 #0006}@media(prefers-reduced-motion:no-preference){#uxtip{animation:uxtipin .08s steps(2)}}@keyframes uxtipin{from{opacity:0}}';
  document.head.appendChild(st);
})();
