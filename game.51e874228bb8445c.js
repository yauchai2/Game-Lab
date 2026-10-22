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
  Object.assign(SUPPORTS,{FOCUS:{n:'鎖頻晶片',shape:[[0,0]],needs:[],mod:{dmg:.35,crit:.15,cd:.15}},FORK:{n:'分線器',shape:[[0,0],[0,1]],needs:['proj','melee'],mod:{fork:1}},RECOVER:{n:'備用電池',shape:[[0,0],[1,0]],needs:[],mod:{recover:1}},DELAY:{n:'延遲緩衝',shape:[[0,0],[1,0],[1,1]],needs:[],mod:{dmg:-.15,repeat:1}}});
  const LIMITS = Object.freeze({ cooldownReduction:0.6, repeatDamage:0.6, castTime:0.4 });
  // Shared by the standalone board, runtime stats and combat previews.
  function skillMods(keys, key) {
    const n = id => keys.filter(k => k === id).length;
    return {
      hit:(1 + .35*n('FOCUS'))*(n('DELAY') ? .85 : 1)*(1 + .45*n('HEAVY'))*
        (1 + .08*Math.max(0,Math.min(5,keys.length)-2))*(1 + .2*n('COOL') + .1*n('CRYSTAL'))*
        (n('AREA') && key === 'FIRE' ? .85 : 1),
      crit:15*n('FOCUS') + 30*n('CRITS') + 15*n('CRYSTAL'),
      reduction:30*n('HASTE') + 15*n('COOL'), delay:1 + .15*n('FOCUS'),
      twin:n('TWIN'), area:!!n('AREA'), leech:!!n('LEECH'), repeat:!!n('DELAY'),
    };
  }
  function cooldown(base, keys, haste=0, multiplier=1) {
    const mod = skillMods(keys, '');
    return base*multiplier*mod.delay*(1 - Math.min(LIMITS.cooldownReduction,Math.max(0,haste + mod.reduction)/100));
  }

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
      stat.cd = Math.round((cooldown(ACTIVES[a.key].cd,linked.map(s=>s.key))/ACTIVES[a.key].cd-1)*1e12)/1e12;
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

  // 預期 DPS（單一目標）：每次命中 = 武器傷害 × 技能倍率 × (1 + 傷害加成) × 期望暴擊倍率
  // hero：{ hit 武器傷害, crit 暴擊率 %, cm 暴擊傷害 % }
  function dps(b, hero) {
    return resolve(b).map(r => {
      const d = ACTIVES[r.key], keys=r.linked.map(id=>b.pieces.find(p=>p.id===id).key), mod=skillMods(keys,r.key);
      const crit = Math.min(1, Math.max(0, (hero.crit + mod.crit) / 100));
      const hit = hero.hit * d.mult * mod.hit * (1 + crit * (hero.cm / 100 - 1));
      const interval = cooldown(d.cd, keys, hero.haste || 0);
      const perCast = hit * (1 + mod.twin * LIMITS.repeatDamage + (mod.repeat ? .45 : 0));
      return { id: r.id, key: r.key, hit, interval, dps: perCast / interval };
    });
  }

  const api = { findSpot, dps, LIMITS, skillMods, cooldown, ACTIVES, SUPPORTS, createBoard, shapeOf, cellsOf, canPlace, place, remove, rotate, resolve };
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
  { n:'千禧遊樂場', board:{ l:'#ffd9ee', m:'#ffbfdf', d:'#e08cba' }, t1:'#ff8fc8', t2:'#8fe8ff', portal:'#ff6aa8', glow:'#ffd6ee' },
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
  FROST: { n:'冷氣爆發', lvl:5,  cd:4.2, mult:1.9, el:'cold',  col:'#7fd3ff', tg:1.8, d:'冷風傷害敵人並凍結 1.4 秒；首領需累積控制，凍結後有適應期' },
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
  { v:'0.30.0',d:'2026-10-22',t:['三套構築新增角色及實際裝備記憶，切換自動保存；引用裝備受回收保護，缺件先確認，亦可解除閒置配置的裝備記憶','校準改為只重洗同階數值；新增指定詞綴逐階提升，保留種類及數值，顯示區間、等級門檻及材料成本','重複傳奇核心提供殘晶，可搭配來源區碎片與零件重構物品等級；保留特殊效果與詞綴階級，推進城市提高上限，確認前不消耗材料']},
  { v:'0.29.1',d:'2026-10-22',t:['修正網站打包時的版本識別，確保公開版本檔與遊戲更新日誌一致']},
  {v:'0.29.0',d:'2026-10-22',t:['天賦改為最多 36 點及兩個韌體核心；六種韌體各有條件、收益及代價。舊天賦保留快照，可預覽、免費轉換及還原，末端節點可免費退回','新增三條城市遠征：高速訊號網、回充護盾迴廊及可破除重裝的電源區；三個路段、兩次當局選路及收尾首領，撤離保留已完成路段碎片','區域碎片可指定合成九款傳奇核心；三區憑證開啟城市中樞，勝利保證出發時指定核心，並推進最高八階。途中狀態與出發策略可保存','離線可依出發策略完成當前遠征，失敗不重開；離線暗金掉落資格及守關者保底改與線上相同，並修正獨立拼圖傷害預估的常數引用']},
  { v:'0.28.0',d:'2026-10-22',t:['技能依就緒時間公平出手，新增均衡與連動優先策略；技能模式與冷卻共用計算，單體直傷預估納入出手容量','新增冷啟動碎星、撥號放電卡匣，可用電路點數定向合成；凍結鋪墊衛星爆發，紅外線累積電荷強化雷射','首領凍結改用傷害累積與適應時窗；新增本段出手戰報及單體／群體訓練，追蹤回放、等待與連動成果']},
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
  MAGNET_STICKY:{ sk:'MAGNET', n:'黏性磁鐵', hint:'被吸住的東西動不了。', d:'被吸過來的敵人凍結 2 秒；首領需累積控制並受適應期限制' },
  FLICKER_STORM:{ sk:'FLICKER', n:'閃光風暴', hint:'快門按到停不下來。', d:'一次閃 8 下，每下 50% 傷害，沒有最後一擊加成' },
  FLICKER_REAP: { sk:'FLICKER', n:'收割閃打', hint:'它只對倒下的目標感興趣。', d:'擊殺目標時立刻追加一次閃打，可連續觸發' },
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
  FLICKER:{each:1,count:4,last:1.5},BEAM:{each:1,width:4.5},
};
for(const [id,pattern] of Object.entries({
  FROST_STORM:{echo:.6},CHAIN_FORK:{fork:.5},CHAIN_OVERLOAD:{hops:5,decay:1,cd:1.8},
  METEOR_TWIN:{count:2,each:.6},METEOR_COMET:{primary:2.2,splash:.5},
  PULSE_ECHO:{echo:.6},PULSE_SONIC:{range:38,each:.75},MAGNET_CRUSH:{crush:2},
  FLICKER_STORM:{count:8,each:.5,last:1},FLICKER_TRAIL:{trail:.22},
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
  frost: { n:'小冷', d:'愛吹冷氣。冷氣傷害 +30%，生命回復 +1.5', eff:{ cold:30, regen:1.5 }, sig:{ n:'冷氣護罩', cd:9, d:'每 9 秒冷風吹過全場，凍結小怪 1.4 秒；首領改累積控制並受適應期限制' }, need:6, hair:'#3d7fd0', pants:'#5a6fb0', skin:'#f6d8c8' },
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


/* 千年城市遠征：每區有獨立地標及遭遇表。 */
BIOMES.push(
 {n:'廢訊號站',board:{l:'#b7c9dc',m:'#6f819b',d:'#35425c'},t1:'#9bacc1',t2:'#c0d5e4',portal:'#ff9b54',glow:'#ffb46d'},
 {n:'磁帶海港',board:{l:'#a2d9d4',m:'#559b9e',d:'#36546b'},t1:'#67b5ba',t2:'#b4ded8',portal:'#54e6d2',glow:'#a8fff1'},
 {n:'電路神社',board:{l:'#b8b0d6',m:'#766688',d:'#3a3157'},t1:'#aa819b',t2:'#e0a8c8',portal:'#ff6ca8',glow:'#ffb5d5'},
 {n:'地下機房',board:{l:'#9b9fd2',m:'#565c8b',d:'#242a46'},t1:'#686ea7',t2:'#959cce',portal:'#70e4ff',glow:'#7dfaff'},
 {n:'霓虹高架',board:{l:'#b4becb',m:'#727f94',d:'#363d52'},t1:'#8794a6',t2:'#b4ccde',portal:'#ffd370',glow:'#fff0ac'},
 {n:'廢棄商場',board:{l:'#d1c3d5',m:'#96899f',d:'#51485e'},t1:'#ad9db9',t2:'#d9c0d4',portal:'#8d7bff',glow:'#c0b7ff'}
);
Object.assign(SUPPS,{
 FOCUS:{n:'鎖頻晶片',d:'此技能傷害 +35%、暴擊率 +15%，冷卻 +15%'},
 FORK:{n:'分線器',d:'此技能命中時，對另一個鄰近敵人造成 25% 傷害；每 0.25 秒觸發一次'},
 RECOVER:{n:'備用電池',d:'此技能命中回復 3% 最大生命；每 0.8 秒觸發一次'},
 DELAY:{n:'延遲緩衝',d:'此技能傷害 -15%，0.6 秒後額外重播一次，造成 45% 傷害'}
});

[["#1e2b52","#425c83","#8ca2b5"],["#35668c","#71aaa9","#a3d3cc"],["#291f4b","#725077","#bb88a6"],["#0e1934","#273456","#4b6281"],["#1b2447","#4c507b","#9a84aa"],["#353858","#6f718e","#aaabc0"]].forEach((sky,i)=>BIOMES[i+6].sky=sky);

const MONSTER_GUIDE=[
 ['slime','史萊姆','成群出現的低耐久雜兵'],['skel','骷髏','比史萊姆耐打，會圍向角色'],['brute','蠻牛','又慢又硬，打人很痛'],['drone','無人機','貼著半空飛，速度快但很脆'],['bomb','自爆機器人','死亡時爆炸，波及角色與附近敵人'],
 ['spider','跳線蛛','快速接近的多足拾荒體'],['speaker','失控音箱','重裝音箱，會預警後轟炸落點'],['wisp','訊號幽靈','低耐久的浮游訊號體，移動靈活'],['crab','硬碟蟹','厚重機殼與雙鉗，會預警後重砸落點'],['boss','守關者','依地區改變輪廓，有範圍預警攻擊並掉落高階戰利品']
];

/* 城市路線與韌體是所有角色共用的構築規則。 */
const TALENT_LIMIT=36, FIRMWARE_LIMIT=2;
const FIRMWARE={
 AK:{n:'冷備份',eff:{lifePct:12,armor:35},d:'技能直傷降低 15%；冷啟動消耗凍結時，獲得最大生命 12% 的緩衝盾，持續 4 秒，不疊加'},
 BK:{n:'三頻協定',eff:{crit:-8},d:'同時啟用火、冰、電機件時，技能傷害提高 30%；暴擊率降低 8%'},
 CK:{n:'單頻放大',eff:{apsInc:-15},d:'最多 3 種主動機件時，技能傷害提高 35%；停用整列、整欄及同元素共鳴，攻速降低 15%'},
 DK:{n:'超頻協定',eff:{haste:25,lifePct:-22},d:'技能急速 +25%；最大生命降低 22%'},
 EK:{n:'斷線重播',eff:{apsInc:-20},d:'每次原始施放追加 60% 回放；原始技能傷害降低 15%，攻速降低 20%。回放不產電、不再回放'},
 FK:{n:'電池孤注',eff:{cm:70,lifePct:-25},d:'暴擊傷害 +70%；每格電荷放電加成由 35% 改為 45%，最大生命降低 25%'}
};
const CITY_ROUTES={
 signal:{n:'廢訊號網',biome:6,pool:['drone','wisp','spider'],d:'分散的快速敵人，首領以更短間隔追擊；連鎖、遠距及移動覆蓋較有利',cores:['W_FORK','R_DIAL','R_LINK'],threat:'敵人移速 +30%，分散入場'},
 memory:{n:'磁帶迴廊',biome:7,pool:['crab','speaker','spider'],d:'成群單位帶回充護盾；持續命中阻止回充，聚怪與範圍傷害較有利',cores:['W_ECHO','A_RESET','A_PHOENIX'],threat:'護盾為最大生命 18%，停火 3 秒後回充'},
 power:{n:'地下電源區',biome:9,pool:['speaker','brute','crab'],d:'重裝敵人承受傷害降低 25%；燃燒、電標記或凍結可解除減傷，適合鋪墊後爆發',cores:['W_MULTI','A_RIPOSTE','R_LAST'],threat:'重裝減傷 25%，敵人傷害 +15%'}
};
const CITY_BRANCHES={
 safe:{n:'旁路校準',d:'當局敵人傷害降低 15%，每秒回復最大生命 1%；不增加碎片',reward:0},
 cache:{n:'高壓快取',d:'當局技能傷害 +18%，最大生命降低 12%；完成下一段碎片 +1',reward:1},
 risk:{n:'帶電捷徑',d:'當局敵人傷害 +15%、移速 +12%；完成下一段碎片 +3',reward:3}
};

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
  city:null,legacyMode:false,legacyTalent:null,castPolicy:'balanced', signalCharge:0, readySince:{}, castSerial:0, time:0, lvl:1, xp:0, gold:0, depth:1, maxDepth:1, kills:0, need:60, bossOut:false, push:true, speed:1, filter:0, deaths:0, spawnCd:.5, totalKills:0,
  coreDust:0, inventory:[], nextGearId:1, inventoryRevision:0, autoEquip:true, storageRecycled:0, chips:0, equip:{ weapon:null, armor:null, ring:null }, armory:{}, equipBackup:{}, deferChoices:false, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
  pass:[], autoCard:false, ach:{}, legSeen:{}, pity:0, towerBest:0, quest:0, craftN:0, mk:{}, seenG:{}, seenC:{}, cz:1, userCz:false, dmgNum:1, seenInv:0, seenParts:0, seenGoals:0, builds:[null, null, null], bi:0, bossHp:0, parts:0, cos:{ tstyle:'0', hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, own:{}, heroName:'阿街', born:[new Date().getMonth() + 1, new Date().getDate()], relics:{}, relicPicks:0, offerR:null, sunT:0, bossKills:0, char:'street', cards:{}, picks:0, offer:null, maps:[], run:null, cds:{ FIRE:1.2, FROST:1, CHAIN:1, METEOR:2, PULSE:1, MAGNET:1, SPAM:1, BEAM:1 },
  h:{ x:HX, y:HY, vx:0, vy:0, gx:HX, gy:HY, aiT:0, mv:0, hp:100, swingT:-1, swingHit:true, atkCd:0, castT:-1, castFired:true, castSk:'FIRE', hurtT:0, dead:0, potCd:0 },
  lgK:0, lgC:0, mons:[], drops:[], proj:[], fx:[], floats:[], timers:[], log:[], st:null, dirty:true, offline:false, paused:false, off:null, lastWall:Date.now(),
};
/* 打擊感：畫面震動、縮放衝擊、邊緣閃光；視角旋轉（yaw）也放這裡 */
const FXO = { shake:0, flash:0, fc:'#fff', punch:0, yaw:0, yawT:0, zoom:1, zoomT:1, stop:0 };
function hitStop(t){if(G.offline||G.time-(FXO.stopAt??-10)<.6||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;FXO.stopAt=G.time;FXO.stop=Math.max(FXO.stop,Math.min(.07,t));}
function kick(s,f,c,p){
 if(G.offline||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;
 FXO.shake=Math.max(FXO.shake,Math.min(3,s));
 if(f&&G.time-(FXO.flashAt??-10)>.8){FXO.flash=Math.max(FXO.flash,Math.min(.45,f));FXO.fc=c||'#fff';FXO.flashAt=G.time;}
 if(p)FXO.punch=Math.max(FXO.punch,Math.min(.8,p));
}
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
const passPoints = () => Math.max(0,talentBudget()-G.pass.length);
const nodeOpen = id => !G.pass.includes(id) && id !== 'S' && TREE[id].links.some(l => l === 'S' || G.pass.includes(l));
const biomeNow = () => G.run ? G.run.map.biome : Math.floor((G.depth - 1)/4) % BIOMES.length;
const lvlNow = () => G.run ? G.run.map.lvl : G.depth;
const runQ = () => G.run ? G.run.map.mods.reduce((a, m) => a + MODS[m].q, 0) : 0;

/* ---------- items ---------- */
function rollAff(k, il, boost=1){
  const r=Math.random(),tier=il>=25&&r<.015?0:il>=12&&r<.1?1:il>=5&&r<.35?2:r<.7?3:4;
  const v=AFF[k].b(il)*[1.65,1.35,1.1,.88,.65][tier]*(.9+Math.random()*.2)*boost;
  return {k,v:k==='leech'?Math.round(v*10)/10:Math.max(1,Math.round(v)),tier};
}
function makeItem(slot, rar, il, forcedCore=null){
  const n = rar === 0 ? 0 : rar === 1 ? (Math.random() < .5 ? 1 : 2) : rar === 2 ? (Math.random() < .5 ? 3 : 4) : 4;
  const LG = rar === 3 ? (coreSlot(forcedCore)===slot?LEGEND_BY[forcedCore]:tPick(LEGENDS[slot])) : null, keys = rar === 3 ? LG.aff.slice() : POOL[slot].slice().sort(() => Math.random() - .5).slice(0, n);
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
  if (boss){ if (i < 2) i = 2; if (Math.random() < Math.min(1, .1 + .06*(G.pity || 0) + (G.relics.LUCK ? .03 : 0))) i = 3; }   // 守關者暗金保底：每次沒出就 +6%，最多 15 件必出
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
  if (!slot || !it || G.equip[slot]?.lg === id) return false;
  if(G.equip[slot]&&!G.equip[slot].lg)storeGear(G.equip[slot]);
  G.autoEquip=false;G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function restoreEquipment(slot){
  const last = G.equipBackup?.[slot];
  if (!last || last.slot !== slot) return false;
  const it = last.lg ? G.armory[last.lg] : last;
  if (!it) return false;
  G.autoEquip=false;G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
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
function calc(equip = G.equip, pass = G.pass, slots = G.slots, supp = G.supp, forceModern=false){
  const s = { life:0, dmg:5 + 1.8*G.lvl, inc:0, crit:5, cm:150, apsInc:0, regen:1.5, leech:0, armor:0, fire:0, cold:0, light:0, haste:0, sinc:0, lifePct:0, dodge:10 };
  const baseLife = 90 + 14*G.lvl;
  for (const k in equip){ const it = equip[k]; if (!it) continue; for (const a of [it.imp, ...it.aff]) s[STAT_KEY[a.k]] += a.v; }
  for (const [k, v] of Object.entries(CHARS[G.char].eff)) s[k] += v;
  s.inc += achCount();
  for (const [id, n] of Object.entries(G.cards)){ const c = CARDS[id]; if (c && c.st) s[c.st] += c.v*n; }
  for (const id of Object.keys(G.relics)){ const r = RELICS[id]; if (r && r.st) s[r.st] += r.v; }
  if (G.relics.VEST) s.lifePct += 10;
  for (const id of pass){ const n = TREE[id]; if (!n) continue; for (const [k, v] of Object.entries(!forceModern&&G.legacyMode?n.eff:FIRMWARE[id]?.eff||n.eff)) s[k === 'dmgPct' ? 'inc' : k] += v; }
  const modern=forceModern||!G.legacyMode;s.firmware=modern?pass.filter(id=>FIRMWARE[id]):[];
  const city=G.run?.city;if(city){s.sinc+=18*city.branches.filter(id=>id==='cache').length;s.lifePct-=12*city.branches.filter(id=>id==='cache').length;}
  s.crit=Math.max(0,s.crit);s.apsInc=Math.max(-60,s.apsInc);
  s.life = (baseLife + s.life) * (1 + s.lifePct/100);
  if(city)s.regen+=s.life*.01*city.branches.filter(id=>id==='safe').length;
  s.aps = Math.min(4, 1 + s.apsInc/100);
  s.red = Math.min(.7, s.armor / (s.armor + 60 + 12*G.lvl));
  const bb=modern&&pass.includes('CK')?{rows:0,cols:0,pair:{}}:boardBonus(); s.crit += 5*bb.cols; s.bb = bb;
  s.critAvg = 1 + Math.min(s.crit, 100)/100 * (s.cm/100 - 1);
  s.hit = s.dmg * (1 + s.inc/100);
  s.sk = {}; let dps2 = 0;
  for (const id of slots){ if (!id) continue;
    const K = SKILLS[id], sp = supp[id] || [];
    const pattern=skillPattern(id,G.modeOf[id]),mod=GridLab.skillMods(sp,id);
    const hit=s.dmg*K.mult*(1+(s.inc+s[K.el]+s.sinc)/100)*
      (Object.values(equip).some(it=>it&&it.lg==='W_MULTI')?1+.15*slots.filter(Boolean).length:1)*
      mod.hit*(modern&&pass.includes('AK')?.85:1)*(modern&&pass.includes('EK')?.85:1)*(modern&&pass.includes('CK')&&slots.length<=3?1.35:1)*(modern&&pass.includes('BK')&&new Set(slots.map(id=>SKILLS[id]?.el)).size===3?1.3:1)*(1+.12*bb.rows)*(bb.pair[id]?1.15:1);
    const cd=GridLab.cooldown(K.cd,sp,s.haste,pattern.cd||1),crit=Math.min(100,s.crit+mod.crit);
    const extra=mod.twin*GridLab.LIMITS.repeatDamage+(mod.repeat?.45:0)+(pass.includes('EK')?(modern?.6:.35):0);
    const direct=skillDirectFactor(id,pattern)+extra*skillDirectFactor(id,pattern,true);
    s.sk[id]={mode:G.modeOf[id]||null,pattern,hit,cd,crit,has:sp.filter(Boolean),area:mod.area,twin:mod.twin,leech:mod.leech,
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
function recalc(){ syncBoard(); syncCoreCollection(); const old = G.st; G.st = calc(); if(old?.sk?.BEAM?.mode!==G.st.sk.BEAM?.mode)G.signalCharge=0; const h=G.h;if(!G.st.firmware.includes('AK'))h.buffer=0;else h.buffer=Math.min(h.buffer||0,G.st.life*.12); h.hp = old ? h.hp * G.st.life / old.life : G.st.life; G.dirty = true; }
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
function addFloat(x, y, z, txt, col, size=3.6){ if (G.offline) return; if(G.floats.length>=20)G.floats.shift(); G.floats.push({ x, y, z, txt, col, size, t:0 }); }
function addFx(e){ if (!G.offline&&G.fx.length<64) G.fx.push(e); }

/* ---------- save / load ---------- */
const SAVE_KEY = 'idle-hero-save-v2';
function serialize(){ return { v:2, progressionVersion:1,city:G.city,legacyMode:G.legacyMode,legacyTalent:G.legacyTalent,t:Date.now(), castPolicy:G.castPolicy, lvl:G.lvl, xp:G.xp, gold:G.gold, depth:G.depth, maxDepth:G.maxDepth, kills:G.kills, push:G.push, speed:G.speed, filter:G.filter, deaths:G.deaths, totalKills:G.totalKills,
  coreDust:G.coreDust,inventory:G.inventory,nextGearId:G.nextGearId,autoEquip:G.autoEquip,storageRecycled:G.storageRecycled,chips:G.chips,groundDrops:G.drops.filter(d=>!d.done),equip:G.equip, armory:G.armory, equipBackup:G.equipBackup, deferChoices:G.deferChoices, gems:G.gems, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, mk:G.mk, seenG:G.seenG, seenC:G.seenC, cz:G.cz, userCz:G.userCz, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:Number.isFinite(G.train?.hpBefore)?G.train.hpBefore*G.st.life:G.h.hp, log:G.log.slice(0, 5) }; }
function applySave(o){
  if (!o || o.v !== 2) return false;
  const uidSeen=new Set(),uidConflicts=new Set();for(const it of Array.isArray(o.inventory)?o.inventory:[]){if(uidSeen.has(it.uid))uidConflicts.add(it.uid);uidSeen.add(it.uid);}
  G.castPolicy=o.castPolicy==='combo'?'combo':'balanced';G.signalCharge=0;G.readySince={};G.combat=null;G.castSerial=0;G.signalGainRoot=null;G.h.castT=-1;G.h.swingT=-1;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','mk','seenG','seenC','cz','userCz','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  G.builds=Array.isArray(o.builds)?o.builds.slice(0,3):[null,null,null];G.bi=[0,1,2].includes(o.bi)?o.bi:0;
  if (o.seenC === undefined) G.seenC = { ...G.carts };
  G.armory = Object.fromEntries(Object.entries(o.armory || {}).filter(([id,it]) => coreSlot(id) && it && it.lg === id && it.slot === coreSlot(id) && Array.isArray(it.aff) && it.imp));
  G.equipBackup = Object.fromEntries(Object.entries(o.equipBackup || {}).filter(([slot,it]) => SLOTN[slot] && it?.slot === slot && Array.isArray(it.aff) && it.imp));
  G.deferChoices = o.deferChoices === true;
  G.inventory=(Array.isArray(o.inventory)?o.inventory:[]).filter(validGear).slice(0,200);
  {const used=new Set();let next=1;for(const it of G.inventory){if(!Number.isSafeInteger(it.uid)||it.uid<1||it.uid>1e8||used.has(it.uid)){while(used.has(next))next++;it.uid=next++;}used.add(it.uid);}G.nextGearId=Math.max(1,...used)+1;}G.autoEquip=o.autoEquip!==false;
  G.coreDust=Number.isSafeInteger(o.coreDust)?Math.max(0,o.coreDust):0;G.storageRecycled=Math.max(0,+o.storageRecycled||0);G.chips=Math.max(0,+o.chips||0);G.inventoryRevision++;
  for(const group of [G.equip,G.equipBackup])for(const slot of Object.keys(group)){const it=group[slot];if(validGear(it)&&!it.lg){storeGear(it);group[slot]=G.inventory.find(x=>x.uid===it.uid)||it;}}

  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!CHARS[G.char]) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = (Array.isArray(o.groundDrops)?o.groundDrops:[]).filter(validDrop).map(d=>({...d,t:Number.isFinite(d.t)?d.t:0,done:false})); G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces){ if (o.board.v === 3) G.board = o.board; else sanitizeBoard(o.board); } else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  loadProgression(o);normalizeBuilds(uidConflicts);recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
}
function saveGame(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); return true; } catch (e) { return false; } }
function loadGame(){ try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
const encodeSave = () => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); } catch (e) { return ''; } };
const decodeSave = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); } catch (e) { return null; } };


/* 裝備實體與倉庫：自動換裝不再消滅候選，滿倉回收有明確計數。 */
const validGear=it=>!!(it&&SLOTN[it.slot]&&Number.isInteger(it.r)&&it.r>=0&&it.r<=3&&it.imp&&AFF[it.imp.k]&&Number.isFinite(it.imp.v)&&Number.isFinite(it.il)&&it.il>0&&Array.isArray(it.aff)&&it.aff.every(a=>AFF[a.k]&&Number.isFinite(a.v)));
function affTier(a,il=1){if(Number.isInteger(a.tier)&&a.tier>=0&&a.tier<=4)return a.tier;const ratio=a.v/AFF[a.k].b(il);return ratio>=1.5?0:ratio>=1.2?1:ratio>=1?2:ratio>=.8?3:4;}
function gearPriority(it){return it.r*10000000000+(4-Math.min(4,...it.aff.map(a=>affTier(a,it.il))))*10000000+Math.min(9999,it.il);}
function storeGear(it){
  if(!validGear(it)||it.lg)return false;
  if(it.uid&&G.inventory.some(x=>x.uid===it.uid))return true;
  if(G.inventory.includes(it))return true;
  if(G.inventory.length>=200){
    const protectedItems=[...Object.values(G.equip),...Object.values(G.equipBackup)];
    const low=G.inventory.filter(x=>!x.kept&&!x.cr&&x.lk==null&&!protectedItems.includes(x)&&!gearReferenced(x)).sort((a,b)=>gearPriority(a)-gearPriority(b))[0];
    if(!low||gearPriority(it)<=gearPriority(low))return false;
    G.inventory=G.inventory.filter(x=>x!==low);recycleOverflow(low);
  }
  it.uid=allocateGearId();G.inventory.push(it);G.inventoryRevision++;return true;
}
function equipStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||G.equip[it.slot]===it)return false;
  const old=G.equip[it.slot];if(old&&!old.lg&&!storeGear(old))return false;
  G.equipBackup[it.slot]=old;G.equip[it.slot]=it;G.autoEquip=false;recalc();G.inventoryRevision++;return true;
}
function recycleStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||it.kept||it.cr||it.lk!=null||Object.values(G.equip).includes(it)||Object.values(G.equipBackup).includes(it)||gearReferenced(it))return false;
  G.inventory=G.inventory.filter(x=>x!==it);G.gold+=itemValue(it);salvage(it);G.inventoryRevision++;G.dirty=true;return true;
}
function recycleOverflow(it){G.gold+=itemValue(it);salvage(it);G.storageRecycled++;G.dirty=true;}
function collectEquipment(it){
  if(!validGear(it))return;
  if(it.lg)return false;
  if(it.r<G.filter){recycleOverflow(it);return true;}
  const old=G.equip[it.slot],upgrade=G.autoEquip&&!old?.lg&&(!old||calc({...G.equip,[it.slot]:it}).power>G.st.power*1.02);
  if(old&&!old.lg)storeGear(old);
  if(!storeGear(it)){recycleOverflow(it);return true;}
  if(upgrade){G.equipBackup[it.slot]=old;G.equip[it.slot]=it;recalc();if(G.off)G.off.eq++;logLine(`換上 ${it.name}，上一件保留在倉庫`,RAR[it.r].c);}
  G.off&&(G.off.stored=(G.off.stored||0)+1);G.dirty=true;return true;
}
const validDrop=d=>!!(d&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&(['gold','chip'].includes(d.kind)?Number.isFinite(d.amount)&&d.amount>0:d.kind==='item'?validGear(d.it):d.kind==='gem'?SUPPS[d.id]:d.kind==='cart'?MODES[d.id]:d.kind==='map'?d.map&&BIOMES[d.map.biome]:false));
function dropGround(d){
  d.x=tClamp(d.x,HX-38,HX+38);d.y=tClamp(d.y,HY-38,HY+38);
  if(d.kind==='gold'||d.kind==='chip'){
    const near=G.drops.find(x=>!x.done&&x.kind===d.kind&&Math.hypot(x.x-d.x,x.y-d.y)<8);
    if(near){near.amount+=d.amount;return;}
  }
  G.drops.push(d);
}
function collectNearby(dt){
  for(const d of G.drops){d.t+=dt;if(!d.done&&d.t>=.35&&G.h.dead<=0&&Math.hypot(d.x-G.h.x,d.y-G.h.y)<=6){d.done=true;addFx({k:'pickup',x:d.x,y:d.y,x2:G.h.x,y2:G.h.y,col:d.kind==='gold'?'#e4c379':'#81cbd1',t:0,dur:.35});pickup(d);}}
  G.drops=G.drops.filter(d=>!d.done);
}

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
function buyCircuitSupport(id){if(!['FOCUS','FORK','RECOVER','DELAY'].includes(id)||G.chips<20)return false;G.chips-=20;G.gems[id]=(G.gems[id]||0)+1;G.dirty=true;return true;}

