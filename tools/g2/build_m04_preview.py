"""Build an isolated playable model fixture around explicit native game source."""
import argparse,subprocess,sys,base64,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,default=root/'dist/m04-street-preview.html');a=p.parse_args()
metadata=root/'docs/g1-summer/build-source.json';original=metadata.read_bytes()
try:subprocess.run([sys.executable,str(root/'tools/g1/build_preview.py'),'--source',str(a.source),'--output',str(a.output)],check=True)
finally:metadata.write_bytes(original)
asset=(root/'assets/monsters/m04-low-frequency/M04-low-frequency.glb').read_bytes()
addon='<script>const M04_GLB='+json.dumps(base64.b64encode(asset).decode())+';const M04_SHA256='+json.dumps(hashlib.sha256(asset).hexdigest())+';\n'+(root/'tools/g2/m04-preview-runtime.js').read_text()+'\n</script>'
s=a.output.read_text();assert '</body>' in s;head,tail=s.rsplit('</body>',1);s=head+addon+'</body>'+tail;a.output.write_text(s)
print('Built M04 fixture:',a.output)
