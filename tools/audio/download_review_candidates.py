from pathlib import Path
from html.parser import HTMLParser
import subprocess,re,json,hashlib,concurrent.futures
R=Path.cwd();D=R/'assets/audio-review/candidates';D.mkdir(parents=True,exist_ok=True);out=Path('/workspace/audio-review-downloads');out.mkdir(exist_ok=True)
items=[('funky-menu','https://opengameart.org/content/funky-menu-loop','Funky Menu Loop','iamoneabe','funkymenuloop_0.mp3'),('wednesday-night','https://opengameart.org/content/wednesday-night-funk-fusion','Wednesday Night [Funk Fusion]','Zane Little Music','wednesday_night_0.mp3'),('midnight-cruiser','https://opengameart.org/content/midnight-cruiser','Midnight Cruiser','Zane Little Music','midnight_cruiser_0.mp3'),('november-snow','https://opengameart.org/content/november-snow','November Snow','cynicmusic',None),('kenney-interface','https://kenney.nl/assets/interface-sounds','Interface Sounds','Kenney',None),('kenney-impact','https://kenney.nl/assets/impact-sounds','Impact Sounds','Kenney',None)]
class P(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,t,a):
  for k,v in a:
   if k=='href' and v:self.links.append(v)
def get(url,path):subprocess.run(['curl','-fLsS','--retry','2',url,'-o',str(path)],check=True)
def run(item):
 id,url,title,author,name=item;html=out/(id+'.html');get(url,html);s=html.read_text();assert 'CC0' in s or 'cc0' in s,id;p=P();p.feed(s)
 if name:asset='https://opengameart.org/sites/default/files/'+name
 else:asset=next(v for v in p.links if v.startswith('https://') and (v.endswith('.zip') if id.startswith('kenney') else v.lower().endswith(('.ogg','.mp3'))))
 raw=out/(id+Path(asset).suffix);get(asset,raw)
 return {'id':id,'title':title,'author':author,'page':url,'download':asset,'license':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'sourceBytes':raw.stat().st_size,'pageSha256':hashlib.sha256(html.read_bytes()).hexdigest(),'originalLocalPath':str(raw),'downloadedFor':'review only; not admitted to production','assessment':'metadata shortlist; human listening pending'}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:rows=list(ex.map(run,items))
(R/'docs/audio-reference-review/online-sources.json').write_text(json.dumps({'checkedDate':'2026-10-27 Asia/Taipei','sources':rows},indent=2)+'\n')
print([(r['id'],r['sourceBytes']) for r in rows])
