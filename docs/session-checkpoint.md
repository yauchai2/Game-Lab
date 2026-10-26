# Game Lab 最新接續紀錄

**本批場景／故事候選：** 已merge main d06be7b／v0.65，保留Claude裝備、手機、掉落及血跡40處／90秒。新增street-neighborhoods.js：十二地景生活工作點，沿terrainBuild放置／碰撞／BFS，120種子中118有位置、全區連通，原版／訓練／塔樓不加。六章contact/request/lead及結尾串錯送試音排程，失物歸還主人；沿同一ch與六深度，不建NPC任務state。directJournal實際手機、六次主線kill／save／地圖離線邊界、24actor、血跡、site0.65／audio及gameplay回歸通過。docs/neighborhood-scenes為入口，音訊及此批仍PR88候選未發佈；下一步處理review及真機／最終佩戴／聽感邊界。

**最新主線：** 已fetch並merge main d06be7b（Claude PR86／v0.65.0，含bf72065裝備及怪物輪廓和其手機修正）；音訊6febfc4仍僅候選。舊「正式0.64／裝備未合併」為歷史狀態，以下依此更新判讀。場景敘事收尾在同PR88接續。

**最新音訊加插：** Alan明確要求所有音樂／音效按更新風格優化。同PR88新增5段原創配樂＋33基礎cue（1.74MB）、兩deck crossfade、技能語意映射、聲音優先權／duck、靜音／隱藏戰場／offline與visibility邊界。38音檔／WAV hash、LUFS／peak／RMS、真實AudioContext播放與壓力mix、試聽頁41controls／390px、site／gameplay通過。舊17CC0原件與license在assets/audio-legacy；新為Project-original，未採樣影片。docs/audio-street/README.md與dist/street-audio-review.html可接續；未合併發佈，未冒稱聽感及真機驗收。

**最新接續：** 同PR88追加一般裝備共用owner（七部位×四階，112配色fallback）及十二種敵人硬件輪廓模組。不是新造十二獨立GLB。角色／背包／掉落一致，胸甲下移、手套鞋尺寸校正；34HUD／尺寸血跡／stable-data及gameplay通過，分檔網站、四缺件複驗。docs/street-refinement/README.md有證據和界線；未合併發佈，Claude b28dc60列表布局未動。剩餘場景敘事／聲音／真機沿FINISH-04至06。

**後續精修候選：** codex/street-equipment-finish，main a428ceb為base。四件缺件已新製原創GLB／Blend並接equipmentModel，972tri、零貼圖，36clip／兩風格／GPU失敗圖／10gameplay通過。資料、掛點、縮圖及重建見docs/equipment-completion/README.md；未合併發佈，正式站仍0.64。Claude b28dc60頭像列表修正留其分支，已同步。其餘精修沿FINISH-02至06，不稱全專案完成。

**v0.64.0已正式發佈（2026-10-26，Asia/Hong_Kong）。** Alan本輪授權release；PR84已合併，來源／tag為2f7c889，Pages為076180d。正式manifest、入口及21腳本SHA-256、Release附件digest／大小均吻合，直接正式站390px Chromium啟動通過。Release與證據見[整合紀錄](release-0.64.0/integration.md)。

包含完整街頭風格、12精怪／4角色／16裝備衍生、尺寸血跡、移除笑臉與收音機／搬運箱精修。Claude最新7be9377已整合（僅文件），其精華系統已撤回，不在此版。所有分支／舊tag保留。下列為較早候選過程紀錄，未發佈字樣不再代表目前狀態。


- **2026-10-26，Asia/Taipei，全遊戲0.64候選：** Alan明確要求依Ice Cream後風格做完全部需要更新，已在獨立codex/ice-cream-style-complete實作。main最新fd4ed11／0.62，已納入Claude六章／同伴／章節Boss標記，沿唯一storyFlags.ch，不建四章平行狀態。
- **實作：** 十二款精怪（新製十款＋M01／M04）共8128面，22type＋Boss原生映射；四角色與16裝備無貼圖unlit純色面，原件、位置／skin／九clips／triangle order精確保留；21地區色階、場景unlit、幾何招牌、移除點紋／地面斑紋、UI頭像縮圖、十二地方留言／職業日常、音樂情境選曲。職業／四肢／玩法數值／SAVE_KEY不改。新資源packed由初版25MB降至約4.5MB（二十衍生GLB約3.15MB）。
- **驗證：** docs/style-complete/README.md為入口；十二GLB Blender重匯入、20衍生精確資料比對、4×9clips／16裝備／22types／4Boss／A-B／單隻fade／elite/status／320390通過；24實體街區及六次原生主線kill／save／offline-map邊界通過。10既有gameplay與17音源驗證通過。兩個既有stale VM測試於乾淨68934eb相同失敗，已記錄。
- **產物：** dist/idle-hero.html已建；dist/street-style-preview.html僅本機生成、page-lifetime隔離存檔、不入git。未publish／未merge main／未Release；下一步完整PR供Claude review、吸收新重疊提交。

## 其他接續入口

- 正式部署與來源／發佈檢查：docs/deployment.md。主線仍以遠端fresh fetch為準，不用歷史版本文字推斷已發佈。
- G1／M04之前交付：codex/ice-cream-visual-preview／5cb5ec3；本批已把必要原圖／影片／模型帶入新分支。
- 共用待辦只有docs/backlog.md；其餘較早記錄在git歷史及各交付文件，不複製整段聊天。

- **版本協作：** fresh fetch見Claude6fcaef6正在做0.63精華／主題詞綴，未納入本風格PR。風格候選改編0.64，base已合併main fd4ed11／0.62；避免覆寫新玩法，等其落main後同步base。

- **已交付PR84：** https://github.com/yauchai2/Game-Lab/pull/84，已推送並附到本聊天；Claude同步見PR80留言6411642131／PR84留言6411642696。本機site分檔boot亦通過。最新main仍fd4ed11；未合併0.63精華分支、未發佈。

- **PR84自動review修正：** 新Boss高27但舊HUD偏移140*CK，已改用轉換後mesh bounds定位HP／護盾，包含chapter ornaments／elite／hover／lunge／fall。34組真實overlay rect位置對照通過，舊模式fallback保留；證據docs/style-complete/healthbar-validation.json。

- **2026-10-26，Asia/Hong_Kong，血跡／臉最新修訂：** Alan要求巨型血跡隨體型，並特別澄清不要貼上去的卡通笑臉。已真正移除cardboardFace Canvas與Plane，不換新臉貼圖；legacy10類＋同伴用BoxGeometry燈槽，M06/M07/B04重匯出冷峻指示窗。deathStain按實際body span縮放全blobs，街區血跡提高至道路／斑馬線之上（修掉被路面蓋住）。1x2x4x比例、飛濺、11builder無map／fade、34HUD、12GLB重匯入、10gameplay過。tools/style/blood-face-main.patch可獨立套main，亦已在Claude6fcaef6套用／Three.js執行驗證。尚未發佈。

- **截圖澄清：** Alan指黃色天線同伴及紙箱怪的兩眼／彎笑嘴／腮紅；不要用幾何重做同樣笑哈哈表情。main仍有cardboardFace，PR84候選已移除，尚未合併。

- **笑臉移除後精修：** 同伴改切面收音機／側旋鈕／偏置天線、紙箱怪改偏置掃描器／摺縫／翹蓋。docs/style-complete/device-refinement.png為原生渲染，254／700tri且零maps，blood-face suite再驗通過。standalone patch同步更新且main apply-check過，預覽已重建；未合併發佈。
