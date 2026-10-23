/* Small deterministic prototypes. No production-game imports or save access. */
(function (root) {
  'use strict';
  const NODES = ['感應器', '電容', '分線器', '雷射', '脈衝', '護盾'];
  const STEPS = {
    cold: ['冰霧', '凍結 3 秒'], mark: ['標記', '易傷 3 秒'],
    burst: ['碎星', '消耗冰凍／標記'], recharge: ['回充', '恢復 18 護盾']
  };
  const DEFAULTS = {
    circuit: { edges: [[0, 1], [1, 2], [2, 3], [2, 5]] },
    tape: { steps: ['cold', 'mark', 'burst', 'recharge'] },
    overclock: { rate: 1.2, weapons: [true, true], cooling: 'fins' },
    frequency: { phases: [0, 0, 0] },
    firmware: { chips: ['side', 'pierce'] },
    city: { selected: [0, 1, 4, 7] }
  };
  const CITY = [
    { name: '電源站', type: 'power', cost: 1 }, { name: '冷卻廠', type: 'cool', cost: 1 }, { name: '訊號塔', type: 'signal', cost: 2 },
    { name: '訊號塔', type: 'signal', cost: 2 }, { name: '中樞', type: 'hub', cost: 0 }, { name: '電源站', type: 'power', cost: 1 },
    { name: '修復所', type: 'repair', cost: 1 }, { name: '電源站', type: 'power', cost: 1 }, { name: '訊號塔', type: 'signal', cost: 2 }
  ];
  const clone = x => JSON.parse(JSON.stringify(x));
  function circuitConnect(config, from, to) {
    if (from > 2) return { ok: false, reason: '雷射、脈衝與護盾是終點，請先選感應器、電容或分線器。' };
    if (from === to || to === 0) return { ok: false, reason: '不能接回自己或感應器；請選另一個接收端。' };
    if (config.edges.some(e => e[0] === from && e[1] === to)) return { ok: false, reason: '這條線已存在。點下方連線可拆除。' };
    const limit = from === 2 ? 2 : 1;
    const edges = config.edges.filter(e => !(e[0] === from && limit === 1));
    if (edges.filter(e => e[0] === from).length >= limit) return { ok: false, reason: '分線器最多兩個輸出，請先拆除一條。' };
    edges.push([from, to]);
    function visit(n, path) {
      if (path.has(n)) return false;
      const next = new Set(path); next.add(n);
      return edges.filter(e => e[0] === n).every(e => visit(e[1], next));
    }
    if (!visit(0, new Set()) || !visit(1, new Set()) || !visit(2, new Set())) return { ok: false, reason: '這會形成循環。請接到另一個輸出端。' };
    config.edges = edges;
    return { ok: true, reason: NODES[from] + ' → ' + NODES[to] + '，已接通。' };
  }
  function cityNetwork(config) {
    const owned = new Set(config.selected); const connected = new Set([4]); const queue = [4];
    while (queue.length) {
      const n = queue.shift();
      for (const m of [n - 3, n + 3, n % 3 ? n - 1 : -1, n % 3 < 2 ? n + 1 : -1]) {
        if (m >= 0 && m < 9 && owned.has(m) && !connected.has(m)) { connected.add(m); queue.push(m); }
      }
    }
    const counts = { power: 0, cool: 0, signal: 0, repair: 0 };
    for (const i of connected) if (i !== 4) counts[CITY[i].type]++;
    return { connected: [...connected], counts, cost: [...owned].reduce((s, i) => s + CITY[i].cost, 0) };
  }
  class Run {
    constructor(mode, config, scenario = 'swarm') {
      this.mode = mode; this.config = clone(config); this.scenario = scenario;
      this.t = 0; this.hp = 120; this.shield = 0; this.damage = 0; this.kills = 0; this.combos = 0;
      this.enemies = []; this.fx = []; this.logs = []; this.done = false; this.serial = 0;
      this.heat = 0; this.charge = 0; this.overheated = false; this.downtime = 0; this.wasted = 0;
      this.cold = 0; this.mark = 0; this.lastStep = -1; this.lastPhase = -1;
      this.next = { spawn: .1, basic: .5, pulse: .6, tape: .3, spray: .3, beam: .8, firmware: .4, frequency: .3, city: .4 };
      this.buff = mode === 'city' ? cityNetwork(this.config) : null;
      this.log('試跑開始。改裝後會以相同敵人序列重跑。');
    }
    log(message) { this.logs.unshift({ t: this.t, message }); this.logs.length = Math.min(5, this.logs.length); }
    spawn() {
      if (this.scenario === 'boss') {
        if (this.serial) return;
        this.enemies.push({ id: ++this.serial, x: 260, y: 90, hp: 900, max: 900, attack: 15, next: 0, boss: true });
      } else {
        const id = ++this.serial;
        this.enemies.push({ id, x: 310 + (id % 3) * 8, y: 30 + ((id * 47) % 120), hp: 48, max: 48, attack: 7, next: 0, boss: false });
      }
    }
    hit(amount, kind, count = 1, penetration = 0, filter = null) {
      const list = this.enemies.filter(e => !filter || filter(e)).sort((a, b) => a.x - b.x).slice(0, count);
      for (const e of list) {
        const multiplier = e.boss ? 1 - Math.max(0, .45 - penetration) : 1;
        const dealt = Math.min(e.hp, Math.max(0, amount * multiplier));
        e.hp -= dealt; this.damage += dealt;
        this.fx.push({ x: e.x, y: e.y, amount: Math.round(dealt), kind, until: this.t + .5 });
      }
      const dead = this.enemies.filter(e => e.hp <= .00001);
      this.kills += dead.length;
      if (dead.some(e => e.boss)) this.log('首領擊破！');
      this.enemies = this.enemies.filter(e => e.hp > .00001);
      if (this.scenario === 'boss' && this.serial && !this.enemies.length) this.done = true;
      this.fx = this.fx.slice(-40);
      return list.length;
    }
    addShield(n) { this.shield = Math.min(70, this.shield + n); }
    route(node, q, depth = 0) {
      if (depth > 6) return;
      if (node === 1) {
        this.charge += q;
        if (this.charge < 6) return;
        q = 6; this.charge -= 6; this.combos++; this.log('電容滿充，送出 6 格訊號。');
      }
      if (node === 3) { this.hit(q * 13, 'laser'); return; }
      if (node === 4) { this.hit(q * 6, 'pulse', 5); return; }
      if (node === 5) { this.addShield(q * 5); return; }
      const edges = this.config.edges.filter(e => e[0] === node);
      if (!edges.length) { this.wasted += q; return; }
      for (const e of edges) this.route(e[1], q / edges.length, depth + 1);
    }
    tape() {
      this.lastStep = (this.lastStep + 1) % 4;
      const step = this.config.steps[this.lastStep];
      if (step === 'cold') { this.cold = this.t + 3; this.hit(6, 'cold', 5); this.log('冰霧：建立 3 秒凍結窗口。'); }
      if (step === 'mark') { this.mark = this.t + 3; this.hit(5, 'mark', 3); this.log('標記：建立 3 秒易傷窗口。'); }
      if (step === 'recharge') { this.addShield(18); this.log('回充：恢復 18 護盾。'); }
      if (step === 'burst') {
        const cold = this.cold > this.t; const marked = this.mark > this.t;
        const n = this.hit(30 * (cold ? 2.4 : 1) * (marked ? 1.6 : 1), 'burst', 3);
        if (n && (cold || marked)) this.combos++;
        this.log('碎星：' + (cold && marked ? '雙條件爆發！' : cold ? '消耗冰凍。' : marked ? '消耗標記。' : '沒有鋪墊，普通命中。'));
        this.cold = 0; this.mark = 0;
      }
    }
    tick(dt) {
      if (this.done) return;
      dt = Math.min(dt, .1); this.t = Math.min(30, this.t + dt);
      if (this.t >= this.next.spawn && this.enemies.length < 18) { this.spawn(); this.next.spawn += this.scenario === 'boss' ? 999 : .85; }
      if (this.t >= this.next.basic) { this.hit(5, 'basic'); this.next.basic += .85; }
      if (this.mode === 'circuit' && this.t >= this.next.pulse) { this.route(0, 2); this.next.pulse += .8; }
      if (this.mode === 'tape' && this.t >= this.next.tape) { this.tape(); this.next.tape += 1.25; }
      if (this.mode === 'overclock') {
        const cooling = this.config.cooling === 'fins' ? 25 : 13;
        this.heat = Math.max(0, this.heat - cooling * dt);
        if (this.config.cooling === 'recycle' && this.heat > 0) this.addShield(3 * dt);
        if (this.overheated) {
          this.downtime += dt;
          if (this.heat <= 30) { this.overheated = false; this.log('冷卻完成，恢復攻擊。'); }
        } else {
          const r = this.config.rate;
          if (this.config.weapons[0] && this.t >= this.next.spray) { this.hit(10, 'pulse', 3); this.heat += 12; this.next.spray = this.t + .8 / r; }
          if (this.config.weapons[1] && this.t >= this.next.beam) { this.hit(48, 'laser'); this.heat += 30; this.next.beam = this.t + 1.7 / r; }
          if (this.heat >= 100) { this.overheated = true; this.combos++; this.log('過熱！武器停機，降至 30 熱量後重啟。'); }
        }
      }
      if (this.mode === 'frequency' && this.t >= this.next.frequency) {
        this.lastPhase = (this.lastPhase + 1) % 4;
        const n = this.config.phases.filter(p => p === this.lastPhase).length;
        if (n) {
          const sync = n > 1;
          this.hit(18 * n * (sync ? 1.5 : 1), sync ? 'burst' : 'laser', sync ? 2 : 1, sync ? .4 : 0);
          if (sync) this.combos++;
          else this.cold = this.t + .85;
          this.log('第 ' + (this.lastPhase + 1) + ' 拍：' + (sync ? n + ' 台共振，破甲但留出空拍。' : '單台發射，短暫減速。'));
        }
        this.next.frequency += .65;
      }
      if (this.mode === 'firmware' && this.t >= this.next.firmware) {
        const chips = this.config.chips; const side = chips.includes('side'); const orbit = chips.includes('orbit');
        const offset = orbit ? Math.sin(this.t * 2.5) * 36 : 0;
        const filter = side ? e => Math.abs(e.y - 90 - (e.x < 240 ? offset : 0)) > 15 : null;
        const echo = chips.includes('echo'); let amount = side ? 42 : 24;
        if (echo && this.shield >= 8) { this.shield -= 8; amount *= 1.8; this.combos++; this.log('消耗 8 護盾，觸發回聲。'); }
        const hits = this.hit(amount, side ? 'side' : 'laser', chips.includes('pierce') ? 4 : 1, chips.includes('pierce') ? .15 : 0, filter);
        if (hits && chips.includes('leech')) { this.addShield(hits * 7); this.combos++; }
        if (side && !hits) this.log('側射沒有命中：正面是盲區，試試繞行。');
        this.next.firmware += chips.includes('pierce') ? 1.25 : .9;
      }
      if (this.mode === 'city' && this.t >= this.next.city) {
        const c = this.buff.counts;
        this.charge += 2 + c.power * 2;
        if (this.charge >= 8) {
          this.charge -= 8; this.combos++;
          this.hit(45 + c.power * 8, 'burst', 1 + c.signal, c.signal ? .2 : 0);
          this.log('供能滿充：' + (1 + c.signal) + ' 目標放電。');
        }
        this.addShield(c.repair * 8);
        this.next.city += Math.max(.45, 1.4 - c.cool * .35);
      }
      for (const e of this.enemies) {
        const frozen = this.cold > this.t;
        e.x = Math.max(122, e.x - (e.boss ? 8 : 15) * dt * (frozen ? .25 : 1));
        if (!e.boss) e.y += Math.sign(90 - e.y) * dt * 2;
        if (e.x <= 140 && this.t >= e.next) {
          let incoming = e.attack;
          const absorbed = Math.min(this.shield, incoming); this.shield -= absorbed; incoming -= absorbed;
          this.hp = Math.max(0, this.hp - incoming); e.next = this.t + 1.7;
        }
      }
      this.fx = this.fx.filter(f => f.until > this.t);
      if (this.hp <= 0 || this.t >= 30) this.done = true;
      if (this.done && !this.ended) { this.ended = true; this.log(this.hp <= 0 ? '機體倒下，保留配置可重新挑戰。' : '試跑完成，可改裝比較結果。'); }
    }
    result() { return { kills: this.kills, damage: Math.round(this.damage), hp: Math.round(this.hp), time: +this.t.toFixed(1), combos: this.combos, downtime: +this.downtime.toFixed(1) }; }
    resource() {
      if (this.mode === 'overclock') return ['熱量', Math.min(100, this.heat), 100];
      if (this.mode === 'circuit') return ['電容', this.charge, 6];
      if (this.mode === 'city') return ['電荷', this.charge, 8];
      return ['護盾', this.shield, 70];
    }
  }
  const API = { Run, DEFAULTS, NODES, STEPS, CITY, clone, circuitConnect, cityNetwork };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Buildcraft = API;
})(typeof window === 'undefined' ? globalThis : window);
