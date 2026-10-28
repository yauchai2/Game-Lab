> 入口原圖修復候選（2026-10-28，Asia/Hong_Kong）：延續 PR #113，分支 codex/hello-static-character-select 已整合 main c67529d。Alan 指定酸黃天線原直幅／橫幅作封面；找回生成原 PNG，無 screencap。一次取樣重做封面／Logo／序章，救回軟 alpha、人面、字標，boot 與 title 共用響應式 picture／CSS，移除靜止旋轉與多餘覆層。證據、原圖 SHA、限制及接線見 [entry-art-refresh](entry-art-refresh/README.md)。候選未合併／發佈。

> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0音訊整合發佈

2026-10-27，Asia/Taipei。Alan明確要求發佈，並說Claude首領曲／序章音效不一定跟，以整體效果為重。基於main96ec21e／v0.77.1，Claude最新d2aab10與main程式相同；PR104從審查轉成正式音訊整合。

實際54檔：日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser（CC0），工業underpass與精英rush重編32小節；46舊cue全部整音／實體層／短通知，另2金屬木箱命中。22場景明確選曲；原雙deck循環淡換、story單聲、長技能同家族配額。角色／故事／技能／地圖／存檔不改，怪物材質取同streetCreatureSpec owner。

素材8.35MB，上限9MB；完整源曲與逐檔CC0／原創／混合標記、raw/member/master/embed SHA齊。未採樣3參考影片、未付費。54資產／實際播放／22路由／loop-wrap／mute／mix／全repo回歸通過，見[整合](release-0.78.0/integration.md)、verification.json及audio-release-validation.json。線上部署／tag／附件完成證據以live-verification.json為準。

歷史審查52檔凍結到assets/audio-review，不再讀現行src/audio冒認舊版；舊17封存音訊未變。舊生成器有防護，正式重建用tools/audio/build_release_palette.py、pack_audio.py、build.py。真機、主觀聽感與30分鐘疲勞仍未宣稱完成。


## 最新角色重製入口（2026-10-28，Asia/Taipei）

使用者接受角色重製規劃，要求清除各處舊角色設定。唯一設計入口為[最新文字方案](characters-current.md)，無圖片或舊外形摘要。已清理獨立舊角色文件／圖檔、混合文件中的舊名與造型規則、過時選角說明及舊美術文檔。最新確認：現用模型、選角圖、內嵌副本與必要建置來源暫留，待新角色完成後替換，不當作新設計參考。未清洗Git歷史、未改其他分支／發佈站。

分支codex/character-turnaround-preview。本輪補刪9個非執行文件／圖檔；955個assets/src/dist檔案SHA-256未變；檢查最新文件純文字、連結修復與diff空白。下一步沿用backlog的CHAR-REMAKE輪廓探索→樣板→三視圖→模型動作→原型接入；未生成新角色素材或改遊戲行為。

2026-10-28重製再優化：已更新同一份characters-current.md，核對03-combat共用普攻與characters-data自動循環。新方案明確分開造型表現及待測能力調整，特別關注PING無小怪首領戰的擊殺觸發、MILO轉場斷拍、AKI護盾覆蓋及NULL有效修復。補三場景同投資比較、昇華裝置差異與四個具體敘事行動；下一步四人各兩種輪廓及AKI／PING動作對照，CHAR-REMAKE-05記測試。只完成來源核對與規劃，未新生圖／建模／修改遊戲或宣稱失衡。

2026-10-28使用者重申遊戲支柱：隨機新攻擊模式、忙碌上班族掛機、POE2／D2構築與VS自動清怪、離線經驗、成就解鎖、紓壓且有研究深度／耐玩。已更新game-design及角色方案，強調跨武器流派、有效選擇、短回訪與保留既有解鎖；不只優化造型或職業固定循環。美術ZIP已保存assets/references/art-reference-2026-10-28.zip，37張靜態總覽已看，GIF僅首幀，來源hash與取捨見creative-direction；附件文字不作指令。未新增遊戲機制、未生圖／建模或改現用素材；後續沿用CORE-28與CHAR-REMAKE待辦。

2026-10-28大改授權：使用者表示可以隨時大改。最新game-design改為「永久角色／構築＋分段自動遠征＋隨機新發現」，武器／模式／配件／角色明確分工，模式收藏與裝備品質追求分開為候選；不增加離線必答選項、不清空既有投入。先做1角色／CHAIN+BEAM／5現有模式／3構築及小怪／無小怪首領工具樣板，再推完整角色建模；現用角色暫留規則不變。已核對模式定義，只有提案、未製作可玩樣板／改src，待辦REWORK-01至04。

2026-10-28最新安排：使用者「暫時唔使做可玩樣板」。REWORK-02與樣板工具／接入暫停；先做角色設定、輪廓、靜態風格預覽及三視圖，不再把樣板列作美術前置。已同步game-design、characters-current與backlog，未製作或執行樣板。

2026-10-28最新指示「先文字描述」：已將characters-current第2節更新為四人完整文字brief，提出AKI方穩／磚橘修理員、MILO長鬆／奶白墨綠聲音收集者、PING窄斜／鼠尾草綠速遞員、NULL圓收／霧藍改裝者；外形與性格均為新提案，裝置不鎖武器／流派。未生成任何新圖、三視圖或模型；可玩樣板維持暫停。沿用唯一純文字入口，未引用舊角色圖片。
