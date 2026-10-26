/* Acquireable circuit boards. Legacy geometry is read only during migration. */
(function(root){
 const old=typeof module!=='undefined'?require('./00-grid-legacy.js'):root.LegacyGrid;
 const GEM_COLOR={VENOM:'g',RIME:'b',KINDLE:'r',ANCHOR:'r',EXECUTE:'r',BLOOD:'r',CONDUCT:'b',LONG:'g',SPREAD:'g',HEAVY:'r',FOCUS:'r',DELAY:'r',RECOVER:'r',HASTE:'b',COOL:'b',CRYSTAL:'b',TWIN:'b',AREA:'g',FORK:'g',LEECH:'g',CRITS:'g'};
 const TIER_MUL=[1,1.35,1.65],TIER_COST=[1,2,3];
 const TEMPLATES={
  pocket:{n:'起步微板',size:3,seed:0,lvl:1,depth:0,power:3},
  pocket_v:{n:'直列微板',size:3,seed:1,lvl:1,depth:0,power:3},
  duplex:{n:'雙軌改裝板',size:4,seed:2,lvl:8,depth:3,power:5},
  duplex_v:{n:'轉向雙軌板',size:4,seed:3,lvl:8,depth:3,power:5},
  matrix:{n:'矩陣擴充板',size:6,seed:4,lvl:18,depth:8,power:8},
  matrix_v:{n:'交錯矩陣板',size:6,seed:5,lvl:18,depth:8,power:8},
  extreme:{n:'極限匯流板',size:8,seed:6,lvl:32,depth:18,power:12},
  extreme_v:{n:'垂直匯流板',size:8,seed:7,lvl:32,depth:18,power:12},
  triad:{n:'三拍微型板',size:4,seed:8,lvl:14,depth:6,power:6,shape:'triad',note:'三路端口，緊湊三色洞'},
  annulus:{n:'月環電路板',size:6,seed:9,lvl:20,depth:10,power:8,shape:'ring',note:'中央留空，沿外圈佈線'},
  spindle:{n:'四葉匯流板',size:6,seed:10,lvl:24,depth:12,power:9,shape:'cross',note:'四角隔離，中心供電'},
  cassette:{n:'雙槽卡匣板',size:6,seed:11,lvl:22,depth:11,power:8,shape:'cassette',note:'雙側機艙，橫向繞接'},
  dualbridge:{n:'雙橋主機板',size:8,seed:12,lvl:36,depth:20,power:12,shape:'bridge',note:'四路端口，跨橋分流'},
  prism:{n:'稜鏡矩陣板',size:8,seed:13,lvl:40,depth:24,power:12,shape:'prism',note:'斜向隔離，鏡像洞色'},
  legacy:{n:'舊式保留板',size:8,seed:0,lvl:1,depth:0,power:12,legacy:true}
 };
 /* 進階電路板（規則 2）：終點不再和起點直接對面；每板的終點位置與一組已驗證的解（自動接線與測試用）。 */
 const NEWSOCK={
  matrix:[[7,5],[4,0],[4,7],[0,2]],
  matrix_v:[[4,0],[0,5],[7,2],[4,7]],
  annulus:[[4,0],[0,5],[7,2],[3,7]],
  spindle:[[7,5],[4,0],[3,7],[0,2]],
  cassette:[[0,1],[4,7],[3,0],[7,6]],
  dualbridge:[[9,4],[5,0],[9,8],[0,5]],
  prism:[[4,0],[0,7],[9,2],[4,9]],
  extreme_v:[[2,0],[2,9],[6,0],[3,9],[7,0],[7,9]]
 };
 const SOL={
  matrix:[[[1,1],[2,1],[3,1],[3,2],[4,2],[5,2],[5,3],[5,4],[6,4],[6,5]],[[6,3],[6,2],[6,1],[5,1],[4,1]],[[1,4],[1,5],[2,5],[2,6],[3,6],[4,6]],[[6,6],[5,6],[5,5],[4,5],[4,4],[3,4],[2,4],[2,3],[1,3],[1,2]]],
  matrix_v:[[[1,6],[2,6],[2,5],[2,4],[2,3],[3,3],[3,2],[3,1],[4,1]],[[2,1],[1,1],[1,2],[1,3],[1,4],[1,5]],[[5,6],[6,6],[6,5],[6,4],[6,3],[6,2]],[[6,1],[5,1],[5,2],[5,3],[4,3],[4,4],[4,5],[4,6]]],
  annulus:[[[1,6],[2,6],[2,5],[2,4],[2,3],[2,2],[3,2],[4,2],[4,1]],[[2,1],[1,1],[1,2],[1,3],[1,4],[1,5]],[[5,6],[6,6],[6,5],[6,4],[6,3],[6,2]],[[6,1],[5,1],[5,2],[5,3],[5,4],[5,5],[4,5],[3,5],[3,6]]],
  spindle:[[[1,1],[2,1],[3,1],[3,2],[4,2],[4,3],[5,3],[5,4],[6,4],[6,5]],[[6,3],[6,2],[6,1],[5,1],[4,1]],[[1,4],[1,5],[1,6],[2,6],[3,6]],[[6,6],[5,6],[4,6],[4,5],[3,5],[3,4],[2,4],[2,3],[1,3],[1,2]]],
  cassette:[[[1,6],[1,5],[1,4],[1,3],[1,2],[1,1]],[[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[3,6],[4,6]],[[5,6],[5,5],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1]],[[6,1],[6,2],[6,3],[6,4],[6,5],[6,6]]],
  dualbridge:[[[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[7,3],[7,4],[8,4]],[[8,3],[8,2],[8,1],[7,1],[6,1],[5,1]],[[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[7,7],[7,8],[8,8]],[[8,7],[8,6],[8,5],[7,5],[6,5],[5,5],[5,4],[5,3],[4,3],[3,3],[2,3],[1,3],[1,4],[1,5]]],
  prism:[[[1,8],[2,8],[3,8],[3,7],[4,7],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1]],[[3,1],[2,1],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7]],[[6,8],[7,8],[8,8],[8,7],[8,6],[8,5],[8,4],[8,3],[8,2]],[[8,1],[7,1],[6,1],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[4,8]]],
  extreme_v:[[[1,8],[1,7],[1,6],[1,5],[1,4],[1,3],[2,3],[2,2],[2,1]],[[3,1],[3,2],[3,3],[3,4],[3,5],[2,5],[2,6],[2,7],[2,8]],[[4,8],[5,8],[5,7],[5,6],[5,5],[5,4],[5,3],[5,2],[6,2],[6,1]],[[5,1],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[3,6],[3,7],[3,8]],[[6,8],[6,7],[6,6],[6,5],[6,4],[6,3],[7,3],[7,2],[7,1]],[[8,1],[8,2],[8,3],[8,4],[8,5],[7,5],[7,6],[7,7],[7,8]]]
 };
 const CACHE={};
 function layout(b){
  const id=b&&Object.hasOwn(TEMPLATES,b.template)?b.template:'pocket',r2=!!(b&&b.rules>=2&&NEWSOCK[id]),ck=r2?id+'#2':id;if(CACHE[ck])return CACHE[ck];const t=TEMPLATES[id];
  if(t.legacy)return CACHE[ck]={...t,id,w:10,h:10,socks:old.SOCKS,srcs:old.SRCS,colors:['r','b','g','y','v','c'],levels:old.SOCK_LV,rocks:old.ROCKS,pads:old.PADS};
  const n=t.size,vertical=t.seed%2===1,rows=t.shape==='triad'?[1,2,4]:t.shape==='bridge'?[2,3,6,7]:t.shape==='prism'?[1,3,6,8]:n===3?[2]:n===4?(vertical?[2,3]:[1,4]):n===6?(vertical?[1,2,5,6]:[1,3,4,6]):(vertical?[1,3,4,5,6,8]:[1,2,4,5,7,8]);
  const srcs=rows.map((r,i)=>vertical?[r,i%2?0:n+1]:[i%2?n+1:0,r]);
  const socks=rows.map((r,i)=>vertical?[r,i%2?n+1:0]:[i%2?0:n+1,r]);
  const colors=rows.map((_,i)=>['r','b','g','y','v','c'][i]);
  const rocks=[];for(let y=2;y<n;y++)for(let x=2;x<n;x++)if(!(vertical?rows.includes(x):rows.includes(y))&&(x*7+y*11+t.seed)%5===0&&rocks.length<Math.floor(n/2))rocks.push([x,y]);
  if(t.shape){rocks.length=0;const patterns={ring:[[3,3],[4,3],[3,4],[4,4]],cross:[[2,2],[5,2],[2,5],[5,5]],cassette:[[3,2],[4,2],[3,5],[4,5]],bridge:[[4,1],[4,4],[4,5],[4,8]],prism:[[2,2],[3,3],[6,6],[7,7]]};for(const point of patterns[t.shape]||[])rocks.push(point);}
  const pads=[];for(let y=1;y<=n;y++)for(let x=1;x<=n;x++)if(!rocks.some(p=>p[0]===x&&p[1]===y))pads.push([x,y,['r','b','g'][(t.shape==='prism'?Math.abs(x-y)+t.seed:t.shape==='cassette'?x+2*y+t.seed:x+y+t.seed)%3]]);
  return CACHE[ck]={...t,id,w:n+2,h:n+2,socks:r2?NEWSOCK[id]:socks,srcs,colors,levels:rows.map(()=>1),rocks,pads};
 }
 const same=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];
 const isInner=(x,y,b)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=1&&y>=1&&x<layout(b).w-1&&y<layout(b).h-1;
 const isRock=(x,y,b)=>layout(b).rocks.some(p=>same(p,[x,y]));
 const padAt=(x,y,b)=>layout(b).pads.find(p=>same(p,[x,y]));
 const isPad=(x,y,b)=>!!padAt(x,y,b),padColor=(x,y,b)=>padAt(x,y,b)?.[2]||null;
 const sockAt=(x,y,b)=>layout(b).socks.findIndex(p=>same(p,[x,y]));
 const sockIndex=(p,b)=>sockAt(p.x,p.y,b);
 const edgeInner=(p,L)=>[Math.max(1,Math.min(L.w-2,p[0])),Math.max(1,Math.min(L.h-2,p[1]))];
 const startOf=(i,b)=>edgeInner(layout(b).srcs[i]||[-9,-9],layout(b)),endOf=(i,b)=>edgeInner(layout(b).socks[i]||[-9,-9],layout(b));
 const unlockedCount=(b,lvl=999)=>layout(b).legacy?old.levelSockets(lvl):layout(b).socks.length;
 const pieceAt=(b,x,y,kind)=>b.pieces.find(p=>p.x===x&&p.y===y&&(!kind||p.kind===kind));
 const getWire=(b,i)=>b.wires.find(w=>w.sock===i),wireOf=(b,x,y)=>b.wires.find(w=>w.cells.some(c=>same(c,[x,y])));
 const wireLen=b=>b.wires.reduce((n,w)=>n+w.cells.length,0);
 const wireCellSet=(b,except)=>new Set(b.wires.filter(w=>w.sock!==except).flatMap(w=>w.cells.map(c=>c.join(','))));
 const powerUsed=b=>b.pieces.filter(p=>p.kind==='support').reduce((n,p)=>n+TIER_COST[Math.max(0,Math.min(2,(p.t||1)-1))],0);
 function validPath(b,w){
  if(!w||!Number.isInteger(w.sock)||!layout(b).socks[w.sock]||!Array.isArray(w.cells)||!w.cells.length)return false;
  if(b.wires.filter(q=>q.sock===w.sock).length>1)return false;
  const seen=new Set(),occupied=wireCellSet(b,w.sock);let last=null;
  for(const c of w.cells){if(!Array.isArray(c)||!isInner(c[0],c[1],b)||isRock(c[0],c[1],b)||seen.has(c.join(','))||occupied.has(c.join(',')))return false;
   if(last?Math.abs(c[0]-last[0])+Math.abs(c[1]-last[1])!==1:!same(c,startOf(w.sock,b)))return false;seen.add(c.join(','));last=c;
  }return true;
 }
 const connected=(b,i)=>{const w=getWire(b,i);return validPath(b,w)&&same(w.cells.at(-1),endOf(i,b));};
 function createBoard(template='pocket',rules=2){const b={v:6,rules,template:Object.hasOwn(TEMPLATES,template)?template:'pocket',pieces:[],wires:[],nextId:1,extra:0};const L=layout(b);b.w=L.w;b.h=L.h;return b;}
 function canPlace(b,kind,key,x,y,rot=0,ignoreId=null,t=1){
  if(!Object.hasOwn(kind==='active'?old.ACTIVES:old.SUPPORTS,key))return false;
  if(pieceAt(b,x,y)?.id!==ignoreId&&pieceAt(b,x,y))return false;
  if(kind==='active')return sockAt(x,y,b)>=0&&!b.pieces.some(p=>p.kind==='active'&&p.key===key&&p.id!==ignoreId);
  if(kind!=='support'||!isPad(x,y,b)||isRock(x,y,b)||padColor(x,y,b)!==GEM_COLOR[key])return false;
  const before=b.pieces.find(p=>p.id===ignoreId&&p.kind==='support'),used=powerUsed(b)-(before?TIER_COST[(before.t||1)-1]:0);
  return used+TIER_COST[Math.max(0,Math.min(2,t-1))]<=layout(b).power;
 }
 function place(b,kind,key,x,y,rot=0,opts={}){const t=Math.max(1,Math.min(3,opts?.t|0||1));if(!canPlace(b,kind,key,x,y,rot,null,t))return null;const p={id:b.nextId++,kind,key,x,y,rot:0};if(kind==='support')p.t=t;b.pieces.push(p);return p;}
 function remove(b,id){const i=b.pieces.findIndex(p=>p.id===id);if(i<0)return false;b.pieces.splice(i,1);return true;}
 function extend(b,i,x,y,lvl=999){
  if(i<0||i>=unlockedCount(b,lvl))return {ok:false,reason:'此終點尚未開放'};
  if(!isInner(x,y,b)||isRock(x,y,b))return {ok:false,reason:'這格不能走線'};
  let w=getWire(b,i);if(connected(b,i))return {ok:false,reason:'此線已接通，可從線尾收回'};
  const last=w?.cells.at(-1);if(last?Math.abs(last[0]-x)+Math.abs(last[1]-y)!==1:!same([x,y],startOf(i,b)))return {ok:false,reason:'請從電源旁開始，逐格相連'};
  if(wireCellSet(b).has([x,y].join(',')))return {ok:false,reason:'這格已有電線'};
  if(!w){w={sock:i,cells:[]};b.wires.push(w);}w.cells.push([x,y]);return {ok:true,connected:connected(b,i)};
 }
 function shrink(b,i){const w=getWire(b,i);if(!w?.cells.length)return false;w.cells.pop();if(!w.cells.length)b.wires=b.wires.filter(q=>q!==w);return true;}
 function clearWire(b,i){b.wires=b.wires.filter(w=>w.sock!==i);}
 function route(b,i){
  const known=b.rules>=2?SOL[b.template]?.[i]:null,usedK=wireCellSet(b,i);if(known&&!known.some(c=>usedK.has(c.join(','))))return known.map(c=>c.slice());
  const from=startOf(i,b),to=endOf(i,b),used=wireCellSet(b,i),q=[[from]],seen=new Set([from.join(',')]);
  while(q.length){const path=q.shift(),p=path.at(-1);if(same(p,to))return path;for(const[dX,dY]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dX,p[1]+dY],k=n.join(',');if(isInner(...n,b)&&!isRock(...n,b)&&!used.has(k)&&!seen.has(k)){seen.add(k);q.push([...path,n]);}}}return null;
 }
 const CHAIN_MAX=6,CHAIN_BONUS=.25;
 function strength(b,p){return TIER_MUL[(p.t||1)-1];}
 function resolve(b,lvl=999){
  const out=[];for(const a of b.pieces.filter(p=>p.kind==='active')){const i=sockIndex(a,b),wire=i<unlockedCount(b,lvl)&&connected(b,i)?getWire(b,i):null,linked=[],weights=[],over=[],missed=[];
   if(wire)for(const[x,y]of wire.cells){const p=pieceAt(b,x,y,'support');if(!p)continue;if(padColor(x,y,b)!==GEM_COLOR[p.key]||!old.fits(p.key,a)){missed.push(p.id);continue;}if(linked.length>=CHAIN_MAX){over.push(p.id);continue;}linked.push(p.id);weights.push(strength(b,p));}
   if(linked.length>1){const chain=1+CHAIN_BONUS*(linked.length-1);for(let j=0;j<weights.length;j++)weights[j]*=chain;}   /* 連得越多越強：每多一個配件，全部配件效果再 +25% */
   const stat={dmg:0,area:0,cd:0,crit:0,repeat:0,leech:0};linked.forEach((id,j)=>{const p=b.pieces.find(p=>p.id===id);for(const[k,v]of Object.entries(old.SUPPORTS[p.key].mod))stat[k]=(stat[k]||0)+v*weights[j];});
   out.push({id:a.id,key:a.key,sock:i,wired:!!wire,linked,weights,over,missed,stat});
  }return out.sort((a,b)=>a.sock-b.sock);
 }
 function normalize(raw){
  const hasWires=(Array.isArray(raw?.wires)?raw.wires:[]).some(w=>Array.isArray(w?.cells)&&w.cells.length),oldRules=raw?.rules>=2?2:1,rules=oldRules===2||!hasWires?2:1,b=createBoard(raw?.template,rules);
  const oldL=rules===2&&oldRules===1?layout({template:b.template,rules:1}):null,newL=layout(b);
  for(const kind of['active','support'])for(const p0 of(Array.isArray(raw?.pieces)?raw.pieces:[]).slice(0,80)){if(!p0||p0.kind!==kind)continue;const p={...p0};
   if(oldL&&kind==='active'){const k=oldL.socks.findIndex(c=>c[0]===p.x&&c[1]===p.y);if(k>=0&&newL.socks[k]){p.x=newL.socks[k][0];p.y=newL.socks[k][1];}}
   const q=place(b,kind,p.key,p.x,p.y,0,{t:p.t});if(q&&typeof p.mode==='string'&&p.mode.length<60)q.mode=p.mode;}
  for(const w of(Array.isArray(raw?.wires)?raw.wires:[]).slice(0,6)){if(!Number.isInteger(w?.sock)||getWire(b,w.sock)||!Array.isArray(w.cells)||w.cells.length>64)continue;const q={sock:w.sock,cells:w.cells.map(c=>Array.isArray(c)?c.slice(0,2):[])};if(validPath(b,q))b.wires.push(q);}return b;
 }
 function adopt(raw,lvl=1){
  if(raw?.v===6)return normalize(raw);
  const legacy=raw?.v===5?old.normalize(raw):old.adopt(raw,lvl);return normalize({...legacy,template:'legacy',v:6});
 }
 const findSpot=(b,kind,key,id)=>kind==='active'?layout(b).socks.map(([x,y])=>({x,y,rot:0})).find(p=>canPlace(b,kind,key,p.x,p.y)):null;
 const manual=()=>({ok:false,reason:'請手動裝上機件及逐格接線'});
 const api={...old,version:6,TEMPLATES,GEM_COLOR,TIER_MUL,TIER_COST,layout,createBoard,adopt,normalize,isInner,isRock,isPad,padAt,padColor,sockAt,sockIndex,startOf,endOf,unlockedCount,
  pieceAt,getWire,wireOf,wireLen,wireCellSet,powerUsed,validPath,connected,canPlace,place,remove,strength,resolve,extend,extendTo:extend,shrink,clearWire,cut:clearWire,route,findSpot,
  dps:(b,hero,lvl)=>resolve(b,lvl).filter(r=>r.wired).map(r=>{const d=old.ACTIVES[r.key],keys=r.linked.map(id=>b.pieces.find(p=>p.id===id).key),mod=old.skillMods(keys,r.key,r.weights),crit=Math.min(1,Math.max(0,(hero.crit+mod.crit)/100)),hit=hero.hit*d.mult*mod.hit*(1+crit*(hero.cm/100-1)),interval=old.cooldown(d.cd,keys,hero.haste||0,1,r.weights);return {id:r.id,key:r.key,hit,interval,dps:hit*(1+mod.twin*old.LIMITS.repeatDamage+(mod.repeat?.45:0))/interval};}),
  PAD_MATCH:1,gemCap:()=>3,wireMax:b=>layout(b).size**2,autoWire:manual,autoWireAll:manual,dress:()=>0,
  fromLegacy:(slots,supp,lvl)=>adopt(old.fromLegacy(slots,supp,lvl),lvl),migrate:(raw,lvl)=>adopt(raw,lvl)};
 if(typeof module!=='undefined')module.exports=api;else root.GridLab=api;
})(typeof window!=='undefined'?window:globalThis);
