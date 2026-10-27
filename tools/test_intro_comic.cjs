const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const art=vm.runInNewContext(fs.readFileSync('src/game/intro-comic-assets.js','utf8')+';INTRO_COMICS'),manifest=JSON.parse(fs.readFileSync('assets/prologue/manifest.json'));
assert.equal(art.length,3);
for(const[name,meta]of Object.entries(manifest)){const bytes=fs.readFileSync('assets/prologue/'+name);assert.equal(bytes.length,meta.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256)}
const names=['01-afternoon','02-offbeat','03-reconnect'];for(let i=0;i<3;i++){assert(Buffer.from(art[i].src.split(',')[1],'base64').equals(fs.readFileSync('assets/prologue/'+names[i]+'.webp')));assert.equal(art[i].width,941);assert.equal(art[i].height,1672)}
assert(names.reduce((n,name)=>n+manifest[name+'.webp'].bytes,0)<750000);
const source=fs.readFileSync('src/game/05r-direct-play.js','utf8');assert(source.includes('introComicRender();return;'));assert(!source.includes('introStoryArt('));assert(source.includes('會跟著節拍跑的雜物'));assert(!fs.readFileSync('src/game/05u-loot-world.js','utf8').includes('function introStoryArt'));
console.log('PASS 3 approved portrait assets, source hashes, embedded payload, <750KB and retired story renderer');
