# PR107 依 0.79 分工重新交接

2026-10-27，Asia/Hong_Kong。已 fetch main `c67529d`，讀取 `docs/codex-sync-notes.md`、AGENTS.md、deployment.md、PR guard。此文件是交給原型討論串的整合說明，沒有修改遊戲程式、版本或部署。QA 關卡仍為建立中，不能把PR107舊候選的測試結果當成0.79整合驗收。

## 已核對

- PR109合併來源 `4d9fe30`，已還原Codex v0.78音訊。main相較v0.78 tag `bca2a6e`，`src/audio/*`及audio-assets沒有差異；audio.js多一行SYS換曲記錄。
- main目前0.79.0；tags已fetch，查到v0.78.0，未查到v0.78.1或v0.79.0。這不是申領下一版本號，整合／發佈時仍須再查遠端tag。不能把未發現tag當作QA或Release授權。
- PR107仍未合併，來源 `e6cf9ea8cd02c3d85b119848fee2c58c94b23a32`，基底是main45d7c79。完整來源、素材與當時證據保留於該分支，勿直接合併這個舊版本頭，勿移tag或刪分支。
- main的core.js已新增`if (!PALS[st.pal]) st.pal = cfg.palette || 'mustard'`，與PR107的角色返回卡死有重疊；PR107在profileResetRuntime保留pal／az是另一層修正。應先在0.79重現，再決定最小整合範圍。
- 本次查核時main沒有tools/qa或docs/qa已追蹤檔案，與交接說明「建立中」一致；不往QA owner範圍新增檔案。

## 原型討論串的程式整合入口

請以最新main開分支，逐項選取所需改動，不整檔回填src、index或dist；保留syslog、load retry、repairLegendAffixes、正式／測試頻道，以及audio.js新增的SYS.info記錄。

1. 角色返回：PR107的02b-careers.js保留renderer pal／az，取消建立時清intro timer／class／草稿，並取消舊音訊；05r-direct-play、05ab-intro-logo、05ac-intro-comic提供各階段返回。core的防呆已在main，應保留，不能宣稱main完全沒有修這個根因。
2. 音訊生命週期：audio.js的audResetScene／audStopStory、generation保護待解碼聲音，換曲中斷及晚到play保護，場景回訪續播；05k-phone開機timer檢查同一次開啟與非closing，防快速關閉後補響。保留main新增SYS換曲記錄。
3. 選曲／混音：street-world移除短暫精英觸發換曲，危險地圖用rush；常用命中、揮擊、擊殺／翻滾降音量與密度，普通UI不反覆duck音樂。
4. 巨大Boss：street-creatures同一mapping改六章body高度52／58／64／56／66／72、塔樓64、其他Boss58。原血條與血跡已讀實際幾何，不另建owner、不動AI／碰撞／數值。
5. 素材：PR107的assets下兩份CC0原檔、來源頁與master；src/audio兩首配樂及13常用cue替換、provenance／鳴謝／audio-assets接入均由原型討論串處理src。本次不由Codex重推這些src改動。完整音訊12.29MB、上限13MB；大WAV僅為master，不進runtime。依自己的分支重新pack audio／font／syslog／build。
6. PR107的0.78.1僅舊候選標示。不要在0.79主線覆回CHANGELOG、README、checkpoint或dist。沿用目前版本流程；開發只到preview，正式Release等Alan明確要求。

各項差異可精確讀：

```
git diff 45d7c79 e6cf9ea -- src/game/02b-careers.js src/game/audio.js src/game/street-creatures.js
git diff 45d7c79 e6cf9ea -- src/game/05r-direct-play.js src/game/05ab-intro-logo.js src/game/05ac-intro-comic.js src/game/05k-phone.js src/game/street-world.js src/game/05w-signal-studio.js
```

以上是讀取差異，不是要求整檔套用。新分工後Codex僅改tools／assets／docs；不以guard只警告為理由越界。

## 驗證交接

PR107在自己的基底已驗證三處取消建立、完成新角再切回、模擬時間前進、單檔同流程、六章原生spawn／三種塔Boss與血條／血跡、54素材來源與embed、22路由／續播／換曲中斷／晚到解碼與timer／混音壓力；default回歸與327職業／電路／多角色檢查通過。

可供原型／QA參考的腳本：tools/test_navigation_audio_boss.cjs、tools/audio/test_audio_scene_lifecycle.cjs、tools/audio/test_release_audio.cjs，以及docs/navigation-audio-boss。QA owner決定如何納入新關卡；Codex不直接改tools/qa或docs/qa。舊test_tower_combat固定23技能，在PR107與v0.78基底同樣失敗（當時實際26），不能把它當本次新回歸或已通過。

0.79新增核心防呆與存檔轉換後，需重新測新建取消／完成切角、0.70舊存檔、失效詞綴、系統記錄、換曲與preview頻道；新的結果由整合分支與QA關卡記錄。真機及主觀聽感仍未驗收。
