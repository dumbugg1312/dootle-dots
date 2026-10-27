// World 1 boss: POINTY NIGHTMARES, the giant red-handled scissors that guard the ribbon outside Dot City Spaghetti.
// Attacks, each telegraphed first (a crouch, the blades flare, a red "!" and a mark on the floor):
//   LUNGE: a red bar marks the floor to your spot, then it dashes. It snaps shut at the end and sits dizzy: stomp it while it's shut.
//   RIBBON TOSS: three (four in phase 2) red ribbons lob at rings marked on the floor. Move off the ring. Then it rests, shut: stomp.
//   HOP (phase 2 only): it hops and fires two low snips along the floor. Jump the snips, then stomp it when it lands shut.
// Stomps only count while it is shut (little stars circle its head), for about two seconds. Touching it open hurts; shut, it's harmless. A hit flashes it white and knocks it back.
// Defeat: it topples over, the ribbon snaps in two, the crowd cheers and popcorn rains down.
(function () {
  const FLOOR_Y = 21 * 16, CITS = ['yellow', 'purple', 'cyan', 'blue', 'pink', 'lime', 'orange'];
  const hash = n => { n = Math.imul(n | 0, 2654435761) >>> 0; n = (n ^ (n >>> 15)) >>> 0; return n / 4294967296; };
  const I = () => DD.IMG, ok = n => DD.ready(n);
  const SPR = ['w1_scissors_idle', 'w1_scissors_attack', 'w1_scissors_shut', 'w1_scissors_hurt', 'w1_ribbon_shot', 'w1_snip',
    'w1_road', 'w1_awning', 'w1_hills_far', 'w1_hills_near', 'w1_cloud_a', 'w1_cloud_b', 'w1_cloud_c', 'w1_tree_a', 'w1_tree_b', 'w1_tree_c', 'w1_bush_a', 'w1_bush_b',
    'w1_shop_spaghetti', 'w1_shop_flowers', 'w1_shop_post', 'w1_podium', 'w1_chair_row', 'w1_lamp', 'w1_bunting', 'w1_bow', 'w1_bench', 'w1_pots', 'w1_mailbox'].concat(CITS.map(c => 'w1_cit_' + c));
  const CROWD = [];   // the crowd watching from both sides of the stage
  for (let i = 0; i < 16; i++) CROWD.push({ x: (21.4 + i * 1.12 + hash(i) * 0.5) * 16, row: i % 2, c: Math.floor(hash(i + 5) * 7), ph: hash(i + 40) });
  for (let i = 0; i < 16; i++) CROWD.push({ x: (54.4 + i * 0.97 + hash(i + 70) * 0.5) * 16, row: i % 2, c: Math.floor(hash(i + 90) * 7), ph: hash(i + 130) });
  // ---- art pass: the far village, birds and sun shafts; contact shadows, lit lamps, the sign's marquee bulbs, window boxes, balloons at the ribbon posts (decoration only)
  function skyArt(G, H0) {
    const A = DD.art, c = G.cam, VW = DD.VW, f = G.frame, par = 0.08, w = 52, o = -(((c.x * par) % w) + w) % w;
    for (let x = o - w; x < VW + w; x += w) { const idx = Math.round((x - o) / w) + Math.floor(c.x * par / w), hh = 14 + Math.floor(hash(idx + 3) * 16), roof = ['#b8a0d0', '#a0b8e0', '#d0a0b8'][Math.floor(hash(idx) * 3)], yb = H0 - 62;
      A.R(x + 8, yb - hh, 28, hh, '#c8d8ec'); A.R(x + 8, yb - hh, 28, 1, '#e0ecf8'); A.R(x + 35, yb - hh, 1, hh, '#a8b8d4'); A.R(x + 6, yb - hh - 4, 32, 4, roof); A.R(x + 9, yb - hh - 7, 26, 3, A.mix(roof, 0.15));
      A.R(x + 13, yb - hh + 4, 4, 4, '#8ab8e8'); A.R(x + 26, yb - hh + 4, 4, 4, '#8ab8e8'); if (hash(idx + 9) < 0.35) { A.R(x + 38, yb - hh - 14, 4, 14, '#d8c8c0'); A.R(x + 37, yb - hh - 16, 6, 2, '#a89090'); } }
    for (let i = 0; i < 3; i++) { const bx = (((i * 140 + f * 0.25 - c.x * 0.1) % (VW + 60)) + VW + 60) % (VW + 60) - 30, by = 26 + i * 14 + Math.sin(f / 20 + i) * 3, fl = (f >> 3) & 1;
      A.R(bx, by + fl, 2, 1, '#3a3050'); A.R(bx + 2, by + 1 - fl, 2, 1, '#3a3050'); A.R(bx + 4, by + fl, 2, 1, '#3a3050'); }
    A.cone(262, 18, 150, 60, '#fff6c0', 0.10); A.cone(236, 14, 120, 40, '#fff6c0', 0.06);
  }
  function plazaArt(ctx, G, pass) {
    const A = DD.art, f = G.frame, VW = DD.VW, FY = DD.wy(FLOOR_Y), vis = (x, w) => { const X = DD.wx(x); return X + w > -20 && X < VW + 20; };
    const SH = [['w1_shop_flowers', 4 * 16 - 1], ['w1_shop_post', 12 * 16], ['w1_shop_spaghetti', 40 * 16 - 1]], LAMPS = [18, 22, 69];
    if (pass === 0) {
      for (const lx of LAMPS) if (vis(lx * 16, 16)) A.R(DD.wx(lx * 16), FY - 1, 16, 2, 'rgba(30,40,90,0.22)');
      for (const [n, sx] of SH) if (ok(n) && vis(sx, I()[n].width)) A.R(DD.wx(sx) - 1, FY - 4, I()[n].width + 2, 4, 'rgba(30,40,90,0.20)');
      for (const bx of [14 * 16, 42 * 16 + 4, 47 * 16 + 4]) if (vis(bx, 32)) A.R(DD.wx(bx) + 1, FY - 1, 28, 2, 'rgba(30,40,90,0.22)');
      return;
    }
    for (const [n, sx] of SH) if (ok(n) && vis(sx, I()[n].width)) {
      const w = I()[n].width, X = DD.wx(sx);
      for (const bx of [X + 4, X + w - 22]) { A.box(bx, FY - 8, 18, 6, '#3a8a4a', { outline: '#14301c' }); A.R(bx + 1, FY - 8, 16, 1, '#7ae070');
        for (let i = 0; i < 4; i++) { const col = ['#ff5a8a', '#ffd23a', '#ffffff', '#ff8a3a'][(i + sx) & 3]; A.R(bx + 2 + i * 4, FY - 11 - ((i + sx) & 1), 3, 3, col); A.R(bx + 3 + i * 4, FY - 10 - ((i + sx) & 1), 1, 1, '#fff6c0'); } }
    }
    { const X = DD.wx(40 * 16 - 1), Y = DD.wy(FLOOR_Y - 192);   // the Spaghetti sign: chasing bulbs and a warm glow (it is the backdrop of the whole fight)
      if (X > -200 && X < VW + 10) { A.glow(X + 98, Y + 28, 110, '#ffd890', 0.16); A.bulbs(X + 26, Y + 5, 146, 9, f); A.bulbs(X + 26, Y + 47, 146, 9, f + 9); A.bulbs(X + 24, Y + 12, 32, 9, f + 3, '#fffbd0', '#8a5a1c', true); A.bulbs(X + 172, Y + 12, 32, 9, f + 6, '#fffbd0', '#8a5a1c', true); } }
    for (const lx of LAMPS) if (vis(lx * 16, 16)) { const X = DD.wx(lx * 16) + 9, Y = DD.wy(FLOOR_Y - 55); A.glow(X, Y, 26, '#ffe9a0', 0.26 + 0.03 * Math.sin(f / 40 + lx)); A.glow(X, FY - 1, 30, '#ffe9a0', 0.10); }
    for (const [bx, cols] of [[22 * 16, ['#e8302a', '#ffd22a', '#2a6ae8']], [69 * 16, ['#2ab04a', '#ff5aa8', '#8a4ae0']]]) if (vis(bx, 30)) {   // balloons tied to the ribbon posts
      cols.forEach((col, i) => { const X = DD.wx(bx) + (i - 1) * 9 + Math.round(Math.sin(f / 40 + i + bx) * 2), Y = DD.wy(FLOOR_Y - 84 - i * 6) + Math.round(Math.sin(f / 33 + i) * 2);
        A.R(DD.wx(bx), DD.wy(FLOOR_Y - 48), 1, 1, '#ffffff'); ctx.fillStyle = 'rgba(40,30,60,0.6)'; ctx.fillRect(Math.min(X + 3, DD.wx(bx)), Y + 12, 1, DD.wy(FLOOR_Y - 48) - Y - 12);
        A.box(X, Y, 8, 11, col, { outline: A.mix(col, -0.65) }); A.R(X + 1, Y + 2, 2, 3, 'rgba(255,255,255,0.7)'); A.R(X + 3, Y + 11, 3, 2, A.mix(col, -0.5)); });
    }
  }

  function put(n, x, y) { if (!ok(n)) return; const im = I()[n], X = DD.wx(x), Y = DD.wy(y); if (X > DD.VW + 8 || X + im.width < -8) return; DD.ctx.drawImage(im, X, Y); }
  function ribbonY(G, x, t) {   // the ribbon strung between the two posts (x in px): sags in the middle, falls in two halves once cut
    const a = 22 * 16, b = 69 * 16, u = (x - a) / (b - a), cut = G.s.cutT || 0, mid = 0.5;
    const sag = Math.sin(Math.PI * u) * 5, base = FLOOR_Y - 34;
    if (!cut) return base + sag + Math.sin(G.frame / 30 + u * 6) * 0.8;
    const k = Math.min(1, (cut - 30) / 30), dist = u < mid ? (mid - u) * 2 : (u - mid) * 2;   // 0 at the cut, 1 at the posts
    return base + Math.max(0, k) * (1 - dist) * (1 - dist) * 26 + sag * (1 - Math.max(0, k)) * 0.6;
  }

  DD.defineEntity('pointy', {
    boss: true,
    spawn: t => ({ x: t.x, y: FLOOR_Y - 52, w: 40, h: 52, vx: 0, vy: 0, face: -1, st: 'wait', t: 70, seq: 0,
      vul: 0, tgt: 0, pend: [], shots: [], air: 0, n: 0, bob: 0, hurt: 0, kb: 0, dt: 0, tele: 0 }),
    update(e, G) {
      const B = DD.boss, p = G.pl;
      if (!(e.st === 'hop' && e.hopping)) { e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0; }   // stand on the floor
      if (B && B.dead) { e.vul = 0; e.shots.length = 0; e.dt++; return; }
      if (!B || !B.engaged) return;
      const fast = B.phase >= 1;
      e.bob++;
      // ribbons and snips: fly, hurt on touch, vanish on landing or leaving the arena
      for (const s of e.shots) {
        if (s.dead) continue;
        s.life--; s.vy += s.g; s.x += s.vx; s.y += s.vy; s.f++;
        if (s.y + s.h >= FLOOR_Y || s.life <= 0 || s.x < B.arena[0] - 48 || s.x > B.arena[1] + 48) { if (s.kind === 'ribbon') DD.dust(s.x + 4, FLOOR_Y - 1, 4, 5, '#ef3a3a'); else DD.dust(s.x + 10, FLOOR_Y - 1, 3, 4, '#c8c8d0'); s.dead = true; continue; }
        if (DD.ov(p, s)) { DD.hurt(s.x + s.w / 2); s.dead = true; }
      }
      e.shots = e.shots.filter(s => !s.dead);
      if (e.hurt > 0) {   // reeling from a stomp: knocked back, not attacking
        e.hurt--; DD.moveX(e, e.kb * (e.hurt > 14 ? 2.6 : 0.9), false);
        if (e.x < B.arena[0]) e.x = B.arena[0]; if (e.x + e.w > B.arena[1]) e.x = B.arena[1] - e.w;
        return;
      }
      if (e.vul > 0) e.vul--;
      const cxE = DD.cx(e);
      switch (e.st) {
        case 'wait':   // idle: blades open, bob a little; pick the next attack from a fixed order
          if (--e.t > 0) break;
          const seq = fast ? ['lunge', 'hop', 'toss', 'lunge', 'hop', 'toss'] : ['lunge', 'toss', 'lunge', 'toss'];
          e.st = seq[e.seq++ % seq.length];
          e.face = DD.cx(p) < cxE ? -1 : 1; e.tgt = DD.cx(p);
          e.t = fast ? 34 : 40;              // telegraph length: the warning before the lunge or the first ribbon
          e.tele = e.t; e.n = fast ? 4 : 3;
          DD.SFX.buzz && DD.SFX.buzz();
          if (e.st === 'toss') e.pend = [{ x: DD.cx(p), t: e.t }];
          break;
        case 'lunge':   // telegraph: crouch, flare and a red bar on the floor toward where you stood
          e.face = e.tgt < cxE ? -1 : 1;
          if (--e.t > 0) break;
          e.st = 'dash'; e.vx = e.face * (fast ? 4.2 : 3.2); DD.SFX.skid && DD.SFX.skid();
          break;
        case 'dash':   // the lunge: stop at the target or a wall, then snap shut
          e.vx = e.face * (fast ? 4.2 : 3.2);
          if (G.frame % 4 === 0) DD.dust(cxE - e.face * 14, FLOOR_Y - 1, 2, 4, '#c8c8d0');
          if (DD.moveX(e, e.vx, false) || (e.face < 0 ? cxE <= e.tgt : cxE >= e.tgt) || e.x <= B.arena[0] || e.x + e.w >= B.arena[1]) {
            e.vx = 0; e.st = 'rest'; e.t = fast ? 100 : 130; e.vul = e.t; DD.SFX.thud && DD.SFX.thud(); DD.dust(cxE, FLOOR_Y - 1, 6, 8, '#c8c8d0'); G.shake = Math.max(G.shake || 0, 4);
          }
          break;
        case 'toss':   // ribbons: each one telegraphed by a ring at the spot you stood on
          if (e.pend.length) {
            const r = e.pend[0];
            if (--r.t <= 0) {
              const T = 54, g = 0.25, x0 = cxE - 6, y0 = e.y + 8;
              e.shots.push({ kind: 'ribbon', x: x0, y: y0, w: 9, h: 6, vx: (r.x - x0) / T, vy: -0.5 * g * T, g, life: T + 6, f: 0 });
              e.pend.shift(); e.n--; DD.SFX.boing && DD.SFX.boing();
              if (e.n > 0) e.pend.push({ x: DD.cx(p), t: 40 });
            }
          }
          if (e.n <= 0 && e.pend.length === 0) { e.st = 'settle'; e.t = 70; }   // wait for the last ribbon to land before the opening
          break;
        case 'hop':   // a telegraphed hop toward you, then two snips low along the floor
          if (!e.hopping) { if (--e.t > 0) break; e.hopping = true; e.vy = -6.6; e.air = 0; e.face = DD.cx(p) < cxE ? -1 : 1; DD.SFX.jump && DD.SFX.jump(); }
          e.air++; e.vy = Math.min(e.vy + 0.4, 6); DD.moveX(e, e.face * 1.3, false);
          if (DD.moveY(e, e.vy, false) && e.air > 4) {
            e.vy = 0; e.hopping = false;
            const y = FLOOR_Y - 9, c2 = DD.cx(e);
            e.shots.push({ kind: 'snip', x: c2 - 10, y, w: 20, h: 6, vx: -2.4, vy: 0, g: 0, life: 56, f: 0 });
            e.shots.push({ kind: 'snip', x: c2 - 10, y, w: 20, h: 6, vx: 2.4, vy: 0, g: 0, life: 56, f: 0 });
            e.st = 'settle'; e.t = 70; G.shake = Math.max(G.shake || 0, 5); DD.dust(c2, FLOOR_Y - 1, 8, 10, '#c8c8d0');   // the snips clear out before the opening starts
          }
          break;
        case 'settle':   // shut but not yet open: the ribbons or snips from the last attack finish first, so no attack overlaps the opening (touching it is harmless)
          if (--e.t <= 0 || !e.shots.length) { e.st = 'rest'; e.t = fast ? 100 : 120; e.vul = e.t; }
          break;
        case 'rest':   // the opening: shut and dizzy until the timer runs out
          if (--e.t <= 0) { e.st = 'wait'; e.t = fast ? 40 : 50; e.vul = 0; }
          break;
      }
      if (e.st !== 'toss' && e.st !== 'hop' && e.st !== 'dash' && e.st !== 'lunge') e.pend.length = 0;
    },
    touch(e, G, p) { if (e.vul <= 0 && e.hurt <= 0 && e.st !== 'settle') DD.hurt(DD.cx(e)); },   // shut and dizzy, it's harmless: bump it all you like on the way up
    stomp(e, G, p) {   // only while shut (the window after a lunge or a toss); otherwise it refuses and touch hurts you
      if (e.vul <= 0 || e.hurt > 0) return false;
      e.vul = 0; e.st = 'wait'; e.t = 60; e.pend = []; e.shots.length = 0; e.hurt = 30; e.kb = DD.cx(p) < DD.cx(e) ? 1 : -1;
      DD.float(DD.cx(e), e.y - 6, 'SNIP!', '#ffffff'); DD.stars(DD.cx(e), e.y + 4, 10, '#ffffff');
      DD.hitBoss(1);
      return true;
    },
    draw(e, ctx, G) {
      const B = DD.boss, dead = B && B.dead, fast = B && B.phase >= 1;
      const X = Math.round(DD.wx(DD.cx(e))), floorY = DD.wy(FLOOR_Y);
      let Y = DD.wy(e.y + e.h) + 3, name = 'w1_scissors_idle', sx = 1, sy = 1, rot = 0, al = 1, ox = 0;
      const tele = (e.st === 'lunge' || (e.st === 'hop' && !e.hopping) || (e.st === 'toss' && e.pend.length)) && !dead && e.hurt <= 0;
      if (!dead && e.st === 'wait' && e.hurt <= 0) Y += Math.round(Math.sin(e.bob / 12));
      // a shadow on the road
      ctx.fillStyle = 'rgba(20,10,50,0.28)'; ctx.beginPath(); ctx.ellipse(X, floorY - 1, e.hopping ? 14 : 22, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (fast && !dead) { const gl = ctx.createRadialGradient(X, Y - 28, 4, X, Y - 28, 46); gl.addColorStop(0, 'rgba(255,60,60,0.28)'); gl.addColorStop(1, 'rgba(255,60,60,0)'); ctx.fillStyle = gl; ctx.fillRect(X - 50, Y - 80, 100, 100); }
      // telegraphs first, under the boss
      if (e.st === 'lunge' && e.t > 0) {
        const TX = DD.wx(e.tgt), a = 0.35 + 0.35 * ((e.t >> 2) & 1);
        ctx.fillStyle = 'rgba(239,58,58,' + a + ')'; ctx.fillRect(Math.min(X, TX), floorY - 3, Math.abs(TX - X), 3);
        for (let k = 0; k < 3; k++) { const ax = TX + (TX > X ? -1 : 1) * (4 + k * 6), dr = TX > X ? -1 : 1; ctx.fillRect(ax, floorY - 8 + k, 2, 1); ctx.fillRect(ax + dr * 2, floorY - 7 + k, 2, 1); }
      }
      if (tele) { DD.text('!', X, Y - 70 + Math.round(Math.sin(G.frame / 3) * 1.5), '#ff5a5a', 2, INK, 'center'); }
      for (const r of e.pend) {   // ribbon rings: where a ribbon will land
        const RX = DD.wx(r.x), RY = floorY;
        ctx.strokeStyle = (r.t >> 2) & 1 ? '#ff5a5a' : '#ffe6e6'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(RX, RY - 1, 10, 3, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(RX, RY - 1, 5 + (r.t % 20) / 4, 1.5 + (r.t % 20) / 12, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // shots
      for (const s of e.shots) {
        const SX = DD.wx(s.x), SY = DD.wy(s.y), f = (s.f >> 2) & 1;
        if (s.kind === 'ribbon' && ok('w1_ribbon_shot')) ctx.drawImage(I().w1_ribbon_shot, f * 14, 0, 14, 10, SX - 2, SY - 2, 14, 10);
        else if (ok('w1_snip')) { ctx.save(); ctx.translate(SX + 10, SY + 3); if (s.vx < 0) ctx.scale(-1, 1); ctx.drawImage(I().w1_snip, f * 22, 0, 22, 12, -11, -6, 22, 12); ctx.restore(); }
      }
      // pick the frame
      if (dead) {
        const k = Math.min(1, e.dt / 34); name = 'w1_scissors_shut'; rot = (e.face || 1) * -1.5 * (1 - Math.pow(1 - k, 2)) + (k >= 1 ? Math.sin(e.dt / 4) * 0.02 * Math.max(0, 1 - (e.dt - 34) / 20) : 0);
        al = e.dt > 80 ? Math.max(0, 1 - (e.dt - 80) / 40) : 1; if (e.dt > 80 && (e.dt >> 2) & 1) al *= 0.5;
      } else if (e.hurt > 0) {
        name = e.hurt > 18 && ((e.hurt >> 1) & 1) ? 'w1_scissors_hurt' : (e.hurt > 18 ? 'w1_scissors_hurt' : 'w1_scissors_shut'); ox = Math.round(Math.sin(e.hurt * 2) * 1);
      } else if (e.vul > 0 || e.st === 'rest' || e.st === 'settle') {
        name = e.vul > 0 && e.vul < 20 && ((e.vul >> 2) & 1) ? 'w1_scissors_idle' : 'w1_scissors_shut';
        if (e.vul > 0) { sy = 1 + Math.sin(G.frame / 6) * 0.01; }
      } else if (e.st === 'dash') { name = 'w1_scissors_attack'; sx = 1.1; sy = 0.92; }
      else if (e.hopping) { name = 'w1_scissors_attack'; sx = 0.92; sy = 1.1; }
      else if (tele) { name = 'w1_scissors_attack'; sy = 0.93 + Math.sin(G.frame / 2) * 0.02; ox = (G.frame >> 1) % 2 ? 1 : -1; }
      DD.spr(name, X + ox, Y, false, sx, sy, rot, al);
      // dizzy stars circle the head while it can be stomped
      if (e.vul > 0 && !dead) for (let k = 0; k < 3; k++) {
        const a = G.frame / 9 + k * 2.1, SX = X + Math.cos(a) * 14, SY = Y - 48 + Math.sin(a) * 4;
        ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(SX) - 1, Math.round(SY) - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(SX), Math.round(SY) - 2, 1, 5); ctx.fillRect(Math.round(SX) - 2, Math.round(SY), 5, 1);
      }
    },
  });
  const INK = '#1c1424';

  window.LEVEL = {
    id: '1-boss', name: 'POINTY NIGHTMARES', sub: 'THE GIANT SCISSORS', world: 1,
    W: 72, H: 24, FLOOR: 21,
    SOLID: [['road', 0, 21, 72, 3], ['awning', 5, 17, 5, 1], ['awning', 62, 17, 5, 1]],
    KINDS: { road: 1, awning: 2 },
    THINGS: [['dot', 2, 20], ['pointy', 54, 19]],
    POPCORN: [[5, 16, 5], [8, 20, 6], [30, 20, 5], [41, 20, 4], [63, 16, 5], [66, 20, 4],
      [24, 20, 4], [48, 20, 3], [58, 20, 3]].concat(
      [[11, 18], [12, 17], [13, 17], [14, 17], [15, 18], [16, 19]].map(a => [a[0], a[1], 1]),
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [31 + i, 18 - Math.round(3 * 4 * (i / 8) * (1 - i / 8)), 1]),
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [52 + i, 19 - Math.round(3 * 4 * (i / 8) * (1 - i / 8)), 1]),
      [0, 1, 2, 3, 4, 5].map(i => [19 + i, 19 - Math.round(2 * 4 * (i / 5) * (1 - i / 5)), 1])),
    sprites: SPR,
    portraits: { mayor: 'w1_portrait_mayor' },
    names: { mayor: 'MAYOR RON' },
    lines: {   // design/VOICE.md: intro (2), phase (1), defeat (2). Sources: Dootle Dots Ep 1 (the Mayor's fear, the ribbon cutting), the S1-S4 host registers
      boss: [['mayor', "I CAN'T HOLD THOSE POINTY NIGHTMARES."], ['gregg', 'STOMP IT WHEN IT SNAPS SHUT.']],
      bossPhase: [['gregg', 'ALL RIGHT, WELL, IT GOT FASTER.']],
      bossDefeat: [['mayor', "I'D LIKE TO THANK SAM FOR HELPING ME FACE MY FEARS."], ['gregg', 'THE RESTAURANT IS OFFICIALLY OPEN.']],
    },
    boss: {
      name: 'POINTY NIGHTMARES', sub: 'THE MAYOR\'S FEAR', hp: 6, arena: [20, 70], inv: 40,
      phases: [{ at: 3, say: 'FASTER', sub: '', enter(G, B) { G.shake = 12; DD.SFX.buzz && DD.SFX.buzz(); G.s.cheer = 60; } }],
      onDefeat(G) {
        G.s.cutT = 1; G.s.cheer = 99999; G.shake = 10;
        DD.banner('RIBBON CUT', 120, "IT'S SPAGHETTI TIME");
      },
      endDelay: 170,
    },
    theme: {
      tiles: { road: ['#7a7c92', '#e4e6f2', '#3e4058'], awning: ['#3ca752', '#fff6e0', '#1e5a2e'] },
      bg(ctx, G, DD) {   // the cartoon's sky and hills
        const c = G.cam, VW = DD.VW, VH = DD.VH, H0 = FLOOR_Y - c.y;
        const g = ctx.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, '#3fb4ee'); g.addColorStop(0.55, '#8fd6f6'); g.addColorStop(1, '#cdeefb');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        const sun = ctx.createRadialGradient(262, 18, 2, 262, 18, 90); sun.addColorStop(0, 'rgba(255,252,210,0.85)'); sun.addColorStop(0.25, 'rgba(255,250,200,0.35)'); sun.addColorStop(1, 'rgba(255,250,200,0)');
        ctx.fillStyle = sun; ctx.fillRect(170, 0, 150, 120);
        for (let i = 0; i < 6; i++) {
          const n = ['w1_cloud_a', 'w1_cloud_b', 'w1_cloud_c'][i % 3]; if (!ok(n)) continue;
          const span = VW + 140, x = (((i * 131 + G.frame * (0.03 + (i % 3) * 0.012) - c.x * (0.05 + (i % 3) * 0.03)) % span) + span) % span - 70;
          ctx.drawImage(I()[n], Math.round(x), Math.round(6 + (i * 19) % 40 + (H0 - 132) * 0.4));
        }
        skyArt(G, H0);
        const tileX = (im, par, y) => { const w = im.width, off = -(((c.x * par) % w) + w) % w; for (let x = off; x < VW; x += w) ctx.drawImage(im, Math.round(x), Math.round(y)); };
        if (ok('w1_hills_far')) {
          tileX(I().w1_hills_far, 0.14, H0 - 112); ctx.fillStyle = '#6cc460'; ctx.fillRect(0, H0 - 32, VW, VH);
          for (let i = -1; i < 7; i++) {
            const w = 190, q = Math.floor(c.x * 0.22 / w), px = i * w - ((c.x * 0.22) % w) + hash(i + q + 7) * 60, n = 'w1_tree_' + 'cbc'[((i + q) % 3 + 3) % 3];
            if (ok(n)) ctx.drawImage(I()[n], Math.round(px), Math.round(H0 - 70));
          }
        }
        if (ok('w1_hills_near')) { tileX(I().w1_hills_near, 0.34, H0 - 58); ctx.fillStyle = '#34984a'; ctx.fillRect(0, H0 + 2, VW, VH); }
      },
      tile(ctx, k, X, Y, tx, ty) {
        const im = I(), lip = DD.kindAt(tx, ty - 1) !== k, sx = (tx & 1) * 16;
        if (k === 'road' && ok('w1_road')) {
          ctx.drawImage(im.w1_road, sx, lip ? 0 : 16, 16, 16, X, Y, 16, 16);
          { const A = DD.art; if (lip) { A.R(X, Y, 16, 1, '#f6f8ff'); A.R(X, Y + 3, 16, 1, 'rgba(40,44,90,0.18)'); if (!(tx & 1)) { A.R(X, Y + 4, 1, 12, 'rgba(30,34,80,0.22)'); A.R(X + 1, Y + 4, 1, 12, 'rgba(255,255,255,0.14)'); } } else { const o = (ty & 1) ? 8 : 0; A.R(X, Y, 16, 1, 'rgba(255,255,255,0.13)'); A.R(X, Y + 15, 16, 1, 'rgba(10,10,40,0.30)'); A.R(X + o, Y + 1, 1, 14, 'rgba(10,10,40,0.28)'); A.R(X + o + 1, Y + 1, 1, 14, 'rgba(255,255,255,0.10)'); } }
          if (ty >= 23) { ctx.fillStyle = 'rgba(12,10,30,0.3)'; ctx.fillRect(X, Y, 16, 16); }
          return true;
        }
        if (k === 'awning' && ok('w1_awning')) { ctx.drawImage(im.w1_awning, sx, 0, 16, 16, X, Y, 16, 16); return true; }
        return false;
      },
    },
    script: {
      init(G) { G.s = { cheer: 0, cutT: 0, lastHp: 6 }; },
      update(G) {
        const B = DD.boss;
        if (G.s.cheer > 0 && G.s.cheer < 99999) G.s.cheer--;
        if (!G.s.warned && G.pl.x > 4 * 16 && typeof DD.lines === 'function') { G.s.warned = true; DD.lines('boss'); }   // said on the walk in, so the box is gone before the fight
        if (B && B.hp < G.s.lastHp) { G.s.lastHp = B.hp; if (!B.dead) G.s.cheer = Math.max(G.s.cheer, 45); }
        if (G.s.cutT > 0) {
          G.s.cutT++;
          const t = G.s.cutT, mx = 45.5 * 16;
          if (t === 30) { DD.SFX.goal && DD.SFX.goal(); DD.stars(mx, FLOOR_Y - 34, 18, '#ff5a5a'); G.shake = 6; }
          if (t >= 30 && t < 110 && t % 4 === 0) {   // confetti and a little popcorn rain
            const cols = ['#ff5a5a', '#ffe14a', '#3ad6a0', '#4aa8ff', '#c06aff', '#ff9ad0'];
            for (let k = 0; k < 3; k++) DD.part({ x: (24 + hash(t * 3 + k) * 44) * 16, y: 30 + hash(t + k * 9) * 60, vx: (hash(t + k) - 0.5) * 0.8, vy: 0.4 + hash(t * 7 + k) * 0.6, life: 90, max: 90, r: 2, col: cols[(t + k) % 6], g: 0.01 });
          }
          if (t === 40 || t === 62) for (let k = 0; k < 6; k++) DD.drop({ x: mx + (k - 2.5) * 22, y: FLOOR_Y - 120, vx: (k - 2.5) * 0.35, vy: -1, life: 400, wait: 6 + k * 3 });
        }
      },
      drawBG(ctx, G) {
        const B = DD.boss;
        // the entry street, then the Dot City Spaghetti plaza (the shop is the backdrop of the whole fight)
        plazaArt(ctx, G, 0);
        if (ok('w1_shop_flowers')) put('w1_shop_flowers', 4 * 16 - 1, FLOOR_Y - I().w1_shop_flowers.height + 2);
        if (ok('w1_shop_post')) put('w1_shop_post', 12 * 16 + 0, FLOOR_Y - I().w1_shop_post.height + 2);
        if (ok('w1_shop_spaghetti')) put('w1_shop_spaghetti', 40 * 16 - 1, FLOOR_Y - I().w1_shop_spaghetti.height + 2);
        put('w1_bow', 40 * 16 + 4, FLOOR_Y - 192 + 2 + 120);
        for (const [x, k] of [[19, 'a'], [37, 'b'], [55, 'a'], [60, 'c'], [69.5, 'b']]) { const n = 'w1_bush_' + (k === 'b' ? 'b' : 'a'); if (k !== 'c') put(n, x * 16, FLOOR_Y - (k === 'b' ? 15 : 20) + 1); }
        for (const x of [18, 22, 69]) put('w1_lamp', x * 16 + 2, FLOOR_Y - 62 + 1);
        put('w1_bench', 14 * 16, FLOOR_Y - 15);
        // the stage: a podium and a row of folding chairs
        put('w1_chair_row', 42 * 16 + 4, FLOOR_Y - 25); put('w1_chair_row', 47 * 16 + 4, FLOOR_Y - 25);
        if (ok('w1_podium')) put('w1_podium', 45.1 * 16, FLOOR_Y - 35);
        plazaArt(ctx, G, 1);
        // bunting along the top of the arena, and the crowd
        if (ok('w1_bunting')) for (let x = 20 * 16; x < 71 * 16; x += 32) { const X = DD.wx(x); if (X > -32 && X < DD.VW) ctx.drawImage(I().w1_bunting, X, DD.wy(8 * 16)); }
        for (const x of [21, 70]) { const X = DD.wx(x * 16); ctx.fillStyle = '#6a4a30'; ctx.fillRect(X - 1, DD.wy(8 * 16 - 4), 3, FLOOR_Y - 8 * 16 + 4); ctx.fillStyle = '#a8784a'; ctx.fillRect(X - 1, DD.wy(8 * 16 - 4), 1, FLOOR_Y - 8 * 16 + 4); ctx.fillStyle = '#ffd23a'; ctx.fillRect(X - 2, DD.wy(8 * 16 - 7), 5, 3); }
        for (const o of CROWD) {
          const n = 'w1_cit_' + CITS[o.c]; if (!ok(n)) continue; const X = DD.wx(o.x) - 8; if (X < -16 || X > DD.VW) continue;
          const party = G.s.cheer > 0; let f = (Math.floor(G.frame / 22 + o.ph * 9) & 1), hop = 0;
          if (party) { f = 2; hop = Math.abs(Math.sin(G.frame / 5 + o.ph * 20)) * (G.s.cheer > 9000 ? 4 : 2.5); }
          else if (B && B.engaged && ((G.frame >> 3) + (o.ph * 10 | 0)) % 9 === 0) f = 1;   // nervous shuffling
          ctx.drawImage(I()[n], f * 16, 0, 16, 24, X, Math.round(DD.wy(FLOOR_Y - 1 - o.row * 5) - 23 - hop), 16, 24);
        }
        // the red ribbon between the posts: it sags, flutters, and drops in two pieces after the snip
        const ax = 22 * 16, bx = 69 * 16;
        for (let x = ax; x <= bx; x += 2) {
          const X = DD.wx(x); if (X < -4 || X > DD.VW + 2) continue; const y = DD.wy(ribbonY(G, x));
          const cutGap = G.s.cutT > 30 && Math.abs(x - 45.5 * 16) < 3; if (cutGap) continue;
          ctx.fillStyle = '#8a1428'; ctx.fillRect(X, Math.round(y) + 4, 2, 1);
          ctx.fillStyle = '#ef3a3a'; ctx.fillRect(X, Math.round(y), 2, 4); ctx.fillStyle = '#ff7a6a'; ctx.fillRect(X, Math.round(y), 2, 1);
        }
        for (const x of [ax, bx]) {   // the white posts with gold caps
          const X = DD.wx(x); ctx.fillStyle = '#e8dcc2'; ctx.fillRect(X - 2, DD.wy(FLOOR_Y - 46), 4, 46); ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 2, DD.wy(FLOOR_Y - 46), 1, 46);
          ctx.fillStyle = '#bcae92'; ctx.fillRect(X + 1, DD.wy(FLOOR_Y - 46), 1, 46); ctx.fillStyle = '#ffd23a'; ctx.fillRect(X - 3, DD.wy(FLOOR_Y - 48), 6, 3);
        }
      },
      drawFG(ctx, G) {
        const VW = DD.VW, VH = DD.VH;
        for (let i = 0; i < 10; i++) {   // petals on the breeze
          const x = ((i * 53 + G.frame * (0.35 + hash(i) * 0.3) - G.cam.x * 0.4) % (VW + 20) + VW + 20) % (VW + 20) - 10;
          const y = ((i * 29 + G.frame * (0.22 + hash(i + 3) * 0.2)) % (VH + 10)) - 5 + Math.sin(G.frame / 30 + i) * 5;
          ctx.fillStyle = i % 3 ? '#ffe0ec' : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 1); ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1);
        }
        const v = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.45, VW / 2, VH * 0.55, VW * 0.72);
        v.addColorStop(0, 'rgba(20,40,90,0)'); v.addColorStop(1, 'rgba(20,40,90,0.30)'); ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
      },
    },
  };
})();
