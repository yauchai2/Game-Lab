"""Verify a built site's manifest and every referenced script over HTTPS."""
from pathlib import Path
import argparse,concurrent.futures,hashlib,json,subprocess,time
p=argparse.ArgumentParser();p.add_argument('site',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args();expected=json.loads((a.site/'version.json').read_text());base='https://yauchai2.github.io/Game-Lab/'
def get(name):return subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2',base+name+'?verify='+str(time.time_ns())])
actual=json.loads(get('version.json'));assert actual==expected,'Live manifest is not the requested source yet'
items=[('index.html',expected['sha256'])]+list(expected['assets'].items())
def check(item):
 name,want=item;data=get(name);got=hashlib.sha256(data).hexdigest();assert got==want,(name,got,want);return {'name':name,'bytes':len(data),'sha256':got}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(check,items))
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps({'version':expected['version'],'source':expected['commit'],'manifestMatches':True,'standalone_sha256':expected['standalone_sha256'],'files':rows,'tls':'curl default verification; not disabled'},indent=2)+'\n');print('PASS HTTPS manifest and',len(rows),'files')
