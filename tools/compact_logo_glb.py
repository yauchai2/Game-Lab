"""Transcode only embedded logo textures to bounded WebP; preserve mesh buffers."""
import sys,json,struct,io,pathlib,hashlib
from PIL import Image
source,output=map(pathlib.Path,sys.argv[1:3])
if output.exists():raise RuntimeError('Refusing to overwrite derivative')
b=source.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);binary=b[28+n:];chunks=[];offset=0
images={im['bufferView']:im for im in d['images']}
for i,v in enumerate(d['bufferViews']):
 data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 if i in images:
  im=Image.open(io.BytesIO(data));im.thumbnail((512,512));buf=io.BytesIO();im.convert('RGB').save(buf,format='WEBP',quality=94,method=6);data=buf.getvalue();images[i]['mimeType']='image/webp'
 v['byteOffset']=offset;v['byteLength']=len(data);data+=b'\0'*((-len(data))%4);chunks.append(data);offset+=len(data)
for t in d['textures']:t.setdefault('extensions',{})['EXT_texture_webp']={'source':t.pop('source')}
d.setdefault('extensionsUsed',[]).append('EXT_texture_webp');d.setdefault('extensionsRequired',[]).append('EXT_texture_webp');d['buffers']=[{'byteLength':offset}]
j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data=b''.join(chunks);out=struct.pack('<III',0x46546c67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data;output.write_bytes(out)
r=json.loads(pathlib.Path(str(source)+'.json').read_text());r.update(derived_bytes=len(out),derived_sha256=hashlib.sha256(out).hexdigest());r['changes'].append('encode 512px embedded textures as WebP quality 94');pathlib.Path(str(output)+'.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r))
