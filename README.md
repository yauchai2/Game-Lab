# Game Lab：Idle Hero

一款 Y2K 低面數 3D 風格的掛機 ARPG（Web 版）。耳機、摺機、手提電話、數碼產品都是你的裝備與技能，在浮島街景上自動刷怪、撿寶、搭配構築。正式發佈版本：**v0.78.0**（授權配樂與全套音效更新；保留浮島、故事與技能）。驗證及來源見 [部署紀錄](docs/deployment.md)。


**[直接試玩](https://yauchai2.github.io/Game-Lab/) · [版本紀錄與下載](https://github.com/yauchai2/Game-Lab/releases) · [開發分支](https://github.com/yauchai2/Game-Lab/tree/main)**

固定網址會更新至最新試玩版本。進度保存在目前瀏覽器；從舊網址或本機檔案搬入，請先匯出存檔碼，再在固定網址匯入。

## 玩法

- **網格庫存與設定**：裝備、核心、機件及地圖以緊湊格瀏覽，點選看完整資料；設定入口使用網格，控制項直接顯示目前值。

- **自動戰鬥**：英雄自動走位、打怪、撿裝備，適合時間不多的上班族；離線回來也有經驗與掉落。
- **傳奇核心收藏**：保留不同特殊效果，裝備中的核心不會被自動換走；可換用收藏並切回上一件。
- **構築記憶**：同一職業的三套配置記住七部位裝備、天賦及技能；物品仍是同一件，引用中的裝備受回收保護。
- **長期改機**：同階校準、指定詞綴升階與核心等級重構分開；城市碎片及重複核心殘晶都有用途。
- **裝備與詞綴**：普通、魔法、稀有、暗金四種稀有度，隨機詞綴，還有改機與重鑄。
- **模式卡匣**：隨機掉落，裝上才鑑定出會改變攻擊方式的效果，每次都有新驚喜。
- **電路板接線**：由對應起點逐格接通終點才啟動技能；紅、藍、綠配件只入同色洞，受供電及每技能三枚限制。冒險可獲得3×3至8×8不同板型，全由玩家手動裝配。
- **天賦盤、遺物、元素反應**：多條成長路線可以互相搭配。
- **地圖與無限之塔**：帶詞綴的刷怪區、首領戰，多個生態與天空。
- **圖鑑、成就、角色頁與裝扮**：四個固定職業、各三條昇華；自訂玩家名稱，最多保存十二個獨立角色。
- **存檔與離線進度**：各角色獨立保存，只有目前角色獲得離線進度；裝備與電路板由玩家手動換用；扮工模式（按 `` ` `` 鍵）可以低調掛機。

目前原始碼已合併 **0.79.1 開發版**（PR #116，`641c43d`）；這不代表正式根目錄或 Release 已更新。

## 在本機執行

不需要安裝任何套件。

- 直接玩：用瀏覽器開 `dist/idle-hero.html`（單一檔案）。
- 開發模式：開 `index.html`，會逐檔載入 `src/`。建議用簡單的本機伺服器，例如：

  ```
  python3 -m http.server 8000
  ```

  然後開 `http://localhost:8000/`。
- 重新打包單檔：`python3 tools/build.py`
- 接線板邏輯測試：`node tools/test_grid.js`。舊接線板瀏覽器測試已移至 `tools/stale-tests/`，不屬於日常驗證。
- 分段網站啟動測試：`node tools/test_site_boot.cjs`（自行建立暫存網站與 HTTP 服務）。瀏覽器測試另需 Playwright 與 `/usr/bin/chromium`；「不需要安裝套件」僅指執行遊戲。
- 離線結算回歸（不需瀏覽器）：`node tools/test_offline_return.cjs`
- 多種子長時回訪：`node tools/probe_offline_returns.cjs /tmp/game-lab-offline-return.json`。直接執行正式模擬函式，驗證兩分鐘／六小時回訪、十二小時上限及城市單次出發；以四個工作執行緒運算，中斷後重跑同一輸出路徑可沿用已完成情境。結果不代表手機效能或真人長期體驗。

### 測試用網址參數

`?fresh`（不讀存檔，但仍會自動保存，請使用獨立瀏覽器環境，避免覆寫既有角色）、`?sim=秒數`（快轉）、`?lvl=`、`?depth=`、`?speed=`、`?give`、`?run`（進地圖）、`?modal=skills|tree|maps|save`、`?away=秒數`（模擬離線）、`?selftest`（存檔來回測試）、`?clean`（關閉復古顆粒）。

## 目錄結構

| 路徑 | 內容 |
|---|---|
| `index.html` | 開發入口，逐檔載入 `src/` |
| `dist/idle-hero.html` | 打包後的單檔版本 |
| `src/core.js` | 頁面外殼：按鈕、數值欄、天空背景 |
| `src/game/00-grid.js` | 電路板接線：佈線、配件強度、舊存檔遷移 |
| `src/game/01-data.js` | 稀有度、詞綴、技能、地圖、更新日誌等資料 |
| `src/game/02-state.js` | 遊戲狀態、天賦、裝備生成、屬性計算、存檔 |
| `src/game/03-combat.js` | 怪物、掉落、戰鬥與技能結算 |
| `src/game/04-render.js` | three.js 場景：英雄、怪物、浮島、特效 |
| `src/game/05*.js` | 介面：側欄、視窗、裝扮、改機、首領、圖鑑 |
| `src/game/06-main.js` | 啟動與主迴圈 |
| `src/game/models*.js`, `assets.js`, `audio.js`, `font.js` | 3D 模型資料、圖片資源、音效、像素字體 |
| `src/assets/` | 簡約像素向量圖示與圖片素材 |
| `src/vendor/` | three.js r160（MIT） |
| `tools/` | 打包腳本與 Blender 建模腳本（`tools/model/`） |
| `docs/` | 設計、美術風格與待辦文件 |

所有 `src/game/` 檔案共用全域範圍；實際載入順序以 `index.html` 的 script 排列為準，並非完全按檔名排序。

## 美術風格

Y2K 低面數平塗 3D：明亮街頭、semi-lowpoly／flat／unlit matte、寬褲厚底鞋、耳機、街景高架橋，介面是作業系統視窗風，全介面保留 Cubic 11 像素字體，透過手機／桌機字級、行距及介面比例改善可讀性。現行基準見 [docs/creative-direction.md](docs/creative-direction.md)；舊美術文件與其衝突時，以現行基準為準。

## 授權

頁面外殼（Colorfigures）為 MIT，見 `docs/colorfigures-LICENSE`。three.js 為 MIT，見 `src/vendor/three.LICENSE`。

0.32 地形、選卡暫停及回饋驗證：`node tools/test_update_032.cjs`、`node tools/test_terrain_mesh.cjs`。本次結果及限制見 [docs/update-0.32-validation.md](docs/update-0.32-validation.md)。

0.32 視覺修正版：`node tools/test_world_review.cjs`；歷史來源檢查：`python tools/run_review_checks.py`（固定 0.32 清單，含已不存在的測試，不可當作現版完整驗證）。開發分支可推送，Release／gh-pages 必須先取得版本確認。

### 歷史四主角候選紀錄

`codex/y2k-characters` 以 Alan 上傳模型製作 AKI、MILO、PING、NULL 的 16 骨架／9 動作版本。獨立動作審核：`dist/character-review.html`；含四角色切換的遊戲試玩：`dist/idle-hero-review.html`。來源、驗證界線及與 Claude 分支的整合 hooks 見 [整合指引](docs/y2k-characters-handoff.md)。該段記錄當時的 v0.32.0 狀態，現行正式版本請看本文開頭與部署紀錄。

### 歷史 Y2K 專屬裝備候選紀錄

已接入本次 ZIP 的 16 件 3D 模型；素材清單另外 4 件尚只有參考圖，先以簡模代替。專裝只有對應角色可穿戴，獨立低機率掉落；其餘裝備暫用簡單幾何模型。

- 單檔模型與佩戴預覽：`dist/equipment-review.html`（不讀寫進度；逐件／三欄搭配／整套參考、九動作、四視角及時間拖桿）
- 整合遊戲候選：`dist/idle-hero-review.html`（獨立測試存檔）
- [素材對照、掉落規則與驗證](docs/y2k-equipment.md)
- 邏輯與素材檢查：`node tools/test_signature_equipment.cjs`
- 舊瀏覽器檢查已移至 `tools/stale-tests/test_signature_equipment_browser.cjs`，需更新後才能恢復日常驗證。
