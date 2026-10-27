#!/usr/bin/env python3
"""Bundle an identified checkout for manual review; never publishes or edits saves."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--source', type=Path, default=ROOT, help='Clean source checkout to review')
p.add_argument('--output', type=Path, required=True, help='Output ZIP (outside the source tree)')
a = p.parse_args()
source = a.source.resolve()
out = a.output.resolve()
if out.is_relative_to(source):
    p.error('Choose an output outside the source checkout to keep review artifacts separate.')
def git(*args):
    return subprocess.check_output(['git', '-C', str(source), *args], text=True).strip()
if git('status', '--porcelain', '--untracked-files=no'):
    p.error('Commit or preserve tracked changes first: source must identify an exact commit.')
commit = git('rev-parse', 'HEAD')
version = re.search(r"const CHANGELOG\s*=\s*\[\s*\{\s*v\s*:\s*['\"]([^'\"]+)", (source/'src/game/01-data.js').read_text())[1]
with tempfile.TemporaryDirectory(prefix='game-lab-review-') as temp:
    folder = Path(temp)
    game = folder/'game-preview.html'
    subprocess.run(['python3', str(source/'tools/build.py'), str(game)], check=True, cwd=source)
    # Same page-lifetime isolation as tools/style/build_preview.py. This is a
    # review copy, not the actual save/offline-return acceptance environment.
    page = re.sub(r'\b(?:localStorage|sessionStorage)\b', 'reviewStorage', game.read_text())
    bootstrap = '<script>const reviewStorage=(()=>{const m=new Map();return{getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}})();</script>'
    page = page.replace('<head>', '<head>'+bootstrap, 1)
    page = page.replace('<title>Idle Hero</title>', '<title>Idle Hero｜隔離驗收預覽</title>', 1)
    game.write_text(page)
    subprocess.run(['python3', str(ROOT/'tools/build_audio_review.py'), '--source', str(source), '--output', str(folder/'audio-review.html')], check=True, cwd=source)
    (folder/'CHECKLIST.md').write_bytes((ROOT/'docs/final-acceptance/device-checklist.md').read_bytes())
    template = {
        'sourceCommit': commit, 'sourceVersionLabel': version,
        'device': '', 'os': '', 'browserVersion': '', 'outputDevice': '',
        'dateAndTimezone': '', 'sessionMinutes': 0,
        'checks': {key: {'status':'not-run','notes':''} for key in [
            'sound-unlock','sound-loop','sound-transitions','sound-density',
            'sound-return','wear-motion','wear-remove','view-rotation',
            'long-session','official-save-return']},
        'statusOptions': ['not-run','pass','fail','blocked'],
        'limits': 'Manual results only. Preview storage is page-lifetime; official-save-return requires a separate save-capable build on an isolated origin.'
    }
    (folder/'results-template.json').write_text(json.dumps(template, ensure_ascii=False, indent=2)+'\n')
    (folder/'START-HERE.txt').write_text(f'''Game Lab 最終驗收包\n來源版本標籤：{version}\n來源 commit：{commit}\n\n先讀 CHECKLIST.md。game-preview.html 的進度及偏好只存在本頁記憶體，重新載入便重設；不讀寫正式存檔。audio-review.html 可獨立試聽。\n這是供驗收的副本，不表示該分支已合併或發佈。結果模板全部預設未執行。\n\n桌機可在解壓目錄執行 python3 -m http.server 8794，再開 http://localhost:8794/game-preview.html?fresh 。真機須使用可連線的本機／測試HTTP來源；Safari直接開本機HTML的限制需照實記錄，不能將無法開啟當作遊戲已通過。\n此包不會自行部署或收集資料，填妥結果後由人工回報。\n''')
    manifest = {
        'sourceCommit': commit, 'sourceBranch': git('branch','--show-current'),
        'sourceVersionLabel': version, 'publicationStatus': 'review-copy; consult repository release state',
        'builderSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'storage': 'page-lifetime memory; no persistent save acceptance',
        'files': {f.name: {'bytes': f.stat().st_size, 'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(folder.iterdir())},
    }
    (folder/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for f in sorted(folder.iterdir()):
            archive.write(f, f.name)
    with zipfile.ZipFile(out) as archive:
        assert archive.testzip() is None
        for name, entry in manifest['files'].items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == entry['sha256']
print(json.dumps({'output':str(out), 'sourceCommit':commit, 'bytes':out.stat().st_size, 'files':len(manifest['files'])+1}, ensure_ascii=False))
