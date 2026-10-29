# 四人物 A-pose 三視圖交付

2026-10-29 · Asia/Hong_Kong。分支 `codex/character-apose-20261029`，基於使用者指定 `codex/character-turnaround-preview` 的 `22b1dc56481a7bcd38c3101d4dd4b1f6299eb568`。本輪使用者授權生成四個人物，取代早前文字階段的不生圖限制；未授權合併／發佈或接入遊戲。

## 交付與設定來源

[全部PNG及提示詞](../assets/concepts/character-apose-2026-10-29/README.md)。人物僅採[characters-current](characters-current.md)的Jax／Vee／Skye／Niko，沒有使用本機main舊AKI等人設。保留姓名、16／17歲、性別、膚色、四職業與身高；窄短上身、長腿、誇張鞋、四款褲型及長褲蓋鞋面依最新文字執行。四人空手A-pose，職業武器及Niko機偶沒有混入人物底稿。

風格以使用者本輪指定Ice Cream.mp4為首：實際檢視原片8秒取樣接觸表的靜幀，承接粗簡體積、青年街服、誇張鞋與簡化五官；未宣稱連續播放或量測影片模型拓撲。原片位於 `assets/references/ice-cream/Ice Cream.mp4`，既存SHA-256為 `f30128b95c42843f6305049a4f82273bd8f3464eec263f328fed2e78d6407e2a`。本輪原創人物，不複製原片角色／標誌。保留[原始英文風格與負面提示](../assets/concepts/character-apose-2026-10-29/user-style-prompt.txt)；依主要要求將3/4及禁止turnaround改成正側背。

使用host-native ImageGen（工具 `image_gen.imagegen`），共4次首輪＋4次修訂；沒有Tripo／Leonardo付費工作或3D生成。`game-dev`未安裝，沒有把此交付冒稱CLI canonical package／game-ready資產。PNG是生成參考，未附加新素材授權條款。原始生成檔保留於工作環境 `/workspace/generated_images`；最終PNG原bytes已複製入本分支。

## 逐人修訂

| 人物 | 首輪生成ID | 最終生成ID | 已檢視修訂 |
| --- | --- | --- | --- |
| Jax | 78ccbd3c-057a-4d82-984f-ab3fb597ba67 | aa36da3e-4337-47c1-a55d-9599acd3ea9b | 大鞋正／背方向收整；雙層完整袖、左腿袋、帽下爆刺、粗鏈保持 |
| Vee | 75503fbc-1fa0-4411-8255-215a6336d83f | 36501bea-1c03-4532-a7da-e02727ff29cc | 背面耳罩按解剖側互換成左白缺角圓／右深色方；保留不笑平口及喇叭褲 |
| Skye | 3cb06629-7881-4a52-a7ba-609af16d6b14 | ee6b8a57-688f-4acf-9d52-46b53b7f2e24 | 背面馬尾移至人物左側，後鞋改後跟；斜帶袋落點及三道襪間保持 |
| Niko | 7e3400fb-33d9-4232-ab2a-6bb74c7e93a0 | 33ad664c-9f03-4052-acba-ecdd5f179584 | 左腰控制器打開，後鞋去除錯放的鞋面片；有色雙窗與陰沉閉嘴保持 |

ImageGen生成ID不是付費provider receipt，不能由此推導模型seed、精確材質、面數或投影。

## 實際對位檢查與校準

四張最終PNG均1536×1024；只讀RGB閾值量測完整人物邊界（min channel<215且channel range>8），沒有改像素。每張三視圖的頭頂／鞋底最大差：Jax 2／0px、Vee 0／0px、Skye 2／2px、Niko 0／3px。這只是剪影外界量測，不是關節或三維一致性驗收。原PNG沒有達成提示詞中的精確座標／共用px/cm。

使用者在交付期間補充「不用幫我生成3D model」。因此取消額外Blender參考場景的交付；本輪產生的參考場景／腳本／註冊JSON已從本工作分支移除，沒有製作角色網格。最終僅保留PNG、提示詞與只讀檢查紀錄。

剩餘限制：側視手臂投影及腕／胯／膝位置仍有生成偏差；臉有少量色面明暗，不能當實際unlit模型通過；髮型隱藏側、鎖鏈、衣鞋厚度及配件背面仍待建模統一。嚴格製作三視圖應從完成的同一模型再用正交相機輸出。本輪沒有角色網格、面數、骨架、動畫、碰撞或GPU遊戲驗收。

## 版本與接續

改動只含新PNG／提示詞、像素檢查及接續文件。原工作目錄main未修改，未合併／未發佈；本輪分支推送狀態以最後提交及遠端回報為準。既有角色文字文件繼續保持純文字，不插入圖像或換掉玩法資料。

後續待辦沿用 `CHAR-VISUAL-09`：本輪四張圖片待使用者評圖；圖內關節與隱藏部件尚未嚴格一致。不因本輪生圖自動開展3D製作。
