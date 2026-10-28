# 3D選角、怪物倒下與配樂修訂

2026-10-28，Asia/Hong_Kong。基底main `641c43d`；按 `docs/codex-sync-notes.md` 只改tools/assets/docs，**實際3D互動頁、12個Death GLB候選及音樂候選已製作；正式遊戲尚待原型owner接入，未合併／發佈**。本批接續#117／#118，不把它們的待接入內容當已完成。

入口：[離線互動頁](preview.html)。三個頁籤是「3D選角」「怪物倒下」「配樂比較」。不讀寫角色或設定存檔；建立按鍵只檢查表單，不假裝交易／存檔成功。

## 四位角色：真3D，不是圖片轉動

四位已有使用者Character.zip衍生的獨立GLB，這次沿用現行unlit頂點色版本，不另生成或重畫角色、不改四肢比例：

| 存檔職業鍵 | 模型 | 展示 |
| --- | --- | --- |
| street／戰士 | AKI | 藍髮耳機角色 |
| frost／樂師 | MILO | 白髮藍外套角色 |
| beep／獵手 | PING | 紫髮角色 |
| volt／寵機師 | NULL | 棕髮眼鏡角色 |

每位有原生16骨骼及idle/walk/run等既有動畫。畫面是真WebGL場景、SkinnedMesh及AnimationMixer，可用實際mesh raycast點選、職業按鍵／方向鍵選擇、拖動／按鍵旋轉、滾輪有限縮放。所有尺寸都保留四人，不提供逐人隱藏的近看模式。角色站在電台展示台，收音機、喇叭、天線及底台均為matte純色幾何，沒有照片高亮層、臉部貼片或霓虹發光。

使用DESIGN.md的Cubic11、銀灰／藍紫窗口。桌面左模型／右職業與命名；手機保留完整四人合照、四職業短鍵及順讀表單。頂欄唯一返回：新增角色時「返回原角色」，首次建立則「返回故事」。職業定位、被動、名稱規則保留，裝飾角色口號不加入。實際命名／返回仍由正式INTRO與profile流程接入。

資料：`assets/characters/cast-preview/manifest.json`列候選GLB路徑／SHA；新增 `models/aki|milo|ping|null.glb` 四個獨立姿勢候選，保留原geometry／skin／materials／九個動畫，追加 `CastPose`（定格合照）及 `CastSelect`（0.85秒招呼）。原模型沒有被覆蓋。12張 `aki|milo|ping|null-front|side|back.png` 是從實際GLB離屏渲染的白底正側背視圖，不是AI生成、也不是新製作模型的證明。當前無需新三視圖來猜測已存在的3D形體。

### 正式接入原則

- 沿用 `INTRO.selected/name`、`introChoose`、`introCareerName`、`introBegin`、`introCareerCancel/profileCancelNew`，不採用樣板的本地state作新遊戲狀態。
- 沿用既有PV／characterAsset／buildY2KHero／characterPreviewAnimate／characterDispose與g1材質；擴充一個四人cast變體。**不要把樣板的第二套GLB reader移到正式遊戲**。
- 原生builder現在讀G.char／G.equip：擴充顯式preview characterId及preview gear參數，不能為建四人而輪流改G.char或玩家裝備。所有預覽資料都應獨立於角色存檔，避免再次出現返回舊角色狀態損壞。
- 同一renderer、單一可視場景、resize observer及有限30fps展示；尊重prefers-reduced-motion，初始暫停，只有使用者主動開動作才播放。拖動不觸發誤選、垂直手機捲動可用、旋轉有按鍵替代。
- WebGL無法建立時，退到已批准合照及可用職業／名字控制；不能卡住建立角色。關閉時停止RAF／mixer、移除observer、釋放本展示擁有的geometry/material/skin／renderer，保留共用asset cache。樣板有顯式dispose供驗證，不能誤釋放主戰場資源。
- 實際創立／取消後要驗原角色的生命、配色、裝備、存檔、焦點／背景active類別與renderer是否恢復；樣板不代表這些正式流程已驗。

## 十二款怪物：可交付的Death GLB包

`assets/monsters/death-v1/` 包含M01–M08、B01–B04全部12個GLB與manifest。原canonical檔案及catalog指向未修改。每個候選保留原始mesh、material、原有node、動畫與原binary payload，新增一個父層DeathPivot及1.2秒 `Death` clip；73個採樣鍵，旋轉與接地補償分開。

不是所有怪物套同一翻轉：低身拖板側翻、滑翔盤失速傾落、箱蟹／工頭前倒、速遞車向一側壓下、懸浮燈體落地、重型機體較慢失衡。落地約0.48–0.88秒，再停留；0.94–1.2秒淡出由instance renderer處理。樣板可關閉淡出逐格看完整倒下，亦可切巨型尺度。這次沒有新增血跡、傷害、掉落或AI數值。

