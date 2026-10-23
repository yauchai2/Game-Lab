"""Build a standalone review copy; production build and storage key stay unchanged."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
page=(root/'dist/idle-hero.html').read_text()
needle='const Q = new URLSearchParams(location.search);'
assert page.count(needle)==1
page=page.replace(needle,"const Q = new URLSearchParams('fresh&lvl=12&give');")
page=page.replace("const SAVE_KEY = 'idle-hero-save-v2';","const SAVE_KEY = 'game-lab-review-032';")
toolbar='''<style>#world-review-toolbar{position:fixed;z-index:90;left:8px;bottom:8px;max-width:calc(100vw - 16px);display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:6px;border:2px solid #596b8c;background:#e7edf7;color:#172751;font:16px/24px "Cubic 11",sans-serif}#world-review-toolbar,#world-review-toolbar *{font-size:16px!important;line-height:24px!important}#world-review-toolbar button{font:inherit;min-height:40px;padding:4px 8px;background:#d7e1f1;color:#172751;border:1px solid #596b8c;cursor:pointer}#world-review-toolbar button[aria-pressed=true]{background:#303d9b;color:#fff}#world-review-toolbar button:focus-visible{outline:3px solid #ba603b;outline-offset:2px}#world-review-toolbar summary{cursor:pointer}#world-review-toolbar details{display:block}#world-review-toolbar span{font-size:12px!important;line-height:18px!important;font:12px/18px "Cubic 11",sans-serif}</style>
<aside id="world-review-toolbar" aria-label="版本審核試玩"><details open><summary>0.32 試玩（未 release）</summary><span>獨立測試進度；每次開啟重新開始。可收起此列。</span><div role="group" aria-label="試玩場景"><button type="button" data-review="forest">方形林地</button><button type="button" data-review="camp">中型營地</button><button type="button" data-review="city">古城廣場</button><button type="button" data-review="windmill">風車高地</button><button type="button" data-review="ruins">石柱遺跡</button><button type="button" data-review="giant">巨型雪嶺</button><button type="button" id="review-panorama">切換全景</button></div></details></aside>
<script>
(function(){
 const presets={forest:{id:'review-2',biome:0},camp:{id:'review-26',biome:0},city:{id:'review-43',biome:6},windmill:{id:'review-33',biome:0},ruins:{id:'review-93',biome:0},giant:{id:'review-56',biome:2}};
 function select(name){const map={...presets[name],lvl:8,mods:[]};G.run={map,kills:0,need:999999,bossOut:false};G.maxDepth=12;G.depth=8;G.mons=[];G.drops=[];G.proj=[];G.fx=[];G.floats=[];G.spawnCd=.3;Object.assign(G.h,{x:HX,y:HY,gx:HX,gy:HY,vx:0,vy:0,dead:0});recalc();G.h.hp=G.st.life;FXO.overview=false;FXO.zoomT=1;R3.focusX=HX;R3.focusY=HY;G.dirty=true;document.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.review===name?'true':'false'));renderModal();}
 document.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.review)));
 document.getElementById('review-panorama').addEventListener('click',toggleWorldOverview);
 select('forest');
})();
</script>'''
assert '</body>' in page
body_end=page.rfind('</body>')
output=page[:body_end]+toolbar+page[body_end:]
(root/'dist/idle-hero-review.html').write_text('\n'.join(line.rstrip() for line in output.splitlines())+'\n')
print('wrote dist/idle-hero-review.html (isolated review storage)')
