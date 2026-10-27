/* System log. Inlined into index.html by tools/pack_syslog.py so it runs before every other script
   and still records when a game script fails to load. Nothing leaves the device; the player copies the report. */
(function(){
 if(window.SYS)return;
 var MAX=500,KEY='idle-hero-syslog-v1',RETRY='ih-load-retry',buf=[],seq=0,prev=[],banner=null,onlyErr=false;
 try{var p=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(p))prev=p;}catch(e){}
 function fmt(v){try{if(v instanceof Error)return v.name+': '+v.message+(v.stack?' @'+String(v.stack).split('\n').slice(1,3).join('|').replace(/\s+/g,' '):'');if(typeof v==='string')return v;return JSON.stringify(v);}catch(e){return String(v);}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(buf.slice(-120)));}catch(e){}}
 function log(level,tag,msg){
  var m=fmt(msg).slice(0,400),last=buf[buf.length-1];
  if(last&&last.l===level&&last.g===tag&&last.m===m){last.c=(last.c||1)+1;return last;}
  var e={n:++seq,t:Math.round(performance.now()),l:level,g:tag,m:m};buf.push(e);if(buf.length>MAX)buf.splice(0,buf.length-MAX);
  if(level==='error')persist();return e;
 }
 function build(){var b=window.__BUILD||{};var v=b.version;try{if(!v&&typeof CHANGELOG!=='undefined')v=CHANGELOG[0].v;}catch(e){}
  return {channel:b.channel||'單檔／本機',version:v||'?',commit:(b.commit||'').slice(0,7)};}
 function buildLabel(){var b=build();return b.channel+' '+b.version+(b.commit?' · '+b.commit:'');}
 function webgl(){try{var c=document.createElement('canvas'),g=c.getContext('webgl')||c.getContext('experimental-webgl');if(!g)return '無法建立 WebGL';var x=g.getExtension('WEBGL_debug_renderer_info'),r=x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER);var l=g.getExtension('WEBGL_lose_context');if(l)l.loseContext();return String(r);}catch(e){return 'WebGL 錯誤 '+e.message;}}
 function line(e){return '+'+(e.t/1000).toFixed(1)+'s '+({error:'E',warn:'W',info:'I'}[e.l]||'I')+' '+e.g+' '+e.m+(e.c>1?' ×'+e.c:'');}
 function report(errorsOnly){
  var n=navigator,b=build(),out=['Hello, Static! 系統記錄','版本：'+buildLabel(),'時間：'+new Date().toISOString(),'網址：'+location.pathname+location.search,
   '裝置：'+n.userAgent,'畫面：'+innerWidth+'x'+innerHeight+' @'+(devicePixelRatio||1)+'x，觸控 '+(n.maxTouchPoints||0)+'，記憶體 '+(n.deviceMemory||'?')+'GB，語言 '+n.language,'顯示：'+webgl()];
  try{if(SYS.snapshot)out.push('遊戲：'+fmt(SYS.snapshot()));}catch(e){out.push('遊戲狀態讀取失敗：'+e.message);}
  var pe=prev.filter(function(e){return !errorsOnly||e.l==='error';});
  if(pe.length){out.push('','--- 上次開啟留下的錯誤紀錄（最後 '+pe.length+' 條）---');pe.forEach(function(e){out.push(line(e));});}
  out.push('','--- 這次開啟 ---');buf.filter(function(e){return !errorsOnly||e.l==='error';}).forEach(function(e){out.push(line(e));});
  return out.join('\n');
 }
 function copy(text,done){
  function fallback(){var t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}t.remove();done(ok);}
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){done(true);},fallback);return;}}catch(e){}
  fallback();
 }
 var CSS='position:fixed;z-index:2147483000;font:14px/1.5 system-ui,sans-serif;color:#fff;background:#172751;box-shadow:0 0 0 2px #fff,3px 3px 0 2px #0008;';
 var BTN='font:inherit;color:#172751;background:#e6e8f7;border:2px solid #fff;border-bottom-color:#9ca9c8;border-right-color:#9ca9c8;padding:6px 12px;margin:3px;min-height:36px;cursor:pointer;';
 function btn(label,fn){var b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText=BTN;b.onclick=fn;return b;}
 function open(){
  var old=document.getElementById('syslog-view');if(old)old.remove();
  var box=document.createElement('div');box.id='syslog-view';box.style.cssText=CSS+'inset:8px;display:flex;flex-direction:column;padding:8px;';
  var area=document.createElement('textarea');area.readOnly=true;area.style.cssText='flex:1;min-height:0;font:12px/1.4 monospace;color:#dfe8ff;background:#0d1733;border:2px solid #9ca9c8;padding:6px;resize:none;white-space:pre;';
  function refresh(){area.value=report(onlyErr);area.scrollTop=area.scrollHeight;}
  var msg=document.createElement('span');msg.style.cssText='margin-left:6px;color:#c6e96c;';
  var bar=document.createElement('div');
  bar.appendChild(btn('複製',function(){copy(area.value,function(ok){msg.textContent=ok?'已複製，可貼給 Claude。':'複製失敗，請長按文字全選。';});}));
  bar.appendChild(btn('下載',function(){try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([area.value],{type:'text/plain'}));a.download='system-log-'+Date.now()+'.txt';document.body.appendChild(a);a.click();a.remove();}catch(e){msg.textContent='下載失敗。';}}));
  bar.appendChild(btn('只看錯誤',function(){onlyErr=!onlyErr;this.textContent=onlyErr?'看全部':'只看錯誤';refresh();}));
  bar.appendChild(btn('清除',function(){buf.length=0;prev=[];try{localStorage.removeItem(KEY);}catch(e){}refresh();}));
  bar.appendChild(btn('關閉',function(){box.remove();}));bar.appendChild(msg);
  box.appendChild(bar);box.appendChild(area);document.body.appendChild(box);refresh();
 }
 function showBanner(text){
  if(banner||!document.body)return;banner=document.createElement('div');banner.style.cssText=CSS+'left:8px;right:8px;bottom:8px;padding:8px 10px;';
  var t=document.createElement('div');t.textContent=text+'（'+buildLabel()+'）';banner.appendChild(t);
  banner.appendChild(btn('查看記錄',open));
  banner.appendChild(btn('重新載入',function(){try{sessionStorage.removeItem(RETRY);}catch(e){}location.replace(location.pathname+'?retry='+Date.now());}));
  banner.appendChild(btn('收起',function(){banner.remove();}));document.body.appendChild(banner);
 }
 function loadFailed(what){
  var tried='';try{tried=sessionStorage.getItem(RETRY)||'';}catch(e){}
  if(!tried){try{sessionStorage.setItem(RETRY,'1');}catch(e){}log('warn','load','載入失敗，自動重試一次：'+what);persist();setTimeout(function(){location.replace(location.pathname+'?retry='+Date.now());},400);return;}
  showBanner('部分檔案載入失敗，畫面可能不完整。');
 }
 var SYS=window.SYS={log:log,report:report,open:open,build:build,label:buildLabel,banner:showBanner,snapshot:null,
  info:function(tag,msg){return log('info',tag,msg);},warn:function(tag,msg){return log('warn',tag,msg);},error:function(tag,msg){return log('error',tag,msg);}};
 window.sysLog=function(tag,msg,level){return log(level||'info',tag,msg);};
 log('info','boot','開始載入 '+buildLabel());
 addEventListener('error',function(ev){
  var t=ev.target;
  if(t&&t!==window&&t.tagName){var src=t.src||t.href||'';log('error','load',t.tagName.toLowerCase()+' 載入失敗 '+src.split('/').slice(-2).join('/'));if(t.tagName==='SCRIPT')loadFailed(src);return;}
  log('error','js',(ev.message||'錯誤')+' @'+String(ev.filename||'').split('/').pop()+':'+(ev.lineno||0)+':'+(ev.colno||0));
 },true);
 addEventListener('unhandledrejection',function(ev){log('error','promise',ev.reason||'未處理的 Promise 錯誤');});
 ['error','warn'].forEach(function(k){var o=console[k];if(!o)return;console[k]=function(){try{log(k==='error'?'error':'warn','console',Array.prototype.map.call(arguments,fmt).join(' '));}catch(e){}return o.apply(console,arguments);};});
 document.addEventListener('webglcontextlost',function(){log('error','webgl','畫面繪圖環境中斷（可能是記憶體不足）');},true);
 document.addEventListener('webglcontextrestored',function(){log('warn','webgl','畫面繪圖環境已恢復');},true);
 document.addEventListener('visibilitychange',function(){log('info','page',document.hidden?'切到背景':'回到前景');if(document.hidden)persist();});
 addEventListener('pagehide',persist);
 addEventListener('online',function(){log('info','net','網路恢復');});addEventListener('offline',function(){log('warn','net','網路中斷');});
 try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(e.duration>300)log('warn','perf','卡頓 '+Math.round(e.duration)+'ms');});}).observe({entryTypes:['longtask']});}catch(e){}
 (function fps(){var n=0,t=performance.now();function f(now){n++;if(now-t>=5000){var r=n*1000/(now-t);if(!document.hidden&&r<20)log('warn','perf','畫面約 '+r.toFixed(0)+' FPS');n=0;t=now;}requestAnimationFrame(f);}requestAnimationFrame(f);})();
 setTimeout(function(){if(document.getElementById('boot')){log('error','boot','15 秒仍未進入遊戲');showBanner('載入比平常久，可能有檔案沒載入。');}},15000);
 addEventListener('load',function(){log('info','boot','頁面檔案載入完成');try{sessionStorage.removeItem(RETRY);}catch(e){}});
})();