### 不能只把Death clip塞進現有0.4秒生命週期

目前 `streetCreatureLook` 的dead分支只在0.4秒內傾斜約0.7rad及淡出；`03-combat.js` 正常更新及玩家死亡分支都會在deadT≥0.4時移除怪物，塔樓清怪另有deadT=.4。只換模型會被截掉動作。

建議原型owner新增**renderer-private且有上限的屍體展示佇列**，不改kill/reward/collision時序：

1. 原生killMon仍立即設定dead、發獎勵／血跡與清目標。第一次渲染到dead時用per-instance記號僅轉移一次，保存世界位置、朝向、體型、地面高度及當時姿態。
2. 從R3.ent的alive擁有權轉到屍體展示，避免正常remove路徑同時dispose。實例材質已clone，不能動到其他活怪的透明度；保留shared geometry的既有生命週期。
3. 停止移動／攻擊mixing，使用既有GLTF mixer播放Death。必要時先保存子控制器姿態，停止舊action後恢復，再播放新增的父層clip，避免回rest pose跳動。懸浮高度從實際instance捕獲，在約0.2秒內落地；不能把同款模型固定當成懸浮或Boss。
4. 動作時間從renderer私有startTime求出，與G.time的暫停／離線策略一致。地面採死亡點實際terrainHeight，按原scale（含精英／巨型）接地，不能把giant硬縮回普通。
5. 落地後留一拍，再在0.94–1.2秒淡出。首領名稱／血條依戰鬥死活立即清理；**不要等屍體消失才完成關卡／出掉落**。
6. 普通屍體上限12、首領2，超量提早收最舊項；移圖／重開／角色切換清理，mixer／獨立material只dispose一次。battle-fold或節省效果可跳過非必要屍體，不讓queue無限累積。

樣板是完整Death clip而非生物ragdoll；沒有物理碎裂／額外拋飛。先採上面有限展示方案，避免引入物理引擎或改玩法。集成後須驗一般擊殺、DOT、連鎖／AOE同時擊殺、玩家死亡、塔樓清場、city stage切換與新角色返回；這些流程尚未在正式遊戲驗收。

## 配樂：錄音已比對到M05精英rush曲

Alan先描述「有一首登登聲不好聽，不知是哪首」，隨後提供6.44秒錄音；已用完整段及前後子段，從現行曲庫比對到 `src/audio/rush.mp3`。完整段相似度0.519，次位0.197；前後子段分別對齊到rush重複樂句約18.248及18.256秒基準（差0.008秒）。因曲內重複，完整段也吻合約33.744秒的同一樂句。相似度不是概率，證據見recording-identification.json。錄音與原檔名不放入公開repo，只記錄比對結果。現行main音樂路由實際使用六個檔：radio/drift/haze/underpass/rush/boss；Claude最新分支與main內容相同，沒有另一套可讀的六章BGM檔。這次完整解碼六首、檢查時長／響度／峰值／端點，建立12段18–24秒且音量相近的原版／候選比較；另有S01拾取／S02升級／S03序章叮聲供辨識，沒有改掉這三個音效。

本次已辨識需停用的rush曲；正式遊戲尚待原型owner移除獨立精英切曲路由。兩首新音樂仍是選材／混音候選，不把解碼、比對或分析當新曲主觀聽感通過。

| 編號 | 位置 | 決定 |
| --- | --- | --- |
| M01 | 開始／選角 | 原Funky Menu Loop只有18.46秒，短音型重複很快。新候選After Midnight較長的柔和電子氛圍，減少開始頁短循環的疲勞。 |
| M02 | 日間 | 保留Wednesday Night [Funk Fusion]，保護既有街頭放克律動。 |
| M03 | 夜景 | 保留November Snow，延續夜景的放鬆氛圍。 |
| M04 | 工業／塔樓 | 原創合成工業循環列優先辨識；新候選Space Ranger，以低頻／中高頻輕EQ減輕過硬敲擊。 |
| M05 | 精英 | 錄音已對到這首，停用獨立rush短曲，繼續當前地區的BGM，避免看到一隻精英就跳曲。試聽用日間曲示範，正式不可把所有精英一律導向日間。 |
| M06 | 首領 | 暫保留Midnight Cruiser，較強律動留給首領戰，不無差別更換可能喜歡的歌。 |

三首標為保留的現行MP3沒有改動。兩個完整新候選在 `assets/audio-cast-review/music/`：radio（After Midnight 453.85秒）及underpass（Space Ranger 72秒），兩次量測響度校正至約−19 LUFS／峰值目標−3dB、保守EQ、96kbps stereo/32kHz。不是把SFX音高改成另一串「登登」。既有src/audio不改；不增加六首全部重作的壓縮損耗。

