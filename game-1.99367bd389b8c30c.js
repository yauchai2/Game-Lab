/* ============================================================
   Colorfigures core: projection, shapes, shading, ink, labels, page shell.
   A figure page includes this file (scripts/build.py inlines it), then calls mountFigure({...}).
   See SKILL.md for the drawing contract and conventions.
   One fixed view (front-left-top) and one fixed light (from above, behind the viewer's right shoulder: the front is lit,
   the left side is in shade, and cast shadows fall toward the lower left of the screen).
   ============================================================ */

/* ---------- palettes ---------- */
const PALS = {
  mustard: { l:'#f4b829', m:'#d49c1f', d:'#4e4a18' },
  tomato:  { l:'#ef6a4c', m:'#cf5038', d:'#4a2219' },
  mint:    { l:'#93d3b0', m:'#71b693', d:'#1f4034' },
  cobalt:  { l:'#76a0e2', m:'#5a82c6', d:'#1c2948' },
  blush:   { l:'#f3a6bb', m:'#d8869c', d:'#4b2430' },
};
const METAL   = { l:'#eef0f0', m:'#c6ccce', d:'#8f989b' };
const CLEAR   = { l:'#e4f2f4', m:'#c4dfe4', d:'#97b9c0' };
const CERAMIC = { l:'#fbfaf3', m:'#e3e0d2', d:'#bdb8a6' };
const DARK    = { l:'#55504a', m:'#3d3935', d:'#272421' };
const INK = '#2b2552';        // Y2K: navy-violet ink instead of warm black
const SHADOW = '#7f90d8';     // Y2K: lighter periwinkle cast shadow

/* ---------- projection (x = depth toward viewer-right, y = toward viewer-left, z = up) ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6);
let OX = 0, OY = 0;
/* VIEW turns the object in 90° steps about a vertical axis through its centre (RC):
   0 = front (+x) and left (+y) faces toward the viewer, 1 = turned once (the +y side becomes the front)…
   Figures keep modelling in their own coordinates; P / Dv / vis / tone / depthOf all apply the turn. */
let VIEW = 0, RC = [0, 0];
const VIEW_NAMES = ['front', 'left side', 'back', 'right side'];
const TURNS = [0, 2];                 // the views the UI offers: front and back (figures still draw correctly in all four)
const rotV = ([x,y,z]) => { switch (VIEW & 3){ case 1: return [y,-x,z]; case 2: return [-x,-y,z]; case 3: return [-y,x,z]; default: return [x,y,z]; } };
const rotXY = (x,y) => { const r = rotV([x-RC[0], y-RC[1], 0]); return [r[0]+RC[0], r[1]+RC[1]]; };
const P0 = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];                       // raw iso, no turn
const P  = (x,y,z) => { const [a,b] = rotXY(x,y); return [(a-b)*C + OX, (a+b)*S - z + OY]; };
const Dv = (x,y,z) => { const [a,b,c] = rotV([x,y,z]); return [(a-b)*C, (a+b)*S - c]; };
// distance toward the viewer in the current view: draw parts with smaller depth first
const depthOf = p => { const [a,b] = rotXY(p[0],p[1]); return a + b + p[2]; };
// sort [{at:[x,y,z], svg}] back-to-front for the current view and join
const byDepth = parts => parts.filter(Boolean).sort((p,q) => depthOf(p.at) - depthOf(q.at)).map(p => p.svg).join('');
const f  = v => v.toFixed(1);
const pd = (pts, close=true) => 'M' + pts.map(p => { const q = P(p[0],p[1],p[2]); return f(q[0])+' '+f(q[1]); }).join('L') + (close ? 'Z' : '');
const sp = pts => 'M' + pts.map(q => f(q[0])+' '+f(q[1])).join('L') + 'Z';

/* ---------- 2D shapes in a plane's (u,v) coords (v up), mapped to 3D by a plane ---------- */
const arcUV  = (cu,cv,r,a0,a1,n=7) => { const o=[]; for (let i=0;i<=n;i++){ const a=(a0+(a1-a0)*i/n)*Math.PI/180; o.push([cu+r*Math.cos(a), cv+r*Math.sin(a)]); } return o; };
const rrUV   = (u0,v0,u1,v1,r,n=7) => r <= 0 ? rectUV(u0,v0,u1,v1) : [...arcUV(u1-r,v0+r,r,-90,0,n), ...arcUV(u1-r,v1-r,r,0,90,n), ...arcUV(u0+r,v1-r,r,90,180,n), ...arcUV(u0+r,v0+r,r,180,270,n)];
const rectUV = (u0,v0,u1,v1) => [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
const ellUV  = (cu,cv,ru,rv,n=24) => Array.from({length:n}, (_,i) => { const a=i/n*2*Math.PI; return [cu+ru*Math.cos(a), cv+rv*Math.sin(a)]; });
const PX = x => ([u,v]) => [x,u,v];      // front-facing plane x = const   (u = y, v = z)
const PY = y => ([u,v]) => [u,y,v];      // side plane y = const           (u = x, v = z)
const PZ = z => ([u,v]) => [u,v,z];      // horizontal plane z = const     (u = x, v = y)
const on = (plane, uv) => uv.map(plane);

/* ---------- vectors + shading ---------- */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm=a=>{ const l=Math.hypot(...a)||1; return a.map(v=>v/l); };
const avg=ps=>ps.reduce((s,p)=>[s[0]+p[0]/ps.length,s[1]+p[1]/ps.length,s[2]+p[2]/ps.length],[0,0,0]);
const vis = n => { const r = rotV(n); return r[0]+r[1]+r[2] > 1e-6; };   // viewer looks from (+1,+1,+1) after the turn
const facing = vis;                                                       // readable alias: is this face toward the viewer?
const SHADOW_K = 0.85, AZ_MIN = 20, AZ_MAX = 160;
// cast shadows are drawn shorter than the shading light implies (0.45 × height instead of 0.85 ×): long shadows of tall
// parts on thin supports (a lamp shade, a fan head) land far from the object and read as separate blobs
const SHADOW_LEN = 0.45;
let L = [0,0,1], SH = [0,0];
function setLight(deg){ const a=deg*Math.PI/180; SH=[SHADOW_K*Math.cos(a), SHADOW_K*Math.sin(a)]; L=norm([-SH[0],-SH[1],1]); }
const LIN = norm([.6,.2,1]);                       // fixed light for interiors / small props
const tone  = (n,m) => { const d=dot(rotV(n),L);   return d>-.15 ? m.l : d>-.45 ? m.m : m.d; };   // exterior, follows the sun
const toneI = (n,m) => { const d=dot(rotV(n),LIN); return d>.6 ? m.l : d>.05 ? m.m : m.d; };      // interior / props
const mix = (a,b,t) => '#' + [1,3,5].map(i => Math.round(parseInt(a.substr(i,2),16)*(1-t) + parseInt(b.substr(i,2),16)*t).toString(16).padStart(2,'0')).join('');
const matOf = hex => ({ l:hex, m:mix(hex,'#000000',.16), d:mix(hex,'#000000',.42) });
const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

/* ---------- drawing primitives (all return SVG strings) ---------- */
const ink   = (d,w=1.0) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const fill  = (d,c,extra='') => `<path d="${d}" fill="${c}" ${extra}/>`;
const face  = (d,c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
const shape = (pts,c,w=.9) => fill(pd(pts),c) + (w ? ink(pd(pts),w) : '');
const line  = (pts,w=.9) => ink(pd(pts,false),w);
// Loft between two rings of equal length (closed). colour(n) picks each strip's fill; flip = seen from inside.
function loft(A, B, colour, flip=false){
  const n=A.length, cen=avg(A.concat(B)); let s='';
  for (let i=0;i<n;i++){
    const a0=A[i], a1=A[(i+1)%n], b1=B[(i+1)%n], b0=B[i];
    let nr = norm(cross(sub(a1,a0), sub(b0,a0)));
    if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0,a1,b1,b0]), cen)) < 0) nr = nr.map(v=>-v);
    if (flip) nr = nr.map(v=>-v);
    if (vis(nr)) s += face(pd([a0,a1,b1,b0]), colour(nr));
  }
  return s;
}
function hull(pts){
  pts = pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[], up=[];
  for (const p of pts){ while(lo.length>=2 && cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()){ while(up.length>=2 && cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
// Silhouette ink, weighted by how thick the part is on screen (like a hand inker): the w you pass is the most it gets.
// Thickness = 2 × area / perimeter of the outline (a rod's diameter, about half a box's width), as a share of the
// frame width. A long thin rod, a handle or a knob stays light (~1–1.5); a grinder, kettle or machine body gets the
// heavy ~2.4–2.8. Thin parts stay thin and parts keep air between them.
const hullInk = (pts3, w=1.4) => { const h = hull(pts3.map(p=>P(...p))); let a = 0, per = 0;
  for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i+1) % h.length]; a += p[0]*q[1] - q[0]*p[1]; per += Math.hypot(q[0]-p[0], q[1]-p[1]); }
  const thick = per ? Math.abs(a) / per / (INK_K * INK_REF_VB) : 0;
  return ink(sp(h), Math.min(w, .9 + 20*thick)); };
// Axis-aligned box: three visible faces, shaded, each outlined. shade = tone (sunlit) or toneI (interior).
function box(x0,y0,z0,x1,y1,z1,m,shade=toneI,w=.9){
  // all six faces, drawn only when they face the viewer (sides first, then top) — correct in every VIEW
  const F = [
    [[0,1,0],  [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]],
    [[1,0,0],  [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],
    [[0,-1,0], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],
    [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]],
    [[0,0,1],  [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]] ];
  return F.filter(([n]) => vis(n)).map(([n,q]) => shape(q, shade(n,m), w)).join('');
}
// Rounded-profile extrusion: profile (u=y, v=z) swept along x from x0 to x1. Body of most machines.
function extrude(profileUV, x0, x1, m, shade=tone){ return loft(on(PX(x0),profileUV), on(PX(x1),profileUV), n=>shade(n,m)); }
// Vertical cylinder (axis z) centred (x,y), radius r from z0 to z1, with top cap.
function cyl(x,y,z0,z1,r,m,shade=toneI,w=1.2,n=24){
  const A=on(PZ(z0),ellUV(x,y,r,r,n)), B=on(PZ(z1),ellUV(x,y,r,r,n));
  return loft(A,B,nr=>shade(nr,m)) + fill(pd(B),shade([0,0,1],m)) + hullInk([...A,...B],w) + ink(pd(B),w*.8);
}
// Cylinder lying along x (e.g. a knob or dial sticking out of a front face): centred (y,z), from x0 to x1.
function cylX(x0,x1,y,z,r,m,shade=toneI,w=1.1,n=20){
  const A=on(PX(x0),ellUV(y,z,r,r,n)), B=on(PX(x1),ellUV(y,z,r,r,n));
  // cap on whichever end faces the viewer (the +x end in VIEW 0)
  const capB = vis([1,0,0]), cap = capB ? B : A, cn = capB ? [1,0,0] : [-1,0,0];
  return loft(A,B,nr=>shade(nr,m)) + (vis(cn) ? fill(pd(cap),shade(cn,m)) : '') + hullInk([...A,...B],w) + (vis(cn) ? ink(pd(cap),w*.8) : '');
}
// Cylinder between any two 3D points a and b (a lamp arm, a rod, a pipe at an angle, a handle bar), radius r.
// The end facing the viewer gets a cap. For a tapered part (a cone, a lamp shade) pass r1 for the radius at b.
function rod(a, b, r, m, shade=toneI, w=1, r1=r, n=16){
  const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u);
  const ring = (p, rr) => Array.from({length:n}, (_,i) => { const t = i/n*2*Math.PI, c = Math.cos(t)*rr, s2 = Math.sin(t)*rr;
    return [p[0] + u[0]*c + v[0]*s2, p[1] + u[1]*c + v[1]*s2, p[2] + u[2]*c + v[2]*s2]; });
  const A = ring(a, r), B = ring(b, r1), capB = vis(d), cap = capB ? B : A, cn = capB ? d : d.map(x => -x);
  return loft(A, B, nr => shade(nr, m)) + (Math.max(r, r1) > 0 ? fill(pd(cap), shade(cn, m)) + ink(pd(cap), w*.8) : '') + hullInk([...A, ...B], w);
}
// Text lying flat on a front plane x = const, centred at (y,z) baseline; reads left-to-right on screen.
const txM = (o, U, V) => `matrix(${U[0].toFixed(4)} ${U[1].toFixed(4)} ${V[0].toFixed(4)} ${V[1].toFixed(4)} ${f(o[0])} ${f(o[1])})`;
const tx = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(0,-1,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
// Text on a side plane y = const, centred at (x,z).
const txY = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(1,0,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
// Cast shadow of a set of 3D points (any outline of the object), pushed along the light onto z = 0.
// the light stays put relative to the viewer, so the shadow is cast in turned coordinates
// z0: the surface it falls on (a board, a counter); clip it to that surface with clipTo(...) if it could spill off.
// clip: the 3D outline of the surface it falls on (e.g. boardTop(...)), so it can't spill over the edge.
const castShadow = (pts3, z0=0, clip=null) => { const k = SHADOW_LEN / SHADOW_K;
  const s = fill(sp(hull(pts3.map(([x,y,z]) => { const [a,b] = rotXY(x,y); return P0(a+(z-z0)*SH[0]*k, b+(z-z0)*SH[1]*k, z0); }))), SHADOW);
  return clip ? clipTo(clip, s) : s; };
// A board for the object to stand on (a tray, a desk top, a counter): a rounded slab from (x0,y0) to (x1,y1), h thick.
// Draw it first; then castShadow(points, h, boardTop(x0,y0,x1,y1,h,r)) so shadows lie on it and stop at its edge.
const BOARD = { l:'#e6e1d4', m:'#cfc8b8', d:'#aaa293' }, WOOD = { l:'#d9a86c', m:'#bf8a4f', d:'#8e6236' };
const boardTop = (x0,y0,x1,y1,h=3,r=5) => on(PZ(h), rrUV(x0,y0,x1,y1,r));
function board(x0,y0,x1,y1,h=3,r=5,m=BOARD){
  const A = on(PZ(0), rrUV(x0,y0,x1,y1,r)), B = boardTop(x0,y0,x1,y1,h,r);
  return loft(A, B, n => toneI(n, m)) + fill(pd(B), m.l) + ink(pd(B), 1) + hullInk([...A, ...B], 1.8);
}
// Group helpers: clickable target, clip to an opening.
const act  = (name, inner, data='') => `<g data-act="${name}" ${data}>${inner}</g>`;
let _clipN = 0;
// Part label (for "how does it work" figures): a cream pill with a leader line to a 3D point on the part.
// dx, dy = where the pill sits, in screen units at the reference zoom (they scale with the figure like stroke widths).
// on = that part is working right now (the pill turns the accent colour). Labels can be hidden with the Labels switch.
function tag(p3, dx, dy, text, on=false){
  const k = INK_K, [X,Y] = P(...p3), fs = 8.6*k, w = text.length*fs*.62 + fs*1.5, h = fs*1.8, cx = X + dx*k, cy = Y + dy*k;
  return `<g class="tag${on ? ' on' : ''}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="1"/>`
    + `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.3*k)}" fill="${INK}"/>`
    + `<rect x="${f(cx-w/2)}" y="${f(cy-h/2)}" width="${f(w)}" height="${f(h)}" rx="${f(h/2)}" fill="${on ? 'var(--accent,#f4b829)' : '#fff4d6'}" stroke="${INK}" stroke-width="1.2"/>`
    + `<text x="${f(cx)}" y="${f(cy+fs*.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em" fill="${INK}">${text}</text></g>`;
}
const clipTo = (pts3, inner) => { const id = 'k' + (++_clipN); return `<clipPath id="${id}"><path d="${pd(pts3)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; };

/* ---------- constant on-screen line weight ----------
   Stroke widths are written in model units, and each figure is zoomed to fill the frame, so a small
   object would get fat lines. INK_K rescales every stroke-width (and the wobble/grain filter) so all
   figures match the reference zoom of the booth / vending machine (viewBox ≈ 585 units wide). */
const INK_REF_VB = 585;
let INK_K = 1;
const INK_THIN = .4;   // Y2K: thinner lines (hairline outlines, about 40% of the original weights)
const inkScale = svg => INK_K === 1 && INK_THIN === 1 ? svg : svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w * INK_K * INK_THIN).toFixed(2)}"`);

/* ---------- page shell ---------- */
const CORE_CSS = `
  :root{--paper:#f2f7ff;--ink:#2b2552;--muted:#7a7fa8;--rule:#cdd6f0}
  *{box-sizing:border-box} html,body{margin:0;height:100%}
  body{background-color:#bfe3ff;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='200' viewBox='0 0 900 200'><g fill='%23ffffff' stroke='%23ffffff' stroke-width='3' stroke-linejoin='round' opacity='.92'><path d='M60 60h40v-10h50v-10h70v10h30v20h-190z'/><path d='M560 40h30v-10h60v-10h50v10h30v20h-170z'/><path d='M360 110h30v-8h40v-8h40v8h20v16h-130z'/></g></svg>"),url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='140' viewBox='0 0 900 140' preserveAspectRatio='none'><g fill='%23a9c4ee'><path d='M0 140V90h40V60h30v30h30V40h40v50h30V70h40v70zM260 140V80h30V50h50v30h30v60zM420 140V70h40V30h30v40h40v-20h30v90zM640 140V90h40V55h30v35h40V70h40v70zM800 140V60h40V35h30v105z'/></g><g fill='%23c7daf6'><path d='M0 140v-30h60v-20h40v20h60v30zM200 140v-25h50v-18h40v18h70v25zM480 140v-30h70v-15h40v15h60v30zM700 140v-25h60v-20h40v20h100v25z'/></g></svg>") ,linear-gradient(180deg,var(--sk0,#8fcdf7) 0%,var(--sk1,#c9e9ff) 55%,var(--sk2,#f5fbff) 100%);background-repeat:repeat-x,repeat-x,no-repeat;background-position:0 12%,bottom,0 0;background-size:900px 200px,900px 140px,100% 100%;background-attachment:fixed;
    overflow-x:hidden;color:var(--ink);font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;display:flex;flex-direction:column;align-items:center;padding:24px 16px 32px}
  header{width:100%;max-width:760px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  header h1{font-size:13px;font-weight:600;margin:0;letter-spacing:.02em} header span{color:var(--muted)}
  #fig{width:100%;max-width:760px;height:auto;display:block;margin:4px 0 8px;user-select:none;overflow:visible}
  #fig [data-act]{cursor:pointer}
  #readout, .idea{display:none}   /* status line + big idea are off: the buttons and motion tell the story */
  .idea{width:100%;max-width:760px;margin:-6px 0 16px;font-size:12.5px;line-height:1.5;text-align:center;color:var(--ink)}
  .idea strong{letter-spacing:.12em;text-transform:uppercase;font-size:11px;margin-right:8px}
  #readout{position:relative;min-height:1.4em;letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px;text-align:center;text-shadow:0 0 3px var(--paper),0 0 6px var(--paper),0 0 10px var(--paper)}
  .stage{position:relative;width:100%;max-width:760px}
  .actions{position:absolute;top:4px;left:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px;z-index:2;max-width:220px}
  .actions .cap{color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 2px}
  html.nolabels #fig .tag{display:none}
  .ctl[hidden]{display:none}
  /* ui.flash(text): a short note under the buttons ("the can is empty — refill it"); the status line itself stays hidden */
  .toast{position:absolute;left:0;z-index:3;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;background:var(--paper);
    border:1.5px solid var(--ink);border-radius:8px;padding:4px 9px;box-shadow:2px 2px 0 var(--ink);opacity:0;transition:opacity .2s;pointer-events:none;max-width:240px}
  .toast.show{opacity:1}
  .made-with{width:100%;max-width:760px;margin-top:18px;text-align:right;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
  .made-with a{color:var(--muted);text-decoration:none} .made-with a:hover{color:var(--ink)}
  .stats{position:absolute;top:4px;right:0;display:flex;flex-direction:column;align-items:flex-end;gap:10px;z-index:2;text-align:right}
  .stat .k{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .stat .v{font-size:34px;font-weight:800;line-height:1.05;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--ink)}
  .stat.small .v{font-size:20px}
  .stat .v.bump{animation:bump .35s ease-out}
  @keyframes bump{0%{transform:scale(1.18)}100%{transform:none}}
  .stepwrap{position:relative;display:flex;align-items:center;gap:8px}
  .act{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:5px 14px;cursor:pointer;white-space:nowrap}
  .act:hover{background:color-mix(in srgb,var(--paper) 92%,var(--ink))}
  .act .car{margin-left:6px;font-size:10px}
  .act:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
  .chips{display:none;flex-wrap:wrap;gap:6px;background:var(--paper);border:2px solid var(--ink);border-radius:12px;box-shadow:3px 3px 0 var(--ink);
    padding:8px;width:max-content;max-width:min(300px,62vw);position:absolute;left:calc(100% + 10px);top:-4px;z-index:3}
  .stepwrap.open .chips{display:flex}
  .chip{white-space:nowrap;font:inherit;font-size:11.5px;font-weight:700;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px 8px;cursor:pointer;box-shadow:2px 2px 0 var(--ink)}
  .chip:hover{background:var(--accent,#f4b829);transform:translate(-1px,-1px)}
  .chip.current{background:var(--ink);color:var(--paper)} .chip.current:hover{background:var(--ink);transform:none}
  .chip.off{opacity:.45} .chip.off:hover{transform:none;background:var(--paper)}
  
  @media (max-width:560px){body{padding:14px 12px 24px}body>header span,.actions .cap{display:none}.actions{flex-direction:row;flex-wrap:wrap;gap:6px}.act{font-size:12px;padding:4px 11px}.stats{position:static;flex-direction:row;justify-content:flex-end;gap:18px;margin-bottom:4px}.actions{position:static;max-width:none;margin:6px 0 4px}.chips{left:0;top:calc(100% + 8px)}}
  .controls{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 28px;border-top:1px solid var(--rule);padding-top:16px}
  .ctl{display:flex;flex-direction:column;gap:6px}
  .ctl label{color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
  input[type=range]{width:100%;accent-color:var(--ink)}
  .row{display:flex;gap:8px;flex-wrap:wrap}
  button{font:inherit;color:var(--ink);background:transparent;border:1.5px solid var(--ink);border-radius:999px;padding:5px 14px;cursor:pointer}
  button:hover{background:#0000000d}
  .sw{width:26px;height:26px;padding:0;border-radius:50%} .sw[aria-pressed=true]{outline:2px solid var(--ink);outline-offset:2px}`;

const filterFor = k => `<filter id="hand" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.045/k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap id="wob" in="SourceGraphic" in2="warp" scale="${(.7*k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.9/k).toFixed(4)}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".1 0 0 0 .95  .1 0 0 0 .95  .1 0 0 0 .95  0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.012/k).toFixed(4)}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".1 0 0 0 .96  .1 0 0 0 .96  .1 0 0 0 .96  0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>
  <feComposite in="g2" in2="wob" operator="in"/></filter>`;

/* mountFigure({
     fig:'03', title:'Photo booth', hint:'click the curtain…',
     size:[W,D,H],                 // bounding box, used to frame the view (shadow range included)
     palette:'mustard',            // default PALS key
     state:{...},                  // figure state (st.pal is built in)
     scene: (st, m) => svgString,  // m = current palette {l,m,d}
     readout: st => 'text',        // status line under the figure
     buttons: [{label, onClick(st, ui)}      // listed in the order the user should do them
               | {label, choices: st => [{label, onClick(st,ui), current?, disabled?, why?}]}],   // opens a picker
     stats: st => [{label, value, small?}],   // optional: big numbers top-right (credit, change, score)
     credit: false,                // optional: hide the small "Made with Colorfigures" link
     acts: { name(st, el, ui){} },  // clicks on act(name, …) groups; el has dataset
     params(st, q){}               // optional: read URLSearchParams for screenshot states
   })  -> ui = { st, render, animate(stepFn), flash(text,ms) }
   animate(step): calls step(dt seconds) every frame and re-renders until step returns false. */
addEventListener('error', e => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + e.message + ' @' + ((e.error && e.error.stack) || '').split('\n').slice(1, 4).join('|') + ';'; });
function mountFigure(cfg){
  document.title = cfg.title;
  const style = document.createElement('style'); style.textContent = CORE_CSS; document.head.appendChild(style);
  document.body.innerHTML = `
    ${cfg.header === false ? '' : `<header><h1>Fig. ${cfg.fig} — ${cfg.title}</h1><span>${cfg.hint || ''}</span></header>`}
    <div class="stage">
      ${cfg.buttons && cfg.buttons.length ? `<div class="actions" id="btns"><div class="cap">${cfg.buttonsLabel || 'Try it'}</div></div>` : ''}
      ${cfg.stats ? '<div class="stats" id="stats"></div>' : ''}
      <div class="toast" id="toast" role="status"></div>
      <svg id="fig" role="img" aria-label="${cfg.title}"><defs id="fdefs"></defs><g id="art" filter="url(#hand)"></g></svg>
    </div>
    <div id="readout"></div>
    ${cfg.idea ? `<p class="idea"><strong>The big idea</strong>${cfg.idea}</p>` : ''}
    <div class="controls">
      <div class="ctl"><label for="wb">Hand-drawn wobble</label><input id="wb" type="range" min="0" max="7" step="0.1" value="0.7"></div>
      <div class="ctl"><label>Colour</label><div class="row" id="pals"></div></div>
      <div class="ctl" id="lblctl" hidden><label>Labels</label><div class="row"><button id="lbl" aria-pressed="true">On</button></div></div>
    </div>
    ${cfg.credit === false ? '' : '<footer class="made-with"><a href="https://april-zhu.com/colorfigures" target="_blank" rel="noopener">Made with Colorfigures ↗</a></footer>'}`;
  const st = cfg.state || {};            // kept as the same object, so a figure may hold on to it
  if (!st.pal) st.pal = cfg.palette || 'mustard';
  if (st.az == null) st.az = 105;
  const q = new URLSearchParams(location.search);
  if (PALS[q.get('pal')]) st.pal = q.get('pal');
  if (cfg.params) cfg.params(st, q);

  // frame on the object itself: centred, filling ~60% of the width / ~78% of the height of a 4:3 view.
  // The cast shadow is allowed to spill outside the frame (svg overflow is visible).
  const [W,D,H] = cfg.size, pts = [];
  OX = OY = 0; RC = cfg.center || [W/2, D/2];
  VIEW = 0;
  for (const x of [0,W]) for (const y of [0,D]) for (const z of [0,H]) pts.push(P(x,y,z));
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const bw = Math.max(...xs)-Math.min(...xs), bh = Math.max(...ys)-Math.min(...ys);
  // the object fills ~74% of the width / ~88% of the height, nudged right of centre so the buttons (top left) stay clear
  const vbW = Math.max(bw/.74, bh/.88/.75), vbH = vbW*.75;
  OX = (vbW-bw)/2 + vbW*.06 - Math.min(...xs); OY = vbH*.04 - Math.min(...ys);   // sit a little high: shadows fall downward
  const svg = document.getElementById('fig');
  svg.setAttribute('viewBox', `0 0 ${f(vbW)} ${f(vbH)}`);
  INK_K = vbW / INK_REF_VB;
  document.getElementById('fdefs').innerHTML = filterFor(INK_K);

  const art = document.getElementById('art'), readout = document.getElementById('readout');
  const ui = { st };
  ui.render = () => { _clipN = 0; document.documentElement.style.setProperty('--accent', PALS[st.pal].l); { const sv = inkScale(cfg.scene(st, PALS[st.pal])); if (sv !== ui._sv){ ui._sv = sv; art.innerHTML = sv; } } if (!ui._flash) readout.textContent = cfg.readout ? cfg.readout(st) : ''; if (ui.drawStats) ui.drawStats(); };
  // big numbers in the top-right corner (credit, change, score…); a value that changes gets a little bump
  const statsEl = document.getElementById('stats'), prevStats = {};
  ui.drawStats = () => { if (!statsEl) return;
    const list = cfg.stats(st).filter(Boolean), html = list.map(x => `<div class="stat${x.small ? ' small' : ''}"><div class="k">${x.label}</div><div class="v" data-k="${x.label}">${x.value}</div></div>`).join('');
    if (statsEl._html !== html){ statsEl._html = html; statsEl.innerHTML = html;
      statsEl.querySelectorAll('.v').forEach(v => { if (prevStats[v.dataset.k] != null && prevStats[v.dataset.k] !== v.textContent) v.classList.add('bump'); prevStats[v.dataset.k] = v.textContent; }); } };
  let flashT = 0;
  const toast = document.getElementById('toast');
  ui.flash = (text, ms=1600) => { ui._flash = true; readout.textContent = text; toast.textContent = text;
    toast.style.top = ((document.getElementById('btns') ? document.getElementById('btns').offsetTop + document.getElementById('btns').offsetHeight : 0) + 8) + 'px'; toast.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(() => { ui._flash = false; toast.classList.remove('show'); ui.render(); }, ms); };
  // animations run on a ~60 fps timer rather than requestAnimationFrame, so they also run in headless test shots
  ui.animate = step => { let last = performance.now(), lastRender = -Infinity;
    const loop = () => { const now = performance.now(), dt = Math.max(0, Math.min(.05,(now-last)/1000)); last = now; const more = step(dt) !== false; if ((!ui.suspendRender || !ui.suspendRender()) && now-lastRender >= (ui.renderInterval || 0)){lastRender=now;ui.render();} if (more) (navigator.webdriver || document.hidden ? setTimeout(loop, 16) : requestAnimationFrame(loop)); };
    setTimeout(loop, 16); };

  // clickable parts react on press, not on click: while something animates, the scene is redrawn every frame, so the
  // element under the pointer is replaced between press and release and a 'click' would never fire
  svg.addEventListener('pointerdown', e => { if (e.button) return; const a = e.target.closest('[data-act]'); if (!a || !cfg.acts || !cfg.acts[a.dataset.act]) return;
    e.preventDefault(); cfg.acts[a.dataset.act](st, a, ui); ui.render(); });
  const btns = document.getElementById('btns');
  const stepEls = [];
  if (btns) cfg.buttons.forEach((b, i) => {
    const wrap = document.createElement('div'); wrap.className = 'stepwrap';
    const el = document.createElement('button'); el.className = 'act';
    el.innerHTML = `${b.label}${b.choices ? '<span class="car">▾</span>' : ''}`;
    wrap.appendChild(el); btns.appendChild(wrap); stepEls.push(el);
    if (!b.choices){ el.onclick = () => { closeChips(); b.onClick(st, ui); ui.render(); }; return; }
    const chips = document.createElement('div'); chips.className = 'chips'; wrap.appendChild(chips);chips.id=`choices-${cfg.fig}-${i}`;chips.setAttribute('role','group');chips.setAttribute('aria-label',b.label);el.setAttribute('aria-controls',chips.id);el.setAttribute('aria-expanded','false');
    wrap.addEventListener('keydown',e=>{if(e.key==='Escape'&&wrap.classList.contains('open')){e.preventDefault();e.stopPropagation();closeChips();el.focus();}});
    el.onclick = e => { e.stopPropagation(); const open = !wrap.classList.contains('open'); closeChips();
      if (!open) return;
      chips.innerHTML = '';
      // every choice stays clickable, so nothing silently ignores a press:
      //   current:true  = the one in use (shown selected); a press just says so
      //   disabled:true = not possible right now (shown faded); a press says why (c.why, or a generic note)
      for (const c of b.choices(st)){ const ch = document.createElement('button'); ch.className = 'chip' + (c.current ? ' current' : c.disabled ? ' off' : ''); ch.textContent = c.label;
        ch.setAttribute('aria-pressed',String(!!c.current));
        ch.onclick = ev => { ev.stopPropagation(); closeChips();el.focus();
          if (c.current) return ui.flash(cfg.choiceMessages?.current?.(c.label)||`${c.label} — already set`);
          if (c.disabled) return ui.flash(c.why || cfg.choiceMessages?.unavailable?.(c.label) || `${c.label} isn't possible right now`);
          c.onClick(st, ui);cfg.onChoiceChange?.(); ui.render(); }; chips.appendChild(ch); }
      wrap.classList.add('open');el.setAttribute('aria-expanded','true'); };
  });
  function closeChips(){ document.querySelectorAll('.stepwrap.open').forEach(w => {w.classList.remove('open');w.querySelector('.act')?.setAttribute('aria-expanded','false');}); }
  document.addEventListener('click', closeChips);

  document.getElementById('wb').oninput = e => document.getElementById('wob').setAttribute('scale', (e.target.value * INK_K).toFixed(2));
  const pals = document.getElementById('pals');
  for (const [k,p] of Object.entries(PALS)){
    const b = document.createElement('button'); b.className='sw'; b.title=k; b.style.background=p.l; b.setAttribute('aria-pressed', k===st.pal);
    b.onclick = () => { st.pal=k; [...pals.children].forEach(c=>c.setAttribute('aria-pressed', c===b)); ui.render(); };
    pals.appendChild(b);
  }
  // labels: the switch appears when the figure draws any tag(); ?labels=0 starts with them hidden
  const lblctl = document.getElementById('lblctl'), lbl = document.getElementById('lbl');
  const setLabels = on => { document.documentElement.classList.toggle('nolabels', !on); lbl.textContent = on ? 'On' : 'Off'; lbl.setAttribute('aria-pressed', on); };
  lbl.onclick = () => setLabels(document.documentElement.classList.contains('nolabels'));
  if (q.get('labels') === '0') setLabels(false);
  // testing: ?press=Label@ms,Label@ms clicks the buttons whose text starts with Label at those times after load
  // (any order, repeats allowed); Label>Choice picks a choice from a picker button (?press=Speed>3@300).
  // Script errors and unknown labels are recorded on <html data-errors="…">
  window.__st = st;
  const noteErr = m => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + m + ';'; };
  const starts = (el, t) => el.textContent.trim().toLowerCase().startsWith(t.trim().toLowerCase());
  if (q.has('press')) q.get('press').split(',').forEach(item => { const [what, ms] = item.split('@'), [label, choice] = what.split('>');
    setTimeout(() => { const b = [...document.querySelectorAll('.act')].find(b => starts(b, label));
      if (!b) return noteErr(`no button "${label}"`);
      b.click(); if (choice == null) return;
      const c = [...b.parentElement.querySelectorAll('.chip')].find(c => starts(c, choice));
      if (c && !c.disabled) c.click(); else noteErr(`no choice "${choice}" in "${label}"`); }, +ms || 0); });
  setLight(st.az); ui.render();
  if (art.querySelector('.tag')) lblctl.hidden = false;
  return ui;
}

