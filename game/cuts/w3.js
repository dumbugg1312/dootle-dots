// World 3 cutscenes: DECKER (Seasons 5-6 + Decker 1-3). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-05-08.md (Decker section, Season 5 story beats); clips and their episodes in design/soundbites/CATALOG.md.
// The look of this world is the cheap spy show inside the show: the canyon road with Decker's parked bike, the video phone with Gregg's
// green-screen footage on it, the Oval Office keyed onto a green screen. Props here (the phone's glow, the confetti) are drawn in the
// level's own pixel style; every bar, caption and third is the player's.
(function () {
  const C = window.DDCut; if (!C) return;

  // 3-1 opens: Decker: Classified premieres inside Season 5, and Kington is only on a video phone because Tim cut Gregg's green-screen
  // interview into the show without asking. The S5 feud ends the way the show ended it: Gregg asks his question, Tim says "Good day."
  C.scene('3-1', 'open', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h;
      DD.loadSprites(['w3_odvd', 'w3_decker']);
      return [
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y, shadow: 10 },
        { actor: 'decker', spr: 'w3_decker', x: x + 380, y, flip: true, z: 1 },   // walks in off the right edge to the parked bike
        {   // the video phone: Gregg's footage, keyed in with a flicker of green fringe, floating by Decker's head
          actor: 'phone', x: x + 214, y: y - 56, z: 2, alpha: 0, bob: 2,
          draw: (ctx, X, Y, a, S2) => {
            ctx.globalAlpha = a.alpha; DD.spr('w3_odvd', X, Y);
            ctx.fillStyle = 'rgba(110,255,80,0.6)';
            for (let i = 0; i < 7; i++) { const q = (S2.t * 0.8 + i * 13) % 30; ctx.fillRect(X - 15 + Math.round((q * 7 + i * 5) % 31), Y - 24 + Math.round((q * 3 + i * 7) % 25), 1, 1); }
            ctx.globalAlpha = 1;
          },
        },
        { fade: 0, t: 40 },
        { third: 'DECKER: CLASSIFIED', sub: 'PREMIERES JULY 17, 2014, DURING ON CINEMA SEASON 5', t: 190, and: true },   // lore: Decker S1, July 17 - Aug 14, 2014
        { move: 'decker', x: x + 252, t: 60, ease: 'out', and: true },
        { wait: 66 },
        { set: 'phone', alpha: 1 }, { sfx: 'switch' }, { flash: '#9cff70', t: 5 },
        { move: 'dot', y, t: 22, hop: 7, face: false, and: true },
        { wait: 20 },
        { third: 'SEASON 5, EPISODE 6', sub: "TIM CUTS GREGG'S GREEN-SCREEN FOOTAGE INTO DECKER WITHOUT ASKING", t: 100, wait: true },   // lore, S5 story beats
        { say: 'gregg', clip: 'B72' },                                // S5 "Teenage Mutant Ninja Turtles and Into the Storm": the Decker-footage feud
        { wait: 6 },
        { say: 'tim', clip: 'B8', text: 'Greg Turkington has no opinion on Teenage Mutant Ninja Turtles. Five bags of popcorn. Good day.' },   // same episode: Tim ends it ("Good day."; clips.js cuts the caption short, so the text is given)
        { set: 'phone', alpha: 0 }, { sfx: 'buzz' }, { flash: '#9cff70', t: 6 }, { shake: 3 },   // the feed cuts
        { move: 'decker', x: x + 420, t: 70, ease: 'in', and: true },
        { wait: 30 },
      ];
    },
  });

  // 3-boss, the entrance: Port of Call: Hawaii ends with Decker's parade, then Abdul (killed in Classified) reveals he is alive.
  // Confetti in the Oval Office, the camera crosses the green-screen room, and he is simply there.
  C.scene('3-boss', 'boss_in', {
    hidePlayer: true,
    cols: { abdul: '#e8685a' },
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h, ab = S.boss();
      return [
        { fn: () => S.hide(ab) },
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y, shadow: 10 },
        { third: 'PORT OF CALL: HAWAII', sub: "DECKER'S SEASON 2 FINALE. THE PARADE, THEN ABDUL IS ALIVE", t: 170, and: true },   // lore: Port of Call: Hawaii, plot item 14
        { fn: () => { S.conf = 1; S.conf0 = S.t; } },
        { wait: 20 },
        { cam: 'boss', t: 100 },
        { wait: 6 },
        { flash: '#ffffff', t: 8 }, { sfx: 'slam' }, { shake: 7 },
        { fn: () => { S.show(ab); if (ab) { DD.dust(ab.x + ab.w / 2, ab.y + ab.h, 14, 2.4, '#e8d0a0'); DD.stars(ab.x + ab.w / 2, ab.y + 12, 8, '#ffe680'); } } },
        { wait: 24 },
        { say: 'abdul', clip: 'E37' },                              // Port of Call: Hawaii ep 20: "You forgot to do one thing, my friend. Kill me, properly."
        { cam: 'player', t: 60, and: true },
        { move: 'dot', y, t: 26, hop: 9, face: false, and: true },
        { card: 'boss', from: 'PORT OF CALL: HAWAII', sub: 'HE IS ALIVE', t: 105 },
      ];
    },
    draw: (ctx, G, S) => {   // the parade, kept in the Oval Office: red, white and blue confetti falling over the whole shot
      if (!S.conf) return;
      const n = Math.min(54, Math.floor((S.t - S.conf0) / 2));
      for (let i = 0; i < n; i++) {
        const x = (i * 53 + Math.sin(S.t / 30 + i) * 9 + 400) % 330 - 5, y = ((S.t * (0.7 + (i % 4) * 0.25) + i * 41) % 200) - 14;
        ctx.fillStyle = ['#d83030', '#f4f4f8', '#3050c0'][i % 3]; ctx.fillRect(Math.round(x), Math.round(y), (i & 1) ? 3 : 2, (i & 1) ? 2 : 3);
      }
    },
    fin: (G, S) => { S.conf = 0; },
  });

  // 3-boss, the knockout: how Decker vs. Dracula ended. In Gregg's reenacted finale (The Lost Works) Abdul double-crosses everyone and flees,
  // so the topple fades out; Gregg's answer to the whole feud is a $248 million Kickstarter, and the real tapes lost in Decker 2 lead to the VFA.
  C.scene('3-boss', 'boss_out', {
    live: true,
    beats: (S, G) => [
      { cam: 'boss', t: 40, ease: 'out', and: true },
      { wait: 70 },                                                 // he topples and the briefcase bursts, in view, before anything is said
      { third: 'THE LOST WORKS', sub: "DECKER VS DRACULA, GREGG'S CUT. ABDUL DOUBLE-CROSSES ALL AND FLEES", t: 130, wait: true },   // lore: Season 3 specials
      { actor: 'tbc', spr: 'w3_tbc', x: 512, y: 280, z: 3 },       // the show's own TO BE CONTINUED, over the green-screen wall
      { say: 'gregg', clip: 'E31' },                                // Decker vs. Dracula: The Lost Works: "The budget for this is $248 million."
      { third: 'A $248 MILLION KICKSTARTER', sub: "GREGG'S REAL TAPES WERE LOST IN DECKER 2. THE VFA IS NEXT", t: 130, wait: true },   // lore: Lost Works Kickstarter; VFA origin
    ],
  });
})();
