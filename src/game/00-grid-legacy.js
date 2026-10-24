// 接線板：純邏輯，不依賴遊戲其他檔案。設計見 docs/wire-board-design.md
// 顏色接線板（B3）：電源在左邊與下邊、技能插槽在上邊與右邊，每個插槽只接同色電源；線經過的色塊襯墊才放得下輔助配件，
// 同色襯墊 ×2、其他顏色 ×1。
(function (root) {
  const W = 10, H = 10;                                        // 邊上一圈是電源與插槽，中間 8×8 是可走線的格子
  const SOCKS = [[9, 4], [3, 0], [9, 2], [6, 0], [9, 7], [1, 0]];   // 插槽位置，依解鎖順序排列
  const SRCS = [[5, 9], [0, 4], [3, 9], [0, 7], [7, 9], [0, 2]];    // 每個插槽專屬的電源（同一組的位置不會交叉）
  const SOCK_COL = ['r', 'b', 'g', 'r', 'b', 'g'];               // 插槽與它的電源顏色：紅、藍、綠
  const SOCK_LV = [1, 4, 9, 15, 22, 30];                       // 與 01-data.js 的 SLOT_LV 相同；這裡獨立複製一份
  const OLD_SOCKS = [[7, 3], [7, 4], [7, 2], [7, 5], [7, 1], [7, 6]];   // 舊版（0.33–0.40）插槽位置，只用來搬舊存檔
  const ROCKS = [[4, 4], [5, 5], [3, 6]];                              // 壞軌：固定不變，不能放配件也不能走線
  const PADS = [[7, 4, 'r'], [1, 4, 'b'], [8, 4, 'g'], [6, 3, 'r'], [6, 8, 'b'], [5, 1, 'g'], [8, 6, 'r'], [4, 3, 'b'], [2, 7, 'g'], [8, 3, 'r'], [8, 8, 'b'], [3, 7, 'g'], [7, 1, 'r'], [2, 4, 'b'], [3, 2, 'g'], [1, 2, 'r'], [2, 5, 'b'], [6, 1, 'g'], [7, 7, 'r'], [5, 6, 'b'], [3, 1, 'g'], [4, 5, 'r'], [6, 4, 'b'], [8, 7, 'g'], [3, 3, 'r'], [3, 5, 'b'], [4, 2, 'g']];  // 色塊襯墊 [x, y, 顏色]：配件只能放在襯墊上
  const PAD_MATCH = 2;                                         // 配件顏色與線同色的襯墊 ×2
  const TIER_MUL = [1, 1.5, 2];                          // 配件階級：Ⅰ、Ⅱ、Ⅲ

  // 主動機件：mult、cd 與 src/game/01-data.js 的 SKILLS 相同；原型獨立，所以在這裡複製一份
  const ACTIVES = {
    FIRE:   { n: '灼熱電池',   tags: ['proj', 'fire'],  mult: 2.6, cd: 2.6 },
    FROST:  { n: '冷氣爆發',   tags: ['area', 'cold'],  mult: 1.9, cd: 4.2 },
    CHAIN:  { n: '紅外線連鎖', tags: ['proj', 'light'], mult: 2.3, cd: 3.2 },
    METEOR: { n: '流星衛星',   tags: ['area', 'fire'],  mult: 6.2, cd: 8.0 },
    PULSE:  { n: '重低音砲', tags: ['area', 'light'], mult: 2.2, cd: 5.0 },
    SPAM:   { n: '迷惑郵件',   tags: ['proj', 'light'], mult: 1.1, cd: 3.6 },
    MAGNET: { n: '超強磁石',   tags: ['area', 'cold'],  mult: 1.5, cd: 6.0 },
    FLICKER:{ n: '連拍閃擊',   tags: ['melee', 'light'], mult: 1.7, cd: 3.4 },
    BEAM:   { n: '雷射指示棒', tags: ['proj', 'fire'],  mult: 4.5, cd: 5.5 },
  };
  Object.assign(ACTIVES,{"DISC": {"n": "回帶飛盤", "mult": 2.2, "cd": 3.8, "tags": ["proj", "light"]}, "COIL": {"n": "街角線圈", "mult": 1.2, "cd": 6, "tags": ["area", "light"]}, "ORBIT": {"n": "磁帶環刃", "mult": 1.25, "cd": 5.8, "tags": ["area", "cold"]}, "RAIL": {"n": "軌道放電", "mult": 4.2, "cd": 4.8, "tags": ["proj", "light"]}, "DEFRAG": {"n": "碎片清除", "mult": 2.9, "cd": 5, "tags": ["proj", "fire"]}, "RELAY": {"n": "中繼崩解", "mult": 2.4, "cd": 7, "tags": ["area", "cold"]}});
  Object.assign(ACTIVES,{"SWARM": {"n": "口袋蜂群", "mult": 0.8, "cd": 14, "tags": ["summon", "light"]}, "GUARDIAN": {"n": "重型護衛", "mult": 2.1, "cd": 18, "tags": ["summon", "fire"]}, "ARROWS": {"n": "電磁箭雨", "mult": 3.8, "cd": 8.5, "tags": ["area", "spread", "light"]}, "GIANTBLADE": {"n": "巨型光刃", "mult": 5.4, "cd": 10, "tags": ["area", "spread", "cold"]}, "OVERTURE": {"n": "失真終章", "mult": 1.5, "cd": 6.8, "tags": ["area", "spread", "light"]}});
  // 輔助配件：needs 為空代表任何主動機件都適用；否則至少符合其中一個標籤
  const SUPPORTS = {
    HEAVY: { n: '超頻',     needs: [],        mod: { dmg: 0.45 } },
    AREA:  { n: '廣播',     needs: ['proj'],  mod: { area: 1, dmg: -0.15 } },
    HASTE: { n: '寬頻',     needs: [],        mod: { cd: -0.3 } },
    TWIN:  { n: '雙卡雙待', needs: [],        mod: { repeat: 1 } },
    CRITS: { n: '爆機',     needs: [],        mod: { crit: 0.3 } },
    COOL:  { n: '散熱片',   needs: [],        mod: { dmg: 0.2, cd: -0.15 } },
    CRYSTAL:{ n: '水晶振盪', needs: [],        mod: { dmg: 0.1, crit: 0.15 } },
    LEECH: { n: '無線充電', needs: [],        mod: { leech: 0.12 } },
    FOCUS: { n: '鎖頻晶片', needs: [],        mod: { dmg: .35, crit: .15, cd: .15 } },
    FORK:  { n: '分線器',   needs: ['proj', 'melee'], mod: { fork: 1 } },
    RECOVER:{ n: '備用電池', needs: [],        mod: { recover: 1 } },
    DELAY: { n: '延遲緩衝', needs: [],        mod: { dmg: -.15, repeat: 1 } },
  };
  Object.assign(SUPPORTS,{"ANCHOR": {"n": "定錨電容", "needs": [], "mod": {"dmg": 0.8, "cd": 0.25}}, "EXECUTE": {"n": "清場指令", "needs": [], "mod": {"dmg": -0.1}}, "BLOOD": {"n": "危險供電", "needs": [], "mod": {"dmg": -0.1}}, "CONDUCT": {"n": "異常協定", "needs": [], "mod": {"dmg": -0.1}}, "LONG": {"n": "遠距天線", "needs": [], "mod": {"dmg": -0.1}}, "SPREAD": {"n": "廣域接頭", "needs": ["spread"], "mod": {"dmg": -0.2, "area": 0.4}}});
  for(const id of ['DISC','COIL','ORBIT','RAIL','RELAY','PULSE','MAGNET','BEAM'])ACTIVES[id].tags.push('spread');
  Object.assign(SUPPORTS,{VENOM:{n:"腐蝕封包",needs:[],mod:{dmg:-.1}},RIME:{n:"冷媒回路",needs:["cold"],mod:{dmg:-.1}},KINDLE:{n:"燃點回授",needs:["fire"],mod:{dmg:-.1}}});
  // 舊版方塊拼圖的形狀，只用來把舊存檔搬到接線板
  const LEGACY = {
    active: { FIRE: [[0, 0]], FROST: [[0, 0], [1, 0]], CHAIN: [[0, 0], [0, 1]], METEOR: [[0, 0], [1, 0], [0, 1]], PULSE: [[0, 0], [1, 0], [1, 1]],
      SPAM: [[0, 0], [1, 0]], MAGNET: [[0, 0], [0, 1], [1, 1]], FLICKER: [[0, 0], [1, 0], [2, 0], [2, 1]], BEAM: [[0, 0], [0, 1], [0, 2]] },
    support: { HEAVY: [[0, 0], [1, 0]], AREA: [[0, 0]], HASTE: [[0, 0], [1, 0], [2, 0]], TWIN: [[0, 0], [1, 0], [0, 1]], CRITS: [[0, 0]],
      COOL: [[0, 0], [1, 0], [1, 1]], CRYSTAL: [[0, 0]], LEECH: [[0, 0], [1, 0]], FOCUS: [[0, 0]], FORK: [[0, 0], [0, 1]], RECOVER: [[0, 0], [1, 0]], DELAY: [[0, 0], [1, 0], [1, 1]] },
  };
  const LIMITS = Object.freeze({ cooldownReduction:0.6, repeatDamage:0.6, castTime:0.4 });

  // weights：每個配件的強度（相鄰同款、強化格會放大），沒給就都是 1
  function skillMods(keys, key, weights) {
    const n = id => keys.reduce((a, k, i) => k === id ? a + (weights ? weights[i] : 1) : a, 0);
    return {
      hit:(1 + .35*n('FOCUS'))*(n('DELAY') ? .85 : 1)*(1 + .45*n('HEAVY'))*
        (1 + .08*Math.max(0,Math.min(5,keys.length)-2))*(1 + .2*n('COOL') + .1*n('CRYSTAL'))*
        (n('AREA') && key === 'FIRE' ? .85 : 1)*(1+.8*n('ANCHOR'))*Math.max(.4,1-.1*n('EXECUTE')-.1*n('BLOOD')-.1*n('CONDUCT')-.1*n('LONG')-.2*n('SPREAD')-.1*n('RIME')-.1*n('KINDLE')),
      crit:15*n('FOCUS') + 30*n('CRITS') + 15*n('CRYSTAL'),
      reduction:30*n('HASTE') + 15*n('COOL'), delay:1 + .15*n('FOCUS')+.25*n('ANCHOR'),
      twin:n('TWIN'), area:!!n('AREA'), leech:!!n('LEECH'), repeat:!!n('DELAY'),
    };
  }
  function cooldown(base, keys, haste=0, multiplier=1, weights) {
    const mod = skillMods(keys, '', weights);
    return base*multiplier*mod.delay*(1 - Math.min(LIMITS.cooldownReduction,Math.max(0,haste + mod.reduction)/100));
  }

  /* ---------- 棋盤規則（等級決定能用多少） ---------- */
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const has = (list, x, y) => list.some(c => c[0] === x && c[1] === y);
  const isInner = (x, y) => x >= 1 && x <= W - 2 && y >= 1 && y <= H - 2;
  const isRock = (x, y) => has(ROCKS, x, y);
  const padAt = (x, y) => PADS.find(p => p[0] === x && p[1] === y);
  const isPad = (x, y) => !!padAt(x, y);
  const padColor = (x, y) => { const p = padAt(x, y); return p ? p[2] : null; };
  const sockAt = (x, y) => SOCKS.findIndex(s => s[0] === x && s[1] === y);
  const sockIndex = p => sockAt(p.x, p.y);
  const startOf = i => { const [x, y] = SRCS[i]; return x === 0 ? [1, y] : [x, H - 2]; };   // 電源旁邊、線的第一格
  const endOf = i => { const [x, y] = SOCKS[i]; return x === W - 1 ? [W - 2, y] : [x, 1]; };   // 插槽旁邊、線的最後一格
  const levelSockets = lvl => SOCK_LV.filter(l => lvl >= l).length;
  const unlockedCount = (b, lvl) => Math.min(SOCKS.length, Math.max(levelSockets(lvl), (b && b.extra) || 0));
  const gemCap = () => 99;      // 配件數量由襯墊數量自然限制，不另設上限
  const wireMax = () => 99;     // 線長也沒有硬上限，板面只有 6×6，三條以上的線會互相擠

  function createBoard() { return { w: W, h: H, v: 5, pieces: [], wires: [], nextId: 1, extra: 0 }; }
  const pieceAt = (b, x, y, kind) => b.pieces.find(p => p.x === x && p.y === y && (!kind || p.kind === kind));
  const getWire = (b, i) => b.wires.find(w => w.sock === i);
  const connected = (b, i) => { const w = getWire(b, i); return !!(w && w.cells.length && same(w.cells[w.cells.length - 1], endOf(i))); };
  const wireCellSet = (b, except) => { const s = new Set(); for (const w of b.wires) if (w.sock !== except) for (const c of w.cells) s.add(c[0] + ',' + c[1]); return s; };
  const wireLen = b => b.wires.reduce((a, w) => a + w.cells.length, 0);
  const wireOf = (b, x, y) => b.wires.find(w => has(w.cells, x, y));
  const no = reason => ({ ok: false, reason });

  /* ---------- 拉線 ---------- */
  function extend(b, i, x, y, lvl) {
    if (!isInner(x, y)) return no('線只能走中間的格子');
    if (isRock(x, y)) return no('壞軌不能走線');
    let w = getWire(b, i);
    if (w && connected(b, i)) return no('這條線已經接通，點最後一格可以收回');
    const last = w && w.cells.length ? w.cells[w.cells.length - 1] : null;
    if (!last) { if (!same(startOf(i), [x, y])) return no('線要從自己顏色的電源旁邊的格子開始'); }
    else if (Math.abs(x - last[0]) + Math.abs(y - last[1]) !== 1) return no('只能接在線尾旁邊的格子');
    if (wireCellSet(b).has(x + ',' + y)) return no('這格已經有線了');
    if (lvl != null && wireLen(b) >= wireMax(b, lvl)) return no('線不夠長，升級可以加長');
    if (!w) { w = { sock: i, cells: [] }; b.wires.push(w); }
    w.cells.push([x, y]);
    return { ok: true, connected: connected(b, i) };
  }
  // 從線尾（沒有線就從電源旁邊的格子）一路接到指定格：繞開壞軌與別條線，找最短路徑，逐格接上；中途接不上就停在原地
  function extendTo(b, i, x, y, lvl) {
    if (!isInner(x, y)) return no('線只能走中間的格子');
    const w = getWire(b, i), last = w && w.cells.length ? w.cells[w.cells.length - 1] : null;
    if (connected(b, i)) return no('這條線已經接通，點最後一格可以收回');
    if (last && last[0] === x && last[1] === y) return no('已經在線尾');
    const direct = extend(b, i, x, y, lvl); if (direct.ok) return direct;
    const used = wireCellSet(b); if (w) for (const c of w.cells) used.add(c.join());
    const ok = (cx, cy) => isInner(cx, cy) && !isRock(cx, cy) && !used.has(cx + ',' + cy);
    const from = last ? last : startOf(i);
    if (!ok(x, y) || (!last && !ok(from[0], from[1]))) return direct;
    const prev = new Map(), q = [from.slice()]; prev.set(from.join(), null);
    while (q.length) {
      const c = q.shift(); if (c[0] === x && c[1] === y) break;
      for (const [dx, dy] of DIRS) { const nx = c[0] + dx, ny = c[1] + dy, k = nx + ',' + ny; if (!ok(nx, ny) || prev.has(k)) continue; prev.set(k, c); q.push([nx, ny]); }
    }
    if (!prev.has(x + ',' + y)) return direct;
    const path = []; for (let c = [x, y]; c; c = prev.get(c[0] + ',' + c[1])) path.unshift(c);
    if (last) path.shift();
    let r = direct;
    for (const c of path) { r = extend(b, i, c[0], c[1], lvl); if (!r.ok) break; }
    return r;
  }
  function shrink(b, i) { const w = getWire(b, i); if (!w) return false; w.cells.pop(); if (!w.cells.length) b.wires = b.wires.filter(q => q !== w); return true; }
  function cut(b, i, x, y) { const w = getWire(b, i); if (!w) return false; const k = w.cells.findIndex(c => c[0] === x && c[1] === y); if (k < 0) return false; w.cells.length = k + 1; return true; }
  function clearWire(b, i) { b.wires = b.wires.filter(w => w.sock !== i); }

  // 最短路線：從這個插槽專屬電源旁邊的格子走到插槽旁；同長度時優先經過同色襯墊
  function route(b, i, lvl, avoid) {
    const used = avoid || wireCellSet(b, i), goal = endOf(i), start = startOf(i), col = SOCK_COL[i];
    const ok = (x, y) => isInner(x, y) && !isRock(x, y) && !used.has(x + ',' + y);
    if (!ok(goal[0], goal[1]) || !ok(start[0], start[1])) return null;
    const dist = new Map(), prev = new Map(), q = [start.slice()];
    const cost = (x, y) => { const c = padColor(x, y); return 1 - (c === col ? .1 : c ? .05 : 0); };
    dist.set(start.join(), cost(start[0], start[1]));
    while (q.length) {
      let m = 0; for (let k = 1; k < q.length; k++) if (dist.get(q[k].join()) < dist.get(q[m].join())) m = k;
      const c = q.splice(m, 1)[0], d = dist.get(c.join());
      for (const [dx, dy] of DIRS) { const x = c[0] + dx, y = c[1] + dy, k = x + ',' + y; if (!ok(x, y)) continue; const nd = d + cost(x, y); if (!dist.has(k) || nd < dist.get(k) - 1e-9) { if (!dist.has(k)) q.push([x, y]); dist.set(k, nd); prev.set(k, c); } }
    }
    if (!dist.has(goal.join())) return null;
    const out = []; for (let c = goal; c; c = prev.get(c[0] + ',' + c[1])) out.unshift(c);
    return out;
  }
  function autoWire(b, i, lvl) {
    const path = route(b, i, lvl); if (!path) return no('找不到可以接通的路線');
    clearWire(b, i); b.wires.push({ sock: i, cells: path }); return { ok: true, cells: path };
  }
  const perms = a => a.length < 2 ? [a] : a.flatMap((v, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map(p => [v, ...p]));
  // 一次把所有有技能卻沒接通的插槽接好；換順序嘗試，找總線長最短、全部接通的組合
  function autoWireAll(b, lvl) {
    const need = b.pieces.filter(p => p.kind === 'active').map(sockIndex).filter(i => i >= 0 && i < unlockedCount(b, lvl) && !connected(b, i)).sort((a, c) => a - c);
    if (!need.length) return { ok: true, count: 0 };
    const keep = b.wires.filter(w => !need.includes(w.sock)), snap = JSON.stringify(b.wires);
    let best = null;
    for (const order of perms(need).slice(0, 720)) {
      b.wires = JSON.parse(JSON.stringify(keep)); let all = true;
      for (const i of order) { const p = route(b, i, lvl); if (!p) { all = false; continue; } b.wires.push({ sock: i, cells: p }); }
      const total = wireLen(b), score = (all ? 0 : 1e6) + total + (need.length - b.wires.filter(w => need.includes(w.sock)).length)*1e5;
      if (!best || score < best.score) best = { score, wires: JSON.parse(JSON.stringify(b.wires)), all };
      if (all && need.length > 4 && best.all) break;
    }
    b.wires = best ? best.wires : JSON.parse(snap);
    return { ok: !!(best && best.all), count: need.filter(i => connected(b, i)).length };
  }

  /* ---------- 擺放 ---------- */
  const defOf = (kind, key) => (kind === 'active' ? ACTIVES : SUPPORTS)[key];
  const shapeOf = () => [[0, 0]];
  const cellsOf = p => [[p.x, p.y]];
  function canPlace(b, kind, key, x, y, rot, ignoreId) {
    if (!defOf(kind, key)) return false;
    if (kind === 'active') return sockAt(x, y) >= 0 && !b.pieces.some(p => p.kind === 'active' && p.x === x && p.y === y && p.id !== ignoreId);
    return isInner(x, y) && !isRock(x, y) && isPad(x, y) && !b.pieces.some(p => p.kind === 'support' && p.x === x && p.y === y && p.id !== ignoreId);
  }
  function place(b, kind, key, x, y, rot, opts) {
    if (!canPlace(b, kind, key, x, y)) return null;
    const p = { id: b.nextId++, kind, key, x, y, rot: 0 };
    if (kind === 'support' && opts && opts.t > 1) p.t = Math.min(3, opts.t | 0);
    b.pieces.push(p);
    if (kind === 'active') { const i = sockIndex(p); if (!connected(b, i) && !(opts && opts.noWire)) autoWire(b, i, opts && opts.lvl); }
    return p;
  }
  function remove(b, id) {
    const i = b.pieces.findIndex(p => p.id === id);
    if (i < 0) return false;
    b.pieces.splice(i, 1);
    return true;
  }
  const rotate = (b, id) => b.pieces.some(p => p.id === id);

  const fits = (key, act) => { const need = SUPPORTS[key].needs; return !need.length || need.some(t => ACTIVES[act.key].tags.includes(t)); };

  // 每個配件的強度：放在與這條線同色的襯墊上 ×2，其他顏色 ×1；再乘上配件階級
  function strength(b, p, lvl) {
    const w = wireOf(b, p.x, p.y);
    const f = w && padColor(p.x, p.y) === SOCK_COL[w.sock] ? PAD_MATCH : 1;
    return f * TIER_MUL[Math.min(3, p.t || 1) - 1];
  }
  // 每個主動機件的結算：線經過、標籤相符的輔助，依序取到上限為止，數值乘上強度後加總（冷卻有下限）
  function resolve(b, lvl = 99) {
    const cap = gemCap(lvl), out = [];
    const actives = b.pieces.filter(p => p.kind === 'active').sort((a, c) => sockIndex(a) - sockIndex(c));
    for (const a of actives) {
      const i = sockIndex(a), wire = connected(b, i) ? getWire(b, i) : null, linked = [], weights = [], over = [], missed = [];
      if (wire) for (const [x, y] of wire.cells) {
        const s = pieceAt(b, x, y, 'support'); if (!s) continue;
        if (!fits(s.key, a)) { missed.push(s.id); continue; }
        if (linked.length >= cap) { over.push(s.id); continue; }
        linked.push(s.id); weights.push(strength(b, s, lvl));
      }
      const stat = { dmg: 0, area: 0, cd: 0, crit: 0, repeat: 0, leech: 0 };
      linked.forEach((id, k) => { const s = b.pieces.find(p => p.id === id); for (const [m, v] of Object.entries(SUPPORTS[s.key].mod)) stat[m] = (stat[m] || 0) + v*weights[k]; });
      const keys = linked.map(id => b.pieces.find(p => p.id === id).key);
      stat.cd = Math.round((cooldown(ACTIVES[a.key].cd, keys, 0, 1, weights)/ACTIVES[a.key].cd - 1)*1e12)/1e12;
      out.push({ id: a.id, key: a.key, sock: i, wired: !!wire, linked, weights, over, missed, stat });
    }
    return out;
  }

  // 補一個位置：輔助要落在指定主動機件的線上、而且是襯墊；優先同色襯墊（×2），找不到回傳 null
  function findSpot(b, kind, key, activeId) {
    if (kind === 'active') { for (const [x, y] of SOCKS) if (canPlace(b, 'active', key, x, y)) return { x, y, rot: 0 }; return null; }
    const act = b.pieces.find(p => p.id === activeId && p.kind === 'active'); if (!act || !fits(key, act)) return null;
    const i = sockIndex(act); if (!connected(b, i) && !autoWire(b, i).ok) return null;
    const cells = getWire(b, i).cells.filter(([x, y]) => canPlace(b, 'support', key, x, y));
    const c = cells.map((c, k) => ({ c, s: (padColor(c[0], c[1]) === SOCK_COL[i] ? 0 : 1)*100 + k })).sort((a, d) => a.s - d.s)[0];
    return c ? { x: c.c[0], y: c.c[1], rot: 0 } : null;
  }

  // 預期 DPS（單一目標）：每次命中 = 武器傷害 × 技能倍率 × (1 + 傷害加成) × 期望會心倍率
  // hero：{ hit 武器傷害, crit 會心率 %, cm 會心傷害 % }
  function dps(b, hero, lvl) {
    return resolve(b, lvl).map(r => {
      const d = ACTIVES[r.key], keys = r.linked.map(id => b.pieces.find(p => p.id === id).key), mod = skillMods(keys, r.key, r.weights);
      const crit = Math.min(1, Math.max(0, (hero.crit + mod.crit) / 100));
      const hit = hero.hit * d.mult * mod.hit * (1 + crit * (hero.cm / 100 - 1));
      const interval = cooldown(d.cd, keys, hero.haste || 0, 1, r.weights);
      const perCast = hit * (1 + mod.twin * LIMITS.repeatDamage + (mod.repeat ? .45 : 0));
      return { id: r.id, key: r.key, hit, interval, dps: perCast / interval };
    });
  }

  /* ---------- 存檔整理與舊版搬家 ---------- */
  // 讀進來的接線板：去掉不合法的東西，不改合法的
  function normalize(raw) {
    const b = createBoard();
    b.extra = Math.max(0, Math.min(SOCKS.length, Math.floor((raw && raw.extra) || 0)));
    for (const p of (raw && raw.pieces) || []) {
      if (!p || (p.kind !== 'active' && p.kind !== 'support') || !defOf(p.kind, p.key) || !Number.isInteger(p.x) || !Number.isInteger(p.y)) continue;
      if (!canPlace(b, p.kind, p.key, p.x, p.y)) continue;
      if (p.kind === 'active' && b.pieces.some(q => q.kind === 'active' && q.key === p.key)) continue;
      const q = { id: b.nextId++, kind: p.kind, key: p.key, x: p.x, y: p.y, rot: 0 };
      if (p.mode) q.mode = p.mode;
      if (p.kind === 'support' && p.t > 1 && p.t <= 3) q.t = p.t | 0;
      b.pieces.push(q);
    }
    const used = new Set();
    for (const w of (raw && raw.wires) || []) {
      if (!w || !Number.isInteger(w.sock) || w.sock < 0 || w.sock >= SOCKS.length || b.wires.some(q => q.sock === w.sock) || !Array.isArray(w.cells)) continue;
      const cells = []; let okw = true;
      for (const c of w.cells) {
        if (!Array.isArray(c) || !Number.isInteger(c[0]) || !Number.isInteger(c[1]) || !isInner(c[0], c[1]) || isRock(c[0], c[1]) || used.has(c.join())) { okw = false; break; }
        const last = cells[cells.length - 1];
        if (last ? Math.abs(last[0] - c[0]) + Math.abs(last[1] - c[1]) !== 1 : !same(startOf(w.sock), c)) { okw = false; break; }
        cells.push([c[0], c[1]]);
      }
      if (!okw || !cells.length) continue;
      cells.forEach(c => used.add(c.join())); b.wires.push({ sock: w.sock, cells });
    }
    return b;
  }
  // 舊版方塊拼圖：解出每個主動機件原本連到哪些輔助
  function legacyLinks(old) {
    const cellsOf2 = p => { let s = (LEGACY[p.kind] || {})[p.key]; if (!s) return []; for (let i = 0; i < ((p.rot || 0) % 4); i++) { s = s.map(([x, y]) => [-y, x]); const mx = Math.min(...s.map(c => c[0])), my = Math.min(...s.map(c => c[1])); s = s.map(([x, y]) => [x - mx, y - my]); } return s.map(([x, y]) => [p.x + x, p.y + y]); };
    const ps = (old.pieces || []).filter(p => p && LEGACY[p.kind] && LEGACY[p.kind][p.key]), occ = new Map();
    ps.forEach((p, k) => cellsOf2(p).forEach(c => occ.set(c.join(), k)));
    const actives = ps.map((p, k) => ({ p, k })).filter(o => o.p.kind === 'active').sort((a, c) => a.p.y - c.p.y || a.p.x - c.p.x);
    return actives.map(({ p, k }) => {
      const adj = new Set();
      for (const [x, y] of cellsOf2(p)) for (const [dx, dy] of DIRS) { const j = occ.get((x + dx) + ',' + (y + dy)); if (j != null && j !== k && ps[j].kind === 'support') adj.add(j); }
      return { key: p.key, mode: p.mode, supports: [...adj].map(j => ps[j].key).filter(s => SUPPORTS[s] && fits(s, { key: p.key })) };
    });
  }
  // 把一串輔助放到某個插槽的線上，不夠位置的就留在庫存
  function dress(b, i, keys, lvl) {
    const act = b.pieces.find(p => p.kind === 'active' && sockIndex(p) === i), w = getWire(b, i); if (!act || !w || !connected(b, i)) return 0;
    let n = 0;
    for (const key of keys.slice(0, gemCap(lvl))) { const sp = findSpot(b, 'support', key, act.id); if (!sp) break; place(b, 'support', key, sp.x, sp.y); n++; }
    return n;
  }
  function migrate(old, lvl) {
    const b = createBoard(), links = legacyLinks(old).slice(0, SOCKS.length);
    b.extra = links.length > levelSockets(lvl) ? links.length : 0;
    links.forEach((l, i) => { const p = place(b, 'active', l.key, SOCKS[i][0], SOCKS[i][1], 0, { noWire: true }); if (p && l.mode) p.mode = l.mode; });
    autoWireAll(b, lvl);
    links.forEach((l, i) => dress(b, i, l.supports, lvl));
    return b;
  }
  // 很舊的存檔（技能槽加輔助孔）：依序放進插槽，輔助放到各自的線上
  function fromLegacy(slots, supp, lvl) {
    const ids = (slots || []).filter(id => id && ACTIVES[id]).slice(0, SOCKS.length), b = createBoard();
    b.extra = ids.length > levelSockets(lvl) ? ids.length : 0;
    ids.forEach((id, i) => place(b, 'active', id, SOCKS[i][0], SOCKS[i][1], 0, { noWire: true }));
    autoWireAll(b, lvl);
    ids.forEach((id, i) => dress(b, i, ((supp && supp[id]) || []).filter(g => SUPPORTS[g] && fits(g, { key: id })), lvl));
    return b;
  }
  // 任何版本的接線板都收成最新版
  // 0.33–0.40 的接線板（v4：插槽全在右欄、電源在左欄）搬到顏色接線板：技能留在原本的插槽順序，重新接線，配件盡量放回襯墊
  function convertV4(raw, lvl) {
    const b = createBoard(), olds = [];
    b.extra = Math.max(0, Math.min(SOCKS.length, Math.floor((raw && raw.extra) || 0)));
    for (const p of (raw && raw.pieces) || []) {
      if (!p || p.kind !== 'active' || !ACTIVES[p.key] || !Number.isInteger(p.x) || !Number.isInteger(p.y)) continue;
      const i = OLD_SOCKS.findIndex(s => s[0] === p.x && s[1] === p.y);
      if (i < 0 || b.pieces.some(q => q.kind === 'active' && q.key === p.key) || pieceAt(b, SOCKS[i][0], SOCKS[i][1], 'active')) continue;
      const q = place(b, 'active', p.key, SOCKS[i][0], SOCKS[i][1], 0, { noWire: true }); if (q && p.mode) q.mode = p.mode;
      const w = ((raw && raw.wires) || []).find(w => w && w.sock === i), cells = w && Array.isArray(w.cells) ? w.cells : [];
      olds[i] = cells.map(c => ((raw.pieces || []).find(s => s && s.kind === 'support' && SUPPORTS[s.key] && s.x === c[0] && s.y === c[1]))).filter(Boolean);
    }
    autoWireAll(b, lvl);
    olds.forEach((list, i) => {
      const act = b.pieces.find(p => p.kind === 'active' && sockIndex(p) === i); if (!act || !list || !connected(b, i)) return;
      for (const s of list) { if (!fits(s.key, act)) continue; const sp = findSpot(b, 'support', s.key, act.id); if (!sp) break; place(b, 'support', s.key, sp.x, sp.y, 0, { t: s.t }); }
    });
    return b;
  }
  function adopt(raw, lvl = 1) { return raw && raw.v === 5 ? normalize(raw) : raw && raw.v === 4 ? convertV4(raw, lvl) : raw && raw.pieces ? migrate(raw, lvl) : migrate({ pieces: [] }, lvl); }

  const api = { TIER_MUL, W, H, SOCKS, SRCS, SOCK_COL, SOCK_LV, ROCKS, PADS, PAD_MATCH, startOf, endOf, sockAt, padAt, isPad, padColor, LIMITS, ACTIVES, SUPPORTS,
    skillMods, cooldown, gemCap, wireMax, unlockedCount, levelSockets, isInner, isRock, sockIndex, pieceAt, getWire, connected, wireLen, wireOf, wireCellSet,
    createBoard, extend, extendTo, shrink, cut, clearWire, route, autoWire, autoWireAll, shapeOf, cellsOf, canPlace, place, remove, rotate, fits, strength, resolve, findSpot, dps,
    normalize, migrate, fromLegacy, adopt, dress };
  if (typeof module !== 'undefined') module.exports = api; else root.LegacyGrid = api;
})(typeof window !== 'undefined' ? window : globalThis);
