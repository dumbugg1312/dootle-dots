// World 3 boss: ABDUL, the red-keffiyeh informant who keeps coming back (Decker). Hand-written: the Oval Office arena (green-screen windows, flags, Jackson, the big desk), the boss entity, his shockwave, thrown briefcase and fans.
// Attacks (each telegraphed for ~40 frames: he rears up with the briefcase overhead, flashes red, and a "!" appears):
//   1. HOP:    he jumps at you and lands with a shockwave running both ways along the floor. Jump the wave; he is dizzy on landing.
//   2. CHARGE: he dashes across the arena. Jump it, or let him hit the wall, which stuns him.
//   3. THROW:  (phase 2) he lobs the briefcase at where you stand. Stomp it: it bursts into popcorn.
//   Between attacks he walks at you. A stomp hurts him when he is dizzy or walking. At 3 pips ("HE CAME BACK") he is faster, throws the case and calls two fans on the phone.
DD.defineEntity('abdulShock', {   // the floor shockwave from Abdul's landing: runs both ways, hurts on touch, a jump clears it
  update(e) { DD.moveX(e, e.vx, false); if (--e.life <= 0) e.dead = true; if (e.life % 3 === 0) DD.dust(DD.cx(e), e.y + e.h, 1, 0.8, '#e8d0a0'); },
  draw(e, ctx) {
    const X = DD.wx(e.x), Y = DD.wy(e.y), f = Math.min(1, e.life / 20), fl = DD.G.frame % 6 < 3;
    ctx.globalAlpha = f;
    ctx.fillStyle = '#7a1a26'; ctx.fillRect(X + 1, Y + 4, e.w - 2, e.h - 4); ctx.fillStyle = '#c8302c'; ctx.fillRect(X + 1, Y + 2, e.w - 2, e.h - 6);
    ctx.fillStyle = fl ? '#fff4d8' : '#f6d4c4'; ctx.fillRect(X + 3, Y, e.w - 6, 3); ctx.fillStyle = '#f6d4c4';   // the pale lattice of the keffiyeh in the wave
    for (let i = 0; i < e.w; i += 4) ctx.fillRect(X + 1 + i, Y + 6 + (i / 4 % 2) * 3, 1, 1);
    ctx.globalAlpha = 1;
  },
  stomp() { return false; },
  touch(e) { DD.hurt(DD.cx(e)); },
});
DD.defineEntity('abdulCase', {   // the thrown briefcase: arcs to where you stood, hurts on touch, stomp it and it spills popcorn
  update(e) {
    if (!e.landed) { e.vy += 0.3; e.x += e.vx; e.y += e.vy; e.rot += e.vx * 0.12; }
    e.t++;
    if (!e.landed && e.y + e.h >= 21 * 16) { e.landed = true; e.vx = 0; e.vy = 0; e.y = 21 * 16 - e.h; e.t = 0; DD.dust(DD.cx(e), 21 * 16, 8, 2, '#e8d0a0'); DD.SFX.thud(); }
    if (e.landed) { e.vx = 0; e.vy = 0; e.y = 21 * 16 - e.h; if (e.t > 70) { e.dead = true; spill(e); } }
  },
  draw(e, ctx) {
    if (!DD.ready('w3_case')) return;
    ctx.save(); ctx.translate(DD.wx(DD.cx(e)), DD.wy(e.y + e.h / 2)); ctx.rotate(e.landed ? 0 : e.rot);
    if (e.landed && e.t % 8 < 4) ctx.filter = 'brightness(1.5)';
    ctx.drawImage(DD.IMG.w3_case, -8, -6); ctx.restore();
  },
  stomp(e) { e.dead = true; spill(e); return true; },
  touch(e) { DD.hurt(DD.cx(e)); },
});
function spill(e) {   // the briefcase pops open: popcorn
  DD.SFX.pop(); DD.stars(DD.cx(e), e.y, 8, '#ffe680');
  for (let i = 0; i < 4; i++) DD.drop({ x: DD.cx(e), y: e.y - 4, vx: (i - 1.5) * 1.1, vy: -3 - (i % 2), life: 300, wait: 8 });
}
DD.defineEntity('abdulfan', {   // phase-2 reinforcements: the little red-keffiyeh walker
  bowl: true,   // a person: Mel's roll knocks them over
  spawn: t => ({ x: t.x, y: t.y, w: 14, h: 28, vx: 0.9, vy: 0, t: 0 }),
  update(e, G) {
    e.t++; const d = DD.cx(G.pl) - DD.cx(e); e.vx = Math.sign(d || 1) * 0.95;
    DD.moveX(e, e.vx, false); e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
  },
  draw(e, ctx) { const n = 'w3_abdul_fan_' + (Math.floor(e.t / 8) % 2 ? 'b' : 'a'); if (DD.ready(n)) DD.spr(n, DD.wx(e.x + e.w / 2), DD.wy(e.y + e.h) + 1, e.vx > 0); },
  stomp(e) { e.dead = true; DD.addGot(2, DD.cx(e), e.y); DD.SFX.stomp(); DD.stars(DD.cx(e), e.y + 8, 6, '#f4ecdc'); return true; },
  touch(e) { DD.hurt(DD.cx(e)); },
});
DD.defineEntity('abdul_boss', {
  boss: true,   // stomp = one pip (invulnerable frames stop double hits); touch = hurt, except while he is dizzy or just hit (then he is harmless: bump him all you like)
  touch(e, G, p) { if (e.st === 'stun' || e.hurtT > 0 || DD.boss.dead) return; DD.hurt(DD.cx(e)); },

  spawn: t => ({ x: t.x, y: t.y + 32 - 50, w: 36, h: 50, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0, n: 0, atk: null, hurtT: 0, hp: -1, deadT: 0, bob: 0 }),
  update(e, G) {
    const B = DD.boss; if (!B) return;
    e.bob++;
    if (B.dead) {   // defeat: he topples over, the briefcase pops open, then he fades out (he'll be back)
      e.deadT++; e.vx *= 0.9; DD.moveX(e, e.vx, false);
      e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
      if (e.deadT === 1) { e.vy = -4; e.vx = -e.dir * 2; for (let i = 0; i < 18; i++) DD.drop({ x: DD.cx(e), y: e.y + 10, vx: (Math.random() - 0.5) * 5, vy: -3 - Math.random() * 3, life: 400, wait: 10 }); DD.stars(DD.cx(e), e.y, 14, '#ffe680'); }
      return;
    }
    if (!B.engaged) return;
    const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
    if (e.hp !== B.hp) {   // he took a hit: knocked back, hurt frame, then back to walking
      if (e.hp > 0) { e.hurtT = 40; e.st = 'walk'; e.t = -30; e.atk = null; e.vx = (P < me ? 1 : -1) * 2.2; e.vy = -3.2; DD.dust(me, e.y + e.h, 8, 2, '#e8d0a0'); }
      e.hp = B.hp;
    }
    if (e.hurtT > 0) e.hurtT--;
    e.t++;
    const spd = 1 + ph * 0.28;
    if (e.st === 'walk') {                       // walk at the Dot, then pick the next attack
      if (e.t > 0) { e.dir = P < me ? -1 : 1; e.vx = e.dir * (0.5 + ph * 0.3); } else e.vx *= 0.9;
      DD.moveX(e, e.vx, false);
      if (e.t > (ph ? 56 : 90)) {
        const seq = ph ? ['throw', 'hop', 'charge', 'throw', 'charge', 'hop'] : ['hop', 'charge'];
        e.atk = seq[e.n++ % seq.length]; e.st = 'wind'; e.t = 0; e.dir = P < me ? -1 : 1; DD.SFX.buzz && DD.SFX.buzz();
      }
    } else if (e.st === 'wind') {                // telegraph: 40 frames of rearing up with the briefcase overhead, flashing red
      e.vx = 0; e.dir = P < me ? -1 : 1;
      if (e.t >= (ph ? 32 : 42)) {
        e.t = 0;
        if (e.atk === 'charge') { e.st = 'charge'; DD.SFX.skid && DD.SFX.skid(); }
        else if (e.atk === 'throw') {
          e.st = 'throw'; const fl = Math.max(30, Math.min(60, Math.abs(P - me) / 3));   // flight time scales with the distance, so the case lands where you stood
          DD.addEntity('abdulCase', { x: me - 7, y: e.y - 6, w: 14, h: 11, vx: (P - me) / fl, vy: (21 * 16 - 11 - (e.y - 6)) / fl - 0.15 * fl, rot: 0, t: 0, landed: false }); DD.SFX.jump();
        } else { e.st = 'hop'; e.vy = -6.6 - ph * 0.5; e.vx = e.dir * 1.3; DD.SFX.jump(); }
      }
    } else if (e.st === 'charge') {              // straight dash across the arena
      e.vx = e.dir * (3 + ph * 0.7);
      if (e.t % 4 === 0) DD.dust(me - e.dir * 12, e.y + e.h, 2, 1.2, '#e8d0a0');
      const blocked = DD.moveX(e, e.vx, false);
      if (blocked || e.t > 70) { e.st = 'stun'; e.t = 0; if (blocked) { G.shake = Math.max(G.shake, 6); DD.SFX.slam(); DD.stars(me + e.dir * 18, e.y + 14, 8, '#ffe680'); } }
    } else if (e.st === 'hop') {                 // airborne: on landing, the shockwave runs both ways
      e.vy = Math.min(e.vy + 0.4, 7); DD.moveX(e, e.vx, false);
      if (DD.moveY(e, e.vy, false)) {
        e.vy = 0; e.vx = 0; e.st = 'stun'; e.t = 0; G.shake = Math.max(G.shake, 7);
        const life = 34, feet = e.y + e.h - 12, sp = 2.6 + ph * 0.4;
        DD.addEntity('abdulShock', { x: DD.cx(e) - 5, y: feet, w: 10, h: 12, vx: -sp, vy: 0, life });
        DD.addEntity('abdulShock', { x: DD.cx(e) - 5, y: feet, w: 10, h: 12, vx: sp, vy: 0, life });
        DD.SFX.thud(); DD.dust(me, e.y + e.h, 12, 3, '#e8d0a0');
      }
    } else if (e.st === 'throw') {               // he has thrown it: a moment of recovery
      e.vx = 0; if (e.t > 36) { e.st = 'stun'; e.t = 10; }
    } else if (e.st === 'stun') {                // the opening: he is dizzy, stomp him now
      e.vx *= 0.8;
      if (e.t > (ph ? 96 : 112)) { e.st = 'walk'; e.t = 0; }   // the opening: about 1.8 s in phase 1, 1.6 s in phase 2
    }
    if (e.st !== 'hop') { e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0; if (e.st === 'walk') DD.moveX(e, e.t < 0 ? e.vx : 0, false); }
    const lo = B.arena[0], hi = B.arena[1];   // keep him inside the arena walls
    if (e.x < lo) e.x = lo;
    if (e.x + e.w > hi) e.x = hi - e.w;
  },
  draw(e, ctx) {
    const B = DD.boss, G = DD.G, X = DD.wx(e.x + e.w / 2), Y = DD.wy(e.y + e.h);
    let name = 'w3_abdul_idle'; if (!DD.ready(name)) return;
    const stunned = e.st === 'stun' && e.t > 8, winding = e.st === 'wind' || e.st === 'throw' && e.t < 10;
    if (B && B.dead) name = 'w3_abdul_hurt'; else if (e.hurtT > 0 || stunned) name = 'w3_abdul_hurt'; else if (winding) name = 'w3_abdul_attack';
    ctx.save();
    ctx.translate(X, Y + 1);
    const walk = e.st === 'walk' && Math.abs(e.vx) > 0.2 ? -Math.abs(Math.sin(e.bob * 0.2)) * 2 : 0;
    ctx.translate(0, walk);
    if (B && B.dead) { const k = Math.min(1, e.deadT / 24); ctx.rotate(-e.dir * k * 1.45); ctx.translate(0, k * 6); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.deadT - 50) / 50); }
    else if (e.st === 'charge') ctx.rotate(e.dir * 0.12);
    else if (e.st === 'hop') ctx.rotate(e.dir * 0.08);
    if (e.dir > 0) ctx.scale(-1, 1);   // the sprites face screen-left (the briefcase hand); the walk direction decides the flip
    const im = DD.IMG[name];
    if (B && B.flash > 0 && B.flash > B.cfg.inv - 10) ctx.filter = 'brightness(4)';       // a white hit flash
    else if (B && B.flash > 0 && Math.floor(B.flash / 4) % 2) ctx.globalAlpha = 0.6;        // then a blink while he is invulnerable
    else if (winding && Math.floor(e.t / 4) % 2) ctx.filter = 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(1.2)';   // the red telegraph flash
    ctx.drawImage(im, -im.width / 2, -im.height); ctx.restore();
    if (winding && B && !B.dead) {   // "!" and a ground marker showing where the attack goes
      DD.text('!', DD.wx(DD.cx(e)), DD.wy(e.y) - 14 - Math.abs(Math.sin(e.t / 4)) * 3, '#ff5a4a', 2, '#2a0a10', 'center');
      if (e.atk === 'charge') { ctx.fillStyle = 'rgba(255,70,60,0.5)'; for (let i = 1; i < 6; i++) { const ax = DD.wx(DD.cx(e)) + e.dir * (28 + i * 14 + (e.t % 12)), ay = DD.wy(21 * 16) - 3; ctx.fillRect(ax, ay, 4, 1); ctx.fillRect(ax - e.dir * 1, ay - 1, 3, 1); ctx.fillRect(ax - e.dir * 1, ay + 1, 3, 1); } }
      if (e.atk === 'hop') { ctx.fillStyle = 'rgba(255,70,60,0.35)'; ctx.fillRect(DD.wx(DD.cx(e)) - 34, DD.wy(21 * 16) - 2, 68, 2); }
    }
    if ((stunned || e.hurtT > 12) && B && !B.dead) {   // dizzy stars circling his head
      for (let i = 0; i < 3; i++) { const a = e.bob / 8 + i * 2.1, sx = DD.wx(DD.cx(e)) + Math.cos(a) * 13, sy = DD.wy(e.y) - 2 + Math.sin(a) * 3; ctx.fillStyle = '#ffe680'; ctx.fillRect(sx - 1, sy - 2, 2, 5); ctx.fillRect(sx - 2, sy - 1, 4, 2); }
    }
  },
});
window.LEVEL = {
  id: '3-boss', name: 'ABDUL', sub: 'HE IS ALIVE', world: 3,
  W: 42, H: 24, FLOOR: 21,
  SOLID: [['oak', 0, 21, 42, 3], ['shelf', 8, 17, 6, 1], ['shelf', 28, 17, 6, 1], ['shelf', 18, 13, 6, 1]],
  KINDS: { oak: 1, shelf: 2 },
  THINGS: [['dot', 1, 20], ['abdul_boss', 33, 19]],
  POPCORN: (() => {   // lines and arcs: the floor, over each shelf, and a crown over the high shelf; nothing in the solids
    const out = [], row = (x, y, n) => { for (let i = 0; i < n; i++) out.push([x + i, y, 1]); }, arc = (x0, x1, y0, h, n) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 - h * 4 * t * (1 - t)), 1]); } };
    row(4, 20, 4); arc(8, 14, 20, 3, 6); row(15, 20, 3); arc(18, 24, 20, 2, 6); row(25, 20, 3); arc(28, 34, 20, 3, 6); row(35, 20, 4);   // the floor line, rising over each shelf
    row(8, 16, 6); row(28, 16, 6); row(18, 12, 6); arc(17, 24, 12, 2, 7);                                                              // on the shelves
    arc(4, 10, 16, 2, 5); arc(32, 38, 16, 2, 5); arc(11, 20, 17, 3, 6); arc(22, 31, 17, 3, 6);                                          // arcs between them
    row(5, 18, 3); row(34, 18, 3); arc(4, 12, 18, 2, 7); arc(30, 38, 18, 2, 7); row(14, 18, 2); row(26, 18, 2); arc(13, 29, 15, 3, 9); row(10, 14, 3); row(31, 14, 3); row(2, 20, 2); row(39, 20, 2);
    return out;
  })(),
  names: { decker: 'DECKER', kington: 'KINGTON', abdul: 'ABDUL' },
  portraits: { decker: 'w3_portrait_decker', kington: 'w3_portrait_kington', abdul: 'w3_portrait_abdul' },
  lines: {   // design/VOICE.md: intro (2), phase (1), defeat (2). Sources: Decker: Classified (the informant who betrays Decker, the green screen), Port of Call: Hawaii's finale (Central Park)
    start: [['kington', "THAT'S THE OVAL OFFICE. YOU CAN SEE THE GREEN SCREEN."]],
    boss: [['abdul', "I'M ALIVE."]],
    bossPhase1: [['kington', 'HE RIGGED CENTRAL PARK.']],
    bossDefeat: [['kington', 'HE KEEPS COMING BACK.'], ['tim', 'TO BE CONTINUED.']],
  },
  sprites: ['w3_abdul_idle', 'w3_abdul_attack', 'w3_abdul_hurt', 'w3_abdul_fan_a', 'w3_abdul_fan_b', 'w3_case', 'w3_owall', 'w3_owindow', 'w3_ouflag', 'w3_opflag', 'w3_ojackson',
    'w3_odesk', 'w3_ochair', 'w3_odvd', 'w3_orug', 'w3_ooak', 'w3_oshelf', 'w3_kington', 'w3_bigflag', 'w3_tbc'],
  boss: {
    name: 'ABDUL', hp: 6, arena: [2, 40], inv: 60, endDelay: 130,
    phases: [{ at: 3, say: 'CENTRAL PARK', sub: 'HE RIGGED IT', enter(G) {
      for (const [tx, side] of [[4, 1], [38, -1]]) { const px = DD.cx(G.pl) / 16; DD.spawn('abdulfan', { x: (Math.abs(px - tx) < 8 ? Math.max(4, Math.min(38, px + side * 10)) : tx) * 16, y: 21 * 16 - 28 }); }   // never on top of you: if you are standing within 8 tiles of that wall, the fan walks in from 10 tiles out instead
      DD.SFX.cp && DD.SFX.cp(); G.shake = 8;
    } }],
    onDefeat: () => DD.banner('TO BE CONTINUED', 100),
  },
  theme: {
    tiles: { oak: ['#8c5a30', '#f2c078', '#3a2218'], shelf: ['#8a5834', '#c88c4c', '#3a2218'] },
    crawl: ['#1a0c10', '#0a0508'],
    bg(ctx, G, DD) {   // the Oval Office, cheap green-screen edition: cream walls, pale windows with keyed trees, flags, Jackson over the desk
      const c = G.cam, VW = DD.VW, VH = DD.VH, I = DD.IMG, ok = DD.ready, floorY = 21 * 16 - Math.round(c.y);
      ctx.fillStyle = '#d8c8a0'; ctx.fillRect(0, 0, VW, VH);
      if (ok('w3_owall')) { const im = I.w3_owall, ox = -Math.round(c.x) % im.width; for (let x = ox - im.width; x < VW; x += im.width) ctx.drawImage(im, x, floorY - im.height); }
      const wxs = x => Math.round(x * 16 - c.x);
      if (ok('w3_owindow')) for (const wxp of [9, 20, 31]) {   // windows with the keyed-in view, a little green fringing shimmer
        const X = wxs(wxp) - 24, Y = floorY - 144 + 30; if (X > VW || X < -60) continue;
        ctx.drawImage(I.w3_owindow, X, Y);
        { const A = DD.art, iw = I.w3_owindow.width, ih = I.w3_owindow.height, sway = Math.sin(G.frame / 70 + wxp) * 0.6;   // gold drapes either side, a swagged valance with fringe, and the daylight through the glass
          for (const dx of [-11, iw]) { A.R(X + dx, Y - 4, 11, ih + 2, '#9a7220'); A.planks(X + dx, Y - 4, 11, ih + 2, '#9a7220', 3, true); A.R(X + dx + (dx < 0 ? 0 : 10), Y - 4, 1, ih + 2, '#5a4210'); A.R(X + dx + (dx < 0 ? 10 : 0), Y - 4, 1, ih + 2, '#e8c860'); A.R(X + dx - 1, Y + ih * 0.55, 13, 2, '#e8c860'); A.R(X + dx - 1, Y + ih * 0.55 + 2, 13, 1, '#5a4210'); }   // tie-backs
          A.R(X - 14, Y - 11, iw + 28, 8, '#a87c24'); A.R(X - 14, Y - 11, iw + 28, 1, '#f0d070'); A.R(X - 14, Y - 4, iw + 28, 1, '#5a4210'); A.fringe(X - 14, Y - 3, iw + 28, '#d8a838');
          A.glow(X + iw / 2 + sway, Y + ih / 2, 70, '#fff4d0', 0.1); }
        ctx.fillStyle = 'rgba(110,255,80,0.5)'; for (let i = 0; i < 5; i++) { const q = (G.frame * 0.4 + i * 17 + wxp * 3) % 60; ctx.fillRect(X + 8 + (q * 7) % 32, Y + 38 + (q * 3) % 24, 1, 1); }
      }
      { const A = DD.art; A.trim(0, floorY - 140, VW, '#d8b050'); A.R(0, floorY - 137, VW, 2, 'rgba(60,40,10,0.35)'); A.trim(0, floorY - 37, VW, '#c9a050'); A.trim(0, floorY - 6, VW, '#a8802c');   // crown moulding, chair rail and a gilt baseboard
        for (const sx of [12.5, 25.5]) { const X = wxs(sx), Y = floorY - 96; if (X < -20 || X > VW + 20) continue; A.R(X - 2, Y, 4, 9, '#c8a040'); A.R(X - 2, Y, 1, 9, '#f0d878'); A.R(X + 1, Y, 1, 9, '#7a5a18'); A.R(X - 4, Y - 3, 8, 3, '#e8d090'); A.R(X - 4, Y - 3, 8, 1, '#fffae0'); A.glow(X, Y - 2, 40, '#ffd890', 0.2 + 0.03 * Math.sin(G.frame / 11 + sx)); A.cone(X, Y + 9, 36, 14, '#ffe8b0', 0.07); }   // brass sconces
      }
      if (ok('w3_ojackson')) { const X = wxs(15) - 17, Y = floorY - 144 + 40; if (X < VW && X > -40) { const dp = G.frame - (G.dipAt ?? -999), rat = dp >= 0 && dp < 24 ? (dp % 4 < 2 ? 1 : -1) : 0, tilt = dp >= 0 && dp < 24 ? 1 : 0; ctx.drawImage(I.w3_ojackson, X + rat, Y + tilt); DD.art.trim(X - 2, Y - 6, I.w3_ojackson.width + 4, '#d8b050'); DD.art.cone(X + I.w3_ojackson.width / 2, Y - 4, 56, 22, '#ffe8b0', 0.1); } }
      for (const [fx, n] of [[3.2, 'w3_ouflag'], [5.4, 'w3_opflag'], [36.4, 'w3_opflag'], [38.4, 'w3_ouflag']]) if (ok(n)) { const X = wxs(fx) - 13, Y = floorY - I[n].height + 2; if (X < VW && X > -40) { const sw = Math.round(Math.sin(G.frame / 45 + fx) * 0.8 + (G.frame - (G.flashAt ?? -999) < 20 ? Math.sin(G.frame) : 0)); ctx.drawImage(I[n], X + sw, Y); } }
    },
    tile(ctx, k, X, Y, tx, ty) {
      const I = DD.IMG, ok = DD.ready, kd = DD.kindAt;
      if (k === 'oak' && ok('w3_ooak')) { ctx.drawImage(I.w3_ooak, 0, kd(tx, ty - 1) === 'oak' ? 16 : 0, 16, 16, X, Y, 16, 16); { const A = DD.art; if (kd(tx, ty - 1) !== 'oak') { A.R(X, Y, 16, 1, 'rgba(255,236,190,0.6)'); A.R(X, Y + 1, 16, 1, 'rgba(255,210,140,0.2)'); } if (!kd(tx + 1, ty)) A.R(X + 15, Y, 1, 16, 'rgba(20,8,10,0.4)'); if (!kd(tx - 1, ty)) A.R(X, Y, 1, 16, 'rgba(255,226,170,0.25)'); } if (ty >= 22) { const A = DD.art, ev = ty % 2 ? 4 : 12; A.R(X + ev, Y, 1, 16, 'rgba(24,8,10,0.4)'); A.R(X, Y + 15, 16, 1, 'rgba(24,8,10,0.45)'); A.R(X, Y + 8, 16, 1, 'rgba(24,8,10,0.2)'); A.R(X + ev + 1, Y, 1, 16, 'rgba(255,214,150,0.12)');
          if (ty === 22 && tx % 9 === 5) { A.R(X + 2, Y + 4, 12, 8, '#2a1a10'); A.R(X + 3, Y + 5, 10, 6, '#b8902c'); for (let i = 0; i < 4; i++) A.R(X + 3, Y + 6 + i * 2, 10, 1, '#3a2410'); A.R(X + 3, Y + 5, 10, 1, '#f0d070'); } }
        if (ty > 22) { ctx.fillStyle = 'rgba(30,10,20,' + (0.25 + (ty - 22) * 0.1) + ')'; ctx.fillRect(X, Y, 16, 16); } return true; }
      if (k === 'shelf' && ok('w3_oshelf')) { ctx.drawImage(I.w3_oshelf, X, Y); return true; }
      return false;
    },
  },
  script: {
    drawBG(ctx, G) {   // furniture in the middle distance: the big desk, the green chair and the DVD "video phone" with Kington on it
      const I = DD.IMG, ok = DD.ready, c = G.cam, floorY = 21 * 16 - Math.round(c.y), f = G.frame, B = DD.boss;
      const X = Math.round(21 * 16 - c.x);
      if (ok('w3_ochair')) ctx.drawImage(I.w3_ochair, X - 15, floorY - 44 - 22);
      if (ok('w3_odesk')) ctx.drawImage(I.w3_odesk, X - 40, floorY - 40);
      DD.art.glow(X - 4, floorY - 62, 46, '#8ae0ff', 0.14 + 0.03 * Math.sin(f / 7));   // the video phone's blue glow on the desk
      if (ok('w3_odvd')) { const hit = B && B.flash > 0 ? Math.sin(f) : 0; ctx.drawImage(I.w3_odvd, X - 15 + Math.round(hit), floorY - 40 - 20); }
      const cheer = G.frame - (G.flashAt ?? -999) < 30, wince = G.pl && G.pl.inv > 0;
      if (B && B.engaged && !B.dead && (f % 120 < 50 || cheer)) DD.text('GO ' + (B.hp > 3 ? 'DECKER' : 'ON') + (cheer ? '!' : ''), X, floorY - 74 - (cheer ? Math.round(Math.abs(Math.sin(f / 3)) * 3) : 0), '#9ee8ff', 1, '#102030', 'center');   // Kington cheering from the screen, hopping when Abdul is hit
      else if (B && B.engaged && !B.dead && wince) DD.text('OH NO', X, floorY - 74, '#ffb0a0', 1, '#301010', 'center');   // and wincing when you are
    },
    drawMid(ctx, G) {   // the presidential rug, light shafts from the windows, a few motes
      const I = DD.IMG, ok = DD.ready, c = G.cam, VW = DD.VW, VH = DD.VH, floorY = 21 * 16 - Math.round(c.y), f = G.frame;
      if (ok('w3_orug')) ctx.drawImage(I.w3_orug, Math.round(21 * 16 - c.x - 80), floorY + 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const wxp of [9, 20, 31]) {
        const X = Math.round(wxp * 16 - c.x), g = ctx.createLinearGradient(X, floorY - 110, X + 40, floorY);
        g.addColorStop(0, 'rgba(255,244,210,0.16)'); g.addColorStop(1, 'rgba(255,244,210,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X - 18, floorY - 110); ctx.lineTo(X + 18, floorY - 110); ctx.lineTo(X + 74, floorY); ctx.lineTo(X + 10, floorY); ctx.fill();
      }
      for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,240,200,0.28)'; ctx.fillRect(((i * 61 - f * 0.1 - c.x * 0.7) % VW + VW) % VW, (i * 29 + Math.sin(f / 50 + i) * 8) % 110 + 8, 1, 1); }
      ctx.restore();
    },
    drawFG(ctx, G) {
      const VW = DD.VW, VH = DD.VH, B = DD.boss;
      DD.art.motes(G, '#fff0c8', 14, 0.35);
      const v = ctx.createRadialGradient(VW / 2, VH * 0.5, VH * 0.45, VW / 2, VH * 0.5, VW * 0.7); v.addColorStop(0, 'rgba(24,8,16,0)'); v.addColorStop(1, 'rgba(24,8,16,0.42)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
      if (B && B.phase > 0 && !B.dead) { ctx.fillStyle = 'rgba(200,40,40,' + (0.04 + 0.03 * Math.sin(G.frame / 10)) + ')'; ctx.fillRect(0, 0, VW, VH); }   // phase 2: the room goes a little red
    },
  },
};
