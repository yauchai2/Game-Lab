/* ---------- drawing helpers ---------- */
// a:  small helpers shared by all the hand-inked art below (prefix "a" = art; core.js owns the short global names)
const aRnd = i => { const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };
const aInkP = (d, w, col=INK, op=1, extra='') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${op}" ${extra}/>`;
// A rounded solid of stacked circular rings: lv = [[dz, radius, offX, offY], ...] from the bottom up (jelly, rocks, bellies, caps).
function aBlob(x, y, z0, lv, m, w=1.4, n=14, shade=toneI){
  const rings = lv.map(([dz, r, ox=0, oy=0]) => on(PZ(z0 + dz), ellUV(x + ox, y + oy, Math.max(.05, r), Math.max(.05, r), n)));
  let s = '';
  for (let i = 0; i < rings.length - 1; i++) s += loft(rings[i], rings[i+1], nr => shade(nr, m));
  return s + fill(pd(rings[rings.length - 1]), shade([0,0,1], m)) + hullInk(rings.flat(), w);
}
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
    if (!o.noPupil) s += `<circle cx="${f(X + r*.06)}" cy="${f(Y + r*.04)}" r="${f(r*.14)}" fill="${o.pup || INK}"/>`
      + `<circle cx="${f(X + r*.1)}" cy="${f(Y - r*.02)}" r="${f(r*.05)}" fill="#fff"/>`;
  }
  return s;
}
// a short ink smile / frown on the face of a body centred (x,y), at height z
function aMouth(x, y, z, r, f2, up=1, w=.8){
  const sd = aSide(f2, .3*r), a = [x + f2[0]*r*.97 + sd[0], y + f2[1]*r*.97 + sd[1], z], b = [x + f2[0]*r*.97 - sd[0], y + f2[1]*r*.97 - sd[1], z], m2 = [x + f2[0]*r, y + f2[1]*r, z - .32*r*up];
  const [A, B, M] = [P(...a), P(...b), P(...m2)];
  return aInkP(`M${f(A[0])} ${f(A[1])}Q${f(M[0])} ${f(M[1])} ${f(B[0])} ${f(B[1])}`, w);
}
// Facing-aware face. f = unit [fx, fy] the character looks toward; s is the sideways axis. A feature is drawn only when its
// surface normal faces the viewer (vis), so eyes can never end up on the back of a head.
function aFace(x, y, z, r, f2, o={}){
  const s2 = [-f2[1], f2[0]], col = o.col || '#fff', sh = P(x + f2[0], y + f2[1], z), c0 = P(x, y, z), dx = sh[0] - c0[0], dy = sh[1] - c0[1]; let s = '';
  for (const k of [-1, 1]){
    const n = [f2[0]*.86 + s2[0]*k*.46, f2[1]*.86 + s2[1]*k*.46, .26];
    if (!vis(n)) continue;
    const [X,Y] = P(x + n[0]*r, y + n[1]*r, z + n[2]*r);
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r*(o.big || .3))}" fill="${col}" stroke="${INK}" stroke-width=".7"/>`;
    if (!o.noPupil) s += `<circle cx="${f(X + dx*r*.1)}" cy="${f(Y + dy*r*.1)}" r="${f(r*.14)}" fill="${o.pup || INK}"/><circle cx="${f(X + dx*r*.1 + r*.05)}" cy="${f(Y + dy*r*.1 - r*.05)}" r="${f(r*.05)}" fill="#fff"/>`;
  }
  return s;
}
const aFwd = (p, f2, d, up=0) => [p[0] + f2[0]*d, p[1] + f2[1]*d, p[2] + up];
const aSide = (f2, k) => [-f2[1]*k, f2[0]*k];
function tBar(x, y, z, w, pct, col){
  const [X,Y] = P(x, y, z), W2 = w*1.1, H2 = 2.3, x0 = X - W2/2;
  return `<rect x="${f(x0)}" y="${f(Y)}" width="${f(W2)}" height="${f(H2)}" rx="1" fill="#4a3a30" stroke="${INK}" stroke-width=".8"/>`
    + (pct > 0 ? `<rect x="${f(x0 + .4)}" y="${f(Y + .4)}" width="${f(Math.max(0, (W2 - .8)*tClamp(pct)))}" height="${f(H2 - .8)}" rx=".6" fill="${col}"/>` : '');
}
function tRing(x, y, r, z, n=8){ return Array.from({ length:n }, (_, i) => [x + r*Math.cos(i/n*6.2832), y + r*Math.sin(i/n*6.2832), z]); }
const shadowOf = (x, y, r, hgt) => castShadow([...tRing(x, y, r, BZ), [x, y, BZ + hgt]], BZ);
const aTier = it => it ? Math.min(3, Math.floor(it.il/6)) : 0;

