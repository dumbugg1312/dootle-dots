// The casino's PRIZE COUNTER wardrobe: outfits, textures and running trails, bought once with HEI Points and worn by the whole team
// (every Dot wears the same look, and it stays on through Dot switches). All visual: nothing here changes how a Dot plays.
// Outfits are drawn per Dot (design/sprites/dotwear.py -> <dot>_wear.png: row 0 the body's fill mask, rows 1-9 the outfits, every
// cell (frame w + 8) x (frame h + 10) with the anim frame at (4, 10)). Textures paint into that fill mask each frame, in the
// spirit of cheap public-access video. Trails are particles in world coordinates, drawn behind the Dot.
// engine.js drawDot asks DDWear.frame() for the dressed frame; drawPlayer runs DDWear.trail. Saved under dootledots.wear.v1.
// Names and sources: design/lines/prizes.md.
(function () {
  const ctx = DD.ctx, KEY = 'dootledots.wear.v1';
  const OUTFITS = ['uniform', 'vfacap', 'decker', 'wonka', 'bondtux', 'zerohour', 'jaws2', 'boots', 'newhat', 'bucket', 'brace', 'mask', 'spacewall'];   // the wear sheet's rows 1-13
  const ITEMS = [
    { id: 'uniform', cat: 'outfit', name: 'POPCORN BUTTER', cost: 60 },
    { id: 'vfacap', cat: 'outfit', name: 'VFA CAP', cost: 60 },
    { id: 'boots', cat: 'outfit', name: 'OSTRICH BOOTS', cost: 120 },
    { id: 'decker', cat: 'outfit', name: 'DECKER SHADES', cost: 120 },
    { id: 'bondtux', cat: 'outfit', name: 'BOND PROTEST', cost: 120 },
    { id: 'zerohour', cat: 'outfit', name: 'ZERO HOUR VEST', cost: 200 },
    { id: 'wonka', cat: 'outfit', name: 'WONKALAND', cost: 200 },
    { id: 'newhat', cat: 'outfit', name: 'GIANT HAT', cost: 200 },
    { id: 'jaws2', cat: 'outfit', name: 'JAWS 2 HELMET', cost: 350 },
    { id: 'wood', cat: 'tex', name: 'WOODGRAIN', cost: 60 },
    { id: 'jpeg', cat: 'tex', name: 'JPEG', cost: 60 },
    { id: 'marble', cat: 'tex', name: 'SCREEN SAVER', cost: 120 },
    { id: 'vhs', cat: 'tex', name: 'VHS TRACKING', cost: 120 },
    { id: 'flames', cat: 'tex', name: 'CLIP ART FIRE', cost: 200 },
    { id: 'chroma', cat: 'tex', name: 'CHROMA KEY', cost: 350 },
    { id: 'popcorn', cat: 'trail', name: 'POPCORN', cost: 60 },
    { id: 'vape', cat: 'trail', name: 'VAPE CLOUD', cost: 60 },
    { id: 'carpet', cat: 'trail', name: 'RED CARPET', cost: 120 },
    { id: 'tape', cat: 'trail', name: 'TAPE SPOOL', cost: 120 },
    { id: 'bags', cat: 'trail', name: 'FIVE BAGS', cost: 200 },
    { id: 'echo', cat: 'trail', name: 'VIDEO ECHO', cost: 350 },
    // the SECRET STASH: never for HEI Points. Each is claimed once the Dot secrets found (all stages) reach sec; claiming spends none
    { id: 'bucket', cat: 'outfit', name: 'BUCKET LIST HAT', sec: 4 },
    { id: 'stewdog', cat: 'trail', name: 'STEW DOGS', sec: 8 },
    { id: 'grain', cat: 'tex', name: 'GRAIN WATER', sec: 16 },
    { id: 'rats', cat: 'trail', name: 'MOVIE HOUSE RATS', sec: 24 },
    { id: 'brace', cat: 'outfit', name: 'NECK BRACE', sec: 36 },
    { id: 'stickers', cat: 'trail', name: ': THE MOVIE', sec: 48 },
    { id: 'plasma', cat: 'tex', name: 'PLASMA GLOBE', sec: 64 },
    { id: 'moneyzap', cat: 'trail', name: 'MONEYZAP', sec: 80 },
    { id: 'mask', cat: 'outfit', name: 'WHITE MASK', sec: 100 },
    { id: 'spacewall', cat: 'outfit', name: 'SPACE WALL', sec: 144 },
  ];
  const byId = id => ITEMS.find(i => i.id === id);

  // ---------------------------------------------------------------- the save: what's owned, what the team wears
  let W;
  function load() { try { W = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { W = {}; } W = { own: W.own || {}, on: Object.assign({ outfit: null, tex: null, trail: null }, W.on) }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} };
  load();
  const ST = () => window.DDStore, unl = () => !!(ST() && ST().unlimited);
  const owns = id => { const it = byId(id); return !!W.own[id] || (unl() && !!it && !it.sec); };   // UNLIMITED never hands out the secret stash
  function secFound() {   // Dot secrets found across every stage (menu.js keeps them per stage in its progress save)
    let P = window.__menu && window.__menu.PROG;
    if (!P) { try { P = JSON.parse(localStorage.getItem('dootledots.progress.v1')) || {}; } catch (e) { P = {}; } }
    let n = 0; for (const id in P) n += (P[id] && P[id].sec && P[id].sec.length) || 0; return n;
  }
  function claim(id) {   // -> 'ok' | 'owned' | 'locked': a secret-stash item, free once enough Dot secrets are found
    const it = byId(id); if (!it || !it.sec) return 'locked';
    if (W.own[id]) return 'owned';
    if (secFound() < it.sec) return 'locked';
    W.own[id] = 1; save(); return 'ok';
  }
  function buy(id) {   // -> 'ok' | 'owned' | 'poor' | 'locked' (a secret-stash item: claim it instead)
    const it = byId(id); if (!it) return 'poor';
    if (it.sec) return claim(id) === 'ok' ? 'ok' : W.own[id] ? 'owned' : 'locked';
    if (owns(id)) return 'owned';
    if (!ST() || ST().pts < it.cost) return 'poor';
    ST().bank(-it.cost); W.own[id] = 1; save(); return 'ok';
  }
  function wear(id) { const it = byId(id); if (!it || !owns(id)) return false; W.on[it.cat] = W.on[it.cat] === id ? null : id; save(); return true; }   // again takes it off
  const on = cat => { const id = W.on[cat]; return id && owns(id) ? id : null; };
  let preview = null;   // the shop tries a look on without buying: { outfit, tex, trail } overrides
  const look = cat => preview && cat in preview ? preview[cat] : on(cat);

  // ---------------------------------------------------------------- the dressed frame
  const sheets = {}, masks = {};
  function sheet(dot) {
    let s = sheets[dot];
    if (!s) { s = sheets[dot] = new Image(); s.src = DD.spriteDir + dot + '_wear.png'; }
    return s.complete && s.naturalWidth ? s : null;
  }
  function maskOf(dot, sh, fi, cw, ch) {   // the fill mask's alpha, shade and edge per pixel for one frame, read once
    const k = dot + fi; if (masks[k]) return masks[k];
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
    g.drawImage(sh, fi * cw, 0, cw, ch, 0, 0, cw, ch);
    let d; try { d = g.getImageData(0, 0, cw, ch).data; } catch (e) { return null; }
    const n = cw * ch, a = new Uint8Array(n), sh8 = new Uint8Array(n), edge = new Uint8Array(n);
    let y0 = ch, y1 = 0, x0 = cw, x1 = 0;
    for (let i = 0; i < n; i++) if (d[i * 4 + 3] > 128) { a[i] = 1; sh8[i] = d[i * 4]; const x = i % cw, y = (i / cw) | 0; y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = 0; y < ch; y++) { let l = -1, r = -1; for (let x = 0; x < cw; x++) if (a[y * cw + x]) { if (l < 0) l = x; r = x; } if (l >= 0) { edge[y * cw + l] = edge[y * cw + r] = 1; } }   // the outer rim only, never the holes round the face
    for (let x = 0; x < cw; x++) { let t = -1, b = -1; for (let y = 0; y < ch; y++) if (a[y * cw + x]) { if (t < 0) t = y; b = y; } if (t >= 0) { edge[t * cw + x] = edge[b * cw + x] = 1; } }
    return masks[k] = { a, sh: sh8, edge, box: [x0, y0, x1, y1] };
  }
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const hsl = (h, s, l) => { const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
  // a texture: (x, y inside the body box, w, h, t, the base pixel [r, g, b], edge) -> [r, g, b], or null to keep the base pixel
  const TEX = {
    chroma: (x, y, w, h, t, b, e, ax, ay) => {   // a green-screen hole: stock starfield footage keyed into the body, a green fringe left at the edge
      if (e) return hash(x, y, t >> 3) < 0.35 ? [150, 255, 130] : [50, 220, 70];
      const sx = x + (t >> 2), st = hash(sx, y, 7);
      if (st < 0.08) return [255, 255, 240]; if (st < 0.13) return [170, 190, 255];
      return [30 + y * 3, 40 + y * 3, 130 + y * 4];
    },
    vhs: (x, y, w, h, t, b) => {   // tracking: a band of static rolls down, scanlines, colour bleeding one way
      const band = (((y - t * 0.4) % 18) + 18) % 18;
      if (band < 2.5) { const v = 120 + hash(x, y, t) * 135; return [v, v, v]; }
      const m = y % 2 ? 0.78 : 1; return [Math.min(255, b[0] * m + 30), b[1] * m, Math.min(255, b[2] * m + 24)];
    },
    flames: (x, y, w, h, t) => {   // clip-art fire: tongues licking up from the feet, three flat colours and a white core
      const k = (h - y) / h + Math.sin(x * 1.3 + t * 0.21) * 0.12 + Math.sin(x * 0.7 - t * 0.13) * 0.1 + (hash(x, y >> 1, t >> 2) - 0.5) * 0.12;
      return k > 0.78 ? [255, 250, 200] : k > 0.55 ? [255, 214, 40] : k > 0.3 ? [255, 120, 20] : [210, 30, 20];
    },
    marble: (x, y, w, h, t) => {   // a screensaver: pastel bands swirling past
      const v = x * 0.35 + y * 0.22 + Math.sin(y * 0.3 + t * 0.05) * 1.6 + t * 0.03;
      return hsl(((v * 40) % 360 + 360) % 360, 0.75, 0.68);
    },
    jpeg: (x, y, w, h, t, b) => {   // over-compressed: 4 px blocks of crushed colour, each block's tint off by a different amount, ringing at the seams
      const bx = x >> 2, by = y >> 2, s = t / 10 | 0, k = (hash(bx, by, s) - 0.5) * 150, q = (v, j) => Math.min(255, Math.max(0, Math.round((v + k * j) / 85) * 85));
      if ((x & 3) === 3 && hash(bx, by, s + 1) < 0.4) return [255, 255, 255];
      return [q(b[0], 1), q(b[1], -0.6), q(b[2], 0.8)];
    },
    grain: (x, y, w, h, t) => {   // Grain Water: murky brown well water sloshing, sediment drifting through it
      const sl = Math.sin(x * 0.5 + t * 0.08) * 1.2, top = 2 + sl;
      if (y < top) return [120, 98, 60];
      const sed = hash(x, (y + (t >> 3)) | 0, 5) < 0.07;
      const d = Math.min(1, (y - top) / h), v = 1 - d * 0.45;
      return sed ? [58, 40, 18] : y < top + 1.2 ? [196, 168, 108] : [150 * v, 110 * v, 52 * v];
    },
    plasma: (x, y, w, h, t, b, e) => {   // the plasma globe from Decker's "Sonrise": dark glass, violet tendrils from the core to the rim
      if (e) return [210, 170, 255];
      const cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (r < 1.6) return [255, 240, 255];
      for (let k = 0; k < 5; k++) {
        const ak = k * 1.2566 + Math.sin(t * 0.05 + k * 1.7) * 0.9 + Math.sin(r * 0.6 + t * 0.2 + k) * 0.25;
        const da = Math.abs(((a - ak + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (da * r < 0.8) return hash(x, y, t >> 1) < 0.5 ? [240, 190, 255] : [190, 110, 255];
      }
      return [24 + r * 2, 10, 40 + r * 3];
    },
    wood: (x, y) => {   // a VHS cabinet's woodgrain
      const v = Math.sin((x + Math.sin(y * 0.45) * 2.2 + Math.sin(y * 0.11) * 3) * 1.25), knot = hash(x >> 2, y >> 2, 3) < 0.03;
      return knot ? [70, 36, 16] : v > 0.55 ? [92, 50, 22] : v > -0.2 ? [150, 88, 42] : [182, 116, 60];
    },
  };
  const ANIM = { chroma: 1, vhs: 1, flames: 1, marble: 1, jpeg: 1, grain: 1, plasma: 1 };
  let cv = null, cg = null;
  function frame(dot, im, fi, fw) {   // -> { c, ox, oy, w, h } the dressed frame (its anim frame sits at ox, oy), or null when there's nothing to wear
    const tex = look('tex'), out = look('outfit');
    if (!tex && !out) return null;
    const sh = sheet(dot); if (!sh) return null;
    const fh = im.height, cw = fw + 8, ch = fh + 10;
    if (!cv) { cv = document.createElement('canvas'); cg = cv.getContext('2d', { willReadFrequently: true }); }
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; } else cg.clearRect(0, 0, cw, ch);
    cg.drawImage(im, fi * fw, 0, fw, fh, 4, 10, fw, fh);
    if (tex && TEX[tex]) {
      const m = maskOf(dot, sh, fi, cw, ch);
      if (m) {
        const id = cg.getImageData(0, 0, cw, ch), d = id.data, [bx0, by0, bx1, by1] = m.box, w = bx1 - bx0 + 1, h = by1 - by0 + 1, t = ANIM[tex] ? (performance.now() / 16.7) | 0 : 0, f = TEX[tex];
        for (let i = 0; i < m.a.length; i++) {
          if (!m.a[i]) continue;
          const x = i % cw, y = (i / cw) | 0, b = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], c = f(x - bx0, y - by0, w, h, t, b, m.edge[i]);
          if (!c) continue;
          const s = tex === 'vhs' || tex === 'jpeg' || tex === 'chroma' || tex === 'plasma' ? 1 : m.sh[i] / 255;
          d[i * 4] = c[0] * s; d[i * 4 + 1] = c[1] * s; d[i * 4 + 2] = c[2] * s;
        }
        cg.putImageData(id, 0, 0);
      }
    }
    if (out) { const r = OUTFITS.indexOf(out) + 1; if (r > 0 && sh.height >= (r + 1) * ch) cg.drawImage(sh, fi * cw, r * ch, cw, ch, 0, 0, cw, ch); }
    return { c: cv, ox: 4, oy: 10, w: cw, h: ch };
  }

  // ---------------------------------------------------------------- trails (world coordinates; one per run, one for the shop's preview)
  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function blob(x, y, r, c) { ctx.fillStyle = c; for (let j = -r; j <= r; j++) { const hw = Math.round(Math.sqrt(r * r - j * j)); ctx.fillRect(Math.round(x - hw), Math.round(y + j), hw * 2 + 1, 1); } }
  function bag(x, y) {   // a little popcorn bag: red and white stripes, a crown of kernels
    px(x - 3, y - 6, 7, 7, '#2a0e1a'); px(x - 2, y - 5, 5, 6, '#fff6e8'); px(x - 1, y - 5, 1, 6, '#d8202c'); px(x + 1, y - 5, 1, 6, '#d8202c');
    px(x - 2, y - 8, 2, 2, '#fff6d4'); px(x, y - 9, 2, 2, '#ffe680'); px(x + 1, y - 7, 2, 2, '#fff6d4');
  }
  // the secret stash's trail sprites: pixel maps (one letter a colour, '.' clear), drawn bottom-centre at (x, y)
  function pmap(rows, pal, x, y, flip) {
    const h = rows.length, w = rows[0].length, x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][flip ? w - 1 - i : i]; if (ch !== '.') px(x0 + i, y0 + j, 1, 1, pal[ch]); }
  }
  const STEW = { k: '#2a1006', c: '#b03c1c', b: '#5a2010', B: '#8a3a18', r: '#f4ecd0', S: '#8a2c18', s: '#d4643c', Y: '#f4c87e', y: '#d89848', z: '#a86a2c' };
  const STEWDOG = [   // Chaplin's X-Press: Five-Bean Stew right on the dog, in a bun
    '......kkkk......',
    '...kkkcbBckkk...',
    '..kcBcbrBcbBck..',
    '.kcbBcrcbBcrcbk.',
    'kSsssssssssssSSk',
    'kYYYYYYYYYYYYYYk',
    'kyYYYYYYYYYYYYyk',
    '.kzyyyyyyyyyyzk.',
    '..kkkkkkkkkkkk..',
  ];
  const RATP = { k: '#1a1418', G: '#c4bcc2', g: '#958c93', d: '#6a6168', p: '#f4a6b8', e: '#000000' };
  const RAT = [[   // a Movie House rat, facing right; two leg frames, the tail flicking
    '...........kk...',
    '..........kpGk..',
    '......kkkkkGGGk.',
    '....kkGGGGGGGeGk',
    '.k.kGGgggggggGGp',
    'k.kgggggggggggk.',
    '.kkddddddddddk..',
    '....k.k....k.k..',
  ], [
    '...........kk...',
    '..........kpGk..',
    '......kkkkkGGGk.',
    '....kkGGGGGGGeGk',
    'k..kGGgggggggGGp',
    '.kkgggggggggggk.',
    '..kddddddddddk..',
    '.....k.k..k.k...',
  ]];
  const BILLP = { k: '#0e3a1a', g: '#8ad49a', L: '#2e7a44', O: '#e8f4d8', o: '#3a6a44' };
  const BILL = [   // MoneyZap cash
    'kkkkkkkkkkkkk',
    'kgggggggggggk',
    'kgLggOOOggLgk',
    'kLgggOoOgggLk',
    'kgLggOOOggLgk',
    'kgggggggggggk',
    'kkkkkkkkkkkkk',
  ];
  const GLYPH = { ':': ['w', '.', 'w'], ' ': ['.', '.', '.'], T: ['www', '.w.', '.w.'], H: ['w.w', 'www', 'w.w'], E: ['www', 'ww.', 'www'],
    M: ['w...w', 'ww.ww', 'w.w.w'], O: ['www', 'w.w', 'www'], V: ['w.w', 'w.w', '.w.'], I: ['w', 'w', 'w'] };
  function stickerRows(word) {   // a die-cut VFA sticker: white edge, black face, the word in 3 px white type, a peeled corner
    const t = [[], [], []];
    [...word].forEach((c, i) => { const g = GLYPH[c]; for (let r = 0; r < 3; r++) t[r].push((i ? '.' : '') + g[r]); });
    const tw = t[0].join('').length, w = tw + 4, body = r => 'wk' + t[r].join('').replace(/\./g, 'k') + 'kw';
    const edge = '.' + 'w'.repeat(w - 2) + '.', blank = 'w' + 'k'.repeat(w - 2) + 'w';
    return [edge, blank, body(0), body(1), body(2), blank.slice(0, -2) + 'pw', edge.slice(0, -2) + 'p.'];
  }
  const STICKERS = [stickerRows(': THE'), stickerRows('MOVIE')], STKP = { w: '#f4f0e8', k: '#0a0a0e', p: '#b8b4c0' };
  const stewDog = (x, y) => pmap(STEWDOG, STEW, x, y);
  const rat = (x, y, face, f) => pmap(RAT[(f >> 2) & 1], RATP, x, y, face < 0);
  const sticker = (x, y, k) => pmap(STICKERS[k & 1], STKP, x, y);
  function bill(x, y, a) {   // fluttering: the bill turns edge-on and back
    const w = Math.max(1, Math.round(Math.abs(Math.cos(a)) * BILL[0].length));
    if (w > 4) { const rows = BILL.map(r => { let o = ''; for (let i = 0; i < w; i++) o += r[Math.floor(i * r.length / w)]; return o; }); pmap(rows, BILLP, x, y + 3); }
    else px(x - w / 2, y - 3, w, 7, Math.cos(a) > 0 ? '#2e7a44' : '#0e3a1a');
  }
  function makeTrail() {
    const T = { kind: null, key: null, ps: [], hist: [], carpet: [], f: 0 };
    T.step = function (kind, key, x, y, h, ground, vx, face, dot, pose) {   // x, y: the Dot's bottom centre; h: its height
      if (kind !== T.kind || key !== T.key) { T.kind = kind; T.key = key; T.ps = []; T.hist = []; T.carpet = []; }
      if (!kind) return;
      const f = ++T.f, moving = Math.abs(vx) > 0.4;
      const last = T.hist[T.hist.length - 1];
      if (last && Math.hypot(last.x - x, last.y - y) > 120) { T.ps = []; T.hist = []; T.carpet = []; }   // a respawn or a door: start over
      T.hist.push({ x, y, h, face, dot, pose, ground }); if (T.hist.length > 60) T.hist.shift();
      if (kind === 'popcorn' && ground && moving && f % 5 === 0) T.ps.push({ x: x - face * 4, y: y - 2, vx: -face * (0.3 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.6, vy: -2 - Math.random() * 1.4, t: 0, life: 44 });
      if (kind === 'stewdog' && ground && moving && f % 14 === 0) T.ps.push({ x: x - face * 6, y, vx: -face * 0.15, vy: -1.6, t: 0, life: 70, g: 0.15, floor: y });
      if (kind === 'rats' && ground && moving && f % 22 === 0 && T.ps.length < 4) T.ps.push({ x: x - face * 14, y, vx: 0, vy: 0, t: 0, life: 160, rat: 1, floor: y, face });
      if (kind === 'stickers' && ground && moving && f % 14 === 0) T.ps.push({ x: x - face * 3, y: y + 1, vx: 0, vy: 0, t: 0, life: 150, k: T.nk = (T.nk || 0) + 1 });   // ': THE', 'MOVIE', ': THE'...
      if (kind === 'moneyzap' && (moving || !ground) && f % 6 === 0) T.ps.push({ x: x - face * 5, y: y - h * 0.5, vx: -face * (0.4 + Math.random() * 0.4), vy: -0.6 - Math.random() * 0.5, t: 0, life: 80, a: Math.random() * 6 });
      if (kind === 'rats') for (const p of T.ps) { const tx = x - p.face * (12 + T.ps.indexOf(p) * 9); p.face = face; p.vx = Math.max(-2.6, Math.min(2.6, (tx - p.x) * 0.08)); if (Math.abs(p.floor - y) > 2 && ground) p.floor = y; p.y = p.floor; }   // they follow you along the ground
      if (kind === 'vape' && (moving || !ground) && f % 4 === 0) T.ps.push({ x: x - face * 6, y: y - h * 0.6, vx: -face * 0.25 + (Math.random() - 0.5) * 0.2, vy: -0.25 - Math.random() * 0.2, t: 0, life: 70 });
      if (kind === 'carpet' && ground) {
        const c = T.carpet[T.carpet.length - 1];
        if (c && c.y === y && x >= c.x0 - 3 && x <= c.x1 + 3) { c.x0 = Math.min(c.x0, x - 6); c.x1 = Math.max(c.x1, x + 6); c.t = f; }
        else T.carpet.push({ x0: x - 6, x1: x + 6, y, t: f });
        if (T.carpet.length > 12) T.carpet.shift();
      }
      T.ps = T.ps.filter(p => {
        p.t++; p.x += p.vx; p.y += p.vy;
        if (T.kind === 'popcorn') p.vy += 0.18;
        else if (p.g) { p.vy += p.g; if (p.y >= p.floor) { p.y = p.floor; p.vy = 0; p.vx = 0; } }   // a stew dog drops and lands
        else if (T.kind === 'moneyzap') { p.vy = Math.min(0.5, p.vy + 0.03); p.vx *= 0.98; p.x += Math.sin(p.t * 0.15 + p.a) * 0.3; p.a += 0.15; }
        else if (!p.rat) p.vx *= 0.97;
        if (p.rat && moving) p.t = Math.min(p.t, 20);   // rats stay while you run, wander off once you stop
        return p.t < p.life;
      });
    };
    T.draw = function (sx, sy) {   // sx, sy: world -> screen
      const k = T.kind; if (!k) return;
      if (k === 'popcorn') for (const p of T.ps) { const X = sx(p.x), Y = sy(p.y); if (p.t > p.life - 10 && p.t % 2) continue; px(X - 1, Y - 1, 3, 3, '#3a2010'); px(X - 1, Y - 1, 2, 2, '#fff6d4'); px(X, Y, 1, 1, '#ffd24a'); }
      if (k === 'vape') for (const p of T.ps) { const a = 1 - p.t / p.life, r = 1 + Math.round(p.t / 14); ctx.globalAlpha = 0.55 * a; blob(sx(p.x), sy(p.y), r, '#e8e4f0'); ctx.globalAlpha = 0.35 * a; blob(sx(p.x) - 1, sy(p.y) - 1, Math.max(0, r - 1), '#ffffff'); ctx.globalAlpha = 1; }
      if (k === 'stewdog') for (const p of T.ps) { if (p.t > p.life - 12 && p.t % 2) continue; stewDog(sx(p.x), sy(p.y), p.t >> 3); }
      if (k === 'rats') for (const p of T.ps) { if (p.t > p.life - 20 && p.t % 2) continue; rat(sx(p.x), sy(p.y), p.vx === 0 ? p.face : p.vx, T.f + p.x); }
      if (k === 'stickers') for (const p of T.ps) { if (p.t > p.life - 16 && p.t % 2) continue; sticker(sx(p.x), sy(p.y) + (p.t < 4 ? 4 - p.t : 0), p.k); }   // slapped down
      if (k === 'moneyzap') for (const p of T.ps) { if (p.t > p.life - 12 && p.t % 2) continue; bill(sx(p.x), sy(p.y), p.a); }
      if (k === 'carpet') for (const c of T.carpet) {   // rolls back up from the far end once you've left it
        const age = T.f - c.t, roll = Math.max(0, age - 90) * 0.6, x0 = c.x0 + roll; if (x0 >= c.x1) continue;
        const X0 = sx(x0), X1 = sx(c.x1), Y = sy(c.y);
        px(X0, Y - 2, X1 - X0, 2, '#c8202c'); px(X0, Y - 2, X1 - X0, 1, '#ff5a5a'); px(X0, Y - 3, X1 - X0, 1, '#e8b030');
        if (roll > 0) { blob(X0, Y - 3, 2, '#9a1418'); px(X0 - 1, Y - 4, 2, 1, '#e8b030'); }
      }
      if (k === 'tape') {   // a VHS reel on the Dot's back, glossy black ribbon paying out behind and sagging as it ages
        const H = T.hist, n = H.length; if (!n) return;
        const pt = i => { const q = H[i], age = n - 1 - i; return [Math.round(sx(q.x - q.face * 9)), Math.round(sy(q.y - q.h * 0.5 + Math.min(10, age * 0.25) + Math.sin(i * 0.6 + T.f * 0.1) * Math.min(1, age / 6)))]; };
        for (let i = Math.max(0, n - 50); i < n - 1; i++) {   // join each pair of points so the ribbon never breaks into crumbs
          const [x0, y0] = pt(i), [x1, y1] = pt(i + 1), m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
          for (let s = 0; s < m; s++) { const X = Math.round(x0 + (x1 - x0) * s / m), Y = Math.round(y0 + (y1 - y0) * s / m); px(X, Y, 1, 1, ((X + T.f) >> 1) % 7 ? '#5a5868' : '#d8d4e4'); px(X, Y + 1, 1, 1, '#0e0c12'); }   // a sheen row over black, a glint running along it
        }
        const [X, Y] = pt(n - 1); if (n > 1) T.spin = (T.spin || 0) + Math.abs(H[n - 1].x - H[n - 2].x) * 0.4;
        const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][Math.floor(T.spin || 0) & 3];
        blob(X, Y, 3, '#0e0c12'); px(X - 2, Y - 2, 1, 1, '#5a5868'); px(X - 1, Y - 1, 3, 3, '#f4f0e8'); px(X + dx, Y + dy, 1, 1, '#0e0c12');   // tape pack, white hub, a spoke turning as you run
      }
      if (k === 'bags') for (let i = 4; i >= 0; i--) {   // five bags hop along in the Dot's footsteps
        const q = T.hist[T.hist.length - 1 - (i + 1) * 6]; if (!q) continue;
        bag(sx(q.x - q.face * 4), sy(q.y) - Math.abs(Math.sin(T.f * 0.25 + i * 0.9)) * 3);
      }
      if (k === 'echo' && DD.drawDot) for (let i = 3; i >= 1; i--) {   // cheap video echo: the Dot's last frames, tinted and fading
        const q = T.hist[T.hist.length - 1 - i * 4]; if (!q) continue;
        ctx.save(); ctx.globalAlpha = 0.42 - i * 0.1; ctx.filter = `hue-rotate(${(T.f * 9 + i * 90) % 360}deg) saturate(2)`;
        DD.drawDot(q.dot, q.pose || 'idle', Math.round(sx(q.x)), Math.round(sy(q.y)), q.face < 0, 1, 1, 0, 1, 0);
        ctx.restore();
      }
    };
    return T;
  }
  const run = makeTrail();
  function trail(G, p, x, y, sx, sy, pose) {   // the engine's hook: step and draw this run's trail behind the Dot
    if (run.frameSeen !== G.frame) { run.frameSeen = G.frame; run.step(look('trail'), G, x, y, p.h, p.onGround, p.vx, p.face, p.dot, pose); }
    run.draw(sx, sy);
  }

  window.DDWear = { ITEMS, OUTFITS, byId, owns, buy, wear, on, frame, trail, makeTrail, TEX, claim, secFound, SEC_MAX: 144, stewDog, rat, sticker, bill, MAPS: { STEWDOG, RAT0: RAT[0], RAT1: RAT[1], BILL, STICKER0: STICKERS[0], STICKER1: STICKERS[1] },
    set preview(v) { preview = v; }, get preview() { return preview; }, reload: load };
})();
