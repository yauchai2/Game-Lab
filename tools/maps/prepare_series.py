"""Assemble 22 asset layouts with stable biome IDs and a six-chapter route."""
from pathlib import Path
import json,struct,hashlib
R=Path(__file__).resolve().parents[2];rows=json.loads((R/'docs/floating-island-redesign/map-list.json').read_text())['maps'];built=json.loads((R/'docs/floating-island-redesign/series-build-index.json').read_text());byid={r['id']:r['stem'] for r in built};byid.update(FI01='fi01-corner-park',FI02='fi02-record-lane')
JOURNALS={
 'FI01':('公園裡的試音','公共收音機','候車亭照常有人用，公共收音機卻反覆收到前街試音。沿唱片店標誌去找阿夏。'),
 'FI02':('前街的重複節拍','唱片試音攤','阿夏保留那截天線零件，請你沿帶著車鈴的試音追查橋下接口。'),
 'FI03':('橋墩後的車鈴','小禾的修理桌','小禾仍在替街坊修理。先找回車鈴，隔離橋墩旁的回音接口，不要關掉整條街的電。'),
 'FI04':('雨棚下的回覆','轉播接口','雨水沿排水槽流走，候車提示卻還在重播。核對接口，帶回橋下修理攤處理。'),
 'FI05':('商店街的晚間頻道','街頭試播牌','商店還亮著燈，招牌的試音混入夜市點餐。沿聲音找到老闆娘。'),
 'FI06':('點餐與報站','夜市收音機','客人照常等餐，收音機卻報出月台提示。歸還設備，讓點餐聲回到攤前。'),
 'FI07':('休業店廊的餘音','留言設備','商場雖已休業，清潔員仍留著通道。收起錯頻招牌的回音，別阻住回家的路。'),
 'FI08':('末班車的提示','站務廣播亭','站務員需要找回麥克風，把月台提示與試播時間對上，讓乘客照常趕上末班。'),
 'FI09':('河邊的工作節拍','工場量測台','鐵工廠仍在趕工，工人先把試音箱移離機具。核對訊號，不中斷日常供電。'),
 'FI10':('配送箱裡的呼號','貨運派送台','碼頭照常收貨，錯送試播箱卻令廣播排程混亂。按標記比對真正的收件站。'),
 'FI11':('候船口的那一句','候船收音機','阿澄保留正常船班提示，另錄下錯頻的半句報站。將它交回站務員核對。'),
 'FI12':('巡線站的方向','補給與接線桌','巡線員先確認電力仍正常；需要修正的是山路發射機的試音排程。'),
 'FI13':('雪線上的熱水','值班補給亭','值班員替巡線的人留了熱水與試播機，確認下山訊息能完整送出。'),
 'FI14':('石壁間的回音','採石場工具棚','工具仍收在棚裡，回音讓錯頻聽起來更近。沿維修標記追查地下轉播站。'),
 'FI15':('忘記撤下的試音','舊發射機','小禾用鑰匙打開發射機，修正「暑假最後一天」的舊排程；最後還要回屋頂確認各站。'),
 'FI16':('風管旁的接線','屋頂檢修亭','維修人員先保留冷氣供電，把試播線和控制線分開，再往上送出回覆。'),
 'FI17':('各站輪流回覆','中繼量測台','讓候船、點餐與報站各自回覆；不把每個頻道改成同一首歌。'),
 'FI18':('今晚各自的歌','電台試音桌','各站設備已各歸其位。完成最後一輪試音，讓街區保留自己的日常聲音。')}
entries=[]
for row in rows:
 id=row['id'];stem=byid[id];folder=R/'assets/maps'/stem;L=json.loads((folder/'layout.json').read_text());L['id']=id;L['name']=row['name'];L['stem']=stem;L['legacyBiomeIndex']=row['legacyBiomeIndex'];L['chapter']=row['chapter'];L['profile']=row['legacyBiomeIndex'] if row['legacyBiomeIndex'] is not None and row['legacyBiomeIndex']<18 else -1
 if id in JOURNALS:
  title,site,text=JOURNALS[id];L['journal']={'title':title,'site':site,'contact':{1:'唱片店 阿夏',2:'修理工 小禾',3:'夜市老闆娘',4:'河邊站務員',5:'巡線員與小禾',6:'街角電台的大家'}[row['chapter']],'activity':text,'return':'訊號已恢復，各站仍可各自選台。請保留日常設備的供電與通道。'}
 if 'occluderNodes' not in L:L['occluderNodes']=['PROP_tree_left','PROP_tree_right','GEO_corner','GEO_record','GEO_laundry','GEO_bridge']
 if 'visualZ' not in L:L['visualZ']=[-5.1,9.35] if id=='FI02' else [-4.7,7.6]
 white=stem+'-blockout.glb' if id!='FI02' else 'fi02-blockout.glb';model=folder/(stem+'.glb')
 entries.append({'id':id,'name':row['name'],'stem':stem,'model':str(model.relative_to(R)),'white':str((folder/white).relative_to(R)),'layout':L,'sha256':hashlib.sha256(model.read_bytes()).hexdigest()})
route=['FI01','FI02','FI02','FI03','FI04','FI03','FI03','FI05','FI07','FI06','FI05','FI06','FI09','FI10','FI11','FI08','FI09','FI08','FI12','FI13','FI14','FI12','FI15','FI15','FI15','FI16','FI17','FI16','FI17','FI18','FI16','FI17','FI18','FI18','FI18']
(R/'assets/maps/series-registry.json').write_text(json.dumps({'version':1,'sourceBase':'4c90e05','status':'all22 authored model and isolated gameplay candidates; not released','route':route,'maps':entries},ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(entries),'islands and',len(route),'campaign depths')
