// Cutscenes: short scripted scenes played inside the stage itself, on its own set with its own sprites, so they look like the game.
// Every scene goes through this one player, and the player draws all the chrome: the letterbox bars, the caption box (the game's own
// dialogue box, with portraits, and real show clips for the voices), the title cards, the lower thirds, flashes and fades. A scene
// (game/cuts/w<N>.js) only stages things: camera moves, actors, poses, lines. design/CUTSCENES.md has the rules every scene follows.
// A scene plays the first time its moment comes up on this computer, whatever the unlock options say, and once per visit to a stage
// (AGAIN and RESTART never replay it). CUTSCENES: EVERY TIME in the options plays them on every visit. Hold jump, or press start, to
// skip. Seen scenes live in localStorage under dootledots.cuts, so CLEAR DATA brings them all back and SAVE DATA carries them.
//
// DDCut.scene(levelId, moment, def). Moments: 'open' (the stage opens, before the controls card and title wipe), 'boss_in' (the Dot
// crosses into the arena; the scene's 'boss' card replaces the name banner), 'boss_out' (the knockout; the scene says the defeat
// lines), 'goal' (the goal is touched, before the results), 'at' (the Dot first passes tile column def.at; use 'at', 'at2'...).
// def: { beats(S, G) -> [beat...], sprites: [...], live (the stage keeps running: fans, falling popcorn), hidePlayer, fin(G, S)
//   (runs at the end and on a skip: leave the stage as the scene would have), when(G) (play only if true), endT (boss_out: frames
//   left before the results, 30 by default), keepEnd (boss_out: leave the boss's own end delay alone), portraits, names, cols }.
// Beats run one after another; and: true starts the next one at the same time. Positions are world pixels; S.tx(n) is tile n.
//   { wait: n }                                      hold
//   { cam: 'player'|'boss'|actorId|[x, y], t, dx, dy, ease: 'inout'|'out'|'cut' }   centre the camera there over t frames
//   { say: who, text, clip, name, hold, col }      a caption; clip alone captions the clip's own words. Tap jump to move on
//   { clip: id, wait }                              a voice clip with no caption (wait: hold for its length)
//   { card: 'boss', title, sub, from }              the boss title card (slam), in the world's colours
//   { card: 'era', title, sub, from }               the film-leader era card (defaults: the world's title, tag and seasons)
//   { card: 'title', title, sub, t }                big type on black
//   { third: title, sub, t }                        the lower third, as the rewind reel draws it (non-blocking unless wait: true)
//   { actor: id, spr | dot | draw(ctx, X, Y, a, S), x, y, flip, pose, frames, fps, z, alpha, sx, sy, rot, bob, shadow }
//   { move: id, x, y, t, hop, ease ('inout', 'out', 'in' for a fall, 'linear'), walk, face }        walk or hop an actor; Dots animate their own strip, others bob
//   { set: id, ...props }   { gone: id }   { fn(G, S) }   { run(G, S, t) -> true when done }
//   { sfx: name }   { shake: n }   { flash: col, t }   { fade: 0|1, t, col }
// S also has: S.boss() (the boss's body), S.body(kind), S.hide(body) / S.show(body) (hidden bodies come back at the end),
//   S.actor(id), S.tx(n), S.floor (the player's feet y), S.t (the scene clock).
(function () {
  const DD = window.DD, VW = DD.VW, VH = DD.VH, TS = DD.TS;
  const SKEY = 'dootledots.cuts', MKEY = 'dootledots.cutsevery';
  const LIB = {};
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ease = k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const eOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const backOut = k => { k = clamp(k, 0, 1); return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); };
  const BAR = 18, SKIP_HOLD = 40;
  const SPEAK = { tim: '#6cc8b4', gregg: '#e8707a' };
  const rect = (c, x, y, w, h) => { DD.ctx.fillStyle = c; DD.ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const fitScale = (s, w, max) => { for (let k = max; k > 1; k--) if (s.length * 4 * k - k <= w) return k; return 1; };
  const clean = s => String(s).replace(/[‘’]/g, "'").replace(/[“”"]/g, '').replace(/[—–]/g, '-').replace(/…/g, '...').replace(/;/g, ',').toUpperCase();
  function wrap(txt, n) { const out = []; let cur = ''; for (const w of clean(txt).split(/\s+/)) { if (cur && cur.length + 1 + w.length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); return out.slice(0, 3); }

  function scene(level, kind, def) { LIB[level + ':' + kind] = Object.assign({ level, kind, key: level + ':' + kind }, def); }
  const worldOf = L => (window.WORLDS || []).find(w => w.n === L.world) || null;

  function cue(kind, o = {}) {
    const L = DD.L, G = DD.G; if (!L || !G) return false;
    if (kind === 'open') for (const k in LIB) if (LIB[k].level === L.id && LIB[k].sprites) DD.loadSprites(LIB[k].sprites);
    let def = null;
    if (kind === 'tick') {
      const px = G.pl.x + G.pl.w / 2;
      for (const k in LIB) { const d = LIB[k]; if (d.level === L.id && d.at != null && px >= d.at * TS && !(DD.opts && DD.opts.__cuts && DD.opts.__cuts[d.key])) { def = d; break; } }
    } else def = LIB[L.id + ':' + kind];
    if (!def) return false;
    const opts = DD.opts || (DD.opts = {}), played = opts.__cuts || (opts.__cuts = {});
    if (played[def.key]) return false;   // once per visit
    played[def.key] = 1;
    const seen = load(SKEY, {});
    if (seen[def.key] && !load(MKEY, false)) return false;
    if (def.when && !def.when(G)) return false;
    seen[def.key] = 1; store(SKEY, seen);
    begin(def, o); return true;
  }

  // ---- the runner
  function begin(def, o) {
    const G = DD.G, L = DD.L;
    const S = { def, G, t: 0, ready: false, beats: [], i: 0, cur: null, bg: [], actors: [], byId: {}, hidden: [], bars: 0, closing: 0,
      fade: def.kind === 'open' ? 1 : 0, fadeCol: '#000', cap: null, card: null, third: null, flash: 0, flashMax: 1, flashCol: '#fff',
      skipT: 0, hint: 0, then: o.then, world: worldOf(L), L };
    S.tx = n => n * TS;
    S.floor = G.pl.y + G.pl.h;
    S.boss = () => DD.bodies.find(b => b.def && (b.def.boss || /_boss$/.test(b.kind))) || null;
    S.body = kind => DD.bodies.find(b => b.kind === kind) || null;
    S.hide = b => { if (b && !b.cutHide) { b.cutHide = true; S.hidden.push(b); } };
    S.show = b => { if (b) b.cutHide = false; };
    S.actor = id => S.byId[id] || null;
    const D = G.dlg; if (D) { D.q.length = 0; D.cur = null; D.show = 0; }
    G.banner = null; if (G.bq) G.bq.length = 0;
    if (window.DDVoice && window.DDVoice.hush) window.DDVoice.hush();   // the scene owns the voice track: a banner's or a cue's line stops
    try { S.beats = (def.beats(S, G) || []).filter(Boolean); } catch (e) { console.warn('cutscene ' + def.key + ' would not build', e); return; }
    S.handle = { step: IN => step(S, IN), drawWorld: ctx => drawWorld(S, ctx), drawOver: ctx => drawOver(S, ctx), get live() { return !!def.live; }, get hidePlayer() { return !!def.hidePlayer; }, scene: S };
    DD.setCut(S.handle);
  }

  function camTo(S, spec, dx = 0, dy = 0) {   // the camera's top-left that centres spec
    const G = S.G, L = S.L, LW = L.W * TS, LH = L.H * TS;
    let x, y;
    if (Array.isArray(spec)) [x, y] = spec;
    else if (spec === 'player') { x = G.pl.x + G.pl.w / 2; y = G.pl.y + G.pl.h; }
    else if (spec === 'boss') { const b = S.boss(); x = b ? b.x + b.w / 2 : G.pl.x; y = b ? b.y + b.h : G.pl.y; }
    else { const a = S.byId[spec]; x = a ? a.x : G.pl.x; y = a ? a.y : G.pl.y; }
    const flat = !Array.isArray(spec);   // a thing's feet sit a bit below the middle, the way the play camera frames the Dot
    return { x: clamp(x + dx - VW / 2, 0, Math.max(0, LW - VW)), y: clamp(y + dy - (flat ? VH * 0.62 : VH / 2), 0, Math.max(0, LH - VH)) };
  }

  function task(S, b) {   // a beat as a per-frame function (true when done); instant beats return null
    const G = S.G, V = window.DDVoice;
    if (b.wait != null && Object.keys(b).length <= 2 && !b.clip) return t => t >= b.wait;
    if (b.cam != null) {
      const from = { x: G.cam.x, y: G.cam.y }, to = camTo(S, b.cam, b.dx, b.dy), dur = b.ease === 'cut' ? 0 : (b.t != null ? b.t : 60), f = b.ease === 'out' ? eOut : ease;
      return t => { const k = dur ? f(t / dur) : 1; G.cam.x = from.x + (to.x - from.x) * k; G.cam.y = from.y + (to.y - from.y) * k; return t >= dur; };
    }
    if (b.say != null) {
      const who = b.say, L = S.L, def = S.def, txt = b.text != null ? b.text : (b.clip && V && V.line(b.clip)) || '';
      const pn = (def.portraits && def.portraits[who]) || (L.portraits && L.portraits[who]) || 'portrait_' + who;
      const dot = DD.DOTS[who], name = String(b.name || (def.names && def.names[who]) || (L.names && L.names[who]) || (dot && dot.name) || who).toUpperCase();
      const col = b.col || (def.cols && def.cols[who]) || SPEAK[who] || (dot && dot.col) || '#ffe680';
      const dur = b.clip && V ? V.clip(b.clip) : 0, lines = wrap(txt, 62), len = lines.reduce((a, l) => a + l.length, 0);
      const cap = S.cap = { who, name, col, pn: DD.ready(pn) ? pn : null, lines, len, n: 0, voiced: dur > 0, t: 0, k0: S.t - (S.capEnd || -99) <= 2 ? 8 : 0 };   // back to back lines keep the box up
      const need = dur > 0 ? Math.ceil(dur * 60) + 14 : (b.hold || Math.max(70, 40 + len * 1.6));
      return t => {
        cap.t = t;
        if (cap.n < len) { cap.n = Math.min(len, cap.n + (cap.voiced ? 1 : 0.5)); if (!cap.voiced && Math.floor(cap.n) % 2 && Math.floor(cap.n) !== cap.lb) { cap.lb = Math.floor(cap.n); DD.SFX.blip(230 + (who.length * 17 % 5) * 22); } }
        const done = (S.tap && t > 12 && cap.n >= len) || (t >= need && cap.n >= len);
        if (S.tap && t > 12 && cap.n < len) cap.n = len;
        if (done) { if (S.tap && V) V.hush(); if (S.cap === cap) S.cap = null; S.capEnd = S.t; }
        return done;
      };
    }
    if (b.clip != null) { const d = V ? V.clip(b.clip) : 0; if (!b.wait) return null; const need = Math.ceil(d * 60); return t => t >= need; }
    if (b.card != null) {
      const w = S.world || {}, kind = b.card, dur = b.t || (kind === 'boss' ? 150 : kind === 'era' ? 190 : 150);
      S.card = { kind, t: 0, dur, title: clean(b.title || (kind === 'era' ? w.title : kind === 'boss' && G.boss ? G.boss.name : '') || ''),
        sub: clean(b.sub != null ? b.sub : kind === 'era' ? w.tag : kind === 'boss' && G.boss ? G.boss.cfg.sub || '' : ''), from: clean(b.from != null ? b.from : kind === 'era' ? w.seasons : ''), w };
      return t => { S.card.t = t; if (kind === 'boss' && t === 12) { DD.SFX.slam(); G.shake = Math.max(G.shake, 7); S.flash = S.flashMax = 6; S.flashCol = '#fff'; } if (t >= dur) { S.card = null; return true; } return false; };
    }
    if (b.third != null) {
      const dur = b.t || 170; S.third = { title: clean(b.third), sub: clean(b.sub || ''), t: 0, dur };
      const q = S.third, f = () => { if (S.third !== q) return true; if (!S.cap || q.t < 12) q.t++; if (q.t >= dur) { S.third = null; return true; } return false; };   // its clock waits while a caption covers it
      if (b.wait) return f; S.bg.push({ f, t: 0 }); return null;
    }
    if (b.actor != null) {
      const a = Object.assign({ z: 0, alpha: 1, sx: 1, sy: 1, rot: 0, flip: false, pose: 'idle', t0: S.t }, b, { id: b.actor });
      if (S.byId[a.id]) S.actors.splice(S.actors.indexOf(S.byId[a.id]), 1);
      S.byId[a.id] = a; S.actors.push(a); S.actors.sort((p, q) => p.z - q.z); return null;
    }
    if (b.move != null) {
      const a = S.byId[b.move]; if (!a) return null;
      const x0 = a.x, y0 = a.y, x1 = b.x != null ? b.x : x0, y1 = b.y != null ? b.y : y0, dur = b.t || 40, f = b.ease === 'linear' ? (k => clamp(k, 0, 1)) : b.ease === 'out' ? eOut : b.ease === 'in' ? (k => clamp(k, 0, 1) ** 2) : ease;   // in: a fall
      if (x1 !== x0 && b.face !== false) a.flip = x1 < x0;
      return t => {
        const k = f(t / dur), hop = b.hop ? -Math.sin(clamp(t / dur, 0, 1) * Math.PI) * b.hop : 0;
        a.x = x0 + (x1 - x0) * k; a.y = y0 + (y1 - y0) * k; a.hopY = hop;
        if (a.dot) a.livePose = b.hop ? (t < dur / 2 ? 'jump' : 'fall') : (b.walk !== false && x1 !== x0 ? 'walk' + (Math.floor(t / 5) % 4) : null);
        else a.walkBob = b.walk !== false && x1 !== x0 && !b.hop ? -Math.abs(Math.sin(t / 5)) * 1.5 : 0;
        if (t >= dur) { a.hopY = 0; a.walkBob = 0; a.livePose = b.hop && a.dot ? 'land' : null; if (a.livePose) a.landT = 6; return true; }
        return false;
      };
    }
    if (b.set != null) { const a = S.byId[b.set]; if (a) { const p = Object.assign({}, b); delete p.set; delete p.and; Object.assign(a, p); } return null; }
    if (b.gone != null) { const a = S.byId[b.gone]; if (a) { S.actors.splice(S.actors.indexOf(a), 1); delete S.byId[b.gone]; } return null; }
    if (b.fn) { b.fn(G, S); return null; }
    if (b.run) return t => b.run(G, S, t);
    if (b.sfx) { const s = DD.SFX[b.sfx]; if (s) s(); return null; }
    if (b.shake != null) { G.shake = Math.max(G.shake, b.shake); return null; }
    if (b.flash != null) { S.flashCol = b.flash || '#fff'; S.flash = S.flashMax = b.t || 8; return null; }
    if (b.fade != null) { const from = S.fade, to = b.fade, dur = b.t || 30; if (b.col) S.fadeCol = b.col; return t => { S.fade = from + (to - from) * clamp(t / dur, 0, 1); return t >= dur; }; }
    if (b.wait != null) return t => t >= b.wait;
    return null;
  }

  function startNext(S) {   // start beats until one blocks (and: true lets the next one start alongside)
    while (S.i < S.beats.length) {
      const b = S.beats[S.i++], f = task(S, b);
      if (!f) continue;
      if (b.and) { S.bg.push({ f, t: 0 }); continue; }
      S.cur = { f, t: 0 }; return;
    }
    S.cur = null;
  }

  function finish(S, skipped) {
    const G = S.G, def = S.def, V = window.DDVoice, B = G.boss;
    if (skipped && V) V.hush();
    try { if (def.fin) def.fin(G, S); } catch (e) { console.warn('cutscene ' + def.key + ' fin', e); }
    for (const b of S.hidden) if (!b.keepHidden) b.cutHide = false;
    if (def.kind === 'open') {   // hand over to the title wipe: the iris opens on the Dot from black
      const p = G.pl, L = S.L;
      G.cam.x = clamp(p.x + p.w / 2 - VW / 2, 0, Math.max(0, L.W * TS - VW)); G.cam.y = clamp(p.y + p.h - VH * 0.62, 0, Math.max(0, L.H * TS - VH));
    }
    if (def.kind === 'boss_in' && skipped && B) DD.banner(B.name, 100, B.cfg.sub || '');
    if (def.kind === 'boss_out' && B && !def.keepEnd) B.endT = Math.min(B.endT, def.endT || 30);
    G.dlg.q.length = 0; G.dlg.cur = null; G.banner = null; if (G.bq) G.bq.length = 0;
    if (S.then) S.then();
  }

  function step(S, IN) {
    S.t++;
    const held = IN.j;
    if (IN.jp || IN.any || IN.start || IN.l || IN.r) S.hint = 150;
    else if (S.hint > 0) S.hint--;
    S.tap = !!(IN.jp || IN.click);
    if (IN.start) { finish(S, true); return false; }
    if (held && S.ready) { if (++S.skipT >= SKIP_HOLD) { finish(S, true); return false; } } else S.skipT = Math.max(0, S.skipT - 2);
    if (S.flash > 0) S.flash--;
    for (const a of S.actors) { if (a.landT > 0 && --a.landT === 0) a.livePose = null; }
    if (!S.ready) {   // wait for the scene's sprites (two seconds at most), under the bars
      S.bars = Math.min(1, S.bars + 1 / 16);
      const need = (S.def.sprites || []).filter(n => !DD.ready(n));
      if (need.length && S.t < 120) return true;
      S.ready = true; startNext(S); S.tap = false;
    }
    if (S.closing) {
      S.bars = Math.max(0, S.bars - 1 / 14);
      S.fade = S.def.kind === 'open' ? Math.min(1, S.fade + 1 / 12) : Math.max(0, S.fade - 1 / 14);   // an opening ends on black, where the title wipe's iris starts
      if (++S.closing > 16) { finish(S, false); return false; }
      return true;
    }
    S.bars = Math.min(1, S.bars + 1 / 16);
    S.bg = S.bg.filter(q => !q.f(q.t++));
    if (S.cur && S.cur.f(S.cur.t++)) startNext(S);
    if (!S.cur && !S.bg.length) { S.cap = null; S.closing = 1; }
    return true;
  }

  // ---- drawing
  function drawWorld(S, ctx) {   // actors, in the world layer with the Dot and the bodies
    const G = S.G;
    for (const a of S.actors) {
      if (a.alpha <= 0) continue;
      const X = DD.wx(a.x), Y = DD.wy(a.y) + (a.hopY || 0) + (a.walkBob || 0) + (a.bob ? Math.round(Math.sin((G.frame + (a.t0 || 0)) / 14) * a.bob) : 0);
      if (a.shadow) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; const w = a.shadow * Math.max(0.5, 1 + (a.hopY || 0) / 60); ctx.fillRect(Math.round(X - w / 2), DD.wy(a.y) - 1, Math.round(w), 2); }
      if (a.draw) a.draw(ctx, X, Y, a, S);
      else if (a.dot) DD.drawDot(a.dot, a.livePose || a.pose || 'idle', X, Y, a.flip, a.sx, a.sy, a.rot, a.alpha);
      else { const n = a.frames ? a.frames[Math.floor((G.frame - (a.t0 || 0)) / (60 / (a.fps || 6))) % a.frames.length] : a.spr; DD.spr(n, X, Y, a.flip, a.sx, a.sy, a.rot, a.alpha); }
    }
    if (S.def.draw) S.def.draw(ctx, G, S);
  }

  function drawOver(S, ctx) {
    const G = S.G, text = DD.text;
    if (S.def.over) S.def.over(ctx, G, S);
    if (S.fade > 0) { ctx.globalAlpha = clamp(S.fade, 0, 1); rect(S.fadeCol, 0, 0, VW, VH); ctx.globalAlpha = 1; }
    if (S.flash > 0) { ctx.globalAlpha = S.flash / S.flashMax * 0.85; rect(S.flashCol, 0, 0, VW, VH); ctx.globalAlpha = 1; }
    const bh = Math.round(BAR * ease(S.bars));
    if (bh > 0) { rect('#000', 0, 0, VW, bh); rect('#000', 0, VH - bh, VW, bh); }
    if (S.third) drawThird(S);
    if (S.card) drawCard(S, S.card);
    if (S.cap) drawCap(S, S.cap);
    if (S.hint > 0 && S.ready && !S.closing) {   // the skip prompt, in the top bar, when a key goes down
      ctx.globalAlpha = Math.min(1, S.hint / 30) * 0.9;
      const s = 'HOLD JUMP TO SKIP', w = s.length * 4 - 1, x = VW - 8 - w;
      text(s, x, 6, '#a8a0b8', 1, null);
      rect('#3a3446', x, 13, w, 1); if (S.skipT) rect('#ffe680', x, 13, Math.round(w * S.skipT / SKIP_HOLD), 1);
      ctx.globalAlpha = 1;
    }
  }

  function drawCap(S, c) {   // the game's dialogue box, at the bottom, over the lower bar
    const ctx = DD.ctx, text = DD.text, k = eOut(Math.min(c.t + c.k0, 8) / 8), y = Math.round(VH - 39 + (1 - k) * 10);
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(10,4,8,0.92)'; ctx.fillRect(10, y, 300, 35);
    rect(c.col, 10, y, 300, 1); rect(c.col, 10, y + 34, 300, 1); rect(c.col, 10, y, 1, 35); rect(c.col, 309, y, 1, 35);
    const tx = c.pn ? 44 : 16;
    if (c.pn) { rect(c.col, 13, y + 4, 26, 26); rect('#1a0a12', 14, y + 5, 24, 24); ctx.drawImage(DD.IMG[c.pn], 14, y + 5); }
    text(c.name, tx, y + 3, c.col, 1, '#000');
    let left = Math.floor(c.n);
    c.lines.forEach((ln, i) => { const n = Math.min(ln.length, left); left -= n; if (n > 0) text(ln.slice(0, n), tx, y + 11 + i * 8, '#fff', 1, '#000'); });
    if (c.n >= c.len && Math.floor(c.t / 15) % 2 === 0) { rect(c.col, 301, y + 27, 5, 1); rect(c.col, 302, y + 28, 3, 1); rect(c.col, 303, y + 29, 1, 1); }
    ctx.globalAlpha = 1;
  }

  function drawThird(S) {   // the rewind reel's lower third: the world's tab, a title and a source line
    const q = S.third, w = S.world || { n: '', accent: '#e8c060', fg: '#fff' }, ctx = DD.ctx, text = DD.text;
    const k = Math.min(1, q.t / 12), o = Math.min(1, (q.dur - q.t) / 12), e = eOut(Math.min(k, o)), ox = Math.round(-(1 - e) * VW);
    if (S.cap) return;
    ctx.save(); ctx.translate(ox, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 128, VW, 30); rect(w.accent, 0, 128, VW, 1);
    rect(w.accent, 6, 132, 22, 11); text(String(w.n), 17, 135, '#000', 1, null, 'center');
    text(q.title, 33, 132, '#fffbd0', fitScale(q.title, VW - 40, 2), '#000');
    if (q.sub) text(q.sub, 33, 148, '#a8a0b8', 1, '#000');
    ctx.restore();
  }

  function drawCard(S, c) {
    const ctx = DD.ctx, text = DD.text, w = c.w || {}, t = c.t, out = c.dur - 16;
    if (c.kind === 'boss') {   // a band slams in from the right, holds, and goes out to the left
      const X = t < 12 ? Math.round((1 - backOut(t / 12)) * VW) : t > out ? -Math.round(ease((t - out) / 16) * (VW + 10)) : 0;
      const Y = 56, H = 68, acc = w.accent || '#e8c060';
      ctx.save(); ctx.translate(X, 0);
      ctx.fillStyle = 'rgba(8,4,10,0.94)'; ctx.fillRect(0, Y, VW, H);
      rect(acc, 0, Y, VW, 2); rect(acc, 0, Y + H - 2, VW, 2); rect(acc, 0, Y + 5, VW, 1); rect(acc, 0, Y + H - 6, VW, 1);
      for (let i = 0; i < 8; i++) rect(acc, 12 + i * 6 - (t % 6), Y + H / 2 - 1, 3, 2);   // a little arrow run on each side
      for (let i = 0; i < 8; i++) rect(acc, VW - 54 + i * 6 + (t % 6), Y + H / 2 - 1, 3, 2);
      if (c.from) text(c.from, VW / 2, Y + 11, acc, 1, '#000', 'center');
      const sc = fitScale(c.title, 216, 4);
      text(c.title, VW / 2 + 1, Y + 22 + 1, '#000', sc, null, 'center'); text(c.title, VW / 2, Y + 22, '#ffffff', sc, null, 'center');
      if (c.sub) text(c.sub, VW / 2, Y + 24 + sc * 5 + 6, '#e8504a', 1, '#000', 'center');
      ctx.restore();
    } else if (c.kind === 'era') {   // the film-leader strip of the title wipe, in the world's colours, with the seasons and the tag
      const X = t < 16 ? -Math.round((1 - eOut(t / 16)) * (VW + 20)) : t > out ? Math.round(ease((t - out) / 16) * (VW + 20)) : 0;
      const Y = 50, H = 80, bg = w.bg || '#120808', fg = w.fg || '#ffe680', acc = w.accent || '#e8c060', band = w.band || '#3a2a24';
      ctx.save(); ctx.translate(X, 0);
      rect(bg, 0, Y, VW, H); rect(band, 0, Y, VW, 12); rect(band, 0, Y + H - 12, VW, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; for (let sx = 4 - (t * 2 % 12); sx < VW; sx += 12) { ctx.fillRect(sx, Y + 4, 6, 4); ctx.fillRect(sx, Y + H - 8, 6, 4); }
      if (c.from) text(c.from, VW / 2, Y + 18, acc, 1, null, 'center');
      const sc = fitScale(c.title, 290, 3);
      text(c.title, VW / 2 + 1, Y + 29, '#000', sc, null, 'center'); text(c.title, VW / 2, Y + 28, fg, sc, null, 'center');
      if (c.sub) text(c.sub, VW / 2, Y + 30 + sc * 5 + 7, '#ffffff', 1, '#000', 'center');
      ctx.restore();
    } else {   // big type on black
      const k = Math.min(1, t / 20) * Math.min(1, (c.dur - t) / 20);
      ctx.globalAlpha = k; rect('#000', 0, 0, VW, VH);
      if (c.from) text(c.from, VW / 2, 62, '#a8a0b8', 1, null, 'center');
      const sc = fitScale(c.title, 300, 4);
      text(c.title, VW / 2, 74, '#ffe680', sc, '#3a1a10', 'center');
      if (c.sub) text(c.sub, VW / 2, 80 + sc * 5 + 4, '#ffffff', 1, null, 'center');
      ctx.globalAlpha = 1;
    }
  }

  window.DDCut = {
    scene, cue, LIB,
    get every() { return load(MKEY, false); }, set every(v) { store(MKEY, !!v); },
    get seen() { return load(SKEY, {}); },
  };
})();
