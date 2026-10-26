# G1 夏日街區：共同製作紀錄

2026-10-26，Asia/Taipei。Alan 已批准：城市仍有日常、電台錯頻引發冒險；製作街區＋AKI表面＋兩件裝備＋M01候選＋效果A/B。**角色四肢比例、職業名、藍紫窗口與既有戰鬥機制維持。** 授權為樣板製作，不是正式發佈。

## 交付與來源

- 素材／故事第一批：`bc00849`。`assets/g1-summer/material-pack.js` 提供AKI、修補耳機、改裝電棍的非破壞材質recipe；不修改原貼圖影像、幾何、UV、權重、骨架或clip。不是新重製GLB。
- 街區由Claude原型討論串製作，PR #77，基於main `0992adc`（0.57.0）。目前本機材質驗證使用 `b7f0629`；之後完成高架及效果的來源會另記錄，不能把後續實作算入舊測試。
- 新主線方向已取代舊「停電後第七年」。[story.json](story.json) 是三段序章、三段不打斷戰鬥的街區短文與第一段主線，沿用阿澄／小禾。具體候選文案與正式資料的整合由Claude接線。
- 原創商店招牌：電台、修理店、唱片店三張SVG。是可接入店面的新素材，不代表街區已自動載入它們。
- M01來源 `codex/m01-battery-hopper-asset`／`7ed725f`，已取得原GLB與manifest、核對24個檔案。GLB hash見 [m01-receipt.json](m01-receipt.json)。684面、3mesh、unlit頂點色、Idle/Hop/Hurt。只收指定素材，不搬另一聊天舊版src。接入後另記實景驗證，不能用收件hash冒充已進戰鬥。

## 可玩單檔與比較

[獨立樣板](../../dist/g1-summer-street.html) 以明確來源checkout組裝真實遊戲；預覽adapter僅存在此檔，不改正式src。所有localStorage／sessionStorage轉入頁面記憶體，因此試穿專裝、自動存檔或wipe均不影響正式進度。

工具列可切換AKI及兩件裝備的原／新材質、人物近景，開啟三段故事及重置試玩。G1街段使用Claude正式地形生成／導航，不另維護一套戰鬥或地圖實作。精確來源見 [build-source.json](build-source.json)。

```sh
python3 tools/g1/build_preview.py --source /path/to/explicit-game-checkout
python3 -m http.server 8780
node tools/g1/test_preview.cjs
```

## 已驗證與限制

[validation.json](validation.json) 記錄10項軟體WebGL檢查：Claude街段／10店舖、同geometry與rig、兩件真實專裝、九動作執行、材質A/B、三段故事、反覆切換、存檔隔離、320／390控制及重置。原始filter與材質未被改寫；本次材質使用近景最近點、遠景mipmap保留細節。沒有聲稱真機FPS／Safari通過，也沒有聲稱目前所有怪物均完成。

M01實際戰鬥接入及死亡效果A/B依共同來源交付再驗證，不在這份早期材質檢查內冒充完成。

## 持續協作

共同交流入口：[PR #75](https://github.com/yauchai2/Game-Lab/pull/75)。Claude文件討論串只負責文件／轉達；真正修改src的是原型討論串。Codex本批持有 `assets/g1-summer/`、`tools/g1/`、本目錄與驗收；Claude原型持有src、街區布局、模型接線與版本；M01聊天持有模型原件。按批次認領，不永久分割領域。

每批素材先給commit，再由Claude接入；每次收到來源提交後重新組裝同一份遊戲驗收，回傳具體問題與證據。未合併、未正式發佈。
