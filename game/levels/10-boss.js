// World 10 boss: THE RAT KING (in the walls of Movie House). Hand-written: arena, boss entity, rats, bag bombs, set.
// He is 48 x 56 px (3.5 tiles tall; the stomp box covers his head and shoulders, 46 px, so a normal jump clears him), a fat grey rat in a gold crown and an ermine-collared cape, popcorn-bag scepter in paw.
// Attacks (each telegraphed by the attack pose, a red flash, a squeal, and for rats a glowing mouse hole):
//   1. SCURRY: rats pour out of the nearest mouse holes and run across the floor. Jump them.
//   2. BAG DROP: striped popcorn bags fall from the rafters, each with a shadow that grows on the floor. Walk clear.
//   3. BURROW: he sinks into the floor, tunnelling toward you with a dust trail, then erupts and lands with a shockwave both ways.
// Between attacks he scuttles at you. Stomp him whenever he is walking or stunned (dizzy stars). Phase 2 (at 3 pips, "the orange crown"):
// he is faster, runs four rats, drops six bags, and the shockwave runs longer.
{
  const TS = 16, FL = 21 * TS;
  const im = n => DD.ready(n) ? DD.IMG[n] : null;
  const put = (ctx, n, x, y) => { const i = im(n); if (i) ctx.drawImage(i, Math.round(x), Math.round(y)); };
  const glow = (ctx, x, y, r, rgb, a) => { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const HOLES = [5, 13, 21, 29, 37];   // mouse holes along the base of the wall (tile x)

  DD.defineEntity('rk_rat', {   // a rat from a mouse hole: runs along the floor, hurts on touch, a jump clears it
    update(e) { e.an = (e.an || 0) + 1; DD.moveX(e, e.vx, false); const ok = DD.moveY(e, (e.vy = Math.min((e.vy || 0) + 0.4, 6)), false); if (ok) e.vy = 0; if (--e.life <= 0) e.dead = true; },
    draw(e, ctx) { DD.spr(Math.floor(e.an / 6) % 2 ? 'w10_rat_a' : 'w10_rat_b', DD.wx(e.x + e.w / 2), DD.wy(e.y + e.h), e.vx < 0); },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); e.dead = true; },
  });
  DD.defineEntity('rk_bag', {   // a popcorn bag bomb: falls from the rafters, bursts on the floor, hurts on touch
    update(e) { e.vy += 0.28; e.rot = (e.rot || 0) + e.spin; if (DD.moveY(e, e.vy, false)) { e.dead = true; DD.dust(DD.cx(e), e.y + e.h, 8, 12, '#f4ecdc'); DD.burst && DD.burst(DD.cx(e), e.y + e.h - 4, 3); for (let i = 0; i < 4; i++) DD.part({ x: DD.cx(e), y: e.y + e.h - 4, vx: (Math.random() - 0.5) * 3, vy: -1.5 - Math.random() * 2, life: 40, max: 40, r: 2, col: '#fff2a6', g: 0.2 }); } },
    draw(e, ctx) {
      const near = Math.max(0, Math.min(1, 1 - (FL - (e.y + e.h)) / 150)), X = DD.wx(DD.cx(e)), SY = DD.wy(FL);
      ctx.fillStyle = `rgba(0,0,0,${0.18 + 0.4 * near})`; ctx.beginPath(); ctx.ellipse(X, SY - 1, 4 + 7 * near, 1.5 + 1.5 * near, 0, 0, 7); ctx.fill();   // the shadow grows as it falls
      DD.spr('w10_bag', X, DD.wy(e.y + e.h), false, 1.3, 1.3, e.rot);
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); e.dead = true; },
  });
  DD.defineEntity('rk_shock', {   // the floor shockwave from the burrow landing: a rolling ridge of floor, runs both ways, a jump clears it
    update(e) { DD.moveX(e, e.vx, false); if (e.life % 3 === 0) DD.dust(DD.cx(e), e.y + e.h, 1, 3, '#a07850'); if (--e.life <= 0) e.dead = true; },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y), d = e.vx > 0 ? 1 : -1;
      ctx.fillStyle = '#24140c'; ctx.beginPath(); ctx.moveTo(X - 2, Y + e.h); ctx.lineTo(X + e.w / 2 + d * 3, Y - 2); ctx.lineTo(X + e.w + 2, Y + e.h); ctx.fill();
      ctx.fillStyle = '#8a5c3c'; ctx.beginPath(); ctx.moveTo(X, Y + e.h); ctx.lineTo(X + e.w / 2 + d * 3, Y); ctx.lineTo(X + e.w, Y + e.h); ctx.fill();
      ctx.fillStyle = '#d4a468'; ctx.fillRect(X + e.w / 2 + d * 3 - 1, Y, 2, 2);
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); },
  });

  DD.defineEntity('ratking_boss', {
    spawn: t => ({ x: t.x, y: FL - 46, w: 34, h: 46, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0, n: 0, atk: null, hidden: false, an: 0 }),
    update(e, G) {
      const B = DD.boss; if (!B || !B.engaged || B.dead) { if (B && B.dead) e.an++; return; }
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      e.t++; e.an++;
      if (e.st === 'walk') {                       // scuttle at the Dot, then pick the next attack
        e.dir = P < me ? -1 : 1; e.vx = e.dir * (0.5 + ph * 0.25);
        DD.moveX(e, e.vx, false);
        if (e.t > 100) { e.st = 'wind'; e.t = 0; e.atk = ph >= 1 ? ['zap', 'scurry', 'bags', 'burrow'][(e.m = (e.m || 0) + 1) - 1 & 3] : ['scurry', 'bags', 'burrow'][e.n++ % 3]; e.dir = P < me ? -1 : 1; DD.SFX.wind && DD.SFX.wind(); }   // phase 2 opens with the new wire zap
      } else if (e.st === 'wind') {                // telegraph: rearing up and squealing for 40 frames
        e.vx = 0;
        if (e.t === 1) { DD.float(me, e.y - 4, e.atk === 'scurry' ? 'SKRRK!' : e.atk === 'bags' ? 'INCOMING!' : e.atk === 'zap' ? 'CHEWED WIRE!' : 'UNDER!', '#ff5a4a'); G.s.glowT = 40; G.s.holes = e.atk === 'scurry' ? pickHoles(B, P, ph) : []; }
        if (e.t >= 40) {
          e.t = 0;
          if (e.atk === 'scurry') e.st = 'scurry'; else if (e.atk === 'bags') e.st = 'bags'; else if (e.atk === 'zap') { e.st = 'zap'; zaps(B, P); } else { e.st = 'burrow'; e.hidden = true; DD.dust(me, FL - 2, 10, 14, '#8a6a4a'); DD.SFX.thud(); }
        }
      } else if (e.st === 'scurry') {              // rats out of the glowing holes: three, or four in phase 2
        const holes = G.s.holes || [], count = ph >= 1 ? 4 : 3;
        if (e.t % 22 === 6 && e.t / 22 < count && holes.length) {
          const h = holes[Math.floor(e.t / 22) % holes.length], dir = h.dir;
          DD.addEntity('rk_rat', { x: h.x * TS + 1, y: FL - 9, w: 14, h: 9, vx: dir * (1.7 + ph * 0.4), vy: 0, life: 280 });
          DD.dust(h.x * TS + 8, FL - 4, 4, 5, '#8a6a4a');
        }
        if (e.t > count * 22 + 24) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'bags') {               // bags fall from the rafters near the Dot, each with a growing shadow
        const count = ph >= 1 ? 6 : 4;
        if (e.t % 30 === 10 && e.t / 30 < count) {
          const lo = B.arena[0] + 12, hi = B.arena[1] - 24, x = Math.max(lo, Math.min(hi, P + (Math.random() - 0.5) * 200));
          DD.addEntity('rk_bag', { x, y: G.cam.y - 12, w: 10, h: 12, vx: 0, vy: 0.5, spin: (Math.random() - 0.5) * 0.12 });
        }
        if (e.t > count * 30 + 30) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'zap') {                // phase 2: chewed wires spark on the floor either side of you (marked 45 frames ahead), then he is open
        e.vx = 0; if (e.t > 75) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'burrow') {             // underground: tunnel toward the Dot with a dust trail, then erupt
        e.vx = (P < me ? -1 : 1) * (1.2 + ph * 0.4); e.dir = e.vx < 0 ? -1 : 1;
        DD.moveX(e, e.vx, false);
        if (e.t % 4 === 0) DD.dust(DD.cx(e), FL - 2, 2, 7, '#8a6a4a');
        if (e.t >= 70 || (e.t > 24 && Math.abs(P - DD.cx(e)) < 14)) { e.st = 'rumble'; e.t = 0; e.vx = 0; DD.SFX.thud(); }
      } else if (e.st === 'rumble') {             // the tell: he stops tracking and the floor cracks and shakes for 32 frames, then he erupts right there
        e.vx = 0; if (e.t % 4 === 0) DD.dust(DD.cx(e), FL - 2, 3, 9, '#8a6a4a');
        if (e.t >= 32) { e.hidden = false; e.st = 'erupt'; e.t = 0; e.vy = -6.5 - ph * 0.5; DD.dust(DD.cx(e), FL - 2, 12, 16, '#8a6a4a'); DD.SFX.thud(); G.shake = Math.max(G.shake, 5); }
      } else if (e.st === 'erupt') {              // airborne: on landing, the shockwave runs both ways
        e.vy = Math.min(e.vy + 0.4, 7);
        if (DD.moveY(e, e.vy, false)) {
          e.vy = 0; e.st = 'settle'; e.t = 0; G.shake = Math.max(G.shake, 8);
          const life = 34 + ph * 10, feet = e.y + e.h - 12;
          DD.addEntity('rk_shock', { x: DD.cx(e) - 5, y: feet, w: 10, h: 12, vx: -2.6 - ph * 0.4, vy: 0, life });
          DD.addEntity('rk_shock', { x: DD.cx(e) - 5, y: feet, w: 10, h: 12, vx: 2.6 + ph * 0.4, vy: 0, life });
          DD.dust(DD.cx(e), FL, 14, 20, '#8a6a4a'); DD.SFX.thud();
        }
      } else if (e.st === 'settle') {             // just landed: the shockwaves run out (they are gone before the opening starts); he is not stompable yet, and harmless
        e.vx = 0; if (e.t > 48) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'stun') {               // the opening: he is dizzy, stomp him now
        e.vx = 0; if (e.t === 1) for (const b of DD.bodies) if (b.kind === 'rk_rat') b.life = Math.min(b.life, 18);   // nothing is still running at him while he is open
        if (e.t > 112 - ph * 24) { e.st = 'walk'; e.t = 0; }   // 1.9 s open in phase 1, 1.5 s in phase 2
      } else if (e.st === 'recoil') {             // just stomped: a short stagger back
        DD.moveX(e, e.vx, false); e.vx *= 0.94;
        if (e.t > 30) { e.st = 'walk'; e.t = 0; }
      }
      if (e.st !== 'erupt') { e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0; }
      const lo = B.arena[0], hi = B.arena[1];   // keep him inside the arena walls (B.arena is in px)
      if (e.x < lo) e.x = lo;
      if (e.x + e.w > hi) e.x = hi - e.w;
    },
    stomp(e, G, p) {                              // hit only while he is up (not burrowing, not airborne): one pip per stomp
      if (e.hidden || e.st === 'erupt' || e.st === 'settle') return false;
      DD.hitBoss(1);
      const B = DD.boss; if (B && !B.dead) { e.st = 'recoil'; e.t = 0; e.vx = (DD.cx(e) < DD.cx(p) ? -1 : 1) * 1.6; DD.float(DD.cx(e), e.y - 6, B.hp > 0 ? 'SKRRK!' : '', '#ffe680'); DD.stars(DD.cx(e), e.y + 4, 8, '#ffe680'); }
      return true;
    },
    touch(e, G) { if (!e.hidden && e.st !== 'stun' && e.st !== 'recoil' && e.st !== 'settle') DD.hurt(DD.cx(e)); },   // dizzy or reeling, he is harmless: bump him all you like
    draw(e, ctx) {
      if (e.hidden) {                             // underground: the dust trail, and in the last 32 frames a cracked, bulging patch of floor
        if (e.st === 'rumble') { const X = DD.wx(DD.cx(e)), Y = DD.wy(FL), j = (e.t % 4 < 2 ? 1 : -1); ctx.fillStyle = '#1c0f12'; ctx.fillRect(X - 14 + j, Y - 3, 28, 3); ctx.fillStyle = '#d4a468'; ctx.fillRect(X - 10, Y - 4, 3, 1); ctx.fillRect(X + 4, Y - 4, 3, 1); ctx.fillRect(X - 2, Y - 5 - (e.t >> 3), 4, 1); if (e.t % 8 < 4) { ctx.fillStyle = 'rgba(255,60,40,0.4)'; ctx.fillRect(X - 16, Y - 2, 32, 2); } }
        return;
      }
      const B = DD.boss, ph = B ? B.phase : 0, sfx = ph >= 1 ? '2' : '';
      const x = DD.wx(e.x + e.w / 2), y = DD.wy(e.y + e.h) + 1;
      let frame = 'w10_ratking' + sfx, ox = 0, sy = 1 + Math.sin(e.an / 14) * 0.012, alpha = 1;
      if (B && B.dead) { frame = 'w10_ratking' + sfx + '_hurt'; alpha = Math.max(0, (B.endT || 100) / 100); ox = Math.round(Math.sin(e.an * 1.7) * 2); }
      else if (B && B.inv > 0) { if (B.inv > 40) frame = 'w10_ratking' + sfx + '_hurt'; else if (Math.floor(B.inv / 3) % 2) alpha = 0.35; }
      else if (e.st === 'wind' || e.st === 'erupt' || e.st === 'scurry' || e.st === 'bags') frame = 'w10_ratking' + sfx + '_atk';
      else if (e.st === 'walk') ox = Math.round(Math.sin(e.an / 4) * 0.8);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, DD.wy(FL) - 1, 24, 3, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = alpha;
      if (e.st === 'wind' && Math.floor(e.t / 4) % 2) { ctx.fillStyle = 'rgba(255,60,40,0.28)'; ctx.beginPath(); ctx.ellipse(x, y - 28, 30, 32, 0, 0, 7); ctx.fill(); }
      DD.spr(frame, x + ox, y, e.dir > 0, 1, sy);
      ctx.globalAlpha = 1;
      if (ph >= 1 && !(B && B.dead) && e.an % 6 === 0) DD.part({ x: DD.cx(e) + (Math.random() - 0.5) * 22, y: e.y + 2, vx: (Math.random() - 0.5) * 0.6, vy: -0.8, life: 22, max: 22, r: 1, col: '#ffb040', g: 0 });   // the orange crown sparks
      if (e.st === 'stun' && !(B && B.dead)) for (let i = 0; i < 3; i++) { const a = e.an / 8 + i * 2.1; ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(x + Math.cos(a) * 15) - 1, Math.round(y - 62 + Math.sin(a) * 4) - 1, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x + Math.cos(a) * 15), Math.round(y - 62 + Math.sin(a) * 4), 1, 1); }   // dizzy stars
    },
  });

  DD.defineEntity('rk_zap', {   // a chewed wire on the floor: sparks and a yellow strip for 45 frames, then it zaps for 18. Only the floor is live: jump it.
    spawn: t => ({ x: t.x, y: FL - 6, w: 44, h: 6, t: 0 }),
    update(e) { e.t++; if (e.t >= 64) e.dead = true; },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(FL), k = e.t < 46 ? e.t / 46 : 1;
      if (e.t < 46) {
        ctx.fillStyle = 'rgba(255,214,60,' + (0.25 + 0.35 * (Math.floor(e.t / 4) % 2)) + ')'; ctx.fillRect(X, Y - 3, e.w, 3);
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X, Y - 2, e.w, 1);
        if (e.t % 5 === 0) DD.part({ x: e.x + Math.random() * e.w, y: FL - 4, vx: (Math.random() - 0.5), vy: -0.7 - Math.random(), life: 14, max: 14, r: 1, col: '#ffe680', g: 0 });
      } else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,140,0.55)'; ctx.fillRect(X, Y - 26, e.w, 26); ctx.restore();
        ctx.fillStyle = '#fffbe0'; for (let i = 0; i < 6; i++) ctx.fillRect(X + 2 + i * 7 + (e.t & 3), Y - 4 - ((e.t * 5 + i * 9) % 22), 2, 2);
        ctx.fillStyle = '#ffe680'; ctx.fillRect(X, Y - 3, e.w, 3);
      }
    },
    stomp: () => false,
    touch(e, G) { if (e.t >= 46 && G.pl.y + G.pl.h > FL - 26) DD.hurt(DD.cx(e)); },
  });
  function zaps(B, P) {   // two strips, one either side of the Dot (a 28px safe pocket between them), clamped to the arena
    const lo = B.arena[0] + 4, hi = B.arena[1] - 48;
    for (const x of [P - 14 - 44, P + 14]) DD.addEntity('rk_zap', { x: Math.max(lo, Math.min(hi, x)), y: FL - 6, w: 44, h: 6, t: 0 });
  }
  function pickHoles(B, P, ph) {   // the mouse holes near the player, on both sides, each sending its rats toward him
    const px = P / TS, out = [];
    for (const side of [-1, 1]) {
      const c = HOLES.filter(h => h * TS > B.arena[0] + 24 && h * TS < B.arena[1] - 40 && (h - px) * side > 5 && (h - px) * side < 13);
      const h = c.length ? c[0] : (side < 0 ? HOLES[0] : HOLES[HOLES.length - 1]);
      out.push({ x: h, dir: P < h * TS ? -1 : 1 });
    }
    return out;
  }

  window.LEVEL = {
    id: '10-boss', name: 'THE RAT KING', sub: 'IN THE WALLS', world: 10,
    W: 40, H: 24, FLOOR: 21,
    SOLID: [['parquet', 0, 21, 40, 3], ['plank', 8, 17, 5, 1], ['plank', 17, 14, 6, 1], ['plank', 27, 17, 5, 1]],
    KINDS: { parquet: 1, plank: 2 },
    THINGS: [['dot', 1, 20], ['ratking_boss', 28, 17]],
    POPCORN: [[4, 20, 3], [9, 16, 3], [18, 13, 4], [28, 16, 3], [12, 19, 1], [15, 18, 1], [24, 18, 1], [33, 19, 1], [35, 20, 3], [21, 20, 2], [6, 18, 1], [31, 14, 1], [23, 11, 1]],
    sprites: ['w10_ratking', 'w10_ratking_atk', 'w10_ratking_hurt', 'w10_ratking2', 'w10_ratking2_atk', 'w10_ratking2_hurt', 'w10_rat_a', 'w10_rat_b', 'w10_bag', 'w10_floor', 'w10_beam',
              'w10_portrait_tim', 'w10_portrait_gregg', 'w10_portrait_santa', 'w10_portrait_rat'],
    portraits: { tim: 'w10_portrait_tim', gregg: 'w10_portrait_gregg', santa: 'w10_portrait_santa', rat: 'w10_portrait_rat' },
    names: { tim: 'NEW', gregg: 'GREGG', santa: 'GREGG', rat: 'THE RAT KING' },
    intro: { bg: '#2a0a14', fg: '#ffe680', edge: '#8a5a1c' },
    lines: {   // design/VOICE.md. Sources: season-15 captain-america-brave-new-world-paddington-in-peru 2:34 (Orkin), love-hurts-heart-eyes 1:14 (the rats have to go), valiant-one-dog-man 9:15 to 10:37, one-of-them-days-wolf-man 6:54, den-of-thieves-2 5:19
      boss: [['tim', 'ORKIN IS COMING. THE RATS HAVE TO GO.'], ['gregg', "THE POPCORN IS NOT WHY WE HAVE RATS, TIM."]],
      bossPhase: [['tim', "THERE'S DEFINITELY A RAT IN THIS HOUSE."], ['tim', 'SPRAY THEM, TRAP THEM. ELIMINATE THE RATS.']],
      bossDefeat: [['tim', 'ZERO RATS TO ZERO RATS.']],
    },
    boss: {
      name: 'THE RAT KING', hp: 6, arena: [3, 38], inv: 60,
      phases: [{ at: 3, say: 'THE RATS HAVE TO GO', sub: 'MORE RATS, MORE BAGS' }],
      onDefeat: () => {
        DD.banner("IT'S MOVIE HOUSE!", 90, 'ZERO RATS');
        const b = DD.bodies.find(q => q.kind === 'ratking_boss');
        if (b) { for (let i = 0; i < 14; i++) DD.drop({ x: DD.cx(b) + (i - 7) * 4, y: b.y + 6, vx: (i - 7) * 0.45, vy: -3 - (i % 3), life: 400, wait: 10 }); DD.stars(DD.cx(b), b.y + 8, 24, '#ffe680'); for (let i = 0; i < 6; i++) DD.part({ x: DD.cx(b), y: b.y, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2, life: 60, max: 60, r: 2, col: '#f0c84a', g: 0.2, chunk: true }); }   // the crown pops off in pieces
      },
    },
    theme: {
      tiles: { parquet: ['#4a2c22', '#b07c4c', '#1c0f12'], plank: ['#9a7448', '#e0bc84', '#3a2410'] },
      crawl: ['#1a0c10', '#0a0408'],
      bg(ctx, G, DD) {   // the wall cavity: lath and plaster, studs, orange cords, a pipe, pink insulation with a nest, warm light leaking through
        const VW = DD.VW, VH = DD.VH, cx = G.cam.x, FY = FL - G.cam.y, f = G.frame;
        ctx.fillStyle = '#140a12'; ctx.fillRect(0, 0, VW, VH);
        const o1 = Math.floor(cx * 0.3);   // far: lath strips with plaster still stuck on in patches
        for (let y = 0; y < VH; y += 6) { ctx.fillStyle = (y / 6) % 2 ? '#2a1a1c' : '#241618'; ctx.fillRect(0, y, VW, 5); ctx.fillStyle = '#3a2628'; ctx.fillRect(0, y, VW, 1); }
        for (let i = Math.floor(o1 / 70) - 1; i < Math.ceil((o1 + VW) / 70) + 1; i++) { const h = (i * 2654435761 >>> 0) % 100, X = i * 70 - o1, w = 34 + h % 30, Y = 6 + (h * 7) % 70; ctx.fillStyle = '#4a3a3c'; ctx.fillRect(X, Y, w, 46 + h % 40); ctx.fillStyle = '#6a5a58'; ctx.fillRect(X, Y, w, 2); ctx.fillRect(X, Y, 2, 46 + h % 40); ctx.fillStyle = '#2a1e22'; ctx.fillRect(X + w - 2, Y + 2, 2, 44 + h % 40); }
        const o2 = Math.floor(cx * 0.55);   // mid: studs every 56px with fireblocks and braces
        for (let i = Math.floor(o2 / 56) - 1; i < Math.ceil((o2 + VW) / 56) + 1; i++) {
          const X = i * 56 - o2;
          ctx.fillStyle = '#1c0f12'; ctx.fillRect(X - 1, 0, 10, VH); ctx.fillStyle = '#4a2c22'; ctx.fillRect(X, 0, 8, VH); ctx.fillStyle = '#8a5c3c'; ctx.fillRect(X, 0, 2, VH); ctx.fillStyle = '#2e1a16'; ctx.fillRect(X + 6, 0, 2, VH);
          for (let y = ((i * 37) % 23); y < VH; y += 31) { ctx.fillStyle = '#1c0f12'; ctx.fillRect(X + 2, y, 2, 1); }
          if (i % 3 === 0) { ctx.fillStyle = '#3a2218'; ctx.fillRect(X + 8, FY - 100, 48, 8); ctx.fillStyle = '#6a4230'; ctx.fillRect(X + 8, FY - 100, 48, 2); ctx.fillStyle = '#140a0c'; ctx.fillRect(X + 8, FY - 92, 48, 1); }
          // the orange cord draping to the next stud
          ctx.fillStyle = '#e8742a'; for (let k = 0; k < 56; k++) ctx.fillRect(X + 8 + k, FY - 126 + Math.sin(k / 56 * Math.PI) * 14 + (i % 2) * 10, 1, 2);
          ctx.fillStyle = '#ffa850'; for (let k = 0; k < 56; k += 2) ctx.fillRect(X + 8 + k, FY - 126 + Math.sin(k / 56 * Math.PI) * 14 + (i % 2) * 10, 1, 1);
          // pink insulation batts between the studs, with a shredded nest of paper and popcorn
          ctx.fillStyle = '#d88a9a'; ctx.fillRect(X + 8, FY - 54, 48, 54); ctx.fillStyle = '#f0b0b8'; for (let k = 0; k < 40; k++) ctx.fillRect(X + 9 + (k * 13) % 46, FY - 53 + (k * 7) % 52, 3, 1); ctx.fillStyle = '#a05a74'; for (let k = 0; k < 30; k++) ctx.fillRect(X + 10 + (k * 17) % 44, FY - 50 + (k * 11) % 48, 2, 1);
          ctx.fillStyle = 'rgba(30,10,30,0.4)'; ctx.fillRect(X + 8, FY - 54, 48, 54);
          if (i % 2 === 0) { ctx.fillStyle = '#c8b898'; for (let k = 0; k < 14; k++) ctx.fillRect(X + 16 + (k * 7) % 30, FY - 10 - (k * 3) % 8, 3, 2); ctx.fillStyle = '#fff2a6'; for (let k = 0; k < 6; k++) ctx.fillRect(X + 20 + (k * 11) % 26, FY - 12 - (k * 5) % 7, 2, 2); }
        }
        ctx.fillStyle = '#6a5c4e'; ctx.fillRect(0, FY - 78, VW, 5); ctx.fillStyle = '#9a8a74'; ctx.fillRect(0, FY - 78, VW, 1); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(0, FY - 74, VW, 1);   // a copper-grey pipe, the joints
        for (let i = Math.floor(o2 / 140) - 1; i < Math.ceil((o2 + VW) / 140) + 1; i++) { ctx.fillStyle = '#8a7a64'; ctx.fillRect(i * 140 - o2 + 60, FY - 80, 6, 9); }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = Math.floor(cx * 0.4 / 120) - 1; i < Math.ceil((cx * 0.4 + VW) / 120) + 1; i++) {   // warm light through gaps in the plaster
          const X = i * 120 + 40 - cx * 0.4, g = ctx.createLinearGradient(X, 0, X + 30, VH); g.addColorStop(0, 'rgba(255,190,110,0.22)'); g.addColorStop(1, 'rgba(255,190,110,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X + 4, 0); ctx.lineTo(X + 44, VH); ctx.lineTo(X + 10, VH); ctx.fill();
        }
        ctx.restore();
        // the mouse holes along the base, glowing red when they are about to send rats
        const hs = G.s && G.s.holes || [], gt = G.s ? G.s.glowT : 0;
        for (const hx of HOLES) { const X = hx * TS - cx; if (X < -30 || X > VW + 30) continue; const hot = gt > 0 && hs.some(h => h.x === hx);
          ctx.fillStyle = '#0a0408'; ctx.beginPath(); ctx.ellipse(X + 8, FY - 1, 11, 12, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#3a2218'; ctx.beginPath(); ctx.ellipse(X + 8, FY - 1, 13, 14, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#0a0408'; ctx.beginPath(); ctx.ellipse(X + 8, FY - 1, 10, 11, 0, Math.PI, 0); ctx.fill();
          if (hot) { glow(ctx, X + 8, FY - 6, 22, '255,50,40', 0.45); ctx.fillStyle = '#ff5a4a'; ctx.fillRect(X + 4, FY - 9, 2, 2); ctx.fillRect(X + 10, FY - 9, 2, 2); } }
        { const A = DD.art;   // art pass: caged work lamps on the orange cord with cones, a flickering junction box, a gilt-less rim of shadow on the studs, dust
          for (let i = Math.floor(o2 / 168) - 1; i < Math.ceil((o2 + VW) / 168) + 1; i++) { const X = i * 168 - o2 + 90, Y = 30 + (i * 29 & 15), on = (i + Math.floor(f / 3)) % 11 !== 0 || f % 80 > 6;
            A.R(X + 3, 0, 1, Y, '#e8742a'); A.box(X, Y, 8, 6, '#6a5c4e', { outline: '#1c0f12' }); for (let q = 1; q < 8; q += 2) A.R(X + q, Y + 1, 1, 4, '#2a2018');
            if (on) { A.glow(X + 4, Y + 8, 44, '#ffd890', 0.3); A.cone(X + 4, Y + 7, FY - Y - 10, 42, '#ffe0a0', 0.08); } }
          for (let i = Math.floor(o2 / 56) - 1; i < Math.ceil((o2 + VW) / 56) + 1; i++) if (i % 4 === 1) { const X = i * 56 - o2 + 20, on = (f + i * 13) % 60 < 50;
            A.box(X, FY - 40, 10, 12, '#8a8a92', { outline: '#14141a' }); A.R(X + 2, FY - 36, 6, 1, '#14141a'); A.R(X + 2, FY - 33, 6, 1, '#14141a'); A.R(X + 4, FY - 30, 2, 1, on ? '#7aff8a' : '#2a5a30'); if (on) A.glow(X + 5, FY - 32, 10, '#7aff8a', 0.18); }
          A.motes(G, '#ffe0b0', 14, 0.4); A.vignette(0.6); }
      },
      tile(ctx, k, X, Y, tx, ty) {
        const I = DD.IMG, ok = DD.ready, lip = !DD.T(tx, ty - 1);
        if (k === 'parquet' && ok('w10_floor')) {
          const i = I.w10_floor, sx = (tx % 2) * 16;
          if (lip) ctx.drawImage(i, sx, 0, 16, 16, X, Y, 16, 16);
          else { ctx.drawImage(i, sx, 6, 16, 5, X, Y, 16, 5); ctx.drawImage(i, sx, 6, 16, 5, X, Y + 5, 16, 5); ctx.drawImage(i, sx, 6, 16, 6, X, Y + 10, 16, 6); ctx.fillStyle = `rgba(14,4,10,${Math.min(0.7, 0.35 + 0.08 * (ty - 21))})`; ctx.fillRect(X, Y, 16, 16); }
          { const A = DD.art, T = DD.T; if (lip) { A.R(X, Y, 16, 1, 'rgba(255,240,210,0.42)'); A.R(X, Y + 1, 16, 1, 'rgba(255,240,210,0.1)'); } if (!T(tx - 1, ty)) A.R(X, Y, 1, 16, 'rgba(255,240,210,0.14)'); if (!T(tx + 1, ty)) A.R(X + 15, Y, 1, 16, 'rgba(0,0,0,0.3)'); if (!T(tx, ty + 1)) A.R(X, Y + 15, 16, 1, 'rgba(0,0,0,0.38)'); }
          return true;
        }
        if (k === 'plank' && ok('w10_beam')) { ctx.drawImage(I.w10_beam, 0, 0, 16, 7, X, Y, 16, 7); ctx.fillStyle = 'rgba(10,4,10,0.55)'; ctx.fillRect(X, Y + 7, 16, 1); DD.art.R(X, Y, 16, 1, 'rgba(255,240,210,0.45)'); DD.art.R(X, Y + 6, 16, 1, 'rgba(0,0,0,0.35)'); return true; }
        return false;
      },
    },
    script: {
      init(G) { G.s = { glowT: 0, holes: [] }; },
      update(G) { if (G.s.glowT > 0) G.s.glowT--; },
      drawFG(ctx, G) {   // cobwebs in the top corners and a little dust in the light
        const VW = DD.VW;
        ctx.strokeStyle = 'rgba(220,210,230,0.22)'; ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.arc(0, 0, i * 9, 0, Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(VW, 0, i * 9, Math.PI / 2, Math.PI); ctx.stroke(); }
        for (let a = 0; a <= 4; a++) { const t = a / 4 * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t) * 54, Math.sin(t) * 54); ctx.stroke(); ctx.beginPath(); ctx.moveTo(VW, 0); ctx.lineTo(VW - Math.cos(t) * 54, Math.sin(t) * 54); ctx.stroke(); }
        if (G.frame % 18 === 0) DD.part({ x: G.cam.x + Math.random() * 320, y: G.cam.y + Math.random() * 40, vx: (Math.random() - 0.4) * 0.2, vy: 0.2 + Math.random() * 0.2, life: 120, max: 120, r: 1, col: 'rgba(255,225,180,0.45)', g: 0 });
      },
    },
  };
}
