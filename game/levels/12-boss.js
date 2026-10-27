// World 12 boss: MICHAEL GREGG (the angel, S12 finale), then NEW AMATO when Baxter turns on him, then the STANDING OVATION. The biggest fight in the game: 9 pips, three phases.
// Hand-written: the Oscar-night stage, the boss entity, feathers, the shockwave, the Baxter cameo and the credits after the last hit.
// Sprites: design/sprites/w12_mg_*.png and w12_na_*.png (80 x 74, from design/sprites/w12_angel.py), the set from design/sprites/w12_set.py.
// Attacks (each telegraphed for ~40 frames: he flashes red or gold, a "!" floats over him, and shadows mark the floor):
//   1. FEATHERS: quills drop onto shadows on the floor around the Dot. Step off a shadow. He is open afterwards.
//   2. DIVE: he lifts out of the frame, then drops onto the Dot's shadow. Walk away from the shadow. He is dizzy after.
//   3. RING (phase 2 on): he taps the floor and a shockwave runs toward the Dot (both ways from phase 3). Jump it. He is open afterwards.
// Between attacks he drifts at the Dot. Stomp him only while he is open (after an attack, stars over his head). Otherwise touching him hurts.
(function () {
  const VW = 320, VH = 180, TS = 16, FLOOR_Y = 21 * TS, BW = 32, BH = 50, END = 420;
  const CONF = ['#ff5a6a', '#ffd04a', '#5ac8ff', '#7be07a', '#ff9ad0', '#ffffff', '#b48aff'];
  const ok = n => DD.ready(n), IM = n => DD.IMG[n];

  function bulb(ctx, x, y, on) {
    if (on) { ctx.fillStyle = 'rgba(255,226,140,0.22)'; ctx.fillRect(x - 2, y - 2, 6, 6); }
    ctx.fillStyle = on ? '#fff2a6' : '#7a6a3a'; ctx.fillRect(x, y, 2, 2);
    if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); }
  }
  function marquee(ctx, G, X, Y, w, h, lines) {
    ctx.fillStyle = '#1a0a14'; ctx.fillRect(X, Y, w, h); ctx.fillStyle = '#a8862a'; ctx.fillRect(X, Y, w, 1); ctx.fillRect(X, Y + h - 1, w, 1); ctx.fillRect(X, Y, 1, h); ctx.fillRect(X + w - 1, Y, 1, h);
    ctx.fillStyle = '#3a1a24'; ctx.fillRect(X + 3, Y + 3, w - 6, h - 6);
    let k = 0; const ph = Math.floor(G.frame / 7);
    for (let x = X + 2; x < X + w - 2; x += 4, k++) { bulb(ctx, x, Y + 1, (k + ph) % 2 === 0); bulb(ctx, x, Y + h - 3, (k + ph) % 2 === 1); }
    for (let y = Y + 5; y < Y + h - 4; y += 4, k++) { bulb(ctx, X + 1, y, (k + ph) % 2 === 0); bulb(ctx, X + w - 3, y, (k + ph) % 2 === 1); }
    lines.forEach(([t, sc, col], i) => DD.text(t, X + w / 2, Y + 6 + i * (5 * sc + 3), col, sc, '#6a4416', 'center'));
  }
  function confetti(ctx, G, n, k) {
    for (let i = 0; i < n; i++) {
      const s = i * 97.13, w = 1 + (Math.sin(G.frame / 7 + s) > 0 ? 2 : 0);
      const x = (((s * 7.7 + Math.sin(G.frame / 40 + s) * 16 + G.frame * 0.12 * ((i % 3) - 1)) % (VW + 20)) + VW + 20) % (VW + 20) - 10;
      const y = ((G.frame * (0.45 + (i % 5) * 0.16) * k + s * 13) % (VH + 24)) - 12;
      ctx.fillStyle = CONF[i % CONF.length]; ctx.fillRect(Math.round(x), Math.round(y), w, 2);
    }
  }
  function statue(ctx, X, Y, sc) { if (ok('w12_statue')) { const im = IM('w12_statue'); ctx.drawImage(im, X, Y - im.height * sc, im.width * sc, im.height * sc); } }
  function curtain(ctx, X, w) {   // a red velvet curtain with folds and a gold fringe, hanging from above the screen to the floor
    const Yb = Math.round(DD.wy(FLOOR_Y));
    for (let x = 0; x < w; x++) {
      const f = Math.sin((x + 2) * 0.9) * 0.5 + 0.5;
      ctx.fillStyle = f > 0.75 ? '#d1392f' : f > 0.45 ? '#a81f2c' : f > 0.2 ? '#7a1428' : '#4f0f24'; ctx.fillRect(X + x, 0, 1, Yb - 5);
    }
    const g = ctx.createLinearGradient(0, 0, 0, Yb); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = g; ctx.fillRect(X, 0, w, Yb);
    ctx.fillStyle = '#c98f22'; ctx.fillRect(X, Yb - 6, w, 3); ctx.fillStyle = '#f0c84a'; ctx.fillRect(X, Yb - 6, w, 1);
    for (let x = 1; x < w; x += 4) { ctx.fillStyle = '#c98f22'; ctx.fillRect(X + x, Yb - 3, 2, 4); }
  }
  function artBoss(ctx, G) {   // the art pass: a swagged gilt-roped valance, golden spots on the big statues, footlight glow along the carpet, bulbs strung over the stage
    const A = DD.art, c = G.cam, f = G.frame, Yf = Math.round(DD.wy(FLOOR_Y)), w = 48, ox = Math.round(DD.wx(0)) % w;
    for (const tx of [9, 49]) { const X = Math.round(DD.wx(tx * TS)); A.cone(X + 24, 8, Yf - 8, 44, '#fff2c0', 0.2); A.glow(X + 24, Yf - 90, 70, '#ffe080', 0.2); }
    for (let tx = Math.floor(c.x / TS) - 1; tx < Math.floor(c.x / TS) + 22; tx += 2) A.glow(Math.round(DD.wx(tx * TS + 8)), Yf - 2, 20, '#ffd878', 0.09);
    for (let x = ox - w; x < VW + w; x += w) {
      ctx.fillStyle = '#4a0a22'; ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + w, 3); ctx.quadraticCurveTo(x + w / 2, 29, x, 3); ctx.fill();
      ctx.fillStyle = '#7a1634'; ctx.beginPath(); ctx.moveTo(x + 4, 3); ctx.lineTo(x + w - 4, 3); ctx.quadraticCurveTo(x + w / 2, 22, x + 4, 3); ctx.fill();
      ctx.strokeStyle = '#b02a4e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, 4); ctx.quadraticCurveTo(x + w / 2, 15, x + w - 10, 4); ctx.stroke();
      A.R(x - 1, 3, 3, 9, '#e8c050'); A.R(x - 1, 3, 1, 9, '#fff2a6'); A.R(x - 2, 12, 5, 2, '#c98f22');
    }
    A.R(0, 0, VW, 4, '#3a0618'); A.trim(0, 0, VW, '#e8c050'); A.fringe(0, 4, VW, '#c98f22');
    if (G.s.ovation || G.s.fin) for (let i = 0; i < 6; i++) A.glow(30 + i * 52, 20, 26, ['#ffe680', '#7ad8ff', '#ff8ac8'][i % 3], 0.18 + 0.08 * Math.sin(f / 6 + i));   // the house lights go up for the ovation
  }
  function edgeBoss(k, X, Y, tx, ty) {
    const A = DD.art, K = DD.kindAt, R = A.R, sol = (x, y) => !!K(x, y), up = !sol(tx, ty - 1), lf = !sol(tx - 1, ty), rt = !sol(tx + 1, ty), dn = !sol(tx, ty + 1);
    if (k === 'floor') { if (up) { R(X, Y, 16, 1, '#ff8a96'); R(X, Y + 2, 16, 1, 'rgba(0,0,0,0.22)'); } else A.tex(X, Y, 16, 16, '#2e6c30', 0.06, 5); if (lf) R(X, Y, 1, 16, 'rgba(255,255,255,0.2)'); if (rt) R(X + 15, Y, 1, 16, 'rgba(0,0,0,0.4)'); }
    else if (k === 'tier') { if (up) R(X, Y, 16, 1, '#d8fca8'); if (lf) R(X, Y, 1, 16, 'rgba(255,255,255,0.25)'); if (rt) R(X + 15, Y, 1, 16, '#14301a'); if (dn) R(X, Y + 15, 16, 1, '#14301a'); }
  }
  function confettiBurst(x, y, n, up) {
    for (let i = 0; i < n; i++) DD.part({ x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 6, vy: -(up || 4) - Math.random() * 4, life: 80 + Math.random() * 50, max: 130, r: 2, col: CONF[i % CONF.length], g: 0.13 });
  }

  // a falling feather: hurts on touch while it falls, then lies on the floor as a short hazard
  DD.defineEntity('w12feather', {
    stomp: () => false,
    touch(e) { if (!e.dead && !e.landed) DD.hurt(DD.cx(e)); else if (!e.dead && e.life > 25) DD.hurt(DD.cx(e)); },   // lying on the floor it only bites for its first 20 frames, then it is just scenery fading out
    update(e) {
      if (!e.landed) {
        e.vy = Math.min(e.vy + 0.3, 5.5);
        if (DD.moveY(e, e.vy, false) || e.y + e.h >= FLOOR_Y) { e.landed = true; e.y = FLOOR_Y - 4; e.h = 4; e.w = 12; e.vy = 0; e.life = Math.min(e.life, 45); DD.dust(DD.cx(e), FLOOR_Y, 3, 1, '#ffffff'); }
      }
      if (--e.life <= 0) e.dead = true;
    },
    draw(e, ctx) {
      const X = DD.wx(e.x), Y = DD.wy(e.y);
      if (!e.landed) {   // a long white quill: a grey shaft, a dark edge on the shaded side, a bright edge on the lit side
        ctx.fillStyle = '#3a3050'; ctx.fillRect(X + 2, Y - 2, 1, 14);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 2, 8); ctx.fillStyle = '#eeeef4'; ctx.fillRect(X + 1, Y + 8, 2, 3); ctx.fillRect(X + 3, Y + 1, 2, 7);
        ctx.fillStyle = '#a6aecc'; ctx.fillRect(X + 4, Y + 3, 1, 5); ctx.fillRect(X + 2, Y + 11, 1, 2);
      } else {           // a flat feather on the floor
        if (e.life < 40 && Math.floor(e.life / 3) % 2) return;
        ctx.fillStyle = '#a6aecc'; ctx.fillRect(X, Y + 1, 12, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 1, Y, 9, 2);
        ctx.fillStyle = '#3a3050'; ctx.fillRect(X, Y + 3, 12, 1); ctx.fillRect(X + 2, Y + 1, 8, 1);
      }
    },
  });

  // the shockwave along the floor: a low golden ridge that runs off the set. Jump it.
  DD.defineEntity('w12ring', {
    stomp: () => false,
    touch(e) { if (!e.dead) DD.hurt(DD.cx(e)); },
    update(e) { e.x += e.vx; if (Math.floor(e.life) % 6 === 0) DD.dust(DD.cx(e), FLOOR_Y, 1, 1, '#fff2c0'); if (--e.life <= 0 || e.x < 0 || e.x > 60 * 16) e.dead = true; },
    draw(e, ctx, G) {
      const X = DD.wx(e.x), Y = DD.wy(e.y), d = e.vx > 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(255,230,128,0.3)'; ctx.fillRect(X - 3, Y - 4, e.w + 6, 14);
      ctx.fillStyle = '#c98f22'; ctx.fillRect(X, Y + 4, e.w, 6);
      ctx.fillStyle = '#f4c84a'; ctx.fillRect(X + 1, Y + 1, e.w - 2, 5); ctx.fillStyle = '#fff2a6'; ctx.fillRect(X + (d > 0 ? 6 : 1), Y - 1, e.w - 7, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X + (d > 0 ? e.w - 5 : 3), Y - 2, 2, 2);
    },
  });

  // Michael Gregg (New Amato in phase 2). Only his open windows can be stomped; the rest of the time he hurts.
  DD.defineEntity('angel_boss', {
    spawn: t => ({ x: t.x, y: FLOOR_Y - BH, w: BW, h: BH, dir: -1, st: 'walk', t: 0, n: 0, atk: null, lift: 0, tx: t.x, sp: [], dropped: false, openT: 0, bob: 0 }),
    update(e, G) {
      const B = DD.boss; if (!B || !B.engaged) return;
      if (B.dead) { e.lift = Math.min(e.lift + 0.7, 70); e.y = FLOOR_Y - BH - e.lift; return; }   // the defeat: he rises out of the set on the halo's light
      const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase, lo = B.arena[0], hi = B.arena[1];
      e.t++; e.bob++;
      const walkT = [100, 82, 64][ph], windT = [40, 38, 34][ph];
      if (e.st === 'walk') {                        // drift at the Dot, then pick the next attack
        e.dir = P < me ? -1 : 1; e.vx = Math.abs(P - me) > 52 ? e.dir * (0.45 + ph * 0.2) : 0;   // he stops a few tiles short, so he never crowds you into a wall
        e.x += e.vx;
        if (e.t > walkT) {
          const cycle = [['feather', 'dive'], ['feather', 'dive', 'ring'], ['feather', 'ring', 'dive', 'ring']][ph];
          e.atk = cycle[e.n++ % cycle.length];
          e.st = 'wind'; e.t = 0; e.dir = P < me ? -1 : 1;
          if (e.atk === 'feather') {                // shadows around the Dot: a fair spread
            const offs = ph >= 1 ? [-44, -16, 12, 40, 64] : [-30, 6, 36];
            e.sp = offs.map(o => DD.clamp(P + o, lo + 8, hi - 14));
          } else if (e.atk === 'dive') {
            e.sp = [DD.clamp(P, lo + 10, hi - 20)];
          }
          DD.SFX.switch && DD.SFX.switch();
        }
      } else if (e.st === 'wind') {                 // telegraph: flashing, an exclamation mark, shadows on the floor
        e.vx = 0;
        if (e.t >= windT) {
          e.t = 0; e.dropped = false; e.lift = 0;
          e.st = e.atk === 'feather' ? 'feather' : e.atk === 'dive' ? 'rise' : 'ring';
        }
      } else if (e.st === 'feather') {              // quills drop onto the shadows, then the opening
        if (!e.dropped) {
          e.dropped = true; DD.SFX.wind && DD.SFX.wind();
          e.sp.forEach(sx => DD.addEntity('w12feather', { x: sx, y: 3 * 16, w: 6, h: 11, vy: 0, life: 360, landed: false }));
          DD.dust(me, e.y + 6, 10, 30, '#ffffff');
        }
        if (e.t > 20 && (!DD.bodies.some(b => !b.dead && b.kind === 'w12feather') || e.t > 220)) { e.st = 'open'; e.t = 0; e.openT = ph >= 2 ? 100 : 120; }   // the opening starts only when every quill is gone
      } else if (e.st === 'rise') {                 // he lifts out of the frame over 30 frames
        e.lift = Math.min(e.lift + 4, 120);
        if (e.t >= 30) { e.st = 'fall'; e.t = 0; e.tx = e.sp[0]; }
      } else if (e.st === 'fall') {                 // he drops onto the shadow; the drop is quick and fair (telegraphed)
        const dx = e.tx - e.x;
        e.x += DD.clamp(dx, -3, 3);
        e.lift = Math.max(e.lift - 5, 0);
        if (e.lift <= 0) {
          e.lift = 0; e.st = 'open'; e.t = 0; e.openT = ph >= 2 ? 104 : 124;
          DD.SFX.thud(); DD.SFX.slam && DD.SFX.slam(); G.shake = Math.max(G.shake, 5); DD.dust(DD.cx(e), FLOOR_Y, 16, 44, '#fff2c0');
        }
      } else if (e.st === 'ring') {                 // a tap on the floor sends a shockwave toward the Dot
        if (!e.dropped) {
          e.dropped = true; DD.SFX.thud(); G.shake = Math.max(G.shake, 3);
          const rl = DD.clamp(Math.round((Math.abs(P - me) + 120) / 2.4), 50, 150);   // the ring fizzles a few tiles past where you stand, so it is gone before he opens
          DD.addEntity('w12ring', { x: me - 8, y: FLOOR_Y - 10, w: 16, h: 10, vx: e.dir * 2.4, life: rl });
          if (ph >= 2) DD.addEntity('w12ring', { x: me - 8, y: FLOOR_Y - 10, w: 16, h: 10, vx: -e.dir * 2.4, life: rl });
        }
        if (e.t > 30 && (!DD.bodies.some(b => !b.dead && b.kind === 'w12ring') || e.t > 200)) { e.st = 'open'; e.t = 0; e.openT = ph >= 2 ? 96 : 112; e.dropped = false; }
      } else if (e.st === 'open') {                 // the opening: he is dizzy; stomp him now
        e.vx = 0;
        if (e.t > e.openT) { e.st = 'walk'; e.t = 0; }
      }
      e.y = FLOOR_Y - BH - (e.lift || 0);
      if (e.x < lo) e.x = lo;                       // keep him inside the arena walls
      if (e.x + e.w > hi) e.x = hi - e.w;
    },
    stomp(e) {                                      // only in the open window; otherwise return false so touch hurts
      const B = DD.boss;
      if (e.st !== 'open' || !B || B.dead) return false;
      DD.hitBoss(1);
      return true;
    },
    touch(e) { if (e.st !== 'open' || !DD.boss || DD.boss.dead) DD.hurt(DD.cx(e)); },
    draw(e, ctx, G) {
      const B = DD.boss, X = DD.wx(e.x), Y = DD.wy(e.y), cxs = DD.wx(e.x + e.w / 2);
      const shadowOn = e.st === 'wind' || (e.atk === 'dive' && (e.st === 'rise' || e.st === 'fall'));
      if (shadowOn && e.atk === 'feather') {         // shadows on the floor where the quills land
        ctx.fillStyle = 'rgba(0,0,0,' + (0.35 + 0.15 * Math.sin(G.frame / 3)) + ')';
        e.sp.forEach(sx => ctx.fillRect(DD.wx(sx), DD.wy(FLOOR_Y - 3), 14, 4));
      }
      if (shadowOn && e.atk === 'dive') {            // a shadow ring on the Dot's spot, growing as he comes down
        const k = e.st === 'fall' ? 1 - e.lift / 120 : 0.4;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.3 + 0.35 * k) + ')'; ctx.fillRect(DD.wx(e.sp[0]) - 4 - 3 * k, DD.wy(FLOOR_Y - 3), 22 + 6 * k, 4);
        ctx.fillStyle = 'rgba(255,60,50,' + (0.35 + 0.3 * Math.sin(G.frame / 2)) + ')'; ctx.fillRect(DD.wx(e.sp[0]) - 6, DD.wy(FLOOR_Y - 4), 26, 1);
      }
      if (B && B.dead) {                              // the defeat: a flare of light behind him and the sprite fades
        const k = Math.max(0, (B.endT || 0) / END);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cxs, Y + 20, 4, cxs, Y + 20, 90 * (1.2 - k)); g.addColorStop(0, 'rgba(255,240,170,0.6)'); g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g; ctx.fillRect(cxs - 100, Y - 80, 200, 200); ctx.restore();
        ctx.globalAlpha = Math.min(1, k * 1.6);
      } else if (B && B.inv > 0 && Math.floor(B.inv / 3) % 2 && B.inv < 40) return;   // blink out near the end of the hit
      const who = B && B.phase > 0 ? 'na' : 'mg';
      const frame = (B && B.inv > 24) ? 'hurt' : (e.st === 'wind' || e.st === 'rise' || e.st === 'feather' || e.st === 'ring') ? 'atk' : 'idle';
      const bob = (e.st === 'open' || e.st === 'wind') ? 0 : Math.round(Math.sin(e.bob / 12) * 2);
      const n = 'w12_' + who + '_' + frame;
      if (ok(n)) DD.spr(n, cxs, Y + e.h + bob);
      if (frame === 'hurt' && B.inv > 24) { ctx.fillStyle = 'rgba(255,255,255,' + ((B.inv - 24) / 40) + ')'; ctx.fillRect(cxs - 42, Y - 20, 84, 78); }   // the hurt flash
      if (e.st === 'wind' && Math.floor(e.t / 4) % 2) {   // telegraph: red for attacks, gold for the halo
        ctx.fillStyle = e.atk === 'ring' ? 'rgba(255,230,128,0.45)' : 'rgba(255,50,40,0.35)';
        ctx.fillRect(X - 3, Y - 3, e.w + 6, e.h + 6);
      }
      if (e.st === 'wind') {                           // a big "!" so no one misses it
        ctx.fillStyle = '#ffe680'; ctx.fillRect(cxs - 2, Y - 34, 4, 12); ctx.fillRect(cxs - 2, Y - 18, 4, 4);
        ctx.fillStyle = '#6a2a08'; ctx.fillRect(cxs + 2, Y - 34, 1, 16);
      }
      if (e.st === 'open') {                           // dizzy stars circling over his head
        for (let i = 0; i < 3; i++) { const a = G.frame / 8 + i * 2.1; ctx.fillStyle = '#ffe680'; ctx.fillRect(Math.round(cxs + Math.cos(a) * 14 - 1), Math.round(Y - 12 + Math.sin(a) * 4), 3, 3); }
      }
      ctx.globalAlpha = 1;
    },
  });

  // ---------------------------------------------------------------- the level
  window.LEVEL = {
    id: '12-boss', name: 'MICHAEL GREGG', sub: 'WELCOME TO MOVIE HEAVEN', world: 12,
    W: 60, H: 24, FLOOR: 21,
    SOLID: [['floor', 0, 21, 60, 3], ['tier', 5, 17, 4, 1], ['tier', 51, 17, 4, 1]],
    KINDS: { floor: 1, tier: 2 },
    THINGS: [['dot', 1, 20], ['angel_boss', 47, 20]],
    POPCORN: [[5, 16, 4], [51, 16, 4], [26, 19, 4], [32, 19, 4], [10, 20, 5], [18, 20, 5], [37, 20, 5], [44, 20, 3]],
    sprites: ['w12_floor', 'w12_tier', 'w12_sky', 'w12_city', 'w12_hills_far', 'w12_hills_near', 'w12_statue', 'w12_mascot_b1', 'w12_mascot_b2',
              'w12_mg_idle', 'w12_mg_atk', 'w12_mg_hurt', 'w12_na_idle', 'w12_na_atk', 'w12_na_hurt'],
    intro: { bg: '#2a0a2a', fg: '#ffe680', edge: '#f4c84a' },
    portraits: { michael: 'w12_portrait_michael', amato: 'w12_portrait_amato' }, names: { michael: 'MICHAEL GREGG', amato: 'NEW AMATO', tim: 'NEW', gregg: 'GREGG' },
    lines: {   // design/VOICE.md: intro up to 2, each phase up to 2, the defeat up to 2. Sources are in the report.
      boss: [['michael', 'WELCOME TO MOVIE HEAVEN.'], ['tim', 'YOUR SEALED PREDICTION SAYS F1, GREGG.']],
      bossPhase1: [['amato', "THAT'S MY HAIR SYSTEM, BAXTER."]],
      bossPhase2: [['tim', "THEY'RE ALL STANDING UP, GREGG."], ['gregg', 'WELL, THE WITCH STOOD UP.']],
      bossDefeat: [['michael', 'ON CINEMA WILL BE BACK, WITH OR WITHOUT NEW.'], ['tim', 'THANK YOU FOR WATCHING.']],
    },
    boss: {
      name: 'MICHAEL GREGG', sub: 'STOMP HIM WHEN HE IS DIZZY', hp: 9, arena: [2, 58], inv: 60, endDelay: END,
      phases: [
        { at: 6, say: 'NEW AMATO', sub: "GOIN' BACK TO ROCK DOT CITY", enter(G) { G.s.cameo = 150; G.s.flash = 10; G.shake = 8; confettiBurst(DD.cx(G.pl), G.pl.y - 20, 40, 5); } },
        { at: 3, say: 'THE WITCH STOOD UP', sub: 'TOTOGATE', enter(G) { G.s.flash = 10; G.shake = 8; G.s.ovation = true; confettiBurst(DD.cx(G.pl), G.pl.y - 20, 60, 6); } },
      ],
      onDefeat(G) { DD.banner('THANK YOU FOR WATCHING', 120, 'THE LAST OSCAR SPECIAL'); G.s.fin = 1; confettiBurst(DD.boss.arena[0] + 80, FLOOR_Y - 40, 60, 7); confettiBurst(DD.boss.arena[1] - 80, FLOOR_Y - 40, 60, 7); },
    },
    theme: {
      tiles: { floor: ['#3f8c3c', '#d83a48', '#2e6c30'], tier: ['#4fa047', '#9ae070', '#2a5a2a'] },
      bg(ctx, G, DD) {   // Oscar night on the same painted set: a dusk sky, the skyline and hills in the dark, an audience, curtains, a bulb marquee, big statues, searchlights on the boss
        const c = G.cam, f = G.frame;
        ctx.fillStyle = '#2a1650'; ctx.fillRect(0, 0, VW, VH);
        if (ok('w12_sky')) { const im = IM('w12_sky'), ox = -(Math.round(c.x * 0.06 + f * 0.04) % im.width + im.width) % im.width; for (let x = ox - im.width; x < VW; x += im.width) ctx.drawImage(im, x, 0); }
        ctx.fillStyle = 'rgba(40,14,84,0.62)'; ctx.fillRect(0, 0, VW, VH);
        for (let i = 0; i < 40; i++) { const x = (i * 71) % VW, y = (i * 37) % 90; if ((Math.floor(f / 14) + i) % 5) { ctx.fillStyle = i % 3 ? '#fff2c0' : '#ffd0e0'; ctx.fillRect(x, y, 1 + (i % 7 === 0), 1); } }
        if (ok('w12_city')) { const im = IM('w12_city'), ox = -(Math.round(c.x * 0.18) % im.width + im.width) % im.width; for (let x = ox - im.width; x < VW; x += im.width) ctx.drawImage(im, x, 128); ctx.fillStyle = 'rgba(30,12,70,0.6)'; ctx.fillRect(0, 128, VW, 60); }
        if (ok('w12_hills_far')) { const im = IM('w12_hills_far'), ox = -(Math.round(c.x * 0.3) % im.width + im.width) % im.width; for (let x = ox - im.width; x < VW; x += im.width) ctx.drawImage(im, x, 128); ctx.fillStyle = '#58a84a'; ctx.fillRect(0, 128 + im.height, VW, VH); ctx.fillStyle = 'rgba(30,12,70,0.55)'; ctx.fillRect(0, 128, VW, 60); }
        // the audience: rows of dark heads on the risers behind the stage, hands up for the finale
        for (const [par, y0, col, col2] of [[0.62, 142, '#1a1030', '#241640'], [0.8, 156, '#120a22', '#1a1030']]) {
          for (let i = Math.floor(c.x * par / 11) - 1; i < Math.floor((c.x * par + VW) / 11) + 2; i++) {
            const X = Math.round(i * 11 - c.x * par), h = (i * 7) % 5, wave = G.s.ovation || G.s.fin ? Math.round(Math.sin(f / 6 + i) * 3) : 0;
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X + 5, y0 + h, 5, 0, 7); ctx.fill(); ctx.fillRect(X, y0 + h + 4, 11, 40);
            ctx.fillStyle = col2; ctx.fillRect(X + 2, y0 + h - 4, 3, 2);
            if ((G.s.ovation || G.s.fin) && i % 3 === 0) { ctx.fillStyle = col; ctx.fillRect(X + 1, y0 + h - 8 + wave, 2, 8); ctx.fillRect(X + 8, y0 + h - 9 - wave, 2, 8); }
          }
        }
        for (let k = 0; k < 4; k++) { const ph = (f + k * 47) % 110; if (ph > 5) continue; const n = Math.floor((f + k * 47) / 110), x = (n * 83 + k * 109) % VW, y = 120 + (n * 41 + k * 29) % 40; ctx.fillStyle = 'rgba(255,255,255,' + (0.9 - ph * 0.15) + ')'; ctx.fillRect(x - 1, y - 4, 2, 9); ctx.fillRect(x - 4, y, 9, 2); ctx.fillRect(x - 1, y - 1, 3, 3); }
        // the big golden statues either side, the marquee arch and the velvet curtains: world-anchored
        const sx0 = Math.round(DD.wx(9 * TS)), sx1 = Math.round(DD.wx(49 * TS)), Yf = Math.round(DD.wy(FLOOR_Y));
        for (const sx of [sx0, sx1]) { ctx.fillStyle = 'rgba(255,230,140,0.16)'; ctx.fillRect(sx - 18, Yf - 180, 84, 180); statue(ctx, sx, Yf, 3); }
        marquee(ctx, G, Math.round(DD.wx(18 * TS)), Math.round(DD.wy(13 * TS)), 384, 30, [['THE LAST ON CINEMA', 1, '#fff2a6'], ['OSCAR SPECIAL', 1, '#ffe680']]);
        for (let x = 0; x < 60; x += 15) { ctx.fillStyle = '#2a2230'; ctx.fillRect(Math.round(DD.wx(x * TS)), 0, 1, Math.round(DD.wy(13 * TS))); }
        curtain(ctx, Math.round(DD.wx(0)), 44); curtain(ctx, Math.round(DD.wx(60 * TS - 44)), 44);
        // searchlights from the rig, both pointing at the boss
        const bo = DD.bodies.find(b => b.kind === 'angel_boss'), tx = bo ? DD.wx(bo.x + bo.w / 2) : VW / 2, ty = bo ? DD.wy(bo.y + 24) : 100;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const x0 of [40, 280]) { const g = ctx.createLinearGradient(x0, 0, tx, ty); g.addColorStop(0, 'rgba(255,240,200,0.34)'); g.addColorStop(1, 'rgba(255,240,200,0.12)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 4, -4); ctx.lineTo(x0 + 4, -4); ctx.lineTo(tx + 28, ty + 60); ctx.lineTo(tx - 28, ty + 60); ctx.fill(); }
        const hg = ctx.createRadialGradient(tx, ty + 40, 6, tx, ty + 40, 70); hg.addColorStop(0, 'rgba(255,240,200,0.28)'); hg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = hg; ctx.fillRect(tx - 80, ty - 40, 160, 160);
        ctx.restore();
        artBoss(ctx, G);
      },
      tile(ctx, k, X, Y, tx, ty) {
        return window.LEVEL.theme.tile0(ctx, k, X, Y, tx, ty) && (edgeBoss(k, X, Y, tx, ty), true);
      },
      tile0(ctx, k, X, Y, tx, ty) {
        const K = DD.kindAt, lip = K(tx, ty - 1) !== k;
        if (k === 'floor' && ok('w12_floor')) {
          ctx.drawImage(IM('w12_floor'), 0, lip ? 0 : 16, 16, 16, X, Y, 16, 16);
          if (lip && (tx + 1) % 5 === 0) { ctx.fillStyle = '#f0c84a'; ctx.fillRect(X + 6, Y + 2, 4, 1); }
          if (!lip) { ctx.fillStyle = 'rgba(0,20,0,0.3)'; ctx.fillRect(X, Y, 16, 16); }
          return true;
        }
        if (k === 'tier' && ok('w12_tier')) { ctx.drawImage(IM('w12_tier'), X, Y); return true; }
        return false;
      },
      crawl: ['#24203a', '#0e0c1c'],
    },
    script: {
      init(G) { G.s.cameo = 0; G.s.flash = 0; G.s.ovation = false; G.s.fin = 0; },
      update(G) {
        const s = G.s, B = DD.boss;
        if (s.flash > 0) s.flash--;
        if (B && B.flash > 0 && B.flash === B.cfg.inv - 1) s.flash = 5;                       // a white pop on every hit
        if (s.cameo > 0) s.cameo--;
        if (s.fin) s.fin++;
        if (B && B.dead && s.fin % 40 === 1) { const a = B.arena; confettiBurst(a[0] + 60 + Math.random() * (a[1] - a[0] - 120), FLOOR_Y - 60, 24, 6); }
        if (s.ovation && G.frame % 50 === 0 && B && !B.dead) confettiBurst(B.arena[0] + 40 + Math.random() * (B.arena[1] - B.arena[0] - 80), 100, 10, 1);
      },
      drawMid(ctx, G) {   // the Baxter cameo: the blue mascot sprints in, bonks New Amato from behind and sprints off
        const s = G.s, bo = DD.bodies.find(b => b.kind === 'angel_boss');
        if (s.cameo > 0 && bo && ok('w12_mascot_b1')) {
          const t = 150 - s.cameo, k = t < 60 ? t / 60 : t < 90 ? 1 : 1 + (t - 90) / 60;
          const x = k <= 1 ? (bo.x + 260) + (bo.x + 26 - (bo.x + 260)) * Math.min(1, k) : bo.x + 26 + (k - 1) * 400;
          const hop = t >= 55 && t < 80 ? -Math.abs(Math.sin((t - 55) / 25 * Math.PI)) * 30 : 0;
          DD.spr('w12_mascot_b' + (Math.floor(t / 6) % 2 ? 2 : 1), DD.wx(x), DD.wy(FLOOR_Y) + hop, k < 1.02);
          if (t > 78 && t < 100) DD.text('BONK', DD.wx(bo.x + 17), DD.wy(bo.y) - 14, '#ffe680', 2, '#6a2a08', 'center');
        }
      },
      drawFG(ctx, G) {
        const s = G.s, B = DD.boss, ov = s.ovation || s.fin;
        confetti(ctx, G, ov ? 70 : 20, ov ? 1.4 : 1); DD.art.motes(G, '#fff0c8', 14, 0.3);
        const v = ctx.createRadialGradient(VW / 2, VH / 2, 70, VW / 2, VH / 2, 200); v.addColorStop(0, 'rgba(10,4,24,0)'); v.addColorStop(1, 'rgba(10,4,24,0.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
        if (s.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (s.flash / 14) + ')'; ctx.fillRect(0, 0, VW, VH); }
        if (B && B.dead) {   // the ending: letterbox bars slide in and the credits roll while the confetti falls
          const t = s.fin, bar = Math.min(26, t * 0.8);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, bar); ctx.fillRect(0, VH - bar, VW, bar);
          const k = Math.min(1, Math.max(0, (t - 30) / 40)), out = Math.min(1, Math.max(0, (END - t) / 30));
          ctx.globalAlpha = k * out;
          const lines = [['THE END', 3, '#ffe680'], ['', 1], ['DOOTLE DOTS', 2, '#ffffff'], ['A FAN-MADE LOVE LETTER', 1, '#c8cfe4'], ['', 1],
                         ['WITH LOVE TO', 1, '#a6aecc'], ['TIM HEIDECKER', 2, '#ffd04a'], ['AND GREGG TURKINGTON', 2, '#ffd04a'], ['', 1],
                         ['ON CINEMA AT THE CINEMA', 1, '#ffffff'], ['SEVENTEEN SEASONS. THIRTEEN OSCAR SPECIALS.', 1, '#ffffff'], ['', 1],
                         ['FIVE IS THE HIGHEST', 1, '#c8cfe4'], ['', 1],
                         ['THANK YOU FOR WATCHING', 1, '#ffe680'], ["HEY GUYS. IT'S MOVIE TIME.", 1, '#c8cfe4'], ["WE'LL BE RIGHT BACK", 1, '#c8cfe4']];
          let y = VH - 30 - (t - 20) * 0.52;
          for (const [txt, sc, col] of lines) { if (txt) DD.text(txt, VW / 2, Math.round(y), col, sc, '#16102a', 'center'); y += 5 * sc + 9; }
          ctx.globalAlpha = 1;
        }
      },
    },
  };
})();
