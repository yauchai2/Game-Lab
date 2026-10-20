/* ---------- drawing helpers ---------- */
function tSph(x, y, z, r, hex, w=1.1){
  const m = matOf(hex), [X,Y] = P(x,y,z), R = r*1.2247;
  return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${m.d}"/>`
    + `<circle cx="${f(X + R*.08)}" cy="${f(Y - R*.06)}" r="${f(R*.9)}" fill="${m.m}"/>`
    + `<circle cx="${f(X + R*.2)}" cy="${f(Y - R*.15)}" r="${f(R*.6)}" fill="${m.l}"/>`
    + `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="none" stroke="${INK}" stroke-width="${w}"/>`;
}
function tEyes(x, y, z, r, o={}){
  const dv = norm([1,1,.35]), sd = [.7071,-.7071,0], col = o.col || '#fff'; let s = '';
  for (const k of [-1,1]){
    const [X,Y] = P(x + dv[0]*r*.95 + sd[0]*k*r*.38, y + dv[1]*r*.95 + sd[1]*k*r*.38, z + dv[2]*r*.95);
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r*(o.big || .3))}" fill="${col}" stroke="${INK}" stroke-width=".7"/>`;
    if (!o.noPupil) s += `<circle cx="${f(X + r*.06)}" cy="${f(Y + r*.04)}" r="${f(r*.14)}" fill="${o.pup || INK}"/>`;
  }
  return s;
}
function tBar(x, y, z, w, pct, col){
  const [X,Y] = P(x, y, z), W2 = w*1.1, H2 = 2.3, x0 = X - W2/2;
  return `<rect x="${f(x0)}" y="${f(Y)}" width="${f(W2)}" height="${f(H2)}" rx="1" fill="#4a3a30" stroke="${INK}" stroke-width=".8"/>`
    + (pct > 0 ? `<rect x="${f(x0 + .4)}" y="${f(Y + .4)}" width="${f(Math.max(0, (W2 - .8)*tClamp(pct)))}" height="${f(H2 - .8)}" rx=".6" fill="${col}"/>` : '');
}
function tRing(x, y, r, z, n=8){ return Array.from({ length:n }, (_, i) => [x + r*Math.cos(i/n*6.2832), y + r*Math.sin(i/n*6.2832), z]); }
const shadowOf = (x, y, r, hgt) => castShadow([...tRing(x, y, r, BZ), [x, y, BZ + hgt]], BZ);