function buyCircuitMode(id){
  if(!['METEOR_COLDSTART','BEAM_CAPACITOR'].includes(id)||G.chips<20||G.carts[id]||G.lvl<SKILLS[MODES[id].sk].lvl)return false;
  G.chips-=20;G.carts[id]=1;G.seen[id]=1;G.dirty=true;return true;
}

/* 有限路徑、可還原遷移、城市遠征與定向收藏。 */
const copyState=x=>JSON.parse(JSON.stringify(x));
function talentBudget(){return Math.min(TALENT_LIMIT,Math.max(0,G.lvl-1)+Math.max(0,Math.floor((G.maxDepth-1)/4)));}
const firmwareCount=pass=>pass.filter(id=>FIRMWARE[id]).length;
const talentOverLimit=pass=>pass.length>talentBudget()||firmwareCount(pass)>FIRMWARE_LIMIT;
function passiveLegacy(){return !!G.legacyMode||talentOverLimit(G.pass);}
function canAllocateTalent(id){return !G.run?.city&&!G.train&&!!TREE[id]&&id!=='S'&&!passiveLegacy()&&passPoints()>0&&nodeOpen(id)&&(!FIRMWARE[id]||firmwareCount(G.pass)<FIRMWARE_LIMIT);}
function talentName(id){return !passiveLegacy()&&FIRMWARE[id]?FIRMWARE[id].n+'：'+FIRMWARE[id].d:TREE[id].name;}
function connectedTalents(pass){const reached=new Set(['S']);let changed=true;while(changed){changed=false;for(const id of pass)if(TREE[id]&&!reached.has(id)&&TREE[id].links.some(k=>reached.has(k))){reached.add(id);changed=true;}}return pass.every(id=>reached.has(id));}
function talentPlan(pass=G.pass){const left=[...new Set(pass.filter(id=>TREE[id]&&id!=='S'))],out=[];let changed=true;
 while(changed){changed=false;for(const id of left){if(out.includes(id)||out.length>=talentBudget()||FIRMWARE[id]&&firmwareCount(out)>=FIRMWARE_LIMIT)continue;if(TREE[id].links.some(k=>k==='S'||out.includes(k))){out.push(id);changed=true;}}}return out;}
function convertTalents(){if(G.run||G.train)return false;if(!G.legacyTalent)G.legacyTalent=copyState({pass:G.pass,builds:G.builds,bi:G.bi||0,board:G.board,castPolicy:G.castPolicy});G.pass=talentPlan();G.legacyMode=false;recalc();return true;}
function restoreLegacyTalents(){if(!G.legacyTalent||G.run||G.train)return false;const old=copyState(G.legacyTalent);G.pass=old.pass;G.builds=old.builds;G.bi=old.bi;if(old.board?.pieces)G.board=old.board;G.castPolicy=old.castPolicy==='combo'?'combo':'balanced';G.legacyMode=true;recalc();return true;}
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
 G.legacyMode=o.progressionVersion===1?(o.legacyMode===true||talentOverLimit(G.pass)):G.pass.length>0;
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
 c.settled=true;const C=G.city||(G.city=newCity()),route=c.route;
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
function heroDamage(damage){if(!Number.isFinite(damage)||damage<=0)return 0;const h=G.h,shield=G.time<(h.bufferUntil||0)?h.buffer||0:0,absorbed=Math.min(shield,damage);h.buffer=shield-absorbed;h.hp-=damage-absorbed;return damage-absorbed;}
function cityMonster(m){const c=G.run?.city;if(!c)return;const branch=c.branches,route=c.nexus?['signal','memory','power'][Math.min(2,c.stage-1)]:c.route;
 m.cityRoute=route;m.hp*=1+.15*(c.tier-1)+(c.nexus?.35:0);m.hpMax=m.hp;
 m.dmg*=Math.pow(.85,branch.filter(x=>x==='safe').length)*Math.pow(1.15,branch.filter(x=>x==='risk').length);
 m.spdK*=Math.pow(1.12,branch.filter(x=>x==='risk').length);
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
 if(!G.inventory.includes(it)){const same=G.inventory.find(x=>x.uid===it.uid);if(same)G.equip[slot]=same;else if(G.inventory.length>=200||!storeGear(it))return null;}
 equipment[slot]={kind:'gear',uid:G.equip[slot].uid};}
 return copyState({board:G.board,pass:G.pass,castPolicy:G.castPolicy,legacyMode:G.legacyMode,character:G.char,equipment});
}
function inspectBuildGear(build){const equip={...G.equip},missing=[];if(!build?.equipment)return {equip,missing,legacy:true};
 for(const slot of Object.keys(SLOTN)){const ref=build.equipment[slot];if(ref===null){equip[slot]=null;continue;}const it=ref?.kind==='core'?G.armory[ref.id]:ref?.kind==='gear'?G.inventory.find(x=>x.uid===ref.uid):null;if(it?.slot===slot)equip[slot]=it;else missing.push(slot);}
 return {equip,missing,legacy:false};
}
function saveBuild(){if(G.run?.city||G.train)return false;const b=captureBuild();if(!b)return false;G.builds[G.bi||0]=b;G.dirty=true;return true;}
function restoreBuild(index,keepMissing=false){if(![0,1,2].includes(index)||index===(G.bi||0)||G.run?.city||G.train)return {ok:false,reason:'目前不能切換構築'};
 const target=G.builds[index],resolved=inspectBuildGear(target);if(resolved.missing.length&&!keepMissing)return {ok:false,missing:resolved.missing,reason:'部分裝備已不存在'};
 const current=captureBuild();if(!current)return {ok:false,reason:'倉庫已滿，先整理空間再保存目前裝備'};
 G.builds[G.bi||0]=current;G.bi=index;
 if(target){G.board=copyState(target.board);G.pass=target.pass.slice();G.castPolicy=target.castPolicy==='combo'?'combo':'balanced';G.legacyMode=target.legacyMode===true||talentOverLimit(G.pass);if(CHARS[target.character]&&charOk(target.character))G.char=target.character;}
 else{boardFromLegacy(['FIRE'],{});G.pass=[];G.castPolicy='balanced';G.legacyMode=false;}
 if(target?.equipment){for(const slot of Object.keys(SLOTN)){const old=G.equip[slot];G.equip[slot]=resolved.equip[slot];if(old!==G.equip[slot])G.equipBackup[slot]=old;}G.autoEquip=false;}
 const use={},cu={};G.board.pieces=G.board.pieces.filter(p=>p.kind!=='support'||(use[p.key]=(use[p.key]||0)+1)<=(G.gems[p.key]||0));
 for(const p of G.board.pieces)if(p.mode){cu[p.mode]=(cu[p.mode]||0)+1;if(cu[p.mode]>(G.carts[p.mode]||0))p.mode=null;}
 G.proj=[];G.timers=[];G.h.castT=-1;G.h.swingT=-1;G.readySince={};G.signalCharge=0;recalc();return {ok:true,missing:resolved.missing,legacy:resolved.legacy};
}
function normalizeBuilds(conflicts=new Set()){
 const clean=build=>{if(!build||!Array.isArray(build.board?.pieces)||!Array.isArray(build.pass))return null;const b=copyState(build);if(b.equipment){const refs={};for(const slot of Object.keys(SLOTN)){const r=b.equipment[slot];refs[slot]=r===null?null:r?.kind==='core'&&coreSlot(r.id)===slot?{kind:'core',id:r.id}:r?.kind==='gear'&&Number.isSafeInteger(r.uid)&&r.uid>0&&r.uid<=1e8&&!conflicts.has(r.uid)?{kind:'gear',uid:r.uid}:{kind:'missing'};}b.equipment=refs;}return b;};
 G.builds=Array.from({length:3},(_,i)=>clean(G.builds?.[i]));if(G.legacyTalent?.builds)G.legacyTalent.builds=Array.from({length:3},(_,i)=>clean(G.legacyTalent.builds[i]));
}
const AFFIX_BANDS=[1.65,1.35,1.1,.88,.65];
function affValue(k,il,tier,quality,boost=1){const v=AFF[k].b(il)*AFFIX_BANDS[tier]*(.9+.2*quality)*boost;return k==='leech'?Math.round(v*10)/10:Math.max(1,Math.round(v));}
function affRange(a,it){const tier=affTier(a,it.il),boost=it.r===3?1.35:1;return {tier,min:affValue(a.k,it.il,tier,0,boost),max:affValue(a.k,it.il,tier,1,boost)};}
function affQuality(a,it){return Math.max(0,Math.min(1,(a.v/(AFF[a.k].b(it.il)*AFFIX_BANDS[affTier(a,it.il)]*(it.r===3?1.35:1))-.9)/.2));}
function recalibrateAff(a,it){return {...a,tier:affTier(a,it.il),v:affValue(a.k,it.il,affTier(a,it.il),Math.random(),it.r===3?1.35:1)};}

function forgetBuildGear(index){if(![0,1,2].includes(index)||index===(G.bi||0)||G.run?.city||G.train||!G.builds[index]?.equipment)return false;delete G.builds[index].equipment;G.dirty=true;G.inventoryRevision++;return true;}

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
const hordeCap = () => Math.min(SLOTS.length,42,18+Math.floor(lvlNow()*1.3),3+Math.floor(G.lvl*1.8));   // 新手一次只來幾隻，隨等級慢慢增加
const earlyK = () => Math.max(0, 8 - G.lvl);
const MTYPES = { slime:{ hp:1, dmg:.8, xp:1, g:1, spd:15, atk:1.5 }, skel:{ hp:1.25, dmg:1.1, xp:1.3, g:1.2, spd:17, atk:1.35 }, brute:{ hp:2.7, dmg:1.7, xp:2.4, g:2.2, spd:11, atk:1.8 }, boss:{ hp:15, dmg:2.3, xp:14, g:12, spd:9, atk:1.9 }, drone:{ hp:.6, dmg:.7, xp:1.2, g:1.1, spd:24, atk:1.3 }, bomb:{ hp:1.4, dmg:1.2, xp:1.8, g:1.6, spd:12, atk:2.2 } };
Object.assign(MTYPES,{spider:{hp:.8,dmg:1.1,xp:1.3,g:1.2,spd:27,atk:1},speaker:{hp:2,dmg:1.8,xp:2,g:1.8,spd:10,atk:2.1},wisp:{hp:.65,dmg:1.35,xp:1.5,g:1.4,spd:22,atk:1.25},crab:{hp:3.2,dmg:2,xp:2.7,g:2.4,spd:9,atk:2.2}});
const REGION_MOBS=[['slime','spider','skel'],['crab','brute','bomb'],['wisp','skel','drone'],['bomb','crab','brute'],['drone','speaker','wisp'],['spider','speaker','slime'],['drone','wisp','speaker'],['crab','spider','drone'],['wisp','spider','skel'],['speaker','bomb','crab'],['drone','brute','speaker'],['spider','wisp','bomb']];
function spawnPack(){
  if(G.run?.city?.awaitChoice)return;
  const R = G.run, d = lvlNow(), mods = R ? R.map.mods : [], kills = R ? R.kills : G.kills, need = R ? R.need : G.need, bossOut = R ? R.bossOut : G.bossOut;
  if (!R && G.need < 60) G.need = 60;   /* 舊存檔的門檻較低，大群怪的玩法改成 60 */
  const bossNow = (R || G.push) && kills >= need && !bossOut && !(R && R.tower && R.floor % 10 !== 0) && (G.h.hp >= G.st.life*(G.bossHp || 0)/100 || R);   // 推進模式：生命低於設定值就先不開打
  let types;
  if (bossNow){ types = ['boss']; if (R) R.bossOut = true; else G.bossOut = true; logLine(`${R ? '地圖' : `深度 ${d} `}的守關者出現了！`, '#8e3fd1'); }
  else {const n=Math.min(hordeCap()-G.mons.filter(m=>!m.dead).length,4+Math.floor(Math.random()*4)+(mods.includes('more')?2:0)+(mods.includes('swarm')?3:0));const pool=REGION_MOBS[biomeNow()]||REGION_MOBS[0];types=Array.from({length:Math.max(0,n)},()=>tPick(pool));}
  if(R?.city&&R.city.stage<3)types=types.map(()=>tPick(CITY_ROUTES[R.city.route].pool));
  const hpK = (mods.includes('tough') ? 1.4 : 1)*(mods.includes('swarm') ? .75 : 1), dmgK = mods.includes('deadly') ? 1.35 : 1, fastK = mods.includes('fast') ? 1.25 : 1;
  const packRift = Math.floor(Math.random()*RIFTS.length), used = new Set(G.mons.filter(m => !m.dead).map(m => m.slot));
  types.forEach((t, i) => {
    const T = MTYPES[t], trash = t !== 'boss' ? HORDE.hp : 1, hp = 24 * Math.pow(1.32, d-1) * T.hp * hpK * trash * (1.2+Math.min(1,Math.max(0,d-2)*.08)) * (t==='boss'?1.5:1) * (1 + earlyK()*.15);
    let slot = 0; while (used.has(slot) && slot < SLOTS.length - 1) slot++; used.add(slot);   // 找一個沒人站的圍攻位置
    const rf = RIFTS[packRift], sx = t === 'boss' ? tClamp(G.h.x + tRand(-14, 14), -40, 70) : tClamp(rf[0] + tRand(-4, 4), -48, 78), sy = t === 'boss' ? tClamp(G.h.y - 18 + tRand(-6, 6), -26, 98) : tClamp(rf[1] + tRand(-4, 4), -26, 98);   /* 守關者從天上掉下來，小怪從裂縫鑽出 */
    const el = t !== 'boss' && (d >= 6 || mods.includes('elite')) && Math.random() < (mods.includes('elite') ? .3 : .06);   // 菁英：體型大、金環、血厚、賞金多
    G.mons.push({ type:t, boss:t === 'boss', elite:el, x:sx, y:sy, hp:hp*(el ? 3.2 : 1), hpMax:hp*(el ? 3.2 : 1), dmg:(el ? 1.3 : 1) * 4.5 * Math.pow(1.22, d-1) * T.dmg * dmgK * (1.3+Math.min(1.1,Math.max(0,d-2)*.09)) * (t==='boss'?1.35:1) * (t !== 'boss' ? HORDE.dmg : 1) * (1 + earlyK()*.12), atkInt:T.atk/fastK, spdK:fastK, atkCd:tRand(.3, T.atk),
      slot, fall:t === 'boss' ? .9 : 0, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  });
  if(R?.city)for(const m of G.mons)if(!m.dead&&!m.cityRoute)cityMonster(m);
  addFx({ k:'portal', t:0, dur:.5, x:RIFTS[packRift][0], y:RIFTS[packRift][1] });
}
function dropItem(m, it){ dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'item', it, t:0 }); if (it.r >= 2 && !G.offline){ lootToast(it); bossLoot(it); SFX('rare'); if (it.r >= 3) kick(.6, .3, '#ffb27a', .5); } }
function killMon(m){
  if(m.training){m.hp=m.hpMax;return;}
  m.dead = true; m.deadT = 0; SFX('kill'); if (!G.train && G.mk) G.mk[m.type] = (G.mk[m.type] || 0) + 1; const T = MTYPES[m.type], d = lvlNow(), R = G.run, q = runQ(), mods = R ? R.map.mods : [];
  let hk = m.boss ? 1 : HORDE.xp, xp = Math.max(1, Math.round(5 * Math.pow(1.2, d-1) * T.xp * hk * (G.relics.CALC ? 1.2 : 1) * (offPen() ? .75 : 1))), gold = Math.max(1, Math.round(3 * Math.pow(1.2, d-1) * T.g * tRand(.8, 1.2) * (mods.includes('rich') ? 1.6 : 1) * (m.boss ? 1 : HORDE.gold)));
  if (m.elite){ gold *= 4; xp *= 4; } if (mods.includes('wise')) xp = Math.round(xp*1.5);
  if (G.relics.PIG) gold = Math.round(gold*1.3);
  dropGround({kind:'gold',amount:gold,x:m.x,y:m.y,t:0});if(m.boss||m.elite||Math.random()<.08)dropGround({kind:'chip',amount:m.boss?5:m.elite?2:1,x:m.x+2,y:m.y,t:0});G.totalKills++; if (m.boss){ G.bossKills = (G.bossKills || 0) + 1; if (Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++; kick(2.4, .5, '#fff6c0', 1); hitStop(.14); if (G.fx.length < 40) addFx({ k:'ring', x:m.x, y:m.y, col:'#fff6c0', t:0, dur:.7 }); if (Math.random() < .25 && typeof COS !== 'undefined'){ const pool = []; for (const c of Object.keys(COS)) for (const e of COS[c]) if (e[3] > 0 && !G.own[c + ':' + e[0]]) pool.push([c, e]); if (pool.length){ const [c, e] = tPick(pool); G.own[c + ':' + e[0]] = 1; logLine(`守關者掉落裝扮：${e[1]}`, '#c28a00'); } } }
  gainXp(xp); if (R) R.kills++; else G.kills++; checkGoals();
  if (R && R.tower && R.floor % 10 !== 0 && R.kills >= R.need) towerNext();
  if (G.relics.FOOD) G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*.01);
  if (G.relics.BOMB && Math.random() < .1 && G.slots[0]){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 9) applySkillHit(G.slots[0], o, 1.5,'proc'); }
  if (lgOn('A_RESET') && ++G.lgK % 25 === 0){ for (const id of G.slots) G.cds[id] = 0; addFloat(G.h.x, G.h.y, BZ + 24, '冷卻完畢', '#4a8fe0', 3.6); }
  if (lgOn('R_LINK')){ const o = G.mons.filter(x => !x.dead && x !== m && !(x.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; if (o){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 8], [o.x, o.y, BZ + 8]], t:0, dur:.2 }); hitMon(o, m.hpMax*.5, false); } }
  if (m.type === 'bomb' && !G.offline){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.4, big:true, col:'#ff5a3a' }); kick(1.1, .3, '#ff9a3c', .6); if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 12 && G.h.dead <= 0){ const bd = Math.max(1, m.dmg*1.6*(1 - G.st.red)); heroDamage(bd); G.h.hurtT = .15; addFloat(G.h.x + 3, G.h.y, BZ + 16, tFmt(bd), '#e2483d', 3.6); } for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 10) hitMon(o, m.hpMax*.6, false); }
  const nItems = m.boss ? 2 + (Math.random() < .5 ? 1 : 0) : m.elite ? 1 + (Math.random() < .5 ? 1 : 0) : Math.random() < HORDE.drop*(1 + q)*(offPen() ? .25 : 1) ? 1 : 0;   // 離線：掉落 25%
  for (let i = 0; i < nItems; i++) dropItem(m, makeItem(tPick(['weapon','armor','ring']), rarityRoll(m.boss), d));
  if (Math.random() < (m.boss ? .3 : .012)) dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'cart', id:tPick(Object.keys(MODES)), t:0 });
  if (Math.random() < (m.boss ? .35 : .025)) dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'gem', id:tPick(Object.keys(SUPPS)), t:0 });
  if (Math.random() < (m.boss && !R ? 1 : .03)) dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'map', map:makeMap(d + (Math.random() < .3 ? 1 : 0)), t:0 });
  if(R?.city&&!m.boss)cityStageClear();
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
    dropGround({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), R.map.lvl), t:0 });
  }
  addFloat(G.h.x, G.h.y, BZ + 26, `第 ${R.floor} 層`, '#8e3fd1', 4.6); logLine(`無限之塔：第 ${R.floor} 層${R.floor % 10 === 0 ? '（守關者層）' : ''}`, '#8e3fd1'); kick(.5, .25, '#d8c0ff'); G.dirty = true;
}
function completeRun(){
  if (!G.run) return;
  if(G.run.city){if(G.run.city.stage===3&&G.run.bossOut&&G.mons.some(m=>m.boss&&m.dead))cityFinish(true);return;}
  if (G.run && G.run.tower){ G.mapsDone++; towerNext(); return; }
  G.mapsDone++; checkGoals();
  const R = G.run, q = runQ(), lvl = R.map.lvl, extra = 2 + Math.ceil(q*4);
  for (let i = 0; i < extra; i++) dropGround({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), lvl), t:-i*.15 });
  const bonus = Math.round(40 * Math.pow(1.2, lvl-1) * (1 + q)); dropGround({kind:'gold',amount:bonus,x:G.h.x,y:G.h.y,t:0});
  for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) dropGround({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'map', map:makeMap(lvl + Math.floor(Math.random()*3)), t:-.5 - i*.2 });
  logLine(`地圖完成！獎勵 +${bonus}g 與 ${extra} 件戰利品`, '#2f9e4f'); G.run = null; G.dirty = true;
}
function gainXp(xp){
  G.xp += xp;
  while (G.xp >= xpNeed(G.lvl)){ G.xp -= xpNeed(G.lvl); G.lvl++; G.picks++; SFX('lvl'); recalc(); G.h.hp = G.st.life; kick(.7, .45, '#fff3a0', .5); addFloat(G.h.x + 3, G.h.y, BZ + 24, 'LEVEL UP', '#2f9e4f', 4.6); logLine(`升級了！等級 ${G.lvl}（路徑預算 ${talentBudget()}／${TALENT_LIMIT}）`, '#2f9e4f');
    if (G.off) G.off.lvls++; }
}