;
// 接線板：純邏輯，不依賴遊戲其他檔案。設計見 docs/wire-board-design.md
// 顏色接線板（B3）：電源在左邊與下邊、技能插槽在上邊與右邊，每個插槽只接同色電源；線經過的色塊襯墊才放得下輔助配件，
// 同色襯墊 ×2、其他顏色 ×1。
(function (root) {
  const W = 10, H = 10;                                        // 邊上一圈是電源與插槽，中間 8×8 是可走線的格子
  const SOCKS = [[9, 4], [3, 0], [9, 2], [6, 0], [9, 7], [1, 0]];   // 插槽位置，依解鎖順序排列
  const SRCS = [[5, 9], [0, 4], [3, 9], [0, 7], [7, 9], [0, 2]];    // 每個插槽專屬的電源（同一組的位置不會交叉）
  const SOCK_COL = ['r', 'b', 'g', 'r', 'b', 'g'];               // 插槽與它的電源顏色：紅、藍、綠
  const SOCK_LV = [1, 4, 9, 15, 22, 30];                       // 與 01-data.js 的 SLOT_LV 相同；這裡獨立複製一份
  const OLD_SOCKS = [[7, 3], [7, 4], [7, 2], [7, 5], [7, 1], [7, 6]];   // 舊版（0.33–0.40）插槽位置，只用來搬舊存檔
  const ROCKS = [[4, 4], [5, 5], [3, 6]];                              // 壞軌：固定不變，不能放配件也不能走線
  const PADS = [[7, 4, 'r'], [1, 4, 'b'], [8, 4, 'g'], [6, 3, 'r'], [6, 8, 'b'], [5, 1, 'g'], [8, 6, 'r'], [4, 3, 'b'], [2, 7, 'g'], [8, 3, 'r'], [8, 8, 'b'], [3, 7, 'g'], [7, 1, 'r'], [2, 4, 'b'], [3, 2, 'g'], [1, 2, 'r'], [2, 5, 'b'], [6, 1, 'g'], [7, 7, 'r'], [5, 6, 'b'], [3, 1, 'g'], [4, 5, 'r'], [6, 4, 'b'], [8, 7, 'g'], [3, 3, 'r'], [3, 5, 'b'], [4, 2, 'g']];  // 色塊襯墊 [x, y, 顏色]：配件只能放在襯墊上
  const PAD_MATCH = 2;                                         // 配件顏色與線同色的襯墊 ×2
  const TIER_MUL = [1, 1.5, 2];                          // 配件階級：Ⅰ、Ⅱ、Ⅲ

  // 主動機件：mult、cd 與 src/game/01-data.js 的 SKILLS 相同；原型獨立，所以在這裡複製一份
  const ACTIVES = {
    RIFT:{n:'稜鏡斷層',tags:['area','cold'],mult:4.2,cd:7.2},RESONANCE:{n:'低頻震盪',tags:['area','light'],mult:4.6,cd:9},GRAVITY:{n:'引力封鎖',tags:['area','cold'],mult:3.6,cd:11},
    FIRE:   { n: '灼熱電池',   tags: ['proj', 'fire'],  mult: 2.6, cd: 2.6 },
    FROST:  { n: '冷氣爆發',   tags: ['area', 'cold'],  mult: 1.9, cd: 4.2 },
    CHAIN:  { n: '紅外線連鎖', tags: ['proj', 'light'], mult: 2.3, cd: 3.2 },
    METEOR: { n: '流星衛星',   tags: ['area', 'fire'],  mult: 6.2, cd: 8.0 },
    PULSE:  { n: '重低音砲', tags: ['area', 'light'], mult: 2.2, cd: 5.0 },
    SPAM:   { n: '迷惑郵件',   tags: ['proj', 'light'], mult: 1.1, cd: 3.6 },
    MAGNET: { n: '超強磁石',   tags: ['area', 'cold'],  mult: 1.5, cd: 6.0 },
    FLICKER:{ n: '連拍閃擊',   tags: ['melee', 'light'], mult: 1.7, cd: 3.4 },
    BEAM:   { n: '雷射指示棒', tags: ['proj', 'fire'],  mult: 4.5, cd: 5.5 },
  };
  Object.assign(ACTIVES,{"DISC": {"n": "回帶飛盤", "mult": 2.2, "cd": 3.8, "tags": ["proj", "light"]}, "COIL": {"n": "街角線圈", "mult": 1.2, "cd": 6, "tags": ["area", "light"]}, "ORBIT": {"n": "磁帶環刃", "mult": 1.25, "cd": 5.8, "tags": ["area", "cold"]}, "RAIL": {"n": "軌道放電", "mult": 4.2, "cd": 4.8, "tags": ["proj", "light"]}, "DEFRAG": {"n": "碎片清除", "mult": 2.9, "cd": 5, "tags": ["proj", "fire"]}, "RELAY": {"n": "中繼崩解", "mult": 2.4, "cd": 7, "tags": ["area", "cold"]}});
  Object.assign(ACTIVES,{"SWARM": {"n": "口袋蜂群", "mult": 0.8, "cd": 14, "tags": ["summon", "light"]}, "GUARDIAN": {"n": "重型護衛", "mult": 2.1, "cd": 18, "tags": ["summon", "fire"]}, "ARROWS": {"n": "電磁箭雨", "mult": 3.8, "cd": 8.5, "tags": ["area", "spread", "light"]}, "GIANTBLADE": {"n": "巨型光刃", "mult": 5.4, "cd": 10, "tags": ["area", "spread", "cold"]}, "OVERTURE": {"n": "失真終章", "mult": 1.5, "cd": 6.8, "tags": ["area", "spread", "light"]}});
  // 輔助配件：needs 為空代表任何主動機件都適用；否則至少符合其中一個標籤
  const SUPPORTS = {
    HEAVY: { n: '超頻',     needs: [],        mod: { dmg: 0.45 } },
    AREA:  { n: '廣播',     needs: ['proj'],  mod: { area: 1, dmg: -0.15 } },
    HASTE: { n: '寬頻',     needs: [],        mod: { cd: -0.3 } },
    TWIN:  { n: '雙卡雙待', needs: [],        mod: { repeat: 1 } },
    CRITS: { n: '爆機',     needs: [],        mod: { crit: 0.3 } },
    COOL:  { n: '散熱片',   needs: [],        mod: { dmg: 0.2, cd: -0.15 } },
    CRYSTAL:{ n: '水晶振盪', needs: [],        mod: { dmg: 0.1, crit: 0.15 } },
    LEECH: { n: '無線充電', needs: [],        mod: { leech: 0.12 } },
    FOCUS: { n: '鎖頻晶片', needs: [],        mod: { dmg: .35, crit: .15, cd: .15 } },
    FORK:  { n: '分線器',   needs: ['proj', 'melee'], mod: { fork: 1 } },
    RECOVER:{ n: '備用電池', needs: [],        mod: { recover: 1 } },
    DELAY: { n: '延遲緩衝', needs: [],        mod: { dmg: -.15, repeat: 1 } },
  };
  Object.assign(SUPPORTS,{"ANCHOR": {"n": "定錨電容", "needs": [], "mod": {"dmg": 0.8, "cd": 0.25}}, "EXECUTE": {"n": "清場指令", "needs": [], "mod": {"dmg": -0.1}}, "BLOOD": {"n": "危險供電", "needs": [], "mod": {"dmg": -0.1}}, "CONDUCT": {"n": "異常協定", "needs": [], "mod": {"dmg": -0.1}}, "LONG": {"n": "遠距天線", "needs": [], "mod": {"dmg": -0.1}}, "SPREAD": {"n": "廣域接頭", "needs": ["spread"], "mod": {"dmg": -0.2, "area": 0.4}}});
  for(const id of ['DISC','COIL','ORBIT','RAIL','RELAY','PULSE','MAGNET','BEAM'])ACTIVES[id].tags.push('spread');
  Object.assign(SUPPORTS,{VENOM:{n:"腐蝕封包",needs:[],mod:{dmg:-.1}},RIME:{n:"冷媒回路",needs:["cold"],mod:{dmg:-.1}},KINDLE:{n:"燃點回授",needs:["fire"],mod:{dmg:-.1}}});
  // 舊版方塊拼圖的形狀，只用來把舊存檔搬到接線板
  const LEGACY = {
    active: { FIRE: [[0, 0]], FROST: [[0, 0], [1, 0]], CHAIN: [[0, 0], [0, 1]], METEOR: [[0, 0], [1, 0], [0, 1]], PULSE: [[0, 0], [1, 0], [1, 1]],
      SPAM: [[0, 0], [1, 0]], MAGNET: [[0, 0], [0, 1], [1, 1]], FLICKER: [[0, 0], [1, 0], [2, 0], [2, 1]], BEAM: [[0, 0], [0, 1], [0, 2]] },
    support: { HEAVY: [[0, 0], [1, 0]], AREA: [[0, 0]], HASTE: [[0, 0], [1, 0], [2, 0]], TWIN: [[0, 0], [1, 0], [0, 1]], CRITS: [[0, 0]],
      COOL: [[0, 0], [1, 0], [1, 1]], CRYSTAL: [[0, 0]], LEECH: [[0, 0], [1, 0]], FOCUS: [[0, 0]], FORK: [[0, 0], [0, 1]], RECOVER: [[0, 0], [1, 0]], DELAY: [[0, 0], [1, 0], [1, 1]] },
  };
  const LIMITS = Object.freeze({ cooldownReduction:0.6, repeatDamage:0.6, castTime:0.4 });

  // weights：每個配件的強度（相鄰同款、強化格會放大），沒給就都是 1
  function skillMods(keys, key, weights) {
    const n = id => keys.reduce((a, k, i) => k === id ? a + (weights ? weights[i] : 1) : a, 0);
    return {
      hit:(1 + .35*n('FOCUS'))*(n('DELAY') ? .85 : 1)*(1 + .45*n('HEAVY'))*
        (1 + .08*Math.max(0,Math.min(5,keys.length)-2))*(1 + .2*n('COOL') + .1*n('CRYSTAL'))*
        (n('AREA') && key === 'FIRE' ? .85 : 1)*(1+.8*n('ANCHOR'))*Math.max(.4,1-.1*n('EXECUTE')-.1*n('BLOOD')-.1*n('CONDUCT')-.1*n('LONG')-.2*n('SPREAD')-.1*n('RIME')-.1*n('KINDLE')),
      crit:15*n('FOCUS') + 30*n('CRITS') + 15*n('CRYSTAL'),
      reduction:30*n('HASTE') + 15*n('COOL'), delay:1 + .15*n('FOCUS')+.25*n('ANCHOR'),
      twin:n('TWIN'), area:!!n('AREA'), leech:!!n('LEECH'), repeat:!!n('DELAY'),
    };
  }
  function cooldown(base, keys, haste=0, multiplier=1, weights) {
    const mod = skillMods(keys, '', weights);
    return base*multiplier*mod.delay*(1 - Math.min(LIMITS.cooldownReduction,Math.max(0,haste + mod.reduction)/100));
  }

  /* ---------- 棋盤規則（等級決定能用多少） ---------- */
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const has = (list, x, y) => list.some(c => c[0] === x && c[1] === y);
  const isInner = (x, y) => x >= 1 && x <= W - 2 && y >= 1 && y <= H - 2;
  const isRock = (x, y) => has(ROCKS, x, y);
  const padAt = (x, y) => PADS.find(p => p[0] === x && p[1] === y);
  const isPad = (x, y) => !!padAt(x, y);
  const padColor = (x, y) => { const p = padAt(x, y); return p ? p[2] : null; };
  const sockAt = (x, y) => SOCKS.findIndex(s => s[0] === x && s[1] === y);
  const sockIndex = p => sockAt(p.x, p.y);
  const startOf = i => { const [x, y] = SRCS[i]; return x === 0 ? [1, y] : [x, H - 2]; };   // 電源旁邊、線的第一格
  const endOf = i => { const [x, y] = SOCKS[i]; return x === W - 1 ? [W - 2, y] : [x, 1]; };   // 插槽旁邊、線的最後一格
  const levelSockets = lvl => SOCK_LV.filter(l => lvl >= l).length;
  const unlockedCount = (b, lvl) => Math.min(SOCKS.length, Math.max(levelSockets(lvl), (b && b.extra) || 0));
  const gemCap = () => 99;      // 配件數量由襯墊數量自然限制，不另設上限
  const wireMax = () => 99;     // 線長也沒有硬上限，板面只有 6×6，三條以上的線會互相擠

  function createBoard() { return { w: W, h: H, v: 5, pieces: [], wires: [], nextId: 1, extra: 0 }; }
  const pieceAt = (b, x, y, kind) => b.pieces.find(p => p.x === x && p.y === y && (!kind || p.kind === kind));
  const getWire = (b, i) => b.wires.find(w => w.sock === i);
  const connected = (b, i) => { const w = getWire(b, i); return !!(w && w.cells.length && same(w.cells[w.cells.length - 1], endOf(i))); };
  const wireCellSet = (b, except) => { const s = new Set(); for (const w of b.wires) if (w.sock !== except) for (const c of w.cells) s.add(c[0] + ',' + c[1]); return s; };
  const wireLen = b => b.wires.reduce((a, w) => a + w.cells.length, 0);
  const wireOf = (b, x, y) => b.wires.find(w => has(w.cells, x, y));
  const no = reason => ({ ok: false, reason });

  /* ---------- 拉線 ---------- */
  function extend(b, i, x, y, lvl) {
    if (!isInner(x, y)) return no('線只能走中間的格子');
    if (isRock(x, y)) return no('壞軌不能走線');
    let w = getWire(b, i);
    if (w && connected(b, i)) return no('這條線已經接通，點最後一格可以收回');
    const last = w && w.cells.length ? w.cells[w.cells.length - 1] : null;
    if (!last) { if (!same(startOf(i), [x, y])) return no('線要從自己顏色的電源旁邊的格子開始'); }
    else if (Math.abs(x - last[0]) + Math.abs(y - last[1]) !== 1) return no('只能接在線尾旁邊的格子');
    if (wireCellSet(b).has(x + ',' + y)) return no('這格已經有線了');
    if (lvl != null && wireLen(b) >= wireMax(b, lvl)) return no('線不夠長，升級可以加長');
    if (!w) { w = { sock: i, cells: [] }; b.wires.push(w); }
    w.cells.push([x, y]);
    return { ok: true, connected: connected(b, i) };
  }
  // 從線尾（沒有線就從電源旁邊的格子）一路接到指定格：繞開壞軌與別條線，找最短路徑，逐格接上；中途接不上就停在原地
  function extendTo(b, i, x, y, lvl) {
    if (!isInner(x, y)) return no('線只能走中間的格子');
    const w = getWire(b, i), last = w && w.cells.length ? w.cells[w.cells.length - 1] : null;
    if (connected(b, i)) return no('這條線已經接通，點最後一格可以收回');
    if (last && last[0] === x && last[1] === y) return no('已經在線尾');
    const direct = extend(b, i, x, y, lvl); if (direct.ok) return direct;
    const used = wireCellSet(b); if (w) for (const c of w.cells) used.add(c.join());
    const ok = (cx, cy) => isInner(cx, cy) && !isRock(cx, cy) && !used.has(cx + ',' + cy);
    const from = last ? last : startOf(i);
    if (!ok(x, y) || (!last && !ok(from[0], from[1]))) return direct;
    const prev = new Map(), q = [from.slice()]; prev.set(from.join(), null);
    while (q.length) {
      const c = q.shift(); if (c[0] === x && c[1] === y) break;
      for (const [dx, dy] of DIRS) { const nx = c[0] + dx, ny = c[1] + dy, k = nx + ',' + ny; if (!ok(nx, ny) || prev.has(k)) continue; prev.set(k, c); q.push([nx, ny]); }
    }
    if (!prev.has(x + ',' + y)) return direct;
    const path = []; for (let c = [x, y]; c; c = prev.get(c[0] + ',' + c[1])) path.unshift(c);
    if (last) path.shift();
    let r = direct;
    for (const c of path) { r = extend(b, i, c[0], c[1], lvl); if (!r.ok) break; }
    return r;
  }
  function shrink(b, i) { const w = getWire(b, i); if (!w) return false; w.cells.pop(); if (!w.cells.length) b.wires = b.wires.filter(q => q !== w); return true; }
  function cut(b, i, x, y) { const w = getWire(b, i); if (!w) return false; const k = w.cells.findIndex(c => c[0] === x && c[1] === y); if (k < 0) return false; w.cells.length = k + 1; return true; }
  function clearWire(b, i) { b.wires = b.wires.filter(w => w.sock !== i); }

  // 最短路線：從這個插槽專屬電源旁邊的格子走到插槽旁；同長度時優先經過同色襯墊
  function route(b, i, lvl, avoid) {
    const used = avoid || wireCellSet(b, i), goal = endOf(i), start = startOf(i), col = SOCK_COL[i];
    const ok = (x, y) => isInner(x, y) && !isRock(x, y) && !used.has(x + ',' + y);
    if (!ok(goal[0], goal[1]) || !ok(start[0], start[1])) return null;
    const dist = new Map(), prev = new Map(), q = [start.slice()];
    const cost = (x, y) => { const c = padColor(x, y); return 1 - (c === col ? .1 : c ? .05 : 0); };
    dist.set(start.join(), cost(start[0], start[1]));
    while (q.length) {
      let m = 0; for (let k = 1; k < q.length; k++) if (dist.get(q[k].join()) < dist.get(q[m].join())) m = k;
      const c = q.splice(m, 1)[0], d = dist.get(c.join());
      for (const [dx, dy] of DIRS) { const x = c[0] + dx, y = c[1] + dy, k = x + ',' + y; if (!ok(x, y)) continue; const nd = d + cost(x, y); if (!dist.has(k) || nd < dist.get(k) - 1e-9) { if (!dist.has(k)) q.push([x, y]); dist.set(k, nd); prev.set(k, c); } }
    }
    if (!dist.has(goal.join())) return null;
    const out = []; for (let c = goal; c; c = prev.get(c[0] + ',' + c[1])) out.unshift(c);
    return out;
  }
  function autoWire(b, i, lvl) {
    const path = route(b, i, lvl); if (!path) return no('找不到可以接通的路線');
    clearWire(b, i); b.wires.push({ sock: i, cells: path }); return { ok: true, cells: path };
  }
  const perms = a => a.length < 2 ? [a] : a.flatMap((v, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map(p => [v, ...p]));
  // 一次把所有有技能卻沒接通的插槽接好；換順序嘗試，找總線長最短、全部接通的組合
  function autoWireAll(b, lvl) {
    const need = b.pieces.filter(p => p.kind === 'active').map(sockIndex).filter(i => i >= 0 && i < unlockedCount(b, lvl) && !connected(b, i)).sort((a, c) => a - c);
    if (!need.length) return { ok: true, count: 0 };
    const keep = b.wires.filter(w => !need.includes(w.sock)), snap = JSON.stringify(b.wires);
    let best = null;
    for (const order of perms(need).slice(0, 720)) {
      b.wires = JSON.parse(JSON.stringify(keep)); let all = true;
      for (const i of order) { const p = route(b, i, lvl); if (!p) { all = false; continue; } b.wires.push({ sock: i, cells: p }); }
      const total = wireLen(b), score = (all ? 0 : 1e6) + total + (need.length - b.wires.filter(w => need.includes(w.sock)).length)*1e5;
      if (!best || score < best.score) best = { score, wires: JSON.parse(JSON.stringify(b.wires)), all };
      if (all && need.length > 4 && best.all) break;
    }
    b.wires = best ? best.wires : JSON.parse(snap);
    return { ok: !!(best && best.all), count: need.filter(i => connected(b, i)).length };
  }

  /* ---------- 擺放 ---------- */
  const defOf = (kind, key) => (kind === 'active' ? ACTIVES : SUPPORTS)[key];
  const shapeOf = () => [[0, 0]];
  const cellsOf = p => [[p.x, p.y]];
  function canPlace(b, kind, key, x, y, rot, ignoreId) {
    if (!defOf(kind, key)) return false;
    if (kind === 'active') return sockAt(x, y) >= 0 && !b.pieces.some(p => p.kind === 'active' && p.x === x && p.y === y && p.id !== ignoreId);
    return isInner(x, y) && !isRock(x, y) && isPad(x, y) && !b.pieces.some(p => p.kind === 'support' && p.x === x && p.y === y && p.id !== ignoreId);
  }
  function place(b, kind, key, x, y, rot, opts) {
    if (!canPlace(b, kind, key, x, y)) return null;
    const p = { id: b.nextId++, kind, key, x, y, rot: 0 };
    if (kind === 'support' && opts && opts.t > 1) p.t = Math.min(3, opts.t | 0);
    b.pieces.push(p);
    if (kind === 'active') { const i = sockIndex(p); if (!connected(b, i) && !(opts && opts.noWire)) autoWire(b, i, opts && opts.lvl); }
    return p;
  }
  function remove(b, id) {
    const i = b.pieces.findIndex(p => p.id === id);
    if (i < 0) return false;
    b.pieces.splice(i, 1);
    return true;
  }
  const rotate = (b, id) => b.pieces.some(p => p.id === id);

  const fits = (key, act) => { const need = SUPPORTS[key].needs; return !need.length || need.some(t => ACTIVES[act.key].tags.includes(t)); };

  // 每個配件的強度：放在與這條線同色的襯墊上 ×2，其他顏色 ×1；再乘上配件階級
  function strength(b, p, lvl) {
    const w = wireOf(b, p.x, p.y);
    const f = w && padColor(p.x, p.y) === SOCK_COL[w.sock] ? PAD_MATCH : 1;
    return f * TIER_MUL[Math.min(3, p.t || 1) - 1];
  }
  // 每個主動機件的結算：線經過、標籤相符的輔助，依序取到上限為止，數值乘上強度後加總（冷卻有下限）
  function resolve(b, lvl = 99) {
    const cap = gemCap(lvl), out = [];
    const actives = b.pieces.filter(p => p.kind === 'active').sort((a, c) => sockIndex(a) - sockIndex(c));
    for (const a of actives) {
      const i = sockIndex(a), wire = connected(b, i) ? getWire(b, i) : null, linked = [], weights = [], over = [], missed = [];
      if (wire) for (const [x, y] of wire.cells) {
        const s = pieceAt(b, x, y, 'support'); if (!s) continue;
        if (!fits(s.key, a)) { missed.push(s.id); continue; }
        if (linked.length >= cap) { over.push(s.id); continue; }
        linked.push(s.id); weights.push(strength(b, s, lvl));
      }
      const stat = { dmg: 0, area: 0, cd: 0, crit: 0, repeat: 0, leech: 0 };
      linked.forEach((id, k) => { const s = b.pieces.find(p => p.id === id); for (const [m, v] of Object.entries(SUPPORTS[s.key].mod)) stat[m] = (stat[m] || 0) + v*weights[k]; });
      const keys = linked.map(id => b.pieces.find(p => p.id === id).key);
      stat.cd = Math.round((cooldown(ACTIVES[a.key].cd, keys, 0, 1, weights)/ACTIVES[a.key].cd - 1)*1e12)/1e12;
      out.push({ id: a.id, key: a.key, sock: i, wired: !!wire, linked, weights, over, missed, stat });
    }
    return out;
  }

  // 補一個位置：輔助要落在指定主動機件的線上、而且是襯墊；優先同色襯墊（×2），找不到回傳 null
  function findSpot(b, kind, key, activeId) {
    if (kind === 'active') { for (const [x, y] of SOCKS) if (canPlace(b, 'active', key, x, y)) return { x, y, rot: 0 }; return null; }
    const act = b.pieces.find(p => p.id === activeId && p.kind === 'active'); if (!act || !fits(key, act)) return null;
    const i = sockIndex(act); if (!connected(b, i) && !autoWire(b, i).ok) return null;
    const cells = getWire(b, i).cells.filter(([x, y]) => canPlace(b, 'support', key, x, y));
    const c = cells.map((c, k) => ({ c, s: (padColor(c[0], c[1]) === SOCK_COL[i] ? 0 : 1)*100 + k })).sort((a, d) => a.s - d.s)[0];
    return c ? { x: c.c[0], y: c.c[1], rot: 0 } : null;
  }

  // 預期 DPS（單一目標）：每次命中 = 武器傷害 × 技能倍率 × (1 + 傷害加成) × 期望會心倍率
  // hero：{ hit 武器傷害, crit 會心率 %, cm 會心傷害 % }
  function dps(b, hero, lvl) {
    return resolve(b, lvl).map(r => {
      const d = ACTIVES[r.key], keys = r.linked.map(id => b.pieces.find(p => p.id === id).key), mod = skillMods(keys, r.key, r.weights);
      const crit = Math.min(1, Math.max(0, (hero.crit + mod.crit) / 100));
      const hit = hero.hit * d.mult * mod.hit * (1 + crit * (hero.cm / 100 - 1));
      const interval = cooldown(d.cd, keys, hero.haste || 0, 1, r.weights);
      const perCast = hit * (1 + mod.twin * LIMITS.repeatDamage + (mod.repeat ? .45 : 0));
      return { id: r.id, key: r.key, hit, interval, dps: perCast / interval };
    });
  }

  /* ---------- 存檔整理與舊版搬家 ---------- */
  // 讀進來的接線板：去掉不合法的東西，不改合法的
  function normalize(raw) {
    const b = createBoard();
    b.extra = Math.max(0, Math.min(SOCKS.length, Math.floor((raw && raw.extra) || 0)));
    for (const p of (raw && raw.pieces) || []) {
      if (!p || (p.kind !== 'active' && p.kind !== 'support') || !defOf(p.kind, p.key) || !Number.isInteger(p.x) || !Number.isInteger(p.y)) continue;
      if (!canPlace(b, p.kind, p.key, p.x, p.y)) continue;
      if (p.kind === 'active' && b.pieces.some(q => q.kind === 'active' && q.key === p.key)) continue;
      const q = { id: b.nextId++, kind: p.kind, key: p.key, x: p.x, y: p.y, rot: 0 };
      if (p.mode) q.mode = p.mode;
      if (p.kind === 'support' && p.t > 1 && p.t <= 3) q.t = p.t | 0;
      b.pieces.push(q);
    }
    const used = new Set();
    for (const w of (raw && raw.wires) || []) {
      if (!w || !Number.isInteger(w.sock) || w.sock < 0 || w.sock >= SOCKS.length || b.wires.some(q => q.sock === w.sock) || !Array.isArray(w.cells)) continue;
      const cells = []; let okw = true;
      for (const c of w.cells) {
        if (!Array.isArray(c) || !Number.isInteger(c[0]) || !Number.isInteger(c[1]) || !isInner(c[0], c[1]) || isRock(c[0], c[1]) || used.has(c.join())) { okw = false; break; }
        const last = cells[cells.length - 1];
        if (last ? Math.abs(last[0] - c[0]) + Math.abs(last[1] - c[1]) !== 1 : !same(startOf(w.sock), c)) { okw = false; break; }
        cells.push([c[0], c[1]]);
      }
      if (!okw || !cells.length) continue;
      cells.forEach(c => used.add(c.join())); b.wires.push({ sock: w.sock, cells });
    }
    return b;
  }
  // 舊版方塊拼圖：解出每個主動機件原本連到哪些輔助
  function legacyLinks(old) {
    const cellsOf2 = p => { let s = (LEGACY[p.kind] || {})[p.key]; if (!s) return []; for (let i = 0; i < ((p.rot || 0) % 4); i++) { s = s.map(([x, y]) => [-y, x]); const mx = Math.min(...s.map(c => c[0])), my = Math.min(...s.map(c => c[1])); s = s.map(([x, y]) => [x - mx, y - my]); } return s.map(([x, y]) => [p.x + x, p.y + y]); };
    const ps = (old.pieces || []).filter(p => p && LEGACY[p.kind] && LEGACY[p.kind][p.key]), occ = new Map();
    ps.forEach((p, k) => cellsOf2(p).forEach(c => occ.set(c.join(), k)));
    const actives = ps.map((p, k) => ({ p, k })).filter(o => o.p.kind === 'active').sort((a, c) => a.p.y - c.p.y || a.p.x - c.p.x);
    return actives.map(({ p, k }) => {
      const adj = new Set();
      for (const [x, y] of cellsOf2(p)) for (const [dx, dy] of DIRS) { const j = occ.get((x + dx) + ',' + (y + dy)); if (j != null && j !== k && ps[j].kind === 'support') adj.add(j); }
      return { key: p.key, mode: p.mode, supports: [...adj].map(j => ps[j].key).filter(s => SUPPORTS[s] && fits(s, { key: p.key })) };
    });
  }
  // 把一串輔助放到某個插槽的線上，不夠位置的就留在庫存
  function dress(b, i, keys, lvl) {
    const act = b.pieces.find(p => p.kind === 'active' && sockIndex(p) === i), w = getWire(b, i); if (!act || !w || !connected(b, i)) return 0;
    let n = 0;
    for (const key of keys.slice(0, gemCap(lvl))) { const sp = findSpot(b, 'support', key, act.id); if (!sp) break; place(b, 'support', key, sp.x, sp.y); n++; }
    return n;
  }
  function migrate(old, lvl) {
    const b = createBoard(), links = legacyLinks(old).slice(0, SOCKS.length);
    b.extra = links.length > levelSockets(lvl) ? links.length : 0;
    links.forEach((l, i) => { const p = place(b, 'active', l.key, SOCKS[i][0], SOCKS[i][1], 0, { noWire: true }); if (p && l.mode) p.mode = l.mode; });
    autoWireAll(b, lvl);
    links.forEach((l, i) => dress(b, i, l.supports, lvl));
    return b;
  }
  // 很舊的存檔（技能槽加輔助孔）：依序放進插槽，輔助放到各自的線上
  function fromLegacy(slots, supp, lvl) {
    const ids = (slots || []).filter(id => id && ACTIVES[id]).slice(0, SOCKS.length), b = createBoard();
    b.extra = ids.length > levelSockets(lvl) ? ids.length : 0;
    ids.forEach((id, i) => place(b, 'active', id, SOCKS[i][0], SOCKS[i][1], 0, { noWire: true }));
    autoWireAll(b, lvl);
    ids.forEach((id, i) => dress(b, i, ((supp && supp[id]) || []).filter(g => SUPPORTS[g] && fits(g, { key: id })), lvl));
    return b;
  }
  // 任何版本的接線板都收成最新版
  // 0.33–0.40 的接線板（v4：插槽全在右欄、電源在左欄）搬到顏色接線板：技能留在原本的插槽順序，重新接線，配件盡量放回襯墊
  function convertV4(raw, lvl) {
    const b = createBoard(), olds = [];
    b.extra = Math.max(0, Math.min(SOCKS.length, Math.floor((raw && raw.extra) || 0)));
    for (const p of (raw && raw.pieces) || []) {
      if (!p || p.kind !== 'active' || !ACTIVES[p.key] || !Number.isInteger(p.x) || !Number.isInteger(p.y)) continue;
      const i = OLD_SOCKS.findIndex(s => s[0] === p.x && s[1] === p.y);
      if (i < 0 || b.pieces.some(q => q.kind === 'active' && q.key === p.key) || pieceAt(b, SOCKS[i][0], SOCKS[i][1], 'active')) continue;
      const q = place(b, 'active', p.key, SOCKS[i][0], SOCKS[i][1], 0, { noWire: true }); if (q && p.mode) q.mode = p.mode;
      const w = ((raw && raw.wires) || []).find(w => w && w.sock === i), cells = w && Array.isArray(w.cells) ? w.cells : [];
      olds[i] = cells.map(c => ((raw.pieces || []).find(s => s && s.kind === 'support' && SUPPORTS[s.key] && s.x === c[0] && s.y === c[1]))).filter(Boolean);
    }
    autoWireAll(b, lvl);
    olds.forEach((list, i) => {
      const act = b.pieces.find(p => p.kind === 'active' && sockIndex(p) === i); if (!act || !list || !connected(b, i)) return;
      for (const s of list) { if (!fits(s.key, act)) continue; const sp = findSpot(b, 'support', s.key, act.id); if (!sp) break; place(b, 'support', s.key, sp.x, sp.y, 0, { t: s.t }); }
    });
    return b;
  }
  function adopt(raw, lvl = 1) { return raw && raw.v === 5 ? normalize(raw) : raw && raw.v === 4 ? convertV4(raw, lvl) : raw && raw.pieces ? migrate(raw, lvl) : migrate({ pieces: [] }, lvl); }

  const api = { TIER_MUL, W, H, SOCKS, SRCS, SOCK_COL, SOCK_LV, ROCKS, PADS, PAD_MATCH, startOf, endOf, sockAt, padAt, isPad, padColor, LIMITS, ACTIVES, SUPPORTS,
    skillMods, cooldown, gemCap, wireMax, unlockedCount, levelSockets, isInner, isRock, sockIndex, pieceAt, getWire, connected, wireLen, wireOf, wireCellSet,
    createBoard, extend, extendTo, shrink, cut, clearWire, route, autoWire, autoWireAll, shapeOf, cellsOf, canPlace, place, remove, rotate, fits, strength, resolve, findSpot, dps,
    normalize, migrate, fromLegacy, adopt, dress };
  if (typeof module !== 'undefined') module.exports = api; else root.LegacyGrid = api;
})(typeof window !== 'undefined' ? window : globalThis);

;
/* Acquireable circuit boards. Legacy geometry is read only during migration. */
(function(root){
 const old=typeof module!=='undefined'?require('./00-grid-legacy.js'):root.LegacyGrid;
 const GEM_COLOR={VENOM:'g',RIME:'b',KINDLE:'r',ANCHOR:'r',EXECUTE:'r',BLOOD:'r',CONDUCT:'b',LONG:'g',SPREAD:'g',HEAVY:'r',FOCUS:'r',DELAY:'r',RECOVER:'r',HASTE:'b',COOL:'b',CRYSTAL:'b',TWIN:'b',AREA:'g',FORK:'g',LEECH:'g',CRITS:'g'};
 const TIER_MUL=[1,1.35,1.65],TIER_COST=[1,2,3];
 const TEMPLATES={
  pocket:{n:'起步微板',size:3,seed:0,lvl:1,depth:0,power:3},
  pocket_v:{n:'直列微板',size:3,seed:1,lvl:1,depth:0,power:3},
  duplex:{n:'雙軌改裝板',size:4,seed:2,lvl:8,depth:3,power:5},
  duplex_v:{n:'轉向雙軌板',size:4,seed:3,lvl:8,depth:3,power:5},
  matrix:{n:'矩陣擴充板',size:6,seed:4,lvl:18,depth:8,power:8},
  matrix_v:{n:'交錯矩陣板',size:6,seed:5,lvl:18,depth:8,power:8},
  extreme:{n:'極限匯流板',size:8,seed:6,lvl:32,depth:18,power:12},
  extreme_v:{n:'垂直匯流板',size:8,seed:7,lvl:32,depth:18,power:12},
  triad:{n:'三拍微型板',size:4,seed:8,lvl:14,depth:6,power:6,shape:'triad',note:'三路端口，緊湊三色洞'},
  annulus:{n:'月環電路板',size:6,seed:9,lvl:20,depth:10,power:8,shape:'ring',note:'中央留空，沿外圈佈線'},
  spindle:{n:'四葉匯流板',size:6,seed:10,lvl:24,depth:12,power:9,shape:'cross',note:'四角隔離，中心供電'},
  cassette:{n:'雙槽卡匣板',size:6,seed:11,lvl:22,depth:11,power:8,shape:'cassette',note:'雙側機艙，橫向繞接'},
  dualbridge:{n:'雙橋主機板',size:8,seed:12,lvl:36,depth:20,power:12,shape:'bridge',note:'四路端口，跨橋分流'},
  prism:{n:'稜鏡矩陣板',size:8,seed:13,lvl:40,depth:24,power:12,shape:'prism',note:'斜向隔離，鏡像洞色'},
  legacy:{n:'舊式保留板',size:8,seed:0,lvl:1,depth:0,power:12,legacy:true}
 };
 const CACHE={};
 function layout(b){
  const id=b&&Object.hasOwn(TEMPLATES,b.template)?b.template:'pocket';if(CACHE[id])return CACHE[id];const t=TEMPLATES[id];
  if(t.legacy)return CACHE[id]={...t,id,w:10,h:10,socks:old.SOCKS,srcs:old.SRCS,colors:['r','b','g','y','v','c'],levels:old.SOCK_LV,rocks:old.ROCKS,pads:old.PADS};
  const n=t.size,vertical=t.seed%2===1,rows=t.shape==='triad'?[1,2,4]:t.shape==='bridge'?[2,3,6,7]:t.shape==='prism'?[1,3,6,8]:n===3?[2]:n===4?(vertical?[2,3]:[1,4]):n===6?(vertical?[1,2,5,6]:[1,3,4,6]):(vertical?[1,3,4,5,6,8]:[1,2,4,5,7,8]);
  const srcs=rows.map((r,i)=>vertical?[r,i%2?0:n+1]:[i%2?n+1:0,r]);
  const socks=rows.map((r,i)=>vertical?[r,i%2?n+1:0]:[i%2?0:n+1,r]);
  const colors=rows.map((_,i)=>['r','b','g','y','v','c'][i]);
  const rocks=[];for(let y=2;y<n;y++)for(let x=2;x<n;x++)if(!(vertical?rows.includes(x):rows.includes(y))&&(x*7+y*11+t.seed)%5===0&&rocks.length<Math.floor(n/2))rocks.push([x,y]);
  if(t.shape){rocks.length=0;const patterns={ring:[[3,3],[4,3],[3,4],[4,4]],cross:[[2,2],[5,2],[2,5],[5,5]],cassette:[[3,2],[4,2],[3,5],[4,5]],bridge:[[4,1],[4,4],[4,5],[4,8]],prism:[[2,2],[3,3],[6,6],[7,7]]};for(const point of patterns[t.shape]||[])rocks.push(point);}
  const pads=[];for(let y=1;y<=n;y++)for(let x=1;x<=n;x++)if(!rocks.some(p=>p[0]===x&&p[1]===y))pads.push([x,y,['r','b','g'][(t.shape==='prism'?Math.abs(x-y)+t.seed:t.shape==='cassette'?x+2*y+t.seed:x+y+t.seed)%3]]);
  return CACHE[id]={...t,id,w:n+2,h:n+2,socks,srcs,colors,levels:rows.map(()=>1),rocks,pads};
 }
 const same=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];
 const isInner=(x,y,b)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=1&&y>=1&&x<layout(b).w-1&&y<layout(b).h-1;
 const isRock=(x,y,b)=>layout(b).rocks.some(p=>same(p,[x,y]));
 const padAt=(x,y,b)=>layout(b).pads.find(p=>same(p,[x,y]));
 const isPad=(x,y,b)=>!!padAt(x,y,b),padColor=(x,y,b)=>padAt(x,y,b)?.[2]||null;
 const sockAt=(x,y,b)=>layout(b).socks.findIndex(p=>same(p,[x,y]));
 const sockIndex=(p,b)=>sockAt(p.x,p.y,b);
 const edgeInner=(p,L)=>[Math.max(1,Math.min(L.w-2,p[0])),Math.max(1,Math.min(L.h-2,p[1]))];
 const startOf=(i,b)=>edgeInner(layout(b).srcs[i]||[-9,-9],layout(b)),endOf=(i,b)=>edgeInner(layout(b).socks[i]||[-9,-9],layout(b));
 const unlockedCount=(b,lvl=999)=>layout(b).legacy?old.levelSockets(lvl):layout(b).socks.length;
 const pieceAt=(b,x,y,kind)=>b.pieces.find(p=>p.x===x&&p.y===y&&(!kind||p.kind===kind));
 const getWire=(b,i)=>b.wires.find(w=>w.sock===i),wireOf=(b,x,y)=>b.wires.find(w=>w.cells.some(c=>same(c,[x,y])));
 const wireLen=b=>b.wires.reduce((n,w)=>n+w.cells.length,0);
 const wireCellSet=(b,except)=>new Set(b.wires.filter(w=>w.sock!==except).flatMap(w=>w.cells.map(c=>c.join(','))));
 const powerUsed=b=>b.pieces.filter(p=>p.kind==='support').reduce((n,p)=>n+TIER_COST[Math.max(0,Math.min(2,(p.t||1)-1))],0);
 function validPath(b,w){
  if(!w||!Number.isInteger(w.sock)||!layout(b).socks[w.sock]||!Array.isArray(w.cells)||!w.cells.length)return false;
  if(b.wires.filter(q=>q.sock===w.sock).length>1)return false;
  const seen=new Set(),occupied=wireCellSet(b,w.sock);let last=null;
  for(const c of w.cells){if(!Array.isArray(c)||!isInner(c[0],c[1],b)||isRock(c[0],c[1],b)||seen.has(c.join(','))||occupied.has(c.join(',')))return false;
   if(last?Math.abs(c[0]-last[0])+Math.abs(c[1]-last[1])!==1:!same(c,startOf(w.sock,b)))return false;seen.add(c.join(','));last=c;
  }return true;
 }
 const connected=(b,i)=>{const w=getWire(b,i);return validPath(b,w)&&same(w.cells.at(-1),endOf(i,b));};
 function createBoard(template='pocket'){const b={v:6,template:Object.hasOwn(TEMPLATES,template)?template:'pocket',pieces:[],wires:[],nextId:1,extra:0};const L=layout(b);b.w=L.w;b.h=L.h;return b;}
 function canPlace(b,kind,key,x,y,rot=0,ignoreId=null,t=1){
  if(!Object.hasOwn(kind==='active'?old.ACTIVES:old.SUPPORTS,key))return false;
  if(pieceAt(b,x,y)?.id!==ignoreId&&pieceAt(b,x,y))return false;
  if(kind==='active')return sockAt(x,y,b)>=0&&!b.pieces.some(p=>p.kind==='active'&&p.key===key&&p.id!==ignoreId);
  if(kind!=='support'||!isPad(x,y,b)||isRock(x,y,b)||padColor(x,y,b)!==GEM_COLOR[key])return false;
  const before=b.pieces.find(p=>p.id===ignoreId&&p.kind==='support'),used=powerUsed(b)-(before?TIER_COST[(before.t||1)-1]:0);
  return used+TIER_COST[Math.max(0,Math.min(2,t-1))]<=layout(b).power;
 }
 function place(b,kind,key,x,y,rot=0,opts={}){const t=Math.max(1,Math.min(3,opts?.t|0||1));if(!canPlace(b,kind,key,x,y,rot,null,t))return null;const p={id:b.nextId++,kind,key,x,y,rot:0};if(kind==='support')p.t=t;b.pieces.push(p);return p;}
 function remove(b,id){const i=b.pieces.findIndex(p=>p.id===id);if(i<0)return false;b.pieces.splice(i,1);return true;}
 function extend(b,i,x,y,lvl=999){
  if(i<0||i>=unlockedCount(b,lvl))return {ok:false,reason:'此終點尚未開放'};
  if(!isInner(x,y,b)||isRock(x,y,b))return {ok:false,reason:'這格不能走線'};
  let w=getWire(b,i);if(connected(b,i))return {ok:false,reason:'此線已接通，可從線尾收回'};
  const last=w?.cells.at(-1);if(last?Math.abs(last[0]-x)+Math.abs(last[1]-y)!==1:!same([x,y],startOf(i,b)))return {ok:false,reason:'請從電源旁開始，逐格相連'};
  if(wireCellSet(b).has([x,y].join(',')))return {ok:false,reason:'這格已有電線'};
  if(!w){w={sock:i,cells:[]};b.wires.push(w);}w.cells.push([x,y]);return {ok:true,connected:connected(b,i)};
 }
 function shrink(b,i){const w=getWire(b,i);if(!w?.cells.length)return false;w.cells.pop();if(!w.cells.length)b.wires=b.wires.filter(q=>q!==w);return true;}
 function clearWire(b,i){b.wires=b.wires.filter(w=>w.sock!==i);}
 function route(b,i){
  const from=startOf(i,b),to=endOf(i,b),used=wireCellSet(b,i),q=[[from]],seen=new Set([from.join(',')]);
  while(q.length){const path=q.shift(),p=path.at(-1);if(same(p,to))return path;for(const[dX,dY]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dX,p[1]+dY],k=n.join(',');if(isInner(...n,b)&&!isRock(...n,b)&&!used.has(k)&&!seen.has(k)){seen.add(k);q.push([...path,n]);}}}return null;
 }
 function strength(b,p){return TIER_MUL[(p.t||1)-1];}
 function resolve(b,lvl=999){
  const out=[];for(const a of b.pieces.filter(p=>p.kind==='active')){const i=sockIndex(a,b),wire=i<unlockedCount(b,lvl)&&connected(b,i)?getWire(b,i):null,linked=[],weights=[],over=[],missed=[];
   if(wire)for(const[x,y]of wire.cells){const p=pieceAt(b,x,y,'support');if(!p)continue;if(padColor(x,y,b)!==GEM_COLOR[p.key]||!old.fits(p.key,a)){missed.push(p.id);continue;}if(linked.length>=3){over.push(p.id);continue;}linked.push(p.id);weights.push(strength(b,p));}
   const stat={dmg:0,area:0,cd:0,crit:0,repeat:0,leech:0};linked.forEach((id,j)=>{const p=b.pieces.find(p=>p.id===id);for(const[k,v]of Object.entries(old.SUPPORTS[p.key].mod))stat[k]=(stat[k]||0)+v*weights[j];});
   out.push({id:a.id,key:a.key,sock:i,wired:!!wire,linked,weights,over,missed,stat});
  }return out.sort((a,b)=>a.sock-b.sock);
 }
 function normalize(raw){
  const b=createBoard(raw?.template);for(const kind of['active','support'])for(const p of(Array.isArray(raw?.pieces)?raw.pieces:[]).slice(0,80)){if(!p||p.kind!==kind)continue;const q=place(b,kind,p.key,p.x,p.y,0,{t:p.t});if(q&&typeof p.mode==='string'&&p.mode.length<60)q.mode=p.mode;}
  for(const w of(Array.isArray(raw?.wires)?raw.wires:[]).slice(0,6)){if(!Number.isInteger(w?.sock)||getWire(b,w.sock)||!Array.isArray(w.cells)||w.cells.length>64)continue;const q={sock:w.sock,cells:w.cells.map(c=>Array.isArray(c)?c.slice(0,2):[])};if(validPath(b,q))b.wires.push(q);}return b;
 }
 function adopt(raw,lvl=1){
  if(raw?.v===6)return normalize(raw);
  const legacy=raw?.v===5?old.normalize(raw):old.adopt(raw,lvl);return normalize({...legacy,template:'legacy',v:6});
 }
 const findSpot=(b,kind,key,id)=>kind==='active'?layout(b).socks.map(([x,y])=>({x,y,rot:0})).find(p=>canPlace(b,kind,key,p.x,p.y)):null;
 const manual=()=>({ok:false,reason:'請手動裝上機件及逐格接線'});
 const api={...old,version:6,TEMPLATES,GEM_COLOR,TIER_MUL,TIER_COST,layout,createBoard,adopt,normalize,isInner,isRock,isPad,padAt,padColor,sockAt,sockIndex,startOf,endOf,unlockedCount,
  pieceAt,getWire,wireOf,wireLen,wireCellSet,powerUsed,validPath,connected,canPlace,place,remove,strength,resolve,extend,extendTo:extend,shrink,clearWire,cut:clearWire,route,findSpot,
  dps:(b,hero,lvl)=>resolve(b,lvl).filter(r=>r.wired).map(r=>{const d=old.ACTIVES[r.key],keys=r.linked.map(id=>b.pieces.find(p=>p.id===id).key),mod=old.skillMods(keys,r.key,r.weights),crit=Math.min(1,Math.max(0,(hero.crit+mod.crit)/100)),hit=hero.hit*d.mult*mod.hit*(1+crit*(hero.cm/100-1)),interval=old.cooldown(d.cd,keys,hero.haste||0,1,r.weights);return {id:r.id,key:r.key,hit,interval,dps:hit*(1+mod.twin*old.LIMITS.repeatDamage+(mod.repeat?.45:0))/interval};}),
  PAD_MATCH:1,gemCap:()=>3,wireMax:b=>layout(b).size**2,autoWire:manual,autoWireAll:manual,dress:()=>0,
  fromLegacy:(slots,supp,lvl)=>adopt(old.fromLegacy(slots,supp,lvl),lvl),migrate:(raw,lvl)=>adopt(raw,lvl)};
 if(typeof module!=='undefined')module.exports=api;else root.GridLab=api;
})(typeof window!=='undefined'?window:globalThis);