/* ---------- characters ---------- */
function drawHero(){
  const h = G.h, t = G.time;
  if (h.dead > 0){
    return box(HX - 2.5, HY - 1.5, BZ, HX + 2.5, HY + 1.5, BZ + 7, { l:'#cfcabc', m:'#aaa598', d:'#7b766a' }, toneI, 1.1)
      + tx(HX + 2.6, HY, BZ + 4.2, 'RIP', 2.6, INK, 800);
  }
  let x = HX + (h.hurtT > 0 ? Math.sin(t*90)*.5 : 0); const y = HY, z = BZ + Math.max(0, Math.sin(t*3)*.35);
  const tunic = matOf('#4f7fd6');
  let s = '';
  s += cyl(x - 1.5, y, BZ, BZ + 4.6, 1.3, matOf('#5a3b28'), toneI, .9, 10);
  s += cyl(x + 1.5, y, BZ, BZ + 4.6, 1.3, matOf('#5a3b28'), toneI, .9, 10);
  s += cyl(x, y, z + 4.3, z + 10.4, 3.1, tunic, toneI, 1.3, 14);
  s += ink(pd(on(PZ(z + 6.2), ellUV(x, y, 3.12, 3.12, 14))), .8);
  s += cyl(x, y, z + 10.2, z + 11.4, 2.7, matOf('#d9483b'), toneI, .9, 12);
  s += tSph(x - 1, y - 1, z + 13.9, 3.2, '#6b4426', 1.1) + tSph(x, y, z + 12.9, 2.8, '#f1c9a0', 1.1) + tEyes(x, y, z + 12.9, 2.8);
  // sword arm
  const a = (h.swingT < 0 ? 72 + Math.sin(t*3)*3 : tLerp(115, -30, ease(h.swingT/.3))) * Math.PI/180;
  const hand = [x + 3.3, y - .8, z + 7.4], dir = [0, -Math.cos(a), Math.sin(a)], tip = hand.map((v, i) => v + dir[i]*9.5), mid = hand.map((v, i) => v + dir[i]*1.1);
  s += rod([x + 2.6, y, z + 9.4], hand, .95, tunic, toneI, .9);
  s += rod(hand, tip, .5, METAL, toneI, .9);
  s += rod([mid[0] - 1.4, mid[1], mid[2]], [mid[0] + 1.4, mid[1], mid[2]], .45, matOf('#c9a13b'), toneI, .8);
  s += tSph(hand[0], hand[1], hand[2], 1, '#f1c9a0', .8);
  if (h.castT >= 0){ const u = ease(tClamp(h.castT/.25)), [X,Y] = P(x + 3.4, y - 3.6, z + 9.2), R = 2.4*u*1.22, sc = (SKILLS[h.castSk] || SKILLS.FIRE).col;
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R*1.8)}" fill="${sc}" opacity=".3"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${sc}" stroke="${INK}" stroke-width=".9"/><circle cx="${f(X + R*.15)}" cy="${f(Y - R*.15)}" r="${f(R*.5)}" fill="#ffe08a"/>`; }
  s += tBar(x, y, z + 21.5, 9, h.hp / G.st.life, '#e2483d');
  return s;
}
function drawSlime(m){
  const t = G.time + m.ph, sq = 1 + .1*Math.sin(t*5) + (m.lunge >= 0 ? .15*Math.sin(Math.PI*m.lunge/.3) : 0), hg = 6.4/sq, r = 4.7*Math.sqrt(sq), y = m.y + (m.lunge >= 0 ? 3*Math.sin(Math.PI*m.lunge/.3) : 0);
  const mat = matOf('#7ed36b'), lv = [[0,.95],[1.4,1.06],[3.2,.98],[4.9,.66],[6.2,.26]];
  const rings = lv.map(([zz, k]) => on(PZ(BZ + zz*hg/6.4), ellUV(m.x, y, r*k, r*k, 16)));
  let s = '';
  for (let i = 0; i < rings.length - 1; i++) s += loft(rings[i], rings[i+1], n => toneI(n, mat));
  s += fill(pd(rings[4]), mat.l) + hullInk(rings.flat(), 1.8);
  s += tEyes(m.x, y, BZ + hg*.55, 3.2) ;
  s += tBar(m.x, y, BZ + hg + 5, 8, m.hp/m.hpMax, '#e2483d');
  return { s, sh:shadowOf(m.x, y, r, hg) };
}
function drawSkel(m){
  const t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, x = m.x, y = m.y + 3*lg, bob = m.fight ? 0 : Math.abs(Math.sin(t*9))*.8, z = BZ + bob;
  let s = '';
  s += rod([x - 1.1, y, BZ], [x - 1.1, y, z + 5], .7, BONE, toneI, .8) + rod([x + 1.1, y, BZ], [x + 1.1, y, z + 5], .7, BONE, toneI, .8);
  s += cyl(x, y, z + 4.8, z + 9.6, 2.1, BONE, toneI, 1.1, 12);
  for (const zz of [6.3, 7.5, 8.7]) s += ink(pd(on(PZ(z + zz), ellUV(x, y, 2.12, 2.12, 12))), .7);
  const hand = [x + 2.7, y + 3.2, z + 7.4], a = tLerp(65, 5, lg)*Math.PI/180;
  s += rod([x + 2.1, y, z + 9], hand, .6, BONE, toneI, .8) + rod([x - 2.1, y, z + 9], [x - 2.4, y + 1.8, z + 7.6], .6, BONE, toneI, .8);
  s += rod(hand, [hand[0], hand[1] + Math.cos(a)*7.5, hand[2] + Math.sin(a)*7.5], .55, { l:'#b57d4f', m:'#935f38', d:'#5c3a22' }, toneI, .9);
  s += tSph(x, y, z + 11.8, 2.5, '#f1ecda', 1.1) + tEyes(x, y, z + 11.8, 2.5, { col:'#2b2623', noPupil:true, big:.34 });
  s += tBar(x, y, z + 19, 8, m.hp/m.hpMax, '#e2483d');
  return { s, sh:shadowOf(x, y, 2.6, 13) };
}
function drawBrute(m){
  const k = m.boss ? 1.55 : 1, t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, x = m.x, y = m.y + 3.5*lg, bob = m.fight ? 0 : Math.abs(Math.sin(t*6))*.6;
  const z = BZ + bob, body = matOf(m.boss ? '#8e5fd1' : '#e0644a'), skin = m.boss ? '#b79af0' : '#f0a07f';
  let s = '';
  s += cyl(x - 1.9*k, y, BZ, BZ + 3.6*k, 1.8*k, matOf('#4a3a30'), toneI, 1, 10) + cyl(x + 1.9*k, y, BZ, BZ + 3.6*k, 1.8*k, matOf('#4a3a30'), toneI, 1, 10);
  s += cyl(x, y, z + 3.2*k, z + 9.4*k, 4.3*k, body, toneI, 1.5, 16);
  s += ink(pd(on(PZ(z + 5.6*k), ellUV(x, y, 4.32*k, 4.32*k, 16))), .9);
  const hand = [x + 4.6*k, y + 3.6*k, z + 6.4*k], a = tLerp(75, -10, lg)*Math.PI/180, club = { l:'#a8693f', m:'#8a5a3c', d:'#5a3a26' };
  s += rod([x + 3.8*k, y, z + 8.4*k], hand, 1.3*k, body, toneI, 1) + rod([x - 3.8*k, y, z + 8.4*k], [x - 4.2*k, y + 2.2*k, z + 6.2*k], 1.3*k, body, toneI, 1);
  s += rod(hand, [hand[0], hand[1] + Math.cos(a)*8*k, hand[2] + Math.sin(a)*8*k], 1.1*k, club, toneI, 1.1, 2.1*k);
  s += rod([x + 1.8*k, y - 1.2*k, z + 13.4*k], [x + 3.2*k, y - 2.3*k, z + 16.6*k], .9*k, BONE, toneI, .8, .08) + rod([x - 1.8*k, y + 1.2*k, z + 13.4*k], [x - 3.2*k, y + 2.3*k, z + 16.6*k], .9*k, BONE, toneI, .8, .08);
  s += tSph(x, y, z + 11.8*k, 3.1*k, skin, 1.2) + tEyes(x, y, z + 11.8*k, 3.1*k, { col:'#fff3c4', pup:'#b0201a' });
  if (m.boss) s += cyl(x, y, z + 14.5*k, z + 16.2*k, 2.3*k, matOf('#f2c230'), toneI, 1, 10);
  s += tBar(x, y, z + 20.5*k, m.boss ? 15 : 9, m.hp/m.hpMax, m.boss ? '#8e3fd1' : '#e2483d');
  return { s, sh:shadowOf(x, y, 4.4*k, 12*k) };
}
function drawMon(m){
  const r = m.type === 'slime' ? drawSlime(m) : m.type === 'skel' ? drawSkel(m) : drawBrute(m);
  let s = r.s;
  if (m.dead) s = `<g opacity="${(1 - m.deadT/.4).toFixed(2)}">${s}</g>`;
  else if (m.frozen > 0) s = `<g style="filter:hue-rotate(160deg) saturate(.7) brightness(1.25)">${s}</g>`;
  else if (m.hurtT > 0) s = `<g style="filter:brightness(1.7)">${s}</g>`;
  return { s, sh: m.dead ? '' : r.sh };
}

/* ---------- props ---------- */
function drawTree(x, y, sc=1){
  const B = BIOMES[biomeNow()], g1 = matOf(B.t1), g2 = matOf(B.t2);
  return cyl(x, y, BZ, BZ + 4.5*sc, 1.3*sc, matOf('#8a5a3c'), toneI, 1, 10)
    + rod([x, y, BZ + 3*sc], [x, y, BZ + 10*sc], 4.4*sc, g1, toneI, 1.3, .3)
    + rod([x, y, BZ + 7.5*sc], [x, y, BZ + 14*sc], 3.4*sc, g2, toneI, 1.2, .3);
}
function drawSign(){
  return rod([4, 68, BZ], [4, 68, BZ + 11], .8, WOOD, toneI, 1)
    + shape(on(PX(4.8), rectUV(62, BZ + 6.4, 74, BZ + 11.6)), WOOD.l, 1.2)
    + tx(4.9, 68, BZ + 8.2, G.run ? 'MAP ' + G.run.map.lvl : 'DEPTH ' + G.depth, 2.7, INK, 800);
}
function drawPortal(){
  const [sx, sy] = SPAWN, t = G.time, pulse = G.fx.find(e => e.k === 'portal'), B = BIOMES[biomeNow()];
  let s = cyl(sx, sy, BZ, BZ + 1.2, 7, STONE, toneI, 1.4, 20);
  s += fill(pd(on(PZ(BZ + 1.25), ellUV(sx, sy, 5.2, 5.2, 20))), B.portal) + ink(pd(on(PZ(BZ + 1.25), ellUV(sx, sy, 5.2, 5.2, 20))), 1);
  s += fill(pd(on(PZ(BZ + 1.3), ellUV(sx, sy, 3.2 + (pulse ? 1.2*Math.sin(pulse.t*3.14) : 0), 3.2 + (pulse ? 1.2*Math.sin(pulse.t*3.14) : 0), 16))), B.glow);
  for (let i = 0; i < 3; i++){ const a0 = t*70 + i*120; s += `<path d="${pd(on(PZ(BZ + 1.35), arcUV(sx, sy, 3.8, a0, a0 + 70, 6)), false)}" stroke="#ffffff" stroke-width="1.2" fill="none" stroke-linecap="round"/>`; }
  return s;
}

/* ---------- effects, drops, floats ---------- */
function drawDrop(d){
  const kind = d.kind, col = kind === 'gem' ? '#a87bf0' : kind === 'map' ? BIOMES[d.map.biome].glow : RAR[d.it.r].g, rare = kind !== 'item' || d.it.r >= 2;
  if (d.t < 0) return { at:[HX, HY, 0], svg:'' };
  let x = d.x, y = d.y, z = BZ;
  if (d.t < .6) z += Math.abs(Math.sin(d.t/.6*Math.PI*1.5))*5*(1 - d.t/.6) + .3;
  else if (d.t >= 1.2){ const u = ease(tClamp((d.t - 1.2)/.5)); x = tLerp(d.x, HX, u); y = tLerp(d.y, HY, u); z = BZ + .3 + Math.sin(u*Math.PI)*8 + u*7; } else z += .3 + Math.sin(d.t*6)*.25;
  let s = '';
  if (d.t < 1.2){ const [X,Y] = P(x, y, BZ + .1); s += `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(4.2)}" ry="${f(2.4)}" fill="${col}" opacity="${(.3 + .12*Math.sin(d.t*8)).toFixed(2)}"/>`; }
  if (rare && d.t < 1.2) s += fill(pd([[x - .9, y - .9, BZ], [x + .9, y + .9, BZ], [x + .9, y + .9, BZ + 17], [x - .9, y - .9, BZ + 17]]), col, 'opacity=".3"');
  if (kind === 'gem') s += tSph(x, y, z + 1.4, 1.5, col, .9);
  else if (kind === 'map') s += box(x - 1.8, y - 1.8, z, x + 1.8, y + 1.8, z + 1.2, matOf('#e8d9a8'), toneI, .9) + shape(on(PZ(z + 1.25), rectUV(x - 1, y - 1, x + 1, y + 1)), BIOMES[d.map.biome].portal, .6);
  else s += box(x - 1.3, y - 1.3, z, x + 1.3, y + 1.3, z + 2.6, matOf(col), toneI, .9);
  return { at:[x, y, z], svg:s };
}
function drawFx(){
  let s = '';
  for (const e of G.fx){
    if (e.k === 'boom'){ const [X,Y] = P(e.x, e.y, e.z), R = tLerp(2, e.big ? 16 : 9, ease(e.t))*1.22; s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="#ff9a3c" opacity="${((1 - e.t)*.8).toFixed(2)}" stroke="${INK}" stroke-width=".9"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R*.55)}" fill="#ffe08a" opacity="${(1 - e.t).toFixed(2)}"/>`; }
    if (e.k === 'slash'){ const [X,Y] = P(e.x + 2, e.y, e.z), R = tLerp(3, 7, e.t); s += [0,1,2,3,4].map(i => { const a = i*1.2566 + .4; return `<path d="M${f(X + Math.cos(a)*R*.4)} ${f(Y + Math.sin(a)*R*.4)}L${f(X + Math.cos(a)*R)} ${f(Y + Math.sin(a)*R)}" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="${(1 - e.t).toFixed(2)}"/>`; }).join(''); }
    if (e.k === 'nova'){ const r = tLerp(3, 46, ease(e.t)); s += `<path d="${pd(on(PZ(BZ + .2), ellUV(HX, HY, r, r, 28)))}" fill="#9fe0ff" opacity="${((1 - e.t)*.45).toFixed(2)}" stroke="#e8f8ff" stroke-width="1.6"/>`; }
    if (e.k === 'bolt'){ const pts = []; e.pts.forEach((p, i) => { if (i) pts.push([(e.pts[i-1][0] + p[0])/2 + tRand(-2, 2), (e.pts[i-1][1] + p[1])/2 + tRand(-2, 2), (e.pts[i-1][2] + p[2])/2 + tRand(1, 3)]); pts.push(p); });
      const d2 = pd(pts, false); s += `<path d="${d2}" fill="none" stroke="#ffe45c" stroke-width="4" opacity="${((1 - e.t)*.5).toFixed(2)}" stroke-linejoin="round"/><path d="${d2}" fill="none" stroke="#fffbd0" stroke-width="1.5" opacity="${(1 - e.t).toFixed(2)}" stroke-linejoin="round"/>`; }
  }
  for (const p of G.proj){
    if (p.k === 'meteor'){ const u = tClamp(p.t), z = tLerp(70, BZ + 2, u*u), rr = tLerp(2, 7, u);
      s += `<path d="${pd(on(PZ(BZ + .2), ellUV(p.x, p.y, rr, rr, 14)))}" fill="#e2483d" opacity="${(.15 + .3*u).toFixed(2)}"/>`;
      const [X,Y] = P(p.x, p.y, z), R = 3.4*1.22; s += `<circle cx="${f(X)}" cy="${f(Y - 6)}" r="${f(R*2)}" fill="#ffb347" opacity=".3"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="#8a4c36" stroke="${INK}" stroke-width="1"/><circle cx="${f(X + R*.2)}" cy="${f(Y - R*.2)}" r="${f(R*.5)}" fill="#ff7a2a"/>`; continue; }
    if (p.t < 0 || !p.tg) continue; const u = tClamp(p.t), a = [HX + 3.4, HY - 3.6, BZ + 9.2], b = [p.tg.x, p.tg.y, BZ + 6];
    for (let k = 3; k >= 0; k--){ const uu = Math.max(0, u - k*.05), q = [tLerp(a[0], b[0], uu), tLerp(a[1], b[1], uu), tLerp(a[2], b[2], uu) + Math.sin(uu*Math.PI)*4], [X,Y] = P(...q), R = (k ? 1.4 - k*.25 : 2.2)*1.22;
      s += k ? `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="#ff9a3c" opacity=".5"/>` : `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R*1.8)}" fill="#ffb347" opacity=".35"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="#ff7a2a" stroke="${INK}" stroke-width=".9"/><circle cx="${f(X + R*.15)}" cy="${f(Y - R*.15)}" r="${f(R*.5)}" fill="#ffe08a"/>`; }
  }
  return s;
}
function drawFloats(){
  return G.floats.map(fl => { const [X,Y] = P(fl.x + 3, fl.y, fl.z + fl.t*9);
    return `<text x="${f(X)}" y="${f(Y)}" text-anchor="middle" font-size="${f(fl.size*1.5)}" fill="${fl.col}" stroke="#f2efe7" stroke-width="1.6" paint-order="stroke" font-family="ui-monospace,Menlo,monospace" font-weight="800" opacity="${(1 - fl.t*fl.t).toFixed(2)}">${fl.txt}</text>`; }).join('');
}

/* ---------- scene ---------- */
function scene(){
  const B = BIOMES[biomeNow()];
  let s = board(0, 0, BXW, BYW, BZ, 4, B.board);
  const ents = [];
  const trees = [[4, 22, 1.1], [27, 25, .9]];
  s += drawPortal();
  trees.forEach(([x, y, k]) => { s += castShadow([...tRing(x, y, 4*k, BZ), [x, y, BZ + 14*k]], BZ); ents.push({ at:[x, y, BZ], svg:drawTree(x, y, k) }); });
  ents.push({ at:[4, 68, BZ], svg:drawSign() });
  if (G.h.dead <= 0) s += shadowOf(HX, HY, 3.4, 16);
  ents.push({ at:[HX, HY, BZ + 1], svg:drawHero() });
  for (const m of G.mons){ const r = drawMon(m); s += r.sh; ents.push({ at:[m.x, m.y, BZ + 2], svg:r.s }); }
  for (const dd of G.drops) ents.push(drawDrop(dd));
  s += byDepth(ents) + drawFx() + drawFloats();
  return s;
}


