# 開始頁、序章與戰鬥動作：統一風格樣板及接入交接

2026-10-27，Asia/Hong_Kong。基底main `c67529d`。Alan要求：紙張／膠紙與像素圖一致；普通攻擊極輕晃動，大技才強；奔跑／閃避翻滾能實際看見；桌機／iPad開始頁重整構圖。

依 `docs/codex-sync-notes.md` 分工，本批只改tools／assets／docs，沒有改src／index／dist、版本、存檔、QA專區或部署。**可操作視覺樣板與診斷已完成；遊戲程式待原型討論串接入，新QA仍建立中。**本批不是PR107的直接合併，也不覆寫0.79系統記錄、詞綴修復及頻道規則。

## 先看結果

- [可操作且可離線的開始頁／三頁序章樣板](preview.html)：點擊、Enter／Space、左右鍵、返回、Escape；不讀寫遊戲存檔。
- [桌機開始頁](title-1366.png)、[iPad橫向](title-1024.png)、[iPad直向](title-768.png)、[手機](title-390.png)。
- [桌機序章](story-1366.png)、[iPad序章](story-1024.png)、[手機序章](story-390.png)。
- [四角色原生步行／奔跑／翻滾對照](native-motion-sheet.png)，[獨立檢查頁](native-motion-sheet.html)。這是現有動作的檢查，不是已上線的新動作。
- [舊版桌機開始頁](title-before-desktop.png)。

## 設計決定與全遊戲一致性

保留Ice Cream.mp4的青年街頭、清楚形狀、低面數及暮色城市；保留既有Logo、人物肢體比例、藍紫操作台與Cubic 11。這次統一的是畫面的取樣語言，不把3D全改成2D，不把所有資料文字截圖模糊化。

原序章用低解析圖片，外圍卻是全解析CSS斜轉紙張、膠紙、陰影；對角線與圖片格線沒有共同尺度。樣板將**圖片、紙、膠紙、影子、頁數小格**畫在同一個低解析畫布，最後一次nearest-neighbour放大。紙邊與膠紙有2格小切口，陰影3格、不模糊、不半透明疊出髒邊；取消紙張繪製後的CSS斜轉與多餘背景花紋。紙仍有生活感，不變成現代卡片。

文字與可操作控件保留原生Cubic 11／DOM，輸入、焦點、報讀、HUD精確數值不烘焙進圖；取消會造成反鋸齒的文字斜轉。紙張底部的caption對齊共同邏輯版面，觸控範圍至少44px。不要用`filter`蓋body／整個modal、逐幀DOM截圖或套全頁像素化補救。

同類裝飾套用同一策略：開始頁／載入頁背景與Logo、序章紙／膠紙／計時條、過場地名牌／貼條、遊戲內手記等裝飾各由既有owner使用共同像素surface規格。正常資料頁仍由UX_THEME／UX_MATERIAL_CSS管理銀灰藍紫裝置材質；不建立全遊戲第二套theme、不清除設定。其餘頁面需在整合分支抽查，不能以本樣板當作全部頁面已完成。

規格與調校提案的資料入口：[presentation-spec.json](../../assets/brand/hello-static/entry-polish/presentation-spec.json)。目前是交接資料，**不是已接上runtime的token owner**；接入時請把對應規則放回既有owner並同步DESIGN／UX-CONTRACT，不直接把樣板狀態管理複製進遊戲。

## 開始頁響應式

目前157×279直幅底圖使用`max(vw/157,vh/279)`填滿全部橫向畫面，桌機／iPad橫向會大幅放大與裁切，Logo也沿用過大的88vw。原生尺寸與可見比例在[native-inspection.json](native-inspection.json)，是幾何診斷，不是使用者真機資料。

新增[橫向屋頂原圖](../../assets/brand/hello-static/entry-polish/rooftop-wide-source.png)，以現有批准直幅背景為參考生成。右側保留人物、收音機、天線，左上留天空給原Logo與開始提示；沒有另畫一個Logo、文字、遊戲角色或卡通笑臉。此圖是本批新候選，不回寫／刪除原圖。

- 寬高比≥1.15用橫向素材，Logo約40%畫面寬、左側約7%、距頂21%。4:3採靠右／靠下cover，裁去較不重要的左側天空，保住人物／天線；不把第一列像素拉成垂直色柱，也不拉伸場景比例。
- 直向沿用原直幅圖，Logo約87%寬、距頂16%，開始提示近底部安全區；不為iPad直向強塞橫版。
- 裝飾畫布邏輯寬：寬版384、手機直向160、平板直向240；高由實際長寬比推導。所有元素先落在該格線，imageSmoothingEnabled=false後一併放大，不乘DPR抵銷像素感。
- 序章三頁由可用高度解布局，紙張含caption均在畫內；不沿用會把第三張推到螢幕外的固定百分比組合。320×740、390×844、768×1024、1024×768、1180×820、1366×768、1920×1080、844×390均檢查。

樣板為人工檢視而提供返回／翻頁，不新增正式存檔或另一套INTRO；接入仍用INTRO、uxOpenDialog及目前已確認的序章計時／跳過行為。可保留有意義的短入場，但不用白閃、無關星星／掃光或新的常駐位移來填空。

## 晃動：診斷與接入要求

`hitMon`將所有非「普通攻擊」來源視為skill，再以crit||skill視為heavy：普通攻擊kick1.05＋punch.25，普通暴擊／輕技能／中毒分類可到2.2＋punch.65。r3frame又把shake乘視窗尺度及每幀Math.random，所以同一事件在大螢幕更誇張。額外暴擊kick與技能命中kick也可能重複延長鏡頭效果。

