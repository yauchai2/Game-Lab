"""Static GLB policy checks for the rigid unlit M04 runtime reader."""
from pathlib import Path
import struct,json,math,hashlib
root=Path(__file__).resolve().parents[2]/'assets/monsters/m04-low-frequency'
b=(root/'M04-low-frequency.glb').read_bytes()
assert struct.unpack_from('<4sII',b)==(b'glTF',2,len(b))
n,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a
doc=json.loads(b[20:20+n]);start=28+n
assert not any(doc.get(k) for k in ['textures','images','skins'])
assert len(doc['meshes'])==5
assert len({n['name'] for n in doc['nodes']})==len(doc['nodes'])
assert not any('matrix' in n for n in doc['nodes'])
assert all('KHR_materials_unlit' in m['extensions'] for m in doc['materials'])
def accessor(idx):
 a=doc['accessors'][idx];v=doc['bufferViews'][a['bufferView']]
 assert not v.get('byteStride') and not a.get('sparse')
 code={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
 size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 raw=struct.unpack_from('<'+code*a['count']*size,b,start+v.get('byteOffset',0)+a.get('byteOffset',0))
 assert all(math.isfinite(x) for x in raw)
 return [raw[i:i+size] for i in range(0,len(raw),size)]
triangles=0
for mesh in doc['meshes']:
 for p in mesh['primitives']:
  assert p.get('mode',4)==4 and not p.get('targets')
  assert 'COLOR_0' in p['attributes'] and not any(k.startswith('TEXCOORD') for k in p['attributes'])
  pos=accessor(p['attributes']['POSITION']);inds=[x[0] for x in accessor(p['indices'])]
  assert len(inds)%3==0
  for i in range(0,len(inds),3):
   a,c,d=[pos[j] for j in inds[i:i+3]];u=[c[k]-a[k] for k in range(3)];v=[d[k]-a[k] for k in range(3)]
   cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
   assert sum(x*x for x in cross)>1e-18,'Degenerate triangle'
  triangles+=len(inds)//3
assert triangles==1764
assert {a['name'] for a in doc['animations']}=={'Idle','Move','Hurt'}
scene_roots=set(doc['scenes'][doc.get('scene',0)]['nodes'])
for a in doc['animations']:
 for ch in a['channels']:
  s=a['samplers'][ch['sampler']];assert s.get('interpolation','LINEAR') in ['LINEAR','STEP']
  values=accessor(s['output'])
  if ch['target']['node'] in scene_roots and ch['target']['path']=='translation':
   assert max(v[0] for v in values)-min(v[0] for v in values)<1e-6
   assert max(v[2] for v in values)-min(v[2] for v in values)<1e-6
report={'glbSha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'meshes':5,'triangles':triangles,'materials':len(doc['materials']),'textures':0,'degenerateTriangles':0,'clips':[a['name'] for a in doc['animations']],'rootXZMotion':False,'nativeReaderPolicy':'pass; TRS, rigid meshes, packed accessors, vertex COLOR_0, LINEAR clips'}
(root/'static-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
