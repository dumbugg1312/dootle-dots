// World 6 boss: LAWYER TIM, who represents himself (camel suit, lavender shirt, patterned tie, goatee, long slicked hair). Hand-written:
// arena, boss entity, his shockwave, the thrown exhibits, and Judge Szymczyk's gavel in phase 2 (a stage hazard). Courtroom slapstick only.
// Attacks (each telegraphed for 40 frames while he rears up, flashing and yelling OBJECTION):
//   1. GAVEL HOP: he jumps and slams down; a shockwave runs both ways along the floor. Jump it.
//   2. LUNGE: he charges across the well. Jump it, or let him hit the rail and get stunned.
//   3. EXHIBITS: he flings a folder of exhibits in an arc at you. Jump under the arc or stay clear, then he is stunned.
// After every attack he is dizzy (stars circle his head, an arrow bobs): stomp him then. That window is about 2 s in phase 1 and 1.7 s in phase 2,
// his body is harmless while he is dizzy or hurt, and nothing is still flying or running when it opens (the shockwave is short, the folder has
// landed, the judge's gavel waits). He cannot be stomped any other time. Phase 2 ("he represents himself", at 3 pips) is faster, and adds
// a new move: the judge bangs a gavel (he raises it for a full second first, and chevrons show the side) and sends a shockwave along the floor.
{
  const TS = 16, FLOORY = 21 * 16, ok = n => DD.ready(n);
  const flashC = {};
  const flashFrame = f => {   // a white silhouette of a frame, for the hurt flash
    if (!flashC[f] && typeof document !== 'undefined' && ok('w6_lawyer_tim')) {
      const c = document.createElement('canvas'); c.width = 36; c.height = 50; const x = c.getContext('2d');
      x.drawImage(DD.IMG.w6_lawyer_tim, f * 36, 0, 36, 50, 0, 0, 36, 50); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, 36, 50);
      flashC[f] = c;
    }
    return flashC[f];
  };
  const hash = i => { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; return (h >>> 0) % 997; };
  const galHead = (ctx, G, I, h, kind, X, Y, bounce, arms) => {   // a spectator with a little life: blinks on its own clock, turns its head now and then, winces in when the Dot is hurt, arms up on a boss hit
    const hurt = G.pl && G.pl.inv > 0, tt = (G.frame + h * 7) % (230 + (h % 5) * 41), dx = tt < 26 ? ((h & 1) ? 1 : -1) : 0, dy = Math.round(bounce) + (hurt ? 1 : 0), by = Math.round(bounce);
    ctx.drawImage(I.w6_gallery, kind * 16, 9, 16, 9, X, Y + 9 + by, 16, 9);
    if (arms) { ctx.fillStyle = '#f8d2aa'; ctx.fillRect(X, Y + 3 + by, 2, 7); ctx.fillRect(X + 14, Y + 3 + by, 2, 7); ctx.fillStyle = '#ecb088'; ctx.fillRect(X, Y + 3 + by, 2, 1); ctx.fillRect(X + 14, Y + 3 + by, 2, 1); }
    ctx.drawImage(I.w6_gallery, kind * 16, 0, 16, 9, X + dx, Y + dy, 16, 9);
    if ((G.frame + h * 11) % (190 + (h % 4) * 45) < 6) { ctx.fillStyle = '#ecb088'; ctx.fillRect(X + dx + 5, Y + dy + 4, 2, 1); ctx.fillRect(X + dx + (kind === 2 ? 11 : 9), Y + dy + 4, 2, 1); }
  };
  const say = n => { if (typeof DD.say === 'function' && DD.lines) DD.lines(n); };

  DD.defineEntity('lt_shock', {   // the floor shockwave from a gavel hop or a bang: runs along the floor, hurts on touch, a jump clears it
    update(e, G) { DD.moveX(e, e.vx, false); if (G.frame % 3 === 0) DD.dust(DD.cx(e), e.y + e.h, 1, 0.6, '#f0d890'); if (--e.life <= 0) e.dead = true; },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y), d = e.vx > 0 ? 1 : -1, fade = Math.min(1, e.life / 20);
      ctx.save(); ctx.globalAlpha = fade;
      for (const [c, w, h] of [['#8a5a1c', 12, 12], ['#d09a38', 10, 10], ['#f6d070', 8, 8], ['#fff4c0', 4, 6]]) { ctx.fillStyle = c; ctx.fillRect(d > 0 ? X + e.w - w : X, Y + e.h - h, w, h); }
      ctx.fillStyle = '#fff'; ctx.fillRect(d > 0 ? X + e.w - 3 : X + 1, Y + 1, 2, 3); ctx.restore();
    },
    stomp() { return false; },
    touch(e) { DD.hurt(DD.cx(e)); },
  });
  DD.defineEntity('exhibit', {   // a folder of exhibits, thrown in an arc; it lands, slides a moment, then is gone
    update(e) {
      e.spin = (e.spin || 0) + 0.2;
      if (e.landed) { if (--e.life <= 0) e.dead = true; return; }
      e.vy = Math.min(e.vy + 0.25, 6);
      DD.moveX(e, e.vx, false);
      if (DD.moveY(e, e.vy, false)) { e.landed = true; e.vx *= 0.3; e.life = 40; DD.dust(DD.cx(e), e.y + e.h, 4, 1.2, '#f0e0b0'); }
    },
    draw(e, ctx) {
      const X = DD.wx(e.x + e.w / 2), Y = DD.wy(e.y + e.h / 2);
      if (ok('w6_folder')) { ctx.save(); ctx.translate(Math.round(X), Math.round(Y)); if (!e.landed) ctx.rotate(Math.sin(e.spin) * 0.6); if (e.vx < 0) ctx.scale(-1, 1); ctx.drawImage(DD.IMG.w6_folder, -7, -6); ctx.restore(); }
      else { ctx.fillStyle = '#d8b878'; ctx.fillRect(DD.wx(e.x), DD.wy(e.y), e.w, e.h); }
    },
    stomp() { return false; },
    touch(e) { if (!e.landed) DD.hurt(DD.cx(e)); },
  });
  const clear = () => !DD.bodies.some(b => (b.kind === 'lt_shock' || b.kind === 'exhibit') && !b.dead);   // nothing of his or the judge's is still flying or running
  DD.defineEntity('lt_boss', {
    boss: true,   // stomp = one pip (invulnerable frames stop double hits); touch = hurt
    spawn: t => ({ x: t.x, y: t.y + 32 - 50, w: 36, h: 50, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0, n: 0, atk: 'hop', hurt: 0 }),
    update(e, G) {
      const B = DD.boss; if (!B || !B.engaged || B.dead) return;
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      e.t++; if (e.hurt > 0) e.hurt--;
      if (e.st === 'walk') {                       // walk at the Dot, then pick the next attack
        e.dir = P < me ? -1 : 1;
        { const gap = Math.abs(P - me), sp = 0.5 + ph * 0.25, mid = (B.arena[0] + B.arena[1]) / 2; e.vx = gap > 72 ? e.dir * sp : gap < 44 ? (me < mid ? 1 : -1) * 1.3 : 0; }   // walks up but stops short, and backs off a Dot that is right on him: nobody gets pinned against the wall
        DD.moveX(e, e.vx, false);
        if (e.t > 100) { e.st = 'wind'; e.t = 0; e.atk = ['hop', 'charge', 'exhibit'][e.n++ % 3]; e.dir = P < me ? -1 : 1; DD.float(me, e.y, 'OBJECTION!', '#ffe680'); DD.SFX.wind(); }
      } else if (e.st === 'wind') {                // telegraph: 40 frames of rearing up, flashing red
        e.vx = 0;
        if (e.t >= 40) {
          e.t = 0;
          if (e.atk === 'charge') e.st = 'charge';
          else if (e.atk === 'exhibit') {
            e.st = 'throw'; e.t = 0;
            const dx = e.dir * (2.2 + ph * 0.4);
            DD.addEntity('exhibit', { x: me - 5, y: e.y + 10, w: 10, h: 8, vx: dx, vy: -4.6, life: 40, landed: false });
            DD.SFX.wind();
          } else { e.st = 'hop'; e.vy = -6.5 - ph * 0.5; }
        }
      } else if (e.st === 'charge') {              // straight dash across the arena
        e.vx = e.dir * (3 + ph * 0.7);
        const blocked = DD.moveX(e, e.vx, false);
        if (G.frame % 4 === 0) DD.dust(me - e.dir * 12, e.y + e.h, 1, 1, '#d8b878');
        if (blocked || e.t > 70) { e.st = 'land'; e.t = 0; if (blocked) { G.shake = Math.max(G.shake, 4); DD.SFX.thud(); } }
      } else if (e.st === 'throw') {               // the folder is in the air: he waits until it has landed and gone
        e.vx = 0;
        if (e.t > 20 && clear() || e.t > 150) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'land') {                // the shockwave is running; he is catching his breath, so nothing is open yet
        e.vx = 0;
        if (e.t > 50 && clear() || e.t > 180) { e.st = 'stun'; e.t = 0; }
      } else if (e.st === 'hop') {                 // airborne: on landing, the shockwave runs both ways
        e.vy = Math.min(e.vy + 0.4, 7);
        if (DD.moveY(e, e.vy, false)) {
          e.vy = 0; e.st = 'land'; e.t = 0;
          const life = 46 + ph * 6, feet = e.y + e.h - 12;
          DD.addEntity('lt_shock', { x: DD.cx(e) - 5, y: feet, w: 10, h: 12, vx: -2.6 - ph * 0.4, vy: 0, life });
          DD.addEntity('lt_shock', { x: DD.cx(e) - 5, y: feet, w: 10, h: 12, vx: 2.6 + ph * 0.4, vy: 0, life });
          DD.SFX.thud(); G.shake = Math.max(G.shake, 5); DD.dust(DD.cx(e), e.y + e.h, 8, 2, '#f0d890'); G.s.judgeT = Math.max(G.s.judgeT, 0);
        }
      } else if (e.st === 'stun') {                // the opening: he is dizzy, stomp him now
        e.vx = 0;
        if (e.t > 120 - ph * 20) { e.st = 'walk'; e.t = 0; }
      }
      if (e.st !== 'hop') { e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0; }
      const lo = B.arena[0], hi = B.arena[1];   // keep him inside the arena walls (DD.boss.arena is already in px)
      if (e.x < lo) e.x = lo;
      if (e.x + e.w > hi) e.x = hi - e.w;
    },
    touch(e, G, p) { const B = DD.boss; if (e.st === 'stun' || e.st === 'land' || e.st === 'throw' || e.hurt > 0 || (B && (B.inv > 0 || B.dead))) return; DD.hurt(DD.cx(e)); },   // dizzy or hurt: harmless
    stomp(e, G, p) {   // only while he is dizzy; otherwise it refuses and touch hurts you
      const B = DD.boss; if (e.st !== 'stun' || e.hurt > 0 || !B || B.inv > 0 || B.dead) return false;
      e.hurt = 40; e.st = 'walk'; e.t = -40; DD.stars(DD.cx(e), e.y + 6, 10, '#ffffff'); DD.SFX.stomp && DD.SFX.stomp(); DD.hitBoss(1);
      return true;
    },
    draw(e, ctx, G) {
      const B = DD.boss, X = DD.wx(e.x), Y = DD.wy(e.y), cx = X + e.w / 2, fy = DD.wy(FLOORY);
      const fly = e.dir > 0 ? 1 : -1;
      // telegraphs: where it is going to land, where he is going to charge, how the folder will fly
      if (B && B.engaged && !B.dead && e.st === 'wind') {
        const k = e.t / 40, blink = Math.floor(e.t / 4) % 2;
        ctx.save(); ctx.globalAlpha = 0.35 + 0.4 * blink;
        if (e.atk === 'charge') {
          ctx.fillStyle = '#ff5a40';
          for (let i = 0; i < 6; i++) { const x = cx + fly * (28 + i * 18), h = 2 + (i % 2); ctx.fillRect(x, fy - 3, 8 * fly > 0 ? 8 : -8, h); ctx.fillRect(x + fly * 3, fy - 6, 2, 6); }
        } else if (e.atk === 'exhibit') {
          const dx = fly * (2.2 + B.phase * 0.4); let px = e.x + e.w / 2 - 5, py = e.y + 10, vy = -4.6;
          ctx.fillStyle = '#fff4c0';
          for (let i = 0; i < 60; i++) { vy = Math.min(vy + 0.25, 6); px += dx; py += vy; if (i % 4 === 0) ctx.fillRect(DD.wx(px), DD.wy(py), 2, 2); if (py > FLOORY - 8) break; }
        } else {
          ctx.fillStyle = '#ffd860'; const w = 10 + k * 60; ctx.fillRect(cx - w, fy - 2, w * 2, 2);
        }
        ctx.restore();
        ctx.fillStyle = '#ffe680'; DD.text('!', cx, Y - 12 - Math.abs(Math.sin(e.t / 5)) * 3, '#ffe680', 2, '#6a3a00', 'center');
      }
      ctx.save();
      if (B && B.dead) ctx.globalAlpha = Math.max(0, (B.endT || 100) / 100);
      let f = 0;
      if (B && B.dead) f = 5;
      else if (B && B.inv > 0) f = 5;
      else if (e.st === 'stun' || e.st === 'land') f = 5;
      else if (e.st === 'charge') f = 4;
      else if (e.st === 'hop') f = 3;
      else if (e.st === 'wind') f = e.atk === 'hop' ? 3 : 2;
      else f = Math.floor(G.frame / 10) % 2;
      const shake = e.st === 'wind' ? (Math.floor(e.t / 2) % 2 ? 1 : -1) : 0;
      if (ok('w6_lawyer_tim')) {
        ctx.translate(Math.round(cx + shake), Math.round(Y + e.h)); if (e.dir > 0) ctx.scale(1, 1); else ctx.scale(-1, 1);
        if (f === 5 && e.dir > 0) ctx.scale(1, 1);
        ctx.drawImage(DD.IMG.w6_lawyer_tim, f * 36, 0, 36, 50, -18, -50, 36, 50);
        if (B && B.inv > 0 && Math.floor(B.inv / 3) % 2) { const fc = flashFrame(f); if (fc) ctx.drawImage(fc, -18, -50); }   // the hurt flash
        else if (e.st === 'wind' && Math.floor(e.t / 4) % 2) { const fc = flashFrame(f); if (fc) { ctx.globalAlpha = 0.45; ctx.drawImage(fc, -18, -50); } }
      }
      ctx.restore();
      if (B && !B.dead && e.st === 'stun' && B.inv <= 0) {   // dizzy: stars circle his head, and a bouncing arrow says stomp now
        for (let i = 0; i < 3; i++) {
          const a = e.t / 8 + i * 2.1; const sx = cx + Math.cos(a) * 14, sy = Y + 2 + Math.sin(a) * 4;
          ctx.fillStyle = '#ffe680'; ctx.fillRect(sx - 1, sy - 3, 2, 6); ctx.fillRect(sx - 3, sy - 1, 6, 2);
        }
        ctx.fillStyle = '#ffe680'; const ay = Y - 14 + Math.sin(e.t / 4) * 2; ctx.fillRect(cx - 3, ay, 6, 2); ctx.fillRect(cx - 2, ay + 2, 4, 2); ctx.fillRect(cx - 1, ay + 4, 2, 2);
      }
    },
  });

  window.LEVEL = {
    id: '6-boss', name: 'LAWYER TIM', sub: 'REPRESENTING HIMSELF', world: 6,
    W: 64, H: 24, FLOOR: 21,
    SOLID: [['court', 0, 21, 64, 3], ['rail', 14, 17, 5, 1], ['rail', 44, 17, 5, 1], ['rail', 27, 14, 6, 1]],
    KINDS: { court: 1, rail: 2 },
    THINGS: [['dot', 1, 20], ['lt_boss', 50, 19]],
    POPCORN: (() => {
      const out = [[4, 20, 5], [14, 16, 5], [27, 13, 6], [44, 16, 5], [56, 20, 4], [22, 20, 3], [38, 20, 3]];
      for (let i = 0; i < 9; i++) out.push([8 + i * 2 + 0, 19 - Math.round(3 * Math.sin(Math.PI * i / 8)), 1]);   // an arc across the left well
      for (let i = 0; i < 9; i++) out.push([34 + i * 2, 19 - Math.round(3 * Math.sin(Math.PI * i / 8)), 1]);   // and across the right
      return out;
    })(),
    sprites: ['w6_lawyer_tim', 'w6_folder', 'w6_floor', 'w6_gallery_t', 'w6_wall', 'w6_seatrow', 'w6_rail', 'w6_seal', 'w6_judgebench', 'w6_flags', 'w6_lamp',
              'w6_judge', 'w6_gallery', 'w6_table', 'w6_podium', 'w6_portrait_lawyer', 'w6_portrait_judge', 'w6_clock', 'w6_easel'],
    portraits: { lawyer: 'w6_portrait_lawyer', judge: 'w6_portrait_judge' },
    names: { lawyer: 'LAWYER TIM', judge: 'JUDGE' },
    intro: { bg: '#2a1608', fg: '#f4eedc', edge: '#e8362a' },
    lines: {
      boss: [['lawyer', 'MAY I APPROACH THE BENCH?'], ['judge', 'NO, MR. HEIDECKER.']],
      bossPhase: [['judge', 'MR. HEIDECKER, YOU ARE IN CONTEMPT.'], ['lawyer', 'OBJECTION.']],
      bossDefeat: [['judge', 'THE COURT DECLARES A MISTRIAL.'], ['lawyer', 'I TAKE THAT AS AN EXONERATION.']],
    },
    boss: {
      name: 'LAWYER TIM', hp: 6, arena: [2, 62], inv: 60,
      phases: [{ at: 3, say: 'HELD IN CONTEMPT', sub: 'JUDGE SZYMCZYK', enter(G) { G.s.cheer = 90; G.shake = Math.max(G.shake, 6); } }],
      onHit(G) { if (G && G.s) G.s.cheer = 40; },
      onDefeat() {
        const G = DD.G; DD.banner('MISTRIAL', 90, 'THE JURY IS HUNG');
        if (G && G.s) { G.s.cheer = 400; G.s.judgeT = 70; }
        for (let i = 0; i < 40; i++) DD.part({ x: 40 + Math.random() * 940, y: 60 + Math.random() * 60, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 0.6, life: 110, max: 110, r: 2, col: i % 2 ? '#f4eedc' : '#d8d0bc', g: 0.02 });
      },
    },
    theme: {
      tiles: { court: ['#8a5a34', '#c8925a', '#4a2e18'], rail: ['#5a6a80', '#9aaac0', '#2a3440'] },
      crawl: ['#2a1608', '#140a04'],
      tile(ctx, k, X, Y, tx, ty) {
        const I = DD.IMG, kind = (x, y) => DD.kindAt(x, y), lip = kind(tx, ty - 1) !== k;
        if (k === 'court' && ok('w6_floor')) {
          let d = 0; while (kind(tx, ty - 1 - d) === k) d++;
          const sx = (((tx % 2) + 2) % 2) * 16;
          if (lip) ctx.drawImage(I.w6_floor, sx, 0, 16, 16, X, Y, 16, 16); else { ctx.drawImage(I.w6_floor, sx, 8, 16, 16, X, Y, 16, 16); ctx.fillStyle = 'rgba(14,5,0,' + Math.min(0.5, 0.12 + d * 0.1) + ')'; ctx.fillRect(X, Y, 16, 16); }
          return true;
        }
        if (k === 'rail' && ok('w6_floor')) { const sx = (((tx % 2) + 2) % 2) * 16; ctx.drawImage(I.w6_floor, sx, 0, 16, 8, X, Y, 16, 8); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(X, Y + 8, 16, 2); return true; }
        return false;
      },
      bg(ctx, G, DD) {   // the courtroom well: panelled wall, the gallery, Judge Szymczyk's bench with the seal and flags behind it
        const c = G.cam, VW = DD.VW, VH = DD.VH, I = DD.IMG, Yf = DD.wy(FLOORY), s = G.s, B = G.boss, ph2 = B && B.phase >= 1;
        ctx.fillStyle = '#2a1608'; ctx.fillRect(0, 0, VW, VH);
        if (ok('w6_wall')) {
          const ox = -Math.round(c.x * 0.3) % 64;
          for (let y = Math.round(Yf) - 128; y > -128; y -= 128) for (let x = ox - 64; x < VW; x += 64) ctx.drawImage(I.w6_wall, x, y);
          for (let y = Math.round(Yf); y < VH; y += 128) for (let x = ox - 64; x < VW; x += 64) ctx.drawImage(I.w6_wall, x, y);
        }
        const wx = x => Math.round(x - c.x * 0.5);
        // the gallery: two rows of seats with spectators, who jump when the fight gets loud
        const hit = G.frame - (G.flashAt ?? -999) < 30, cheer = (s.cheer || 0) > 0 || ph2 || hit;
        for (let row = 0; row < 2; row++) {
          const par = row ? 0.62 : 0.52, ys = Math.round(Yf - (row ? 66 : 100)), off = Math.round(c.x * par);
          ctx.save(); ctx.filter = row ? 'brightness(0.5)' : 'brightness(0.72)';
          if (ok('w6_gallery')) for (let i = Math.floor(off / 32) - 1; i <= Math.floor((off + VW) / 32) + 1; i++) {
            const h = hash(i * 7 + row * 131 + 5); if (h % 4 === 0) continue;
            const bounce = cheer ? -Math.abs(Math.sin((G.frame + i * 5) / 3)) * (ph2 ? 4 : 3) : 0;
            galHead(ctx, G, I, h, h % 3, i * 32 + 8 - off, Math.round(ys - 6), bounce, hit);
          }
          if (ok('w6_seatrow')) for (let x = -(off % 64) - 64; x < VW; x += 64) ctx.drawImage(I.w6_seatrow, x, ys);
          ctx.restore();
        }
        if (ok('w6_rail')) { const ox = -Math.round(c.x * 0.7) % 16; for (let x = ox - 16; x < VW; x += 16) ctx.drawImage(I.w6_rail, x, Math.round(Yf - 40)); }
        // the bench at the back of the well, centred on the arena: seal above, flags either side, the judge behind the cap rail
        const jx = Math.round(32 * TS - 64 - c.x), jy = Math.round(Yf - 74);
        if (ok('w6_seal')) ctx.drawImage(I.w6_seal, jx + 44, jy - 62);
        if (ok('w6_flags')) { ctx.drawImage(I.w6_flags, jx - 36, jy - 40); ctx.drawImage(I.w6_flags, jx + 124, jy - 40); }
        if (ok('w6_judgebench')) ctx.drawImage(I.w6_judgebench, jx, jy);
        s.jpos = [jx, jy];
        const g = ctx.createLinearGradient(0, Yf - 20, 0, Yf + 4); g.addColorStop(0, 'rgba(20,8,2,0)'); g.addColorStop(1, 'rgba(20,8,2,0.45)');
        ctx.fillStyle = g; ctx.fillRect(0, Yf - 20, VW, 24);
        if (ok('w6_lamp')) for (let i = Math.floor((c.x * 0.55 - 40) / 190) - 1; i <= Math.floor((c.x * 0.55 + VW) / 190) + 1; i++) {
          const X = Math.round(i * 190 + 95 - c.x * 0.55);
          ctx.drawImage(I.w6_lamp, X - 12 + ((G.frame - (G.dipAt ?? -999)) < 14 && G.frame % 4 < 2 ? 1 : 0), -4);   // rattles when the gavel/slam lands
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const r = ctx.createRadialGradient(X, 20, 3, X, 20, 90); r.addColorStop(0, ph2 ? 'rgba(255,140,90,0.3)' : 'rgba(255,214,120,0.3)'); r.addColorStop(1, 'rgba(255,214,120,0)');
          ctx.fillStyle = r; ctx.fillRect(X - 90, -70, 180, 180); ctx.restore();
        }
        const v = ctx.createLinearGradient(0, 0, 0, VH); v.addColorStop(0, 'rgba(10,4,0,0.45)'); v.addColorStop(0.3, 'rgba(10,4,0,0)'); v.addColorStop(1, 'rgba(10,4,0,0.2)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
        if (ph2) { ctx.fillStyle = 'rgba(120,20,10,0.12)'; ctx.fillRect(0, 0, VW, VH); }
      },
    },
    script: {
      init(G) { Object.assign(G.s, { judge: 0, judgeT: 0, cheer: 0, side: 0 }); },
      update(G) {   // phase 2: the judge raises his gavel (a marker shows the side), then bangs every 210 frames, sending a shockwave along the floor
        const s = G.s, B = G.boss;
        if (s.judgeT > 0) s.judgeT--; if (s.cheer > 0) s.cheer--;
        if (!B || !B.engaged || B.dead || B.phase < 1) return;
        const bo = DD.bodies.find(b => b.kind === 'lt_boss'); if (bo && (bo.st === 'stun' || bo.st === 'land' || bo.st === 'throw')) return;   // the gavel waits while he is dizzy
        s.judge++;
        if (s.judge === 150) s.side = Math.random() < 0.5 ? -1 : 1;
        if (s.judge >= 150) s.raise = true;
        if (s.judge < 210) return;
        s.judge = 0; s.raise = false; s.judgeT = 24;
        const left = s.side < 0, x = left ? B.arena[0] + 8 : B.arena[1] - 24;
        DD.addEntity('lt_shock', { x: x, y: 21 * 16 - 12, w: 10, h: 12, vx: left ? 3.2 : -3.2, vy: 0, life: 120 });
        DD.SFX.thud(); G.shake = Math.max(G.shake, 4);
      },
      drawMid(ctx, G) {   // the judge in front of his bench, the warning marker for the next bang, the lamp pools
        const s = G.s, c = G.cam, I = DD.IMG, Yf = DD.wy(FLOORY), VW = DD.VW, B = G.boss;
        if (s.jpos && ok('w6_judge')) {
          const up = s.judgeT > 0 || s.raise;
          ctx.drawImage(I.w6_judge, (up ? 1 : 0) * 32, 0, 32, 32, s.jpos[0] + 48, s.jpos[1] - 16 + (up && s.judgeT > 0 ? 3 : 0), 32, 32);
          ctx.drawImage(I.w6_judgebench, 0, 0, 128, 10, s.jpos[0], s.jpos[1], 128, 10);
        }
        if (s.raise && B && !B.dead) {   // red chevrons on the side the shockwave will come from
          const left = s.side < 0, X = left ? DD.wx(B.arena[0] + 8) : DD.wx(B.arena[1] - 24), blink = Math.floor(G.frame / 5) % 2;
          ctx.fillStyle = blink ? '#ff5a40' : '#ffd860';
          for (let i = 0; i < 4; i++) { const x = X + (left ? 1 : -1) * (6 + i * 10); ctx.fillRect(x, Yf - 14, 2, 10); ctx.fillRect(x + (left ? 2 : -2), Yf - 12, 2, 6); }
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = Math.floor((c.x - 60) / 190) - 1; i <= Math.floor((c.x + VW + 60) / 190) + 1; i++) {
          const X = Math.round(i * 190 + 95 - c.x);
          ctx.save(); ctx.translate(X, Yf); ctx.scale(1, 0.18);
          const r = ctx.createRadialGradient(0, 0, 2, 0, 0, 70); r.addColorStop(0, 'rgba(255,214,120,0.34)'); r.addColorStop(1, 'rgba(255,214,120,0)');
          ctx.fillStyle = r; ctx.fillRect(-70, -70, 140, 140); ctx.restore();
        }
        ctx.restore();
      },
      drawFG(ctx, G) {
        const VW = DD.VW, VH = DD.VH;
        const v = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.65); v.addColorStop(0, 'rgba(10,4,0,0)'); v.addColorStop(1, 'rgba(10,4,0,0.4)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
        const g = ctx.createLinearGradient(0, VH - 14, 0, VH); g.addColorStop(0, 'rgba(36,66,128,0.95)'); g.addColorStop(1, 'rgba(14,26,64,0.96)');
        ctx.fillStyle = g; ctx.fillRect(0, VH - 14, 124, 14); ctx.fillStyle = 'rgba(190,210,255,0.5)'; ctx.fillRect(0, VH - 14, 124, 1);
        ctx.fillStyle = '#e8362a'; ctx.fillRect(0, VH - 14, 42, 14); ctx.fillStyle = '#ff7a60'; ctx.fillRect(0, VH - 14, 42, 1); ctx.fillStyle = '#9a1a14'; ctx.fillRect(42, VH - 14, 1, 14);
        DD.text('LIVE', 21, VH - 10, '#fff', 1, '#6a0a08', 'center');
        const B = G.boss;
        DD.text(B && B.phase >= 1 ? 'SELF-REPRESENTED' : 'CROSS-EXAMINATION', 48, VH - 9, '#fff', 1, null, 'left');
      },
    },
  };
}
// ==== ART PASS (design/ART-PASS-BRIEF.md): three-tone edges, light, depth and a little life, layered over the set art above ====
;(function () {
  const L = window.LEVEL, th = L.theme, S = L.script || (L.script = {});
  const P = {
  hi: '255,214,150', hiK: { gallery: '190,215,255', org: '200,225,255', bench: '255,200,130' }, mote: ['#ffe6b0', 22, 0.4], vig: 0.38,
  lip(A, X, Y, tx, ty, k) { if (k === 'floor' || k === 'court') A.R(X, Y + 2, 16, 1, 'rgba(255,230,170,0.12)'); },
  bg(ctx, G, A, Q) {
    const { c, VW, VH, f, lay } = Q, Yf = DD.wy(336), ph2 = !!(G.boss && G.boss.phase >= 1);
    lay(0.4, 360, (X, i) => {   // tall windows on the far wall with a pale beam, and fluted pilasters either side of the seal groups
      const Y = Yf - 214; A.box(X - 12, Y, 24, 62, '#3a2410'); A.R(X - 9, Y + 3, 18, 50, ph2 ? '#d8b8a0' : '#bcd4e4'); A.R(X - 9, Y + 3, 18, 8, ph2 ? '#f0d8c0' : '#e8f2f8');
      A.R(X - 1, Y + 3, 2, 50, '#3a2410'); A.R(X - 9, Y + 24, 18, 2, '#3a2410'); A.R(X - 14, Y + 62, 28, 3, '#6a4220'); A.R(X - 14, Y + 62, 28, 1, '#a07040');
      A.cone(X, Y + 50, 130, 40, '#fff0c8', 0.06);
      for (const o of [90, 270]) { const px = X + o - 5; A.R(px, Yf - 232, 10, 120, '#3a2210'); A.planks(px, Yf - 232, 10, 120, '#3a2210', 3, true); A.R(px - 2, Yf - 232, 14, 4, '#6a4220'); A.R(px - 2, Yf - 232, 14, 1, '#a07040'); A.R(px - 2, Yf - 116, 14, 4, '#6a4220'); }
    });
    A.trim(0, Yf - 111, VW, '#c89a4a'); A.R(0, Yf - 108, VW, 1, 'rgba(0,0,0,0.3)');   // a gilt dado rail above the gallery heads
    lay(0.55, 190, (X, i) => { A.cone(X + 95, 16, 120, 44, '#ffd88a', 0.09); A.R(X + 91, 14, 8, 2, '#c89a4a'); });   // the pendant lamps throw their light down across the gallery
    lay(0.5, 64, (X, i) => { A.R(X + 30, Yf - 92, 3, 2, 'rgba(232,184,96,0.5)'); A.R(X + 30, Yf - 58, 3, 2, 'rgba(232,184,96,0.35)'); });   // brass seat plates
    
    const jp = G.s && G.s.jpos; if (jp) { A.cone(jp[0] + 64, 0, jp[1] + 6, 46, ph2 ? '#ff9a70' : '#fff0c0', 0.12); A.glow(jp[0] + 64, jp[1] - 40, 40, ph2 ? '#ff7a50' : '#ffe8a0', 0.18); }
    if (ph2) A.R(0, 0, VW, VH, 'rgba(120,10,6,' + (0.04 + 0.03 * Math.sin(f / 9)) + ')');
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
