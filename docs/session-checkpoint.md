> 入口原圖修復候選（2026-10-28，Asia/Hong_Kong）：延續 PR #113，分支 codex/hello-static-character-select 已整合 main c67529d。Alan 指定酸黃天線原直幅／橫幅作封面；找回生成原 PNG，無 screencap。一次取樣重做封面／Logo／序章，救回軟 alpha、人面、字標，boot 與 title 共用響應式 picture／CSS，移除靜止旋轉與多餘覆層。證據、原圖 SHA、限制及接線見 [entry-art-refresh](entry-art-refresh/README.md)。候選未合併／發佈。

> 選角頁候選（2026-10-27，Asia/Hong_Kong）：`codex/hello-static-character-select`，基於 main `4d9fe30`，保留 v0.78 音訊及 0.79 測試版系統記錄。批准白底四人圖已處理為 192px／40 色／4 倍 nearest-neighbor，獨立人物亮色與短上浮、四職業按鍵、能力說明及命名已接入既有建立／存檔／教學流程。範圍、測試證據及限制見 [選角交付](character-select/README.md)。開發／分段版各 10 組選角流程與原封面／序章 8 組回歸通過；另修正新增角色遺失 G.pal 的繪製錯誤。候選不代表合併或發佈。

> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0音訊整合發佈

2026-10-27，Asia/Taipei。Alan明確要求發佈，並說Claude首領曲／序章音效不一定跟，以整體效果為重。基於main96ec21e／v0.77.1，Claude最新d2aab10與main程式相同；PR104從審查轉成正式音訊整合。

實際54檔：日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser（CC0），工業underpass與精英rush重編32小節；46舊cue全部整音／實體層／短通知，另2金屬木箱命中。22場景明確選曲；原雙deck循環淡換、story單聲、長技能同家族配額。角色／故事／技能／地圖／存檔不改，怪物材質取同streetCreatureSpec owner。

素材8.35MB，上限9MB；完整源曲與逐檔CC0／原創／混合標記、raw/member/master/embed SHA齊。未採樣3參考影片、未付費。54資產／實際播放／22路由／loop-wrap／mute／mix／全repo回歸通過，見[整合](release-0.78.0/integration.md)、verification.json及audio-release-validation.json。線上部署／tag／附件完成證據以live-verification.json為準。

歷史審查52檔凍結到assets/audio-review，不再讀現行src/audio冒認舊版；舊17封存音訊未變。舊生成器有防護，正式重建用tools/audio/build_release_palette.py、pack_audio.py、build.py。真機、主觀聽感與30分鐘疲勞仍未宣稱完成。

## 3D角色／Death／BGM候選（2026-10-28，香港）

`codex/3d-cast-death-audio` 基於main641c43d；按分工只tools/assets/docs。四位已有原生GLB，製作同場／近看真3D電台展示、raycast選角與旋轉、手機焦點展示及12張GLB白底正側背。assets/monsters/death-v1新增12個非破壞GLB，原binary／mesh／material／clip保留，追加73-key／1.2s Death；456個精確頂點姿態含巨型／插值時刻檢查、離線／WebGL fallback／teardown通過。現行deadT=.4會截掉動作，正式需renderer-private corpse queue，不延遲kill／獎勵／過關。

六首現行BGM全檔盤點，M02日間／M03夜景／M06首領保留；兩完整CC0候選After Midnight／Space Ranger、12段音量相近對照，M05建議精英不再強制切歌。Alan說某首「登登」不好聽但未知曲名，保留M01–M06與S01–S03對照，不宣稱找到或修好。實際播放／解碼通過不等於主觀聽感通過。入口docs/3d-cast-death-audio/README.md及preview.html；未接入src／未發佈，待原型owner回覆提交再驗。接續#117／#118待辦，不當成它們已完成。

2026-10-28後續更正：Alan要求四人同場擺姿勢、選中才短動作／亮起，取代手機近看。PR120同分支追加四個CastPose/CastSelect獨立GLB（原mesh/skin/九clip不變）、前後排合照與選中唯一光圈／招呼。用戶6.44秒錄音已比對到src/audio/rush.mp3（完整段.519，次位.197，兩子段對齊同一重複樂句），因此M05獨立精英曲是停用目標；錄音／原檔名不公開，只存匿名比對結果。仍待原型owner接入真遊戲，未發佈。
