# v0.74.0整合發佈接續

Alan已授權release後繼續。main基底4c90e05，Claude4a5d1e4與PR96／93004b5已整合，22浮島／抗性／特效／介面／肩帶耳罩同版；測試與排除範圍見[發佈整合](release-0.74.0/integration.md)。來源PR98；部署與Release完成情況以live-verification.json及GitHub為準。
**2026-10-27，Hello, Static! 開始頁候選：** Alan 提供暮色屋頂＋雙語 Logo 與手機／桌面效果稿，要求取代舊開始頁。獨立分支 `codex/hello-static-title`／[PR #101](https://github.com/yauchai2/Game-Lab/pull/101)，基於 main `282b87c`。移除標題 3D renderer／舊裝置框，改滿高直幅、桌面黑邊、獨立透明 Logo／原生開始按鈕及局部燈號。Alan 再要求序章重製，已移除舊 SVG／上下屏故事卡，改三頁完整直幅漫畫、圖外工具列／可展故事文字、左右鍵及真實觸控滑動。素材隨離線及快取網站嵌入。序章／選職業／存檔仍由既有 INTRO 擁有。證據與已知基線失敗見 [交付紀錄](hello-static-title/README.md)。本批未合併／未發佈。

**本批場景／故事候選：** 已merge main d06be7b／v0.65，保留Claude裝備、手機、掉落及血跡40處／90秒。新增street-neighborhoods.js：十二地景生活工作點，沿terrainBuild放置／碰撞／BFS，120種子中118有位置、全區連通，原版／訓練／塔樓不加。六章contact/request/lead及結尾串錯送試音排程，失物歸還主人；沿同一ch與六深度，不建NPC任務state。directJournal實際手機、六次主線kill／save／地圖離線邊界、24actor、血跡、site0.65／audio及gameplay回歸通過。docs/neighborhood-scenes為入口，音訊及此批仍PR88候選未發佈；下一步處理review及真機／最終佩戴／聽感邊界。

# 接續點：全22浮島

2026-10-27 UTC。分支codex/floating-island-redesign／PR98，基底main4c90e05；Claude4a5d1e4已查核，源碼接入範圍已在PR交接。Alan要求全部完成並注意美感。

22模型／44portableGLB／22Blend／110視圖齊，18故事刷圖＋3塔樓＋1訓練，index與原生戰鬥接入、正式單檔重建。六章／數值／存檔owner沿用；舊12手記附錄與新18手記有版本遷移。詳細設計、工具與驗證見[floating-island-redesign/series-completion.md](floating-island-redesign/series-completion.md)。

未merge／release。下一步是整包驗收與合併review，無需再生其餘地圖；真機Safari、長時間效能及Alan主觀美術驗收仍未完成。其他PR96／97及Claude抗性／傳奇改動保留，未覆蓋。

接續已修背包預覽錯用當前場景、米制詳情與18區實際GLB縮圖。證據series-review-validation.json：54詳情／132切圖／660模擬秒、GPU計數穩定與fade釋放；desktop/mobile新截圖已檢視。主線與活動、save migration、split-build再驗證。此測試是固定場景循環，不是真機長測。其他Claude分支仍4a5d1e4，main仍4c90e05。

肩帶／耳罩修正PR96已整合至本次release候選；保留原GLB、四肢與20專屬裝備。