/* ---------- loot handling ---------- */
function pickup(d){
  if(d.kind==='gold'||d.kind==='chip'){if(d.kind==='gold')G.gold+=d.amount;else G.chips+=d.amount;G.dirty=true;addFloat(G.h.x,G.h.y,BZ+16,d.kind==='gold'?`+${tFmt(d.amount)}g`:`+${d.amount} 電路點數`,d.kind==='gold'?'#a9780a':'#187f9c',3.2);return;}
  if(d.kind==='item'&&collectEquipment(d.it))return;
  if (d.kind === 'gem'){ G.gems[d.id] = (G.gems[d.id] || 0) + 1; logLine(`獲得輔助寶石：${SUPPS[d.id].n}`, '#8e3fd1'); if (G.off) G.off.gems++; G.dirty = true; return; }
  if (d.kind === 'cart'){ if (G.off) G.off.carts = (G.off.carts || 0) + 1; G.carts[d.id] = (G.carts[d.id] || 0) + 1; logLine(`獲得卡匣：${G.seen[d.id] ? MODES[d.id].n : '未鑑定的' + SKILLS[MODES[d.id].sk].n + '卡匣'}`, '#1f9bbf'); G.dirty = true; return; }
  if (d.kind === 'map'){ if (G.maps.length < 15) { G.maps.push(d.map); logLine(`獲得地圖：${BIOMES[d.map.biome].n} Lv. ${d.map.lvl}`, '#2f7fc4'); if (G.off) G.off.maps++; } else G.gold += 30*d.map.lvl; G.dirty = true; return; }
  const it = d.it, rc = RAR[it.r].c;
  if (it.r < G.filter){ G.gold += itemValue(it); salvage(it); return; }
  const cur = G.equip[it.slot], cand = calc({ ...G.equip, [it.slot]:it });
  if (it.lg && LEGEND_BY[it.lg]){
    const old = G.armory[it.lg], active = cur?.lg === it.lg;
    if(old){G.coreDust++;if(G.off)G.off.coreDust=(G.off.coreDust||0)+1;}
    if (old && (active || old.cr || old.lk != null || gearReferenced(old) || cand.power <= calc({...G.equip,[it.slot]:old}).power*1.02)){
      G.gold += itemValue(it); salvage(it); G.dirty = true; return;
    }
    if (old){ G.gold += itemValue(old); salvage(old); }
    G.armory[it.lg] = it;
    if (!old && G.off) G.off.cores = (G.off.cores || 0) + 1;
    logLine(`${old?'更新':'收藏'}傳奇核心：${it.name}`, rc);
    if (G.autoEquip && !cur?.lg && (!cur || cand.power > G.st.power*1.02)){
      // 收藏裝備永不作自動拆解來源；一般裝備仍使用原本的自動比較。
      if(cur){if(!cur.lg)storeGear(cur);G.equipBackup[it.slot]=cur;}
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
function combatBook(){return G.train||(G.combat||(G.combat={start:G.time}));}
function combatCast(id,origin){
  const book=combatBook();book.stats||={};
  const row=book.stats[id]||(book.stats[id]={casts:0,repeats:0,wait:0,maxWait:0});
  if(origin==='primary'){
    row.casts++;const wait=Math.max(0,G.time-((G.h.castT>=0&&G.h.castSk===id?G.h.castReadySince:null)??G.readySince?.[id]??G.time));row.wait+=wait;row.maxWait=Math.max(row.maxWait,wait);
  }else row.repeats++;
}
function combatDamage(source,damage){
  const book=combatBook();book.damage||={};book.damage[source]=(book.damage[source]||0)+damage;
  if(G.train)trainAdd(source,damage);
}
function combatCombo(key,amount=1){const book=combatBook();book.combos||={};book.combos[key]=(book.combos[key]||0)+amount;}
function resetCombatReport(){G.combat={start:G.time};}
function applyFreeze(m,seconds=COMBAT_RULES.freezeSeconds,damage=null){
  if(m.dead||m.fall>0)return false;
  if(m.boss){
    if((m.freezeGuard||0)>G.time)return false;
    const contribution=damage==null?.35:Math.min(.75,Math.max(0,damage)/(m.hpMax*COMBAT_RULES.bossFreezeLife));
    m.freezeBuildup=(m.freezeBuildup||0)+contribution;
    if(m.freezeBuildup<1)return false;
    m.freezeBuildup=0;m.freezeGuard=G.time+seconds+COMBAT_RULES.bossFreezeGuard;
  }
  m.frozen=Math.max(m.frozen||0,seconds);combatCombo('freezes');return true;
}
function signalHit(id,m,origin){
  if(id!=='CHAIN'||origin!=='primary'||!G.st.sk.BEAM?.pattern.capacitor)return;
  if(G.signalGainRoot!==G.eventRoot){G.signalGainRoot=G.eventRoot;G.signalTargets=new Set();G.signalGained=0;}
  if(G.signalTargets.has(m)||G.signalGained>=COMBAT_RULES.chargePerCast)return;
  G.signalTargets.add(m);
  const amount=Math.min(m.boss||m.elite?2:1,COMBAT_RULES.chargePerCast-G.signalGained,COMBAT_RULES.chargeMax-G.signalCharge);
  G.signalGained+=amount;G.signalCharge+=amount;if(amount)combatCombo('chargeGain',amount);
}
function chooseReadySkill(){
  const order=Object.keys(SKILLS),ready=order.filter(id=>G.slots.includes(id)&&G.st.sk[id]&&G.cds[id]<=0);
  const age=id=>G.time-(G.readySince[id]??G.time),sort=(a,b)=>{const delta=(G.readySince[a]??G.time)-(G.readySince[b]??G.time);return Math.abs(delta)>1e-6?delta:order.indexOf(a)-order.indexOf(b);};
  ready.sort(sort);if(G.castPolicy!=='combo')return ready[0];
  const overdue=ready.filter(id=>age(id)>=Math.max(COMBAT_RULES.comboHold,G.slots.length*GridLab.LIMITS.castTime));
  if(overdue.length)return overdue[0];
  const frozen=G.mons.some(m=>!m.dead&&!(m.fall>0)&&m.frozen>0),cold=G.st.sk.METEOR?.pattern.coldStart;
  const available=ready.filter(id=>age(id)>=COMBAT_RULES.comboHold||
    !(G.st.sk[id].pattern.capacitor&&G.signalCharge<4||G.st.sk[id].pattern.coldStart&&!frozen));
  const priority=id=>cold&&frozen&&id==='METEOR'||id==='BEAM'&&G.signalCharge>=4?2:
    cold&&!frozen&&id==='FROST'||G.st.sk.BEAM?.pattern.capacitor&&G.signalCharge<COMBAT_RULES.chargeMax&&id==='CHAIN'?1:0;
  available.sort((a,b)=>priority(b)-priority(a)||sort(a,b));return available[0];
}
function hitMon(m, dmg, crit, source=G.src||'其他'){
  if (m.dead || m.fall > 0) return;
  if(!Number.isFinite(dmg)||dmg<=0)return;
  dmg=cityIncoming(m,dmg);if(dmg<=0)return;
  combatDamage(source,Math.min(Math.max(0,m.hp),dmg));
  m.hp -= dmg; m.hurtT = .12; SFX(crit ? 'crit' : 'hit');
  if (!m.training && !m.boss && !m.dv && !G.offline && Math.random() < .14){ const a = Math.random()*6.28; m.dv = { x:Math.cos(a)*42, y:Math.sin(a)*42, t:.22 }; }   // 挨打後側閃
  if (!G.offline&&!m.training){ const dx = m.x - G.h.x, dy = m.y - G.h.y, dd = Math.hypot(dx, dy) || 1, kb = m.boss ? .2 : crit ? 1.6 : .6; m.x += dx/dd*kb; m.y += dy/dd*kb;   // 被打時往外退一點
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
  const h=G.h;
  if (lgOn('A_PHOENIX') && !(h.phx > 0)){ h.phx = 90; h.hp = G.st.life*.5; for (const id of G.slots) G.cds[id] = 0; addFx({ k:'nova', t:0, dur:.55 }); addFloat(h.x, h.y, BZ + 24, '不滅', '#ff7a3d', 5); kick(2, .6, '#ffa040', .8); SFX('boom'); return; } h.dead=3;h.castT=-1;G.readySince={};G.signalCharge=0;G.deaths++; SFX('die'); G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.timers.length = 0;
  if(G.run?.city){cityFinish(false);return;}
  if (G.run && G.run.tower){ G.towerBest = Math.max(G.towerBest || 0, G.run.floor - 1); logLine(`你倒下了……無限之塔結束，最高第 ${G.towerBest} 層`, '#e2483d'); G.run = null; }
  else if (G.run){ logLine('你倒下了……地圖失敗', '#e2483d'); G.run = null; }
  else { if (G.push && G.depth > 1) G.depth--; G.kills = 0; G.bossOut = false; logLine('你倒下了……退回較淺的深度', '#e2483d'); }
  G.dirty = true;
}
function skillDmg(id){ const k = G.st.sk[id]; return k; }
function applySkillHit(id,m,mult=1,origin=G.eventOrigin||'primary'){
  const k=G.st.sk[id];if(!k||!m||m.dead||m.fall>0)return 0;
  const source=SKILLS[id].n+(origin==='primary'?'':origin==='repeat'?'·回放':'·觸發');G.src=source;
  if (G.fx.length < 36) addFx({ k:'shard', x:m.x, y:m.y, z:BZ + 6, col:SKILLS[id].col, t:0, dur:.4 });
  if (m.frozen > 0 && cardN('V_SHATTER')) mult *= 1 + .4*cardN('V_SHATTER');
  const el = SKILLS[id].el; let rx = null;   /* 元素反應：火燒、閃電標記，加上冰凍，三者互相放大 */
  if (m.frozen > 0 && el === 'fire'){ mult *= 1.4; m.frozen = 0; rx = '融化'; } else if (m.frozen > 0 && el === 'light'){ mult *= 1.3; rx = '超導'; } else if (m.burn > 0 && el === 'cold') rx = '蒸氣';
  if (m.shock > 0 && (el === 'fire' || el === 'cold')){ mult *= 1.25; m.shock = 0; rx = rx || '過載'; }
  if (lgOn('R_LAST') && G.h.hp < G.st.life*.35) mult *= 1.4;
  const r=rollDmg(k.hit*mult,k.crit);hitMon(m,r.dmg,r.crit,source);signalHit(id,m,origin);
  if(k.has.includes('RECOVER')&&G.time>=(G.recoverAt||0)){G.h.hp=Math.min(safeLife(),G.h.hp+safeLife()*.03);G.recoverAt=G.time+.8;}
  if(k.has.includes('FORK')&&G.time>=(G.forkAt||0)){G.forkAt=G.time+.25;const other=G.mons.filter(o=>o!==m&&!o.dead&&!(o.fall>0)).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];if(other&&other!==m){hitMon(other,r.dmg*.25,false,SKILLS[id].n+'·分線');addFx({k:'bolt',pts:[[m.x,m.y,BZ+8],[other.x,other.y,BZ+8]],t:0,dur:.3});}}
  if (el === 'fire'){ m.burn = 3; m.burnD = Math.max(m.burnD || 0, r.dmg*.2); } else if (el === 'light') m.shock = 4;
  if (rx){ if (G.floats.length < 30) addFloat(m.x + 2, m.y, BZ + 22, rx, rx === '融化' ? '#ff7a3d' : rx === '超導' ? '#e0c020' : rx === '蒸氣' ? '#7fb6ff' : '#c28aff', 4.4);
    if (rx === '蒸氣' && m.burn > 0){ m.burn = 0; for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 8) hitMon(o, r.dmg*.4, false); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.3 }); } }
  if (r.crit && !G.inFork && lgOn('W_FORK')){ G.inFork = true; const near = G.mons.filter(o => !o.dead && o !== m && !(o.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
    for (const o of near){ addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.3 }); applySkillHit(id,o,mult*.5,'proc'); } G.inFork = false; }
  return r.dmg;
}
const safeLife=()=>G.st.life;
function castSkill(id,repeat=1,origin=repeat===1?'primary':'repeat'){
  const oldOrigin=G.eventOrigin,oldRoot=G.eventRoot;G.eventOrigin=origin;G.eventRoot=++G.castSerial;
  try{return performSkill(id,repeat,origin);}finally{G.eventOrigin=oldOrigin;G.eventRoot=oldRoot;}
}
function performSkill(id,repeat,origin){
  const k = G.st.sk[id], s = G.st, h = G.h; let total = 0; if (!k) return;
  const al = aliveMons(); if (!al.length) return;
  const p=k.pattern,prim=(p.coldStart?al.filter(m=>m.frozen>0).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0]:null)||nearestMon(false)||al[0],mode=k.mode;combatCast(id,origin);SFX(id.toLowerCase());
  if (origin === 'primary' && !G.offline){ const K0 = SKILLS[id]; addFx({ k:'ring', x:h.x, y:h.y, col:K0.col, t:0, dur:.45 }); addFx({ k:'pillar', x:h.x, y:h.y, col:K0.col, t:0, dur:.3 });
    if (K0.cd >= 2 && (G.fx.length < 30)) addFloat(h.x - 2, h.y, BZ + 40, K0.n, K0.col, 4.4);
    kick(K0.cd>=4?1.7:.65,K0.cd>=4?.22:0,K0.col,K0.cd>=4?.6:.2); }
  if(origin==='primary'){if(k.has.includes('DELAY'))G.timers.push({id,t:.6,rep:.45});if(G.pass.includes('EK'))G.timers.push({id,t:.8,rep:s.firmware.includes('EK')?.6:.35});}
  const near = (m0, n, ex) => G.mons.filter(m => !m.dead && m !== m0 && !(ex && ex.has(m))).sort((a, b) => Math.hypot(a.x - m0.x, a.y - m0.y) - Math.hypot(b.x - m0.x, b.y - m0.y)).slice(0, n);
  if (id === 'FIRE'){ const tg = prim; G.proj.push({k:'fire',tg,t:0,dur:.4,mul:repeat,origin}); return; }
  if (id === 'FROST'){
    addFx({ k:'nova', t:0, dur:.55 });
    if(p.echo&&origin==='primary')G.timers.push({t:.6,id,rep:p.echo});
    for(const m of al){const dealt=applySkillHit(id,m,repeat);total+=dealt;if(!m.dead)applyFreeze(m,COMBAT_RULES.freezeSeconds,dealt);
      else if (mode === 'FROST_SHATTER') for (const o of G.mons) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 14){ total += applySkillHit(id, o, repeat*.5); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); } }
  }
  if (id === 'CHAIN'){
    const hops = p.hops + (k.area ? 2 : 0) + 2*cardN('V_FORK'), pts = [[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2]], hit = new Set(); let cur = prim, mul = 1;
    for (let i = 0; i < hops && cur; i++){ hit.add(cur); pts.push([cur.x, cur.y, BZ + 8]); total += applySkillHit(id, cur, repeat*mul); mul*=p.decay;
      if(p.fork){ const f = near(cur, 1, hit)[0]; if (f){ total += applySkillHit(id,f,repeat*p.fork); pts.push([f.x, f.y, BZ + 8], [cur.x, cur.y, BZ + 8]); } }
      let nx = null, bd = 1e9; for (const m of G.mons){ if (m.dead || hit.has(m)) continue; const dd = Math.hypot(m.x - cur.x, m.y - cur.y); if (dd < bd && dd < 28){ bd = dd; nx = m; } } cur = nx; }
    addFx({ k:'bolt', pts, t:0, dur:.3 });
  }
  if(id==='METEOR'){
    const coldBoost=!!(p.coldStart&&origin==='primary'&&prim.frozen>0);
    if(coldBoost){prim.frozen=0;combatCombo('coldBursts');if(s.firmware.includes('AK')){h.buffer=s.life*.12;h.bufferUntil=G.time+4;}}
    for(let i=0;i<p.count;i++){const target=i?(near(prim,1)[0]||prim):prim;
      G.proj.push({k:'meteor',x:target.x,y:target.y,t:-i*.15,dur:.9,mul:repeat*p.each,origin,target,coldBoost:i===0&&coldBoost});}
    if(cardN('V_ECHO'))G.timers.push({t:.6,echo:'METEOR',mul:repeat*.5});return;
  }
  if (id === 'PULSE'){
    const R=p.range,sm=p.each, wave = (r, mu) => { addFx({ k:'nova', t:0, dur:.45 });
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, d = Math.hypot(dx, dy) || 1; if (d > r) continue; total += applySkillHit(id, m, repeat*mu); if (!m.dead){ m.x += dx/d*7; m.y += dy/d*7; } } };
    wave(R, sm); if(p.echo&&origin==='primary')G.timers.push({t:.5,id,rep:p.echo}); SFX('boom');
  }
  if (id === 'MAGNET'){
    const caught = al.filter(m => Math.hypot(m.x-h.x,m.y-h.y)<p.range); SFX('boom');
    for (const m of caught){ const a = Math.random()*6.283, d = 6 + Math.random()*4; m.x = h.x + Math.cos(a)*d; m.y = h.y + Math.sin(a)*d; const dealt=applySkillHit(id,m,repeat);total+=dealt;if(!m.dead&&mode==='MAGNET_STICKY')applyFreeze(m,2,dealt); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.3 }); }
    if(p.crush&&origin==='primary') G.timers.push({ t:.5, id, crush:true });
  }
  if (id === 'FLICKER'){
    const storm=mode==='FLICKER_STORM',n=p.count;
    for (let i = 0; i < n; i++) G.timers.push({ t:.02 + .07*i, id, mul:repeat*p.each, origin,flick:{i,last:!storm&&i===n-1} });
    return;
  }
  if (id === 'SPAM'){
    const n=p.count, pool = mode === 'SPAM_PHISH' ? al.slice().sort((a, b) => b.hp - a.hp) : al; SFX('chain');
    for (let i = 0; i < n; i++){ const m = mode === 'SPAM_PHISH' ? pool[i % pool.length] : tPick(pool); if (!m || m.dead) continue;
      total += applySkillHit(id, m, repeat*p.each); addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:-i*.02, dur:.2 }); }
  }
  if (id === 'BEAM'){
    SFX('fire'); const base = Math.atan2(prim.y - h.y, prim.x - h.x), w=p.width,spent=p.capacitor&&origin==='primary'?G.signalCharge:0,mu=repeat*p.each*(1+spent*(s.firmware.includes('FK')?.45:.35));
    if(spent){G.signalCharge=0;combatCombo('chargeSpent',spent);addFx({k:'ring',x:h.x,y:h.y,col:'#57efff',t:0,dur:.5});}
    const shoot = (ang, m2) => { const ux = Math.cos(ang), uy = Math.sin(ang);
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, al2 = dx*ux + dy*uy; if (al2 > 0 && al2 < 90 && Math.abs(dx*uy - dy*ux) < w) total += applySkillHit(id, m, mu*m2); }
      addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [h.x + ux*90, h.y + uy*90, BZ + 8]], t:0, dur:.35 }); };
    if(p.sweep){ for (const d of [-.61, 0, .61]) shoot(base+d,1); } else shoot(base, 1);
  }
  if (k.leech && total) h.hp = Math.min(s.life, h.hp + total*.12);
  h.hp = Math.min(s.life, h.hp + total*s.leech/100);
}
function resolveProj(p){
  const old=G.eventOrigin;G.eventOrigin=p.origin||'repeat';
  try{return performProj(p);}finally{G.eventOrigin=old;}
}
function performProj(p){
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
    const pattern=k.pattern,al=aliveMons(),top=pattern.primary? al.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : null;
    for(const q of al){
      if(pattern.radius&&Math.hypot(q.x-p.x,q.y-p.y)>pattern.radius)continue;
      const factor=pattern.primary?(q===top?pattern.primary:pattern.splash):p.coldBoost&&q===p.target?pattern.coldBonus:1;
      total+=applySkillHit('METEOR',q,p.mul*factor);
    }
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
    const loot=G.drops.filter(d=>!d.done&&d.t>.35).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
    if(loot&&h.hp>G.st.life*.2){h.gx=loot.x;h.gy=loot.y;h.aiT=.25;}else if(best){h.gx=best[0];h.gy=best[1];}
  }
  const dx = h.gx - h.x, dy = h.gy - h.y, d = Math.hypot(dx, dy), want = d > 1.2 ? 24 : 0;
  h.vx += ((d ? dx/d : 0)*want - h.vx)*Math.min(1, dt*6); h.vy += ((d ? dy/d : 0)*want - h.vy)*Math.min(1, dt*6);
  h.x += h.vx*dt; h.y += h.vy*dt; h.mv = Math.hypot(h.vx, h.vy);
  if (h.dash){ h.dash.t += dt; if (h.dash.t >= .3) h.dash = null; }
}
/* 訓練場：5 隻打不死也不還手的假人站在身邊，量 30 秒的傷害與各來源佔比 */
function trainAdd(k, d){ const T = G.train; T.dmg[k] = (T.dmg[k] || 0) + d; T.total += d; }
function trainStart(){
  if(G.run||G.train)return;
  const n=G.trainingPreset==='single'?1:5;
  G.train={start:G.time,t:30,duration:30,dmg:{},total:0,n,preset:n===1?'single':'crowd',chargeBefore:G.signalCharge,
    bufferBefore:G.h.buffer||0,bufferUntilBefore:G.h.bufferUntil||0,modeBefore:G.st.sk.BEAM?.mode,hpBefore:G.h.hp/G.st.life,cdsBefore:{...G.cds}};
  G.mons=[];G.proj=[];G.timers=[];G.readySince={};G.signalCharge=0;G.h.castT=-1;G.h.swingT=-1;
  for(const id of G.slots)G.cds[id]=0;
  G.h.buffer=0;G.h.bufferUntil=0;G.h.hp=G.st.life;G.spawnCd=99;
  for(let i=0;i<n;i++)G.mons.push({type:'slime',training:true,boss:false,x:G.h.x+(i-(n-1)/2)*4,y:G.h.y-10,
    hp:1e15,hpMax:1e15,dmg:0,atkInt:1e9,spdK:0,atkCd:1e9,slot:i,fall:0,fight:false,dead:false,deadT:0,hurtT:0,frozen:0,lunge:-1,lungeHit:true,ph:i});
  logLine(`訓練場：${n===1?'單體':'群體'}，測量 30 秒`,'#1f9bbf');closeModal();
}
function trainEnd(abort){
  const T=G.train;if(!T)return;G.train=null;
  if(Number.isFinite(T.hpBefore))G.h.hp=T.hpBefore*G.st.life;
  G.h.buffer=G.st.firmware.includes('AK')&&G.time<(T.bufferUntilBefore||0)?Math.min(T.bufferBefore||0,G.st.life*.12):0;G.h.bufferUntil=T.bufferUntilBefore||0;
  G.mons=[];G.proj=[];G.timers=[];G.h.castT=-1;G.h.swingT=-1;G.readySince={};G.spawnCd=.8;
  G.signalCharge=G.st.sk.BEAM?.mode===T.modeBefore?(T.chargeBefore||0):0;
  for(const id of G.slots)G.cds[id]=T.cdsBefore?.[id]||0;
  if(!abort){G.trainLast={dps:T.total/(T.duration||30),rows:Object.entries(T.dmg).sort((a,b)=>b[1]-a[1]),total:T.total,n:T.n||5,
    duration:T.duration||30,stats:T.stats||{},combos:T.combos||{},preset:T.preset||'crowd'};
    logLine(`訓練完成：每秒傷害約 ${tFmt(G.trainLast.dps)}（${G.trainLast.n} 隻合計）`,'#1f9bbf');}
  G.dirty=true;
}
function update(dt){
  if(G.run?.city?.awaitChoice){const c=G.run.city;if(!Number.isFinite(c.choiceAt)||c.choiceAt>Date.now())c.choiceAt=Date.now();if(G.offline||Date.now()-c.choiceAt>=15000)cityChoose(c.policy,c.stage);else return;}
  G.src = '其他';
  if (G.train){ G.train.t -= dt; for (const m of G.mons) if (!m.dead){ m.hp = m.hpMax; } if (G.train.t <= 0) trainEnd(); }
  G.time += dt; if ((G.time*2 | 0) !== G._ac){ G._ac = G.time*2 | 0; checkAch(); } const h = G.h, s = G.st;
  for (const f of G.floats) f.t += dt/1.1; if (G.floats.length) G.floats = G.floats.filter(f => f.t < 1);
  for (const e of G.fx) e.t += dt/e.dur; if (G.fx.length) G.fx = G.fx.filter(e => e.t < 1);
  if (h.hurtT > 0) h.hurtT -= dt;
  if(!G.train)collectNearby(dt);
  if (h.dead > 0){ h.dead -= dt; G.mons = G.mons.filter(m => (m.deadT += dt) < .4); if (h.dead <= 0) revive(); return; }
  { const alive = G.mons.filter(m => !m.dead).length, bossUp = G.mons.some(m => m.boss && !m.dead); G.spawnCd -= dt; if (G.spawnCd <= 0 && alive < hordeCap() && !bossUp && !G.train){ spawnPack(); G.spawnCd = (alive < hordeCap()*.5 ? .2 : .45) * (1 + earlyK()*.18); } }
  moveHero(dt);
  for (const m of G.mons){
    if (m.dead){ m.deadT += dt; continue; }
    if (m.fall > 0){ m.fall -= dt; if (m.fall <= 0){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.6, big:true }); SFX('boom'); kick(2.4, .5, '#ffffff', 1); } continue; }
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.shock > 0) m.shock -= dt;
    cityTickMonster(m,dt);
    if (m.burn > 0){ m.burn -= dt; m.bt = (m.bt || 0) + dt; if (m.bt >= .5){ m.bt = 0; const burnHit=cityIncoming(m,m.burnD*.5);combatDamage('燃燒',Math.min(m.hp,burnHit));m.hp-=burnHit; if (m.hp <= 0){ killMon(m); continue; } } }
    if(m.freezeBuildup>0)m.freezeBuildup=Math.max(0,m.freezeBuildup-COMBAT_RULES.freezeDecay*dt);
    if(m.frozen>0){m.frozen=Math.max(0,m.frozen-dt);if(m.frozen>0)continue;}
    const so = SLOTS[m.slot % SLOTS.length], dx = h.x + so[0] - m.x, dy = h.y + so[1] - m.y, dist = Math.hypot(dx, dy), spd = MTYPES[m.type].spd * m.spdK;
    if (dist > .6){ const st = Math.min(dist, spd*dt); m.x += dx/dist*st; m.y += dy/dist*st; m.fight = false;
      if (!m.boss && dist > 3){ const sw = Math.sin(G.time*2.4 + m.ph*3)*spd*.7*dt*Math.min(1, dist/8); m.x += -dy/dist*sw; m.y += dx/dist*sw; }   /* 左右蛇行 */ } else m.fight = true;
    if (m.dv){ m.dv.t -= dt; m.x += m.dv.x*dt; m.y += m.dv.y*dt; if (m.dv.t <= 0) m.dv = null; }
    if((m.boss||m.type==='speaker'||m.type==='crab')&&!(m.fall>0)){
      m.skillCd=(m.skillCd??3)-dt;
      if(m.skillCd<=0&&!m.warning){m.warning={x:h.x,y:h.y,t:.9};addFx({k:'warning',x:h.x,y:h.y,t:0,dur:.9,col:'#ff8a4a'});}
      if(m.warning){m.warning.t-=dt;if(m.warning.t<=0){if(Math.hypot(h.x-m.warning.x,h.y-m.warning.y)<9){heroDamage(m.dmg*(m.boss?1.8:1.2)*(1-s.red));kick(1.7,.2,'#ff5a3a',.5);}addFx({k:'boom',x:m.warning.x,y:m.warning.y,z:BZ+2,t:0,dur:.6,big:true});m.warning=null;m.skillCd=m.boss?(m.cityRoute==='signal'?2.5:4):6;}}
    }
    if (m.fight){ m.atkCd -= dt; if (m.atkCd <= 0 && m.lunge < 0){ m.lunge = 0; m.lungeHit = false; m.atkCd = m.atkInt; } }
    if (m.lunge >= 0){
      m.lunge += dt;
      if (!m.lungeHit && m.lunge >= .14){ m.lungeHit = true; if (Math.random()*100 < s.dodge){ { const a = Math.random()*6.28; h.dash = { a, t:0 }; h.vx += Math.cos(a)*70; h.vy += Math.sin(a)*70; } addFloat(G.h.x + 3, G.h.y, BZ + 18, '閃避', '#4a8fe0', 3.6); if (lgOn('A_RIPOSTE')){ const sid = tPick(G.slots.filter(Boolean)); if (sid) castSkill(sid, .8); } continue; } const dmg = Math.max(1, m.dmg * (1 - s.red) * tRand(.9, 1.1)); heroDamage(dmg); h.hurtT = .15; kick(Math.min(1.6, .6 + dmg/G.st.life*4), .35, '#ff3050'); if (dmg >= G.st.life*.08) hitStop(.07); addFloat(G.h.x + 3, G.h.y + tRand(-2,2), BZ + 16, tFmt(dmg), '#e2483d', 3.6); }
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
  const targetsReady=G.mons.some(m=>!m.dead&&!(m.fall>0));
  for(const id of G.slots){if(!id)continue;
    const rate=lgOn('R_LAST')&&h.hp<s.life*.35?2.5:1;
    if(G.cds[id]>0)G.cds[id]-=dt*rate;
    if(!targetsReady||G.cds[id]>0)delete G.readySince[id];
    else if(G.readySince[id]==null)G.readySince[id]=G.time+Math.min(0,G.cds[id])/rate;
  }
  if (h.phx > 0) h.phx -= dt;
  { const sg = CHARS[G.char] && CHARS[G.char].sig, al = aliveMons().filter(m => !(m.fall > 0));
    if (sg && al.length && !G.train){ G.sigT = (G.sigT || 0) + dt; if (G.sigT >= sg.cd){ G.sigT = 0; G.src = '專屬：' + sg.n; const hit = s.hit, pick = n => al.slice().sort(() => Math.random() - .5).slice(0, n); SFX('boom');
      if (G.char === 'street'){ addFx({ k:'ring', x:G.h.x, y:G.h.y, col:'#ff9a3c', t:0, dur:.5 }); kick(.8, .2, '#ff9a3c', .5); for (const m of al) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 24){ const a = Math.atan2(m.y - G.h.y, m.x - G.h.x); m.x += Math.cos(a)*5; m.y += Math.sin(a)*5; hitMon(m, hit*7, false); } }
      else if (G.char === 'frost'){ addFx({ k:'nova', t:0, dur:.55 }); for (const m of al){ applyFreeze(m); } }
      else if (G.char === 'beep'){ for (const m of pick(6)){ addFx({ k:'bolt', pts:[[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:0, dur:.3 }); hitMon(m, hit*5, false); } }
      else if (G.char === 'volt'){ for (const m of pick(5)){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 60], [m.x, m.y, BZ + 6]], t:0, dur:.35 }); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, col:'#e0b020', t:0, dur:.3 }); m.shock = 4; hitMon(m, hit*2.2, true); } }
    } } }
  if (G.relics.SUN && G.slots[0] && aliveMons().length && (G.sunT += dt) >= 10){ G.sunT = 0; addFx({ k:'nova', t:0, dur:.55 }); for (const m of aliveMons()) applySkillHit(G.slots[0], m, 1.2,'proc'); }
  if (h.castT < 0 && aliveMons().length){ const id=chooseReadySkill(); if (id){ h.castReadySince=G.readySince[id]??G.time;h.castT = 0; h.castFired = false; h.castSk = id; G.cds[id] = s.sk[id].cd; } }
  if (h.castT >= 0){
    h.castT += dt;
    if (!h.castFired && h.castT >= .25){ h.castFired = true; castSkill(h.castSk,1,'primary');delete G.readySince[h.castSk]; G.lgC = (G.lgC || 0) + 1; if ((lgOn('W_ECHO') && G.lgC % 4 === 0) || (lgOn('R_DIAL') && Math.random() < .2)) G.timers.push({ t:.3, id:h.castSk, rep:1 }); if (s.sk[h.castSk] && s.sk[h.castSk].twin) for (let i = 0; i < s.sk[h.castSk].twin; i++) G.timers.push({ t:.25*(i + 1), id:h.castSk }); }
    if(h.castT>=GridLab.LIMITS.castTime-1e-9) h.castT = -1;
  }
  if (G.timers.length){ for (const t of G.timers){ t.t -= dt; if (t.t <= 0){ t.done = true; if (t.echo){ const al = aliveMons(); if (al.length && s.sk[t.echo]){ const q = tPick(al); G.proj.push({k:'meteor',x:q.x,y:q.y,t:0,dur:.9,mul:t.mul,origin:'repeat'}); } } else if (t.crush){ if (s.sk[t.id]){ addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.5 }); SFX('boom'); for (const m of aliveMons()) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 14) applySkillHit(t.id,m,s.sk[t.id].pattern.crush,'repeat'); } } else if (t.flick){ const k = s.sk[t.id], al = aliveMons().filter(m => !(m.fall > 0)).sort((a, b) => Math.hypot(a.x - G.h.x, a.y - G.h.y) - Math.hypot(b.x - G.h.x, b.y - G.h.y)).slice(0, 5);
        if (k && al.length){ const q = al[t.flick.i % al.length], a = Math.random()*6.28; addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.2 }); addFx({ k:'ghost', x:G.h.x, y:G.h.y, x2:q.x, y2:q.y, col:'#ff9ae0', t:0, dur:.35 });
          G.h.x = tClamp(q.x + Math.cos(a)*3.5, HX - ARENA_R, HX + ARENA_R); G.h.y = tClamp(q.y + Math.sin(a)*3.5, HY - ARENA_R, HY + ARENA_R); G.h.vx = G.h.vy = 0; G.h.dash = null; G.h.gx = G.h.x; G.h.gy = G.h.y;
          addFx({ k:'slash', x:q.x, y:q.y, z:BZ + 7, t:0, dur:.22 }); SFX('crit'); kick(.12);
          applySkillHit(t.id,q,t.mul*(t.flick.last?k.pattern.last:1),t.origin||'repeat');
          if (k.mode === 'FLICKER_TRAIL'){ G.timers.push({ t:.4, id:t.id, origin:'proc',trail:{x:q.x,y:q.y,mul:k.pattern.trail*t.mul} }); }
          if (k.mode === 'FLICKER_REAP' && q.dead && !t.flick.ext) G.timers.push({ t:.07, id:t.id, mul:t.mul, flick:{ i:t.flick.i + 1, ext:true } }); } }
      else if (t.trail){ if (s.sk[t.id]){ addFx({ k:'boom', x:t.trail.x, y:t.trail.y, z:BZ + 6, t:0, dur:.25 }); for (const m of aliveMons()) if (Math.hypot(m.x - t.trail.x, m.y - t.trail.y) < 7) applySkillHit(t.id,m,t.trail.mul,'proc'); } }
      else if (s.sk[t.id]) castSkill(t.id,t.rep||GridLab.LIMITS.repeatDamage,'repeat'); } } G.timers = G.timers.filter(t => !t.done); }
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
const ART_SHEETS = {"icons":{"file":"icons.svg","cols":6,"rows":4,"ids":["fire","ice","bolt","meteor","shield","sword","shoe","headphones","coin","star","heart","potion","role","battle","craft","growth","adventure","more","lock","unlock"]},"skills":{"file":"skills.svg","cols":3,"rows":3,"ids":["FIRE","FROST","CHAIN","METEOR","PULSE","MAGNET","SPAM","FLICKER","BEAM"]},"gems":{"file":"gems.svg","cols":4,"rows":3,"ids":["HEAVY","AREA","HASTE","TWIN","CRITS","LEECH","COOL","CRYSTAL","FOCUS","FORK","RECOVER","DELAY"]},"relics":{"file":"relics.svg","cols":4,"rows":3,"ids":["FAN","LENS","CHARM","DRINK","BATT","VEST","CALC","PIG","LUCK","FOOD","BOMB","SUN"]},"legends":{"file":"legends.svg","cols":3,"rows":3,"ids":["W_ECHO","W_FORK","W_MULTI","A_PHOENIX","A_RIPOSTE","A_RESET","R_LAST","R_LINK","R_DIAL"]},"badges":{"file":"badges.svg","cols":4,"rows":3,"ids":["k100","k2000","boss1","boss10","d10","d20","l20","l30","map5","legend","card10","survive"]},"equips":{"file":"equips.svg","cols":4,"rows":3,"ids":["weapon-0","weapon-1","weapon-2","weapon-3","armor-0","armor-1","armor-2","armor-3","ring-0","ring-1","ring-2","ring-3"]}};
const ASSET = {
  icons: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NjgiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgMTQ0IDk2Ij48ZyBpZD0iZmlyZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTIgM1Y4TDE2IDZMMjAgMTJWMTdMMTYgMjFIOEw0IDE3VjEzTDkgN1YxMloiIGZpbGw9IiNkZjkxN2UiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDEyTDE1IDE2VjE5SDEwVjE2WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjZWRmM2Y1IiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJpY2UiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xMiAyTDIwIDEwVjE1TDEyIDIyTDQgMTVWMTBaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiAzVjIxTTUgMTBIMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iYm9sdCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTEzIDJIMjBMMTQgMTBIMjBMOSAyMkwxMSAxNEg0WiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJtZXRlb3IiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xMiAzTDQgMTFNMjAgNEwxNCAxME0yMSAxMUwxOCAxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNOSAxMUgxNUwxNyAxM1YxOUwxNSAyMUg5TDcgMTlWMTNaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjEwIiB5PSIxNCIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9InNoaWVsZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTYgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgNUwxMiAyTDIwIDVWMTRMMTcgMThMMTIgMjJMNyAxOEw0IDE0WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgNUwxNyA3VjEzTDEyIDE4WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJzd29yZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xOCAzSDIyVjdMMTAgMTlMNiAxNVoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTUgMTNMMTIgMjBNMyAyMUw3IDE3IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMCAxNEwxOCA2IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InNob2UiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik00IDZIMTBMMTIgMTJMMjAgMTRMMjEgMTdWMjBIM1YxMVoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTMgMTdIMjFNMTIgMTFMOSAxM00xNSAxMkwxMiAxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI1IiB5PSI4IiB3aWR0aD0iMyIgaGVpZ2h0PSI1IiBmaWxsPSIjODFjYmQxIi8+PC9nPjwvZz48ZyBpZD0iaGVhZHBob25lcyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik00IDE1VjhMOCA0SDE2TDIwIDhWMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMyIgeT0iMTIiIHdpZHRoPSI1IiBoZWlnaHQ9IjgiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTYiIHk9IjEyIiB3aWR0aD0iNSIgaGVpZ2h0PSI4IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L2c+PGcgaWQ9ImNvaW4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNSAzSDE5TDIxIDVWMTlMMTkgMjFINUwzIDE5VjVaIiBmaWxsPSIjZTRjMzc5IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xNCA3SDEwVjEySDE0VjE3SDEwIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InN0YXIiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTIgMkwxNSA4SDIyTDE3IDEzTDE5IDIxTDEyIDE3TDUgMjFMNyAxM0wyIDhIOVoiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iaGVhcnQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk2IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMyA2TDYgM0g5TDEyIDZMMTUgM0gxOEwyMSA2VjEyTDEyIDIxTDMgMTJaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InBvdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSI5IiB5PSIzIiB3aWR0aD0iNiIgaGVpZ2h0PSI0IiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik05IDdWMTBMNSAxNFYyMUgxOVYxNEwxNSAxMFY3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNyAxNUgxN1YxOUg3WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJyb2xlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTAgM0gxNEwxNiA1VjlMMTQgMTFIMTBMOCA5VjVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDE0SDE2TDIxIDE4VjIxSDNWMThaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjMiIHk9IjciIHdpZHRoPSIyIiBoZWlnaHQ9IjQiIGZpbGw9IiM4MWNiZDEiLz48cmVjdCB4PSIxOSIgeT0iNyIgd2lkdGg9IjIiIGhlaWdodD0iNCIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9ImJhdHRsZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0zIDNIN0wxOSAxNkwxNiAxOUwzIDdaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xNyAzSDIxVjdMOCAyMEw1IDE3WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMyAxNUw5IDIxTTE1IDE1TDIxIDIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9ImNyYWZ0IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE0IDNIMjBMMTYgN0wxNyAxMEwyMCAxMUwyMyA3VjEzTDE5IDE3SDE0TDcgMjNMMiAxOEwxMCAxMVY3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI1IiB5PSIxNyIgd2lkdGg9IjMiIGhlaWdodD0iMyIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9Imdyb3d0aCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xMiA5VjE0TTUgMTdWMTNIMTlWMTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iOSIgeT0iMiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIyIiB5PSIxNyIgd2lkdGg9IjYiIGhlaWdodD0iNSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI5IiB5PSIxNyIgd2lkdGg9IjYiIGhlaWdodD0iNSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxNiIgeT0iMTciIHdpZHRoPSI2IiBoZWlnaHQ9IjUiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48ZyBpZD0iYWR2ZW50dXJlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5NiA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTMgNUw5IDJMMTUgNUwyMSAyVjE5TDE1IDIyTDkgMTlMMyAyMloiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTkgM1YxOU0xNSA1VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiM4YzliYWMiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDE1TDEwIDEwTDE0IDEzTDE5IDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTciIHk9IjYiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJtb3JlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTQiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMyIgeT0iMTQiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTQiIHk9IjE0IiB3aWR0aD0iNyIgaGVpZ2h0PSI3IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L2c+PGcgaWQ9ImxvY2siIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgNzIpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik04IDExVjZMMTAgNEgxNEwxNiA2VjExIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjUiIHk9IjExIiB3aWR0aD0iMTQiIGhlaWdodD0iMTEiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTAiIHk9IjE0IiB3aWR0aD0iNCIgaGVpZ2h0PSI1IiBmaWxsPSIjODFjYmQxIi8+PC9nPjwvZz48ZyBpZD0idW5sb2NrIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA3MikiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTEyIDExVjZMMTQgNEgxOEwyMCA2VjkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNSIgeT0iMTEiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxMSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxMCIgeT0iMTQiIHdpZHRoPSI0IiBoZWlnaHQ9IjUiIGZpbGw9IiM4YzliYWMiLz48L2c+PC9nPjwvc3ZnPgo=',
  skills: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzODQiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgNzIgNzIiPjxnIGlkPSJGSVJFIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjkiIHk9IjIiIHdpZHRoPSI2IiBoZWlnaHQ9IjMiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNiIgeT0iNSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjE3IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMyA3TDkgMTRIMTNMMTEgMjBMMTYgMTJIMTJaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiNkZjkxN2UiIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IkZST1NUIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTMiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTYgOUgxOE02IDEzSDE4TTcgMTlWMjJNMTIgMTlWMjJNMTcgMTlWMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iQ0hBSU4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjIiIHk9IjMiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTYiIHk9IjE1IiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik04IDZIMTNWMTJIMThWMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iTUVURU9SIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIyIiB5PSI1IiB3aWR0aD0iNSIgaGVpZ2h0PSI4IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjE3IiB5PSIxMSIgd2lkdGg9IjUiIGhlaWdodD0iOCIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAgNUwxNyAxMkwxMyAxNkw2IDlaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xNCAzTDEyIDVNOSAxNkw1IDIwTTMgMTVMMSAxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJQVUxTRSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjUiIHk9IjIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTIgNkgxMkwxNCA4VjhMMTIgMTBIMTJMMTAgOFY4WiIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTJIMTRMMTYgMTRWMThMMTQgMjBIMTBMOCAxOFYxNFoiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iTUFHTkVUIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgM0g5VjE0TDExIDE2SDEzTDE1IDE0VjNIMjBWMTVMMTYgMjBIOEw0IDE1WiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNCA4SDlNMTUgOEgyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJTUEFNIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIyIiB5PSI1IiB3aWR0aD0iMTciIGhlaWdodD0iMTQiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTMgNkwxMCAxMkwxOCA2IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjE3IiB5PSIxNSIgd2lkdGg9IjUiIGhlaWdodD0iNiIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9nPjxnIGlkPSJGTElDS0VSIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTMgN0g4TDEwIDRIMTVMMTcgN0gyMVYyMUgzWiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTBIMTRMMTYgMTJWMTZMMTQgMThIMTBMOCAxNlYxMloiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTE5IDFMMTYgNkgxOUwxNyAxMUwyMyA0SDIwWiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJCRUFNIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgMThMNyAyMUwxNyAxMUwxMyA3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTYgN0wyMiAxIiBmaWxsPSJub25lIiBzdHJva2U9IiNkZjkxN2UiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik00IDIwTDIgMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjOWJhYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L3N2Zz4K',
  gems: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJIRUFWWSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTkgMlY2TTE1IDJWNk05IDE4VjIyTTE1IDE4VjIyTTIgOUg2TTIgMTVINk0xOCA5SDIyTTE4IDE1SDIyIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMyA4TDEwIDEzSDEzTDExIDE2TDE1IDExSDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJBUkVBIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTIgNlYyMU03IDIxSDE3TTMgOEwzIDVMNiAyTTIxIDhWNUwxOCAyTTcgOVY3TDkgNU0xNyA5VjdMMTUgNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxMCIgeT0iOCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9IkhBU1RFIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMyAyMFYxNEg3VjIwTTEwIDIwVjlIMTRWMjBNMTcgMjBWM0gyMVYyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI0IiB5PSIxNiIgd2lkdGg9IjIiIGhlaWdodD0iMyIgZmlsbD0iIzgxY2JkMSIvPjxyZWN0IHg9IjExIiB5PSIxMSIgd2lkdGg9IjIiIGhlaWdodD0iOCIgZmlsbD0iIzgxY2JkMSIvPjxyZWN0IHg9IjE4IiB5PSI1IiB3aWR0aD0iMiIgaGVpZ2h0PSIxNCIgZmlsbD0iIzgxY2JkMSIvPjwvZz48L2c+PGcgaWQ9IlRXSU4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0zIDdIOUwxMiAxMFYyMkgzWiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgMkgxOEwyMSA1VjE3SDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxNSIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iNSIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9nPjxnIGlkPSJDUklUUyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTEyIDJMMTQgOEwyMSA1TDE4IDEyTDIzIDE1TDE2IDE3TDE2IDIzTDExIDE5TDUgMjJMNiAxNUwxIDEyTDggOUw3IDNaIiBmaWxsPSIjZTRjMzc5IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjQiIGhlaWdodD0iNSIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9IkxFRUNIIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNiIgeT0iNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjE1IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0yIDZWMTdNMjIgNlYxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTMgN0w5IDEySDEzTDExIDE2TDE2IDEwSDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJDT09MIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iMyIgeT0iNSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik03IDZWMThNMTIgNlYxOE0xNyA2VjE4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IkNSWVNUQUwiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNOCAzSDE2TDIwIDEyTDE2IDIxSDhMNCAxMloiIGZpbGw9IiNhYTk4YzUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggM0wxMCAxMkw4IDIxTTE2IDNMMTQgMTJMMTYgMjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VkZjNmNSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iRk9DVVMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDVIMTdMMTkgN1YxN0wxNyAxOUg3TDUgMTdWN1oiIGZpbGw9IiNhYTk4YzUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDVWOU01IDEySDlNMTUgMTJIMTlNMTIgMTVWMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTEiIHk9IjExIiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjZTRjMzc5Ii8+PC9nPjwvZz48ZyBpZD0iRk9SSyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjkiIHk9IjMiIHdpZHRoPSI2IiBoZWlnaHQ9IjUiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTEyIDhWMTNNNCAyMFYxM0gyMFYyME0xMiAxM1YyMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJSRUNPVkVSIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE1IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjkiIHk9IjIiIHdpZHRoPSI2IiBoZWlnaHQ9IjMiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTggMTJIMTZNMTIgOFYxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJERUxBWSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjMiIHk9IjUiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxNCIgZmlsbD0iI2FhOThjNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNNyA5TDExIDEyTDcgMTVNMTMgOUwxNyAxMkwxMyAxNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZWRmM2Y1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvc3ZnPgo=',
  relics: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJGQU4iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNCIgeT0iMyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE1IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik05IDE4VjIySDE2TTEyIDZWMTVNOCAxMEgxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxMCIgeT0iOCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9IkxFTlMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik01IDNIMTVMMTcgNVYxNUwxNSAxN0g1TDMgMTVWNVoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTE1IDE1TDIyIDIyIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik03IDhIMTBWNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJDSEFSTSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTYgM0gxOFYxNUwxMiAyMkw2IDE1WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgN0wxNiAxMUwxMiAxNUw4IDExWiIgZmlsbD0iI2FhOThjNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJEUklOSyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iOSIgeT0iMiIgd2lkdGg9IjYiIGhlaWdodD0iNCIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNOCA2SDE2TDE4IDEwVjIxSDZWMTBaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik03IDEySDE3VjE4SDdaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjEwIiB5PSIxMyIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2VkZjNmNSIvPjwvZz48L2c+PGcgaWQ9IkJBVFQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjMiIHk9IjUiIHdpZHRoPSI4IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjEzIiB5PSI1IiB3aWR0aD0iOCIgaGVpZ2h0PSIxNiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNNSAySDlNMTUgMkgxOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSI1IiB5PSIxMiIgd2lkdGg9IjQiIGhlaWdodD0iNiIgZmlsbD0iIzgxY2JkMSIvPjxyZWN0IHg9IjE1IiB5PSI5IiB3aWR0aD0iNCIgaGVpZ2h0PSI5IiBmaWxsPSIjODFjYmQxIi8+PC9nPjwvZz48ZyBpZD0iVkVTVCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik02IDNIMTBWN0gxNFYzSDE4VjlMMjEgMTJWMjFIM1YxMkw2IDlaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjYiIHk9IjEyIiB3aWR0aD0iMTIiIGhlaWdodD0iNiIgZmlsbD0iIzhjOWJhYyIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTIgMTJWMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VkZjNmNSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iQ0FMQyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxyZWN0IHg9IjUiIHk9IjIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI4IiB5PSI1IiB3aWR0aD0iOCIgaGVpZ2h0PSI0IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMjIzMTQ5Ii8+PHJlY3QgeD0iMTQiIHk9IjEyIiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMjIzMTQ5Ii8+PHJlY3QgeD0iOCIgeT0iMTciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxNCIgeT0iMTciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJQSUciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDcyIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNSA3SDE3TDIwIDEwVjE0SDIyVjE4SDE4VjIxSDE1VjE4SDhWMjFINVYxN0wyIDE0VjEwWiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNiA3VjNMMTAgN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTkgNkgxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxNyIgeT0iMTAiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJMVUNLIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNSAzSDE5VjE3TDE1IDIxSDVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA2TDE0IDEwSDE4TDE1IDEzTDE2IDE3TDEyIDE1TDggMTdMOSAxM0w2IDEwSDEwWiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJGT09EIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iMiIgeT0iNSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xNCA2VjE5TTMgMTJIMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNSIgeT0iOCIgd2lkdGg9IjUiIGhlaWdodD0iMiIgZmlsbD0iI2U0YzM3OSIvPjxyZWN0IHg9IjUiIHk9IjE1IiB3aWR0aD0iNSIgaGVpZ2h0PSIyIiBmaWxsPSIjZTRjMzc5Ii8+PHJlY3QgeD0iMTciIHk9IjkiIHdpZHRoPSIyIiBoZWlnaHQ9IjciIGZpbGw9IiNlNGMzNzkiLz48L2c+PC9nPjxnIGlkPSJCT01CIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTYgOEgxNkwxOCAxMFYyMEwxNiAyMkg2TDQgMjBWMTBaIiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjRIMTdMMTkgMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIxOSIgeT0iMyIgd2lkdGg9IjMiIGhlaWdodD0iMyIgZmlsbD0iI2U0YzM3OSIvPjxwYXRoIGQ9Ik03IDEzVjE3IiBmaWxsPSJub25lIiBzdHJva2U9IiNlZGYzZjUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IlNVTiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik05IDdIMTVMMTcgOVYxNUwxNSAxN0g5TDcgMTVWOVoiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDFWNE0xMiAyMFYyM00xIDEySDRNMjAgMTJIMjNNMyAzTDYgNk0xOCAxOEwyMSAyMU0zIDIxTDYgMThNMTggNkwyMSAzIiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9zdmc+Cg==',
  legends: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzODQiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgNzIgNzIiPjxnIGlkPSJXX0VDSE8iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE0IDJIMTlWN0w5IDE3TDYgMTRaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEyTDEyIDE5TTMgMjJMNyAxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMyA5TDExIDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjOWJhYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iV19GT1JLIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTYgMkgyMVY3TDEyIDE2TDkgMTNaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0zIDIzTDEwIDE1IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik03IDE1TDExIDE5IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjE3IiB5PSI1IiB3aWR0aD0iMiIgaGVpZ2h0PSIzIiBmaWxsPSIjZTRjMzc5Ii8+PC9nPjwvZz48ZyBpZD0iV19NVUxUSSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNyIgeT0iMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjkiIHk9IjUiIHdpZHRoPSI2IiBoZWlnaHQ9IjQiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iOSIgeT0iMTIiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxMyIgeT0iMTIiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSI5IiB5PSIxNyIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyMzE0OSIvPjxyZWN0IHg9IjEzIiB5PSIxNyIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzIyMzE0OSIvPjwvZz48L2c+PGcgaWQ9IkFfUEhPRU5JWCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDEySDE2TTggMTZIMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VkZjNmNSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iQV9SSVBPU1RFIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik00IDhMOCAxME0xNiAxMEwyMCA4IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9IkFfUkVTRVQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNOCAzSDE2TDIyIDhMMTkgMTRMMTcgMTJWMjJIN1YxMkw1IDE0TDIgOFoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggNUwxMiA4TDE2IDVWMjBIOFoiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDhWMjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggMTZIMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDNWME05IDFIMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iUl9MQVNUIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSI3IiB5PSIyIiB3aWR0aD0iMTAiIGhlaWdodD0iMjAiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iOSIgeT0iNSIgd2lkdGg9IjYiIGhlaWdodD0iOCIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAgMTdIMTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iUl9MSU5LIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iMyIgeT0iMTIiIHdpZHRoPSIxOCIgaGVpZ2h0PSI5IiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik03IDEyVjRNNCAzTDcgMUwxMCAzTTE1IDlWNU0xOSA5VjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNiIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxMSIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiMyMjMxNDkiLz48L2c+PC9nPjxnIGlkPSJSX0RJQUwiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDQ4KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cmVjdCB4PSIyIiB5PSI5IiB3aWR0aD0iMjAiIGhlaWdodD0iMTIiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTQgOVY1SDExTDE0IDIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iNSIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48cmVjdCB4PSIxMCIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48cmVjdCB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48L2c+PC9nPjwvc3ZnPgo=',
  badges: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJrMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNMTggM0gyMlY3TDEwIDE5TDYgMTVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEzTDEyIDIwTTMgMjFMNyAxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTRMMTggNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0iazIwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNNCA4TDkgMTNMNCAxOE0xMiA4TDE3IDEzTDEyIDE4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9nPjxnIGlkPSJib3NzMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik0zIDZMOCAxMEwxMiAzTDE2IDEwTDIxIDZMMTggMjBINloiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTcgMTZIMTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImJvc3MxMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxyZWN0IHg9IjciIHk9IjIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI5IiB5PSI1IiB3aWR0aD0iNiIgaGVpZ2h0PSI4IiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMCAxN0gxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0iZDEwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNNyAySDE3TDIyIDdWMTdMMTcgMjJIN0wyIDE3VjdaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQgNCkgc2NhbGUoLjY2KSI+PHBhdGggZD0iTTEyIDNWMTdNNiAxMUwxMiAxOEwxOCAxMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNSAyMkgxOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0iZDIwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik0xNiAySDlMNCA3VjE2TDkgMjFIMTdMMjEgMTdIMTRMMTAgMTNWN1oiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImwyMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNNSAxNkwxMiA4TDE5IDE2TTEyIDhWMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTAiIHk9IjIiIHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiM4MWNiZDEiLz48L2c+PC9nPjwvZz48ZyBpZD0ibDMwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3MiAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik01IDE5TDEyIDEyTDE5IDE5TTUgMTBMMTIgM0wxOSAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0ibWFwNSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgMkgxN0wyMiA3VjE3TDE3IDIySDdMMiAxN1Y3WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0IDQpIHNjYWxlKC42NikiPjxwYXRoIGQ9Ik0zIDVMOSAyTDE1IDVMMjEgMlYxOUwxNSAyMkw5IDE5TDMgMjJaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik05IDNWMTlNMTUgNVYyMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNSAxNUwxMCAxMEwxNCAxM0wxOSA4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4MWNiZDEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxyZWN0IHg9IjE3IiB5PSI2IiB3aWR0aD0iMyIgaGVpZ2h0PSIzIiBmaWxsPSIjMjIzMTQ5Ii8+PC9nPjwvZz48L2c+PGcgaWQ9ImxlZ2VuZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNMTIgMkwxNSA4SDIyTDE3IDEzTDE5IDIxTDEyIDE3TDUgMjFMNyAxM0wyIDhIOVoiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImNhcmQxMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTkgMlY2TTE1IDJWNk05IDE4VjIyTTE1IDE4VjIyTTIgOUg2TTIgMTVINk0xOCA5SDIyTTE4IDE1SDIyIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMyA4TDEwIDEzSDEzTDExIDE2TDE1IDExSDEyWiIgZmlsbD0iIzgxY2JkMSIgc3Ryb2tlPSIjODFjYmQxIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjwvZz48ZyBpZD0ic3Vydml2ZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgNDgpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik03IDJIMTdMMjIgN1YxN0wxNyAyMkg3TDIgMTdWN1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCA0KSBzY2FsZSguNjYpIj48cGF0aCBkPSJNMyA2TDYgM0g5TDEyIDZMMTUgM0gxOEwyMSA2VjEyTDEyIDIxTDMgMTJaIiBmaWxsPSIjZGY5MTdlIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9nPjwvc3ZnPgo=',
  equips: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzg0IiB2aWV3Qm94PSIwIDAgOTYgNzIiPjxnIGlkPSJ3ZWFwb24tMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAwKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNMTggM0gyMlY3TDEwIDE5TDYgMTVaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEzTDEyIDIwTTMgMjFMNyAxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTAgMTRMMTggNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGM5YmFjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJ3ZWFwb24tMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE4IDNIMjJWN0wxMCAxOUw2IDE1WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNSAxM0wxMiAyME0zIDIxTDcgMTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEwIDE0TDE4IDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzgxY2JkMSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0id2VhcG9uLTIiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ4IDApIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik0xNiAySDIxVjdMMTIgMTZMOSAxM1oiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTMgMjNMMTAgMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTcgMTVMMTEgMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U0YzM3OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHJlY3QgeD0iMTciIHk9IjUiIHdpZHRoPSIyIiBoZWlnaHQ9IjMiIGZpbGw9IiNlNGMzNzkiLz48L2c+PC9nPjxnIGlkPSJ3ZWFwb24tMyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzIgMCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTE0IDJIMTlWN0w5IDE3TDYgMTRaIiBmaWxsPSIjODFjYmQxIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik01IDEyTDEyIDE5TTMgMjJMNyAxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMyA5TDExIDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhjOWJhYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iYXJtb3ItMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjOGM5YmFjIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9ImFybW9yLTEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0IDI0KSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSBzY2FsZSguOTIpIj48cGF0aCBkPSJNOCAzSDE2TDIyIDhMMTkgMTRMMTcgMTJWMjJIN1YxMkw1IDE0TDIgOFoiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTggNUwxMiA4TDE2IDVWMjBIOFoiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTEyIDhWMjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0iYXJtb3ItMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDggMjQpIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxIDEpIHNjYWxlKC45MikiPjxwYXRoIGQ9Ik04IDNIMTZMMjIgOEwxOSAxNEwxNyAxMlYyMkg3VjEyTDUgMTRMMiA4WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNOCA1TDEyIDhMMTYgNVYyMEg4WiIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTIgOFYyMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNNCA4TDggMTBNMTYgMTBMMjAgOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTRjMzc5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48L2c+PC9nPjxnIGlkPSJhcm1vci0zIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3MiAyNCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTggM0gxNkwyMiA4TDE5IDE0TDE3IDEyVjIySDdWMTJMNSAxNEwyIDhaIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDVMMTIgOEwxNiA1VjIwSDhaIiBmaWxsPSIjYWE5OGM1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0xMiA4VjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik04IDE2SDE2IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PGcgaWQ9InJpbmctMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTcgNkgxN0wxOSA4VjE4TDE3IDIwSDdMNSAxOFY4WiIgZmlsbD0iI2VkZjNmNSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cGF0aCBkPSJNMTEgMTBIMTNMMTUgMTJWMTRMMTMgMTZIMTFMOSAxNFYxMloiIGZpbGw9IiNlZGYzZjUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PC9nPjwvZz48ZyBpZD0icmluZy0xIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iOSIgeT0iMSIgd2lkdGg9IjYiIGhlaWdodD0iMjIiIGZpbGw9IiM4YzliYWMiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNSIgeT0iNiIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEyIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjgiIHk9IjkiIHdpZHRoPSI4IiBoZWlnaHQ9IjYiIGZpbGw9IiM4MWNiZDEiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48ZyBpZD0icmluZy0yIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OCA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHBhdGggZD0iTTQgMTVWOEw4IDRIMTZMMjAgOFYxNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz48cmVjdCB4PSIzIiB5PSIxMiIgd2lkdGg9IjUiIGhlaWdodD0iOCIgZmlsbD0iI2U0YzM3OSIgc3Ryb2tlPSIjMjIzMTQ5IiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxNiIgeT0iMTIiIHdpZHRoPSI1IiBoZWlnaHQ9IjgiIGZpbGw9IiNlNGMzNzkiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48ZyBpZD0icmluZy0zIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3MiA0OCkiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkgc2NhbGUoLjkyKSI+PHJlY3QgeD0iNyIgeT0iMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZWRmM2Y1IiBzdHJva2U9IiMyMjMxNDkiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjkiIHk9IjUiIHdpZHRoPSI2IiBoZWlnaHQ9IjgiIGZpbGw9IiNhYTk4YzUiIHN0cm9rZT0iIzIyMzE0OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTEwIDE3SDE0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNGMzNzkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjwvZz48L2c+PC9zdmc+Cg==',
  wordmark: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMzIiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCAxMTYgMjgiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMgNCkgc2NhbGUoMi4yNSkiPjxwYXRoIGQ9Ik0wIDBoMXYxaC0xWk0xIDBoMXYxaC0xWk0yIDBoMXYxaC0xWk0zIDBoMXYxaC0xWk00IDBoMXYxaC0xWk0yIDFoMXYxaC0xWk0yIDJoMXYxaC0xWk0yIDNoMXYxaC0xWk0yIDRoMXYxaC0xWk0yIDVoMXYxaC0xWk0wIDZoMXYxaC0xWk0xIDZoMXYxaC0xWk0yIDZoMXYxaC0xWk0zIDZoMXYxaC0xWk00IDZoMXYxaC0xWk02IDBoMXYxaC0xWk03IDBoMXYxaC0xWk04IDBoMXYxaC0xWk05IDBoMXYxaC0xWk02IDFoMXYxaC0xWk0xMCAxaDF2MWgtMVpNNiAyaDF2MWgtMVpNMTAgMmgxdjFoLTFaTTYgM2gxdjFoLTFaTTEwIDNoMXYxaC0xWk02IDRoMXYxaC0xWk0xMCA0aDF2MWgtMVpNNiA1aDF2MWgtMVpNMTAgNWgxdjFoLTFaTTYgNmgxdjFoLTFaTTcgNmgxdjFoLTFaTTggNmgxdjFoLTFaTTkgNmgxdjFoLTFaTTEyIDBoMXYxaC0xWk0xMiAxaDF2MWgtMVpNMTIgMmgxdjFoLTFaTTEyIDNoMXYxaC0xWk0xMiA0aDF2MWgtMVpNMTIgNWgxdjFoLTFaTTEyIDZoMXYxaC0xWk0xMyA2aDF2MWgtMVpNMTQgNmgxdjFoLTFaTTE1IDZoMXYxaC0xWk0xNiA2aDF2MWgtMVpNMTggMGgxdjFoLTFaTTE5IDBoMXYxaC0xWk0yMCAwaDF2MWgtMVpNMjEgMGgxdjFoLTFaTTIyIDBoMXYxaC0xWk0xOCAxaDF2MWgtMVpNMTggMmgxdjFoLTFaTTE4IDNoMXYxaC0xWk0xOSAzaDF2MWgtMVpNMjAgM2gxdjFoLTFaTTIxIDNoMXYxaC0xWk0xOCA0aDF2MWgtMVpNMTggNWgxdjFoLTFaTTE4IDZoMXYxaC0xWk0xOSA2aDF2MWgtMVpNMjAgNmgxdjFoLTFaTTIxIDZoMXYxaC0xWk0yMiA2aDF2MWgtMVpNMjQgMGgxdjFoLTFaTTI4IDBoMXYxaC0xWk0yNCAxaDF2MWgtMVpNMjggMWgxdjFoLTFaTTI0IDJoMXYxaC0xWk0yOCAyaDF2MWgtMVpNMjQgM2gxdjFoLTFaTTI1IDNoMXYxaC0xWk0yNiAzaDF2MWgtMVpNMjcgM2gxdjFoLTFaTTI4IDNoMXYxaC0xWk0yNCA0aDF2MWgtMVpNMjggNGgxdjFoLTFaTTI0IDVoMXYxaC0xWk0yOCA1aDF2MWgtMVpNMjQgNmgxdjFoLTFaTTI4IDZoMXYxaC0xWk0zMCAwaDF2MWgtMVpNMzEgMGgxdjFoLTFaTTMyIDBoMXYxaC0xWk0zMyAwaDF2MWgtMVpNMzQgMGgxdjFoLTFaTTMwIDFoMXYxaC0xWk0zMCAyaDF2MWgtMVpNMzAgM2gxdjFoLTFaTTMxIDNoMXYxaC0xWk0zMiAzaDF2MWgtMVpNMzMgM2gxdjFoLTFaTTMwIDRoMXYxaC0xWk0zMCA1aDF2MWgtMVpNMzAgNmgxdjFoLTFaTTMxIDZoMXYxaC0xWk0zMiA2aDF2MWgtMVpNMzMgNmgxdjFoLTFaTTM0IDZoMXYxaC0xWk0zNiAwaDF2MWgtMVpNMzcgMGgxdjFoLTFaTTM4IDBoMXYxaC0xWk0zOSAwaDF2MWgtMVpNMzYgMWgxdjFoLTFaTTQwIDFoMXYxaC0xWk0zNiAyaDF2MWgtMVpNNDAgMmgxdjFoLTFaTTM2IDNoMXYxaC0xWk0zNyAzaDF2MWgtMVpNMzggM2gxdjFoLTFaTTM5IDNoMXYxaC0xWk0zNiA0aDF2MWgtMVpNMzggNGgxdjFoLTFaTTM2IDVoMXYxaC0xWk0zOSA1aDF2MWgtMVpNMzYgNmgxdjFoLTFaTTQwIDZoMXYxaC0xWk00MyAwaDF2MWgtMVpNNDQgMGgxdjFoLTFaTTQ1IDBoMXYxaC0xWk00MiAxaDF2MWgtMVpNNDYgMWgxdjFoLTFaTTQyIDJoMXYxaC0xWk00NiAyaDF2MWgtMVpNNDIgM2gxdjFoLTFaTTQ2IDNoMXYxaC0xWk00MiA0aDF2MWgtMVpNNDYgNGgxdjFoLTFaTTQyIDVoMXYxaC0xWk00NiA1aDF2MWgtMVpNNDMgNmgxdjFoLTFaTTQ0IDZoMXYxaC0xWk00NSA2aDF2MWgtMVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC41IC43NSkiIGZpbGw9IiM4MWNiZDEiLz48cGF0aCBkPSJNMCAwaDF2MWgtMVpNMSAwaDF2MWgtMVpNMiAwaDF2MWgtMVpNMyAwaDF2MWgtMVpNNCAwaDF2MWgtMVpNMiAxaDF2MWgtMVpNMiAyaDF2MWgtMVpNMiAzaDF2MWgtMVpNMiA0aDF2MWgtMVpNMiA1aDF2MWgtMVpNMCA2aDF2MWgtMVpNMSA2aDF2MWgtMVpNMiA2aDF2MWgtMVpNMyA2aDF2MWgtMVpNNCA2aDF2MWgtMVpNNiAwaDF2MWgtMVpNNyAwaDF2MWgtMVpNOCAwaDF2MWgtMVpNOSAwaDF2MWgtMVpNNiAxaDF2MWgtMVpNMTAgMWgxdjFoLTFaTTYgMmgxdjFoLTFaTTEwIDJoMXYxaC0xWk02IDNoMXYxaC0xWk0xMCAzaDF2MWgtMVpNNiA0aDF2MWgtMVpNMTAgNGgxdjFoLTFaTTYgNWgxdjFoLTFaTTEwIDVoMXYxaC0xWk02IDZoMXYxaC0xWk03IDZoMXYxaC0xWk04IDZoMXYxaC0xWk05IDZoMXYxaC0xWk0xMiAwaDF2MWgtMVpNMTIgMWgxdjFoLTFaTTEyIDJoMXYxaC0xWk0xMiAzaDF2MWgtMVpNMTIgNGgxdjFoLTFaTTEyIDVoMXYxaC0xWk0xMiA2aDF2MWgtMVpNMTMgNmgxdjFoLTFaTTE0IDZoMXYxaC0xWk0xNSA2aDF2MWgtMVpNMTYgNmgxdjFoLTFaTTE4IDBoMXYxaC0xWk0xOSAwaDF2MWgtMVpNMjAgMGgxdjFoLTFaTTIxIDBoMXYxaC0xWk0yMiAwaDF2MWgtMVpNMTggMWgxdjFoLTFaTTE4IDJoMXYxaC0xWk0xOCAzaDF2MWgtMVpNMTkgM2gxdjFoLTFaTTIwIDNoMXYxaC0xWk0yMSAzaDF2MWgtMVpNMTggNGgxdjFoLTFaTTE4IDVoMXYxaC0xWk0xOCA2aDF2MWgtMVpNMTkgNmgxdjFoLTFaTTIwIDZoMXYxaC0xWk0yMSA2aDF2MWgtMVpNMjIgNmgxdjFoLTFaTTI0IDBoMXYxaC0xWk0yOCAwaDF2MWgtMVpNMjQgMWgxdjFoLTFaTTI4IDFoMXYxaC0xWk0yNCAyaDF2MWgtMVpNMjggMmgxdjFoLTFaTTI0IDNoMXYxaC0xWk0yNSAzaDF2MWgtMVpNMjYgM2gxdjFoLTFaTTI3IDNoMXYxaC0xWk0yOCAzaDF2MWgtMVpNMjQgNGgxdjFoLTFaTTI4IDRoMXYxaC0xWk0yNCA1aDF2MWgtMVpNMjggNWgxdjFoLTFaTTI0IDZoMXYxaC0xWk0yOCA2aDF2MWgtMVpNMzAgMGgxdjFoLTFaTTMxIDBoMXYxaC0xWk0zMiAwaDF2MWgtMVpNMzMgMGgxdjFoLTFaTTM0IDBoMXYxaC0xWk0zMCAxaDF2MWgtMVpNMzAgMmgxdjFoLTFaTTMwIDNoMXYxaC0xWk0zMSAzaDF2MWgtMVpNMzIgM2gxdjFoLTFaTTMzIDNoMXYxaC0xWk0zMCA0aDF2MWgtMVpNMzAgNWgxdjFoLTFaTTMwIDZoMXYxaC0xWk0zMSA2aDF2MWgtMVpNMzIgNmgxdjFoLTFaTTMzIDZoMXYxaC0xWk0zNCA2aDF2MWgtMVpNMzYgMGgxdjFoLTFaTTM3IDBoMXYxaC0xWk0zOCAwaDF2MWgtMVpNMzkgMGgxdjFoLTFaTTM2IDFoMXYxaC0xWk00MCAxaDF2MWgtMVpNMzYgMmgxdjFoLTFaTTQwIDJoMXYxaC0xWk0zNiAzaDF2MWgtMVpNMzcgM2gxdjFoLTFaTTM4IDNoMXYxaC0xWk0zOSAzaDF2MWgtMVpNMzYgNGgxdjFoLTFaTTM4IDRoMXYxaC0xWk0zNiA1aDF2MWgtMVpNMzkgNWgxdjFoLTFaTTM2IDZoMXYxaC0xWk00MCA2aDF2MWgtMVpNNDMgMGgxdjFoLTFaTTQ0IDBoMXYxaC0xWk00NSAwaDF2MWgtMVpNNDIgMWgxdjFoLTFaTTQ2IDFoMXYxaC0xWk00MiAyaDF2MWgtMVpNNDYgMmgxdjFoLTFaTTQyIDNoMXYxaC0xWk00NiAzaDF2MWgtMVpNNDIgNGgxdjFoLTFaTTQ2IDRoMXYxaC0xWk00MiA1aDF2MWgtMVpNNDYgNWgxdjFoLTFaTTQzIDZoMXYxaC0xWk00NCA2aDF2MWgtMVpNNDUgNmgxdjFoLTFaIiBmaWxsPSIjMjIzMTQ5Ii8+PC9nPjxwYXRoIGQ9Ik00IDI1SDMwTTM1IDI1SDQ5IiBzdHJva2U9IiM4YzliYWMiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik0xMDUgMjNIMTExVjI1SDEwNVoiIGZpbGw9IiM4MWNiZDEiLz48L3N2Zz4K',
};

