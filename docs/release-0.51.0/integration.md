# v0.51.0 發佈證據

2026-10-25，香港時間。RIFT-01至29及PHONE-01已實作、驗證、合併及發佈。

- 來源PR：https://github.com/yauchai2/Game-Lab/pull/57 ，任務提交749086b599b88d1ba6d35b2bdb5ff9ff65049980。
- 已納入手機PR #56（4799ed7），GitHub確認該PR已合併。
- 正式來源／tag：ba31214f00c6dfa0979bd49ee4608c11178ef46b。
- Pages：f4fd7718289d39a09249882b3cd6dd011c0c0c1d，狀態built。
- Release工作40163735955、Pages工作40163729461，均成功。
- Release：https://github.com/yauchai2/Game-Lab/releases/tag/v0.51.0。
- 附件ID 674136225，16881359 bytes，sha256:a124846051530374a08600f13ba8c613b8e6388be82c0ba2ad8ad373225b2be6。
- 試玩：https://yauchai2.github.io/Game-Lab/?v=0.51.0 。

HTTPS manifest、入口、全部內容雜湊腳本及來源均吻合。離線附件用GitHub API digest／大小對照同來源單檔，未宣稱下載附件轉址。詳見live-verification.json。

正式HTTPS的16個整合瀏覽器流程全通過、無頁面錯誤，見browser-results.json及本目錄截圖；其中舊wireUndo入口亦使用新共用歷史。來源33套件全通過，新增190斷言；另9個精修、19個視窗／真實觸控、15個背包流程及單檔預覽通過，逐項對照../rift-experience-2026-10-25/review.md。

Claude所有heads及open PR已fresh fetch並逐SHA核對，遊戲e0b3468已包含，內部備份／歷史研究改名排除，全部分支與tag保留，見claude-integration.json。

12組固定區域樣本皆封閉裂隙；樣本關閉自動推進，不當成自然換區下的完成率、玩家群體勝率或長期流派平衡。未測真機Safari／FPS。靜態audit保留phone兩個既有委派事件偵測提示，設計lint無錯誤。全球排名、Cloudflare代發及贊助收款仍未接通。
