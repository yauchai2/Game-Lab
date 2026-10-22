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
  inventory:[], nextGearId:1, inventoryRevision:0, autoEquip:true, storageRecycled:0, chips:0, equip:{ weapon:null, armor:null, ring:null }, armory:{}, equipBackup:{}, deferChoices:false, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
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
  inventory:G.inventory,nextGearId:G.nextGearId,autoEquip:G.autoEquip,storageRecycled:G.storageRecycled,chips:G.chips,groundDrops:G.drops.filter(d=>!d.done),equip:G.equip, armory:G.armory, equipBackup:G.equipBackup, deferChoices:G.deferChoices, gems:G.gems, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, mk:G.mk, seenG:G.seenG, seenC:G.seenC, cz:G.cz, userCz:G.userCz, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:Number.isFinite(G.train?.hpBefore)?G.train.hpBefore*G.st.life:G.h.hp, log:G.log.slice(0, 5) }; }
function applySave(o){
  if (!o || o.v !== 2) return false;
  G.castPolicy=o.castPolicy==='combo'?'combo':'balanced';G.signalCharge=0;G.readySince={};G.combat=null;G.castSerial=0;G.signalGainRoot=null;G.h.castT=-1;G.h.swingT=-1;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','mk','seenG','seenC','cz','userCz','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  if (o.seenC === undefined) G.seenC = { ...G.carts };
  G.armory = Object.fromEntries(Object.entries(o.armory || {}).filter(([id,it]) => coreSlot(id) && it && it.lg === id && it.slot === coreSlot(id) && Array.isArray(it.aff) && it.imp));
  G.equipBackup = Object.fromEntries(Object.entries(o.equipBackup || {}).filter(([slot,it]) => SLOTN[slot] && it?.slot === slot && Array.isArray(it.aff) && it.imp));
  G.deferChoices = o.deferChoices === true;
  G.inventory=(Array.isArray(o.inventory)?o.inventory:[]).filter(validGear).slice(0,200);
  {const used=new Set();let next=1;for(const it of G.inventory){if(!Number.isSafeInteger(it.uid)||it.uid<1||it.uid>1e8||used.has(it.uid)){while(used.has(next))next++;it.uid=next++;}used.add(it.uid);}G.nextGearId=Math.max(1,...used)+1;}G.autoEquip=o.autoEquip!==false;
  G.storageRecycled=Math.max(0,+o.storageRecycled||0);G.chips=Math.max(0,+o.chips||0);G.inventoryRevision++;
  for(const group of [G.equip,G.equipBackup])for(const slot of Object.keys(group)){const it=group[slot];if(validGear(it)&&!it.lg){storeGear(it);group[slot]=G.inventory.find(x=>x.uid===it.uid)||it;}}

  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!CHARS[G.char]) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = (Array.isArray(o.groundDrops)?o.groundDrops:[]).filter(validDrop).map(d=>({...d,t:Number.isFinite(d.t)?d.t:0,done:false})); G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces){ if (o.board.v === 3) G.board = o.board; else sanitizeBoard(o.board); } else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  loadProgression(o);recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
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
    const low=G.inventory.filter(x=>!x.kept&&!x.cr&&x.lk==null&&!protectedItems.includes(x)).sort((a,b)=>gearPriority(a)-gearPriority(b))[0];
    if(!low||gearPriority(it)<=gearPriority(low))return false;
    G.inventory=G.inventory.filter(x=>x!==low);recycleOverflow(low);
  }
  it.uid=G.nextGearId++;G.inventory.push(it);G.inventoryRevision++;return true;
}
function equipStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||G.equip[it.slot]===it)return false;
  const old=G.equip[it.slot];if(old&&!old.lg&&!storeGear(old))return false;
  G.equipBackup[it.slot]=old;G.equip[it.slot]=it;G.autoEquip=false;recalc();G.inventoryRevision++;return true;
}
function recycleStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||it.kept||it.cr||it.lk!=null||Object.values(G.equip).includes(it)||Object.values(G.equipBackup).includes(it))return false;
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
    if (old && (active || old.cr || old.lk != null || cand.power <= calc({...G.equip,[it.slot]:old}).power*1.02)){
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
  return `<section class="ui-build" aria-label="構築配置"><div><b>構築</b>${[0,1,2].map(i=>`<button class="mb" aria-label="構築 ${i+1}" aria-pressed="${(G.bi||0)===i}" onclick="switchBuild(${i})">${i+1}</button>`).join('')}</div><p class="uxmeta">技能、天賦與出手策略獨立，裝備共用。</p>${uiPolicyHtml()}</section>`;
}
function dpsBar(){
  const sk = G.st.sk || {}, ids = Object.keys(sk), tot = ids.reduce((a, id) => a+sk[id].direct*sk[id].estimatedCasts, 0) || 1;
  return `<div class="dpsbar"><div>單體直傷預估 <b>${tFmt(G.st.dps)}</b> <span id="pzdelta" class="mute"></span></div><div class="shares">${ids.map(id => `<span style="flex:${Math.max(1, Math.round(sk[id].direct*sk[id].estimatedCasts/tot*100))}" title="${SKILLS[id].n}">${SKILLS[id].n}</span>`).join('')}</div>${uxPieceDetails()}</div>`;
}
function switchBuild(i){
  if(G.run?.city||G.train){uxAnnounce('先結束城市遠征或訓練，再切換構築。');return;}if (i === (G.bi || 0)) return; if (!G.builds) G.builds = [null, null, null];
  G.builds[G.bi || 0] = JSON.parse(JSON.stringify({board:G.board,pass:G.pass,castPolicy:G.castPolicy,legacyMode:G.legacyMode}));
  const t = G.builds[i]; G.bi = i; selPiece = null; held = null;
  if (t){ G.board = JSON.parse(JSON.stringify(t.board)); G.pass=t.pass.slice();G.castPolicy=t.castPolicy==='combo'?'combo':'balanced';G.legacyMode=t.legacyMode===true||talentOverLimit(G.pass); } else { boardFromLegacy(['FIRE'], {}); G.pass=[];G.castPolicy='balanced';G.legacyMode=false;}
  const use = {}, cu = {};   // 配件與卡匣只有一份庫存：超出的從這套拿掉
  G.board.pieces = G.board.pieces.filter(p => { if (p.kind !== 'support') return true; use[p.key] = (use[p.key] || 0) + 1; return use[p.key] <= (G.gems[p.key] || 0); });
  for (const p of G.board.pieces) if (p.mode){ cu[p.mode] = (cu[p.mode] || 0) + 1; if (cu[p.mode] > (G.carts[p.mode] || 0)) p.mode = null; }
  recalc(); logLine(`切換到構築 ${i + 1}`, '#2f7fc4'); renderModal();
}
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
function hideOverlay(){ craftPending=null;UI_RESPEC=null;uxCloseDialog($('ovl')); }
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
    const lines=[`<li><span>${AFF[it.imp.k].t(it.imp.v)}</span><small>固定屬性</small></li>`].concat(it.aff.map((a,i)=>`<li><span>T${affTier(a,it.il)} · ${AFF[a.k].t(a.v)}</span><button class="mb lk${it.lk===i?' on':''}" ${it.cr?'disabled':''} aria-label="${it.lk===i?'解除鎖定':'鎖定'}${uxEsc(AFF[a.k].t(a.v))}" onclick="craftLock('${sl}',${i})">${spr(it.lk===i?'lock':'unlock',20)}</button></li>`));
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
  return `<h2 class="uxdialog-title">歡迎回來！</h2><p class="uxmeta">離開 ${fmtDur(away)}${away > sec ? `，最多結算 ${fmtDur(sec)}` : ''}</p><div class="uxreturn-summary"><div><span>成長</span><b>等級 ${b.lvl} → ${G.lvl}</b><small>金幣 +${tFmt(G.gold-b.gold)}</small></div><div><span>裝備</span><b>換上 ${o.eq} 件</b><small>${cores?`新收藏 ${cores} 種傳奇核心`:`倉庫收進 ${o.stored||0} 件；回來可比較換裝`}</small></div><div><span>新資源</span><b>${newPieces} 件配件／卡匣</b><small>${o.maps} 張地圖</small></div>${pending?`<div><span>待選</span><b>${G.picks} 次改裝 · ${G.relicPicks} 次遺物</b><small>選擇已保留，可以稍後處理。</small></div>`:''}</div>${G.deaths>b.deaths ? `<p class="uxwarning">這段時間倒下 ${G.deaths-b.deaths} 次，可先檢查防禦與構築。</p>` : ''}${saved ? '' : '<p class="uxwarning">本機存檔未成功，請至存檔頁匯出存檔碼保存。</p>'}<details class="uxreturn-log"><summary>完整紀錄</summary><ul><li>擊殺 ${tFmt(G.totalKills-b.kills)} 隻怪物</li><li>深度 ${b.depth} → ${G.depth}</li><li>倒下 ${G.deaths-b.deaths} 次</li>${o.cards.length ? `<li>依自動隨機設定完成：${o.cards.map(uxEsc).join('、')}</li>` : ''}</ul></details><div class="uxactions">${pending?'<button class="mb pri" onclick="openPendingChoices()">查看待選內容</button>':''}${action}<button class="mb" onclick="hideOverlay()">繼續掛機</button>${saved ? '' : '<button class="mb" onclick="uxOfflineGo(\'save\')">備份存檔</button>'}</div>`;
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
  rule:{ n:'規則', rows:() => [['技能拼圖', '6×6 面板隨等級逐列解鎖。輔助配件只強化上下左右相鄰的技能；連到 3 個以上輔助「滿載」，每多一個傷害 +8%。'], ['有限天賦','路徑最多 36 點，韌體最多兩個；等級與深度解鎖可用點數。末端節點可免費退回，不能切斷其他節點。舊配置保留快照，可預覽、免費轉換與還原；城市需要有限預算。'],['韌體核心',Object.values(FIRMWARE).map(f=>f.n+'：'+f.d).join('；')],['城市遠征','最深第 8 層開放，三個路段、兩次選路、一次收尾首領。三區分別為高速分散、停火回充護盾及可用異常解除的重裝減傷。當局協定不寫入永久卡片。'],['定向核心','區域碎片 24 枚可合成一款對應區域的未持有核心，特殊效果固定、詞綴隨機，不自動換裝；安全首階完整遠征至少 14 枚。收尾另有 15% 區域核心機會。'],['城市中樞','同階三區憑證各一枚開啟中樞，失敗不退憑證；勝利保證掉落出發時目標核心，並解鎖下一階，最高八階。憑證沒有每日重置。'],['城市離線','出發時授權保守或碎片優先選路，前景分岔有 15 秒可自行選路，逾時或離線依出發策略繼續；只完成當前遠征，不重開或消耗其他門票。撤離及死亡保留已完成路段碎片；首領未完成便不發收尾獎勵。'],['技能出手','共用 0.4 秒出手時段，依就緒時間輪流。均衡策略先服務最早就緒技能；連動優先可短暫等待凍結或電荷，等不到也會出手。冷卻縮減最多 60%。'],['直傷預估','包含模式、回放與出手容量的單體直傷期望；不含燃燒、條件反應、角色專技或擊殺觸發。命中範圍、移動與連動會令實戰不同。'],['首領凍結','單次凍結需累積相當於最大生命 12% 的控制傷害，每次最多推進 75%；累積會逐秒衰減。凍結後適應 4 秒，期間不能再累積。'],['連動卡匣','冷啟動碎星消耗凍結換取三倍單點命中；撥號放電由紅外線原始命中產生電荷，每次最多 4 格，雷射消耗最多 8 格。回放與觸發不會產電。兩款可用 20 電路點數合成。'],['訓練場','可選單體或五個群體假人，持續 30 秒。測量有效傷害、出手、回放與連動；不發放獎勵，結束或取消會還原入場前電荷與冷卻。'],['裝備倉庫','角色頁可開啟 200 格倉庫，比較、鎖定、換裝及回收。手動換裝關閉自動換裝；滿倉優先保留高稀有度及高階詞綴，僅回收未保護裝備。'],['掉落拾取','金幣、電路點數與道具落地後，角色走近才拾取；未拾物會保存。經驗仍由擊殺獲得，離線補算會完成收集。'],['詞綴階級','T0 最高、T4 最低。新詞綴的 T2、T1、T0 分別在物品等級 5、12、25 解鎖，T0 機率為 1.5%。'],['電路合成','戰鬥頁可花 20 電路點數指定合成鎖頻晶片、分線器、備用電池或延遲緩衝，所有角色都能搭配。'],['共鳴', '塞滿整列：全隊傷害 +12%；塞滿整欄：暴擊率 +5%；元素相同的兩個技能緊貼：各自傷害 +15%。'], ['改機', '用不到的裝備拆成零件（普通 1、魔法 2、稀有 5、暗金 12）。零件可重新校準、改裝詞綴、升級稀有度，或腐化賭一把。'], ['守關者保底', '連續沒出暗金時，下一件暗金的機率逐次提高。'], ['離線收益', '離開頁面後回來會結算離線收益，最多 6 小時。暗金資格與守關者保底與線上相同；原有經驗 75%、一般裝備掉落 25% 折減仍適用。'], ['無限之塔', '每層殺滿怪就上樓，每 10 層是守關者，打贏多一條規則與一件遺物。死亡就結束。'], ['操作', '拖曳旋轉浮島，滾輪或雙指縮放；Q、E 轉向；` 鍵進入扮工模式。']].map(([t, d]) => ({ t, d, s:'', got:true })) },
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
  return `<button class="mb" onclick="uiCityGo()">城市遠征 · 定向追求核心</button><details class="ui-section ui-core-collection"><summary>傳奇核心收藏 ${ids.length}／${Object.keys(LEGEND_BY).length}</summary><p class="uxmeta">不同核心會留下來供你研究；裝備中的核心不會被自動替換。同款只保留一件，未裝備、未鎖定且未腐化的收藏會比較升級，其餘重複品拆成零件。</p>${ids.length?ids.map(id=>{const it=G.armory[id],on=G.equip[it.slot]?.lg===id;return `<article class="ui-core-item"><div class="nm">${xico('legend',id,28)}<b>${uxEsc(it.name)}</b><small>${SLOTN[it.slot]} · 等級 ${it.il}</small></div><p>${uxEsc(LEGEND_BY[id].d)}</p><details><summary>屬性與效果</summary><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul></details><button class="mb" ${on?'disabled':''} onclick="uiEquipCore('${id}')">${on?'已裝備':`換上${uxEsc(it.name)}`}</button></article>`}).join(''):'<p>打到第一件傳奇後，就能在這裡保留及換用它的特殊效果。</p>'}<div class="uxactions">${Object.keys(SLOTN).filter(slot=>G.equipBackup[slot]).map(slot=>`<button class="mb" onclick="uiRestoreEquipment('${slot}')">切回上一件${SLOTN[slot]}</button>`).join('')}</div></details>`;
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
  if(modalTab==='craft')return JSON.stringify([G.parts,G.equip]);
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
 return `<section class="ui-section"><h3>裝備倉庫 ${G.inventory.length}／200</h3><p>拾到與換下的裝備留在這裡；傳奇在角色的核心收藏。</p><button class="mb" data-focus="warehouse-auto" aria-pressed="${G.autoEquip}" onclick="G.autoEquip=!G.autoEquip;G.dirty=true;renderModal()">自動換裝：${G.autoEquip?'開':'關'}</button><p class="uxmeta">滿倉優先保留高稀有度與高階詞綴，僅回收未保護裝備；低於過濾門檻也會回收。累計回收 ${G.storageRecycled} 件。</p><div class="ui-segments" role="group" aria-label="倉庫部位">${[['all','全部'],...Object.entries(SLOTN)].map(([id,n])=>`<button data-focus="warehouse-filter-${id}" aria-pressed="${WAREHOUSE_UI.slot===id}" onclick="WAREHOUSE_UI.slot='${id}';WAREHOUSE_UI.page=0;renderModal()">${n}</button>`).join('')}</div></section><div class="ui-warehouse-list">${list.slice(WAREHOUSE_UI.page*12,WAREHOUSE_UI.page*12+12).map(it=>`<article class="ui-section"><div class="nm">${eqico(it.slot,it.r,28)}<b>${uxEsc(it.name)}</b><small>${RAR[it.r].n} · Lv. ${it.il}</small></div><p>${it.kept?'已鎖定 · ':''}${G.equip[it.slot]===it?'穿著中':G.equipBackup[it.slot]===it?'上一件裝備':'倉庫保管'}</p><ul>${itemLines(it).slice(0,3).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><button class="mb" data-focus="gear-${it.uid}" onclick="uiInspectGear(${it.uid})">比較與管理</button></article>`).join('')||'<p>目前沒有這個部位的裝備。角色走近掉落物後會自動拾入。</p>'}</div><div class="uxactions"><button class="mb" data-focus="warehouse-prev" ${WAREHOUSE_UI.page===0?'disabled':''} onclick="warehouseMove(-1)">上一頁</button><span>第 ${WAREHOUSE_UI.page+1}／${pages} 頁 · ${list.length} 件</span><button class="mb" data-focus="warehouse-next" ${WAREHOUSE_UI.page>=pages-1?'disabled':''} onclick="warehouseMove(1)">下一頁</button></div>`;
}
function uiInspectGear(uid){
 const it=G.inventory.find(x=>x.uid===uid);if(!it)return;const next=calc({...G.equip,[it.slot]:it}),current=G.st,on=G.equip[it.slot]===it,guard=it.kept||it.cr||it.lk!=null||on||Object.values(G.equipBackup).includes(it);
 showOverlay(`<h2 class="uxdialog-title">${uxEsc(it.name)}</h2><p>${SLOTN[it.slot]} · ${RAR[it.r].n} · 物品等級 ${it.il}</p><dl class="ui-stat-list"><div><dt>預估傷害</dt><dd>${tFmt(current.dps)} → ${tFmt(next.dps)}</dd></div><div><dt>最大生命</dt><dd>${tFmt(current.life)} → ${tFmt(next.life)}</dd></div><div><dt>暴擊率</dt><dd>${current.crit.toFixed(1)}% → ${next.crit.toFixed(1)}%</dd></div></dl><ul>${itemLines(it).map(l=>`<li>${uxEsc(l.t)}</li>`).join('')}</ul><div class="uxactions"><button class="mb" data-initial-focus onclick="hideOverlay()">返回倉庫</button><button class="mb pri" ${on?'disabled':''} onclick="uiWearStored(${uid})">${on?'穿著中':'換上這件裝備'}</button><button class="mb" onclick="uiKeepStored(${uid})">${it.kept?'解除保管鎖定':'鎖定保管'}</button><button class="mb" ${guard?'disabled':''} onclick="uiRecycleAsk(${uid})">回收裝備</button></div>${guard?'<p class="uxmeta">穿著、上一件、鎖定、詞綴鎖定或已腐化的裝備受保護，不能直接回收。</p>':''}`);
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

