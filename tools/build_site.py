#!/usr/bin/env python3
"""Build a cacheable Pages site; retain the independent offline single-file build."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/game-lab-site')
game = (ROOT / 'dist/idle-hero.html').read_bytes()
with tempfile.TemporaryDirectory(prefix='game-lab-build-check-') as temp:
    expected = Path(temp) / 'game.html'
    subprocess.run([sys.executable, str(ROOT / 'tools/build.py'), str(expected)], check=True)
    if expected.read_bytes() != game:
        sys.exit('The standalone build is stale. Rebuild, commit and push it before publishing.')
version_match = re.search(r"const CHANGELOG\s*=\s*\[\s*\{\s*v\s*:\s*['\"]([^'\"]+)['\"]", (ROOT / 'src/game/01-data.js').read_text())
if not version_match:
    sys.exit('Cannot read the first CHANGELOG version; refusing to publish stale metadata.')
version = version_match[1]
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
out.mkdir(parents=True, exist_ok=True)
page = (ROOT / 'index.html').read_text()
scripts = re.findall(r'<script src="([^"]+)"></script>', page)
assets = {}
HEAVY = {'audio-assets', 'brand-asset', 'font', 'characters-assets', 'equipment-assets', 'phone-assets',
         'phone-preview', 'gear-fallbacks', 'logo-3d-asset'}   # 幾乎不變的大型資源：各自帶雜湊，改程式時瀏覽器不必重載
def emit(stem, paths):
    data = '\n;\n'.join((ROOT / p).read_text() for p in paths).encode()
    name = f'{stem}.{hashlib.sha256(data).hexdigest()[:16]}.js'
    (out / name).write_bytes(data)
    assets[name] = hashlib.sha256(data).hexdigest()
chunk, n = [], 0
def flush():
    global chunk, n
    if chunk:
        n += 1
        emit(f'game-{n}', chunk)
        chunk = []
vendor = [p for p in scripts if p.startswith('src/vendor/')]
emit('vendor', vendor)
for p in scripts:
    if p in vendor:
        continue
    stem = Path(p).stem
    if stem in HEAVY:
        flush()
        emit(stem, [p])
    else:
        chunk.append(p)
flush()
tags = '\n'.join(f'<script defer src="{name}"></script>' for name in assets)
page = re.sub(r'<script src="[^"]+"></script>\s*', '', page)
page = page.replace('</body>', tags + '\n</body>')
site = page.encode()
(out / 'index.html').write_bytes(site)
(out / '.nojekyll').write_text('')
(out / 'version.json').write_text(json.dumps({
    'version': version, 'commit': commit, 'sha256': hashlib.sha256(site).hexdigest(),
    'standalone_sha256': hashlib.sha256(game).hexdigest(), 'assets': assets
}, indent=2) + '\n')
print(f'Built v{version} at {out}; source commit {commit[:7]}')
