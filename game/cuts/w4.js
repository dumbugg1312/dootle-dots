// World 4 cutscenes: VFA & DEKKAR (Seasons 7-8). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-05-08.md (Season 7, Season 8, Dekkar, VFA and VFC sections); clips and their episodes in design/soundbites/CATALOG.md.
// This world is two rooms: a storage unit with a roll-up door, and a stage with a light rig. The scenes use both: a door that rolls up on
// a video store's worth of tapes, and a blackout that ends on one slam of light.
(function () {
  const C = window.DDCut; if (!C) return;
  const GY = 21 * 16;   // the floor line (px)

  // 4-1 opens: Season 7's premiere. Tim burned Gregg's collection on Decker; Gregg comes back with a Victorville video store's whole stock
  // (three times his old collection) in a storage unit, and the roll-up door goes up on it. (The stage's own semi comes by on its own, later.)
  C.scene('4-1', 'open', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h, ar = S.body('archivist'), gx = ar ? ar.x + ar.w / 2 : 74;
      return [
        { fn: () => S.hide(ar) },                                   // the stage's own Gregg is hugging a box at the dock; the scene's Gregg is the same one
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y, shadow: 10 },
        { actor: 'gregg', spr: 'w4_gregg', x: gx, y, flip: true, z: 1 },
        {   // the storage unit's door (tile 3, four tiles wide): the closed panel slides up off the stacked boxes behind it
          actor: 'door', x: 80, y: GY, z: 0, k: 0,
          draw: (ctx, X, Y, a) => {
            if (!(a.k > 0) || !DD.ready('w4_door') || !DD.ready('w4_door_open')) return;
            ctx.drawImage(DD.IMG.w4_door_open, X - 32, Y - 112);
            ctx.save(); ctx.beginPath(); ctx.rect(X - 32, Y - 112, 64, 112); ctx.clip(); ctx.drawImage(DD.IMG.w4_door, X - 32, Y - 112 - Math.round(a.k * 112)); ctx.restore();
          },
        },
        { fade: 0, t: 40 },
        { third: 'LUCKY SEASON SEVEN', sub: 'SEPTEMBER 2015. THE VICTORVILLE FILM ARCHIVES', t: 150, and: true },   // lore: Season 7, Sept-Nov 2015; VFA origin (S7E01)
        { wait: 90 },
        { say: 'gregg', clip: 'B77' },                               // S7 "Ant-Man and Fantastic Four": Gregg on Tim burning his collection
        { move: 'gregg', y, t: 16, hop: 3, face: false },
        { sfx: 'gate' },
        { run: (G2, S2, t) => { S2.actor('door').k = Math.min(1, t / 50); return t >= 50; } },
        { move: 'dot', y, t: 22, hop: 7, face: false, and: true },
        { wait: 20 },
        { third: 'THE VICTORVILLE FILM ARCHIVES', sub: "A VIDEO STORE'S WHOLE STOCK, THREE TIMES GREGG'S OLD COLLECTION", t: 150, wait: true },   // lore: VFA, S7E01
        { run: (G2, S2, t) => { S2.actor('door').k = Math.max(0, 1 - t / 40); return t >= 40; } },
      ];
    },
  });

  // 4-boss, the entrance: the Empty Bottle premiere (Season 7), when Tim stops reviewing movies to play Dekkar's single. A blackout, a
  // four-count, then one slam of light. He holds up the bottle on the _throw pose; Gregg is in the front row, as in the fight.
  C.scene('4-boss', 'boss_in', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h, bs = S.boss();
      return [
        { fn: () => { S.hide(bs); if (bs) { bs.st = 'bottle'; bs.t = 9999; } } },   // the bottle pose, held for the scene
        { cam: [708, 314], ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y, shadow: 10 },
        { fade: 0.9, t: 1 },
        { third: 'EMPTY BOTTLE', sub: 'SEASON 7. DEKKAR PREMIERES ITS SINGLE INSTEAD OF REVIEWING MOVIES', t: 100, and: true },   // lore: S7E03 (Empty Bottle CD premiere)
        { wait: 14 },
        { sfx: 'tick' }, { wait: 24 }, { sfx: 'tick' }, { wait: 24 }, { sfx: 'tick' }, { wait: 12 }, { sfx: 'tick' }, { wait: 10 },   // the four-count
        { fade: 0, t: 2 }, { flash: '#ffffff', t: 8 }, { sfx: 'slam' }, { shake: 9 },
        { fn: () => { S.show(bs); G.s.cheer = 90; DD.stars(DD.cx(bs || p), (bs ? bs.y : p.y) + 8, 10, '#ffe680'); } },
        { move: 'dot', y, t: 22, hop: 8, face: false, and: true },
        { wait: 40 },
        { say: 'tim', clip: 'B69' },                                  // S7 "Black Mass and The Maze Runner: The Scorch Trials": "Title track is called Empty Bottle."
        { fn: () => { if (bs) { bs.st = 'idle'; bs.t = 60; } } },
        { card: 'boss', from: 'SEASON SEVEN', sub: 'EMPTY BOTTLE', t: 120 },
      ];
    },
    fin: (G, S) => { const b = S.boss(); if (b && b.st === 'bottle') { b.st = 'idle'; b.t = 60; } },
  });

  // 4-boss, the knockout: the end of Season 8. The VFA burned (E7) and the only thing that came out of it whole was the Dekkar master tape;
  // by E10 Tim, who can't play bass, has turned Dekkar into DKR, an EDM act. The clip comes first, over the glow and a single tape on the
  // stage; the third that explains it comes after.
  C.scene('4-boss', 'boss_out', {
    live: true,
    beats: (S, G) => [
      { fn: () => { G.s.cheer = 0; G.s.beam = 0; } },
      { wait: 30 },
      { cam: [708, 314], t: 50, ease: 'out', and: true },
      { run: (G2, S2, t) => { S2.ember = Math.min(1, t / 80); if (t % 4 === 0) DD.part({ x: G2.cam.x + 20 + Math.random() * 280, y: G2.cam.y + 150, vx: (Math.random() - 0.5) * 0.7, vy: -0.7 - Math.random() * 0.8, life: 70, max: 70, r: 1, col: Math.random() < 0.5 ? '#ff9a40' : '#ffd070', g: -0.01 }); return !!S2.embersOff; }, and: true },   // the glow and its sparks, until the last third
      { wait: 40 },
      {   // the Dekkar master tape, in a pool of warm light
        actor: 'tape', x: 742, y: GY, z: 2, bob: 1,
        draw: (ctx, X, Y, a, S2) => {
          const g = ctx.createRadialGradient(X, Y - 12, 2, X, Y - 12, 34); g.addColorStop(0, 'rgba(255,214,140,0.55)'); g.addColorStop(1, 'rgba(255,214,140,0)');
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(X - 34, Y - 46, 68, 68); ctx.restore();
          DD.spr('vhs', X, Y);
        },
      },
      { sfx: 'vhs' },
      { wait: 20 },
      { say: 'gregg', clip: 'B91' },                                 // S8 "Solace and The Light Between Oceans": "The Dekkar master tape survived. So there is no justice in the world."
      { third: 'SEASON 8: THE VFA FIRE', sub: "THE ARCHIVE IS GONE. TIM GOES EDM AS DKR. NEXT: SIX BAG CINEMAS", t: 140, wait: true },   // lore: VFA fire (S8E07); DKR (S8E10); S9 follows
      { fn: (G2, S2) => { S2.embersOff = true; } },
    ],
    over: (ctx, G, S) => {   // the fire's light along the bottom of the stage, flickering
      if (!(S.ember > 0)) return;
      const g = ctx.createRadialGradient(160, 190, 6, 160, 190, 190), f = 0.5 + 0.5 * Math.sin(S.t / 5) * Math.sin(S.t / 11);
      g.addColorStop(0, 'rgba(255,140,50,' + (0.6 * S.ember * (0.8 + 0.2 * f)) + ')'); g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);
    },
  });
})();
