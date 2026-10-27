# v0.78.1 候選：角色返回、聲音與巨大首領

2026-10-27，Asia/Hong_Kong。基底 main `45d7c79407afc4076867f1890938050b865febc8`；正式站目前仍為 v0.78.0。本批 branch `codex/navigation-audio-boss-fixes`，實作／本機驗證與已發佈分開記錄。

Alan回報某些頁面返回卡住、仍有舊音樂／效果聲、整體聲音需繼續優化、巨大Boss好像消失；後補重現路徑為「建立新角色 → 返回原角色」。

## 返回卡住的根因與修正

`GAME_NEW_STATE` 在 `mountFigure` 之前快照；之後 renderer 在同一個 `G` 增加 `pal`、`az`。舊 `profileResetRuntime` 刪除全部欄位再套用早期快照，令 `G.pal` 消失。實際瀏覽器重現 `src/core.js:314` 的 `Cannot read properties of undefined (reading 'l')`，動畫迴圈拋錯後不再排下一幀；即使返回已把 `G.paused` 改成false，時間仍停在0。

修正沿用profile owner，保留renderer的`pal`／`az`，不把它們變成角色存檔欄位。取消建立會清除標題／漫畫timer、class、草稿及舊音訊。新角色流程的標題、序章、選角都可直接返回原角色；有原角色時Escape亦返回。完成建立再切回原角色也覆蓋同一修正。

## 聲音處理

六首正式配樂全部改為CC0錄音：保留日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser；把仍有舊合成音色的underpass換成 **After Midnight — dant-e**，rush換成 **Strong Downtempo / Space Ranger — Nostromo**。使用實際下載的完整音檔；後者作者明確提供seamless loop。不是對兩份參考影片錄音取樣，也不宣稱已親耳聽完它們。

新來源的CC0頁面、原檔SHA與可追溯檔案見[online-sources.json](online-sources.json)、兩份`*-source.html`及`assets/audio-online/originals`。使用專案既有provenance／master／embed驗證流程；此環境沒有game-dev CLI，不宣稱完成該工具的package admission或GPU證據封裝。

13個常用命中／移動／按鍵cue改用Kenney實體聲，移除舊合成層；時長80–230ms。降低命中、擊殺、揮擊、翻滾音量，延長高頻事件間隔；普通UI按鍵不再反覆duck音樂，保留受傷／死亡／稀有等事件的層次。其餘技能保留已整音的功能辨識；沒有聲稱48個cue都重做。

普通精英沿用場景曲，不再短暫出現便切歌；危險詞綴地圖才用rush。切回場景從前次位置續播；完整曲循環仍走雙deck淡換。新情境可中止進行中的換曲，晚到play promise不會在靜音後重啟舊曲。profile切換取消既有voice與待解碼請求；漫畫退出另使story解碼失效。手機快速關閉不再在900ms後補播開機聲。

完整After Midnight約454秒，保留完整編排令54個素材由8.35MB增加至12.29MB，技術上限調至13MB、music480秒；music仍由media element按需播放，SFX延遲解碼。新增2首來源與WAV僅供追溯，正式遊戲不載入WAV／來源頁。正常音樂目標−18.7LUFS與峰值保護；Space Ranger另加0.6dB校正，實際MP3量測見asset-validation。增量下載與真機長時間聽感仍需玩家驗收。

遊戲內聲音鳴謝亦改成真實作者與CC0來源，不再錯稱全部Game-Lab原創。

## 巨大Boss

新版GLB曾將所有主線／塔樓／一般首領統一設為27單位高，與普通大型怪差距太小。沿`streetCreatureSpec`同一模型映射恢復六章body高度52／58／64／56／66／72，塔樓64、一般首領58；不新增或代換怪物catalog，不改AI、碰撞、血量、傷害、出現門檻或存檔。章節標記會令實際bounds更高。

血條本來就讀變換後幾何，血跡本來就用`monsterVisualSpan`；這次尺寸修正會自然帶入兩者，40處／90秒規則保留。原生六章spawn實測約66–96單位高，血跡半徑約17–25。最大第六章首領在390px投影bounds y=-0.590..0.662，完整留在畫面內；不是只驗證數字存在。

[390px一般首領](boss-390.png) · [1440px](boss-1440.png) · [最大章節首領](boss-largest-390.png)

## 驗證入口

- [browser-results.json](browser-results.json)：三處實際按鈕取消、完成新角色再切回、時間繼續、無inert/class殘留；六章原生spawn／模型／血條／血跡及塔樓mapping、響應式截圖。
- [audio-runtime.json](audio-runtime.json)：實際MP3、22路由、loop wrap、材質命中、story／長聲voice上限、mute。
- [audio-lifecycle.json](audio-lifecycle.json)：實播續播、換曲中斷、退出時待解碼story／battle取消、兩首新曲實播、手機晚到timer。
- [資產](../audio-street/asset-validation.json)及[壓力混音](../audio-street/runtime-validation.json)：54份master／MP3／embed／來源／member SHA、LUFS／true peak、混音與voice限制、17封存檔不變。
- 其餘回歸及版本／建置證據見verification.json；未宣稱真機Safari、手機喇叭、參考全曲主觀試聽或30分鐘疲勞已驗收。

此候選不整合其他聊天未批准的標題PR101或修改角色四肢、地圖、六章故事、技能數值。已向Claude在PR104同步本批範圍，未假設對方已讀取。

補充檢查：`test_classes_circuits.cjs`的327項與`test_direct_play_state.cjs`通過。額外舊`test_tower_combat.cjs`在本批與v0.78.0基底同樣因「固定23技能」斷言失敗，現有技能已26種；該測試亦早於新手工浮島，不宣稱其通過。本批不動技能數值，首領變更由原生spawn與實際GLB／畫面另行驗證。日常`tools/run_tests.sh`完整通過。