[原生診斷](native-inspection.json)含實際`monsterPoisonTick → hitMon('中毒')`，其shake2.2／punch.65。燃燒現行tick直接扣血，**並非走這條命中函式**；不要把分類控制測試當成燃燒實際頻率。JSON的1440px普通20.4px／heavy42.8px是**衰減前理論單軸上限**，不是已錄製的真機逐幀位移。

建議以CSS像素而非視窗寬百分比表達鏡頭位移，普通命中0.45px／65ms、普通暴擊0.85px／80ms、輕技能1.2px／100ms、重擊3.2px／160ms、大技5px／200ms、Boss落地6.5px／220ms，硬上限8px。這是具體起始調校，尚未在正式戰鬥整合驗收。普通攻擊不縮放鏡頭、不全屏閃光；DoT完全不晃。

接入由kick／hitMon／r3frame唯一owner處理：分類讀技能ID與命中事件，不以顯示文字「不是普攻」或單看冷卻長短當作重擊。每次施放只在主落點／主斬觸發一次；多目標、毒tick、餘波、碎片不續抖、不加總。受擊依真正收到的生命比例分層；技能蓄力可有局部光效，強晃留給落點。位移採有衰減的短方向脈衝，不每幀隨機換方向。只動戰場相機，HUD與操作台不晃。

保留shake開關、減效／OS reduced motion、背景與離線抑制；不自動打開玩家關掉的設定。更新後測30秒密集自動戰鬥，及同一施放命中多怪的情況，避免小幅度效果因連續重設又變成常駐晃動。

## 奔跑與翻滾：已有素材，需修呈現連接

已用實際四個角色、九個既有clip與原生characterHeroLook做20格檢查；run約0.60秒、walk約0.87秒、dash約0.43秒。肢體與rig未改，沒有宣稱需要重做GLB。

原生控制測試：speed24的移動攻擊／移動施法仍選中run，因characterAnimate優先序在attack/cast前檢查speed>8；但heroActionLayer又先處理attack／cast而提前return，奔跑前傾可能消失。這是呈現狀態互相蓋住，不是沒有run clip。JSON記錄狀態與姿勢，並保留當下畫面投影尺寸（含裝備），不是自然遊玩頻率統計。

翻滾只由真實h.dash事件啟動；現有普通近戰閃避會設h.dash，但很多遠程／預警避讓不會，因此不能用一張翻滾圖宣稱玩家經常看得到。calm／減效也會停用整圈翻滾。原生四角色檢查證實四分之一、半圈、四分之三姿勢存在；沒有改閃避率、無敵幀、傷害、技能或AI。

原型接入：

1. 速度用實際地面位移／dt，不用撞牆仍非零的期望速度；跑步進入10、退出7，約120ms遲滯，減少不停walk/run切換。保留原跑步clip，用腿部步幅、前傾與落腳節奏表達，保持原四肢比例。
2. 清楚的優先序：死亡／冰凍與強受擊 → 真實閃避翻滾 → 施法／攻擊短前搖 → 跑／走／待機。移動攻擊可用上身action＋跑步腿層；若現有mixer不支援，先用有界短出手窗口，而非全段被speed搶掉。
3. 翻滾鎖定同一事件token完成約420ms的收身／轉體／落地／起身；h.dash在300ms清除不得把已開始的視覺中斷。以腰部附近為pivot避免像高空翻跟頭；從正常戰場鏡頭看完整一圈及清楚落地，不能只有放大檢查圖。
4. 先確保既有近戰成功閃避可見；若希望預警迴避也翻滾，由原型owner明確讓既有移動AI發出相同的dash事件，不增加閃避成功或無敵判定，不對所有遠程命中無條件翻滾。
5. 正常手機與桌機鏡頭各錄一次自然奔跑、一次真實成功閃避；設定減效時只留短側步／位置變化，不強行旋轉。相機只為辨識度做最小構圖調整，不能把22座島全部放大或裁掉地標來遮掩動作問題。

## 交接與驗證

原型程式owner：05ab-intro-logo／05ac-intro-comic／pack_pixel_art（開始頁與裝飾）；02-state／03-combat／04-render（impact）；characters-render（clip／action層）。保留syslog與存檔修復；由原型重新pack素材／font／syslog及build，不使用本批樣板直接覆寫src／index／dist。

已做：[preview-verification.json](preview-verification.json)的8尺寸×開始／三頁、所有caption／紙張邊界、共同raster、鍵盤／可見焦點、減少動態、禁用子資源網路的離線重播；[native-inspection.json](native-inspection.json)與[native-motion-frames.json](native-motion-frames.json)是現有程式診斷。已人工檢視桌機、iPad橫向及手機序章圖，修掉了樣板第一次的檢查鏡頭裁切與平板天空拉伸色柱。

重現命令（repo根目錄HTTP8826）：

```
python3 tools/build_entry_polish_preview.py
node tools/test_entry_polish_preview.cjs
node tools/inspect_entry_motion.cjs
node tools/capture_native_motion_sheet.cjs
```

新圖片生成與原檔／預覽hash：[manifest](../../assets/brand/hello-static/entry-polish/manifest.json)。原批准圖像／Logo／字型直接沿用來源資料，未修改；原OFL字型授權仍隨repo保留。

未執行新QA關卡、真機iPad／Safari、正式戰鬥調校後的自然觸發與長時間晃動驗收。前端技能的本機audit_project腳本未在此環境提供；未宣稱通過該靜態稽核。沒有改既有DESIGN／UX runtime契約，因本批是獨立樣板與交接；相關持久規則由原型接入時同批更新。
