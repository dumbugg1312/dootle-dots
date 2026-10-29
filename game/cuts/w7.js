// World 7 cutscenes: OCX (Season 10, March to May 2018). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-09-12.md sections 5 and 6 (OCX set, Rio-Jenesis, Gregg taking over, the E10 rage and the DA run); clips and episodes in design/soundbites/CATALOG.md.
// The shape here is the germ-free black box: a product gag, a host who is no longer the host, and a set that gets trashed.
(function () {
  const C = window.DDCut; if (!C) return;
  const F = 21 * 16;   // the stage floor (px), the same in 7-1 and 7-boss

  // the Rio-Jenesis "germ shield": a pale cyan dome round the tub, drawn in the set's light blue
  const dome = (ctx, X, Y, a, S) => {
    ctx.save(); ctx.globalAlpha *= a.alpha * (0.3 + 0.08 * Math.sin(S.t / 6) + (a.hit > 0 ? 0.3 : 0));
    ctx.fillStyle = '#3fd6ff'; ctx.beginPath(); ctx.arc(Math.round(X), Math.round(Y - 8), 34, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.globalAlpha = Math.min(1, a.alpha * 0.8); ctx.fillStyle = '#bfe8ff'; ctx.fillRect(Math.round(X - 34), Math.round(Y - 9), 68, 1); ctx.restore();
    if (a.hit > 0) a.hit--;
  };

  // 7-1 opens: Season 10 starts with Rio-Jenesis. The tub of Germ Shield-X stands on the stage and a germ walks up to it; Tim's pitch is "virtually germ free".
  C.scene('7-1', 'open', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, px = p.x + p.w / 2, fy = p.y + p.h, tx = px + 150;   // the product stand, a little way from the Dot
      const hopIn = (x0, x1, dur) => (g, S2, t) => { const a = S2.actor('germ'); if (!a) return true; const k = Math.min(1, t / dur); a.x = x0 + (x1 - x0) * k; a.hopY = -Math.abs(Math.sin(t / 7)) * 9; if (t >= dur) a.hopY = 0; return t >= dur; };
      return [
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x: px, y: fy, shadow: 10 },
        { actor: 'tub', spr: 'w7_tub', x: tx, y: fy, shadow: 22, z: 1 },
        { actor: 'jar', spr: 'w7_rio', x: tx + 26, y: fy, shadow: 14, z: 1 },
        { actor: 'dome', draw: dome, alpha: 0, x: tx + 10, y: fy, z: 3, hit: 0 },
        { actor: 'germ', frames: ['w7_germ', 'w7_germ2'], fps: 5, x: 360, y: fy, flip: true, shadow: 16, z: 2 },
        { fade: 0, t: 40 },
        { third: 'SEASON 10: OCX', sub: 'MARCH 2018. SPONSORED BY RIO-JENESIS', t: 230, and: true },   // lore s.5: Mar to May 2018; the Rio-Jenesis sponsorship starts in E1
        { wait: 30 },
        { sfx: 'switch' }, { set: 'dome', alpha: 1 }, { flash: '#7fdcff', t: 6 },               // the shield lights up
        { run: hopIn(360, tx + 62, 120), and: true },                                           // a germ hops across the black box
        { say: 'tim', clip: 'C100' },                                                           // S10E1 (Pacific Rim Uprising / Sherlock Gnomes): "You are virtually germ free."
        { fn: () => { DD.stars(tx + 50, fy - 18, 8, '#bfe8ff'); DD.SFX.pop && DD.SFX.pop(); } },
        { set: 'dome', hit: 14 }, { gone: 'germ' }, { shake: 3 },                               // it hits the shield and pops
        { move: 'dot', x: px, y: fy, t: 20, hop: 12 },
        { wait: 50 },
      ];
    },
  });

  // 7-boss, the entrance: Season 10's last episodes. Delgado Media has made Gregg the host and left Tim as the announcer. Gregg opens his show; Tim, in the VR headset, takes it badly.
  C.scene('7-boss', 'boss_in', {
    beats: (S, G) => {
      const T = S.boss(), st = T ? T.x + T.w / 2 : 816;
      return [
        { actor: 'gregg', spr: 'w7_gregg_seat', x: st - 150, y: F, alpha: 0, shadow: 22 },
        { cam: 'boss', dx: -75, t: 70 },
        { third: 'GREGG HOSTS. TIM IS THE ANNOUNCER', sub: "SEASON 10, EPISODES 9 AND 10. DELGADO MEDIA'S DEAL", t: 200, and: true },   // lore s.5: Gregg becomes host and Tim "your announcer" (E9, E10)
        { wait: 30 },
        { flash: '#bfe8ff', t: 8 }, { sfx: 'switch' }, { set: 'gregg', alpha: 1 },              // the lights come up on his chair
        { wait: 20 },
        { say: 'gregg', clip: 'C11' },                                                          // S10E9 (Deadpool 2 / Show Dogs): "Hey guys, good to be here on my show..."
        { wait: 10 },
        { sfx: 'wind' },
        { run: (g, S2, t) => { if (T) { T.st = 'wind'; T.atk = 'toss'; T.t = t; } return t >= 66; } },   // Tim winds up behind the headset (the toss telegraph the fight uses)
        { fn: () => { if (T) { T.st = 'walk'; T.t = 0; } } },
        { card: 'boss', from: 'SEASON 10 FINALE' },
      ];
    },
    fin: (G, S) => { const T = S.boss(); if (T && T.st === 'wind') { T.st = 'walk'; T.t = 0; } },
  });

  // 7-boss, the knockout: S10E10. Tim snaps, trashes the set and announces he is running for district attorney; Gregg carries on with the show.
  // live: the stage keeps running, so Tim's reeling fall and the popcorn happen on their own. keepEnd: the level's own FOR DA banner then drops in over its defeat beat.
  C.scene('7-boss', 'boss_out', {
    live: true, keepEnd: true,
    beats: (S, G) => {
      const T = S.boss(), tx = T ? T.x + T.w / 2 : 600, gx = tx > 480 ? tx - 150 : tx + 150;
      return [
        { actor: 'gregg', spr: 'w7_gregg_seat', x: Math.max(130, Math.min(890, gx)), y: F, shadow: 22 },
        { wait: 60 },
        { cam: 'boss', dx: tx > 480 ? -55 : 55, t: 50 },
        { say: 'tim', clip: 'E4' },                                                             // Mister America (the film of this 2018 campaign), same line the level cues at the DA phase: "I'm running for San Bernardino district attorney."
        { wait: 24 },
        { say: 'gregg', clip: 'C85' },                                                         // S10 (Avengers: Infinity War, a Gregg-hosted open): "Hey guys, Greg Turkington with On Cinema at the Cinema."
        { wait: 10 },
        { third: 'TIM FOR DISTRICT ATTORNEY', sub: 'SEASON 10 FINALE. NEXT: SEASON 11, ON A $25,000 LOAN', t: 170, wait: true },   // lore s.5: E10 rage and the DA run; s.8: S11 buy-back loan
      ];
    },
  });
})();
