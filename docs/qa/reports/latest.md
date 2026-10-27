# QA 報告：0.79.0（4d9fe30）

- 日期：2026-10-27 14:09 UTC
- 模式：快速；比對基準：v0.78.0
- **結論：通過**（通過 16／警告 13／失敗 0）

## 警告（請作者確認是否有意）

- tools/test_characters.cjs：已知失敗：const mesh=new T3.SkinnedMesh(characterEquipmentGeometry(asset,id),g1HeroMaterial(id,asset.material));mesh.name=id+'_skin';mesh.frustumCulled=false; | ReferenceError: g1HeroMaterial is not define
- tools/test_combat_experience.cjs：已知失敗：let checks=0;function ok(value,msg){checks++;if(!value)throw Error(msg)} | Error: catalog complete
- tools/test_equipment_slots.cjs：已知失敗：const check=(ok,text)=>{if(!ok)throw Error(text)}; | Error: cosmetics remain three
- tools/test_field_update.cjs：已知失敗：function riftTick(dt){const s=riftState(),e=s.encounter;if(typeof document!=='undefined')document.body.classList.toggle('rift-on',!!e&&['expand','contain'].includes(e.phase)&&!G.offline);if(G.off
- tools/test_loot_world.cjs：已知失敗：let checks=0;function ok(value,message){checks++;if(!value)throw Error(message)} | Error: catalog expanded
- tools/test_offline_return.cjs：已知失敗：function riftTick(dt){const s=riftState(),e=s.encounter;if(typeof document!=='undefined')document.body.classList.toggle('rift-on',!!e&&['expand','contain'].includes(e.phase)&&!G.offline);if(G.off
- tools/test_player_ailments.cjs：已知失敗：function riftTick(dt){const s=riftState(),e=s.encounter;if(typeof document!=='undefined')document.body.classList.toggle('rift-on',!!e&&['expand','contain'].includes(e.phase)&&!G.offline);if(G.off
- tools/test_progress_curve.cjs：已知失敗：function riftTick(dt){const s=riftState(),e=s.encounter;if(typeof document!=='undefined')document.body.classList.toggle('rift-on',!!e&&['expand','contain'].includes(e.phase)&&!G.offline);if(G.off
- tools/test_rift_experience.cjs：已知失敗：function riftTick(dt){const s=riftState(),e=s.encounter;if(typeof document!=='undefined')document.body.classList.toggle('rift-on',!!e&&['expand','contain'].includes(e.phase)&&!G.offline);if(G.off
- tools/test_terrain_mesh.cjs：已知失敗：const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647; | ReferenceError: document is not defin
- tools/test_tower_combat.cjs：已知失敗：let n=0;function ok(v,msg){n++;if(!v)throw Error(msg)}G.lvl=40;G.maxDepth=30;G.gold=1e6;G.chips=1e4;G.pass=[];G.legacyMode=false;G.run=null;G.h.dead=0;recalc();G.h.hp=G.st.life; | Error: 23 disti
- tools/test_update_032.cjs：已知失敗：addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')||e.target?.isContentEditable)return;const k=e.key.toLowerCase(); | Refer
- tools/test_ux_revision.cjs：已知失敗：diff: 'simple' | }

## 各項明細

### 舊的邏輯測試（12 秒）

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
- ⚠️ tools/test_offline_return.cjs
- ✅ tools/test_onboarding_focus.cjs
- ⚠️ tools/test_player_ailments.cjs
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
