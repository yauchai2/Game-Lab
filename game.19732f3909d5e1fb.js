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
  body{background-color:#bfe3ff;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='200' viewBox='0 0 900 200'><g fill='%23ffffff' opacity='.85'><path d='M60 60h40v-10h50v-10h70v10h30v20h-190z'/><path d='M560 40h30v-10h60v-10h50v10h30v20h-170z'/><path d='M360 110h30v-8h40v-8h40v8h20v16h-130z'/></g></svg>"),url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='140' viewBox='0 0 900 140' preserveAspectRatio='none'><g fill='%23a9c4ee'><path d='M0 140V90h40V60h30v30h30V40h40v50h30V70h40v70zM260 140V80h30V50h50v30h30v60zM420 140V70h40V30h30v40h40v-20h30v90zM640 140V90h40V55h30v35h40V70h40v70zM800 140V60h40V35h30v105z'/></g><g fill='%23c7daf6'><path d='M0 140v-30h60v-20h40v20h60v30zM200 140v-25h50v-18h40v18h70v25zM480 140v-30h70v-15h40v15h60v30zM700 140v-25h60v-20h40v20h100v25z'/></g></svg>") ,linear-gradient(180deg,var(--sk0,#8fcdf7) 0%,var(--sk1,#c9e9ff) 55%,var(--sk2,#f5fbff) 100%);background-repeat:repeat-x,repeat-x,no-repeat;background-position:0 12%,bottom,0 0;background-size:900px 200px,900px 140px,100% 100%;background-attachment:fixed;
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
  
  @media (max-width:560px){body{padding:14px 12px 24px}header span,.actions .cap{display:none}.actions{flex-direction:row;flex-wrap:wrap;gap:6px}.act{font-size:12px;padding:4px 11px}.stats{position:static;flex-direction:row;justify-content:flex-end;gap:18px;margin-bottom:4px}.actions{position:static;max-width:none;margin:6px 0 4px}.chips{left:0;top:calc(100% + 8px)}}
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
    <header><h1>Fig. ${cfg.fig} — ${cfg.title}</h1><span>${cfg.hint || ''}</span></header>
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
  ui.animate = step => { let last = performance.now();
    const loop = () => { const now = performance.now(), dt = Math.max(0, Math.min(.05,(now-last)/1000)); last = now; const more = step(dt) !== false; if (!ui.suspendRender || !ui.suspendRender()) ui.render(); if (more) (navigator.webdriver || document.hidden ? setTimeout(loop, 16) : requestAnimationFrame(loop)); };
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
    const chips = document.createElement('div'); chips.className = 'chips'; wrap.appendChild(chips);
    el.onclick = e => { e.stopPropagation(); const open = !wrap.classList.contains('open'); closeChips();
      if (!open) return;
      chips.innerHTML = '';
      // every choice stays clickable, so nothing silently ignores a press:
      //   current:true  = the one in use (shown selected); a press just says so
      //   disabled:true = not possible right now (shown faded); a press says why (c.why, or a generic note)
      for (const c of b.choices(st)){ const ch = document.createElement('button'); ch.className = 'chip' + (c.current ? ' current' : c.disabled ? ' off' : ''); ch.textContent = c.label;
        if (c.current) ch.setAttribute('aria-pressed', 'true');
        ch.onclick = ev => { ev.stopPropagation(); closeChips();
          if (c.current) return ui.flash(`${c.label} — already set`);
          if (c.disabled) return ui.flash(c.why || `${c.label} isn't possible right now`);
          c.onClick(st, ui); ui.render(); }; chips.appendChild(ch); }
      wrap.classList.add('open'); };
  });
  function closeChips(){ document.querySelectorAll('.stepwrap.open').forEach(w => w.classList.remove('open')); }
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
// 配件拼圖原型：純邏輯，不依賴遊戲其他檔案。設計見 docs/prototype-grid-and-mod-design.md
// 主動機件自動出手；輔助配件只強化上下左右相鄰、標籤相符的主動機件。
(function (root) {
  // 主動機件：shape 是相對格座標 [x, y]；tags 供輔助比對
  const ACTIVES = {
    // mult、cd 與 src/game/01-data.js 的 SKILLS 相同；原型獨立，所以在這裡複製一份
    FIRE:   { n: '過熱電池',   shape: [[0, 0]],                 tags: ['proj', 'fire'],  mult: 2.6, cd: 2.6 },
    FROST:  { n: '冷氣爆發',   shape: [[0, 0], [1, 0]],         tags: ['area', 'cold'],  mult: 1.9, cd: 4.2 },
    CHAIN:  { n: '紅外線連鎖', shape: [[0, 0], [0, 1]],         tags: ['proj', 'light'], mult: 2.3, cd: 3.2 },
    METEOR: { n: '衛星墜落',   shape: [[0, 0], [1, 0], [0, 1]], tags: ['area', 'fire'],  mult: 6.2, cd: 8.0 },
    PULSE:  { n: '重低音喇叭', shape: [[0, 0], [1, 0], [1, 1]], tags: ['area', 'light'], mult: 2.2, cd: 5.0 },
    SPAM:   { n: '垃圾郵件',   shape: [[0, 0], [1, 0]],         tags: ['proj', 'light'], mult: 1.1, cd: 3.6 },
    MAGNET: { n: '強力磁鐵',   shape: [[0, 0], [0, 1], [1, 1]], tags: ['area', 'cold'],  mult: 1.5, cd: 6.0 },
    FLICKER:{ n: '閃打連拍',   shape: [[0, 0], [1, 0], [2, 0], [2, 1]], tags: ['melee', 'light'], mult: 2.0, cd: 3.4 },
    BEAM:   { n: '雷射指向筆', shape: [[0, 0], [0, 1], [0, 2]], tags: ['proj', 'fire'],  mult: 4.5, cd: 5.5 },
  };
  // 輔助配件：needs 為空代表任何主動機件都適用；否則至少符合其中一個標籤
  const SUPPORTS = {
    HEAVY: { n: '超頻',     shape: [[0, 0], [1, 0]], needs: [],        mod: { dmg: 0.45 } },
    AREA:  { n: '廣播',     shape: [[0, 0]], needs: ['proj'],  mod: { area: 1, dmg: -0.15 } },
    HASTE: { n: '寬頻',     shape: [[0, 0], [1, 0], [2, 0]], needs: [],        mod: { cd: -0.3 } },
    TWIN:  { n: '雙卡雙待', shape: [[0, 0], [1, 0], [0, 1]], needs: [],        mod: { repeat: 1 } },
    CRITS: { n: '爆機',     shape: [[0, 0]], needs: [],        mod: { crit: 0.3 } },
    COOL:  { n: '散熱片',   shape: [[0, 0], [1, 0], [1, 1]], needs: [],        mod: { dmg: 0.2, cd: -0.15 } },
    CRYSTAL:{ n: '水晶振盪', shape: [[0, 0]], needs: [],        mod: { dmg: 0.1, crit: 0.15 } },
    LEECH: { n: '無線充電', shape: [[0, 0], [1, 0]], needs: [],        mod: { leech: 0.12 } },
  };
  const CD_FLOOR = -0.7; // 冷卻縮減上限 70%

  const defOf = (kind, key) => (kind === 'active' ? ACTIVES : SUPPORTS)[key];
  const rotCell = ([x, y]) => [-y, x];
  const norm = cells => {
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]);
  };
  // 旋轉 r 次（每次 90 度）後的形狀
  function shapeOf(kind, key, rot) {
    let s = defOf(kind, key).shape;
    for (let i = 0; i < (rot || 0) % 4; i++) s = norm(s.map(rotCell));
    return s;
  }
  const cellsOf = p => shapeOf(p.kind, p.key, p.rot).map(([x, y]) => [p.x + x, p.y + y]);

  function createBoard(w = 6, h = 1) { return { w, h, v: 3, pieces: [], nextId: 1 }; }

  function occupied(b, ignoreId) {
    const m = new Map();
    for (const p of b.pieces) if (p.id !== ignoreId) for (const [x, y] of cellsOf(p)) m.set(x + ',' + y, p.id);
    return m;
  }
  function canPlace(b, kind, key, x, y, rot, ignoreId) {
    const occ = occupied(b, ignoreId);
    return shapeOf(kind, key, rot).every(([dx, dy]) => {
      const cx = x + dx, cy = y + dy;
      return cx >= 0 && cy >= 0 && cx < b.w && cy < b.h && !occ.has(cx + ',' + cy);
    });
  }
  function place(b, kind, key, x, y, rot = 0) {
    if (!defOf(kind, key) || !canPlace(b, kind, key, x, y, rot)) return null;
    const p = { id: b.nextId++, kind, key, x, y, rot };
    b.pieces.push(p);
    return p;
  }
  function remove(b, id) {
    const i = b.pieces.findIndex(p => p.id === id);
    if (i < 0) return false;
    b.pieces.splice(i, 1);
    return true;
  }
  // 原地旋轉，放不下就維持原樣
  function rotate(b, id) {
    const p = b.pieces.find(q => q.id === id);
    if (!p) return false;
    const r = ((p.rot || 0) + 1) % 4;
    if (!canPlace(b, p.kind, p.key, p.x, p.y, r, id)) return false;
    p.rot = r;
    return true;
  }

  const fits = (sup, act) => {
    const need = SUPPORTS[sup.key].needs;
    return !need.length || need.some(t => ACTIVES[act.key].tags.includes(t));
  };

  // 每個主動機件的結算：相鄰且標籤相符的輔助，數值加總（冷卻有下限）
  function resolve(b) {
    const occ = occupied(b);
    const byId = new Map(b.pieces.map(p => [p.id, p]));
    const out = [];
    for (const a of b.pieces.filter(p => p.kind === 'active')) {
      const adj = new Set();
      for (const [x, y] of cellsOf(a))
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const id = occ.get((x + dx) + ',' + (y + dy));
          if (id && id !== a.id && byId.get(id).kind === 'support') adj.add(id);
        }
      const linked = [...adj].map(id => byId.get(id)).filter(s => fits(s, a));
      const stat = { dmg: 0, area: 0, cd: 0, crit: 0, repeat: 0, leech: 0 };
      for (const s of linked) for (const [k, v] of Object.entries(SUPPORTS[s.key].mod)) stat[k] += v;
      stat.cd = Math.max(stat.cd, CD_FLOOR);
      out.push({ id: a.id, key: a.key, linked: linked.map(s => s.id), stat });
    }
    return out;
  }

  // 在不動既有機件的前提下找一個位置：輔助要求能連到指定主動機件（activeId），找不到回傳 null
  function findSpot(b, kind, key, activeId) {
    for (let rot = 0; rot < 4; rot++)
      for (let y = 0; y < b.h; y++)
        for (let x = 0; x < b.w; x++) {
          if (!canPlace(b, kind, key, x, y, rot)) continue;
          if (kind === 'support') {
            const p = place(b, kind, key, x, y, rot), linked = resolve(b).find(r => r.id === activeId).linked.includes(p.id);
            remove(b, p.id);
            if (!linked) continue;
          }
          return { x, y, rot };
        }
    return null;
  }

  const REPEAT_K = 0.6; // 重複施放的傷害係數（雙卡雙待）

  // 預期 DPS（單一目標）：每次命中 = 武器傷害 × 技能倍率 × (1 + 傷害加成) × 期望暴擊倍率
  // hero：{ hit 武器傷害, crit 暴擊率 %, cm 暴擊傷害 % }
  function dps(b, hero) {
    return resolve(b).map(r => {
      const d = ACTIVES[r.key], st = r.stat;
      const crit = Math.min(1, Math.max(0, (hero.crit + st.crit * 100) / 100));
      const hit = hero.hit * d.mult * Math.max(0, 1 + st.dmg) * (1 + crit * (hero.cm / 100 - 1));
      const interval = d.cd * (1 + st.cd);
      const perCast = hit * (1 + st.repeat * REPEAT_K);
      return { id: r.id, key: r.key, hit, interval, dps: perCast / interval };
    });
  }

  const api = { findSpot, dps, ACTIVES, SUPPORTS, createBoard, shapeOf, cellsOf, canPlace, place, remove, rotate, resolve };
  if (typeof module !== 'undefined') module.exports = api; else root.GridLab = api;
})(typeof window !== 'undefined' ? window : globalThis);

;
/* =====================================================================
   Idle Hero v2: dark, hand-inked isometric idle ARPG
   skills + supports, passive tree, maps, save + offline progress
   ===================================================================== */
const BXW = 30, BYW = 74, BZ = 3;
const HX = 15, HY = 36;   // 主角站在島的正中央，怪物從四面八方來
// 怪物圍住英雄的站位（相對主角的偏移）：五圈、四方八面都有，讓一大群怪可以同時圍上來
const SLOTS = [];
for (const [n, r] of [[6, 10], [10, 16], [14, 22], [18, 28], [22, 34]]) for (let i = 0; i < n; i++){ const a = -Math.PI/2 + (i + (r % 2 ? .5 : 0))*Math.PI*2/n; SLOTS.push([Math.cos(a)*r, Math.sin(a)*r]); }
/* 裂縫：小怪從島邊的八道裂縫鑽出來；守關者則從天上掉到主角附近 */
const RIFTS = Array.from({ length:8 }, (_, k) => { const a = (k + .5)*Math.PI/4; return [HX + Math.cos(a)*52, HY + Math.sin(a)*52]; });
const BONE  = { l:'#f4efde', m:'#d9d2ba', d:'#a39b82' };
const STONE = { l:'#cfcabc', m:'#aaa598', d:'#7b766a' };
const BIOMES = [
  { n:'幽暗森林', board:{ l:'#b8e6a8', m:'#97d28c', d:'#6aa27a' }, t1:'#6fcf9a', t2:'#8fe0b0', portal:'#7a5fe0', glow:'#b79cff' },
  { n:'荒蕪沙漠', board:{ l:'#ffe4a8', m:'#f2cb86', d:'#c9a064' }, t1:'#d8c468', t2:'#ecdc88', portal:'#ff8a5c', glow:'#ffc9a0' },
  { n:'凍結雪原', board:{ l:'#eef7ff', m:'#cfe3f6', d:'#9ab4d6' }, t1:'#a8d0ee', t2:'#d2ecfb', portal:'#4a9cf0', glow:'#a8e0ff' },
  { n:'熔岩深淵', board:{ l:'#c9aebc', m:'#a98ea0', d:'#7a6078' }, t1:'#a8587a', t2:'#c8708a', portal:'#ff5a8a', glow:'#ffb0c8' },
  { n:'霓虹夜城', board:{ l:'#7a80c8', m:'#5f65ac', d:'#3a3f78' }, t1:'#00d8f0', t2:'#ff4fd8', portal:'#00e5ff', glow:'#8ffcff' },
  { n:'糖果樂園', board:{ l:'#ffd9ee', m:'#ffbfdf', d:'#e08cba' }, t1:'#ff8fc8', t2:'#8fe8ff', portal:'#ff6aa8', glow:'#ffd6ee' },
];
const RAR = [ { n:'普通', c:'#6b665b', g:'#d9d3c2', w:55 }, { n:'魔法', c:'#2f6fd6', g:'#6a9cf0', w:32 },
              { n:'稀有', c:'#a9780a', g:'#f4c542', w:11 }, { n:'暗金', c:'#c4501f', g:'#ff7a3d', w:2 } ];
const SLOTN = { weapon:'武器', armor:'外套', ring:'配件' };
const AFF = {
  dmg:   { t:v => `+${v} 物理傷害`,   b:il => 2 + il*.9 },
  inc:   { t:v => `${v}% 增加傷害`,    b:il => 8 + il*1.2 },
  crit:  { t:v => `+${v}% 暴擊率`,     b:il => 3 + il*.35 },
  cm:    { t:v => `+${v}% 暴擊傷害`,   b:il => 12 + il*1.6 },
  aps:   { t:v => `${v}% 攻擊速度`,    b:il => 5 + il*.5 },
  fire:  { t:v => `${v}% 火焰傷害`,    b:il => 10 + il*1.8 },
  cold:  { t:v => `${v}% 冰霜傷害`,    b:il => 10 + il*1.8 },
  light: { t:v => `${v}% 閃電傷害`,    b:il => 10 + il*1.8 },
  haste: { t:v => `${v}% 技能急速`,    b:il => 4 + il*.4 },
  life:  { t:v => `+${v} 生命`,        b:il => 12 + il*5 },
  armor: { t:v => `+${v} 護甲`,        b:il => 6 + il*3.5 },
  regen: { t:v => `+${v} 生命回復/秒`, b:il => 1 + il*.35 },
  leech: { t:v => `${v}% 生命偷取`,    b:il => .8 + il*.07 },
};
const POOL = { weapon:['dmg','inc','crit','aps','fire','cold','light'], armor:['life','armor','regen','leech','inc','haste'], ring:['crit','cm','leech','fire','cold','light','inc','aps','life','haste'] };
const STAT_KEY = { dmg:'dmg', inc:'inc', crit:'crit', cm:'cm', aps:'apsInc', fire:'fire', cold:'cold', light:'light', haste:'haste', life:'life', armor:'armor', regen:'regen', leech:'leech' };
const PREF = { dmg:'加重的', inc:'超頻的', crit:'爆擊的', cm:'暴走的', aps:'高速的', fire:'過熱的', cold:'冷氣的', light:'帶電的', haste:'寬頻的', life:'耐用的', armor:'加厚的', regen:'充電的', leech:'偷訊號的' };
// Y2K 城市物件：武器是街頭隨手可得的東西，外套是當年的潮服，配件是千禧年的電子小物
const BASES = { weapon:['摺疊傘','鋁製球棒','霓虹光管','雷射光劍'], armor:['連帽衛衣','牛仔外套','羽絨背心','反光風褸'], ring:['BB Call 傳呼機','翻蓋手機','MD 隨身聽','電子寵物機'] };
const RARE_NAMES = { weapon:['午夜快車','霓虹斷線','像素裂縫','千禧蟲'], armor:['街頭傳說','電波外套','夜行者','高架橋之影'], ring:['來電未接','Y2K 倒數','訊號滿格','撥號連線'] };
/* 傳奇（暗金）裝備：每個欄位三種，各自帶一條會改變技能行為的特效 */
const LEGENDS = {
  weapon:[ { id:'W_ECHO',  name:'回音光劍',   aff:['dmg','fire','crit','aps'],  d:'每施放 4 次技能，第 4 次會自動再施放一次（100% 傷害）' },
           { id:'W_FORK',  name:'碎星球棒',   aff:['dmg','inc','crit','cm'],    d:'技能暴擊時，另外對 2 個附近敵人造成 50% 傷害' },
           { id:'W_MULTI', name:'萬用遙控器', aff:['dmg','inc','haste','aps'],  d:'每裝備一種不同的技能，所有技能傷害 +15%' } ],
  armor:[  { id:'A_PHOENIX', name:'不滅羽絨', aff:['life','armor','regen','leech'], d:'受到致命傷時以 50% 生命復活，全部技能立即冷卻完畢（90 秒一次）' },
           { id:'A_RIPOSTE', name:'反光風褸', aff:['life','armor','inc','haste'],   d:'成功閃避時，自動施放一次技能（80% 傷害）' },
           { id:'A_RESET',   name:'電波外套', aff:['life','armor','haste','regen'], d:'每擊殺 25 隻怪，全部技能立即冷卻完畢' } ],
  ring:[   { id:'R_LAST', name:'最後一通來電', aff:['crit','cm','inc','aps'],   d:'生命低於 35% 時，技能冷卻速度 +150%、傷害 +40%' },
           { id:'R_LINK', name:'訊號滿格',     aff:['crit','inc','fire','light'], d:'擊殺怪物時，其生命的 50% 變成傷害轉給最近的敵人' },
           { id:'R_DIAL', name:'撥號連線',     aff:['cm','aps','haste','inc'],  d:'每次施放技能有 20% 機率免費再施放一次' } ],
};
const LEGEND_BY = {}; for (const sl in LEGENDS) for (const L of LEGENDS[sl]) LEGEND_BY[L.id] = L;

const SKILLS = {
  FIRE:  { n:'過熱電池', lvl:1,  cd:2.6, mult:2.6, el:'fire',  col:'#ff7a2a', tg:1.4, d:'丟出過熱的電池，命中時爆炸' },
  FROST: { n:'冷氣爆發', lvl:5,  cd:4.2, mult:1.9, el:'cold',  col:'#7fd3ff', tg:1.8, d:'開盡冷氣，冷風掃過全部敵人並凍結 1.4 秒' },
  CHAIN: { n:'紅外線連鎖', lvl:10, cd:3.2, mult:2.3, el:'light', col:'#ffe45c', tg:1.7, d:'紅外線在 3 個敵人間傳送（後續每跳 70%）' },
  METEOR:{ n:'衛星墜落', lvl:18, cd:8.0, mult:6.2, el:'fire',  col:'#ff4a1c', tg:1.9, d:'舊衛星從天而降，轟炸全場' },
  PULSE: { n:'重低音喇叭', lvl:8,  cd:5.0, mult:2.2, el:'light', col:'#c28aff', tg:1.6, d:'音浪從身邊炸開，震退並傷害附近敵人' },
  MAGNET:{ n:'強力磁鐵',   lvl:11, cd:6.0, mult:1.5, el:'cold',  col:'#7fa8ff', tg:1.8, d:'把周圍的怪全部吸到身邊並造成傷害' },
  SPAM:  { n:'垃圾郵件',   lvl:14, cd:3.6, mult:1.1, el:'light', col:'#ffffff', tg:3.5, d:'一口氣寄出 6 封郵件，隨機砸中不同敵人' },
  FLICKER:{ n:'閃打連拍',  lvl:12, cd:3.4, mult:2.0, el:'light', col:'#ff9ae0', tg:3.2, d:'像閃光燈一樣連續閃到 4 個敵人身邊痛擊，最後一下 +50% 傷害' },
  BEAM:  { n:'雷射指向筆', lvl:16, cd:5.5, mult:4.5, el:'fire',  col:'#ff4a6a', tg:2.2, d:'射出一道貫穿全場的雷射，打中直線上所有敵人' },
};
/* 更新日誌：最新的放最前面。版本號 0.主要.小修：新增玩法系統就加主要，修正與打磨就加小修，1.0 留給正式版；改了遊戲就在最前面加一筆 */
const VERSION = () => CHANGELOG[0].v;
const CHANGELOG = [
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
/* 遺物：每次擊敗守關者（深度推進或地圖通關）三選一，永久生效，全部不重複 */
const RELICS = {
  FAN:   { n:'迷你風扇',   d:'技能冷卻 -10%', st:'haste', v:10 },
  LENS:  { n:'放大鏡',     d:'暴擊傷害 +40%', st:'cm', v:40 },
  CHARM: { n:'護身符',     d:'閃避 +6%', st:'dodge', v:6 },
  DRINK: { n:'運動飲料',   d:'生命回復 +4/秒', st:'regen', v:4 },
  BATT:  { n:'電池組',     d:'傷害 +12%', st:'inc', v:12 },
  VEST:  { n:'防彈背心',   d:'護甲 +40，生命 +10%', st:'armor', v:40 },
  CALC:  { n:'計算機',     d:'經驗值 +20%' },
  PIG:   { n:'撲滿',       d:'金幣 +30%' },
  LUCK:  { n:'幸運符',     d:'暗金機率 +3%（含保底）' },
  FOOD:  { n:'暴食便當',   d:'擊殺怪物回復 1% 生命' },
  BOMB:  { n:'連環炸彈',   d:'擊殺怪物有 10% 機率爆炸，傷害周圍敵人（150% 技能傷害）' },
  SUN:   { n:'小太陽',     d:'每 10 秒，對全場敵人造成一次 120% 技能傷害' },
};
/* 裝扮：每個部位一組顏色，價格用金幣；第一個是預設（免費、已擁有） */
const COS_CATS = [['hstyle', '髮型'], ['hair', '髮色'], ['tstyle', '上衣款式'], ['hat', '帽子'], ['glasses', '眼鏡'], ['pack', '背飾'], ['top', '上衣'], ['pants', '褲子'], ['shoes', '鞋子'], ['phones', '耳機'], ['skin', '膚色']];
const COS = {
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
const RANKS = [[1, '實習英雄'], [5, '街頭新手'], [10, '巷口勇者'], [20, '都市傳說'], [35, '世紀末英雄'], [50, '千禧之王']];
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
  MAGNET_STICKY:{ sk:'MAGNET', n:'黏性磁鐵', hint:'被吸住的東西動不了。', d:'被吸過來的敵人凍結 2 秒' },
  FLICKER_STORM:{ sk:'FLICKER', n:'閃光風暴', hint:'快門按到停不下來。', d:'一次閃 8 下，每下 50% 傷害，沒有最後一擊加成' },
  FLICKER_REAP: { sk:'FLICKER', n:'收割閃打', hint:'它只對倒下的目標感興趣。', d:'擊殺目標時立刻追加一次閃打，可連續觸發' },
  FLICKER_TRAIL:{ sk:'FLICKER', n:'殘影拖尾', hint:'留下的殘影也會咬人。', d:'每一下命中點留下殘影，0.4 秒後再造成 22% 傷害' },
  SPAM_FLOOD:   { sk:'SPAM',   n:'洗版', hint:'信箱爆了。', d:'一次寄出 14 封，每封 45% 傷害' },
  SPAM_PHISH:   { sk:'SPAM',   n:'釣魚信件', hint:'它專挑最肥的魚。', d:'只寄 3 封，專打生命最多的敵人，每封 +200% 傷害' },
  BEAM_SWEEP:   { sk:'BEAM',   n:'掃射', hint:'指向筆在手裡抖個不停。', d:'同時射出三道雷射（左右各偏 35 度），各 65% 傷害' },
  BEAM_FOCUS:   { sk:'BEAM',   n:'聚焦', hint:'光點縮得很小很小。', d:'雷射變細，傷害 +150%，只打最近一條線上的敵人' },
};
const SUPPS = {
  HEAVY:{ n:'超頻', d:'此技能傷害 +45%' }, COOL:{ n:'散熱片', d:'此技能傷害 +20%，冷卻 -15%' }, CRYSTAL:{ n:'水晶振盪', d:'此技能傷害 +10%，暴擊率 +15%' }, AREA:{ n:'廣播', d:'電池命中全部敵人（-15%）；連鎖多跳 2 次' }, HASTE:{ n:'寬頻', d:'此技能冷卻 -30%' },
  LEECH:{ n:'無線充電', d:'此技能傷害的 12% 轉為生命' }, TWIN:{ n:'雙卡雙待', d:'0.25 秒後重複施放一次（60% 傷害）' }, CRITS:{ n:'爆機', d:'此技能暴擊率 +30%' },
};
/* 升級三選一的「改裝卡」：數值卡常見，技能變體卡只在該技能裝備時出現，會改變技能行為 */
const CARDS = {
  C_DMG:{ n:'超頻電路', d:'傷害 +15%', st:'inc', v:15 }, C_CRIT:{ n:'高感度麥克風', d:'暴擊率 +6%', st:'crit', v:6 }, C_CM:{ n:'重低音', d:'暴擊傷害 +20%', st:'cm', v:20 },
  C_DODGE:{ n:'防滑鞋底', d:'閃避 +5%', st:'dodge', v:5 }, C_APS:{ n:'快速充電', d:'攻速 +10%', st:'apsInc', v:10 }, C_LIFE:{ n:'大容量電池', d:'生命 +12%', st:'lifePct', v:12 }, C_HASTE:{ n:'寬頻升級', d:'技能冷卻 -8%', st:'haste', v:8 },
  C_REGEN:{ n:'太陽能板', d:'生命回復 +2/秒', st:'regen', v:2 }, C_ARMOR:{ n:'防水外殼', d:'護甲 +20', st:'armor', v:20 }, C_LEECH:{ n:'無線充電座', d:'吸血 +1.5%', st:'leech', v:1.5 },
  V_SPLIT:{ n:'分裂電池', d:'過熱電池爆炸時，另外炸向 2 隻附近怪物（60% 傷害），每張 +2 隻', sk:'FIRE', max:3 },
  V_SHATTER:{ n:'冷凍碎裂', d:'被凍結的怪物受到技能傷害 +40%，每張再 +40%', sk:'FROST', max:3 },
  V_FORK:{ n:'多重頻道', d:'紅外線多跳 2 次，每張再 +2 次', sk:'CHAIN', max:3 },
  V_ECHO:{ n:'雙衛星', d:'衛星墜落後 0.6 秒再落一顆（50% 傷害）', sk:'METEOR', max:1 },
};
/* 可選角色：外觀（髮色、褲色、膚色）與被動；用最深深度解鎖 */
const CHARS = {
  street:{ n:'阿街', d:'街頭小子。傷害 +10%', eff:{ inc:10 }, sig:{ n:'街頭衝撞', cd:7, d:'每 7 秒衝撞周圍敵人，傷害 ×7 並擊退' }, need:0, hair:null, pants:null, skin:null },
  frost: { n:'小冷', d:'愛吹冷氣。冷氣傷害 +30%，生命回復 +1.5', eff:{ cold:30, regen:1.5 }, sig:{ n:'冷氣護罩', cd:9, d:'每 9 秒冷風吹過全場，凍結敵人 1.4 秒' }, need:6, hair:'#3d7fd0', pants:'#5a6fb0', skin:'#f6d8c8' },
  beep:  { n:'傳呼仔', d:'有 Call 必應。攻速 +12%，吸血 +1.5%', eff:{ apsInc:12, leech:1.5 }, sig:{ n:'連環 Call', cd:6, d:'每 6 秒隨機呼叫 6 個敵人，各受 ×5 傷害' }, need:0, ach:'boss10', hair:'#ff6aa8', pants:'#2b2552', skin:null },
  volt:  { n:'電波仔', d:'訊號滿格。暴擊率 +6%，閃電傷害 +30%', eff:{ crit:6, light:30 }, sig:{ n:'訊號塔', cd:8, d:'每 8 秒落雷劈 5 個敵人（必定暴擊）' }, need:12, hair:'#e0b020', pants:'#8a4a8f', skin:'#e2ac86' },
};
/* 成就：帳號永久進度。每個成就永久傷害 +1%，部分成就解鎖角色 */
const ACHS = {
  k100:{ n:'初試身手', d:'累計擊殺 100 隻怪物', ok:() => G.totalKills >= 100 },
  k2000:{ n:'割草專家', d:'累計擊殺 5000 隻怪物', ok:() => G.totalKills >= 5000 },
  boss1:{ n:'守關者殺手', d:'擊敗守關者 1 次', ok:() => (G.bossKills || 0) >= 1 },
  boss10:{ n:'傳呼機響了', d:'擊敗守關者 30 次，解鎖角色「傳呼仔」', ok:() => (G.bossKills || 0) >= 30 },
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
  more:  { kind:'challenge', n:'怪群更大（+1 隻）', q:.25 }, fast:{ kind:'challenge', n:'怪物更迅捷', q:.15 }, tough:{ kind:'challenge', n:'怪物生命 +40%', q:.2 },
  deadly:{ kind:'challenge', n:'怪物傷害 +35%', q:.2 }, rich:{ kind:'reward', n:'金幣 +60%', q:.1 }, lucky:{ kind:'reward', n:'稀有度提升', q:.2 },
  elite:{ kind:'challenge', n:'菁英出沒', q:.3 }, swarm:{ kind:'mixed', n:'怪潮（怪群 +3，生命 -25%）', q:.2 }, wise:{ kind:'reward', n:'經驗 +50%', q:.1 },
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
  { n:'熱身', t:'擊殺 20 隻怪物', k:'kills', goal:20, rw:{ gold:150 } },
  { n:'升級', t:'升到 3 級', k:'lvl', goal:3, rw:{ gem:'HASTE' } },
  { n:'往前走', t:'抵達深度 3', k:'depth', goal:3, rw:{ gold:300 } },
  { n:'換新裝', t:'升到 6 級', k:'lvl', goal:6, rw:{ gem:'CRITS' }, un:'tree', tip:'天賦盤已開放：升級得到的點數可以在這裡分配。' },
  { n:'第一個守關者', t:'抵達深度 6', k:'depth', goal:6, rw:{ gold:600 } },
  { n:'拆解與改機', t:'升到 10 級', k:'lvl', goal:10, rw:{ parts:10 }, un:'craft', tip:'改機已開放：拆掉不要的裝備得到零件，拿來重洗與改裝。' },
  { n:'動手改一次', t:'改機 1 次', k:'craft', goal:1, rw:{ parts:6, gold:500 } },
  { n:'出門探索', t:'完成 1 張地圖', k:'runs', goal:1, rw:{ cart:'FIRE_BLAST' } },
  { n:'鑑定卡匣', t:'鑑定 1 種模式', k:'modes', goal:1, rw:{ gem:'TWIN' } },
  { n:'挑戰極限', t:'抵達深度 8，解鎖無限之塔', k:'depth', goal:8, rw:{ parts:15, gold:1000 } },
];
const TAB_LVL = { tree:6, craft:10, maps:5 };
const GOAL_UNIT = { kills:'隻怪物', lvl:'級', depth:'層深度', runs:'張地圖通關', modes:'種卡匣鑑定' };
const tLerp = (a,b,t) => a + (b-a)*t, tClamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const tRand = (a,b) => a + Math.random()*(b-a), tPick = a => a[Math.floor(Math.random()*a.length)];
const tFmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e4 ? (n/1e3).toFixed(1)+'k' : String(Math.round(n));


;
/* ---------- passive tree ---------- */
const EFF_TXT = { life:v => `+${v} 生命`, lifePct:v => `+${v}% 最大生命`, dmgPct:v => `${v}% 增加傷害`, sinc:v => `${v}% 技能傷害`, apsInc:v => `${v}% 攻擊速度`, crit:v => `+${v}% 暴擊率`, cm:v => `+${v}% 暴擊傷害`,
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
  time:0, lvl:1, xp:0, gold:0, depth:1, maxDepth:1, kills:0, need:60, bossOut:false, push:true, speed:1, filter:0, deaths:0, spawnCd:.5, totalKills:0,
  equip:{ weapon:null, armor:null, ring:null }, armory:{}, equipBackup:{}, deferChoices:false, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
  pass:[], autoCard:false, ach:{}, legSeen:{}, pity:0, towerBest:0, quest:0, craftN:0, mk:{}, seenG:{}, seenC:{}, cz:1, userCz:false, dmgNum:1, seenInv:0, seenParts:0, seenGoals:0, builds:[null, null, null], bi:0, bossHp:0, parts:0, cos:{ tstyle:'0', hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, own:{}, heroName:'阿街', born:[new Date().getMonth() + 1, new Date().getDate()], relics:{}, relicPicks:0, offerR:null, sunT:0, bossKills:0, char:'street', cards:{}, picks:0, offer:null, maps:[], run:null, cds:{ FIRE:1.2, FROST:1, CHAIN:1, METEOR:2, PULSE:1, MAGNET:1, SPAM:1, BEAM:1 },
  h:{ x:HX, y:HY, vx:0, vy:0, gx:HX, gy:HY, aiT:0, mv:0, hp:100, swingT:-1, swingHit:true, atkCd:0, castT:-1, castFired:true, castSk:'FIRE', hurtT:0, dead:0, potCd:0 },
  lgK:0, lgC:0, mons:[], drops:[], proj:[], fx:[], floats:[], timers:[], log:[], st:null, dirty:true, offline:false, paused:false, off:null, lastWall:Date.now(),
};
/* 打擊感：畫面震動、縮放衝擊、邊緣閃光；視角旋轉（yaw）也放這裡 */
const FXO = { shake:0, flash:0, fc:'#fff', punch:0, yaw:0, yawT:0, zoom:1, zoomT:1, stop:0 };
function hitStop(t){ if (!G.offline) FXO.stop = Math.max(FXO.stop, t); }
function kick(s, f, c, p){ if (G.offline) return; FXO.shake = Math.max(FXO.shake, s); if (f){ FXO.flash = Math.max(FXO.flash, f); FXO.fc = c || '#fff'; } if (p) FXO.punch = Math.max(FXO.punch, p); }
/* 配件拼圖：玩家擺的是 G.board；G.slots / G.supp 由它推導出來，戰鬥與屬性計算照舊讀這兩個 */
const boardRows = (lvl = G.lvl) => Math.max(1, SLOT_LV.filter(l => lvl >= l).length);
function newBoard(){ G.board = GridLab.createBoard(6, boardRows()); }
function syncBoard(){
  if (!G.board) boardFromLegacy(['FIRE'], { FIRE:['HEAVY'] });
  G.board.h = Math.max(G.board.h, boardRows());   // 等級提高才會多開一列
  const res = GridLab.resolve(G.board), actives = G.board.pieces.filter(p => p.kind === 'active').sort((a, b) => a.y - b.y || a.x - b.x);
  const supOf = id => (res.find(r => r.id === id) || { linked:[] }).linked.map(i => G.board.pieces.find(p => p.id === i).key);
  G.slots = actives.map(p => p.key);
  G.modeOf = {}; for (const p of actives) if (p.mode && MODES[p.mode] && MODES[p.mode].sk === p.key) G.modeOf[p.key] = p.mode;
  G.supp = {}; for (const id of Object.keys(SKILLS)) G.supp[id] = [];
  for (const p of actives) G.supp[p.key] = supOf(p.id);
  for (const id of G.slots) if (G.cds[id] == null) G.cds[id] = 1;
}
// 面板改版（寬度或形狀變了）的存檔：原位放得下就維持，放不下就找位置，仍放不下的留回庫存
function sanitizeBoard(old){
  newBoard(); const b = G.board, ps = (old.pieces || []).filter(p => GridLab.ACTIVES[p.key] || GridLab.SUPPORTS[p.key]);
  const put = p => { const def = p.kind === 'active' ? GridLab.ACTIVES : GridLab.SUPPORTS;
    if (!def[p.key] || (p.kind === 'active' && b.pieces.some(q => q.kind === 'active' && q.key === p.key))) return null;
    let q = GridLab.canPlace(b, p.kind, p.key, p.x, p.y, p.rot || 0) ? GridLab.place(b, p.kind, p.key, p.x, p.y, p.rot || 0) : null;
    if (!q){ const sp = p.kind === 'active' ? GridLab.findSpot(b, p.kind, p.key) : b.pieces.filter(a => a.kind === 'active').map(a => GridLab.findSpot(b, p.kind, p.key, a.id)).find(Boolean) || null; if (sp) q = GridLab.place(b, p.kind, p.key, sp.x, sp.y, sp.rot); }
    if (q && p.mode) q.mode = p.mode; return q; };
  for (const p of ps.filter(p => p.kind === 'active')) put(p);
  for (const p of ps.filter(p => p.kind === 'support')) put(p);
}
// 舊存檔（技能槽加輔助孔）搬到拼圖：主動機件依序放，輔助盡量貼著它放；放不下的留在庫存
function boardFromLegacy(slots, supp){
  newBoard(); const b = G.board;
  for (const id of slots){ if (!id || !GridLab.ACTIVES[id]) continue;
    const sp = GridLab.findSpot(b, 'active', id); if (!sp) continue;
    const a = GridLab.place(b, 'active', id, sp.x, sp.y, sp.rot);
    for (const g of (supp && supp[id]) || []){ if (!g || !GridLab.SUPPORTS[g]) continue;
      const q = GridLab.findSpot(b, 'support', g, a.id); if (q) GridLab.place(b, 'support', g, q.x, q.y, q.rot); } }
}
/* 6×6 共鳴：整列／整欄塞滿、同元素技能緊貼 */
const ELT = { fire:1, cold:1, light:1 };
function boardBonus(){
  const b = G.board, r = { rows:0, cols:0, pair:{} }; if (!b) return r;
  const at = {}; for (const p of b.pieces) for (const [x, y] of GridLab.cellsOf(p)) at[x + ',' + y] = p;
  for (let y = 0; y < b.h; y++){ let f = true; for (let x = 0; x < b.w; x++) if (!at[x + ',' + y]) f = false; if (f) r.rows++; }
  for (let x = 0; x < b.w; x++){ let f = true; for (let y = 0; y < b.h; y++) if (!at[x + ',' + y]) f = false; if (f && b.h > 1) r.cols++; }
  const el = p => GridLab.ACTIVES[p.key].tags.filter(t => ELT[t]);
  for (const k of Object.keys(at)){ const [x, y] = k.split(',').map(Number), p = at[k]; if (p.kind !== 'active') continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]){ const q = at[(x + dx) + ',' + (y + dy)]; if (q && q !== p && q.kind === 'active' && el(p).some(t => el(q).includes(t))) r.pair[p.key] = r.pair[q.key] = 1; } }
  return r;
}
const gemUsed = id => G.board ? G.board.pieces.filter(p => p.kind === 'support' && p.key === id).length : 0;
const cartUsed = id => G.board ? G.board.pieces.filter(p => p.mode === id).length : 0;
const cartFree = id => (G.carts[id] || 0) - cartUsed(id);
const gemFree = id => (G.gems[id] || 0) - gemUsed(id);
const passPoints = () => Math.max(0, G.lvl - 1) + Math.floor((G.maxDepth - 1)/4) - G.pass.length;
const nodeOpen = id => !G.pass.includes(id) && id !== 'S' && TREE[id].links.some(l => l === 'S' || G.pass.includes(l));
const biomeNow = () => G.run ? G.run.map.biome : Math.floor((G.depth - 1)/8) % BIOMES.length;
const lvlNow = () => G.run ? G.run.map.lvl : G.depth;
const runQ = () => G.run ? G.run.map.mods.reduce((a, m) => a + MODS[m].q, 0) : 0;

/* ---------- items ---------- */
function rollAff(k, il, boost=1){ const v = AFF[k].b(il) * (.6 + Math.random()*.7) * boost; return { k, v: k === 'leech' ? Math.round(v*10)/10 : Math.max(1, Math.round(v)) }; }
function makeItem(slot, rar, il){
  const n = rar === 0 ? 0 : rar === 1 ? (Math.random() < .5 ? 1 : 2) : rar === 2 ? (Math.random() < .5 ? 3 : 4) : 4;
  const LG = rar === 3 ? tPick(LEGENDS[slot]) : null, keys = rar === 3 ? LG.aff.slice() : POOL[slot].slice().sort(() => Math.random() - .5).slice(0, n);
  const aff = keys.map(k => rollAff(k, il, rar === 3 ? 1.35 : 1));
  const tier = Math.min(3, Math.floor(il/6));
  const imp = slot === 'weapon' ? { k:'dmg', v:Math.round(4 + il*1.5) } : slot === 'armor' ? { k:'armor', v:Math.round(5 + il*3) } : { k:'crit', v:2 };
  let name = BASES[slot][tier];
  if (rar === 1) name = PREF[aff[0].k] + name; else if (rar === 2) name = tPick(RARE_NAMES[slot]); else if (rar === 3) name = LG.name;
  if (LG) G.legSeen[LG.id] = 1;
  return LG ? { slot, r:rar, il, name, imp, aff, lg:LG.id } : { slot, r:rar, il, name, imp, aff };
}
function rarityRoll(boss){
  const bonus = Math.min(8, lvlNow()*.25) + runQ()*6 + (G.run && G.run.map.mods.includes('lucky') ? 4 : 0), w = [RAR[0].w - bonus*2, RAR[1].w, RAR[2].w + bonus, RAR[3].w + bonus*.3];
  let r = Math.random()*w.reduce((a, b) => a + b, 0), i = 0; while (r > w[i] && i < 3) r -= w[i++];
  if (offPen() && i === 3) i = 2;   // 暗金只在人在場時掉
  if (boss){ if (i < 2) i = 2; if (!offPen() && Math.random() < Math.min(1, .1 + .06*(G.pity || 0) + (G.relics.LUCK ? .03 : 0))) i = 3; }   // 守關者暗金保底：每次沒出就 +6%，最多 15 件必出
  if (boss && !offPen()){ if (i === 3) G.pity = 0; else G.pity = (G.pity || 0) + 1; }
  return i;
}
const itemValue = it => Math.round((1 + it.r*2.2) * (4 + it.il*2.4));
const itemLines = it => [it.imp, ...it.aff].map((a, i) => ({ t:AFF[a.k].t(a.v), imp:i === 0 })).concat(it.cr ? [{ t:'已腐化', lg:true }] : []).concat(it.lg && LEGEND_BY[it.lg] ? [{ t:'★ ' + LEGEND_BY[it.lg].d, lg:true }] : []);
const offPen = () => G.offline && G.offPen;   // 離開超過 60 秒才算離線：經驗 75%、掉落 25%、暗金不掉；短暫切走只是快轉補上
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
  if (!slot || !it || G.equip[slot]?.lg === id) return false;
  G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function restoreEquipment(slot){
  const last = G.equipBackup?.[slot];
  if (!last || last.slot !== slot) return false;
  const it = last.lg ? G.armory[last.lg] : last;
  if (!it) return false;
  G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function makeMap(lvl){
  const keys = Object.keys(MODS).sort(() => Math.random() - .5).slice(0, 2 + Math.floor(Math.random()*3));
  return { id:Math.random().toString(36).slice(2, 8), lvl, biome:Math.floor(Math.random()*BIOMES.length), mods:keys };
}

/* ---------- 目標 ---------- */
const GOAL_STAT = { kills:() => G.totalKills, lvl:() => G.lvl, depth:() => G.maxDepth, runs:() => G.mapsDone, modes:() => Object.keys(G.seen).length, craft:() => G.craftN || 0 };
const goalRewardText = r => [r.gold && `金幣 ${r.gold}`, r.parts && `零件 ${r.parts}`, r.gem && `輔助：${SUPPS[r.gem].n}`, r.cart && `卡匣：${G.seen[r.cart] ? MODES[r.cart].n : '未鑑定的' + SKILLS[MODES[r.cart].sk].n + '卡匣'}`].filter(Boolean).join('、');
function checkQuest(){
  for (let g = 0; g < 4; g++){
    const q = QUESTS[G.quest || 0]; if (!q || GOAL_STAT[q.k]() < q.goal) return;
    const r = q.rw; G.quest = (G.quest || 0) + 1;
    if (r.gold) G.gold += r.gold; if (r.parts) G.parts = (G.parts || 0) + r.parts; if (r.gem) G.gems[r.gem] = (G.gems[r.gem] || 0) + 1; if (r.cart) G.carts[r.cart] = (G.carts[r.cart] || 0) + 1;
    logLine(`任務完成：${q.n}（${[r.gold && '金幣 ' + r.gold, r.parts && '零件 ' + r.parts, r.gem && '輔助：' + SUPPS[r.gem].n, r.cart && '卡匣'].filter(Boolean).join('、')}）${q.tip ? ' ' + q.tip : ''}`, '#1f9bbf'); addFloat(HX + 3, HY, BZ + 26, '任務完成！', '#1f9bbf', 3.8); G.dirty = true;
  }
}
const tabOpen = k => !TAB_LVL[k] || G.lvl >= TAB_LVL[k];
function checkGoals(){
  checkQuest();
  for (const a of GOALS){
    if (G.goals[a.id] || GOAL_STAT[a.k]() < a.goal) continue;
    G.goals[a.id] = 1; const r = a.rw;
    if (r.gold) G.gold += r.gold; if (r.gem) G.gems[r.gem] = (G.gems[r.gem] || 0) + 1; if (r.cart) G.carts[r.cart] = (G.carts[r.cart] || 0) + 1;
    logLine(`目標達成：${a.n}（${goalRewardText(r)}）`, '#d18a00'); addFloat(HX + 3, HY, BZ + 26, '目標達成！', '#d18a00', 3.8); G.dirty = true;
  }
}

/* ---------- stats ---------- */
function calc(equip = G.equip, pass = G.pass, slots = G.slots, supp = G.supp){
  const s = { life:0, dmg:5 + 1.8*G.lvl, inc:0, crit:5, cm:150, apsInc:0, regen:1.5, leech:0, armor:0, fire:0, cold:0, light:0, haste:0, sinc:0, lifePct:0, dodge:10 };
  const baseLife = 90 + 14*G.lvl;
  for (const k in equip){ const it = equip[k]; if (!it) continue; for (const a of [it.imp, ...it.aff]) s[STAT_KEY[a.k]] += a.v; }
  for (const [k, v] of Object.entries(CHARS[G.char].eff)) s[k] += v;
  s.inc += achCount();
  for (const [id, n] of Object.entries(G.cards)){ const c = CARDS[id]; if (c && c.st) s[c.st] += c.v*n; }
  for (const id of Object.keys(G.relics)){ const r = RELICS[id]; if (r && r.st) s[r.st] += r.v; }
  if (G.relics.VEST) s.lifePct += 10;
  for (const id of pass){ const n = TREE[id]; if (!n) continue; for (const [k, v] of Object.entries(n.eff)) s[k === 'dmgPct' ? 'inc' : k] += v; }
  s.life = (baseLife + s.life) * (1 + s.lifePct/100);
  s.aps = Math.min(4, 1 + s.apsInc/100);
  s.red = Math.min(.7, s.armor / (s.armor + 60 + 12*G.lvl));
  const bb = boardBonus(); s.crit += 5*bb.cols; s.bb = bb;
  s.critAvg = 1 + Math.min(s.crit, 100)/100 * (s.cm/100 - 1);
  s.hit = s.dmg * (1 + s.inc/100);
  s.sk = {}; let dps2 = 0;
  for (const id of slots){ if (!id) continue;
    const K = SKILLS[id], sp = supp[id] || [], has = x => sp.includes(x), n = x => sp.filter(y => y === x).length;
    const hit = s.dmg * K.mult * (1 + (s.inc + s[K.el] + s.sinc)/100) * (Object.values(equip).some(it => it && it.lg === 'W_MULTI') ? 1 + .15*slots.filter(Boolean).length : 1) * (1 + .45*n('HEAVY')) * (1 + .08*Math.max(0, Math.min(5, sp.length) - 2)) * (1 + .2*n('COOL') + .1*n('CRYSTAL')) * (1 + .12*bb.rows) * (bb.pair[id] ? 1.15 : 1) * (has('AREA') && id === 'FIRE' ? .85 : 1);
    const cd = K.cd * (G.modeOf[id] === 'CHAIN_OVERLOAD' ? 1.8 : 1) * (1 - Math.min(.6, (s.haste + 30*n('HASTE') + 15*n('COOL'))/100)), crit = Math.min(100, s.crit + 30*n('CRITS') + 15*n('CRYSTAL'));
    const ca = 1 + crit/100*(s.cm/100 - 1);
    s.sk[id] = { mode:G.modeOf[id] || null, hit, cd, crit, has:sp.filter(Boolean), area:has('AREA'), twin:n('TWIN'), leech:has('LEECH') };
    dps2 += hit * ca * K.tg * (has('AREA') && id === 'FIRE' ? 1.5 : 1) * (1 + .6*n('TWIN')) / cd;
  }
  s.dps = s.hit * s.critAvg * s.aps + dps2;
  s.power = s.dps * Math.sqrt(s.life / (1 - s.red));
  return s;
}
function recalc(){ syncBoard(); syncCoreCollection(); const old = G.st; G.st = calc(); const h = G.h; h.hp = old ? h.hp * G.st.life / old.life : G.st.life; G.dirty = true; }
const achCount = () => Object.keys(G.ach).length;
function checkAch(){ for (const [id, a] of Object.entries(ACHS)) if (!G.ach[id] && a.ok()){ G.ach[id] = 1; recalc(); logLine(`成就解鎖：${a.n}（永久傷害 +1%）`, '#c28a00'); addFloat(HX, HY, BZ + 26 + 2, a.n, '#c28a00', 4); SFX('rare'); G.dirty = true; } }
const charOk = id => CHARS[id].ach ? !!G.ach[CHARS[id].ach] : G.maxDepth >= CHARS[id].need;
function pickChar(id){ if (!CHARS[id] || !charOk(id)) return; G.char = id; recalc(); logLine(`角色：${CHARS[id].n}`, '#2b6fa8'); SFX('card'); }
const cardN = id => G.cards[id] || 0;
function rollCards(n = 3){
  const pool = Object.entries(CARDS).filter(([id, c]) => c.sk ? G.slots.includes(c.sk) && cardN(id) < c.max : true).map(([id, c]) => ({ id, w:c.sk ? 4 : 10 })), out = [];
  while (out.length < n && pool.length){ let r = Math.random()*pool.reduce((a, x) => a + x.w, 0), i = 0; while (i < pool.length - 1 && r >= pool[i].w){ r -= pool[i].w; i++; } out.push(pool.splice(i, 1)[0].id); }
  return out;
}
function rollRelics(n = 3){ const pool = Object.keys(RELICS).filter(id => !G.relics[id]); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]); return out; }
function takeRelic(id){ G.relics[id] = 1; G.relicPicks = Math.max(0, G.relicPicks - 1); G.offerR = null; recalc(); logLine(`獲得遺物：${RELICS[id].n}`, '#c28a00'); }
function takeCard(id){ G.cards[id] = cardN(id) + 1; G.picks = Math.max(0, G.picks - 1); G.offer = null; recalc(); const c = CARDS[id]; logLine(`改裝：${c.n}`, c.sk ? '#8e3fd1' : '#2b6fa8'); }
function resolveOfflineChoices(summary){
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
function addFloat(x, y, z, txt, col, size=3.6){ if (G.offline) return; G.floats.push({ x, y, z, txt, col, size, t:0 }); }
function addFx(e){ if (!G.offline) G.fx.push(e); }

/* ---------- save / load ---------- */
const SAVE_KEY = 'idle-hero-save-v2';
function serialize(){ return { v:2, t:Date.now(), lvl:G.lvl, xp:G.xp, gold:G.gold, depth:G.depth, maxDepth:G.maxDepth, kills:G.kills, push:G.push, speed:G.speed, filter:G.filter, deaths:G.deaths, totalKills:G.totalKills,
  equip:G.equip, armory:G.armory, equipBackup:G.equipBackup, deferChoices:G.deferChoices, gems:G.gems, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, mk:G.mk, seenG:G.seenG, seenC:G.seenC, cz:G.cz, userCz:G.userCz, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:G.h.hp, log:G.log.slice(0, 5) }; }
function applySave(o){
  if (!o || o.v !== 2) return false;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','mk','seenG','seenC','cz','userCz','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  if (o.seenC === undefined) G.seenC = { ...G.carts };
  G.armory = Object.fromEntries(Object.entries(o.armory || {}).filter(([id,it]) => coreSlot(id) && it && it.lg === id && it.slot === coreSlot(id) && Array.isArray(it.aff) && it.imp));
  G.equipBackup = Object.fromEntries(Object.entries(o.equipBackup || {}).filter(([slot,it]) => SLOTN[slot] && it?.slot === slot && Array.isArray(it.aff) && it.imp));
  G.deferChoices = o.deferChoices === true;
  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!CHARS[G.char]) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = []; G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces){ if (o.board.v === 3) G.board = o.board; else sanitizeBoard(o.board); } else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
}
function saveGame(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); return true; } catch (e) { return false; } }
function loadGame(){ try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
const encodeSave = () => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); } catch (e) { return ''; } };
const decodeSave = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); } catch (e) { return null; } };


;
/* ---------- 音樂與音效：全部用 WebAudio 即時合成，沒有外部素材 ---------- */
const AUD = { ctx:null, master:null, mus:null, sfx:null, mode:'all', last:{}, step:0, next:0 };
try { const m = localStorage.getItem('idle-hero-audio'); if (m) AUD.mode = m; } catch (e) {}
function audInit(){
  if (AUD.ctx) return AUD.ctx.state === 'suspended' && AUD.ctx.resume();
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const c = AUD.ctx = new C(); AUD.master = c.createGain(); AUD.master.gain.value = .6; AUD.master.connect(c.destination);
  AUD.mus = c.createGain(); AUD.sfx = c.createGain(); AUD.mus.connect(AUD.master); AUD.sfx.connect(AUD.master); audMode(AUD.mode);
  const len = c.sampleRate*.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random()*2 - 1; AUD.noise = buf;
  AUD.next = c.currentTime + .1; setInterval(audMusic, 90);
}
function audMode(m){ AUD.mode = m; try { localStorage.setItem('idle-hero-audio', m); } catch (e) {} if (AUD.ctx){ AUD.mus.gain.value = m === 'all' ? .5 : 0; AUD.sfx.gain.value = m === 'off' ? 0 : 1; } }
function aTone(f, dur, type = 'square', vol = .15, slide = 0, when = 0, bus){
  const c = AUD.ctx; if (!c) return; const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f*slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(bus || AUD.sfx); o.start(t); o.stop(t + dur + .02);
}
function aNz(dur, vol = .2, freq = 2000, q = 1, when = 0, bus){
  const c = AUD.ctx; if (!c) return; const t = c.currentTime + when, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AUD.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || AUD.sfx); s.start(t); s.stop(t + dur);
}
const SFXS = {
  hit:()=>{ aNz(.07, .12, 1800, 2); aTone(220, .06, 'triangle', .08, .6); }, crit:()=>{ aNz(.1, .2, 2600, 2); aTone(660, .12, 'square', .1, 1.8); aTone(990, .1, 'square', .07, 1.5, .04); },
  kill:()=>{ aTone(440, .12, 'square', .07, .5); aNz(.08, .1, 900, 1); }, hurt:()=>{ aTone(140, .18, 'sawtooth', .12, .5); aNz(.12, .1, 500, 1); }, die:()=>{ aTone(300, .7, 'sawtooth', .15, .25); },
  fire:()=>{ aNz(.25, .18, 700, .8); aTone(180, .3, 'sawtooth', .08, 2.2); }, boom:()=>{ aNz(.35, .3, 300, .6); aTone(90, .3, 'sine', .25, .4); },
  frost:()=>{ [1568, 1319, 1047].forEach((f, i) => aTone(f, .35, 'sine', .08, 1, i*.05)); aNz(.4, .08, 6000, 1); },
  chain:()=>{ for (let i = 0; i < 4; i++){ aTone(900 + i*180, .07, 'square', .07, .5, i*.05); aNz(.04, .08, 4000, 2, i*.05); } },
  meteor:()=>{ aTone(900, .8, 'sawtooth', .1, .1); }, lvl:()=>{ [523, 659, 784, 1047].forEach((f, i) => aTone(f, .2, 'square', .1, 1, i*.09)); },
  pick:()=>{ aTone(880, .08, 'triangle', .1); aTone(1320, .12, 'triangle', .1, 1, .07); }, rare:()=>{ [784, 988, 1175, 1568].forEach((f, i) => aTone(f, .25, 'triangle', .13, 1, i*.07)); },
  card:()=>{ aTone(660, .1, 'square', .1); aTone(990, .16, 'square', .1, 1, .08); },
};
const SFXGAP = { hit:.07, crit:.1, kill:.05, fire:.1, boom:.08, chain:.1, hurt:.15 };
function SFX(n){
  if (!AUD.ctx || AUD.mode === 'off' || G.offline || G.paused) return;
  const now = AUD.ctx.currentTime; if (SFXGAP[n] && now - (AUD.last[n] || 0) < SFXGAP[n]) return; AUD.last[n] = now; if (SFXS[n]) SFXS[n]();
}
/* 音樂：Am 五聲音階的 8 小節循環，bass + 琶音 + 輕鼓點，約 104 BPM */
const MUS_ROOT = [57, 53, 48, 55, 57, 53, 55, 52], MUS_ARP = [0, 3, 7, 12, 7, 3, 10, 7], mf = n => 440*Math.pow(2, (n - 69)/12);
function audMusic(){
  const c = AUD.ctx; if (!c || AUD.mode !== 'all' || G.paused || G.offline){ if (c) AUD.next = Math.max(AUD.next, c.currentTime); return; }
  const sp = 60/104/2;
  while (AUD.next < c.currentTime + .25){
    const s = AUD.step, bar = Math.floor(s/8)%8, k = s%8, root = MUS_ROOT[bar], t = Math.max(0, AUD.next - c.currentTime);
    if (k === 0 || k === 4) aTone(mf(root - 12), sp*1.8, 'triangle', .22, 1, t, AUD.mus);
    aTone(mf(root + MUS_ARP[k]), sp*.9, 'square', .05, 1, t, AUD.mus);
    if (k%2 === 0) aNz(.04, .05, 7000, 1, t, AUD.mus); if (k === 2 || k === 6) aNz(.09, .09, 1800, 1, t, AUD.mus);
    AUD.step++; AUD.next += sp;
  }
}
['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, audInit, { passive:true }));

;
/* ---------- monsters ---------- */
// 刷怪模式：小怪又多又脆（血量、傷害、經驗、金幣都打折），一次湧出一群，持續補充到上限
const HORDE = { hp:.4, dmg:.2, xp:.3, gold:.3, drop:.1 };
const hordeCap = () => Math.min(SLOTS.length, 12 + Math.floor(lvlNow()*1.2), 2 + Math.floor(G.lvl*1.6));   // 新手一次只來幾隻，隨等級慢慢增加
const earlyK = () => Math.max(0, 8 - G.lvl);
const MTYPES = { slime:{ hp:1, dmg:.8, xp:1, g:1, spd:15, atk:1.5 }, skel:{ hp:1.25, dmg:1.1, xp:1.3, g:1.2, spd:17, atk:1.35 }, brute:{ hp:2.7, dmg:1.7, xp:2.4, g:2.2, spd:11, atk:1.8 }, boss:{ hp:15, dmg:2.3, xp:14, g:12, spd:9, atk:1.9 }, drone:{ hp:.6, dmg:.7, xp:1.2, g:1.1, spd:24, atk:1.3 }, bomb:{ hp:1.4, dmg:1.2, xp:1.8, g:1.6, spd:12, atk:2.2 } };
function spawnPack(){
  const R = G.run, d = lvlNow(), mods = R ? R.map.mods : [], kills = R ? R.kills : G.kills, need = R ? R.need : G.need, bossOut = R ? R.bossOut : G.bossOut;
  if (!R && G.need < 60) G.need = 60;   /* 舊存檔的門檻較低，大群怪的玩法改成 60 */
  const bossNow = (R || G.push) && kills >= need && !bossOut && !(R && R.tower && R.floor % 10 !== 0) && (G.h.hp >= G.st.life*(G.bossHp || 0)/100 || R);   // 推進模式：生命低於設定值就先不開打
  let types;
  if (bossNow){ types = ['boss']; if (R) R.bossOut = true; else G.bossOut = true; logLine(`${R ? '地圖' : `深度 ${d} `}的守關者出現了！`, '#8e3fd1'); }
  else { const n = Math.min(4 + Math.floor(Math.random()*4), 1 + Math.floor(G.lvl/2) + Math.floor(Math.random()*2)) + (mods.includes('more') ? 2 : 0) + (mods.includes('swarm') ? 3 : 0); types = Array.from({ length:n }, () => { const r = Math.random(); return d >= 2 && r < .07 ? 'drone' : d >= 4 && r < .13 ? 'bomb' : d >= 3 && r < .24 ? 'brute' : r < .6 ? 'slime' : 'skel'; }); }
  const hpK = (mods.includes('tough') ? 1.4 : 1)*(mods.includes('swarm') ? .75 : 1), dmgK = mods.includes('deadly') ? 1.35 : 1, fastK = mods.includes('fast') ? 1.25 : 1;
  const packRift = Math.floor(Math.random()*RIFTS.length), used = new Set(G.mons.filter(m => !m.dead).map(m => m.slot));
  types.forEach((t, i) => {
    const T = MTYPES[t], trash = t !== 'boss' ? HORDE.hp : 1, hp = 24 * Math.pow(1.32, d-1) * T.hp * hpK * trash * (1 + earlyK()*.45);
    let slot = 0; while (used.has(slot) && slot < SLOTS.length - 1) slot++; used.add(slot);   // 找一個沒人站的圍攻位置
    const rf = RIFTS[packRift], sx = t === 'boss' ? tClamp(G.h.x + tRand(-14, 14), -40, 70) : tClamp(rf[0] + tRand(-4, 4), -48, 78), sy = t === 'boss' ? tClamp(G.h.y - 18 + tRand(-6, 6), -26, 98) : tClamp(rf[1] + tRand(-4, 4), -26, 98);   /* 守關者從天上掉下來，小怪從裂縫鑽出 */
    const el = t !== 'boss' && (d >= 6 || mods.includes('elite')) && Math.random() < (mods.includes('elite') ? .3 : .06);   // 菁英：體型大、金環、血厚、賞金多
    G.mons.push({ type:t, boss:t === 'boss', elite:el, x:sx, y:sy, hp:hp*(el ? 3.2 : 1), hpMax:hp*(el ? 3.2 : 1), dmg:(el ? 1.3 : 1) * 4.5 * Math.pow(1.22, d-1) * T.dmg * dmgK * (t !== 'boss' ? HORDE.dmg : 1) * (1 + earlyK()*1.3), atkInt:T.atk/fastK, spdK:fastK, atkCd:tRand(.3, T.atk),
      slot, fall:t === 'boss' ? .9 : 0, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  });
  addFx({ k:'portal', t:0, dur:.5, x:RIFTS[packRift][0], y:RIFTS[packRift][1] });
}
function dropItem(m, it){ G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'item', it, t:0 }); if (it.r >= 2 && !G.offline){ lootToast(it); bossLoot(it); SFX('rare'); if (it.r >= 3) kick(.6, .3, '#ffb27a', .5); } }
function killMon(m){
  m.dead = true; m.deadT = 0; SFX('kill'); if (!G.train && G.mk) G.mk[m.type] = (G.mk[m.type] || 0) + 1; const T = MTYPES[m.type], d = lvlNow(), R = G.run, q = runQ(), mods = R ? R.map.mods : [];
  let hk = m.boss ? 1 : HORDE.xp, xp = Math.max(1, Math.round(5 * Math.pow(1.2, d-1) * T.xp * hk * (G.relics.CALC ? 1.2 : 1) * (offPen() ? .75 : 1))), gold = Math.max(1, Math.round(3 * Math.pow(1.2, d-1) * T.g * tRand(.8, 1.2) * (mods.includes('rich') ? 1.6 : 1) * (m.boss ? 1 : HORDE.gold)));
  if (m.elite){ gold *= 4; xp *= 4; } if (mods.includes('wise')) xp = Math.round(xp*1.5);
  if (G.relics.PIG) gold = Math.round(gold*1.3);
  G.gold += gold; G.totalKills++; if (m.boss){ G.bossKills = (G.bossKills || 0) + 1; if (Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++; kick(2.4, .5, '#fff6c0', 1); hitStop(.14); if (G.fx.length < 40) addFx({ k:'ring', x:m.x, y:m.y, col:'#fff6c0', t:0, dur:.7 }); if (Math.random() < .25 && typeof COS !== 'undefined'){ const pool = []; for (const c of Object.keys(COS)) for (const e of COS[c]) if (e[3] > 0 && !G.own[c + ':' + e[0]]) pool.push([c, e]); if (pool.length){ const [c, e] = tPick(pool); G.own[c + ':' + e[0]] = 1; logLine(`守關者掉落裝扮：${e[1]}`, '#c28a00'); } } } addFloat(m.x - 2, m.y, BZ + 20, `+${gold}g`, '#a9780a', 3);
  gainXp(xp); if (R) R.kills++; else G.kills++; checkGoals();
  if (R && R.tower && R.floor % 10 !== 0 && R.kills >= R.need) towerNext();
  if (G.relics.FOOD) G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*.01);
  if (G.relics.BOMB && Math.random() < .1 && G.slots[0]){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 9) applySkillHit(G.slots[0], o, 1.5); }
  if (lgOn('A_RESET') && ++G.lgK % 25 === 0){ for (const id of G.slots) G.cds[id] = 0; addFloat(G.h.x, G.h.y, BZ + 24, '冷卻完畢', '#4a8fe0', 3.6); }
  if (lgOn('R_LINK')){ const o = G.mons.filter(x => !x.dead && x !== m && !(x.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; if (o){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 8], [o.x, o.y, BZ + 8]], t:0, dur:.2 }); hitMon(o, m.hpMax*.5, false); } }
  if (m.type === 'bomb' && !G.offline){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.4, big:true, col:'#ff5a3a' }); kick(1.1, .3, '#ff9a3c', .6); if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 12 && G.h.dead <= 0){ const bd = Math.max(1, m.dmg*1.6*(1 - G.st.red)); G.h.hp -= bd; G.h.hurtT = .15; addFloat(G.h.x + 3, G.h.y, BZ + 16, tFmt(bd), '#e2483d', 3.6); } for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 10) hitMon(o, m.hpMax*.6, false); }
  const nItems = m.boss ? 2 + (Math.random() < .5 ? 1 : 0) : m.elite ? 1 + (Math.random() < .5 ? 1 : 0) : Math.random() < HORDE.drop*(1 + q)*(offPen() ? .25 : 1) ? 1 : 0;   // 離線：掉落 25%
  for (let i = 0; i < nItems; i++) dropItem(m, makeItem(tPick(['weapon','armor','ring']), rarityRoll(m.boss), d));
  if (Math.random() < (m.boss ? .3 : .012)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'cart', id:tPick(Object.keys(MODES)), t:0 });
  if (Math.random() < (m.boss ? .35 : .025)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'gem', id:tPick(Object.keys(SUPPS)), t:0 });
  if (Math.random() < (m.boss && !R ? 1 : .03)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'map', map:makeMap(d + (Math.random() < .3 ? 1 : 0)), t:0 });
  if (m.boss){
    if (R){ completeRun(); }
    else { G.bossOut = false; G.kills = 0; if (G.push){ G.depth++; G.maxDepth = Math.max(G.maxDepth, G.depth); logLine(`擊敗守關者！進入深度 ${G.depth}`, '#2f9e4f'); } }
  }
}
/* 無限之塔：每層殺滿一定數量進下一層，每 10 層是守關者層，打贏加一條規則並給遺物 */
const towerLvl = f => Math.max(3, G.maxDepth-6) + Math.floor(f*0.8);
function towerStart(){
  if (G.run || G.maxDepth < 8) return; const f = 1;
  G.run = { tower:true, floor:f, map:{ id:'tower', lvl:towerLvl(f), biome:0, mods:[] }, kills:0, need:24 + 2*f, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine('進入無限之塔', '#8e3fd1'); closeModal();
}
function towerNext(){
  const R = G.run, f = R.floor; if (!R || !R.tower) return;
  const bossFloor = f % 10 === 0; R.floor++; G.towerBest = Math.max(G.towerBest || 0, f); G.parts = (G.parts || 0) + 3 + Math.floor(f/5); G.gold += Math.round(30*Math.pow(1.12, f));
  R.kills = 0; R.bossOut = false; R.need = Math.min(80, 24 + 2*R.floor); R.map.lvl = towerLvl(R.floor); R.map.biome = Math.floor(R.floor/10) % BIOMES.length;
  G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*.3);
  if (bossFloor){
    const left = Object.keys(MODS).filter(k => !R.map.mods.includes(k)); if (left.length){ const k = tPick(left); R.map.mods.push(k); logLine(`無限之塔新規則：${MODS[k].n}`, '#c28a00'); }
    if (Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++;
    G.drops.push({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), R.map.lvl), t:0 });
  }
  addFloat(G.h.x, G.h.y, BZ + 26, `第 ${R.floor} 層`, '#8e3fd1', 4.6); logLine(`無限之塔：第 ${R.floor} 層${R.floor % 10 === 0 ? '（守關者層）' : ''}`, '#8e3fd1'); kick(.5, .25, '#d8c0ff'); G.dirty = true;
}
function completeRun(){
  if (!G.run) return;
  if (G.run && G.run.tower){ G.mapsDone++; towerNext(); return; }
  G.mapsDone++; checkGoals();
  const R = G.run, q = runQ(), lvl = R.map.lvl, extra = 2 + Math.ceil(q*4);
  for (let i = 0; i < extra; i++) G.drops.push({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), lvl), t:-i*.15 });
  const bonus = Math.round(40 * Math.pow(1.2, lvl-1) * (1 + q)); G.gold += bonus;
  for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) G.drops.push({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'map', map:makeMap(lvl + Math.floor(Math.random()*3)), t:-.5 - i*.2 });
  logLine(`地圖完成！獎勵 +${bonus}g 與 ${extra} 件戰利品`, '#2f9e4f'); G.run = null; G.dirty = true;
}
function gainXp(xp){
  G.xp += xp;
  while (G.xp >= xpNeed(G.lvl)){ G.xp -= xpNeed(G.lvl); G.lvl++; G.picks++; SFX('lvl'); recalc(); G.h.hp = G.st.life; kick(.7, .45, '#fff3a0', .5); addFloat(G.h.x + 3, G.h.y, BZ + 24, 'LEVEL UP', '#2f9e4f', 4.6); logLine(`升級了！等級 ${G.lvl}（+1 天賦點）`, '#2f9e4f');
    if (G.off) G.off.lvls++; }
}

/* ---------- loot handling ---------- */
function pickup(d){
  if (d.kind === 'gem'){ G.gems[d.id] = (G.gems[d.id] || 0) + 1; logLine(`獲得輔助寶石：${SUPPS[d.id].n}`, '#8e3fd1'); if (G.off) G.off.gems++; G.dirty = true; return; }
  if (d.kind === 'cart'){ if (G.off) G.off.carts = (G.off.carts || 0) + 1; G.carts[d.id] = (G.carts[d.id] || 0) + 1; logLine(`獲得卡匣：${G.seen[d.id] ? MODES[d.id].n : '未鑑定的' + SKILLS[MODES[d.id].sk].n + '卡匣'}`, '#1f9bbf'); G.dirty = true; return; }
  if (d.kind === 'map'){ if (G.maps.length < 15) { G.maps.push(d.map); logLine(`獲得地圖：${BIOMES[d.map.biome].n} Lv. ${d.map.lvl}`, '#2f7fc4'); if (G.off) G.off.maps++; } else G.gold += 30*d.map.lvl; G.dirty = true; return; }
  const it = d.it, rc = RAR[it.r].c;
  if (it.r < G.filter){ G.gold += itemValue(it); salvage(it); return; }
  const cur = G.equip[it.slot], cand = calc({ ...G.equip, [it.slot]:it });
  if (it.lg && LEGEND_BY[it.lg]){
    const old = G.armory[it.lg], active = cur?.lg === it.lg;
    if (old && (active || old.cr || old.lk != null || cand.power <= calc({...G.equip,[it.slot]:old}).power*1.02)){
      G.gold += itemValue(it); salvage(it); G.dirty = true; return;
    }
    if (old){ G.gold += itemValue(old); salvage(old); }
    G.armory[it.lg] = it;
    if (!old && G.off) G.off.cores = (G.off.cores || 0) + 1;
    logLine(`${old?'更新':'收藏'}傳奇核心：${it.name}`, rc);
    if (!cur?.lg && (!cur || cand.power > G.st.power*1.02)){
      // 收藏裝備永不作自動拆解來源；一般裝備仍使用原本的自動比較。
      if (cur){ G.equipBackup[it.slot] = cur; }
      G.equip[it.slot] = it; recalc(); if (G.off) G.off.eq++;
    }
    G.dirty = true; return;
  }
  if (cur?.lg){ G.gold += itemValue(it); salvage(it); G.dirty = true; return; }
  if (!cur || cand.power > G.st.power * 1.02){
    if (cur){ G.gold += itemValue(cur); salvage(cur); }
    const d0 = G.st.dps; G.equip[it.slot] = it; recalc(); const dd = d0 > 0 ? Math.round((G.st.dps/d0 - 1)*100) : 0; logLine(`裝備 ${it.name}（傷害 ${dd >= 0 ? '+' : ''}${dd}%）`, rc); addFloat(G.h.x + 3, G.h.y, BZ + 22, '升級！', rc, 3.8); SFX(it.r >= 2 ? 'rare' : 'pick'); if (G.off) G.off.eq++;
  } else { G.gold += itemValue(it); salvage(it); if (it.r >= 2) logLine(`賣掉 ${it.name}（沒有更強）`, '#9a93a6'); }
}
function reroll(slot){
  const it = G.equip[slot]; if (!it) return; const cost = 30 * it.il + 20;
  if (G.gold < cost || it.r === 3) return; G.gold -= cost;
  const n = makeItem(slot, it.r, it.il); G.equip[slot] = n; recalc(); logLine(`混沌重鑄：${n.name}`, RAR[n.r].c);
}

/* ---------- combat ---------- */
function hitMon(m, dmg, crit){
  if (m.dead || m.fall > 0) return;
  if (G.train) trainAdd(G.src || '其他', dmg);
  m.hp -= dmg; m.hurtT = .12; SFX(crit ? 'crit' : 'hit');
  if (!m.boss && !m.dv && !G.offline && Math.random() < .14){ const a = Math.random()*6.28; m.dv = { x:Math.cos(a)*42, y:Math.sin(a)*42, t:.22 }; }   // 挨打後側閃
  if (!G.offline){ const dx = m.x - G.h.x, dy = m.y - G.h.y, dd = Math.hypot(dx, dy) || 1, kb = m.boss ? .2 : crit ? 1.6 : .6; m.x += dx/dd*kb; m.y += dy/dd*kb;   // 被打時往外退一點
    if (crit){ kick(.6, 0, 0, .35); if (dmg >= (G.maxHit || 0)*.8) hitStop(.05); if (G.fx.length < 40){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 9, t:0, dur:.18 }); addFx({ k:'ring', x:m.x, y:m.y, col:'#ffffff', t:0, dur:.3 }); } } else if (m.boss) kick(.2); }
  { const big = dmg >= (G.maxHit || 0)*.2, mode = G.dmgNum == null ? 1 : G.dmgNum;
    G.maxHit = Math.max(G.maxHit || 0, dmg*.98); m.fAcc = (m.fAcc || 0) + dmg;
    const tOk = !m.fT || G.time - m.fT >= .3;
    if (mode && (crit || big || tOk) && (mode === 2 || crit || big || G.floats.length < 8)){
      if (G.floats.length >= 12){ const i = G.floats.findIndex(f => f.size < 5); G.floats.splice(i < 0 ? 0 : i, 1); }
      m.fT = G.time; addFloat(m.x + 2 + tRand(-1,1), m.y + tRand(-2,2), BZ + 17 + tRand(0,3), tFmt(m.fAcc), crit ? '#e2831b' : '#2b2552', crit ? 5.4 : 3.6); m.fAcc = 0; } }
  if (m.hp <= 0) killMon(m);
}
function rollDmg(base, critPct){ const s = G.st, crit = Math.random()*100 < (critPct == null ? s.crit : critPct); return { dmg:base * (crit ? s.cm/100 : 1) * tRand(.9, 1.1), crit }; }
const aliveMons = () => G.mons.filter(m => !m.dead && !(m.fall > 0));
function nearestMon(fightOnly, from){ let best = null, bd = 1e9; const [fx, fy] = from || [G.h.x, G.h.y]; for (const m of G.mons){ if (m.dead || m.fall > 0 || (fightOnly && !m.fight)) continue; const d = Math.hypot(m.x - fx, m.y - fy); if (d < bd && d < 60){ bd = d; best = m; } } return best; }

function revive(){ const h = G.h; h.dead = 0; h.x = HX; h.y = HY; h.vx = h.vy = 0; h.hp = G.st.life; G.spawnCd = 1; }
function heroDie(){
  const h = G.h;
  if (lgOn('A_PHOENIX') && !(h.phx > 0)){ h.phx = 90; h.hp = G.st.life*.5; for (const id of G.slots) G.cds[id] = 0; addFx({ k:'nova', t:0, dur:.55 }); addFloat(h.x, h.y, BZ + 24, '不滅', '#ff7a3d', 5); kick(2, .6, '#ffa040', .8); SFX('boom'); return; } h.dead = 3; G.deaths++; SFX('die'); G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.timers.length = 0;
  if (G.run && G.run.tower){ G.towerBest = Math.max(G.towerBest || 0, G.run.floor - 1); logLine(`你倒下了……無限之塔結束，最高第 ${G.towerBest} 層`, '#e2483d'); G.run = null; }
  else if (G.run){ logLine('你倒下了……地圖失敗', '#e2483d'); G.run = null; }
  else { if (G.push && G.depth > 1) G.depth--; G.kills = 0; G.bossOut = false; logLine('你倒下了……退回較淺的深度', '#e2483d'); }
  G.dirty = true;
}
function skillDmg(id){ const k = G.st.sk[id]; return k; }
function applySkillHit(id, m, mult=1, chainIdx=0){
  const k = G.st.sk[id]; if (!m || m.dead) return 0;
  G.src = SKILLS[id].n;
  if (G.fx.length < 36) addFx({ k:'shard', x:m.x, y:m.y, z:BZ + 6, col:SKILLS[id].col, t:0, dur:.4 });
  if (m.frozen > 0 && cardN('V_SHATTER')) mult *= 1 + .4*cardN('V_SHATTER');
  const el = SKILLS[id].el; let rx = null;   /* 元素反應：火燒、閃電標記，加上冰凍，三者互相放大 */
  if (m.frozen > 0 && el === 'fire'){ mult *= 1.4; m.frozen = 0; rx = '融化'; } else if (m.frozen > 0 && el === 'light'){ mult *= 1.3; rx = '超導'; } else if (m.burn > 0 && el === 'cold') rx = '蒸氣';
  if (m.shock > 0 && (el === 'fire' || el === 'cold')){ mult *= 1.25; m.shock = 0; rx = rx || '過載'; }
  if (lgOn('R_LAST') && G.h.hp < G.st.life*.35) mult *= 1.4;
  const r = rollDmg(k.hit * mult, k.crit); hitMon(m, r.dmg, r.crit);
  if (el === 'fire'){ m.burn = 3; m.burnD = Math.max(m.burnD || 0, r.dmg*.2); } else if (el === 'light') m.shock = 4;
  if (rx){ if (G.floats.length < 30) addFloat(m.x + 2, m.y, BZ + 22, rx, rx === '融化' ? '#ff7a3d' : rx === '超導' ? '#e0c020' : rx === '蒸氣' ? '#7fb6ff' : '#c28aff', 4.4);
    if (rx === '蒸氣' && m.burn > 0){ m.burn = 0; for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 8) hitMon(o, r.dmg*.4, false); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.3 }); } }
  if (r.crit && !G.inFork && lgOn('W_FORK')){ G.inFork = true; const near = G.mons.filter(o => !o.dead && o !== m && !(o.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
    for (const o of near){ addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.3 }); applySkillHit(id, o, mult*.5); } G.inFork = false; }
  return r.dmg;
}
function castSkill(id, repeat=1){
  const k = G.st.sk[id], s = G.st, h = G.h; let total = 0; if (!k) return;
  const al = aliveMons(); if (!al.length) return;
  const prim = nearestMon(false) || al[0], mode = k.mode; SFX(id.toLowerCase());
  if (repeat === 1 && !G.offline){ const K0 = SKILLS[id]; addFx({ k:'ring', x:h.x, y:h.y, col:K0.col, t:0, dur:.45 }); addFx({ k:'pillar', x:h.x, y:h.y, col:K0.col, t:0, dur:.3 });
    if (K0.cd >= 2 && (G.fx.length < 30)) addFloat(h.x - 2, h.y, BZ + 40, K0.n, K0.col, 4.4);
    kick(K0.cd >= 4 ? .55 : .22, K0.cd >= 4 ? .18 : 0, K0.col, 0); }
  const near = (m0, n, ex) => G.mons.filter(m => !m.dead && m !== m0 && !(ex && ex.has(m))).sort((a, b) => Math.hypot(a.x - m0.x, a.y - m0.y) - Math.hypot(b.x - m0.x, b.y - m0.y)).slice(0, n);
  if (id === 'FIRE'){ const tg = prim; G.proj.push({ k:'fire', tg, t:0, dur:.4, mul:repeat }); return; }
  if (id === 'FROST'){
    addFx({ k:'nova', t:0, dur:.55 });
    if (mode === 'FROST_STORM' && repeat === 1) G.timers.push({ t:.6, id });
    for (const m of al){ total += applySkillHit(id, m, repeat); if (!m.dead) m.frozen = 1.4;
      else if (mode === 'FROST_SHATTER') for (const o of G.mons) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 14){ total += applySkillHit(id, o, repeat*.5); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); } }
  }
  if (id === 'CHAIN'){
    const hops = (mode === 'CHAIN_OVERLOAD' ? 5 : 3) + (k.area ? 2 : 0) + 2*cardN('V_FORK'), pts = [[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2]], hit = new Set(); let cur = prim, mul = 1;
    for (let i = 0; i < hops && cur; i++){ hit.add(cur); pts.push([cur.x, cur.y, BZ + 8]); total += applySkillHit(id, cur, repeat*mul); if (mode !== 'CHAIN_OVERLOAD') mul *= .7;
      if (mode === 'CHAIN_FORK'){ const f = near(cur, 1, hit)[0]; if (f){ total += applySkillHit(id, f, repeat*.5); pts.push([f.x, f.y, BZ + 8], [cur.x, cur.y, BZ + 8]); } }
      let nx = null, bd = 1e9; for (const m of G.mons){ if (m.dead || hit.has(m)) continue; const dd = Math.hypot(m.x - cur.x, m.y - cur.y); if (dd < bd && dd < 28){ bd = dd; nx = m; } } cur = nx; }
    addFx({ k:'bolt', pts, t:0, dur:.3 });
  }
  if (id === 'METEOR'){
    if (mode === 'METEOR_TWIN'){ const o = near(prim, 1)[0] || prim; G.proj.push({ k:'meteor', x:prim.x, y:prim.y, t:0, dur:.9, mul:repeat*.6 }, { k:'meteor', x:o.x, y:o.y, t:-.15, dur:.9, mul:repeat*.6 }); if (cardN('V_ECHO')) G.timers.push({ t:.6, echo:'METEOR', mul:repeat*.5 }); return; }
    G.proj.push({ k:'meteor', x:prim.x, y:prim.y, t:0, dur:.9, mul:repeat }); if (cardN('V_ECHO')) G.timers.push({ t:.6, echo:'METEOR', mul:repeat*.5 }); return; }
  if (id === 'PULSE'){
    const R = mode === 'PULSE_SONIC' ? 38 : 24, sm = mode === 'PULSE_SONIC' ? .75 : 1, wave = (r, mu) => { addFx({ k:'nova', t:0, dur:.45 });
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, d = Math.hypot(dx, dy) || 1; if (d > r) continue; total += applySkillHit(id, m, repeat*mu); if (!m.dead){ m.x += dx/d*7; m.y += dy/d*7; } } };
    wave(R, sm); if (mode === 'PULSE_ECHO' && repeat === 1) G.timers.push({ t:.5, id, echoMul:.6 }); SFX('boom');
  }
  if (id === 'MAGNET'){
    const caught = al.filter(m => Math.hypot(m.x - h.x, m.y - h.y) < 40); SFX('boom');
    for (const m of caught){ const a = Math.random()*6.283, d = 6 + Math.random()*4; m.x = h.x + Math.cos(a)*d; m.y = h.y + Math.sin(a)*d; total += applySkillHit(id, m, repeat); if (!m.dead && mode === 'MAGNET_STICKY') m.frozen = 2; addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.3 }); }
    if (mode === 'MAGNET_CRUSH' && repeat === 1) G.timers.push({ t:.5, id, crush:true });
  }
  if (id === 'FLICKER'){
    const storm = mode === 'FLICKER_STORM', n = storm ? 8 : 4;
    for (let i = 0; i < n; i++) G.timers.push({ t:.02 + .07*i, id, mul:repeat*(storm ? .5 : 1), flick:{ i, last:!storm && i === n - 1 } });
    return;
  }
  if (id === 'SPAM'){
    const n = mode === 'SPAM_FLOOD' ? 14 : mode === 'SPAM_PHISH' ? 3 : 6, pool = mode === 'SPAM_PHISH' ? al.slice().sort((a, b) => b.hp - a.hp) : al; SFX('chain');
    for (let i = 0; i < n; i++){ const m = mode === 'SPAM_PHISH' ? pool[i % pool.length] : tPick(pool); if (!m || m.dead) continue;
      total += applySkillHit(id, m, repeat*(mode === 'SPAM_FLOOD' ? .45 : mode === 'SPAM_PHISH' ? 3 : 1)); addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:-i*.02, dur:.2 }); }
  }
  if (id === 'BEAM'){
    SFX('fire'); const base = Math.atan2(prim.y - h.y, prim.x - h.x), w = mode === 'BEAM_FOCUS' ? 2.2 : 4.5, mu = repeat*(mode === 'BEAM_FOCUS' ? 2.5 : 1);
    const shoot = (ang, m2) => { const ux = Math.cos(ang), uy = Math.sin(ang);
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, al2 = dx*ux + dy*uy; if (al2 > 0 && al2 < 90 && Math.abs(dx*uy - dy*ux) < w) total += applySkillHit(id, m, mu*m2); }
      addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [h.x + ux*90, h.y + uy*90, BZ + 8]], t:0, dur:.35 }); };
    if (mode === 'BEAM_SWEEP'){ for (const d of [-.61, 0, .61]) shoot(base + d, .65); } else shoot(base, 1);
  }
  if (k.leech && total) h.hp = Math.min(s.life, h.hp + total*.12);
  h.hp = Math.min(s.life, h.hp + total*s.leech/100);
}
function resolveProj(p){
  const s = G.st, h = G.h;
  if (p.k === 'fire'){
    SFX('boom'); const k = s.sk.FIRE, m = p.tg; if (!k) return; if (m.dead && !G.mons.includes(m)) return;
    const targets = k.area ? aliveMons() : (m.dead ? [] : [m]); let total = 0;
    for (const q of targets){ total += applySkillHit('FIRE', q, p.mul); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 });
      if (k.mode === 'FIRE_BLAST'){ for (const o of G.mons) if (!o.dead && o !== q && Math.hypot(o.x - q.x, o.y - q.y) < 14) total += applySkillHit('FIRE', o, p.mul*.6); }
      if (k.mode === 'FIRE_SPLIT'){ const t2 = G.mons.filter(o => !o.dead && o !== q).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, 2);
        for (const o of t2){ total += applySkillHit('FIRE', o, p.mul*.5); addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.4 }); } } }
    if (cardN('V_SPLIT') && !k.area) for (const q of aliveMons().filter(x => x !== m).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2*cardN('V_SPLIT'))){ total += applySkillHit('FIRE', q, p.mul*.6); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 }); }
    if (k.leech) h.hp = Math.min(s.life, h.hp + total*.12); h.hp = Math.min(s.life, h.hp + total*s.leech/100);
  } else if (p.k === 'meteor'){ kick(1.5, .15, '#ffb070', .6);
    SFX('boom'); const k = s.sk.METEOR; if (!k) return; let total = 0;
    addFx({ k:'boom', x:p.x, y:p.y, z:BZ + 4, t:0, dur:.6, big:true });
    const al = aliveMons(), top = k.mode === 'METEOR_COMET' ? al.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : null;
    for (const q of al) total += applySkillHit('METEOR', q, p.mul*(k.mode === 'METEOR_COMET' ? (q === top ? 2.2 : .5) : 1));
    if (k.leech) h.hp = Math.min(s.life, h.hp + total*.12); h.hp = Math.min(s.life, h.hp + total*s.leech/100);
  }
}

/* 主角自己走位：在怪少的地方繞圈，邊走邊打；招式前搖時有機率閃開（見 s.dodge） */
const ARENA_R = 40;
function moveHero(dt){
  const h = G.h; if (h.x === undefined){ h.x = HX; h.y = HY; h.vx = h.vy = 0; h.gx = HX; h.gy = HY; h.aiT = 0; h.mv = 0; }
  h.aiT -= dt;
  if (h.aiT <= 0){
    h.aiT = .4 + Math.random()*.4; const al = aliveMons(); let best = null, bs = -1e9;
    for (let k = 0; k < 10; k++){
      const a = Math.random()*6.283, r = 9 + Math.random()*20, cx = tClamp(h.x + Math.cos(a)*r, HX - ARENA_R, HX + ARENA_R), cy = tClamp(h.y + Math.sin(a)*r, HY - ARENA_R, HY + ARENA_R);
      let sc = Math.random()*.5 - Math.hypot(cx - HX, cy - HY)*.012 + Math.min(r, 24)*.012;   /* 滿島跑，不只待在中間 */
      for (const m of al){ const d = Math.hypot(m.x - cx, m.y - cy); if (d < 16) sc -= (16 - d)/16; if (d < 12 && d > 5) sc += .15; }   /* 怪少的地方、但別離怪太遠 */
      if (sc > bs){ bs = sc; best = [cx, cy]; }
    }
    if (best){ h.gx = best[0]; h.gy = best[1]; }
  }
  const dx = h.gx - h.x, dy = h.gy - h.y, d = Math.hypot(dx, dy), want = d > 1.2 ? 24 : 0;
  h.vx += ((d ? dx/d : 0)*want - h.vx)*Math.min(1, dt*6); h.vy += ((d ? dy/d : 0)*want - h.vy)*Math.min(1, dt*6);
  h.x += h.vx*dt; h.y += h.vy*dt; h.mv = Math.hypot(h.vx, h.vy);
  if (h.dash){ h.dash.t += dt; if (h.dash.t >= .3) h.dash = null; }
}
/* 訓練場：5 隻打不死也不還手的假人站在身邊，量 30 秒的傷害與各來源佔比 */
function trainAdd(k, d){ const T = G.train; T.dmg[k] = (T.dmg[k] || 0) + d; T.total += d; }
function trainStart(){
  if (G.run || G.train) return;
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.h.hp = G.st.life; G.spawnCd = 99;
  G.train = { t:30, dmg:{}, total:0 };
  for (let i = 0; i < 5; i++) G.mons.push({ type:'slime', boss:false, x:G.h.x + tRand(-10, 10), y:G.h.y + tRand(-10, 10), hp:1e15, hpMax:1e15, dmg:0, atkInt:1e9, spdK:1, atkCd:1e9, slot:i, fall:0, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  logLine('進入訓練場，測量 30 秒', '#1f9bbf'); closeModal();
}
function trainEnd(abort){
  const T = G.train; if (!T) return; G.train = null;
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8;
  if (!abort){ G.trainLast = { dps:T.total/30, rows:Object.entries(T.dmg).sort((a, b) => b[1] - a[1]), total:T.total, n:5 }; logLine(`訓練結果：每秒傷害約 ${tFmt(G.trainLast.dps)}`, '#1f9bbf'); }
  G.dirty = true;
}
function update(dt){
  G.src = '其他';
  if (G.train){ G.train.t -= dt; for (const m of G.mons) if (!m.dead){ m.hp = m.hpMax; } if (G.train.t <= 0) trainEnd(); }
  G.time += dt; if ((G.time*2 | 0) !== G._ac){ G._ac = G.time*2 | 0; checkAch(); } const h = G.h, s = G.st;
  for (const f of G.floats) f.t += dt/1.1; if (G.floats.length) G.floats = G.floats.filter(f => f.t < 1);
  for (const e of G.fx) e.t += dt/e.dur; if (G.fx.length) G.fx = G.fx.filter(e => e.t < 1);
  if (h.hurtT > 0) h.hurtT -= dt;
  for (const d of G.drops){ d.t += dt; if (d.t >= 1.7 && !d.done){ d.done = true; pickup(d); } } if (G.drops.length) G.drops = G.drops.filter(d => !d.done);
  if (h.dead > 0){ h.dead -= dt; G.mons = G.mons.filter(m => (m.deadT += dt) < .4); if (h.dead <= 0) revive(); return; }
  { const alive = G.mons.filter(m => !m.dead).length, bossUp = G.mons.some(m => m.boss && !m.dead); G.spawnCd -= dt; if (G.spawnCd <= 0 && alive < hordeCap() && !bossUp && !G.train){ spawnPack(); G.spawnCd = (alive < hordeCap()*.5 ? .35 : .8) * (1 + earlyK()*.18); } }
  moveHero(dt);
  for (const m of G.mons){
    if (m.dead){ m.deadT += dt; continue; }
    if (m.fall > 0){ m.fall -= dt; if (m.fall <= 0){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.6, big:true }); SFX('boom'); kick(2.4, .5, '#ffffff', 1); } continue; }
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.shock > 0) m.shock -= dt;
    if (m.burn > 0){ m.burn -= dt; m.bt = (m.bt || 0) + dt; if (m.bt >= .5){ m.bt = 0; m.hp -= m.burnD*.5; if (G.train) trainAdd('燃燒', m.burnD*.5); if (m.hp <= 0){ killMon(m); continue; } } }
    if (m.frozen > 0){ m.frozen -= dt; continue; }
    const so = SLOTS[m.slot % SLOTS.length], dx = h.x + so[0] - m.x, dy = h.y + so[1] - m.y, dist = Math.hypot(dx, dy), spd = MTYPES[m.type].spd * m.spdK;
    if (dist > .6){ const st = Math.min(dist, spd*dt); m.x += dx/dist*st; m.y += dy/dist*st; m.fight = false;
      if (!m.boss && dist > 3){ const sw = Math.sin(G.time*2.4 + m.ph*3)*spd*.7*dt*Math.min(1, dist/8); m.x += -dy/dist*sw; m.y += dx/dist*sw; }   /* 左右蛇行 */ } else m.fight = true;
    if (m.dv){ m.dv.t -= dt; m.x += m.dv.x*dt; m.y += m.dv.y*dt; if (m.dv.t <= 0) m.dv = null; }
    if (m.fight){ m.atkCd -= dt; if (m.atkCd <= 0 && m.lunge < 0){ m.lunge = 0; m.lungeHit = false; m.atkCd = m.atkInt; } }
    if (m.lunge >= 0){
      m.lunge += dt;
      if (!m.lungeHit && m.lunge >= .14){ m.lungeHit = true; if (Math.random()*100 < s.dodge){ { const a = Math.random()*6.28; h.dash = { a, t:0 }; h.vx += Math.cos(a)*70; h.vy += Math.sin(a)*70; } addFloat(G.h.x + 3, G.h.y, BZ + 18, '閃避', '#4a8fe0', 3.6); if (lgOn('A_RIPOSTE')){ const sid = tPick(G.slots.filter(Boolean)); if (sid) castSkill(sid, .8); } continue; } const dmg = Math.max(1, m.dmg * (1 - s.red) * tRand(.9, 1.1)); h.hp -= dmg; h.hurtT = .15; kick(Math.min(1.6, .6 + dmg/G.st.life*4), .35, '#ff3050'); if (dmg >= G.st.life*.08) hitStop(.07); addFloat(G.h.x + 3, G.h.y + tRand(-2,2), BZ + 16, tFmt(dmg), '#e2483d', 3.6); }
      if (m.lunge >= .3) m.lunge = -1;
    }
  }
  if (G.mons.length) G.mons = G.mons.filter(m => !(m.dead && m.deadT >= .4));
  h.hp = Math.min(s.life, h.hp + s.regen*dt);
  if (h.potCd > 0) h.potCd -= dt;
  if (h.hp < s.life*.35 && h.potCd <= 0){ h.potCd = 12; const v = s.life*.45; h.hp = Math.min(s.life, h.hp + v); addFloat(G.h.x - 2, G.h.y, BZ + 22, '+' + tFmt(v), '#2f9e4f', 4.2); }
  if (h.hp <= 0){ heroDie(); return; }
  h.atkCd -= dt;
  const tgt = nearestMon(true);
  if (h.atkCd <= 0 && tgt && h.swingT < 0){ h.swingT = 0; h.swingHit = false; h.atkCd = 1/s.aps; }
  if (h.swingT >= 0){
    h.swingT += dt;
    if (!h.swingHit && h.swingT >= .12){ h.swingHit = true; G.src = '普通攻擊'; const t2 = nearestMon(true); if (t2){ const r = rollDmg(s.hit); hitMon(t2, r.dmg, r.crit); h.hp = Math.min(s.life, h.hp + r.dmg*s.leech/100); addFx({ k:'slash', x:t2.x, y:t2.y, z:BZ + 7, t:0, dur:.22 });
      for (const o of G.mons) if (o !== t2 && !o.dead && o.fight && Math.hypot(o.x - t2.x, o.y - t2.y) < 9){ const r2 = rollDmg(s.hit*.5); hitMon(o, r2.dmg, r2.crit); } /* 橫掃：目標附近的怪也吃 50% */ } }
    if (h.swingT >= .3) h.swingT = -1;
  }
  // skills
  for (const id of G.slots){ if (id && G.cds[id] > 0) G.cds[id] -= dt*(lgOn('R_LAST') && h.hp < s.life*.35 ? 2.5 : 1); }
  if (h.phx > 0) h.phx -= dt;
  { const sg = CHARS[G.char] && CHARS[G.char].sig, al = aliveMons().filter(m => !(m.fall > 0));
    if (sg && al.length && !G.train){ G.sigT = (G.sigT || 0) + dt; if (G.sigT >= sg.cd){ G.sigT = 0; G.src = '專屬：' + sg.n; const hit = s.hit, pick = n => al.slice().sort(() => Math.random() - .5).slice(0, n); SFX('boom');
      if (G.char === 'street'){ addFx({ k:'ring', x:G.h.x, y:G.h.y, col:'#ff9a3c', t:0, dur:.5 }); kick(.8, .2, '#ff9a3c', .5); for (const m of al) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 24){ const a = Math.atan2(m.y - G.h.y, m.x - G.h.x); m.x += Math.cos(a)*5; m.y += Math.sin(a)*5; hitMon(m, hit*7, false); } }
      else if (G.char === 'frost'){ addFx({ k:'nova', t:0, dur:.55 }); for (const m of al){ m.frozen = 1.4; } }
      else if (G.char === 'beep'){ for (const m of pick(6)){ addFx({ k:'bolt', pts:[[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:0, dur:.3 }); hitMon(m, hit*5, false); } }
      else if (G.char === 'volt'){ for (const m of pick(5)){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 60], [m.x, m.y, BZ + 6]], t:0, dur:.35 }); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, col:'#e0b020', t:0, dur:.3 }); m.shock = 4; hitMon(m, hit*2.2, true); } }
    } } }
  if (G.relics.SUN && G.slots[0] && aliveMons().length && (G.sunT += dt) >= 10){ G.sunT = 0; addFx({ k:'nova', t:0, dur:.55 }); for (const m of aliveMons()) applySkillHit(G.slots[0], m, 1.2); }
  if (h.castT < 0 && aliveMons().length){ const id = G.slots.find(x => x && s.sk[x] && G.cds[x] <= 0); if (id){ h.castT = 0; h.castFired = false; h.castSk = id; G.cds[id] = s.sk[id].cd; } }
  if (h.castT >= 0){
    h.castT += dt;
    if (!h.castFired && h.castT >= .25){ h.castFired = true; castSkill(h.castSk, 1); G.lgC = (G.lgC || 0) + 1; if ((lgOn('W_ECHO') && G.lgC % 4 === 0) || (lgOn('R_DIAL') && Math.random() < .2)) G.timers.push({ t:.3, id:h.castSk, rep:1 }); if (s.sk[h.castSk] && s.sk[h.castSk].twin) for (let i = 0; i < s.sk[h.castSk].twin; i++) G.timers.push({ t:.25*(i + 1), id:h.castSk }); }
    if (h.castT >= .4) h.castT = -1;
  }
  if (G.timers.length){ for (const t of G.timers){ t.t -= dt; if (t.t <= 0){ t.done = true; if (t.echo){ const al = aliveMons(); if (al.length && s.sk[t.echo]){ const q = tPick(al); G.proj.push({ k:'meteor', x:q.x, y:q.y, t:0, dur:.9, mul:t.mul }); } } else if (t.crush){ if (s.sk[t.id]){ addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.5 }); SFX('boom'); for (const m of aliveMons()) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 14) applySkillHit(t.id, m, 2); } } else if (t.flick){ const k = s.sk[t.id], al = aliveMons().filter(m => !(m.fall > 0)).sort((a, b) => Math.hypot(a.x - G.h.x, a.y - G.h.y) - Math.hypot(b.x - G.h.x, b.y - G.h.y)).slice(0, 5);
        if (k && al.length){ const q = al[t.flick.i % al.length], a = Math.random()*6.28; addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.2 }); addFx({ k:'ghost', x:G.h.x, y:G.h.y, x2:q.x, y2:q.y, col:'#ff9ae0', t:0, dur:.35 });
          G.h.x = tClamp(q.x + Math.cos(a)*3.5, HX - ARENA_R, HX + ARENA_R); G.h.y = tClamp(q.y + Math.sin(a)*3.5, HY - ARENA_R, HY + ARENA_R); G.h.vx = G.h.vy = 0; G.h.dash = null; G.h.gx = G.h.x; G.h.gy = G.h.y;
          addFx({ k:'slash', x:q.x, y:q.y, z:BZ + 7, t:0, dur:.22 }); SFX('crit'); kick(.12);
          applySkillHit(t.id, q, t.mul*(t.flick.last ? 1.5 : 1));
          if (k.mode === 'FLICKER_TRAIL'){ G.timers.push({ t:.4, id:t.id, trail:{ x:q.x, y:q.y, mul:.22*t.mul } }); }
          if (k.mode === 'FLICKER_REAP' && q.dead && !t.flick.ext) G.timers.push({ t:.07, id:t.id, mul:t.mul, flick:{ i:t.flick.i + 1, ext:true } }); } }
      else if (t.trail){ if (s.sk[t.id]){ addFx({ k:'boom', x:t.trail.x, y:t.trail.y, z:BZ + 6, t:0, dur:.25 }); for (const m of aliveMons()) if (Math.hypot(m.x - t.trail.x, m.y - t.trail.y) < 7) applySkillHit(t.id, m, t.trail.mul); } }
      else if (s.sk[t.id]) castSkill(t.id, t.rep || .6); } } G.timers = G.timers.filter(t => !t.done); }
  for (const p of G.proj){ p.t += dt/p.dur; if (p.t >= 1 && !p.done){ p.done = true; resolveProj(p); } }
  if (G.proj.length) G.proj = G.proj.filter(p => !p.done);
}
function stepSim(dt){ const n = Math.max(1, Math.ceil(dt*G.speed/.05)); for (let i = 0; i < n; i++) update(dt*G.speed/n); }

;
/* 由 tools/model/gen_hero.py 以 Blender（bpy）產生，請勿手改。座標已是 three.js 的（x, y 上, z 前），數值乘以 100。 */
const HERO_MODEL = {"hips":{"at":[0,11.5,0],"m":[]},"torso":{"at":[0,11.8,0],"m":[{"c":"#2b2552","p":[407,-20,130,168,-20,314,-168,-20,314,-407,-20,130,-407,-20,-130,-168,-20,-314,168,-20,-314,407,-20,-130,407,90,130,168,90,314,-168,90,314,-407,90,130,-407,90,-130,-168,90,-314,168,90,-314,407,90,-130],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,1,6,0,14,9,15,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,2,5,5,2,4,4,2,3,2,6,1,15,9,8,9,13,10,10,13,11,11,13,12,13,9,14]},{"c":"#e8eef5","p":[-60,-20,335,-60,-10,325,-70,-10,335,-60,80,325,-60,90,335,-70,80,335,-60,-20,355,-70,-10,355,-60,-10,365,-60,90,355,-60,80,365,-70,80,355,60,-20,335,70,-10,335,60,-10,325,60,90,335,60,80,325,70,80,335,60,-20,355,60,-10,365,70,-10,355,60,90,355,70,80,355,60,80,365],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#e9edf6","p":[356,10,110,150,7,276,-148,8,271,-361,12,120,-356,7,-115,-152,12,-272,147,10,-283,362,7,-116,325,267,108,128,269,248,-132,274,246,-320,266,103,-318,274,-106,-137,273,-253,131,270,-244,320,269,-107,353,566,113,144,576,255,-150,565,253,-352,575,112,-348,575,-101,-147,575,-262,148,572,-264,350,568,-109,273,747,82,113,745,218,-109,748,209,-273,749,92,-283,748,-88,-110,748,-216,120,749,-218,281,744,-85],"i":[1,0,8,2,1,9,2,10,11,4,3,11,5,4,12,5,13,14,6,14,15,0,7,15,8,16,17,9,17,18,11,10,18,11,19,20,12,20,21,13,21,22,15,14,22,15,23,16,17,16,24,17,25,26,18,26,27,20,19,27,21,20,28,22,21,29,22,30,31,23,31,24,1,6,0,29,26,30,1,8,9,2,9,10,2,11,3,4,11,12,5,12,13,5,14,6,6,15,7,0,15,8,8,17,9,9,18,10,11,18,19,11,20,12,12,21,13,13,22,14,15,22,23,15,16,8,17,24,25,17,26,18,18,27,19,20,27,28,21,28,29,22,29,30,22,31,23,23,24,16,0,6,7,6,1,5,5,2,4,4,2,3,2,5,1,31,30,24,24,30,25,25,30,26,26,29,27,27,29,28]},{"c":"#cfd6e0","p":[273,704,-53,112,704,84,-116,705,79,-276,702,-51,-279,695,-234,-112,701,-358,119,697,-366,277,705,-227,230,819,-66,96,817,49,-93,823,47,-228,818,-62,-233,823,-218,-100,823,-328,93,815,-329,231,825,-218],"i":[1,0,8,1,9,10,2,10,11,3,11,12,5,4,12,5,13,14,6,14,15,7,15,8,1,6,0,13,10,14,1,8,9,1,10,2,2,11,3,3,12,4,5,12,13,5,14,6,6,15,7,7,8,0,0,6,7,6,1,5,5,3,4,2,3,5,2,5,1,15,14,8,8,14,9,9,14,10,10,13,11,11,13,12]},{"c":"#cfd6e0","p":[-97,370,283,-97,375,278,-102,375,283,-97,585,278,-97,590,283,-102,585,283,-97,370,298,-102,375,298,-97,375,303,-97,590,298,-97,585,303,-102,585,298,-82,370,283,-77,375,283,-82,375,278,-82,590,283,-82,585,278,-77,585,283,-82,370,298,-82,375,303,-77,375,298,-82,590,298,-77,585,298,-82,585,303],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[-107,335,273,-107,343,265,-115,343,273,-107,377,265,-107,385,273,-115,377,273,-107,335,307,-115,343,307,-107,343,315,-107,385,307,-107,377,315,-115,377,307,-73,335,273,-65,343,273,-73,343,265,-73,385,273,-73,377,265,-65,377,273,-73,335,307,-73,343,315,-65,343,307,-73,385,307,-65,377,307,-73,377,315],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#cfd6e0","p":[82,370,283,82,375,278,77,375,283,82,585,278,82,590,283,77,585,283,82,370,298,77,375,298,82,375,303,82,590,298,82,585,303,77,585,298,97,370,283,102,375,283,97,375,278,97,590,283,97,585,278,102,585,283,97,370,298,97,375,303,102,375,298,97,590,298,102,585,298,97,585,303],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[73,335,273,73,343,265,65,343,273,73,377,265,73,385,273,65,377,273,73,335,307,65,343,307,73,343,315,73,385,307,73,377,315,65,377,307,107,335,273,115,343,273,107,343,265,107,385,273,107,377,265,115,377,273,107,335,307,107,343,315,115,343,307,107,385,307,115,377,307,107,377,315],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#cfd6e0","p":[-210,210,300,-210,230,280,-230,230,300,-210,450,280,-210,470,300,-230,450,300,-210,210,320,-230,230,320,-210,230,340,-210,470,320,-210,450,340,-230,450,320,210,210,300,230,230,300,210,230,280,210,470,300,210,450,280,230,450,300,210,210,320,210,230,340,230,230,320,210,470,320,230,450,320,210,450,340],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#f4cfb4","p":[100,760,0,50,760,87,-50,760,87,-100,760,0,-50,760,-87,50,760,-87,90,940,0,45,940,78,-45,940,78,-90,940,0,-45,940,-78,45,940,-78],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,9,11,10,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,9,6,6,9,7,7,9,8]}]},"head":{"at":[0,21.0,0.2],"m":[{"c":"#f4cfb4","p":[1,-90,2,192,91,-149,-72,90,-242,-238,90,3,-72,90,239,192,94,151,84,391,-272,-217,391,-169,-216,389,169,86,390,271,269,388,2,1,570,0,-37,-45,-116,96,-45,-74,65,65,-220,217,63,-3,94,-41,73,-114,-41,-3,-178,68,-136,-33,-40,114,-175,63,140,66,63,220,286,241,-97,286,239,99,-2,242,-321,174,240,-259,-287,239,-100,-174,239,-258,-173,242,258,-284,239,96,175,239,259,1,238,319,208,416,-162,-81,412,-261,-253,411,3,-79,416,258,204,413,159,51,525,-161,156,523,-2,-127,523,-101,-130,523,100,50,521,160],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#f5f6fc","p":[358,244,-20,380,248,-50,415,254,-39,415,254,-1,380,248,10,336,372,-20,357,380,-50,391,392,-39,391,392,-1,357,380,10,274,480,-20,291,494,-50,319,517,-39,319,517,-1,291,494,10,179,560,-20,190,579,-50,208,610,-39,208,610,-1,190,579,10,62,603,-20,66,624,-50,72,660,-39,72,660,-1,66,624,10,-62,603,-20,-66,624,-50,-72,660,-39,-72,660,-1,-66,624,10,-179,560,-20,-190,579,-50,-208,610,-39,-208,610,-1,-190,579,10,-274,480,-20,-291,494,-50,-319,517,-39,-319,517,-1,-291,494,10,-336,372,-20,-357,380,-50,-391,392,-39,-391,392,-1,-357,380,10,-358,244,-20,-380,248,-50,-415,254,-39,-415,254,-1,-380,248,10],"i":[1,0,5,2,1,6,3,2,7,3,8,9,4,9,5,5,10,11,7,6,11,7,12,13,9,8,13,5,9,14,11,10,15,12,11,16,13,12,17,13,18,19,10,14,19,16,15,20,17,16,21,18,17,22,18,23,24,19,24,20,21,20,25,22,21,26,23,22,27,23,28,29,20,24,29,25,30,31,26,31,32,28,27,32,29,28,33,25,29,34,30,35,36,31,36,37,33,32,37,33,38,39,30,34,39,36,35,40,37,36,41,38,37,42,39,38,43,39,44,40,40,45,46,41,46,47,43,42,47,44,43,48,40,44,49,2,0,1,46,49,48,1,5,6,2,6,7,3,7,8,3,9,4,4,5,0,5,11,6,7,11,12,7,13,8,9,13,14,5,14,10,11,15,16,12,16,17,13,17,18,13,19,14,10,19,15,16,20,21,17,21,22,18,22,23,18,24,19,19,20,15,21,25,26,22,26,27,23,27,28,23,29,24,20,29,25,25,31,26,26,32,27,28,32,33,29,33,34,25,34,30,30,36,31,31,37,32,33,37,38,33,39,34,30,39,35,36,40,41,37,41,42,38,42,43,39,43,44,39,40,35,40,46,41,41,47,42,43,47,48,44,48,49,40,49,45,0,3,4,3,0,2,49,46,45,46,48,47]},{"c":"#f5f6fc","p":[-455,234,156,-440,220,134,-455,206,156,-320,220,166,-305,206,156,-305,234,156,-440,322,92,-455,347,97,-455,327,117,-320,345,115,-305,327,117,-305,347,97,-440,364,-10,-455,386,-24,-455,386,4,-320,396,-10,-305,386,4,-305,386,-24,-440,322,-112,-455,327,-137,-455,347,-117,-320,345,-135,-305,347,-117,-305,327,-137,-440,220,-154,-455,206,-176,-455,234,-176,-320,220,-186,-305,234,-176,-305,206,-176,-440,118,-112,-455,93,-117,-455,113,-137,-320,95,-135,-305,113,-137,-305,93,-117,-440,76,-10,-455,54,4,-455,54,-24,-320,44,-10,-305,54,-24,-305,54,4,-440,118,92,-455,113,117,-455,93,97,-320,95,115,-305,93,97,-305,113,117],"i":[39,41,40,18,20,19,16,21,15,42,44,43,15,17,16,14,17,13,33,35,34,12,14,13,5,2,4,30,32,31,9,11,10,20,23,19,27,29,28,6,8,7,17,9,10,24,26,25,3,5,4,8,11,7,7,1,6,1,2,0,11,3,4,36,38,37,21,23,22,19,12,18,8,12,13,45,47,46,7,2,1,11,9,3,5,0,2,8,10,11,8,6,12,17,15,9,14,16,17,19,14,12,16,23,21,20,22,23,20,18,24,22,29,27,26,28,29,26,24,30,35,33,27,32,34,35,37,32,30,41,39,33,38,40,41,43,38,36,40,47,45,44,46,47,0,44,42,46,5,3,36,18,42,4,2,7,46,44,0,3,27,39,10,8,13,16,14,19,22,20,25,28,26,31,34,32,37,40,38,43,20,24,25,22,27,21,26,29,25,26,30,31,35,27,28,32,35,31,37,30,36,41,33,34,38,41,37,43,36,42,40,45,39,44,47,43,0,42,1,46,3,45,42,6,1,6,42,12,12,42,18,18,30,24,30,18,36,4,7,11,46,0,5,15,3,9,3,39,45,39,27,33,27,15,21,15,27,3,10,13,17,16,19,23,22,25,29,28,31,35,34,37,41,40,43,47]},{"c":"#f5f6fc","p":[-430,260,-40,-390,260,-80,-430,260,-120,-470,260,-80,-430,460,-80],"i":[0,1,4,1,2,4,0,2,1,0,3,2,2,3,4,3,0,4]},{"c":"#f5f6fc","p":[305,234,156,320,220,134,305,206,156,440,220,166,455,206,156,455,234,156,320,322,92,305,347,97,305,327,117,440,345,115,455,327,117,455,347,97,320,364,-10,305,386,-24,305,386,4,440,396,-10,455,386,4,455,386,-24,320,322,-112,305,327,-137,305,347,-117,440,345,-135,455,347,-117,455,327,-137,320,220,-154,305,206,-176,305,234,-176,440,220,-186,455,234,-176,455,206,-176,320,118,-112,305,93,-117,305,113,-137,440,95,-135,455,113,-137,455,93,-117,320,76,-10,305,54,4,305,54,-24,440,44,-10,455,54,-24,455,54,4,320,118,92,305,113,117,305,93,97,440,95,115,455,93,97,455,113,117],"i":[39,41,40,18,20,19,16,21,15,42,44,43,15,17,16,14,17,13,33,35,34,12,14,13,5,2,4,30,32,31,9,11,10,20,23,19,27,29,28,6,8,7,17,9,10,24,26,25,3,5,4,8,11,7,7,1,6,1,2,0,11,3,4,36,38,37,21,23,22,19,12,18,8,12,13,45,47,46,7,2,1,11,9,3,5,0,2,8,10,11,8,6,12,17,15,9,14,16,17,19,14,12,16,23,21,20,22,23,20,18,24,22,29,27,26,28,29,26,24,30,35,33,27,32,34,35,37,32,30,34,41,39,38,40,41,38,36,42,40,47,45,44,46,47,44,42,1,46,5,3,36,18,42,2,7,11,46,44,0,3,27,39,10,8,13,16,14,19,22,20,25,28,26,31,34,32,37,40,38,43,20,24,25,22,27,21,26,29,25,26,30,31,35,27,28,32,35,31,37,30,36,34,39,33,38,41,37,38,42,43,40,45,39,44,47,43,44,1,0,46,3,45,42,6,1,6,42,12,12,42,18,18,30,24,30,18,36,2,11,4,46,0,5,15,3,9,3,39,45,39,27,33,27,15,21,15,27,3,10,13,17,16,19,23,22,25,29,28,31,35,34,37,41,40,43,47]},{"c":"#f5f6fc","p":[430,260,-40,470,260,-80,430,260,-120,390,260,-80,430,460,-80],"i":[0,1,4,1,2,4,0,2,1,0,3,2,2,3,4,3,0,4]}]},"hair0":{"at":[0,21.0,0.2],"m":[{"c":"#2b2552","p":[199,590,11,82,586,129,-85,594,124,-199,588,7,-206,595,-170,-82,585,-279,83,591,-279,197,596,-165,310,457,21,133,454,210,-136,457,201,-314,457,21,-319,464,-219,-136,454,-397,128,465,-397,318,455,-227,372,245,-54,151,248,118,-148,250,129,-367,244,-48,-368,254,-294,-147,251,-467,157,246,-467,373,254,-286,327,-97,-128,136,-103,-26,-132,-101,-32,-319,-98,-130,-327,-101,-288,-132,-97,-396,141,-98,-400,328,-100,-288,312,-439,-156,121,-433,-58,-126,-489,-69,-304,-440,-145,-303,-490,-266,-128,-335,-351,129,-376,-360,299,-332,-263],"i":[0,1,9,1,2,10,10,2,3,11,3,4,12,4,5,5,6,14,6,7,15,7,0,8,8,9,17,9,10,18,18,10,11,19,11,12,20,12,13,21,13,14,14,15,23,15,8,16,16,17,25,17,18,26,26,18,19,27,19,20,28,20,21,29,21,22,22,23,31,23,16,24,24,25,33,33,25,26,26,27,35,35,27,28,28,29,37,37,29,30,30,31,39,39,31,24,3,7,5,34,37,33,0,9,8,1,10,9,10,3,11,11,4,12,12,5,13,5,14,13,6,15,14,7,8,15,8,17,16,9,18,17,18,11,19,19,12,20,20,13,21,21,14,22,14,23,22,15,16,23,16,25,24,17,26,25,26,19,27,27,20,28,28,21,29,29,22,30,22,31,30,23,24,31,24,33,32,33,26,34,26,35,34,35,28,36,28,37,36,37,30,38,30,39,38,39,24,32,6,5,7,7,3,0,3,2,0,0,2,1,3,5,4,33,39,32,39,33,38,38,33,37,37,34,36,36,34,35]},{"c":"#2b2552","p":[-4,118,-42,260,138,-236,-99,137,-358,-329,142,-38,-101,348,274,263,343,153,103,454,-354,-264,451,-235,-260,454,155,103,453,279,325,450,-40,3,658,-41,-61,122,-227,155,120,-158,98,134,-343,309,135,-40,156,330,76,-188,120,-37,-249,138,-223,-62,332,149,-255,346,142,97,340,259,344,292,-157,346,365,72,2,293,-415,215,291,-339,-344,293,-153,-217,290,-340,-213,365,261,-347,360,73,212,358,261,0,362,329,251,485,-226,-100,482,-338,-310,485,-39,-97,486,261,248,483,147,56,602,-225,195,604,-41,-155,604,-155,-159,601,77,58,599,149],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#2b2552","p":[-380,-220,-22,-382,-202,-40,-398,-202,-20,-382,322,-40,-380,340,-22,-398,322,-20,-364,-220,111,-382,-202,113,-362,-202,129,-364,340,111,-362,322,129,-382,322,113,-306,-220,-31,-288,-202,-33,-308,-202,-49,-306,340,-31,-308,322,-49,-288,322,-33,-290,-220,102,-288,-202,120,-272,-202,100,-290,340,102,-272,322,100,-288,322,120],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,0,1,14,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,0,14,12,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[-330,260,172,-332,278,154,-348,278,174,-332,502,154,-330,520,172,-348,502,174,-324,260,236,-342,278,237,-322,278,253,-324,520,236,-322,502,253,-342,502,237,-256,260,164,-238,278,163,-258,278,147,-256,520,164,-258,502,147,-238,502,163,-250,260,228,-248,278,246,-232,278,226,-250,520,228,-232,502,226,-248,502,246],"i":[0,7,2,18,8,6,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,18,19,8,21,9,10,20,22,23,12,13,20,15,21,22,14,16,17,12,0,1,15,16,3,18,6,0,5,2,7,16,14,1,21,15,4,10,8,19,22,20,13,20,23,19,12,20,18,15,22,17,14,17,13,12,1,14,15,3,4,18,0,12,5,7,11,16,1,3,21,4,9,10,19,23,22,13,17]},{"c":"#2b2552","p":[306,-220,-31,308,-202,-49,288,-202,-33,308,322,-49,306,340,-31,288,322,-33,290,-220,102,272,-202,100,288,-202,120,290,340,102,288,322,120,272,322,100,380,-220,-22,398,-202,-20,382,-202,-40,380,340,-22,382,322,-40,398,322,-20,364,-220,111,362,-202,129,382,-202,113,364,340,111,382,322,113,362,322,129],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,15,16,3,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,15,3,4,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[256,260,164,258,278,147,238,278,163,258,502,147,256,520,164,238,502,163,250,260,228,232,278,226,248,278,246,250,520,228,248,502,246,232,502,226,330,260,172,348,278,174,332,278,154,330,520,172,332,502,154,348,502,174,324,260,236,322,278,253,342,278,237,324,520,236,342,502,237,322,502,253],"i":[0,7,2,6,19,8,8,11,7,4,11,9,3,2,5,9,23,21,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,4,5,11,8,10,11,6,18,19,9,10,23,20,22,23,18,12,13,15,21,22,14,16,17,0,1,14,4,15,16,6,0,12,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,0,14,12,4,16,3,6,12,18,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[-272,450,237,-273,470,217,-292,470,238,-273,530,217,-272,550,237,-292,530,238,-267,450,297,-287,470,298,-265,470,317,-267,550,297,-265,530,317,-287,530,298,147,450,203,167,470,202,145,470,183,147,550,203,145,530,183,167,530,202,152,450,263,153,470,283,172,470,262,152,550,263,172,530,262,153,530,283],"i":[18,8,6,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,18,19,8,21,9,10,20,22,23,12,13,20,15,21,22,14,16,17,12,0,1,4,15,16,6,0,12,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,12,20,18,15,22,17,14,17,13,12,1,14,4,16,3,6,12,18,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[132,410,198,135,425,183,118,425,195,135,515,183,132,530,198,118,515,195,120,410,256,106,425,254,117,425,271,120,530,256,117,515,271,106,515,254,260,410,224,274,425,226,263,425,209,260,530,224,263,515,209,274,515,226,248,410,282,245,425,297,262,425,285,248,530,282,262,515,285,245,515,297],"i":[0,7,2,6,19,8,8,11,7,4,11,9,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,4,5,11,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,6,0,12,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,6,12,18,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"hair1":{"at":[0,21.0,0.2],"m":[{"c":"#2b2552","p":[0,194,-40,251,211,-228,-96,210,-341,-310,211,-41,-99,377,264,254,372,150,95,447,-345,-252,443,-225,-251,447,151,93,443,262,311,447,-37,1,643,-38,-56,198,-218,150,199,-150,90,208,-327,300,206,-43,145,363,73,-183,200,-41,-239,207,-218,-58,358,138,-241,374,140,88,367,249,330,291,-148,336,385,70,-1,294,-396,210,289,-329,-336,288,-149,-209,286,-333,-204,393,246,-336,386,73,202,387,251,2,385,314,243,477,-217,-90,475,-332,-296,477,-40,-94,476,253,237,475,135,59,586,-222,186,591,-43,-149,587,-154,-148,589,70,54,587,141],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#2b2552","p":[225,409,112,312,420,29,315,408,23,222,417,118,224,416,110,319,416,23,221,415,-67,226,416,-65,225,412,-64,130,409,19,135,420,22,128,419,30,224,684,27,224,689,22,232,682,17,228,684,29],"i":[6,8,7,1,3,0,4,15,12,9,11,10,12,15,14,7,2,6,0,3,4,12,14,13,1,0,2,2,5,1,4,3,15,14,1,5,14,15,1,7,5,2,13,14,7,10,8,6,12,13,10,11,9,0,0,9,6,3,1,15,11,4,12,5,7,14,8,10,13,13,7,8,10,6,9,12,10,11,11,0,4,0,6,2]},{"c":"#2b2552","p":[130,407,243,218,414,155,211,413,147,134,410,239,127,412,243,218,420,151,127,411,61,127,411,56,126,416,58,38,406,150,31,413,152,32,418,155,119,685,154,123,682,140,136,687,150,131,690,150],"i":[6,8,7,3,0,2,12,3,15,9,11,10,13,12,15,5,6,7,0,3,4,13,15,14,3,2,1,2,5,1,12,4,3,14,1,5,14,15,1,5,2,6,8,13,14,8,6,9,11,12,13,4,11,9,2,0,9,3,1,15,11,4,12,5,7,14,8,10,13,8,14,7,8,9,10,11,13,10,4,9,0,2,9,6]},{"c":"#2b2552","p":[-30,413,278,64,412,194,53,406,182,-31,416,270,-28,420,274,65,416,176,-31,416,93,-29,417,96,-27,414,97,-118,416,181,-113,409,178,-122,420,187,-28,682,193,-29,689,184,-20,683,176,-23,689,194],"i":[6,8,7,3,0,2,4,15,12,9,11,10,13,12,15,7,2,6,0,3,4,13,15,14,3,2,1,2,5,1,4,3,15,14,1,5,14,15,1,7,5,2,13,14,7,10,8,6,12,13,10,4,11,9,2,0,9,3,1,15,11,4,12,5,7,14,8,10,13,13,7,8,10,6,9,12,10,11,4,9,0,2,9,6]},{"c":"#2b2552","p":[-174,413,201,-87,412,114,-88,406,112,-171,417,198,-181,411,204,-87,412,114,-166,415,28,-172,410,22,-170,416,26,-260,414,110,-262,411,110,-265,417,110,-175,692,111,-178,683,107,-171,685,112,-172,685,116],"i":[6,8,7,3,0,2,4,15,12,9,11,10,12,15,14,5,6,7,0,3,4,12,14,13,3,2,1,2,5,1,4,3,15,14,1,5,14,15,1,5,2,6,13,14,7,8,6,9,12,13,10,4,11,9,2,0,9,3,1,15,11,4,12,5,7,14,8,10,13,13,7,8,8,9,10,12,10,11,4,9,0,2,9,6]},{"c":"#2b2552","p":[-229,416,48,-149,417,-27,-149,407,-36,-233,413,51,-231,420,60,-149,420,-42,-239,408,-121,-224,419,-131,-239,409,-130,-318,406,-35,-324,411,-34,-323,411,-36,-234,684,-29,-242,688,-44,-230,684,-42,-229,691,-29],"i":[6,8,7,3,0,2,4,15,12,9,11,10,12,15,14,5,6,7,0,3,4,12,14,13,3,2,1,2,5,1,4,3,15,14,1,5,14,15,1,5,2,6,13,14,7,10,8,6,12,13,10,4,11,9,2,0,9,3,1,15,11,4,12,5,7,14,8,10,13,13,7,8,10,6,9,12,10,11,4,9,0,2,9,6]},{"c":"#2b2552","p":[-185,405,-104,-94,418,-186,-104,408,-185,-179,415,-94,-196,415,-94,-92,411,-195,-182,406,-278,-184,409,-277,-190,415,-279,-279,414,-186,-272,417,-194,-278,410,-182,-186,687,-179,-190,688,-192,-189,684,-186,-187,684,-190],"i":[6,8,7,3,0,2,4,15,12,9,11,10,12,15,14,5,6,7,0,3,4,12,14,13,3,2,1,2,5,1,4,3,15,14,1,5,14,15,1,5,2,6,8,13,14,10,8,6,12,13,10,11,9,0,0,9,6,3,1,15,11,4,12,5,7,14,8,10,13,8,14,7,10,6,9,12,10,11,11,0,4,0,6,2]},{"c":"#2b2552","p":[-48,405,-193,40,409,-275,37,410,-274,-46,419,-190,-53,410,-191,38,412,-279,-56,406,-364,-47,411,-361,-55,411,-362,-136,409,-270,-143,415,-275,-143,418,-266,-57,685,-275,-56,691,-273,-43,691,-275,-54,693,-271],"i":[6,8,7,3,0,2,12,3,15,9,11,10,12,15,14,7,2,6,0,3,4,12,14,13,3,2,1,2,5,1,12,4,3,5,15,1,5,14,15,7,5,2,13,14,7,8,6,9,12,13,10,4,11,9,0,9,6,3,1,15,11,4,12,5,7,14,8,10,13,13,7,8,8,9,10,12,10,11,4,9,0,0,6,2]},{"c":"#2b2552","p":[112,409,-170,198,415,-253,190,410,-256,105,421,-170,107,416,-160,200,419,-254,101,407,-341,113,415,-348,108,412,-344,19,415,-256,15,417,-261,13,420,-250,103,687,-254,104,683,-263,106,686,-261,108,682,-255],"i":[6,8,7,3,0,2,4,15,12,9,11,10,12,15,14,7,2,6,0,3,4,12,14,13,3,2,1,2,5,1,4,3,15,5,15,1,5,14,15,7,5,2,13,14,7,8,6,9,11,12,13,11,9,0,2,0,9,3,1,15,11,4,12,5,7,14,8,10,13,13,7,8,8,9,10,11,13,10,11,0,4,2,9,6]},{"c":"#2b2552","p":[216,411,-46,306,411,-132,306,411,-138,221,413,-48,209,415,-51,304,409,-140,214,407,-221,220,412,-228,218,418,-230,124,414,-143,125,414,-147,125,410,-131,209,690,-129,208,685,-143,221,691,-140,223,690,-134],"i":[6,8,7,3,0,2,4,15,12,9,11,10,12,15,14,5,6,7,0,3,4,12,14,13,3,2,1,2,5,1,4,3,15,5,15,1,5,14,15,5,2,6,8,13,14,8,6,9,11,12,13,11,9,0,0,9,6,3,1,15,11,4,12,5,7,14,8,10,13,8,14,7,8,9,10,11,13,10,11,0,4,0,6,2]},{"c":"#2b2552","p":[-198,400,273,-117,404,192,-204,395,114,-277,400,191,-195,639,191],"i":[0,1,4,1,2,4,0,2,1,0,3,2,2,3,4,3,0,4]},{"c":"#2b2552","p":[-37,371,274,39,370,190,-38,369,108,-119,368,189,-37,670,193],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#2b2552","p":[139,388,267,216,391,191,136,388,114,63,395,193,137,654,189],"i":[0,1,4,1,2,4,0,2,1,0,3,2,2,3,4,3,0,4]}]},"hair2":{"at":[0,21.0,0.2],"m":[{"c":"#2b2552","p":[-4,155,-44,264,177,-232,-101,175,-353,-326,174,-39,-102,344,277,268,346,157,98,452,-358,-264,456,-235,-260,453,156,102,452,281,327,451,-37,-1,658,-36,-59,163,-229,157,164,-152,99,169,-342,309,172,-40,153,332,73,-191,164,-41,-250,171,-230,-57,332,145,-255,346,145,97,340,263,347,288,-155,348,366,75,1,287,-413,212,287,-339,-350,290,-158,-212,292,-340,-218,364,257,-349,361,77,212,359,259,3,361,333,251,478,-227,-93,486,-341,-311,480,-39,-100,485,265,250,484,149,58,604,-225,192,598,-36,-156,598,-153,-157,600,78,62,598,144],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#2b2552","p":[-265,379,-53,-292,424,-148,-366,513,-149,-421,549,-54,-392,489,46,-316,402,46,-444,253,-92,-475,285,-168,-549,331,-168,-591,340,-87,-564,311,-14,-484,273,-19,-522,47,-123,-555,46,-168,-605,49,-170,-641,49,-119,-605,52,-73,-550,53,-72,-511,-235,-78,-527,-246,-107,-558,-247,-102,-568,-243,-84,-557,-241,-54,-530,-237,-56],"i":[1,0,6,2,1,7,3,2,8,3,9,10,4,10,11,5,11,6,7,6,12,7,13,14,8,14,15,9,15,16,10,16,17,6,11,17,12,18,19,13,19,20,14,20,21,16,15,21,17,16,22,17,23,18,4,0,2,21,23,22,1,6,7,2,7,8,3,8,9,3,10,4,4,11,5,5,6,0,7,12,13,7,14,8,8,15,9,9,16,10,10,17,11,6,17,12,12,19,13,13,20,14,14,21,15,16,21,22,17,22,23,17,18,12,0,4,5,4,2,3,2,0,1,23,19,18,19,23,20,20,23,21]},{"c":"#ff6aa8","p":[-350,365,-50,-288,412,-95,-373,412,-122,-426,412,-50,-373,412,22,-288,412,-5,-327,488,-122,-412,488,-95,-412,488,-5,-327,488,22,-274,488,-50,-350,535,-50],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#2b2552","p":[413,544,-48,365,517,-144,293,424,-145,261,376,-55,316,405,47,392,490,50,598,345,-91,549,335,-168,479,283,-162,441,253,-93,486,264,-17,561,309,-14,642,54,-119,607,52,-171,549,51,-175,524,43,-122,554,45,-68,607,55,-73,567,-242,-76,550,-247,-104,527,-244,-102,506,-237,-76,530,-232,-52,559,-239,-53],"i":[0,6,7,1,7,8,2,8,9,4,3,9,5,4,10,0,5,11,7,6,12,8,7,13,9,8,14,9,15,16,10,16,17,6,11,17,13,12,18,14,13,19,15,14,20,15,21,22,16,22,23,17,23,18,4,0,2,20,22,21,0,7,1,1,8,2,2,9,3,4,9,10,5,10,11,0,11,6,7,12,13,8,13,14,9,14,15,9,16,10,10,17,11,6,17,12,13,18,19,14,19,20,15,20,21,15,22,16,16,23,17,17,18,12,0,4,5,4,2,3,2,0,1,23,22,18,18,20,19,22,20,18]},{"c":"#ff6aa8","p":[350,365,-50,412,412,-95,327,412,-122,274,412,-50,327,412,22,412,412,-5,373,488,-122,288,488,-95,288,488,-5,373,488,22,426,488,-50,350,535,-50],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"hair3":{"at":[0,21.0,0.2],"m":[{"c":"#2b2552","p":[216,599,24,92,596,157,-89,602,146,-218,601,19,-216,601,-160,-95,598,-297,91,598,-295,217,602,-159,339,480,45,141,478,248,-144,476,247,-341,484,46,-341,476,-225,-140,480,-421,145,475,-419,339,476,-229,383,256,15,163,255,212,-163,258,212,-392,254,13,-382,255,-255,-158,261,-447,156,259,-453,384,254,-257,375,2,4,158,-3,177,-156,-6,171,-366,-2,7,-373,4,-241,-148,3,-420,157,-2,-413,366,-2,-239,359,-82,-5,153,-86,154,-148,-76,159,-358,-75,0,-360,-84,-235,-152,-85,-396,152,-81,-401,366,-86,-240],"i":[0,1,9,1,2,10,10,2,3,11,3,4,12,4,5,13,5,6,6,7,15,7,0,8,8,9,17,9,10,18,18,10,11,19,11,12,12,13,21,13,14,22,22,14,15,15,8,16,16,17,25,17,18,26,26,18,19,19,20,28,20,21,29,29,21,22,30,22,23,31,23,16,24,25,33,25,26,34,26,27,35,35,27,28,28,29,37,29,30,38,38,30,31,31,24,32,7,4,2,34,37,33,0,9,8,1,10,9,10,3,11,11,4,12,12,5,13,13,6,14,6,15,14,7,8,15,8,17,16,9,18,17,18,11,19,19,12,20,12,21,20,13,22,21,22,15,23,15,16,23,16,25,24,17,26,25,26,19,27,19,28,27,20,29,28,29,22,30,30,23,31,31,16,24,24,33,32,25,34,33,26,35,34,35,28,36,28,37,36,29,38,37,38,31,39,31,32,39,6,4,7,7,2,0,0,2,1,2,4,3,4,6,5,33,38,32,32,38,39,38,33,37,37,35,36,35,37,34]},{"c":"#2b2552","p":[0,48,-42,260,130,-233,-99,125,-357,-325,126,-40,-102,338,276,267,334,159,99,454,-357,-265,450,-238,-266,457,155,104,457,280,330,456,-39,-4,656,-39,-61,56,-226,155,50,-154,95,94,-338,308,98,-39,152,321,76,-191,52,-41,-251,95,-227,-62,322,149,-254,332,149,93,332,261,347,288,-155,348,353,72,1,289,-416,211,293,-342,-347,292,-153,-218,292,-337,-218,352,264,-350,354,79,217,355,258,-4,352,330,247,480,-225,-98,481,-340,-307,485,-39,-95,485,265,249,481,148,61,603,-225,189,602,-41,-152,597,-153,-154,601,72,62,604,143],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#2b2552","p":[-413,-140,-27,-414,-120,-47,-433,-120,-25,-414,300,-47,-413,320,-27,-433,300,-25,-397,-140,172,-417,-120,174,-395,-120,192,-397,320,172,-395,300,192,-417,300,174,-343,-140,-32,-323,-120,-34,-345,-120,-52,-343,320,-32,-345,300,-52,-323,300,-34,-327,-140,167,-326,-120,187,-307,-120,165,-327,320,167,-307,300,165,-326,300,187],"i":[6,19,8,9,5,11,3,2,5,6,2,0,9,23,21,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,6,7,2,3,1,2,9,4,5,8,10,11,6,18,19,9,10,23,20,22,23,18,12,13,15,21,22,14,16,17,0,1,14,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,0,14,12,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[343,-140,-32,345,-120,-52,323,-120,-34,345,300,-52,343,320,-32,323,300,-34,327,-140,167,307,-120,165,326,-120,187,327,320,167,326,300,187,307,300,165,413,-140,-27,433,-120,-25,414,-120,-47,413,320,-27,414,300,-47,433,300,-25,397,-140,172,395,-120,192,417,-120,174,397,320,172,417,300,174,395,300,192],"i":[0,7,2,18,8,6,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,18,19,8,21,9,10,20,22,23,18,12,13,21,22,17,14,16,17,12,0,1,15,16,3,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,21,17,15,14,17,13,12,1,14,15,3,4,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[-210,400,280,-210,420,260,-230,420,280,-210,480,260,-210,500,280,-230,480,280,-210,400,340,-230,420,340,-210,420,360,-210,500,340,-210,480,360,-230,480,340,210,400,280,230,420,280,210,420,260,210,500,280,210,480,260,230,480,280,210,400,340,210,420,360,230,420,340,210,500,340,230,480,340,210,480,360],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"hair4":{"at":[0,21.0,0.2],"m":[{"c":"#2b2552","p":[1,135,-42,256,158,-228,-101,154,-352,-315,158,-43,-100,363,270,254,364,153,100,452,-346,-261,446,-232,-257,451,153,94,451,265,319,449,-41,-3,644,-37,-55,139,-220,150,146,-154,94,152,-337,301,155,-40,150,346,71,-186,139,-41,-245,151,-217,-61,348,142,-246,359,141,94,365,253,342,290,-156,340,382,75,1,289,-401,207,293,-331,-334,288,-150,-207,290,-331,-208,380,252,-338,379,68,207,380,257,-1,378,320,243,473,-224,-90,476,-333,-301,474,-42,-97,475,251,246,480,141,56,593,-218,183,593,-43,-147,594,-153,-152,589,75,58,590,144],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#2b2552","p":[-2,497,-75,142,608,-173,-56,612,-243,-175,608,-69,-53,612,105,141,614,38,54,786,-244,-144,791,-171,-140,788,32,58,788,102,181,785,-72,-1,901,-75],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#ff6aa8","p":[110,540,-60,78,540,18,0,540,50,-78,540,18,-110,540,-60,-78,540,-138,0,540,-170,78,540,-138,130,610,-60,92,610,32,0,610,70,-92,610,32,-130,610,-60,-92,610,-152,0,610,-190,92,610,-152],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,6,14,15,0,7,15,4,0,2,13,15,14,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,6,15,7,0,15,8,0,6,7,6,4,5,4,2,3,2,0,1,0,4,6,15,11,8,8,11,9,9,11,10,11,15,12,12,15,13]},{"c":"#2b2552","p":[-368,-10,-28,-370,8,-46,-386,8,-27,-370,312,-46,-368,330,-28,-386,312,-27,-356,-10,95,-374,8,97,-354,8,113,-356,330,95,-354,312,113,-374,312,97,-304,-10,-35,-286,8,-37,-306,8,-53,-304,330,-35,-306,312,-53,-286,312,-37,-292,-10,88,-290,8,106,-274,8,87,-292,330,88,-274,312,87,-290,312,106],"i":[18,8,6,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,18,19,8,21,9,10,20,22,23,12,13,20,15,21,22,14,16,17,0,1,14,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,12,20,18,15,22,17,14,17,13,0,14,12,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[304,-10,-35,306,8,-53,286,8,-37,306,312,-53,304,330,-35,286,312,-37,292,-10,88,274,8,87,290,8,106,292,330,88,290,312,106,274,312,87,368,-10,-28,386,8,-27,370,8,-46,368,330,-28,370,312,-46,386,312,-27,356,-10,95,354,8,113,374,8,97,356,330,95,374,312,97,354,312,113],"i":[0,7,2,6,19,8,8,11,7,4,11,9,3,2,5,9,23,21,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,4,5,11,8,10,11,6,18,19,9,10,23,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,15,16,3,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,15,3,4,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"tail":{"at":[3.9,11.435,1.8],"m":[{"c":"#e8eef5","p":[10,0,0,0,-1,-10,-10,0,0,0,1,10,15,-78,10,5,-79,0,-5,-79,10,5,-78,20,20,-156,20,10,-157,10,0,-157,20,10,-156,30],"i":[0,4,5,2,1,5,3,2,6,0,3,7,4,8,9,6,5,9,7,6,10,4,7,11,3,0,1,8,11,10,0,5,1,2,5,6,3,6,7,0,7,4,4,9,5,6,9,10,7,10,11,4,11,8,3,1,2,8,10,9]},{"c":"#e8eef5","p":[10,-258,20,50,-238,-9,-5,-238,-27,-39,-238,20,-5,-238,67,50,-238,49,25,-206,-27,-30,-206,-9,-30,-206,49,25,-206,67,59,-206,20,10,-186,20],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#e8eef5","p":[80,-251,42,102,-251,20,80,-251,-2,58,-251,20,80,-192,20],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#e8eef5","p":[-60,-251,42,-38,-251,20,-60,-251,-2,-82,-251,20,-60,-192,20],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#e8eef5","p":[10,-251,112,32,-251,90,10,-251,68,-12,-251,90,10,-192,90],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#e8eef5","p":[10,-251,-28,32,-251,-50,10,-251,-72,-12,-251,-50,10,-192,-50],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#e8eef5","p":[10,-205,42,32,-205,20,10,-205,-2,-12,-205,20,10,-147,20],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#e8eef5","p":[10,-297,42,32,-297,20,10,-297,-2,-12,-297,20,10,-238,20],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]}]},"armL":{"at":[-4.3,18.6,0],"m":[{"c":"#e9edf6","p":[161,18,37,69,20,138,-64,17,145,-156,22,41,-125,22,-93,-8,18,-157,123,22,-104,104,-293,45,30,-289,148,-89,-285,147,-166,-287,52,-140,-294,-60,-34,-287,-117,81,-292,-75],"i":[7,0,1,8,1,2,9,2,3,3,4,11,4,5,12,5,6,13,13,6,0,4,1,5,11,9,10,7,1,8,8,2,9,9,3,10,3,11,10,4,12,11,5,13,12,13,0,7,5,1,6,6,1,0,1,4,2,2,4,3,8,9,7,7,12,13,9,11,7,12,7,11]},{"c":"#e9edf6","p":[-32,-452,18,75,-376,-54,-68,-376,-104,-158,-377,23,-69,-377,144,74,-377,94,9,-244,-103,-137,-246,-59,-134,-246,94,8,-245,145,97,-246,18,-30,-167,21],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"foreL":{"at":[-4.6,15.5,0.2],"m":[{"c":"#e9edf6","p":[134,-1,30,62,5,123,-60,-1,128,-137,5,38,-113,2,-88,-6,4,-145,107,-1,-87,170,-313,77,62,-309,210,-94,-309,209,-205,-314,87,-174,-306,-75,-29,-307,-150,130,-314,-85],"i":[7,0,1,8,1,2,2,3,10,3,4,11,4,5,12,12,5,6,13,6,0,3,1,6,9,12,8,7,1,8,8,2,9,2,10,9,3,11,10,4,12,11,12,6,13,13,0,7,5,4,6,6,1,0,4,3,6,1,3,2,8,12,7,7,12,13,12,9,11,11,9,10]},{"c":"#cfd6e0","p":[193,-310,86,75,-311,234,-106,-308,237,-230,-312,95,-192,-308,-88,-27,-311,-177,145,-312,-99,194,-378,85,78,-378,236,-113,-382,243,-233,-379,94,-196,-380,-93,-26,-380,-179,148,-379,-104],"i":[7,0,1,8,1,2,9,2,3,10,3,4,11,4,5,12,5,6,6,0,7,2,4,3,7,10,12,7,1,8,8,2,9,9,3,10,10,4,11,11,5,12,12,6,13,6,7,13,5,4,6,6,1,0,4,2,6,1,6,2,8,10,7,7,12,13,12,10,11,10,8,9]},{"c":"#f4cfb4","p":[-90,-501,10,-90,-485,-15,-115,-485,10,-90,-420,-15,-90,-403,10,-115,-420,10,-90,-501,110,-115,-485,110,-90,-485,135,-90,-403,110,-90,-420,135,-115,-420,110,30,-501,10,55,-485,10,30,-485,-15,30,-403,10,30,-420,-15,55,-420,10,30,-501,110,30,-485,135,55,-485,110,30,-403,110,55,-420,110,30,-420,135],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#e4b99a","p":[-105,-468,135,-105,-462,125,-115,-462,135,-105,-416,125,-105,-410,135,-115,-416,135,-105,-468,165,-115,-462,165,-105,-462,175,-105,-410,165,-105,-416,175,-115,-416,165,45,-468,135,55,-462,135,45,-462,125,45,-410,135,45,-416,125,55,-416,135,45,-468,165,45,-462,175,55,-462,165,45,-410,165,55,-416,165,45,-416,175],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#f4cfb4","p":[42,-446,57,42,-438,45,30,-438,57,42,-401,45,42,-390,57,30,-401,57,42,-446,123,30,-438,123,42,-438,135,42,-390,123,42,-401,135,30,-401,123,78,-446,57,90,-438,57,78,-438,45,78,-390,57,78,-401,45,90,-401,57,78,-446,123,78,-438,135,90,-438,123,78,-390,123,90,-401,123,78,-401,135],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"armR":{"at":[4.3,18.6,0],"m":[{"c":"#e9edf6","p":[157,23,29,76,17,142,-66,16,142,-156,19,35,-127,21,-101,-8,23,-158,123,20,-107,166,-294,52,97,-288,150,-24,-285,145,-106,-286,59,-85,-286,-62,22,-287,-121,134,-292,-66],"i":[7,0,1,1,2,9,2,3,10,3,4,11,11,4,5,12,5,6,13,6,0,5,2,0,13,9,11,7,1,8,1,9,8,2,10,9,3,11,10,11,5,12,12,6,13,13,0,7,5,0,6,0,2,1,2,5,3,3,5,4,8,9,7,7,9,13,13,11,12,11,9,10]},{"c":"#e9edf6","p":[32,-455,18,137,-376,-58,-10,-378,-104,-102,-372,18,-9,-377,146,137,-375,94,71,-243,-104,-75,-243,-56,-77,-244,99,69,-247,145,163,-246,20,32,-167,20],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"foreR":{"at":[4.6,15.5,0.2],"m":[{"c":"#e9edf6","p":[140,3,23,61,5,126,-57,-2,129,-141,-4,30,-110,0,-85,1,-3,-144,109,-5,-95,205,-311,74,104,-309,210,-61,-310,214,-168,-313,91,-135,-309,-79,19,-311,-147,163,-309,-87],"i":[7,0,1,1,2,9,2,3,10,3,4,11,11,4,5,12,5,6,13,6,0,2,4,3,9,12,8,7,1,8,1,9,8,2,10,9,3,11,10,11,5,12,12,6,13,13,0,7,5,4,6,6,4,0,0,4,1,1,4,2,8,12,7,7,12,13,12,10,11,9,10,12]},{"c":"#cfd6e0","p":[231,-309,82,118,-309,234,-70,-313,238,-188,-312,92,-154,-313,-88,15,-312,-172,183,-310,-97,236,-382,86,119,-383,235,-68,-379,242,-196,-379,96,-156,-380,-91,13,-382,-182,186,-379,-102],"i":[0,1,8,1,2,9,2,3,10,3,4,11,11,4,5,5,6,13,13,6,0,3,5,4,8,11,13,0,8,7,1,9,8,2,10,9,3,11,10,11,5,12,5,13,12,13,0,7,5,3,6,6,3,0,0,3,1,1,3,2,8,13,7,13,11,12,11,9,10,9,11,8]},{"c":"#f4cfb4","p":[-30,-501,10,-30,-485,-15,-55,-485,10,-30,-420,-15,-30,-403,10,-55,-420,10,-30,-501,110,-55,-485,110,-30,-485,135,-30,-403,110,-30,-420,135,-55,-420,110,90,-501,10,115,-485,10,90,-485,-15,90,-403,10,90,-420,-15,115,-420,10,90,-501,110,90,-485,135,115,-485,110,90,-403,110,115,-420,110,90,-420,135],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#e4b99a","p":[-45,-468,135,-45,-462,125,-55,-462,135,-45,-416,125,-45,-410,135,-55,-416,135,-45,-468,165,-55,-462,165,-45,-462,175,-45,-410,165,-45,-416,175,-55,-416,165,105,-468,135,115,-462,135,105,-462,125,105,-410,135,105,-416,125,115,-416,135,105,-468,165,105,-462,175,115,-462,165,105,-410,165,115,-416,165,105,-416,175],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#f4cfb4","p":[-78,-446,57,-78,-438,45,-90,-438,57,-78,-401,45,-78,-390,57,-90,-401,57,-78,-446,123,-90,-438,123,-78,-438,135,-78,-390,123,-78,-401,135,-90,-401,123,-42,-446,57,-30,-438,57,-42,-438,45,-42,-390,57,-42,-401,45,-30,-401,57,-42,-446,123,-42,-438,135,-30,-438,123,-42,-390,123,-30,-401,123,-42,-401,135],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"legL":{"at":[-2.6,11.5,0],"m":[{"c":"#6f8f4a","p":[281,-401,171,123,-401,350,-112,-406,357,-286,-409,171,-280,-404,-74,-113,-401,-256,123,-407,-259,284,-404,-80,274,-166,141,121,-163,314,-114,-164,321,-271,-163,142,-277,-164,-109,-119,-160,-283,110,-161,-276,278,-163,-105,269,44,123,112,47,283,-107,51,287,-264,49,124,-266,50,-119,-108,50,-287,111,53,-280,273,47,-112],"i":[0,8,9,1,9,10,3,2,10,4,3,11,5,4,12,5,13,14,6,14,15,7,15,8,8,16,17,10,9,17,11,10,18,12,11,19,13,12,20,14,13,21,14,22,23,15,23,16,0,1,3,23,22,20,0,9,1,1,10,2,3,10,11,4,11,12,5,12,13,5,14,6,6,15,7,7,8,0,8,17,9,10,17,18,11,18,19,12,19,20,13,20,21,14,21,22,14,23,15,15,16,8,0,4,7,7,5,6,4,5,7,4,0,3,3,1,2,23,20,16,16,19,17,17,19,18,19,16,20,20,22,21]},{"c":"#5d7a3c","p":[-360,-398,-100,-360,-385,-120,-380,-385,-100,-360,-176,-120,-360,-163,-100,-380,-176,-100,-360,-398,180,-380,-385,180,-360,-385,200,-360,-163,180,-360,-176,200,-380,-176,180,-310,-398,-100,-290,-385,-100,-310,-385,-120,-310,-163,-100,-310,-176,-120,-290,-176,-100,-310,-398,180,-310,-385,200,-290,-385,180,-310,-163,180,-290,-176,180,-310,-176,200],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#5d7a3c","p":[-370,-225,-120,-370,-218,-130,-380,-218,-120,-370,-199,-130,-370,-192,-120,-380,-199,-120,-370,-225,200,-380,-218,200,-370,-218,210,-370,-192,200,-370,-199,210,-380,-199,200,-340,-225,-120,-330,-218,-120,-340,-218,-130,-340,-192,-120,-340,-199,-130,-330,-199,-120,-340,-225,200,-340,-218,210,-330,-218,200,-340,-192,200,-330,-199,200,-340,-199,210],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"shinL":{"at":[-2.6,7.587,0],"m":[{"c":"#e8eef5","p":[109,-627,-343,43,-586,-340,-49,-588,-340,-111,-631,-343,-111,-692,-337,-48,-729,-339,47,-729,-341,107,-691,-337,154,-495,-263,68,-401,-263,-64,-401,-261,-161,-496,-264,-156,-625,-261,-64,-717,-260,67,-718,-258,158,-621,-260,177,-442,-52,70,-347,-51,-75,-351,-50,-174,-445,-48,-173,-590,-51,-72,-695,-49,75,-694,-46,177,-590,-54,172,-499,204,69,-419,199,-75,-423,200,-174,-499,196,-174,-617,198,-68,-698,197,71,-695,203,174,-617,198,137,-563,383,55,-509,377,-60,-506,380,-140,-567,376,-140,-647,381,-56,-709,380,59,-707,376,141,-648,383,82,-625,459,36,-587,456,-37,-585,457,-87,-625,456,-86,-679,459,-31,-716,461,32,-714,459,80,-672,463],"i":[8,0,1,1,2,10,2,3,11,3,4,12,4,5,13,13,5,6,14,6,7,15,7,0,16,8,9,17,9,10,10,11,19,11,12,20,12,13,21,21,13,14,22,14,15,23,15,8,16,17,25,25,17,18,26,18,19,27,19,20,28,20,21,29,21,22,22,23,31,23,16,24,24,25,33,33,25,26,34,26,27,35,27,28,36,28,29,37,29,30,30,31,39,31,24,32,32,33,41,33,34,42,42,34,35,43,35,36,44,36,37,37,38,46,38,39,47,39,32,40,3,5,4,42,45,41,8,1,9,1,10,9,2,11,10,3,12,11,4,13,12,13,6,14,14,7,15,15,0,8,16,9,17,17,10,18,10,19,18,11,20,19,12,21,20,21,14,22,22,15,23,23,8,16,16,25,24,25,18,26,26,19,27,27,20,28,28,21,29,29,22,30,22,31,30,23,24,31,24,33,32,33,26,34,34,27,35,35,28,36,36,29,37,37,30,38,30,39,38,31,32,39,32,41,40,33,42,41,42,35,43,43,36,44,44,37,45,37,46,45,38,47,46,39,40,47,6,1,7,7,1,0,1,5,2,6,5,1,2,5,3,41,47,40,47,41,46,46,41,45,45,43,44,43,45,42]},{"c":"#f4f6fb","p":[-172,-759,-332,-172,-731,-360,-200,-731,-332,-172,-677,-360,-172,-649,-332,-200,-677,-332,-172,-759,452,-200,-731,452,-172,-731,480,-172,-649,452,-172,-677,480,-200,-677,452,172,-759,-332,200,-731,-332,172,-731,-360,172,-649,-332,172,-677,-360,200,-677,-332,172,-759,452,172,-731,480,200,-731,452,172,-649,452,200,-677,452,172,-677,480],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#8fb6ff","p":[-150,-684,250,-150,-674,240,-160,-674,250,-150,-644,240,-150,-634,250,-160,-644,250,-150,-684,390,-160,-674,390,-150,-674,400,-150,-634,390,-150,-644,400,-160,-644,390,150,-684,250,160,-674,250,150,-674,240,150,-634,250,150,-644,240,160,-644,250,150,-684,390,150,-674,400,160,-674,390,150,-634,390,160,-644,390,150,-644,400],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#6f8f4a","p":[351,-544,187,140,-542,407,-141,-545,404,-345,-544,187,-350,-538,-134,-139,-536,-344,142,-543,-351,355,-535,-126,321,-258,148,141,-258,357,-129,-263,355,-323,-265,150,-330,-263,-135,-131,-261,-325,140,-257,-325,321,-263,-136,282,27,172,124,26,360,-116,22,359,-284,29,182,-283,23,-77,-115,29,-257,125,25,-256,293,23,-73],"i":[0,8,9,1,9,10,3,2,10,4,3,11,5,4,12,6,5,13,6,14,15,7,15,8,9,8,16,9,17,18,10,18,19,11,19,20,12,20,21,14,13,21,15,14,22,8,15,23,0,1,3,21,23,22,0,9,1,1,10,2,3,10,11,4,11,12,5,12,13,6,13,14,6,15,7,7,8,0,9,16,17,9,18,10,10,19,11,11,20,12,12,21,13,14,21,22,15,22,23,8,23,16,0,3,7,7,5,6,4,5,7,4,7,3,3,1,2,23,20,16,16,18,17,19,18,16,19,16,20,20,23,21]},{"c":"#5d7a3c","p":[365,-517,195,149,-519,420,-154,-521,421,-364,-516,194,-367,-518,-131,-153,-516,-360,149,-519,-360,365,-517,-130,354,-419,188,146,-420,412,-146,-418,411,-356,-420,186,-355,-421,-129,-144,-416,-352,145,-421,-355,357,-421,-130],"i":[0,8,9,1,9,10,3,2,10,4,3,11,5,4,12,6,5,13,6,14,15,7,15,8,0,1,3,13,15,14,0,9,1,1,10,2,3,10,11,4,11,12,5,12,13,6,13,14,6,15,7,7,8,0,0,3,7,7,4,6,6,4,5,4,7,3,3,1,2,15,12,8,8,10,9,11,10,8,11,8,12,12,15,13]}]},"legR":{"at":[2.6,11.5,0],"m":[{"c":"#6f8f4a","p":[292,-401,179,116,-405,353,-112,-406,356,-287,-408,173,-292,-406,-72,-113,-406,-258,119,-406,-259,293,-401,-71,279,-159,148,115,-167,319,-112,-161,315,-275,-167,139,-271,-163,-108,-117,-161,-278,121,-162,-279,274,-164,-102,263,46,114,117,46,286,-105,49,293,-273,44,114,-270,46,-124,-114,55,-285,114,49,-288,268,48,-120],"i":[0,8,9,2,1,9,3,2,10,4,3,11,5,4,12,5,13,14,6,14,15,7,15,8,8,16,17,10,9,17,11,10,18,12,11,19,13,12,20,13,21,22,14,22,23,15,23,16,0,1,3,21,23,22,0,9,1,2,9,10,3,10,11,4,11,12,5,12,13,5,14,6,6,15,7,7,8,0,8,17,9,10,17,18,11,18,19,12,19,20,13,20,21,13,22,14,14,23,15,15,16,8,0,3,7,7,5,6,4,5,7,4,7,3,3,1,2,23,20,16,16,18,17,19,18,16,19,16,20,20,23,21]},{"c":"#5d7a3c","p":[310,-398,-100,310,-385,-120,290,-385,-100,310,-176,-120,310,-163,-100,290,-176,-100,310,-398,180,290,-385,180,310,-385,200,310,-163,180,310,-176,200,290,-176,180,360,-398,-100,380,-385,-100,360,-385,-120,360,-163,-100,360,-176,-120,380,-176,-100,360,-398,180,360,-385,200,380,-385,180,360,-163,180,380,-176,180,360,-176,200],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#5d7a3c","p":[340,-225,-120,340,-218,-130,330,-218,-120,340,-199,-130,340,-192,-120,330,-199,-120,340,-225,200,330,-218,200,340,-218,210,340,-192,200,340,-199,210,330,-199,200,370,-225,-120,380,-218,-120,370,-218,-130,370,-192,-120,370,-199,-130,380,-199,-120,370,-225,200,370,-218,210,380,-218,200,370,-192,200,380,-199,200,370,-199,210],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"shinR":{"at":[2.6,7.587,0],"m":[{"c":"#e8eef5","p":[110,-626,-337,44,-581,-343,-45,-588,-338,-114,-629,-338,-114,-688,-336,-44,-730,-343,42,-733,-337,110,-686,-340,155,-493,-263,63,-404,-263,-69,-403,-262,-159,-495,-258,-157,-625,-263,-69,-720,-262,67,-718,-260,157,-627,-257,178,-446,-51,75,-349,-51,-71,-349,-46,-173,-445,-48,-176,-595,-51,-76,-692,-53,71,-698,-53,178,-590,-47,169,-503,198,70,-421,197,-73,-416,204,-171,-498,198,-172,-620,199,-72,-697,200,68,-701,200,169,-617,197,135,-568,376,55,-507,381,-55,-505,381,-136,-568,379,-135,-649,377,-56,-708,376,61,-708,381,141,-651,377,83,-619,463,37,-581,461,-33,-586,462,-87,-623,457,-86,-675,463,-33,-712,461,34,-711,456,85,-675,460],"i":[8,0,1,1,2,10,2,3,11,3,4,12,4,5,13,13,5,6,14,6,7,15,7,0,16,8,9,9,10,18,10,11,19,11,12,20,12,13,21,21,13,14,22,14,15,23,15,8,16,17,25,25,17,18,26,18,19,27,19,20,28,20,21,29,21,22,22,23,31,23,16,24,24,25,33,33,25,26,34,26,27,35,27,28,36,28,29,37,29,30,30,31,39,31,24,32,32,33,41,41,33,34,42,34,35,43,35,36,44,36,37,37,38,46,38,39,47,39,32,40,5,2,6,44,42,43,8,1,9,1,10,9,2,11,10,3,12,11,4,13,12,13,6,14,14,7,15,15,0,8,16,9,17,9,18,17,10,19,18,11,20,19,12,21,20,21,14,22,22,15,23,23,8,16,16,25,24,25,18,26,26,19,27,27,20,28,28,21,29,29,22,30,22,31,30,23,24,31,24,33,32,33,26,34,34,27,35,35,28,36,36,29,37,37,30,38,30,39,38,31,32,39,32,41,40,41,34,42,42,35,43,43,36,44,44,37,45,37,46,45,38,47,46,39,40,47,6,1,7,7,1,0,1,6,2,2,4,3,4,2,5,41,46,40,40,46,47,46,42,45,41,42,46,45,42,44]},{"c":"#f4f6fb","p":[-172,-759,-332,-172,-731,-360,-200,-731,-332,-172,-677,-360,-172,-649,-332,-200,-677,-332,-172,-759,452,-200,-731,452,-172,-731,480,-172,-649,452,-172,-677,480,-200,-677,452,172,-759,-332,200,-731,-332,172,-731,-360,172,-649,-332,172,-677,-360,200,-677,-332,172,-759,452,172,-731,480,200,-731,452,172,-649,452,200,-677,452,172,-677,480],"i":[6,19,8,9,5,11,3,2,5,0,7,2,21,10,23,8,11,7,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#8fb6ff","p":[-150,-684,250,-150,-674,240,-160,-674,250,-150,-644,240,-150,-634,250,-160,-644,250,-150,-684,390,-160,-674,390,-150,-674,400,-150,-634,390,-150,-644,400,-160,-644,390,150,-684,250,160,-674,250,150,-674,240,150,-634,250,150,-644,240,160,-644,250,150,-684,390,150,-674,400,160,-674,390,150,-634,390,160,-644,390,150,-644,400],"i":[0,7,2,6,19,8,8,11,7,9,5,11,3,2,5,21,10,23,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#6f8f4a","p":[353,-535,181,142,-542,403,-142,-535,405,-344,-540,187,-351,-535,-124,-144,-545,-347,140,-535,-352,348,-546,-126,317,-259,148,137,-263,354,-134,-261,351,-329,-264,157,-317,-265,-125,-135,-257,-327,133,-264,-335,330,-260,-136,281,30,177,113,26,359,-113,24,358,-281,22,176,-293,26,-76,-121,25,-260,116,22,-250,290,23,-72],"i":[0,8,9,2,1,9,3,2,10,4,3,11,5,4,12,5,13,14,6,14,15,7,15,8,9,8,16,9,17,18,10,18,19,11,19,20,12,20,21,13,21,22,15,14,22,8,15,23,0,1,3,22,19,23,0,9,1,2,9,10,3,10,11,4,11,12,5,12,13,5,14,6,6,15,7,7,8,0,9,16,17,9,18,10,10,19,11,11,20,12,12,21,13,13,22,14,15,22,23,8,23,16,0,3,7,7,5,6,4,5,7,4,7,3,3,1,2,23,19,16,16,18,17,19,18,16,19,22,20,20,22,21]},{"c":"#5d7a3c","p":[362,-516,191,149,-518,423,-149,-520,421,-366,-519,192,-362,-516,-131,-154,-517,-365,154,-518,-363,362,-516,-133,358,-416,191,146,-421,411,-147,-416,415,-354,-417,190,-356,-421,-129,-146,-416,-355,148,-421,-355,354,-418,-128],"i":[0,8,9,2,1,9,2,10,11,3,11,12,5,4,12,6,5,13,7,6,14,0,7,15,2,0,1,13,15,14,0,9,1,2,9,10,2,11,3,3,12,4,5,12,13,6,13,14,7,14,15,0,15,8,0,4,7,7,4,6,6,4,5,4,0,3,3,0,2,15,11,8,8,11,9,9,11,10,11,15,12,12,15,13]}]}};

;
/* 由 tools/model/gen_mons.py 以 Blender（bpy）產生，請勿手改。格式同 HERO_MODEL，數值乘以 100。 */
const MON_MODEL = {"skel":{"hips":{"at":[0,11.5,0],"m":[{"c":"#d9cdb8","p":[387,-87,95,159,-87,219,-160,-93,223,-392,-91,93,-391,-89,-88,-158,-87,-225,157,-90,-219,387,-87,-91,331,110,77,136,107,191,-141,108,192,-334,108,82,-333,109,-83,-142,106,-196,140,108,-194,332,107,-77],"i":[1,0,8,2,1,9,2,10,11,4,3,11,5,4,12,5,13,14,6,14,15,0,7,15,2,6,1,13,9,14,1,8,9,2,9,10,2,11,3,4,11,12,5,12,13,5,14,6,6,15,7,0,15,8,0,1,7,7,1,6,6,2,5,5,2,4,4,2,3,15,14,8,8,14,9,9,13,10,10,12,11,13,12,10]}]},"torso":{"at":[0,12.5,0],"m":[{"c":"#d9cdb8","p":[250,-10,53,60,-10,175,-190,-11,125,-246,-9,-52,-58,-13,-176,189,-9,-125,209,798,45,51,801,158,-163,799,107,-210,800,-49,-50,803,-153,162,803,-110],"i":[1,0,6,1,7,8,3,2,8,4,3,9,5,4,10,5,11,6,2,4,1,10,7,11,1,6,7,1,8,2,3,8,9,4,9,10,5,10,11,5,6,0,0,1,5,5,1,4,4,2,3,11,7,6,7,10,8,8,10,9]},{"c":"#fbf6ea","p":[-300,160,125,-300,170,115,-310,170,125,-300,210,115,-300,220,125,-310,210,125,-300,160,175,-310,170,175,-300,170,185,-300,220,175,-300,210,185,-310,210,175,300,160,125,310,170,125,300,170,115,300,220,125,300,210,115,310,210,125,300,160,175,300,170,185,310,170,175,300,220,175,310,210,175,300,210,185],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#d9cdb8","p":[-270,165,-160,-270,175,-170,-280,175,-160,-270,205,-170,-270,215,-160,-280,205,-160,-270,165,-120,-280,175,-120,-270,175,-110,-270,215,-120,-270,205,-110,-280,205,-120,270,165,-160,280,175,-160,270,175,-170,270,215,-160,270,205,-170,280,205,-160,270,165,-120,270,175,-110,280,175,-120,270,215,-120,280,205,-120,270,205,-110],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#fbf6ea","p":[-272,360,125,-272,370,115,-282,370,125,-272,410,115,-272,420,125,-282,410,125,-272,360,175,-282,370,175,-272,370,185,-272,420,175,-272,410,185,-282,410,175,272,360,125,282,370,125,272,370,115,272,420,125,272,410,115,282,410,125,272,360,175,272,370,185,282,370,175,272,420,175,282,410,175,272,410,185],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#d9cdb8","p":[-242,365,-160,-242,375,-170,-252,375,-160,-242,405,-170,-242,415,-160,-252,405,-160,-242,365,-120,-252,375,-120,-242,375,-110,-242,415,-120,-242,405,-110,-252,405,-120,242,365,-160,252,375,-160,242,375,-170,242,415,-160,242,405,-170,252,405,-160,242,365,-120,242,375,-110,252,375,-120,242,415,-120,252,405,-120,242,405,-110],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#fbf6ea","p":[-244,560,125,-244,570,115,-254,570,125,-244,610,115,-244,620,125,-254,610,125,-244,560,175,-254,570,175,-244,570,185,-244,620,175,-244,610,185,-254,610,175,244,560,125,254,570,125,244,570,115,244,620,125,244,610,115,254,610,125,244,560,175,244,570,185,254,570,175,244,620,175,254,610,175,244,610,185],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#d9cdb8","p":[-214,565,-160,-214,575,-170,-224,575,-160,-214,605,-170,-214,615,-160,-224,605,-160,-214,565,-120,-224,575,-120,-214,575,-110,-214,615,-120,-214,605,-110,-224,605,-120,214,565,-160,224,575,-160,214,575,-170,214,615,-160,214,605,-170,224,605,-160,214,565,-120,214,575,-110,224,575,-120,214,615,-120,224,605,-120,214,605,-110],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff8fb8","p":[469,25,121,194,30,295,-198,25,296,-474,29,118,-476,28,-127,-198,30,-295,198,32,-294,475,28,-124,448,402,111,185,403,273,-180,402,278,-440,400,111,-443,403,-111,-180,404,-276,186,397,-275,439,399,-118,513,811,130,216,812,306,-214,813,300,-515,810,126,-516,812,-131,-217,808,-309,217,812,-308,522,809,-126],"i":[1,0,8,1,9,10,2,10,11,3,11,12,5,4,12,6,5,13,6,14,15,7,15,8,8,16,17,10,9,17,11,10,18,12,11,19,12,20,21,13,21,22,15,14,22,8,15,23,1,6,0,21,18,22,1,8,9,1,10,2,2,11,3,3,12,4,5,12,13,6,13,14,6,15,7,7,8,0,8,17,9,10,17,18,11,18,19,12,19,20,12,21,13,13,22,14,15,22,23,8,23,16,0,6,7,6,1,5,5,3,4,2,3,5,2,5,1,23,22,16,16,22,17,17,22,18,18,20,19,21,20,18]},{"c":"#ff6aa8","p":[499,712,124,208,707,297,-209,712,294,-500,706,123,-502,711,-124,-205,708,-294,207,710,-296,496,708,-119,392,846,111,160,854,261,-161,848,257,-384,851,105,-391,854,-107,-164,850,-256,164,848,-257,391,846,-107],"i":[1,0,8,1,9,10,2,10,11,4,3,11,5,4,12,5,13,14,6,14,15,7,15,8,2,5,1,14,9,15,1,8,9,1,10,2,2,11,3,4,11,12,5,12,13,5,14,6,6,15,7,7,8,0,0,1,7,7,1,6,6,1,5,5,3,4,2,3,5,15,9,8,9,14,10,10,13,11,11,13,12,13,10,14]},{"c":"#ffffff","p":[-17,20,293,-17,28,285,-25,28,293,-17,552,285,-17,560,293,-25,552,293,-17,20,327,-25,28,327,-17,28,335,-17,560,327,-17,552,335,-25,552,327,17,20,293,25,28,293,17,28,285,17,560,293,17,552,285,25,552,293,17,20,327,17,28,335,25,28,327,17,560,327,25,552,327,17,552,335],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#7ef0ff","p":[-259,360,281,-259,366,275,-265,366,281,-259,654,275,-259,660,281,-265,654,281,-259,360,319,-265,366,319,-259,366,325,-259,660,319,-259,654,325,-265,654,319,-221,360,281,-215,366,281,-221,366,275,-221,660,281,-221,654,275,-215,654,281,-221,360,319,-221,366,325,-215,366,319,-221,660,319,-215,654,319,-221,654,325],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#7ef0ff","p":[221,360,281,221,366,275,215,366,281,221,654,275,221,660,281,215,654,281,221,360,319,215,366,319,221,366,325,221,660,319,221,654,325,215,654,319,259,360,281,265,366,281,259,366,275,259,660,281,259,654,275,265,654,281,259,360,319,259,366,325,265,366,319,259,660,319,265,654,319,259,654,325],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#d9cdb8","p":[90,850,0,45,850,78,-45,850,78,-90,850,0,-45,850,-78,45,850,-78,80,1150,0,40,1150,69,-40,1150,69,-80,1150,0,-40,1150,-69,40,1150,-69],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,2,0,1,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,2,5,5,2,4,4,2,3,11,7,6,7,9,8,9,11,10]}]},"head":{"at":[0,24.5,0],"m":[{"c":"#fbf6ea","p":[-2,-33,-3,268,177,-188,-100,173,-299,-333,175,-2,-101,173,302,267,176,187,104,506,-300,-270,504,-185,-267,507,186,100,504,301,329,506,2,-1,713,-1,-60,27,-179,158,23,-107,97,148,-285,317,144,-3,155,28,108,-194,24,3,-252,144,-178,-58,23,180,-254,144,178,96,144,285,350,341,-109,350,339,107,1,339,-357,216,340,-286,-355,339,-112,-217,338,-287,-219,339,289,-353,343,109,216,339,288,-1,343,357,254,536,-179,-99,537,-290,-315,534,2,-95,532,287,252,535,178,63,655,-180,194,653,0,-159,657,-110,-160,657,110,63,653,176],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#d9cdb8","p":[-145,-25,25,-145,0,0,-170,0,25,-145,120,0,-145,145,25,-170,120,25,-145,-25,235,-170,0,235,-145,0,260,-145,145,235,-145,120,260,-170,120,235,145,-25,25,170,0,25,145,0,0,145,145,25,145,120,0,170,120,25,145,-25,235,145,0,260,170,0,235,145,145,235,170,120,235,145,120,260],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[-117,30,240,-117,110,240,-117,30,270,-117,110,270,-73,30,240,-73,110,240,-73,30,270,-73,110,270],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,3,7,5,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,3,5,1]},{"c":"#2b2552","p":[-22,30,240,-22,110,240,-22,30,270,-22,110,270,22,30,240,22,110,240,22,30,270,22,110,270],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,3,7,5,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,3,5,1]},{"c":"#2b2552","p":[73,30,240,73,110,240,73,30,270,73,110,270,117,30,240,117,110,240,117,30,270,117,110,270],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,3,7,5,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,3,5,1]},{"c":"#2b2552","p":[-261,275,313,-263,295,293,-281,295,315,-263,465,293,-261,485,313,-281,465,315,-258,275,342,-278,295,344,-256,295,362,-258,485,342,-256,465,362,-278,465,344,-112,275,298,-92,295,296,-114,295,278,-112,485,298,-114,465,278,-92,465,296,-109,275,327,-107,295,347,-89,295,325,-109,485,327,-89,465,325,-107,465,347],"i":[8,11,7,3,2,5,0,7,2,9,23,21,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,9,10,23,20,22,23,12,13,20,15,21,22,14,16,17,12,0,1,15,16,3,18,6,0,5,2,7,16,14,1,21,15,4,10,8,19,22,20,13,20,23,19,12,20,18,15,22,17,14,17,13,12,1,14,15,3,4,18,0,12,5,7,11,16,1,3,21,4,9,10,19,23,22,13,17]},{"c":"#2b2552","p":[112,275,298,114,295,278,92,295,296,114,465,278,112,485,298,92,465,296,109,275,327,89,295,325,107,295,347,109,485,327,107,465,347,89,465,325,261,275,313,281,295,315,263,295,293,261,485,313,263,465,293,281,465,315,258,275,342,256,295,362,278,295,344,258,485,342,278,465,344,256,465,362],"i":[8,11,7,3,2,5,0,7,2,21,10,23,18,8,6,4,11,9,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,4,5,11,8,10,11,18,19,8,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,0,1,14,4,15,16,6,0,12,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,0,14,12,4,16,3,6,12,18,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[-35,190,300,-35,290,300,-35,190,360,-35,290,360,35,190,300,35,290,300,35,190,360,35,290,360],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,3,7,5,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,3,5,1]},{"c":"#2b2552","p":[4,403,-16,282,412,-224,-106,415,-355,-356,410,-18,-110,415,319,283,412,185,109,586,-357,-288,592,-226,-289,591,188,105,586,319,354,590,-20,-2,786,-21,-65,405,-216,168,406,-146,104,413,-342,338,409,-20,168,402,99,-208,405,-23,-272,412,-221,-68,408,179,-272,411,174,103,408,303,379,432,-138,378,434,100,0,433,-411,229,433,-337,-379,432,-143,-235,428,-336,-230,430,297,-372,428,100,232,426,298,-3,433,372,273,614,-214,-102,617,-343,-335,620,-21,-103,620,300,269,618,181,63,731,-215,212,731,-19,-166,730,-143,-166,735,98,62,736,179],"i":[0,12,13,1,15,13,0,17,12,0,19,17,0,16,19,1,22,15,2,24,14,3,26,18,4,28,20,5,30,21,1,25,22,2,27,24,3,29,26,4,31,28,5,23,30,6,37,32,7,39,33,8,40,34,9,41,35,10,38,36,38,11,41,38,41,36,36,41,9,41,11,40,41,40,35,35,40,8,40,11,39,40,39,34,34,39,7,39,11,37,39,37,33,33,37,6,37,11,38,37,38,32,32,38,10,23,10,36,23,36,30,30,36,9,31,9,35,31,35,28,28,35,8,29,8,34,29,34,26,26,34,7,27,7,33,27,33,24,24,33,6,25,6,32,25,32,22,22,32,10,30,9,31,30,31,21,21,31,4,28,8,29,28,29,20,20,29,3,26,7,27,26,27,18,18,27,2,24,6,25,24,25,14,14,25,1,22,10,23,22,23,15,15,23,5,16,5,21,16,21,19,19,21,4,19,4,20,19,20,17,17,20,3,17,3,18,17,18,12,12,18,2,15,5,16,15,16,13,13,16,0,12,2,14,12,14,13,13,14,1]},{"c":"#2b2552","p":[-165,425,-505,-165,440,-520,-180,440,-505,-165,460,-520,-165,475,-505,-180,460,-505,-165,425,-355,-180,440,-355,-165,440,-340,-165,475,-355,-165,460,-340,-180,460,-355,165,425,-505,180,440,-505,165,440,-520,165,475,-505,165,460,-520,180,460,-505,165,425,-355,165,440,-340,180,440,-355,165,475,-355,180,460,-355,165,460,-340],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff8fb8","p":[-35,770,-35,-35,780,-45,-45,780,-35,-35,820,-45,-35,830,-35,-45,820,-35,-35,770,35,-45,780,35,-35,780,45,-35,830,35,-35,820,45,-45,820,35,35,770,-35,45,780,-35,35,780,-45,35,830,-35,35,820,-45,45,820,-35,35,770,35,35,780,45,45,780,35,35,830,35,45,820,35,35,820,45],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"armL":{"at":[-3.8,20.5,0],"m":[{"c":"#ff8fb8","p":[-3,-140,0,93,-69,-70,-37,-71,-109,-115,-70,2,-33,-66,112,93,-69,68,39,47,-110,-94,45,-70,-96,47,70,39,47,109,116,47,-2,3,122,2],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#fbf6ea","p":[38,-27,23,-14,-33,70,-80,-28,47,-96,-33,-22,-43,-30,-70,20,-29,-49,-20,-509,46,-68,-511,89,-126,-512,69,-135,-512,12,-91,-510,-26,-38,-512,-13],"i":[6,0,1,7,1,2,2,3,9,3,4,10,4,5,11,5,0,6,2,5,3,9,7,8,6,1,7,7,2,8,2,9,8,3,10,9,4,11,10,5,6,11,4,3,5,5,2,0,0,2,1,7,11,6,11,7,10,10,7,9]},{"c":"#fbf6ea","p":[-80,-610,30,-22,-566,-12,-102,-566,-38,-152,-566,30,-102,-566,98,-22,-566,72,-58,-494,-38,-138,-494,-12,-138,-494,72,-58,-494,98,-8,-494,30,-80,-450,30],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"foreL":{"at":[-4.6,15.2,0.3],"m":[{"c":"#fbf6ea","p":[42,-22,44,1,-18,84,-49,-21,67,-62,-21,13,-25,-17,-25,28,-19,-7,30,-381,103,-10,-380,138,-54,-378,126,-71,-379,72,-29,-379,41,14,-377,55],"i":[6,0,1,1,2,8,2,3,9,3,4,10,10,4,5,11,5,0,2,5,3,8,11,7,6,1,7,1,8,7,2,9,8,3,10,9,10,5,11,11,0,6,4,3,5,5,2,0,0,2,1,7,11,6,11,8,10,10,8,9]},{"c":"#fbf6ea","p":[-75,-540,45,-75,-520,25,-95,-520,45,-75,-400,25,-75,-380,45,-95,-400,45,-75,-540,175,-95,-520,175,-75,-520,195,-75,-380,175,-75,-400,195,-95,-400,175,35,-540,45,55,-520,45,35,-520,25,35,-380,45,35,-400,25,55,-400,45,35,-540,175,35,-520,195,55,-520,175,35,-380,175,55,-400,175,35,-400,195],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"armR":{"at":[3.8,20.5,0],"m":[{"c":"#ff8fb8","p":[2,-137,2,93,-70,-71,-36,-65,-109,-115,-67,1,-36,-71,111,96,-66,67,37,46,-112,-96,49,-68,-96,48,66,36,46,110,117,47,-3,0,121,3],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#fbf6ea","p":[99,-32,21,44,-29,71,-23,-30,45,-36,-31,-21,15,-32,-66,79,-30,-49,138,-508,46,95,-512,89,39,-508,70,21,-508,11,65,-510,-26,122,-510,-12],"i":[0,1,7,1,2,8,2,3,9,9,3,4,10,4,5,11,5,0,2,4,3,10,8,9,0,7,6,1,8,7,2,9,8,9,4,10,10,5,11,11,0,6,4,2,5,5,2,0,0,2,1,7,8,6,6,10,11,8,10,6]},{"c":"#fbf6ea","p":[80,-610,30,138,-566,-12,58,-566,-38,8,-566,30,58,-566,98,138,-566,72,102,-494,-38,22,-494,-12,22,-494,72,102,-494,98,152,-494,30,80,-450,30],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"foreR":{"at":[4.6,15.2,0.3],"m":[{"c":"#fbf6ea","p":[64,-22,49,22,-17,82,-32,-23,65,-43,-18,16,-1,-17,-21,49,-17,-9,69,-379,102,30,-381,138,-19,-381,121,-29,-382,78,12,-381,39,59,-380,58],"i":[6,0,1,1,2,8,2,3,9,3,4,10,10,4,5,11,5,0,2,4,3,11,7,9,6,1,7,1,8,7,2,9,8,3,10,9,10,5,11,11,0,6,4,1,5,5,1,0,1,4,2,7,11,6,11,9,10,9,7,8]},{"c":"#fbf6ea","p":[-35,-540,45,-35,-520,25,-55,-520,45,-35,-400,25,-35,-380,45,-55,-400,45,-35,-540,175,-55,-520,175,-35,-520,195,-35,-380,175,-35,-400,195,-55,-400,175,75,-540,45,95,-520,45,75,-520,25,75,-380,45,75,-400,25,95,-400,45,75,-540,175,75,-520,195,95,-520,175,75,-380,175,95,-400,175,75,-400,195],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#9be0b0","p":[56,-501,162,31,-501,187,-7,-501,174,-16,-503,140,8,-497,108,48,-498,124,72,83,345,33,81,382,-21,77,366,-31,81,316,10,78,274,60,83,295,96,780,552,38,778,611,-37,782,586,-55,779,507,1,782,451,76,782,474],"i":[1,0,6,1,7,8,2,8,9,3,9,10,5,4,10,0,5,11,7,6,12,7,13,14,8,14,15,9,15,16,11,10,16,6,11,17,2,0,1,15,17,16,1,6,7,1,8,2,2,9,3,3,10,4,5,10,11,0,11,6,7,12,13,7,14,8,8,15,9,9,16,10,11,16,17,6,17,12,0,2,5,5,3,4,2,3,5,17,15,12,12,14,13,15,14,12]},{"c":"#ffffff","p":[105,760,530,62,760,604,-22,760,604,-65,760,530,-22,760,456,62,760,456,80,900,560,50,900,612,-10,900,612,-40,900,560,-10,900,508,50,900,508],"i":[1,0,6,2,1,7,2,8,9,3,9,10,5,4,10,0,5,11,4,0,2,10,7,11,1,6,7,2,7,8,2,9,3,3,10,4,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,7,10]}]},"legL":{"at":[-2.1,10.8,0],"m":[{"c":"#fbf6ea","p":[64,-503,20,18,-502,69,-53,-501,47,-69,-497,-19,-16,-502,-68,49,-501,-49,78,-3,22,20,-2,78,-58,0,52,-74,1,-21,-19,-2,-79,60,2,-54],"i":[1,0,6,2,1,7,3,2,8,3,9,10,5,4,10,5,11,6,4,0,2,9,11,10,1,6,7,2,7,8,3,8,9,3,10,4,5,10,11,5,6,0,0,4,5,4,2,3,2,0,1,11,9,6,6,8,7,9,8,6]}]},"shinL":{"at":[-2.1,6.0,0],"m":[{"c":"#f4f6fb","p":[91,-472,-283,35,-436,-280,-42,-439,-280,-93,-476,-283,-93,-530,-277,-40,-561,-279,39,-561,-281,89,-528,-277,136,-364,-203,60,-281,-203,-56,-281,-201,-142,-365,-204,-137,-479,-201,-57,-560,-200,60,-561,-198,139,-474,-200,150,-339,98,58,-259,99,-64,-265,100,-146,-342,102,-145,-456,99,-60,-539,101,64,-539,104,149,-456,96,121,-433,344,48,-386,339,-54,-390,340,-123,-433,336,-123,-505,338,-47,-554,337,50,-551,343,123,-505,338],"i":[8,0,1,1,2,10,2,3,11,3,4,12,4,5,13,13,5,6,14,6,7,15,7,0,16,8,9,17,9,10,10,11,19,11,12,20,12,13,21,21,13,14,22,14,15,23,15,8,16,17,25,25,17,18,26,18,19,27,19,20,28,20,21,29,21,22,22,23,31,23,16,24,3,5,4,28,26,27,8,1,9,1,10,9,2,11,10,3,12,11,4,13,12,13,6,14,14,7,15,15,0,8,16,9,17,17,10,18,10,19,18,11,20,19,12,21,20,21,14,22,22,15,23,23,8,16,16,25,24,25,18,26,26,19,27,27,20,28,28,21,29,29,22,30,22,31,30,23,24,31,6,1,7,7,1,0,1,5,2,6,5,1,2,5,3,25,30,24,24,30,31,30,26,29,25,26,30,29,26,28]},{"c":"#2b2552","p":[-148,-600,-318,-148,-578,-340,-170,-578,-318,-148,-522,-340,-148,-500,-318,-170,-522,-318,-148,-600,378,-170,-578,378,-148,-578,400,-148,-500,378,-148,-522,400,-170,-522,378,148,-600,-318,170,-578,-318,148,-578,-340,148,-500,-318,148,-522,-340,170,-522,-318,148,-600,378,148,-578,400,170,-578,378,148,-500,378,170,-522,378,148,-522,400],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#7ef0ff","p":[-122,-530,208,-122,-522,200,-130,-522,208,-122,-498,200,-122,-490,208,-130,-498,208,-122,-530,312,-130,-522,312,-122,-522,320,-122,-490,312,-122,-498,320,-130,-498,312,122,-530,208,130,-522,208,122,-522,200,122,-490,208,122,-498,200,130,-498,208,122,-530,312,122,-522,320,130,-522,312,122,-490,312,130,-498,312,122,-498,320],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#fbf6ea","p":[85,-397,29,18,-402,86,-68,-399,61,-87,-400,-30,-21,-397,-87,67,-399,-61,68,22,18,17,22,71,-52,18,47,-66,17,-23,-17,19,-70,49,18,-51],"i":[0,6,7,1,7,8,2,8,9,4,3,9,4,10,11,0,5,11,2,4,1,9,11,10,0,7,1,1,8,2,2,9,3,4,9,10,4,11,5,0,11,6,0,1,5,5,1,4,4,2,3,11,8,6,6,8,7,8,11,9]},{"c":"#fbf6ea","p":[0,-100,40,72,-45,-13,-28,-45,-45,-89,-45,40,-28,-45,125,72,-45,93,28,45,-45,-72,45,-13,-72,45,93,28,45,125,89,45,40,0,100,40],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"legR":{"at":[2.1,10.8,0],"m":[{"c":"#fbf6ea","p":[65,-499,22,13,-497,71,-53,-501,50,-67,-498,-18,-18,-500,-69,50,-501,-49,78,0,21,17,-1,75,-58,-3,54,-74,3,-22,-20,-3,-79,60,-2,-56],"i":[0,6,7,1,7,8,3,2,8,3,9,10,4,10,11,0,5,11,0,1,3,9,11,10,0,7,1,1,8,2,3,8,9,3,10,4,4,11,5,0,11,6,0,4,5,4,0,3,3,1,2,11,9,6,6,9,7,7,9,8]}]},"shinR":{"at":[2.1,6.0,0],"m":[{"c":"#f4f6fb","p":[91,-471,-282,42,-433,-277,-36,-438,-278,-92,-477,-281,-96,-529,-282,-37,-565,-276,42,-561,-276,91,-529,-282,136,-362,-202,61,-282,-197,-56,-285,-198,-137,-360,-197,-137,-480,-200,-55,-556,-201,61,-559,-201,142,-480,-198,145,-339,97,64,-259,97,-57,-263,101,-147,-346,97,-144,-457,101,-58,-536,99,64,-541,98,146,-457,98,118,-439,339,53,-387,339,-49,-387,343,-117,-435,340,-120,-505,336,-52,-551,336,47,-551,340,121,-504,339],"i":[8,0,1,1,2,10,2,3,11,3,4,12,4,5,13,13,5,6,14,6,7,15,7,0,16,8,9,17,9,10,10,11,19,11,12,20,12,13,21,13,14,22,22,14,15,23,15,8,16,17,25,25,17,18,26,18,19,27,19,20,28,20,21,21,22,30,22,23,31,23,16,24,5,2,6,27,29,26,8,1,9,1,10,9,2,11,10,3,12,11,4,13,12,13,6,14,14,7,15,15,0,8,16,9,17,17,10,18,10,19,18,11,20,19,12,21,20,13,22,21,22,15,23,23,8,16,16,25,24,25,18,26,26,19,27,27,20,28,28,21,29,21,30,29,22,31,30,23,24,31,6,0,7,0,6,1,1,6,2,2,5,3,3,5,4,25,30,24,24,30,31,30,26,29,25,26,30,29,27,28]},{"c":"#2b2552","p":[-148,-600,-318,-148,-578,-340,-170,-578,-318,-148,-522,-340,-148,-500,-318,-170,-522,-318,-148,-600,378,-170,-578,378,-148,-578,400,-148,-500,378,-148,-522,400,-170,-522,378,148,-600,-318,170,-578,-318,148,-578,-340,148,-500,-318,148,-522,-340,170,-522,-318,148,-600,378,148,-578,400,170,-578,378,148,-500,378,170,-522,378,148,-522,400],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#7ef0ff","p":[-122,-530,208,-122,-522,200,-130,-522,208,-122,-498,200,-122,-490,208,-130,-498,208,-122,-530,312,-130,-522,312,-122,-522,320,-122,-490,312,-122,-498,320,-130,-498,312,122,-530,208,130,-522,208,122,-522,200,122,-490,208,122,-498,200,130,-498,208,122,-530,312,122,-522,320,130,-522,312,122,-490,312,130,-498,312,122,-498,320],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#fbf6ea","p":[86,-402,28,20,-401,86,-64,-400,61,-84,-400,-24,-19,-400,-88,67,-400,-61,67,21,23,18,19,71,-51,22,50,-69,20,-23,-18,17,-70,52,22,-46],"i":[0,6,7,2,1,7,2,8,9,3,9,10,5,4,10,5,11,6,3,1,2,9,11,10,0,7,1,2,7,8,2,9,3,3,10,4,5,10,11,5,6,0,0,1,5,5,3,4,1,3,5,11,8,6,6,8,7,8,11,9]},{"c":"#fbf6ea","p":[0,-100,40,72,-45,-13,-28,-45,-45,-89,-45,40,-28,-45,125,72,-45,93,28,45,-45,-72,45,-13,-72,45,93,28,45,125,89,45,40,0,100,40],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]}},"brute":{"hips":{"at":[0,13.4,0],"m":[{"c":"#3a3560","p":[573,-60,130,237,-60,314,-237,-60,314,-573,-60,130,-573,-60,-130,-237,-60,-314,237,-60,-314,573,-60,-130,591,60,138,245,60,333,-245,60,333,-591,60,138,-591,60,-138,-245,60,-333,245,60,-333,591,60,-138],"i":[0,8,9,2,1,9,3,2,10,4,3,11,4,12,13,6,5,13,7,6,14,0,7,15,1,6,0,14,9,15,0,9,1,2,9,10,3,10,11,4,11,12,4,13,5,6,13,14,7,14,15,0,15,8,0,6,7,6,2,5,5,2,4,4,2,3,2,6,1,15,9,8,9,13,10,10,13,11,11,13,12,13,9,14]}]},"torso":{"at":[0,14.0,0],"m":[{"c":"#ff9a3c","p":[530,6,135,226,5,309,-220,-7,307,-530,-3,132,-541,-4,-135,-218,-5,-316,228,-5,-310,541,4,-129,631,404,159,265,403,365,-260,399,373,-623,397,154,-632,400,-158,-266,395,-370,260,401,-370,633,405,-160,739,902,169,311,899,405,-300,902,401,-737,902,162,-737,898,-162,-299,900,-406,312,903,-413,741,905,-171,589,1160,130,249,1159,310,-246,1165,315,-594,1159,135,-591,1160,-133,-238,1164,-312,243,1157,-317,592,1164,-128],"i":[0,8,9,1,9,10,3,2,10,4,3,11,4,12,13,5,13,14,7,6,14,7,15,8,8,16,17,9,17,18,11,10,18,11,19,20,12,20,21,14,13,21,15,14,22,15,23,16,17,16,24,18,17,25,18,26,27,19,27,28,21,20,28,21,29,30,22,30,31,23,31,24,1,6,0,30,25,31,0,9,1,1,10,2,3,10,11,4,11,12,4,13,5,5,14,6,7,14,15,7,8,0,8,17,9,9,18,10,11,18,19,11,20,12,12,21,13,14,21,22,15,22,23,15,16,8,17,24,25,18,25,26,18,27,19,19,28,20,21,28,29,21,30,22,22,31,23,23,24,16,0,6,7,6,2,5,5,3,4,2,3,5,2,6,1,31,25,24,25,29,26,26,28,27,29,28,26,29,25,30]},{"c":"#ffffff","p":[640,352,158,266,349,377,-268,352,378,-642,351,158,-640,350,-156,-265,350,-378,267,351,-380,642,348,-156,659,491,159,275,489,389,-272,490,389,-662,490,160,-661,491,-161,-272,490,-390,272,491,-390,661,490,-159],"i":[0,8,9,1,9,10,3,2,10,4,3,11,4,12,13,5,13,14,7,6,14,7,15,8,2,5,1,13,10,14,0,9,1,1,10,2,3,10,11,4,11,12,4,13,5,5,14,6,7,14,15,7,8,0,0,1,7,7,1,6,6,1,5,5,2,4,4,2,3,15,14,8,8,14,9,9,14,10,10,12,11,13,12,10]},{"c":"#ffffff","p":[714,740,170,298,740,413,-297,741,410,-717,738,169,-718,738,-170,-295,741,-413,295,741,-413,715,739,-169,733,881,175,306,878,421,-304,880,421,-733,882,173,-734,878,-176,-304,878,-419,303,879,-419,736,878,-174],"i":[0,8,9,1,9,10,3,2,10,4,3,11,4,12,13,5,13,14,7,6,14,0,7,15,1,6,0,13,10,14,0,9,1,1,10,2,3,10,11,4,11,12,4,13,5,5,14,6,7,14,15,0,15,8,0,6,7,6,2,5,5,2,4,4,2,3,2,6,1,15,14,8,8,14,9,9,14,10,10,13,11,11,13,12]},{"c":"#3a3560","p":[-250,420,430,-250,440,410,-270,440,430,-250,720,410,-250,740,430,-270,720,430,-250,420,470,-270,440,470,-250,440,490,-250,740,470,-250,720,490,-270,720,470,250,420,430,270,440,430,250,440,410,250,740,430,250,720,410,270,720,430,250,420,470,250,440,490,270,440,470,250,740,470,270,720,470,250,720,490],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff6aa8","p":[-194,520,486,-194,526,480,-200,526,486,-194,634,480,-194,640,486,-200,634,486,-194,520,504,-200,526,504,-194,526,510,-194,640,504,-194,634,510,-200,634,504,-86,520,486,-80,526,486,-86,526,480,-86,640,486,-86,634,480,-80,634,486,-86,520,504,-86,526,510,-80,526,504,-86,640,504,-80,634,504,-86,634,510],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff6aa8","p":[86,520,486,86,526,480,80,526,486,86,634,480,86,640,486,80,634,486,86,520,504,80,526,504,86,526,510,86,640,504,86,634,510,80,634,504,194,520,486,200,526,486,194,526,480,194,640,486,194,634,480,200,634,486,194,520,504,194,526,510,200,526,504,194,640,504,200,634,504,194,634,510],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#3a3560","p":[180,1140,0,90,1140,156,-90,1140,156,-180,1140,0,-90,1140,-156,90,1140,-156,160,1500,0,80,1500,139,-80,1500,139,-160,1500,0,-80,1500,-139,80,1500,-139],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,2,0,1,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,2,5,5,2,4,4,2,3,11,7,6,7,9,8,9,11,10]}]},"head":{"at":[0,29.0,0],"m":[{"c":"#3a3560","p":[-330,0,-260,-330,50,-310,-380,50,-260,-330,470,-310,-330,520,-260,-380,470,-260,-330,0,260,-380,50,260,-330,50,310,-330,520,260,-330,470,310,-380,470,260,330,0,-260,380,50,-260,330,50,-310,330,520,-260,330,470,-310,380,470,-260,330,0,260,330,50,310,380,50,260,330,520,260,380,470,260,330,470,310],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#1f1b3d","p":[-300,200,305,-300,210,295,-310,210,305,-300,390,295,-300,400,305,-310,390,305,-300,200,335,-310,210,335,-300,210,345,-300,400,335,-300,390,345,-310,390,335,300,200,305,310,210,305,300,210,295,300,400,305,300,390,295,310,390,305,300,200,335,300,210,345,310,210,335,300,400,335,310,390,335,300,390,345],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff6aa8","p":[-435,140,-105,-435,155,-120,-450,155,-105,-435,365,-120,-435,380,-105,-450,365,-105,-435,140,105,-450,155,105,-435,155,120,-435,380,105,-435,365,120,-450,365,105,-385,140,-105,-370,155,-105,-385,155,-120,-385,380,-105,-385,365,-120,-370,365,-105,-385,140,105,-385,155,120,-370,155,105,-385,380,105,-370,365,105,-385,365,120],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff6aa8","p":[385,140,-105,385,155,-120,370,155,-105,385,365,-120,385,380,-105,370,365,-105,385,140,105,370,155,105,385,155,120,385,380,105,385,365,120,370,365,105,435,140,-105,450,155,-105,435,155,-120,435,380,-105,435,365,-120,450,365,-105,435,140,105,435,155,120,450,155,105,435,380,105,450,365,105,435,365,120],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ffffff","p":[370,520,133,153,520,350,-153,520,350,-370,520,133,-370,520,-173,-153,520,-390,153,520,-390,370,520,-173,333,620,118,138,620,313,-138,620,313,-333,620,118,-333,620,-158,-138,620,-353,138,620,-353,333,620,-158],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,2,0,1,11,15,13,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,4,7,7,4,6,6,4,5,4,0,3,3,0,2,15,9,8,9,11,10,11,13,12,13,15,14,15,11,9]},{"c":"#ff9a3c","p":[2,626,337,-1,1374,21,255,626,237,27,1375,8,363,624,-21,41,1376,-22,257,624,-274,28,1373,-48,-2,624,-382,-1,1373,-61,-257,627,-274,-28,1376,-48,-362,625,-19,-40,1375,-19,-256,623,233,-28,1376,8],"i":[14,10,0,5,7,3,1,0,2,0,4,2,10,13,11,3,2,4,13,14,15,9,10,11,4,6,7,11,7,9,7,8,9,7,6,8,3,11,15,4,7,5,9,8,10,11,13,15,3,4,5,10,12,13,7,11,3,1,2,3,13,12,14,14,1,15,3,15,1,14,0,1,10,14,12,6,4,0,6,0,8,8,0,10]},{"c":"#ffffff","p":[235,761,77,97,760,216,-98,760,217,-235,759,77,-235,759,-118,-98,760,-256,97,761,-256,236,760,-118,180,940,55,75,940,161,-74,941,161,-180,940,55,-179,941,-95,-76,940,-200,75,940,-199,180,941,-94],"i":[0,8,9,1,9,10,2,10,11,4,3,11,4,12,13,6,5,13,7,6,14,0,7,15,0,4,6,8,12,10,0,9,1,1,10,2,2,11,3,4,11,12,4,13,5,6,13,14,7,14,15,0,15,8,0,6,7,6,4,5,4,0,3,3,1,2,0,1,3,15,14,8,8,10,9,10,12,11,8,14,12,12,14,13]}]},"armL":{"at":[-6.6,24.6,0],"m":[{"c":"#e07a24","p":[-1,-251,1,183,-109,-135,-70,-111,-211,-224,-109,-1,-65,-111,216,179,-107,127,71,110,-209,-180,115,-127,-180,111,130,73,114,211,225,115,4,-2,248,-5],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#ff9a3c","p":[105,-16,39,11,-16,164,-154,-19,178,-267,-16,51,-229,-22,-110,-90,-16,-189,62,-15,-119,52,-518,85,-60,-523,232,-248,-520,244,-378,-517,98,-339,-515,-92,-161,-520,-180,10,-524,-105],"i":[7,0,1,8,1,2,9,2,3,3,4,11,4,5,12,5,6,13,13,6,0,2,4,3,9,11,8,7,1,8,8,2,9,9,3,10,3,11,10,4,12,11,5,13,12,13,0,7,5,4,6,6,1,0,4,1,6,1,4,2,8,12,7,7,12,13,12,8,11,11,9,10]},{"c":"#e07a24","p":[-163,-761,42,-15,-649,-66,-218,-645,-134,-340,-648,37,-213,-649,207,-17,-653,145,-108,-468,-126,-305,-472,-65,-302,-467,145,-103,-467,213,17,-473,36,-163,-364,37],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"foreL":{"at":[-8.2,19.0,0.4],"m":[{"c":"#ff9a3c","p":[226,-1,50,110,-5,210,-94,-5,208,-217,1,54,-182,2,-133,-7,-4,-231,182,-3,-142,170,-422,77,76,-416,223,-108,-417,226,-212,-425,95,-184,-415,-78,-23,-419,-162,136,-422,-93],"i":[7,0,1,8,1,2,2,3,10,3,4,11,4,5,12,5,6,13,13,6,0,2,0,3,11,7,10,7,1,8,8,2,9,2,10,9,3,11,10,4,12,11,5,13,12,13,0,7,5,4,6,6,3,0,4,3,6,0,2,1,8,9,7,7,12,13,9,10,7,12,7,11]},{"c":"#ffffff","p":[240,-80,49,112,-80,218,-101,-80,223,-237,-80,60,-195,-80,-148,-6,-80,-245,188,-80,-157,240,60,49,112,60,218,-101,60,223,-237,60,60,-195,60,-148,-6,60,-245,188,60,-157],"i":[1,0,7,2,1,8,3,2,9,4,3,10,5,4,11,6,5,12,0,6,13,5,1,3,12,8,13,1,7,8,2,8,9,3,9,10,4,10,11,5,11,12,6,12,13,0,13,7,0,1,6,6,1,5,5,3,4,3,1,2,13,8,7,8,12,9,9,12,10,10,12,11]},{"c":"#3a3560","p":[-160,-760,-60,-160,-720,-100,-200,-720,-60,-160,-480,-100,-160,-440,-60,-200,-480,-60,-160,-760,180,-200,-720,180,-160,-720,220,-160,-440,180,-160,-480,220,-200,-480,180,100,-760,-60,140,-720,-60,100,-720,-100,100,-440,-60,100,-480,-100,140,-480,-60,100,-760,180,100,-720,220,140,-720,180,100,-440,180,140,-480,180,100,-480,220],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"armR":{"at":[6.6,24.6,0],"m":[{"c":"#e07a24","p":[-2,-250,-4,178,-115,-134,-67,-110,-218,-227,-108,-5,-72,-108,217,185,-112,128,65,115,-208,-180,110,-132,-178,113,131,66,107,210,226,108,1,4,249,-2],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]},{"c":"#ff9a3c","p":[262,-16,35,165,-20,165,0,-25,178,-98,-15,41,-69,-20,-118,73,-24,-193,224,-14,-116,381,-523,79,265,-517,231,67,-526,246,-50,-524,92,-21,-520,-89,151,-515,-181,325,-524,-100],"i":[0,1,8,1,2,9,2,3,10,3,4,11,11,4,5,12,5,6,13,6,0,1,3,2,13,8,10,0,8,7,1,9,8,2,10,9,3,11,10,11,5,12,12,6,13,13,0,7,5,4,6,6,3,0,4,3,6,0,3,1,8,13,7,13,10,12,12,10,11,10,8,9]},{"c":"#e07a24","p":[157,-758,42,302,-653,-69,106,-651,-130,-21,-648,41,107,-652,211,301,-650,147,217,-468,-134,14,-468,-62,15,-467,141,215,-472,213,336,-472,43,157,-359,39],"i":[0,2,1,1,5,0,0,3,2,0,4,3,0,5,4,1,10,5,2,6,1,3,7,2,4,8,3,5,9,4,1,6,10,2,7,6,3,8,7,4,9,8,5,10,9,6,11,10,7,11,6,8,11,7,9,11,8,10,11,9]}]},"foreR":{"at":[8.2,19.0,0.4],"m":[{"c":"#ff9a3c","p":[219,-1,46,105,3,200,-91,-2,214,-220,3,55,-189,5,-134,-6,0,-230,177,6,-153,213,-425,76,108,-426,222,-67,-424,225,-180,-419,90,-139,-425,-78,20,-425,-157,169,-420,-89],"i":[7,0,1,1,2,9,2,3,10,3,4,11,11,4,5,12,5,6,13,6,0,0,5,3,11,9,10,7,1,8,1,9,8,2,10,9,3,11,10,11,5,12,12,6,13,13,0,7,5,0,6,0,3,1,1,3,2,3,5,4,8,9,7,7,12,13,9,11,7,12,7,11]},{"c":"#ffffff","p":[240,-80,49,112,-80,218,-101,-80,223,-237,-80,60,-195,-80,-148,-6,-80,-245,188,-80,-157,240,60,49,112,60,218,-101,60,223,-237,60,60,-195,60,-148,-6,60,-245,188,60,-157],"i":[1,0,7,2,1,8,3,2,9,4,3,10,5,4,11,6,5,12,0,6,13,5,1,3,13,10,8,1,7,8,2,8,9,3,9,10,4,10,11,5,11,12,6,12,13,0,13,7,0,5,6,5,3,4,3,1,2,1,5,0,13,8,7,8,10,9,10,12,11,12,10,13]},{"c":"#3a3560","p":[-100,-760,-60,-100,-720,-100,-140,-720,-60,-100,-480,-100,-100,-440,-60,-140,-480,-60,-100,-760,180,-140,-720,180,-100,-720,220,-100,-440,180,-100,-480,220,-140,-480,180,160,-760,-60,200,-720,-60,160,-720,-100,160,-440,-60,160,-480,-100,200,-480,-60,160,-760,180,160,-720,220,200,-720,180,160,-440,180,200,-480,180,160,-480,220],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#cfd6e0","p":[-10,-640,60,25,-635,13,80,-637,31,80,-643,89,25,-645,107,-10,100,140,25,104,93,80,102,111,80,98,169,25,96,187,-10,1100,200,25,1103,153,80,1102,171,80,1098,229,25,1097,247],"i":[0,5,6,2,1,6,3,2,7,4,3,8,4,9,5,6,5,10,6,11,12,7,12,13,8,13,14,5,9,14,3,0,1,12,14,13,0,6,1,2,6,7,3,7,8,4,8,9,4,5,0,6,10,11,6,12,7,7,13,8,8,14,9,5,14,10,0,3,4,3,1,2,14,11,10,11,14,12]},{"c":"#e8403d","p":[39,1680,218,39,1681,300,350,1552,220,350,1553,301,480,1241,220,480,1242,300,352,928,219,350,931,300,41,801,222,41,800,298,-269,928,222,-271,928,301,-400,1240,218,-400,1239,298,-269,1553,221,-271,1553,301],"i":[0,6,2,5,7,3,0,2,3,2,6,4,10,13,11,2,4,5,12,15,13,9,10,11,4,6,7,11,1,9,7,8,9,7,6,8,15,11,13,4,7,5,9,8,10,7,9,3,2,5,3,10,12,13,1,11,15,0,3,1,12,14,15,14,1,15,3,9,1,14,0,1,0,10,8,6,0,8,12,10,14,14,10,0]},{"c":"#ffffff","p":[-232,1175,303,-232,1183,295,-240,1183,303,-232,1297,295,-232,1305,303,-240,1297,303,-232,1175,317,-240,1183,317,-232,1183,325,-232,1305,317,-232,1297,325,-240,1297,317,312,1175,303,320,1183,303,312,1183,295,312,1305,303,312,1297,295,320,1297,303,312,1175,317,312,1183,325,320,1183,317,312,1305,317,320,1297,317,312,1297,325],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"legL":{"at":[-3.0,13.0,0],"m":[{"c":"#e07a24","p":[170,-519,72,72,-522,168,-73,-517,162,-169,-521,67,-171,-522,-71,-67,-522,-168,74,-516,-166,167,-521,-74,193,-2,83,82,-3,194,-77,3,190,-197,-3,75,-191,-5,-76,-80,3,-194,77,-2,-194,197,4,-83],"i":[0,8,9,2,1,9,2,10,11,3,11,12,5,4,12,5,13,14,7,6,14,7,15,8,2,0,1,10,8,14,0,9,1,2,9,10,2,11,3,3,12,4,5,12,13,5,14,6,7,14,15,7,8,0,0,2,7,7,2,6,6,2,5,5,3,4,2,3,5,15,14,8,8,10,9,10,12,11,12,14,13,10,14,12]}]},"shinL":{"at":[-3.0,8.0,0],"m":[{"c":"#3a3560","p":[149,-644,-358,56,-591,-365,-60,-587,-361,-144,-644,-364,-146,-723,-365,-63,-774,-364,58,-771,-359,145,-719,-359,218,-478,-256,88,-355,-264,-88,-358,-257,-224,-474,-265,-221,-643,-261,-92,-761,-256,89,-768,-256,222,-647,-261,227,-461,153,96,-340,154,-99,-337,151,-230,-459,153,-233,-629,148,-92,-741,153,91,-741,153,231,-625,152,182,-577,416,72,-507,418,-75,-507,423,-187,-575,421,-182,-668,420,-75,-734,425,80,-733,415,182,-661,422],"i":[8,0,1,9,1,2,2,3,11,3,4,12,4,5,13,13,5,6,14,6,7,15,7,0,8,9,17,17,9,10,10,11,19,11,12,20,12,13,21,21,13,14,22,14,15,23,15,8,16,17,25,25,17,18,26,18,19,27,19,20,28,20,21,21,22,30,22,23,31,23,16,24,3,5,4,26,29,25,8,1,9,9,2,10,2,11,10,3,12,11,4,13,12,13,6,14,14,7,15,15,0,8,8,17,16,17,10,18,10,19,18,11,20,19,12,21,20,21,14,22,22,15,23,23,8,16,16,25,24,25,18,26,26,19,27,27,20,28,28,21,29,21,30,29,22,31,30,23,24,31,6,1,7,7,1,0,1,5,2,6,5,1,2,5,3,25,31,24,31,25,30,30,25,29,29,26,28,28,26,27]},{"c":"#ffffff","p":[-240,-800,-400,-240,-770,-430,-270,-770,-400,-240,-710,-430,-240,-680,-400,-270,-710,-400,-240,-800,480,-270,-770,480,-240,-770,510,-240,-680,480,-240,-710,510,-270,-710,480,240,-800,-400,270,-770,-400,240,-770,-430,240,-680,-400,240,-710,-430,270,-710,-400,240,-800,480,240,-770,510,270,-770,480,240,-680,480,270,-710,480,240,-710,510],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff9a3c","p":[-190,-680,320,-190,-670,310,-200,-670,320,-190,-630,310,-190,-620,320,-200,-630,320,-190,-680,440,-200,-670,440,-190,-670,450,-190,-620,440,-190,-630,450,-200,-630,440,190,-680,320,200,-670,320,190,-670,310,190,-620,320,190,-630,310,200,-630,320,190,-680,440,190,-670,450,200,-670,440,190,-620,440,200,-630,440,190,-630,450],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#e07a24","p":[187,-496,75,75,-496,182,-75,-498,187,-180,-497,76,-183,-501,-73,-74,-502,-184,74,-504,-184,189,-505,-80,162,38,73,65,35,162,-67,42,168,-164,41,65,-168,43,-66,-65,44,-171,73,36,-162,163,35,-73],"i":[0,8,9,2,1,9,3,2,10,3,11,12,4,12,13,5,13,14,6,14,15,0,7,15,1,3,6,11,9,14,0,9,1,2,9,10,3,10,11,3,12,4,4,13,5,5,14,6,6,15,7,0,15,8,0,6,7,6,4,5,4,6,3,3,1,2,1,6,0,15,9,8,9,11,10,11,14,12,12,14,13,14,9,15]},{"c":"#ffffff","p":[199,-250,82,82,-250,199,-82,-250,199,-199,-250,82,-199,-250,-82,-82,-250,-199,82,-250,-199,199,-250,-82,199,-120,82,82,-120,199,-82,-120,199,-199,-120,82,-199,-120,-82,-82,-120,-199,82,-120,-199,199,-120,-82],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,1,4,0,14,11,15,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,0,5,5,0,4,4,2,3,2,4,1,15,9,8,9,15,10,10,15,11,11,13,12,13,11,14]}]},"legR":{"at":[3.0,13.0,0],"m":[{"c":"#e07a24","p":[166,-521,71,67,-518,164,-64,-523,167,-163,-523,68,-170,-517,-66,-68,-519,-167,66,-521,-162,168,-517,-66,194,0,78,77,-1,197,-77,-1,192,-196,-3,80,-199,-2,-78,-83,0,-196,80,2,-193,193,4,-76],"i":[1,0,8,1,9,10,3,2,10,4,3,11,4,12,13,5,13,14,7,6,14,7,15,8,1,6,0,14,12,10,1,8,9,1,10,2,3,10,11,4,11,12,4,13,5,5,14,6,7,14,15,7,8,0,0,6,7,6,3,5,5,3,4,3,1,2,6,1,3,15,10,8,8,10,9,10,12,11,15,14,10,12,14,13]}]},"shinR":{"at":[3.0,8.0,0],"m":[{"c":"#3a3560","p":[146,-640,-363,61,-586,-364,-65,-586,-357,-145,-643,-359,-149,-714,-361,-65,-777,-356,58,-768,-362,148,-714,-361,219,-475,-260,94,-355,-257,-93,-360,-262,-218,-473,-258,-225,-641,-261,-91,-764,-264,96,-766,-263,220,-641,-258,228,-458,147,94,-340,150,-97,-332,147,-229,-451,146,-235,-619,149,-93,-744,152,93,-747,151,228,-629,149,184,-572,423,77,-510,421,-80,-510,421,-182,-575,424,-184,-667,422,-79,-727,422,79,-727,422,187,-666,421],"i":[8,0,1,1,2,10,2,3,11,3,4,12,4,5,13,13,5,6,14,6,7,15,7,0,16,8,9,9,10,18,10,11,19,11,12,20,12,13,21,13,14,22,22,14,15,23,15,8,16,17,25,17,18,26,26,18,19,27,19,20,28,20,21,21,22,30,22,23,31,23,16,24,5,2,6,26,29,25,8,1,9,1,10,9,2,11,10,3,12,11,4,13,12,13,6,14,14,7,15,15,0,8,16,9,17,9,18,17,10,19,18,11,20,19,12,21,20,13,22,21,22,15,23,23,8,16,16,25,24,17,26,25,26,19,27,27,20,28,28,21,29,21,30,29,22,31,30,23,24,31,6,0,7,0,6,1,1,6,2,2,5,3,3,5,4,25,30,24,24,30,31,30,25,29,29,27,28,27,29,26]},{"c":"#ffffff","p":[-240,-800,-400,-240,-770,-430,-270,-770,-400,-240,-710,-430,-240,-680,-400,-270,-710,-400,-240,-800,480,-270,-770,480,-240,-770,510,-240,-680,480,-240,-710,510,-270,-710,480,240,-800,-400,270,-770,-400,240,-770,-430,240,-680,-400,240,-710,-430,270,-710,-400,240,-800,480,240,-770,510,270,-770,480,240,-680,480,270,-710,480,240,-710,510],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff9a3c","p":[-190,-680,320,-190,-670,310,-200,-670,320,-190,-630,310,-190,-620,320,-200,-630,320,-190,-680,440,-200,-670,440,-190,-670,450,-190,-620,440,-190,-630,450,-200,-630,440,190,-680,320,200,-670,320,190,-670,310,190,-620,320,190,-630,310,200,-630,320,190,-680,440,190,-670,450,200,-670,440,190,-620,440,200,-630,440,190,-630,450],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#e07a24","p":[183,-504,78,76,-498,188,-75,-501,182,-185,-501,78,-183,-503,-72,-75,-501,-182,76,-505,-180,185,-497,-80,171,36,69,70,42,167,-69,43,168,-166,44,68,-169,39,-67,-66,45,-170,67,38,-171,165,39,-74],"i":[1,0,8,1,9,10,3,2,10,3,11,12,5,4,12,5,13,14,7,6,14,7,15,8,6,2,4,11,15,13,1,8,9,1,10,2,3,10,11,3,12,4,5,12,13,5,14,6,7,14,15,7,8,0,0,6,7,6,4,5,4,2,3,2,0,1,0,2,6,15,9,8,9,11,10,11,13,12,13,15,14,15,11,9]},{"c":"#ffffff","p":[199,-250,82,82,-250,199,-82,-250,199,-199,-250,82,-199,-250,-82,-82,-250,-199,82,-250,-199,199,-250,-82,199,-120,82,82,-120,199,-82,-120,199,-199,-120,82,-199,-120,-82,-82,-120,-199,82,-120,-199,199,-120,-82],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,1,4,0,14,11,15,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,0,5,5,0,4,4,2,3,2,4,1,15,9,8,9,15,10,10,15,11,11,13,12,13,11,14]}]}}};

;
/* 由 tools/model/gen_weapons.py 以 Blender（bpy）產生，請勿手改。格式同 HERO_MODEL，數值乘以 100。 */
const WEAPON_MODEL = {"w0":{"at":[0,0,0],"m":[{"c":"#2b2552","p":[30,160,0,9,160,-29,-24,160,-18,-24,160,18,9,160,29,30,0,0,9,0,-29,-24,0,-18,-24,0,18,9,0,29,30,-60,0,9,-60,-29,-24,-60,-18,-24,-60,18,9,-60,29],"i":[1,0,5,2,1,6,3,2,7,4,3,8,0,4,9,6,5,10,7,6,11,8,7,12,9,8,13,5,9,14,3,0,1,11,13,12,1,5,6,2,6,7,3,7,8,4,8,9,0,9,5,6,10,11,7,11,12,8,12,13,9,13,14,5,14,10,0,3,4,3,1,2,14,13,10,10,13,11]},{"c":"#2b2552","p":[30,-60,0,9,-60,-29,-24,-60,-18,-24,-60,18,9,-60,29,29,-76,0,9,-72,-29,-24,-65,-18,-24,-65,18,9,-72,29,14,-130,0,-4,-120,-29,-33,-103,-18,-33,-103,18,-4,-120,29,-30,-174,0,-40,-156,-29,-57,-127,-18,-57,-127,18,-40,-156,29,-90,-190,0,-90,-169,-29,-90,-136,-18,-90,-136,18,-90,-169,29,-150,-174,0,-140,-156,-29,-123,-127,-18,-123,-127,18,-140,-156,29,-194,-130,0,-176,-120,-29,-147,-103,-18,-147,-103,18,-176,-120,29,-207,-56,0,-188,-66,-29,-158,-81,-18,-158,-81,18,-188,-66,29,-139,3,0,-126,-13,-29,-104,-39,-18,-104,-39,18,-126,-13,29],"i":[0,5,6,1,6,7,3,2,7,4,3,8,0,4,9,5,10,11,6,11,12,8,7,12,9,8,13,5,9,14,11,10,15,12,11,16,13,12,17,14,13,18,14,19,15,16,15,20,17,16,21,18,17,22,19,18,23,15,19,24,21,20,25,22,21,26,23,22,27,23,28,29,24,29,25,25,30,31,27,26,31,28,27,32,28,33,34,25,29,34,30,35,36,31,36,37,33,32,37,34,33,38,30,34,39,36,35,40,37,36,41,38,37,42,38,43,44,39,44,40,3,0,1,41,43,42,0,6,1,1,7,2,3,7,8,4,8,9,0,9,5,5,11,6,6,12,7,8,12,13,9,13,14,5,14,10,11,15,16,12,16,17,13,17,18,14,18,19,14,15,10,16,20,21,17,21,22,18,22,23,19,23,24,15,24,20,21,25,26,22,26,27,23,27,28,23,29,24,24,25,20,25,31,26,27,31,32,28,32,33,28,34,29,25,34,30,30,36,31,31,37,32,33,37,38,34,38,39,30,39,35,36,40,41,37,41,42,38,42,43,38,44,39,39,40,35,0,3,4,3,1,2,44,43,40,40,43,41]},{"c":"#cfd6e0","p":[-13,140,0,0,140,-13,13,140,0,0,140,13,-13,1120,0,0,1120,-13,13,1120,0,0,1120,13],"i":[1,0,4,2,1,5,3,2,6,0,3,7,2,3,0,5,4,7,1,4,5,2,5,6,3,6,7,0,7,4,2,0,1,5,7,6]},{"c":"#c1","p":[34,261,-2,22,259,25,-3,257,35,-25,258,22,-35,258,2,-26,263,-24,0,263,-36,22,259,-23,98,449,-2,73,450,69,1,450,99,-73,448,68,-99,449,0,-70,449,-71,2,448,-99,71,452,-71,116,703,-1,79,702,81,-2,697,115,-80,700,83,-113,701,-1,-81,700,-81,2,700,-112,82,701,-84,61,1002,3,41,1001,42,-3,998,60,-45,1002,40,-62,999,-2,-40,1000,-45,0,1002,-58,45,999,-44,14,1103,2,9,1098,9,-2,1101,15,-12,1100,8,-16,1103,0,-9,1101,-11,1,1102,-18,12,1102,-8],"i":[0,8,9,1,9,10,2,10,11,4,3,11,5,4,12,6,5,13,6,14,15,0,7,15,9,8,16,9,17,18,11,10,18,11,19,20,12,20,21,13,21,22,15,14,22,15,23,16,16,24,25,17,25,26,19,18,26,19,27,28,21,20,28,22,21,29,22,30,31,16,23,31,24,32,33,26,25,33,27,26,34,28,27,35,28,36,37,30,29,37,30,38,39,24,31,39,3,7,1,33,37,35,0,9,1,1,10,2,2,11,3,4,11,12,5,12,13,6,13,14,6,15,7,0,15,8,9,16,17,9,18,10,11,18,19,11,20,12,12,21,13,13,22,14,15,22,23,15,16,8,16,25,17,17,26,18,19,26,27,19,28,20,21,28,29,22,29,30,22,31,23,16,31,24,24,33,25,26,33,34,27,34,35,28,35,36,28,37,29,30,37,38,30,39,31,24,39,32,0,1,7,7,5,6,3,4,5,7,3,5,3,1,2,39,33,32,33,35,34,35,37,36,37,39,38,39,37,33]},{"c":"#ffffff","p":[89,330,32,89,950,32,86,330,42,86,950,42,99,330,36,99,950,36,95,330,45,95,950,45],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,7,5,1,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,7,1,3]},{"c":"#ffffff","p":[-32,330,89,-32,950,89,-42,330,86,-42,950,86,-36,330,99,-36,950,99,-45,330,95,-45,950,95],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,7,5,1,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,7,1,3]},{"c":"#ffffff","p":[-89,330,-32,-89,950,-32,-86,330,-42,-86,950,-42,-99,330,-36,-99,950,-36,-95,330,-45,-95,950,-45],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,7,5,1,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,7,1,3]},{"c":"#ffffff","p":[32,330,-89,32,950,-89,42,330,-86,42,950,-86,36,330,-99,36,950,-99,45,330,-95,45,950,-95],"i":[1,0,2,3,2,6,7,6,4,5,4,0,6,2,0,7,5,1,1,2,3,3,6,7,7,4,5,5,0,1,6,0,4,7,1,3]},{"c":"#cfd6e0","p":[0,1030,22,22,1030,0,0,1030,-22,-22,1030,0,0,1170,0],"i":[0,1,4,1,2,4,1,3,2,1,0,3,2,3,4,3,0,4]},{"c":"#2b2552","p":[-45,245,-45,-45,255,-55,-55,255,-45,-45,285,-55,-45,295,-45,-55,285,-45,-45,245,45,-55,255,45,-45,255,55,-45,295,45,-45,285,55,-55,285,45,45,245,-45,55,255,-45,45,255,-55,45,295,-45,45,285,-55,55,285,-45,45,245,45,45,255,55,55,255,45,45,295,45,55,285,45,45,285,55],"i":[9,5,11,0,7,2,21,10,23,6,19,8,8,11,7,3,2,5,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"w1":{"at":[0,0,0],"m":[{"c":"#2b2552","p":[55,-190,0,34,-190,43,-12,-190,54,-50,-190,24,-50,-190,-24,-12,-190,-54,34,-190,-43,55,-150,0,34,-150,43,-12,-150,54,-50,-150,24,-50,-150,-24,-12,-150,-54,34,-150,-43],"i":[1,0,7,2,1,8,3,2,9,4,3,10,5,4,11,6,5,12,0,6,13,5,1,3,8,12,10,1,7,8,2,8,9,3,9,10,4,10,11,5,11,12,6,12,13,0,13,7,0,1,6,6,1,5,5,3,4,3,1,2,13,8,7,8,10,9,10,12,11,12,8,13]},{"c":"#2b2552","p":[38,-150,0,24,-150,30,-8,-150,37,-34,-150,16,-34,-150,-16,-8,-150,-37,24,-150,-30,40,160,0,25,160,31,-9,160,39,-36,160,17,-36,160,-17,-9,160,-39,25,160,-31],"i":[1,0,7,2,1,8,2,9,10,4,3,10,5,4,11,6,5,12,0,6,13,3,1,2,10,12,11,1,7,8,2,8,9,2,10,3,4,10,11,5,11,12,6,12,13,0,13,7,0,1,6,6,1,5,5,1,4,4,1,3,13,12,7,7,12,8,8,12,9,9,12,10]},{"c":"#ff6aa8","p":[43,-101,0,27,-101,34,-10,-101,42,-39,-101,19,-39,-101,-19,-10,-101,-42,27,-101,-34,43,-79,0,27,-79,34,-10,-79,42,-39,-79,19,-39,-79,-19,-10,-79,-42,27,-79,-34],"i":[1,0,7,2,1,8,3,2,9,4,3,10,5,4,11,6,5,12,0,6,13,3,1,2,8,12,10,1,7,8,2,8,9,3,9,10,4,10,11,5,11,12,6,12,13,0,13,7,0,1,6,6,1,5,5,1,4,4,1,3,13,8,7,8,10,9,10,12,11,12,8,13]},{"c":"#ff6aa8","p":[43,-21,0,27,-21,34,-10,-21,42,-39,-21,19,-39,-21,-19,-10,-21,-42,27,-21,-34,43,1,0,27,1,34,-10,1,42,-39,1,19,-39,1,-19,-10,1,-42,27,1,-34],"i":[1,0,7,2,1,8,3,2,9,4,3,10,5,4,11,6,5,12,0,6,13,3,1,2,8,12,10,1,7,8,2,8,9,3,9,10,4,10,11,5,11,12,6,12,13,0,13,7,0,1,6,6,1,5,5,1,4,4,1,3,13,8,7,8,10,9,10,12,11,12,8,13]},{"c":"#ff6aa8","p":[43,59,0,27,59,34,-10,59,42,-39,59,19,-39,59,-19,-10,59,-42,27,59,-34,43,81,0,27,81,34,-10,81,42,-39,81,19,-39,81,-19,-10,81,-42,27,81,-34],"i":[1,0,7,2,1,8,3,2,9,4,3,10,5,4,11,6,5,12,0,6,13,3,1,2,8,12,10,1,7,8,2,8,9,3,9,10,4,10,11,5,11,12,6,12,13,0,13,7,0,1,6,6,1,5,5,1,4,4,1,3,13,8,7,8,10,9,10,12,11,12,8,13]},{"c":"#c0","p":[41,158,-1,31,157,27,-2,159,40,-32,158,27,-44,157,-1,-27,158,-29,-1,159,-43,27,163,-28,70,448,0,47,449,49,2,447,68,-47,448,50,-70,450,-3,-47,451,-47,-1,448,-71,51,452,-49,99,822,-2,74,822,73,2,818,101,-71,817,70,-103,819,-1,-70,820,-68,3,823,-97,70,818,-72,103,1051,-2,77,1050,76,1,1048,107,-73,1052,77,-103,1048,0,-73,1052,-75,3,1049,-106,77,1048,-73],"i":[1,0,8,2,1,9,2,10,11,4,3,11,5,4,12,5,13,14,7,6,14,7,15,8,9,8,16,9,17,18,11,10,18,12,11,19,13,12,20,13,21,22,15,14,22,15,23,16,16,24,25,17,25,26,19,18,26,19,27,28,21,20,28,22,21,29,22,30,31,16,23,31,7,2,5,29,24,30,1,8,9,2,9,10,2,11,3,4,11,12,5,12,13,5,14,6,7,14,15,7,8,0,9,16,17,9,18,10,11,18,19,12,19,20,13,20,21,13,22,14,15,22,23,15,16,8,16,25,17,17,26,18,19,26,27,19,28,20,21,28,29,22,29,30,22,31,23,16,31,24,0,1,7,7,5,6,5,3,4,7,1,2,3,5,2,31,30,24,24,26,25,28,27,26,24,28,26,28,24,29]},{"c":"#2b2552","p":[105,1050,0,74,1050,74,0,1050,105,-74,1050,74,-105,1050,0,-74,1050,-74,0,1050,-105,74,1050,-74,90,1100,0,64,1100,64,0,1100,90,-64,1100,64,-90,1100,0,-64,1100,-64,0,1100,-90,64,1100,-64],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,1,4,0,14,11,15,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,0,5,5,0,4,4,2,3,2,4,1,15,9,8,9,15,10,10,15,11,11,13,12,13,11,14]},{"c":"#c1","p":[106,765,0,75,765,75,0,765,106,-75,765,75,-106,765,0,-75,765,-75,0,765,-106,75,765,-75,106,835,0,75,835,75,0,835,106,-75,835,75,-106,835,0,-75,835,-75,0,835,-106,75,835,-75],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,4,0,2,11,15,13,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,4,5,4,2,3,2,0,1,0,4,6,15,9,8,9,11,10,11,13,12,13,15,14,15,11,9]},{"c":"#c0","p":[88,635,-21,95,645,-29,81,645,-28,95,675,-29,88,685,-21,81,675,-28,69,635,2,61,645,-5,62,645,9,69,685,2,62,675,9,61,675,-5,111,635,-2,119,645,5,118,645,-9,111,685,-2,118,675,-9,119,675,5,92,635,21,85,645,29,99,645,28,92,685,21,99,675,28,85,675,29],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]}]},"w2":{"at":[0,0,0],"m":[{"c":"#2b2552","p":[55,-150,0,28,-150,48,-28,-150,48,-55,-150,0,-28,-150,-48,28,-150,-48,50,160,0,25,160,43,-25,160,43,-50,160,0,-25,160,-43,25,160,-43],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#cfd6e0","p":[66,160,0,33,160,57,-33,160,57,-66,160,0,-33,160,-57,33,160,-57,66,220,0,33,220,57,-33,220,57,-66,220,0,-33,220,-57,33,220,-57],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#g0","p":[46,210,0,23,210,40,-23,210,40,-46,210,0,-23,210,-40,23,210,-40,46,1160,0,23,1160,40,-23,1160,40,-46,1160,0,-23,1160,-40,23,1160,-40],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#c0","p":[100,210,0,50,210,87,-50,210,87,-100,210,0,-50,210,-87,50,210,-87,100,1160,0,50,1160,87,-50,1160,87,-100,1160,0,-50,1160,-87,50,1160,-87],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#cfd6e0","p":[66,1160,0,33,1160,57,-33,1160,57,-66,1160,0,-33,1160,-57,33,1160,-57,66,1220,0,33,1220,57,-33,1220,57,-66,1220,0,-33,1220,-57,33,1220,-57],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#cfd6e0","p":[62,432,0,31,432,54,-31,432,54,-62,432,0,-31,432,-54,31,432,-54,62,468,0,31,468,54,-31,468,54,-62,468,0,-31,468,-54,31,468,-54],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#cfd6e0","p":[62,882,0,31,882,54,-31,882,54,-62,882,0,-31,882,-54,31,882,-54,62,918,0,31,918,54,-31,918,54,-62,918,0,-31,918,-54,31,918,-54],"i":[1,0,6,2,1,7,3,2,8,4,3,9,5,4,10,0,5,11,4,0,2,7,11,9,1,6,7,2,7,8,3,8,9,4,9,10,5,10,11,0,11,6,0,4,5,4,2,3,2,0,1,11,7,6,7,9,8,9,11,10]},{"c":"#cfd6e0","p":[0,1185,30,29,1185,9,18,1185,-24,-18,1185,-24,-29,1185,9,0,1275,0],"i":[0,1,5,1,2,5,0,3,1,2,3,5,4,3,0,1,3,2,3,4,5,4,0,5]}]},"w3":{"at":[0,0,0],"m":[{"c":"#e8eef5","p":[50,-170,0,35,-170,35,0,-170,50,-35,-170,35,-50,-170,0,-35,-170,-35,0,-170,-50,35,-170,-35,55,170,0,39,170,39,0,170,55,-39,170,39,-55,170,0,-39,170,-39,0,170,-55,39,170,-39],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,4,0,2,11,15,13,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,4,5,4,2,3,2,0,1,0,4,6,15,9,8,9,11,10,11,13,12,13,15,14,15,11,9]},{"c":"#ff6aa8","p":[-20,-98,50,-20,-93,45,-25,-93,50,-20,-68,45,-20,-62,50,-25,-68,50,-20,-98,70,-25,-93,70,-20,-93,75,-20,-62,70,-20,-68,75,-25,-68,70,20,-98,50,25,-93,50,20,-93,45,20,-62,50,20,-68,45,25,-68,50,20,-98,70,20,-93,75,25,-93,70,20,-62,70,25,-68,70,20,-68,75],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#ff6aa8","p":[-20,3,50,-20,8,45,-25,8,50,-20,32,45,-20,38,50,-25,32,50,-20,3,70,-25,8,70,-20,8,75,-20,38,70,-20,32,75,-25,32,70,20,3,50,25,8,50,20,8,45,20,38,50,20,32,45,25,32,50,20,3,70,20,8,75,25,8,70,20,38,70,25,32,70,20,32,75],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[62,-162,0,44,-162,44,0,-162,62,-44,-162,44,-62,-162,0,-44,-162,-44,0,-162,-62,44,-162,-44,62,-138,0,44,-138,44,0,-138,62,-44,-138,44,-62,-138,0,-44,-138,-44,0,-138,-62,44,-138,-44],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,1,4,0,14,11,15,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,0,5,5,0,4,4,2,3,2,4,1,15,9,8,9,15,10,10,15,11,11,13,12,13,11,14]},{"c":"#2b2552","p":[62,108,0,44,108,44,0,108,62,-44,108,44,-62,108,0,-44,108,-44,0,108,-62,44,108,-44,62,133,0,44,133,44,0,133,62,-44,133,44,-62,133,0,-44,133,-44,0,133,-62,44,133,-44],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,1,4,0,14,11,15,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,0,5,5,0,4,4,2,3,2,4,1,15,9,8,9,15,10,10,15,11,11,13,12,13,11,14]},{"c":"#cfd6e0","p":[-128,165,-23,-128,177,-35,-140,177,-23,-128,203,-35,-128,215,-23,-140,203,-23,-128,165,23,-140,177,23,-128,177,35,-128,215,23,-128,203,35,-140,203,23,128,165,-23,140,177,-23,128,177,-35,128,215,-23,128,203,-35,140,203,-23,128,165,23,128,177,35,140,177,23,128,215,23,140,203,23,128,203,35],"i":[8,11,7,3,2,5,0,7,2,21,10,23,6,19,8,9,5,11,0,2,1,3,5,4,6,8,7,9,11,10,12,14,13,15,17,16,18,20,19,21,23,22,0,6,7,3,1,2,9,4,5,8,10,11,6,18,19,21,9,10,20,22,23,18,12,13,15,21,22,14,16,17,12,0,1,4,15,16,18,6,0,5,2,7,16,14,1,9,21,15,10,8,19,22,20,13,20,23,19,18,13,20,15,22,17,14,17,13,12,1,14,4,16,3,18,0,12,5,7,11,16,1,3,9,15,4,10,19,23,22,13,17]},{"c":"#2b2552","p":[70,200,0,49,200,49,0,200,70,-49,200,49,-70,200,0,-49,200,-49,0,200,-70,49,200,-49,55,250,0,39,250,39,0,250,55,-39,250,39,-55,250,0,-39,250,-39,0,250,-55,39,250,-39],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,4,0,2,11,15,13,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,0,6,7,6,4,5,4,2,3,2,0,1,0,4,6,15,9,8,9,11,10,11,13,12,13,15,14,15,11,9]},{"c":"#ffffff","p":[40,250,0,28,250,28,0,250,40,-28,250,28,-40,250,0,-28,250,-28,0,250,-40,28,250,-28,38,1260,0,27,1260,27,0,1260,38,-27,1260,27,-38,1260,0,-27,1260,-27,0,1260,-38,27,1260,-27,20,1340,0,14,1340,14,0,1340,20,-14,1340,14,-20,1340,0,-14,1340,-14,0,1340,-20,14,1340,-14],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,8,16,17,9,17,18,10,18,19,11,19,20,12,20,21,13,21,22,14,22,23,15,23,16,4,0,2,22,19,23,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,8,17,9,9,18,10,10,19,11,11,20,12,12,21,13,13,22,14,14,23,15,15,16,8,0,6,7,6,4,5,4,2,3,2,0,1,0,4,6,23,17,16,17,23,18,18,23,19,19,21,20,21,19,22]},{"c":"#c1","p":[95,250,0,67,250,67,0,250,95,-67,250,67,-95,250,0,-67,250,-67,0,250,-95,67,250,-67,90,1280,0,64,1280,64,0,1280,90,-64,1280,64,-90,1280,0,-64,1280,-64,0,1280,-90,64,1280,-64,35,1390,0,25,1390,25,0,1390,35,-25,1390,25,-35,1390,0,-25,1390,-25,0,1390,-35,25,1390,-25],"i":[1,0,8,2,1,9,3,2,10,4,3,11,5,4,12,6,5,13,7,6,14,0,7,15,9,8,16,10,9,17,11,10,18,12,11,19,13,12,20,14,13,21,15,14,22,8,15,23,4,0,2,19,23,21,1,8,9,2,9,10,3,10,11,4,11,12,5,12,13,6,13,14,7,14,15,0,15,8,9,16,17,10,17,18,11,18,19,12,19,20,13,20,21,14,21,22,15,22,23,8,23,16,0,6,7,6,4,5,4,2,3,2,0,1,0,4,6,23,17,16,17,19,18,19,21,20,21,23,22,23,19,17]}]}};

;
/* 由 tools/pack_assets.py 產生，請勿手改。圖片來源見 docs/assets-sources.md。 */
const ART_SHEETS = {"icons":{"file":"icons.svg","cols":6,"rows":4,"ids":["fire","ice","bolt","meteor","shield","sword","shoe","headphones","coin","star","heart","potion","role","battle","craft","growth","adventure","more","lock","unlock"]},"skills":{"file":"skills.svg","cols":3,"rows":3,"ids":["FIRE","FROST","CHAIN","METEOR","PULSE","MAGNET","SPAM","FLICKER","BEAM"]},"gems":{"file":"gems.svg","cols":4,"rows":2,"ids":["HEAVY","AREA","HASTE","TWIN","CRITS","LEECH","COOL","CRYSTAL"]},"relics":{"file":"relics.svg","cols":4,"rows":3,"ids":["FAN","LENS","CHARM","DRINK","BATT","VEST","CALC","PIG","LUCK","FOOD","BOMB","SUN"]},"legends":{"file":"legends.svg","cols":3,"rows":3,"ids":["W_ECHO","W_FORK","W_MULTI","A_PHOENIX","A_RIPOSTE","A_RESET","R_LAST","R_LINK","R_DIAL"]},"badges":{"file":"badges.svg","cols":4,"rows":3,"ids":["k100","k2000","boss1","boss10","d10","d20","l20","l30","map5","legend","card10","survive"]},"equips":{"file":"equips.svg","cols":4,"rows":3,"ids":["weapon-0","weapon-1","weapon-2","weapon-3","armor-0","armor-1","armor-2","armor-3","ring-0","ring-1","ring-2","ring-3"]}};
const ASSET = {
  icons: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NjgiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgMTQ0IDk2Ij48ZyBpZD0iZmlyZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTIgM1Y4TDE2IDZMMjAgMTJWMTdMMTYgMjFIOEw0IDE3VjEzTDkgN1YxMloiIGZpbGw9IiNkZjkxN2UiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDEyTDE1IDE2VjE5SDEwVjE2WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjZWRmM2Y1IiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJpY2UiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xMiAyTDIwIDEwVjE1TDEyIDIyTDQgMTVWMTBaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiAzVjIxTTUgMTBIMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iYm9sdCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTEzIDJIMjBMMTQgMTBIMjBMOSAyMkwxMSAxNEg0WiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJtZXRlb3IiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xMiAzTDQgMTFNMjAgNEwxNCAxME0yMSAxMUwxOCAxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNOSAxMUgxNUwxNyAxM1YxOUwxNSAyMUg5TDcgMTlWMTNaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjEwIiB5PSIxNCIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9InNoaWVsZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTYgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgNUwxMiAyTDIwIDVWMTRMMTcgMThMMTIgMjJMNyAxOEw0IDE0WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgNUwxNyA3VjEzTDEyIDE4WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJzd29yZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xOCAzSDIyVjdMMTAgMTlMNiAxNVoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTUgMTNMMTIgMjBNMyAyMUw3IDE3IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMCAxNEwxOCA2IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InNob2UiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik00IDZIMTBMMTIgMTJMMjAgMTRMMjEgMTdWMjBIM1YxMVoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTMgMTdIMjFNMTIgMTFMOSAxM00xNSAxMkwxMiAxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI1IiB5PSI4IiB3aWR0aD0iMyIgaGVpZ2h0PSI1IiBmaWxsPSIjODFjYmQxIi8+PC9nPjwvZz48ZyBpZD0iaGVhZHBob25lcyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik00IDE1VjhMOCA0SDE2TDIwIDhWMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMyIgeT0iMTIiIHdpZHRoPSI1IiBoZWlnaHQ9IjgiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTYiIHk9IjEyIiB3aWR0aD0iNSIgaGVpZ2h0PSI4IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L2c+PGcgaWQ9ImNvaW4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNSAzSDE5TDIxIDVWMTlMMTkgMjFINUwzIDE5VjVaIiBmaWxsPSIjZTRjMzc5IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xNCA3SDEwVjEySDE0VjE3SDEwIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InN0YXIiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTIgMkwxNSA4SDIyTDE3IDEzTDE5IDIxTDEyIDE3TDUgMjFMNyAxM0wyIDhIOVoiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iaGVhcnQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk2IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMyA2TDYgM0g5TDEyIDZMMTUgM0gxOEwyMSA2VjEyTDEyIDIxTDMgMTJaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InBvdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSI5IiB5PSIzIiB3aWR0aD0iNiIgaGVpZ2h0PSI0IiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik05IDdWMTBMNSAxNFYyMUgxOVYxNEwxNSAxMFY3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNyAxNUgxN1YxOUg3WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJyb2xlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTAgM0gxNEwxNiA1VjlMMTQgMTFIMTBMOCA5VjVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDE0SDE2TDIxIDE4VjIxSDNWMThaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjMiIHk9IjciIHdpZHRoPSIyIiBoZWlnaHQ9IjQiIGZpbGw9IiM4MWNiZDEiLz48cmVjdCB4PSIxOSIgeT0iNyIgd2lkdGg9IjIiIGhlaWdodD0iNCIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9ImJhdHRsZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0zIDNIN0wxOSAxNkwxNiAxOUwzIDdaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xNyAzSDIxVjdMOCAyMEw1IDE3WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMyAxNUw5IDIxTTE1IDE1TDIxIDIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9ImNyYWZ0IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE0IDNIMjBMMTYgN0wxNyAxMEwyMCAxMUwyMyA3VjEzTDE5IDE3SDE0TDcgMjNMMiAxOEwxMCAxMVY3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI1IiB5PSIxNyIgd2lkdGg9IjMiIGhlaWdodD0iMyIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9Imdyb3d0aCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xMiA5VjE0TTUgMTdWMTNIMTlWMTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iOSIgeT0iMiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIyIiB5PSIxNyIgd2lkdGg9IjYiIGhlaWdodD0iNSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI5IiB5PSIxNyIgd2lkdGg9IjYiIGhlaWdodD0iNSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxNiIgeT0iMTciIHdpZHRoPSI2IiBoZWlnaHQ9IjUiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48ZyBpZD0iYWR2ZW50dXJlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5NiA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTMgNUw5IDJMMTUgNUwyMSAyVjE5TDE1IDIyTDkgMTlMMyAyMloiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTkgM1YxOU0xNSA1VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiM4YzliYWMiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDE1TDEwIDEwTDE0IDEzTDE5IDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTciIHk9IjYiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJtb3JlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTQiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMyIgeT0iMTQiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTQiIHk9IjE0IiB3aWR0aD0iNyIgaGVpZ2h0PSI3IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L2c+PGcgaWQ9ImxvY2siIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgNzIpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik04IDExVjZMMTAgNEgxNEwxNiA2VjExIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjUiIHk9IjExIiB3aWR0aD0iMTQiIGhlaWdodD0iMTEiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTAiIHk9IjE0IiB3aWR0aD0iNCIgaGVpZ2h0PSI1IiBmaWxsPSIjODFjYmQxIi8+PC9nPjwvZz48ZyBpZD0idW5sb2NrIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA3MikiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTEyIDExVjZMMTQgNEgxOEwyMCA2VjkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNSIgeT0iMTEiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxMSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxMCIgeT0iMTQiIHdpZHRoPSI0IiBoZWlnaHQ9IjUiIGZpbGw9IiM4YzliYWMiLz48L2c+PC9nPjwvc3ZnPgo=',
  skills: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzODQiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgNzIgNzIiPjxnIGlkPSJGSVJFIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjkiIHk9IjIiIHdpZHRoPSI2IiBoZWlnaHQ9IjMiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNiIgeT0iNSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjE3IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMyA3TDkgMTRIMTNMMTEgMjBMMTYgMTJIMTJaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiNkZjkxN2UiIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IkZST1NUIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTMiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTYgOUgxOE02IDEzSDE4TTcgMTlWMjJNMTIgMTlWMjJNMTcgMTlWMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iQ0hBSU4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjIiIHk9IjMiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTYiIHk9IjE1IiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik04IDZIMTNWMTJIMThWMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iTUVURU9SIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIyIiB5PSI1IiB3aWR0aD0iNSIgaGVpZ2h0PSI4IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjE3IiB5PSIxMSIgd2lkdGg9IjUiIGhlaWdodD0iOCIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAgNUwxNyAxMkwxMyAxNkw2IDlaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xNCAzTDEyIDVNOSAxNkw1IDIwTTMgMTVMMSAxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJQVUxTRSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjUiIHk9IjIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTIgNkgxMkwxNCA4VjhMMTIgMTBIMTJMMTAgOFY4WiIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTJIMTRMMTYgMTRWMThMMTQgMjBIMTBMOCAxOFYxNFoiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iTUFHTkVUIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgM0g5VjE0TDExIDE2SDEzTDE1IDE0VjNIMjBWMTVMMTYgMjBIOEw0IDE1WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNCA4SDlNMTUgOEgyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJTUEFNIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIyIiB5PSI1IiB3aWR0aD0iMTciIGhlaWdodD0iMTQiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTMgNkwxMCAxMkwxOCA2IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjE3IiB5PSIxNSIgd2lkdGg9IjUiIGhlaWdodD0iNiIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9nPjxnIGlkPSJGTElDS0VSIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTMgN0g4TDEwIDRIMTVMMTcgN0gyMVYyMUgzWiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTBIMTRMMTYgMTJWMTZMMTQgMThIMTBMOCAxNlYxMloiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTE5IDFMMTYgNkgxOUwxNyAxMUwyMyA0SDIwWiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJCRUFNIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgMThMNyAyMUwxNyAxMUwxMyA3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTYgN0wyMiAxIiBmaWxsPSJub25lIiBzdHJva2U9IiNkZjkxN2UiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik00IDIwTDIgMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjOWJhYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L3N2Zz4K',
  gems: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgOTYgNDgiPjxnIGlkPSJIRUFWWSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTkgMlY2TTE1IDJWNk05IDE4VjIyTTE1IDE4VjIyTTIgOUg2TTIgMTVINk0xOCA5SDIyTTE4IDE1SDIyIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMyA4TDEwIDEzSDEzTDExIDE2TDE1IDExSDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJBUkVBIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTIgNlYyMU03IDIxSDE3TTMgOEwzIDVMNiAyTTIxIDhWNUwxOCAyTTcgOVY3TDkgNU0xNyA5VjdMMTUgNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxMCIgeT0iOCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9IkhBU1RFIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMyAyMFYxNEg3VjIwTTEwIDIwVjlIMTRWMjBNMTcgMjBWM0gyMVYyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI0IiB5PSIxNiIgd2lkdGg9IjIiIGhlaWdodD0iMyIgZmlsbD0iIzgxY2JkMSIvPjxyZWN0IHg9IjExIiB5PSIxMSIgd2lkdGg9IjIiIGhlaWdodD0iOCIgZmlsbD0iIzgxY2JkMSIvPjxyZWN0IHg9IjE4IiB5PSI1IiB3aWR0aD0iMiIgaGVpZ2h0PSIxNCIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9IlRXSU4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0zIDdIOUwxMiAxMFYyMkgzWiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgMkgxOEwyMSA1VjE3SDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxNSIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iNSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9nPjxnIGlkPSJDUklUUyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTEyIDJMMTQgOEwyMSA1TDE4IDEyTDIzIDE1TDE2IDE3TDE2IDIzTDExIDE5TDUgMjJMNiAxNUwxIDEyTDggOUw3IDNaIiBmaWxsPSIjZTRjMzc5IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjQiIGhlaWdodD0iNSIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9IkxFRUNIIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNiIgeT0iNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjE1IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0yIDZWMTdNMjIgNlYxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTMgN0w5IDEySDEzTDExIDE2TDE2IDEwSDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJDT09MIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iMyIgeT0iNSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik03IDZWMThNMTIgNlYxOE0xNyA2VjE4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IkNSWVNUQUwiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNOCAzSDE2TDIwIDEyTDE2IDIxSDhMNCAxMloiIGZpbGw9IiNhYTk4YzUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggM0wxMCAxMkw4IDIxTTE2IDNMMTQgMTJMMTYgMjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VkZjNmNSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L3N2Zz4K',
  relics: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJGQU4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNCIgeT0iMyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE1IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik05IDE4VjIySDE2TTEyIDZWMTVNOCAxMEgxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxMCIgeT0iOCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9IkxFTlMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik01IDNIMTVMMTcgNVYxNUwxNSAxN0g1TDMgMTVWNVoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTE1IDE1TDIyIDIyIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik03IDhIMTBWNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJDSEFSTSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTYgM0gxOFYxNUwxMiAyMkw2IDE1WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgN0wxNiAxMUwxMiAxNUw4IDExWiIgZmlsbD0iI2FhOThjNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJEUklOSyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iOSIgeT0iMiIgd2lkdGg9IjYiIGhlaWdodD0iNCIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNOCA2SDE2TDE4IDEwVjIxSDZWMTBaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik03IDEySDE3VjE4SDdaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjEwIiB5PSIxMyIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2VkZjNmNSIvPjwvZz48L2c+PGcgaWQ9IkJBVFQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjMiIHk9IjUiIHdpZHRoPSI4IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjEzIiB5PSI1IiB3aWR0aD0iOCIgaGVpZ2h0PSIxNiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNNSAySDlNMTUgMkgxOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI1IiB5PSIxMiIgd2lkdGg9IjQiIGhlaWdodD0iNiIgZmlsbD0iIzgxY2JkMSIvPjxyZWN0IHg9IjE1IiB5PSI5IiB3aWR0aD0iNCIgaGVpZ2h0PSI5IiBmaWxsPSIjODFjYmQxIi8+PC9nPjwvZz48ZyBpZD0iVkVTVCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik02IDNIMTBWN0gxNFYzSDE4VjlMMjEgMTJWMjFIM1YxMkw2IDlaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjYiIHk9IjEyIiB3aWR0aD0iMTIiIGhlaWdodD0iNiIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTIgMTJWMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VkZjNmNSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iQ0FMQyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjUiIHk9IjIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI4IiB5PSI1IiB3aWR0aD0iOCIgaGVpZ2h0PSI0IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMjIzMTQ5Ii8+PHJlY3QgeD0iMTQiIHk9IjEyIiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMjIzMTQ5Ii8+PHJlY3QgeD0iOCIgeT0iMTciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxNCIgeT0iMTciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJQSUciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNSA3SDE3TDIwIDEwVjE0SDIyVjE4SDE4VjIxSDE1VjE4SDhWMjFINVYxN0wyIDE0VjEwWiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNiA3VjNMMTAgN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTkgNkgxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxNyIgeT0iMTAiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJMVUNLIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNSAzSDE5VjE3TDE1IDIxSDVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA2TDE0IDEwSDE4TDE1IDEzTDE2IDE3TDEyIDE1TDggMTdMOSAxM0w2IDEwSDEwWiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJGT09EIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iMiIgeT0iNSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xNCA2VjE5TTMgMTJIMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNSIgeT0iOCIgd2lkdGg9IjUiIGhlaWdodD0iMiIgZmlsbD0iI2U0YzM3OSIvPjxyZWN0IHg9IjUiIHk9IjE1IiB3aWR0aD0iNSIgaGVpZ2h0PSIyIiBmaWxsPSIjZTRjMzc5Ii8+PHJlY3QgeD0iMTciIHk9IjkiIHdpZHRoPSIyIiBoZWlnaHQ9IjciIGZpbGw9IiNlNGMzNzkiLz48L2c+PC9nPjxnIGlkPSJCT01CIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTYgOEgxNkwxOCAxMFYyMEwxNiAyMkg2TDQgMjBWMTBaIiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjRIMTdMMTkgMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxOSIgeT0iMyIgd2lkdGg9IjMiIGhlaWdodD0iMyIgZmlsbD0iI2U0YzM3OSIvPjxwYXRoIGQ9Ik03IDEzVjE3IiBmaWxsPSJub25lIiBzdHJva2U9IiNlZGYzZjUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IlNVTiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik05IDdIMTVMMTcgOVYxNUwxNSAxN0g5TDcgMTVWOVoiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDFWNE0xMiAyMFYyM00xIDEySDRNMjAgMTJIMjNNMyAzTDYgNk0xOCAxOEwyMSAyMU0zIDIxTDYgMThNMTggNkwyMSAzIiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9zdmc+Cg==',
  legends: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzODQiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgNzIgNzIiPjxnIGlkPSJXX0VDSE8iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE0IDJIMTlWN0w5IDE3TDYgMTRaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEyTDEyIDE5TTMgMjJMNyAxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMyA5TDExIDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjOWJhYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iV19GT1JLIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTYgMkgyMVY3TDEyIDE2TDkgMTNaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0zIDIzTDEwIDE1IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik03IDE1TDExIDE5IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjE3IiB5PSI1IiB3aWR0aD0iMiIgaGVpZ2h0PSIzIiBmaWxsPSIjZTRjMzc5Ii8+PC9nPjwvZz48ZyBpZD0iV19NVUxUSSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNyIgeT0iMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjkiIHk9IjUiIHdpZHRoPSI2IiBoZWlnaHQ9IjQiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iOSIgeT0iMTIiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxMyIgeT0iMTIiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSI5IiB5PSIxNyIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyMzE0OSIvPjxyZWN0IHg9IjEzIiB5PSIxNyIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9IkFfUEhPRU5JWCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDEySDE2TTggMTZIMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VkZjNmNSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iQV9SSVBPU1RFIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik00IDhMOCAxME0xNiAxMEwyMCA4IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IkFfUkVTRVQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNOCAzSDE2TDIyIDhMMTkgMTRMMTcgMTJWMjJIN1YxMkw1IDE0TDIgOFoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggNUwxMiA4TDE2IDVWMjBIOFoiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDhWMjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggMTZIMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDNWME05IDFIMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iUl9MQVNUIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSI3IiB5PSIyIiB3aWR0aD0iMTAiIGhlaWdodD0iMjAiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iOSIgeT0iNSIgd2lkdGg9IjYiIGhlaWdodD0iOCIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAgMTdIMTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iUl9MSU5LIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iMyIgeT0iMTIiIHdpZHRoPSIxOCIgaGVpZ2h0PSI5IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik03IDEyVjRNNCAzTDcgMUwxMCAzTTE1IDlWNU0xOSA5VjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNiIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxMSIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJSX0RJQUwiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIyIiB5PSI5IiB3aWR0aD0iMjAiIGhlaWdodD0iMTIiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTQgOVY1SDExTDE0IDIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNSIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48cmVjdCB4PSIxMCIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48cmVjdCB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48L2c+PC9nPjwvc3ZnPgo=',
  badges: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJrMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNMTggM0gyMlY3TDEwIDE5TDYgMTVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEzTDEyIDIwTTMgMjFMNyAxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTRMMTggNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0iazIwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNNCA4TDkgMTNMNCAxOE0xMiA4TDE3IDEzTDEyIDE4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9nPjxnIGlkPSJib3NzMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik0zIDZMOCAxMEwxMiAzTDE2IDEwTDIxIDZMMTggMjBINloiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTcgMTZIMTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImJvc3MxMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxyZWN0IHg9IjciIHk9IjIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI5IiB5PSI1IiB3aWR0aD0iNiIgaGVpZ2h0PSI4IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMCAxN0gxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0iZDEwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNyAySDE3TDIyIDdWMTdMMTcgMjJIN0wyIDE3VjdaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQgNCkgc2NhbGUoLjY2KSI+PHBhdGggZD0iTTEyIDNWMTdNNiAxMUwxMiAxOEwxOCAxMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNSAyMkgxOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0iZDIwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik0xNiAySDlMNCA3VjE2TDkgMjFIMTdMMjEgMTdIMTRMMTAgMTNWN1oiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImwyMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNNSAxNkwxMiA4TDE5IDE2TTEyIDhWMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTAiIHk9IjIiIHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48L2c+PC9nPjwvZz48ZyBpZD0ibDMwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3MiAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik01IDE5TDEyIDEyTDE5IDE5TTUgMTBMMTIgM0wxOSAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0ibWFwNSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik0zIDVMOSAyTDE1IDVMMjEgMlYxOUwxNSAyMkw5IDE5TDMgMjJaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik05IDNWMTlNMTUgNVYyMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNSAxNUwxMCAxMEwxNCAxM0wxOSA4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjE3IiB5PSI2IiB3aWR0aD0iMyIgaGVpZ2h0PSIzIiBmaWxsPSIjMjIzMTQ5Ii8+PC9nPjwvZz48L2c+PGcgaWQ9ImxlZ2VuZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNMTIgMkwxNSA4SDIyTDE3IDEzTDE5IDIxTDEyIDE3TDUgMjFMNyAxM0wyIDhIOVoiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImNhcmQxMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTkgMlY2TTE1IDJWNk05IDE4VjIyTTE1IDE4VjIyTTIgOUg2TTIgMTVINk0xOCA5SDIyTTE4IDE1SDIyIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMyA4TDEwIDEzSDEzTDExIDE2TDE1IDExSDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0ic3Vydml2ZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNMyA2TDYgM0g5TDEyIDZMMTUgM0gxOEwyMSA2VjEyTDEyIDIxTDMgMTJaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9nPjwvc3ZnPgo=',
  equips: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJ3ZWFwb24tMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTggM0gyMlY3TDEwIDE5TDYgMTVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEzTDEyIDIwTTMgMjFMNyAxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTRMMTggNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJ3ZWFwb24tMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE4IDNIMjJWN0wxMCAxOUw2IDE1WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNSAxM0wxMiAyME0zIDIxTDcgMTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEwIDE0TDE4IDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0id2VhcG9uLTIiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xNiAySDIxVjdMMTIgMTZMOSAxM1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTMgMjNMMTAgMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTcgMTVMMTEgMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTciIHk9IjUiIHdpZHRoPSIyIiBoZWlnaHQ9IjMiIGZpbGw9IiNlNGMzNzkiLz48L2c+PC9nPjxnIGlkPSJ3ZWFwb24tMyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE0IDJIMTlWN0w5IDE3TDYgMTRaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEyTDEyIDE5TTMgMjJMNyAxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMyA5TDExIDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjOWJhYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iYXJtb3ItMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9ImFybW9yLTEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNOCAzSDE2TDIyIDhMMTkgMTRMMTcgMTJWMjJIN1YxMkw1IDE0TDIgOFoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggNUwxMiA4TDE2IDVWMjBIOFoiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDhWMjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iYXJtb3ItMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik04IDNIMTZMMjIgOEwxOSAxNEwxNyAxMlYyMkg3VjEyTDUgMTRMMiA4WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNOCA1TDEyIDhMMTYgNVYyMEg4WiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgOFYyMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNCA4TDggMTBNMTYgMTBMMjAgOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJhcm1vci0zIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3MiAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjYWE5OGM1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDE2SDE2IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InJpbmctMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgNkgxN0wxOSA4VjE4TDE3IDIwSDdMNSAxOFY4WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTEgMTBIMTNMMTUgMTJWMTRMMTMgMTZIMTFMOSAxNFYxMloiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0icmluZy0xIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iOSIgeT0iMSIgd2lkdGg9IjYiIGhlaWdodD0iMjIiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNSIgeT0iNiIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEyIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjgiIHk9IjkiIHdpZHRoPSI4IiBoZWlnaHQ9IjYiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48ZyBpZD0icmluZy0yIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgMTVWOEw4IDRIMTZMMjAgOFYxNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIzIiB5PSIxMiIgd2lkdGg9IjUiIGhlaWdodD0iOCIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxNiIgeT0iMTIiIHdpZHRoPSI1IiBoZWlnaHQ9IjgiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48ZyBpZD0icmluZy0zIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3MiA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNyIgeT0iMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjkiIHk9IjUiIHdpZHRoPSI2IiBoZWlnaHQ9IjgiIGZpbGw9IiNhYTk4YzUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTEwIDE3SDE0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9zdmc+Cg==',
  wordmark: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMzIiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCAxMTYgMjgiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMgNCkgc2NhbGUoMi4yNSkiPjxwYXRoIGQ9Ik0wIDBoMXYxaC0xWk0xIDBoMXYxaC0xWk0yIDBoMXYxaC0xWk0zIDBoMXYxaC0xWk00IDBoMXYxaC0xWk0yIDFoMXYxaC0xWk0yIDJoMXYxaC0xWk0yIDNoMXYxaC0xWk0yIDRoMXYxaC0xWk0yIDVoMXYxaC0xWk0wIDZoMXYxaC0xWk0xIDZoMXYxaC0xWk0yIDZoMXYxaC0xWk0zIDZoMXYxaC0xWk00IDZoMXYxaC0xWk02IDBoMXYxaC0xWk03IDBoMXYxaC0xWk04IDBoMXYxaC0xWk05IDBoMXYxaC0xWk02IDFoMXYxaC0xWk0xMCAxaDF2MWgtMVpNNiAyaDF2MWgtMVpNMTAgMmgxdjFoLTFaTTYgM2gxdjFoLTFaTTEwIDNoMXYxaC0xWk02IDRoMXYxaC0xWk0xMCA0aDF2MWgtMVpNNiA1aDF2MWgtMVpNMTAgNWgxdjFoLTFaTTYgNmgxdjFoLTFaTTcgNmgxdjFoLTFaTTggNmgxdjFoLTFaTTkgNmgxdjFoLTFaTTEyIDBoMXYxaC0xWk0xMiAxaDF2MWgtMVpNMTIgMmgxdjFoLTFaTTEyIDNoMXYxaC0xWk0xMiA0aDF2MWgtMVpNMTIgNWgxdjFoLTFaTTEyIDZoMXYxaC0xWk0xMyA2aDF2MWgtMVpNMTQgNmgxdjFoLTFaTTE1IDZoMXYxaC0xWk0xNiA2aDF2MWgtMVpNMTggMGgxdjFoLTFaTTE5IDBoMXYxaC0xWk0yMCAwaDF2MWgtMVpNMjEgMGgxdjFoLTFaTTIyIDBoMXYxaC0xWk0xOCAxaDF2MWgtMVpNMTggMmgxdjFoLTFaTTE4IDNoMXYxaC0xWk0xOSAzaDF2MWgtMVpNMjAgM2gxdjFoLTFaTTIxIDNoMXYxaC0xWk0xOCA0aDF2MWgtMVpNMTggNWgxdjFoLTFaTTE4IDZoMXYxaC0xWk0xOSA2aDF2MWgtMVpNMjAgNmgxdjFoLTFaTTIxIDZoMXYxaC0xWk0yMiA2aDF2MWgtMVpNMjQgMGgxdjFoLTFaTTI4IDBoMXYxaC0xWk0yNCAxaDF2MWgtMVpNMjggMWgxdjFoLTFaTTI0IDJoMXYxaC0xWk0yOCAyaDF2MWgtMVpNMjQgM2gxdjFoLTFaTTI1IDNoMXYxaC0xWk0yNiAzaDF2MWgtMVpNMjcgM2gxdjFoLTFaTTI4IDNoMXYxaC0xWk0yNCA0aDF2MWgtMVpNMjggNGgxdjFoLTFaTTI0IDVoMXYxaC0xWk0yOCA1aDF2MWgtMVpNMjQgNmgxdjFoLTFaTTI4IDZoMXYxaC0xWk0zMCAwaDF2MWgtMVpNMzEgMGgxdjFoLTFaTTMyIDBoMXYxaC0xWk0zMyAwaDF2MWgtMVpNMzQgMGgxdjFoLTFaTTMwIDFoMXYxaC0xWk0zMCAyaDF2MWgtMVpNMzAgM2gxdjFoLTFaTTMxIDNoMXYxaC0xWk0zMiAzaDF2MWgtMVpNMzMgM2gxdjFoLTFaTTMwIDRoMXYxaC0xWk0zMCA1aDF2MWgtMVpNMzAgNmgxdjFoLTFaTTMxIDZoMXYxaC0xWk0zMiA2aDF2MWgtMVpNMzMgNmgxdjFoLTFaTTM0IDZoMXYxaC0xWk0zNiAwaDF2MWgtMVpNMzcgMGgxdjFoLTFaTTM4IDBoMXYxaC0xWk0zOSAwaDF2MWgtMVpNMzYgMWgxdjFoLTFaTTQwIDFoMXYxaC0xWk0zNiAyaDF2MWgtMVpNNDAgMmgxdjFoLTFaTTM2IDNoMXYxaC0xWk0zNyAzaDF2MWgtMVpNMzggM2gxdjFoLTFaTTM5IDNoMXYxaC0xWk0zNiA0aDF2MWgtMVpNMzggNGgxdjFoLTFaTTM2IDVoMXYxaC0xWk0zOSA1aDF2MWgtMVpNMzYgNmgxdjFoLTFaTTQwIDZoMXYxaC0xWk00MyAwaDF2MWgtMVpNNDQgMGgxdjFoLTFaTTQ1IDBoMXYxaC0xWk00MiAxaDF2MWgtMVpNNDYgMWgxdjFoLTFaTTQyIDJoMXYxaC0xWk00NiAyaDF2MWgtMVpNNDIgM2gxdjFoLTFaTTQ2IDNoMXYxaC0xWk00MiA0aDF2MWgtMVpNNDYgNGgxdjFoLTFaTTQyIDVoMXYxaC0xWk00NiA1aDF2MWgtMVpNNDMgNmgxdjFoLTFaTTQ0IDZoMXYxaC0xWk00NSA2aDF2MWgtMVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC41IC43NSkiIGZpbGw9IiM4MWNiZDEiLz48cGF0aCBkPSJNMCAwaDF2MWgtMVpNMSAwaDF2MWgtMVpNMiAwaDF2MWgtMVpNMyAwaDF2MWgtMVpNNCAwaDF2MWgtMVpNMiAxaDF2MWgtMVpNMiAyaDF2MWgtMVpNMiAzaDF2MWgtMVpNMiA0aDF2MWgtMVpNMiA1aDF2MWgtMVpNMCA2aDF2MWgtMVpNMSA2aDF2MWgtMVpNMiA2aDF2MWgtMVpNMyA2aDF2MWgtMVpNNCA2aDF2MWgtMVpNNiAwaDF2MWgtMVpNNyAwaDF2MWgtMVpNOCAwaDF2MWgtMVpNOSAwaDF2MWgtMVpNNiAxaDF2MWgtMVpNMTAgMWgxdjFoLTFaTTYgMmgxdjFoLTFaTTEwIDJoMXYxaC0xWk02IDNoMXYxaC0xWk0xMCAzaDF2MWgtMVpNNiA0aDF2MWgtMVpNMTAgNGgxdjFoLTFaTTYgNWgxdjFoLTFaTTEwIDVoMXYxaC0xWk02IDZoMXYxaC0xWk03IDZoMXYxaC0xWk04IDZoMXYxaC0xWk05IDZoMXYxaC0xWk0xMiAwaDF2MWgtMVpNMTIgMWgxdjFoLTFaTTEyIDJoMXYxaC0xWk0xMiAzaDF2MWgtMVpNMTIgNGgxdjFoLTFaTTEyIDVoMXYxaC0xWk0xMiA2aDF2MWgtMVpNMTMgNmgxdjFoLTFaTTE0IDZoMXYxaC0xWk0xNSA2aDF2MWgtMVpNMTYgNmgxdjFoLTFaTTE4IDBoMXYxaC0xWk0xOSAwaDF2MWgtMVpNMjAgMGgxdjFoLTFaTTIxIDBoMXYxaC0xWk0yMiAwaDF2MWgtMVpNMTggMWgxdjFoLTFaTTE4IDJoMXYxaC0xWk0xOCAzaDF2MWgtMVpNMTkgM2gxdjFoLTFaTTIwIDNoMXYxaC0xWk0yMSAzaDF2MWgtMVpNMTggNGgxdjFoLTFaTTE4IDVoMXYxaC0xWk0xOCA2aDF2MWgtMVpNMTkgNmgxdjFoLTFaTTIwIDZoMXYxaC0xWk0yMSA2aDF2MWgtMVpNMjIgNmgxdjFoLTFaTTI0IDBoMXYxaC0xWk0yOCAwaDF2MWgtMVpNMjQgMWgxdjFoLTFaTTI4IDFoMXYxaC0xWk0yNCAyaDF2MWgtMVpNMjggMmgxdjFoLTFaTTI0IDNoMXYxaC0xWk0yNSAzaDF2MWgtMVpNMjYgM2gxdjFoLTFaTTI3IDNoMXYxaC0xWk0yOCAzaDF2MWgtMVpNMjQgNGgxdjFoLTFaTTI4IDRoMXYxaC0xWk0yNCA1aDF2MWgtMVpNMjggNWgxdjFoLTFaTTI0IDZoMXYxaC0xWk0yOCA2aDF2MWgtMVpNMzAgMGgxdjFoLTFaTTMxIDBoMXYxaC0xWk0zMiAwaDF2MWgtMVpNMzMgMGgxdjFoLTFaTTM0IDBoMXYxaC0xWk0zMCAxaDF2MWgtMVpNMzAgMmgxdjFoLTFaTTMwIDNoMXYxaC0xWk0zMSAzaDF2MWgtMVpNMzIgM2gxdjFoLTFaTTMzIDNoMXYxaC0xWk0zMCA0aDF2MWgtMVpNMzAgNWgxdjFoLTFaTTMwIDZoMXYxaC0xWk0zMSA2aDF2MWgtMVpNMzIgNmgxdjFoLTFaTTMzIDZoMXYxaC0xWk0zNCA2aDF2MWgtMVpNMzYgMGgxdjFoLTFaTTM3IDBoMXYxaC0xWk0zOCAwaDF2MWgtMVpNMzkgMGgxdjFoLTFaTTM2IDFoMXYxaC0xWk00MCAxaDF2MWgtMVpNMzYgMmgxdjFoLTFaTTQwIDJoMXYxaC0xWk0zNiAzaDF2MWgtMVpNMzcgM2gxdjFoLTFaTTM4IDNoMXYxaC0xWk0zOSAzaDF2MWgtMVpNMzYgNGgxdjFoLTFaTTM4IDRoMXYxaC0xWk0zNiA1aDF2MWgtMVpNMzkgNWgxdjFoLTFaTTM2IDZoMXYxaC0xWk00MCA2aDF2MWgtMVpNNDMgMGgxdjFoLTFaTTQ0IDBoMXYxaC0xWk00NSAwaDF2MWgtMVpNNDIgMWgxdjFoLTFaTTQ2IDFoMXYxaC0xWk00MiAyaDF2MWgtMVpNNDYgMmgxdjFoLTFaTTQyIDNoMXYxaC0xWk00NiAzaDF2MWgtMVpNNDIgNGgxdjFoLTFaTTQ2IDRoMXYxaC0xWk00MiA1aDF2MWgtMVpNNDYgNWgxdjFoLTFaTTQzIDZoMXYxaC0xWk00NCA2aDF2MWgtMVpNNDUgNmgxdjFoLTFaIiBmaWxsPSIjMjIzMTQ5Ii8+PC9nPjxwYXRoIGQ9Ik00IDI1SDMwTTM1IDI1SDQ5IiBzdHJva2U9IiM4YzliYWMiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik0xMDUgMjNIMTExVjI1SDEwNVoiIGZpbGw9IiM4MWNiZDEiLz48L3N2Zz4K',
};

;
/* 由 tools/pack_font.py 產生：Cubic 11 像素字體（SIL OFL 1.1）的子集 */
(function(){ const s = document.createElement('style'); s.textContent = '@font-face{font-family:"Cubic 11";src:url(data:font/woff2;base64,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) format("woff2");font-weight:400;font-style:normal;font-display:swap}'; document.head.appendChild(s); })();

;
/* ============================================================
   視覺層：Y2K low poly 3D（three.js）。
   遊戲座標：x 朝右前、y 朝左前、z 向上；three 座標 = (x, z, y)。
   平塗材質 + 低面數幾何 + 柔和粉彩，畫面由一個透明 canvas 疊在天空背景上；
   血條與傷害數字仍用 SVG 疊在最上層（座標由同一台相機投影而來）。
   ============================================================ */
const T3 = THREE, R3 = { clean:new URLSearchParams(location.search).has('clean'), ready:false, cache:{}, ent:new Map(), W:0, H:0 };
// 全尺寸共用像素格：至少每 2 CSS px 一格，長邊最多 640 個樣本；不乘 Retina DPR。
function r3BufferSize(width,height,dpr=1,clean=false){
  const W=Math.max(2,Number.isFinite(width)?width:2),H=Math.max(2,Number.isFinite(height)?height:2);
  const scale=clean?1/Math.max(1,Math.min(2,Number.isFinite(dpr)?dpr:1)):Math.max(2,Math.ceil(Math.max(W,H)/640));
  return {width:Math.max(1,Math.floor(W/scale)),height:Math.max(1,Math.floor(H/scale))};
}
const aTier = it => it ? Math.min(3, Math.floor(it.il/6)) : 0;
const aRnd = i => { const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };
const D2R = Math.PI/180;

/* ---------- 基礎工具 ---------- */
const m3 = (hex, o={}) => { if (o.own){ const { own, ...rest } = o; return new T3.MeshLambertMaterial({ color:hex, flatShading:true, ...rest }); } const k = hex + JSON.stringify(o); return (R3.cache[k] ||= new T3.MeshLambertMaterial({ color:hex, flatShading:true, ...o })); };
const basic = (hex, op=1) => new T3.MeshBasicMaterial({ color:hex, transparent:op < 1, opacity:op, depthWrite:op >= 1 });
const G_ = {};   // 共用幾何
const geo = (key, fn) => G_[key] ||= fn();
function mk(geom, mat, x=0, y=0, z=0, parent){ const o = new T3.Mesh(geom, mat); o.position.set(x, y, z); parent && parent.add(o); return o; }
const ico = (r, d=1) => new T3.IcosahedronGeometry(r, d);
const cylG = (rt, rb, h, n=7) => new T3.CylinderGeometry(rt, rb, h, n);
const at3 = (o, x, y, z) => { o.position.set(x, z, y); return o; };
function addShadow(g, r, ox=0, oz=0){ const s = mk(geo('shadow', () => new T3.CircleGeometry(1, 14).rotateX(-Math.PI/2)), basic('#6f7fd0', .32), ox, .06, oz, g); s.scale.set(r, 1, r*.8); s.renderOrder = 1; g.userData.sh = s; return s; }
function cone(parent, hex, x, y, z, r, h, n=7, rx=0, rz=0){ const o = mk(new T3.ConeGeometry(r, h, n), m3(hex), x, y, z, parent); o.rotation.x = rx; o.rotation.z = rz; return o; }

/* 動畫眼睛：貼圖畫一次，依虹膜顏色快取 */
function eyeTex(iris='#46c8f0', style='anime'){
  const k = 'eye' + iris + style; if (R3.cache[k]) return R3.cache[k];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  if (style === 'anime'){
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64, 66, 50, 58, 0, 0, 7); x.fill();
    const g = x.createLinearGradient(0, 20, 0, 118); g.addColorStop(0, '#2b2552'); g.addColorStop(.35, iris); g.addColorStop(1, '#e8fbff');
    x.fillStyle = g; x.beginPath(); x.ellipse(64, 70, 36, 46, 0, 0, 7); x.fill();
    x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(64, 68, 16, 22, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(78, 46, 11, 0, 7); x.fill(); x.beginPath(); x.arc(52, 92, 6, 0, 7); x.fill();
    x.strokeStyle = '#2b2552'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.ellipse(64, 66, 50, 58, 0, 3.6, 5.8); x.stroke();
  } else if (style === 'cool'){   // 半垂的細長眼：粗上眼線、小高光，沒有腮紅
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64, 70, 56, 30, 0, 0, 7); x.fill();
    x.save(); x.beginPath(); x.ellipse(64, 70, 56, 30, 0, 0, 7); x.clip();
    x.fillStyle = iris; x.beginPath(); x.ellipse(68, 70, 26, 34, 0, 0, 7); x.fill(); x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(69, 72, 12, 24, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(76, 62, 6, 0, 7); x.fill(); x.fillStyle = '#2b2552'; x.fillRect(0, 36, 128, 22); x.restore();
    x.strokeStyle = '#2b2552'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(8, 60); x.quadraticCurveTo(60, 38, 120, 56); x.stroke();
    x.lineWidth = 4; x.beginPath(); x.ellipse(64, 70, 56, 30, 0, .3, 2.8); x.stroke();
  } else {   // 黑亮圓眼（史萊姆、怪物）
    x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(64, 66, 50, 56, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(80, 44, 17, 0, 7); x.fill(); x.beginPath(); x.arc(48, 88, 8, 0, 7); x.fill();
  }
  const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return R3.cache[k] = t;
}
const onSphere = (R, ang, elev) => [Math.sin(ang)*Math.cos(elev)*R, Math.sin(elev)*R, Math.cos(ang)*Math.cos(elev)*R];
function eye(parent, R, ang, elev, size, iris, style, c = [0, 0, 0]){   // 貼在半徑 R 的頭部表面，朝外；c 是頭球中心相對頭骨轉軸的位置
  const o = new T3.Mesh(geo('eyeP', () => new T3.PlaneGeometry(1, 1)), new T3.MeshBasicMaterial({ map:eyeTex(iris, style), transparent:true }));
  const [x, y, z] = onSphere(R + .08, ang, elev); o.position.set(x + c[0], y + c[1], z + c[2]); o.lookAt(o.position.clone().add(new T3.Vector3(x, y, z))); o.scale.set(size, size*1.1, 1); parent.add(o); return o;
}
function blush(parent, R, ang, elev){ const b = mk(geo('blush', () => new T3.CircleGeometry(.62, 8)), basic('#ff9ab8', .55), 0, 0, 0, parent); const [x, y, z] = onSphere(R + .06, ang, elev); b.position.set(x, y, z); b.lookAt(b.position.clone().multiplyScalar(2)); }
function mouth(parent, R, elev, w, col='#2b2552', up=1, c = [0, 0, 0]){
  const o = new T3.Mesh(new T3.TorusGeometry(w, .13, 4, 8, Math.PI), basic(col)), [, y, z] = onSphere(R + .08, 0, elev);
  o.position.set(c[0], y + c[1], z + c[2]); o.rotation.z = up > 0 ? Math.PI : 0; parent.add(o); return o;
}

/* ---------- 主角 ---------- */
const HAIR = ['#2b2552', '#2b2552', '#3a3f8f', '#d9dff2'];   // 藍黑、深藍、銀白
function modelGroup(def, recolor, mf){   // 把 Blender 匯出的零件組成 three.js 群組（平塗、flat shading）；mf 可換成每隻怪物自己的材質
  const g = new T3.Group(); g.position.set(...def.at.map(v => v/1)); 
  for (const m of def.m){
    const geom = new T3.BufferGeometry(); geom.setAttribute('position', new T3.Float32BufferAttribute(m.p.map(v => v/100), 3)); geom.setIndex(m.i);
    g.add(new T3.Mesh(geom, (mf || m3)(recolor[m.c] || m.c)));
  }
  return g;
}
const VM = 12;   // 戰場左右各多出 12 單位的純視覺地面，讓人物不會擠在窄條上
const BONES = { hips:null, torso:'hips', head:'torso', hair0:'head', hair1:'head', hair2:'head', hair3:'head', hair4:'head', tail:'torso', armL:'torso', foreL:'armL', armR:'torso', foreR:'armR', legL:'hips', shinL:'legL', legR:'hips', shinR:'legR' };
function rigModel(def, recolor, mf){   // 依 BONES 的階層組成骨架：子骨骼的位置是相對父骨骼的轉軸
  const b = {};
  for (const k in BONES) if (def[k]) b[k] = modelGroup(def[k], recolor, mf);
  for (const k in BONES){ const par = BONES[k]; if (par && b[k]){ b[k].position.set(...def[k].at.map((v, i) => v - def[par].at[i])); b[par].add(b[k]); } }
  return b;
}
function buildHero(at, ar, wt, wr, cos){
  cos = cos || G.cos;
  const g = new T3.Group(), steel = ['#cfd6e0', '#bcd0f0', '#f4e3a8', '#f2b09a'][ar];
  const recolor = { '#e9edf6':['#e8eef5', '#9fb8e8', '#f2d27a', '#f09a8a'][ar], '#6f8f4a':at >= 1 ? '#7d8fb8' : '#6f8f4a', '#2b2552':at >= 2 ? '#3a3f8f' : '#2b2552' };
  const ch = CHARS[G.char]; if (ch.hair) recolor['#2b2552'] = ch.hair; if (ch.pants){ recolor['#6f8f4a'] = ch.pants; recolor['#5d7a3c'] = ch.pants; } if (ch.skin) recolor['#f4cfb4'] = ch.skin;
  const cc = cat => { const e = COS[cat].find(x => x[0] === cos[cat]); return e && e !== COS[cat][0] ? e[2] : null; }, shade = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16)*f).toString(16).padStart(2, '0')).join('');
  { let c = cc('hair'); if (c) recolor['#2b2552'] = c; c = cc('top'); if (c){ recolor['#e9edf6'] = c; recolor['#cfd6e0'] = shade(c, .88); } c = cc('pants'); if (c){ recolor['#6f8f4a'] = c; recolor['#5d7a3c'] = shade(c, .85); }
    c = cc('shoes'); if (c) recolor['#e8eef5'] = c; c = cc('phones'); if (c) recolor['#f5f6fc'] = c; c = cc('skin'); if (c){ recolor['#f4cfb4'] = c; recolor['#e4b99a'] = shade(c, .93); } }
  const B = rigModel(HERO_MODEL, recolor), head = B.head; for (let i = 0; i < 5; i++) if (B['hair' + i]) B['hair' + i].visible = String(i) === String(cos.hstyle || '0'); g.add(B.hips); g.userData.B = B; g.userData.head = head;
  head.scale.setScalar(2.0); head.position.y += .5;
  if (at >= 1){ for (const sx of [-1, 1]) mk(ico(1.9, 1), m3(steel), sx*4.3, 7.4, 0, B.torso); mk(new T3.BoxGeometry(2.4, 3, .6), m3(steel), 0, 4.4, 3.0, B.torso); }
  const hatC = (COS.hat.find(x => x[0] === cos.hat) || [])[2], gC = (COS.glasses.find(x => x[0] === cos.glasses) || [])[2], pC = (COS.pack.find(x => x[0] === cos.pack) || [])[2], ci = cos.hat !== '0' && cos.hat != null;
  if (at >= 2 && !ci){   // 鴨舌帽
    mk(new T3.SphereGeometry(3.5, 9, 6, 0, Math.PI*2, 0, Math.PI*.5), m3(steel), 0, 1.0, -.2, head);
    mk(new T3.BoxGeometry(4.8, .35, 2.8), m3(steel), 0, 1.6, 3.6, head).rotation.x = .18;
  }
  { const tc = cc('top') || '#e9edf6', td = shade(tc, .82), ts = cos.tstyle;   // 上衣款式
    if (ts === 'hood'){ mk(new T3.SphereGeometry(4.2, 8, 6), m3(td), 0, 7.4, -2.6, B.torso).scale.set(1, .8, .9); mk(new T3.TorusGeometry(3.3, .95, 5, 12).rotateX(Math.PI/2), m3(td), 0, 8.0, .4, B.torso); mk(new T3.BoxGeometry(5.2, 2.0, .6), m3(td), 0, 1.8, 3.4, B.torso); for (const sx of [-1, 1]) mk(new T3.CylinderGeometry(.18, .18, 3, 4), m3('#ffffff'), sx*1.0, 6.0, 3.5, B.torso); }
    if (ts === 'jacket'){ for (const sx of [-1, 1]){ mk(new T3.BoxGeometry(2.8, 7, .7), m3(td), sx*1.9, 4.4, 3.5, B.torso); mk(new T3.BoxGeometry(.35, 7, .8), m3('#ffffff'), sx*.35, 4.4, 3.6, B.torso); mk(new T3.BoxGeometry(2.0, 1.9, 2.2), m3(td), sx*4.6, 6.4, 0, B.torso); mk(new T3.BoxGeometry(2.2, .5, 2.4), m3('#ffffff'), sx*4.6, 5.3, 0, B.torso); } mk(new T3.BoxGeometry(7.4, 1.0, 4.2), m3(td), 0, 8.2, 0, B.torso); mk(new T3.BoxGeometry(7.6, .6, 4.4), m3('#ffffff'), 0, 1.0, 0, B.torso); mk(new T3.BoxGeometry(2.0, 2.0, .3), m3('#ff6aa8'), -2.4, 6.4, 3.9, B.torso); mk(new T3.BoxGeometry(6.6, 6, .7), m3(td), 0, 4.6, -3.4, B.torso); }
    if (ts === 'scarf'){ mk(new T3.TorusGeometry(3.4, 1.0, 5, 12).rotateX(Math.PI/2), m3('#ff6a6a'), 0, 8.2, .2, B.torso); mk(new T3.BoxGeometry(1.8, 6.5, .7), m3('#ff6a6a'), 1.6, 4.8, 3.5, B.torso); mk(new T3.BoxGeometry(1.8, .8, .75), m3('#ffffff'), 1.6, 1.6, 3.5, B.torso); mk(new T3.BoxGeometry(1.8, 5, .7), m3('#ff6a6a'), -1.0, 5.2, -3.6, B.torso); }
  }
  if (ci){   // 帽子
    if (cos.hat === 'cap'){ mk(new T3.SphereGeometry(4.5, 9, 6, 0, Math.PI*2, 0, Math.PI*.5), m3(hatC), 0, 3.0, -.8, head).rotation.x = -.18; mk(new T3.BoxGeometry(5.6, .4, 3.4), m3(shade(hatC, .85)), 0, 3.3, 3.5, head).rotation.x = .1; }
    if (cos.hat === 'beanie'){ mk(new T3.SphereGeometry(4.6, 9, 6, 0, Math.PI*2, 0, Math.PI*.58), m3(hatC), 0, 3.0, -.8, head).rotation.x = -.18; mk(new T3.TorusGeometry(4.3, .55, 5, 14).rotateX(Math.PI/2), m3('#ffffff'), 0, 3.3, -.8, head).rotation.x = -.18; mk(ico(1.1, 1), m3('#ffffff'), 0, 7.8, -1.6, head); }
    if (cos.hat === 'bunny'){ for (const sx of [-1, 1]){ const e = mk(new T3.BoxGeometry(1.1, 5, .6), m3(hatC), sx*1.8, 8.4, -.3, head); e.rotation.z = -sx*.18; mk(new T3.BoxGeometry(.55, 3.6, .65), m3('#ffb6d4'), sx*1.8, 8.4, -.25, head).rotation.z = -sx*.18; } }
    if (cos.hat === 'ant'){ mk(new T3.TorusGeometry(4.5, .3, 4, 14, Math.PI), m3('#2b2552'), 0, 2.4, -.2, head); for (const sx of [-1, 1]){ mk(new T3.CylinderGeometry(.12, .12, 3, 5), m3('#2b2552'), sx*3.2, 8.0, -.1, head).rotation.z = -sx*.3; mk(ico(.6, 1), m3(hatC, { emissive:hatC, emissiveIntensity:.5 }), sx*3.8, 9.6, -.1, head); } }
  }
  if (gC && cos.glasses !== '0'){   // 眼鏡
    if (cos.glasses === 'round'){ for (const sx of [-1, 1]) mk(new T3.TorusGeometry(.95, .14, 5, 12), m3(gC), sx*1.45, 2.35, 3.45, head); mk(new T3.BoxGeometry(.9, .14, .14), m3(gC), 0, 2.45, 3.5, head); }
    if (cos.glasses === 'visor') mk(new T3.BoxGeometry(4.6, 1.3, .35), m3(gC, { transparent:true, opacity:.55, emissive:gC, emissiveIntensity:.35 }), 0, 2.35, 3.5, head);
    if (cos.glasses === 'shades'){ for (const sx of [-1, 1]) mk(new T3.BoxGeometry(2.0, 1.2, .3), m3(gC), sx*1.45, 2.35, 3.5, head); mk(new T3.BoxGeometry(.9, .18, .2), m3(gC), 0, 2.6, 3.5, head); }
  }
  if (pC && cos.pack !== '0'){   // 背飾
    if (cos.pack === 'bag'){ mk(new T3.BoxGeometry(4.2, 5.4, 2.2), m3(pC), 0, 3.4, -5.4, B.torso); mk(new T3.BoxGeometry(3.4, 1.6, .4), m3(shade(pC, .85)), 0, 2.2, -6.6, B.torso); }
    if (cos.pack === 'cape'){ const cp = mk(new T3.BoxGeometry(7.2, 10, .4), m3(pC), 0, 1.0, -5.2, B.torso); cp.rotation.x = .14; }
    if (cos.pack === 'wing'){ for (const sx of [-1, 1]){ const w = mk(new T3.BoxGeometry(5.5, .5, 3.2), m3(pC, { emissive:pC, emissiveIntensity:.35, transparent:true, opacity:.8 }), sx*7.4, 8.0, -5.4, B.torso); w.rotation.set(.3, sx*.6, sx*.45); w.scale.set(1.3, 1, 1.3); } }
  }
  const HC = [0, 2.4, .2];   // 頭球中心（Blender 裡頭中心在 z 27.4、頭骨轉軸在 25.0）
  eye(head, 3.2, -.43, -.04, 2.0, '#46c8f0', 'cool', HC); eye(head, 3.2, .43, -.04, 2.0, '#46c8f0', 'cool', HC);
  const mo = new T3.Mesh(new T3.PlaneGeometry(.7, .13), basic('#7a3a4a')); mo.position.set(0, 2.4 - 1.25, 3.3); mo.rotation.x = -.25; head.add(mo);
  const hand = new T3.Group(); hand.position.set(.6, -4.5, .8); B.foreR.add(hand);
  const sw = new T3.Group(); sw.rotation.x = 2.1; hand.add(sw); g.userData.sword = sw;
  buildWeapon(sw, wt, wr);
  mk(new T3.RingGeometry(9, 11, 28).rotateX(-Math.PI/2), basic('#7ef0ff', .85), 0, .35, 0, g); mk(new T3.CircleGeometry(9, 24).rotateX(-Math.PI/2), basic('#7ef0ff', .18), 0, .3, 0, g);   /* 腳下的青色光圈，人多時一眼找到主角 */
  const orb = mk(ico(1.9, 1), basic('#ffb347', .95), 6, 13, 5.5, g); orb.visible = false; g.userData.orb = orb;
  g.scale.setScalar(.85*CK); g.rotation.order = 'YXZ'; addShadow(g, 5.5);
  return g;
}
// Y2K 城市武器（依武器階級）：0 摺疊傘、1 鋁製球棒、2 霓虹光管、3 雷射光劍；稀有度決定主色與發光
const WOV = new URLSearchParams(location.search);   // 測試用：?wt=0..3&wr=0..3 直接指定武器外觀
function buildWeapon(sw, wt, wr){   // 模型來自 Blender（tools/model/gen_weapons.py）；這裡只負責依稀有度換色與發光
  const C = [['#e8eef5', '#cfdcf0'], ['#8fd0ff', '#4aa8ff'], ['#ffe08a', '#ffc94a'], ['#ff9a5a', '#ff5a8a']][wr], glow = wr >= 2;
  const lit = (c, k = .5) => m3(c, { emissive:c, emissiveIntensity:k });
  const mf = hex => {
    if (wt === 2) return hex === C[1] ? lit(C[1], .9) : hex === C[0] ? basic(C[0], .25) : m3(hex);
    if (wt === 3) return hex === C[1] ? basic(C[1], .45) : hex === '#ffffff' ? lit('#ffffff', .8) : m3(hex);
    if (glow && ((wt === 0 && hex === C[1]) || (wt === 1 && hex === C[0]))) return lit(hex, .3);
    return m3(hex);
  };
  sw.add(modelGroup(WEAPON_MODEL['w' + wt], { '#c0':C[0], '#c1':C[1], '#g0':C[1] }, mf));
  if (wr === 3) mk(ico(5, 1), basic('#ff9a3c', .15), 0, 6, 0, sw);
}
function buildGrave(){
  const g = new T3.Group();
  mk(new T3.BoxGeometry(7, 1.4, 5), m3('#c8cce0'), 0, .7, 0, g); mk(new T3.BoxGeometry(5, 7, 1.6), m3('#d8dcf0'), 0, 4.6, 0, g);
  mk(cylG(2.5, 2.5, 1.6, 8), m3('#d8dcf0'), 0, 8.1, 0, g).rotation.x = Math.PI/2;
  mk(new T3.BoxGeometry(.8, 3, .3), m3('#9aa0c8'), 0, 5.2, .95, g); mk(new T3.BoxGeometry(2.2, .8, .3), m3('#9aa0c8'), 0, 5.8, .95, g);
  addShadow(g, 5); return g;
}

/* ---------- 怪物 ---------- */
const SLIME_HEX = ['#9be07d', '#ffd36a', '#8fd8ff', '#ff9a8a', '#5fe8ff', '#ff9ad0'];
function flash(g, c, k){ for (const m of g.userData.mats || []){ m.emissive.set(c); m.emissiveIntensity = k; } }
function ownMat(g, hex, o={}){ const m = m3(hex, { own:true, ...o }); (g.userData.mats ||= []).push(m); return m; }
function buildSlime(){   // 稜角分明的霓虹凝膠：低面數外殼、發光核心、細長護目鏡眼
  const g = new T3.Group(), hex = SLIME_HEX[biomeNow()], jelly = new T3.Group(); g.add(jelly); g.userData.jelly = jelly;
  mk(ico(1, 1), ownMat(g, hex, { transparent:true, opacity:.9 }), 0, 3.4, 0, jelly).scale.set(5.6, 3.7, 5.6);
  mk(ico(1, 0), ownMat(g, '#ffffff', { transparent:true, opacity:.9 }), 0, 3.0, -.4, jelly).scale.set(2.2, 1.9, 2.2);
  for (const [x, z, r] of [[-4.2, 1.8, 1.1], [3.9, 2.6, .9], [.6, 4.9, 1.0], [-1.8, -4.4, .9]]) mk(ico(r, 0), ownMat(g, hex, { transparent:true, opacity:.9 }), x, .8, z, jelly).scale.set(1, .6, 1);
  mk(ico(.9, 0), basic('#ffffff', .85), 2.6, 5.6, 1.8, jelly).scale.set(1, .6, .6);
  const fc = new T3.Group(); fc.position.set(0, 3.8, 0); jelly.add(fc);
  mk(new T3.BoxGeometry(5.6, .9, .3), basic('#2b2552'), 0, 0, 5.75, fc);
  for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.6, .4, .3), basic('#ff6aa8'), sx*1.5, 0, 5.95, fc);
  addShadow(g, 5.8); return g;
}
function monModel(g, def, recolor){   // 組合 MON_MODEL 的 11 根骨骼（沒有 tail），每隻怪物用自己的材質，回傳骨架
  const B = rigModel(def, recolor, hex => ownMat(g, hex)); g.add(B.hips);
  g.userData.B = B; g.userData.head = B.head; return B;
}
function buildSkel(){
  const g = new T3.Group(), B = monModel(g, MON_MODEL.skel, {}), head = B.head;
  for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(.62, 8)), basic('#7ef0ff'), sx*1.85, 3.8, 3.6, head); mk(geo('sock2', () => new T3.CircleGeometry(.22, 6)), basic('#ffffff'), sx*1.85 + .15, 4.0, 3.65, head); }
  head.scale.setScalar(2.05); g.userData.s = .82; g.scale.setScalar(.82); g.rotation.order = 'YXZ';
  addShadow(g, 4.6); return g;
}
function buildDrone(){   // 無人機：圓身、兩具旋翼、紅色獨眼，貼著半空飛
  const g = new T3.Group(), hex = ['#9fb8e8', '#e8c27a', '#bfe6ff', '#e89a8a', '#7a8fe8', '#ffb0d8'][biomeNow()];
  mk(ico(1, 1), ownMat(g, hex), 0, 8, 0, g).scale.set(4.2, 2.6, 4.2); mk(ico(.9, 0), ownMat(g, '#ffffff'), 0, 9.6, -.4, g).scale.set(2, 1, 2);
  mk(ico(1, 0), basic('#ff3a5a'), 0, 8, 3.9, g).scale.set(1.1, 1.1, .6); mk(cylG(.12, .12, 2.4, 4), ownMat(g, '#2b2552'), 0, 11.2, -1, g);
  const ro = []; for (const sx of [-1, 1]){ mk(new T3.BoxGeometry(.5, 1.6, .5), ownMat(g, '#2b2552'), sx*4.2, 8.6, 0, g); const r = mk(cylG(3.4, 3.4, .22, 12), ownMat(g, '#ffffff', { transparent:true, opacity:.55 }), sx*4.2, 9.5, 0, g); ro.push(r); }
  g.userData.rotors = ro; g.userData.s = .9; g.scale.setScalar(.9); g.rotation.order = 'YXZ'; addShadow(g, 3.6); return g;
}
function buildBomb(){   // 自爆機器人：深色圓身、引信火花，越接近死亡越閃紅
  const g = new T3.Group();
  mk(ico(1, 1), ownMat(g, '#3a3560'), 0, 4.6, 0, g).scale.set(4.6, 4.4, 4.6); mk(ico(1, 0), ownMat(g, '#6a62a8'), -1.4, 6.4, -.8, g).scale.set(1.6, 1.2, 1.6);
  mk(cylG(.35, .45, 2, 5), ownMat(g, '#c9a064'), 0, 9.8, 0, g); const sp = mk(ico(.9, 1), basic('#ff9a3c'), 0, 11.2, 0, g); g.userData.spark = sp;
  for (const sx of [-1, 1]){ mk(new T3.BoxGeometry(1.6, .5, .3), basic('#7ef0ff'), sx*1.5, 5.4, 4.5, g); mk(new T3.BoxGeometry(1.8, 1, 2.4), ownMat(g, '#2b2552'), sx*2, .5, 1, g); }
  mk(new T3.BoxGeometry(3.4, .5, .3), basic('#ff3a5a'), 0, 3.4, 4.5, g);
  g.userData.s = .85; g.scale.setScalar(.85); g.rotation.order = 'YXZ'; addShadow(g, 5); return g;
}
function buildBrute(boss){
  const g = new T3.Group(), rc = boss ? { '#ff9a3c':'#9a6ae0', '#e07a24':'#7c52c0', '#3a3560':'#2f2850', '#ff6aa8':'#ffd35a' } : {}, B = monModel(g, MON_MODEL.brute, rc), head = B.head;
  for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.7, .8, .3), basic('#7ef0ff'), sx*1.5, 3.0, 3.45, head);
  if (boss){ mk(cylG(3.7, 3.9, 1.2, 8), m3('#ffd35a'), 0, 6.5, -.2, head); for (let i = 0; i < 6; i++){ const a = i/6*6.283; cone(head, '#ffd35a', Math.cos(a)*3.5, 8.0, Math.sin(a)*3.5 - .2, .7, 2.4, 4); } }
  head.scale.setScalar(1.9); const k = boss ? .88 : .7; g.userData.s = k; g.scale.setScalar(k); g.rotation.order = 'YXZ';
  addShadow(g, boss ? 8 : 6.4); return g;
}

/* ---------- 裝飾 ---------- */
function buildDeco(kind, k){
  const g = new T3.Group();
  const pine = snow => { mk(cylG(.9, 1.1, 3, 6), m3('#b88a6a'), 0, 1.5, 0, g); [['#7fdcae', 4.6, 3.8, 5.2], ['#92e6bd', 3.7, 7.2, 4.6], ['#a8f0cc', 2.8, 10.4, 4.2]].forEach(([c, r, y, h]) => { cone(g, c, 0, y, 0, r, h, 7); if (snow) cone(g, '#ffffff', 0, y + h*.18, 0, r*.72, h*.7, 7); }); };
  switch (kind){
    case 'cone': mk(new T3.BoxGeometry(3.4, .4, 3.4), m3('#2b2552'), 0, .2, 0, g); cone(g, '#ff7a3a', 0, 2.6, 0, 1.2, 4.4, 7); mk(cylG(.95, 1.05, .7, 7), m3('#ffffff'), 0, 2.4, 0, g); break;
    case 'vend': mk(new T3.BoxGeometry(4.6, 9, 3.6), m3('#6fa0f0'), 0, 4.5, 0, g); mk(new T3.BoxGeometry(3.4, 5.2, .3), basic('#cfeaff'), -.2, 5.6, 1.85, g); for (const [y, c] of [[7.2, '#ff8fb8'], [5.8, '#ffe27a'], [4.4, '#8fe3a8']]) mk(new T3.BoxGeometry(2.8, .8, .2), basic(c), -.2, y, 2.05, g); mk(new T3.BoxGeometry(3, .9, .3), basic('#2b2552'), 0, 1.4, 1.85, g); mk(new T3.BoxGeometry(.8, 1.4, .2), basic('#ff7a3a'), 1.7, 6, 1.9, g); break;
    case 'rail': for (const z of [-3.6, 0, 3.6]) mk(cylG(.35, .35, 3.4, 5), m3('#e8eef5'), 0, 1.7, z, g); mk(new T3.BoxGeometry(.5, .5, 8.6), m3('#e8eef5'), 0, 3.3, 0, g); mk(new T3.BoxGeometry(.4, .4, 8.6), m3('#cfd6e0'), 0, 2.1, 0, g); break;
    case 'lamp': mk(cylG(.4, .55, 12, 6), m3('#cfd6e0'), 0, 6, 0, g); mk(new T3.BoxGeometry(.5, .5, 3), m3('#cfd6e0'), 0, 12, 1.2, g); mk(new T3.BoxGeometry(1.4, .5, 2), basic('#fff6c8'), 0, 11.6, 2.4, g); break;
    case 'pine': pine(false); break; case 'snowpine': pine(true); break;
    case 'bush': for (const [x, y, z, r] of [[-1.6, 1.8, 0, 2.2], [1.2, 2.2, .6, 2.6], [.2, 1.6, -1.6, 2]]) mk(ico(r, 1), m3('#86dca4'), x, y, z, g); for (const [x, y, z] of [[1.8, 4, 1.6], [-.4, 3.4, 1.6], [2.6, 2.6, -.4]]) mk(ico(.45, 0), m3('#ff6a8a'), x, y, z, g); break;
    case 'mush': mk(cylG(.9, 1.2, 2.6, 6), m3('#fff0e0'), 0, 1.3, 0, g); mk(new T3.SphereGeometry(2.6, 8, 5, 0, 6.283, 0, 1.55), m3('#ff7a9a'), 0, 2.4, 0, g); for (const [x, z] of [[-1, 1], [1.1, .4], [0, -1.3]]) mk(ico(.38, 0), m3('#ffffff'), x, 4.5 - (x*x + z*z)*.12, z, g); break;
    case 'cactus': mk(cylG(1.5, 1.7, 8, 7), m3('#86dca4'), 0, 4, 0, g); mk(ico(1.5, 1), m3('#86dca4'), 0, 8, 0, g); for (const sx of [-1, 1]){ mk(cylG(.8, .8, 2.4, 6), m3('#86dca4'), sx*2.6, 6.2, 0, g); mk(new T3.BoxGeometry(1.8, .8, .8), m3('#86dca4'), sx*1.7, 4.2, 0, g); } mk(ico(.5, 0), m3('#ff8fb8'), 0, 9.3, 0, g); break;
    case 'rock': mk(new T3.DodecahedronGeometry(2.8, 0), m3('#b9b3d6'), 0, 2, 0, g).scale.set(1.2, .9, 1); mk(new T3.DodecahedronGeometry(1.5, 0), m3('#cdc8e8'), 2.4, 1, 1.2, g); break;
    case 'skull': mk(ico(1.8, 1), m3('#fbf6ea'), 0, 2, 0, g).scale.set(1.2, 1, 1.3); mk(new T3.BoxGeometry(2, 1, 1.6), m3('#fbf6ea'), 0, 1, 1.8, g); for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(1, 10)), basic('#2b2552'), sx*.8, 2.4, 2.1, g).scale.set(.55, .6, 1); cone(g, '#fff0d0', sx*2.4, 3.2, 0, .5, 3.4, 5, 0, -sx*1.0); } break;
    case 'crystal': for (const [x, z, h, c] of [[0, 0, 9, '#8fe0ff'], [-2, 1, 5.5, '#b9a8ff'], [2, .6, 6.5, '#ffb0dd'], [.6, -2, 4, '#c8f2ff']]) mk(new T3.OctahedronGeometry(1.3, 0), m3(c, { emissive:c, emissiveIntensity:.18, transparent:true, opacity:.92 }), x, h/2, z, g).scale.set(.9, h/2.6, .9); break;
    case 'snowman': mk(ico(3.1, 1), m3('#ffffff'), 0, 3, 0, g); mk(ico(2.3, 1), m3('#ffffff'), 0, 7, 0, g); mk(ico(1.8, 1), m3('#ffffff'), 0, 10, 0, g); cone(g, '#ff9a5a', 0, 10, 2, .35, 1.8, 5, Math.PI/2); mk(new T3.TorusGeometry(1.7, .45, 4, 8), m3('#ff8fb8'), 0, 8.3, 0, g).rotation.x = Math.PI/2; for (const sx of [-.6, .6]) mk(ico(.2, 0), basic('#2b2552'), sx, 10.4, 1.65, g); break;
    case 'spike': for (const [x, z, h, r] of [[0, 0, 9, 1.8], [-2, 1, 5.5, 1.3], [2, .8, 6.5, 1.4]]) cone(g, '#a8587a', x, h/2, z, r, h, 5); break;
    case 'vent': mk(cylG(3.4, 4, 1.2, 8), m3('#9a7a90'), 0, .6, 0, g); g.userData.glow = mk(new T3.CircleGeometry(2.4, 10).rotateX(-Math.PI/2), basic('#ff9ab0'), 0, 1.25, 0, g); break;
  }
  g.scale.setScalar(k*({ vend:1.45, lamp:1.4, rail:1.3, cone:1.5, rock:1.2 }[kind] || 1)); addShadow(g, 3.6); return g;
}
const DECO = [   // 每個生態：[種類, x, y, 縮放]
  [['pine',4,22,1.1], ['pine',27,25,.9], ['bush',5,44,1], ['rail',27,52,1], ['vend',26,38,1], ['cone',5,58,1]],
  [['cactus',4,22,1.1], ['rail',27,26,1], ['rock',5,45,1], ['cone',26,50,1], ['vend',26,38,1], ['cone',4,56,1]],
  [['snowpine',4,22,1.1], ['snowpine',27,25,.9], ['crystal',5,45,1], ['cone',26,51,1], ['vend',26,38,1], ['rail',4,57,1]],
  [['spike',4,22,1.1], ['spike',27,25,.9], ['rock',5,45,1], ['cone',26,50,1], ['vent',25,38,1], ['lamp',4,56,1]],
  [['lamp',4,22,1.1], ['crystal',27,25,.9], ['vend',5,45,1], ['cone',26,51,1], ['rail',26,38,1], ['lamp',4,57,1]],
  [['bush',4,22,1.2], ['crystal',27,25,.9], ['vend',5,45,1], ['cone',26,51,1], ['bush',26,38,1], ['rail',4,57,1]],
];
function buildTorch(){   // 路燈：灰白燈桿、斜臂、暖白燈罩加光暈
  const g = new T3.Group(); mk(cylG(.45, .6, 12, 6), m3('#cfd6e0'), 0, 6, 0, g); mk(new T3.BoxGeometry(.5, .5, 4), m3('#cfd6e0'), 0, 12, 1.6, g);
  const lamp = mk(new T3.BoxGeometry(1.6, .5, 2.4), basic('#fff6c8'), 0, 11.6, 3.2, g), halo = mk(ico(3, 1), basic('#fff0b0', .2), 0, 11, 3.2, g);
  g.userData.fl = [lamp, lamp, halo]; g.scale.setScalar(1.4); addShadow(g, 1.8); return g;
}
function signTex(txt){
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#ffe9c4'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#c99a6a'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 88);
  x.fillStyle = '#2b2552'; x.font = '800 44px ui-monospace,Menlo,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 52);
  const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t;
}
function buildSign(){
  const g = new T3.Group(); mk(cylG(.6, .7, 11, 6), m3('#d9a97a'), 0, 5.5, 0, g);
  const b = mk(new T3.BoxGeometry(14, 5, .9), m3('#c99a6a'), 0, 8, 0, g); b.rotation.y = Math.PI/2;
  g.userData.board = b; g.userData.txt = ''; addShadow(g, 2.4); return g;
}

/* ---------- 地面、傳送池 ---------- */
const CK = .52;   // 角色整體縮放：浮島變大後人物相對縮小
const ISL = [-50, 80, -29, 101];   // 浮島範圍（x0, x1, y0, y1）：比戰場大很多，台階、樹林、小河都在島上
function treeAt(g, bi, x, y, z, k){   // 依生態放一棵低面數樹：森林圓冠樹、沙漠椰子樹、雪原雪松、熔岩水晶
  const t = new T3.Group(); t.position.set(x, y, z); t.scale.setScalar(k); t.rotation.y = aRnd(x*7 + z)*6; g.add(t);
  if (bi === 0){ mk(cylG(.9, 1.3, 6, 6), m3('#a8785a'), 0, 3, 0, t); for (const [cx, cy, cz, r, c] of [[0, 8.6, 0, 4.2, '#5fbf7a'], [2.2, 7.2, 1.2, 3, '#79d18e'], [-1.8, 10.4, -.6, 2.8, '#8fe0a0']]) mk(ico(r, 0), m3(c), cx, cy, cz, t); }
  else if (bi === 1){ for (let i = 0; i < 5; i++) mk(cylG(.7, .85, 2.2, 6), m3(i % 2 ? '#c99a62' : '#b5844f'), i*.35, 1.1 + i*2.1, 0, t).rotation.z = -.07; for (let i = 0; i < 6; i++){ const a = i/6*6.283; cone(t, i % 2 ? '#6fcf8a' : '#4fb070', Math.cos(a)*2.4 + 1.6, 10.4, Math.sin(a)*2.4, .9, 5.2, 4, Math.sin(a)*1.9, -Math.cos(a)*1.9); } }
  else if (bi === 2){ mk(cylG(.7, .9, 2.5, 6), m3('#a8785a'), 0, 1.2, 0, t); [[4.4, 3.4, 5], [3.5, 6.6, 4.4], [2.6, 9.6, 4]].forEach(([r, yy, h]) => { cone(t, '#7fcfae', 0, yy, 0, r, h, 7); cone(t, '#ffffff', 0, yy + h*.2, 0, r*.7, h*.66, 7); }); }
  else if (bi === 4){ mk(cylG(.7, .9, 14, 6), m3('#3a3f78'), 0, 7, 0, t); for (const [yy, c] of [[4, '#00e5ff'], [8, '#ff4fd8'], [12, '#00e5ff']]) mk(new T3.BoxGeometry(5, .6, 1.2), basic(c), 0, yy, 0, t); mk(ico(.8, 0), basic('#ff4fd8'), 0, 14.8, 0, t); }
  else if (bi === 5){ mk(cylG(.45, .5, 8, 6), m3('#ffffff'), 0, 4, 0, t); mk(ico(1, 1), m3(aRnd(x + z) > .5 ? '#ff8fc8' : '#8fe8ff'), 0, 10, 0, t).scale.set(3.6, 3.6, 3.6); mk(new T3.TorusGeometry(3.7, .4, 5, 12), m3('#ffffff'), 0, 10, 0, t).rotation.x = 1.2; }
  else { for (const [cx, cz, h, c] of [[0, 0, 9, '#ff9ac0'], [-1.8, 1, 5, '#c8a0ff'], [1.8, .4, 6, '#ffd0e8']]) mk(new T3.OctahedronGeometry(1.2, 0), m3(c, { emissive:c, emissiveIntensity:.25 }), cx, h/2, cz, t).scale.set(.9, h/2.4, .9); }
  return t;
}
function buildGround(bi){
  const B = BIOMES[bi], g = new T3.Group(), cx0 = BXW/2, cy0 = BYW/2;
  // 浮島：兩色地磚的頂面、土色側面，下方再收窄一層像懸空的岩塊
  const [X0, X1, Y0, Y1] = ISL, IW = X1 - X0, ID = Y1 - Y0, icx = (X0 + X1)/2, icy = (Y0 + Y1)/2;
  mk(new T3.BoxGeometry(IW, 6, ID), m3(B.board.d), icx, BZ - 3.05, icy, g);
  mk(new T3.BoxGeometry(IW - 10, 5, ID - 10), m3(B.board.m), icx, BZ - 8, icy, g);
  mk(new T3.BoxGeometry(IW - 26, 4, ID - 26), m3(B.board.d), icx, BZ - 12, icy, g);
  const N = 34, fc = document.createElement('canvas'); fc.width = fc.height = N; const fx = fc.getContext('2d');
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){ fx.fillStyle = (r + c) % 2 ? B.board.l : B.board.m; fx.fillRect(c, r, 1, 1); }
  const ft = new T3.CanvasTexture(fc); ft.magFilter = ft.minFilter = T3.NearestFilter; ft.colorSpace = T3.SRGBColorSpace;
  mk(new T3.PlaneGeometry(IW, ID).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:ft }), icx, BZ, icy, g);
  // 棋盤格步道
  const rows = Math.round(ID/2.5) - 16, cv = document.createElement('canvas'); cv.width = 4; cv.height = rows + 16; const cx = cv.getContext('2d');
  for (let r = 0; r < rows + 16; r++) for (let c = 0; c < 4; c++){ cx.fillStyle = (r + c) % 2 ? '#fff6fb' : ['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc', '#6fe0f0', '#ffb0e0'][bi]; cx.fillRect(c, r, 1, 1); }
  const tx = new T3.CanvasTexture(cv); tx.magFilter = T3.NearestFilter; tx.minFilter = T3.NearestFilter; tx.colorSpace = T3.SRGBColorSpace;
  const cvh = document.createElement('canvas'); cvh.width = rows + 16; cvh.height = 4; { const c2 = cvh.getContext('2d'); for (let r = 0; r < rows + 16; r++) for (let c = 0; c < 4; c++){ c2.fillStyle = (r + c) % 2 ? '#fff6fb' : ['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc', '#6fe0f0', '#ffb0e0'][bi]; c2.fillRect(r, c, 1, 1); } }
  const txh = new T3.CanvasTexture(cvh); txh.magFilter = txh.minFilter = T3.NearestFilter; txh.colorSpace = T3.SRGBColorSpace;
  mk(new T3.PlaneGeometry(10, ID).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:tx }), 15, BZ + .08, icy, g);   // 十字步道：連到四個出口
  mk(new T3.BoxGeometry(11, .3, ID), m3(B.board.d), 15, BZ - .1, icy, g);
  mk(new T3.PlaneGeometry(IW, 10).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:txh }), icx, BZ + .09, 15 + 21, g);
  mk(new T3.BoxGeometry(IW, .3, 11), m3(B.board.d), icx, BZ - .12, icy, g);
  // 中央廣場：主角站的圓形平台，外圈粉色
  mk(cylG(15, 15.6, .5, 28), m3(B.board.d), HX, BZ + .05, HY, g); mk(cylG(14, 14, .6, 28), m3('#fff6fb'), HX, BZ + .1, HY, g);
  mk(new T3.RingGeometry(9.6, 10.6, 28).rotateX(-Math.PI/2), basic(['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc', '#6fe0f0', '#ffb0e0'][bi]), HX, BZ + .42, HY, g); mk(new T3.RingGeometry(4.2, 4.8, 24).rotateX(-Math.PI/2), basic(B.glow, .8), HX, BZ + .43, HY, g);
  // 高低台階：離步道越遠越高，一格 6×6，頂面是草（或沙、雪），側面是土
  const top = m3(B.t1), side = m3(B.board.d), lip = m3(B.t2), ub = geo('ubox', () => new T3.BoxGeometry(1, 1, 1)), C = 6;
  const hAt = (i, j) => { const x = i*C + C/2, y = j*C + C/2, dx = x - HX, dy = y - HY, d = Math.hypot(dx, dy); if (d < 56 || Math.abs(dx) < 9 || Math.abs(dy) < 9) return 0; const front = dx > 0 && dy > 0, h = Math.floor((d - 56)/10 + aRnd(i*31 + j*17)*1.4)*3 + 3; return Math.min(front ? 3 : 6, h); };   // 中央是平地戰場，四個角落是高台；鏡頭在右前方，所以前方那個角落壓低
  const tops = [];
  for (let i = X0/C; i < X1/C; i++) for (let j = Y0/C; j < Y1/C; j++){
    const h = hAt(i, j); if (!h) continue; const x = i*C + C/2, z = j*C + C/2;
    mk(ub, side, x, BZ + h/2 - .2, z, g).scale.set(C, h - .4, C); mk(ub, top, x, BZ + h - .2, z, g).scale.set(C, .4, C);
    mk(ub, lip, x, BZ + h + .05, z, g).scale.set(C - .6, .1, C - .6);
    tops.push([x, BZ + h, z, i, j]);
  }
  // 四個出口：南、西、東各一座發光拱門，北邊是守關者的傳送門
  const arch = (x, y, rot) => { const a = new T3.Group(); a.position.set(x, BZ, y); a.rotation.y = rot; g.add(a); for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.8, 11, 1.8), m3('#d6d0ea'), sx*6.5, 5.5, 0, a); mk(new T3.BoxGeometry(15, 1.8, 2.2), m3('#d6d0ea'), 0, 11.2, 0, a); mk(new T3.BoxGeometry(11, .7, .5), basic(B.glow), 0, 11.2, 1.2, a); mk(new T3.BoxGeometry(11, .7, .5), basic(B.glow), 0, 11.2, -1.2, a); };
  
  const wx = -999;
  // 樹、樹樁、石頭、花：放在台階頂面與平地邊緣
  tops.forEach(([x, y, z, i, j], n) => {
    const r = aRnd(i*13 + j*7 + 3);
    if (r < .32) treeAt(g, bi, x + (aRnd(n)-.5)*2, y, z + (aRnd(n + 1)-.5)*2, .75 + aRnd(n + 2)*.5);
    else if (r < .48) mk(cylG(1.2, 1.4, 1.3, 7), m3('#b5844f'), x, y + .65, z, g);
    else if (r < .58) mk(new T3.DodecahedronGeometry(1.2, 0), m3('#c8c2e0'), x, y + .7, z, g).scale.set(1.2, .8, 1);
  });
  for (let n = 0; n < 70; n++){
    const x = cx0 + (aRnd(n*3 + 1) < .5 ? -1 : 1)*(6 + aRnd(n*3 + 2)*16), y = Y0 + 2 + aRnd(n*3 + 3)*(ID - 4); if (Math.abs(x - wx) < 4) continue;
    if (bi === 0){ if (n % 3 === 0){ mk(ico(.7, 0), m3(['#ffd1e6', '#fff3a8', '#ffffff'][(n/3|0) % 3]), x, BZ + 1.3, y, g); mk(cylG(.08, .08, 1.2, 3), m3('#6aa27a'), x, BZ + .7, y, g); } else cone(g, '#79c98c', x, BZ + .9, y, .55, 1.8, 4); }
    else if (bi === 1) mk(new T3.DodecahedronGeometry(.5 + aRnd(n)*.5, 0), m3(n % 2 ? B.board.d : '#fff0c8'), x, BZ + .6, y, g);
    else if (bi === 2) mk(cylG(1.3 + aRnd(n), 1.5 + aRnd(n), .25, 6), m3(n % 2 ? '#ffffff' : '#bfe3f5'), x, BZ + .2, y, g);
    else if (bi === 4) mk(new T3.BoxGeometry(n % 2 ? 3.4 : .5, .12, n % 2 ? .5 : 3.4), basic(n % 3 ? '#00e5ff' : '#ff4fd8'), x, BZ + .15, y, g);
    else if (bi === 5) mk(new T3.BoxGeometry(.7, .7, .7), m3(['#ff8fc8', '#8fe8ff', '#ffe08a', '#b9a0ff'][n % 4]), x, BZ + .4, y, g).rotation.set(aRnd(n), aRnd(n + 1)*3, 0);
    else if (n % 2) mk(new T3.BoxGeometry(3.4, .12, .5), basic('#ff8fb0'), x, BZ + .15, y, g).rotation.y = aRnd(n)*3;
    else mk(new T3.DodecahedronGeometry(.6, 0), m3(B.board.d), x, BZ + .6, y, g);
  }
  return bake(g);
}
function bake(g){   // 把靜態場景依材質合併成少數幾個網格，上千個方塊與樹也只要十幾次繪製
  g.updateMatrixWorld(true); const groups = new Map(), keep = [];
  g.traverse(o => {
    if (!o.isMesh) return; const m = o.material; if (m.map){ keep.push(o); return; }
    const k = m.type + m.color.getHexString() + m.opacity + (m.emissive ? m.emissive.getHexString() + m.emissiveIntensity : '');
    const geom = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    if (!groups.has(k)) groups.set(k, { m, list:[] }); groups.get(k).list.push(geom);
  });
  const out = new T3.Group(); keep.forEach(o => out.add(o));
  for (const { m, list } of groups.values()){
    const n = list.reduce((a, q) => a + q.attributes.position.count, 0), P = new Float32Array(n*3), Nn = new Float32Array(n*3); let off = 0;
    for (const q of list){ P.set(q.attributes.position.array, off*3); Nn.set(q.attributes.normal.array, off*3); off += q.attributes.position.count; q.dispose(); }
    const bg = new T3.BufferGeometry(); bg.setAttribute('position', new T3.BufferAttribute(P, 3)); bg.setAttribute('normal', new T3.BufferAttribute(Nn, 3));
    out.add(new T3.Mesh(bg, m));
  }
  return out;
}
const stoneM = () => m3('#d6d0ea');
function buildPortal(){   // 八道「裂縫」：發光的地面裂口，小怪從這裡鑽出來（守關者則從天上掉下來）
  const g = new T3.Group(), B = BIOMES[biomeNow()], glows = [], rings = [];
  RIFTS.forEach(([sx, sy], k) => {
    const r = new T3.Group(); r.position.set(sx, BZ, sy); g.add(r);
    mk(cylG(7.5, 8, .5, 10), stoneM(), 0, .25, 0, r);
    mk(new T3.CircleGeometry(6, 12).rotateX(-Math.PI/2), basic(B.portal), 0, .6, 0, r);
    const glow = mk(new T3.CircleGeometry(3.6, 10).rotateX(-Math.PI/2), basic(B.glow), 0, .7, 0, r); glows.push(glow);
    for (let i = 0; i < 2; i++){ const t = mk(new T3.TorusGeometry(4.6, .2, 4, 8, 1.3), basic('#ffffff'), 0, .8, 0, r); t.rotation.x = Math.PI/2; rings.push(t); }
    for (let i = 0; i < 5; i++){ const a = i*1.26 + k, c = mk(new T3.BoxGeometry(1.1, .3, 5 + (i%2)*2.5), basic('#2b2552'), Math.cos(a)*7.5, .35, Math.sin(a)*7.5, r); c.rotation.y = -a; }   /* 放射狀裂紋 */
  });
  g.userData = { glows, rings }; return g;
}

/* ---------- 掉落物 ---------- */
function buildDrop(d){
  const g = new T3.Group(), col = d.kind === 'gem' ? '#a87bf0' : d.kind === 'cart' ? '#3fd0ee' : d.kind === 'map' ? BIOMES[d.map.biome].glow : RAR[d.it.r].g, rare = d.kind !== 'item' || d.it.r >= 2, item = new T3.Group(); g.add(item); g.userData.item = item;
  if (d.kind === 'cart'){ mk(new T3.BoxGeometry(2.6, 3.2, .9), m3(col, { emissive:col, emissiveIntensity:.3 }), 0, 2.4, 0, item); mk(new T3.BoxGeometry(1.6, .9, 1.1), m3('#fff0c0'), 0, 3.2, 0, item); }
  else if (d.kind === 'gem') mk(new T3.OctahedronGeometry(1.7, 0), m3(col, { emissive:col, emissiveIntensity:.25 }), 0, 2.2, 0, item);
  else if (d.kind === 'map'){ mk(cylG(.9, .9, 4.4, 6), m3('#fff0c0'), 0, 1.6, 0, item).rotation.z = Math.PI/2; for (const sx of [-2.3, 2.3]) mk(ico(.7, 0), m3('#ffd35a'), sx, 1.6, 0, item); mk(ico(.7, 0), m3(BIOMES[d.map.biome].portal, { emissive:col, emissiveIntensity:.4 }), 0, 2.6, 0, item); }
  else if (d.it.slot === 'weapon'){ const w = new T3.Group(); item.add(w); mk(new T3.BoxGeometry(.9, 5.6, .35), m3(col, { emissive:col, emissiveIntensity:.15 }), 0, 3.8, 0, w); mk(cylG(.35, .35, 2, 5), m3('#7a5a8a'), 0, 0, 0, w); mk(new T3.BoxGeometry(2.4, .5, .8), m3('#ffd35a'), 0, 1, 0, w); w.rotation.z = Math.PI/3; w.position.y = 1.6; }
  else if (d.it.slot === 'armor'){ mk(cylG(1.5, 2.1, 3.2, 7), m3(col, { emissive:col, emissiveIntensity:.15 }), 0, 2, 0, item); for (const sx of [-1, 1]) mk(ico(1, 0), m3(col), sx*2, 3.3, 0, item); }
  else { mk(new T3.TorusGeometry(1.4, .45, 5, 8), m3('#ffe27a'), 0, 2, 0, item).rotation.x = Math.PI/2.6; mk(ico(.75, 0), m3(col, { emissive:col, emissiveIntensity:.35 }), 0, 3.5, 0, item); }
  const disc = mk(geo('shadow', () => new T3.CircleGeometry(1, 14).rotateX(-Math.PI/2)), basic(col, .4), 0, .08, 0, g); disc.scale.set(4, 1, 3); g.userData.disc = disc;
  if (rare) g.userData.beam = mk(cylG(1, 1, 17, 8), basic(col, .25), 0, 8.5, 0, g);
  return g;
}

/* ---------- 場景管理 ---------- */
function r3init(){
  const cv = document.createElement('canvas'); cv.id = 'cv3'; cv.style.cssText = 'position:absolute;pointer-events:none;z-index:-1;left:0;top:0';
  document.body.appendChild(cv);
  const rd = R3.rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true, preserveDrawingBuffer:!!(navigator.webdriver || location.search.includes('static')) });
  rd.setPixelRatio(1); rd.setClearColor(0x000000, 0); rd.outputColorSpace = T3.SRGBColorSpace;
  const sc = R3.sc = new T3.Scene();
  sc.add(new T3.HemisphereLight(0xeaf5ff, 0xd8c8f0, 1.55));
  const sun = new T3.DirectionalLight(0xfff6ea, 1.5); sun.position.set(30, 60, 50); sc.add(sun);
  sc.add(new T3.AmbientLight(0xffffff, .25));
  R3.cam = new T3.OrthographicCamera(-1, 1, 1, -1, -400, 600);
  R3.world = new T3.Group(); sc.add(R3.world); R3.fx = new T3.Group(); sc.add(R3.fx);
  R3.hero = null; R3.gnd = null; R3.portal = null; R3.decor = []; R3.bi = -1; R3.ready = true;
  const ov = document.createElement('div'); ov.id = 'fxo'; ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9;opacity:0'; document.body.appendChild(ov);
  const fg = document.getElementById('fig'); fg.style.touchAction = 'none';   // 單指或滑鼠拖曳旋轉、雙指捏合縮放加扭轉、滾輪縮放、Q/E 轉向、雙擊還原
  const P = new Map(), cl = (v, a, b) => Math.max(a, Math.min(b, v)); let g0 = null;
  const meas = () => { const [a, b] = [...P.values()]; return { d:Math.hypot(a.x - b.x, a.y - b.y) || 1, r:Math.atan2(b.y - a.y, b.x - a.x) }; };
  fg.addEventListener('pointerdown', e => { P.set(e.pointerId, { x:e.clientX, y:e.clientY }); g0 = P.size === 2 ? { ...meas(), z:FXO.zoomT, y:FXO.yawT } : { x:e.clientX, y:FXO.yawT, on:false }; });
  addEventListener('pointermove', e => { const q = P.get(e.pointerId); if (!q) return; q.x = e.clientX; q.y = e.clientY;
    if (P.size === 2 && g0 && g0.d){ const m = meas(); FXO.zoomT = cl(g0.z*m.d/g0.d, .8, 2.2); FXO.yawT = cl(g0.y - (m.r - g0.r), -1.1, 1.1); }
    else if (P.size === 1 && g0 && g0.x != null){ const dx = e.clientX - g0.x; if (!g0.on && Math.abs(dx) > 6) g0.on = true; if (g0.on) FXO.yawT = cl(g0.y + dx*.005, -1.1, 1.1); } });
  const up = e => { P.delete(e.pointerId); g0 = P.size === 2 ? { ...meas(), z:FXO.zoomT, y:FXO.yawT } : null; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  fg.addEventListener('dblclick', () => { FXO.yawT = 0; FXO.zoomT = 1; });
  fg.addEventListener('wheel', e => { e.preventDefault(); FXO.zoomT = cl(FXO.zoomT*Math.exp(-e.deltaY*.0012), .8, 2.2); }, { passive:false });
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'q' || e.key === 'Q') FXO.yawT = cl(FXO.yawT - .25, -1.1, 1.1); if (e.key === 'e' || e.key === 'E') FXO.yawT = cl(FXO.yawT + .25, -1.1, 1.1); });
}
function r3frame(){   // 讓 canvas 對齊 #fig，並用同一個外框決定相機視野
  const fig0 = document.getElementById('fig'), vb0 = fig0.viewBox.baseVal, ptv = innerHeight > innerWidth;
  const frameRatio=document.body.classList.contains('watch-mode')?(visualViewport?.height||innerHeight)/Math.max(1,fig0.getBoundingClientRect().width):MOB()?mobRatio():Math.max(.45,Math.min(1.1,(innerHeight-150)/Math.max(1,fig0.getBoundingClientRect().width)));
  if(vb0.width && Math.abs(vb0.height/vb0.width-frameRatio)>.01)fig0.setAttribute('viewBox',`0 0 ${vb0.width} ${vb0.width*frameRatio}`);
  const fig = document.getElementById('fig'), r = fig.getBoundingClientRect(), W = Math.max(2, r.width), H = Math.max(2, r.height), dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = R3.rd.domElement; cv.style.imageRendering = R3.clean ? 'auto' : 'pixelated'; cv.style.left = (r.left + scrollX) + 'px'; cv.style.top = (r.top + scrollY) + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const buffer=r3BufferSize(W,H,dpr,R3.clean);
  R3.W=W;R3.H=H;R3.dpr=dpr;
  if(buffer.width!==cv.width||buffer.height!==cv.height)R3.rd.setSize(buffer.width,buffer.height,false);
  const now = performance.now(), fdt = Math.min(.1, (now - (R3.tPrev || now))/1000); R3.tPrev = now;
  FXO.yaw += (FXO.yawT - FXO.yaw)*Math.min(1, fdt*8); FXO.zoom += (FXO.zoomT - FXO.zoom)*Math.min(1, fdt*8); FXO.shake *= Math.pow(.0008, fdt); FXO.punch *= Math.pow(.003, fdt); FXO.flash *= Math.pow(.02, fdt);
  { const o = document.getElementById('fxo'), low = G.st && G.h.hp < G.st.life*.3 && G.h.dead <= 0, a = Math.max(FXO.flash, low ? .22 + .08*Math.sin(now/180) : 0); if (o){ o.style.opacity = a > .01 ? a.toFixed(2) : 0; o.style.background = `radial-gradient(ellipse at center, transparent 40%, ${FXO.flash > .12 || !low ? FXO.fc : '#ff2a50'} 140%)`; } }
  const cam = R3.cam, tgt = new T3.Vector3(BXW/2, BZ + 6, BYW/2); cam.position.copy(tgt).add((innerHeight > innerWidth ? new T3.Vector3(.34, .8, 1) : new T3.Vector3(1, .86, 1)).normalize().applyAxisAngle(new T3.Vector3(0, 1, 0), FXO.yaw).multiplyScalar(160)); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [ISL[0], ISL[1]]) for (const y of [ISL[2], ISL[3]]) for (const z of [BZ - 14, BZ + 14]){ const p = new T3.Vector3(x, z, y).applyMatrix4(cam.matrixWorldInverse); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  let bw = x1 - x0, bh = y1 - y0, ar = W/H, cx = (x0 + x1)/2, cy = (y0 + y1)/2 - bh*.03;   // 整座浮島放進畫框，留一點天空
  let vw = bw*(ptv ? .8 : 1.03), vh = bh*(ptv ? .84 : 1.05); if (vw/vh < ar) vw = vh*ar; else vh = vw/ar;   // 手機直式拉近、裁掉島的左右，裁切處用 CSS 淡出
  if (WOV.has('zoom')){ const z = +WOV.get('zoom'), p = new T3.Vector3(G.h.x, BZ + 10, G.h.y).applyMatrix4(cam.matrixWorldInverse); vw /= z; vh /= z; cx = p.x; cy = p.y; }   // 測試用：?zoom=6 把鏡頭拉近到主角
  if (FXO.zoom !== 1){ const z = FXO.zoom, f = tClamp((z - 1)/1.2), p = new T3.Vector3(G.h.x, BZ + 10, G.h.y).applyMatrix4(cam.matrixWorldInverse); vw /= z; vh /= z; if (z > 1){ cx = tLerp(cx, p.x, f); cy = tLerp(cy, p.y, f); } }
  vw *= 1 - FXO.punch*.025; vh *= 1 - FXO.punch*.025; cx += (Math.random() - .5)*FXO.shake*vw*.012; cy += (Math.random() - .5)*FXO.shake*vh*.012;
  cam.left = cx - vw/2; cam.right = cx + vw/2; cam.top = cy + vh/2; cam.bottom = cy - vh/2; cam.updateProjectionMatrix();
  const vb = fig.viewBox.baseVal; R3.vbW = vb.width; R3.vbH = vb.height;
}
const pj = (x, y, z) => { const v = new T3.Vector3(x, z, y).project(R3.cam); return [(v.x + 1)/2*R3.vbW, (1 - v.y)/2*R3.vbH]; };
const pxu = () => { const a = new T3.Vector3(0, 0, 0).project(R3.cam), b = new T3.Vector3(1, 0, -1).normalize().project(R3.cam); return Math.abs(b.x - a.x)/2*R3.vbW; };   // 一個遊戲單位約等於幾個 SVG 單位

function entFor(key, build){ let e = R3.ent.get(key); if (!e){ e = build(); R3.world.add(e); R3.ent.set(key, e); } e.userData.seen = true; return e; }
const MPOSE_WALK = { hips:[0, 0, 0], torso:[.15, 0, 0], head:[0, 0, 0], armL:[0, 0, -.15], foreL:[-.4, 0, 0], armR:[0, 0, .15], foreR:[-.7, 0, 0], legL:[0, 0, 0], shinL:[.2, 0, 0], legR:[0, 0, 0], shinR:[.2, 0, 0] };
const MPOSE_FIGHT = { hips:[0, 0, 0], torso:[.15, 0, 0], head:[0, 0, 0], armL:[-.6, 0, -.3], foreL:[-.9, 0, 0], armR:[-1.2, 0, .2], foreR:[-.8, 0, 0], legL:[.35, 0, 0], shinL:[.5, 0, 0], legR:[-.3, 0, 0], shinR:[.4, 0, 0] };
const MPOSE_ATK = { hips:[.25, 0, 0], torso:[.65, 0, 0], head:[.35, 0, 0], armL:[-1.5, 0, -.5], foreL:[-.6, 0, 0], armR:[-2.9, 0, .1], foreR:[-.3, 0, 0], legL:[.9, 0, 0], shinL:[.4, 0, 0], legR:[-.9, 0, 0], shinR:[.9, 0, 0] };
const MPOSE_HURT = { hips:[-.2, 0, 0], torso:[-.55, .2, .1], head:[-.55, 0, .25], armL:[-.7, 0, -1.1], foreL:[-.4, 0, 0], armR:[-1.1, 0, 1.1], foreR:[-.5, 0, 0], legL:[-.3, 0, 0], shinL:[.5, 0, 0], legR:[.3, 0, 0], shinR:[.6, 0, 0] };
const MPOSE_TMP = {};
function monLook(m, g){
  const t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, dl = Math.hypot(G.h.x - m.x, G.h.y - m.y) || 1, y = m.y + 3*lg*(G.h.y - m.y)/dl, lx = m.x + 3*lg*(G.h.x - m.x)/dl, ps = g.userData, base = (ps.s || 1)*CK;
  at3(g, lx, y, BZ + (m.fall > 0 ? 70*Math.pow(m.fall/.9, 2) : 0)); g.rotation.y = Math.atan2(G.h.x - m.x, G.h.y - m.y);   // 面向主角
  if (m.type === 'slime'){ g.scale.setScalar(base); const sq = 1 + .16*Math.sin(t*5) + (m.lunge >= 0 ? .35*Math.sin(Math.PI*m.lunge/.3) : 0); ps.jelly.scale.set(Math.sqrt(sq), 1/sq, Math.sqrt(sq)); g.position.y += lg*4; g.rotation.x = -.35*lg; }
  else if (m.type === 'drone'){ g.scale.setScalar(base); g.position.y += 5 + Math.sin(t*4 + m.ph)*1.6 + lg*3; g.rotation.x = .25 + lg*.5; for (const r of ps.rotors) r.rotation.y = t*40; }
  else if (m.type === 'bomb'){ const low = 1 - tClamp(m.hp/m.hpMax), sq = 1 + .06*Math.sin(t*(5 + low*14)); g.scale.set(base*sq, base/sq, base*sq); g.position.y += Math.abs(Math.sin(t*5))*1.2 + lg*3; g.rotation.x = lg*.4; ps.spark.scale.setScalar(.7 + .5*Math.abs(Math.sin(t*12))); ps.spark.material.color.set(Math.sin(t*(8 + low*20)) > 0 ? '#ff3a2a' : '#ffd35a'); }
  else {
    const B = ps.B, w = Math.sin(t*9), f = Math.sin(t*3), big = m.type === 'brute' || m.type === 'boss';
    const hop = m.fight ? 0 : Math.abs(w), lean = big ? 1.25 : 1;
    g.position.y += hop*(big ? 1.1 : 1.6) + lg*4;
    let pose;
    if (m.hurtT > 0) pose = MPOSE_HURT;
    else if (m.lunge >= 0) pose = poseMix(MPOSE_FIGHT, MPOSE_ATK, lg);   // 蓄勢後大幅前撲、手臂掄過頭
    else if (m.fight) pose = poseMix(MPOSE_FIGHT, MPOSE_FIGHT, 0, MPOSE_TMP), pose.torso = [.15 + f*.06, f*.1, 0], pose.armR = [-1.2 + f*.35, 0, .2], pose.foreR = [-.8, 0, 0], pose.armL = [-.6 - f*.3, 0, -.3], pose.head = [f*.05, Math.sin(t*1.5)*.15, 0];
    else pose = poseMix(MPOSE_WALK, MPOSE_WALK, 0, MPOSE_TMP), pose.legL = [-w*.95, 0, 0], pose.legR = [w*.95, 0, 0], pose.shinL = [.2 + Math.max(0, w)*.9, 0, 0], pose.shinR = [.2 + Math.max(0, -w)*.9, 0, 0], pose.armL = [w*.9, 0, -.15], pose.armR = [-w*.9 - .2, 0, .15], pose.foreR = [-.7, 0, 0], pose.torso = [.16*lean, w*.12, 0], pose.hips = [0, -w*.1, 0], pose.head = [-.1 + Math.abs(w)*.1, Math.sin(t*2)*.1, 0];
    applyPose(B, pose, m.lunge >= 0 ? .8 : .5);
    const tilt = m.hurtT > 0 ? -.35 : lg*.35;   // 整體前傾、受擊後仰（細節由骨架負責）
    ps.tilt = (ps.tilt || 0) + (tilt - (ps.tilt || 0))*.4; g.rotation.x = ps.tilt;
    const st = m.fight ? 1 : 1 + (hop - .5)*.1 + lg*.15; g.scale.set(base/Math.sqrt(st), base*st, base/Math.sqrt(st));
  }
  if (m.dead){ const u = Math.min(1, m.deadT/.4); g.scale.setScalar(Math.max(.01, base*(1 - u*.4))); g.rotation.x = -1.3*u; g.position.y += Math.sin(u*Math.PI)*6; for (const mt of ps.mats || []){ mt.transparent = true; mt.opacity = Math.max(0, 1 - u); } if (ps.sh) ps.sh.visible = false; }
  else if (m.frozen > 0) flash(g, '#9fe0ff', .55); else if (m.hurtT > 0) flash(g, '#ffffff', .7); else if (m.burn > 0) flash(g, '#ff8a3c', .3 + .12*Math.sin(G.time*14)); else if (m.shock > 0) flash(g, '#ffe45c', .25); else flash(g, '#000000', 0);
  if (m.elite){ if (!ps.eliteRing){ ps.eliteRing = mk(new T3.RingGeometry(5.5, 7, 24).rotateX(-Math.PI/2), basic('#ffd35a', .9), 0, .5, 0, g); ps.eliteRing.material.side = T3.DoubleSide; mk(ico(.8, 0), basic('#ffd35a', .9), 0, 17, 0, g); } g.scale.multiplyScalar(1.3); ps.eliteRing.rotation.y = t*2; }
  if (m.hurtT > 0) g.scale.multiplyScalar(1 + m.hurtT*1.4);   // 挨打時瞬間脹大一下
}
/* 骨架動作：每個姿勢是 {骨骼: [x, y, z 旋轉（弧度）]}。手臂與腿的 x 為負 = 向前；小腿 x 為正 = 膝蓋彎曲。 */
const POSE_IDLE = { hips:[0, 0, 0], torso:[.04, 0, 0], head:[0, 0, 0], tail:[0, 0, 0], armL:[.15, 0, -.12], foreL:[-.3, 0, 0], armR:[-.3, 0, .1], foreR:[-1, 0, 0], legL:[.1, 0, 0], shinL:[.15, 0, 0], legR:[-.15, 0, 0], shinR:[.2, 0, 0] };
const POSE_WIND = { hips:[0, .7, 0], torso:[-.35, .7, -.1], head:[-.2, -.3, 0], tail:[.5, 0, 0], armL:[.7, 0, -.7], foreL:[-.6, 0, 0], armR:[-2.7, 0, .3], foreR:[-.5, 0, 0], legL:[.5, 0, 0], shinL:[.6, 0, 0], legR:[-.4, 0, 0], shinR:[.5, 0, 0] };
const POSE_HIT = { hips:[.1, -.6, 0], torso:[.6, -.9, .1], head:[.3, .5, 0], tail:[-.9, 0, 0], armL:[-1.2, 0, -.9], foreL:[-.7, 0, 0], armR:[-.5, 0, .1], foreR:[-.25, 0, 0], legL:[-.9, 0, 0], shinL:[.3, 0, 0], legR:[.7, 0, 0], shinR:[.9, 0, 0] };
const POSE_HURT = { hips:[-.2, 0, 0], torso:[-.5, .2, .1], head:[-.5, 0, .2], tail:[.8, 0, 0], armL:[-.6, 0, -1], foreL:[-.4, 0, 0], armR:[-1.1, 0, 1], foreR:[-.6, 0, 0], legL:[-.2, 0, 0], shinL:[.5, 0, 0], legR:[.3, 0, 0], shinR:[.6, 0, 0] };
const POSE_CAST = { hips:[0, 0, 0], torso:[-.2, 0, 0], head:[-.4, 0, 0], tail:[.3, 0, 0], armL:[-2.3, 0, -.4], foreL:[-.3, 0, 0], armR:[-2.3, 0, .4], foreR:[-.3, 0, 0], legL:[.2, 0, 0], shinL:[.3, 0, 0], legR:[-.2, 0, 0], shinR:[.3, 0, 0] };
const poseMix = (A, B, u, out = {}) => { for (const k in A){ const a = A[k], b = B[k]; out[k] = [a[0] + (b[0] - a[0])*u, a[1] + (b[1] - a[1])*u, a[2] + (b[2] - a[2])*u]; } return out; };
function applyPose(B, pose, k){   // k：向目標姿勢靠近的速度，讓切換有緩衝
  for (const n in pose){ if (!B[n]) continue; const r = B[n].rotation, p = pose[n]; r.x += (p[0] - r.x)*k; r.y += (p[1] - r.y)*k; r.z += (p[2] - r.z)*k; }
}
function heroLook(g){
  const h = G.h, t = G.time, ps = g.userData, B = ps.B, sw = h.swingT >= 0 ? tClamp(h.swingT/.3) : -1, SC = .85*CK;
  let pose, k = .5, hop = 0, st = 1;
  if (sw >= 0){   // 蓄力（0 到 .3）、劈砍（.3 到 .55）、停頓後收招
    if (sw < .3) pose = poseMix(POSE_IDLE, POSE_WIND, ease(sw/.3));
    else if (sw < .55) pose = poseMix(POSE_WIND, POSE_HIT, ease((sw - .3)/.25)), k = .8;
    else pose = POSE_HIT;
    hop = Math.sin(Math.PI*sw)*3.2; st = 1 + .16*Math.sin(Math.PI*Math.min(1, sw*1.4));
  } else if (h.hurtT > 0){ pose = POSE_HURT; k = .7; }
  else if (h.castT >= 0){ pose = poseMix(POSE_IDLE, POSE_CAST, ease(tClamp(h.castT/.25))); }
  else { pose = poseMix(POSE_IDLE, POSE_IDLE, 0); pose.torso = [.04 + Math.sin(t*3)*.04, Math.sin(t*1.5)*.08, 0]; pose.armL = [.15 + Math.sin(t*3)*.12, 0, -.12]; pose.head = [Math.sin(t*3 + 1)*.05, Math.sin(t*1.5)*.1, 0]; pose.tail = [Math.sin(t*3.5)*.4, 0, 0]; pose.foreR = [-1 + Math.sin(t*3)*.08, 0, 0]; st = 1 + .025*Math.sin(t*3); hop = Math.max(0, Math.sin(t*3)*.5); }
  applyPose(B, pose, k);
  if (h.mv > 1){ const wv = Math.sin(t*14)*.9*Math.min(1, h.mv/12); pose.legL = [-wv, 0, 0]; pose.legR = [wv, 0, 0]; pose.shinL = [.2 + Math.max(0, wv)*.9, 0, 0]; pose.shinR = [.2 + Math.max(0, -wv)*.9, 0, 0]; hop += Math.abs(wv)*.9; applyPose(B, pose, k); }   /* 走路：腿擺動，招式動作保留在上半身 */
  const dd = h.dash ? Math.sin(Math.PI*h.dash.t/.3)*10 : 0;
  at3(g, h.x + (h.dash ? Math.cos(h.dash.a)*dd : 0) + (h.hurtT > 0 ? Math.sin(t*90)*.8 : 0), h.y + (h.dash ? Math.sin(h.dash.a)*dd : 0), BZ + hop); { const tg = nearestMon(false); if (tg) ps.face = Math.atan2(tg.x - h.x, tg.y - h.y); let d = (ps.face ?? (WOV.has('face') ? +WOV.get('face') : Math.PI)) - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d*.25; }   // 轉身面向最近的怪 g.rotation.x = 0;
  g.scale.set(SC/Math.sqrt(st), SC*st, SC/Math.sqrt(st));
  if (h.castT >= 0){ const u = ease(tClamp(h.castT/.25)); ps.orb.visible = true; ps.orb.material.color.set((SKILLS[h.castSk] || SKILLS.FIRE).col); ps.orb.scale.setScalar(Math.max(.01, u)); } else ps.orb.visible = false;
}

function updateFx(){
  const fx = R3.fx; while (fx.children.length){ const c = fx.children.pop(); c.material && c.material.dispose(); }
  const add = (geom, mat, x, y, z, s=1) => { const o = new T3.Mesh(geom, mat); o.position.set(x, z, y); o.scale.setScalar(s); fx.add(o); return o; };
  const sph = geo('fxs', () => ico(1, 1)), disc = geo('fxd', () => new T3.CircleGeometry(1, 28).rotateX(-Math.PI/2));
  for (const e of G.fx){
    if (e.k === 'ring'){ const r = tLerp(2, 20, ease(e.t)), o = add(geo('fxr', () => new T3.RingGeometry(.88, 1, 36).rotateX(-Math.PI/2)), basic(e.col, (1 - e.t)*.85), e.x, e.y, BZ + .5, r); o.material.side = T3.DoubleSide; add(disc, basic(e.col, (1 - e.t)*.18), e.x, e.y, BZ + .4, r*.9); }
    if (e.k === 'pillar'){ const o = add(geo('fxp', () => new T3.CylinderGeometry(1, 1, 1, 10, 1, true)), basic(e.col, (1 - e.t)*.45), e.x, e.y, BZ + 14*e.t + 8, 1); o.scale.set(tLerp(3.5, 1, e.t), 18 + 10*e.t, tLerp(3.5, 1, e.t)); o.material.side = T3.DoubleSide; }
    if (e.k === 'shard'){ for (let i = 0; i < 7; i++){ const a = i*.897 + 1.3, d = tLerp(1, 8 + (i % 3)*2.5, ease(e.t)); add(geo('fxf', () => new T3.BoxGeometry(1.2, .25, 1.2)), basic(i % 2 ? e.col : '#ffffff', (1 - e.t)*.9), e.x + Math.cos(a)*d, e.y + Math.sin(a)*d, e.z + Math.sin(e.t*3.14)*6 + (i % 3)*1.2, (1 - e.t)*.9 + .2); } }
    if (e.k === 'ghost'){ for (let i = 0; i < 6; i++){ const u = i/5; add(geo('fxg', () => new T3.CylinderGeometry(1.6, 2.2, 1, 6)), basic(e.col, (1 - e.t)*(.1 + .35*u)), tLerp(e.x, e.x2, u), tLerp(e.y, e.y2, u), BZ + 8, 1).scale.set(1, 15, 1); } }
    if (e.k === 'boom'){ const R = tLerp(2, e.big ? 16 : 9, ease(e.t)); add(sph, basic(e.col || '#ff9a3c', (1 - e.t)*.8), e.x, e.y, e.z, R); add(sph, basic('#ffe08a', 1 - e.t), e.x, e.y, e.z, R*.55); }
    if (e.k === 'slash'){ const R = tLerp(3, 7, e.t); for (let i = 0; i < 5; i++){ const a = i*1.2566 + .4, o = add(geo('fxb', () => new T3.BoxGeometry(1, .22, .22)), basic('#ffffff', 1 - e.t), e.x + 2 + Math.cos(a)*R*.7, e.y, e.z + Math.sin(a)*R*.7, R*.5); o.rotation.z = a; } }
    if (e.k === 'nova'){ const r = tLerp(3, 46, ease(e.t)), o = add(geo('fxr', () => new T3.RingGeometry(.88, 1, 36).rotateX(-Math.PI/2)), basic('#9fe0ff', (1 - e.t)*.7), G.h.x, G.h.y, BZ + .6, r); o.material.side = T3.DoubleSide; add(disc, basic('#9fe0ff', (1 - e.t)*.25), G.h.x, G.h.y, BZ + .5, r);
      for (let i = 0; i < 14; i++){ const aa = i*.449 + e.t*2, o2 = add(geo('fxf', () => new T3.BoxGeometry(1.2, .25, 1.2)), basic('#ffffff', 1 - e.t), G.h.x + Math.cos(aa)*r*.9, G.h.y + Math.sin(aa)*r*.9, BZ + 2 + (i % 3)*1.5); o2.rotation.y = aa; }   // 冷氣吹出的雪花片
    }
    if (e.k === 'bolt'){ const pts = []; e.pts.forEach((p, i) => { if (i) pts.push([(e.pts[i-1][0] + p[0])/2 + aRnd(i + e.t*9)*4 - 2, (e.pts[i-1][1] + p[1])/2 + aRnd(i*3 + e.t*7)*4 - 2, (e.pts[i-1][2] + p[2])/2 + 2]); pts.push(p); });
      for (let i = 1; i < pts.length; i++){ const a = pts[i-1], b = pts[i], len = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]), o = add(geo('fxc', () => new T3.CylinderGeometry(.5, .5, 1, 4)), basic('#ff3a5a', 1 - e.t), (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2); o.scale.set(1, len, 1); o.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), new T3.Vector3(b[0]-a[0], b[2]-a[2], b[1]-a[1]).normalize()); } }
  }
  for (const p of G.proj){
    if (p.k === 'meteor'){ const u = tClamp(p.t), z = tLerp(70, BZ + 2, u*u), rr = tLerp(2, 7, u); add(disc, basic('#e2483d', .15 + .3*u), p.x, p.y, BZ + .3, rr);
      add(sph, basic('#ffb347', .3), p.x, p.y, z + 3, 6);
      const sat = new T3.Group(); sat.position.set(p.x, z, p.y); sat.rotation.set(u*3, u*5, .4); fx.add(sat);   // 衛星墜落：金箔機身、兩片太陽能板、白色天線碟
      mk(geo('satB', () => new T3.BoxGeometry(3, 3, 3)), m3('#ffd35a', { emissive:'#ff9a3c', emissiveIntensity:.3 }), 0, 0, 0, sat);
      for (const sx of [-1, 1]){ mk(geo('satP', () => new T3.BoxGeometry(5, .25, 2.6)), m3('#3a5fd0'), sx*4.4, 0, 0, sat); mk(geo('satR', () => new T3.BoxGeometry(1.4, .3, .3)), m3('#cfd6e0'), sx*2.1, 0, 0, sat); }
      mk(geo('satD', () => new T3.ConeGeometry(1.6, 1, 10, 1, true)), m3('#ffffff'), 0, 2.1, 0, sat); continue; }
    if (p.t < 0 || !p.tg) continue; const u = tClamp(p.t), a = [G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2*CK], b = [p.tg.x, p.tg.y, BZ + 6*CK], at = uu => [tLerp(a[0], b[0], uu), tLerp(a[1], b[1], uu), tLerp(a[2], b[2], uu) + Math.sin(uu*Math.PI)*5];
    for (let k = 3; k >= 1; k--){ const q = at(Math.max(0, u - k*.06)); add(sph, basic(k % 2 ? '#ffe08a' : '#ff9a3c', .55 - k*.12), q[0], q[1], q[2], .9 - k*.15); }   // 火花拖尾
    const q = at(u), bat = new T3.Group(); bat.position.set(q[0], q[2], q[1]); bat.rotation.set(u*14, 0, u*9); fx.add(bat);   // 過熱電池：深色筒身、橘色電量條、銀色正極
    mk(geo('batB', () => cylG(1, 1, 3, 8)), m3('#2b2552'), 0, 0, 0, bat); mk(geo('batS', () => cylG(1.04, 1.04, 1, 8)), m3('#ff7a2a', { emissive:'#ff7a2a', emissiveIntensity:.6 }), 0, .4, 0, bat); mk(geo('batT', () => cylG(.4, .4, .5, 6)), m3('#e8eef5'), 0, 1.75, 0, bat);
  }
}

function overlay(){
  const k = pxu(); let s = '';
  const bar = (x, y, z, w, pct, col) => { const [X, Y] = pj(x, y, z), W2 = w*k*.8, H2 = 1.5*k; return `<rect x="${(X - W2/2).toFixed(1)}" y="${Y.toFixed(1)}" width="${W2.toFixed(1)}" height="${H2.toFixed(1)}" rx="${(H2/2).toFixed(1)}" fill="#2b2552" opacity=".55"/>` + (pct > 0 ? `<rect x="${(X - W2/2 + .5).toFixed(1)}" y="${(Y + .5).toFixed(1)}" width="${Math.max(0, (W2 - 1)*tClamp(pct)).toFixed(1)}" height="${(H2 - 1).toFixed(1)}" rx="${((H2 - 1)/2).toFixed(1)}" fill="${col}"/>` : ''); };
  if (G.h.dead <= 0) s += bar(G.h.x, G.h.y, BZ + 36*CK, 9, G.h.hp/G.st.life, '#ff6a8a');
  for (const m of G.mons) if (!m.dead && (m.boss || m.hp < m.hpMax*.999)) s += bar(m.x, m.y, BZ + (m.type === 'slime' ? 11 : m.boss ? 40 : m.type === 'brute' ? 32 : m.type === 'drone' ? 24 : m.type === 'bomb' ? 20 : 28)*CK, 8, m.hp/m.hpMax, '#ff6a8a');
  for (const fl of G.floats){ const [X, Y] = pj(fl.x + 3, fl.y, fl.z + fl.t*9);
    s += `<text x="${X.toFixed(1)}" y="${Y.toFixed(1)}" text-anchor="middle" font-size="${(fl.size*1.5*k*.62).toFixed(1)}" fill="${fl.col}" style="stroke:#f2f7ff;stroke-width:${(1.8*k*.5).toFixed(1)}px;paint-order:stroke" font-family="'Cubic 11',monospace" font-weight="400" opacity="${(1 - fl.t*fl.t).toFixed(2)}">${fl.txt}</text>`; }
  return s;
}

/* ---------- scene：每一幀同步遊戲狀態到 three 場景，再畫出來 ---------- */
function scene(){
  if (window.BOSSON) return '';
  if (!R3.ready) r3init();
  r3frame();
  const bi = biomeNow();
  if (R3.bi !== bi){
    R3.bi = bi; { const SK = [['#8fcdf7', '#c9e9ff', '#f5fbff'], ['#ffc98a', '#ffe6bf', '#fff7ea'], ['#a9d8ff', '#d9efff', '#ffffff'], ['#c07a9a', '#e9b4cc', '#ffe2ee'], ['#141450', '#3a3a8c', '#7a6ad0'], ['#ffa6d6', '#ffd0ee', '#fff0fa']][bi] || []; SK.forEach((c, i) => document.documentElement.style.setProperty('--sk' + i, c)); }
    for (const o of [R3.gnd, R3.portal, ...R3.decor]) o && R3.world.remove(o);
    R3.gnd = buildGround(bi); R3.world.add(R3.gnd); R3.portal = buildPortal(); R3.world.add(R3.portal); R3.decor = [];
    DECO[bi].forEach(([kind, x, y, k], n) => { for (let j = 0; j < 2; j++){ let a = (n*2 + j)*.95 + .5, px, py; for (let t = 0; t < 8; t++){ px = HX + Math.cos(a)*(30 + (n*5 + j*3)%14)*1.15; py = HY + Math.sin(a)*(30 + (n*5 + j*3)%14); if (Math.abs(px - HX) > 8 && Math.abs(py - HY) > 8) break; a += .45; } const o = buildDeco(kind, k); o.scale.multiplyScalar(CK); at3(o, px, py, BZ); R3.world.add(o); R3.decor.push(o); } });
    [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([dx, dy]) => { const o = buildTorch(); o.scale.multiplyScalar(CK); at3(o, HX + dx*1.3, HY + dy*1.3, BZ); R3.world.add(o); R3.decor.push(o); });
    R3.sign = buildSign(); R3.sign.scale.multiplyScalar(CK); at3(R3.sign, HX - 13, HY + 10, BZ); R3.world.add(R3.sign); R3.decor.push(R3.sign);
    for (const [k, e] of R3.ent){ R3.world.remove(e); R3.ent.delete(k); }   // 換生態時怪物與掉落物重建（顏色隨生態）
  }
  const t = G.time;
  for (const o of R3.decor){ const u = o.userData; if (u.fl){ const f2 = 1 + Math.sin(t*14 + o.position.x)*.08; u.fl[0].scale.set(f2, 1 + Math.sin(t*11)*.1, f2); u.fl[2].scale.setScalar(1 + Math.sin(t*7)*.1); } if (u.glow) u.glow.material.color.set(Math.sin(t*3) > 0 ? '#ff9ab0' : '#ffc2d2'); }
  const sg = R3.sign, txt = G.run ? 'MAP ' + G.run.map.lvl : 'DEPTH ' + G.depth;
  if (sg.userData.txt !== txt){ sg.userData.txt = txt; const mt = new T3.MeshBasicMaterial({ map:signTex(txt) }), wd = m3('#c99a6a'); sg.userData.board.material = [wd, wd, wd, wd, mt, mt]; }
  const pu = R3.portal.userData, pulse = G.fx.find(e => e.k === 'portal');
  pu.glows.forEach(gl => gl.scale.setScalar(1 + (pulse ? .35*Math.sin(pulse.t*3.14) : 0))); pu.rings.forEach((r, i) => r.rotation.z = -(t*1.2 + i*2.1));
  // 主角
  const A = G.equip.armor, W = G.equip.weapon, at = aTier(A), ar = A ? A.r : 0, wt = WOV.has('wt') ? +WOV.get('wt') : aTier(W), wr = WOV.has('wr') ? +WOV.get('wr') : W ? W.r : 0, sig = [at, ar, wt, wr, G.h.dead > 0, G.char, JSON.stringify(G.cos)].join();
  if (!R3.hero || R3.hero.userData.sig !== sig){ if (R3.hero) R3.world.remove(R3.hero); R3.hero = G.h.dead > 0 ? buildGrave() : buildHero(at, ar, wt, wr); R3.hero.userData.sig = sig; R3.world.add(R3.hero); }
  if (G.h.dead > 0){ at3(R3.hero, G.h.x, G.h.y, BZ); R3.hero.rotation.y = Math.PI/4; } else heroLook(R3.hero);
  // 怪物與掉落物
  for (const e of R3.ent.values()) e.userData.seen = false;
  for (const m of G.mons){ const g = entFor(m, () => m.type === 'slime' ? buildSlime() : m.type === 'skel' ? buildSkel() : m.type === 'drone' ? buildDrone() : m.type === 'bomb' ? buildBomb() : buildBrute(m.boss)); monLook(m, g); }
  for (const d of G.drops){
    if (d.t < 0) continue;
    const g = entFor(d, () => buildDrop(d)), u = g.userData; let x = d.x, y = d.y, z = BZ;
    if (d.t < .6) z += Math.abs(Math.sin(d.t/.6*Math.PI*1.5))*5*(1 - d.t/.6) + .3;
    else if (d.t >= 1.2){ const k = ease(tClamp((d.t - 1.2)/.5)); x = tLerp(d.x, G.h.x, k); y = tLerp(d.y, G.h.y, k); z = BZ + .3 + Math.sin(k*Math.PI)*8 + k*7; } else z += .3 + Math.sin(d.t*6)*.25;
    at3(g, x, y, z); u.item.rotation.y = d.t*2.4; u.disc.visible = d.t < 1.2; if (u.beam) u.beam.visible = d.t < 1.2;
  }
  for (const [k, e] of R3.ent) if (!e.userData.seen){ R3.world.remove(e); R3.ent.delete(k); }
  updateFx();
  R3.rd.render(R3.sc, R3.cam);
  return overlay();
}

;
/* ---------- UI: side panel, modal, overlay ---------- */
// 全介面共用 Signal 24 圖集，座標及順序只讀取產生器的索引。
function uiSprite(sheet,id,size=24,extra='',tag='span'){
  const S=ART_SHEETS[sheet],index=S?.ids.indexOf(id);if(index==null||index<0)return '';
  const x=index%S.cols*size,y=Math.floor(index/S.cols)*size;
  return `<${tag} class="spr${tag==='i'?' gem':''}" aria-hidden="true" data-icon="${sheet}:${id}" style="width:${size}px;height:${size}px;background:var(--pixel-${sheet},var(--a-${sheet})) -${x}px -${y}px/${S.cols*size}px ${S.rows*size}px no-repeat;${extra}"></${tag}>`;
}
const ICON_IDX=ART_SHEETS.icons.ids,SK_IDX=ART_SHEETS.skills.ids;
function spr(name,size=30){return uiSprite('icons',name,size);}
function sico(id,size=30){return uiSprite('skills',id,size);}
const SHEETS={relic:['relics'],legend:['legends'],badge:['badges']};
function xico(kind,id,size=24){return SHEETS[kind]?uiSprite(SHEETS[kind][0],id,size,'vertical-align:middle;margin-right:4px'):'';}
function eqico(slot,r,size=32){return uiSprite('equips',slot+'-'+Math.max(0,Math.min(r|0,3)),size,'vertical-align:middle;margin-right:4px');}
const SLOT_ICON = { weapon:'sword', armor:'shield', ring:'coin' }, SKILL_ICON = { FIRE:'fire', FROST:'ice', CHAIN:'bolt', METEOR:'meteor', PULSE:'headphones', MAGNET:'coin', SPAM:'star', FLICKER:'sword', BEAM:'heart' };
function slotHtml(slot){
  const it = G.equip[slot];
  if (!it) return `<div class="rc"><div class="rh">${SLOTN[slot]}</div><div class="nm">${spr(SLOT_ICON[slot], 32)}<div class="mute">空</div></div></div>`;
  const lines = itemLines(it).slice(0, 3).map(l => `<li class="${l.imp ? 'imp' : l.lg ? 'lgd' : ''}">${l.t}</li>`).join('');
  return `<div class="rc item" style="--rc:${RAR[it.r].c}"><div class="rh"><span>${SLOTN[slot]}</span><span class="mute">ilvl ${it.il}</span></div><div class="nm">${it.lg && xico('legend', it.lg, 34) ? xico('legend', it.lg, 34) : eqico(slot, it.r, 34)}<div><b style="color:${RAR[it.r].c}">${it.name}</b><div class="mute">${RAR[it.r].n}</div></div></div><ul>${lines}</ul></div>`;
}
function panelHtml(){
  const s = G.st, h = G.h, R = G.run;
  const sk = G.slots.map((id, i) => id ? `<li><b>${SKILLS[id].n}</b> <span class="mute">${(G.supp[id] || []).filter(Boolean).map(g => SUPPS[g].n).join('、') || '無輔助'}</span></li>` : `<li class="mute">槽 ${i+1}：${G.lvl >= SLOT_LV[i] ? '空' : '等級 ' + SLOT_LV[i] + ' 解鎖'}</li>`).join('');
  const prog = R ? `${R.tower ? `無限之塔 第 ${R.floor} 層` : '地圖進度'} ${Math.min(R.kills, R.need)} / ${R.need}${R.tower ? '' : `（${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}）`}` : `擊殺 ${Math.min(G.kills, G.need)} / ${G.need}${G.push ? '（滿了出守關者）' : '（刷怪模式）'}`;
  const stats = `<li>生命 ${tFmt(Math.max(0, h.hp))} / ${tFmt(s.life)}</li><li>預估 DPS ${tFmt(s.dps)}</li><li>暴擊 ${s.crit.toFixed(0)}%　減傷 ${(s.red*100).toFixed(0)}%</li><li>${prog}</li>`;
  return `${slotHtml('weapon')}${slotHtml('armor')}${slotHtml('ring')}
    <div class="rc"><div class="rh">技能</div><ul>${sk}</ul></div>
    <div class="rc"><div class="rh">狀態</div><ul>${stats}</ul></div>${charHtml()}${cardsHtml()}
    <div class="rc wide"><div class="rh">事件</div><ol class="log">${G.log.map(l => `<li style="color:${l.col}">${l.txt}</li>`).join('')}</ol></div>`;
}
function codexHtml(){
  const lg = Object.values(LEGEND_BY), nl = lg.filter(L => G.legSeen[L.id]).length, md = Object.keys(MODES), nm = md.filter(id => G.seen[id]).length, sk = Object.keys(SKILLS), ns = sk.filter(id => G.lvl >= SKILLS[id].lvl).length;
  const slotOf = id => Object.keys(LEGENDS).find(k => LEGENDS[k].some(L => L.id === id));
  return `<div class="rc wide"><div class="rh">圖鑑</div><div class="mute">守關者暗金保底：連續 ${G.pity || 0} 件沒出，下一件暗金機率 ${Math.round(Math.min(1, .1 + .06*(G.pity || 0))*100)}%</div>
    <div class="mct" style="margin:8px 0 3px">元素反應</div><ul class="ach"><li class="got"><b>火焰</b> 命中的敵人燃燒 3 秒，持續受到傷害</li><li class="got"><b>閃電</b> 命中的敵人被標記 4 秒</li><li class="got"><b>融化</b> 火焰打到凍結的敵人：傷害 +40%，解除凍結</li><li class="got"><b>超導</b> 閃電打到凍結的敵人：傷害 +30%</li><li class="got"><b>蒸氣</b> 冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒</li><li class="got"><b>過載</b> 火焰或冰霜打到被閃電標記的敵人：傷害 +25%</li></ul>
    <div class="mct" style="margin:8px 0 3px">遺物 ${Object.keys(G.relics).length} / ${Object.keys(RELICS).length}</div><ul class="ach">${Object.entries(RELICS).map(([id, r]) => `<li class="${G.relics[id] ? 'got' : 'mute'}">${xico('relic', id, 22)}<b>${G.relics[id] ? r.n : '？？？'}</b> ${G.relics[id] ? r.d : ''}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">傳奇裝備 ${nl} / ${lg.length}</div><ul class="ach">${lg.map(L => `<li class="${G.legSeen[L.id] ? 'got' : 'mute'}">${xico('legend', L.id, 24)}<b>${G.legSeen[L.id] ? L.name : '？？？'}</b> ${G.legSeen[L.id] ? L.d : `（暗金${SLOTN[slotOf(L.id)]}）`}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">模式卡匣 ${nm} / ${md.length}</div><ul class="ach">${md.map(id => { const M = MODES[id], has = G.seen[id]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? M.n : '？？？'}</b> ${has ? `（${SKILLS[M.sk].n}）${M.d}` : `（${SKILLS[M.sk].n}）${M.hint}${G.carts[id] ? '　已持有未鑑定' : ''}`}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">怪物</div><ul class="ach">${[['slime', '史萊姆', '成群出現，行動最快的雜兵'], ['skel', '骷髏', '比史萊姆耐打'], ['brute', '蠻牛', '又慢又硬，打人很痛'], ['drone', '無人機', '貼著半空飛，速度快但很脆（深度 2 起）'], ['bomb', '自爆機器人', '死亡時爆炸，波及主角與附近的怪（深度 4 起）'], ['boss', '守關者', '關底首領，掉落最好的戰利品']].map(([id, n, d]) => { const k = (G.mk || {})[id] || 0; return `<li class="${k ? 'got' : 'mute'}"><b>${k ? n : '？？？'}</b> ${k ? `${d}（擊殺 ${k}）` : '還沒遇到'}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">輔助配件</div><ul class="ach">${Object.keys(SUPPS).map(g => { const has = (G.gems[g] || 0) > 0 || (G.seenG || {})[g]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? SUPPS[g].n : '？？？'}</b> ${has ? SUPPS[g].d : '還沒取得'}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">技能 ${ns} / ${sk.length}</div><ul class="ach">${sk.map(id => { const K = SKILLS[id], has = G.lvl >= K.lvl; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? K.n : '？？？'}</b> ${has ? K.d : `（Lv. ${K.lvl} 解鎖）`}</li>`; }).join('')}</ul></div>`;
}
function logHtml(){
  try { localStorage.setItem('ih_log_seen', CHANGELOG[0].v); } catch (e) {}
  return `<div class="rpgm"><div class="rc wide"><div class="rh">更新日誌</div>${CHANGELOG.map(c => `<div class="lg"><b>v${c.v}</b> <span class="mute">${c.d}</span><ul>${c.t.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
}
const logNew = () => { try { return localStorage.getItem('ih_log_seen') !== CHANGELOG[0].v; } catch (e) { return false; } };
let modalTab = 'skills', resetArm = false;
const $ = id => document.getElementById(id);
const invN = () => Object.values(G.gems).reduce((a, b) => a + b, 0) + Object.values(G.carts).reduce((a, b) => a + b, 0);
const dotOn = k => k === 'skills' ? invN() > (G.seenInv || 0) : k === 'craft' ? (G.parts || 0) >= 6 && G.parts > (G.seenParts || 0) : k === 'col' ? Object.keys(G.goals).length > (G.seenGoals || 0) : false;
function markSeen(t){ if (t === 'skills'){ if (!G.newSnap || modalTabPrev !== 'skills') G.newSnap = { g:{ ...(G.seenG || {}) }, c:{ ...(G.seenC || {}) } }; G.seenG = { ...G.gems }; G.seenC = { ...G.carts }; G.seenInv = invN(); } else if (t === 'craft') G.seenParts = G.parts || 0; else if (['goals', 'ach', 'dex'].includes(t)) G.seenGoals = Object.keys(G.goals).length; }
let modalTabPrev = '';
function openModal(tab){ modalTabPrev = modalTab; modalTab = tab || modalTab; markSeen(modalTab); resetArm = false; $('modal').hidden = false; renderModal(true); }
const MOB = () => document.body.classList.contains('m');   // 手機直式：上面戰鬥畫面，下面固定的分頁面板（彈窗變成面板）
const DESK = () => document.body.classList.contains('d');   // 桌機寬螢幕：左邊角色與紀錄、中間戰鬥、右邊常駐分頁面板
function closeModal(){ if(MOB()||DESK()){renderModal(true);return;} $('modal').hidden=true; }
function renderModal(resetScroll = false){ const uxPanel = uxCapturePanel(); setTimeout(() => { if (typeof dressMount === 'function' && modalTab === 'dress') dressMount(); }, 0);
  if ($('modal').hidden) return;
  $('mtabs').innerHTML=uiNavHtml(); uiTitle();
  const settings=modalTab==='settings'; $('uisettings').hidden=!settings; $('mmenu').hidden=false; $('mbody').hidden=settings;
  if(!settings) $('mbody').innerHTML = modalTab === 'char' ? uiCharacterHtml() : modalTab === 'skills' ? skillsHtml() : modalTab === 'tree' ? treeHtml() : modalTab === 'maps' ? mapsHtml() : modalTab === 'goals' ? goalsHtml() : modalTab === 'ach' ? `<div class="rpgm">${achHtml()}</div>` : modalTab === 'craft' ? craftHtml() : modalTab === 'dress' ? dressHtml() : modalTab === 'dex' ? `<div class="rpgm">${codexHtml()}</div>` : modalTab === 'log' ? logHtml() : modalTab === 'save' ? saveHtml() : uiMenuHtml();
  uxRestorePanel(uxPanel,resetScroll);
  UI_LIVE_SIGNATURE=uiLiveSignature();
}
let held = null, heldRot = 0, selPiece = null;   // 拼圖頁：held 是從清單選起、準備放下的機件；selPiece 是面板上被選取的機件 id
const GEM_COL = { HEAVY:'#ff7a8a', AREA:'#ffb84a', HASTE:'#5fd0a0', LEECH:'#e05a7a', TWIN:'#8f7bff', CRITS:'#4aa8ff', COOL:'#6fd6e8', CRYSTAL:'#d99bff' };
const GEM_IDX=ART_SHEETS.gems.ids;
const gemIco=(id,size=22)=>uiSprite('gems',id,size,'','i');
function shapeIcon(kind, key, rot = 0, col){
  const cs = GridLab.shapeOf(kind, key, rot), w = Math.max(...cs.map(c => c[0])) + 1, h = Math.max(...cs.map(c => c[1])) + 1, c = col || (kind === 'active' ? '#ff9ec7' : GEM_COL[key] || '#a87bf0');
  let o = `<span class="shp" style="grid-template-columns:repeat(${w},9px)">`;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o += cs.some(q => q[0] === x && q[1] === y) ? `<i style="background:${c}"></i>` : '<i class="e"></i>';
  return o + '</span>';
}
function buildBar(){
  return `<section class="ui-build" aria-label="構築配置"><div><b>構築</b>${[0,1,2].map(i=>`<button class="mb" aria-label="構築 ${i+1}" aria-pressed="${(G.bi||0)===i}" onclick="switchBuild(${i})">${i+1}</button>`).join('')}</div><p class="uxmeta">技能與天賦獨立，裝備共用。</p></section>`;
}
function dpsBar(){
  const sk = G.st.sk || {}, ids = Object.keys(sk), tot = ids.reduce((a, id) => a + sk[id].hit/Math.max(.2, sk[id].cd), 0) || 1;
  return `<div class="dpsbar"><div>DPS <b>${tFmt(G.st.dps)}</b> <span id="pzdelta" class="mute"></span></div><div class="shares">${ids.map(id => `<span style="flex:${Math.max(1, Math.round(sk[id].hit/Math.max(.2, sk[id].cd)/tot*100))}" title="${SKILLS[id].n}">${SKILLS[id].n}</span>`).join('')}</div>${uxPieceDetails()}</div>`;
}
function switchBuild(i){
  if (i === (G.bi || 0)) return; if (!G.builds) G.builds = [null, null, null];
  G.builds[G.bi || 0] = JSON.parse(JSON.stringify({ board:G.board, pass:G.pass }));
  const t = G.builds[i]; G.bi = i; selPiece = null; held = null;
  if (t){ G.board = JSON.parse(JSON.stringify(t.board)); G.pass = t.pass.slice(); } else { boardFromLegacy(['FIRE'], {}); G.pass = []; }
  const use = {}, cu = {};   // 配件與卡匣只有一份庫存：超出的從這套拿掉
  G.board.pieces = G.board.pieces.filter(p => { if (p.kind !== 'support') return true; use[p.key] = (use[p.key] || 0) + 1; return use[p.key] <= (G.gems[p.key] || 0); });
  for (const p of G.board.pieces) if (p.mode){ cu[p.mode] = (cu[p.mode] || 0) + 1; if (cu[p.mode] > (G.carts[p.mode] || 0)) p.mode = null; }
  recalc(); logLine(`切換到構築 ${i + 1}`, '#2f7fc4'); renderModal();
}
function skillsHtml(){
  return buildBar() + dpsBar() + skillsHtml0();
}
function skillsHtml0(){
  const B = G.board, at = {}, linked = new Set(GridLab.resolve(B).flatMap(r => r.linked));
  for (const p of B.pieces) GridLab.cellsOf(p).forEach((c, i) => { at[c[0] + ',' + c[1]] = { p, first:i === 0 }; });
  let h = '<p class="uxgrid-help">選機件，再點格子放置。輔助只強化相鄰且標籤相符的技能。</p>'
    + `<div class="pz" role="group" aria-label="技能拼圖，方向鍵移動，Enter 放置" onmouseleave="pzHover(-1,-1)" style="grid-template-columns:repeat(${B.w},1fr)">`;
  for (let y = 0; y < SLOT_LV.length; y++) for (let x = 0; x < B.w; x++){
    if (y >= B.h){ h += `<div class="pc lock">${x === 0 ? 'Lv. ' + SLOT_LV[y] : ''}</div>`; continue; }
    const c = at[x + ',' + y], ev = `data-x="${x}" data-y="${y}" data-focus="cell-${x}-${y}" tabindex="${UX_GRID.x === x && Math.min(UX_GRID.y,B.h-1) === y ? 0 : -1}" aria-label="${uxEsc(uxGridLabel(x,y))}" onfocus="uxGridFocus(this)" onclick="uxGridActivate(${x},${y})" onmouseenter="pzHover(${x},${y})"`;
    if (!c){ h += `<button type="button" class="pc" ${ev}></button>`; continue; }
    const act = c.p.kind === 'active', col = act ? '#ff9ec7' : GEM_COL[c.p.key] || '#a87bf0', same = (dx, dy) => (at[(x + dx) + ',' + (y + dy)] || {}).p === c.p;
    h += `<button type="button" class="pc fill${c.p.id === selPiece ? ' sel' : ''}${linked.has(c.p.id) ? ' lnk' : ''}${same(1, 0) ? ' jr' : ''}${same(0, 1) ? ' jb' : ''}" style="--pc:${col}" ${ev} onpointerdown="pzDown(event,null,null,${c.p.id})">${c.first ? (act ? sico(c.p.key, 22) : gemIco(c.p.key, 16)) + `<span>${act ? SKILLS[c.p.key].n : SUPPS[c.p.key].n}</span>` : ''}</button>`;
  }
  const bb = boardBonus(), rz = [bb.rows && `整列滿 ×${bb.rows}：全隊傷害 +${12*bb.rows}%`, bb.cols && `整欄滿 ×${bb.cols}：暴擊率 +${5*bb.cols}%`, Object.keys(bb.pair).length && `${Object.keys(bb.pair).map(k => SKILLS[k].n).join('、')}：同元素緊貼 +15%`].filter(Boolean);
  h += `</div><div class="rz">${rz.length ? '共鳴　' + rz.join('　') : '共鳴：塞滿整列、整欄，或同元素技能緊貼，有額外加成'}</div>`;
  const hd = held ? (held.kind === 'active' ? SKILLS[held.key].n : SUPPS[held.key].n) : '';
  h += `<div class="pzbar"><button ${held || selPiece != null ? '' : 'disabled'} onclick="pzRot()">旋轉</button><button ${selPiece == null ? 'disabled' : ''} onclick="pzDel()">移除</button>${held ? `<span class="mute">手上：${hd} ${shapeIcon(held.kind, held.key, heldRot)}</span>` : ''}<span id="pzmsg" class="mute"></span></div>`;
  h += uiInventoryHtml() + uiResolvedHtml();
  return h;
}
function treeHtml(){
  return buildBar() + treeHtml0();
}
function treeHtml0(){
  const pts = passPoints(); let lines = '', nodes = '';
  for (const id in TREE){ const n = TREE[id]; for (const l of n.links) if (id < l){ const m = TREE[l], on2 = (id === 'S' || G.pass.includes(id)) && (l === 'S' || G.pass.includes(l));
    lines += `<line class="${on2 ? 'connected' : 'inactive'}" x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="${on2 ? n.col === '#e8e2d4' ? m.col : n.col : '#d3daf0'}" stroke-width="${on2 ? 3.4 : 1.6}" stroke-linecap="round"/>`; } }
  const star = (x, y, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI/2 + i*Math.PI/5, k = i % 2 ? r : R; return `${(x + Math.cos(a)*k).toFixed(1)},${(y + Math.sin(a)*k).toFixed(1)}`; }).join(' ');
  for (const id in TREE){ const n = TREE[id], got = id === 'S' || G.pass.includes(id), open = nodeOpen(id) && pts > 0, x = n.x.toFixed(1), y = n.y.toFixed(1), r = n.big ? 6.6 : 4;
    const fill = got ? n.col : '#eef3ff', stroke = got ? '#ffffff' : open ? '#2b2552' : '#c3cbe8', sw = got ? 2 : open ? 1.8 : 1.2;
    const shape = n.big ? `<polygon points="${star(+x, +y, r + 1.6, r*.55)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>`;
    nodes += `<g class="tn ${got ? 'got' : open ? 'open' : 'locked'}" data-tree="${id}" role="button" tabindex="${open?0:-1}" aria-disabled="${!open}" aria-label="${uxEsc(n.name)}，${got?'已點亮':open?'可點亮':'未連到或點數不足'}" onfocus="treeInfo('${id}')" onmouseover="treeInfo('${id}')" onclick="treeInfo('${id}');allocPass('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();allocPass('${id}')}" style="cursor:${open ? 'pointer' : 'default'}"><title>${n.name}</title>${got ? `<circle cx="${x}" cy="${y}" r="${r + 2.4}" fill="${n.col}" opacity=".28"/>` : ''}${shape}${got && !n.big ? `<circle cx="${(+x - r*.3).toFixed(1)}" cy="${(+y - r*.35).toFixed(1)}" r="${(r*.28).toFixed(1)}" fill="#fff" opacity=".8"/>` : ''}</g>`; }
  return `<div class="hint">可用天賦點：<b>${pts}</b>（每升一級 +1，每打到更深 4 層 +1）。點亮與已點亮節點相連的點。</div>
    <svg viewBox="-125 -125 250 250" class="tree">${lines}${nodes}</svg>
    <div id="tinfo" class="hint">滑過節點看效果。<span style="color:#e2584d">紅：力量</span> <span style="color:#3f86e6">藍：智慧</span> <span style="color:#3bb552">綠：敏捷</span></div>
    <button class="mb" onclick="uiRespec()">洗點（${tFmt(100*G.lvl)}g）</button>`;
}
function treeInfo(id){ const n = TREE[id], el = $('tinfo'); if (el) el.textContent = id === 'S' ? '起點' : `${n.name}${nodeOpen(id) ? '' : G.pass.includes(id) ? '（已點亮）' : '（未連到）'}`; }
function nextStep(){
  const q = QUESTS[G.quest || 0];
  if (q) return { t:`${q.n}（${q.t}）`, tab:'goals' };
  if (passPoints() > 0 && tabOpen('tree')) return { t:`有 ${passPoints()} 點天賦可以分配`, tab:'tree' };
  if ((G.parts || 0) >= 6 && tabOpen('craft')) return { t:`有 ${G.parts} 個零件可以改機`, tab:'craft' };
  if (!G.run && !G.train && G.maxDepth >= 8 && !(G.towerBest > 0)) return { t:'試試無限之塔', tab:'maps' };
  return null;
}
function questHtml(){
  const q = QUESTS[G.quest || 0];
  if (!q) return '';
  const v = Math.min(q.goal, GOAL_STAT[q.k]());
  return `<div class="mct">新手任務　${G.quest || 0}/${QUESTS.length}</div><div class="gls"><div class="gl"><b>${q.n}</b><span class="mute">${q.t}　獎勵：${goalRewardText(q.rw)}${q.un ? '　（完成後開放：' + (q.un === 'craft' ? '改機' : '天賦盤') + '）' : ''}</span><i style="--p:${Math.round(v/q.goal*100)}%"></i><em>${v} / ${q.goal}</em></div></div>`;
}
function goalsHtml(){
  const done = GOALS.filter(a => G.goals[a.id]).length;
  return questHtml() + `<div class="mct">目標　${done}${qm('goals')}/${GOALS.length}</div><div class="gls">` + GOALS.map(a => { const v = Math.min(a.goal, GOAL_STAT[a.k]()), ok = G.goals[a.id];
    return `<div class="gl${ok ? ' ok' : ''}"><b>${ok ? '★ ' : ''}${a.n}</b><span class="mute">${a.goal} ${GOAL_UNIT[a.k]}　獎勵：${goalRewardText(a.rw)}</span><i style="--p:${Math.round(v/a.goal*100)}%"></i><em>${ok ? '完成' : v + ' / ' + a.goal}</em></div>`; }).join('') + '</div>';
}
function mapsHtml(){ return uiAdventureHtml(); }

function lootToast(it){
  let box = $('loot'); const host = document.querySelector('.stage') || document.body; if (!box){ box = document.createElement('div'); box.id = 'loot'; } if (box.parentNode !== host) host.appendChild(box);
  const R = RAR[it.r], ls = itemLines(it).filter(l => l.lg).slice(0, 1).concat(itemLines(it).filter(l => !l.lg).slice(0, 1)).slice(0, it.lg ? 2 : 1), d = document.createElement('div');
  d.className = 'lt r' + it.r; d.style.setProperty('--rc', R.c); d.style.setProperty('--rg', R.g);
  d.innerHTML = `<div class="lh">${it.lg && xico('legend', it.lg, 24) ? xico('legend', it.lg, 24) : eqico(it.slot || it.sl, it.r, 24)}<b>${it.name}</b></div>`;
  box.prepend(d); while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => d.classList.add('out'), it.r >= 3 ? 3200 : 1800); setTimeout(() => d.remove(), it.r >= 3 ? 3800 : 2400);
}
function setDmgNum(v){ G.dmgNum = v; G.dirty = true; renderModal(); }
function saveHtml(){
  const dn = G.dmgNum == null ? 1 : G.dmgNum;
  return `<div class="mrow" style="margin-bottom:8px"><button class="mb pri" onclick="wikiOpen()">編年史（查看所有遊戲資訊）</button></div><div class="mct">傷害數字</div><div class="mrow">${[[2, '全部'], [1, '精簡'], [0, '關閉']].map(([v, n]) => `<button class="mb" aria-pressed="${dn === v}" style="${dn === v ? 'background:#1f3fb0;color:#fff' : ''}" onclick="setDmgNum(${v})">${n}</button>`).join('')}</div>` + `<div class="hint">遊戲每 5 秒自動存檔在這個瀏覽器裡。離開頁面後，回來會自動結算離線收益（最多 6 小時）。</div>
    <div class="mrow"><button class="mb" onclick="doSave()">立即存檔</button><button class="mb" onclick="doExport()">匯出存檔碼</button><button class="mb" onclick="doImport()">匯入存檔碼</button><button class="mb" id="rbtn" onclick="doReset()">${resetArm ? '再按一次確認清除' : '清除存檔'}</button></div>
    <textarea id="sv" class="sv" placeholder="匯出的存檔碼會顯示在這裡；要匯入時把存檔碼貼在這裡再按「匯入」"></textarea><div id="smsg" class="hint"></div>`;
}
/* modal actions */
function cartsHtml(){
  const sp = G.board.pieces.find(p => p.id === selPiece && p.kind === 'active'), ids = Object.keys(MODES).filter(id => (G.carts[id] || 0) > 0);
  let h = sp ? `<div class="mute"><b>${SKILLS[sp.key].n}</b> ${sp.mode ? `目前：${MODES[sp.mode].n}　<button class="skb" style="width:auto;padding:0 8px !important" onclick="equipCart('')">卸下</button>` : '目前：標準模式'}</div>` : '<div class="mute">先點面板上的技能，再選卡匣裝上去。裝上才知道實際效果。</div>';
  if (!ids.length) return h + '<div class="mute">還沒有卡匣。打怪有機會掉落，首領掉得更多。</div>';
  return h + '<div class="gems">' + ids.map(id => { const M = MODES[id], f = cartFree(id), n = G.carts[id], seen = G.seen[id], ok = sp && sp.key === M.sk && f > 0;
    return `<button class="gt" ${ok ? '' : 'disabled'} onclick="equipCart('${id}')" title="${seen ? M.d : M.hint}">${G.newSnap && n > (G.newSnap.c?.[id] || 0) ? '<i class="nw">NEW</i>' : ''}<i class="gem" style="--gc:#3fd0ee;width:28px;height:28px"></i><b>${seen ? M.n : '未鑑定的' + SKILLS[M.sk].n + '卡匣'}</b><em>${f}/${n}</em><small>${seen ? M.d : M.hint}</small></button>`; }).join('') + '</div>';
}
function equipCart(id){
  const p = G.board.pieces.find(q => q.id === selPiece && q.kind === 'active'); if (!p) return;
  if (!id){ delete p.mode; recalc(); renderModal(); return; }
  if (MODES[id].sk !== p.key || cartFree(id) <= 0) return;
  p.mode = id;
  if (!G.seen[id]){ G.seen[id] = 1; logLine(`鑑定完成：${MODES[id].n}，${MODES[id].d}`, '#1f9bbf'); checkGoals(); }
  recalc(); renderModal();
}
function pzMsg(t){ renderModal(); const e = $('pzmsg'); if (e) e.textContent = t || ''; uxAnnounce(t || ''); }
let noClick = false;   // 剛拖曳完的那一下 click 要略過
function pzHold(kind, key){ if (noClick) return; UX_LAST_SOURCE = uxFocusToken(); held = held && held.key === key ? null : { kind, key }; heldRot = 0; selPiece = null; renderModal(); if(held)uiRevealSelection(); }
function pzCell(x, y){
  if (noClick) return;
  const hit = G.board.pieces.find(p => GridLab.cellsOf(p).some(c => c[0] === x && c[1] === y));
  if (hit && held){ pzMsg('這格已有機件，請選擇空白位置。'); return; }
  if (hit){ selPiece = hit.id; held = null; renderModal(); uiRevealSelection(); return; }
  if (!held) return;
  const p = GridLab.place(G.board, held.kind, held.key, x, y, heldRot);
  if (!p){ pzMsg('這裡放不下（重疊或超出面板）'); return; }
  if (held.kind === 'active') held = null; else if (gemFree(held.key) <= 0) held = null;
  recalc(); renderModal(); uxAnnounce('已放置機件，目前預估 DPS ' + tFmt(G.st.dps));
}
/* 拖曳：從清單拖機件到面板放下，或拖面板上的機件換位置（滑鼠與觸控皆可）。沒有移動超過 6px 就當成點擊 */
let drag = null;
function cellAt(px, py){ const e = document.elementFromPoint(px, py), c = e && e.closest && e.closest('.pc[data-x]'); return c ? [+c.dataset.x, +c.dataset.y] : null; }
function pzDown(ev, kind, key, pieceId){
  if (ev.button > 0 || drag) return;
  let from = null;
  if (pieceId != null){ const p = G.board.pieces.find(q => q.id === pieceId); if (!p) return; from = { ...p }; kind = p.kind; key = p.key; }
  drag = { kind, key, from, fromIndex:from ? G.board.pieces.findIndex(p => p.id === from.id) : -1, sx:ev.clientX, sy:ev.clientY, moved:false, rot:from ? from.rot || 0 : (held && held.key === key ? heldRot : 0), ghost:null };
  document.addEventListener('pointermove', pzMove); document.addEventListener('pointerup', pzUp); document.addEventListener('pointercancel', pzUp);
}
function pzMove(ev){
  const d = drag; if (!d) return;
  if (!d.moved){ if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
    d.moved = true; held = { kind:d.kind, key:d.key }; heldRot = d.rot;
    if (d.from){ GridLab.remove(G.board, d.from.id); selPiece = null; recalc(); }   // 拿起來：先從面板拿掉，放不下再還原
    renderModal();
    d.ghost = document.createElement('div'); d.ghost.className = 'pzghost'; d.ghost.innerHTML = shapeIcon(d.kind, d.key, heldRot); document.body.appendChild(d.ghost); }
  d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = (ev.clientY - 30) + 'px';
  d.at = cellAt(ev.clientX, ev.clientY - 30) || cellAt(ev.clientX, ev.clientY); d.at ? pzHover(d.at[0], d.at[1]) : pzHover(-1, -1);
}
function pzUp(ev){
  document.removeEventListener('pointermove', pzMove); document.removeEventListener('pointerup', pzUp); document.removeEventListener('pointercancel', pzUp);
  const d = drag; drag = null; if (!d || !d.moved) return;
  if (d.ghost) d.ghost.remove();
  noClick = true; setTimeout(() => { noClick = false; }, 0);
  const cancelled = ev && ev.type === 'pointercancel';
  const valid = !cancelled && d.at && GridLab.canPlace(G.board,d.kind,d.key,d.at[0],d.at[1],heldRot);
  let p = null;
  if (d.from){
    p = { ...d.from };
    if (valid) Object.assign(p,{ x:d.at[0], y:d.at[1], rot:heldRot });
    G.board.pieces.splice(d.fromIndex,0,p);   // 保留識別、卡匣及原排序；失敗完整還原。
  } else if (valid) p = GridLab.place(G.board,d.kind,d.key,d.at[0],d.at[1],heldRot);
  if (d.from) held = null; else if (!p || gemFree(d.key) <= 0 || d.kind === 'active') held = null;
  recalc(); renderModal(); if (!valid && d.at && !cancelled) pzMsg('這裡放不下（重疊或超出面板），已還原');
}
function pzHover(x, y){
  document.querySelectorAll('.pc.pv').forEach(e => e.classList.remove('pv', 'ok', 'bad'));
  if (!held || x < 0) return;
  const cs = GridLab.shapeOf(held.kind, held.key, heldRot).map(([dx, dy]) => [x + dx, y + dy]), ok = GridLab.canPlace(G.board, held.kind, held.key, x, y, heldRot);
  for (const [cx, cy] of cs){ const e = document.querySelector(`.pc[data-x="${cx}"][data-y="${cy}"]`); if (e) e.classList.add('pv', ok ? 'ok' : 'bad'); }
  const el = $('pzdelta'); if (el){ el.innerHTML = ''; if (ok){ const B = JSON.parse(JSON.stringify(G.board)); if (GridLab.place(B, held.kind, held.key, x, y, heldRot)){ const d = dpsWith(B) - G.st.dps, pc = G.st.dps > 0 ? Math.round(d/G.st.dps*100) : 0; el.innerHTML = `放這裡：傷害 <b class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${pc}%</b>`; } } }
}
function dpsWith(B){ const keep = G.board; G.board = B; syncBoard(); const d = calc().dps; G.board = keep; syncBoard(); return d; }
function pzRot(){ if (held){ heldRot = (heldRot + 1) % 4; if (drag && drag.ghost) drag.ghost.innerHTML = shapeIcon(held.kind, held.key, heldRot); else renderModal(); return; } if (selPiece == null) return; const ok = GridLab.rotate(G.board, selPiece); recalc(); pzMsg(ok ? '' : '旋轉後放不下'); }
function pzDel(){ if (selPiece != null) GridLab.remove(G.board, selPiece); selPiece = null; recalc(); renderModal(); }
function allocPass(id){ if (passPoints() <= 0 || !nodeOpen(id)) return; G.pass.push(id); recalc(); logLine(`天賦：${TREE[id].name}`, '#2f7fc4'); renderModal(); }
function respec(){ const cost = 100*G.lvl; if (!G.pass.length || G.gold < cost) return; G.gold -= cost; G.pass = []; recalc(); renderModal(); }
function enterMap(id){
  if (G.run) return; const i = G.maps.findIndex(m => m.id === id); if (i < 0) return;
  const map = G.maps.splice(i, 1)[0]; G.run = { map, kills:0, need:80, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine(`進入地圖：${BIOMES[map.biome].n} Lv. ${map.lvl}`, '#2f7fc4'); closeModal();
}
function abandonMap(){ if (!G.run) return; G.run = null; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8; logLine('放棄了地圖', '#857d6e'); renderModal(); }
const smsg = t => { const e = $('smsg'); if (e) e.textContent = t; };
function doSave(){ smsg(saveGame() ? '已存檔。' : '這個環境不允許瀏覽器存檔，請改用「匯出存檔碼」。'); }
function doExport(){ const c = encodeSave(); $('sv').value = c; $('sv').select(); smsg('存檔碼已產生，請整段複製保存。'); }
function doImport(){ const o = decodeSave($('sv').value); if (!o || !applySave(o)){ smsg('存檔碼無效。'); return; } saveGame(); smsg('匯入完成。'); logLine('已匯入存檔', '#2f9e4f'); renderModal(); }
function doReset(){ if (!resetArm){ resetArm = true; renderModal(); return; } try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G.__wipe = true; location.search = '?fresh=1'; }

/* 升級三選一 */
function toggleAuto(){ G.autoCard = !G.autoCard; if (G.autoCard) openCards(); else if (G.picks > 0) openCards(); G.dirty = true; renderModal(); }
function openCards(){
  if (G.picks <= 0 || G.offline) return;
  G.deferChoices = false;
  if (G.autoCard){ while (G.picks > 0){ const o = rollCards(3); if (!o.length) break; takeCard(tPick(o)); } hideOverlay(); return; }   /* 自動隨機：直接抽一張 */ if (!G.offer || !G.offer.length) G.offer = rollCards();
  const h = G.offer.map(id => { const c = CARDS[id], v = !!c.sk; return `<button class="card${v ? ' var' : ''}" onclick="pickCard('${id}')"><span class="ct">${v ? '技能變體 · ' + SKILLS[c.sk].n : '改裝'}</span><b>${c.n}</b><span class="cd">${c.d}</span>${cardN(id) ? `<span class="mute">已有 ${cardN(id)} 張</span>` : ''}</button>`; }).join('');
  showOverlay(`<b>升級了！選一張改裝卡</b><div class="mute">還有 ${G.picks} 次選擇。遊戲不會暫停。</div><div class="cards">${h}</div><button class="mb" onclick="deferChoices()">稍後再選</button> <button class="mb" onclick="toggleAuto()">自動隨機選卡</button>`);
}
function deferChoices(){ G.deferChoices = true; G.dirty = true; hideOverlay(); }
function openPendingChoices(){ hideOverlay(); if (G.relicPicks > 0) openRelics(); else if (G.picks > 0) openCards(); }
function openRelics(){
  if (G.relicPicks <= 0 || G.offline) return;
  G.deferChoices = false;
  if (G.autoCard){ while (G.relicPicks > 0){ const o = rollRelics(); if (!o.length){ G.relicPicks = 0; break; } takeRelic(tPick(o)); } hideOverlay(); return; }
  if (!G.offerR || !G.offerR.length) G.offerR = rollRelics(); if (!G.offerR.length){ G.relicPicks = 0; return; }
  showOverlay(`<b>擊敗守關者！選一件遺物</b><div class="mute">永久生效。還有 ${G.relicPicks} 次選擇。</div><div class="cards">${G.offerR.map(id => `<button class="card var" onclick="pickRelic('${id}')"><span class="ct">遺物</span>${xico('relic', id, 40)}<b>${RELICS[id].n}</b><span class="cd">${RELICS[id].d}</span></button>`).join('')}</div><button class="mb" onclick="deferChoices()">稍後再選</button>`);
}
function pickRelic(id){ SFX('card'); takeRelic(id); hideOverlay(); G.dirty = true; if (G.relicPicks > 0) openRelics(); }
function pickCard(id){ SFX('card'); takeCard(id); hideOverlay(); G.dirty = true; if (G.picks > 0) openCards(); }
function charHtml(){
  return `<div class="rc char-card"><div class="rh">角色 <button class="mb" style="float:right" onclick="openModal('dress')">角色頁與裝扮</button></div><div class="chars">${Object.entries(CHARS).map(([id, c]) => `<button class="chr${G.char === id ? ' on' : ''}" ${charOk(id) ? '' : 'disabled'} onclick="pickChar('${id}');G.dirty=true"><b>${c.n}${G.char === id ? ' ✓' : ''}</b>${charOk(id) ? '' : `<span class="mute">${c.ach ? '成就「' + ACHS[c.ach].n + '」解鎖' : '最深 ' + c.need + ' 層解鎖'}</span>`}</button>`).join('')}</div><div class="char-description">${CHARS[G.char].d}<br>專屬技能「${CHARS[G.char].sig.n}」：${CHARS[G.char].sig.d}</div></div>`;
}
function achHtml(){
  const n = achCount(), tot = Object.keys(ACHS).length;
  return `<div class="rc wide"><div class="rh">成就 ${n} / ${tot}</div><div class="mute">每個成就永久傷害 +1%，目前共 +${n}%</div><ul class="ach">${Object.entries(ACHS).map(([id, a]) => `<li class="${G.ach[id] ? 'got' : 'mute'}">${xico('badge', id, 26)}<b>${a.n}</b>　${a.d}</li>`).join('')}</ul></div>`;
}
function cardsHtml(){
  const e = Object.entries(G.cards); const pend = (G.picks > 0 ? `<button class="mb" onclick="openCards()">有 ${G.picks} 次改裝待選</button> ` : '') + (G.relicPicks > 0 ? `<button class="mb" onclick="openRelics()">有 ${G.relicPicks} 次遺物待選</button> ` : '') + `<button class="mb" onclick="toggleAuto()">自動隨機：${G.autoCard ? '開' : '關'}</button>`;
  return `<div class="rc"><div class="rh">改裝卡</div>${pend}<ul>${e.length ? e.map(([id, n]) => `<li><b>${CARDS[id].n}</b> ×${n} <span class="mute">${CARDS[id].d.split('，')[0]}</span></li>`).join('') : '<li class="mute">升級時可選擇</li>'}</ul></div>`;
}

/* offline progress */
const HELP = {
  skills:['拼圖說明', '主動技能自己施放，輔助配件只強化上下左右相鄰、標籤相符的主動技能。<br>把機件拖到格子上，放不下會顯示紅色；按「旋轉」換方向。<br>放下前，下方會顯示放上去之後傷害的變化。<br>連到 3 個以上輔助會「滿載」，每多一個傷害 +8%。<br>共鳴：塞滿整列全隊傷害 +12%，塞滿整欄暴擊率 +5%，同元素技能緊貼各自傷害 +15%。<br>面板 6×6，隨等級逐列解鎖。構築 1 至 3 各存一套拼圖與天賦。'],
  craft:['改機說明', '用不到的裝備會自動拆成零件。零件可以重新校準數值、改裝詞綴、升級稀有度，或賭一把腐化。<br>鎖定一條詞綴可以保住它；已腐化的裝備不能再改。'],
  maps:['冒險說明', '挑戰詞綴只表示敵人強化或取捨詞綴的數量，不是難度評分。<br>地圖詞綴讓敵人更強，但戰利品更好；每張卡下方的標籤是風險與回報彙總。<br>無限之塔每層殺滿怪上樓，每 10 層是守關者，死亡就結束。<br>訓練場用不還手的假人量 30 秒傷害。'],
  goals:['任務與目標', '新手任務一次一個，完成後解鎖新系統。目標達成會自動給獎勵，不用手動領取。']
};
const MTN = { char:'角色', skills:'戰鬥', craft:'打造', tree:'成長', maps:'冒險', menu:'更多', dress:'角色', goals:'收藏', ach:'收藏', dex:'收藏', log:'更多', save:'更多' };
const MHELP = { skills:'skills', craft:'craft', maps:'maps', goals:'goals' };
const CZN = ['大', '中', '小'];
function mobTitle(){ uiTitle(); }
function cycleCz(){ const current = (modalTab === 'skills' || modalTab === 'craft') && !G.userCz ? 2 : (G.cz == null ? 1 : G.cz); G.cz = (current + 1) % 3; G.userCz = true; G.dirty = true; mobTitle(); }
const mobRatio = () => { const auto=(modalTab==='skills'||modalTab==='craft')&&!G.userCz,i=auto?2:G.cz==null?1:G.cz,h=visualViewport?.height||innerHeight; return Math.min([340,260,168][i],h*[.5,.36,.25][i])/Math.max(1,innerWidth); };
const RISKM = Object.keys(MODS).filter(k => ['challenge','mixed'].includes(MODS[k].kind));
function runMods(R){
  const mods = R.map.mods || []; if (!mods.length) return '';
  const q = mods.reduce((a, k) => a + MODS[k].q, 0);
  return `<ul>${mods.map(k => `<li style="color:${RISKM.includes(k) ? '#d03a3a' : '#1d8a4c'}">${MODS[k].n}</li>`).join('')}</ul><div class="agg"><span>挑戰詞綴 <b>${mapChallenge(mods)}</b></span><span>戰利品 <b>+${Math.round(q*100)}%</b></span><span>金幣 <b>${mods.includes('rich') ? '+60%' : '+0%'}</b></span><span>稀有度 <b>${mods.includes('lucky') ? '提升' : '一般'}</b></span></div>`;
}
function setFilter(i){ G.filter = i; G.dirty = true; renderModal(); }
function rulesBar(){
  return `<div class="mc" style="margin:0 0 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>拾取規則</b>${['全部撿', '魔法以上', '稀有以上'].map((n, i) => `<button class="mb" style="${G.filter === i ? 'background:#1f3fb0;color:#fff;' : ''}" onclick="setFilter(${i})">${n}</button>`).join('')}${qm('craft')}</div>`;
}
function lockTip(k){ const L = TAB_LVL[k]; showOverlay(`<div class="mct">尚未開放.txt</div><div style="font-size:13px;line-height:1.7">升到 ${L} 級開放${k === 'craft' ? '改機（拆裝備得零件，重洗與改裝詞綴）' : '天賦盤（升級得到的點數在這裡分配）'}。</div><button class="mb" onclick="hideOverlay()">知道了</button>`); }
function showHelp(k){ const H = HELP[k]; if (H) showOverlay(`<div class="mct">${H[0]}.txt</div><div style="font-size:13px;line-height:1.7">${H[1]}</div><button class="mb" onclick="hideOverlay()">知道了</button>`); }
const qm = k => `<button aria-label="${HELP[k] ? HELP[k][0] : '說明'}" class="qm" onclick="showHelp('${k}')">?</button>`;
function showOverlay(html){ const o = $('ovl'); o.innerHTML = `<div class="mbox small">${html}</div>`; uxOpenDialog(o, o.querySelector('h2,b,.mct')?.textContent || '遊戲提示', hideOverlay); }
function hideOverlay(){ craftPending=null;UI_RESPEC=null;uxCloseDialog($('ovl')); }
function fmtDur(s){ s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? h + ' 小時 ' : '') + (m ? m + ' 分' : (h ? '' : s + ' 秒')); }
function catchUp(sec, report){
  if (G.paused) return; const away = sec; sec = Math.min(sec, 6*3600);
  const b = { lvl:G.lvl, depth:G.depth, gold:G.gold, kills:G.totalKills, deaths:G.deaths, gems:{...G.gems}, carts:{...G.carts} };
  G.off = { lvls:0, eq:0, maps:0, gems:0, carts:0, cores:0, cards:[] }; G.offline = true; G.offPen = sec > 60; G.paused = true; G.floats = []; G.fx = [];
  let left = sec; const total = sec;
  if (report) showOverlay(`<b>離線結算中…</b><div class="mute" id="oprog">0%</div>`);
  (function chunk(){
    const t0 = performance.now();
    while (left > 0 && performance.now() - t0 < 8){ update(.2); left -= .2; }
    if (left > 0){ if (report && $('oprog')) $('oprog').textContent = Math.round((1 - left/total)*100) + '%'; setTimeout(chunk, 0); return; }
    for (const d of G.drops) if (!d.done){ d.done = true; pickup(d); } G.drops = []; G.proj = []; G.timers = []; G.mons = []; G.spawnCd = .5; G.h.swingT = -1; G.h.castT = -1; G.h.dead = 0;
    resolveOfflineChoices(G.off);
    if (G.h.hp <= 0) G.h.hp = G.st.life;
    G.offline = false; G.paused = false; G.lastWall = Date.now(); const o = G.off; G.off = null; G.dirty = true; const saved = saveGame();
    if (report) showOverlay(uxOfflineReport(o,b,away,sec,saved));
  })();
}
function setupPanel(){
  const st = document.createElement('style');
  st.textContent = `.rpg{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:6px 0 14px;font-size:12px}
    .rc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;background:color-mix(in srgb,var(--paper) 88%,#fff);box-shadow:0 3px 0 #b9c6ee}  .nm{display:flex;align-items:center;gap:8px;margin:2px 0 4px} .nm b{font-size:13px} .ico{flex:none;overflow:visible} .rc.wide{grid-column:1/-1}
    .rh{display:flex;justify-content:space-between;gap:8px;font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:4px}
    .rc ul,.rc ol{margin:4px 0 0;padding-left:16px} .rc li{margin:1px 0} .rc li.imp{color:var(--muted)} .mute{color:var(--muted);font-size:11px}
    .log{max-height:130px;overflow:auto;list-style:none;padding-left:0 !important} .log li{margin:2px 0}
    .actions{gap:5px !important} .act{padding:3px 12px !important;font-size:12px}
    .modal{position:fixed;inset:0;background:rgba(43,37,82,.45);display:flex;align-items:center;justify-content:center;z-index:20;padding:12px} .modal[hidden]{display:none}
    .mbox{background:var(--paper);border:1.5px solid var(--ink);border-radius:14px;box-shadow:0 4px 0 #b9c6ee;width:min(720px,100%);max-height:90vh;overflow:auto;padding:14px;font-size:12.5px} .mbox.small{width:min(420px,100%)}
    .mtabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap} .tab{padding:3px 12px;font-size:12px} .tab.on{background:var(--ink);color:var(--paper)} .tab.x{margin-left:auto} .mb.pri{background:#e2583d !important;color:#fff !important;border-color:#8a2a18 !important;font-weight:700} .mct::before{content:'✦ ';color:#e2583d} .nw{position:absolute;top:-6px;right:-4px;background:#e2583d;color:#fff;font-style:normal;font-size:10px;padding:0 4px;z-index:2} .gt{position:relative} #modtxt{position:absolute;left:8px;top:8px;z-index:3;font-size:11px;line-height:1.5;opacity:.5;pointer-events:none;color:#2b2552;text-shadow:0 0 3px #fff,0 0 3px #fff} body.m #modtxt{top:64px} .pzbar{position:sticky;bottom:-8px;background:var(--paper);padding:4px 0;z-index:4} .agg{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-top:4px;font-size:12px}
    /* Y2K 低像素感：階梯狀切角、掃描線標題、方形圓點 */
    body{-webkit-font-smoothing:none;text-rendering:optimizeSpeed} #loot{position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:35;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;width:min(300px,86vw)}
    .lt{width:100%;background:var(--paper);border:2px solid var(--rc);box-shadow:3px 3px 0 var(--rc);padding:4px 10px;animation:ltin .35s cubic-bezier(.2,1.6,.4,1);transition:opacity .6s,transform .6s;font-size:12px}
    .lt.out{opacity:0;transform:translateY(-12px)} .lt .lh{display:flex;gap:8px;align-items:baseline} .lt .lh span{background:var(--rc);color:#fff;padding:0 6px;font-size:11px} .lt .lh b{font-size:15px;color:var(--rc);flex:1} .lt .lh i{font-style:normal;color:#8a8a99;font-size:11px} .lt .ll.lg{color:#c4501f}
    .lt.r2{background:linear-gradient(#fff8dc,var(--paper))} .lt.r3{background:linear-gradient(#ffe2cf,var(--paper));animation:ltin .35s cubic-bezier(.2,1.6,.4,1),ltglow 1s ease-in-out infinite alternate;padding:8px 12px;font-size:13px} .lt.r3 .lh b{font-size:19px}
    @keyframes ltin{from{transform:scale(.5) translateY(-20px);opacity:0}to{transform:none;opacity:1}} @keyframes ltglow{from{box-shadow:3px 3px 0 var(--rc),0 0 6px var(--rg)}to{box-shadow:3px 3px 0 var(--rc),0 0 22px var(--rg)}} .dpsbar{position:sticky;top:-8px;z-index:5;background:var(--paper);border:1.5px solid var(--ink);padding:4px 8px;margin:0 0 8px;font-size:13px} .dpsbar .shares{display:flex;gap:2px;margin-top:3px} .dpsbar .shares span{background:#ffb4d2;font-size:11px;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:clip;min-width:0} .rchips{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0} .chip{font-size:11px;padding:0 8px;border-radius:999px;border:1.5px solid} .chip.ok{color:#1d8a4c;border-color:#1d8a4c} .chip.bad{color:#d03a3a;border-color:#d03a3a} .qm{display:inline-block;width:16px;height:16px;line-height:14px;text-align:center;font-size:11px;border:1.5px solid var(--ink);border-radius:50%;background:var(--paper);cursor:pointer;margin-left:6px;vertical-align:middle;padding:0} .rd{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e2483d;margin-left:4px;vertical-align:middle} #pzdelta b.up{color:#1d8a4c} #pzdelta b.dn{color:#d03a3a} #nexthint{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:30;background:var(--paper);color:var(--ink);border:1.5px solid var(--ink);border-radius:999px;padding:3px 14px;font-size:12px;cursor:pointer;box-shadow:2px 2px 0 rgba(31,63,176,.35);max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #nexthint[hidden]{display:none} .subtabs{flex:1 0 100%;display:flex;gap:4px;padding-top:2px} .tab.sub{font-size:11px;padding:1px 10px;border-style:dashed}
    .mrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px} .mc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;box-shadow:0 2px 0 #b9c6ee} .mc.dim{opacity:.5} .mc.run{margin-bottom:10px;border-style:dashed}
    .mc ul{margin:4px 0 6px;padding-left:16px} .hint{color:var(--muted);font-size:11.5px;margin:4px 0 8px;line-height:1.5} .hint b{color:var(--ink)}
    .srow{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px} select,.sv{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:3px 6px;max-width:100%}
    .mc>select{display:block;margin:6px 0} .tree{width:100%;max-width:520px;display:block;margin:0 auto 6px;background:radial-gradient(circle,rgba(111,196,245,.22) 1.6px,transparent 2px) 0 0/16px 16px,linear-gradient(#ffffff,#e6f1ff);border:3px solid #fff;box-shadow:0 0 0 2px #aab8ee;border-radius:18px} .tn.open circle,.tn.open polygon{animation:tp 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center} @keyframes tp{50%{transform:scale(1.12)}}
    .ach{padding-left:0;list-style:none;margin:6px 0 0}.ach li{margin:3px 0}.ach .got{color:#a87400}
    .chars{display:flex;gap:6px;margin:4px 0}.chr{font:inherit;flex:1;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px;cursor:pointer;display:flex;flex-direction:column;font-size:13px}.chr.on{background:#d9e6ff;box-shadow:inset 0 0 0 2px #4a7fdc}.chr[disabled]{opacity:.5;cursor:default}.chr .mute{font-size:10px}
    .cards{display:flex;gap:8px;margin:10px 0}.mbox.small:has(.cards){width:min(470px,94vw)}
    .card{font:inherit;color:var(--ink);background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:8px 10px;flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px;text-align:left;cursor:pointer;box-shadow:3px 3px 0 var(--ink)}
    .card.var{background:#efe3ff;border-color:#8e3fd1}.card .ct{font-size:11px;opacity:.7}.card .cd{font-size:12px}.card:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
    .mb.on{background:var(--ink);color:var(--paper)} .mb{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:4px 14px;cursor:pointer} .mb[disabled]{opacity:.4;cursor:default}
    .sv{width:100%;height:90px;margin-top:8px;resize:vertical} .hbar{display:block;width:96px;height:8px;border:1.5px solid var(--ink);border-radius:5px;margin:4px 0 0 auto;background:#fffb;overflow:hidden;box-shadow:0 1px 0 #b9c6ee} .hbar i{display:block;height:100%;border-right:1.5px solid var(--ink)} .gl{margin:4px 0;padding-left:16px}`;

  /* Y2K 童話風介面：泡泡視窗（白到淡藍漸層、白色內框、粉彩外框）、糖果按鈕、緞帶標題、膠囊血條 */
  st.textContent += `
    :root{--bub:#b9c6ee;--bubd:#8f9fe0;--cream:#fffaf0}
    body{font-family:"Cubic 11","Arial Rounded MT Bold","Hiragino Maru Gothic ProN","jf-openhuninn","Microsoft JhengHei","PingFang TC","Noto Sans TC",system-ui,sans-serif}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#ffffff 0%,#edf5ff 100%) !important;border:3px solid #fff !important;border-radius:20px !important;
      box-shadow:0 0 0 2px var(--rc,var(--bub)),0 5px 0 2px var(--rc,var(--bubd)),0 10px 18px #7f90d840 !important;padding:10px 12px !important}
    .rc.item{--rc:#b9c6ee}
    .rh{background:var(--rc,var(--bub));color:#fff !important;border-radius:12px;padding:2px 10px;margin:-4px -2px 8px !important;font-weight:800;letter-spacing:.06em !important;text-shadow:0 1px 0 #00000030}
    .rh .mute{color:#ffffffd0 !important}
    .act,.chip,.mb,.tab,button:not(.sw){background:linear-gradient(180deg,#ffffff 0%,#d9e6ff 100%) !important;border:2px solid var(--bubd) !important;color:var(--ink) !important;font-weight:700;
      box-shadow:0 3px 0 var(--bubd),inset 0 1px 0 #fff !important;transition:transform .08s}
    .act:hover,.chip:hover,.mb:hover,.tab:hover{transform:translateY(-1px);background:linear-gradient(180deg,#fff 0%,#e3f0ff 100%) !important}
    .act:active,.chip:active,.mb:active{transform:translateY(2px);box-shadow:0 1px 0 var(--bubd) !important}
    .tab.on,.chip.current{background:linear-gradient(180deg,#8fb6ff,#5f8fe8) !important;color:#fff !important;text-shadow:0 1px 0 #00000030}
    .chips{background:linear-gradient(180deg,#fff,#edf5ff) !important;border:3px solid #fff !important;border-radius:18px !important;box-shadow:0 0 0 2px var(--bub),0 5px 0 2px var(--bubd) !important}
    .hbar{height:11px !important;width:104px !important;border:2px solid var(--bubd) !important;border-radius:999px !important;background:#fff !important;box-shadow:inset 0 2px 0 #00000012 !important}
    .hbar i{border-right:0 !important;border-radius:999px;background-image:linear-gradient(180deg,#ffffff70,#ffffff00 55%,#00000018) }
    .toast{border-radius:999px !important;border:2px solid var(--bubd) !important;box-shadow:0 3px 0 var(--bubd) !important}
    .modal{background:rgba(120,140,210,.45) !important;backdrop-filter:blur(3px)}
    select,.sv{border:2px solid var(--bubd) !important;border-radius:12px !important}
    header h1{font-size:15px !important;letter-spacing:.08em;color:#fff;text-shadow:0 2px 0 var(--bubd),0 0 8px #7f90d8}
    .actions .cap{color:#fff !important;text-shadow:0 1px 0 var(--bubd)}
    .stat .k{color:#5b6aa8 !important} .stat .v{text-shadow:0 2px 0 #fff,0 0 10px #fff}
  `;
  st.textContent += `
    body::before{content:'';position:fixed;left:0;right:0;top:0;height:45%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(255,255,255,.4) 3px,transparent 3.5px) 0 0/28px 28px;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)}
    header h1{display:block;margin:0;line-height:0} header h1 .wm{width:min(230px,42vw);height:auto;overflow:visible;filter:drop-shadow(0 2px 0 rgba(43,37,82,.25))}
    header h1 .lg{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:3px solid #fff;color:#fff;font:900 16px/1 'Arial Rounded MT Bold','Nunito',system-ui,sans-serif;text-shadow:0 1px 0 rgba(43,37,82,.35);box-shadow:0 2px 0 rgba(43,37,82,.25);letter-spacing:0}
    header h1 .lg:nth-child(4n+1){background:#ff8fc4}header h1 .lg:nth-child(4n+2){background:#ffd35a}header h1 .lg:nth-child(4n+3){background:#6fc4f5}header h1 .lg:nth-child(4n){background:#7fdcae}
    header h1 .gap{width:8px}
    .spr{display:inline-block;vertical-align:middle;flex:none;image-rendering:auto}
    .controls{display:none}`;
  /* 作業系統視窗風：藍色漸層標題列、視窗鈕、斜角邊框、凹陷內容區、黑底事件框、底部工作列（參考 Win98／XP 與 Y2K 個人網頁參考圖） */
  st.textContent += `
    :root{--win:#e6ecfa;--wlt:#ffffff;--wdk:#7d8bbd;--wbd:#2f3f8f}
    .rc,.mc,.mbox{background:var(--win) !important;border:1px solid var(--wbd) !important;border-radius:4px !important;
      box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855 !important;padding:8px 10px 10px !important}
    .rh{background:linear-gradient(90deg,var(--rc,#1f3fb0),#7fb0ff) !important;border-radius:2px !important;margin:-4px -6px 8px !important;padding:2px 6px 2px 8px !important;display:flex;align-items:center;font-size:11.5px}
    .rh::after{content:none;display:none;margin-left:8px;flex:none;font-size:9px;letter-spacing:2px;color:var(--wbd);background:var(--win);border:1px solid #fff;border-right-color:var(--wdk);border-bottom-color:var(--wdk);padding:0 4px;text-shadow:none;line-height:13px}
    .rh>:first-child{margin-right:auto}
    .rc ul,.rc ol{background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:2px;padding:6px 8px 6px 22px !important;margin-top:2px}
    .rc .nm+ul,.rc .nm~ul{margin-top:4px}
    .rc.wide ol.log{background:#14123a;border-color:#000 #5a6bb8 #5a6bb8 #000;padding:6px 10px !important;line-height:1.55}
    .rc.wide ol.log li{color:#f2f6ff !important} .rc.wide ol.log li::before{content:'♥ ';color:#ff8fb8}
    .mbox::before{content:'★ Idle Hero.exe  ' var(--ver);display:block;margin:-8px -10px 10px;padding:3px 10px;color:#fff;font-weight:800;font-size:12px;letter-spacing:.06em;white-space:pre;overflow:hidden;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);text-shadow:0 1px 0 #00000040;position:sticky;top:-8px;z-index:2}
    .stats{background:var(--win);border:1px solid var(--wbd);border-radius:4px;box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855;padding:22px 12px 8px !important;gap:6px !important}
    .stats::before{content:'STATUS';position:absolute;left:0;right:0;top:0;padding:1px 8px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.08em;color:#fff;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);border-radius:3px 3px 0 0}
    .stat .k{color:#3a4a90 !important} .stat .v{text-shadow:none !important}
    .tfoot{position:fixed;left:0;right:0;bottom:0;height:30px;z-index:15;display:flex;align-items:center;gap:8px;padding:0 8px;background:linear-gradient(180deg,#6fa0f5,#2f5fd0);border-top:2px solid #9fc4ff;color:#fff;font:700 12px/1 system-ui,sans-serif;box-shadow:0 -2px 8px #2f3f8f40}
    .tfoot .start{background:linear-gradient(180deg,#5fd07a,#2f9f4a);border:1px solid #1f7a35;border-radius:0 10px 10px 0;padding:5px 12px 5px 8px;font-style:italic;text-shadow:0 1px 0 #00000050}
    .tfoot .task{background:#ffffff30;border:1px solid #ffffff60;border-radius:3px;padding:4px 10px;font-weight:600}
    .tfoot .clk{margin-left:auto;background:#1f3fb040;border-left:1px solid #ffffff50;padding:6px 10px}
    .stat .v{font-size:24px !important} .stat.small .v{font-size:17px !important} .stats{min-width:120px}
    @media (max-width:560px){.stats{position:relative !important;display:grid !important;grid-template-columns:1.2fr 1.4fr .8fr .8fr;align-items:end;gap:4px 10px !important;text-align:center !important}.stats .stat{display:flex;flex-direction:column;align-items:center}.stats .hbar{margin:4px auto 0 !important;width:64px !important}
      body .rpg{grid-template-columns:repeat(2,minmax(0,1fr)) !important}body .rpg .rc.wide{grid-column:1/-1}.stats .stat{width:100%}.rc{font-size:11.5px}}
    header,.stage,#fig,.rpg{max-width:1040px !important} .rpg{grid-template-columns:repeat(auto-fit,minmax(190px,1fr)) !important}
    .actions .cap{display:none !important}
    .mct{font-weight:800;font-size:12.5px;color:var(--wbd)}
    .mc.slot{cursor:pointer} .mc.slot.act{box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk),0 0 0 2px #ff8fb8,3px 4px 0 #5a6bb855 !important}
    .gls{display:grid;gap:6px;margin-top:6px} .gl{position:relative;display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:6px 8px 10px;background:#fff;border:1px solid var(--wdk);border-radius:4px;font-size:12px}
    .gl span{grid-column:1/2;font-size:11px} .gl em{grid-row:1;grid-column:2;font-style:normal;font-size:11px;color:var(--muted)} .gl.ok{background:#fff6d6} .gl.ok em{color:#a07000;font-weight:700}
    .gl i{position:absolute;left:0;bottom:0;height:4px;width:var(--p);background:#ff8fb8;border-radius:0 2px 0 4px}
    .pz{display:grid;width:100%;gap:3px;margin:8px 0;max-width:420px;touch-action:pan-y}
    .pc{aspect-ratio:1;min-width:0;overflow:hidden;max-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:700;text-align:center;cursor:pointer;color:var(--ink);padding:2px;border-radius:3px;
      background:radial-gradient(circle at 50% 50%,#c7d0ee 0 1.5px,transparent 2px) 0 0/10px 10px,#f1f4ff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;box-shadow:inset 1px 1px 0 #9aa6d6;user-select:none;-webkit-user-select:none}
    .pc.lock{background:repeating-linear-gradient(45deg,#cfd6ef 0 4px,#dfe5f7 4px 8px);color:var(--muted);cursor:default;font-weight:400;box-shadow:none}
    .pc.fill{touch-action:none;background:linear-gradient(135deg,#ffffffaa 0,#ffffff00 45%),var(--pc);border:2px solid #fff;border-right-color:#0003;border-bottom-color:#0003;box-shadow:none}
    .pc.fill.jr{border-right:0;margin-right:-4px;padding-right:6px;border-top-right-radius:0;border-bottom-right-radius:0} .pc.fill.jb{border-bottom:0;margin-bottom:-4px;padding-bottom:6px;border-bottom-left-radius:0;border-bottom-right-radius:0}
    .pc.fill.jr + .pc.fill{border-left:0;border-top-left-radius:0;border-bottom-left-radius:0}
    .pc.sel{outline:3px solid #2f7fc4;outline-offset:-3px;z-index:1} .pc.lnk{outline:3px solid #3fd88a;outline-offset:-3px} .pc.sel.lnk{outline-color:#2f7fc4}
    .pc.pv.ok{background:#b8f5d0 !important;border:2px solid #3fd88a !important} .pc.pv.bad{background:#ffc4c4 !important;border:2px solid #e2483d !important}
    .pzbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap} .gt.on{box-shadow:0 0 0 2px #ff8fb8 !important}
    .shp{display:inline-grid;gap:1px;vertical-align:middle;margin:0 2px} .shp i{width:9px;height:9px;border:1px solid #fff;border-radius:1px} .shp i.e{border:0;background:none}
    .pzghost{position:fixed;z-index:99;pointer-events:none;transform:translate(-50%,-50%) scale(1.8);opacity:.85;filter:drop-shadow(2px 3px 0 #2f3f8f66)}
    .skb{touch-action:none} .gt .shp{touch-action:none;padding:8px 6px}
    .skb{width:auto !important;min-width:40px;gap:4px;padding:0 4px !important;display:flex !important;align-items:center}
    .skrow{display:flex;gap:6px;margin:8px 0 6px;flex-wrap:wrap}
    .skb{width:40px;height:40px;padding:0 !important;border-radius:4px !important;display:grid;place-items:center;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .skb.on{background:#fff !important;box-shadow:inset 1px 1px 0 var(--wdk),inset -1px -1px 0 #fff,0 0 0 2px #ff8fb8 !important} .skb[disabled]{opacity:.35;filter:grayscale(1)}
    .socks{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 6px}
    .sock{min-height:34px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--muted);background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:3px;padding:2px 4px !important}
    button.sock{box-shadow:none !important;background:#fff !important;border-radius:3px !important;font-weight:700;color:var(--ink) !important}
    .gem{display:inline-block;flex:none}
    .gems{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
    .gt{display:grid !important;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:0 8px;align-items:center;text-align:left;border-radius:4px !important;padding:6px 8px !important;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .gt .gem{grid-row:1/3} .gt em{font-style:normal;font-size:11px;background:#14123a;color:#fff;border-radius:3px;padding:0 5px} .gt small{grid-column:2/4;font-size:10.5px;color:var(--muted);font-weight:500;line-height:1.35}
    .gt[disabled]{opacity:.45}
    select{appearance:none;-webkit-appearance:none;background:#fff linear-gradient(var(--win),var(--win)) no-repeat right/22px 100% !important;border-radius:3px !important;border:1px solid var(--wdk) !important;padding:3px 26px 3px 6px !important}
    .dlg{position:absolute;left:50%;transform:translate(-50%,12px);width:min(520px,92%);z-index:4;background:#14123a;color:#f2f6ff;border:2px solid #fff;outline:2px solid var(--wbd);border-radius:6px;padding:8px 34px 12px 12px;font-size:13px;line-height:1.5;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;box-shadow:4px 5px 0 #2f3f8f55}
    .dlg.show{opacity:1;transform:translate(-50%,0)} .dlg b{display:block;color:#8fd0ff;font-size:11px;letter-spacing:.12em} .dlg::after{content:'♥';position:absolute;right:10px;bottom:6px;color:#ff8fb8;animation:dlgb 1s infinite}
    .dlg i{position:absolute;left:12px;right:34px;bottom:4px;height:3px;background:repeating-linear-gradient(90deg,#8fb6ff 0 8px,transparent 8px 11px);transform-origin:left;animation:dlgt 2.6s linear forwards}
    @keyframes dlgb{50%{transform:translateY(-2px)}} @keyframes dlgt{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @media (orientation:portrait){#cv3{-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent),linear-gradient(180deg,transparent,#000 8%,#000 94%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent),linear-gradient(180deg,transparent,#000 8%,#000 94%,transparent);mask-composite:intersect}}   /* 手機拉近後，四邊裁切處淡出，不留硬邊 */
    body.m{height:100vh;height:100dvh;overflow:hidden;padding:env(safe-area-inset-top) 0 calc(56px + env(safe-area-inset-bottom)) !important;gap:0;display:flex;flex-direction:column}   /* 手機：戰鬥區在上、面板在下，分頁列固定在最底 */
    body.m header,body.m #readout{display:none}
    body.m .stage{flex:none;position:relative;width:100%} body.m #fig{margin:0;display:block;width:100%}
    body.m .stats{position:absolute !important;top:4px;left:6px;right:6px;z-index:4;padding:3px 8px !important;margin:0 !important;background:rgba(242,247,255,.82);border:1.5px solid var(--ink);grid-template-columns:1.3fr 1.5fr .8fr .8fr .9fr} body.m .stats::before{display:none}
    body.m .stat .k{font-size:11px} body.m .stat .v{font-size:16px !important} body.m .stat.small .v{font-size:15px !important}
    body.m #nexthint{position:absolute;left:6px;bottom:6px;top:auto;transform:none;max-width:62%;z-index:4;font-size:12px;padding:4px 10px;min-height:28px}
    body.m #ctxbtn{position:absolute;right:8px;bottom:8px;width:56px;height:56px;z-index:4;font:inherit;font-size:13px;background:var(--paper);border:2px solid var(--ink);box-shadow:2px 2px 0 rgba(31,63,176,.4);cursor:pointer;clip-path:none;border-radius:50%}
    body.m #loot{top:64px}
    #ctxbtn{display:none} body.m #ctxbtn:not([hidden]){display:block}
    body.m #mttl{flex:none;height:32px;display:flex;align-items:center;gap:6px;padding:0 6px 0 10px;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);color:#fff;font-size:14px;font-weight:700;border-bottom:2px solid #0b1f6b}
    body.m #mttl span{flex:1} body.m #mttl button{width:28px;height:28px;padding:0;background:var(--paper);border:1.5px solid var(--ink);font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}
    body.m .rpg{display:none}
    body.m #modal{position:static;display:flex;flex:1 1 0;min-height:0;height:auto;width:100%;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.m .mbox{width:100%;max-height:none;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:0 !important}
    body.m .mbox::before{display:none}
    body.m .mtabs{display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin:0;position:fixed;left:0;right:0;bottom:0;z-index:40;height:calc(56px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:linear-gradient(90deg,#1f3fb0,#7fb0ff);box-shadow:0 -2px 0 #0b1f6b} body.m .tab .rd{position:absolute;top:4px;right:calc(50% - 20px);margin:0} body.m .tab{position:relative} body.m .tab.lock{opacity:.55} body.m .tab svg,body.m .tab canvas,body.m .tab .spr{width:24px !important;height:24px !important}
    body.m .tab{display:flex !important;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 0 3px !important;font-size:12px;min-height:44px;border-radius:0 !important;border:0 !important;border-right:1px solid #ffffff55 !important;box-shadow:none !important;background:transparent !important;color:#fff !important;text-shadow:0 1px 0 #00000040}
    body.m .tab.on{background:var(--win) !important;color:var(--wbd) !important;text-shadow:none;margin-top:-4px;padding-top:8px !important;border-radius:6px 6px 0 0 !important;box-shadow:0 -2px 0 #fff inset !important}
    body.m #mbody{flex:1;overflow:auto;padding:8px;-webkit-overflow-scrolling:touch}
    body .idc{background:#fff6cf;border:3px solid #2b2552;border-radius:6px;padding:8px 10px 10px;margin-bottom:8px;box-shadow:inset 0 0 0 2px #fff6cf,inset 0 0 0 4px #b8884a;color:#3a2330}
    body .idh{font-size:18px;letter-spacing:.12em;text-align:center;font-weight:700} body .ids{text-align:center;background:#5a2a3a;color:#fff6cf;margin:4px 14px 8px;border-radius:10px;font-size:11px;padding:1px 0}
    body .idb{display:flex;gap:10px} body .idp{flex:0 0 38%;aspect-ratio:3/4;border:3px solid #5a2a3a;background:linear-gradient(180deg,#d8efff,#f4fbff);border-radius:3px;overflow:hidden}
    body .idf{flex:1;display:flex;flex-direction:column;justify-content:space-between} body .idr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5a2a3a;padding:2px 2px;font-size:12px}
    body .idr input{width:7em;text-align:right;font:inherit;border:0;background:transparent;color:inherit;border-bottom:1px dashed #5a2a3a} body .idt{text-align:center;margin-top:6px;border-top:2px solid #5a2a3a;padding-top:4px;font-size:14px}
    body .isr{display:flex;justify-content:center;gap:3px;margin-top:3px} body .isr i{width:12px;height:12px;background:#d8c6a0;clip-path:polygon(50% 0,62% 36%,100% 38%,70% 60%,80% 100%,50% 76%,20% 100%,30% 60%,0 38%,38% 36%)} body .isr i.on{background:#ff9a3c} body .isr.big i{width:22px;height:22px}
    body .dcats{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0} body .dcats .mb.on{background:#ffd6ea !important} body .dsw{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
    body .sw{width:100%;display:flex !important;flex-direction:column;align-items:center;gap:2px;height:auto !important;min-height:72px;padding:5px 2px !important;border-radius:6px !important;font-size:11px;line-height:1.15;white-space:normal !important;overflow:visible} body .sw span{display:block} body .sw i{width:30px;height:30px;border:2px solid #2b2552;border-radius:4px;display:block;font-style:normal;text-align:center;line-height:26px;font-size:14px} body .sw.on{background:#ffd6ea !important;outline:2px solid #ff6aa8} body .sw.cur{box-shadow:0 0 0 2px #3fa86a} body .sw em{font-style:normal;color:var(--muted);font-size:10px}
    body .dact{display:flex;align-items:center;gap:8px;margin-top:8px}
    body .cft li{display:flex;justify-content:space-between;gap:6px;align-items:center} body .cft .lk{cursor:pointer;opacity:.5;padding:0 8px !important;min-width:0;height:22px;line-height:18px;flex:none} body .cft .rc{margin-top:6px} body .cft .lk.on{opacity:1} body .cft .cb{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    body .rc li.lgd{color:#c4501f;font-weight:bold} body .lg{margin:6px 0 10px} body .lg ul{margin:3px 0 0 18px;padding:0} body .lg li{margin:2px 0}
    body.m #mmenu{padding:8px 8px 0} body.m #mmenu .actions{position:static !important;display:flex !important;flex-direction:row !important;flex-wrap:wrap;gap:6px !important;max-width:none}
    body.m #mmenu .chips{left:0 !important;top:calc(100% + 6px) !important}
    .rpgm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:11.5px} .rpgm .rc.wide{grid-column:1/-1}
    body.m .mrow{grid-template-columns:1fr} body.m .gems{grid-template-columns:1fr 1fr}
    body{padding-bottom:44px !important}
    body.d{display:grid !important;grid-template-columns:272px minmax(0,1fr) 350px;grid-template-areas:"hd hd hd" "lf st rt";gap:12px;align-items:start;justify-items:stretch;max-width:1680px;margin:0 auto !important;padding:8px 16px 44px !important}
    body.d header{grid-area:hd;max-width:none !important} body.d .stage{grid-area:st;max-width:none !important;width:100%} body.d #fig{max-width:none !important}
    body.d .rpg{grid-area:lf;display:flex !important;flex-direction:column;max-width:none !important;margin:0;gap:8px;max-height:calc(100vh - 122px);overflow:auto}
    body.d #modal{grid-area:rt;position:sticky;top:8px;display:flex;width:100%;height:calc(100vh - 122px);min-height:480px;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.d .mbox{width:100%;max-height:none;height:100%;overflow:auto;padding:14px}
    body.m .mbox.small,body.d .mbox.small,body .mbox.small{width:min(520px,92vw) !important;height:auto !important;max-height:80vh !important;overflow:auto !important;padding:10px 14px 14px !important;display:block !important}
    body.m .mbox.small::before,body.d .mbox.small::before{display:block}
    body.d .mtabs{margin-bottom:8px}`;
  { const tb = document.createElement('div'); tb.className = 'tfoot'; tb.innerHTML = '<span class="start">★ Start</span><span class="task">Idle Hero</span><span class="clk" id="clk"></span>'; document.body.appendChild(tb);
    const tick = () => { const d = new Date(); $('clk').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }; tick(); setInterval(tick, 20000); }   // the engine's wobble slider and colour swatches are not part of the game

  st.textContent += `
    /* 老式擬真 3D 質感：玻璃凝膠按鈕、金屬斜角視窗框、LCD 像素格、螢幕玻璃反光 */
    .mb,.tab,.chip{background:linear-gradient(180deg,#ffffff 0%,#e6efff 46%,#bccdf0 52%,#dbe7ff 100%) !important;border:1.5px solid #6f82c8 !important;border-radius:999px !important;color:#2b2552;text-shadow:0 1px 0 #fff;
      box-shadow:0 0 0 2px #fff,0 3px 0 2px #7d8bbd,0 6px 8px rgba(43,37,82,.28),inset 0 1px 0 #fff !important;transition:transform .08s}
    .mb:hover,.tab:hover{background:linear-gradient(180deg,#ffffff 0%,#f0f6ff 46%,#cddcf7 52%,#e8f0ff 100%) !important} .mb:active,.tab:active{transform:translateY(2px);box-shadow:0 0 0 2px #fff,0 1px 0 2px #7d8bbd,inset 0 2px 3px rgba(43,37,82,.25) !important}
    .mb[disabled]{opacity:.55;filter:grayscale(.6)} .tab.on{background:linear-gradient(180deg,#b9d2ff 0%,#6f9cf0 48%,#3f74dc 52%,#6f9cf0 100%) !important;color:#fff !important;text-shadow:0 1px 0 #1a3a99}
    .mb.pri{background:linear-gradient(180deg,#ffd2c2 0%,#ff9a7c 46%,#e2483d 52%,#f2755a 100%) !important;border-color:#8a2a18 !important;color:#fff !important;text-shadow:0 1px 0 #8a2a18}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#f6f9ff 0%,#dfe8fa 100%) !important;border:2px solid #fff !important;outline:1px solid #7d8bbd;border-radius:10px !important;
      box-shadow:inset 0 1px 0 #fff,0 2px 0 #aab6dc !important}
    .rh,.mbox::before{border-radius:6px 6px 2px 2px !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(0,0,60,.25)}
    .stats{background:linear-gradient(180deg,rgba(240,247,255,.92),rgba(196,216,250,.86)) !important;border:2px solid #fff !important;border-radius:12px !important;box-shadow:0 0 0 1px #7d8bbd,0 3px 6px rgba(43,37,82,.3),inset 0 1px 0 #fff !important}
    body:not(.m) .stats{flex-direction:row !important;align-items:center;gap:12px !important;top:8px !important;right:8px !important;padding:3px 12px !important} body:not(.m) .stats::before{display:none}
    body:not(.m) .stat{display:flex !important;flex-direction:row;align-items:baseline;gap:5px;width:auto} body:not(.m) .stat .k{font-size:10px} body:not(.m) .stat .v{font-size:15px !important} body:not(.m) .hbar{width:64px !important;height:9px !important;margin-left:4px}
    body.m .stat .k{font-size:9px;line-height:1} body.m .stat .v{font-size:14px !important;line-height:1.1} body.m .stats{padding:2px 8px !important;top:6px;left:8px;right:8px} body.m .hbar{height:8px !important}
    body.m .mtabs{background:linear-gradient(180deg,#eef2fa 0%,#b9c3dc 50%,#cfd7ea 52%,#a3afcf 100%) !important;border-top:2px solid #fff;box-shadow:0 -3px 8px rgba(43,37,82,.3) !important}
    body.m .tab{margin:4px 3px !important;min-height:46px;border-radius:14px !important;color:#2b2552 !important;text-shadow:0 1px 0 #fff !important;background:linear-gradient(180deg,#fff 0%,#e9f0ff 46%,#c0d0f2 52%,#dfe9ff 100%) !important;border:1.5px solid #6f82c8 !important;box-shadow:0 2px 0 #7d8bbd,inset 0 1px 0 #fff !important}
    body.m .tab.on{margin-top:0 !important;color:#fff !important;text-shadow:0 1px 0 #1a3a99 !important;background:linear-gradient(180deg,#b9d2ff 0%,#6f9cf0 48%,#3f74dc 52%,#6f9cf0 100%) !important;border-radius:14px !important;box-shadow:0 1px 0 #1a3a99,inset 0 1px 0 #fff !important}
    svg.tree{border-radius:12px !important;border:2px solid #fff !important;outline:1px solid #7d8bbd;background:radial-gradient(circle at 50% 45%,#ffffff,#dbe6fb) !important;box-shadow:inset 0 3px 8px rgba(40,60,130,.28),0 2px 0 #8c9bd0 !important}
    .rc ul,.rc ol{background:linear-gradient(180deg,#f3f8ff,#e6eefc) !important;border:1px solid #8c9bd0 !important;border-radius:6px !important;box-shadow:inset 0 2px 3px rgba(40,60,130,.22),0 1px 0 #fff}
    .gt,.skb,.gl{border-radius:8px !important;box-shadow:inset 0 1px 0 #fff,0 2px 0 #aab6dc !important}
    .pz{padding:6px;background:linear-gradient(180deg,#9fb0d8,#c6d2ee);border:2px solid #fff;outline:1px solid #7d8bbd;border-radius:12px;box-shadow:inset 0 3px 6px rgba(30,40,100,.35),0 2px 0 #8c9bd0}
    .pc:not(.fill):not(.lock){background:radial-gradient(circle at 50% 50%,#8294c4 0 18%,#b4c2e6 20%);border-radius:7px;border:1px solid #7d8bbd;box-shadow:inset 0 2px 3px rgba(30,40,100,.4),0 1px 0 #fff}
    .pc.fill{border-radius:8px;box-shadow:inset 0 2px 0 rgba(255,255,255,.85),inset 0 -3px 0 rgba(0,0,60,.28),0 2px 0 rgba(30,40,100,.4) !important;text-shadow:0 1px 0 rgba(255,255,255,.7)}
    .ach li.mute .spr{filter:grayscale(1);opacity:.45}
    .rz{font-size:11.5px;margin:2px 0 4px;color:#1f3fb0;background:#eaf1ff;border:1px solid #9fb2e8;border-radius:6px;padding:2px 8px}
    .stage #loot{position:absolute;left:8px;bottom:8px;top:auto;transform:none;align-items:flex-start;width:min(240px,60%);z-index:5;flex-direction:column-reverse}
    body.m .stage #loot{left:auto;right:6px;bottom:auto;top:52px;align-items:flex-end;width:min(190px,54%);flex-direction:column}
    .lt{padding:1px 8px !important;border-radius:8px;font-size:11px !important;background:rgba(255,255,255,.72) !important;border:0 !important;border-left:3px solid var(--rc) !important;box-shadow:none !important;animation:none !important} .lt.r3{animation:none !important;background:rgba(255,245,220,.88) !important} .lt .lh b{font-size:13px !important} .lt.r3{padding:2px 9px !important;font-size:12px !important} .lt.r3 .lh b{font-size:13px !important}
  `;
  document.head.appendChild(st);
  { // 重要事件用黑底對話框跳出：升級、守關者登場、地圖完成、倒下、撿到暗金
    const dl = document.createElement('div'); dl.className = 'dlg'; document.querySelector('.stage').appendChild(dl);
    const q = [], who = t => /守關者/.test(t) ? 'WARNING' : /倒下/.test(t) ? 'GAME OVER?' : /暗金/.test(t) ? 'LEGENDARY' : 'SYSTEM';
    let busy = false; const next = () => { if (!q.length){ busy = false; return; } busy = true; const fr = $('fig').getBoundingClientRect(), sr = dl.parentElement.getBoundingClientRect(); dl.style.top = (fr.top - sr.top + fr.height*.78) + 'px'; const t = q.shift(); dl.innerHTML = `<b>${who(t)}</b>${t}<i></i>`; dl.classList.add('show'); setTimeout(() => { dl.classList.remove('show'); setTimeout(next, 300); }, 2600); };
    const base = logLine; logLine = (t, c) => { base(t, c); if (!G.offline && /升級了|守關者|地圖完成|倒下/.test(t) && q.length < 3){ q.push(t); if (!busy) next(); } };
  }
  const el = document.createElement('div'); el.className = 'rpg'; el.id = 'rpg'; document.querySelector('.stage').after(el);
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.hidden = true; m.innerHTML = `<div class="mbox"><div class="mtabs" id="mtabs"></div><div id="mbody"></div></div>`;
  m.addEventListener('pointerdown', e => { if (e.target === m && !MOB() && !DESK()) closeModal(); });
  const o = document.createElement('div'); o.className = 'modal'; o.id = 'ovl'; o.hidden = true;
  document.body.append(m, o);
  // 跨尺寸使用同一操作台，不重新載入或重建引擎指令。
  const hint = () => { let h = $('nexthint');
    if (!h){ h = document.createElement('button'); h.type = 'button'; h.id = 'nexthint'; h.onclick = () => { if (h.dataset.tab) openModal(h.dataset.tab); }; document.body.appendChild(h); }
    let cb = $('ctxbtn'); if (!cb){ cb = document.createElement('button'); cb.id = 'ctxbtn'; cb.onclick = () => uiLeaveMap(); }
    const stg = document.querySelector('.stage'); if (stg){ if (h.parentNode !== stg) stg.appendChild(h); if (cb.parentNode !== stg) stg.appendChild(cb); } else { if (h.parentNode !== document.body) document.body.appendChild(h); }
    cb.hidden = !G.run; cb.textContent = '離開';
    { let mt = $('modtxt'); if (!mt){ mt = document.createElement('div'); mt.id = 'modtxt'; } const R = G.run, ms = R && R.map ? (R.map.mods || []).slice(0, 3).map(k => MODS[k].n) : []; if (R && R.tower) ms.unshift('無限之塔 第 ' + R.floor + ' 層');
      if (stg && mt.parentNode !== stg) stg.appendChild(mt); const t = ms.join('\n'); if (mt._t !== t){ mt._t = t; mt.innerText = t; } }
    const n = nextStep(); h.hidden = !n; if (n){ h.textContent = '下一步：' + n.t; h.dataset.tab = n.tab || ''; } };
  const draw=()=>{hint();uiRefreshLive();if(typeof viewTick==='function')viewTick();};
  setInterval(draw, 300); draw();
  uxInit();
  uiInitLayout();
  viewInit();
  document.getElementById('lblctl'); const pc = document.getElementById('pals'); if (pc) pc.parentElement.style.display = 'none';
}

;
/* ---------- 角色頁與裝扮：身分證資料卡、3D 預覽、換髮色與衣褲鞋色 ---------- */
let dSel = { cat:'hair', id:null };   // 目前選中（預覽中）的部位與顏色；id 為 null 代表預覽目前穿的
const PV = { cv:null, rd:null, sc:null, cam:null, hero:null, sig:'', yaw:.5, auto:true, drag:null };
const cosGet = (cat, id) => COS[cat].find(x => x[0] === id);
const cosOwned = (cat, id) => cosGet(cat, id)[3] === 0 || !!G.own[cat + ':' + id];
function cosPreview(){ const c = Object.assign({}, G.cos); if (dSel.id) c[dSel.cat] = dSel.id; return c; }
function rankOf(){ let r = RANKS[0][1]; for (const [l, n] of RANKS) if (G.lvl >= l) r = n; return r; }
function setName(v){ G.heroName = (v || '').trim().slice(0, 8) || '阿街'; G.dirty = true; }
function dressPick(cat, id){ dSel = { cat, id }; renderModal(); }
function dressCat(cat){ dSel = { cat, id:null }; renderModal(); }
function dressBuy(){
  const { cat, id } = dSel; if (!id) return; const e = cosGet(cat, id);
  if (!cosOwned(cat, id)){ if (G.gold < e[3]){ logLine('金幣不夠', '#e2483d'); return; } G.gold -= e[3]; G.own[cat + ':' + id] = 1; logLine(`買下裝扮：${e[1]}`, '#c28a00'); SFX('rare'); }
  G.cos[cat] = id; dSel = { cat, id:null }; G.dirty = true; renderModal();
}
function dressHtml(){
  G.cos = Object.assign({ tstyle:'0', hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, G.cos);
  const cat = dSel.cat, cur = G.cos[cat], sel = dSel.id || cur, e = cosGet(cat, sel), owned = cosOwned(cat, sel), tot = Object.keys(ACHS).length;
  const smalls = Math.min(10, Math.floor(G.maxDepth/3)), bigs = Math.min(5, Math.floor(achCount()/tot*5 + .0001));
  const star = (n, k, c) => Array.from({ length:k }, (_, i) => `<i class="${i < n ? 'on' : ''} ${c}"></i>`).join('');
  const [bm, bd] = G.born;
  const act = sel === cur && !dSel.id ? `<button class="mb" disabled>目前穿著</button>` : owned ? `<button class="mb" onclick="dressBuy()">穿上</button>` : `<button class="mb" ${G.gold >= e[3] ? '' : 'disabled'} onclick="dressBuy()">購買 ${e[3]} g</button>`;
  return `<div class="idc"><div class="idh">IDLE HERO ID</div><div class="ids">Y2K 街頭學院</div>
    <div class="idb"><div class="idp" id="pvhost"></div><div class="idf">
      <div class="idr"><span>名字</span><input id="hname" maxlength="8" value="${G.heroName.replace(/"/g, '')}" onchange="setName(this.value)"></div>
      <div class="idr"><span>生日</span><b>${bm} / ${bd}</b></div>
      <div class="idr"><span>星座</span><b>${STAR_SIGNS[bm - 1]}</b></div>
      <div class="idr"><span>角色</span><b>${CHARS[G.char].n}</b></div>
      <div class="idr"><span>等級</span><b>Lv. ${G.lvl}</b></div></div></div>
    <div class="idt">${rankOf()}</div><div class="isr">${star(smalls, 10, 's')}</div><div class="isr big">${star(bigs, 5, 'b')}</div></div>
  <div class="rc wide"><div class="rh">裝扮 <span class="mute">金幣 ${tFmt(G.gold)}　拖曳預覽可旋轉</span></div>
    <div class="dcats">${COS_CATS.map(([k, n]) => `<button class="mb${k === cat ? ' on' : ''}" onclick="dressCat('${k}')">${n}</button>`).join('')}</div>
    <div class="dsw">${COS[cat].map(([id, n, col, pr]) => `<button class="sw${id === sel ? ' on' : ''}${id === cur ? ' cur' : ''}" title="${n}" onclick="dressPick('${cat}','${id}')"><i style="background:${'hstyle,tstyle,hat,glasses,pack'.includes(cat) ? '#fff0d8' : col}">${'hstyle,tstyle,hat,glasses,pack'.includes(cat) ? n[0] : ''}</i><span>${n}</span><em>${id === cur ? '穿著' : cosOwned(cat, id) ? '已有' : pr + 'g'}</em></button>`).join('')}</div>
    <div class="dact"><b>${e[1]}</b> ${act}</div></div>`;
}
function dressMount(){
  const host = $('pvhost'); if (!host) return;
  if (!PV.rd){
    PV.cv = document.createElement('canvas'); PV.cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
    PV.rd = new T3.WebGLRenderer({ canvas:PV.cv, antialias:false, alpha:true }); PV.rd.setPixelRatio(1); PV.rd.setClearColor(0x000000, 0); PV.rd.outputColorSpace = T3.SRGBColorSpace;
    PV.sc = new T3.Scene(); PV.sc.add(new T3.HemisphereLight(0xeaf5ff, 0xd8c8f0, 1.55)); const sun = new T3.DirectionalLight(0xfff6ea, 1.5); sun.position.set(30, 60, 50); PV.sc.add(sun); PV.sc.add(new T3.AmbientLight(0xffffff, .25));
    PV.cam = new T3.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    PV.cv.addEventListener('pointerdown', e => { PV.drag = { x:e.clientX, y:PV.yaw }; PV.auto = false; PV.cv.style.cursor = 'grabbing'; });
    addEventListener('pointermove', e => { if (PV.drag) PV.yaw = PV.drag.y + (e.clientX - PV.drag.x)*.012; });
    addEventListener('pointerup', () => { PV.drag = null; if (PV.cv) PV.cv.style.cursor = 'grab'; });
    setInterval(dressTick, 40);
  }
  host.appendChild(PV.cv); PV.sig = '';
}
function dressTick(){
  if (!PV.rd || !PV.cv.isConnected || (modalTab !== 'dress') || $('modal').hidden) return;
  const w = PV.cv.clientWidth, h = PV.cv.clientHeight; if (w < 4 || h < 4) return;
  const A = G.equip.armor, W = G.equip.weapon, cos = cosPreview(), sig = [aTier(A), A ? A.r : 0, aTier(W), W ? W.r : 0, G.char, JSON.stringify(cos)].join();
  if (sig !== PV.sig){ PV.sig = sig; if (PV.hero) PV.sc.remove(PV.hero); const g = buildHero(aTier(A), A ? A.r : 0, aTier(W), W ? W.r : 0, cos); g.scale.setScalar(1); g.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o.material.opacity < .9 && o.geometry.type !== 'SphereGeometry') o.visible = false; }); PV.hero = g; PV.sc.add(g); PV.sc.updateMatrixWorld(true); PV.box = new T3.Box3(); g.traverse(o => { if (o.isMesh && o.visible && o.geometry.type !== 'RingGeometry' && o.geometry.type !== 'CircleGeometry'){ o.geometry.computeBoundingBox(); PV.box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); }
  if (PV.auto) PV.yaw += .02; PV.hero.rotation.y = PV.yaw;
  const buffer=r3BufferSize(w,h,devicePixelRatio||1,R3.clean);PV.cv.style.imageRendering=R3.clean?'auto':'pixelated';
  if(PV.cv.width!==buffer.width||PV.cv.height!==buffer.height)PV.rd.setSize(buffer.width,buffer.height,false);
  const bx = PV.box, cy = (bx.min.y + bx.max.y)/2, vh = (bx.max.y - bx.min.y)*1.2, vw = vh*w/h; PV.cam.left = -vw/2; PV.cam.right = vw/2; PV.cam.top = vh/2; PV.cam.bottom = -vh/2; PV.cam.position.set(0, cy, 40); PV.cam.lookAt(0, cy, 0); PV.cam.updateProjectionMatrix();
  PV.rd.render(PV.sc, PV.cam);
}

;
/* ---------- 改機：把用不到的裝備拆成零件，拿去重洗、替換、升級或腐化手上的裝備 ---------- */
const CRAFT = {
  recal:   { n:'重新校準', d:'重洗所有沒鎖定的詞綴數值', cost:it => 20 + 10*it.r + (it.lk != null ? 15 : 0), ok:it => it.aff.length > 0 },
  swap:    { n:'改裝詞綴', d:'隨機替換一條沒鎖定的詞綴', cost:it => 40 + 20*it.r, ok:it => it.r < 3 && it.aff.length > (it.lk != null ? 1 : 0) },
  upgrade: { n:'升級稀有度', d:'普通→魔法→稀有，各多一到兩條詞綴', cost:it => [100, 250][it.r] || 0, ok:it => it.r < 2 },
  corrupt: { n:'腐化', d:'賭一把：25% 數值 +20%、25% 多一條詞綴、25% 沒變化、25% 數值 -15%；腐化後不能再改機', cost:it => 60 + 20*it.r, ok:it => !it.cr },
};
const craftCost = (act, it) => CRAFT[act].cost(it);
const CRAFT_RESULTS = {};
let craftPending = null;
function craftState(slot, act){
  const it = G.equip[slot], op = CRAFT[act];
  if (!it || !op) return { ok:false, cost:0, reason:'尚未裝備道具' };
  const cost = op.cost(it); let reason = '';
  if (it.cr) reason = '已腐化，不能再改機';
  else if (act === 'recal' && !it.aff.some((a,i) => i !== it.lk)) reason = '沒有可校準的未鎖定詞綴';
  else if (act === 'swap' && it.r >= 3) reason = '傳奇裝備不能替換詞綴';
  else if (act === 'swap' && !it.aff.some((a,i) => i !== it.lk)) reason = '沒有可改裝的未鎖定詞綴';
  else if (act === 'swap' && !POOL[slot].some(k => !it.aff.some(a => a.k === k))) reason = '沒有可替換的新詞綴';
  else if (act === 'upgrade' && it.r >= 2) reason = '已達可升級的稀有度上限';
  else if (!op.ok(it)) reason = '這件裝備無法進行此操作';
  else if ((G.parts || 0) < cost) reason = `需要 ${cost} 零件，還差 ${cost - (G.parts || 0)}`;
  return { ok:!reason, cost, reason };
}
function craftLock(slot, i){ const it = G.equip[slot]; if (!it || it.cr) return; it.lk = it.lk === i ? null : i; renderModal(); }
function craftConfirm(){
  const p = craftPending; craftPending = null;
  hideOverlay(); if (!p) return;
  if (G.equip[p.slot] !== p.it || JSON.stringify(p.it) !== p.stamp){ logLine('裝備已變動，請重新選擇改機。', '#a64b25'); renderModal(); return; }
  craftDo(p.slot,p.act,true);
}
function craftDo(slot, act, confirmed = false){
  const state = craftState(slot,act); if (!state.ok){ uxAnnounce(state.reason); return; }
  const it = G.equip[slot], C = CRAFT[act];
  if (act === 'corrupt' && !confirmed){
    craftPending = { slot, act, it, stamp:JSON.stringify(it) };
    showOverlay(`<h2 class="uxdialog-title">腐化「${uxEsc(it.name)}」？</h2><p>消耗 ${state.cost} 零件。可能提升數值、增加詞綴、沒有變化或降低數值。</p><p class="uxwarning">腐化後，這件裝備不能再改機。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="craftPending=null;hideOverlay()">取消</button><button class="mb pri" onclick="craftConfirm()">腐化裝備</button></div>`); return;
  }
  const cost = state.cost, before = it.aff.map(a => AFF[a.k].t(a.v)).join('、') || '無額外詞綴';
  G.parts -= cost; G.craftN = (G.craftN || 0) + 1; checkQuest(); const have = new Set(it.aff.map(a => a.k)), free = () => POOL[slot].filter(k => !have.has(k)), add = () => { const f = free(); if (!f.length) return false; const k = tPick(f); have.add(k); it.aff.push(rollAff(k, it.il)); return true; };
  let msg = '';
  if (act === 'recal'){ it.aff = it.aff.map((a, i) => i === it.lk ? a : rollAff(a.k, it.il, it.r === 3 ? 1.35 : 1)); msg = '數值重洗完成'; }
  else if (act === 'swap'){ const idx = it.aff.map((a, i) => i).filter(i => i !== it.lk); const i = tPick(idx), k = tPick(free()); it.aff[i] = rollAff(k,it.il); msg = `詞綴換成：${AFF[k].t(it.aff[i].v)}`; }
  else if (act === 'upgrade'){ it.r++; const n = it.r === 1 ? 1 : 2; for (let i = 0; i < n; i++) add(); it.name = it.r === 1 ? PREF[it.aff[0].k] + BASES[slot][Math.min(3, Math.floor(it.il/6))] : tPick(RARE_NAMES[slot]); msg = `升級成${RAR[it.r].n}`; }
  else if (act === 'corrupt'){ it.cr = 1; const r = Math.random();
    if (r < .25){ for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*12)/10 : Math.max(1, Math.round(a.v*1.2)); msg = '腐化成功：數值 +20%'; }
    else if (r < .5) msg = add() ? '腐化成功：多了一條詞綴' : '腐化：沒有變化';
    else if (r < .75) msg = '腐化：沒有變化';
    else { for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*8.5)/10 : Math.max(1, Math.round(a.v*.85)); msg = '腐化失敗：數值 -15%'; } }
  it.lk = it.lk != null && it.lk < it.aff.length ? it.lk : null;
  const after = it.aff.map(a => AFF[a.k].t(a.v)).join('、') || '無額外詞綴';
  CRAFT_RESULTS[slot] = { it, msg, cost, before, after };
  recalc(); logLine(`改機（${SLOTN[slot]}）：${msg}`, '#1f9bbf'); addFloat(G.h.x + 3, G.h.y, BZ + 22, C.n, '#1f9bbf', 3.8); SFX('card'); G.dirty = true; renderModal(); uxAnnounce(`${msg}，消耗 ${cost} 零件。`);
}
function craftHtml(){
  const sl=UI_WORK.craftSlot,act=UI_WORK.craftAct,it=G.equip[sl],op=CRAFT[act],state=craftState(sl,act);
  const slots=`<div class="ui-craft-slots" role="group" aria-label="改機裝備">${Object.keys(SLOTN).map(k=>`<button aria-pressed="${sl===k}" onclick="uiWork('craftSlot','${k}')" data-focus="craftSlot-${k}">${eqico(k,G.equip[k]?.r||0,24)}<b>${SLOTN[k]}</b><small>${G.equip[k]?RAR[G.equip[k].r].n:'尚未裝備'}</small></button>`).join('')}</div>`;
  const tabs=uiSegments('craftAct',Object.entries(CRAFT).map(([k,c])=>[k,c.n]),'改機動作');
  let detail='<section class="ui-section"><h3>尚未裝備道具</h3><p>繼續冒險，自動換上裝備後即可改機。</p></section>';
  if(it){
    const lines=[`<li><span>${AFF[it.imp.k].t(it.imp.v)}</span><small>固定屬性</small></li>`].concat(it.aff.map((a,i)=>`<li><span>${AFF[a.k].t(a.v)}</span><button class="mb lk${it.lk===i?' on':''}" ${it.cr?'disabled':''} aria-label="${it.lk===i?'解除鎖定':'鎖定'}${uxEsc(AFF[a.k].t(a.v))}" onclick="craftLock('${sl}',${i})">${spr(it.lk===i?'lock':'unlock',20)}</button></li>`));
    const result=CRAFT_RESULTS[sl];
    detail=`<section class="ui-section ui-craft-detail"><div class="nm">${eqico(sl,it.r,36)}<div><h3>${uxEsc(it.name)}</h3><span class="uxmeta">${RAR[it.r].n} · 等級 ${it.il}${it.cr?' · 已腐化':''}</span></div></div><ul>${lines.join('')}</ul><div class="ui-craft-operation"><h3>${op.n}</h3><p>${op.d}</p><p>消耗 ${state.cost} 零件 · 持有 ${G.parts||0}</p>${!state.ok?`<p id="craft-reason" class="uxwarning">${state.reason}</p>`:'<p id="craft-reason" class="uxmeta">準備好後，按下方按鈕執行。</p>'}<button class="mb pri" data-focus="craft-${sl}-${act}" aria-describedby="craft-reason" ${state.ok?'':'disabled'} onclick="craftDo('${sl}','${act}')">${act==='corrupt'?'確認腐化風險':op.n} · ${state.cost} 零件</button></div>${result&&result.it===it?`<div class="uxcraft-result" role="status"><b>${uxEsc(result.msg)}</b> · 消耗 ${result.cost} 零件<details><summary>查看變化</summary><p>之前：${uxEsc(result.before)}</p><p>之後：${uxEsc(result.after)}</p></details></div>`:''}</section>`;
  }
  return `<div class="ui-craft-wallet"><span>可用零件</span><strong>${G.parts||0}</strong></div>${slots}${tabs}${detail}<details class="ui-rules"><summary>拾取與自動拆解規則</summary><p class="uxmeta">用不到的裝備自動拆成零件：普通 1、魔法 2、稀有 5、暗金 12。</p>${rulesBar()}</details>`;
}

;
/* 扮工模式：整個畫面換成命令行介面，只留重要資訊與掉寶；Esc 或輸入 exit 回到遊戲 */
const BOSS = { on:false, lines:[], title:document.title };
const bossClock = () => new Date().toTimeString().slice(0, 8);
function bossPush(txt, col, tag){
  const L = { t:bossClock(), txt, col:col || '#c8d3c0', tag:tag || 'INFO' }; BOSS.lines.push(L); if (BOSS.lines.length > 400) BOSS.lines.shift();
  if (BOSS.on) bossAppend(L);
}
function bossLoot(it){ const R = RAR[it.r]; bossPush(`${R.n} ${it.name}  ilvl ${it.il}${it.lg && LEGEND_BY[it.lg] ? '  ★ ' + LEGEND_BY[it.lg].d : ''}`, it.r >= 3 ? '#ff8a4c' : '#f4c542', 'LOOT'); }
function bossAppend(L){
  const log = $('bosslog'); if (!log) return; const d = document.createElement('div'); d.className = 'bl';
  d.innerHTML = `<span class="bt">${L.t}</span> <span class="bg bg-${L.tag}">[${L.tag}]</span> <span style="color:${L.col}">${L.txt}</span>`;
  log.appendChild(d); while (log.children.length > 400) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
}
const bossBar = (p, n = 20) => '█'.repeat(Math.round(tClamp(p)*n)) + '░'.repeat(n - Math.round(tClamp(p)*n));
function bossStatus(){
  const h = G.h; return `LV ${G.lvl}  HP ${bossBar(h.hp/G.st.life, 16)} ${tFmt(Math.max(0, h.hp))}/${tFmt(G.st.life)}  XP ${bossBar(G.xp/xpNeed(G.lvl), 8)}  DEPTH ${G.run ? (G.run.tower ? 'T' + G.run.floor : 'MAP') : G.depth}  GOLD ${tFmt(G.gold)}  DPS ${tFmt(G.st.dps)}  KILLS ${G.totalKills}`;
}
const BOSS_CMDS = {
  help:() => ['commands: status  loot  equip  skills  log  clear  exit', 'press ` or Esc to return'],
  status:() => [bossStatus(), `deaths ${G.deaths}  crit ${G.st.crit.toFixed(0)}%x${G.st.cm.toFixed(0)}  armor-red ${(G.st.red*100).toFixed(0)}%  dodge ${G.st.dodge.toFixed(0)}%`],
  loot:() => { const l = BOSS.lines.filter(x => x.tag === 'LOOT').slice(-10); return l.length ? l.map(x => `${x.t} ${x.txt}`) : ['(no loot yet)']; },
  equip:() => Object.entries(G.equip).filter(([, it]) => it).map(([k, it]) => `${SLOTN[k]}: ${RAR[it.r].n} ${it.name} ilvl ${it.il}  ${itemLines(it).map(l => l.t).join(' | ')}`),
  skills:() => G.slots.filter(Boolean).map(id => `${SKILLS[id].n}  hit ${tFmt(G.st.sk[id].hit)}  cd ${G.st.sk[id].cd.toFixed(1)}s  [${(G.supp[id] || []).map(g => SUPPS[g].n).join(', ') || '-'}]`),
  log:() => BOSS.lines.slice(-12).map(x => `${x.t} [${x.tag}] ${x.txt}`),
  clear:() => { $('bosslog').innerHTML = ''; return []; },
  exit:() => { toggleBoss(false); return []; }
};
function bossCmd(v){
  v = v.trim(); if (!v) return; bossAppend({ t:bossClock(), txt:'$ ' + v, col:'#7fe0a0', tag:'CMD' });
  const f = BOSS_CMDS[v.toLowerCase()] || (v === 'q' || v === 'quit' ? BOSS_CMDS.exit : null);
  const out = f ? f() : [`bash: ${v}: command not found (try: help)`];
  out.forEach(t => bossAppend({ t:'', txt:t, col:'#c8d3c0', tag:'OUT' }));
}
function toggleBoss(on){
  on = on == null ? !BOSS.on : on; if (on === BOSS.on) return; BOSS.on = on; window.BOSSON = on;
  let o = $('bossov');
  if (on){
    if (!o){ o = document.createElement('div'); o.id = 'bossov'; o.innerHTML = `<div id="bosshead"></div><div id="bosslog"></div><div id="bossin"><span>user@build:~$</span><input id="bosscmd" autocomplete="off" spellcheck="false"></div>`; document.body.appendChild(o);
      $('bosscmd').addEventListener('keydown', e => { if (e.key === '`' || e.code === 'Backquote'){ e.preventDefault(); toggleBoss(false); } else if (e.key === 'Enter'){ bossCmd(e.target.value); e.target.value = ''; } e.stopPropagation(); }); o.addEventListener('click', () => $('bosscmd').focus()); }
    o.hidden = false; document.title = 'bash - build@ci'; $('bosslog').innerHTML = ''; BOSS.lines.slice(-120).forEach(bossAppend);
    bossAppend({ t:bossClock(), txt:'type "help" for commands, ` or Esc to exit', col:'#7a8a74', tag:'INFO' }); $('bosscmd').focus();
    BOSS.tm = setInterval(() => { $('bosshead').textContent = bossStatus(); }, 500); $('bosshead').textContent = bossStatus();
  } else { if (o) o.hidden = true; document.title = BOSS.title; clearInterval(BOSS.tm); }
}
(function(){
  const css = document.createElement('style'); css.textContent = `#bossov{position:fixed;inset:0;z-index:200;background:#0c0f0c;color:#c8d3c0;font:14px/1.55 "Cubic 11",ui-monospace,Menlo,Consolas,monospace;display:flex;flex-direction:column;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom))} #bossov[hidden]{display:none}
    #bosshead{color:#7fe0a0;border-bottom:1px solid #2a3a2a;padding-bottom:4px;margin-bottom:4px;white-space:pre-wrap;word-break:break-all} #bosslog{flex:1;overflow:auto} .bl{white-space:pre-wrap;word-break:break-all} .bt{color:#5a6a56} .bg-LOOT{color:#f4c542} .bg-CMD{color:#7fe0a0} .bg-OUT{color:#5a6a56}
    #bossin{display:flex;gap:8px;border-top:1px solid #2a3a2a;padding-top:6px} #bossin span{color:#7fe0a0} #bosscmd{flex:1;background:none;border:0;outline:0;color:#e8f0e0;font:inherit}`;
  document.head.appendChild(css);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && BOSS.on) toggleBoss(false); else if ((e.key === '`' || e.code === 'Backquote') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); toggleBoss(); } });
  setInterval(() => { if (!G.paused && !G.offline) bossPush(bossStatus(), '#7a8a74', 'STAT'); }, 60000);
})();

;
/* 共用操作契約：液晶詳情、盤面鍵盤及視窗焦點。暫存 UI 狀態不寫入遊戲存檔。 */
const UX_THEME = `:root{--ux-ink:#172751;--ux-muted:#475778;--ux-screen:#e6e8f7;--ux-blue:#303d9b;--ux-edge:#9ca9c8;--ux-accent:#b94732;--ux-focus:#1f3fb0;--ux-scroll:#8297c6;--ux-track:#e3ebfa;--ux-face:#c8cedc;--ux-key:#dae1ed;--ux-lcd:#edf4f1;--ux-frame:#5b6781;--ux-rule:#b9c2d7;--ux-display:"Cubic 11",system-ui,sans-serif;--ux-shell-radius:10px;--ux-key-radius:4px;--ux-metal:linear-gradient(180deg,#f1f4fb 0%,#d2d9e7 8%,#c8cedc 50%,#aeb9cf 100%) #c8cedc;--ux-key-face:linear-gradient(180deg,#fff 0px,#e9eef7 2px,#d5dfed 48%,#c9d4e6 50%,#d7dfed 100%) #dae1ed;--ux-key-hover:linear-gradient(180deg,#fff 0px,#edf8ff 2px,#daeafa 48%,#c0d9ed 50%,#d4e7f7 100%) #e6f1ff;--ux-blue-face:linear-gradient(180deg,#8f9de6 0%,#5567bf 8%,#4858af 46%,#303d9b 48%,#334794 100%) #303d9b;--ux-title-face:linear-gradient(180deg,#b9c6f0 0px,#6575be 2px,#4858a9 3px,#303d86 100%) #303d86;--ux-key-shadow:inset 1px 1px #fff,inset -1px -1px #8492b0,0 2px #727f9c;--ux-inset:inset 1px 1px #677694,inset -1px -1px #fff}`;
/* 銀灰掌機外殼、藍紫液晶與短鍵程按鍵；內容不疊卡，兩種編年史共用。 */
const UX_MATERIAL_CSS=`
/* 像素字只有常規字重，禁止瀏覽器合成粗體破壞格線。 */
body.ui-material,body.ui-material *{font-family:var(--ux-display,"Cubic 11",system-ui,sans-serif)!important;font-weight:400!important;font-synthesis:none!important}

body.ui-material :is(#modal>.mbox,#ovl>.mbox,#wiki>.wkb){border:2px solid var(--ux-frame)!important;border-radius:var(--ux-shell-radius)!important;outline:none!important;background:var(--ux-metal)!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #8794ad,3px 3px 0 #34446780!important}
body.ui-material #modal>.mbox{padding:4px!important}
body.ui-material :is(#mttl,.wkt){background:var(--ux-title-face)!important;border-radius:5px 5px 0 0!important;box-shadow:inset 1px 0 #d5dfff,inset -1px 0 #24366d!important;border:1px solid #293a78;border-bottom:2px solid #1c2c66;color:#fff}
body.ui-material :is(#mttl h2,.wkt h2){font-family:var(--ux-display);font-weight:400;text-shadow:1px 1px #1c2c66}
body.ui-material #mttl::before{display:block;content:"";width:5px;height:20px;flex:none;background:linear-gradient(#b9f1f0 0 40%,#6bbacb 40% 65%,#b9f1f0 65%);box-shadow:1px 0 #1c2c66}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)){background:var(--ux-key-face)!important;border:1px solid var(--ux-frame)!important;border-radius:var(--ux-key-radius)!important;box-shadow:var(--ux-key-shadow)!important;text-shadow:none!important;color:var(--ux-ink)!important;transform:none!important;font-family:var(--ux-display)!important}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)):enabled:hover{background:var(--ux-key-hover)!important}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)):enabled:active{box-shadow:var(--ux-inset)!important}
body.ui-material #mtabs{background:var(--ux-metal)!important;box-shadow:inset 0 1px #fff!important;border:0!important;gap:4px!important}
body.ui-material #mtabs button.tab{background:var(--ux-key-face)!important;border:1px solid #8492ae!important;border-radius:4px 4px 6px 6px!important;box-shadow:var(--ux-key-shadow)!important;text-shadow:none!important;color:var(--ux-ink)!important}
body.ui-material #mtabs button.tab:hover{background:var(--ux-key-hover)!important}
body.ui-material #mtabs button.tab.on{background:linear-gradient(180deg,#f1f5ff,#c1cef3)!important;color:#243884!important;border-color:#4c60a5!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #8096d1,inset 0 -3px #4057aa!important}
body.ui-material :is(#modal,#ovl,#wiki) button[aria-pressed="true"],body.ui-material #mbody button.on:not(.pc):not(.gt),body.ui-material #wiki button.wkc.on{background:var(--ux-blue-face)!important;border:1px solid #26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important;color:#fff!important}
body.ui-material :is(#mbody,#ovl) button.mb.pri{background:linear-gradient(180deg,#eeb39e 0%,#c45b42 10%,#b94732 55%,#a1392e 56%,#b94732 100%)!important;border:1px solid #79382e!important;color:#fff!important;box-shadow:inset 1px 1px #f4c5af,inset -1px -1px #7e392d,0 2px #643527!important}
body.ui-material :is(#modal,#ovl,#wiki) button:disabled{background:#ccd3e1!important;color:#596880!important;border-color:#9ba7bd!important;box-shadow:inset 1px 1px #edf0f8!important;text-shadow:none!important;opacity:1}
body.ui-material :is(#mbody,#uisettings){background:var(--ux-screen)!important;border:1px solid #9ba7c5;border-top:0;box-shadow:inset 1px 0 #fff,inset -1px 0 #b5bdd6}
body.ui-material #mbody :is(.rc,.mc,.ui-section,.ui-menu-group,.ui-character-head,.ui-build),body.ui-material .view-settings{background:transparent!important;border:0!important;border-bottom:1px solid var(--ux-rule)!important;border-radius:0!important;box-shadow:none!important;outline:none;padding:12px 0!important;margin:0 0 14px}
body.ui-material #mbody .ui-character-head{background:linear-gradient(110deg,#d4dcf1,var(--ux-screen))!important;border-left:3px solid #8091c0!important;padding:10px!important}
body.ui-material #mbody .ui-build{padding:4px 0 12px!important}
body.ui-material #mbody .ui-core-collection>summary{min-height:44px;padding:10px 0;font-family:var(--ux-display)}
body.ui-material #mbody .ui-core-item{padding:12px 0;border-bottom:1px solid var(--ux-rule)}
body.ui-material #mbody .ui-core-item .nm{flex-wrap:wrap}.ui-core-item small{font-size:12px;color:var(--ux-muted)}
body.ui-material #mbody .ui-core-item p{font-size:13px;line-height:1.6;margin:6px 0}.ui-core-item>details{margin:8px 0}.ui-core-item>details>summary{padding:8px 0;min-height:40px}

body.ui-material #mbody :is(.ui-equipment .rc ul,.ui-equipment .rc li,.ui-craft-operation){background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
body.ui-material #mbody .ui-craft-operation{padding:12px 0}
body.ui-material #mbody .rh{background:none!important;box-shadow:none!important;border:0!important;color:var(--ux-muted)!important;text-shadow:none!important}
body.ui-material #mbody :is(.mute,.hint,.rc li.imp){color:var(--ux-muted)!important}body.ui-material #mbody .mute{font-size:12px}
body.ui-material #mbody svg.tree{background:#27385d!important;border:2px solid #7181a2!important;border-radius:5px!important;outline:none;box-shadow:inset 1px 1px #102347,0 1px #fff!important}
body.ui-material #mbody svg.tree>line.inactive{stroke:#788bb1}
body.ui-material #mbody svg.tree .tn.locked :is(circle,polygon){fill:#8798b8;stroke:#b8c8df}
body.ui-material #mbody svg.tree .tn.open :is(circle,polygon){fill:#edf7ff;stroke:#98dcea;animation:none}
body.ui-material #mbody .idc{background:var(--ux-metal);border:1px solid var(--ux-frame);border-radius:5px;box-shadow:inset 1px 1px #fff,inset -1px -1px #8794ad;color:var(--ux-ink)}
body.ui-material #mbody .idh{font-family:var(--ux-display);font-weight:400}
body.ui-material #mbody .ids{background:var(--ux-title-face);color:#fff;border-radius:2px}
body.ui-material #mbody .idp{background:#c6ddeb;border:2px solid #7181a2;box-shadow:var(--ux-inset)}
body.ui-material #mbody .idt{border-color:var(--ux-rule)}
body.ui-material #mbody .idr{border-bottom:1px solid var(--ux-rule)}
body.ui-material #mbody .isr i{background:#a4aec4}body.ui-material #mbody .isr i.on{background:#b07830}
body.ui-material :is(#mbody,#ovl) .mct{color:var(--ux-ink)!important;text-shadow:none}
body.ui-material #mbody .lg ul{background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:4px 0 0 18px!important}
body.ui-material #mbody .ach li.got{color:var(--ux-ink)}body.ui-material #mbody .ach li.got>b{color:#74531f}
body.ui-material #ovl>.mbox::before{background:var(--ux-title-face)!important;border-radius:3px!important;box-shadow:inset 0 1px #d5dfff;color:#fff}

body.ui-material #mbody .sw.on{background:var(--ux-blue-face)!important;outline:2px solid var(--ux-blue)}
body.ui-material #mbody .sw.on em{color:#f0f5ff}
body.ui-material #mbody .gls{gap:0}
body.ui-material #mbody .gl{border:0;border-bottom:1px solid var(--ux-rule);border-radius:0!important;background:none;box-shadow:none!important;padding:10px 0 14px}
body.ui-material #mbody .rc ul.ach{background:none!important;border:0!important;box-shadow:none!important;padding:0!important}
body.ui-material #mbody .ach li{padding:10px 0;border-bottom:1px solid var(--ux-rule)}

body.ui-material #mbody :is(.dpsbar,.uxinspect){background:#d8e0f2!important;border:1px solid #8e9cbe!important;border-radius:3px!important;box-shadow:var(--ux-inset)!important}
body.ui-material #mbody .uxinspect{padding:10px!important;margin-top:8px}
body.ui-material #mbody .dpsbar .uxinspect{border:0!important;border-top:1px solid #a9b6d5!important;padding:10px 0 0!important;box-shadow:none!important}
body.ui-material #mbody .shares span{background:#bbc9e8;color:var(--ux-ink);border-left:2px solid #677fbb}
body.ui-material #mbody .ui-segments{padding:4px;gap:4px;background:var(--ux-face);border:1px solid #9ba8c1;border-radius:5px;box-shadow:var(--ux-inset)}
body.ui-material #mbody .ui-segments>button{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:3px!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #a4b0c7!important;color:var(--ux-ink)!important;font-family:var(--ux-display)!important;padding:6px 3px!important}
body.ui-material #mbody .ui-segments>button[aria-pressed="true"]{background:var(--ux-blue-face)!important;color:#fff!important;border-color:#26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important}
body.ui-material #mbody :is(.ui-directory button,.ui-wiki){background:linear-gradient(90deg,#d5deef,var(--ux-screen))!important;border:0!important;border-bottom:1px solid #a5b2cf!important;border-left:3px solid #97a8cc!important;border-radius:0!important;box-shadow:none!important;padding-inline:10px}
body.ui-material #mbody :is(.ui-directory button,.ui-wiki):hover{background:#d2e1f4!important}
body.ui-material #mbody .ui-craft-slots>button{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:5px!important;box-shadow:var(--ux-key-shadow)!important}
body.ui-material #mbody .ui-craft-slots>button[aria-pressed="true"]{background:linear-gradient(#d2dcf8,#bac9ee)!important;border-color:#41589c!important;box-shadow:inset 1px 1px #7185b6,inset -1px -1px #fff,inset 0 -3px #4057aa!important;color:var(--ux-ink)!important}
body.ui-material #mbody .ui-map-card{border:1px solid #8f9cbb;border-radius:5px;background:#d8e0f0;box-shadow:inset 1px 1px #fff}
body.ui-material #mbody .rchips>*{border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;padding:2px 8px 2px 0!important}
body.ui-material #mbody .ui-map-banner{background:linear-gradient(120deg,#273961,#435582);border:0;border-left:6px solid var(--land);box-shadow:inset 0 1px #8294bd;color:#f0f4ff}
body.ui-material #mbody .ui-map-banner::after{display:none}
body.ui-material #mbody .ui-map-banner :is(h3,span){background:none;color:#f0f4ff;padding:0;border-radius:0}
body.ui-material #mbody button.gt{background:linear-gradient(135deg,#f2f5ff,#d8e2f3)!important;border:1px solid #9baac8!important;border-radius:3px!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #bbc7dc!important}
body.ui-material #mbody button.gt.on{outline:2px solid var(--ux-blue);outline-offset:1px}
body.ui-material #mbody .pz{border-radius:6px;border:2px solid #7181a2;background:#bec9dd;box-shadow:inset 1px 1px #edf3ff,inset -1px -1px #6b7a9b,0 1px #fff!important}
body.ui-material #mbody .pz button.pc{border-radius:2px!important;background:#d6def0!important;box-shadow:inset 1px 1px #a0adca,inset -1px -1px #f2f5ff!important}
body.ui-material #mbody .pz button.pc.fill{background:var(--pc)!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #66779280!important}
body.ui-material #mbody .pz button.pc.pv.ok{background:#b8f5d0!important;border-color:#19865a!important}
body.ui-material #mbody .pz button.pc.pv.bad{background:#ffc4c4!important;border-color:#bd342b!important}
body.ui-material :is(#modal,#ovl,#wiki) :is(input:not([type="range"]),textarea){background:var(--ux-lcd)!important;border:2px solid!important;border-color:#7486a1 #f8fbff #f8fbff #7486a1!important;border-radius:2px!important;box-shadow:inset 1px 1px #c2ced6!important;color:var(--ux-ink)!important;font:14px/1.5 system-ui,"Microsoft JhengHei",sans-serif}
body.ui-material #wiki>.wkb{padding:4px}
body.ui-material #wiki .wkn{background:var(--ux-metal);border-color:#9ba8c1;gap:4px;padding:8px;box-shadow:inset 1px 1px #fff,inset -1px -1px #a3b0cb}
body.ui-material #wiki button.wkc{background:transparent!important;border:1px solid transparent!important;border-radius:3px!important;box-shadow:none!important;min-height:40px;padding:7px 8px;text-align:left;font-family:var(--ux-display)}
body.ui-material #wiki button.wkc:hover{background:var(--ux-key-face)!important;border-color:#8b99b5!important;box-shadow:inset 1px 1px #fff!important}
body.ui-material #wiki button.wkc.on{background:var(--ux-blue-face)!important;border-color:#26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important;color:#fff!important;outline:none}
body.ui-material #wiki .wkcontent{background:var(--ux-screen);border:1px solid #9ba7c5;border-top:0;box-shadow:inset 1px 1px #fff}
body.ui-material #wiki .wkl{display:block;padding:0 12px}
body.ui-material #wiki .wke{margin:0;padding:14px 0;border:0;border-bottom:1px solid var(--ux-rule);border-radius:0;background:none;box-shadow:none}
body.ui-material #wiki .wkm{color:var(--ux-muted)}body.ui-material #wiki .wkempty{border:0;background:none;padding:18px 0}
body.ui-material #wiki .wksearch input{min-height:40px}body.ui-material #wiki .wksearch{gap:4px}
body.ui-material #wiki .wkcaption{display:none}
body.ui-material :is(#modal,#ovl,#wiki) :where(button,input,textarea,summary):focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:2px}
body.ui-material.ui-fx-document{background:var(--ux-face)}
body.ui-material.ui-fx-document header,body.ui-material.ui-fx-document h2{background:var(--ux-title-face);border-radius:4px 4px 0 0;box-shadow:inset 1px 1px #becbf3,inset -1px -1px #26357e}
body.ui-material.ui-fx-document h1,body.ui-material.ui-fx-document h2,body.ui-material.ui-fx-document nav a{font-family:var(--ux-display)}
body.ui-material.ui-fx-document nav{gap:4px;padding:8px;background:var(--ux-metal);border:1px solid #8f9cbb;border-radius:5px;box-shadow:inset 1px 1px #fff,inset -1px -1px #a3b0cb}
body.ui-material.ui-fx-document nav a{border:1px solid transparent;border-radius:3px;background:transparent;color:var(--ux-ink);box-shadow:none;padding:8px 9px;min-height:40px}
body.ui-material.ui-fx-document nav a:hover{background:var(--ux-key-face);border-color:#8b99b5;box-shadow:inset 1px 1px #fff}
body.ui-material.ui-fx-document nav a[aria-current="location"]{background:var(--ux-blue-face);border-color:#26357e;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70;color:#fff}
body.ui-material.ui-fx-document main>section{border:1px solid #8f9cbb;border-radius:4px;box-shadow:inset 1px 1px #fff;background:var(--ux-screen)}
body.ui-material.ui-fx-document :is(input,button){border-radius:3px;box-shadow:none;font:14px system-ui,sans-serif}
body.ui-material.ui-fx-document input{background:var(--ux-lcd);border:2px solid;border-color:#7486a1 #f8fbff #f8fbff #7486a1;box-shadow:inset 1px 1px #c2ced6;color:var(--ux-ink)}
body.ui-material.ui-fx-document button{background:var(--ux-key-face);border:1px solid var(--ux-frame);box-shadow:var(--ux-key-shadow);color:var(--ux-ink)}
body.ui-material.ui-fx-document :is(td,tr){border-color:var(--ux-rule)}body.ui-material.ui-fx-document .m{color:var(--ux-muted)}
body.ui-material #nexthint{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:3px!important;box-shadow:var(--ux-key-shadow)!important;color:var(--ux-ink)!important}
@media(max-width:1179px){body.ui-material.m #modal>.mbox{border-radius:8px 8px 0 0!important}body.ui-material.m #mtabs{padding:4px 5px 6px!important;box-shadow:inset 0 1px #fff,0 -2px #8794ad!important;gap:4px!important}}
@media(max-width:700px){body.ui-material #wiki .wkn{max-height:148px}body.ui-material #wiki .wkt{padding:8px;gap:6px}body.ui-material.ui-fx-document .w{padding:8px}}
@media(forced-colors:active){body.ui-material :is(#modal,#ovl,#wiki) :where(button,input,textarea),body.ui-material.ui-fx-document :is(a,button,input){border:1px solid ButtonText!important}body.ui-material #wiki button.wkc.on,body.ui-material.ui-fx-document nav a[aria-current="location"]{outline:2px solid Highlight}body.ui-material #mttl::before{background:Highlight}}
`;
const uxEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const UX_GRID = { x:0, y:0 };
let UX_LAST_SOURCE = null;
const UX_LAYERS = [], UX_INERT = new Map();
function uxFocusToken(el = document.activeElement){
  if (!el || el === document.body) return null;
  return { el, id:el.id, key:el.dataset.focus, action:el.getAttribute('onclick'), scope:el.closest('#mbody,#mtabs,#mttl')?.id };
}
function uxRestoreFocus(t){
  if (!t) return;
  let el = t.el?.isConnected ? t.el : t.id ? document.getElementById(t.id) : null;
  const scope = t.scope ? document.getElementById(t.scope) : document;
  if (!el && scope) el = t.key ? [...scope.querySelectorAll('[data-focus]')].find(e => e.dataset.focus === t.key) : t.action ? [...scope.querySelectorAll('[onclick]')].find(e => e.getAttribute('onclick') === t.action) : null;
  if (el && !el.closest('[inert]') && !el.disabled) el.focus({ preventScroll:true });
}
function uxCapturePanel(){ return { focus:uxFocusToken(), scroll:document.getElementById('mbody')?.scrollTop || 0, details:[...document.querySelectorAll('#mbody details')].map(el=>el.open) }; }
function uxRestorePanel(s, reset){ if (!reset){ document.getElementById('mbody').scrollTop = s.scroll;document.querySelectorAll('#mbody details').forEach((el,i)=>{if(s.details[i]!=null)el.open=s.details[i]});uxRestoreFocus(s.focus); } }
function uxLayerSync(){
  for (const [el, was] of UX_INERT) el.inert = was;
  UX_INERT.clear();
  const top = UX_LAYERS.at(-1); if (!top) return;
  for (const el of document.body.children) if (el !== top.el && !el.contains(top.el) && !['SCRIPT','STYLE'].includes(el.tagName) && el.id !== 'uxstatus'){
    UX_INERT.set(el, el.inert); el.inert = true;
  }
}
function uxOpenDialog(el, label, close){
  if(typeof viewExitWatch==='function')viewExitWatch();
  let layer = UX_LAYERS.find(l => l.el === el);
  if (!layer){ layer = { el, trigger:uxFocusToken(), close }; UX_LAYERS.push(layer); }
  el.hidden = false; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label',label); el.tabIndex = -1;
  uxLayerSync();
  requestAnimationFrame(() => {
    if (UX_LAYERS.at(-1) !== layer) return;
    const target = el.querySelector('[data-initial-focus]') || el.querySelector('button:not([disabled]),input,textarea,[tabindex="0"]') || el;
    target.focus({ preventScroll:true });
  });
}
function uxCloseDialog(el){
  const i = UX_LAYERS.findIndex(l => l.el === el); el.hidden = true;
  if (i < 0) return;
  const [layer] = UX_LAYERS.splice(i, 1); uxLayerSync(); uxRestoreFocus(layer.trigger);
}
function uxAnnounce(text){ const el = document.getElementById('uxstatus'); if (el){ el.textContent = ''; requestAnimationFrame(() => { el.textContent = text; }); } }
function uxCancelPiece(){ held = null; selPiece = null; heldRot = 0; pzHover(-1,-1); renderModal(); uxRestoreFocus(UX_LAST_SOURCE); uxAnnounce('已取消選取，盤面沒有變更。'); }
const UX_TAG = { proj:'投射物', area:'範圍', melee:'近戰', fire:'火焰', cold:'冰霜', light:'閃電' };
function uxPieceDetails(){
  const p = held || G.board?.pieces.find(p => p.id === selPiece); if (!p) return '';
  const active = p.kind === 'active', def = active ? SKILLS[p.key] : SUPPS[p.key], grid = active ? GridLab.ACTIVES[p.key] : GridLab.SUPPORTS[p.key];
  const needs = active ? grid.tags : grid.needs, applies = active ? needs.map(k => UX_TAG[k] || k).join('、') : needs.length ? needs.map(k => UX_TAG[k] || k).join('、') + '技能' : '所有主動技能';
  let links = '';
  if (!held){ const res = GridLab.resolve(G.board); const ids = active ? (res.find(r => r.id === p.id)?.linked || []).map(id => G.board.pieces.find(q => q.id === id)).filter(Boolean).map(q => SUPPS[q.key].n) : res.filter(r => r.linked.includes(p.id)).map(r => SKILLS[r.key].n);
    links = ids.length ? '已連接：' + ids.join('、') : active ? '尚未連接輔助' : '尚未連到適用技能'; }
  return `<section class="uxinspect" aria-label="選中機件詳情"><div class="uxinspect-head">${active ? sico(p.key,24) : gemIco(p.key,24)}<b>${uxEsc(def.n)}</b>${shapeIcon(p.kind,p.key,held ? heldRot : p.rot)}${held ? '<button class="uxboard-link" aria-label="選位置放置 ↓" onclick="uxGoBoard()">放置 ↓</button>' : ''}<button class="uxquiet" onclick="uxCancelPiece()" aria-label="取消選取">取消</button></div><div class="uxeffect">${uxEsc(def.d)}</div><div class="uxmeta">${grid.shape.length} 格 · ${active ? '' : '適用：'}${uxEsc(applies)}${links ? ' · ' + uxEsc(links) : ''}</div></section>`;
}
function uxGridLabel(x,y){
  const p = G.board.pieces.find(p => GridLab.cellsOf(p).some(c => c[0] === x && c[1] === y));
  return `第 ${y+1} 列第 ${x+1} 格，${p ? (p.kind === 'active' ? SKILLS[p.key].n : SUPPS[p.key].n) : '空白'}`;
}
function uxGridFocus(el){
  UX_GRID.x = +el.dataset.x; UX_GRID.y = +el.dataset.y;
  for (const c of document.querySelectorAll('.pz [data-x]')) c.tabIndex = c === el ? 0 : -1;
  pzHover(UX_GRID.x,UX_GRID.y);
}
function uxGridActivate(x,y){ UX_GRID.x=x; UX_GRID.y=y; pzCell(x,y); }
function uxGoBoard(){ const el = document.querySelector(`.pz [data-x="${UX_GRID.x}"][data-y="${Math.min(UX_GRID.y,G.board.h-1)}"]`); if (el){ el.focus(); el.scrollIntoView({ block:'nearest' }); } }
function uxInputTarget(e){ return e.isComposing || e.target.closest('input,textarea,select,[contenteditable="true"]'); }
function uxKeydown(e){
  const layer = UX_LAYERS.at(-1);
  if (layer){
    if (!uxInputTarget(e) && ['q','e','`'].includes(e.key.toLowerCase())) e.stopImmediatePropagation();
    if (e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); layer.close(); return; }
    if (e.key === 'Tab'){
      const list = [...layer.el.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,a[href],[tabindex="0"]')].filter(el => !el.closest('[hidden]') && el.getClientRects().length);
      const first=list[0] || layer.el, last=list.at(-1) || layer.el;
      if (e.shiftKey && (document.activeElement === first || !layer.el.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !layer.el.contains(document.activeElement))){ e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (uxInputTarget(e) || modalTab !== 'skills' || $('modal')?.hidden) return;
  const cell = e.target.closest('.pz [data-x]');
  const delta = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[e.key];
  if (cell && delta){ e.preventDefault(); const x=Math.max(0,Math.min(G.board.w-1,+cell.dataset.x+delta[0])), y=Math.max(0,Math.min(G.board.h-1,+cell.dataset.y+delta[1])); const el=document.querySelector(`.pz [data-x="${x}"][data-y="${y}"]`); el?.focus(); el?.scrollIntoView({block:'nearest'}); }
  else if (e.key.toLowerCase() === 'r'){ e.preventDefault(); pzRot(); }
  else if (e.key === 'Escape' && (held || selPiece != null)){ e.preventDefault(); uxCancelPiece(); }
}
function mapChallenge(mods){ return mods.filter(k => ['challenge','mixed'].includes(MODS[k]?.kind)).length; }
function mapKind(k){ return MODS[k]?.kind === 'mixed' ? '取捨' : MODS[k]?.kind === 'challenge' ? '挑戰' : MODS[k]?.kind === 'reward' ? '獎勵' : '未分類'; }
let UX_RETURN_NEW=null;
function uxOfflineGo(tab){
  const fresh=UX_RETURN_NEW;
  if(tab==='skills')UI_WORK.inventory=fresh?.kind||'support';
  if(tab==='maps')UI_WORK.adventure='maps';
  hideOverlay();openModal(tab);
  if(tab==='skills'&&fresh){G.newSnap={g:fresh.g,c:fresh.c};UX_RETURN_NEW=null;renderModal(true);}
  requestAnimationFrame(()=>{const el=tab==='skills'?document.getElementById('uxinventory'):document.querySelector('#mbody .ui-map-list');if(el){el.tabIndex=-1;el.focus({preventScroll:true});el.scrollIntoView({block:'start'});}});
}
function uxOfflineReport(o,b,away,sec,saved){
  UX_RETURN_NEW=o.gems||o.carts?{kind:o.gems?'support':'cart',g:b.gems||{},c:b.carts||{}}:null;
  const newPieces=o.gems+(o.carts || 0), cores=o.cores||0, pending=G.picks+G.relicPicks;
  const action = cores ? `<button class="mb pri" onclick="uxOfflineGo('char')">查看新核心</button>` : newPieces ? `<button class="mb pri" onclick="uxOfflineGo('skills')">查看新配件</button>` : o.maps && tabOpen('maps') ? `<button class="mb pri" onclick="uxOfflineGo('maps')">查看新地圖</button>` : '';
  return `<h2 class="uxdialog-title">歡迎回來！</h2><p class="uxmeta">離開 ${fmtDur(away)}${away > sec ? `，最多結算 ${fmtDur(sec)}` : ''}</p><div class="uxreturn-summary"><div><span>成長</span><b>等級 ${b.lvl} → ${G.lvl}</b><small>金幣 +${tFmt(G.gold-b.gold)}</small></div><div><span>裝備</span><b>換上 ${o.eq} 件</b><small>${cores?`新收藏 ${cores} 種傳奇核心`:'一般裝備自動比較；核心保留'}</small></div><div><span>新資源</span><b>${newPieces} 件配件／卡匣</b><small>${o.maps} 張地圖</small></div>${pending?`<div><span>待選</span><b>${G.picks} 次改裝 · ${G.relicPicks} 次遺物</b><small>選擇已保留，可以稍後處理。</small></div>`:''}</div>${G.deaths>b.deaths ? `<p class="uxwarning">這段時間倒下 ${G.deaths-b.deaths} 次，可先檢查防禦與構築。</p>` : ''}${saved ? '' : '<p class="uxwarning">本機存檔未成功，請至存檔頁匯出存檔碼保存。</p>'}<details class="uxreturn-log"><summary>完整紀錄</summary><ul><li>擊殺 ${tFmt(G.totalKills-b.kills)} 隻怪物</li><li>深度 ${b.depth} → ${G.depth}</li><li>倒下 ${G.deaths-b.deaths} 次</li>${o.cards.length ? `<li>依自動隨機設定完成：${o.cards.map(uxEsc).join('、')}</li>` : ''}</ul></details><div class="uxactions">${pending?'<button class="mb pri" onclick="openPendingChoices()">查看待選內容</button>':''}${action}<button class="mb" onclick="hideOverlay()">繼續掛機</button>${saved ? '' : '<button class="mb" onclick="uxOfflineGo(\'save\')">備份存檔</button>'}</div>`;
}
const UX_CSS = `
${UX_THEME}
html{scrollbar-color:var(--ux-scroll) var(--ux-track);scrollbar-width:thin}*{scrollbar-color:var(--ux-scroll) var(--ux-track)}
::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-thumb{background:var(--ux-scroll);border:2px solid var(--ux-track);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--ux-muted)}::-webkit-scrollbar-track{background:var(--ux-track)}
button:enabled,a[href],summary{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:3px}
.uxsr{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
#mbody .dpsbar{top:-8px;background:var(--ux-screen);border-color:var(--ux-edge);margin-bottom:8px}
.uxinspect{margin:6px 0 0;padding:8px 2px 2px;border-top:1px solid #b5c4e5;text-align:left;font-family:system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}
.uxinspect-head{display:flex;align-items:center;gap:7px;font-size:14px}.uxinspect-head .uxquiet{margin-left:auto}.uxeffect{font-size:14px;line-height:1.5;font-weight:650;margin-top:4px}.uxmeta{font:12px/1.5 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-muted);margin:4px 0}
.uxinspect .uxquiet,.uxinspect .uxboard-link{min-height:32px;padding:3px 10px!important;font:12px system-ui,sans-serif!important;border-radius:6px!important}.uxinspect .uxboard-link{margin-top:4px}
#mbody .pz button.pc{font:inherit;font-size:10px;padding:2px!important;margin:0;aspect-ratio:1;min-width:0;box-shadow:inset 0 2px 3px #1e286440!important;border:1px solid #7d8bbd!important;border-radius:7px!important;background:radial-gradient(circle at 50% 50%,#8294c4 0 18%,#b4c2e6 20%)!important;color:var(--ux-ink)!important;transition:none}
#mbody .pz button.pc.fill{background:linear-gradient(135deg,#ffffffaa,#ffffff00 45%),var(--pc)!important;border:2px solid #fff!important;box-shadow:inset 0 2px 0 #fffd,inset 0 -3px 0 #00003c35!important}
#mbody .pz button.pc:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:-3px;z-index:2}#mbody .pz button.pc.pv.ok{background:#b8f5d0!important;border-color:#19865a!important}#mbody .pz button.pc.pv.bad{background:#ffc4c4!important;border-color:#bd342b!important}
#mbody .pzbar{bottom:0;background:var(--ux-screen);border-top:1px solid #b6c5e6;padding:6px 0}.pzbar button{min-height:36px}.uxgrid-help{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted)}
#ovl{z-index:70}#ovl .mbox{max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}.uxdialog-title{font-size:17px;margin:2px 0 10px}.uxactions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.uxactions button{min-height:40px}.uxwarning{font:13px/1.5 system-ui,sans-serif;color:#8f3526;background:#fff0e5;padding:8px;border-left:3px solid var(--ux-accent)}
#mbody .char-card{grid-column:1/-1}.char-card .chars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.char-card .chr{min-width:0;min-height:60px;align-items:flex-start;text-align:left;gap:4px;padding:8px!important;white-space:normal}.char-card .chr b{font-size:14px;word-break:keep-all}.char-card .chr .mute{font:12px/1.45 system-ui,sans-serif;color:var(--ux-muted)}.char-card .rh{align-items:center}.char-card .rh button{min-height:36px;letter-spacing:0}.char-card .char-description{font:13px/1.55 system-ui,sans-serif;margin:8px 0 0}
.uxcraft-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.uxcraft-action{min-width:0}.uxcraft-action button{width:100%;min-height:40px;padding:5px 6px!important;font-size:12px!important;white-space:normal}.uxcraft-action p{font:12px/1.5 system-ui,sans-serif;margin:5px 0 0;color:var(--ux-muted)}.uxcraft-result{font:13px/1.5 system-ui,sans-serif;padding:8px;background:#e5f1ea;border-left:3px solid #26805c}.sv{resize:none!important}
.uxreturn-summary{display:grid;gap:7px;margin:12px 0}.uxreturn-summary>div{display:grid;grid-template-columns:60px 1fr;gap:3px 8px;background:#eef3fd;border:1px solid #bdcae6;border-radius:7px;padding:8px 10px}.uxreturn-summary span{grid-row:1/3;color:var(--ux-muted);font-size:12px}.uxreturn-summary b{font-size:15px}.uxreturn-summary small{font-size:12px;color:var(--ux-muted)}.uxreturn-log{font-size:13px;margin-top:10px}.uxreturn-log summary{padding:6px 0}
body.m #mttl{height:auto;min-height:44px;padding:2px 6px 2px 10px}body.m #mttl button{width:40px;height:40px;font-size:14px}body.m #mbody .qm{width:36px;height:36px;line-height:30px;font-size:14px}body.m .uxinspect .uxquiet,body.m .uxinspect .uxboard-link{min-height:40px}body.m .pzbar button{min-height:40px}body.m #mbody{scroll-padding-top:140px;scroll-padding-bottom:60px}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}}
@media(forced-colors:active){*{scrollbar-color:auto}button:focus-visible,[tabindex]:focus-visible{outline-color:Highlight!important}.uxinspect{border-color:CanvasText}}
`;
function uxInit(){
  for(const [key,src] of Object.entries(ASSET))document.documentElement.style.setProperty('--a-'+key,`url("${src}")`);
  const st=document.createElement('style');st.id='uxstyles';st.textContent=UX_CSS;document.head.appendChild(st);
  const live=document.createElement('div');live.id='uxstatus';live.className='uxsr';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
  document.addEventListener('keydown',uxKeydown,true);
}

;
/* ---------- 編年史：全螢幕資料頁，查看所有遊戲資訊（技能、配件、遺物、傳奇裝備、怪物、地圖、角色、規則） ---------- */
const WK = { cat:'skill', q:'' };
const wkEl = { cap:'火', fire:'火', cold:'冰', light:'電' };
const WIKI = {
  skill:{ n:'技能', rows:() => Object.entries(SKILLS).map(([id, K]) => ({ t:K.n, tag:`Lv. ${K.lvl}　${{ fire:'火', cold:'冰', light:'電' }[K.el]}`, d:K.d, s:`冷卻 ${K.cd} 秒　倍率 ×${K.mult}`, got:G.lvl >= K.lvl, col:K.col, ico:sico(id, 28), mods:Object.values(MODES).filter(M => M.sk === id).map(M => `${M.n}：${M.d}`) })) },
  supp:{ n:'輔助配件', rows:() => Object.entries(SUPPS).map(([id, S]) => ({ t:S.n, d:S.d, s:`形狀 ${GridLab.SUPPORTS[id].shape.length} 格${GridLab.SUPPORTS[id].needs.length ? '　限' + GridLab.SUPPORTS[id].needs.map(k => UX_TAG[k] || k).join('、') : ''}`, got:(G.gems[id] || 0) > 0 || (G.seenG || {})[id], ico:gemIco(id, 28) })) },
  mode:{ n:'模式卡匣', rows:() => Object.entries(MODES).map(([id, M]) => ({ t:M.n, tag:SKILLS[M.sk].n, d:M.d, s:'', got:!!G.seen[id] })) },
  relic:{ n:'遺物', rows:() => Object.entries(RELICS).map(([id, r]) => ({ t:r.n, d:r.d, s:'', got:!!G.relics[id], ico:xico('relic', id, 28) })) },
  legend:{ n:'傳奇裝備', rows:() => Object.entries(LEGENDS).flatMap(([slot, arr]) => arr.map(L => ({ t:L.name, tag:'暗金' + SLOTN[slot], d:L.d, s:'', got:!!G.legSeen[L.id], ico:xico('legend', L.id, 30) }))) },
  ach:{ n:'成就', rows:() => Object.entries(ACHS).map(([id, a]) => ({ t:a.n, tag:'永久傷害 +1%', d:a.d, s:'', got:!!G.ach[id], ico:xico('badge', id, 28) })) },
  card:{ n:'升級卡', rows:() => Object.entries(CARDS).map(([id, c]) => ({ t:c.n, d:c.d, s:c.sk ? '技能變體：' + SKILLS[c.sk].n : '', got:(G.cards[id] || 0) > 0 })) },
  react:{ n:'元素反應', rows:() => [['火焰', '命中的敵人燃燒 3 秒，持續受到傷害'], ['閃電', '命中的敵人被標記 4 秒'], ['融化', '火焰打到凍結的敵人：傷害 +40%，解除凍結'], ['超導', '閃電打到凍結的敵人：傷害 +30%'], ['蒸氣', '冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒'], ['過載', '火焰或冰霜打到被閃電標記的敵人：傷害 +25%']].map(([t, d]) => ({ t, d, s:'', got:true })) },
  mon:{ n:'怪物', rows:() => [['slime', '史萊姆', '成群出現，行動最快的雜兵'], ['skel', '骷髏', '比史萊姆耐打'], ['brute', '蠻牛', '又慢又硬，打人很痛'], ['drone', '無人機', '貼著半空飛，速度快但很脆（深度 2 起）'], ['bomb', '自爆機器人', '死亡時爆炸，波及主角與附近的怪（深度 4 起）'], ['boss', '守關者', '關底首領，掉落最好的戰利品']].map(([id, t, d]) => ({ t, d, s:`生命 ×${MTYPES[id].hp}　傷害 ×${MTYPES[id].dmg}　速度 ${MTYPES[id].spd}`, got:((G.mk || {})[id] || 0) > 0 })).concat([{ t:'菁英', tag:'變體', d:'任何小怪都可能變成菁英（深度 6 起）：體型較大、腳下有金環，生命 ×3.2、傷害 ×1.3，金幣與經驗 ×4，必掉裝備', s:'', got:G.maxDepth >= 6 }]) },
  map:{ n:'地圖與詞綴', rows:() => BIOMES.map(b => ({ t:b.n, tag:'生態', d:'守關者與地圖怪會掉落這個生態的地圖', s:'', got:true })).concat(Object.entries(MODS).map(([id, m]) => ({ t:m.n, tag:mapKind(id), d:m.kind === 'mixed' ? '同時有強化與減弱，計入挑戰詞綴數' : m.kind === 'challenge' ? '計入挑戰詞綴數，數量不是難度評分' : '額外獎勵', s:'', got:true }))) },
  char:{ n:'角色', rows:() => Object.entries(CHARS).map(([id, c]) => ({ t:c.n, tag:c.ach ? '成就解鎖' : c.need ? `最深 ${c.need} 層` : '初始', d:c.d, s:`專屬技能「${c.sig.n}」：${c.sig.d}`, got:charOk(id) })) },
  cos:{ n:'裝扮', rows:() => COS_CATS.map(([k, n]) => ({ t:n, d:COS[k].map(e => e[1]).join('、'), s:`${COS[k].length} 款　價格 ${Math.min(...COS[k].filter(e => e[3] > 0).map(e => e[3]))} 至 ${Math.max(...COS[k].map(e => e[3]))} 金幣`, got:true })) },
  rule:{ n:'規則', rows:() => [['技能拼圖', '6×6 面板隨等級逐列解鎖。輔助配件只強化上下左右相鄰的技能；連到 3 個以上輔助「滿載」，每多一個傷害 +8%。'], ['共鳴', '塞滿整列：全隊傷害 +12%；塞滿整欄：暴擊率 +5%；元素相同的兩個技能緊貼：各自傷害 +15%。'], ['改機', '用不到的裝備拆成零件（普通 1、魔法 2、稀有 5、暗金 12）。零件可重新校準、改裝詞綴、升級稀有度，或腐化賭一把。'], ['守關者保底', '連續沒出暗金時，下一件暗金的機率逐次提高。'], ['離線收益', '離開頁面後回來會結算離線收益，最多 6 小時。'], ['無限之塔', '每層殺滿怪就上樓，每 10 層是守關者，打贏多一條規則與一件遺物。死亡就結束。'], ['操作', '拖曳旋轉浮島，滾輪或雙指縮放；Q、E 轉向；` 鍵進入扮工模式。']].map(([t, d]) => ({ t, d, s:'', got:true })) },
};
const wikiText = r => [r.t,r.d,r.tag,r.s,...(r.mods || [])].filter(Boolean).join(' ').toLocaleLowerCase();
function wikiRows(q = WK.q, cat = WK.cat){
  const needle = q.trim().toLocaleLowerCase(), cats = needle ? Object.keys(WIKI) : [cat];
  return cats.flatMap(c => WIKI[c].rows().map(r => ({ ...r,c }))).filter(r => !needle || wikiText(r).includes(needle));
}
function wikiCard(r, showCategory){
  return `<article class="wke${r.got ? '' : ' dim'}"><div class="wkh">${r.ico || ''}<b>${uxEsc(r.t)}</b><span class="wkstate">${r.got ? '✓ 已取得' : '未取得'}</span></div>${r.tag || showCategory ? `<div class="uxmeta">${showCategory ? WIKI[r.c].n + ' · ' : ''}${uxEsc(r.tag || '')}</div>` : ''}<p>${uxEsc(r.d)}</p>${r.s ? `<div class="wkm">${uxEsc(r.s)}</div>` : ''}${(r.mods || []).map(m => `<div class="wkm">${uxEsc(m)}</div>`).join('')}</article>`;
}
function wikiEmpty(q){ return `<div class="wkempty"><b>找不到符合「${uxEsc(q)}」的資料</b><p>試試技能名稱、效果或其他關鍵字。</p><button onclick="wikiClear()">清除搜尋</button></div>`; }
function wikiList(){ const rows=wikiRows(); return rows.map(r => wikiCard(r,!!WK.q.trim())).join('') || wikiEmpty(WK.q); }
function wikiHtml(){
  const q=WK.q;
  return `<div class="wkb"><div class="wkt"><h2>編年史</h2><button class="wkclose" aria-label="關閉編年史" onclick="wikiClose()">✕</button><div class="wksearch"><label class="uxsr" for="wkq">搜尋全部分類</label><input id="wkq" placeholder="搜尋名稱或效果" value="${uxEsc(q)}" oncompositionstart="this.dataset.composing='yes'" oncompositionend="this.dataset.composing='';wikiSearch(this.value)" oninput="if(!this.dataset.composing)wikiSearch(this.value)"><button id="wkclear" aria-label="清除搜尋" ${q ? '' : 'hidden'} onclick="wikiClear()">清除</button></div></div><div class="wkm2"><nav class="wkn" aria-label="編年史分類">${Object.keys(WIKI).map(c => `<button data-wk-cat="${c}" class="wkc${!q.trim() && c === WK.cat ? ' on' : ''}" aria-pressed="${!q.trim() && c === WK.cat}" onclick="wikiCategory('${c}')">${WIKI[c].n}</button>`).join('')}</nav><div class="wkcontent"><p id="wkcount" class="wkcount" role="status">找到 ${wikiRows().length} 筆${q ? '，搜尋全部分類' : ''}</p><div class="wkl">${wikiList()}</div></div></div></div>`;
}
function wikiRender(keep){
  const el=$('wiki'); if (!el) return;
  if (!keep) el.innerHTML=wikiHtml();
  else { el.querySelectorAll('.wkc').forEach(b=>{const on=!WK.q.trim()&&b.dataset.wkCat===WK.cat;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});el.querySelector('.wkl').innerHTML=wikiList(); $('wkcount').textContent=`找到 ${wikiRows().length} 筆${WK.q.trim() ? '，搜尋全部分類' : ''}`; $('wkclear').hidden=!WK.q; }
}
function wikiSearch(value){ WK.q=value; wikiRender(true); }
function wikiClear(){ WK.q=''; $('wkq').value=''; wikiRender(true); $('wkq').focus(); }
function wikiCategory(cat){ WK.cat=cat; WK.q=''; wikiRender(); requestAnimationFrame(() => { const el=$('wiki').querySelector('.wkc.on'); el?.focus({preventScroll:true}); }); }
const WIKI_CSS = `
${UX_THEME}
.wkb{width:min(980px,100%);height:min(760px,100%);background:var(--ux-screen);border:2px solid #fff;outline:1px solid var(--ux-edge);border-radius:12px;box-shadow:0 8px 30px #141e7355;display:flex;flex-direction:column;overflow:hidden;font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}
.wkt{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 12px;background:var(--ux-blue);color:#fff}.wkt h2{font-size:18px;margin:0}.wkcaption{font-size:12px}.wkclose{margin-left:auto}.wksearch{display:flex;gap:6px;min-width:0;margin-left:auto}.wksearch input{width:min(280px,40vw);min-width:0;padding:8px 10px;border-radius:8px;border:1px solid var(--ux-edge);font:14px system-ui,sans-serif;color:var(--ux-ink);background:#fff}.wksearch button,.wkt button{min-height:36px;border-radius:7px;padding:5px 10px;border:1px solid var(--ux-edge);cursor:pointer}
.wkm2{display:flex;flex:1;min-height:0}.wkn{width:145px;flex:none;display:flex;flex-direction:column;gap:6px;padding:10px;overflow:auto;border-right:1px solid #bdcae6}.wkc{font:13px/1.4 system-ui,sans-serif;text-align:left;border:1px solid var(--ux-edge);border-radius:7px;background:transparent;color:var(--ux-ink);padding:8px;cursor:pointer;min-height:36px}.wkc.on{outline:2px solid var(--ux-blue)}.wkcontent{flex:1;overflow:auto;min-width:0}.wkcount{padding:8px 12px;margin:0;color:var(--ux-muted);font-size:13px}.wkl{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:10px;padding:0 10px 12px;align-content:start}.wke{background:#fff;border:1px solid #b6c5e5;border-left:3px solid var(--ux-blue);border-radius:9px;padding:10px 12px;min-width:0;overflow-wrap:anywhere}.wke p{margin:6px 0}.wke.dim{border-left-color:#96a0b8}.wke.dim .spr{filter:grayscale(1)}.wkh{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.wkh b{font-size:15px}.wkstate{font-size:12px;margin-left:auto;color:var(--ux-muted)}.wkm{font-size:13px;color:var(--ux-blue);margin-top:4px}.wkempty{grid-column:1/-1;padding:24px 12px;border:1px dashed var(--ux-edge);border-radius:10px}.wkempty p{color:var(--ux-muted)}
[hidden]{display:none!important}.wkb :focus-visible{outline:3px solid var(--ux-focus);outline-offset:2px}
@media(max-width:700px){.wkt h2{white-space:nowrap}.wksearch{order:3;flex:1 0 100%;margin-left:0}.wksearch input{flex:1;width:0}.wkm2{flex-direction:column}.wkn{flex-direction:row;width:auto;max-height:105px;flex-wrap:wrap;border-right:0;border-bottom:1px solid #bdcae6;gap:6px;padding:8px}.wkc{flex:none;min-height:40px}.wkl{grid-template-columns:1fr}.wkt button{min-height:40px}}
`;
function wikiOverlay(){
  let el=$('wiki');
  if (!el){ el=document.createElement('div');el.id='wiki';document.body.appendChild(el);const st=document.createElement('style');st.textContent=`#wiki{position:fixed;inset:0;z-index:60;background:#28326e70;display:flex;align-items:center;justify-content:center;padding:12px}#wiki[hidden]{display:none}${WIKI_CSS}${UX_MATERIAL_CSS}`;document.head.appendChild(st); }
  wikiRender();uxOpenDialog(el,'編年史',wikiClose);
}
function wikiClose(){ const el=$('wiki');if(el)uxCloseDialog(el); }
/* 新分頁保留開啟當下的進度，資料及搜尋語意與遊戲內版一致。 */
function wikiPage(){
  const fx=typeof viewFxSnapshot==='function'?viewFxSnapshot():{head:'',body:'',defs:''};
  const cats=Object.keys(WIKI), vars=Object.keys(ASSET).filter(k => k !== 'wordmark').map(k => `--a-${k}:url("${ASSET[k]}")`).join(';');
  const sections=cats.map(c => { const rows=WIKI[c].rows(); return `<section id="c-${c}"><h2 tabindex="-1">${WIKI[c].n}<small>已取得 ${rows.filter(r=>r.got).length}／${rows.length}</small></h2><table aria-label="${WIKI[c].n}"><thead><tr><th scope="col">名稱</th><th scope="col">效果</th><th scope="col">取得狀態</th></tr></thead><tbody>${rows.map(r => `<tr data-search="${uxEsc(wikiText(r))}"><td class="n">${r.ico || ''}<b>${uxEsc(r.t)}</b>${r.tag ? `<span class="tg">${uxEsc(r.tag)}</span>` : ''}</td><td class="desc">${uxEsc(r.d)}${r.s ? `<div class="s">${uxEsc(r.s)}</div>` : ''}${(r.mods || []).map(m=>`<div class="m">${uxEsc(m)}</div>`).join('')}</td><td class="g">${r.got ? '✓ 已取得' : '未取得'}</td></tr>`).join('')}</tbody></table></section>`; }).join('');
  const script = `const input=document.getElementById('q'),clear=document.getElementById('clear'),count=document.getElementById('count'),empty=document.getElementById('empty');let composing=false,currentSection=document.querySelector('nav a[aria-current]')?.getAttribute('href');function filter(){const v=input.value.trim().toLocaleLowerCase();document.querySelectorAll('nav a').forEach(a=>{if(!v&&a.getAttribute('href')===currentSection)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});let total=0;document.querySelectorAll('main section').forEach(s=>{let n=0;s.querySelectorAll('tbody tr').forEach(r=>{r.hidden=!!v&&!r.dataset.search.includes(v);if(!r.hidden)n++});s.hidden=!n;total+=n});clear.hidden=!input.value;empty.hidden=total>0;document.getElementById('empty-query').textContent=input.value;count.textContent='找到 '+total+' 筆'+(v?'，搜尋全部分類':'')}function reset(){input.value='';filter();input.focus()}input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>{composing=false;filter()});input.addEventListener('input',()=>{if(!composing)filter()});clear.onclick=reset;document.getElementById('empty-clear').onclick=reset;document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();currentSection=a.getAttribute('href');input.value='';filter();const target=document.querySelector(a.getAttribute('href'));if(target){target.scrollIntoView();target.querySelector('h2').focus({preventScroll:true})}}));const header=document.querySelector('header');new ResizeObserver(()=>{document.documentElement.style.setProperty('--wiki-header',header.offsetHeight+'px')}).observe(header);filter();`;
  let page=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>編年史 · Idle Hero</title><style>:root{${vars}}${UX_THEME}
*{box-sizing:border-box}body{margin:0;background:#d9e6fb;color:var(--ux-ink);font:14px/1.6 system-ui,"Microsoft JhengHei",sans-serif;scrollbar-color:var(--ux-scroll) var(--ux-track)}header{position:sticky;top:0;z-index:5;background:var(--ux-blue);color:#fff;display:flex;gap:8px 16px;align-items:center;flex-wrap:wrap;padding:10px 16px;box-shadow:0 2px 6px #17295a33}h1{margin:0;font-size:19px;white-space:nowrap}.caption{font-size:12px}.search{margin-left:auto;display:flex;gap:6px;min-width:0}input{min-width:0;width:280px;padding:9px 12px;border:1px solid var(--ux-edge);border-radius:8px;font:14px system-ui,sans-serif}button{cursor:pointer;min-height:40px;border:1px solid var(--ux-edge);border-radius:7px;background:transparent;color:var(--ux-ink);padding:6px 12px;font:inherit}.w{display:flex;max-width:1200px;margin:auto;padding:16px;gap:16px}nav{position:sticky;top:calc(var(--wiki-header,64px) + 12px);align-self:flex-start;width:145px;flex:none;display:flex;flex-direction:column;gap:6px}nav a{padding:7px 10px;border:1px solid var(--ux-edge);border-radius:7px;background:transparent;color:var(--ux-ink);text-decoration:none}main{min-width:0;flex:1}#count{margin:0 0 10px;color:var(--ux-muted)}section{scroll-margin-top:calc(var(--wiki-header,80px) + 12px);margin-bottom:16px;border:1px solid var(--ux-edge);border-radius:10px;background:var(--ux-screen);overflow:hidden}h2{margin:0;padding:8px 12px;background:var(--ux-blue);color:#fff;font-size:16px}h2 small{margin-left:12px;font-size:12px;font-weight:400}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:12px;color:var(--ux-muted);padding:6px 12px}td{padding:10px 12px;border-top:1px solid #bdcae6;vertical-align:top}.n{width:29%}.n b{margin-left:5px}.tg{font-size:12px;display:block;color:var(--ux-muted)}.g{width:100px;white-space:nowrap;color:var(--ux-muted);font-size:12px}.s{color:var(--ux-muted);font-size:13px}.m{color:var(--ux-blue);font-size:13px}.spr{display:inline-block;vertical-align:middle}.wkempty{background:var(--ux-screen);padding:24px;border:1px dashed var(--ux-edge);border-radius:10px}.sr{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}[hidden]{display:none!important}:focus-visible{outline:3px solid var(--ux-focus);outline-offset:2px}a:hover,button:hover{background:#e2ecff}
@media(max-width:700px){header{padding:10px 12px}.caption{flex:1;font-size:12px}.search{flex:1 0 100%;margin:0}.search input{flex:1;width:0}.w{display:block;padding:10px}nav{position:static;width:auto;display:flex;flex-direction:row;flex-wrap:wrap;margin-bottom:12px}nav a{font-size:13px;min-height:40px}thead{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}table,tbody{display:block}tr{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:12px;gap:6px 8px;border-top:1px solid #bdcae6}td{display:block;border:0;padding:0}.n{width:auto;grid-column:1;grid-row:1}.g{width:auto;grid-column:2;grid-row:1}.desc{grid-column:1/-1}.n b{font-size:15px}.tg{margin:3px 0 0}h2 small{display:inline-block}.n .spr{width:28px!important;height:28px!important}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}@media(forced-colors:active){body{scrollbar-color:auto}}
</style>${fx.head}</head><body ${fx.body}>${fx.defs}<header><h1>編年史</h1><span class="caption">開啟當下的進度快照<br>關閉此分頁即可回到遊戲</span><div class="search"><label for="q" class="sr">搜尋全部分類</label><input id="q" placeholder="搜尋名稱或效果"><button id="clear" aria-label="清除搜尋" hidden>清除</button></div></header><div class="w"><nav aria-label="編年史分類">${cats.map(c=>`<a href="#c-${c}"${c===cats[0]?' aria-current="location"':''}>${WIKI[c].n}</a>`).join('')}</nav><main><p id="count" role="status"></p><div id="empty" class="wkempty" hidden><b>找不到符合「<span id="empty-query"></span>」的資料</b><p>試試技能名稱、效果或其他關鍵字。</p><button id="empty-clear">清除搜尋</button></div>${sections}</main></div><script>${script}${'<'+'/script>'}</body></html>`;
  return page;
}
function wikiOpen(){
  try{ const url=URL.createObjectURL(new Blob([wikiPage()],{type:'text/html;charset=utf-8'})),w=window.open(url,'_blank');if(w){setTimeout(()=>URL.revokeObjectURL(url),60000);return;}URL.revokeObjectURL(url); }catch(e){}
  wikiOverlay();
}

;
/* 操作台：共用導覽、工作分類與響應式外框。UI 暫存不改遊戲規則。 */
const UI_NAV = [
  {k:'char',n:'角色',icon:'role',pages:['char','dress']},
  {k:'skills',n:'戰鬥',icon:'battle',pages:['skills']},
  {k:'craft',n:'打造',icon:'craft',pages:['craft']},
  {k:'tree',n:'成長',icon:'growth',pages:['tree']},
  {k:'maps',n:'冒險',icon:'adventure',pages:['maps']},
  {k:'menu',n:'更多',icon:'more',pages:['menu','goals','ach','dex','log','save','settings']}
];
const UI_TITLE = {char:'角色總覽',dress:'角色與裝扮',skills:'戰鬥構築',craft:'打造工作台',tree:'天賦成長',maps:'冒險',menu:'更多',goals:'目標',ach:'成就',dex:'圖鑑',log:'更新日誌',save:'存檔與備份',settings:'遊戲設定'};
const UI_WORK = {inventory:'support',craftSlot:'weapon',craftAct:'upgrade',adventure:'maps'};
function uiNavHtml(){
  return UI_NAV.map(g=>{const current=g.pages.includes(modalTab),locked=!tabOpen(g.k),dot=g.k==='menu' ? dotOn('col')||logNew() : g.k==='tree' ? passPoints()>0 : dotOn(g.k);
    return `<button class="tab${current?' on':''}${locked?' lock':''}" data-focus="nav-${g.k}" aria-label="${g.n}" ${locked?`aria-describedby="nav-lock-${g.k}"`:dot?`aria-describedby="nav-new-${g.k}"`:""} aria-current="${current?'page':'false'}"  onclick="${locked?`lockTip('${g.k}')`:`openModal('${g.k}')`}">${spr(g.icon,24)}<span>${g.n}</span>${locked?`<span class="uxsr" id="nav-lock-${g.k}">等級 ${TAB_LVL[g.k]} 解鎖，按下查看說明</span>`:''}${dot&&!locked?`<i class="rd" aria-hidden="true"></i><span class="uxsr" id="nav-new-${g.k}">有新內容</span>`:''}</button>`;
  }).join('');
}
function uiTitle(){
  const box=document.querySelector('#modal > .mbox');if(!box)return;
  let el=$('mttl');if(!el){el=document.createElement('div');el.id='mttl';box.insertBefore(el,$('mbody'));}
  const root=UI_NAV.find(g=>g.pages.includes(modalTab)),back=root&&modalTab!==root.k;
  const hk=MHELP[modalTab],cz=(modalTab==='skills'||modalTab==='craft')&&!G.userCz?2:G.cz==null?1:G.cz;
  el.innerHTML=`${back?`<button class="ui-back" aria-label="返回${root.n}" onclick="openModal('${root.k}')">‹</button>`:''}<h2>${UI_TITLE[modalTab]||'更多'}</h2>${hk?`<button aria-label="${HELP[hk][0]}" onclick="showHelp('${hk}')">?</button>`:''}${MOB()?`<button aria-label="切換戰場大小，目前${CZN[cz]}" onclick="cycleCz()">${CZN[cz]}</button>`:''}`;
}
function uiSegments(key,items,label){return `<div class="ui-segments" role="group" aria-label="${label}">${items.map(([id,name])=>`<button aria-pressed="${UI_WORK[key]===id}" data-focus="${key}-${id}" onclick="uiWork('${key}','${id}')">${name}</button>`).join('')}</div>`;}
function uiWork(key,id){
  const allowed={inventory:['active','support','cart'],craftSlot:Object.keys(SLOTN),craftAct:Object.keys(CRAFT),adventure:['maps','tower','training']};
  if(!allowed[key]?.includes(id))return;UI_WORK[key]=id;renderModal();
}
function uiMenuHtml(){
  const group=(name,items)=>`<section class="ui-menu-group"><h3>${name}</h3><div class="ui-directory">${items.map(([k,n,d])=>`<button onclick="openModal('${k}')"><b>${n}</b><span>${d}</span><i aria-hidden="true">↗</i></button>`).join('')}</div></section>`;
  return group('進度與收藏',[['goals','目標','下一個里程碑與獎勵'],['ach','成就','已達成的挑戰'],['dex','圖鑑','技能、卡匣與收藏紀錄']])+group('系統工具',[['log','更新日誌','查看版本與更新'],['save','存檔與備份','本機保存、匯入及匯出'],['settings','遊戲設定','戰鬥規則、拾取與音效']])+`<button class="ui-wiki" aria-label="編年史" onclick="wikiOpen()">${spr('star',24)}<span><b>編年史</b><small>查看所有遊戲資訊</small></span><i aria-hidden="true">↗</i></button>`;
}
function uiCharacterHtml(){
  const s=G.st;
  const rows=[['預估傷害',tFmt(s.dps)+' DPS'],['最大生命',tFmt(s.life)],['暴擊率',s.crit.toFixed(0)+'%'],['傷害減免',(s.red*100).toFixed(0)+'%']];
  return `<section class="ui-character-head"><span class="ui-eyebrow">${CHARS[G.char].n}</span><h3>${uxEsc(G.heroName||'阿街')}<small>LV. ${G.lvl}</small></h3><p id="ui-char-progress">深度 ${G.depth} · 累計擊殺 ${tFmt(G.totalKills)}</p><button class="mb" onclick="openModal('dress')">角色與裝扮 ↗</button></section><div class="ui-equipment">${Object.keys(SLOTN).map(slotHtml).join('')}</div>${uiCoreCollection()}<section class="ui-section"><h3>戰鬥狀態</h3><dl class="ui-stat-list">${rows.map(([n,v])=>`<div><dt>${n}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="uxmeta">一般裝備自動比較。穿上傳奇後會保留核心，可在收藏中換用或還原。</p></section>${charHtml()}${cardsHtml()}<details class="ui-section"><summary>事件紀錄</summary><ol class="log">${G.log.map(l=>`<li>${uxEsc(l.txt)}</li>`).join('')}</ol></details>`;
}
function uiCoreCollection(){
  const ids=Object.keys(LEGEND_BY).filter(id=>G.armory[id]);
  return `<details class="ui-section ui-core-collection"><summary>傳奇核心收藏 ${ids.length}／${Object.keys(LEGEND_BY).length}</summary><p class="uxmeta">不同核心會留下來供你研究；裝備中的核心不會被自動替換。同款只保留一件，未裝備、未鎖定且未腐化的收藏會比較升級，其餘重複品拆成零件。</p>${ids.length?ids.map(id=>{const it=G.armory[id],on=G.equip[it.slot]?.lg===id;return `<article class="ui-core-item"><div class="nm">${xico('legend',id,28)}<b>${uxEsc(it.name)}</b><small>${SLOTN[it.slot]} · 等級 ${it.il}</small></div><p>${uxEsc(LEGEND_BY[id].d)}</p><details><summary>屬性與效果</summary><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul></details><button class="mb" ${on?'disabled':''} onclick="uiEquipCore('${id}')">${on?'已裝備':`換上${uxEsc(it.name)}`}</button></article>`}).join(''):'<p>打到第一件傳奇後，就能在這裡保留及換用它的特殊效果。</p>'}<div class="uxactions">${Object.keys(SLOTN).filter(slot=>G.equipBackup[slot]).map(slot=>`<button class="mb" onclick="uiRestoreEquipment('${slot}')">切回上一件${SLOTN[slot]}</button>`).join('')}</div></details>`;
}
function uiEquipCore(id){ if(equipCore(id)){renderModal();uxAnnounce(`已換上${LEGEND_BY[id].name}，可切回上一件裝備。`);} }
function uiRestoreEquipment(slot){ if(restoreEquipment(slot)){renderModal();uxAnnounce(`已切回上一件${SLOTN[slot]}。`);} }
function uiInventoryHtml(){
  const kind=UI_WORK.inventory;
  const head=uiSegments('inventory',[['active','主動技能'],['support','輔助配件'],['cart','模式卡匣']],'機件庫存分類');
  let content='';
  if(kind==='active')content=`<div class="ui-inventory-grid">${Object.entries(SKILLS).map(([id,K])=>{const unlocked=G.lvl>=K.lvl,used=G.slots.includes(id);return `<button class="gt${held?.key===id?' on':''}" data-focus="active-${id}" ${!unlocked||used?'disabled':''} aria-label="${uxEsc(K.n+'：'+K.d)}" onclick="pzHold('active','${id}')" onpointerdown="pzDown(event,'active','${id}')">${sico(id,26)}<b>${K.n}</b>${shapeIcon('active',id)}<small>${!unlocked?`等級 ${K.lvl} 解鎖`:used?'已放在盤面':K.d}</small></button>`}).join('')}</div>`;
  else if(kind==='support')content=`<div class="ui-inventory-grid">${Object.entries(SUPPS).map(([id,S])=>{const n=G.gems[id]||0,f=gemFree(id);return `<button class="gt${held?.key===id?' on':''}" data-focus="support-${id}" ${f?'':'disabled'} aria-label="${uxEsc(S.n)}，${f}／${n}，${uxEsc(S.d)}" onclick="pzHold('support','${id}')" onpointerdown="pzDown(event,'support','${id}')">${G.newSnap&&n>(G.newSnap.g[id]||0)?'<i class="nw">NEW</i>':''}${gemIco(id,26)}<b>${S.n}</b><em>${f}/${n}</em><small>${S.d}</small>${shapeIcon('support',id)}</button>`}).join('')}</div>`;
  else content=cartsHtml();
  return `<section id="uxinventory" class="ui-inventory" aria-label="機件庫存"><h3>機件庫存</h3>${head}${content}</section>`;
}
function uiResolvedHtml(){
  const resolved=GridLab.resolve(G.board),pieces=new Map(G.board.pieces.map(p=>[p.id,p]));
  const supports=G.board.pieces.filter(p=>p.kind==='support');
  const linked=new Set(resolved.flatMap(r=>r.linked));
  const adjacent=(a,b)=>GridLab.cellsOf(a).some(([x,y])=>GridLab.cellsOf(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
  const unused=supports.filter(p=>!linked.has(p.id));
  return `<section class="ui-section ui-resolved" aria-label="目前生效技能"><h3>目前生效</h3>${resolved.length?resolved.map(r=>{const s=G.st.sk[r.key];return `<article><div>${sico(r.key,24)}<b>${SKILLS[r.key].n}</b><span>${s?`冷卻 ${s.cd.toFixed(1)} 秒`:''}</span></div><p>${r.linked.length?r.linked.map(id=>SUPPS[pieces.get(id).key].n).join('、'):'尚未連接輔助配件'}</p>${s?.mode?`<p>模式：${MODES[s.mode].n}</p>`:''}</article>`}).join(''):'<p>盤面沒有主動技能，放置一個即可開始構築。</p>'}${unused.length?`<details><summary>未生效配件 ${unused.length} 件</summary><ul>${unused.map(p=>`<li><b>${SUPPS[p.key].n}</b>：${G.board.pieces.some(a=>a.kind==='active'&&adjacent(a,p))?'相鄰技能的標籤不符':'未與主動技能相鄰'}</li>`).join('')}</ul></details>`:''}<p class="uxmeta">DPS 為構築估算；實戰測量可前往冒險的訓練場。</p></section>`;
}
function uiRevealSelection(){requestAnimationFrame(()=>{const el=document.querySelector('.uxinspect');if(el){el.scrollIntoView({block:'start'});el.querySelector('.uxboard-link,button')?.focus({preventScroll:true});}});}
function uiApplyLayout(initial=false){
  const desktop=innerWidth>=1180,wasDesktop=DESK();
  document.body.classList.toggle('d',desktop);document.body.classList.toggle('m',!desktop);
  if(!initial&&desktop===wasDesktop)return;
  if(!initial){uiTitle();return;}
  $('modal').hidden=false;modalTab=desktop?'skills':'char';renderModal(true);
}
function uiInitLayout(){
  const st=document.createElement('style');st.id='layoutstyles';st.textContent=UI_LAYOUT_CSS;document.head.appendChild(st);
  const menu=document.createElement('div');menu.id='mmenu';menu.hidden=true;
  // 指令仍使用引擎原有的事件處理，不建立另一套設定狀態。
  $('mbody').appendChild(menu);
  const b=$('btns');if(b){menu.appendChild(b);b.querySelectorAll('.act').forEach(x=>{if(['技能','天賦盤','地圖','存檔'].includes(x.textContent.trim()))(x.closest('.stepwrap')||x).style.display='none';});}
  const settings=document.createElement('div');settings.id='uisettings';settings.hidden=true;settings.innerHTML='<section class="ui-settings-intro"><h3>戰鬥與音效</h3><p>調整自動戰鬥、拾取及音效，或使用裝備重鑄。</p></section>';settings.appendChild(menu);document.querySelector('#modal > .mbox').appendChild(settings);
  uiApplyLayout(true);let frame;
  addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>uiApplyLayout());});
}
const UI_LAYOUT_CSS=`
body.d{grid-template-columns:minmax(0,1fr) clamp(440px,34vw,520px)!important;grid-template-areas:"hd rt" "st rt"!important;grid-template-rows:48px minmax(0,1fr);height:100dvh;max-width:1920px;overflow:hidden;padding:16px 18px 34px!important;gap:12px 16px}
body.d>.rpg,body.m>.rpg{display:none!important}body.d>header{grid-area:hd;align-self:center;margin:0;padding:0 8px}body.d>header h1 .wm{width:194px!important}body.d .stage{grid-area:st;min-width:0;align-self:start;position:relative;margin:0;padding-bottom:40px}body.d #fig{width:100%;margin:0}
body.d #modal{grid-area:rt;position:relative;inset:auto;width:100%;height:100%;min-height:0;top:0;align-self:stretch}body.d #modal>.mbox{padding:0!important;display:flex;flex-direction:column;overflow:hidden;height:100%;background:var(--ux-screen)!important}body.d #modal>.mbox::before{display:none}
body.d #mtabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;flex:none;margin:0;padding:7px;border-bottom:1px solid var(--ux-edge)}
body.d #mtabs .tab{min-width:0;min-height:56px;display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;padding:5px 2px!important;font:13px system-ui,sans-serif;position:relative;border-radius:7px!important;background:transparent!important;border:1px solid transparent!important;box-shadow:none!important;text-shadow:none}
body.d #mtabs .tab.on{background:var(--ux-blue)!important;color:#fff!important;border-color:#2446a1!important;box-shadow:inset 0 1px 0 #ffffff66,0 2px 0 #203f87!important}
#mtabs .rd{position:absolute;right:7px;top:5px}#mtabs .lock{opacity:.6}
#mttl{flex:none;display:flex;align-items:center;gap:8px;min-height:52px;padding:6px 12px;background:var(--ux-blue);color:#fff;border-bottom:1px solid #244691}
#mttl h2{margin:0;flex:1;font:18px/1.3 "Cubic 11",system-ui,sans-serif;letter-spacing:.02em}#mttl button{min-width:44px;min-height:40px;padding:4px;border-radius:7px;border:1px solid #a9bce2;background:#edf3ff;color:var(--ux-ink);font:16px system-ui,sans-serif;box-shadow:inset 0 1px 0 #fff}
body.d #mbody,body.m #mbody{flex:1;min-height:0;overflow:auto;padding:12px;scroll-padding:12px;overscroll-behavior:contain;background:var(--ux-screen)}
body.d #uisettings,body.m #uisettings{flex:1;min-height:0;overflow:auto;padding:12px}#uisettings #mmenu,#uisettings #btns{position:static;max-width:none}#uisettings .actions{display:flex;gap:10px;flex-wrap:wrap}#uisettings .act{min-height:44px}
body.m #modal{min-height:0}body.m #mttl{min-height:44px;padding:4px 8px 4px 12px}body.m #mttl h2{font-size:16px}body.m #mttl button{width:44px;height:40px}body.m .stage{padding-bottom:38px}body.m #nexthint,body.d #nexthint{position:absolute;left:8px;bottom:4px;top:auto;transform:none;max-width:calc(100% - 16px);width:auto;min-height:30px;padding:4px 12px;border:1px solid var(--ux-edge);border-radius:6px;background:#eff5ff;font:12px/1.4 system-ui,sans-serif;color:var(--ux-ink);box-shadow:inset 0 1px 0 #fff}
body.d .stats{position:absolute;left:8px;right:8px;top:4px;margin:0;max-width:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-height:50px;padding:6px 12px!important;background:#f4f8ffe8}body.d .stats::before{display:none}body.d .stat .v{font-size:20px!important}body.d .stat .k{font-size:11px}
.ui-section,.ui-menu-group{margin:12px 0;padding:12px;border:1px solid #bac9e4;border-radius:9px;background:#fff}.ui-section h3,.ui-menu-group h3,.ui-inventory h3{font:15px/1.4 "Cubic 11",system-ui,sans-serif;margin:0 0 10px;color:var(--ux-ink)}
#mbody{font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}#mbody p{overflow-wrap:anywhere}#mbody .mc,#mbody .rc{box-shadow:none!important;border:1px solid #bdcae3!important;background:#f3f7ff!important;outline:none;padding:12px;border-radius:9px!important}#mbody .rh{background:none!important;box-shadow:none!important;color:var(--ux-muted);font:12px/1.4 system-ui,sans-serif;letter-spacing:0}
#mbody .mb,#mbody .pzbar button{min-height:44px;box-shadow:inset 0 1px 0 #fff,0 2px 0 #8396c0!important;border-radius:7px!important;font:13px/1.4 system-ui,sans-serif;letter-spacing:0}#mbody .mb.pri{box-shadow:inset 0 1px 0 #ffd9ce,0 2px 0 #a43b2d!important}
.ui-character-head{padding:16px;background:transparent}.ui-eyebrow{font-size:12px;color:var(--ux-muted)}.ui-character-head h3{display:flex;align-items:baseline;gap:12px;font:24px "Cubic 11",system-ui,sans-serif;margin:5px 0}.ui-character-head small{font:13px system-ui,sans-serif;color:var(--ux-muted)}.ui-character-head p{font-size:13px;margin:7px 0 12px}.ui-equipment{display:grid;grid-template-columns:1fr;gap:8px;margin:12px 0}.ui-equipment .nm{gap:12px}.ui-equipment .rc ul{font-size:13px;line-height:1.6}.ui-stat-list{margin:0}.ui-stat-list>div{display:flex;gap:12px;justify-content:space-between;border-bottom:1px solid #e2e9f5;padding:7px 0}.ui-stat-list dd{margin:0;font-variant-numeric:tabular-nums;font-weight:650}
.ui-segments{display:flex;gap:4px;padding:4px;margin:10px 0;background:#e4ecfa;border:1px solid #b7c7e6;border-radius:8px}.ui-segments>button{flex:1;min-width:0;min-height:40px;border:1px solid transparent;border-radius:5px;background:transparent;color:var(--ux-muted);font:13px system-ui,sans-serif;padding:5px}.ui-segments>button[aria-pressed="true"]{color:var(--ux-ink);background:#fff;border-color:var(--ux-edge);box-shadow:0 1px 2px #31467c20}
.ui-inventory{margin:16px 0}.ui-inventory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#mbody .gt{min-width:0;min-height:80px;border-radius:7px!important;padding:9px!important;position:relative;border-color:#aabbdc!important;box-shadow:none!important;font:13px/1.4 system-ui,sans-serif}#mbody .gt small{font:12px/1.5 system-ui,sans-serif}#mbody .gt .shp{grid-column:2/4;justify-self:start;margin-top:5px}.ui-inventory .skrow{grid-template-columns:1fr 1fr}.ui-inventory .gems{grid-template-columns:1fr}#mbody .gt[disabled]{opacity:1;filter:grayscale(.45);color:#64728e;background:#eaf0fa!important}#mbody .gt.on{outline:2px solid var(--ux-blue)}
#mbody .dpsbar{position:static!important;margin:8px 0;padding:10px;border:1px solid var(--ux-edge);border-radius:8px;background:#eaf1fd}.dpsbar>div:first-child{font:13px system-ui,sans-serif}.dpsbar>div:first-child b{font-size:22px;font-variant-numeric:tabular-nums}.shares{margin-top:6px}.shares span{font:11px system-ui,sans-serif!important}.uxinspect{scroll-margin-top:12px}.uxinspect .uxeffect{font-weight:600}.uxinspect-head{flex-wrap:wrap}.uxinspect-head>b{flex:1}.uxinspect-head .shp{display:none}.uxinspect-head .uxboard-link{margin:0;min-height:40px}.uxinspect-head .uxquiet{margin:0}.uxgrid-help{margin:10px 0;font-size:12px}#mbody .pz{max-width:336px;margin:12px auto;gap:4px;padding:7px;background:#c4d0e8;border:1px solid #8e9fc6;border-radius:9px}#mbody .pzbar{position:static!important;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;background:none;border:0}#mbody .rz{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:8px 0}.ui-resolved article{padding:10px 0;border-bottom:1px solid #e1e8f4}.ui-resolved article>div{display:flex;align-items:center;gap:8px}.ui-resolved article>div>span:last-child{margin-left:auto;font-size:12px;color:var(--ux-muted)}.ui-resolved article p{font-size:13px;margin:5px 0;color:var(--ux-muted)}.ui-resolved details{margin-top:10px}.ui-resolved summary{min-height:36px;padding:8px 0}
.ui-directory{display:grid;gap:8px}.ui-directory button,.ui-wiki{display:flex;align-items:center;gap:10px;min-height:64px;padding:10px 12px;text-align:left;border:1px solid #b9c8e3;border-radius:7px;background:#f3f7ff;color:var(--ux-ink);font:14px system-ui,sans-serif}.ui-directory button{display:grid;grid-template-columns:1fr auto}.ui-directory button b{font-weight:600}.ui-directory button span{grid-column:1;font-size:12px;color:var(--ux-muted)}.ui-directory i{grid-column:2;grid-row:1/3;font-style:normal}.ui-wiki{width:100%;background:#e6eefa}.ui-wiki span{display:grid;gap:4px}.ui-wiki small{color:var(--ux-muted)}.ui-wiki i{margin-left:auto;font-style:normal}
.ui-craft-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.ui-craft-slots button{min-height:82px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:9px;border:1px solid #b1c1de;border-radius:8px;background:#eaf0fb;color:var(--ux-ink);font:13px system-ui,sans-serif}.ui-craft-slots button[aria-pressed="true"]{border:2px solid var(--ux-blue);background:#fff}.ui-craft-slots small{font-size:11px}.ui-craft-wallet{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0}.ui-craft-wallet strong{font:22px "Cubic 11",system-ui,sans-serif}.ui-craft-detail>ul{list-style:none;padding:0;margin:12px 0}.ui-craft-detail li{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #e0e8f6;padding:6px 0;font-size:13px}.ui-craft-operation{padding:12px;background:#eaf1fb;border-radius:8px;margin:10px 0}.ui-craft-operation h3{font-size:16px;margin:0 0 6px}.ui-craft-operation p{font-size:13px;margin:5px 0}.ui-craft-operation .mb{width:100%;margin-top:10px}.ui-craft-result{margin:12px 0}.ui-rules{margin-top:12px;border-top:1px solid #c7d3e8;padding-top:10px}.ui-rules summary{padding:8px 0}
.ui-map-list{display:grid;gap:12px}.ui-map-card{overflow:hidden;border:1px solid #a9bbdc;border-radius:9px;background:#fff}.ui-map-banner{position:relative;padding:16px;min-height:92px;background:var(--land);color:#15263d;overflow:hidden}.ui-map-banner h3{position:relative;margin:6px 0 0;font:21px "Cubic 11",system-ui,sans-serif;z-index:1}.ui-map-banner span{font:12px system-ui,sans-serif}.ui-map-info{padding:12px}.ui-map-info .rchips{gap:6px;margin:0 0 8px}.ui-map-info details{font-size:13px;margin:10px 0}.ui-map-info summary{min-height:36px;padding:7px 0}.ui-map-info ul{padding-left:18px;line-height:1.7}.ui-map-info .mb.pri{width:100%}.ui-map-state{display:flex;justify-content:space-between;gap:8px;font-size:13px}.ui-progress{height:7px;background:#dce5f4;border-radius:4px;overflow:hidden;margin:8px 0}.ui-progress i{display:block;height:100%;background:var(--ux-blue)}
#mbody .ui-segments>button{background:transparent!important;border:1px solid transparent!important;border-radius:5px!important;box-shadow:none!important;color:var(--ux-muted)!important;text-shadow:none!important;font:13px/1.4 system-ui,sans-serif!important;padding:6px!important}
#mbody .ui-segments>button[aria-pressed="true"]{background:var(--ux-blue)!important;color:#fff!important;border-color:#244691!important;box-shadow:inset 0 1px 0 #ffffff50!important}
#mbody .ui-craft-slots>button{background:#edf3fc!important;border:1px solid var(--ux-edge)!important;border-radius:8px!important;box-shadow:none!important;text-shadow:none!important}
#mbody .ui-craft-slots>button[aria-pressed="true"]{border:2px solid var(--ux-blue)!important;background:#dce8ff!important}
.ui-equipment .rh,.ui-equipment .rh span{color:var(--ux-muted)!important;text-shadow:none!important}
#mbody .mb:disabled{opacity:1!important;background:#dfe7f4!important;color:#53617b!important;border-color:#acb9d0!important;box-shadow:none!important;text-shadow:none!important}
#mbody .ui-directory button,#mbody .ui-wiki{background:#f3f7ff!important;border:1px solid #b9c8e3!important;border-radius:7px!important;box-shadow:none!important;text-shadow:none!important}
.ui-build{padding:8px 10px;border:1px solid #bccbe6;border-radius:8px;background:#edf3ff}.ui-build>div{display:flex;align-items:center;gap:7px}.ui-build b{margin-right:4px;font:13px system-ui,sans-serif}.ui-build .mb{min-width:44px}.ui-build p{margin:5px 0 0}#mbody .ui-build .mb[aria-pressed="true"]{background:var(--ux-blue)!important;color:#fff!important;box-shadow:inset 0 1px 0 #ffffff66,0 2px 0 #244691!important;text-shadow:none!important}
.ui-settings-intro h3{font:18px "Cubic 11",system-ui,sans-serif;margin:4px 0 8px}.ui-settings-intro p{font:13px/1.5 system-ui,sans-serif;color:var(--ux-muted);margin:0 0 16px}body #uisettings #mmenu{padding:0}body #uisettings #btns{display:grid!important;grid-template-columns:1fr!important;align-items:stretch;gap:10px!important;margin:0;width:100%}#uisettings .stepwrap{display:block;width:100%}#uisettings .act{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;min-height:48px;padding:10px 14px!important;background:#edf3ff!important;border:1px solid #a7badc!important;border-radius:8px!important;box-shadow:inset 0 1px 0 #fff!important;font:14px system-ui,sans-serif;text-shadow:none!important}#uisettings .chips{position:static;width:100%;margin:7px 0 12px;padding:8px;max-width:none;box-sizing:border-box;background:#e0eaf9;border:1px solid #b6c6e1;border-radius:8px;gap:6px;flex-wrap:wrap}#uisettings .chip{min-height:40px;padding:6px 10px!important;border-radius:6px!important;font:13px system-ui,sans-serif!important;box-shadow:none!important}#uisettings .chip.current{background:var(--ux-blue)!important;color:#fff!important;text-shadow:none!important}
.ui-map-banner h3,.ui-map-banner>span{background:#ffffffdd;padding:3px 7px;border-radius:4px;width:fit-content}.ui-map-banner>span{display:inline-block}
@media(max-width:1179px){body.m #mbody{padding:10px}#mbody .pz{max-width:300px}.ui-segments>button{min-height:44px}body.m .ui-inventory-grid{gap:7px}}
@media(min-width:560px) and (max-width:1179px){body.m #mbody{padding:14px 24px}.ui-inventory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.ui-equipment{grid-template-columns:repeat(3,minmax(0,1fr))}.ui-character-head,.ui-menu-group,.ui-wiki{max-width:900px;margin-left:auto;margin-right:auto}}
@media(max-height:500px){body.m .stats{top:0}body.m #mttl{min-height:40px}body.m .stage{padding-bottom:30px}body.m #fig{max-height:110px}body.m #mbody{padding:8px}body.m #mtabs{height:48px}body.m{padding-bottom:calc(48px + env(safe-area-inset-bottom))!important}}
`;
function uiAdventureHtml(){
  const R=G.run,mode=UI_WORK.adventure;
  const nav=uiSegments('adventure',[['maps','地圖'],['tower','無限之塔'],['training','訓練場']],'冒險分類');
  const current=R?`<section class="ui-section"><div class="ui-map-state"><b>${R.tower?'無限之塔 第 '+R.floor+' 層':BIOMES[R.map.biome].n}</b><span>進行中</span></div><div class="ui-progress" role="progressbar" aria-label="地圖擊殺進度" aria-valuemin="0" aria-valuemax="${R.need}" aria-valuenow="${Math.min(R.kills,R.need)}"><i style="width:${Math.min(100,R.kills/R.need*100)}%"></i></div><p id="ui-run-count" class="uxmeta">擊殺 ${Math.min(R.kills,R.need)}／${R.need}</p>${runMods(R)}<button class="mb" onclick="uiLeaveMap()">離開目前挑戰</button></section>`:`<section class="ui-section"><div class="ui-map-state"><b>一般冒險</b><span>深度 ${G.depth}</span></div><p id="ui-normal-count" class="uxmeta">擊殺 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'，持續推進並挑戰守關者':'，目前原地刷怪'}</p></section>`;
  if(mode==='tower')return current+nav+`<section class="ui-section"><h3>無限之塔</h3><p>最高紀錄 ${G.towerBest||0} 層</p><p class="uxmeta">${G.maxDepth<8?'深度 8 解鎖':'逐層挑戰更強的守關者。'}</p><button class="mb pri" ${R||G.maxDepth<8?'disabled':''} onclick="towerStart()">挑戰無限之塔</button>${R?'<p class="uxmeta">請先完成或離開目前挑戰。</p>':''}</section>`;
  if(mode==='training'){
    const L=G.trainLast,mx=L?.rows.length?L.rows[0][1]:1;
    return current+nav+`<section class="ui-section"><h3>訓練場</h3><p>5 隻不還手的假人，測量 30 秒實際傷害。</p>${G.train?`<p id="ui-train-time">測量中，剩 ${Math.ceil(G.train.t)} 秒</p><button class="mb" onclick="trainEnd(true)">取消測量</button>`:`<button class="mb pri" ${R?'disabled':''} onclick="trainStart()">開始測量</button>`}${L?`<p>上次結果：每秒約 <b>${tFmt(L.dps)}</b>（5 隻合計）</p>${L.rows.map(([k,v])=>`<div class="gl"><b>${uxEsc(k)}</b><i style="--p:${Math.round(v/mx*100)}%"></i><em>${L.total?Math.round(v/L.total*100):0}%　${tFmt(v/30)}／秒</em></div>`).join('')}`:'<p class="uxmeta">完成一次測量後，會在這裡保留技能傷害分布。</p>'}</section>`;
  }
  return current+nav+`<div class="ui-map-state"><h3>可用地圖</h3><span class="uxmeta">${G.maps.length}／15 張</span></div><div class="ui-map-list">${G.maps.length?G.maps.map(m=>{const biome=BIOMES[m.biome],q=m.mods.reduce((sum,k)=>sum+(MODS[k]?.q||0),0);return `<article class="ui-map-card"><div class="ui-map-banner" style="--land:${biome.board.l};--land2:${biome.board.m}"><span>LV. ${m.lvl} · ${R?'挑戰中，暫不可進入':'可進入'}</span><h3>${biome.n}</h3></div><div class="ui-map-info"><div class="rchips"><span class="chip bad">挑戰詞綴 ${mapChallenge(m.mods)}</span><span class="chip ok">戰利品 +${Math.round(q*100)}%</span></div><details><summary>查看詞綴與獎勵</summary><ul>${m.mods.length?m.mods.map(k=>`<li><b>${mapKind(k)}</b> · ${MODS[k].n}</li>`).join(''):'<li>沒有額外詞綴</li>'}</ul>${m.mods.includes('rich')?'<p>金幣 +60%</p>':''}${m.mods.includes('lucky')?'<p>稀有度提升</p>':''}</details><button class="mb pri" ${R?'disabled':''} onclick="enterMap('${m.id}')">進入 · 消耗這張地圖</button></div></article>`}).join(''):'<section class="ui-section"><h3>還沒有地圖</h3><p>繼續一般冒險，打贏守關者便有機會取得地圖。</p></section>'}</div>`;
}
function uiLeaveMap(){
  if(!G.run)return;
  showOverlay(`<h2 class="uxdialog-title">離開目前挑戰？</h2><p>目前的進度會結束，已消耗的地圖不會退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續挑戰</button><button class="mb pri" onclick="hideOverlay();abandonMap()">離開挑戰</button></div>`);
}

let UI_LIVE_SIGNATURE='';
function uiLiveSignature(){
  if(modalTab==='skills')return JSON.stringify([G.lvl,G.board,G.gems,G.carts,G.seen,G.st.dps]);
  if(modalTab==='char')return JSON.stringify([G.lvl,G.equip,G.armory,G.equipBackup,G.char,G.heroName,G.cards,G.picks,G.relicPicks]);
  if(modalTab==='craft')return JSON.stringify([G.parts,G.equip]);
  if(modalTab==='maps')return JSON.stringify([G.maps,G.run?.map.id,G.run?.floor,G.towerBest,!!G.train,G.trainLast,G.maxDepth]);
  return modalTab;
}
function uiRefreshLive(){
  if(G.offline||document.body.classList.contains('watch-mode'))return;
  if(!$('modal')||$('modal').hidden)return;
  const signature=uiLiveSignature();
  if(signature!==UI_LIVE_SIGNATURE&&!drag&&!UX_LAYERS.length&&!document.querySelector('#mbody input:focus,#mbody textarea:focus'))renderModal();
  const progress=$('ui-char-progress'),text=`深度 ${G.depth} · 累計擊殺 ${tFmt(G.totalKills)}`;
  if(progress&&progress.textContent!==text)progress.textContent=text;
  const R=G.run,count=$('ui-run-count'),bar=document.querySelector('[aria-label="地圖擊殺進度"]');
  if(R&&count){count.textContent=`擊殺 ${Math.min(R.kills,R.need)}／${R.need}`;if(bar){bar.setAttribute('aria-valuenow',Math.min(R.kills,R.need));bar.querySelector('i').style.width=Math.min(100,R.kills/R.need*100)+'%';}}
  const normal=$('ui-normal-count');if(normal&&!R)normal.textContent=`擊殺 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'，持續推進並挑戰守關者':'，目前原地刷怪'}`;
  const timer=$('ui-train-time');if(timer&&G.train)timer.textContent=`測量中，剩 ${Math.ceil(G.train.t)} 秒`;
}

let UI_RESPEC=null;
function uiRespec(){
  const cost=100*G.lvl;if(!G.pass.length||G.gold<cost)return;
  UI_RESPEC={lvl:G.lvl,pass:JSON.stringify(G.pass),cost};
  showOverlay(`<h2 class="uxdialog-title">重置目前構築的天賦？</h2><p>消耗 ${cost} 金幣，清除目前配置，點數可重新分配。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="UI_RESPEC=null;hideOverlay()">保留天賦</button><button class="mb pri" onclick="uiConfirmRespec()">重置天賦</button></div>`);
}
function uiConfirmRespec(){
  const pending=UI_RESPEC;UI_RESPEC=null;hideOverlay();if(!pending)return;
  if(G.lvl!==pending.lvl||JSON.stringify(G.pass)!==pending.pass||G.gold<pending.cost){uxAnnounce('天賦或金幣已變動，請重新確認。');return;}
  respec();uxAnnounce(`已重置天賦，消耗 ${pending.cost} 金幣。`);
}

;
/* 戰場讀數、像素圖集及全視窗觀戰。只保存本機呈現偏好，不改遊戲存檔。 */
const VIEW_KEY='idle-hero-view-v1', VIEW_ATLASES=Object.fromEntries(Object.entries(ART_SHEETS).map(([key,s])=>[key,[s.cols,s.rows]]));
const GAME_VIEW={prefs:{idle:60,pixels:true,glitch:true,uiFx:2},atlases:{},ready:Promise.resolve(),watch:false,last:performance.now(),pointers:new Set(),swallow:new Set(),clickUntil:0,trigger:null,inert:new Map(),scroll:[],tab:null,initialized:false,pulseAt:-1000,pulseTimer:0};
const UI_FX_NAMES=['關閉','輕微','標準','強烈'];
const UI_FX_CSS=`
:root{--ui-fx-cyan:#57efff;--ui-fx-magenta:#ff73be}
body[data-ui-fx="1"]{--ui-grain:.18}
body[data-ui-fx="2"]{--ui-grain:.28}
body[data-ui-fx="3"]{--ui-grain:.45}
/* 色彩由材質與預先量化圖集提供；文字、捲動區及 HUD 不做整面 SVG 合成。 */
body.ui-pixelfx :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb),body.ui-pixelfx.ui-fx-document main>section{position:relative}
body.ui-pixelfx :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after,body.ui-pixelfx.ui-fx-document header::after{content:"";position:absolute;inset:0;z-index:40;pointer-events:none;opacity:var(--ui-grain);background-image:repeating-linear-gradient(0deg,#13264d40 0 1px,transparent 1px 4px),linear-gradient(90deg,transparent 8%,var(--ui-fx-cyan) 8% 29%,transparent 29% 62%,var(--ui-fx-magenta) 62% 77%,transparent 77%);background-size:100% var(--ui-band-height,40px),100% 2px;background-position:0 var(--ui-band-top,0px),0 -10px;background-repeat:no-repeat;mix-blend-mode:multiply}
body.d #modal>.mbox{--ui-band-top:70px;--ui-band-height:52px}body.m #modal>.mbox{--ui-band-height:44px}#ovl>.mbox{--ui-band-height:26px}
body.pixel-icons .spr,body.pixel-icons .gem{image-rendering:pixelated!important}
body.ui-pixelfx.signal-fx.ui-fx-pulse :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after{animation:ui-signal-burst .32s steps(2,end) 1}
@keyframes ui-signal-burst{0%,100%{background-position:0 var(--ui-band-top,0px),0 -10px}22%{background-position:0 var(--ui-band-top,0px),0 calc(var(--ui-band-top,0px) + 8px)}48%{background-position:0 var(--ui-band-top,0px),0 calc(var(--ui-band-top,0px) + 28px)}75%{background-position:0 var(--ui-band-top,0px),0 calc(var(--ui-band-top,0px) + 18px)}}
.view-fx-control{margin:12px 0 16px}.view-fx-control>div:first-child{display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:700}.view-fx-control output{color:var(--ux-blue);background:#fff;border:1px solid var(--ux-edge);padding:1px 8px;min-width:52px;text-align:center;font-weight:400}
body #uisettings input#ui-fx-level{display:block;box-sizing:border-box;width:100%;min-width:0;height:44px;margin:0;padding:8px 0;border:0;accent-color:var(--ux-blue);cursor:pointer;touch-action:pan-y}.view-fx-ticks{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--ux-muted)}.view-fx-control p{font-size:12px;line-height:1.6;margin-bottom:0}
@media(prefers-reduced-motion:reduce){body.ui-pixelfx.signal-fx.ui-fx-pulse :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after{animation:none!important}}
@media(forced-colors:active){body.ui-pixelfx :where(#mbody,#mttl,#mtabs,#uisettings,#ovl>.mbox,#wiki .wkt,#wiki .wkn,#wiki .wkcontent,header,.tfoot,#nexthint,#ctxbtn,#loot,.battle-hud,#watch-return>span),body.ui-pixelfx.ui-fx-document :where(nav,main>section,#count,#empty){filter:none!important}body.ui-pixelfx :where(#modal>.mbox,#ovl>.mbox,#wiki>.wkb)::after,body.ui-pixelfx.ui-fx-document :where(header,main>section)::after{display:none}}
`;
function viewFxDefs(){return '';}
function viewFxSnapshot(){
  const level=GAME_VIEW.prefs.uiFx,pixels=GAME_VIEW.prefs.pixels;
  const fontCSS=[...document.querySelectorAll('style')].map(s=>s.textContent).find(css=>css.trim().startsWith('@font-face')&&css.includes('Cubic 11'))||'';
  const vars=pixels?Object.entries(GAME_VIEW.atlases).map(([k,v])=>`--pixel-${k}:url("${v}")`).join(';'):'';
  return {head:`<style>${fontCSS}:root{${vars}}${UI_FX_CSS}${UX_MATERIAL_CSS}</style>`,body:`class="ui-fx-document ui-material${level?' ui-pixelfx':''}${pixels?' pixel-icons':''}" data-ui-fx="${level}"`,defs:viewFxDefs()};
}
function viewFxPulse(){
  const now=performance.now();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){clearTimeout(GAME_VIEW.pulseTimer);document.body.classList.remove('ui-fx-pulse');return;}
  if(!document.body.classList.contains('signal-fx')||document.hidden||GAME_VIEW.watch||now-GAME_VIEW.pulseAt<700)return;
  GAME_VIEW.pulseAt=now;document.body.classList.add('ui-fx-pulse');clearTimeout(GAME_VIEW.pulseTimer);
  GAME_VIEW.pulseTimer=setTimeout(()=>document.body.classList.remove('ui-fx-pulse'),340);
}
function viewSavePrefs(){try{localStorage.setItem(VIEW_KEY,JSON.stringify(GAME_VIEW.prefs));}catch(_){/* 儲存受限時保留本次設定。 */}}
function viewApplyPrefs(){
  const motion=GAME_VIEW.prefs.uiFx>0&&GAME_VIEW.prefs.glitch&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.toggle('signal-fx',motion);
  document.body.classList.toggle('ui-pixelfx',GAME_VIEW.prefs.uiFx>0);document.body.dataset.uiFx=GAME_VIEW.prefs.uiFx;
  if(!motion){clearTimeout(GAME_VIEW.pulseTimer);document.body.classList.remove('ui-fx-pulse');}
  const range=$('ui-fx-level'),name=$('ui-fx-name');if(range){range.value=GAME_VIEW.prefs.uiFx;range.setAttribute('aria-valuetext',UI_FX_NAMES[GAME_VIEW.prefs.uiFx]);}if(name)name.textContent=UI_FX_NAMES[GAME_VIEW.prefs.uiFx];
  document.body.classList.toggle('pixel-icons',GAME_VIEW.prefs.pixels);
  for(const key of Object.keys(VIEW_ATLASES)){
    if(GAME_VIEW.prefs.pixels&&GAME_VIEW.atlases[key])document.documentElement.style.setProperty('--pixel-'+key,`url("${GAME_VIEW.atlases[key]}")`);
    else document.documentElement.style.removeProperty('--pixel-'+key);
  }
  document.querySelectorAll('[data-view-idle]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.viewIdle===GAME_VIEW.prefs.idle)));
  document.querySelectorAll('[data-view-setting]').forEach(b=>{const on=GAME_VIEW.prefs[b.dataset.viewSetting];b.setAttribute('aria-pressed',String(on));b.textContent=b.dataset.viewSetting==='pixels'?(on?'像素圖示':'原始圖示'):(on?'訊號效果：開':'訊號效果：關');});
}
function viewPreparePixels(){
  // 原圖保持不變。以每格 24 邏輯像素取樣，所有尺寸共用同一份圖集。
  return Promise.allSettled(Object.entries(VIEW_ATLASES).map(async([key,[cols,rows]])=>{
    if(!ASSET[key])return;
    const img=new Image();img.src=ASSET[key];await img.decode();
    const canvas=document.createElement('canvas');canvas.width=cols*24;canvas.height=rows*24;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      if(pixels.data[i+3]<32){pixels.data[i+3]=0;continue;}
      for(let c=0;c<3;c++)pixels.data[i+c]=Math.round(pixels.data[i+c]/17)*17;
    }
    ctx.putImageData(pixels,0,0);GAME_VIEW.atlases[key]=canvas.toDataURL('image/png');
  })).then(()=>{viewApplyPrefs();});
}
function viewRenderHUD(){
  if(!GAME_VIEW.hud)return;
  const hp=Math.max(0,Math.round(G.h.hp)),max=Math.max(1,Math.round(G.st.life)),need=Math.max(1,xpNeed(G.lvl)),xp=Math.max(0,Math.floor(G.xp));
  const hpRatio=tClamp(hp/max),xpRatio=tClamp(xp/need),R=G.run;
  const values={level:G.lvl,hp:`${tFmt(hp)} / ${tFmt(max)}`,gold:tFmt(G.gold),dps:tFmt(G.st.dps),progress:`${R?(R.tower?'塔 '+R.floor+' 層':'地圖 '+lvlNow()):'深度 '+lvlNow()} · ${Math.min(R?R.kills:G.kills,R?R.need:G.need)}／${R?R.need:G.need}${G.h.dead>0?' · 復活中':G.bossOut?' · 守關者':''}`};
  for(const [key,value] of Object.entries(values))if(GAME_VIEW.fields[key].textContent!==String(value))GAME_VIEW.fields[key].textContent=value;
  const hpBar=GAME_VIEW.fields.hpbar,xpBar=GAME_VIEW.fields.xpbar;
  const setBar=(el,ratio,now,max)=>{const percent=String(Math.round(ratio*100));if(el.getAttribute('aria-valuenow')!==percent){el.setAttribute('aria-valuenow',percent);el.style.setProperty('--fill',percent+'%');}const text=`${now}／${max}`;if(el.getAttribute('aria-valuetext')!==text)el.setAttribute('aria-valuetext',text);};
  setBar(hpBar,hpRatio,hp,max);setBar(xpBar,xpRatio,xp,need);
  GAME_VIEW.hud.classList.toggle('hud-danger',hpRatio<.3&&G.h.dead<=0);GAME_VIEW.hud.classList.toggle('hud-dead',G.h.dead>0);
}
function viewBlocked(){
  const active=document.activeElement;
  return document.hidden||G.offline||BOSS.on||UX_LAYERS.length>0||!!held||!!drag||GAME_VIEW.pointers.size>0||(!G.deferChoices&&(G.picks>0||G.relicPicks>0))||
    !!active?.closest('input,textarea,select,[contenteditable="true"]')||!!document.querySelector('.stepwrap.open');
}
function viewEnterWatch(){
  if(GAME_VIEW.watch||viewBlocked())return false;
  GAME_VIEW.trigger=uxFocusToken();GAME_VIEW.scroll=[...document.querySelectorAll('#mbody,#uisettings')].map(el=>[el,el.scrollTop]);GAME_VIEW.pageScroll=[scrollX,scrollY];
  GAME_VIEW.watch=true;document.body.classList.add('watch-mode');
  // 與共用 dialog 的 inert 分開持有；開啟 dialog 前一定先離開觀戰。
  for(const el of document.body.children)if(el!==document.querySelector('.stage')&&el.id!=='watch-return'&&!['SCRIPT','STYLE','CANVAS'].includes(el.tagName)&&el.id!=='fxo'&&el.id!=='uxstatus'){
    GAME_VIEW.inert.set(el,el.inert);el.inert=true;
  }
  $('watch-return').hidden=false;$('watch-return').focus({preventScroll:true});viewRenderHUD();
  uxAnnounce('已進入觀戰。點一下或按 Escape 返回操作台。');return true;
}
function viewExitWatch(){
  GAME_VIEW.last=performance.now();if(!GAME_VIEW.watch)return false;
  GAME_VIEW.watch=false;document.body.classList.remove('watch-mode');$('watch-return').hidden=true;
  for(const [el,inert] of GAME_VIEW.inert)el.inert=inert;GAME_VIEW.inert.clear();
  // 布局恢復後才還原捲動與焦點；不重建面板或輸入欄位。
  for(const [el,top] of GAME_VIEW.scroll)el.scrollTop=top;
  if(GAME_VIEW.pageScroll)scrollTo(...GAME_VIEW.pageScroll);uxRestoreFocus(GAME_VIEW.trigger);return true;
}
function viewTick(now=performance.now()){
  if(!GAME_VIEW.initialized)return;
  viewRenderHUD();
  if(viewBlocked()){GAME_VIEW.last=now;if(GAME_VIEW.watch)viewExitWatch();return;}
  if(!GAME_VIEW.watch&&GAME_VIEW.prefs.idle>0&&now-GAME_VIEW.last>=GAME_VIEW.prefs.idle*1000)viewEnterWatch();
  if(GAME_VIEW.tab!==modalTab){GAME_VIEW.tab=modalTab;viewFxPulse();}
}
function viewInit(){
  try{const prefs=JSON.parse(localStorage.getItem(VIEW_KEY));if(prefs){if([0,30,60,120].includes(prefs.idle))GAME_VIEW.prefs.idle=prefs.idle;if([0,1,2,3].includes(prefs.uiFx))GAME_VIEW.prefs.uiFx=prefs.uiFx;for(const k of ['pixels','glitch'])if(typeof prefs[k]==='boolean')GAME_VIEW.prefs[k]=prefs[k];}}catch(_){}
  document.body.insertAdjacentHTML('beforeend',viewFxDefs());
  const style=document.createElement('style');style.id='viewstyles';style.textContent=VIEW_CSS+UI_FX_CSS+UX_MATERIAL_CSS;document.body.classList.add('ui-material');document.head.appendChild(style);
  const hud=$('stats');hud.className='stats battle-hud';hud.setAttribute('role','group');hud.setAttribute('aria-label','戰場狀態');
  hud.innerHTML='<div class="hud-left"><div class="hud-level"><span>LV</span><b data-hud="level"></b></div><div class="hud-vitals"><div class="hud-healthline"><span>HP</span><b data-hud="hp"></b></div><div class="hud-meter hud-hp" data-hud="hpbar" role="progressbar" aria-label="生命" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="hud-meter hud-xp" data-hud="xpbar" role="progressbar" aria-label="經驗" aria-valuemin="0" aria-valuemax="100"><span>XP</span><i></i></div></div><div class="hud-progress" data-hud="progress"></div></div><div class="hud-right"><div><span>G</span><b data-hud="gold"></b></div><div><span>DPS</span><b data-hud="dps"></b></div></div>';
  GAME_VIEW.hud=hud;GAME_VIEW.fields=Object.fromEntries([...hud.querySelectorAll('[data-hud]')].map(el=>[el.dataset.hud,el]));ui.drawStats=viewRenderHUD;
  const back=document.createElement('button');back.id='watch-return';back.type='button';back.hidden=true;back.setAttribute('aria-label','返回操作台');back.innerHTML='<span><i aria-hidden="true"></i>觀戰中 · 點一下返回<span class="watch-key"> ／ Esc</span></span>';back.onclick=()=>viewExitWatch();document.body.appendChild(back);
  const settings=document.createElement('section');settings.className='view-settings';settings.setAttribute('aria-label','畫面與觀戰');settings.innerHTML='<h3>畫面與觀戰</h3><p>像素質感套用整個操作介面，搭配低面數場景；動態訊號可獨立關閉。</p><div class="view-options" role="group" aria-label="圖示與動態效果"><button type="button" data-view-setting="pixels"></button><button type="button" data-view-setting="glitch"></button></div><h4>無操作後自動觀戰</h4><div class="view-options" role="group" aria-label="自動觀戰等待時間">'+[[0,'關閉'],[30,'30 秒'],[60,'60 秒'],[120,'2 分鐘']].map(([s,t])=>`<button type="button" data-view-idle="${s}">${t}</button>`).join('')+'</div><p>觀戰填滿遊戲視窗。點一下或按 Esc 返回；編輯、拖曳及選擇獎勵時不自動切換。系統啟用減少動態效果時，訊號動畫會停用。</p><button type="button" id="watch-now">立即觀戰 ↗</button>';
  $('uisettings').prepend(settings);
  const control=document.createElement('div');control.className='view-fx-control';control.innerHTML='<div><label for="ui-fx-level">介面像素質感</label><output for="ui-fx-level" id="ui-fx-name"></output></div><input id="ui-fx-level" type="range" min="0" max="3" step="1" aria-describedby="ui-fx-help"><div class="view-fx-ticks" aria-hidden="true"><span>關閉</span><span>輕微</span><span>標準</span><span>強烈</span></div><p id="ui-fx-help">調整整體色階與外殼訊號質感。內容區保持乾淨，方便閱讀。</p>';
  settings.querySelector('.view-options').before(control);
  control.addEventListener('input',()=>{GAME_VIEW.prefs.uiFx=+$('ui-fx-level').value;GAME_VIEW.last=performance.now();viewSavePrefs();viewApplyPrefs();viewFxPulse();});
  settings.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='watch-now'){if(!viewEnterWatch())uxAnnounce('請先完成目前的輸入、機件放置或選擇，再開始觀戰。');return;}if(b.dataset.viewSetting)GAME_VIEW.prefs[b.dataset.viewSetting]=!GAME_VIEW.prefs[b.dataset.viewSetting];else if(b.dataset.viewIdle!==undefined)GAME_VIEW.prefs.idle=+b.dataset.viewIdle;GAME_VIEW.last=performance.now();viewSavePrefs();viewApplyPrefs();});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',viewApplyPrefs);
  // capture 在世界及盤面輸入之前執行。首次點擊的 down/up/click 都被消耗。
  const eat=e=>{e.preventDefault();e.stopImmediatePropagation();};
  addEventListener('pointerdown',e=>{
    if(GAME_VIEW.watch){GAME_VIEW.swallow.add(e.pointerId);GAME_VIEW.clickUntil=performance.now()+1500;viewExitWatch();eat(e);return;}
    GAME_VIEW.clickUntil=0;GAME_VIEW.pointers.add(e.pointerId);GAME_VIEW.last=performance.now();
  },true);
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{
    GAME_VIEW.pointers.delete(e.pointerId);GAME_VIEW.last=performance.now();
    if(GAME_VIEW.swallow.delete(e.pointerId)){GAME_VIEW.clickUntil=performance.now()+(type==='pointerup'?600:0);eat(e);}
  },true);
  addEventListener('click',e=>{if(GAME_VIEW.clickUntil>performance.now()){GAME_VIEW.clickUntil=0;eat(e);return;}if(GAME_VIEW.watch){viewExitWatch();eat(e);return;}if(e.target.closest('button:not([disabled])'))viewFxPulse();},true);
  addEventListener('keydown',e=>{if(GAME_VIEW.watch&&!['Shift','Control','Alt','Meta'].includes(e.key)){viewExitWatch();eat(e);}GAME_VIEW.last=performance.now();},true);
  addEventListener('pointermove',()=>{if(!GAME_VIEW.watch)GAME_VIEW.last=performance.now();},{passive:true});
  addEventListener('wheel',e=>{if(GAME_VIEW.watch){viewExitWatch();eat(e);}GAME_VIEW.last=performance.now();},{capture:true,passive:false});
  addEventListener('blur',()=>{GAME_VIEW.pointers.clear();GAME_VIEW.swallow.clear();GAME_VIEW.clickUntil=0;GAME_VIEW.last=performance.now();});
  document.addEventListener('visibilitychange',()=>{GAME_VIEW.pointers.clear();GAME_VIEW.last=performance.now();});
  GAME_VIEW.initialized=true;GAME_VIEW.last=performance.now();viewApplyPrefs();viewRenderHUD();GAME_VIEW.ready=viewPreparePixels();
}
const VIEW_CSS=`
/* 覆蓋原先 STATUS 櫃體。HUD 是世界上方的獨立讀數；共用色階不改變字形與位置。 */
.stage #stats.battle-hud{position:absolute!important;inset:8px 8px auto!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;pointer-events:none;z-index:6;color:#f6f9ff;font-family:"Cubic 11",monospace;text-align:left;text-shadow:1px 1px #151c38,-1px 0 #151c38,0 -1px #151c38;line-height:1.1}
.stage #stats.battle-hud::before,.stage #stats.battle-hud::after{display:none!important}
.battle-hud .hud-left{display:grid;grid-template-columns:48px minmax(90px,240px);gap:5px 8px;flex:1;min-width:0;max-width:296px}.battle-hud .hud-level{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1px;min-width:0;height:51px;border:2px solid #17203b;background:#192749e8;box-shadow:inset 2px 2px #536b9e,inset -2px -2px #0d152e,2px 2px #ffffff80}.hud-level span{font-size:12px;letter-spacing:.12em;color:#c3d2f4}.hud-level b{font-size:25px;color:#ffe68f;font-weight:400}
.battle-hud .hud-vitals{min-width:0}.hud-healthline{display:flex;justify-content:space-between;gap:4px;margin-bottom:3px;font-size:13px}.hud-healthline>span{color:#fff0f2}.hud-healthline>b{font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap}
.hud-meter{--fill:0%;position:relative;height:17px;box-sizing:border-box;border:2px solid #17203b;background:#18233de8;box-shadow:1px 1px #ffffff90,inset 0 1px #030b23;overflow:hidden}.hud-meter>i{display:block;width:var(--fill);height:100%;background:#eb526a;box-shadow:inset 0 2px #ffb5c7,inset 0 -2px #a22e58}.hud-meter.hud-xp{height:11px;margin-top:5px}.hud-xp>i{background:#efce68;box-shadow:inset 0 1px #fff3bf,inset 0 -1px #a38c3b}.hud-xp>span{position:absolute;left:3px;top:-1px;color:#fff7d7;font-size:8px;line-height:9px;text-shadow:1px 1px #17203b;z-index:1}
.hud-progress{grid-column:1/-1;justify-self:start;font-size:12px;color:#f1f6ff;white-space:nowrap;padding:2px 4px;background:#192749dc;text-shadow:1px 1px #151c38}.battle-hud .hud-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:80px;padding-top:1px}.hud-right>div{display:flex;justify-content:flex-end;align-items:baseline;gap:6px;white-space:nowrap;padding:2px 5px;background:#192749dc;text-shadow:1px 1px #151c38}.hud-right span{color:#d6e4ff;font-size:13px}.hud-right>div:first-child span{color:#ffe68f}.hud-right b{font-size:24px;font-weight:400;font-variant-numeric:tabular-nums}.battle-hud.hud-danger .hud-hp{outline:2px solid #ffcfdd}.battle-hud.hud-danger .hud-healthline>span{color:#ffd3df}.battle-hud.hud-dead .hud-hp{opacity:.6}
body.m .stage{padding-top:68px!important}body.m .stage #loot{top:76px!important}
.view-settings{padding:12px;margin-bottom:16px;border:1px solid var(--ux-edge);border-radius:4px;background:#edf3ff;color:var(--ux-ink);font:14px/1.55 system-ui,sans-serif}.view-settings h3{margin:0 0 6px;font:18px "Cubic 11",system-ui,sans-serif}.view-settings h4{margin:14px 0 6px;font-size:14px}.view-settings p{color:var(--ux-muted);margin:6px 0 10px}.view-options{display:flex;flex-wrap:wrap;gap:7px}.view-settings button{min-height:44px;padding:7px 12px;border:1px solid var(--ux-edge);border-radius:3px;background:#fff;color:var(--ux-ink);font:14px system-ui,sans-serif;box-shadow:0 2px #a9b9dd}body .view-settings button[aria-pressed="true"]{background:var(--ux-blue)!important;border-color:#2446a1!important;color:#fff!important;box-shadow:inset 0 1px #ffffff66,0 2px #203f87!important}body .view-settings #watch-now{margin-top:5px;background:#192749!important;color:#fff!important}.view-settings button:focus-visible,#watch-return:focus-visible{outline:3px solid #f5b851;outline-offset:3px}
body.watch-mode{display:block!important;position:relative!important;width:100%!important;height:100dvh!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
body.watch-mode>header,body.watch-mode>#modal,body.watch-mode>#readout,body.watch-mode>.rpg,body.watch-mode>.tfoot,body.watch-mode>footer,body.watch-mode::after{display:none!important}
body.watch-mode .stage{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important;margin:0!important;padding:0!important;min-height:0!important}
body.watch-mode #fig{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important}
body.watch-mode .stage #nexthint,body.watch-mode .stage #ctxbtn,body.watch-mode .stage #modtxt,body.watch-mode .stage #loot,body.watch-mode .stage .dlg{display:none!important}
body.watch-mode .stage #stats.battle-hud{inset:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) auto max(16px,env(safe-area-inset-left))!important}
#watch-return[hidden]{display:none!important}#watch-return{position:fixed;inset:0;z-index:25;width:100%;height:100%;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;cursor:pointer;touch-action:manipulation;transform:none!important}#watch-return>span{position:absolute;bottom:max(22px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);white-space:nowrap;padding:9px 13px;border:1px solid #a9c5f3;background:#192749e8;color:#f6f9ff;font:13px "Cubic 11",system-ui,sans-serif;box-shadow:2px 2px #17203b}#watch-return i{display:inline-block;width:6px;height:6px;background:#a2e5d0;margin-right:8px;box-shadow:2px 0 #5687a3}#watch-return:focus-visible{outline-offset:-5px}
@media(max-width:480px){.stage #stats.battle-hud{gap:8px!important}.battle-hud .hud-left{grid-template-columns:40px minmax(70px,1fr);gap:5px 6px;max-width:240px}.battle-hud .hud-level{height:48px}.hud-level b{font-size:23px}.hud-healthline{font-size:12px}.battle-hud .hud-right{min-width:65px;gap:8px}.hud-right b{font-size:20px}.hud-right span{font-size:11px}.hud-progress{font-size:11px}.watch-key{display:none}body.watch-mode .stage #stats.battle-hud{inset:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) auto max(10px,env(safe-area-inset-left))!important}}

`;

;
/* ---------- boot ---------- */
const Q = new URLSearchParams(location.search);
G.equip.weapon = makeItem('weapon', 0, 1); G.equip.weapon.name = '新手短劍';
G.equip.armor = makeItem('armor', 0, 1); G.equip.armor.name = '粗布衣';
recalc(); G.h.hp = G.st.life;
let loadedT = 0;
if (!Q.has('fresh')){ const o = loadGame(); if (o && applySave(o)) loadedT = o.t || 0; }
G.speed = 1;   // 已拿掉遊戲速度選項
if (!loadedT) logLine('冒險開始！英雄會自動戰鬥、撿裝備、換更強的。', '#2b2552');

let ui;
const simulate = sec => { G.offline = true; for (let i = 0; i < sec/.05; i++){ while (G.picks > 0){ const c = rollCards(1)[0]; if (!c) break; takeCard(c); } while (G.relicPicks > 0){ const r = rollRelics(1)[0]; if (!r){ G.relicPicks = 0; break; } takeRelic(r); } update(.05); } G.offline = false; G.floats = []; G.fx = []; };
ui = mountFigure({
  fig:'06', title:'Idle Hero', hint:'', size:[BXW, BYW, 36], palette:'mint', state:G, credit:false,
  scene, buttonsLabel:'英雄指令',
  stats: () => [], // HUD 的唯一呈現由 viewRenderHUD 管理。
  buttons:[
    { label:'技能', onClick:() => openModal('skills') },
    { label:'編年史', onClick:() => wikiOpen() },
    { label:'扮工模式 ( ` )', onClick:() => toggleBoss(true) },
    { label:'天賦盤', onClick:() => openModal('tree') },
    { label:'地圖', onClick:() => openModal('maps') },
    { label:'模式', choices: () => [ { label:'推進（打守關者）', current:G.push, onClick:() => { G.push = true; logLine('模式：推進', '#2b2552'); } }, { label:'原地刷怪', current:!G.push, onClick:() => { G.push = false; G.bossOut = false; logLine('模式：原地刷怪', '#2b2552'); } } ] },
    { label:'挑戰守關者', choices: () => [[0, '一律挑戰'], [50, '生命 50% 以上'], [80, '生命 80% 以上']].map(([v, n]) => ({ label:n, current:(G.bossHp || 0) === v, onClick:() => { G.bossHp = v; } })) },
    { label:'戰利品過濾', choices: () => ['全部撿','魔法以上','稀有以上'].map((n, i) => ({ label:n, current:G.filter === i, onClick:() => { G.filter = i; } })) },
    { label:'混沌重鑄', choices: () => Object.keys(SLOTN).map(k => { const it = G.equip[k], cost = it ? 30*it.il + 20 : 0; return { label:`${SLOTN[k]}${it ? ` ${cost}g` : ''}`, disabled:!it || it.r === 3 || G.gold < cost, why:!it ? '這個欄位是空的' : it.r === 3 ? '暗金裝備不能重鑄' : `金幣不夠（要 ${cost}g）`, onClick:() => reroll(k) }; }) },
    { label:'音效', choices: () => [['all', '音樂＋音效'], ['sfx', '只有音效'], ['off', '靜音']].map(([m, n]) => ({ label:n, current:AUD.mode === m, onClick:() => { audInit(); audMode(m); } })) },
    { label:'存檔', onClick:() => openModal('save') },
  ],
  params:(s, q) => {
    if (q.has('char') && CHARS[q.get('char')]){ G.char = q.get('char'); recalc(); }
    if (q.has('lvl')){ G.lvl = +q.get('lvl'); recalc(); }
    if (q.has('depth')){ G.depth = +q.get('depth'); G.maxDepth = Math.max(G.maxDepth, G.depth); }
    if (q.has('speed')) G.speed = +q.get('speed');
    if (q.has('sim')){ simulate(+q.get('sim')); document.documentElement.dataset.sim = JSON.stringify({ lvl:G.lvl, depth:G.depth, gold:Math.round(G.gold), deaths:G.deaths, dps:Math.round(G.st.dps), life:Math.round(G.st.life), maps:G.maps.length, pts:passPoints(), eq:Object.fromEntries(Object.entries(G.equip).map(([k, v]) => [k, v && (v.name + ' r' + v.r + ' il' + v.il)])), gems:G.gems }); }
  },
});
setupPanel();
{ const h = document.querySelector('header h1'); if (h) h.innerHTML = `<img class="wm" src="${ASSET.wordmark}" alt="Idle Hero">`; }
document.documentElement.style.setProperty('--ver', '"v' + VERSION() + '"');
if (Q.has('legend')){ for (const id of Q.get('legend').split(',')){ const L = LEGEND_BY[id]; if (!L) continue; const sl = Object.keys(LEGENDS).find(k => LEGENDS[k].includes(L)); G.equip[sl] = Object.assign(makeItem(sl, 3, 20), { name:L.name, lg:id }); } recalc(); }
if (Q.has('give')){ // testing helpers
  for (const id of Object.keys(SUPPS)) G.gems[id] = 2;
  for (const id of Object.keys(MODES)) G.carts[id] = 1;
  for (let i = 0; i < 3; i++) G.maps.push(makeMap(Math.max(1, G.depth)));
  if (Q.has('slots')){ boardFromLegacy(Q.get('slots').split(',').map(x => x || null), {}); G.slots.forEach(id => { if (id && G.cds[id] == null) G.cds[id] = 0; }); }
  recalc();
}
if (Q.has('pass')) for (const id of Q.get('pass').split(',')) if (TREE[id] && !G.pass.includes(id)) G.pass.push(id);
if (Q.has('run')) enterMap((G.maps[0] || (G.maps.push(makeMap(G.depth)), G.maps[0])).id);
if (Q.has('selftest')){ const c = encodeSave(), o = decodeSave(c); const ok = !!o && o.lvl === G.lvl; const before = JSON.stringify(serialize().equip); applySave(o); document.documentElement.dataset.selftest = JSON.stringify({ ok, same:before === JSON.stringify(serialize().equip), len:c.length }); }
if (Q.has('static')){ G.spawnCd = 1e9; G.paused = true; G.mons = []; }   /* 測試用：?static 沒有怪、不跑模擬，拿來拍主角與武器特寫 */
if (Q.has('mons')){   // testing: ?mons=slime,skel,brute,boss&at=48 lines up frozen monsters (one every 9 units from y = at) for screenshots
  G.spawnCd = 1e9; G.paused = true; G.mons = []; G.drops = []; G.fx = []; G.floats = []; G.proj = []; G.run = null; if (Q.has('d')) G.depth = +Q.get('d');
  Q.get('mons').split(',').forEach((t, i) => G.mons.push({ type:t, boss:t === 'boss', x:15 + (i % 2 ? 4 : -2), y:(+Q.get('at') || 48) - i*9, hp:80, hpMax:100, dmg:1, atkInt:2, spdK:1, atkCd:1, slot:i,
    fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:i*1.7 }));
}
if (Q.has('picks')) G.picks = +Q.get('picks');
if (Q.has('modal')) openModal(Q.get('modal'));
const gap0 = Q.has('away') ? +Q.get('away') : loadedT ? (Date.now() - loadedT)/1000 : 0;
if (gap0 > 20) catchUp(gap0, true);
ui.suspendRender=()=>G.offline||document.hidden;
ui.animate(dt => {
  const now = Date.now(), gap = (now - G.lastWall)/1000; G.lastWall = now;
  if (G.paused) return true;
  if (FXO.stop > 0){ FXO.stop -= dt; dt *= .1; }
  if (G.relicPicks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offerR && $('ovl').hidden))) openRelics();
  else if (G.picks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offer && $('ovl').hidden))) openCards();
  if (gap > 3){ catchUp(gap, gap > 20); return true; }
  stepSim(dt); return true;
});
setInterval(() => { if (!G.paused) saveGame(); }, 5000);
addEventListener('pagehide', () => { if (!G.paused) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.paused) saveGame(); });
document.getElementById('boot')?.remove();

