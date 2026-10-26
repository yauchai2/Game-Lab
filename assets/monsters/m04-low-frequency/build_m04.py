"""M04 original Blender geometry; shared deterministic helpers adapted from Game-Lab M01 build_m01.py. No textures, lights or AO; discrete vertex face colors."""
import bpy, bmesh, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.fps=24
scene.frame_start=0
scene.frame_end=48
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.view_settings.exposure=0
scene.view_settings.gamma=1

def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def color(h,tone=1):
    h=h.lstrip('#')
    return tuple(linear(max(0,min(1,int(h[i:i+2],16)/255*tone))) for i in (0,2,4))+(1,)

PALETTE={'blue':'#249BC1','ivory':'#F1E7C7','joint':'#303536','sole':'#34383A','orange':'#FF7A13','cone':'#363B3D','rim':'#242A2D','vent':'#183F50'}
material=bpy.data.materials.new('M04_Unlit_VertexPalette')
material.diffuse_color=color(PALETTE['blue'])
material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear()
output=nodes.new('ShaderNodeOutputMaterial')
emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name='Palette'
material.node_tree.links.new(vertex.outputs['Color'],emission.inputs['Color'])
material.node_tree.links.new(emission.outputs['Emission'],output.inputs['Surface'])

def paint(obj,key,custom=None):
    me=obj.data;me.update()
    if not me.materials:me.materials.append(material)
    attr=me.color_attributes.get('Palette') or me.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
    for poly in me.polygons:
        poly.use_smooth=False
        # Fixed flat face colors, not a light, AO, normal map, or baked texture.
        tone=1.0 if abs(poly.normal.z)>.95 else (.94 if abs(poly.normal.x)>.95 else (.98 if abs(poly.normal.y)>.95 else .88))
        face_key=key
        if custom:face_key,tone=custom(poly,face_key,tone)
        rgba=color(PALETTE[face_key],tone)
        for loop in poly.loop_indices:attr.data[loop].color=rgba
    me.color_attributes.active_color=attr
    return obj

def mesh(name,verts,faces):
    me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    return ob

def box(name,loc,size,key,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=ob.modifiers.new('Broad_single_chamfer','BEVEL');mod.width=min(bevel,min(size)*.3);mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return paint(ob,key)

def loft(name,sections,outline,key,custom=None):
    verts=[];faces=[];n=len(outline)
    for z,rx,ry,cx,cy in sections:
        verts.extend((cx+x*rx,cy+y*ry,z) for x,y in outline)
    for j in range(len(sections)-1):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple(reversed(range(n))))
    faces.append(tuple((len(sections)-1)*n+i for i in range(n)))
    return paint(mesh(name,verts,faces),key,custom)


def cylinder(name,loc,radius,depth,key,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=(math.pi/2,0,0))
    ob=bpy.context.object;ob.name=name
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return paint(ob,key)

def beam(name,a,b,width,depth,key):
    a,b=Vector(a),Vector(b)
    ob=box(name,(a+b)/2,(width,depth,(b-a).length),key,.035)
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return ob

body=[]
for sign in (-1,1):
    x=sign*.59
    body.append(box('Cabinet', (x,0,1.94),(1.16,.72,1.78),'blue',.095))
    for z in (1.51,2.34):
        body.append(cylinder('Driver_Rim',(x,-.382,z),.432,.065,'rim'))
        # Coarse closed concentric diaphragm, with a deliberately flat polygon palette.
        rings=[(.0,-.428),(.15,-.428),(.33,-.405),(.382,-.442)]
        verts=[]
        for r,y in rings[1:]:
            verts += [(x+r*math.cos(i*math.tau/12),y,z+r*math.sin(i*math.tau/12)) for i in range(12)]
        faces=[tuple(reversed(range(12)))]
        for j in range(2):
            for i in range(12):faces.append((j*12+i,j*12+(i+1)%12,(j+1)*12+(i+1)%12,(j+1)*12+i))
        # Closed back and outer wall, no grille map.
        start=len(verts);verts += [(x+.382*math.cos(i*math.tau/12),-.395,z+.382*math.sin(i*math.tau/12)) for i in range(12)]
        for i in range(12):faces.append((24+i,24+(i+1)%12,start+(i+1)%12,start+i))
        faces.append(tuple(start+i for i in reversed(range(12))))
        body.append(paint(mesh('Speaker_Cone',verts,faces),'cone'))
    for zz in (2.28,2.47,2.66):
        body.append(box('Vent_Solid_Inset',(x,.367,zz),(.66,.02,.075),'vent'))
    body.append(box('Carry_Handle_Recess',(sign*1.178,0,2.31),(.025,.25,.38),'joint',.015))
    body.append(box('Carry_Handle',(sign*1.195,0,2.31),(.035,.075,.27),'ivory',.015))
body.append(box('Power_Switch',(0,0,2.89),(.29,.2,.14),'orange',.018))
body.append(box('Cable_Socket',(.58,.38,1.37),(.34,.035,.31),'joint',.02))
# Thick low-poly cable ring, fully geometric.
bpy.ops.mesh.primitive_torus_add(major_segments=10,minor_segments=4,location=(.68,.46,1.16),rotation=(math.pi/2,0,0),major_radius=.18,minor_radius=.037)
ob=bpy.context.object;ob.name='Cable_Loop';paint(ob,'joint');body.append(ob)
body.append(box('Cable_Clip',(.68,.47,1.35),(.08,.09,.15),'orange',.01))

