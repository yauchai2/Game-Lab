#!/usr/bin/env python3
"""PR guard: flag files outside the author's area, and version/tag clashes.
Usage: check_pr_guard.py <base_sha> <head_sha> <branch>  (warns; exits 1 only on tag clash)."""
import re, subprocess, sys

OWNERS = {  # branch prefix -> allowed path prefixes
    'codex/': ('assets/', 'tools/', 'docs/', '.github/'),
    'claude/': ('src/', 'index.html', 'tools/', 'docs/', '.github/', 'README.md', 'dist/'),
}
QA = ('tools/qa/', 'docs/qa/')

def sh(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout

base, head, branch = sys.argv[1:4]
files = [f for f in sh('git', 'diff', '--name-only', f'{base}...{head}').splitlines() if f]
problems = []
for pre, allowed in OWNERS.items():
    if branch.startswith(pre):
        out = [f for f in files if not f.startswith(allowed)]
        if pre == 'codex/':
            out += [f for f in files if f.startswith('src/')]
        if out:
            problems.append(f'分支 {branch} 改到不屬於它負責範圍的檔案：\n  ' + '\n  '.join(sorted(set(out))[:30]))
        break

fail = False
m = re.search(r"v:\s*['\"]([0-9]+\.[0-9]+\.[0-9]+)['\"]", sh('git', 'show', f'{head}:src/game/01-data.js').split('const CHANGELOG',1)[-1])
if m:
    ver = m.group(1)
    old = re.search(r"v:\s*['\"]([0-9]+\.[0-9]+\.[0-9]+)['\"]", sh('git', 'show', f'{base}:src/game/01-data.js').split('const CHANGELOG',1)[-1])
    tags = sh('git', 'tag', '-l', f'v{ver}').split()
    if tags and (not old or old.group(1) != ver):
        problems.append(f'版本號 {ver} 已有 tag v{ver}，請換一個版本號。')
        fail = True

if problems:
    for p in problems:
        print('::warning::' + p.replace('\n', '%0A'))
    print('\n\n'.join(problems))
else:
    print('檢查通過：沒有越界檔案，版本號未被佔用。')
sys.exit(1 if fail else 0)
