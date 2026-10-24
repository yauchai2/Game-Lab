# v0.44.0 整合發佈

日期：2026-10-24，香港時間。Alan 明確要求發佈，並指定今後每次 release 都檢查 Claude 的整合；固定規則已寫入 AGENTS.md 與 docs/deployment.md。

## 來源與取捨

- 基底 main：8fb03af88e70bfaece26d2428931f3a5047d9f0d，上一公開版本為 v0.43.0。
- PR #38，候選 e14f909b2ca5cde04f1b82f46c711e5bf95e38c6：3D 物件縮圖、訊號組裝台、整備台及設定網格。
- PR #37，Claude 分支 claude/project-thread-yw9jjp，已 fetch 並納入截至 e0b3468a4585a1d105452af46afd83705dc1b4e3 的四筆新提交：64bb26e、5e9585e、efade4b、e0b3468。包含四角色日系中文姓名、用語、問候、力盡提示及最終冷峻台詞；不新增假名。
- 透過 merge 保留 Claude ancestry，不只複製文字。CHANGELOG 合成單一 v0.44.0；衝突的 font.js 與 dist/idle-hero.html 從整合來源重新產生。
- 接合修正：角色舞台代號及新產生的專裝顯示名稱對齊 AKANE／REN／YUI／TAICHI；模型資產 ID、存檔鍵、已存暱稱與既有物品資料不改。既有 pending 物件仍明示程序式 3D 代用。
- PR #12：舊角色候選內容已在 main，沒有獨立未合併玩法改動可重複納入。
- PR #10：內部交接備份，未當成遊戲改動合併；不發佈至網站。所有既有分支保留。

## 驗證

- 整合來源重新執行 21 組來源檢查，全部通過，包含七部位、專裝持有者、角色、接線、玩法、離線收益及字體。
- 整合後 11 組工作區瀏覽器流程通過，含五種 viewport、設定保存、3D 物件、打造成本與確認。browser-results.json 與 final-* 圖片為本次整合實際輸出。
- 最終單檔測試通過：真實角色預覽、七部位、阻擋所有外部資源後無請求或頁面錯誤。bundle-results.json。
- 角色名稱接合另測四角色可讀姓名、舞台代號、資產模型 ID、專裝名稱，以及既有存檔角色鍵／自訂暱稱／裝備／金幣往返。integration-browser.json。
- 角色舞台代號只修改可讀文字的來源順序，維持模型 ID 及所有運算。

原候選的設計、拖線及靜態審核紀錄保留於 docs/device-ui-2026-10-24。兩項既有手機事件委派靜態提示、四件代用品最終美術及真機效能仍未宣稱解決。

## 發佈狀態

PR #39 已合併，#37 與 #38 因來源 ancestry 一併標記合併。來源／標籤 v0.44.0 指向 2d36f4030e3bcb3d4d78b7d10e955d5cdc5032bc；Pages 提交 efe1aced7b23e1da631f52f59e21cb4c6bffc371，狀態 built。Release 工作流程 40056106608 成功；附件 idle-hero.html 的 GitHub SHA-256 digest 與大小符合已測試單檔。線上 version.json、入口及全部雜湊腳本均以 HTTPS 核對，證據見 live-verification.json。所有分支保留，標籤未覆蓋。

部署入口另以已核對 HTTPS 雜湊的同一份分離式產物重播，確認啟動、九個設定入口及技能／打造／設定三頁無頁面錯誤，見 site-browser.json。雲端 Chromium 直接開線上頁遇到連線錯誤，未停用 TLS 驗證；不宣稱直接連外瀏覽器或 Safari 真機測試通過。
