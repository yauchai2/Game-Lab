/* 扮工模式：整個畫面換成命令行介面，只留重要資訊與掉寶；Esc 或輸入 exit 回到遊戲 */
const BOSS = { on:false, lines:[], title:document.title };
const bossClock = () => new Date().toTimeString().slice(0, 8);
function bossPush(txt, col, tag){
  const L = { t:bossClock(), txt, col:col || '#c8d3c0', tag:tag || 'INFO' }; BOSS.lines.push(L); if (BOSS.lines.length > 400) BOSS.lines.shift();
  if (BOSS.on) bossAppend(L);
}
function bossLoot(it){ const R = RAR[it.r]; bossPush(`${R.n} ${it.name}  ilvl ${it.il}${it.lg && LEGEND_BY[it.lg] ? '  ★ ' + LEGEND_BY[it.lg].d : ''}`, it.r >= 3 ? '#ff8a4c' : '#f4c542', 'LOOT'); }
function bossAppend(L){
  const log = $('bosslog'); if (!log) return; const d = document.createElement('div'); d.className = 'bl';
  d.innerHTML = `<span class="bt">${L.t}</span> <span class="bg bg-${L.tag}">[${L.tag}]</span> <span style="color:${L.col}">${L.txt}</span>`;
  log.appendChild(d); while (log.children.length > 400) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
}
const bossBar = (p, n = 20) => '█'.repeat(Math.round(tClamp(p)*n)) + '░'.repeat(n - Math.round(tClamp(p)*n));
function bossStatus(){
  const h = G.h; return `LV ${G.lvl}  HP ${bossBar(h.hp/G.st.life, 16)} ${tFmt(Math.max(0, h.hp))}/${tFmt(G.st.life)}  XP ${bossBar(G.xp/xpNeed(G.lvl), 8)}  DEPTH ${G.run ? (G.run.tower ? 'T' + G.run.floor : 'MAP') : G.depth}  GOLD ${tFmt(G.gold)}  DPS ${tFmt(G.st.dps)}  KILLS ${G.totalKills}`;
}
const BOSS_CMDS = {
  help:() => ['commands: status  loot  equip  skills  log  clear  exit', 'press ` or Esc to return'],
  status:() => [bossStatus(), `deaths ${G.deaths}  crit ${G.st.crit.toFixed(0)}%x${G.st.cm.toFixed(0)}  armor-red ${(G.st.red*100).toFixed(0)}%  dodge ${G.st.dodge.toFixed(0)}%`],
  loot:() => { const l = BOSS.lines.filter(x => x.tag === 'LOOT').slice(-10); return l.length ? l.map(x => `${x.t} ${x.txt}`) : ['(no loot yet)']; },
  equip:() => Object.entries(G.equip).filter(([, it]) => it).map(([k, it]) => `${SLOTN[k]}: ${RAR[it.r].n} ${it.name} ilvl ${it.il}  ${itemLines(it).map(l => l.t).join(' | ')}`),
  skills:() => G.slots.filter(Boolean).map(id => `${SKILLS[id].n}  hit ${tFmt(G.st.sk[id].hit)}  cd ${G.st.sk[id].cd.toFixed(1)}s  [${(G.supp[id] || []).map(g => SUPPS[g].n).join(', ') || '-'}]`),
  log:() => BOSS.lines.slice(-12).map(x => `${x.t} [${x.tag}] ${x.txt}`),
  clear:() => { $('bosslog').innerHTML = ''; return []; },
  exit:() => { toggleBoss(false); return []; }
};
function bossCmd(v){
  v = v.trim(); if (!v) return; bossAppend({ t:bossClock(), txt:'$ ' + v, col:'#7fe0a0', tag:'CMD' });
  const f = BOSS_CMDS[v.toLowerCase()] || (v === 'q' || v === 'quit' ? BOSS_CMDS.exit : null);
  const out = f ? f() : [`bash: ${v}: command not found (try: help)`];
  out.forEach(t => bossAppend({ t:'', txt:t, col:'#c8d3c0', tag:'OUT' }));
}
function toggleBoss(on){
  on = on == null ? !BOSS.on : on; if (on === BOSS.on) return; BOSS.on = on; window.BOSSON = on;
  let o = $('bossov');
  if (on){
    if (!o){ o = document.createElement('div'); o.id = 'bossov'; o.innerHTML = `<div id="bosshead"></div><div id="bosslog"></div><div id="bossin"><span>user@build:~$</span><input id="bosscmd" autocomplete="off" spellcheck="false"></div>`; document.body.appendChild(o);
      $('bosscmd').addEventListener('keydown', e => { if (e.key === '`' || e.code === 'Backquote'){ e.preventDefault(); toggleBoss(false); } else if (e.key === 'Enter'){ bossCmd(e.target.value); e.target.value = ''; } e.stopPropagation(); }); o.addEventListener('click', () => $('bosscmd').focus()); }
    o.hidden = false; document.title = 'bash - build@ci'; $('bosslog').innerHTML = ''; BOSS.lines.slice(-120).forEach(bossAppend);
    bossAppend({ t:bossClock(), txt:'type "help" for commands, ` or Esc to exit', col:'#7a8a74', tag:'INFO' }); $('bosscmd').focus();
    BOSS.tm = setInterval(() => { $('bosshead').textContent = bossStatus(); }, 500); $('bosshead').textContent = bossStatus();
  } else { if (o) o.hidden = true; document.title = BOSS.title; clearInterval(BOSS.tm); }
}
(function(){
  const css = document.createElement('style'); css.textContent = `#bossov{position:fixed;inset:0;z-index:200;background:#0c0f0c;color:#c8d3c0;font:14px/1.55 "Cubic 11",ui-monospace,Menlo,Consolas,monospace;display:flex;flex-direction:column;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom))} #bossov[hidden]{display:none}
    #bosshead{color:#7fe0a0;border-bottom:1px solid #2a3a2a;padding-bottom:4px;margin-bottom:4px;white-space:pre-wrap;word-break:break-all} #bosslog{flex:1;overflow:auto} .bl{white-space:pre-wrap;word-break:break-all} .bt{color:#5a6a56} .bg-LOOT{color:#f4c542} .bg-CMD{color:#7fe0a0} .bg-OUT{color:#5a6a56}
    #bossin{display:flex;gap:8px;border-top:1px solid #2a3a2a;padding-top:6px} #bossin span{color:#7fe0a0} #bosscmd{flex:1;background:none;border:0;outline:0;color:#e8f0e0;font:inherit}`;
  document.head.appendChild(css);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && BOSS.on) toggleBoss(false); else if ((e.key === '`' || e.code === 'Backquote') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); toggleBoss(); } });
  setInterval(() => { if (!G.paused && !G.offline) bossPush(bossStatus(), '#7a8a74', 'STAT'); }, 60000);
})();
