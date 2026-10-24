# 遊戲內回饋代發

狀態：服務端與遊戲介面已準備，尚未部署。Alan目前沒有Cloudflare專案或回饋API。未配置端點時遊戲只保留／下載草稿，不假報提交成功。

1. 建立Cloudflare帳號與Worker（可用免費方案，實際額度依平台當時條款）。GitHub Pages只放前端，不能保存代發憑證。
2. 建立僅安裝於Game-Lab的GitHub App，Repository permissions僅Issues讀寫；產生PKCS#8格式RSA私鑰，記下App ID與Installation ID。私鑰若為PKCS#1，在本機轉成PKCS#8後再存Secret。不要把私鑰、Token或會話代理憑證寫進repo。
3. 在本目錄安裝Wrangler並登入自己的Cloudflare。設定`GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID`、`GITHUB_APP_PRIVATE_KEY`及隨機`RATE_SALT`為Worker Secrets。可改用僅此repo的fine-grained Issues Token，Secret名稱`GITHUB_TOKEN`；不要同時配置兩種身份。
4. `npm run deploy`。部署含Durable Object與Rate Limit binding，分別處理同一requestId的重複提交及每IP每分鐘5次；只在Worker內雜湊IP，不記錄原始IP或回饋內容到log。確認自己的方案支援這兩種binding；缺少任一binding直接503，不默默放行。
5. 將`src/game/feedback-config.js`的endpoint設為自己的`https://...workers.dev/feedback`，重建候選。此檔只能含公開端點，不能有Token。正常TLS、正確CORS及實際公開提交流程通過後才可宣稱已接通。

玩家不會外連、登入GitHub或看到Token；表單仍寫明「回饋會公開」，只傳類別、標題、內容及版本。瀏覽器資訊必須玩家勾選；不傳角色名稱、存檔或遊戲進度。

伺服器固定目標yauchai2/Game-Lab，不能由玩家改repo。內容放程式碼區塊、抑制標題@提及；不把使用者文字當指令或抓取其連結。成功只回傳單號。同一requestId及內容重試不重複開Issue；不確定的網路結果保留pending，不自動重送。若上游結果不確定，維護者依Issue的`game-feedback:UUID`註記查核後才人工解鎖；系統不把202當成功。

Durable Object只保留內容雜湊、狀態與單號，不保存回饋原文；GitHub上的公開Issue依repo維護。除匿名回饋提交外，不提供任意代理API。單元測試stub全部上游請求，不會向GitHub發真Issue。
