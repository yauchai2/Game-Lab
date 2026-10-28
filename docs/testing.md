# 測試與可重建產物

## 日常驗證

```sh
bash tools/run_tests.sh
```

需要 Node.js、Python 3、Playwright 與 Chromium。腳本先重建三個審閱 HTML，再跑既有邏輯／瀏覽器及分段啟動檢查；此命令是否通過，以實際輸出為準，不以檔案仍存在代表有效覆蓋。

個別純邏輯檢查可直接執行，例如 `node tools/test_grid.js`、`node tools/test_offline_return.cjs`。入口素材可跑 `python3 tools/test_entry_art.py` 與 `python3 tools/test_intro_cast.py`；完整素材檢查需要 Pillow 等現有工具依賴。

## 審閱頁

```sh
python3 tools/build_reviews.py
python3 -m http.server 8780
```

之後瀏覽 dist/character-review.html、dist/equipment-review.html 或 dist/idle-hero-review.html。它們從目前程式與模型產生，不讀取已刪的舊 HTML；審閱工具的舊版標籤不代表正式版本。整合審閱沿用獨立測試存檔鍵，正式單檔仍為 dist/idle-hero.html。

需要審閱頁的個別瀏覽器測試，先完成以上建置與 HTTP server，再按其 GAME_TEST_BASE 等參數執行。`python3 tools/test_review_build.py` 會在缺少頁面時自動重建，核對完整 inline script 語法、正式／審閱存檔鍵隔離與工具列。

## 擴充檢查與歷史結果

`python3 tools/run_review_checks.py /tmp/game-lab-review-checks.json` 保留舊有較廣的檢查集合，會先重建審閱頁；當中歷史斷言可能與現行 UI 不符，失敗需辨識來源，不把它當作全綠的日常門檻。結果預設寫 /tmp，不再生成入庫的 0.32 報告。

日常手機、支援與資源釋放瀏覽器測試預設寫入 /tmp；可用 GAME_LAB_TEST_OUTPUT 指定輸出，避免重跑時改寫歷史發佈證據。

39 個舊瀏覽器測試早在 2026-10-25 已隔離且不在日常測試內，本次刪除 stale-tests 工作樹副本。原失敗紀錄與程式可從 [歷史索引](history.md) 查閱；恢復前應按現行流程改寫並實際跑通。尚開放的 [QA PR #110](https://github.com/yauchai2/Game-Lab/pull/110) 未當作本分支已有的驗證。

## 清理稽核

```sh
python3 tools/audit_repository.py
```

核對刪除清單的原始大小／SHA、保留所有素材與 runtime、入口 script 存在，以及現行文件相對連結。逐次測試的原始日誌留本機暫存，需保留的驗證結果寫對應版本／交付，不重複提交所有歷史截圖。
