/* Three two-node branches per ascension. Nodes remain character-owned, not loadout-owned. */
const ASC_TALENT_BRANCHES={
 ground:[
 ['shell','厚殼接地','護甲+15。',{armor:15},'接地堡壘','護盾上限由9%提高至12%；職業專技傷害再降低5%。',{shieldCap:.03,sigHitPct:-.05}],
 ['hold','備用電容','最大生命+4%。',{lifePct:4},'長效電容','普攻護盾持續時間由2秒提高至4秒。',{shieldDuration:2}],
 ['contact','導體鍍層','每秒回復+0.3。',{regen:.3},'帶電接觸','跳電傷害倍率提高0.6，但第一擊倍率降低0.3。',{jumpMul:.6,firstMul:-.3}]],
 arc:[
 ['relay','分歧接點','閃電傷害+6%。',{light:6},'串聯中繼','專技額外跳向2個目標；每次專技傷害再降低5%。',{chainCount:2,sigHitPct:-.05}],
 ['reach','長距天線','技能急速+4%。',{haste:4},'延伸導線','跳電搜尋半徑由30提高至42，第一擊仍需近身。',{jumpRadius:12}],
 ['focus','集中電荷','增加傷害+4%。',{inc:4},'電弧尖峰','跳電倍率提高0.8，最多跳電目標減少2。',{jumpMul:.8,chainCount:-2}]],
 drive:[
 ['clock','高速時脈','攻速+4%。',{apsInc:4},'連續超載','職業專技間隔再縮短10%，最大生命降低4%。',{sigCdPct:-.1},{lifePct:-4}],
 ['impact','衝擊線圈','會心率+2%。',{crit:2},'重錘脈衝','專技第一擊倍率提高1.5，跳電倍率降低0.4。',{firstMul:1.5,jumpMul:-.4}],
 ['safe','絕緣握柄','護甲+15。',{armor:15},'過載穩壓','普攻護盾上限提高2個百分點，每秒回復+0.4。',{shieldCap:.02},{regen:.4}]],
 echo:[
 ['record','磁帶記錄','技能傷害+4%。',{sinc:4},'深層回放','回聲倍率由0.28提高至0.40，本體倍率由0.80降至0.75。',{echoMul:.12,waveBody:-.05}],
 ['delay','短軌讀頭','技能急速+4%。',{haste:4},'即時重播','回聲延遲由0.45秒縮短至0.20秒，仍只回放一次。',{echoDelay:-.25}],
 ['wide','立體聲道','最大生命+4%。',{lifePct:4},'擴闊音場','音波半徑由42提高至54，音波及回聲傷害降低5%。',{ringRadius:12,sigHitPct:-.05}]],
 still:[
 ['cold','冷凝訊號','冰霜傷害+6%。',{cold:6},'長頻靜止','專技嘗試凍結時間由0.5秒提高至0.75秒；BOSS控制限制不變。',{freezeSeconds:.25}],
 ['field','環場調律','護甲+15。',{armor:15},'靜域擴張','音波半徑提高12，專技傷害降低8%。',{ringRadius:12,sigHitPct:-.08}],
 ['brittle','共振裂紋','技能傷害+4%。',{sinc:4},'碎頻共振','音波命中已凍結目標時傷害提高15%，先傷害後判定新凍結。',{frozenBonus:.15}]],
 pace:[
 ['chain','連拍踏板','攻速+4%。',{apsInc:4},'十拍循環','連擊節拍上限由8提高至10。',{comboCap:2}],
 ['memory','節奏記憶','最大生命+4%。',{lifePct:4},'延長節拍','普攻中斷後的節拍保留時間由3秒提高至4.5秒。',{comboWindow:1.5}],
 ['tempo','高速採樣','技能急速+4%。',{haste:4},'倍頻節奏','每層節拍每秒增加專技進度由0.04提高至0.05秒；最大生命降低3%。',{comboRate:.01},{lifePct:-3}]],
 snipe:[
 ['solo','單線瞄準','會心傷害+8%。',{cm:8},'唯一座標','專技只鎖定1個目標，每發倍率由4.3提高至6.0。',{shotCap:-1,shotMul:1.7}],
 ['finish','終段追蹤','會心率+2%。',{crit:2},'訊號終止','對生命低於30%的目標，職業連射傷害提高18%。',{execute:.18}],
 ['receipt','擊破回執','增加傷害+4%。',{inc:4},'確認擊破','普攻討伐後下一輪連射增幅由25%提高至45%，消耗一次回執。',{receiptBoost:.2}]],
 split:[
 ['fan','扇出端口','攻速+4%。',{apsInc:4},'十路分流','連射上限由8提高至10，每發倍率由2.4降低至2.2。',{shotCap:2,shotMul:-.2}],
 ['cycle','輪詢時脈','技能急速+4%。',{haste:4},'快速輪詢','職業專技間隔縮短10%，專技傷害降低5%。',{sigCdPct:-.1,sigHitPct:-.05}],
 ['report','群組回執','會心率+2%。',{crit:2},'廣播確認','普攻討伐後下一輪全部連射增幅由25%提高至40%。',{receiptBoost:.15}]],
 shadow:[
 ['veil','殘影外殼','閃避率+2%。',{dodge:2},'虛像裝甲','閃避率再提高3%，最大生命提高4%；總閃避上限仍35%。',{}, {dodge:3,lifePct:4}],
 ['echo','反射端口','會心傷害+8%。',{cm:8},'殘像鎖定','連射額外鎖定1個目標，但職業連射傷害降低7%。',{shotCap:1,sigHitPct:-.07}],
 ['rush','迅行時脈','攻速+4%。',{apsInc:4},'迅行連發','職業專技間隔縮短12%，每秒回復降低0.3。',{sigCdPct:-.12},{regen:-.3}]],
 dual:[
 ['clock','雙核時脈','攻速+4%。',{apsInc:4},'並行加速','寵機間隔由0.8秒降至0.72秒，主核倍率降低0.04。',{petInterval:-.08,petMul:-.04}],
 ['mirror','副核鏡像','技能傷害+4%。',{sinc:4},'鏡像增幅','副核倍率由0.30提高至0.48，主核倍率降低0.05。',{secondaryMul:.18,petMul:-.05}],
 ['link','連線天線','最大生命+4%。',{lifePct:4},'遠距副核','副核搜尋半徑由24提高至40；只作用另一個目標。',{secondaryRadius:16}]],
 repair:[
 ['cycle','維修輪詢','每秒回復+0.3。',{regen:.3},'六拍維修','修復觸發由每8次寵機攻擊改為每6次，仍受共用回復額度限制。',{batteryHits:-2}],
 ['patch','修補電池','最大生命+4%。',{lifePct:4},'深度修補','每次修復請求由3%提高至4%生命，不能突破共用回復額度。',{healFraction:.01}],
 ['tool','工具模組','護甲+15。',{armor:15},'攻防維修','寵機傷害倍率由0.80提高至0.95，每秒回復降低0.2。',{petMul:.15},{regen:-.2}]],
 melt:[
 ['radius','擴散散熱','火焰傷害+6%。',{fire:6},'熱環擴張','濺射半徑由10提高至16，濺射倍率由0.25降低至0.22。',{splashRadius:6,splashMul:-.03}],
 ['fan','熔核分流','技能傷害+4%。',{sinc:4},'五點熔解','濺射最多額外目標由3提高至5。',{splashCap:2}],
 ['dense','高密熔芯','增加傷害+4%。',{inc:4},'重熔直擊','寵機直擊倍率由1.05提高至1.30，攻擊間隔由1.5秒提高至1.7秒。',{petMul:.25,petInterval:.2}]]
};
const ASC_TALENTS=Object.fromEntries(Object.entries(ASC_TALENT_BRANCHES).map(([asc,branches])=>[asc,branches.flatMap(([key,n,d,eff,core,description,tune,coreEff={}])=>[{id:asc+'.'+key,asc,n,d,eff,tune:{},parent:null},{id:asc+'.'+key+'.core',asc,n:core,d:description,eff:coreEff,tune,parent:asc+'.'+key}])]));
function ascensionBudget(lvl=G.lvl,depth=G.maxDepth,unlocked=!!G.ascension){return unlocked&&lvl>=20&&depth>=8?2+(lvl>=30&&depth>=12?1:0)+(lvl>=40&&depth>=18?1:0):0;}
function ascensionCleanNodes(asc,raw,lvl=G.lvl,depth=G.maxDepth){const defs=ASC_TALENTS[asc]||[],pending=[...new Set(Array.isArray(raw)?raw:[])].filter(id=>defs.some(n=>n.id===id)),out=[],budget=ascensionBudget(lvl,depth,!!asc);for(let pass=0;pass<2;pass++)for(const id of pending){const n=defs.find(n=>n.id===id);if(out.length<budget&&!out.includes(id)&&(!n.parent||out.includes(n.parent)))out.push(id);}return out;}
function ascensionSelected(){return (ASC_TALENTS[G.ascension]||[]).filter(n=>G.ascensionNodes?.includes(n.id));}
function ascensionNodeEffects(){const out={};for(const n of ascensionSelected())for(const[k,v]of Object.entries(n.eff))out[k]=(out[k]||0)+v;return out;}
function ascensionTuning(){const out={};for(const n of ascensionSelected())for(const[k,v]of Object.entries(n.tune))out[k]=(out[k]||0)+v;return out;}
function ascensionNodeState(id){const n=ASC_TALENTS[G.ascension]?.find(n=>n.id===id),selected=G.ascensionNodes?.includes(id),blocked=!!G.run||!!G.train,child=ASC_TALENTS[G.ascension]?.some(n=>n.parent===id&&G.ascensionNodes?.includes(n.id));return {n,selected,allocate:!!n&&!selected&&!blocked&&ascensionBudget()>(G.ascensionNodes?.length||0)&&(!n.parent||G.ascensionNodes?.includes(n.parent)),refund:!!n&&selected&&!blocked&&!child};}
function ascensionAfterEdit(){recalc();if(G.char==='street')G.h.buffer=Math.min(G.h.buffer||0,G.st.life*((G.ascension==='ground'?.09:.05)+(ascensionTuning().shieldCap||0)));if(G.char==='frost'&&G.characterRuntime)G.characterRuntime.combo=Math.min(G.characterRuntime.combo||0,(G.ascension==='pace'?8:5)+(ascensionTuning().comboCap||0));G.dirty=true;}
function allocateAscensionNode(id){if(!ascensionNodeState(id).allocate)return false;G.ascensionNodes=[...(G.ascensionNodes||[]),id];ascensionAfterEdit();return true;}
function refundAscensionNode(id,expected){const cost=25*G.lvl;if(!ascensionNodeState(id).refund||G.gold<cost||!expected||expected.asc!==G.ascension||expected.cost!==cost||expected.nodes!==JSON.stringify(G.ascensionNodes))return false;G.gold-=cost;G.ascensionNodes=G.ascensionNodes.filter(n=>n!==id);ascensionAfterEdit();return true;}
function resetAscensionNodes(expected){const cost=25*G.lvl*(G.ascensionNodes?.length||0);if(!G.ascensionNodes?.length||G.run||G.train||G.gold<cost||!expected||expected.asc!==G.ascension||expected.cost!==cost||expected.nodes!==JSON.stringify(G.ascensionNodes))return false;G.gold-=cost;G.ascensionNodes=[];ascensionAfterEdit();return true;}
