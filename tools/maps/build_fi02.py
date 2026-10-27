"""Original FI02 map geometry, derived from the approved concept. Run in Blender."""
from pathlib import Path
import sys,json,math,hashlib,random
import bpy,bmesh
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/maps/fi02-record-lane';OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'assets/monsters/m04-low-frequency'))
from normalize_glb import normalize
L=json.loads((ROOT/'tools/maps/fi02-layout.json').read_text());(OUT/'layout.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.view_settings.view_transform='Standard'
P={'ivory':'#E6DDC2','edge':'#C3BFAE','wall':'#F2E6CA','cyan':'#13BDE0','yellow':'#F4C541','coral':'#E56B59','dark':'#293F53','road':'#52697C','glass':'#295975','green':'#65AF37','leaf':'#409650','wood':'#A37448','metal':'#A6B3B6','rock':'#465A69'}
mat=bpy.data.materials.new('FI02_Unlit_Palette');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');col=n.new('ShaderNodeVertexColor');col.layer_name='Palette';mat.node_tree.links.new(col.outputs['Color'],em.inputs['Color']);mat.node_tree.links.new(em.outputs[0],out.inputs[0])
def rgba(key,t=1):
 h=P[key].lstrip('#');rgb=[min(1,int(h[i:i+2],16)/255*t) for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)
def paint(o,key,facet=False):
 me=o.data;me.update();me.materials.clear();me.materials.append(mat);a=me.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
 for face in me.polygons:
  face.use_smooth=False;t=(1 if face.normal.z>.6 else .91 if face.normal.x>.6 else .83) if facet else 1
  if key=='rock':t=[.76,.88,.98][face.index%3]
  for i in face.loop_indices:a.data[i].color=rgba(key,t)
 me.color_attributes.active_color=a;return o
def box(name,x,y,z,w,d,h,key):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.name=name;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return paint(o,key,True)
def cylinder(name,x,y,z,r,depth,key,axis='Z',n=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=(x,y,z));o=bpy.context.object;o.name=name
 if axis=='Y':o.rotation_euler.x=math.pi/2
 if axis=='X':o.rotation_euler.y=math.pi/2
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return paint(o,key,True)
def mesh(name,verts,faces,key,facet=False):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();return paint(o,key,facet)
def polygon(name,pts,z,key):return mesh(name,[(x,y,z) for x,y in pts],[tuple(range(len(pts)))],key)
fp=L['footprint'];N=len(fp);rng=random.Random(27)
verts=[(x,y,z) for z,scale in [(0,1),(-.9,1),(-3.0,.98),(-4.2,.91)] for x,y in [(x*scale,y*scale) for x,y in fp]]
# A shallow faceted foundation with an uneven lower rim, not a mountain cone.
for i in range(N):
 x,y,z=verts[3*N+i];verts[3*N+i]=(x,y,z-[.2,.9,0,.65,.25,.8,.1,.55][i])
faces=[tuple(range(N)),tuple(reversed(range(3*N,4*N)))];faces += [(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N) for j in range(3) for i in range(N)] + [(j*N+i,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(3) for i in range(N)]
mesh('GEO_foundation',verts,faces,'rock',True);polygon('GEO_ground',fp,L['surfaces']['roadZ'],'road')
polygon('GEO_forecourt',L['surfaces']['forecourt'],L['surfaces']['forecourtZ'],'ivory')
# Curbs follow the main ground silhouette as short low solids, not full blocking walls.
for i,(a,b) in enumerate(zip(fp,fp[1:]+fp[:1])):
 x,y=(a[0]+b[0])/2,(a[1]+b[1])/2;length=math.dist(a,b);o=box('GEO_edge_'+str(i),x,y,.06,length,.25,.12,'edge');o.rotation_euler.z=math.atan2(b[1]-a[1],b[0]-a[0])
for i in range(6):box('GEO_crosswalk_'+str(i),-13+i*.65,-4,.035,.4,3.6,.035,'ivory')
for b in L['buildings']:
 x,y=b['center'];w,d,h=b['size'];id=b['id'];front=y-d/2
 box('GEO_'+id,x,y,h/2,w,d,h,'wall');box('GEO_'+id+'_roof',x,y,h+.1,w+.35,d+.35,.22,'ivory')
 box('GEO_'+id+'_roof_inset',x,y,h+.22,w-.7,d-.7,.08,'edge')
 box('GEO_'+id+'_vent',x-1,y+.5,h+.55,1.3,1,.6,'metal')
 # Front openings are geometric recess-like panels, never textured windows.
 box('GEO_'+id+'_window',x,front-.035,2.1,w-1,.09,2.8,'glass')
 for dx in [-w*.28,0,w*.28]:box('GEO_'+id+'_mullion',x+dx,front-.09,2.1,.10,.12,2.8,'dark')
 box('GEO_'+id+'_awning',x,front-.65,3.85,w+.4,1.5,.35,b['accent'])
 box('GEO_'+id+'_header',x,y-d/2-.065,h-1,w-1,.15,1.0,b['accent'])
 if id=='records':
  cylinder('GEO_record_emblem',x,front-.20,5.65,1.45,.22,'dark','Y',24);cylinder('GEO_record_center',x,front-.34,5.65,.34,.035,'cyan','Y',16)
  for j in range(2):
   box('PROP_record_crate',x-1+j*2,front-1, .45,1.5,.85,.9,'wood')
   for k in range(3):box('PROP_record_sleeve',x-1+j*2+(k-1)*.35,front-1,.95,.27,.12,.55,['cyan','yellow','coral'][k])
 if id=='laundry':
  for dx in [-1.25,1.25]:
   box('GEO_washer',x+dx,front-.16,1.3,1.9,.38,2.3,'metal');cylinder('GEO_washer_door',x+dx,front-.39,1.3,.64,.09,'dark','Y');cylinder('GEO_washer_glass',x+dx,front-.45,1.3,.43,.025,'glass','Y')
# Radio aerial, not a transmitting gameplay object.
box('GEO_roof_aerial',-1.8,10,8.2,.1,.1,2.3,'dark')
for z in [8,8.6,9.2]:box('GEO_aerial_bar',-1.8,10,z,1,.08,.08,'metal')
for p in L['props']:
 x,y=p['center'];id=p['id'];kind=p['kind']
 if kind=='servicePlanter':
  w,d=p['size'];box('PROP_'+id+'_base',x,y,.35,w,d,.7,'edge');box('PROP_'+id+'_hedge',x,y,.9,w-.4,d-.4,.8,'leaf')
 if kind in ['tree','planter']:
  r=p['radius'];box('PROP_'+id+'_base',x,y,.25,r*2,r*2,.5,'edge');box('PROP_'+id+'_soil',x,y,.52,r*1.7,r*1.7,.06,'dark')
  if kind=='tree':
   cylinder('PROP_'+id+'_trunk',x,y,2.5,.3,4.3,'wood',n=6)
   for j,(dx,dy,z,rr) in enumerate([(-.8,0,5.3,2.3),(1,0,5.2,2),(0,.6,6.6,2)]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rr,location=(x+dx,y+dy,z));o=bpy.context.object;o.name='PROP_'+id+'_crown';o.scale=(1,1,.95);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);paint(o,'green' if j%2 else 'leaf',True)
  else:
   for dx in [-.5,.5]:box('PROP_'+id+'_shrub',x+dx,y,1.1,.9,1.3,1.2,'green')
 if kind=='vendor':
  box('PROP_vendor',x,y,1.3,1.1,.85,2.6,'coral');box('PROP_vendor_window',x,y-.44,1.7,.8,.035,1.25,'ivory');box('PROP_vendor_slot',x,y-.47,.58,.65,.035,.25,'dark')
  for j in range(3):box('PROP_vendor_can',x+(j-1)*.23,y-.47,1.7,.14,.04,.5,['cyan','yellow','coral'][j])
 if kind=='counter':
  box('PROP_listening_table',x,y,1.1,2.1,.9,.16,'wood')
  for dx in [-.85,.85]:box('PROP_listening_leg',x+dx,y,.5,.15,.7,1,'dark')
  box('PROP_radio',x,y,1.5,.9,.4,.6,'cyan');box('PROP_radio_display',x-.2,y-.22,1.6,.35,.04,.18,'ivory');cylinder('PROP_radio_speaker',x+.24,y-.23,1.45,.15,.06,'dark','Y')
 if kind=='bench':
  box('PROP_bench_seat',x,y,.65,1.8,.65,.15,'wood');box('PROP_bench_back',x,y+.3,1.05,1.8,.12,.7,'wood')
  for dx in [-.6,.6]:box('PROP_bench_leg',x+dx,y,.32,.12,.6,.65,'dark')
for i,r in enumerate(L['rails']):
 x,y=r['center'];w,d=r['size'];box('PROP_rail_'+str(i),x,y,1,w,d,.18,'leaf')
 for s in [-1,1]:box('PROP_rail_post',x+s*w*.45,y+s*d*.45,.5,.15,.15,1,'metal')
b=L['bridge'];x,y=b['center'];w,d,h=b['size'];z=b['deckZ'];box('GEO_bridge_deck',x,y,z,w,d,h,'edge')
for px,py in b['piers']:box('GEO_bridge_pier',px,py,z/2,.65,.65,z,'metal')
box('GEO_bridge_guard',x,y+.6,z+1,w,.15,.2,'leaf')
for dx in [-4,-2,0,2,4]:box('GEO_bridge_rail_post',x+dx,y+.6,z+.5,.12,.12,1,'leaf')
cylinder('GEO_exposed_pipe',6,-12,-1.3,.22,9,'metal','X')
# Join into named semantic groups, preserving separate reusable prop objects in Blend.
for o in list(scene.objects):
 if o.type=='MESH':
  mod=o.modifiers.new('Triangulated','TRIANGULATE');bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
# Blend remains editable per part. GLB groups are merged by role for bounded draws.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fi02-source.blend'))
for prefix in ['GEO_foundation','GEO_ground','GEO_forecourt','GEO_edge','GEO_crosswalk','GEO_bridge','GEO_exposed','GEO_corner','GEO_records','GEO_laundry','GEO_washer','GEO_record','GEO_roof','GEO_aerial','PROP_tree_left','PROP_tree_right','PROP_']:
 objects=[o for o in list(scene.objects) if o.type=='MESH' and o.name.startswith(prefix) and not(prefix=='PROP_' and o.name in ['PROP_tree_left','PROP_tree_right'])]
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=prefix.rstrip('_')
objects=[o for o in scene.objects if o.type=='MESH'];triangles=sum(len(o.data.polygons) for o in objects)
assert triangles<30000
bpy.ops.export_scene.gltf(filepath=str(OUT/'fi02-native.glb'),export_format='GLB',export_yup=True,export_texcoords=False,export_normals=True,export_materials='EXPORT')
# White blockout uses the exact same positions / topology, only replaces colors.
for o in objects:
 for face in o.data.polygons:
  tone=.72 if face.normal.z>.6 else .59 if face.normal.x>.6 else .48
  for i in face.loop_indices:o.data.color_attributes['Palette'].data[i].color=(tone,tone,tone,1)
bpy.ops.export_scene.gltf(filepath=str(OUT/'fi02-blockout-native.glb'),export_format='GLB',export_yup=True,export_texcoords=False,export_normals=True,export_materials='EXPORT')
normalize(OUT/'fi02-native.glb',OUT/'fi02-record-lane.glb')
normalize(OUT/'fi02-blockout-native.glb',OUT/'fi02-blockout.glb')
report={'triangles':triangles,'semanticMeshes':len(objects),'textures':0,'dimensionsMeters':[36,28],'stage':'local authored geometry; needs import/navigation/visual review','files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in OUT.iterdir() if f.suffix in ['.glb','.blend','.json'] and f.name not in ['build-report.json','provenance.json']}}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('FI02:',triangles,'triangles,',len(objects),'meshes')
