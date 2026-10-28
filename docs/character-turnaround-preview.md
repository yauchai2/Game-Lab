# 四角色三視圖：首張風格預覽

2026-10-28，Asia/Taipei。任務分支 `codex/character-turnaround-preview`；基準為 fetch 後的 main `641c43d`。狀態：單張候選已生成、已目視檢查；未獲使用者定稿確認、未製作完整三視圖、未接入遊戲、未合併／發佈。

## 任務與來源

使用者要求按四角色定位與故事生成人物三視圖，先看其中一張效果，並指定 handmade early-2000s Japanese game asset、semi-lowpoly、flat/unlit matte、像素五官、nearest-neighbor、白底單人無文字。首張依其提示採單人前側四分之三風格預覽；正式三視圖會移除與任務衝突的 negative `turnaround sheet`，改用等比例正面／側面／背面。

已讀 AGENTS、README、DESIGN、UX-CONTRACT、creative-direction、session-checkpoint、backlog、characters、story、characters-data 與角色模型／選角交接。已查 open PR 清單：#120、#118 涉及選角／3D 合照，故本次獨立新增概念素材，不改動相關實作。僅核對 PR 清單，未審查其全部差異。

`docs/characters.md` 的 AKANE／REN／YUI／TAICHI 是舊草案；現行資料使用 street／frost／beep／volt 保存鍵與戰士／樂師／獵手／寵機師職業，模型代號 AKI／MILO／PING／NULL。角色故事依現行 characters-data 與夏日電台失常世界觀，不把草案失蹤師父等故事當成現行定稿。

本次直接目視檢查專案已批准的 `assets/brand/hello-static/character-select/source.png`，以其左側 AKI 為身分／服裝參考。未重新檢視 Ice Cream 原片，不宣稱完成全遊戲參考影片一致性驗收；本張以使用者當前提示與現行批准人物圖為依據。

## 產物與決策

- [AKI 首張預覽](../assets/concepts/character-turnarounds/aki-preview.png)
- [完整實際生成提示詞（含 negative）](../assets/concepts/character-turnarounds/aki-preview-prompt.txt)
- 來源工具：host-native ImageGen，引用上述四人原圖；未使用 Tripo／Leonardo 或建立模型。原始輸出 `/workspace/generated_images/exec-edabf974-ca1a-4653-9c76-4304432348c2.png` 已原樣複製入 repo，原件保留。
- 保留藍黑長髮、白耳機／藍色塊、短灰白工作外套、炭黑背心、軍綠寬褲、白藍厚鞋及既有四肢比例；不增加武器或寵機，遵循單主體、無 props 要求。
- 角色能力與故事表現取街區電力維護／近戰與護盾，放鬆單側重心，不更改名字、職業、能力、存檔或既有模型。

## 驗證與限制

已目視確認：單人完整輪廓與雙腳、白底、無文字／浮游道具、像素五官、清楚大色塊及低面數風格。圖片仍有面向明暗，不能據此宣稱實際 unlit 材質已驗證；視角偏正面、人物留白不足，正式三視圖須改為正交同尺度、統一中性站姿並增加上下留白。未保證生成模型真正按 256px 光柵化再精確 nearest-neighbor 放大。此為 2D 概念候選，不是可用 GLB，也不代表背面服裝已定稿。

本次僅新增圖像、提示詞與文件，執行檔案格式／尺寸／SHA-256及 git diff 空白檢查；不重建 dist、不執行與概念素材無關的遊戲回歸。下一步依使用者對首張的意見，製作四人的正／側／背三視圖，側背不可宣稱由現有正面參考完整驗證。

檔案驗證：PNG，1254×1254，RGB；SHA-256 `8f52138b7ccf48d8a3fdef0658f11659ff1efad84557ab7c3381e5b29a4dd948`。Pillow verify 與 git diff --check 通過。
