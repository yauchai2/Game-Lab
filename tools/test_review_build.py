"""Parse complete HTML script elements: nested wiki HTML must not receive review controls."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess, tempfile
root=Path(__file__).resolve().parents[1]
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag=='script':self.inside=True;self.parts.append('')
 def handle_endtag(self,tag):
  if tag=='script':self.inside=False
 def handle_data(self,data):
  if self.inside:self.parts[-1]+=data
for name in ['idle-hero.html','idle-hero-review.html']:
 text=(root/'dist'/name).read_text();parser=Scripts();parser.feed(text)
 for script in parser.parts:
  with tempfile.NamedTemporaryFile(mode='w',suffix='.js') as f:
   f.write(script);f.flush();p=subprocess.run(['node','--check',f.name],capture_output=True,text=True);assert p.returncode==0,p.stderr
 print(name,':',len(parser.parts),'inline scripts syntax checked')
review=(root/'dist/idle-hero-review.html').read_text();assert "const SAVE_KEY = 'game-lab-review-032';" in review;assert "new URLSearchParams('fresh&lvl=12&give')" in review
assert review.count('<aside id="world-review-toolbar"')==1
prod=(root/'dist/idle-hero.html').read_text();assert 'world-review-toolbar' not in prod;assert "const SAVE_KEY = 'idle-hero-save-v2';" in prod
print('PASS review fixtures isolated; production toolbar and save key unchanged')
