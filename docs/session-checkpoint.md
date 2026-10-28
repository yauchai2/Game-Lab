# 目前接續入口（2026-10-28，Asia/Hong_Kong）

Alan已明確批准將完整交接摘要（含歷史）推到任務分支。已同步[完整交接摘要](full-handoff-2026-10-28.md)，提交[2a818ef](https://github.com/yauchai2/Game-Lab/commit/2a818ef8c688b7be21379f20dfda95efe58ff523)。此入口位於 `codex/preview-integrate-20261028`；不代表已合併main。

目前查核快照：main與preview來源641c43d、測試版0.79.1-dev.641c43d。#113／#116的封面／像素序章／插畫選角已合併；#107與#120音樂、#115／#118後續序章修訂、#120四人3D等候選未完成runtime整合。完整摘要記錄實際來源／部署腳本差異及先前結論更正。

本對話尚未更改runtime或部署網站。具contents／Pages寫入權限的持續自動部署workflow被自動審核拒絕，未建立；最新批准只涵蓋摘要同步，不能作為啟用workflow的批准。本機Git DNS／gh憑證有阻礙，GitHub連接文件讀寫正常。見[部署提案及限制](preview-integration-2026-10-28.md)。

接續先重新核對遠端，再按既有owner分工整合、驗證及僅部署preview；不直接覆寫舊分支產物，也不把已有候選驗證當新整合通過。未改正式站、main、tag或Release。

---

## 原有歷史checkpoint（完整保留）

以下為此分支繼承的歷史文字；其中「#113候選未合併」等描述已被後來#116整合及本摘要的查核取代，保留供追溯。

> 入口原圖修復候選（2026-10-28，Asia/Hong_Kong）：延續 PR #113，分支 codex/hello-static-character-select 已整合 main c67529d。Alan 指定酸黃天線原直幅／橫幅作封面；找回生成原 PNG，無 screencap。一次取樣重做封面／Logo／序章，救回軟 alpha、人面、字標，boot 與 title 共用響應式 picture／CSS，移除靜止旋轉與多餘覆層。證據、原圖 SHA、限制及接線見 [entry-art-refresh](entry-art-refresh/README.md)。候選未合併／發佈。

> 選角頁候選（2026-10-27，Asia/Hong_Kong）：`codex/hello-static-character-select`，基於 main `4d9fe30`，保留 v0.78 音訊及 0.79 測試版系統記錄。批准白底四人圖已處理為 192px／40 色／4 倍 nearest-neighbor，獨立人物亮色與短上浮、四職業按鍵、能力說明及命名已接入既有建立／存檔／教學流程。範圍、測試證據及限制見 [選角交付](character-select/README.md)。開發／分段版各 10 組選角流程與原封面／序章 8 組回歸通過；另修正新增角色遺失 G.pal 的繪製錯誤。候選不代表合併或發佈。

> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0音訊整合發佈

2026-10-27，Asia/Taipei。Alan明確要求發佈，並說Claude首領曲／序章音效不一定跟，以整體效果為重。基於main96ec21e／v0.77.1，Claude最新d2aab10與main程式相同；PR104從審查轉成正式音訊整合。

實際54檔：日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser（CC0），工業underpass與精英rush重編32小節；46舊cue全部整音／實體層／短通知，另2金屬木箱命中。22場景明確選曲；原雙deck循環淡換、story單聲、長技能同家族配額。角色／故事／技能／地圖／存檔不改，怪物材質取同streetCreatureSpec owner。

素材8.35MB，上限9MB；完整源曲與逐檔CC0／原創／混合標記、raw/member/master/embed SHA齊。未採樣3參考影片、未付費。54資產／實際播放／22路由／loop-wrap／mute／mix／全repo回歸通過，見[整合](release-0.78.0/integration.md)、verification.json及audio-release-validation.json。線上部署／tag／附件完成證據以live-verification.json為準。

歷史審查52檔凍結到assets/audio-review，不再讀現行src/audio冒認舊版；舊17封存音訊未變。舊生成器有防護，正式重建用tools/audio/build_release_palette.py、pack_audio.py、build.py。真機、主觀聽感與30分鐘疲勞仍未宣稱完成。
