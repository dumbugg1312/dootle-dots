// The HEI Points store. Every won stage pays HEI Points (Tim's own digital currency), spent here on ten upgrades of five tiers each.
// A bought tier can be turned down with left / right (all the way to off) and back up again for free, so no perk is ever forced on.
// Saved under dootledots.hei.v1, so the menu's SAVE / LOAD / CLEAR DATA take it along; OPTIONS has UNLIMITED HEI POINTS.
// Max all ten and a secret eleventh row appears: SIX BAGS (1000 points), Tim's sixth bag. With it on, every maxed upgrade
// runs at level 6 and a five-bag finish rates six bags (engine.js cardSetup / drawResults).
// The menu hands DDStore.perks() to DD.start as opts.perks and the engine applies them at each build (engine.js: build, hurt,
// updateFall, loseBag, interact, drawPlayer); the engine pays out through DDStore.award() when the results card goes up.
// The screen itself (open / step / draw) runs inside the menu's scene as st === 'store'.
(function () {
  const VW = DD.VW, VH = DD.VH, text = DD.text, SFX = DD.SFX, ctx = DD.ctx;
  const KEY = 'dootledots.hei.v1', UKEY = 'dootledots.unlimitedhei', MAX = 5;
  const COST = [15, 30, 50, 75, 100];   // tiers 1-5: 270 maxes one upgrade; a first clear pays about 40, a replay about 25
  const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 'S');
  const JUMP_PCT = [0, 6, 12, 17, 24, 30, 36], jumpPct = n => JUMP_PCT[n];   // measured in the engine (tests/store.js): how much higher a full jump goes, standing and running averaged
  const UP = [   // kind 0 passive, 1 active
    { id: 'bags', name: 'OUTSIDE FOOD', kind: 0, say: n => n > 5 ? "START EVERY STAGE WITH FIVE FULL BAGS AND A SPARE SIXTH, SO A HIT OR TWO CAN'T COST YOU THE FIVE" : 'START EVERY STAGE WITH ' + pl(n, 'BAG') + ' OF POPCORN ALREADY IN HAND' },
    { id: 'shield', name: 'MISTRIAL', kind: 0, say: n => n === 1 ? "IN EVERY STAGE, THE FIRST HIT YOU TAKE DOESN'T COUNT" : "IN EVERY STAGE, THE FIRST " + n + " HITS YOU TAKE DON'T COUNT" },
    { id: 'takes', name: 'TAKE TWO', kind: 0, say: n => n === 1 ? 'IN EVERY STAGE, THE FIRST FALL INTO A PIT COSTS NO BAG' : 'IN EVERY STAGE, THE FIRST ' + n + ' FALLS INTO A PIT COST NO BAG' },
    { id: 'drop', name: 'FIVE-SECOND RULE', kind: 0, say: n => 'DROPPED POPCORN: ' + Math.min(100, 70 + 6 * n) + '% COMES BACK (NOT 70%) AND STAYS ' + (2.5 + n) + ' SECONDS (NOT 2.5)' },
    { id: 'rewards', name: 'THE POWER OF REWARDS', kind: 0, say: n => '+' + 10 * n + '% HEI POINTS FOR EVERY STAGE YOU BEAT' },
    { id: 'star', name: 'GERM FREE', kind: 1, say: n => 'THE FIRST ' + 5 * n + ' SECONDS OF EVERY STAGE: YOU SHINE IN RAINBOW, NOTHING HURTS YOU AND FANS BOUNCE OFF' },
    { id: 'jump', name: 'EYES IN THE SKY', kind: 1, say: n => 'JUMP +' + n + ': EVERY DOT JUMPS ABOUT ' + jumpPct(n) + '% HIGHER' },
    { id: 'speed', name: 'WARP 10', kind: 1, say: n => 'SPEED +' + n + ': EVERY DOT RUNS ' + 5 * n + '% FASTER' },
    { id: 'magnet', name: 'POPCORN MAGNET', kind: 1, say: n => 'MAGNET +' + n + ': POPCORN FLIES TO YOU FROM ' + pl(n + 1, 'TILE') + ' AWAY' },
    { id: 'foam', name: 'FOAM HEADS', kind: 1, say: n => '+' + n + ' EXTRA POPCORN FOR EVERY FAN YOU KNOCK OUT' },
  ];
  const SIX = { id: 'six', name: 'SIX BAGS', kind: 2, max: 1, cost: [1000], say: () => "EVERY MAXED UPGRADE GOES TO LEVEL 6, AND A FIVE-BAG FINISH IS SIX BAGS. TIM'S CALL." };   // the secret: for sale once all ten are maxed
  const maxOf = u => u.max || MAX, priceOf = (u, o) => (u.cost || COST)[o], byId = id => id === 'six' ? SIX : UP.find(u => u.id === id);

  // ---- the save: points on hand, tiers owned, tiers switched on
  let S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
    S = { pts: Math.max(0, +S.pts || 0), own: S.own || {}, on: S.on || {}, earned: +S.earned || 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: lasts this session */ } }
  load();
  let UNL = false; try { UNL = localStorage.getItem(UKEY) === '1'; } catch (e) {}
  const own = id => Math.max(0, Math.min(maxOf(byId(id) || {}), S.own[id] | 0));
  const act = id => { const o = own(id), a = S.on[id]; return a === undefined ? o : Math.max(0, Math.min(o, a | 0)); };
  const setAct = (id, n) => { S.on[id] = n; save(); };
  function setUnlimited(on) { UNL = !!on; try { localStorage.setItem(UKEY, UNL ? '1' : '0'); } catch (e) {} }
  const canAfford = id => { const u = byId(id), o = own(id); return o < maxOf(u) && (UNL || S.pts >= priceOf(u, o)); };
  const revealed = () => UP.every(u => own(u.id) === MAX);   // SIX BAGS shows up once all ten are maxed
  const items = () => revealed() ? UP.concat([SIX]) : UP;
  const sixOn = () => revealed() && act('six') > 0;
  const lvl = id => { const a = act(id); return a === MAX && sixOn() ? 6 : a; };   // the level an upgrade runs at: SIX BAGS lifts a maxed one to 6
  const canBuy = () => items().some(u => canAfford(u.id));

  function perks() {   // what the engine reads: counts, multipliers, frames and pixels (0 / 1 = no change)
    const a = lvl, d = a('drop'), m = a('magnet');
    return { six: sixOn(), bags: a('bags'), shield: a('shield'), takes: a('takes'), keep: 0.06 * d, life: 60 * d, star: 300 * a('star'),
      jump: 1 + 0.03 * a('jump'), speed: 1 + 0.05 * a('speed'), magnet: m ? 16 * (m + 1) + 8 : 0, foam: a('foam') };
  }
  function award(r) {   // a won run's HEI Points: 10 for the clear, 4 a bag, 5 for the tape, 5 for the blue card, 15 for a boss, 15 the first time
    const P = window.__menu && window.__menu.PROG, first = !!P && !P[r.id];
    let n = 10 + 4 * (r.bags || 0) + (r.vhs ? 5 : 0) + (r.fact === 'right' ? 5 : 0) + (r.boss ? 15 : 0) + (first ? 15 : 0);
    if (r.six) n += 4;   // the sixth bag pays like the others
    const rw = lvl('rewards'); if (rw) n = Math.round(n * (1 + 0.1 * rw));
    S.pts += n; S.earned += n; save();
    return { n, first, can: canBuy() };
  }

  // ---- icons: 8x8 pixel maps ('x' cycles through the rainbow)
  const ICONS = {
    bags: [['y.yy.yy.', 'yyyyyyyy', 'rwrwrwrw', '.rwrwrw.', '.rwrwrw.', '.rwrwrw.', '..rwrw..', '..rwrw..'], { y: '#fff6c0', r: '#d8202c', w: '#f4ece0' }],
    shield: [['.hhh....', 'hhhhh...', 'hhhhhh..', '.hhhhhs.', '..hhh.s.', '......s.', '.bbbbbbs', 'bbbbbbbb'], { h: '#a0683a', s: '#e0b070', b: '#5a3a1a' }],
    takes: [['wkwkwkwk', '.wkwkwkw', '........', 'kkkkkkkk', 'kwwwwwwk', 'kkkkkkkk', 'kwwkwwwk', 'kkkkkkkk'], { k: '#262028', w: '#f0f0f0' }],
    drop: [['..wwww..', '.wwkwww.', 'wwwkwwww', 'wwwkkkww', 'wwwwwwww', '.wwwwww.', '..wwww..', 'yy....yy'], { w: '#f4ece0', k: '#3a2a30', y: '#ffe680' }],
    rewards: [['..yyyy..', '.yyyyyy.', 'yyoyyoyy', 'yyooooyy', 'yyoyyoyy', 'yyoyyoyy', '.yyyyyy.', '..yyyy..'], { y: '#ffd27a', o: '#b06a18' }],
    star: [['...xx...', '...xx...', 'xxxxxxxx', '.xxxxxx.', '..xxxx..', '.xxxxxx.', '.xx..xx.', 'x......x'], {}],
    jump: [['........', '..wwww..', '.wwbbww.', 'wwbkkbww', 'wwbkkbww', '.wwbbww.', '..wwww..', '........'], { w: '#f4ece0', b: '#3078e8', k: '#10101a' }],
    speed: [['.....yy.', '....yy..', '...yy...', '..yyyyy.', '....yy..', '...yy...', '..yy....', '.yy.....'], { y: '#30d8f0' }],
    magnet: [['gg....gg', 'gg....gg', 'rr....rr', 'rr....rr', 'rr....rr', 'rrr..rrr', '.rrrrrr.', '..rrrr..'], { g: '#d8d8e0', r: '#e8302a' }],
    six: [['y.yy.yy.', 'yyyyyyyy', 'rrwwwwrr', '.rwrrrr.', '.rwwwwr.', '.rwrrwr.', '..wwww..', '..rrrr..'], { y: '#ffe680', r: '#d8202c', w: '#fff6d4' }],
    foam: [['..kkkk..', '.kkkkkk.', '.ffffff.', 'fkffffkf', 'ffffffff', 'ff.rr.ff', '.ffffff.', '..ffff..'], { k: '#3a2418', f: '#f0c030', r: '#a83a2a' }],
  };
  const rainbow = (k, tt) => 'hsl(' + Math.round((tt * 6 + k * 45) % 360) + ',90%,64%)';
  function icon(id, x, y, s = 1, tt = 0, alpha = 1) {
    const I = ICONS[id]; if (!I) return;
    const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * alpha;
    I[0].forEach((row, r) => { for (let c = 0; c < 8; c++) { const ch = row[c]; if (ch === '.') continue; ctx.fillStyle = ch === 'x' ? rainbow(r, tt) : I[1][ch]; ctx.fillRect(x + c * s, y + r * s, s, s); } });
    ctx.globalAlpha = a0;
  }

  // ---- the screen
  const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const inR = (c, x, y, w, h) => c && c.x >= x && c.x < x + w && c.y >= y && c.y < y + h;
  const rowY = i => !revealed() ? (i < 5 ? 28 + i * 11 : 92 + (i - 5) * 11) : i < 5 ? 26 + i * 10 : i < 10 ? 84 + (i - 5) * 10 : 141;   // with SIX BAGS on the list, rows tighten to make room
  const PIPX = 146, PAN = { x: 182, y: 18, w: 134, h: 128 }, BUY = { x: PAN.x + 6, y: PAN.y + PAN.h - 20, w: PAN.w - 12, h: 15 };
  let reveal = 0, cur = 0, t = 0, back = null, label = 'BACK', msg = '', msgT = 0, pop = null, fly = [], shown = 0, poorT = 0, tip = 0;
  const TIPS = ['BEAT STAGES TO EARN HEI POINTS. FIRST CLEARS PAY EXTRA.', 'BAGS, THE TAPE, THE BLUE CARD AND BOSSES ALL PAY MORE.', 'LEFT TURNS A PERK DOWN, RIGHT TURNS IT BACK UP. FREE.'];
  const say = (s, n = 90) => { msg = s; msgT = n; };
  function wrap(s, n) { const out = []; let line = ''; for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }

  let tab = 0;   // 0 the store, 1 the casino (casino.js); C / R1 or a click on the tab flips it, and it stays put between visits
  const TABS = [{ x: 62, w: 92, label: 'HEI STORE' }, { x: 158, w: 80, label: 'CASINO' }];
  function open(o = {}) { if (tab === 1 && window.DDCasino) window.DDCasino.open(); t = 0; back = o.onBack || null; label = o.label || 'BACK'; shown = S.pts; msgT = 0; fly = []; pop = null; tip = (tip + 1) % TIPS.length; if (o.cur !== undefined) cur = o.cur; }
  function buy(i) {
    const u = items()[i], o = own(u.id), was = revealed();
    if (!u) return false;
    if (o >= maxOf(u)) { say(u.id === 'six' ? 'TIM ALREADY MADE HIS CALL' : u.name + ' IS MAXED OUT'); SFX.buzz(); return false; }
    const cost = priceOf(u, o);
    if (!UNL && S.pts < cost) { say('NEED ' + (cost - S.pts) + ' MORE HEI POINTS'); SFX.buzz(); poorT = 14; return false; }
    if (!UNL) S.pts -= cost;
    S.own[u.id] = o + 1; S.on[u.id] = o + 1; save();
    pop = { i, k: o, t: 0 };
    for (let k = 0; k < 8; k++) fly.push({ x0: VW - 58, y0: 6, x1: PIPX + o * 6 + 2, y1: rowY(i) + 2, t: -k * 2, d: 18 });   // coins fly from the balance to the new pip
    SFX.bag(); DD.tone(784, 784, 0.08, 'square', 0.05, 0.12); DD.tone(1175, 1175, 0.14, 'triangle', 0.05, 0.2);
    if (u.id === 'six') { reveal = 0; say("SIX BAGS. TIM'S CALL.", 150); [523, 659, 784, 1046, 1318, 1568].forEach((f, k) => DD.tone(f, f, 0.12, 'square', 0.05, 0.3 + k * 0.08)); }
    else say(u.name + ' LEVEL ' + (o + 1) + (o + 1 === MAX ? '. MAXED OUT!' : '!'), 80);
    if (!was && revealed()) { reveal = 1; say('ALL TEN MAXED. SOMETHING ELSE IS FOR SALE...', 200); [392, 494, 587, 784].forEach((f, k) => DD.tone(f, f, 0.2, 'triangle', 0.06, 0.4 + k * 0.15)); }   // the secret row appears
    return true;
  }
  function nudge(i, d) {
    const u = items()[i], o = own(u.id), a = act(u.id), onOff = u.id === 'six';
    if (d > 0) { if (a < o) { setAct(u.id, a + 1); SFX.tick(); say(onOff ? 'SIX BAGS IS ON' : u.name + ' SET TO LEVEL ' + (a + 1), 50); } else if (o < maxOf(u)) { SFX.buzz(); say(DD.padUsed ? 'CROSS BUYS LEVEL ' + (o + 1) : 'JUMP BUYS LEVEL ' + (o + 1), 50); } else SFX.buzz(); }
    else if (a > 0) { setAct(u.id, a - 1); SFX.tick(); say(onOff ? 'SIX BAGS IS OFF. FIVE IS THE HIGHEST AGAIN.' : a - 1 ? u.name + ' SET TO LEVEL ' + (a - 1) : u.name + ' TURNED OFF', 50); }
    else SFX.buzz();
  }
  function step(IN, c) {   // returns 'back' when the player leaves
    t++; if (msgT > 0) msgT--; if (poorT > 0) poorT--; if (pop) pop.t++;
    fly = fly.filter(f => ++f.t < f.d); if (fly.some(f => f.t === f.d - 1)) SFX.tick();
    shown += (S.pts - shown) * 0.18; if (Math.abs(S.pts - shown) < 0.5) shown = S.pts;
    const L = items(), n = L.length; if (cur >= n) cur = n - 1;
    if (reveal > 0) reveal++;
    const flip = window.DDCasino && ((IN.sp && !IN.back) || (c && TABS.some((b, i) => i !== tab && inR(c, b.x, 0, b.w, 15))));
    if (flip) { if (window.DDCasino.busy) { SFX.buzz(); return; } tab = 1 - tab; SFX.switch(); if (tab === 1) window.DDCasino.open(); return; }
    if (c && inR(c, TABS[tab].x, 0, TABS[tab].w, 15)) return;
    if (tab === 1) return window.DDCasino.step(IN, c);
    if (IN.ny) { cur = (cur + IN.ny + n) % n; SFX.tick(); }
    if (IN.nx) nudge(cur, IN.nx);
    if (c) {
      if (inR(c, 0, 0, 58, 14)) return 'back';
      if (inR(c, BUY.x, BUY.y, BUY.w, BUY.h)) { buy(cur); return; }
      for (let i = 0; i < n; i++) if (inR(c, 4, rowY(i) - 3, 172, 11)) {
        const u = L[i], id = u.id, o = own(id);
        if (c.x >= PIPX - 1) {   // a pip: an owned one sets the level (the top one again turns it down a step), the next one buys
          const k = Math.max(0, Math.min(maxOf(u) - 1, Math.floor((c.x - PIPX + 1) / 6)));
          cur = i;
          if (k < o) { const a = act(id), v = a === k + 1 ? k : k + 1; setAct(id, v); SFX.tick(); say(v ? u.name + ' SET TO LEVEL ' + v : u.name + ' TURNED OFF', 50); }
          else if (k === o) buy(i); else SFX.buzz();
        } else if (i === cur) buy(i); else { cur = i; SFX.tick(); }
        return;
      }
    } else if (IN.ok) buy(cur);
    if (IN.back || IN.store) return 'back';
  }

  function header(tt) {   // back, the two tabs, the balance
    rect('#2a0e1a', 0, 0, VW, 14); rect('#c98f22', 0, 14, VW, 1);
    rect('#3a1420', 2, 2, 54, 11); text('< ' + label, 29, 5, '#ffd27a', 1, null, 'center');
    TABS.forEach((b, i) => {   // the tabs: the one you're on is lit
      const on = i === tab, nw = i === 1 && window.DDCasino && !window.DDCasino.stats.seen;
      rect(on ? '#4a1a24' : '#1a0810', b.x, 1, b.w, 13); if (on) rect('#c98f22', b.x, 1, b.w, 1);
      text(b.label, b.x + b.w / 2, 3, on ? '#ffe680' : '#8a6a70', 2, on ? '#7a2a10' : null, 'center');
      if (nw && Math.floor(tt / 12) % 2) text('NEW', b.x + b.w - 2, 1, '#ff6a4a', 1, '#000', 'right');
    });
    const jig = poorT ? Math.round(Math.sin(poorT * 1.6) * 2) : 0;
    rect(poorT ? '#5a1420' : '#3a1420', VW - 66 + jig, 2, 64, 11); icon('rewards', VW - 63 + jig, 3, 1);
    if (UNL) text('UNLIMITED', VW - 5 + jig, 5, rainbow(0, tt), 1, null, 'right');
    else text(String(Math.round(shown)), VW - 5 + jig, 5, poorT ? '#ff8080' : '#fff6d4', 1, null, 'right');
  }
  function draw() {
    const tt = t, CURT = 174;
    if (tab === 1 && window.DDCasino) { window.DDCasino.draw(); header(tt); window.DDCasino.drawTop(); return; }
    rect('#120610', 0, 0, VW, VH);
    for (let x = -CURT + (-tt * 0.05 % CURT); x < VW + CURT; x += CURT) DD.spr('w2_curtain', x + CURT / 2, 216);
    rect('rgba(10,4,14,0.84)', 0, 0, VW, VH);
    header(tt);
    // the list
    const L = items(), rv = L.length > UP.length, six = sixOn(), ly = rv ? [18, 76] : [19, 83];
    text('PASSIVE', 8, ly[0], '#9ac8a0', 1, null); text('ACTIVE', 8, ly[1], '#9ac8a0', 1, null);
    rect('#5a3a2a', 38, ly[0] + 2, 138, 1); rect('#5a3a2a', 34, ly[1] + 2, 142, 1);
    if (rv) { const g = reveal > 0 && reveal < 60 ? (reveal % 8 < 4 ? '#fffbd0' : '#d8202c') : '#d8202c'; text('SECRET', 8, 132, g, 1, null); rect('#7a1a20', 34, 134, 142, 1); }
    L.forEach((u, i) => {
      const y = rowY(i), on = i === cur, o = own(u.id), a = act(u.id), hl = rv ? 10 : 11;
      if (on) { rect(u.kind === 2 ? '#4a1018' : '#3a1420', 4, y - 3, 172, hl); rect(u.kind === 2 ? '#e8302a' : '#c98f22', 4, y - 3, 2, hl); }
      if (u.kind === 2 && reveal > 0 && reveal < 40) rect(`rgba(255,240,200,${((40 - reveal) / 80).toFixed(2)})`, 4, y - 3, 172, hl);   // it flashes in
      icon(u.id, 8, y - 2, 1, tt, o ? 1 : 0.55);
      text(u.name, 20, y, u.kind === 2 ? (on ? '#ffe680' : '#ff8a6a') : on ? '#fffbd0' : o ? '#e8d0b0' : '#a08890', 1, null);
      const at6 = six && u.kind !== 2 && a === MAX;   // running at level 6: the pips go Six Bags red
      for (let k = 0; k < maxOf(u); k++) {
        const x = PIPX + k * 6, pp = pop && pop.i === i && pop.k === k && pop.t < 16 ? Math.round(Math.sin(pop.t / 16 * Math.PI) * 2) : 0;
        if (k < a) { rect('#000', x - pp, y - 1 - pp, 5, 7 + pp * 2); rect(at6 || u.kind === 2 ? (on ? '#ff6a4a' : '#e8302a') : on ? '#ffe680' : '#ffd27a', x + 1 - pp, y - pp, 3, 5 + pp * 2); if (at6) rect('#fff6d4', x + 1, y + 2, 3, 1); }   // on
        else if (k < o) { rect('#000', x, y - 1, 5, 7); rect('#8a5a1c', x + 1, y, 3, 5); rect('#2a1a10', x + 2, y + 1, 1, 3); }   // owned, turned down
        else { const nxt = k === o && canAfford(u.id) && Math.floor(tt / 16) % 2; rect(nxt ? '#ffd27a' : '#000', x, y - 1, 5, 7); rect('#3a2028', x + 1, y, 3, 5); }
      }
    });
    // the detail panel
    const u = L[Math.min(cur, L.length - 1)], o = own(u.id), a = act(u.id), mx = maxOf(u), lv = lvl(u.id), P = PAN;
    rect('#000', P.x - 1, P.y - 1, P.w + 2, P.h + 2); rect(u.kind === 2 ? '#e8302a' : u.kind ? '#30c0b0' : '#c98f22', P.x, P.y, P.w, P.h); rect('#1a0a12', P.x + 1, P.y + 1, P.w - 2, P.h - 2);
    icon(u.id, P.x + 5, P.y + 5, 2, tt);
    text(u.name, P.x + 25, P.y + 6, '#ffe680', 1, '#000');
    if (u.kind === 2) text('SECRET   ' + (o ? (a ? 'ON' : 'OFF') : 'NOT BOUGHT'), P.x + 25, P.y + 14, '#ff8a6a', 1, null);
    else text((u.kind ? 'ACTIVE' : 'PASSIVE') + '   LEVEL ' + lv + '/' + MAX, P.x + 25, P.y + 14, lv > MAX ? '#ff8a6a' : u.kind ? '#94e0cc' : '#9ac8a0', 1, null);
    let y = P.y + 27;
    const pitch = u.kind === 2 && !o;   // the secret, not bought yet: say what it does
    text(pitch ? 'WHAT IT DOES' : lv > MAX ? 'NOW (SIX BAGS)' : a < o && mx > 1 ? 'NOW (TURNED DOWN FROM ' + o + ')' : 'NOW', P.x + 6, y, '#ffd27a', 1, null); y += 9;
    for (const l of wrap(pitch ? u.say() : a ? u.say(lv) : o ? 'TURNED OFF. RIGHT TURNS IT BACK ON.' : 'NOT BOUGHT YET.', 31)) { text(l, P.x + 6, y, a || pitch ? '#fff6d4' : '#a08890', 1, null); y += 8; }
    y += 4;
    const nx = o < mx ? (u.kind === 2 ? u.say() : u.say(o + 1)) : u.kind === 2 ? 'NOTHING. SIX IS THE HIGHEST NOW.' : rv && own('six') ? (lv > MAX ? 'NOTHING. SIX IS THE HIGHEST NOW.' : 'LEVEL 6 COMES WITH SIX BAGS ON.') : 'NOTHING. FIVE IS THE HIGHEST.';
    if (!(u.kind === 2 && !o)) {   // the secret's own text is all in NOW until it's bought
      text(o < mx && u.kind !== 2 ? 'NEXT: LEVEL ' + (o + 1) : 'NEXT', P.x + 6, y, '#ffd27a', 1, null); y += 9;
      for (const l of wrap(nx, 31)) { text(l, P.x + 6, y, o < mx ? '#cfc6bc' : '#a08890', 1, null); y += 8; }
    }
    const B = BUY, ok = canAfford(u.id), max = o >= mx, hb = ok && !max ? Math.round(Math.abs(Math.sin(tt / 10))) : 0;
    rect('#000', B.x, B.y, B.w, B.h); rect(max ? '#3a2a30' : ok ? '#c98f22' : '#5a2430', B.x + 1, B.y + 1, B.w - 2, B.h - 2);
    if (max) text(u.kind === 2 ? "TIM'S CALL" : 'MAXED OUT', B.x + B.w / 2, B.y + 5, '#c8b8c0', 1, null, 'center');
    else {
      const cost = UNL ? 'FREE' : String(priceOf(u, o)), ink = ok ? '#2a0e1a' : '#d8a0a0';
      text((DD.padUsed ? 'CROSS: ' : 'JUMP: ') + (u.kind === 2 ? 'BUY SIX BAGS' : 'BUY LEVEL ' + (o + 1)), B.x + 6, B.y + 5 - hb, ink, 1, null);
      text(cost, B.x + B.w - 6, B.y + 5 - hb, ok ? '#2a0e1a' : '#ff9090', 1, null, 'right');
      icon('rewards', B.x + B.w - 6 - cost.length * 4 - 10, B.y + 3 - hb, 1);
    }
    // coins in flight
    for (const f of fly) { if (f.t < 0) continue; const k = f.t / f.d, e = k * k * (3 - 2 * k), arc = Math.sin(k * Math.PI) * 14; rect('#000', f.x0 + (f.x1 - f.x0) * e - 1, f.y0 + (f.y1 - f.y0) * e - arc - 1, 4, 4); rect('#ffd27a', f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e - arc, 2, 2); }
    // footer
    rect('#0a0408', 0, 149, VW, 11);
    if (msgT > 0) text(msg, VW / 2, 152, msg.startsWith('NEED') || msg.endsWith('MAXED OUT') ? '#ff8080' : '#ffe680', 1, null, 'center');
    else text(TIPS[tip], VW / 2, 152, '#9a8a90', 1, null, 'center');
    text(DD.padUsed ? 'CROSS: BUY   LEFT/RIGHT: DOWN/UP   R1: CASINO   CIRCLE: ' + label : 'JUMP: BUY   LEFT/RIGHT: DOWN/UP   C: CASINO   X: ' + label, VW / 2, 167, '#ffd27a', 1, '#000', 'center');
  }

  window.DDStore = {
    UP, SIX, COST, MAX, perks, lvl, items, revealed, sixOn, award, icon, canBuy, open, step, draw, buy, nudge,
    own, act, setAct, reload() { load(); try { UNL = localStorage.getItem(UKEY) === '1'; } catch (e) { UNL = false; } },   // after LOAD / CLEAR DATA
    get pts() { return S.pts; }, get earned() { return S.earned; },
    bank(n) { if (!UNL) { S.pts = Math.max(0, S.pts + n); save(); } }, poor() { poorT = 14; }, get backLabel() { return label; }, get tab() { return tab; }, set tab(v) { tab = v ? 1 : 0; },   // the casino's stakes and pay-outs
    get unlimited() { return UNL; }, setUnlimited, get back() { return back; }, get cur() { return cur; }, set cur(i) { cur = i; },
  };
})();
