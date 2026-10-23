"""Run source-backed review checks and retain exact exit codes and output."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json, subprocess
root=Path(__file__).resolve().parents[1]
commands=[['node','tools/test_field_update.cjs'],['node','tools/test_grid.js'],['node','tools/test_gameplay.js'],['node','tools/test_mechanics.js'],['node','tools/test_progression.js'],['node','tools/test_equipment_depth.js'],['node','tools/test_ux.js'],['node','tools/test_expansion.js'],['node','tools/test_offline_return.cjs'],['node','tools/test_update_032.cjs'],['node','tools/test_world_review.cjs'],['node','tools/test_terrain_mesh.cjs'],['node','tools/test_render_resolution.js'],['python','tools/test_font_grid.py'],['python','tools/test_review_build.py']]
def run(cmd):
 try:
  p=subprocess.run(cmd,cwd=root,text=True,capture_output=True,timeout=240)
  result={'command':' '.join(cmd),'exit_code':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
 except subprocess.TimeoutExpired as e: result={'command':' '.join(cmd),'exit_code':124,'stdout':str(e.stdout),'stderr':'Timeout after 240 seconds'}
 print(('PASS ' if result['exit_code']==0 else 'FAIL ')+result['command'],flush=True)
 return result
with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(run,commands))
output=root/'docs/review-0.32/checks.json';output.write_text(json.dumps({'date':'2026-10-23','browser_verified':False,'checks':results},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(any(r['exit_code'] for r in results))
