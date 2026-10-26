"""Author M01 from the supplied orthographic concept; no external mesh/texture.
Run: blender -b -t 4 --python build_m01.py
Blender: Z up, front -Y. Export: glTF Y up, front +Z. Height ~3 units.
"""
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

PALETTE={'sage':'#929C81','ivory':'#E1DAC5','joint':'#505452','sole':'#41464A','cyan':'#42CAEB','bezel':'#495557'}
material=bpy.data.materials.new('M01_Unlit_VertexPalette')
material.diffuse_color=color(PALETTE['sage'])
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
        tone=.96+.055*poly.normal.z+.045*poly.normal.x+.025*poly.normal.y
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
        mod=ob.modifiers.new('Broad_single_chamfer','BEVEL');mod.width=bevel;mod.segments=1
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

outline=[(-.75,-1),(-.25,-1.02),(.25,-1.02),(.75,-1),(1,-.65),(1,.65),(.75,1),(.25,1.02),(-.25,1.02),(-.75,1),(-1,.65),(-1,-.65)]
body=loft('Faceted_Battery_Shell',[
    (.66,.72,.47,0,0),(.78,.87,.57,0,0),(.96,.98,.65,0,0),
    (1.86,.98,.65,0,0),(2.04,.81,.55,0,0),(2.12,.72,.49,0,0)
],outline,'sage',lambda p,k,t:('ivory' if p.center.z<.87 or p.center.z>2.035 else k,t))
body_parts=[body]
body_parts.append(box('Inset_Status_Bezel',(0,-.671,1.16),(.49,.026,.145),'bezel',.008))
body_parts.append(box('Cyan_Status_Window',(0,-.688,1.16),(.445,.014,.108),'cyan'))

def blade(side):
    # Plate with an ACTUAL polygonal through-hole, not a black spot or decal.
    x=side*.405
    points=[(-.22,0),(.22,0),(.22,.68),(.115,.80),(-.115,.80),(-.22,.68)]
    verts=[(px,y,z) for y in (-.058,.058) for px,z in points]
    n=len(points);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    ob=mesh('Plug_Blade_'+str(side),verts,faces)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.114,depth=.4,location=(0,0,.545),rotation=(math.pi/2,0,0))
    cutter=bpy.context.object;cutter.name='Temporary_hole_cutter'
    bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Real_prong_aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    def aperture(p,k,t):
        if math.hypot(p.center.x,p.center.z-.545)<.125 and abs(p.normal.y)<.8:t*=.76
        return k,t
    paint(ob,'ivory',aperture)
    ob.location=(x,0,2.14);ob.rotation_euler.z=math.radians(58)
    body_parts.append(ob)
    socket=box('Insulated_Plug_Base_'+str(side),(x,0,2.135),(.47,.24,.09),'joint',.016)
    socket.rotation_euler.z=math.radians(58);body_parts.append(socket)

for side in (-1,1):
    blade(side)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=.27,depth=.23,location=(side*.855,0,.675),rotation=(0,math.pi/2,0))
    ob=bpy.context.object;ob.name='Ankle_Hinge_'+str(side);paint(ob,'joint');body_parts.append(ob)

def foot(side):
    # Broad planar shoe wedges; chamfered octagonal footprint, no smooth bevels.
    x=side*.855;angle=math.radians(side*11)
    polygon=[(-.7,-1),(.7,-1),(1,-.7),(1,.65),(.65,1),(-.65,1),(-1,.65),(-1,-.7)]
    def section(z,w,front,rear):return (z,w,(rear-front)/2,x,(rear+front)/2)
    ob=loft('Chunky_Foot_'+('L' if side<0 else 'R'),[
        section(.02,.32,-.72,.28),section(.105,.35,-.75,.31),
        section(.20,.365,-.73,.34),section(.37,.31,-.59,.31),
        section(.56,.23,-.30,.22),section(.64,.14,-.04,.12)
    ],polygon,'ivory',lambda p,k,t:('sole' if p.center.z<.108 else k,t))
    # Bake splayed toe direction around the ankle before animation parenting.
    for v in ob.data.vertices:
        dx,dy=v.co.x-x,v.co.y
        v.co.x=x+dx*math.cos(angle)-dy*math.sin(angle)
        v.co.y=dx*math.sin(angle)+dy*math.cos(angle)
    ob.data.update();return ob

