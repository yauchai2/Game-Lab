const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8771/M01-interactive-preview.html');
 await page.waitForFunction(()=>window.M01_PREVIEW&&M01_PREVIEW.renderer.info.render.calls===3);
 const geometry=await page.evaluate(()=>{setView(0,0);mixer.stopAllAction();return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,clips:clips.map(c=>({name:c.name,duration:c.duration})),unlit:gltf.materials.every(m=>m.extensions.KHR_materials_unlit),textures:gltf.textures?.length||0};});
 assert.equal(geometry.triangles,684);assert.equal(geometry.calls,3);assert(geometry.unlit);assert.equal(geometry.textures,0);assert.deepEqual(geometry.clips.map(c=>c.name).sort(),['Hop','Hurt','Idle']);
 const motion=await page.evaluate(()=>{const result=[];for(const name of ['Idle','Hop','Hurt']){mixer.stopAllAction();const action=actions[name].reset().play(),duration=action.getClip().duration;for(const t of [0,duration*.25,duration*.5,duration*.75]){mixer.setTime(t);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);if(![...box.min.toArray(),...box.max.toArray()].every(Number.isFinite))throw Error('invalid animation bounds');if(box.max.y>4.5||box.min.y<-.25)throw Error('animation escaped bounds');}result.push(name);}mixer.stopAllAction();return result;});
 await page.getByRole('button',{name:'立體',exact:true}).click();await page.screenshot({path:path.join(__dirname,'renders/webgl-preview.png')});
 await page.locator('#clips').selectOption('Hop');await page.waitForTimeout(100);await page.locator('#clips').selectOption('');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'renders/mobile-preview.png')});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'webgl-validation.json'),JSON.stringify({browser:'Chromium software WebGL, Three.js r160',self_contained_HTML_via_local_HTTP:true,geometry,animated_clips_checked:motion,errors,limitations:['Not a hardware FPS benchmark','Not yet wired into production combat']},null,2));
 await browser.close();console.log(JSON.stringify({geometry,animations:motion,errors}));
})().catch(e=>{console.error(e);process.exit(1)});
