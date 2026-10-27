/* Shared visual catalog; only presentation changes. Stable type keys still own AI/collision/rewards. */
const STREET_CREATURES={
 slime:['M01',10],skel:['M05',13],drone:['M03',10,5],bomb:['M07',11],brute:['M06',17],
 mole:['M02',7],spider:['M02',7],crab:['M07',11],ranger:['M05',13],lantern:['M08',12,4],
 speaker:['M04',14.5],wisp:['M03',10,6],golem:['B01',20],scanner:['B03',14],roller:['M02',9],
 antenna:['M08',14,2],cable:['M02',8],furnace:['B01',20],shard:['B04',13,2],
 jailer:['B01',21],specimen:['B02',22],sentinel:['B03',23]
};
// Shared visual identity lookup; audio derives material from this same owner.
function streetCreatureSpec(m){
 let spec=STREET_CREATURES[m.type];
 if(m.towerBoss)spec=[{warden:'B01',chimera:'B02',executor:'B03'}[m.towerBoss]||'B04',27];
 else if(m.boss)spec=[['B01','B02','B03','B04'][((m.bossForm??biomeNow())%4+4)%4],27];
 if(m.boss&&!m.towerBoss&&Number.isInteger(m.chap)&&m.chap>=0&&m.chap<6)spec=[['M04','B01','B03','M04','B02','B04'][m.chap],27];
 return spec;
}
function streetCreatureBuild(m){
 if(!g1On()||typeof STREET_MONSTER_GLB==='undefined')return null;
 const spec=streetCreatureSpec(m);
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
