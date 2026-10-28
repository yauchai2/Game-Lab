# Game Lab：Hello, Static!／Idle Hero

Y2K 低面數 3D 掛機 ARPG：在浮島街區自動戰鬥、刷裝備，手動組裝技能電路。四個固定職業、昇華、裝備改造與本機多角色存檔。

[正式試玩](https://yauchai2.github.io/Game-Lab/) · [開發測試版](https://yauchai2.github.io/Game-Lab/preview/) · [版本與下載](https://github.com/yauchai2/Game-Lab/releases) · [完整文件索引](docs/README.md)

2026-10-28 核對 gh-pages 的版本資料：正式版為 0.78.0，測試版為 0.79.1-dev.641c43d。這是部署分支快照；即時版本以各站的 version.json 為準，main 的程式版本不代表正式站已更新。

## 本機開發

```sh
python3 -m http.server 8000
```

開啟 http://localhost:8000/ 。或直接開啟 dist/idle-hero.html 使用離線單檔。

```sh
python3 tools/build.py
python3 tools/build_reviews.py
```

第一個命令重建正式單檔；第二個按目前來源產生角色、裝備與整合審閱頁，審閱 HTML 不再提交。測試與所需工具見 [測試指引](docs/testing.md)。

| 目錄 | 用途 |
| --- | --- |
| src/、index.html | 遊戲程式與開發入口；src/game/ 共用全域，載入順序由入口定義 |
| assets/ | 可編輯模型、原圖、參考、音訊母帶與來源清單 |
| tools/ | 建置、素材處理及測試 |
| dist/idle-hero.html | 與來源一致的正式離線產物 |
| docs/ | 現行規格、待辦及必要交付／發佈證據 |
| services/feedback/ | 回饋服務 |
| .github/ | 檢查、發佈及維護工作流程 |

## 創作與保存

[Ice Cream 全遊戲創作基準](docs/creative-direction.md)、[美術規格](docs/art-style.md) 與 [共用生圖提示詞](docs/handmade-japanese-asset-prompt.md) 為現行入口。介面維持藍紫視窗與 Cubic 11，素材展示白底不影響遊戲場景。

存檔存於目前瀏覽器；搬網址或裝置前先匯出存檔碼。正式版與測試版共用來源網域，測試正式進度前先備份；不以 fresh 參數開正式存檔。

開工先讀 [AGENTS.md](AGENTS.md)。重要進度回寫對應文件與 [待辦](docs/backlog.md)。部署與 Release 依 [發佈流程](docs/deployment.md) 辦理。

## 授權

[頁面外殼 MIT](docs/colorfigures-LICENSE)、[three.js MIT](src/vendor/three.LICENSE)、[Cubic 11 OFL](tools/font/Cubic-OFL.txt)、[音訊逐檔來源與授權](src/audio/LICENSES.md)。使用者提供與生成素材各按來源清單記錄，不以專案授權覆蓋第三方素材。
