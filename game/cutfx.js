// Cutscene toolkit: the new beats for game/cutscene.js. cutscene.js hands three calls over to this file (task, under, over) and the boss card
// (bossCard), so a scene can say { zoom: 2.5, on: 'mayor', t: 20 } like any other beat. Everything here is post-processing on the frame the
// stage and the scene's actors have already drawn, so it works in every level without the level knowing.
//   { zoom: z, on: actorId|'player'|'boss'|[x, y], dy, t }   push in (nearest-neighbour crop) on a point, following it if it moves; zoom: 1 to come back
//   { iris: 0..1, on, t }                                     the cartoon iris (0 shut, 1 open)
//   { fx: { ... } }                                           set any of the frame effects below at once; { tween: key, to, t } eases a number
//       desat 0..1, sepia, sketch, grade: [col, a], dark 0..1, spots: [{ on, r, cone }], lines: on, streak: -1|1, glitch 0..1, noise n (frames),
//       tape: 'COUNTER', rec, ticker: 'TEXT', siren, search, pops, eyes: [[x, y]...], timelapse: frames per day, split: [onA, onB]
//   { stamp: 'TEXT', sub, col, t, wait }                      big type that slams in over the shot
//   { pause: on, title, sub, col, label, t }                  the VHS pause tag: the frame slides into a panel on the subject and a cassette rises with the name
//   { fx: { panels: { layout: 'grid4'|'row3', list: [{ on, z, dy, label, col, drop }], stagger } } }  comic panels, each a crop of this frame on its subject;
//       { panel: i } reveals panel i now (or give stagger, in frames, to reveal them all in turn). { fx: { panels: null } } closes them
//   { fx: { sil: [{ on: actorId|'boss', col, glow, spr }] } }  draw subjects as solid shapes against a backlight (the boss uses its world's sprite)
//   { fx: { counter: { label, to, prefix, dur, t0: null } } }  a full-frame tape counter rolling up to a number (t0: null starts it now)
//   { fx: { poster: { lines: [...], spr, t0: null } } }       a campaign poster: duotone, halftone, the subject in silhouette, the words sliding in
//   { fx: { env: { text, t0: null } } }                       a sealed envelope that opens on a card
(function () {
  if (window.DDCutFX) return;
  const DD = window.DD, VW = DD.VW, VH = DD.VH;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ease = k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const eOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const backOut = k => { k = clamp(k, 0, 1); return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); };
  const H = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clean = s => String(s).replace(/[‘’]/g, "'").replace(/[“”"]/g, '').replace(/[—–]/g, '-').toUpperCase();
  const fit = (s, w, max) => { for (let k = max; k > 1; k--) if (s.length * 4 * k - k <= w) return k; return 1; };
  const wrap = (txt, n) => { const out = []; let cur = ''; for (const w of clean(txt).split(/\s+/)) { if (cur && cur.length + 1 + w.length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); return out; };
  const BUFS = {}, buf = k => { let b = BUFS[k]; if (!b) { b = BUFS[k] = document.createElement('canvas'); b.width = VW; b.height = VH; b.x = b.getContext('2d'); } b.x.imageSmoothingEnabled = false; b.x.setTransform(1, 0, 0, 1, 0, 0); b.x.globalAlpha = 1; b.x.globalCompositeOperation = 'source-over'; return b; };
  const snap = (ctx, k = 'a') => { const b = buf(k); b.x.clearRect(0, 0, VW, VH); b.x.drawImage(ctx.canvas, 0, 0, VW, VH); return b; };
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const F = S => S.fx || (S.fx = { zoom: 1, iris: 1 });
  const BOSS = { 1: 'w1_scissors_idle', 2: 'drsan', 3: 'w3_abdul_idle', 4: 'w4_dekkar', 5: 'w5_timboss', 6: 'w6_lawyer_tim', 7: 'w7_timocx', 8: 'w8_joker', 9: 'w9_amato_0', 10: 'w10_ratking', 11: 'w11_new_a', 12: 'w12_mg_idle' };   // menu.js BOSS_ART
  const FW = { w6_lawyer_tim: 36, w1_mayor: 24, w1_citf_blue: 16 };   // strips: one frame's width
  const SILS = {}, silOf = (n, col) => { const k = n + col; if (SILS[k]) return SILS[k]; const i = DD.IMG[n], c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (SILS[k] = c); };
  function drawSil(S, ctx, s) {
    let n = s.spr, X, Y, flip = false, sx = 1, sy = 1, a = 1;
    if (s.on === 'boss') { const b = S.boss(); if (!b) return; X = DD.wx(b.x + b.w / 2); Y = DD.wy(b.y + b.h); flip = !!b.flip; n = n || BOSS[S.L && S.L.world]; }
    else { const A = S.byId[s.on]; if (!A) return; X = DD.wx(A.x); Y = DD.wy(A.y) + (A.hopY || 0) + (A.walkBob || 0); flip = !!A.flip; sx = A.sx || 1; sy = A.sy || 1; a = A.alpha == null ? 1 : A.alpha; n = n || (A.frames ? A.frames[0] : A.spr) || A.dot; }
    if (s.in) a *= clamp((S.t - (s.t0 == null ? S.t : s.t0)) / s.in, 0, 1);   // in: n fades the shape up over n frames
    if (!n || !DD.ready(n) || a <= 0) return;
    const im = DD.IMG[n], fw = s.fw || FW[n] || im.width, ih = im.height, glow = s.glow || (S.world && S.world.accent) || '#ffe680';
    const g = ctx.createRadialGradient(X, Y - ih * sy / 2, 2, X, Y - ih * sy / 2, Math.max(ih, fw) * 1.4); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = 0.85 * a * (s.a == null ? 1 : s.a); ctx.fillStyle = g; ctx.fillRect(X - 200, Y - 200, 400, 400); ctx.restore();
    const put = (c, dx) => { ctx.save(); ctx.globalAlpha = a * (s.a == null ? 1 : s.a); ctx.translate(Math.round(X + dx), Math.round(Y)); ctx.scale(flip ? -sx : sx, sy); ctx.drawImage(c, 0, 0, fw, ih, -Math.round(fw / 2), -ih, fw, ih); ctx.restore(); };
    const rim = silOf(n, glow); put(rim, -1); put(rim, 1); put(silOf(n, s.col || '#000'), 0);
  }
  const PANELS = { grid4: [[4, 20, 154, 68], [162, 20, 154, 68], [4, 92, 154, 68], [162, 92, 154, 68]], row3: [[4, 20, 101, 140], [109, 20, 101, 140], [214, 20, 101, 140]] };
  function drawPanels(S, ctx, P) {
    const R = PANELS[P.layout] || PANELS.grid4, b = snap(ctx, 'pn'); rect(ctx, '#000', 0, 0, VW, VH);
    P.list.forEach((q, i) => {
      const t0 = P.t[i]; if (t0 == null || S.t < t0) return;
      const age = S.t - t0, [x, y, w, h] = R[i] || R[0], z = q.z || 1.6, p = at(S, q.on), sw = w / z, sh = h / z;
      let ox = 0, oy = 0, al = 1;
      if (q.drop) oy = -Math.round((1 - ease(age / 14)) * (y + h));
      else if (P.layout === 'row3') oy = Math.round((1 - eOut(age / 24)) * (i % 2 ? 1 : -1) * 170);
      else al = clamp(age / 12, 0, 1);
      ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.rect(x, Math.max(0, y + oy), w, h); ctx.clip();
      ctx.drawImage(b, clamp(p.x - sw / 2, 0, VW - sw), clamp(p.y + (q.dy == null ? -16 : q.dy) - sh / 2, 0, VH - sh), sw, sh, x + ox, y + oy, w, h);
      if (q.label) DD.text(clean(q.label), x + 8, y + oy + h - 14, q.col || '#ffffff', 2, '#000');
      ctx.restore();
    });
  }
  function at(S, on) {   // the screen point of a target (an actor's feet, the boss, the player, or a world point)
    const G = S.G; let x = G.pl.x + G.pl.w / 2, y = G.pl.y + G.pl.h;
    if (Array.isArray(on)) [x, y] = on;
    else if (on === 'boss') { const b = S.boss(); if (b) { x = b.x + b.w / 2; y = b.y + b.h; } }
    else if (on && on !== 'player') { const a = S.byId[on]; if (a) { x = a.x; y = a.y + (a.hopY || 0); } }
    return { x: DD.wx(x), y: DD.wy(y) };
  }
  const tween = (obj, key, to, dur) => { const from = obj[key] == null ? (key === 'zoom' || key === 'iris' ? 1 : 0) : obj[key]; if (!dur) { obj[key] = to; return null; } return t => { obj[key] = from + (to - from) * ease(t / dur); return t >= dur; }; };

  function task(S, b) {
    const f = F(S);
    if (b.zoom != null) { if (b.on !== undefined) f.on = b.on; f.dy = b.dy != null ? b.dy : (b.on !== undefined ? -14 : f.dy || 0); return tween(f, 'zoom', b.zoom, b.t || 0); }
    if (b.iris != null) { if (b.on !== undefined) f.irisOn = b.on; return tween(f, 'iris', b.iris, b.t || 0); }
    if (b.fx) { if (b.fx.sil) for (const s of b.fx.sil) if (s.in) s.t0 = S.t;
      for (const k in b.fx) { const v = b.fx[k]; if (v && typeof v === 'object' && !Array.isArray(v) && v.t0 === null) v.t0 = S.t; } Object.assign(f, b.fx); if (b.fx.noise) f.noiseT = S.t;
      const P = b.fx.panels; if (P) { P.t = P.t || []; if (P.stagger != null) P.list.forEach((q, i) => { P.t[i] = S.t + i * P.stagger; }); }
      return b.wait ? t => t >= b.wait : null; }
    if (b.panel != null) { const P = f.panels; if (P) { P.t = P.t || []; P.t[b.panel] = S.t; } return null; }
    if (b.tween) return tween(f, b.tween, b.to, b.t || 0);
    if (b.stamp != null) { f.stamp = { text: clean(b.stamp), sub: b.sub ? clean(b.sub) : '', col: b.col || (S.world && S.world.accent) || '#ffe680', t0: S.t, dur: b.t || 90 }; return b.wait ? t => t >= (b.t || 90) : null; }
    if (b.pause != null) {
      f.pause = { on: b.pause, title: clean(b.title || ''), sub: b.sub || '', col: b.col || '#ffe680', label: clean(b.label || 'DOOTLE DOTS'), t0: S.t };
      const dur = b.t || 230; if (DD.SFX.tick) DD.SFX.tick();
      return t => { const done = t >= dur || (S.tap && t > 45); if (done) f.pause = null; return done; };
    }
    return undefined;
  }

  function under(S, ctx) {   // the frame effects, on the stage and actors, under the bars and the captions
    const f = S.fx; if (!f) return;
    const out = S.closing && S.def.kind !== 'open' ? clamp(S.closing / 14, 0, 1) : 0, plain = out ? snap(ctx, 'plain') : null;   // the scene's last frames dissolve back to the plain stage, so nothing snaps off when play resumes (an opening ends on black anyway)
    if (f.sil) for (const s of f.sil) drawSil(S, ctx, s);
    if (f.zoom > 1.001) { const p = at(S, f.on), z = f.zoom, sw = VW / z, sh = VH / z, b = snap(ctx); ctx.drawImage(b, clamp(p.x - sw / 2, 0, VW - sw), clamp(p.y + (f.dy || 0) - sh / 2, 0, VH - sh), sw, sh, 0, 0, VW, VH); }
    if (f.split) {   // two crops of this frame side by side, each on its subject, with a black gutter
      const b = snap(ctx); rect(ctx, '#000', 0, 0, VW, VH);
      f.split.forEach((on, i) => { const p = at(S, on), sw = 104, sh = 120; ctx.drawImage(b, clamp(p.x - sw / 2, 0, VW - sw), clamp(p.y - 20 - sh / 2, 0, VH - sh), sw, sh, 4 + i * 160, 20, 152, 140); });
    }
    if (f.desat > 0.01 || f.sepia || f.sketch) {
      const b = snap(ctx); ctx.save(); ctx.filter = 'grayscale(' + (f.sketch ? 0.5 : f.desat || 0) + ')' + (f.sepia || f.sketch ? ' sepia(' + (f.sketch ? 0.55 : 1) + ')' : '') + (f.sketch ? ' contrast(1.15)' : ''); ctx.drawImage(b, 0, 0); ctx.restore();
      if (f.sketch) { ctx.save(); ctx.globalAlpha = 0.09; ctx.strokeStyle = '#2a1a10'; ctx.beginPath(); for (let x = -180; x < VW; x += 4) { ctx.moveTo(x, VH); ctx.lineTo(x + 180, 0); } ctx.stroke(); ctx.restore(); }
    }
    if (f.grade) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = f.grade[1]; rect(ctx, f.grade[0], 0, 0, VW, VH); ctx.restore(); }
    if (f.timelapse) { const day = (S.t - (f.tl0 = f.tl0 == null ? S.t : f.tl0)) / f.timelapse, night = (Math.sin(day * Math.PI * 2) + 1) / 2; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6 * night; rect(ctx, '#0a1440', 0, 0, VW, VH); ctx.restore(); DD.text('DAY ' + Math.min(7, 1 + Math.floor(day)), VW - 10, 24, '#fff0d8', 2, '#000', 'right'); }
    if (f.dark > 0.01) {
      const b = buf('d'), x = b.x; x.clearRect(0, 0, VW, VH); x.fillStyle = '#05030a'; x.fillRect(0, 0, VW, VH); x.globalCompositeOperation = 'destination-out';
      for (const s of f.spots || []) {
        const p = at(S, s.on != null ? s.on : s), r = s.r || 28;
        if (s.cone !== false) { const g = x.createLinearGradient(0, 0, 0, p.y); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.9)'); x.fillStyle = g; x.beginPath(); x.moveTo(p.x - 4, 0); x.lineTo(p.x + 4, 0); x.lineTo(p.x + r * 0.8, p.y + 4); x.lineTo(p.x - r * 0.8, p.y + 4); x.fill(); }
        const g = x.createRadialGradient(p.x, p.y - 12, 0, p.x, p.y - 12, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(p.x - r, p.y - 12 - r, r * 2, r * 2);
      }
      ctx.save(); ctx.globalAlpha = clamp(f.dark, 0, 1); ctx.drawImage(b, 0, 0); ctx.restore();
    }
    if (f.eyes) ctx.globalAlpha = clamp((f.dark || 0) / 0.6, 0, 1);   // eyes only shine as the lights go down
    if (f.eyes) for (const [ex, ey] of f.eyes) { if ((Math.floor(S.t / 20) + ex) % 5) { const X = DD.wx(ex), Y = DD.wy(ey); rect(ctx, '#ff3a2a', X - 3, Y, 2, 1); rect(ctx, '#ff3a2a', X + 2, Y, 2, 1); } }
    if (f.eyes) ctx.globalAlpha = 1;
    if (f.lines) { const p = at(S, f.lines), fl = Math.floor(S.t / 2); ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = f.linesCol || '#ffffff'; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2 + H(i + fl * 7) * 0.12, r1 = 52 + H(i * 3 + fl) * 30, w = 1 + H(i + fl * 3) * 3, cx = p.x, cy = p.y - 24; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a + w / 300) * 400, cy + Math.sin(a + w / 300) * 400); ctx.lineTo(cx + Math.cos(a - w / 300) * 400, cy + Math.sin(a - w / 300) * 400); ctx.fill(); } ctx.restore(); }
    if (f.streak) { ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) { const y = 20 + H(i) * 140, len = 30 + H(i + 5) * 70, x = ((H(i + 9) * 400 + f.streak * S.t * 9 * (1 + H(i))) % 420 + 420) % 420 - 60; ctx.fillRect(Math.round(x), Math.round(y), Math.round(len), 1); } ctx.restore(); }
    if (f.glitch > 0.01) { const bb = Math.floor(S.t / 3); for (let i = 0; i < 6; i++) { const y = Math.floor(H(i + bb) * 160), h = 2 + Math.floor(H(i * 3 + bb) * 8), dx = Math.round((H(i * 5 + bb) - 0.5) * 30 * f.glitch); ctx.drawImage(ctx.canvas, 0, y, VW, h, dx, y, VW, h); if (i % 2) { ctx.globalAlpha = 0.4 * f.glitch; rect(ctx, '#6eff50', 0, y, VW, 1); ctx.globalAlpha = 1; } } }
    if (f.siren) { ctx.save(); ctx.globalAlpha = 0.2; rect(ctx, Math.floor(S.t / 15) % 2 ? '#ff3030' : '#3050ff', 0, 0, VW, VH); ctx.restore(); }
    if (f.search) for (let j = 0; j < 2; j++) { const a = Math.sin(S.t / 66 + j * 2) * 0.5; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffffff'; ctx.translate(j ? 250 : 70, 140); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(22, -220); ctx.lineTo(-22, -220); ctx.fill(); ctx.restore(); }
    if (f.pops) for (let i = 0; i < 6; i++) { const k = Math.floor(S.t / 12 + i * 1.7); if (H(k * 3 + i) > 0.5) continue; const x = 20 + H(k + i) * 280, y = 120 + H(k * 2 + i) * 30; rect(ctx, '#ffffff', x - 2, y, 5, 1); rect(ctx, '#ffffff', x, y - 2, 1, 5); }
    if (f.noise && S.t - f.noiseT < f.noise) for (let i = 0; i < 16; i++) { const y = (i * 37 + S.t * 11) % VH, h = 2 + (i * 7 + S.t) % 5; rect(ctx, (i + S.t) % 3 ? 'rgba(200,200,210,0.55)' : 'rgba(60,60,70,0.7)', 0, y, VW, h); }
    if (f.bars) { ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].forEach((c, i) => rect(ctx, c, i * 46, 0, 46, 130)); rect(ctx, '#101018', 0, 130, VW, 50); }
    if (f.panels) drawPanels(S, ctx, f.panels);
    if (f.counter) {   // the tape counter card
      const c = f.counter, k = eOut((S.t - c.t0) / (c.dur || 150)), acc = (S.world && S.world.accent) || '#f0c030';
      rect(ctx, '#0e070c', 0, 0, VW, VH);
      DD.text(clean(c.label || ''), VW / 2, 42, '#a8a0b8', 1, null, 'center');
      const v = (c.prefix || '') + Math.floor((c.to || 0) * k).toLocaleString('en-US'), sc = fit(v, 290, 3);
      DD.text(v, VW / 2 + 1, 57, '#3a2a10', sc, null, 'center'); DD.text(v, VW / 2, 56, acc, sc, null, 'center');
      rect(ctx, '#3a3446', 60, 82, 200, 4); rect(ctx, acc, 60, 82, 200 * k, 4);
      if (c.sub) DD.text(clean(c.sub), VW / 2, 94, '#cfc4cc', 1, null, 'center');
      f.tape = f.tape || c.tape || ' ';
    }
    if (f.poster) {   // the campaign poster
      const P = f.poster, t = S.t - P.t0, n = P.spr || BOSS[S.L && S.L.world];
      rect(ctx, '#c82838', 0, 0, VW, VH); ctx.save(); ctx.globalAlpha = 0.3; for (let y = 0; y < VH; y += 6) for (let x = (y / 6 % 2) * 3; x < VW; x += 6) rect(ctx, '#5a0a18', x, y, 2, 2); ctx.restore();
      if (n && DD.ready(n)) { const im = DD.IMG[n], fw = FW[n] || im.width; ctx.save(); ctx.translate(232, VH - 4); ctx.scale(2, 2); ctx.drawImage(silOf(n, '#1a2a6a'), 0, 0, fw, im.height, -fw / 2, -im.height, fw, im.height); ctx.restore(); }
      rect(ctx, '#f4f4f8', 0, 24, VW, 3); rect(ctx, '#2a3a8a', 0, 27, VW, 3);
      (P.lines || []).forEach((ln, i) => { const k = backOut((t - 12 - i * 6) / 18), s = i === 0 ? 6 : 3, y = i === 0 ? 46 : 86 + (i - 1) * 20; DD.text(clean(ln), 20 - (1 - k) * (100 + i * 40), y, '#f4f4f8', s, '#5a0a18'); });
    }
    if (f.env) {   // the sealed envelope
      const P = f.env, ek = eOut((S.t - P.t0) / 36), x0 = 40, y0 = Math.round(30 + (1 - ek) * 30);
      rect(ctx, '#000', x0 - 1, y0 - 1, 82, 52); rect(ctx, '#f4ecd8', x0, y0, 80, 50); rect(ctx, '#c8b890', x0, y0, 80, 1);
      ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 40, y0 - 24 * ek + (1 - ek) * 24); ctx.lineTo(x0 + 80, y0); ctx.fill();
      if (ek > 0.9) DD.text(clean(P.text || ''), x0 + 40, y0 + 14, '#2a3a6a', 4, null, 'center');
    }
    if (f.iris < 0.999) { const p = at(S, f.irisOn), r = Math.max(0, f.iris) * 230; ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.arc(p.x, p.y - 14, r, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore(); }
    if (f.tape || f.rec) {   // the tape look: scanlines and a rolling tracking band
      ctx.save(); ctx.globalAlpha = 0.16; for (let y = 0; y < VH; y += 2) rect(ctx, '#000', 0, y, VW, 1); ctx.restore();
      if (f.tape) { const by = ((S.t * 0.8) % 220) - 20; ctx.save(); ctx.globalAlpha = 0.18; rect(ctx, '#fff', 0, by, VW, 3); ctx.globalAlpha = 0.12; rect(ctx, '#000', 0, by + 3, VW, 5); ctx.restore(); }
    }
    if (plain) { ctx.save(); ctx.globalAlpha = out; ctx.drawImage(plain, 0, 0); ctx.restore(); }
  }

  function over(S, ctx) {   // over the bars: the tape OSD, the ticker, stamps and the pause tag
    const f = S.fx; if (!f) return;
    const oa = S.closing ? 1 - clamp(S.closing / 14, 0, 1) : 1; if (oa <= 0) return;   // and they fade with the scene's close, even over an opening's black
    ctx.save(); ctx.globalAlpha = oa; overAll(S, ctx, f); ctx.restore();
  }
  function overAll(S, ctx, f) {
    if (f.tape) { DD.text('PLAY >', 9, 23, '#000', 1, null); DD.text('PLAY >', 8, 22, '#7cff7c', 1, null); DD.text(clean(f.tape), VW - 7, 23, '#000', 1, null, 'right'); DD.text(clean(f.tape), VW - 8, 22, '#7cff7c', 1, null, 'right'); }
    if (f.rec) { rect(ctx, '#d83030', VW - 22, 22, 5, 5); DD.text('REC', VW - 26, 22, '#ffffff', 1, '#000', 'right'); }
    if (f.ticker) { const txt = clean(f.ticker), w = txt.length * 4, y = VH - 34; rect(ctx, '#fff4e0', 0, y, VW, 10); rect(ctx, (S.world && S.world.accent) || '#f08030', 0, y, 34, 10); DD.text('LIVE', 6, y + 3, '#ffffff', 1, null); ctx.save(); ctx.beginPath(); ctx.rect(36, y, VW - 36, 10); ctx.clip(); for (let x = VW - ((S.t * 0.66) % (w + 40)); x < VW; x += w + 40) DD.text(txt, x, y + 3, '#2a2440', 1, null); ctx.restore(); }
    if (f.stamp) {
      const s = f.stamp, t = S.t - s.t0; if (t > s.dur) f.stamp = null; else {
        const k = backOut(t / 12), out = clamp((s.dur - t) / 12, 0, 1), sc = fit(s.text, 296, 6), y = 44 - (1 - k) * 40;
        ctx.save(); ctx.globalAlpha = out; if (s.sub) DD.text(s.sub, VW / 2, y - 14, '#ffffff', 2, '#000', 'center');
        DD.text(s.text, VW / 2 + 2, y + 2, '#000', sc, null, 'center'); DD.text(s.text, VW / 2, y, s.col, sc, null, 'center'); ctx.restore();
      }
    }
    if (f.pause) drawPause(S, ctx, f.pause, S.t - f.pause.t0);
  }

  function drawPause(S, ctx, P, t) {
    const k = ease((t - 7) / 20), lw = Math.round(VW + (178 - VW) * k), p = at(S, P.on), sx = clamp(Math.round(p.x - lw / 2), 0, VW - lw), b = snap(ctx, 'p');
    rect(ctx, '#0a0810', 0, 0, VW, VH); ctx.drawImage(b, sx, 0, lw, VH, 0, 0, lw, VH);
    const fr = Math.floor(t / 2), by = 30 + ((fr * 7) % 110);
    ctx.drawImage(b, sx + 2, by, lw - 2, 2, 0, by, lw - 2, 2);
    ctx.save(); ctx.globalAlpha = 0.16; for (let y = 0; y < VH; y += 2) rect(ctx, '#000', 0, y, lw, 1); ctx.restore();
    if (Math.floor(t / 24) % 2 === 0 || t < 30) { DD.text('PAUSE', 9, 24, '#000', 1, null); DD.text('PAUSE', 8, 23, '#7cff7c', 1, null); rect(ctx, '#7cff7c', 32, 23, 2, 5); rect(ctx, '#7cff7c', 36, 23, 2, 5); }
    const ck = backOut((t - 18) / 27), X = 186, Y = Math.round(200 + (28 - 200) * ck), W = 126, Hh = 118;
    rect(ctx, '#07060a', X - 1, Y - 1, W + 2, Hh + 2); rect(ctx, '#1c1a22', X, Y, W, Hh); rect(ctx, '#2c2934', X, Y, W, 1); rect(ctx, '#2c2934', X, Y, 1, Hh);
    [[X + 4, Y + 4], [X + W - 6, Y + 4], [X + 4, Y + Hh - 6], [X + W - 6, Y + Hh - 6]].forEach(([x, y]) => rect(ctx, '#4a4652', x, y, 2, 2));
    rect(ctx, '#f2ecdc', X + 8, Y + 8, W - 16, 64); rect(ctx, P.col, X + 8, Y + 8, W - 16, 7); rect(ctx, P.col, X + 8, Y + 68, W - 16, 2);
    DD.text(P.label, X + 11, Y + 9, '#1c1424', 1, null);
    const sc = fit(P.title, W - 24, 3); DD.text(P.title, X + 12, Y + 20, '#1c1424', sc, null);
    let left = Math.floor(Math.max(0, t - 42) * 0.75); wrap(P.sub, 26).slice(0, 4).forEach((ln, i) => { const m = Math.min(ln.length, left); left -= m; if (m > 0) DD.text(ln.slice(0, m), X + 12, Y + 24 + sc * 5 + i * 8, '#3a3446', 1, null); });
    rect(ctx, '#0a0a10', X + 24, Y + 78, W - 48, 26); rect(ctx, '#3a2418', X + 34, Y + 84, W - 68, 14);
    [X + 40, X + W - 40].forEach(rx => { ctx.fillStyle = '#e8e4dc'; ctx.beginPath(); ctx.arc(rx, Y + 91, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#1c1a22'; ctx.beginPath(); ctx.arc(rx, Y + 91, 3, 0, 7); ctx.fill(); for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; rect(ctx, '#1c1a22', rx + Math.cos(a) * 6 - 1, Y + 91 + Math.sin(a) * 6 - 1, 2, 2); } });
    rect(ctx, '#121018', X + 30, Y + Hh - 10, W - 60, 10);
  }

  function bossCard(S, c) {   // the new boss card: the frame drains, bars thicken, lines burst from the boss, the name stamps letter by letter
    const ctx = DD.ctx, w = c.w || {}, acc = w.accent || '#e8c060', t = c.t, dur = c.dur, out = clamp((t - (dur - 18)) / 18, 0, 1);
    const b = snap(ctx); ctx.save(); ctx.filter = 'grayscale(' + (0.85 * (1 - out)) + ') brightness(' + (1 - 0.45 * (1 - out)) + ')'; ctx.drawImage(b, 0, 0); ctx.restore();
    const bp = S.boss(), p = bp ? { x: DD.wx(bp.x + bp.w / 2), y: DD.wy(bp.y + bp.h / 2) } : { x: VW / 2, y: VH / 2 };
    if (t < 40) { const fl = Math.floor(t / 2); ctx.save(); ctx.globalAlpha = 0.35 * (1 - t / 40); ctx.fillStyle = acc; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2 + H(i + fl * 7) * 0.12, r1 = 40 + H(i * 3 + fl) * 30; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1); ctx.lineTo(p.x + Math.cos(a + 0.01) * 400, p.y + Math.sin(a + 0.01) * 400); ctx.lineTo(p.x + Math.cos(a - 0.01) * 400, p.y + Math.sin(a - 0.01) * 400); ctx.fill(); } ctx.restore(); }
    if (t < 16) { ctx.globalAlpha = (1 - t / 16) * 0.85; rect(ctx, '#ffffff', 0, 0, VW, VH); ctx.globalAlpha = 1; }
    const bh = Math.round(18 + 26 * backOut(t / 18) * (1 - ease(out)));
    ctx.save(); ctx.globalAlpha = 1 - out;
    rect(ctx, '#000', 0, 0, VW, bh); rect(ctx, '#000', 0, VH - bh, VW, bh); rect(ctx, acc, 0, bh, VW, 1); rect(ctx, acc, 0, VH - bh - 1, VW, 1);
    if (c.from) DD.text(c.from.slice(0, Math.floor(clamp((t - 6) / 24, 0, 1) * c.from.length)), 10, bh - 10, acc, 1, null);
    const sc = fit(c.title, 280, 4), tw = c.title.length * 4 * sc - sc, x0 = Math.round(VW / 2 - tw / 2);
    for (let i = 0; i < c.title.length; i++) { const lk = clamp((t - 15 - i * 2.7) / 5, 0, 1); if (lk <= 0) continue; const s2 = Math.max(sc, Math.round(sc * (2.2 - 1.2 * eOut(lk)))), xx = x0 + i * 4 * sc - (s2 - sc) * 1.5, yy = Math.max(2, 6 + (sc - s2) * 2.5); DD.text(c.title[i], xx + 1, yy + 1, acc, s2, null); DD.text(c.title[i], xx, yy, '#ffffff', s2, null); }
    if (c.sub) DD.text(c.sub, VW / 2, VH - bh + 8, '#ffb4a4', 1, null, 'center');
    ctx.restore();
    return true;
  }

  window.DDCutFX = { task, under, over, bossCard };
})();
