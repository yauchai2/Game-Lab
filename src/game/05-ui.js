/* ---------- UI: side panel, modal, overlay ---------- */
// 全介面共用 Signal 24 圖集，座標及順序只讀取產生器的索引。
function uiSprite(sheet,id,size=24,extra='',tag='span'){
  const S=ART_SHEETS[sheet],index=S?.ids.indexOf(id);if(index==null||index<0)return '';
  const x=index%S.cols*size,y=Math.floor(index/S.cols)*size;
  return `<${tag} class="spr${tag==='i'?' gem':''}" aria-hidden="true" data-icon="${sheet}:${id}" style="width:${size}px;height:${size}px;background:var(--pixel-${sheet},var(--a-${sheet})) -${x}px -${y}px/${S.cols*size}px ${S.rows*size}px no-repeat;${extra}"></${tag}>`;
}
const ICON_IDX=ART_SHEETS.icons.ids,SK_IDX=ART_SHEETS.skills.ids;
function spr(name,size=30){return uiSprite('icons',name,size);}
function sico(id,size=30){return uiSprite('skills',id,size);}
const SHEETS={relic:['relics'],legend:['legends'],badge:['badges']};
