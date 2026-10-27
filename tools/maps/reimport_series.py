from pathlib import Path
import bpy,json
from mathutils import Vector
R=Path(__file__).resolve().parents[2];reg=json.loads((R/'assets/maps/series-registry.json').read_text());rows=[]
for rec in reg['maps']:
 for variant in ['model','white']:
  bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(R/rec[variant]));obs=[o for o in bpy.context.scene.objects if o.type=='MESH'];ground=next(o for o in obs if o.name=='GEO_ground');p=[ground.matrix_world@Vector(v) for v in ground.bound_box];actual=[max(v[i] for v in p)-min(v[i] for v in p) for i in range(2)];expected=[max(p[i] for p in rec['layout']['footprint'])-min(p[i] for p in rec['layout']['footprint']) for i in range(2)];assert all(abs(a-b)<.001 for a,b in zip(actual,expected)),(rec['id'],actual,expected);rows.append({'id':rec['id'],'variant':variant,'meshes':len(obs),'groundDimensions':actual,'triangles':sum(len(o.data.polygons) for o in obs)})
(R/'docs/floating-island-redesign/series-blender-validation.json').write_text(json.dumps({'rows':rows,'scope':'All44 portable GLBs re-imported into actual Blender; source files not modified.'},indent=2)+'\n');print('PASS all44 Blender imports')
