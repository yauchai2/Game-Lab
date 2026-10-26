"""Self-contained full-style preview; browser persistence is page-lifetime memory."""
from pathlib import Path
import re,hashlib,json
root=Path(__file__).resolve().parents[2];page=(root/'index.html').read_text();sources={}
def inline(m):
 path=m[1];s=(root/path).read_text();sources[path]=hashlib.sha256(s.encode()).hexdigest();s=re.sub(r'\b(?:localStorage|sessionStorage)\b','styleStorage',s)
 if '</script' in s.lower():raise ValueError(path)
 return '<script>\n'+s+'\n</script>'
page=re.sub(r'<script\s+src="([^"]+)"\s*></script>',inline,page)
bootstrap='<script>const styleStorage=(()=>{const m=new Map();return{getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}})();</script>'
page=page.replace('<head>','<head>'+bootstrap,1)
page=page.replace('<title>Idle Hero</title>','<title>Idle Hero｜街頭風格整合預覽</title>',1)
(root/'dist/street-style-preview.html').write_text(page)
(root/'docs/style-complete/source-hashes.json').write_text(json.dumps(sources,indent=2)+'\n')
print('Built isolated style preview')
