# Patreon 贊助頁驗收

2026-10-25，香港時間。任務：Alan 要求完成贊助頁，指定 Patreon，並提供公開創作者頁 https://www.patreon.com/c/alanycchan。

## 狀態及範圍

已實作、已本機驗證；分支 `codex/sponsor-page`，基於最新 main `e67f73b`。尚未合併或發佈，不更新 gh-pages、tag 或 Release。原聊天 checkout 為 `work`／`190680b`，與最新來源差距大，故另建 worktree，保留原工作目錄。

既有 05w 已有贊助入口及未設定的 Ko-fi 原型。本次直接擴充該 owner：確認 Patreon 設定、公開創作者目的地驗證、三段簡短創作手記、謝意、意見及聲音鳴謝入口。依 Alan 最新指示移除付款說明與 FAQ，保留低調的 Patreon 按鈕及自願支持短句。共用銀灰／藍紫 UX_THEME、Cubic 11、導航、視窗、焦點與正常捲動，不建立平行頁面、付款服務或帳號系統。最新 Patreon 選擇取代先前未接通 Ko-fi 方案。

公開頁不列金額、幣別、福利或訂閱週期；不杜撰方案或優惠。贊助不售戰力；不傳存檔、不綁帳號、不宣稱付款成功。缺少／無效設定時無連結、顯示不可用原因。連結使用新分頁及 noopener noreferrer。

## 驗證

- `node --check src/game/05w-signal-studio.js`、`node --check tools/test_signal_studio_browser.cjs`：通過。
- `python3 tools/build.py`：重建離線單檔。
- `node tools/test_support_browser.cjs`：通過四組流程；320／390／844／1440px、減少動態、簡約文案、鍵盤新分頁、錯誤設定、共用鳴謝／Escape、意見／返回；比較瀏覽前後序列化存檔（排除儲存時間）相同。
- `GAME_LAB_TEST_URL=http://127.0.0.1:8780/dist/idle-hero.html node tools/test_support_browser.cjs`：同樣通過；browser-results.json 保留此單檔驗證結果。Patreon 點擊由瀏覽器攔截，驗證目的地，不執行平台登入或真實付款。
- `node tools/test_signal_season.cjs`：55 項既有 studio／賽季／塔狀態斷言通過。
- `python3 tools/test_review_build.py`：四份 HTML 的 133 份腳本語法通過，review fixture 與正式存檔隔離通過。
- `git diff --check`：通過。
- 官方 premium `audit_project.py --mode strict`：兩項原有手機事件委派靜態偵測提示，位於未修改的 `05k-phone.js:91,101`；該檔與基底相同。沒有贊助頁新增項目；全站 strict 並未通過，詳見 static-audit.json。不為此次頁面修改無關的手機實作。

未執行完整既有 signal-studio 瀏覽器套件，因包含無關的手機／音訊／賽季歷史驗收；其贊助未配置情境已改為明確暫存空設定後還原，以免確認正式目的地後誤判。未做真機 Safari、完整報讀器或真實交易驗證。沒有宣稱 Google 登入／雲端存檔已實作。

## 證據及下一步

- [瀏覽器結果](browser-results.json)、[靜態檢查](static-audit.json)
- [桌面全貌](support-overview.png)、[320px](support-320.png)、[390px](support-390.png)、[橫向](support-844.png)、[桌面](support-1440.png)

PR 合併及正式發佈依新授權處理。未配置的平台方案、會員權益或付款結果一律由 Patreon 顯示，不另開遊戲內收款流程。
