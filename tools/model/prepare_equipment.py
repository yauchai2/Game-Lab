#!/usr/bin/env python3
"""Derive small static meshes from the user's ZIP GLBs; originals stay outside repo.
blender -b -t 2 --python tools/model/prepare_equipment.py -- RAW_DIR OUTPUT_DIR
Outputs normalized GLBs, review thumbnails and a source/derived SHA-256 roster.
"""
import bpy,sys,json,hashlib,math
from pathlib import Path
from mathutils import Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
records=[]
for path in sorted(source.glob('*.glb')):
 dest=out/(path.stem+'.glb');receipt=out/(path.stem+'.json')
 if receipt.exists() and (out/(path.stem+'.png')).exists():records.append(json.loads(receipt.read_text()));continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(path))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 original=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 bounds=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 lo=Vector(tuple(min(v[i] for v in bounds) for i in range(3)));hi=Vector(tuple(max(v[i] for v in bounds) for i in range(3)));center=(lo+hi)/2;scale=1/max(hi-lo)
 for o in meshes:
  o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  for v in o.data.vertices:v.co=(v.co-center)*scale
  # Weld UV-split input before decimation to keep silhouette connected.
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001);bpy.ops.object.mode_set(mode='OBJECT')
  m=o.modifiers.new('Equipment budget','DECIMATE');m.ratio=min(1,3000/original);m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name)
  for mat in o.data.materials:
   if not mat or not mat.use_nodes:continue
   bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
   if not bs:continue
   keep={l.from_node for l in bs.inputs['Base Color'].links}
   for n in list(mat.node_tree.nodes):
    if n.type=='TEX_IMAGE':
     if n not in keep:mat.node_tree.nodes.remove(n)
     elif n.image:
      image=n.image;image.scale(512,512);image.file_format='JPEG';image.filepath_raw=str(out/(path.stem+'-color.jpg'));image.save()
   for key,value in [('Metallic',0),('Roughness',.8)]:
    for l in list(bs.inputs[key].links):mat.node_tree.links.remove(l)
    bs.inputs[key].default_value=value
  o.select_set(False)
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_image_format='JPEG',export_jpeg_quality=85)
 rec={'source':path.name,'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source_triangles':original,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in meshes),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
 receipt.write_text(json.dumps(rec,indent=2)+'\n');records.append(rec);print('EQUIPMENT_READY',json.dumps(rec),flush=True)
 # Textured thumbnail, same normalized geometry as exported runtime file.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False;scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,.9,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
 bpy.ops.object.light_add(type='AREA',location=(2,-3,4));bpy.context.object.data.energy=220;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4
 bpy.ops.object.camera_add(location=(1.25,-2,1.1));cam=bpy.context.object;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.5;scene.camera=cam
 scene.render.filepath=str(out/(path.stem+'.png'));bpy.ops.render.render(write_still=True)
(out/'roster.json').write_text(json.dumps(records,indent=2)+'\n')
