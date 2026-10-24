const assert=require('node:assert/strict'),fs=require('node:fs'),{createRuntime}=require('./lib/offline-runtime.cjs');const r=createRuntime(82);
r.evaluate(`
 let checks=0;const ensure=(x,m)=>{checks++;if(!x)throw Error(m)};
 ensure(Object.keys(ASC_TALENTS).length===12,'12 ascensions');ensure(Object.values(ASC_TALENTS).flat().length===72,'72 nodes');
 ensure(ascensionBudget(19,18,true)===0&&ascensionBudget(20,8,true)===2&&ascensionBudget(30,12,true)===3&&ascensionBudget(40,18,true)===4,'bounded progression');
 G.lvl=40;G.maxDepth=18;G.bossKills=10;G.gold=100000;G.run=null;G.train=null;
 for(const[job,ascs]of Object.entries(ASCENSIONS))for(const a of ascs){G.char=job;G.ascension=a.id;G.ascensionNodes=[];const defs=ASC_TALENTS[a.id];ensure(defs.length===6&&defs.filter(n=>n.parent).length===3,'three two-node branches');
  for(const core of defs.filter(n=>n.parent)){G.ascensionNodes=[];ensure(!allocateAscensionNode(core.id),'requires parent');ensure(allocateAscensionNode(core.parent)&&allocateAscensionNode(core.id),'allocate branch');ensure(!allocateAscensionNode(core.id),'no duplicate');ensure(!ascensionNodeState(core.parent).refund,'cannot refund bridge');const saved=serialize();ensure(applySave(copyState(saved))&&G.ascensionNodes.includes(core.id),'roundtrip preserves exact branch');}
  G.ascensionNodes=[];for(const root of defs.filter(n=>!n.parent))allocateAscensionNode(root.id);const core=defs.find(n=>n.parent);ensure(allocateAscensionNode(core.id),'fourth point');ensure(G.ascensionNodes.length===4&&!allocateAscensionNode(defs.find(n=>n.parent&&n.id!==core.id).id),'fifth blocked');
  const foreign=Object.values(ASC_TALENTS).flat().find(n=>n.asc!==a.id);ensure(!allocateAscensionNode(foreign.id),'foreign node blocked');
  const before=JSON.stringify(G.ascensionNodes),gold=G.gold;const expected={asc:a.id,cost:25*G.lvl,nodes:before};ensure(!refundAscensionNode(core.id,{...expected,cost:0})&&G.gold===gold,'stale refund charges nothing');ensure(refundAscensionNode(core.id,expected),'leaf refund');ensure(G.gold===gold-1000&&!refundAscensionNode(core.id,expected),'exactly once fee');
  const reset={asc:a.id,cost:25*G.lvl*G.ascensionNodes.length,nodes:JSON.stringify(G.ascensionNodes)};ensure(resetAscensionNodes(reset),'reset pays actual count');ensure(!resetAscensionNodes(reset),'reset once');
  G.run={};ensure(!allocateAscensionNode(defs[0].id),'challenge lock');G.run=null;
  const cleaned=ascensionCleanNodes(a.id,[defs[1].id,defs[0].id,'__proto__',foreign.id,defs[0].id],40,18);ensure(cleaned.length===2&&cleaned.includes(defs[0].id)&&cleaned.includes(defs[1].id),'untrusted nodes sanitized and topologically ordered');
 }
 G.char='street';G.ascension='ground';G.ascensionNodes=['ground.shell','ground.shell.core'];const imported=serialize();delete imported.ascensionNodes;ensure(applySave(imported)&&G.ascensionNodes.length===0,'old save never auto-allocates');
 G.ascensionNodes=['ground.shell','ground.shell.core'];G.gold=100000;ensure(chooseAscension('arc')&&G.ascensionNodes.length===0,'changing ascension releases all nodes');
 JSON.stringify({checks});
`);console.log('PASS',r.evaluate('checks'),'ascension allocation, prerequisites, limits, refunds, save migration and class isolation assertions');
function probe(job,asc,nodes,spread=false){const p=createRuntime(21);return JSON.parse(p.evaluate(`
 G.char=${JSON.stringify(job)};G.ascension=${JSON.stringify(asc)};G.ascensionNodes=${JSON.stringify(nodes)};G.lvl=40;G.maxDepth=18;G.bossKills=10;G.offline=true;G.time=0;G.characterRuntime=null;recalc();G.h.hp=G.st.life*.5;G.h.buffer=0;G.h.bufferUntil=0;G.h.x=HX;G.h.y=HY;
 const locations=${spread?'[6,38,47,53]':'Array.from({length:12},(_,i)=>6+i)'};G.mons=locations.map(x=>({x:HX+x,y:HY,hp:1e10,hpMax:1e12,dead:false,fall:0,frozen:${spread?0:1}}));
 let damage=0,hits=0,healing=0;hitMon=(m,n)=>{damage+=n;hits++;};rollDmg=n=>({dmg:n,crit:false});heroRecover=n=>{healing+=n;return n};
 for(let i=0;i<40;i++)characterBasicHit({dead:true});const runtime=characterRuntime(),comboBefore=runtime.combo;runtime.receipt=true;y2kSignature(G.mons,G.st);const echo=runtime.echoAt||0;let freeze=G.mons[0].frozen;G.time=4;characterCombatTick(.05);let beats=runtime.combo,progress=G.sigT||0;
 for(let i=0;i<18;i++){G.time+=2;characterCombatTick(2);}freeze=Math.max(freeze,...G.mons.map(m=>m.frozen||0));
 JSON.stringify({damage:+damage.toFixed(6),hits,healing:+healing.toFixed(6),echo,freeze,beats,comboBefore,progress,shield:G.h.buffer,shieldUntil:G.h.bufferUntil,petCd:runtime.petCd,life:G.st.life,armor:G.st.armor,regen:G.st.regen,dodge:G.st.dodge,signatureCd:G.st.signatureCd});
 `));}
const defs=JSON.parse(r.evaluate('JSON.stringify(ASC_TALENTS)')),jobs=JSON.parse(r.evaluate('JSON.stringify(ASCENSIONS)')),rows=[];
for(const[job,ascs]of Object.entries(jobs))for(const asc of ascs)for(const core of defs[asc.id].filter(n=>n.parent)){
 const a=[probe(job,asc.id,[core.parent]),probe(job,asc.id,[core.parent],true)],b=[probe(job,asc.id,[core.parent,core.id]),probe(job,asc.id,[core.parent,core.id],true)];
 assert.notDeepEqual(b,a,'core has no measured runtime effect: '+core.id);rows.push({job,ascension:asc.id,node:core.id,baseline:a,allocated:b});
}
const path=process.env.GAME_LAB_ASC_EFFECTS||'docs/window-ui-ascensions-2026-10-24/node-effects.json';fs.writeFileSync(path,JSON.stringify({scenario:'Fixed level 40 direct profession probes, dense and spaced targets; requested recovery is instrumented before shared cap, not actual healing',rows},null,2)+'\n');console.log('PASS all 36 characteristic cores change actual runtime probe results');
