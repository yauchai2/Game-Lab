"""Author the remaining twenty distinct floating-island compositions locally."""
from pathlib import Path
import sys,json,math
import bpy
R=Path(__file__).resolve().parents[2];sys.path.insert(0,str(R/'tools/maps'));import island_meshkit as K
ROSTER=json.loads((R/'docs/floating-island-redesign/map-list.json').read_text())['maps']
SLUGS=['bridge-repair','rain-underpass','neon-promenade','night-market','closed-atrium','freight-station','riverside-works','cargo-quay','ferry-point','hill-relay','snow-duty','quarry-yard','underground-relay','roof-cooling','antenna-relay','radio-rooftop','closed-fairground','cold-warehouse','power-vault','practice-court']
# Every entry is a composed set of different landmark geometry, not a palette swap.
RECIPES={
 'FI03':('bridge', [('bridge',0,11,27,4,7),('repair',-13,5,7,5,4),('reels',14,7,4,4,2)],'green','asphalt'),
 'FI04':('underpass',[('retaining',-17,5,3,16,5),('retaining',17,5,3,16,4),('canopy',0,10,14,3,3.6),('reels',-13,-4,3,3,1.7)],'blue','slate'),
 'FI05':('neon',[('shop',-11,10,9,5,6),('shop',0,11,9,4,7),('signs',11,10,6,4,6),('tree',-17,0,3,3,6)],'purple','slate'),
 'FI06':('market',[('stall',-11,8,6,4,3.8),('grill',-3,11,5,4,3.5),('stall',6,10,6,4,3.7),('stall',14,5,4,5,3.5)],'coral','sand'),
 'FI07':('atrium',[('arcade',0,12,25,3,6),('shop',-15,4,5,8,5),('escalator',13,7,4,7,3)],'purple','ivory'),
 'FI08':('station',[('platform',0,11,32,7,1),('canopy',0,11,25,5,5),('station',-16,7,5,5,4.5),('cargo',16,9,5,4,2.5)],'blue','asphalt'),
 'FI09':('factory',[('factory',-11,10,17,6,6),('crane',15,9,5,5,9),('pipes',-17,0,3,8,3)],'coral','concrete'),
 'FI10':('port',[('cargo',-13,11,11,5,4),('cargo',1,13,8,4,2.5),('crane',16,9,4,4,10),('bollards',0,-14,16,1,1)],'blue','concrete'),
 'FI11':('ferry',[('ferry',-7,10,15,5,4),('canopy',10,10,6,4,3.3),('tree',-15,2,3,3,6),('bollards',6,-12,8,1,1)],'cyan','sand'),
 'FI12':('hill',[('lattice',11,10,5,5,10),('supply',-11,10,9,5,4),('reels',-15,1,3,3,2)],'green','grass'),
 'FI13':('snow',[('supply',-8,10,10,5,4),('rock',12,11,7,5,5),('mast',13,2,2,2,6),('tree',-14,1,3,3,5.5)],'blue','snow'),
 'FI14':('quarry',[('rockwall',0,14,29,5,6),('excavator',14,8,6,5,5),('shed',-14,8,8,5,4)],'amber','sand'),
 'FI15':('underground',[('arcade',0,13,27,3,5.5),('transmitter',-14,6,5,7,4),('escalator',14,7,4,7,3.5)],'cyan','slate'),
 'FI16':('cooling',[('acbank',-10,10,12,5,4),('ducts',9,11,9,4,3),('hut',12,3,4,4,3.4)],'cyan','concrete'),
 'FI17':('antenna',[('dish',-11,9,6,6,7),('lattice',12,11,4,4,9),('transmitter',-15,0,3,4,3)],'blue','concrete'),
 'FI18':('radio',[('studio',-8,11,14,5,5.5),('lattice',14,10,4,4,10),('mixdesk',6,9,6,3,1.5)],'coral','concrete'),
 'FT01':('fairground',[('ferris',-8,11,15,4,10),('booth',10,9,6,5,4),('ride',-14,2,4,4,3)],'coral','asphalt'),
 'FT02':('coldstore',[('coldwall',0,13,26,3,6),('freezer',-14,5,4,10,4),('coldcargo',13,8,5,5,3)],'cyan','slate'),
 'FT03':('substation',[('transformer',-11,10,9,5,4),('transformer',5,12,8,4,4),('busbars',14,6,3,8,6)],'amber','concrete'),
 'FP01':('practice',[('booth',0,9,8,4,3.3),('target',-10,3,2,2,2),('target',10,3,2,2,2)],'cyan','concrete')}
