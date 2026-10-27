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
    subprocess.run(['python3', str(source/'tools/maps/build_series_gallery.py')], check=True, cwd=source)
    gallery=(source/'dist/island-series-gallery.html').read_text().replace('可玩候選另有角色、技能與戰鬥；尚未正式發佈。','這是實際模型圖集；遊戲版本與來源見START.html。').replace('<a id="play">','<a id="play" style="display:none">')
    (folder/'island-gallery.html').write_text(gallery)
    links=[('FI01','第一章・街角公園'),('FI03','第二章・橋下修理坪'),('FI06','第三章・夜市'),('FI08','第四章・貨運月台'),('FI15','第五章・地下轉播'),('FI18','第六章・電台屋頂')]
    cards=''.join('<li><a href="game-preview.html?fresh&amp;lvl=12&amp;give&amp;slots=FIRE,FROST,CHAIN&amp;island='+id+'">'+label+'</a></li>' for id,label in links)
    (folder/'START.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game Lab '+version+' 驗收包</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#e5eafa;color:#23365b;font:16px/1.7 system-ui}main{max-width:820px;margin:auto;padding:24px;background:#f7f8ff;border:2px solid #8a9bc4;box-shadow:4px 4px #b5bfd8}h1{font-size:26px}a{display:inline-block;padding:8px 0;color:#244da2;min-height:44px}li{margin:4px 0}code{overflow-wrap:anywhere}</style><main><h1>Game Lab '+version+' 驗收包</h1><p>聲音、佩戴與浮島的同版檢查副本。所有結果預設未執行；試玩進度重載即重設，不讀寫正式存檔。</p><p><a href="game-preview.html?fresh">由新角色開始</a> · <a href="audio-review.html">配樂與音效試聽</a> · <a href="island-gallery.html">22座浮島模型圖集</a></p><h2>六章場景速覽</h2><ul>'+cards+'</ul><p>以上用12級測試角色與指定場景。塔樓與訓練請從遊戲冒險頁啟動。</p><p><a href="CHECKLIST.md">閱讀操作表</a> · <a href="results-template.json" download>下載未執行結果表</a></p><p>來源：<code>'+commit+'</code>。真機Safari、30分鐘實戰與主觀聽感須人工記錄，桌面自動檢查不能代替。</p></main></html>')
    (folder/'CHECKLIST.md').write_bytes((ROOT/'docs/final-acceptance/device-checklist.md').read_bytes())
    template = {
        'sourceCommit': commit, 'sourceVersionLabel': version,
        'device': '', 'os': '', 'browserVersion': '', 'outputDevice': '',
        'dateAndTimezone': '', 'sessionMinutes': 0,
        'checks': {key: {'status':'not-run','notes':''} for key in [
            'sound-unlock','sound-loop','sound-transitions','sound-density',
            'sound-return','wear-motion','wear-remove','view-rotation',
            'long-session','official-save-return','island-art','island-inventory','tower-training','legacy-journal']},
        'statusOptions': ['not-run','pass','fail','blocked'],
        'limits': 'Manual results only. Preview storage is page-lifetime; official-save-return requires a separate save-capable build on an isolated origin.'
    }
    (folder/'results-template.json').write_text(json.dumps(template, ensure_ascii=False, indent=2)+'\n')
    (folder/'START-HERE.txt').write_text(f'''Game Lab 最終驗收包\n來源版本標籤：{version}\n來源 commit：{commit}\n\n先開 START.html，再讀 CHECKLIST.md。game-preview.html 的進度及偏好只存在本頁記憶體，重新載入便重設；不讀寫正式存檔。audio-review.html 可獨立試聽。\n這是供驗收的副本，不表示該分支已合併或發佈。結果模板全部預設未執行。\n\n桌機可在解壓目錄執行 python3 -m http.server 8794，再開 http://localhost:8794/game-preview.html?fresh 。真機須使用可連線的本機／測試HTTP來源；Safari直接開本機HTML的限制需照實記錄，不能將無法開啟當作遊戲已通過。\n此包不會自行部署或收集資料，填妥結果後由人工回報。\n''')
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
