/* Review-only render overrides. Inlined before boot; production never loads this file. */
const SUMMER={enabled:true,close:false,original:{ground:buildGround,scenery:buildWorldScenery,hero:buildY2KHero,lighting:studioWorldLighting,frame:r3frame},dispose:characterDispose};
function summerBox(g,w,h,d,col,x,y,z){return mk(new T3.BoxGeometry(w,h,d),m3(col),x,y,z,g);}
function summerLabel(text,bg,fg='#ffffff'){
 const c=document.createElement('canvas');c.width=128;c.height=32;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,128,32);ctx.fillStyle=fg;ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText(text,64,23);
 const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;t.magFilter=T3.NearestFilter;t.minFilter=T3.NearestFilter;
 return new T3.MeshBasicMaterial({map:t});
}
function summerShop(index){
 const g=new T3.Group(),colors=['#e9dfc6','#d8e4d7','#e7d3bc'],accents=['#ee4e76','#28a9d8','#f6bf42'],a=accents[index%3];
 summerBox(g,24,27,18,colors[index%3],0,13.5,0);summerBox(g,25,1.3,19,'#f5f1df',0,28,0);
 for(const x of [-7,1,8])for(const y of [17,23]){summerBox(g,5,4,.5,'#8caaae',x,y,9.3);summerBox(g,5.5,.5,1,'#fff7df',x,y-2,9.6);}
 summerBox(g,20,8,.5,'#37626c',0,5,9.3);for(const x of [-6,0,6])summerBox(g,.5,8,.8,'#f7f3e2',x,5,9.5);
 summerBox(g,25,1,5,a,0,10.5,11);for(let i=0;i<8;i++)summerBox(g,1.4,.18,5,'#fff6df',-10.5+i*3,11.1,11);
 const sign=mk(new T3.PlaneGeometry(21,4),summerLabel(['SIDE B','WAVE FM','24 MART'][index%3],a),0,13,9.6,g);
 summerBox(g,4,10,3,index%2?'#23afd3':'#e54f5a',15,5,7);summerBox(g,2.8,5,.2,'#e1f9ef',15,6,8.6);for(let i=0;i<3;i++)summerBox(g,.5,.6,.3,'#ffda61',14.2+i*.8,6,8.8);
 return g;
}
function summerStreetScenery(){
 const p=terrainNow(),root=new T3.Group(),objects=[],rear=p.bounds[2]+9;
 // Set dressing stays at the perimeter; the center remains clear for combat.
 function add(g,x,z,angle=0){g.rotation.y=angle;at3(g,x,z,BZ+terrainHeight(x,z,p));const materials=[];g.traverse(o=>{if(o.isMesh){const original=o.material;o.material=original.clone();if(original.map)original.dispose();materials.push(o.material);}});g.userData.fade={materials,opacity:1,target:1};root.add(g);objects.push(g);}
 // Use the same landmark positions/radii as navigation so no invisible blockers remain.
 for(const [i,prop]of p.landmarks.entries()){
  if(prop.kind==='tree'){const tree=new T3.Group();summerBox(tree,1.5,10,1.5,'#957a4e',0,5,0);for(const [dx,dy,dz,r]of [[0,14,0,7],[-4,12,1,5],[4,13,-1,5]])mk(ico(r,1),m3('#65c641'),dx,dy,dz,tree);tree.scale.setScalar(prop.radius/5);add(tree,prop.x,prop.y);}
  else{const shop=summerShop(i);shop.scale.setScalar(prop.radius/16);add(shop,prop.x,prop.y,prop.x>HX?-Math.PI/2:prop.y>HY?Math.PI:0);}
 }
 const bridge=new T3.Group(),span=p.bounds[1]-p.bounds[0];
 summerBox(bridge,span,3,13,'#70896c',0,25,0);summerBox(bridge,span,1,15,'#adc49a',0,27,0);
 for(const z of [-7,7]){summerBox(bridge,span,.6,.7,'#d8e3be',0,31,z);summerBox(bridge,span,.5,.6,'#d8e3be',0,29,z);for(let x=-span/2;x<span/2;x+=9)summerBox(bridge,.5,4,.5,'#a6b38e',x,29,z);}
 for(const x of [-span*.36,span*.36]){summerBox(bridge,5,24,5,'#bfc4ad',x,12,0);summerBox(bridge,11,2,8,'#d3d5bf',x,23,0);}
 add(bridge,HX,p.bounds[2]-5);
 root.updateMatrixWorld(true);for(const o of objects)o.userData.fade.box=new T3.Box3().setFromObject(o);root.userData.occluders=objects;return root;
}
buildGround=function(bi){
 if(!SUMMER.enabled||G.run?.tower)return SUMMER.original.ground(bi);
 const p=terrainNow(),g=new T3.Group(),tri=(dst,a,b,c)=>dst.push(...a,...b,...c),road=[],pavement=[];
 for(const c of p.groundCells){const x=c.x-3,z=c.y-3,pts=[[x,z],[x,z+6],[x+6,z+6],[x+6,z]].map(([u,v])=>[u,BZ+terrainHeight(u,v,p),v]);const dest=Math.abs(c.x-HX)>25&&Math.abs(c.y-HY)>19?pavement:road;tri(dest,pts[0],pts[1],pts[2]);tri(dest,pts[0],pts[2],pts[3]);}
 for(const [values,col]of [[road,'#61655e'],[pavement,'#d8d5bf']]){const geo=new T3.BufferGeometry();geo.setAttribute('position',new T3.Float32BufferAttribute(values,3));geo.computeVertexNormals();g.add(new T3.Mesh(geo,m3(col,{side:T3.DoubleSide})));}
 // Retain the original landmass skirt and its terrain silhouette.
 const original=SUMMER.original.ground(bi);if(original.children[1]){const side=original.children[1];original.remove(side);g.add(side);}disposeWorldObject(original);
 function marking(x,z,w,d,col){if(terrainCell(x,z,p))summerBox(g,w,.12,d,col,x,BZ+terrainHeight(x,z,p)+.2,z);}
 for(let z=p.bounds[2]+6;z<p.bounds[3]-6;z+=12)if(Math.abs(z-HY)>24)marking(HX,z,.6,5,'#eee8c6');
 for(let i=-3;i<=3;i++){marking(HX+i*6,HY-23,3.4,9,'#f7f0d8');marking(HX+31,HY+i*4,9,2.4,'#f7f0d8');}
 for(let x=p.bounds[0]+6;x<p.bounds[1]-6;x+=8)if(Math.abs(x-HX)>28)marking(x,HY-17,5,.5,'#f0c34b');
 return g;
};
buildWorldScenery=function(bi){return SUMMER.enabled&&!G.run?.tower?summerStreetScenery():SUMMER.original.scenery(bi);};
studioWorldLighting=function(sc){if(!SUMMER.enabled)return SUMMER.original.lighting(sc);sc.add(new T3.HemisphereLight('#e8fcff','#8b947d',1.65));const key=new T3.DirectionalLight('#fff4d2',1.3);key.position.set(-40,90,35);sc.add(key);};
buildY2KHero=function(...args){const g=SUMMER.original.hero(...args);if(!SUMMER.enabled)return g;
 // Keep the existing imported models, skeleton and equipment sockets intact.
 const mesh=g.userData.mesh,mat=mesh.material.clone();if(mat.map){mat.map=mat.map.clone();mat.map.magFilter=T3.NearestFilter;mat.map.minFilter=T3.NearestFilter;mat.map.generateMipmaps=false;mat.map.needsUpdate=true;}mesh.material=mat;g.userData.summerMaterial=mat;
 // A vivid streetwear accent uses the existing torso bone, without recoloring skin.
 const torso=g.userData.B.torso;if(torso){const badge=mk(new T3.PlaneGeometry(2.4,1.2),summerLabel('WAVE','#e84e76'),0,3.3,3.9,torso);badge.name='summer-shirt-badge';}
 return g;
};
characterDispose=function(g){SUMMER.dispose(g);const mat=g?.userData.summerMaterial;if(mat){mat.map?.dispose();mat.dispose();delete g.userData.summerMaterial;}g?.traverse(o=>{if(o.name==='summer-shirt-badge'){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});};
r3frame=function(){SUMMER.original.frame();if(!SUMMER.enabled)return;['#54cfee','#b5f2ee','#fffef1'].forEach((c,i)=>document.documentElement.style.setProperty('--sk'+i,c));if(SUMMER.close){const cam=R3.cam,center=new T3.Vector3(G.h.x,BZ+10,G.h.y).applyMatrix4(cam.matrixWorldInverse),w=(cam.right-cam.left)/2.1,h=(cam.top-cam.bottom)/2.1;cam.left=center.x-w/2;cam.right=center.x+w/2;cam.top=center.y+h/2;cam.bottom=center.y-h/2;cam.updateProjectionMatrix();}};
function summerReset(){
 G.pal='mint';
 G.run={map:{id:'summer-527',biome:0,lvl:8,mods:[]},kills:0,need:80,bossOut:false};G.maxDepth=12;G.depth=8;G.lvl=12;G.push=false;G.mons=[];G.drops=[];G.proj=[];G.fx=[];G.floats=[];G.spawnCd=.5;G.paused=false;G.picks=0;
 Object.assign(G.h,{x:HX,y:HY,gx:HX,gy:HY,vx:0,vy:0,dead:0});recalc();G.h.hp=G.st.life;G.dirty=true;worldTravelSkip();FXO.overview=false;FXO.zoomT=innerWidth<768?.85:1.15;FXO.yawT=0;
}
function summerStart(){
 const style=document.createElement('style');style.textContent='body.summer-look::before{display:none!important}#summer-toolbar{position:fixed;left:8px;bottom:34px;max-width:min(870px,calc(100vw - 16px));box-sizing:border-box;z-index:100;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;background:#f6f3de;color:#234759;border-bottom:3px solid #26b8d5;font:14px/1.5 sans-serif}#summer-toolbar button{min-height:40px;padding:6px 12px;background:#fffdf0;border:1px solid #8aaca9;color:#234759;cursor:pointer;font:inherit}#summer-toolbar button:focus-visible{outline:3px solid #ec5078}#summer-toolbar button[aria-pressed=true]{background:#234759;color:white}#summer-toolbar small{flex-basis:100%}';document.head.append(style);
 const bar=document.createElement('aside');bar.id='summer-toolbar';bar.setAttribute('aria-label','夏日街區視覺預覽');bar.innerHTML='<b>夏日街區・可玩預覽</b><button id="summer-look" aria-pressed="true">影片風格</button><button id="summer-close" aria-pressed="false">角色近景</button><button id="summer-reset">重新試玩</button><label>角色 <select id="summer-character" aria-label="預覽角色"></select></label><small>自動戰鬥、拾取與裝備可操作。測試進度只保留到關閉頁面。拖動畫面旋轉，滾輪縮放。</small>';document.body.prepend(bar);
 const select=bar.querySelector('select');for(const [id,c]of Object.entries(CHARS)){const o=document.createElement('option');o.value=id;o.textContent=c.n||id;select.append(o);}select.value=G.char;
 select.onchange=()=>{G.run=null;const existing=PROFILE_SESSION.profiles.find(p=>p.save.char===select.value);if(existing){profileSwitch(existing.id);summerReset();return;}const save={...serialize(),char:select.value,ascension:null,ascensionNodes:[]};if(!profileImportNew(save))throw new Error('Preview profile import failed');G.characterRuntime=null;G.sigT=0;summerReset();};
 document.getElementById('summer-close').onclick=e=>{SUMMER.close=!SUMMER.close;e.currentTarget.setAttribute('aria-pressed',String(SUMMER.close));};
 document.getElementById('summer-reset').onclick=summerReset;
 document.getElementById('summer-look').onclick=e=>{SUMMER.enabled=!SUMMER.enabled;document.body.classList.toggle('summer-look',SUMMER.enabled);e.currentTarget.setAttribute('aria-pressed',String(SUMMER.enabled));e.currentTarget.textContent=SUMMER.enabled?'影片風格':'原版風格';R3.bi=-1;if(R3.hero){characterDispose(R3.hero);R3.world.remove(R3.hero);R3.hero=null;}if(R3.ready){for(const light of [...R3.sc.children].filter(x=>x.isLight))R3.sc.remove(light);studioWorldLighting(R3.sc);}};
 document.body.classList.add('summer-look');summerReset();hideOverlay();if(typeof modalTab!=='undefined'){modalTab='char';openModal('char');}
}
