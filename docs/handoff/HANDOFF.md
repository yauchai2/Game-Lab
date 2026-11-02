# Game Lab 交接文件（HANDOFF）

更新時間：2026-11-02（香港時間）。這是給接手 agent 的交接摘要，以 repo 的 CHANGELOG、docs/backlog.md 與 GitHub 提交紀錄為準。

## 1. 專案與使用者
- 使用者：Alan（GitHub：yauchai2）。繁體中文，有時夾廣東話；中文用全形標點，英文標點後加一個空格。
- 專案：Game Lab（Idle Hero），類暗黑2／流放之路2 的掛機 RPG，Web 版。美術方向見專案記憶（Dreamcast／PS2 時代日系街頭 3D）。
- 工作原則、公開內容規則、分工規則：見 memory.md 與專案記憶資料夾 team/silo，請完整遵守。

## 2. 版本與 GitHub（2026-11-02 核對）
- Repo：https://github.com/yauchai2/Game-Lab（公開）。
- main 最新提交：e16aff8（2026-11-01，記錄已驗證的 v0.80.0 發佈與整合完成）；正式版為 v0.80.0（524d451 Release，整合開始頁、戰鬥表現、音效與 QA）。
- 開發版版號以 repo 為準；上一版記載 0.79.1 開發版（641c43d，PR #116）。
- 注意：舊版 HANDOFF 寫的「v0.23.2 第 70 版、提交 79347d3」與 repo 不符，已更正。版本號以 repo 為準。
- PR #10（draft，暫放交接文件）：https://github.com/yauchai2/Game-Lab/pull/10 ，分支 claude/handoff-backup-docs（head f27a05c），只含 docs/handoff/。遊戲正式上線前必須刪除 docs/handoff/ 或搬到私人 repo。
- PR #1、#2 的狀態本次未核對。

## 3. 試玩與發佈
- 固定試玩：https://yauchai2.github.io/Game-Lab/ （正式），測試版 https://yauchai2.github.io/Game-Lab/preview/
- 舊的 Artifact 試玩連結：https://claude.ai/artifact/HufzcEfT1TWJBi6D5pQQRb （本次未核對是否仍可開）。
- 發佈流程：先 push，再 python3 tools/build.py 與 tools/publish_pages.py（見 docs/deployment.md）。版本號每次發佈都要升，不可重複。只有 Alan 說「出 Release」才建正式 Release。

## 4. 討論串分工
- 「掛機 RPG 等距手繪風原型」：唯一可修改遊戲程式碼（src/）與發佈試玩的討論串。
- 其他討論串只寫 docs/ 或研究，想法以文件交給原型串。
- Codex 也在合作：只動 tools/、assets/、docs/ 與自己的分支，不碰 src/。

## 5. 待辦
- 見 docs/backlog.md（以 repo 最新版為準，本次未重新核對）。

## 6. 在新帳號重建的步驟
1. 建立新專案 Game Lab，連結 GitHub repo yauchai2/Game-Lab（新帳號需要該 repo 權限）。
2. 把專案記憶 team/silo 的全部檔案貼回新專案記憶。
3. 依 repo 的 docs/ 與 tools/ 重建專案，發佈流程見第 3 節。
4. 參考圖與截圖需要 Alan 另外提供（見第 8 節）。
5. Figma 草稿檔「Idle Hero UI assets」屬 Votanic Research Team，確認新帳號權限。

## 7. 每日備份
- 排程：每天香港時間 12:00，trigger trig_011zEeB9Rfmqf13hiVj7B7eN，模型 Haiku 5.5，綁在「每日備份到 Google Drive」討論串。
- 資料夾：https://drive.google.com/drive/folders/1gglVwh3CV6hyrwe-qmzMdFdlzQxB5y0w
- 快照：snapshots 資料夾內每日一份（香港時間 12:03）。超過 7 份的舊快照列在第 10 節，由 Alan 決定是否刪除，系統不自動刪。

## 8. 沒有進備份的檔案
- 參考圖 3D (17) 到 3D (20) 的 .jpg、Screenshot 2026-10-21 系列 .png、auto-wanderer-ui-ref 圖片與 zip、idle-hero-art 與 idle-hero-art-y2k 的圖片，約 32 MB 以上，連結器傳不了，需要 Alan 另外提供。
- 已建立資料夾 reference-images 供上傳：https://drive.google.com/drive/folders/1PDfd1BrJQPeI2gBSPgtC0AZlNYC6FdM1

## 9. 已知的過期內容（2026-11-02 發現）
- Drive 上 memory.md 仍是 10-21 的版本（只含 MEMORY.md 與 public-text-rule）。team/silo 目前有 9 個記憶檔（MEMORY.md 已於 11-02 改寫，含 art-direction-street-3d、wire-routing-direction、drive-backup 等），尚未完整備份。
- idle-hero-docs.md 是 10-21 的 9 份文件；目前 idle-hero-docs 資料夾約 23 份、其中 8 份比 10-21 的版本新，約 144 KB，尚未完整備份。
- backlog.md 是 9cf71da 的版本，尚未更新。
- 上述三項的完整備份需要分批上傳，超出單次連結器的合理負荷，需要另外安排。

## 10. 超過 7 份的舊快照（待 Alan 決定）
- 2026-10-21_0305、2026-10-21_1203、2026-10-22_1203、2026-10-23_1203、2026-10-24_1203 等。系統不自動刪。
