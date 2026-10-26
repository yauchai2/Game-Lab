"""Check textureless catalog and exact source character/gear geometry invariants."""
from pathlib import Path
import struct,json,math,hashlib
ROOT=Path(__file__).resolve().parents[2]
def load(path):
 b=path.read_bytes();assert struct.unpack_from('<4sII',b)==(b'glTF',2,len(b));n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);blob=b[28+n:]
 def access(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];code,width={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*size)
  return [struct.unpack_from('<'+code*size,blob,off+j*stride) for j in range(a['count'])]
 return d,access
reports=[]
for path in sorted((ROOT/'assets/monsters').glob('**/*.glb')):
 if path.name in ['native.glb','M04-native.glb']:continue
 d,access=load(path);assert not d.get('images') and not d.get('skins')
 assert all('KHR_materials_unlit'in m['extensions'] for m in d['materials']);assert len({n['name'] for n in d['nodes']})==len(d['nodes']);assert not any('matrix'in n for n in d['nodes'])
 count=0
 for m in d['meshes']:
  for p in m['primitives']:
   assert p.get('mode',4)==4 and 'COLOR_0'in p['attributes'];pos=access(p['attributes']['POSITION']);ids=[v[0] for v in access(p['indices'])];assert len(ids)%3==0
   for i in range(0,len(ids),3):
    a,b,c=[pos[k] for k in ids[i:i+3]];u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)];cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert sum(x*x for x in cross)>1e-18,(path,i)
   count+=len(ids)//3
 for animation in d['animations']:
  for s in animation['samplers']:
   assert s.get('interpolation','LINEAR') in ['LINEAR','STEP'];assert all(math.isfinite(x) for v in access(s['output']) for x in v)
 reports.append({'file':str(path.relative_to(ROOT)),'triangles':count,'meshes':len(d['meshes']),'textures':0,'degenerateTriangles':0,'clips':[a['name'] for a in d['animations']]})
assert len(reports)==12
flat=[]
for kind in ['characters','equipment']:
 for source in sorted((ROOT/'assets'/kind).glob('*.glb')):
  output=ROOT/'assets/style-flat'/kind/source.name;old,readold=load(source);new,readnew=load(output);assert not new.get('images') and not new.get('textures')
  assert old['nodes']==new['nodes'];assert [s['joints'] for s in old.get('skins',[])]==[s['joints'] for s in new.get('skins',[])]
  for om,nm in zip(old['meshes'],new['meshes']):
   for op,np in zip(om['primitives'],nm['primitives']):
    oi=[x[0] for x in readold(op['indices'])];ni=[x[0] for x in readnew(np['indices'])];assert len(oi)==len(ni)
    for key in ['POSITION','JOINTS_0','WEIGHTS_0']:
     if key in op['attributes']:
      a=readold(op['attributes'][key]);b=readnew(np['attributes'][key]);assert [a[i] for i in oi]==[b[i] for i in ni],(source,key)
    color=readnew(np['attributes']['COLOR_0']);assert all(color[ni[i]]==color[ni[i+1]]==color[ni[i+2]] for i in range(0,len(ni),3))
  assert [a['name'] for a in old.get('animations',[])]==[a['name'] for a in new.get('animations',[])]
  for oa,na in zip(old.get('animations',[]),new.get('animations',[])):
   assert oa['channels']==na['channels']
   for os,ns in zip(oa['samplers'],na['samplers']):
    for key in ['input','output']:assert readold(os[key])==readnew(ns[key])
  flat.append({'id':source.stem,'kind':kind,'positionsSkinTriangleOrderAndAnimationValues':'exactly preserved','textureImages':0,'flatColorPerTriangle':True})
assert len(flat)==20
(ROOT/'docs/style-complete/geometry-validation.json').write_text(json.dumps({'monsters':reports,'flatDerivatives':flat},indent=2)+'\n')
print('PASS: twelve unlit GLBs without degenerate triangles; 20 derivatives preserve exact positions, skin and animations')
