#!/usr/bin/env python3
"""Build a Pages site containing only the standalone game and version metadata."""
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
version = re.search(r"\{ v:'([^']+)'", (ROOT / 'src/game/01-data.js').read_text())[1]
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
out.mkdir(parents=True, exist_ok=True)
(out / 'index.html').write_bytes(game)
(out / '.nojekyll').write_text('')
(out / 'version.json').write_text(json.dumps({
    'version': version, 'commit': commit, 'sha256': hashlib.sha256(game).hexdigest()
}, indent=2) + '\n')
print(f'Built v{version} at {out}; source commit {commit[:7]}')
