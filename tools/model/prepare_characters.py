#!/usr/bin/env python3
"""Blender 4.3: derive game meshes/skins/clips from Alan's Character.zip GLBs.
Usage: blender -b -t 4 --python tools/model/prepare_characters.py -- SOURCE_DIR OUTPUT_DIR
Never changes input. Authoring normals/UV retained through Blender decimation.
"""
import bpy, sys, math, json, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];source,out=map(Path,args);out.mkdir(parents=True,exist_ok=True)
IDS=['aki','milo','ping','null']; report=[]
# Three-like coordinates (X right, Y up, Z forward); Blender conversion below.
P={'hips':(0,12,0),'torso':(0,15.3,0),'head':(0,22,0),'hairBack':(0,23,-1),
 'armL':(-3.7,19.8,0),'foreL':(-4.6,16.5,.1),'handL':(-5.2,13.4,.3),
 'armR':(3.7,19.8,0),'foreR':(4.6,16.5,.1),'handR':(5.2,13.4,.3),
 'legL':(-2.6,12,0),'shinL':(-2.6,6.5,0),'footL':(-2.6,2,1),
 'legR':(2.6,12,0),'shinR':(2.6,6.5,0),'footR':(2.6,2,1)}
PAR={'hips':None,'torso':'hips','head':'torso','hairBack':'head',**{a+s:p+s if p!='torso' and p!='hips' else p for s in ['L','R'] for a,p in [('arm','torso'),('fore','arm'),('hand','fore'),('leg','hips'),('shin','leg'),('foot','shin')]}}
def xyz(p):return (p[0],-p[2],p[1])
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def pose(kind,t,c):
 # Euler deltas in the identical vertical rest axes, radians; authored per archetype.
 p={k:[0,0,0] for k in P};p['armL']=[.04,0,-.04];p['armR']=[-.12,0,.03]
 p['foreL']=[-.12,0,0];p['foreR']=[-.18,0,0]
 phase=t*2*math.pi
 if kind in ['idle','walk','run']:
  p['torso'][0]=.02+math.sin(phase)*.018;p['head'][1]=math.sin(phase*.5)*.035;p['hairBack'][0]=math.sin(phase+.6)*.025
  if kind!='idle':
   a=math.sin(phase)*(.34 if kind=='walk' else .58)
   for s,sg in [('L',1),('R',-1)]:
    p['leg'+s][0]=a*sg;p['shin'+s][0]=max(0,-a*sg)*1.15;p['foot'+s][0]=-max(0,-a*sg)*.35;p['arm'+s][0]=-a*sg*.5
   p['torso'][0]=.09 if kind=='walk' else .17
  if c=='milo':p['torso'][2]=math.sin(phase)*.035;p['head'][2]=math.sin(phase+.5)*.035
  if c=='null':p['foreL'][0]=-.45;p['foreR'][0]=-.55
 elif kind=='attack':
  wind=math.sin(math.pi*min(1,t/.36));strike=math.sin(math.pi*max(0,min(1,(t-.18)/.4)))
  if c=='aki':p['armR']=[-1.25*wind+.8*strike,0,.15*wind];p['foreR'][0]=-.65*wind;p['torso'][1]=-.32*wind+.5*strike;p['torso'][0]=.16*strike
  elif c=='milo':p['armL']=[-.8*wind,-.25*strike,-.4*wind];p['armR']=[-.9*wind,.3*strike,.35*wind];p['torso'][1]=.5*strike
  elif c=='ping':p['armR']=[-1.18*wind,0,.12];p['foreR'][0]=-.2*wind;p['armL']=[-.9*wind,0,-.35*wind];p['torso'][1]=-.12*wind
  else:p['foreL'][0]=-.95*wind;p['foreR'][0]=-1.15*wind;p['head'][0]=.12*wind;p['torso'][1]=-.16*wind
 elif kind=='cast':
  f=math.sin(math.pi*t/.8);p['armL']=[-.7*f,0,-.4*f];p['armR']=[-1.15*f,0,.25*f];p['foreR'][0]=-.7*f;p['head'][0]=-.08*f;p['torso'][1]=.16*f
 elif kind=='hurt':
  f=math.sin(math.pi*t/.32);p['torso'][0]=-.22*f;p['head'][0]=.2*f;p['armL'][2]=-.18*f;p['armR'][2]=.18*f
 elif kind=='dash':p['torso'][0]=.38;p['legL'][0]=-.7;p['legR'][0]=.6;p['shinR'][0]=.65;p['armL'][0]=.5;p['armR'][0]=.55
 elif kind=='death':
  f=smooth(0,.65,t);p['hips'][0]=1.32*f;p['torso'][0]=.14*f;p['head'][0]=.18*f;p['armL'][2]=-.24*f;p['armR'][2]=.24*f;p['shinL'][0]=.3*f;p['shinR'][0]=.25*f
 elif kind=='victory':
  f=math.sin(math.pi*t/1.2);p['armR']=[-2.3*f,0,.3*f];p['foreR'][0]=-.45*f;p['head'][2]=-.1*f
 return p
