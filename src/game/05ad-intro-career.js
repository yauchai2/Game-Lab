/* Four-class entry presentation. INTRO, CHARS and introBegin own drafts/rules/creation. */
const INTRO_CAST_ORDER=['street','frost','beep','volt'];
function introCareerRender(){
 const o=$('ovl'),id=INTRO.selected,c=CHARS[id],code=(c.model||id).toUpperCase();
 document.body.classList.add('career-screen-active');
 const polygon=key=>'polygon('+INTRO_CAST_ART.polygons[key].map(p=>p[0]+'% '+p[1]+'%').join(',')+')';
 o.innerHTML=`<section class="cs-screen entry-surface" aria-label="選擇角色"><div class="cs-top"><button type="button" class="cs-back" onclick="introStep(2)" aria-label="返回故事">← 返回故事</button><h1>選擇角色</h1></div><div class="cs-body"><div class="cs-cast"><div class="cs-stage" onpointerleave="introCareerPreview()"><img class="cs-group" src="${INTRO_CAST_ART.src}" width="${INTRO_CAST_ART.width}" height="${INTRO_CAST_ART.height}" alt="戰士、樂師、獵手和寵機師的四人合照" draggable="false" onerror="introCareerImageError(this)">${INTRO_CAST_ORDER.map(key=>`<img class="cs-layer ${id===key?'is-active':''}" data-layer="${key}" src="${INTRO_CAST_ART.layers[key]}" width="${INTRO_CAST_ART.width}" height="${INTRO_CAST_ART.height}" alt="" aria-hidden="true" draggable="false" onerror="this.closest('.cs-stage').classList.add('no-layers')">`).join('')}${['frost','street','beep','volt'].map(key=>`<button type="button" class="cs-hotspot" tabindex="-1" style="clip-path:${polygon(key)}" aria-label="從圖片選擇${uxEsc(CHARS[key].n)}" onpointerenter="introCareerPreview('${key}')" onclick="introChoose('${key}')"></button>`).join('')}<p class="cs-art-error" hidden>角色圖片暫時未能顯示。<br>仍可使用下方按鍵選擇。</p></div><p class="cs-hint">點選人物，或用下方職業按鍵</p><div class="cs-roles" role="group" aria-label="選擇職業" onkeydown="introCareerKeys(event)">${INTRO_CAST_ORDER.map(key=>`<button type="button" class="intro-choice cs-role" data-intro-char="${key}" aria-pressed="${id===key}" ${id===key?'data-initial-focus':''} onpointerenter="introCareerPreview('${key}')" onpointerleave="introCareerPreview()" onfocus="introCareerPreview('${key}')" onblur="introCareerPreview()" onclick="introChoose('${key}')"><span>${uxEsc(CHARS[key].n)}</span></button>`).join('')}</div></div><div class="cs-details"><div class="cs-identity"><div><span class="cs-code">${uxEsc(code)}</span><h2>${uxEsc(c.n)}</h2></div><span class="cs-title">${uxEsc(c.title)}</span></div><p class="cs-role-copy">${uxEsc(c.role)}</p><details class="cs-abilities"><summary tabindex="0">職業能力</summary><div><h3>${uxEsc(c.sig.n)}</h3><p>${uxEsc(c.sig.d)}</p><p>${uxEsc(c.passive)}</p></div></details><form class="cs-form" novalidate onsubmit="event.preventDefault();introBegin()"><label for="intro-name">玩家名稱 <span id="cs-name-help" class="cs-name-help">1 至 12 字</span></label><input id="intro-name" type="text" maxlength="12" autocomplete="nickname" value="${uxEsc(INTRO.name)}" placeholder="輸入你的名字" aria-describedby="cs-name-help intro-name-error" oninput="introCareerName(this)"><p id="intro-name-error" class="cs-error" role="alert"></p><div class="intro-pick cs-actions"><button type="submit" class="mb pri cs-begin">以${uxEsc(c.n)}開始冒險 <span aria-hidden="true">↗</span></button></div></form><p class="cs-footnote">職業創立後固定 · 每位角色獨立存檔</p>${PROFILE_SESSION.pending?'<button type="button" class="cs-cancel" onclick="introCareerCancel()">返回原角色</button>':''}</div></div></section>`;
 uxOpenDialog(o,'選擇角色',introEscape);
}
function introCareerPreview(id){
 const stage=document.querySelector('.cs-stage');if(!stage)return;
 const active=Object.hasOwn(CHARS,id)?id:INTRO.selected;
 for(const layer of stage.querySelectorAll('[data-layer]'))layer.classList.toggle('is-active',layer.dataset.layer===active);
 stage.dataset.active=active;
}
function introCareerKeys(e){
 if(e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
 const current=e.target.closest('[data-intro-char]');if(!current)return;
 let i=INTRO_CAST_ORDER.indexOf(current.dataset.introChar);
 if(['ArrowRight','ArrowDown'].includes(e.key))i=(i+1)%4;
 else if(['ArrowLeft','ArrowUp'].includes(e.key))i=(i+3)%4;
 else if(e.key==='Home')i=0;else if(e.key==='End')i=3;else return;
 e.preventDefault();introChoose(INTRO_CAST_ORDER[i]);
 document.querySelector(`.cs-role[data-intro-char="${INTRO_CAST_ORDER[i]}"]`)?.focus({preventScroll:true});
}
function introCareerName(input){
 INTRO.name=input.value;input.removeAttribute('aria-invalid');
 const error=document.getElementById('intro-name-error');if(error)error.textContent='';introPersist();
}
function introCareerImageError(image){const stage=image.closest('.cs-stage');if(!stage)return;stage.classList.add('is-unavailable');stage.querySelector('.cs-art-error').hidden=false;for(const b of stage.querySelectorAll('button'))b.disabled=true;}
function introCareerDispose(){document.body.classList.remove('career-screen-active');}
function introCareerCancel(){if(PROFILE_SESSION.pending){introCareerDispose();profileCancelNew();}}
addEventListener('pageshow',e=>{if(e.persisted&&INTRO.active&&!INTRO.cover&&INTRO.step===3)introCareerRender();});
const INTRO_CAREER_CSS=`
/* Character selection owns its scroll surface, leaving comic/title geometry untouched. */
body.intro-active.career-screen-active #ovl{padding:12px!important;align-items:center!important;background:#191919!important;overflow:auto!important}
body.intro-active.career-screen-active #ovl>.cs-screen{--cs-paper:#fff;--cs-blue:#303d9b;--cs-ink:#172751;position:relative;flex:none;width:min(920px,100%);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);margin:auto;padding:20px 24px;box-sizing:border-box;overflow:auto;overscroll-behavior:contain;background:var(--cs-paper);color:var(--cs-ink);font:16px/1.5 var(--ux-body);border:1px solid #c8cedc}
.cs-top{display:flex;align-items:center;justify-content:space-between;min-height:44px;gap:16px;margin-bottom:8px}
.cs-top h1{margin:0;font:20px/1.4 var(--ux-display);font-weight:400;white-space:nowrap}
body.ui-material #ovl .cs-screen .cs-back,body.ui-material #ovl .cs-screen .cs-cancel{min-height:44px;padding:6px 0;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0;color:#475778!important;font:14px/1.5 var(--ux-body);cursor:pointer}
.cs-body{display:grid;grid-template-columns:1.15fr 1fr;gap:32px;align-items:center}
.cs-cast{min-width:0}.cs-stage{position:relative;width:100%;aspect-ratio:192/231;isolation:isolate;overflow:visible;background:#fff}
.cs-group,.cs-layer{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:contain;image-rendering:pixelated;user-select:none;pointer-events:none}
.cs-group{filter:saturate(.35) brightness(.87)}
.cs-layer{opacity:0;transform:translateY(0);transition:opacity 140ms,transform 180ms;filter:brightness(1.04) drop-shadow(2px 0 #c5d9f3) drop-shadow(-2px 0 #c5d9f3)}
.cs-layer.is-active{opacity:1;transform:translateY(-3px);animation:cs-select 240ms ease-out both}
/* Contour buttons are pointer alternatives to the fully labeled keyboard/touch row. */
body.ui-material #ovl .cs-hotspot{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;min-height:0;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important;outline:none!important;filter:none!important;cursor:pointer;touch-action:manipulation}
.cs-hint{font-size:12px;text-align:center;color:#475778;margin:8px 0 10px}
.cs-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
body.ui-material #ovl .cs-roles .intro-choice{display:flex!important;align-items:center;justify-content:center;min-height:44px;padding:8px 2px!important;border:1px solid #bdc7db!important;border-radius:0;background:#f0f3fa!important;color:#172751!important;box-shadow:none!important;cursor:pointer}
body.ui-material #ovl .cs-roles .intro-choice[aria-pressed=true]{background:#303d9b!important;border-color:#303d9b!important;color:#fff!important;box-shadow:inset 0 -3px #171e60!important}
body.ui-material #ovl .cs-roles .intro-choice>span{font-size:14px!important;line-height:20px}
body.ui-material #ovl .cs-roles .intro-choice[aria-pressed=true]>span{color:#fff!important}
.cs-identity{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #dce2ed}
.cs-code{display:block;color:#475778;font-size:12px;letter-spacing:.16em}
body.ui-material #ovl .cs-identity h2{font-size:28px!important;font-weight:400;line-height:1.3;margin:4px 0 0}
.cs-title{font-size:14px;color:#475778;text-align:right}.cs-role-copy{margin:12px 0;font-size:14px;min-height:42px}
.cs-abilities{margin-bottom:20px;border-bottom:1px solid #dce2ed;padding-bottom:10px}
.cs-abilities summary{min-height:36px;cursor:pointer;font-size:14px}
.cs-abilities h3{font-size:16px;font-weight:400;margin:4px 0}.cs-abilities p{font-size:14px;margin:8px 0;color:#475778}
.cs-form{position:relative;display:grid;gap:6px}.cs-form label{display:flex;align-items:baseline;justify-content:space-between;font-size:14px}
body.ui-material #ovl .cs-form input{box-sizing:border-box;width:100%;height:48px;padding:10px 12px;border:1px solid #8d9db9!important;border-radius:0;background:#f7f9fe!important;color:#172751!important;box-shadow:inset 1px 1px #bdc7db!important;font:16px/1.5 var(--ux-body)}
body.ui-material #ovl .cs-form input[aria-invalid=true]{border-color:#b94732!important}
.cs-name-help{font-size:12px;color:#475778}.cs-error{font-size:14px;line-height:20px;min-height:20px;margin:0;color:#a53526}
body.ui-material #ovl .cs-screen .cs-begin{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:50px;padding:10px 16px;background:var(--ux-accent)!important;color:var(--ux-screen)!important;border:2px solid var(--ux-accent);border-radius:0;box-shadow:var(--ux-key-shadow);font:18px/1.4 var(--ux-display);font-weight:400;cursor:pointer;touch-action:manipulation}
.cs-footnote{font-size:12px;line-height:20px;color:#475778;margin:12px 0 0}
body.ui-material #ovl .cs-screen button:focus-visible,.cs-screen summary:focus-visible,.cs-screen input:focus-visible{outline:2px solid #1f3fb0!important;outline-offset:3px}
@media(hover:hover){body.ui-material #ovl .cs-roles button:not([aria-pressed=true]):hover{background:#e3e9f8!important}body.ui-material #ovl .cs-screen .cs-begin:hover{filter:brightness(1.06)}}
body.ui-material #ovl .cs-screen .cs-begin:active{box-shadow:var(--ux-inset)!important}
/* Keep entry copy compact despite the game's broad modal text-size rules. */
body.ui-material #ovl .cs-screen .cs-hint,body.ui-material #ovl .cs-screen .cs-name-help,body.ui-material #ovl .cs-screen .cs-footnote,body.ui-material #ovl .cs-screen .cs-code{font-size:12px!important;line-height:20px!important}
body.ui-material #ovl .cs-screen .cs-role-copy,body.ui-material #ovl .cs-screen .cs-title,body.ui-material #ovl .cs-screen .cs-form label,body.ui-material #ovl .cs-screen .cs-abilities summary{font-size:14px!important;line-height:22px!important}
body.ui-material #ovl .cs-screen .cs-error{font-size:14px!important;line-height:20px!important}
.cs-art-error{position:absolute;inset:40% 8% auto;text-align:center;font-size:14px;color:#475778}
.cs-art-error[hidden]{display:none}.cs-stage.is-unavailable .cs-group,.cs-stage.is-unavailable .cs-layer{display:none}.cs-stage.no-layers .cs-layer{display:none}.cs-stage.no-layers .cs-group{filter:none}
@keyframes cs-select{0%{transform:translateY(0)}55%{transform:translateY(-5px)}100%{transform:translateY(-3px)}}
@media(max-width:759px){body.intro-active.career-screen-active #ovl>.cs-screen{width:min(480px,100%);padding:14px 16px}.cs-body{grid-template-columns:1fr;gap:18px}.cs-stage{width:min(100%,calc(35dvh * 192 / 231));margin:0 auto}.cs-top{margin-bottom:0}.cs-top h1{font-size:18px}.cs-identity{padding-bottom:8px}.cs-role-copy{min-height:0;margin:8px 0}.cs-abilities{margin-bottom:12px;padding-bottom:4px}.cs-footnote{margin-top:10px}.cs-hint{margin:5px 0 8px}}
@media(max-height:620px) and (max-width:759px){.cs-stage{width:min(100%,calc(30dvh * 192 / 231))}.cs-body{gap:12px}.cs-top{min-height:36px}.cs-top h1{font-size:16px}}
@media(min-width:760px) and (max-height:620px){body.intro-active.career-screen-active #ovl>.cs-screen{padding:12px 20px}.cs-body{gap:24px;align-items:start}.cs-stage{width:min(100%,calc(57dvh * 192 / 231));margin:0 auto}}
@media(prefers-reduced-motion:reduce){.cs-screen *{animation:none!important;transition:none!important}.cs-layer.is-active{transform:none}}
body.reduced-effects .cs-screen *,body.title-screen-paused .cs-screen *{animation:none!important;transition:none!important}body.reduced-effects .cs-layer.is-active{transform:none}
@media(forced-colors:active){body.intro-active.career-screen-active #ovl>.cs-screen{background:Canvas;color:CanvasText}.cs-code,.cs-title,.cs-role-copy,.cs-hint,.cs-name-help,.cs-footnote{color:CanvasText}body.ui-material #ovl .cs-roles .intro-choice{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText!important}body.ui-material #ovl .cs-roles .intro-choice[aria-pressed=true]{background:Highlight!important;color:HighlightText!important}body.ui-material #ovl .cs-screen .cs-begin{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText}}
`;
{const s=document.createElement('style');s.textContent=INTRO_CAREER_CSS;document.head.appendChild(s);}
