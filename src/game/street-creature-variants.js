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
