// World 9 boss: T. AMATO (S13-14), the On Demand host, in the navy podcast studio. Hand-written: the arena, the boss, the lotto
// balls, Grain Water jets, Dumbledore Gregg's predictions, and the phase-2 set shift to movie scenes.
// Phase 1 (each attack opens with a red flash and a name over his head; he is only open when he is dizzy):
//   LOTTO   he tosses three Amato Lotto balls in arcs. Walk under them; he is dizzy after the last.
//   WATER   he slams the Grain Water jug and jets erupt across the floor after a bubble warning. Jump them; he is dizzy after.
//   CHARGE  he takes a run at you. Jump him, or let him hit the wall (and stun himself.
// Phase 2, "THE PREDICTIONS" (at 3 pips): the set shifts to film scenes and Dumbledore Gregg takes the booth. He predicts three
// spots on the floor (gold runes), and a column of light lands on each after a beat. Stand next to T. Amato and step away:
// if his own prediction lands on him, it counts as a hit. Lotto fires five balls, the jets multiply, he is faster.
(function () {
  const IMG = DD.IMG, ok = DD.ready, VW = DD.VW, VH = DD.VH, TS = 16;
  const say = n => { if (typeof DD.lines === 'function') DD.lines(n); };
  const img = (ctx, n, x, y) => { if (ok(n)) ctx.drawImage(IMG[n], Math.round(x), Math.round(y)); };
  const imgR = (ctx, n, sx, sy, sw, sh, x, y) => { if (ok(n)) ctx.drawImage(IMG[n], sx, sy, sw, sh, Math.round(x), Math.round(y), sw, sh); };
  const glow = (ctx, x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const WH = {};
  const white = n => {
    if (!WH[n] && ok(n) && typeof document !== 'undefined' && document.createElement) {
      const im = IMG[n], c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); WH[n] = c;
    }
    return WH[n];
  };
  const flash = (ctx, n, X, Y, flip, a, rot) => {
    const w = white(n); if (!w) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(X), Math.round(Y)); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(w, -Math.floor(w.width / 2), -w.height); ctx.restore();
  };
  const ARENA = [2, 62], FLOOR_Y = 21 * TS;

  // ---------------------------------------------------------------------------------------------- projectiles and hazards
  DD.defineEntity('amatoBall', {   // an Amato Lotto ball: arcs, bounces once off the floor, hurts on touch
    update(e) {
      e.vy += 0.2; e.ang = (e.ang || 0) + 0.2;
      const mx = DD.moveX(e, e.vx, false), my = DD.moveY(e, e.vy, false);
      if (my && e.vy > 0 && !e.bounced) { e.bounced = true; e.vy = -2.8; DD.dust(DD.cx(e), DD.bot(e), 3, 1); }
      else if (my) e.vy = 0;
      if (mx || --e.life <= 0) { e.dead = true; DD.stars(DD.cx(e), e.y + 4, 4, '#fff'); }
    },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, X + 5, Y + 5, 12, e.k === 0 ? '255,80,60' : e.k === 2 ? '255,210,90' : '255,255,255', 0.22); ctx.restore();
      imgR(ctx, 'w9_balls', (e.k || 0) * 10, 0, 10, 10, X, Y);
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(X + 5 + Math.cos(e.ang) * 3), Math.round(Y + 5 + Math.sin(e.ang) * 3), 1, 1);
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); e.dead = true; DD.stars(DD.cx(e), e.y + 4, 5, '#fff'); },
  });
  DD.defineEntity('amatoJet', {   // a Grain Water jet: bubbles 40 frames, climbs 20, holds 50, falls 20
    spawn: t => ({ x: t.x, y: t.y, w: 14, h: 0, base: t.y, t: 0, dur: 150 }),
    update(e) {
      e.t++; const T = e.t;
      e.h = T < 40 ? 0 : T < 60 ? Math.round((T - 40) / 20 * 80) : T < 110 ? 80 : T < 130 ? Math.round((1 - (T - 110) / 20) * 80) : 0;
      e.y = e.base - e.h; if (e.t >= e.dur) e.dead = true;
    },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.base), f = Math.floor(e.t / 5) % 2;
      if (e.t < 40) {
        const k = e.t / 40; ctx.fillStyle = 'rgba(176,124,64,' + (0.18 + 0.32 * k) + ')'; ctx.beginPath(); ctx.ellipse(X + 7, Y - 1, 9 + k * 5, 2 + k * 2, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 5; i++) { const ph = (e.t * 0.8 + i * 9) % 18; ctx.fillStyle = i % 2 ? '#c8a46a' : '#f0dcb4'; ctx.fillRect(Math.round(X + 1 + i * 2.6), Math.round(Y - 3 - ph), 2, 2); }
      }
      if (e.h > 0 && ok('w9_jet')) {
        const top = DD.wy(e.y); ctx.save(); ctx.beginPath(); ctx.rect(X - 2, top + 5, 18, e.h); ctx.clip();
        for (let y = Y - 16 + ((e.t * 3) % 16); y > top - 16; y -= 16) imgR(ctx, 'w9_jet', f * 12, 0, 12, 16, X + 1, y);
        for (let y = Y + ((e.t * 3) % 16); y > Y - 16; y -= 16) imgR(ctx, 'w9_jet', f * 12, 0, 12, 16, X + 1, y);
        ctx.restore(); imgR(ctx, 'w9_jet', f * 12, 16, 12, 12, X + 1, top - 4);
      }
    },
    stomp: () => false,
    touch(e) { if (e.h > 10) DD.hurt(DD.cx(e)); },
  });
  DD.defineEntity('amatoMark', {   // a prediction: a gold rune on the floor for 60 frames, then a column of light for 35
    spawn: t => ({ x: t.x, y: FLOOR_Y, w: 24, h: 0, base: FLOOR_Y, t: 0, dur: 110, mark: true }),
    update(e) {
      e.t++;
      e.h = e.t >= 60 && e.t < 95 ? 96 : 0; e.y = e.base - e.h;
      if (e.t === 60) { DD.SFX.slam(); const B = DD.boss, bo = DD.bodies.find(b => b.def && b.def.boss); if (bo && B && !B.dead && B.inv <= 0 && DD.ov({ x: e.x, y: e.base - 96, w: e.w, h: 96 }, bo)) { DD.hitBoss(1); DD.float(DD.cx(bo), bo.y - 6, 'IT CAME TRUE!', '#ffe680'); bo.st = 'hurt'; bo.t = 0; } }
      if (e.t >= e.dur) e.dead = true;
    },
    draw(e, ctx, G) {
      const X = DD.wx(e.x) + 12, Y = DD.wy(e.base);
      if (e.t < 60) {
        const k = e.t / 60, p = 0.5 + 0.5 * Math.sin(e.t / 4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, X, Y - 2, 22 + k * 6, '255,214,90', 0.2 + 0.2 * k); ctx.restore();
        ctx.strokeStyle = 'rgba(255,230,140,' + (0.45 + 0.4 * p) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(X, Y - 1, 12 + (1 - k) * 8, 3 + (1 - k) * 2, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(X, Y - 1, 7, 2, 0, 0, 7); ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = e.t / 12 + i * 1.57; ctx.fillStyle = '#fff2a0'; ctx.fillRect(Math.round(X + Math.cos(a) * 10), Math.round(Y - 3 - ((e.t * 0.6 + i * 6) % 22)), 1, 2); }
        if (e.t > 24) DD.text('2P', Math.round(X), Math.round(Y - 16 - Math.sin(e.t / 6) * 2), '#ffe680', 1, '#000', 'center');
      } else if (e.t < 100) {
        const k = e.t < 95 ? 1 : 1 - (e.t - 95) / 15;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(X - 12, 0, X + 12, 0); g.addColorStop(0, 'rgba(255,214,90,0)'); g.addColorStop(0.5, 'rgba(255,248,210,' + 0.8 * k + ')'); g.addColorStop(1, 'rgba(255,214,90,0)');
        ctx.fillStyle = g; ctx.fillRect(X - 12, Y - 110, 24, 110); glow(ctx, X, Y, 30, '255,230,140', 0.5 * k); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,' + k + ')'; ctx.fillRect(Math.round(X - 3), Math.round(Y - 110), 6, 110);
      }
    },
    stomp: () => false,
    touch(e) { if (e.h > 20) DD.hurt(DD.cx(e)); },
  });

  function predict(e, G) {   // three runes: under the Dot, and a step either side
    const B = DD.boss, P = DD.cx(G.pl), lo = B.arena[0] + 4, hi = B.arena[1] - 28, c = x => Math.max(lo, Math.min(hi, x));
    for (const dx of [-44, 0, 44]) DD.addEntity('amatoMark', { x: c(P + dx - 12), y: FLOOR_Y, w: 24, h: 0, base: FLOOR_Y, t: 0, dur: 110, mark: true });
    G.s.conj = 100; if (DD.SFX.wind) DD.SFX.wind();
  }
  // ---------------------------------------------------------------------------------------------- T. Amato
  DD.defineEntity('amato_boss', {
    boss: true,
    spawn: t => ({ x: t.x, y: t.y + 32 - 46, w: 30, h: 46, vx: 0, vy: 0, dir: -1, st: 'idle', t: 0, n: 0, atk: null, lastHp: 6, dt: 0, kx: 0 }),
    update(e, G) {
      const B = DD.boss; if (!B) return;
      if (B.dead) { e.dt++; e.vy = Math.min(e.vy + 0.4, 6); DD.moveY(e, e.vy, false); if (e.dt % 7 === 0) DD.stars(DD.cx(e), e.y + 10, 3, '#ffe680'); return; }
      if (!B.engaged) return;
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      e.t++;
      if (B.hp < e.lastHp) { e.lastHp = B.hp; e.st = 'hurt'; e.t = 0; e.vx = (P < me ? 1 : -1) * 2.4; }   // any hit: flinch, slide away
      if (e.st === 'idle') { e.st = 'walk'; e.t = 0; }
      if (e.st === 'walk') {                           // roll at the Dot, then wind up the next attack
        e.dir = P < me ? -1 : 1; if (Math.abs(P - me) > 34) DD.moveX(e, e.dir * (0.5 + ph * 0.28), false);   // he rolls up to arm's length and stops: pinned against the wall you are never stood on
        if (e.t > 90 - ph * 14) { e.st = 'wind'; e.t = 0; const seq = ph >= 1 ? ['lotto', 'predict', 'water', 'charge', 'predict'] : ['lotto', 'water', 'charge']; e.atk = seq[e.n++ % seq.length]; e.dir = P < me ? -1 : 1; }
      } else if (e.st === 'wind') {                    // telegraph: 40 frames of rearing up, flashing red, the name over his head
        e.vx = 0; if (e.atk === 'charge') DD.moveX(e, -e.dir * 0.3, false);
        if (e.t >= 40) { e.t = 0; e.st = e.atk; if (e.atk === 'predict') predict(e, G); }
      } else if (e.st === 'lotto') {                   // three balls (five in phase 2), then the opening
        const count = ph >= 1 ? 5 : 3, gap = ph >= 1 ? 17 : 20;
        if (e.t % gap === 10 && Math.floor(e.t / gap) < count) {
          const i = Math.floor(e.t / gap), vx = e.dir * (1.5 + ph * 0.5) * (i < 2 ? 1 : 1.3) * (i % 2 ? 0.8 : 1);
          DD.addEntity('amatoBall', { x: me - 5 + e.dir * 16, y: e.y - 6, w: 10, h: 10, vx, vy: -4.4, life: 180, bounced: false, k: i % 3 });
        }
        if (e.t > count * gap + 20) { e.st = 'stun'; e.t = 0; for (const b of DD.bodies) if (b.kind === 'amatoBall') b.life = Math.min(b.life, 20); }
      } else if (e.st === 'water') {                   // he slams the jug: jets across the floor
        if (e.t === 10) {
          const spots = ph >= 1 ? [e.x - 56, e.x - 8, e.x + 40, e.x + 88] : [e.x - 32, e.x + 26];
          for (const sx of spots) {
            const lo = B.arena[0] + 4, hi = B.arena[1] - 18, x = Math.max(lo, Math.min(hi, sx));
            DD.addEntity('amatoJet', { x, y: FLOOR_Y, w: 14, h: 0, base: FLOOR_Y, t: 0, dur: 150 });
          }
          DD.SFX.thud(); G.shake = Math.max(G.shake, 4);
        }
        if (e.t > 130) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'charge') {                  // straight drive across the studio
        const blocked = DD.moveX(e, e.dir * (3 + ph * 0.7), false);
        if (e.t % 5 === 0) DD.dust(me - e.dir * 12, DD.bot(e), 2, 0.8);
        if (blocked || e.t > 70) { if (blocked) { G.shake = Math.max(G.shake, 8); DD.SFX.slam(); DD.stars(me + e.dir * 14, e.y + 8, 10, '#ffe680'); } e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'predict') {                 // Dumbledore Gregg points; the runes are down. Stand back from him...
        e.vx = 0; if (e.t > 100) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'hurt') {
        DD.moveX(e, e.vx, false); e.vx *= 0.9; if (e.t > 45) { e.st = 'walk'; e.t = 0; e.vx = 0; }
      } else if (e.st === 'stun') {                    // the opening: he is dizzy, stomp him now
        if (e.t > 116 - ph * 20) { e.st = 'walk'; e.t = 0; }   // 1.9 s open in phase 1, 1.6 s in phase 2
      }
      e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
      const lo = B.arena[0], hi = B.arena[1]; if (e.x < lo) e.x = lo; if (e.x + e.w > hi) e.x = hi - e.w;
    },
    stomp(e, G) {   // open only while dizzy; otherwise he is the hazard
      const B = DD.boss; if (!B || B.dead) return false;
      if (e.st !== 'stun') return false;
      if (B.inv > 0) return true;
      DD.hitBoss(1); e.st = 'hurt'; e.t = 0; e.lastHp = B.hp; e.vx = (DD.cx(G.pl) < DD.cx(e) ? 1 : -1) * 2.4; G.s.hitFx = 14;
      return true;
    },
    touch(e, G) { const B = DD.boss; if (B && !B.dead && B.engaged && e.st !== 'hurt' && e.st !== 'stun') DD.hurt(DD.cx(e)); },
    draw(e, ctx, G) {
      const B = DD.boss, X = DD.wx(e.x + e.w / 2), Y = DD.wy(e.y + e.h), flip = e.dir < 0;
      const bob = e.st === 'walk' ? Math.round(Math.sin(e.t / 6) * 1) : 0;
      if (B && B.dead) {   // defeat: he spins up and off, fading, an "OFF AIR" collapse follows in the foreground
        const k = Math.min(1, e.dt / (B.cfg.endDelay || 100));
        DD.spr('w9_amato_2', X, Y - Math.sin(k * 3.1) * 30, flip, 1, 1, e.dt * 0.25, Math.max(0, 1 - k)); return;
      }
      let f = 0, rot = 0, sx = 1, sy = 1;
      if (e.st === 'hurt') f = 2;
      else if (e.st === 'stun') f = 2;
      else if (e.st === 'wind') { f = e.atk === 'lotto' ? 1 : 0; if (e.atk === 'water') sy = 0.92; if (e.atk === 'charge') rot = -0.12 * (flip ? -1 : 1); }
      else if (e.st === 'lotto') f = e.t % 20 < 10 ? 1 : 0;
      else if (e.st === 'predict') f = 1;
      else if (e.st === 'charge') rot = 0.12 * (flip ? -1 : 1);
      const name = 'w9_amato_' + f;
      DD.spr(name, X, Y + bob, flip, sx, sy, rot);
      if (e.st === 'wind') {   // the red flash and the attack's name
        if (Math.floor(e.t / 4) % 2) { ctx.save(); ctx.globalCompositeOperation = 'source-over'; flash(ctx, name, X, Y + bob, flip, 0.4, rot); ctx.restore(); ctx.fillStyle = 'rgba(255,60,50,0.28)'; ctx.fillRect(Math.round(X - 22), Math.round(Y - 52), 44, 52); }
        const lab = { lotto: 'AMATO LOTTO!', water: 'GRAIN WATER!', charge: 'THE CHARGER!', predict: 'A PREDICTION!' }[e.atk];
        DD.text(lab, Math.round(X), Math.round(Y - 62), '#ff6a58', 1, '#000', 'center');
      }
      if (e.st === 'stun') {   // dizzy: stars circle his head, STOMP blinks
        for (let i = 0; i < 3; i++) { const a = e.t / 7 + i * 2.1; DD.text('*', Math.round(X + Math.cos(a) * 14), Math.round(Y - 54 + Math.sin(a) * 3), '#ffe680', 1, '#000', 'center'); }
        if (Math.floor(e.t / 10) % 2) DD.text('STOMP!', Math.round(X), Math.round(Y - 66), '#fff6c0', 1, '#000', 'center');
      }
      if (B && B.inv > 0 && Math.floor(B.inv / 3) % 2) flash(ctx, name, X, Y + bob, flip, 0.85, rot);   // the hurt flash
    },
  });

  // ---------------------------------------------------------------------------------------------- the level
  window.LEVEL = {
    id: '9-boss', name: 'T. AMATO', sub: 'ON CINEMA ON DEMAND', world: 9,
    W: 64, H: 24, FLOOR: 21,
    SOLID: [['slate', 0, 21, 64, 3], ['ledge', 12, 18, 6, 1], ['ledge', 46, 18, 6, 1], ['ledge', 29, 12, 6, 1]],
    KINDS: { slate: 1, desk: 1, ledge: 2 },
    THINGS: [['dot', 1, 20], ['amato_boss', 50, 19]],
    POPCORN: [[4, 20, 6], [12, 17, 6], [46, 17, 6], [29, 11, 6], [16, 20, 4], [38, 20, 4], [24, 14, 3], [36, 14, 3], [22, 20, 3], [53, 20, 4], [8, 18, 2], [56, 18, 2], [42, 20, 3]],
    sprites: ['w9_tiles', 'w9_panel', 'w9_tvlogo', 'w9_shelf_a', 'w9_shelf_b', 'w9_shelf_c', 'w9_boom', 'w9_deskprops', 'w9_jet', 'w9_balls', 'w9_star',
      'w9_amato_0', 'w9_amato_1', 'w9_amato_2', 'w9_dumble_0', 'w9_dumble_1', 'w9_dbooth', 'w9_scenes', 'w9_seat_gregg14', 'w9_joey_0', 'w9_jgate'],
    portraits: { amato: 'w9_portrait_amato', dumble: 'w9_portrait_dumble' },
    names: { amato: 'T. AMATO', dumble: 'DUMBLEDORE GREGG' },
    intro: { bg: '#0e1630', fg: '#fff0c0', edge: '#f08a2a' },
    lines: {   // design/VOICE.md. Sources: the S14 wiki pages (T. thanks the audience for supporting him and his DRCS, a blessing; AmatoCon; Dumbledore's Predictions: Oppenheimer 2P)
      start: [['gregg', 'HEY GUYS. THIS IS ON CINEMA ON DEMAND.']],
      boss: [['amato', 'THANK YOU FOR SUPPORTING ME AND MY DRCS. IT IS A BLESSING.']],
      bossPhase: [['dumble', 'I SEE AN OPPENHEIMER 2P.']],
      bossDefeat: [['amato', 'SEE YOU AT AMATOCON.']],
    },
    boss: {
      name: 'T. AMATO', hp: 6, arena: ARENA, inv: 60, endDelay: 110,
      phases: [{ at: 3, say: "DUMBLEDORE'S PREDICTIONS", sub: 'OPPENHEIMER 2P', enter(G, B) { G.s.shiftT = 1; G.s.conj = 60; } }],
      onHit(G, B) { G.s.hitFx = 14; },
      onDefeat(G, B) {
        DD.banner('OFF AIR', 100, 'SEE YOU AT AMATOCON');
        for (let i = 0; i < 22; i++) DD.drop({ x: 30 * TS, y: 14 * TS, vx: (i - 11) * 0.45, vy: -3 - (i % 4), life: 500, wait: 12 });
      },
    },
    theme: {
      tiles: { slate: ['#2c3346', '#7a8aa8', '#161a2a'], desk: ['#2a3a62', '#4e6aa0', '#131c34'], ledge: ['#c9c2d0', '#ece6f2', '#7a7286'] },
      tile(ctx, k, X, Y, tx, ty) {
        if (!ok('w9_tiles')) return false;
        const K = DD.kindAt, lip = K(tx, ty - 1) !== k, v = ((tx * 5 + ty * 3) % 4 + 4) % 4, T = IMG.w9_tiles, put = c => ctx.drawImage(T, c * 16, 0, 16, 16, X, Y, 16, 16);
        const edge = lit => { const A = DD.art; if (lip) { A.R(X, Y, 16, 1, 'rgba(255,255,255,' + lit + ')'); A.R(X, Y + 1, 16, 1, 'rgba(255,255,255,0.12)'); } if (K(tx - 1, ty) !== k) A.R(X, Y, 1, 16, 'rgba(255,255,255,0.16)'); if (K(tx + 1, ty) !== k) A.R(X + 15, Y, 1, 16, 'rgba(0,0,0,0.3)'); if (K(tx, ty + 1) !== k) A.R(X, Y + 15, 16, 1, 'rgba(0,0,0,0.35)'); };
        if (k === 'slate') { put(lip ? 8 + v : 12 + v); if (!lip) { let d = 1; while (K(tx, ty - d) === k) d++; ctx.fillStyle = 'rgba(8,4,18,' + Math.min(0.55, 0.12 * d) + ')'; ctx.fillRect(X, Y, 16, 16);
            const A = DD.art;   // art pass: the studio floor's cut-away: a kick plate, then cable runs with gaffer tape, then service vents, darker and calmer with depth
            if (d === 1) { A.R(X, Y + 1, 16, 3, 'rgba(110,140,220,0.16)'); A.R(X, Y + 4, 16, 1, 'rgba(0,0,0,0.35)'); }
            else if (d === 2) { A.R(X, Y + 5, 16, 3, '#06080f'); A.R(X, Y + 5, 16, 1, '#2a3458'); A.R(X, Y + 10, 16, 1, tx % 3 === 0 ? '#7a1a22' : '#1a3a7a'); if (tx % 7 === 3) { A.R(X + 3, Y + 1, 9, 13, 'rgba(160,170,190,0.5)'); for (let q = 3; q < 14; q += 3) A.R(X + 3, Y + q, 9, 1, 'rgba(0,0,0,0.25)'); } }
            else if (tx % 9 === 4) { A.R(X + 1, Y + 3, 14, 10, '#04050a'); for (let q = 0; q < 5; q++) A.R(X + 2, Y + 4 + q * 2, 12, 1, '#161c34'); } }
          edge(0.4); return true; }
        if (k === 'desk') { put(lip ? 32 : (tx % 2 ? 34 : 35)); edge(0.35); return true; }
        if (k === 'ledge') { put(36); edge(0.5); return true; }
        return false;
      },
      bg(ctx, G, DD) {
        const c = G.cam, fy = DD.wy(FLOOR_Y), s = G.s, shift = Math.min(1, (s.shiftT || 0) / 50);
        studio(ctx, G, c, fy, 1 - shift);
        if (shift > 0) movie(ctx, G, c, fy, shift);
        booth(ctx, G, c, fy, shift);
      },
    },
    script: {
      init(G) { G.s.shiftT = 0; G.s.conj = 0; G.s.hitFx = 0; },
      update(G) { const s = G.s; if (G.frame === 8 && typeof location !== 'undefined' && /w9hit=(\d)/.test(location.search || '')) DD.hitBoss(+RegExp.$1);   // ?w9hit=3 jumps to phase 2 for screenshots
         if (s.shiftT > 0 && s.shiftT < 50) s.shiftT++; if (s.conj > 0) s.conj--; if (s.hitFx > 0) s.hitFx--; },
      drawFG(ctx, G) {
        const B = DD.boss;
        if (B && B.dead) {   // the broadcast cuts: bars close in, a white line, then black
          const k = Math.min(1, 1 - (B.endT || 0) / (B.cfg.endDelay || 100)), h = k * VH / 2;
          ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, VW, h); ctx.fillRect(0, VH - h, VW, h);
          if (k > 0.6) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, (k - 0.6) * 3) + ')'; ctx.fillRect(Math.round(VW * (0.5 - (k - 0.6) * 1.2)), Math.round(VH / 2) - 1, Math.round(VW * (k - 0.6) * 2.4), 2); }
        }
        DD.art.motes(G, G.s.shiftT > 0 ? '#ffe6c0' : '#bcd4ff', 14, 0.4); DD.art.vignette(0.38);
        if (G.s.hitFx > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (G.s.hitFx / 14) * 0.25 + ')'; ctx.fillRect(0, 0, VW, VH); }
      },
    },
  };

  // art pass: a background person's idle life: a head bob now and then, a blink (the eyes painted over in skin), a hop when the boss is hit, a wince when a Dot is hurt, a rattle at a slam
  function live(ctx, G, im, X, Y, seed, o) {
    const A = DD.art, f = G.frame, h = A.hash(seed, 5), cheer = G.flashAt != null && f - G.flashAt < 30, wince = !!(G.pl && G.pl.inv > 0), rat = G.dipAt != null && f - G.dipAt < 14 ? (f >> 1) & 1 : 0;
    const nod = ((f + (h * 300 | 0)) % 150) < 8 ? 1 : 0, hop = cheer ? -(Math.abs(Math.sin((f - G.flashAt) / 4)) * 2 | 0) : 0, lean = wince ? 1 : 0, blink = ((f + (h * 400 | 0)) % (190 + (h * 120 | 0))) < 5 || wince, hh = o.headH;
    ctx.drawImage(im, 0, hh, im.width, im.height - hh, Math.round(X) + rat, Math.round(Y) + hh + hop, im.width, im.height - hh);
    ctx.drawImage(im, 0, 0, im.width, hh, Math.round(X) + lean + rat, Math.round(Y) + nod + hop, im.width, hh);
    if (blink) for (const e of o.eyes) A.R(Math.round(X) + lean + rat + e[0], Math.round(Y) + nod + hop + e[1], e[2], 1, o.skin);
  }
  // the navy On Demand studio: LED panels, the wall TV, shelves, boom mics, the host desk, spot beams
  function studio(ctx, G, c, fy, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, fy - 330, 0, fy); g.addColorStop(0, '#0a1230'); g.addColorStop(1, '#1c2c58'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    if (ok('w9_panel')) { const ox = -Math.round(c.x * 0.3) % 48; for (let k = 0; k < 3; k++) for (let x = ox - 48; x < VW + 48; x += 48) ctx.drawImage(IMG.w9_panel, x, Math.round(fy - 8 - 112 * (k + 1) + 8)); }
    const t = ctx.createLinearGradient(0, 0, VW, 0); t.addColorStop(0, 'rgb(130,160,240)'); t.addColorStop(1, 'rgb(150,180,255)');
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = t; ctx.fillRect(0, fy - 380, VW, 380); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ox = -Math.round(c.x * 0.3) % 48;
    for (let x = ox - 48; x < VW + 48; x += 48) { const l = ctx.createLinearGradient(x, 0, x + 26, 0); l.addColorStop(0, 'rgba(70,150,255,0.22)'); l.addColorStop(1, 'rgba(70,150,255,0)'); ctx.fillStyle = l; ctx.fillRect(x, 0, 26, VH); }
    ctx.restore();
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, Math.round(-c.y), VW, 9);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let x = 0; x < 64 * TS; x += 112) { const X = DD.wx(x + 40); if (X < -80 || X > VW + 80) continue; ctx.fillStyle = '#2a2e48'; ctx.fillRect(X, -c.y + 9, 8, 5); const bg = ctx.createLinearGradient(0, -c.y + 14, 0, fy); bg.addColorStop(0, 'rgba(190,215,255,0.11)'); bg.addColorStop(1, 'rgba(190,215,255,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(X + 1, -c.y + 14); ctx.lineTo(X + 7, -c.y + 14); ctx.lineTo(X + 44, fy); ctx.lineTo(X - 36, fy); ctx.fill(); }
    ctx.restore();
    { const A = DD.art, f = G.frame, o5 = Math.round(c.x * 0.5);   // art pass: studio cameras deep in the room with blinking tally lights, a lit stage foot, truss lamps with glow
      for (let i = Math.floor(o5 / 240) - 1; i < Math.floor(o5 / 240) + 4; i++) { if (A.hash(i, 21) < 0.3) continue; const X = i * 240 - o5 + 30, Y = fy - 46, col = '#10183a';
        A.R(X + 9, Y + 22, 3, 24, '#0a1030'); A.R(X + 3, Y + 44, 15, 2, '#0a1030'); A.box(X, Y + 6, 22, 16, col, { outline: '#060a1c' }); A.R(X + 22, Y + 10, 6, 8, '#0a1030'); A.R(X + 23, Y + 12, 2, 4, '#7ab0ff'); A.R(X + 3, Y + 2, 5, 3, ((i + Math.floor(f / 45)) % 3 === 0) ? '#ff3030' : '#4a1010');
        { const ox = X - 11, cheer = G.flashAt != null && f - G.flashAt < 30, hop = cheer ? -(Math.abs(Math.sin((f - G.flashAt) / 3)) * 2 | 0) : 0, lk = G.pl && G.pl.inv > 0 ? 1 : 0, nd = ((f + i * 53) % 170) < 6 ? 1 : 0;   // a camera operator behind each camera
          A.R(ox + 1, fy - 14, 3, 14, '#070c24'); A.R(ox + 5, fy - 14, 3, 14, '#070c24'); A.R(ox, fy - 31 + hop, 9, 17, '#0e1634'); A.R(ox, fy - 31 + hop, 9, 1, '#24306a');
          A.R(ox + 2 + lk, fy - 38 + hop + nd, 6, 6, '#5a4a40'); A.R(ox + 1 + lk, fy - 39 + hop + nd, 7, 3, '#10142a'); A.R(ox + lk, fy - 37 + hop + nd, 2, 3, '#1a2040'); if (cheer) A.R(ox - 2, fy - 38 + hop, 2, 9, '#0e1634'); } }
      A.R(0, fy - 5, VW, 5, 'rgba(90,150,255,0.16)'); A.R(0, fy - 1, VW, 1, 'rgba(160,200,255,0.45)');
      for (let x = 0; x < 64 * TS; x += 112) { const X = DD.wx(x + 40); if (X < -80 || X > VW + 80) continue; A.glow(X + 4, Math.round(-c.y) + 16, 18, '#fff2c0', 0.3); } }
    { const A = DD.art, f = G.frame;   // art pass: softbox lights on stands that bathe the desk, and an ON AIR sign that flickers when the set is slammed
      for (const tx of [19.5, 38.5, 58]) { const X = Math.round(DD.wx(tx * TS)); if (X < -30 || X > VW + 30) continue;
        A.R(X, fy - 64, 2, 64, '#0a1030'); A.R(X - 8, fy - 3, 18, 2, '#0a1030'); A.R(X - 4, fy - 6, 2, 4, '#0a1030'); A.R(X + 4, fy - 6, 2, 4, '#0a1030');
        A.box(X - 11, fy - 90, 24, 26, '#141c40', { outline: '#060a1c' }); A.R(X - 9, fy - 88, 20, 22, '#bcd0ff'); A.R(X - 9, fy - 88, 20, 2, '#e8f0ff'); for (let q = 0; q < 20; q += 5) A.R(X - 9 + q, fy - 88, 1, 22, 'rgba(60,90,160,0.3)'); A.glow(X + 1, fy - 77, 46, '#9ac0ff', 0.16); }
      const sx = Math.round(DD.wx(3 * TS)), on = !(G.dipAt != null && f - G.dipAt < 14 && f % 4 < 2); if (sx > -60 && sx < VW + 20) { const sy = fy - 130;
        A.R(sx + 8, sy - 20, 1, 20, '#0a1030'); A.R(sx + 36, sy - 20, 1, 20, '#0a1030'); A.box(sx, sy, 46, 14, '#2a0a12', { outline: '#0a0408' }); A.R(sx + 2, sy + 2, 42, 10, on ? '#7a1018' : '#3a0a10'); DD.text('ON AIR', sx + 23, sy + 4, on ? '#ff5a4a' : '#7a3a3a', 1, null, 'center'); if (on) A.glow(sx + 23, sy + 7, 40, '#ff3a2a', 0.2); } }
    const at = (n, tx, dy) => { if (ok(n)) ctx.drawImage(IMG[n], Math.round(DD.wx(tx * TS)), Math.round(fy - IMG[n].height + dy)); };
    at('w9_tvlogo', 28, -92); at('w9_shelf_a', 14, -64); at('w9_shelf_b', 44, -64); at('w9_shelf_c', 8, -96); at('w9_shelf_c', 52, -96); at('w9_boom', 22, -154); at('w9_boom', 38, -154);
    // the host desk at the back, with the three of them behind it
    const X0 = DD.wx(24 * TS);
    if (X0 > -140 && X0 < VW + 20 && ok('w9_tiles')) {
      if (ok('w9_seat_gregg14')) live(ctx, G, IMG.w9_seat_gregg14, X0 + 22, fy - 32 - 14, 1, { headH: 9, eyes: [[9, 6, 2], [14, 6, 2]], skin: '#e4b890' });
      if (ok('w9_joey_0')) live(ctx, G, IMG.w9_joey_0, X0 + 94, fy - 32 - 26, 2, { headH: 15, eyes: [[11, 10, 2], [19, 10, 2]], skin: '#e2a276' });
      for (let i = 0; i < 8; i++) { imgR(ctx, 'w9_tiles', 32 * 16, 0, 16, 16, X0 + i * 16, fy - 32); imgR(ctx, 'w9_tiles', (i === 0 ? 35 : i === 7 ? 34 : 33) * 16, 0, 16, 16, X0 + i * 16, fy - 16); }
      img(ctx, 'w9_deskprops', X0 + 4, fy - 32 - 22); DD.text('HEI NETWORK', Math.round(X0 + 64), Math.round(fy - 11), '#cfe0ff', 1, '#0a1020', 'center');
      const A = DD.art; A.trim(X0, fy - 33, 128, '#6aa0ff'); A.bulbs(X0 + 2, fy - 36, 124, 12, G.frame, '#cfe4ff', '#2a4a8a'); A.glow(X0 + 64, fy - 40, 90, '#6aa0ff', 0.12);
    }
    { const A = DD.art, X = DD.wx(28 * TS); if (X > -100 && X < VW + 40) { A.glow(X + 24, fy - 92, 80, '#6aa0ff', 0.12); A.cone(X + 24, Math.round(-c.y) + 14, 160, 44, '#bcd4ff', 0.07); } }
    ctx.restore();
  }
  // phase 2: the studio becomes a movie set. Film-strip bars, three big scenes (dunes, the sea, the fireball), warm spotlights.
  function movie(ctx, G, c, fy, a) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, fy - 330, 0, fy); g.addColorStop(0, '#14081e'); g.addColorStop(1, '#4a2230'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    const scr = (tx, i) => {
      const X = Math.round(DD.wx(tx * TS)), Y = Math.round(fy - 138); if (X < -130 || X > VW + 20 || !ok('w9_scenes')) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, X + 52, Y + 34, 90, i === 0 ? '255,170,80' : i === 1 ? '90,160,255' : '255,110,50', 0.18); ctx.restore();
      ctx.fillStyle = '#0a0610'; ctx.fillRect(X - 5, Y - 5, 114, 78);
      ctx.drawImage(IMG.w9_scenes, i * 52, 0, 52, 34, X, Y, 104, 68);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = Y; y < Y + 68; y += 2) ctx.fillRect(X, y, 104, 1);   // scanlines
      ctx.fillStyle = '#e8c860'; ctx.fillRect(X - 5, Y - 5, 114, 1); ctx.fillRect(X - 5, Y + 72, 114, 1);
    };
    scr(5, 0); scr(20, 1); scr(35, 2);
    { const A = DD.art; for (const tx of [5, 20, 35]) { const X = Math.round(DD.wx(tx * TS)), Y = Math.round(fy - 138); if (X < -130 || X > VW + 20) continue; A.trim(X - 5, Y - 8, 114, '#e0b040'); A.bulbs(X - 3, Y - 12, 110, 11, G.frame); A.bulbs(X - 3, Y + 76, 110, 11, G.frame + 5); A.bulbs(X - 8, Y - 4, 76, 11, G.frame + 3, '#fffbd0', '#8a5a1c', true); A.bulbs(X + 108, Y - 4, 76, 11, G.frame + 8, '#fffbd0', '#8a5a1c', true); }
      A.R(0, fy - 5, VW, 5, 'rgba(255,170,90,0.14)'); A.R(0, fy - 1, VW, 1, 'rgba(255,214,150,0.4)'); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';   // warm spots sweeping
    for (let i = 0; i < 3; i++) { const sx = DD.wx((14 + i * 22) * TS + Math.sin(G.frame / 70 + i * 2) * 40); const bg = ctx.createLinearGradient(0, 0, 0, fy); bg.addColorStop(0, 'rgba(255,200,130,0.16)'); bg.addColorStop(1, 'rgba(255,200,130,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(sx - 4, 0); ctx.lineTo(sx + 4, 0); ctx.lineTo(sx + 50, fy); ctx.lineTo(sx - 50, fy); ctx.fill(); }
    ctx.restore();
    { const A = DD.art; for (let i = 0; i < 3; i++) { const sx = DD.wx((14 + i * 22) * TS + Math.sin(G.frame / 70 + i * 2) * 40); A.glow(sx, Math.round(-c.y) + 16, 16, '#ffe6b0', 0.3); } }
    ctx.fillStyle = '#0a0610'; ctx.fillRect(0, Math.round(-c.y), VW, 14);
    const off = -Math.round(G.frame * 0.6 + c.x * 0.5) % 12; ctx.fillStyle = '#f2e0c0'; for (let x = off - 12; x < VW + 12; x += 12) ctx.fillRect(x, Math.round(-c.y) + 4, 6, 6);
    ctx.restore();
  }
  // Dumbledore Gregg's booth drops in at phase 2; he raises his hand to predict
  function booth(ctx, G, c, fy, shift) {
    if (shift <= 0 || !ok('w9_dbooth')) return;
    const drop = (1 - shift) * -60, X = Math.round(DD.wx(54 * TS)), Y = Math.round(fy - 124 + drop), B = DD.boss;
    ctx.save(); ctx.globalAlpha = Math.min(1, shift * 1.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, X + 42, Y + 30, 70, '255,214,120', 0.2); ctx.restore();
    ctx.drawImage(IMG.w9_dbooth, X, Y);
    const conj = G.s.conj > 0, f = conj ? 1 : 0;
    if (ok('w9_dumble_' + f)) {
      const im = IMG['w9_dumble_' + f]; ctx.drawImage(im, X + 42 - 17 - (f ? 0 : 0), Y + 52 - im.height + (conj ? Math.round(Math.sin(G.frame / 5) * 1) : 0));
    }
    if (conj) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, X + 62, Y + 8, 26, '255,200,255', 0.3 + 0.2 * Math.sin(G.frame / 4)); ctx.restore(); DD.text('OPPENHEIMER 2P', X + 42, Y - 6, '#ffe680', 1, '#000', 'center'); }
    ctx.restore();
  }
})();
