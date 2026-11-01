"""Append a ground-contact Death clip to canonical GLBs; never overwrite originals."""
from pathlib import Path
import json,struct,math,hashlib
import numpy as np
R=Path(__file__).resolve().parents[2];OUT=R/'assets/monsters/death-v1';OUT.mkdir(exist_ok=True)
FILES={'M01':'m01-battery-hopper/M01-battery-hopper.glb','M04':'m04-low-frequency/M04-low-frequency.glb',**{i:i.lower()+'/'+i+'.glb' for i in ['M02','M03','M05','M06','M07','M08','B01','B02','B03','B04']}}
PROFILES={'M01':('x',-1.43,.60,'向前失衡，插頭身體側倒'),'M02':('z',1.35,.62,'低身重心翻側，拖板接地'),'M03':('z',.48,.48,'滑翔失速落地，盤身傾斜'),'M04':('x',1.42,.68,'重音箱向前倒下，落地微震'),'M05':('z',-1.40,.62,'摺翼失衡，側身落地'),'M06':('z',.92,.78,'車身向一側壓下，重落地'),'M07':('x',-1.48,.62,'裝置向後翻倒，螢幕朝斜上'),'M08':('z',1.25,.60,'懸浮中止，燈體落地翻側'),'B01':('x',1.45,.84,'重型工頭前倒，停留後退場'),'B02':('z',-1.28,.88,'港務機失去支撐，側倒'),'B03':('x',-1.42,.86,'塔身後傾倒下，保持整體輪廓'),'B04':('z',1.38,.80,'終端身體失衡側倒')}
def mat(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);M=np.eye(4);M[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
smooth=lambda x: (lambda t:t*t*(3-2*t))(max(0,min(1,x)))
records=[]
for id,rel in FILES.items():
 src=R/'assets/monsters'/rel;b=src.read_bytes();js=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+js]);binary=bytearray(b[28+js:28+js+d['buffers'][0]['byteLength']]);roots=d['scenes'][d.get('scene',0)]['nodes'];points=[]
 def visit(i,parent):
  n=d['nodes'][i];m=parent@mat(n)
  if 'mesh' in n:
   for p in d['meshes'][n['mesh']]['primitives']:
    a=d['accessors'][p['attributes']['POSITION']];v=d['bufferViews'][a['bufferView']];assert a['componentType']==5126 and not v.get('byteStride');off=v.get('byteOffset',0)+a.get('byteOffset',0);p3=np.frombuffer(binary,dtype='<f4',count=a['count']*3,offset=off).reshape(-1,3);points.append((m@np.column_stack([p3,np.ones(len(p3))]).T).T[:,:3])
  for c in n.get('children',[]):visit(c,m)
 for root in roots:visit(root,np.eye(4))
 pts=np.concatenate(points);floor=float(pts[:,1].min());axis,angle,land,description=PROFILES[id];times=[i/60 for i in range(73)];rot=[];pos=[]
 for t in times:
  if t<.12:a=-angle*.055*math.sin(math.pi*t/.12)
  else:a=angle*smooth((t-.12)/(land-.12))
  if t>land:a-=angle*.035*math.sin(math.pi*min(1,(t-land)/.18))*max(0,1-(t-land)/.18)
  q=[0.,0.,0.,math.cos(a/2)];q['xyz'.index(axis)]=math.sin(a/2);rot.extend(q)
  if axis=='x':y=pts[:,1]*math.cos(a)-pts[:,2]*math.sin(a)
  else:y=pts[:,0]*math.sin(a)+pts[:,1]*math.cos(a)
  pos.extend([0.,floor-float(y.min()),0.])
 pivot=len(d['nodes']);d['nodes'].append({'name':id+'_DeathPivot','children':list(roots)});d['scenes'][d.get('scene',0)]['nodes']=[pivot]
 def add(values,kind,count):
  while len(binary)%4:binary.append(0)
  off=len(binary);raw=struct.pack('<'+'f'*len(values),*values);binary.extend(raw);view=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(raw)});a={'bufferView':view,'componentType':5126,'count':count,'type':kind}
  if kind=='SCALAR':a.update(min=[min(values)],max=[max(values)])
  idx=len(d['accessors']);d['accessors'].append(a);return idx
 ti=add(times,'SCALAR',len(times));ri=add(rot,'VEC4',len(times));pi=add(pos,'VEC3',len(times));d.setdefault('animations',[]).append({'name':'Death','samplers':[{'input':ti,'output':ri,'interpolation':'LINEAR'},{'input':ti,'output':pi,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':pivot,'path':'rotation'}},{'sampler':1,'target':{'node':pivot,'path':'translation'}}]});d['buffers'][0]['byteLength']=len(binary)
 d.setdefault('extras',{})['deathReview']={'version':1,'duration':1.2,'landTime':land,'description':description,'scope':'Presentation clip only; caller owns instance hover descent, fade and removal. Original meshes/materials/clips unchanged.'}
 raw=json.dumps(d,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);binary+=b'\0'*((-len(binary))%4);result=struct.pack('<III',0x46546c67,2,12+8+len(raw)+8+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary;dst=OUT/(id+'.glb');dst.write_bytes(result)
 records.append({'id':id,'source':str(src.relative_to(R)),'sourceSha256':hashlib.sha256(b).hexdigest(),'file':str(dst.relative_to(R)),'sha256':hashlib.sha256(result).hexdigest(),'bytes':len(result),'axis':axis,'angle':angle,'landTime':land,'duration':1.2,'description':description,'floor':floor,'vertices':len(pts),'originalClips':[a['name']for a in d['animations']if a['name']!='Death']})
(OUT/'manifest.json').write_text(json.dumps({'base':'641c43d','authorship':'Original project meshes plus Game-Lab authored death clip; no external motion samples.','scope':'Candidate asset package, not installed in production.','models':records},indent=2,ensure_ascii=False)+'\n')
print('Built',len(records),'non-destructive Death GLBs')
