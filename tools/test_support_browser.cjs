const GAME_TEST_BASE=process.env.GAME_TEST_BASE||'http://127.0.0.1:8780';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.GAME_LAB_TEST_OUTPUT||'/tmp/game-lab-support';
const url=process.env.GAME_LAB_TEST_URL||GAME_TEST_BASE+'/';
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  const errors=[],checks=[];
  try{
    const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url+'?fresh&static&lvl=40&modal=menu',{waitUntil:'domcontentloaded',timeout:90000});
    await p.evaluate(()=>{hideOverlay();G.paused=true;ui.suspendRender=()=>true;openModal('menu')});
    const original=await p.evaluate(()=>SUPPORT_CONFIG.url);
    assert.equal(original,'https://www.patreon.com/c/alanycchan');
    await p.getByRole('button',{name:'贊助',exact:true}).click();
    const link=p.getByRole('link',{name:/前往 Patreon/});
    assert.equal(await link.getAttribute('href'),original);
    assert.equal(await link.getAttribute('target'),'_blank');
    assert.match(await link.getAttribute('rel'),/noopener/);
    checks.push('設定 → 贊助 uses the confirmed Patreon creator, isolated in a new tab');
    const before=await p.evaluate(()=>JSON.stringify(serialize()));
    const invalid=['','http://www.patreon.com/c/alanycchan','https://www.patreon.com.evil.test/c/alanycchan','https://www.patreon.com@evil.test/c/alanycchan','javascript:alert(1)','https://evil.test','https://www.patreon.com/login','https://www.patreon.com/join/alanycchan','https://www.patreon.com/c/alanycchan?redirect=https://evil.test','https://www.patreon.com/c/alanycchan#checkout','https://www.patreon.com:444/c/alanycchan','https://www.patreon.com/c/alanycchan/posts','https://www.patreon.com/user?u=1&redirect=evil','https://ko-fi.com/alanycchan'];
    for(const value of invalid){
      await p.evaluate(value=>{SUPPORT_CONFIG.url=value;renderModal()},value);
      assert.equal(await p.locator('.support-console a').count(),0,value);
      assert(await p.getByRole('button',{name:'Patreon 贊助尚未開放'}).isDisabled());
      assert(await p.locator('#support-unavailable').isVisible());
    }
    for(const value of ['https://patreon.com/alanycchan','https://www.patreon.com/c/alanycchan/','https://www.patreon.com/user?u=12345'])assert(await p.evaluate(value=>!!supportDestination(value),value));
    checks.push('missing/invalid URLs cannot produce payment links; public Patreon creator routes accepted');
    await p.evaluate(value=>{SUPPORT_CONFIG.url=value;renderModal()},original);
    for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
      await p.setViewportSize(size);
      // This fixture suspends rendering; explicitly perform the normal resize frame.
      await p.evaluate(()=>{scene();WORLD_TRAVEL.remaining=0;worldTravelRender()});
      await p.emulateMedia({reducedMotion:'reduce'});
      await p.locator('.support-console').waitFor();
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert(await p.locator('.support-console').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      assert.equal(await p.locator('.support-faq').count(),0);
      assert.match(await p.locator('.support-letter').innerText(),/Idle Hero 是我的個人興趣作品/);
      await link.scrollIntoViewIfNeeded();
      await p.screenshot({path:out+'/support-'+size.width+'.png'});
      await p.getByRole('button',{name:'聲音鳴謝',exact:true}).click();
      assert(await p.locator('#ovl').isVisible());
      await p.keyboard.press('Escape');
      assert(await p.locator('#ovl').isHidden());
    }
    checks.push('320/390/844/1440px: no horizontal overflow, concise thank-you copy, credits/Escape and reduced motion');
    // Intercept navigation: verify the real click without contacting or paying Patreon.
    await p.context().route('https://www.patreon.com/**',r=>r.fulfill({contentType:'text/html',body:'<title>Navigation test</title>'}));
    await link.focus();
    const popupPromise=p.waitForEvent('popup');
    await p.keyboard.press('Enter');
    const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(),original);await popup.close();
    const after=await p.evaluate(()=>JSON.stringify(serialize()));
    const stable=s=>{const v=JSON.parse(s);delete v.t;return v};
    assert.deepEqual(stable(after),stable(before));
    checks.push('keyboard CTA opens correct destination; sponsorship browsing leaves save data unchanged');
    await p.getByRole('button',{name:'留下意見',exact:true}).click();
    assert.equal(await p.evaluate(()=>modalTab),'feedback');
    await p.locator('#mttl .window-back').click();
    assert.equal(await p.evaluate(()=>modalTab),'menu');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(out+'/browser-results.json',JSON.stringify({url,checks,errors,externalPaymentTested:false},null,2)+'\n');
    console.log('PASS',checks.length,'Patreon support flows');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
