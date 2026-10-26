/* Static reader for build-time normalized user meshes. No runtime network requests. */
const EQUIPMENT_RENDER={cache:new Map()};
function equipmentModel(id){
 if(typeof EQUIPMENT_GLB==='undefined'||!EQUIPMENT_GLB[id])return typeof equipmentProxyModel==='function'?equipmentProxyModel(id):null;
 const ck=id+(typeof g1On==='function'&&g1On()?'+g1':'');if(EQUIPMENT_RENDER.cache.has(ck))return EQUIPMENT_RENDER.cache.get(ck).clone(true);
 const bin=Uint8Array.from(atob(EQUIPMENT_GLB[id]),c=>c.charCodeAt(0)),view=new DataView(bin.buffer),n=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bin.subarray(20,20+n))),start=28+n;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],w=widths[a.type];if(!C||!w||v.byteStride||a.sparse)throw Error('Unsupported equipment accessor');const off=start+(v.byteOffset||0)+(a.byteOffset||0);return new T3.BufferAttribute(new C(bin.buffer.slice(off,off+a.count*w*C.BYTES_PER_ELEMENT)),w,!!a.normalized);};
 const materials=(doc.materials||[]).map(m=>{
  const p=m.pbrMetallicRoughness||{},c=p.baseColorFactor||[1,1,1,1],mat=new T3.MeshLambertMaterial({color:new T3.Color().fromArray(c),side:T3.DoubleSide});
  mat.userData.equipmentShared=true;
  if(p.baseColorTexture){const image=doc.images[doc.textures[p.baseColorTexture.index].source],v=doc.bufferViews[image.bufferView],bytes=bin.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));const tex=new T3.Texture();tex.colorSpace=T3.SRGBColorSpace;tex.flipY=false;mat.map=tex;const img=document.createElement('img');img.onload=()=>{tex.image=img;tex.needsUpdate=true;};img.onerror=()=>{mat.map=null;mat.needsUpdate=true;};img.src='data:'+image.mimeType+';base64,'+btoa(s);}
  return mat;
 });
 const nodes=doc.nodes.map(node=>{const g=new T3.Group();g.name=id;if(node.matrix)new T3.Matrix4().fromArray(node.matrix).decompose(g.position,g.quaternion,g.scale);else{if(node.translation)g.position.fromArray(node.translation);if(node.rotation)g.quaternion.fromArray(node.rotation);if(node.scale)g.scale.fromArray(node.scale);}
  if(node.mesh!=null)for(const p of doc.meshes[node.mesh].primitives){const geo=new T3.BufferGeometry();geo.userData.equipmentShared=true;for(const [key,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']])if(p.attributes[key]!=null)geo.setAttribute(name,access(p.attributes[key]));if(p.indices!=null)geo.setIndex(access(p.indices));if(!geo.attributes.normal)geo.computeVertexNormals();g.add(new T3.Mesh(geo,g1EquipMaterial(id,materials[p.material]||m3('#bbc8d2'))));}return g;});
 doc.nodes.forEach((node,i)=>(node.children||[]).forEach(j=>nodes[i].add(nodes[j])));const root=new T3.Group();for(const i of doc.scenes[doc.scene||0].nodes)root.add(nodes[i]);if(id==='aki_baton')root.rotation.x=-Math.PI/2;root.userData.equipmentModel=id;EQUIPMENT_RENDER.cache.set(ck,root);return root.clone(true);
}
// Socket dimensions use the existing character rig's units; assets are centered with max span 1.
const EQUIPMENT_SOCKETS={
 aki_headphones:['head',15,0,1.3,-.3],aki_baton:['handR',10,0,0,.4],aki_chain:['hips',5.8,3.3,-1.1,2.4],aki_charm:['hips',1.6,5,-2.5,2.7],
 milo_headphones:['head',12.8,0,4.2,-.6],milo_md:['hips',3.3,-3.3,1.5,3.1],milo_disc:['hips',3.5,4.3,.1,1.2],milo_belt:['hips',3.5,1.8,-2.3,3],milo_md_strap:['torso',8,0,3,2.7],
 ping_clip:['head',2,-3.5,3,1],ping_comm:['head',3.2,-5.3,1.4,.3],ping_bag:['hips',5.2,-5.4,-1.2,1.8],ping_launcher:['foreR',5.4,0,-1.5,.6],ping_phone:['handL',2.5,0,0,.6],ping_bag_strap:['torso',9,0,3,2.6],
 null_goggles:['head',10.5,0,5.5,-.2],null_controller:['handR',2.8,0,.2,.8],null_box:['hips',3.2,-4.5,.5,.8],null_pet:['pet',4,8,13,-2],null_lanyard:['torso',6,0,3,3]
};
// Object-local contact points, measured in normalized source coordinates. The
// wrapper moves that contact to a bone socket; cached source meshes stay untouched.
const EQUIPMENT_FITS={
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
 if(asset.geometry.attributes.position.count!==mask.vertices||asset.geometry.index.count!==mask.triangles*3)throw Error('Character equipment mask is stale');
 if(!asset.headsetVariant){const removed=new Set(mask.remove),indices=asset.geometry.index.array,kept=[];for(let i=0;i<indices.length;i+=3)if(!removed.has(i/3))kept.push(indices[i],indices[i+1],indices[i+2]);asset.headsetVariant=asset.geometry.clone();asset.headsetVariant.setIndex(kept);}
 return asset.headsetVariant;
}
