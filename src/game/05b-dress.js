/* One preview owner for character overview and cosmetic trials. Trial state never enters saves. */
let dSel = {cat:'weaponStyle',id:null};
const PV={cv:null,rd:null,sc:null,cam:null,hero:null,sig:'',yaw:.5,drag:null,lastTime:null,failed:false,plinth:null};
const cosGet=(cat,id)=>(COS[cat]||[]).find(x=>x[0]===id);
const cosOwned=(cat,id)=>!!cosGet(cat,id)&&(cosGet(cat,id)[3]===0||!!G.own[cat+':'+id]);
function cosPreview(){const c={...G.cos};if(dSel.id&&cosAvailable(dSel.cat)&&cosGet(dSel.cat,dSel.id))c[dSel.cat]=dSel.id;return c;}
function rankOf(){let r=RANKS[0][1];for(const [l,n]of RANKS)if(G.lvl>=l)r=n;return r;}
function setName(v){G.heroName=(v||'').trim().slice(0,8)||'阿街';G.dirty=true;}
function dressPick(cat,id){if(!cosAvailable(cat)||!cosGet(cat,id))return;dSel={cat,id};renderModal();}
function dressCat(cat){if(!cosAvailable(cat))return;dSel={cat,id:null};renderModal();}
function dressBuy(){
  const {cat,id}=dSel,e=cosGet(cat,id);if(!cosAvailable(cat)||!id||!e)return;
  if(!cosOwned(cat,id)){
    if(G.gold<e[3]){renderModal();uxAnnounce('金幣不足，尚未購買。');return;}
    G.gold-=e[3];G.own[cat+':'+id]=1;logLine('買下裝扮：'+e[1],'#c28a00');SFX('rare');
  }
  G.cos[cat]=id;dSel={cat,id:null};G.dirty=true;renderModal();uxAnnounce('已穿上'+e[1]+'，能力不變。');
}
function dressPreviewControls(){return `<div class="cv-rotate" role="group" aria-label="旋轉角色預覽"><button class="mb" aria-label="向左旋轉角色" onclick="dressRotate(-1)">↶</button><button class="mb" aria-label="還原角色角度" onclick="dressRotate(0)">正面</button><button class="mb" aria-label="向右旋轉角色" onclick="dressRotate(1)">↷</button></div>`;}
function dressRotate(dir){PV.yaw=dir===0?.5:PV.yaw+dir*Math.PI/4;}
function dressHtml(){
  if(!cosAvailable(dSel.cat))dSel={cat:'weaponStyle',id:null};
  const cat=dSel.cat,cur=cosGet(cat,G.cos[cat])?G.cos[cat]:'0',sel=dSel.id||cur,e=cosGet(cat,sel),owned=cosOwned(cat,sel),worn=sel===cur;
  const state=worn?'目前穿著':owned?'試穿中 · 尚未套用':G.gold>=e[3]?'試穿中 · 購買後立即穿上':'金幣不足 · 還差 '+tFmt(e[3]-G.gold)+' 金幣';
  const action=worn?`<button class="mb" disabled>目前穿著</button>`:owned?`<button class="mb pri" data-focus="dress-apply" onclick="dressBuy()">穿上</button>`:`<button class="mb pri" data-focus="dress-apply" ${G.gold>=e[3]?'':'disabled'} onclick="dressBuy()">購買並穿上 · ${tFmt(e[3])} 金幣</button>`;
  return `<div class="character-view device-wardrobe" data-character="${G.char}">${charSegHtml()}${uiCharacterIdentity()}${uiCharacterStage(true)}<section class="cv-wardrobe"><div class="cv-section-label"><h3>外觀試穿</h3><span>金幣 <span id="cv-gold">${tFmt(G.gold)}</span></span></div><p class="uxmeta">武器、副手與飾品只改變外觀，不影響能力。</p><div class="dcats" role="group" aria-label="裝扮部位">${COS_CATS.map(([k,n])=>`<button class="mb" aria-pressed="${k===cat}" data-focus="dress-cat-${k}" onclick="dressCat('${k}')">${n}</button>`).join('')}</div><div class="cv-styles" role="group" aria-label="${COS_CATS.find(([k])=>k===cat)[1]}款式">${COS[cat].map(([id,n,col,price])=>{const url=typeof icon3dCosmeticUrl==='function'?icon3dCosmeticUrl(cat,id):'',icon=url?`<img src="${url}" alt="" width="56" height="56">`:spr(cat==='weaponStyle'?'sword':cat==='offhandStyle'?'shield':'coin',40);return `<button class="mb cv-style" aria-pressed="${id===sel}" data-focus="dress-item-${cat}-${id}" onclick="dressPick('${cat}','${id}')"><span class="cv-style-art">${icon}</span><span>${uxEsc(n)}</span><small>${id===cur?'穿著中':cosOwned(cat,id)?'已擁有':tFmt(price)+' 金幣'}</small></button>`;}).join('')}</div><div class="cv-dress-action"><div><strong>${uxEsc(e[1])}</strong><p role="status">${state}</p></div><div class="uxactions">${action}${!worn?'<button class="mb" data-focus="dress-cancel" onclick="dressCat(dSel.cat)">取消試穿</button>':''}</div></div><details class="cv-detail"><summary>目前三件外觀</summary><dl class="ui-stat-list">${COS_CATS.map(([k,n])=>`<div><dt>${n}</dt><dd>${uxEsc(cosGet(k,G.cos[k])?.[1]||cosGet(k,'0')[1])}</dd></div>`).join('')}</dl></details></section>${uiCharacterProfile()}</div>`;
}
function dressPreviewFailure(host){
  host.dataset.preview='failed';const status=$('cv-preview-status');if(status)status.textContent='3D 預覽暫時無法顯示，仍可管理裝備及外觀。';const retry=$('cv-preview-retry');if(retry)retry.hidden=false;
}
function dressDisposePreview(){
  const hero=PV.hero;if(!hero)return;
  const shared=hero.userData.mesh?.geometry,owned=new Set();
  hero.traverse(o=>{if(o.isMesh&&o.geometry!==shared&&!o.geometry.userData.equipmentShared)owned.add(o.geometry);});
  if(typeof characterDispose==='function')characterDispose(hero);
  for(const geometry of owned)geometry.dispose();PV.sc?.remove(hero);PV.hero=null;PV.sig='';
}
function dressRetry(){
  PV.rd?.dispose();PV.cv?.remove();
  dressDisposePreview();
  PV.plinth?.geometry.dispose();PV.plinth?.material.dispose();
  Object.assign(PV,{rd:null,cv:null,sc:null,cam:null,hero:null,plinth:null,sig:'',failed:false,lastTime:null,drag:null});dressMount();
}
function dressMount(){
  const host=$('pvhost');if(!host||host.closest('details')?.open===false)return;
  if(PV.failed){dressPreviewFailure(host);return;}
  try{
    if(!PV.rd){
      PV.cv=document.createElement('canvas');PV.cv.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';PV.cv.setAttribute('aria-hidden','true');
      PV.rd=new T3.WebGLRenderer({canvas:PV.cv,antialias:false,alpha:true});PV.rd.setPixelRatio(1);PV.rd.setClearColor(0x000000,0);PV.rd.outputColorSpace=T3.SRGBColorSpace;
      PV.sc=new T3.Scene();PV.sc.add(new T3.HemisphereLight(0xeaf5ff,0xd8c8f0,1.55));const sun=new T3.DirectionalLight(0xfff6ea,1.5);sun.position.set(30,60,50);PV.sc.add(sun);PV.sc.add(new T3.AmbientLight(0xffffff,.25));
      PV.cam=new T3.OrthographicCamera(-1,1,1,-1,.1,300);
      PV.plinth=new T3.Mesh(new T3.CylinderGeometry(13,14,1,12),new T3.MeshLambertMaterial({color:0xb4c4ec,flatShading:true}));PV.sc.add(PV.plinth);
      PV.cv.addEventListener('pointerdown',e=>{if(e.button!==0)return;PV.drag={x:e.clientX,y:e.clientY,yaw:PV.yaw,id:e.pointerId,active:false};});
      PV.cv.addEventListener('pointermove',e=>{const d=PV.drag;if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.active&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){d.active=true;PV.cv.setPointerCapture(e.pointerId);PV.cv.style.cursor='grabbing';}if(d.active)PV.yaw=d.yaw+dx*.012;});
      const end=()=>{PV.drag=null;PV.cv.style.cursor='grab';};PV.cv.addEventListener('pointerup',end);PV.cv.addEventListener('pointercancel',end);PV.cv.addEventListener('lostpointercapture',end);
      if(!PV.timer)PV.timer=setInterval(dressTick,40);
    }
    host.appendChild(PV.cv);PV.lastTime=null;dressTick();
  }catch(e){PV.failed=true;PV.rd?.dispose();PV.rd=null;PV.cv?.remove();dressPreviewFailure(host);}
}
function dressTick(){
  if(!PV.rd||!PV.cv.isConnected||!['char','dress'].includes(modalTab)||$('modal').hidden||document.hidden){PV.lastTime=null;PV.drag=null;return;}
  // A scrolled-out stage must not spend GPU time while the player reads lower sections.
  const host=PV.cv.parentElement,rect=host.getBoundingClientRect(),panel=$('mbody').getBoundingClientRect();
  if(rect.bottom<panel.top||rect.top>panel.bottom){PV.lastTime=null;return;}
  const now=performance.now(),dt=PV.lastTime===null?0:Math.min(.1,(now-PV.lastTime)/1000);PV.lastTime=now;
  const w=PV.cv.clientWidth,h=PV.cv.clientHeight;if(w<4||h<4)return;
  try{
    const A=G.equip.armor,W=G.equip.weapon,cos=modalTab==='dress'?cosPreview():G.cos,sig=[aTier(A),A?A.r:0,aTier(W),W?W.r:0,...Object.values(G.equip).map(it=>it?.lg||''),G.char,JSON.stringify(cos)].join();
    if(sig!==PV.sig){
      dressDisposePreview();
      const g=buildHero(aTier(A),A?A.r:0,aTier(W),W?W.r:0,cos);g.scale.setScalar(1);PV.hero=g;PV.sc.add(g);g.updateMatrixWorld(true);
      const box=new T3.Box3();g.traverse(o=>{if(o.isMesh&&o.visible&&!['RingGeometry','CircleGeometry'].includes(o.geometry.type)){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
      if(box.isEmpty())throw Error('Empty character model');PV.box=box;PV.sig=sig;
      PV.plinth.position.set((box.min.x+box.max.x)/2,box.min.y-.8,0);
    }
    if(PV.hero.userData.y2k)characterPreviewAnimate(PV.hero,dt,matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Keep NULL's companion outside the body silhouette in this presentation instance.
    if(PV.hero.userData.pet){PV.hero.userData.pet.position.x+=6;PV.hero.userData.pet.position.z+=4;}
    PV.hero.rotation.y=PV.yaw;
    const buffer=r3BufferSize(w,h,devicePixelRatio||1,R3.clean,r3ViewQuality(),innerWidth);PV.cv.style.imageRendering=R3.clean?'auto':'pixelated';
    if(PV.cv.width!==buffer.width||PV.cv.height!==buffer.height)PV.rd.setSize(buffer.width,buffer.height,false);
    const b=PV.box,cx=(b.min.x+b.max.x)/2,cy=(b.min.y+b.max.y)/2,span=Math.hypot(b.max.x-b.min.x,b.max.z-b.min.z),vh=Math.max((b.max.y-b.min.y)*1.18,span*h/w*1.1),vw=vh*w/h;
    PV.cam.left=-vw/2;PV.cam.right=vw/2;PV.cam.top=vh/2;PV.cam.bottom=-vh/2;PV.cam.position.set(cx,cy+1,80);PV.cam.lookAt(cx,cy,0);PV.cam.updateProjectionMatrix();PV.rd.render(PV.sc,PV.cam);host.dataset.preview='ready';
  }catch(e){PV.failed=true;PV.cv.remove();dressPreviewFailure(host);}
}
