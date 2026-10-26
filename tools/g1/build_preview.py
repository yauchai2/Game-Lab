#!/usr/bin/env python3
"""Assemble the G1 review adapter around an explicit, unmodified game checkout."""
import argparse, hashlib, json, re, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=root);p.add_argument('--output',type=Path,default=root/'dist/g1-summer-street.html');a=p.parse_args();source=a.source.resolve()
base=subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()
material=(root/'assets/g1-summer/material-pack.js').read_text()
runtime=(root/'tools/g1/preview-runtime.js').read_text()
story=json.loads((root/'docs/g1-summer/story.json').read_text())
meta={'sourceCommit':base,'materialSha256':hashlib.sha256(material.encode()).hexdigest(),'storage':'page-lifetime memory','storyDirection':story['direction']}
bootstrap='<script>const g1Storage=(()=>{const m=new Map();return {getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}})();</script>'
def inline(match):
 path=match.group(1);code=(source/path).read_text()
 if path.endswith('06-main.js'):
  code=code.replace('const Q = new URLSearchParams(location.search);',"const Q = new URLSearchParams('fresh&lvl=12');")
  code=material+'\nconst G1_SOURCE='+json.dumps(meta,ensure_ascii=False)+';\nconst G1_STORY='+json.dumps(story,ensure_ascii=False)+';\n'+runtime+'\n'+code+'\ng1Start();\n'
 code=re.sub(r'\b(?:localStorage|sessionStorage)\b','g1Storage',code)
 if '</script' in code.lower():raise ValueError(path+' has script terminator')
 return '<script>\n'+code+'\n</script>'
page=re.sub(r'<script\s+src="([^"]+)"\s*></script>',inline,(source/'index.html').read_text())
page=page.replace('<head>','<head>'+bootstrap,1).replace('<title>','<title>G1 夏日街區｜',1)
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(page)
(root/'docs/g1-summer/build-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Built',a.output,'from',base)
