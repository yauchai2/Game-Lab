#!/usr/bin/env python3
"""出版前關卡：一個指令跑完所有「舊功能保護」檢查並寫出 QA 報告。

    python3 tools/qa/gate.py                 完整關卡（出測試版、出 Release 前）
    python3 tools/qa/gate.py --quick         快速關卡（推送時自動跑，掛機縮短）
    python3 tools/qa/gate.py --base v0.78.0  指定比對基準（預設為最新正式 tag）

結果寫入 docs/qa/reports/（latest.md 與以版本命名的存檔），有失敗則結束碼為 1，Release 應被攔住。
只讀取遊戲程式，不修改 src/。
"""
import argparse, datetime, glob, json, os, subprocess, sys, tempfile, re, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
QA = os.path.join(ROOT, 'tools', 'qa')


def sh(args, **kw):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, **kw)


def latest_tag():
    tags = [t for t in sh(['git', 'tag', '--list', 'v[0-9]*']).stdout.split() if '-' not in t]
    tags.sort(key=lambda t: tuple(int(x) for x in t[1:].split('.')))
    return tags[-1] if tags else None


def game_version():
    m = re.search(r"v:\s*'([^']+)'", open(os.path.join(ROOT, 'src/game/01-data.js'), encoding='utf-8').read().split('const CHANGELOG')[1])
    return m.group(1) if m else '?'


def legacy_tests():
    """舊的純邏輯測試（不用瀏覽器）。已知紅的列在 known-red.txt，不算新失敗，但會在報告列出。"""
    red = {l.strip() for l in open(os.path.join(ROOT, 'docs/qa/known-red.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')}
    items = []
    skip = ('browser', 'site_boot', 'intro_logo', 'stage', 'preview', 'world_review')
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'test_*.js')) + glob.glob(os.path.join(ROOT, 'tools', 'test_*.cjs'))):
        rel = os.path.relpath(f, ROOT)
        if any(s in rel for s in skip):
            continue
        r = sh(['node', rel], timeout=300)
        ok = r.returncode == 0
        known = rel in red
        detail = [] if ok else [l.strip() for l in (r.stderr or r.stdout).splitlines() if l.strip() and not l.strip().startswith('at ') and not l.startswith('Node.js') and l.strip() not in '^~'][-2:]
        items.append({'name': rel, 'ok': ok or known, 'warn': (not ok) and known, 'fixed': ok and known,
                      'detail': '' if ok else '已知失敗：' + ' | '.join(detail)[:300] if known else ' | '.join(detail)[:600]})
    sh(['git', 'checkout', '--', 'docs/window-ui-ascensions-2026-10-24/node-effects.json'])  # 某測試會改寫這個檔
    return items


def run_node(script, args, out):
    t = time.time()
    r = sh(['node', os.path.join(QA, script)] + args + ['--out', out], timeout=3600)
    data = json.load(open(out)) if os.path.exists(out) else {'items': [{'name': script + ' 無法執行', 'ok': False, 'detail': (r.stderr or r.stdout)[-800:]}]}
    data['secs'] = round(time.time() - t)
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quick', action='store_true')
    ap.add_argument('--base')
    ap.add_argument('--skip', default='', help='略過的項目，逗號分隔：legacy,catalog,browser,saves')
    ap.add_argument('--seed')
    a = ap.parse_args()
    skip = set(filter(None, a.skip.split(',')))
    base = a.base or latest_tag()
    tmp = tempfile.mkdtemp(prefix='qa-')
    suites = []
    head = sh(['git', 'rev-parse', '--short', 'HEAD']).stdout.strip()
    ver = game_version()

    if 'legacy' not in skip:
        t = time.time(); suites.append({'suite': '舊的邏輯測試', 'items': legacy_tests(), 'secs': round(time.time() - t)})
    if 'catalog' not in skip:
        d = run_node('catalog.cjs', ['--base', base], os.path.join(tmp, 'c.json')); d['suite'] = '內容清單比對'; suites.append(d)
    if 'browser' not in skip:
        args = ['--base', base, '--soak-hours', '0.5' if a.quick else '2'] + (['--seed', a.seed] if a.seed else [])
        d = run_node('browser_suite.cjs', args, os.path.join(tmp, 'b.json')); d['suite'] = '瀏覽器：冒煙、介面、壓力、掛機、離線'; suites.append(d)
    if 'saves' not in skip:
        d = run_node('old_saves.cjs', [] if not a.quick else ['--tags', ','.join(filter(None, [base, 'v0.70.0']))], os.path.join(tmp, 's.json')); d['suite'] = '舊版存檔相容'; suites.append(d)

    fails = [(s['suite'], i) for s in suites for i in s['items'] if not i['ok'] and not i.get('warn')]
    warns = [(s['suite'], i) for s in suites for i in s['items'] if i.get('warn')]
    passed = sum(1 for s in suites for i in s['items'] if i['ok'] and not i.get('warn'))
    verdict = '攔住：有未解決的錯誤，不可出 Release' if fails else '通過'

    L = [f'# QA 報告：{ver}（{head}）', '',
         f'- 日期：{datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
         f'- 模式：{"快速" if a.quick else "完整"}；比對基準：{base}',
         f'- **結論：{verdict}**（通過 {passed}／警告 {len(warns)}／失敗 {len(fails)}）', '']
    if fails:
        L += ['## 失敗（必須修）', '']
        for s, i in fails:
            L += [f'- **{i["name"]}**（{s}）', '  ```', *['  ' + x for x in (i.get('detail') or '（無細節）').splitlines()[:12]], '  ```']
        L.append('')
    if warns:
        L += ['## 警告（請作者確認是否有意）', '']
        for s, i in warns:
            L += [f'- {i["name"]}' + (f'：{i["detail"].splitlines()[0][:200]}' if i.get('detail') else '')]
        L.append('')
    L += ['## 各項明細', '']
    for s in suites:
        L += [f'### {s["suite"]}（{s.get("secs", 0)} 秒）', '']
        for i in s['items']:
            mark = '✅' if i['ok'] and not i.get('warn') else '⚠️' if i.get('warn') else '❌'
            L.append(f'- {mark} {i["name"]}' + ('（已知失敗的舊測試已轉綠，請從 known-red.txt 移除）' if i.get('fixed') else ''))
        L.append('')
    outdir = os.path.join(ROOT, 'docs', 'qa', 'reports'); os.makedirs(outdir, exist_ok=True)
    text = '\n'.join(L)
    open(os.path.join(outdir, 'latest.md'), 'w', encoding='utf-8').write(text)
    if not a.quick:
        open(os.path.join(outdir, f'{ver}-{head}.md'), 'w', encoding='utf-8').write(text)
    print('\n' + '\n'.join(L[:6]))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