;
/* 由 tools/pack_font.py 產生：Cubic 11 像素字體（SIL OFL 1.1）的子集 */
(function(){ const s = document.createElement('style'); s.textContent = '@font-face{font-family:"Cubic 11";src:url(data:font/woff2;base64,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) format("woff2");font-weight:400;font-style:normal;font-display:swap}@font-face{font-family:"Cubic 11 LCD";src:url(data:font/woff2;base64,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) format("woff2");font-weight:400;font-style:normal;font-display:swap}'; document.head.appendChild(s); })();

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
  const g = new T3.Group(), hex = SLIME_HEX[biomeNow()%6], jelly = new T3.Group(); g.add(jelly); g.userData.jelly = jelly;
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
  const g = new T3.Group(), hex = ['#9fb8e8', '#e8c27a', '#bfe6ff', '#e89a8a', '#7a8fe8', '#ffb0d8'][biomeNow()%6];
  mk(ico(1, 1), ownMat(g, hex), 0, 8, 0, g).scale.set(4.2, 2.6, 4.2); mk(ico(.9, 0), ownMat(g, '#ffffff'), 0, 9.6, -.4, g).scale.set(2, 1, 2);
  mk(ico(1, 0), basic('#ff3a5a'), 0, 8, 3.9, g).scale.set(1.1, 1.1, .6); mk(cylG(.12, .12, 2.4, 4), ownMat(g, '#2b2552'), 0, 11.2, -1, g);
  const ro = []; for (const sx of [-1, 1]){ mk(new T3.BoxGeometry(.5, 1.6, .5), ownMat(g, '#2b2552'), sx*4.2, 8.6, 0, g); const r = mk(cylG(3.4, 3.4, .22, 12), ownMat(g, '#ffffff', { transparent:true, opacity:.55 }), sx*4.2, 9.5, 0, g); ro.push(r); }
  g.userData.rotors = ro; g.userData.s = .9; g.scale.setScalar(.9); g.rotation.order='YXZ';addShadow(g,3.6);return g;
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
  g.scale.setScalar(k*({ vend:1.45, lamp:1.4, rail:1.3, cone:1.5, rock:1.2 }[kind] || 1)); addShadow(g,3.6);return kind==='vent'?g:bake(g);
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
  if(bi>=6){mk(new T3.BoxGeometry(2,9,2),m3(BIOMES[bi].board.d),0,4.5,0,t);for(const yy of [4,7,10])mk(new T3.BoxGeometry(bi%2?5:3,.6,3),m3(BIOMES[bi].glow),0,yy,0,t);}
  else if (bi === 0){ mk(cylG(.9, 1.3, 6, 6), m3('#a8785a'), 0, 3, 0, t); for (const [cx, cy, cz, r, c] of [[0, 8.6, 0, 4.2, '#5fbf7a'], [2.2, 7.2, 1.2, 3, '#79d18e'], [-1.8, 10.4, -.6, 2.8, '#8fe0a0']]) mk(ico(r, 0), m3(c), cx, cy, cz, t); }
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
  for (let r = 0; r < rows + 16; r++) for (let c = 0; c < 4; c++){ cx.fillStyle = (r + c) % 2 ? '#fff6fb' : ['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc', '#6fe0f0', '#ffb0e0'][bi%6]; cx.fillRect(c, r, 1, 1); }
  const tx = new T3.CanvasTexture(cv); tx.magFilter = T3.NearestFilter; tx.minFilter = T3.NearestFilter; tx.colorSpace = T3.SRGBColorSpace;
  const cvh = document.createElement('canvas'); cvh.width = rows + 16; cvh.height = 4; { const c2 = cvh.getContext('2d'); for (let r = 0; r < rows + 16; r++) for (let c = 0; c < 4; c++){ c2.fillStyle = (r + c) % 2 ? '#fff6fb' : ['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc', '#6fe0f0', '#ffb0e0'][bi%6]; c2.fillRect(r, c, 1, 1); } }
  const txh = new T3.CanvasTexture(cvh); txh.magFilter = txh.minFilter = T3.NearestFilter; txh.colorSpace = T3.SRGBColorSpace;
  mk(new T3.PlaneGeometry(10, ID).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:tx }), 15, BZ + .08, icy, g);   // 十字步道：連到四個出口
  mk(new T3.BoxGeometry(11, .3, ID), m3(B.board.d), 15, BZ - .1, icy, g);
  mk(new T3.PlaneGeometry(IW, 10).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:txh }), icx, BZ + .09, 15 + 21, g);
  mk(new T3.BoxGeometry(IW, .3, 11), m3(B.board.d), icx, BZ - .12, icy, g);
  // 中央廣場：主角站的圓形平台，外圈粉色
  mk(cylG(15, 15.6, .5, 28), m3(B.board.d), HX, BZ + .05, HY, g); mk(cylG(14, 14, .6, 28), m3('#fff6fb'), HX, BZ + .1, HY, g);
  mk(new T3.RingGeometry(9.6, 10.6, 28).rotateX(-Math.PI/2), basic(['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc', '#6fe0f0', '#ffb0e0'][bi%6]), HX, BZ + .42, HY, g); mk(new T3.RingGeometry(4.2, 4.8, 24).rotateX(-Math.PI/2), basic(B.glow, .8), HX, BZ + .43, HY, g);
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
  if(bi>=6)g.add(buildRegionLandmark(bi));
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
  g.updateMatrixWorld(true);const fixed=new T3.Group(),animated=new Set([...glows,...rings]),parts=[];g.traverse(o=>{if(o.isMesh&&!animated.has(o))parts.push(o);});
  for(const o of parts){const copy=o.clone();copy.matrixAutoUpdate=false;copy.matrix.copy(o.matrixWorld);fixed.add(copy);o.removeFromParent();}g.add(bake(fixed));
  g.userData = { glows, rings }; return g;
}

