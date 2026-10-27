from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];rows=[]
for f in ['fi02-record-lane.glb','fi02-blockout.glb']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/maps/fi02-record-lane'/f))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)==16
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];bounds=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
 ground=next(o for o in meshes if o.name=='GEO_ground');gp=[ground.matrix_world@Vector(v) for v in ground.bound_box]
 groundSize=[max(p[i] for p in gp)-min(p[i] for p in gp) for i in range(3)]
 assert abs(groundSize[0]-36)<.01 and abs(groundSize[1]-28)<.01,(groundSize,bounds)
 rows.append({'file':f,'importedMeshes':len(meshes),'boundsBlenderXYZ':bounds,'groundDimensions':groundSize,'triangles':sum(len(o.data.polygons) for o in meshes)})
(ROOT/'docs/floating-island-redesign/fi02/blender-reimport.json').write_text(json.dumps({'rows':rows,'scope':'Actual Blender re-import of portable normalized GLBs; no files overwritten.'},indent=2)+'\n')
