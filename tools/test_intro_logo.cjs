/* Current title assets replace the archived 3D-logo contract. */
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const context=vm.createContext({ASSET:{}});
vm.runInContext(fs.readFileSync('src/game/title-screen-assets.js','utf8')+';globalThis.title=TITLE_SCREEN',context);
vm.runInContext(fs.readFileSync('src/game/brand-asset.js','utf8'),context);
const art='assets/brand/hello-static/',manifest=JSON.parse(fs.readFileSync(art+'manifest.json'));
for(const[name,meta]of Object.entries(manifest.files)){
 const bytes=fs.readFileSync(art+name);assert.equal(bytes.length,meta.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
}
assert(Buffer.from(context.title.background.split(',')[1],'base64').equals(fs.readFileSync(art+'rooftop.webp')));
assert(Buffer.from(context.ASSET.logo.split(',')[1],'base64').equals(fs.readFileSync(art+'logo.webp')));
const index=fs.readFileSync('index.html','utf8');assert(index.includes(context.ASSET.logo));assert(index.includes('src/game/title-screen-assets.js'));assert(!index.includes('src/game/logo-3d-asset.js'));
assert(index.includes('<title>Hello, Static! 哈囉，雜訊！</title>'));
const title=fs.readFileSync('src/game/05ab-intro-logo.js','utf8');assert(!/WebGLRenderer|requestAnimationFrame|introLogoModel/.test(title));assert.equal(context.title.logoWidth,manifest.logo_size[0]);
assert(manifest.files['rooftop.webp'].bytes+manifest.files['logo.webp'].bytes<300000);
console.log('PASS title source hashes, offline data, current brand, no title renderer and <300KB artwork');
