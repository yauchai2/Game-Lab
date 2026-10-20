#!/usr/bin/env python3
"""把 gen_icons.py 產生的圖集 PNG 寫進 src/game/assets.js 的 icons。  python3 tools/pack_icons.py icons.png"""
import re, base64, sys, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'game', 'assets.js')
b = base64.b64encode(open(sys.argv[1], 'rb').read()).decode()
s = open(p).read()
open(p, 'w').write(re.sub(r"(  icons: 'data:image/png;base64,)[^']*'", lambda m: m.group(1) + b + "'", s, count=1))