來源均CC0，原檔已存在同儲存庫的已推送素材提交 `e6cf9ea`；本次核對確切SHA與官方授權頁後重用。來源author、頁面hash、原檔commit/path、處理參數、完整候選與片段SHA見music-audit.json及資產manifest。**原創underpass/rush的辨識片段保留Project-original標記，不將整包誤稱CC0。**未取樣Ice Cream、Into Moon或Lionclad的錄音。

### 接入音樂時

- 音樂route唯一owner仍是 `streetMusicTrack`／`audDesiredTrack`，載入／雙deck／mute／visibility仍沿用AUD。移除獨立elite→rush捷徑，讓既有地圖theme決定背景；真正Boss維持最高優先。
- 新radio／underpass可替換兩個對應資產，再以pack_audio生成；保留原檔於版本歷史與對照包。所有保留曲原bytes及來源不動。
- 繼續現有2.2秒loop-crossfade、取消token／世代及單一播放owner，不得疊新Audio循環。新完整曲的裸端點不等同完美loop；需驗實際deck接縫、切景／精英／Boss、reduced-effects與mute，而非只測播放器片段。
- 新兩首完整檔約6.1MiB，比現行radio＋underpass多約5MiB；音訊仍內嵌時會增加首次下載，要在打包後核對整包／手機負擔。若精簡大小，應從有依據的音樂小節剪輯再驗，不隨便截秒或再壓成破碎音色。
- M05已對到錄音，before片段改從原曲18.24秒開始，方便直接核對。保留M01–M06與S01–S03編號，不把其他新曲候選當Alan已選中或主觀驗收。

## 檢查與重建

本機從repo以8850提供HTTP；不使用真玩家存檔。

- `python3 tools/cast-lab/build_death_assets.py`
- `python3 tools/cast-lab/validate_assets.py`：原payload／mesh／material／node／舊clip逐一不變，Death鍵與unit quaternion有限。
- `node tools/cast-lab/capture_views.cjs`：4個GLB各正側背，16骨／原生clips。
- `python3 tools/cast-lab/build_music_review.py`：六首完整檔量測、兩首CC0候選、12片段，重建需讀取已fetch的固定素材commit及官方頁；不改src/audio。
- `python3 tools/cast-lab/build_preview.py`：嵌入原生GLB／字型／Three／片段，自包含預覽。
- `node tools/cast-lab/test_preview.cjs`：七尺寸、四人真mesh點選、鍵盤／旋轉／名字保留、驗證焦點、無存檔寫入、456個精確變換頂點落地姿態（12款×普通／巨型×19時間，含非keyframe時間）、hold／fade、離線、WebGL失敗fallback、明確teardown。
- `node tools/cast-lab/test_audio.cjs`：六組A/B＋三音效，瀏覽器解碼／時長／一次一首／不自動播放／手機排版；不代表主觀聽感通過。

Three原生場景本次四人定格約56,732 triangles／28 draw calls是本樣板一次渲染的計數，不是手機FPS或獨立硬體效能驗收。實際瀏覽器為Chromium/SwiftShader；iPad Safari、真機長測及正式遊戲整合待驗。現有`game-dev` CLI未安裝；本次未使用其provider／GPU驗證命令，也沒有安裝或聲稱該CLI關卡通過。使用現有專案GLB、Python位元組／幾何處理及Three.js實際離屏渲染製作此候選。

驗證JSON、manifest及圖片在本目錄／素材目錄。QA關卡仍由QA owner處理，本包不替代其結果；沒有新增tag、Release或更新正式／preview遊戲站。

## 最新明確方向：四人同畫面擺姿勢，選中才回應

Alan補充必須像先前合照，四人一起擺姿勢、選中者做短動作或亮起效果。此要求取代最初手機近看／四人站成直線的試稿。現在AKI左右支撐姿勢、MILO後排抬手、PING側站、NULL前排蹲身；四張臉保留可見，其他人不因選中而消失、移位或換成圖片。選中者有獨立0.85秒手部／頭部招呼與青色光圈、金色小閃光；事件結束回原合照姿勢。減少動態時仍保持四人和靜態選中標記。

四個新GLB在assets/characters/cast-preview/models，動畫名稱CastPose／CastSelect；`capture_cast_poses.cjs`實際取骨骼關鍵格，`build_cast_pose_assets.py`附加原模型，`test_cast_assets.cjs`驗16骨、接地、選中動作及回定格。正式owner應讓四個原生actor播放CastPose，僅選中者crossfade到CastSelect再返回；不要四人同時播放同一招呼、不要改G.char輪流建模。sample的單幀姿勢函式只是同一動作的展示／烘焙來源。

新增檢查包括手機及桌面四位face mesh點選、旋轉後即點選、骨架變換後重新計算raycast bounds、選中者唯一光圈、所有尺寸四人常駐。canvas固定在容器內，避免反覆resize把drawingbuffer高度反饋到layout。
