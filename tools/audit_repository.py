#!/usr/bin/env python3
"""Audit the documented cleanup against its immutable source commit."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/repository-cleanup/manifest.json'


def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], cwd=ROOT, **kwargs)


def audit():
    manifest = json.loads(MANIFEST.read_text())
    base = manifest['source_commit']
    failures = []
    # One batch avoids starting a Git process for each of the historical files.
    queries = ''.join(f"{base}:{row['path']}\n" for row in manifest['files']).encode()
    data = subprocess.run(['git', 'cat-file', '--batch'], cwd=ROOT,
                          input=queries, capture_output=True, check=True).stdout
    offset = 0
    for row in manifest['files']:
        end = data.index(b'\n', offset)
        header = data[offset:end].decode().split()
        if len(header) != 3 or header[1] != 'blob':
            raise RuntimeError(f"Cannot recover original file: {row['path']}")
        size = int(header[2])
        content = data[end + 1:end + 1 + size]
        offset = end + 1 + size + 1
        if size != row['bytes'] or hashlib.sha256(content).hexdigest() != row['sha256']:
            failures.append('Original hash/size mismatch: ' + row['path'])
        # Generated review pages may have been recreated locally, but must be ignored.
        if row['reason'] == 'generated-review':
            if subprocess.run(['git', 'check-ignore', '--no-index', '-q', row['path']],
                              cwd=ROOT).returncode != 0:
                failures.append('Review output is not ignored: ' + row['path'])
        elif (ROOT / row['path']).exists():
            failures.append('Retired file remains: ' + row['path'])

    protected = ['src', 'assets', 'services', '.github', 'index.html', 'dist/idle-hero.html']
    changed = git('diff', '--name-only', base, '--', *protected).decode().splitlines()
    failures.extend('Protected source changed: ' + p for p in changed)

    scripts = re.findall(r'<script\s+src="([^"]+)"', (ROOT / 'index.html').read_text())
    failures.extend('Missing runtime script: ' + p for p in scripts if not (ROOT / p).is_file())

    # Audit surviving and new Markdown only, excluding code examples and unrelated files.
    paths = {ROOT / p for p in git('ls-files', '-z').decode().split('\0') if p.endswith('.md')}
    paths.update((ROOT / 'docs').rglob('*.md'))
    checked = 0
    for path in sorted(paths):
        if not path.is_file():
            continue
        text = re.sub(r'```[^\n]*\n[\s\S]*?```', '', path.read_text())
        for match in re.finditer(r'!?\[[^\]]*\]\(([^)]+)\)', text):
            target = match[1].strip().strip('<>')
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            checked += 1
            if not (path.parent / unquote(parsed.path)).resolve().exists():
                failures.append(f'Broken link in {path.relative_to(ROOT)}: {target}')

    # Every unchecked source row must remain, with multiplicity, after consolidation.
    from collections import Counter
    old_backlog = git('show', f'{base}:docs/backlog.md').decode()
    old_pending = Counter(line for line in old_backlog.splitlines() if '[ ]' in line)
    new_pending = Counter(line for line in (ROOT / 'docs/backlog.md').read_text().splitlines() if '[ ]' in line)
    if old_pending != new_pending:
        failures.append('Unchecked backlog rows were lost or altered')

    result = {'source_commit': base, 'deleted_files_verified': len(manifest['files']),
              'deleted_bytes': manifest['deleted_bytes'], 'relative_links_checked': checked,
              'runtime_script_paths_checked': len(scripts), 'pending_rows_preserved': sum(old_pending.values()),
              'protected_sources_unchanged': not changed, 'failures': failures}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return bool(failures)


if __name__ == '__main__':
    raise SystemExit(audit())