;
/* =====================================================================
   Idle Hero v2: dark, hand-inked isometric idle ARPG
   skills + supports, passive tree, maps, save + offline progress
   ===================================================================== */
const GAME_FEATURES = {cardChoices:false};
const BXW = 30, BYW = 74, BZ = 3;
const HX = 15, HY = 36;   // 主角站在島的正中央，魔物從四面八方來
// 魔物圍住英雄的站位（相對主角的偏移）：五圈、四方八面都有，讓一大群怪可以同時圍上來
const SLOTS = [];
for (const [n, r] of [[6, 10], [10, 16], [14, 22], [18, 28], [22, 34]]) for (let i = 0; i < n; i++){ const a = -Math.PI/2 + (i + (r % 2 ? .5 : 0))*Math.PI*2/n; SLOTS.push([Math.cos(a)*r, Math.sin(a)*r]); }
const BONE  = { l:'#f4efde', m:'#d9d2ba', d:'#a39b82' };
const STONE = { l:'#cfcabc', m:'#aaa598', d:'#7b766a' };
const BIOMES = [
  { n:'綠蔭公園', board:{ l:'#b8e6a8', m:'#97d28c', d:'#6aa27a' }, t1:'#6fcf9a', t2:'#8fe0b0', portal:'#7a5fe0', glow:'#b79cff' },
  { n:'午後空地', board:{ l:'#ffe4a8', m:'#f2cb86', d:'#c9a064' }, t1:'#d8c468', t2:'#ecdc88', portal:'#ff8a5c', glow:'#ffc9a0' },
  { n:'白雪山路', board:{ l:'#eef7ff', m:'#cfe3f6', d:'#9ab4d6' }, t1:'#a8d0ee', t2:'#d2ecfb', portal:'#4a9cf0', glow:'#a8e0ff' },
  { n:'熔岩深淵', board:{ l:'#c9aebc', m:'#a98ea0', d:'#7a6078' }, t1:'#a8587a', t2:'#c8708a', portal:'#ff5a8a', glow:'#ffb0c8' },
  { n:'霓虹商圈', board:{ l:'#7a80c8', m:'#5f65ac', d:'#3a3f78' }, t1:'#00d8f0', t2:'#ff4fd8', portal:'#00e5ff', glow:'#8ffcff' },
  { n:'千禧遊樂場', board:{ l:'#ffd9ee', m:'#ffbfdf', d:'#e08cba' }, t1:'#ff8fc8', t2:'#8fe8ff', portal:'#ff6aa8', glow:'#ffd6ee' },
];
const RAR = [ { n:'普通', c:'#6b665b', g:'#d9d3c2', w:55 }, { n:'魔法', c:'#2f6fd6', g:'#6a9cf0', w:32 },
              { n:'稀有', c:'#a9780a', g:'#f4c542', w:11 }, { n:'傳奇', c:'#c4501f', g:'#ff7a3d', w:2 } ];
const SLOTN = { head:'頭部', armor:'身體', gloves:'手部', ring:'飾品', boots:'鞋子', weapon:'武器', offhand:'副手' };
const GEAR_ROUTE={head:'memory',armor:'memory',gloves:'signal',ring:'power',boots:'power',weapon:'signal',offhand:'memory'};
function gearImplicit(slot,il,bs=0){
  const base=slot==='weapon'?{k:'dmg',v:Math.round(4+il*1.5)}:slot==='armor'?{k:'armor',v:Math.round(5+il*3)}:slot==='head'?{k:'life',v:Math.round(8+il*2)}:slot==='gloves'?{k:'aps',v:2}:slot==='boots'?{k:'haste',v:2}:slot==='offhand'?{k:'armor',v:Math.round(3+il*1.5)}:{k:'crit',v:2};
  const key=bs>0&&SERIES[slot]?.[bs]?.imp;if(!key)return base;
  return {k:key,v:Math.max(1,Math.round(AFF[key].b(il)*.55))};
}
/* 裝備系列：同一欄位三條系列，各有不同隱性詞綴與名稱，第 0 系列保持舊物品原樣。 */
const SERIES = {
  weapon:[{n:'近戰系'},{n:'疾速系',imp:'aps'},{n:'訊號系',imp:'ele'}],
  armor:[{n:'標準系'},{n:'輕量系',imp:'dodgeA'},{n:'重裝系',imp:'life'}],
  head:[{n:'標準系'},{n:'堅固系',imp:'lifeP'},{n:'學習系',imp:'xpPct'}],
  gloves:[{n:'標準系'},{n:'獵手系',imp:'vsElite'},{n:'精準系',imp:'crit'}],
  boots:[{n:'標準系'},{n:'疾行系',imp:'moveSpd'},{n:'輕靈系',imp:'dodgeA'}],
  ring:[{n:'標準系'},{n:'商人系',imp:'goldPct'},{n:'尋寶系',imp:'rarity'}],
  offhand:[{n:'標準系'},{n:'緩衝系',imp:'takenRed'},{n:'生命系',imp:'lifeP'}] };
const AFF = {
  dmg:   { g:'m', tags:['物理'], t:v => `+${v} 物理傷害`,   b:il => 2 + il*.9 },
  inc:   { g:'m', tags:['傷害'], t:v => `${v}% 增加傷害`,    b:il => 8 + il*1.2 },
  crit:  { g:'s', tags:['暴擊'], t:v => `+${v}% 會心率`,     b:il => 3 + il*.35 },
  cm:    { g:'s', tags:['暴擊'], t:v => `+${v}% 會心傷害`,   b:il => 12 + il*1.6 },
  aps:   { g:'s', tags:['速度'], t:v => `${v}% 攻擊速度`,    b:il => 5 + il*.5 },
  fire:  { g:'m', tags:['火','元素'], t:v => `${v}% 火焰傷害`,    b:il => 10 + il*1.8 },
  cold:  { g:'m', tags:['冰','元素'], t:v => `${v}% 冰霜傷害`,    b:il => 10 + il*1.8 },
  light: { g:'m', tags:['電','元素'], t:v => `${v}% 閃電傷害`,    b:il => 10 + il*1.8 },
  haste: { g:'s', tags:['速度'], t:v => `${v}% 技能急速`,    b:il => 4 + il*.4 },
  life:  { g:'m', tags:['生命'], t:v => `+${v} 生命`,        b:il => 12 + il*5 },
  armor: { g:'m', tags:['防禦'], t:v => `+${v} 護甲`,        b:il => 6 + il*3.5 },
  regen: { g:'s', tags:['生命'], t:v => `+${v} 生命回復/秒`, b:il => 1 + il*.35 },
  leech: { g:'s', tags:['生命'], t:v => `${v}% 生命偷取`,    b:il => .8 + il*.07 },
  lifeP: { g:'m', tags:['生命'], t:v => `${v}% 最大生命`,        b:il => 3 + il*.35 },
  armorP:{ g:'m', tags:['防禦'], t:v => `${v}% 護甲`,            b:il => 6 + il*.7 },
  ele:   { g:'m', tags:['元素'], t:v => `${v}% 全元素傷害`,      b:il => 6 + il*1.0 },
  vsElite:{ g:'m', tags:['傷害'], t:v => `${v}% 對精英與首領增傷`, b:il => 6 + il*1.1 },
  dodgeA:{ g:'s', tags:['防禦'], t:v => `+${v}% 閃避率`,         b:il => 1.5 + il*.12 },
  takenRed:{ g:'s', tags:['防禦'], t:v => `${v}% 受到傷害降低`,    b:il => 1.5 + il*.1 },
  killHeal:{ g:'s', tags:['生命'], t:v => `擊殺回復 ${v}% 最大生命`, b:il => .3 + il*.02 },
  goldPct:{ g:'s', tags:['獎勵'], t:v => `${v}% 金幣增加`,        b:il => 6 + il*1.0 },
  xpPct: { g:'s', tags:['獎勵'], t:v => `${v}% 經驗增加`,        b:il => 5 + il*.8 },
  rarity:{ g:'s', tags:['獎勵'], t:v => `${v}% 掉落稀有度`,      b:il => 6 + il*.9 },
  moveSpd:{ g:'s', tags:['速度'], t:v => `${v}% 移動速度`,       b:il => 2 + il*.2 },
};
const POOL = {
  weapon:['dmg','inc','fire','cold','light','vsElite','ele','crit','cm','aps','haste','leech'],
  armor:['life','armor','lifeP','armorP','inc','regen','leech','haste','dodgeA','takenRed'],
  ring:['fire','cold','light','inc','life','ele','crit','cm','leech','aps','haste','goldPct','rarity'] };
const STAT_KEY = { lifeP:'lifePct', armorP:'armorPct', ele:'ele', vsElite:'vsElite', dodgeA:'dodge', takenRed:'takenRed', killHeal:'killHeal', goldPct:'goldPct', xpPct:'xpPct', rarity:'rarity', moveSpd:'moveSpd', dmg:'dmg', inc:'inc', crit:'crit', cm:'cm', aps:'apsInc', fire:'fire', cold:'cold', light:'light', haste:'haste', life:'life', armor:'armor', regen:'regen', leech:'leech' };
const PREF = { lifeP:'厚實的', armorP:'堅固的', ele:'全頻的', vsElite:'獵手的', dodgeA:'靈巧的', takenRed:'緩衝的', killHeal:'回收的', goldPct:'進帳的', xpPct:'勤勉的', rarity:'幸運的', moveSpd:'輕快的', dmg:'加重的', inc:'超頻的', crit:'會心的', cm:'暴走的', aps:'高速的', fire:'過熱的', cold:'冷氣的', light:'帶電的', haste:'寬頻的', life:'耐用的', armor:'加厚的', regen:'充電的', leech:'偷訊號的' };
// Y2K 城市物件：武器是街頭隨手可得的東西，外套是當年的潮服，配件是千禧年的電子小物
const BASES = { weapon:['摺疊傘','鋁製球棒','霓虹光管','雷射光劍'], armor:['連帽衛衣','牛仔外套','羽絨背心','反光風褸'], ring:['BB Call 傳呼機','翻蓋手機','MD 隨身聽','電子寵物機'] };
const RARE_NAMES = { weapon:['午夜特急','霓虹斷線','像素裂縫','千年蟲'], armor:['街角傳說','電波外套','夜行者','高架橋之影'], ring:['未接來電','Y2K 倒數','電波滿格','撥號連線'] };
/* 傳奇（暗金）裝備：每個欄位三種，各自帶一條會改變技能行為的特效 */
const LEGENDS = {
  weapon:[ { id:'W_ECHO',  name:'回音光劍',   aff:['dmg','fire','crit','aps'],  d:'每施放 4 次技能，第 4 次會自動再施放一次（100% 傷害）' },
           { id:'W_FORK',  name:'碎星球棒',   aff:['dmg','inc','crit','cm'],    d:'技能會心時，另外對 2 個附近敵人造成 50% 傷害' },
           { id:'W_MULTI', name:'萬用遙控器', aff:['dmg','inc','haste','aps'],  d:'每裝備一種不同的技能，所有技能傷害 +15%' } ],
  armor:[  { id:'A_PHOENIX', name:'不滅羽絨', aff:['life','armor','regen','leech'], d:'受到致命傷時以 50% 生命復活，全部技能立即冷卻完畢（90 秒一次）' },
           { id:'A_RIPOSTE', name:'反光風褸', aff:['life','armor','inc','haste'],   d:'成功閃避時，自動施放一次技能（80% 傷害）' },
           { id:'A_RESET',   name:'電波外套', aff:['life','armor','haste','regen'], d:'每討伐 25 隻怪，全部技能立即冷卻完畢' } ],
  ring:[   { id:'R_LAST', name:'最後一通來電', aff:['crit','cm','inc','aps'],   d:'生命低於 35% 時，技能冷卻速度 +150%、傷害 +40%' },
           { id:'R_LINK', name:'電波滿格',     aff:['crit','inc','fire','light'], d:'討伐魔物時，其生命的 50% 變成傷害轉給最近的敵人' },
           { id:'R_DIAL', name:'撥號連線',     aff:['cm','aps','haste','inc'],  d:'每次施放技能有 20% 機率免費再施放一次' } ],
};
// Additional equipment types share the same affix and rarity system.
Object.assign(POOL,{
  head:['life','armor','lifeP','armorP','inc','regen','haste','takenRed','xpPct','killHeal'],
  gloves:['inc','life','armor','vsElite','ele','aps','crit','cm','haste','leech'],
  boots:['life','armor','lifeP','armorP','regen','haste','leech','dodgeA','moveSpd'],
  offhand:['armor','life','armorP','lifeP','fire','cold','light','ele','crit','haste','takenRed','regen'] });
Object.assign(BASES,{head:['網帽','隔音耳罩','金屬護目鏡','訊號頭盔'],gloves:['露指手套','機車手套','導電手套','脈衝護手'],boots:['厚底帆布鞋','街頭短靴','磁浮跑鞋','光軌長靴'],offhand:['迷你音箱','反射護板','訊號接收器','電磁護盾']});
/* 系列 1、2 的名稱（第 0 系列沿用 BASES） */
const BASES_ALT = {
  weapon:[['彈弓','BB 槍','遙控飛鏢','電磁砲'],['天線棒','對講機','訊號槍','衛星天線']],
  armor:[['運動外套','防風衣','機能背心','反光披風'],['工作服','安全帽夾克','防彈背心','鋼纖大衣']],
  head:[['安全帽','工地頭盔','防護面罩','合金頭盔'],['學生帽','耳機頭帶','資料護目鏡','神經頭環']],
  gloves:[['抓地手套','攀岩手套','獵手護腕','追蹤護手'],['射擊手套','精密指套','瞄準護腕','校準護手']],
  boots:[['慢跑鞋','滑板鞋','彈跳靴','噴射靴'],['舞鞋','滾輪鞋','磁懸鞋','影步靴']],
  ring:[['零錢包','錢夾','金卡吊飾','保險箱戒'],['尋寶雷達','金屬探測器','幸運吊飾','開箱令牌']],
  offhand:[['緩衝墊','氣墊盾','吸能護板','力場盾'],['保溫瓶','急救包','生命核心','再生艙']] };
function baseName(slot,il,bs=0){const t=Math.min(3,Math.floor(il/6));return bs>0&&BASES_ALT[slot]?.[bs-1]?BASES_ALT[slot][bs-1][t]:BASES[slot][t];}
Object.assign(RARE_NAMES,{head:['夜航頻率','靜電視界','都市殘響','斷訊面罩'],gloves:['低頻握力','凌晨訊號','電弧手勢','超載觸點'],boots:['末班快線','午夜步頻','空白軌跡','高架疾走'],offhand:['倒帶回聲','電波隔離','鏡面訊號','城市屏障']});
Object.assign(LEGENDS,{head:[{id:'H_BROADBAND',name:'寬頻耳罩',aff:['life','haste','armor','regen'],d:'偏重生命、技能急速與持續回復的頭部裝備。'}],gloves:[{id:'G_CONTACT',name:'超頻觸點',aff:['aps','crit','cm','life'],d:'偏重攻擊速度與會心的手部裝備。'}],boots:[{id:'B_LASTTRAIN',name:'末班快線',aff:['life','haste','regen','armor'],d:'偏重技能急速與生存的鞋子。'}],offhand:[{id:'O_REFLECTOR',name:'訊號反射板',aff:['armor','life','haste','light'],d:'偏重護甲與閃電傷害的副手裝備。'}]});
// User supplied Y2K signature gear: kept out of ordinary rarity/pity/forge pools.
const SIGNATURE_DROP = {normal:.00001, elite:.0001, boss:.001};
const SIGNATURE_PENDING = new Set(['ping_clip','milo_md_strap','ping_bag_strap','null_lanyard']);
const SIGNATURE_GEAR = Object.fromEntries([
 ["aki_headphones", "street", "head", "修補耳機"],
 ["aki_baton", "street", "weapon", "改裝伸縮電棍"],
 ["aki_chain", "street", "ring", "銀色腰鏈"],
 ["aki_charm", "street", "ring", "插頭吊飾"],
 ["milo_headphones", "frost", "head", "DJ 耳機"],
 ["milo_md", "frost", "ring", "MD 隨身聽"],
 ["milo_disc", "frost", "weapon", "音波發射盤"],
 ["milo_belt", "frost", "ring", "條紋腰帶布帶"],
 ["milo_md_strap", "frost", "armor", "MD 機肩帶"],
 ["ping_clip", "beep", "head", "金屬髮夾"],
 ["ping_comm", "beep", "ring", "通訊耳機"],
 ["ping_bag", "beep", "armor", "硬殼郵差包"],
 ["ping_launcher", "beep", "weapon", "前臂發射器"],
 ["ping_phone", "beep", "offhand", "翻蓋手機"],
 ["ping_bag_strap", "beep", "armor", "郵差包肩帶"],
 ["null_goggles", "volt", "head", "防護眼鏡"],
 ["null_controller", "volt", "weapon", "電子寵物控制器"],
 ["null_box", "volt", "ring", "備用電池盒"],
 ["null_pet", "volt", "offhand", "浮游寵機"],
 ["null_lanyard", "volt", "armor", "控制器頸繩"]
].map(([model,owner,slot,label])=>{
 const who={street:'戰士',frost:'樂師',beep:'獵手',volt:'寵機師'}[owner],id='Y2K_'+model.toUpperCase();
 return [id,{id,model,owner,slot,name:who+'・'+label,aff:slot==='weapon'?['dmg','inc','crit','aps']:slot==='armor'?['life','armor','regen','haste']:['crit','cm','haste','inc'],pending:SIGNATURE_PENDING.has(model),d:who+' 專屬裝備；僅對應職業可裝備。'+(SIGNATURE_PENDING.has(model)?'目前以程序式 3D 代用，原始模型待補。':'')+'雜兵 0.001%、精英 0.01%、BOSS 0.1% 機率掉落一件隨機專裝；不受暗金保底影響。'}];
}));
for(const gear of Object.values(SIGNATURE_GEAR))LEGENDS[gear.slot].push(gear);
const signatureOf = it => it && SIGNATURE_GEAR[it.lg] || null;
const canUseGear = (it,character=G.char) => !signatureOf(it)||signatureOf(it).owner===character;

LEGENDS.weapon.push({id:'W_RIFT',owner:'rift',name:'遠域斷訊器',aff:['dmg','inc','haste','cold'],d:'距離超過18的技能命中傷害提高45%；10以內降低20%。只由斷訊碎片鍛造。'});
LEGENDS.ring.push({id:'R_RIFT',owner:'rift',name:'閉環殘響',aff:['life','haste','crit','cold'],d:'擊殺時所有技能剩餘冷卻減少0.6秒，每秒至多一次。只由斷訊碎片鍛造。'});
LEGENDS.offhand.push({id:'O_TOWER',owner:'tower',name:'階層屏障',aff:['armor','life','haste','cold'],d:'生命高於80%時受到傷害降低15%；生命低於35%時技能命中傷害提高30%。以3階層鎖片鍛造。'});
LEGENDS.ring.push({id:'R_SEASON',owner:'season',name:'午夜廣播器',aff:['crit','inc','haste','light'],d:'對閃電標記目標技能命中傷害提高35%；未標記目標降低15%。以3頻段結晶鍛造。'});
const LEGEND_BY = {}; for (const sl in LEGENDS) for (const L of LEGENDS[sl]) LEGEND_BY[L.id] = L;

