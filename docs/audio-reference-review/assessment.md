# 52項逐檔設計審查

所有結論均為來源／用途／數值與設計提案；listeningStatus=not-certified，不表示已獲主觀聽感批准。正式來源3add8a6，Claude待發8ee3a2e。

| 素材 | 來源 | 優先級 | 用途 | 提案 | 具體處理 |
|---|---|---|---|---|---|
|drift.mp3|main 3add8a6|P0|日間街區|重編優先|以短促鋼琴／FM琶音、切分低音與帶停頓的碎拍建立hook；保留留白，增加段落而非反覆16小節。|
|haze.mp3|main 3add8a6|P0|夜景／探索|重編／比較|往Dream Logic的寧靜質感方向試做：寬柔pad、清楚低音、較少裝飾；可用November Snow比較氣氛，不能把它當等同參考曲。|
|underpass.mp3|main 3add8a6|P1|工業／塔樓|重編優先|保留乾燥機械脈動，加入細碎金屬／塑膠節奏，與日間共用音色但減少主旋律。|
|rush.mp3|main 3add8a6|P1|精英／短壓力|重定用途|Claude把它分給精英；保留短壓力層，淡出後回原曲。避免每遇精英便整首重播。|
|radio.mp3|main 3add8a6|P0|開始頁／序章|重編優先|做可辨認的開機動機，連接夢幻質地與日間節奏；序章以一條音樂時間線配少量環境聲，不讓每頁重新起曲。|
|sf_hit.mp3|main 3add8a6|P0|普通命中|替換試做|加入短、乾的實體碰撞；比較Kenney generic／metal／wood，按怪物材質分組，避免每擊都是電子嗶聲。|
|sf_crit.mp3|main 3add8a6|P0|會心|分層精修|共用命中底層＋一次較重低中頻與短亮點；辨識度來自包絡／重量，非單純升高音量。|
|sf_kill.mp3|main 3add8a6|P1|怪物倒下|精修|用機殼失電／短鬆脫聲；取消勝利笑鬧感，與玩家倒下分開。|
|sf_hurt.mp3|main 3add8a6|P0|玩家受傷|保留角色／精修|保留清楚的危險訊號，短duck配樂；被護盾全吸收不播放受傷聲。|
|sf_die.mp3|main 3add8a6|P1|玩家倒下|精修|短低音斷電與尾音，不用喜劇滑音；不能蓋過死亡畫面或下一次操作。|
|sf_fire.mp3|main 3add8a6|P1|火焰施放|分層精修|點火click＋溫暖噪音火團；縮短高頻拖尾，命中可加材質聲。|
|sf_boom.mp3|main 3add8a6|P0|多技能共用爆發|拆分用途|目前多個主動／專屬技能共用；拆成小爆發、重擊、範圍爆炸三種包絡，先減少相同聲重複堆疊。|
|sf_frost.mp3|main 3add8a6|P1|冰霜|精修|短玻璃／晶體質感＋柔冷尾音，和新crystal共享家族但聲長不同。|
|sf_chain.mp3|main 3add8a6|P1|連鎖電擊|精修|短電弧、少量節奏變化；連鎖多段共用一個聲音配額，不逐敵重播。|
|sf_meteor.mp3|main 3add8a6|P1|落擊／巨刃共用|拆分／精修|低頻落擊與金屬揮砍分離，巨刃不要只靠降速meteor辨識。|
|sf_pick.mp3|main 3add8a6|P1|裝備入袋|保留／比較|短硬件接合click；維持金錢／碎片不連續叮響的規則。|
|sf_rare.mp3|main 3add8a6|P0|稀有掉落|保留動機／精修|建立獨有短音型，與升級及序章chime不同；在群戰仍可辨識。|
|sf_lvl.mp3|main 3add8a6|P1|升級|保留動機／精修|同音色家族的上行音型，低密度；稀有掉落同時發生時排隊或讓位。|
|sf_card.mp3|main 3add8a6|P1|選擇／裝備|替換比較|實體卡片／卡扣聲＋極短電子確認，試聽interface confirmation。|
|sf_snap.mp3|main 3add8a6|P1|接線／吸附|保留／比較|乾、短、低疲勞的吸附聲；與選擇確認分層，不加長旋律。|
|sf_ph_open.mp3|main 3add8a6|P0|裝置開啟|替換比較|翻蓋／塑膠殼機械開合＋柔和短數位層；先比較interface open，高頻比例只作篩選指標。|
|sf_ph_on.mp3|main 3add8a6|P1|裝置開機|重編|自家短啟動動機，不借用真實品牌開機音；與radio和聲呼應。|
|sf_ph_key.mp3|main 3add8a6|P0|高頻按鍵|保留／比較|維持約45ms的短聲長，柔化起音；高密度接線不造成連續刺耳脈衝。|
|sf_ph_tab.mp3|main 3add8a6|P1|切頁|替換比較|柔短click，與確認聲不同；不每次切頁都奏旋律。|
|sf_ph_zoom.mp3|main 3add8a6|P2|放大|精修|短向上空氣／數位滑動，避免誇張卡通滑音。|
|sf_ph_zoomout.mp3|main 3add8a6|P2|縮小|精修|與放大共用材質但反向包絡；縮放拖曳需限頻。|
|sf_ph_off.mp3|main 3add8a6|P1|關閉裝置|重編|短機殼收合＋低音尾點；取消多餘高頻通知感。|
|sf_stair.mp3|main 3add8a6|P1|塔樓階層|精修|短啟動／通行提示，進出主曲平滑；不能每層都當勝利fanfares。|
|sf_season.mp3|main 3add8a6|P2|賽季事件|精修|沿新故事的硬件／訊號語言，僅在真正事件時播放。|
|sf_pulse.mp3|main 3add8a6|P1|脈衝|精修|圓潤低中頻壓力波，起音有重量、尾音短。|
|sf_magnet.mp3|main 3add8a6|P1|磁力／gravity共用|精修|保留吸附／張力辨識，gravity另加低音體積，不只改速。|
|sf_spam.mp3|main 3add8a6|P1|郵件／訊息技能|精修|短數位爆點與卡片flutter，避免長機關槍式通知音。|
|sf_flicker.mp3|main 3add8a6|P1|閃擊／disc共用|精修|揮切與閃光短點分層；多次閃擊以句子播放，限制高頻積累。|
|sf_beam.mp3|main 3add8a6|P1|beam／rail共用|精修|短充能起音＋穩定中頻主體，rail給更硬的瞬態；不只依靠播放速率。|
|sf_arrows.mp3|main 3add8a6|P0|箭雨|高頻檢查／精修|目前量測高頻比例偏高；先做群戰疊加試聽，縮短連射密度並限制每次箭雨聲音次數。|
|sf_summon.mp3|main 3add8a6|P1|swarm／guardian|精修|裝置部署＋電源接合，大小體積分層；保持召喚物攻擊聲配額。|
|sf_rift.mp3|main 3add8a6|P1|裂隙|精修|短訊號折斷／空間尾音，回到硬件音色而非恐怖長尖叫。|
|sf_resonance.mp3|main 3add8a6|P1|resonance／overture／relay|拆分／精修|三種用途共用同素材；保留同音色但以節奏／包絡區分，避免全靠變速。|
|sf_st_fan.mp3|Claude 8ee3a2e candidate|P1|序章風扇|保留候選／精修|Claude新素材；低聲機械環境點綴，不能和戰鬥tornado同時佔滿低頻。|
|sf_st_horn.mp3|Claude 8ee3a2e candidate|P1|序章船笛|替換可選／精修|保留遠距／空間感；真實錄音須核對授權，避免突然高音量。|
|sf_st_static.mp3|Claude 8ee3a2e candidate|P0|電台雜訊|精修|短、可控的掃頻／接通聲；不把持續白噪當氛圍床，讓故事訊號有呼吸。|
|sf_st_coin.mp3|Claude 8ee3a2e candidate|P1|序章硬幣|保留候選／精修|單次金屬小碰撞，與戰利品入袋區分；不成為戰鬥每筆金錢提示。|
|sf_st_skid.mp3|Claude 8ee3a2e candidate|P1|序章煞車|替換可選／精修|短橡膠摩擦／滾動停止，削減長高頻尖叫；仍需對照畫面時點。|
|sf_st_ding.mp3|Claude 8ee3a2e candidate|P1|序章提示|精修|一個簡短硬件提示音，不與rare／level共享旋律。|
|sf_st_chime.mp3|Claude 8ee3a2e candidate|P1|序章小鈴|精修|減少糖果感與長尾，保留乾淨明亮質感。|
|sf_st_jingle.mp3|Claude 8ee3a2e candidate|P0|序章段落|重編|2秒候選需跟畫面節奏核對；改作自家品牌短動機，每頁不重複灑滿jingle。|
|sf_st_crystal.mp3|Claude 8ee3a2e candidate|P1|冰櫃爆晶|保留候選／精修|Claude新增；與frost一致，讓碎晶瞬態突出，1.4秒內限制重疊。|
|sf_st_tornado.mp3|Claude 8ee3a2e candidate|P0|超強電風扇|保留候選／精修|2.4秒持續聲；同家族只容一個長聲，尾段可淡出，避免連施多層轟鳴。|
|sf_st_thunder.mp3|Claude 8ee3a2e candidate|P0|落雷警報|保留候選／精修|多段落雷以一次事件排程；低頻衝擊與警告短點分層，不能七段全部同峰值。|
|sf_st_roll.mp3|Claude 8ee3a2e candidate|P1|翻滾|保留候選／精修|短衣料／地面摩擦，按材質可變但不每幀觸發。|
|sf_st_swing.mp3|Claude 8ee3a2e candidate|P1|動作揮斬|保留候選／精修|短空氣切聲＋材質命中；未命中不播放完整impact。|
|boss.mp3|Claude 8ee3a2e candidate|P0|首領|比較／精修|尊重Claude新增140BPM曲作基底候選；加強鼓組／低音與停頓，保留同一音色家族，不改成管弦史詩或泛用重金屬。|
