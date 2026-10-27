# 封面、Logo 與序章原圖修復

2026-10-28，Asia/Hong_Kong。已實作候選；延續 PR #113 的選角流程，尚未合併或發佈。基底包含 main `c67529d`，保留音訊、系統記錄與原型修正。

Alan 本輪明確指定酸黃天線封面，截圖只供辨認，不作素材。已從本對話生成檔取回兩張原 PNG，放在 `assets/brand/hello-static/signal-cover/`：

- 手機：`portrait-source.png`，原生成檔 `exec-f4613eb9-12b4-478f-9e43-eabdd8e771f1.png`。
- desktop：`landscape-source.png`，原生成檔 `exec-1e0b0aa6-3097-49b4-bcfd-3a46852e3435.png`。

Logo 原檔與對話的 `exec-913d76e4-4860-457f-8daf-59d7e5d3a7b7.png` SHA 完全一致，三頁序章亦逐一對上生成原 PNG；本輪沒有再用 AI 編修人物或文字。

## 問題與修正

舊 pipeline 把場景與序章一律縮六倍再壓至 40 色，每個漫畫框只剩約 150px 寬；Logo 再縮九倍至約 212px 寬，而且將透明度切成二值，令中文、細描邊與人物五官損失。序章常駐 CSS 旋轉還會重新插值圖片，削弱方形像素。這些是可核對的主要退化來源；未把「曾多次 AI edit」當成已證實的原因。

新 pipeline 每次只從 immutable source 取樣一次：BOX 縮小，再以 NEAREST 放大四倍，無額外減色、銳化、抖色或硬切 alpha。場景保留原色；人物細節與字標採各自密度。

| 素材 | 原生輸出 | 4 倍審閱檔 |
| --- | --- | --- |
| 直幅封面 | 320×569 | 1280×2276 |
| 橫幅封面 | 640×360 | 2560×1440 |
| Logo | 640×233 | 2560×932 |
| 八個漫畫框 | 各 384px 寬 | 各 1536px 寬 |

精確尺寸、來源 SHA、輸出 SHA 見 `assets/brand/hello-static/entry-pixels/manifest.json`。表中 Logo 高度以 manifest 為準。

`tools/pack_pixel_art.py` 產生原生 PNG、4 倍 PNG、內嵌 PIXEL_ART 及 boot；執行期使用與原生 PNG 像素完全相同的無損 WebP 加 `image-rendering:pixelated`，不載入放大檔浪費傳輸。像素資產 JS 約 1.92MB（未壓縮，無損 WebP 比同像素 PNG 的 2.34MB 再減約 18%），比舊 40 色方案大，換取人面／字標可讀性；全部靜態、沒有新增 canvas 或 WebGL 工作。

封面採 picture 的方向切換，手機用真正直幅、橫屏用真正橫幅，object-fit 保持比例。手機 Logo 放上方留白，desktop 放右側；全畫面開始、鍵盤 Enter、焦點、序章返回及存檔規則沿用既有 owner。載入頁與互動封面共用 `tools/entry_cover_layout.css` 的 picture／Logo 幾何。

移除舊封面座標專用的漂雲、星星、掃描線、假燈號及亮度爆閃；Logo 不再持續上下移。序章保留故事順序、字幕、音效、倒數及跳頁，圖片靜止時不旋轉，入場只做短淡入／12px 位移；取消膠紙裝飾。第三頁仍用原天台作暗色背景，沒有意外換成酸黃。

## 驗證與限制

- `python3 tools/test_entry_art.py`：原圖 hash、輸出 hash、12 組精確 NEAREST 四倍像素、Logo 軟 alpha；通過。
- `node tools/test_entry_art_browser.cjs`：5 viewport、portrait／wide 切換、Logo／提示不重疊、鍵盤焦點、全部序章靜止無旋轉、禁 JS 的載入頁、阻擋外部資源的單檔建立角色；通過。分段入口亦以 `ENTRY_TEST_URL` 執行，結果見 browser-results.json 與 split-browser-results.json。
- `TITLE_TEST_URL=http://127.0.0.1:8814/ node tools/test_intro_logo_browser.cjs`：原封面／序章 8 組流程通過，改為驗新資產密度。
- `node tools/test_ux.js`、`node tools/test_site_boot.cjs`：既有邏輯及分段啟動回歸。
- Premium 靜態檢查仍僅報原本手機 data-act 事件委派按鍵兩項，無新增 entry finding；不是整個專案零 finding。

未宣稱 Safari、真機或完整報讀器驗收。此為可審閱候選，未更新正式站或建立 Release。`docs/codex-sync-notes.md` 新增其他聊天的檔案分工建議；本輪依 Alan 直接指定替換封面及整體修復，在自己的既有 PR 提供必要 runtime 接線，沒有直接修改 main。
