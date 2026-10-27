// World 11 boss: WARP-10 NEW (S16), in the Manor activity room that turns into the fluorescent hall. Hand-written: arena,
// boss entity (idle / wind-up / wig-flip / bald / hurt frames), and the bingo balls, shrimp-soup can and flying wig.
// Attacks (each telegraphed by a red flash and a "!" for 40 frames):
//   1. BINGO: three shadows mark the floor around where you stand; a numbered ball drops on each. Step out.
//   2. SHRIMP CAN: he lobs a can of cream of shrimp soup along the floor. Jump it. Phase 2 sends a second one.
//   3. LEAP (phase 2 only): he warps out, a red ring on the floor marks where he lands 70 frames later; shock waves roll each way. Then he sits spent (harmless).
//   4. WIG FLIP: he flings his wig at you, then stands bald and dizzy. That is the opening: stomp him now.
// Between attacks he walks at you. Stomping him with the wig on just bounces you off him (and hurts).
// Phase 2 ("SPEED 10", at 3 pips): faster, five balls, two cans, and the hall goes flat fluorescent with a lit SHOWTIME.
(function () {
const FLOOR = 21 * 16;
function img(n) { return DD.ready(n) ? DD.IMG[n] : null; }

DD.defineEntity('wShadow', {   // a floor marker that grows for 40 frames, then a bingo ball drops from above
  spawn: t => ({ x: t.x, y: t.y, w: 12, h: 2, life: 40, max: 40, n: t.n || 0 }),
  update(e) {
    if (--e.life <= 0) { DD.addEntity('wBall', { x: e.x + 1, y: 40, w: 12, h: 12, vy: 0, life: 150, landed: false, n: e.n }); e.dead = true; }
  },
  draw(e, ctx) {
    const k = 1 - e.life / e.max, X = DD.wx(e.x + 6), Y = DD.wy(e.y) + 1;
    ctx.fillStyle = 'rgba(20,12,30,' + (0.25 + 0.35 * k) + ')'; ctx.beginPath(); ctx.ellipse(X, Y, 6 + 4 * k, 1.5 + 1.5 * k, 0, 0, 7); ctx.fill();
    if (Math.floor(e.life / 4) % 2) { ctx.fillStyle = 'rgba(255,60,50,0.6)'; ctx.fillRect(X - 5, Y - 1, 10, 1); }
  },
  stomp: () => false,
  touch: () => {},
});
const BALLS = [['B', '#2e6ab8'], ['I', '#c42a2c'], ['N', '#e8e4d8'], ['G', '#3a9a52'], ['O', '#e8902a']];
DD.defineEntity('wBall', {   // a bingo ball: falls, lands, rolls a little, then sits on the floor for a while
  update(e) {
    if (!e.landed) { e.vy = Math.min(e.vy + 0.3, 6); if (DD.moveY(e, e.vy, false)) { e.landed = true; e.vy = 0; DD.dust(DD.cx(e), e.y + e.h, 6, 1.4, '#e8dcc0'); DD.SFX.thud(); } }
    else e.life--;
    if (e.life <= 0) e.dead = true;
  },
  draw(e, ctx) {
    if (e.landed && e.life < 40 && Math.floor(e.life / 3) % 2) return;
    const X = DD.wx(e.x) + 6, Y = DD.wy(e.y) + 6, b = BALLS[e.n % 5];
    ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(X, Y, 7, 0, 6.3); ctx.fill();
    ctx.fillStyle = b[1]; ctx.beginPath(); ctx.arc(X - 0.5, Y - 0.5, 6, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(X - 4, Y - 4, 3, 2);
    ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(X, Y, 3.2, 0, 6.3); ctx.fill();
    DD.text(b[0], X, Y - 2, '#1c1410', 1, null, 'center');
  },
  stomp: () => false,
  touch(e) { if (!e.dead && !e.landed || (e.landed && e.life > 0)) { DD.hurt(DD.cx(e)); e.dead = true; } },
});
DD.defineEntity('wCan', {   // the cream of shrimp soup can: rolls along the floor, jump it
  update(e) {
    const blocked = DD.moveX(e, e.vx, false); e.a += e.vx * 0.12;
    e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
    if (blocked || e.x < 16 || e.x > 62 * 16) { e.dead = true; DD.dust(DD.cx(e), e.y + e.h, 5, 1.2, '#e8a090'); }
  },
  draw(e, ctx) {
    const im = img('w11_can'); if (!im) return;
    ctx.save(); ctx.translate(DD.wx(e.x) + e.w / 2, DD.wy(e.y) + e.h / 2); ctx.rotate(e.a); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore();
  },
  stomp: () => false,
  touch(e) { DD.hurt(DD.cx(e)); e.dead = true; },
});
DD.defineEntity('wMark', {   // phase 2: the landing ring for his leap. It stays put for 70 frames, flashing, then he drops on it
  update(e) { if (--e.life <= 0) e.dead = true; },
  draw(e, ctx) {
    const k = 1 - e.life / e.max, X = DD.wx(e.x + e.w / 2), Y = DD.wy(e.y) + 1, r = 14 + 10 * (1 - k);
    ctx.strokeStyle = 'rgba(255,70,60,' + (0.5 + 0.4 * (Math.floor(e.life / 4) % 2)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.22, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,50,' + (0.2 + 0.4 * k) + ')'; ctx.beginPath(); ctx.ellipse(X, Y, 10 + 6 * k, 2.5, 0, 0, 7); ctx.fill();
  },
  stomp: () => false,
  touch: () => {},
});
DD.defineEntity('wPulse', {   // phase 2: the shock wave of his leap, rolling along the floor each way: jump it
  update(e) {
    e.t++; const blocked = DD.moveX(e, e.vx, false);
    e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
    if (blocked || e.t > 220 || e.x < 16 || e.x > 62 * 16) { e.dead = true; DD.dust(DD.cx(e), e.y + e.h, 5, 1.2, '#c8a0ff'); }
  },
  draw(e, ctx) {
    const X = DD.wx(e.x), Y = DD.wy(e.y), f = Math.floor(e.t / 3) % 2;
    ctx.fillStyle = '#4a2a78'; ctx.fillRect(X, Y + 2, e.w, e.h - 2); ctx.fillStyle = '#b080f0'; ctx.fillRect(X + 1, Y + 3, e.w - 2, e.h - 5);
    ctx.fillStyle = '#f0e0ff'; ctx.fillRect(X + (f ? 2 : 6), Y + 4, 4, 2); ctx.fillRect(X + e.w - (f ? 6 : 10), Y + 6, 4, 2);
  },
  stomp: () => false,
  touch(e) { DD.hurt(DD.cx(e)); e.dead = true; },
});
DD.defineEntity('wWig', {   // the wig: flies in a spinning arc, lands, sits for a moment, then goes
  update(e) {
    if (!e.landed) {
      e.vy = Math.min(e.vy + 0.25, 6); e.a += e.vx * 0.12;
      DD.moveX(e, e.vx, false);
      if (DD.moveY(e, e.vy, false)) { e.landed = true; e.vy = 0; e.vx = 0; e.a = 0; DD.dust(DD.cx(e), e.y + e.h, 4, 1, '#3a3048'); }
    } else e.life--;
    if (e.life <= 0) e.dead = true;
  },
  draw(e, ctx) {
    if (e.landed && e.life < 30 && Math.floor(e.life / 3) % 2) return;
    const im = img('w11_wig'); if (!im) return;
    ctx.save(); ctx.translate(DD.wx(e.x) + e.w / 2, DD.wy(e.y) + e.h / 2); ctx.rotate(e.a); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore();
  },
  stomp: () => false,
  touch(e) { if (!e.landed) { DD.hurt(DD.cx(e)); e.dead = true; } },
});

const SC = 1.25;   // the boss is drawn 25% bigger than his sprite: big and readable
DD.defineEntity('warp10_boss', {
  boss: true,   // stomp = one pip, but only while he is bald (see stomp below); touch = hurt
  spawn: t => ({ x: t.x, y: FLOOR - 56, w: 34, h: 56, vx: 0, vy: 0, dir: -1, st: 'walk', t: 0, cyc: 0, atk: null, hurtT: 0, dead: false, spin: 0 }),
  stomp(e, G) {
    if (e.st !== 'bald') { DD.float(DD.cx(e), e.y - 8, 'WIG ON!', '#ff8a7a'); return false; }   // the wig is on: you bounce off and get hurt
    if (!DD.hitBoss(1)) return true;
    e.st = 'hurt'; e.t = 0; e.hurtT = 36; DD.stars(DD.cx(e), e.y + 6, 10, '#fff2a6'); DD.float(DD.cx(e), e.y - 6, 'POW!', '#fff2a6');
    return true;
  },
  touch(e, G) { if (e.st !== 'hurt' && e.st !== 'bald' && e.st !== 'rest' && !e.hide && !(DD.boss && DD.boss.dead)) DD.hurt(DD.cx(e)); },   // dizzy, bald or recovering: harmless, bump him all you like on the way up
  update(e, G) {
    const B = DD.boss; if (!B || !B.engaged) return;
    if (B.dead) { e.spin++; return; }
    const P = DD.cx(G.pl), me = DD.cx(e), ph = B.phase;
    e.t++;
    if (e.st !== 'wind' && e.st !== 'bald' && e.st !== 'hurt') e.dir = P < me ? -1 : 1;
    if (e.st === 'walk') {                       // shuffle at the Dot (and stop a few tiles short, so he never crowds you into a wall), then pick the next attack
      e.vx = Math.abs(P - me) > 56 ? e.dir * (0.6 + ph * 0.3) : 0;
      DD.moveX(e, e.vx, false);
      const seq = ph >= 1 ? ['bingo', 'can', 'leap', 'wig'] : ['bingo', 'can', 'wig'];
      const clear = !DD.bodies.some(b => !b.dead && (b.kind === 'wBall' || b.kind === 'wCan' || b.kind === 'wShadow' || b.kind === 'wMark' || b.kind === 'wPulse' || b.kind === 'wWig'));
      if (e.t > 90 - ph * 20 && (seq[e.cyc % seq.length] !== 'wig' || clear)) { e.st = 'wind'; e.t = 0; e.atk = seq[e.cyc++ % seq.length]; }   // the opening never starts while an old attack is still on the floor
    } else if (e.st === 'wind') {                // telegraph: 40 frames of wind-up, flashing red
      e.vx = 0;
      if (e.t === 1) DD.SFX.wind();
      if (e.t >= 40 - ph * 6) { e.t = 0; e.st = e.atk; }
    } else if (e.st === 'bingo') {               // shadows around the Dot, then the balls drop
      e.vx = 0;
      if (e.t === 10) {
        const offs = ph >= 1 ? [-40, -20, 0, 20, 40] : [-24, 0, 24];
        offs.forEach((o, i) => {
          const x = Math.max(B.arena[0] * 16 + 8, Math.min(B.arena[1] * 16 - 20, P + o - 6));
          DD.addEntity('wShadow', { x, y: FLOOR - 2, w: 12, h: 2, life: 40, max: 40, n: i + (e.cyc % 5) });
        });
      }
      if (e.t > 80) { e.st = 'walk'; e.t = 0; }
    } else if (e.st === 'can') {                 // a can of soup along the floor (two in phase 2)
      e.vx = 0;
      if (e.t === 10 || (ph >= 1 && e.t === 50)) {
        DD.addEntity('wCan', { x: me - 7, y: FLOOR - 16, w: 14, h: 16, vx: e.dir * (2.4 + ph * 0.6), vy: 0, a: 0 });
        DD.SFX.thud();
      }
      if (e.t > 90) { e.st = 'walk'; e.t = 0; }
    } else if (e.st === 'leap') {                // phase 2: he warps out, a ring marks where he lands (70 frames), he drops on it; shock waves roll each way, then he sits spent
      e.vx = 0;
      if (e.t === 1) { e.tx = Math.max(B.arena[0] * 16 + 40, Math.min(B.arena[1] * 16 - 40, P)); e.hide = true; e.x = e.tx - e.w / 2; DD.addEntity('wMark', { x: e.tx - 16, y: FLOOR - 2, w: 32, h: 2, life: 70, max: 70 }); DD.stars(me, e.y + 20, 8, '#c8a0ff'); }
      if (e.t === 70) { e.hide = false; e.y = FLOOR - e.h - 150; e.vy = 5; }
    } else if (e.st === 'rest') {                // spent after the leap: harmless to touch
      e.vx = 0;
      if (e.t > 80) { e.st = 'walk'; e.t = 0; }
    } else if (e.st === 'wig') {                 // the wig flies; then he is bald and dizzy: the opening
      e.vx = 0;
      if (e.t === 10) { DD.addEntity('wWig', { x: me - 9, y: e.y + 2, w: 18, h: 10, vx: e.dir * 2.2, vy: -4.5, landed: false, life: 90, a: 0 }); DD.SFX.wind(); }
      if (e.t > 56) { e.st = 'bald'; e.t = 0; DD.float(me, e.y - 12, 'STOMP HIM!', '#fff2a6'); }
    } else if (e.st === 'bald') {                // dizzy and bare-headed: stomp him
      e.vx = 0;
      if (e.t > 160 - ph * 20) { e.st = 'walk'; e.t = 0; DD.float(me, e.y - 4, 'WIG BACK ON', '#ff8a7a'); }
    } else if (e.st === 'hurt') {                // knocked about, wig back on
      e.vx = 0; DD.moveX(e, -e.dir * 0.8, false);
      if (--e.hurtT <= 0) { e.st = 'walk'; e.t = 0; }
    }
    if (e.hide) e.vy = 0;
    else { e.vy = Math.min(e.vy + (e.st === 'leap' ? 0.9 : 0.4), e.st === 'leap' ? 9 : 6); if (DD.moveY(e, e.vy, false)) { if (e.st === 'leap' && e.t > 70) { e.st = 'rest'; e.t = 0; G.shake = Math.max(G.shake || 0, 8); DD.SFX.thud(); DD.dust(DD.cx(e), FLOOR - 1, 10, 10, '#d8cdb0'); for (const d of [-1, 1]) DD.addEntity('wPulse', { x: DD.cx(e) + d * 20 - 9, y: FLOOR - 12, w: 18, h: 12, vx: d * 2.6, vy: 0, t: 0 }); } e.vy = 0; } }
    const lo = B.arena[0] * 16, hi = B.arena[1] * 16;   // keep him inside the hall
    if (e.x < lo) e.x = lo;
    if (e.x + e.w > hi) e.x = hi - e.w;
  },
  draw(e, ctx, G) {
    const B = DD.boss, cx = DD.wx(e.x + e.w / 2), by = DD.wy(e.y + e.h);
    const dying = B && B.dead;
    if (e.hide) return;   // warped out mid-leap
    if (dying) ctx.globalAlpha = Math.max(0, Math.min(1, (B.endT || 100) / 70));
    else if (B && B.inv > 0 && e.st !== 'hurt' && Math.floor(B.inv / 3) % 2) return;   // flicker through the invulnerable frames
    if (!dying && e.st === 'wind' && Math.floor(e.t / 4) % 2) { ctx.fillStyle = 'rgba(255,50,40,0.4)'; ctx.fillRect(cx - 25, by - 66, 50, 66); }
    const bald = e.st === 'bald' || (e.st === 'hurt' && false) || dying;
    let name = 'w11_new_a';
    if (e.st === 'wind') name = Math.floor(e.t / 4) % 2 ? 'w11_new_b' : 'w11_new_a';
    else if (e.st === 'bingo' || e.st === 'can') name = 'w11_new_b';
    else if (e.st === 'wig' || e.st === 'leap') name = 'w11_new_c';
    else if (e.st === 'rest') name = 'w11_new_hurt';
    else if (e.st === 'bald') name = 'w11_new_bald';
    else if (e.st === 'hurt') name = 'w11_new_hurt';
    if (dying) name = 'w11_new_bald_hurt';
    const jolt = e.st === 'wig' && Math.floor(e.t / 3) % 2 ? 1 : 0;
    const bob = e.st === 'walk' ? Math.abs(Math.sin(e.t / 7)) * -1.5 : 0, sx = SC * (e.st === 'hurt' ? 1.08 : 1), sy = SC * (e.st === 'hurt' ? 0.94 : 1);
    if (img(name)) DD.spr(name, cx + jolt + (dying ? Math.sin(e.spin / 2) * 2 : 0), by + bob, e.dir > 0, sx, sy);
    // tells: a "!" while he winds up, and orbiting stars + a bounce arrow while he is bald and dizzy
    if (!dying && e.st === 'wind') DD.text('!', cx, by - 72 - Math.round(Math.sin(e.t / 3) * 2), '#ff5a4a', 2, '#400', 'center');
    if (!dying && (e.st === 'bald' || e.st === 'rest')) {
      for (let i = 0; i < 3; i++) { const a = e.t / 9 + i * 2.1; DD.text('*', cx + Math.cos(a) * 14, by - 68 + Math.sin(a) * 3, '#ffe680', 1, null, 'center'); }
      if (Math.floor(e.t / 10) % 2) { ctx.fillStyle = '#fff2a6'; ctx.fillRect(cx - 1, by - 88, 3, 6); ctx.fillRect(cx - 3, by - 83, 7, 1); ctx.fillRect(cx - 2, by - 82, 5, 1); ctx.fillRect(cx - 1, by - 81, 3, 1); }
      if (e.t % 22 < 2) { ctx.fillStyle = '#8ad0f4'; ctx.fillRect(cx + 14, by - 54 + (e.t % 22) * 3, 2, 3); }
    }
    ctx.globalAlpha = 1;
  },
});

// ---------------------------------------------------------------- the hall
const SPR = ['w11_new_a', 'w11_new_b', 'w11_new_c', 'w11_new_bald', 'w11_new_hurt', 'w11_new_bald_hurt', 'w11_wig', 'w11_can', 'w11_lino', 'w11_furniture', 'w11_plank',
  'w11_cork', 'w11_bingosign', 'w11_showtime', 'w11_popcart', 'w11_tvcart', 'w11_dchair', 'w11_door', 'w11_table', 'w11_seniors', 'w11_fluor', 'w11_frame',
  'w11_portrait_new', 'w11_portrait_gregg'];
const SENIORS = [[6, 0], [8.5, 1], [19, 2], [24, 3], [52, 4], [55, 0], [58.5, 1]];
function prop(ctx, c, name, tx, bottom, f, flip) {
  const im = img(name); if (!im) return;
  const X = Math.round(160 + (tx * 16 + 8 - 160 - c.x) * (f || 1) - im.width / 2), Y = Math.round(bottom - c.y - im.height);
  if (X > 320 || X + im.width < 0) return;
  if (flip) { ctx.save(); ctx.translate(X + im.width, Y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0); ctx.restore(); } else ctx.drawImage(im, X, Y);
}
window.LEVEL = {
  id: '11-boss', name: 'WARP-10 NEW', sub: 'THE MANOR, BINGO NIGHT', world: 11,
  W: 64, H: 24, FLOOR: 21,
  SOLID: [['lino', 0, 21, 64, 3], ['shelf', 14, 17, 5, 1], ['shelf', 44, 17, 5, 1], ['shelf', 29, 14, 6, 1]],
  KINDS: { lino: 1, shelf: 2 },
  THINGS: [['dot', 1, 20], ['warp10_boss', 50, 19]],
  POPCORN: [[3, 20, 6], [14, 16, 5], [44, 16, 5], [29, 13, 6], [11, 19, 3], [24, 19, 3], [40, 19, 3], [53, 19, 3], [8, 17, 3], [20, 18, 3], [26, 17, 2], [37, 17, 2], [50, 17, 2], [58, 20, 4], [30, 20, 4]],
  sprites: SPR,
  portraits: { new: 'w11_portrait_new', gm: 'w11_portrait_gregg' },
  names: { new: 'NEW', gm: 'GREGG' },
  lines: {   // design/VOICE.md. Sources: season-16 the-strangers-chapter-2 5:53 to 7:31 (Warp 10, organs 85, hair), now-you-see-me 15:01 (nuclear attack on toxins), hamnet-and-ella-mccay 12:09 (Lake Havasu) and 12:57 (the show can continue)
    boss: [['new', 'MY ORGANS WERE 85. WARP 10 IS WORKING.'], ['new', 'MY HAIR FELL OUT. IT IS GROWING BACK.']],
    bossPhase: [['new', "IT'S LIKE A NUCLEAR ATTACK ON TOXINS."], ['new', 'BE VERY CAREFUL WITH THIS STUFF.']],
    bossDefeat: [['new', 'I FOUND A CONDO IN LAKE HAVASU.'], ['gm', 'THE SHOW CAN CONTINUE.']],
  },
  boss: {
    name: 'WARP-10 NEW', sub: 'STOMP HIM WHEN THE WIG COMES OFF', hp: 6, arena: [2, 62], inv: 60, endDelay: 130,
    phases: [{ at: 3, say: 'WARP 10', sub: 'HE LEAPS NOW: WATCH THE RING' }],
    onDefeat() {
      DD.banner('WARP 10 IS OVER', 100, 'LAKE HAVASU');
      const B = DD.boss, e = DD.bodies.find(b => b.kind === 'warp10_boss');
      if (e) {
        DD.addEntity('wWig', { x: DD.cx(e) - 9, y: e.y, w: 18, h: 10, vx: -e.dir * 2.6, vy: -6.5, landed: false, life: 200, a: 0 });
        DD.burst(DD.cx(e), e.y, 14); DD.stars(DD.cx(e), e.y + 10, 14, '#fff2a6');
        for (let i = 0; i < 5; i++) DD.drop({ x: DD.cx(e), y: e.y + 6, vx: (i - 2) * 1.2, vy: -3.5 - (i % 2), life: 360, wait: 24 });
      }
    },
  },
  theme: {
    tiles: { lino: ['#d8cdb0', '#fff8e4', '#a89878'], shelf: ['#8c5e34', '#b07e48', '#3a2316'] },
    tile(ctx, k, X, Y, tx, ty) {
      const I = DD.IMG;
      if (k === 'lino' && DD.ready('w11_lino')) {
        ctx.drawImage(I.w11_lino, X, Y);
        if (DD.kindAt(tx, ty - 1) !== 'lino') { ctx.fillStyle = '#fff8e4'; ctx.fillRect(X, Y, 16, 1); ctx.fillStyle = '#a89878'; ctx.fillRect(X, Y + 1, 16, 1); }
        if (ty > 21) { ctx.fillStyle = 'rgba(10,6,4,' + (0.35 + 0.2 * (ty - 22)) + ')'; ctx.fillRect(X, Y, 16, 16); }
        else DD.art.tex(X, Y + 2, 16, 14, '#d8cdb0', 0.07, 13);   // speckled lino
        if (!DD.kindAt(tx + 1, ty)) DD.art.R(X + 15, Y, 1, 16, 'rgba(0,0,0,0.35)');
        return true;
      }
      if (k === 'shelf' && DD.ready('w11_plank')) { ctx.drawImage(I.w11_plank, X, Y); DD.art.R(X, Y, 16, 1, '#ffffff'); DD.art.R(X, Y + 7, 16, 1, '#6a5a3a'); if (!DD.kindAt(tx - 1, ty)) DD.art.R(X, Y, 1, 8, '#fffbe8'); if (!DD.kindAt(tx + 1, ty)) DD.art.R(X + 15, Y, 1, 8, '#8a7c60'); return true; }
      return false;
    },
    bg(ctx, G, DD) {   // the Manor hall: cream walls, cork boards, seniors at tables; in phase 2 it goes flat fluorescent with a lit SHOWTIME
      const VW = DD.VW, VH = DD.VH, B = DD.boss, bright = B && B.phase >= 1, c = G.cam, rail = 262 - c.y;
      ctx.fillStyle = bright ? '#d6e4d2' : '#d8c8a4'; ctx.fillRect(0, 0, VW, VH);
      if (!bright) for (let i = 0; i < 160; i++) { ctx.fillStyle = i % 3 ? '#c4b08a' : '#ece0c4'; ctx.fillRect((i * 53 + 17) % 320, (i * 37) % 180, 2, 1); }
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, bright ? 'rgba(255,255,240,0.45)' : 'rgba(40,30,10,0.32)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = bright ? '#a8bca4' : '#b8782c'; ctx.fillRect(0, rail, VW, 90); ctx.fillStyle = bright ? '#8aa086' : '#e09a44'; ctx.fillRect(0, rail, VW, 2);
      if (!bright) for (let x = -(c.x % 28); x < VW; x += 28) { ctx.fillStyle = '#8e5420'; ctx.fillRect(x, rail + 3, 1, 90); ctx.fillStyle = '#d08a38'; ctx.fillRect(x + 1, rail + 3, 1, 90); }
      for (const t of [6, 16, 29, 41, 54]) prop(ctx, c, 'w11_cork', t, 238, 0.92);
      prop(ctx, c, 'w11_frame', 22, 226, 0.92); prop(ctx, c, 'w11_frame', 47, 230, 0.92);
      prop(ctx, c, 'w11_door', 1, FLOOR, 1); prop(ctx, c, 'w11_door', 62.5, FLOOR, 1);
      if (bright) { prop(ctx, c, 'w11_showtime', 40, 152, 0.92); const gl = ctx.createRadialGradient(VW / 2, 150 - c.y, 6, VW / 2, 150 - c.y, 90); gl.addColorStop(0, 'rgba(255,60,50,0.18)'); gl.addColorStop(1, 'rgba(255,60,50,0)'); }
      else prop(ctx, c, 'w11_bingosign', 40, 156, 0.92);
      prop(ctx, c, 'w11_tvcart', 31.5, FLOOR, 0.95); prop(ctx, c, 'w11_dchair', 28, FLOOR, 0.95); prop(ctx, c, 'w11_dchair', 35, FLOOR, 0.95, true);
      prop(ctx, c, 'w11_popcart', 60, FLOOR, 0.95);
      const si = img('w11_seniors');
      if (si) for (const [t, k] of SENIORS) { const X = Math.round(160 + (t * 16 - 160 - c.x) * 0.97 - 11); if (X > -24 && X < 320) ctx.drawImage(si, k * 22, 0, 22, 30, X, Math.round(FLOOR - 58 - c.y), 22, 30); }
      for (const t of [7.5, 21, 54.5]) prop(ctx, c, 'w11_table', t, FLOOR + 1, 0.97);
      ctx.fillStyle = bright ? '#5e6e5a' : '#4a2c14'; ctx.fillRect(0, FLOOR - 6 - c.y, VW, 6);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';   // lights: the TV cart, or the fluorescent cones
      if (bright) for (let t = 4; t < 64; t += 9) { const X = Math.round(t * 16 - c.x * 0.97), gg = ctx.createLinearGradient(0, 6, 0, 130); gg.addColorStop(0, 'rgba(255,255,230,0.22)'); gg.addColorStop(1, 'rgba(255,255,230,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(X + 4, 6); ctx.lineTo(X + 44, 6); ctx.lineTo(X + 72, 130); ctx.lineTo(X - 24, 130); ctx.fill(); }
      else { const X = Math.round(160 + (31.5 * 16 + 8 - 160 - c.x) * 0.95), gg = ctx.createRadialGradient(X, 270 - c.y, 3, X, 270 - c.y, 60); gg.addColorStop(0, 'rgba(120,160,255,0.3)'); gg.addColorStop(1, 'rgba(120,160,255,0)'); ctx.fillStyle = gg; ctx.fillRect(X - 60, 210 - c.y, 120, 120); }
      ctx.restore();
      if (bright) { const fl = img('w11_fluor'); if (fl) for (let t = 4; t < 64; t += 9) { const X = Math.round(t * 16 - c.x * 0.97 - 3); if (X > -50 && X < VW) ctx.drawImage(fl, X, 0); } }
      { const A = DD.art, f = G.frame, sx = (t, q) => Math.round(160 + (t * 16 + 8 - 160 - c.x) * q);   // the art pass: gilt rails, bulbs round the sign, glowing TV and popcorn cart, exit signs, light pools
        A.trim(0, rail - 2, VW, bright ? '#c8d8c4' : '#f0b866'); A.trim(0, FLOOR - 7 - c.y, VW, bright ? '#a8bca4' : '#8a5a2c');
        { const im = img(bright ? 'w11_showtime' : 'w11_bingosign'); if (im) { const X = sx(40, 0.92) - (im.width >> 1), Y = Math.round((bright ? 152 : 156) - c.y - im.height); A.bulbs(X - 2, Y - 3, im.width + 4, 6, f); A.bulbs(X - 2, Y + im.height + 1, im.width + 4, 6, f + 9); A.glow(X + im.width / 2, Y + im.height / 2, 70, bright ? '#ff503c' : '#ffe9a0', 0.16); } }
        for (const t of [1, 62.5]) { const X = sx(t, 1); if (X > -40 && X < 360) { A.R(X - 10, FLOOR - 92 - c.y, 20, 8, '#0a2a14'); A.R(X - 8, FLOOR - 90 - c.y, 16, 4, G.frame % 80 < 70 ? '#5af088' : '#2a8a4a'); A.glow(X, FLOOR - 88 - c.y, 24, '#5af088', 0.16); } }
        if (!bright) { const X = sx(31.5, 0.95); A.glow(X, 270 - c.y, 50, '#78a0ff', 0.1 + 0.05 * Math.sin(f / 5 + Math.sin(f / 13) * 3)); A.cone(sx(60, 0.95), 262 - c.y, 60, 20, '#ffe29a', 0.1); A.glow(sx(60, 0.95), 280 - c.y, 30, '#ff5a40', 0.12); }
        else for (let t = 4; t < 64; t += 9) A.glow(sx(t + 1.5, 0.97), FLOOR - 4 - c.y, 40, '#ffffe6', 0.06); }
      const v = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.45, VW / 2, VH * 0.55, VW * 0.68);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,6,4,0.34)'); ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
    },
    crawl: ['#241a14', '#0e0a08'],
  },
  script: {
    drawFG(ctx, G) {   // a white flash on each stomp, and a red pulse in phase 2
      const B = DD.boss; if (!B) return;
      DD.art.motes(G, B.phase >= 1 ? '#f4f8e8' : '#fff0c0', 16, 0.3);
      if (B.flash > B.cfg.inv - 6 && B.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * (B.flash - (B.cfg.inv - 6)) / 6) + ')'; ctx.fillRect(0, 0, DD.VW, DD.VH); }
      if (B.phase >= 1 && !B.dead && G.frame % 90 < 8) { ctx.fillStyle = 'rgba(255,40,30,0.06)'; ctx.fillRect(0, 0, DD.VW, DD.VH); }
    },
  },
};
})();
