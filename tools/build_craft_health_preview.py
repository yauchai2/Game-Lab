"""Build an offline review artifact from native game fixtures; no production writes."""
from pathlib import Path
import base64,json,hashlib
R=Path(__file__).resolve().parents[1];D=R/'docs/craft-health-review'
craft=json.loads((D/'native-craft.json').read_text());health=json.loads((D/'native-health.json').read_text())
for row in health['shots']:row['src']='data:image/png;base64,'+base64.b64encode((D/row['image']).read_bytes()).decode()
page=(R/'tools/craft_health_preview.html').read_text().replace('/*__FONT__*/',(R/'src/game/font.js').read_text()).replace('/*__POLICY__*/',(R/'tools/healthbar_review_policy.js').read_text()).replace('/*__DATA__*/','const CRAFT_DATA='+json.dumps(craft,separators=(',',':'),ensure_ascii=False)+';const HEALTH_DATA='+json.dumps(health,separators=(',',':'))+';')
(D/'preview.html').write_text(page);print('Built source-backed review',len(page.encode()),'bytes; production unchanged')
