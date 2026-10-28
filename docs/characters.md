# 現行四職業與角色模型

2026-10-28 按 main `641c43d` 核對，取代早期 AKANE／REN／YUI／TAICHI 設定草案與舊四角色交接中的候選狀態。人物在遊戲內使用玩家自訂名稱；下表 AKI 等是素材模型 ID，不作預設人物本名。

| 固定存檔鍵 | 職業 | 模型 ID | 方向 |
| --- | --- | --- | --- |
| street | 戰士 | aki | 近戰、電擊、護盾 |
| frost | 樂師 | milo | 音波、節拍 |
| beep | 獵手 | ping | 遠程投射、鎖定 |
| volt | 寵機師 | null | 寵機、持續輸出、修復 |

`src/game/characters-data.js` 是人物資料 owner；職業／昇華及實際技能條件須連同相關程式核對。角色固定職業，各三條昇華，技能與電路仍可自由配搭。不要從舊文件恢復專屬起始技能或自動裝備／自動接線。角色列表、建立及存檔沿用既有多角色流程。

## 美術與來源

角色模型沿用使用者提供的 Character.zip 衍生，不另造底模；`assets/characters/manifest.json` 保存來源 SHA、三角面、骨架與動作。四件 GLB 各約 14,000 三角面、16 骨、9 個動作：idle、walk、run、attack、cast、hurt、dash、death、victory。原來的有貼圖衍生檔與後續純色版本分開保存，風格以 [創作基準](creative-direction.md) 為準；不能因原模型仍有貼圖而把舊材質當作最新要求。

- 原模型與 manifest：[assets/characters](../assets/characters/)。
- 純色衍生與整合：[style-complete](style-complete/README.md)、[assets/style-flat](../assets/style-flat/)。
- `characters-render.js` 管模型、骨架、動作與釋放；角色預覽／戰場沿用共用模型路徑。
- [角色專裝與掛點](y2k-equipment.md)、[選角頁](character-select/README.md)。

完整模型／裝備審閱頁先執行 `python3 tools/build_reviews.py`，再開啟 dist/character-review.html 或 dist/equipment-review.html。產物按目前來源重建，不再提交舊版巨型 HTML。

## 生圖

使用 [手作早期日系遊戲素材提示詞](handmade-japanese-asset-prompt.md)，替換 `[SUBJECT]` 描述；保留職業辨識點、現有四肢與骨架比例。單件白底圖不作遊戲背景規格。本文件整理未新增故事或替換任何模型；舊人物設定與轉換細節見 [歷史索引](history.md)。
