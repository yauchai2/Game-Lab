# v0.50.0 發佈與整合證據

2026-10-25，香港時間。TOWER-01 至 17 已實作、驗證、合併及發佈。

- 來源 PR：https://github.com/yauchai2/Game-Lab/pull/54 ，任務提交 fa231273abd96d2b95c22416fc9553fe40a41912。
- 正式來源／tag：a22aaaf5c39024e42de1fb0da1c4f0e116db185c。
- Pages：1111a86f712fea6ad6f6ce5970df29943c446281，狀態 built。
- Release 工作：40147334072；Pages 工作：40147329463，均成功。
- Release：https://github.com/yauchai2/Game-Lab/releases/tag/v0.50.0。
- 離線附件：ID 673698852，16606095 bytes，sha256:39252f1dbf8eea6d250e00d0a467aea2b2f578dfc5f462453afad4581c2aa364。
- 固定試玩：https://yauchai2.github.io/Game-Lab/?v=0.50.0 。

HTTPS manifest、入口及全部內容雜湊腳本均吻合；附件以 GitHub API digest／大小對照同來源單檔，未宣稱下載附件轉址。詳細見 live-verification.json。

## 驗收

32 個來源套件全通過，新增 282 條斷言；11 個塔樓戰鬥流程、19 個視窗及真實指標／觸控流程、15 個背包流程、零外部請求單檔預覽通過。正式 HTTPS 另執行塔樓戰鬥流程，結果見 browser-results.json。完整需求對照與截圖見 ../tower-combat-2026-10-25/review.md。

已 fresh fetch 所有 heads 並查閱 open PR；Claude 遊戲提交 e0b3468 已在基底，無新遊戲差異；內部備份及歷史研究改名排除，全部分支保留，逐 SHA 見 claude-integration.json。

四職業相同裝備、同 RNG、三個手動基礎技能，在 240 秒普通戰鬥後再跑 120 秒塔樓，完成 10 至 12 層，均擊敗首位關主。這是短期來源模擬；沒有真機 Safari、FPS 或長期流派平衡認證。靜態 audit 兩個既有手機代理事件提示保留，設計 lint 無錯誤。Cloudflare 回饋、贊助收款及全球排名仍未完成。
