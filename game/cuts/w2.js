// World 2 cutscenes: THE RED SEATS (Seasons 1-4). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-01-04.md; clips and their episodes in design/soundbites/CATALOG.md.
(function () {
  const C = window.DDCut; if (!C) return;
  const F = 20 * 16;   // 2-boss floor (px)

  // 2-1 opens: the tape from the rewind lands in Season One. The Dot drops into the red seats on Tim's scream from the S1 intro.
  C.scene('2-1', 'open', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, x = p.x + p.w / 2, y = p.y + p.h;
      return [
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x, y: G.cam.y - 30, pose: 'fall', shadow: 10 },
        { fade: 0, t: 40 },
        { third: 'SEASON ONE', sub: 'NOVEMBER 2012. ON CINEMA AT THE CINEMA', t: 230, and: true },
        { wait: 30 },
        { clip: 'F8', and: true },                                  // S1 intro: "Should I see a movie this weekend?" (F8: X4 was the same take, dropped in the ear pass's dedupe)
        { wait: 58 },
        { move: 'dot', y, t: 34, ease: 'in' },                      // the drop lands as the line ends
        { fn: () => { DD.dust(x, y, 10); DD.SFX.land(3); } },
        { shake: 4 },
        { set: 'dot', pose: 'land' }, { wait: 8 }, { set: 'dot', pose: 'idle' },
        { wait: 30 },
        { say: 'gregg', clip: 'A93' },                              // S1: Gregg, the occasional guest, thanks the cards and letters
        { wait: 10 },
      ];
    },
  });

  // 2-boss, the entrance: S4E4 is retitled "On Alternative Medicine On Cinema". Dr. San raises a needle; Tim, in the three-shot, flinches.
  C.scene('2-boss', 'boss_in', {
    beats: (S, G) => {
      const san = S.boss();
      return [
        { cam: 'boss', dx: -40, t: 70 },
        { third: 'ON ALTERNATIVE MEDICINE ON CINEMA', sub: 'SEASON 4, EPISODE 4', t: 150, and: true },
        { wait: 40 },
        { fn: () => { if (san) { san.st = 'windup'; san.aims = []; } DD.SFX.switch && DD.SFX.switch(); } },
        { wait: 16 },
        { fn: () => { if (san) DD.stars(san.x + (san.flip ? 2 : 26), san.y + 2, 6, '#f4f4ff'); } },   // the glint on the needle
        { wait: 30 },
        { say: 'san', text: 'LIVER FIRE.', hold: 70 },             // S4E3: his diagnosis of Tim
        { fn: () => { G.s.react.tim = 200; } },
        { say: 'tim', clip: 'A146' },                               // S4 "On Alternative Medicine": "...like a voodoo doll"
        { fn: () => { if (san) { san.st = 'rest'; san.t = 0; } } },
        { card: 'boss', from: 'SEASON FOUR' },
      ];
    },
    fin: (G, S) => { const san = S.boss(); if (san && san.st === 'windup') { san.st = 'rest'; san.t = 0; } },
  });

  // 2-boss, the knockout: S4E5. Tim's face has a stage three infection from the dirty needles, and Dr. San vanishes.
  C.scene('2-boss', 'boss_out', {
    live: true,
    beats: (S, G) => {
      const san = S.boss();
      return [
        { wait: 50 },
        { cam: 'boss', dx: 20, t: 50 },
        { say: 'tim', clip: 'A147' },                               // S4 "The Lego Movie and RoboCop": "...a stage three infection on my face"
        { wait: 20 },
        { fn: () => { if (!san) return; const x = san.x + san.w / 2, y = san.y + san.h; DD.dust(x, y - 10, 24, 2.4, '#e8e0d0'); DD.stars(x, y - 24, 10, '#ffe680'); DD.SFX.slam(); S.hide(san); san.keepHidden = true; } },
        { wait: 40 },
        { say: 'gregg', text: "I'LL THROW IN SOME DIRTY ACUPUNCTURE NEEDLES." },   // S4E4, Gregg's rating extra
        { third: 'DR. SAN VANISHED', sub: 'TIM LEFT FOR TREATMENT. SEASON 4, EPISODE 5', t: 150, wait: true },
      ];
    },
    fin: (G, S) => { const san = S.boss(); if (san) { san.cutHide = true; san.keepHidden = true; } },
  });
})();