/* ---------- 掉落物 ---------- */
function buildDrop(d){
  const g = new T3.Group(), col = d.kind === 'gem' ? '#a87bf0' : d.kind === 'cart' ? '#3fd0ee' : d.kind === 'map' ? BIOMES[d.map.biome].glow : d.kind==='gold'?'#e4ba58':d.kind==='chip'?'#62c8ce':RAR[d.it.r].g, rare = !['gold','chip'].includes(d.kind)&&(d.kind !== 'item' || d.it.r >= 2), item = new T3.Group(); g.add(item); g.userData.item = item;
  if (d.kind === 'cart'){ mk(new T3.BoxGeometry(2.6, 3.2, .9), m3(col, { emissive:col, emissiveIntensity:.3 }), 0, 2.4, 0, item); mk(new T3.BoxGeometry(1.6, .9, 1.1), m3('#fff0c0'), 0, 3.2, 0, item); }
  else if (d.kind === 'gem') mk(new T3.OctahedronGeometry(1.7, 0), m3(col, { emissive:col, emissiveIntensity:.25 }), 0, 2.2, 0, item);
  else if (d.kind === 'map'){ mk(cylG(.9, .9, 4.4, 6), m3('#fff0c0'), 0, 1.6, 0, item).rotation.z = Math.PI/2; for (const sx of [-2.3, 2.3]) mk(ico(.7, 0), m3('#ffd35a'), sx, 1.6, 0, item); mk(ico(.7, 0), m3(BIOMES[d.map.biome].portal, { emissive:col, emissiveIntensity:.4 }), 0, 2.6, 0, item); }
  else if(d.kind==='gold'){mk(cylG(1.4,1.4,.6,6),m3('#e4ba58'),0,1,0,item).rotation.z=.2;}
  else if(d.kind==='chip'){mk(new T3.BoxGeometry(2.8,.5,2.8),m3('#62c8ce'),0,1,0,item);mk(new T3.BoxGeometry(1.3,.6,1.3),m3('#24364d'),0,1.5,0,item);}
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
  if(ps.simple){g.scale.setScalar(base*(m.type==='crab'?1.15:1));g.position.y+=(m.type==='wisp'?7+Math.sin(t*3)*2:Math.abs(Math.sin(t*7))*.8)+lg*3;g.rotation.x=lg*.3;}
  else if (m.type === 'slime'){ g.scale.setScalar(base); const sq = 1 + .16*Math.sin(t*5) + (m.lunge >= 0 ? .35*Math.sin(Math.PI*m.lunge/.3) : 0); ps.jelly.scale.set(Math.sqrt(sq), 1/sq, Math.sqrt(sq)); g.position.y += lg*4; g.rotation.x = -.35*lg; }
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
  const fx=R3.fx,pool=R3.fxPool||(R3.fxPool=[]);for(const o of pool)o.visible=false;let used=0;
  const dummy=R3.fxDummy||(R3.fxDummy=new T3.Object3D()),budget=160;
  const add=(geom,col,opacity,x,y,z,s=1)=>{
    if(used>=budget)return dummy;
    let o=pool[used++];if(!o){o=new T3.Mesh(geom,new T3.MeshBasicMaterial({transparent:true,depthWrite:false,side:T3.DoubleSide}));pool.push(o);fx.add(o);}
    o.visible=true;o.geometry=geom;o.material.color.set(col||'#ffffff');o.material.opacity=Math.max(0,Math.min(1,opacity));o.position.set(x,z,y);o.scale.setScalar(s);o.rotation.set(0,0,0);return o;
  };
  const sph=geo('fxs',()=>ico(1,1)),disc=geo('fxd',()=>new T3.CircleGeometry(1,20).rotateX(-Math.PI/2)),ring=geo('fxr',()=>new T3.RingGeometry(.83,1,24).rotateX(-Math.PI/2)),box=geo('fxf',()=>new T3.BoxGeometry(1,.25,1));
  for(const e of G.fx){const fade=1-e.t;
    if(e.k==='pickup'){const x=tLerp(e.x,e.x2,ease(e.t)),y=tLerp(e.y,e.y2,ease(e.t));add(sph,e.col,1-e.t,x,y,BZ+2+Math.sin(e.t*Math.PI)*5,.8);continue;}
    if(e.k==='warning'){add(ring,e.col||'#ff8a4a',.75,e.x,e.y,BZ+.4,9);continue;}
    if(e.k==='ring'||e.k==='nova'){const r=tLerp(2,e.k==='nova'?48:24,ease(e.t)),x=e.k==='nova'?G.h.x:e.x,y=e.k==='nova'?G.h.y:e.y;add(ring,e.col||'#9fe0ff',fade*.95,x,y,BZ+.6,r);add(disc,e.col||'#9fe0ff',fade*.16,x,y,BZ+.4,r*.9);}
    if(e.k==='pillar'){const o=add(geo('fxp',()=>new T3.CylinderGeometry(1,1,1,8,1,true)),e.col,fade*.55,e.x,e.y,BZ+14*e.t+8);o.scale.set(4*fade+1,22+14*e.t,4*fade+1);}
    if(e.k==='shard'||e.k==='nova'){const n=e.k==='nova'?8:5;for(let i=0;i<n;i++){const a=i*6.283/n+e.t,d=tLerp(1,e.k==='nova'?40:12,ease(e.t));const o=add(box,i%2?e.col||'#9fe0ff':'#ffffff',fade*.9,(e.x??G.h.x)+Math.cos(a)*d,(e.y??G.h.y)+Math.sin(a)*d,(e.z??BZ)+2+Math.sin(e.t*3.14)*8,fade+1);o.rotation.y=a;}}
    if(e.k==='ghost')for(let i=0;i<4;i++){const u=i/3;add(geo('fxg',()=>new T3.CylinderGeometry(1.6,2.2,1,6)),e.col,fade*(.1+.35*u),tLerp(e.x,e.x2,u),tLerp(e.y,e.y2,u),BZ+8).scale.set(1,15,1);}
    if(e.k==='boom'){const r=tLerp(2,e.big?20:11,ease(e.t));add(sph,e.col||'#ff9a3c',fade*.75,e.x,e.y,e.z,r);add(sph,'#ffe08a',fade,e.x,e.y,e.z,r*.5);add(ring,e.col||'#ff9a3c',fade,e.x,e.y,BZ+.5,r*1.4);}
    if(e.k==='slash')for(let i=0;i<5;i++){const a=i*1.2566+.4,r=tLerp(4,11,e.t),o=add(geo('fxb',()=>new T3.BoxGeometry(1,.22,.22)),'#ffffff',fade,e.x+2+Math.cos(a)*r*.7,e.y,e.z+Math.sin(a)*r*.7,r*.7);o.rotation.z=a;}
    if(e.k==='bolt'){for(let i=1;i<e.pts.length;i++){const a=e.pts[i-1],b=e.pts[i],len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),o=add(geo('fxc',()=>new T3.CylinderGeometry(.65,.65,1,4)),'#ffec8a',fade,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);o.scale.set(1,len,1);o.quaternion.setFromUnitVectors(new T3.Vector3(0,1,0),new T3.Vector3(b[0]-a[0],b[2]-a[2],b[1]-a[1]).normalize());}}
  }
  for(const p of G.proj){if(p.t<0)continue;const u=tClamp(p.t);
    if(p.k==='meteor'){const z=tLerp(70,BZ+2,u*u),r=tLerp(2,9,u),a=u*5;add(disc,'#ff7048',.2+.3*u,p.x,p.y,BZ+.3,r);const core=add(geo('satB',()=>new T3.BoxGeometry(3,3,3)),'#ffd35a',1,p.x,p.y,z);core.rotation.set(u*3,a,.4);for(const sx of[-1,1]){const panel=add(geo('satP',()=>new T3.BoxGeometry(5,.25,2.6)),'#526fdb',1,p.x+Math.cos(a)*sx*4.4,p.y+Math.sin(a)*sx*4.4,z);panel.rotation.y=-a;}add(sph,'#ffe08a',.4,p.x,p.y,z+4,6);continue;}
    if(!p.tg)continue;const a=[G.h.x+3.4,G.h.y-3.6,BZ+9.2*CK],b=[p.tg.x,p.tg.y,BZ+6*CK],at=v=>[tLerp(a[0],b[0],v),tLerp(a[1],b[1],v),tLerp(a[2],b[2],v)+Math.sin(v*Math.PI)*5];
    for(let k=3;k>=1;k--){const q=at(Math.max(0,u-k*.07));add(sph,k%2?'#ffe08a':'#ff9a3c',.55-k*.1,q[0],q[1],q[2],1.2-k*.2);}
    const q=at(u),o=add(geo('batB',()=>cylG(1,1,3,8)),'#28354d',1,q[0],q[1],q[2]);o.rotation.set(u*14,0,u*9);add(sph,'#ff7a2a',.85,q[0],q[1],q[2]+1,1.1);
  }
}

