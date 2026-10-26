/* 背景運行與小視窗：分頁被切到背景時，由 Worker 計時續跑模擬；支援的瀏覽器可開啟置頂小視窗，顯示戰鬥縮圖與狀態。 */
function bgSupported(){return typeof documentPictureInPicture!=='undefined'&&!!documentPictureInPicture.requestWindow;}
function bgTick(){
  if(G.paused||G.offline)return;
  if(document.hidden){const now=Date.now(),gap=(now-G.lastWall)/1000;if(gap>=.25&&gap<=60){G.lastWall=now;stepSim(gap);}}
  if(BG.pip)bgPipDraw(performance.now());
}
function bgStart(){
  try{BG.worker=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),500)'],{type:'text/javascript'})));BG.worker.onmessage=bgTick;}
  catch(e){BG.worker=null;setInterval(bgTick,1000);}
  try{navigator.locks?.request('idle-hero-background',()=>new Promise(()=>{}));}catch(e){}
}
function bgPipDraw(now){
  if(!BG.pip||!BG.ctx||now-BG.last<120)return;BG.last=now;
  try{if(typeof scene==='function')scene();const cv=R3.rd&&R3.rd.domElement;if(cv&&cv.width>0){const w=BG.ctx.canvas.width,h=BG.ctx.canvas.height,k=Math.max(w/cv.width,h/cv.height),dw=cv.width*k,dh=cv.height*k;BG.ctx.imageSmoothingEnabled=false;BG.ctx.fillStyle='#9fd4f6';BG.ctx.fillRect(0,0,w,h);BG.ctx.drawImage(cv,(w-dw)/2,(h-dh)/2,dw,dh);}}catch(e){}
  if(BG.stats){const hp=Math.max(0,Math.ceil(G.h.hp)),life=Math.max(1,Math.ceil(G.st?.life||1));BG.stats.textContent=`LV ${G.lvl}　HP ${hp}/${life}　深度 ${G.depth}　金幣 ${G.gold}`;}
}
async function bgPipToggle(){
  if(BG.pip){try{BG.pip.close();}catch(e){}BG.pip=null;return;}
  if(!bgSupported()){ui.flash('此瀏覽器不支援小視窗，請改用 Chrome 或 Edge。',2600);return;}
  try{
    const w=await documentPictureInPicture.requestWindow({width:320,height:220});BG.pip=w;
    w.document.head.innerHTML='<style>html,body{margin:0;background:#2b2552;color:#f7faff;font:12px/1.4 "Cubic 11",system-ui,sans-serif}canvas{display:block;width:100%;image-rendering:pixelated}#s{padding:6px 8px;text-align:center}</style>';
    const cv=w.document.createElement('canvas');cv.width=320;cv.height=180;const s=w.document.createElement('div');s.id='s';w.document.body.append(cv,s);
    BG.ctx=cv.getContext('2d');BG.stats=s;
    const loop=t=>{if(BG.pip!==w)return;bgPipDraw(t);w.requestAnimationFrame(loop);};w.requestAnimationFrame(loop);
    w.addEventListener('pagehide',()=>{if(BG.pip===w){BG.pip=null;BG.ctx=null;BG.stats=null;}});
  }catch(e){BG.pip=null;ui.flash('小視窗開啟失敗。',2000);}
}
bgStart();
