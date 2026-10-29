// World 12 cutscenes: THE LAST OSCAR SPECIAL (the 13th, March 15, 2026) and the end of the game. Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-13-17-and-dootle-dots.md ("The Last On Cinema Oscar Special", "DOOTLE DOTS - full detail", "Between S16 and S17", Season 17);
// clips and their episodes in design/soundbites/CATALOG.md. The wiki's S16 and S17 dates are wrong; the lore file has them right (S16: Oct 1 - Dec 3, 2025;
// the Last Oscar Special: March 15, 2026; S17 premiere: Oct 21, 2026). Dootle Dots "Episode 2" is fan-made and is not used anywhere.
(function () {
  const C = window.DDCut; if (!C) return;
  const TS = 16, FY = 21 * TS;
  const CONF = ['#ff5a6a', '#ffd04a', '#5ac8ff', '#7be07a', '#ff9ad0', '#ffffff', '#b48aff'];

  const dotA = (id, dot, x, y, o) => Object.assign({ actor: id, dot, x, y, pose: 'idle', shadow: dot === 'cloud' ? 14 : 12 }, o);
  const hop = (id, h, t, and) => ({ move: id, hop: h, t, and: !!and });
  const clearFans = (S, x, r) => { S.hf = S.hf || []; for (const f of DD.fans) if (Math.abs(f.x - x) < r && f.state !== 'gone') { S.hf.push([f, f.state]); f.state = 'gone'; } };   // fans standing in the shot step out of it
  const backFans = S => { for (const [f, st] of S.hf || []) if (f.state === 'gone') f.state = st; };
  const confetti = (x, y, n, up) => { for (let i = 0; i < n; i++) DD.part({ x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 6, vy: -(up || 4) - Math.random() * 4, life: 80 + Math.random() * 50, max: 130, r: 2, col: CONF[i % CONF.length], g: 0.13 }); };
  // a column of stage light from the rig down to the floor at world x (S.beamA: how bright), the angel's own "halo's light"
  function beam(ctx, G, S) {
    if (!(S.beamA > 0)) return;
    const X = DD.wx(S.beamX), Yf = DD.wy(FY), wob = Math.sin(G.frame / 11) * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = S.beamA;
    const g = ctx.createLinearGradient(0, 0, 0, Yf); g.addColorStop(0, 'rgba(255,244,190,0.0)'); g.addColorStop(0.5, 'rgba(255,244,190,0.22)'); g.addColorStop(1, 'rgba(255,244,190,0.5)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X - 12 + wob, 0); ctx.lineTo(X + 12 + wob, 0); ctx.lineTo(X + 42, Yf); ctx.lineTo(X - 42, Yf); ctx.fill();
    const h = ctx.createRadialGradient(X, Yf - 40, 4, X, Yf - 40, 70); h.addColorStop(0, 'rgba(255,240,170,0.5)'); h.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = h; ctx.fillRect(X - 80, Yf - 120, 160, 160);
    ctx.restore();
  }
  const ramp = (S, to, t0) => ({ run: (G, S2, t) => { S2.beamA = (S2.beamA || 0) + (to - (S2.beamA || 0)) * 0.08; return t >= (t0 || 40); }, and: true });
  const feathers = (x, y0, n) => ({ run: (G, S, t) => { if (t % 7 === 0) DD.part({ x: x + (Math.random() - 0.5) * 70, y: y0 + Math.random() * 30, vx: (Math.random() - 0.5) * 0.5, vy: 0.25 + Math.random() * 0.3, life: 150, max: 150, r: 1, col: '#ffffff', g: 0.004 }); return t >= n; }, and: true });

  // ================= 12-1 =================
  // The era card's set, the real Last Oscar Special: the hosts' two-shot (New in the cream blazer, Gregg with the wings, the TV between them). Lore: "The Dots
  // open the show." The three plush Dot mascots run onto the carpet, stand in front of the hosts and open it, and Mel says his one line of the night
  // ("Yo! I'm Mel." is the one verbatim quote the lore has). The Cloud costume is not in the lore, so there are only three. Then the stage's own start line plays.
  C.scene('12-1', 'open', {
    hidePlayer: true,
    sprites: ['w12_mascot_b1', 'w12_mascot_b2'],   // 12-1's own list has the orange and purple costumes but not the blue one
    beats: (S, G) => {
      const p = G.pl, me = p.dot, X = p.x + p.w / 2, RS = 244;
      clearFans(S, 160, 260);
      const mas = (id, k, x) => ({ actor: id, frames: ['w12_mascot_' + k + '1', 'w12_mascot_' + k + '2'], fps: 7, x, y: FY, z: 2, shadow: 18 });
      return [
        { cam: [160, FY], ease: 'cut' },
        dotA('d_' + me, me, X, FY, { z: 1 }),
        mas('m_o', 'o', 400), mas('m_p', 'p', 432), mas('m_b', 'b', 464),
        { fade: 0, t: 40 },
        { third: 'THE LAST ON CINEMA OSCAR SPECIAL', sub: 'OSCAR SPECIAL 13. MARCH 15, 2026', t: 200 },   // lore: "The Last On Cinema Oscar Special (13th; March 15, 2026)"
        { wait: 30 },
        { move: 'm_o', x: RS, t: 72, ease: 'out', and: true }, { move: 'm_p', x: RS + 30, t: 78, ease: 'out', and: true }, { move: 'm_b', x: RS + 60, t: 84, ease: 'out' },   // the Dots open the show
        { fn: () => { confetti(RS + 30, FY - 30, 40, 6); DD.SFX.goal && DD.SFX.goal(); } },
        { set: 'm_o', fps: 3 }, { set: 'm_p', fps: 3 }, { set: 'm_b', fps: 3 },
        { move: 'd_' + me, hop: 9, t: 18 },                                      // the Dot does a double take: those are its costumes
        { wait: 10 },
        hop('m_o', 8, 22, true), hop('m_p', 8, 22, true), hop('m_b', 8, 22), hop('m_o', 8, 22, true), hop('m_p', 8, 22, true), hop('m_b', 8, 22),
        { move: 'm_p', x: RS + 6, hop: 5, t: 20 },                               // Mel steps forward
        { say: 'mel', text: "YO! I'M MEL.", hold: 80 },                         // lore: Mel's one line at the Oscar Special (the one verbatim quote)
        { wait: 24 },
        { move: 'm_o', x: -30, t: 84, ease: 'in', and: true }, { move: 'm_p', x: -30, t: 92, ease: 'in', and: true }, { move: 'm_b', x: -30, t: 100, ease: 'in', and: true },
        { wait: 70 }, { set: 'd_' + me, flip: false }, hop('d_' + me, 9, 16),
        { wait: 20 },
      ];
    },
    fin: (G, S) => backFans(S),
  });

  // ================= 12-boss: the entrance =================
  // Lore: Gregg's "Welcome to Movie Heaven" finale. Michael (Gregg in the huge white feathered wings, a long black coat and a halo) comes down out of the rig
  // in a column of light, and his "sealed prediction says F1, but he claims One Battle After Another". Nobody speaks: the set carries the scene, and the two
  // facts are the lower thirds. The arena's own lines for this stage are not played when a scene plays, so none of them is repeated here.
  C.scene('12-boss', 'boss_in', {
    hidePlayer: true,
    sprites: ['w12_mg_idle', 'w12_mg_atk'],
    beats: (S, G) => {
      const B = S.boss(), p = G.pl, X = p.x + p.w / 2, bx = B ? B.x + B.w / 2 : 768;
      S.hide(B); S.beamX = bx;
      return [
        dotA('d_me', p.dot, X, FY, { z: 1 }),
        { actor: 'mg', spr: 'w12_mg_idle', x: bx, y: FY - 300, z: 1 },
        { cam: [bx - 40, FY], t: 100 },
        { third: 'WELCOME TO MOVIE HEAVEN', sub: "GREGG'S FINALE SEGMENT. THE LAST OSCAR SPECIAL, MARCH 15, 2026", t: 150 },   // lore: Storyline, last bullet
        ramp(S, 1, 40), { sfx: 'wind' }, feathers(bx, FY - 250, 150),
        { wait: 40 },
        { move: 'mg', y: FY, t: 120, ease: 'out' },                              // he descends the light, wings wide
        { set: 'mg', spr: 'w12_mg_atk' }, { fn: () => { DD.dust(bx, FY, 16, 44, '#fff2c0'); DD.SFX.thud && DD.SFX.thud(); S.flash = S.flashMax = 8; S.flashCol = '#fff6c8'; } }, { shake: 5 },
        { third: 'HIS SEALED PREDICTION SAYS F1', sub: 'HE CLAIMS ONE BATTLE AFTER ANOTHER. THE LAST OSCAR SPECIAL', t: 140 },   // lore: Storyline, last bullet
        { wait: 142 },
        { set: 'mg', spr: 'w12_mg_idle' }, { run: (G2, S2, t) => { S2.beamA *= 0.93; return t >= 40; }, and: true },
        { move: 'd_me', hop: 10, t: 18, and: true }, { cam: 'player', t: 80, and: true },
        { card: 'boss', from: 'THE LAST OSCAR SPECIAL' },
      ];
    },
    draw: (ctx, G, S) => beam(ctx, G, S),
    fin: (G, S) => { S.beamA = 0; },
  });

  // ================= 12-boss: the ending =================
  // Lore: Gregg promises On Cinema will be back with or without New. Then it was (Season 17, "New's Movie Lounge", premiered Oct 21, 2026), which is what the
  // flash-forward is for: New opens it and Gregg corrects the name. Meanwhile the Dots, who premiered at this same special, line up and take their bow
  // (the theme's "Introducing the Dootle Dots"), with their plush selves behind them. The last beat is where they came from: New and G. Amato drew them at
  // the Manor's arts-and-crafts night, about a week before G. died. Then black, and the credits (12-boss.js holds them until this scene is over).
  C.scene('12-boss', 'boss_out', {
    hidePlayer: true, keepEnd: true,
    sprites: ['w12_mg_hurt', 'w12_mg_atk', 'w12_mg_idle', 'w12_mascot_o1', 'w12_mascot_o2', 'w12_mascot_p1', 'w12_mascot_p2', 'w12_portrait_amato', 'portrait_gregg'],
    cols: { amato: '#6cc8b4', gregg: '#e8707a' },
    beats: (S, G) => {
      const B = S.boss(), p = G.pl, me = p.dot, X = p.x + p.w / 2, bx = B ? B.x + B.w / 2 : 768, X0 = 480;
      const SLOT = { sam: -54, mel: -18, cloud: 18, baxter: 54 }, ORD = ['sam', 'mel', 'cloud', 'baxter'];
      S.beamX = bx; S.dim = 0;
      const dots = ORD.map(d => d === me ? dotA('d_' + d, d, X, FY, { z: 1 }) : dotA('d_' + d, d, X0 + (SLOT[d] < 0 ? -270 : 270), FY, { z: 1, flip: SLOT[d] > 0 }));
      const mas = (id, k, x) => ({ actor: id, frames: ['w12_mascot_' + k + '1', 'w12_mascot_' + k + '2'], fps: 5, x, y: FY, z: 0, shadow: 18 });
      return [
        { fn: () => { S.hide(B); if (B) B.keepHidden = true; } },
        { actor: 'mg', spr: 'w12_mg_hurt', x: bx, y: FY, z: 1 },                 // the knockout
        { cam: [bx, FY], t: 50 },
        { third: 'ON CINEMA WILL BE BACK', sub: 'GREGG PROMISES, WITH OR WITHOUT NEW. THE LAST OSCAR SPECIAL', t: 170 },   // lore: Storyline, last bullet (Gregg's promise)
        { wait: 40 },
        { set: 'mg', spr: 'w12_mg_atk' }, ramp(S, 1, 40), { sfx: 'wind' }, { fn: () => { confetti(bx - 100, FY - 40, 40, 7); confetti(bx + 100, FY - 40, 40, 7); } },
        { flash: '#fff6c8', t: 10 },
        { cam: [bx, FY - 110], t: 230, ease: 'inout', and: true }, feathers(bx, FY - 150, 220),
        { run: (G2, S2, t) => { const a = S2.actor('mg'); if (t < 20) return false; a.y = FY - Math.min(1, (t - 20) / 190) ** 1.6 * 170; a.alpha = t > 140 ? Math.max(0, 1 - (t - 140) / 70) : 1; if (a.y < FY - 20 && t % 10 === 0) DD.stars(a.x, a.y - 30, 2, '#fff6c8'); return t >= 220; }, and: true },
        { wait: 230 },
        { gone: 'mg' }, { run: (G2, S2, t) => { S2.beamA *= 0.94; return t >= 60; }, and: true },
        // the house comes up on the empty stage and the Dots come on
        { cam: [X0, FY], t: 90, ease: 'inout' },
        ...dots,
        { third: 'ON CINEMA CAME BACK', sub: "SEASON 17: NEW'S MOVIE LOUNGE. PREMIERED OCTOBER 21, 2026", t: 120 },   // lore: Season 17 (the wiki has no date; the lore file does)
        ...ORD.map((d, i) => ({ move: 'd_' + d, x: X0 + SLOT[d], t: 80 + i * 8, ease: 'out', and: i < 3 })),
        { wait: 40 },
        { say: 'amato', clip: 'D8' },                                            // S17E1 (Clayface, Wildwood and The Odyssey): New, "Welcome to New's Movie Lounge."
        { say: 'gregg', clip: 'D10' },                                           // S17E1: Gregg, "The name of the show is New's Movie Lounge... better if we just call it On Cinema."
        { wait: 20 },
        // the bow
        { clip: 'DD25' },                                                        // Dootle Dots Ep 1 theme: "Introducing the Dootle Dots"
        mas('m_o', 'o', X0 + 340), mas('m_p', 'p', X0 + 372), mas('m_b', 'b', X0 + 404),
        { move: 'm_o', x: X0 - 36, t: 60, ease: 'out', and: true }, { move: 'm_p', x: X0, t: 60, ease: 'out', and: true }, { move: 'm_b', x: X0 + 36, t: 60, ease: 'out' },
        ...ORD.map((d, i) => hop('d_' + d, 14, 30, i < 3)),
        { fn: () => { confetti(X0, FY - 40, 60, 7); DD.stars(X0, FY - 30, 14, '#ffe680'); DD.SFX.goal && DD.SFX.goal(); S.flash = S.flashMax = 8; S.flashCol = '#fff'; } },
        ...ORD.map((d, i) => hop('d_' + d, 18, 34, i < 3)), { fn: () => { confetti(X0 - 90, FY - 30, 30, 6); confetti(X0 + 90, FY - 30, 30, 6); } },
        { set: 'm_o', fps: 2 }, { set: 'm_p', fps: 2 }, { set: 'm_b', fps: 2 },
        { wait: 40 },
        // the quiet end: the lights come down to the four of them
        { run: (G2, S2, t) => { S2.dim = Math.min(1, t / 70); return t >= 70; }, and: true },
        { third: 'NEW AND G. AMATO DREW THE DOTS', sub: 'ARTS AND CRAFTS NIGHT, S16 EPISODE 7. ABOUT A WEEK BEFORE G. DIED.', t: 270, wait: true },   // lore: Dootle Dots origin; S16 Manor eps
        { fade: 1, t: 50 },
        { gone: 'm_o' }, { gone: 'm_p' }, { gone: 'm_b' }, ...ORD.map(d => ({ gone: 'd_' + d })), { fn: () => { S.dim = 0; S.beamA = 0; } },
        { wait: 10 },
      ];
    },
    draw: (ctx, G, S) => beam(ctx, G, S),
    over: (ctx, G, S) => {   // the house lights come down to a pool on the Dots (an effect in the picture, not a card)
      if (!(S.dim > 0)) return;
      const cx = DD.wx(480), cy = DD.wy(FY) - 20, g = ctx.createRadialGradient(cx, cy, 24, cx, cy, 190);
      g.addColorStop(0, 'rgba(10,4,24,0)'); g.addColorStop(1, 'rgba(10,4,24,' + (0.62 * S.dim) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);
    },
    fin: (G, S) => { const B = S.boss(); if (B) { B.cutHide = true; B.keepHidden = true; } },
  });
})();
