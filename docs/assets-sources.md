# 美術素材來源

## 目前使用：Signal 24 簡約向量素材（2026-10-21）

Alan 要求所有 icon／image 重做且簡約。目前八組靜態 UI 資產已全部改為本專案新繪的 SVG，舊 PNG 只保留歷史來源，不參與 ASSET 或執行期備援。不是在舊圖上加像素濾鏡。

來源為 tools/draw_icons.mjs，使用 24px 邏輯網格、2px 基本線寬、平面幾何與最多四色；不使用外部圖形、字型、圖示套件或生圖服務。字標使用自繪 5×7 字模。色票與切格順序產出到 src/assets/icon-manifest.json。

| 目前檔案 | 數量 | 內容 |
| --- | --- | --- |
| src/assets/icons.svg | 20 | 12 個通用圖示＋六入口功能符號＋鎖定／解鎖 |
| src/assets/skills.svg | 9 | 電池、冷氣、紅外線、衛星、喇叭、磁鐵、郵件、相機、雷射筆 |
| src/assets/gems.svg | 12 | 原八種符號，加鎖頻、分線、備用電池、延遲緩衝四個新繪符號 |
| src/assets/relics.svg | 12 | 各遺物的簡化物件剪影 |
| src/assets/legends.svg | 9 | 傳奇武器／外套／配件，不靠光暈辨識 |
| src/assets/badges.svg | 12 | 八角徽章與不同主符號 |
| src/assets/equips.svg | 12 | 三部位×四稀有度，保留剪影與重點色差異 |
| src/assets/wordmark.svg | 1 | 簡潔 IDLE HERO 像素字標 |

重建順序：node tools/draw_icons.mjs → python3 tools/pack_assets.py → python3 tools/build.py。SVG、索引與 assets.js 是產物，不能各自修改一份。執行期 helpers 與像素快取皆讀取同一 ART_SHEETS；22–36px 使用同一份資產。

即使關閉像素圖示，備援也使用新 SVG，不會回到舊塑膠高光圖。像素模式會由同一 SVG 產生 24px 快取；編年史分頁共用新圖集，透明背景可搭配選中、鎖定與全 UI 效果。

完整圖集及驗收見 [重繪紀錄](icon-redraw-2026-10-21.md)。以下紀錄是已被替換的歷史素材來源，保留追溯。


遊戲內的靜態圖像素材都記在這裡。模型（`src/game/models*.js`）由 Blender 腳本產生，不在此列，見 `tools/model/`。

## GPT Image 生成的素材

- **生成方式**：Figma MCP 的 `generate_image`，模型 `gpt-image-2.5-sunburst`，日期 2026-10-20。
- **生成位置**：Figma 檔案「Idle Hero UI assets」（Votanic Research Team 草稿區，由 Alan 同意使用該團隊額度）。
- **處理**：下載原圖後用 Pillow 去白底、裁切、縮小，原圖不放在 repo。處理後的檔案放在 `src/assets/`，再由 `python3 tools/pack_assets.py` 轉成 `src/game/assets.js`（data URI），這樣建置出的仍是單一 HTML 檔。

| 檔案 | 內容 | 提示詞重點 |
| --- | --- | --- |
| `src/assets/wordmark.png` | 片假名「アイドルヒーロー」標題字標 | 千禧年日式主機遊戲風，斜體藍色漸層，粗黑外框加白色內框，左上兩顆星，下方英文副標 IDLE HERO。字樣與構圖參考使用者提供的字標風格圖，沒有複製其文字 |
| `src/assets/icons.png` | 12 個圖示（4 欄 3 列，每格 128）：火球、冰晶、閃電、隕石、盾、劍、球鞋、耳機、金幣、星、愛心、藥水 | 光澤塑膠立體感，粗黑外框加白色內框，青、粉、黃、綠點綴 |
| `src/assets/skills.png` | 9 個技能專屬圖示（3×3，順序：過熱電池、冷氣爆發、紅外線連鎖、衛星墜落、重低音喇叭、強力磁鐵、垃圾郵件、閃打連拍、雷射指向筆） | 同上風格；每項描述具體的千禧年數碼物件 |
| `src/assets/gems.png` | 8 個輔助配件圖示（4×2，順序：超頻、廣播、寬頻、雙卡雙待、爆機、無線充電、散熱片、水晶振盪） | 同上風格 |

| `src/assets/relics.png` | 12 個遺物圖示（4×3，順序同 RELICS：迷你風扇、放大鏡、護身符、運動飲料、電池組、防彈背心、計算機、撲滿、幸運符、暴食便當、連環炸彈、小太陽） | 同上風格 |
| `src/assets/legends.png` | 9 個傳奇裝備圖示（3×3，順序同 LEGENDS：三把武器、三件外套、三個配件），帶金色光暈 | 同上風格加金色光暈 |
| `src/assets/badges.png` | 12 個成就徽章（4×3，順序同 ACHS） | 圓形獎章加緞帶，中間各有不同圖案 |

切圖流程：`python3 tools/cut_sheet.py 原圖.png 欄 列 輸出.png` 去白底並置中，再跑 `python3 tools/pack_assets.py`。2026-10-21 生成，同一個 Figma 草稿檔。

## 還適合用生圖的地方（待做）

- 裝備欄的武器、外套種類圖示（現在只有劍、盾、金幣三個通用圖）。
- 地圖生態的天空背景與地圖卡插圖（5 個生態）。
- 怪物肖像（編年史用）：要與 3D 模型風格一致，需先決定是否採用。
- 成就徽章、載入畫面。

## 授權與品質（尚待確認的部分）

- 生成內容的商用權利取決於 Figma 與模型提供者的條款。我沒有逐條核對，**上架 Steam 或商業發佈前，請先自行確認該條款對生成內容的使用規定**。
- 品質：圖示邊緣乾淨，去白底後沒有明顯白邊。字標的日文由模型繪製，「ヒ」與「ー」的筆畫有些變形，不是標準字體，若要正式上線建議找人檢查或改用向量重繪。
- 字標與圖示的風格接近使用者提供的參考圖，但不是參考圖本身，也沒有使用參考圖裡的角色或文字。
- Figma 原圖連結 7 天後失效，需要原檔請到該 Figma 檔案下載。

## 遊戲內使用位置

- 標題：`src/game/06-main.js`，使用 `ASSET.wordmark`。
- 圖示：`src/game/05-ui.js` 的 `spr()`，用在裝備欄（劍、盾、金幣）與技能槽（火球、冰、閃電、隕石）。其餘圖示（球鞋、耳機、星、愛心、藥水）尚未使用。

## 裝備圖示（equips.png，0.25.2）
GPT Image 於 Figma 草稿檔生成 4×3 圖集（列：武器、外套、配件；欄：普通、魔法、稀有、暗金），經 tools/cut_sheet.py 去背切格。商用條款上架前要確認。


## 介面字體：Cubic 11 與 LCD 光學子集（0.27.1）

來源：[ACh-K／Cubic-11](https://github.com/ACh-K/Cubic-11)。完整上游授權保存在 tools/font/Cubic-OFL.txt；包含作者及 M+ 衍生來源說明與 SIL OFL 1.1。tools/pack_font.py 從同一份 TTF 生成原字模子集及 LCD 16px 格線對齊版本，字形／字寬／基線的修改只用於 LCD 版本。兩份內嵌 WOFF2 都保留原始版權並內嵌完整授權，可隨單檔遊戲分發。
