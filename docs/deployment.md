# 固定試玩與版本管理

固定試玩：https://yauchai2.github.io/Game-Lab/  
版本紀錄與單檔下載：https://github.com/yauchai2/Game-Lab/releases  
程式及目前 review：https://github.com/yauchai2/Game-Lab/pull/6

網站由 gh-pages 分支的根目錄發佈。只含 index.html、version.json、.nojekyll，不包含原始碼、內部文件或參考圖。來源工作分支為 codex/ux-optimization；不刪除任何既有分支。main 的後續合併經 PR review。

## 發佈流程

1. 在 src/game/01-data.js 的 CHANGELOG 最前面新增版本，完成測試。
2. python3 tools/build.py 重建單檔，將來源及產物一起提交。
3. git push origin codex/ux-optimization，先推送來源。
4. python3 tools/publish_pages.py。腳本檢查來源已推送、遊戲及打包檔沒有未提交修改，再建立只含三個部署檔案的 gh-pages 提交；不切換或清理工作區，不強制推送。
5. 等候 GitHub Pages 完成，查驗線上 version.json 及 index.html 的 SHA-256 與該版本一致，然後以瀏覽器試玩。
6. 為已發佈來源提交建立 v0.主要.小修 標籤與 Release，提供該標籤 dist/idle-hero.html 的下載連結。標籤不可移動覆蓋。

版本資料：https://yauchai2.github.io/Game-Lab/version.json 。它記錄來源版本、來源提交與遊戲檔 SHA-256。gh-pages 提交編號與來源提交不同，不能混用。

GitHub Pages 啟用方式為 Settings → Pages → Deploy from a branch → gh-pages → / (root)。本次原連線無 Pages 寫入權限；Alan 改為 Public 後，已確認站點 built、來源正確，線上 0.25.3 內容與提交 5d791a9 完全相符。

## 存檔

進度存放於目前瀏覽器的 localStorage。固定網址能避免每次換 Artifact 網址，但不提供帳號同步。由舊網址／本機單檔搬入時，先在舊遊戲「更多 → 存檔與備份」匯出存檔碼，再於固定網址匯入；不要在新網址使用 fresh 參數開始正式進度。

## 回退

保留所有來源標籤及部署歷史。需要回退時從已驗證的來源提交建立新的回退提交、推送，再發佈該產物；不要刪除分支或覆蓋版本標籤。涉及存檔新欄位的版本，先核對舊版能否讀取及是否會遺失新內容，不以只換 HTML 代表已完成安全回退。


## 目前已驗證發佈

v0.26.0，來源提交 56b401ee7d33a9cba13dd1612b96e5e54d19b0a0，部署提交 c904260466a3003cb396d3dcce45bf798e694e27。GitHub Pages 狀態 built，HTTPS 下載的遊戲檔 SHA-256 與本機打包完全一致。版本記錄：[v0.26.0](https://github.com/yauchai2/Game-Lab/releases/tag/v0.26.0)。

[線上核對證據](gameplay-first-pass-2026-10-21/live-verification.json)。雲端 Chromium 直接連外遇到代理憑證信任限制，未關閉 TLS 驗證；線上內容以使用已配置 CA 的 HTTPS 客戶端驗證，遊戲行為以同一份 SHA-256 產物在本機 HTTP 跑瀏覽器回歸。不宣稱直接連外的瀏覽器煙霧測試通過。
