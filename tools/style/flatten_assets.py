"""Derive texture-free flat face colors without moving source vertices/rigs.
Original user-supplied GLBs remain unchanged. Triangle order and skin weights
are retained so equipment masks and all nine character animations stay valid.
"""
from pathlib import Path
from PIL import Image
import struct,json,io,math,base64,hashlib,colorsys
ROOT=Path(__file__).resolve().parents[2]
TYPES={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}
SIZES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4

def flatten(path,output):
 original=path.read_bytes();n=struct.unpack_from('<I',original,12)[0];doc=json.loads(original[20:20+n]);blob=original[28+n:];oldacc=doc['accessors'];oldviews=doc['bufferViews'];newblob=bytearray();views=[];accessors=[]
 def read(i):
  a=oldacc[i];v=oldviews[a['bufferView']];code,width=TYPES[a['componentType']];size=SIZES[a['type']];stride=v.get('byteStride',size*width);off=v.get('byteOffset',0)+a.get('byteOffset',0)
  return [struct.unpack_from('<'+code*size,blob,off+j*stride) for j in range(a['count'])]
 def add(values,component,kind,normalized=False):
  code,width=TYPES[component];size=SIZES[kind]
  newblob.extend(b'\0'*((-len(newblob))%4));offset=len(newblob)
  for value in values:newblob.extend(struct.pack('<'+code*size,*value))
  views.append({'buffer':0,'byteOffset':offset,'byteLength':len(newblob)-offset});a={'bufferView':len(views)-1,'componentType':component,'count':len(values),'type':kind}
  if normalized:a['normalized']=True
  if kind=='VEC3' and component==5126:a.update(min=[min(v[k] for v in values) for k in range(3)],max=[max(v[k] for v in values) for k in range(3)])
  accessors.append(a);return len(accessors)-1
 images=[]
 for im in doc.get('images',[]):
  v=oldviews[im['bufferView']];images.append(Image.open(io.BytesIO(blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB'))
 tris=0;primitiveChecks=[]
 for mesh in doc['meshes']:
  for p in mesh['primitives']:
   attrs={k:read(v) for k,v in p['attributes'].items()};indices=[v[0] for v in read(p['indices'])] if 'indices'in p else list(range(len(attrs['POSITION'])))
   oldmaterial=doc['materials'][p.get('material',0)];pb=oldmaterial.get('pbrMetallicRoughness',{});factor=pb.get('baseColorFactor',[1,1,1,1]);tex=pb.get('baseColorTexture');image=images[doc['textures'][tex['index']]['source']] if tex else None
   colors=[];normals=[]
   for i in range(0,len(indices),3):
    ids=indices[i:i+3];a,b,c=[attrs['POSITION'][j] for j in ids];u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)];cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];length=math.sqrt(sum(x*x for x in cross)) or 1;normal=tuple(x/length for x in cross)
    rgb=[1,1,1]
    if image:
     uv=attrs['TEXCOORD_0'];x=sum(uv[j][0] for j in ids)/3;y=sum(uv[j][1] for j in ids)/3
     pixel=image.getpixel((max(0,min(image.width-1,round(x*(image.width-1)))),max(0,min(image.height-1,round(y*(image.height-1))))))
     h,sat,value=colorsys.rgb_to_hsv(*(v/255 for v in pixel))
     # One deliberate shared palette; neutral atlas grain cannot become colored confetti.
     is_character=path.parent.name=='characters'
     skin=is_character and .025<h<.15 and sat>.17 and value>(.35 if path.stem=='milo' else .6)
     joint_names=[doc['nodes'][i].get('name','') for i in doc.get('skins',[{'joints':[]}])[0]['joints']] if is_character else []
     head_weight=sum(sum(w for j,w in zip(attrs.get('JOINTS_0',[])[i],attrs.get('WEIGHTS_0',[])[i]) if joint_names[j]=='head') for i in ids)/3 if joint_names else 0
     hair=head_weight>.6 and value>.18 and ((path.stem in ['aki','ping'] and sat>.25 and .48<h<.88) or (path.stem=='null' and h<.16 and value<.65 and sat>.2) or (path.stem=='milo' and sat<.24 and value<.85))
     if skin:
      skinhex={'aki':'EFC39F','milo':'CA976E','ping':'EFC39F','null':'E5BD98'}[path.stem];rgb=[int(skinhex[k:k+2],16)/255 for k in [0,2,4]]
     elif hair:
      hairhex={'aki':'243F77','milo':'B4BAC0','ping':'4F3C70','null':'704B34'}[path.stem];rgb=[int(hairhex[k:k+2],16)/255 for k in [0,2,4]]
     elif sat<.24:
      tone=min([.13,.29,.64,.91],key=lambda x:abs(x-value));rgb=[tone]*3
     elif path.parent.name=='characters' and .035<h<.14 and .18<sat<.68:
      rgb=[max(0,min(255,round(channel/24)*24))/255 for channel in pixel]
     else:
      palette=[(.04,(.93,.43,.20)),(.12,(.95,.73,.29)),(.28,(.43,.61,.39)),(.46,(.16,.68,.70)),(.60,(.15,.50,.78)),(.72,(.48,.38,.65)),(.88,(.71,.40,.58))]
      hue,base=min(palette,key=lambda kv:min(abs(kv[0]-h),1-abs(kv[0]-h)))
      tone=.43 if value<.35 else .72 if value<.58 else 1.0
      rgb=[channel*tone for channel in base]

    rgba=tuple(linear(rgb[k])*factor[k] for k in range(3))
    colors.extend([rgba]*3);normals.extend([normal]*3)
   # Weld equal position/skin/color corners. No UV or normal is needed by an
   # unlit material; triangle order stays exact for the equipment removal mask.
   keep=[k for k in attrs if not k.startswith(('COLOR','TEXCOORD')) and k not in ['NORMAL','TANGENT']]
   rows={k:[] for k in keep};vertexcolors=[];newindices=[];lookup={}
   for corner,j in enumerate(indices):
    color=tuple(max(0,min(255,round(c*255))) for c in colors[corner])
    key=tuple((k,attrs[k][j]) for k in keep)+(('COLOR',color),)
    if key not in lookup:
     lookup[key]=len(vertexcolors);vertexcolors.append(color)
     for k in keep:rows[k].append(attrs[k][j])
    newindices.append((lookup[key],))
   newattrs={}
   for key in keep:
    a=oldacc[p['attributes'][key]];component=5121 if key=='JOINTS_0' and max(max(v) for v in rows[key])<256 else a['componentType']
    newattrs[key]=add(rows[key],component,a['type'],a.get('normalized',False))
   newattrs['COLOR_0']=add(vertexcolors,5121,'VEC3',True)
   doc.setdefault('extras',{})['streetSourceVertices']=len(attrs['POSITION'])
   p['attributes']=newattrs;p['indices']=add(newindices,5123 if len(vertexcolors)<65536 else 5125,'SCALAR');p['material']=0
   tris+=len(indices)//3;primitiveChecks.append({'triangles':len(indices)//3,'vertices':len(vertexcolors),'positionAndSkinPreserved':True,'triangleOrderPreserved':True})

 # Copy only used animation / skin buffers. No orphan atlas bytes are retained.
 memo={}
 def copy(i):
  if i not in memo:
   a=oldacc[i];memo[i]=add(read(i),a['componentType'],a['type'],a.get('normalized',False))
  return memo[i]
 for skin in doc.get('skins',[]):
  if 'inverseBindMatrices'in skin:skin['inverseBindMatrices']=copy(skin['inverseBindMatrices'])
 for animation in doc.get('animations',[]):
  for sampler in animation['samplers']:
   sampler['input']=copy(sampler['input']);sampler['output']=copy(sampler['output'])
 doc.update(accessors=accessors,bufferViews=views,buffers=[{'byteLength':len(newblob)}],materials=[{'name':'Street_Flat_Vertex_Color','doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1},'extensions':{'KHR_materials_unlit':{}}}])
 for key in ['images','textures','samplers']:doc.pop(key,None)
 doc['extensionsUsed']=['KHR_materials_unlit'];doc.pop('extensionsRequired',None)
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);newblob.extend(b'\0'*((-len(newblob))%4));body=struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(newblob),0x004e4942)+newblob
 output.parent.mkdir(parents=True,exist_ok=True);out=struct.pack('<4sII',b'glTF',2,len(body)+12)+body;output.write_bytes(out)
 return {'id':path.stem,'sourceSha256':hashlib.sha256(original).hexdigest(),'sha256':hashlib.sha256(out).hexdigest(),'bytes':len(out),'triangles':tris,'textures':0,'animations':[a['name'] for a in doc.get('animations',[])],'primitives':primitiveChecks}
records=[];characters={};equipment={}
for kind,packed in [('characters',characters),('equipment',equipment)]:
 for p in sorted((ROOT/'assets'/kind).glob('*.glb')):
  out=ROOT/'assets/style-flat'/kind/p.name;rec=flatten(p,out);rec['kind']=kind;records.append(rec);packed[p.stem]=base64.b64encode(out.read_bytes()).decode()
(ROOT/'assets/style-flat/manifest.json').write_text(json.dumps({'pipeline':'tools/style/flatten_assets.py; flat triangle colors, original geometry/skin/animation unchanged','assets':records},indent=2)+'\n')
(ROOT/'src/game/street-flat-assets.js').write_text('// Derived from original supplied assets; originals retained. Generated by tools/style/flatten_assets.py.\nconst STREET_CHARACTER_GLB='+json.dumps(characters,separators=(',',':'))+';\nconst STREET_EQUIPMENT_GLB='+json.dumps(equipment,separators=(',',':'))+';\n')
print('Derived',len(characters),'characters and',len(equipment),'equipment; zero texture images')
