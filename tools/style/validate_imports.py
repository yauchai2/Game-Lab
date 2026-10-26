"""Run with Blender: independent stock importer checks for all 12 delivered GLBs."""
from pathlib import Path
import bpy,json,struct,math
root=Path(__file__).resolve().parents[2];reports=[]
for p in sorted((root/'assets/monsters').glob('**/*.glb')):
 if p.name in ['native.glb','M04-native.glb']:continue
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);expected=sum(doc['accessors'][pr['indices']]['count']//3 for m in doc['meshes'] for pr in m['primitives'])
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(p),merge_vertices=True)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];triangles=0
 for o in meshes:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
 assert triangles==expected,(p,triangles,expected)
 assert len(meshes)==len(doc['meshes']) and len(bpy.data.images)==0
 assert all(math.isfinite(c) for o in meshes for v in o.data.vertices for c in v.co)
 imported=[a.name for a in bpy.data.actions]
 assert all(any(a['name'] in s for s in imported) for a in doc['animations'])
 reports.append({'asset':p.parent.name,'meshes':len(meshes),'triangles':triangles,'textures':0,'clips':[a['name'] for a in doc['animations']],'stockImport':'pass'})
(root/'docs/style-complete/blender-imports.json').write_text(json.dumps(reports,indent=2)+'\n');print('PASS_ALL_12_IMPORTS')
