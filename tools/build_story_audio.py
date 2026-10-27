"""Add the prologue cues, hero/skill cues and the boss loop to the original street score.
Run after tools/build_street_audio.py (which owns the base palette), then tools/pack_audio.py.
Numpy only, deterministic, no external samples. Existing records in src/audio/provenance.json are kept.
"""
from pathlib import Path
import numpy as np, json, hashlib, subprocess, wave

ROOT = Path(__file__).resolve().parents[1]
SR = 32000
OUT = ROOT / 'src/audio'
MASTER = ROOT / 'assets/audio-street/masters'
MASTER.mkdir(parents=True, exist_ok=True)
if (OUT/'provenance.json').exists() and json.loads((OUT/'provenance.json').read_text()).get('external_samples'):
 raise SystemExit('Mixed palette is active; rebuild with tools/audio/build_release_palette.py to preserve licensed selections.')
rng = np.random.default_rng(20261027)
records = []


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def shape(x, fn):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(spec * fn(f), len(x))


def low(x, fc):
    return shape(x, lambda f: 1 / (1 + (f / fc) ** 4))


def high(x, fc):
    return shape(x, lambda f: 1 - 1 / (1 + (f / fc) ** 4))


def band(x, lo, hi):
    return high(low(x, hi), lo)


def env(n, decay, attack=.004):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / decay) * np.minimum(1, (n / SR - t) / .012)


def swept_noise(d, f0, f1, width=.5, seed=0):
    """Band-limited noise whose centre glides f0 -> f1 (overlap-add of short windows)."""
    n = int(d * SR)
    g = np.random.default_rng(seed)
    noise = g.normal(0, 1, n)
    block = 1024
    out = np.zeros(n + block * 2)
    win = np.hanning(block * 2)
    for s in range(0, n - block, block):
        u = s / n
        fc = f0 * (f1 / f0) ** u
        seg = np.pad(noise[s:s + block * 2], (0, max(0, block * 2 - len(noise[s:s + block * 2]))))
        out[s:s + block * 2] += band(seg, fc * (1 - width), fc * (1 + width)) * win
    out = out[:n]
    return out / (np.max(np.abs(out)) + 1e-9)


def tone(freq, d=.12, fall=None, decay=.25):
    t = np.arange(int(d * SR)) / SR
    phase = 2 * np.pi * (freq * t if fall is None else fall * t + (freq - fall) * .045 * (1 - np.exp(-t / .045)))
    return np.sin(phase) * env(len(t), d * decay)


def voice(m, duration, kind='keys'):
    t = np.arange(int(duration * SR)) / SR
    f = hz(m)
    if kind == 'keys':
        x = (np.sin(2 * np.pi * f * t + 1.9 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .18)) + .18 * np.sin(2 * np.pi * f * 3 * t)) * env(len(t), duration * .55)
    elif kind == 'bass':
        x = (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2 * t) + .12 * np.sin(2 * np.pi * f * 3 * t)) * env(len(t), duration * .85, .006)
    elif kind == 'pad':
        x = (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 1.003 * t) + .15 * np.sin(2 * np.pi * f * 2.005 * t)) * env(len(t), duration * 1.8, .12)
    elif kind == 'saw':
        x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6)) * .5 * env(len(t), duration * .5, .01)
    else:
        x = (np.sin(2 * np.pi * f * t) + .12 * np.sin(2 * np.pi * f * 2 * t)) * env(len(t), duration * .45)
    return x


def drum(kind):
    d = {'kick': .3, 'snare': .2, 'hat': .06, 'open': .16, 'rim': .075}[kind]
    t = np.arange(int(SR * d)) / SR
    n = rng.normal(0, 1, len(t))
    if kind == 'kick':
        phase = 2 * np.pi * (46 * t + (150 - 46) * .021 * (1 - np.exp(-t / .021)))
        return np.sin(phase) * env(len(t), .075, .001) + low(n, 1800) * env(len(t), .006) * .08
    if kind == 'snare':
        return (low(n, 5800) * .66 + np.sin(2 * np.pi * 190 * t) * .25) * env(len(t), .05, .001)
    if kind in ['hat', 'open']:
        return (low(n, 8800) - low(n, 4200)) * env(len(t), .018 if kind == 'hat' else .06, .001) * .55
    return (np.sin(2 * np.pi * 850 * t) + .4 * np.sin(2 * np.pi * 1450 * t)) * env(len(t), .012, .001)


