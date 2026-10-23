const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const {createRuntime}=require('./lib/offline-runtime.cjs');
const r=createRuntime(47);r.evaluate(fs.readFileSync('src/game/05b-dress.js','utf8'));r.evaluate('renderModal=()=>{};uxAnnounce=()=>{}');
assert.equal(r.evaluate(`(()=>{G.gold=10000;G.cos.hair='rose';G.own['hair:rose']=1;const before=JSON.stringify([G.cos,G.own,G.gold]);dressCat('hair');dressPick('hair','blue');dSel={cat:'hair',id:'blue'};dressBuy();if(JSON.stringify([G.cos,G.own,G.gold])!==before)return false;dressCat('weaponStyle');dressPick('weaponStyle','saber');dressBuy();if(G.gold!==7500||G.cos.weaponStyle!=='saber')return false;dressBuy();if(G.gold!==7500)return false;dressCat('offhandStyle');dressPick('offhandStyle','radio');dressBuy();dressCat('accessoryStyle');dressPick('accessoryStyle','pager');dressBuy();return G.cos.hair==='rose'&&G.own['hair:rose']===1&&G.cos.offhandStyle==='radio'&&G.cos.accessoryStyle==='pager'&&COS_CATS.length===3;})()`),true);
console.log('PASS three cosmetic categories only, legacy choices cannot spend funds, purchases are idempotent and legacy holdings persist');
assert.equal(r.evaluate(`(()=>{const before=JSON.stringify(calc(G.equip));G.cos.weaponStyle='umbrella';G.cos.offhandStyle='disc';G.cos.accessoryStyle='charm';return JSON.stringify(calc(G.equip))===before;})()`),true);
console.log('PASS cosmetics never change combat stats');
const css=fs.readFileSync('src/game/05f-ux.js','utf8'),view=fs.readFileSync('src/game/05h-view.js','utf8');
assert(css.includes('--ux-text:16px;--ux-line:24px;--ux-small:14px;--ux-small-line:20px'));assert(!css.includes('body.ui-material *{font-size:'));assert(view.includes('data-view-quality'));assert(view.includes("['auto','low','medium','high'].includes(prefs.quality)"));
const travel=view.slice(view.indexOf('function worldTravelRender(){'));assert(!travel.includes('innerHTML'));assert(!travel.includes('focus('));assert(travel.includes("setAttribute('aria-hidden','true')"));assert(view.includes('pointer-events:none'));assert(!travel.includes('button'));
console.log('PASS compact type tokens, semantic hierarchy, quality preference validation and decorative non-interactive travel layer');

r.evaluate(fs.readFileSync('src/game/05h-view.js','utf8'));
assert.equal(r.evaluate(`(()=>{viewRestorePrefs({quality:'low',idle:30,pixels:false});viewSavePrefs();const saved=localStorage.getItem(VIEW_KEY);viewRestorePrefs({quality:'corrupt'});if(GAME_VIEW.prefs.quality!=='auto')return false;viewRestorePrefs(JSON.parse(saved));return GAME_VIEW.prefs.quality==='low'&&GAME_VIEW.prefs.idle===30&&!GAME_VIEW.prefs.pixels;})()`),true);
console.log('PASS explicit quality preferences survive real storage write/read and invalid values fall back to auto');
