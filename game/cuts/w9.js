// World 9 cutscenes: THE AMATO ERA (Seasons 13-14 + Oscars 10-11). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-13-17-and-dootle-dots.md (World 1: S13, World 2: S14, Oscar 10 and 11, World 3: S15 for the bridge);
// clips and their episodes in design/soundbites/CATALOG.md (section 6 = the S13-S14 clips).
(function () {
  const C = window.DDCut; if (!C) return;
  const FL = 21 * 16;   // the floor of every World 9 stage (px)
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // the level's fans are not bodies (S.hide cannot reach them): stand them down for the shot and put them back in fin
  const hideFans = (S, lo, hi) => { const fans = (DD.test && DD.test.fans && DD.test.fans()) || [], keep = []; for (const f of fans) if (f.x > lo && f.x < hi && f.state !== 'gone') { keep.push([f, f.state]); f.state = 'gone'; } S.fanBack = () => keep.forEach(([f, st]) => { f.state = st; }); };

  // the wafer: a plain pixel host, the "extra" on Gregg's rating
  const wafer = (ctx, X, Y) => {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(X + x), Math.round(Y + y), w, h); };
    R(-2, -7, 5, 1, '#8a7a58'); R(-3, -6, 7, 5, '#8a7a58'); R(-2, -1, 5, 1, '#8a7a58');
    R(-2, -6, 5, 5, '#f6eedc'); R(-1, -7, 3, 1, '#f6eedc'); R(-1, -1, 3, 1, '#f6eedc');
    R(0, -5, 1, 3, '#c8b88e'); R(-1, -4, 3, 1, '#c8b88e');
  };

  // 9-1 opens: the S13 morning-show hall. The Dot walks up to the hosts' stools, past the Christmas immortality clock, as Gregg
  // gives S13E1's first rating: five bags and a communion wafer. (The stage's own start lines, Tim's "good morning", come after.)
  C.scene('9-1', 'open', {
    hidePlayer: true,
    fin: (G, S) => { if (S.fanBack) S.fanBack(); },
    beats: (S, G) => {
      const p = G.pl, cam = x => [x, FL - 22];
      for (const b of DD.bodies) if (/^(gh|th|cp|w9ball)$/.test(b.kind) && b.x > 28 * 16 && b.x < 58 * 16) S.hide(b);   // the flag and the ball in the shot
      hideFans(S, 28 * 16, 58 * 16);
      return [
        { cam: cam(572), ease: 'cut' },
        { actor: 'dot', dot: p.dot, x: 520, y: FL, shadow: 10 },
        { fade: 0, t: 36 },
        { third: 'SEASON 13: ON CINEMA AND MORE! IN THE MORNING', sub: 'OCTOBER 26, 2022. THE AMATO BANQUET HALL', t: 190, and: true },   // lore, World 1: Oct 26, 2022 - Jan 4, 2023; Amato Banquet Hall
        { wait: 24 },
        { cam: cam(688), t: 110, and: true },
        { move: 'dot', x: 624, t: 110 },
        { set: 'dot', pose: 'idle' },
        { wait: 14 },
        { say: 'gregg', clip: 'G9', and: true },                       // S13E1 (youtube 8mLmNEt9ubY): "five bags of popcorn and throw in a little communion wafer" (Prey for the Devil, lore bank item 9)
        { wait: 66 },
        { fn: () => DD.float(704, FL - 66, '5 BAGS', '#ffe680') },
        { wait: 124 },
        { actor: 'wafer', x: 712, y: FL - 50, z: 2, draw: (ctx, X, Y) => wafer(ctx, X, Y) },
        { move: 'wafer', x: 628, y: FL - 26, t: 34, ease: 'in', walk: false },
        { fn: () => { DD.stars(628, FL - 30, 8, '#fff6d8'); DD.SFX.star(); DD.float(628, FL - 40, '+ WAFER', '#fff6d8'); } },
        { gone: 'wafer' },
        { move: 'dot', y: FL, hop: 16, t: 20 },
        { wait: 150 },
      ];
    },
  });

  // 9-boss, the entrance: S14's On Demand studio, January 3, 2024. The show opens, T. Amato takes the desk's middle seat for his
  // sunlight, and the Dot sees why he is the host who cannot review: he has DRCS, and Joey does his reviews.
  C.scene('9-boss', 'boss_in', {
    sprites: ['w9_amato_0', 'w9_amato_1'],
    beats: (S, G) => {
      const b = S.boss(), bx = b ? b.x + b.w / 2 : 815, DESK = 24 * 16 + 64;
      S.hide(b);
      return [
        { cam: [DESK, FL - 22], ease: 'cut' },
        { actor: 'amato', spr: 'w9_amato_0', x: DESK, y: FL, shadow: 24 },
        { third: 'ON CINEMA ON DEMAND', sub: 'SEASON 14 PREMIERE. JANUARY 3, 2024. A PODCAST SET.', t: 150, and: true },   // lore, World 2: Season 14, Jan 3 - Mar 6, 2024, "styled after the PBD Podcast"
        { wait: 28 },
        { sfx: 'switch' },
        { clip: 'G4', wait: true },                                       // S14E1 (youtube YIBtwpPEvOQ): the announcer, "It's On Cinema On Demand."
        { wait: 24 },
        { set: 'amato', spr: 'w9_amato_1' },
        { fn: (G, S) => { S.sunA = S.t; } },
        { say: 'amato', clip: 'G6', and: true },                          // S14E1 (youtube YIBtwpPEvOQ): T. Amato, "I'm also getting 10 hours of direct sunlight a day."
        { wait: 22 },
        { fn: () => { DD.stars(DESK, FL - 40, 8, '#ffe680'); DD.SFX.star(); } },
        { wait: 120 },
        { fn: (G, S) => { S.sunB = S.t; } },
        { set: 'amato', spr: 'w9_amato_0' },
        { third: 'T. AMATO HAS DRCS', sub: 'TIM CAN NO LONGER REVIEW MOVIES. JOEY P. DOES IT.', t: 130, and: true },   // lore, World 2: DRCS, "Joey's Take"
        { wait: 24 },
        { cam: [bx - 130, FL - 22], t: 96, and: true },
        { move: 'amato', x: bx, t: 100 },
        { set: 'amato', flip: true },
        { wait: 10 },
        { set: 'amato', spr: 'w9_amato_1' },
        { sfx: 'wind' },
        { card: 'boss', from: 'SEASON FOURTEEN' },
      ];
    },
    over: (ctx, G, S) => {   // the sunlight: a warm shaft off the rig onto the host, which fades as the studio blue comes back
      const a = S.actor('amato'); if (!a) return;
      const k = S.sunA == null ? 0 : S.sunB > S.sunA ? Math.max(0, 1 - (S.t - S.sunB) / 26) : Math.min(1, (S.t - S.sunA) / 26);
      if (k < 0.02) return;
      const X = DD.wx(a.x), Y = DD.wy(a.y);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 0, 0, Y); g.addColorStop(0, 'rgba(255,214,120,0)'); g.addColorStop(1, 'rgba(255,214,120,' + 0.30 * k + ')');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X - 6, 0); ctx.lineTo(X + 6, 0); ctx.lineTo(X + 40, Y); ctx.lineTo(X - 40, Y); ctx.fill();
      const r = ctx.createRadialGradient(X, Y - 30, 1, X, Y - 30, 40); r.addColorStop(0, 'rgba(255,236,170,' + 0.4 * k + ')'); r.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = r; ctx.fillRect(X - 40, Y - 70, 80, 80);
      ctx.restore();
    },
  });

  // 9-boss, the knockout: Oscar Special 11 (AmatoCon, March 10, 2024). T. was promised a blue 2018 Dodge Charger if the convention
  // worked. Joey beat up both hosts, T. was denied the car, Gregg got a cash settlement: and the settlement became Movie House.
  C.scene('9-boss', 'boss_out', {
    sprites: ['w9_charger', 'w10_banner'],
    live: true,
    beats: (S, G) => {
      const b = S.boss(), bx = b ? b.x + b.w / 2 : 800, L = clamp(bx - 120, 0, 64 * 16 - 320), CX = L + 160, camY = 204;   // the frame for the scene: screen = world - (L, camY)
      const car = (ctx, X, Y, a) => {
        DD.spr('w9_charger', X, Y, a.flip);
        if (a.lights) { const hx = X + (a.flip ? -40 : 40); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(hx, Y - 12, 1, hx, Y - 12, 24); g.addColorStop(0, 'rgba(255,248,200,0.7)'); g.addColorStop(1, 'rgba(255,248,200,0)'); ctx.fillStyle = g; ctx.fillRect(hx - 24, Y - 36, 48, 48); ctx.restore(); }
      };
      return [
        { cam: [CX, FL - 22], t: 70, ease: 'out', and: true },
        { wait: 100 },                                                    // T. Amato spins up and off (the level's own defeat)
        { third: 'OSCAR SPECIAL 11: AMATOCON', sub: 'MARCH 10, 2024. T. WAS PROMISED A 2018 DODGE CHARGER', t: 190, and: true },   // lore, Oscar 11: AmatoCon, March 10, 2024; the blue 2018 Dodge Charger
        { actor: 'car', x: L + 400, y: FL, shadow: 80, z: 2, draw: car, flip: true },
        { move: 'car', x: bx - 10, t: 70, ease: 'out', face: false, walk: false },
        { set: 'car', lights: true },
        { fn: () => { DD.dust(bx - 10, FL - 2, 10, 2.4, '#e8e0d0'); DD.SFX.cp(); } },
        { wait: 46 },
        { sfx: 'buzz' },                                                  // the car is not for him
        { set: 'car', lights: false, flip: false },
        { move: 'car', x: L + 430, t: 38, ease: 'in', face: false, walk: false },
        { third: 'T. NEVER GOT THE CAR', sub: 'JOEY P. BEAT UP BOTH HOSTS. GREGG GOT A CASH SETTLEMENT.', t: 220, and: true },   // lore, Oscar 11: Joey beats up T. and Gregg, T. is denied the car, Gregg gets a cash settlement
        { gone: 'car' },
        { wait: 110 },
        { actor: 'house', spr: 'w10_banner', x: CX, y: camY - 40, z: 3 },
        { move: 'house', y: camY + 82, t: 20, ease: 'in', walk: false },
        { shake: 5 }, { sfx: 'slam' }, { flash: '#ffffff', t: 6 },
        { move: 'house', y: camY + 74, t: 8, walk: false },
        { third: 'THE SETTLEMENT LEASED A HOUSE', sub: 'MOVIE HOUSE. SEASON 15 PREMIERES DECEMBER 25, 2024.', t: 300, and: true },   // lore, World 3: Gregg uses the AmatoCon settlement to take a stake in HEI and lease Movie House; S15 Dec 25, 2024
        { clip: 'X1', wait: true },                                        // S15 cold open (season-15/84-charing-cross-road): "It's Movie House! If a house could be a movie, this would be it."
        { wait: 30 },
      ];
    },
    fin: (G, S) => { const b = S.boss(); if (b) { b.cutHide = true; b.keepHidden = true; } },
  });
})();
