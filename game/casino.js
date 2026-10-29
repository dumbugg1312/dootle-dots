// The HEI casino, LUCKY SEASON 7: the store's second tab (C / R1 or click the tab). S7E07 was Tim's "special casino themed episode".
// Four games bet real HEI Points: LUCKY SEVEN slots (3 reels, 5 lines, the game's own sprites, the blue card is the WILD CARD),
// IN THE MONEY and LUCKY DIP scratchers (Tim's S7E07 ticket paid $1000; the S7E02 lucky dip), roulette (single zero; BET THE VFA goes
// all in) and blackjack (Gregg deals; beat him three hands straight and he walks off, as he did in S7E07, and Tim deals).
// Payback sits a little under break-even (tests/casino.js). UNLIMITED HEI POINTS: everything still plays, free, and pays nothing.
// Broke? Beat any stage and Tim has a free IN THE MONEY ticket waiting. Lines and clip sources: design/lines/casino.md (clips CAS1-10).
// The store runs the header and calls step / draw / drawTop here while its CASINO tab is up.
(function () {
  const VW = DD.VW, VH = DD.VH, text = DD.text, SFX = DD.SFX, ctx = DD.ctx, tone = DD.tone, noise = DD.noise, spr = DD.spr;
  const ST = () => window.DDStore;
  const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const inR = (c, x, y, w, h) => c && c.x >= x && c.x < x + w && c.y >= y && c.y < y + h;
  const rainbow = (k, tt) => 'hsl(' + Math.round((tt * 6 + k * 45) % 360) + ',90%,64%)';
  const mod = (a, n) => ((a % n) + n) % n;
  const M = { rng: Math.random };   // the pure game math (tests/casino.js swaps rng)
  const rnd = n => Math.floor(M.rng() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const BETS = [5, 10, 25, 50, 100];

  // ================================================================ the math
  // ---- LUCKY SEVEN: real reel strips, so payback is exact (every stop combination is counted in the test)
  const SYM = ['kernel', 'pop', 'cup', 'tub', 'vhs', 'gregg', 'tim', 'boss', 'seven', 'wild'];
  const KER = 0, BOSS = 7, SEV = 8, WILD = 9;
  const PAY3 = [5, 8, 10, 14, 20, 30, 30, 80, 150, 300];   // three on a line, in line bets (bet / 5)
  const PAY77 = 6, PAYPOP = 3, PAYHOST = 12;   // two sevens from the left; ANY POPCORN (kernels and bags mixed); ON CINEMA (Tim and Gregg mixed)
  const COUNTS = [[7, 6, 5, 4, 3, 3, 3, 1, 2, 2], [7, 6, 5, 4, 3, 3, 3, 1, 2, 2], [7, 6, 5, 4, 3, 3, 3, 1, 1, 2]];
  function seeded(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const STRIPS = COUNTS.map((cs, r) => {   // spread each symbol out so no reel clumps
    const g = seeded(77 + r * 7), a = []; cs.forEach((n, k) => { for (let i = 0; i < n; i++) a.push(k); });
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(g() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (let pass = 0; pass < 20; pass++) for (let i = 0; i < a.length; i++) { const j = (i + 1) % a.length; if (a[i] === a[j]) { const k = (i + 3 + Math.floor(g() * (a.length - 4))) % a.length; [a[j], a[k]] = [a[k], a[j]]; } }
    return a;
  });
  const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];   // rows: 0 top, 1 middle, 2 bottom
  const LINE_COL = ['#ffe680', '#ff7a5a', '#6ad0ff', '#9aff7a', '#ff8ae0'];
  const cellOf = (r, s, row) => STRIPS[r][mod(s + 1 - row, STRIPS[r].length)];   // stop s sits in the middle row; the row above shows s + 1
  function lineWin(a, b, c) {   // [symbol, line-bet multiple, how many count] or null. Wild stands in for anything but the boss
    if (a === WILD && b === WILD && c === WILD) return [WILD, PAY3[WILD], 3];
    if (a === BOSS || b === BOSS || c === BOSS) return a === BOSS && b === BOSS && c === BOSS ? [BOSS, PAY3[BOSS], 3] : null;
    const tg = [a, b, c].find(x => x !== WILD);
    if ([a, b, c].every(x => x === WILD || x === tg)) return [tg, PAY3[tg], 3];
    if ([a, b, c].every(x => x === WILD || x <= 1)) return [1, PAYPOP, 3];
    if ([a, b, c].every(x => x === WILD || x === 5 || x === 6)) return [5, PAYHOST, 3];
    if ((a === SEV || a === WILD) && (b === SEV || b === WILD)) return [SEV, PAY77, 2];
    return null;
  }
  function slotEval(stops) {   // -> { grid, wins: [{ line, sym, mult, n }], mult } (mult in line bets)
    const grid = [0, 1, 2].map(r => [0, 1, 2].map(row => cellOf(r, stops[r], row)));
    const wins = []; LINES.forEach((L, li) => { const w = lineWin(grid[0][L[0]], grid[1][L[1]], grid[2][L[2]]); if (w) wins.push({ line: li, sym: w[0], mult: w[1], n: w[2] }); });
    return { grid, wins, mult: wins.reduce((s, w) => s + w.mult, 0) };
  }
  M.slotEval = slotEval; M.STRIPS = STRIPS; M.lineWin = lineWin;

  // ---- scratchers: the prize is drawn first, then the ticket is dealt to show it
  const TIX = [
    { id: 'money', name: 'IN THE MONEY', price: 10, top: 1000, amts: [5, 10, 20, 50, 100, 1000],
      odds: [[1000, 1 / 1500], [100, 1 / 100], [50, 1 / 30], [20, 1 / 8], [10, 1 / 4.5], [5, 1 / 6]] },
    { id: 'dip', name: 'LUCKY DIP', price: 25, top: 500, syms: ['pop', 'tub', 'vhs', 'cup', 'kernel', 'card'],
      odds: [[500, 1 / 500], [250, 1 / 100], [100, 1 / 20], [50, 1 / 6], [25, 1 / 4]] },
  ];
  function drawPrize(odds) { let r = M.rng(); for (const [p, q] of odds) { if (r < q) return p; r -= q; } return 0; }
  function moneyTicket() {
    const T = TIX[0], p = drawPrize(T.odds), cells = [], cnt = {};
    if (p) for (let i = 0; i < 3; i++) cells.push(p);
    if (p) cnt[p] = 3;
    if (!p && M.rng() < 0.45) { cells.push(1000, 1000); cnt[1000] = 2; }   // so close: two of the top prize
    while (cells.length < 9) { const a = T.amts[rnd(T.amts.length)]; if ((cnt[a] | 0) >= 2 || a === p) continue; cnt[a] = (cnt[a] | 0) + 1; cells.push(a); }
    return { kind: 0, prize: p, cells: shuffle(cells) };
  }
  function dipTicket() {
    const T = TIX[1], p = drawPrize(T.odds), dip = T.syms[rnd(T.syms.length)], others = T.syms.filter(s => s !== dip), decoy = [25, 50, 100, 250, 500, 25, 50];
    const spots = []; for (let i = 0; i < 6; i++) spots.push({ sym: others[rnd(others.length)], prize: decoy[rnd(decoy.length)] });
    if (p) spots[rnd(6)] = { sym: dip, prize: p };
    return { kind: 1, prize: p, dip, spots };
  }
  M.moneyTicket = moneyTicket; M.dipTicket = dipTicket; M.TIX = TIX;

  // ---- roulette: single zero, European wheel order
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const numCol = n => n === 0 ? '#1a8a3a' : REDS.has(n) ? '#c8202c' : '#1a1418';
  function rouletteWins(bet, n) {   // bet key -> returns (stake included) when n comes up, 0 if it loses
    if (/^n\d+$/.test(bet)) return +bet.slice(1) === n ? 36 : 0;
    if (n === 0) return 0;
    const col = 3 - ((n - 1) % 3);   // 1 top row ... matches the board
    return ({ red: REDS.has(n), black: !REDS.has(n), odd: n % 2 === 1, even: n % 2 === 0, low: n <= 18, high: n >= 19 })[bet] ? 2
      : bet === 'd1' && n <= 12 || bet === 'd2' && n > 12 && n <= 24 || bet === 'd3' && n > 24 ? 3
      : bet === 'c' + col ? 3 : 0;
  }
  M.rouletteWins = rouletteWins;

  // ---- blackjack: six decks, dealer stands on all 17s, blackjack pays 3 to 2, double on any two cards
  const RANK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const cardV = c => c.r === 0 ? 1 : Math.min(10, c.r + 1);
  function handV(h) { let v = 0, ace = false; for (const c of h) { if (c.hide) continue; v += cardV(c); if (c.r === 0) ace = true; } const soft = ace && v <= 11; return { v: soft ? v + 10 : v, soft }; }
  const isBJ = h => h.length === 2 && handV(h.map(c => Object.assign({}, c, { hide: false }))).v === 21;
  function newShoe() { const s = []; for (let d = 0; d < 6; d++) for (let su = 0; su < 4; su++) for (let r = 0; r < 13; r++) s.push({ r, s: su }); return shuffle(s); }
  M.handV = handV; M.isBJ = isBJ; M.newShoe = newShoe;

  // ================================================================ the save: stats, and the free ticket for the broke
  const CKEY = 'dootledots.casino.v1';
  let C; function cload() { try { C = JSON.parse(localStorage.getItem(CKEY)) || {}; } catch (e) { C = {}; } C = Object.assign({ big: 0, best: 0, streak: 0, net: 0, rounds: 0, seen: 0, brokeAt: -1 }, C); }
  const csave = () => { try { localStorage.setItem(CKEY, JSON.stringify(C)); } catch (e) {} };
  cload();
  const unl = () => !!(ST() && ST().unlimited), pts = () => ST() ? ST().pts : 0;
  const freeTix = () => !unl() && C.brokeAt >= 0 && ST() && ST().earned > C.brokeAt;

  // ================================================================ shared juice: voice, coins, banner, shake, messages
  let t = 0, scr = 'lobby', lc = 0, bi = 1, msg = '', msgT = 0, shake = 0, banner = null, coins = [], spark = [], sessOpen = false;
  const say = (s, n = 100) => { msg = s; msgT = n; };
  let vAud = null, vAt = -99; const vLast = {};
  function vo(f, cool = 45) {   // a voice clip from game/voice, spaced out so the casino never nags
    const now = performance.now() / 1000;
    if ((window.DDVoice && window.DDVoice.on === false) || now - vAt < 3 || now - (vLast[f] ?? -999) < cool) return;
    vLast[f] = now; vAt = now;
    try { if (vAud) vAud.pause(); const a = new Audio('voice/' + f); a.volume = 0.95 * (window.DDVol ? window.DDVol.get('voice') : 1); a.play().catch(() => {}); vAud = a; if (window.DDMusic) window.DDMusic.duck(2.5); } catch (e) {}
  }
  const BAL = { x: VW - 58, y: 6 };
  function flyCoins(x, y, n, spread = 6) { n = Math.max(1, Math.min(40, n)); for (let k = 0; k < n; k++) coins.push({ x0: x + (Math.random() - 0.5) * spread, y0: y + (Math.random() - 0.5) * spread, t: -k * 2, d: 20 + rnd(8), k }); }
  function fountain(x, y, n) { for (let k = 0; k < n; k++) spark.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3.5, t: 0, life: 50 + rnd(30), c: Math.random() < 0.8 ? '#ffd27a' : '#fff6d4' }); }
  function take(n) {   // pay a stake: false (and a buzz) when short
    if (unl()) return true;
    if (pts() < n) { say('NEED ' + (n - pts()) + ' MORE HEI POINTS', 90); SFX.buzz(); if (ST().poor) ST().poor(); return false; }
    ST().bank(-n); return true;
  }
  function give(n, x, y) { if (n <= 0) return; if (!unl()) ST().bank(n); flyCoins(x, y, Math.ceil(n / 5)); }
  function settle(stake, back, big) {   // a finished round: records and the broke check. big: a loss worth a sigh
    C.rounds++;
    if (!unl()) {
      C.net += back - stake;
      if (back > C.big) { if (C.big > 0 && back >= 50) setTimeout(() => say('NEW BIGGEST WIN: ' + back, 150), 900); C.big = back; }
      if (back > stake) { C.streak++; C.best = Math.max(C.best, C.streak); } else if (back < stake) C.streak = 0;
      if (pts() < BETS[0] && C.brokeAt < 0) { C.brokeAt = ST().earned; setTimeout(() => say('OUT OF HEI POINTS. BEAT A STAGE AND TIM HAS A FREE TICKET.', 240), 1200); vo('CAS4.mp3', 0); }
      else if (big && back < stake) vo('CAS4.mp3', 90);
    }
    csave();
  }
  function bannerUp(s, col, size = 2, n = 110) { banner = { s, col, size, t: 0, n }; }
  const jingle = (notes, gap = 0.07, type = 'square', v = 0.05) => notes.forEach((f, i) => tone(f, f, gap * 1.6, type, v, i * gap));
  function winSound(x) {   // x: how many times the stake came back
    if (x >= 20) { jingle([523, 659, 784, 1046, 784, 1046, 1318, 1568, 1318, 1568, 2093], 0.08); noise(0.5, 0.05, 3000, 0.2); }
    else if (x >= 5) jingle([523, 659, 784, 1046, 1318, 1568], 0.07);
    else if (x >= 1.5) jingle([659, 784, 1046], 0.07);
    else jingle([784, 988], 0.06, 'triangle');
  }
  function tier(back, stake, x, y, jackpot) {   // the payoff: banner, sound, coins, shake by how big
    const k = back / stake;
    if (back <= 0) return;
    winSound(k);
    if (jackpot) { bannerUp(jackpot, 'rain', 3, 200); shake = 30; fountain(x, y, 70); }
    else if (k >= 10) { bannerUp('BIG WIN! +' + back, 'rain', 2, 160); shake = 18; fountain(x, y, 45); }
    else if (k >= 1.5) { bannerUp('WIN +' + back, '#ffe680', 2, 100); fountain(x, y, 12); }
    else bannerUp(back === stake ? 'STAKE BACK +' + back : '+' + back, '#fff6d4', 1, 80);
  }

  // ================================================================ drawing pieces
  const SPR = { kernel: ['kernel', 2], pop: ['pop', 2], cup: ['cup', 1], tub: ['tub', 1], vhs: ['vhs', 1], gregg: ['portrait_gregg', 1], tim: ['portrait_tim', 1], card: ['card', 0.75] };
  const BOSSES = [['w10_portrait_rat', 10], ['w11_portrait_new', 11], ['w12_portrait_amato', 12]];
  if (DD.loadSprites) DD.loadSprites(['kernel', 'pop', 'cup', 'tub', 'vhs', 'portrait_gregg', 'portrait_tim', 'card', 'gregg', 'tim', 'w10_portrait_rat', 'w11_portrait_new', 'w12_portrait_amato']);
  function sym(k, cx, cy, s = 1, alpha = 1, face = 0, tt = 0) {   // a slot symbol centred on cx, cy
    const n = SYM[k];
    if (n === 'seven') { const sz = Math.max(1, Math.round(4 * s)); text('7', cx - 1.5 * sz + 1, cy - 2.5 * sz, alpha < 1 ? '#a04040' : '#e8302a', sz, alpha < 1 ? null : '#ffd27a'); return; }
    if (n === 'wild') { spr('card', cx, cy + 5 * s, false, 0.8 * s, 0.8 * s * 1.6, 0, alpha); if (s >= 0.9) text('WILD', cx, cy + 6, rainbow(0, tt), 1, '#10202a', 'center'); return; }
    if (n === 'boss') { const b = BOSSES[face % 3]; spr(b[0], cx, cy + 12 * s, false, s, s, 0, alpha); return; }
    const [im, sc] = SPR[n]; spr(im, cx, cy + (n === 'pop' ? 10 : n === 'kernel' ? 13 : 12) * s * (sc > 1 ? 1 : 1), false, sc * s, sc * s, 0, alpha);
  }
  function chip(x, y, amt, r = 5) {
    const col = amt >= 1000 ? '#e8b030' : amt >= 100 ? '#262028' : amt >= 50 ? '#2a5ad8' : amt >= 25 ? '#1a9a4a' : amt >= 10 ? '#d8202c' : '#f0ece4';
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y + 1, r, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = amt >= 100 && amt < 1000 ? '#e8c060' : '#fff'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; ctx.fillRect(Math.round(x + Math.cos(a) * (r - 1.5)) - 1, Math.round(y + Math.sin(a) * (r - 1.5)) - 1, 2, 2); }
  }
  const SUIT = [['..x..', '.xxx.', 'xxxxx', '..x..', '.xxx.'], ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'], ['..x..', '.xxx.', 'xxxxx', '.xxx.', '..x..'], ['.xxx.', 'x.x.x', 'xxxxx', '..x..', '.xxx.']];
  const suit = (s, x, y, col, sc = 1) => { ctx.fillStyle = col; SUIT[s].forEach((row, r) => { for (let c = 0; c < 5; c++) if (row[c] === 'x') ctx.fillRect(x + c * sc, y + r * sc, sc, sc); }); };
  function card(c, x, y, flip = 1) {   // 18 x 26; flip (0-1) squeezes it for the turn-over
    const w = Math.max(1, Math.round(18 * Math.abs(flip))), ox = x + (18 - w) / 2;
    rect('#000', ox - 1, y - 1, w + 2, 28);
    if (c.hide || flip < 0) { rect('#a8202a', ox, y, w, 26); if (w > 12) { rect('#e8b030', ox + 2, y + 2, w - 4, 1); rect('#e8b030', ox + 2, y + 23, w - 4, 1); text('HEI', ox + w / 2, y + 11, '#e8b030', 1, null, 'center'); } return; }
    rect('#fff8ec', ox, y, w, 26); if (w < 14) return;
    const red = c.s === 1 || c.s === 2, col = red ? '#d8202c' : '#1a1418';
    text(RANK[c.r], ox + 2, y + 2, col, 1, null); suit(c.s, ox + 2, y + 8, col);
    suit(c.s, ox + 6, y + 13, col, 2);
  }
  function wheel(cx, cy, r, ang, ball, tt) {   // ball: { a (absolute), rr } or null
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy + 2, r + 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a3a18'; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#c98f22'; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, 7); ctx.fill();
    const n = WHEEL.length, da = Math.PI * 2 / n;
    for (let i = 0; i < n; i++) { ctx.fillStyle = numCol(WHEEL[i]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang + i * da - da / 2, ang + i * da + da / 2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, 7); ctx.fill();
    ctx.fillStyle = '#c98f22'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c060'; for (let k = 0; k < 4; k++) { const a = ang * 1 + k * Math.PI / 2; ctx.fillRect(Math.round(cx + Math.cos(a) * r * 0.3) - 1, Math.round(cy + Math.sin(a) * r * 0.3) - 1, 3, 3); }
    ctx.fillStyle = '#fff6d4'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 7); ctx.fill();
    if (ball) { const bx = cx + Math.cos(ball.a) * ball.rr, by = cy + Math.sin(ball.a) * ball.rr; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bx + 0.5, by + 1, 2.2, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by, 2, 0, 7); ctx.fill(); }
  }
  function felt(c1, c2) { rect(c1, 0, 15, VW, VH - 15); for (let y = 15; y < VH; y += 10) for (let x = (y / 10) % 2 ? 0 : 10; x < VW; x += 20) rect(c2, x + 4, y + 3, 4, 4); }
  function btn(x, y, w, h, label, lit, col = '#c98f22', dis = false) {
    rect('#000', x, y, w, h); rect(dis ? '#3a2a30' : lit ? col : '#3a1420', x + 1, y + 1, w - 2, h - 2);
    if (lit && !dis) rect('rgba(255,255,255,0.25)', x + 1, y + 1, w - 2, 1);
    text(label, x + w / 2, y + (h - 5) / 2, dis ? '#7a6a70' : lit ? '#2a0e1a' : '#ffd27a', 1, null, 'center');
  }
  function wrapT(s, n) { const out = []; let line = ''; for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }
  function bubble(s, x, y, w, tail) { const L = wrapT(s, Math.floor((w - 6) / 4)), h = L.length * 7 + 5; rect('#000', x - 1, y - 1, w + 2, h + 2); rect('#fff6d4', x, y, w, h); if (tail) { rect('#000', x - 4, y + 4, 4, 3); rect('#fff6d4', x - 3, y + 5, 3, 1); } L.forEach((l, i) => text(l, x + 3, y + 3 + i * 7, '#2a0e1a', 1, null)); }
  function betBox(x, y, lit) {   // BET with up / down arrows (clickable); the stake used by slots and blackjack
    rect('#000', x, y, 54, 26); rect('#1a0a12', x + 1, y + 1, 52, 24);
    text('BET', x + 27, y + 3, '#9a8a90', 1, null, 'center'); text(String(BETS[bi]), x + 27, y + 12, lit ? '#ffe680' : '#fff6d4', 2, '#000', 'center');
    text('<', x + 5, y + 14, bi > 0 ? '#ffd27a' : '#4a3a40', 1, null); text('>', x + 46, y + 14, bi < BETS.length - 1 ? '#ffd27a' : '#4a3a40', 1, null);
  }
  function betClick(c, x, y) { if (inR(c, x, y + 8, 18, 18)) { bump(-1); return true; } if (inR(c, x + 36, y + 8, 18, 18)) { bump(1); return true; } return false; }
  function bump(d) { const n = Math.max(0, Math.min(BETS.length - 1, bi + d)); if (n !== bi) { bi = n; SFX.tick(); } else SFX.buzz(); }

  // ================================================================ the lobby
  const GAMES = [{ id: 'slots', name: 'LUCKY SEVEN', sub: 'SLOTS. BET 5-100' }, { id: 'scratch', name: 'SCRATCHERS', sub: 'IN THE MONEY' }, { id: 'roul', name: 'ROULETTE', sub: 'ONE ZERO' }, { id: 'bj', name: 'BLACKJACK', sub: 'PAYS 3 TO 2' }];
  const CAB = i => ({ x: 12 + i * 75, y: 56, w: 70, h: 84 });
  function enter(id) {
    scr = id; t = 0; SFX.switch(); banner = null;
    if (id === 'slots') { S.state = 'idle'; }
    if (id === 'scratch') { K.state = 'pick'; if (freeTix()) say('FREE TICKET! TIM PICKED ONE UP ON THE WAY IN.', 200); }
    if (id === 'roul') { R.state = 'bet'; }
    if (id === 'bj') { B.state = 'bet'; B.dealer = 'gregg'; B.dx = 0; B.wins = 0; B.say = 'THE BUFF DEALS. PLACE YOUR BET.'; B.sayT = 200; B.P = []; B.D = []; }
  }
  function lobbyStep(IN, c) {
    if (IN.nx) { lc = mod(lc + IN.nx, GAMES.length); SFX.tick(); }
    if (c) { for (let i = 0; i < GAMES.length; i++) { const R0 = CAB(i); if (inR(c, R0.x, R0.y, R0.w, R0.h)) { if (lc === i) enter(GAMES[i].id); else { lc = i; SFX.tick(); } return; } } }
    else if (IN.ok) enter(GAMES[lc].id);
    if (IN.back) return 'back';
  }
  function marquee(x, y, w, h, tt, sp = 4) {   // a row of chasing bulbs round a box
    const per = 2 * (w + h), n = Math.floor(per / 6);
    for (let i = 0; i < n; i++) {
      let d = i * 6, bx, by; if (d < w) { bx = x + d; by = y; } else if ((d -= w) < h) { bx = x + w; by = y + d; } else if ((d -= h) < w) { bx = x + w - d; by = y + h; } else { d -= w; bx = x; by = y + h - d; }
      const on = (i + Math.floor(tt / sp)) % 3 === 0; rect(on ? '#fff6c0' : '#8a5a1c', bx - 1, by - 1, 2, 2);
    }
  }
  function lobbyDraw(tt) {
    felt('#4a0a14', '#560e1a');
    rect('#000', 98, 17, 124, 35); rect('#1a0408', 99, 18, 122, 33); marquee(100, 19, 120, 31, tt);
    text('CASINO', VW / 2, 23, Math.floor(tt / 30) % 4 ? '#ff4a3a' : '#ffe680', 3, '#4a0408', 'center');
    text('LUCKY SEASON 7', VW / 2, 42, Math.floor(tt / 20) % 2 ? '#ffe680' : '#fff6d4', 1, null, 'center');
    for (let k = 0; k < 5; k++) { chip(70, 46 - k * 2, [5, 10, 25, 50, 100][k], 6); chip(250, 46 - k * 2, [100, 50, 25, 10, 5][k], 6); }
    GAMES.forEach((g, i) => {
      const R0 = CAB(i), on = i === lc, lift = on ? Math.round(Math.abs(Math.sin(tt / 12)) * 2) : 0, x = R0.x, y = R0.y - lift;
      rect('#000', x - 1, y - 1, R0.w + 2, R0.h + 2); rect(on ? '#c98f22' : '#5a3a2a', x, y, R0.w, R0.h); rect('#1a0a12', x + 2, y + 2, R0.w - 4, R0.h - 4);
      if (on) marquee(x + 1, y + 1, R0.w - 2, R0.h - 2, tt, 3);
      text(g.name, x + R0.w / 2, y + 6, on ? '#ffe680' : '#e8d0b0', 1, null, 'center');
      const sx = x + 7, sy = y + 15, sw = R0.w - 14, sh = 46;
      rect('#000', sx - 1, sy - 1, sw + 2, sh + 2); rect('#0a0408', sx, sy, sw, sh);
      ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
      if (g.id === 'slots') { for (let r = 0; r < 3; r++) { rect('#fff6e8', sx + 2 + r * 19, sy + 3, 17, 40); const p = on ? tt * (0.15 + r * 0.04) : r * 3 + 2; for (let k = -1; k <= 1; k++) { const idx = Math.floor(p) + k, yy = sy + 23 - (k - (p - Math.floor(p))) * 14; sym(STRIPS[r][mod(idx, STRIPS[r].length)], sx + 10 + r * 19, yy, 0.5, 1, idx, tt); } } rect('rgba(232,48,42,0.7)', sx, sy + 22, sw, 1); }
      else if (g.id === 'scratch') { rect('#1e7a3a', sx + 4, sy + 4, sw - 8, sh - 8); text('IN THE', sx + sw / 2, sy + 7, '#ffe680', 1, null, 'center'); text('MONEY', sx + sw / 2, sy + 14, '#ffe680', 1, null, 'center'); for (let k = 0; k < 3; k++) { rect('#b8b8c4', sx + 8 + k * 14, sy + 24, 12, 12); } const cx2 = sx + 8 + ((tt * 0.8) % 42); if (on) { rect('#d8d8e0', sx + 8, sy + 24, Math.min(40, (tt * 0.8) % 42), 12); text('1000', sx + 28, sy + 27, '#1e7a3a', 1, null, 'center'); ctx.fillStyle = '#e8b030'; ctx.beginPath(); ctx.arc(cx2, sy + 30 + Math.sin(tt / 3) * 3, 4, 0, 7); ctx.fill(); } }
      else if (g.id === 'roul') wheel(sx + sw / 2, sy + sh / 2, 18, on ? tt * 0.06 : 0.3, { a: on ? -tt * 0.11 : 2, rr: 15 }, tt);
      else { card({ r: 0, s: 0 }, sx + 9, sy + 10); card({ r: 12, s: 1 }, sx + 25, sy + 13); if (on) text('21', sx + sw - 5, sy + 4, rainbow(0, tt), 1, null, 'right'); }
      ctx.restore();
      text(g.sub, x + R0.w / 2, y + 64, '#9a8a90', 1, null, 'center');
      if (on) text(DD.padUsed ? 'CROSS: PLAY' : 'JUMP: PLAY', x + R0.w / 2, y + 74, Math.floor(tt / 16) % 2 ? '#ffd27a' : '#fff6d4', 1, null, 'center');
    });
    const net = C.net, nt = unl() ? 'UNLIMITED: JUST FOR FUN' : 'BIGGEST WIN ' + C.big + '   BEST STREAK ' + C.best + '   YOU VS THE HOUSE ' + (net > 0 ? '+' : '') + net;
    text(nt, VW / 2, 143, net < 0 && !unl() ? '#c8a0a8' : '#9ac8a0', 1, null, 'center');
  }

  // ================================================================ LUCKY SEVEN
  const S = { state: 'idle', pos: [3, 9, 15], spd: [0, 0, 0], st: ['done', 'done', 'done'], to: [0, 0, 0], from: [0, 0, 0], lt: [0, 0, 0], ln: [1, 1, 1], at: [0, 0, 0], stops: [3, 9, 15], tease: false, res: null, bet: 5, face: 0, lever: 99, show: 0, shown: 0, tickAt: 0 };
  const CELL = 28, RX = r => 126 + r * 34, RY = 86;
  function spin() {
    const bet = BETS[bi]; if (!take(bet)) return;
    S.bet = bet; S.face = rnd(3); S.state = 'spin'; S.tease = false; S.res = null; S.lever = 0; S.show = 0; banner = null;
    S.stops = [0, 1, 2].map(r => rnd(STRIPS[r].length));
    for (let r = 0; r < 3; r++) { S.st[r] = 'spin'; S.spd[r] = 0.2; S.at[r] = t + 34 + r * 14; }
    noise(0.12, 0.05, 900); tone(220, 440, 0.18, 'square', 0.04);
  }
  function land(r) {
    const L = STRIPS[r].length, base = Math.floor(S.pos[r]) + 3;
    S.from[r] = S.pos[r]; S.to[r] = base + mod(S.stops[r] - base, L); S.lt[r] = 0; S.ln[r] = Math.round(8 + (S.to[r] - S.from[r]) * 0.9); S.st[r] = 'land';
  }
  const backOut = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  function teaseCheck() {   // two reels down: could the third make a big line? then it crawls
    return LINES.some(L => { const a = cellOf(0, S.stops[0], L[0]), b = cellOf(1, S.stops[1], L[1]); const hi = x => x === SEV || x === WILD || x === BOSS || x >= 5; return hi(a) && hi(b) && (a === b || a === WILD || b === WILD); });
  }
  function slotsStep(IN, c) {
    if (S.lever < 99) S.lever++;
    if (S.state === 'spin') {
      let tick = false;
      for (let r = 0; r < 3; r++) {
        if (S.st[r] === 'spin') { const top = r === 2 && S.tease ? 0.42 : 0.95; S.spd[r] += (top - S.spd[r]) * 0.12; const p0 = Math.floor(S.pos[r]); S.pos[r] += S.spd[r]; if (Math.floor(S.pos[r]) !== p0) tick = true; if (t >= S.at[r]) land(r); }
        else if (S.st[r] === 'land') {
          S.lt[r]++; const k = Math.min(1, S.lt[r] / S.ln[r]); S.pos[r] = S.from[r] + (S.to[r] - S.from[r]) * backOut(k);
          if (k >= 1) {
            S.pos[r] = S.to[r]; S.st[r] = 'done'; S.spd[r] = 0;
            tone(140, 90, 0.08, 'square', 0.07); noise(0.05, 0.06, 500); shake = Math.max(shake, 2);
            if (r === 1 && S.st[2] === 'spin' && teaseCheck()) { S.tease = true; S.at[2] = t + 64; if (window.DDMusic) window.DDMusic.duck(1.6); }
          }
        }
      }
      if (S.tease && S.st[2] === 'spin' && t % 4 === 0) { const k = 1 - (S.at[2] - t) / 64; tone(300 + k * 700, 300 + k * 720, 0.05, 'triangle', 0.035); }
      if (tick && t - S.tickAt > 1) { S.tickAt = t; tone(1500, 1500, 0.015, 'square', 0.012); }
      if (IN.ok || (c && (inR(c, 254, 112, 60, 22) || inR(c, 248, 30, 16, 70) || inR(c, 100, 50, 106, 90)))) for (let r = 0; r < 3; r++) if (S.st[r] === 'spin') S.at[r] = Math.min(S.at[r], t + 1 + r * 3);   // slam the stops
      if (S.st.every(s => s === 'done')) slotsResult();
      if (IN.back) { /* finish first */ }
      return;
    }
    if (S.state === 'show') { S.show++; S.shown += (S.res.back - S.shown) * 0.12; if (Math.abs(S.res.back - S.shown) < 1) S.shown = S.res.back; if (S.show > 60 && S.show < 62) S.state = 'idle'; }
    if (IN.ny) bump(-IN.ny); if (IN.nx) bump(IN.nx);
    if (c) { if (betClick(c, 258, 40)) return; if (inR(c, 254, 112, 60, 22) || inR(c, 248, 30, 16, 70) || inR(c, 100, 50, 106, 90)) { spin(); return; } }
    else if (IN.ok) { spin(); return; }
    if (IN.back) { scr = 'lobby'; SFX.switch(); }
  }
  function slotsResult() {
    const ev = slotEval(S.stops), lineBet = S.bet / 5, back = ev.mult * lineBet;
    S.res = Object.assign(ev, { back }); S.state = 'show'; S.show = 0; S.shown = 0;
    const jack = ev.wins.some(w => w.sym === SEV && w.n === 3), wild3 = ev.wins.some(w => w.sym === WILD), boss = ev.wins.some(w => w.sym === BOSS);
    if (back > 0) {
      give(back, 160, 86);
      tier(back, S.bet, 160, 90, jack ? 'LUCKY SEVEN!' : wild3 ? 'WILD CARD!' : null);
      if (jack) vo('CAS10.mp3', 0); else if (wild3) vo('CAS7.mp3', 0);
      else if (boss) { const w = BOSSES[S.face][1], L = (window.VOICE_CLIPS || []).filter(c => c.ok && c.w === w && c.hooks && c.hooks.includes('boss_taunt') && !(c.x && c.x.length)); if (L.length) vo(L[rnd(L.length)].f, 20); bannerUp('BOSS LINE! +' + back, '#ff8a6a', 2, 140); }
      else if (ev.grid.some(col => col.includes(WILD)) && ev.wins.length && Math.random() < 0.35) vo('CAS7.mp3', 120);
    } else { tone(200, 150, 0.12, 'triangle', 0.03); if (LINES.some(L => { const a = cellOf(0, S.stops[0], L[0]), b = cellOf(1, S.stops[1], L[1]); return a === SEV && b === SEV; })) say('SO CLOSE. TWO SEVENS AND A NOTHING.', 90); }
    settle(S.bet, back, S.bet >= 50);
  }
  function slotsDraw(tt) {
    felt('#3a0810', '#44101a');
    // the pay table
    rect('#000', 3, 18, 66, 128); rect('#1a0a12', 4, 19, 64, 126); text('PAYS', 36, 22, '#ffd27a', 1, null, 'center'); text('PER LINE BET', 36, 29, '#9a8a90', 1, null, 'center');
    const ROWS = [[WILD], [SEV], [BOSS], [6], [5], [6, 5, 6, PAYHOST], [4], [3], [2], [1], [0], [0, 1, 0, PAYPOP], [SEV, SEV, -1, PAY77]];
    ROWS.forEach((row, i) => {
      const y = 36 + i * 8, ks = row.length === 1 ? [row[0], row[0], row[0]] : row.slice(0, 3), pay = row.length === 1 ? PAY3[row[0]] : row[3];
      ks.forEach((k, j) => { if (k >= 0) sym(k, 10 + j * 9, y + 3, 0.28, 1, Math.floor(tt / 40) + j, tt); else text('ANY', 24, y, '#9a8a90', 1, null); });
      text(String(pay), 64, y, row[0] === SEV ? '#ff6a4a' : row[0] === WILD ? rainbow(i, tt) : '#fff6d4', 1, null, 'right');
    });
    // the machine
    rect('#000', 89, 17, 142, 131); rect('#8a1420', 90, 18, 140, 129); rect('#c98f22', 92, 20, 136, 125); rect('#5a0a14', 94, 22, 132, 121);
    rect('#1a0408', 98, 24, 124, 18); marquee(99, 25, 122, 16, tt, 3);
    const jk = S.res && S.state === 'show' && S.res.wins.some(w => w.sym === SEV && w.n === 3);
    text('LUCKY SEVEN', 160, 29, jk ? rainbow(0, tt) : '#ffe680', 1, '#7a2a10', 'center');
    text('7', 106, 28, '#e8302a', 2, '#ffd27a'); text('7', 208, 28, '#e8302a', 2, '#ffd27a');
    rect('#000', 104, 46, 112, 88);
    ctx.save(); ctx.beginPath(); ctx.rect(105, 47, 110, 86); ctx.clip();
    for (let r = 0; r < 3; r++) {
      const x = RX(r); rect('#fff6e8', x - 15, 47, 30, 86);
      const p = S.pos[r], f = p - Math.floor(p), blur = S.st[r] === 'spin' && S.spd[r] > 0.5;
      for (let k = -2; k <= 2; k++) { const idx = Math.floor(p) + k, y = RY - (k - f) * CELL; sym(STRIPS[r][mod(idx, STRIPS[r].length)], x, y, 1, blur ? 0.45 : 1, S.face, tt); if (blur) sym(STRIPS[r][mod(idx, STRIPS[r].length)], x, y - 7, 1, 0.25, S.face, tt); }
      rect('rgba(0,0,0,0.22)', x - 15, 47, 30, 9); rect('rgba(0,0,0,0.12)', x - 15, 56, 30, 6); rect('rgba(0,0,0,0.22)', x - 15, 124, 30, 9); rect('rgba(0,0,0,0.12)', x - 15, 118, 30, 6);
      if (r < 2) rect('#5a0a14', x + 15, 47, 4, 86);
    }
    // winning lines
    if (S.res && S.state !== 'spin' && S.res.wins.length) {
      const w = S.res.wins[Math.floor(tt / 30) % S.res.wins.length], L = LINES[w.line], blink = Math.floor(tt / 6) % 2 || S.show < 30;
      if (blink) { ctx.strokeStyle = LINE_COL[w.line]; ctx.lineWidth = 2; ctx.beginPath(); for (let r = 0; r < 3; r++) { const x = RX(r), y = RY + (L[r] - 1) * CELL; if (r) ctx.lineTo(x, y); else ctx.moveTo(x - 18, y); } ctx.lineTo(RX(2) + 18, RY + (L[2] - 1) * CELL); ctx.stroke(); }
      for (let r = 0; r < w.n; r++) { const x = RX(r), y = RY + (L[r] - 1) * CELL; ctx.strokeStyle = blink ? LINE_COL[w.line] : '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - 13.5, y - 12.5, 27, 25); }
    }
    ctx.restore();
    if (S.tease && S.st[2] === 'spin') { const g = Math.floor(tt / 3) % 2; rect(g ? '#ffe680' : '#e8302a', RX(2) - 16, 46, 32, 2); rect(g ? '#ffe680' : '#e8302a', RX(2) - 16, 132, 32, 2); }
    for (let i = 0; i < 5; i++) { const L = LINES[i], lit = S.res && S.state !== 'spin' && S.res.wins.some(w => w.line === i), yl = RY + (L[0] - 1) * CELL + (i > 2 ? (i === 3 ? -6 : 6) : 0), yr = RY + (L[2] - 1) * CELL + (i > 2 ? (i === 3 ? 6 : -6) : 0); rect(lit ? LINE_COL[i] : '#3a1018', 98, yl - 2, 5, 5); rect(lit ? LINE_COL[i] : '#3a1018', 217, yr - 2, 5, 5); }
    // win meter
    rect('#000', 120, 136, 80, 10); const wv = S.state === 'show' ? Math.round(S.shown) : S.res ? S.res.back : 0;
    text('WIN ' + String(wv).padStart(4, '0'), 160, 138, wv ? (S.show < 60 ? rainbow(0, tt) : '#ffe680') : '#5a3a3a', 1, null, 'center');
    // the lever
    const k = S.lever < 24 ? Math.sin(S.lever / 24 * Math.PI) : 0, ky = 42 + k * 44;
    rect('#000', 231, 76, 10, 14); rect('#9a9aa8', 232, 77, 8, 12);
    rect('#000', 238, Math.min(ky, 82) - 1, 4, Math.abs(82 - ky) + 2); rect('#d0d0dc', 239, Math.min(ky, 82), 2, Math.abs(82 - ky));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(240, ky, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e8302a'; ctx.beginPath(); ctx.arc(240, ky, 4, 0, 7); ctx.fill(); rect('#ff9a8a', 238, ky - 2, 2, 2);
    // right panel
    betBox(258, 40, S.state !== 'spin'); text('5 LINES', 285, 70, '#9a8a90', 1, null, 'center'); text('LINE BET ' + BETS[bi] / 5, 285, 78, '#9a8a90', 1, null, 'center');
    const sp = S.state === 'spin', hb = !sp ? Math.round(Math.abs(Math.sin(tt / 10))) : 0;
    btn(254, 112 - hb, 60, 22, sp ? 'STOP' : 'SPIN', true, sp ? '#e8302a' : '#ffd27a');
  }

  // ================================================================ scratchers
  const K = { state: 'pick', pick: 0, tk: null, foil: null, fx: null, cov: null, regions: [], coin: { x: 160, y: 80 }, auto: null, done: 0, free: false };
  const TX = 85, TY = 20, TW = 150, TH = 112;
  let ptr = { down: false, x: 0, y: 0 }, upKey = false; const trail = [];   // trail: pointer points since the last frame, so a fast drag still scratches its whole path
  if (typeof addEventListener === 'function' && ctx && ctx.canvas && ctx.canvas.addEventListener) {
    const cv = ctx.canvas, at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height]; };
    cv.addEventListener('pointerdown', e => { const [x, y] = at(e); ptr = { down: true, x, y }; trail.length = 0; trail.push([x, y, 1]); });
    cv.addEventListener('pointermove', e => { const [x, y] = at(e); ptr.x = x; ptr.y = y; if (ptr.down && trail.length < 400) trail.push([x, y, 0]); });
    addEventListener('pointerup', () => { ptr.down = false; });
    addEventListener('keydown', e => { if (e.code === 'ArrowUp' || e.code === 'KeyW') upKey = true; });
    addEventListener('keyup', e => { if (e.code === 'ArrowUp' || e.code === 'KeyW') upKey = false; });
  }
  function regionsOf(tk) {   // the foil patches, in ticket coordinates
    if (tk.kind === 0) { const R0 = []; for (let i = 0; i < 9; i++) R0.push({ x: 15 + (i % 3) * 42, y: 31 + Math.floor(i / 3) * 22, w: 38, h: 19 }); return R0; }
    const R0 = [{ x: 98, y: 18, w: 40, h: 26, dip: true }]; for (let i = 0; i < 6; i++) R0.push({ x: 12 + (i % 3) * 44, y: 49 + Math.floor(i / 3) * 25, w: 40, h: 22 }); return R0;
  }
  function buyTicket(kind) {
    const T = TIX[kind], free = kind === 0 && freeTix();
    if (!free && !take(T.price)) return;
    if (free) C.brokeAt = -1;
    K.free = free; K.tk = kind === 0 ? moneyTicket() : dipTicket(); K.state = 'scratch'; K.auto = null; K.done = 0; K.stake = free ? 0 : T.price; banner = null;
    K.regions = regionsOf(K.tk).map(r => Object.assign(r, { n: 0, tot: 0, open: false }));
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const fx = cv.getContext('2d'); K.foil = cv; K.fx = fx;
    K.cov = new Uint8Array(TW * TH);
    K.regions.forEach((r, ri) => {
      fx.fillStyle = '#9a9aa8'; fx.fillRect(r.x, r.y, r.w, r.h); fx.fillStyle = '#c8c8d4'; for (let d = -r.h; d < r.w; d += 5) for (let y = 0; y < r.h; y++) { const x = d + y; if (x >= 0 && x < r.w && (y + d) % 5 < 2) fx.fillRect(r.x + x, r.y + y, 1, 1); }
      fx.fillStyle = '#e8e8f0'; for (let k = 0; k < 6; k++) fx.fillRect(r.x + 2 + rnd(r.w - 4), r.y + 2 + rnd(r.h - 4), 1, 1);
      fx.fillStyle = '#6a6a78'; fx.fillRect(r.x, r.y + r.h - 1, r.w, 1); fx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { K.cov[y * TW + x] = ri + 1; } r.tot = r.w * r.h;
    });
    K.coin = { x: TX + TW / 2, y: TY + TH + 8 };
    if (kind === 0) vo('CAS5.mp3', 60); else vo('CAS9.mp3', 60);
    noise(0.15, 0.05, 2000); tone(523, 784, 0.1, 'square', 0.04);
  }
  let scrT = 0;
  function scratchAt(x, y, rad = 4) {   // screen coords; returns true if any foil came off
    const lx = Math.round(x - TX), ly = Math.round(y - TY); let got = 0;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue; const px = lx + dx, py = ly + dy; if (px < 0 || py < 0 || px >= TW || py >= TH) continue;
      const v = K.cov[py * TW + px]; if (!v || v > 200) continue; K.cov[py * TW + px] = 255; K.regions[v - 1].n++; got++;
    }
    if (got) { K.fx.save(); K.fx.globalCompositeOperation = 'destination-out'; K.fx.beginPath(); K.fx.arc(lx, ly, rad + 0.5, 0, 7); K.fx.fill(); K.fx.restore(); if (t - scrT > 2) { scrT = t; noise(0.035, 0.04, 2500 + rnd(2500)); } if (Math.random() < 0.3) spark.push({ x, y, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5, t: 0, life: 18, c: '#c8c8d4' }); }
    K.regions.forEach((r, i) => { if (!r.open && r.n / r.tot > 0.55) openRegion(i); });
    return got > 0;
  }
  function scratchLine(x0, y0, x1, y1) { const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 2)); for (let i = 0; i <= n; i++) scratchAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); }
  function openRegion(i) {
    const r = K.regions[i]; r.open = true; r.pop = t; K.fx.clearRect(r.x, r.y, r.w, r.h);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) K.cov[y * TW + x] = 255;
    tone(880 + i * 40, 1320 + i * 40, 0.06, 'square', 0.03);
    for (let k = 0; k < 6; k++) spark.push({ x: TX + r.x + rnd(r.w), y: TY + r.y + rnd(r.h), vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), t: 0, life: 24, c: '#fff6d4' });
    if (K.regions.every(q => q.open)) K.done = t + 18;
  }
  function autoPath() {   // a zigzag over every patch still covered
    const P = []; K.regions.filter(r => !r.open).forEach(r => { for (let y = r.y + 3; y < r.y + r.h; y += 6) { const a = [TX + r.x + 2, TY + y], b = [TX + r.x + r.w - 2, TY + y]; if (((y - r.y) / 6) % 2 < 1) P.push(a, b); else P.push(b, a); } });
    return { P, i: 0, k: 0 };
  }
  function ticketResult() {
    const tk = K.tk, T = TIX[tk.kind], p = tk.prize; K.state = 'done';
    if (p > 0) { give(p, 160, 76); tier(p, Math.max(1, T.price), 160, 76, p >= T.top ? (tk.kind === 0 ? 'IN THE MONEY! +' + p : 'LUCKY DIP! +' + p) : null); if (tk.kind === 0 && p === 1000) vo('CAS6.mp3', 0); }
    else { bannerUp('NOT A WINNER', '#c8a0a8', 1, 90); tone(260, 180, 0.15, 'triangle', 0.03); }
    settle(K.stake, p, false);
  }
  function scratchStep(IN, c) {
    if (K.state === 'pick') {
      if (IN.nx) { K.pick = mod(K.pick + IN.nx, 2); SFX.tick(); }
      if (c) { for (let i = 0; i < 2; i++) if (inR(c, 30 + i * 140, 34, 120, 92)) { if (K.pick === i) buyTicket(i); else { K.pick = i; SFX.tick(); } return; } }
      else if (IN.ok) { buyTicket(K.pick); return; }
      if (IN.back) { scr = 'lobby'; SFX.switch(); }
      return;
    }
    if (K.state === 'scratch') {
      for (let i = 0; i < trail.length; i++) { const [x, y, start] = trail[i], p = i && !start ? trail[i - 1] : [x, y]; if (inR({ x, y }, TX - 6, TY - 6, TW + 12, TH + 12)) { scratchLine(p[0], p[1], x, y); K.mouse = true; K.coin.x = x; K.coin.y = y; } }
      if (trail.length) trail.splice(0, trail.length - 1);   // keep the last point to join the next frame's drag
      if (!ptr.down) trail.length = 0;
      const mx = (IN.r ? 1 : 0) - (IN.l ? 1 : 0), my = (IN.d ? 1 : 0) - (upKey ? 1 : 0);
      if ((mx || my) && !K.auto) { K.mouse = false; const x0 = K.coin.x, y0 = K.coin.y; K.coin.x = Math.max(TX, Math.min(TX + TW, K.coin.x + mx * 2.5)); K.coin.y = Math.max(TY, Math.min(TY + TH + 8, K.coin.y + my * 2.5)); scratchLine(x0, y0, K.coin.x, K.coin.y); }
      if (IN.ok && !K.auto) { K.auto = autoPath(); K.mouse = false; }
      if (K.auto) {
        const A = K.auto; for (let s = 0; s < 3 && A.i < A.P.length; s++) { const [x, y] = A.P[A.i], d = Math.hypot(x - K.coin.x, y - K.coin.y), st = 4; if (d <= st) { scratchLine(K.coin.x, K.coin.y, x, y); K.coin.x = x; K.coin.y = y; A.i++; } else { const nx = K.coin.x + (x - K.coin.x) / d * st, ny = K.coin.y + (y - K.coin.y) / d * st; scratchLine(K.coin.x, K.coin.y, nx, ny); K.coin.x = nx; K.coin.y = ny; } }
        if (A.i >= A.P.length) { K.auto = null; K.regions.forEach((r, i) => { if (!r.open) openRegion(i); }); }
      }
      if (K.done && t >= K.done) ticketResult();
      if (IN.back) { K.regions.forEach((r, i) => { if (!r.open) openRegion(i); }); }   // X reveals the lot
      return;
    }
    if (K.state === 'done') {
      if (IN.nx) { K.pick = mod(K.pick + IN.nx, 2); SFX.tick(); }
      if (c) { if (inR(c, 248, 120, 66, 14)) { buyTicket(K.tk.kind); return; } if (inR(c, 6, 120, 66, 14)) { K.state = 'pick'; SFX.switch(); return; } }
      else if (IN.ok) { buyTicket(K.tk.kind); return; }
      if (IN.back) { K.state = 'pick'; SFX.switch(); }
    }
  }
  function ticketArt(kind, x, y, w, h, tk, tt, small) {   // the printed ticket (under the foil)
    const T = TIX[kind];
    if (kind === 0) {
      rect('#000', x - 1, y - 1, w + 2, h + 2); rect('#e8c060', x, y, w, h); rect('#1e7a3a', x + 2, y + 2, w - 4, h - 4);
      for (let i = 0; i < w - 8; i += 8) { rect('#2a9a4a', x + 4 + i, y + 4, 4, 2); rect('#2a9a4a', x + 4 + i, y + h - 6, 4, 2); }
      text('IN THE MONEY', x + w / 2, y + 8, '#ffe680', small ? 1 : 2, '#0a3a1a', 'center');
      text('TOP PRIZE ' + T.top, x + w / 2, y + (small ? 16 : 22), '#fff6d4', 1, null, 'center');
      if (!small && tk) {
        regionsOf(tk).forEach((r, i) => { const v = tk.cells[i], win = K.state === 'done' && v === tk.prize, pulse = win && Math.floor(tt / 8) % 2; rect(pulse ? '#ffe680' : '#f4ece0', x + r.x, y + r.y, r.w, r.h); text(String(v), x + r.x + r.w / 2, y + r.y + 5 - (r.h < 20 ? 0.5 : 0), v === 1000 ? '#c8202c' : '#1e5a2a', 2, null, 'center'); });
        text('MATCH 3 AMOUNTS: WIN THAT AMOUNT', x + w / 2, y + h - 10, '#cfe8d0', 1, null, 'center');
      } else if (small) { for (let i = 0; i < 9; i++) rect('#b8b8c4', x + 22 + (i % 3) * 26, y + 30 + Math.floor(i / 3) * 16, 22, 12); text('MATCH 3 AMOUNTS', x + w / 2, y + h - 12, '#cfe8d0', 1, null, 'center'); }
    } else {
      rect('#000', x - 1, y - 1, w + 2, h + 2); rect('#e8c060', x, y, w, h); rect('#3a2a8a', x + 2, y + 2, w - 4, h - 4);
      for (let i = 0; i < 9; i++) { const sx = x + 6 + ((i * 37) % (w - 12)), sy = y + 6 + ((i * 23) % (h - 12)); rect('#5a4ab0', sx, sy, 2, 2); }
      text('LUCKY DIP', x + (small ? w / 2 : 52), y + 8, '#ffe680', small ? 1 : 2, '#1a1050', 'center');
      text('TOP PRIZE ' + T.top, x + (small ? w / 2 : 52), y + (small ? 16 : 22), '#fff6d4', 1, null, 'center');
      if (!small && tk) {
        regionsOf(tk).forEach((r, i) => {
          if (r.dip) { rect('#f4ece0', x + r.x, y + r.y, r.w, r.h); drawSpr(tk.dip, x + r.x + r.w / 2, y + r.y + r.h - 2, 0.85); return; }
          const s = tk.spots[i - 1], win = K.state === 'done' && s.sym === tk.dip, pulse = win && Math.floor(tt / 8) % 2;
          rect(pulse ? '#ffe680' : '#f4ece0', x + r.x, y + r.y, r.w, r.h); drawSpr(s.sym, x + r.x + 12, y + r.y + r.h - 3, 0.75); text(String(s.prize), x + r.x + r.w - 2, y + r.y + 9, '#3a2a8a', 1, null, 'right');
        });
        text('YOUR DIP', x + 118, y + 11, '#fff6d4', 1, null, 'center');
        text('MATCH YOUR DIP: WIN THE PRIZE', x + w / 2, y + h - 8, '#d0c8f0', 1, null, 'center');
      } else if (small) { rect('#b8b8c4', x + w - 34, y + 24, 26, 20); for (let i = 0; i < 6; i++) rect('#b8b8c4', x + 10 + (i % 3) * 34, y + 50 + Math.floor(i / 3) * 16, 30, 12); text('MATCH YOUR DIP', x + w / 2, y + h - 12, '#d0c8f0', 1, null, 'center'); }
    }
  }
  function drawSpr(n, cx, by, s = 1) { const e = SPR[n]; if (!e) return; const sc = Math.min(e[0] === 'card' ? 0.7 : 1, e[1]) * s; spr(e[0], cx, by, false, sc, e[0] === 'card' ? sc * 1.5 : sc); }
  function scratchDraw(tt) {
    felt('#2a0a24', '#340e2c');
    if (K.state === 'pick') {
      text('PICK A TICKET', VW / 2, 20, '#ffe680', 2, '#7a2a10', 'center');
      for (let i = 0; i < 2; i++) {
        const on = K.pick === i, lift = on ? Math.round(Math.abs(Math.sin(tt / 12)) * 3) : 0, x = 30 + i * 140, y = 34 - lift;
        ticketArt(i, x, y, 120, 92, null, tt, true);
        if (on) { ctx.strokeStyle = Math.floor(tt / 8) % 2 ? '#ffe680' : '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - 2.5, 125, 97); }
        const free = i === 0 && freeTix(), price = unl() ? 'FREE' : free ? 'FREE TICKET!' : TIX[i].price + ' HEI POINTS';
        text(price, x + 60, 132, free ? rainbow(0, tt) : on ? '#ffe680' : '#c8b8c0', 1, null, 'center');
      }
      return;
    }
    const tk = K.tk;
    ticketArt(tk.kind, TX, TY, TW, TH, tk, tt, false);
    ctx.drawImage(K.foil, TX, TY);
    K.regions.forEach(r => { if (r.open && t - r.pop < 10) { const k = (t - r.pop) / 10; ctx.strokeStyle = `rgba(255,246,212,${(1 - k).toFixed(2)})`; ctx.strokeRect(TX + r.x - k * 4 + 0.5, TY + r.y - k * 4 + 0.5, r.w + k * 8 - 1, r.h + k * 8 - 1); } });
    if (K.state === 'scratch' && !K.mouse) { const cx = K.coin.x, cy = K.coin.y; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx + 1, cy + 1, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e8b030'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#b07a18'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill(); }
    // side panels
    text(K.free ? 'FREE TICKET' : unl() ? 'FREE PLAY' : 'PAID ' + TIX[tk.kind].price, 44, 24, K.free ? rainbow(0, tt) : '#9a8a90', 1, null, 'center');
    if (K.state === 'scratch') {
      ['DRAG TO', 'SCRATCH,', 'OR ARROWS', 'MOVE THE', 'COIN'].forEach((l, i) => text(l, 44, 44 + i * 8, '#c8b8c0', 1, null, 'center'));
      text(DD.padUsed ? 'CROSS:' : 'JUMP:', 278, 52, '#ffd27a', 1, null, 'center'); text('SCRATCH', 278, 60, '#ffd27a', 1, null, 'center'); text('IT ALL', 278, 68, '#ffd27a', 1, null, 'center');
    } else {
      btn(6, 120, 66, 14, 'TICKETS', false); const again = unl() ? 'AGAIN: FREE' : (tk.kind === 0 && freeTix() ? 'AGAIN: FREE' : 'AGAIN: ' + TIX[tk.kind].price); btn(248, 120, 66, 14, again, true, '#ffd27a');
    }
  }

  // ================================================================ roulette
  const R = { state: 'bet', bets: {}, last: null, cur: 0, hist: [], wa: 0, ws: 0, ball: null, n: 0, T: 0, k: 0, vfa: 0, won: 0, stake: 0, tk: -1 };
  const BX = 128, BY = 22, CW = 14, CH = 13;
  const SPOTS = (() => {
    const S0 = [{ id: 'n0', x: BX - 12, y: BY, w: 12, h: CH * 3, label: '0' }];
    for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) { const n = c * 3 + (3 - r); S0.push({ id: 'n' + n, x: BX + c * CW, y: BY + r * CH, w: CW, h: CH, label: String(n), n }); }
    for (let r = 0; r < 3; r++) S0.push({ id: 'c' + (r + 1), x: BX + 12 * CW, y: BY + r * CH, w: 20, h: CH, label: '2:1' });
    ['1ST 12', '2ND 12', '3RD 12'].forEach((l, i) => S0.push({ id: 'd' + (i + 1), x: BX + i * 56, y: BY + 3 * CH + 1, w: 56, h: 12, label: l }));
    [['low', '1-18'], ['even', 'EVEN'], ['red', 'RED'], ['black', 'BLACK'], ['odd', 'ODD'], ['high', '19-36']].forEach(([id, l], i) => S0.push({ id, x: BX + i * 28, y: BY + 3 * CH + 14, w: 28, h: 12, label: l }));
    S0.push({ id: 'clear', x: 118, y: 106, w: 40, h: 14, label: 'CLEAR', ctl: 1 }, { id: 'less', x: 162, y: 106, w: 14, h: 14, label: '<', ctl: 1 }, { id: 'more', x: 204, y: 106, w: 14, h: 14, label: '>', ctl: 1 },
      { id: 'vfa', x: 222, y: 106, w: 50, h: 14, label: 'BET THE VFA', ctl: 1 }, { id: 'spin', x: 276, y: 106, w: 40, h: 14, label: 'SPIN', ctl: 1 });
    return S0;
  })();
  R.cur = SPOTS.findIndex(s => s.id === 'red');
  const tableTotal = () => Object.values(R.bets).reduce((a, b) => a + b, 0);
  function navSpot(dx, dy) {
    const a = SPOTS[R.cur], ax = a.x + a.w / 2, ay = a.y + a.h / 2; let best = -1, bd = 1e9;
    SPOTS.forEach((s, i) => { if (i === R.cur) return; const sx = s.x + s.w / 2 - ax, sy = s.y + s.h / 2 - ay, along = dx ? sx * dx : sy * dy; if (along <= 2) return; const d = along + (dx ? Math.abs(sy) : Math.abs(sx)) * 3; if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { R.cur = best; R.vfa = 0; SFX.tick(); }
  }
  function placeBet(id, amt) { if (!take(amt)) return false; R.bets[id] = (R.bets[id] || 0) + amt; R.lastSpot = id; tone(900, 700, 0.05, 'square', 0.04); noise(0.03, 0.04, 3000); return true; }
  function rouletteAct(s) {
    if (R.state !== 'bet') return;
    if (s.id === 'clear') { const n = tableTotal(); if (n && !unl()) ST().bank(n); R.bets = {}; SFX.tick(); if (n) say('CHIPS BACK: ' + n, 60); return; }
    if (s.id === 'less' || s.id === 'more') { bump(s.id === 'less' ? -1 : 1); return; }
    if (s.id === 'vfa') {
      const on = R.lastSpot || 'red', all = unl() ? 1000 : pts();
      if (all <= 0) { say('NOTHING LEFT TO BET', 80); SFX.buzz(); return; }
      if (!R.vfa) { R.vfa = 1; say('ALL ' + all + ' ON ' + SPOTS.find(q => q.id === on).label + '? AGAIN TO BET THE VFA', 160); tone(330, 330, 0.12, 'square', 0.05); return; }
      R.vfa = 0; placeBet(on, all); say('THE VFA IS ON ' + SPOTS.find(q => q.id === on).label + '!', 120); jingle([196, 247, 294, 392], 0.09); spinWheel(); return;
    }
    if (s.id === 'spin') {
      if (!tableTotal()) {
        if (R.last && Object.keys(R.last).length) { const need = Object.values(R.last).reduce((a, b) => a + b, 0); if (!unl() && pts() < need) { say('NEED ' + (need - pts()) + ' MORE TO REBET', 90); SFX.buzz(); return; } for (const k in R.last) placeBet(k, R.last[k]); spinWheel(); }
        else { say('PUT A CHIP DOWN FIRST', 70); SFX.buzz(); }
        return;
      }
      spinWheel(); return;
    }
    placeBet(s.id, BETS[bi]);
  }
  function spinWheel() {
    R.stake = tableTotal(); R.last = Object.assign({}, R.bets); R.n = rnd(37); R.state = 'spin'; R.T = 0; R.vfa = 0; banner = null;
    R.ws = 0.09; const di = WHEEL.indexOf(R.n); R.target = di * Math.PI * 2 / 37; R.laps = Math.PI * 2 * (5 + rnd(3)); R.tk = -1;
    noise(0.3, 0.04, 1200); tone(180, 120, 0.3, 'triangle', 0.04);
  }
  const DUR = 230;
  function rouletteStep(IN, c) {
    R.wa += R.ws; R.ws *= R.state === 'spin' ? 0.995 : 0.97; if (R.ws < 0.002) R.ws = R.state === 'bet' ? 0.004 : R.ws;
    if (R.state === 'spin') {
      R.T++; const k = Math.min(1, R.T / DUR), e = 1 - Math.pow(1 - k, 3);
      let rel = R.target - R.laps * (1 - e), rr = 41;   // the ball's angle on the wheel, counter to the spin, landing on its number
      if (k > 0.62) { const f = Math.min(1, (k - 0.62) / 0.1); rr = 41 - f * 8; }
      if (k > 0.72 && k < 0.95) { const q = (k - 0.72) / 0.23; rr += Math.abs(Math.sin(q * 22)) * 4 * (1 - q); rel += Math.sin(q * 9) * 0.17 * (1 - q); }
      R.ball = { a: R.wa + rel, rr };
      const pk = Math.floor(mod(rel, Math.PI * 2) / (Math.PI * 2 / 37)); if (pk !== R.tk) { R.tk = pk; if (k > 0.6) tone(2400 + rnd(600), 2200, 0.012, 'square', 0.03); else if (R.T % 3 === 0) tone(1600, 1500, 0.01, 'square', 0.01); }
      if (k >= 1) rouletteResult();
      if (IN.ok && R.T < DUR - 40) R.T = Math.max(R.T, DUR - 40);   // hurry it along
      return;
    }
    if (R.state === 'show') { R.ball = { a: R.wa + R.target, rr: 33 }; R.k++; if (R.k > 90 || (R.k > 20 && (IN.ok || c))) { R.state = 'bet'; R.bets = {}; } if (R.state === 'show') { if (IN.back) { R.state = 'bet'; R.bets = {}; } return; } }
    if (R.state === 'bet' && R.ball && R.ball.rr) R.ball.a = R.wa + R.target;
    if (IN.nx) navSpot(IN.nx, 0); if (IN.ny) navSpot(0, IN.ny);
    if (c) { const i = SPOTS.findIndex(s => inR(c, s.x, s.y, s.w, s.h)); if (i >= 0) { if (R.cur !== i) R.vfa = 0; R.cur = i; rouletteAct(SPOTS[i]); return; } }
    else if (IN.ok) { rouletteAct(SPOTS[R.cur]); return; }
    if (IN.back) { if (tableTotal()) rouletteAct({ id: 'clear' }); scr = 'lobby'; SFX.switch(); }
  }
  function rouletteResult() {
    let back = 0; for (const k in R.bets) back += R.bets[k] * rouletteWins(k, R.n);
    R.won = back; R.hist.unshift(R.n); R.hist.length = Math.min(R.hist.length, 9); R.state = 'show'; R.k = 0;
    const lucky = R.n === 7 && R.bets.n7;
    if (back > 0) { give(back, 62, 86); tier(back, R.stake, 62, 86, lucky ? 'LUCKY 7! +' + back : null); if (lucky) vo('CAS10.mp3', 0); }
    else { tone(240, 160, 0.2, 'triangle', 0.04); bannerUp(R.n + ' ' + (R.n === 0 ? 'GREEN' : REDS.has(R.n) ? 'RED' : 'BLACK') + '. NO WIN', '#c8a0a8', 1, 90); }
    settle(R.stake, back, R.stake >= 100);
  }
  function rouletteDraw(tt) {
    felt('#0e4a24', '#12542a');
    rect('#000', 6, 26, 112, 120); rect('#3a2410', 7, 27, 110, 118);
    wheel(62, 82, 44, R.wa, R.ball, tt);
    if (R.state === 'show' || (R.state === 'bet' && R.hist.length)) { const n = R.hist[0], pulse = R.state === 'show' && Math.floor(tt / 6) % 2; rect('#000', 46, 131, 32, 13); rect(numCol(n), 47, 132, 30, 11); text(String(n), 62, 133, pulse ? '#ffe680' : '#fff6d4', 1, null, 'center'); }
    text('LAST', 8, 20, '#9ac8a0', 1, null); R.hist.forEach((n, i) => { if (i > 7) return; rect(numCol(n), 26 + i * 11, 18, 10, 8); text(String(n), 31 + i * 11, 19, '#fff', 1, null, 'center'); });
    // the board
    SPOTS.forEach((s, i) => {
      const cur = i === R.cur && R.state === 'bet', hit = R.state === 'show' && (s.id === 'n' + R.n || (rouletteWins(s.id, R.n) > 0 && !s.ctl && s.n === undefined && s.id !== 'n0'));
      if (s.ctl) { const lit = cur || (s.id === 'vfa' && R.vfa) || (s.id === 'spin' && R.state === 'bet' && (tableTotal() > 0 || R.last)); const lab = s.id === 'spin' && !tableTotal() && R.last ? 'REBET' : s.label; btn(s.x, s.y, s.w, s.h, lab, lit, s.id === 'vfa' ? (R.vfa && Math.floor(tt / 5) % 2 ? '#ff6a4a' : '#e8302a') : s.id === 'spin' ? '#ffd27a' : '#c98f22', R.state !== 'bet'); return; }
      const bg = s.n !== undefined ? numCol(s.n) : s.id === 'n0' ? numCol(0) : s.id === 'red' ? '#c8202c' : s.id === 'black' ? '#1a1418' : '#0e4a24';
      rect('#e8d8b0', s.x, s.y, s.w + 1, s.h + 1); rect(hit ? (Math.floor(tt / 6) % 2 ? '#ffe680' : bg) : bg, s.x + 1, s.y + 1, s.w - 1, s.h - 1);
      if (s.n === 7) rect('rgba(255,214,90,' + (0.25 + 0.2 * Math.sin(tt / 8)).toFixed(2) + ')', s.x + 1, s.y + 1, s.w - 1, s.h - 1);   // the lucky 7
      text(s.label, s.x + s.w / 2 + 1, s.y + (s.h - 5) / 2 + 1, '#fff6d4', 1, null, 'center');
      if (cur) { const g = Math.floor(tt / 6) % 2 ? '#ffe680' : '#fff'; ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h); ctx.strokeRect(s.x - 0.5, s.y - 0.5, s.w + 2, s.h + 2); }
      if (R.bets[s.id]) chip(s.x + s.w / 2 + 1, s.y + s.h / 2 + 1, R.bets[s.id], s.w < 15 ? 4 : 5);
    });
    text('LUCKY', BX + 2 * CW + 7, BY - 6, '#ffd27a', 1, null, 'center');
    text(String(BETS[bi]), 190, 109, '#ffe680', 1, null, 'center'); text('CHIP', 190, 98, '#9ac8a0', 1, null, 'center');
    const s = SPOTS[R.cur], on = R.bets[s.id] || 0, tot = tableTotal();
    text('ON THE TABLE: ' + tot, 120, 126, '#fff6d4', 1, null);
    if (!s.ctl) text(s.label + ' PAYS ' + (s.id[0] === 'n' ? '35' : s.id[0] === 'd' || s.id[0] === 'c' ? '2' : '1') + ' TO 1' + (on ? '. YOU HAVE ' + on : ''), 120, 135, '#9ac8a0', 1, null);
    else if (s.id === 'vfa') text('ALL IN ON ' + SPOTS.find(q => q.id === (R.lastSpot || 'red')).label + '. GREGG BET THE VFA', 120, 135, '#ff8a6a', 1, null);
    if (R.state === 'show' && R.won) text('WON ' + R.won, 316, 126, rainbow(0, tt), 1, null, 'right');
  }

  // ================================================================ blackjack
  const B = { state: 'bet', shoe: [], P: [], D: [], q: [], bet: 5, doubled: false, sel: 0, dealer: 'gregg', dx: 0, wins: 0, say: '', sayT: 0, res: '', walk: 0, flipT: 99 };
  const DLR = { gregg: { spr: 'gregg', lines: { bust: '22 IS BLACKJACK IN AMERICA.', bj: 'THE BUFF CANNOT BE STUMPED.', you: 'POP POP.', yb: 'SOUR GRAPES?', win: 'BACK TO THE ARCHIVE WITH IT.', push: 'FIVE BAGS EACH. A TIE.' } },
    tim: { spr: 'tim', lines: { bust: 'SEE YOU NEXT WEEK.', bj: 'IN THE MONEY.', you: 'HOW LUCKY YOU GUYS ARE.', yb: 'IN THE MONEY. FOR ME.', win: 'IN THE MONEY.', push: 'FAIR ENOUGH.' } } };
  const dsay = (k, n = 150) => { B.say = typeof k === 'string' && DLR[B.dealer].lines[k] ? DLR[B.dealer].lines[k] : k; B.sayT = n; };
  function drawCard(hide) { if (B.shoe.length < 60) { B.shoe = newShoe(); say('NEW SHOE. SHUFFLING', 70); noise(0.4, 0.04, 2500); } const c = B.shoe.pop(); c.hide = !!hide; c.t0 = t; return c; }
  const later = (n, f) => B.q.push({ at: t + n, f });
  const handX = (h, i, cx) => cx - (h.length - 1) * 7 + i * 14 - 9;
  function deal() {
    const bet = BETS[bi]; if (!take(bet)) return;
    B.bet = bet; B.stake = bet; B.doubled = false; B.P = []; B.D = []; B.res = ''; B.state = 'deal'; B.sel = 0; banner = null; B.flipT = 99;
    const sw = () => noise(0.05, 0.05, 3500);
    later(0, () => { B.P.push(drawCard()); sw(); }); later(9, () => { B.D.push(drawCard()); sw(); });
    later(18, () => { B.P.push(drawCard()); sw(); }); later(27, () => { B.D.push(drawCard(true)); sw(); });
    later(40, afterDeal);
  }
  function afterDeal() {
    const pBJ = isBJ(B.P), dBJ = isBJ(B.D);
    if (dBJ || pBJ) { flipHole(); later(14, () => { if (pBJ && dBJ) finish('push', 'BOTH BLACKJACK. PUSH'); else if (pBJ) finish('bj', 'BLACKJACK!'); else finish('lose', 'DEALER BLACKJACK'); }); return; }
    B.state = 'play';
  }
  function flipHole() { const h = B.D.find(c => c.hide); if (h) { h.hide = false; B.flipT = 0; tone(700, 900, 0.05, 'square', 0.03); } }
  function hit() {
    B.P.push(drawCard()); noise(0.05, 0.05, 3500); const v = handV(B.P).v;
    if (v > 21) { B.state = 'wait'; later(14, () => { flipHole(); later(10, () => finish('lose', 'BUST')); }); }
    else if (v === 21) { B.state = 'wait'; later(12, stand); }
  }
  function dbl() { if (B.P.length !== 2) return; if (!take(B.bet)) return; B.stake += B.bet; B.doubled = true; tone(523, 784, 0.08, 'square', 0.04); B.state = 'wait'; later(8, () => { B.P.push(drawCard()); noise(0.05, 0.05, 3500); if (handV(B.P).v > 21) later(14, () => { flipHole(); later(10, () => finish('lose', 'BUST')); }); else later(14, stand); }); }
  function stand() {
    B.state = 'dealer'; flipHole();
    const step = () => { const v = handV(B.D).v; if (v < 17) { B.D.push(drawCard()); noise(0.05, 0.05, 3500); later(18, step); } else later(10, resolve); };
    later(18, step);
  }
  function resolve() { const p = handV(B.P).v, d = handV(B.D).v; if (d > 21) finish('dbust', 'DEALER BUSTS!'); else if (p > d) finish('win', 'YOU WIN'); else if (p === d) finish('push', 'PUSH'); else finish('lose', 'DEALER WINS'); }
  function finish(r, label) {
    B.state = 'done'; B.res = label; const st = B.stake;
    const back = r === 'bj' ? Math.round(st * 2.5) : r === 'win' || r === 'dbust' ? st * 2 : r === 'push' ? st : 0;
    if (back > 0) { give(back, 160, 120); tier(back, st, 160, 110, r === 'bj' ? 'BLACKJACK! +' + back : null); } else { bannerUp(label, '#c8a0a8', 2, 90); tone(260, 170, 0.18, 'triangle', 0.04); }
    if (r === 'bj') dsay('you'); else if (r === 'dbust') { dsay('bust'); if (B.dealer === 'gregg') vo('CAS8.mp3', 60); } else if (r === 'win') dsay('you', 110); else if (r === 'push') dsay('push');
    else if (label === 'BUST') dsay('yb'); else if (label === 'DEALER BLACKJACK') dsay('bj'); else dsay('win', 110);
    if (back > st) B.wins++; else if (back < st) B.wins = 0;
    if (B.dealer === 'gregg' && B.wins >= 3) { B.walk = 1; later(70, () => { dsay('THIS IS IRRELEVANT CASINO GAMBLING.', 120); vo('CAS3.mp3', 0); }); }
    settle(st, back, st >= 100);
  }
  function bjStep(IN, c) {
    if (B.sayT > 0) B.sayT--;
    for (const e of B.q.slice()) if (t >= e.at) { B.q.splice(B.q.indexOf(e), 1); e.f(); }
    if (B.flipT < 99) B.flipT++;
    if (B.walk) {   // Gregg storms off, Tim takes the shoe
      B.walk++;
      if (B.walk > 150 && B.walk <= 200) B.dx = (B.walk - 150) * 4;
      if (B.walk === 200) { B.dealer = 'tim'; B.dx = -200; }
      if (B.walk > 200) B.dx = Math.min(0, B.dx + 5);
      if (B.walk === 245) { dsay("GREGG WALKED OFF. I'LL DEAL.", 180); B.walk = 0; B.wins = 0; }
      if (IN.back && B.walk < 140) B.walk = 140;
      return;
    }
    const BT = [['HIT', () => hit()], ['STAND', () => { B.state = 'wait'; stand(); }], ['DOUBLE', () => dbl()]];
    if (B.state === 'bet' || B.state === 'done') {
      if (IN.ny) bump(-IN.ny); if (IN.nx) bump(IN.nx);
      if (c) { if (betClick(c, 260, 70)) return; if (inR(c, 258, 104, 60, 18)) { deal(); return; } }
      else if (IN.ok) { deal(); return; }
      if (IN.back) { scr = 'lobby'; SFX.switch(); }
      return;
    }
    if (B.state === 'play') {
      const canD = B.P.length === 2;
      if (IN.ny || IN.nx) { B.sel = mod(B.sel + (IN.ny || IN.nx), canD ? 3 : 2); SFX.tick(); }
      if (c) { for (let i = 0; i < 3; i++) if (inR(c, 258, 70 + i * 20, 58, 16)) { if (i === 2 && !canD) { SFX.buzz(); return; } B.sel = i; BT[i][1](); return; } }
      else if (IN.ok) { if (B.sel === 2 && !canD) { SFX.buzz(); return; } BT[B.sel][1](); }
      if (!canD && B.sel === 2) B.sel = 0;
    }
  }
  function bjDraw(tt) {
    felt('#4a0a14', '#520e18');
    // the dealer behind the table
    const d = DLR[B.dealer], bob = Math.round(Math.sin(tt / 20));
    spr(d.spr, 160 + B.dx, 68 + bob, B.walk > 150 && B.walk < 200);
    rect('#000', 0, 52, VW, 3); rect('#6a3a18', 0, 53, VW, 6); rect('#c98f22', 0, 58, VW, 1);
    rect('#7a1420', 0, 59, VW, VH - 59); for (let y = 63; y < VH; y += 10) for (let x = (y / 10) % 2 ? 0 : 10; x < VW; x += 20) rect('#84182a', x + 4, y, 4, 4);
    text('BLACKJACK PAYS 3 TO 2', 160, 136, '#e8c060', 1, null, 'center'); text('DEALER STANDS ON 17', 160, 143, '#c89850', 1, null, 'center');
    if (B.sayT > 0 && B.say) bubble(B.say, 188, 18, 92, B.dx === 0);
    // the shoe
    rect('#000', 286, 22, 28, 22); rect('#2a1a10', 287, 23, 26, 20); card({ hide: true }, 291, 20);
    // hands
    const fly = (c, x, y) => { const k = Math.min(1, (t - (c.t0 || 0)) / 9), e = 1 - Math.pow(1 - k, 2); return [300 + (x - 300) * e, 24 + (y - 24) * e]; };
    B.D.forEach((c, i) => { const [x, y] = fly(c, handX(B.D, i, 160), 62); const f = !c.hide && i === 1 && B.flipT < 12 ? (B.flipT < 6 ? -(1 - B.flipT / 6) : (B.flipT - 6) / 6) : 1; card(f < 0 ? Object.assign({}, c, { hide: true }) : c, x, y, f || 0.1); });
    B.P.forEach((c, i) => { const [x, y] = fly(c, handX(B.P, i, 160), 100); card(c, x, y, B.doubled && i === 2 ? 1 : 1); });
    const badge = (h, x, y) => { if (!h.length) return; const hv = handV(h), s = (hv.soft && hv.v < 21 ? hv.v - 10 + '/' : '') + hv.v; rect('#000', x - 12, y, 24, 9); text(s, x, y + 2, hv.v > 21 ? '#ff6a6a' : hv.v === 21 ? '#ffe680' : '#fff6d4', 1, null, 'center'); };
    badge(B.D, 160 - B.D.length * 7 - 20, 70); badge(B.P, 160 - B.P.length * 7 - 20, 108);
    // the bet circle
    ctx.strokeStyle = '#e8c060'; ctx.beginPath(); ctx.arc(80, 112, 12, 0, 7); ctx.stroke();
    const st = B.state === 'bet' || (B.state === 'done' && !B.P.length) ? BETS[bi] : B.stake; for (let k = 0; k < Math.min(6, Math.ceil(st / 10)); k++) chip(80, 114 - k * 2, B.doubled ? 50 : st);
    text(String(st), 80, 127, '#fff6d4', 1, null, 'center'); if (B.doubled) text('DOUBLED', 80, 96, '#ff8a6a', 1, null, 'center');
    text('STREAK ' + B.wins, 8, 64, B.wins >= 2 && B.dealer === 'gregg' ? '#ff8a6a' : '#c89850', 1, null);
    // the right panel
    if (B.state === 'play') { const canD = B.P.length === 2; ['HIT', 'STAND', 'DOUBLE'].forEach((l, i) => btn(258, 70 + i * 20, 58, 16, l, B.sel === i, i === 2 ? '#ff8a6a' : '#ffd27a', i === 2 && !canD)); }
    else if (B.state === 'bet' || B.state === 'done') { betBox(260, 70, true); const hb = Math.round(Math.abs(Math.sin(tt / 10))); btn(258, 104 - hb, 60, 18, B.state === 'done' ? 'DEAL AGAIN' : 'DEAL', true, '#ffd27a'); }
  }

  // ================================================================ the screen
  function open() {
    t = 0; scr = 'lobby'; banner = null;
    if (!C.seen) { C.seen = 1; csave(); vo('CAS2.mp3', 0); say('LUCKY SEASON 7. BET HEI POINTS, WIN HEI POINTS.', 200); }
    else if (!sessOpen) vo('CAS1.mp3', 0);
    sessOpen = true;
    if (freeTix()) say('FREE TICKET WAITING AT THE SCRATCHERS!', 200);
  }
  function step(IN, c) {   // returns 'back' to leave the store
    t++; if (msgT > 0) msgT--; if (shake > 0) shake--;
    if (banner) { banner.t++; if (banner.t > banner.n) banner = null; }
    coins = coins.filter(f => { f.t++; if (f.t === f.d) SFX.count(f.k % 12); return f.t < f.d; });
    spark = spark.filter(p => { p.t++; p.x += p.vx; p.y += p.vy; p.vy += 0.18; return p.t < p.life; });
    if (scr === 'lobby') return lobbyStep(IN, c);
    if (scr === 'slots') slotsStep(IN, c); else if (scr === 'scratch') scratchStep(IN, c); else if (scr === 'roul') rouletteStep(IN, c); else if (scr === 'bj') bjStep(IN, c);
  }
  const busy = () => (scr === 'slots' && S.state === 'spin') || (scr === 'roul' && R.state === 'spin') || (scr === 'bj' && !['bet', 'done', 'play'].includes(B.state)) || (scr === 'scratch' && K.state === 'scratch');
  function draw() {
    const tt = t;
    ctx.save(); if (shake) ctx.translate(Math.round((Math.random() - 0.5) * Math.min(6, shake / 3)), Math.round((Math.random() - 0.5) * Math.min(6, shake / 3)));
    if (scr === 'lobby') lobbyDraw(tt); else if (scr === 'slots') slotsDraw(tt); else if (scr === 'scratch') scratchDraw(tt); else if (scr === 'roul') rouletteDraw(tt); else bjDraw(tt);
    ctx.restore();
    // footer
    rect('#0a0408', 0, 149, VW, 31);
    if (msgT > 0) text(msg, VW / 2, 152, msg.startsWith('NEED') || msg.startsWith('OUT') ? '#ff8080' : '#ffe680', 1, null, 'center');
    else text(unl() ? 'UNLIMITED HEI POINTS: EVERYTHING PLAYS FREE, NOTHING PAYS' : scr === 'lobby' ? 'LUCKY SEVEN MEANS CASINO WITH YOU.' : 'BALANCE ' + pts() + '   YOU VS THE HOUSE ' + (C.net > 0 ? '+' : '') + C.net, VW / 2, 152, '#9a8a90', 1, null, 'center');
    const J = DD.padUsed ? 'CROSS' : 'JUMP', X = DD.padUsed ? 'CIRCLE' : 'X', SW = DD.padUsed ? 'R1' : 'C';
    const help = scr === 'lobby' ? 'LEFT/RIGHT: PICK   ' + J + ': PLAY   ' + SW + ': STORE   ' + X + ': ' + (ST() ? ST().backLabel : 'BACK')
      : scr === 'slots' ? (S.state === 'spin' ? J + ': STOP THE REELS' : J + ': SPIN   ARROWS: BET   ' + X + ': CASINO')
      : scr === 'scratch' ? (K.state === 'pick' ? 'LEFT/RIGHT: PICK   ' + J + ': BUY   ' + X + ': CASINO' : K.state === 'scratch' ? 'DRAG OR ARROWS: SCRATCH   ' + J + ': ALL   ' + X + ': REVEAL' : J + ': AGAIN   ' + X + ': TICKETS')
      : scr === 'roul' ? (R.state === 'spin' ? J + ': HURRY IT UP' : 'ARROWS: MOVE   ' + J + ': CHIP DOWN / PRESS   ' + X + ': CASINO')
      : B.state === 'play' ? 'ARROWS: PICK   ' + J + ': DO IT' : J + ': DEAL   ARROWS: BET   ' + X + ': CASINO';
    text(help, VW / 2, 167, '#ffd27a', 1, '#000', 'center');
  }
  function drawTop() {   // over the store's header: coins into the balance, sparks and the banner
    for (const p of spark) { const a = 1 - p.t / p.life; ctx.globalAlpha = a; rect('#000', p.x, p.y + 1, 2, 2); rect(p.c, p.x, p.y, 2, 2); ctx.globalAlpha = 1; }
    for (const f of coins) { if (f.t < 0) continue; const k = f.t / f.d, e = k * k * (3 - 2 * k), arc = Math.sin(k * Math.PI) * 24, x = f.x0 + (BAL.x - f.x0) * e, y = f.y0 + (BAL.y - f.y0) * e - arc; rect('#000', x - 1, y - 1, 5, 5); rect('#ffd27a', x, y, 3, 3); rect('#fff6d4', x, y, 1, 1); }
    if (banner) {
      const b = banner, s = b.size, w = b.s.length * 4 * s, pop = b.t < 8 ? Math.round((8 - b.t) * 1.5) : 0, y = ({ slots: 26, scratch: 135, bj: 88, roul: 128 }[scr] || 66) - pop + (b.t > b.n - 10 ? (b.t - (b.n - 10)) * 3 : 0);
      rect('rgba(10,4,8,0.78)', VW / 2 - w / 2 - 8, y - 4, w + 16, 5 * s + 8); rect(b.col === 'rain' ? rainbow(0, t) : '#c98f22', VW / 2 - w / 2 - 8, y - 4, w + 16, 1); rect(b.col === 'rain' ? rainbow(4, t) : '#c98f22', VW / 2 - w / 2 - 8, y + 5 * s + 3, w + 16, 1);
      if (b.col === 'rain') { for (let i = 0; i < b.s.length; i++) text(b.s[i], VW / 2 - w / 2 + i * 4 * s, y + Math.round(Math.sin(t / 4 + i * 0.7) * 1.5), rainbow(i, t), s, '#2a0e1a'); }
      else text(b.s, VW / 2, y, b.col, s, '#2a0e1a', 'center');
    }
  }

  window.DDCasino = { open, step, draw, drawTop, M, BETS, get scr() { return scr; }, get busy() { return busy(); }, get stats() { return C; }, reload: cload,
    test: { S, K, R, B, get t() { return t; }, set bi(n) { bi = n; }, enter, spin, deal, buyTicket, spinWheel, placeBet, settle, freeTix } };
})();
