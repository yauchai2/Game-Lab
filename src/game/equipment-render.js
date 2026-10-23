/* Static reader for build-time normalized user meshes. No runtime network requests. */
const EQUIPMENT_RENDER={cache:new Map()};
function equipmentModel(id){
 if(typeof EQUIPMENT_GLB==='undefined'||!EQUIPMENT_GLB[id])return null;
 if(EQUIPMENT_RENDER.cache.has(id))return EQUIPMENT_RENDER.cache.get(id).clone(true);
 const bin=Uint8Array.from(atob(EQUIPMENT_GLB[id]),c=>c.charCodeAt(0)),view=new DataView(bin.buffer),n=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bin.subarray(20,20+n))),start=28+n;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],w=widths[a.type];if(!C||!w||v.byteStride||a.sparse)throw Error('Unsupported equipment accessor');const off=start+(v.byteOffset||0)+(a.byteOffset||0);return new T3.BufferAttribute(new C(bin.buffer.slice(off,off+a.count*w*C.BYTES_PER_ELEMENT)),w,!!a.normalized);};
 const materials=(doc.materials||[]).map(m=>{
  const p=m.pbrMetallicRoughness||{},c=p.baseColorFactor||[1,1,1,1],mat=new T3.MeshLambertMaterial({color:new T3.Color().fromArray(c),side:T3.DoubleSide});
  if(p.baseColorTexture){const image=doc.images[doc.textures[p.baseColorTexture.index].source],v=doc.bufferViews[image.bufferView],bytes=bin.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));const tex=new T3.Texture();tex.colorSpace=T3.SRGBColorSpace;tex.flipY=false;mat.map=tex;const img=document.createElement('img');img.onload=()=>{tex.image=img;tex.needsUpdate=true;};img.onerror=()=>{mat.map=null;mat.needsUpdate=true;};img.src='data:'+image.mimeType+';base64,'+btoa(s);}
  return mat;
 });
 const nodes=doc.nodes.map(node=>{const g=new T3.Group();g.name=id;if(node.matrix)new T3.Matrix4().fromArray(node.matrix).decompose(g.position,g.quaternion,g.scale);else{if(node.translation)g.position.fromArray(node.translation);if(node.rotation)g.quaternion.fromArray(node.rotation);if(node.scale)g.scale.fromArray(node.scale);}
  if(node.mesh!=null)for(const p of doc.meshes[node.mesh].primitives){const geo=new T3.BufferGeometry();for(const [key,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']])if(p.attributes[key]!=null)geo.setAttribute(name,access(p.attributes[key]));if(p.indices!=null)geo.setIndex(access(p.indices));if(!geo.attributes.normal)geo.computeVertexNormals();g.add(new T3.Mesh(geo,materials[p.material]||m3('#bbc8d2')));}return g;});
 doc.nodes.forEach((node,i)=>(node.children||[]).forEach(j=>nodes[i].add(nodes[j])));const root=new T3.Group();for(const i of doc.scenes[doc.scene||0].nodes)root.add(nodes[i]);if(id==='aki_baton')root.rotation.x=-Math.PI/2;root.userData.equipmentModel=id;EQUIPMENT_RENDER.cache.set(id,root);return root.clone(true);
}
// Socket dimensions use the existing character rig's units; assets are centered with max span 1.
const EQUIPMENT_SOCKETS={
 aki_headphones:['head',8,0,4.5,0],aki_baton:['handR',10,0,3.8,0],aki_chain:['hips',6,3,-2,2],aki_charm:['hips',1.8,4,-3,2.6],
 milo_headphones:['head',8,0,4.5,0],milo_md:['torso',3.4,0,2,3],milo_disc:['hips',3.4,3.6,0,2],milo_belt:['hips',4,3,-3,2],milo_md_strap:['torso',8,0,3,2.7],
 ping_clip:['head',2,-3.5,3,1],ping_comm:['head',3,-3.5,2,0],ping_bag:['torso',5,-3,-1,2],ping_launcher:['foreR',5.4,0,-1.5,.6],ping_phone:['handL',2.6,0,0,1],ping_bag_strap:['torso',9,0,3,2.6],
 null_goggles:['head',7,0,6,1],null_controller:['handR',2.8,0,0,1],null_box:['hips',3.5,3,-1,1],null_pet:['pet',4,8,13,-2],null_lanyard:['torso',6,0,3,3]
};
function attachSignatureGear(g,it){
 const spec=signatureOf(it);if(!spec||!canUseGear(it))return false;const model=equipmentModel(spec.model),socket=EQUIPMENT_SOCKETS[spec.model];if(!model||!socket)return false;
 const [bone,size,x,y,z]=socket;model.scale.setScalar(size);model.position.set(x,y,z);if(spec.model==='ping_launcher')model.rotation.x=Math.PI/2;(bone==='pet'?g:g.userData.B[bone]).add(model);if(spec.model==='milo_disc'){const other=model.clone(true);other.position.x=-x;g.userData.B[bone].add(other);}if(bone==='pet')g.userData.pet=model;return true;
}
