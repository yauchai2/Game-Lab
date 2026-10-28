# 遊戲角色定位檔案索引

2026-10-28，Asia/Taipei。基於 main `641c43d` 與本任務分支 `codex/character-turnaround-preview`；只整理來源入口，不修改設定或遊戲。已 fetch origin main；舊文件的候選／版本文字不代表目前發佈狀態。

## 四個玩家職業（現行）

| 模型代號 | 職業 | 戰鬥定位 | 現行街區背景摘要 |
| --- | --- | --- | --- |
| AKI | 戰士 | 近戰、連鎖電擊、護盾續戰 | 每天巡街修電，替小店接試音延長線 |
| MILO | 樂師 | 中距離、環形音波、連擊加速 | 唱片店常客，能聽出走調廣播中的重複節拍 |
| PING | 獵手 | 遠程投射、標記追蹤、會心 | 熟悉店家、班車與送貨路線，用摺機追查錯送訊息 |
| NULL | 寵機師 | 召喚、持續輸出、修復增益 | 修理舊寵機、替修理攤試零件，希望設備都有歸處 |

1. [characters-data.js](../src/game/characters-data.js)：四職業定位、身份、主動／被動、基礎故事與 legacy key 對應。
2. [street-world.js](../src/game/street-world.js)：覆寫四人第一段故事為現行夏日街區背景；不可只讀上一檔就認定是完整現行故事。
3. [02b-careers.js](../src/game/02b-careers.js)：四職業的十二條昇華定位與規則。
4. [02c-ascension-talents.js](../src/game/02c-ascension-talents.js)：各昇華天賦分支與能力取捨。
5. [01-data.js](../src/game/01-data.js)：CHARS 底層資料、解鎖與技能等基礎定義，須連同後載入檔案閱讀。

## 人物外形、美術與素材

- [四人已批准白底原圖](../assets/brand/hello-static/character-select/source.png)：現行造型參考。
- [角色模型交接](y2k-characters-handoff.md)：AKI／MILO／PING／NULL 模型對應與骨架；版本狀態段落屬歷史紀錄。
- [角色選擇頁交接](character-select/README.md)：四人對應現行職業、原圖與選角呈現。
- [專屬裝備設定](y2k-equipment.md)：角色專裝與辨識物件。
- [全遊戲創作基準](creative-direction.md)：現行風格要求及後續修訂。
- [首張三視圖風格候選交接](character-turnaround-preview.md)：本聊天 AKI 預覽，尚未定稿、尚未完成三視圖。

## 故事人物、怪物與同伴

- [故事整理](story.md)：開場、六章主線、終局及街區短篇；含修理工小禾、渡船員阿澄、唱片店阿夏、巡線員阿嶺等故事人物。
- [street-neighborhoods.js](../src/game/street-neighborhoods.js)：現行街區主線、委託人及電台手記來源；亦需連同 street-world.js 的改寫閱讀。
- [怪物與吉祥物設定](monster-catalog.md)：十二個基礎模型、首領映射及黃色收音機同伴。舊十六款試稿作廢。
- [street-creatures.js](../src/game/street-creatures.js)、[素材 catalog](../assets/monsters/catalog.json)：怪物實作映射與實際素材清單，不按 legacy type 字面推導外觀。

## 舊草案（可閱讀，不代表現行定稿）

[characters.md](characters.md) 是茜 AKANE、蓮 REN、結衣 YUI、太一 TAICHI 的完整身份／性格／外觀／個人故事草案。它和現行模型代號、職業簡介與街區故事不同；story.md 末尾仍連向此草案，不表示草案全部被現行遊戲採用。原文完整保留。

驗證：已檢查本索引的相對檔案連結存在，並執行 git diff --check；無遊戲實作修改，不重建或重跑遊戲測試。
