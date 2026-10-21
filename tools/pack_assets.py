#!/usr/bin/env python3
"""把 src/assets 的圖片打包成 src/game/assets.js（data URI），讓單檔建置不用外部檔案。

    python3 tools/pack_assets.py
"""
import base64, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
files = {'icons': 'icons.png', 'wordmark': 'wordmark.png', 'skills': 'skills.png', 'gems': 'gems.png', 'relics': 'relics.png', 'legends': 'legends.png', 'badges': 'badges.png'}
out = ['/* 由 tools/pack_assets.py 產生，請勿手改。圖片來源見 docs/assets-sources.md。 */', 'const ASSET = {']
for k, f in files.items():
    b = open(os.path.join(root, 'src', 'assets', f), 'rb').read()
    out.append(f"  {k}: 'data:image/png;base64,{base64.b64encode(b).decode()}',")
out.append('};\n')
open(os.path.join(root, 'src', 'game', 'assets.js'), 'w').write('\n'.join(out))
print('wrote src/game/assets.js')
