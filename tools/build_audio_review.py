from pathlib import Path
import json,base64,html,argparse
parser=argparse.ArgumentParser(description='Build a standalone audio review from a checkout')
parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1])
parser.add_argument('--output',type=Path)
args=parser.parse_args()
root=args.source.resolve();meta=json.loads((root/'src/audio/provenance.json').read_text())['sources']
names={'drift':'橫街午後','haze':'末班之後','underpass':'機房走廊','rush':'失常頻道','radio':'電台開機','hit':'普通命中','crit':'會心命中','kill':'精怪倒下','hurt':'角色受擊','die':'角色倒下','fire':'過熱電池','boom':'重擊／爆破','frost':'冷氣爆發','chain':'連鎖放電','meteor':'衛星落下','pick':'一般拾取','rare':'稀有發現','lvl':'升級','card':'裝配／選取','snap':'接線吸附','ph_open':'打開裝置','ph_on':'裝置啟動','ph_key':'按鍵','ph_tab':'切換頁籤','ph_zoom':'放大','ph_zoomout':'縮小','ph_off':'關閉裝置','stair':'登階','season':'季節訊號','pulse':'重低音脈衝','magnet':'磁力聚集','spam':'訊息連發','flicker':'瞬步／閃擊','beam':'雷射掃射','arrows':'箭雨','summon':'巡弋裝置召喚','rift':'裂隙開啟','resonance':'共鳴和弦'}
def audio(path,loop=False):return '<audio controls preload="none" '+('loop ' if loop else '')+'src="data:audio/mpeg;base64,'+base64.b64encode(path.read_bytes()).decode()+'"></audio>'
sections=[]
for item in meta:
 key=Path(item['asset']).stem
 if item['kind']!='music':continue
 old=root/'assets/audio-legacy'/item['asset'];body='<h2>'+names[key]+'</h2><p>'+str(item['bpm'])+' BPM · '+str(item['bars'])+' 小節循環</p><span>目前音訊</span>'+audio(root/'src/audio'/item['asset'],True)
 if old.exists():body+='<details><summary>比較封存 v0.64 的同場景配樂</summary>'+audio(old,True)+'</details>'
 sections.append('<article>'+body+'</article>')
sfx=[]
for item in meta:
 if item['kind']!='sfx':continue
 key=item['event'];sfx.append('<article class="cue"><h3>'+html.escape(names[key])+'</h3>'+audio(root/'src/audio'/item['asset'])+'</article>')
page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>街角電台｜音樂與音效試聽</title><style>
*{box-sizing:border-box}body{margin:0;background:#e8eaf6;color:#24344c;font:16px/1.6 system-ui,sans-serif}header,main{max-width:1100px;margin:auto;padding:24px}header{border-bottom:2px solid #a7abc9}h1{font-size:28px;margin:0 0 8px}h2{font-size:20px;margin:0}h3{font-size:16px;margin:0 0 8px}p{margin:8px 0 16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:32px}article{padding:18px;border:1px solid #a7abc9;border-top:5px solid #7265a6;border-radius:8px;background:#fafbff}article p,summary,span{font-size:14px;color:#4a5670}audio{width:100%;margin-top:8px}details{margin-top:14px}button{background:#344c75;color:white;border:0;border-radius:6px;padding:10px 18px;font:inherit;cursor:pointer}label{display:inline-flex;align-items:center;gap:10px;margin:12px 18px 0 0}input{width:150px}@media(max-width:400px){header,main{padding:16px}}
</style><header><h1>街角電台：音樂與音效試聽</h1><p>街頭碎拍、柔和電鋼琴、厚低音與硬件聲響。五段配樂及全部基礎音效可逐一試聽；部分配樂可展開比較 v0.64。此音訊已由 PR90 納入正式版；本頁供逐段試聽，主觀聽感與真機驗收仍待完成。</p><button id="stop">全部停止</button><label>試聽音量 <input id="volume" aria-label="試聽音量" type="range" min="0" max="1" step="0.05" value="0.65"></label></header><main><h2>配樂</h2><p>日間、夜間、機房、首領與開場，使用同一套原創音色及和聲語言。</p><div class="grid">'''+''.join(sections)+'''</div><h2>音效</h2><p>單獨試聽與戰鬥中的混音音量不同；遊戲會限制疊音，重要回饋會暫時壓低配樂。</p><div class="grid">'''+''.join(sfx)+'''</div><p>新素材為本專案原創合成，沒有擷取參考影片的錄音。舊版對照曲：symphony、TokyoGeisha、Juhani Junkala（CC0）。技術量測及瀏覽器測試不等同主觀聽感已驗收。</p></main><script>const all=[...document.querySelectorAll('audio')];for(const a of all){a.volume=.65;a.addEventListener('play',()=>{for(const b of all)if(a!==b)b.pause()})}document.querySelector('#volume').oninput=e=>all.forEach(a=>a.volume=Number(e.target.value));document.querySelector('#stop').onclick=()=>all.forEach(a=>{a.pause();a.currentTime=0});</script></html>'''
(args.output or root/'dist/street-audio-review.html').write_text(page)
print('Built self-contained 5-track / 33-cue audio review')
