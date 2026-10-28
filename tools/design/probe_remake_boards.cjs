// Read-only feasibility probe: source GridLab rules, no game state, drops or player saves.
// node tools/design/probe_remake_boards.cjs [output.json]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const Grid = require(path.join(root, 'src/game/00-grid.js'));
const cases = [
  { id:'start-bare', board:'pocket', level:1, slots:[{skill:'FIRE', supports:[]}] },
  { id:'start-heavy', board:'pocket', level:1, slots:[{skill:'FIRE', supports:['HEAVY']}] },
  { id:'start-cover', board:'pocket', level:1, slots:[{skill:'FIRE', supports:['HEAVY','AREA']}] },
  { id:'chain-cover', board:'duplex', level:10, slots:[{skill:'CHAIN', supports:['FORK']},{skill:'FIRE', supports:['HEAVY']}] },
  { id:'beam-focus', board:'duplex', level:16, slots:[{skill:'CHAIN', supports:['FOCUS']},{skill:'BEAM', supports:['FOCUS']}] },
  { id:'beam-wide', board:'duplex', level:16, slots:[{skill:'CHAIN', supports:[]},{skill:'BEAM', supports:['SPREAD']}] }
];
const results = cases.map(c => {
  const b = Grid.createBoard(c.board);
  const l = Grid.layout(b);
  const skills = [];
  for (const [i, slot] of c.slots.entries()) {
    const skill = Grid.place(b, 'active', slot.skill, ...l.socks[i]);
    assert(skill, `${c.id}: active placement`);
    const cells = Grid.route(b, i);
    assert(cells, `${c.id}: path exists`);
    // Directly construct probe fixtures; production manual wiring remains unchanged.
    b.wires.push({sock:i, cells});
    for (const support of slot.supports) {
      const cell = cells.find(([x,y]) => Grid.canPlace(b,'support',support,x,y));
      assert(cell, `${c.id}: same-color free pad for ${support}`);
      assert(Grid.place(b,'support',support,...cell), `${c.id}: support placement`);
    }
    skills.push(skill);
  }
  const resolved = Grid.resolve(b,c.level);
  for (const skill of skills) {
    const r = resolved.find(x=>x.id===skill.id);
    assert(r.wired && !r.missed.length && !r.over.length, `${c.id}: live compatible circuit`);
    assert.equal(r.linked.length, c.slots.find(x=>x.skill===skill.key).supports.length);
  }
  assert(Grid.powerUsed(b)<=l.power, `${c.id}: global power`);
  return {id:c.id, level:c.level, template:c.board, requiredBoardLevel:l.lvl,
    requiredBoardDepth:l.depth, powerUsed:Grid.powerUsed(b), powerCap:l.power,
    slots:c.slots, board:b, resolution:resolved};
});
const compatibility = ['FIRE','CHAIN','BEAM'].map(skill=>({skill,
  spread:Grid.fits('SPREAD',{key:skill}), area:Grid.fits('AREA',{key:skill}),
  recover:Grid.fits('RECOVER',{key:skill})}));
assert.equal(compatibility.find(r=>r.skill==='FIRE').spread,false);
assert.equal(compatibility.find(r=>r.skill==='BEAM').spread,true);
const sources = ['src/game/00-grid.js','src/game/00-grid-legacy.js','src/game/01-data.js'].map(file=>({file,
  sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
const report = {kind:'read-only circuit feasibility', date:'2026-10-28', timezone:'Asia/Hong_Kong',
  sources, cases:results, compatibility,
  limits:['No battle, DPS, character-passive, offline or migration simulation.',
    'Fixtures assume listed skills, board and tier-I supports are legally owned and skill gates met.',
    'Mode ownership, mode combat effects and equipment rolls are not executed by GridLab.resolve.',
    'Shared board feasibility does not verify the proposed four new character loops.']};
if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:results.length,compatible:compatibility,
  summary:results.map(r=>({id:r.id,power:`${r.powerUsed}/${r.powerCap}`,skills:r.slots.map(s=>s.skill)}))}));
