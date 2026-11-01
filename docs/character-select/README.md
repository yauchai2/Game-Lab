# Hello, Static! 角色選擇頁

> 2026-10-28 整理補註：這套選角流程已進入 main 的 0.79.1 開發來源，下文未合併等為當時紀錄；不代表正式站已更新。後續 3D 同場方案仍見 [在途工作](../in-progress.md)。

2026-10-27 · Asia/Hong_Kong。已實作候選，分支 `codex/hello-static-character-select`，整合 main `4d9fe30`。尚未合併或發佈。

使用 Alan 批准的白底四人圖。`source.png` 保存原圖；`tools/pack_intro_cast.py` 將圖縮至 192×341、量化 40 色、裁去上下白邊至 192×231，再用 nearest-neighbor 放大為 768×924。四個透明人物圖層與輪廓熱區共用同一格線，原圖、產物 SHA 與尺寸見 `assets/brand/hello-static/character-select/manifest.json`。沒有外部圖片服務或執行期下載；分段及單檔包均內嵌。

流程：序章 → 同頁選職業及命名 → 開始冒險／教學。AKI／MILO／PING／NULL 分別映射現行戰士／樂師／獵手／寵機師，能力以 CHARS 為唯一來源。Hover 或鍵盤 focus 預覽亮色，點選／方向鍵才提交；選中人物有淺藍硬邊與一次短上浮。這是透明圖層動畫，沒有重新生成模型或骨架動作。手機直排，桌機左右分欄；短屏可捲動。

`introCareerRender` 管呈現，INTRO 管草稿，既有 introBegin／profileNew／saveGame／onboardingStart 管建立、保存及教學。錯誤圖片仍有四個職業按鍵；保存失敗保留原匯出備份入口。減少動態效果時只顯示靜態亮色。

## 驗證

開發來源與分段打包入口各通過 10 組選角流程，零 pageerror；分段包啟動測試亦通過。DESIGN.md lint 為零 errors／warnings。

- `python3 tools/test_intro_cast.py`：來源 hash、40 色、精確 nearest-neighbor 四倍像素、四人物透明層與 bundle 大小。
- `node tools/test_intro_cast_browser.cjs`：四種 viewport、人物熱區、Hover／正式選擇分離、快速方向鍵、草稿與返回故事、名字錯誤／跳脫、減少效果、圖片失敗、建立／存檔／教學、取消新角色、Storage 失敗及離線單檔。結果見 browser-results.json。
- `TITLE_TEST_URL=http://127.0.0.1:8812/ node tools/test_intro_logo_browser.cjs`：既有封面及序章 8 組流程通過。
- `node tools/test_ux.js`：既有 UX 邏輯通過。
- Premium 靜態檢查只報既有 `05k-phone.js` 的兩個 data-act 按鈕（91／101）；這些按鈕已有 delegated click handler，本次未改手機。沒有新增選角頁 finding。

本機 Chromium 自動化；Safari、真機觸控、完整報讀器及主觀動態舒適度未宣稱完成。圖片熱區之外有完整的 44px 原生職業按鍵替代。


完整回歸另發現既有新增角色的 `profileResetRuntime` 清掉 core 初始化後的 `G.pal`，使 render 讀取 undefined 色盤。候選在 runtime reset 保留目前色盤（預設 mint），不改角色存檔格式；新增角色及返回原角色納入本次瀏覽器回歸。
