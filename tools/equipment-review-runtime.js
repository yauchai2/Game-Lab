(()=>{
 const $=id=>document.getElementById(id),canvas=$('view'),select=$('gear'),rd=new T3.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
 rd.outputColorSpace=T3.SRGBColorSpace;rd.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const scene=new T3.Scene();scene.background=new T3.Color('#c1cddc');scene.add(new T3.HemisphereLight(0xeaf5ff,0x6f7c89,2));
 const sun=new T3.DirectionalLight(0xfff6ed,2);sun.position.set(30,60,70);scene.add(sun);
 const cam=new T3.OrthographicCamera(-37,37,21,-21,.1,200);cam.position.set(0,18,90);cam.lookAt(0,18,0);
 let hero,item,rotating=false,yaw=.3,playing=true,action='idle',fraction=0,selected=null;
 const presets={street:['aki_baton','aki_headphones','aki_chain'],frost:['milo_disc','milo_headphones','milo_md'],beep:['ping_launcher','ping_bag','ping_phone'],volt:['null_controller','null_goggles','null_pet']};
 const names={idle:'待機',walk:'步行',run:'跑步',attack:'攻擊',cast:'施技',hurt:'受擊',dash:'閃避',death:'倒地',victory:'勝利'};
 for(const spec of Object.values(SIGNATURE_GEAR)){const o=document.createElement('option');o.value=spec.id;o.textContent=spec.name+(EQUIPMENT_GLB[spec.model]?'':'（待補 3D）');select.appendChild(o);}
 for(const [id,label]of Object.entries(names)){const o=document.createElement('option');o.value=id;o.textContent=label;$('action').appendChild(o);}
 function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*rd.getPixelRatio())||canvas.height!==Math.floor(h*rd.getPixelRatio()))rd.setSize(w,h,false);cam.left=-21*w/h;cam.right=21*w/h;cam.updateProjectionMatrix();hero.rotation.y=yaw;if(item)item.rotation.y=yaw;rd.render(scene,cam);}
 function pose(name=action,f=fraction,angle=yaw,render=true){
  action=name;fraction=Math.max(0,Math.min(.999,f));yaw=angle;
  hero.userData.mixer.stopAllAction();hero.userData.animation='';characterPlay(hero,action,0);
  const a=hero.userData.actions[action];a.time=a.getClip().duration*fraction;a.setEffectiveTimeScale(1);hero.userData.mixer.update(0);
  animateEquipment(hero,{dead:action==='death',speed:['walk','run'].includes(action)?10:0});hero.updateMatrixWorld(true);hero.userData.skeleton.update();
  $('action').value=action;$('time').value=Math.round(fraction*100);if(render)draw();
 }
 function choose(id,loadout=null){
  selected=id;const spec=SIGNATURE_GEAR[id],owner=spec?.owner||$('owner').value,mode=$('mode').value;
  if(hero){characterDispose(hero);scene.remove(hero);}if(item)scene.remove(item);item=null;
  G.equip={weapon:null,armor:null,ring:null};G.char=owner;$('owner').value=owner;
  const specs=Object.values(SIGNATURE_GEAR).filter(s=>s.owner===owner),active=loadout?loadout.map(id=>specs.find(s=>s.id===id)):mode==='single'?(spec?[spec]:[]):presets[owner].map(model=>specs.find(s=>s.model===model));
  for(const s of active)G.equip[s.slot]=makeItem(s.slot,3,15,s.id);
  if(!spec&&mode==='single')for(const slot of Object.keys(SLOTN))G.equip[slot]=makeItem(slot,1,8);
  hero=buildY2KHero(0,0,0,0,{});hero.scale.setScalar(1);hero.position.x=mode==='single'?-13:0;scene.add(hero);
  if(mode==='kit')for(const s of specs)if(!active.includes(s)&&EQUIPMENT_GLB[s.model])attachSignatureGear(hero,{lg:s.id});
  // Extra kit parts are presentation-only: G.equip still contains exactly three items.
  if(mode==='single'){
   item=spec?equipmentModel(spec.model):buildSimpleEquipment('weapon',0,1);if(!item)item=buildSimpleEquipment(spec.slot,0,3);
   item.scale.setScalar(spec&&EQUIPMENT_GLB[spec.model]?15:1);item.position.set(13,16,0);scene.add(item);
  }
  $('status').textContent=mode==='kit'?CHARS[owner].n+'｜整套參考，非正式配裝；沒有新增收藏或屬性':mode==='legal'?CHARS[owner].n+'｜三欄合法搭配':spec?spec.name+'｜'+SLOTN[spec.slot]+'｜'+(EQUIPMENT_GLB[spec.model]?'已接入上傳模型':'僅有參考圖，暫用簡模'):'普通裝備暫用簡單幾何模型';
  select.value=id||'';pose();
 }
 select.onchange=()=>{$('mode').value='single';choose(select.value);};
 $('mode').onchange=()=>choose(selected||select.options[0].value);
 $('owner').onchange=()=>{const s=Object.values(SIGNATURE_GEAR).find(s=>s.owner===$('owner').value);choose(s.id);};
 $('action').onchange=()=>{action=$('action').value;fraction=0;pose();};
 $('time').oninput=()=>{playing=false;$('play').textContent='播放';pose(action,+$('time').value/100);};
 $('angle').onchange=()=>{yaw=+$('angle').value;pose();};
 $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'暫停':'播放';};
 $('rotate').onclick=()=>rotating=!rotating;
 $('motion').onclick=()=>{action='attack';$('action').value=action;playing=true;};
 $('plain').onclick=()=>{$('mode').value='single';choose(null);};
 window.EQUIPMENT_REVIEW={choose,renderer:rd,scene,loadout(owner,ids){$('owner').value=owner;$('mode').value='legal';choose(null,ids);},setPose(name,f,angle=0,render=true){playing=false;pose(name,f,angle,render);},get hero(){return hero;},get item(){return item;}};
 choose(select.value);let last=performance.now();
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){fraction=(fraction+dt/hero.userData.actions[action].getClip().duration)%1;pose();}if(rotating)yaw+=dt*.5;draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
