"""Independently re-import the shipped GLB with Blender's stock glTF importer."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out/'M01-battery-hopper.glb'),merge_vertices=True)
scene=bpy.context.scene;scene.frame_set(0)
meshes=[o for o in scene.objects if o.type=='MESH']
assert len(meshes)==3
all_positions=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
assert all(math.isfinite(c) for p in all_positions for c in p)
low=[min(p[i] for p in all_positions) for i in range(3)]
high=[max(p[i] for p in all_positions) for i in range(3)]
triangles=0
for ob in meshes:ob.data.calc_loop_triangles();triangles+=len(ob.data.loop_triangles)
actions=[a.name for a in bpy.data.actions]
assert all(any(clip in a for a in actions) for clip in ['Idle','Hop','Hurt'])
assert triangles==684
assert len(bpy.data.images)==0
assert .0<=low[2]<.1 and 2.9<high[2]<3.1,(low,high)
report={'stock_blender_glTF_import':'passed','mesh_objects':len(meshes),'triangles':triangles,
 'image_textures':len(bpy.data.images),'bounds_blender_z_up':{'min':low,'max':high},'imported_actions':actions}
(out/'import-validation.json').write_text(json.dumps(report,indent=2))
print('IMPORT_VALIDATION',json.dumps(report))
