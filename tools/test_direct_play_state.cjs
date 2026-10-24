const assert=require('node:assert/strict'),{createRuntime}=require('./lib/offline-runtime.cjs');const r=createRuntime(71);
r.evaluate(`
 const ensure=(ok,msg)=>{if(!ok)throw Error(msg)};
 G.h.dead=0;G.h.x=HX;G.h.y=HY;G.drops=[];G.gold=0;
 const d={kind:'gold',amount:9,x:HX+PICKUP_RANGE*.9,y:HY,t:.4};G.drops=[d];
 collectNearby(.1);ensure(G.gold===0&&G.drops.length===1&&d.pull,'pull begins before payment');
 const pos=dropVisualPosition(d);ensure(pos.x<d.x&&pos.x>G.h.x,'actual item interpolates toward hero');
 const saved=JSON.parse(JSON.stringify(serialize()));ensure(applySave(saved),'midflight save');
 ensure(G.drops.length===1&&G.drops[0].pull&&G.gold===0,'pull preserved, not paid on load');
 G.h.dead=1;const age=G.drops[0].pull.age;collectNearby(.5);ensure(G.drops[0].pull.age===age&&G.gold===0,'death pauses pickup');G.h.dead=0;
 collectNearby(2);ensure(G.gold===9&&G.drops.length===0,'arrives once');collectNearby(2);ensure(G.gold===9,'no double payment');
 G.drops=[{kind:'chip',amount:3,x:G.h.x+PICKUP_RANGE+1,y:G.h.y,t:1}];collectNearby(2);ensure(G.chips===0&&!G.drops[0].pull,'range unchanged');
 G.drops[0].x=G.h.x;G.offline=true;collectNearby(.01);G.offline=false;ensure(G.chips===3&&!G.drops.length,'offline pickup settles without rendering');
 for(const id of Object.keys(CHARS)){G.startingChar=id;G.char=id;ensure(charOk(id),'chosen starter available');const save=serialize();G.startingChar=null;ensure(applySave(save)&&G.startingChar===id&&G.char===id,'starter persists');}
 const bad=serialize();bad.startingChar='__proto__';bad.char='constructor';ensure(applySave(bad)&&G.startingChar===null&&G.char==='street'&&!charOk('__proto__'),'imported character keys must be own known entries');
 const old=serialize();delete old.startingChar;ensure(applySave(old)&&G.startingChar===null,'old save does not invent a starter');
`);
console.log('PASS physical pickup delay, midflight save, death, range, offline and exactly-once reward; initial character unlock and old-save compatibility');
