(function () {
'use strict';
const B=window.Buildcraft, $=id=>document.getElementById(id);
const MODES={
 circuit:['訊號接線台','PATCH','把產生、儲存與消耗接成路徑。試試直接放電，或先蓄力再分流。','先點輸出模組，再點接收端。點下方連線可拆除。','感應器每 0.8 秒送出 2 格；電容存滿 6 格才發送；分線器平均分流。每格：雷射單體 13 傷害、脈衝最多五目標各 6 傷害、護盾 5 點。一般輸出一條線，分線器兩條；禁止循環。'],
 tape:['戰鬥混音帶','MIXTAPE','四拍循環播放。先建立條件再收尾，或犧牲爆發換取防護。','點一個拍點，再選要放入的技能。試試把碎星移到鋪墊之前。','每拍 1.25 秒。冰霧、標記各維持 3 秒。碎星基礎 30 傷害，凍結時 ×2.4、標記時 ×1.6，最多三目標並消耗條件。回充恢復 18 護盾。技能可以重複。'],
 overclock:['超頻改機','OVERCLOCK','武器與時脈越強，熱量越高。找出爆發、散熱與停機的平衡。','調整時脈、武器和散熱器，觀察停機時間。','散射：10 傷害、三目標、12 熱量、間隔 0.8 秒。雷射：48 傷害、單體、30 熱量、間隔 1.7 秒。時脈加快兩者。100 熱量停機，降至 30 重啟；強力散熱每秒 −25，回收散熱每秒 −13、有熱量時每秒恢復 3 護盾。'],
 frequency:['頻道調諧','TUNER','三台發射器共用四拍。同拍共振破甲，錯拍持續減速。','替三台發射器選拍點，比較全部同步和輪流發射。','每拍 0.65 秒，四拍循環。每台 18 傷害；同拍兩台以上合計 ×1.5，兩目標及穿透 40% 護甲。單台發射只有一目標，但減速 0.85 秒。首領有 45% 減傷。'],
 firmware:['故障韌體','FAULT','兩個插槽，五種改造。用另一件補足缺口，或者接受代價。','點已裝韌體卸下，再選新韌體。試試側射＋繞行、回聲＋汲取。','原廠射擊 24 傷害／0.9 秒。側射改 42，但正面 ±15 單位無法命中；繞行使近敵相對方位變動。穿透最多四目標、破甲 15%，但間隔變 1.25 秒。回聲耗 8 盾換 ×1.8 傷害；汲取每個命中回 7 盾。'],
 city:['街區供能網','CITY GRID','有限預算修復街區，讓城市供給機體。孤立的街區不會生效。','從中樞上下左右連通，最多花 5 點。點街區啟用或關閉。','只有連回中樞的街區生效。訊號塔花 2 點，其餘各 1 點。機體每 1.4 秒產 2 電荷，8 格放電，基礎 45 傷害。電源每座加 2 電荷及 8 傷害；冷卻縮短間隔 0.35 秒；訊號加一目標及 20% 破甲；修復每輪回 8 盾。']
};
const CHIPS={side:['側射','42 傷害，正面盲區'],orbit:['繞行','近敵相對方位改變'],pierce:['穿透','四目標，但出手較慢'],echo:['回聲','消耗 8 盾，傷害 ×1.8'],leech:['汲取','每命中回復 7 盾']};
const state={mode:'circuit',configs:B.clone(B.DEFAULTS),scenario:'swarm',paused:false,speed:1,source:null,slot:0,previous:{},recorded:false};
let run;
function btn(label,action,value,selected=false,extra=''){return '<button data-action="'+action+'" data-value="'+value+'" aria-pressed="'+selected+'" '+extra+'>'+label+'</button>';}
function say(s){$('feedback').textContent=s;}
function restart(message){run=new B.Run(state.mode,state.configs[state.mode],state.scenario);state.recorded=false;$('end-banner').hidden=true;if(message)say(message);update();draw();}
function scenario(){ $('scenario').innerHTML=btn('清群','scenario','swarm',state.scenario==='swarm')+btn('首領','scenario','boss',state.scenario==='boss'); }
function select(mode,hash=true){
 if(!MODES[mode])mode='circuit';state.mode=mode;state.source=null;state.slot=0;state.paused=false;
 if(hash)history.replaceState(null,'','#'+mode);
 $('metric-label').textContent=({circuit:'滿充',tape:'連動',overclock:'過熱次數',frequency:'共振',firmware:'連動',city:'放電'})[mode];
 const m=MODES[mode];document.title=m[0]+'｜構築試玩室';$('demo-title').textContent=m[0];$('demo-code').textContent=m[1];$('demo-desc').textContent=m[2];$('goal').textContent=m[3];$('rules').textContent=m[4];
 $('demo-nav').innerHTML=Object.entries(MODES).map(([id,m])=>btn('<small>'+m[1]+'</small>'+m[0],'demo',id,id===mode)).join('');
 controls();scenario();restart('已載入。可以先看起始配置，再動手改裝。');
}
function presets(items){return '<span class="section-label">快速比較</span><div class="preset-row">'+items.map(([id,n])=>btn(n,'preset',id)).join('')+'</div>';}
function controls(){
 const c=state.configs[state.mode];let html='';
 if(state.mode==='circuit'){
  const pos=[[17,20],[50,20],[83,20],[17,81],[50,81],[83,81]], sub=['每 0.8 秒輸出 2 格','存滿 6 格再輸出','能量平均分流','單體高傷','最多五目標','儲存防護'];
  const lines=c.edges.map(([a,b])=>'<line x1="'+pos[a][0]+'" y1="'+pos[a][1]+'" x2="'+pos[b][0]+'" y2="'+pos[b][1]+'" stroke="#475778" stroke-width="1" marker-end="url(#arrow)"/>').join('');
  html='<div class="patch-board"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#475778"/></marker></defs>'+lines+'</svg>'+B.NODES.map((n,i)=>'<button class="patch-node'+(state.source===i?' selected':'')+'" data-action="node" data-value="'+i+'" data-node="'+i+'" aria-pressed="'+(state.source===i)+'">'+n+'<small>'+sub[i]+'</small></button>').join('')+'</div><div class="wires" aria-label="已接通連線">'+(c.edges.length?c.edges.map(([a,b])=>btn(B.NODES[a]+' → '+B.NODES[b]+' ×','wire',a+'-'+b,false,'aria-label="拆除'+B.NODES[a]+'至'+B.NODES[b]+'連線"')).join(''):'<p>尚未接線，先選感應器。</p>')+'</div>';
  html+=presets([['burst','蓄力＋護盾'],['crowd','直接清群'],['empty','拆除所有接線']]);
 }
 if(state.mode==='tape'){
  html='<div class="tape">'+c.steps.map((s,i)=>btn('<small>第 '+(i+1)+' 拍</small>'+B.STEPS[s][0],'slot',i,state.slot===i,'id="tape-'+i+'"')).join('')+'</div><span class="section-label">替第 '+(state.slot+1)+' 拍選技能</span><div class="choice-grid">'+Object.entries(B.STEPS).map(([id,s])=>btn(s[0]+'<small>'+s[1]+'</small>','step',id,c.steps[state.slot]===id)).join('')+'</div>';
  html+=presets([['combo','鋪墊收尾'],['raw','四連碎星'],['safe','防護循環']]);
 }
 if(state.mode==='overclock'){
  html='<div class="range-row"><label for="rate">時脈倍率 <output id="rate-value">×'+c.rate.toFixed(2)+'</output></label><input id="rate" type="range" min="0.6" max="1.8" step="0.1" value="'+c.rate+'"></div><span class="section-label">武器開關</span><div class="choice-grid">'+['散射','雷射'].map((n,i)=>btn(n+'<small>'+(c.weapons[i]?'已啟用':'已關閉')+'</small>','weapon',i,c.weapons[i])).join('')+'</div><span class="section-label">散熱模組</span><div class="choice-grid">'+btn('強力散熱<small>每秒 −25 熱量</small>','cooling','fins',c.cooling==='fins')+btn('熱能回收<small>散熱較慢，持續回盾</small>','cooling','recycle',c.cooling==='recycle')+'</div>';
  html+=presets([['steady','低頻穩定'],['hot','雙武器超頻'],['recycle','回收護盾']]);
 }
 if(state.mode==='frequency'){
  html='<div class="tape" aria-label="目前播放拍點">'+[0,1,2,3].map(i=>'<div id="phase-'+i+'" class="ledger">拍點 '+(i+1)+'<br>'+c.phases.filter(p=>p===i).length+' 台</div>').join('')+'</div>';
  html+=c.phases.map((p,i)=>'<div class="frequency-row"><span class="section-label">發射器 '+(i+1)+'</span><div class="group" aria-label="發射器 '+(i+1)+' 拍點">'+[0,1,2,3].map(n=>btn('第 '+(n+1)+' 拍','phase',i+'-'+n,n===p)).join('')+'</div></div>').join('');
  html+=presets([['sync','三台同步'],['spread','輪流發射'],['pair','雙台＋單台']]);
 }
 if(state.mode==='firmware'){
  html='<div class="budget">插槽 '+c.chips.length+'／2：'+(c.chips.map(id=>CHIPS[id][0]).join(' ＋ ')||'尚未安裝')+'</div><div class="choice-grid">'+Object.entries(CHIPS).map(([id,s])=>btn(s[0]+'<small>'+s[1]+'</small>','chip',id,c.chips.includes(id))).join('')+'</div>';
  html+=presets([['side','側射＋繞行'],['echo','回聲＋汲取'],['plain','穿透＋汲取']]);
 }
 if(state.mode==='city'){
  const net=B.cityNetwork(c),connected=new Set(net.connected);
  html='<div class="budget">修復點數 '+net.cost+'／5；已供能 '+(connected.size-1)+' 區</div><div class="city-grid">'+B.CITY.map((n,i)=>btn(n.name+'<small>'+(i===4?'固定起點':n.cost+' 點・'+(c.selected.includes(i)?connected.has(i)?'已供能':'未接通':'未啟用'))+'</small>','district',i,c.selected.includes(i),i===4?'disabled aria-label="中樞，固定供能起點"':'')).join('')+'</div><p class="ledger">上下左右相鄰才連通；中樞不可拆除。</p>';
  html+=presets([['power','高速充能'],['coverage','訊號覆蓋'],['repair','修復續航']]);
 }
 const active=document.activeElement,key=active&&active.dataset?[active.dataset.action,active.dataset.value]:null;
 $('controls').innerHTML=html;
 if(key&&key[0]){const el=[...$('controls').querySelectorAll('button')].find(b=>b.dataset.action===key[0]&&b.dataset.value===key[1]);if(el)el.focus({preventScroll:true});}
}
function commit(s){controls();restart(s||'配置已更新，已重新試跑。');}
function preset(id){
 const m=state.mode,c=state.configs[m];
 if(m==='circuit')c.edges=id==='burst'?[[0,1],[1,2],[2,3],[2,5]]:id==='crowd'?[[0,4]]:[];
 if(m==='tape')c.steps=id==='combo'?['cold','mark','burst','recharge']:id==='raw'?['burst','burst','burst','burst']:['cold','burst','recharge','recharge'];
 if(m==='overclock')state.configs[m]=id==='steady'?{rate:.7,weapons:[false,true],cooling:'fins'}:id==='hot'?{rate:1.8,weapons:[true,true],cooling:'fins'}:{rate:1,weapons:[true,true],cooling:'recycle'};
 if(m==='frequency')c.phases=id==='sync'?[0,0,0]:id==='spread'?[0,1,2]:[0,0,2];
 if(m==='firmware')c.chips=id==='side'?['side','orbit']:id==='echo'?['echo','leech']:['pierce','leech'];
 if(m==='city')c.selected=id==='power'?[0,1,4,5,7]:id==='coverage'?[1,2,3,4]:[3,4,6,7];
 state.source=null;commit('範例已套用。再改一個部分，觀察差別。');
}
document.addEventListener('click',e=>{
 const el=e.target.closest('button[data-action]');if(!el||el.disabled)return;
 const {action,value}=el.dataset,c=state.configs[state.mode];
 if(action==='demo'){select(value);return;}
 if(action==='scenario'){state.scenario=value;scenario();restart('已切換試跑對象。');return;}
 if(action==='preset'){preset(value);return;}
 if(action==='node'){
  const n=+value;
  if(state.source===null){if(n>2){say('這是終點。請先選感應器、電容或分線器。');return;}state.source=n;controls();say('已選 '+B.NODES[n]+'，接著點接收端。再點同一模組可取消。');}
  else if(state.source===n){state.source=null;controls();say('已取消選擇。');}
  else{const r=B.circuitConnect(c,state.source,n);if(r.ok){state.source=null;commit(r.reason);}else say(r.reason);}return;
 }
 if(action==='wire'){const [a,b]=value.split('-').map(Number);c.edges=c.edges.filter(x=>!(x[0]===a&&x[1]===b));state.source=null;commit('已拆除接線。');}
 if(action==='slot'){state.slot=+value;controls();say('已選第 '+(state.slot+1)+' 拍，請選技能。');}
 if(action==='step'){c.steps[state.slot]=value;commit('第 '+(state.slot+1)+' 拍改為'+B.STEPS[value][0]+'，已重新試跑。');}
 if(action==='weapon'){c.weapons[+value]=!c.weapons[+value];commit();}
 if(action==='cooling'){c.cooling=value;commit();}
 if(action==='phase'){const [i,p]=value.split('-').map(Number);c.phases[i]=p;commit();}
 if(action==='chip'){
  if(c.chips.includes(value))c.chips=c.chips.filter(x=>x!==value);
  else if(c.chips.length>=2){say('兩個插槽已滿。先點已裝韌體卸下，再安裝新韌體。');return;}else c.chips.push(value);commit();
 }
 if(action==='district'){
  const n=+value;if(c.selected.includes(n))c.selected=c.selected.filter(i=>i!==n);
  else if(B.cityNetwork(c).cost+B.CITY[n].cost>5){say('修復點數不足。先關閉另一個街區，騰出預算。');return;}else c.selected.push(n);commit();
 }
});
$('controls').addEventListener('input',e=>{if(e.target.id!=='rate')return;state.configs.overclock.rate=+e.target.value;$('rate-value').textContent='×'+(+e.target.value).toFixed(2);restart('時脈已調整，已重新試跑。');});
function transport(action){
 if(action==='restart'){state.paused=false;restart('已使用目前配置重新試跑。');}
 if(action==='reset'){state.configs[state.mode]=B.clone(B.DEFAULTS[state.mode]);state.source=null;commit('已還原此玩法起始配置，其他玩法保留。');}
 if(action==='pause'){state.paused=!state.paused;update();say(state.paused?'已暫停。可以改裝，再按繼續。':'繼續試跑。');}
 if(action==='speed'){state.speed=state.speed===1?3:1;update();}
}
window.addEventListener('hashchange',()=>select(location.hash.slice(1),false));
function text(id,v){if($(id).textContent!==String(v))$(id).textContent=v;}
function update(){
 if(!run)return;const resource=run.resource();
 text('hp-text',Math.ceil(run.hp)+'／120');$('hp').value=run.hp;text('resource-name',resource[0]);text('resource-text',Math.floor(resource[1])+'／'+resource[2]);$('resource').max=resource[2];$('resource').value=resource[1];
 text('kills',run.kills);text('damage',Math.round(run.damage));text('combos',run.combos);text('clock',run.t.toFixed(1)+'／30');text('pause',state.paused?'繼續':'暫停');$('pause').disabled=run.done;text('speed','速度 ×'+state.speed);$('speed').setAttribute('aria-pressed',String(state.speed===3));
 let s='護盾 '+Math.floor(run.shield)+'／70';
 if(state.mode==='circuit')s+='・未接通浪費 '+run.wasted+' 格訊號';
 if(state.mode==='tape')s+='・'+(run.lastStep<0?'準備播放':'第 '+(run.lastStep+1)+' 拍：'+B.STEPS[run.config.steps[run.lastStep]][0]);
 if(state.mode==='overclock')s+='・'+(run.overheated?'過熱停機中':'武器運作中')+'・累計停機 '+run.downtime.toFixed(1)+' 秒';
 if(state.mode==='frequency')s+='・'+(run.lastPhase<0?'準備調諧':'目前第 '+(run.lastPhase+1)+' 拍');
 if(state.mode==='firmware')s+='・'+(run.config.chips.map(x=>CHIPS[x][0]).join('＋')||'原廠射擊');
 if(state.mode==='city'){const n=run.buff.counts;s+='・供能：電源 '+n.power+'／冷卻 '+n.cool+'／訊號 '+n.signal+'／修復 '+n.repair;}
 text('mechanic-status',s);
 const log=run.logs.map(x=>'<li>'+x.t.toFixed(1)+' 秒：'+x.message+'</li>').join('');if($('combat-log').innerHTML!==log)$('combat-log').innerHTML=log;
 if(state.mode==='tape')for(let i=0;i<4;i++){const b=$('tape-'+i);if(b)b.classList.toggle('step-playing',i===run.lastStep);}
 if(state.mode==='frequency')for(let i=0;i<4;i++){const b=$('phase-'+i);if(b)b.classList.toggle('step-playing',i===run.lastPhase);}
 const key=state.mode+'-'+state.scenario,p=state.previous[key];
 text('previous',p?'上一局：擊破 '+p.kills+'・傷害 '+p.damage+'・剩餘生命 '+p.hp+'・'+p.time+' 秒。':'完成一局後，這裡會留下上一局結果。');
 if(run.done){$('end-banner').hidden=false;text('end-banner',run.hp<=0?'機體倒下・改裝再試':state.scenario==='boss'&&run.kills?'首領擊破':'30 秒試跑完成');if(!state.recorded){state.previous[key]=run.result();state.recorded=true;say('本局結束。擊破 '+run.kills+'，有效傷害 '+Math.round(run.damage)+'。結果已保留，可改裝比較。');}}
}
const canvas=$('arena'),ctx=canvas.getContext('2d');
function draw(){
 if(!run||!ctx)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};ctx.imageSmoothingEnabled=false;
 rect(0,0,360,180,'#18213e');for(let y=20;y<180;y+=22)rect(0,y,360,1,'#283252');
 for(let x=-80;x<400;x+=40){ctx.strokeStyle='#283252';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+60,180);ctx.stroke();}
 rect(0,144,360,36,'#303a59');for(let x=10;x<350;x+=45)rect(x,158,21,2,'#657396');
 rect(26,19,3,105,'#657396');rect(24,19,24,3,'#9ca9c8');rect(43,22,6,7,'#81cbd1');rect(312,14,34,48,'#303d9b');rect(318,20,23,4,'#81cbd1');rect(318,32,16,3,'#9ca9c8');
 const orbit=state.mode==='firmware'&&run.config.chips.includes('orbit'),hy=90+(orbit&&!reduced?Math.sin(run.t*2.5)*36:0);
 rect(88,102,27,5,'#0b132c');if(run.shield>0){ctx.strokeStyle='#81cbd1';ctx.lineWidth=2;ctx.strokeRect(87,hy-22,27,39);}
 rect(94,hy-17,12,9,'#d0b7b1');rect(92,hy-21,16,5,'#aa98c5');rect(102,hy-17,4,2,'#18213e');rect(90,hy-8,20,15,'#9ca9c8');rect(91,hy-7,5,13,'#303d9b');rect(110,hy-5,9,5,'#81cbd1');rect(91,hy+7,8,12,'#58678f');rect(102,hy+7,8,12,'#58678f');rect(89,hy+17,11,4,'#dce5ef');rect(101,hy+17,12,4,'#dce5ef');
 for(const e of run.enemies){const w=e.boss?27:14,c=run.cold>run.t?'#81cbd1':e.boss?'#df917e':e.id%2?'#aa98c5':'#89a8d0';rect(e.x-w/2-3,e.y+8,w+6,3,'#0b132c');rect(e.x-w/2,e.y-w/2,w,w,c);rect(e.x-4,e.y-3,8,4,'#18213e');rect(e.x-2,e.y-2,3,2,'#e4c379');rect(e.x-w/2-4,e.y+2,5,3,c);rect(e.x+w/2-1,e.y+2,5,3,c);rect(e.x-w/2,e.y-w/2-5,w,2,'#475778');rect(e.x-w/2,e.y-w/2-5,Math.max(1,w*e.hp/e.max),2,'#df917e');}
 if(!reduced)for(const f of run.fx){const colors={basic:'#657396',laser:'#81cbd1',burst:'#e4c379',cold:'#89a8d0',mark:'#aa98c5',pulse:'#aa98c5',side:'#df917e'};ctx.strokeStyle=colors[f.kind]||'#81cbd1';ctx.lineWidth=f.kind==='burst'?3:1;ctx.beginPath();ctx.moveTo(117,hy);ctx.lineTo(f.x,f.y);ctx.stroke();if(f.kind==='burst'||f.kind==='pulse')ctx.strokeRect(f.x-10,f.y-10,20,20);ctx.fillStyle='#edf3f5';ctx.font='9px monospace';ctx.fillText(f.amount,f.x-5,f.y-17);}
 ctx.fillStyle='#c8d3eb';ctx.font='9px monospace';ctx.fillText(state.paused?'PAUSED':run.done?'FINISHED':'AUTO / '+state.speed+'X',10,12);ctx.fillText(state.scenario==='boss'?'ARMORED BOSS':'DRONE SWARM',241,173);
}
let last=0,debt=0,lastUI=0;
function frame(now){const dt=last?Math.min((now-last)/1000,.15):0;last=now;if(!document.hidden&&!state.paused&&run&&!run.done){debt+=dt*state.speed;while(debt>=.05&&!run.done){run.tick(.05);debt-=.05;}}else debt=0;if(now-lastUI>50){update();draw();lastUI=now;}requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{last=0;debt=0;});
window.BuildcraftLab={state,get run(){return run;},select,restart,update,transport,jump(id){const el=$(id);el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:'instant'});}};select(location.hash.slice(1)||'circuit',false);requestAnimationFrame(frame);
})();
