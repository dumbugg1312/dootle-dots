// Level 4-boss: DEKKAR TIM on the VFC stage. Hand-written (no design layout file): the boss entity, his bottles and bandage whip,
// the theme (stage deck, curtain, DEKKAR banner, amps and a kit, par cans, an audience in the dark with Gregg in the front row) and the level data.
// Phase 1: bottle throws and chord slams. Phase 2 (hp 3 or less): he becomes MUMMY TIM and the bandage whip joins in.
// Stomp him only while he is dazed after a slam; every other touch hurts. Art: design/sprites/w4_dekkar.py, w4_set.py, w4_cast.py.
(function () {
const FLOOR_PX = 21 * 16;          // top of the stage floor, in px
const BOSS_H = 48, BOSS_W = 34;
const SH = {};   // pre-baked brightness variants of a sprite (f < 1 darkens): ctx.filter is far too slow in software canvases
const shade = (n, f) => {
  const k = n + '|' + f; if (SH[k]) return SH[k];
  if (!DD.ready(n)) return null;
  const im = DD.IMG[n]; if (typeof document === 'undefined' || typeof document.createElement !== 'function') return im;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d');
  g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,' + (1 - f) + ')'; g.fillRect(0, 0, c.width, c.height);
  return (SH[k] = c);
};
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
const FL = {};   // white-silhouette copies of sprites for the hurt flash (browser only)
function flashOf(n) {
  if (FL[n]) return FL[n];
  if (!DD.ready(n) || typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const im = DD.IMG[n], c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const k = c.getContext('2d'); k.drawImage(im, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#fff'; k.fillRect(0, 0, c.width, c.height);
  return (FL[n] = c);
}
function blit(ctx, src, x, y, flip, sx, sy, alpha) {   // bottom-centre anchored, optionally mirrored and squashed
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale((flip ? -1 : 1) * sx, sy); if (alpha != null) ctx.globalAlpha = alpha;
  ctx.drawImage(src, -Math.round(w / 2), -h); ctx.restore();
}

DD.defineEntity('bottle', {       // a thrown beer bottle: it lies on its side and rolls along the stage, jump over it
  update(b, G) {
    if (DD.moveX(b, b.vx, false)) { b.dead = true; DD.dust(DD.cx(b), b.y + b.h, 4, 1.4); return; }
    b.spin += b.vx * 0.5;
    if (--b.life <= 0) b.dead = true;
  },
  draw(b, ctx) {
    const X = DD.wx(b.x), Y = DD.wy(b.y), d = b.vx > 0 ? 1 : -1, ph = Math.floor(Math.abs(b.spin) / 3) % 3;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X + 1, Y + 7, 12, 1);
    ctx.fillStyle = '#1a3a22'; ctx.fillRect(X, Y + 1, 12, 6); ctx.fillRect(d > 0 ? X + 11 : X - 3, Y + 3, 4, 2);   // body and neck
    ctx.fillStyle = '#2e8a4e'; ctx.fillRect(X + 1, Y + 2, 10, 4); ctx.fillStyle = '#9ae8b0'; ctx.fillRect(X + 2 + ph * 3, Y + 2, 2, 1); ctx.fillRect(X + 4 - ph, Y + 5, 3, 1);
    ctx.fillStyle = '#efe3c6'; ctx.fillRect(X + 4, Y + 3, 4, 2);                                                       // label
    ctx.fillStyle = '#e8c050'; ctx.fillRect(d > 0 ? X + 14 : X - 4, Y + 3, 1, 2);                                       // cap
  },
  stomp: () => false,
  touch(b) { DD.hurt(DD.cx(b)); },
});

DD.defineEntity('dekkar', {
  boss: true,
  spawn: t => ({ x: t.x, y: FLOOR_PX - BOSS_H, w: BOSS_W, h: BOSS_H, vx: 0, vy: 0, dir: -1, st: 'idle', t: 60, k: 0, tx: 0, rings: [], wx: 0, ph: 0, mummy: false, sq: 0, hurt: 0 }),
  update(e, G) {
    const B = DD.boss, p = G.pl;
    e.ph++; if (e.sq > 0) e.sq--; if (e.hurt > 0) e.hurt--;
    e.vy = Math.min(e.vy + 0.4, 6); const landed = DD.moveY(e, e.vy, false); if (landed) e.vy = 0;
    if (!B || !B.engaged || G.done) return;
    if (B.dead) { if (e.st !== 'beaten') { e.st = 'beaten'; e.t = 0; } e.t++; if (e.t === 26 && e.mummy) { e.mummy = false; DD.SFX.pop(0.8); for (let i = 0; i < 18; i++) DD.part({ x: DD.cx(e) + (Math.random() - 0.5) * 16, y: e.y + 6 + Math.random() * 14, vx: (Math.random() - 0.5) * 3, vy: -1.5 - Math.random() * 1.5, life: 44, max: 44, r: 2, col: '#f4ecd8', g: 0.07 }); } if (e.t % 14 === 0 && e.t < 90) DD.part({ x: DD.cx(e) + (Math.random() - 0.5) * 24, y: e.y + 6, vx: (Math.random() - 0.5) * 1.4, vy: -1 - Math.random(), life: 36, max: 36, r: 1, col: '#ffe680', g: 0.05 }); return; }
    const a0 = B.arena[0], a1 = B.arena[1];
    e.dir = DD.sign(DD.cx(p) - DD.cx(e) || -1);
    // shock rings from a slam landing: hurt a grounded Dot under the wave, a jump clears it
    for (const r of e.rings) {
      r.t++;
      const half = 10 + r.t * 6;
      if (r.t < 24 && !r.hit && p.onGround && Math.abs(DD.cx(p) - r.x) < half && Math.abs(DD.cx(p) - r.x) > half - 22 && DD.bot(p) >= FLOOR_PX - 1) { r.hit = true; DD.hurt(r.x); }
    }
    e.rings = e.rings.filter(r => r.t < 24);
    const cool = B.phase ? 40 : 65;
    switch (e.st) {
      case 'idle':
        const gap = Math.abs(DD.cx(p) - DD.cx(e)); e.vx = gap > 72 ? e.dir * (B.phase ? 0.9 : 0.6) : gap < 40 ? (DD.cx(e) < (a0 + a1) / 2 ? 1.3 : -1.3) : 0;   // he closes in but stops short, and backs off a Dot that is right on him: no pinning anyone against the wall
        if (DD.moveX(e, e.vx, false) || e.x < a0 + 4 || e.x + e.w > a1 - 4) e.vx = 0;
        if (--e.t <= 0) {
          const seq = B.phase ? ['whip', 'slam', 'bottle', 'whip', 'slam'] : ['bottle', 'slam', 'bottle', 'slam'];
          e.st = seq[e.k++ % seq.length];
          e.t = e.st === 'bottle' ? 40 : e.st === 'slam' ? 46 : 196;   // the whip: 36 frames of warning, then a 160-frame sweep
          if (e.st === 'slam') e.tx = DD.cx(p);                                // telegraph: the shadow lands where you stood
          if (e.st === 'whip') e.wx = a1 + 60;
        }
        break;
      case 'xform':                                                            // the bandages wind on, he is untouchable for a beat
        e.vx = 0; if (--e.t <= 0) { e.st = 'idle'; e.t = 40; }
        if (e.t % 6 === 0) DD.part({ x: DD.cx(e) + (Math.random() - 0.5) * 30, y: e.y + 4 + Math.random() * 40, vx: (Math.random() - 0.5) * 2, vy: -0.3, life: 28, max: 28, r: 1, col: '#f4ecd8', g: 0.02 });
        break;
      case 'bottle':                                                           // raises the bottle, glints, throws
        if (--e.t <= 0) {
          DD.addEntity('bottle', { x: DD.cx(e) - 6, y: FLOOR_PX - 8, w: 11, h: 7, vx: DD.sign(DD.cx(p) - DD.cx(e) || -1) * 2.4, life: 200, spin: 0 });
          e.st = 'idle'; e.t = cool; e.sq = 6;
        }
        break;
      case 'slam':                                                             // crouch, shadow shows the target
        if (--e.t <= 0) { e.st = 'leap'; e.vy = -7.5; e.vx = (e.tx - DD.cx(e)) / 36; }
        break;
      case 'leap':
        DD.moveX(e, e.vx, false);
        if (landed && e.vy === 0) {
          e.st = 'quake'; e.t = 26; e.vx = 0;     // the shock ring runs first (26 frames, nothing else going on); only then does he daze
          e.rings.push({ x: DD.cx(e), t: 0, hit: false });
          G.shake = Math.max(G.shake, 8); DD.SFX.thud(); DD.dust(DD.cx(e), FLOOR_PX, 14, 2.4);
          for (let i = 0; i < 6; i++) DD.part({ x: DD.cx(e), y: FLOOR_PX - 2, vx: (i - 2.5) * 1.1, vy: -1.2 - Math.random(), life: 26, max: 26, r: 1, col: '#ffd890', g: 0.1 });
        }
        break;
      case 'quake':                                                            // the ring plays out; he is staggering, nothing is vulnerable yet
        if (--e.t <= 0) { e.st = 'daze'; e.t = B.phase ? 105 : 120; }
        break;
      case 'daze':                                                             // stuck on the stage, seeing stars: the opening (about 2 s in phase 1, 1.75 s in phase 2). Harmless to touch.
        if (--e.t <= 0) { e.st = 'idle'; e.t = cool; }
        break;
      case 'whip':                                                             // MUMMY TIM's bandage whip, sweeping left
        if (--e.t <= 0) { e.st = 'idle'; e.t = cool; break; }
        if (e.t < 160) {
          e.wx -= 4.5;
          if (DD.ov(p, { x: e.wx, y: 320, w: 56, h: 14 }) && !G.done) DD.hurt(e.wx + 28);
        }
        break;
    }
    if (e.st === 'whip' && e.t >= 160) e.wx = a1 + 60;                        // the band waits off the right edge
  },
  draw(e, ctx, G) {
    const B = DD.boss, X = DD.wx(e.x), Y = DD.wy(e.y), cxs = DD.wx(DD.cx(e)), feet = DD.wy(e.y + BOSS_H);
    // telegraphs
    if (e.st === 'slam') {
      const f = 1 - e.t / 46, w = 20 + f * 44;
      ctx.fillStyle = 'rgba(20,6,10,0.7)'; ctx.fillRect(DD.wx(e.tx) - w / 2, DD.wy(FLOOR_PX) - 3, w, 4);
      ctx.fillStyle = '#ff5a40'; if (Math.floor(e.t / 4) % 2) { ctx.fillRect(DD.wx(e.tx) - 2, DD.wy(FLOOR_PX) - 9, 4, 5); ctx.fillRect(DD.wx(e.tx) - 5, DD.wy(FLOOR_PX) - 14, 10, 3); }
    }
    if (e.st === 'bottle' && Math.floor(e.t / 3) % 2) { ctx.fillStyle = '#fff8e0'; ctx.fillRect(cxs - 12 * e.dir - 2, Y - 10, 3, 3); ctx.fillRect(cxs - 12 * e.dir - 1, Y - 13, 1, 9); ctx.fillRect(cxs - 12 * e.dir - 4, Y - 9, 7, 1); }
    if (e.st === 'whip' && e.t >= 160 && Math.floor(e.t / 4) % 2) { ctx.fillStyle = '#ff5a40'; ctx.fillRect(cxs - 2, Y - 18, 4, 9); ctx.fillRect(cxs - 2, Y - 7, 4, 4); }   // a red ! over his head: the band is coming from the right
    if (e.st === 'whip' && e.t < 160) {   // the bandage band across the stage, loops and all
      for (let i = 0; i < 4; i++) { const bx = DD.wx(e.wx) + i * 14; ctx.fillStyle = '#e8e0d0'; ctx.fillRect(bx, DD.wy(320), 14, 4); ctx.fillStyle = '#b4aa98'; ctx.fillRect(bx, DD.wy(324), 14, 6); ctx.fillStyle = '#756a60'; ctx.fillRect(bx + 12, DD.wy(324), 2, 6); ctx.fillStyle = '#f4ecd8'; ctx.fillRect(bx + 3, DD.wy(330), 2, 4 + (i + Math.floor(e.t / 3)) % 3); }
    } else if (e.st === 'whip') {        // warning band at the right edge, flashing
      const ax = DD.wx(B.arena[1]) - 30;
      if (Math.floor(e.t / 4) % 2) { ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.fillRect(ax - 30, DD.wy(320), 60, 14); ctx.fillStyle = '#ff5a40'; ctx.fillRect(ax + 22, DD.wy(318) - 12, 4, 6); ctx.fillRect(ax + 22, DD.wy(318) - 4, 4, 3); }
    }
    for (const r of e.rings) {           // the shock rings: a bright crescent of dust racing away each side
      const half = 10 + r.t * 6, a = 1 - r.t / 24, fx = DD.wx(r.x), fy = DD.wy(FLOOR_PX);
      ctx.fillStyle = 'rgba(255,230,170,' + a * 0.9 + ')'; for (const s of [-1, 1]) { ctx.fillRect(fx + s * half - 2, fy - 6, 3, 6); ctx.fillRect(fx + s * half - 4 + (s > 0 ? 2 : 0), fy - 3, 3, 3); }
      ctx.fillStyle = 'rgba(255,150,80,' + a * 0.6 + ')'; ctx.fillRect(fx - half, fy - 2, half * 2, 2);
    }
    if (B && B.inv > 0 && B.inv < (B.cfg.inv || 50) - 14 && Math.floor(B.inv / 3) % 2 && !B.dead) return;   // blink while invulnerable, after the white flash
    // pick the pose
    const base = e.mummy ? 'w4_mummy' : 'w4_dekkar';
    let pose = '', sx = 1, sy = 1, dy = 0;
    if (e.st === 'bottle') pose = e.mummy ? '' : '_throw';
    else if (e.st === 'whip') pose = '_throw';
    else if (e.st === 'slam') { pose = '_slam'; sy = 0.9 + 0.1 * (e.t / 46); sx = 1.1 - 0.1 * (e.t / 46); }
    else if (e.st === 'leap') pose = '_slam';
    else if (e.st === 'daze') { pose = '_hurt'; dy = 0; }
    else if (e.st === 'beaten') { pose = '_hurt'; sy = 0.82; }
    else if (e.st === 'xform') pose = '';
    else dy = Math.round(Math.abs(Math.sin(e.ph / 9)) * -1);                 // strumming along, a little bounce
    if (e.sq > 0) { sy *= 1 + e.sq * 0.01; sx *= 1 - e.sq * 0.01; }
    const name = base + pose, shake = (B && B.flash > 0 && !B.dead) ? (B.flash % 4 < 2 ? 2 : -2) : 0;
    if (DD.ready(name)) {
      const dxs = cxs + shake + (e.st === 'daze' ? Math.round(Math.sin(e.ph / 5) * 2) : 0);
      if (e.st === 'xform') { ctx.save(); ctx.globalAlpha = e.t % 8 < 4 ? 1 : 0.25; blit(ctx, DD.IMG[(e.t > 35 ? 'w4_dekkar' : 'w4_mummy')], dxs, feet + dy, e.dir > 0, sx, sy); ctx.restore(); }
      else blit(ctx, DD.IMG[name], dxs, feet + dy, e.dir > 0, sx, sy);
      if (B && B.flash > B.cfg.inv - 10) { const fi = flashOf(name); if (fi) blit(ctx, fi, dxs, feet + dy, e.dir > 0, sx, sy, 0.85); }   // the hit flash
    } else { ctx.fillStyle = '#7a1a18'; ctx.fillRect(X, Y, e.w, e.h); }
    if (e.st === 'daze') {                                                   // stars circle his head and a bouncing arrow says STOMP
      for (let i = 0; i < 3; i++) { const a = e.ph / 6 + i * 2.1, sx2 = cxs + Math.cos(a) * 14, sy2 = Y + 2 + Math.sin(a) * 4; ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(sx2) - 1, Math.round(sy2) - 1, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(sx2), Math.round(sy2), 1, 1); }
      if (Math.floor(e.t / 6) % 2 === 0 || e.t > 60) { const ay = Y - 14 + Math.abs(Math.sin(e.ph / 7)) * 4; ctx.fillStyle = '#000'; ctx.fillRect(cxs - 5, ay + 1, 11, 7); ctx.fillStyle = '#ffe680'; ctx.fillRect(cxs - 1, ay - 3, 3, 4); ctx.fillRect(cxs - 4, ay + 1, 9, 2); ctx.fillRect(cxs - 3, ay + 3, 7, 2); ctx.fillRect(cxs - 1, ay + 5, 3, 2); }
    }
  },
  stomp(e, G, p) {                     // only while dazed after a slam: each stun is one hit
    const B = DD.boss;
    if (!B || e.st !== 'daze' || B.inv > 0 || B.dead) return false;
    DD.hitBoss(1); if (B.dead) return true;
    if (e.st !== 'xform') { e.st = 'idle'; e.t = 60; } e.sq = 12; e.hurt = 50; p.vy = -4.6;   // 50 frames of harmless: bump him all you like on the way down
    return true;
  },
  touch(e, G, p) { if (e.st === 'beaten' || e.st === 'daze' || e.st === 'xform' || e.hurt > 0) return; DD.hurt(DD.cx(e)); },   // dazed, changing or just hit: harmless
});

window.LEVEL = {
  id: '4-boss', name: 'DEKKAR TIM', sub: 'EMPTY BOTTLE', world: 4,
  W: 72, H: 24, FLOOR: 21, KINDS: { deck: 1, riser: 1 },
  names: { tim: 'TIM', gregg: 'GREGG', dekkar: 'DEKKAR TIM', mummy: 'MUMMY TIM' },
  portraits: { tim: 'w4_portrait_tim', gregg: 'w4_portrait_gregg', dekkar: 'w4_portrait_dekkar', mummy: 'w4_portrait_dekkar' },
  lines: {   // design/VOICE.md. Sources: S7 the-intern-hotel-transylvania-2 (the Empty Bottle premiere, "normally we talk about movies"), S8 the-magnificent-seven-and-storks (rise from the ashes, the new electronic collaboration, "nobody is wondering that", Kenny Chesney)
    start: [['tim', 'NORMALLY WE TALK ABOUT MOVIES. NOT TODAY.']],
    boss: [['tim', 'THIS IS CALLED EMPTY BOTTLE.']],
    bossPhase1: [['mummy', "I'M RISING FROM THE ASHES. LITERALLY."], ['gregg', 'NOBODY IS WONDERING THAT.']],
    bossDefeat: [['tim', "I'LL DO IT AS A NEW ELECTRONIC COLLABORATION."], ['gregg', "KENNY CHESNEY WOULDN'T LISTEN TO THAT."]],
  },
  sprites: ['w4_dekkar', 'w4_dekkar_throw', 'w4_dekkar_slam', 'w4_dekkar_hurt', 'w4_mummy', 'w4_mummy_throw', 'w4_mummy_slam', 'w4_mummy_hurt',
    'w4_riser', 'w4_curtain', 'w4_banner', 'w4_amp', 'w4_drums', 'w4_mic', 'w4_par', 'w4_seat', 'w4_gregg_bust', 'w4_chip', 'w4_neon',
    'w4_portrait_tim', 'w4_portrait_gregg', 'w4_portrait_dekkar'],
  SOLID: [['deck', 0, 21, 72, 3], ['riser', 18, 18, 6, 3]],
  THINGS: [['dot', 2, 20], ['dekkar', 50, 20]],
  POPCORN: [[4, 19, 6], [11, 17, 4], [16, 15, 2], [18, 17, 6], [19, 14, 4], [24, 15, 2], [7, 17, 3], [12, 19, 4], [27, 19, 6], [24, 17, 1], [30, 17, 5], [33, 19, 3], [36, 17, 3],
            [39, 19, 3], [41, 14, 4], [43, 17, 4], [44, 19, 4], [48, 15, 6], [52, 19, 5], [53, 12, 5], [56, 17, 4], [59, 19, 4], [61, 19, 3], [63, 14, 3], [65, 17, 4], [66, 19, 3], [38, 13, 3], [58, 13, 3]],
  boss: {
    name: 'DEKKAR TIM', hp: 6, arena: [36, 70], inv: 50, endDelay: 160,
    phases: [{ at: 3, say: 'MUMMY TIM', sub: 'RISING FROM THE ASHES', enter(G, B) { const e = DD.bodies.find(b => b.def && b.def.boss); if (e) { e.st = 'xform'; e.t = 70; e.mummy = true; e.rings = []; } G.s.beam = 1; } }],
    onEngage(G) { G.s.beam = 0; },
    onDefeat(G) {
      DD.banner('EMPTY BOTTLE', 110, 'WORLD PREMIERE');
      for (let i = 0; i < 28; i++) DD.drop({ x: 37 * 16 + Math.random() * 32 * 16, y: 150 + Math.random() * 60, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, life: 400, wait: 20 + i });
      G.s.cheer = 200; G.s.beam = 2;
    },
  },
  theme: {
    tiles: { deck: ['#2e141a', '#6e2e34', '#1a0c10'], riser: ['#2e141a', '#6e2e34', '#1a0c10'] },
    bg(ctx, G, DD) {   // the stage seen from the wings: black curtain, the banner, the kit and amps, lights hung over it all
      const c = G.cam, VW = DD.VW, VH = DD.VH, I = DD.IMG, ok = DD.ready, f = G.frame, S = G.s, ph = DD.boss ? DD.boss.phase : 0;
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#06020a'); g.addColorStop(0.6, '#1c0810'); g.addColorStop(1, '#2e1018');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      if (ok('w4_curtain')) {   // the house curtain, hung in folds all the way along the back
        const ox = -Math.round(c.x * 0.5) % 32, oy = -Math.round(c.y * 0.5) % 64;
        const cu = shade('w4_curtain', 0.55) || I.w4_curtain; for (let y = oy - 64; y < VH; y += 64) for (let x = ox - 32; x < VW; x += 32) ctx.drawImage(cu, x, y);
      }
      { const A = DD.art;   // the house curtain gets a swagged velvet valance with gold fringe, tie-back pools of light, and the side legs of the stage
        A.R(0, 0, VW, 15, '#4a0e1a'); for (let x = -((c.x * 0.5) % 32); x < VW; x += 32) { A.R(x, 0, 16, 15, '#6a1626'); A.R(x, 0, 2, 15, '#8a2a3a'); A.R(x + 14, 0, 2, 15, '#2a0610'); }
        A.R(0, 14, VW, 1, '#c98f22'); A.fringe(0, 15, VW, '#b8861e');
        for (const lx of [36, 70]) { const X = Math.round(lx * 16 - c.x); A.R(X - 14, 14, 28, VH, 'rgba(0,0,0,0.0)'); A.R(X - 12, 0, 24, VH, '#12040a'); A.planks(X - 12, 0, 24, VH, '#12040a', 6, true); A.R(X - 12, 0, 1, VH, '#3a1220'); A.R(X + 11, 0, 1, VH, '#050204'); }   // black stage legs at each wing
      }
      { const A = DD.art, fy0 = Math.round(21 * 16 - c.y), wallX = Math.round(36 * 16 - 12 - c.x), x1 = Math.min(wallX, VW), ox = -Math.round(c.x);
        if (x1 > 0) {   // backstage, stage left: the run in from the wings is a painted-black cinderblock wall instead of curtain, with road cases, a dressing-room door and cool work lights
          A.R(0, 15, x1, VH, '#0e060c');
          if (!S.cb && typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof ctx.createPattern === 'function') {   // a 32x16 cinderblock pattern, baked once
            const cv = document.createElement('canvas'); cv.width = 32; cv.height = 16; const g = cv.getContext('2d'); g.fillStyle = '#140a12'; g.fillRect(0, 0, 32, 16); g.fillStyle = '#0a0408'; g.fillRect(0, 7, 32, 1); g.fillRect(0, 15, 32, 1); g.fillRect(15, 0, 1, 8); g.fillRect(31, 8, 1, 8);
            g.fillStyle = '#1e1220'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 8, 32, 1); g.fillStyle = '#18101a'; for (let i = 0; i < 14; i++) g.fillRect((i * 13 + 5) % 30, (i * 7 + 2) % 14, 2, 1); S.cb = ctx.createPattern(cv, 'repeat');
          }
          if (S.cb) { ctx.save(); ctx.beginPath(); ctx.rect(0, 15, x1, VH); ctx.clip(); ctx.translate(ox % 32, -Math.round(c.y) % 16); ctx.fillStyle = S.cb; ctx.fillRect(-32, 15 - 16, x1 + 64, VH + 32); ctx.restore(); }
          { const wg = ctx.createLinearGradient(0, 15, 0, fy0); wg.addColorStop(0, 'rgba(0,0,0,0.55)'); wg.addColorStop(0.5, 'rgba(0,0,0,0)'); wg.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = wg; ctx.fillRect(0, 15, x1, fy0 - 15); }
          A.R(0, fy0 - 5, x1, 5, '#05020a'); A.R(0, fy0 - 5, x1, 1, '#3a2a34');   // the black baseboard
          // cool work lights hung from the truss: they pool white-blue on the wall, the stage itself stays warm
          for (const lw of [110, 300, 470]) { const X = lw + ox; if (X < -30 || X > x1 + 30) continue; const lf = lw === 300 && f % 211 < 4 ? 0.3 : 1;
            A.R(X, 15, 1, 28, '#05020a'); A.R(X - 4, 43, 9, 5, '#1a1a22'); A.R(X - 4, 43, 9, 1, '#5a5a6a'); A.R(X - 3, 48, 7, 1, lf > 0.5 ? '#e8f4ff' : '#506070');
            A.cone(X, 48, 90, 34, '#bfe0ff', 0.1 * lf); A.glow(X, 49, 26, '#bfe0ff', 0.22 * lf); A.glow(X, fy0 - 20, 40, '#a8c8ff', 0.07 * lf); }
          // the dressing-room door, lit by the work light beside it
          { const X = 168 + ox; if (X > -40 && X < x1 + 10) { A.box(X - 3, fy0 - 62, 38, 62, '#1a1218', { outline: '#05020a' }); A.R(X, fy0 - 58, 32, 58, '#4a3a44'); A.planks(X, fy0 - 58, 32, 58, '#4a3a44', 8, true); A.R(X, fy0 - 58, 32, 1, '#7a6a74'); A.R(X, fy0 - 58, 1, 58, '#6a5a64'); A.R(X + 31, fy0 - 58, 1, 58, '#241a20');
            A.R(X + 24, fy0 - 28, 4, 3, '#c9a050'); A.R(X + 24, fy0 - 28, 4, 1, '#fff0c0'); A.R(X, fy0 - 10, 32, 10, '#2a1e26'); A.R(X, fy0 - 10, 32, 1, '#6a5a64'); A.R(X + 8, fy0 - 50, 16, 11, '#e8e0c0'); A.R(X + 8, fy0 - 50, 16, 1, '#fffae8'); A.R(X + 10, fy0 - 47, 12, 1, '#2a2020'); A.R(X + 10, fy0 - 44, 9, 1, '#2a2020'); A.R(X + 10, fy0 - 41, 11, 1, '#2a2020'); A.R(X + 6, fy0 - 51, 3, 3, '#d8d0b0'); A.R(X + 23, fy0 - 51, 3, 3, '#d8d0b0'); } }   // (a taped call sheet)
          // road cases (flight cases) stacked in the wings, with rails, studs, handles and gaffer-taped labels
          const rc = (wx, w, h, col, lab) => { const X = Math.round(wx + ox), Y = fy0 - h; if (X > x1 + 4 || X + w < -4) return; A.box(X, Y, w, h, col, { outline: '#05020a' }); A.R(X + 2, Y + 5, w - 4, 1, '#8a8a96'); A.R(X + 2, Y + h - 6, w - 4, 1, '#8a8a96'); A.R(X + 2, Y + 6, w - 4, 1, '#2a2a30');
            for (const [dx, dy] of [[1, 1], [w - 4, 1], [1, h - 4], [w - 4, h - 4]]) { A.R(X + dx, Y + dy, 3, 3, '#a8a8b2'); A.R(X + dx, Y + dy, 3, 1, '#e8e8f0'); }
            A.R(X + (w >> 1) - 5, Y + (h >> 1), 10, 3, '#14141a'); A.R(X + (w >> 1) - 5, Y + (h >> 1), 10, 1, '#5a5a66'); if (lab) { A.R(X + 4, Y + 9, 12, 6, '#d8d0b0'); A.R(X + 4, Y + 9, 12, 1, '#fffae8'); A.R(X + 6, Y + 12, 8, 1, '#3a2a2a'); } A.R(X, Y + 2, w, 1, 'rgba(255,255,255,0.15)'); };
          rc(30, 40, 34, '#2e2c36', true); rc(34, 32, 26, '#3a2c2c', false); rc(78, 36, 24, '#2a3238', true);
          rc(228, 44, 30, '#32283a', false); rc(232, 38, 24, '#2c3030', true); rc(236, 30, 20, '#3a3030', false);
          rc(372, 40, 40, '#2a2c34', true); rc(376, 32, 30, '#3a2e30', false); rc(520, 36, 26, '#2e3036', true);
          // a stage-left monitor wedge and the cable runs: coiled XLR, a taped snake along the deck, tape flags
          { const X = 420 + ox; if (X > -50 && X < x1 + 10) { ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.moveTo(X, fy0); ctx.lineTo(X + 34, fy0); ctx.lineTo(X + 34, fy0 - 7); ctx.lineTo(X + 4, fy0 - 16); ctx.lineTo(X, fy0 - 16); ctx.fill(); ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.moveTo(X + 2, fy0 - 1); ctx.lineTo(X + 32, fy0 - 1); ctx.lineTo(X + 32, fy0 - 7); ctx.lineTo(X + 4, fy0 - 15); ctx.fill(); ctx.fillStyle = '#5a5a66'; for (let i = 0; i < 6; i++) ctx.fillRect(X + 5 + i * 4, fy0 - 14 + i * 1, 2, 5 - (i >> 2)); A.R(X + 33, fy0 - 7, 1, 7, '#44444e'); } }
          for (const cw of [140, 262, 346, 498]) { const X = cw + ox; if (X < -30 || X > x1 + 10) continue; ctx.strokeStyle = '#0a0608'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X + 8, fy0 - 3, 9 - i * 2, 3 - (i > 1 ? 1 : 0), 0, 0, 7); ctx.stroke(); } ctx.strokeStyle = '#2a2430'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X + 8, fy0 - 4, 9, 3, 0, 3.4, 5.9); ctx.stroke(); }
          for (const [tw, tc] of [[188, '#e8c030'], [310, '#d8d8d8'], [442, '#c8302c'], [540, '#e8c030']]) { const X = tw + ox; if (X > -10 && X < x1) { A.R(X, fy0 - 1, 14, 1, tc); A.R(X + 3, fy0 - 3, 2, 2, tc); } }   // gaffer-tape marks on the deck
          // a fly rail: manila lines down the wall to a belaying rack, sandbags hanging
          { const X = 336 + ox; if (X > -30 && X < x1 + 10) { A.R(X - 2, fy0 - 40, 34, 4, '#1a0c10'); A.R(X - 2, fy0 - 40, 34, 1, '#5a4a52'); for (let i = 0; i < 5; i++) { const lx = X + i * 7, sw = Math.round(Math.sin(f / 60 + i) * 0.7); A.R(lx, 15, 1, fy0 - 55, '#8a7a5a'); A.R(lx + sw, fy0 - 55, 1, 15, '#8a7a5a'); A.R(lx + 1, fy0 - 52 + (i % 2) * 8, 1, 1, '#c8b890'); A.R(lx - 2 + sw, fy0 - 40 - 8, 5, 1, '#6a5a3a'); } } }
          // an EXIT sign over the stage door at the far end, glowing green
          { const X = 8 + ox; if (X > -30 && X < x1) { A.R(X, 66, 24, 10, '#05160a'); A.R(X + 1, 67, 22, 8, '#16803a'); A.R(X + 1, 67, 22, 1, '#60e090'); A.R(X + 5, 70, 2, 3, '#e8ffe8'); A.R(X + 9, 70, 6, 1, '#e8ffe8'); A.R(X + 9, 72, 6, 1, '#e8ffe8'); A.R(X + 17, 70, 3, 3, '#e8ffe8'); A.glow(X + 12, 71, 30, '#40ff90', 0.18); } }
          A.R(x1 - 1 > 0 ? x1 - 1 : 0, 15, 1, VH, 'rgba(0,0,0,0.6)');
        } }
      const mid = (36 + 70) / 2 * 16;
      const bannerX = Math.round(mid - c.x - 112), bannerY = Math.round(2 * 16 - c.y * 0.2 + 22);
      if (ok('w4_banner')) {   // DEKKAR across the back wall, two Ks around one spike, lit from below
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(I.w4_banner, bannerX + 28, bannerY - 8, 168, 72);
        ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(bannerX + 112, bannerY + 110, 6, bannerX + 112, bannerY + 110, 150); gg.addColorStop(0, 'rgba(255,200,150,0.14)'); gg.addColorStop(1, 'rgba(255,200,150,0)'); ctx.fillStyle = gg; ctx.fillRect(bannerX - 40, bannerY - 40, 300, 280);
        ctx.restore();
      }
      if (ok('w4_banner')) { const A = DD.art; A.bulbs(bannerX + 28, bannerY - 12, 168, 8, f); A.bulbs(bannerX + 28, bannerY + 66, 168, 8, f + 9); }   // chasing bulbs frame the DEKKAR banner
      // the kit behind him, a half-stack at each end, a mic stand at the front
      const fy = Math.round(DD.wy(21 * 16));
      if (ok('w4_drums')) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(shade('w4_drums', 0.8) || I.w4_drums, Math.round(mid - c.x + 24), fy - 60, 90, 60); ctx.restore(); }
      if (ok('w4_amp')) for (const tx of [37.4, 66.6]) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(I.w4_amp, Math.round(tx * 16 - c.x) + ((G.shake > 2 || G.frame - (G.dipAt ?? -999) < 20) ? (f & 2 ? 1 : -1) : 0), fy - 69, 45, 69); ctx.restore(); }
      if (ok('w4_mic')) ctx.drawImage(I.w4_mic, Math.round(mid - c.x - 130), fy - 38);
      // the lighting truss and its par cans; the beams sweep, and turn a sickly green for MUMMY TIM
      const ty = Math.round(8 - c.y * 0.1 + 6);
      ctx.fillStyle = '#12080c'; ctx.fillRect(0, ty, VW, 4); ctx.fillStyle = '#3a2a30'; ctx.fillRect(0, ty, VW, 1); for (let x = -((c.x * 1) % 12); x < VW; x += 12) ctx.fillRect(Math.round(x), ty + 1, 1, 3);
      const cols = S.beam === 2 ? ['255,240,200', '255,220,120', '255,255,255'] : ph ? ['120,255,150', '200,255,140', '90,220,160'] : ['255,150,90', '255,214,120', '255,90,100'];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const lx = Math.round(((36 + i * 8.5) * 16) - c.x), sw = Math.sin(f / 50 + i * 1.3) * 34, tc = cols[i % 3];
        if (ok('w4_par')) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(I.w4_par, lx - 8, ty + 3); ctx.globalCompositeOperation = 'lighter'; }
        const gr = ctx.createLinearGradient(0, ty + 14, 0, fy); gr.addColorStop(0, 'rgba(' + tc + ',0.26)'); gr.addColorStop(1, 'rgba(' + tc + ',0.03)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(lx - 4, ty + 14); ctx.lineTo(lx + 4, ty + 14); ctx.lineTo(lx + 24 + sw, fy); ctx.lineTo(lx - 24 + sw, fy); ctx.fill();
        ctx.fillStyle = 'rgba(' + tc + ',0.16)'; ctx.beginPath(); ctx.ellipse(lx + sw, fy - 1, 26, 4, 0, 0, 7); ctx.fill();   // the pool on the deck
      }
      ctx.restore();
    },
    tile(ctx, k, X, Y, tx, ty) {
      const I = DD.IMG, ok = DD.ready, above = DD.kindAt(tx, ty - 1), lip = above === null || above === undefined;
      if ((k === 'deck' || k === 'riser') && ok('w4_riser')) {
        if (k === 'deck' && ty >= 22) {   // the stage front: black skirt, a gold edge strip, footlights
          ctx.fillStyle = '#12060a'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#1c0a10'; ctx.fillRect(X + 1, Y, 14, 16);
          if (ty === 22) { DD.art.trim(X, Y, 16, '#c9a050'); if (tx % 4 === 1) { ctx.fillStyle = '#fff0c0'; ctx.fillRect(X + 6, Y + 5, 4, 3); ctx.fillStyle = 'rgba(255,214,140,0.25)'; ctx.fillRect(X + 3, Y + 3, 10, 8); DD.art.glow(X + 8, Y + 6, 30, '#ffc880', 0.2 + 0.04 * Math.sin(DD.G.frame / 8 + tx)); } DD.art.planks(X, Y + 4, 16, 12, '#1c0a10', 8, true); }
          if (ty === 23) { ctx.fillStyle = '#05020a'; ctx.fillRect(X, Y + 8, 16, 8); }
          return true;
        }
        ctx.drawImage(I.w4_riser, (tx * 16) % 32, lip ? 0 : 16, 16, 16, X, Y, 16, 16);
        if (!lip) { ctx.fillStyle = 'rgba(8,2,6,0.35)'; ctx.fillRect(X, Y, 16, 16); }
        { const A = DD.art, kd = DD.kindAt; if (lip) { A.R(X, Y, 16, 1, 'rgba(255,214,170,0.55)'); A.R(X, Y + 1, 16, 1, 'rgba(255,170,120,0.18)'); if (tx % 6 === 2) A.R(X + 5, Y + 2, 6, 1, '#e8e0c0'); if (tx % 6 === 2) A.R(X + 7, Y + 3, 2, 1, '#e8e0c0'); if (tx % 6 === 5) A.R(X + 4, Y + 2, 1, 1, '#c8302c'); }   // gaff-tape marks on the deck
          if (!kd(tx - 1, ty)) A.R(X, Y, 1, 16, 'rgba(255,200,160,0.2)'); if (!kd(tx + 1, ty)) A.R(X + 15, Y, 1, 16, 'rgba(6,0,6,0.5)'); if (!kd(tx, ty + 1)) A.R(X, Y + 14, 16, 2, 'rgba(6,0,6,0.5)'); }
        return true;
      }
      return false;
    },
  },
  script: {
    init(G) { G.s.intro = 0; G.s.beam = 0; G.s.cheer = 0; G.s.said = false; },
    update(G) {
      if (G.boss && G.boss.engaged) G.s.intro++;
      if (G.s.cheer > 0) G.s.cheer--;
    },
    drawFG(ctx, G) {   // the dark house in front of the stage: heads, raised hands, haze, and Gregg in the front row
      const VW = DD.VW, VH = DD.VH, c = G.cam, f = G.frame, I = DD.IMG, ok = DD.ready, B = DD.boss, S = G.s;
      const fy = Math.round(DD.wy(21 * 16)), top = Math.min(VH - 24, fy + 34);
      ctx.fillStyle = '#06020a'; ctx.fillRect(0, top, VW, VH - top);
      const hit = (B && B.flash > 0) || f - (G.flashAt ?? -999) < 30 ? 1 : 0, up = S.cheer > 0 ? 1 : 0, wince = G.pl && G.pl.inv > 0 ? 1 : 0, ph2 = B && B.phase > 0 ? 1 : 0;   // the house reacts: hands up when he is hit, heads dip when you are hurt
      for (let i = -2; i < 26; i++) {   // silhouettes: a head and, sometimes, a pair of horns held up
        const wxp = i * 15 + hash(i, 3) * 6, X = Math.round(wxp - ((c.x * 1.2) % 15)), r = hash(i + Math.floor(c.x * 1.2 / 15), 5), Y = top + 8 + Math.round(r * 5) + (wince ? 2 : 0);
        const sway = Math.round(Math.sin(f / 18 + i) * 1.5) + (wince ? (i & 1 ? 1 : -1) : 0);
        ctx.fillStyle = '#0a0410'; ctx.beginPath(); ctx.ellipse(X + sway, Y, 6, 7, 0, 0, 7); ctx.fill(); ctx.fillRect(X - 7 + sway, Y + 4, 14, 20);
        ctx.fillStyle = '#1a0a18'; ctx.fillRect(X - 4 + sway, Y - 6, 5, 1);
        if (r > 0.86 && !up && !hit && ph2 && !wince) { const fl = 1 + ((f >> 3) + i & 1); ctx.fillStyle = '#ffd060'; ctx.fillRect(X + 6 + sway, Y - 17 - fl, 2, 2 + fl); ctx.fillStyle = '#fff4c0'; ctx.fillRect(X + 6 + sway, Y - 16, 2, 1); ctx.fillStyle = '#0a0410'; ctx.fillRect(X + 5 + sway, Y - 14, 4, 10); DD.art.glow(X + 7 + sway, Y - 17, 14, '#ffc060', 0.2); }   // lighters come up for MUMMY TIM
        if (r > 0.62 || up || (hit && r > 0.3)) { const hy = Y - 12 - Math.round(Math.abs(Math.sin(f / 10 + i)) * (up ? 6 : 2)); ctx.fillStyle = '#0a0410'; ctx.fillRect(X + 5 + sway, hy, 3, 12); ctx.fillRect(X + 4 + sway, hy - 3, 2, 4); ctx.fillRect(X + 8 + sway, hy - 3, 2, 4); }
      }
      // Gregg, front row, with his tub, watching his friend
      const gx = Math.round(40 * 16 - c.x), gy = Math.min(VH - 30, fy + 38);
      if (ok('w4_seat') && ok('w4_gregg_bust') && gx > -40 && gx < VW + 10) {
        ctx.drawImage(I.w4_gregg_bust, gx + (wince ? (f >> 1 & 1) * 2 - 1 : 0), gy - 12 - (up || hit ? Math.round(Math.abs(Math.sin(f / 6)) * 4) : Math.round(Math.max(0, Math.sin(f / 40)) * 1)));
        ctx.drawImage(shade('w4_seat', 0.62) || I.w4_seat, gx + 4, gy + 6);
        if (hit || up) DD.text('!', gx + 14, gy - 22 - (up ? Math.round(Math.abs(Math.sin(f / 6)) * 4) : 0), '#ffe680', 2, '#000');
      }
      DD.art.motes(G, '#ffe0c0', 24, 0.4);
      // haze creeping along the deck, and warm light spilling out of the pit
      ctx.fillStyle = 'rgba(255,200,170,0.06)'; for (let i = 0; i < 6; i++) { const hx = ((i * 71 + f * 0.25) % (VW + 80)) - 40; ctx.beginPath(); ctx.ellipse(hx, fy - 4 - i % 3 * 3, 46, 6, 0, 0, 7); ctx.fill(); }
      const vg = ctx.createRadialGradient(VW / 2, VH * 0.5, VH * 0.35, VW / 2, VH * 0.5, VW * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,0,6,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < VH; y += 2) ctx.fillRect(0, y, VW, 1);   // scanlines
    },
  },
};
})();
