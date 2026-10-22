"""Verify the shipped optical face, not a second copy of the font generator."""
import base64
import io
import re
from pathlib import Path
from fontTools.ttLib import TTFont

source = (Path(__file__).resolve().parents[1] / 'src/game/font.js').read_text()
encoded = re.findall(r'base64,([^)]*)\)', source)
native, lcd = [TTFont(io.BytesIO(base64.b64decode(data))) for data in encoded]
assert native['head'].unitsPerEm == 1200
assert lcd['head'].unitsPerEm == 1600
assert lcd.getBestCmap() == native.getBestCmap()
for font in (native, lcd):
    assert 'Copyright' in font['name'].getDebugName(0)
    assert 'SIL OPEN FONT LICENSE Version 1.1' in font['name'].getDebugName(13)
for name in lcd.getGlyphOrder():
    coordinates, _, _ = lcd['glyf'][name].getCoordinates(lcd['glyf'])
    assert all(x % 100 == y % 100 == 0 for x, y in coordinates), name
    assert all(value % 100 == 0 for value in lcd['hmtx'][name]), name
for field in ['ascent', 'descent', 'lineGap']:
    assert getattr(lcd['hhea'], field) % 100 == 0
print(f'PASS native 12px face preserved; {len(lcd.getBestCmap())} LCD glyphs, advances and baselines align to the 16px grid')
