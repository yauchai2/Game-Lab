/* One geometry owner for ordinary equipment in portraits, inventory and worn gear.
   Positions use existing socket units; gloves/boots have one wearable or a display pair. */
function ordinaryEquipmentModel(slot,tier=0,rarity=0,single=false){
 const t=Math.max(0,Math.min(3,tier|0)),r=Math.max(0,Math.min(3,rarity|0)),g=new T3.Group();
 const shell=m3(['#BBC8C9','#84AFBF','#CCB880','#BB917C'][r]),dark=m3('#2D404B'),silver=m3('#BAC5C7'),accent=m3(['#6896AA','#7583B0','#81B8AA','#D5A254'][t]);
 const box=(w,h,d,mat,x=0,y=0,z=0)=>mk(roundedG(w,h,d),mat,x,y,z,g);
 const cyl=(a,b,h,mat,x=0,y=0,z=0,n=8)=>mk(new T3.CylinderGeometry(a,b,h,n),mat,x,y,z,g);
 g.userData.ordinaryEquipment={slot,tier:t,rarity:r,single};
 if(slot==='weapon'){buildWeapon(g,t,r);return g;}
 if(slot==='head'){
  if(t===0){cyl(4.4,4.8,1.5,shell);box(7,.4,3.8,dark,0,-.5,3.8);box(2,.4,.25,accent,2,.2,4.5);}
  if(t===1){const band=mk(new T3.TorusGeometry(4.6,.45,4,10,Math.PI),dark,0,-1,0,g);band.userData.wearPart='band';for(const x of[-4.6,4.6]){box(1.3,3.3,2.6,shell,x,-1,0).userData.wearPart='earcup';box(.3,1.7,1.7,accent,x+Math.sign(x)*.7,-1,0).userData.wearPart='earcup';}}
  if(t===2){box(8.6,2,1.1,dark,0,-1,4.3);box(7.2,.6,.2,accent,0,-.7,4.95);for(const x of[-4.5,4.5])box(.6,1.1,6,silver,x,-.8,1.6);}
  if(t===3){box(8.5,1.4,6.8,shell,0,.5,-.5);for(const x of[-4.3,4.3])box(1.1,4.5,5.8,shell,x,-1.5,-.5);box(8.6,3.6,1,dark,0,-1,-3.5);box(6.7,.6,.6,accent,0,.05,3.1);}
 }else if(slot==='armor'){
  box(6.3,6.6,.65,shell);for(const x of[-2.8,2.8]){const p=box(1.1,3,.8,dark,x,2.5,0);p.rotation.z=-Math.sign(x)*.16;}
  box(.35,6.1,.25,silver,0,0,.45);box(6.5,.65,.9,dark,0,-3,0);
  if(t===0)box(2.1,1.4,.5,dark,-1.7,.9,.6);
  if(t===1){for(const x of[-1.6,1.6]){box(2.2,2.1,.8,dark,x,-.5,.6);box(1.9,.45,.2,accent,x,.4,1.1);}}
  if(t===2){box(4.7,3.3,.65,silver,0,.4,.7);for(const x of[-2.5,2.5])box(.55,4.7,.6,accent,x,0,.7);}
  if(t===3){box(4.8,2.5,.9,dark,0,1,.8);box(2.5,.5,.2,accent,0,1.4,1.4);for(const x of[-1.8,1.8])box(1.1,2.5,1,silver,x,-1.6,.7);}
 }else if(slot==='gloves'||slot==='boots'){
  for(const x of single?[0]:[-1.6,1.6]){
   if(slot==='gloves'){
    box(1.8,2.2,1.5,dark,x);box(2.1,.65,1.8,shell,x,1);box(1.4,.8,.35,shell,x,-.25,.9);
    if(t===1)for(const dx of[-.45,.45])box(.5,.65,.5,silver,x+dx,-.5,1.1);
    if(t===2){box(1.6,1.8,.55,silver,x,.3,1);box(1.2,.35,.2,accent,x,.6,1.4);}
    if(t===3){for(const dx of[-.7,.7])box(.4,3.4,.6,shell,x+dx,.4,.9);box(.55,1.5,.35,accent,x,.5,1.35);}
   }else{
    box(2,2.5,2,shell,x,.6);box(2.2,.9,3.4,shell,x,-.6,.65);box(2.3,.55,3.6,dark,x,-1.2,.65);box(1.3,.25,.15,accent,x,.8,1.1);
    if(t===1){box(1.6,1.4,.8,dark,x,1.7,-.5);box(1.6,.4,.4,silver,x,-.3,2.2);}
    if(t===2){box(2.5,1,2.6,silver,x,.6,.1);box(1.7,.4,.3,accent,x,-.5,2.45);}
    if(t===3){for(const z of[-.5,1.7]){const wheel=cyl(.5,.5,2.6,dark,x,-1.55,z);wheel.rotation.z=Math.PI/2;}box(1.5,.7,.3,accent,x,.3,1.3);}
   }
  }
 }else if(slot==='offhand'){
  if(t===0){box(3,4.1,1.8,shell);for(const y of[-1,-.3,.4])box(2.2,.2,.2,dark,0,y,1);box(1.8,.55,.2,accent,0,1.2,1);}
  if(t===1){box(3.8,4.6,.9,shell);box(2.6,3.3,.55,dark,0,0,.65);for(const x of[-1,1])box(.35,2.4,.25,accent,x,0,1);}
  if(t===2){box(3.1,4.4,1.4,dark);box(2.2,1.6,.2,accent,0,.8,.8);cyl(.15,.15,3.5,silver,1.1,3.6);for(const x of[-.8,0,.8])box(.35,.35,.2,silver,x,-1,.8);}
  if(t===3){box(2.8,4,1.5,dark);for(const x of[-1.5,1.5])box(.65,4.8,1.9,silver,x);box(2.1,.55,.2,accent,0,.9,.9);box(1.6,.5,.2,silver,0,-.8,.9);}
 }else{
  box(2.8,2.1,1.2,dark);if(t===0){box(1.8,.7,.2,accent,-.2,.3,.7);box(.45,.45,.2,silver,.9,-.5,.7);}
  if(t===1){box(1.6,1.4,.2,accent,-.3,0,.7);box(.3,1.4,.3,silver,1,0,.7);cyl(.12,.12,1.8,silver,1.1,1.7);}
  if(t===2){box(2.1,1.4,.2,shell,0,.1,.7);box(1.6,.25,.2,dark,0,.3,.9);box(.5,.4,.2,accent,.6,-.3,.9);}
  if(t===3){for(const x of[-1,1])box(.5,2.3,1.5,silver,x);box(1.2,.45,.2,accent,0,.4,.75);box(.5,.3,.2,shell,0,-.5,.75);}
 }
 return g;
}
