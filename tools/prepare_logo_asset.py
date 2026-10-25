"""Blender CLI: --background --python tools/prepare_logo_asset.py -- SOURCE OUTPUT.
Create a separate bounded web derivative; never modify the supplied source.
"""
import bpy, sys, os, json, hashlib
from mathutils import Vector
source, output = sys.argv[sys.argv.index('--')+1:][:2]
if os.path.exists(output): raise RuntimeError('Refusing to overwrite existing derivative')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if len(meshes)!=1: raise RuntimeError('Expected the inspected single static logo mesh')
o=meshes[0]; bpy.context.view_layer.objects.active=o
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
# glTF front +Z becomes Blender -Y; center in world before normalizing width.
points=[o.matrix_world@Vector(c) for c in o.bound_box]
center=sum(points,Vector())/len(points); width=max(p.x for p in points)-min(p.x for p in points)
for v in o.data.vertices: v.co=(o.matrix_world@v.co-center)*(2/width)
o.matrix_world.identity()
original_triangles=sum(len(p.vertices)-2 for p in o.data.polygons)
mod=o.modifiers.new('Web silhouette budget','DECIMATE');mod.ratio=min(1,15000/original_triangles);mod.use_collapse_triangulate=True
bpy.ops.object.modifier_apply(modifier=mod.name)
# Existing UVs retain supplied artwork; small textures suit the 320px display.
material=o.active_material
for node in list(material.node_tree.nodes):
 if node.type=='NORMAL_MAP':
  for link in list(node.outputs[0].links): material.node_tree.links.remove(link)
 for socket in (node.inputs if node.type=='BSDF_PRINCIPLED' else []):
  if socket.name=='Normal':
   for link in list(socket.links): material.node_tree.links.remove(link)
for image in bpy.data.images:
 if image.size[0]>512 and image.name!='Render Result': image.scale(512,512)
# glTF exporter includes only connected maps; no tangent attribute or animation.
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_animations=False,export_tangents=False,export_materials='EXPORT')
receipt={'source_sha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'source_bytes':os.path.getsize(source),'source_triangles':original_triangles,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'vertices':len(o.data.vertices),'derived_bytes':os.path.getsize(output),'derived_sha256':hashlib.sha256(open(output,'rb').read()).hexdigest(),'texture_max':512,'source':'Alan supplied 3D logo','rights':'User supplied for this project; no third-party redistribution license asserted','changes':['center and normalize width','decimate to about 15000 triangles, preserve UVs','resize connected textures to max 512','remove normal map, retain base color and metallic/roughness maps'],'blender':bpy.app.version_string}
open(output+'.json','w').write(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print('LOGO_RECEIPT',json.dumps(receipt))
