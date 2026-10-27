"""Inline src/syslog.js into index.html (between the markers) so it runs before every other script."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
code = (ROOT / 'src/syslog.js').read_text().replace('</script', '<\\/script')
block = '<!--syslog-->\n<script>\n' + code + '</script>\n<!--/syslog-->'
page = (ROOT / 'index.html').read_text()
if '<!--syslog-->' in page:
    page = re.sub(r'<!--syslog-->.*?<!--/syslog-->', lambda m: block, page, count=1, flags=re.S)
else:
    page = page.replace('<title>', block + '\n<title>', 1)
(ROOT / 'index.html').write_text(page)
print('syslog inlined', len(code), 'chars')
