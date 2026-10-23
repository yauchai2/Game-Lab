#!/usr/bin/env python3
"""把像素字體 Cubic 11（俐方體 11 號，SIL OFL 1.1）裁成遊戲用到的字，轉成 woff2 寫進 src/game/font.js。

    下載：https://raw.githubusercontent.com/ACh-K/Cubic-11/main/fonts/ttf/Cubic_11.ttf  放到 tools/font/Cubic_11.ttf
    pip install fonttools brotli
    python3 tools/pack_font.py          （文字有改動就重跑一次，沒收進去的字會退回系統字體）
"""
import os, re, io, base64, glob
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'font', 'Cubic_11.ttf')
chars = set(chr(c) for c in range(0x20, 0x7f))
for p in glob.glob(os.path.join(ROOT, 'src', 'game', '*.js')) + [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'src', 'core.js')]:
    if re.search(r'assets|models|font\.js', os.path.basename(p)): continue
    chars |= set(c for c in open(p, encoding='utf-8').read() if ord(c) > 0x7f)
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = []; opt.hinting = False; opt.name_IDs = [0, 1, 2, 13, 14]
f = TTFont(SRC); s = subset.Subsetter(opt); s.populate(text=''.join(sorted(chars))); s.subset(f)
with open(os.path.join(os.path.dirname(SRC), 'Cubic-OFL.txt'), encoding='utf-8') as license_file:
    f['name'].setName(license_file.read(), 13, 3, 1, 0x409)
def encode(font):
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()
b = encode(f)
# Optical 16px face: map the original 12px grid onto integer 16px cells.
# This is baked once, rather than filtering or capturing live DOM text.
# Headings/captions use the original face at its native 24px/12px sizes.
scale_upem(f, 1600)
for glyph in f['glyf'].glyphs.values():
    if glyph.isComposite():
        for component in glyph.components:
            if hasattr(component, 'x'):
                component.x = round(component.x / 100) * 100
                component.y = round(component.y / 100) * 100
    elif hasattr(glyph, 'coordinates'):
        for i, (x, y) in enumerate(glyph.coordinates):
            glyph.coordinates[i] = (round(x / 100) * 100, round(y / 100) * 100)
for name, (advance, bearing) in f['hmtx'].metrics.items():
    f['hmtx'].metrics[name] = (round(advance / 100) * 100, round(bearing / 100) * 100)
for table, fields in [('hhea', ['ascent', 'descent', 'lineGap']),
                      ('OS/2', ['sTypoAscender', 'sTypoDescender', 'sTypoLineGap', 'usWinAscent', 'usWinDescent'])]:
    for field in fields:
        value = getattr(f[table], field)
        setattr(f[table], field, round(value / 100) * 100)
lcd = encode(f)
open(os.path.join(ROOT, 'src', 'game', 'font.js'), 'w').write(
  "/* 由 tools/pack_font.py 產生：Cubic 11 像素字體（SIL OFL 1.1）的子集 */\n"
  "(function(){ const s = document.createElement('style'); s.textContent = '@font-face{font-family:\"Cubic 11\";src:url(data:font/woff2;base64," + b + ") format(\"woff2\");font-weight:400;font-style:normal;font-display:swap}@font-face{font-family:\"Cubic 11 LCD\";src:url(data:font/woff2;base64," + lcd + ") format(\"woff2\");font-weight:400;font-style:normal;font-display:swap}'; document.head.appendChild(s); })();\n")
print(len(chars), 'chars,', (len(b)+len(lcd))//1024, 'KB base64 (native + LCD)')
