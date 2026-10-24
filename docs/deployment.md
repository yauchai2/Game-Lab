# 固定試玩與版本管理

固定試玩：https://yauchai2.github.io/Game-Lab/  
版本紀錄與單檔下載：https://github.com/yauchai2/Game-Lab/releases  
程式主線：https://github.com/yauchai2/Game-Lab/tree/main

網站由 gh-pages 分支的根目錄發佈。包含 index.html、version.json、.nojekyll 及帶內容雜湊名稱的 vendor／game 腳本，不包含內部文件或參考圖。既有雜湊腳本保留，避免舊快取入口請求失效。來源先在任務分支提交並經 PR 合併 main；不刪除任何既有分支。

## 發佈流程

0. 每次 release 先 fetch 並查核 Claude 最新分支／PR，記錄整合範圍及排除原因；既有內部備份 PR 不當成遊戲內容直接發佈。
1. 在 src/game/01-data.js 的 CHANGELOG 最前面新增版本，完成測試。
2. python3 tools/build.py 重建單檔，將來源及產物一起提交。
3. 推送目前來源分支，先完成來源同步；publish_pages.py 要求目前分支遠端與 HEAD 一致。
4. python3 tools/publish_pages.py。腳本檢查來源已推送、遊戲及打包檔沒有未提交修改，再更新入口、版本資料與雜湊腳本的 gh-pages 提交；不切換或清理工作區，不強制推送。
5. 等候 GitHub Pages 完成，查驗線上 version.json、index.html 與 assets 各腳本的 SHA-256 與該版本一致，然後以瀏覽器試玩。
6. 為已發佈來源提交建立 v0.主要.小修 標籤與 Release，提供該標籤 dist/idle-hero.html 的下載連結。標籤不可移動覆蓋。

版本資料：https://yauchai2.github.io/Game-Lab/version.json 。它記錄來源版本、來源提交、網站入口 sha256、離線單檔 standalone_sha256 及 assets 各腳本 SHA-256。gh-pages 提交編號與來源提交不同，不能混用。

GitHub Pages 啟用方式為 Settings → Pages → Deploy from a branch → gh-pages → / (root)。本次原連線無 Pages 寫入權限；Alan 改為 Public 後，已確認站點 built、來源正確，線上 0.25.3 內容與提交 5d791a9 完全相符。

## 存檔

進度存放於目前瀏覽器的 localStorage。固定網址能避免每次換 Artifact 網址，但不提供帳號同步。由舊網址／本機單檔搬入時，先在舊遊戲「更多 → 存檔與備份」匯出存檔碼，再於固定網址匯入；不要在新網址使用 fresh 參數開始正式進度。

## 回退

保留所有來源標籤及部署歷史。需要回退時從已驗證的來源提交建立新的回退提交、推送，再發佈該產物；不要刪除分支或覆蓋版本標籤。涉及存檔新欄位的版本，先核對舊版能否讀取及是否會遺失新內容，不以只換 HTML 代表已完成安全回退。


## 目前已驗證發佈

v0.26.0，來源提交 56b401ee7d33a9cba13dd1612b96e5e54d19b0a0，部署提交 c904260466a3003cb396d3dcce45bf798e694e27。GitHub Pages 狀態 built，HTTPS 下載的遊戲檔 SHA-256 與本機打包完全一致。版本記錄：[v0.26.0](https://github.com/yauchai2/Game-Lab/releases/tag/v0.26.0)。

[線上核對證據](gameplay-first-pass-2026-10-21/live-verification.json)。雲端 Chromium 直接連外遇到代理憑證信任限制，未關閉 TLS 驗證；線上內容以使用已配置 CA 的 HTTPS 客戶端驗證，遊戲行為以同一份 SHA-256 產物在本機 HTTP 跑瀏覽器回歸。不宣稱直接連外的瀏覽器煙霧測試通過。

## 0.26.1 載入與快取

網站使用依序 defer 的引擎與遊戲腳本，瀏覽器可在初始化前顯示啟動狀態。引擎檔名只隨其內容變化，可沿用瀏覽器快取；首次完整下載量並沒有因此減半。單檔下載仍完整內嵌、不需要網站資源。GitHub Pages 的快取回應由平台管理，未宣稱設定自訂永久快取或實測 iPhone 網速。


## 0.27.1 全介面像素風格

正文／輸入、標題／讀數及輔助標籤分別使用 16／24／12px 共用像素字模。網站仍以相同的分離雜湊腳本流程發佈，三維渲染策略不變；沒有新增外部字體請求。字體新增 LCD 光學版本與嵌入授權，首次下載量會增加，不能把這次改動當成載入時間已改善。驗證及截圖見 [全介面像素掌機](lcd-ui-0.27.1.md)。


## v0.42.0 整合發佈（2026-10-24，香港時間）

PR #31 已合併；來源／標籤提交 b7f795fb51960bbc2642f80a7e273f153c1dd552，部署提交 ca48d2accbf62e2e29bd82ac196182ee29838cb7。Pages built；version.json、入口與兩個雜湊腳本已透過 HTTPS 逐一核對 SHA-256。證據見 [整合發佈目錄](release-0.42.0/integration.md) 與 [線上核對](release-0.42.0/live-verification.json)。

直接上傳 Release 資產收到 401，因此現有 release workflow 增加可選 upload_standalone；從指定 target 提交取出 dist/idle-hero.html，使用 Actions 的儲存庫 token 上傳。發佈說明仍從預設分支讀取，標籤不移動。


## v0.43.0 已發佈（2026-10-24，香港時間）

來源標籤 v0.43.0 固定指向 6db59660c905d54bab2c10fff78c37768b841027，部署提交 864077335c2654cea13bc4d7bcd4b5bd844cb97a。PR #35 及 #34 已合併；所有分支保留。Pages built，線上入口與兩個雜湊腳本的 SHA-256、版本及來源提交均已核對。

[Release](https://github.com/yauchai2/Game-Lab/releases/tag/v0.43.0) 由工作流程 40049182421 成功建立並附上 idle-hero.html；GitHub 回傳附件 digest 及大小與已測試單檔相符。完整證據見 [線上核對](release-0.43.0/live-verification.json)。七部位存檔升級後不建議回匯舊三欄版本；真機效能與配裝平衡仍待驗收。


## v0.44.0 已發佈（2026-10-24，香港時間）

PR #39 整合 #38 的裝置介面與 #37 的最新角色文案（截至 e0b3468），已合併。來源／標籤為 2d36f4030e3bcb3d4d78b7d10e955d5cdc5032bc；Pages 提交 efe1aced7b23e1da631f52f59e21cb4c6bffc371，狀態 built。線上版本、入口及兩個雜湊腳本已核對；[Release](https://github.com/yauchai2/Game-Lab/releases/tag/v0.44.0) 工作流程 40056106608 成功，附件 SHA-256 digest 與大小符合已測試單檔。

證據見 [整合紀錄](release-0.44.0/integration.md) 與 [線上核對](release-0.44.0/live-verification.json)。固定流程已加入每次 release 查核 Claude 最新分支與 PR；不代表其他對話已自動讀取規則。
