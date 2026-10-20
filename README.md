# Game-Lab

Y2K low poly 3D 美學（three.js 平塗低面數、粉彩、藍天白雲、等距固定視角）的類暗黑2 / 流放之路2 掛機 ARPG：**Idle Hero**。頁面外殼沿用 [Colorfigures](docs/colorfigures-LICENSE) 小引擎。

## 玩法
英雄自動戰鬥、撿裝備（普通/魔法/稀有/暗金詞綴）、升級；技能+輔助寶石、天賦盤、地圖（帶詞綴的刷怪區）、混沌重鑄、戰利品過濾、1/2/4 倍速、存檔與離線進度。

## 執行
- 單檔：直接開 `dist/idle-hero.html`
- 開發：直接開 `index.html`（逐檔載入 `src/`）
- 重新打包單檔：`python3 tools/build.py`

## 結構
| 檔案 | 內容 |
|---|---|
| `src/vendor/three.min.js` | three.js r160（MIT），負責 3D 渲染 |
| `src/core.js` | Colorfigures 頁面外殼（已調整色彩與背景）：按鈕、數值欄、天空背景 |
| `src/game/01-data.js` | 稀有度、詞綴、底材、技能、輔助、地圖詞綴 |
| `src/game/02-state.js` | 天賦樹、遊戲狀態、裝備生成、屬性計算、存檔 |
| `src/game/03-combat.js` | 怪物、掉落/撿取、戰鬥與技能結算 |
| `src/game/04-render.js` | three.js 場景：主角、怪物、裝飾、傳送池、掉落物、特效，另用 SVG 疊血條與傷害數字 |
| `src/game/05-ui.js` | 側欄、技能/天賦/地圖/存檔視窗、離線進度 |
| `src/game/06-main.js` | 啟動、按鈕、主迴圈 |

所有檔案共用全域範圍，載入順序即檔名順序。新增變數請避開 `core.js` 與 `THREE` 已有的全域名稱。

## 測試用網址參數
`?fresh`（不讀存檔）、`?sim=秒數`（快轉）、`?lvl=`、`?depth=`、`?speed=`、`?give`（給寶石與地圖）、`?pass=節點,…`、`?run`（進地圖）、`?modal=skills|tree|maps|save`、`?away=秒數`（模擬離線）、`?selftest`（存檔來回測試）、`?clean`（關閉復古顆粒，用全解析度渲染）。

## 美術風格
Y2K low poly 風格規範與新增美術的檢查清單見 [docs/art-style.md](docs/art-style.md)；詳細風格細則與開發計劃見 [docs/art-direction-and-roadmap.md](docs/art-direction-and-roadmap.md)。

## 配件拼圖原型
獨立於遊戲本體的實驗：開 `lab/grid.html` 試放機件，邏輯在 `src/lab/grid.js`，測試用 `node tools/test_grid.js`。設計見 `docs/prototype-grid-and-mod-design.md`。

## 授權
Colorfigures 部分為 MIT，版權見 `docs/colorfigures-LICENSE`。three.js 為 MIT，見 `src/vendor/three.LICENSE`。
