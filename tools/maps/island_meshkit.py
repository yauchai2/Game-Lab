"""Deterministic local Blender primitives and portable unlit GLB export."""
from pathlib import Path
import bpy,bmesh,math,json,sys,hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'assets/monsters/m04-low-frequency'))
from normalize_glb import normalize
P={};scene=None;mat=None
def setup(palette,name):
 global P,scene,mat
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.view_settings.view_transform='Standard';P=palette
 mat=bpy.data.materials.new(name);mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');col=n.new('ShaderNodeVertexColor');col.layer_name='Palette';mat.node_tree.links.new(col.outputs['Color'],em.inputs['Color']);mat.node_tree.links.new(em.outputs[0],out.inputs[0])
def rgba(key,t=1):
 h=P[key].lstrip('#');rgb=[min(1,int(h[i:i+2],16)/255*t) for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)
def paint(o,key,facet=True):
 me=o.data;me.update();me.materials.clear();me.materials.append(mat);a=me.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
 for face in me.polygons:
  face.use_smooth=False;t=(1 if face.normal.z>.6 else .92 if face.normal.x>.6 else .84) if facet else 1
  if key=='rock':t=[.78,.90,1][face.index%3]
  for i in face.loop_indices:a.data[i].color=rgba(key,t)
 me.color_attributes.active_color=a;return o
def box(name,x,y,z,w,d,h,key):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.name=name;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return paint(o,key)
def cylinder(name,x,y,z,r,depth,key,axis='Z',n=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=(x,y,z));o=bpy.context.object;o.name=name
 if axis=='Y':o.rotation_euler.x=math.pi/2
 if axis=='X':o.rotation_euler.y=math.pi/2
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return paint(o,key)
def mesh(name,verts,faces,key,facet=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();return paint(o,key,facet)
def polygon(name,pts,z,key):return mesh(name,[(x,y,z) for x,y in pts],[tuple(range(len(pts)))],key,False)
def foundation(fp):
 n=len(fp);v=[(x*s,y*s,z) for z,s in [(0,1),(-.8,1),(-2.7,.98),(-3.8,.90)] for x,y in fp]
 for i in range(n):x,y,z=v[3*n+i];v[3*n+i]=(x,y,z-(i*7%11)*.09)
 faces=[tuple(range(n)),tuple(reversed(range(3*n,4*n)))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n) for j in range(3) for i in range(n)]+[(j*n+i,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(3) for i in range(n)]
 mesh('GEO_foundation',v,faces,'rock')
def finish(out,stem,groups):
 out.mkdir(parents=True,exist_ok=True)
 for o in list(scene.objects):
  if o.type=='MESH':
   mod=o.modifiers.new('Triangulated','TRIANGULATE');bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'-source.blend')))
 for name in groups:
  obs=[o for o in scene.objects if o.type=='MESH' and o.name.startswith(name)]
  if len(obs)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=name
 obs=[o for o in scene.objects if o.type=='MESH'];tri=sum(len(o.data.polygons) for o in obs);assert tri<30000
 def export(suffix):
  native=out/(stem+suffix+'-native.glb');dest=out/(stem+suffix+'.glb');bpy.ops.export_scene.gltf(filepath=str(native),export_format='GLB',export_yup=True,export_texcoords=False,export_normals=True,export_materials='EXPORT');normalize(native,dest)
 export('')
 for o in obs:
  for face in o.data.polygons:
   tone=.72 if face.normal.z>.6 else .59 if face.normal.x>.6 else .48
   for i in face.loop_indices:o.data.color_attributes['Palette'].data[i].color=(tone,tone,tone,1)
 export('-blockout')
 report={'triangles':tri,'semanticMeshes':len(obs),'textures':0,'materials':1,'files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in out.iterdir() if f.suffix in ['.glb','.blend','.json'] and f.name not in ['build-report.json','provenance.json']}}
 (out/'build-report.json').write_text(json.dumps(report,indent=2)+'\n');print(stem,tri,'triangles',len(obs),'meshes')
