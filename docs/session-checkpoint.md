> 入口原圖修復候選（2026-10-28，Asia/Hong_Kong）：延續 PR #113，分支 codex/hello-static-character-select 已整合 main c67529d。Alan 指定酸黃天線原直幅／橫幅作封面；找回生成原 PNG，無 screencap。一次取樣重做封面／Logo／序章，救回軟 alpha、人面、字標，boot 與 title 共用響應式 picture／CSS，移除靜止旋轉與多餘覆層。證據、原圖 SHA、限制及接線見 [entry-art-refresh](entry-art-refresh/README.md)。候選未合併／發佈。

> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0音訊整合發佈

2026-10-27，Asia/Taipei。Alan明確要求發佈，並說Claude首領曲／序章音效不一定跟，以整體效果為重。基於main96ec21e／v0.77.1，Claude最新d2aab10與main程式相同；PR104從審查轉成正式音訊整合。

實際54檔：日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser（CC0），工業underpass與精英rush重編32小節；46舊cue全部整音／實體層／短通知，另2金屬木箱命中。22場景明確選曲；原雙deck循環淡換、story單聲、長技能同家族配額。角色／故事／技能／地圖／存檔不改，怪物材質取同streetCreatureSpec owner。

素材8.35MB，上限9MB；完整源曲與逐檔CC0／原創／混合標記、raw/member/master/embed SHA齊。未採樣3參考影片、未付費。54資產／實際播放／22路由／loop-wrap／mute／mix／全repo回歸通過，見[整合](release-0.78.0/integration.md)、verification.json及audio-release-validation.json。線上部署／tag／附件完成證據以live-verification.json為準。

歷史審查52檔凍結到assets/audio-review，不再讀現行src/audio冒認舊版；舊17封存音訊未變。舊生成器有防護，正式重建用tools/audio/build_release_palette.py、pack_audio.py、build.py。真機、主觀聽感與30分鐘疲勞仍未宣稱完成。


## 最新角色與世界觀（2026-10-28，Asia/Taipei）

使用者已確認採用破壞者（男／力量戰士）、駭客（女／清冷法術）、遊擊手（女／敏捷遊俠）、機偶師（男／召喚）。唯一入口為characters-current.md，純文字；舊名、備選角色設定及反覆過程紀錄已清除。具體能力數值／人物故事／造型未設計完成，遊戲仍未接入。

世界氣質以SLUMLORDZ ~ SANDWICH為主：深層反叛、打破常規、懶散鬆弛、黑色幽默、自由與對比。四主角最新改為青少年，舊成人向設定已移除。影片原檔與來源manifest保存於assets/references/sandwich，25,383,546bytes及SHA已核對；48幀抽樣目視，未評音軌。舊創作基準及過時影片／圖集副本已清理，現行規範只看creative-direction與story。

遊戲支柱是隨機新攻擊模式、忙碌上班族掛機、離線經驗、流派研究、成就解鎖與耐玩，見game-design。先文字，不生圖／模型，可玩樣板暫停。現用模型、選角圖、內嵌資源與必要建置來源依先前確認暫留，待新角色完成後替換；不能當新設計參考。

任務分支codex/character-turnaround-preview，基於main641c43d。本輪僅整理文件與過時參考，未改src/index/dist、現用角色資產或玩家資料，未合併／發佈。待辦沿用backlog最新角色重製區。未清洗Git歷史或修改其他分支。

2026-10-28接續成果：使用者同意完善人物核心與世界規則。characters-current已新增四人的工作／私人慾望／底線／缺點、四種鬆弛感與洗衣店門禁委託四版語氣稿；story補六項改裝規則（來源、模式、取捨、駭客介入、實體機偶、知識流通），以有限媒介及容量維持構築取捨，不新增充電／維修打卡。內容是第一版新提案，尚非定稿或已驗證辨識率；未生圖、建模或改遊戲，可玩樣板暫停。下一步人物輪廓／服裝／配色文字brief。

2026-10-28接續角色外形文字：已在characters-current加入四人輪廓、服裝／髮型／膚色／配色／基本裝置及待機姿態brief。破壞者方穩砂土黃／炭灰、駭客長直灰白／灰紫、遊擊手輕巧斜線海藍／卡其、機偶師圓鬆磚粉／深褐；色彩與細節均提案。人物／武器／裝置／機偶分層，基本機偶另設不與故事同伴混用。CHAR-REMAKE-02文字工作完成，未視覺驗證、未生圖／建模／改遊戲，可玩樣板暫停。

2026-10-28年齡變更：使用者要求四角色為青少年，像SANDWICH及Ice Cream。已同步角色／故事／創作基準／AGENTS／game-design與來源manifest，移除成人向及性相關設定，職業／性別保持；比例、履歷與私人目標調整為年少幫工、自學、跑線、摸索自由的方向。Ice Cream按重新指定從Git恢復原bytes，SHA f30128b9…與10,870,110bytes核對，10幀視覺抽樣，未評音軌或推斷片中人物年齡。未恢復舊人設／電台主線，未生圖或改遊戲。

2026-10-28題材澄清與接續：使用者說先前成人意指作品可有少量暴力／性／反叛，未取消青少年主角。已分開年齡與題材尺度，性相關只限成年配角／背景，主角不作性化設計。接續在characters-current補四人正側背文字規格與年少動作（會修正握法、觀察未預料結果、試路、對機偶產生玩心），避免寫成熟職場老手。仍只做文字，未生圖／建模／改遊戲。
