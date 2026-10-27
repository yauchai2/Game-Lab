"""Static policy checks for FI02 portable GLBs; does not prove gameplay or FPS."""
from pathlib import Path
import json,struct,math,hashlib,argparse
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--map',choices=['fi01','fi02'],default='fi02');args=parser.parse_args();stem={'fi01':'fi01-corner-park','fi02':'fi02-record-lane'}[args.map];A=ROOT/'assets/maps'/stem;files=[stem+'.glb',stem+'-blockout.glb' if args.map=='fi01' else 'fi02-blockout.glb']
def load(p):
 b=p.read_bytes();assert struct.unpack_from('<4sII',b)==(b'glTF',2,len(b));n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);blob=b[28+n:]
 def acc(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];code,w={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];z={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',w*z)
  return [struct.unpack_from('<'+code*z,blob,start+j*stride) for j in range(a['count'])]
 return d,acc,blob
reports=[];signatures=[]
for name in files:
 d,acc,blob=load(A/name);assert not d.get('images') and not d.get('textures') and not d.get('animations') and not d.get('skins');assert len(d['materials'])==1
 assert all('KHR_materials_unlit' in m['extensions'] for m in d['materials']);assert len({n['name'] for n in d['nodes']})==len(d['nodes'])
 tri=0;signature=[];colors=set()
 for m in d['meshes']:
  for p in m['primitives']:
   assert p.get('mode',4)==4;assert 'COLOR_0' in p['attributes'] and 'COLOR_1' not in p['attributes'];assert not any(k.startswith('TEXCOORD') for k in p['attributes'])
   pos=acc(p['attributes']['POSITION']);ids=[v[0] for v in acc(p['indices'])];c=acc(p['attributes']['COLOR_0']);colors.update(c)
   assert all(math.isfinite(x) for q in pos+c for x in q);assert len(ids)%3==0
   for k in range(0,len(ids),3):
    a,b,c=[pos[i] for i in ids[k:k+3]];u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)];cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert sum(x*x for x in cross)>1e-16
   tri+=len(ids)//3;signature.append((pos,ids))
 assert tri<30000
 signatures.append(signature)
 native=name.replace('.glb','-native.glb') if args.map=='fi01' else ('fi02-native.glb' if name==files[0] else 'fi02-blockout-native.glb')
 assert blob==load(A/native)[2]
 reports.append({'file':name,'triangles':tri,'meshes':len(d['meshes']),'materials':len(d['materials']),'textures':0,'unlit':True,'distinctColors':len(colors),'normalizationPreservesBinary':True,'bytes':(A/name).stat().st_size,'sha256':hashlib.sha256((A/name).read_bytes()).hexdigest()})
assert signatures[0]==signatures[1]
l=json.loads((A/'layout.json').read_text());assert l==json.loads((ROOT/('tools/maps/'+args.map+'-layout.json')).read_text());p=l['footprint'];area=abs(sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p))))/2
r={'models':reports,'whiteColorPositionsAndTopologyIdentical':True,'layoutMatchesGenerator':True,'footprintAreaMeters2':area,'scope':'Original local Blender geometry and explicit glTF unlit/color policy; no game-dev canonical package claim.'}
(ROOT/('docs/floating-island-redesign/'+args.map+'/asset-validation.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
