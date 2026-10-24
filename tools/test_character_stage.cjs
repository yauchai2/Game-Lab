/* Source-backed state coverage; browser interactions live in test_character_stage_browser.cjs. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createRuntime}=require('./lib/offline-runtime.cjs');
const r=createRuntime(47),src=f=>fs.readFileSync('src/game/'+f,'utf8');
r.evaluate(src('characters-data.js'));r.evaluate(src('05b-dress.js'));
r.evaluate(src('05g-layout.js').split('const UI_LAYOUT_CSS=')[0]);
r.evaluate(src('05p-character-workspace.js').split('const CHARACTER_WORKSPACE_CSS=')[0]);
r.evaluate(src('05r-direct-play.js').split('const DIRECT_PLAY_CSS=')[0]);
r.evaluate(`renderModal=()=>{};phoneButtonHtml=()=>'';uxAnnounce=()=>{};G.heroName='<玩家>';`);
const overview=r.evaluate(`modalTab='char';uiCharacterHtml()`);
assert.equal((overview.match(/id="pvhost"/g)||[]).length,0);
assert.equal((overview.match(/角色分頁/g)||[]).length,1);
for(const text of ['配裝與核心','單體直傷預估','生命與防禦','切換角色','專屬技能','個人資料','裝扮'])assert(overview.includes(text),text);
assert(!overview.includes('IDLE HERO ID'));assert(!overview.includes('角色頁與裝扮'));assert(overview.includes('&lt;玩家&gt;'));
const before=r.evaluate('JSON.stringify([G.equip,G.st,G.gold,G.own,G.cos])');
r.evaluate(`modalTab='dress';dressPick('weaponStyle','saber')`);
const trial=r.evaluate('dressHtml()');assert(trial.includes('取消試穿'));assert(trial.includes('金幣不足'));assert(!trial.includes('最大生命'));
assert.equal(r.evaluate('JSON.stringify([G.equip,G.st,G.gold,G.own,G.cos])'),before);
r.evaluate('dressCat(dSel.cat)');assert(!r.evaluate('dressHtml()').includes('取消試穿'));
r.evaluate(`dressPick('hat','cap')`);assert.equal(r.evaluate('dSel.cat'),'weaponStyle');
r.evaluate(`G.gold=10000;dressPick('weaponStyle','saber');dressBuy()`);assert.equal(r.evaluate('G.gold'),7500);assert.equal(r.evaluate('G.cos.weaponStyle'),'saber');r.evaluate('dressBuy()');assert.equal(r.evaluate('G.gold'),7500);
r.evaluate(`dressPick('offhandStyle','radio');G.gold=0;dressBuy()`);assert.equal(r.evaluate('G.gold'),0);assert.notEqual(r.evaluate('G.cos.offhandStyle'),'radio');
r.evaluate('dressRotate(1);dressRotate(0)');assert.equal(r.evaluate('PV.yaw'),.5);
for(const id of ['street','frost','beep','volt']){r.evaluate(`G.char='${id}';modalTab='char'`);const html=r.evaluate('uiCharacterHtml()');assert(html.includes(`data-character="${id}"`));assert.equal((html.match(/id="pvhost"/g)||[]).length,0);assert(html.includes(r.evaluate('CHARS[G.char].sig.n')));}
console.log('PASS concise character sheet, shared wardrobe stage and identity, all four data-backed profiles, escaped nickname, separated stats');
console.log('PASS preview/cancel are read-only, locked cosmetic categories rejected, insufficient funds and duplicate purchase guarded');
console.log('PASS rotation reset and preserved original equipment/stat owners');
