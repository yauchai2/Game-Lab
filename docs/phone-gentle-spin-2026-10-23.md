# 小手機緩慢自轉修正

日期：2026-10-23（Asia/Hong_Kong）。

- 任務分支：codex/phone-gentle-spin；基底 claude/project-thread-yw9jjp @ ee89ab6a235ca093f320cf180dd8e6e524a7e04d（既有 PR #17）。
- 已實作：src/game/05k-phone.js 保留單一立體手機及銀灰 Y2K 凹槽，取消每 12 秒 -30°／+30° 往返，改為 Y 軸單向 48 秒一圈、固定 4° 俯仰；減少動態時停在 -24°；入口補上繁中 aria-label。
- 決策：自轉指繞自身中心單向慢轉，不用 ease-in-out 的左右擺動。既有模型、貼圖、位置、尺寸、點擊開啟、遊戲資料及其他對話成果保留。
- 已驗證：node --check /tmp/game-lab-phone/05k-phone.js 通過；核對僅入口 CSS 動態和 accessible name 改動；沒有新增額外手機。
- 未驗證：參考附件只取得 OCR，未能取得可視像素；沒有完成與圖片的視覺比對。環境沒有 Playwright，且無法透過本機網路連接 GitHub，所以未跑 tools/test_phone_browser.cjs、完整 UI audit 或瀏覽器動態驗收。
- 未建置：GitHub 回傳 dist/idle-hero.html 的空內容，未覆寫既有打包檔。整合後須 python3 tools/build.py，再跑 GAME_LAB_TEST_URL 指向該版本的 tools/test_phone_browser.cjs，並確認桌機／窄螢幕、48 秒循環及減少動態狀態。
- 狀態：來源修正及文件已提交到任務分支；未合併、未發佈。PR 目標為上述手機工作分支，避免混入或覆蓋其他人的 main 變更。
