/* 把原始手機 GLB（約 50MB）減面並壓縮貼圖，輸出到 src/assets/phone/phone.glb。
   用法：node tools/phone_model_prep.mjs 原始.glb 輸出.glb 0.04 1024
   需要 npm 套件：@gltf-transform/core、functions、extensions、meshoptimizer、sharp（用過即可，不進 repo）。
   0.04 ＝ 保留約 4% 面數（約 2 萬個三角形），1024 ＝ 貼圖縮到 1024 並轉 WebP。 */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,textureCompress,prune,dedup,flatten} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
const [,,inp,out,ratio,tex]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(inp);
await MeshoptSimplifier.ready;
await doc.transform(weld({tolerance:0.00001}),simplify({simplifier:MeshoptSimplifier,ratio:+ratio,error:0.01,lockBorder:false}),prune(),
 textureCompress({encoder:sharp,targetFormat:'webp',resize:[+tex,+tex],quality:88}));
await io.write(out,doc);
const m=doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log('tris',m.getIndices().getCount()/3,'verts',m.getAttribute('POSITION').getCount());
