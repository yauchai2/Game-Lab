# 回饋服務部署與驗證

2026-10-25，香港時間。來源基準 main e67f73b；任務分支 `codex/feedback-service-setup`。本次已部署後端，未合併／發佈遊戲。

## 已部署、已驗證

- 公開端點：`https://game-lab-feedback.yauchaichan.workers.dev/feedback`。
- Worker：game-lab-feedback；Durable Object `FEEDBACK_GATE` 與限流 binding `RATE_LIMIT` 已掛上。ALLOWED_ORIGIN 為 `https://yauchai2.github.io`；Workers Logs／Traces 關閉。
- `GITHUB_TOKEN`、`RATE_SALT` 已存入 Cloudflare 生產環境加密 Secrets。GitHub Token 僅 Game-Lab Issues Read and write／必要 Metadata Read。Cloudflare 部署 Token 僅目前帳戶 Workers Scripts Edit／Account Settings Read，存入 GitHub Actions Secret `FEEDBACK_CLOUDFLARE_API_TOKEN`。
- Alan 已批准建立兩項 Token，並於要求「部署」後批准新增 GitHub Actions Secret 目的地。兩個 Token 至 2027-01-23 到期；到期前需輪替。私密值沒有寫入儲存庫，操作暫存及一次性顯示頁已清除。
- [完整成功執行 40188521467](https://github.com/yauchai2/Game-Lab/actions/runs/40188521467)：Worker 單元測試、部署、真實提交、防重複及候選打包均成功。驗證來源 667d8c7。
- 真實 [測試 Issue #59](https://github.com/yauchai2/Game-Lab/issues/59)，requestId `2fa1b10b-5a07-4922-a531-0e56d78d93d9`。同一請求重試返回同一單號；改內容但沿用 ID 返回409。預檢204、CORS origin正確、外部 origin403、無效輸入400、真實提交200。
- Actions artifact `feedback-candidate-and-evidence` 包含 `live-smoke.json` 與 `idle-hero-feedback-candidate.html`，保留14日。正式建置仍由版本發佈流程負責。

## 修改範圍與維護

- `.github/workflows/feedback-worker.yml`：contents read；Node24；只在任務分支相關路徑推送或手動執行。先單元測試再部署，部署 Secret 只傳入部署步驟。沒有建立 Cloudflare Git 自動部署的廣權限 Token。
- `services/feedback/live-smoke.mjs`：真實測試會建立一張公開維護者測試單；只有提交訊息包含 `[live-feedback-test]` 才在自動流程執行，普通部署不會反覆開測試單。不需 GitHub Token，走公開 Worker。
- `src/game/feedback-config.js`：只更新公開端點，不包含憑證。
- Worker 程式與原有遊戲表單邏輯未變。
- 首次工作流測試因 cwd 指向服務目錄，測試寫證據路徑失敗；已於 a3e846d 改從 repo root 執行。之後全部通過。

## 環境限制與替代

本地工作目錄 .git 不可寫，shell 無法解析外部網域；電腦控制拒絕操作 Terminal。Cloudflare Git 部署頁沒有列出自訂 Token，只提供建立更廣權限 Token，因此沒有沿該路線部署。改採已批准的 GitHub Actions 與 Cloudflare Dashboard Secrets，成功完成。

## 下一步／驗證界線

- 後端已接通；正式遊戲 Pages 的 endpoint 仍是舊版本空值。需合併本分支、按現有規範重建正式單檔並確認遊戲版本後發佈，才可宣稱正式站遊戲表單可用。
- 本次沒有修改 main、gh-pages、tag 或 release，亦沒有動到其他對話的分支。
- 最終正式站仍需表單端到端驗收；本次是真實公開 HTTP／GitHub 送達驗證，沒有冒稱 Safari 真機驗收。
- 部署 Token 到期只影響再部署；GitHub 回饋 Token 到期會中止開單。輪替後更新相應 Secret，不需公開原文。
