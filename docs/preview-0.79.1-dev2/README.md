# v0.79.1-dev.2 測試節點

2026-10-28，Asia/Hong_Kong。Alan 明確要求「出一個tag，然後上埋測試嗰條link」。範圍是測試版標記與 `/preview/` 部署，不建立正式 Release 或更新根目錄正式遊戲。

- Tag：`v0.79.1-dev.2`，固定來源 `641c43d51601f9f3ed12a76bcf943238753c53b4`。
- 測試網址：https://yauchai2.github.io/Game-Lab/preview/
- 網頁版本：`0.79.1-dev.641c43d`；preview 建置工具依來源提交加上後綴，tag 是該來源的可追溯標記。
- Pages 提交：`3df49cb41836d0299e870a901f2f1b995eb09f79`。
- Pages 工作流程：https://github.com/yauchai2/Game-Lab/actions/runs/40553262456

## 本次包含與未包含

已 fetch 全部遠端分支、tags、open PR。main641c43d已含#116；Claude最新`b16a79f`是同步main，與main沒有內容差異。QA分支`4684415`／#110仍為draft，未整包納入。原型目前沒有另外可接入的新遊戲提交。

本 tag 與已存在的 `v0.79.1-dev.1` 指向相同來源。此為使用者要求的新測試檢查點，**沒有新增遊戲功能**。上一個線上preview來源727ed6d，本次換為合併後main641c43d；遊戲雜湊腳本相同，更新的是測試入口／版本資料與來源追蹤。

包含現有0.79.1的新封面、四人選角與斜放相片序章、0.79系統記錄／載入重試／舊存檔詞綴修補，以及0.78音訊。詳見原 [0.79.1說明](../release-0.79.1/dev-notes.md)。

尚未包含：#117 打造術語與入口整理、角色口號移除、薄血條；#118 HUD遮擋、血條開關、選角重排、序章去舊背景與動作修訂；#115視覺／衝擊候選、#107返回／音訊／巨大首領候選仍依各自交接接入。這些PR是比較／規格或未合併候選，不以本tag冒稱已修復。

## 驗證

- `tools/build_site.py --preview` 確認已提交離線單檔與即時重建一致，無需修改src/index/dist。
- exact split build本機Chromium通過封面／序章、選職業／命名／建立新測試角色；控制樣本將教學標記完成後，390/1024/1440三尺寸可進／退觀戰，無pageerror。見 `browser-smoke.json`。這不是未接入修訂的QA通過證明。
- HTTPS版本資料、入口及全部雜湊腳本逐項核對結果見 `live-verification.json`；線上啟動與標記見 `live-browser.json`。
- 正式根目錄維持0.78.0／bca2a6e。Pages樹比對只修改preview/index.html、preview/version.json，既有遊戲腳本及正式入口未變；結果見 `deployment-verification.json`。

所有既有tag／分支保留，未建立GitHub Release。接續由原型owner處理#117／#118，取得實際程式提交後再發下一個有功能更新的測試版。
