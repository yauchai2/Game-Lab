# 0.26.1 字體與介面效能

Alan 回報 iPhone Safari 字體混雜、粗字黏成黑塊，以及載入與操作卡頓。本次保留銀灰掌機、藍紫 LCD、像素圖示與短暫訊號效果，修正文字與繪製方式。

## 修正

- UX_MATERIAL_CSS 統一 Cubic 11 常規 400，禁用合成粗體，涵蓋表單、對話框及兩種編年史。重新裁字，原先 UI 來源缺漏的 47 個中文字已補齊，現在來源涵蓋字形缺漏為 0。玩家自訂名字仍可使用系統 fallback。
- 移除全內容 SVG 色階濾鏡及其定義，以材質、預先量化圖集與標題掃描線維持美學。強度只調整掃描線，動態訊號開關與減少動態效果仍有效。
- 圖示不再重複內嵌整份 atlas，改讀根節點共用 CSS 變數；獨立編年史保有自己的圖集快照。
- 角色擊殺數／深度只更新對應文字，不重建整個面板，保留捲動、焦點及展開狀態。裝備、等級、待選等實際結構變動仍更新。
- 離線每批計算預算由 30ms 調至 8ms，結算期間不繪製 3D 場景／重建操作面板，背景頁也停止場景繪製。模擬步長仍為 0.2 秒，上限仍為 6 小時，沒有變更掉落或成長公式。
- 網站以依序 defer 的 vendor／game 雜湊腳本載入，入口約 814 bytes。引擎約 670 KB、遊戲約 652 KB，可分開快取；首次完整下載量沒有減半。舊雜湊腳本保留，避免舊入口快取失效。離線版依然為單檔。

## 證據與限制

[before.json](ui-performance-v0.26.1/before.json)／[after.json](ui-performance-v0.26.1/after.json) 使用 Chromium、390 × 844、四倍 CPU 減速及靜態角色 fixture，10 次強制面板重建加 layout read。參考中位數為 20.6 → 12.9ms，角色 HTML 為 25,984 → 2,933 字元。這是開發機微型量測，有執行環境波動，不能代表 iPhone 幀率或網速；首次 DOM ready 約 2.60 → 2.48 秒，沒有足夠證據宣稱首次啟動大幅加速。

穩定的結構證據為：一般擊殺保留面板 DOM、焦點／展開／捲動不變；圖示輸出小於 500 字元且正確解析；離線模擬有實際擊殺而場景繪製為 0 次。未用隨機掉落差異判斷效能或收益變更，也未宣稱完整六小時結算速度提升幾倍。

[手機畫面](ui-performance-v0.26.1/mobile.png)與[結構驗證結果](ui-performance-v0.26.1/structural-result.json)。所有瀏覽器測試均為 Chromium，尚未完成 iPhone Safari 真機檢查。

## 驗證

- 純邏輯：grid、UX 及 10 項 gameplay 通過。
- 瀏覽器：12 UX、10 layout、10 view、8 effects、7 icons（82 格）及 6 gameplay 通過；無頁面錯誤。
- 新增 test_ui_performance_browser.cjs：字體／字重、穩定 DOM、atlas 共用、離線暫停繪製及啟動完成；單檔與拆分網站皆通過。
- UI 來源字形覆蓋檢查通過；frontend-design-premium strict 靜態 audit 為 0 問題。
- Pages 發佈後需驗證 version.json、入口及每份腳本的 SHA-256；單檔另以 standalone_sha256 對照。
