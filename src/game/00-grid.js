// 配件拼圖原型：純邏輯，不依賴遊戲其他檔案。設計見 docs/prototype-grid-and-mod-design.md
// 主動機件自動出手；輔助配件只強化上下左右相鄰、標籤相符的主動機件。
(function (root) {
  // 主動機件：shape 是相對格座標 [x, y]；tags 供輔助比對
  const ACTIVES = {
    // mult、cd 與 src/game/01-data.js 的 SKILLS 相同；原型獨立，所以在這裡複製一份
    FIRE:   { n: '過熱電池',   shape: [[0, 0]],                 tags: ['proj', 'fire'],  mult: 2.6, cd: 2.6 },
    FROST:  { n: '冷氣爆發',   shape: [[0, 0], [1, 0]],         tags: ['area', 'cold'],  mult: 1.9, cd: 4.2 },
    CHAIN:  { n: '紅外線連鎖', shape: [[0, 0], [0, 1]],         tags: ['proj', 'light'], mult: 2.3, cd: 3.2 },
    METEOR: { n: '衛星墜落',   shape: [[0, 0], [1, 0], [0, 1]], tags: ['area', 'fire'],  mult: 6.2, cd: 8.0 },
    PULSE:  { n: '重低音喇叭', shape: [[0, 0], [1, 0], [1, 1]], tags: ['area', 'light'], mult: 2.2, cd: 5.0 },
    SPAM:   { n: '垃圾郵件',   shape: [[0, 0], [1, 0]],         tags: ['proj', 'light'], mult: 1.1, cd: 3.6 },
    MAGNET: { n: '強力磁鐵',   shape: [[0, 0], [0, 1], [1, 1]], tags: ['area', 'cold'],  mult: 1.5, cd: 6.0 },
    FLICKER:{ n: '閃打連拍',   shape: [[0, 0], [1, 0], [2, 0], [2, 1]], tags: ['melee', 'light'], mult: 2.0, cd: 3.4 },
    BEAM:   { n: '雷射指向筆', shape: [[0, 0], [0, 1], [0, 2]], tags: ['proj', 'fire'],  mult: 4.5, cd: 5.5 },
  };
  // 輔助配件：needs 為空代表任何主動機件都適用；否則至少符合其中一個標籤
  const SUPPORTS = {
    HEAVY: { n: '超頻',     shape: [[0, 0], [1, 0]], needs: [],        mod: { dmg: 0.45 } },
    AREA:  { n: '廣播',     shape: [[0, 0]], needs: ['proj'],  mod: { area: 1, dmg: -0.15 } },
    HASTE: { n: '寬頻',     shape: [[0, 0], [1, 0], [2, 0]], needs: [],        mod: { cd: -0.3 } },
    TWIN:  { n: '雙卡雙待', shape: [[0, 0], [1, 0], [0, 1]], needs: [],        mod: { repeat: 1 } },
    CRITS: { n: '爆機',     shape: [[0, 0]], needs: [],        mod: { crit: 0.3 } },
    COOL:  { n: '散熱片',   shape: [[0, 0], [1, 0], [1, 1]], needs: [],        mod: { dmg: 0.2, cd: -0.15 } },
    CRYSTAL:{ n: '水晶振盪', shape: [[0, 0]], needs: [],        mod: { dmg: 0.1, crit: 0.15 } },
    LEECH: { n: '無線充電', shape: [[0, 0], [1, 0]], needs: [],        mod: { leech: 0.12 } },
  };
  Object.assign(SUPPORTS,{FOCUS:{n:'鎖頻晶片',shape:[[0,0]],needs:[],mod:{dmg:.35,crit:.15,cd:.15}},FORK:{n:'分線器',shape:[[0,0],[0,1]],needs:['proj','melee'],mod:{fork:1}},RECOVER:{n:'備用電池',shape:[[0,0],[1,0]],needs:[],mod:{recover:1}},DELAY:{n:'延遲緩衝',shape:[[0,0],[1,0],[1,1]],needs:[],mod:{dmg:-.15,repeat:1}}});
  const LIMITS = Object.freeze({ cooldownReduction:0.6, repeatDamage:0.6, castTime:0.4 });
  // Shared by the standalone board, runtime stats and combat previews.
  function skillMods(keys, key) {
    const n = id => keys.filter(k => k === id).length;
    return {
      hit:(1 + .35*n('FOCUS'))*(n('DELAY') ? .85 : 1)*(1 + .45*n('HEAVY'))*
        (1 + .08*Math.max(0,Math.min(5,keys.length)-2))*(1 + .2*n('COOL') + .1*n('CRYSTAL'))*
        (n('AREA') && key === 'FIRE' ? .85 : 1),
      crit:15*n('FOCUS') + 30*n('CRITS') + 15*n('CRYSTAL'),
      reduction:30*n('HASTE') + 15*n('COOL'), delay:1 + .15*n('FOCUS'),
      twin:n('TWIN'), area:!!n('AREA'), leech:!!n('LEECH'), repeat:!!n('DELAY'),
    };
  }
  function cooldown(base, keys, haste=0, multiplier=1) {
    const mod = skillMods(keys, '');
    return base*multiplier*mod.delay*(1 - Math.min(LIMITS.cooldownReduction,Math.max(0,haste + mod.reduction)/100));
  }

  const defOf = (kind, key) => (kind === 'active' ? ACTIVES : SUPPORTS)[key];
  const rotCell = ([x, y]) => [-y, x];
  const norm = cells => {
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]);
  };
  // 旋轉 r 次（每次 90 度）後的形狀
  function shapeOf(kind, key, rot) {
    let s = defOf(kind, key).shape;
    for (let i = 0; i < (rot || 0) % 4; i++) s = norm(s.map(rotCell));
    return s;
  }
  const cellsOf = p => shapeOf(p.kind, p.key, p.rot).map(([x, y]) => [p.x + x, p.y + y]);

  function createBoard(w = 6, h = 1) { return { w, h, v: 3, pieces: [], nextId: 1 }; }

  function occupied(b, ignoreId) {
    const m = new Map();
    for (const p of b.pieces) if (p.id !== ignoreId) for (const [x, y] of cellsOf(p)) m.set(x + ',' + y, p.id);
    return m;
  }
  function canPlace(b, kind, key, x, y, rot, ignoreId) {
    const occ = occupied(b, ignoreId);
    return shapeOf(kind, key, rot).every(([dx, dy]) => {
      const cx = x + dx, cy = y + dy;
      return cx >= 0 && cy >= 0 && cx < b.w && cy < b.h && !occ.has(cx + ',' + cy);
    });
  }
  function place(b, kind, key, x, y, rot = 0) {
    if (!defOf(kind, key) || !canPlace(b, kind, key, x, y, rot)) return null;
    const p = { id: b.nextId++, kind, key, x, y, rot };
    b.pieces.push(p);
    return p;
  }
  function remove(b, id) {
    const i = b.pieces.findIndex(p => p.id === id);
    if (i < 0) return false;
    b.pieces.splice(i, 1);
    return true;
  }
  // 原地旋轉，放不下就維持原樣
  function rotate(b, id) {
    const p = b.pieces.find(q => q.id === id);
    if (!p) return false;
    const r = ((p.rot || 0) + 1) % 4;
    if (!canPlace(b, p.kind, p.key, p.x, p.y, r, id)) return false;
    p.rot = r;
    return true;
  }

  const fits = (sup, act) => {
    const need = SUPPORTS[sup.key].needs;
    return !need.length || need.some(t => ACTIVES[act.key].tags.includes(t));
  };

  // 每個主動機件的結算：相鄰且標籤相符的輔助，數值加總（冷卻有下限）
  function resolve(b) {
    const occ = occupied(b);
    const byId = new Map(b.pieces.map(p => [p.id, p]));
    const out = [];
    for (const a of b.pieces.filter(p => p.kind === 'active')) {
      const adj = new Set();
      for (const [x, y] of cellsOf(a))
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const id = occ.get((x + dx) + ',' + (y + dy));
          if (id && id !== a.id && byId.get(id).kind === 'support') adj.add(id);
        }
      const linked = [...adj].map(id => byId.get(id)).filter(s => fits(s, a));
      const stat = { dmg: 0, area: 0, cd: 0, crit: 0, repeat: 0, leech: 0 };
      for (const s of linked) for (const [k, v] of Object.entries(SUPPORTS[s.key].mod)) stat[k] += v;
      stat.cd = Math.round((cooldown(ACTIVES[a.key].cd,linked.map(s=>s.key))/ACTIVES[a.key].cd-1)*1e12)/1e12;
      out.push({ id: a.id, key: a.key, linked: linked.map(s => s.id), stat });
    }
    return out;
  }

  // 在不動既有機件的前提下找一個位置：輔助要求能連到指定主動機件（activeId），找不到回傳 null
  function findSpot(b, kind, key, activeId) {
    for (let rot = 0; rot < 4; rot++)
      for (let y = 0; y < b.h; y++)
        for (let x = 0; x < b.w; x++) {
          if (!canPlace(b, kind, key, x, y, rot)) continue;
          if (kind === 'support') {
            const p = place(b, kind, key, x, y, rot), linked = resolve(b).find(r => r.id === activeId).linked.includes(p.id);
            remove(b, p.id);
            if (!linked) continue;
          }
          return { x, y, rot };
        }
    return null;
  }

  // 預期 DPS（單一目標）：每次命中 = 武器傷害 × 技能倍率 × (1 + 傷害加成) × 期望暴擊倍率
  // hero：{ hit 武器傷害, crit 暴擊率 %, cm 暴擊傷害 % }
  function dps(b, hero) {
    return resolve(b).map(r => {
      const d = ACTIVES[r.key], keys=r.linked.map(id=>b.pieces.find(p=>p.id===id).key), mod=skillMods(keys,r.key);
      const crit = Math.min(1, Math.max(0, (hero.crit + mod.crit) / 100));
      const hit = hero.hit * d.mult * mod.hit * (1 + crit * (hero.cm / 100 - 1));
      const interval = cooldown(d.cd, keys, hero.haste || 0);
      const perCast = hit * (1 + mod.twin * LIMITS.repeatDamage + (mod.repeat ? .45 : 0));
      return { id: r.id, key: r.key, hit, interval, dps: perCast / interval };
    });
  }

  const api = { findSpot, dps, LIMITS, skillMods, cooldown, ACTIVES, SUPPORTS, createBoard, shapeOf, cellsOf, canPlace, place, remove, rotate, resolve };
  if (typeof module !== 'undefined') module.exports = api; else root.GridLab = api;
})(typeof window !== 'undefined' ? window : globalThis);
