"""Author the remaining ten reference-matched creatures using local Blender.
All source PNG are user references. Meshes use flat vertex colors, zero textures.
"""
from pathlib import Path
import sys,json,math
import bpy,bmesh
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'assets/monsters/m04-low-frequency'))
from normalize_glb import normalize
IDS=['M02','M03','M05','M06','M07','M08','B01','B02','B03','B04']
NAMES={'M02':'拖板爬蟲','M03':'MD滑翔盤','M05':'摺訊飛蛾','M06':'錯址速遞車','M07':'存檔游魂','M08':'補丁燈籠','B01':'總掣工頭','B02':'回帶港務機','B03':'無主分揀塔','B04':'未登出者'}
KIT=(ROOT/'tools/style/meshkit.py').read_text()

def build(id):
 ns={'__file__':str(ROOT/'tools/style/meshkit.py')};exec(KIT,ns)
 box,beam,cyl,mesh,paint,loft=[ns[k] for k in ['box','beam','cylinder','mesh','paint','loft']]
 ns['PALETTE'].update({'blue':'#217DCE','cyan':'#2AC3D4','green':'#5B9D7A','purple':'#8A79BF','silver':'#B8C2C6','amber':'#F5BA42'})
 scene=bpy.context.scene;scene.render.fps=24
 # Parts are merged per pivot, never baked into a static single object.
 body=[];groups=[]
 def group(name,parts,pivot,kind='step'):groups.append((name,parts,pivot,kind))
 def poly(name,outline,y,depth,key):
  n=len(outline);verts=[(x,yy,z) for yy in [y-depth/2,y+depth/2] for x,z in outline];faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];return paint(mesh(name,verts,faces),key)
 def visor(loc,width=.7,height=.28):
  x,y,z=loc
  body.append(box('Visor_Housing',loc,(width,.035,height),'joint',.025))
  body.append(poly('Angular_Signal',[(x-width*.38,z+height*.16),(x+width*.12,z-height*.02),(x+width*.06,z-height*.17),(x-width*.34,z-height*.05)],y-.032,.018,'cyan'))
  body.append(box('Asymmetric_Indicator',(x+width*.32,y-.033,z+height*.02),(width*.10,.02,height*.12),'amber'))
 def wheel(name,loc,r=.4,w=.25):
  o=cyl(name,loc,r,w,'joint',12);o.rotation_euler.z=math.pi/2;return o
 def foot(x,z=.15):return [box('Sole',(x,-.10,z-.08),(.43,.6,.14),'sole',.035),box('Toe',(x,-.13,z+.05),(.42,.57,.24),'ivory',.065)]
 def face_screen(loc,size=(.5,.04,.36),bars=2):
  body.append(box('Display',loc,size,'joint',.02))
  for i in range(bars):body.append(box('Status',(loc[0]+(i-(bars-1)/2)*size[0]*.28,loc[1]-.03,loc[2]),(.045,.022,size[2]*.36),'amber'))
 if id=='M02':
  body += [box('Power_Strip',(0,0,.96),(2.1,.76,.36),'ivory',.09)]
  for x in [-.65,0,.65]:
   for dx in [-.09,.09]:body.append(box('Socket',(x+dx,0,1.146),(.07,.14,.016),'joint'))
  body += [box('Switch',(.83,-.05,1.15),(.15,.25,.025),'orange'),box('Rear_Inlet',(0,.39,.96),(.28,.03,.14),'joint',.02)]
  for x in [-.55,.55]:body.append(box('Blue_Indicator',(x,-.39,.94),(.30,.02,.09),'cyan'))
  for i,(x,y) in enumerate([(-1,-.3),(-1,.3),(1,-.3),(1,.3)]):
   knee=(x*1.2,y,.58);end=(x*1.30,y,.20)
   group('Leg'+str(i),[beam('Link',(x,y,.94),knee,.19,.20,'green'),beam('Link',knee,end,.19,.20,'green'),box('Pad',(end[0],y,.11),(.3,.28,.19),'sole',.035)],(x,y,.94))
 elif id=='M03':
  o=box('MD_Case',(0,0,1.20),(1.18,.23,1.18),'blue',.055);o.rotation_euler.y=math.pi/4;body.append(o)
  body += [cyl('Disc_Hub',(0,-.15,1.20),.20,.055,'silver',8),cyl('Hub_Inset',(0,-.185,1.20),.075,.025,'joint',8),box('MD_Shutter',(0,.13,1.2),(.62,.025,.76),'silver',.03)]
  for s in [-1,1]:
   wing=[]
   for i in range(4):
    a0=-math.pi*.42+i*math.pi*.84/4;a1=a0+math.pi*.84/4
    pts=[(s*(.67+r*math.cos(a)),1.2+r*math.sin(a)) for r,a in [(.2,a0),(.65,a0),(.65,a1),(.2,a1)]]
    wing.append(poly('Fan',pts,0,.14,'cyan' if i in [1,2] else 'silver'))
   group('Fan'+str(s),wing,(s*.67,0,1.2),'wing')
   body.append(cyl('Drive_Roller',(s*.36,-.02,.32),.14,.22,'silver',8))
 elif id=='M05':
  body += [box('Phone_Upper',(0,0,1.55),(.57,.25,.98),'purple',.055),box('Screen_Border',(0,-.145,1.52),(.44,.03,.62),'ivory',.035)]
  face_screen((0,-.171,1.54),(.32,.03,.43),1)
  keypad=[box('Keypad',(0,-.01,.57),(.55,.24,.75),'ivory',.045)]
  for x in [-.15,0,.15]:
   for z in [.38,.52,.66,.80]:keypad.append(box('Key',(x,-.145,z),(.10,.025,.08),'silver',.015))
  group('Keypad',keypad,(0,0,.95),'fold')
  for s in [-1,1]:
   group('Wing'+str(s),[poly('Wing',[(s*.26,1.27),(s*1.18,2.16),(s*.94,1.48),(s*.38,1.05)],0,.14,'purple'),poly('Wing_Inlay',[(s*.38,1.30),(s*.95,1.86),(s*.76,1.42)],-.08,.025,'ivory')],(s*.3,0,1.23),'wing')
 elif id=='M06':
  body += [box('Parcel_Cart',(0,0,.80),(1.2,.90,1.05),'ivory',.13),box('Cargo_Hatch',(0,.46,.86),(.77,.035,.67),'silver',.035),box('Neck',(0,0,1.62),(.18,.22,.62),'joint',.03)]
  head=[box('Scanner_Head',(0,-.01,1.98),(.83,.43,.35),'ivory',.065),box('Scanner',(0,-.24,1.98),(.64,.025,.18),'joint',.015)]
  head.append(poly('Scanner_Slit',[(-.25,2.035),(.12,1.995),(.07,1.945),(-.24,1.975)],-.264,.015,'orange'))
  group('Head',head,(0,0,1.83),'head')
  body.append(box('Status',(0,-.46,.82),(.075,.025,.32),'cyan'))
  for s in [-1,1]:
   wh=[wheel('Wheel',(s*.72,0,.44),.43,.28),wheel('Hub',(s*.87,0,.44),.21,.025)]
   paint(wh[1],'silver');group('Wheel'+str(s),wh,(s*.72,0,.44),'wheel')
   body.append(poly('Delivery_Arrow',[(s*.615,.99),(s*.615,.99)],0,.01,'orange')) if False else None
  body.append(poly('Route_Arrow',[(-.28,.98),(.07,.98),(.07,1.07),(.28,.90),(.07,.73),(.07,.82),(-.28,.82)],-.468,.02,'orange'))
 elif id=='M07':
  outline=[(math.cos(i*math.tau/8),math.sin(i*math.tau/8)) for i in range(8)]
  body.append(loft('Pocket_Device',[(.28,.43,.28,0,0),(.52,.68,.40,0,0),(1.16,.72,.43,0,0),(1.72,.49,.31,0,0),(1.93,.18,.14,0,0)],outline,'green'))
  visor((0,-.443,1.05),.75,.29)
  for x in [-.18,.18]:body.append(box('Service_Key',(x,-.39,.65),(.10,.04,.075),'joint',.008))
  body += [cyl('Memory_Back',(0,.39,1.02),.49,.12,'cyan',10),box('Antenna',(0,0,2.07),(.12,.12,.30),'green',.025)]
  for s in [-1,1]:group('Foot'+str(s),foot(s*.4), (s*.4,0,.32))
 elif id=='M08':
  outline=[(math.cos(i*math.tau/8),math.sin(i*math.tau/8)) for i in range(8)]
  body += [loft('Work_Lantern',[(.64,.63,.44,0,0),(1.30,.43,.30,0,0),(1.40,.29,.24,0,0)],outline,'ivory'),loft('Bottom_Rim',[(.60,.64,.45,0,0),(.69,.64,.45,0,0)],outline,'silver')]
  group('Light',[loft('Diffuser',[(.12,.16,.12,0,0),(.59,.57,.39,0,0)],outline,'green')],(0,0,.6),'hover')
  handle=[]
  for x in [-.53,.53]:handle.append(box('Handle_Side',(x,0,1.63),(.10,.11,.71),'silver',.025))
  handle.append(box('Handle_Top',(0,0,1.98),(1.11,.11,.10),'silver',.025));group('Handle',handle,(0,0,1.32),'handle')
  body.append(box('Switch',(0,-.36,.97),(.25,.03,.075),'amber'))
 elif id=='B01':
  body += [box('Switch_Cabinet',(0,0,1.85),(1.35,.65,1.75),'green',.07),box('Door_Panel',(0,-.34,1.85),(1.05,.025,1.45),'green',.025),box('Indicator',(.43,-.365,2.15),(.085,.02,.42),'cyan')]
  for s in [-1,1]:
   for z in [2.15,2.32,2.49]:body.append(box('Cable_Bus',(s*.92,0,z),(.58,.13,.075),'silver',.02))
   arm=[beam('Upper_Arm',(s*.8,0,2.05),(s*1.15,0,1.55),.28,.33,'ivory'),beam('Forearm',(s*1.15,0,1.55),(s*1.12,-.13,1.16),.34,.39,'ivory')]
   for x in [-.10,.10]:arm.append(beam('Service_Gripper',(s*1.12+x,-.14,1.18),(s*1.12+x*1.5,-.18,.98),.075,.12,'silver'))
   if s>0:
    bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=4,major_radius=.27,minor_radius=.065,location=(s*1.15,-.14,1.4),rotation=(math.pi/2,0,0));o=bpy.context.object;paint(o,'joint');arm.append(o)
   group('Arm'+str(s),arm,(s*.8,0,2.05),'arm')
   group('Leg'+str(s),[beam('Leg',(s*.42,0,1.1),(s*.56,0,.40),.29,.35,'ivory'),wheel('Wheel_Foot',(s*.56,0,.28),.26,.35)],(s*.42,0,1.1))
  body.append(box('Top_Handle',(0,0,2.80),(.5,.2,.12),'orange',.025))
 elif id=='B02':
  body.append(box('Deck',(0,0,1.45),(1.4,.6,.65),'silver',.06));face_screen((0,-.32,1.47),(.95,.03,.34),4)
  for s in [-1,1]:
   reel=[]
   for x,r,key in [(s*.87,.75,'blue'),(s*1.06,.65,'ivory'),(s*1.09,.19,'joint')]:
    o=wheel('Reel',(x,0,1.8),r,.13);paint(o,key);reel.append(o)
   group('Reel'+str(s),reel,(s*.87,0,1.8),'wheel')
   group('Leg'+str(s),[beam('Support',(s*.57,0,1.2),(s*.78,0,.40),.24,.32,'blue'),*foot(s*.78,.2)],(s*.57,0,1.2))
 elif id=='B03':
  for z,w in [(1.3,1.15),(1.9,1.30),(2.5,1.36)]:body.append(box('Sorting_Module',(0,0,z),(w,.62,.43),'ivory',.055))
  face_screen((0,-.33,1.91),(1.06,.03,.28),5)
  body += [beam('Dish_Mast',(0,0,2.7),(.12,0,3.0),.12,.14,'purple'),poly('Dish',[(-.23,2.96),(.35,2.85),(.43,3.20)],0,.14,'silver')]
  for i,(x,y) in enumerate([(-.68,-.16),(.68,-.16),(0,.5)]):group('Leg'+str(i),[beam('Tripod',(x*.4,y*.4,1.15),(x,y,.12),.22,.23,'purple'),box('Pad',(x,y,.08),(.44,.42,.14),'ivory',.03)],(x*.4,y*.4,1.15))
  for s in [-1,1]:group('Scanner'+str(s),[beam('Arm',(s*.65,0,1.8),(s*1.12,-.1,1.64),.16,.17,'purple'),box('Parcel_Scanner',(s*1.15,-.10,1.78),(.35,.30,.3),'silver',.035),box('Scan_Window',(s*1.15,-.27,1.78),(.23,.02,.09),'orange')],(s*.65,0,1.8),'arm')
 elif id=='B04':
  outline=[(math.cos(i*math.tau/8),math.sin(i*math.tau/8)) for i in range(8)]
  body += [loft('Public_Terminal',[(.25,.37,.29,0,0),(.55,.67,.43,0,0),(1.30,.75,.48,0,0),(1.99,.53,.35,0,0),(2.25,.19,.17,0,0)],outline,'ivory')]
  visor((0,-.49,1.34),.83,.27)
  for s in [-1,1]:
   group('Shell_Upper'+str(s),[poly('Outer_Shell',[(s*.55,2.13),(s*.96,1.86),(s*1.06,2.04),(s*.72,2.40)],0,.24,'cyan')],(s*.55,0,2.13),'wing')
   group('Shell_Lower'+str(s),[poly('Outer_Shell',[(s*.73,.51),(s*1.02,.72),(s*1.06,1.02),(s*.85,.91)],0,.24,'cyan')],(s*.73,0,.51),'hover')
   group('Foot'+str(s),[beam('Terminal_Stand',(s*.38,0,.47),(s*.76,-.02,.1),.22,.35,'silver')],(s*.38,0,.47))
 # Merge components at explicit pivots, with a single vertex-color material.
 groups.insert(0,('Body',body,(0,0,1.2),'body'))
 material=ns['material'];parts=[];ctrls=[]
 def control(name,loc,parent=None):
  o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=loc;o.parent=parent;return o
 root=control(id+'_Root',(0,0,0))
 for name,objects,pivot,kind in groups:
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=id+'_'+name
  o.data.materials.clear();o.data.materials.append(material)
  for p in o.data.polygons:p.material_index=0
  ctrl=control(id+'_'+name+'_CTRL',pivot,root);bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=ctrl;o.matrix_world=world
  parts.append(o);ctrls.append((ctrl,kind))
 allctrl=[root,*[c for c,k in ctrls]]
 bpy.context.view_layer.update()
 positions=[o.matrix_world@v.co for o in parts for v in o.data.vertices];lo=min(v.z for v in positions)
 root.location.z-=lo
 rest={o.name:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for o in allctrl}
 def reset():
  for o in allctrl:o.location,o.rotation_euler,o.scale=[v.copy() for v in rest[o.name]]

 for clip,frames in [('Idle',[0,12,24,36,48]),('Move',list(range(0,25,3))),('Hurt',[0,2,5,9,12])]:
  for o in allctrl:o.animation_data_create();o.animation_data.action=bpy.data.actions.new(clip+'_'+o.name)
  for f in frames:
   reset();a=math.sin(f/(48 if clip=='Idle' else 24)*math.tau)
   for i,(c,kind) in enumerate(ctrls):
    if clip=='Hurt' and kind=='body':c.rotation_euler.x=math.radians({0:0,2:-8,5:4,9:-2,12:0}[f])
    if clip=='Idle':
     if kind=='body':c.scale.x=1+a*.008
     if kind in ['wing','hover','handle']:c.rotation_euler.y=a*.025
    if clip=='Move':
     if kind=='wheel':c.rotation_euler.x=f/24*math.tau
     elif kind=='step':c.rotation_euler.x=a*.23*(1 if i%2 else -1)
     elif kind=='wing':c.rotation_euler.z=a*.12*(1 if i%2 else -1)
     elif kind=='fold':c.rotation_euler.x=a*.10
     elif kind=='body':c.location.z+=abs(a)*.02
     else:c.rotation_euler.y=a*.04
   for o in allctrl:
    for path in ['location','rotation_euler','scale']:o.keyframe_insert(path,frame=f)
  for o in allctrl:
   action=o.animation_data.action
   for curve in action.fcurves:
    for k in curve.keyframe_points:k.interpolation='LINEAR'
   o.animation_data.action=None;t=o.animation_data.nla_tracks.new();t.name=clip;t.strips.new(action.name,0,action);t.mute=True
 reset();scene.frame_set(0);bpy.context.view_layer.update()
 stats=[]
 for o in parts:
  o.data.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(o.data);stats.append({'name':o.name,'triangles':len(o.data.loop_triangles),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges)});bm.free()
 assert all(x['nonManifoldEdges']==0 for x in stats),(id,stats)
 out=ROOT/'assets/monsters'/id.lower();out.mkdir(parents=True,exist_ok=True)
 bpy.ops.object.select_all(action='DESELECT')
 for o in [*allctrl,*parts]:
  o.select_set(True)
  for t in (o.animation_data.nla_tracks if o.animation_data else []):t.mute=False
 bpy.ops.export_scene.gltf(filepath=str(out/'native.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_frame_range=False,export_force_sampling=True,export_extras=True,export_vertex_color='MATERIAL',export_all_vertex_colors=True)
 normalize(out/'native.glb',out/(id+'.glb'))
 for o in allctrl:
  for t in o.animation_data.nla_tracks:t.mute=True
 reset();bpy.context.view_layer.update()
 scene.render.engine='CYCLES';scene.cycles.samples=1;scene.cycles.use_denoising=False;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 world=bpy.data.worlds.new('Pure_White');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);scene.world=world
 points=[o.matrix_world@v.co for o in parts for v in o.data.vertices];low=Vector(tuple(min(v[i] for v in points) for i in range(3)));high=Vector(tuple(max(v[i] for v in points) for i in range(3)));center=(low+high)/2
 cd=bpy.data.cameras.new('Review');cam=bpy.data.objects.new('Review',cd);scene.collection.objects.link(cam);scene.camera=cam;cd.type='ORTHO';cd.ortho_scale=max(high.x-low.x,high.z-low.z)*1.25
 for name,delta in [('front',(0,-8,0)),('right',(8,0,0)),('back',(0,8,0))]:
  cam.location=center+Vector(delta);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(id+'.blend')))
 report={'id':id,'name':NAMES[id],'source':'Original Blender-authored geometry derived from user-provided three views; clean unlit style revision','meshes':stats,'triangles':sum(x['triangles'] for x in stats),'bounds':{'min':list(low),'max':list(high)},'height':high.z-low.z,'clips':['Idle','Move','Hurt'],'textures':0,'material':'flat vertex colors, unlit','styleRevision':'2026-10-26 textureless','validationStage':'Blender authoring; see docs/style-complete/runtime-validation.json for later runtime evidence'}
 (out/'blender.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('ASSET_DONE',id,report['triangles'],flush=True)
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else IDS
assert all(id in IDS for id in requested)
for id in requested:build(id)
