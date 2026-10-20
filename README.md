# Game-Lab

用 [Colorfigures](docs/colorfigures-LICENSE) 引擎（手工墨線、平塗三階色調、藍色影子、等距視角、可互動）做的類暗黑2 / 流放之路2 掛機 ARPG：**Idle Hero**。

## 玩法
英雄自動戰鬥、撿裝備（普通/魔法/稀有/暗金詞綴）、升級；技能+輔助寶石、天賦盤、地圖（帶詞綴的刷怪區）、混沌重鑄、戰利品過濾、1/2/4 倍速、存檔與離線進度。

## 執行
- 單檔：直接開 `dist/idle-hero.html`
- 開發：直接開 `index.html`（逐檔載入 `src/`）
- 重新打包單檔：`python3 tools/build.py`

## 結構
| 檔案 | 內容 |
|---|---|
| `src/core.js` | Colorfigures 引擎（未修改）：投影、形狀、著色、墨線、頁面外殼 |
| `src/game/01-data.js` | 稀有度、詞綴、底材、技能、輔助、地圖詞綴 |
| `src/game/02-state.js` | 天賦樹、遊戲狀態、裝備生成、屬性計算、存檔 |
| `src/game/03-combat.js` | 怪物、掉落/撿取、戰鬥與技能結算 |
| `src/game/04-render.js` | 英雄、怪物、道具、特效的等距繪製 |
| `src/game/05-ui.js` | 側欄、技能/天賦/地圖/存檔視窗、離線進度 |
| `src/game/06-main.js` | 啟動、按鈕、主迴圈 |

所有檔案共用全域範圍，載入順序即檔名順序。`core.js` 佔用的全域名稱見 Colorfigures 文件，新增變數請加前綴避免衝突。

## 測試用網址參數
`?fresh`（不讀存檔）、`?sim=秒數`（快轉）、`?lvl=`、`?depth=`、`?speed=`、`?give`（給寶石與地圖）、`?pass=節點,…`、`?run`（進地圖）、`?modal=skills|tree|maps|save`、`?away=秒數`（模擬離線）、`?selftest`（存檔來回測試）。

## 授權
引擎部分為 MIT，版權見 `docs/colorfigures-LICENSE`。
