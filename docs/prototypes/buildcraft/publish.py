#!/usr/bin/env python3
"""Publish the four playable files while preserving every existing Pages file."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FILES = ('index.html', 'style.css', 'engine.js', 'app.js')

def git(*args, env=None):
    return subprocess.check_output(['git', *args], cwd=ROOT, env=env, text=True).strip()

head = git('rev-parse', 'HEAD')
branch = git('branch', '--show-current')
if git('ls-remote', 'origin', 'refs/heads/' + branch).split()[0] != head:
    raise SystemExit('Push source before publishing this demo.')
if git('diff', 'HEAD', '--', str(HERE), 'tools/publish_pages.py'):
    raise SystemExit('Commit demo and publisher changes first.')
parent = git('ls-remote', 'origin', 'refs/heads/gh-pages').split()[0]
git('fetch', 'origin', 'gh-pages')
before = {name: git('rev-parse', parent + ':' + name) for name in ('index.html', 'version.json')}
with tempfile.TemporaryDirectory(prefix='game-lab-demos-') as tmp:
    env = dict(os.environ, GIT_INDEX_FILE=str(Path(tmp) / 'index'))
    git('read-tree', parent, env=env)
    for name in FILES:
        blob = git('hash-object', '-w', str(HERE / name))
        git('update-index', '--add', '--cacheinfo', '100644,' + blob + ',lab/buildcraft/' + name, env=env)
    tree = git('write-tree', env=env)
    for name, blob in before.items():
        if git('rev-parse', tree + ':' + name) != blob:
            raise SystemExit('Refusing to modify the game entry or version.')
    commit = git('commit-tree', tree, '-p', parent, '-m', 'Publish six buildcraft demos from ' + head[:7])
    # Compare-and-swap the local ref; normal push rejects any concurrent remote change.
    old = git('rev-parse', 'refs/heads/gh-pages')
    git('update-ref', 'refs/heads/gh-pages', commit, old)
    git('push', 'origin', 'refs/heads/gh-pages')
print(json.dumps({'source': head, 'deployment': commit, 'url': 'https://yauchai2.github.io/Game-Lab/lab/buildcraft/', 'sha256': {n: hashlib.sha256((HERE / n).read_bytes()).hexdigest() for n in FILES}}, indent=2))
