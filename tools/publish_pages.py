#!/usr/bin/env python3
"""Push only the already-pushed game build to gh-pages, without changing worktrees."""
import os
import json
import re
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
def git(*args, env=None):
    return subprocess.check_output(['git', *args], cwd=ROOT, env=env, text=True).strip()

head = git('rev-parse', 'HEAD')
branch = git('branch', '--show-current')
remote = git('ls-remote', 'origin', f'refs/heads/{branch}')
if not remote or remote.split()[0] != head:
    sys.exit('Push the source branch before publishing the game.')
if git('diff', 'HEAD', '--', 'src', 'index.html', 'dist/idle-hero.html', 'tools/build.py', 'tools/build_site.py'):
    sys.exit('Commit and push game/build changes before publishing.')
remote_pages = git('ls-remote', 'origin', 'refs/heads/gh-pages')
parent = remote_pages.split()[0] if remote_pages else None
if parent:
    git('fetch', 'origin', 'gh-pages')
with tempfile.TemporaryDirectory(prefix='game-lab-pages-') as temp:
    site = Path(temp) / 'site'
    subprocess.run([sys.executable, str(ROOT / 'tools/build_site.py'), str(site)], check=True)
    env = dict(os.environ, GIT_INDEX_FILE=str(Path(temp) / 'index'))
    # Retain fingerprinted scripts so a browser with a cached older index can finish loading.
    if parent:
        names = git('ls-tree', '-r', '--name-only', parent).splitlines()
        if any(not re.fullmatch(r'(index\.html|version\.json|\.nojekyll|(?:vendor|game)\.[0-9a-f]{16}\.js)', n) for n in names):
            sys.exit('Unexpected deployment files; inspect gh-pages before publishing.')
        git('read-tree', parent, env=env)
    else:
        git('read-tree', '--empty', env=env)
    assets = json.loads((site / 'version.json').read_text())['assets']
    for name in ['index.html', 'version.json', '.nojekyll', *assets]:
        blob = git('hash-object', '-w', str(site / name))
        git('update-index', '--add', '--cacheinfo', f'100644,{blob},{name}', env=env)
    tree = git('write-tree', env=env)
    args = ['commit-tree', tree, '-m', f'Publish game from {head[:7]}']
    if parent:
        args += ['-p', parent]
    commit = git(*args)
    old = subprocess.run(['git', 'rev-parse', '--verify', 'refs/heads/gh-pages'], cwd=ROOT,
                         capture_output=True, text=True)
    git('update-ref', 'refs/heads/gh-pages', commit,
        old.stdout.strip() if old.returncode == 0 else '0' * 40)
    subprocess.run(['git', 'push', 'origin', 'refs/heads/gh-pages'], cwd=ROOT, check=True)
    print(f'Published deployment branch {commit[:7]}; Pages must be enabled for gh-pages / (root).')