const SKILLS = {
  FIRE:  { n:'灼熱電池', lvl:1,  cd:2.6, mult:2.6, el:'fire',  col:'#ff7a2a', tg:1.4, d:'丟出過熱的電池，命中時爆炸並輕微擊退' },
  FROST: { n:'冷氣爆發', lvl:5,  cd:4.2, mult:1.9, el:'cold',  col:'#7fd3ff', tg:1.8, d:'冷風傷害敵人並凍結 1.4 秒；BOSS需累積控制，凍結後有適應期' },
  CHAIN: { n:'紅外線連鎖', lvl:10, cd:3.2, mult:2.3, el:'light', col:'#ffe45c', tg:1.7, d:'紅外線在 3 個敵人間傳送（後續每跳 70%）' },
  METEOR:{ n:'流星衛星', lvl:18, cd:8.0, mult:6.2, el:'fire',  col:'#ff4a1c', tg:1.9, d:'舊衛星從天而降，轟炸全場，落點附近敵人被震開' },
  PULSE: { n:'重低音砲', lvl:8,  cd:5.0, mult:2.2, el:'light', col:'#c28aff', tg:1.6, d:'音浪從身邊炸開，震退並傷害附近敵人' },
  MAGNET:{ n:'超強磁石',   lvl:11, cd:6.0, mult:1.5, el:'cold',  col:'#7fa8ff', tg:1.8, d:'把周圍的怪全部吸到身邊並造成傷害' },
  SPAM:  { n:'迷惑郵件',   lvl:14, cd:3.6, mult:1.1, el:'light', col:'#ffffff', tg:3.5, d:'一口氣寄出 6 封郵件，隨機砸中不同敵人' },
  FLICKER:{ n:'連拍閃擊',  lvl:12, cd:3.4, mult:1.7, el:'light', col:'#ff9ae0', tg:3.2, d:'連續閃擊3次，最後一下+50%；追擊28距離，2秒內所有回放共用最多6擊，耗盡後復原1.8秒' },
  BEAM:  { n:'雷射指示棒', lvl:16, cd:5.5, mult:4.5, el:'fire',  col:'#ff4a6a', tg:2.2, d:'射出一道貫穿全場的雷射，打中直線上所有敵人，並把他們推向兩側' },
};
/* 更新日誌：最新的放最前面。版本號 0.主要.小修：新增玩法系統就加主要，修正與打磨就加小修，1.0 留給正式版；改了遊戲就在最前面加一筆 */
const VERSION = () => CHANGELOG[0].v;
const CHANGELOG = [
  {v:'0.61.0',d:'2026-10-26',t:['切到其他分頁或視窗時，遊戲會在背後繼續運行，不再停住，回來也不會跳出離線結算（除非瀏覽器已長時間凍結分頁）。','設定新增「小視窗」：在 Chrome、Edge 等支援的瀏覽器開啟置頂縮圖視窗，顯示戰鬥畫面與等級、生命、深度、金幣，可放在螢幕角落一邊工作一邊看。','離線結算頁取消 3D 自轉標誌，回到原本的樣式。']},
  {v:'0.60.1',d:'2026-10-26',t:['修正：關閉「街區地圖」後，角色與裝備的配色會一起還原。','修正：魔物倒下時，臉部會跟著身體一起淡出。']},
  {v:'0.60.0',d:'2026-10-26',t:['魔物改成街頭雜物精怪：插頭跳豆、紙箱人、啤酒箱牛、塑膠袋飛靈、氣球炸彈、井蓋地鼠、手推車獸、延長線水母等，圖鑑與戰鬥記錄同步改名。','數值、行為與預警都不變；紙箱人、塑膠袋飛靈與氣球炸彈已換成簡化臉的新造型，電線團蛛、音箱、小靈、便當盒蟹、地鼠、路燈與射手都加上簡化臉，其餘造型會陸續更換。']},
  {v:'0.59.0',d:'2026-10-26',t:['地區改名成街區的各個角落：綠蔭公園、午後空地、白雪山路、夜市燒烤攤、霓虹商圈、車站貨運場、電台頂樓、海邊堤防、山路電塔、商場地下街、夜晚天橋、停業商場、河邊鐵工廠、港口碼頭、屋頂天線群、郊外採石場、頂樓冷氣區、雨天地下道。','無限之塔的三個主題改為停業遊樂場、冷藏倉庫與地下配電室；地圖、存檔與掉落不受影響。','水邊、山路、雪地、工業區等地形也會零星出現護欄、電線桿、盆栽、貨箱、冷氣機與販賣機，不再只有街區地圖才有生活感。','戰鬥飄字還原為原本的描邊字，取消貼紙氣泡。']},
  {v:'0.58.1',d:'2026-10-26',t:['序章與十二則地方故事換成新主線：夏日街區的街角電台突然播出一段沒人點過的旋律，雜物跟著節拍亂跑，要從電台前街一路追查回來。','小禾、阿澄等鄰居仍在，語氣改成午後街區的日常。冒險日誌開頭同步更新。','其餘群系的天空換成午後色彩層次（黃昏、薄霧、海邊、雨天），不再是一片暗。','戰鬥畫面的飄字改成貼紙氣泡：深藍底、白邊、微微歪斜，出現時有一下彈跳；只出現在戰鬥畫面內。']},
  {v:'0.58.0',d:'2026-10-26',t:['城市綠洲地圖改成一條橫貫的街道：柏油路面、中線、斑馬線、人行道與路緣，兩側是連續的店面，有遮陽棚、招牌、玻璃櫥窗與冷氣機。','街道兩側擺放販賣機、盆栽與貨箱；戰鬥範圍與路線不變。島後方多了一道高架橋，人行道變寬。設定裡新增「街區地圖」，可切換街區樣板與原版地形。','店面分成六種：雜貨、小吃、服飾、電器、咖啡麵包與藥局洗衣，各有遮陽棚樣式、像素招牌圖案與櫥窗擺設。','設定新增「倒下表現」：紅色液體或訊號碎片（彩色方塊飛散後淡去），可自行選擇。','阿街的角色與兩件裝備（修補耳機、改裝電棍）換上新的配色層次；電器、咖啡麵包與藥局洗衣店面掛上原創像素招牌。這些隨「街區地圖」一起開關。','街區地圖裡的小型魔物（原本的凝膠怪）換成新造型的「插頭跳豆」，有待機、跳躍與受擊動作；數值與行為不變。']},
  {v:'0.57.0',d:'2026-10-26',t:['地面加上緩慢移動的樹影與雲影，陰影帶藍灰色。','街區地圖新增販賣機、電線桿、護欄、貨箱、盆栽、冷氣室外機、購物袋與斑馬線，數量與大小都加大。']},
  {v:'0.56.0',d:'2026-10-26',t:['戰鬥畫面天空更明亮飽和，並加上白色雲線；森林、沙漠、雪原與霓虹夜城各有自己的天空色。','戰鬥場景改為暖白陽光加天光補色，地面色降低飽和，植物與怪物更醒目。','背包篩選「核心」改名為「傳奇」。']},
  {v:'0.55.0',d:'2026-10-26',t:['裝備詞綴分成「主機位」與「副機位」，每件最多各 3 條；詞綴由 13 種增加到 23 種，新增最大生命%、護甲%、全元素傷害、對精英與首領增傷、閃避、受傷降低、擊殺回復、金幣、經驗、掉落稀有度、移動速度','每個裝備欄位有三條系列，隱性詞綴與名稱各不相同，共 21 條系列、約 80 個新裝備名稱','改裝與追加詞綴會遵守主副機位的上限，改裝時優先換成同組詞綴','改機頁顯示每條詞綴屬於主機位或副機位及標籤，並標示裝備系列'],},
  {v:'0.54.0',d:'2026-10-26',t:['裝扮新增「身體特效」：電路光環、靜電火花、訊號波紋、像素星屑，純外觀不影響能力','血跡改為鮮紅色液體：落地後向外擴散，邊緣略深，慢慢變暗淡去','稀有裝備新增「追加詞綴」改機：打造出來的裝備多為 4 條詞綴，可以逐條追加，最多 6 條','手機面板的把手拖到最下方，放開後進入觀戰；點一下畫面回到操作台','移除標題列的「展」按鈕，改由把手控制；返回按鈕改放在標題列左側','離線結算頁加入 3D 低解像自轉標誌'],},
  {v:'0.53.6',d:'2026-10-25',t:['手機版面板：即使已自己拉過把手，往下捲內容仍會自動收起戰鬥畫面，捲回頂部恢復到你設定的高度','戰鬥畫面縮小時，倒下視窗改為精簡版並顯示在最上層，不再被分頁列蓋住','彈窗內容較長時底部顯示「更多」提示','展開按鈕現在會一併重設把手高度','手機連點兩下不再放大整個畫面','拾取規則按鈕現在會明顯標示目前選中的一項','外觀頁的部位分頁與款式分開顯示，並加上款式標題與選中標記'],},
  {v:'0.53.5',d:'2026-10-25',t:['手機版面板上方的把手可上下自由拖動，放手就停在該高度，輕點恢復自動；把手上不再有文字，標題列拿掉重複的戰場大小按鈕'],},
  {v:'0.53.4',d:'2026-10-25',t:['角色會主動走向怪群，不再遠離繞圈等怪撞過來','背包的目前配裝改為緊湊兩排，減少捲動','手機版面板往下捲時自動收起戰鬥畫面，捲回頂部恢復；面板上方新增把手可上滑展開、下滑回到戰鬥','配件選單顯示每個配件的效果，不適用的標明原因','配件規則說明改為收起','任務與目標頁改為分類進度條，只顯示數字與獎勵'],},
  {v:'0.53.3',d:'2026-10-25',t:['補給站、電路合成、城市遠征、訓練場改為圖像卡片，說明與按鈕更清楚','無限之塔畫面精簡','天賦頁工具列重新排版','點彈窗外面的空位也可關閉彈窗','修正卡匣彈窗點選技能後沒有反應','電腦版戰鬥畫面頂部多出的空位已移除','全面提高過小的文字，手機與電腦版都更易讀'],},
  {v:'0.53.2',d:'2026-10-25',t:['無限之塔畫面精簡：塔身、最高樓層、討伐進度與資源一目了然','昇華職業改用3D圖示','背包與配裝的裝備圖示放大','配件格內恢復隱約的虛線，順著線的方向流動，接通後更明顯','天賦樹手機改為單指捲動頁面，兩指拖動移動天賦盤，兩指開合縮放，不再需要「手指拖盤」按鈕','換曲時音樂慢慢淡出再淡入，不再突然切換','「直傷預估」統一顯示為 DPS','角色與怪物頭上的血條變細；我方血條為綠色，敵人為紅橙色，首領為深紅色','模式卡匣改為：點卡匣後彈出視窗，直接選要裝到哪個技能，不必先在接線板選技能','合成與超頻頁面改為圖像卡片，一眼看到合成前後的配件與花費','接線板的上一步、下一步按鈕改為粗線圖示加文字']},
  {v:'0.53.1',d:'2026-10-25',t:['模式卡匣頁加上三步說明：先點接線板上的技能晶片，再點對應卡匣裝上','修正配件上的虛線方向，改為接通後整條線的電流動畫','天賦樹手機預設改為手指捲動頁面，不再卡在天賦盤內；需要拖動天賦盤時按「手指拖盤」','斷訊裂隙進行時，戰鬥畫面整體轉為紫色','剛打開網頁時，若瀏覽器尚未允許播放，會提示點一下畫面開啟音樂']},
  {v:'0.53.0',d:'2026-10-25',t:['分頁、設定目錄與背包分頁的紅點，進入後在對應項目旁也會出現紅點，一眼找到新內容','斷訊裂隙改為自動前往接觸，不再需要按追蹤','裂隙新增專屬首領「斷訊主宰」：封閉裂隙後現身，擊敗才算完成，獎勵更豐厚','打造頁現在會顯示專屬裝備的★能力','重低音砲、灼熱電池、流星衛星、雷射指示棒命中後會擊退敵人；首領與精英只受到部分擊退','新增四十種地圖擺設，依各區域主題擺放，不再來來去去都是同幾樣','建築新增圓塔與退台樓造型，岩石輪廓更不規則，擺設多以圓柱與球面組成，減少方塊感','接線板上的輔助寶石圖示放大，線經過寶石時隱約看得見線路，接通時有電流流動','新增快捷鍵：M 開關音樂與音效，B 隱藏或顯示戰鬥畫面']},
  {v:'0.52.1',d:'2026-10-25',t:['修正手機按住起點向右拖不出線：拖線手勢不再被觸控捲動或畫面重繪取消','選技能後不再彈出預覽，改為明確顯示「已裝上」及下一步；預覽視窗也標示是否已裝上','手機上配件改為點洞選擇，不再與拖線手勢互相搶；技能清單標示「已裝上」與「點選裝上」','接通後終點不再變綠，改在格內顯示綠色剔號及技能圖示；刪除起點終點右下角的圖形；配件框改用配件自己的顏色，比起點終點低調']},
  {v:'0.52.0',d:'2026-10-25',t:['開局加入低解析3D標誌與慢速轉台，保留開始及略過故事，支援減少動態','新增三步實作引導：觀察戰鬥、比較換裝、手動接通技能，可稍後續接','手機戰場自動按頁面調整大小，簡化角色及冒險重複資訊，天賦提醒改為紅點','賽季內容集中一頁，整合裂隙、巡迴、中樞與專屬核心；裂隙期間切換紫色主題','遊戲內意見回饋已接通，直接送出並顯示單號，失敗時保留草稿','贊助頁加入Patreon入口及簡約作品介紹，自願支持不影響遊戲進度']},
  {v:'0.51.0',d:'2026-10-25',t:['新增斷訊裂隙：接觸啟動、擴張湧敵與擊殺收束，拾取專屬碎片鍛造兩款暗金核心','無限之塔加入可旋轉的即時3D塔樓、邊緣樓梯及退場演出，戰場血跡限量淡出','技能加入角色攻擊預覽、上一步與下一步，修正接線色彩及操作捲動','像素質感改三段並降低強度，手機支援手勢縮放及慢速轉台，精簡工作列與重要掉落通知']},
  {v:'0.50.0',d:'2026-10-25',t:['無限之塔加入收容監獄、零度實驗室、黑鐵機房及立體塔樓預覽；樓梯放大、登階與減少動態提示更清楚','BOSS登場加入短暫警示與生命條；新增三種大型魔物及三位塔樓BOSS','手機隱藏戰場時收回提示空間，音樂繼續、只停戰鬥音效；物品改為拾取後右下角簡短通知','點起點可選技能，按住可直接接線；箭雨、巨劍與音符改為持續分段演出','新增稜鏡斷層、低頻震盪、引力封鎖；基礎技能隨等級開放，圖紙分進階與稀有，可掉落、保底及定向兌換，舊角色技能保留']},
  {v:'0.49.1',d:'2026-10-25',t:['遊戲主介面不再建立標誌欄，保留啟動與離線等待標誌','補齊裝備與核心的預製3D縮圖，無法使用即時縮圖時仍能完整顯示物件；不使用背景裝飾光環']},
  {v:'0.49.0',d:'2026-10-25',t:['新增斷訊季巡迴委託與午夜中樞終局，個人賽季紀錄及可領獎目標','更新情境配樂與數位音效；改良低面數模型、品牌動畫、打造與塔樓介面','塔樓加入樓梯及逐層攀升演出；手機回正，遊戲內移除標誌欄','任務可直接前往操作頁，裝備與核心連續捲動；新物件用紅點與稀有外框標記','新增六款電路板、接通電流與腐蝕配件；完善冰凍、點燃、中毒及狀態提示','修正遠鏡血條，隱藏戰場同步暫停聲音；可獨立關閉晃動及減少特效']},
  {v:'0.48.0',d:'2026-10-24',t:['新增召喚蜂群、大型護衛、箭雨、巨劍與音波，並以共享熱量限制閃現連擊；死亡及腐化結果可查閱細節','新增六款主動機件與六款條件式配件，手動組裝更多距離、異常與生命流派','背包加入篩選分解與收益預覽，保護穿著、構築引用、鎖定及特殊物品；重排七部位裝備架','序章三頁加入不同場景，個人手機改等距取景，像素質感增加即時樣本與分級差異','新增工業地區與六種魔物，改善裝備及功能圖示辨識，編年史加入頁籤圖示']},
  {v:'0.47.0',d:'2026-10-24',t:[
    '修正快速拖曳接線漏格及觸控捕獲問題，沿實際指標軌跡接線，取消可還原原配置',
    '共用視窗改用右上角關閉按鈕，子頁返回父頁，確認視窗保留取消與資源保護',
    '角色總覽移除大型展示舞台，原角色列表頭像框內改為動態3D頭像，緩慢自轉及待機',
    '十二條昇華各新增三條雙節點分支，共72個天賦，最多四點，具前置、取捨、退點與完整構築觀摩',
    '職業簡稱為戰士、樂師、獵手、寵機師；一般天賦最多24點，預設顯示全貌，舊有超額配點保留並提供轉換',
    '接線板固定放大，邊緣拖線可平移，機件拖出盤面收回；六對起終點使用不同顏色與形狀',
    '換上全新品牌標誌，啟動及離線等待共用呈現；職業機制、裝備詞綴、故事與成就改用視覺化閱讀'
  ]},
  {v:'0.46.0',d:'2026-10-24',t:[
    '技能只有從對應電源逐格接通終點才生效；寶石只可放同色洞，階級耗電與每技能三枚配件限制帶來組裝取捨',
    '冒險可獲得3×3、4×4、6×6與8×8電路板，提供不同方向及終點配置；可手動換板並保留各板配置',
    '四職業各有三條昇華，職業創立後固定；玩家自訂名稱，最多保存十二個獨立角色',
    '排行榜依職業分類，構築詳情展示昇華、板型與完整接線；角色頁恢復常駐3D展示，緩慢自轉並保留待機動作',
    '移除自動穿裝、自動裝技能與自動接線；新裝備及新電路板一律由玩家決定如何使用'
  ]},
  {v:'0.45.0',d:'2026-10-24',t:[
    '天賦盤放大節點與效果，合法節點點一下直接加點，保留退點與路徑限制',
    '技能與配件可拖動、交換或拖至收回區，新增點選移動及復原',
    '新冒險先播放短篇電台序章，再選擇起始角色；已有存檔直接續玩',
    '精簡角色、背包、冒險與戰鬥分析入口，補齊共用互動回饋',
    '掉落物本體慢慢吸向角色，抵達後入袋；構築分享補齊七部位、天賦與可查看的接線盤'
  ]},
  {v:'0.44.0',d:'2026-10-24',t:[
    '技能頁重整為深藍訊號組裝台，精簡提示與接線標示，保留分級操作及原有接線玩法',
    '打造頁改為目標裝備、詞綴、工序與成本的整備工作區，保留鎖定、升階與腐化確認',
    '設定目錄改為圖像網格，畫面與戰鬥控制使用一致的裝置外殼',
    '裝備原貌、武器外觀、技能及配件補上 3D 模型縮圖；四種武器恢復不同輪廓，欠模型專裝以程序式 3D 代用',
    '四位角色更名為茜 AKANE、蓮 REN、結衣 YUI、太一 TAICHI，更新稱號、台詞與身世，保留原有進度與能力',
    '統一魔物、BOSS、討伐與會心等用語，更新技能名稱、歸來問候及力盡提示'
  ]},
  {v:'0.43.0',d:'2026-10-24',t:[
    '角色頁重整為身份、重要讀數、防禦摘要與分類能力表，角色展示可自行展開',
    '裝備擴充為頭部、身體、手部、飾品、鞋子、武器與副手七類，舊收藏及構築自動轉換；裝扮仍為三類',
    '背包新增七欄配裝與密集物品網格，點選裝備可並排比較目前穿著及能力差異',
    '天賦盤可平移、縮放與搜尋；先查看效果及能力預估，再確認分配或退回點數',
    '新增隱藏戰鬥畫面設定，掛機模擬照常進行；修正掉落物移除後的資源回收'
  ]},
  { v:'0.42.1', d:'2026-10-24', t:['設定 → 畫面與觀戰 新增「戰鬥畫面：顯示／隱藏」：隱藏後停止繪製 3D 戰場，戰鬥與收益照常進行，適合長時間掛機或電腦較慢時使用','修正長時間開著遊戲會愈來愈卡：掉落物消失後佔用的繪圖資源現在會釋放'] },
  { v:'0.42.0', d:'2026-10-24', t:[
    '三色接線板整合：10×10 配置、拖曳電纜、同色配件加成與一鍵設好，舊構築自動遷移',
    '四角色封面舞台與裝扮共用 3D 預覽，加入選角預覽、旋轉、試穿及清楚的能力摘要',
    '加入二十款角色專裝收藏與獨立稀有掉落，其中十六款使用專屬模型；四款待補模型清楚標示',
    '專裝同步呈現在戰場、角色舞台及收藏，保留倉庫、裝扮與原有存檔'
  ] },
  { v:'0.41.7', d:'2026-10-23', t:['撿取範圍放遠；掉落物改成慢慢飛向角色，距離愈遠飛得愈久，收益結算不變'] },
  { v:'0.41.6', d:'2026-10-23', t:['技能頁難度循序漸進：Lv1–3 只看到一個終點，電線自動接好，沒有色塊和工具；Lv4 起解鎖色塊與配件擺放；Lv9 起顯示完整的多終點接線玩法','說明文字會提示下一個終點在幾級解鎖'] },
  { v:'0.41.5', d:'2026-10-23', t:['接線板操作簡化：點終點直接跳出技能選單，選了就裝上並自動接好電線；點電線上的色塊直接跳出配件選單，選了就放上去；點已放的配件可以收回','修正終點格的文字與標籤重疊'] },
  { v:'0.41.4', d:'2026-10-23', t:['接線板改成和遊戲一致的深藍紫窗口色：深藍底、凹下去的格子，電線與起點、終點用亮色，主體和背景一眼分得開','裝了技能的終點仍保留顏色：粗色框、顏色標籤和底部色條；選取改成白色外框，不再和黃色提示閃光混淆','電線經過的空配件位會在線上留一個帶色環的小孔，看得出這格還能放配件'] },
  { v:'0.41.3', d:'2026-10-23', t:['接線板可以直接按住起點，拉到終點就接好：不用先選插槽，沒裝技能的插槽會自動補上技能，重新拉會取代舊線','接線板格子之間留出空隙，畫面不再擠在一起'] },
  { v:'0.41.2', d:'2026-10-23', t:['接線板的電線改成一條連續的粗電纜，帶高光；沿路的配件襯墊改成低調的淡色小圓點，畫面焦點放在電線、起點與終點','接線板起點（電源）與終點（技能插槽）都直接標上文字，一眼看得出線從哪裡接到哪裡'] },
  { v:'0.41.1', d:'2026-10-23', t:['技能頁新手引導重做：開頭一句話講明接線板是什麼，每一步只講一件事，並讓下一步要點的格子閃爍提示','第 2、3 步多了「一鍵幫我設好」按鈕，不想研究的人一按就完成','接線板下方加了圖例：電源、技能插槽、色塊各代表什麼'] },
  { v:'0.41.0', d:'2026-10-23', t:['技能接線板全面改版：電源與插槽有紅、藍、綠三色，每個插槽只能接同色電源，線愈繞愈能經過更多色塊','配件只能放在線經過的色塊襯墊上；和線同色的襯墊效果 ×2，異色 ×1，不再限制線長與配件數量','拖線更順：點電源或插槽就會沿路補線，也可以直接把配件拖到襯墊上，或按「自動配置」一鍵擺放','接線板換上天藍 Y2K 風格：粗黑邊、發光色塊與彩色電路線','舊存檔會自動轉換：技能保留並自動接線，配件重新放到襯墊上，戰力可能略有變動'] },
  { v:'0.40.2',d:'2026-10-23',t:['角色總覽改成街頭角色封面：四人獨立背景、大型 3D 預覽、三件隨身裝備與能力摘要','總覽與裝扮共用展示台，選角先預覽再使用；試穿、取消與金幣不足有清楚提示','加入角色旋轉按鈕、實際外觀縮圖及預覽失敗重試，保留原藍紫窗口與角色待機']},
  { v:'0.40.1', d:'2026-10-23', t:['自動換裝現在可以換掉暗金核心：新裝備戰力高出 35% 才會換，核心仍留在收藏，可一鍵換回','各頁小標題（新手任務、目標、圖鑑分類）文字改成白色，不再暗沉難讀','還原按鈕與輸入欄的斜面藍紫風格，不再使用扁平白色按鈕'] },
  { v:'0.40.0', d:'2026-10-23', t:['新增「排行榜」（更多 → 排行榜），先放了幾筆標示「示範」的假排名讓你看版面：自動記下最深層數與無限之塔最高層，連同當時的完整構築','可以隨時記錄目前構築，點開能看到技能、配件接線、裝備與遺物','構築可以複製成構築碼傳給朋友，貼上就能觀摩對方怎麼砌','目前只存在這台瀏覽器，全球榜之後開放'] },
  { v:'0.39.25', d:'2026-10-23', t:['角色頁的小手機改成等距視角的低解像度 3D 模型，慢速自轉，不再有誇張的透視'] },
  { v:'0.39.24', d:'2026-10-23', t:['角色頁只保留一個「角色與裝扮」入口','修正：還沒拾取的掉落物不再飄到角色頭上打轉，會留在原地等拾取','「更多」選單的分組與入口卡片改成藍紫窗口風：標題列、淡紫卡片與硬陰影','編年史入口改為檸檬黃卡片'] },
  { v:'0.39.23', d:'2026-10-23', t:['技能頁：配件可以直接從庫存拖到接線板格子，技能可以拖到右邊插槽（手機長按後拖曳）','強化格改成低調的淡灰「×1.4」字樣，不再是醒目的金色圓點'] },
  { v:'0.39.22', d:'2026-10-23', t:['背包的裝備與傳奇核心可以按「DPS 由高至低」排序','戰鬥畫面大小簡化為大、小、收三段'] },
  { v:'0.39.21', d:'2026-10-23', t:['設定頁每組選項改成小視窗：標題列、像素滑桿與檸檬黃數值標籤，與其他頁面風格一致'] },
  { v:'0.39.20', d:'2026-10-23', t:['各頁統一成藍紫窗口風：區塊標題變標題列、摺疊列變小視窗列','戰鬥狀態等數據改成黑底資料欄，更新日誌每個版本一張卡片','背包、地圖等空狀態改成虛線框提示卡'] },
  { v:'0.39.19', d:'2026-10-23', t:['角色選擇改成復古選角視窗：每位角色有 3D 頭像框、名字欄與職業，下方加上黑底資料欄','選中的角色以藍色高亮框標示「使用中」'] },
  { v:'0.39.18', d:'2026-10-23', t:['介面配色還原成藍紫窗口風格'] },
  { v:'0.39.17', d:'2026-10-23', t:['冒險頁「可用地圖」改成方塊卡網格：放大 3D 小島、同款地圖合併顯示數量、等級與詞綴一眼看到','大型守關者的手腳會擺動，近戰怪物戰鬥中偶爾舉臂嘶吼','範圍衝擊的碎片不再從角色身上冒出來繞圈','角色專屬技、太陽遺物與回聲也受施放距離限制，不再打到畫面另一端','目標頁說明按鈕移到標題旁'] },
  { v:'0.39.16',d:'2026-10-23',t:['角色與裝扮預覽加入四位角色各自的待機小動作','角色頁小手機改成緩慢單向自轉']},
  { v:'0.39.15',d:'2026-10-23',t:['巨像、螃蟹、蜘蛛、鼹鼠的手腳可以各自擺動：巨像走路擺臂、出手舉臂砸下，螃蟹鉗子開闔、八腳橫行，蜘蛛八腳輪流點地，鼹鼠雙爪挖掘']},
  { v:'0.39.14',d:'2026-10-23',t:['技能出手範圍再縮短，只打得到主角身邊的怪；撿東西也要走到更近才會撿起','修正少數怪物倒下時可能出現的畫面錯誤']},
  { v:'0.39.13',d:'2026-10-23',t:['怪物移動與待機更有個性：螃蟹橫行、蜘蛛急竄、喇叭隨節拍脹縮、鬼火旋轉飄動、鼹鼠起伏鑽行、巨像沉重踏步','技能命中特效依元素區分：火焰迸出火星、冰霜落下冰晶、閃電放出電弧']},
  { v:'0.39.12',d:'2026-10-23',t:['怪物動作增加：出場時彈出、攻擊前先蹲低蓄力、被打到會往後退；史萊姆被擊倒時攤平、無人機旋轉墜落','過熱電池丟出時拖著火星']},
  { v:'0.39.11',d:'2026-10-23',t:['技能只會打到主角附近的怪，太遠的怪要等牠們走近才會被打（以前部分範圍技能可以隔著整張地圖打到）','主角出招時不再冒出圍著頭轉的彩色光柱，只保留腳下的光圈']},
  { v:'0.39.10',d:'2026-10-23',t:['目標頁每個目標加上 3D 小旗與獎盃，成就頁改成 3D 獎章（未達成顯示灰色），圖鑑的元素反應加上各色 3D 元素球']},
  { v:'0.39.9',d:'2026-10-23',t:['設定頁每個入口加上 3D 小圖示（齒輪、存檔片、旗子、獎盃、圖鑑書、捲軸、對話框、星星）','角色頁的穿著裝備與打造頁的裝備分頁圖示放大']},
  { v:'0.39.8',d:'2026-10-23',t:['「死亡」視窗改成與遊戲視窗一致的藍紫標題列、灰藍底和像素進度條，去掉粉紅漸層；仍不擋操作，倒數結束自動復活']},
  { v:'0.39.7',d:'2026-10-23',t:['冒險頁的城市遠征、無限之塔、訓練場加上 3D 小圖：三區路線是各自的 3D 場景卡，無限之塔有依紀錄增高的 3D 塔，訓練場是單體與群體 3D 假人','同時精簡說明文字，次要規則收進摺疊區']},
  { v:'0.39.6',d:'2026-10-23',t:['冒險頁地圖卡的小島縮圖改成 3D 低面數小島，依地貌配色（含樹木、傳送門），並維持像素顆粒感']},
  { v:'0.39.5',d:'2026-10-23',t:['技能棋盤上的文字提高對比並放大：技能插槽改深色底淺色字，空槽與鎖定槽、電源列、配件與晶片字級加大']},
  { v:'0.39.4',d:'2026-10-23',t:['桌面版戰鬥畫面上方的等級、生命與經驗條、深度、金幣與 DPS 整體放大，更好讀；手機版不變']},
  { v:'0.39.3',d:'2026-10-23',t:['技能頁改成三步引導（裝技能、拉線、放配件），目前該做哪一步會高亮；進階說明收進摺疊區，格子改標「剩 N 個」','桌面版技能棋盤放大，並加上像素顆粒與掃描線質感','傳奇核心改為 3D 圖示；裝備詳情卡的圖示放大']},
  { v:'0.39.2',d:'2026-10-23',t:['倒下時戰場上方改顯示系統視窗風的大字「死亡」，附復活倒數與進度條；不擋操作、不需要點擊，倒數結束自動復活續打','移除倒下時的黑底對話框，避免重複']},
  { v:'0.39.1',d:'2026-10-23',t:['角色手機螢幕改成顯示畫面外看不到的資訊：歷年戰績、收藏進度（成就、傳奇核心、遺物、電台手記、裝扮），與外面重複的裝備、屬性、技能、連結頁已移除','新增「全息」頁：目前武器放在旋轉的全息台座上掃描，帶低解析像素 3D 質感']},
  { v:'0.39.0',d:'2026-10-23',t:['3D 畫質整體調低：高畫質改為原本的低畫質等級，中與低畫質再更低，畫面統一帶像素顆粒感','地圖預覽、3D 手機與角色預覽一起套用低畫質風格','裝備與武器圖示改成 3D 模型渲染的小圖，依裝備階級與稀有度換造型和顏色','下方工作列加入開始選單、音效開關與可點擊的時鐘，並藏了幾個小彩蛋','瀏覽器分頁加上遊戲圖示']},
  { v:'0.38.5',d:'2026-10-23',t:['角色頁右側的手機入口回歸簡約：一支輕輕自轉的 3D 手機放在銀灰凹槽底框裡']},
  { v:'0.38.4',d:'2026-10-23',t:['手機螢幕改成銀灰掌機質感：果凍圓鈕、粉紅寶石愛心、液晶綠跑馬燈與底部選單列']},
  { v:'0.38.3',d:'2026-10-23',t:['角色頁的手機入口改成簡潔的小 3D 手機，放在角色資訊卡右側的空位，點一下就開機']},
  { v:'0.38.2',d:'2026-10-23',t:['角色手機改用真正的 3D 模型：側面、邊角與按鍵都有立體厚度，可以自由轉動並翻到背面','螢幕與按鍵會跟著模型一起透視變形，放大螢幕時鏡頭會推近']},
  { v:'0.38.1',d:'2026-10-23',t:['角色頁的手機入口改成會轉動的 3D 小手機，加上舊網頁風的 NEW! 星芒與彩虹字','角色手機新增專屬音效：撥接上網握手聲、按鍵音、開機與關機旋律；雙擊手機可以翻到背面','修正手機側面在側轉時一格一格的破圖，轉動角度改為有限制']},
  { v:'0.38.0',d:'2026-10-23',t:['角色頁新增「角色手機」：點開後全屏出現可拖曳轉動的 3D 手機，開機動畫立體登場，螢幕以懷舊網頁風顯示名片、裝備、能力值與技能','手機按鍵都能按：方向鍵換頁與捲動，中間鍵或 ✦ 放大螢幕，返回鍵關閉；「連結」頁可直接前往天賦盤、背包、技能等頁面']},
  { v:'0.37.0',d:'2026-10-23',t:['冒險頁的地圖卡加上等距島嶼縮圖，一眼看出地圖主題','新增「補給站」（打造頁）：用金幣開補給箱（隨機魔法／稀有裝備，可一次開十個）','金幣可擴建背包容量（每次 +20，最多 5 次），也可延長離線收益上限（基礎 6 小時，最多 12 小時）']},
  { v:'0.36.0',d:'2026-10-23',t:['主選單整合為六個分頁：角色、背包、技能、打造、冒險、設定','新增獨立「背包」分頁，裝備格與詳情卡集中在同一處；天賦盤改放在角色頁的「屬性｜天賦」切換','電路合成與接線配件商店移到「打造」；目標、成就、圖鑑、存檔、更新日誌等收進「設定」','手機版分頁列移到戰鬥畫面正下方，單手更好點']},
  { v:'0.35.6',d:'2026-10-23',t:['新增滑鼠提示：桌機把游標移到接線板格子、配件、技能、按鈕、裝備格、地圖卡、改機動作與畫面上方的金幣、DPS 時，會顯示說明；觸控裝置維持點選查看詳情']},
  { v:'0.35.5',d:'2026-10-23',t:['新存檔不再把全部起始配件標成 NEW；只有之後新取得的才會提示','技能頁底部說明改為提示文字，畫面更乾淨']},
  { v:'0.35.4',d:'2026-10-23',t:['倉庫改為「格子加詳情卡」：點裝備後詳情直接展開在格子上方，換上、鎖定、回收一排三鍵，不再跳出視窗','冒險頁地圖庫存改為橫幅卡：依地貌配色，顯示名稱、等級與挑戰詞綴','冒險頁進度行更短']},
  { v:'0.35.3',d:'2026-10-23',t:['打造頁精簡：改機操作只留一行說明與含費用的按鈕，缺料原因只在不能執行時顯示','倉庫與冒險頁再刪除重複的提示句']},
  { v:'0.35.2',d:'2026-10-23',t:['介面精簡：移除各頁重複說明與多餘提示（技能頁、角色頁、成長、冒險、構築），詳細說明收進各頁的「？」或長按提示','技能頁接線板縮小，桌機與手機一個畫面就能同時看到接線板與配件庫存；配件庫存改為四欄小卡，合成與超頻收進可展開的區塊','構築列只留構築編號與儲存、出手策略，冒險頁與成長頁文字更短']},
  { v:'0.35.1',d:'2026-10-23',t:['推進連敗保護：連續兩次輸給守關者，就先停止挑戰、在原地刷怪累積實力；等級提升 2 級或 DPS 提升 15% 後自動再挑戰，掛機不再一直循環倒下']},
  { v:'0.35.0',d:'2026-10-23',t:['戰鬥畫面新增「收起」：大、中、小、收四段，收起後只留一條狀態列，慢慢在下面處理技能與裝備；設定可選「戰鬥畫面」自動、大、中、小或收起','自動收納（預設開啟）：手機上打開技能頁時自動收起戰鬥畫面，打造、倉庫與設定自動縮小；手動切換後以你的選擇為準','天賦盤改為像素點陣風格：方塊節點、像素星標關鍵點，可選節點閃爍提示','離線收益調整：前 10 分鐘照常精確結算，之後收益遞減（前 2 小時約 5 成、再 2 小時約 3 成、之後約 1.5 成），深度推進改為每小時最多一層，避免隔夜回來收益過高','技能頁重新排序：接線板與 DPS 置頂，方便調整配搭時即時查看']},
  { v:'0.34.0',d:'2026-10-23',t:['配件新增三個階級：Ⅰ、Ⅱ、Ⅲ，強度分別是 ×1、×1.5、×2；板上的 LED 顏色代表階級，綠色一般、黃色 Ⅱ、粉紅 Ⅲ','等級 8 解鎖「合成」：三個同款同階配件消耗零件合成一個高階配件；等級 12 解鎖「超頻賭一把」：消耗電路點數和一個低階配件，50% 升階、35% 沒變、15% 燒毀','自動配置會優先放上高階配件；高階配件隨存檔保存，構築切換時也會一併檢查持有數量']},
  { v:'0.33.1',d:'2026-10-23',t:['離線結算改為「精確模擬前 10 分鐘，其餘按該段收益率放大」，開啟遊戲只需幾秒；經驗、金幣、掉落與深度進度仍照離線規則（經驗 75%、掉落 25%）結算']},
  { v:'0.33.0',d:'2026-10-23',t:['技能頁改為電路板接線：左邊是電源，右邊是技能插槽，自己從電源拉一條線到晶片，沿線貼上的 Y2K 配件才會強化該技能','線走直角、有流動光點；配件依線上順序生效，同款貼在一起 ×1.2，踩中增幅格再 ×1.4，壞軌不能走也不能放','技能是大晶片、配件是貼片元件，出手時晶片閃燈；升級會「焊上」新插槽，等級 1 只有一顆晶片','提供自動接線、復原與「全部清空」開關，拖曳吸附有音效；舊存檔的技能、改機模式與配件自動轉換，轉換後傷害不會變低，放不下的配件收回背包']},
  {v:'0.32.1',d:'2026-10-23',t:['裝扮暫時只開放武器、副手與飾品，保留舊外觀與已擁有資料；外觀不影響能力','3D 畫質提供自動、低、中、高，手機預設中畫質、桌機高畫質，戰場與角色預覽共用設定','移除每次換圖的故事彈窗與停戰；改用短暫視覺掃場，手記由玩家自行打開閱讀','保留像素字體，調整手機與桌機的字級層次、HUD 高度及物品格密度']},
  { v:'0.32.0',d:'2026-10-23',t:['暫停升級改裝卡與首領遺物選擇；既有加成及舊待選資料保留，技能拼圖與模式卡匣照常使用','護甲減傷上限調整至 60%；吸血、回復輔助與擊殺回復共用每秒 2.5% 最大生命額度，受傷後自然回復降低，藥水改為每 20 秒回復 25% 生命','自然不規則島岸與寬闊地景，加入大型及巨型地圖、跟隨／全景鏡頭；大樹、建築、小草與電單車以不同尺度組成，行走會繞過大型物件','保留 Cubic 11 像素字體，加大字級及行距；桌機戰鬥浮字與介面依畫面尺寸放大，手機保留較精簡比例','更多頁新增意見回饋，預覽後前往 GitHub 提交，亦可下載回饋文字；不附上遊戲存檔']} ,
  { v:'0.31.0',d:'2026-10-22',t:['倉庫改為每頁 36 格的裝備網格，一般裝備與傳奇核心可在同一入口分類查看；點選格子比較、換裝與管理，保留回收保護','角色裝備、核心收藏、技能、輔助配件、卡匣與地圖採緊湊圖示格；完整屬性點選查看，未持有或未解鎖機件也能查看說明','設定改為兩欄控制格，直接顯示目前模式、拾取門檻及音效；選項展開跨欄，支援鍵盤關閉與焦點返回，手機倉庫及設定預設縮小戰場，保留自訂大小']},
  { v:'0.30.0',d:'2026-10-22',t:['三套構築新增角色及實際裝備記憶，切換自動保存；引用裝備受回收保護，缺件先確認，亦可解除閒置配置的裝備記憶','校準改為只重洗同階數值；新增指定詞綴逐階提升，保留種類及數值，顯示區間、等級門檻及材料成本','重複傳奇核心提供殘晶，可搭配來源區碎片與零件重構物品等級；保留特殊效果與詞綴階級，推進城市提高上限，確認前不消耗材料']},
  { v:'0.29.1',d:'2026-10-22',t:['修正網站打包時的版本識別，確保公開版本檔與遊戲更新日誌一致']},
  {v:'0.29.0',d:'2026-10-22',t:['天賦改為最多 36 點及兩個韌體核心；六種韌體各有條件、收益及代價。舊天賦保留快照，可預覽、免費轉換及還原，末端節點可免費退回','新增三條城市遠征：高速訊號網、回充護盾迴廊及可破除重裝的電源區；三個路段、兩次當局選路及收尾首領，撤離保留已完成路段碎片','區域碎片可指定合成九款傳奇核心；三區憑證開啟城市中樞，勝利保證出發時指定核心，並推進最高八階。途中狀態與出發策略可保存','離線可依出發策略完成當前遠征，失敗不重開；離線暗金掉落資格及守關者保底改與線上相同，並修正獨立拼圖傷害預估的常數引用']},
  { v:'0.28.0',d:'2026-10-22',t:['技能依就緒時間公平出手，新增均衡與連動優先策略；技能模式與冷卻共用計算，DPS（直傷預估）納入出手容量','新增冷啟動碎星、撥號放電卡匣，可用電路點數定向合成；凍結鋪墊衛星爆發，紅外線累積電荷強化雷射','首領凍結改用傷害累積與適應時窗；新增本段出手戰報及單體／群體訓練，追蹤回放、等待與連動成果']},
  { v:'0.27.1',d:'2026-10-22',t:['全介面延伸像素掌機風格：文字採用對齊格線的新字模，標題、讀數、輸入與編年史共用字體規格','血條與經驗條改成分格顯示，銀灰外殼、藍紫標題與操作按鍵改用階梯色帶及硬邊輪廓','保留原生文字、搜尋、輸入及觸控操作；新增字模於建置時預先生成，無需逐幀擷取介面']},
  { v:'0.27.0',d:'2026-10-22',t:['新增 200 格裝備倉庫：比較、手動換裝、保管鎖定與確認回收；自動換裝保留上一件裝備，滿倉規則明確顯示','裝備詞綴新增 T0 至 T4 階級；金幣、電路點數及道具落地，角色走近才拾取，待拾物隨進度保存','天賦盤擴充至 100 節點，新增三條電路路徑及流派核心；新增鎖頻、分線、備用電池與延遲緩衝配件，可用電路點數指定合成','新增六個地區、四種不同輪廓的怪物及地區首領，加入範圍攻擊預警；提高出怪頻率、中後段與首領強度','特效改用物件池，靜態裝飾合批，畫面與模擬分開排程；移除手機地圖邊緣漸變，加強技能與互動動畫，尊重減少動態設定']},
  { v:'0.26.2', d:'2026-10-22', t:['所有尺寸統一低解析度 3D 場景，再以清晰像素格放大；人物、地形、怪物、特效及裝扮預覽共用同一呈現', '高密度螢幕不再抵銷像素效果；桌機、平板、手機及全視窗觀戰保持原視野比例，文字與操作介面維持清晰'] },
  { v:'0.26.1', d:'2026-10-21', t:['全介面統一像素字體與常規字重，補齊中文字形，修正粗體黏字與混用字體', '減少角色頁重建與圖示重複資料，保留掌機材質及輕量訊號效果，改善介面操作', '離線結算期間暫停場景繪製，縮短每批計算；網站引擎改為獨立快取並顯示啟動狀態'] },
  { v:'0.26.0', d:'2026-10-21', t:['新增傳奇核心收藏：保留不同特殊效果，穿上的核心不會被自動替換，可換用收藏並切回上一件裝備', '離線結算尊重自動選卡設定；未開啟時保留改裝與遺物選擇，回來可查看或稍後處理', '修正普通地圖重複計算通關次數，完成後的重複結算不再重發獎勵'] },
  { v:'0.25.3', d:'2026-10-21', t:['介面重製為銀灰掌機外殼、藍紫液晶與立體按鍵；資料區保持簡潔，編年史與設定同步統一', '全套導覽、技能、裝備、物品與成就圖示重新繪製，採簡約像素輪廓與統一色塊；字標同步更新', '戰場整合等級、生命、經驗及 DPS；新增可調整等待時間的自動觀戰，點一下返回操作台', '全介面新增可調強度的像素色階、掃描線與訊號效果；配件與裝備圖示採像素風格，動態效果可獨立關閉', '桌機採雙欄操作台，桌機與手機共用六入口；跨尺寸切換保留目前工作', '構築庫存新增分類與生效說明；打造採選裝備、選動作流程，冒險以地貌卡顯示進度與詞綴', '構築新增機件詳情與鍵盤操作，點選即可查看效果、適用技能與連結；取消拖曳會還原機件', '手機角色選擇與編年史閱讀改善，搜尋新增結果數、清除與找不到資料的提示', '改機顯示不可執行原因與結果，腐化前會確認；地圖改以挑戰詞綴數顯示強化及取捨', '離線回來可直接查看新配件或地圖；說明視窗支援鍵盤關閉與焦點返回'] },
  { v:'0.25.2', d:'2026-10-21', t:['裝備換上全新手繪圖示：武器、外套、配件各有四種稀有度外觀，從素面灰色到金光暗金一眼分得出；撿寶提示也加上圖示'] },
  { v:'0.25.1', d:'2026-10-21', t:['編年史改為在新分頁開啟的資料庫頁面：左側分類、頂端搜尋、每類一張表，附圖示與取得狀態；瀏覽器擋住新分頁時會改用遊戲內全螢幕版'] },
  { v:'0.25.0', d:'2026-10-21', t:['新怪物：無人機（半空高速飛行）與自爆機器人（死亡時爆炸）；任何小怪都可能變成菁英（金環、體型大、血厚、賞金與必掉裝備）', '新生態：霓虹夜城與糖果樂園，各有專屬地貌、樹木與天空色彩，天空會隨生態變化', '新地圖詞綴：菁英出沒、怪潮、經驗加成', '遺物、傳奇裝備、成就都有專屬圖示，編年史新增成就分類'] },
  { v:'0.24.1', d:'2026-10-21', t:['九個技能與八種輔助配件換上專屬手繪風圖示，拼圖面板、技能列、編年史都能一眼分辨'] },
  { v:'0.24.0', d:'2026-10-21', t:['新增「編年史」：全螢幕資料頁，分類查看技能、輔助配件、模式卡匣、遺物、傳奇裝備、升級卡、元素反應、怪物、地圖詞綴、角色、裝扮與規則，可搜尋，並標示已取得或未取得（按鈕在畫面左側與「更多」分頁）', '打擊感強化：暴擊與守關者擊殺有瞬間停頓，爆擊時出現白色衝擊環，被打的怪物會脹大一下，受到重擊時畫面震動更明顯'] },
  { v:'0.23.2', d:'2026-10-21', t:['角色專屬技能平衡：阿街與傳呼仔的傷害大幅提高，小冷的冰凍縮短為 1.4 秒'] },
  { v:'0.23.1', d:'2026-10-21', t:['裝扮新增上衣款式：連帽衫、棒球外套、長圍巾，顏色照原本的上衣色'] },
  { v:'0.23.0', d:'2026-10-21', t:['裝扮新增三類 3D 零件：帽子（鴨舌帽、毛帽、兔耳、天線髮箍）、眼鏡（圓框、護目鏡、墨鏡）、背飾（雙肩包、披風、電池翅膀）', '角色頁的裝扮分類新增帽子、眼鏡、背飾，預覽可看前後'] },
  { v:'0.22.0', d:'2026-10-21', t:['每個角色有專屬技能，自動施放、不佔拼圖格：阿街的街頭衝撞、小冷的冷氣護罩、傳呼仔的連環 Call、電波仔的訊號塔'] },
  { v:'0.21.2', d:'2026-10-21', t:['圖鑑新增「怪物」與「輔助配件」兩區，遇到、取得才會解鎖', '打贏守關者有機會掉落付費裝扮（髮色、衣褲鞋色等），不用再只靠金幣購買'] },
  { v:'0.21.1', d:'2026-10-21', t:['資訊精簡：拼圖頁、打造頁、冒險頁頂端的說明文字收進「?」，畫面只留下要操作的東西', '清單方塊改成液晶讀數的凹陷外觀，天賦圖與按鈕磚統一成同一套亮面質感；角色狀態只留生命、DPS、暴擊減傷、進度；裝備卡最多顯示三行詞綴；輔助配件卡不再重複寫效果（點按看提示）；拿掉拼圖頁底下每個技能的逐行數據'] },
  { v:'0.21.0', d:'2026-10-21', t:['戰鬥浮島可以縮放與旋轉：手機單指左右拖曳轉動，雙指捏合縮放並可扭轉；電腦用滾輪縮放、拖曳或 Q、E 鍵轉動，雙擊還原', '技能拼圖新增「共鳴」：整列塞滿全隊傷害 +12%，整欄塞滿暴擊率 +5%，元素相同的兩個技能緊貼各自傷害 +15%', '新增輔助配件「散熱片」（傷害 +20%、冷卻 -15%）與「水晶振盪」（傷害 +10%、暴擊率 +15%）', '拼圖格改為凹槽加立體磁磚的外觀'] },
  { v:'0.20.1', d:'2026-10-21', t:['撿寶提示精簡成只有一行名稱，用稀有度顏色標邊，停留時間縮短', '拿掉戰鬥畫面上的玻璃反光與掃描線效果，畫面恢復清爽', '面板與視窗的立體陰影、格線底紋減輕，介面更簡潔'] },
  { v:'0.20.0', d:'2026-10-21', t:['技能拼圖面板擴大為 6×6，隨等級逐列解鎖；一個技能連到三個以上輔助配件會「滿載」，每多一個傷害 +8%', '施放技能時角色腳下展開該技能顏色的光環與光柱，大招另外彈出技能名稱；命中時迸出同色碎片，閃打連拍多了殘影', '等級與生命資訊改為戰鬥畫面頂端一條半透明液晶條，不再擋住角色', '撿到裝備的提示縮成畫面側邊的小列表，不再擋畫面', '介面改為復古擬真風：亮面膠質按鈕、金屬邊框視窗、液晶格線、玻璃反光的螢幕外框'] },
  { v:'0.19.1', d:'2026-10-21', t:['打造頁上方新增「拾取規則」列：全部撿、魔法以上、稀有以上，低於規則的掉落自動拆成零件', '進行中的地圖與塔：詞綴合併成一份清單（風險紅、獎勵綠），底下四個彙總數字；詞綴同時以淡字鋪在戰鬥畫面上', '新取得的輔助配件在拼圖頁標上 NEW；主要按鈕（挑戰、進入、開始測量）改為橘紅色，區塊小標加上星芒；旋轉與移除列固定在拼圖下方'] },
  { v:'0.19.0', d:'2026-10-21', t:['手機直式版面重做：上方是戰鬥畫面、下方是面板，整個畫面固定不捲動，只有面板內容會捲動', '戰鬥畫面疊上平視資訊：左上等級與生命、右上深度金幣與傷害，左下「下一步」提示，右下在地圖或塔中出現「離開」按鈕', '面板上方新增視窗標題列：顯示目前頁面，有說明鈕，並可切換戰鬥畫面大小（大、中、小）；拼圖與改機頁自動縮小戰鬥畫面讓出空間', '冒險分頁 5 級開放，未開放的分頁顯示鎖頭；360 寬的小螢幕也不會橫向捲動'] },
  { v:'0.18.1', d:'2026-10-21', t:['扮工模式改用鍵盤的 ` 鍵進入與離開', '介面檢查修正：手機戰鬥畫面縮短，讓下方面板多露出一截；改機頁不再重複標題；地圖卡只顯示有用的獎勵標籤'] },
  { v:'0.18.1', d:'2026-10-21', t:['扮工模式改用鍵盤的 ` 鍵進入與離開', '介面檢查修正：手機戰鬥畫面縮短，讓下方面板多露出一截；改機頁不再重複標題；地圖卡只顯示有用的獎勵標籤'] },
  { v:'0.18.0', d:'2026-10-21', t:['新增技能「閃打連拍」（12 級）：像閃光燈一樣連續閃到敵人身邊痛擊，最後一下加成；三張變體卡匣：閃光風暴、收割閃打、殘影拖尾', '新增扮工模式：整個畫面換成命令行介面，只顯示重要訊息與掉寶，可輸入 help、status、loot、equip 等指令；按鍵盤左上角的 ` 鍵進入與離開（Esc 或輸入 exit 也可離開）'] },
  { v:'0.17.0', d:'2026-10-21', t:['新手難度重整：一開始每次只來一兩隻怪，怪的數量與強度隨等級慢慢增加；開局怪物更硬、更痛，防禦與閃避收緊，中前期會有血量危機', '打到稀有以上的寶物時，畫面上方彈出寶物卡，顯示名稱、詞綴與傳奇效果；暗金會震動閃光並停留更久', '角色與怪物走位更誇張：角色滿島跑動、閃避時真的滑出去，怪物左右蛇行、挨打會側閃', '傷害數字與飄字改用像素字體；介面按鈕與標籤改為階梯切角的低像素造型', '效能優化：畫面更新改跟螢幕同步，面板與血條沒變化時不重繪'] },
  { v:'0.16.0', d:'2026-10-20', t:['手機版分頁列移到畫面最下面（拇指好按），分成角色、戰鬥、打造、成長、冒險、更多六格，圖示加大，選中的分頁往上凸起，未開放的顯示鎖頭並說明幾級開放', '戰鬥頁頂端新增固定的傷害條：顯示目前傷害與各技能占比，放置機件時同步顯示變化', '傷害數字改成：同一隻怪 0.3 秒內合併、畫面最多 12 個、優先顯示暴擊與大傷害，存檔頁可切換全部、精簡、關閉'] },
  { v:'0.15.0', d:'2026-10-20', t:['拼圖頁拖曳機件時，即時顯示放在這個位置傷害會變多少', '分頁加上紅點：有新配件或卡匣、可改機的零件、新達成的目標時提醒，打開該頁就消失', '拼圖、改機、冒險、目標頁加上「?」說明視窗', '地圖卡新增危險度、戰利品、金幣、稀有度彙總標籤', '換上新裝備時，日誌顯示傷害增減百分比', '傷害數字在大量怪物時自動節流，只保留暴擊與較大的數字，畫面更清爽'] },
  { v:'0.14.0', d:'2026-10-20', t:['桌機分頁整理成角色、戰鬥、打造、成長、冒險、收藏、選單 7 個入口：目標、成就、圖鑑收進「收藏」，日誌與存檔收進「選單」', '畫面上方新增「下一步」提示：依序提醒進行中的任務、可分配的天賦、可改機的零件，點一下直接開啟對應頁面'] },
  { v:'0.13.0', d:'2026-10-20', t:['地圖頁新增訓練場：5 隻打不死也不還手的假人，量 30 秒傷害，列出每秒傷害與各技能、普通攻擊、燃燒的佔比，方便比較不同搭配'] },
  { v:'0.12.0', d:'2026-10-20', t:['新增構築 1 至 3：技能拼圖與天賦各存三套，在技能頁與天賦盤頁上方一鍵切換，免費、不用重點天賦；裝備與配件庫存共用，切換時超出庫存的配件會自動拿下'] },
  { v:'0.11.0', d:'2026-10-20', t:['新增新手任務鏈：10 個任務一次一個，完成給金幣、零件、輔助與卡匣，在目標頁最上面', '系統逐步開放：6 級開放天賦盤，10 級開放改機，避免一開始被所有東西淹沒'] },
  { v:'0.10.0', d:'2026-10-20', t:['新增無限之塔：深度 8 解鎖，在地圖頁挑戰。每層殺滿怪就上樓，每 10 層是守關者層，打贏多一條規則、一件遺物和一件戰利品；死亡結束並記錄最高層數'] },
  { v:'0.9.1', d:'2026-10-20', t:['離線收益規則：離線經驗為線上 75%、掉落為 25%，暗金與暗金保底只在人在場時才算', '新增「挑戰守關者」設定：推進模式下生命低於設定值就先不開打'] },
  { v:'0.9.0', d:'2026-10-20', t:['新增改機系統：用不到的裝備會自動拆成零件，用零件對手上的裝備重新校準、改裝詞綴、升級稀有度或腐化，可鎖定一條詞綴保住它', '任何掉落都不再是垃圾'] },
  { v:'0.8.0', d:'2026-10-20', t:['新增元素反應：火焰燃燒、閃電標記，冰凍加火焰是融化、冰凍加閃電是超導、冰霜加燃燒是蒸氣、閃電標記加火焰或冰霜是過載', '版本號改為 0.主要.小修，並顯示在視窗標題列', '圖鑑新增元素反應說明'] },
  { v:'0.7.2', d:'2026-10-20', t:['整理介面：拿掉各視窗標題列上裝飾用的 ▁ ▢ ✕，桌機常駐面板不再有沒用的關閉鈕，只有彈出視窗保留一個關閉'] },
  { v:'0.7.1', d:'2026-10-20', t:['裝扮新增髮型：刺蝟頭、雙馬尾、鮑伯頭、丸子頭'] },
  { v:'0.7.0', d:'2026-10-20', t:['新增角色頁：身分證式資料卡（名字可改、生日、星座、稱號與星星）加 3D 預覽，可拖曳旋轉', '新增裝扮系統：髮色、上衣、褲子、鞋子、耳機、膚色，用金幣購買，預覽後再決定穿不穿'] },
  { v:'0.6.0', d:'2026-10-20', t:['新增遺物：每次擊敗守關者三選一，共 12 種永久效果（迷你風扇、連環炸彈、小太陽等），圖鑑可查看', '自動隨機選卡也會自動選遺物'] },
  { v:'0.5.0', d:'2026-10-20', t:['新增圖鑑：傳奇裝備、模式卡匣、技能，沒發現的顯示 ？？？', '守關者暗金保底：連續沒出暗金，下一件機率每次 +6%，最多 15 件必出'] },
  { v:'0.4.1', d:'2026-10-20', t:['左右拖曳浮島可輕微轉動視角，雙擊還原', '打擊感：暴擊與受傷會震動畫面，怪物被打會往後退，守關者落地、衛星墜落、升級有衝擊與邊緣閃光，低血量時邊緣泛紅', '字體改為像素字體 Cubic 11', '歡迎回來與升級選卡的視窗縮小並置中'] },
  { v:'0.4.0', d:'2026-10-20', t:['傳奇（暗金）裝備改版：每個欄位 3 種，共 9 種，各帶一條會改變技能行為的特效', '武器：回音光劍、碎星球棒、萬用遙控器', '外套：不滅羽絨、反光風褸、電波外套', '配件：最後一通來電、訊號滿格、撥號連線'] },
  { v:'0.3.1', d:'2026-10-20', t:['新增更新日誌：桌機在「日誌」分頁，手機在選單裡；有新版本時會出現紅點'] },
  { v:'0.3.0', d:'2026-10-20', t:['新增 4 個主動技能：重低音喇叭、強力磁鐵、垃圾郵件、雷射指向筆', '每個新技能有 2 個未鑑定的模式卡匣'] },
  { v:'0.2.1', d:'2026-10-20', t:['技能、裝備、金幣等 12 個圖示改為低面數 3D'] },
  { v:'0.2.0', d:'2026-10-20', t:['角色會自己走位、閃避招式，邊走邊攻擊', '地圖擴大、人物與怪物縮小，一次湧出一大群怪', '傳送門改成島邊 8 道裂縫，守關者從天上掉下來', '四把武器改用 3D 模型', '拿掉遊戲速度，升級選卡可自動隨機', '修正眼睛位置'] },
  { v:'0.1.3', d:'2026-10-20', t:['合併成就（永久傷害）與目標（獎勵型）兩套系統', '拼圖支援拖曳放置與換位'] },
  { v:'0.1.2', d:'2026-10-20', t:['桌機三欄版面：左邊角色、中間戰鬥、右邊常駐面板'] },
  { v:'0.1.1', d:'2026-10-20', t:['多角色選擇', '地圖改成中央廣場加十字步道', '修正手機下方面板消失'] },
  { v:'0.1.0', d:'2026-10-20', t:['音樂與音效，可靜音', '升級三選一改裝卡與技能變體', '模式卡匣：技能的隱藏攻擊模式，裝上才鑑定'] },
];
/* 遺物：每次擊敗BOSS（深度推進或地圖通關）三選一，永久生效，全部不重複 */
const RELICS = {
  FAN:   { n:'迷你風扇',   d:'技能冷卻 -10%', st:'haste', v:10 },
  LENS:  { n:'放大鏡',     d:'會心傷害 +40%', st:'cm', v:40 },
  CHARM: { n:'護身符',     d:'閃避 +6%', st:'dodge', v:6 },
  DRINK: { n:'運動飲料',   d:'生命回復 +4/秒', st:'regen', v:4 },
  BATT:  { n:'電池組',     d:'傷害 +12%', st:'inc', v:12 },
  VEST:  { n:'防彈背心',   d:'護甲 +40，生命 +10%', st:'armor', v:40 },
  CALC:  { n:'計算機',     d:'經驗值 +20%' },
  PIG:   { n:'撲滿',       d:'金幣 +30%' },
  LUCK:  { n:'幸運符',     d:'暗金機率 +3%（含保底）' },
  FOOD:  { n:'暴食便當',   d:'討伐魔物回復 1% 生命' },
  BOMB:  { n:'連環炸彈',   d:'討伐魔物有 10% 機率爆炸，傷害周圍敵人（150% 技能傷害）' },
  SUN:   { n:'小太陽',     d:'每 10 秒，對全場敵人造成一次 120% 技能傷害' },
};
/* 裝扮：每個部位一組顏色，價格用金幣；第一個是預設（免費、已擁有） */
const COS_CATS = [['weaponStyle','武器'],['offhandStyle','副手'],['accessoryStyle','飾品'],['auraStyle','身體特效']];
const cosAvailable=cat=>COS_CATS.some(([key])=>key===cat);
const COS = {
  weaponStyle:[['0','裝備原貌','#c3cad6',0],['umbrella','摺疊傘','#8399b3',1200],['bat','鋁製球棒','#bbc7d4',1500],['tube','霓虹光管','#83c8cf',2000],['saber','雷射光劍','#929ddd',2500]],
  offhandStyle:[['0','不攜帶','#c3cad6',0],['disc','唱片圓盾','#8299b3',1500],['radio','掌上收音機','#729f9e',1800]],
  accessoryStyle:[['0','不配戴','#c3cad6',0],['pager','腰間傳呼機','#879bb8',1200],['charm','電台吊飾','#93c8c2',1500]],
  auraStyle:[['0','無特效','#c3cad6',0],['circuit','電路光環','#69e0ff',3000],['spark','靜電火花','#fff3a0',3500],['wave','訊號波紋','#ff9be3',4000],['pixel','像素星屑','#7ef0ff',4500]],
  tstyle:[['0', '短袖 T', '#dfe6f7', 0], ['hood', '連帽衫', '#dfe6f7', 2000], ['jacket', '棒球外套', '#dfe6f7', 2500], ['scarf', '長圍巾', '#dfe6f7', 1800]],
  hat:   [['0', '無', '#dfe6f7', 0], ['cap', '鴨舌帽', '#4a6fb0', 1500], ['beanie', '毛帽', '#ff6aa8', 1500], ['bunny', '兔耳', '#f5f6fc', 2500], ['ant', '天線髮箍', '#7fe38a', 2000]],
  glasses:[['0', '無', '#dfe6f7', 0], ['round', '圓框', '#2b2552', 1200], ['visor', '護目鏡', '#46c8f0', 2000], ['shades', '墨鏡', '#2b2a3a', 1500]],
  pack:  [['0', '無', '#dfe6f7', 0], ['bag', '雙肩包', '#ff9ec7', 1500], ['cape', '披風', '#7a55c0', 2500], ['wing', '電池翅膀', '#7fd3ff', 3500]],
  hstyle:[['0', '長直髮', '#2b2552', 0], ['1', '刺蝟頭', '#2b2552', 2000], ['2', '雙馬尾', '#2b2552', 3000], ['3', '鮑伯頭', '#2b2552', 2500], ['4', '丸子頭', '#2b2552', 3500]],
  hair:  [['ink', '墨藍', '#2b2552', 0], ['rose', '櫻桃紅', '#e0405a', 1500], ['pink', '泡泡粉', '#ff6aa8', 1500], ['blue', '電光藍', '#3d7fd0', 2000], ['mint', '螢光綠', '#4fd08a', 2500], ['gold', '千禧金', '#e0b020', 2500], ['violet', '紫羅蘭', '#8a4fd0', 4000], ['orange', '橘子汽水', '#ff8a3c', 3000], ['silver', '銀白', '#dfe6f2', 6000]],
  top:   [['white', '雲朵白', '#e9edf6', 0], ['sky', '汽水藍', '#7fb6ff', 1000], ['bubble', '泡泡粉', '#ff9ec7', 1000], ['mint', '薄荷綠', '#8fe3c0', 1000], ['black', '夜行黑', '#34324a', 1500], ['lemon', '檸檬黃', '#ffe66a', 1500], ['coral', '珊瑚橘', '#ff7a5c', 2000], ['lilac', '薰衣草', '#b08cff', 2000]],
  pants: [['army', '軍綠', '#6f8f4a', 0], ['denim', '牛仔藍', '#4a6fb0', 1000], ['black', '墨黑', '#2b2a3a', 1000], ['khaki', '卡其', '#c9b27a', 1000], ['pink', '粉紅', '#ff9ec7', 1500], ['purple', '深紫', '#7a55c0', 1500], ['neon', '螢光橘', '#ff8a3c', 2000], ['chrome', '鉻銀', '#b8c4d8', 3500]],
  shoes: [['silver', '銀白', '#e8eef5', 0], ['pink', '粉紅', '#ff9ec7', 800], ['sky', '天藍', '#7fb6ff', 800], ['black', '墨黑', '#34324a', 1000], ['lime', '螢光綠', '#7fe38a', 1500], ['gold', '金色', '#f0c040', 2500]],
  phones:[['white', '純白', '#f5f6fc', 0], ['pink', '粉紅', '#ff6aa8', 800], ['blue', '天藍', '#5fa8ff', 800], ['black', '墨黑', '#34324a', 1000], ['green', '薄荷', '#5fd08a', 1500], ['gold', '金色', '#f0c040', 2500]],
  skin:  [['peach', '蜜桃', '#f4cfb4', 0], ['fair', '白皙', '#f8e0d2', 0], ['tan', '小麥', '#e2ac86', 0], ['deep', '深棕', '#b9825a', 0]],
};
const STAR_SIGNS = ['傳呼座', '摺機座', '撥接座', '光碟座', '掌機座', '像素座', '耳機座', '隨身聽座', '電子雞座', '貼紙座', '卡帶座', '倒數座'];
const RANKS = [[1, '見習勇者'], [5, '街角新人'], [10, '巷口勇者'], [20, '都市傳說'], [35, '世紀末英雄'], [50, '千禧之王']];
const SLOT_LV = [1, 4, 9, 15, 22, 30];   // 拼圖面板每一列的解鎖等級
/* 模式卡匣：裝在技能上會改變攻擊方式。hint 是鑑定前看到的提示，d 是裝上過一次之後才顯示的完整效果 */
const MODES = {
  FIRE_SPLIT:   { sk:'FIRE',   n:'分裂電池', hint:'電池裡的東西好像不太穩定……', d:'命中時另外炸向 2 個附近的敵人（各 50% 傷害）' },
  FIRE_BLAST:   { sk:'FIRE',   n:'引爆電池', hint:'聽說這顆電池會連帶炸開周圍。', d:'命中時，目標周圍的敵人也受到 60% 傷害' },
  FROST_STORM:  { sk:'FROST',  n:'暴風冷氣', hint:'冷氣機吹完還想再吹一次。', d:'冷氣爆發 0.6 秒後再吹一次（60% 傷害）' },
  FROST_SHATTER:{ sk:'FROST',  n:'碎冰冷氣', hint:'被凍住的東西，似乎很脆。', d:'被冷氣爆發殺死的敵人會炸裂，對周圍敵人造成 50% 傷害' },
  CHAIN_FORK:   { sk:'CHAIN',  n:'分叉紅外線', hint:'紅外線找到了新的出路。', d:'每一跳另外分叉打中旁邊一個敵人（50% 傷害）' },
  CHAIN_OVERLOAD:{sk:'CHAIN',  n:'過載紅外線', hint:'電力開到最大，代價是需要喘口氣。', d:'連鎖 5 跳且傷害不衰減，冷卻 +80%' },
  METEOR_TWIN:  { sk:'METEOR', n:'雙星墜落', hint:'天上不只一顆。', d:'同時落下兩顆衛星，各 60% 傷害' },
  METEOR_COMET: { sk:'METEOR', n:'彗星衛星', hint:'它只想砸中一個目標。', d:'最近的敵人受到 220% 傷害，其餘只有 50%' },
  PULSE_ECHO:   { sk:'PULSE',  n:'迴響喇叭', hint:'喇叭好像聽到了自己的聲音。', d:'0.5 秒後再響一次（60% 傷害）' },
  PULSE_SONIC:  { sk:'PULSE',  n:'超音波', hint:'聲音太高，聽不見但是很痛。', d:'範圍 +60%，傷害 -25%' },
  MAGNET_CRUSH: { sk:'MAGNET', n:'黑洞磁鐵', hint:'吸過來之後好像還有下文。', d:'吸過來 0.5 秒後坍縮，近身敵人再受 200% 傷害' },
  MAGNET_STICKY:{ sk:'MAGNET', n:'黏性磁鐵', hint:'被吸住的東西動不了。', d:'被吸過來的敵人凍結 2 秒；BOSS需累積控制並受適應期限制' },
  FLICKER_STORM:{ sk:'FLICKER', n:'閃光風暴', hint:'快門按到停不下來。', d:'一次閃5下，每下65%傷害，沒有最後一擊加成；所有回放共用連擊熱量' },
  FLICKER_REAP: { sk:'FLICKER', n:'收割閃打', hint:'它只對倒下的目標感興趣。', d:'討伐目標時立刻追加一次閃打，可連續觸發' },
  FLICKER_TRAIL:{ sk:'FLICKER', n:'殘影拖尾', hint:'留下的殘影也會咬人。', d:'每一下命中點留下殘影，0.4 秒後再造成 22% 傷害' },
  SPAM_FLOOD:   { sk:'SPAM',   n:'洗版', hint:'信箱爆了。', d:'一次寄出 14 封，每封 45% 傷害' },
  SPAM_PHISH:   { sk:'SPAM',   n:'釣魚信件', hint:'它專挑最肥的魚。', d:'只寄 3 封，專打生命最多的敵人，每封 +200% 傷害' },
  BEAM_SWEEP:   { sk:'BEAM',   n:'掃射', hint:'指向筆在手裡抖個不停。', d:'同時射出三道雷射（左右各偏 35 度），各 65% 傷害' },
  BEAM_FOCUS:   { sk:'BEAM',   n:'聚焦', hint:'光點縮得很小很小。', d:'雷射變細，傷害 +150%，只打最近一條線上的敵人' },
  METEOR_COLDSTART:{sk:'METEOR',n:'冷啟動碎星',hint:'冰冷的訊號正在呼叫衛星。',d:'傷害降至 80%、冷卻 +25%；鎖定凍結目標並消耗凍結，該目標承受三倍命中，波及落點 18 格內敵人'},
  BEAM_CAPACITOR:{sk:'BEAM',n:'撥號放電',hint:'紅外線傳來的電荷，終於有了出口。',d:'紅外線原始命中產生電荷；雷射消耗最多 8 格，每格額外提高 35% 傷害。基礎傷害 65%、冷卻 +25%，光束加寬'},
};
const COMBAT_RULES=Object.freeze({freezeSeconds:1.4,bossFreezeGuard:4,bossFreezeLife:.12,freezeDecay:.04,chargeMax:8,chargePerCast:4,comboHold:1.2});
const SKILL_PATTERNS={
  FIRE:{each:1},FROST:{each:1},CHAIN:{each:1,hops:3,decay:.7},METEOR:{each:1,count:1},
  PULSE:{each:1,range:24},MAGNET:{each:1,range:40},SPAM:{each:1,count:6},
  FLICKER:{each:1,count:3,last:1.5},BEAM:{each:1,width:4.5},
};
for(const [id,pattern] of Object.entries({
  FROST_STORM:{echo:.6},CHAIN_FORK:{fork:.5},CHAIN_OVERLOAD:{hops:5,decay:1,cd:1.8},
  METEOR_TWIN:{count:2,each:.6},METEOR_COMET:{primary:2.2,splash:.5},
  PULSE_ECHO:{echo:.6},PULSE_SONIC:{range:38,each:.75},MAGNET_CRUSH:{crush:2},
  FLICKER_STORM:{count:5,each:.65,last:1},FLICKER_TRAIL:{trail:.22},
  SPAM_FLOOD:{count:14,each:.45},SPAM_PHISH:{count:3,each:3},
  BEAM_SWEEP:{each:.65,sweep:true},BEAM_FOCUS:{each:2.5,width:2.2},
  METEOR_COLDSTART:{each:.8,cd:1.25,coldStart:true,radius:18,coldBonus:3},
  BEAM_CAPACITOR:{each:.65,cd:1.25,width:8,capacitor:true},
}))MODES[id].pattern=pattern;
function skillPattern(id,mode){return {...SKILL_PATTERNS[id],...(MODES[mode]?.sk===id?MODES[mode].pattern:{})};}
function skillDirectFactor(id,p,repeat=false){
  if(id==='FLICKER')return p.each*(p.count-1+p.last+p.count*(p.trail||0));
  if(id==='SPAM')return p.each*p.count;
  if(id==='METEOR')return p.primary||p.each*p.count;
  return p.each*(1+(repeat?0:(p.echo||0)+(p.crush||0)));
}
const SUPPS = {
  HEAVY:{ n:'超頻', d:'此技能傷害 +45%' }, COOL:{ n:'散熱片', d:'此技能傷害 +20%，冷卻 -15%' }, CRYSTAL:{ n:'水晶振盪', d:'此技能傷害 +10%，會心率 +15%' }, AREA:{ n:'廣播', d:'電池命中全部敵人（-15%）；連鎖多跳 2 次' }, HASTE:{ n:'寬頻', d:'此技能冷卻 -30%' },
  LEECH:{ n:'無線充電', d:'此技能傷害的 12% 轉為生命' }, TWIN:{ n:'雙卡雙待', d:'0.25 秒後重複施放一次（60% 傷害）' }, CRITS:{ n:'爆機', d:'此技能會心率 +30%' },
};
/* 升級三選一的「改裝卡」：數值卡常見，技能變體卡只在該技能裝備時出現，會改變技能行為 */
const CARDS = {
  C_DMG:{ n:'超頻電路', d:'傷害 +15%', st:'inc', v:15 }, C_CRIT:{ n:'高感度麥克風', d:'會心率 +6%', st:'crit', v:6 }, C_CM:{ n:'重低音', d:'會心傷害 +20%', st:'cm', v:20 },
  C_DODGE:{ n:'防滑鞋底', d:'閃避 +5%', st:'dodge', v:5 }, C_APS:{ n:'快速充電', d:'攻速 +10%', st:'apsInc', v:10 }, C_LIFE:{ n:'大容量電池', d:'生命 +12%', st:'lifePct', v:12 }, C_HASTE:{ n:'寬頻升級', d:'技能冷卻 -8%', st:'haste', v:8 },
  C_REGEN:{ n:'太陽能板', d:'生命回復 +2/秒', st:'regen', v:2 }, C_ARMOR:{ n:'防水外殼', d:'護甲 +20', st:'armor', v:20 }, C_LEECH:{ n:'無線充電座', d:'吸血 +1.5%', st:'leech', v:1.5 },
  V_SPLIT:{ n:'分裂電池', d:'灼熱電池爆炸時，另外炸向 2 隻附近魔物（60% 傷害），每張 +2 隻', sk:'FIRE', max:3 },
  V_SHATTER:{ n:'冷凍碎裂', d:'被凍結的魔物受到技能傷害 +40%，每張再 +40%', sk:'FROST', max:3 },
  V_FORK:{ n:'多重頻道', d:'紅外線多跳 2 次，每張再 +2 次', sk:'CHAIN', max:3 },
  V_ECHO:{ n:'雙衛星', d:'流星衛星後 0.6 秒再落一顆（50% 傷害）', sk:'METEOR', max:1 },
};
/* 可選角色：外觀（髮色、褲色、膚色）與被動；用最深深度解鎖 */
const CHARS = {
 street:{model:'aki',n:'脈衝衛士',title:'近戰與護盾',eff:{inc:10},sig:{n:'短路連打',cd:7,d:'重擊近處目標並連鎖跳電。'},need:0},
 frost:{model:'milo',n:'頻譜遊俠',title:'音波與節拍',eff:{apsInc:8},sig:{n:'低頻環流',cd:7,d:'釋放範圍音波，持續普攻加快節拍。'},need:0},
 beep:{model:'ping',n:'訊號獵手',title:'投射與鎖定',eff:{crit:6,apsInc:6},sig:{n:'訊號連射',cd:6,d:'鎖定多個目標發出會心訊號彈。'},need:0},
 volt:{model:'null',n:'寵機技師',title:'寵機與修復',eff:{inc:8},sig:{n:'寵機出動',cd:8,d:'寵機持續攻擊，定期短暫增幅。'},need:0}
};
/* 成就：帳號永久進度。每個成就永久傷害 +1%，部分成就解鎖角色 */
const ACHS = {
  k100:{ n:'初試身手', d:'累計討伐 100 隻魔物', ok:() => G.totalKills >= 100 },
  k2000:{ n:'割草達人', d:'累計討伐 5000 隻魔物', ok:() => G.totalKills >= 5000 },
  boss1:{ n:'BOSS殺手', d:'擊敗BOSS 1 次', ok:() => (G.bossKills || 0) >= 1 },
  boss10:{ n:'傳呼機響了', d:'擊敗BOSS 30 次，解鎖角色「結衣」', ok:() => (G.bossKills || 0) >= 30 },
  d10:{ n:'深入街頭', d:'最深到達第 12 層', ok:() => G.maxDepth >= 12 },
  d20:{ n:'夜行者', d:'最深到達第 20 層', ok:() => G.maxDepth >= 20 },
  l20:{ n:'老鳥', d:'等級達到 25', ok:() => G.lvl >= 25 },
  l30:{ n:'資深玩家', d:'等級達到 30', ok:() => G.lvl >= 30 },
  map5:{ n:'地圖收集者', d:'完成 5 張地圖', ok:() => (G.mapsDone || 0) >= 5 },
  legend:{ n:'傳奇登場', d:'身上穿著傳奇裝備', ok:() => Object.values(G.equip).some(it => it && it.r === 3) },
  card10:{ n:'改裝狂', d:'累計拿到 25 張改裝卡', ok:() => Object.values(G.cards).reduce((a, n) => a + n, 0) >= 25 },
  survive:{ n:'命大', d:'倒下 5 次還繼續打', ok:() => G.deaths >= 5 },
};
const MODS = {
  more:  { kind:'challenge', n:'怪群更大（+1 隻）', q:.25 }, fast:{ kind:'challenge', n:'魔物更迅捷', q:.15 }, tough:{ kind:'challenge', n:'魔物生命 +40%', q:.2 },
  deadly:{ kind:'challenge', n:'魔物傷害 +35%', q:.2 }, rich:{ kind:'reward', n:'金幣 +60%', q:.1 }, lucky:{ kind:'reward', n:'稀有度提升', q:.2 },
  elite:{ kind:'challenge', n:'精英出沒', q:.3 }, swarm:{ kind:'mixed', n:'怪潮（怪群 +3，生命 -25%）', q:.2 }, wise:{ kind:'reward', n:'經驗 +50%', q:.1 },
};

