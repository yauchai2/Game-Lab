# 現行怪物與吉祥物設定（唯一文件入口）

核對日期：2026-10-26，Asia/Hong_Kong。核對基準：main `a428ceb529f13204e883c1b022db25f34b12b62d`；v0.64.0 發佈狀態另見 [發佈紀錄](release-0.64.0/integration.md)。本次只整理文件，沒有替換素材或修改遊戲。

## 結論與適用範圍

**現行街頭風格使用 12 個基礎模型：M01–M08、B01–B04。** 使用者本次提供的十二款總覽與映射表和現行程式吻合。這十二款已有素材與三視圖，不能因本對話要求「先看單視角」就誤記為從未製作三視圖。

本對話另生成的「13 種一般怪物＋3 種守關者＝16 款」依據舊敵人名稱作畫，屬於**錯誤設定試稿，作廢，不納入正式名單**。其中的硬碟蟹也不例外。保留檔案只供追溯，不匯入正式素材 catalog、不代換現行模型、不據此新增待辦或宣稱使用者已批准造型。

## 十二款模型與玩法類型對照

名稱以使用者本次十二款對照表為準；ID 與映射核對 [street-creatures.js](../src/game/street-creatures.js)，素材存在性核對 [catalog.json](../assets/monsters/catalog.json)。模型可供一般單位與首領共用，因此 M／B 分組不代表互斥的玩法分類。

| 模型 ID | 造型名稱 | 對應玩法類型／用途 |
| --- | --- | --- |
| M01 | 插頭跳豆 | slime |
| M02 | 拖板爬蟲 | mole、spider、roller、cable |
| M03 | MD 滑翔盤 | drone、wisp |
| M04 | 低頻箱蟹 | speaker；主線第 1、4 章首領 |
| M05 | 摺訊飛蛾 | skel、ranger |
| M06 | 錯址速遞車 | brute |
| M07 | 存檔游魂 | bomb、crab |
| M08 | 補丁燈籠 | lantern、antenna |
| B01 | 總掣工頭 | golem、furnace、jailer；塔樓 warden；主線第 2 章首領 |
| B02 | 回帶港務機 | specimen；塔樓 chimera；主線第 5 章首領 |
| B03 | 無主分揀塔 | scanner、sentinel；塔樓 executor；主線第 3 章首領 |
| B04 | 未登出者 | shard；主線第 6 章首領 |

六章首領依序使用 **M04、B01、B03、M04、B02、B04**，加上 `streetChapterMark` 章節標記；第 1、4 章共用 M04。其他 Boss 走現行 `bossForm` 的 B01–B04 選擇規則，塔樓另走 `towerBoss` 覆寫。章節標記、體型、精英與狀態變體不自動增加基礎模型數。

## 不再混用的三種資料

- **玩法類型**：`m.type`、`MTYPES`、`MONSTER_GUIDE` 仍供 AI、圖鑑、數值、碰撞、掉落及舊模式使用。`slime`／`skel`／`crab` 等鍵不能按字面推導現行外觀，也不能為了統一文件改掉這些鍵或存檔。
- **現行造型映射**：`STREET_CREATURES`、`streetCreatureBuild` 及模型 catalog。22 個 type 共用十二模型；不能當成 22 款獨立設計。
- **歷史試稿**：原史萊姆／骷髏／蠻牛，以及巡山機／搬運機／鐘樓看守的三款首領描述。它們可解釋舊版本，不構成現行造型清單。

## 最新材質與展示要求

Ice Cream.mp4 為全遊戲創作基準；細節見 [creative-direction.md](creative-direction.md)。semi-lowpoly、清楚剪影與大塊切面、Y2K／PS1／Dreamcast、chunky simplified forms、flat shading、unlit、matte、no texture detail；超級簡陋、有人味。單件素材完整置中、純白背景；遊戲場景沿用地區背景。

保留十二款的物件身份、輪廓與映射，不能把更新材質風格解讀成另創一套怪物。最新修訂不使用卡通笑臉；設備狀態由幾何燈槽與非對稱指示燈表達，不能用幾何重做笑眼、嘴巴或腮紅。舊參考與輸出保留，不反過來覆寫最新要求。

## 吉祥物／同伴

同伴不計入十二款敵人。現行為已精修的黃色切面收音機殼、偏置天線／調諧槽、側置旋鈕與側面喇叭槽；沿用既有跟隨、找回失物慶祝與章末標記。最新形態見 [設備精修證據](style-complete/device-refinement.png) 及 [實作紀錄](style-complete/README.md)。

本對話早先生成的「圓耳＋點眼＋微笑」黃色精靈只屬過時方向試稿，**不是最新同伴定稿，不得據此還原笑臉**。不能拿對話中較早的生成圖取代後續明確修訂。

## 文件閱讀順序與狀態

1. 本文件：現行名單、共用映射與試稿處置。
2. [creative-direction.md](creative-direction.md)：全遊戲風格與最新使用者修訂。
3. [style-complete/README.md](style-complete/README.md)：十二模型、素材、三視圖與驗證證據。
4. [release-0.64.0/integration.md](release-0.64.0/integration.md)：已合併／已發佈的證據；不憑舊候選紀錄判斷線上狀態。
5. [現行創作基準](creative-direction.md)、[現行創作基準](creative-direction.md)、[現行創作基準](creative-direction.md)：舊版美術演進紀錄，衝突處不作現行驗收規格。

本次文件分支 `codex/monster-docs-cleanup-2026-10-26`，以 main a428ceb 為基底。驗證限於映射／素材清單／文件連結與差異範圍；未重新生成圖片、重建遊戲或執行遊戲測試。提交／推送／合併狀態以 Git／PR 為準。
