#!/usr/bin/env python3
"""把 src/assets 的圖片打包成 src/game/assets.js（data URI），讓單檔建置不用外部檔案。

    python3 tools/pack_assets.py
"""
import base64, json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
with open(os.path.join(root, 'src', 'assets', 'icon-manifest.json'), encoding='utf-8') as f:
    manifest = json.load(f)
files = {k: v['file'] for k, v in manifest['sheets'].items()}
files['wordmark'] = manifest['wordmark']
out = ['/* 由 tools/pack_assets.py 產生，請勿手改。圖片來源見 docs/assets-sources.md。 */',
       'const ART_SHEETS = ' + json.dumps(manifest['sheets'], separators=(',', ':')) + ';', 'const ASSET = {']
for k, f in files.items():
    b = open(os.path.join(root, 'src', 'assets', f), 'rb').read()
    mime = 'image/svg+xml' if f.endswith('.svg') else 'image/png'
    out.append(f"  {k}: 'data:{mime};base64,{base64.b64encode(b).decode()}',")
out.append('};\n')
open(os.path.join(root, 'src', 'game', 'assets.js'), 'w').write('\n'.join(out))
print('wrote src/game/assets.js')