/* ---------- characters ---------- */
function aGrave(){
  const x = HX, y = HY, prof = rrUV(y - 2.9, BZ, y + 2.9, BZ + 9.4, 2.9, 5);
  return aBlob(x, y + 4.4, BZ, [[0,2.6],[.9,2.4],[1.5,1.1]], BIOMES[biomeNow()].board, 1.2, 10)
    + extrude(prof, x - 1.2, x + 1.2, STONE, toneI) + shape(on(PX(x + 1.2), prof), STONE.l, 1.8)
    + hullInk([...on(PX(x - 1.2), prof), ...on(PX(x + 1.2), prof)], 2)
    + line(on(PX(x + 1.25), [[y, BZ + 8.2], [y, BZ + 5.4]]), 1.2) + line(on(PX(x + 1.25), [[y - 1.2, BZ + 7.2], [y + 1.2, BZ + 7.2]]), 1.2)
    + tx(x + 1.3, y, BZ + 3.4, 'RIP', 2.2, INK, 800);
}
function drawHero(){
  const h = G.h, t = G.time;
  if (h.dead > 0) return aGrave();
  const x = HX + (h.hurtT > 0 ? Math.sin(t*90)*.5 : 0), y = HY, z = BZ + Math.max(0, Math.sin(t*3)*.35);
  const A = G.equip.armor, W = G.equip.weapon, at = aTier(A), ar = A ? A.r : 0, wt = aTier(W), wr = W ? W.r : 0;
  const body = matOf(['#4f7fd6', '#5d8ee0', '#d4a93a', '#d8553a'][ar]), dark = matOf('#5a3b28'), trim = matOf(['#8a5a3c', '#c7d4e6', '#fff0b0', '#ffb04a'][ar]), steel = matOf(['#b9c0c6', '#a9c3e8', '#e8d594', '#e59a7a'][ar]);
  const F = [.7071, -.7071];   // the hero fights toward -y; turned 45 degrees so the near cheek and eye face the viewer
  const swing = h.swingT < 0 ? 72 + Math.sin(t*3)*3 : tLerp(115, -30, ease(h.swingT/.3));
  let s = '';
  // far side first: off arm, off shoulder
  s += rod([x - 2.7, y, z + 9.6], [x - 3.3, y - 1.1, z + 6.8], .9, body, toneI, .9);
  s += tSph(x - 3.3, y - 1.1, z + 6.6, .95, '#f1c9a0', .8);
  if (at >= 1) s += tSph(x - 3.2, y, z + 10.6, 1.8, steel.m, 1);
  // boots + legs
  for (const sx of [-1.5, 1.5]){
    s += rod([x + sx, y, BZ + .75], [x + sx + F[0]*2.6, y + F[1]*2.6, BZ + .75], .75, matOf('#3d2a1d'), toneI, .8);
    s += cyl(x + sx, y, BZ, BZ + 2.7, 1.45, matOf('#3d2a1d'), toneI, .9, 10);
    s += cyl(x + sx, y, BZ + 2.5, BZ + 5, 1.25, matOf(at >= 1 ? '#6b7480' : '#6b4a33'), toneI, .9, 10);
  }
  // torso, flared tassets, belt
  s += aBlob(x, y, z + 3.9, [[0,3.25],[1,2.95],[1.7,2.65]], trim, 1.1, 14);
  s += aBlob(x, y, z + 4.6, [[0,2.7],[1.2,3.1],[3.6,3.5],[5.6,3.0],[6.4,2.2]], body, 1.5, 14);
  s += cyl(x, y, z + 5.1, z + 6, 3.2, matOf('#4a3324'), toneI, .8, 14);
  s += box(x + 2.9, y - .7, z + 5.2, x + 3.5, y + .7, z + 5.9, matOf('#e8c24a'), toneI, .7);
  if (at >= 1) s += aInkP(pd(on(PZ(z + 8.4), arcUV(x, y, 3.55, -25, 115, 8)), false), .9) + aInkP(pd(on(PZ(z + 10.2), arcUV(x, y, 3.1, -25, 115, 8)), false), .8, INK, .7);
  // scarf: ring + a tail that flutters behind (+y)
  s += cyl(x, y, z + 10.1, z + 11.3, 2.7, matOf('#d9483b'), toneI, .9, 12);
  const fl = Math.sin(t*4.5);
  s += rod([x - F[0]*.8, y - F[1]*.8, z + 10.7], [x - F[0]*4.6 + fl*.5, y - F[1]*4.6 + fl*.3, z + 9.2 + fl*.9], .75, matOf('#d9483b'), toneI, .8);
  // head: hair or helm, face on top
  const head = [x, y, z + 12.9];
  if (at >= 2) s += tSph(x - .5, y - .5, z + 13.4, 3.15, steel.m, 1.1);
  else s += tSph(x - F[0]*1.1, y - F[1]*1.1, z + 13.9, 3.2, '#6b4426', 1.1);
  s += tSph(...head, 2.8, '#f1c9a0', 1.1) + tSph(x + F[0]*3, y + F[1]*3, z + 12.5, .55, '#e0aa80', .6);   // head + nose
  if (at >= 1) {
    s += aBlob(x, y, z + 14.5, [[0,3.2],[.9,3.05],[2,2.3],[2.9,1.2],[3.3,.2]], steel, 1.3, 14);
    s += rod([x + F[0]*2.9, y + F[1]*2.9, z + 14.2], [x + F[0]*3.1, y + F[1]*3.1, z + 12.1], .55, steel, toneI, .8);
    if (ar >= 2) s += rod([x - F[0]*.6, y - F[1]*.6, z + 17.6], [x - F[0]*3.6, y - F[1]*3.6, z + 17.3 + fl*.5], 1, matOf(ar === 3 ? '#ff6a3a' : '#d9483b'), toneI, .9, .2);
  } else s += aBlob(x, y, z + 14.5, [[0,3.05],[.9,2.9],[1.9,2.1],[2.6,.9],[2.9,.2]], matOf('#6b4426'), 1.1, 14);
  s += aFace(...head, 2.8, F);
  // sword arm + sword (blade colour follows rarity, length follows tier)
  const a = swing*Math.PI/180, hand = [x + 3.3, y - .8, z + 7.4], dir = [0, -Math.cos(a), Math.sin(a)], mv = k => hand.map((v, i) => v + dir[i]*k);
  const blade = [METAL, matOf('#b9d6ff'), matOf('#ffe08a'), matOf('#ff9a5a')][wr], len = 8.2 + wt*1.5, gw = .35 + wt*.12;
  s += rod([x + 2.6, y, z + 9.4], hand, .95, body, toneI, .9);
  if (at >= 1) s += tSph(x + 3.1, y, z + 10.5, 1.8, steel.m, 1);
  if (wr === 3){ const [X,Y] = P(...mv(len*.6)); s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(len*.55)}" fill="#ff9a3c" opacity=".22"/>`; }
  s += rod(mv(-1.7), mv(.8), .55, matOf('#5a3b28'), toneI, .8) + tSph(...mv(-1.8), .5, '#c9a13b', .7);
  s += rod(mv(.9), mv(.9 + len), .6 + wt*.07, blade, toneI, .9, .2);
  const g = mv(1), side = [1.5 + wt*.35, 0, 0];
  s += rod([g[0] - side[0], g[1], g[2]], [g[0] + side[0], g[1], g[2]], .45, matOf('#c9a13b'), toneI, .8);
  s += tSph(...hand, 1, '#f1c9a0', .8);
  if (h.castT >= 0){ const u = ease(tClamp(h.castT/.25)), [X,Y] = P(x + 3.4, y - 3.6, z + 9.2), R = 2.4*u*1.22, sc = (SKILLS[h.castSk] || SKILLS.FIRE).col;
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R*1.8)}" fill="${sc}" opacity=".3"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${sc}" stroke="${INK}" stroke-width=".9"/><circle cx="${f(X + R*.15)}" cy="${f(Y - R*.15)}" r="${f(R*.5)}" fill="#ffe08a"/>`; }
  s += tBar(x, y, z + 22.5, 9, h.hp / G.st.life, '#e2483d');
  return s;
}
function drawSlime(m){
  const t = G.time + m.ph, sq = 1 + .1*Math.sin(t*5) + (m.lunge >= 0 ? .15*Math.sin(Math.PI*m.lunge/.3) : 0), hg = 6.8/sq, r = 4.9*Math.sqrt(sq), y = m.y + (m.lunge >= 0 ? 3*Math.sin(Math.PI*m.lunge/.3) : 0);
  const hex = ['#7ed36b', '#e8c24a', '#8fd3f0', '#ef7a4a'][biomeNow()], mat = matOf(hex), k = hg/6.8;
  let s = aBlob(m.x, y, BZ, [[0,.95*r],[1.5*k,1.06*r],[3.4*k,.99*r],[5.2*k,.68*r],[6.6*k,.26*r]], mat, 1.8, 16);
  const [X,Y] = P(m.x, y, BZ + hg*.5);
  s += `<ellipse cx="${f(X + r*.1)}" cy="${f(Y + r*.55)}" rx="${f(r*.6)}" ry="${f(r*.35)}" fill="${mat.d}" opacity=".35"/>`   // dark core seen through the jelly
    + aInkP(`M${f(X + r*.55)} ${f(Y - r*1.3)}Q${f(X + r*1.05)} ${f(Y - r*.9)} ${f(X + r*1.1)} ${f(Y - r*.35)}`, 1.6, '#fff', .85)    // shine
    + `<circle cx="${f(X + r*1.1)}" cy="${f(Y + r*.05)}" r="${f(r*.09)}" fill="#fff" opacity=".85"/>`;
  s += aFace(m.x, y, BZ + hg*.55, 3.3, [0, 1], { big:.34 }) + aMouth(m.x, y, BZ + hg*.55 - 1.2, 3.4, [0, 1], 1);
  const [BX,BY] = P(m.x - 1, y + 1, BZ + hg + .6), dr = Math.sin(t*3)*.6;       // a drip bubble rising off the head
  s += `<circle cx="${f(BX - 1.5)}" cy="${f(BY - 3 - dr)}" r="${f(1.1)}" fill="${mat.l}" stroke="${INK}" stroke-width=".7"/>`;
  s += tBar(m.x, y, BZ + hg + 5, 8, m.hp/m.hpMax, '#e2483d');
  return { s, sh:shadowOf(m.x, y, r, hg) };
}
function drawSkel(m){
  const t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, x = m.x, y = m.y + 3*lg, bob = m.fight ? 0 : Math.abs(Math.sin(t*9))*.8, z = BZ + bob;
  const rust = { l:'#c98a5a', m:'#a56d42', d:'#6b4426' }, wood = matOf('#a8693f'), dk = matOf('#2b2623');
  let s = '';
  for (const sx of [-1.2, 1.2]){
    s += rod([x + sx, y, BZ], [x + sx, y, z + 2.8], .65, BONE, toneI, .8) + tSph(x + sx, y, z + 2.9, .8, '#f1ecda', .7) + rod([x + sx, y, z + 2.9], [x + sx, y, z + 5.2], .6, BONE, toneI, .8);
    s += box(x + sx - 1, y - 1.9, BZ, x + sx + 1, y - .3, BZ + .9, BONE, toneI, .7);
  }
  s += box(x - 2, y - 1.1, z + 4.4, x + 2, y + 1.1, z + 5.8, BONE, toneI, .9);                      // pelvis
  s += cyl(x, y, z + 5.7, z + 10, 2.05, dk, toneI, 1.2, 12);                                           // dark chest cavity
  for (const zz of [6.4, 7.6, 8.8]) s += aInkP(pd(on(PZ(z + zz), arcUV(x, y, 2.15, -35, 125, 8)), false), 1.5, BONE.l) + aInkP(pd(on(PZ(z + zz), arcUV(x, y, 2.15, -35, 125, 8)), false), .55, INK, .8);
  s += rod([x, y, z + 5.8], [x, y, z + 10], .35, BONE, toneI, .6);                                    // spine
  s += rod([x + 2.1, y, z + 9.3], [x + 3.2, y + 1.2, z + 7.5], .55, BONE, toneI, .8) + rod([x - 2.1, y, z + 9.3], [x - 2.5, y + 1.8, z + 7.6], .55, BONE, toneI, .8);
  s += tSph(x + 2.2, y, z + 9.6, 1, '#f1ecda', .8) + tSph(x - 2.2, y, z + 9.6, 1, '#f1ecda', .8);
  const hand = [x + 3.2, y + 1.2, z + 7.5], a = tLerp(65, 5, lg)*Math.PI/180, bl = [hand[0], hand[1] + Math.cos(a)*8, hand[2] + Math.sin(a)*8];
  s += rod(hand, bl, .5, rust, toneI, .9, .15) + rod([hand[0] - 1.2, hand[1] + .9, hand[2] + .5], [hand[0] + 1.2, hand[1] + .9, hand[2] + .5], .4, wood, toneI, .7);
  s += cylX(x + 3.3, x + 4.2, y - .6, z + 7.4, 2.6, wood, toneI, 1.1, 14) + cylX(x + 4.2, x + 4.6, y - .6, z + 7.4, .9, matOf('#c9a13b'), toneI, .7, 8);   // buckler
  s += tSph(x, y, z + 12, 2.6, '#f1ecda', 1.1) + box(x - 1.2, y - 1.1, z + 9.4, x + 1.2, y + 1.1, z + 10.4, BONE, toneI, .8);   // skull + jaw
  s += aFace(x, y, z + 12, 2.6, [0, 1], { col:'#2b2623', noPupil:true, big:.36 });
  const [NX,NY] = P(x, y + 2.55, z + 11.1); s += `<path d="M${f(NX)} ${f(NY)}l-.5 1.1l1 0z" fill="${INK}"/>` + line([[x - .9, y + 2.4, z + 9.9], [x + .9, y + 2.4, z + 9.9]], .7);
  s += tBar(x, y, z + 19, 8, m.hp/m.hpMax, '#e2483d');
  return { s, sh:shadowOf(x, y, 2.6, 13) };
}
function drawBrute(m){
  const k = m.boss ? 1.55 : 1, t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, x = m.x, y = m.y + 3.5*lg, bob = m.fight ? 0 : Math.abs(Math.sin(t*6))*.6;
  const z = BZ + bob, body = matOf(m.boss ? '#8e5fd1' : '#e0644a'), skin = m.boss ? '#b79af0' : '#f0a07f', club = { l:'#a8693f', m:'#8a5a3c', d:'#5a3a26' }, fur = matOf('#5a4636');
  let s = '';
  for (const sx of [-1.9, 1.9]){ s += cyl(x + sx*k, y, BZ, BZ + 3.6*k, 1.8*k, matOf('#4a3a30'), toneI, 1, 10) + box(x + (sx - 1.5)*k, y - 3*k, BZ, x + (sx + 1.5)*k, y - .4*k, BZ + 1.3*k, matOf('#3a2c24'), toneI, .8); }
  s += aBlob(x, y, z + 3*k, [[0,3.6*k],[1.8*k,4.4*k],[4.8*k,4.8*k],[6.6*k,4.3*k],[7.2*k,3.3*k]], body, 1.8, 16);              // body with a round belly
  s += box(x + 3.5*k, y - 1.8*k, z + 2.4*k, x + 4.1*k, y + 1.8*k, z + 5.4*k, fur, toneI, .8);                                         // loincloth
  s += aInkP(pd(on(PZ(z + 7*k), arcUV(x, y, 4.5*k, -25, 115, 8)), false), .9);
  const hand = [x + 4.6*k, y + 3.6*k, z + 6.4*k], a = tLerp(75, -10, lg)*Math.PI/180, tip = [hand[0], hand[1] + Math.cos(a)*8*k, hand[2] + Math.sin(a)*8*k];
  s += rod([x - 3.8*k, y, z + 8.4*k], [x - 4.2*k, y + 2.2*k, z + 6.2*k], 1.3*k, body, toneI, 1) + tSph(x - 4.2*k, y + 2.2*k, z + 6.2*k, 1.2*k, skin, .9);
  s += rod([x + 3.8*k, y, z + 8.4*k], hand, 1.3*k, body, toneI, 1);
  s += rod(hand, tip, 1.1*k, club, toneI, 1.1, 2.1*k);
  for (const u of [.45, .75]) s += tSph(hand[0] + (tip[0] - hand[0])*u + 1.2*k, hand[1] + (tip[1] - hand[1])*u, hand[2] + (tip[2] - hand[2])*u, .55*k, '#c6c6c0', .7);   // club studs
  s += tSph(...hand, 1.3*k, skin, .9);
  s += tSph(x + 3.9*k, y, z + 9.2*k, 2*k, fur.l, 1) + tSph(x - 3.9*k, y, z + 9.2*k, 2*k, fur.l, 1);                                    // fur shoulder pads
  for (const sd of [-1, 1]){
    s += rod([x + sd*2*k, y, z + 13.2*k], [x + sd*3.6*k, y - .4*k, z + 15.2*k], .95*k, BONE, toneI, .8, .6*k);
    s += rod([x + sd*3.6*k, y - .4*k, z + 15.2*k], [x + sd*3.3*k, y - .8*k, z + 17.2*k], .6*k, BONE, toneI, .8, .08);
  }
  const FB = [0, 1], hz = z + 11.8*k, hr = 3.1*k;
  s += tSph(x, y, hz, hr, skin, 1.2) + aFace(x, y, hz, hr, FB, { col:'#fff3c4', pup:'#b0201a' });
  for (const sd of [-1, 1]){   // brow ridge and tusk on each side of the face
    s += line([[x + sd*.15*hr, y + hr*.97, hz + .62*hr], [x + sd*.82*hr, y + hr*.7, hz + .5*hr]], 1.1);
    const b = [x + sd*.38*hr, y + hr*.96, hz - .55*hr];
    s += shape([[b[0] - sd*.5*k, b[1], b[2]], [b[0] + sd*.5*k, b[1], b[2]], [b[0] + sd*.2*k, b[1] + .6*k, b[2] - 2.8*k]], '#fffaea', .8);
  }
  if (m.boss) s += aBlob(x, y, z + 14.9*k, [[0,2.3*k],[.8*k,2.5*k],[1.7*k,2.4*k]], matOf('#f2c230'), 1.1, 10) + [-1,0,1].map(i => tSph(x + i*1.4*k, y, z + 17.2*k, .5*k, '#ff5a4a', .6)).join('');
  s += tBar(x, y, z + 21*k, m.boss ? 15 : 9, m.hp/m.hpMax, m.boss ? '#8e3fd1' : '#e2483d');
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

/* ---------- props: biome decoration ---------- */
function aPine(x, y, k, snow){
  const B = BIOMES[biomeNow()], g1 = matOf(B.t1), g2 = matOf(B.t2), tiers = [[2.2, 8, 4.9], [5.6, 11.6, 4.0], [9, 15.2, 3.0]];
  let s = cyl(x, y, BZ, BZ + 4*k, 1.2*k, matOf('#8a5a3c'), toneI, 1, 10);
  tiers.forEach(([z0, z1, r], i) => {
    s += rod([x, y, BZ + z0*k], [x, y, BZ + z1*k], r*k, i % 2 ? g2 : g1, toneI, 1.3, .25);
    if (snow){ const c = 2.7, rr = r*c/(z1 - z0); s += rod([x, y, BZ + (z1 - c)*k], [x, y, BZ + z1*k], rr*k, matOf('#f4f9fc'), toneI, .9, .2); }
  });
  return s;
}
function aBush(x, y, k){
  const B = BIOMES[biomeNow()];
  return tSph(x - 1.4*k, y + 1*k, BZ + 1.8*k, 2.2*k, B.t1, 1) + tSph(x + 1.2*k, y - .8*k, BZ + 2*k, 2.5*k, B.t2, 1) + tSph(x + .2*k, y + .4*k, BZ + 3.1*k, 2.1*k, B.t2, 1)
    + [[1.6, -1.2, 4], [-.4, .5, 5.1]].map(([dx, dy, dz]) => tSph(x + dx*k, y + dy*k, BZ + dz*k, .55*k, '#e2483d', .6)).join('');
}
function aMush(x, y, k){
  const [X,Y] = P(x + 1.5*k, y + 1.5*k, BZ + 2.5*k);
  return cyl(x, y, BZ, BZ + 2.2*k, .75*k, matOf('#f4ecd0'), toneI, .9, 8)
    + aBlob(x, y, BZ + 1.8*k, [[0,2.5*k],[.7*k,2.6*k],[1.5*k,1.9*k],[2.1*k,.7*k]], matOf('#e0483d'), 1.2, 12)
    + `<circle cx="${f(X)}" cy="${f(Y - .6*k)}" r="${f(.5*k)}" fill="#fff"/><circle cx="${f(X - 1.6*k)}" cy="${f(Y - 1.2*k)}" r="${f(.4*k)}" fill="#fff"/>`;
}
function aCactus(x, y, k){
  const gm = matOf('#6fb26a'), arm = (sx, z0, z1) => rod([x, y + sx*1.2*k, BZ + z0*k], [x, y + sx*3.3*k, BZ + z0*k], .85*k, gm, toneI, .9) + rod([x, y + sx*3.3*k, BZ + z0*k], [x, y + sx*3.3*k, BZ + z1*k], .85*k, gm, toneI, .9) + tSph(x, y + sx*3.3*k, BZ + z1*k, .85*k, '#6fb26a', .8);
  return arm(-1, 4.2, 7.6) + cyl(x, y, BZ, BZ + 9*k, 1.55*k, gm, toneI, 1.1, 12) + tSph(x, y, BZ + 9*k, 1.55*k, '#6fb26a', 1) + arm(1, 5.6, 9.2)
    + tSph(x + .6*k, y + .4*k, BZ + 10.4*k, .6*k, '#f08aa8', .6) + [0, 1, 2].map(i => line([[x + 1.5*k, y - .9*k + i*.9*k, BZ + (2 + i*2.2)*k], [x + 1.5*k, y - .9*k + i*.9*k, BZ + (3 + i*2.2)*k]], .5)).join('');
}
function aRock(x, y, k, hex){
  const m = matOf(hex || '#b4ada0');
  return aBlob(x + 1.7*k, y - 1.4*k, BZ, [[0,1.7*k],[.9*k,1.8*k],[1.8*k,1.1*k],[2.2*k,.5*k]], m, 1.1, 8) + aBlob(x, y, BZ, [[0,3.3*k],[1.5*k,3.6*k],[3*k,2.5*k],[3.9*k,1*k]], m, 1.4, 9);
}
function aSkull(x, y, k){
  return tSph(x, y, BZ + 2.2*k, 2.3*k, '#f1ecda', 1) + tEyes(x, y, BZ + 2.2*k, 2.3*k, { col:'#2b2623', noPupil:true, big:.34 })
    + rod([x - 1.6*k, y + 1.6*k, BZ + 3*k], [x - 4*k, y + 3.2*k, BZ + 4.6*k], .5*k, BONE, toneI, .8, .12) + rod([x + 1.6*k, y - 1.6*k, BZ + 3*k], [x + 3.4*k, y - 4*k, BZ + 4.8*k], .5*k, BONE, toneI, .8, .12);
}
function aCrystal(x, y, k){
  const cm = matOf('#9fd8ef'), cm2 = matOf('#c9ecf8');
  return rod([x - 1.2*k, y + 1.2*k, BZ], [x - 2.2*k, y + 2.4*k, BZ + 6*k], 1.3*k, cm2, toneI, 1, 0, 6) + rod([x, y, BZ], [x + .4*k, y - .4*k, BZ + 10*k], 1.8*k, cm, toneI, 1.1, 0, 6) + rod([x + 1.6*k, y - 1.2*k, BZ], [x + 3*k, y - 2.2*k, BZ + 5*k], 1.2*k, cm2, toneI, 1, 0, 6);
}
function aSnowman(x, y, k){
  const [X,Y] = P(x + 2.8*k, y + 2.8*k, BZ + 6.6*k);
  return tSph(x, y, BZ + 2.4*k, 2.6*k, '#f4f9fc', 1.1) + tSph(x, y, BZ + 5.6*k, 1.9*k, '#f4f9fc', 1.1) + tSph(x, y, BZ + 8*k, 1.4*k, '#f4f9fc', 1)
    + rod([x + 1, y + 1, BZ + 8*k], [x + 3.4*k, y + 3.4*k, BZ + 7.6*k], .35*k, matOf('#f08a3a'), toneI, .6, .05) + cyl(x, y, BZ + 9.4*k, BZ + 11*k, 1.1*k, matOf('#3d3935'), toneI, .8, 8)
    + rod([x + 1.6*k, y - 1.6*k, BZ + 5.8*k], [x + 4.4*k, y - 4.2*k, BZ + 7.4*k], .3*k, matOf('#8a5a3c'), toneI, .6);
}
function aSpike(x, y, k){
  const dm = matOf('#4a3a4f'), [X,Y] = P(x, y, BZ + .2);
  return `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(5.4*k)}" ry="${f(3*k)}" fill="#ff7a2a" opacity=".3"/>`
    + rod([x - 1.6*k, y + 1.4*k, BZ], [x - 2.6*k, y + 2.4*k, BZ + 6*k], 1.5*k, dm, toneI, 1, 0, 5) + rod([x, y, BZ], [x + .4*k, y, BZ + 11*k], 2.1*k, dm, toneI, 1.2, 0, 5) + rod([x + 1.8*k, y - 1.4*k, BZ], [x + 3.4*k, y - 2.4*k, BZ + 5*k], 1.4*k, dm, toneI, 1, 0, 5);
}
function aVent(x, y, k, t){
  const A = on(PZ(BZ + 1.7*k), ellUV(x, y, 2.6*k, 2.6*k, 16));
  return cyl(x, y, BZ, BZ + 1.7*k, 3.6*k, matOf('#6b5651'), toneI, 1.3, 16) + fill(pd(A), '#ff7a2a') + fill(pd(on(PZ(BZ + 1.75*k), ellUV(x, y, 1.5*k + .3*Math.sin(t*3), 1.5*k + .3*Math.sin(t*3), 12))), '#ffd27a') + ink(pd(A), .9);
}
function aTorch(x, y){
  const t = G.time, [X,Y] = P(x, y, BZ + 10.6), fl = Math.sin(t*13 + x)*.5, B = BIOMES[biomeNow()];
  return rod([x, y, BZ], [x, y, BZ + 8.6], .65, WOOD, toneI, .9) + cyl(x, y, BZ + 8.2, BZ + 9.6, 1.5, matOf('#5a3b28'), toneI, .8, 8)
    + `<circle cx="${f(X)}" cy="${f(Y - 1)}" r="${f(5)}" fill="#ffb347" opacity=".2"/>`
    + `<path d="M${f(X - 1.5)} ${f(Y + 1.2)}Q${f(X - 2)} ${f(Y - 2)} ${f(X + fl*.4)} ${f(Y - 4.6 - fl)}Q${f(X + 2)} ${f(Y - 2)} ${f(X + 1.5)} ${f(Y + 1.2)}Z" fill="#ff9a3c" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`
    + `<path d="M${f(X - .7)} ${f(Y + 1)}Q${f(X - .8)} ${f(Y - 1)} ${f(X + fl*.2)} ${f(Y - 2.4)}Q${f(X + .9)} ${f(Y - 1)} ${f(X + .7)} ${f(Y + 1)}Z" fill="#ffe08a"/>`;
}
const DECO = [   // per biome: [kind, x, y, scale]
  [['pine',4,22,1.1], ['pine',27,25,.9], ['bush',5,44,1], ['bush',26,52,.9], ['mush',25,38,1], ['mush',5,58,.8]],
  [['cactus',4,22,1.1], ['cactus',27,26,.9], ['rock',5,45,1], ['rock',26,50,.8], ['skull',25,38,1], ['cactus',4,56,.7]],
  [['snowpine',4,22,1.1], ['snowpine',27,25,.9], ['crystal',5,45,1], ['crystal',26,51,.8], ['snowman',25,38,1], ['snowpine',4,57,.7]],
  [['spike',4,22,1.1], ['spike',27,25,.9], ['rock',5,45,1], ['rock',26,50,.8], ['vent',25,38,1], ['spike',4,56,.7]],
];
function aDeco(kind, x, y, k){
  switch (kind){
    case 'pine': return aPine(x, y, k, false); case 'snowpine': return aPine(x, y, k, true); case 'bush': return aBush(x, y, k); case 'mush': return aMush(x, y, k);
    case 'cactus': return aCactus(x, y, k); case 'rock': return aRock(x, y, k, ['#b4ada0', '#cfb98a', '#aebccb', '#6b5651'][biomeNow()]); case 'skull': return aSkull(x, y, k);
    case 'crystal': return aCrystal(x, y, k); case 'snowman': return aSnowman(x, y, k); case 'spike': return aSpike(x, y, k); case 'vent': return aVent(x, y, k, G.time);
  }
  return '';
}
const aDecoTop = { pine:15.5, snowpine:15.5, bush:5, mush:4.5, cactus:10.5, rock:4, skull:5, crystal:10, snowman:11, spike:11, vent:2 };
function drawSign(){
  return rod([4, 66, BZ], [4, 66, BZ + 11], .8, WOOD, toneI, 1) + rod([4, 59, BZ + 10], [4, 73, BZ + 10], .45, WOOD, toneI, .8)
    + shape(on(PX(4.8), rrUV(59, BZ + 5.6, 73, BZ + 10.6, 1.2, 3)), WOOD.l, 1.2)
    + tx(4.9, 66, BZ + 7.2, G.run ? 'MAP ' + G.run.map.lvl : 'DEPTH ' + G.depth, 2.3, INK, 800);
}
// a pool of light ringed by standing stones: the pool is flat (drawn early), the stones sort in with the actors
function drawPortalPool(){
  const [sx, sy] = SPAWN, t = G.time, pulse = G.fx.find(e => e.k === 'portal'), B = BIOMES[biomeNow()], pr = 3.2 + (pulse ? 1.2*Math.sin(pulse.t*3.14) : 0);
  let s = cyl(sx, sy, BZ, BZ + 1.2, 7, STONE, toneI, 1.4, 20);
  s += fill(pd(on(PZ(BZ + 1.25), ellUV(sx, sy, 5.2, 5.2, 20))), B.portal) + ink(pd(on(PZ(BZ + 1.25), ellUV(sx, sy, 5.2, 5.2, 20))), 1);
  s += fill(pd(on(PZ(BZ + 1.3), ellUV(sx, sy, pr, pr, 16))), B.glow);
  for (let i = 0; i < 3; i++){ const a0 = t*70 + i*120; s += `<path d="${pd(on(PZ(BZ + 1.35), arcUV(sx, sy, 3.8, a0, a0 + 70, 6)), false)}" stroke="#ffffff" stroke-width="1.2" fill="none" stroke-linecap="round"/>`; }
  return s;
}
function portalStones(){
  const [sx, sy] = SPAWN, B = BIOMES[biomeNow()], out = [];
  [[-1, 0, 7.6], [0, -1, 6.4], [-.7, .7, 6.8], [1, 0, 7.4], [.7, -.7, 6.2]].forEach(([dx, dy, h], i) => {     // five of the six stand; the sixth is the gap monsters walk through
    const px = sx + dx*8.4, py = sy + dy*8.4, hw = .95;
    out.push({ at:[px, py, BZ], svg: box(px - hw, py - hw, BZ, px + hw, py + hw, BZ + h, STONE, toneI, 1.1) + box(px - hw - .25, py - hw - .25, BZ + h, px + hw + .25, py + hw + .25, BZ + h + .8, STONE, toneI, .9)
      + shape(on(PX(px + hw), rectUV(py - .35, BZ + h*.45, py + .35, BZ + h*.45 + 2.2)), B.glow, .7) });
  });
  return out;
}

