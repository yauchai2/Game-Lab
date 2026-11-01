# QA 報告：0.80.0（c97cab0）

- 日期：2026-11-01 15:01 UTC
- 模式：完整；比對基準：v0.78.0
- **結論：通過**（通過 61／警告 12／失敗 0）

## 警告（請作者確認是否有意）

- tools/test_characters.cjs：已知失敗：const mesh=new T3.SkinnedMesh(characterEquipmentGeometry(asset,id,preview?.equip||G.equip),g1HeroMaterial(id,asset.material));mesh.name=id+'_skin';mesh.frustumCulled=false; | ReferenceError: g1He
- tools/test_combat_experience.cjs：已知失敗：let checks=0;function ok(value,msg){checks++;if(!value)throw Error(msg)} | Error: catalog complete
- tools/test_equipment_slots.cjs：已知失敗：const check=(ok,text)=>{if(!ok)throw Error(text)}; | Error: cosmetics remain three
- tools/test_field_update.cjs：已知失敗：const mesh=new T3.SkinnedMesh(characterEquipmentGeometry(asset,id,preview?.equip||G.equip),g1HeroMaterial(id,asset.material));mesh.name=id+'_skin';mesh.frustumCulled=false; | ReferenceError: g1He
- tools/test_loot_world.cjs：已知失敗：let checks=0;function ok(value,message){checks++;if(!value)throw Error(message)} | Error: catalog expanded
- tools/test_progress_curve.cjs：已知失敗：diff: 'simple' | }
- tools/test_rift_experience.cjs：已知失敗：let count=0;function ok(v,m){count++;if(!v)throw Error(m)}G.offline=false;G.paused=false;G.lvl=40;G.depth=12;G.maxDepth=30;G.run=null;G.h.dead=0;G.mons=[];recalc();G.h.hp=G.st.life; | Error: aliv
- tools/test_terrain_mesh.cjs：已知失敗：const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647; | ReferenceError: document is not defin
- tools/test_tower_combat.cjs：已知失敗：let n=0;function ok(v,msg){n++;if(!v)throw Error(msg)}G.lvl=40;G.maxDepth=30;G.gold=1e6;G.chips=1e4;G.pass=[];G.legacyMode=false;G.run=null;G.h.dead=0;recalc();G.h.hp=G.st.life; | Error: 23 disti
- tools/test_update_032.cjs：已知失敗：addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')||e.target?.isContentEditable)return;const k=e.key.toLowerCase(); | Refer
- tools/test_ux_revision.cjs：已知失敗：diff: 'simple' | }
- 分頁內按鈕／標題沒有消失（4，改名或移動需確認）：craft:「升級稀有度 · 100 零件」、craft:「核心重構0 殘晶」、craft:「追加詞綴要先升級成稀有才能追加詞綴80 零件」、craft:「電路合成0 點」

## 各項明細

### 舊的邏輯測試（10 秒）

- ✅ tools/test_ascension_talents.cjs
- ⚠️ tools/test_characters.cjs
- ✅ tools/test_classes_circuits.cjs
- ⚠️ tools/test_combat_experience.cjs
- ✅ tools/test_direct_play_state.cjs
- ✅ tools/test_equipment_depth.js
- ✅ tools/test_equipment_fit.cjs
- ⚠️ tools/test_equipment_slots.cjs
- ✅ tools/test_expansion.js
- ⚠️ tools/test_field_update.cjs
- ✅ tools/test_gameplay.js
- ✅ tools/test_grid.js
- ⚠️ tools/test_loot_world.cjs
- ✅ tools/test_mechanics.js
- ✅ tools/test_offline_return.cjs
- ✅ tools/test_onboarding_focus.cjs
- ✅ tools/test_player_ailments.cjs
- ⚠️ tools/test_progress_curve.cjs
- ✅ tools/test_progression.js
- ✅ tools/test_readability_state.cjs
- ✅ tools/test_render_resolution.js
- ⚠️ tools/test_rift_experience.cjs
- ✅ tools/test_signal_season.cjs
- ✅ tools/test_signature_equipment.cjs
- ⚠️ tools/test_terrain_mesh.cjs
- ⚠️ tools/test_tower_combat.cjs
- ⚠️ tools/test_update_032.cjs
- ✅ tools/test_ux.js
- ⚠️ tools/test_ux_revision.cjs

