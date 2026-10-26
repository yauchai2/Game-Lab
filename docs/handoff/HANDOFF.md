# Game Lab 交接文件（HANDOFF）

更新時間：2026-10-21（香港時間）。這是給接手 agent 的完整交接，以本檔、repo 的 CHANGELOG 與 backlog.md 為準。

## 1. 專案與使用者
- 使用者：Alan（GitHub：yauchai2）。繁體中文，有時夾廣東話；中文用全形標點，英文標點後加一個空格。
- 專案：Game Lab，類暗黑2／流放之路2 的掛機 RPG（網頁版），代號 Idle Hero。美術走 Y2K low poly 3D 加作業系統視窗風 UI。
- 工作原則、公開內容規則、分工規則：見 memory.md，請完整遵守。

## 2. 版本與 GitHub
- 目前版本：v0.23.2（第 70 版，提交 79347d3）。版本取自原型討論串回報，以 repo 的 CHANGELOG 為準。
- Repo：https://github.com/yauchai2/Game-Lab
- PR #1（draft，遊戲本體）：https://github.com/yauchai2/Game-Lab/pull/1 ，分支 claude/project-thread-yw9jjp。
- PR #2（draft，試玩連結打包腳本）：https://github.com/yauchai2/Game-Lab/pull/2 ，分支 claude/project-thread-afu9rh。
- PR #3（已合併）：https://github.com/yauchai2/Game-Lab/pull/3 。
- 注意：遊戲程式碼在上述分支，main 還沒有。不要刪除任何分支。

## 3. 試玩 Artifact
- https://claude.ai/artifact/HufzcEfT1TWJBi6D5pQQRb （私人，知道連結者可開）。
- Artifact 不會隨帳號搬走，新帳號要用 repo 內的打包腳本重新建置並發佈。

## 4. 討論串分工
- 「掛機 RPG 等距手繪風原型」：唯一可修改遊戲程式碼（src/）與發佈試玩的討論串，勾選 docs/backlog.md。
- 「Auto Wanderer 機制研究」：只寫 docs/ 與研究，想法以文件交給原型串。
- 其他討論串按需要建立。

## 5. 待辦
見同資料夾 backlog.md。UI/UX 計劃在 idle-hero-docs 的 ui-ux-plan.md：階段 1、2 已完成（0.14.0），其餘待做。

## 6. 在新帳號重建的步驟
1. 建立新專案 Game Lab，連結 GitHub repo yauchai2/Game-Lab（新帳號需要該 repo 權限）。
2. 把 memory.md 內兩份記憶貼回新專案記憶（MEMORY.md 與 public-text-rule.md）。
3. 原型串的 docs/ 內容以 repo 為準。
4. 請原型串先看 PR #1 分支，繼續開發並重新發佈試玩 Artifact。
5. 參考圖與截圖需要 Alan 另外提供（見第 8 節）。
6. Figma 草稿檔「Idle Hero UI assets」屬 Votanic Research Team，確認新帳號權限。

## 7. 每日備份
- 排程：每天香港時間 12:00，trigger trig_011zEeB9Rfmqf13hiVj7B7eN，模型 Haiku 5.5，綁在「每日備份到 Google Drive」討論串。
- 資料夾：https://drive.google.com/drive/folders/1gglVwh3CV6hyrwe-qmzMdFdlzQxB5y0w

## 8. 沒有進備份的檔案
- 參考圖與截圖約 32 MB，連結器傳不了，需要 Alan 另外提供。
- 上傳資料夾：https://drive.google.com/drive/folders/1PDfd1BrJQPeI2gBSPgtC0AZlNYC6FdM1

## 9. 已知的過期內容
- Drive 上較舊的 HANDOFF.md 與 backlog.md 以本檔與 docs/handoff/ 為準。
- 排程設定的紀錄見第 7 節。
