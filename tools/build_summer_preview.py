#!/usr/bin/env python3
"""Build an isolated, offline playable art preview from current source."""
from pathlib import Path
import re
import sys
root = Path(__file__).resolve().parents[1]
page = (root / 'index.html').read_text()
# Redirect every game/settings storage access into a page-lifetime sandbox.
# This also isolates profile management, imports, wipe and unload autosave.
bootstrap = '''<script>const summerStorage=(()=>{const m=new Map();return {getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}})();</script>'''
def inline(match):
    path = match.group(1)
    code = (root / path).read_text()
    if path.endswith('06-main.js'):
        code = code.replace('const Q = new URLSearchParams(location.search);', "const Q = new URLSearchParams('fresh&lvl=12');")
        code += '\nsummerStart();\n'
        code = (root / 'tools/summer-preview-runtime.js').read_text() + '\n' + code
    code = re.sub(r'\b(?:localStorage|sessionStorage)\b', 'summerStorage', code)
    if '</script' in code.lower():
        raise ValueError(path + ' contains a script terminator')
    return '<script>\n' + code + '\n</script>'
page = re.sub(r'<script\s+src="([^"]+)"\s*></script>', inline, page)
page = page.replace('<head>', '<head>' + bootstrap, 1)
page = page.replace('<title>', '<title>夏日街區・視覺預覽｜', 1)
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist/summer-street-preview.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page)
print('wrote', out)