### 內容清單比對（0 秒）

- ✅ 比對基準 v0.78.0：共 74 張資料表、1332 項
- ✅ 資料表沒有消失（0）
- ✅ 沒有項目被刪除（0）
- ✅ 既有項目數值／文字未改（0，改動需作者確認是否有意）

### 瀏覽器：冒煙、介面、壓力、掛機、離線（161 秒）

- ✅ 全新開局無錯誤
- ✅ 各分頁可開啟且沒有錯誤
- ✅ 上一版有內容的分頁沒有變空白
- ✅ 主選單按鈕沒有消失
- ✅ 設定項目沒有消失
- ✅ 頁面元素 id 沒有消失
- ⚠️ 分頁內按鈕／標題沒有消失（4，改名或移動需確認）
- ✅ 畫面 手機直向 390x844：分頁無錯誤
- ✅ 畫面 手機直向 390x844：沒有橫向溢出
- ✅ 畫面 手機橫向 844x390：分頁無錯誤
- ✅ 畫面 手機橫向 844x390：沒有橫向溢出
- ✅ 畫面 平板 820x1180：分頁無錯誤
- ✅ 畫面 平板 820x1180：沒有橫向溢出
- ✅ 畫面 電腦 1440x900：分頁無錯誤
- ✅ 畫面 電腦 1440x900：沒有橫向溢出
- ✅ 隨機生成並穿戴 4000 件裝備，屬性重算全為有限數值（seed 545046079）
- ✅ 裝備與詞綴不變式
- ✅ 裝備滿載時各分頁仍可渲染
- ✅ 逐一施放 26 個技能、穿戴 37 件傳奇、切換 4 位角色
- ✅ 深度挑戰 36 組（4 角色 × 9 個深度，含首領）
- ✅ 掛機 2 小時：street（Lv21、最深 8、擊殺 4033）
- ✅ 掛機記憶體增長 street：21MB
- ✅ 掛機有進展 street（不卡關／不停擺）
- ✅ 掛機 2 小時：frost（Lv24、最深 8、擊殺 7940）
- ✅ 掛機記憶體增長 frost：11MB
- ✅ 掛機有進展 frost（不卡關／不停擺）
- ✅ 掛機 2 小時：beep（Lv22、最深 8、擊殺 4747）
- ✅ 掛機記憶體增長 beep：10MB
- ✅ 掛機有進展 beep（不卡關／不停擺）
- ✅ 掛機 2 小時：volt（Lv21、最深 8、擊殺 5079）
- ✅ 掛機記憶體增長 volt：20MB
- ✅ 掛機有進展 volt（不卡關／不停擺）
- ✅ 離線結算（30 秒到 3 天）與存檔往返

### 舊版存檔相容（93 秒）

- ✅ v0.75.0（Lv14、背包 92）的存檔可在目前版本載入並續玩
- ✅ v0.77.1（Lv14、背包 94）的存檔可在目前版本載入並續玩
- ✅ v0.78.0（Lv14、背包 88）的存檔可在目前版本載入並續玩
- ✅ v0.30.0（Lv22、背包 200）的存檔可在目前版本載入並續玩
- ✅ v0.50.0（Lv13、背包 56）的存檔可在目前版本載入並續玩
- ✅ v0.60.0（Lv14、背包 81）的存檔可在目前版本載入並續玩
- ✅ v0.70.0（Lv13、背包 66）的存檔可在目前版本載入並續玩