/* ---------- ground: path, tufts, flowers, pebbles ---------- */
function drawGround(){
  const B = BIOMES[biomeNow()], bi = biomeNow(), z = BZ + .04, pm = mix(B.board.m, '#7a5a38', .22);
  const wob = i => Math.sin(i*1.7)*.9, L = [], R = [];
  for (let y = 14; y <= 70; y += 4){ L.push([15 - 5 + wob(y), y, z]); R.push([15 + 5 + wob(y + 9), y, z]); }
  let s = `<path d="${pd([...L, ...R.reverse()])}" fill="${pm}" opacity=".75"/>`;
  s += aInkP(pd(L, false), .8, B.board.d, .8, 'stroke-dasharray="2 2"') + aInkP(pd(R.reverse(), false), .8, B.board.d, .8, 'stroke-dasharray="2 2"');
  for (let i = 0; i < 22; i++){            // scattered ground details, kept off the fighting lane
    const x = 2.5 + aRnd(i)*25, y = 4 + aRnd(i + 50)*68; if (Math.abs(x - 15) < 6.2 || y < 4.5) continue;
    if (bi === 0) s += aInkP(pd([[x - .9, y, z], [x - .4, y - .2, z + 1.5]], false) + pd([[x, y, z], [x, y - .2, z + 2]], false) + pd([[x + .9, y, z], [x + .5, y + .2, z + 1.5]], false), .8, B.board.d)
      + (i % 5 === 0 ? tSph(x + 1.6, y + 1, z + .9, .55, ['#f08aa8', '#fff0b0', '#ffffff'][i % 3], .6) : '');
    else if (bi === 1) s += i % 2 ? aInkP(pd(on(PZ(z), arcUV(x, y, 2.6, 20, 160, 5)), false), .8, B.board.d, .9) : shape(on(PZ(z), ellUV(x, y, 1, .7, 8)), B.board.m, .7);
    else if (bi === 2) s += i % 2 ? fill(pd(on(PZ(z), ellUV(x, y, 2.4, 1.6, 12))), '#ffffff', 'opacity=".8"') : fill(pd(on(PZ(z), ellUV(x, y, 1.9, 1.3, 12))), '#bfe3f5', 'opacity=".7"') + aInkP(pd(on(PZ(z), ellUV(x, y, 1.9, 1.3, 12))), .6, B.board.d, .7);
    else s += i % 2 ? aInkP(pd([[x - 2, y - .8, z], [x - .5, y + .3, z], [x + .6, y - .4, z], [x + 2, y + .9, z]], false), 1.7, '#ff7a2a', .9) + aInkP(pd([[x - 2, y - .8, z], [x - .5, y + .3, z], [x + .6, y - .4, z], [x + 2, y + .9, z]], false), .6, INK, .7) : shape(on(PZ(z), ellUV(x, y, .9, .7, 8)), B.board.d, .7);
  }
  for (let y = 18; y <= 64; y += 9) s += shape(on(PZ(z + .02), ellUV(15 + wob(y*2)*1.6, y + 1.5, 1.7, 1.2, 10)), B.board.l, .7);   // stepping stones
  return s;
}

