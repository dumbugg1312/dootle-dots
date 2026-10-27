// The front door: title, world select, era cards, level list, progress. Draws on the engine's canvas via DD.setScene.
// ?level=2-1 deep-links into a level, ?era=N shows world N's era card, ?world=N opens its level list, ?select skips the title.
// Look: the title is the On Cinema theater (w2 curtain parts on a gilded screen); the world select is a video-store shelf of VHS sleeves
// (each thumbnail is built from that world's own set sprites); the era card opens with a film-leader countdown; levels show bags as popcorn tubs.
(function () {
  const VW = DD.VW, VH = DD.VH, text = DD.text, spr = DD.spr, drawDot = DD.drawDot || ((n, pose, ...r) => DD.spr(n, ...r)), SFX = DD.SFX, Q = new URLSearchParams(location.search);
  const WORLDS = window.WORLDS, LEVELS = {}, MISSING = {};
  const idsOf = w => w.levels.map(l => l.id);
  const have = id => !!LEVELS[id];
  const ctx = DD.ctx;

  // ---- progress: best bags and the VHS per level, in localStorage (memory-only if storage is blocked)
  const KEY = 'dootledots.progress.v1';
  let PROG = {};
  try { PROG = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { PROG = {}; }
  function record(r) {
    if (!r || r.quit || !r.id) return;
    const o = PROG[r.id] || {};
    PROG[r.id] = { bags: Math.max(o.bags || 0, r.bags || 0), got: Math.max(o.got || 0, r.got || 0), total: r.total || o.total || 0, vhs: !!(o.vhs || r.vhs), fact: o.fact || r.fact || null, allPop: !!(o.allPop || r.allPop), six: !!(o.six || r.six) };   // six: won at six bags (the HEI store's SIX BAGS)
    try { localStorage.setItem(KEY, JSON.stringify(PROG)); } catch (e) { /* storage blocked: progress lasts this session */ }
  }
  const marks = id => { const p = PROG[id] || {}; return (p.allPop ? 1 : 0) + (p.vhs ? 1 : 0) + (p.fact ? 1 : 0); };   // a stage's three goals: every kernel, the tape, the blue card
  const worldMarks = w => idsOf(w).reduce((s, id) => s + marks(id), 0), worldTapes = w => idsOf(w).filter(id => PROG[id] && PROG[id].vhs).length;
  const worldBags = w => idsOf(w).reduce((s, id) => s + ((PROG[id] && PROG[id].bags) || 0), 0);
  const worldMax = w => idsOf(w).length * 5;
  const worldVhs = w => idsOf(w).reduce((s, id) => s + ((PROG[id] && PROG[id].vhs) ? 1 : 0), 0);
  const worldOpen = w => idsOf(w).some(have);
  // ---- progression: worlds open in order, stages open in order, and the Dots join the cast one stage at a time
  const UKEY = 'dootledots.unlockall';
  const unlockPref = () => { try { return localStorage.getItem(UKEY) === '1'; } catch (e) { return false; } };
  let ALL = Q.has('unlock') || unlockPref();   // ?unlock, or UNLOCK ALL LEVELS in the options, opens everything
  const DKEY = 'dootledots.alldots';
  const dotsPref = () => { try { return localStorage.getItem(DKEY) === '1'; } catch (e) { return false; } };
  let ALLD = dotsPref();   // UNLOCK ALL DOTS: the whole cast from the very first stage
  const JOIN = { cloud: '1-1', mel: '1-2', baxter: '1-3' };   // the levels assume the whole cast from World 2 on (2-2's shelf bridge needs Baxter), so everyone joins in World 1   // the stage whose win brings each Dot into the cast
  const beaten = id => !!PROG[id];
  const SKIPKEY = 'dootledots.skipdotcity';   // chose SKIP TO ON CINEMA after 1-1: World 2 opens and the whole cast comes along
  const skipped = () => { try { return localStorage.getItem(SKIPKEY) === '1'; } catch (e) { return false; } };
  const cast = () => ['sam', 'mel', 'cloud', 'baxter'].filter(d => ALLD || skipped() || !JOIN[d] || beaten(JOIN[d]));
  const joinsOn = id => ALLD || skipped() ? null : Object.keys(JOIN).find(d => JOIN[d] === id && !beaten(id)) || null;
  const worldUnlocked = w => { const i = WORLDS.indexOf(w); if (ALL || i <= 0 || (i === 1 && skipped()) || idsOf(w).some(beaten)) return true; const pv = WORLDS[i - 1].levels; return beaten(pv[pv.length - 1].id); };   // beat the boss before it; anything already beaten stays open
  const stageUnlocked = (w, i) => worldUnlocked(w) && (ALL || i === 0 || beaten(w.levels[i].id) || beaten(w.levels[i - 1].id));
  const worldPlay = w => worldOpen(w) && worldUnlocked(w);

  // ---- level files: a script tag per id; onerror (404 / file missing) means COMING SOON. Works over file:// and http.
  // All of them are fetched at once; async=false makes them run in order, each one's load (or error) event firing right after
  // it runs and before the next, so the entities a file defines (DD.collectDefs) are always its own.
  function probe(ids, done) {
    let left = ids.length; if (!left) return done();
    let defs = DD.collectDefs(true); window.LEVEL = null;
    const finish = () => { window.LEVEL = null; defs = DD.collectDefs(true); if (--left === 0) { DD.collectDefs(false); done(); } };
    for (const id of ids) {
      const s = document.createElement('script'); s.async = false; s.src = 'levels/' + id + '.js';
      s.onload = () => { if (window.LEVEL && window.LEVEL.SOLID) { LEVELS[id] = window.LEVEL; LEVELS[id].ENTS = defs; if (!LEVELS[id].id) LEVELS[id].id = id; } else MISSING[id] = 1; finish(); };
      s.onerror = () => { MISSING[id] = 1; finish(); };
      document.head.appendChild(s);
    }
  }

  // ---- art: each world's thumbnail (a 42x26 window, ground line at y 21) and era-card backdrop (320x180) are built from its own set sprites.
  // layer = [sprite, x, bottomY, scale, opts]; opts: tile (repeat across the width), par (drift px/frame), a (alpha), flip. The string 'G' = draw the ground band here.
  const T = {
    1: [['w1_cloud_a', 12, 9, .5], ['w1_hills_far', 24, 22, .5], 'G', ['w1_tree_a', 8, 24, .5], ['w1_lamp', 34, 28, .5]],
    2: [['w2_curtain', 0, 40, .5, { tile: 1 }], ['w2_screen', 21, 25, .25], 'G', ['seat', 8, 28, .5], ['seat', 21, 30, .5], ['seat', 34, 28, .5]],
    3: [['w3_hills', 21, 21, .5], ['w3_moon', 32, 10, .5], 'G', ['w3_palm', 10, 24, .5], ['w3_crypt', 31, 24, .5]],
    4: [['w4_curtain', 0, 36, .5, { tile: 1 }], ['w4_neon', 21, 13, .45], 'G', ['w4_lucky7', 9, 21, .5], ['w4_projector', 32, 24, .5]],
    5: [['w5_screen', 21, 21, .5], 'G', ['w5_recliner_bg', 9, 25, .5], ['w5_recliner_bg', 33, 25, .5]],
    6: [['w6_wall', 0, 40, .5, { tile: 1 }], ['w6_seal', 21, 17, .5], 'G', ['w6_gavel', 21, 24, .5], ['w6_lamp', 7, 24, .5]],
    7: [['w7_oxc', 21, 24, .25], 'G', ['w7_ladder', 6, 24, .5], ['w7_hat', 35, 24, .75]],
    8: [['w8_sun', 31, 14, .5], ['w8_hills_far', 21, 22, .5], 'G', ['w8_saloon', 17, 24, .5], ['w8_lamppost', 37, 26, .5]],
    9: [['w9_mesas', 21, 22, .5], ['w9_logo', 21, 22, .5], 'G', ['w9_torch', 5, 26, .5], ['w9_torch', 37, 26, .5]],
    10: [['w10_wallpaper', 0, 40, .5, { tile: 1 }], ['w10_window', 9, 22, .5], 'G', ['w10_ratking', 28, 26, .5], ['w10_lamp', 17, 24, .5]],
    11: [['w11_curtain', 0, 30, .5, { tile: 1 }], ['w11_showtime', 21, 9, .5], 'G', ['w11_popcart', 9, 26, .5], ['w11_door', 33, 26, .5]],
    12: [['w12_sky', 21, 26, .25], ['w12_city', 21, 21, .5], ['w12_hills_near', 21, 23, .5], 'G', ['w12_tree', 8, 26, .25], ['w12_statue', 33, 26, .5]],
  };
  const B = {   // era backdrops, drawn between the top and bottom bands
    1: [['w1_cloud_a', 60, 66, 1, { par: .12 }], ['w1_cloud_b', 250, 54, 1, { par: .08 }], ['w1_cloud_c', 150, 40, 1, { par: .05 }], ['w1_hills_far', 0, 150, 1, { tile: 1, par: .05 }],
      ['w1_hills_near', 0, 162, 1, { tile: 1, par: .12 }], ['w1_shop_bank', 52, 162, 1], ['w1_shop_pickles', 266, 162, 1], ['w1_tree_a', 126, 162, 1], ['w1_lamp', 196, 164, 1]],
    2: [['w2_curtain', 0, 200, 1, { tile: 1 }], ['w2_sconce', 22, 92, 1], ['w2_sconce', 298, 92, 1]],
    3: [['w3_moon', 262, 74, 1], ['w3_far', 0, 118, 1, { tile: 1, par: .05 }], ['w3_hills', 0, 152, 1, { tile: 1, par: .1 }], ['w3_palm', 34, 164, 1], ['w3_palm', 288, 164, 1], ['w3_tikibar', 250, 164, 1, { a: .9 }]],
    4: [['w4_door', 40, 162, 1], ['w4_door', 280, 162, 1], ['w4_neon', 70, 44, 1], ['w4_lucky7', 252, 62, 1], ['w4_projector', 160, 162, 1], ['w4_vfa', 262, 112, 1]],
    5: [['w5_curtain', 0, 120, 1, { tile: 1 }], ['w5_screen', 160, 76, 1], ['w5_recliner_bg', 40, 162, 1], ['w5_recliner_bg', 280, 162, 1], ['w5_menuboard', 54, 66, 1]],
    6: [['w6_wall', 0, 150, 1, { tile: 1 }], ['w6_flags', 22, 162, 1], ['w6_flags', 298, 162, 1], ['w6_seal', 160, 70, 1], ['w6_judgebench', 160, 164, 1]],
    7: [['w7_oxc', 160, 130, 1, { a: .85 }], ['w7_ladder', 24, 162, 1], ['w7_vrcam', 292, 162, 1], ['w7_fallO', 270, 60, 1, { a: .8 }]],
    8: [['w8_sun', 250, 90, 1], ['w8_hills_far', 0, 150, 1, { tile: 1, par: .05 }], ['w8_hills_near', 0, 162, 1, { tile: 1, par: .1 }], ['w8_saloon', 56, 162, 1], ['w8_column', 288, 162, 1]],
    9: [['w9_mesas', 0, 134, 1, { tile: 1, par: .05 }], ['w9_bgcol', 22, 166, 1], ['w9_bgcol', 298, 166, 1], ['w9_chandelier', 160, 66, 1, { a: .9 }], ['w9_booth', 92, 164, 1], ['w9_clock', 244, 70, 1]],
    10: [['w10_wallpaper', 0, 164, 1, { tile: 1 }], ['w10_window', 44, 110, 1], ['w10_window', 276, 110, 1], ['w10_lamp', 90, 164, 1], ['w10_ratking', 250, 164, 1], ['w10_doorway', 160, 164, 1]],
    11: [['w11_curtain', 0, 162, 1, { tile: 1 }], ['w11_showtime', 56, 54, 1], ['w11_popcart', 36, 164, 1], ['w11_door', 280, 164, 1], ['w11_bingosign', 252, 62, 1], ['w11_alf', 210, 164, 1]],
    12: [['w12_sky', 0, 180, 1, { tile: 1 }], ['w12_city', 0, 130, 1, { tile: 1, par: .04 }], ['w12_hills_far', 0, 150, 1, { tile: 1, par: .06 }], ['w12_hills_near', 0, 162, 1, { tile: 1, par: .12 }],
      ['w12_tree', 36, 164, 1], ['w12_tree', 288, 164, 1], ['w12_shop', 250, 164, 1], ['w12_statue', 60, 164, 1], ['w12_heaven', 160, 90, 1, { a: .8 }]],
  };
  for (let i = 0; i < 12; i++) { B[2].push(['seat', 14 + i * 28, 176, 1, { a: 1 }]); }   // seat rows below the curtain
  for (let i = 0; i < 11; i++) { B[2].push(['seat', 28 + i * 28, 196, 1, { a: 1 }]); }
  const EXTRA = ['menu_screen', 'w2_curtain', 'w2_valance', 'w2_carpet', 'w2_sconce', 'seat', 'tub', 'vhs', 'pop'];
  const artNames = () => { const o = {}; EXTRA.forEach(n => o[n] = 1); [T, B].forEach(M => Object.keys(M).forEach(k => M[k].forEach(l => { if (l !== 'G') o[l[0]] = 1; }))); return Object.keys(o); };
  DD.loadSprites(artNames());

  const ready = DD.ready;
  function drawLayer(l, ox, oy, tt, region) {   // region = clip width for tiling
    const nm = l[0], sc = l[3] || 1, o = l[4] || {};
    if (!ready(nm)) return;
    const im = DD.IMG[nm], w = im.width * sc;
    if (o.tile) {
      const drift = o.par ? (tt * o.par) % w : 0;
      for (let x = ox - drift - w; x < ox + region + w; x += w) spr(nm, x + w / 2, oy + l[2], false, sc, sc, 0, o.a === undefined ? 1 : o.a);
    } else spr(nm, ox + l[1] + (o.par ? Math.sin(tt * o.par / 12) * 6 : 0), oy + l[2], !!o.flip, sc, sc, 0, o.a === undefined ? 1 : o.a);
  }
  function clipRect(x, y, w, h) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  function thumb(w, x, y, open, tt) {   // 42x26 picture of the world, with its own ground
    const L = T[w.n] || [];
    clipRect(x, y, 42, 26);
    ctx.fillStyle = w.bg; ctx.fillRect(x, y, 42, 26);
    let gd = false;
    const ground = () => { gd = true; ctx.fillStyle = w.band; ctx.fillRect(x, y + 21, 42, 5); ctx.fillStyle = w.accent; ctx.fillRect(x, y + 21, 42, 1); };
    for (const l of L) { if (l === 'G') ground(); else drawLayer(l, x, y, tt, 42); }
    if (!gd) ground();
    ctx.restore();
  }

  // ---- drawing helpers
  const fitScale = (str, maxW, max) => Math.max(1, Math.min(max, Math.floor(maxW / (str.length * 4 - 1))));
  const tw = (str, s) => str.length * 4 * s - s;
  function ctext(str, y, col, s, shadow) { text(str, VW / 2, y, col, s, shadow === undefined ? '#000' : shadow, 'center'); }
  function typed(str, y, t, t0, col, s, shadow) {   // typewriter reveal, centred by the full width
    const n = Math.max(0, Math.min(str.length, Math.floor((t - t0) / 2)));
    if (n > 0) text(str.slice(0, n), VW / 2 - Math.floor(tw(str, s) / 2), y, col, s, shadow === undefined ? '#000' : shadow);
  }
  function sprockets(y, col, skipA, skipB) { ctx.fillStyle = col; for (let x = 4; x < VW; x += 12) if (!(x > skipA && x < skipB)) ctx.fillRect(x, y, 6, 4); }
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) * k)).join(',') + ')'; };
  const lumOf = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3; };
  const SHD = w => lumOf(w.fg) > 130 ? '#000' : null;   // no drop shadow on dark type (light cards)
  const blink = (t, n = 30) => Math.floor(t / n) % 2 === 0;
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clipW = (str, n) => str.length > n ? str.slice(0, n) : str;
  function tubIcon(x, y, c) { rect('#000', x, y, 5, 7); rect(c, x + 1, y + 1, 3, 5); rect('#fff6d4', x + 1, y, 3, 2); }   // tiny popcorn tub, 5x7
  function vhsIcon(x, y, c) { rect('#000', x, y, 9, 6); rect(c, x + 1, y + 1, 7, 4); rect('#1a1a22', x + 2, y + 3, 5, 1); rect('#d8d8e0', x + 3, y + 2, 1, 1); rect('#d8d8e0', x + 5, y + 2, 1, 1); }   // tiny cassette, 9x6
  function vhsMini(x, y, on) { rect('#000', x, y, 7, 6); rect(on ? '#e8504a' : '#3a2a30', x + 1, y + 1, 5, 4); rect(on ? '#fff6d4' : '#1a1218', x + 2, y + 2, 1, 1); rect(on ? '#fff6d4' : '#1a1218', x + 4, y + 2, 1, 1); }   // 7x6 cassette, lit when that level's VHS is found
  const star4 = (x, y, c) => { rect(c, x, y - 1, 1, 3); rect(c, x - 1, y, 3, 1); };

  // ---- mouse: clicks and hover map to the 320x180 canvas
  const cvEl = document.getElementById('c');
  let click = null, hover = null;
  const toXY = e => { const r = cvEl.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height }; };
  if (cvEl && cvEl.addEventListener) {
    cvEl.addEventListener('pointerdown', e => { click = toXY(e); });
    cvEl.addEventListener('pointermove', e => { hover = toXY(e); hover.dirty = true; });
  }

  // ---- menu sounds (the engine's synth)
  const sTape = () => { DD.noise(0.05, 0.07, 1400); DD.tone(240, 90, 0.09, 'square', 0.05); DD.tone(1500, 1500, 0.025, 'square', 0.025, 0.07); };   // a tape slides out of the shelf
  const sBeep = hi => DD.tone(hi ? 1320 : 880, hi ? 1320 : 880, hi ? 0.18 : 0.08, 'square', 0.045);
  const sCurtain = () => { DD.noise(0.9, 0.05, 500); DD.tone(120, 190, 0.8, 'triangle', 0.03); };
  const sTa = () => [523, 784, 1046, 1568].forEach((f, i) => DD.tone(f, f, 0.12, 'triangle', 0.05, i * 0.07));

  // ---- scenes
  let st = 'load', t = 0, cur = 0, lcur = 0, world = null, note = null, noteT = 0, msg = '';
  const lift = WORLDS.map(() => 0), vel = WORLDS.map(() => 0);
  // world select: one featured card for the highlighted world, and a rack of twelve numbered tape spines on a shelf under it
  const CARD = { x: 40, y: 22, w: 240, h: 80 }, SP = { w: 20, h: 38, gx: 4, x0: 18, y: 116 };
  const slot = i => ({ x: SP.x0 + i * (SP.w + SP.gx), y: SP.y });
  let swT = 0;   // frames since the highlight moved: the featured picture flashes like a tape being pushed in
  const compact = () => world && world.levels.length > 2, rowY = i => compact() ? 34 + i * 31 : 44 + i * 40;   // four stages a world get slimmer rows

  // ---- Gregg's shelf: every Popcorn Classic tape, one per stage, in world order (classics.js)
  const SH = { n: 24, w: 12, h: 54, gx: 1, x0: 4, y0: [17, 78] };
  const shelfIds = () => [].concat(...WORLDS.map(idsOf)).filter(id => window.CLASSICS && CLASSICS[id]);
  let scur = 0;
  function openShelf() { st = 'shelf'; t = 0; scur = 0; SFX.switch(); }
  function selectTo(i) { if (i === cur) return; cur = i; swT = 10; sTape(); }
  const eraLine = w => { const V = window.DDVoice; if (V && w && worldOpen(w)) V.say('world', { world: w.n }); };   // opening a world: its era says its line (game/voice/cues.js)
  // ---- the rewind between World 1 and World 2: the last Oscar special stops, the tape rewinds through every era, and Season One plays.
  // Every era is a live trailer, the real engine playing the real stages (DD.trailer): its first stage, a cut to a second stage, then the boss
  // mid-attack, under VHS cuts and a lower third with the world's title. A shot whose level isn't loaded is left out; one that won't build shows its card.
  const RWK = 'dootledots.rewindseen', RWS = { open: 150, a: 72, b: 54, boss: 100, fin: 240, cut: 9 };   // frames per shot; cut: the snow and tear at each splice
  // hand-picked shots ({ id, x: start tile, dot } per stage, pre: boss frames run unseen, 95 by default since most bosses wind up near 95 and strike near 140); anything left out is picked by busiest()
  const SHOTS = {
    10: { a: { x: 16 } },                          // the lobby's fan brawl under the portraits
    7: { a: { x: 6 } },                            // the giant O X C letters, fans posing
    4: { b: { id: '4-3', x: 32 }, pre: 110 },      // the locker hall full of fans; Dekkar opens with a bottle and slams later, so run on to the slam
  };
  const RW = { play: RWS.open, rew: RWS.open, end: RWS.open + RWS.fin };
  let reel = [], shot = null, tr = null;
  function busiest(L) {   // the start tile of the liveliest 20 columns: fans, the level's own entities, props, popcorn and how much the ground moves
    const W = L.W, score = new Array(W).fill(0), add = (x, v) => { if (x >= 0 && x < W) score[x] += v; };
    const ents = L.ENTS || {}, props = { crate: 1, stack: 1, tub: 1, plate: 1, cp: 1, vhs: 1, ghostS: 1, ghostM: 1, ghostC: 1, ghostB: 1 };
    for (const [k, x] of L.THINGS) add(x | 0, k === 'gh' || k === 'th' ? 3 : ents[k] ? 3 : props[k] ? 1.5 : 0);
    for (const [x, , n] of L.POPCORN || []) for (let i = 0; i < n; i++) add((x | 0) + i, 0.25);
    for (const [k, x, , w] of L.SOLID) if (k !== 'hole' && k !== 'dip' && w < 12) add(x | 0, 0.6);   // platforms and steps, not long floors
    let best = 6, bs = -1;
    for (let x = 6; x < Math.max(7, W - 26); x++) { let s = 0; for (let k = 0; k < 20; k++) s += score[x + k] || 0; if (s > bs) { bs = s; best = x; } }
    return Math.max(2, best - 3);   // a run-up into it
  }
  function makeReel() {   // the shot list: Dot City under the Oscar line, then Worlds 12 down to 3, three shots each
    reel = []; let t0 = 0;
    const add = (s, len) => { reel.push(Object.assign({ t0, len }, s)); t0 += len; };
    const stage = (id, o, dot) => have(id) ? Object.assign({ id, x: busiest(LEVELS[id]), dot }, o, { id }) : null;
    const plain = id => have(id) && !(LEVELS[id].script && LEVELS[id].script.camera);   // the second shot prefers a stage that doesn't drive its own camera
    add(Object.assign({ open: true }, stage('1-1', SHOTS[1] && SHOTS[1].a, 'sam') || {}), RWS.open);
    for (let n = 12; n >= 3; n--) {
      const w = WORLDS[n - 1], o = SHOTS[n] || {}, mids = idsOf(w).slice(1, -1), d = w.dots || ['sam'];
      const bid = (o.b && o.b.id) || mids.find(plain) || mids.find(have);
      const list = [[stage(n + '-1', o.a, d[0]), RWS.a], [bid && stage(bid, o.b, d[1] || d[0]), RWS.b],
        [have(n + '-boss') ? { id: n + '-boss', boss: true, pre: o.pre ?? 95, dot: o.bossDot || d[0] } : null, RWS.boss]].filter(q => q[0]);
      list.forEach(([s, len], i) => add(Object.assign(s, { w, first: i === 0 }), len));
    }
    RW.rew = Math.max(RWS.open, t0); RW.end = RW.rew + RWS.fin;
    DD.loadSprites([].concat(...reel.filter(s => s.id).map(s => LEVELS[s.id].sprites || [])));   // every shot's sprites, well before its turn
  }
  function rwStop() { if (tr) tr.end(); tr = null; shot = null; }
  function rwRoll() {   // the shot under the playhead: splice it in if it's new, then run it a frame
    const s = reel.find(q => t >= q.t0 && t < q.t0 + q.len) || null;
    if (s !== shot) {
      rwStop(); shot = s;
      if (s && s.id && !s.dead) { tr = DD.trailer(LEVELS[s.id], { x: s.x, boss: s.boss, pre: s.pre, dot: s.dot, speed: s.boss ? 1 : 1.25, swap: s.boss ? 60 : 80 }); if (!tr) s.dead = true; }
      if (s && s.w) { if (s.first) { DD.noise(0.12, 0.04, 2400); DD.tone(1600, 900, 0.06, 'square', 0.02); } else DD.noise(0.07, 0.03, 3200); }
    }
    if (tr) tr.step();
  }
  const BOSS_ART = { 1: ['w1_scissors_idle'], 2: ['drsan'], 3: ['w3_abdul_idle'], 4: ['w4_dekkar'], 5: ['w5_timboss'], 6: ['w6_lawyer_tim', 54], 7: ['w7_timocx'],
    8: ['w8_joker'], 9: ['w9_amato_0'], 10: ['w10_ratking'], 11: ['w11_new_a'], 12: ['w12_mg_idle'] };   // each world's boss, for the rewind's preview cards ([sprite, frame width] for a strip)
  function bossArt(n, cx, by, maxH, bob) {   // draw a boss bottom-centred at (cx, by), scaled down to fit maxH
    const a = BOSS_ART[n], im = a && DD.IMG[a[0]]; if (!im || !im.width) return;
    const fw = a[1] || im.width, k = Math.min(1, maxH / im.height), w = Math.round(fw * k), h = Math.round(im.height * k);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(im, 0, 0, fw, im.height, Math.round(cx - w / 2), Math.round(by - h + bob), w, h);
  }
  let fcur = 0;
  const FORK = [['KEEP PLAYING DOT CITY', 'THREE MORE STAGES AND A BOSS. THE DOTS JOIN ONE BY ONE.'], ['SKIP TO ON CINEMA', 'START AT SEASON ONE. ALL FOUR DOTS COME WITH YOU.']];
  const FY = i => 92 + i * 30;
  function forkDo(i) {
    if (i === 0) { SFX.switch(); return playLevel('1-2'); }
    try { localStorage.setItem(SKIPKEY, '1'); } catch (e) {}
    SFX.switch(); cur = 1; world = WORLDS[1]; eraPlay = !!have(idsOf(world)[0]); eraAll = false; startRewind();
  }
  function drawFork() {
    const w1 = WORLDS[0];
    rect(w1.bg, 0, 0, VW, VH); backdrop(w1, t, 0, VH); rect('rgba(6,4,14,0.6)', 0, 0, VW, VH);
    ctext('DOT CITY IS SAVED... FOR NOW', 26, '#ffe680', 2, '#7a2a10');
    ctext('WHERE TO NEXT?', 50, '#fffbd0', 1, '#000');
    FORK.forEach(([a, b], i) => {
      const on = i === fcur, y = FY(i);
      rect(on ? 'rgba(232,80,74,0.45)' : 'rgba(0,0,0,0.45)', 30, y - 6, VW - 60, 24); if (on) rect('#ffd27a', 30, y - 6, 3, 24);
      ctext(a, y, on ? '#fffbd0' : '#c8a8a0', 1, '#000'); ctext(b, y + 10, on ? '#9ac8a0' : '#7a6a70', 1, '#000');
    });
    ['sam', 'mel', 'cloud', 'baxter'].forEach((n, i) => spr(n, 112 + i * 32, VH - 6 + Math.round(-Math.abs(Math.sin(t / 10 + i * 1.3)) * 5), false, 1, 1));
    ctext(DD.padUsed ? 'UP/DOWN + CROSS' : 'UP/DOWN + JUMP, OR CLICK', VH - 26, '#ffd27a', 1, '#000');
  }
  function startRewind() { st = 'rewind'; t = 0; rwStop(); makeReel(); try { localStorage.setItem(RWK, '1'); } catch (e) {} }
  function rewindDone() { rwStop(); st = 'era'; t = 0; eraLine(world); }
  function vhsCut(v) {   // a splice: a white pop, snow thinning out, and a few torn lines dragged sideways
    if (v >= RWS.cut) return;
    const cv = ctx.canvas;
    if (cv && v > 1) for (let i = 0; i < 4; i++) { const y = (hash(t * 3 + i) * (VH - 12)) | 0, h = 2 + ((hash(t + i * 7) * 8) | 0), dx = ((hash(t * 5 + i) - 0.5) * 60) | 0; try { ctx.drawImage(cv, 0, y, VW, h, dx, y, VW, h); } catch (e) {} }
    const n = Math.round(260 * (1 - v / RWS.cut));
    for (let i = 0; i < n; i++) rect(Math.random() < 0.5 ? '#fff' : '#777', (Math.random() * VW) | 0, (Math.random() * VH) | 0, 2, 1);
    rect('rgba(255,255,255,' + (v < 2 ? 0.75 : (RWS.cut - v) / 40).toFixed(2) + ')', 0, 0, VW, VH);
  }
  function tracking(u) {   // slow tracking bands rolling up, and faint scanlines, over the footage
    for (let i = 0; i < 2; i++) { const y = (VH - ((u * 3 + i * 97) % (VH + 20))) | 0; rect('rgba(255,255,255,0.14)', 0, y, VW, 1); rect('rgba(0,0,0,0.22)', 0, y + 1, VW, 3); }
    for (let y = 1; y < VH; y += 3) rect('rgba(0,0,0,0.07)', 0, y, VW, 1);
  }
  function card(w, tt) {   // a shot that wouldn't build: the era's backdrop and its boss, as a still
    rect(w.bg, 0, 0, VW, VH); backdrop(w, tt * 3, 0, VH); rect('rgba(8,6,20,0.45)', 0, 0, VW, VH);
    bossArt(w.n, VW / 2, 128, 80, Math.round(Math.sin(tt / 10) * 2));
  }
  function lowerThird(s, tt) {   // the world's number, title and seasons; the stage's name, or BOSS: <name> under the boss shot
    const w = s.w, w0 = reel.find(q => q.w === w), k = Math.min(1, (tt - w0.t0) / 10), e = k * k * (3 - 2 * k), ox = Math.round(-(1 - e) * VW);
    ctx.save(); ctx.translate(ox, 0);
    rect('rgba(0,0,0,0.66)', 0, 140, VW, 30); rect(w.accent, 0, 140, VW, 1);
    rect(w.accent, 6, 144, 22, 11); text(String(w.n), 17, 147, '#000', 1, null, 'center');   // the world number on a tab of its colour
    text(w.title, 33, 144, lumOf(w.fg) > 130 ? w.fg : '#fffbd0', fitScale(w.title, VW - 40, 2), '#000');
    const v = tt - s.t0;
    if (s.boss) { if (v > 6 || v % 2) { rect('#e8302a', 6, 159, 22, 7); text('BOSS', 17, 160, '#fffbd0', 1, null, 'center'); text(w.boss, 33, 160, '#fffbd0', 1, '#000'); } }
    else { const L = LEVELS[s.id]; text(s.id.toUpperCase(), 17, 160, '#cfc6bc', 1, '#000', 'center'); text(clipW(((L && L.name) || '').toUpperCase(), 40), 33, 160, '#a8a0b8', 1, '#000'); }
    text(clipW(w.seasons || '', 30), VW - 8, 160, w.accent, 1, '#000', 'right');
    ctx.restore();
  }
  function drawRewind() {
    const tt = t, w1 = WORLDS[0], w2 = WORLDS[1];
    const osd = (s, x, y, col) => { text(s, x + 1, y + 1, '#000', 1, null); text(s, x, y, col, 1, null); };
    const bars = () => { rect('#000', 0, 0, VW, 10); rect('#000', 0, VH - 10, VW, 10); };   // letterbox: the footage plays between them
    if (tt < RW.play) {   // PLAY: World 1, still running
      if (tr && tr.ok) tr.draw(); else { rect(w1.bg, 0, 0, VW, VH); backdrop(w1, tt, 0, VH); }
      rect('rgba(0,0,0,0.45)', 0, 0, VW, VH); tracking(tt); bars();
      osd('PLAY >', 8, 3, '#7cff7c');
      typed('THAT WAS THE LAST', 62, tt, 10, '#fffbd0', 2, '#000'); typed('OSCAR SPECIAL,', 82, tt, 44, '#ffe680', 2, '#7a2a10');
    } else if (tt < RW.rew) {   // REWIND: each era's trailer, newest first, the tape counter running backwards
      const s = shot && shot.w ? shot : null, w = (s && s.w) || w2, u = tt - RW.play, v = s ? tt - s.t0 : 0;
      if (tr && tr.ok) tr.draw(); else card(w, tt);
      tracking(u); vhsCut(v); bars();
      osd('<< REWIND', 8, 3, '#7cff7c');
      const sec = Math.max(0, Math.round(5999 * (1 - u / Math.max(1, RW.rew - RW.play)))), cnt = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
      osd(cnt, VW - 8 - cnt.length * 4, 3, '#7cff7c');
      if (s) lowerThird(s, tt);
    } else {   // STOP, then PLAY: Season One
      const u = tt - RW.rew;
      rect(w2.bg, 0, 0, VW, VH); backdrop(w2, tt, 0, VH); rect('rgba(0,0,0,0.4)', 0, 0, VW, VH);
      if (u < 20) { osd('STOP', 10, 10, '#7cff7c'); rect('rgba(255,255,255,' + ((20 - u) / 40).toFixed(2) + ')', 0, 0, VW, VH); }
      else osd('PLAY >', 10, 10, '#7cff7c');
      typed("BUT LET'S GO BACK", 56, u, 20, '#fffbd0', 2, '#000');
      typed('TO SEASON ONE!', 78, u, 40, '#ffe680', 3, '#7a2a10');
      const dots = ['sam', 'mel', 'cloud', 'baxter'];
      if (u > 60) dots.forEach((n, i) => spr(n, 112 + i * 32, VH - 22 + Math.round(-Math.abs(Math.sin(tt / 9 + i * 1.3)) * 8), false, 1, 1));
      if (u === 20) sBeep(true);
    }
    if (tt > 30 && Math.floor(tt / 30) % 2) text(DD.padUsed ? 'CROSS: SKIP' : 'JUMP: SKIP', VW - 50, VH - 8, '#cfc6bc', 1, '#000');
  }
  const prepSongs = w => { const m = window.DDMusic; if (m && m.prepare && w) for (const id of idsOf(w)) m.prepare(id, w.n, /boss/.test(id)); };   // fetch the world's songs before its stages start
  function enterWorld(i) { if (worldOpen(WORLDS[i]) && !worldUnlocked(WORLDS[i])) { SFX.buzz(); note = 'BEAT ' + WORLDS[i - 1].boss + ' FIRST'; noteT = 60; return; } world = WORLDS[i]; st = 'era'; t = 0; eraPlay = false; SFX.switch(); prepSongs(world); if (world.n === 2) { let seen = false; try { seen = !!localStorage.getItem(RWK); } catch (e) {} if (!seen) { startRewind(); return; } } eraLine(world); }
  function playLevel(id, all) {
    pvStop();   // the poster's footage hands the engine back first
    prepSongs(WORLDS.find(w => idsOf(w).includes(id)));
    DD.start(LEVELS[id], { dots: all || ALL ? null : cast(), joins: all || ALL ? null : joinsOn(id), perks: perks(), store: !!window.DDStore,   // the HEI store's upgrades, and X on the results card stops there
      onSave: r => { record(r); if (!(all || ALL)) { DD.opts.dots = cast(); DD.opts.joins = joinsOn(id); } },   // AGAIN on the results card: save the win, and the replay has whoever just joined
      onExit: r => { record(r); if (r.store) return openStore(() => afterStage(id, r, all), 'PLAY ON'); afterStage(id, r, all); } });
  }
  // ---- the HEI Points store (store.js): from the world select, the stage list, or a results card on the way to the next stage
  const perks = () => window.DDStore ? window.DDStore.perks() : null;
  let storeBack = null;
  function openStore(back, label) { pvStop(); storeBack = back || null; st = 'store'; t = 0; SFX.switch(); if (window.DDStore) window.DDStore.open({ label: label || 'BACK' }); DD.setScene(scene); }
  function closeStore() { SFX.switch(); const f = storeBack; storeBack = null; if (f) f(); else { st = 'select'; t = 0; } }
  // a won stage plays straight on into the next one; a boss win goes on through the next world's era card; a quit (or a next
  // stage that isn't there yet) lands on this world's stage list with the cursor on the stage just played
  let eraPlay = false, eraAll = false;
  function afterStage(id, r, all) {
    const wi = WORLDS.findIndex(w => idsOf(w).includes(id)), w = WORLDS[wi], li = w ? idsOf(w).indexOf(id) : 0;
    if (!w) { st = 'select'; t = 0; return DD.setScene(scene); }
    cur = wi; world = w; lcur = li; t = 0;
    if (!r.quit) {
      const nx = w.levels[li + 1];
      if (id === '1-1' && !all && !ALL && !beaten('1-boss') && !skipped() && !beaten('1-2')) { st = 'fork'; fcur = 0; t = 0; return DD.setScene(scene); }   // the fork: more Dot City, or straight to On Cinema
      if (nx && have(nx.id) && (all || stageUnlocked(w, li + 1))) return setTimeout(() => playLevel(nx.id, all), 0);
      const nw = WORLDS[wi + 1];
      if (!nx && nw && worldOpen(nw) && (all || worldUnlocked(nw))) { cur = wi + 1; world = nw; st = 'era'; eraPlay = !!have(idsOf(nw)[0]); eraAll = !!all; prepSongs(nw); if (nw.n === 2) startRewind(); else eraLine(nw); return DD.setScene(scene); }
    }
    st = 'levels'; DD.setScene(scene);
  }
  const inR = (c, x, y, w, h) => c && c.x >= x && c.x < x + w && c.y >= y && c.y < y + h;

  // ---- options: save / load / clear the save, unlock everything, and the jukebox
  const SAVE_PRE = 'dootledots.', saveKeys = () => { const k = []; try { for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n && (n.indexOf(SAVE_PRE) === 0 || n === 'dd-mute')) k.push(n); } } catch (e) {} return k; };
  const say = (s, n = 90) => { note = s; noteT = n; };
  const MUS = () => window.DDMusic || null;
  const ROTL = () => ((window.CUES && window.CUES.rotation) || []).filter(n => !(window.DDMusic && window.DDMusic.missing(n)));   // songs fetch when highlighted (game/music.js)
  const songTitle = n => ((window.CUES && window.CUES.titles) || {})[n] || n.toUpperCase().replace(/-/g, ' ');
  let ocur = 0, jcur = 1, clearArm = 0;
  const CLR = 10;   // the CLEAR DATA row
  const VOLS = [['music', 'MUSIC'], ['sfx', 'SOUND EFFECTS'], ['voice', 'VOICES']];   // rows 0-2: volume sliders (left / right, or click the bar)
  const OPTS = () => {
    const m = MUS(), sh = m && m.prefs && m.prefs.shuffle;
    const V = window.DDVol;
    return [...VOLS.map(([k, n]) => [n, 'LEFT / RIGHT TO SET THE VOLUME', k, V ? V.level(k) : 10]), ['JUKEBOX', 'CHOOSE WHICH SONGS PLAY'], ['SHUFFLE: ' + (sh ? 'ON' : 'OFF'), sh ? 'SONGS COME UP IN ANY ORDER' : 'SONGS COME UP IN ORDER'],
      ['UNLOCK ALL LEVELS: ' + (ALL ? 'ON' : 'OFF'), ALL ? 'EVERY WORLD AND STAGE IS OPEN' : 'WORLDS OPEN ONE BOSS AT A TIME'],
      ['UNLOCK ALL DOTS: ' + (ALLD ? 'ON' : 'OFF'), ALLD ? 'ALL FOUR DOTS FROM THE FIRST STAGE' : 'THE DOTS JOIN ONE STAGE AT A TIME'],
      ['UNLIMITED HEI POINTS: ' + (unl() ? 'ON' : 'OFF'), unl() ? 'EVERY UPGRADE IN THE HEI STORE IS FREE' : 'EARN HEI POINTS BY BEATING STAGES'],
      ['SAVE DATA', 'DOWNLOAD YOUR SAVE AS A FILE'], ['LOAD DATA', 'OPEN A SAVE FILE'],
      [clearArm ? 'PRESS AGAIN TO CLEAR' : 'CLEAR DATA', 'ERASE ALL PROGRESS ON THIS COMPUTER'], ['BACK', '']];
  };
  const unl = () => !!(window.DDStore && window.DDStore.unlimited);
  function openOptions() { st = 'options'; t = 0; ocur = 0; clearArm = 0; SFX.switch(); }
  let inGame = null;   // { st, t, done } while the options are up over a paused level (the pause menu's OPTIONS); BACK hands it back
  function optBack() {
    if (!inGame) { st = 'select'; t = 0; SFX.switch(); return; }
    const g = inGame; inGame = null; st = g.st; t = g.t; lastSt = st; SFX.switch(); g.done();
  }
  function afterLoad() { try { PROG = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { PROG = {}; } ALL = Q.has('unlock') || unlockPref(); ALLD = dotsPref(); const m = MUS(); if (m && m.reloadPrefs) m.reloadPrefs(); if (window.DDStore) window.DDStore.reload(); }
  function saveData() {
    const data = {}; saveKeys().forEach(k => { data[k] = localStorage.getItem(k); });
    const json = JSON.stringify({ game: 'dootledots', v: 1, saved: new Date().toISOString(), data }, null, 1);
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'dootledots-save.json'; document.body.appendChild(a); a.click(); a.remove(); say('SAVED DOOTLEDOTS-SAVE.JSON'); SFX.switch(); }
    catch (e) { say('COULD NOT SAVE'); SFX.buzz(); }
  }
  function loadData() {
    try {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader();
        r.onload = () => { try { const o = JSON.parse(r.result); if (!o || o.game !== 'dootledots' || !o.data) throw 0;
          saveKeys().forEach(k => localStorage.removeItem(k)); Object.keys(o.data).forEach(k => { if (k.indexOf(SAVE_PRE) === 0 || k === 'dd-mute') localStorage.setItem(k, o.data[k]); });
          afterLoad(); say('SAVE LOADED'); SFX.switch(); } catch (e) { say('NOT A DOOTLE DOTS SAVE'); SFX.buzz(); } };
        r.readAsText(f); };
      inp.click();
    } catch (e) { say('COULD NOT OPEN A FILE'); SFX.buzz(); }
  }
  function clearData() { saveKeys().forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); PROG = {}; afterLoad(); say('ALL DATA CLEARED'); SFX.buzz(); }
  function optDo(i) {
    const m = MUS();
    if (i !== CLR) clearArm = 0;
    if (i < 3) return;   // sliders change with left / right
    i -= 3;
    if (i === 0) { st = 'jukebox'; t = 0; jcur = 1; SFX.switch(); }
    else if (i === 1) { if (m && m.setShuffle) m.setShuffle(!m.prefs.shuffle); SFX.tick(); }
    else if (i === 2) { ALL = !ALL; try { localStorage.setItem(UKEY, ALL ? '1' : '0'); } catch (e) {} if (!ALL) ALL = Q.has('unlock'); SFX.tick(); }
    else if (i === 3) { ALLD = !ALLD; try { localStorage.setItem(DKEY, ALLD ? '1' : '0'); } catch (e) {} SFX.tick(); }
    else if (i === 4) { if (window.DDStore) window.DDStore.setUnlimited(!unl()); SFX.tick(); }
    else if (i === 5) saveData();
    else if (i === 6) loadData();
    else if (i === CLR - 3) { if (clearArm) { clearArm = 0; clearData(); } else { clearArm = 1; SFX.buzz(); } }
    else optBack();
  }
  const SLX = 150, SLW = 9;   // the sliders' bar: left edge and notch width
  const OY = i => 21 + i * 11, JB = { x: [14, 166], y0: 36, dy: 12, per: 9 };
  const jPos = k => ({ x: JB.x[Math.floor(k / JB.per)], y: JB.y0 + (k % JB.per) * JB.dy });   // song k (0-based) on the jukebox page
  function jukeDo(i) {
    const m = MUS(), list = ROTL(); if (!m) return;
    if (i === 0) { m.setShuffle(!m.prefs.shuffle); SFX.tick(); return; }
    const n = list[i - 1]; if (!n) return;
    if (m.toggle(n)) SFX.tick(); else { SFX.buzz(); say('KEEP AT LEAST ONE SONG ON', 60); }
  }

  function step(IN) {
    t++; if (noteT > 0) noteT--;
    const c = click; click = null;
    if (st === 'load') return;
    if (world) world.levels.forEach((l, i) => { const tgt = st === 'levels' && i === lcur ? 6 : 0; rowVel[i] = ((rowVel[i] || 0) + (tgt - (rowNudge[i] || 0)) * 0.3) * 0.62; rowNudge[i] = (rowNudge[i] || 0) + rowVel[i]; });
    if (wipeT < WIPE) wipeT++;
    WORLDS.forEach((w, i) => { const tgt = st === 'select' && i === cur ? 6 : 0; vel[i] = (vel[i] + (tgt - lift[i]) * 0.3) * 0.62; lift[i] += vel[i]; });   // springy pop-out
    if (st === 'fork') {
      if (IN.ny) { fcur = (fcur + 2 + IN.ny) % 2; SFX.tick(); }
      if (c) { for (let i = 0; i < 2; i++) if (inR(c, 30, FY(i) - 6, VW - 60, 24)) { if (i === fcur) return forkDo(i); fcur = i; SFX.tick(); } }
      else if (IN.ok && t > 20) return forkDo(fcur);
      return;
    }
    if (st === 'rewind') {
      if (t === 1) { DD.noise(0.4, 0.05, 900); }
      if (t === RW.play) { DD.tone(400, 1600, 0.5, 'square', 0.03); }   // the motor kicks into rewind
      if (t >= RW.end || (t > 30 && (IN.ok || IN.start || IN.any || c))) return rewindDone();
      rwRoll();
      return;
    }
    if (st === 'store') { if (!window.DDStore || window.DDStore.step(IN, c) === 'back') closeStore(); return; }
    if (st === 'title') {
      if (t === 20) sCurtain(); if (t === 120) sTa();
      if (IN.ok || IN.start || IN.any || c) { st = 'select'; t = 0; SFX.switch(); }
      return;
    }
    if (st === 'select') {
      if (swT > 0) swT--;
      if (hover && hover.dirty) { hover.dirty = false; for (let i = 0; i < WORLDS.length; i++) { const s = slot(i); if (inR(hover, s.x - 2, s.y - 8, SP.w + 4, SP.h + 10)) { selectTo(i); break; } } }
      if (IN.nx) { const n = Math.max(0, Math.min(WORLDS.length - 1, cur + IN.nx)); if (n !== cur) selectTo(n); }
      if (IN.ny < 0) openShelf();   // up: Gregg's shelf
      if (c && inR(c, 0, 0, 58, 14)) { openShelf(); return; }
      if ((c && inR(c, VW - 62, 0, 62, 14)) || IN.opt) { openOptions(); return; }
      if ((c && inR(c, VW - 98, 0, 36, 14)) || IN.store) { openStore(() => { st = 'select'; t = 0; }); return; }
      if (c) { let hit = false; for (let i = 0; i < WORLDS.length; i++) { const s = slot(i); if (inR(c, s.x - 2, s.y - 8, SP.w + 4, SP.h + 10)) { hit = true; if (i === cur) enterWorld(cur); else selectTo(i); break; } }
        if (!hit && inR(c, CARD.x, CARD.y, CARD.w, CARD.h)) enterWorld(cur); }   // the featured card is the big PLAY button
      if (IN.ok) enterWorld(cur);
      if (IN.back) { st = 'title'; t = 130; }
    } else if (st === 'options') {
      const n = OPTS().length;
      if (IN.ny) { ocur = (ocur + IN.ny + n) % n; if (ocur !== CLR) clearArm = 0; SFX.tick(); }
      if (IN.nx && ocur < 3) { const V = window.DDVol, k = VOLS[ocur][0]; if (V) { V.set(k, V.level(k) + IN.nx); if (k === 'sfx') SFX.tick(); else if (k === 'voice' && window.DDVoice && window.DDVoice.preview) window.DDVoice.preview(); } }
      else if (IN.nx && ocur >= 4 && ocur <= 7) optDo(ocur);
      if (c && c.y >= OY(0) - 3 && c.y < OY(2) + 8 && c.x >= SLX && c.x < SLX + 10 * SLW) { const i = Math.floor((c.y - OY(0) + 3) / 11), V = window.DDVol; if (i >= 0 && i < 3 && V) { ocur = i; V.set(VOLS[i][0], Math.round((c.x - SLX) / SLW + 0.5)); SFX.tick(); } }
      else if (c) { for (let i = 0; i < n; i++) if (inR(c, 40, OY(i) - 3, VW - 80, 11)) { if (i === ocur) optDo(i); else { ocur = i; if (i !== CLR) clearArm = 0; SFX.tick(); } } }
      else if (IN.ok) optDo(ocur);
      if (IN.back || IN.opt) optBack();
    } else if (st === 'jukebox') {
      const list = ROTL(), m = MUS();
      if (IN.ny) { if (jcur === 0) { if (IN.ny > 0) jcur = 1; } else { const k = jcur - 1, col = Math.floor(k / JB.per), r = k % JB.per + IN.ny;
        if (r < 0) jcur = 0; else if (r < JB.per && col * JB.per + r < list.length) jcur = col * JB.per + r + 1; } SFX.tick(); }
      if (IN.nx && jcur > 0) { const k = jcur - 1 + IN.nx * JB.per; if (k >= 0 && k < list.length) { jcur = k + 1; SFX.tick(); } }
      if (c) { if (inR(c, 100, 18, 120, 12)) { if (jcur === 0) jukeDo(0); else jcur = 0; }
        else list.forEach((n, k) => { const p = jPos(k); if (inR(c, p.x - 2, p.y - 2, 148, 11)) { if (jcur === k + 1) jukeDo(k + 1); else { jcur = k + 1; SFX.tick(); } } }); }
      else if (IN.ok) jukeDo(jcur);
      if (m) m.preview = jcur > 0 ? list[jcur - 1] : null;
      if (IN.back || IN.opt) { if (m) m.preview = null; st = 'options'; t = 0; SFX.switch(); }
    } else if (st === 'era') {
      if (t < 24 && t % 8 === 0) sBeep(false);
      if (t === 24) sBeep(true);
      if (t <= 24 && (IN.ok || IN.start || c)) t = 24;   // skip the countdown
      else if (t > 24 && (IN.ok || IN.start || c)) { st = 'levels'; t = 0; lcur = 0; SFX.switch(); if (eraPlay) { eraPlay = false; return playLevel(world.levels[0].id, eraAll); } }   // reached by beating the last boss: on into the new world's first stage
      if (IN.back) { st = 'select'; t = 0; eraPlay = false; }
    } else if (st === 'shelf') {
      const n = shelfIds().length;
      if (IN.nx) { scur = Math.max(0, Math.min(n - 1, scur + IN.nx)); SFX.tick(); }
      if (IN.ny) { const k = scur + IN.ny * SH.n; if (k >= 0 && k < n) { scur = k; SFX.tick(); } else if (IN.ny < 0) { st = 'select'; t = 0; } }
      if (c) { let hit = false; shelfIds().forEach((id, i) => { const x = SH.x0 + (i % SH.n) * (SH.w + SH.gx), y = SH.y0[Math.floor(i / SH.n)]; if (inR(c, x, y - 4, SH.w, SH.h + 4)) { scur = i; hit = true; SFX.tick(); } }); if (!hit) { st = 'select'; t = 0; } }
      if (IN.ok) { const id = shelfIds()[scur], w = WORLDS[parseInt(id, 10) - 1]; if (w && worldTapes(w) === w.levels.length && window.makeBonus) { const B = window.makeBonus(w.n, LEVELS); if (B) { SFX.switch(); return DD.start(B, { perks: perks(), onSave: record, onExit: r => { record(r); st = 'shelf'; t = 0; DD.setScene(scene); } }); } } SFX.buzz(); }
      if (IN.back) { st = 'select'; t = 0; SFX.switch(); }
    } else if (st === 'levels') {
      const n = world.levels.length;
      pvRoll();
      if (IN.ny) { lcur = (lcur + IN.ny + n) % n; SFX.tick(); }
      let go = IN.ok;
      if (c) { world.levels.forEach((l, i) => { if (inR(c, ROW.x - 1, rowY(i) - 1, ROW.w + 2, compact() ? 28 : 34)) { if (i === lcur) go = true; else { lcur = i; SFX.tick(); } } }); if (inR(c, PV.x - 3, PV.y - 3, PV.w + 6, PV.h + 6)) go = true; if (inR(c, VW - 58, 0, 58, 15)) { openStore(() => { st = 'levels'; t = 0; }); return; } if (c.y >= 160) { st = 'select'; t = 0; } }
      if (IN.store) { openStore(() => { st = 'levels'; t = 0; }); return; }
      if (go && st === 'levels') {
        const id = world.levels[lcur].id;
        if (have(id) && !stageUnlocked(world, lcur)) { SFX.buzz(); note = 'BEAT ' + world.levels[lcur - 1].id.toUpperCase() + ' FIRST'; noteT = 60; }
        else if (have(id)) { SFX.switch(); playLevel(id); } else { SFX.buzz(); note = 'COMING SOON'; noteT = 60; }
      }
      if (IN.back) { st = 'select'; t = 0; }
    }
  }

  // ---------------------------------------------------------------- title: the On Cinema theater
  function bg(top, bot) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  const CURT = 174;
  function curtain(x0, w, shadeA, off) {   // a stretch of the draped curtain, clipped to [x0, x0+w), shifted by off
    clipRect(x0, 0, w, VH);
    for (let x = -CURT + off; x < VW + CURT; x += CURT) spr('w2_curtain', x + CURT / 2, 216, false, 1, 1);
    if (shadeA) rect('rgba(8,2,12,' + shadeA + ')', x0, 0, w, VH);
    ctx.restore();
  }
  const GOLD = ['#fff6c0', '#ffe27a', '#f0c84a', '#d89a28', '#b06a18'];
  function logoWord(str, cx, y, s, glint) {   // big pixel type: dark outline, drop shadow, a gold ramp row by font row, and a glint sweep
    const x = cx - Math.floor(tw(str, s) / 2);
    const o = 1;
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]]) text(str, x + dx, y + dy, '#3a1408', s, null);
    text(str, x + 3, y + 4, '#8a5a1c', s, null);
    for (let r = 0; r < 5; r++) { clipRect(x - 4, y + r * s, tw(str, s) + 8, s); text(str, x, y, GOLD[r], s, null); ctx.restore(); }
    if (glint !== null) {   // a bright diagonal band slides across
      ctx.save(); ctx.beginPath(); const gx = glint; ctx.moveTo(gx, y - 4); ctx.lineTo(gx + 12, y - 4); ctx.lineTo(gx + 2, y + 5 * s + 4); ctx.lineTo(gx - 10, y + 5 * s + 4); ctx.closePath(); ctx.clip();
      text(str, x, y, '#ffffff', s, null); ctx.restore();
    }
  }
  function beam(k) {   // the projector beam: a soft stepped cone from the booth to the screen
    const tt = t;
    for (let y = 12; y < 130; y++) { const f = (y - 12) / 118, hw = 4 + f * 96, a = k * (1 - f * 0.6) * (1 + 0.15 * Math.sin(tt / 14)); rect('rgba(255,236,190,' + a.toFixed(3) + ')', 160 - hw, y, hw * 2, 1); rect('rgba(255,236,190,' + (a * 0.7).toFixed(3) + ')', 160 - hw * 0.55, y, hw * 1.1, 1); }
  }
  function drawTitle() {
    const tt = t, open = ease((tt - 20) / 95), bulb = Math.floor(tt / 5);
    rect('#0a0408', 0, 0, VW, VH);
    curtain(0, VW, 0.5, 0);   // the back curtain, in the dark
    // the screen: lamps, gilded frame with a chasing marquee, the logo
    for (const gx of [36, 284]) { const g = ctx.createRadialGradient(gx, 92, 2, gx, 92, 34); g.addColorStop(0, 'rgba(255,214,120,0.40)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 36, 56, 72, 72); spr('w2_sconce', gx, 100, false, 1, 1); }
        beam(0.1);   // the beam lights the curtain behind the screen
    const sx = 70, sy = 26;
    spr('menu_screen', sx + 90, sy + 104);
    for (let i = 0, x = 4; x < 172 + 8; x += 6, i++) for (const yy of [3, 99]) { if ((i + bulb) % 3 === 0) { rect('#fffbd0', sx + x, sy + yy, 2, 2); rect('rgba(255,240,160,0.35)', sx + x - 1, sy + yy - 1, 4, 4); } }
    for (let i = 0, y = 10; y < 96 + 8; y += 6, i++) for (const xx of [3, 171]) if ((i + bulb + 1) % 3 === 0) { rect('#fffbd0', sx + xx, sy + y, 2, 2); rect('rgba(255,240,160,0.35)', sx + xx - 1, sy + y - 1, 4, 4); }
    const show = tt > 20 + 60;   // the screen wakes as the curtain clears
    const glow = ease((tt - 70) / 30);
    if (glow > 0) {
      const gl = tt % 260; const g1 = gl < 40 ? 100 + gl * 5 : null, g2 = gl < 40 ? 100 + gl * 5 - 28 : null;
      logoWord('DOOTLE', 160, 37, 6, g1 === null ? null : g1);
      logoWord('DOTS', 160, 70, 6, g2 === null ? null : g2 + 8);
      for (const [side, tx] of [[0, 97], [1, 223]]) {   // popcorn tubs flank DOTS and toss kernels
        const hop = Math.max(0, Math.sin(((tt + side * 24) % 48) / 48 * Math.PI)) * 5;
        spr('tub', tx, 98 - hop, side === 1, 1, 1);
        for (let k = 0; k < 2; k++) { const p = ((tt * 1.1 + k * 45 + side * 20) % 90) / 90; spr('pop', tx + (k ? 1 : -1) * (4 + 10 * p), 90 - hop - Math.sin(p * Math.PI) * 10 + p * 8, false, 1, 1, 0, 1 - p * p * p); }
      }
      text('AN UNOFFICIAL FAN GAME', 160, 108, '#8a1c24', 1, null, 'center');
      if (glow < 1) rect('rgba(250,244,226,' + (1 - glow) + ')', sx + 8, sy + 8, 164, 88);
    }
    beam(0.03);
    // carpet and the audience: back row (the Dots hop on these) and a front row
    for (let x = 0; x < VW; x += 16) spr('w2_carpet', x + 8, 180);
    rect('rgba(8,2,12,0.35)', 0, 120, VW, 60);
    const dots = [['sam', 134], ['mel', 164], ['cloud', 194], ['baxter', 224]];
    dots.forEach(([n, x], i) => {
      const p = ((tt + i * 13) % 52) / 52, air = p < 0.62, a = air ? Math.sin(p / 0.62 * Math.PI) : 0, land = !air && p < 0.72;
      spr(n, x, 150 - Math.round(a * 14), false, land ? 1.12 : 1 - a * 0.06, land ? 0.88 : 1 + a * 0.08);
    });
    for (let i = 0; i < 12; i++) spr('seat', 14 + i * 30, 172, false, 1, 1);
    for (let i = 0; i < 11; i++) { spr('seat', 29 + i * 30, 196, false, 1, 1); }
    rect('rgba(6,2,10,0.45)', 0, 158, VW, 22);
    // dust motes drifting in the beam
    for (let i = 0; i < 44; i++) {
      const bx = 60 + hash(i) * 200, by = hash(i + 50) * 150, sp = 0.12 + hash(i + 9) * 0.25;
      const y = ((by - tt * sp) % 150 + 150) % 150 + 10, x = bx + Math.sin(tt / (40 + i) + i) * 7, k = (y - 12) / 118, hw = 4 + k * 96;
      const inside = Math.abs(x - 160) < hw && y < 130;
      const tw2 = 0.5 + 0.5 * Math.sin(tt / 9 + i * 2);
      rect(inside ? 'rgba(255,248,214,' + (0.35 + tw2 * 0.5).toFixed(2) + ')' : 'rgba(255,230,190,0.12)', Math.round(x), Math.round(y), inside && i % 3 === 0 ? 2 : 1, 1);
    }
    // valance across the top, and the front curtain that parts
    for (let x = 0; x < VW; x += 40) spr('w2_valance', x + 20, 26);
    rect('rgba(0,0,0,0.25)', 0, 26, VW, 2);
    if (open < 1) {
      const half = VW / 2, gather = 30, travel = (half - gather) * open;
      curtain(0, half - travel, 0, -travel); curtain(half + travel, half - travel, 0, travel);   // the halves slide outward and bunch at the sides
      if (open > 0.02) { rect('rgba(0,0,0,0.35)', half - travel - 3, 0, 3, VH); rect('rgba(0,0,0,0.35)', half + travel, 0, 3, VH); }
      for (let x = 0; x < VW; x += 40) spr('w2_valance', x + 20, 26);
    }
    // soft vignette
    for (let i = 0; i < 8; i++) { rect('rgba(0,0,0,' + (0.07 * (8 - i) / 8).toFixed(3) + ')', i * 3, 28, 3, VH - 28); rect('rgba(0,0,0,' + (0.07 * (8 - i) / 8).toFixed(3) + ')', VW - i * 3 - 3, 28, 3, VH - 28); }
    // press start on a brass plaque
    if (tt > 100) {
      rect('#2a1408', 94, 160, 132, 17); rect('#c98f22', 94, 160, 132, 1); rect('#c98f22', 94, 176, 132, 1); rect('#c98f22', 94, 160, 1, 17); rect('#c98f22', 225, 160, 1, 17);
      rect('#4f0f24', 96, 162, 128, 13);
      if (blink(tt, 28)) text('PRESS ANY BUTTON', 160, 164, '#fff6c0', 2, '#7a2a10', 'center');
    }
    if (tt > 100 && tt < 124) rect('rgba(255,248,214,' + ((124 - tt) / 24 * 0.5).toFixed(2) + ')', 0, 0, VW, VH);
    if (msg && tt > 100) ctext(msg, 150, '#ff8080', 1);
  }

  // ---------------------------------------------------------------- world select: a shelf of VHS sleeves
  const wrapRows = (str, n) => { const rows = []; let row = ''; str.split(' ').forEach(wd => { if (row && (row + ' ' + wd).length > n) { rows.push(row); row = wd; } else row = row ? row + ' ' + wd : wd; }); if (row) rows.push(row); return rows; };
  function spine(i, w, open, on, tt) {   // a tape spine in the rack: era colours, a paper label with the world's number; dark and unlabelled until you get there
    const s = slot(i), x = s.x, y = Math.round(s.y - lift[i]), W = SP.w, H = SP.h, locked = worldOpen(w) && !open, next = locked && WORLDS[i - 1] && worldUnlocked(WORLDS[i - 1]);
    rect('rgba(0,0,0,0.45)', x + 2, s.y + 2, W, H);   // shadow on the shelf back
    if (on) { const pul = 0.55 + 0.45 * Math.sin(tt / 6); rect(w.accent, x - 2, y - 2, W + 4, H + 4); rect('rgba(255,255,255,' + (0.5 * pul).toFixed(2) + ')', x - 2, y - 2, W + 4, 1); }
    rect(on ? '#fff' : '#000', x - 1, y - 1, W + 2, H + 2);
    rect(open ? w.band : '#1a1016', x, y, W, H);
    rect(open ? w.accent : '#2a2028', x, y, W, 3); rect(open ? shade(w.band, 0.6) : '#120c10', x, y + H - 3, W, 3);
    rect(open ? '#f4ecd8' : (next && blink(tt, 24) ? '#4a3a30' : '#2a2228'), x + 2, y + 6, W - 4, 16);   // the paper label
    if (open) rect(w.accent, x + 2, y + 6, W - 4, 1);
    text(String(w.n), x + W / 2, y + 9, open ? '#1a1218' : (next ? '#ffb070' : '#4a4048'), 2, null, 'center');
    if (open) { const dn = idsOf(w).filter(beaten).length, n = w.levels.length; for (let k = 0; k < n; k++) rect(k < dn ? w.accent : 'rgba(0,0,0,0.35)', x + 3 + k * Math.floor((W - 6) / n), y + 26, Math.floor((W - 6) / n) - 1, 3); }   // stages beaten, as ticks down the spine
    if (worldMarks(w) === w.levels.length * 3) { rect('#ffe680', x + W / 2 - 1, y + 30, 2, 6); rect('#ffe680', x + W / 2 - 3, y + 32, 6, 2); }   // every mark: a gold star
    if (!open) { if (next) { for (let k = 0; k < 3; k++) rect('#ffb070', x + W / 2 - 1 + (k === 1 ? 0 : 0), y + 27 + k * 3, 2, 2); }   // a dotted thread down to the next tape
      else { rect('#000', x + W / 2 - 3, y + 28, 6, 5); rect('#3a3038', x + W / 2 - 2, y + 29, 4, 3); rect('#000', x + W / 2 - 2, y + 25, 1, 3); rect('#000', x + W / 2 + 1, y + 25, 1, 3); rect('#000', x + W / 2 - 1, y + 25, 2, 1); } }   // a tiny padlock
    if (!on) rect('rgba(8,2,12,' + (open ? 0.1 : 0.22) + ')', x, y, W, H);
  }
  function featured(w, tt) {   // the big card: a 2x picture of the world, its name and seasons, its line, and the run so far
    const C = CARD, x = C.x, y = C.y, open = worldPlay(w), locked = worldOpen(w) && !open, pw = WORLDS[cur - 1], lt = !SHD(w), dim = lt ? '#5a4a60' : '#a89aa0';
    rect('rgba(0,0,0,0.5)', x + 4, y + 4, C.w, C.h);
    rect('#000', x - 2, y - 2, C.w + 4, C.h + 4); rect(open ? w.accent : '#4a3a40', x - 1, y - 1, C.w + 2, C.h + 2);
    rect(open ? w.bg : shade(w.bg, 0.4), x, y, C.w, C.h);
    rect(open ? w.band : shade(w.band, 0.4), x, y, C.w, 4);   // a thin era band along the top
    // picture, at twice the rack's scale
    const px = x + 8, py = y + 12, PW = 84, PH = 52;
    rect('#000', px - 2, py - 2, PW + 4, PH + 4); rect(open ? w.accent : '#4a3a40', px - 2, py - 2, PW + 4, 1);
    ctx.save(); ctx.translate(px, py); ctx.scale(2, 2); thumb(w, 0, 0, open, tt); ctx.restore();
    if (open) { const g = (tt * 1.3) % 110 - 20; if (g > -10 && g < PW + 14) { clipRect(px, py, PW, PH); ctx.beginPath(); ctx.moveTo(px + g, py); ctx.lineTo(px + g + 12, py); ctx.lineTo(px + g - 4, py + PH); ctx.lineTo(px + g - 16, py + PH); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill(); ctx.restore(); } }   // a glint sweeps the picture
    if (swT > 0) rect('rgba(255,246,220,' + (0.06 * swT).toFixed(2) + ')', px, py, PW, PH);   // the tape went in
    if (!open) { rect('rgba(8,4,12,0.66)', px, py, PW, PH); text(locked ? 'LOCKED' : 'COMING SOON', px + PW / 2, py + PH / 2 - 3, '#d8c8d0', 1, '#000', 'center'); }
    // the right column: number, title, seasons, the line
    const tx = x + 104, cw = C.w - 112;
    text('WORLD ' + w.n, tx, y + 12, open ? w.accent : dim, 2, SHD(w) ? '#000' : null);
    text(w.title, tx, y + 30, open ? w.fg : dim, 1, SHD(w));
    text(w.seasons, tx, y + 39, dim, 1, SHD(w));
    const line = open ? w.tag : locked ? (pw && worldUnlocked(pw) ? 'BEAT ' + pw.boss + ' TO OPEN IT' : 'OPENS AFTER WORLD ' + (w.n - 1)) : 'COMING SOON';
    wrapRows(line, Math.floor(cw / 4)).slice(0, 2).forEach((r, k) => text(r, tx, y + 52 + k * 9, open ? w.fg : '#ffb070', 1, SHD(w)));
    // the run so far, under the picture
    if (open) {
      const sy = y + C.h - 11, full = worldMarks(w) === w.levels.length * 3;
      tubIcon(px, sy, '#d8202c'); text(worldBags(w) + '/' + worldMax(w), px + 8, sy + 1, open ? w.fg : dim, 1, SHD(w));
      vhsIcon(px + 36, sy + 1, '#e8504a'); text(worldVhs(w) + '/' + w.levels.length, px + 47, sy + 1, w.fg, 1, SHD(w));
      star4(px + 66, sy + 4, full ? '#ffe680' : w.fg); text(worldMarks(w) + '/' + w.levels.length * 3, px + 70, sy + 1, full ? '#ffe680' : w.fg, 1, SHD(w));
      const dn = idsOf(w).filter(beaten).length; text(dn === w.levels.length ? 'CLEARED' : dn + '/' + w.levels.length + ' STAGES', x + C.w - 8, sy + 1, dn === w.levels.length ? w.accent : dim, 1, SHD(w), 'right');
    }
  }
  function drawSelect() {
    const tt = t;
    rect('#120610', 0, 0, VW, VH);
    for (let x = -CURT + (-tt * 0.05 % CURT); x < VW + CURT; x += CURT) spr('w2_curtain', x + CURT / 2, 216);
    rect('rgba(10,4,14,0.72)', 0, 0, VW, VH);
    { const y = SP.y + SP.h;   // the wooden shelf the rack sits on
      rect('#000', 0, y, VW, 6); rect('#94683c', 0, y + 1, VW, 1); rect('#6a4626', 0, y + 2, VW, 2); rect('#3a2414', 0, y + 4, VW, 2); rect('rgba(0,0,0,0.5)', 0, y + 6, VW, 2); }
    for (let i = 0; i < WORLDS.length; i++) if (i !== cur) spine(i, WORLDS[i], worldPlay(WORLDS[i]), false, tt);
    spine(cur, WORLDS[cur], worldPlay(WORLDS[cur]), true, tt);   // the highlighted one last, so it sits in front
    featured(WORLDS[cur], tt);
    // header: a marquee
    rect('#2a0e1a', 0, 0, VW, 14); rect('#c98f22', 0, 14, VW, 1);
    for (let x = 4, i = 0; x < VW; x += 8, i++) { rect((i + Math.floor(tt / 6)) % 3 === 0 ? '#fffbd0' : '#8a5a1c', x, 6, 2, 2); }
    rect('#2a0e1a', 60, 0, 200, 14);
    ctext('SELECT A WORLD', 2, '#ffe680', 2, '#7a2a10');
    rect('#2a0e1a', 2, 2, 52, 11); vhsIcon(5, 4, '#e8504a'); text('SHELF', 17, 5, Math.floor(tt / 20) % 2 ? '#fffbd0' : '#ffd27a', 1, null);   // up, or click
    rect('#2a0e1a', VW - 60, 2, 58, 11); text('OPTIONS', VW - 31, 5, '#ffd27a', 1, null, 'center');
    storeBtn(VW - 98, 2, 36, 'STORE', tt);
    if (noteT > 0) { rect('#0a0408', 0, CARD.y + CARD.h + 3, VW, 11); ctext(note, CARD.y + CARD.h + 5, '#ff8080', 1); }
    // footer: the total, and the buttons
    const tot = WORLDS.reduce((s, x) => s + worldBags(x), 0), mx = WORLDS.reduce((s, x) => s + worldMax(x), 0);
    rect('rgba(0,0,0,0.55)', 0, VH - 12, VW, 12);
    tubIcon(6, VH - 10, '#d8202c'); text(tot + '/' + mx, 14, VH - 9, '#ffd27a', 1, null);
    text(DD.padUsed ? 'CROSS: PLAY    SQUARE: HEI STORE    CIRCLE: BACK' : 'JUMP: PLAY    H: HEI STORE    X: BACK', VW - 6, VH - 9, '#d8c8d0', 1, null, 'right');
  }

  function storeBtn(x, y, w, label, tt) {   // the HEI store's button: a coin and the label, the coin glinting when something is affordable
    const S = window.DDStore; if (!S) return;
    const can = S.canBuy(), hop = can ? Math.round(Math.abs(Math.sin(tt / 9)) * 1) : 0;
    rect('#2a0e1a', x, y, w, 11); if (can) rect('#c98f22', x, y + 10, w, 1);
    S.icon('rewards', x + 2, y + 1 - hop, 1); text(label, x + 12, y + 3, can && Math.floor(tt / 20) % 2 ? '#fffbd0' : '#ffd27a', 1, null);
  }
  function curtainBg(tt) { rect('#120610', 0, 0, VW, VH); for (let x = -CURT + (-tt * 0.05 % CURT); x < VW + CURT; x += CURT) spr('w2_curtain', x + CURT / 2, 216); rect('rgba(10,4,14,0.8)', 0, 0, VW, VH); rect('#2a0e1a', 0, 0, VW, 14); rect('#c98f22', 0, 14, VW, 1); }
  function drawNote() { if (noteT > 0) { rect('#0a0408', 0, 150, VW, 11); ctext(note, 152, '#ff8080', 1); } }
  function drawOptions() {
    curtainBg(t); ctext('OPTIONS', 2, '#ffe680', 2, '#7a2a10');
    const O = OPTS();
    O.forEach((o, i) => {
      const y = OY(i), on = i === ocur;
      if (on) { rect('#3a1420', 40, y - 3, VW - 80, 10); rect('#c98f22', 40, y - 3, 2, 10); }
      if (o[2]) {   // a volume slider: ten notches
        text(o[0], 50, y, on ? '#fffbd0' : '#c8a8a0', 1, null);
        for (let k = 0; k < 10; k++) rect(k < o[3] ? (on ? '#ffd27a' : '#c98f22') : '#4a2a30', SLX + k * SLW, y - 1, SLW - 2, 7);
        text(String(o[3] * 10) + '%', SLX + 10 * SLW + 6, y, on ? '#fffbd0' : '#c8a8a0', 1, null);
      } else ctext(o[0], y, on ? (i === CLR && clearArm ? '#ff8080' : '#fffbd0') : '#c8a8a0', 1);
    });
    if (O[ocur][1]) ctext(O[ocur][1], 157, '#9ac8a0', 1);
    drawNote();
    ctext(DD.padUsed ? 'CROSS: CHOOSE    CIRCLE: BACK' : 'JUMP: CHOOSE    X: BACK', 168, '#ffd27a', 1, '#000');
  }
  function drawJukebox() {
    curtainBg(t); ctext('JUKEBOX', 2, '#ffe680', 2, '#7a2a10');
    const m = MUS(), list = ROTL(), sh = m && m.prefs && m.prefs.shuffle;
    if (jcur === 0) rect('#3a1420', 100, 18, 120, 12);
    ctext('SHUFFLE: ' + (sh ? 'ON' : 'OFF'), 21, jcur === 0 ? '#fffbd0' : '#c8a8a0', 1);
    list.forEach((n, k) => {
      const p = jPos(k), on = jcur === k + 1, yes = !m || m.isOn(n);
      if (on) { rect('#3a1420', p.x - 2, p.y - 2, 148, 10); rect('#c98f22', p.x - 2, p.y - 2, 2, 10); }
      text(yes ? '[X]' : '[ ]', p.x + 2, p.y, yes ? '#9ac8a0' : '#6a5a60', 1, null);
      text(songTitle(n), p.x + 18, p.y, on ? '#fffbd0' : yes ? '#c8a8a0' : '#6a5a60', 1, null);
      if (on && Math.floor(t / 15) % 2) rect('#ffd27a', p.x + 140, p.y + 1, 3, 3);   // playing
    });
    drawNote();
    ctext(jcur === 0 ? 'SONGS COME UP ' + (sh ? 'IN ANY ORDER' : 'IN ORDER') : 'PLAYING NOW. ' + (DD.padUsed ? 'CROSS' : 'JUMP') + ': IN OR OUT OF THE ROTATION', 158, '#9ac8a0', 1);
    ctext(DD.padUsed ? 'CROSS: CHOOSE    CIRCLE: BACK' : 'JUMP: CHOOSE    X: BACK', 168, '#ffd27a', 1, '#000');
  }

  function drawShelf() {   // Gregg's shelf: red-tape spines for the tapes you've found, dark gaps for the rest
    const ids = shelfIds(), tt = t;
    rect('#120610', 0, 0, VW, VH);
    for (let x = -CURT + (-tt * 0.05 % CURT); x < VW + CURT; x += CURT) spr('w2_curtain', x + CURT / 2, 216);
    rect('rgba(10,4,14,0.8)', 0, 0, VW, VH);
    rect('#2a0e1a', 0, 0, VW, 14); rect('#c98f22', 0, 14, VW, 1);
    const got = ids.filter(id => PROG[id] && PROG[id].vhs).length;
    ctext("GREGG'S SHELF", 2, '#ffe680', 2, '#7a2a10');
    text(got + '/' + ids.length, VW - 4 - (String(got).length + String(ids.length).length + 1) * 4, 5, '#fff6d4', 1, null);
    for (let r = 0; r < 2; r++) {
      const y = SH.y0[r] + SH.h;
      rect('#000', 0, y, VW, 6); rect('#94683c', 0, y + 1, VW, 1); rect('#6a4626', 0, y + 2, VW, 2); rect('#3a2414', 0, y + 4, VW, 2);
    }
    ids.forEach((id, i) => {
      const on = PROG[id] && PROG[id].vhs, sel = i === scur, c = CLASSICS[id];
      const x = SH.x0 + (i % SH.n) * (SH.w + SH.gx), y = SH.y0[Math.floor(i / SH.n)] - (sel ? 3 : 0);
      if (!on) { rect('#000', x, y + 4, SH.w, SH.h - 4); rect('#24161c', x + 1, y + 5, SH.w - 2, SH.h - 6); text('?', x + SH.w / 2 - 1, y + 24, '#5a4048', 1, null); }
      else {
        rect('#000', x, y, SH.w, SH.h); rect('#1c1c24', x + 1, y + 1, SH.w - 2, SH.h - 2); rect('#2e2e3a', x + 2, y + 1, 1, SH.h - 2);
        rect('#c8202c', x + 2, y + 2, 8, SH.h - 4); rect('#e8504a', x + 2, y + 2, 1, SH.h - 4);   // Gregg's red tape, code written down it
        for (let k = 0; k < 8; k++) text(c.code[k], x + 5, y + 3 + k * 6, '#fff6d4', 1, null);
      }
      if (sel) { ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y + (on ? 0 : 4) - 0.5, SH.w + 1, SH.h - (on ? 0 : 4) + 1); }
    });
    const id = ids[scur], c = CLASSICS[id], p = PROG[id] || {}, boss = /boss/.test(id), Y = 141;
    rect('#0a0408', 0, Y - 4, VW, VH - Y + 4); rect('#c98f22', 0, Y - 4, VW, 1);
    if (p.vhs) {
      ctext(c.title, Y, '#ffe680', 1);
      ctext(c.year + '   ' + c.min + ' MIN   DIR. ' + c.dir, Y + 8, '#fff6d4', 1, null);
      ctext('RED TAPE ' + c.code + '   FROM ' + id.toUpperCase(), Y + 16, '#ff8a80', 1, null);
      ctext('GREGG: ' + c.line, Y + 25, '#cfd8ff', 1, null);
    } else {
      ctext('STILL OUT THERE', Y, '#9a8a90', 1);
      ctext(boss ? 'BEAT THE BOSS OF WORLD ' + parseInt(id, 10) + ' FOR THIS ONE' : 'HIDDEN SOMEWHERE IN LEVEL ' + id.toUpperCase(), Y + 8, '#cfc6bc', 1, null);
    }
    { const w = WORLDS[parseInt(id, 10) - 1], k = worldTapes(w), n = w.levels.length; if (k === n && Math.floor(tt / 20) % 2) text('W' + w.n + ' 4/4 JUMP: SCREENING', 4, 5, '#ffe680', 1, null); else if (k !== n) text('W' + w.n + ' TAPES ' + k + '/' + n, 4, 5, '#9a8a90', 1, null); }
    if (p.fact) ctext('BLUE CARD: ' + c.fact + (c.wrong ? ' (WRONG)' : ''), Y + 33, '#7ab0ff', 1, null);
    else ctext('BLUE CARD: NOT FOUND YET', Y + 33, '#4a5a8a', 1, null);
  }

  // ---------------------------------------------------------------- era card
  function backdrop(w, tt, y0, y1) {
    clipRect(0, y0, VW, y1 - y0);
    const L = B[w.n] || [];
    for (const l of L) drawLayer(l, 0, 0, tt, VW);
    ctx.restore();
  }
  function leader(tt) {   // film-leader countdown: grey leader, cross hairs, rings, a clock sweep, the number
    const n = 3 - Math.floor(tt / 8), f = tt % 8, cx = VW / 2, cy = VH / 2;
    rect('#b8b4a4', 0, 0, VW, VH);
    for (let y = 0; y < VH; y += 3) rect('rgba(0,0,0,0.045)', 0, y, VW, 1);
    rect('#2a2824', 0, cy - 1, VW, 2); rect('#2a2824', cx - 1, 0, 2, VH);
    ctx.lineWidth = 2; ctx.strokeStyle = '#2a2824';
    ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 46, 0, Math.PI * 2); ctx.stroke();
    const a0 = -Math.PI / 2, a1 = a0 + f / 8 * Math.PI * 2;
    ctx.fillStyle = 'rgba(40,36,30,0.28)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 60, a0, a1); ctx.closePath(); ctx.fill();
    const ink = f < 2 ? '#fff' : '#1a1814';
    text(String(Math.max(1, n)), cx - 12, cy - 20, ink, 8, null);
    rect('#2a2824', 2, 2, 8, 8); rect('#2a2824', VW - 10, VH - 10, 8, 8);
    for (let i = 0; i < 6; i++) { const x = Math.floor(hash(tt * 7 + i) * VW); rect('rgba(30,26,20,0.5)', x, 0, 1, VH); }   // scratches
    for (let y = 8; y < VH; y += 24) { rect('#2a2824', 4, y, 6, 4); rect('#2a2824', VW - 10, y, 6, 4); }
    if (tt < 2) rect('rgba(255,255,255,0.7)', 0, 0, VW, VH);
  }
  function bubble(x, y, wd, str, tt, t0, w, right) {   // a speech bubble with a typed-out line
    rect('#000', x - 1, y - 1, wd + 2, 21); rect('rgba(14,6,10,0.88)', x, y, wd, 19); rect(shade(w.accent, 0.9), x, y, wd, 1);
    const rows = str.split('|'), n = Math.max(0, Math.floor((tt - t0) / 1.5)); let used = 0;
    rows.forEach((r, i) => { const part = r.slice(0, Math.max(0, n - used)); used += r.length; if (part) text(part, x + 4, y + 3 + i * 8, '#fff6d4', 1, null); });
    rect('#000', right ? x + wd : x - 4, y + 7, 3, 5);   // tail toward the portrait
  }
  function portraitSpr(id, w) {
    const L = LEVELS[w.n + '-1'], P = (L && L.portraits) || {};
    return id === 'tim' ? (P.tim || 'portrait_tim') : (P.gregg || P.gm || 'portrait_gregg');
  }
  function drawEra() {
    const w = world, tt = t, lightType = lumOf(w.fg) > 130, sh = lightType ? shade(w.bg, 0.4) : null;
    if (tt < 24) return leader(tt);
    const u = tt - 24, fl = u < 6 ? (6 - u) / 6 : 0;
    rect(w.bg, 0, 0, VW, VH);
    backdrop(w, tt, 18, 162);
    rect(shade(w.bg, 0.5).replace('rgb', 'rgba').replace(')', ',0.5)'), 0, 18, VW, 144);   // dim the picture so the type reads
    for (let i = 0; i < 6; i++) rect(shade(w.bg, 0.4).replace('rgb', 'rgba').replace(')', ',' + (0.07 * (6 - i)).toFixed(2) + ')'), 0, 18, VW, 4 + i * 3), rect(shade(w.bg, 0.4).replace('rgb', 'rgba').replace(')', ',' + (0.05 * (6 - i)).toFixed(2) + ')'), 0, 162 - 4 - i * 3, VW, 4 + i * 3);
    for (let i = 0; i < 4; i++) rect(lightType ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)', 14 + i * 10, 20 + i * 2, VW - 28 - i * 20, 78 - i * 4);   // a soft plate so the type reads over the backdrop
    ctx.fillStyle = w.band; ctx.fillRect(0, 0, VW, 16); ctx.fillRect(0, VH - 16, VW, 16);
    sprockets(6, shade(w.bg, 0.6), -1, -1); sprockets(VH - 10, shade(w.bg, 0.6), 108, 212);
    rect(w.accent, 0, 16, VW, 2); rect(w.accent, 0, VH - 18, VW, 2);
    const s1 = fitScale(w.title, 296, 3);
    ctext('WORLD ' + w.n, 21, w.accent, 2, sh);
    typed(w.title, 34, u, 4, w.fg, s1, sh);
    typed(w.seasons, 34 + s1 * 5 + 5, u, 4 + w.title.length * 2 + 4, w.accent, fitScale(w.seasons, 296, 2), sh);
    typed(w.tag, 73, u, 36, w.fg, 1, sh);
    typed('BOSS: ' + w.boss, 82, u, 66, w.accent, 1, sh);
    // Tim and Gregg
    const pt = portraitSpr('tim', w), pg = portraitSpr('gregg', w), py = 91, ps = (id, x) => { rect('#000', x - 1, py - 1, 26, 26); rect(w.accent, x, py, 24, 24); rect(shade(w.bg, 0.5), x + 1, py + 1, 22, 22); spr(id, x + 12, py + 24); };
    ps(pt, 8); bubble(38, py + 2, 112, w.tim, u, 90, w, false);
    ps(pg, VW - 32); bubble(VW - 38 - 112, py + 2, 112, w.gregg, u, 130, w, true);
    text('TIM', 20, py + 26, w.fg, 1, sh, 'center'); text('GREGG', VW - 20, py + 26, w.fg, 1, sh, 'center');
    // the Dots, hopping on the line
    const dk = n => Math.max(1, Math.min(w.dots.length > 2 ? 2 : 3, Math.floor(52 / ((DD.IMG[n] && DD.IMG[n].height) || 20))));
    const sp = w.dots.length > 2 ? [112, 144, 176, 208] : [136, 184];
    w.dots.forEach((n, i) => { const k = Math.min(dk(n), 2); spr(n, sp[i], VH - 18 + Math.round(Math.abs(Math.sin(tt / 12 + i * 1.7)) * -5), i % 2 === 1, k, k); });
    if (u > 20 && blink(u, 28)) text('PRESS JUMP', VW / 2, VH - 11, w.fg, 1, sh, 'center');
    // projector flicker, grain, a scratch, and the cut from the leader
    if (u < 30 && hash(tt) > 0.7) rect('rgba(255,255,255,0.08)', 0, 18, VW, 144);
    for (let i = 0; i < 5; i++) rect('rgba(255,255,255,0.18)', Math.floor(hash(tt * 3 + i) * VW), 18 + Math.floor(hash(tt + i * 9) * 140), 1, 1);
    if (hash(Math.floor(tt / 5)) > 0.8) rect('rgba(255,255,255,0.12)', Math.floor(hash(Math.floor(tt / 5) + 3) * VW), 18, 1, 144);
    if (fl > 0) rect('rgba(255,255,255,' + fl.toFixed(2) + ')', 0, 0, VW, VH);
  }

  // ---------------------------------------------------------------- level list
  // the stage list: rows on the left, and on the right a marquee poster playing the highlighted stage live (DD.trailer): the demo bot
  // runs one clip of the stage, then the film cuts to the next; a boss stage plays the fight. The clips are the ones design/poster_shots.js
  // found where the bot runs cleanly (game/posters.js), and if the bot ever stalls anyway the film cuts on early. The whole frame is shown at half size.
  const ROW = { x: 6, w: 138 }, PV = { x: 157, y: 36, w: 160, h: 90 }, PV_CUT = 270, PV_PARTS = [0.06, 0.3, 0.54, 0.78], PV_STALL = 45;
  let pvTr = null, pvTrId = null, pvPart = 0, pvAge = 0, pvFlash = 0, pvHist = [];
  function pvStop() { if (pvTr) pvTr.end(); pvTr = null; pvTrId = null; }
  function pvStart(id, part) {
    pvStop();
    const L0 = LEVELS[id], boss = /boss$/.test(id), shots = (window.POSTER_SHOTS || {})[id];
    const pick = shots && shots.length ? shots[part % shots.length] : [Math.max(2, Math.floor(L0.W * PV_PARTS[part % PV_PARTS.length])), 80];
    const shot = boss ? { boss: true, pre: 95, speed: 1, swap: 60 } : { x: pick[0], swap: pick[1], speed: 1.25, dot: 'sam' };
    pvTr = DD.trailer(L0, shot); pvTrId = id; pvPart = part; pvAge = 0; pvFlash = 8; pvHist = [];
    if (pvTr) DD.loadSprites(L0.sprites || []);
  }
  function pvStalled() {   // the Dot has sat in one 1.5-tile box for the last PV_STALL frames
    const p = DD.test.G.pl; pvHist.push(p.x, p.y); if (pvHist.length > PV_STALL * 2) pvHist.splice(0, 2);
    if (pvHist.length < PV_STALL * 2) return false;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < pvHist.length; i += 2) { x0 = Math.min(x0, pvHist[i]); x1 = Math.max(x1, pvHist[i]); y0 = Math.min(y0, pvHist[i + 1]); y1 = Math.max(y1, pvHist[i + 1]); }
    return x1 - x0 < 24 && y1 - y0 < 24;
  }
  function pvRoll() {   // keep the footage on the highlighted stage, cut to its next part now and then, and run it a frame
    const l = world.levels[lcur], ok = have(l.id) && stageUnlocked(world, lcur);
    if (!ok) { pvStop(); return; }
    if (pvTrId !== l.id) pvStart(l.id, 0);
    else if (!/boss$/.test(l.id) && (++pvAge >= PV_CUT || (pvTr && pvStalled()))) pvStart(l.id, pvPart + 1);   // the next clip, or early if the bot is stuck
    if (pvTr) pvTr.step();
    if (pvFlash > 0) pvFlash--;
  }
  let pvBuf = null;
  function pvFrame() {   // render the footage full-screen, keep it aside, then the menu paints over the screen as usual
    if (!pvTr || !pvTr.ok) return false;
    try {
      pvTr.draw();
      if (!pvBuf) { pvBuf = document.createElement('canvas'); pvBuf.width = VW; pvBuf.height = VH; }
      const b = pvBuf.getContext('2d'); b.clearRect(0, 0, VW, VH); b.drawImage(ctx.canvas, 0, 0);
      return true;
    } catch (e) { pvStop(); return false; }
  }
  function drawLevels() {
    const w = world, tt = t, lt = !SHD(w), dim = lt ? '#6a5a70' : '#9a8a90';
    const live = pvFrame();
    rect(w.bg, 0, 0, VW, VH);
    backdrop(w, tt, 30, VH);
    rect(lt ? 'rgba(240,235,245,0.55)' : 'rgba(6,2,8,0.62)', 0, 30, VW, VH - 30);
    rect(w.band, 0, 0, VW, 28); rect(w.accent, 0, 28, VW, 2);
    text('WORLD ' + w.n, 8, 4, w.accent, 2, '#000'); text(w.title, 8, 19, w.fg, 1, SHD(w)); text(w.seasons, VW - 8, 19, w.fg, 1, SHD(w), 'right');
    storeBtn(VW - 56, 3, 52, 'HEI STORE', tt);
    const cm = compact(), H = cm ? 26 : 32;
    w.levels.forEach((l, i) => {
      const sk = Math.min(1, Math.max(0, (tt - i * 4) / 16)), slide = Math.round((1 - (1 + 2.7 * (sk - 1) ** 3 + 1.7 * (sk - 1) ** 2)) * -VW) + Math.round(rowNudge[i] || 0);   // rows fly in from the left, one after another
      ctx.save(); ctx.translate(slide, 0); try { drawRow(l, i); } finally { ctx.restore(); }
    });
    { const k = Math.min(1, Math.max(0, (tt - 6) / 16)), slide = Math.round((1 - (1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2)) * VW);   // the poster swings in from the right
      ctx.save(); ctx.translate(slide, 0); try { drawPoster(tt); } finally { ctx.restore(); } }
    function drawRow(l, i) {
      const y = rowY(i), on = i === lcur, ok = have(l.id) && stageUnlocked(w, i), shut = have(l.id) && !ok, p = PROG[l.id], boss = !!l.boss, X = ROW.x, Wd = ROW.w;
      rect('rgba(0,0,0,0.4)', X + 4, y + 2, Wd, H);
      rect(on ? w.accent : '#000', X, y - 2, Wd, H + 4); rect(on ? '#fff' : '#000', X + 1, y - 1, Wd - 2, H + 2);
      rect(lt ? shade(w.bg, ok ? 0.92 : 0.8) : shade(w.bg, ok ? (on ? 0.72 : 0.6) : 0.35), X + 2, y, Wd - 4, H);
      for (let sy = y + 2; sy < y + H - 2; sy += 8) { rect('#000', X + 4, sy, 3, 4); rect('#000', X + Wd - 7, sy, 3, 4); }   // film-edge sprockets
      const name = clipW(have(l.id) ? (LEVELS[l.id].name || l.name) : l.name, ok ? 28 : 21);
      text(l.id.toUpperCase(), X + 13, y + 5, ok ? w.accent : dim, 2, '#000');
      text(name || (boss ? 'BOSS' : 'LEVEL'), X + 13, y + (cm ? 17 : 21), ok ? w.fg : dim, 1, SHD(w));
      if (boss) { const bx = X + 13 + l.id.length * 8 + 4; rect(ok ? '#c01820' : '#4a2428', bx, y + 5, 22, 9); text('BOSS', bx + 11, y + 7, '#fff', 1, null, 'center'); }
      if (on) { const ax = X + 4 + Math.round(Math.abs(Math.sin(tt / 8)) * 2); for (let k = 0; k < 4; k++) rect('#fff', ax + k, y + (cm ? 7 : 10) + k, 1, 8 - k * 2); }   // a little arrow
      if (!ok) { if (blink(tt, 40) || !on) text(shut ? 'LOCKED' : 'SOON', X + Wd - 10, y + (cm ? 17 : 21), dim, 1, SHD(w), 'right'); return; }
      const s6 = p && p.six ? 6 : 0;   // a six-bag win: the tubs shift left for a red sixth
      if (s6) { rect('#000', X + Wd - 17, y + 5, 5, 7); rect('#e8302a', X + Wd - 16, y + 6, 3, 5); rect('#fff6d4', X + Wd - 16, y + 9, 3, 1); }
      for (let b = 0; b < 5; b++) { const got = p && b < p.bags; rect(lt ? 'rgba(0,0,0,0.35)' : '#000', X + Wd - 41 - s6 + b * 6, y + 5, 5, 7); rect(got ? '#ffe680' : (lt ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'), X + Wd - 40 - s6 + b * 6, y + 6, 3, 5); if (got) rect('#d8202c', X + Wd - 40 - s6 + b * 6, y + 9, 3, 1); }   // best bags, as tiny tubs
      if (p && p.allPop) { const sx = X + Wd - 50 - s6, sy = y + 5; rect('#ffe680', sx + 2, sy, 1, 7); rect('#ffe680', sx, sy + 2, 5, 3); rect('#c98f22', sx + 1, sy + 5, 3, 1); }   // every kernel: a gold star
    }
    function drawPoster(tt) {
      const l = w.levels[lcur], id = l.id, ok = have(id) && stageUnlocked(w, lcur), shut = have(id) && !ok, p = PROG[id], P = PV;
      rect('rgba(0,0,0,0.45)', P.x, P.y + 3, P.w + 3, P.h + 3);
      rect('#000', P.x - 3, P.y - 3, P.w + 6, P.h + 6); rect(w.accent, P.x - 2, P.y - 2, P.w + 4, P.h + 4); rect('#000', P.x - 1, P.y - 1, P.w + 2, P.h + 2);
      for (let bx = P.x - 1, k = 0; bx < P.x + P.w; bx += 7, k++) { const lit = (k + Math.floor(tt / 5)) % 3 === 0; rect(lit ? '#fff6c0' : shade(w.accent, 0.55), bx, P.y - 3, 2, 2); rect(lit ? '#fff6c0' : shade(w.accent, 0.55), bx, P.y + P.h + 1, 2, 2); }   // marquee bulbs chase along the frame
      rect(lt ? shade(w.bg, 0.5) : shade(w.bg, 0.25), P.x, P.y, P.w, P.h);
      if (ok && live && pvTrId === id && pvBuf) { ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(pvBuf, 0, 0, VW, VH, P.x, P.y, P.w, P.h); ctx.restore(); }   // the whole frame at exactly half size
      else if (ok) { for (let k = 0; k < 40; k++) rect(Math.random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)', P.x + Math.floor(Math.random() * (P.w - 3)), P.y + Math.floor(Math.random() * P.h), 3, 1); }   // film snow while it loads
      if (pvFlash > 0) rect(`rgba(255,246,200,${(0.05 * pvFlash).toFixed(3)})`, P.x, P.y, P.w, P.h);   // a projector flash on each cut
      if (!ok) text(shut ? 'LOCKED' : 'COMING SOON', P.x + P.w / 2, P.y + P.h / 2 - 3, '#fff', 1, '#000', 'center');
      if (!ok) return;
      const sy = P.y + P.h + 6;   // the best run, under the poster: tubs, the blue card, the tape
      for (let b = 0; b < 5; b++) { const got = p && b < p.bags, hop = got ? Math.max(0, Math.sin((tt + b * 6) / 5)) * 2 : 0; spr('tub', P.x + 9 + b * 20, sy + 22 - Math.round(hop), false, 1, 1, 0, got ? 1 : 0.2); }
      { const cx = P.x + 102, cy = sy + 9, on2 = p && p.fact; rect(on2 ? '#0e2e7a' : 'rgba(14,46,122,0.3)', cx, cy, 14, 11); rect(on2 ? '#3a78e8' : 'rgba(58,120,232,0.3)', cx + 1, cy + 1, 12, 9); if (on2) { rect('#cfe0ff', cx + 3, cy + 3, 8, 1); rect('#cfe0ff', cx + 3, cy + 6, 6, 1); } }
      spr('vhs', P.x + 128, sy + 22, false, 1, 1, 0, p && p.vhs ? 1 : 0.2);
    }
    if (!cm) w.dots.forEach((n, i) => { const sp = w.dots.length > 2 ? [30, 60, 90, 120][i] : [50, 110][i], ph = Math.sin(tt / 11 + i * 1.9), hy = Math.abs(ph) * 6; drawDot(n, hy > 4.5 ? (Math.cos(tt / 11 + i * 1.9) * ph > 0 ? 'jump' : 'fall') : hy < 0.8 ? 'land' : 'apex', sp, 158 - Math.round(hy), i % 2 === 1, 1, 1); });
    if (noteT > 0) ctext(note, 142, '#ff8080', 1);
    rect('rgba(0,0,0,0.55)', 0, 160, VW, 20);
    ctext(DD.padUsed ? 'CROSS: PLAY    SQUARE: HEI STORE    CIRCLE: BACK' : 'JUMP: PLAY    H: HEI STORE    X: BACK', 168, w.fg, 1, '#000');
  }

  // screen changes: the last frame of the old screen is pulled up out of the gate like film, the new one comes in under it
  const WIPE = 18, rowNudge = [], rowVel = [];
  let wipe = null, wipeT = WIPE, lastSt = null;
  function draw() {
    ctx.imageSmoothingEnabled = false;
    if (st !== lastSt && lastSt && lastSt !== 'load' && ctx.canvas && typeof document !== 'undefined' && document.createElement) {
      try { wipe = wipe || document.createElement('canvas'); wipe.width = VW; wipe.height = VH; wipe.getContext('2d').drawImage(ctx.canvas, 0, 0); wipeT = 0; } catch (e) { wipe = null; }
    }
    lastSt = st;
    if (tr && st !== 'rewind') rwStop();
    if (pvTr && st !== 'levels') pvStop();   // the poster's footage only runs on the stage list   // never leave a trailer running under another screen
    if (st === 'load') { bg('#2a0e1a', '#0e070c'); ctext('LOADING', VH / 2 - 3, '#fff', 1); return; }
    if (st === 'rewind') drawRewind(); else if (st === 'fork') drawFork(); else if (st === 'title') drawTitle(); else if (st === 'select') drawSelect(); else if (st === 'era') drawEra(); else if (st === 'shelf') drawShelf(); else if (st === 'options') drawOptions(); else if (st === 'jukebox') drawJukebox(); else if (st === 'store') { if (window.DDStore) window.DDStore.draw(); } else drawLevels();
    if (wipe && wipeT < WIPE) {
      const k = wipeT / WIPE, e = k * k * (3 - 2 * k), y = -Math.round(e * (VH + 8));
      ctx.drawImage(wipe, 0, y);
      rect('#000', 0, y + VH, VW, 8); for (let x = 4; x < VW; x += 12) rect('#3a3038', x, y + VH + 2, 6, 4);   // the frame line, with sprocket holes
    }
  }
  const scene = { step, draw };

  // ---- boot: probe every level id in the manifest (plus a deep-linked one), then show the title or jump straight in
  const want = [].concat(...WORLDS.map(idsOf));
  const link = Q.get('level');
  if (link && want.indexOf(link) < 0) want.push(link);
  DD.setScene(scene);
  probe(want, () => {
    const pl = []; WORLDS.forEach(w => ['tim', 'gregg'].forEach(who => pl.push(portraitSpr(who, w)))); DD.loadSprites(pl); DD.loadSprites(Object.values(BOSS_ART).map(a => a[0]));   // each world's own host portraits, if its level lists them
    setTimeout(() => { for (let i = +Q.get('ff') || 0; i > 0; i--) step({ nx: 0, ny: 0 }); }, 0);   // ?ff=N fast-forwards the menu N frames (for screenshots)
    const era = +Q.get('era'), wd = +Q.get('world');
    const bn = +Q.get('bonus'); if (bn && window.makeBonus) { const B = window.makeBonus(bn, LEVELS); if (B) return DD.start(B, { perks: perks(), onSave: record, onExit: r => { record(r); st = 'shelf'; t = 0; DD.setScene(scene); } }); }   // ?bonus=N: straight into world N's screening (testing)
    if (link && have(link)) return playLevel(link, true);   // a direct link plays with the whole cast
    if (link) msg = 'NO SUCH LEVEL: ' + link.toUpperCase();
    if (era >= 1 && era <= WORLDS.length) { cur = era - 1; return enterWorld(cur); }
    if (wd >= 1 && wd <= WORLDS.length) { cur = wd - 1; world = WORLDS[cur]; st = 'levels'; lcur = 0; t = 0; prepSongs(world); return; }
    if (Q.has('select')) { st = 'select'; t = 0; return; }
    if (Q.has('shelf')) { st = 'shelf'; t = 0; return; }
    if (Q.has('options')) { st = Q.get('options') === 'jukebox' ? 'jukebox' : 'options'; t = 0; return; }
    st = 'title'; t = 0;
  });
  window.__menu = { have, LEVELS, MISSING, get PROG() { return PROG; }, get st() { return st; }, get t() { return t; }, rewind: () => { cur = 1; world = WORLDS[1]; eraPlay = !!have(idsOf(world)[0]); eraAll = false; startRewind(); },   // debug and tests: play the rewind into World 2
     get reel() { return reel; }, ff: n => { for (let i = 0; i < n; i++) step({ nx: 0, ny: 0 }); draw(); },   // ff: run the menu n frames and draw (screenshots)
     get shot() { return shot; }, get lcur() { return lcur; }, cast, worldUnlocked, stageUnlocked,
     pauseOptions: { open(done) { inGame = { st, t, done }; click = null; openOptions(); }, step, draw } };   // the engine's pause menu runs the options and jukebox screens over a paused level
})();