DURS={'idle':2.8,'walk':.85,'run':.58,'attack':.6,'cast':.8,'hurt':.32,'dash':.4,'death':.85,'victory':1.2}
for i,c in enumerate(IDS,1):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 for data in list(bpy.data.images):
  if data.name not in ['Render Result','Viewer Node']:bpy.data.images.remove(data)
 path=source/f'{i}.glb';bpy.ops.import_scene.gltf(filepath=str(path))
 mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.context.view_layer.objects.active=mesh;mesh.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 oldtris=sum(len(p.vertices)-2 for p in mesh.data.polygons)
 low=min(v.co.z for v in mesh.data.vertices);top=max(v.co.z for v in mesh.data.vertices);scale=32/(top-low)
 for v in mesh.data.vertices:v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-low)*scale))
 # Remove normal/specular/metallic textures, retaining baked colour; small matte materials.
 mat=mesh.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 base=bs.inputs['Base Color'];tex=next(l.from_node.image for l in base.links if l.from_node.type=='TEX_IMAGE')
 tex.scale(1024,1024);tex.file_format='JPEG';tex.filepath_raw=str(out/f'{c}-color.jpg');tex.save()
 for n in list(mat.node_tree.nodes):
  if n.type=='TEX_IMAGE' and n.image!=tex:mat.node_tree.nodes.remove(n)
 for name in ['Metallic','Roughness','Specular IOR Level']:
  inp=bs.inputs.get(name)
  if inp:
   for l in list(inp.links):mat.node_tree.links.remove(l)
   inp.default_value=.85 if name=='Roughness' else 0
 # Weld coincident geometry before collapse; imported UV-split triangles otherwise crack.
 bpy.context.view_layer.objects.active=mesh;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.0001);bpy.ops.object.mode_set(mode='OBJECT')
 mod=mesh.modifiers.new('Game silhouette 14k','DECIMATE');mod.ratio=min(1,14000/sum(len(p.vertices)-2 for p in mesh.data.polygons));mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 # Author an unconnected pivot hierarchy: every rest bone vertical so pose axes agree.
 arm=bpy.data.armatures.new(c+'_skeleton');rig=bpy.data.objects.new(c+'_rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;mesh.select_set(False);rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,p in P.items():
  b=arm.edit_bones.new(name);b.head=xyz(p);b.tail=Vector(b.head)+Vector((0,0,1));b.use_deform=True
 for name,parent in PAR.items():
  if parent:arm.edit_bones[name].parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT')
 # Region-constrained smooth weights. Head/hair stay rigid; knees/elbows have local blends.
 vg={k:mesh.vertex_groups.new(name=k) for k in P}
 pixels=list(tex.pixels);colors={}
 for loop in mesh.data.loops:
  uv=mesh.data.uv_layers.active.data[loop.index].uv;px=min(1023,max(0,int(uv.x*1024)));py=min(1023,max(0,int(uv.y*1024)));off=(py*1024+px)*4;colors[loop.vertex_index]=pixels[off:off+3]
 for v in mesh.data.vertices:
  x,y,z=v.co.x,v.co.z,-v.co.y;ax=abs(x);s='R' if x>0 else 'L'
  # Aki's long blue hair is behind shoulder/arm; keep it with head rather than sleeves.
  rgb=colors.get(v.index,[.5,.5,.5]);r,green,blue=rgb
  hair=c=='aki' and y>11.5 and (blue>r*1.18 and blue>green*1.05 or z<-2.5 and y>13)
  skin=r>green*1.08 and green>blue*1.05 and blue>r*.42 and green>r*.65
  arm_region=(y>13.4 and ax>3.9+(y-13)*.015 and y<20.8) or (10.2<y<14.5 and ax>4 and skin)
  if y>22 or hair:
   w={'head':1}
   if hair and y<22:w={'head':.3,'hairBack':.7}
  elif arm_region:
   if y<14.5:
    f=smooth(13.5,15.4,y);w={'hand'+s:1-f,'fore'+s:f}
   else:
    f=smooth(15.7,18.3,y);w={'fore'+s:1-f,'arm'+s:f}
  elif y<12.3:
   if y<3.2:w={'foot'+s:1}
   elif y<5:w={'foot'+s:1-smooth(3.2,5,y),'shin'+s:smooth(3.2,5,y)}
   else:
    f=smooth(5.3,8,y);w={'shin'+s:1-f,'leg'+s:f}
  else:
   f=smooth(12.5,16,y);w={'hips':1-f,'torso':f}
  for k,vw in w.items():
   if vw>0:vg[k].add([v.index],vw,'REPLACE')
 bpy.context.view_layer.objects.active=mesh;mesh.select_set(True);rig.select_set(False)
 weights=np.zeros((len(mesh.data.vertices),len(P)),dtype=np.float64)
 for v in mesh.data.vertices:
  for group in v.groups:weights[v.index,group.group]=group.weight
 edges=np.array([e.vertices[:] for e in mesh.data.edges],dtype=np.int32);counts=np.bincount(edges.ravel(),minlength=len(weights));counts=np.maximum(1,counts)[:,None]
 for iteration in range(10):
  total=np.zeros_like(weights);np.add.at(total,edges[:,0],weights[edges[:,1]]);np.add.at(total,edges[:,1],weights[edges[:,0]]);weights=.5*weights+.5*total/counts
 for row in weights:
  row[np.argsort(row)[:-4]]=0;row/=row.sum()
 mesh.vertex_groups.clear();vg={k:mesh.vertex_groups.new(name=k) for k in P}
 for vi,row in enumerate(weights):
  for bi,w in enumerate(row):
   if w>1e-5:vg[list(P)[bi]].add([vi],float(w),'REPLACE')
 am=mesh.modifiers.new('Character skin','ARMATURE');am.object=rig;mesh.parent=rig
 rig.animation_data_create()
 for kind,dur in DURS.items():
  action=bpy.data.actions.new(c+'_'+kind);rig.animation_data.action=action;action.use_fake_user=True
  for j in range(25):
   sec=j*dur/24;po=pose(kind,sec/dur if kind in ['idle','walk','run'] else sec,c)
   for name,pb in rig.pose.bones.items():
    pb.rotation_mode='XYZ';pb.rotation_euler=po[name];pb.keyframe_insert(data_path='rotation_euler',frame=sec*30+1,group=name)
   rig.pose.bones['hips'].location=(0,0,0)
   if kind=='death':rig.pose.bones['hips'].location=(0,-8*smooth(0,.65,sec),-1*smooth(0,.65,sec))
   rig.pose.bones['hips'].keyframe_insert(data_path='location',frame=sec*30+1,group='hips')
  for fc in action.fcurves:
   for kf in fc.keyframe_points:kf.interpolation='LINEAR'
  track=rig.animation_data.nla_tracks.new();track.name=kind;strip=track.strips.new(kind,1,action);track.mute=True
 rig.animation_data.action=None
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
 bpy.context.scene.render.fps=30;bpy.context.scene.frame_set(1)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 dest=out/f'{c}.glb'
 bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_materials='EXPORT',export_image_format='JPEG',export_jpeg_quality=88,export_yup=True)
 rec={'id':c,'source':f'Character/glb/{i}.glb','source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source_triangles':oldtris,'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'vertices':len(mesh.data.vertices),'bones':len(P),'animations':list(DURS),'texture':[1024,1024],'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()};report.append(rec);print('CHARACTER_READY',json.dumps(rec),flush=True)
 # Keep editable authoring scene and a neutral rest pose for diagnosis outside the runtime.
 bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{c}.blend'))
(out/'manifest.json').write_text(json.dumps({'provenance':'User supplied Character.zip; derived locally, originals unchanged. No third-party generation.','pipeline':'Blender 4.3.2 decimate, original UV/base-colour, region-constrained weights; procedural authored clips.','assets':report},indent=2)+'\n')
