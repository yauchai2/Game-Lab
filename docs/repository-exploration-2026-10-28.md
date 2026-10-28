# 儲存庫探索與驗證入口整理

2026-10-28，Asia/Taipei。任務為建立子智慧體探索儲存庫並繼續追查。基準為 `641c43d`（PR #116）；fetch 後本機與 origin/main 相同。工作分支：`codex/repository-verification-notes`。本輪未修改遊戲 runtime、素材或 dist，未合併／發佈。

## 架構與契約

- 原生 JavaScript＋Three.js；實際全域腳本順序由 `index.html` 定義，不完全依檔名排序。
- `02-state.js` 的 `G` 擁有遊戲狀態；`02b-careers.js` 的 `PROFILE_SESSION` 管理最多十二角色，外層 v3／角色 payload v2。
- `03-combat.js` 的 `stepSim` 推進模擬；`06-main.js` 啟動、讀檔、自動保存；`06b-background.js` 負責背景排程；`05-ui.js` 的 `catchUp` 管理回訪。
- `05g-layout.js` 的 `UI_NAV` 定義角色／背包／技能／打造／冒險／設定。新介面沿用 UX-CONTRACT 與既有資料 owner。
- 怪物查核入口為 `monster-catalog.md`、`street-creatures.js`、`assets/monsters/catalog.json`；十二模型供不同玩法 type 共用。

## 修正探索初判

`727ed6d` 已刻意將原圖修復候選改回低解析封面（180／320px）、Logo（360px）及序章（168px），並恢復斜放膠紙。故瀏覽器斷言符合實作，不應依舊交付文件改回較高密度。本輪只為原候選文件加歷史狀態註解，並修正 Python 測試遺留的 640px Logo 斷言；保留原圖 hash、無損 WebP、整數放大與軟 alpha 檢查。

## 已重現的存檔風險，尚未修復

### SAVE-EXP-01：fresh 可覆寫原有角色

`src/game/06-main.js:9` 在 `?fresh` 時跳過 `loadGame()`，`:67` 一般情況亦略過序章；`:80` 仍每五秒自動保存。`02b-careers.js:51–52` 用空的 session 建立新角色清單並覆寫同一 SAVE_KEY。隔離 VM 中，原有角色 existing、500 gold，在不呼叫 profileLoad 的新 session 保存後，只剩新角色、0 gold。

README 已說明須使用獨立瀏覽器環境。修正方向提案：隔離測試存檔或明確禁止測試 session 寫入正式 key；需同時覆蓋自動保存、pagehide、visibilitychange 與顯式保存。

### SAVE-EXP-02：多分頁可能回滾其他角色

`02b-careers.js:43` 快取整組角色，`:51–52` 保存時沒有重讀／合併／版本衝突檢查。兩個隔離 VM 共用記憶體 storage：A、B 同時讀到 a=1／b=2；B 寫 b=200 後，A 寫 a=100，最後 b 回到 2。`06b-background.js:11` 的 navigator.locks 呼叫並未把啟動與保存放入取得鎖的回呼，不能視為存檔互斥保護。

修正方向提案：單分頁寫入權或可檢查衝突的保存協定；僅合併不同角色仍不足以解決同角色的過期寫入。以上為函式層 VM 重現，未作真實瀏覽器雙分頁驗收。正式修復追蹤於 backlog 的 SAVE-EXP-01／02。

## 本輪驗證

| 命令 | 結果 |
| --- | --- |
| `python3 tools/test_entry_art.py` | 修正舊 Logo 寬度後通過；十二組資產 hash／四倍像素／無損 runtime 與軟 alpha |
| `node tools/test_grid.js` | 通過 |
| `node tools/test_offline_return.cjs` | 原先缺少 document.body.classList 而中斷；只補 DOM 替身後七項通過，未替換模擬／保存函式 |
| `node tools/test_site_boot.cjs` | 分段建置及 Chromium 啟動通過，無 pageerror，設定面板建立 |
| `git diff --check` | 通過 |

`run_review_checks.py` 的 35 項清單含不存在的 `tools/test_intro_logo.cjs`，預設輸出仍是 review-0.32；本輪未重寫或執行該歷史總入口。舊接線／裝備瀏覽器測試位於 stale-tests，README 已更正路徑與驗證地位。

已查 open PR #110，該 PR 正在新增 tools/qa 與 QA workflow；本輪不另建立平行 QA gate，亦未把尚未合併的 QA 當作現行 CI 保護。未執行完整回歸、長時收益探測、Safari、真機、報讀器或正式站查驗。

## 接續

優先處理上述兩項存檔風險，並以實際瀏覽器保存／重開與雙分頁衝突驗收。QA 整合沿用 PR #110。文件與測試修正已實作及局部驗證，推送／合併狀態以分支與 GitHub 記錄為準。

## 隔離 VM 重現指令

在儲存庫根目錄執行，僅使用記憶體 storage。`serialize` 與角色資料以最小替身隔離，重用正式 profileLoad／profileSave；因此此證據只涵蓋保存協定，不是完整遊戲重播。

```bash
node <<'NODE'
const fs = require('node:fs'), vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/game/02b-careers.js', 'utf8');
const start = source.indexOf('const PROFILE_MAX=');
const end = source.indexOf('function profileResetRuntime', start);
assert(start >= 0 && end > start);
let stored;
const save = gold => ({v: 2, char: 'street', gold});
function tab(gold) {
  const context = {
    G: {char: 'street'}, INTRO: {active: false},
    SAVE_KEY: 'test-memory-only', CHARS: {street: {}},
    copyState: v => JSON.parse(JSON.stringify(v)),
    serialize: () => save(gold),
    localStorage: {
      getItem: () => stored,
      setItem: (_key, value) => { stored = value; }
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return code => vm.runInContext(code, context);
}
const read = () => JSON.parse(stored);
stored = JSON.stringify({v: 3, active: 'existing',
  profiles: [{id: 'existing', save: save(500)}]});
assert.equal(tab(0)('profileSave()'), true);
assert.equal(read().profiles.length, 1);
assert.equal(read().profiles.some(p => p.id === 'existing'), false);
assert.equal(read().profiles[0].save.gold, 0);
console.log('REPRO fresh: existing profile lost');
stored = JSON.stringify({v: 3, active: 'a',
  profiles: [{id: 'a', save: save(1)}, {id: 'b', save: save(2)}]});
const a = tab(100), b = tab(200);
a('profileLoad()');
b('profileLoad(); PROFILE_SESSION.active = "b"');
assert.equal(b('profileSave()'), true);
assert.equal(read().profiles.find(p => p.id === 'b').save.gold, 200);
assert.equal(a('profileSave()'), true);
assert.equal(read().profiles.find(p => p.id === 'a').save.gold, 100);
assert.equal(read().profiles.find(p => p.id === 'b').save.gold, 2);
console.log('REPRO multi-tab: b rolled back from 200 to 2');
NODE
```
