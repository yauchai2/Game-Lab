"""Guard one-pass source provenance and exact integer NEAREST review outputs."""
from pathlib import Path
import hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'assets/brand/hello-static/entry-pixels'
m=json.loads((out/'manifest.json').read_text())
for name,meta in m['sources'].items():
 b=(root/name).read_bytes();assert hashlib.sha256(b).hexdigest()==meta['sha256'];assert list(Image.open(root/name).size)==meta['size']
for name,meta in m['outputs'].items():
 p=root/meta['source'];im=Image.open(p);high=Image.open(root/meta['upscaled']);assert high.size==(im.width*4,im.height*4);assert high.tobytes()==im.resize(high.size,Image.Resampling.NEAREST).tobytes();assert hashlib.sha256(p.read_bytes()).hexdigest()==meta['sha256']
for meta in m['outputs'].values():
 runtime=root/meta['runtime'];assert hashlib.sha256(runtime.read_bytes()).hexdigest()==meta['runtime_sha256'];assert Image.open(runtime).convert('RGBA').tobytes()==Image.open(root/meta['source']).convert('RGBA').tobytes(),'lossless runtime must match native PNG exactly'
logo=Image.open(out/'logo-native.png');assert logo.mode=='RGBA' and logo.width==360;assert len(set(logo.getchannel('A').get_flattened_data()))>2,'preserve alpha coverage, not binary cutout'
for label,original in [('portrait','exec-f4613eb9-12b4-478f-9e43-eabdd8e771f1.png'),('landscape','exec-1e0b0aa6-3097-49b4-bcfd-3a46852e3435.png')]:
 path=Path('/workspace/generated_images')/original
 if path.exists():assert path.read_bytes()==(root/('assets/brand/hello-static/signal-cover/'+label+'-source.png')).read_bytes(),'use generated original, never screenshot'
print('PASS immutable originals, source/output hashes, 12 exact NEAREST 4x outputs, original scene colors, 360px soft-alpha logo')