/* 目標：獎勵型進度（存在 G.goals，和 ACHS 的永久傷害成就分開）。k 是統計項目，goal 是門檻，rw 是獎勵 */
const GOALS = [
  { id:'k1', n:'街頭清潔隊', k:'kills', goal:100,  rw:{ gem:'HEAVY' } },
  { id:'k2', n:'掃街達人',   k:'kills', goal:1000, rw:{ cart:'FIRE_BLAST' } },
  { id:'k3', n:'千禧殺手',   k:'kills', goal:5000, rw:{ cart:'METEOR_COMET', gold:2000 } },
  { id:'l1', n:'新手上路',   k:'lvl',   goal:10,   rw:{ gem:'HASTE' } },
  { id:'l2', n:'老手',       k:'lvl',   goal:20,   rw:{ cart:'FROST_STORM' } },
  { id:'l3', n:'傳說玩家',   k:'lvl',   goal:30,   rw:{ cart:'CHAIN_OVERLOAD', gem:'TWIN' } },
  { id:'d1', n:'走遠一點',   k:'depth', goal:5,    rw:{ gem:'CRITS' } },
  { id:'d2', n:'深入街區',   k:'depth', goal:10,   rw:{ cart:'CHAIN_FORK' } },
  { id:'d3', n:'世紀末',     k:'depth', goal:20,   rw:{ cart:'METEOR_TWIN', gold:3000 } },
  { id:'r1', n:'第一次出門', k:'runs',  goal:1,    rw:{ gem:'LEECH' } },
  { id:'r2', n:'地圖常客',   k:'runs',  goal:5,    rw:{ cart:'FIRE_SPLIT' } },
  { id:'r3', n:'探索家',     k:'runs',  goal:20,   rw:{ cart:'FROST_SHATTER', gem:'AREA' } },
  { id:'m1', n:'第一次改裝', k:'modes', goal:1,    rw:{ gold:300 } },
  { id:'m2', n:'改裝愛好者', k:'modes', goal:4,    rw:{ gem:'HEAVY', gold:1000 } },
  { id:'m3', n:'卡匣收藏家', k:'modes', goal:8,    rw:{ gem:'TWIN', gold:3000 } },
];
/* 新手任務鏈：一次一個，完成才出下一個；同時逐步解鎖系統（unlock 對應分頁） */
const QUESTS = [
  { n:'熱身', t:'討伐 20 隻魔物', k:'kills', goal:20, rw:{ gold:150 } },
  { n:'升級', t:'升到 3 級', k:'lvl', goal:3, rw:{ gem:'HASTE' } },
  { n:'往前走', t:'抵達深度 3', k:'depth', goal:3, rw:{ gold:300 } },
  { n:'換新裝', t:'升到 6 級', k:'lvl', goal:6, rw:{ gem:'CRITS' }, un:'tree', tip:'天賦盤已開放：升級得到的點數可以在這裡分配。' },
  { n:'第一個BOSS', t:'抵達深度 6', k:'depth', goal:6, rw:{ gold:600 } },
  { n:'拆解與改機', t:'升到 10 級', k:'lvl', goal:10, rw:{ parts:10 }, un:'craft', tip:'改機已開放：拆掉不要的裝備得到零件，拿來重洗與改裝。' },
  { n:'動手改一次', t:'改機 1 次', k:'craft', goal:1, rw:{ parts:6, gold:500 } },
  { n:'出門探索', t:'完成 1 張地圖', k:'runs', goal:1, rw:{ cart:'FIRE_BLAST' } },
  { n:'鑑定卡匣', t:'鑑定 1 種模式', k:'modes', goal:1, rw:{ gem:'TWIN' } },
  { n:'挑戰極限', t:'抵達深度 8，解鎖無限之塔', k:'depth', goal:8, rw:{ parts:15, gold:1000 } },
];
const TAB_LVL = { tree:6, craft:10, maps:5 };
const GOAL_UNIT = { kills:'隻魔物', lvl:'級', depth:'層深度', runs:'張地圖通關', modes:'種卡匣鑑定' };
const tLerp = (a,b,t) => a + (b-a)*t, tClamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const tRand = (a,b) => a + Math.random()*(b-a), tPick = a => a[Math.floor(Math.random()*a.length)];
const tFmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e4 ? (n/1e3).toFixed(1)+'k' : String(Math.round(n));


/* 千年城市遠征：每區有獨立地標及遭遇表。 */
BIOMES.push(
 {n:'電台頂樓',board:{l:'#b7c9dc',m:'#6f819b',d:'#35425c'},t1:'#9bacc1',t2:'#c0d5e4',portal:'#ff9b54',glow:'#ffb46d'},
 {n:'海邊堤防',board:{l:'#a2d9d4',m:'#559b9e',d:'#36546b'},t1:'#67b5ba',t2:'#b4ded8',portal:'#54e6d2',glow:'#a8fff1'},
 {n:'電路神社',board:{l:'#b8b0d6',m:'#766688',d:'#3a3157'},t1:'#aa819b',t2:'#e0a8c8',portal:'#ff6ca8',glow:'#ffb5d5'},
 {n:'商場地下街',board:{l:'#9b9fd2',m:'#565c8b',d:'#242a46'},t1:'#686ea7',t2:'#959cce',portal:'#70e4ff',glow:'#7dfaff'},
 {n:'夜晚天橋',board:{l:'#b4becb',m:'#727f94',d:'#363d52'},t1:'#8794a6',t2:'#b4ccde',portal:'#ffd370',glow:'#fff0ac'},
 {n:'停業商場',board:{l:'#d1c3d5',m:'#96899f',d:'#51485e'},t1:'#ad9db9',t2:'#d9c0d4',portal:'#8d7bff',glow:'#c0b7ff'}
);
Object.assign(SUPPS,{
 FOCUS:{n:'鎖頻晶片',d:'此技能傷害 +35%、會心率 +15%，冷卻 +15%'},
 FORK:{n:'分線器',d:'此技能命中時，對另一個鄰近敵人造成 25% 傷害；每 0.25 秒觸發一次'},
 RECOVER:{n:'備用電池',d:'此技能命中回復 3% 最大生命；每 0.8 秒觸發一次'},
 DELAY:{n:'延遲緩衝',d:'此技能傷害 -15%，0.6 秒後額外重播一次，造成 45% 傷害'}
});

[["#1e2b52","#425c83","#8ca2b5"],["#35668c","#71aaa9","#a3d3cc"],["#291f4b","#725077","#bb88a6"],["#0e1934","#273456","#4b6281"],["#1b2447","#4c507b","#9a84aa"],["#353858","#6f718e","#aaabc0"]].forEach((sky,i)=>BIOMES[i+6].sky=sky);

const MONSTER_GUIDE=[
 ['ranger','汽水罐射手','中距離停步，以三個預警落點封鎖走位'],['lantern','巡路燈靈','浮游修理燈，每次回復附近最多三位同伴少量生命'],['mole','井蓋地鼠','預警後鑽地移到鎖定位置，避開落點便能閃過'],['golem','水泥墩守衛','高大而緩慢的石機，接近後以大範圍重踏驅散敵人'],
 ['slime','插頭跳豆','成群出現，會躍擊預告的位置'],['skel','紙箱人','比插頭跳豆耐打，會圍向角色'],['brute','啤酒箱牛','又慢又硬，打人很痛'],['drone','塑膠袋飛靈','貼著半空飛，速度快但很脆'],['bomb','氣球炸彈','死亡時爆炸，波及角色與附近敵人'],
 ['spider','電線團蛛','快速接近的多足拾荒體'],['speaker','失控音箱','重裝音箱，會預警後轟炸落點'],['wisp','雜訊小靈','低耐久的浮游訊號體，移動靈活'],['crab','便當盒蟹','厚重機殼與雙鉗，短暫閉殼時減少受到的直擊傷害'],['boss','BOSS','巨型雜物：失控販賣機、搬運板車或鐘樓看守，輪換三種預警攻勢，半血後加速；掉落高階戰利品']
];

