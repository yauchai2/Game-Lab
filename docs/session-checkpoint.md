# Game Lab 精簡接續紀錄

2026-10-25，香港時間。先讀本頁再查相關差異，避免重複研究。

- 目前正式 v0.50.0：來源／tag a22aaaf，Pages 1111a86，Release 40147334072／Pages 40147329463 成功；HTTPS入口與兩腳本 SHA、附件 digest／大小、tag 已核對。證據 docs/release-0.50.0/integration.md。
- v0.50.0 來源 codex/tower-combat-overhaul（fa23127），PR #54 已合併；發佈證據 codex/release-050。TOWER-01 至 17 已實作、驗證及發佈；詳細對照 docs/tower-combat-2026-10-25/review.md。
- 最終驗證：32 個來源套件全部通過，新增 282 斷言；11 個塔樓戰鬥流程、19 個視窗觸控流程、15 個背包流程、單檔預覽通過。沒有真機 Safari／FPS或長期終局平衡認證。靜態 audit 保留兩個既有 phone 代理事件偵測提示，design lint 無錯誤。
- 23 主動技能分 8 基礎／7 進階／8 稀有，21 輔助；手動配裝及接線，未接通終點不生效。普通地圖18種、塔樓另3種室內房；舊塔落地物一次遷到室內可達區，不預先派收益。
- 隱藏戰場只停戰鬥音效，音樂繼續；手機不顯示隱藏提示列，保留「展」復原。箭雨／巨大劍等持續演出總傷害預算固定。
- 已重新 fetch 全部分支及 open PR，Claude 遊戲提交 e0b3468 已包含，內部備份及歷史研究改名不混入遊戲。每次 release 仍須 fresh fetch，保留所有分支與 tag，來源先 push。
- Cloudflare 回饋及 Ko-fi 未接通，不假稱可用，不索取聊天 Token；全球排名、真機及長期平衡仍待完成。
- 唯一全專案待辦 docs/backlog.md；繁中全形標點、銀灰藍紫 Y2K／Cubic 11、低面數像素酷感。公開文字不可提參考遊戲、內部研究、帳號或公司資源。

進行中PHONE-01：codex/phone-natural-turn，base fe88546。手機卡片以實際GLB預製48格透明轉台，正交自然角度、16秒旋轉；刪除舊平面縮圖退路與runtime縮圖renderer。全屏內頁維持正面可讀。尚未發佈，不把正式0.50.0當已更新。驗證與截圖docs/phone-natural-2026-10-25/。
