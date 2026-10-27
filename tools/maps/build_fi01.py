"""FI01 original urban park island, authored from the approved series direction."""
from pathlib import Path
import sys,json,math
import bpy
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/maps'))
import island_meshkit as K
OUT=ROOT/'assets/maps/fi01-corner-park';OUT.mkdir(parents=True,exist_ok=True)
L=json.loads((ROOT/'tools/maps/fi01-layout.json').read_text());(OUT/'layout.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
K.setup({'grass':'#75AE59','green':'#69B837','leaf':'#35975C','ivory':'#E8DDC1','edge':'#B9BEB0','cyan':'#20B5CF','coral':'#DD6D57','yellow':'#E4B74E','dark':'#2A4658','glass':'#367183','metal':'#9AAEB1','wood':'#AA7D4C','rock':'#4C6170'},'FI01_Unlit_Palette')
box,cyl,poly=K.box,K.cylinder,K.polygon
K.foundation(L['footprint']);poly('GEO_ground',L['footprint'],L['surfaces']['roadZ'],'grass');poly('GEO_forecourt',L['surfaces']['forecourt'],L['surfaces']['forecourtZ'],'ivory')
for i,(a,b) in enumerate(zip(L['footprint'],L['footprint'][1:]+L['footprint'][:1])):
 o=box('GEO_rim_'+str(i),(a[0]+b[0])/2,(a[1]+b[1])/2,.055,math.dist(a,b),.22,.11,'edge');o.rotation_euler.z=math.atan2(b[1]-a[1],b[0]-a[0])
b=L['buildings'][0];x,y=b['center'];w,d,h=b['size'];box('GEO_pavilion_rear',x,y+d/2-.35,1.7,w,.7,3.4,'ivory');box('GEO_pavilion_window',x,y+d/2-.72,2.1,w-2,.09,1.4,'glass');box('GEO_pavilion_cyan',x,y,h-.3,w+.7,d+.6,.3,'cyan');box('GEO_pavilion_roof',x,y,h,w+.9,d+.8,.30,'ivory')
box('GEO_pavilion_fascia',0,7.05,3.6,6.6,.16,.5,'cyan')
for j in range(4):box('GEO_pavilion_wave',-.9+j*.6,6.95,3.6,.16,.05,[.18,.32,.24,.38][j],'dark')
for dx in [-w/2+.3,w/2-.3]:box('GEO_pavilion_post',x+dx,y-d/2+.3,1.7,.3,.3,3.4,'metal')
box('GEO_pavilion_service',x,y+1,.8,w-1,1.2,1.6,'ivory');box('GEO_pavilion_service_top',x,y+.85,1.65,w-.7,1.6,.12,'cyan')
# Small hardware aerial makes the radio theme readable without a central obstacle.
box('GEO_pavilion_aerial',2,11,4.6,.07,.07,1.3,'dark');box('GEO_pavilion_aerial_arm',2,11,5,1.1,.06,.06,'metal')
for p in L['props']:
 x,y=p['center'];kind=p['kind'];id='PROP_'+p['id']
 if kind=='tree':
  r=p['radius'];box(id+'_base',x,y,.22,r*2,r*2,.44,'edge');box(id+'_soil',x,y,.46,r*1.7,r*1.7,.05,'dark');cyl(id+'_trunk',x,y,2.3,.26,3.8,'wood',n=6)
  for j,(dx,dy,z,rr) in enumerate([(-.65,0,4.8,2),(1,.2,4.6,1.8),(0,.4,6,1.7)]):
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rr,location=(x+dx,y+dy,z));o=bpy.context.object;o.name=id+'_crown';o.scale=(1,1,.92);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);K.paint(o,'green' if j%2 else 'leaf')
 if kind=='radio':
  box(id+'_stand',x,y,.6,1.6,.7,1.2,'edge');box(id+'_top',x,y,1.23,1.8,.9,.15,'ivory');box(id+'_case',x,y,1.65,1.45,.55,.75,'cyan');box(id+'_screen',x-.30,y-.29,1.75,.5,.04,.24,'ivory');cyl(id+'_speaker',x+.35,y-.31,1.57,.21,.06,'dark','Y');box(id+'_aerial',x+.55,y,2.35,.045,.045,.8,'metal')
 if kind=='vendor':
  box(id+'_case',x,y,1.25,1.1,.85,2.5,'coral');box(id+'_window',x,y-.44,1.6,.8,.05,1.25,'ivory');box(id+'_slot',x,y-.47,.55,.7,.035,.22,'dark')
  for j in range(3):box(id+'_can',x+(j-1)*.23,y-.48,1.6,.15,.04,.50,['cyan','yellow','coral'][j])
 if kind=='bench':
  box(id+'_seat',x,y,.65,2.1,.7,.15,'wood');box(id+'_back',x,y+.32,1.1,2.1,.13,.8,'wood')
  for dx in [-.75,.75]:box(id+'_leg',x+dx,y,.32,.12,.65,.65,'metal')
 if kind=='timetable':
  box(id+'_post',x,y,1.6,.15,.15,3.2,'metal');box(id+'_panel',x,y,2.7,1,.2,1.1,'ivory')
  for j in range(3):box(id+'_bar',x-.08,y-.115,2.95-j*.22,.65-.1*j,.04,.08,'cyan')
 if kind=='planter':
  box(id+'_box',x,y,.3,1.8,1.2,.6,'edge');box(id+'_hedge',x,y,.95,1.5,1,1,'green')
for i,r in enumerate(L['rails']):
 x,y=r['center'];w,d=r['size'];box('GEO_rails_bar',x,y,1,w,d,.18,'leaf')
 for s in [-1,1]:box('GEO_rails_post',x+s*w*.44,y+s*d*.44,.5,.12,.12,1,'metal')
cyl('GEO_pipe',8,-11.5,-1.1,.18,4,'metal','X')
K.finish(OUT,'fi01-corner-park',['GEO_foundation','GEO_ground','GEO_forecourt','GEO_rim','GEO_pavilion','GEO_rails','GEO_pipe']+['PROP_'+p['id'] for p in L['props']])
