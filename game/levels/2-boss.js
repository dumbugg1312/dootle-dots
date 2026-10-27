// World 2 boss: DR. SAN (S4), the acupuncturist. Hand-written: the approach, the stage arena, the boss, his needles, the flute notes, the charm.
// Layout (tiles): the aisle to the stage (0-81) with four hinted secrets, then the stage arena (82-107).
//   Secrets: Mel's tunnel under the long riser (the VHS is in the alcove), Sam's high perch above it, Cloud's glide from the tower to the island,
//   Baxter's trapdoor in the aisle (slam the split boards). Each has a ghost hint and a trail of popcorn.
// Attacks (cycle: needle volley, needle volley, flute):
//   1. NEEDLE VOLLEY: he raises the needle and aims. The arcs are drawn as a dotted line for 50 frames while the lights swing onto him red,
//      then 3 needles fly along them. Jump or step out of the arc. Once the last needle has landed he is breathless (120 frames, 100 in phase 2, yellow stars over his head): stomp him. Touching him in the window is harmless.
//   2. FLUTE: he stops and plays, eyes shut. Notes float out and home on the nearest fans, who turn and walk at you (charmed, 300 frames).
//      Lure a charmed GreggHead into a charmed TimHead and the feud domino does the rest. He is open the whole time he plays.
//   3. A hit in a window makes him stagger back (hurt frame, flash) and the attack ends. Stomps outside a window only bounce you.
// Phase 2 (3 pips left): INFECTED TIM leaves his seat green around the gills and sneezes puffs (stomp him to daze him, harmless; he is cured when Dr. San falls),
//   volleys are faster with 5 needles, and the flute summons a fan pair from the arena walls.
// Defeat: he sits down cross-legged, eyes closed, and the house rains popcorn. Nobody is hurt.
(function () {
  const F = 20;                 // the floor row: ground tiles start here (the Dot stands in row F - 1)
  const SAN_G = 0.16;           // needle gravity per frame (the aim and the flight use the same integrator, so the drawn arc is the real one)
  const AR0 = 82, AR1 = 106;    // arena in tiles
  const sprOk = n => DD.ready(n);

  function sanAim(e, G, ph) {   // lock the volley: needles land at the Dot's feet, spread across the Dot
    const T = ph ? 44 : 50, offs = ph ? [-28, -14, 0, 14, 28] : [-14, 0, 14];
    e.sx = DD.cx(e) + (e.flip ? -12 : 12); e.sy = e.y + 14;
    const tx0 = DD.cx(G.pl), ty0 = DD.bot(G.pl) - 4;
    e.aims = offs.map(o => {
      const tx = tx0 + o, vx = (tx - e.sx) / T;
      const vy = (ty0 - e.sy - SAN_G * T * (T + 1) / 2) / T;   // discrete: lands on (tx, ty0) after T frames
      return { vx, vy, T };
    });
  }

  function sanFire(e) {
    for (const a of e.aims) DD.addEntity('san_needle', { x: e.sx - 1, y: e.sy - 1, w: 2, h: 2, vx: a.vx, vy: a.vy, life: 150 });
    DD.SFX.slam();
  }

  function sanFanObj(type, x, y, dir) {   // the same shape the engine uses for its own fans
    return { type, x, y, w: 14, h: 28, vx: 0, vy: 0, dir, state: 'walk', t: 0, anim: 0, onGround: false, gate: false,
      spawn: { x, y }, rot: 0, headless: false, say: null, shouted: false, hair: '#3a2416', skin: '#f0c8a0', charm: 0 };
  }

  function sanNote(e) {   // one note from his mouth, aimed at the nearest free fan within 200px
    let best = null, bd = 200;
    for (const f of DD.fans) {
      if ((f.state !== 'walk' && f.state !== 'idle') || f.charm > 0) continue;
      const d = Math.abs(DD.cx(f) - DD.cx(e));
      if (d < bd) { bd = d; best = f; }
    }
    DD.addEntity('san_note', { x: DD.cx(e) + (e.flip ? -14 : 8), y: e.y + 12, w: 6, h: 6, tgt: best, life: 160, bob: Math.random() * 6 });
  }

  DD.defineEntity('san_needle', {   // a thin acupuncture needle: steel shaft, bright tip, brass handle. Hurts on touch; it can't be stomped
    update(e, G) {
      const B = DD.boss; if (B && B.dead) { e.dead = true; return; }
      e.vy += SAN_G; e.x += e.vx; e.y += e.vy; e.life--;
      const tt = DD.T(Math.floor(DD.cx(e) / 16), Math.floor(e.y / 16));   // solid and breakable tiles stop a needle; one-way decks let it through
      if (tt === 1 || tt === 3 || e.life <= 0 || e.y > DD.L.H * 16 + 40) {
        e.dead = true; DD.stars(DD.cx(e), e.y, 3, '#fff6c0');
      }
    },
    draw(e, ctx) {
      const X = DD.wx(DD.cx(e)), Y = DD.wy(e.y);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.atan2(e.vy, e.vx));
      if (sprOk('w2b_needle')) ctx.drawImage(DD.IMG.w2b_needle, -14, -1);
      else { ctx.fillStyle = '#9aa0b0'; ctx.fillRect(-9, -0.5, 8, 1); ctx.fillStyle = '#fff6c0'; ctx.fillRect(-1, -0.5, 2, 1); }
      ctx.restore();
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); },
  });

  DD.defineEntity('san_note', {   // a flute note: homes on the nearest fan it was aimed at and charms it. Harmless to the Dot.
    update(e, G) {
      e.life--; e.bob = (e.bob || 0) + 0.2;
      let f = e.tgt;
      if (f && (f.state === 'gone' || f.state === 'flung' || f.state === 'flee' || f.charm > 0)) f = e.tgt = null;
      if (!f) { e.y -= 0.4; if (e.life <= 0) e.dead = true; return; }
      const dx = DD.cx(f) - DD.cx(e), dy = (f.y + 6) - e.y, d = Math.hypot(dx, dy);
      if (d < 6) {
        f.charm = 300; f.say = { txt: '♥', col: '#ffe680', t: 60 }; f.shouted = true;
        DD.stars(DD.cx(f), f.y + 6, 6, '#ffe680'); DD.SFX.pop(1.2);
        e.dead = true; return;
      }
      e.x += dx / d * 1.6; e.y += dy / d * 1.6;
      if (e.life <= 0) e.dead = true;
    },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y) + Math.round(Math.sin(e.bob || 0));
      const g = ctx.createRadialGradient(X + 3, Y + 4, 1, X + 3, Y + 4, 9); g.addColorStop(0, 'rgba(255,230,128,0.35)'); g.addColorStop(1, 'rgba(255,230,128,0)');
      ctx.fillStyle = g; ctx.fillRect(X - 6, Y - 5, 18, 18);
      if (sprOk('w2b_note')) ctx.drawImage(DD.IMG.w2b_note, X - 1, Y - 3);
      else { ctx.fillStyle = '#ffe680'; ctx.fillRect(X, Y + 3, 4, 3); ctx.fillRect(X + 3, Y - 3, 1, 6); ctx.fillRect(X + 3, Y - 3, 3, 1); }
    },
    stomp: () => false,
  });

  DD.defineEntity('san_spore', {   // a green sneeze puff: drifts out in a low arc and hurts on touch (jump it). Can't be stomped.
    update(e, G) {
      const B = DD.boss; if (B && B.dead) { e.dead = true; return; }
      e.vy += 0.07; e.vx *= 0.995; e.x += e.vx; e.y += e.vy; e.life--; e.t = (e.t || 0) + 1;
      if (e.life <= 0 || DD.T(Math.floor(DD.cx(e) / 16), Math.floor((e.y + 5) / 16)) === 1) { e.dead = true; DD.stars(DD.cx(e), e.y + 5, 4, '#b8f090'); }
    },
    draw(e, ctx) {
      const X = DD.wx(DD.cx(e)), Y = DD.wy(e.y + 5), r = 7 + Math.round(Math.sin(e.t / 6) * 1), a = Math.min(1, e.life / 20);
      const g = ctx.createRadialGradient(X, Y, 1, X, Y, r + 3); g.addColorStop(0, 'rgba(190,255,140,' + 0.75 * a + ')'); g.addColorStop(1, 'rgba(120,200,90,0)');
      ctx.fillStyle = g; ctx.fillRect(X - r - 3, Y - r - 3, (r + 3) * 2, (r + 3) * 2);
      ctx.fillStyle = 'rgba(214,255,170,' + a + ')'; ctx.fillRect(X - 2, Y - 2, 4, 3); ctx.fillRect(X + 3, Y + 1, 2, 2); ctx.fillRect(X - 5, Y + 2, 2, 2);
      ctx.fillStyle = 'rgba(100,170,70,' + a + ')'; ctx.fillRect(X - 1, Y, 2, 1); ctx.fillRect(X + 4, Y - 3, 1, 2);
    },
    stomp: () => false,
    touch(e) { DD.hurt(DD.cx(e)); },
  });

  DD.defineEntity('san_tim', {   // INFECTED TIM (phase 2): the poking got to him. He shambles toward you and sneezes green puffs. Stomp him to daze him (harmless, a bounce).
    update(e, G) {
      const B = DD.boss;
      if (B && B.dead) { if (!e.cured) { e.cured = true; e.st = 'cured'; e.t = 0; DD.float(DD.cx(e), e.y - 8, 'ACHOO! BETTER', '#b8f090'); DD.stars(DD.cx(e), e.y + 14, 10, '#b8f090'); } if (++e.t > 50) { e.dead = true; G.s.timOut = false; } return; }
      if (!B || !B.engaged) return;
      e.t++;
      const d = DD.cx(G.pl) - DD.cx(e);
      if (e.st !== 'sneeze' && e.st !== 'dazed') e.dir = d < 0 ? -1 : 1;
      if (e.st === 'walk') {
        e.vx = Math.abs(d) > 40 ? e.dir * 0.42 : 0;
        DD.moveX(e, e.vx, false);
        if (e.t > 130) { e.st = 'sneeze'; e.t = 0; e.vx = 0; DD.SFX.wind && DD.SFX.wind(); }
      } else if (e.st === 'sneeze') {
        if (e.t === 32) { DD.addEntity('san_spore', { x: DD.cx(e) + e.dir * 10 - 5, y: e.y + 4, w: 10, h: 10, vx: e.dir * 1.9, vy: -1.5, life: 90 }); DD.float(DD.cx(e), e.y - 8, 'ACHOO!', '#b8f090'); DD.SFX.slam(); }
        if (e.t >= 48) { e.st = 'walk'; e.t = 0; }
      } else if (e.st === 'dazed') {
        if (e.t >= 100) { e.st = 'walk'; e.t = 0; }
      }
      e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
      const lo = B.arena[0], hi = B.arena[1];
      if (e.x < lo) e.x = lo; if (e.x + e.w > hi) e.x = hi - e.w;
    },
    stomp(e) { if (e.st === 'cured') return true; e.st = 'dazed'; e.t = 0; e.vx = 0; DD.float(DD.cx(e), e.y - 8, 'SNIFF', '#b8f090'); DD.SFX.boing && DD.SFX.boing(); return true; },
    touch(e) { if (e.st === 'dazed' || e.st === 'cured') return; DD.hurt(DD.cx(e)); },
    draw(e, ctx) {
      const X = DD.wx(DD.cx(e)), Y = DD.wy(e.y + e.h) + 1;
      if (!sprOk('w2b_tim_s')) return;
      const name = e.st === 'sneeze' || e.st === 'dazed' ? 'w2b_tim_s_r' : 'w2b_tim_s';
      const bob = e.st === 'walk' && Math.abs(e.vx) > 0.1 ? Math.round(Math.abs(Math.sin(e.t / 5))) : 0;
      ctx.save();
      if (e.st !== 'cured') ctx.filter = 'sepia(0.6) hue-rotate(48deg) saturate(1.8)';
      DD.spr(name, X, Y - bob, e.dir < 0);
      ctx.restore();
      if (e.st === 'dazed') for (let i = 0; i < 3; i++) { const a = e.t * 0.14 + i * 2.094; ctx.fillStyle = '#ffe680'; ctx.fillRect(X + Math.round(Math.cos(a) * 9), DD.wy(e.y) - 12 + Math.round(Math.sin(a) * 3), 2, 2); }
    },
  });

  function sanBody() { return DD.bodies.find(b => b.kind === 'san_boss'); }

  DD.defineEntity('san_boss', {
    spawn: t => ({ x: t.x, y: t.y - 46, w: 28, h: 46, vx: 0, vy: 0, st: 'rest', t: 0, n: 0, win: false, flip: true, aims: [], sx: 0, sy: 0, dt: 0 }),
    update(e, G) {
      const B = DD.boss; if (!B || !B.engaged) return;
      if (B.dead) {                                  // the defeat: stagger, sit down, the house rains popcorn
        e.dt++; e.win = false; e.vx = 0; e.aims = [];
        e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
        if (e.dt === 30) { DD.SFX.pop(0.8); DD.stars(DD.cx(e), e.y + 30, 12, '#ffe680'); }
        if (e.dt > 30 && e.dt % 28 === 0) { DD.float(DD.cx(e) + (Math.random() * 20 - 10), e.y - 4, '♥', '#ff8aa0'); DD.SFX.pop(1.1 + Math.random() * 0.3); }
        for (const f of DD.fans) f.charm = 0;
        return;
      }
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
      e.t++; if (e.st !== 'hit') e.flip = P < me;
      if (e.st === 'rest') {                        // a slow step toward the Dot, then the next attack (volley, volley, flute)
        const d = P - me;
        e.vx = Math.abs(d) > 60 ? Math.sign(d) * (0.25 + ph * 0.15) : 0;
        DD.moveX(e, e.vx, false);
        if (e.t > (ph ? 50 : 80)) {
          e.t = 0; e.win = false;
          if (e.n % 3 === 2) e.st = 'flute';
          else { e.st = 'windup'; sanAim(e, G, ph); DD.SFX.switch && DD.SFX.switch(); }
          e.n++;
        }
      } else if (e.st === 'windup') {               // telegraph: the dotted arcs are drawn, he raises the needle, the lights swing onto him
        e.vx = 0;
        if (e.t >= (ph ? 30 : 50)) { sanFire(e); e.st = 'fire'; e.t = 0; e.win = false; }
      } else if (e.st === 'fire') {                 // the needles are in the air: he holds the throw pose, shut to stomps. The opening starts only once none are left to hit you.
        e.vx = 0;
        if (e.t >= 6 && (!DD.bodies.some(b => b.kind === 'san_needle' && !b.dead) || e.t > 160)) { e.st = 'spent'; e.t = 0; e.win = true; }
      } else if (e.st === 'spent') {                // the stomp window after a volley
        e.vx = 0;
        if (e.t >= (ph ? 100 : 120)) { e.st = 'rest'; e.t = 0; e.win = false; }
      } else if (e.st === 'flute') {                // he stops and plays: stomp window the whole time
        e.vx = 0; e.win = true;
        if (e.t % (ph ? 14 : 20) === 0 && e.t < (ph ? 200 : 180)) sanNote(e);
        if (ph && e.t === 40) {                     // phase 2: the flute summons a fan pair from the walls
          const lo = B.arena[0], hi = B.arena[1];
          const px = DD.cx(G.pl), mid = (lo + hi) / 2;   // never spawn a fan on top of you: if you stand within 90px of that wall spot, the fan appears 110px in from you, facing you
          const mk = (type, x, dir) => { if (Math.abs(px - x) < 90) { const side = px < mid ? 1 : -1; x = Math.max(lo + 8, Math.min(hi - 22, px + side * 110)); dir = -side; } return sanFanObj(type, x, (F - 2) * 16, dir); };
          DD.fans.push(mk('gh', lo + 8, 1), mk('th', hi - 22, -1));
          DD.SFX.scuffle();
        }
        if (e.t >= (ph ? 240 : 200)) { e.st = 'rest'; e.t = 0; e.win = false; }
      } else if (e.st === 'hit') {                  // staggered by a stomp: reels back, then the attack cycle goes on
        e.win = false;
        e.vx = e.t < 18 ? e.hitDir * 1.6 * (1 - e.t / 18) : 0;
        DD.moveX(e, e.vx, false);
        if (e.t >= 40) { e.st = 'rest'; e.t = 0; e.flip = P < me; }
      }
      e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
      const lo = B.arena[0], hi = B.arena[1];        // keep him inside the arena walls
      if (e.x < lo) e.x = lo; if (e.x + e.w > hi) e.x = hi - e.w;
    },
    stomp(e, G) {   // open windows hit; a closed one just bounces you
      if (!e.win) return true;
      const P = DD.cx(G.pl), me = DD.cx(e);
      if (DD.hitBoss(1) && DD.boss && !DD.boss.dead) { e.st = 'hit'; e.t = 0; e.win = false; e.hitDir = P < me ? 1 : -1; e.aims = []; DD.stars(me, e.y + 8, 8, '#fff6c0'); }
      return true;
    },
    touch(e) { const B = DD.boss; if (B && B.dead) return; if (e.st === 'hit' || e.win) return; DD.hurt(DD.cx(e)); },   // open (stunned, or playing the flute) or reeling: harmless to bump
    draw(e, ctx, G) {
      const B = DD.boss, X = DD.wx(DD.cx(e)), Y = DD.wy(e.y + e.h), top = DD.wy(e.y);
      const dead = !!(B && B.dead);
      if (e.st === 'windup') {                      // the arcs: dotted, flashing, drawn from the real flight
        for (const a of e.aims) {
          let x = e.sx, y = e.sy, v = a.vy;
          for (let i = 1; i <= a.T + 20; i++) {
            v += SAN_G; x += a.vx; y += v;
            if (i % 4 === 0 && (i + Math.floor(e.t / 3)) % 2 === 0) { ctx.fillStyle = i > a.T ? '#ff8a6a' : '#ffe680'; ctx.fillRect(DD.wx(x), DD.wy(y), 1, 1); ctx.fillRect(DD.wx(x) + 1, DD.wy(y), 1, 1); }
          }
        }
        const k = 0.25 + 0.2 * Math.sin(e.t / 3);   // a hot red glow around him, and an alarm mark
        const g = ctx.createRadialGradient(X, top + 26, 4, X, top + 26, 40); g.addColorStop(0, 'rgba(255,60,40,' + k + ')'); g.addColorStop(1, 'rgba(255,60,40,0)');
        ctx.fillStyle = g; ctx.fillRect(X - 44, top - 16, 88, 86);
        if (Math.floor(e.t / 5) % 2) { ctx.fillStyle = '#ff5a40'; ctx.fillRect(X - 1, top - 14, 2, 6); ctx.fillRect(X - 1, top - 6, 2, 2); }
      }
      if (e.win && !dead) {                         // the stomp window: yellow stars circling his head
        for (let i = 0; i < 3; i++) {
          const a = e.t * 0.16 + i * 2.094, sx = X + Math.round(Math.cos(a) * 11), sy = top + 1 + Math.round(Math.sin(a) * 3);
          const z = Math.sin(a) > 0;   // in front or behind
          ctx.fillStyle = z ? '#fff6c0' : '#ffe680'; ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3);
        }
      }
      let name = 'drsan', hurtFlash = false;
      if (dead) name = e.dt < 26 ? 'w2b_drsan_hurt' : 'w2b_drsan_down';
      else if (e.st === 'hit') { name = e.t < 28 ? 'w2b_drsan_hurt' : 'drsan'; hurtFlash = e.t < 24 && Math.floor(e.t / 3) % 2 === 0; }
      else if (e.st === 'flute') name = 'drsan_flute';
      else if ((e.st === 'fire' && e.t < 40) || (e.st === 'spent' && e.t < 14)) name = 'w2b_drsan_throw';
      const bob = (e.st === 'rest' && Math.abs(e.vx) > 0.1) ? Math.round(Math.abs(Math.sin(e.t / 6)) * 1) : 0;
      if (!sprOk(name)) name = 'drsan';
      if (hurtFlash) { ctx.save(); ctx.filter = 'brightness(2.6) saturate(0.4)'; DD.spr(name, X, Y, e.flip); ctx.restore(); }
      else DD.spr(name, X, Y - bob, e.flip);
      if (dead && e.dt > 36) {                      // a peaceful glow behind him as he sits
        const g = ctx.createRadialGradient(X, Y - 18, 3, X, Y - 18, 36); g.addColorStop(0, 'rgba(255,240,180,0.22)'); g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g; ctx.fillRect(X - 40, Y - 56, 80, 70);
      }
    },
  });

  // the popcorn: lines along the aisle, arcs over every obstacle, trails into each secret (all in open air, checked by tests/buried.js)
  const POP = (() => {
    const out = [], seen = new Set();
    const one = (x, y) => { x = Math.round(x); y = Math.round(y); const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); out.push([x, y, 1]); } };
    const row = (x, y, n) => { for (let i = 0; i < n; i++) one(x + i, y); };
    const arc = (x0, x1, y, h, n) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); one(x0 + (x1 - x0) * t, y - h * 4 * t * (1 - t)); } };
    const g = F - 1;                                       // the row you walk along
    row(2, g, 6); arc(7, 12, g - 2, 3, 6);                  // the start, then over the first seat block
    arc(12, 19, g - 3, 3, 8); row(20, F - 6, 6);            // over the seat bank, then along the catwalk
    row(21, g, 9);                                          // the fans' lane
    arc(26, 33, g - 4, 3, 8); row(31, F - 3, 5);            // over the steps
    row(36, g, 12);                                         // MEL: the tunnel under the long riser, to the alcove and the tape
    row(36, F - 5, 12);                                     // the top of the long riser
    arc(34, 38, F - 7, 2, 5);                               // SAM: a trail up into the lights
    row(38, F - 10, 6);                                     // SAM: the high perch
    row(48, g, 5); arc(51, 60, g - 2, 3, 9);                // down off the riser, over the second seat bank
    for (const [x, y] of [[58, F - 3], [59, F - 3], [60, F - 5], [61, F - 5], [62, F - 7], [63, F - 7]]) one(x, y);   // up the tower
    row(64, F - 9, 4);                                      // CLOUD: the tower top
    row(69, g, 5);                                          // BAXTER: boards to slam
    row(69, F + 2, 6); row(70, F + 1, 4);                   // BAXTER: the cellar under the stage
    row(74, F - 4, 6); arc(76, 80, F - 5, 3, 5);            // the island
    row(83, g, 7); row(99, g, 7);                           // the arena floor, either side of the middle
    row(85, F - 5, 4); row(100, F - 5, 4); row(86, F - 8, 3); row(100, F - 8, 3);   // on the arena ledges and the lighting decks
    arc(88, 98, F - 6, 3, 9);                               // a great arc over the middle
    return out;
  })();

  const CLOUD_ARC = [];   // CLOUD: popcorn only a glide reaches, from the tower top out over the gap to the island
  for (let i = 0; i < 8; i++) { const t = i / 7; CLOUD_ARC.push([Math.round(68 + 7 * t), Math.round(F - 10 + 5 * t * (0.6 + 0.4 * t))]); }

  window.LEVEL = {
    id: '2-boss', name: 'DR. SAN', sub: "TIM'S ACUPUNCTURIST", world: 2,
    W: 108, H: 24, FLOOR: F,
    KINDS: { stage: 1 },
    SOLID: [
      ['carpet', 0, F, 82, 4], ['stage', AR0, F, 26, 4],
      ['seat', 8, F - 2, 2, 2], ['seat', 14, F - 2, 4, 2], ['catwalk', 20, F - 5, 6, 1],
      ['riser', 31, F - 2, 5, 2], ['riser', 36, F - 4, 12, 3], ['hole', 40, F - 2, 3, 1],               // steps, the long riser, Mel's alcove
      ['catwalk', 38, F - 9, 6, 1],                                                                       // Sam's perch
      ['seat', 54, F - 2, 4, 2],
      ['riser', 58, F - 2, 2, 2], ['riser', 60, F - 4, 2, 4], ['riser', 62, F - 6, 2, 6], ['riser', 64, F - 8, 4, 8],   // the tower
      ['cracked', 70, F, 3, 1], ['hole', 69, F + 1, 6, 2],                                                // Baxter's trapdoor and the cellar
      ['riser', 74, F - 3, 6, 3],                                                                         // the island
      ['catwalk', 85, F - 4, 4, 1], ['catwalk', 100, F - 4, 4, 1], ['catwalk', 86, F - 7, 3, 1], ['catwalk', 100, F - 7, 3, 1],   // the arena ledges, and a lighting deck above each
    ],
    THINGS: [
      ['dot', 1, F - 1], ['gh', 24, F - 2], ['th', 28, F - 2],
      ['ghostM', 49, F - 1], ['vhs', 41, F - 2], ['ghostS', 39, F - 5], ['ghostC', 65, F - 9], ['ghostB', 71, F - 1],
      ['cp', 16, F - 4], ['cp', 50, F - 2], ['cp', 68, F - 2],
      ['gh', 86, F - 2], ['th', 103, F - 2],
      ['san_boss', 94, F],
    ],
    POPCORN: POP, CLOUD_ARC,
    sprites: ['seat', 'drsan', 'drsan_flute', 'w2b_drsan_throw', 'w2b_drsan_hurt', 'w2b_drsan_down', 'w2_curtain', 'w2_valance', 'w2_carpet', 'w2_riser', 'w2_sconce', 'w2_screen',
      'w2b_stage', 'w2b_pillar', 'w2b_spot', 'w2b_chart', 'w2b_table', 'w2b_needle', 'w2b_note', 'w2b_tim', 'w2b_tim_r', 'w2b_tim_s', 'w2b_tim_s_r', 'w2b_gregg', 'w2b_gregg_r'],
    portraits: { tim: 'w2b_portrait_tim', gregg: 'w2b_portrait_gregg', san: 'w2b_portrait_san' },
    names: { san: 'DR. SAN' },
    lines: {
      start: [['tim', "DR. SAN IS WITH US TODAY. LET'S TALK ALTERNATIVES."]],
      boss: [['tim', "WE'RE RELEASING THE TOXINS. IT'S FIFTY DOLLARS A SESSION."]],
      bossPhase1: [['gregg', 'THOSE SORES ARE FROM THE DIRTY NEEDLES, TIM.']],
      bossDefeat: [['tim', 'THANK YOU, DR. SAN.'], ['gregg', "I'LL THROW IN SOME DIRTY ACUPUNCTURE NEEDLES."]],
    },
    boss: {
      name: 'DR. SAN', sub: "TIM'S ACUPUNCTURIST", hp: 6, arena: [AR0, AR1], inv: 40, endDelay: 190,
      phases: [{ at: 3, say: 'INFECTED TIM', sub: 'TAKE THE NEEDLES OUT', enter(G) {
        const e = sanBody(); if (e) { e.st = 'rest'; e.t = -40; e.win = false; e.aims = []; }
        G.s.timOut = true;   // Tim leaves his seat, green around the gills
        DD.addEntity('san_tim', { x: 98.2 * 16, y: F * 16 - 30, w: 14, h: 30, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0 });
        DD.stars(99 * 16, F * 16 - 20, 10, '#b8f090');
      } }],
      onDefeat(G, B) {
        DD.banner('SESSION OVER', 120, 'FIFTY DOLLARS, PLEASE');
        const e = sanBody(); if (!e) return;
        for (let i = 0; i < 14; i++) DD.drop({ x: DD.cx(e) + (i - 7) * 5, y: e.y, vx: (i - 7) * 0.35, vy: -3.2 - (i % 3) * 0.8, life: 400, wait: 8 });
        DD.stars(DD.cx(e), e.y + 20, 14, '#ffe680');
      },
    },
    theme: {   // the World 2 red-seat theme from 2-1, with the stage boards, gilded pillars and spotlights of the arena
      tiles: {
        carpet: ['#2a0a12', '#8a5a1c', '#12040a'], stage: ['#6a3a20', '#d9a05a', '#2e160e'], riser: ['#4a2616', '#8e5430', '#140806'],
        seat: ['#b02a36', '#e8605a', '#6a1020'], catwalk: ['#6a6a78', '#c8c8d4', '#3a3a46'], ledge: ['#4a2616', '#8e5430', '#140806'], cracked: ['#6a3a20', '#c98f22', '#2e160e'],
      },
      crawl: ['#0e0408', '#050103'],
      bg(ctx, G, DD) {   // the house behind the stage: the draped back curtain, sconces, the valance across the top, the gilded screen
        const c = G.cam, VW = DD.VW, VH = DD.VH, I = DD.IMG, ok = DD.ready;
        ctx.fillStyle = '#0e030a'; ctx.fillRect(0, 0, VW, VH);
        if (ok('w2_curtain')) {
          const im = I.w2_curtain, ox = -Math.round(c.x * 0.3) % im.width, oy = -Math.round(c.y * 0.3) % im.height;
          for (let y = oy - im.height; y < VH; y += im.height) for (let x = ox - im.width; x < VW; x += im.width) ctx.drawImage(im, x, y);
        }
        if (ok('w2_screen')) {   // the old gilded screen, far behind and dim, hung over the arena
          const sx = Math.round(AR0 * 16 + 72 - c.x * 0.9), sy = Math.round(-14 - c.y * 0.05);
          ctx.save(); ctx.globalAlpha = 0.45; ctx.drawImage(I.w2_screen, sx, sy); ctx.restore();
        }
        { const A = DD.art, pw = 220, po = -(((c.x * 0.3) % pw) + pw) % pw;   // art pass: fluted gilt pilasters between the sconces, dimmed so they sit back
          for (let x = po - pw; x < VW + pw; x += pw) { const X = Math.round(x + 2);
            A.R(X, 0, 14, VH, '#5a3a10'); for (let i = 0; i < 14; i++) A.R(X + i, 0, 1, VH, A.mix('#8a5a14', [0.25, 0.1, -0.1, -0.25][i & 3] + (i === 0 ? 0.2 : 0))); A.R(X - 3, 0, 20, 6, '#8a5a14'); A.R(X - 3, 0, 20, 1, '#e8c060'); A.R(X - 3, 6, 20, 1, '#2a1804'); }
          ctx.fillStyle = 'rgba(14,3,10,0.55)'; ctx.fillRect(0, 0, VW, VH); }
        if (ok('w2_sconce')) for (let i = Math.floor(c.x * 0.3 / 220) - 1; i <= Math.floor((c.x * 0.3 + VW) / 220) + 1; i++) {
          const X = Math.round(i * 220 + 110 - c.x * 0.3), Y = Math.round(44 - c.y * 0.3);
          const g = ctx.createRadialGradient(X, Y + 8, 2, X, Y + 8, 34); g.addColorStop(0, 'rgba(255,200,120,0.12)'); g.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = g; ctx.fillRect(X - 34, Y - 26, 68, 68); ctx.globalAlpha = 0.55; ctx.drawImage(I.w2_sconce, X - 5, Y); ctx.globalAlpha = 1;   // wall sconces stay dim and steady, so they never read as a pickup
        }
        if (ok('w2_valance')) { const im = I.w2_valance, ox = -Math.round(c.x * 0.5) % im.width; for (let x = ox - im.width; x < VW; x += im.width) ctx.drawImage(im, x, 0); }
        { const A = DD.art, f = G.frame, by = Math.round(76 - c.y * 0.3), bo = -Math.round(c.x * 0.4) % 40;   // the balcony front (velvet, gilt rail, fringe), green exit lights, a gilt valance with marquee bulbs
          if (by > -30 && by < VH) { A.R(0, by, VW, 12, '#3a0a16'); for (let x = bo - 40; x < VW + 40; x += 40) { A.R(x + 18, by, 1, 12, '#5a1424'); A.R(x + 19, by, 1, 12, '#240610'); A.R(x + 2, by + 2, 14, 8, '#4a1020'); A.R(x + 2, by + 2, 14, 1, '#6a1c30'); }
            A.R(0, by - 3, VW, 3, '#b07a1c'); A.R(0, by - 3, VW, 1, '#f0d070'); A.trim(0, by - 5, VW, '#c98f22'); A.fringe(0, by + 12, VW, '#c98f22'); ctx.fillStyle = 'rgba(8,2,6,0.35)'; ctx.fillRect(0, by - 5, VW, 22); }
          { const ew = 440, eo = -(((c.x * 0.3) % ew) + ew) % ew; for (let x = eo - ew; x < VW + ew; x += ew) { const X = Math.round(x + 70), Y = Math.round(20 - c.y * 0.3);
            if (X > -40 && X < VW + 10 && Y > -20) { A.glow(X + 12, Y + 5, 26, '#40ff80', 0.18); A.box(X, Y, 24, 10, '#0a2a14', { outline: '#02080a' }); A.R(X + 1, Y + 1, 22, 8, '#106a30'); DD.text('EXIT', X + 12, Y + 2, '#b8ffd0', 1, null, 'center'); } } }
          A.R(0, 8, VW, 1, '#2a0a10'); A.trim(0, 9, VW, '#e0a830'); A.fringe(0, 12, VW, '#c98f22'); A.bulbs(4, 6, VW, 12, f); }
        const v = ctx.createLinearGradient(0, 0, 0, VH); v.addColorStop(0, 'rgba(0,0,0,0.35)'); v.addColorStop(0.35, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
      },
      tile(ctx, k, X, Y, tx, ty) {   // the set itself, from the hand-made tiles
        const I = DD.IMG, ok = DD.ready, kind = (x, y) => DD.kindAt(x, y);
        const lip = kind(tx, ty - 1) !== k;
        if (k === 'carpet' && ok('w2_carpet')) {
          ctx.drawImage(I.w2_carpet, X, Y);
          { const A = DD.art; if (lip) { A.R(X, Y, 16, 1, '#d8a040'); A.R(X, Y + 1, 16, 1, '#8a5a1c'); A.R(X, Y + 2, 16, 1, 'rgba(0,0,0,0.3)'); } else if (ty > F + 1) { ctx.fillStyle = 'rgba(8,0,6,' + Math.min(0.45, (ty - F) * 0.12) + ')'; ctx.fillRect(X, Y, 16, 16); } }
          if (lip) { ctx.fillStyle = '#5a3418'; ctx.fillRect(X, Y, 16, 1); if (tx % 3 === 0) { ctx.fillStyle = '#fff2a6'; ctx.fillRect(X + 7, Y + 2, 2, 1); ctx.fillStyle = '#c98f22'; ctx.fillRect(X + 6, Y + 2, 1, 1); ctx.fillRect(X + 9, Y + 2, 1, 1); } }
          else if (ty > F + 1) { ctx.fillStyle = 'rgba(10,2,4,0.25)'; ctx.fillRect(X, Y, 16, 16); }
          return true;
        }
        if (k === 'stage' && ok('w2b_stage')) {
          ctx.drawImage(I.w2b_stage, (tx * 16) % 32, lip ? 0 : 16, 16, 16, X, Y, 16, 16);
          { const A = DD.art; if (lip) { A.R(X, Y, 16, 1, '#fbe0a0'); A.R(X, Y + 1, 16, 1, '#c98f22'); A.R(X, Y + 2, 16, 1, 'rgba(0,0,0,0.25)'); if (tx % 2 === 0) { A.R(X + 5, Y, 6, 3, 'rgba(255,240,170,0.28)'); A.R(X + 7, Y, 2, 1, '#fffbe0'); } } else { A.R(X, Y, 16, 1, 'rgba(255,255,255,0.08)'); A.R(X + 15, Y, 1, 16, 'rgba(0,0,0,0.25)'); A.R(X, Y + 15, 16, 1, 'rgba(0,0,0,0.3)'); } }
          return true;
        }
        if ((k === 'riser' || k === 'ledge' || k === 'cracked') && ok('w2_riser')) {
          ctx.drawImage(I.w2_riser, (tx * 16) % 32, lip ? 0 : 12, 16, 16, X, Y, 16, 16);
          if (!lip) { ctx.fillStyle = 'rgba(10,2,4,0.45)'; ctx.fillRect(X, Y, 16, 16); }
          if (lip) { const A = DD.art; A.R(X, Y, 16, 1, '#f0cc78'); A.R(X, Y + 1, 16, 1, '#b07a30'); A.R(X, Y + 2, 16, 1, 'rgba(0,0,0,0.28)'); }
          if (k === 'cracked') {   // a split board, easy to spot
            ctx.fillStyle = '#0c0402'; ctx.fillRect(X + 3, Y + 5, 5, 1); ctx.fillRect(X + 7, Y + 6, 1, 4); ctx.fillRect(X + 8, Y + 10, 5, 1); ctx.fillRect(X + 12, Y + 3, 1, 3);
            ctx.fillStyle = '#c98f22'; ctx.fillRect(X + 4, Y + 4, 3, 1); ctx.fillRect(X + 9, Y + 9, 3, 1);
          }
          return true;
        }
        if (k === 'seat') return true;   // seats are drawn whole, seat by seat, in drawMid
        if (k === 'catwalk') {   // a steel deck over a little truss, with a rail
          ctx.fillStyle = '#2a2a34'; ctx.fillRect(X, Y, 16, 4); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(X, Y, 16, 1); ctx.fillStyle = '#5a5a68'; ctx.fillRect(X, Y + 1, 16, 1);
          ctx.fillStyle = '#3a3a46'; for (let i = 0; i < 16; i += 4) ctx.fillRect(X + i + (tx % 2 ? 0 : 2), Y + 4 + ((i / 4) % 2), 2, 1);
          ctx.fillStyle = '#4a4a58'; ctx.fillRect(X, Y + 6, 16, 1); ctx.fillRect(X + (tx % 2 ? 1 : 9), Y + 4, 1, 3);
          ctx.fillStyle = '#5a5a68'; ctx.fillRect(X, Y - 10, 16, 1); if (tx % 2 === 0) ctx.fillRect(X + 1, Y - 10, 1, 10);
          return true;
        }
        return false;
      },
    },
    script: {
      init(G) {
        const s = G.s, L = DD.L, K = DD.kindAt;
        s.seats = [];
        for (const [k, x, y, w, h] of L.SOLID) if (k === 'seat') s.seats.push([x, y, w, h]);
        s.spot = [0.2, 0.5, 0.8].map((f, i) => ({ f, ph: i * 2.1 }));   // three stage lights over the arena
        s.react = { tim: 0, gregg: 0 }; s.hostT = 0; s.timOut = false;
      },
      update(G) {   // charmed fans turn to face the Dot and count down their charm; the hosts react to the fight
        const P = G.pl, s = G.s, B = DD.boss, e = sanBody();
        for (const f of DD.fans) {
          if (!(f.charm > 0)) continue;
          f.charm--;
          if (f.state === 'walk') { const d = DD.cx(P) - DD.cx(f); if (Math.abs(d) > 2) f.dir = Math.sign(d); }
          if (f.charm % 40 === 0 && f.charm > 0) f.say = { txt: '♥', col: '#ffe680', t: 30 };
          if (f.charm === 0) f.say = null;
        }
        s.hostT++;
        if (e && B && B.engaged) {
          if (e.st === 'windup' || e.st === 'hit') s.react.gregg = 50;
          if (e.st === 'flute' || e.st === 'hit' || B.dead) s.react.tim = 50;
        }
        if (s.react.tim > 0) s.react.tim--; if (s.react.gregg > 0) s.react.gregg--;
      },
      drawBG(ctx, G) {   // the set in the back of the stage: charts, Dr. San's table, and the hosts in their seats
        const I = DD.IMG, ok = DD.ready, c = G.cam, VW = DD.VW, s = G.s;
        const Yg = DD.wy(F * 16);
        { const A = DD.art, f = G.frame;   // art pass: velvet legs framing the stage, gilt tie-backs and fringe, a swag of velvet over the proscenium
          for (const lx of [AR0 * 16 + 20, AR1 * 16 - 50]) { const X = DD.wx(lx); if (X < -40 || X > VW + 10) continue;
            for (let q = 0; q < 30; q++) A.R(X + q, 0, 1, Yg, A.mix('#6a0e24', [0.2, 0.05, -0.15, -0.3, -0.15, 0.05][q % 6])); A.R(X - 1, 0, 1, Yg, '#1a0408'); A.R(X + 30, 0, 1, Yg, '#1a0408');
            A.R(X, Yg - 70, 30, 3, '#e8c860'); A.R(X, Yg - 70, 30, 1, '#fff0a0'); A.R(X + 12, Yg - 67, 5, 8, '#c8982a'); A.fringe(X, Yg - 62, 30, '#c98f22'); ctx.fillStyle = 'rgba(8,2,6,0.38)'; ctx.fillRect(X - 1, 0, 32, Yg); }
          const sx = DD.wx(AR0 * 16 + 20), ex = DD.wx(AR1 * 16 - 20); if (ex > 0 && sx < VW) { const x0 = Math.max(-4, sx), x1 = Math.min(VW + 4, ex); A.R(x0, 14, x1 - x0, 10, '#5a0a1c'); A.R(x0, 14, x1 - x0, 1, '#8a1c34'); A.trim(x0, 24, x1 - x0, '#e0a830'); A.fringe(x0, 27, x1 - x0, '#c98f22'); A.bulbs(x0 + 4, 19, x1 - x0, 12, f); } }
        const lit = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(255,220,160,' + a + ')'); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
        if (ok('w2b_chart')) for (const tx of [90, 96]) {   // the meridian scrolls, hung on the stage curtain
          const X = DD.wx(tx * 16 - 20), Y = Yg - 96;
          if (X > VW + 60 || X < -60) continue;
          lit(X + 20, Y + 32, 46, 0.14); ctx.drawImage(I.w2b_chart, X, Y);
        }
        if (ok('w2b_table')) { const X = DD.wx(88 * 16), Y = Yg - 24; if (X > -60 && X < VW + 60) ctx.drawImage(I.w2b_table, X, Y); }
        // Tim and Gregg in their seats, stage right, with Dr. San's empty seat beside them (S4: he sits on the left of the three-shot)
        if (ok('seat') && ok('w2b_tim') && ok('w2b_gregg')) {
          const X0 = DD.wx(97 * 16), Y0 = Yg;
          if (X0 > -100 && X0 < VW + 20) {
            lit(X0 + 42, Y0 - 24, 60, 0.12);
            ctx.save(); ctx.filter = 'brightness(0.85)';
            for (let i = 0; i < 3; i++) ctx.drawImage(I.seat, X0 + i * 28, Y0 - 32);
            const bob = Math.round(Math.sin(s.hostT / 40));
            if (!s.timOut) ctx.drawImage(I[s.react.tim > 0 ? 'w2b_tim_r' : 'w2b_tim'], X0 + 28, Y0 - 44 + bob);
            ctx.drawImage(I[s.react.gregg > 0 ? 'w2b_gregg_r' : 'w2b_gregg'], X0 + 56, Y0 - 44 - bob);
            ctx.restore();
          }
        }
      },
      drawMid(ctx, G) {   // seats whole, the pillars, and the stage lights with their beams
        const I = DD.IMG, ok = DD.ready, c = G.cam, VW = DD.VW, VH = DD.VH, s = G.s, B = DD.boss, e = sanBody();
        if (ok('seat')) for (const [x, y, w, h] of s.seats) {   // every 2x2 block of seat tiles is one theater seat
          const X = x * 16 - Math.round(c.x), Y = y * 16 - Math.round(c.y);
          if (X > VW || X + w * 16 < 0) continue;
          for (let bx = 0; bx < w; bx += 2) for (let by = h; by > 0; by -= 2) ctx.drawImage(I.seat, X + bx * 16 + 2, Y + (by - 2) * 16);
        }
        if (ok('w2b_pillar')) for (const px of [AR0 * 16, AR1 * 16 - 18]) {
          const X = DD.wx(px), Y = DD.wy(F * 16) - 112;
          if (X > -20 && X < VW + 20) ctx.drawImage(I.w2b_pillar, X, Y);
        }
        // the lights: screen-hung cans along the top; in the aisle they shine steady, in the arena they swing onto the boss
        const Yg = DD.wy(F * 16), engaged = B && B.engaged;
        const aim = engaged && e && !B.dead ? DD.wx(DD.cx(e)) : null;
        const red = e && e.st === 'windup', flute = e && e.st === 'flute', win = e && e.win && !flute, dead = B && B.dead;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const cans = [];
        if (engaged) for (const sp of s.spot) cans.push({ sx: Math.round(sp.f * VW), tx: aim !== null ? aim + (sp.f - 0.5) * 70 + Math.sin(G.frame / 50 + sp.ph) * 14 : Math.round(VW * sp.f), w: red ? 14 : 20 });
        else for (const tx of [12, 30, 56, 72]) { const sx = DD.wx(tx * 16 + 8); if (sx > -40 && sx < VW + 40) cans.push({ sx, tx: sx + 18, w: 20 }); }
        for (const cn of cans) {
          const col = red ? '255,70,50' : flute ? '255,150,190' : dead ? '255,236,170' : win ? '255,240,170' : '255,236,190', a = red ? 0.22 : 0.15;
          const g = ctx.createLinearGradient(0, 8, 0, Yg); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',' + a * 0.5 + ')');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cn.sx - 3, 12); ctx.lineTo(cn.sx + 3, 12); ctx.lineTo(cn.tx + cn.w, Yg); ctx.lineTo(cn.tx - cn.w, Yg); ctx.fill();
          const p = ctx.createRadialGradient(cn.tx, Yg, 2, cn.tx, Yg, cn.w * 1.6); p.addColorStop(0, 'rgba(' + col + ',' + (a * 1.8) + ')'); p.addColorStop(1, 'rgba(' + col + ',0)');
          ctx.fillStyle = p; ctx.beginPath(); ctx.ellipse(cn.tx, Yg, cn.w * 1.6, 5, 0, 0, 7); ctx.fill();
        }
        ctx.restore();
        if (ok('w2b_spot')) for (const cn of cans) ctx.drawImage(I.w2b_spot, cn.sx - 11, -4);
      },
      drawFG(ctx, G) {   // a soft vignette over everything
        const VW = DD.VW, VH = DD.VH;
        DD.art.motes(G, '#ffe6b0', 16, 0.4);
        const g = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.45, VW / 2, VH * 0.55, VW * 0.72); g.addColorStop(0, 'rgba(10,2,6,0)'); g.addColorStop(1, 'rgba(10,2,6,0.38)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      },
    },
  };
})();