/* 城市路線與韌體是所有角色共用的構築規則。 */
const TALENT_LIMIT=24, FIRMWARE_LIMIT=2;
const FIRMWARE={
 AK:{n:'冷備份',eff:{lifePct:12,armor:35},d:'技能直傷降低 15%；冷啟動消耗凍結時，入手最大生命 12% 的緩衝盾，持續 4 秒，不疊加'},
 BK:{n:'三頻協定',eff:{crit:-8},d:'同時啟用火、冰、電機件時，技能傷害提高 30%；會心率降低 8%'},
 CK:{n:'單頻放大',eff:{apsInc:-15},d:'最多 3 種主動機件時，技能傷害提高 35%；停用整列、整欄及同元素共鳴，攻速降低 15%'},
 DK:{n:'超頻協定',eff:{haste:25,lifePct:-22},d:'技能急速 +25%；最大生命降低 22%'},
 EK:{n:'斷線重播',eff:{apsInc:-20},d:'每次原始施放追加 60% 回放；原始技能傷害降低 15%，攻速降低 20%。回放不產電、不再回放'},
 FK:{n:'電池孤注',eff:{cm:70,lifePct:-25},d:'會心傷害 +70%；每格電荷放電加成由 35% 改為 45%，最大生命降低 25%'}
};
const CITY_ROUTES={
 signal:{n:'廢訊號網',biome:6,pool:['drone','wisp','spider'],d:'分散的快速敵人，BOSS以更短間隔追擊；連鎖、遠距及移動覆蓋較有利',cores:['W_FORK','R_DIAL','R_LINK'],threat:'敵人移速 +30%，分散入場'},
 memory:{n:'磁帶迴廊',biome:7,pool:['crab','speaker','spider'],d:'成群單位帶回充護盾；持續命中阻止回充，聚怪與範圍傷害較有利',cores:['W_ECHO','A_RESET','A_PHOENIX'],threat:'護盾為最大生命 18%，停火 3 秒後回充'},
 power:{n:'地下電源區',biome:9,pool:['speaker','brute','crab'],d:'重裝敵人承受傷害降低 25%；燃燒、電標記或凍結可解除減傷，適合鋪墊後爆發',cores:['W_MULTI','A_RIPOSTE','R_LAST'],threat:'重裝減傷 25%，敵人傷害 +15%'}
};
const CITY_BRANCHES={
 safe:{n:'旁路校準',d:'當局敵人傷害降低 15%，每秒回復最大生命 1%；不增加碎片',reward:0},
 cache:{n:'高壓快取',d:'當局技能傷害 +18%，最大生命降低 12%；完成下一段碎片 +1',reward:1},
 risk:{n:'帶電捷徑',d:'當局敵人傷害 +15%、移速 +12%；完成下一段碎片 +3',reward:3}
};

/* 街頭機件擴充：純資料，戰鬥仍由共用傷害／計時擁有者處理。 */
Object.assign(SKILLS,{"DISC": {"n": "回帶飛盤", "lvl": 6, "cd": 3.8, "mult": 2.2, "el": "light", "col": "#80cebd", "tg": 2, "d": "朝目標擲出飛盤，沿線穿過最多3敵；0.65秒後沿原路回收，造成65%傷害"}, "COIL": {"n": "街角線圈", "lvl": 12, "cd": 6, "mult": 1.2, "el": "light", "col": "#ffd34e", "tg": 3, "d": "在目標位置架設線圈，於2秒內脈衝4次，每次傷害半徑18內最多4敵；敵人離開便會避開"}, "ORBIT": {"n": "磁帶環刃", "lvl": 16, "cd": 5.8, "mult": 1.25, "el": "cold", "col": "#6fd4f0", "tg": 3, "d": "3圈磁帶刃跟隨人物掃擊半徑20內最多4敵；每圈0.55秒，近身才命中"}, "RAIL": {"n": "軌道放電", "lvl": 22, "cd": 4.8, "mult": 4.2, "el": "light", "col": "#b5baff", "tg": 2, "d": "朝最近目標發出狹窄貫穿射線，最多3敵；射線寬度2.5，走位可讓更多敵人排成一直線"}, "DEFRAG": {"n": "碎片清除", "lvl": 25, "cd": 5, "mult": 2.9, "el": "fire", "col": "#ff9b54", "tg": 2, "d": "優先攻擊生命比例最低的敵人；敵人低於35%生命時傷害提高80%，不會直接斬殺"}, "RELAY": {"n": "中繼崩解", "lvl": 28, "cd": 7, "mult": 2.4, "el": "cold", "col": "#94d7c6", "tg": 3, "d": "優先尋找帶電目標並消耗其閃電標記，對半徑22內最多5敵造成160%傷害；未帶電時只命中單體"}});
Object.assign(SKILL_PATTERNS,{DISC:{each:1.65},COIL:{each:4},ORBIT:{each:3},RAIL:{each:1},DEFRAG:{each:1},RELAY:{each:1}});
Object.assign(SUPPS,{"ANCHOR": {"n": "定錨電容", "d": "傷害 +80%，冷卻時間 +25%；適合少次重擊"}, "EXECUTE": {"n": "清場指令", "d": "傷害 -10%；目標低於35%生命時，命中傷害額外 +100%（隨階級提升）"}, "BLOOD": {"n": "危險供電", "d": "傷害 -10%；自身低於50%生命時，命中傷害額外 +90%（隨階級提升）"}, "CONDUCT": {"n": "異常協定", "d": "傷害 -10%；命中帶電、燃燒、凍結或中毒敵人時，傷害額外 +75%（隨階級提升）"}, "LONG": {"n": "遠距天線", "d": "傷害 -10%；目標距離超過24時，命中傷害額外 +80%（隨階級提升）"}, "SPREAD": {"n": "廣域接頭", "d": "範圍／射線寬度 +40%，傷害 -20%；只相容範圍或投射技能"}});

/* Preserve biome indices while replacing candy tones with weathered materials. */
Object.assign(BIOMES[3],{n:'夜市燒烤攤',sky:['#1f2531','#695e55','#b7a58b'],board:{l:'#82715e',m:'#584738',d:'#302c31'},t1:'#bd713e',t2:'#a29c83',portal:'#ff9b54',glow:'#eabd78'});
Object.assign(BIOMES[5],{n:'車站貨運場',sky:['#15293c','#617a86','#b5c4c8'],board:{l:'#a2adb0',m:'#697c85',d:'#344658'},t1:'#6c8a80',t2:'#b7c5bc',portal:'#e0ad5a',glow:'#f1cf83'});
Object.assign(BIOMES[8],{n:'山路電塔',board:{l:'#adb9ad',m:'#748d83',d:'#3d5554'},t1:'#7e9f8c',t2:'#b5c5b3',portal:'#9fc2d1',glow:'#c4e9e4',sky:['#142632','#486b71','#a0beb5']});
Object.assign(BIOMES[0],{sky:['#2fa8f0','#4fc8ff','#dff5ff'],board:{l:'#c6dcb0',m:'#a4c28f',d:'#6f957c'}});
Object.assign(BIOMES[1],{sky:['#3aa6ea','#86d0f2','#ffe8c0'],board:{l:'#f2e0b4',m:'#e0c690',d:'#b09468'}});
Object.assign(BIOMES[2],{sky:['#4aa8ec','#9bd6f8','#f4fbff']});
Object.assign(BIOMES[4],{sky:['#160e68','#4a2cb4','#ff86d4']});
BIOMES.push({"n": "河邊鐵工廠", "board": {"l": "#a49a88", "m": "#706e69", "d": "#353d44"}, "t1": "#706e69", "t2": "#a49a88", "portal": "#ba8c59", "glow": "#ba8c59", "sky": ["#152435", "#353d44", "#706e69"]});
BIOMES.push({"n": "港口碼頭", "board": {"l": "#96b3b4", "m": "#567781", "d": "#253e56"}, "t1": "#567781", "t2": "#96b3b4", "portal": "#80d3cf", "glow": "#80d3cf", "sky": ["#152435", "#253e56", "#567781"]});
BIOMES.push({"n": "屋頂天線群", "board": {"l": "#b5c0d1", "m": "#7d8da8", "d": "#3a4864"}, "t1": "#7d8da8", "t2": "#b5c0d1", "portal": "#a9b6ec", "glow": "#a9b6ec", "sky": ["#152435", "#3a4864", "#7d8da8"]});
BIOMES.push({"n": "郊外採石場", "board": {"l": "#c4b799", "m": "#92866c", "d": "#514d44"}, "t1": "#92866c", "t2": "#c4b799", "portal": "#deba6c", "glow": "#deba6c", "sky": ["#152435", "#514d44", "#92866c"]});
BIOMES.push({"n": "頂樓冷氣區", "board": {"l": "#a4c1c0", "m": "#6a9193", "d": "#32505e"}, "t1": "#6a9193", "t2": "#a4c1c0", "portal": "#92e1da", "glow": "#92e1da", "sky": ["#152435", "#32505e", "#6a9193"]});
BIOMES.push({"n": "雨天地下道", "board": {"l": "#9caab5", "m": "#637984", "d": "#2f4359"}, "t1": "#637984", "t2": "#9caab5", "portal": "#d6c475", "glow": "#d6c475", "sky": ["#152435", "#2f4359", "#637984"]});
/* 其餘群系的天空：夏日午後的色彩層次，用天氣與時段變化，不走陰暗。 */
[[3,['#6d4a58','#d98a62','#ffd2a0']],[5,['#7aa2b8','#b8d0d8','#f0f0e6']],[6,['#5a86c0','#a8c6e0','#f2eadc']],[7,['#3fa6c8','#8fd6d8','#e8f6ee']],[8,['#4f8fb8','#9fc8d4','#eaf2e6']],[9,['#2b3260','#5560a0','#9aa4d8']],[10,['#3a3a8c','#c46aa8','#ffc898']],[11,['#6a6ab0','#d8a0c0','#ffe0d0']],[12,['#8a6a58','#d8a878','#ffe2b8']],[13,['#2f7fa8','#72b8cc','#d8f0ee']],[14,['#4a78c8','#9cb8e8','#f0f2fa']],[15,['#4a98d8','#a8cce0','#ffeac8']],[16,['#5ab0d0','#b0dce0','#f4fbf8']],[17,['#56708a','#8aa0b0','#c8d4d8']]].forEach(([i,sky])=>{if(BIOMES[i])BIOMES[i].sky=sky;});
MONSTER_GUIDE.push(["scanner","探照燈哨","三角翼哨機，預警後三連射擊"],["roller","手推車獸","圓輪重裝體，向預警路線衝鋒"],["antenna","晾衣天線","高腳訊號塔，週期修復附近同伴"],["cable","延長線水母","多條懸垂電纜，預警後釋出震波"],["furnace","烤爐板車","方形熔爐履帶車，以重踏壓迫近處"],["shard","碎鏡看板","分裂稜鏡裝置，以高速躍擊突入落點"]);

Object.assign(SKILLS,{"SWARM": {"n": "口袋蜂群", "lvl": 14, "cd": 14, "mult": 0.8, "el": "light", "col": "#80d5d3", "tg": 4, "d": "召喚3隻小型巡弋寵機，存在14秒，自行追敵並每1.3秒攻擊；同款最多3隻，回放只刷新"}, "GUARDIAN": {"n": "重型護衛", "lvl": 26, "cd": 18, "mult": 2.1, "el": "fire", "col": "#e8b270", "tg": 4, "d": "召喚1隻大型護衛，存在16秒，每1.6秒重擊並濺射附近最多2敵；同款最多1隻，不會替角色擋傷"}, "ARROWS": {"n": "電磁箭雨", "lvl": 18, "cd": 8.5, "mult": 3.8, "el": "light", "col": "#9bd9ee", "tg": 4, "d": "標示一片區域，1.1秒後箭雨落下，命中半徑30內最多12敵；目標走出範圍便不會命中"}, "GIANTBLADE": {"n": "巨型光刃", "lvl": 24, "cd": 10, "mult": 5.4, "el": "cold", "col": "#8abbe8", "tg": 3, "d": "巨劍在空中蓄力，0.8秒後劈落，命中半徑24內最多8敵並累積0.6秒凍結；BOSS仍有控制適應"}, "OVERTURE": {"n": "失真終章", "lvl": 20, "cd": 6.8, "mult": 1.5, "el": "light", "col": "#b5b4ed", "tg": 4, "d": "向目標方向連放3道音符波，每道掃過寬度7的路徑，最多命中5敵；三波方向在施放時固定"}});
Object.assign(SKILL_PATTERNS,{SWARM:{each:0},GUARDIAN:{each:0},ARROWS:{each:1},GIANTBLADE:{each:1},OVERTURE:{each:3}});
Object.assign(SUPPS,{RIME:{n:"冷媒回路",d:"冰霜技能傷害-10%；4秒內每3次命中累積一次0.6秒凍結，BOSS仍需累積並受適應期限制；凍結時長隨配件階級提升"},KINDLE:{n:"燃點回授",d:"火焰技能傷害-10%；擊倒燃燒敵人時，把點燃傳到14距離內最多2敵，持續2.5秒，不觸發連鎖傳播；點燃強度隨配件階級提升"}});

Object.assign(SUPPS,{VENOM:{n:'腐蝕封包',d:'傷害-10%；命中使敵人中毒3秒，每秒造成該次命中10%傷害，最多3層；毒傷不觸發回放，強度隨配件階級提升'}});

SKILLS.ARROWS.d='3.8秒持續箭雨，六波各分配1/6總傷害；每波最多12個目標，適合持續壓制';
SKILLS.GIANTBLADE.d='巨大光刃蓄力後落斬，主斬70%及兩道餘波各15%；主斬可凍結，延遲期間敵人可離開範圍';
SKILLS.OVERTURE.d='六道音符波在2.4秒內依次送出，每道為原半段傷害，維持原總傷害預算';
MONSTER_GUIDE.push(['jailer','鐵閘看守','重甲巨型守衛，緩慢重踏'],['specimen','跑出來的扭蛋','四足大型生體，以預警衝撞接近'],['sentinel','三腳架哨','裝甲炮台，預警後三連射擊']);

Object.assign(SKILLS,{
 RIFT:{n:'稜鏡斷層',lvl:15,cd:7.2,mult:4.2,el:'cold',col:'#8ebce8',tg:3,d:'三道鏡面沿地面依次破開，2.4秒內三段傷害，適合走廊與控制流派'},
 RESONANCE:{n:'低頻震盪',lvl:20,cd:9,mult:4.6,el:'light',col:'#b9a1e5',tg:3.4,d:'四段低頻環在3秒內擴散，逐段命中附近敵人；總傷害分四段'},
 GRAVITY:{n:'引力封鎖',lvl:26,cd:11,mult:3.6,el:'cold',col:'#80d5d3',tg:4,d:'留下3秒引力場，六次小傷害並緩慢牽引；BOSS免疫位移'}
});
Object.assign(SKILL_PATTERNS,{RIFT:{each:1},RESONANCE:{each:1},GRAVITY:{each:1}});

;
/* Stable legacy save keys deliberately retained: street→AKI, frost→MILO,
   beep→PING, volt→NULL. Story is opt-in; no arrival dialog is added. */
const CHARACTER_PROFILES={
 street:{model:'aki',n:'戰士',title:'近戰與護盾',quote:'接地，再突破。',identity:'職業｜街區電力維護',role:'近戰、連鎖電擊、護盾續戰',passive:'普通攻擊連續命中可累積短暫護盾，上限生命5%。',eff:{inc:10},sig:{n:'短路連打',cd:7,d:'每7秒重擊近處目標，再向最多3個鄰近敵人跳電。'},story:['擅長把城市廢棄的電力裝置改成武器，以護盾承受壓力，再用連鎖電流打開缺口。','三條昇華在接地防護、多人跳電與超載攻勢之間取捨。所有技能與電路配件仍可自由配搭。']},
 frost:{model:'milo',n:'樂師',title:'音波與節拍',quote:'讓節拍穿過靜默。',identity:'職業｜聲場調律',role:'中距離、環形音波、連擊加速',passive:'持續普攻可累積5層節拍，最多加快音波節奏20%；中斷3秒重置。',eff:{apsInc:8},sig:{n:'低頻環流',cd:7,d:'每7秒向半徑42內釋放音波，持續命中可縮短間隔。'},story:['透過舊播放器與共振裝置塑造戰場，用節奏和頻率改變攻勢。','回聲、靜域及疾拍各有不同的施放節奏，並非限定只能使用冰霜或音波技能。']},
 beep:{model:'ping',n:'獵手',title:'投射與鎖定',quote:'確認訊號，鎖定目標。',identity:'職業｜訊號追蹤',role:'遠程投射、標記追蹤、會心',passive:'普攻討伐目標後，下一輪職業連射傷害提高25%。',eff:{crit:6,apsInc:6},sig:{n:'訊號連射',cd:6,d:'每6秒向最多6個目標發出2.8倍訊號彈，依會心率判定。'},story:['以城市通訊裝置追蹤敵人，在單體精度、多人分流與快速走位之間建立攻勢。','選擇定頻狙擊會犧牲清場，分流則降低每發傷害；技能盤仍不鎖武器或元素。']},
 volt:{model:'null',n:'寵機師',title:'寵機與修復',quote:'啟動，保持連線。',identity:'職業｜電子寵機改裝',role:'召喚、持續輸出、修復增益',passive:'寵機每8次有效攻擊可修復1.5%生命，受共用回復額度限制。',eff:{inc:8},sig:{n:'寵機出動',cd:8,d:'寵機持續自動索敵，每8秒增幅4秒，期間寵機傷害提高50%。'},story:['透過可移動的電子寵機提供持續火力，在雙核連擊、維修與熔核濺射中選擇改裝方向。','寵機是職業能力，其他技能仍需手動組裝並接通電路才能生效。']}
};
for(const[key,p]of Object.entries(CHARACTER_PROFILES))Object.assign(CHARS[key],p,{d:p.title+'。'+p.role});
ACHS.boss10.d='討伐BOSS30次，留下資深討伐紀錄。';
function characterRuntime(){if(!G.characterRuntime||G.characterRuntime.id!==G.char)G.characterRuntime={id:G.char,combo:0,lastHit:-10,petCd:0,battery:0,boostUntil:0,receipt:false};return G.characterRuntime;}
function characterBasicHit(target){
 if(G.train)return;const r=characterRuntime(),h=G.h,t=typeof ascensionTuning==='function'?ascensionTuning():{};
 if(G.char==='street'){const old=G.time<(h.bufferUntil||0)?h.buffer||0:0;h.buffer=Math.max(old,Math.min(G.st.life*((G.ascension==='ground'?.09:.05)+(t.shieldCap||0)),old+G.st.life*.005));h.bufferUntil=Math.max(h.bufferUntil||0,G.time+2+(t.shieldDuration||0));}
 if(G.char==='frost'){r.combo=G.time-r.lastHit<3+(t.comboWindow||0)?Math.min((G.ascension==='pace'?8:5)+(t.comboCap||0),r.combo+1):1;r.lastHit=G.time;}
 if(G.char==='beep'&&target.dead)r.receipt=true;
}
function characterCombatTick(dt){
 if(G.train||G.h.dead>0)return;const r=characterRuntime(),t=typeof ascensionTuning==='function'?ascensionTuning():{};
 if(G.char==='frost'){if(G.time-r.lastHit>=3+(t.comboWindow||0))r.combo=0;if(aliveMons().length)G.sigT=(G.sigT||0)+dt*r.combo*(.04+(t.comboRate||0));}
 if(r.echoAt&&G.time>=r.echoAt){r.echoAt=0;y2kSignature(aliveMons(),G.st,true);}
 if(G.char!=='volt')return;const target=nearestMon(false);if(!target)return;
 r.petCd=Math.max(0,r.petCd-dt);if(r.petCd>0)return;r.petCd=Math.max(.6,(G.ascension==='dual'?.8:G.ascension==='melt'?1.5:1.1)+(t.petInterval||0));
 const petMul=(G.ascension==='dual'?.78:G.ascension==='repair'?.8:G.ascension==='melt'?1.05:1)+(t.petMul||0);hitMon(target,G.st.hit*petMul*(G.time<r.boostUntil?1.5:1),false,'寵機');r.battery++;
 if(G.ascension==='dual'){const second=aliveMons().find(m=>m!==target&&Math.hypot(m.x-target.x,m.y-target.y)<24+(t.secondaryRadius||0));if(second)hitMon(second,G.st.hit*(.3+(t.secondaryMul||0)),false,'副核');}
 if(G.ascension==='melt'){for(const m of aliveMons().filter(m=>m!==target&&Math.hypot(m.x-target.x,m.y-target.y)<10+(t.splashRadius||0)).slice(0,3+(t.splashCap||0)))hitMon(m,G.st.hit*(.25+(t.splashMul||0)),false,'熔核濺射');if(!G.offline)addFx({k:'boom',x:target.x,y:target.y,z:BZ+5,t:0,dur:.3});}
 if(!G.offline)addFx({k:'bolt',pts:[[G.h.x+7,G.h.y-2,BZ+12],[target.x,target.y,BZ+7]],t:0,dur:.15});
 if(r.battery>=8+(t.batteryHits||0)){r.battery=0;heroRecover(G.st.life*((G.ascension==='repair'?.03:.015)+(t.healFraction||0)));}
}
function y2kSignature(al,s,echo=false){
 const r=characterRuntime(),h=G.h,t=typeof ascensionTuning==='function'?ascensionTuning():{},sigMul=1+(t.sigHitPct||0),origin=[h.x,h.y,BZ+13];h.characterCastUntil=G.time+.45;
 if(G.char==='street'){
  const targets=al.slice().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y));const first=targets.find(m=>Math.hypot(m.x-h.x,m.y-h.y)<30);if(!first)return;
  const chain=[first,...targets.filter(m=>m!==first&&Math.hypot(m.x-first.x,m.y-first.y)<30+(t.jumpRadius||0)).slice(0,(G.ascension==='arc'?5:3)+(t.chainCount||0))];let from=origin;
  chain.forEach((m,i)=>{const to=[m.x,m.y,BZ+8];hitMon(m,s.hit*(i?2.2+(t.jumpMul||0):6+(t.firstMul||0))*sigMul*(G.ascension==='ground'?.85:G.ascension==='arc'?.9:1),false);if(!G.offline)addFx({k:'bolt',pts:[from,to],t:0,dur:.22});from=to;});
 }else if(G.char==='frost'){
  addFx({k:'ring',x:h.x,y:h.y,col:'#a5d9c1',t:0,dur:.5});for(const m of al)if(Math.hypot(m.x-h.x,m.y-h.y)<42+(t.ringRadius||0)){hitMon(m,s.hit*4.5*sigMul*(m.frozen>0?1+(t.frozenBonus||0):1)*(G.ascension==='echo'?(echo?.28+(t.echoMul||0):.8+(t.waveBody||0)):1),false);if(G.ascension==='still')applyFreeze(m,.5+(t.freezeSeconds||0),s.hit*.5);}
  if(G.ascension==='echo'&&!echo)r.echoAt=G.time+Math.max(.15,.45+(t.echoDelay||0));
 }else if(G.char==='beep'){
  const boost=r.receipt?1.25+(t.receiptBoost||0):1;r.receipt=false;for(const m of al.slice().sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y)).slice(0,(G.ascension==='snipe'?2:G.ascension==='split'?8:6)+(t.shotCap||0))){const shot=rollDmg(s.hit*((G.ascension==='snipe'?4.3:G.ascension==='split'?2.4:2.8)+(t.shotMul||0))*boost*sigMul*(m.hp<m.hpMax*.3?1+(t.execute||0):1));hitMon(m,shot.dmg,shot.crit);if(!G.offline)addFx({k:'bolt',pts:[origin,[m.x,m.y,BZ+8]],t:0,dur:.2});}
 }else if(G.char==='volt'){r.boostUntil=G.time+4;addFx({k:'ring',x:h.x+7,y:h.y-2,col:'#9bcbb6',t:0,dur:.45});}
}
function characterStoryHtml(){const p=CHARACTER_PROFILES[G.char],url=typeof icon3dPortraitUrl==='function'?icon3dPortraitUrl(G.char):'';return `<section class="class-dossier"><div class="class-dossier-head">${url?`<img src="${url}" alt="">`:''}<div><h3>${p.n}</h3><p>${p.role}</p></div></div><ol>${p.story.map(t=>`<li><p>${uxEsc(t)}</p></li>`).join('')}</ol></section>`;}

;
/* ---------- passive tree ---------- */
const EFF_TXT = { life:v => `+${v} 生命`, lifePct:v => `+${v}% 最大生命`, dmgPct:v => `${v}% 增加傷害`, sinc:v => `${v}% 技能傷害`, apsInc:v => `${v}% 攻擊速度`, crit:v => `+${v}% 會心率`, cm:v => `+${v}% 會心傷害`,
  regen:v => `+${v} 生命回復/秒`, leech:v => `${v}% 生命偷取`, armor:v => `+${v} 護甲`, fire:v => `${v}% 火焰傷害`, cold:v => `${v}% 冰霜傷害`, light:v => `${v}% 閃電傷害`, haste:v => `${v}% 技能急速` };
const effText = e => Object.entries(e).map(([k, v]) => EFF_TXT[k](v)).join(',');
const TREE = (() => {
  const nodes = {}, add = (id, x, y, name, eff, big, col) => nodes[id] = { id, x, y, name, eff, big, col, links:[] }, link = (a, b) => { nodes[a].links.push(b); nodes[b].links.push(a); };
  add('S', 0, 0, '起點', {}, true, '#e8e2d4');
  const arms = [
    { k:'A', ang:-90, col:'#e2584d', chain:[{life:20},{armor:15},{lifePct:4},{regen:1.5},{dmgPct:6},{life:25},{armor:20},{lifePct:6}], side:[[{leech:.8},{dmgPct:5}],[{armor:25},{lifePct:4}]], key:['不屈意志',{lifePct:20,armor:60}] },
    { k:'B', ang:30, col:'#6aa8ff', chain:[{sinc:6},{fire:8},{cold:8},{light:8},{haste:4},{sinc:8},{haste:5},{sinc:10}], side:[[{fire:10},{sinc:5}],[{cold:10},{light:10}]], key:['元素共鳴',{sinc:30,fire:12,cold:12,light:12}] },
    { k:'C', ang:150, col:'#7be08a', chain:[{crit:1.5},{apsInc:4},{cm:8},{leech:.6},{crit:2},{apsInc:5},{cm:12},{crit:2.5}], side:[[{apsInc:5},{crit:1.5}],[{cm:10},{dmgPct:6}]], key:['致命節奏',{cm:25,apsInc:12}] },
  ];
  for (const a of arms){
    const dx = Math.cos(a.ang*Math.PI/180), dy = Math.sin(a.ang*Math.PI/180), px = -dy, py = dx; let prev = 'S';
    for (let i = 0; i < 8; i++){ const r = 17 + i*12, id = a.k + i; add(id, dx*r, dy*r, effText(a.chain[i]), a.chain[i], false, a.col); link(prev, id); prev = id; }
    [[2, -1, a.side[0]], [5, 1, a.side[1]]].forEach(([i, sg, effs]) => { const r = 17 + i*12; let from = a.k + i;
      effs.forEach((e, j) => { const id = a.k + 's' + i + j; add(id, dx*(r + j*11 + 6) + px*sg*(13), dy*(r + j*11 + 6) + py*sg*(13), effText(e), e, false, a.col); link(from, id); from = id; }); });
    const r = 17 + 8*12 + 4; add(a.k + 'K', dx*r, dy*r, `${a.key[0]}:${effText(a.key[1])}`, a.key[1], true, a.col); link(a.k + '7', a.k + 'K');
  }
  return nodes;
})();