feet=[foot(-1),foot(1)]
def join(parts,name):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:ob.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
    ob=bpy.context.object;ob.name=name
    # All surfaces share the single vertex-color unlit material.
    ob.data.materials.clear();ob.data.materials.append(material)
    for p in ob.data.polygons:p.material_index=0
    return ob
body=join(body_parts,'M01_Body')

def control(name,loc,parent=None):
    ob=bpy.data.objects.new(name,None);scene.collection.objects.link(ob);ob.location=loc
    if parent:ob.parent=parent
    ob.empty_display_size=.18;return ob
root=control('M01_BatteryHopper_Root',(0,0,0))
body_ctrl=control('Body_CTRL',(0,0,1.33),root)
foot_ctrls=[control('Foot_L_CTRL',(-.855,0,.675),root),control('Foot_R_CTRL',(.855,0,.675),root)]
for ob,parent in [(body,body_ctrl),*zip(feet,foot_ctrls)]:
    bpy.context.view_layer.update();world=ob.matrix_world.copy();ob.parent=parent;ob.matrix_world=world
root['asset_id']='M01';root['character']='Battery Hopper / 插頭跳豆'
root['front_blender']='-Y';root['front_gltf']='+Z';root['reference_version']='semi-lowpoly-20261026'
root['material']='Unlit vertex colors; zero textures; flat normals'
root['animation_policy']='Rigid-part controls; no armature; no horizontal root motion'

controls=[root,body_ctrl,*foot_ctrls]
rest={ob.name:(ob.location.copy(),ob.rotation_euler.copy(),ob.scale.copy()) for ob in controls}
def reset_pose():
    for ob in controls:
        loc,rot,scale=rest[ob.name];ob.location=loc;ob.rotation_euler=rot;ob.scale=scale

def clip(name,frames,pose):
    for ob in controls:
        ob.animation_data_create();ob.animation_data.action=None
        action=bpy.data.actions.new(name+'_'+ob.name);ob.animation_data.action=action
    for frame in frames:
        reset_pose();pose(frame)
        for ob in controls:
            ob.keyframe_insert('location',frame=frame);ob.keyframe_insert('rotation_euler',frame=frame);ob.keyframe_insert('scale',frame=frame)
    for ob in controls:
        action=ob.animation_data.action
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='LINEAR'
        ob.animation_data.action=None
        track=ob.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(action.name,0,action);strip.name=name
        track.mute=True
    reset_pose()

def idle(f):
    u=f/48*math.tau;body_ctrl.location.z+=.012*math.sin(u);body_ctrl.rotation_euler.y=math.radians(1.2)*math.sin(u)
clip('Idle',[0,12,24,36,48],idle)
hop_data={0:(0,0,0),4:(0,-.09,-6),8:(.40,.03,8),12:(.54,.02,10),16:(.25,0,4),20:(0,-.065,-4),24:(0,0,0)}
def hop(f):
    z,bob,angle=hop_data[f];root.location.z=z;body_ctrl.location.z+=bob
    for i,ctrl in enumerate(foot_ctrls):ctrl.rotation_euler.x=math.radians(angle);ctrl.rotation_euler.y=math.radians((1 if i else -1)*abs(angle)*.35)
clip('Hop',list(hop_data),hop)
def hurt(f):
    angle={0:0,2:-7,5:4,9:-2,12:0}[f];body_ctrl.rotation_euler.x=math.radians(angle)
