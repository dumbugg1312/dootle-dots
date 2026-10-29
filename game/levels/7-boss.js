// World 7 boss: OCX TIM, the comb-over in the black box with his Samsung Gear VR on. Hand-written (no Python layout): the arena, Tim, the headset he
// throws, the foam letters hung over the stage that he knocks loose (O, X and C fall as temporary platforms), his charge, and the FOR DA banner.
// Art: design/sprites/w7_sprites.py (Tim, 4 poses) and w7_set.py (set, falling letters). Reference: refs/contact-sheets/s10a.jpg, s10b.jpg.
// Attacks (each telegraphed for ~40 frames: a pose change, a flash, a "!" and dust):
//   1. TOSS: he rips the headset off and throws it in a low arc that bounces once. Jump it. (Phase 2: two headsets, a low one and a lob.)
//   2. KNOCK: a hung letter shakes, a shadow marks the floor for 45 frames, then it falls: a hazard on the way down, a platform afterwards.
//      (Phase 2: two letters, the one nearest you first.)
//   3. CHARGE: he rages across the arena. Jump it, or let him hit the wall, which stuns him.
//   4. LEAP (phase 2 only): he crouches on a pulsing ring marked on the floor where you stood, jumps, and lands on it in a shockwave that rolls along the floor both ways. Hop it.
// Every attack ends in a short 'cool' beat (harmless, he waits for the headset, the letters or the shockwave to clear) and then a stun of about 1.8 s (1.5 s in phase 2): the stomp window.
// Nothing hurts while he is stunned or cooling off, and he stops short of you when he walks, so you are never run into. Phase 2 ("HE WANTS THE DA", at 3 pips) adds the leap and a second headset/letter.
{
  const FL = 21 * 16, SLOTS = [10, 30, 50], CH = ['O', 'X', 'C'];
  const sil = {};   // white / red silhouettes of Tim's frames, made once, for the hit flash and the telegraph tint
  const silhouette = (name, col) => {
    const k = name + col; if (sil[k]) return sil[k];
    const im = DD.IMG[name];
    if (!DD.ready(name) || typeof document === 'undefined' || !document.createElement) return null;
    try {
      const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, cv.width, cv.height);
      return (sil[k] = cv);
    } catch (e) { return null; }
  };
  const drawImg = (ctx, img, cx, bottom, flip, rot, sy) => {   // an image anchored at its bottom-centre, optionally mirrored, tilted and squashed
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    ctx.save(); ctx.translate(Math.round(cx), Math.round(bottom)); if (rot) ctx.rotate(rot); ctx.scale(flip ? -1 : 1, sy || 1);
    ctx.drawImage(img, -Math.floor(w / 2), -h); ctx.restore();
  };

  DD.defineEntity('vrset', {   // the thrown headset: spins through a low arc, bounces once, and hurts on touch
    update(e, G) {
      e.vy = Math.min(e.vy + 0.25, 7); e.spin += e.vx * 0.12;
      if (DD.moveX(e, e.vx, false)) e.dead = true;
      if (DD.moveY(e, e.vy, false)) { if (e.bounces++ < 1) { e.vy = -2.4; DD.SFX.thud && DD.SFX.thud(); DD.dust(DD.cx(e), e.y + e.h, 4, 1.5, '#9fb6d0'); } else e.dead = true; }
      if (G.frame % 3 === 0) DD.part && DD.part({ x: DD.cx(e), y: e.y + 4, vx: 0, vy: 0, life: 14, max: 14, r: 1, col: '#3fd6ff', g: 0 });
      if (--e.life <= 0 || e.x < 0) e.dead = true;
    },
    draw(e, ctx) { if (DD.ready('w7_vrset')) DD.spr('w7_vrset', DD.wx(e.x + e.w / 2), DD.wy(e.y + e.h + 1), false, 1, 1, e.spin); },
    stomp() { return false; },
    touch(e) { DD.hurt(DD.cx(e)); },
  });
  DD.defineEntity('letterShadow', {   // the telegraph: a hazard-striped shadow on the floor where a letter will land, flashing faster as it nears
    update(e, G) {
      if (e.t === 45 && G.s.hang) G.s.hang[e.slot] = 'shake';
      if (--e.t <= 0) {
        DD.addEntity('fallLetter', { x: e.x, y: 13 * 16, w: 64, h: 48, vy: 0, landed: false, life: 220, ch: e.ch, slot: e.slot });
        if (G.s.hang) G.s.hang[e.slot] = 'gone'; DD.SFX.slam && DD.SFX.slam(); e.dead = true;
      }
    },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(FL), fast = e.t < 18 ? 2 : 4, on = Math.floor(e.t / fast) % 2;
      ctx.fillStyle = on ? 'rgba(63,214,255,0.55)' : 'rgba(255,255,255,0.22)'; ctx.fillRect(X, Y - 2, 64, 2);
      ctx.fillStyle = on ? 'rgba(63,214,255,0.28)' : 'rgba(0,0,0,0.35)'; ctx.fillRect(X, Y - 46, 64, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = -48; i < 64; i += 12) { ctx.beginPath(); ctx.moveTo(X + i, Y); ctx.lineTo(X + i + 6, Y); ctx.lineTo(X + i + 6 + 46, Y - 46); ctx.lineTo(X + i + 46, Y - 46); ctx.fill(); }
      DD.text('!', X + 31, Y - 36 - (e.t < 18 ? 0 : 0), on ? '#ffffff' : '#3fd6ff', 2, '#000', 'center');
    },
    stomp() { return false; },
    touch() {},
  });
  DD.defineEntity('fallLetter', {   // a foam letter: it hurts on the way down, then it is a platform that blinks out and re-hangs
    update(e, G) {
      if (!e.landed) {
        e.vy = Math.min(e.vy + 0.55, 9);
        if (DD.moveY(e, e.vy, false)) { e.landed = true; e.vy = 0; G.shake = 5; DD.SFX.thud(); DD.dust(DD.cx(e), e.y + e.h, 16, 2.4, '#ffffff'); DD.stars && DD.stars(DD.cx(e), e.y, 5, '#cfe8ff'); }
      } else if (--e.life <= 0) { e.dead = true; if (G.s.hang) G.s.hang[e.slot] = 'back'; }
    },
    solid(b) { return !!b.landed; },
    draw(e, ctx) {
      const n = 'w7_fall' + e.ch; if (!DD.ready(n)) return;
      if (e.landed && e.life < 55 && Math.floor(e.life / 4) % 2) return;   // blinks out
      DD.spr(n, DD.wx(e.x + e.w / 2), DD.wy(e.y + e.h));
      if (!e.landed) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(DD.wx(e.x + 6), DD.wy(e.y) - 14, 2, 14); ctx.fillRect(DD.wx(e.x + 52), DD.wy(e.y) - 14, 2, 14); }
    },
    stomp() { return false; },
    touch(e) { if (!e.landed) DD.hurt(DD.cx(e)); },
  });
  DD.defineEntity('w7shock', {   // the leap's shockwave: a low cyan ring that rolls along the floor; hop it
    update(e, G) {
      if (DD.moveX(e, e.vx, false) || --e.life <= 0) e.dead = true;
      if (G.frame % 3 === 0) DD.part && DD.part({ x: DD.cx(e), y: e.y + 6, vx: 0, vy: -0.2, life: 12, max: 12, r: 1, col: '#9fe8ff', g: 0 });
    },
    draw(e, ctx, G) {
      const X = DD.wx(e.x), Y = DD.wy(e.y), k = (G.frame >> 2) % 2;
      ctx.fillStyle = 'rgba(63,214,255,0.35)'; ctx.fillRect(X - 2, Y - 2, e.w + 4, e.h + 4);
      ctx.fillStyle = k ? '#ffffff' : '#3fd6ff'; ctx.fillRect(X, Y + 2, e.w, e.h - 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(X + (e.vx > 0 ? e.w - 3 : 0), Y, 3, e.h);
    },
    stomp() { return false; },
    touch(e) { DD.hurt(DD.cx(e)); },
  });
  // true while an attack of his is still in the air or on the floor: the stun waits for this to clear, so nothing overlaps the stomp window
  const hazards = () => DD.bodies.some(b => !b.dead && (b.kind === 'vrset' || b.kind === 'letterShadow' || b.kind === 'w7shock' || (b.kind === 'fallLetter' && !b.landed)));
  DD.defineEntity('tim_ocx', {
    boss: true,   // stomp = one pip (invulnerable frames stop double hits); touch = hurt
    spawn: t => ({ x: t.x, y: FL - 54, w: 32, h: 54, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0, n: 0, atk: 'toss', hp: -1, wob: 0, tgt: 0, x0: 0 }),
    stomp(e, G) {   // headset on: he is in the VR and shrugs you off (you still bounce). Dizzy: stomp him.
      if (e.st === 'stun' || e.st === 'hurt') { DD.hitBoss(1); return true; }
      DD.SFX.boing && DD.SFX.boing(); DD.stars && DD.stars(DD.cx(e), e.y, 3, '#3fd6ff'); if (G.frame % 20 === 0) DD.float(DD.cx(e), e.y - 6, 'HEADSET ON', '#3fd6ff');
      return true;
    },
    touch(e) { if (e.st !== 'stun' && e.st !== 'hurt' && e.st !== 'down' && e.st !== 'cool' && !(e.st === 'walk' && e.t < 30)) DD.hurt(DD.cx(e)); },   // walking, he is harmless for his first half second after the dizzy window, so a Dot he landed on gets time to step out
    update(e, G) {
      const B = DD.boss; if (!B || !B.engaged) return;
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      if (B.dead) {   // the defeat: he reels back, sits down hard, and the popcorn flies
        e.t++; e.st = 'down'; e.vx *= 0.9; DD.moveX(e, e.vx, false);
        if (e.t === 1) { e.vx = -e.dir * 2.2; e.vy = -3; }
        e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
        if (e.t % 20 === 1 && e.t < 70) DD.stars && DD.stars(me, e.y, 4, '#ffe680');
        return;
      }
      if (e.hp !== B.hp) {   // a pip came off: recoil and a short stun
        if (e.hp >= 0) { e.st = 'hurt'; e.t = 0; e.vx = -e.dir * 2.4; e.vy = -2.6; DD.stars && DD.stars(me, e.y + 4, 6, '#ffffff'); }
        e.hp = B.hp;
      }
      e.t++;
      if (e.st === 'walk') {                        // walk at the Dot, then wind up the next attack
        e.dir = P < me ? -1 : 1; e.wob += 0.2;
        const gap = Math.abs(P - me); e.vx = gap > 70 ? e.dir * (0.45 + ph * 0.2) : gap < 46 ? -e.dir * (0.8 + ph * 0.2) : 0;   // he stops short of you: he never walks into you, and backs off if a leap or charge left him on top of you
        DD.moveX(e, e.vx, false);
        if (e.t > 90 - ph * 14) {
          const pool = ph >= 1 ? ['toss', 'leap', 'knock', 'charge'] : ['toss', 'knock', 'charge'];
          e.atk = pool[e.n++ % pool.length]; e.st = 'wind'; e.t = 0; e.dir = P < me ? -1 : 1; DD.SFX.buzz && DD.SFX.buzz();
          if (e.atk === 'leap') { e.tgt = DD.clamp(P, B.arena[0] * 16 + 40, B.arena[1] * 16 - 40); e.x0 = e.x; }   // the ring is where you stood when he started
        }
      } else if (e.st === 'wind') {                 // telegraph: 40 frames, quicker in phase 2
        e.vx = 0;
        if (e.atk === 'charge' && e.t % 6 === 0) DD.dust(me - e.dir * 10, e.y + e.h, 2, 1.4, '#9fb6d0');
        if (e.atk === 'knock' && e.t % 10 === 0) { G.shake = Math.max(G.shake, 2); DD.SFX.thud && DD.SFX.thud(); }
        if (e.atk === 'leap' && e.t % 8 === 0) DD.dust(me, e.y + e.h, 2, 1.2, '#9fb6d0');
        if (e.t >= (e.atk === 'leap' ? 44 : 44 - ph * 8)) {   // 44 frames in phase 1, 36 in phase 2 (the leap keeps all 44): always over half a second
          e.t = 0;
          if (e.atk === 'toss') {
            const sx = me + e.dir * 16 - 8;
            DD.addEntity('vrset', { x: sx, y: e.y - 4, w: 14, h: 9, vx: e.dir * (2.2 + ph * 0.4), vy: -4.2, bounces: 0, life: 120, spin: 0 });
            if (ph >= 1) DD.addEntity('vrset', { x: sx, y: e.y - 4, w: 14, h: 9, vx: e.dir * (1.5 + ph * 0.3), vy: -6.6, bounces: 0, life: 130, spin: 0 });
            DD.SFX.slam && DD.SFX.slam(); e.st = 'cool';
          } else if (e.atk === 'leap') { e.st = 'leap'; e.x0 = e.x; DD.SFX.slam && DD.SFX.slam();
          } else if (e.atk === 'knock') {
            const free = SLOTS.map((s, i) => ({ s, i })).filter(o => !G.s.busy[o.i]).sort((a, b) => Math.abs(a.s * 16 + 32 - P) - Math.abs(b.s * 16 + 32 - P));
            const n = ph >= 1 ? Math.min(2, free.length) : Math.min(1, free.length);
            for (let k = 0; k < n; k++) {
              const o = free[k]; G.s.busy[o.i] = true;
              DD.addEntity('letterShadow', { x: o.s * 16, y: FL, w: 64, h: 2, t: 45 + k * 22, ch: CH[o.i], slot: o.i });
            }
            e.st = 'cool';
          } else { e.st = 'charge'; DD.SFX.slam && DD.SFX.slam(); }
        }
      } else if (e.st === 'charge') {               // straight rage across the arena
        e.vx = e.dir * (3 + ph * 0.7);
        const blocked = DD.moveX(e, e.vx, false);
        if (e.t % 4 === 0) DD.dust(me - e.dir * 12, e.y + e.h, 2, 1.8, '#9fb6d0');
        if (e.t % 18 === 0) { G.shake = Math.max(G.shake, 2); DD.SFX.thud && DD.SFX.thud(); }
        if (blocked || e.t > 70) { if (blocked) { G.shake = 8; DD.SFX.slam && DD.SFX.slam(); DD.stars && DD.stars(me + e.dir * 14, e.y + 6, 7, '#ffe680'); } e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'leap') {                 // up and over onto the ring, 38 frames; the landing sends the shockwave out both ways
        const u = Math.min(1, e.t / 38);
        e.x = e.x0 + (e.tgt - e.w / 2 - e.x0) * u; e.y = FL - e.h - 70 * 4 * u * (1 - u); e.vy = 0;
        if (u >= 1) {
          e.y = FL - e.h; e.st = 'cool'; e.t = 0; G.shake = 9; DD.SFX.slam && DD.SFX.slam(); DD.dust(DD.cx(e), FL - 1, 14, 2.6, '#9fb6d0'); DD.stars && DD.stars(DD.cx(e), e.y + e.h - 8, 5, '#9fe8ff');
          for (const d of [-1, 1]) DD.addEntity('w7shock', { x: DD.cx(e) + d * 22 - 8, y: FL - 10, w: 16, h: 10, vx: d * 2.6, life: 56 });
        }
      } else if (e.st === 'cool') {                 // his attack is still out there: harmless, waits for it to clear, then he is dizzy
        e.vx *= 0.8; DD.moveX(e, e.vx, false);
        if (e.t > 24 && !hazards()) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'stun') {                 // the opening: he is dizzy, stomp him now (110 frames, 90 in phase 2)
        e.vx = 0;
        if (e.t % 24 === 1) DD.stars && DD.stars(me, e.y + 2, 2, '#ffe680');
        if (e.t > 110 - ph * 20) { e.st = 'walk'; e.t = 0; }
      } else if (e.st === 'hurt') {                 // knocked back by a stomp
        e.vx *= 0.92; DD.moveX(e, e.vx, false);
        if (e.t > 38) { e.st = 'walk'; e.t = 0; }
      }
      if (e.st !== 'leap') { e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0; }
      const lo = B.arena[0] * 16, hi = B.arena[1] * 16;   // keep him inside the arena walls
      if (e.x < lo) e.x = lo;
      if (e.x + e.w > hi) e.x = hi - e.w;
    },
    draw(e, ctx, G) {
      const B = DD.boss, cx = DD.wx(e.x + e.w / 2), bot = DD.wy(e.y + e.h) + 1, ph = B ? B.phase : 0;
      let name = 'w7_timocx', rot = 0, sy = 1, jx = 0, tint = null;
      if (e.st === 'wind') {
        const f = Math.floor(e.t / 4) % 2;
        name = e.atk === 'toss' ? 'w7_timocx_throw' : 'w7_timocx_rage'; if (e.atk === 'leap') sy = 0.9;
        jx = (e.t % 2 ? 1 : -1) * (1 + (e.t > 28 ? 1 : 0)); if (e.atk === 'charge') sy = 0.94;
        if (f) tint = e.atk === 'toss' ? 'rgba(63,214,255,0.55)' : 'rgba(255,90,70,0.5)';
      } else if (e.st === 'leap') { name = 'w7_timocx_rage'; rot = e.dir * 0.2; sy = 1.06; }
      else if (e.st === 'charge') { name = 'w7_timocx_rage'; rot = e.dir * 0.12; if (Math.floor(e.t / 3) % 2) tint = 'rgba(255,90,70,0.28)'; }
      else if (e.st === 'stun' || e.st === 'hurt') name = 'w7_timocx_hurt';
      else if (e.st === 'cool') name = e.atk === 'toss' ? 'w7_timocx_throw' : 'w7_timocx';
      else if (e.st === 'down') { name = 'w7_timocx_hurt'; rot = -e.dir * Math.min(1.45, e.t * 0.05); }
      else if (e.st === 'walk') jx = 0;
      const bob = e.st === 'walk' ? Math.abs(Math.sin(e.wob)) * -2 : 0;
      if (e.atk === 'leap' && (e.st === 'wind' || e.st === 'leap')) {   // the landing ring on the floor: pulses faster as the leap nears
        const rx = DD.wx(e.tgt), ry = DD.wy(FL), on = e.st === 'leap' || Math.floor(e.t / (e.t > 28 ? 3 : 6)) % 2;
        ctx.fillStyle = on ? 'rgba(255,90,70,0.55)' : 'rgba(255,255,255,0.22)'; ctx.fillRect(rx - 28, ry - 2, 56, 2); ctx.fillRect(rx - 22, ry - 4, 44, 2);
        ctx.fillStyle = on ? 'rgba(255,90,70,0.25)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(rx - 28, ry - 36, 56, 32);
        DD.text('!', rx, ry - 34, on ? '#ffffff' : '#ff6a5a', 2, '#000', 'center');
      }
      if (!DD.ready(name)) return;
      const flip = (name === 'w7_timocx_throw' ? e.dir < 0 : false);
      if (B && B.inv > 0 && B.flash < B.inv - 8 && Math.floor(B.inv / 3) % 2) return;   // blink while invulnerable
      if (B && B.dead && e.t > 140) ctx.globalAlpha = 0.9;
      drawImg(ctx, DD.IMG[name], cx + jx, bot + bob, flip, rot, sy);
      if (B && B.flash > B.cfg.inv - 7) { const s = silhouette(name, '#ffffff'); if (s) drawImg(ctx, s, cx, bot + bob, flip, rot, sy); }   // the hit flash
      else if (tint) { const s = silhouette(name, tint); if (s) { ctx.globalAlpha = 0.55; drawImg(ctx, s, cx + jx, bot + bob, flip, rot, sy); ctx.globalAlpha = 1; } }
      ctx.globalAlpha = 1;
      if (e.st === 'wind' && e.atk !== 'leap') DD.text('!', cx, bot - 70 - (e.t % 8 < 4 ? 0 : 1), e.atk === 'toss' ? '#3fd6ff' : '#ff6a5a', 2, '#000', 'center');
      if (e.st === 'stun' || e.st === 'hurt' || e.st === 'down') {   // dizzy stars circling the head
        for (let i = 0; i < 3; i++) { const a = G.frame / 10 + i * 2.1; DD.text('*', cx + Math.cos(a) * 14, bot - 66 + Math.sin(a) * 4, '#ffe680', 1, '#000', 'center'); }
      }
    },
  });

  window.LEVEL = {
    id: '7-boss', name: 'OCX TIM', sub: 'GET YOUR VR HEADSETS ON', world: 7,
    W: 64, H: 24, FLOOR: 21,
    SOLID: [['stage', 0, 21, 64, 3], ['plinth', 4, 19, 3, 2], ['plinth', 57, 19, 3, 2], ['cube', 17, 16, 4, 1], ['cube', 43, 16, 4, 1], ['cube', 30, 13, 4, 1]],
    KINDS: { stage: 1, plinth: 1, cube: 2 },
    THINGS: [['dot', 1, 20], ['tim_ocx', 50, 19]],
    POPCORN: [[8, 20, 3], [20, 20, 3], [27, 20, 3], [37, 20, 3], [52, 20, 2], [4, 18, 3], [57, 18, 3], [17, 15, 4], [43, 15, 4], [30, 12, 4], [11, 15, 5], [49, 15, 5], [24, 14, 3], [37, 14, 3]],
    sprites: ['w7_timocx', 'w7_timocx_throw', 'w7_timocx_hurt', 'w7_timocx_rage', 'w7_vrset', 'w7_fallO', 'w7_fallX', 'w7_fallC', 'w7_floor', 'w7_plinth', 'w7_truss', 'w7_can',
              'w7_tub', 'w7_rio', 'w7_bucket', 'w7_chair', 'w7_vrcam', 'w7_ladder', 'w7_portrait_tim', 'w7_portrait_gregg', 'w7_gregg_seat'],   // w7_gregg_seat: the boss cutscenes (cuts/w7.js)
    portraits: { tim: 'w7_portrait_tim', gregg: 'w7_portrait_gregg' },
    intro: { bg: '#05070c', fg: '#ffffff', edge: '#3fd6ff' },
    boss: {
      name: 'OCX TIM', hp: 6, arena: [2, 62], inv: 60, endDelay: 230,
      phases: [{ at: 3, say: 'RUNNING FOR DA', sub: 'SAN BERNARDINO COUNTY' }],
      onDefeat: (G, B) => {
        DD.banner('FOR DA', 150, 'I APPROVE THIS MESSAGE');
        const t = DD.bodies.find(b => b.kind === 'tim_ocx');
        if (t) for (let i = 0; i < 14; i++) DD.drop({ x: DD.cx(t), y: t.y + 6, vx: (i - 7) * 0.5, vy: -3 - (i % 3), life: 400, wait: 20 });
      },
    },
    lines: {
      boss: [['tim', 'GET YOUR VR HEADSETS ON.'], ['gregg', 'HEY, GUYS. THANKS, TIM.']],
      bossPhase: [['tim', "I'M RUNNING FOR DISTRICT ATTORNEY."]],
      bossDefeat: [['tim', 'I HOPE I HAVE YOUR VOTE.'], ['gregg', 'ALL RIGHT, WELL. BACK TO THE MOVIES.']],
    },
    theme: {
      tiles: { stage: ['#0b0e15', '#e8f0fa', '#050508'], plinth: ['#c4def6', '#ffffff', '#7aa0cc'], cube: ['#9ad0ff', '#ffffff', '#4a82c0'] },
      crawl: ['#05060a', '#020204'],
      bg(ctx, G, DD) {   // the black box again: dark cyclorama, the truss with its cans, and the cones sweeping the stage; one cone follows Tim
        const c = G.cam, VW = DD.VW, VH = DD.VH, I = DD.IMG, ok = DD.ready;
        const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#030409'); g.addColorStop(0.55, '#070a12'); g.addColorStop(1, '#0a0e18');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = 'rgba(70,100,160,0.05)'; const ox = -Math.round(c.x * 0.12) % 56;
        for (let x = ox - 56; x < VW + 56; x += 56) { ctx.fillRect(x + 6, 0, 8, VH); ctx.fillRect(x + 22, 0, 3, VH); }
        { const A = DD.art, f = G.frame, fy = DD.wy(21 * 16) - 3, P = 0.5, S = 176, base = Math.floor(c.x * P / S);   // the mid layer: road cases, black flats, light stands and Max's monitor, set back from the stage
          A.R(0, fy - 8, VW, 8, '#0a0e18'); A.R(0, fy - 8, VW, 1, '#16203a');
          for (let i = -1; i < Math.ceil(VW / S) + 2; i++) {
            const k = i + base, X = Math.round(i * S - (c.x * P) % S), h = A.hash(k, 7);
            if (h < 0.3) {
              A.box(X, fy - 24, 38, 24, '#14172a', { outline: '#05060b' }); A.R(X + 1, fy - 12, 36, 1, '#080a14'); A.R(X + 15, fy - 16, 8, 3, '#4a5268');
              for (const [qx, qy] of [[1, 1], [34, 1], [1, 21], [34, 21]]) A.R(X + qx, fy - 24 + qy, 3, 2, '#5a6480');
              if (h < 0.15) { A.box(X + 6, fy - 40, 26, 16, '#101428', { outline: '#05060b' }); A.R(X + 9, fy - 32, 20, 1, '#050609'); A.R(X + 15, fy - 35, 8, 2, '#4a5268'); }
            } else if (h < 0.58) {
              A.box(X, fy - 74, 52, 72, '#0e1220', { outline: '#04050a' });
              for (let q = 0; q < 52; q += 8) { A.R(X + q, fy - 73, 1, 70, '#1a2038'); A.R(X + q + 1, fy - 73, 2, 70, '#080a14'); }
            } else if (h < 0.82) {
              A.R(X + 11, fy - 62, 2, 62, '#262c40'); A.R(X + 4, fy - 3, 16, 2, '#1a1e30'); A.R(X + 2, fy - 1, 4, 1, '#3a4260'); A.R(X + 18, fy - 1, 4, 1, '#3a4260');
              A.box(X + 3, fy - 76, 18, 14, '#20263a', { outline: '#05060b' }); A.R(X + 5, fy - 73, 14, 8, '#cfe8ff');
              A.glow(X + 12, fy - 68, 50, '#9ad0ff', 0.16); A.cone(X + 12, fy - 62, 70, 36, '#9ad0ff', 0.08);
            } else {
              A.R(X + 12, fy - 28, 2, 28, '#262c40'); A.R(X + 4, fy - 2, 18, 2, '#1a1e30');
              A.box(X, fy - 52, 28, 24, '#14182a', { outline: '#05060b' }); A.R(X + 2, fy - 50, 24, 18, ((f + k * 7) % 140 < 4 || f - G.flashAt < 10) ? '#3a78b8' : '#1d4a78'); A.R(X + 2, fy - 50, 24, 1, '#5a9ad8');
              A.R(X + 5, fy - 46, 8, 1, '#7ab8f0'); A.R(X + 5, fy - 43, 14, 1, '#2a5a90'); if (f % 60 < 40) A.R(X + 22, fy - 49, 2, 2, '#ff4a4a');
              A.glow(X + 14, fy - 40, 46, '#3fa0ff', 0.14);
            }
          }
          ctx.fillStyle = 'rgba(2,3,8,0.4)'; ctx.fillRect(0, fy - 90, VW, 90);
        }
        const ty = Math.round(8 - c.y * 0.3 + 40) + (G.frame - G.dipAt < 20 ? (G.frame % 2 ? 1 : -1) : 0), tx0 = -Math.round(c.x * 0.3) % 72;
        ctx.fillStyle = '#10131c'; ctx.fillRect(0, ty, VW, 6); ctx.fillStyle = '#2a3046'; ctx.fillRect(0, ty, VW, 1);
        ctx.fillStyle = '#1c2236'; for (let x = tx0 - 72; x < VW + 72; x += 12) { ctx.fillRect(x, ty + 1, 1, 4); ctx.fillRect(x + 6, ty + 2, 6, 1); }
        ctx.fillStyle = '#3fd6ff'; for (let x = tx0 - 72; x < VW + 72; x += 24) ctx.fillRect(x + 3, ty + 2, 2, 2);
        const t = G.frame / 80, B = G.boss, tim = DD.bodies.find(b => b.kind === 'tim_ocx');
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let x = tx0 - 72; x < VW + 72; x += 72) {
          const cx = x + 36, lean = Math.sin(t + x * 0.05 + Math.floor(c.x * 0.3 / 72) * 1.7) * 14 + 20;
          const gr = ctx.createLinearGradient(cx, ty + 8, cx + lean, VH); gr.addColorStop(0, 'rgba(190,230,255,0.18)'); gr.addColorStop(0.6, 'rgba(120,190,255,0.05)'); gr.addColorStop(1, 'rgba(120,190,255,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(cx - 3, ty + 8); ctx.lineTo(cx + 3, ty + 8); ctx.lineTo(cx + lean + 36, VH); ctx.lineTo(cx + lean - 36, VH); ctx.fill();
          if (ok('w7_can')) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(I.w7_can, cx - 7, ty + 5); ctx.globalCompositeOperation = 'lighter'; }
        }
        if (tim && B && B.engaged && !B.dead) {   // the follow spot
          const sx = DD.wx(tim.x + tim.w / 2), st = ty + 8, hot = tim.st === 'wind' || tim.st === 'charge';
          const gr = ctx.createLinearGradient(sx, st, sx, DD.wy(FL)); gr.addColorStop(0, hot ? 'rgba(255,120,110,0.32)' : 'rgba(210,235,255,0.30)'); gr.addColorStop(1, hot ? 'rgba(255,120,110,0.08)' : 'rgba(170,215,255,0.10)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx - 4, st); ctx.lineTo(sx + 4, st); ctx.lineTo(sx + 38, DD.wy(FL)); ctx.lineTo(sx - 38, DD.wy(FL)); ctx.fill();
        }
        ctx.restore();
      },
      tile(ctx, k, X, Y, tx, ty) {
        const I = DD.IMG, ok = DD.ready, K = (x, y) => DD.kindAt(x, y), same = (x, y) => K(x, y) === k, lip = !same(tx, ty - 1);
        if (k === 'stage' && ok('w7_floor')) {
          ctx.drawImage(I.w7_floor, (tx & 1) * 16, lip ? 0 : 16, 16, 16, X, Y, 16, 16);
          if (lip && tx % 9 === 4) { ctx.fillStyle = '#3fd6ff'; ctx.fillRect(X + 7, Y, 2, 1); }
          if (!lip && ty >= 22) {   // the stage front below the lip: a gaffer-taped cable run, a vent grille, darker and calmer with depth
            const A = DD.art, d = ty - 21;
            if (d === 1) {
              A.R(X, Y + 6, 16, 4, '#06080d'); A.R(X, Y + 6, 16, 1, '#1c2436'); A.R(X, Y + 9, 16, 1, '#020308');
              if (A.hash(tx, 61) < 0.5) { A.R(X, Y + 11, 16, 1, '#0a0e18'); A.R(X + 2, Y + 11, 5, 1, '#2a3a5a'); }
              if (tx % 6 === 1) { A.R(X + 4, Y + 4, 6, 8, '#6a707c'); A.R(X + 4, Y + 4, 6, 1, '#9aa2b0'); A.R(X + 9, Y + 4, 1, 8, '#4a505c'); }
            } else if (tx % 11 === 5) { A.box(X + 2, Y + 3, 12, 9, '#0a0e18', { outline: '#020308' }); for (let q = 0; q < 4; q++) A.R(X + 4, Y + 5 + q * 2, 8, 1, '#02030a'); }
            ctx.fillStyle = 'rgba(2,3,8,' + (0.16 * d) + ')'; ctx.fillRect(X, Y, 16, 16);
          }
          return true;
        }
        if (k === 'plinth' && ok('w7_plinth')) {
          ctx.drawImage(I.w7_plinth, 0, lip ? 0 : 16, 16, 16, X, Y, 16, 16);
          if (!same(tx - 1, ty)) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 16); }
          if (!same(tx + 1, ty)) { ctx.fillStyle = '#6a92c4'; ctx.fillRect(X + 14, Y, 2, 16); }
          return true;
        }
        if (k === 'cube') {
          const Lf = !same(tx - 1, ty), Rt = !same(tx + 1, ty);
          const gr = ctx.createLinearGradient(0, Y, 0, Y + 16); gr.addColorStop(0, 'rgba(235,248,255,0.95)'); gr.addColorStop(1, 'rgba(120,190,245,0.78)');
          ctx.fillStyle = gr; ctx.fillRect(X, Y, 16, 16);
          ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(X, Y, 16, 2); ctx.fillStyle = 'rgba(90,150,215,0.65)'; ctx.fillRect(X, Y + 14, 16, 2);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(X + 3, Y + 4, 10, 1); ctx.fillRect(X + 3, Y + 4, 1, 8);
          if (Lf) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 16); } if (Rt) { ctx.fillStyle = '#5a9ad8'; ctx.fillRect(X + 15, Y, 1, 16); }
          return true;
        }
        return false;
      },
    },
    script: {
      init(G) { G.s.hang = { 0: 'hang', 1: 'hang', 2: 'hang' }; G.s.busy = [false, false, false]; },
      update(G) {   // a re-hung letter comes back into the pool for the next knock
        for (let i = 0; i < 3; i++) if (G.s.hang[i] === 'back' && G.frame % 30 === 0) { G.s.hang[i] = 'hang'; G.s.busy[i] = false; }
      },
      drawBG(ctx, G) {   // the foam letters hung over the stage on wires: they wobble when Tim picks one, and are gone when it falls
        const I = DD.IMG, ok = DD.ready;
        SLOTS.forEach((s, i) => {
          const st = G.s.hang[i], n = 'w7_fall' + CH[i]; if (st === 'gone' || !ok(n)) return;
          const X = DD.wx(s * 16) + (st === 'shake' ? (G.frame % 2 ? 2 : -2) : 0), Y = DD.wy(13 * 16) + (st === 'back' ? -6 : 0);
          ctx.globalAlpha = st === 'back' ? 0.5 : 1;
          ctx.fillStyle = '#6a7692'; ctx.fillRect(X + 8, Y - 40, 1, 40); ctx.fillRect(X + 55, Y - 40, 1, 40);
          ctx.fillStyle = 'rgba(63,214,255,0.8)'; ctx.fillRect(X + 7, Y - 3, 3, 3); ctx.fillRect(X + 54, Y - 3, 3, 3);
          ctx.drawImage(I[n], X, Y); ctx.fillStyle = 'rgba(2,3,8,0.30)'; ctx.fillRect(X, Y, 64, 48); ctx.globalAlpha = 1;
        });
      },
      drawMid(ctx, G) {   // the plinth displays, chairs, Max's camera and the ladder, the floor pools
        const I = DD.IMG, ok = DD.ready, X = tx => DD.wx(tx * 16), Y = ty => DD.wy(ty * 16);
        const spr = (n, tx, ty, ox = 0, oy = 0) => { if (ok(n)) DD.spr(n, X(tx) + ox, Y(ty) + oy); };
        spr('w7_tub', 4, 19, 14); spr('w7_rio', 4, 19, 36); spr('w7_tub', 57, 19, 14); spr('w7_bucket', 57, 19, 36);
        spr('w7_chair', 11, 21, 8, 7); spr('w7_chair', 53, 21, 8, 7); spr('w7_vrcam', 24, 21, 8, 0); spr('w7_ladder', 62, 21, 4, 0); spr('w7_ladder', 2, 21, 8, 0);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const [px, py, w] of [[4, 19, 3], [57, 19, 3], [17, 16, 4], [43, 16, 4], [30, 13, 4]]) {
          const cx = X(px) + w * 8, cy = Y(py) + 4, g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 40 + w * 4); g.addColorStop(0, 'rgba(120,200,255,0.24)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(cx - 60, cy - 60, 120, 120);
        }
        for (const px of [10, 30, 50]) {
          const cx = X(px) + 32, cy = Y(21) + 1; ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.12);
          const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 72); g.addColorStop(0, 'rgba(150,210,255,0.5)'); g.addColorStop(1, 'rgba(150,210,255,0)'); ctx.fillStyle = g; ctx.fillRect(-72, -72, 144, 144); ctx.restore();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(210,235,255,0.5)';
        for (let i = 0; i < 16; i++) { const mx = ((i * 97 + G.frame * (0.06 + (i % 4) * 0.02) - G.cam.x * 0.9) % 340 + 340) % 340, my = ((i * 53 + G.frame * 0.12 * (1 + (i % 3))) % 130) + 6; if ((i + (G.frame >> 5)) % 3) ctx.fillRect(Math.round(mx), Math.round(my), 1, 1); }
      },
      drawFG(ctx, G) {   // the vignette, and when he is down, the FOR DA banner dropping in on a bounce
        const VW = DD.VW, VH = DD.VH, B = G.boss; DD.art.motes(G, '#bfe4ff', 22, 0.35);
        const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,6,0.55)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
        if (!B || !B.dead) return;
        const p = 1 - B.endT / (B.cfg.endDelay || 100);               // 0 -> 1 over the defeat beat
        if (p < 0.2) return;
        const q = Math.min(1, (p - 0.2) / 0.35), drop = q < 1 ? -80 + 80 * q * q : Math.abs(Math.sin((p - 0.55) * 14)) * -6 * Math.max(0, 1 - (p - 0.55) * 3);
        const bx = Math.round(VW / 2 - 90), by = Math.round(18 + drop);
        ctx.fillStyle = '#06080e'; ctx.fillRect(bx + 20, by - 40, 1, 40 + 0); ctx.fillRect(bx + 160, by - 40, 1, 40);   // the wires it hangs from
        ctx.fillStyle = '#fff'; ctx.fillRect(bx - 2, by - 2, 184, 64);
        ctx.fillStyle = '#c8202c'; ctx.fillRect(bx, by, 180, 60);
        ctx.fillStyle = '#2a4aa8'; ctx.fillRect(bx + 2, by + 2, 176, 56);
        ctx.fillStyle = '#4a6ad0'; ctx.fillRect(bx + 2, by + 2, 176, 2);
        for (const sx of [14, 28, 42, 138, 152, 166]) { ctx.fillStyle = '#e83a3a'; const x = bx + sx, y = by + 46; ctx.fillRect(x - 1, y - 5, 3, 1); ctx.fillRect(x - 2, y - 4, 5, 2); ctx.fillRect(x - 4, y - 2, 9, 2); ctx.fillRect(x - 2, y, 5, 2); ctx.fillRect(x - 3, y + 2, 2, 2); ctx.fillRect(x + 2, y + 2, 2, 2); }
        DD.text('FOR DA', bx + 90, by + 14, '#ffffff', 5, null, 'center');
        if (G.frame % 4 === 0 && q >= 1) DD.part && DD.part({ x: G.cam.x + bx + Math.random() * 180, y: G.cam.y + by + 62, vx: 0, vy: 0.4, life: 24, max: 24, r: 1, col: '#ffe680', g: 0.02 });
      },
    },
  };
}
