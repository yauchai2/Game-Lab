/* Review-only M04 model fixture. The temporary brute mapping is NOT a production design decision. */
const M04_PREVIEW={enabled:true,original:buildBrute,fixtureType:'brute'};
function m04Build(){
 const g=G1_PREVIEW.original.monsterBuild('m04',M04_GLB),u=g.userData;
 u.m04=true;u.actions.Hop=u.actions.Move;
 u.s=14.5/(2.96*CK*(MONSTER_TRAITS.brute?.scale||1));
 // Per-actor opacity; geometry stays shared. Basic flash is guarded in the reviewed source.
 const mats=new Map();g.traverse(o=>{if(o.isMesh&&o.material.vertexColors){const old=o.material;if(!mats.has(old)){const mat=old.clone();mat.userData.equipmentShared=false;mats.set(old,mat);}o.material=mats.get(old);}});u.mats=[...mats.values()];return g;
}
buildBrute=function(boss=false){return !boss&&M04_PREVIEW.enabled?m04Build():M04_PREVIEW.original(boss);};
function m04Refresh(){for(const[m,g]of R3.ent)if(m.type==='brute'){R3.world.remove(g);disposeWorldObject(g);R3.ent.delete(m);}G.dirty=true;if(G.paused)ui.render();}
function m04Fixture(){G.mons=[];for(const [i,type]of ['slime','brute'].entries()){spawnRiftMonster({id:0},type,...terrainProject(HX+12+i*10,HY+5));const m=G.mons.at(-1);m.born=G.time-2;m.ph=0;m.lunge=-1;}ui.render();}
const m04Button=document.createElement('button');m04Button.textContent='M04：新模型';m04Button.setAttribute('aria-pressed','true');m04Button.onclick=()=>{M04_PREVIEW.enabled=!M04_PREVIEW.enabled;m04Button.textContent=M04_PREVIEW.enabled?'M04：新模型':'M04：原版對照';m04Button.setAttribute('aria-pressed',String(M04_PREVIEW.enabled));m04Refresh();};document.querySelector('.g1-controls').append(m04Button);
const m04Note=document.createElement('small');m04Note.textContent='M04 模型樣板：暫借 brute 行為比較，正式 type 尚待對齊。進度只保留至關閉頁面。';document.querySelector('#g1-tools details').append(m04Note);
m04Fixture();
