// World 5 cutscenes: SIX BAGS (Season 9). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-09-12.md (Season 9 section, the Electric Sun section); clips and their episodes in design/soundbites/CATALOG.md.
// This world is a black screening room with motorised leather recliners, so the scenes are built from what moves in it: a waiter, a
// recliner that glides, and the lights going down. The tragedy at the end of Season 9 stays out (design/WORLDS.md): the knockout
// says only what the lore says plainly, that the festival ended in disaster and Tim was jailed.
(function () {
  const C = window.DDCut; if (!C) return;
  const FY = 21 * 16;   // the floor line (px)

  // 5-1 opens: Season 9's house rule. Mark the waiter hands a drink to Gregg instead of putting it on the table, and Tim says the
  // catchphrase of the season. Then Gregg tries the truffle-oil popcorn that is the only popcorn on the menu.
  C.scene('5-1', 'open', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h;
      return [
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y, shadow: 10 },
        { actor: 'mark', frames: ['w5_mark', 'w5_mark_b'], fps: 6, x: 390, y, flip: true, z: 2, shadow: 18 },
        {   // the drink, once it is on the table: a mug at the right of the little table the hosts share (the popcorn is on the left)
          actor: 'mug', x: 108, y: FY, z: 1, alpha: 0,
          draw: (ctx, X, Y, a) => {
            if (!(a.alpha > 0)) return;
            const mx = X + 3, my = Y - 17;
            ctx.fillStyle = '#2a1a0c'; ctx.fillRect(mx - 1, my - 1, 6, 7); ctx.fillStyle = '#e8a828'; ctx.fillRect(mx, my + 1, 4, 4); ctx.fillStyle = '#fff4d0'; ctx.fillRect(mx, my, 4, 1); ctx.fillStyle = '#ffd868'; ctx.fillRect(mx, my + 1, 1, 3);
          },
        },
        { fade: 0, t: 40 },
        { third: 'SIX BAG CINEMAS', sub: 'SEASON 9. MARCH 2017. A MOVIE THEATER WITH FINE DINING', t: 160, and: true },   // lore: Season 9, Mar-May 2017; "cinema with fine dining"
        { move: 'mark', x: 176, t: 110, ease: 'out' },
        { move: 'mark', y: FY, t: 14, hop: 3, face: false },        // he offers the drink to Gregg's hand
        { wait: 16 },
        { say: 'tim', clip: 'C79' },                                 // S9 "T2 Trainspotting and The Belko Experiment": "Put it on the table."
        { move: 'dot', y, t: 22, hop: 7, face: false, and: true },
        { move: 'mark', x: 108, t: 40 },                             // over to the table (he stands in front of it)
        { set: 'mug', alpha: 1 }, { sfx: 'bag' },
        { wait: 14 },
        { move: 'mark', x: 176, t: 34 },                             // and back out of the way: the mug is on the table
        { wait: 8 },
        { say: 'gregg', clip: 'C18' },                                // S9 "Kong: Skull Island and The Wall": the truffle-oil popcorn "tastes like a mouthful of dirt"
        { wait: 10 },
      ];
    },
  });

  // 5-boss, the entrance: Season 9, episode 4. Tim "channels Darth Vader" as his motorised recliner glides forward to show his face,
  // which is still burned. A blackout, the whine of the motor, a stop, and the lights come up on him saying the season's first words.
  C.scene('5-boss', 'boss_in', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h, bs = S.boss(), bx = bs ? bs.x + bs.w / 2 : 820;
      return [
        { fn: () => S.hide(bs) },
        { cam: 'boss', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y, shadow: 10 },
        { actor: 'tim', spr: 'w5_timboss', x: bx + 220, y: FY, z: 1 },   // starts off the right edge
        { fade: 0.78, t: 1 },
        { third: 'SEASON 9', sub: 'TIM CHANNELS DARTH VADER AS HIS RECLINER MOTORS FORWARD', t: 130, and: true },   // lore: S9 reference bank 9 (the recliner motors forward, Tim's face still burned)
        { fn: () => { try { DD.tone(70, 54, 1.5, 'sawtooth', 0.035); DD.tone(140, 108, 1.4, 'square', 0.012); } catch (e) {} } },   // the motor
        { wait: 14 },
        { move: 'tim', x: bx, t: 110, ease: 'out' },
        { shake: 3 }, { sfx: 'thud' },
        { fade: 0, t: 30 },
        { wait: 8 },
        { say: 'tim', clip: 'C4' },                                  // S9 "CHiPs and Power Rangers": "Welcome back to Six Bag Cinemas, live from Six Bag Cinemas."
        { cam: 'player', t: 60, and: true },
        { move: 'dot', y, t: 24, hop: 8, face: false, and: true },
        { card: 'boss', from: 'SEASON NINE', sub: 'PUT IT ON THE TABLE', t: 105 },
      ];
    },
  });

  // 5-boss, the knockout: how Season 9 ended. The Electric Sun festival ends in disaster and Tim goes to jail (lore, Season 9 storyline),
  // Gregg and Mark host alone (E7, E8). Tim comes back (E10): Gregg gives his rating, the lights dim, and Tim leans over him.
  // Then the courtroom: Season 9's next stop is the trial.
  C.scene('5-boss', 'boss_out', {
    live: true,
    beats: (S, G) => {
      const bs = S.boss(), bx = bs ? bs.x + bs.w / 2 : 820;
      DD.loadSprites(['w5_gregg_seat', 'w5_mark', 'w5_recliner_bg']);   // not in this stage's own list: asked for now, used a few seconds on
      return [
        { wait: 40 },
        { cam: 'boss', t: 50, ease: 'out', and: true },
        { third: 'ELECTRIC SUN DESERT MUSIC FESTIVAL', sub: 'IT ENDS IN DISASTER. TIM GOES TO JAIL. GREGG AND MARK HOST ALONE', t: 150, and: true },   // lore: Season 9 storyline, E7-E8
        { wait: 60 },
        { fn: () => { if (bs) { DD.burst && DD.burst(bx, bs.y + 14, 10); DD.dust(bx, bs.y + bs.h - 6, 16, 2, '#c8c4d8'); S.hide(bs); bs.keepHidden = true; } } },   // Tim is gone: an empty recliner
        { actor: 'chair', spr: 'w5_recliner_bg', x: bx, y: FY, z: 1 },
        { actor: 'gregg', spr: 'w5_gregg_seat', x: bx - 56, y: FY, z: 2, alpha: 0 },
        { actor: 'mark', frames: ['w5_mark'], x: bx + 60, y: FY, z: 2, flip: true, alpha: 0 },
        { set: 'gregg', alpha: 1 }, { set: 'mark', alpha: 1 }, { sfx: 'switch' },
        { wait: 90 },
        { fade: 0.55, t: 50, col: '#0a0410', and: true },               // the lights dim
        { actor: 'tim', spr: 'w5_timboss', x: bx, y: FY, z: 3, alpha: 0 },
        { fn: () => { try { DD.tone(70, 54, 1.3, 'sawtooth', 0.03); } catch (e) {} } },
        { set: 'tim', alpha: 1 }, { set: 'chair', alpha: 0 }, { sfx: 'thud' },   // E10: he is back in the dark, in the same recliner
        { move: 'tim', x: bx - 26, t: 70, ease: 'out' },
        { set: 'tim', rot: -0.2 },                                    // he leans over Gregg
        { say: 'gregg', clip: 'C25' },                                // S9 "King Arthur: Legend of the Sword and Snatched" (E10): "So I will give this four bags of popcorn."
        { wait: 20 },
        { fade: 1, t: 40, col: '#000', and: true },
        { third: 'NOVEMBER 2017', sub: 'THE PEOPLE OF THE STATE OF CALIFORNIA VS. TIMOTHY RICHARD HEIDECKER', t: 150, wait: true },   // lore: the Trial, Nov 15-28, 2017; the official title
      ];
    },
    fin: (G, S) => { const b = S.boss(); if (b) { b.cutHide = true; b.keepHidden = true; } },
  });
})();
