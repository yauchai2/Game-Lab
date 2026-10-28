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

2026-10-28（Asia/Hong_Kong）文字設定完成：使用者要求把未設定的做埋。已將characters-current重整成單一設計基準，合併累積重複段落；補定破壞者17男174cm／駭客17女166cm／遊擊手16女162cm／機偶師16男168cm、約5.5頭身起稿、每人服裝／膚髮眼色碼、玩家命名而非另加固定本名、起始裝置與機偶尺寸、各一自動職業技／被動及三條成長方向、語氣／動作／關係／主線接點和三視圖交付。新細節是本輪完成的可修訂設計決定，不冒稱使用者逐項另定或已實作；倍率／冷卻等數值交後續玩法資料與平衡驗收。當前只完成文字，未生圖／建模／配音／改遊戲，可玩樣板暫停。下一步僅剩製作與實際驗收，現用資源按確認留至替換。