/* ---------- game state ---------- */
const G = {
  unread:{skills:[],gear:[],cores:[],gems:[],carts:[],maps:[],boards:[]},summons:[],airSupply:null,airBuffs:[],damageLog:[],deathReport:null,
  ascension:null,ascensionNodes:[],circuits:['pocket'],circuitLayouts:{},circuitPity:0,storyFlags:{},city:null,legacyMode:false,legacyTalent:null,castPolicy:'balanced', signalCharge:0, readySince:{}, castSerial:0, time:0, lvl:1, xp:0, gold:0, depth:1, maxDepth:1, kills:0, need:60, bossOut:false, push:true, speed:1, filter:0, deaths:0, spawnCd:.5, totalKills:0,
  tutorial:null,skillCollectionVersion:1,skillBooks:{},skillPity:0,coreDust:0, inventory:[], nextGearId:1, inventoryRevision:0, autoEquip:false, storageRecycled:0, whUp:0, offUp:0, chips:0, equip:Object.fromEntries(Object.keys(SLOTN).map(k=>[k,null])), armory:{}, equipBackup:{}, deferChoices:false, gemTier:{}, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
  pass:[], autoCard:false, ach:{}, legSeen:{}, pity:0, towerBest:0, quest:0, craftN:0, mk:{}, seenG:{}, seenC:{}, cz:1, userCz:false, dmgNum:1, seenInv:0, seenParts:0, seenGoals:0, builds:[null, null, null], bi:0, bossHp:0, parts:0, cos:{ auraStyle:'0', tstyle:'0', hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, own:{}, heroName:'', born:[new Date().getMonth() + 1, new Date().getDate()], relics:{}, relicPicks:0, offerR:null, sunT:0, bossKills:0, char:'street', cards:{}, picks:0, offer:null, maps:[], run:null, cds:{ FIRE:1.2, FROST:1, CHAIN:1, METEOR:2, PULSE:1, MAGNET:1, SPAM:1, BEAM:1 },
  h:{ x:HX, y:HY, vx:0, vy:0, gx:HX, gy:HY, aiT:0, mv:0, hp:100, swingT:-1, swingHit:true, atkCd:0, castT:-1, castFired:true, castSk:'FIRE', hurtT:0, dead:0, potCd:0 },
  lgK:0, lgC:0, mons:[], drops:[], proj:[], fx:[], floats:[], timers:[], log:[], st:null, dirty:true, offline:false, paused:false, off:null, lastWall:Date.now(),
};
/* 打擊感：畫面震動、縮放衝擊、邊緣閃光；視角旋轉（yaw）也放這裡 */
const FXO = { shake:0, flash:0, fc:'#fff', punch:0, yaw:0, yawT:0, zoom:1, zoomT:1, stop:0 };
function viewEffectsReduced(){return typeof GAME_VIEW!=='undefined'&&GAME_VIEW.prefs.reducedEffects||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
function hitStop(t){if(viewEffectsReduced()||G.offline||G.time-(FXO.stopAt??-10)<.6||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;FXO.stopAt=G.time;FXO.stop=Math.max(FXO.stop,Math.min(.07,t));}
function kick(s,f,c,p){
 if(G.offline||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;
 const noShake=typeof GAME_VIEW!=='undefined'&&GAME_VIEW.prefs.shake===false;
 if(!noShake)FXO.shake=Math.max(FXO.shake,Math.min(4.5,s));
 if(!viewEffectsReduced()&&f&&G.time-(FXO.flashAt??-10)>.45){FXO.flash=Math.max(FXO.flash,Math.min(.45,f));FXO.fc=c||'#fff';FXO.flashAt=G.time;}
 if(p&&!noShake)FXO.punch=Math.max(FXO.punch,Math.min(.8,p));
}
/* 接線板：玩家擺的是 G.board；G.slots / G.supp / G.suppW 由它推導出來，戰鬥與屬性計算照舊讀這幾個 */
function newBoard(){ G.board = GridLab.createBoard(); }
function syncBoard(){
  if(!G.board)G.board=GridLab.createBoard();
  if(G.board.v!==6)G.board=GridLab.adopt(G.board,G.lvl);
  const res = GridLab.resolve(G.board, G.lvl), keyOf = id => G.board.pieces.find(p => p.id === id).key;
  G.slots = res.filter(r=>r.wired).map(r => r.key);
  G.modeOf = {}; for (const r of res){ const p = G.board.pieces.find(q => q.id === r.id); if (p.mode && MODES[p.mode] && MODES[p.mode].sk === p.key) G.modeOf[p.key] = p.mode; }
  G.supp = {}; G.suppW = {}; for (const id of Object.keys(SKILLS)){ G.supp[id] = []; G.suppW[id] = []; }
  for (const r of res){ G.supp[r.key] = r.linked.map(keyOf); G.suppW[r.key] = r.weights; }
  for (const id of G.slots) if (G.cds[id] == null) G.cds[id] = 1;
}
// 任何舊版面板（方塊拼圖）的存檔：解出原本的連接，搬到接線板；放不下的配件留在庫存
function sanitizeBoard(old){ G.board = GridLab.adopt(old, G.lvl); }
// 很舊的存檔（技能槽加輔助孔）：依序放進插槽，輔助放到各自的線上
function boardFromLegacy(slots, supp){ G.board = GridLab.fromLegacy(slots, supp, G.lvl); }
// 接線板沒有整列整欄或相鄰技能的共鳴加成；保留空結果讓結算公式不用改
function boardBonus(){ return { rows:0, cols:0, pair:{} }; }
const gemUsed = id => G.board ? G.board.pieces.filter(p => p.kind === 'support' && p.key === id).length : 0;
const cartUsed = id => G.board ? G.board.pieces.filter(p => p.mode === id).length : 0;
const cartFree = id => (G.carts[id] || 0) - cartUsed(id);
const gemFree = id => (G.gems[id] || 0) - gemUsed(id);
// 配件階級：G.gems 是持有總數（含各階），G.gemTier[id] = [Ⅱ 的數量, Ⅲ 的數量]
const gemTierN = id => (G.gemTier && G.gemTier[id]) || [0, 0];
const gemOwnT = (id, t) => t === 1 ? Math.max(0, (G.gems[id] || 0) - gemTierN(id)[0] - gemTierN(id)[1]) : gemTierN(id)[t - 2];
const gemUsedT = (id, t) => G.board ? G.board.pieces.filter(p => p.kind === 'support' && p.key === id && (p.t || 1) === t).length : 0;
const gemFreeT = (id, t) => gemOwnT(id, t) - gemUsedT(id, t);
const TIER_NAME = ['', 'Ⅱ', 'Ⅲ'];
function normTier(){ const t = {}; for (const id of Object.keys(SUPPS)){ const a = G.gemTier && G.gemTier[id]; if (!Array.isArray(a)) continue; const tot = G.gems[id] || 0; const n3 = Math.min(Math.max(0, a[1] | 0), tot), n2 = Math.min(Math.max(0, a[0] | 0), tot - n3); if (n2 || n3) t[id] = [n2, n3]; } G.gemTier = t; }
const passPoints = () => Math.max(0,talentBudget()-G.pass.length);
const nodeOpen = id => !G.pass.includes(id) && id !== 'S' && TREE[id].links.some(l => l === 'S' || G.pass.includes(l));
const biomeNow = () => G.run ? G.run.map.biome : (typeof towerNormalBiome==='function'?towerNormalBiome(Math.floor((G.depth-1)/4)):Math.floor((G.depth-1)/4)%BIOMES.length);
const lvlNow = () => G.run ? G.run.map.lvl : G.depth;
const runQ = () => G.run ? G.run.map.mods.reduce((a, m) => a + MODS[m].q, 0) : 0;

/* ---------- items ---------- */
function rollAff(k, il, boost=1){
  const r=Math.random(),tier=il>=25&&r<.015?0:il>=12&&r<.1?1:il>=5&&r<.35?2:r<.7?3:4;
  const v=AFF[k].b(il)*[1.65,1.35,1.1,.88,.65][tier]*(.9+Math.random()*.2)*boost;
  return {k,v:k==='leech'?Math.round(v*10)/10:Math.max(1,Math.round(v)),tier};
}
function affPickKeys(slot,have,n,sameGroup=null){
  const cnt={m:0,s:0};for(const k of have)cnt[AFF[k]?.g||'m']++;
  const out=[];for(const k of POOL[slot].filter(k=>!have.includes(k)).sort(()=>Math.random()-.5)){
    const g=AFF[k].g;if(sameGroup&&g!==sameGroup)continue;if(cnt[g]>=3)continue;out.push(k);cnt[g]++;if(out.length>=n)break;}
  return out;
}
function makeItem(slot, rar, il, forcedCore=null){
  const n = rar === 0 ? 0 : rar === 1 ? (Math.random() < .5 ? 1 : 2) : rar === 2 ? (Math.random() < .5 ? 3 : 4) : 4;
  const LG = rar === 3 ? (coreSlot(forcedCore)===slot?LEGEND_BY[forcedCore]:tPick(LEGENDS[slot].filter(L=>!L.owner))) : null, keys = rar === 3 ? LG.aff.slice() : affPickKeys(slot,[],n);
  const aff = keys.map(k => rollAff(k, il, rar === 3 ? 1.35 : 1));
  const tier = Math.min(3, Math.floor(il/6));
  const bs = rar === 3 ? 0 : Math.floor(Math.random()*(SERIES[slot]?.length||1));
  const imp = gearImplicit(slot,il,bs);
  let name = baseName(slot,il,bs);
  if (rar === 1) name = PREF[aff[0].k] + name; else if (rar === 2) name = tPick(RARE_NAMES[slot]); else if (rar === 3) name = LG.name;
  if (LG) G.legSeen[LG.id] = 1;
  return LG ? { slot, r:rar, il, name, imp, aff, lg:LG.id } : { slot, r:rar, il, name, imp, aff, bs };
}
function refinedImplicitValue(it,il){
 const expected=gearImplicit(it.slot,il,it.bs||0);if(expected.k===it.imp.k)return expected.v;
 const oldSlot={armor:'armor',crit:'ring',dmg:'weapon'}[it.imp.k];return oldSlot?gearImplicit(oldSlot,il).v:it.imp.v;
}
function rollSignatureGear(kind,il){
  if(Math.random() >= (SIGNATURE_DROP[kind]||0))return null;
  const gear=tPick(Object.values(SIGNATURE_GEAR));return makeItem(gear.slot,3,il,gear.id);
}
function rarityRoll(boss){
  const bonus = Math.min(8, lvlNow()*.25) + Math.min(8,(G.st?.rarity||0)*.08) + runQ()*6 + (G.run && G.run.map.mods.includes('lucky') ? 4 : 0), w = [RAR[0].w - bonus*2, RAR[1].w, RAR[2].w + bonus, RAR[3].w + bonus*.3];
  let r = Math.random()*w.reduce((a, b) => a + b, 0), i = 0; while (r > w[i] && i < 3) r -= w[i++];
  if (boss){ if (i < 2) i = 2; if (Math.random() < Math.min(1, .1 + .06*(G.pity || 0) + (G.relics.LUCK ? .03 : 0))) i = 3; }   // BOSS暗金保底：每次沒出就 +6%，最多 15 件必出
  if (boss){ if (i === 3) G.pity = 0; else G.pity = (G.pity || 0) + 1; }
  return i;
}
const itemValue = it => Math.round((1 + it.r*2.2) * (4 + it.il*2.4));
const itemLines = it => [it.imp, ...it.aff].map((a, i) => ({ t:(i?`T${affTier(a,it.il)} · `:'')+AFF[a.k].t(a.v), imp:i === 0 })).concat(it.cr ? [{ t:'已腐化', lg:true }] : []).concat(it.lg && LEGEND_BY[it.lg] ? [{ t:'★ ' + LEGEND_BY[it.lg].d, lg:true }] : []);
const offPen = () => G.offline && G.offPen;   // 離開超過 60 秒才算離線：經驗 75%、掉落 25%；暗金資格與保底和線上相同；短暫切走只是快轉補上
const salvage = it => { G.parts = (G.parts || 0) + [1, 2, 5, 12][it.r]; };   // 拆下的裝備變成零件，拿去改機
const lgOn = id => Object.values(G.equip).some(it => it && it.lg === id);
const coreSlot = id => Object.keys(LEGENDS).find(slot => LEGENDS[slot].some(it => it.id === id));
function syncCoreCollection(){
  if (!G.armory) G.armory = {};
  for (const slot of Object.keys(SLOTN)){
    const it = G.equip[slot];
    if (it?.lg && coreSlot(it.lg) === slot) G.armory[it.lg] = it;
  }
}
function equipCore(id){
  const slot = coreSlot(id), it = G.armory?.[id];
  if (!slot || !it || !canUseGear(it) || G.equip[slot]?.lg === id) return false;
  if(G.equip[slot]&&!G.equip[slot].lg)storeGear(G.equip[slot]);
  if(typeof onboardingEvent==='function')onboardingEvent('equip');G.autoEquip=false;G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function restoreEquipment(slot){
  const last = G.equipBackup?.[slot];
  if (!last || last.slot !== slot) return false;
  const it = last.lg ? G.armory[last.lg] : last;
  if (!it || !canUseGear(it)) return false;
  if(typeof onboardingEvent==='function')onboardingEvent('equip');G.autoEquip=false;G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function makeMap(lvl){
  const keys = Object.keys(MODS).sort(() => Math.random() - .5).slice(0, 2 + Math.floor(Math.random()*3));
  return { id:Math.random().toString(36).slice(2, 8), lvl, biome:Math.floor(Math.random()*(typeof TOWER_BIOME_START==='number'?TOWER_BIOME_START:BIOMES.length)), mods:keys };
}

/* ---------- 目標 ---------- */
const GOAL_STAT = { kills:() => G.totalKills, lvl:() => G.lvl, depth:() => G.maxDepth, runs:() => G.mapsDone, modes:() => Object.keys(G.seen).length, craft:() => G.craftN || 0 };
const goalRewardText = r => [r.gold && `金幣 ${r.gold}`, r.parts && `零件 ${r.parts}`, r.gem && `輔助：${SUPPS[r.gem].n}`, r.cart && `卡匣：${G.seen[r.cart] ? MODES[r.cart].n : '未鑑定的' + SKILLS[MODES[r.cart].sk].n + '卡匣'}`].filter(Boolean).join('、');
function checkQuest(){
  for (let g = 0; g < 4; g++){
    const q = QUESTS[G.quest || 0]; if (!q || GOAL_STAT[q.k]() < q.goal) return;
    const r = q.rw; G.quest = (G.quest || 0) + 1;
    if (r.gold) G.gold += r.gold; if (r.parts) G.parts = (G.parts || 0) + r.parts; if(r.gem){G.gems[r.gem]=(G.gems[r.gem]||0)+1;noticeNew('gems',r.gem);} if(r.cart){G.carts[r.cart]=(G.carts[r.cart]||0)+1;noticeNew('carts',r.cart);}
    logLine(`任務完成：${q.n}（${[r.gold && '金幣 ' + r.gold, r.parts && '零件 ' + r.parts, r.gem && '輔助：' + SUPPS[r.gem].n, r.cart && '卡匣'].filter(Boolean).join('、')}）${q.tip ? ' ' + q.tip : ''}`, '#1f9bbf'); addFloat(HX + 3, HY, BZ + 26, '任務完成！', '#1f9bbf', 3.8); G.dirty = true;
  }
}
const tabOpen = k => !TAB_LVL[k] || G.lvl >= TAB_LVL[k];
function checkGoals(){
  checkQuest();
  for (const a of GOALS){
    if (G.goals[a.id] || GOAL_STAT[a.k]() < a.goal) continue;
    G.goals[a.id] = 1; const r = a.rw;
    if (r.gold) G.gold += r.gold; if(r.gem){G.gems[r.gem]=(G.gems[r.gem]||0)+1;noticeNew('gems',r.gem);} if(r.cart){G.carts[r.cart]=(G.carts[r.cart]||0)+1;noticeNew('carts',r.cart);}
    logLine(`目標達成：${a.n}（${goalRewardText(r)}）`, '#d18a00'); addFloat(HX + 3, HY, BZ + 26, '目標達成！', '#d18a00', 3.8); G.dirty = true;
  }
}

/* ---------- stats ---------- */
function calc(equip = G.equip, pass = G.pass, slots = G.slots, supp = G.supp, forceModern=false){
  const s = { life:0, dmg:5 + 1.8*G.lvl, inc:0, crit:5, cm:150, apsInc:0, regen:1.5, leech:0, armor:0, fire:0, cold:0, light:0, haste:0, sinc:0, lifePct:0, dodge:10, armorPct:0, ele:0, vsElite:0, takenRed:0, killHeal:0, goldPct:0, xpPct:0, rarity:0, moveSpd:0 };
  const baseLife = 90 + 14*G.lvl;
  for (const k in equip){ const it = equip[k]; if (!it || !canUseGear(it)) continue; for (const a of [it.imp, ...it.aff]) s[STAT_KEY[a.k]] += a.v; }
  for (const [k, v] of Object.entries(CHARS[G.char].eff)) s[k] += v;
  const asc=typeof ascendInfo==='function'?ascendInfo():null;if(asc)for(const[k,v]of Object.entries(asc.eff))s[k]+=v;
  if(typeof ascensionNodeEffects==='function')for(const[k,v]of Object.entries(ascensionNodeEffects()))s[k]+=v;
  s.regen=Math.max(0,s.regen);s.dodge=Math.min(35,s.dodge);s.signatureCd=CHARS[G.char].sig.cd*(G.ascension==='drive'?.9:1)*Math.max(.7,1+(typeof ascensionTuning==='function'?ascensionTuning().sigCdPct||0:0));
  s.inc += achCount();
  for (const [id, n] of Object.entries(G.cards)){ const c = CARDS[id]; if (c && c.st) s[c.st] += c.v*n; }
  for (const id of Object.keys(G.relics)){ const r = RELICS[id]; if (r && r.st) s[r.st] += r.v; }
  if (G.relics.VEST) s.lifePct += 10;
  for (const id of pass){ const n = TREE[id]; if (!n) continue; for (const [k, v] of Object.entries(!forceModern&&G.legacyMode?n.eff:FIRMWARE[id]?.eff||n.eff)) s[k === 'dmgPct' ? 'inc' : k] += v; }
  const modern=forceModern||!G.legacyMode;s.firmware=modern?pass.filter(id=>FIRMWARE[id]):[];
  const city=G.run?.city;if(city){s.sinc+=18*city.branches.filter(id=>id==='cache').length;s.lifePct-=12*city.branches.filter(id=>id==='cache').length;}
  s.crit=Math.max(0,s.crit);s.apsInc=Math.max(-60,s.apsInc);
  s.fire+=s.ele;s.cold+=s.ele;s.light+=s.ele;s.armor*=1+s.armorPct/100;s.takenRed=Math.min(40,s.takenRed);s.moveSpd=Math.min(30,s.moveSpd);s.killHeal=Math.min(3,s.killHeal);
  s.life = (baseLife + s.life) * (1 + s.lifePct/100);
  if(city)s.regen+=s.life*.01*city.branches.filter(id=>id==='safe').length;
  s.aps = Math.min(4, 1 + s.apsInc/100);
  s.red = Math.min(.6, s.armor / (s.armor + 80 + 16*G.lvl));
  const bb=modern&&pass.includes('CK')?{rows:0,cols:0,pair:{}}:boardBonus(); s.crit += 5*bb.cols; s.bb = bb;
  s.critAvg = 1 + Math.min(s.crit, 100)/100 * (s.cm/100 - 1);
  s.hit = s.dmg * (1 + s.inc/100);
  s.sk = {}; let dps2 = 0;
  for (const id of slots){ if (!id) continue;
    const K = SKILLS[id], sp = supp[id] || [];
    const pattern=skillPattern(id,G.modeOf[id]),sw=supp===G.supp&&(G.suppW||{})[id]&&G.suppW[id].length===sp.length?G.suppW[id]:null,mod=GridLab.skillMods(sp,id,sw);
    if(sp.includes('SPREAD')){if(pattern.range)pattern.range*=1.4;if(pattern.width)pattern.width*=1.4;}
    const hit=s.dmg*K.mult*(1+(s.inc+s[K.el]+s.sinc)/100)*
      (Object.values(equip).some(it=>it&&it.lg==='W_MULTI')?1+.15*slots.filter(Boolean).length:1)*
      mod.hit*(modern&&pass.includes('AK')?.85:1)*(modern&&pass.includes('EK')?.85:1)*(modern&&pass.includes('CK')&&slots.length<=3?1.35:1)*(modern&&pass.includes('BK')&&new Set(slots.map(id=>SKILLS[id]?.el)).size===3?1.3:1)*(1+.12*bb.rows)*(bb.pair[id]?1.15:1);
    const rawCd=GridLab.cooldown(K.cd,sp,s.haste,pattern.cd||1,sw),crit=Math.min(100,s.crit+mod.crit);
    const extra=mod.twin*GridLab.LIMITS.repeatDamage+(mod.repeat?.45:0)+(pass.includes('EK')?(modern?.6:.35):0);
    const cd=id==='FLICKER'?Math.max(rawCd,extra>0?2.6:2.1):rawCd;
    let direct=skillDirectFactor(id,pattern)+extra*skillDirectFactor(id,pattern,true);
    if(id==='FLICKER'&&extra>0){const left=Math.max(0,6-pattern.count),strength=mod.twin>0?GridLab.LIMITS.repeatDamage:mod.repeat?.45:modern?.6:.35,rest=pattern.each*(left+(left>=pattern.count?pattern.last-1:0));direct=skillDirectFactor(id,pattern)+Math.min(extra*skillDirectFactor(id,pattern,true),rest*strength);}

    s.sk[id]={mode:G.modeOf[id]||null,pattern,hit,cd,crit,has:sp.filter(Boolean),supportPower:Object.fromEntries([...new Set(sp)].map(key=>[key,Math.max(...sp.map((id,i)=>id===key?(sw?sw[i]:1):0))])),area:mod.area,twin:mod.twin,leech:mod.leech,
      direct:hit*(1+crit/100*(s.cm/100-1))*direct};
  }
  // Capacity-aware direct-hit preview. Conditions, DoT, signatures and on-kill effects are measured in training instead.
  const skills=Object.values(s.sk),period=k=>Math.max(GridLab.LIMITS.castTime,k.cd);
  let wait=0;
  if(skills.reduce((sum,k)=>sum+1/period(k),0)>1/GridLab.LIMITS.castTime){
    let lo=0,hi=skills.length*GridLab.LIMITS.castTime;
    for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(skills.reduce((sum,k)=>sum+1/(period(k)+mid),0)>1/GridLab.LIMITS.castTime)lo=mid;else hi=mid;}
    wait=hi;
  }
  for(const k of skills){k.estimatedCasts=1/(period(k)+wait);dps2+=k.direct*k.estimatedCasts;}
  s.queueDelay=wait;s.dps=s.hit*s.critAvg*s.aps+dps2;
  s.power = s.dps * Math.sqrt(s.life / (1 - s.red));
  return s;
}
function recalc(){ syncBoard(); syncCoreCollection(); for(const slot of Object.keys(SLOTN))if(!canUseGear(G.equip[slot]))G.equip[slot]=null; const old = G.st; G.st = calc(); if(old?.sk?.BEAM?.mode!==G.st.sk.BEAM?.mode)G.signalCharge=0; const h=G.h;if(!G.st.firmware.includes('AK'))h.buffer=0;else h.buffer=Math.min(h.buffer||0,G.st.life*.12); h.hp = old ? h.hp * G.st.life / old.life : G.st.life; G.dirty = true; }
const achCount = () => Object.keys(G.ach).length;
function checkAch(){ for (const [id, a] of Object.entries(ACHS)) if ((GAME_FEATURES.cardChoices||id!=='card10') && !G.ach[id] && a.ok()){ G.ach[id] = 1; recalc(); logLine(`成就解鎖：${a.n}（永久傷害 +1%）`, '#c28a00'); addFloat(HX, HY, BZ + 26 + 2, a.n, '#c28a00', 4); SFX('rare'); G.dirty = true; } }
const charOk = id => Object.hasOwn(CHARS,id)&&id===G.char;
function pickChar(id){return id===G.char;}
const cardN = id => G.cards[id] || 0;
function rollCards(n = 3){
  const pool = Object.entries(CARDS).filter(([id, c]) => c.sk ? G.slots.includes(c.sk) && cardN(id) < c.max : true).map(([id, c]) => ({ id, w:c.sk ? 4 : 10 })), out = [];
  while (out.length < n && pool.length){ let r = Math.random()*pool.reduce((a, x) => a + x.w, 0), i = 0; while (i < pool.length - 1 && r >= pool[i].w){ r -= pool[i].w; i++; } out.push(pool.splice(i, 1)[0].id); }
  return out;
}
function rollRelics(n = 3){ const pool = Object.keys(RELICS).filter(id => !G.relics[id]); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]); return out; }
function takeRelic(id){ if(!GAME_FEATURES.cardChoices)return; G.relics[id] = 1; G.relicPicks = Math.max(0, G.relicPicks - 1); G.offerR = null; recalc(); logLine(`入手遺物：${RELICS[id].n}`, '#c28a00'); }
function takeCard(id){ if(!GAME_FEATURES.cardChoices)return; G.cards[id] = cardN(id) + 1; G.picks = Math.max(0, G.picks - 1); G.offer = null; recalc(); const c = CARDS[id]; logLine(`改裝：${c.n}`, c.sk ? '#8e3fd1' : '#2b6fa8'); }
function resolveOfflineChoices(summary){ if(!GAME_FEATURES.cardChoices)return;
  if (!G.autoCard){
    if (G.picks > 0 || G.relicPicks > 0) G.deferChoices = true;
    return;
  }
  G.deferChoices = false;
  while (G.picks > 0){ const id = rollCards(1)[0]; if (!id) break; summary.cards.push(CARDS[id].n); takeCard(id); }
  while (G.relicPicks > 0){ const id = rollRelics(1)[0]; if (!id){ G.relicPicks = 0; break; } summary.cards.push(RELICS[id].n); takeRelic(id); }
}
const xpNeed = L => Math.round(30 * Math.pow(1.32, L-1));
function logLine(txt, col){ if (G.offline) return; if (typeof bossPush === 'function') bossPush(txt, col && col.length === 7 && col.toLowerCase() === '#2b2552' ? null : col, 'INFO'); G.log.unshift({ txt, col:col || '#2b2552' }); if (G.log.length > 9) G.log.pop(); G.dirty = true; }
function addFloat(x, y, z, txt, col, size=3.6, kind='event'){ if (G.offline) return; if(G.floats.length>=20)G.floats.shift(); G.floats.push({ x, y, z, txt, col, size, kind, t:0 }); }
const PICKUP_RANGE = 26;   // 撿取範圍：範圍內開始吸附，物件本體抵達後結算，距離不改
function addFx(e){if(G.offline)return;const cap=viewEffectsReduced()?14:64;if(G.fx.length>=cap&&e.sustained){const i=G.fx.findIndex(f=>!f.sustained);if(i>=0)G.fx.splice(i,1);}if(G.fx.length<cap)G.fx.push(e);}

/* ---------- save / load ---------- */
const SAVE_KEY = 'idle-hero-save-v2';
function serialize(){ return { v:2,tutorial:G.tutorial,activityLoot:G.activityLoot,rift:G.rift,towerRoomVersion:1,skillCollectionVersion:1,skillBooks:G.skillBooks||{},skillPity:G.skillPity||0,season:G.season,secrets:G.secrets,unread:G.unread,deathReport:G.deathReport, careerVersion:1,ascension:G.ascension||null,ascensionNodes:G.ascensionNodes||[],circuits:G.circuits||[G.board.template],circuitLayouts:G.circuitLayouts||{},circuitPity:G.circuitPity||0,startingChar:G.startingChar||null, equipmentVersion:2, progressionVersion:1,storyFlags:G.storyFlags,city:G.city,legacyMode:G.legacyMode,legacyTalent:G.legacyTalent,t:Date.now(), castPolicy:G.castPolicy, lvl:G.lvl, xp:G.xp, gold:G.gold, depth:G.depth, maxDepth:G.maxDepth, kills:G.kills, push:G.push, speed:G.speed, filter:G.filter, deaths:G.deaths, totalKills:G.totalKills,
  coreDust:G.coreDust,inventory:G.inventory,nextGearId:G.nextGearId,autoEquip:G.autoEquip,storageRecycled:G.storageRecycled,whUp:G.whUp,offUp:G.offUp,chips:G.chips,groundDrops:G.drops.filter(d=>!d.done),equip:G.equip, armory:G.armory, equipBackup:G.equipBackup, deferChoices:G.deferChoices, gems:G.gems,gemTier:G.gemTier, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, mk:G.mk, seenG:G.seenG, seenC:G.seenC, cz:G.cz, userCz:G.userCz, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:Number.isFinite(G.train?.hpBefore)?G.train.hpBefore*G.st.life:G.h.hp, log:G.log.slice(0, 5) }; }
/* Old three-slot saves keep every item and reference; only signature categories move. */
function migrateEquipmentSlots(input){
 if(input.equipmentVersion===2)return input;
 const o=copyState(input),empty=()=>Object.fromEntries(Object.keys(SLOTN).map(k=>[k,null]));
 const fix=it=>{if(it&&SIGNATURE_GEAR[it.lg])it.slot=SIGNATURE_GEAR[it.lg].slot;return it;};
 o.armory=o.armory||{};for(const it of Object.values(o.armory))fix(it);
 for(const it of o.inventory||[])fix(it);for(const d of o.groundDrops||[])if(d.it)fix(d.it);
 for(const key of ['equip','equipBackup']){const group=empty();for(const it of Object.values(o[key]||{})){fix(it);if(!it||!SLOTN[it.slot])continue;if(it.lg&&!o.armory[it.lg])o.armory[it.lg]=it;if(!group[it.slot])group[it.slot]=it;}o[key]=group;}
 const byUid=new Map((o.inventory||[]).map(it=>[it.uid,it]));
 const build=b=>{if(!b?.equipment)return;const refs=empty();for(const [slot,r]of Object.entries(b.equipment)){const target=r?.kind==='core'?coreSlot(r.id):r?.kind==='gear'?(byUid.get(r.uid)?.slot||slot):slot;if(SLOTN[target])refs[target]=r;}b.equipment=refs;};
 for(const b of o.builds||[])build(b);for(const b of o.legacyTalent?.builds||[])build(b);
 o.equipmentVersion=2;return o;
}
function applySave(o){
  if (!o || o.v !== 2) return false;
  o=migrateEquipmentSlots(o);
  if(typeof seasonClean==='function'){G.season=seasonClean(o.season);G.rift=riftClean(o.rift);G.tutorial=typeof onboardingClean==='function'?onboardingClean(o.tutorial):null;G.activityLoot={tower:Math.max(0,Math.min(1e6,Math.floor(o.activityLoot?.tower)||0)),season:Math.max(0,Math.min(1e6,Math.floor(o.activityLoot?.season)||0))};seasonEnsure();}
  G.secrets=[...new Set((Array.isArray(o.secrets)?o.secrets:[]).filter(id=>['arcade','floor13','radio'].includes(id)))];if(typeof clearHeroAilments==='function')clearHeroAilments();
  G.unread=cleanUnread(o.unread);G.summons=[];G.airSupply=null;G.airBuffs=[];G.damageLog=[];G.h.fatalSource=null;G.h.airShield=0;G.h.airShieldUntil=0;G.deathReport=cleanDeathReport(o.deathReport);
  G.startingChar=Object.hasOwn(CHARS,o.startingChar)?o.startingChar:null;
  const uidSeen=new Set(),uidConflicts=new Set();for(const it of Array.isArray(o.inventory)?o.inventory:[]){if(uidSeen.has(it.uid))uidConflicts.add(it.uid);uidSeen.add(it.uid);}
  G.storyFlags=Object.fromEntries(Object.entries(o.storyFlags||{}).filter(([k,v])=>/^p(?:[0-9]|1[01])$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=3));
  G.castPolicy=o.castPolicy==='combo'?'combo':'balanced';G.signalCharge=0;G.readySince={};G.combat=null;G.castSerial=0;G.signalGainRoot=null;G.h.castT=-1;G.h.swingT=-1;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','gemTier','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','mk','seenG','seenC','cz','userCz','autoFold','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  normTier();G.builds=Array.isArray(o.builds)?o.builds.slice(0,3):[null,null,null];G.bi=[0,1,2].includes(o.bi)?o.bi:0;
  if (o.seenC === undefined) G.seenC = { ...G.carts };
  G.armory = Object.fromEntries(Object.entries(o.armory || {}).filter(([id,it]) => coreSlot(id) && it && it.lg === id && it.slot === coreSlot(id) && Array.isArray(it.aff) && it.imp));
  G.equipBackup = Object.fromEntries(Object.entries(o.equipBackup || {}).filter(([slot,it]) => SLOTN[slot] && it?.slot === slot && Array.isArray(it.aff) && it.imp));
  G.deferChoices = o.deferChoices === true;
  G.inventory=(Array.isArray(o.inventory)?o.inventory:[]).filter(validGear).slice(0,200+100*Math.min(WH_UP_MAX,Math.max(0,Math.floor(+o.whUp||0))));
  {const used=new Set();let next=1;for(const it of G.inventory){if(!Number.isSafeInteger(it.uid)||it.uid<1||it.uid>1e8||used.has(it.uid)){while(used.has(next))next++;it.uid=next++;}used.add(it.uid);}G.nextGearId=Math.max(1,...used)+1;}G.autoEquip=false;
  G.coreDust=Number.isSafeInteger(o.coreDust)?Math.max(0,o.coreDust):0;G.storageRecycled=Math.max(0,+o.storageRecycled||0);G.whUp=Math.min(WH_UP_MAX,Math.max(0,Math.floor(+o.whUp||0)));G.offUp=Math.min(OFF_UP_MAX,Math.max(0,Math.floor(+o.offUp||0)));G.chips=Math.max(0,+o.chips||0);G.inventoryRevision++;
  for(const group of [G.equip,G.equipBackup])for(const slot of Object.keys(group)){const it=group[slot];if(validGear(it)&&!it.lg){storeGear(it);group[slot]=G.inventory.find(x=>x.uid===it.uid)||it;}}

  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!Object.hasOwn(CHARS,G.char)) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = (Array.isArray(o.groundDrops)?o.groundDrops:[]).filter(validDrop).map(d=>({...d,t:Number.isFinite(d.t)?d.t:0,done:false,pull:d.pull&&Number.isFinite(d.pull.age)&&Number.isFinite(d.pull.duration)&&d.pull.duration>0?{age:Math.max(0,Math.min(d.pull.age,1.65)),duration:Math.max(.85,Math.min(d.pull.duration,1.65))}:null})); G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces) sanitizeBoard(o.board); else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  G.ascension=typeof ASCENSIONS!=='undefined'&&ASCENSIONS[G.char]?.some(a=>a.id===o.ascension)?o.ascension:null;G.ascensionNodes=typeof ascensionCleanNodes==='function'?ascensionCleanNodes(G.ascension,o.ascensionNodes):[];G.circuits=Array.isArray(o.circuits)?o.circuits:['pocket',G.board.template];G.circuitLayouts=o.circuitLayouts&&typeof o.circuitLayouts==='object'?Object.fromEntries(Object.entries(o.circuitLayouts).filter(([id])=>Object.hasOwn(GridLab.TEMPLATES,id)).map(([id,b])=>[id,GridLab.adopt({...b,template:id})])):{};G.circuitPity=Math.max(0,Math.min(3,+o.circuitPity||0));if(typeof cleanCircuitInventory==='function')cleanCircuitInventory();
  loadProgression(o);if(typeof seasonRunValid==='function'){if(G.run?.city&&!seasonRunValid(G.run.city))G.run=null;cleanTowerStair(G.run);}
  if(typeof skillCollectionMigrate==='function')skillCollectionMigrate(o);if(G.run?.tower){G.run.map.biome=towerBiome(G.run.floor);if(o.towerRoomVersion!==1)for(const d of G.drops){const p=terrainProject(d.x,d.y),dist=Math.hypot(p[0]-HX,p[1]-HY)||1;[d.x,d.y]=terrainProject(HX+(p[0]-HX)*Math.min(1,24/dist),HY+(p[1]-HY)*Math.min(1,24/dist));}}
  normalizeBuilds(uidConflicts);recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
}
function saveGame(){if(G.__wipe)return false;try{if(typeof rankCheck==='function')rankCheck();if(typeof profileSave==='function')return profileSave();localStorage.setItem(SAVE_KEY,JSON.stringify(serialize()));return true;}catch(e){return false;}}
function loadGame(){if(typeof profileLoad==='function')return profileLoad();try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){return null;}}

const encodeSave = () => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); } catch (e) { return ''; } };
const decodeSave = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); } catch (e) { return null; } };


const WH_UP_MAX=5,OFF_UP_MAX=6,whCap=()=>200+100*(G.whUp||0),offCapSec=()=>(6+(G.offUp||0))*3600;
/* Manual equipment ownership; overflow recycling has a visible counter. */
const validGear=it=>!!(it&&SLOTN[it.slot]&&Number.isInteger(it.r)&&it.r>=0&&it.r<=3&&it.imp&&AFF[it.imp.k]&&Number.isFinite(it.imp.v)&&Number.isFinite(it.il)&&it.il>0&&Array.isArray(it.aff)&&it.aff.every(a=>AFF[a.k]&&Number.isFinite(a.v)));
function affTier(a,il=1){if(Number.isInteger(a.tier)&&a.tier>=0&&a.tier<=4)return a.tier;const ratio=a.v/AFF[a.k].b(il);return ratio>=1.5?0:ratio>=1.2?1:ratio>=1?2:ratio>=.8?3:4;}
function gearPriority(it){return it.r*10000000000+(4-Math.min(4,...it.aff.map(a=>affTier(a,it.il))))*10000000+Math.min(9999,it.il);}
function storeGear(it){
  if(!validGear(it)||it.lg)return false;
  if(it.uid&&G.inventory.some(x=>x.uid===it.uid))return true;
  if(G.inventory.includes(it))return true;
  if(G.inventory.length>=whCap()){
    const protectedItems=[...Object.values(G.equip),...Object.values(G.equipBackup)];
    const low=G.inventory.filter(x=>!x.kept&&!x.cr&&x.lk==null&&!protectedItems.includes(x)&&!gearReferenced(x)).sort((a,b)=>gearPriority(a)-gearPriority(b))[0];
    if(!low||gearPriority(it)<=gearPriority(low))return false;
    G.inventory=G.inventory.filter(x=>x!==low);recycleOverflow(low);
  }
  it.uid=allocateGearId();G.inventory.push(it);noticeNew('gear',it.uid);G.inventoryRevision++;return true;
}
function equipStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||G.equip[it.slot]===it)return false;
  const old=G.equip[it.slot];if(old&&!old.lg&&!storeGear(old))return false;
  G.equipBackup[it.slot]=old;G.equip[it.slot]=it;G.autoEquip=false;recalc();G.inventoryRevision++;if(typeof onboardingEvent==='function')onboardingEvent('equip');return true;
}
function recycleStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||it.kept||it.cr||it.lk!=null||Object.values(G.equip).includes(it)||Object.values(G.equipBackup).includes(it)||gearReferenced(it))return false;
  G.inventory=G.inventory.filter(x=>x!==it);noticeRead('gear',it.uid);G.gold+=itemValue(it);salvage(it);G.inventoryRevision++;G.dirty=true;return true;
}
function recycleOverflow(it){if(Number.isSafeInteger(it.uid))noticeRead('gear',it.uid);G.gold+=itemValue(it);salvage(it);G.storageRecycled++;G.dirty=true;}
function collectEquipment(it){
  if(!validGear(it))return;
  if(it.lg)return false;
  if(it.r<G.filter){recycleOverflow(it);return true;}
  const old=G.equip[it.slot];
  if(old&&!old.lg)storeGear(old);
  if(!storeGear(it)){recycleOverflow(it);return true;}

  G.off&&(G.off.stored=(G.off.stored||0)+1);G.dirty=true;return true;
}
const validDrop=d=>!!(d&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&(d.kind==='boost'?['power','guard'].includes(d.boost):d.kind==='rift'?Number.isFinite(d.amount)&&d.amount>0&&d.amount<=100:d.kind==='skill'?Object.hasOwn(SKILLS,d.id):d.kind==='circuit'?Object.hasOwn(GridLab.TEMPLATES,d.id):['gold','chip'].includes(d.kind)?Number.isFinite(d.amount)&&d.amount>0:d.kind==='item'?validGear(d.it):d.kind==='gem'?SUPPS[d.id]:d.kind==='cart'?MODES[d.id]:d.kind==='map'?d.map&&BIOMES[d.map.biome]:false));
function dropGround(d){
  [d.x,d.y]=terrainProject(d.x,d.y);
  if(d.kind==='gold'||d.kind==='chip'){
    const near=G.drops.find(x=>!x.done&&!x.pull&&x.kind===d.kind&&Math.hypot(x.x-d.x,x.y-d.y)<8);
    if(near){near.amount+=d.amount;return;}
  }
  G.drops.push(d);
}
function collectNearby(dt){
  for(const d of G.drops){
    d.t+=dt;if(d.done||G.h.dead>0)continue;
    const distance=Math.hypot(d.x-G.h.x,d.y-G.h.y);
    if(!d.pull&&d.t>=.35&&distance<=PICKUP_RANGE)d.pull={age:0,duration:.85+Math.min(1,distance/PICKUP_RANGE)*.8};
    if(!d.pull)continue;
    d.pull.age+=dt;
    if(G.offline||d.pull.age>=d.pull.duration){d.done=true;pickup(d);}
  }
  G.drops=G.drops.filter(d=>!d.done);
}
function dropVisualPosition(d){const u=d.pull?Math.max(0,Math.min(1,d.pull.age/d.pull.duration)):0,ease=u*u;return {x:d.x+(G.h.x-d.x)*ease,y:d.y+(G.h.y-d.y)*ease,lift:d.pull?Math.sin(u*Math.PI)*3+u*8:0,progress:u};}

/* 六向電路天賦：角色共用所有路徑，以取捨組成流派。 */
(function expandCircuitTree(){
 const themes=[['D',-30,'#e9b765',[{haste:4},{sinc:6},{lifePct:-2,haste:5}],['超頻協定',{haste:25,lifePct:-22}]],['E',90,'#ae98e8',[{sinc:7},{armor:12},{leech:.5}],['斷線重播',{sinc:12,apsInc:-20}]],['F',210,'#72caca',[{crit:1.5},{cm:9},{life:16}],['電池孤注',{cm:70,lifePct:-25}]]];
 const add=(id,x,y,eff,col,name,big=false)=>TREE[id]={id,x,y,eff,col,name:name||effText(eff),big,links:[]};
 const link=(a,b)=>{TREE[a].links.push(b);TREE[b].links.push(a)};
 for(const[k,ang,col,pool,key]of themes){const a=ang*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a);let prev='S';
  for(let i=0;i<9;i++){const id=k+i,r=17+i*10;add(id,dx*r,dy*r,pool[i%3],col);link(prev,id);prev=id;
   if([3,5,7].includes(i))for(let j=0;j<2;j++){const sid=k+'s'+i+j,sg=i===5?-1:1;add(sid,dx*(r+4+j*10)-dy*14*sg,dy*(r+4+j*10)+dx*14*sg,pool[(i+j+1)%3],col);link(j?k+'s'+i+'0':id,sid);}
  }
  add(k+'K',dx*113,dy*113,key[1],col,key[0]+'：'+effText(key[1]),true);link(prev,k+'K');
 }
 const arms=[['A',-90,4],['D',-30,5],['B',30,4],['E',90,5],['C',150,4],['F',210,5]];
 for(let i=0;i<arms.length;i++){let prev=arms[i][0]+arms[i][2];for(let j=0;j<2;j++){const a=(arms[i][1]+20+j*20)*Math.PI/180,id='R'+i+j;add(id,Math.cos(a)*70,Math.sin(a)*70,j?{life:18}:{dmgPct:5},'#9cacc9');link(prev,id);prev=id;}const next=arms[(i+1)%arms.length];link(prev,next[0]+next[2]);}
})();
function buyCircuitSupport(id){if(!['FOCUS','FORK','RECOVER','DELAY','ANCHOR','EXECUTE','BLOOD','CONDUCT','LONG','SPREAD','RIME','KINDLE'].includes(id)||G.chips<20)return false;G.chips-=20;G.gems[id]=(G.gems[id]||0)+1;noticeNew('gems',id);G.dirty=true;return true;}

function buyCircuitMode(id){
  if(!['METEOR_COLDSTART','BEAM_CAPACITOR'].includes(id)||G.chips<20||G.carts[id]||G.lvl<SKILLS[MODES[id].sk].lvl)return false;
  G.chips-=20;G.carts[id]=1;noticeNew('carts',id);G.seen[id]=1;G.dirty=true;return true;
}

/* 有限路徑、可還原遷移、城市遠征與定向收藏。 */
const copyState=x=>JSON.parse(JSON.stringify(x));
function talentBudget(){return Math.min(TALENT_LIMIT,Math.max(0,Math.floor((G.lvl-1)/2))+Math.max(0,Math.floor((G.maxDepth-1)/5)));}
const firmwareCount=pass=>pass.filter(id=>FIRMWARE[id]).length;
const talentOverLimit=pass=>pass.length>talentBudget()||firmwareCount(pass)>FIRMWARE_LIMIT;
function passiveLegacy(){return !!G.legacyMode||talentOverLimit(G.pass);}
function canAllocateTalent(id){return !G.run?.city&&!G.train&&!!TREE[id]&&id!=='S'&&!passiveLegacy()&&passPoints()>0&&nodeOpen(id)&&(!FIRMWARE[id]||firmwareCount(G.pass)<FIRMWARE_LIMIT);}
function talentName(id){return !passiveLegacy()&&FIRMWARE[id]?FIRMWARE[id].n+'：'+FIRMWARE[id].d:TREE[id].name;}
function connectedTalents(pass){const reached=new Set(['S']);let changed=true;while(changed){changed=false;for(const id of pass)if(TREE[id]&&!reached.has(id)&&TREE[id].links.some(k=>reached.has(k))){reached.add(id);changed=true;}}return pass.every(id=>reached.has(id));}
function talentPlan(pass=G.pass){const left=[...new Set(pass.filter(id=>TREE[id]&&id!=='S'))],out=[];let changed=true;
 while(changed){changed=false;for(const id of left){if(out.includes(id)||out.length>=talentBudget()||FIRMWARE[id]&&firmwareCount(out)>=FIRMWARE_LIMIT)continue;if(TREE[id].links.some(k=>k==='S'||out.includes(k))){out.push(id);changed=true;}}}return out;}
function convertTalents(){if(G.run||G.train)return false;if(!G.legacyTalent)G.legacyTalent=copyState({pass:G.pass,builds:G.builds,bi:G.bi||0,board:G.board,castPolicy:G.castPolicy,legacyMode:G.legacyMode});G.pass=talentPlan();G.legacyMode=false;recalc();return true;}
function restoreLegacyTalents(){if(!G.legacyTalent||G.run||G.train)return false;const old=copyState(G.legacyTalent),board=old.board?.pieces?GridLab.adopt(old.board,G.lvl):G.board;if(!G.circuits.includes(board.template))return false;G.pass=old.pass;G.builds=old.builds;G.bi=old.bi;G.board=board;G.castPolicy=old.castPolicy==='combo'?'combo':'balanced';G.legacyMode=old.legacyMode!==false;recalc();return true;}
function refundTalent(id){if(!G.pass.includes(id)||G.run||G.train)return false;const next=G.pass.filter(k=>k!==id);if(!connectedTalents(next))return false;G.pass=next;recalc();return true;}
function newCity(){return {maxTier:1,fragments:{signal:0,memory:0,power:0},seals:{},clears:{},nexusWins:0,target:'W_ECHO',policy:'safe',last:null};}
function loadProgression(o){
 G.city=newCity();if(o.city&&typeof o.city==='object'){
  const n=(v,max=1e7)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
  G.city.maxTier=Math.max(1,n(o.city.maxTier,8));G.city.nexusWins=n(o.city.nexusWins);
  for(const id of Object.keys(CITY_ROUTES))G.city.fragments[id]=n(o.city.fragments?.[id]);
  for(let tier=1;tier<=8;tier++){G.city.seals[tier]={};for(const id of Object.keys(CITY_ROUTES)){G.city.seals[tier][id]=o.city.seals?.[tier]?.[id]===1?1:0;G.city.clears[id+':'+tier]=n(o.city.clears?.[id+':'+tier]);}}
  if(LEGEND_BY[o.city.target])G.city.target=o.city.target;G.city.policy=o.city.policy==='risk'?'risk':'safe';
  if(o.city.last&&typeof o.city.last.text==='string')G.city.last={text:o.city.last.text.slice(0,300)};
 }
 G.legacyMode=o.progressionVersion===1?(o.legacyMode===true||firmwareCount(G.pass)>FIRMWARE_LIMIT):G.pass.length>0;
 G.legacyTalent=o.legacyTalent&&Array.isArray(o.legacyTalent.pass)?copyState(o.legacyTalent):null;
 if(o.progressionVersion!==1){G.builds=G.builds.map(b=>b?{...b,legacyMode:true}:b);if(G.pass.length||G.builds.some(Boolean))G.legacyTalent=copyState({pass:G.pass,builds:G.builds,bi:G.bi||0,board:G.board,castPolicy:G.castPolicy});}
 if(G.legacyTalent){G.legacyTalent.pass=G.legacyTalent.pass.filter(id=>TREE[id]&&id!=='S');if(!Array.isArray(G.legacyTalent.builds))G.legacyTalent.builds=[null,null,null];G.legacyTalent.builds=G.legacyTalent.builds.slice(0,3);G.legacyTalent.bi=[0,1,2].includes(G.legacyTalent.bi)?G.legacyTalent.bi:0;}
 G.h.buffer=0;G.h.bufferUntil=0;
 if(G.run?.city){G.run.city.policy=G.run.city.policy==='risk'?'risk':'safe';G.run.city.nexus=G.run.city.nexus===true;}
 if(G.run?.city&&!validCityRun(G.run)){G.run=null;G.city.last={text:'城市遠征資料不完整，已返回一般冒險；永久收藏與已結算碎片保留。'};}
}
function cityReady(){return G.maxDepth>=8&&!passiveLegacy();}
function cityRouteForCore(id){return Object.keys(CITY_ROUTES).find(k=>CITY_ROUTES[k].cores.includes(id));}
function cityCanStart(route,tier,nexus=false){const C=G.city||(G.city=newCity());return cityReady()&&!G.run&&!G.train&&G.h.dead<=0&&!!CITY_ROUTES[route]&&Number.isInteger(tier)&&tier>=1&&tier<=C.maxTier&&(!nexus||Object.keys(CITY_ROUTES).every(id=>C.seals[tier]?.[id]===1));}
function cityStart(route,tier,nexus=false){
 if(!cityCanStart(route,tier,nexus))return false;const C=G.city;
 if(nexus)for(const id of Object.keys(CITY_ROUTES))C.seals[tier][id]=0;
 G.run={map:{id:'city-'+Date.now(),lvl:Math.max(8,G.maxDepth)+2*(tier-1),biome:nexus?8:CITY_ROUTES[route].biome,mods:[]},kills:0,need:18,bossOut:false,
 city:{route,tier,nexus,stage:1,bank:0,branches:[],awaitChoice:false,settled:false,target:C.target,policy:C.policy}};
 cityClearArena();recalc();G.h.hp=G.st.life;G.dirty=true;logLine(`出發：${nexus?'城市中樞':CITY_ROUTES[route].n} · 第 ${tier} 階`,'#303d9b');return true;
}
function cityClearArena(){for(const m of G.mons)m.dead=true;G.mons=[];G.proj=[];G.timers=[];G.readySince={};G.h.castT=-1;G.h.swingT=-1;G.h.buffer=0;G.signalCharge=0;G.spawnCd=.6;}
function cityStageClear(){const R=G.run,c=R?.city;if(!c||c.settled||c.stage>=3||c.awaitChoice||R.kills<R.need)return false;
 c.bank+=c.stage+1+c.tier+(CITY_BRANCHES[c.branches.at(-1)]?.reward||0);c.awaitChoice=true;c.choiceAt=Date.now();cityClearArena();G.dirty=true;logLine('路段完成，選擇下一段協定；可帶回目前碎片。','#303d9b');return true;}