def place(parts, d):
    out = np.zeros(int(d * SR))
    for x, at, gain in parts:
        s = int(at * SR)
        e = min(len(out), s + len(x))
        if e > s:
            out[s:e] += x[:e - s] * gain
    return out


def write(name, a, kind, meta):
    a = np.nan_to_num(np.asarray(a))
    peak = max(np.max(np.abs(a)), 1e-9)
    a = np.tanh(a / peak * 1.15) * .72
    pcm = (np.clip(a, -1, 1) * 32767).astype('<i2')
    path = MASTER / (name + '.wav')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1 if a.ndim == 1 else 2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    target = OUT / (name + '.mp3')
    filters = 'highpass=f=45,lowpass=f=11000'
    filters += ',loudnorm=I=-18:TP=-2:LRA=7' if kind == 'music' else ',volume=0.85'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(path), '-af', filters, '-ar', str(SR), '-codec:a', 'libmp3lame',
                    '-b:a', '56k' if kind == 'music' else '56k', '-map_metadata', '-1', str(target)], check=True)
    b = target.read_bytes()
    records.append({'asset': target.name, 'kind': kind, 'authorship': 'Game-Lab original deterministic composition/synthesis',
                    'sha256': hashlib.sha256(b).hexdigest(), 'source_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                    'bytes': len(b), 'duration': round(len(a) / SR, 3), 'sample_rate': SR, **meta})


# ---- story and action cues -------------------------------------------------
t8 = lambda d: np.arange(int(d * SR)) / SR
cues = {}
# Prologue, in story order. Each is short enough to sit under a panel pop-in.
d = 1.3
t = t8(d)
fan = low(rng.normal(size=len(t)), 900) * (.6 + .4 * np.sin(2 * np.pi * 17 * t)) * np.minimum(1, t / .08) * np.exp(-t / 1.1)
cues['st_fan'] = place([(fan, 0, .7), (tone(150, 1.1, 230, .9), 0, .12), (drum('rim'), .5, .5), (drum('rim'), .74, .4), (drum('rim'), 1.0, .3)], d)
t = t8(1.5)
horn = (np.sin(2 * np.pi * 98 * t + .6 * np.sin(2 * np.pi * 5 * t)) + .8 * np.sin(2 * np.pi * 147 * t) + .35 * np.sin(2 * np.pi * 196 * t)) * np.minimum(1, t / .18) * np.exp(-np.maximum(0, t - .6) / .35)
cues['st_horn'] = low(horn, 1400)
d = .9
cues['st_static'] = place([(band(rng.normal(size=int(.5 * SR)), 1500, 7000) * env(int(.5 * SR), .15, .002), 0, .5),
                           (tone(420, .18, 900, 1), .05, .4), (tone(1100, .2, 1800, 1), .22, .4), (tone(1760, .22), .42, .5)], d)
d = 1.1
cues['st_coin'] = place([(tone(float(rng.uniform(1900, 2700)), .22, None, .35), .04 * i + float(rng.uniform(0, .02)), .42) for i in range(14)], d)
d = 1.0
cues['st_skid'] = place([(swept_noise(.45, 3200, 700, .5, 3) * np.minimum(1, t8(.45) / .03) * np.exp(-t8(.45) / .3), 0, .8)] +
                        [(drum('rim'), .4 + .07 * i, .3 - .03 * i) for i in range(5)] + [(tone(70, .25, 45), .25, .5)], d)
cues['st_ding'] = place([(tone(1320, .9, None, .3), 0, .55), (tone(2640 * 1.003, .6, None, .2), 0, .22), (tone(3960, .4, None, .12), 0, .1)], 1.0)
cues['st_chime'] = place([(voice(81, .55, 'keys'), 0, .5), (voice(88, .55, 'keys'), .14, .45), (voice(93, .8, 'keys'), .28, .4)], 1.15)
cues['st_jingle'] = place([(voice(m, .7, 'pluck'), .2 * i, .45) for i, m in enumerate([69, 73, 76, 81, 85])] +
                          [(voice(57, 1.4, 'pad'), 0, .35), (voice(64, 1.4, 'pad'), 0, .28)], 2.0)
# Skills.
t = t8(1.4)
cues['st_crystal'] = place([(tone(72, .7, 36), 0, .8), (low(rng.normal(size=int(.35 * SR)), 2500) * env(int(.35 * SR), .08), 0, .3)] +
                           [(tone(float(rng.uniform(2200, 5200)), .55, None, .3), .02 + .035 * i, .22) for i in range(16)] +
                           [(band(rng.normal(size=int(.9 * SR)), 5000, 9500) * env(int(.9 * SR), .25), .05, .22)], 1.4)
t = t8(2.4)
rumble = low(rng.normal(size=len(t)), 160) * 2
swirl = swept_noise(2.4, 260, 950, .6, 9) * (.65 + .35 * np.sin(2 * np.pi * 5.5 * t)) * np.minimum(1, t / .5) * np.minimum(1, (2.4 - t) / .5)
cues['st_tornado'] = rumble * .55 * np.minimum(1, t / .4) * np.minimum(1, (2.4 - t) / .6) + swirl * .8
t = t8(2.2)
crack = lambda at, g: (band(rng.normal(size=int(.5 * SR)), 1800, 9000) * env(int(.5 * SR), .12, .001), at, g)
rumble = low(rng.normal(size=len(t)), 220) * np.exp(-t / .9) * 2.2
cues['st_thunder'] = place([crack(0, .8), (tone(70, .6, 34, .9), .01, .7), (rumble, .02, .5), crack(.34, .55), (tone(2400, .08, 400, 1), 0, .3)], 2.2)
# Hero actions.
cues['st_roll'] = swept_noise(.38, 900, 3200, .6, 21) * env(int(.38 * SR), .14, .02) * .9
cues['st_swing'] = place([(swept_noise(.3, 1400, 4200, .55, 22) * env(int(.3 * SR), .09, .01), 0, .85), (tone(110, .22, 60), .12, .4)], .34)
for name, a in cues.items():
    write('sf_' + name, a, 'sfx', {'event': name})

# ---- boss loop: 140 bpm, minor, driving ------------------------------------
bpm, bars = 140, 16
beat = 60 / bpm
length = int(round(bars * 4 * beat * SR))
mix = np.zeros((length, 2))


def put(x, at, gain=1, pan=0):
    idx = (np.arange(len(x)) + int(at * SR)) % length
    for side, p in enumerate([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)]):
        np.add.at(mix[:, side], idx, x * gain * p)


chords = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 58, 62, 67], [52, 56, 59, 64]]
for bar in range(bars):
    c = chords[(bar // 2) % 4]
    section = bar // 4
    start = bar * 4 * beat
    for pos in range(4):
        put(drum('kick'), start + pos * beat, .8)
    if bar % 4 == 3:
        put(drum('kick'), start + 3.5 * beat, .6)
    for pos in [1, 3]:
        put(drum('snare'), start + pos * beat, .42, .06)
    if bar % 4 == 3:
        for k in range(8):
            put(drum('snare'), start + (2.0 + k * .25) * beat, .15 + .035 * k)
    for step in range(16):
        put(drum('open' if step % 4 == 2 and bar % 2 else 'hat'), start + step * .25 * beat, .13 if step % 2 else .2, (-1 if step % 2 else 1) * .3)
    for step in range(8):
        note = c[0] - 12 + (12 if step % 4 == 3 else 0)
        put(voice(note, beat * .42, 'bass'), start + step * .5 * beat, .5)
    for pos in [.5, 1.5, 2.5, 3.5] if section % 2 == 0 else [1.5, 3.5]:
        for j, m in enumerate(c):
            put(voice(m + 12, beat * .35, 'saw'), start + pos * beat + j * .004, .075, (j - 1.5) * .25)
    if section in (1, 3):
        order = [0, 2, 1, 3, 2, 1, 3, 2] if bar % 2 else [0, 1, 2, 3, 2, 1, 0, 1]
        for k, idx in enumerate(order):
            put(voice(c[idx] + 24, beat * .3, 'pluck'), start + k * .5 * beat, .09, .3 if k % 2 else -.3)
    for j, m in enumerate(c[:3]):
        put(voice(m, beat * 7.9, 'pad'), start if bar % 2 == 0 else start + 4 * beat, .05, (j - 1) * .4)
mix -= np.mean(mix, axis=0)
edge = int(SR * .006)
mix[:edge] *= np.linspace(0, 1, edge)[:, None]
mix[-edge:] *= np.linspace(1, 0, edge)[:, None]
write('boss', mix, 'music', {'bpm': bpm, 'bars': bars, 'mood': 'boss', 'notes': 'Original voicings, driving bass, drums and arpeggios; no external samples.'})

prov = json.loads((OUT / 'provenance.json').read_text())
names = {r['asset'] for r in records}
prov['sources'] = [s for s in prov['sources'] if s['asset'] not in names] + records
(OUT / 'provenance.json').write_text(json.dumps(prov, indent=2) + '\n')
print('BUILT', len(records), 'story cues and boss loop;', sum(r['bytes'] for r in records), 'bytes')
