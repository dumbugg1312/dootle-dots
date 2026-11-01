// SPEEDRUN: every stage from 1-1 to 12-boss back to back, on one clock. Opens off the title once 12-boss is beaten or UNLOCK ALL LEVELS is on.
// Two categories: ANY% (reach every goal) and 100% (a stage won't clear until its every kernel, tape, blue card, Dot secret and gold chip is found).
// The engine reads DD.opts.run (engine.js RUN()): no cutscenes, title cards, dialogue, voice, NEW FAN cards or results card; a wrong blue card
// costs five seconds; RESTART in the pause menu restarts the stage with the clock running, RESET RUN goes back to 1-1 at zero.
// Fair play: no HEI store upgrades, all four Dots from the start, and each stage's enemy luck comes from a seed (the same every run).
// The clock counts simulated frames (the engine steps at a fixed 60 a second), so it reads the same on any monitor; pause doesn't count.
// A run never touches the save: no HEI Points, tapes, secrets or chips are kept. Bests live in localStorage under dootledots.speedrun.
(function () {
  const VW = DD.VW, VH = DD.VH, text = DD.text, ctx = DD.ctx, SFX = DD.SFX;
  const KEY = 'dootledots.speedrun', CATS = [['any', 'ANY%', 'REACH EVERY GOAL. GRAB WHAT YOU WANT'], ['full', '100%', 'EVERY KERNEL, TAPE, BLUE CARD, DOT SECRET AND GOLD CHIP']];
  const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  let M = null, scene = null, st = 'pick', t = 0, cur = 0, R = null, end = null;
  let BEST = {}; try { BEST = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { BEST = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(BEST)); } catch (e) {} };

  const fmt = f => {   // frames to h:mm:ss.cc / m:ss.cc
    f = Math.max(0, Math.round(f)); const cs = Math.floor(f * 100 / 60), s = Math.floor(cs / 100) % 60, m = Math.floor(cs / 6000) % 60, h = Math.floor(cs / 360000), c = cs % 100;
    const p2 = n => (n < 10 ? '0' : '') + n;
    return (h ? h + ':' + p2(m) : m) + ':' + p2(s) + '.' + p2(c);
  };
  const delta = f => (f < 0 ? '-' : '+') + fmt(Math.abs(f)).replace(/^0:/, '');
  const ids = () => M.WORLDS.flatMap(w => w.levels.map(l => l.id)).filter(id => M.LEVELS[id]);
  const sob = b => b && b.best && b.best.length && b.best.every(x => x > 0) ? b.best.reduce((a, x) => a + x, 0) : 0;   // sum of best

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let r = Math.imul(a ^ a >>> 15, 1 | a); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  const hashId = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

  // ---- the run itself (handed to the engine as DD.opts.run)
  function newRun(cat) {
    let rng = Math.random;
    const run = {
      cat, full: cat === 'full', list: ids(), i: 0, segs: [], f: 0, flash: 0, last: null,
      seed(id) { rng = mulberry(hashId(id)); },
      rand() { return rng(); },
      tick() { run.f++; if (run.flash > 0) run.flash--; },
      penalty(n) { run.f += n; },
      total() { return run.segs.reduce((a, x) => a + x, 0) + run.f; },
      reset() { SFX.switch(); startRun(cat); },
      draw: drawClock,
    };
    return run;
  }
  function startRun(cat) { R = newRun(cat); play(); }
  function play() {
    const id = R.list[R.i], w = M.WORLDS.find(w => w.levels.some(l => l.id === id));
    M.prepSongs(w);
    DD.start(M.LEVELS[id], { run: R, perks: null, dots: null, joins: null, dsec: [], store: false, onExit: done });
  }
  function done(r) {
    if (r.quit) { R = null; st = 'pick'; t = 0; DD.setScene(scene); return; }
    const b = BEST[R.cat] || {}, i = R.i;
    R.segs.push(R.f); R.f = 0;
    const cum = R.segs.reduce((a, x) => a + x, 0);
    R.last = { id: r.id, cum, d: b.splits && b.splits[i] ? cum - b.splits[i] : null, gold: !(b.best && b.best[i] > 0) || R.segs[i] < b.best[i] };
    R.flash = 150;
    if (++R.i < R.list.length) return setTimeout(play, 0);
    finishRun();
  }
  function finishRun() {
    const b = BEST[R.cat] = BEST[R.cat] || {}, tot = R.segs.reduce((a, x) => a + x, 0), n = R.segs.length;
    const golds = R.segs.map((s, i) => !(b.best && b.best[i] > 0) || s < b.best[i]);
    const prev = b.pb || 0, pb = !prev || tot < prev, cum = []; R.segs.reduce((a, x, i) => (cum[i] = a + x), 0);
    end = { cat: R.cat, tot, segs: R.segs.slice(), list: R.list.slice(), golds, pb, prev, oldSplits: (b.splits || []).slice() };
    b.best = Array.from({ length: n }, (_, i) => golds[i] ? R.segs[i] : b.best[i]);
    if (pb) { b.pb = tot; b.splits = cum; b.date = new Date().toISOString().slice(0, 10); }
    b.runs = (b.runs || 0) + 1;
    save(); R = null; st = 'end'; t = 0; SFX.goal(); DD.setScene(scene);
  }

  // ---- the clock, top centre (under the boss plate when a boss is up), with the stage and the last split under it
  function drawClock(c, G) {
    const run = R; if (!run) return;
    const boss = G.boss && G.boss.engaged, y = boss ? 25 : 3, str = fmt(run.total()), w = str.length * 8 + 8, x = Math.round(VW / 2 - w / 2);
    const L = run.flash > 0 && run.last, h = L ? 30 : 22;   // the plate holds the clock, the stage, and for a moment after a goal, that split
    rect('rgba(10,4,8,0.7)', x + 1, y, w - 2, h); rect('rgba(10,4,8,0.7)', x, y + 1, w, h - 2);
    text(str, VW / 2, y + 2, '#fff6d4', 2, '#000', 'center');
    text(run.list[run.i].toUpperCase() + (run.full ? '  100%' : ''), VW / 2, y + 14, '#c8b8a0', 1, null, 'center');
    if (L) text(L.id.toUpperCase() + ' ' + (L.d === null ? fmt(L.cum) : delta(L.d)), VW / 2, y + 22, L.gold ? '#ffd24a' : L.d === null ? '#fff6d4' : L.d < 0 ? '#7fe08a' : '#ff8a7a', 1, null, 'center');
  }

  // ---- screens: pick a category, and the end of a run
  function plaque(x, y, w, h, lit) {
    rect('#000', x - 1, y - 1, w + 2, h + 2); rect(lit ? '#ffe27a' : '#c98f22', x, y, w, h);
    rect(lit ? '#7a1f3a' : '#4a1022', x + 1, y + 1, w - 2, h - 2);
  }
  function backdrop(title) {
    rect('#0c0608', 0, 0, VW, VH);
    for (let x = 0; x < VW; x += 12) { rect('#1c1014', x + 2, 2, 7, 5); rect('#1c1014', x + 2, VH - 7, 7, 5); }   // film sprockets
    rect('#2a1408', 0, 10, VW, 1); rect('#2a1408', 0, VH - 11, VW, 1);
    text(title, VW / 2, 16, '#ffe680', 2, '#7a2a10', 'center');
  }
  function keys(list) { text(list, VW / 2, VH - 20, '#cfc6bc', 1, '#000', 'center'); }
  const jump = () => (DD.jumpKey ? DD.jumpKey() : 'Z'), back = () => DD.touchOn ? 'SWITCH' : DD.padUsed ? (DD.btn ? DD.btn('circle') : 'CIRCLE') : 'X';   // back is X on a keyboard, the circle button on a pad (B on Nintendo), the SWITCH button on touch

  function drawPick() {
    backdrop('SPEEDRUN');
    text('ALL ' + ids().length + ' STAGES IN A ROW. NO CUTSCENES. ONE CLOCK.', VW / 2, 32, '#cfc6bc', 1, '#000', 'center');
    CATS.forEach(([k, name, sub], i) => {
      const y = 46 + i * 50, on = i === cur, b = BEST[k] || {};
      plaque(30, y, VW - 60, 42, on);
      text(name, 42, y + 5, on ? '#fff' : '#fff6c0', 2, '#2a0a16');
      text(sub, 42, y + 18, '#e8d8c0', 1, null);
      text('BEST ' + (b.pb ? fmt(b.pb) : '--:--.--'), 42, y + 29, '#ffd24a', 1, null);
      text('SUM OF BEST ' + (sob(b) ? fmt(sob(b)) : '--:--.--'), VW - 42, y + 29, '#e8c070', 1, null, 'right');
      if (b.runs) text(b.runs + (b.runs > 1 ? ' RUNS' : ' RUN'), VW - 42, y + 5, '#c8b8a0', 1, null, 'right');
    });
    text('NO STORE UPGRADES. ALL FOUR DOTS. A WRONG BLUE CARD COSTS 5 SECONDS.', VW / 2, 148, '#a89888', 1, '#000', 'center');
    keys(DD.touchOn ? 'TAP A CATEGORY TWICE TO GO    ' + back() + ': BACK' : jump() + ': GO    UP / DOWN: CATEGORY    ' + back() + ': BACK');
  }
  function drawEnd() {
    const e = end, name = CATS.find(c => c[0] === e.cat)[1];
    backdrop(name + '  ' + fmt(e.tot));
    const head = e.pb ? (e.prev ? 'NEW BEST!  ' + delta(e.tot - e.prev) : 'FIRST RUN ON THE BOOKS') : 'BEST STILL ' + fmt(e.prev) + '  (' + delta(e.tot - e.prev) + ')';
    if (!e.pb || t % 40 < 30) text(head, VW / 2, 32, e.pb ? '#7fe08a' : '#ff8a7a', 1, '#000', 'center');
    const n = e.list.length, per = Math.ceil(n / 4), cw = (VW - 24) / 4;   // every stage's split, four columns; gold = best ever for that stage
    e.list.forEach((id, i) => {
      const x = 12 + Math.floor(i / per) * cw, y = 42 + (i % per) * 9;
      if (y > VH - 30) return;
      text(id.toUpperCase(), x + 4, y, '#c8b8a0', 1, null);
      text(fmt(e.segs[i]), x + cw - 6, y, e.golds[i] ? '#ffd24a' : '#fff6d4', 1, null, 'right');
    });
    keys((DD.touchOn ? 'TAP: RUN IT AGAIN    ' + back() + ': BACK' : jump() + ': RUN IT AGAIN    ' + back() + ': BACK') + '    GOLD = YOUR BEST EVER ON THAT STAGE');
  }
  function step(IN) {
    t++;
    const c = IN.click;
    if (st === 'pick') {
      if (IN.ny) { cur = (cur + CATS.length + (IN.ny > 0 ? 1 : -1)) % CATS.length; SFX.tick(); }
      if (c) for (let i = 0; i < CATS.length; i++) if (c.x >= 30 && c.x < VW - 30 && c.y >= 46 + i * 50 && c.y < 88 + i * 50) { if (i === cur) return startRun(CATS[cur][0]); cur = i; SFX.tick(); }
      if ((IN.ok || IN.start) && t > 10) return startRun(CATS[cur][0]);
      if (IN.back) { SFX.switch(); M.back(); }
      return;
    }
    if (st === 'end') {
      if (t < 30) return;
      if (IN.ok || IN.start || c) return startRun(end.cat);
      if (IN.back) { st = 'pick'; t = 0; SFX.switch(); }
    }
  }
  function draw() { if (st === 'end' && end) drawEnd(); else drawPick(); }
  scene = { step, draw };

  window.DDRun = {
    open(m) { M = m; st = 'pick'; t = 0; SFX.switch(); DD.setScene(scene); },   // m: { LEVELS, WORLDS, prepSongs, back }
    get best() { return BEST; }, fmt,
  };
})();