clip('Hurt',[0,2,5,9,12],hurt)

# Export only the actual model and pivot hierarchy. No cameras/ground/lights.
for ob in bpy.context.selected_objects:ob.select_set(False)
for ob in [*controls,body,*feet]:ob.select_set(True)
bpy.context.view_layer.objects.active=root
reset_pose();scene.frame_set(0)
for ob in controls:
    for track in ob.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(OUT/'M01-native-export.glb'),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=False,export_materials='EXPORT',export_animations=True,
    export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_frame_range=False,
    export_force_sampling=True,export_extras=True,export_vertex_color='MATERIAL',export_all_vertex_colors=True)
sys.path.insert(0,str(OUT))
from normalize_glb import normalize
normalize(OUT/'M01-native-export.glb',OUT/'M01-battery-hopper.glb')
for ob in controls:
    for track in ob.animation_data.nla_tracks:track.mute=True
reset_pose();bpy.context.view_layer.update()

stats=[]
for ob in [body,*feet]:
    ob.data.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(ob.data)
    stats.append({'name':ob.name,'vertices':len(ob.data.vertices),'triangles':len(ob.data.loop_triangles),
                  'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'flat_shading':all(not p.use_smooth for p in ob.data.polygons)})
    bm.free()
assert sum(o['triangles'] for o in stats)<1500,stats
assert all(o['non_manifold_edges']==0 for o in stats),stats

# Real Blender emission renders; no ImageGen or painted model previews.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12
scene.cycles.use_denoising=False
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
world=bpy.data.worlds.new('Plain_White');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1)
world.node_tree.nodes['Background'].inputs[1].default_value=1
scene.world=world
camera_data=bpy.data.cameras.new('Review_Camera');camera=bpy.data.objects.new('Review_Camera',camera_data)
scene.collection.objects.link(camera);scene.camera=camera;camera_data.type='ORTHO';camera_data.ortho_scale=3.5
def camera_at(position,target=(0,0,1.47)):
    camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
def render(name,position,res=1024,scale=3.5):
    scene.render.resolution_x=res;scene.render.resolution_y=res;scene.render.resolution_percentage=100
    camera_data.ortho_scale=scale;camera_at(position)
    scene.render.filepath=str(OUT/name);bpy.ops.render.render(write_still=True)
for name,pos in [('front',(0,-8,1.47)),('right',(8,0,1.47)),('back',(0,8,1.47)),('beauty',(4.8,-7,3.4))]:
    render('renders/'+name+'.png',pos)

# Store the editable source with the front-view camera and all three clips.
camera_at((0,-8,1.47));camera_data.ortho_scale=3.5
scene.render.resolution_x=1024;scene.render.resolution_y=1024
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'M01-battery-hopper.blend'))
manifest={'asset_id':'M01','name':'插頭跳豆 / Battery Hopper','blender_version':bpy.app.version_string,
 'source':'Original Blender-authored mesh based on user-approved semi-lowpoly M01 turnaround',
 'objects':stats,'triangles':sum(o['triangles'] for o in stats),'materials':1,'texture_images':0,
 'animations':['Idle','Hop','Hurt'],'scale':'approximately 3 meters/units high; game scale is adjustable',
 'authoring_axes':{'up':'+Z','front':'-Y'},'glTF_axes':{'up':'+Y','front':'+Z'},
 'validation':['Closed component topology checked in Blender','All mesh polygons flat shaded','Real through-holes in both plug blades','No textures or external providers'],
 'not_validated':['Production combat integration','Mobile hardware FPS','All remaining 11 monsters']}
(OUT/'blender-validation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('M01_VALIDATION',json.dumps(manifest,ensure_ascii=False))

for i in range(24):
    a=math.tau*i/24
    render('turntable/%02d.png'%i,(7*math.sin(a),-7*math.cos(a),3.2),512,3.6)
print('M01_BUILD_COMPLETE',OUT)
