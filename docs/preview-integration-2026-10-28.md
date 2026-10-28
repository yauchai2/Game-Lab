# Preview 整合及部署方案（待部署流程批准）

2026-10-28，Asia/Hong_Kong。Alan要求將已查核的音樂／序章等更新推到 /preview/。來源基底 main641c43d51601f9f3ed12a76bcf943238753c53b4；任務分支 codex/preview-integrate-20261028。

## 本次整合範圍

- 最新PR120音樂用途：開始／選角After Midnight，工業／塔樓Space Ranger，普通精英不再強制跳rush；保留日間／夜間／Boss。候選目前443703b。
- PR107音訊生命週期及常用音效按需逐項移植，保留SYS換曲記錄及現行存檔修復；不得用舊分支整包取代main。
- PR115／118序章共同像素裝飾及第三頁舊背景移除，保留原故事／字幕／計時／跳過owner。
- PR120四人同場選角與選中短動作接入既有INTRO及原生模型，不用第二套角色／存檔狀態。
- 開發頻道只更新 /preview/，不改正式根目錄、不建正式Release、不移tag、不刪原有分支、不合併main。

## 驗證及發佈方法

本機Git DNS失敗、gh憑證失效；GitHub連接仍可讀寫。擬由GitHub runner在本分支下載完整來源，使用Node22／Chromium及Python，重建pack_audio／build並驗證音樂路由、靜音／退出取消、三頁序章、四人選角、名字保留、建立與返回、存檔相容及分段啟動。未通過不部署。

原提案新增 .github/workflows/preview-integration.yml，觸發僅限本任務分支的相關檔案推送；contents:write用於同步已驗證的生成產物及gh-pages，pages:write用於請求Pages重新建置。執行tools/publish_pages.py --preview；部署後核對preview manifest／入口／各腳本SHA及正式根目錄未變，並記錄結果。

自動審核已拒絕啟用此workflow，理由：持續存在的寫入／自動部署能力超出單次部署授權。不繞過拒絕，workflow未建立。本提案改為請Alan明確批准只供本次整合驗證及部署暫用，完成後移除新增workflow；未獲批准前不啟用。

## 實際狀態

已建立獨立任務分支並保存本提案；沒有修改遊戲程式、沒有完成整合測試或打包、沒有部署preview、沒有改main或正式網站。上方為待執行方案，不是完成報告。

## 最新交接授權與入口

Alan最新批准原文：「批准將完整交接摘要（含歷史內容）推到 yauchai2/Game-Lab 的任務分支」。已同步[完整交接摘要](full-handoff-2026-10-28.md)及[session-checkpoint](session-checkpoint.md)，保留歷史、來源差異、拒絕原因與未完成工作。此批准僅涵蓋交接文件同步，尚未批准本文件先前提出的workflow；本次沒有修改runtime、啟用workflow或部署網站。
