/* Imported Y2K characters. The small reader accepts only our build-time validated GLBs;
   no runtime URL, provider, loader dependency or player save is involved. */
const CHARACTER_RENDER = {cache:new Map()};
function characterAsset(id){
 if(CHARACTER_RENDER.cache.has(id))return CHARACTER_RENDER.cache.get(id);
 const encoded=CHARACTER_GLB[id];if(!encoded)throw new Error('Unknown character asset: '+id);
 const bin=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bin.buffer);
 if(view.getUint32(0,true)!==0x46546c67)throw new Error('Invalid character GLB');
 const size=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bin.subarray(20,20+size))),start=28+size;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],n=widths[a.type];if(v.byteStride||a.sparse||!C||!n)throw new Error('Unsupported packed character attribute');const off=start+(v.byteOffset||0)+(a.byteOffset||0);return new T3.BufferAttribute(new C(bin.buffer.slice(off,off+a.count*n*C.BYTES_PER_ELEMENT)),n,!!a.normalized);};
 const primitive=doc.meshes[0].primitives[0],geometry=new T3.BufferGeometry();
 for(const [from,to] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']])geometry.setAttribute(to,access(primitive.attributes[from]));
 geometry.setIndex(access(primitive.indices));
 const materialDef=doc.materials[primitive.material],imageDef=doc.images[doc.textures[materialDef.pbrMetallicRoughness.baseColorTexture.index].source],imageView=doc.bufferViews[imageDef.bufferView];
 const bytes=bin.subarray(start+(imageView.byteOffset||0),start+(imageView.byteOffset||0)+imageView.byteLength);
 let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const texture=new T3.Texture();texture.colorSpace=T3.SRGBColorSpace;texture.flipY=false;texture.minFilter=T3.LinearMipmapLinearFilter;texture.magFilter=T3.LinearFilter;
 const material=new T3.MeshLambertMaterial({map:texture,color:0xffffff,side:T3.DoubleSide});
 const image=document.createElement('img');image.onload=()=>{texture.image=image;texture.needsUpdate=true;};image.onerror=()=>{material.map=null;material.color.set('#8092a0');material.needsUpdate=true;};image.src='data:'+imageDef.mimeType+';base64,'+btoa(text);
 const clips=doc.animations.map(a=>new T3.AnimationClip(a.name,-1,a.channels.map(ch=>{const sa=a.samplers[ch.sampler],node=doc.nodes[ch.target.node],prop={rotation:'quaternion',translation:'position',scale:'scale'}[ch.target.path],C=prop==='quaternion'?T3.QuaternionKeyframeTrack:T3.VectorKeyframeTrack;return new C(node.name+'.'+prop,access(sa.input).array,access(sa.output).array,sa.interpolation==='STEP'?T3.InterpolateDiscrete:T3.InterpolateLinear);})));
 const asset={doc,geometry,material,access,clips};CHARACTER_RENDER.cache.set(id,asset);return asset;
}
function buildY2KHero(at,ar,wt,wr,cos){
 const profile=CHARS[G.char],id=profile.model||'aki',asset=characterAsset(id),doc=asset.doc,g=new T3.Group(),joints=new Set(doc.skins[0].joints),B={};
 const nodes=doc.nodes.map((n,i)=>{const o=joints.has(i)?new T3.Bone():new T3.Group();o.name=n.name||'node_'+i;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.matrix)new T3.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);if(joints.has(i))B[o.name]=o;return o;});
 doc.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));for(const i of doc.scenes[doc.scene||0].nodes)g.add(nodes[i]);
 const s=doc.skins[0],inv=asset.access(s.inverseBindMatrices).array,skeleton=new T3.Skeleton(s.joints.map(i=>nodes[i]),s.joints.map((_,i)=>new T3.Matrix4().fromArray(inv,i*16)));
 const mesh=new T3.SkinnedMesh(asset.geometry,asset.material);mesh.name=id+'_skin';mesh.frustumCulled=false;
 const meshNode=doc.nodes.findIndex(n=>n.mesh===0);nodes[meshNode].add(mesh);g.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld);mesh.normalizeSkinWeights();
 const mixer=new T3.AnimationMixer(g),actions=Object.fromEntries(asset.clips.map(clip=>[clip.name,mixer.clipAction(clip)]));
 for(const [name,action]of Object.entries(actions)){if(!['idle','walk','run'].includes(name)){action.setLoop(T3.LoopOnce,1);action.clampWhenFinished=true;}}
 g.userData={y2k:true,id,B,mesh,skeleton,mixer,actions,animation:'',face:Math.PI};
 characterPlay(g,'idle',0);characterEquipment(g,cos||G.cos,wt,wr);
 mk(new T3.RingGeometry(8,9,28).rotateX(-Math.PI/2),basic('#7ef0ff',.7),0,.2,0,g);
 const orb=mk(ico(1.2,1),basic('#81cbd1',.8),0,0,0,B.handL);orb.position.set(0,0,2);orb.visible=false;g.userData.orb=orb;
 addShadow(g,5.5);g.scale.setScalar(.85*CK);return g;
}
function characterEquipment(g,cos,wt,wr){
 const B=g.userData.B,id=g.userData.id,silver=m3('#c5ced2'),dark=m3('#34435a'),blue=m3('#79c9df'),screen=m3('#8dc4b7');
 const grip=new T3.Group();B.handR.add(grip);grip.rotation.x=Math.PI/2;g.userData.sword=grip;
 if(cos.weaponStyle&&cos.weaponStyle!=='0'){grip.scale.setScalar(.7);buildWeapon(grip,{umbrella:0,bat:1,tube:2,saber:3}[cos.weaponStyle]??wt,wr);}
 else if(id==='aki'){
  for(let i=0;i<6;i++)mk(new T3.TorusGeometry(.3,.08,3,6),silver,3.6+i*.15,-2-i*.3,2.2,B.hips).rotation.y=i%2?Math.PI/2:0;mk(new T3.BoxGeometry(.6,.9,.5),silver,4.5,-4,2.2,B.hips);
  mk(new T3.CylinderGeometry(.48,.55,2.6,8),dark,0,0,0,grip);mk(new T3.CylinderGeometry(.3,.4,7,8),silver,0,4.4,0,grip);for(const y of[2,5,7.7])mk(new T3.TorusGeometry(.43,.12,4,8).rotateX(Math.PI/2),blue,0,y,0,grip);
 }else if(id==='milo'){
  mk(new T3.TorusGeometry(2.35,.28,4,12).rotateX(Math.PI/2),dark,0,4.8,.5,B.torso);for(const sx of[-1,1])mk(new T3.BoxGeometry(.9,1.6,1.4),silver,sx*2.3,4.8,.7,B.torso);
  for(const sx of[-1,1]){const disc=new T3.Group();disc.position.set(sx*3.3,-2,2.7);B.torso.add(disc);mk(new T3.CylinderGeometry(1.6,1.6,.45,12),dark,0,0,0,disc).rotation.x=Math.PI/2;mk(new T3.TorusGeometry(1.1,.18,4,12),silver,0,0,.3,disc);}
  mk(new T3.BoxGeometry(2.1,2.8,.6),m3('#98aeb8'),0,2,3,B.torso);mk(new T3.BoxGeometry(1.4,.9,.1),screen,0,2.5,3.35,B.torso);
 }else if(id==='ping'){
  mk(new T3.BoxGeometry(.4,2,.4),silver,-3.8,1,1.1,B.head);mk(new T3.BoxGeometry(.2,1.8,.5),blue,-3.8,2.6,1.1,B.head);
  mk(new T3.BoxGeometry(1.8,2.1,2),silver,0,-.4,.8,B.foreR);mk(new T3.BoxGeometry(.8,.7,.2),blue,0,-.2,1.85,B.foreR);
  mk(new T3.BoxGeometry(3,3.4,1.4),dark,-3.3,-1.1,2,B.torso);mk(new T3.BoxGeometry(.8,.35,.15),m3('#d78a51'),-3.3,-.8,2.8,B.torso);
  mk(new T3.BoxGeometry(1.2,1.9,.3),silver,0,-.1,.8,B.handL).rotation.x=-.5;
 }else if(id==='null'){
  for(const x of[-1.3,1.3])mk(new T3.TorusGeometry(1,.13,4,10),silver,x,7.5,1.4,B.head);mk(new T3.BoxGeometry(.7,.15,.15),silver,0,7.5,1.4,B.head);
  mk(new T3.BoxGeometry(1.7,2.3,.6),screen,0,1.1,3.3,B.torso);mk(new T3.BoxGeometry(1,.9,.1),dark,0,1.2,3.65,B.torso);
  mk(new T3.BoxGeometry(2.4,2,1.5),silver,3.6,-2,.6,B.torso);
  const pet=new T3.Group();mk(new T3.BoxGeometry(3.4,2.8,2.4),silver,0,0,0,pet);mk(new T3.BoxGeometry(2.5,1.5,.12),dark,0,.1,1.25,pet);for(const x of[-.65,.65])mk(new T3.BoxGeometry(.35,.45,.15),screen,x,.2,1.35,pet);mk(new T3.BoxGeometry(.2,1.3,.2),dark,0,2,0,pet);for(const x of[-1,1])mk(new T3.BoxGeometry(.8,.3,1.1),dark,x,-1.6,.3,pet);g.add(pet);g.userData.pet=pet;
 }
 // Existing cosmetic owner expects forearm origins. Socket adapters put the item in the palm.
 const proxy={...B};for(const side of['L','R']){const socket=new T3.Group();socket.position.set(0,4,-1);B['hand'+side].add(socket);proxy['fore'+side]=socket;}
 buildHeroAccessories(proxy,cos);
}
function characterPlay(g,name,fade=.1){
 const u=g.userData,next=u.actions[name];if(!next||u.animation===name)return;
 const previous=u.actions[u.animation];u.animation=name;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();if(previous)previous.crossFadeTo(next,fade,false);else next.fadeIn(fade);
}
function characterAnimate(g,dt,state={}){
 const u=g.userData;if(!u.y2k)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 const mode=state.dead?'death':state.hurt?'hurt':state.dash?'dash':state.attack?'attack':state.cast?'cast':state.speed>7?'run':state.speed>1?'walk':'idle';
 if(state.attack&&u.lastSwing!=null&&state.swing<u.lastSwing&&u.animation==='attack')u.actions.attack.reset().play();u.lastSwing=state.swing;
 if(state.cast&&u.lastCast!=null&&state.castTime<u.lastCast&&u.animation==='cast')u.actions.cast.reset().play();u.lastCast=state.castTime;
 characterPlay(g,mode,mode==='hurt'?.045:.1);const action=u.actions[mode];if(action&&mode==='attack')action.timeScale=.6/.3;if(action&&mode==='cast')action.timeScale=.8/.45;
 u.mixer.update(dt);if(u.pet){const t=u.mixer.time;u.pet.position.set(8+Math.sin(t*1.7)*.6,13+Math.sin(t*3)*.8,-2);u.pet.rotation.y=Math.sin(t)*.25;}
 g.updateMatrixWorld(true);u.skeleton.update();
}
function characterHeroLook(g){
 const h=G.h,u=g.userData;characterAnimate(g,R3.frameDt||1/60,{dead:h.dead>0,hurt:h.hurtT>0,dash:!!h.dash,attack:h.swingT>=0,swing:h.swingT,cast:h.castT>=0||G.time<(h.characterCastUntil||0),castTime:h.castT,speed:h.mv||0});
 at3(g,h.x,h.y,BZ+terrainHeight(h.x,h.y));const target=nearestMon(false);if(target&&h.dead<=0)u.face=Math.atan2(target.x-h.x,target.y-h.y);const d=Math.atan2(Math.sin(u.face-g.rotation.y),Math.cos(u.face-g.rotation.y));g.rotation.y+=d*(1-Math.exp(-12*(R3.frameDt||1/60)));
 g.scale.setScalar(.85*CK);u.orb.visible=h.castT>=0&&h.dead<=0;
}
function characterDispose(g){if(!g?.userData.y2k)return;const u=g.userData;u.mixer.stopAllAction();u.mixer.uncacheRoot(g);u.skeleton.dispose();}