/* ---------- loot: each kind has its own little model ---------- */
function drawDrop(d){
  const kind = d.kind, col = kind === 'gem' ? '#a87bf0' : kind === 'map' ? BIOMES[d.map.biome].glow : RAR[d.it.r].g, rare = kind !== 'item' || d.it.r >= 2;
  if (d.t < 0) return { at:[HX, HY, 0], svg:'' };
  let x = d.x, y = d.y, z = BZ;
  if (d.t < .6) z += Math.abs(Math.sin(d.t/.6*Math.PI*1.5))*5*(1 - d.t/.6) + .3;
  else if (d.t >= 1.2){ const u = ease(tClamp((d.t - 1.2)/.5)); x = tLerp(d.x, HX, u); y = tLerp(d.y, HY, u); z = BZ + .3 + Math.sin(u*Math.PI)*8 + u*7; } else z += .3 + Math.sin(d.t*6)*.25;
  let s = '';
  if (d.t < 1.2){ const [X,Y] = P(x, y, BZ + .1); s += `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(4.2)}" ry="${f(2.4)}" fill="${col}" opacity="${(.3 + .12*Math.sin(d.t*8)).toFixed(2)}"/>`; }
  if (rare && d.t < 1.2) s += fill(pd([[x - .9, y - .9, BZ], [x + .9, y + .9, BZ], [x + .9, y + .9, BZ + 17], [x - .9, y - .9, BZ + 17]]), col, 'opacity=".3"');
  const m = matOf(col);
  if (kind === 'gem') s += rod([x, y, z + .2], [x, y, z + 1.8], .05, m, toneI, .8, 1.5, 4) + rod([x, y, z + 1.8], [x, y, z + 3.4], 1.5, m, toneI, .8, .05, 4);
  else if (kind === 'map') s += rod([x - 2.2, y + 2.2, z + .9], [x + 2.2, y - 2.2, z + .9], .95, matOf('#efe0b0'), toneI, .9) + tSph(x - 2.2, y + 2.2, z + .9, .6, '#c9a13b', .6) + tSph(x + 2.2, y - 2.2, z + .9, .6, '#c9a13b', .6) + tSph(x, y, z + 1.8, .55, BIOMES[d.map.biome].portal, .6);
  else if (d.it.slot === 'weapon') s += rod([x - 2.6, y + 2.6, z + 1], [x + 1.8, y - 1.8, z + 1], .45, m, toneI, .8, .15) + rod([x - 3.4, y + 3.4, z + 1], [x - 2.4, y + 2.4, z + 1], .4, matOf('#5a3b28'), toneI, .7) + rod([x - 2.2, y + 1.7, z + 1], [x - 2.2 - .8, y + 3.5, z + 1], .35, matOf('#c9a13b'), toneI, .7);
  else if (d.it.slot === 'armor') s += aBlob(x, y, z + .2, [[0,1.7],[1.3,1.9],[2.4,1.6],[2.9,1.0]], m, .9, 10) + tSph(x + 1.6, y - 1.1, z + 2.5, .8, col, .6) + tSph(x - 1.6, y + 1.1, z + 2.5, .8, col, .6);
  else { const rg = on(PZ(z + 1.2), ellUV(x, y, 1.6, 1.6, 10)); s += aInkP(pd(rg), 2.8, INK) + aInkP(pd(rg), 1.5, col) + tSph(x - 1.2, y - 1.2, z + 1.4, .7, '#ffffff', .6); }
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
  const B = BIOMES[biomeNow()], bi = biomeNow();
  let s = board(0, 0, BXW, BYW, BZ, 4, B.board) + drawGround() + drawPortalPool();
  const ents = [...portalStones()];
  portalStones().forEach(o => s += castShadow([[o.at[0] - 1, o.at[1] - 1, BZ], [o.at[0] + 1, o.at[1] + 1, BZ], [o.at[0], o.at[1], BZ + 7]], BZ));
  DECO[bi].forEach(([kind, x, y, k]) => { s += castShadow([...tRing(x, y, 3.4*k, BZ), [x, y, BZ + (aDecoTop[kind] || 6)*k]], BZ); ents.push({ at:[x, y, BZ], svg:aDeco(kind, x, y, k) }); });
  [[3.5, 15], [26.5, 15]].forEach(([x, y]) => s += castShadow([...tRing(x, y, 1, BZ, 6), [x, y, BZ + 10]], BZ));
  [[3.5, 15], [26.5, 15]].forEach(([x, y]) => ents.push({ at:[x, y, BZ], svg:aTorch(x, y) }));
  ents.push({ at:[4, 66, BZ], svg:drawSign() });
  if (G.h.dead <= 0) s += shadowOf(HX, HY, 3.4, 16);
  ents.push({ at:[HX, HY, BZ + 1], svg:drawHero() });
  for (const m of G.mons){ const r = drawMon(m); s += r.sh; ents.push({ at:[m.x, m.y, BZ + 2], svg:r.s }); }
  for (const dd of G.drops) ents.push(drawDrop(dd));
  s += byDepth(ents) + drawFx() + drawFloats();
  return s;
}
