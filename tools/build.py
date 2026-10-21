#!/usr/bin/env python3
"""把 index.html 引用的所有 <script src> 內嵌,輸出單一可離線執行的 HTML。

    python3 tools/build.py [OUT.html]     (預設 dist/idle-hero.html)
"""
import os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'idle-hero.html')
page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

def inline(m):
    code = open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read()
    if '</script' in code.lower():
        sys.exit('%s 含有 "</script",無法內嵌' % m.group(1))
    return '<script>\n' + code + '\n</script>'

page = re.sub(r'<script\s+src="([^"]+)"\s*></script>', inline, page)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(page)
print('wrote', os.path.relpath(out))
