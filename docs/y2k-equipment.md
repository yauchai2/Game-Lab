# 裝備素材與佩戴入口

2026-10-28 整合專裝與佩戴校正文件。早期 PR #15 的「未合併／未發佈」與三欄候選是歷史狀態，不能拿來判斷目前七部位系統。當前裝備欄與規則以 01-data.js、狀態及裝備模組為準。

## 素材來源

使用者提供的 16 件 GLB 對照與原始／衍生雜湊保存在 [source-map](../assets/equipment/source-map.json) 及 [manifest](../assets/equipment/manifest.json)。

| 模型 | 原始 16 件專裝 |
| --- | --- |
| AKI | 修補耳機、伸縮電棍、腰鏈、插頭吊飾 |
| MILO | DJ 耳機、MD 隨身聽、音盤、條紋腰帶布帶 |
| PING | 通訊耳機、郵差包、前臂發射器、翻蓋手機 |
| NULL | 防護眼鏡、電子寵物控制器、電池盒、浮游寵機 |

原本只有參考圖的髮夾、兩肩帶、頸繩，後續處理須查 [equipment-completion](equipment-completion/README.md)、[wear-fit-final](wear-fit-final/README.md) 與目前 manifest，不把早期「四件都缺」照抄為現在狀態。一般裝備圖示與純色衍生各有獨立來源清單，見 [素材產線](assets-sources.md)。

## 唯一來源與重建

- `tools/model/prepare_equipment.py`／`pack_equipment.py`：原模型減面、雜湊／預算驗證及打包；不要手改內嵌 base64。
- `src/game/equipment-render.js`：模型快取、材質及骨架掛點；角色來源 GLB 不因佩戴校正被覆寫。
- [style-complete](style-complete/README.md)、[equipment-completion](equipment-completion/README.md)、[wear-fit-final](wear-fit-final/README.md)：純色版本、補件與收尾證據。
- `python3 tools/build_reviews.py` 後開 dist/equipment-review.html，檢視逐件、組合、動作與視角；審閱產物不提交。

模型載入／邊界有限、掛點技術檢查不代表全部動作沒有穿模。真機與完整佩戴美術仍須實際驗收，待辦沿用 [backlog](backlog.md)。原始掉落候選、佩戴規劃與校正過程見 [歷史索引](history.md)；數值以程式為準。
