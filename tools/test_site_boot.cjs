// 發佈用的分段打包（build_site.py）載入後不可有腳本錯誤；單檔版本通過不代表分段版本通過（腳本載入順序不同）。
const {chromium}=require('playwright'),{execFileSync,spawn}=require('node:child_process'),fs=require('fs'),os=require('os'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'site-boot-'));
  execFileSync('python3',['tools/build_site.py',dir],{stdio:'ignore'});
  const srv=spawn('python3',['-m','http.server','8893','--bind','127.0.0.1'],{cwd:dir,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,1000));
  const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const p=await b.newPage({viewport:{width:390,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto('http://127.0.0.1:8893/?fresh');await p.waitForTimeout(4000);
    assert.deepEqual(errors,[]);
    assert(await p.evaluate(()=>[...document.querySelectorAll('[data-setting]')].length>=6&&!!document.querySelector('#btns')));
    console.log('PASS split-build boot has no script errors and the settings panel is built');
  }finally{await b.close();srv.kill();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
