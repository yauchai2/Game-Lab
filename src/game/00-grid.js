// 接線板：純邏輯，不依賴遊戲其他檔案。設計見 docs/wire-board-design.md
// 左邊是電源匯流排，右邊是技能插槽；玩家從電源拉一條線到插槽，線經過的輔助配件才會強化那個技能。
(function (root) {
  const W = 8, H = 8;                                          // 第 0 欄電源、第 7 欄插槽，中間 6 欄是可走線的格子
  const SOCKS = [[7, 3], [7, 4], [7, 2], [7, 5], [7, 1], [7, 6]];   // 插槽位置，依解鎖順序排列
  const SOCK_LV = [1, 4, 9, 15, 22, 30];                       // 與 01-data.js 的 SLOT_LV 相同；這裡獨立複製一份
  const ROCKS = [[3, 1], [4, 6], [5, 0], [2, 7]];      // 壞軌：固定不變，不能放配件也不能走線
  const BOOSTS = [[2, 4], [5, 3], [3, 2], [4, 5]];             // 強化格：放在這裡的配件效果 ×1.4
  const BOOST_LV = 6;
  const TIER_MUL = [1, 1.5, 2];                          // 配件階級：Ⅰ、Ⅱ、Ⅲ
  const ADJ_BONUS = 1.2, ADJ_CAP = 1.6, BOOST_MUL = 1.4;

  // 主動機件：mult、cd 與 src/game/01-data.js 的 SKILLS 相同；原型獨立，所以在這裡複製一份
  const ACTIVES = {
    FIRE:   { n: '過熱電池',   tags: ['proj', 'fire'],  mult: 2.6, cd: 2.6 },
    FROST:  { n: '冷氣爆發',   tags: ['area', 'cold'],  mult: 1.9, cd: 4.2 },
    CHAIN:  { n: '紅外線連鎖', tags: ['proj', 'light'], mult: 2.3, cd: 3.2 },
    METEOR: { n: '衛星墜落',   tags: ['area', 'fire'],  mult: 6.2, cd: 8.0 },
    PULSE:  { n: '重低音喇叭', tags: ['area', 'light'], mult: 2.2, cd: 5.0 },
    SPAM:   { n: '垃圾郵件',   tags: ['proj', 'light'], mult: 1.1, cd: 3.6 },
    MAGNET: { n: '強力磁鐵',   tags: ['area', 'cold'],  mult: 1.5, cd: 6.0 },
    FLICKER:{ n: '閃打連拍',   tags: ['melee', 'light'], mult: 2.0, cd: 3.4 },
    BEAM:   { n: '雷射指向筆', tags: ['proj', 'fire'],  mult: 4.5, cd: 5.5 },
  };
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
        (n('AREA') && key === 'FIRE' ? .85 : 1),
      crit:15*n('FOCUS') + 30*n('CRITS') + 15*n('CRYSTAL'),
      reduction:30*n('HASTE') + 15*n('COOL'), delay:1 + .15*n('FOCUS'),
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
  const isInner = (x, y) => x >= 1 && x <= W - 2 && y >= 0 && y < H;
  const isRock = (x, y) => has(ROCKS, x, y);
  const isBoost = (x, y) => has(BOOSTS, x, y);
  const sockAtY = y => SOCKS.findIndex(s => s[1] === y);
  const sockIndex = p => (p.x === W - 1 ? sockAtY(p.y) : -1);
  const levelSockets = lvl => SOCK_LV.filter(l => lvl >= l).length;
  const unlockedCount = (b, lvl) => Math.min(SOCKS.length, Math.max(levelSockets(lvl), (b && b.extra) || 0));
  const gemCap = lvl => lvl >= 15 ? 5 : lvl >= 9 ? 4 : lvl >= 4 ? 3 : 2;   // 一條線最多生效的配件數
  const wireMax = (b, lvl) => 6*unlockedCount(b, lvl) + 4 + 2*Math.floor(lvl/10);   // 整塊板子可用的線長（格數）

  function createBoard() { return { w: W, h: H, v: 4, pieces: [], wires: [], nextId: 1, extra: 0 }; }
  const pieceAt = (b, x, y, kind) => b.pieces.find(p => p.x === x && p.y === y && (!kind || p.kind === kind));
  const getWire = (b, i) => b.wires.find(w => w.sock === i);
  const connected = (b, i) => { const w = getWire(b, i); return !!(w && w.cells.length && same(w.cells[w.cells.length - 1], [W - 2, SOCKS[i][1]])); };
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
    if (!last) { if (x !== 1) return no('線要從左邊電源旁邊的格子開始'); }
    else if (Math.abs(x - last[0]) + Math.abs(y - last[1]) !== 1) return no('只能接在線尾旁邊的格子');
    if (wireCellSet(b).has(x + ',' + y)) return no('這格已經有線了');
    if (lvl != null && wireLen(b) >= wireMax(b, lvl)) return no('線不夠長，升級可以加長');
    if (!w) { w = { sock: i, cells: [] }; b.wires.push(w); }
    w.cells.push([x, y]);
    return { ok: true, connected: connected(b, i) };
  }
  function shrink(b, i) { const w = getWire(b, i); if (!w) return false; w.cells.pop(); if (!w.cells.length) b.wires = b.wires.filter(q => q !== w); return true; }
  function cut(b, i, x, y) { const w = getWire(b, i); if (!w) return false; const k = w.cells.findIndex(c => c[0] === x && c[1] === y); if (k < 0) return false; w.cells.length = k + 1; return true; }
  function clearWire(b, i) { b.wires = b.wires.filter(w => w.sock !== i); }

  // 最短路線：從電源旁邊任一格走到插槽旁；先走強化格再走普通格，同長度時優先經過強化格
  function route(b, i, lvl, avoid) {
    const used = avoid || wireCellSet(b, i), goal = [W - 2, SOCKS[i][1]];
    const ok = (x, y) => isInner(x, y) && !isRock(x, y) && !used.has(x + ',' + y);
    if (!ok(goal[0], goal[1])) return null;
    // Dijkstra：上下轉彎略貴一點，路線盡量走直線，不會亂闖別條線的位置；強化格稍微便宜，同長度時優先經過
    const gy = SOCKS[i][1], dist = new Map(), prev = new Map(), q = [];
    const cost = (x, y, vert) => 1 + (vert ? .3 : 0) + Math.abs(y - gy)*.02 - (isBoost(x, y) ? .05 : 0);
    for (let y = 0; y < H; y++) if (ok(1, y)) { dist.set('1,' + y, cost(1, y, false)); q.push([1, y]); }
    while (q.length) {
      let m = 0; for (let k = 1; k < q.length; k++) if (dist.get(q[k].join()) < dist.get(q[m].join())) m = k;
      const c = q.splice(m, 1)[0], d = dist.get(c.join());
      for (const [dx, dy] of DIRS) { const x = c[0] + dx, y = c[1] + dy, k = x + ',' + y; if (!ok(x, y)) continue; const nd = d + cost(x, y, dy !== 0); if (!dist.has(k) || nd < dist.get(k) - 1e-9) { if (!dist.has(k)) q.push([x, y]); dist.set(k, nd); prev.set(k, c); } }
    }
    if (!dist.has(goal.join())) return null;
    const out = []; for (let c = goal; c; c = prev.get(c[0] + ',' + c[1])) out.unshift(c);
    if (lvl != null && wireLen(b) - ((getWire(b, i) || { cells: [] }).cells.length) + out.length > wireMax(b, lvl)) return null;
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
    if (kind === 'active') return x === W - 1 && sockAtY(y) >= 0 && !b.pieces.some(p => p.kind === 'active' && p.y === y && p.id !== ignoreId);
    return isInner(x, y) && !isRock(x, y) && !b.pieces.some(p => p.kind === 'support' && p.x === x && p.y === y && p.id !== ignoreId);
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

  // 每個配件的強度：相鄰同款每個 ×1.2（最多 ×1.6），放在強化格上再 ×1.4
  function strength(b, p, lvl) {
    let f = 1;
    for (const [dx, dy] of DIRS) { const n = pieceAt(b, p.x + dx, p.y + dy, 'support'); if (n && n.key === p.key) f *= ADJ_BONUS; }
    f = Math.min(ADJ_CAP, f);
    if (lvl >= BOOST_LV && isBoost(p.x, p.y)) f *= BOOST_MUL;
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

  // 補一個位置（相容舊介面）：輔助要落在指定主動機件的線上，會避開相鄰同款與強化格；找不到回傳 null
  function findSpot(b, kind, key, activeId) {
    if (kind === 'active') { for (const [x, y] of SOCKS) if (canPlace(b, 'active', key, x, y)) return { x, y, rot: 0 }; return null; }
    const act = b.pieces.find(p => p.id === activeId && p.kind === 'active'); if (!act || !fits(key, act)) return null;
    const i = sockIndex(act); if (!connected(b, i) && !autoWire(b, i).ok) return null;
    const cells = getWire(b, i).cells.filter(([x, y]) => canPlace(b, 'support', key, x, y));
    const score = ([x, y]) => (DIRS.some(([dx, dy]) => { const n = pieceAt(b, x + dx, y + dy, 'support'); return n && n.key === key; }) ? 2 : 0) + (isBoost(x, y) ? 1 : 0);
    const c = cells.map((c, k) => ({ c, s: score(c)*100 + k })).sort((a, d) => a.s - d.s)[0];
    return c ? { x: c.c[0], y: c.c[1], rot: 0 } : null;
  }

  // 預期 DPS（單一目標）：每次命中 = 武器傷害 × 技能倍率 × (1 + 傷害加成) × 期望暴擊倍率
  // hero：{ hit 武器傷害, crit 暴擊率 %, cm 暴擊傷害 % }
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
        if (last ? Math.abs(last[0] - c[0]) + Math.abs(last[1] - c[1]) !== 1 : c[0] !== 1) { okw = false; break; }
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
  function adopt(raw, lvl = 1) { return raw && raw.v === 4 ? normalize(raw) : raw && raw.pieces ? migrate(raw, lvl) : migrate({ pieces: [] }, lvl); }

  const api = { TIER_MUL, W, H, SOCKS, SOCK_LV, ROCKS, BOOSTS, BOOST_LV, ADJ_BONUS, ADJ_CAP, BOOST_MUL, LIMITS, ACTIVES, SUPPORTS,
    skillMods, cooldown, gemCap, wireMax, unlockedCount, levelSockets, isInner, isRock, isBoost, sockIndex, sockAtY, pieceAt, getWire, connected, wireLen, wireOf, wireCellSet,
    createBoard, extend, shrink, cut, clearWire, route, autoWire, autoWireAll, shapeOf, cellsOf, canPlace, place, remove, rotate, fits, strength, resolve, findSpot, dps,
    normalize, migrate, fromLegacy, adopt, dress };
  if (typeof module !== 'undefined') module.exports = api; else root.GridLab = api;
})(typeof window !== 'undefined' ? window : globalThis);
