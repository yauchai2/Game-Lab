#!/usr/bin/env python3
"""把像素字體 Cubic 11（俐方體 11 號，SIL OFL 1.1）裁成遊戲用到的字，轉成 woff2 寫進 src/game/font.js。

    下載：https://raw.githubusercontent.com/ACh-K/Cubic-11/main/fonts/ttf/Cubic_11.ttf  放到 tools/font/Cubic_11.ttf
    pip install fonttools brotli
    python3 tools/pack_font.py          （文字有改動就重跑一次，沒收進去的字會退回系統字體）
"""
import os, re, io, base64, glob
from fontTools import subset
from fontTools.ttLib import TTFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'font', 'Cubic_11.ttf')
chars = set(chr(c) for c in range(0x20, 0x7f))
for p in glob.glob(os.path.join(ROOT, 'src', 'game', '*.js')) + [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'src', 'core.js')]:
    if re.search(r'assets|models|font\.js', os.path.basename(p)): continue
    chars |= set(c for c in open(p, encoding='utf-8').read() if ord(c) > 0x7f)
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = []; opt.hinting = False; opt.name_IDs = [1, 2]
f = TTFont(SRC); s = subset.Subsetter(opt); s.populate(text=''.join(sorted(chars))); s.subset(f)
buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
b = base64.b64encode(buf.getvalue()).decode()
open(os.path.join(ROOT, 'src', 'game', 'font.js'), 'w').write(
  "/* 由 tools/pack_font.py 產生：Cubic 11 像素字體（SIL OFL 1.1）的子集 */\n"
  "(function(){ const s = document.createElement('style'); s.textContent = '@font-face{font-family:\"Cubic 11\";src:url(data:font/woff2;base64," + b + ") format(\"woff2\");font-weight:400;font-style:normal;font-display:swap}'; document.head.appendChild(s); })();\n")
print(len(chars), 'chars,', len(b)//1024, 'KB base64')
