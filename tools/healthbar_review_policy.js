/* Review-only policy consuming native projected bounds; not installed in game renderer. */
(function(root){
const overlap=(a,b,p=0)=>a.x-p<b.x+b.w&&a.x+a.w+p>b.x&&a.y-p<b.y+b.h&&a.y+a.h+p>b.y;
function layout(shot,width){
 const scale=width/shot.width,height=shot.height*scale;
 const actors=shot.actors.map(a=>({...a,body:{x:a.body.x*scale,y:a.body.y*scale,right:a.body.right*scale,bottom:a.body.bottom*scale},projectedWidth:a.projectedWidth*scale,projectedHeight:a.projectedHeight*scale})).filter(a=>a.body.right>0&&a.body.x<width&&a.body.bottom>0&&a.body.y<height);
 const sizes=actors.filter(a=>!a.boss).map(a=>a.projectedHeight).sort((a,b)=>a-b),median=sizes[Math.floor(sizes.length/2)]||0,budget=median<40?2:median<70?4:6;
 const candidates=actors.filter(a=>!a.boss&&a.hp<.999&&(a.target||a.elite||a.recent||a.hp<=.2)).sort((a,b)=>(b.target?100:b.elite?80:b.recent?60:40)-(a.target?100:a.elite?80:a.recent?60:40)||a.hp-b.hp);
 const bars=[];
 for(const a of candidates){if(bars.length>=budget)break;if(a.projectedHeight<12&&!a.target&&!a.elite)continue;
  const w=Math.min(a.elite?34:28,Math.max(a.target?18:8,a.projectedWidth*.65)),h=a.target?2:a.projectedHeight<38?1:2,x=Math.max(3,Math.min(width-w-3,(a.body.x+a.body.right-w)/2));let rect=null;
  for(const dy of [0,-3,-6]){const r={x,y:a.body.y-3-h+dy,w,h};if(r.y<44||r.y+h>height-6)continue;if(bars.some(b=>overlap(r,b,2)))continue;
   if(actors.some(o=>o.id!==a.id&&overlap(r,{x:o.body.x,y:o.body.y,w:o.projectedWidth,h:o.projectedHeight},0)))continue;
   rect=r;break;
  }
  if(rect)bars.push({...rect,id:a.id,pct:a.hp,fill:a.elite?'#ffd56b':'#ef805e',target:!!a.target,elite:!!a.elite});
 }
 const target=actors.find(a=>a.target&&!a.boss&&!bars.some(b=>b.id===a.id));
 return{width,height,bars,budget,median,bosses:actors.filter(a=>a.boss),targetFallback:target||null,playerHp:shot.playerHp,old:shot.oldBars.map(r=>({...r,x:r.x*scale,y:r.y*scale,w:r.w*scale,h:r.h})),actorCount:actors.length};
}
const api={layout,overlap};if(typeof module!=='undefined')module.exports=api;root.HealthbarReview=api;
})(typeof globalThis==='undefined'?this:globalThis);