function overlay(){
  const k = pxu(); let s = '';
  const bar = (x, y, z, w, pct, col) => { const [X, Y] = pj(x, y, z), W2 = w*k*.8, H2 = 1.5*k; return `<rect x="${(X - W2/2).toFixed(1)}" y="${Y.toFixed(1)}" width="${W2.toFixed(1)}" height="${H2.toFixed(1)}" rx="${(H2/2).toFixed(1)}" fill="#2b2552" opacity=".55"/>` + (pct > 0 ? `<rect x="${(X - W2/2 + .5).toFixed(1)}" y="${(Y + .5).toFixed(1)}" width="${Math.max(0, (W2 - 1)*tClamp(pct)).toFixed(1)}" height="${(H2 - 1).toFixed(1)}" rx="${((H2 - 1)/2).toFixed(1)}" fill="${col}"/>` : ''); };
  if (G.h.dead <= 0) s += bar(G.h.x, G.h.y, BZ + 36*CK, 9, G.h.hp/G.st.life, '#ff6a8a');
  for (const m of G.mons) if (!m.dead && (m.boss || m.hp < m.hpMax*.999)) s += bar(m.x, m.y, BZ + (m.type === 'slime' ? 11 : m.boss ? 40 : m.type === 'brute' ? 32 : m.type === 'drone' ? 24 : m.type === 'bomb' ? 20 : 28)*CK, 8, m.hp/m.hpMax, '#ff6a8a');
  if(G.h.dead<=0&&G.time<(G.h.bufferUntil||0)&&G.h.buffer>0)s+=bar(G.h.x,G.h.y,BZ+40*CK,9,G.h.buffer/(G.st.life*.12),'#57dce8');
  for(const m of G.mons)if(!m.dead&&m.shield>0)s+=bar(m.x,m.y,BZ+(m.boss?44:32)*CK,8,m.shield/m.shieldMax,'#57dce8');
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
    R3.bi = bi; { const SK = BIOMES[bi].sky || [['#8fcdf7', '#c9e9ff', '#f5fbff'], ['#ffc98a', '#ffe6bf', '#fff7ea'], ['#a9d8ff', '#d9efff', '#ffffff'], ['#c07a9a', '#e9b4cc', '#ffe2ee'], ['#141450', '#3a3a8c', '#7a6ad0'], ['#ffa6d6', '#ffd0ee', '#fff0fa']][bi%6] || []; SK.forEach((c, i) => document.documentElement.style.setProperty('--sk' + i, c)); }
    for (const o of [R3.gnd, R3.portal, ...R3.decor]) o && R3.world.remove(o);
    R3.gnd = buildGround(bi); R3.world.add(R3.gnd); R3.portal = buildPortal(); R3.world.add(R3.portal); R3.decor = [];const staticDecor=new T3.Group();
    (DECO[bi]||DECO[0]).forEach(([kind, x, y, k], n) => { for (let j = 0; j < 2; j++){ let a = (n*2 + j)*.95 + .5, px, py; for (let t = 0; t < 8; t++){ px = HX + Math.cos(a)*(30 + (n*5 + j*3)%14)*1.15; py = HY + Math.sin(a)*(30 + (n*5 + j*3)%14); if (Math.abs(px - HX) > 8 && Math.abs(py - HY) > 8) break; a += .45; } const o = buildDeco(kind, k); o.scale.multiplyScalar(CK); at3(o,px,py,BZ);if(o.userData.glow){R3.world.add(o);R3.decor.push(o);}else staticDecor.add(o); } });
    const decorBatch=bake(staticDecor);R3.world.add(decorBatch);R3.decor.push(decorBatch);
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
  for (const m of G.mons){ const g = entFor(m, () => m.boss?buildCircuitBoss(biomeNow()):['spider','speaker','wisp','crab'].includes(m.type)?buildCircuitMon(m.type):m.type === 'slime' ? buildSlime() : m.type === 'skel' ? buildSkel() : m.type === 'drone' ? buildDrone() : m.type === 'bomb' ? buildBomb() : buildBrute(m.boss)); monLook(m, g); }
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

/* 新怪物以少數合批網格形成完全不同的輪廓，不增加骨架負擔。 */
function buildCircuitMon(type){
 const g=new T3.Group(),dark=m3('#27364d'),silver=m3('#a3b9ca'),glow=m3(type==='wisp'?'#b99af0':'#67d5d5');
 if(type==='spider'){mk(ico(4,0),dark,0,4,0,g).scale.set(1.2,.7,1.4);for(const sx of[-1,1])for(let i=0;i<4;i++){const leg=mk(new T3.BoxGeometry(7,.7,.7),silver,sx*5,2,(i-1.5)*2,g);leg.rotation.z=sx*.35;leg.rotation.y=(i-1.5)*.25;}mk(ico(1.6,0),glow,0,4,4,g);}
 if(type==='speaker'){mk(new T3.BoxGeometry(7,11,5),dark,0,5.5,0,g);for(const y of[3,8])mk(cylG(2.3,2.3,.7,10),glow,0,y,2.7,g).rotation.x=Math.PI/2;mk(new T3.BoxGeometry(9,1,6),silver,0,11,0,g);}
 if(type==='wisp'){mk(new T3.OctahedronGeometry(4,0),glow,0,5,0,g).scale.set(.7,1.8,.7);mk(new T3.TorusGeometry(4.8,.5,4,12),silver,0,5,0,g).rotation.x=.7;for(const sx of[-1,1])mk(ico(.8,0),dark,sx*1.3,6,2,g);}
 if(type==='crab'){mk(cylG(5,6,4,6),silver,0,3,0,g);for(const sx of[-1,1]){mk(new T3.BoxGeometry(6,2,2),dark,sx*6,3,0,g);mk(new T3.ConeGeometry(2,5,4),glow,sx*8,4,2,g).rotation.z=-sx*.7;}mk(new T3.BoxGeometry(6,1,1),dark,0,5,4,g);}
 const out=bake(g);out.userData.simple=true;out.userData.mats=[];out.traverse(o=>{if(o.isMesh&&o.material.emissive){o.material=o.material.clone();out.userData.mats.push(o.material);}});return out;
}
function buildRegionLandmark(bi){
 const g=new T3.Group(),B=BIOMES[bi],steel=m3('#43516a'),silver=m3('#a5b8c9'),light=m3(B.glow,{emissive:B.glow,emissiveIntensity:.25});
 const block=(x,y,z,w,h,d,mat=steel)=>mk(new T3.BoxGeometry(w,h,d),mat,x,y,z,g);
 if(bi===6){for(const x of[-28,56]){block(x,BZ+13,72,3,26,3);mk(new T3.TorusGeometry(7,.6,4,12),light,x,BZ+28,72,g).rotation.x=.4;for(let i=0;i<3;i++)block(x,BZ+8+i*7,72,12-i*2,.6,2,silver);}}
 if(bi===7){for(let i=0;i<5;i++){block(-26+i*20,BZ,82,17,1,14,silver);block(-26+i*20,BZ+4,83,8,7,5,m3(i%2?B.board.m:'#b2a18b'));}block(59,BZ+12,72,2,24,2);block(44,BZ+24,72,32,2,2);}
 if(bi===8){for(const x of[-28,58]){block(x,BZ+9,76,3,18,3,light);block(x,BZ+17,76,20,2,4,steel);block(x,BZ+20,76,26,2,5,light);}for(let i=0;i<4;i++)block(-30+i*28,BZ+2,82,5,4,5,silver);}
 if(bi===9){for(let i=0;i<5;i++){block(-24+i*19,BZ+9,80,11,18,7);for(let j=0;j<6;j++)block(-24+i*19,BZ+2+j*2.5,84,8,.6,.4,j%2?light:silver);}}
 if(bi===10){for(const x of[-24,55])block(x,BZ+9,81,4,18,6,silver);block(15,BZ+19,81,110,3,13);for(let i=0;i<9;i++)block(-28+i*12,BZ+21,81,5,.3,1,light);}
 if(bi===11){for(const x of[-24,56]){for(let i=0;i<9;i++)block(x+i*.9,BZ+i*.8,75+i*.8,8,.8,2,silver);block(x,BZ+15,85,14,4,3,light);block(x,BZ+7,85,2,14,2);}}
 return g;
}
function buildCircuitBoss(bi){const g=buildCircuitMon(['speaker','crab','wisp','spider'][bi%4]);g.userData.s=2.4;return g;}

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
    <div class="mct" style="margin:8px 0 3px">怪物</div><ul class="ach">${MONSTER_GUIDE.map(([id, n, d]) => { const k = (G.mk || {})[id] || 0; return `<li class="${k ? 'got' : 'mute'}"><b>${k ? n : '？？？'}</b> ${k ? `${d}（擊殺 ${k}）` : '還沒遇到'}</li>`; }).join('')}</ul>
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
  if(!settings) $('mbody').innerHTML = modalTab === 'warehouse' ? warehouseHtml() : modalTab === 'char' ? uiCharacterHtml() : modalTab === 'skills' ? skillsHtml() : modalTab === 'tree' ? treeHtml() : modalTab === 'maps' ? mapsHtml() : modalTab === 'goals' ? goalsHtml() : modalTab === 'ach' ? `<div class="rpgm">${achHtml()}</div>` : modalTab === 'craft' ? craftHtml() : modalTab === 'dress' ? dressHtml() : modalTab === 'dex' ? `<div class="rpgm">${codexHtml()}</div>` : modalTab === 'log' ? logHtml() : modalTab === 'save' ? saveHtml() : uiMenuHtml();
  uxRestorePanel(uxPanel,resetScroll);if(resetScroll)uxAnimatePanel();
  UI_LIVE_SIGNATURE=uiLiveSignature();uiCityRevealCheckpoint();
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
  return `<section class="ui-build" aria-label="構築配置"><div><b>構築</b>${[0,1,2].map(i=>`<button class="mb" aria-label="構築 ${i+1}" aria-pressed="${(G.bi||0)===i}" onclick="switchBuild(${i})">${i+1}</button>`).join('')}</div><p class="uxmeta">切換時保存目前配置；裝備記住同一實體，改機後各引用同步。</p><button class="mb" data-focus="build-save" onclick="uiSaveBuild()">更新目前構築</button><p class="uxmeta">${G.builds[G.bi||0]?.equipment?'已記住角色與三件裝備，引用物品受回收保護。':'此配置尚未記住裝備；可按更新保存。'}</p>${uiBuildGearHtml()}${uiPolicyHtml()}</section>`;
}
function dpsBar(){
  const sk = G.st.sk || {}, ids = Object.keys(sk), tot = ids.reduce((a, id) => a+sk[id].direct*sk[id].estimatedCasts, 0) || 1;
  return `<div class="dpsbar"><div>單體直傷預估 <b>${tFmt(G.st.dps)}</b> <span id="pzdelta" class="mute"></span></div><div class="shares">${ids.map(id => `<span style="flex:${Math.max(1, Math.round(sk[id].direct*sk[id].estimatedCasts/tot*100))}" title="${SKILLS[id].n}">${SKILLS[id].n}</span>`).join('')}</div>${uxPieceDetails()}</div>`;
}
let BUILD_PENDING=null;
function switchBuild(i){if(i===(G.bi||0))return;const result=restoreBuild(i);if(result.missing?.length&&!result.ok){BUILD_PENDING={index:i,target:JSON.stringify(G.builds[i])};showOverlay(`<h2 class="uxdialog-title">構築 ${i+1} 缺少裝備</h2><p>${result.missing.map(slot=>SLOTN[slot]).join('、')}已不存在，尚未切換。可保留缺件部位的目前裝備，載入其餘配置。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="BUILD_PENDING=null;hideOverlay()">保留目前構築</button><button class="mb pri" onclick="uiConfirmBuildFallback()">缺件沿用目前裝備</button></div>`);return;}uiFinishBuild(result,i);}
function uiFinishBuild(result,i){if(!result.ok){uxAnnounce(result.reason);return;}selPiece=null;held=null;renderModal();uxAnnounce(`已切換構築 ${i+1}${result.legacy?'，舊配置沿用目前裝備':'，已載入裝備並關閉自動換裝'}。`);}
function uiConfirmBuildFallback(){const p=BUILD_PENDING;BUILD_PENDING=null;hideOverlay();if(!p||JSON.stringify(G.builds[p.index])!==p.target){uxAnnounce('配置已變動，請重新確認。');return;}uiFinishBuild(restoreBuild(p.index,true),p.index);}
function uiSaveBuild(){if(!saveBuild()){uxAnnounce('城市或訓練進行中，或倉庫已滿，尚未更新構築。');return;}renderModal();uxAnnounce('已保存技能、天賦、角色、策略及三件裝備；引用裝備受回收保護。');}
function skillsHtml(){
  return buildBar() + dpsBar() + circuitShopHtml() + skillsHtml0();
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
  h+=uiInventoryHtml()+uiResolvedHtml()+uiCombatHtml();
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
  for (const id in TREE){ const n = TREE[id], got = id === 'S' || G.pass.includes(id), open = canAllocateTalent(id), x = n.x.toFixed(1), y = n.y.toFixed(1), r = n.big ? 6.6 : 4;
    const fill = got ? n.col : '#eef3ff', stroke = got ? '#ffffff' : open ? '#2b2552' : '#c3cbe8', sw = got ? 2 : open ? 1.8 : 1.2;
    const shape = n.big ? `<polygon points="${star(+x, +y, r + 1.6, r*.55)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>`;
    nodes += `<g class="tn ${got ? 'got' : open ? 'open' : 'locked'}" data-tree="${id}" role="button" tabindex="${open?0:-1}" aria-disabled="${!open}" aria-label="${uxEsc(talentName(id))}，${got?'已點亮':open?'可點亮':'未連到或點數不足'}" onfocus="treeInfo('${id}')" onmouseover="treeInfo('${id}')" onclick="treeInfo('${id}');allocPass('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();allocPass('${id}')}" style="cursor:${open ? 'pointer' : 'default'}"><title>${talentName(id)}</title>${got ? `<circle cx="${x}" cy="${y}" r="${r + 2.4}" fill="${n.col}" opacity=".28"/>` : ''}${shape}${got && !n.big ? `<circle cx="${(+x - r*.3).toFixed(1)}" cy="${(+y - r*.35).toFixed(1)}" r="${(r*.28).toFixed(1)}" fill="#fff" opacity=".8"/>` : ''}</g>`; }
  return `${uiTalentBudget()}<div class="hint">可用天賦點：<b>${pts}</b>（最多 36 點，最多兩個韌體）。點亮與已點亮節點相連的點。</div>
    <svg viewBox="-125 -125 250 250" class="tree">${lines}${nodes}</svg>${treeAvailableHtml()}
    <div id="tinfo" class="hint">滑過節點看效果。<span style="color:#e2584d">紅：力量</span> <span style="color:#3f86e6">藍：智慧</span> <span style="color:#3bb552">綠：敏捷</span></div>
    <button class="mb" ${G.run?.city||G.train?'disabled':''} onclick="uiRespec()">洗點（${tFmt(100*G.lvl)}g）</button>`;
}
function treeInfo(id){ const n = TREE[id], el = $('tinfo'); if (el) el.textContent = id === 'S' ? '起點' : `${talentName(id)}${nodeOpen(id) ? '' : G.pass.includes(id) ? '（已點亮）' : '（未連到）'}`; }
function nextStep(){
  if(G.run?.city?.awaitChoice)return {t:'城市路段完成，選擇下一段或帶回碎片',tab:'maps'};
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
function allocPass(id){ if (G.run?.city||G.train||!canAllocateTalent(id)) return; G.pass.push(id); recalc(); logLine(`天賦：${talentName(id)}`, '#2f7fc4'); renderModal(); }
function respec(){if(G.run?.city||G.train)return; const cost = 100*G.lvl; if (!G.pass.length || G.gold < cost) return; G.gold -= cost; G.pass = [];G.legacyMode=false; recalc(); renderModal(); }
function enterMap(id){
  if (G.run||G.train) return; const i = G.maps.findIndex(m => m.id === id); if (i < 0) return;
  const map = G.maps.splice(i, 1)[0]; G.run = { map, kills:0, need:80, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine(`進入地圖：${BIOMES[map.biome].n} Lv. ${map.lvl}`, '#2f7fc4'); closeModal();
}
function abandonMap(){if(G.run?.city){cityFinish(false);renderModal();return;} if (!G.run) return; G.run = null; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8; logLine('放棄了地圖', '#857d6e'); renderModal(); }
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
function hideOverlay(){ craftPending=null;UI_RESPEC=null;GEAR_PENDING=null;BUILD_PENDING=null;TALENT_CONFIRM=null;CITY_CONFIRM=null;FORGET_BUILD_PENDING=null;uxCloseDialog($('ovl')); }
function fmtDur(s){ s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? h + ' 小時 ' : '') + (m ? m + ' 分' : (h ? '' : s + ' 秒')); }
function catchUp(sec, report){
  if (G.paused) return; const away = sec; sec = Math.min(sec, 6*3600);
  const b = { lvl:G.lvl, depth:G.depth, gold:G.gold, kills:G.totalKills, deaths:G.deaths, inventory:G.inventory.length,chips:G.chips, gems:{...G.gems}, carts:{...G.carts} };
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

function uiBuildGearHtml(){return `<details><summary>管理構築裝備記憶</summary><p class="uxmeta">解除記憶不刪除物品；只取消該配置的回收保護。改版前天賦備份、穿著及上一件的保護仍生效。</p>${G.builds.map((b,i)=>b?.equipment?`<p>構築 ${i+1}：${Object.entries(b.equipment).map(([slot,r])=>{const it=r?.kind==='core'?G.armory[r.id]:r?.kind==='gear'?G.inventory.find(x=>x.uid===r.uid):null;return SLOTN[slot]+' '+(r===null?'空欄位':it?uxEsc(it.name):'缺件');}).join('、')}<button class="mb" ${i===(G.bi||0)||G.run?.city||G.train?'disabled':''} onclick="uiForgetBuild(${i})">解除構築 ${i+1} 裝備記憶</button>${i===(G.bi||0)?'<small>先切換到其他構築，再解除這套記憶。</small>':''}</p>`:'').join('')||'<p>尚未保存裝備。</p>'}</details>`;}
let FORGET_BUILD_PENDING=null;
function uiForgetBuild(index){if(index===(G.bi||0)||!G.builds[index]?.equipment)return;FORGET_BUILD_PENDING={index,stamp:JSON.stringify(G.builds[index].equipment)};showOverlay(`<h2 class="uxdialog-title">解除構築 ${index+1} 的裝備記憶？</h2><p>保留物品、技能與天賦；取消這套配置對裝備的回收保護。其他構築、改版備份、穿著與上一件的保護仍有效。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備記憶</button><button class="mb pri" onclick="uiConfirmForgetBuild()">解除裝備記憶</button></div>`);}
function uiConfirmForgetBuild(){const p=FORGET_BUILD_PENDING;FORGET_BUILD_PENDING=null;hideOverlay();if(!p||JSON.stringify(G.builds[p.index]?.equipment)!==p.stamp||!forgetBuildGear(p.index)){uxAnnounce('配置已變動，沒有解除記憶。');return;}renderModal();uxAnnounce('已解除裝備記憶，物品仍在原處。');}

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
  recal:   { n:'重新校準', d:'只重洗同階內數值；保留詞綴種類與階級，已鎖定的詞綴不變', cost:it => 20 + 10*it.r + (it.lk != null ? 15 : 0), ok:it => it.aff.length > 0 },
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
  else if (act === 'upgrade' && it.r >= 2) reason = it.lg?'傳奇裝備可使用下方的核心重構':'已達可升級的稀有度上限';
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
  if (act === 'recal'){ it.aff = it.aff.map((a,i)=>i===it.lk?a:recalibrateAff(a,it)); msg = '數值重洗完成'; }
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
  const tabs=uiSegments('craftAct',Object.entries(CRAFT).map(([k,c])=>[k,k==='upgrade'&&it?.lg?'核心重構':c.n]),'改機動作');
  let detail='<section class="ui-section"><h3>尚未裝備道具</h3><p>繼續冒險，自動換上裝備後即可改機。</p></section>';
  if(it){
    const lines=[`<li><span>${AFF[it.imp.k].t(it.imp.v)}</span><small>固定屬性</small></li>`].concat(it.aff.map((a,i)=>`<li><span>T${affTier(a,it.il)} · ${AFF[a.k].t(a.v)}<br><small>同階區間 ${affRange(a,it).min}–${affRange(a,it).max}${a.v>affRange(a,it).max?' · 舊值高於區間，校準可能降低':''}</small></span><button class="mb lk${it.lk===i?' on':''}" ${it.cr?'disabled':''} aria-label="${it.lk===i?'解除鎖定':'鎖定'}${uxEsc(AFF[a.k].t(a.v))}" onclick="craftLock('${sl}',${i})">${spr(it.lk===i?'lock':'unlock',20)}</button></li>`));
    const result=CRAFT_RESULTS[sl];
    detail=`<section class="ui-section ui-craft-detail"><div class="nm">${eqico(sl,it.r,36)}<div><h3>${uxEsc(it.name)}</h3><span class="uxmeta">${RAR[it.r].n} · 等級 ${it.il}${it.cr?' · 已腐化':''}</span></div></div><ul>${lines.join('')}</ul>${act==='upgrade'&&it.lg?coreRefineHtml(sl,it):`<div class="ui-craft-operation"><h3>${op.n}</h3><p>${op.d}</p><p>消耗 ${state.cost} 零件 · 持有 ${G.parts||0}</p>${!state.ok?`<p id="craft-reason" class="uxwarning">${state.reason}</p>`:'<p id="craft-reason" class="uxmeta">準備好後，按下方按鈕執行。</p>'}<button class="mb pri" data-focus="craft-${sl}-${act}" aria-describedby="craft-reason" ${state.ok?'':'disabled'} onclick="craftDo('${sl}','${act}')">${act==='corrupt'?'確認腐化風險':op.n} · ${state.cost} 零件</button></div>`}${act==='recal'?affTierHtml(sl,it):''}${result&&result.it===it?`<div class="uxcraft-result" role="status"><b>${uxEsc(result.msg)}</b> · 消耗 ${result.cost} 零件<details><summary>查看變化</summary><p>之前：${uxEsc(result.before)}</p><p>之後：${uxEsc(result.after)}</p></details></div>`:''}</section>`;
  }
  return `<div class="ui-craft-wallet"><span>可用零件</span><strong>${G.parts||0}</strong><span>核心殘晶 ${G.coreDust||0}</span></div>${slots}${tabs}${detail}<details class="ui-rules"><summary>拾取與自動拆解規則</summary><p class="uxmeta">回收裝備得到零件：普通 1、魔法 2、稀有 5、暗金 12。重複核心另外得到一枚殘晶；構築引用的裝備不會被回收。</p>${rulesBar()}</details>`;
}

/* 分離同階校準、指定升階及核心物品等級重構。 */
const CRAFT_AFFIX_UI={weapon:0,armor:0,ring:0};let GEAR_PENDING=null;
const tierLevel=tier=>tier===0?25:tier===1?12:tier===2?5:1;
function affTierState(slot,index){const it=G.equip[slot],a=it?.aff[index],route={weapon:'signal',armor:'memory',ring:'power'}[slot];if(!it||!a)return {ok:false,reason:'先選擇一條詞綴',parts:0,fragments:0,dust:0};
 const from=affTier(a,it.il),to=Math.max(0,from-1),parts=from===0?0:[240,140,80,40][to],fragments=from!==0&&to===0?8:0,dust=from!==0&&it.lg?1:0,level=tierLevel(to);
 let reason=G.run||G.train?'先結束挑戰或訓練':it.cr?'已腐化，不能升階':it.lk===index?'先解除這條詞綴的鎖定':from===0?'已達 T0 上限':it.il<level?`T${to} 需要物品等級 ${level}`:G.parts<parts?`需要 ${parts} 零件`:((G.city?.fragments[route]||0)<fragments)?`需要 ${fragments} 枚${CITY_ROUTES[route].n}碎片`:(G.coreDust||0)<dust?`需要 ${dust} 核心殘晶`:'';
 const next={...a,tier:to,v:Math.max(a.v,affValue(a.k,it.il,to,affQuality(a,it),it.r===3?1.35:1))};
 return {ok:!reason,reason,it,index,from,to,parts,fragments,dust,route,next};
}
function coreRefineState(slot){const it=G.equip[slot],route=cityRouteForCore(it?.lg),cap=Math.max(8,G.maxDepth+2*((G.city?.maxTier||1)-1));
 if(!it||!route)return {ok:false,reason:'先裝備一件傳奇核心',parts:0,fragments:0,dust:0,cap};
 const parts=60+3*it.il,fragments=4+Math.floor(it.il/10),dust=1+Math.floor(it.il/10);
 const reason=G.run||G.train?'先結束挑戰或訓練':it.cr?'已腐化，不能重構':it.lk!=null?'先解除詞綴鎖定':!cityReady()?'先解鎖城市並使用有限天賦':it.il>=cap?`已達目前重構等級 ${cap}，推進深度或城市階級再提高上限`:G.parts<parts?`需要 ${parts} 零件`:(G.city?.fragments[route]||0)<fragments?`需要 ${fragments} 枚${CITY_ROUTES[route].n}碎片`:(G.coreDust||0)<dust?`需要 ${dust} 核心殘晶`:'';
 return {ok:!reason,reason,it,route,cap,parts,fragments,dust,nextLevel:it.il+1};
}
function gearOperationState(kind,slot,index){return kind==='tier'?affTierState(slot,index):kind==='refine'?coreRefineState(slot):{ok:false,reason:'未知操作'};}
function gearOperationCost(s){return `${s.parts} 零件${s.fragments?'、'+s.fragments+' 枚'+CITY_ROUTES[s.route].n+'碎片':''}${s.dust?'、'+s.dust+' 核心殘晶':''}`;}
function gearOperationAsk(kind,slot,index=0){const s=gearOperationState(kind,slot,index);if(!s.ok){uxAnnounce(s.reason);return;}GEAR_PENDING={kind,slot,index,it:s.it,stamp:JSON.stringify(s.it),cost:gearOperationCost(s)};
 showOverlay(`<h2 class="uxdialog-title">${kind==='tier'?'詞綴升階':'核心重構'}：${uxEsc(s.it.name)}</h2><p>${kind==='tier'?`T${s.from} → T${s.to} · ${AFF[s.it.aff[index].k].t(s.it.aff[index].v)} → ${AFF[s.next.k].t(s.next.v)}`:`物品等級 ${s.it.il} → ${s.nextLevel}；保留特殊效果、詞綴種類及階級，數值不會降低。`}</p><p>消耗 ${gearOperationCost(s)}。同一裝備的所有構築引用會同步更新。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="GEAR_PENDING=null;hideOverlay()">保留材料</button><button class="mb pri" onclick="gearOperationConfirm()">${kind==='tier'?'消耗材料升階':'消耗材料重構'}</button></div>`);
}
function gearOperationConfirm(){const p=GEAR_PENDING;GEAR_PENDING=null;hideOverlay();if(!p)return;const s=gearOperationState(p.kind,p.slot,p.index);
 if(!s.ok||G.equip[p.slot]!==p.it||JSON.stringify(p.it)!==p.stamp||gearOperationCost(s)!==p.cost){uxAnnounce('裝備、成本或挑戰狀態已變動，沒有扣除材料。');return;}
 G.parts-=s.parts;if(s.fragments)G.city.fragments[s.route]-=s.fragments;G.coreDust=(G.coreDust||0)-s.dust;
 if(p.kind==='tier')p.it.aff[p.index]=s.next;
 else{const old={...p.it};p.it.aff=p.it.aff.map(a=>({...a,tier:affTier(a,old.il),v:Math.max(a.v,affValue(a.k,s.nextLevel,affTier(a,old.il),affQuality(a,old),1.35))}));p.it.il=s.nextLevel;const value=p.slot==='weapon'?Math.round(4+p.it.il*1.5):p.slot==='armor'?Math.round(5+p.it.il*3):2;p.it.imp={...p.it.imp,v:Math.max(p.it.imp.v,value)};}
 G.craftN++;G.inventoryRevision++;checkQuest();recalc();renderModal();uxAnnounce(`${p.kind==='tier'?'詞綴升階':'核心重構'}完成，消耗 ${p.cost}。`);
}
function uiAffixPick(slot,index){if(!G.equip[slot]?.aff[index])return;CRAFT_AFFIX_UI[slot]=index;renderModal();}
function affTierHtml(slot,it){if(!it.aff.length)return '';const index=Math.min(CRAFT_AFFIX_UI[slot]||0,it.aff.length-1),s=affTierState(slot,index);
 return `<details class="ui-rules"><summary>指定詞綴升階</summary><p>每次提升一階，保留種類與階內位置，數值不降低。T2／T1／T0 分別需要物品等級 5／12／25。T0 另需區域碎片；核心裝另需一枚殘晶。</p><div class="view-options" role="group" aria-label="升階詞綴">${it.aff.map((a,i)=>`<button class="mb" data-focus="affix-${slot}-${i}" aria-pressed="${i===index}" onclick="uiAffixPick('${slot}',${i})">T${affTier(a,it.il)} · ${AFF[a.k].t(a.v)}</button>`).join('')}</div><p>${s.from===0?'T0 已達上限':`T${s.from} → T${s.to}，預計 ${AFF[s.next.k].t(s.next.v)}`} · ${gearOperationCost(s)}</p>${!s.ok?`<p class="uxmeta">${s.reason}</p>`:''}<button class="mb" data-focus="affix-upgrade-${slot}" ${s.ok?'':'disabled'} onclick="gearOperationAsk('tier','${slot}',${index})">預覽詞綴升階</button></details>`;
}
function coreRefineHtml(slot,it){if(!it.lg)return '';const s=coreRefineState(slot);return `<details class="ui-rules"><summary>核心重構 · 目前上限 ${s.cap}</summary><p>重複核心會留下殘晶。用殘晶、來源區碎片及零件，把這件核心的物品等級提高一級；保留特殊效果、詞綴種類及階級，數值不降低。推進深度或城市階級可提高上限。</p><p>核心殘晶 ${G.coreDust||0} · ${gearOperationCost(s)}</p>${s.ok?`<p>物品等級 ${it.il} → ${s.nextLevel}</p>`:`<p class="uxmeta">${s.reason}</p>`}<button class="mb" data-focus="core-refine-${slot}" ${s.ok?'':'disabled'} onclick="gearOperationAsk('refine','${slot}')">預覽核心重構</button></details>`;}

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
const UX_THEME = `:root{--ux-ink:#172751;--ux-muted:#475778;--ux-screen:#e6e8f7;--ux-blue:#303d9b;--ux-edge:#9ca9c8;--ux-accent:#b94732;--ux-focus:#1f3fb0;--ux-scroll:#8297c6;--ux-track:#e3ebfa;--ux-face:#c8cedc;--ux-key:#dae1ed;--ux-lcd:#edf4f1;--ux-frame:#5b6781;--ux-rule:#b9c2d7;--ux-display:"Cubic 11 LCD",system-ui,sans-serif;--ux-shell-radius:10px;--ux-key-radius:4px;--ux-metal:linear-gradient(180deg,#f1f4fb 0%,#d2d9e7 8%,#c8cedc 50%,#aeb9cf 100%) #c8cedc;--ux-key-face:linear-gradient(180deg,#fff 0px,#e9eef7 2px,#d5dfed 48%,#c9d4e6 50%,#d7dfed 100%) #dae1ed;--ux-key-hover:linear-gradient(180deg,#fff 0px,#edf8ff 2px,#daeafa 48%,#c0d9ed 50%,#d4e7f7 100%) #e6f1ff;--ux-blue-face:linear-gradient(180deg,#8f9de6 0%,#5567bf 8%,#4858af 46%,#303d9b 48%,#334794 100%) #303d9b;--ux-title-face:linear-gradient(180deg,#b9c6f0 0px,#6575be 2px,#4858a9 3px,#303d86 100%) #303d86;--ux-key-shadow:inset 1px 1px #fff,inset -1px -1px #8492b0,0 2px #727f9c;--ux-inset:inset 1px 1px #677694,inset -1px -1px #fff}`;
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
/* LCD pixel mode. Geometry stays native; the 16px optical face is baked on a
   one CSS-pixel grid. No live DOM rasterizer, full-panel filter or pointer proxy. */
body.ui-material.ui-pixelfx{
 --ux-display:"Cubic 11 LCD",system-ui,sans-serif;
 --ux-shell-radius:2px;--ux-key-radius:0px;
 --ux-metal:linear-gradient(180deg,#f1f4fb 0 4px,#dce2ed 4px 12px,#c8cedc 12px 62%,#b7c2d5 62% 94%,#9baac4 94% 100%) #c8cedc;
 --ux-key-face:linear-gradient(180deg,#fff 0 2px,#e9eef7 2px 6px,#d5dfed 6px 52%,#c5d1e3 52% 80%,#d7dfed 80% 100%) #dae1ed;
 --ux-key-hover:linear-gradient(180deg,#fff 0 2px,#edf8ff 2px 6px,#daeafa 6px 52%,#c0d9ed 52% 80%,#d4e7f7 80% 100%) #e6f1ff;
 --ux-blue-face:linear-gradient(180deg,#8f9de6 0 2px,#6574c9 2px 6px,#4858af 6px 48%,#303d9b 48% 84%,#334794 84% 100%) #303d9b;
 --ux-title-face:linear-gradient(180deg,#b9c6f0 0 2px,#6575be 2px 6px,#4858a9 6px 48%,#303d86 48% 100%) #303d86;
 --ux-key-shadow:inset 2px 2px #fff,inset -2px -2px #8492b0,0 2px #727f9c;
 --ux-inset:inset 2px 2px #677694,inset -2px -2px #fff;
}
body.ui-material,body.ui-material *{font-size:16px!important;line-height:24px;letter-spacing:0!important}
body.ui-material :is(h1,h2,h3,.hud-level b,.hud-right b){font-family:"Cubic 11",system-ui,sans-serif!important;font-size:24px!important;line-height:30px}
body.ui-material :is(small,.mute,.hint,.wkstate,.wkm,.wkcount,.view-fx-ticks,.hud-progress,.hud-healthline,.hud-healthline *, .hud-level span,.hud-right span,#mtabs button,#mtabs button *,#watch-return>span){font-family:"Cubic 11",system-ui,sans-serif!important;font-size:12px!important;line-height:18px}
body.ui-material :is(input,textarea,select){font-size:16px!important;line-height:24px;letter-spacing:0!important}
body.ui-material.ui-pixelfx :is(#mttl,.wkt,#mtabs button.tab,#wiki .wkn,#wiki .wkc,#wiki .wke,#wiki input,#wiki .wkempty,#mbody .ui-segments,#mbody .ui-segments>button,#mbody .ui-craft-slots>button,#mbody .ui-map-card,#mbody .pz,#mbody button.pc,#mbody button.gt,#mbody svg.tree,#mbody .idc,#mbody .ids,#mbody .dpsbar,#mbody .uxinspect,#nexthint,#ctxbtn,#loot,header,.tfoot){border-radius:0!important}
body.ui-material.ui-pixelfx :is(button,input,textarea,select,.toast,.chips),body.ui-material.ui-pixelfx #mbody button{border-radius:0!important}
body.ui-material.ui-pixelfx :is(.toast,.chips){background:var(--ux-screen);border:2px solid var(--ux-frame);box-shadow:2px 2px #172751}
body.ui-material.ui-pixelfx .modal{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.ui-material.ui-pixelfx :is(header,.tfoot,#readout) :is(button,a){background:var(--ux-key-face)!important;box-shadow:var(--ux-key-shadow)!important;color:var(--ux-ink)!important}
body.ui-material.ui-pixelfx ::-webkit-scrollbar-thumb{border-radius:0}
body.ui-material.ui-pixelfx #mtabs button.tab.on{background:linear-gradient(180deg,#f1f5ff 0 4px,#d9e2fa 4px 52%,#c1cef3 52% 100%)!important}
body.ui-material.ui-pixelfx :is(#mbody,#ovl) button.mb.pri{background:linear-gradient(180deg,#eeb39e 0 2px,#c45b42 2px 6px,#b94732 6px 56%,#a1392e 56% 84%,#b94732 84% 100%)!important}
body.ui-material.ui-pixelfx #mbody .ui-character-head{background:#d4dcf1!important;border-left-width:4px!important}
body.ui-material.ui-pixelfx #mbody :is(.ui-directory button,.ui-wiki){background:#d5deef!important;border-left-width:4px!important}
body.ui-material.ui-pixelfx #mbody .ui-map-banner{background:#273961!important}
body.ui-material.ui-pixelfx #mbody button.gt{background:#d8e2f3!important}
body.ui-material.ui-pixelfx #mbody .ui-craft-slots>button[aria-pressed="true"]{background:#bac9ee!important}
body.ui-material.ui-pixelfx.ui-fx-document :is(header,h2,nav,nav a,main>section,input,button){border-radius:0!important}
body.ui-material.ui-pixelfx:not(.ui-fx-document) :is(header,.tfoot,#readout,#ctxbtn){background:var(--ux-metal)!important;color:var(--ux-ink)!important;text-shadow:none!important}
body.ui-material.ui-pixelfx.ui-fx-document header{background:var(--ux-title-face)!important;color:#fff!important}
body.ui-material.ui-pixelfx svg{shape-rendering:crispEdges}
body.ui-material.ui-pixelfx .hud-meter{height:18px;box-shadow:2px 2px #ffffff90,inset 0 2px #030b23}
body.ui-material.ui-pixelfx .hud-meter>i{width:var(--pixel-fill,var(--fill));background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#ffb5c7 0 2px,#eb526a 2px 8px,#a22e58 8px 100%);box-shadow:none}
body.ui-material.ui-pixelfx .hud-meter.hud-xp{height:10px;margin-top:4px}
body.ui-material.ui-pixelfx .hud-xp>i{background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#fff3bf 0 2px,#efce68 2px 4px,#a38c3b 4px 100%)}
body.ui-material.ui-pixelfx .hud-xp>span{font-size:0!important}
body.ui-material.ui-pixelfx .hud-level{height:52px}
body.ui-material.ui-pixelfx .hud-right b{line-height:24px}
body.ui-material.ui-pixelfx .hud-right>div{padding:2px 4px;gap:4px}
body.ui-material.ui-pixelfx #watch-return i{font-size:0!important;line-height:0}
@media(max-width:480px){body.ui-material.ui-pixelfx .hud-right b{font-size:24px!important}body.ui-material.ui-pixelfx .hud-right{gap:4px}}
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
  return `<h2 class="uxdialog-title">歡迎回來！</h2><p class="uxmeta">離開 ${fmtDur(away)}${away > sec ? `，最多結算 ${fmtDur(sec)}` : ''}</p><div class="uxreturn-summary"><div><span>成長</span><b>等級 ${b.lvl} → ${G.lvl}</b><small>金幣 +${tFmt(G.gold-b.gold)}</small></div><div><span>裝備</span><b>換上 ${o.eq} 件</b><small>${cores?`新收藏 ${cores} 種傳奇核心`:`倉庫收進 ${o.stored||0} 件；回來可比較換裝`}</small></div><div><span>新資源</span><b>${newPieces} 件配件／卡匣</b><small>${o.maps} 張地圖${o.coreDust?` · 核心殘晶 +${o.coreDust}`:''}</small></div>${pending?`<div><span>待選</span><b>${G.picks} 次改裝 · ${G.relicPicks} 次遺物</b><small>選擇已保留，可以稍後處理。</small></div>`:''}</div>${G.deaths>b.deaths ? `<p class="uxwarning">這段時間倒下 ${G.deaths-b.deaths} 次，可先檢查防禦與構築。</p>` : ''}${saved ? '' : '<p class="uxwarning">本機存檔未成功，請至存檔頁匯出存檔碼保存。</p>'}<details class="uxreturn-log"><summary>完整紀錄</summary><ul><li>擊殺 ${tFmt(G.totalKills-b.kills)} 隻怪物</li><li>深度 ${b.depth} → ${G.depth}</li><li>倒下 ${G.deaths-b.deaths} 次</li>${o.cards.length ? `<li>依自動隨機設定完成：${o.cards.map(uxEsc).join('、')}</li>` : ''}</ul></details><div class="uxactions">${pending?'<button class="mb pri" onclick="openPendingChoices()">查看待選內容</button>':''}${action}<button class="mb" onclick="hideOverlay()">繼續掛機</button>${saved ? '' : '<button class="mb" onclick="uxOfflineGo(\'save\')">備份存檔</button>'}</div>`;
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
.uxinspect .uxquiet,.uxinspect .uxboard-link{min-height:32px;padding:3px 10px!important;font-size:12px;border-radius:6px!important}.uxinspect .uxboard-link{margin-top:4px}
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
  document.addEventListener('click',e=>{const b=e.target.closest('button:enabled');if(b&&uxMotionEnabled()&&b.animate)b.animate([{filter:'brightness(1.25)'},{filter:'brightness(1)'}],{duration:140,easing:'steps(3,end)'});});
}

let UX_PANEL_MOTION=null;
function uxMotionEnabled(){return !matchMedia('(prefers-reduced-motion: reduce)').matches&&GAME_VIEW.prefs.glitch;}
function uxAnimatePanel(){if(!uxMotionEnabled()||!$('mbody')?.animate)return;UX_PANEL_MOTION?.cancel();UX_PANEL_MOTION=$('mbody').animate([{opacity:.7},{opacity:1}],{duration:140,easing:'steps(3,end)'});}

;
/* ---------- 編年史：全螢幕資料頁，查看所有遊戲資訊（技能、配件、遺物、傳奇裝備、怪物、地圖、角色、規則） ---------- */
const WK = { cat:'skill', q:'' };
const wkEl = { cap:'火', fire:'火', cold:'冰', light:'電' };
const WIKI = {
  skill:{ n:'技能', rows:() => Object.entries(SKILLS).map(([id, K]) => ({ t:K.n, tag:`Lv. ${K.lvl}　${{ fire:'火', cold:'冰', light:'電' }[K.el]}`, d:K.d, s:`冷卻 ${K.cd} 秒　倍率 ×${K.mult}`, got:G.lvl >= K.lvl, col:K.col, ico:sico(id, 28), mods:Object.values(MODES).filter(M => M.sk === id).map(M => `${M.n}：${M.d}`) })) },
  supp:{ n:'輔助配件', rows:() => Object.entries(SUPPS).map(([id, S]) => ({ t:S.n, d:S.d, s:`形狀 ${GridLab.SUPPORTS[id].shape.length} 格${GridLab.SUPPORTS[id].needs.length ? '　限' + GridLab.SUPPORTS[id].needs.map(k => UX_TAG[k] || k).join('、') : ''}`, got:(G.gems[id] || 0) > 0 || (G.seenG || {})[id], ico:gemIco(id, 28) })) },
  mode:{ n:'模式卡匣', rows:() => Object.entries(MODES).map(([id, M]) => ({ t:M.n, tag:SKILLS[M.sk].n, d:M.d, s:'', got:!!G.seen[id]||!!G.carts[id] })) },
  relic:{ n:'遺物', rows:() => Object.entries(RELICS).map(([id, r]) => ({ t:r.n, d:r.d, s:'', got:!!G.relics[id], ico:xico('relic', id, 28) })) },
  legend:{ n:'傳奇裝備', rows:() => Object.entries(LEGENDS).flatMap(([slot, arr]) => arr.map(L => ({ t:L.name, tag:'暗金' + SLOTN[slot], d:L.d, s:'', got:!!G.legSeen[L.id], ico:xico('legend', L.id, 30) }))) },
  ach:{ n:'成就', rows:() => Object.entries(ACHS).map(([id, a]) => ({ t:a.n, tag:'永久傷害 +1%', d:a.d, s:'', got:!!G.ach[id], ico:xico('badge', id, 28) })) },
  card:{ n:'升級卡', rows:() => Object.entries(CARDS).map(([id, c]) => ({ t:c.n, d:c.d, s:c.sk ? '技能變體：' + SKILLS[c.sk].n : '', got:(G.cards[id] || 0) > 0 })) },
  react:{ n:'元素反應', rows:() => [['火焰', '命中的敵人燃燒 3 秒，持續受到傷害'], ['閃電', '命中的敵人被標記 4 秒'], ['融化', '火焰打到凍結的敵人：傷害 +40%，解除凍結'], ['超導', '閃電打到凍結的敵人：傷害 +30%'], ['蒸氣', '冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒'], ['過載', '火焰或冰霜打到被閃電標記的敵人：傷害 +25%']].map(([t, d]) => ({ t, d, s:'', got:true })) },
  mon:{ n:'怪物', rows:() => MONSTER_GUIDE.map(([id, t, d]) => ({ t, d, s:`生命 ×${MTYPES[id].hp}　傷害 ×${MTYPES[id].dmg}　速度 ${MTYPES[id].spd}`, got:((G.mk || {})[id] || 0) > 0 })).concat([{ t:'菁英', tag:'變體', d:'任何小怪都可能變成菁英（深度 6 起）：體型較大、腳下有金環，生命 ×3.2、傷害 ×1.3，金幣與經驗 ×4，必掉裝備', s:'', got:G.maxDepth >= 6 }]) },
  map:{ n:'地圖與詞綴', rows:() => BIOMES.map(b => ({ t:b.n, tag:'生態', d:'守關者與地圖怪會掉落這個生態的地圖', s:'', got:true })).concat(Object.entries(MODS).map(([id, m]) => ({ t:m.n, tag:mapKind(id), d:m.kind === 'mixed' ? '同時有強化與減弱，計入挑戰詞綴數' : m.kind === 'challenge' ? '計入挑戰詞綴數，數量不是難度評分' : '額外獎勵', s:'', got:true }))) },
  char:{ n:'角色', rows:() => Object.entries(CHARS).map(([id, c]) => ({ t:c.n, tag:c.ach ? '成就解鎖' : c.need ? `最深 ${c.need} 層` : '初始', d:c.d, s:`專屬技能「${c.sig.n}」：${c.sig.d}`, got:charOk(id) })) },
  cos:{ n:'裝扮', rows:() => COS_CATS.map(([k, n]) => ({ t:n, d:COS[k].map(e => e[1]).join('、'), s:`${COS[k].length} 款　價格 ${Math.min(...COS[k].filter(e => e[3] > 0).map(e => e[3]))} 至 ${Math.max(...COS[k].map(e => e[3]))} 金幣`, got:true })) },
  rule:{ n:'規則', rows:() => [['技能拼圖', '6×6 面板隨等級逐列解鎖。輔助配件只強化上下左右相鄰的技能；連到 3 個以上輔助「滿載」，每多一個傷害 +8%。'], ['有限天賦','路徑最多 36 點，韌體最多兩個；等級與深度解鎖可用點數。末端節點可免費退回，不能切斷其他節點。舊配置保留快照，可預覽、免費轉換與還原；城市需要有限預算。'],['韌體核心',Object.values(FIRMWARE).map(f=>f.n+'：'+f.d).join('；')],['城市遠征','最深第 8 層開放，三個路段、兩次選路、一次收尾首領。三區分別為高速分散、停火回充護盾及可用異常解除的重裝減傷。當局協定不寫入永久卡片。'],['定向核心','區域碎片 24 枚可合成一款對應區域的未持有核心，特殊效果固定、詞綴隨機，不自動換裝；安全首階完整遠征至少 14 枚。收尾另有 15% 區域核心機會。'],['城市中樞','同階三區憑證各一枚開啟中樞，失敗不退憑證；勝利保證掉落出發時目標核心，並解鎖下一階，最高八階。憑證沒有每日重置。'],['城市離線','出發時授權保守或碎片優先選路，前景分岔有 15 秒可自行選路，逾時或離線依出發策略繼續；只完成當前遠征，不重開或消耗其他門票。撤離及死亡保留已完成路段碎片；首領未完成便不發收尾獎勵。'],['技能出手','共用 0.4 秒出手時段，依就緒時間輪流。均衡策略先服務最早就緒技能；連動優先可短暫等待凍結或電荷，等不到也會出手。冷卻縮減最多 60%。'],['直傷預估','包含模式、回放與出手容量的單體直傷期望；不含燃燒、條件反應、角色專技或擊殺觸發。命中範圍、移動與連動會令實戰不同。'],['首領凍結','單次凍結需累積相當於最大生命 12% 的控制傷害，每次最多推進 75%；累積會逐秒衰減。凍結後適應 4 秒，期間不能再累積。'],['連動卡匣','冷啟動碎星消耗凍結換取三倍單點命中；撥號放電由紅外線原始命中產生電荷，每次最多 4 格，雷射消耗最多 8 格。回放與觸發不會產電。兩款可用 20 電路點數合成。'],['訓練場','可選單體或五個群體假人，持續 30 秒。測量有效傷害、出手、回放與連動；不發放獎勵，結束或取消會還原入場前電荷與冷卻。'],['裝備倉庫','角色頁可開啟 200 格倉庫，比較、鎖定、換裝及回收。手動換裝關閉自動換裝；滿倉優先保留高稀有度及高階詞綴，僅回收未保護裝備。'],['掉落拾取','金幣、電路點數與道具落地後，角色走近才拾取；未拾物會保存。經驗仍由擊殺獲得，離線補算會完成收集。'],['詞綴階級','T0 最高、T4 最低。新詞綴的 T2、T1、T0 分別在物品等級 5、12、25 解鎖，T0 機率為 1.5%。'],['電路合成','戰鬥頁可花 20 電路點數指定合成鎖頻晶片、分線器、備用電池或延遲緩衝，所有角色都能搭配。'],['共鳴', '塞滿整列：全隊傷害 +12%；塞滿整欄：暴擊率 +5%；元素相同的兩個技能緊貼：各自傷害 +15%。'], ['改機', '用不到的裝備拆成零件（普通 1、魔法 2、稀有 5、暗金 12）。零件可重新校準、改裝詞綴、升級稀有度，或腐化賭一把。'], ['構築記憶','三套構築保存角色、技能拼圖、天賦、出手策略及實際裝備。切換先保存目前配置；被引用物品受回收保護，改機同步影響所有引用。舊構築沿用目前裝備，保存後才記住；缺件須明確選擇保留目前欄位。'],['校準與升階','校準只重洗同階內數值，種類及階級不變，舊超額數值也可能洗低。指定升階保留種類及階內位置，數值不降低；T2／T1／T0 需要物品等級 5／12／25。T0 另需部位對應區域碎片，核心裝另需一枚殘晶。'],['核心重構','每件重複核心得到一枚殘晶。裝備核心後可在打造的升級頁，以殘晶、來源區碎片及零件提升一級物品等級；保留特殊效果及詞綴階級，數值不降低。深度與城市階級提高上限，腐化及鎖定時不可重構。'],['守關者保底', '連續沒出暗金時，下一件暗金的機率逐次提高。'], ['離線收益', '離開頁面後回來會結算離線收益，最多 6 小時。暗金資格與守關者保底與線上相同；原有經驗 75%、一般裝備掉落 25% 折減仍適用。'], ['無限之塔', '每層殺滿怪就上樓，每 10 層是守關者，打贏多一條規則與一件遺物。死亡就結束。'], ['操作', '拖曳旋轉浮島，滾輪或雙指縮放；Q、E 轉向；` 鍵進入扮工模式。']].map(([t, d]) => ({ t, d, s:'', got:true })) },
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
  {k:'char',n:'角色',icon:'role',pages:['char','dress','warehouse']},
  {k:'skills',n:'戰鬥',icon:'battle',pages:['skills']},
  {k:'craft',n:'打造',icon:'craft',pages:['craft']},
  {k:'tree',n:'成長',icon:'growth',pages:['tree']},
  {k:'maps',n:'冒險',icon:'adventure',pages:['maps']},
  {k:'menu',n:'更多',icon:'more',pages:['menu','goals','ach','dex','log','save','settings']}
];
const UI_TITLE = {warehouse:'裝備倉庫',char:'角色總覽',dress:'角色與裝扮',skills:'戰鬥構築',craft:'打造工作台',tree:'天賦成長',maps:'冒險',menu:'更多',goals:'目標',ach:'成就',dex:'圖鑑',log:'更新日誌',save:'存檔與備份',settings:'遊戲設定'};
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
  el.innerHTML=`${back?`<button class="ui-back" aria-label="返回${root.n}" onclick="openModal('${root.k}')">返回</button>`:''}<h2>${UI_TITLE[modalTab]||'更多'}</h2>${hk?`<button aria-label="${HELP[hk][0]}" onclick="showHelp('${hk}')">?</button>`:''}${MOB()?`<button aria-label="切換戰場大小，目前${CZN[cz]}" onclick="cycleCz()">${CZN[cz]}</button>`:''}`;
}
function uiSegments(key,items,label){return `<div class="ui-segments" role="group" aria-label="${label}">${items.map(([id,name])=>`<button aria-pressed="${UI_WORK[key]===id}" data-focus="${key}-${id}" onclick="uiWork('${key}','${id}')">${name}</button>`).join('')}</div>`;}
function uiWork(key,id){
  const allowed={inventory:['active','support','cart'],craftSlot:Object.keys(SLOTN),craftAct:Object.keys(CRAFT),adventure:['maps','city','tower','training']};
  if(!allowed[key]?.includes(id))return;UI_WORK[key]=id;renderModal();
}
function uiMenuHtml(){
  const group=(name,items)=>`<section class="ui-menu-group"><h3>${name}</h3><div class="ui-directory">${items.map(([k,n,d])=>`<button onclick="openModal('${k}')"><b>${n}</b><span>${d}</span><i aria-hidden="true">↗</i></button>`).join('')}</div></section>`;
  return group('進度與收藏',[['goals','目標','下一個里程碑與獎勵'],['ach','成就','已達成的挑戰'],['dex','圖鑑','技能、卡匣與收藏紀錄']])+group('系統工具',[['log','更新日誌','查看版本與更新'],['save','存檔與備份','本機保存、匯入及匯出'],['settings','遊戲設定','戰鬥規則、拾取與音效']])+`<button class="ui-wiki" aria-label="編年史" onclick="wikiOpen()">${spr('star',24)}<span><b>編年史</b><small>查看所有遊戲資訊</small></span><i aria-hidden="true">↗</i></button>`;
}
function uiCharacterHtml(){
  const s=G.st;
  const rows=[['單體直傷預估',tFmt(s.dps)+' DPS'],['最大生命',tFmt(s.life)],['暴擊率',s.crit.toFixed(0)+'%'],['傷害減免',(s.red*100).toFixed(0)+'%']];
  return `<section class="ui-character-head"><span class="ui-eyebrow">${CHARS[G.char].n}</span><h3>${uxEsc(G.heroName||'阿街')}<small>LV. ${G.lvl}</small></h3><p id="ui-char-progress">深度 ${G.depth} · 累計擊殺 ${tFmt(G.totalKills)}</p><button class="mb" onclick="openModal('dress')">角色與裝扮 ↗</button></section><section class="ui-section"><button class="mb pri" onclick="openModal('warehouse')">裝備倉庫（<span id="ui-gear-count">${G.inventory.length}</span>／200）</button><p>拾到與替換的裝備留在倉庫。電路點數：${G.chips}。</p></section><div class="ui-equipment">${Object.keys(SLOTN).map(slotHtml).join('')}</div>${uiCoreCollection()}<section class="ui-section"><h3>戰鬥狀態</h3><dl class="ui-stat-list">${rows.map(([n,v])=>`<div><dt>${n}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="uxmeta">自動換裝可在倉庫調整。傳奇核心保留，可在收藏中換用或還原。</p></section>${charHtml()}${cardsHtml()}<details class="ui-section"><summary>事件紀錄</summary><ol class="log">${G.log.map(l=>`<li>${uxEsc(l.txt)}</li>`).join('')}</ol></details>`;
}
function uiCoreCollection(){
  const ids=Object.keys(LEGEND_BY).filter(id=>G.armory[id]);
  return `<button class="mb" onclick="uiCityGo()">城市遠征 · 定向追求核心</button><details class="ui-section ui-core-collection"><summary>傳奇核心收藏 ${ids.length}／${Object.keys(LEGEND_BY).length}</summary><p class="uxmeta">不同核心會留下來供你研究；裝備中的核心不會被自動替換。同款只保留一件，未裝備、未被構築引用、未鎖定且未腐化的收藏會比較升級。重複品提供零件及一枚核心殘晶，可在打造頁重構已收藏核心。</p>${ids.length?ids.map(id=>{const it=G.armory[id],on=G.equip[it.slot]?.lg===id;return `<article class="ui-core-item"><div class="nm">${xico('legend',id,28)}<b>${uxEsc(it.name)}</b><small>${SLOTN[it.slot]} · 等級 ${it.il}</small></div><p>${uxEsc(LEGEND_BY[id].d)}</p><details><summary>屬性與效果</summary><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul></details><button class="mb" ${on?'disabled':''} onclick="uiEquipCore('${id}')">${on?'已裝備':`換上${uxEsc(it.name)}`}</button></article>`}).join(''):'<p>打到第一件傳奇後，就能在這裡保留及換用它的特殊效果。</p>'}<div class="uxactions">${Object.keys(SLOTN).filter(slot=>G.equipBackup[slot]).map(slot=>`<button class="mb" onclick="uiRestoreEquipment('${slot}')">切回上一件${SLOTN[slot]}</button>`).join('')}</div></details>`;
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
  return `<section class="ui-section ui-resolved" aria-label="目前生效技能"><h3>目前生效</h3>${resolved.length?resolved.map(r=>{const s=G.st.sk[r.key];return `<article><div>${sico(r.key,24)}<b>${SKILLS[r.key].n}</b><span>${s?`冷卻 ${s.cd.toFixed(1)} 秒`:''}</span></div><p>${r.linked.length?r.linked.map(id=>SUPPS[pieces.get(id).key].n).join('、'):'尚未連接輔助配件'}</p>${s?.mode?`<p>模式：${MODES[s.mode].n}</p>`:''}</article>`}).join(''):'<p>盤面沒有主動技能，放置一個即可開始構築。</p>'}${unused.length?`<details><summary>未生效配件 ${unused.length} 件</summary><ul>${unused.map(p=>`<li><b>${SUPPS[p.key].n}</b>：${G.board.pieces.some(a=>a.kind==='active'&&adjacent(a,p))?'相鄰技能的標籤不符':'未與主動技能相鄰'}</li>`).join('')}</ul></details>`:''}<p class="uxmeta">單體直傷預估包含模式與共享出手時間，不含燃燒、條件連動、角色專屬及擊殺收益。實測可前往冒險的訓練場。</p></section>`;
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
.ui-craft-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.ui-craft-slots button{min-height:82px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:9px;border:1px solid #b1c1de;border-radius:8px;background:#eaf0fb;color:var(--ux-ink);font:13px system-ui,sans-serif}.ui-craft-slots button[aria-pressed="true"]{border:2px solid var(--ux-blue);background:#fff}.ui-craft-slots small{font-size:11px}.ui-craft-wallet{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:baseline;padding:6px 0}.ui-craft-wallet strong{font:22px "Cubic 11",system-ui,sans-serif}.ui-craft-detail>ul{list-style:none;padding:0;margin:12px 0}.ui-craft-detail li{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #e0e8f6;padding:6px 0;font-size:13px}.ui-craft-operation{padding:12px;background:#eaf1fb;border-radius:8px;margin:10px 0}.ui-craft-operation h3{font-size:16px;margin:0 0 6px}.ui-craft-operation p{font-size:13px;margin:5px 0}.ui-craft-operation .mb{width:100%;margin-top:10px}.ui-craft-result{margin:12px 0}.ui-rules{margin-top:12px;border-top:1px solid #c7d3e8;padding-top:10px}.ui-rules summary{padding:8px 0}
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
  if(G.run?.city?.awaitChoice)UI_WORK.adventure='city';
  const R=G.run,mode=UI_WORK.adventure;
  const nav=uiSegments('adventure',[['maps','地圖'],['city','城市遠征'],['tower','無限之塔'],['training','訓練場']],'冒險分類');
  const current=R?.city?uiCityRunHtml():R?`<section class="ui-section"><div class="ui-map-state"><b>${R.tower?'無限之塔 第 '+R.floor+' 層':BIOMES[R.map.biome].n}</b><span>進行中</span></div><div class="ui-progress" role="progressbar" aria-label="地圖擊殺進度" aria-valuemin="0" aria-valuemax="${R.need}" aria-valuenow="${Math.min(R.kills,R.need)}"><i style="width:${Math.min(100,R.kills/R.need*100)}%"></i></div><p id="ui-run-count" class="uxmeta">擊殺 ${Math.min(R.kills,R.need)}／${R.need}</p>${runMods(R)}<button class="mb" onclick="uiLeaveMap()">離開目前挑戰</button></section>`:`<section class="ui-section"><div class="ui-map-state"><b>一般冒險</b><span>深度 ${G.depth}</span></div><p id="ui-normal-count" class="uxmeta">擊殺 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'，持續推進並挑戰守關者':'，目前原地刷怪'}</p></section>`;
  if(mode==='tower')return current+nav+`<section class="ui-section"><h3>無限之塔</h3><p>最高紀錄 ${G.towerBest||0} 層</p><p class="uxmeta">${G.maxDepth<8?'深度 8 解鎖':'逐層挑戰更強的守關者。'}</p><button class="mb pri" ${R||G.maxDepth<8?'disabled':''} onclick="towerStart()">挑戰無限之塔</button>${R?'<p class="uxmeta">請先完成或離開目前挑戰。</p>':''}</section>`;
  if(mode==='city')return (R?current:'')+nav+(R?.city?'<details class="ui-section"><summary>查看城市目標與下次出發設定</summary>'+uiCityHtml()+'</details>':uiCityHtml());
  if(mode==='training'){
    const L=G.trainLast,mx=L?.rows.length?L.rows[0][1]:1;
    return current+nav+`<section class="ui-section"><h3>訓練場</h3><p>選擇 1 隻或 5 隻不還手的假人，測量 30 秒實際傷害。</p><div class="view-options" role="group" aria-label="訓練目標">${[['single','單體假人'],['crowd','群體假人']].map(([id,name])=>`<button class="mb" aria-pressed="${(G.trainingPreset||'crowd')===id}" ${G.train?'disabled':''} onclick="uiTrainingPreset('${id}')">${name}</button>`).join('')}</div>${G.train?`<p id="ui-train-time">測量中，剩 ${Math.ceil(G.train.t)} 秒</p><button class="mb" onclick="trainEnd(true)">取消測量</button>`:`<button class="mb pri" ${R?'disabled':''} onclick="trainStart()">開始測量</button>`}<p class="uxmeta">測試不掉落獎勵；開始時清空測試電荷，結束或取消後還原原有電荷。單體預估不等同多目標實測。</p>${L?`<p>上次結果：每秒約 <b>${tFmt(L.dps)}</b>（${L.n||5} 隻合計）</p>${L.rows.map(([k,v])=>`<div class="gl"><b>${uxEsc(k)}</b><i style="--p:${Math.round(v/mx*100)}%"></i><em>${L.total?Math.round(v/L.total*100):0}%　${tFmt(v/(L.duration||30))}／秒</em></div>`).join('')}<details><summary>出手與連動結果</summary>${Object.entries(L.stats||{}).map(([id,row])=>`<p>${SKILLS[id].n}：${row.casts} 次出手／${row.repeats} 次回放，最長等候 ${row.maxWait.toFixed(1)} 秒</p>`).join('')}${uiComboSummary(L.combos)}</details>`:'<p class="uxmeta">完成測量後，保留傷害分布、出手次數與連動結果。</p>'}</section>`;
  }
  return current+nav+`<div class="ui-map-state"><h3>可用地圖</h3><span class="uxmeta">${G.maps.length}／15 張</span></div><div class="ui-map-list">${G.maps.length?G.maps.map(m=>{const biome=BIOMES[m.biome],q=m.mods.reduce((sum,k)=>sum+(MODS[k]?.q||0),0);return `<article class="ui-map-card"><div class="ui-map-banner" style="--land:${biome.board.l};--land2:${biome.board.m}"><span>LV. ${m.lvl} · ${R?'挑戰中，暫不可進入':'可進入'}</span><h3>${biome.n}</h3></div><div class="ui-map-info"><div class="rchips"><span class="chip bad">挑戰詞綴 ${mapChallenge(m.mods)}</span><span class="chip ok">戰利品 +${Math.round(q*100)}%</span></div><details><summary>查看詞綴與獎勵</summary><ul>${m.mods.length?m.mods.map(k=>`<li><b>${mapKind(k)}</b> · ${MODS[k].n}</li>`).join(''):'<li>沒有額外詞綴</li>'}</ul>${m.mods.includes('rich')?'<p>金幣 +60%</p>':''}${m.mods.includes('lucky')?'<p>稀有度提升</p>':''}</details><button class="mb pri" ${R?'disabled':''} onclick="enterMap('${m.id}')">進入 · 消耗這張地圖</button></div></article>`}).join(''):'<section class="ui-section"><h3>還沒有地圖</h3><p>繼續一般冒險，打贏守關者便有機會取得地圖。</p></section>'}</div>`;
}
function uiLeaveMap(){
  if(!G.run)return;
  if(G.run.city){showOverlay('<h2 class="uxdialog-title">撤離城市遠征？</h2><p>保留已完成路段的碎片，放棄本次收尾獎勵；中樞已消耗的憑證不退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續遠征</button><button class="mb pri" onclick="hideOverlay();abandonMap()">撤離並帶回碎片</button></div>');return;}
  showOverlay(`<h2 class="uxdialog-title">離開目前挑戰？</h2><p>目前的進度會結束，已消耗的地圖不會退還。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">繼續挑戰</button><button class="mb pri" onclick="hideOverlay();abandonMap()">離開挑戰</button></div>`);
}

let UI_LIVE_SIGNATURE='';
function uiLiveSignature(){
  if(modalTab==='warehouse')return JSON.stringify([G.inventoryRevision,G.autoEquip,G.storageRecycled]);
  if(modalTab==='skills')return JSON.stringify([G.lvl,G.board,G.gems,G.carts,G.seen,G.st.dps,G.chips]);
  if(modalTab==='char')return JSON.stringify([G.lvl,G.equip,G.armory,G.equipBackup,G.char,G.heroName,G.cards,G.picks,G.relicPicks]);
  if(modalTab==='craft')return JSON.stringify([G.parts,G.equip,G.coreDust,G.city?.fragments,G.city?.maxTier,G.maxDepth,!!G.run,!!G.train]);
  if(modalTab==='maps')return JSON.stringify([G.maps,G.run?.map.id,G.run?.floor,G.run?.city,G.city,G.towerBest,!!G.train,G.trainLast,G.maxDepth]);
  return modalTab;
}
function uiRefreshLive(){
  if(G.offline||document.body.classList.contains('watch-mode'))return;
  if(!$('modal')||$('modal').hidden)return;
  const signature=uiLiveSignature();
  if(signature!==UI_LIVE_SIGNATURE&&!drag&&!UX_LAYERS.length&&!document.querySelector('#mbody input:focus,#mbody textarea:focus'))renderModal();
  const gearCount=$('ui-gear-count');if(gearCount&&gearCount.textContent!==String(G.inventory.length))gearCount.textContent=G.inventory.length;
  const progress=$('ui-char-progress'),text=`深度 ${G.depth} · 累計擊殺 ${tFmt(G.totalKills)}`;
  if(progress&&progress.textContent!==text)progress.textContent=text;
  const R=G.run,count=$('ui-run-count'),bar=document.querySelector('[aria-label="地圖擊殺進度"]');
  if(R&&count){count.textContent=`擊殺 ${Math.min(R.kills,R.need)}／${R.need}`;if(bar){bar.setAttribute('aria-valuenow',Math.min(R.kills,R.need));bar.querySelector('i').style.width=Math.min(100,R.kills/R.need*100)+'%';}}
  const normal=$('ui-normal-count');if(normal&&!R)normal.textContent=`擊殺 ${Math.min(G.kills,G.need)}／${G.need}${G.push?'，持續推進並挑戰守關者':'，目前原地刷怪'}`;
  const choice=$('ui-city-choice-time');if(choice&&G.run?.city?.awaitChoice)choice.textContent=`${Math.max(0,15-Math.floor((Date.now()-(G.run.city.choiceAt||Date.now()))/1000))} 秒後依出發策略自動選路，也可立即選擇。`;
  uiCombatRefresh();
  const timer=$('ui-train-time');if(timer&&G.train)timer.textContent=`測量中，剩 ${Math.ceil(G.train.t)} 秒`;
}

let UI_RESPEC=null;
function uiRespec(){
  if(G.run?.city||G.train){uxAnnounce('先結束城市遠征或訓練，再重置天賦。');return;}
  const cost=100*G.lvl;if(!G.pass.length||G.gold<cost)return;
  UI_RESPEC={lvl:G.lvl,pass:JSON.stringify(G.pass),cost};
  showOverlay(`<h2 class="uxdialog-title">重置目前構築的天賦？</h2><p>消耗 ${cost} 金幣，清除目前配置，點數可重新分配。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="UI_RESPEC=null;hideOverlay()">保留天賦</button><button class="mb pri" onclick="uiConfirmRespec()">重置天賦</button></div>`);
}
function uiConfirmRespec(){
  const pending=UI_RESPEC;UI_RESPEC=null;hideOverlay();if(!pending)return;
  if(G.run?.city||G.train||G.lvl!==pending.lvl||JSON.stringify(G.pass)!==pending.pass||G.gold<pending.cost){uxAnnounce('天賦或金幣已變動，請重新確認。');return;}
  respec();uxAnnounce(`已重置天賦，消耗 ${pending.cost} 金幣。`);
}

/* 倉庫與電路合成沿用同一外殼、確認及焦點系統。 */
const WAREHOUSE_UI={slot:'all',page:0};
function warehouseHtml(){
 const list=G.inventory.filter(it=>WAREHOUSE_UI.slot==='all'||it.slot===WAREHOUSE_UI.slot).slice().reverse(),pages=Math.max(1,Math.ceil(list.length/12));WAREHOUSE_UI.page=Math.min(WAREHOUSE_UI.page,pages-1);
 return `<section class="ui-section"><h3>裝備倉庫 ${G.inventory.length}／200</h3><p>拾到與換下的裝備留在這裡；傳奇在角色的核心收藏。</p><button class="mb" data-focus="warehouse-auto" aria-pressed="${G.autoEquip}" onclick="G.autoEquip=!G.autoEquip;G.dirty=true;renderModal()">自動換裝：${G.autoEquip?'開':'關'}</button><p class="uxmeta">滿倉優先保留高稀有度與高階詞綴，僅回收未保護裝備；低於過濾門檻也會回收。累計回收 ${G.storageRecycled} 件。</p><div class="ui-segments" role="group" aria-label="倉庫部位">${[['all','全部'],...Object.entries(SLOTN)].map(([id,n])=>`<button data-focus="warehouse-filter-${id}" aria-pressed="${WAREHOUSE_UI.slot===id}" onclick="WAREHOUSE_UI.slot='${id}';WAREHOUSE_UI.page=0;renderModal()">${n}</button>`).join('')}</div></section><div class="ui-warehouse-list">${list.slice(WAREHOUSE_UI.page*12,WAREHOUSE_UI.page*12+12).map(it=>`<article class="ui-section"><div class="nm">${eqico(it.slot,it.r,28)}<b>${uxEsc(it.name)}</b><small>${RAR[it.r].n} · Lv. ${it.il}</small></div><p>${it.kept?'已鎖定 · ':''}${G.equip[it.slot]===it?'穿著中':G.equipBackup[it.slot]===it?'上一件裝備':gearReferenced(it)?'構築引用保護':'倉庫保管'}</p><ul>${itemLines(it).slice(0,3).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><button class="mb" data-focus="gear-${it.uid}" onclick="uiInspectGear(${it.uid})">比較與管理</button></article>`).join('')||'<p>目前沒有這個部位的裝備。角色走近掉落物後會自動拾入。</p>'}</div><div class="uxactions"><button class="mb" data-focus="warehouse-prev" ${WAREHOUSE_UI.page===0?'disabled':''} onclick="warehouseMove(-1)">上一頁</button><span>第 ${WAREHOUSE_UI.page+1}／${pages} 頁 · ${list.length} 件</span><button class="mb" data-focus="warehouse-next" ${WAREHOUSE_UI.page>=pages-1?'disabled':''} onclick="warehouseMove(1)">下一頁</button></div>`;
}
function uiInspectGear(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;const next=calc({...G.equip,[it.slot]:it}),current=G.st,on=G.equip[it.slot]===it,guard=it.kept||it.cr||it.lk!=null||on||Object.values(G.equipBackup).includes(it)||gearReferenced(it);
 showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · ${RAR[it.r].n} · 物品等級 ${it.il}</p><dl class="ui-stat-list"><div><dt>預估傷害</dt><dd>${tFmt(current.dps)} → ${tFmt(next.dps)}</dd></div><div><dt>最大生命</dt><dd>${tFmt(current.life)} → ${tFmt(next.life)}</dd></div><div><dt>暴擊率</dt><dd>${current.crit.toFixed(1)}% → ${next.crit.toFixed(1)}%</dd></div></dl><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回倉庫</button><button class="mb pri" ${on?'disabled':''} onclick="uiWearStored(${uid})">${on?'穿著中':'換上這件裝備'}</button><button class="mb" onclick="uiKeepStored(${uid})">${it.kept?'解除保管鎖定':'鎖定保管'}</button><button class="mb" ${guard?'disabled':''} onclick="uiRecycleAsk(${uid})">回收裝備</button></div>${guard?'<p class="uxmeta">穿著、上一件、構築引用、鎖定、詞綴鎖定或已腐化的裝備受保護，不能直接回收。</p>':''}`);
}
function uiWearStored(uid){if(!equipStored(uid)){uxAnnounce('裝備狀態已變更，請重新查看。');return;}hideOverlay();renderModal();uxAnnounce('已換裝，自動換裝已關閉，上一件裝備保留。');}
function uiKeepStored(uid){const it=G.inventory.find(x=>x.uid===uid);if(!it)return;it.kept=!it.kept;G.inventoryRevision++;G.dirty=true;hideOverlay();renderModal();uxAnnounce(it.kept?'裝備已鎖定保管。':'已解除保管鎖定。');}
function uiRecycleAsk(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;
 hideOverlay();showOverlay(`<h2 class="uxdialog-title">回收 ${uxEsc(it.name)}？</h2><p>裝備會消失，轉為 ${itemValue(it)} 金幣及零件；不能還原。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留裝備</button><button class="mb pri" onclick="uiRecycleConfirm(${uid})">確認回收</button></div>`);
}
function uiRecycleConfirm(uid){const ok=recycleStored(uid);hideOverlay();renderModal();document.querySelector('[data-focus="warehouse-auto"]')?.focus();uxAnnounce(ok?'已回收為金幣與零件。':'裝備受到保護或已不存在，沒有回收。');}
function circuitShopHtml(){return `<details class="ui-section"><summary>電路合成 · <span id="ui-chip-count">${G.chips}</span> 點</summary><p>拾取敵人掉落的電路點數，用來指定合成配件；所有角色都能使用，相鄰及標籤規則照常生效。</p>${['FOCUS','FORK','RECOVER','DELAY'].map(id=>`<article><p>${gemIco(id,24)} ${SUPPS[id].n} · ${SUPPS[id].d}</p><button class="mb" ${G.chips<20?'disabled':''} onclick="uiBuySupport('${id}')">20 點合成 ${SUPPS[id].n}</button></article>`).join('')}<h3>連動模式</h3><p>選取衛星或雷射，再到模式卡匣裝上。搭配連動優先，會先準備凍結或電荷；所有角色可用。</p>${['METEOR_COLDSTART','BEAM_CAPACITOR'].map(id=>`<article><p><b>${MODES[id].n}</b> · ${MODES[id].d}</p><button class="mb" data-focus="recipe-${id}" ${G.chips<20||G.carts[id]||G.lvl<SKILLS[MODES[id].sk].lvl?'disabled':''} onclick="uiBuyCircuitMode('${id}')">${G.carts[id]?'已持有 '+MODES[id].n:G.lvl<SKILLS[MODES[id].sk].lvl?'等級 '+SKILLS[MODES[id].sk].lvl+' 解鎖':'20 點合成 '+MODES[id].n}</button></article>`).join('')}</details>`;}
function uiBuySupport(id){if(!buyCircuitSupport(id)){uxAnnounce('電路點數不足，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${SUPPS[id].n}，消耗 20 電路點數。`);}
function treeAvailableHtml(){
 const open=Object.values(TREE).filter(n=>canAllocateTalent(n.id)),branch={A:'耐久',B:'元素',C:'暴擊',D:'超頻',E:'回授',F:'電池',R:'接線'};
 return `<details class="ui-section"><summary>可連接節點清單（${open.length}）</summary><p>可用清單選擇，不必瞄準盤面的小圓點。每個節點消耗 1 天賦點，所有角色共用。</p><div class="ui-directory">${open.map(n=>`<button data-focus="talent-${n.id}" ${passPoints()<=0?'disabled':''} onclick="uiAllocateTalent('${n.id}')"><b>${branch[n.id[0]]}支線</b><span>${uxEsc(talentName(n.id))}</span></button>`).join('')||'<p>點數或韌體已達上限，或目前沒有可分配節點。可退回末端點後重新選路。</p>'}</div></details>`;
}
function uiAllocateTalent(id){const before=G.pass.length;allocPass(id);if(G.pass.length>before){document.querySelector(`[data-tree="${id}"]`)?.focus();uxAnnounce(`已點亮${talentName(id)}。`);uxAnimatePanel();}}

function warehouseMove(delta){WAREHOUSE_UI.page=Math.max(0,WAREHOUSE_UI.page+delta);renderModal();const id=delta>0?'warehouse-next':'warehouse-prev',next=document.querySelector(`[data-focus="${id}"]`);(next&&!next.disabled?next:document.querySelector(`[data-focus="${delta>0?'warehouse-prev':'warehouse-next'}"]`))?.focus();}

function uiPolicyHtml(){return `<div class="view-options" role="group" aria-label="出手策略">${[['balanced','均衡出手'],['combo','連動優先']].map(([id,name])=>`<button class="mb" aria-pressed="${G.castPolicy===id}" data-focus="cast-policy-${id}" onclick="uiSetCastPolicy('${id}')">${name}</button>`).join('')}</div><p class="uxmeta">均衡讓就緒較久的技能先出手；連動先鋪墊凍結或電荷，最多額外等候 1.2 秒，仍保留其他技能的出手機會。</p>`;}
function uiSetCastPolicy(id){if(!['balanced','combo'].includes(id))return;G.castPolicy=id;G.dirty=true;renderModal();uxAnnounce(id==='combo'?'已使用連動優先。':'已使用均衡出手。');}
function uiTrainingPreset(id){if(G.train||!['single','crowd'].includes(id))return;G.trainingPreset=id;renderModal();}
function uiComboSummary(c={}){return `<p>產生電荷 ${c.chargeGain||0} 格／消耗 ${c.chargeSpent||0} 格；冷啟動鎖定 ${c.coldBursts||0} 次；凍結 ${c.freezes||0} 次。</p>`;}
function uiCombatHtml(){return `<details id="ui-combat-report" class="ui-section"><summary>本段出手戰報</summary><p id="ui-combat-time" class="uxmeta">展開後更新。戰報從本次載入或重設起累積，不寫入存檔。</p><p id="ui-charge-live"></p><div class="ui-resolved">${G.slots.map(id=>`<article data-combat-id="${id}"><div><b>${SKILLS[id].n}</b><span data-combat-status>尚未出手</span></div><p data-combat-count>0 次出手</p></article>`).join('')}</div><p id="ui-combat-combos"></p><button class="mb" data-focus="reset-combat" onclick="uiResetCombatReport()">重設本段戰報</button></details>`;}
function uiResetCombatReport(){if(G.train){uxAnnounce('訓練進行中，請先完成或取消。');return;}resetCombatReport();uiCombatRefresh();uxAnnounce('已重設本段戰報，遊戲進度不變。');}
function uiCombatRefresh(){
  const el=$('ui-combat-report');if(!el?.open)return;
  const book=G.train||G.combat||{start:G.time},elapsed=Math.max(0,G.time-(book.start??G.time));
  $('ui-combat-time').textContent=`${G.train?'目前訓練':'本段戰鬥'}：${elapsed.toFixed(0)} 秒。傷害只記實際扣除生命，不含溢傷。`;
  $('ui-charge-live').textContent=G.st.sk.BEAM?.pattern.capacitor?`訊號電荷：${G.signalCharge}／${COMBAT_RULES.chargeMax}，由紅外線原始命中產生。`:'';
  for(const row of el.querySelectorAll('[data-combat-id]')){
    const id=row.dataset.combatId,stats=book.stats?.[id],k=G.st.sk[id];
    const damage=Object.entries(book.damage||{}).filter(([name])=>name===SKILLS[id].n||name.startsWith(SKILLS[id].n+'·')).reduce((sum,[,n])=>sum+n,0);
    row.querySelector('[data-combat-count]').textContent=`${stats?.casts||0} 次出手／${stats?.repeats||0} 次回放；有效傷害 ${tFmt(damage)}；最長等候 ${(stats?.maxWait||0).toFixed(1)} 秒`;
    row.querySelector('[data-combat-status]').textContent=G.h.castT>=0&&G.h.castSk===id?'正在出手':!G.mons.some(m=>!m.dead&&!(m.fall>0))?'等待敵人':G.cds[id]>0?`冷卻 ${G.cds[id].toFixed(1)} 秒`:G.castPolicy==='combo'&&k?.pattern.capacitor&&G.signalCharge<4?'等候電荷或後備出手':G.castPolicy==='combo'&&k?.pattern.coldStart&&!G.mons.some(m=>m.frozen>0&&!m.dead)?'等候凍結或後備出手':'已就緒，輪候出手';
  }
  const c=book.combos||{};$('ui-combat-combos').textContent=`產生／消耗電荷 ${c.chargeGain||0}／${c.chargeSpent||0} 格；冷啟動 ${c.coldBursts||0} 次。`;
}
function uiBuyCircuitMode(id){if(!buyCircuitMode(id)){uxAnnounce('尚未解鎖、點數不足或已持有，沒有扣除資源。');return;}renderModal();uxAnnounce(`已合成${MODES[id].n}，消耗 20 電路點數。選取對應技能，再到模式卡匣裝上。`);}

/* 城市流程延伸既有冒險與確認視窗，不新增頂層導覽。 */
const CITY_UI={route:'memory',tier:1};let CITY_CONFIRM=null,TALENT_CONFIRM=null;
function uiTalentBudget(){return `<section class="ui-section"><h3>路徑 ${G.pass.length}／${talentBudget()} · 韌體 ${firmwareCount(G.pass)}／${FIRMWARE_LIMIT}</h3>${G.run?.city||G.train?'<p>先結束城市遠征或訓練，再更動天賦。</p>':''}<p>路徑上限 ${TALENT_LIMIT} 點；等級與深度解鎖點數。最多兩個韌體，效果與代價同時生效。</p>${passiveLegacy()?'<p>目前保留舊制配置，未刪除任何節點。先預覽並免費轉換，才可進入城市遠征。</p><button class="mb pri" onclick="uiTalentPreview()">預覽免費轉換</button>':''}${G.legacyTalent&&!G.legacyMode?'<button class="mb" onclick="uiRestoreTalents()">還原改版前天賦</button>':''}<details><summary>六種韌體與代價</summary>${Object.entries(FIRMWARE).map(([id,f])=>`<p><b>${f.n}</b>：${f.d}${G.pass.includes(id)?'（已選）':''}</p>`).join('')}</details><details><summary>退回末端節點（免費）</summary><p>只可退回不會切斷其他節點的點。進行挑戰或訓練時暫不可更動。</p>${G.pass.filter(id=>connectedTalents(G.pass.filter(k=>k!==id))).map(id=>`<button class="mb" data-focus="refund-${id}" ${G.run||G.train?'disabled':''} onclick="uiRefundTalent('${id}')">退回 ${uxEsc(talentName(id))}</button>`).join('')||'<p>尚未分配節點。</p>'}</details></section>`;}
function uiTalentPreview(){if(G.run||G.train){uxAnnounce('先結束挑戰或訓練，再轉換天賦。');return;}const plan=talentPlan(),after=calc(G.equip,plan,G.slots,G.supp,true);TALENT_CONFIRM={pass:JSON.stringify(G.pass),plan:JSON.stringify(plan),legacy:G.legacyMode,bi:G.bi||0};showOverlay(`<h2 class="uxdialog-title">預覽有限天賦配置</h2><p>保留 ${plan.length} 點／${firmwareCount(plan)} 個韌體，移出 ${G.pass.length-plan.length} 個節點；永久裝備與庫存保留。原配置另存快照，可還原。</p><p>單體直傷預估：${tFmt(G.st.dps)} → ${tFmt(after.dps)}<br>最大生命：${tFmt(G.st.life)} → ${tFmt(after.life)}</p><details><summary>預覽保留節點</summary>${plan.map(id=>`<p>${uxEsc(FIRMWARE[id]?.n||TREE[id].name)}</p>`).join('')}</details><p>轉換免費，不會自動購買或分配其他節點。城市挑戰需要使用有限預算。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="TALENT_CONFIRM=null;hideOverlay()">保留原配置</button><button class="mb pri" onclick="uiConfirmTalents()">免費轉換</button></div>`);}
function uiConfirmTalents(){const pending=TALENT_CONFIRM;TALENT_CONFIRM=null;hideOverlay();if(!pending||pending.pass!==JSON.stringify(G.pass)||pending.plan!==JSON.stringify(talentPlan())||pending.legacy!==G.legacyMode||pending.bi!==(G.bi||0)||!convertTalents()){uxAnnounce('配置已變動或挑戰進行中，請重新預覽。');return;}renderModal();uxAnnounce('已免費轉換，原天賦快照可還原。');}
function uiRestoreTalents(){showOverlay('<h2 class="uxdialog-title">還原改版前天賦？</h2><p>恢復改版前的天賦與三套配置，裝備與新取得道具保留。還原後暫停城市入口，可再次免費轉換。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留目前配置</button><button class="mb pri" onclick="hideOverlay();if(restoreLegacyTalents()){renderModal();uxAnnounce(\'已還原舊天賦。\')}">還原舊天賦</button></div>');}
function uiRefundTalent(id){if(!refundTalent(id)){uxAnnounce('節點會切斷路徑或挑戰進行中，未退回。');return;}renderModal();uxAnnounce('已退回一點天賦，可重新分配。');}
function uiCityConfig(key,value){if(key==='route'&&CITY_ROUTES[value])CITY_UI.route=value;if(key==='tier')CITY_UI.tier=Math.max(1,Math.min(G.city?.maxTier||1,Number(value)||1));renderModal();}
function uiCityPolicy(id){if(!['safe','risk'].includes(id))return;G.city||=newCity();G.city.policy=id;G.dirty=true;renderModal();}
function uiCityTarget(id){if(!LEGEND_BY[id])return;G.city||=newCity();G.city.target=id;G.dirty=true;renderModal();uxAnnounce(`追求目標：${LEGEND_BY[id].name}。已出發遠征保留原目標。`);}
function uiCityGo(){UI_WORK.adventure='city';openModal('maps');}
function uiCityStart(nexus=false){const route=CITY_UI.route,tier=CITY_UI.tier;if(!cityCanStart(route,tier,nexus)){uxAnnounce('尚未解鎖、憑證不足或挑戰進行中，未出發。');return;}
 if(!nexus){cityStart(route,tier);closeModal();return;}
 CITY_CONFIRM={route,tier,target:G.city.target};showOverlay(`<h2 class="uxdialog-title">挑戰第 ${tier} 階城市中樞？</h2><p>消耗本階三區憑證各一枚。勝利保證掉落出發時選定的核心，並解鎖下一階（最高八階）；失敗不退憑證，已完成路段碎片保留。</p><p>目標：${LEGEND_BY[G.city.target].name}</p><div class="uxactions"><button class="mb" data-initial-focus onclick="CITY_CONFIRM=null;hideOverlay()">先不挑戰</button><button class="mb pri" onclick="uiCityConfirmStart()">消耗三區憑證並出發</button></div>`);}
function uiCityConfirmStart(){const c=CITY_CONFIRM;CITY_CONFIRM=null;hideOverlay();if(!c||c.target!==G.city.target||!cityStart(c.route,c.tier,true)){uxAnnounce('遠征狀態已變動，沒有消耗憑證。');return;}closeModal();}
function uiCityChoose(id,stage){if(cityChoose(id,stage)){renderModal();uxAnnounce('已套用當局協定，繼續遠征。');}else uxAnnounce('路段已變動，沒有重複選路。');}
function uiForgeCore(id){const C=G.city||(G.city=newCity()),route=cityRouteForCore(id);if(!route)return;showOverlay(`<h2 class="uxdialog-title">定向合成${LEGEND_BY[id].name}？</h2><p>消耗 ${CITY_ROUTES[route].n}的 24 枚碎片（持有 ${C.fragments[route]}）。生成等級 ${Math.max(8,G.maxDepth)}，詞綴數值隨機；特殊效果固定。加入核心收藏，不自動換裝。</p><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">保留碎片</button><button class="mb pri" onclick="uiConfirmForge('${id}')">消耗 24 碎片合成</button></div>`);}
function uiConfirmForge(id){hideOverlay();if(forgeTargetCore(id)){renderModal();uxAnnounce('合成完成，已加入角色的傳奇核心收藏；未改動裝備。');}else uxAnnounce('碎片不足、已持有或挑戰進行中，沒有扣款。');}
function uiCityRunHtml(){const R=G.run,c=R.city;return `<section class="ui-section"><h3>${c.nexus?'城市中樞':CITY_ROUTES[c.route].n} · 第 ${c.tier} 階</h3><p>路段 ${c.stage}／3 · ${c.stage===3?'收尾首領':`<span id="ui-run-count">擊殺 ${Math.min(R.kills,R.need)}／${R.need}</span>`}</p><p>已存 ${c.bank} 枚${CITY_ROUTES[c.route].n}碎片；撤離或死亡仍帶回。核心目標：${LEGEND_BY[c.target].name}。</p>${c.branches.length?`<p>當局協定：${c.branches.map(id=>CITY_BRANCHES[id].n).join('、')}</p>`:''}${c.awaitChoice?`<h3>下一段走哪條路？</h3><p>效果累加，只在本次遠征生效。</p><p id="ui-city-choice-time">15 秒後依出發策略自動選路，也可立即選擇。</p><div class="ui-directory">${Object.entries(CITY_BRANCHES).map(([id,b])=>`<button data-focus="city-branch-${id}" onclick="uiCityChoose('${id}',${c.stage})"><b>${b.n}</b><span>${b.d}</span></button>`).join('')}</div>`:`<p>${c.nexus?'訊號、護盾與重裝威脅依路段輪替，首領在生命 65%／30% 時加速。':CITY_ROUTES[c.route].threat}</p>`}<button class="mb" onclick="uiLeaveMap()">撤離並帶回碎片</button></section>`;}
function uiCityHtml(){const C=G.city||(G.city=newCity());CITY_UI.tier=Math.min(C.maxTier,CITY_UI.tier);const route=CITY_UI.route,tier=CITY_UI.tier,target=C.target,tr=cityRouteForCore(target),active=!!G.run||!!G.train;
 return `<section class="ui-section"><h3>城市遠征</h3><p>選擇路線，追求對應核心。完成三區後挑戰中樞。</p><details><summary>遠征規則與進度</summary><p>三個路段、兩次選路、一次收尾首領。三區憑證開啟同階中樞；完成中樞推進下一階。各階憑證分開保存，沒有每日重置。</p></details>${!cityReady()?`<p>${G.maxDepth<8?'最深第 8 層解鎖。':'先到成長頁預覽並轉換有限天賦。'}</p>`:''}${C.last?`<p>${uxEsc(C.last.text)}</p>`:''}<div class="view-options" role="group" aria-label="遠征階級">${Array.from({length:C.maxTier},(_,i)=>i+1).map(t=>`<button class="mb" aria-pressed="${t===tier}" data-focus="city-tier-${t}" onclick="uiCityConfig('tier',${t})">第 ${t} 階</button>`).join('')}</div><p>第 ${tier} 階憑證：${Object.keys(CITY_ROUTES).map(id=>`${CITY_ROUTES[id].n} ${C.seals[tier]?.[id]?'✓':'未取得'}`).join('／')}</p></section><section class="ui-section"><div class="view-options" role="group" aria-label="城市路線">${Object.entries(CITY_ROUTES).map(([id,r])=>`<button class="mb" aria-pressed="${route===id}" data-focus="city-route-${id}" onclick="uiCityConfig('route','${id}')">${r.n}</button>`).join('')}</div><h3>${CITY_ROUTES[route].n}</h3><p>敵人等級 ${Math.max(8,G.maxDepth)+2*(tier-1)}；當局增益與代價結束後移除。</p><p>${CITY_ROUTES[route].d}</p><p>${CITY_ROUTES[route].threat}。掉落偏向：${CITY_ROUTES[route].cores.map(id=>LEGEND_BY[id].name).join('、')}。</p><p>碎片 ${C.fragments[route]} 枚／核心成本 24。首階完整遠征至少 14 枚，安全路線兩次即可合成一款未持有核心；收尾另有 15% 區域核心機會。</p><button class="mb pri" data-focus="city-start" ${cityCanStart(route,tier)?'':'disabled'} onclick="uiCityStart()">出發第 ${tier} 階遠征</button><button class="mb" ${cityCanStart(route,tier,true)?'':'disabled'} onclick="uiCityStart(true)">挑戰第 ${tier} 階中樞 · 消耗三區憑證</button>${active?'<p>先結束目前挑戰或訓練。</p>':''}<details><summary>離線出發策略</summary><p>出發即授權離線自動選路：${C.policy==='risk'?'帶電捷徑':'旁路校準'}。只完成當前遠征；失敗不重開、不自動消耗其他門票。前景到分岔可自行選擇，15 秒後依出發策略自動繼續。</p><div class="view-options">${[['safe','保守選路'],['risk','碎片優先']].map(([id,n])=>`<button class="mb" aria-pressed="${C.policy===id}" onclick="uiCityPolicy('${id}')">${n}</button>`).join('')}</div></details></section><section class="ui-section"><h3>追求：${LEGEND_BY[target].name}</h3><p>${LEGEND_BY[target].d}</p><p>來源：${CITY_ROUTES[tr].n}。${C.fragments[tr]}／24 枚碎片；城市中樞勝利保證掉落出發時目標。遠征中的目標不隨此處變更。</p><button class="mb" ${!active&&cityReady()&&!G.armory[target]&&C.fragments[tr]>=24?'':'disabled'} onclick="uiForgeCore('${target}')">${G.armory[target]?'已收藏 '+LEGEND_BY[target].name:'24 碎片合成 '+LEGEND_BY[target].name}</button><button class="mb" onclick="openModal('char')">查看核心收藏</button><details><summary>選擇追求核心 · 九款</summary><div class="ui-directory">${Object.entries(CITY_ROUTES).flatMap(([rid,r])=>r.cores.map(id=>`<button data-focus="city-target-${id}" aria-pressed="${target===id}" onclick="uiCityTarget('${id}')"><b>${LEGEND_BY[id].name}${G.armory[id]?' · 已收藏':''}</b><span>${r.n} · ${LEGEND_BY[id].d}</span></button>`)).join('')}</div></details></section>`;
}

let CITY_CHECKPOINT_REVEALED=null;
function uiCityRevealCheckpoint(){const c=G.run?.city;if(modalTab!=='maps'||!c?.awaitChoice||UX_LAYERS.length)return;const key=G.run.map.id+':'+c.stage;if(CITY_CHECKPOINT_REVEALED===key)return;CITY_CHECKPOINT_REVEALED=key;requestAnimationFrame(()=>{if(modalTab!=='maps'||!G.run?.city?.awaitChoice)return;$('mbody').scrollTop=0;document.querySelector('[data-focus="city-branch-safe"]')?.focus({preventScroll:true});});}

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
/* 色彩由材質與預先量化圖集提供；LCD 字模預先生成，不做整面 SVG 合成。 */
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
  if(!GAME_VIEW.prefs.glitch||matchMedia('(prefers-reduced-motion: reduce)').matches){FXO.shake=0;FXO.flash=0;FXO.punch=0;FXO.stop=0;}
  if(!motion){clearTimeout(GAME_VIEW.pulseTimer);document.body.classList.remove('ui-fx-pulse');}
  const range=$('ui-fx-level'),name=$('ui-fx-name');if(range){range.value=GAME_VIEW.prefs.uiFx;range.setAttribute('aria-valuetext',UI_FX_NAMES[GAME_VIEW.prefs.uiFx]);}if(name)name.textContent=UI_FX_NAMES[GAME_VIEW.prefs.uiFx];
  document.body.classList.toggle('pixel-icons',GAME_VIEW.prefs.pixels);
  for(const key of Object.keys(VIEW_ATLASES)){
    if(GAME_VIEW.prefs.pixels&&GAME_VIEW.atlases[key])document.documentElement.style.setProperty('--pixel-'+key,`url("${GAME_VIEW.atlases[key]}")`);
    else document.documentElement.style.removeProperty('--pixel-'+key);
  }
  document.querySelectorAll('[data-view-idle]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.viewIdle===GAME_VIEW.prefs.idle)));
  document.querySelectorAll('[data-view-setting]').forEach(b=>{const on=GAME_VIEW.prefs[b.dataset.viewSetting];b.setAttribute('aria-pressed',String(on));b.textContent=b.dataset.viewSetting==='pixels'?(on?'像素圖示':'原始圖示'):(on?'動態衝擊：開':'動態衝擊：關');});
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
  const setBar=(el,ratio,now,max)=>{const percent=String(Math.round(ratio*100)),pixel=Math.ceil(ratio*50)*2+'%';if(el.getAttribute('aria-valuenow')!==percent){el.setAttribute('aria-valuenow',percent);el.style.setProperty('--fill',percent+'%');}if(el.style.getPropertyValue('--pixel-fill')!==pixel)el.style.setProperty('--pixel-fill',pixel);const text=`${now}／${max}`;if(el.getAttribute('aria-valuetext')!==text)el.setAttribute('aria-valuetext',text);};
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
  const settings=document.createElement('section');settings.className='view-settings';settings.setAttribute('aria-label','畫面與觀戰');settings.innerHTML='<h3>畫面與觀戰</h3><p>像素質感套用整個操作介面，搭配低面數場景；震動、衝擊與動態訊號可獨立關閉。</p><div class="view-options" role="group" aria-label="圖示與動態效果"><button type="button" data-view-setting="pixels"></button><button type="button" data-view-setting="glitch"></button></div><h4>無操作後自動觀戰</h4><div class="view-options" role="group" aria-label="自動觀戰等待時間">'+[[0,'關閉'],[30,'30 秒'],[60,'60 秒'],[120,'2 分鐘']].map(([s,t])=>`<button type="button" data-view-idle="${s}">${t}</button>`).join('')+'</div><p>觀戰填滿遊戲視窗。點一下或按 Esc 返回；編輯、拖曳及選擇獎勵時不自動切換。系統啟用減少動態效果時，訊號動畫會停用。</p><button type="button" id="watch-now">立即觀戰 ↗</button>';
  $('uisettings').prepend(settings);
  const control=document.createElement('div');control.className='view-fx-control';control.innerHTML='<div><label for="ui-fx-level">介面像素質感</label><output for="ui-fx-level" id="ui-fx-name"></output></div><input id="ui-fx-level" type="range" min="0" max="3" step="1" aria-describedby="ui-fx-help"><div class="view-fx-ticks" aria-hidden="true"><span>關閉</span><span>輕微</span><span>標準</span><span>強烈</span></div><p id="ui-fx-help">調整外殼訊號紋理。關閉時保留像素字體，恢復平滑按鍵與連續血條。</p>';
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
if (!loadedT) logLine('冒險開始！英雄會自動戰鬥並走近拾取掉落物，裝備可到角色的倉庫管理。', '#2b2552');

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
ui.renderInterval=1000/30;
ui.suspendRender=()=>G.offline||document.hidden||FXO.stop>0;
ui.animate(dt => {
  const now = Date.now(), gap = (now - G.lastWall)/1000; G.lastWall = now;
  if (G.paused) return true;
  if (FXO.stop > 0) FXO.stop -= dt;
  if (G.relicPicks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offerR && $('ovl').hidden))) openRelics();
  else if (G.picks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offer && $('ovl').hidden))) openCards();
  if (gap > 3){ catchUp(gap, gap > 20); return true; }
  stepSim(gap>=0?gap:dt); return true;
});
setInterval(() => { if (!G.paused) saveGame(); }, 5000);
addEventListener('pagehide', () => { if (!G.paused) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.paused) saveGame(); });
document.getElementById('boot')?.remove();

