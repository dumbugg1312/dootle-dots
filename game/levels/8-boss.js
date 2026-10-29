// World 8 boss: JOKER GREGG (Oscar 7 / S12), who drove the Mobile VFA into the wedding set. Hand-written: arena, boss entity,
// cartoon smog puffs and the falling NO RATING picket signs. Set art and sprites: design/sprites/w8_set.py, w8_chars.py
// (w8_joker*.png: six 64-wide poses; w8_f_wed / w8_t_wed tiles; the wedding drape, columns, trellis, tables).
// Attacks (each telegraphed for 40 frames: the car flashes red, and a red lane or floor shadows show where it lands):
//   1. SMOG: he leans out of the sunroof and sprays smog puffs that drift toward you. Jump the puffs. He is open afterwards.
//   2. RAM: the VFA drives wall to wall (a red lane marks the run). Jump it. He is stunned at the wall.
//   3. PICKET: Bond Gregg's NO RATING signs drop onto shadows marked on the floor. Step off a shadow. He is dizzy after.
// Between attacks he rolls at you. Stomp him only while he is open (after an attack, the dizzy stars). Otherwise touching him hurts.
//   4. HONK (phase 2 only): the horn. After a red flash and chevrons on the floor, three honk waves roll along the floor toward you, one every half second. Hop each.
// Every attack ends in a harmless 'cool' beat (he waits for puffs, signs and honks to clear, and they are swept away if they linger) and then he is dizzy for about 1.75 s (1.5 s in
// phase 2): the stomp window. Nothing overlaps it, nothing hurts while he is dizzy, and he stops short of you when he rolls, so he never runs into you.
// Phase 2 ("NO RATING", at 3 pips): the honk joins the rotation; four puffs, a second ram pass (with its own wind-up at the wall) and four signs.
{
  const FLOOR_Y = 21 * 16;   // the arena floor top in px
  const TS = 16;
  const I = n => (DD.ready(n) ? DD.IMG[n] : null);
  const glow = (ctx, x, y, r, rgb, a) => { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const beam = (ctx, x, y0, y1, w0, w1, rgb, a) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w0, y0); ctx.lineTo(x + w0, y0); ctx.lineTo(x + w1, y1); ctx.lineTo(x - w1, y1); ctx.fill(); };

  // the cartoon smog puff: a lumpy grey cloud with a dark underside and a toxic-yellow edge, drifts and hurts on touch
  DD.defineEntity('w8smog', {
    stomp: () => false,
    touch(e) { if (!e.dead) { DD.hurt(DD.cx(e)); e.dead = true; DD.dust(DD.cx(e), e.y + 8, 6, 1.4, '#bdb8a6'); } },
    update(e) { e.x += e.vx; e.t = (e.t || 0) + 1; if (--e.life <= 0) e.dead = true; if (e.t % 9 === 0) DD.part && DD.part({ x: e.x + 4 + (e.t % 3) * 6, y: e.y + 10, vx: -e.vx * 0.2, vy: 0.2, life: 18, max: 18, r: 2, col: 'rgba(170,166,150,0.6)', g: 0 }); },
    draw(e, ctx, G) {
      const X = DD.wx(e.x), Y = DD.wy(e.y) + Math.round(Math.sin((e.t || 0) / 9 + e.x) * 1.5), k = (e.t || 0) / 10;
      const blob = (cx, cy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); };
      blob(X + 11, Y + 8, 9, '#3a382e'); blob(X + 5, Y + 9, 6, '#3a382e'); blob(X + 17, Y + 9, 6, '#3a382e'); blob(X + 11, Y + 3, 6, '#3a382e');   // the dark rim
      blob(X + 11, Y + 7, 8, '#9a9686'); blob(X + 5, Y + 8, 5, '#9a9686'); blob(X + 17, Y + 8, 5, '#9a9686'); blob(X + 11, Y + 2, 5, '#9a9686');
      blob(X + 9, Y + 5, 5, '#c8c4b0'); blob(X + 5, Y + 6, 3, '#d8d4c0'); blob(X + 10, Y + 1, 3, '#d8d4c0');   // the lit upper left
      blob(X + 14, Y + 11, 4, '#7a766a');                                                                         // the shaded belly
      ctx.fillStyle = '#16121a'; ctx.fillRect(X + 7, Y + 6, 2, 2); ctx.fillRect(X + 13, Y + 6, 2, 2); ctx.fillRect(X + 8, Y + 11, 6, 1);   // a cartoon scowl
      ctx.fillStyle = 'rgba(214,214,60,' + (0.25 + 0.15 * Math.sin(k)) + ')'; ctx.fillRect(X, Y + 4, 1, 6); ctx.fillRect(X + 21, Y + 4, 1, 6);
    },
  });

  // a NO RATING picket sign: falls onto its shadow, then stands on the floor a while as a low hazard
  DD.defineEntity('w8sign', {
    stomp: () => false,
    touch(e) { if (!e.dead && e.landed) DD.hurt(DD.cx(e)); },
    update(e) {
      if (!e.landed) { e.vy = Math.min(e.vy + 0.45, 8); if (DD.moveY(e, e.vy, false)) { e.landed = true; DD.SFX.thud(); DD.dust(DD.cx(e), e.y + e.h, 5, 1.4, '#e8dcec'); } else if (e.y > 17 * 16) e.hot = true; }
      if (--e.life <= 0) e.dead = true;
      if (e.landed && e.life < 40 && e.life % 4 === 0) e.blink = !e.blink;
    },
    draw(e, ctx) {
      if (e.blink) return;
      const X = DD.wx(e.x), Y = DD.wy(e.y);
      ctx.fillStyle = '#4a3a58'; ctx.fillRect(X + 11, Y + e.h - 1, 3, 6); ctx.fillStyle = '#7a6a8a'; ctx.fillRect(X + 11, Y + e.h - 1, 1, 6);   // the stick
      ctx.fillStyle = '#2a1e32'; ctx.fillRect(X - 1, Y - 1, e.w + 2, e.h + 2);
      ctx.fillStyle = '#fffafc'; ctx.fillRect(X, Y, e.w, e.h); ctx.fillStyle = '#c8bcd0'; ctx.fillRect(X, Y + e.h - 1, e.w, 1); ctx.fillRect(X + e.w - 1, Y, 1, e.h);
      ctx.fillStyle = '#d62a2a'; ctx.fillRect(X, Y, e.w, 2); ctx.fillRect(X, Y + e.h - 2, e.w, 2); ctx.fillStyle = '#f26a52'; ctx.fillRect(X, Y, e.w, 1);
      DD.text('NO', X + e.w / 2, Y + 3, '#d62a2a', 1, null, 'center'); DD.text('RATING', X + e.w / 2 + 1, Y + 9, '#4a3a58', 1, null, 'center');
      if (!e.landed) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(X + 3, Y - 12, 1, 10); ctx.fillRect(X + 12, Y - 18, 1, 14); }   // speed lines
    },
  });

  // the horn: a honk wave rolls along the floor (hop it); gone after a short distance
  DD.defineEntity('w8honk', {
    stomp: () => false,
    touch(e) { if (!e.dead) { DD.hurt(DD.cx(e)); e.dead = true; } },
    update(e, G) { e.t = (e.t || 0) + 1; if (DD.moveX(e, e.vx, false) || --e.life <= 0) { e.dead = true; DD.dust(DD.cx(e), e.y + e.h, 4, 1.2, '#fff2a0'); } },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y), k = (e.t >> 2) % 2, f = e.vx > 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(255,230,120,0.28)'; ctx.fillRect(X - 2, Y - 2, e.w + 4, e.h + 4);
      ctx.strokeStyle = k ? '#fff2a0' : '#ffb830'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const ax = X + (f > 0 ? 4 + i * 5 : e.w - 4 - i * 5); ctx.beginPath(); ctx.arc(ax, Y + e.h / 2, 5 + i * 2, f > 0 ? -1.1 : Math.PI - 1.1, f > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke(); }
      DD.text('HONK', X + e.w / 2, Y - 8, k ? '#fff2a0' : '#ffb830', 1, '#000', 'center');
    },
  });
  const hazards = () => DD.bodies.some(b => !b.dead && (b.kind === 'w8smog' || b.kind === 'w8sign' || b.kind === 'w8honk'));
  const sweep = () => { for (const b of DD.bodies) if (!b.dead && (b.kind === 'w8smog' || b.kind === 'w8sign' || b.kind === 'w8honk')) { b.dead = true; DD.dust(DD.cx(b), b.y + b.h / 2, 5, 1.2, '#d8cde0'); } };

  // Joker Gregg. Only his open windows can be stomped; the rest of the time he hurts. The ram is low and long.
  const jokerSetH = (e, h) => { e.h = h; e.y = FLOOR_Y - h; };
  DD.defineEntity('joker_boss', {
    spawn: t => ({ x: t.x, y: FLOOR_Y - 54, w: 52, h: 54, dir: -1, st: 'walk', t: 0, n: 0, atk: null, sg: [], ram2: false, openT: 0, sx: 0, tick: 0, deadT: 0 }),
    update(e, G) {
      const B = DD.boss; e.tick++;
      if (B && B.dead) {   // the defeat: the engine puffs out, wheels stop, smoke rolls off him in clouds
        e.deadT++; jokerSetH(e, 54); e.vx = 0;
        if (e.deadT % 5 === 0) DD.part && DD.part({ x: DD.cx(e) + (Math.random() - 0.5) * 40, y: e.y + 6, vx: (Math.random() - 0.5) * 0.8, vy: -0.9, life: 40, max: 40, r: 4, col: 'rgba(190,186,170,0.7)', g: -0.01 });
        if (e.deadT % 14 === 1) { DD.stars(DD.cx(e) + (Math.random() - 0.5) * 50, e.y - 4, 4, '#ffe680'); DD.SFX.pop && DD.SFX.pop(); }
        return;
      }
      if (!B || !B.engaged) return;
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      e.t++;
      if (e.st === 'walk') {                       // roll at the Dot, then pick the next attack
        e.dir = P < me ? -1 : 1; const gap = Math.abs(P - me); e.vx = gap > 90 ? e.dir * (0.5 + ph * 0.25) : gap < 58 ? -e.dir * (0.9 + ph * 0.25) : 0;   // he stops short of you: he never rolls into you, and he backs off if a ram left him on top of you in a corner
        jokerSetH(e, 54);
        e.x += e.vx;
        if (e.t > 100) {
          const pool = ph >= 1 ? ['smog', 'honk', 'ram', 'picket'] : ['smog', 'ram', 'picket'];
          e.st = 'wind'; e.t = 0; e.atk = pool[e.n++ % pool.length];
          e.dir = P < me ? -1 : 1; e.ram2 = false;
          if (e.atk === 'picket') {                 // shadows where the signs will land: a fair spread around the Dot
            const offs = ph >= 1 ? [-48, -12, 24, 60] : [-20, 24];
            e.sg = offs.map(o => DD.clamp(P + o, B.arena[0] + 8, B.arena[1] - 34));
          }
          DD.SFX.buzz && DD.SFX.buzz();
        }
      } else if (e.st === 'wind') {                // telegraph: 40 frames of red flashing and revving, then the attack
        e.vx = 0;
        if (e.t % 8 === 0) DD.part && DD.part({ x: e.dir > 0 ? e.x - 8 : e.x + e.w + 8, y: FLOOR_Y - 8, vx: -e.dir * 1.2, vy: -0.3, life: 20, max: 20, r: 3, col: 'rgba(200,196,184,0.6)', g: 0 });
        if (e.t >= 40) {
          e.t = 0;
          if (e.atk === 'smog') { e.st = 'smog'; e.sx = 0; }
          else if (e.atk === 'honk') { e.st = 'honk'; }
          else if (e.atk === 'ram') { e.st = 'ram'; jokerSetH(e, 30); e.rev = 0; }
          else { e.st = 'picket'; }
        }
      } else if (e.st === 'smog') {                // sprays puffs toward the Dot
        const count = ph >= 1 ? 4 : 3;
        if (e.t % 25 === 10 && e.t / 25 < count) {
          DD.addEntity('w8smog', { x: me + e.dir * 28 - 11, y: FLOOR_Y - 42, w: 22, h: 14, vx: e.dir * (1 + ph * 0.25), life: 200, t: 0 });
          DD.SFX.tick && DD.SFX.tick();
        }
        if (e.t > count * 25 + 20) { e.st = 'cool'; e.t = 0; }
      } else if (e.st === 'ram') {                 // low drive across the arena; the wall stuns him
        jokerSetH(e, 30);
        e.vx = e.dir * (4 + ph * 0.8);
        e.x += e.vx;
        if (e.t % 4 === 0) DD.dust(e.dir > 0 ? e.x : e.x + e.w, FLOOR_Y, 2, 1.2, '#d8cde0');
        const lo = B.arena[0], hi = B.arena[1];
        if (e.x <= lo || e.x + e.w >= hi) {
          e.x = DD.clamp(e.x, lo, hi - e.w);
          if (ph >= 1 && !e.ram2) { e.ram2 = true; e.dir = -e.dir; e.st = 'wind'; e.atk = 'ram'; e.t = 0; jokerSetH(e, 54); DD.SFX.thud(); G.shake = Math.max(G.shake || 0, 5); }   // phase 2: a second pass, with a full wind-up first
          else { e.st = 'open'; e.t = 0; e.openT = ph >= 1 ? 90 : 105; jokerSetH(e, 54); DD.SFX.thud(); G.shake = Math.max(G.shake || 0, 8); DD.stars(DD.cx(e), e.y, 8, '#ffe680'); }
        }
      } else if (e.st === 'picket') {              // the signs drop in, then the opening
        if (!e.dropped) {
          e.dropped = true;
          e.sg.forEach((sx, i) => DD.addEntity('w8sign', { x: sx, y: 3 * 16 - i * 10, w: 26, h: 16, vy: 0, life: 150, landed: false }));
        }
        if (e.t > 50) { e.st = 'cool'; e.t = 0; e.dropped = false; }
      } else if (e.st === 'honk') {                // three honk waves, half a second apart, along the floor toward you
        if (e.t % 30 === 10 && e.t < 80) {
          DD.addEntity('w8honk', { x: e.dir > 0 ? e.x + e.w + 2 : e.x - 22, y: FLOOR_Y - 22, w: 20, h: 22, vx: e.dir * 2, life: 110, t: 0 });
          DD.SFX.buzz && DD.SFX.buzz(); G.shake = Math.max(G.shake || 0, 2);
        }
        if (e.t > 90) { e.st = 'cool'; e.t = 0; }
      } else if (e.st === 'cool') {                // the attack is still out there: he waits for it to clear, then goes dizzy
        e.vx = 0; jokerSetH(e, 54);
        if (e.t > 24 && (!hazards() || e.t > 110)) { sweep(); e.st = 'open'; e.t = 0; e.openT = ph >= 1 ? 90 : 105; }
      } else if (e.st === 'hurt') {                // knocked about by the stomp: harmless for a moment
        e.vx = 0; jokerSetH(e, 54);
        if (e.t > 45) { e.st = 'walk'; e.t = 0; }
      } else if (e.st === 'open') {                // the opening: he is dizzy; stomp him now
        e.vx = 0; jokerSetH(e, 54);
        if (e.t > e.openT) { e.st = 'walk'; e.t = 0; }
      }
      // keep him inside the arena walls, standing on the floor
      const lo = B.arena[0], hi = B.arena[1];
      if (e.x < lo) e.x = lo;
      if (e.x + e.w > hi) e.x = hi - e.w;
    },
    stomp(e, G) {   // only in the open window; otherwise return false so touch hurts
      const B = DD.boss;
      if (e.st !== 'open' || !B || B.dead) return false;
      DD.hitBoss(1); e.st = 'hurt'; e.t = 0;   // one pip per opening: he recoils, then the whole cycle starts again
      return true;
    },
    touch(e) { if (e.st !== 'open' && e.st !== 'cool' && e.st !== 'hurt' && !(e.st === 'walk' && e.t < 30) && DD.boss && !DD.boss.dead) DD.hurt(DD.cx(e)); },   // walking, he is harmless for his first half second after the dizzy window: a Dot he has pinned in a corner gets time to step out
    draw(e, ctx, G) {
      const B = DD.boss, X = DD.wx(e.x), cxp = DD.wx(e.x + e.w / 2), by = DD.wy(e.y + e.h);
      if (e.st === 'wind' && e.atk === 'picket') {   // the shadows on the floor
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        e.sg.forEach(sx => { ctx.fillRect(DD.wx(sx) - 1, DD.wy(FLOOR_Y - 3), 28, 4); ctx.fillStyle = 'rgba(214,42,42,' + (0.35 + 0.3 * Math.sin(e.t / 3)) + ')'; ctx.fillRect(DD.wx(sx) + 2, DD.wy(FLOOR_Y - 2), 22, 2); ctx.fillStyle = 'rgba(0,0,0,0.5)'; });
      }
      if (e.st === 'wind' && e.atk === 'honk') {      // red chevrons on the floor in front of the horn, flashing
        const on = Math.floor(e.t / 5) % 2, x0 = e.dir > 0 ? e.x + e.w + 6 : e.x - 6;
        for (let i = 0; i < 5; i++) { const cx0 = DD.wx(x0 + e.dir * i * 14); ctx.fillStyle = on ? 'rgba(255,90,70,0.8)' : 'rgba(255,255,255,0.3)'; ctx.fillRect(cx0, DD.wy(FLOOR_Y - 10), 2, 8); ctx.fillRect(cx0 + e.dir * 3, DD.wy(FLOOR_Y - 8), 2, 4); }
      }
      if (e.st === 'wind' && e.atk === 'ram') {      // the red lane: the whole run, pulsing
        const lo = DD.wx(B.arena[0]), hi = DD.wx(B.arena[1]), a = 0.14 + 0.1 * Math.sin(e.t / 3);
        ctx.fillStyle = 'rgba(214,42,42,' + a + ')'; ctx.fillRect(lo, DD.wy(FLOOR_Y - 30), hi - lo, 30);
        ctx.fillStyle = 'rgba(255,90,70,' + (a + 0.15) + ')'; const off = e.dir > 0 ? (e.t * 3) % 32 : 32 - (e.t * 3) % 32; for (let x = lo; x < hi; x += 32) ctx.fillRect(x + off, DD.wy(FLOOR_Y - 18), 10, 2);
      }
      let name = 'w8_joker', bob = 0;
      const hurt = B && B.inv > 0 && B.inv > (B.cfg.inv || 60) - 28;
      if (B && B.dead) name = 'w8_joker_hurt';
      else if (hurt) name = 'w8_joker_hurt';
      else if (e.st === 'smog' || (e.st === 'wind' && e.atk === 'smog')) name = 'w8_joker_smog';
      else if (e.st === 'honk' || (e.st === 'wind' && e.atk === 'honk')) name = 'w8_joker_ram';
      else if (e.st === 'ram' || (e.st === 'wind' && e.atk === 'ram')) name = 'w8_joker_ram';
      else if (e.st === 'open') name = 'w8_joker_open';
      else if (e.st === 'picket' || (e.st === 'wind' && e.atk === 'picket')) name = 'w8_joker_picket';
      else bob = Math.round(Math.sin(e.tick / 7) * 1);
      if (B && !B.dead && B.inv > 0 && !hurt && Math.floor(B.inv / 3) % 2) return;
      if (B && B.dead) ctx.globalAlpha = Math.max(0, Math.min(1, (B.endT || 100) / 100));
      const flip = e.dir > 0;
      ctx.save();
      if (e.st === 'wind' && Math.floor(e.t / 4) % 2) ctx.filter = 'sepia(1) saturate(6) hue-rotate(-45deg) brightness(1.15)';   // the red telegraph flash
      else if (B && B.flash > 0 && B.flash % 2) ctx.filter = 'brightness(3) saturate(0.2)';                                            // the hit flash
      const rev = e.st === 'wind' ? Math.round(Math.sin(e.t * 2) * 1) : 0;
      DD.spr(name, cxp + rev, by + bob + 1, flip);
      ctx.restore();
      if (e.st === 'ram' || (e.st === 'wind' && e.atk === 'ram')) {   // headlights throw a lane of light ahead
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hx = flip ? X + e.w + 4 : X - 4;
        const g = ctx.createLinearGradient(hx, 0, hx + (flip ? 90 : -90), 0); g.addColorStop(0, 'rgba(255,240,170,0.4)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.fillRect(Math.min(hx, hx + (flip ? 90 : -90)), by - 18, 90, 14); ctx.restore();
      }
      if (e.st === 'open' && !(B && B.dead)) {   // the dizzy stars wheeling over his hair
        for (let i = 0; i < 3; i++) { const a = e.tick / 9 + i * 2.1, sx = cxp + Math.cos(a) * 16, sy = by - 62 + Math.sin(a) * 4; ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 3, 2, 6); ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 1, 6, 2); ctx.fillStyle = '#fffbe0'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2); }
      }
      if (e.st === 'smog' || (e.st === 'wind' && e.atk === 'smog')) {   // exhaust rolling off the tailpipe
        const tx = flip ? X - 8 : X + e.w + 6;
        for (let i = 0; i < 3; i++) { const k = ((e.tick + i * 9) % 27) / 27; ctx.fillStyle = 'rgba(190,186,170,' + (0.5 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(tx + (flip ? -1 : 1) * k * 16, by - 8 - k * 10, 3 + k * 4, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    },
  });

  // ---- set drawing: the wedding set after the car drove in
  const hash = (a, b) => { let n = (a * 374761393 + b * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };

  window.LEVEL = {
    id: '8-boss', name: 'JOKER GREGG', sub: 'THE MOBILE VFA', world: 8,
    W: 60, H: 24, FLOOR: 21,
    SOLID: [['floor', 0, 21, 60, 3], ['tier', 4, 17, 4, 1], ['tier', 52, 17, 4, 1], ['tier', 26, 18, 8, 1]],
    KINDS: { floor: 1, tier: 2 },
    THINGS: [['dot', 1, 20], ['joker_boss', 48, 20]],
    POPCORN: [[4, 19, 3], [4, 16, 4], [10, 20, 3], [14, 18, 1], [16, 17, 1], [18, 17, 1], [20, 18, 1], [22, 20, 3], [26, 17, 8], [36, 20, 3],
      [40, 18, 1], [42, 17, 1], [44, 17, 1], [46, 18, 1], [52, 16, 4], [56, 20, 2], [28, 20, 4], [2, 17, 1]],
    sprites: ['w8_joker', 'w8_joker_smog', 'w8_joker_hurt', 'w8_joker_open', 'w8_joker_picket', 'w8_joker_ram',
      'w8_f_wed', 'w8_t_wed', 'w8_drape', 'w8_column', 'w8_trellis', 'w8_wedtable', 'w8_arthurtv', 'w8_dirchair', 'w8_guitar', 'w8_flowers_a', 'w8_flowers_b', 'w8_strlights',
      'w8_flag', 'w8_timwed_full', 'w8_bond',
      'w8_brick', 'w8_marquee', 'w8_armchair', 'w8_armchair_r', 'w8_popcart', 'w8_timceo', 'w8_coffee', 'w8_lamp', 'w8_hills_far', 'w8_hills_near', 'w8_mesa_a', 'w8_mesa_b',
      'w8_cactus_a', 'w8_cactus_b', 'w8_sun', 'w8_timranch', 'w8_greggranch', 'w8_scrub', 'w8_drum'],   // the second line: the boss_out cutaways (cuts/w8.js)
    portraits: { joker: 'w8_portrait_joker', bond: 'w8_portrait_bond', wed: 'w8_portrait_wed', ceo: 'w8_portrait_ceo' },
    names: { joker: 'JOKER GREGG', bond: 'BOND GREGG', wed: 'WEDDING TIM', ceo: 'HEI CEO TIM' },
    lines: {   // design/VOICE.md. Sources: the 7th Oscar Special (the Mobile VFA's entrance, the Arthur museum), S12 last-night-in-soho-antlers (Gregg refusing popcorn ratings, for the NO RATINGS banner)
      boss: [['joker', 'THE MOBILE VFA HAS ARRIVED. IT\'S MOVIE TIME.'], ['wed', 'WHAT DOES ARTHUR HAVE TO DO WITH THE OSCARS?']],
      bossPhase: [['bond', 'ARTHUR, 1981. 97 MINUTES, STARRING DUDLEY MOORE.']],
      bossDefeat: [['joker', "THE WORLD'S FIRST ARTHUR MUSEUM."], ['wed', 'ARTHUR IS ONLY ARTHUR TODAY.']],
    },
    boss: {
      name: 'JOKER GREGG', hp: 6, arena: [2, 58], inv: 60,
      phases: [{ at: 3, say: 'NO RATINGS', sub: 'BOND GREGG PICKETS' }],
      onHit: (G, B) => { G.shake = Math.max(G.shake || 0, 6); DD.stars(G.pl.x, G.pl.y - 10, 6, '#ffe680'); },
      onDefeat: (G) => {
        DD.banner('THE MOBILE VFA', 90, 'WORLD\'S FIRST ARTHUR MUSEUM');
        const e = DD.bodies.find(b => b.kind === 'joker_boss');
        if (e) for (let i = 0; i < 14; i++) DD.drop({ x: DD.cx(e), y: e.y, vx: (i - 7) * 0.5, vy: -3 - (i % 3), life: 400, wait: 20 });
        G.shake = Math.max(G.shake || 0, 14);
      },
    },
    theme: {
      tiles: { floor: ['#c8b4ca', '#fffafc', '#8a7a96'], tier: ['#f2e6f2', '#ffffff', '#b8a2c0'] },
      tile(ctx, k, X, Y, tx, ty) {
        const kind = DD.kindAt;
        if (k === 'floor') {
          const im = I('w8_f_wed'); if (!im) return false;
          ctx.drawImage(im, (tx % 2) * 16, kind(tx, ty - 1) ? 16 : 0, 16, 16, X, Y, 16, 16);
          if (!kind(tx, ty - 1)) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 16, 1); ctx.fillStyle = 'rgba(255,225,240,0.5)'; ctx.fillRect(X, Y + 1, 16, 1); } else if (!kind(tx, ty + 1)) { ctx.fillStyle = 'rgba(60,20,70,0.45)'; ctx.fillRect(X, Y + 13, 16, 3); }
          return true;
        }
        if (k === 'tier') { const im = I('w8_t_wed'); if (!im) return false; ctx.drawImage(im, (tx % 2) * 16, 0, 16, 16, X, Y, 16, 16); return true; }
        return false;
      },
      bg(ctx, G, DD) {   // the wedding set at night: blush drape, columns, the trellis arch with Wedding Tim, tables, string lights
        const cx = Math.round(G.cam.x), cy = Math.round(G.cam.y), FY = FLOOR_Y - cy, f = G.frame, B = DD.boss, ph = B ? B.phase : 0;
        ctx.fillStyle = '#2a1426'; ctx.fillRect(0, 0, 320, 180);
        const dr = I('w8_drape');
        if (dr) { const ox = -Math.round(cx * 0.9) % 48; for (let x = ox - 48; x < 368; x += 48) for (let y = FY - 192; y < 180; y += 96) ctx.drawImage(dr, x, y); }
        const gr = ctx.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, 'rgba(30,6,36,0.62)'); gr.addColorStop(0.5, 'rgba(30,6,36,0.12)'); gr.addColorStop(1, 'rgba(50,14,52,0.3)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 320, 180);
        { const A = DD.art, P = 0.6, S = 40, ox = -Math.round(cx * P) % S, kb = Math.floor(cx * P / S);   // the guests: rows of white folding chairs with dark heads in them, far back
          for (let x = ox - S; x < 320 + S; x += S) for (const [dy, dim] of [[-38, 0.55], [-24, 0.75]]) {
            const hh = hash(Math.round((x - ox) / S) + kb, dy), y = FY + dy - 6;
            A.R(x + 6, y + 12, 22, 2, A.mix('#d8c8dc', -dim)); A.R(x + 6, y + 14, 2, 6, A.mix('#d8c8dc', -dim - 0.2)); A.R(x + 26, y + 14, 2, 6, A.mix('#d8c8dc', -dim - 0.2)); A.R(x + 6, y - 2, 22, 2, A.mix('#d8c8dc', -dim)); A.R(x + 6, y - 2, 2, 14, A.mix('#d8c8dc', -dim - 0.1));
            if (hh < 0.7) { const hc = ['#1a0e1c', '#2a1626', '#3a2018', '#120a14'][Math.floor(hh * 10) % 4]; A.R(x + 13, y - 8, 8, 8, hc); A.R(x + 11, y, 12, 12, A.mix(['#3a2a52', '#52283a', '#2a3a52', '#3a4a3a'][Math.floor(hh * 7) % 4], -0.4)); }
          }
          ctx.fillStyle = 'rgba(30,6,36,0.38)'; ctx.fillRect(0, FY - 60, 320, 60);
          for (const wx of [18, 42]) { const X = wx * TS - cx; if (X < -50 || X > 370) continue;   // two crystal chandeliers on chains
            A.R(X, 0, 1, 30, '#6a5030'); A.box(X - 14, 30, 28, 4, '#c98f22', { outline: '#3a2810' }); A.R(X - 14, 30, 28, 1, '#ffe08a'); for (let q = -12; q <= 12; q += 6) { A.R(X + q, 34, 1, 4 + Math.abs(q) % 3, '#e8f4ff'); A.R(X + q, 33, 1, 1, '#ffe08a'); } for (const q of [-12, 0, 12]) { A.R(X + q - 1, 26, 3, 4, '#fff6d0'); A.glow(X + q, 26, 12, '#ffe8a0', 0.3); }
            A.glow(X, 36, 56, '#ffe8c0', 0.16 + 0.03 * Math.sin(f / 9 + wx)); A.cone(X, 38, 90, 44, '#ffe8c0', 0.06); }
          for (let x = ox - S; x < 320 + S; x += 64) { const X = x + Math.round(((cx * 0.9) % 64) * 0) ; for (let i = 0; i < 64; i += 4) { const y = Math.round(Math.sin(Math.PI * i / 64) * 7); A.R(X + i, 0, 4, 5 + y, '#4a2444'); A.R(X + i, 4 + y, 4, 1, '#c98f22'); A.R(X + i, 0, 1, 5 + y, '#6a3a62'); } }   // the swagged valance with a gilt hem
          A.trim(0, 0, 320, '#c98f22'); }
        const co = I('w8_column'), tr = I('w8_trellis'), st = I('w8_strlights'), fl = I('w8_flag');
        if (fl) for (const fx of [5, 51]) ctx.drawImage(fl, fx * TS - cx, FY - 122);
        if (co) for (const k of [3, 14, 24, 36, 46, 57]) ctx.drawImage(co, k * TS - cx, FY - 84);
        if (tr) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 30 * TS - cx, FY - 56, 80, '255,210,230', 0.15 + (ph ? 0.03 : 0)); ctx.restore();
          ctx.drawImage(tr, 30 * TS - 38 - cx, FY - 100);
          const wt = I('w8_timwed_full'); if (wt) ctx.drawImage(wt, 30 * TS - 16 - cx, FY - 48);
        }
        const tb = I('w8_wedtable'), tv = I('w8_arthurtv'), dc = I('w8_dirchair'), gu = I('w8_guitar'), fa = I('w8_flowers_a'), fb = I('w8_flowers_b');
        if (tb) { ctx.drawImage(tb, 6 * TS - cx, FY - 32); ctx.drawImage(tb, 47 * TS - cx, FY - 32); }
        if (tv) ctx.drawImage(tv, 38 * TS - cx, FY - 50);
        if (dc) { ctx.drawImage(dc, 20 * TS - cx, FY - 34); ctx.drawImage(dc, 42 * TS - cx, FY - 34); }
        if (gu) ctx.drawImage(gu, 22 * TS + 6 - cx, FY - 52);
        if (fa) ctx.drawImage(fa, 18 * TS - cx, FY - 22); if (fb) ctx.drawImage(fb, 44 * TS - cx, FY - 22);
        if (st) for (let x = 2 * TS; x < 58 * TS; x += 64) ctx.drawImage(st, x - cx, FY - 118);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let x = 2 * TS + 36; x < 58 * TS; x += 64) glow(ctx, x - cx, FY - 110, 14, '255,216,120', 0.2 + 0.08 * Math.sin(f / 7 + x));
        for (const k of [8, 12, 27, 33, 49, 53]) glow(ctx, k * TS - cx, FY - 22, 22, '255,210,140', 0.12 + 0.05 * Math.sin(f / 6 + k));
        for (const k of [12, 30, 48]) beam(ctx, k * TS - cx, FY - 140, FY, 5, 52, '255,230,200', 0.1);
        if (ph) { ctx.fillStyle = 'rgba(214,42,42,' + (0.04 + 0.03 * Math.sin(f / 18)) + ')'; ctx.fillRect(0, 0, 320, 180); }   // phase 2: the room takes on a sour red
        ctx.restore();
        DD.text('THE SEVENTH ANNUAL ON CINEMA OSCAR SPECIAL', 160, FY - 100, 'rgba(255,248,250,0.7)', 1, 'rgba(90,30,70,0.7)', 'center');
      },
    },
    script: {
      init(G) {},
      drawFG(ctx, G) {
        DD.art.motes(G, '#fff0d0', 18, 0.35);
        const g = ctx.createRadialGradient(160, 100, 80, 160, 100, 220); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,4,24,0.45)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);
      },
    },
  };
}
