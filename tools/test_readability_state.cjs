const assert=require('node:assert/strict'),{createRuntime}=require('./lib/offline-runtime.cjs'),Grid=require('../src/game/00-grid.js');
for(const id of Object.keys(Grid.TEMPLATES)){const b=Grid.createBoard(id),L=Grid.layout(b);assert.equal(new Set(L.colors).size,L.socks.length,'unique port colors '+id);assert(L.colors.every(c=>['r','b','g','y','v','c'].includes(c)));}
assert.deepEqual([...new Set(Object.values(Grid.GEM_COLOR))].sort(),['b','g','r']);
const r=createRuntime(51);r.evaluate(`
 const ensure=(ok,msg)=>{if(!ok)throw Error(msg)};
 ensure(Object.values(CHARS).map(c=>c.n).join(',')==='戰士,樂師,獵手,寵機師','short names');
 G.lvl=3;G.maxDepth=1;ensure(talentBudget()===1,'first scarce point');G.lvl=21;G.maxDepth=11;ensure(talentBudget()===12,'half-level plus depth milestones');G.lvl=999;G.maxDepth=999;ensure(talentBudget()===24,'hard cap');
 G.lvl=60;G.maxDepth=30;G.legacyMode=false;G.pass=[...Array.from({length:8},(_,i)=>'A'+i),'AK',...Array.from({length:8},(_,i)=>'B'+i),'BK',...Array.from({length:8},(_,i)=>'C'+i)];recalc();const before=JSON.stringify([G.st.life,G.st.inc,G.st.armor,G.st.firmware]),old=serialize();
 ensure(applySave(copyState(old)),'old modern save loads');ensure(G.pass.length===26&&!G.legacyMode&&passiveLegacy(),'over-budget nodes retained under original combat rules but frozen');ensure(JSON.stringify([G.st.life,G.st.inc,G.st.armor,G.st.firmware])===before,'old modern numerical rules retained');ensure(!canAllocateTalent('CK'),'cannot add more points');
 ensure(convertTalents()&&G.pass.length===24&&!passiveLegacy(),'explicit free conversion obeys new cap');ensure(restoreLegacyTalents()&&G.pass.length===26&&!G.legacyMode,'restore keeps original modern combat interpretation');
`);
console.log('PASS unique six-color port pairs, unchanged gem categories, short jobs, scarce budget and lossless old modern talent migration');
