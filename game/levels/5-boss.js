// World 5 boss: SIX BAGS TIM (S9), in his black leather motorised recliner ("Vader" recliner; Tim in the black beanie, royal-blue checkered
// scarf, gloves and burn marks; phase 2 the white mask, pompadour and leather jacket). Hand-written: arena, boss entity, tray and shockwave
// projectiles. Art: design/sprites/w5_boss.py (w5_timboss[_mask][_atk|_hurt]) and w5_set.py. Attacks (each telegraphed for 40 frames: a red glow,
// a "!" and a marker for where it will land):
//   1. TOSS: he lobs trays at you in arcs. Walk under them; he is open afterwards.
//   2. HOP: the recliner launches him and lands with a shockwave running both ways. Jump the wave; he is dizzy on landing.
//   3. CHARGE: he drives the recliner across the arena. Jump it, or let him hit the wall, which stuns him.
// Between attacks he rolls at you. Stomp him whenever he is not blinking (the white flash is his hurt window closing).
// Phase 2 ("the white mask", at 3 pips) makes him faster, throws five trays, and adds a fourth move: RAIN. Red rings mark four spots on the
// floor (40 frames of rearing up plus 30 of rings), then trays fall onto them.
// Fairness (same bar as 1-boss): every attack has a 40 frame wind-up you can read; he can only be stomped while he is dizzy (about 2 s in
// phase 1, 1.7 s in phase 2) and touching him then does not hurt; no attack is still running when the dizzy window opens (the shockwave is
// short and the trays have landed); a hit gives him a breather (his body is harmless for a moment).
(function () {
  const ok = n => DD.ready(n), IM = n => DD.IMG[n], TS = 16;
  const say = n => { if (typeof DD.say === 'function' && typeof DD.lines === 'function') DD.lines(n); };
  const glow = (ctx, X, Y, r, rgb, a) => {
    const g = ctx.createRadialGradient(X, Y, 1, X, Y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(X - r, Y - r, r * 2, r * 2); ctx.restore();
  };

  DD.defineEntity('bossTray', {   // a tray Six Bags lobs: arcs, spins, dies on the floor or a wall, hurts on touch
    update(e) {
      e.vy += 0.22; e.rot = (e.rot || 0) + 0.25 * Math.sign(e.vx || 1);
      const mx = DD.moveX(e, e.vx, false), my = DD.moveY(e, e.vy, false);
      if (mx || my || --e.life <= 0) { e.dead = true; DD.dust(DD.cx(e), e.y + e.h, 6, 1.2, '#c8ccd8'); DD.SFX.land && DD.SFX.land(2); }
    },
    draw(e, ctx) {
      const X = DD.wx(e.x + e.w / 2), Y = DD.wy(e.y + e.h / 2);
      glow(ctx, X, Y, 14, '210,220,255', 0.14);
      if (ok('w5_tray')) { ctx.save(); ctx.translate(Math.round(X), Math.round(Y)); ctx.rotate(e.rot || 0); ctx.drawImage(IM('w5_tray'), -8, -6); ctx.restore(); }
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); e.dead = true; },
  });
  DD.defineEntity('bossShock', {   // the floor shockwave from the recliner landing: runs both ways, a jump clears it
    update(e) { e.t = (e.t || 0) + 1; DD.moveX(e, e.vx, false); if (e.t % 4 === 0) DD.part && DD.part({ x: e.x + 5, y: e.y + e.h - 2, vx: 0, vy: -0.6, life: 14, max: 14, r: 1, col: '#ffd890', g: 0 }); if (--e.life <= 0) e.dead = true; },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y), k = Math.min(1, e.life / 20), flick = (e.t >> 1) % 2;
      const g = ctx.createLinearGradient(0, Y, 0, Y + e.h); g.addColorStop(0, 'rgba(255,230,160,0)'); g.addColorStop(0.5, 'rgba(255,170,80,' + (0.8 * k) + ')'); g.addColorStop(1, 'rgba(255,90,60,' + k + ')');
      ctx.fillStyle = g; ctx.fillRect(X, Y, e.w, e.h);
      ctx.fillStyle = 'rgba(255,250,230,' + k + ')'; ctx.fillRect(X + 2, Y + e.h - 3, e.w - 4, 2); ctx.fillRect(X + 3 + flick, Y + 3, 3, e.h - 6);
      glow(ctx, X + e.w / 2, Y + e.h - 2, 22, '255,150,70', 0.3 * k);
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); },
  });

  DD.defineEntity('sixbags_boss', {
    boss: true,   // stomp = one pip (invulnerable frames stop double hits); touch = hurt
    spawn: t => ({ x: t.x, y: t.y + 32 - 50, w: 40, h: 50, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0, n: 0, atk: null, wob: 0, shock: 0, hurt: 0, mk: [] }),
    update(e, G) {
      const B = DD.boss; if (!B || !B.engaged) return;
      if (B.dead) { e.t++; e.vx = 0; if (e.t % 5 === 0) DD.part && DD.part({ x: e.x + Math.random() * e.w, y: e.y + 6 + Math.random() * 20, vx: (Math.random() - 0.5) * 0.8, vy: -0.9, life: 40, max: 40, r: 3, col: Math.random() < 0.5 ? '#6a6a80' : '#c8c4d8', g: -0.01 }); return; }
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      e.t++;
      if (B.flash === B.cfg.inv - 1) e.shock = 12;   // just hit: a little recoil
      if (e.shock > 0) e.shock--;
      if (e.hurt > 0) e.hurt--;
      if (e.st === 'walk') {                       // roll at the Dot, then pick the next attack
        e.dir = P < me ? -1 : 1;
        { const gap = Math.abs(P - me), sp = 0.5 + ph * 0.25, mid = (B.arena[0] + B.arena[1]) / 2; e.vx = gap > 72 ? e.dir * sp : gap < 44 ? (me < mid ? 1 : -1) * 1.3 : 0; }   // rolls up but stops short, and backs off a Dot that is right on him: nobody gets pinned against the wall
        DD.moveX(e, e.vx, false);
        if (e.t > 100 - ph * 15) { e.st = 'wind'; e.t = 0; const cyc = ph >= 1 ? ['toss', 'hop', 'rain', 'charge'] : ['toss', 'hop', 'charge']; e.atk = cyc[e.n++ % cyc.length]; if (e.atk === 'rain') { const lo = B.arena[0] + 24, hi = B.arena[1] - 24; e.mk = [0, 54, -54, 108].map(d => DD.clamp(P + d * (Math.random() < 0.5 ? -1 : 1), lo, hi)); } e.dir = P < me ? -1 : 1; DD.SFX.wind && DD.SFX.wind(); }
      } else if (e.st === 'wind') {                // telegraph: 40 frames of rearing up, flashing red
        e.vx = 0;
        if (e.t >= 40) {
          e.t = 0;
          if (e.atk === 'toss') e.st = 'toss';
          else if (e.atk === 'rain') e.st = 'rain';
          else if (e.atk === 'charge') e.st = 'charge';
          else { e.st = 'hop'; e.vy = -6.5 - ph * 0.5; DD.SFX.boing && DD.SFX.boing(); }
        }
      } else if (e.st === 'toss') {                // three trays (five in phase 2), spaced out, then the opening
        e.vx = 0;
        const count = ph >= 1 ? 5 : 3;
        if (e.t % 20 === 10 && e.t / 20 < count) {
          const vx = e.dir * (1.6 + ph * 0.5) * (e.t / 20 < 2 ? 1 : 1.3);
          DD.addEntity('bossTray', { x: me + e.dir * 14 - 6, y: e.y + 4, w: 12, h: 8, vx, vy: -4.6, life: 180 });
          DD.tone(520, 300, 0.1, 'triangle', 0.05);
        }
        if (e.t > count * 20 + 55) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'charge') {              // straight drive across the arena
        e.vx = e.dir * (3 + ph * 0.7);
        const blocked = DD.moveX(e, e.vx, false);
        if (e.t % 4 === 0) DD.dust(me - e.dir * 20, e.y + e.h, 2, 0.8, '#8a8498');
        if (blocked || e.t > 70) { e.st = 'stun'; e.t = 0; if (blocked) { G.shake = Math.max(G.shake, 8); DD.SFX.slam(); DD.stars(me + e.dir * 20, e.y + 10, 6, '#ffe680'); } }
      } else if (e.st === 'hop') {                 // airborne: on landing, the shockwave runs both ways
        e.vy = Math.min(e.vy + 0.4, 7);
        if (DD.moveY(e, e.vy, false)) {
          e.vy = 0; e.st = 'land'; e.t = 0;
          const life = 46 + ph * 6, feet = e.y + e.h - 14;
          DD.addEntity('bossShock', { x: DD.cx(e) - 6, y: feet, w: 12, h: 14, vx: -2.6 - ph * 0.4, vy: 0, life });
          DD.addEntity('bossShock', { x: DD.cx(e) - 6, y: feet, w: 12, h: 14, vx: 2.6 + ph * 0.4, vy: 0, life });
          DD.SFX.thud(); G.shake = Math.max(G.shake, 6); DD.dust(me, e.y + e.h, 10, 2, '#a89aa8');
        }
      } else if (e.st === 'rain') {                // the rings are on the floor: trays fall onto them one after another
        e.vx = 0;
        if (e.t === 30 || e.t === 38 || e.t === 46 || e.t === 54) { const i = (e.t - 30) / 8, x = e.mk[i]; DD.addEntity('bossTray', { x: x - 6, y: 21 * TS - 170, w: 12, h: 8, vx: 0, vy: 2, life: 200 }); DD.tone(420, 260, 0.1, 'triangle', 0.05); }
        if (e.t > 95) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'land') {                // the shockwave is running; he is still catching his breath, so nothing is open yet
        e.vx = 0;
        if (e.t > 50) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'stun') {                // the opening: he is dizzy, stomp him now
        e.vx = 0;
        if (e.t > 120 - ph * 20) { e.st = 'walk'; e.t = 0; }
      }
      if (e.st !== 'hop') { e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0; }
      const lo = B.arena[0], hi = B.arena[1];   // keep him inside the arena walls (DD.boss.arena is already in px)
      if (e.x < lo) e.x = lo;
      if (e.x + e.w > hi) e.x = hi - e.w;
    },
    touch(e, G, p) { const B = DD.boss; if (e.st === 'stun' || e.st === 'land' || e.hurt > 0 || (B && (B.inv > 0 || B.dead))) return; DD.hurt(DD.cx(e)); },   // dizzy or hurt: harmless, bump him all you like on the way up
    stomp(e, G, p) {   // only while he is dizzy; otherwise it refuses, and touch hurts you
      const B = DD.boss; if (e.st !== 'stun' || e.hurt > 0 || !B || B.inv > 0 || B.dead) return false;
      e.hurt = 40; e.st = 'walk'; e.t = -40; e.shock = 12; DD.stars(DD.cx(e), e.y + 6, 10, '#ffffff'); DD.SFX.stomp && DD.SFX.stomp(); DD.hitBoss(1);
      return true;
    },
    draw(e, ctx, G) {
      const B = DD.boss, mask = B && B.phase >= 1, base = mask ? 'w5_timboss_mask' : 'w5_timboss';
      const X = DD.wx(e.x + e.w / 2), Y = DD.wy(e.y + e.h);
      if (B && B.dead) {   // defeated: he slumps, the amber motor light dies, and he fades out in a cloud of puffs
        const k = Math.max(0, (B.endT || 100) / 100);
        ctx.globalAlpha = k; if (ok(base + '_hurt')) DD.spr(base + '_hurt', X + Math.round(Math.sin(e.t / 2) * 1.5), Y + (1 - k) * 6);
        ctx.globalAlpha = 1; return;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(X, Y, 26, 3, 0, 0, 7); ctx.fill();
      const wind = e.st === 'wind', hurtFlash = B && B.flash > 30;
      let frame = base;
      if (hurtFlash || e.st === 'stun' || e.st === 'land') frame = base + '_hurt';
      else if (e.st === 'toss' || e.st === 'hop' || e.st === 'rain' || (wind && e.atk === 'toss')) frame = base + '_atk';
      // telegraphs: a red glow, a "!" and the marker for the attack that is coming
      if (wind) {
        const pulse = 0.25 + 0.2 * Math.sin(e.t / 2.5);
        glow(ctx, X, Y - 26, 44, '255,50,40', pulse);
        if (Math.floor(e.t / 4) % 2) { ctx.fillStyle = '#ff5a40'; ctx.fillRect(Math.round(X) - 1, Math.round(Y) - 78, 3, 8); ctx.fillRect(Math.round(X) - 1, Math.round(Y) - 67, 3, 3); }
        ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(e.t / 3);
        if (e.atk === 'charge') {   // chevrons along the floor in the direction he will drive
          ctx.fillStyle = '#ff5a40';
          for (let i = 1; i <= 8; i++) { const cx = Math.round(X + e.dir * (28 + i * 14)), cy = Math.round(Y) - 6;
            for (let j = 0; j < 4; j++) { ctx.fillRect(cx - e.dir * j, cy - j, 2, 1); ctx.fillRect(cx - e.dir * j, cy + j, 2, 1); } }
        } else if (e.atk === 'hop') {   // a growing ring on the floor under him
          ctx.strokeStyle = '#ff5a40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X, Y - 1, 14 + e.t * 0.9, 3 + e.t * 0.08, 0, 0, 7); ctx.stroke();
        } else if (e.atk === 'toss') {   // toss: dots showing the arc
          ctx.fillStyle = '#ff5a40';
          for (let i = 1; i <= 5; i++) ctx.fillRect(Math.round(X + e.dir * (18 + i * 16)), Math.round(Y) - 40 + Math.round(Math.pow(i - 2.5, 2) * 4), 3, 3);
        }
        ctx.restore();
      }
      if ((wind && e.atk === 'rain') || e.st === 'rain') {   // red rings on the floor where the trays will land (70 frames of warning in all)
        ctx.save();
        e.mk.forEach((mx, i) => {
          if (e.st === 'rain' && e.t > 30 + i * 8 + 40) return;
          const x = Math.round(DD.wx(mx)), t = e.st === 'rain' ? 40 + e.t : e.t;
          ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t / 3); ctx.strokeStyle = '#ff5a40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, Y - 1, 12, 3, 0, 0, 7); ctx.stroke();
          ctx.fillStyle = '#ff5a40'; ctx.fillRect(x - 4, Y - 3, 8, 1); ctx.fillRect(x - 1, Y - 6, 2, 6);
        });
        ctx.restore();
      }
      if (e.st === 'charge') { ctx.save(); ctx.globalAlpha = 0.28; for (let i = 1; i <= 3; i++) DD.spr(frame, X - e.dir * i * 9, Y, e.dir < 0 ? true : false); ctx.restore(); }   // speed trails
      const bob = e.st === 'walk' ? Math.round(Math.sin(e.t / 6) * 1) : 0, jig = e.shock > 0 ? Math.round(Math.sin(e.shock * 2) * 2) : 0;
      const flip = e.dir < 0;
      if (hurtFlash && Math.floor(B.flash / 2) % 2) { ctx.save(); ctx.filter = 'brightness(3.2) saturate(0.3)'; DD.spr(frame, X + jig, Y + bob, flip); ctx.restore(); }   // the white hit flash
      else if (B && B.inv > 0 && !hurtFlash && Math.floor(B.inv / 3) % 2) DD.spr(frame, X + jig, Y + bob, flip, 1, 1, 0, 0.45);                              // blinking while he is safe
      else DD.spr(frame, X + jig, Y + bob, flip);
      if (e.st === 'stun' && !hurtFlash) {   // dizzy stars circling the head, and an arrow that says stomp now
        const ay = Math.round(Y - 62 + Math.sin(e.t / 4) * 2); ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(X) - 3, ay, 6, 2); ctx.fillRect(Math.round(X) - 2, ay + 2, 4, 2); ctx.fillRect(Math.round(X) - 1, ay + 4, 2, 2);
        for (let i = 0; i < 3; i++) { const a = e.t / 8 + i * 2.1; ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(X + Math.cos(a) * 14), Math.round(Y - 50 + Math.sin(a) * 4), 3, 3); }
      }
      glow(ctx, X + (flip ? -12 : 12), Y - 5, 14, '255,160,60', 0.18 + 0.07 * Math.sin(G.frame / 5));   // the motor strip glows
    },
  });

  Object.assign(window, { LEVEL: {
    id: '5-boss', name: 'SIX BAGS TIM', sub: 'PUT IT ON THE TABLE', world: 5,
    W: 64, H: 24, FLOOR: 21,
    SOLID: [['carpet', 0, 21, 64, 3], ['pouf', 11, 17, 5, 1], ['pouf', 48, 17, 5, 1], ['pouf', 29, 14, 6, 1]],
    KINDS: { carpet: 1, pouf: 2 },
    THINGS: [['dot', 1, 20], ['sixbags_boss', 50, 19]],
    POPCORN: [[4, 20, 4], [11, 16, 5], [48, 16, 5], [29, 13, 6], [8, 20, 1], [24, 18, 2], [38, 18, 2], [26, 20, 4], [34, 20, 4], [57, 20, 3], [14, 12, 1], [50, 12, 1]],
    sprites: ['w5_carpet', 'w5_wall', 'w5_curtain', 'w5_recliner_bg', 'w5_table_pop', 'w5_table_beer', 'w5_tray', 'w5_screen', 'w5_glow',
              'w5_timboss', 'w5_timboss_atk', 'w5_timboss_hurt', 'w5_timboss_mask', 'w5_timboss_mask_atk', 'w5_timboss_mask_hurt'],
    portraits: { tim: 'w5_portrait_tim', gregg: 'w5_portrait_gregg', mask: 'w5_portrait_mask' },
    names: { tim: 'TIM', gregg: 'GREGG', mask: 'MASKED TIM' },
    intro: { bg: '#10060e', fg: '#f4ecdc', edge: '#d048b0' },
    lines: {   // design/VOICE.md. Sources: S9 king-arthur-and-snatched ("six bags cinema time"), unforgettable-animal-crackers-and-born-in-china (coach on a bad airline), smurfs-the-lost-village-and-the-case-for-christ (the self-relubricating mask, "this stupid mask"), kong-skull-island-and-the-wall (zero bags for the truffle popcorn, "I'm addicted to this stuff")
      boss: [['tim', "IT'S SIX BAGS CINEMA TIME."], ['gregg', "I'D RATHER FLY COACH THAN SIT IN THESE."]],
      bossPhase: [['mask', "IT'S A SELF-RELUBRICATING MASK. IT PREVENTS INFECTION."], ['mask', "I CAN'T EAT WITH THIS MASK ON."]],
      bossDefeat: [['gregg', 'ZERO BAGS FOR THE TRUFFLE POPCORN.'], ['tim', "I'M ADDICTED TO THIS STUFF."]],
    },
    boss: {
      name: 'SIX BAGS TIM', hp: 6, arena: [2, 62], inv: 60,
      phases: [{ at: 3, say: 'THE MASK', sub: 'SELF-RELUBRICATING', enter(G, B) { G.shake = 10; DD.stars(DD.cx(G.pl), G.pl.y, 6, '#ffffff'); const bo = DD.bodies.find(b => b.kind === 'sixbags_boss'); if (bo) { bo.st = 'walk'; bo.t = -70; bo.hurt = 60; DD.burst && DD.burst(DD.cx(bo), bo.y + 10, 14); } } }],
      onHit(G, B) { const bo = DD.bodies.find(b => b.kind === 'sixbags_boss'); if (bo) for (let i = 0; i < 3; i++) DD.drop({ x: DD.cx(bo), y: bo.y, vx: (i - 1) * 1.3, vy: -3.2, life: 300, wait: 8 }); },
      onDefeat(G, B) {
        DD.banner('SIX BAGS CINEMA', 90, 'CLOSED FOR RENOVATIONS');
        const bo = DD.bodies.find(b => b.kind === 'sixbags_boss');
        if (bo) { for (let i = 0; i < 26; i++) DD.drop({ x: DD.cx(bo) + (i % 5 - 2) * 4, y: bo.y, vx: (Math.random() - 0.5) * 3.6, vy: -2 - Math.random() * 3.5, life: 360, wait: 10 + i * 2 }); DD.burst && DD.burst(DD.cx(bo), bo.y + 14, 20); }
      },
    },
    theme: {
      tiles: { carpet: ['#281220', '#4a2438', '#120810'], pouf: ['#2a2740', '#8c89b0', '#07060d'] },
      bg(ctx, G, DD) {   // the black screening room, the lit screen, rows of recliners and tables, a spot on the arena, red curtains at both ends
        const c = G.cam, VW = DD.VW, VH = DD.VH, I = DD.IMG, ready = DD.ready, md = (a, m) => ((a % m) + m) % m;
        ctx.fillStyle = '#08060b'; ctx.fillRect(0, 0, VW, VH);
        if (ready('w5_wall')) { const ox = -md(Math.round(c.x * 0.15), 32), oy = -md(Math.round(c.y * 0.5), 48); for (let y = oy - 48; y < VH; y += 48) for (let x = ox - 32; x < VW; x += 32) ctx.drawImage(I.w5_wall, x, y); }
        let g = ctx.createLinearGradient(0, VH * 0.3, 0, VH); g.addColorStop(0, 'rgba(150,40,140,0)'); g.addColorStop(1, 'rgba(150,40,140,0.28)'); ctx.fillStyle = g; ctx.fillRect(0, VH * 0.3, VW, VH);
        const sx = Math.round(500 - c.x * 0.25), sy = Math.round(36 - c.y * 0.5);
        glow(ctx, sx + 48, sy + 26, 100, '60,170,190', 0.22); if (ready('w5_screen')) ctx.drawImage(I.w5_screen, sx, sy);
        const patron = (x, y, i, rk, dm) => {   // an audience member sat in a back-row recliner, facing the fight: blinks, turns, winces when the Dot is hurt, throws up its arms when Tim is hit, rears back on a phase change
          const A = DD.art, C = col => A.mix(col, dm - 1); if (A.hash(i, 40 + rk) > 0.6) return;
          const hh = A.hash(i, 41 + rk), SK = ['#c89070', '#a87050', '#e0b090', '#8a5a40'], HR = ['#1a1018', '#3a2418', '#6a5a50', '#c8c0b0', '#7a3a20'], SH = ['#4a3a6a', '#2a4a5a', '#5a2a3a', '#3a3a44', '#6a5a2a'];
          const f = G.frame, hurt = G.pl && G.pl.inv > 0, hit = f - (G.flashAt ?? -999) < 36, flare = f - (G.flareAt ?? -999) < 50;
          const per = 190 + Math.floor(hh * 110), tt = (f + Math.floor(hh * 977)) % per, blink = tt < 6, turn = (f + Math.floor(hh * 613)) % (260 + Math.floor(hh * 90)) < 28 ? (hh < 0.5 ? 1 : -1) : 0;
          const hop = hit ? -(1 + (((f >> 2) + i) & 1)) : 0, lean = hurt ? 1 : flare ? -1 : 0, X = x + 14 + turn, Y = y - 42 + 10 + hop;
          const sk = SK[Math.floor(hh * 4) % 4], hr = HR[Math.floor(hh * 977) % 5], sh = SH[Math.floor(hh * 311) % 5];
          ctx.fillStyle = C(sh); ctx.fillRect(x + 11, y - 42 + 19 + hop, 14, 8); ctx.fillStyle = C(A.mix(sh, 0.3)); ctx.fillRect(x + 11, y - 42 + 19 + hop, 14, 1);
          if (hit) { ctx.fillStyle = C(sk); ctx.fillRect(x + 9, y - 42 + 9 + hop, 2, 11); ctx.fillRect(x + 25, y - 42 + 9 + hop, 2, 11); ctx.fillStyle = C(A.mix(sk, -0.3)); ctx.fillRect(x + 9, y - 42 + 9 + hop, 2, 1); ctx.fillRect(x + 25, y - 42 + 9 + hop, 2, 1); }
          ctx.fillStyle = C(sk); ctx.fillRect(X, Y + lean, 8, 8); ctx.fillStyle = C(A.mix(sk, -0.28)); ctx.fillRect(X + 7, Y + lean, 1, 8); ctx.fillStyle = C(hr); ctx.fillRect(X, Y + lean, 8, 3); ctx.fillRect(X - 1, Y + lean + 1, 1, 3); ctx.fillRect(X + 8, Y + lean + 1, 1, 3);
          ctx.fillStyle = blink ? C(A.mix(sk, -0.3)) : C('#f4f0e8'); ctx.fillRect(X + 1, Y + lean + 4, 2, 1); ctx.fillRect(X + 5, Y + lean + 4, 2, 1);
          if (!blink) { ctx.fillStyle = C('#10080e'); ctx.fillRect(X + 2 + turn, Y + lean + 4, 1, 1); ctx.fillRect(X + 6 + turn, Y + lean + 4, 1, 1); if (hurt || flare) { ctx.fillStyle = C('#f4f0e8'); ctx.fillRect(X + 1, Y + lean + 3, 2, 1); ctx.fillRect(X + 5, Y + lean + 3, 2, 1); } }
          ctx.fillStyle = hit || hurt ? C('#3a1018') : C(A.mix(sk, -0.4)); ctx.fillRect(X + 3, Y + lean + 6, 2, hit || hurt ? 2 : 1);
          ctx.fillStyle = 'rgba(122,216,232,0.55)'; ctx.fillRect(X, Y + lean, 8, 1);   // the screen's cool rim light on the hair
        };
        const row = (par, dim, baseY, step) => {
          const pat = [];
          const y = Math.round(baseY - c.y), xo = Math.round(c.x * par), i0 = Math.floor(xo / step) - 1;
          ctx.fillStyle = '#0c0912'; ctx.fillRect(0, y - 4, VW, VH); ctx.save(); ctx.filter = 'brightness(' + dim + ')';
          for (let i = i0; i * step - xo < VW + step; i++) { const x = i * step - xo; if (ready('w5_recliner_bg')) { ctx.drawImage(I.w5_recliner_bg, x, y - 42); pat.push([x, y, i]); } const tn = (i & 1) ? 'w5_table_beer' : 'w5_table_pop'; if (ready(tn)) ctx.drawImage(I[tn], x + 37, y - 26); }
          ctx.restore();
          for (const q of pat) patron(q[0], q[1], q[2], dim < 0.5 ? 0 : 1, dim + 0.18);
        };
        row(0.32, 0.4, 296, 58); row(0.55, 0.62, 330, 58);
        const bx = DD.wx(32 * TS);   // the spot on the middle of the arena
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(0, -20, 0, VH); gr.addColorStop(0, 'rgba(255,200,130,0.2)'); gr.addColorStop(1, 'rgba(255,200,130,0.04)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(bx - 10, -20); ctx.lineTo(bx + 10, -20); ctx.lineTo(bx + 120, VH); ctx.lineTo(bx - 120, VH); ctx.fill(); ctx.restore();
        const cur = (wx, w) => { const X = Math.round(DD.wx(wx)); if (X > VW || X + w < 0 || !ready('w5_curtain')) return; ctx.save(); ctx.beginPath(); ctx.rect(X, 0, w, VH + 400); ctx.clip();
          const Y0 = Math.round(DD.wy(0)); for (let xx = 0; xx < w; xx += 48) for (let yy = 0; yy < 400; yy += 96) ctx.drawImage(I.w5_curtain, X + xx, Y0 + yy); ctx.restore(); };
        cur(0, 3 * TS); cur(61 * TS, 3 * TS);
      },
      tile(ctx, k, X, Y, tx, ty) {
        const I = DD.IMG, kind = DD.kindAt, above = kind(tx, ty - 1), lip = !above || above === 'pouf';
        if (k === 'carpet' && ok('w5_carpet')) {
          ctx.drawImage(I.w5_carpet, X, Y);
          if (lip) { ctx.fillStyle = '#6a3448'; ctx.fillRect(X, Y, 16, 1); ctx.fillStyle = '#4a2438'; ctx.fillRect(X, Y + 1, 16, 1); ctx.fillStyle = 'rgba(255,170,90,0.10)'; ctx.fillRect(X, Y + 2, 16, 3); }
          else {
            ctx.fillStyle = ty > 21 ? 'rgba(6,2,6,0.5)' : 'rgba(6,2,6,0.25)'; ctx.fillRect(X, Y, 16, 16);
            if (ty === 22) {   // the cut-away below the aisle: a skirting board, a cable run taped to the floor, a row of step lights glowing from under the lip
              ctx.fillStyle = '#1a1220'; ctx.fillRect(X, Y, 16, 3); ctx.fillStyle = '#34283a'; ctx.fillRect(X, Y, 16, 1); ctx.fillStyle = 'rgba(255,170,90,' + (tx % 2 ? 0.2 : 0.38) + ')'; ctx.fillRect(X + 5, Y + 3, 6, 1);
              ctx.fillStyle = '#0c0810'; ctx.fillRect(X, Y + 7, 16, 4); ctx.fillStyle = '#241a2a'; ctx.fillRect(X, Y + 7, 16, 1); ctx.fillStyle = '#05030a'; ctx.fillRect(X, Y + 10, 16, 1);
              if (tx % 5 === 2) { ctx.fillStyle = '#5a5866'; ctx.fillRect(X + 3, Y + 6, 7, 6); ctx.fillStyle = '#8a8896'; ctx.fillRect(X + 3, Y + 6, 7, 1); }
            } else if (ty === 23) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#2a1a30'; for (let k = 0; k < 16; k += 4) ctx.fillRect(X + k, Y + 5, 1, 1 + (tx + k) % 3); }
          }
          return true;
        }
        if (k === 'pouf') {
          const L = kind(tx - 1, ty) !== 'pouf', R = kind(tx + 1, ty) !== 'pouf', a = L ? 1 : 0, b = R ? 1 : 0;
          ctx.fillStyle = '#7a8298'; if (L) ctx.fillRect(X + 3, Y + 11, 2, 5); if (R) ctx.fillRect(X + 11, Y + 11, 2, 5);
          ctx.fillStyle = '#d4dae8'; if (L) ctx.fillRect(X + 3, Y + 11, 1, 4); if (R) ctx.fillRect(X + 11, Y + 11, 1, 4);
          ctx.fillStyle = '#07060d'; ctx.fillRect(X + a, Y, 16 - a - b, 12); ctx.fillStyle = '#2a2740'; ctx.fillRect(X + a * 2, Y + 1, 16 - a * 2 - b * 2, 10);
          ctx.fillStyle = '#5b5880'; ctx.fillRect(X + a * 2, Y + 1, 16 - a * 2 - b * 2, 2); ctx.fillStyle = '#8c89b0'; ctx.fillRect(X + a * 2 + 1, Y + 1, Math.min(8, 14 - a * 2 - b * 2), 1);
          ctx.fillStyle = '#1b1929'; ctx.fillRect(X + a * 2, Y + 8, 16 - a * 2 - b * 2, 3); ctx.fillStyle = '#3f3b5a'; for (let s = 4; s < 14; s += 4) ctx.fillRect(X + s, Y + 5, 1, 1);
          return true;
        }
        return false;
      },
    },
    script: {
      init(G) { G.s = {}; },
      drawFG(ctx, G) {   // the vignette
        const VW = DD.VW, VH = DD.VH;
        const vg = ctx.createRadialGradient(VW / 2, VH * 0.5, VH * 0.35, VW / 2, VH * 0.5, VW * 0.65); vg.addColorStop(0, 'rgba(4,2,8,0)'); vg.addColorStop(1, 'rgba(4,2,8,0.4)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
      },
    },
  } });
})();
// ==== ART PASS (design/ART-PASS-BRIEF.md): three-tone edges, light, depth and a little life, layered over the set art above ====
;(function () {
  const L = window.LEVEL, th = L.theme, S = L.script || (L.script = {});
  const P = {
  hi: '255,190,230', hiK: { counter: '220,230,255', pouf: '200,196,255' }, mote: ['#e8c8ff', 22, 0.4], vig: 0,
  lip(A, X, Y, tx, ty, k, f) {   // aisle step lights along the lips, chasing slowly
    if (k !== 'tier' && k !== 'carpet' && k !== 'seat') return;
    if (tx % 2 === 0) { const on = (tx / 2 + (f >> 4)) % 3 === 0; A.R(X + 6, Y + 3, 4, 1, on ? '#ffcf70' : '#6a3a20'); if (on) A.R(X + 5, Y + 4, 6, 1, 'rgba(255,190,90,0.25)'); }
  },
  bg(ctx, G, A, Q) {
    const { c, VW, VH, f, lay } = Q, ay = 130 - c.y * 0.5;
    A.R(0, ay + 30, VW, 1, 'rgba(208,72,176,0.5)'); A.R(0, ay + 31, VW, 2, 'rgba(208,72,176,0.14)'); A.R(0, ay + 29, VW, 1, 'rgba(0,0,0,0.35)');   // the magenta LED cove along the wall
    lay(0.25, 1000, (X, i) => {   // brass wall sconces that pool warm light, one on the blink; an exit sign over a far door
      for (const o of [100,300,700,900]) {
        const fl = A.hash(i * 7 + o, 5) < 0.22 ? 0.7 + 0.3 * Math.sin(f / 4 + o) : 1, x = X + o;
        A.R(x + 1, ay - 2, 6, 3, '#2a1c22'); A.box(x + 2, ay - 12, 4, 10, '#c89a4a'); A.R(x + 3, ay - 11, 2, 2, '#ffe6b0');
        A.glow(x + 4, ay - 6, 38, '#ffb868', 0.5 * fl); A.cone(x + 4, ay + 1, 60, 24, '#ffb868', 0.1 * fl);
      }
      const e = X + 760; A.box(e, ay + 6, 22, 9, '#10281c'); DD.text('EXIT', e + 11, ay + 7, '#8dffae', 1, null, 'center'); A.glow(e + 11, ay + 11, 24, '#40ff80', 0.25);
    });
    
    const bx = DD.wx(32 * 16);   // three stage lights crossing the arena, slowly swinging
    for (const [dx, col, ph] of [[-80, '#d048b0', 0], [80, '#60b0d0', 2], [0, '#ffcf80', 4]]) { const sx = bx + dx + Math.sin(f / 70 + ph) * 16; A.cone(sx, -6, 200, 34, col, 0.11); A.glow(sx + (dx > 0 ? 24 : dx < 0 ? -24 : 0), DD.wy(336) - 2, 46, col, 0.22); }
    lay(0.55, 64, (X, i) => { if (A.hash(i, 9) < 0.5) A.R(X + 8, ay + 46, 10, 2, 'rgba(255,214,150,0.08)'); });
    const scx = Math.round(500 - c.x * 0.25) + 48, scy = Math.round(36 - c.y * 0.5) + 26;   // the screen: it throws a cool wash across the room, flickering like a film
    A.glow(scx, scy + 10, 150, '#58c8e0', 0.2 + 0.05 * Math.sin(f / 5) + 0.03 * Math.sin(f / 2.3)); A.glow(scx, scy, 54, '#c8f4ff', 0.18);
    for (const bxp of [60, 170]) {   // the projection booth ports along the back wall, each with a beam running to the screen
      const px = Math.round(bxp - c.x * 0.1), py = Math.round(16 - c.y * 0.5);
      A.box(px, py, 14, 8, '#2a2030', { outline: '#07050a' }); A.R(px + 3, py + 2, 8, 4, '#d8f4ff'); A.glow(px + 7, py + 4, 30, '#bfeaff', 0.35);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(190,235,255,' + (0.045 + 0.015 * Math.sin(f / 3 + bxp)) + ')'; ctx.beginPath(); ctx.moveTo(px + 6, py + 5); ctx.lineTo(px + 8, py + 5); ctx.lineTo(scx + 40, scy + 18); ctx.lineTo(scx - 40, scy + 18); ctx.fill(); ctx.restore();
    }
    lay(0.2, 74, (X, i) => { A.box(X + 20, 4, 12, 3, '#2a2030', { outline: '#07050a' }); A.glow(X + 26, 7, 16, '#ffd898', 0.3); });   // recessed ceiling cans down the room
    lay(0.42, 116, (X, i) => {   // a framed one-sheet on the back wall between the sconces, lit by a picture light
      if (A.hash(i, 77) < 0.35) return; const y = Math.round(ay - 4);
      A.box(X + 40, y, 22, 30, '#1a1018', { outline: '#07050a' }); A.R(X + 42, y + 2, 18, 26, A.mix(['#5a2a3a', '#2a4a5a', '#4a3a6a', '#5a4a2a'][i & 3], -0.2)); A.R(X + 45, y + 6, 12, 5, 'rgba(255,230,190,0.5)'); A.R(X + 46, y + 14, 10, 1, 'rgba(255,230,190,0.3)'); A.R(X + 46, y + 17, 10, 1, 'rgba(255,230,190,0.3)');
      A.R(X + 46, y - 3, 14, 2, '#c89a4a'); A.cone(X + 53, y - 2, 34, 18, '#ffd898', 0.12);
    });
    for (const wxx of [0, 61 * 16]) { const X = DD.wx(wxx), Y = DD.wy(0); if (X > VW || X + 48 < 0) continue; A.bulbs(X, Math.max(4, Y + 6), 48, 8, f, '#fffbd0', '#8a5a1c', false); }

  },
};
  const t0 = th.tile, b0 = th.bg, f0 = S.drawFG, m0 = S.drawMid;
  th.tile = function (ctx, k, X, Y, tx, ty) {
    const A = DD.art, K = DD.kindAt, KD = L.KINDS || {}, kd = KD[k];
    let r = t0 ? t0.apply(this, arguments) : false;
    if (!kd) return r;
    if (!r) { const c = th.tiles && th.tiles[k]; if (!c) return false; A.R(X, Y, 16, 16, c[0]); A.tex(X, Y, 16, 16, c[0], 0.07, (tx * 3 + ty) & 7); r = true; }
    const ex = (x, y) => { const n = K(x, y); return !n || !KD[n]; }, hi = 'rgba(' + ((P.hiK && P.hiK[k]) || P.hi) + ',', dk = 'rgba(0,0,0,';
    if (ex(tx, ty - 1)) { A.R(X, Y, 16, 1, hi + '0.7)'); A.R(X, Y + 1, 16, 1, hi + '0.22)'); if (P.lip) P.lip(A, X, Y, tx, ty, k, DD.G ? DD.G.frame : 0); }
    if (ex(tx, ty + 1)) { A.R(X, Y + 15, 16, 1, dk + '0.6)'); A.R(X, Y + 14, 16, 1, dk + '0.22)'); }
    if (kd === 1) {
      if (ex(tx - 1, ty)) A.R(X, Y + 1, 1, 15, hi + '0.3)');
      if (ex(tx + 1, ty)) { A.R(X + 15, Y, 1, 16, dk + '0.5)'); A.R(X + 14, Y + 1, 1, 15, dk + '0.2)'); }
    }
    return r;
  };
  th.bg = function (ctx, G) {
    b0.apply(this, arguments);
    const c = G.cam, VW = DD.VW, VH = DD.VH, A = DD.art, f = G.frame;
    const lay = (k, s, fn) => { for (let i = Math.floor(c.x * k / s) - 1; ; i++) { const X = Math.round(i * s - c.x * k); if (X > VW) break; fn(X, i); } };
    ctx.save(); P.bg(ctx, G, A, { c, VW, VH, f, lay }); ctx.restore();
  };
  S.drawMid = function (ctx, G) { if (m0) m0.apply(this, arguments); if (P.mid) { ctx.save(); P.mid(ctx, G, DD.art); ctx.restore(); } };
  S.drawFG = function (ctx, G) {
    if (f0) f0.apply(this, arguments); const A = DD.art;
    if (P.mote) A.motes(G, P.mote[0], P.mote[1], P.mote[2]);
    if (P.vig) A.vignette(P.vig);
  };
})();
