/* Fixed dummy probe: same gear, no deaths, 180 seconds; not a progression simulation. */
const fs=require('node:fs'),assert=require('node:assert/strict'),{createRuntime}=require('./lib/offline-runtime.cjs');
const rows=[];
for(const count of [1,8])for(const job of ['street','frost','beep','volt'])for(const asc of [null,...({street:['ground','arc','drive'],frost:['echo','still','pace'],beep:['snipe','split','shadow'],volt:['dual','repair','melt']}[job])]){
 const r=createRuntime(311);const data=r.evaluate(`
 G.char=${JSON.stringify(job)};G.ascension=${JSON.stringify(asc)};G.lvl=30;G.offline=true;G.time=0;G.characterRuntime=null;recalc();G.h.hp=G.st.life*.5;G.h.x=HX;G.h.y=HY;
 G.mons=Array.from({length:${count}},(_,i)=>({x:HX+8+i,y:HY,hp:1e12,hpMax:1e12,dead:false,fall:0,boss:false,frozen:0}));
 let damage=0,petDamage=0,healed=0,freezes=0,nextBasic=0,nextSig=0;
 const actualFreeze=applyFreeze;applyFreeze=(...args)=>{const yes=actualFreeze(...args);if(yes)freezes++;return yes;};
 hitMon=(m,n,crit,source)=>{damage+=n;if(source)petDamage+=n;};rollDmg=n=>({dmg:n*(1+G.st.crit/100*(G.st.cm/100-1)),crit:false});heroRecover=n=>{healed+=n;return n;};
 for(let i=0;i<3600;i++){G.time=i*.05;if(G.time>=nextBasic){const crit=1+G.st.crit/100*(G.st.cm/100-1);damage+=G.st.hit*crit;characterBasicHit(G.mons[0]);nextBasic=G.time+1/G.st.aps;}if(G.time>=nextSig){y2kSignature(G.mons,G.st);nextSig=G.time+G.st.signatureCd;}characterCombatTick(.05);}
 JSON.stringify({job:G.char,ascension:G.ascension,targets:${count},life:G.st.life,dps:Math.round(damage/180*100)/100,petDps:Math.round(petDamage/180*100)/100,recoveryRequested:Math.round(healed),freezes});`);
 rows.push(JSON.parse(data));
}
for(const row of rows){const base=rows.find(r=>r.job===row.job&&r.targets===row.targets&&!r.ascension);row.relative=+(row.dps/base.dps).toFixed(3);assert(Number.isFinite(row.relative)&&row.relative>.65&&row.relative<1.7,'outlier '+JSON.stringify(row));}
const out=process.argv[2]||'docs/classes-circuits-2026-10-24/balance.json';fs.writeFileSync(out,JSON.stringify({scenario:'180-second fixed dummy probe, level 30 identical gear, basic attacks and profession mechanics only; recovery request is uncapped instrumentation, not actual healing',rows},null,2)+'\n');console.log('PASS 32 base/ascension single-target and eight-target probes; all ascension damage ratios within 0.65–1.70 of own base. '+out);
