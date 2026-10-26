# v0.64.0 發佈整合

2026-10-26，Asia/Hong_Kong。Alan本輪明確要求「出一個release」。

- 已重新fetch所有遠端分支並查核開啟PR。main基準fd4ed11（v0.62.0），風格來源e4b4a96／PR84，包含血跡、移除笑臉及收音機／搬運箱精修。
- Claude最新7be9377／PR83：相對main僅五份文件變更，已merge到本候選；四份公開評審文案整理及待辦取消紀錄保留。6fcaef6精華功能已由Claude最新提交撤回，遊戲程式相對main無該功能差異，不加入精華。
- codex/release-064的d407134為較舊候選dfd9ab7加文件準備／認證阻礙紀錄；今次採用e4b4a96後續實作重新發佈，保留舊分支。codex/mascot-style-preview-2026-10-26仍為main基準，無新遊戲提交。
- PR75僅早期美術文案、PR12舊角色候選、PR10內部備份不另合入網站；本版已有正式角色衍生素材及現行創作基準。所有分支保留，不覆蓋tag。
- 本輪血跡／11類無貼圖與fade、10gameplay已通過；原生精修渲染零maps。完整資產、動畫、狀態、存檔、網站回歸與限制見docs/style-complete/README.md。既有兩項stale VM測試於乾淨baseline相同失敗，並非全套歷史測試全綠；未宣稱真機FPS或Safari驗收。

來源需先PR合併main再發佈Pages；線上雜湊、source commit、Release附件將於完成後追加驗證。

發佈前本輪重跑：4角色×9clips、16gear、22type＋4Boss、A/B、三地區、320／390、24實體街區、六章boss kill／save／offline-map邊界、分檔網站390px／頭像／proxy全部通過。證據位於docs/style-complete的runtime-validation、story-dense-validation、site-validation等JSON。

PR84已合併，發佈來源為2f7c889f6a272d278d0aa44335dfc58151c0f2e3；Pages部署076180d07bcfaa5d05c8a0f00c29bf2a7a717b78，工作流程40324674500成功。正式HTTPS的version.json、index.html及21個腳本SHA-256逐一吻合，離線單檔SHA-256為30c546fe826cd7bdf534cff5d667409884d5cccba5d291892e3c6fc92e8ce9ea。

正式站Chromium390px直接啟動通過：v0.64.0、街頭模式、十二GLB、六章、同伴零maps、cardboardFace未定義、無水平溢出、無頁面錯誤或HTTP失敗。證據live-browser.json與live-mobile.png。使用新建瀏覽器context，未操作使用者的實際存檔。

Release工作流程40324886785成功；v0.64.0標籤精確指向上述來源，idle-hero.html附件23,492,998bytes，GitHub回傳digest與本機已驗單檔相同。Release：https://github.com/yauchai2/Game-Lab/releases/tag/v0.64.0 。
