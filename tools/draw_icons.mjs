/* Signal 24：原創介面向量圖示。node tools/draw_icons.mjs 重建 SVG 及圖集索引。 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'src/assets');
const C={ink:'#223149',paper:'#edf3f5',slate:'#8c9bac',cyan:'#81cbd1',gold:'#e4c379',hot:'#df917e',blue:'#89a8d0',violet:'#aa98c5'};
const p=(d,f=C.paper,s=C.ink,w=2)=>`<path d="${d}" fill="${f}" stroke="${s}" stroke-width="${w}" stroke-linejoin="miter"/>`;
const line=(d,c=C.ink,w=2)=>p(d,'none',c,w);
const box=(x,y,w,h,f=C.paper,s=C.ink)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" stroke="${s}" stroke-width="2"/>`;
const dot=(x,y,w=2,h=w,f=C.ink)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
const oct=(x,y,r,f=C.paper)=>p(`M${x-r+2} ${y-r}H${x+r-2}L${x+r} ${y-r+2}V${y+r-2}L${x+r-2} ${y+r}H${x-r+2}L${x-r} ${y+r-2}V${y-r+2}Z`,f);
const g={};
g.fire=p('M12 3V8L16 6L20 12V17L16 21H8L4 17V13L9 7V12Z',C.hot)+p('M12 12L15 16V19H10V16Z',C.paper,C.paper,0);
g.ice=p('M12 2L20 10V15L12 22L4 15V10Z',C.cyan)+line('M12 3V21M5 10H19');
g.bolt=p('M13 2H20L14 10H20L9 22L11 14H4Z',C.gold);
g.meteor=line('M12 3L4 11M20 4L14 10M21 11L18 14',C.slate)+oct(12,16,5,C.hot)+dot(10,14);
g.shield=p('M4 5L12 2L20 5V14L17 18L12 22L7 18L4 14Z',C.paper)+p('M12 5L17 7V13L12 18Z',C.cyan,C.cyan,0);
g.sword=p('M18 3H22V7L10 19L6 15Z',C.paper)+line('M5 13L12 20M3 21L7 17',C.ink,3)+line('M10 14L18 6',C.cyan,2);
g.shoe=p('M4 6H10L12 12L20 14L21 17V20H3V11Z',C.paper)+line('M3 17H21M12 11L9 13M15 12L12 14')+dot(5,8,3,5,C.cyan);
g.headphones=line('M4 15V8L8 4H16L20 8V15',C.ink,3)+box(3,12,5,8,C.cyan)+box(16,12,5,8,C.cyan);
g.coin=oct(12,12,9,C.gold)+line('M14 7H10V12H14V17H10');
g.star=p('M12 2L15 8H22L17 13L19 21L12 17L5 21L7 13L2 8H9Z',C.gold);
g.heart=p('M3 6L6 3H9L12 6L15 3H18L21 6V12L12 21L3 12Z',C.hot);
g.potion=box(9,3,6,4,C.slate)+p('M9 7V10L5 14V21H19V14L15 10V7Z',C.paper)+p('M7 15H17V19H7Z',C.cyan,C.cyan,0);
g.role=oct(12,7,4,C.paper)+p('M8 14H16L21 18V21H3V18Z',C.cyan)+dot(3,7,2,4,C.cyan)+dot(19,7,2,4,C.cyan);
g.battle=p('M3 3H7L19 16L16 19L3 7Z',C.paper)+p('M17 3H21V7L8 20L5 17Z',C.cyan)+line('M3 15L9 21M15 15L21 21',C.ink,2);
g.craft=p('M14 3H20L16 7L17 10L20 11L23 7V13L19 17H14L7 23L2 18L10 11V7Z',C.paper)+dot(5,17,3,3,C.cyan);
g.growth=line('M12 9V14M5 17V13H19V17')+box(9,2,6,6,C.cyan)+box(2,17,6,5,C.paper)+box(9,17,6,5,C.paper)+box(16,17,6,5,C.paper);
g.bag=p('M7 8V5L9 3H15L17 5V8',C.slate,C.ink,2)+p('M4 8H20L21 21H3Z',C.paper)+box(8,13,8,6,C.cyan)+line('M4 12H20',C.slate,1)+dot(11,15,2,2,C.ink);
g.adventure=p('M3 5L9 2L15 5L21 2V19L15 22L9 19L3 22Z',C.paper)+line('M9 3V19M15 5V21',C.slate,1)+line('M5 15L10 10L14 13L19 8',C.cyan,2)+dot(17,6,3,3,C.ink);
g.more=box(3,3,7,7,C.paper)+box(14,3,7,7,C.cyan)+box(3,14,7,7,C.cyan)+box(14,14,7,7,C.paper);
g.lock=line('M8 11V6L10 4H14L16 6V11')+box(5,11,14,11,C.paper)+dot(10,14,4,5,C.cyan);
g.unlock=line('M12 11V6L14 4H18L20 6V9')+box(5,11,14,11,C.paper)+dot(10,14,4,5,C.slate);
g.battery=box(9,2,6,3,C.slate)+box(6,5,12,17,C.paper)+p('M13 7L9 14H13L11 20L16 12H12Z',C.hot,C.hot,0);
g.cooler=box(3,5,18,13,C.paper)+line('M6 9H18M6 13H18M7 19V22M12 19V22M17 19V22',C.cyan,2);
g.chain=box(2,3,6,6,C.paper)+box(16,15,6,6,C.paper)+line('M8 6H13V12H18V15',C.gold,3);
g.satellite=box(2,5,5,8,C.cyan)+box(17,11,5,8,C.cyan)+p('M10 5L17 12L13 16L6 9Z',C.paper)+line('M14 3L12 5M9 16L5 20M3 15L1 17',C.slate,2);
g.speaker=box(5,2,14,20,C.paper)+oct(12,8,2,C.slate)+oct(12,16,4,C.cyan);
g.magnet=p('M4 3H9V14L11 16H13L15 14V3H20V15L16 20H8L4 15Z',C.cyan)+line('M4 8H9M15 8H20');
g.mail=box(2,5,17,14,C.paper)+line('M3 6L10 12L18 6')+box(17,15,5,6,C.slate);
g.camera=p('M3 7H8L10 4H15L17 7H21V21H3Z',C.paper)+oct(12,14,4,C.cyan)+p('M19 1L16 6H19L17 11L23 4H20Z',C.gold,C.gold,0);
g.laser=p('M4 18L7 21L17 11L13 7Z',C.paper)+line('M16 7L22 1',C.hot,2)+line('M4 20L2 22',C.slate,2);
g.chip=box(6,6,12,12,C.paper)+line('M9 2V6M15 2V6M9 18V22M15 18V22M2 9H6M2 15H6M18 9H22M18 15H22')+p('M13 8L10 13H13L11 16L15 11H12Z',C.cyan,C.cyan,0);
g.broadcast=line('M12 6V21M7 21H17M3 8L3 5L6 2M21 8V5L18 2M7 9V7L9 5M17 9V7L15 5')+dot(10,8,4,4,C.cyan);
g.broadband=line('M3 20V14H7V20M10 20V9H14V20M17 20V3H21V20',C.ink,2)+dot(4,16,2,3,C.cyan)+dot(11,11,2,8,C.cyan)+dot(18,5,2,14,C.cyan);
g.dual=p('M3 7H9L12 10V22H3Z',C.paper)+p('M12 2H18L21 5V17H12Z',C.cyan)+box(15,7,3,5,C.paper);
g.crit=p('M12 2L14 8L21 5L18 12L23 15L16 17L16 23L11 19L5 22L6 15L1 12L8 9L7 3Z',C.gold)+dot(10,10,4,5,C.ink);
g.charge=box(6,4,12,15,C.paper)+line('M2 6V17M22 6V17',C.cyan,2)+p('M13 7L9 12H13L11 16L16 10H12Z',C.cyan,C.cyan,0);
g.heatsink=box(3,5,18,14,C.paper)+line('M7 6V18M12 6V18M17 6V18',C.cyan,2);
g.crystal=p('M8 3H16L20 12L16 21H8L4 12Z',C.violet)+line('M8 3L10 12L8 21M16 3L14 12L16 21',C.paper,1);
g.fan=box(4,3,16,15,C.paper)+line('M9 18V22H16M12 6V15M8 10H16',C.cyan,2)+dot(10,8,4,4,C.ink);
g.lens=oct(10,10,7,C.paper)+line('M15 15L22 22',C.ink,3)+line('M7 8H10V5',C.cyan,2);
g.charm=p('M6 3H18V15L12 22L6 15Z',C.paper)+p('M12 7L16 11L12 15L8 11Z',C.violet);
g.drink=box(9,2,6,4,C.slate)+p('M8 6H16L18 10V21H6V10Z',C.paper)+p('M7 12H17V18H7Z',C.cyan,C.cyan,0)+dot(10,13,4,4,C.paper);
g.batt=box(3,5,8,16,C.paper)+box(13,5,8,16,C.paper)+line('M5 2H9M15 2H19')+dot(5,12,4,6,C.cyan)+dot(15,9,4,9,C.cyan);
g.vest=p('M6 3H10V7H14V3H18V9L21 12V21H3V12L6 9Z',C.paper)+box(6,12,12,6,C.slate)+line('M12 12V18',C.paper,2);
g.calculator=box(5,2,14,20,C.paper)+box(8,5,8,4,C.cyan)+dot(8,12)+dot(14,12)+dot(8,17)+dot(14,17);
g.pig=p('M5 7H17L20 10V14H22V18H18V21H15V18H8V21H5V17L2 14V10Z',C.paper)+p('M6 7V3L10 7Z',C.paper)+line('M9 6H14',C.gold,2)+dot(17,10);
g.luck=p('M5 3H19V17L15 21H5Z',C.paper)+p('M12 6L14 10H18L15 13L16 17L12 15L8 17L9 13L6 10H10Z',C.gold,C.gold,0);
g.food=box(2,5,20,15,C.paper)+line('M14 6V19M3 12H13',C.ink,2)+dot(5,8,5,2,C.gold)+dot(5,15,5,2,C.gold)+dot(17,9,2,7,C.gold);
g.bomb=oct(11,15,7,C.slate)+line('M12 8V4H17L19 2',C.ink,2)+dot(19,3,3,3,C.gold)+line('M7 13V17',C.paper,2);
g.sun=oct(12,12,5,C.gold)+line('M12 1V4M12 20V23M1 12H4M20 12H23M3 3L6 6M18 18L21 21M3 21L6 18M18 6L21 3',C.gold,2);
g.saber=p('M14 2H19V7L9 17L6 14Z',C.cyan)+line('M5 12L12 19M3 22L7 18',C.ink,3)+line('M3 9L11 1',C.slate,2);
g.club=p('M16 2H21V7L12 16L9 13Z',C.paper)+line('M3 23L10 15',C.ink,3)+line('M7 15L11 19',C.gold,3)+dot(17,5,2,3,C.gold);
g.remote=box(7,2,10,20,C.paper)+box(9,5,6,4,C.cyan)+dot(9,12)+dot(13,12)+dot(9,17)+dot(13,17);
const coat=(color=C.cyan,variant=0)=>p('M8 3H16L22 8L19 14L17 12V22H7V12L5 14L2 8Z',C.paper)+p('M8 5L12 8L16 5V20H8Z',color,C.ink,1)+line('M12 8V21',C.ink,1)+(variant===1?line('M4 8L8 10M16 10L20 8',C.gold,2):variant===2?line('M8 16H16',C.gold,2):'');
g.puff=coat(C.slate)+line('M8 12H16M8 16H16',C.paper,1);
g.reflect=coat(C.cyan,1);
g.radio=coat(C.slate,2)+line('M12 3V0M9 1H15',C.gold,2);
g.phone=box(7,2,10,20,C.paper)+box(9,5,6,8,C.cyan)+line('M10 17H14',C.gold,2);
g.signal=box(3,12,18,9,C.paper)+line('M7 12V4M4 3L7 1L10 3M15 9V5M19 9V2',C.cyan,2)+dot(6,16)+dot(11,16)+dot(16,16);
g.dial=box(2,9,20,12,C.paper)+line('M4 9V5H11L14 2',C.ink,2)+dot(5,15,3,3,C.cyan)+dot(10,15,3,3,C.cyan)+dot(15,15,3,3,C.cyan);
g.down=line('M12 3V17M6 11L12 18L18 11')+line('M5 22H19',C.cyan,2);
g.moon=p('M16 2H9L4 7V16L9 21H17L21 17H14L10 13V7Z',C.cyan);
g.up=line('M5 16L12 8L19 16M12 8V22',C.ink,2)+dot(10,2,4,3,C.cyan);
g.rank=line('M5 19L12 12L19 19M5 10L12 3L19 10',C.gold,3);
g.crown=p('M3 6L8 10L12 3L16 10L21 6L18 20H6Z',C.gold)+line('M7 16H17');
g.double=line('M4 8L9 13L4 18M12 8L17 13L12 18',C.cyan,3);
g.focus=oct(12,12,7,C.violet)+line('M12 5V9M5 12H9M15 12H19M12 15V19')+dot(11,11,2,2,C.gold);
g.fork=box(9,3,6,5,C.cyan)+line('M12 8V13M4 20V13H20V20M12 13V21');
g.recover=box(5,5,14,15,C.cyan)+box(9,2,6,3,C.slate)+line('M8 12H16M12 8V16');
g.delay=box(3,5,18,14,C.violet)+line('M7 9L11 12L7 15M13 9L17 12L13 15',C.paper);
const badge=key=>p('M7 2H17L22 7V17L17 22H7L2 17V7Z',C.paper)+`<g transform="translate(4 4) scale(.66)">${g[key]}</g>`;
const equipment={};
for(let r=0;r<4;r++){
  const accent=[C.slate,C.cyan,C.gold,C.violet][r];
  equipment['weapon-'+r]=r===2?g.club:r===3?g.saber:g.sword.replaceAll(C.cyan,accent);
  equipment['armor-'+r]=r===0?coat(C.slate):r===1?coat(C.cyan):r===2?coat(C.gold,1):coat(C.violet,2);
  equipment['ring-'+r]=r===0?oct(12,13,7,C.paper)+oct(12,13,3,C.paper):r===1?box(9,1,6,22,C.slate)+box(5,6,14,12,C.paper)+box(8,9,8,6,C.cyan):r===2?g.headphones.replaceAll(C.cyan,C.gold):g.phone.replaceAll(C.cyan,C.violet);
}
const sheets={
 icons:{cols:6,ids:['fire','ice','bolt','meteor','shield','sword','shoe','headphones','coin','star','heart','potion','role','battle','craft','growth','adventure','more','lock','unlock','bag'],draw:id=>g[id]},
 skills:{cols:3,ids:['FIRE','FROST','CHAIN','METEOR','PULSE','MAGNET','SPAM','FLICKER','BEAM'],draw:id=>g[{FIRE:'battery',FROST:'cooler',CHAIN:'chain',METEOR:'satellite',PULSE:'speaker',MAGNET:'magnet',SPAM:'mail',FLICKER:'camera',BEAM:'laser'}[id]]},
 gems:{cols:4,ids:['HEAVY','AREA','HASTE','TWIN','CRITS','LEECH','COOL','CRYSTAL','FOCUS','FORK','RECOVER','DELAY'],draw:id=>g[{HEAVY:'chip',AREA:'broadcast',HASTE:'broadband',TWIN:'dual',CRITS:'crit',LEECH:'charge',COOL:'heatsink',CRYSTAL:'crystal',FOCUS:'focus',FORK:'fork',RECOVER:'recover',DELAY:'delay'}[id]]},
 relics:{cols:4,ids:['FAN','LENS','CHARM','DRINK','BATT','VEST','CALC','PIG','LUCK','FOOD','BOMB','SUN'],draw:id=>g[{FAN:'fan',LENS:'lens',CHARM:'charm',DRINK:'drink',BATT:'batt',VEST:'vest',CALC:'calculator',PIG:'pig',LUCK:'luck',FOOD:'food',BOMB:'bomb',SUN:'sun'}[id]]},
 legends:{cols:3,ids:['W_ECHO','W_FORK','W_MULTI','A_PHOENIX','A_RIPOSTE','A_RESET','R_LAST','R_LINK','R_DIAL'],draw:id=>g[{W_ECHO:'saber',W_FORK:'club',W_MULTI:'remote',A_PHOENIX:'puff',A_RIPOSTE:'reflect',A_RESET:'radio',R_LAST:'phone',R_LINK:'signal',R_DIAL:'dial'}[id]]},
 badges:{cols:4,ids:['k100','k2000','boss1','boss10','d10','d20','l20','l30','map5','legend','card10','survive'],draw:id=>badge({k100:'sword',k2000:'double',boss1:'crown',boss10:'phone',d10:'down',d20:'moon',l20:'up',l30:'rank',map5:'adventure',legend:'star',card10:'chip',survive:'heart'}[id])},
 equips:{cols:4,ids:['weapon-0','weapon-1','weapon-2','weapon-3','armor-0','armor-1','armor-2','armor-3','ring-0','ring-1','ring-2','ring-3'],draw:id=>equipment[id]}
};
const manifest={style:'Signal 24',cell:24,palette:C,sheets:{},wordmark:'wordmark.svg'};
for(const [key,s] of Object.entries(sheets)){
 const rows=Math.ceil(s.ids.length/s.cols);manifest.sheets[key]={file:key+'.svg',cols:s.cols,rows,ids:s.ids};
 const content=s.ids.map((id,i)=>{const d=s.draw(id);if(!d)throw Error('Missing glyph '+key+':'+id);if(new Set(d.match(/#[0-9a-f]{6}/gi)).size>4)throw Error('Too many colors '+key+':'+id);return `<g id="${id}" transform="translate(${i%s.cols*24} ${Math.floor(i/s.cols)*24})"><g transform="translate(1 1) scale(.92)">${d}</g></g>`}).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${s.cols*128}" height="${rows*128}" viewBox="0 0 ${s.cols*24} ${rows*24}">${content}</svg>`;
 fs.writeFileSync(path.join(dir,key+'.svg'),svg+'\n');
}
// 自繪 5×7 字模，不依賴外部字型或生成文字。
const font={I:['11111','00100','00100','00100','00100','00100','11111'],D:['11110','10001','10001','10001','10001','10001','11110'],L:['10000','10000','10000','10000','10000','10000','11111'],E:['11111','10000','10000','11110','10000','10000','11111'],H:['10001','10001','10001','11111','10001','10001','10001'],R:['11110','10001','10001','11110','10100','10010','10001'],O:['01110','10001','10001','10001','10001','10001','01110']};
let text='';for(const [i,char] of [...'IDLEHERO'].entries())for(const [y,row] of font[char].entries())for(const [x,bit] of [...row].entries())if(bit==='1')text+=`M${i*6+x} ${y}h1v1h-1Z`;
const wordmark=`<svg xmlns="http://www.w3.org/2000/svg" width="232" height="56" viewBox="0 0 116 28"><g transform="translate(3 4) scale(2.25)"><path d="${text}" transform="translate(.5 .75)" fill="${C.cyan}"/><path d="${text}" fill="${C.ink}"/></g><path d="M4 25H30M35 25H49" stroke="${C.slate}" stroke-width="1"/><path d="M105 23H111V25H105Z" fill="${C.cyan}"/></svg>`;
fs.writeFileSync(path.join(dir,'wordmark.svg'),wordmark+'\n');
fs.writeFileSync(path.join(dir,'icon-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Drew ${Object.values(sheets).reduce((n,s)=>n+s.ids.length,0)} icons + wordmark; ${Object.keys(sheets).length} sheets.`);
