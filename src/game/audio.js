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
  snap:()=>{ aTone(1500, .03, 'square', .07); aTone(700, .05, 'square', .06, 1, .025); aNz(.03, .06, 5000, 1); },
};
const SFXGAP = { snap:.04, hit:.07, crit:.1, kill:.05, fire:.1, boom:.08, chain:.1, hurt:.15 };
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