arms=[];legs=[]
for sign in (-1,1):
    x=sign*1.28
    arm=[cylinder('Arm_Hinge',(x,0,1.33),.18,.3,'joint',8),box('Ivory_Arm',(sign*1.39,-.02,1.38),(.43,.81,.57),'ivory',.11)]
    for z,key in ((1.49,'orange'),(1.28,'joint')):
        arm.append(box('Control',(sign*1.39,-.443,z),(.14,.065,.14),key,.02))
    arms.append(arm)
    hip=(sign*1.13,.02,1.06);knee=(sign*1.43,.03,.64);ankle=(sign*1.2,-.05,.28)
    leg=[beam('Upper_Leg',hip,knee,.29,.34,'blue'),beam('Lower_Leg',knee,ankle,.28,.32,'blue'),box('Rubber_Sole',(sign*1.22,-.17,.075),(.62,.77,.15),'sole',.055),box('Ivory_Toe',(sign*1.22,-.19,.285),(.6,.69,.34),'ivory',.10)]
    legs.append(leg)

# Shared material, five independently animated rigid mesh parts.
def join(parts,name):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:ob.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name
    ob.data.materials.clear();ob.data.materials.append(material)
    for p in ob.data.polygons:p.material_index=0
    return ob
parts=[join(body,'M04_Body'),*[join(a,'M04_Arm_'+str(i)) for i,a in enumerate(arms)],*[join(a,'M04_Leg_'+str(i)) for i,a in enumerate(legs)]]
def control(name,loc,parent=None):
    ob=bpy.data.objects.new(name,None);scene.collection.objects.link(ob);ob.location=loc;ob.parent=parent;return ob
root=control('M04_Root',(0,0,0))
bodyctrl=control('M04_Body_CTRL',(0,0,1.8),root)
ctrls=[bodyctrl,*[control('M04_Arm_CTRL_'+str(i),(sg*1.28,0,1.33),root) for i,sg in enumerate((-1,1))],*[control('M04_Leg_CTRL_'+str(i),(sg*1.13,.02,1.06),root) for i,sg in enumerate((-1,1))]]
for ob,ctrl in zip(parts,ctrls):
    bpy.context.view_layer.update();world=ob.matrix_world.copy();ob.parent=ctrl;ob.matrix_world=world
controls=[root,*ctrls];rest={o.name:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for o in controls}
def reset():
    for o in controls:o.location,o.rotation_euler,o.scale=[v.copy() for v in rest[o.name]]
def clip(name,frames,pose):
    for o in controls:
        o.animation_data_create();o.animation_data.action=bpy.data.actions.new(name+'_'+o.name)
    for f in frames:
        reset();pose(f)
        for o in controls:
            for path in ('location','rotation_euler','scale'):o.keyframe_insert(path,frame=f)
    for o in controls:
        a=o.animation_data.action
        for c in a.fcurves:
            for k in c.keyframe_points:k.interpolation='LINEAR'
        o.animation_data.action=None;t=o.animation_data.nla_tracks.new();t.name=name;t.strips.new(a.name,0,a);t.mute=True
    reset()
def idle(f):bodyctrl.scale.x=1+.012*math.sin(f/48*math.tau)
def move(f):
    a=math.sin(f/24*math.tau)
    for i,c in enumerate(ctrls[3:]):c.rotation_euler.x=a*.26*(-1 if i else 1)
    for i,c in enumerate(ctrls[1:3]):c.rotation_euler.x=a*.06*(1 if i else -1)
    bodyctrl.location.z+=abs(a)*.025
    bodyctrl.rotation_euler.y=a*.025
def hurt(f):bodyctrl.rotation_euler.x=math.radians({0:0,2:-9,5:4,9:-2,12:0}[f])
clip('Idle',[0,12,24,36,48],idle);clip('Move',list(range(0,25,3)),move);clip('Hurt',[0,2,5,9,12],hurt)
reset();scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT')
for o in [*controls,*parts]:
    o.select_set(True)
    if o.animation_data:
        for t in o.animation_data.nla_tracks:t.mute=False
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'M04-native.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_materials='EXPORT',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_frame_range=False,export_force_sampling=True,export_extras=True,export_vertex_color='MATERIAL',export_all_vertex_colors=True)
sys.path.insert(0,str(OUT));from normalize_glb import normalize
normalize(OUT/'M04-native.glb',OUT/'M04-low-frequency.glb')
for o in controls:
    for t in o.animation_data.nla_tracks:t.mute=True
reset();bpy.context.view_layer.update()
stats=[]
for o in parts:
    o.data.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(o.data)
    stats.append({'name':o.name,'triangles':len(o.data.loop_triangles),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'flat':all(not p.use_smooth for p in o.data.polygons)});bm.free()
assert all(s['nonManifoldEdges']==0 and s['flat'] for s in stats),stats
assert sum(s['triangles'] for s in stats)<4000
scene.render.engine='CYCLES';scene.cycles.samples=1;scene.cycles.use_denoising=False
scene.render.image_settings.file_format='PNG';scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('Pure_White');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);scene.world=world
camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=3.8
(OUT/'renders').mkdir(exist_ok=True)
for name,loc in [('front',(0,-8,1.48)),('right',(8,0,1.48)),('back',(0,8,1.48)),('beauty',(5,-8,4.0))]:
    cam.location=loc;cam.rotation_euler=(Vector((0,0,1.48))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'renders'/f'{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'M04-low-frequency.blend'))
(OUT/'blender-validation.json').write_text(json.dumps({'assetId':'M04','blender':bpy.app.version_string,'meshes':stats,'triangles':sum(s['triangles'] for s in stats),'textureNodes':sum(n.type=='TEX_IMAGE' for mat in bpy.data.materials if mat.use_nodes for n in mat.node_tree.nodes),'animations':['Idle','Move','Hurt'],'material':'emission vertex face colors; no lighting, AO, textures','axes':'glTF Y-up +Z front','notVerified':['formal gameplay integration','mobile hardware performance']},indent=2)+'\n')
print('M04_BUILD_COMPLETE')
