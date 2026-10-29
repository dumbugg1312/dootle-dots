// World 10 cutscenes: MOVIE HOUSE (Season 15 + Oscar Special 12). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-13-17-and-dootle-dots.md (World 3, Oscar 12); the S15 and Oscar 12 captions in refs/season-15 and
// refs/oscar-specials/12th-annual-on-cinema-oscar-special (for the typed line); clips and their episodes in design/soundbites/CATALOG.md.
(function () {
  const C = window.DDCut; if (!C) return;
  const FL = 21 * 16;   // the floor of every World 10 stage (px)
  const out = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const RAT = ['w10_rat_a', 'w10_rat_b'];
  // the level's fans are not bodies (S.hide cannot reach them): stand them down for the shot and put them back in fin
  const hideFans = (S, lo, hi) => { const fans = (DD.test && DD.test.fans && DD.test.fans()) || [], keep = []; for (const f of fans) if (f.x > lo && f.x < hi && f.state !== 'gone') { keep.push([f, f.state]); f.state = 'gone'; } S.fanBack = () => keep.forEach(([f, st]) => { f.state = st; }); };

  // 10-1 opens: the porch, the COMING SOON banner, then into the parlour for Gregg's tour of Movie House. A rat drags a popcorn
  // bag across the floor behind his back, and New sees it. (The stage's own start lines, "Welcome to Movie House", come after.)
  C.scene('10-1', 'open', {
    hidePlayer: true,
    sprites: ['w10_bag', 'w10_rat_a', 'w10_rat_b'],
    beats: (S, G) => {
      const p = G.pl, cam = x => [x, FL - 22];
      for (const b of DD.bodies) if (/^(gh|th|cp)$/.test(b.kind) && b.x < 540) S.hide(b);
      hideFans(S, 300, 620);
      return [
        { cam: cam(140), ease: 'cut' },
        { actor: 'dot', dot: p.dot, x: p.x + p.w / 2, y: FL, shadow: 10 },
        { actor: 'bag', spr: 'w10_bag', x: 452, y: FL - 1, z: 1 },
        { actor: 'rat', frames: RAT, fps: 10, x: 600, y: FL, z: 2, alpha: 0 },
        { fade: 0, t: 36 },
        { third: 'SEASON 15: ON CINEMA AT THE CINEMA AT MOVIE HOUSE', sub: 'DECEMBER 25, 2024. THE PEOPLE UNDER THE STAIRS HOUSE', t: 190, and: true },   // lore, World 3: S15 Dec 25, 2024 - Feb 26, 2025; "the real People Under the Stairs house"
        { wait: 40 },
        { cam: cam(372), t: 140, and: true },
        { move: 'dot', x: 330, t: 140 },
        { set: 'dot', pose: 'idle' },
        { wait: 6 },
        { say: 'gregg', clip: 'D46', and: true },                       // S15E1 (season-15/babygirl-nosferatu 8:09): Gregg, the house tour: "There's a popcorn machine on every floor."
        { set: 'rat', alpha: 1 },
        { run: (G, S, t) => {                                           // the rat runs in along the baseboard and takes the bag
          const r = S.actor('rat'), b = S.actor('bag'); r.x = 600 - t * 2.3; r.flip = true;
          if (r.x < 452) { b.x = r.x - 9; b.y = FL - 3 - Math.abs(Math.sin(t / 4)) * 1.5; }
          if (r.x < 407 && !S.alert) S.alert = S.t;
          return r.x < 300;
        }, and: true },
        { wait: 100 },
        { move: 'dot', y: FL, hop: 16, t: 18 },                         // the rat goes under the Dot
        { wait: 64 },
        { gone: 'rat' }, { gone: 'bag' },
        { wait: 30 },
      ];
    },
    fin: (G, S) => { if (S.fanBack) S.fanBack(); },
    draw: (ctx, G, S) => {   // New's "!" over his chair when the rat goes by (the level draws the same mark over Gregg's)
      if (S.alert && S.t - S.alert < 70) DD.text('!', DD.wx(407), DD.wy(FL) - 56 - Math.min(8, (S.t - S.alert) / 4), '#ffe680', 1, '#2a0a10', 'center');
    },
  });

  // 10-boss, the entrance: S15's rat plague. New will not stop telling the crew why the rats keep coming back (the popcorn),
  // so they come out of the walls and the Rat King stands up in the middle of them, popcorn-bag scepter and all.
  C.scene('10-boss', 'boss_in', {
    sprites: ['w10_ratking', 'w10_ratking_atk', 'w10_rat_a', 'w10_rat_b'],
    beats: (S, G) => {
      const b = S.boss(), kx = b ? b.x + b.w / 2 : 465, ky = b ? b.y + b.h + 1 : FL + 1;
      S.hide(b);
      const holes = [88, 216, 344, 600], run = (i, x) => ({ move: 'r' + i, x: kx + (x < kx ? -24 : 24), t: Math.round(Math.abs(kx - x) / 3.2) + 20, ease: 'linear', and: true });
      return [
        { cam: [400, FL - 22], ease: 'cut' },
        { actor: 'king', spr: 'w10_ratking', x: kx, y: ky, sy: 0.01, alpha: 0, shadow: 40 },
        ...holes.map((x, i) => ({ actor: 'r' + i, frames: RAT, fps: 10, x, y: FL, z: 2, alpha: 0 })),
        { third: 'SEASON 15: THE RAT PLAGUE', sub: 'RATS CHEW THE WIRES AND THE POPCORN BAGS IN MOVIE HOUSE', t: 190, and: true },   // lore, World 3: "rats chewing wires and food bags"
        { wait: 40 },
        { say: 'tim', text: "THEY'RE COMING RIGHT BACK IN THE HOUSE BECAUSE THIS IS WHERE THE POPCORN IS.", and: true },   // S15 valiant-one-dog-man 9:34 (captions): New, to Mark, about the rats
        { wait: 60 },
        ...holes.map((x, i) => ({ set: 'r' + i, alpha: 1 })),
        ...holes.map((x, i) => run(i, x)),
        { wait: 140 },
        ...holes.map((x, i) => ({ gone: 'r' + i })),
        { fn: () => { DD.dust(kx, FL - 2, 14, 3, '#8a6a4a'); DD.SFX.thud(); } },
        { shake: 7 },
        { set: 'king', alpha: 1 },
        { run: (G, S, t) => { const a = S.actor('king'); a.sy = 0.05 + 0.95 * out(t / 40); a.sx = 1; if (t % 6 === 0) DD.dust(kx, FL - 2, 3, 3, '#8a6a4a'); return t >= 40; } },
        { set: 'king', spr: 'w10_ratking_atk' },
        { sfx: 'wind' },
        { fn: () => DD.float(kx, ky - 62, 'SKRRK!', '#ff5a4a') },
        { wait: 30 },
        { card: 'boss', sub: 'IN THE WALLS OF MOVIE HOUSE', from: 'SEASON FIFTEEN' },
      ];
    },
  });

  // 10-boss, the knockout: Oscar Special 12, March 2, 2025. The rats leave a house the firefighters condemn. New refuses to go,
  // the ceiling comes down on him and the feed cuts out. In June, the Roundup finds him and Gregg in an Extended Stay America.
  C.scene('10-boss', 'boss_out', {
    live: true,
    sprites: ['w10_ratking_hurt', 'w10_ratking2_hurt', 'w10_rat_a', 'w10_rat_b', 'w10_chair', 'w10_tim_seat', 'w10_beam'],
    beats: (S, G) => {
      const b = S.boss(), kx = b ? b.x + b.w / 2 : 465, ky = b ? b.y + b.h + 1 : FL + 1, ph2 = b && G.boss && G.boss.phase >= 1;
      S.hide(b);
      const CX = 330, plank = (ctx, X, Y, a) => { ctx.save(); ctx.translate(Math.round(X), Math.round(Y)); ctx.rotate(a.rot); for (let i = 0; i < 6; i++) DD.spr('w10_beam', (i - 2.5) * 16, 0, false, 1, 1, 0); ctx.restore(); };
      const exodus = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ actor: 'x' + i, frames: RAT, fps: 10, x: kx - 10 + (i % 3) * 8, y: FL, z: 2, alpha: 0 }));
      return [
        { cam: [Math.min(kx, 560), FL - 22], t: 40, ease: 'out', and: true },
        { actor: 'king', spr: ph2 ? 'w10_ratking2_hurt' : 'w10_ratking_hurt', x: kx, y: ky, shadow: 40 },
        { run: (G, S, t) => { const a = S.actor('king'); a.x = kx + Math.round(Math.sin(t * 1.7) * 2); a.alpha = Math.max(0, 1 - t / 70); return t >= 70; } },
        { gone: 'king' },
        ...exodus,
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ set: 'x' + i, alpha: 1 })),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ move: 'x' + i, x: kx + 330, t: 70 + i * 6, ease: 'in', and: true, walk: false })),
        { third: 'OSCAR SPECIAL 12: MARCH 2, 2025', sub: 'THE FIREFIGHTERS CONDEMNED MOVIE HOUSE', t: 200, and: true },   // lore, Oscar 12: "Firefighters condemn the house"; Oscar 12 aired March 2, 2025
        { wait: 110 },
        { cam: [CX, FL - 22], t: 50, and: true },
        { actor: 'chair', spr: 'w10_chair', x: CX, y: FL, z: 1 },
        { actor: 'new', spr: 'w10_tim_seat', x: CX, y: FL - 6, z: 2, bob: 1 },
        { wait: 80 },
        { third: 'NEW REFUSED TO LEAVE', sub: 'THE CEILING FELL ON HIM AND THE FEED CUT OUT', t: 150, and: true },   // lore, Oscar 12: "New refuses to leave... The ceiling collapses on him and the feed cuts out"
        { fn: () => { DD.SFX.thud(); S.cam0 = S.t; } },
        { actor: 'p1', x: CX - 18, y: -40, z: 4, rot: 0.22, draw: plank },
        { actor: 'p2', x: CX + 22, y: -90, z: 4, rot: -0.3, draw: plank },
        { move: 'p1', y: FL - 38, t: 26, ease: 'in', walk: false, and: true },
        { move: 'p2', y: FL - 12, t: 38, ease: 'in', walk: false },
        { fn: () => { DD.dust(CX, FL - 6, 24, 4, '#c8b89c'); DD.stars(CX, FL - 30, 10, '#ffe680'); } },
        { shake: 12 }, { sfx: 'slam' }, { flash: '#ffffff', t: 8 },
        { gone: 'new' }, { gone: 'chair' },
        { set: 'p1', rot: 0.05 }, { set: 'p2', rot: -0.12 },
        { wait: 40 },
        { fn: (G, S) => { S.noise = 28; } },
        { wait: 28 },
        { fade: 1, t: 8, col: '#000' },
        { wait: 20 },
        { third: 'SUMMER MOVIE ROUNDUP: JUNE 18, 2025', sub: 'NEW AND GREGG ARE LIVING AT AN EXTENDED STAY AMERICA', t: 175, wait: true },   // lore, Oscar 12 aftermath: the Roundup, June 18, 2025, an Extended Stay America
        { wait: 8 },
      ];
    },
    over: (ctx, G, S) => {   // the feed cutting out: bars of snow
      if (!(S.noise > 0)) return;
      S.noise--;
      for (let i = 0; i < 16; i++) { const y = ((i * 37 + S.t * 11) % 180), h = 2 + (i * 7 + S.t) % 5; ctx.fillStyle = (i + S.t) % 3 ? 'rgba(200,200,210,0.55)' : 'rgba(60,60,70,0.7)'; ctx.fillRect(0, y, 320, h); }
    },
    fin: (G, S) => { const b = S.boss(); if (b) { b.cutHide = true; b.keepHidden = true; } },
  });
})();
