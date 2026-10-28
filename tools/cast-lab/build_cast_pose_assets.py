"""Append authored group portrait/selection clips to four existing skinned GLBs."""
from pathlib import Path
import json,struct,hashlib
R=Path(__file__).resolve().parents[2];D=R/'docs/3d-cast-death-audio';O=R/'assets/characters/cast-preview/models';O.mkdir(exist_ok=True)
rows=[]
for pose in json.loads((D/'cast-pose-keyframes.json').read_text())['poses']:
 model=pose['model'];src=R/'assets/style-flat/characters'/(model+'.glb');b=src.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);binary=bytearray(b[28+n:28+n+d['buffers'][0]['byteLength']]);nodeBy={n['name']:i for i,n in enumerate(d['nodes'])if'name'in n};roots=d['scenes'][d.get('scene',0)]['nodes'];pivot=len(d['nodes']);d['nodes'].append({'name':model+'_CastFloor','children':list(roots)});d['scenes'][d.get('scene',0)]['nodes']=[pivot]
 def add(values,kind,count):
  while len(binary)%4:binary.append(0)
  off=len(binary);raw=struct.pack('<'+'f'*len(values),*values);binary.extend(raw);vi=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(raw)});a={'bufferView':vi,'componentType':5126,'count':count,'type':kind}
  if kind=='SCALAR':a.update(min=[min(values)],max=[max(values)])
  ai=len(d['accessors']);d['accessors'].append(a);return ai
 for name,frames in [('CastPose',[{'time':0,'bones':pose['base']},{'time':2.4,'bones':pose['base']}]),('CastSelect',pose['selection'])]:
  samplers=[];channels=[];ti=add([f['time']for f in frames],'SCALAR',len(frames))
  for bone in pose['base']:
   for key,path,kind in [('q','rotation','VEC4'),('p','translation','VEC3')]:
    ai=add([v for f in frames for v in f['bones'][bone][key]],kind,len(frames));idx=len(samplers);samplers.append({'input':ti,'output':ai,'interpolation':'LINEAR'});channels.append({'sampler':idx,'target':{'node':nodeBy[bone],'path':path}})
  ai=add([v for _ in frames for v in [0,pose['floorTranslation'],0]],'VEC3',len(frames));idx=len(samplers);samplers.append({'input':ti,'output':ai,'interpolation':'LINEAR'});channels.append({'sampler':idx,'target':{'node':pivot,'path':'translation'}});d['animations'].append({'name':name,'samplers':samplers,'channels':channels})
 d['buffers'][0]['byteLength']=len(binary);j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4);out=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary;dest=O/(model+'.glb');dest.write_bytes(out);rows.append({'character':pose['id'],'model':model,'source':str(src.relative_to(R)),'sourceSha256':hashlib.sha256(b).hexdigest(),'file':str(dest.relative_to(R)),'sha256':hashlib.sha256(out).hexdigest(),'bytes':len(out),'addedClips':['CastPose','CastSelect'],'selectionDuration':.85,'boneCount':len(d['skins'][0]['joints']),'geometryAndSkinUnchanged':True})
(O/'manifest.json').write_text(json.dumps({'base':'641c43d','authorship':'Existing user-supplied meshes plus locally authored group portrait and gesture tracks. No AI images or external animations.','scope':'Candidate clips for the four-person group; original game assets untouched.','models':rows},indent=2)+'\n');print('Built4 portable pose/selection GLBs; existing geometry,skins,materials and native clips preserved')
