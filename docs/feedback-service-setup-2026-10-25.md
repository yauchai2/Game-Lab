# 回饋服務設定進度

2026-10-25，香港時間。

- 基準 main e67f73b；任務分支 codex/feedback-service-setup。
- 已核對 AGENTS.md、README.md、services/feedback/README.md、Worker 原始碼、Wrangler 設定、接續紀錄及回饋相關待辦。沒有修改正式遊戲或發佈。
- Alan 已登入 Cloudflare 與 GitHub，並明確批准兩個 90 日 Token（至 2027-01-23）：Cloudflare 目前帳戶 Workers Scripts Edit / Account Settings Read；GitHub 僅 Game-Lab Issues Read and write 與必要 Metadata Read。兩個 Token 已建立，原文不寫入文件或程式碼。
- Cloudflare Git 建立流程只列出自動建立廣權限 Token，未列出自訂 Token，故沒有按部署，也沒有建立該廣權限 Token。
- 本環境 shell 無法解析 GitHub／Cloudflare 網域；工作目錄 .git 不可寫。電腦控制拒絕操作 Terminal。改備 GitHub Actions 路線。
- 已提交 .github/workflows/feedback-worker.yml：僅任務分支相關路徑推送觸發，或手動；contents read；先執行現有 Worker 單元測試，再部署；不發佈遊戲 Pages。部署步驟讀取 FEEDBACK_CLOUDFLARE_API_TOKEN，未有密鑰原文。
- 下一步待使用者確認將已批准 Cloudflare Token 存入 Game-Lab Actions secret FEEDBACK_CLOUDFLARE_API_TOKEN（新增憑證目的地）。目前 Secret 值未輸入，Worker 未部署、GITHUB_TOKEN／RATE_SALT 未存入 Worker、endpoint 仍空白。
- 確認後：設定 Actions Secret、核對建置結果並重跑部署；在 Cloudflare 設定 GITHUB_TOKEN 與 RATE_SALT；真實提交及防重複驗證；任務分支更新 endpoint、驗證候選並提 PR。正式遊戲合併／發佈沿既有規範。
- Token 原文僅留在本次受控瀏覽器操作的暫存變數及一次性顯示頁；若操作狀態遺失，不能假稱仍可讀取，需按實際顯示情況恢復或安全輪替。