THEMES={'green':('#649C73','#E1B34F','#718E91'),'blue':('#337DA5','#E4B54E','#A4B5BF'),'purple':('#7B68AC','#32B5BB','#A5A9C0'),'coral':('#D9755C','#44A8AE','#B4ABA0'),'cyan':('#30AEB9','#E8B14D','#8CAEB2'),'amber':('#D0A14C','#5C96A2','#B1AD9F')}
def footprint(w,h,n):
 a,b=w/2,h/2
 # Different bevels, tapers and asymmetry keep the city fragments distinct.
 c=[(.14,.22,.10,.20),(.24,.13,.20,.10),(.09,.26,.18,.14),(.19,.16,.27,.09),(.12,.12,.22,.25)][n%5]
 return [[-a,-b+c[0]*h],[-a+c[1]*w,-b],[a-c[2]*w,-b],[a,-b+c[3]*h],[a,b-.16*h],[a-.14*w,b],[-a+.11*w,b],[-a,b-.21*h]]
def build(row,n):
 id=row['id'];stem=id.lower()+'-'+SLUGS[n];out=R/'assets/maps'/stem;out.mkdir(parents=True,exist_ok=True);(R/'docs/floating-island-redesign'/id.lower()).mkdir(parents=True,exist_ok=True)
 w,h=row['designFootprintMeters'];w,h=float(w),float(h)
 if id=='FI04':h=28 # Allow a readable underpass and boss turn without a corridor trap.
 kind,parts,theme,base=RECIPES[id];hot,accent,metal=THEMES[theme]
 P={'ivory':'#E8DDC4','edge':'#AEB8B3','wall':'#E9DFC8','cyan':hot,'accent':accent,'dark':'#2D4656','glass':'#315E74','green':'#66AD48','leaf':'#378660','wood':'#A8794B','metal':metal,'rock':'#4C5F6C','water':'#4F9EBA','ground':{'asphalt':'#536A7B','slate':'#667688','sand':'#C8B88D','ivory':'#C7C6B6','concrete':'#A8B5B4','grass':'#88AD71','snow':'#D8E6E6'}[base]}
 K.setup(P,id+'_Unlit_Palette');fp=footprint(w,h,n)
 # Rear slopes are real, continuously navigable surfaces, not separate floating steps.
 ramp={'start':4,'end':10,'rise':1.0 if id!='FI14' else 1.5} if id in ['FI12','FI13','FI14','FI16'] else None
 def H(x,y):return 0 if not ramp else max(0,min(1,(y-ramp['start'])/(ramp['end']-ramp['start'])))*ramp['rise']
 def B(name,x,y,z,bw,bd,bh,key):return K.box(name,x,y,z+H(x,y),bw,bd,bh,key)
 def C(name,x,y,z,r,d,key,axis='Z',segments=12):return K.cylinder(name,x,y,z+H(x,y),r,d,key,axis,segments)
 def beam(name,a,b,width,key):
  a=K.Vector((a[0],a[1],a[2]+H(a[0],a[1])));b=K.Vector((b[0],b[1],b[2]+H(b[0],b[1])));o=K.box(name,*(a+b)/2,width,width,(b-a).length,key);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
 def clip(poly,edgeA,edgeB):
  def side(p):return (edgeB[0]-edgeA[0])*(p[1]-edgeA[1])-(edgeB[1]-edgeA[1])*(p[0]-edgeA[0])
  result=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   sa,sb=side(a),side(b)
   if sa>=-1e-8:result.append(a)
   if (sa>=0)!=(sb>=0):t=sa/(sa-sb);result.append([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])])
  return result
 def surface(name,poly,z,key):
  if not ramp:K.polygon(name,poly,z,key);return
  # Clip a 2m mesh to the convex region, then evaluate the same analytic ramp as runtime.
  verts=[];faces=[]
  for x in range(-int(w/2)-2,int(w/2)+2,2):
   ys=sorted(set(list(range(-int(h/2)-2,int(h/2)+3,2))+[ramp['start'],ramp['end']]))
   for y,y2 in zip(ys,ys[1:]):
    cell=[[x,y],[x+2,y],[x+2,y2],[x,y2]]
    for a,b in zip(poly,poly[1:]+poly[:1]):
     if not cell:break
     cell=clip(cell,a,b)
    # Avoid duplicates at exact clipping boundaries.
    clean=[]
    for p in cell:
     if not clean or math.dist(clean[-1],p)>1e-6:clean.append(p)
    if len(clean)>2 and math.dist(clean[0],clean[-1])<1e-6:clean.pop()
    if len(clean)<3:continue
    area=abs(sum(clean[i][0]*clean[(i+1)%len(clean)][1]-clean[(i+1)%len(clean)][0]*clean[i][1] for i in range(len(clean))))/2
    if area<1e-8:continue
    k=len(verts);verts.extend((a,b,z+H(a,b)) for a,b in clean);faces.append(tuple(k+i for i in range(len(clean))))
  K.mesh(name,verts,faces,key,False)
 K.foundation(fp)
 # A small non-rectangular apron links the landmark frontage to an open forecourt.
 shapes={
 'bridge':[[-.43,-.30],[-.18,-.30],[-.18,.22],[.36,.22],[.36,.38],[-.43,.38]],
 'underpass':[[-.40,-.14],[.38,-.14],[.38,.13],[-.40,.13]],
 'neon':[[-.43,-.27],[-.24,-.27],[-.24,.20],[.38,.20],[.38,.39],[-.43,.39]],
 'market':[[-.34,-.35],[.32,-.35],[.32,.13],[.13,.13],[.13,.36],[-.13,.36],[-.13,.13],[-.34,.13]],
 'atrium':[[-.32,-.25],[.30,-.25],[.30,.18],[-.32,.18]],
 'station':[[-.36,-.29],[-.12,-.36],[.38,-.08],[.38,.21],[.15,.21]],
 'factory':[[-.38,-.28],[-.25,-.36],[.36,.20],[.26,.32]],
 'port':[[-.38,-.22],[.31,-.22],[.31,.14],[-.38,.14]],
 'ferry':[[-.40,-.29],[.35,-.29],[.35,.03],[.10,.03],[.10,.35],[-.13,.35],[-.13,.03],[-.40,.03]],
 'hill':[[-.40,-.33],[-.15,-.33],[.22,.37],[-.04,.37]],
 'snow':[[-.38,-.30],[-.12,-.30],[.20,.35],[-.08,.35]],
 'quarry':[[-.38,-.34],[.30,-.34],[.38,.12],[-.20,.18],[-.36,0]],
 'underground':[[-.40,-.10],[.38,-.10],[.38,.15],[-.40,.15]],
 'cooling':[[-.34,-.34],[.12,-.34],[.34,.14],[-.12,.14]],
 'antenna':[[-.39,.08],[-.10,.08],[-.10,.37],[-.39,.37]],
 'radio':[[-.38,-.30],[.32,-.30],[.32,-.10],[-.09,.28],[-.38,.28]],
 'fairground':[[-.33,-.30],[-.13,-.36],[.34,.12],[.22,.29]],
 'coldstore':[[-.33,-.28],[.32,-.28],[.32,.22],[-.33,.22]],
 'substation':[[-.35,-.10],[.34,-.10],[.34,.11],[-.35,.11]],
 'practice':[[-.36,-.29],[.35,-.29],[.35,.20],[-.36,.20]]}
 fore=[[x*w,y*h] for x,y in shapes[kind]]
 surface('GEO_ground',fp,.015,'ground')
 surface('GEO_forecourt',fore,.06,{'underpass':'metal','neon':'metal','atrium':'edge','factory':'metal','port':'edge','snow':'metal','quarry':'edge','cooling':'edge','antenna':'edge','fairground':'metal','coldstore':'metal','substation':'dark','practice':'edge'}.get(kind,'ivory'))
 groups=['GEO_foundation','GEO_ground','GEO_forecourt','GEO_rim'];obstacles=[];occluders=[]
 for a,b in zip(fp,fp[1:]+fp[:1]):
  mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2;o=B('GEO_rim',mx,my,.06,math.dist(a,b),.22,.12,'edge');o.rotation_euler.z=math.atan2(b[1]-a[1],b[0]-a[0])
 def landmark(t,x,y,bw,bd,bh,idx):
  prefix='LAND_'+str(idx)+'_'+t;groups.append(prefix);occluders.append(prefix)
  # Entire footprint, including overhead eaves/arms, is reserved for movement.
  obstacles.append({'id':prefix,'center':[x,y],'size':[bw+.6,bd+.6]})
  if ramp and H(x,y)>0:B(prefix+'_foundation',x,y,-.3,bw+.25,bd+.25,1.4,'edge')
  def b(s,dx,dy,z,ww,dd,hh,key='wall'):return B(prefix+'_'+s,x+dx,y+dy,z,ww,dd,hh,key)
  def c(s,dx,dy,z,r,d,key='metal',axis='Z',nn=12):return C(prefix+'_'+s,x+dx,y+dy,z,r,d,key,axis,nn)
  if t in ['shop','supply','station','hut','studio','repair','shed','booth','ferry']:
   b('body',0,0,bh/2,bw,bd,bh);b('roof',0,0,bh+.15,bw+.5,bd+.4,.3,'ivory');b('window',0,-bd/2-.06,bh*.48,bw*.75,.12,bh*.4,'glass');b('awning',0,-bd/2-.5,bh*.75,bw+.35,1.1,.3,'cyan')
   for dx in [-bw*.25,0,bw*.25]:b('post',dx,-bd/2-.13,bh*.48,.12,.12,bh*.4,'metal')
   if t in ['repair','supply']:b('worktop',0,-bd/2-.45,1.1,bw*.6,.8,.15,'wood');c('radio',-1,-bd/2-.5,1.6,.3,.15,'dark','Y')
   if t=='studio':c('disc',0,-bd/2-.18,bh*.78,.8,.14,'dark','Y');c('hub',0,-bd/2-.28,bh*.78,.16,.05,'accent','Y')
   if t=='ferry':b('sign',bw*.3,-bd/2-.14,bh*.72,1.6,.15,.7,'accent')
  elif t in ['canopy','bridge','platform','retaining']:
   if t=='retaining':b('wall',0,0,bh/2,bw,bd,bh,'metal');b('cap',0,0,bh,bw+.4,bd+.4,.25,'ivory')
   elif t=='platform':b('platform',0,0,.45,bw,bd,.9,'metal');b('edge',0,-bd/2,.92,bw,.35,.12,'accent')
   else:
    b('deck',0,0,bh,bw,bd,.55,'ivory')
    for dx in [-bw*.38,bw*.38]:b('pier',dx,0,bh/2,.65,.8,bh,'metal')
    if t=='bridge':
     for dy in [-bd*.43,bd*.43]:b('rail',0,dy,bh+.9,bw,.15,.2,'leaf')
     for dx in range(-int(bw/2),int(bw/2)+1,3):b('railpost',dx,bd*.43,bh+.45,.12,.12,.9,'metal')
    else:b('fascia',0,-bd/2,bh-.15,bw,.18,.5,'cyan')
  elif t=='arcade':
   b('lintel',0,0,bh,bw,bd,.65,'ivory');b('back',0,bd*.35,bh*.48,bw,.45,bh*.95,'wall')
   for dx in range(-int(bw/2),int(bw/2)+1,4):b('column',dx,-bd*.3,bh/2,.55,.55,bh,'metal')
   for dx in range(-int(bw/2)+2,int(bw/2),4):b('shutter',dx,-bd*.15,bh*.4,3,.15,bh*.6,'glass');b('sign',dx,-bd*.2,bh*.8,2.8,.18,.55,'cyan')
  elif t in ['stall','grill']:
   b('counter',0,0,.7,bw,bd*.6,1.4,'wood');b('awning',0,0,bh,bw+.3,bd+.4,.25,'cyan' if idx%2 else 'accent')
   for dx in [-bw*.43,bw*.43]:b('pole',dx,0,bh/2,.14,.14,bh,'metal')
   if t=='grill':b('grill',0,-.5,1.45,bw*.7,1,.18,'dark');c('hood',bw*.3,bd*.25,bh*.65,.4,bh*.8,'metal')
   else:
    for dx in [-bw*.28,0,bw*.28]:b('trays',dx,-.1,1.5,.65,.7,.22,'accent')
  elif t in ['cargo','coldcargo','coldwall','freezer']:
   b('case',0,0,bh/2,bw,bd,bh,'metal' if t!='coldcargo' else 'ivory');b('frame',0,-bd/2-.05,bh/2,bw*.9,.12,bh*.85,'cyan')
   for dx in [-bw*.23,bw*.23]:b('door',dx,-bd/2-.13,bh/2,bw*.43,.12,bh*.76,'ivory');b('handle',dx,-bd/2-.23,bh*.45,.15,.12,bh*.3,'dark')
   if t=='coldwall':
    for dx in [-bw*.3,0,bw*.3]:c('fan',dx,-bd/2-.22,bh*.7,.7,.15,'dark','Y');c('hub',dx,-bd/2-.32,bh*.7,.22,.05,'metal','Y')
  elif t in ['factory','rockwall']:
   if t=='factory':
    b('hall',0,0,bh*.4,bw,bd,bh*.8,'metal')
    for j in range(3):
     xx=-bw*.33+j*bw*.33;K.mesh(prefix+'_sawroof',[(x+xx-bw/6,y-bd/2,H(x,y)+bh*.8),(x+xx+bw/6,y-bd/2,H(x,y)+bh*.8),(x+xx,y-bd/2,H(x,y)+bh),(x+xx-bw/6,y+bd/2,H(x,y)+bh*.8),(x+xx+bw/6,y+bd/2,H(x,y)+bh*.8),(x+xx,y+bd/2,H(x,y)+bh)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'ivory')
   else:
    for j in range(6):
     xx=x-bw*.4+j*bw*.16;bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(xx,y,H(xx,y)+bh*.42));o=bpy.context.object;o.name=prefix+'_rock';o.scale=(bw*.12,bd*.7,bh*(.5+(j%3)*.08));bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);K.paint(o,'edge')
  elif t=='traincar':
   b('body',0,0,1.8,bw,bd,2.5,'ivory');b('blue_lower',0,0,.8,bw,bd,1,'cyan');b('roof',0,0,3.1,bw+.2,bd+.1,.2,'metal')
   for dx in [-bw*.32,-bw*.10,bw*.12,bw*.34]:b('window',dx,-bd/2-.05,2.3,bw*.15,.08,.8,'glass')
   for dx in [-bw*.3,bw*.3]:c('wheel',dx,-bd*.44,.5,.4,.18,'dark','Y',8)
  elif t in ['lattice','mast','crane','busbars']:
   if t=='mast':c('mast',0,0,bh/2,.18,bh,'metal',nn=8);b('head',0,0,bh,1.3,.5,.5,'cyan')
   elif t=='busbars':
    for dy in [-bd*.34,0,bd*.34]:b('upright',0,dy,bh/2,.35,.4,bh,'metal');b('busbar',0,dy,bh,bw,.3,.3,'accent');c('insulator',0,dy,bh*.6,.3,.9,'ivory')
   else:
    for dx in [-bw*.3,bw*.3]:b('leg',dx,0,bh/2,.4,.5,bh,'metal')
    for j in range(3):
     z=j*bh/3;beam(prefix+'_brace',(x-bw*.3,y,z),(x+bw*.3,y,z+bh/3),.16,'cyan');beam(prefix+'_brace',(x+bw*.3,y,z),(x-bw*.3,y,z+bh/3),.16,'metal')
    if t=='crane':b('jib',-bw*.7,0,bh,bw*2.5,.55,.55,'accent');b('cable',-bw*1.5,0,bh*.68,.08,.08,bh*.6,'dark');b('counterweight',bw*.4,0,bh-.3,bw*.7,1.4,1.3,'metal')
    else:
     for z in [bh*.65,bh*.83,bh]:b('antenna',0,0,z,bw*1.25,.15,.15,'ivory')
  elif t=='signs':
   for j in range(2):
    dx=(j-.5)*bw*.55;b('post',dx,0,bh/2,.25,.3,bh,'metal');b('panel',dx,-.2,bh*(.72-j*.18),bw*.60,.55,bh*.40,'cyan' if j==0 else 'accent');b('inset',dx,-.5,bh*(.72-j*.18),bw*.43,.08,bh*.22,'dark')
   b('base',0,0,.3,bw,bd,.6,'edge')
  elif t=='dish':
   b('stand',0,0,bh*.35,.45,.65,bh*.7,'metal');c('dish',0,0,bh*.72,bw*.43,.35,'ivory','Y',16);c('dish_inner',0,-.2,bh*.72,bw*.31,.06,'cyan','Y',16);beam(prefix+'_feed',(x,y-.25,bh*.72),(x,y-2,bh*.8),.12,'metal')
  elif t in ['acbank','ducts','transformer','transmitter','mixdesk']:
   count=3 if t=='acbank' else 2
   for j in range(count):
    dx=(j-(count-1)/2)*bw/count;b('case',dx,0,bh*.48,bw/count-.25,bd,bh*.95,'metal');b('cap',dx,0,bh,bw/count,bd+.2,.15,'ivory')
    if t=='transformer':
     for z in [bh+.2,bh+.5,bh+.8]:c('insulator',dx,0,z,.35,.18,'ivory',nn=8)
     b('bus',dx,0,bh+1,bw/count*.7,.18,.18,'cyan')
    elif t=='acbank':c('fan',dx,-bd/2-.15,bh*.55,min(bw/count*.3,bh*.32),.16,'dark','Y');c('hub',dx,-bd/2-.25,bh*.55,.20,.05,'cyan','Y')
    else:b('panel',dx,-bd/2-.10,bh*.6,bw/count*.7,.12,bh*.5,'dark');b('indicator',dx,-bd/2-.18,bh*.7,bw/count*.4,.06,.12,'accent')
   if t=='ducts':b('cross_duct',0,0,bh+.6,bw*.8,1.4,1.2,'ivory')
  elif t in ['reels','pipes','bollards']:
   for j in range(3):
    dx=(j-1)*bw*.3
    if t=='reels':c('spool',dx,0,.7,.65,.9,'dark','Y');c('rim',dx,-.5,.7,.85,.12,'metal','Y')
    elif t=='pipes':c('pipe',dx,0,bh*.5,.28,bh,'metal');c('elbow',dx,0,bh,.45,.4,'cyan','X')
    else:c('bollard',dx,0,.45,.25,.9,'dark',nn=8)
  elif t=='tree':
   c('trunk',0,0,bh*.35,.22,bh*.7,'wood',nn=6)
   for dx,z,rr in [(-.7,bh*.73,1.8),(.8,bh*.77,1.7),(0,bh,1.6)]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rr,location=(x+dx,y,H(x,y)+z));o=bpy.context.object;o.name=prefix+'_crown';K.paint(o,('ivory' if z>bh*.85 else 'leaf') if base=='snow' else ('leaf' if dx<0 else 'green'))
  elif t=='rock':
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,H(x,y)+bh/2));o=bpy.context.object;o.name=prefix+'_rock';o.scale=(bw/2,bd/2,bh*.6);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);K.paint(o,'ivory' if base=='snow' else 'edge')
  elif t=='escalator':
   b('body',0,0,1.2,bw,bd,2.4,'dark')
   for j in range(7):b('tread',0,-bd*.4+j*bd*.12,.25+j*.36,bw*.8,bd*.12,.3,'metal')
   for dx in [-bw*.47,bw*.47]:beam(prefix+'_handrail',(x+dx,y-bd*.45,.9),(x+dx,y+bd*.45,bh),.20,'cyan')
  elif t=='ferris':
   for dx in [-bw*.22,bw*.22]:beam(prefix+'_A',(x+dx,y,0),(x,y,bh*.6),.35,'metal')
   # Broad ring and a few rectangular gondolas; no cute faces or decorative text.
   bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=4,location=(x,y,H(x,y)+bh*.62),rotation=(math.pi/2,0,0),major_radius=bh*.43,minor_radius=.18);o=bpy.context.object;o.name=prefix+'_wheel';K.paint(o,'cyan')
   for j in range(8):
    aa=j*math.tau/8;dx=math.sin(aa)*bh*.43;zz=bh*.62+math.cos(aa)*bh*.43;beam(prefix+'_spoke',(x,y,bh*.62),(x+dx,y,zz),.10,'metal');b('gondola',dx,-.15,zz-.25,1,.9,1,'accent')
  elif t=='ride':c('base',0,0,.3,bw*.45,.6,'metal');c('pole',0,0,bh*.5,.2,bh,'cyan');b('arms',0,0,bh,bw,.25,.25,'accent')
  elif t=='excavator':
   b('tracks',0,0,.5,bw,bd*.75,1,'dark');b('cab',0,0,1.8,bw*.5,bd*.7,1.8,'cyan');b('glass',0,-bd*.36,2.1,bw*.4,.1,1,'glass');beam(prefix+'_arm',(x,y,2.2),(x-bw*.6,y-.5,bh),.4,'accent');beam(prefix+'_arm',(x-bw*.6,y-.5,bh),(x-bw*.9,y-1,1),.35,'accent');b('bucket',-bw*.9,-1,.8,1.4,1.2,.8,'metal')
  elif t=='target':c('post',0,0,bh*.45,.12,bh*.9,'metal');b('panel',0,0,bh,1.3,.3,1.3,'cyan');b('slit',0,-.18,bh,.8,.04,.18,'dark')
  else:raise ValueError(t)
 if kind in ['port','ferry','factory']:
  water=[[-w*.29,-h/2+.4],[w*.26,-h/2+.4],[w*.26,-h/2+2.3],[-w*.29,-h/2+2.3]]
  for aa,bb in zip(fp,fp[1:]+fp[:1]):water=clip(water,aa,bb)
  K.polygon('GEO_water',water,.035,'water');groups.append('GEO_water');obstacles.append({'id':'water','center':[-w*.015,-h/2+1.35],'size':[w*.55,1.9]})
 if ramp:
  for a,b in zip(fp,fp[1:]+fp[:1]):
   ha,hb=H(*a),H(*b)
   if ha<1e-8 and hb<1e-8:continue
   v=[(a[0],a[1],0),(b[0],b[1],0),(b[0],b[1],hb),(a[0],a[1],ha)];faces=[]
   if hb>1e-8:faces.append((0,1,2))
   if ha>1e-8:faces.append((0,2,3))
   K.mesh('GEO_rim_skirt',v,faces,'edge')
 if kind=='station':parts=parts+[('traincar',11,9.8,12,2.6,3.2)]
 for idx,part in enumerate(parts):landmark(*part,idx)
 # Two low, functional street fittings per island, deliberately grouped at edges.
 props=[{'id':'radio','kind':'radio','center':[-w*.28,-h*.12],'radius':.8},{'id':'bench','kind':'bench','center':[w*.32,-h*.12],'radius':1.1}]
 # Avoid the central six-metre boss turning region: low props remain beyond it.
 props[0]['center']=[-w*.34,-h*.14];props[1]['center']=[w*.35,-h*.08]
 if kind in ['factory','port','hill','quarry','underground','cooling','antenna','substation','coldstore']:props[1]['kind']='trolley'
 for p in props:
  x,y=p['center'];pre='PROP_'+p['id'];groups.append(pre)
  if p['kind']=='radio':
   B(pre+'_plinth',x,y,.5,1.1,.7,1,'edge');B(pre+'_case',x,y,1.25,1.2,.55,.65,'cyan');C(pre+'_speaker',x+.28,y-.3,1.2,.18,.06,'dark','Y');B(pre+'_screen',x-.25,y-.3,1.3,.4,.04,.17,'ivory')
  elif p['kind']=='trolley':
   B(pre+'_tray',x,y,1.0,1.7,.9,.25,'metal');B(pre+'_case',x,y,1.35,1,.7,.5,'cyan');B(pre+'_handle',x+.7,y,1.25,.12,.9,.8,'metal')
   for dx in [-.6,.6]:C(pre+'_wheel',x+dx,y-.4,.25,.22,.12,'dark','Y',8)
  else:
   B(pre+'_seat',x,y,.65,2,.65,.15,'wood');B(pre+'_back',x,y+.3,1.05,2,.12,.7,'wood')
   for dx in [-.7,.7]:B(pre+'_leg',x+dx,y,.32,.12,.6,.65,'metal')
 profile=row['legacyBiomeIndex'] if row['legacyBiomeIndex'] is not None and row['legacyBiomeIndex']<18 else -1
 L={'id':id,'name':row['name'],'stem':stem,'version':1,'profile':profile,'legacyBiomeIndex':row['legacyBiomeIndex'],'chapter':row['chapter'],'units':'meters; Blender Z up, glTF Y up','footprint':fp,'buildings':[],'obstacles':obstacles,'props':props,'bridge':{'piers':[]},'rails':[], 'occluderNodes':occluders,'surfaces':{'roadZ':.015,'forecourtZ':.06,'forecourt':fore,'ramp':ramp},'navigation':{'cell':.5,'edgeInset':.8,'heroRadius':.38,'bossRadius':3.8,'start':[0,-3],'bossArena':{'center':[0,-2],'radius':6},'spawnAnchors':[[-w*.30,-h*.25],[0,-h*.35],[w*.30,-h*.25],[w*.30,0]],'bossSpawnAnchor':[3,-5]},'art':{'composition':kind,'landmarks':row['landmarks'],'accent':hot,'base':base,'sky':['#21334F','#687B9D','#C8D8DA'] if kind in ['neon','market','underpass','substation'] else ['#3E9CC9','#96CCDC','#E7F0E3']}}
 (out/'layout.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n');K.finish(out,stem,groups)
 # Actual geometry range informs native full-island framing, including raised ground.
 points=[o.matrix_world@K.Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box];L['visualZ']=[min(p.z for p in points),max(p.z for p in points)];(out/'layout.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
 return {'id':id,'name':row['name'],'stem':stem,'legacyBiomeIndex':row['legacyBiomeIndex'],'chapter':row['chapter']}
if __name__=='__main__':
 selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 records=[]
 for n,row in enumerate(ROSTER[2:]):
  if selected and row['id'] not in selected:continue
  records.append(build(row,n))
 (R/'docs/floating-island-redesign/series-build-index.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