function cityChoose(id,stage){const R=G.run,c=R?.city;if(!c||c.settled||!c.awaitChoice||c.stage!==stage||!CITY_BRANCHES[id])return false;
 c.branches.push(id);c.stage++;c.awaitChoice=false;delete c.choiceAt;R.kills=0;R.need=c.stage===3?0:28;R.bossOut=false;cityClearArena();recalc();G.dirty=true;return true;}
function citySealReady(tier){return Object.keys(CITY_ROUTES).every(id=>G.city?.seals[tier]?.[id]===1);}
function cityFinish(success=false){const R=G.run,c=R?.city;if(!c||c.settled)return false;
 c.settled=true;if(typeof seasonFinish==='function')seasonFinish(c,success);const C=G.city||(G.city=newCity()),route=c.route;
 if(success){c.bank+=5+2*c.tier+(CITY_BRANCHES[c.branches.at(-1)]?.reward||0);if(c.nexus){C.nexusWins++;C.maxTier=Math.min(8,Math.max(C.maxTier,c.tier+1));}else{C.seals[c.tier]||={};C.seals[c.tier][route]=1;C.clears[route+':'+c.tier]=(C.clears[route+':'+c.tier]||0)+1;}
  const target=c.target,eligible=CITY_ROUTES[route].cores.includes(target);
  if(c.nexus||Math.random()<.15){const id=c.nexus?target:eligible?target:tPick(CITY_ROUTES[route].cores),it=makeItem(coreSlot(id),3,R.map.lvl,id);dropGround({kind:'item',it,x:G.h.x,y:G.h.y,t:0});}
  G.mapsDone++;checkGoals();
 }
 C.fragments[route]+=c.bank;const text=`${c.nexus?'城市中樞':CITY_ROUTES[route].n}第 ${c.tier} 階${success?'完成':'帶回'}：${c.bank} 枚區域碎片${success?'，'+(c.nexus?'中樞紀錄更新':'取得區域憑證'):''}`;
 C.last={text};logLine(text,'#303d9b');G.run=null;G.bossOut=false;cityClearArena();recalc();G.dirty=true;return true;
}
function forgeTargetCore(id){const C=G.city||(G.city=newCity()),route=cityRouteForCore(id);if(!cityReady()||G.run||G.train||!route||G.armory[id]||C.fragments[route]<24)return false;
 const it=makeItem(coreSlot(id),3,Math.max(8,G.maxDepth),id);C.fragments[route]-=24;G.armory[id]=it;G.legSeen[id]=1;G.dirty=true;return true;
}
function validCityRun(R){const c=R?.city;return !!(c&&CITY_ROUTES[c.route]&&Number.isInteger(c.tier)&&c.tier>=1&&c.tier<=8&&Number.isInteger(c.stage)&&c.stage>=1&&c.stage<=3&&Number.isFinite(c.bank)&&c.bank>=0&&Array.isArray(c.branches)&&c.branches.length===c.stage-1&&c.branches.every(id=>CITY_BRANCHES[id])&&LEGEND_BY[c.target]&&c.settled===false&&Number.isFinite(R.kills)&&Number.isFinite(R.need)&&BIOMES[R.map?.biome]&&Number.isFinite(R.map?.lvl));}
function heroDamage(damage,source='未分類傷害',kind='直接命中'){
 if(!Number.isFinite(damage)||damage<=0)return 0;if(G.st&&G.st.takenRed)damage*=1-G.st.takenRed/100;if(lgOn('O_TOWER')&&G.h.hp>G.st.life*.8)damage*=.85;const h=G.h,before=h.hp,base=G.time<(h.bufferUntil||0)?h.buffer||0:0,supply=G.time<(h.airShieldUntil||0)?h.airShield||0:0,airUsed=Math.min(supply,damage),classUsed=Math.min(base,damage-airUsed),absorbed=airUsed+classUsed;
 h.airShield=supply-airUsed;h.buffer=base-classUsed;h.hp-=damage-absorbed;if(typeof recordIncoming==='function')recordIncoming(damage-absorbed,absorbed,source,kind,before>0&&h.hp<=0);if(damage>absorbed)h.lastDamageAt=G.time;return damage-absorbed;
}

function cityMonster(m){const c=G.run?.city;if(!c)return;const branch=c.branches,route=c.nexus?['signal','memory','power'][Math.min(2,c.stage-1)]:c.route;
 m.cityRoute=route;m.hp*=1+.15*(c.tier-1)+(c.nexus?.35:0);m.hpMax=m.hp;
 m.dmg*=Math.pow(.85,branch.filter(x=>x==='safe').length)*Math.pow(1.15,branch.filter(x=>x==='risk').length);
 m.spdK*=Math.pow(1.12,branch.filter(x=>x==='risk').length);
 if(typeof seasonMonster==='function')seasonMonster(m,c);
 if(route==='signal'){m.spdK*=1.3;m.x=tClamp(m.x+(m.slot%3-1)*14,HX-38,HX+38);m.skillCd=2;}
 if(route==='memory'){m.shieldMax=m.hpMax*.18;m.shield=m.shieldMax;}
 if(route==='power')m.dmg*=1.15;
}
function cityIncoming(m,damage){if(!m.cityRoute)return damage;
 m.lastCityHit=G.time;if(m.cityRoute==='power'&&!(m.burn>0||m.shock>0||m.frozen>0))damage*=.75;
 const absorbed=Math.min(m.shield||0,damage);m.shield=Math.max(0,(m.shield||0)-absorbed);return damage-absorbed;
}
function cityTickMonster(m,dt){if(m.shieldMax&&G.time-(m.lastCityHit??G.time)>3&&!(m.frozen>0))m.shield=Math.min(m.shieldMax,(m.shield||0)+m.shieldMax*.3*dt);
 if(m.boss&&G.run?.city){const phase=m.hp/m.hpMax<.3?2:m.hp/m.hpMax<.65?1:0;if(phase>(m.cityPhase||0)){m.cityPhase=phase;m.spdK*=1.12;m.atkInt*=.9;m.skillCd=0;addFx({k:'ring',x:m.x,y:m.y,col:'#ff9966',t:0,dur:.6});}}
}

/* 構築記住實體裝備，不複製詞綴或創造物品。 */
function gearReferences(){return [...(Array.isArray(G.builds)?G.builds:[]),...(Array.isArray(G.legacyTalent?.builds)?G.legacyTalent.builds:[])].filter(Boolean).flatMap(b=>Object.values(b.equipment||{})).filter(Boolean);}
function gearReferenced(it){return gearReferences().some(r=>it.lg?r.kind==='core'&&r.id===it.lg:r.kind==='gear'&&r.uid===it.uid);}
function allocateGearId(){const held=new Set([...G.inventory.map(it=>it.uid),...gearReferences().filter(r=>Number.isSafeInteger(r.uid)).map(r=>r.uid)]);let id=Number.isSafeInteger(G.nextGearId)&&G.nextGearId>0&&G.nextGearId<=1e8?G.nextGearId:1;while(held.has(id))id=id>=1e8?1:id+1;G.nextGearId=id+1;return id;}
function captureBuild(){const equipment={};for(const slot of Object.keys(SLOTN)){const it=G.equip[slot];if(!it){equipment[slot]=null;continue;}if(it.lg){equipment[slot]={kind:'core',id:it.lg};continue;}
 if(!G.inventory.includes(it)){const same=G.inventory.find(x=>x.uid===it.uid);if(same)G.equip[slot]=same;else if(G.inventory.length>=whCap()||!storeGear(it))return null;}
 equipment[slot]={kind:'gear',uid:G.equip[slot].uid};}
 return copyState({board:G.board,pass:G.pass,castPolicy:G.castPolicy,legacyMode:G.legacyMode,character:G.char,equipment});
}
function inspectBuildGear(build){const equip={...G.equip},missing=[];if(!build?.equipment)return {equip,missing,legacy:true};
 for(const slot of Object.keys(SLOTN)){const ref=build.equipment[slot];if(ref==null){equip[slot]=null;continue;}const it=ref?.kind==='core'?G.armory[ref.id]:ref?.kind==='gear'?G.inventory.find(x=>x.uid===ref.uid):null;if(it?.slot===slot)equip[slot]=it;else missing.push(slot);}
 return {equip,missing,legacy:false};
}
function saveBuild(){if(G.run?.city||G.train)return false;const b=captureBuild();if(!b)return false;G.builds[G.bi||0]=b;G.dirty=true;return true;}
function restoreBuild(index,keepMissing=false){if(![0,1,2].includes(index)||index===(G.bi||0)||G.run?.city||G.train)return {ok:false,reason:'目前不能切換構築'};
 const target=G.builds[index],targetBoard=target?GridLab.adopt(copyState(target.board),G.lvl):null;if(target?.character&&target.character!==G.char)return {ok:false,reason:'構築屬於其他職業，不能轉職'};if(targetBoard&&!G.circuits?.includes(targetBoard.template))return {ok:false,reason:'尚未持有此電路板'};const resolved=inspectBuildGear(target);if(resolved.missing.length&&!keepMissing)return {ok:false,missing:resolved.missing,reason:'部分裝備已不存在'};
 const current=captureBuild();if(!current)return {ok:false,reason:'倉庫已滿，先整理空間再保存目前裝備'};
 G.builds[G.bi||0]=current;G.bi=index;
 if(target){G.board=targetBoard;G.pass=target.pass.slice();G.castPolicy=target.castPolicy==='combo'?'combo':'balanced';G.legacyMode=target.legacyMode===true||firmwareCount(G.pass)>FIRMWARE_LIMIT;}
 else{G.board=GridLab.createBoard(G.board.template);G.pass=[];G.castPolicy='balanced';G.legacyMode=false;}
 if(target?.equipment){for(const slot of Object.keys(SLOTN)){const old=G.equip[slot];G.equip[slot]=resolved.equip[slot];if(old!==G.equip[slot])G.equipBackup[slot]=old;}G.autoEquip=false;}
 const use={},cu={};G.board.pieces=G.board.pieces.filter(p=>p.kind!=='support'||(use[p.key+(p.t||1)]=(use[p.key+(p.t||1)]||0)+1)<=gemOwnT(p.key,p.t||1));
 for(const p of G.board.pieces)if(p.mode){cu[p.mode]=(cu[p.mode]||0)+1;if(cu[p.mode]>(G.carts[p.mode]||0))p.mode=null;}
 G.proj=[];G.timers=[];G.h.castT=-1;G.h.swingT=-1;G.readySince={};G.signalCharge=0;recalc();return {ok:true,missing:resolved.missing,legacy:resolved.legacy};
}
function normalizeBuilds(conflicts=new Set()){
 const clean=build=>{if(!build||!Array.isArray(build.board?.pieces)||!Array.isArray(build.pass))return null;const b=copyState(build);if(b.equipment){const refs={};for(const slot of Object.keys(SLOTN)){const r=b.equipment[slot];refs[slot]=r==null?null:r?.kind==='core'&&coreSlot(r.id)===slot?{kind:'core',id:r.id}:r?.kind==='gear'&&Number.isSafeInteger(r.uid)&&r.uid>0&&r.uid<=1e8&&!conflicts.has(r.uid)?{kind:'gear',uid:r.uid}:{kind:'missing'};}b.equipment=refs;}return b;};
 G.builds=Array.from({length:3},(_,i)=>clean(G.builds?.[i]));if(G.legacyTalent?.builds)G.legacyTalent.builds=Array.from({length:3},(_,i)=>clean(G.legacyTalent.builds[i]));
}
const AFFIX_BANDS=[1.65,1.35,1.1,.88,.65];
function affValue(k,il,tier,quality,boost=1){const v=AFF[k].b(il)*AFFIX_BANDS[tier]*(.9+.2*quality)*boost;return k==='leech'?Math.round(v*10)/10:Math.max(1,Math.round(v));}
function affRange(a,it){const tier=affTier(a,it.il),boost=it.r===3?1.35:1;return {tier,min:affValue(a.k,it.il,tier,0,boost),max:affValue(a.k,it.il,tier,1,boost)};}
function affQuality(a,it){return Math.max(0,Math.min(1,(a.v/(AFF[a.k].b(it.il)*AFFIX_BANDS[affTier(a,it.il)]*(it.r===3?1.35:1))-.9)/.2));}
function recalibrateAff(a,it){return {...a,tier:affTier(a,it.il),v:affValue(a.k,it.il,affTier(a,it.il),Math.random(),it.r===3?1.35:1)};}

function forgetBuildGear(index){if(![0,1,2].includes(index)||index===(G.bi||0)||G.run?.city||G.train||!G.builds[index]?.equipment)return false;delete G.builds[index].equipment;G.dirty=true;G.inventoryRevision++;return true;}

/* 回復共用額度：多段、範圍、討伐與吸血共享，不能用命中數繞過。 */
function heroRecover(amount){
  const h=G.h,rate=G.st.life*.025;
  if(!Number.isFinite(amount)||amount<=0||h.hp<=0)return 0;
  h.recoverCredit=Math.min(rate,(h.recoverCredit??rate)+Math.max(0,G.time-(h.recoverAt??G.time))*rate);
  h.recoverAt=G.time;const v=Math.min(amount,h.recoverCredit,Math.max(0,G.st.life-h.hp));
  h.recoverCredit-=v;h.hp+=v;return v;
}
function damageFloatSize(amount){return Math.min(26,12+Math.log10(1+Math.max(0,amount))*3);}

/* 地形獨立種子，不消耗戰利品／戰鬥亂數。格網連通、高度連續，角色沿坡行走。 */
function terrainHash(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function terrainKey(){const r=G.run;return G.train?'training':r?.map?'map:'+r.map.id+':'+(r.city?.stage??r.floor??0):'depth:'+G.depth;}
let TERRAIN_CACHE=null;
/* G1 街區樣板：城市綠洲地形改成一條橫街，兩側是連續店面。?street=0 或設定可關閉，回到原版地形。 */
function streetSampleOn(){try{const q=new URLSearchParams(location.search).get('street');if(q==='0')return false;if(q==='1')return true;return localStorage.getItem('ih-street')!=='0';}catch(e){return true;}}
const STREET_HW=7;
function terrainBuild(key){
  const seed=terrainHash(key),training=key==='training',tower=key.startsWith('map:tower:'),room=tower?towerTheme(+key.split(':').at(-1)):null,profile=tower?11:training?0:seed%12,cell=6;
  // Rounded land masses with low-frequency coast variation, never letter-shaped cut-outs.
  const sizeRoll=(seed>>>16)%12,sizeClass=tower?'regular':training?'training':sizeRoll===0?'giant':sizeRoll<3?'large':sizeRoll<7?'medium':'regular';
  const shapeRoll=(seed>>>24)%5,shapeClass=tower||training||shapeRoll===0?'square':shapeRoll===1?'rectangle':'natural';
  const span=sizeClass==='giant'?540+(seed>>>5)%19*6:sizeClass==='large'?330+(seed>>>5)%9*6:sizeClass==='medium'?246+(seed>>>5)%7*6:144+(seed>>>5)%9*6;
  const nx=tower?23:training?17:Math.round(span/cell),ny=tower?19:training?17:Math.round(span*(shapeClass==='square'?1:.78+(seed>>>11)%23/100)/cell);
  const ox=HX-Math.floor(nx/2)*cell-cell/2,oy=HY-Math.floor(ny/2)*cell-cell/2,w=nx*cell/2,h=ny*cell/2;
  const names=['林間海岸','起伏山丘','寬闊河灣','高原盆地','海岸台地','城市綠洲','山麓營地','古城廣場','風車高地','雪嶺低谷','石柱遺跡','工業庭院'];
  const clearRadius=tower?20:training?24:Math.max(34,Math.min(56,Math.min(w,h)*.34));
  const groundCells=[],lookup=new Map();
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const x=ox+(i+.5)*cell,y=oy+(j+.5)*cell,u=(x-HX)/w,v=(y-HY)/h,angle=Math.atan2(v,u);
    const coast=.87+.055*Math.sin(angle*3+seed%17)+.035*Math.sin(angle*5+seed%11)+.025*Math.cos(angle*2+profile);
    const bend=profile===2?.13*Math.sin(v*2.3):profile===4?.1*v:0;
    if(shapeClass!=='natural'||Math.hypot(u-bend,v)<coast){const c={i,j,x,y,k:j*nx+i};groundCells.push(c);lookup.set(c.k,c);}
  }
  const groundLookup=new Map(lookup),landmarks=[];
  const pick=(index)=>groundCells[terrainHash(key+':'+index)%groundCells.length];
  const street=profile===5&&!tower&&!training&&streetSampleOn();
  if(street){const rad=11,lat=clearRadius+rad+6;
    for(const side of [-1,1])for(let t=-w+rad+6;t<=w-rad-6;t+=rad*2+3){
      const x=HX+t,y=HY+side*lat,cx=Math.floor((x-ox)/cell),cy=Math.floor((y-oy)/cell);
      if(cx<0||cx>=nx||cy<0||cy>=ny||!groundLookup.has(cy*nx+cx)||Math.hypot((x-HX)/w,(y-HY)/h)>.8)continue;
      const variant=terrainHash(key+':shop:'+side+':'+t);
      landmarks.push({x,y,radius:rad,kind:'shop',scale:1,variant,height:15,face:-side,rotation:side<0?0:Math.PI});
      for(const q of groundCells)if(Math.abs(q.x-x)<rad&&Math.abs(q.y-y)<rad)lookup.delete(q.k);
    }
  }
  const count=tower?6:training?0:street?0:Math.min(64,Math.round(groundCells.length/110)+3);
  for(let n=0;n<count*12&&landmarks.length<count;n++){
    const c=pick(n),urban=[5,7,11].includes(profile),variant=terrainHash(key+':object:'+n);
    const family=tower?({prison:['cellblock','barrier','cellblock','console'],lab:['labtank','console','labtank','vent'],reactor:['generator','vent','server','generator']}[room.id]):profile===7?['cabin','pavilion','tree','building']:profile===11?['warehouse','building','tree','pavilion']:urban?['building','building','tree','pavilion']:profile===8?['windmill','tree','boulder','cabin']:profile===10?['ruin','boulder','tree','ruin']:profile===6?['tree','cabin','tree','boulder']:['tree','tree','boulder','tree'];
    const kind=family[landmarks.length%family.length],radius=tower?6:kind==='warehouse'?16:kind==='building'?13:kind==='cabin'?9:kind==='ruin'?9:kind==='pavilion'?8:kind==='windmill'?7:kind==='boulder'?12:3;
    if(tower&&Math.hypot(c.x-HX-38,c.y-HY+34)<radius+16)continue;
    if(Math.hypot(c.x-HX,c.y-HY)<clearRadius+radius+7||Math.hypot((c.x-HX)/w,(c.y-HY)/h)>.79)continue;
    if(landmarks.some(o=>Math.hypot(o.x-c.x,o.y-c.y)<o.radius+radius+12))continue;
    const scale=kind==='tree'?2.4+(variant%22)/10:1;
    landmarks.push({x:c.x,y:c.y,radius,kind,scale,variant,height:kind==='building'?(profile===7?22:30+(variant%5)*15):14*scale});
    for(const q of groundCells)if(['building','warehouse','cabin','pavilion','ruin'].includes(kind)?Math.abs(q.x-c.x)<radius&&Math.abs(q.y-c.y)<radius:Math.hypot(q.x-c.x,q.y-c.y)<radius)lookup.delete(q.k);
  }
  const center=Math.floor(ny/2)*nx+Math.floor(nx/2),seen=new Set([center]),queue=[lookup.get(center)];
  for(let n=0;n<queue.length;n++){const c=queue[n];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=c.i+di,j=c.j+dj,k=j*nx+i;if(i>=0&&i<nx&&j>=0&&j<ny&&lookup.has(k)&&!seen.has(k)){seen.add(k);queue.push(lookup.get(k));}}}
  const cells=groundCells.filter(c=>seen.has(c.k));for(const k of lookup.keys())if(!seen.has(k))lookup.delete(k);
  const edges=cells.filter(c=>[[1,0],[-1,0],[0,1],[0,-1]].some(([di,dj])=>{const i=c.i+di,j=c.j+dj;return i<0||i>=nx||j<0||j>=ny||!groundLookup.has(j*nx+i);}));
  const bounds=[Math.min(...groundCells.map(c=>c.x))-3,Math.max(...groundCells.map(c=>c.x))+3,Math.min(...groundCells.map(c=>c.y))-3,Math.max(...groundCells.map(c=>c.y))+3];
  return {key,seed,profile,street,sizeClass,shapeClass,clearRadius,name:tower?room.n:training?'訓練平台':names[profile],cell,nx,ny,ox,oy,cells,groundCells,groundLookup,landmarks,lookup,edges,bounds,routes:new Map(),amplitude:tower||training?0:[24,48,20,58,36,10,54,12,48,72,46,14][profile]};
}

function terrainNow(){const key=terrainKey();if(TERRAIN_CACHE?.key!==key)TERRAIN_CACHE=terrainBuild(key);return TERRAIN_CACHE;}
function terrainGroundCell(x,y,p=terrainNow()){const i=Math.floor((x-p.ox)/p.cell),j=Math.floor((y-p.oy)/p.cell);return i>=0&&i<p.nx&&j>=0&&j<p.ny?p.groundLookup.get(j*p.nx+i):undefined;}
function terrainCell(x,y,p=terrainNow()){const i=Math.floor((x-p.ox)/p.cell),j=Math.floor((y-p.oy)/p.cell);return i>=0&&i<p.nx&&j>=0&&j<p.ny?p.lookup.get(j*p.nx+i):undefined;}
function terrainHeight(x,y,p=terrainNow()){
  if(!p.amplitude)return 0;
  const u=(x-HX)/(p.nx*p.cell/2),v=(y-HY)/(p.ny*p.cell/2),r=Math.hypot(x-HX,y-HY);
  // An open, nearly level arena blends into peripheral ridges and a lower valley.
  const blend=Math.max(0,Math.min(1,(r-p.clearRadius*.75)/(p.clearRadius*.8)));
  const smooth=blend*blend*(3-2*blend),angle=(p.seed%8)*Math.PI/4;
  const a=u*Math.cos(angle)-v*Math.sin(angle),b=u*Math.sin(angle)+v*Math.cos(angle);
  const peak=Math.exp(-((a+.52)**2/ .075+(b+.3)**2/.16));
  const ridge=Math.exp(-((a-.46)**2/.12+(b-.38)**2/.09));
  const valley=Math.exp(-((a-.12)**2/.24+(b+.55)**2/.1));
  return p.amplitude*smooth*(peak+.66*ridge-.22*valley+.025*Math.sin(u*6+v*4+p.seed%7));
}

function terrainProject(x,y,p=terrainNow()){
  if(terrainCell(x,y,p))return [x,y];let best=p.cells[0],d=Infinity;
  for(const c of p.cells){const dd=(c.x-x)**2+(c.y-y)**2;if(dd<d){d=dd;best=c;}}
  return [Math.max(best.x-2.7,Math.min(best.x+2.7,x)),Math.max(best.y-2.7,Math.min(best.y+2.7,y))];
}
function terrainSegment(x,y,tx,ty,p=terrainNow()){
  const start=terrainCell(x,y,p),end=terrainCell(tx,ty,p);if(!start||!end)return false;
  let i=start.i,j=start.j;const dx=tx-x,dy=ty-y,sx=Math.sign(dx),sy=Math.sign(dy);
  const valid=(a,b)=>a>=0&&a<p.nx&&b>=0&&b<p.ny&&p.lookup.has(b*p.nx+a);
  let bx=dx?((p.ox+(i+(sx>0?1:0))*p.cell)-x)/dx:Infinity,by=dy?((p.oy+(j+(sy>0?1:0))*p.cell)-y)/dy:Infinity;
  const stepx=dx?p.cell/Math.abs(dx):Infinity,stepy=dy?p.cell/Math.abs(dy):Infinity;
  for(let guard=0;guard<p.nx+p.ny+4;guard++){
    if(i===end.i&&j===end.j)return true;
    if(Math.abs(bx-by)<1e-10){if(!valid(i+sx,j)||!valid(i,j+sy))return false;i+=sx;j+=sy;bx+=stepx;by+=stepy;}
    else if(bx<by){i+=sx;bx+=stepx;}else{j+=sy;by+=stepy;}
    if(!valid(i,j))return false;
  }return false;
}

function terrainWaypoint(x,y,tx,ty){
  const p=terrainNow();[tx,ty]=terrainProject(tx,ty,p);if(terrainSegment(x,y,tx,ty,p))return [tx,ty];
  const from=terrainCell(x,y,p),target=terrainCell(tx,ty,p);if(!from)return terrainProject(x,y,p);
  let field=p.routes.get(target.k);
  if(!field){field=new Map([[target.k,0]]);const q=[target];for(let a=0;a<q.length;a++){const c=q[a];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=c.i+di,j=c.j+dj,k=j*p.nx+i;if(i<0||i>=p.nx||j<0||j>=p.ny||field.has(k)||!p.lookup.has(k))continue;field.set(k,field.get(c.k)+1);q.push(p.lookup.get(k));}}if(p.routes.size>=160)p.routes.delete(p.routes.keys().next().value);p.routes.set(target.k,field);}
  let best=from;for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const c=p.lookup.get((from.j+dj)*p.nx+from.i+di);if(c&&Math.abs(c.i-from.i)+Math.abs(c.j-from.j)===1&&field.get(c.k)<field.get(best.k))best=c;}
  // First align inside the current cell, then cross its shared edge; no diagonal corner cutting.
  if(best.i!==from.i&&Math.abs(y-from.y)>1.6)return [from.x,from.y];
  if(best.j!==from.j&&Math.abs(x-from.x)>1.6)return [from.x,from.y];
  return [best.x,best.y];
}
function terrainMove(entity,x,y){const p=terrainNow();if(terrainSegment(entity.x,entity.y,x,y,p)){entity.x=x;entity.y=y;}else if(terrainSegment(entity.x,entity.y,x,entity.y,p)){entity.x=x;}else if(terrainSegment(entity.x,entity.y,entity.x,y,p)){entity.y=y;}else{[entity.x,entity.y]=terrainProject(entity.x,entity.y,p);}}
// Normal maps use the coast; huge maps activate distant approaches around the hero.
function terrainSpawnPoints(){
  const p=terrainNow(),local=p.sizeClass==='giant'||p.sizeClass==='large',x=local?G.h.x:HX,y=local?G.h.y:HY;
  const pool=(local?p.cells:p.edges).filter(c=>{const d=Math.hypot(c.x-G.h.x,c.y-G.h.y);return d>=32&&(!local||d<=88);});
  const candidates=pool.length?pool:p.edges;
  return Array.from({length:8},(_,n)=>{const a=(n+.5)*Math.PI/4,tx=x+Math.cos(a)*(local?64:Math.max(p.nx,p.ny)*p.cell),ty=y+Math.sin(a)*(local?64:Math.max(p.nx,p.ny)*p.cell);let best=candidates[0],d=Infinity;for(const c of candidates){const q=(c.x-tx)**2+(c.y-ty)**2;if(q<d){d=q;best=c;}}return [best.x,best.y];});
}

function terrainScenery(p=terrainNow()){
 if(p.key.startsWith('map:tower:'))return p.landmarks;
  if(p.key==='training')return [];const out=p.landmarks.map(o=>({...o})),occupied=(x,y,r)=>p.landmarks.some(o=>Math.hypot(o.x-x,o.y-y)<o.radius+r+4);
  const count=Math.min(260,Math.round(p.groundCells.length*.15));
  for(let i=0;i<count;i++){const c=p.cells[terrainHash(p.key+':detail:'+i)%p.cells.length];if(Math.hypot(c.x-HX,c.y-HY)<p.clearRadius+5||occupied(c.x,c.y,3))continue;
    if(p.street&&Math.abs(c.y-HY)<STREET_HW+5)continue;const feather=Math.max(0,Math.min(1,(Math.hypot(c.x-HX,c.y-HY)-p.clearRadius)/32));if(terrainHash(p.key+':density:'+i)%1000/1000>feather*feather*(3-2*feather))continue;
    const n=terrainHash(p.key+':kind:'+i),urban=[5,7,11].includes(p.profile);
    const THEME={0:['reed','dock','boatwreck','lighthouse','cairn','umbrella','pond','guardrail','pole'],1:['cairn','radiotower','stump','fern','flagpole','mailbox','hotspring','pole','guardrail'],2:['reed','pond','dock','fern','kiosk','lantern','boatwreck','plantpot','pole'],3:['pipes','barrel','solar','satellite','tire','lantern','container','crates','acunit','vending'],4:['dock','boatwreck','lighthouse','umbrella','reed','cairn','barrel','guardrail','pole'],5:['phonebooth','busstop','hydrant','trashcan','billboard','streetclock','kiosk','mailbox','vending','pole','guardrail','crates','plantpot','acunit','shopbag','zebra'],6:['campfire','totem','stump','fern','lantern','flagpole','tent','plantpot'],7:['well','statue','streetclock','lantern','mailbox','kiosk','busstop','vending','plantpot','shopbag','crates'],8:['haystack','fence','scarecrow','well','swing','mailbox','fern','pole','crates'],9:['icespire','hotspring','cairn','stump','lantern','radiotower','pole'],10:['obelisk','arch','statue','brokenwall','cairn','totem','lantern'],11:['container','pallets','barrel','pipes','solar','satellite','billboard','pole','guardrail','crates','acunit']};
    const palette=[...(THEME[p.profile]||[]),...(urban?['bike','lamp','bench','planter','crate','grass']:p.profile===6?['tent','log','rock','bush','grass']:p.profile===10?['column','rock','bush','grass']:['rock','log','flowers','bush','grass','grass'])];
    const kind=palette[n%palette.length];
    out.push({x:c.x,y:c.y,kind,variant:n%9,scale:kind==='grass'?.5:kind==='bike'?1:kind==='rock'?1+(n%9)/5:['vending','pole','guardrail','crates','plantpot','acunit','shopbag','zebra'].includes(kind)?1.5+(n%4)/10:.8+(n%4)/10,rotation:n%628/100});
  }
  // Small, related satellites compose each landmark instead of scattering unrelated props.
  for(const o of p.landmarks){const urban=['building','warehouse','pavilion','shop'].includes(o.kind),items=o.kind==='shop'?['vending','plantpot','crates']:urban?['bike','planter','bench']:o.kind==='cabin'?['log','tent','flowers']:o.kind==='ruin'?['column','rock','bush']:['bush','flowers','rock'];
    items.forEach((kind,i)=>{const a=(o.variant%628)/100+i*2.1,r=o.radius+7+i*2,x=o.x+Math.cos(a)*r,y=o.y+Math.sin(a)*r;if(terrainCell(x,y,p)&&Math.hypot(x-HX,y-HY)>p.clearRadius+5&&!occupied(x,y,1))out.push({x,y,kind,scale:kind==='flowers'?1.2:1,rotation:a});});
  }return out;
}


/* 夏日街區：短篇地方記憶，不以對話框打斷掛機。只保存已發現的章節。 */
const FIELD_STORIES=[
 ['潮聲裡的呼號','渡船員 阿澄','海邊的樹下掛著一台小收音機，同一段旋律被潮聲蓋了一半。阿澄說，靠岸的人都哼過它。','巨像倒下後，收音機清楚地說了一句：下一班船，準時靠岸。'],
 ['山路上的天線','巡山員 留言','山路旁的路牌曬得褪了色，風一吹，電線桿頂的天線跟著轉。跟著它轉的方向走就對了。','BOSS胸口掉出一張車票。背面用原子筆寫著：電台前街，請走中間那條。'],
 ['河灣的晚班','渡船員 阿澄','河邊的靠岸燈傍晚才亮，像在等最後一位乘客。船家把汽水留在欄杆上，說是請路過的人喝。','水面靜下來後，遠處傳來有人試著對這一帶打招呼的聲音。'],
 ['盆地裡的回音','修理工 小禾','這一帶的鐘全停在同一分鐘。小禾蹲在電箱旁，說地下電纜偶爾會傳來像腳步的脈衝。','電纜重新亮起了一小段，訊號向山那邊延伸。'],
 ['海岸的備忘錄','渡船員 阿澄','海風帶來另一個街區的聲音。別丟掉舊卡匣，說不定裡面留著某人的地址。','BOSS終於停止巡邏。遠方海岸亮起一盞很小的燈。'],
 ['沒有打烊的街','鄰居廣播','午後的街上，電單車的方向燈還在閃，招牌也亮著。這一帶好像還沒到收工的時間。','街角喇叭播出了一段走調的收工音樂，聽起來反而有點親切。'],
 ['營火旁的地圖','修理工 小禾','帳篷裡的地圖圈著同一個街角。大家說，只要電台還亮，迷路的人就不算失蹤。','營地的短波機又響了。這次，另一端有人回答。'],
 ['舊城的約定','鐘樓留言','廣場上的長椅留著一個空位。每到黃昏，修理工們會在這裡交換零件，也交換消息。','鐘樓響了一次，像有人終於記起了約定。'],
 ['風仍記得名字','巡山員 留言','風車替空下來的村子發電。小禾說，別讓它停，那是通往電台的路標。','風車重新對準了電台的方向。被雜音蓋住的呼號清楚了一點。'],
 ['雪線以外','巡山員 留言','雪埋住了高處與低處之間的舊路。電台仍在播放，卻沒有收到回程的訊號。','雪裡露出一塊路牌：回程請沿燈光前進。'],
 ['石柱間的雜音','修理工 小禾','這些石柱比電台更古老。卡匣靠近時會發熱，像是這個地方也記得昔日的聲音。','石拱之間傳來短短三聲。那是舊時代表示平安的暗號。'],
 ['最後一批貨物','倉庫值班紀錄','貨倉裡剩下一批沒送出的收音機。搬運機照著排程等著，等一班晚點的貨車。','貨倉門開了。箱子上寫著：送往各個街角，讓大家聽得見彼此。']
];
const WORLD_TRAVEL={key:null,remaining:0,duration:.7};
function fieldDiscover(profile,boss=false){if(G.offline||profile<0||profile>=FIELD_STORIES.length)return;const key='p'+profile,bit=boss?2:1,old=G.storyFlags[key]||0;if(old&bit)return;G.storyFlags[key]=old|bit;G.dirty=true;}
function worldTravelStart(plan){if(G.offline||plan.key==='training')return;const changed=WORLD_TRAVEL.key!==plan.key;if(!changed)return;WORLD_TRAVEL.key=plan.key;WORLD_TRAVEL.remaining=WORLD_TRAVEL.duration;fieldDiscover(plan.profile);}
function worldTravelAdvance(dt){if(G.offline){WORLD_TRAVEL.remaining=0;return false;}WORLD_TRAVEL.remaining=Math.max(0,WORLD_TRAVEL.remaining-dt);return false;}
function worldTravelSkip(){WORLD_TRAVEL.remaining=0;}

function cleanUnread(raw){return Object.fromEntries(['skills','gear','cores','gems','carts','maps','boards'].map(k=>[k,[...new Set((Array.isArray(raw?.[k])?raw[k]:[]).filter(v=>typeof v==='string'&&v.length<80||Number.isSafeInteger(v)))].slice(-700)]));}
function noticeNew(kind,key){G.unread=G.unread||cleanUnread();const a=G.unread[kind];if(a&&!a.includes(key)){a.push(key);if(a.length>700)a.shift();G.dirty=true;}}
function noticeHas(kind,key){return !!G.unread?.[kind]?.includes(key);}
function noticeRead(kind,key){if(!G.unread?.[kind])return;G.unread[kind]=key==null?[]:G.unread[kind].filter(v=>v!==key);G.dirty=true;}
function cleanDeathReport(r){if(!r||!Number.isFinite(r.time)||typeof r.cause!=='string')return null;return {time:r.time,cause:r.cause.slice(0,100),area:typeof r.area==='string'?r.area.slice(0,80):'',total:Math.max(0,Number(r.total)||0),shield:Math.max(0,Number(r.shield)||0),largest:Math.max(0,Number(r.largest)||0),life:Math.max(1,Number(r.life)||1),sources:(Array.isArray(r.sources)?r.sources:[]).filter(q=>typeof q?.name==='string'&&Number.isFinite(q.amount)).slice(0,6).map(q=>({name:q.name.slice(0,100),amount:Math.max(0,q.amount)})),skills:(Array.isArray(r.skills)?r.skills:[]).filter(id=>SKILLS[id]).slice(0,6)};}
