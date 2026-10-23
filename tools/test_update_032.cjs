const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createRuntime}=require('./lib/offline-runtime.cjs');let count=0;
function check(name,code){const r=createRuntime(17);// Assertions inspect the actual runtime result.
 const result=r.evaluate(code);assert.equal(result,true,name);count++;console.log('PASS',name);}
check('suspension blocks every award consumer and level reward, preserving saved benefits',`(()=>{
 G.cards[Object.keys(CARDS)[0]]=2;G.relics.FOOD=1;G.picks=3;G.relicPicks=2;G.autoCard=true;
 const before=JSON.stringify([G.cards,G.relics,G.picks,G.relicPicks]);takeCard(Object.keys(CARDS)[0]);takeRelic('FOOD');resolveOfflineChoices({cards:[]});gainXp(200);
 return JSON.stringify([G.cards,G.relics,G.picks,G.relicPicks])===before&&G.lvl>1&&!cardsHtml().includes('onclick');})()`);
check('AOE, repeated casts and kill recovery share a bounded healing budget',`(()=>{
 G.st.life=1000;G.h.hp=100;G.time=0;for(let i=0;i<100;i++)heroRecover(1e9);if(G.h.hp!==125)return false;
 for(let i=1;i<=10;i++){G.time=i/10;for(let j=0;j<20;j++)heroRecover(1e9);}return Math.abs(G.h.hp-150)<1e-8;})()`);
check('damage records a regeneration delay, shield-only damage does not',`(()=>{
 G.time=10;G.h.hp=100;G.h.buffer=20;G.h.bufferUntil=20;heroDamage(10);if(G.h.lastDamageAt!=null)return false;
 heroDamage(15);return G.h.hp===95&&G.h.lastDamageAt===10;})()`);
check('small critical hits cannot be larger than large ordinary damage',`(()=>{
 const values=[0,1,10,100,1000,10000,1e9].map(damageFloatSize);return values.every((v,i)=>v>=12&&v<=26&&(!i||v>=values[i-1]))&&values[1]<values[4];})()`);
check('120 seeded maps stay connected and deterministic without consuming combat RNG',`(()=>{
 const shapes=new Set(),sizes=new Set();for(let n=0;n<120;n++){
 const p=terrainBuild('map:test-'+n+':0'),q=terrainBuild(p.key);shapes.add(p.profile);sizes.add(p.bounds.join());if(p.cells.length!==q.cells.length||!terrainCell(HX,HY,p))return false;
 const visited=new Set([p.cells[0].k]),queue=[p.cells[0]];for(let a=0;a<queue.length;a++){const c=queue[a];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const other=p.lookup.get((c.j+dj)*p.nx+c.i+di);if(other&&!visited.has(other.k)&&Math.abs(c.i-other.i)+Math.abs(c.j-other.j)===1){visited.add(other.k);queue.push(other);}}}
 if(visited.size!==p.cells.length)return false;for(const c of p.edges){const [x,y]=terrainProject(c.x*50,c.y*50,p);if(!terrainCell(x,y,p))return false;}
 }return shapes.size===12&&sizes.size>20;})()`);
check('real navigation crosses twelve map shapes without cutting holes or stalling',`(()=>{
 const seen=new Set();for(let n=0;n<180;n++){
 G.run={map:{id:'nav-'+n}};const p=terrainNow();if(seen.has(p.profile))continue;seen.add(p.profile);
 for(let k=0;k<8;k++){const from=p.edges[k*17%p.edges.length],to=p.edges[(k*23+30)%p.edges.length],e={x:from.x,y:from.y};let steps=0;
 while(Math.hypot(e.x-to.x,e.y-to.y)>1&&steps++<2400){const [x,y]=terrainWaypoint(e.x,e.y,to.x,to.y),d=Math.hypot(x-e.x,y-e.y),v=Math.min(1,d);terrainMove(e,e.x+(x-e.x)/(d||1)*v,e.y+(y-e.y)/(d||1)*v);if(!terrainCell(e.x,e.y))return false;}if(steps>=2400)return false;}
 }return seen.size===12;})()`);
// UI payload is pure; never opens or submits an actual GitHub issue.
const ctx={console,document:{createElement:()=>({}),head:{appendChild:()=>{}}},GridLab:require('../src/game/00-grid.js'),location:{search:''}};vm.createContext(ctx);
for(const f of ['01-data.js','05g-layout.js'])vm.runInContext(fs.readFileSync('src/game/'+f,'utf8'),ctx);
const payload=vm.runInContext(`feedbackPayload({category:'平衡',title:'測試 <標題>',details:'血量下降太慢 & 改善建議',device:false},'PRIVATE DEVICE')`,ctx);
assert(payload&&payload.url.startsWith('https://github.com/yauchai2/Game-Lab/issues/new?'));assert(!payload.body.includes('PRIVATE DEVICE'));assert(!payload.body.includes('save'));assert.equal(new URL(payload.url).searchParams.get('body'),payload.body);assert.equal(vm.runInContext(`feedbackPayload({category:'錯誤',title:' ',details:'x'})`,ctx),null);console.log('PASS feedback validates and URL-encodes only previewed fields, with optional device data');count++;
console.log(`${count} update checks passed`);
