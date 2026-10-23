/* 純邏輯回歸：無作用改機不得扣資源、完整詞綴分類、兩種編年史共用搜尋。 */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { console, window:{}, document:{}, GridLab:require('../src/game/00-grid.js') };
vm.createContext(context);
for (const file of ['01-data.js','05f-ux.js','05c-craft.js','05e-wiki.js']) vm.runInContext(fs.readFileSync(__dirname+'/../src/game/'+file,'utf8'),context);
vm.runInContext(`
this.G = { equip:{weapon:null}, parts:0 };
this.state = craftState; this.execute = craftDo;
this.classify = mapKind; this.count = mapChallenge;
this.mods = MODS;
this.wikiRows = wikiRows;
this.wiki = WIKI;
this.uxAnnounce = () => {};
`,context);
context.G.equip.weapon={ r:0,aff:[],cr:0,il:1 };
assert.equal(context.state('weapon','recal').ok,false);
assert.match(context.state('weapon','upgrade').reason,/還差 100/);
context.G.parts=1000;
assert.equal(context.state('weapon','upgrade').cost,100);
assert.equal(context.state('weapon','upgrade').ok,true);
context.G.equip.weapon={r:1,aff:[{k:'dmg',v:10}],lk:0,cr:0,il:1};
const before=JSON.stringify(context.G);
context.execute('weapon','recal');
assert.equal(JSON.stringify(context.G),before,'全鎖定時不能付費或改動裝備');
assert.equal(context.state('weapon','swap').ok,false);
context.G.equip.weapon.cr=1;
for(const act of ['recal','swap','upgrade','corrupt']) assert.match(context.state('weapon',act).reason,/已腐化/);
for(const [key,m] of Object.entries(context.mods)) assert(['challenge','mixed','reward'].includes(m.kind),key+' must have category');
assert.equal(context.count(['elite','swarm','wise']),2);
assert.equal(context.count(['rich','lucky','wise']),0);
assert.equal(context.classify('future'),'未分類');
context.wikiRows = context.wikiRows;context.wiki.supp.rows=()=>[{t:'寬頻',d:'冷卻 -30%',s:'3 格',got:true}];
context.wiki.skill.rows=()=>[{t:'過熱電池',d:'投射物',s:'',mods:['Echo'],got:true}];
// 限定測試資料來源，不依賴 DOM 或完整戰鬥狀態。
for(const k of Object.keys(context.wiki)) if(!['supp','skill'].includes(k)) context.wiki[k].rows=()=>[];
assert.equal(context.wikiRows(' 寬頻 ').length,1);
assert.equal(context.wikiRows('echo').length,1);
assert.equal(context.wikiRows('不存在').length,0);
console.log('UX logic tests passed: crafting guards, modifier coverage, shared search');
