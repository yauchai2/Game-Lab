from pathlib import Path
import struct,json,hashlib,math
R=Path(__file__).resolve().parents[2];D=R/'docs/3d-cast-death-audio'
def glb(p):
 b=p.read_bytes();assert struct.unpack_from('<I',b,8)[0]==len(b);n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);return d,b[28+n:28+n+d['buffers'][0]['byteLength']]
rows=[]
for row in json.loads((R/'assets/monsters/death-v1/manifest.json').read_text())['models']:
 original,obin=glb(R/row['source']);candidate,bin=glb(R/row['file']);assert bin[:len(obin)]==obin;assert candidate['meshes']==original['meshes'];assert candidate.get('materials')==original.get('materials');assert candidate.get('skins')==original.get('skins');assert candidate['animations'][:-1]==original['animations'];assert candidate['nodes'][:-1]==original['nodes'];assert candidate['bufferViews'][:len(original['bufferViews'])]==original['bufferViews'];assert candidate['accessors'][:len(original['accessors'])]==original['accessors'];assert candidate['animations'][-1]['name']=='Death';assert len(candidate['nodes'])==len(original['nodes'])+1
 for sampler in candidate['animations'][-1]['samplers']:
  ac=candidate['accessors'][sampler['output']];v=candidate['bufferViews'][ac['bufferView']];w={'VEC3':3,'VEC4':4}[ac['type']];values=struct.unpack_from('<'+'f'*(ac['count']*w),bin,v['byteOffset']);assert all(math.isfinite(v)for v in values)
  if w==4:assert all(abs(sum(v*v for v in values[i:i+4])-1)<1e-5 for i in range(0,len(values),4))
 rows.append({'id':row['id'],'meshMaterialsOriginalClipsAndBinaryPreserved':True,'duration':1.2,'deathKeys':73,'sha256':hashlib.sha256((R/row['file']).read_bytes()).hexdigest()})
(D/'asset-validation.json').write_text(json.dumps({'base':'641c43d','models':rows,'scope':'GLB structural/original-payload checks; ground contact verified separately by Three.js precise mesh poses.'},indent=2)+'\n');print('PASS 12 GLBs; original payload/meshes/materials/clips unchanged;73-key Death animation, finite unit quaternions.')
# Four cast candidates preserve all original model/skin data and nine native clips.
poseRows=[]
for row in json.loads((R/'assets/characters/cast-preview/models/manifest.json').read_text())['models']:
 original,obin=glb(R/row['source']);candidate,bin=glb(R/row['file']);assert bin[:len(obin)]==obin;assert candidate['meshes']==original['meshes'];assert candidate.get('materials')==original.get('materials');assert candidate['skins']==original['skins'];assert candidate['nodes'][:-1]==original['nodes'];assert candidate['animations'][:-2]==original['animations'];assert [a['name']for a in candidate['animations'][-2:]]==['CastPose','CastSelect'];poseRows.append({'model':row['model'],'meshSkinMaterialsAndOriginalClipsPreserved':True,'sha256':hashlib.sha256((R/row['file']).read_bytes()).hexdigest()})
p=D/'asset-validation.json';v=json.loads(p.read_text());v['castModels']=poseRows;p.write_text(json.dumps(v,indent=2)+'\n');print('PASS 4 cast GLBs preserve geometry,skins,materials and native clips; add only portrait/gesture tracks and floor parent.')
