from pathlib import Path
import bpy,json,sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];rows=[]
map_id='fi01' if '--map=fi01' in sys.argv else 'fi02';stem={'fi01':'fi01-corner-park','fi02':'fi02-record-lane'}[map_id];layout=json.loads((ROOT/('assets/maps/'+stem+'/layout.json')).read_text());expected=[max(p[i] for p in layout['footprint'])-min(p[i] for p in layout['footprint']) for i in range(2)]
for f in [stem+'.glb',stem+'-blockout.glb' if map_id=='fi01' else 'fi02-blockout.glb']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/maps'/stem/f))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)==16
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];bounds=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
 ground=next(o for o in meshes if o.name=='GEO_ground');gp=[ground.matrix_world@Vector(v) for v in ground.bound_box]
 groundSize=[max(p[i] for p in gp)-min(p[i] for p in gp) for i in range(3)]
 assert abs(groundSize[0]-expected[0])<.01 and abs(groundSize[1]-expected[1])<.01,(groundSize,bounds)
 rows.append({'file':f,'importedMeshes':len(meshes),'boundsBlenderXYZ':bounds,'groundDimensions':groundSize,'triangles':sum(len(o.data.polygons) for o in meshes)})
(ROOT/('docs/floating-island-redesign/'+map_id+'/blender-reimport.json')).write_text(json.dumps({'rows':rows,'scope':'Actual Blender re-import of portable normalized GLBs; no files overwritten.'},indent=2)+'\n')
