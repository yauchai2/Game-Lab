from pathlib import Path
import json,struct,math,hashlib
R=Path(__file__).resolve().parents[2];reg=json.loads((R/'assets/maps/series-registry.json').read_text())
def read(path):
 b=path.read_bytes();assert struct.unpack_from('<4sII',b)==(b'glTF',2,len(b));n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);blob=b[28+n:]
 def access(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];code,width={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];size={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*size);return [struct.unpack_from('<'+code*size,blob,off+j*stride) for j in range(a['count'])]
 return d,access
rows=[]
for r in reg['maps']:
 variants=[];signatures=[]
 for key in ['model','white']:
  path=R/r[key];d,a=read(path);assert not d.get('images') and not d.get('textures') and not d.get('skins') and not d.get('animations');assert all('KHR_materials_unlit' in m.get('extensions',{}) for m in d['materials']);assert len({n['name'] for n in d['nodes']})==len(d['nodes'])
  count=0;sig=[]
  for mesh in d['meshes']:
   for p in mesh['primitives']:
    assert p.get('mode',4)==4 and 'COLOR_0' in p['attributes'];assert not any(k.startswith('TEXCOORD') for k in p['attributes']);pos=a(p['attributes']['POSITION']);colors=a(p['attributes']['COLOR_0']);idx=[v[0] for v in a(p['indices'])];assert all(math.isfinite(x) for q in pos+colors for x in q)
    for i in range(0,len(idx),3):
     aa,bb,cc=[pos[k] for k in idx[i:i+3]];u=[bb[k]-aa[k] for k in range(3)];v=[cc[k]-aa[k] for k in range(3)];cr=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert sum(x*x for x in cr)>1e-16,(r['id'],key,mesh['name'],i)
    count+=len(idx)//3;sig.append((pos,idx))
  assert count<=30000;signatures.append(sig);variants.append({'file':r[key],'triangles':count,'meshes':len(d['meshes']),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 assert signatures[0]==signatures[1],r['id'];rows.append({'id':r['id'],'name':r['name'],'variants':variants,'whiteMatchesGeometry':True})
(R/'docs/floating-island-redesign/series-asset-validation.json').write_text(json.dumps({'rows':rows,'maps':len(rows),'textures':0,'unlit':True,'scope':'Project GLB policy; all44 portable GLBs validated, not device performance.'},ensure_ascii=False,indent=2)+'\n');print('PASS',len(rows),'maps /',len(rows)*2,'portable GLBs')
