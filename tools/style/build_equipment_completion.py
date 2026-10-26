"""Locally author the four missing signature meshes. No external provider or textures."""
from pathlib import Path
import sys,json,math,hashlib,base64
import bpy,bmesh
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'assets/monsters/m04-low-frequency'))
from normalize_glb import normalize
KIT=(ROOT/'tools/style/meshkit.py').read_text()
IDS=['ping_clip','milo_md_strap','ping_bag_strap','null_lanyard']
records={};packed={}
for id in IDS:
 ns={'__file__':str(ROOT/'tools/style/meshkit.py')};exec(KIT,ns)
 ns['PALETTE'].update({'silver':'#B8C4C7','dark':'#293D4B','blue':'#377D9E','purple':'#655685','amber':'#DEAB54'})
 box,paint,mesh=[ns[k] for k in ['box','paint','mesh']]
 parts=[]
 def add(name,loc,size,key,bevel=0):
  o=box(name,loc,size,key,bevel);parts.append(o);return o
 def ribbon(name,points,width,depth,key):
  # A solid faceted band with no UV or texture detail. Closed cross-sections.
  verts=[];faces=[]
  for i,p in enumerate(points):
   prev=Vector(points[max(0,i-1)]);nxt=Vector(points[min(len(points)-1,i+1)]);t=(nxt-prev).normalized();side=Vector((t.z,0,-t.x)).normalized()*width/2
   for sy,sx in [(-1,-1),(-1,1),(1,1),(1,-1)]:verts.append(tuple(Vector(p)+side*sx+Vector((0,sy*depth/2,0))))
  for j in range(len(points)-1):
   for k in range(4):faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
  faces.extend([(3,2,1,0),tuple((len(points)-1)*4+k for k in range(4))]);o=paint(mesh(name,verts,faces),key);parts.append(o)
 def buckle(x,y,z,width=.17):
  for dx in [-width/2,width/2]:add('Buckle_side',(x+dx,y,z),(.025,.055,.14),'silver')
  for dz in [-.07,.07]:add('Buckle_cross',(x,y,z+dz),(width,.055,.025),'silver')
  add('Buckle_tongue',(x,y-.035,z),(.022,.02,.12),'dark')
 if id=='ping_clip':
  for x in [-.105,.105]:add('Folded_metal_rail',(x,0,0),(.10,.09,.82),'silver',.025)
  add('Hinge', (0,.01,.36),(.33,.15,.15),'dark',.025)
  add('Purple_latch',(0,-.065,.24),(.30,.055,.15),'purple',.018)
  add('Signal_inlay',(-.055,-.10,.25),(.11,.02,.045),'amber')
  add('Spring_bridge',(0,.055,-.25),(.29,.08,.12),'dark',.016)
 elif id=='milo_md_strap':
  ribbon('MD_shoulder_webbing',[(-.29,.10,.44),(-.26,-.13,.46),(-.13,-.19,.19),(.12,-.19,-.14),(.30,-.13,-.45),(.29,.10,-.43),(.10,.16,-.10),(-.12,.16,.19),(-.29,.10,.44)],.095,.035,'dark')
  buckle(.02,-.23,-.025)
  add('Shoulder_pad',(-.23,-.15,.36),(.16,.065,.20),'blue',.025)
  for x,z in [(.30,-.44),(-.27,.42)]:add('MD_anchor',(x,-.13,z),(.13,.055,.08),'silver',.012)
 elif id=='ping_bag_strap':
  ribbon('Messenger_band',[(.30,.10,.43),(.28,-.15,.45),(.12,-.24,.17),(-.12,-.24,-.13),(-.30,-.13,-.44),(-.30,.10,-.42),(-.12,.17,-.13),(.13,.17,.18),(.30,.10,.43)],.14,.04,'purple')
  buckle(.05,-.28,.08,.20)
  add('Shoulder_cushion',(.24,-.15,.35),(.22,.075,.20),'dark',.024)
  for x,z in [(-.30,-.43),(.28,.42)]:add('Bag_anchor',(x,-.14,z),(.18,.065,.09),'silver',.012)
 elif id=='null_lanyard':
  ribbon('Lanyard_left',[(-.15,.06,.43),(-.18,-.14,.35),(-.15,-.23,.10),(0,-.26,-.28)],.055,.022,'blue')
  ribbon('Lanyard_right',[(.15,.06,.43),(.18,-.14,.35),(.15,-.23,.10),(0,-.26,-.28)],.055,.022,'blue')
  ribbon('Neck_back',[(-.15,.06,.43),(0,.15,.45),(.15,.06,.43)],.055,.022,'dark')
  add('Breakaway_clasp',(.16,-.15,.30),(.095,.06,.13),'dark',.012)
  add('Carabiner',(0,-.26,-.30),(.10,.065,.12),'silver',.015)
  add('Controller_cradle',(0,-.27,-.39),(.27,.10,.19),'dark',.025)
  add('Cradle_status',(-.055,-.33,-.36),(.10,.02,.035),'amber')
 # Normalize geometry to maximum span one, centered; exporter handles Z-up -> Y-up.
 bpy.context.view_layer.update();coords=[o.matrix_world@v.co for o in parts for v in o.data.vertices];lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)));hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)));center=(lo+hi)/2;s=1/max(hi-lo)
 for o in parts:
  world=o.matrix_world.copy()
  for v in o.data.vertices:v.co=(world@v.co-center)*s
  o.matrix_world.identity()
 bpy.context.view_layer.update();out=ROOT/'assets/equipment-completion'/id;out.mkdir(parents=True,exist_ok=True)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 bpy.ops.object.join();o=bpy.context.object;o.name=id
 o.data.materials.clear();o.data.materials.append(ns['material'])
 for p in o.data.polygons:p.material_index=0
 o.data.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(o.data);assert all(e.is_manifold for e in bm.edges);bm.free()
 bpy.context.preferences.filepaths.save_version=0
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(id+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/'native.glb'),export_format='GLB',use_selection=True,export_animations=False,export_texcoords=False,export_normals=False,export_materials='EXPORT')
 normalize(out/'native.glb',out/(id+'.glb'))
 data=(out/(id+'.glb')).read_bytes();packed[id]=base64.b64encode(data).decode()
 import struct
 n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);assert not doc.get('textures') and not doc.get('images');assert all('KHR_materials_unlit' in m.get('extensions',{}) for m in doc['materials'])
 # Check the actual exported file with the stock importer in a clean scene.
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(out/(id+'.glb')))
 imported=[x for x in bpy.context.scene.objects if x.type=='MESH'];tris=0
 for x in imported:x.data.calc_loop_triangles();tris+=len(x.data.loop_triangles)
 records[id]={'file':str((out/(id+'.glb')).relative_to(ROOT)),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'triangles':tris,'importedMeshes':len(imported),'textures':0,'unlit':True,'authorship':'Original local Blender geometry, Game-Lab; no external model or paid provider.'}
 (out/'manifest.json').write_text(json.dumps(records[id],indent=2)+'\n')
(ROOT/'assets/equipment-completion/catalog.json').write_text(json.dumps(records,indent=2)+'\n')
(ROOT/'src/game/equipment-completion-assets.js').write_text('// Generated locally by tools/style/build_equipment_completion.py; original texture-free geometry.\nconst EQUIPMENT_COMPLETION_GLB='+json.dumps(packed,separators=(',',':'))+';\n')
print('COMPLETE',json.dumps(records))

import runpy
runpy.run_path(str(ROOT/'tools/style/pack_equipment_completion.py'),run_name='__main__')
