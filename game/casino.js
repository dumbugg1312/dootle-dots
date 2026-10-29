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

  // ---- bingo: 75 balls, a 5 x 5 card (B 1-15 ... O 61-75, free middle); any row, column, diagonal or the four corners
  const BLINES = (() => { const L = []; for (let i = 0; i < 5; i++) { L.push([0, 1, 2, 3, 4].map(r => i * 5 + r)); L.push([0, 1, 2, 3, 4].map(c => c * 5 + i)); } L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20], [0, 4, 20, 24]); return L; })();
  const BPAY = [[16, 12], [22, 6], [99, 4]];   // bingo within this many balls pays this many times the card
  const bingoPay = n => BPAY.find(([lim]) => n <= lim)[1];
  function bingoCard() { const c = []; for (let col = 0; col < 5; col++) { const pool = []; for (let k = 1; k <= 15; k++) pool.push(col * 15 + k); for (let i = 0; i < 5; i++) c.push(pool.splice(rnd(pool.length), 1)[0]); } c[12] = 0; return c; }   // c[col * 5 + row]; 0 is FREE
  const bingoToGo = (c, called) => Math.min(...BLINES.map(L => L.filter(k => c[k] && !called.has(c[k])).length));
  M.BLINES = BLINES; M.BPAY = BPAY; M.bingoPay = bingoPay; M.bingoCard = bingoCard; M.bingoToGo = bingoToGo;

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

  // ================================================================ drawing pieces: the game's art kit (DD.art) and crisp pixel shapes, no smooth arcs
  const A = DD.art, mix = (h, k) => A ? A.mix(h, k) : h;
  const box = (x, y, w, h, base, o) => A ? A.box(Math.round(x), Math.round(y), w, h, base, o) : rect(base, x, y, w, h);
  const glow = (x, y, r, col, a) => { if (A) A.glow(x, y, r, col, a); };
  const GOLD = ['#fff6c0', '#ffe27a', '#f0c84a', '#d89a28', '#b06a18'], NEON = ['#ffe0d0', '#ff9a7a', '#ff5a40', '#e02a24', '#9a1418'];
  function logo(str, cx, y, s, ramp = GOLD, glint = null, out = '#3a1408', drop = '#7a3a10') {   // big type like the menu's: outline, drop shadow, a colour ramp per font row, a glint
    const w = str.length * 4 * s - s, x = Math.round(cx - w / 2);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) text(str, x + dx, y + dy, out, s, null);
    if (s > 1) text(str, x + 2, y + 3, drop, s, null);
    for (let r = 0; r < 5; r++) { ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y + r * s, w + 8, s); ctx.clip(); text(str, x, y, ramp[r], s, null); ctx.restore(); }
    if (glint !== null) { ctx.save(); ctx.beginPath(); ctx.moveTo(glint, y - 4); ctx.lineTo(glint + 10, y - 4); ctx.lineTo(glint + 2, y + 5 * s + 4); ctx.lineTo(glint - 8, y + 5 * s + 4); ctx.closePath(); ctx.clip(); text(str, x, y, '#ffffff', s, null); ctx.restore(); }
  }
  function ell(cx, cy, rx, ry, col, half = 0) {   // a filled ellipse from pixel rows (half: 1 lower half only, -1 upper)
    for (let dy = half > 0 ? 0 : -ry; dy <= (half < 0 ? 0 : ry); dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2))); if (w > 0) rect(col, cx - w, cy + dy, w * 2, 1); }
  }
  function rrect(x, y, w, h, r, col) {   // a rounded rectangle from pixel rows
    for (let i = 0; i < h; i++) { const k = i < r ? r - i - 0.5 : i >= h - r ? i - (h - r) + 0.5 : -1, ins = k < 0 ? 0 : Math.round(r - Math.sqrt(Math.max(0, r * r - k * k))); rect(col, x + ins, y + i, w - ins * 2, 1); }
  }
  function rbox(x, y, w, h, r, base, out) {   // a rounded, shaded plate: outline, body, lit top, shaded foot
    rrect(x - 1, y - 1, w + 2, h + 2, r + 1, out || mix(base, -0.7)); rrect(x, y, w, h, r, base);
    rect(mix(base, 0.35), x + r, y, w - r * 2, 1); rect(mix(base, -0.4), x + r, y + h - 1, w - r * 2, 1);
  }
  const cache = {};
  function bake(key, w, h, paint) {   // draw once to a small canvas, then blit it
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    paint((col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }, g);
    return (cache[key] = c);
  }
  function pmap(rows, pal, x, y, s = 1, tt = 0) {   // a pixel map: '.' is clear, 'x' runs the rainbow
    rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const ch = row[c]; if (ch === '.') continue; ctx.fillStyle = ch === 'x' ? rainbow(r + c, tt) : pal[ch]; ctx.fillRect(x + c * s, y + r * s, s, s); } });
  }
  // round things, lit from the top left
  function roundSpr(key, r, fn) { return bake(key, r * 2 + 1, r * 2 + 1, P => { for (let j = 0; j <= r * 2; j++) for (let i = 0; i <= r * 2; i++) { const dx = i - r, dy = j - r, d = Math.hypot(dx, dy); if (d > r + 0.35) continue; const c = fn(d, Math.atan2(dy, dx), dx, dy); if (c) P(c, i, j); } }); }
  const CHIPC = a => a >= 1000 ? '#e8b030' : a >= 100 ? '#2a2430' : a >= 50 ? '#2a5ad8' : a >= 25 ? '#1a9a4a' : a >= 10 ? '#d8202c' : '#ece6dc';
  function chip(x, y, amt, r = 5, n = 1) {   // a stack of n chips, its foot at (x, y + r)
    const col = CHIPC(amt), edge = amt >= 100 && amt < 1000 ? '#e8c060' : amt < 10 ? '#3a6ad8' : '#fff6e8';
    const img = roundSpr('chip' + col + r, r, (d, a, dx, dy) => {
      if (d > r - 0.6) return mix(col, -0.65);
      const lit = -(dx + dy) / (r * 2) * 0.3;
      if (d > r - 2.1) { const k = ((a + Math.PI) / (Math.PI / 3)) % 1; return k < 0.35 ? mix(edge, lit) : mix(col, lit); }
      if (d > r - 3) return mix(col, -0.3 + lit);
      return mix(col, 0.12 + lit);
    });
    const side = mix(col, -0.45);
    for (let k = 0; k < n; k++) { const yy = Math.round(y - k * 2); rect('rgba(0,0,0,0.35)', x - r + 1, yy + r - 1, r * 2, 2); rect(side, x - r + 1, yy + 1, r * 2 - 1, r); ctx.drawImage(img, Math.round(x - r), yy - r); }
  }
  function coin(x, y) { ctx.drawImage(roundSpr('coin', 5, (d, a, dx, dy) => d > 4.4 ? '#6a3a08' : d > 3.4 ? mix('#e8b030', -(dx + dy) * 0.05) : (dx + dy < -3 ? '#fff0a0' : (Math.abs(dx) < 1 && Math.abs(dy) < 2.5) || (Math.abs(dy) < 1 && Math.abs(dx) < 2.5) ? '#b07a18' : '#d89a28')), Math.round(x - 5), Math.round(y - 5)); }
  function ball(x, y) { rect('rgba(0,0,0,0.45)', Math.round(x) - 1, Math.round(y) + 1, 4, 2); ctx.drawImage(roundSpr('ball', 2, (d, a, dx, dy) => d > 1.9 ? '#8a8a98' : dx + dy < -1 ? '#ffffff' : '#e8e8f0'), Math.round(x - 2), Math.round(y - 2)); }
  function bead(x, y, r, col) { ctx.drawImage(roundSpr('bead' + col + r, r, (d, a, dx, dy) => d > r - 0.6 ? mix(col, -0.6) : dx + dy < -r * 0.9 ? mix(col, 0.6) : mix(col, -(dx + dy) / (r * 4))), Math.round(x - r), Math.round(y - r)); }

  // ---- slot symbols: sprites at whole sizes only, a drawn 7 and a drawn WILD card
  const SPR = { kernel: ['kernel', 2], pop: ['pop', 2], cup: ['cup', 1], tub: ['tub', 1], vhs: ['vhs', 1], gregg: ['portrait_gregg', 1], tim: ['portrait_tim', 1], card: ['card', 1] };
  const BOSSES = [['w10_portrait_rat', 10], ['w11_portrait_new', 11], ['w12_portrait_amato', 12]];
  if (DD.loadSprites) DD.loadSprites(['kernel', 'pop', 'cup', 'tub', 'vhs', 'portrait_gregg', 'portrait_tim', 'card', 'gregg', 'tim', 'w10_portrait_rat', 'w11_portrait_new', 'w12_portrait_amato', 'w2_curtain', 'w11_portrait_new_manor', 'w11_seniors', 'w11_bingosign', 'w11_cork', 'w11_lino']);
  const SEVEN = (() => {   // a 16 x 22 seven: outline, body, lit edge, shaded edge
    const W = 16, H = 22, inS = (x, y) => (y >= 1 && y <= 4 && x >= 1 && x <= 14) || (y > 4 && y <= 20 && x >= Math.round(10.5 - (y - 5) * 0.42) && x < Math.round(10.5 - (y - 5) * 0.42) + 4);
    const g = []; for (let y = 0; y < H; y++) { let row = ''; for (let x = 0; x < W; x++) { if (inS(x, y)) row += !inS(x - 1, y) || !inS(x, y - 1) ? 'l' : !inS(x + 1, y) || !inS(x, y + 1) ? 'd' : 'r'; else row += [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inS(x + a, y + b)) ? 'k' : '.'; } g.push(row); }
    return g;
  })();
  function sevenSym(cx, cy, tt, hot) { const pal = { k: '#3a0806', r: hot ? rainbow(0, tt) : '#e8302a', l: '#ff9a7a', d: '#9a1410' }; if (hot) glow(cx, cy, 18, '#ff6a4a', 0.3); pmap(SEVEN, pal, Math.round(cx - 8), Math.round(cy - 11)); }
  function wildSym(cx, cy, tt) {
    const x = Math.round(cx - 13), y = Math.round(cy - 9);
    rrect(x - 1, y - 1, 28, 20, 3, rainbow(0, tt)); rrect(x, y, 26, 18, 2, '#7ad8e8'); rect('#c8f4fa', x + 2, y + 1, 22, 1); rect('#3a98b0', x + 2, y + 16, 22, 1);
    rect('#2a6a8a', x + 3, y + 3, 20, 1); text('WILD', cx, y + 7, '#10304a', 1, null, 'center'); rect('#2a6a8a', x + 3, y + 13, 20, 1);
    if (Math.floor(tt / 10) % 3 === 0) { rect('#fff', x + 21, y + 2, 1, 3); rect('#fff', x + 20, y + 3, 3, 1); }
  }
  function sym(k, cx, cy, alpha = 1, face = 0, tt = 0, hot = false) {   // a reel symbol centred on cx, cy
    const n = SYM[k];
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (n === 'seven') sevenSym(cx, cy, tt, hot);
    else if (n === 'wild') wildSym(cx, cy, tt);
    else if (n === 'boss') spr(BOSSES[face % 3][0], cx, cy + 12);
    else { const [im, sc] = SPR[n]; spr(im, cx, cy + (n === 'pop' ? 10 : n === 'kernel' ? 13 : 12), false, sc, sc); }
    ctx.globalAlpha = 1;
  }
  const IC = {   // 8 x 8 pay-table icons, drawn for the size (no shrunk sprites)
    kernel: [['..ww.w..', '.wwwwww.', 'wwywwwww', 'wwwwwyww', '.wwywww.', '..wwww..', '...yy...', '........'], { w: '#fff6e0', y: '#f0c040' }],
    pop: [['..y.yy..', '.yyyyyy.', '.rrrrrr.', '.rrrrrr.', '.wwwwww.', '.rrrrrr.', '.rrrrrr.', '.dddddd.'], { y: '#fff0b0', r: '#d8202c', w: '#f4ece0', d: '#8a1018' }],
    cup: [['....s...', '...s....', '.rrrrrr.', '.wwwwww.', '.rrrrrr.', '..wwww..', '..rrrr..', '..dddd..'], { s: '#e8e8f0', r: '#d8202c', w: '#f4ece0', d: '#8a1018' }],
    tub: [['.yywyyw.', 'yyyyyyyy', 'rwrwrwrw', 'rwrwrwrw', 'rwrwrwrw', 'rwrwrwrw', '.rwrwrw.', '.dddddd.'], { y: '#fff0b0', w: '#f4ece0', r: '#d8202c', d: '#8a1018' }],
    vhs: [['kkkkkkkk', 'kwwwwwwk', 'kwrrrrwk', 'kkkkkkkk', 'kgkkkkgk', 'kggkkggk', 'kkkkkkkk', '........'], { k: '#1a1418', w: '#f0e0c0', r: '#d8202c', g: '#8a8a98' }],
    tim: [['..hhhh..', '.hhhhhh.', '.hssssh.', '.sesses.', '.ssssss.', '.bbssbb.', '..bbbb..', '.cccccc.'], { h: '#5a3a20', s: '#f0c090', e: '#20140a', b: '#6a4428', c: '#2a2a34' }],
    gregg: [['..hhhh..', '.hhhhhh.', 'hhsssshh', 'hsessesh', 'hhsssshh', 'h.ssss.h', '.jjwwjj.', 'jjjwwjjj'], { h: '#1a1418', s: '#f0c090', e: '#20140a', j: '#a8202a', w: '#f0f0f0' }],
    boss: [['y.y.y...', 'yyyyy...', '.gggg.p.', 'ggkgggpp', 'gggggggg', '.ggggggp', '..gg.gg.', '........'], { y: '#f0c040', g: '#a0a0b0', k: '#000', p: '#f0a0b0' }],
    seven: [['kkkkkkkk', 'krrrrrrk', 'kkkkkrrk', '....krk.', '...krk..', '...krk..', '..krk...', '..kkk...'], { k: '#ffd27a', r: '#e8302a' }],
    wild: [['xxxxxxxx', 'xkxxxxkx', 'xkxxxxkx', 'xkxkkxkx', 'xkkxxkkx', 'xkxxxxkx', 'xxxxxxxx', '........'], { k: '#10304a' }],
  };
  const icon = (k, x, y, tt) => { const I = IC[SYM[k]]; pmap(I[0], I[1], x, y, 1, tt); };

  // ---- cards: 18 x 26, rounded, pips, court frames, a red HEI back
  const SUIT = [['..x..', '.xxx.', 'xxxxx', '..x..', '.xxx.'], ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'], ['..x..', '.xxx.', 'xxxxx', '.xxx.', '..x..'], ['.xxx.', 'x.x.x', 'xxxxx', '..x..', '.xxx.']];
  const suit = (s, x, y, col, sc = 1) => { ctx.fillStyle = col; SUIT[s].forEach((row, r) => { for (let c = 0; c < 5; c++) if (row[c] === 'x') ctx.fillRect(x + c * sc, y + r * sc, sc, sc); }); };
  const CROWN = ['x.x.x', 'xxxxx', 'xxxxx'];
  function card(c, x, y, flip = 1) {   // flip (0-1) squeezes it for the turn-over; below 0 shows the back
    x = Math.round(x); y = Math.round(y);
    const w = Math.max(2, Math.round(18 * Math.abs(flip))), ox = x + Math.round((18 - w) / 2);
    rect('rgba(0,0,0,0.35)', ox + 1, y + 2, w, 26);
    rrect(ox - 1, y - 1, w + 2, 28, 2, '#1a1014');
    if (c.hide || flip < 0) {
      rrect(ox, y, w, 26, 1, '#a8202a');
      if (w > 10) { for (let j = 2; j < 24; j += 2) for (let i = 2 + (j % 4 ? 1 : 0); i < w - 2; i += 2) rect('#8a1420', ox + i, y + j, 1, 1); rect('#e8b030', ox + 2, y + 2, w - 4, 1); rect('#e8b030', ox + 2, y + 23, w - 4, 1); rect('#e8b030', ox + 2, y + 2, 1, 22); rect('#e8b030', ox + w - 3, y + 2, 1, 22); if (w > 14) { rect('#a8202a', ox + 3, y + 10, w - 6, 7); text('HEI', ox + w / 2, y + 11, '#ffd27a', 1, null, 'center'); } }
      return;
    }
    rrect(ox, y, w, 26, 1, '#fbf4e6'); rect('#ffffff', ox + 1, y, w - 2, 1); rect('#d8ccb4', ox + 1, y + 25, w - 2, 1);
    if (w < 14) return;
    const red = c.s === 1 || c.s === 2, col = red ? '#d8202c' : '#1a1418';
    text(RANK[c.r], ox + 2, y + 2, col, 1, null); suit(c.s, ox + 2, y + 8, col);
    text(RANK[c.r], ox + w - 2, y + 19, col, 1, null, 'right');
    if (c.r >= 10) { rect('#e8c060', ox + 7, y + 6, 9, 14); rect('#fbf4e6', ox + 8, y + 7, 7, 12); pmap(CROWN, { x: '#d89a28' }, ox + 9, y + 8); text(RANK[c.r], ox + 11, y + 13, col, 1, null); }
    else suit(c.s, ox + 7, y + 9, col, 2);
  }

  // ---- the roulette wheel, rendered pixel by pixel each frame: wood bowl, ball track, pockets with gold frets, cone, turret
  const wcache = {};
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const WC = { wood: hex('#6a3a18'), woodL: hex('#9a5a28'), gold: hex('#e8b030'), goldD: hex('#9a6a18'), track: hex('#b07a40'), red: hex('#c8202c'), blk: hex('#1a1418'), grn: hex('#1a8a3a'), cone: hex('#5a3014'), cone2: hex('#7a4420') };
  function wheelImg(R, ang) {
    const S = R * 2 + 2; let W = wcache[R];
    if (!W) { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); W = wcache[R] = { c, g, id: g.createImageData(S, S) }; }
    const d = W.id.data, n = 37, da = Math.PI * 2 / n;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2, dist = Math.hypot(dx, dy), i4 = (y * S + x) * 4;
      if (dist > R) { d[i4 + 3] = 0; continue; }
      const a = Math.atan2(dy, dx), f = dist / R, lit = Math.cos(a + 2.36);
      let c, k = 0;
      if (f > 0.92) { c = WC.wood; k = 0.18 * lit + 0.08 * Math.sin(a * 23 + f * 30); if (f > 0.97) k -= 0.35; }
      else if (f > 0.89) { c = WC.gold; k = 0.25 * lit; }
      else if (f > 0.73) { c = WC.track; k = 0.22 * lit - (0.89 - f) * 0.8; }
      else if (f > 0.7) c = WC.goldD;
      else if (f > 0.5) {
        const rel = ((a - ang + da / 2) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2), pi = Math.floor(rel / da), fr = rel / da - pi;
        if (fr < 0.1 || f > 0.68) { c = WC.gold; k = 0.2 * lit; } else { const nn = WHEEL[pi]; c = nn === 0 ? WC.grn : REDS.has(nn) ? WC.red : WC.blk; k = -(0.68 - f) * 1.4 + 0.12 * lit; }
      }
      else if (f > 0.47) { c = WC.gold; k = 0.2 * lit; }
      else if (f > 0.15) { const seg = Math.floor((((a - ang) % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 2; c = seg ? WC.cone : WC.cone2; k = 0.2 * lit + (0.47 - f) * 0.4; }
      else { c = WC.gold; k = 0.35 * lit; }
      if (f < 0.44) { for (let q = 0; q < 4; q++) { const aa = ang + q * Math.PI / 2, px = Math.cos(aa), py = Math.sin(aa), along = dx * px + dy * py, perp = Math.abs(-dx * py + dy * px); if (along > 0 && along < R * 0.42 && perp < Math.max(0.8, R * 0.03)) { c = WC.gold; k = 0.3; } } }
      const t = k < 0 ? 0 : 255, kk = Math.min(1, Math.abs(k));
      d[i4] = c[0] + (t - c[0]) * kk; d[i4 + 1] = c[1] + (t - c[1]) * kk; d[i4 + 2] = c[2] + (t - c[2]) * kk; d[i4 + 3] = 255;
    }
    W.g.putImageData(W.id, 0, 0); return W.c;
  }
  function wheel(cx, cy, R, ang, b, flat = 1) {   // flat < 1 squashes it for a table seen at an angle
    const img = wheelImg(R, ang), S = R * 2 + 2;
    ell(cx, cy + 2, R + 1, Math.round((R + 1) * flat), 'rgba(0,0,0,0.4)');
    ctx.drawImage(img, Math.round(cx - S / 2), Math.round(cy - S * flat / 2), S, Math.round(S * flat));
    if (b) ball(cx + Math.cos(b.a) * b.rr, cy + Math.sin(b.a) * b.rr * flat);
  }

  // ---- the set: the theater curtains behind, a gilt valance, a casino carpet underfoot, spotlights
  function room(tt, floorY = 118, dim = 0.62) {
    rect('#120610', 0, 15, VW, VH - 15);
    for (let x = -174 + (-tt * 0.03 % 174); x < VW + 174; x += 174) spr('w2_curtain', x + 87, floorY + 100);
    rect(`rgba(14,4,12,${dim})`, 0, 15, VW, floorY - 15);
    carpet(floorY);
    if (A) { A.trim(0, 15, VW, '#c98f22'); A.fringe(0, 18, VW, '#c98f22'); }
  }
  function carpet(y0) {   // a loud casino carpet: rows grow taller toward you
    rect('#3a0812', 0, y0, VW, VH - y0); rect('#1a0408', 0, y0, VW, 1);
    let y = y0 + 2, h = 4, row = 0;
    while (y < VH) { const off = row % 2 ? 7 : 0; for (let x = -7 + off; x < VW; x += 14) { rect('#6a1424', x + 3, y, 8, Math.max(1, h - 2)); rect('#b07a28', x + 6, y + Math.floor(h / 2) - 1, 2, 2); if (h > 4) rect('#1a6a6a', x, y + 1, 2, 1); } y += h; h = Math.min(9, h + 1); row++; }
  }
  function felt(base, y0 = 15, y1 = VH) { rect(base, 0, y0, VW, y1 - y0); if (A) A.tex(0, y0, VW, y1 - y0, base, 0.06, 3); }
  function btn(x, y, w, h, label, lit, col = '#c98f22', dis = false) {   // a raised button like the menu's: black edge, lit bevel, dark foot
    const base = dis ? '#3a2a30' : lit ? col : '#5a2236';
    rect('#000', x - 1, y - 1, w + 2, h + 3); rect(base, x, y, w, h);
    rect(mix(base, 0.4), x, y, w, 1); rect(mix(base, 0.2), x, y, 1, h); rect(mix(base, -0.45), x, y + h - 1, w, 1); rect(mix(base, -0.35), x + w - 1, y, 1, h);
    text(label, x + w / 2, y + Math.floor((h - 5) / 2), dis ? '#7a6a70' : lit ? '#2a0e1a' : '#ffd27a', 1, null, 'center');
  }
  function led(x, y, w, val, digits, col = '#ffb030') {   // an LED readout: dark glass, ghost 8s, lit digits
    box(x, y, w, 11, '#140808'); const s = String(val).padStart(digits, ' ');
    rect('rgba(255,255,255,0.08)', x + 1, y + 1, w - 2, 1); text(s.trim(), x + w - 3, y + 3, col, 1, null, 'right');
  }
  function wrapT(s, n) { const out = []; let line = ''; for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }
  function bubble(s, x, y, w, tail) { const L = wrapT(s, Math.floor((w - 6) / 4)), h = L.length * 7 + 5; rrect(x - 1, y - 1, w + 2, h + 2, 3, '#1a1014'); rrect(x, y, w, h, 2, '#fff6d4'); rect('#ffffff', x + 2, y, w - 4, 1); if (tail) { rect('#1a1014', x - 4, y + 4, 4, 3); rect('#fff6d4', x - 3, y + 5, 4, 1); } L.forEach((l, i) => text(l, x + 3, y + 3 + i * 7, '#2a0e1a', 1, null)); }
  function betBox(x, y, lit) {   // BET with < > (clickable); the stake used by slots and blackjack
    box(x, y, 54, 26, '#2a1018'); text('BET', x + 27, y + 3, '#c89850', 1, null, 'center');
    led(x + 12, y + 12, 30, BETS[bi], 3, lit ? '#ffd040' : '#c89040');
    btn(x + 2, y + 12, 8, 10, '<', false, '#c98f22', bi === 0); btn(x + 44, y + 12, 8, 10, '>', false, '#c98f22', bi === BETS.length - 1);
  }
  function betClick(c, x, y) { if (inR(c, x, y + 8, 18, 18)) { bump(-1); return true; } if (inR(c, x + 36, y + 8, 18, 18)) { bump(1); return true; } return false; }
  function bump(d) { const n = Math.max(0, Math.min(BETS.length - 1, bi + d)); if (n !== bi) { bi = n; SFX.tick(); } else SFX.buzz(); }
  function arcade(cx, cy, label, lit, col, pressed) {   // a big round arcade button in a chrome ring
    bead(cx, cy + 1, 14, '#6a6a78'); bead(cx, cy, 13, '#c8c8d4');
    const p = pressed ? 1 : 0; bead(cx, cy + 1, 11, mix(col, -0.5)); bead(cx, cy - 1 + p, 11, lit ? col : mix(col, -0.25));
    if (lit) glow(cx, cy, 22, col, 0.18);
    text(label, cx, cy - 3 + p, '#2a0a08', 1, null, 'center');
  }

  // ================================================================ the lobby
  const GAMES = [{ id: 'slots', name: 'LUCKY SEVEN', sub: 'SLOTS' }, { id: 'scratch', name: 'SCRATCHERS', sub: '10 OR 25' }, { id: 'roul', name: 'ROULETTE', sub: 'ONE ZERO' }, { id: 'bj', name: 'BLACKJACK', sub: '3 TO 2' }, { id: 'bingo', name: 'BINGO NIGHT', sub: 'AT THE MANOR' }];
  const GX = i => 34 + i * 63, FLOOR = 126;
  const CAB = i => ({ x: GX(i) - 30, y: 54, w: 60, h: 88 });
  function enter(id) {
    scr = id; t = 0; SFX.switch(); banner = null;
    if (id === 'slots') { S.state = 'idle'; }
    if (id === 'scratch') { K.state = 'pick'; if (freeTix()) say('FREE TICKET! TIM PICKED ONE UP ON THE WAY IN.', 200); }
    if (id === 'roul') { R.state = 'bet'; }
    if (id === 'bingo') { BG.state = BG.state === 'play' ? 'play' : 'bet'; }
    if (id === 'bj') { B.state = 'bet'; B.dealer = 'gregg'; B.dx = 0; B.wins = 0; B.say = 'THE BUFF DEALS. PLACE YOUR BET.'; B.sayT = 200; B.P = []; B.D = []; }
  }
  function lobbyStep(IN, c) {
    if (IN.nx) { lc = mod(lc + IN.nx, GAMES.length); SFX.tick(); }
    if (c) { for (let i = 0; i < GAMES.length; i++) { const R0 = CAB(i); if (inR(c, R0.x, R0.y, R0.w, R0.h)) { if (lc === i) enter(GAMES[i].id); else { lc = i; SFX.tick(); } return; } } }
    else if (IN.ok) enter(GAMES[lc].id);
    if (IN.back) return 'back';
  }
  function slotCab(cx, tt, on) {   // a slot machine: topper, screen with three little reels, chrome, lever, tray
    box(cx - 21, FLOOR - 8, 42, 8, '#2a1a20');
    box(cx - 18, 76, 36, 42, '#a01822'); rect('#c8c8d4', cx - 18, 76, 2, 42); rect('#c8c8d4', cx + 16, 76, 2, 42);
    rbox(cx - 16, 58, 32, 18, 6, '#c98f22'); rrect(cx - 14, 60, 28, 14, 5, '#3a0610');
    logo('777', cx, 62, 1, NEON, null, '#1a0204');
    if (A) A.bulbs(cx - 12, 57, 26, 6, tt + (on ? 0 : 999), '#fffbd0', '#7a4a18');
    box(cx - 14, 80, 28, 18, '#0a0408');
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 13, 81, 26, 16); ctx.clip();
    for (let r = 0; r < 3; r++) { const x = cx - 13 + r * 9; rect('#fff6e8', x, 81, 8, 16); rect('rgba(0,0,0,0.18)', x, 81, 8, 3); rect('rgba(0,0,0,0.18)', x, 94, 8, 3); const p = on ? tt * (0.12 + r * 0.035) : r * 3 + 2; for (let k = -1; k <= 1; k++) { const idx = Math.floor(p) + k; icon(STRIPS[r][mod(idx, STRIPS[r].length)], x, Math.round(85 - (k - (p - Math.floor(p))) * 9), tt); } }
    ctx.restore(); rect('rgba(232,48,42,0.8)', cx - 14, 88, 28, 1);
    if (on) glow(cx, 89, 20, '#ffe6b0', 0.2);
    if (A) A.trim(cx - 18, 100, 36, '#c8c8d4');
    [['#e8302a', -10], ['#ffd040', -3], ['#30c060', 4]].forEach(([c2, dx]) => { rect('#000', cx + dx - 1, 104, 7, 4); rect(c2, cx + dx, 104, 5, 3); rect(mix(c2, 0.5), cx + dx, 104, 5, 1); });
    box(cx - 10, 110, 20, 5, '#9a9aa8'); rect('#2a2028', cx - 8, 111, 16, 3);
    const ly = on ? 80 + Math.round(Math.abs(Math.sin(tt / 18)) * 3) : 80; rect('#000', cx + 19, ly, 3, 98 - ly); rect('#d0d0dc', cx + 20, ly, 1, 98 - ly); box(cx + 18, 96, 4, 6, '#9a9aa8'); bead(cx + 20, ly, 3, '#e8302a');
  }
  function kiosk(cx, tt, on) {   // the scratch-ticket counter: a hanging IN THE MONEY sign, a dispenser of tickets, a glass case
    box(cx - 26, 65, 52, 11, '#1e7a3a'); if (A) A.trim(cx - 26, 65, 52, '#e8c060');
    text('IN THE MONEY', cx, 69, on && Math.floor(tt / 20) % 2 ? '#fff6c0' : '#ffe27a', 1, '#0a3a1a', 'center');
    box(cx - 14, 77, 28, 21, '#2a1a2a');
    [['#1e7a3a', -11], ['#3a2a8a', -3], ['#1e7a3a', 5]].forEach(([c2, dx], i) => { const sw = on ? Math.round(Math.sin(tt / 14 + i)) : 0; rect('#000', cx + dx - 1 + sw, 79, 8, 18); rect(c2, cx + dx + sw, 79, 6, 17); rect('#b8b8c4', cx + dx + 1 + sw, 83, 4, 3); rect('#b8b8c4', cx + dx + 1 + sw, 88, 4, 3); rect('#e8c060', cx + dx + sw, 80, 6, 1); });
    box(cx - 22, 100, 44, FLOOR - 100, '#6a3a18'); if (A) { A.planks(cx - 21, 101, 42, FLOOR - 102, '#6a3a18', 7, true); A.trim(cx - 24, 98, 48, '#c98f22'); }
    box(cx - 17, 105, 34, 10, '#1a2a30'); for (let k = 0; k < 5; k++) rect(k % 2 ? '#3a2a8a' : '#1e7a3a', cx - 15 + k * 7, 107, 5, 7); rect('rgba(255,255,255,0.25)', cx - 16, 105, 8, 1);
    if (on) glow(cx, 68, 22, '#9aff9a', 0.14);
  }
  function rouTable(cx, tt, on) {   // a roulette table seen from the side: legs, a wood rim, felt, the wheel
    box(cx - 22, 106, 4, FLOOR - 106, '#4a2810'); box(cx + 18, 106, 4, FLOOR - 106, '#4a2810'); box(cx - 3, 110, 6, FLOOR - 110, '#c98f22');
    ell(cx, 102, 28, 11, '#2a1408'); ell(cx, 101, 27, 10, '#6a3a18'); ell(cx, 100, 24, 8, '#1a7a3a');
    rect('#9a5a28', cx - 27, 101, 54, 1);
    wheel(cx, 96, 16, on ? tt * 0.05 : 0.4, { a: on ? -tt * 0.09 : 2.2, rr: 12 }, 0.55);
    if (on) glow(cx, 96, 26, '#fff2c0', 0.16);
    chip(cx + 19, 100, 25, 3, 3);
  }
  function bjTable(cx, tt, on) {   // Gregg behind a half-moon table with two cards dealt
    spr('portrait_gregg', cx, 99 + (on ? Math.round(Math.sin(tt / 20)) : 0));
    box(cx - 3, 112, 6, FLOOR - 112, '#4a2810');
    rect('#3a1a10', cx - 27, 98, 54, 3); ell(cx, 100, 27, 12, '#2a1008', 1); ell(cx, 100, 24, 9, '#7a1420', 1); rect('#9a5a28', cx - 27, 98, 54, 1);
    const mini = (x, y, r2, red) => { rect('#1a1014', x - 1, y - 1, 9, 12); rect('#fbf4e6', x, y, 7, 10); text(r2, x + 1, y + 1, red ? '#d8202c' : '#1a1418', 1, null); };
    mini(cx - 9, 101, 'A', false); mini(cx + 1, 102, 'K', true);
    if (on) { text('21', cx + 15, 92, rainbow(0, tt), 1, '#000', 'center'); glow(cx, 100, 24, '#fff2c0', 0.14); }
  }
  function bingoStand(cx, tt, on) {   // the Manor's bingo table: a little BINGO plate, the cage, a resident waiting
    rect('#5a4a30', cx - 16, 70, 1, 30); rect('#5a4a30', cx + 15, 70, 1, 30);
    box(cx - 22, 62, 44, 10, '#f4ece0'); 'BINGO'.split('').forEach((L, k) => text(L, cx - 16 + k * 8, 65, BALLC[k] === '#e8e0d0' ? '#7a6a5a' : BALLC[k], 1, null, 'center'));
    senior(1, cx + 15, 100);
    box(cx - 24, 98, 48, 5, '#6a3a18'); rect('#f4ece0', cx - 24, 98, 48, 1); box(cx - 21, 103, 3, FLOOR - 103, '#4a2810'); box(cx + 18, 103, 3, FLOOR - 103, '#4a2810');
    cage(cx - 6, 84, 10, on ? tt * 0.2 : 0.3, on, tt);
    if (on) { bingoBall(cx - 20, 94, 7 + (Math.floor(tt / 40) * 13) % 68, 5); glow(cx, 86, 24, '#fff2c0', 0.16); }
  }
  function lobbyDraw(tt) {
    room(tt, 110);
    // the sign
    glow(VW / 2, 36, 70, '#ff6a3a', 0.12);
    box(102, 22, 116, 30, '#5a0a14'); rect('#1a0306', 106, 26, 108, 22);
    if (A) { A.bulbs(105, 24, 110, 6, tt); A.bulbs(105, 49, 110, 6, tt + 3); A.bulbs(104, 28, 20, 6, tt + 1, undefined, undefined, true); A.bulbs(216, 28, 20, 6, tt + 5, undefined, undefined, true); }
    logo('CASINO', VW / 2, 30, 3, GOLD, (tt * 1.4) % 220 + 60);
    box(124, 54, 72, 9, '#8a1420'); text('LUCKY SEASON 7', VW / 2, 56, Math.floor(tt / 24) % 2 ? '#fff6c0' : '#ffb0a0', 1, '#3a0408', 'center');
    // the games, each under a light
    GAMES.forEach((g, i) => {
      const cx = GX(i), on = i === lc;
      ell(cx, FLOOR, 24, 3, 'rgba(0,0,0,0.45)');
      if (on && A) A.cone(cx, 15, FLOOR - 15, 34, '#fff2c0', 0.12);
      ctx.save(); if (!on) ctx.globalAlpha = 0.82;
      if (g.id === 'slots') slotCab(cx, tt, on); else if (g.id === 'scratch') kiosk(cx, tt, on); else if (g.id === 'roul') rouTable(cx, tt, on); else if (g.id === 'bj') bjTable(cx, tt, on); else bingoStand(cx, tt, on);
      ctx.restore();
      if (!on) rect('rgba(14,4,12,0.25)', cx - 30, 56, 60, FLOOR - 56);
      const px = cx - 29, py = 131;
      box(px, py, 58, 11, on ? '#c98f22' : '#3a1420');
      text(g.name, cx, py + 3, on ? '#2a0e1a' : '#e8d0b0', 1, null, 'center');
      if (on && A) A.bulbs(px + 2, py - 3, 54, 6, tt);
    });
    if (A) A.vignette(0.4);
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
      if (IN.ok || (c && (inR(c, 266, 102, 36, 34) || inR(c, 232, 38, 16, 62) || inR(c, 100, 50, 106, 90)))) for (let r = 0; r < 3; r++) if (S.st[r] === 'spin') S.at[r] = Math.min(S.at[r], t + 1 + r * 3);   // slam the stops
      if (S.st.every(s => s === 'done')) slotsResult();
      if (IN.back) { /* finish first */ }
      return;
    }
    if (S.state === 'show') { S.show++; S.shown += (S.res.back - S.shown) * 0.12; if (Math.abs(S.res.back - S.shown) < 1) S.shown = S.res.back; if (S.show > 60 && S.show < 62) S.state = 'idle'; }
    if (IN.ny) bump(-IN.ny); if (IN.nx) bump(IN.nx);
    if (c) { if (betClick(c, 258, 40)) return; if (inR(c, 266, 102, 36, 34) || inR(c, 232, 38, 16, 62) || inR(c, 100, 50, 106, 90)) { spin(); return; } }
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
    room(tt, 122, 0.7);
    const show = S.res && S.state !== 'spin', jk = show && S.res.wins.some(w => w.sym === SEV && w.n === 3);
    // the pay table, a lit glass card on the wall
    box(3, 18, 66, 128, '#1a0a12'); rect('#2a1420', 5, 20, 62, 124); if (A) A.trim(5, 20, 62, '#c98f22');
    logo('PAYS', 36, 24, 1); text('PER LINE BET', 36, 31, '#9a8a90', 1, null, 'center');
    const ROWS = [[WILD], [SEV], [BOSS], [6], [5], [6, 5, 6, PAYHOST], [4], [3], [2], [1], [0], [0, 1, 0, PAYPOP], [SEV, SEV, -1, PAY77]];
    ROWS.forEach((row, i) => {
      const y = 39 + Math.round(i * 8.1), ks = row.length === 1 ? [row[0], row[0], row[0]] : row.slice(0, 3), pay = row.length === 1 ? PAY3[row[0]] : row[3];
      const lit = show && S.res.wins.some(w => (row.length === 1 ? w.sym === row[0] && w.n === 3 && w.mult === PAY3[row[0]] : w.mult === row[3]));
      if (lit) rect(Math.floor(tt / 6) % 2 ? '#5a2a10' : '#3a1a10', 6, y - 1, 60, 9);
      ks.forEach((k, j) => { if (k >= 0) icon(k, 8 + j * 9, y, tt); else text('ANY', 26, y + 1, '#9a8a90', 1, null); });
      text(String(pay), 64, y + 1, row[0] === SEV ? '#ff7a5a' : row[0] === WILD ? rainbow(i, tt) : lit ? '#ffe680' : '#fff6d4', 1, null, 'right');
    });
    // the cabinet
    box(86, 42, 148, 106, '#a01822'); rect('#7a1018', 88, 140, 144, 6);
    box(86, 42, 7, 106, '#b8b8c8'); box(227, 42, 7, 106, '#b8b8c8');
    for (let y = 46; y < 146; y += 8) { rect('#e8e8f0', 88, y, 2, 1); rect('#e8e8f0', 229, y, 2, 1); }
    rbox(98, 17, 124, 27, 9, '#c98f22'); rrect(101, 20, 118, 21, 7, '#3a0610');
    if (A) A.bulbs(108, 18, 106, 6, tt);
    glow(160, 30, 50, jk ? '#ffe680' : '#ff5a3a', jk ? 0.3 : 0.14);
    logo('LUCKY SEVEN', 160, 26, 2, jk ? GOLD : NEON, (tt * 1.6) % 260 + 30, '#1a0204', '#5a0a10');
    box(100, 45, 120, 92, '#b8b8c8'); rect('#000', 103, 47, 114, 88);
    ctx.save(); ctx.beginPath(); ctx.rect(104, 48, 112, 86); ctx.clip();
    for (let r = 0; r < 3; r++) {
      const x = RX(r); rect('#fff6e8', x - 15, 48, 30, 86);
      const p = S.pos[r], f = p - Math.floor(p), blur = S.st[r] === 'spin' && S.spd[r] > 0.5;
      for (let k = -2; k <= 2; k++) { const idx = Math.floor(p) + k, y = RY - (k - f) * CELL, s0 = STRIPS[r][mod(idx, STRIPS[r].length)]; sym(s0, x, y, blur ? 0.5 : 1, S.face, tt, jk && s0 === SEV && k === 0); if (blur) sym(s0, x, y - 8, 0.22, S.face, tt); }
      for (let b = 0; b < 4; b++) { const a = (0.26 - b * 0.06).toFixed(2); rect(`rgba(40,10,10,${a})`, x - 15, 48 + b * 4, 30, 4); rect(`rgba(40,10,10,${a})`, x - 15, 130 - b * 4, 30, 4); }   // the drum curves away
      rect('rgba(255,255,255,0.35)', x - 15, 48, 1, 86); rect('rgba(0,0,0,0.25)', x + 14, 48, 1, 86);
      if (r < 2) { rect('#1a0306', x + 15, 48, 4, 86); rect('#5a0a14', x + 16, 48, 2, 86); }
    }
    if (show && S.res.wins.length) {   // the winning line, blinking, each counted symbol boxed
      const w = S.res.wins[Math.floor(tt / 30) % S.res.wins.length], L = LINES[w.line], blink = Math.floor(tt / 6) % 2 || S.show < 30, col = LINE_COL[w.line];
      if (blink) for (let r = 0; r < 3; r++) { const x0 = r ? RX(r - 1) : RX(0) - 18, y0 = r ? RY + (L[r - 1] - 1) * CELL : RY + (L[0] - 1) * CELL, x1 = RX(r), y1 = RY + (L[r] - 1) * CELL, n = Math.max(Math.abs(x1 - x0), 1); for (let i = 0; i <= n; i += 1) { const yy = Math.round(y0 + (y1 - y0) * i / n); rect('#000', x0 + i, yy - 1, 1, 4); rect(col, x0 + i, yy, 1, 2); } }
      for (let r = 0; r < w.n; r++) { const x = RX(r), y = RY + (L[r] - 1) * CELL, c2 = blink ? col : '#fff'; rect(c2, x - 14, y - 13, 28, 1); rect(c2, x - 14, y + 12, 28, 1); rect(c2, x - 14, y - 13, 1, 26); rect(c2, x + 13, y - 13, 1, 26); }
    }
    ctx.globalAlpha = 0.07; for (let k = 0; k < 18; k++) rect('#ffffff', 112 + k, 48 + k * 5, 18, 5); ctx.globalAlpha = 1;   // a glare across the glass
    ctx.restore();
    if (S.tease && S.st[2] === 'spin') { const g = Math.floor(tt / 3) % 2 ? '#ffe680' : '#e8302a'; rect(g, RX(2) - 16, 46, 32, 2); rect(g, RX(2) - 16, 134, 32, 2); glow(RX(2), 90, 30, '#ffe680', 0.2); }
    for (let i = 0; i < 5; i++) { const L = LINES[i], lit = show && S.res.wins.some(w => w.line === i), yl = RY + (L[0] - 1) * CELL + (i > 2 ? (i === 3 ? -6 : 6) : 0), yr = RY + (L[2] - 1) * CELL + (i > 2 ? (i === 3 ? 6 : -6) : 0); bead(97, yl, 2, lit ? LINE_COL[i] : '#5a2a30'); bead(223, yr, 2, lit ? LINE_COL[i] : '#5a2a30'); }
    const wv = S.state === 'show' ? Math.round(S.shown) : S.res ? S.res.back : 0;
    text('WIN', 128, 140, '#ffd27a', 1, null); led(142, 137, 50, wv, 5, wv ? (S.show < 60 && Math.floor(tt / 4) % 2 ? '#fff6c0' : '#ffb030') : '#ffb030');
    // the lever
    const k = S.lever < 24 ? Math.sin(S.lever / 24 * Math.PI) : 0, ky = Math.round(46 + k * 42);
    box(234, 80, 8, 14, '#9a9aa8');
    rect('#000', 238, Math.min(ky, 84) - 1, 3, Math.abs(84 - ky) + 2); rect('#e0e0ec', 239, Math.min(ky, 84), 1, Math.abs(84 - ky));
    bead(239, ky, 5, '#e8302a');
    // the right panel
    betBox(258, 40, S.state !== 'spin'); text('5 LINES', 285, 70, '#c89850', 1, '#000', 'center'); text('LINE BET ' + BETS[bi] / 5, 285, 78, '#c89850', 1, '#000', 'center');
    const sp = S.state === 'spin';
    arcade(284, 118, sp ? 'STOP' : 'SPIN', sp || Math.floor(tt / 20) % 2 === 0, sp ? '#ff5a40' : '#ffd040', S.lever < 8);
    if (A) A.vignette(0.3);
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
    const T = TIX[kind], money = kind === 0, base = money ? '#1e7a3a' : '#3a2a8a', lite = money ? '#2a9a4a' : '#5a4ab0', ink = money ? '#0a3a1a' : '#1a1050';
    rect('rgba(0,0,0,0.4)', x + 3, y + 3, w, h);
    rect('#e8c060', x, y, w, h); rect('#fff0a0', x, y, w, 1); rect('#a87a20', x, y + h - 1, w, 1);
    rect(base, x + 2, y + 2, w - 4, h - 4);
    for (let yy = y + 4; yy < y + h - 4; yy += 4) for (let xx = x + 3; xx < x + w - 3; xx++) { const o = Math.round(Math.sin((xx + yy * 0.7) / 5) * 1.5); if ((xx + o) % 6 === 0) rect(lite, xx, yy + o, 1, 1); }   // guilloche, like money
    for (let xx = x + 2; xx < x + w - 2; xx += 3) { rect('#1a1014', xx, y - 1, 1, 1); rect('#1a1014', xx, y + h, 1, 1); }   // perforations
    if (A) { A.trim(x + 4, y + 4, w - 8, '#e8c060'); A.trim(x + 4, y + h - 7, w - 8, '#e8c060'); }
    if (small) {
      logo(money ? 'IN THE MONEY' : 'LUCKY DIP', x + w / 2, y + 10, 1);
      rect('#c8202c', x + 18, y + 18, w - 36, 9); text('TOP PRIZE ' + T.top, x + w / 2, y + 20, '#fff6d4', 1, null, 'center');
      if (money) for (let i = 0; i < 9; i++) foilBit(x + 20 + (i % 3) * 28, y + 31 + Math.floor(i / 3) * 14, 24, 11);
      else { foilBit(x + w - 36, y + 30, 26, 13); for (let i = 0; i < 6; i++) foilBit(x + 10 + (i % 3) * 34, y + 47 + Math.floor(i / 3) * 13, 30, 10); }
      text(money ? 'MATCH 3 AMOUNTS' : 'MATCH YOUR DIP', x + w / 2, y + h - 16, money ? '#cfe8d0' : '#d0c8f0', 1, null, 'center');
      return;
    }
    if (money) {
      logo('IN THE MONEY', x + w / 2, y + 9, 2, GOLD, null, ink, '#06200e');
      rect('#c8202c', x + 40, y + 21, w - 80, 8); rect('#e84a3a', x + 40, y + 21, w - 80, 1); text('TOP PRIZE ' + T.top, x + w / 2, y + 22, '#fff6d4', 1, null, 'center');
      if (tk) regionsOf(tk).forEach((r, i) => { const v = tk.cells[i], win = K.state === 'done' && v === tk.prize, pulse = win && Math.floor(tt / 8) % 2; box(x + r.x, y + r.y, r.w, r.h, pulse ? '#ffe680' : '#f4ece0', { outline: '#0a3a1a' }); text(String(v), x + r.x + r.w / 2, y + r.y + 5, v === 1000 ? '#c8202c' : '#1e5a2a', 2, null, 'center'); if (win) glow(x + r.x + r.w / 2, y + r.y + r.h / 2, 18, '#ffe680', 0.2); });
      text('MATCH 3 AMOUNTS: WIN THAT AMOUNT', x + w / 2, y + h - 12, '#cfe8d0', 1, ink, 'center');
    } else {
      logo('LUCKY DIP', x + 50, y + 9, 2, GOLD, null, ink, '#0a0830');
      rect('#c8202c', x + 14, y + 22, 72, 8); rect('#e84a3a', x + 14, y + 22, 72, 1); text('TOP PRIZE ' + T.top, x + 50, y + 23, '#fff6d4', 1, null, 'center');
      if (tk) regionsOf(tk).forEach((r, i) => {
        if (r.dip) { box(x + r.x, y + r.y, r.w, r.h, '#f4ece0', { outline: ink }); drawSpr(tk.dip, x + r.x + r.w / 2, y + r.y + r.h - 2); return; }
        const s = tk.spots[i - 1], win = K.state === 'done' && s.sym === tk.dip, pulse = win && Math.floor(tt / 8) % 2;
        box(x + r.x, y + r.y, r.w, r.h, pulse ? '#ffe680' : '#f4ece0', { outline: ink }); drawSpr(s.sym, x + r.x + 12, y + r.y + r.h - 2, true); text(String(s.prize), x + r.x + r.w - 2, y + r.y + 8, '#3a2a8a', 1, null, 'right');
        if (win) glow(x + r.x + r.w / 2, y + r.y + r.h / 2, 18, '#ffe680', 0.2);
      });
      text('YOUR DIP', x + 118, y + 11, '#fff6d4', 1, ink, 'center');
      text('MATCH YOUR DIP: WIN THE PRIZE', x + w / 2, y + h - 12, '#d0c8f0', 1, ink, 'center');
    }
  }
  function foilBit(x, y, w, h) { rect('#6a6a78', x - 1, y - 1, w + 2, h + 2); rect('#a8a8b8', x, y, w, h); rect('#d8d8e4', x, y, w, 1); for (let d = 0; d < w + h; d += 6) for (let k = 0; k < h; k++) { const xx = d - k; if (xx >= 0 && xx < w) rect('#c4c4d0', x + xx, y + k, 1, 1); } }
  function drawSpr(n, cx, by, mini) {   // ticket art: sprites at whole sizes only (the blue card gets its own little drawing)
    if (n === 'card') { const x = Math.round(cx - 9), y = Math.round(by - 10); rrect(x - 1, y - 1, 20, 12, 2, '#2a6a8a'); rrect(x, y, 18, 10, 1, '#7ad8e8'); rect('#c8f4fa', x + 2, y + 1, 14, 1); rect('#2a6a8a', x + 3, y + 4, 12, 1); rect('#2a6a8a', x + 3, y + 6, 8, 1); return; }
    if (mini) { const k = SYM.indexOf(n); if (k >= 0) { pmap(IC[n][0], IC[n][1], Math.round(cx - 8), Math.round(by - 16), 2); return; } }
    const e = SPR[n]; if (e) spr(e[0], cx, by, false, e[0] === 'kernel' || e[0] === 'pop' ? 1 : 1, 1);
  }
  function scratchDraw(tt) {
    // the shop: wood panelling, a counter, the ticket under a lamp
    rect('#2a160c', 0, 15, VW, 85); if (A) { A.planks(0, 15, VW, 85, '#3a2214', 12, true); A.trim(0, 15, VW, '#c98f22'); }
    if (K.state !== 'pick') {
    box(6, 22, 70, 46, '#1a2a30'); rect('rgba(255,255,255,0.12)', 8, 24, 30, 1);   // a case of tickets on the wall
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const c2 = (r + k) % 3 === 1 ? '#3a2a8a' : '#1e7a3a'; rect('#000', 10 + k * 11, 26 + r * 14, 9, 12); rect(c2, 11 + k * 11, 27 + r * 14, 7, 10); rect('#b8b8c4', 12 + k * 11, 30 + r * 14, 5, 3); }
    box(244, 22, 70, 30, '#1e7a3a'); if (A) A.trim(244, 22, 70, '#e8c060'); text('IN THE', 279, 28, '#ffe27a', 1, '#0a3a1a', 'center'); text('MONEY', 279, 37, '#ffe27a', 1, '#0a3a1a', 'center'); text('SOLD HERE', 279, 45, '#cfe8d0', 1, null, 'center');
    }
    rect('#5a3014', 0, 100, VW, 49); if (A) { A.planks(0, 100, VW, 49, '#6a3a18', 7); A.trim(0, 98, VW, '#c98f22'); }
    glow(160, 76, 110, '#fff2c0', 0.14);
    if (K.state === 'pick') {
      logo('PICK A TICKET', VW / 2, 18, 2);
      for (let i = 0; i < 2; i++) {
        const on = K.pick === i, lift = on ? Math.round(Math.abs(Math.sin(tt / 12)) * 3) : 0, x = 30 + i * 140, y = 36 - lift;
        if (on) glow(x + 60, y + 46, 70, '#fff2c0', 0.18);
        ticketArt(i, x, y, 120, 90, null, tt, true);
        if (!on) rect('rgba(20,8,4,0.35)', x, y, 120, 90);
        const free = i === 0 && freeTix(), price = unl() ? 'FREE' : free ? 'FREE TICKET!' : TIX[i].price + ' HEI POINTS';
        box(x + 24, 132, 72, 11, on ? '#c98f22' : '#3a1420'); text(price, x + 60, 135, free ? rainbow(0, tt) : on ? '#2a0e1a' : '#c8b8c0', 1, null, 'center');
      }
      return;
    }
    const tk = K.tk;
    ticketArt(tk.kind, TX, TY, TW, TH, tk, tt, false);
    ctx.drawImage(K.foil, TX, TY);
    K.regions.forEach(r => { if (r.open && t - r.pop < 10) { const k = (t - r.pop) / 10, c2 = `rgba(255,246,212,${(1 - k).toFixed(2)})`, x0 = Math.round(TX + r.x - k * 4), y0 = Math.round(TY + r.y - k * 4), w0 = Math.round(r.w + k * 8), h0 = Math.round(r.h + k * 8); rect(c2, x0, y0, w0, 1); rect(c2, x0, y0 + h0, w0, 1); rect(c2, x0, y0, 1, h0); rect(c2, x0 + w0, y0, 1, h0); } });
    if (K.state === 'scratch' && !K.mouse) coin(K.coin.x, K.coin.y);
    // side cards
    box(6, 74, 70, 22, '#f4ece0'); text(K.free ? 'FREE TICKET' : unl() ? 'FREE PLAY' : 'PAID ' + TIX[tk.kind].price, 41, 78, K.free ? '#c8202c' : '#3a2a1a', 1, null, 'center'); text(tk.kind ? 'TOP PRIZE 500' : 'TOP PRIZE 1000', 41, 87, '#7a5a3a', 1, null, 'center');
    if (K.state === 'scratch') {
      box(244, 58, 70, 38, '#f4ece0'); ['DRAG TO SCRATCH', 'OR STEER THE', 'COIN. ' + (DD.padUsed ? 'CROSS' : 'JUMP') + ':', 'SCRATCH IT ALL'].forEach((l, i) => text(l, 279, 62 + i * 8, '#3a2a1a', 1, null, 'center'));
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
      let rel = R.target - R.laps * (1 - e), rr = 38;   // the ball's angle on the wheel, counter to the spin, landing on its number
      if (k > 0.62) { const f = Math.min(1, (k - 0.62) / 0.1); rr = 38 - f * 11; }
      if (k > 0.72 && k < 0.95) { const q = (k - 0.72) / 0.23; rr += Math.abs(Math.sin(q * 22)) * 4 * (1 - q); rel += Math.sin(q * 9) * 0.17 * (1 - q); }
      R.ball = { a: R.wa + rel, rr };
      const pk = Math.floor(mod(rel, Math.PI * 2) / (Math.PI * 2 / 37)); if (pk !== R.tk) { R.tk = pk; if (k > 0.6) tone(2400 + rnd(600), 2200, 0.012, 'square', 0.03); else if (R.T % 3 === 0) tone(1600, 1500, 0.01, 'square', 0.01); }
      if (k >= 1) rouletteResult();
      if (IN.ok && R.T < DUR - 40) R.T = Math.max(R.T, DUR - 40);   // hurry it along
      return;
    }
    if (R.state === 'show') { R.ball = { a: R.wa + R.target, rr: 27 }; R.k++; if (R.k > 90 || (R.k > 20 && (IN.ok || c))) { R.state = 'bet'; R.bets = {}; } if (R.state === 'show') { if (IN.back) { R.state = 'bet'; R.bets = {}; } return; } }
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
    felt('#0e4a24', 15, 149);
    rect('#3a1c0c', 0, 15, VW, 3); if (A) A.trim(0, 18, VW, '#c98f22');
    glow(62, 84, 80, '#fff2c0', 0.1); glow(220, 60, 110, '#fff2c0', 0.08);
    // the wheel in its wooden housing
    rbox(8, 33, 108, 102, 14, '#4a2410'); if (A) A.tex(10, 35, 104, 98, '#4a2410', 0.08, 5);
    wheel(62, 84, 46, R.wa, R.ball);
    text('LAST', 8, 21, '#9ac8a0', 1, null); R.hist.forEach((n, i) => { if (i > 7) return; box(26 + i * 11, 20, 10, 8, numCol(n)); text(String(n), 31 + i * 11, 22, '#fff', 1, null, 'center'); });
    if (R.state === 'show' || (R.state === 'bet' && R.hist.length)) { const n = R.hist[0], pulse = R.state === 'show' && Math.floor(tt / 6) % 2; box(44, 133, 36, 13, numCol(n)); logo(String(n), 62, 136, 1, pulse ? GOLD : ['#ffffff', '#ffffff', '#f0f0f0', '#d8d8d8', '#c0c0c0'], '#000'); }
    // the board
    SPOTS.forEach((s, i) => {
      const cur = i === R.cur && R.state === 'bet', hit = R.state === 'show' && (s.id === 'n' + R.n || (rouletteWins(s.id, R.n) > 0 && !s.ctl && s.n === undefined && s.id !== 'n0'));
      if (s.ctl) {
        const lit = cur || (s.id === 'vfa' && R.vfa) || (s.id === 'spin' && R.state === 'bet' && (tableTotal() > 0 || R.last));
        const lab = s.id === 'spin' && !tableTotal() && R.last ? 'REBET' : s.label;
        btn(s.x, s.y, s.w, s.h, lab, lit, s.id === 'vfa' ? (R.vfa && Math.floor(tt / 5) % 2 ? '#ff6a4a' : '#e8302a') : s.id === 'spin' ? '#ffd27a' : '#c98f22', R.state !== 'bet');
        if (cur) { rect('#fff6c0', s.x - 2, s.y - 2, s.w + 4, 1); rect('#fff6c0', s.x - 2, s.y + s.h + 2, s.w + 4, 1); }
        return;
      }
      const bg = s.n !== undefined ? numCol(s.n) : s.id === 'n0' ? numCol(0) : s.id === 'red' ? '#c8202c' : s.id === 'black' ? '#1a1418' : '#0e4a24';
      rect('#e8d8b0', s.x, s.y, s.w + 1, s.h + 1);
      const fill = hit ? (Math.floor(tt / 6) % 2 ? '#ffe680' : bg) : bg;
      rect(fill, s.x + 1, s.y + 1, s.w - 1, s.h - 1); rect(mix(fill, 0.25), s.x + 1, s.y + 1, s.w - 1, 1); rect(mix(fill, -0.3), s.x + 1, s.y + s.h - 1, s.w - 1, 1);
      if (s.n === 7) { rect('rgba(255,214,90,' + (0.2 + 0.15 * Math.sin(tt / 8)).toFixed(2) + ')', s.x + 1, s.y + 1, s.w - 1, s.h - 1); }
      text(s.label, s.x + s.w / 2 + 1, s.y + Math.floor((s.h - 5) / 2) + 1, '#fff6d4', 1, s.n !== undefined || s.id === 'n0' ? '#000' : null, 'center');
      if (cur) { const g = Math.floor(tt / 6) % 2 ? '#ffe680' : '#fff'; rect(g, s.x - 1, s.y - 1, s.w + 3, 1); rect(g, s.x - 1, s.y + s.h + 1, s.w + 3, 1); rect(g, s.x - 1, s.y - 1, 1, s.h + 3); rect(g, s.x + s.w + 1, s.y - 1, 1, s.h + 3); }
      if (R.bets[s.id]) chip(s.x + Math.floor(s.w / 2) + 1, s.y + Math.floor(s.h / 2), R.bets[s.id], s.w < 15 ? 4 : 5, Math.min(3, 1 + Math.floor(R.bets[s.id] / 50)));
    });
    led(178, 106, 24, BETS[bi], 3, '#ffd040'); text('CHIP', 190, 98, '#9ac8a0', 1, null, 'center');
    const s = SPOTS[R.cur], on = R.bets[s.id] || 0, tot = tableTotal();
    text('ON THE TABLE', 120, 126, '#9ac8a0', 1, null); led(172, 124, 30, tot, 4, '#ffd040');
    if (!s.ctl) text(s.label + ' PAYS ' + (s.id[0] === 'n' ? '35' : s.id[0] === 'd' || s.id[0] === 'c' ? '2' : '1') + ' TO 1' + (on ? '. YOU HAVE ' + on : ''), 120, 138, '#cfe8d0', 1, null);
    else if (s.id === 'vfa') text('ALL IN ON ' + SPOTS.find(q => q.id === (R.lastSpot || 'red')).label + '. GREGG BET THE VFA', 120, 138, '#ff8a6a', 1, null);
    if (R.state === 'show' && R.won) logo('WON ' + R.won, 270, 126, 1, GOLD, null);
    if (A) A.vignette(0.3);
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
    // the wall behind the dealer, two lamps over the table
    rect('#120610', 0, 15, VW, 45);
    for (let x = -174 + (-tt * 0.03 % 174); x < VW + 174; x += 174) spr('w2_curtain', x + 87, 160);
    rect('rgba(14,4,12,0.6)', 0, 15, VW, 45); if (A) { A.trim(0, 15, VW, '#c98f22'); A.fringe(0, 18, VW, '#c98f22'); }
    const d = DLR[B.dealer], bob = Math.round(Math.sin(tt / 20));
    spr(d.spr, 160 + B.dx, 70 + bob, B.walk > 150 && B.walk < 200);
    // the table: dealer's rail with the chip tray, red felt, our padded rail
    box(0, 54, VW, 7, '#5a3014'); if (A) A.planks(1, 55, VW - 2, 5, '#5a3014', 20, true);
    box(122, 55, 76, 5, '#2a1408'); for (let k = 0; k < 12; k++) { const c2 = CHIPC([5, 10, 25, 50, 100, 5][k % 6]); rect(c2, 124 + k * 6, 56, 5, 3); rect(mix(c2, 0.4), 124 + k * 6, 56, 5, 1); }
    felt('#7a1420', 61, 149);
    for (const lx of [70, 250]) { rect('#5a4a30', lx, 15, 1, 6); box(lx - 9, 21, 19, 6, '#1e5a3a'); rect('#e8c060', lx - 9, 26, 19, 1); if (A) A.cone(lx, 27, 120, 46, '#fff2c0', 0.08); glow(lx, 30, 16, '#fff2c0', 0.3); }
    ell(160, 214, 252, 82, '#1a0806'); ell(160, 215, 250, 80, '#7a3020'); ell(160, 217, 248, 78, '#5a2216'); ell(160, 224, 246, 76, '#3a140e');   // our rail, padded leather
    for (let x = 0; x < VW; x += 4) { const q = (x - 160) / 248; if (Math.abs(q) < 1) rect('#a8604a', x, Math.round(218 - 78 * Math.sqrt(1 - q * q)), 2, 1); }   // its stitching
    const arc = 'BLACKJACK PAYS 3 TO 2'; for (let i = 0; i < arc.length; i++) { const x = 160 - arc.length * 2 + i * 4, y = 90 + Math.round(((x - 160) / 46) ** 2); text(arc[i], x, y, '#e8c060', 1, null); }
    // the dealer's line, the shoe
    if (B.sayT > 0 && B.say) bubble(B.say, 188, 18, 92, B.dx === 0);
    box(284, 30, 30, 22, '#2a1a10'); rect('#4a2a18', 286, 32, 26, 3); for (let k = 0; k < 6; k++) rect(k % 2 ? '#e8e0d0' : '#c8c0b0', 288 + k, 36, 1, 12); card({ hide: true }, 294, 31);
    // hands
    const fly = (c, x, y) => { const k = Math.min(1, (t - (c.t0 || 0)) / 9), e = 1 - Math.pow(1 - k, 2); return [300 + (x - 300) * e, 34 + (y - 34) * e]; };
    B.D.forEach((c, i) => { const [x, y] = fly(c, handX(B.D, i, 160), 62); const f = !c.hide && i === 1 && B.flipT < 12 ? (B.flipT < 6 ? -(1 - B.flipT / 6) : (B.flipT - 6) / 6) : 1; card(f < 0 ? Object.assign({}, c, { hide: true }) : c, x, y, f || 0.1); });
    B.P.forEach((c, i) => { const [x, y] = fly(c, handX(B.P, i, 160), 100); card(c, x, y); });
    const badge = (h, x, y) => { if (!h.length) return; const hv = handV(h), s = (hv.soft && hv.v < 21 ? hv.v - 10 + '/' : '') + hv.v; rbox(x - 12, y, 24, 9, 2, hv.v > 21 ? '#7a1018' : hv.v === 21 ? '#c98f22' : '#2a1018'); text(s, x, y + 2, hv.v > 21 ? '#ffb0a0' : hv.v === 21 ? '#2a0e1a' : '#fff6d4', 1, null, 'center'); };
    badge(B.D, 160 - B.D.length * 7 - 20, 70); badge(B.P, 160 - B.P.length * 7 - 20, 108);
    // the bet circle
    for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2; rect('#e8c060', Math.round(80 + Math.cos(an) * 13), Math.round(112 + Math.sin(an) * 9), 1, 1); }
    const st = B.state === 'bet' || (B.state === 'done' && !B.P.length) ? BETS[bi] : B.stake;
    chip(80, 112, st, 5, Math.min(6, Math.ceil(st / 20))); if (B.doubled) chip(92, 114, B.bet, 5, Math.min(6, Math.ceil(B.bet / 20)));
    text(String(st), 80, 124, '#fff6d4', 1, '#000', 'center'); if (B.doubled) text('DOUBLED', 80, 94, '#ff8a6a', 1, '#000', 'center');
    // the rules plaque
    box(6, 66, 54, 22, '#c98f22'); rect('#e8c060', 8, 68, 50, 18); text('DEALER', 33, 70, '#3a1a08', 1, null, 'center'); text('STANDS ON', 33, 76, '#3a1a08', 1, null, 'center'); text('ALL 17S', 33, 82, '#3a1a08', 1, null, 'center');
    text('STREAK ' + B.wins, 33, 94, B.wins >= 2 && B.dealer === 'gregg' ? '#ff8a6a' : '#e8c060', 1, '#000', 'center');
    // the right panel
    if (B.state === 'play') { const canD = B.P.length === 2; ['HIT', 'STAND', 'DOUBLE'].forEach((l, i) => btn(258, 70 + i * 20, 58, 16, l, B.sel === i, i === 2 ? '#ff8a6a' : '#ffd27a', i === 2 && !canD)); }
    else if (B.state === 'bet' || B.state === 'done') { betBox(260, 70, true); const hb = Math.round(Math.abs(Math.sin(tt / 10))); btn(258, 104 - hb, 60, 18, B.state === 'done' ? 'DEAL AGAIN' : 'DEAL', true, '#ffd27a'); }
    if (A) A.vignette(0.3);
  }

  // ================================================================ BINGO NIGHT at Grand Terrace Manor (S16 eps 5-8; the activity room had a BINGO NIGHT sign)
  // New calls, faster every ball. You daub your own card; five residents daub theirs and shout a beat after they're done. First bingo wins.
  const BALLC = ['#d8202c', '#2a6ad8', '#e8e0d0', '#1a9a4a', '#e8a020'];   // B I N G O
  const BG = { state: 'bet', card: null, mark: [], cur: 12, order: [], calls: [], called: new Set(), next: 0, roll: 99, res: [], lock: 0, stake: 0, win: 0, who: -1, say: '', sayT: 0, splat: [], first: true, bad: -1, badT: -99 };
  const bsay = (s, n = 110) => { BG.say = s; BG.sayT = n; };
  const letter = n => 'BINGO'[Math.floor((n - 1) / 15)];
  const BCX = 110, BCY = 57, BCW = 17, BCH = 14;   // the card's grid
  const BUYP = () => BG.state === 'done' ? { bet: { x: 206, y: 96 }, buy: { x: 263, y: 104, w: 50, h: 14 }, box: [204, 92, 112, 32] } : { bet: { x: 126, y: 74 }, buy: { x: 118, y: 104, w: 70, h: 14 }, box: [112, 70, 82, 52] };   // after a round it moves off the card
  function bingoBuy() {
    const bet = BETS[bi]; if (!take(bet)) return;
    BG.stake = bet; BG.card = bingoCard(); BG.mark = BG.card.map(n => n === 0); BG.cur = 12;
    BG.order = shuffle([...Array(75)].map((_, k) => k + 1)); BG.calls = []; BG.called = new Set(); BG.res = [];
    for (let i = 0; i < 5; i++) BG.res.push({ card: bingoCard(), go: 4, shout: 0, react: 26 + rnd(28), bob: 0 });
    BG.state = 'play'; BG.next = t + (BG.first ? 130 : 45); BG.lock = 0; BG.who = -1; BG.win = 0; BG.splat = []; banner = null;
    if (BG.first) { bsay('ONE QUICK ANNOUNCEMENT: THE CASINO SHUTTLE NOW LEAVES AT 10.', 130); BG.first = false; } else bsay('HERE WE GO.', 45);
    tone(392, 523, 0.1, 'square', 0.04);
  }
  function bingoCall() {
    const n = BG.order[BG.calls.length]; BG.calls.push(n); BG.called.add(n); BG.roll = 0;
    const col = Math.floor((n - 1) / 15); tone(330 + col * 90, 330 + col * 90, 0.07, 'square', 0.05); noise(0.05, 0.04, 1800);
    bsay(letter(n) + ' ' + n, 34);
    BG.res.forEach(r => { const g = bingoToGo(r.card, BG.called); if (g < r.go) r.bob = 8; r.go = g; if (g === 0 && !r.shout) r.shout = t + r.react; });
    if (BG.res.some(r => r.go === 1)) { tone(90, 80, 0.07, 'sine', 0.08); tone(90, 80, 0.07, 'sine', 0.06, 0.12); }   // a heartbeat: somebody's one away
    BG.next = t + Math.round(Math.max(24, 62 - BG.calls.length * 2.2));
  }
  function daub(i) {
    if (BG.state !== 'play' || BG.lock > t || BG.mark[i]) return;
    if (!BG.called.has(BG.card[i])) { BG.lock = t + 24; BG.bad = i; BG.badT = t; SFX.buzz(); return; }   // a bad daub costs a beat
    BG.mark[i] = true; BG.splat.push({ i, t }); tone(660, 990, 0.05, 'square', 0.04); noise(0.04, 0.05, 2200);
    if (BLINES.some(L => L.every(k => BG.mark[k]))) bingoWin();
  }
  function bingoWin() {
    const n = BG.calls.length, m = bingoPay(n), back = BG.stake * m;
    BG.state = 'done'; BG.win = back; BG.who = -1;
    give(back, 152, 90); tier(back, BG.stake, 152, 90, m >= BPAY[0][1] ? 'QUICK BINGO! +' + back : 'BINGO! +' + back);
    bsay('BINGO IN ' + n + ' BALLS.', 160); BG.res.forEach(r => r.bob = 0);
    settle(BG.stake, back, false);
  }
  function bingoLose(i) {
    BG.state = 'done'; BG.who = i; BG.res[i].bob = 40;
    bsay("LET'S GET A ROUND OF APPLAUSE.", 160);
    bannerUp('A RESIDENT GOT BINGO', '#c8a0a8', 1, 110); tone(260, 170, 0.18, 'triangle', 0.04);
    for (let k = 0; k < 10; k++) noise(0.04, 0.035, 1500 + rnd(1500), 0.15 + k * 0.07);   // polite applause
    settle(BG.stake, 0, BG.stake >= 100);
  }
  function bingoStep(IN, c) {
    if (BG.sayT > 0) BG.sayT--; BG.res.forEach(r => { if (r.bob > 0) r.bob--; }); if (BG.roll < 99) BG.roll++;
    if (BG.state === 'play') {
      if (t >= BG.next && BG.calls.length < 75) bingoCall();
      const sh = BG.res.findIndex(r => r.shout && t >= r.shout); if (sh >= 0) { bingoLose(sh); return; }
      if (IN.nx || IN.ny) { const col = mod(Math.floor(BG.cur / 5) + IN.nx, 5), row = mod(BG.cur % 5 + IN.ny, 5); BG.cur = col * 5 + row; SFX.tick(); }
      if (c) { const col = Math.floor((c.x - BCX) / BCW), row = Math.floor((c.y - BCY) / BCH); if (col >= 0 && col < 5 && row >= 0 && row < 5) { BG.cur = col * 5 + row; daub(BG.cur); } }
      else if (IN.ok) daub(BG.cur);
      return;
    }
    if (IN.ny) bump(-IN.ny); if (IN.nx) bump(IN.nx);
    const P = BUYP(); if (c) { if (betClick(c, P.bet.x, P.bet.y)) return; if (inR(c, P.buy.x, P.buy.y, P.buy.w, P.buy.h)) { bingoBuy(); return; } }
    else if (IN.ok) { bingoBuy(); return; }
    if (IN.back) { scr = 'lobby'; SFX.switch(); }
  }
  function senior(i, x, by) { const im = DD.IMG && DD.IMG.w11_seniors; if (im && im.complete && im.naturalWidth) ctx.drawImage(im, i * 22, 0, 22, 30, Math.round(x - 11), Math.round(by - 30), 22, 30); }
  function bingoBall(x, y, n, r = 11) {
    const col = BALLC[Math.floor((n - 1) / 15)];
    bead(x, y, r, col); bead(x, y, Math.round(r * 0.62), '#fff8ec');
    if (r >= 9) { text(letter(n), x, y - 5, '#2a1a1a', 1, null, 'center'); text(String(n), x, y + 1, '#1a1014', 1, null, 'center'); }
    else text(String(n), x, y - 2, '#1a1014', 1, null, 'center');
  }
  function cage(cx, cy, r, ang, spinning, tt) {   // a wire bingo cage on its stand, balls tumbling inside
    box(cx - r - 2, cy + r - 1, 4, 10, '#8a8a98'); box(cx + r - 2, cy + r - 1, 4, 10, '#8a8a98'); box(cx - r - 4, cy + r + 8, r * 2 + 8, 4, '#5a3014');
    for (let k = 0; k < 6; k++) { const a = spinning ? tt * 0.15 + k * 1.3 : k * 1.05, rr = (k * 37 % 7) / 7 * (r - 5); bead(Math.round(cx + Math.cos(a) * rr), Math.round(cy + r * 0.35 + Math.sin(a) * rr * 0.5), 2, BALLC[k % 5]); }
    const n = Math.round(r * 6.3); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; rect('#c8c8d4', Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
    for (let k = 0; k < 4; k++) { const a = ang + k * Math.PI / 4; for (let s = -r; s <= r; s += 2) rect('#9a9aa8', Math.round(cx + Math.cos(a) * s), Math.round(cy + Math.sin(a) * s * 0.35), 1, 1); }
    bead(cx, cy, 2, '#e8c060'); rect('#c8c8d4', cx + r, cy - 1, 5, 2); rect('#e8302a', cx + r + 4, cy - 2, 3, 4);   // the hub and crank
  }
  function bingoDraw(tt) {
    // the activity room: tan wall, wood wainscot, BINGO NIGHT, the cork board, lino underfoot
    rect('#cbb48c', 0, 15, VW, 71); if (A) A.tex(0, 15, VW, 71, '#cbb48c', 0.05, 9);
    rect('#8a5426', 0, 86, VW, 42); if (A) { A.planks(0, 86, VW, 42, '#8a5426', 16, true); A.trim(0, 85, VW, '#b07a40'); }
    rect('#d8d0b8', 0, 128, VW, 21); for (let x = 0; x < VW; x += 16) spr('w11_lino', x + 8, 149);
    rect('rgba(0,0,0,0.25)', 0, 128, VW, 2);
    spr('w11_cork', 286, 58); spr('w11_bingosign', 160, 42);
    glow(160, 30, 70, '#fff2c0', 0.14);
    // New calls it
    spr('w11_portrait_new_manor', 18, 66 + (BG.roll < 6 ? -1 : 0));
    if (BG.sayT > 0 && BG.say) bubble(BG.say, 36, 44, 66, true);
    cage(70, 94, 14, BG.state === 'play' ? tt * 0.2 : 0.3, BG.state === 'play', tt);
    const last = BG.calls[BG.calls.length - 1];
    if (last) { const k = Math.min(1, BG.roll / 12), e = 1 - Math.pow(1 - k, 3), bx = 70 + (24 - 70) * e, by = 96 - Math.sin(k * Math.PI) * 14; bingoBall(Math.round(bx), Math.round(by), last); if (BG.roll < 20) glow(bx, by, 20, BALLC[Math.floor((last - 1) / 15)], 0.2); }
    else { bead(24, 96, 11, '#3a2a20'); text('?', 24, 94, '#8a7a6a', 1, null, 'center'); }
    box(4, 111, 98, 12, '#5a3014'); BG.calls.slice(-7, -1).reverse().forEach((n, i) => bingoBall(13 + i * 15, 117, n, 5));
    // what a bingo pays right now
    const nb = BG.calls.length, tierI = BPAY.findIndex(([lim]) => nb <= lim), cur = BPAY[Math.max(0, tierI)];
    box(4, 126, 98, 20, '#2a1a10'); text('BALLS ' + nb, 8, 129, '#fff6d4', 1, null);
    if (BG.state === 'play') { const left = cur[0] < 99 ? cur[0] - nb : 0; text('NOW ' + cur[1] + 'X' + (left ? '  ' + left + ' LEFT' : ''), 8, 138, left && left <= 3 ? (Math.floor(tt / 6) % 2 ? '#ff8a6a' : '#ffe680') : '#ffe680', 1, '#000'); }
    else text('BY ' + BPAY[0][0] + ': ' + BPAY[0][1] + 'X  BY ' + BPAY[1][0] + ': ' + BPAY[1][1] + 'X', 8, 138, '#ffe680', 1, null);
    // your card
    rect('rgba(0,0,0,0.35)', 109, 47, 93, 88); box(106, 44, 93, 88, '#f4ece0', { outline: '#3a2a1a' });
    'BINGO'.split('').forEach((L, k) => { box(BCX + k * BCW, 46, BCW - 1, 10, BALLC[k], { outline: false }); text(L, BCX + k * BCW + 8, 48, k === 2 ? '#2a1a1a' : '#fff6d4', 1, null, 'center'); });
    for (let col = 0; col < 5; col++) for (let row = 0; row < 5; row++) {
      const i = col * 5 + row, x = BCX + col * BCW, y = BCY + row * BCH, n = BG.card ? BG.card[i] : -1;
      rect('#d8ccb4', x, y, BCW, 1); rect('#d8ccb4', x, y, 1, BCH);
      if (n < 0) continue;
      const hot = BG.state === 'play' && n > 0 && BG.called.has(n) && !BG.mark[i];
      if (hot) rect(Math.floor(tt / 5) % 2 ? '#fff0a0' : '#ffe070', x + 1, y + 1, BCW - 1, BCH - 1);
      if (BG.mark[i]) { const sp = BG.splat.find(q => q.i === i), g = sp ? Math.min(1, (t - sp.t) / 5) : 1; bead(x + 9, y + 7, Math.max(2, Math.round(6 * g)), '#c83a9a'); if (g >= 1) { rect('#c83a9a', x + 3, y + 3, 1, 1); rect('#c83a9a', x + 14, y + 11, 1, 1); } }
      if (n === 0) pmap(['..x..', 'xxxxx', '.xxx.', 'x.x.x'], { x: '#fff6d4' }, x + 7, y + 5); else text(String(n), x + 9, y + 5, BG.mark[i] ? '#fff6d4' : '#2a1a1a', 1, null, 'center');
      if (BG.bad === i && t - BG.badT < 24) { rect('#e8302a', x + 2, y + 2, BCW - 3, 1); rect('#e8302a', x + 2, y + BCH - 2, BCW - 3, 1); }
    }
    if (BG.state === 'play') { const x = BCX + Math.floor(BG.cur / 5) * BCW, y = BCY + (BG.cur % 5) * BCH, g = BG.lock > t ? '#e8302a' : Math.floor(tt / 6) % 2 ? '#2a6ad8' : '#1a1014'; rect(g, x, y, BCW + 1, 1); rect(g, x, y + BCH, BCW + 1, 1); rect(g, x, y, 1, BCH); rect(g, x + BCW, y, 1, BCH); }
    if (BG.state === 'done' && BG.who < 0 && Math.floor(tt / 8) % 2) { const L = BLINES.find(L => L.every(k => BG.mark[k])); if (L) L.forEach(k => { const x = BCX + Math.floor(k / 5) * BCW, y = BCY + (k % 5) * BCH; rect('#e8b030', x, y, BCW + 1, 1); rect('#e8b030', x, y + BCH, BCW + 1, 1); rect('#e8b030', x, y, 1, BCH); rect('#e8b030', x + BCW, y, 1, BCH); }); }   // the winning line
    // the residents at their table, and how close each is
    box(204, 77, 114, 9, '#6a3a18'); rect('#f4ece0', 204, 77, 114, 2);
    BG.res.forEach((r, i) => {
      const x = 216 + i * 22, by = 80 - (r.bob > 0 ? Math.round(Math.abs(Math.sin(r.bob / 2)) * 2) : 0);
      senior(i, x, by); rect('#6a3a18', x - 11, 77, 22, 3);
      const won = BG.who === i, near = r.go === 1 && BG.state === 'play', go = won || (r.shout && BG.state === 'play') ? '!' : String(r.go);
      box(x - 6, 79, 12, 6, won || near ? (Math.floor(tt / 5) % 2 ? '#e8302a' : '#ffe680') : '#f4ece0', { outline: '#3a2a1a' }); text(go, x, 80, won || near ? '#2a0a08' : '#3a2a1a', 1, null, 'center');
      if (won || (r.shout && BG.state === 'play')) bubble('BINGO!', x - 14, 30, 30, false);
    });
    if (!BG.res.length) for (let i = 0; i < 5; i++) { senior(i, 216 + i * 22, 80); rect('#6a3a18', 205 + i * 22, 77, 22, 3); }
    // the board of called numbers
    box(204, 90, 112, 37, '#2a1a10');
    for (let col = 0; col < 5; col++) { text('BINGO'[col], 209, 92 + col * 7, BALLC[col], 1, null, 'center'); for (let k = 0; k < 15; k++) { const n = col * 15 + k + 1, on = BG.called.has(n); rect(on ? BALLC[col] : '#4a3020', 214 + k * 6, 93 + col * 7, 4, 4); if (on && n === last) rect('#ffffff', 214 + k * 6, 93 + col * 7, 4, 1); } }
    if (BG.state !== 'play') {   // buy a card: over the card before a round, over the board after one
      const P = BUYP(); box(P.box[0], P.box[1], P.box[2], P.box[3], '#2a1018'); betBox(P.bet.x, P.bet.y, true);
      const hb = Math.round(Math.abs(Math.sin(tt / 10))); btn(P.buy.x, P.buy.y - hb, P.buy.w, P.buy.h, BG.state === 'done' ? 'NEW CARD' : 'BUY A CARD', true, '#ffd27a');
    }
    if (A) A.vignette(0.25);
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
    if (c && inR(c, 0, 0, 58, 14)) {   // the header's BACK button: a game goes back to the lobby, the lobby leaves the store
      if (scr === 'lobby') return 'back';
      if (busy()) { say('FINISH THIS ONE FIRST', 70); SFX.buzz(); return; }
      scr = 'lobby'; SFX.switch(); return;
    }
    if (IN.back && busy() && scr !== 'scratch' && !(scr === 'bj' && B.walk)) { say('FINISH THIS ONE FIRST', 70); SFX.buzz(); }
    if (scr === 'lobby') return lobbyStep(IN, c);
    if (scr === 'slots') slotsStep(IN, c); else if (scr === 'scratch') scratchStep(IN, c); else if (scr === 'roul') rouletteStep(IN, c); else if (scr === 'bj') bjStep(IN, c); else if (scr === 'bingo') bingoStep(IN, c);
  }
  const busy = () => (scr === 'slots' && S.state === 'spin') || (scr === 'roul' && R.state === 'spin') || (scr === 'bj' && !['bet', 'done', 'play'].includes(B.state)) || (scr === 'scratch' && K.state === 'scratch') || (scr === 'bingo' && BG.state === 'play');
  function draw() {
    const tt = t;
    ctx.save(); if (shake) ctx.translate(Math.round((Math.random() - 0.5) * Math.min(6, shake / 3)), Math.round((Math.random() - 0.5) * Math.min(6, shake / 3)));
    if (scr === 'lobby') lobbyDraw(tt); else if (scr === 'slots') slotsDraw(tt); else if (scr === 'scratch') scratchDraw(tt); else if (scr === 'roul') rouletteDraw(tt); else if (scr === 'bingo') bingoDraw(tt); else bjDraw(tt);
    ctx.restore();
    // footer
    rect('#0a0408', 0, 149, VW, 31); if (A) A.trim(0, 148, VW, '#c98f22');
    if (msgT > 0) text(msg, VW / 2, 153, msg.startsWith('NEED') || msg.startsWith('OUT') ? '#ff8080' : '#ffe680', 1, null, 'center');
    else text(unl() ? 'UNLIMITED HEI POINTS: EVERYTHING PLAYS FREE, NOTHING PAYS' : scr === 'lobby' ? 'BIGGEST WIN ' + C.big + '   BEST STREAK ' + C.best + '   YOU VS THE HOUSE ' + (C.net > 0 ? '+' : '') + C.net : 'BALANCE ' + pts() + '   YOU VS THE HOUSE ' + (C.net > 0 ? '+' : '') + C.net, VW / 2, 153, '#9a8a90', 1, null, 'center');
    const J = DD.padUsed ? 'CROSS' : 'JUMP', X = DD.padUsed ? 'CIRCLE' : 'X', SW = DD.padUsed ? 'R1' : 'C';
    const help = scr === 'lobby' ? 'LEFT/RIGHT: PICK   ' + J + ': PLAY   ' + SW + ': STORE   ' + X + ': ' + (ST() ? ST().backLabel : 'BACK')
      : scr === 'slots' ? (S.state === 'spin' ? J + ': STOP THE REELS' : J + ': SPIN   ARROWS: BET   ' + X + ': CASINO')
      : scr === 'scratch' ? (K.state === 'pick' ? 'LEFT/RIGHT: PICK   ' + J + ': BUY   ' + X + ': CASINO' : K.state === 'scratch' ? 'DRAG OR ARROWS: SCRATCH   ' + J + ': ALL   ' + X + ': REVEAL' : J + ': AGAIN   ' + X + ': TICKETS')
      : scr === 'roul' ? (R.state === 'spin' ? J + ': HURRY IT UP' : 'ARROWS: MOVE   ' + J + ': CHIP DOWN / PRESS   ' + X + ': CASINO')
      : scr === 'bingo' ? (BG.state === 'play' ? 'ARROWS OR MOUSE: MOVE   ' + J + ' OR CLICK: DAUB A CALLED NUMBER' : J + ': BUY A CARD   ARROWS: BET   ' + X + ': CASINO')
      : B.state === 'play' ? 'ARROWS: PICK   ' + J + ': DO IT' : J + ': DEAL   ARROWS: BET   ' + X + ': CASINO';
    text(help, VW / 2, 167, '#ffd27a', 1, '#000', 'center');
  }
  function drawTop() {   // over the store's header: coins into the balance, sparks and the banner
    for (const p of spark) { const a = 1 - p.t / p.life; ctx.globalAlpha = a; rect('#000', p.x, p.y + 1, 2, 2); rect(p.c, p.x, p.y, 2, 2); ctx.globalAlpha = 1; }
    for (const f of coins) { if (f.t < 0) continue; const k = f.t / f.d, e = k * k * (3 - 2 * k), arc = Math.sin(k * Math.PI) * 24, x = f.x0 + (BAL.x - f.x0) * e, y = f.y0 + (BAL.y - f.y0) * e - arc; rect('#6a3a08', x - 1, y - 1, 5, 5); rect('#e8b030', x, y, 3, 3); rect('#fff0a0', x, y, 1, 1); }
    if (banner) {
      const b = banner, s = b.size, w = b.s.length * 4 * s, pop = b.t < 8 ? Math.round((8 - b.t) * 1.5) : 0, y = ({ slots: 26, scratch: 135, bj: 86, roul: 128, bingo: 22 }[scr] || 66) - pop + (b.t > b.n - 10 ? (b.t - (b.n - 10)) * 3 : 0);
      const big = b.col === 'rain', px = Math.round(VW / 2 - w / 2 - 10), pw = w + 20, ph = 5 * s + 10;
      if (big) glow(VW / 2, y + ph / 2 - 4, w, '#ffe680', 0.25);
      box(px, y - 5, pw, ph, big ? '#5a0a14' : '#2a0e1a');
      if (big && A) { A.bulbs(px + 3, y - 4, pw - 6, 6, t); A.bulbs(px + 3, y + ph - 7, pw - 6, 6, t + 3); }
      if (big) logo(b.s, VW / 2, y, s, GOLD, (t * 3) % (w + 60) + px - 20);
      else if (s > 1) logo(b.s, VW / 2, y, s, b.col === '#ffe680' ? GOLD : [b.col, b.col, mix(b.col, -0.1), mix(b.col, -0.2), mix(b.col, -0.3)]);
      else text(b.s, VW / 2, y, b.col, s, '#2a0e1a', 'center');
    }
  }

  // ?casino=lobby|slots|scratch|roul|bj (testing and screenshots): straight into that casino screen; &demo shows it mid-play
  const Qs = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  if (Qs && Qs.has('casino') && ST()) { const iv = setInterval(() => { if (!window.__menu || window.__menu.st === 'load') return; clearInterval(iv);
    const st = ST(), w = Qs.get('casino'); if (st.pts < 500 && !st.unlimited) st.bank(500 - st.pts);
    st.tab = 1; st.open({ label: 'BACK' }); if (w && w !== 'lobby') enter(w); if (Qs.has('lc')) lc = +Qs.get('lc');
    if (Qs.has('demo')) { if (w === 'slots') { spin(); S.stops = STRIPS.map(a => a.indexOf(SEV)); } if (w === 'scratch') { buyTicket(+Qs.get('demo') || 0); } if (w === 'roul') { placeBet('red', 25); placeBet('n7', 10); placeBet('d2', 5); } if (w === 'bj') deal(); if (w === 'bingo') bingoBuy(); }
    DD.setScene({ step: IN => { if (st.step(IN, IN.click) === 'back') st.open({ label: 'BACK' }); }, draw: () => st.draw() });
  }, 100); }

  window.DDCasino = { open, step, draw, drawTop, M, BETS, get scr() { return scr; }, get busy() { return busy(); }, get stats() { return C; }, reload: cload,
    test: { S, K, R, B, BG, bingoBuy, daub, get t() { return t; }, set bi(n) { bi = n; }, enter, spin, deal, buyTicket, spinWheel, placeBet, settle, freeTix } };
})();
