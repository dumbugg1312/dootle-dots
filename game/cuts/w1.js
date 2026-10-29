// World 1 cutscenes: DOT CITY (the cartoon, Dootle Dots Episode One: "Welcome to Dot City Spaghetti"). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-13-17-and-dootle-dots.md ("DOOTLE DOTS - full detail", Ep 1 beat by beat); clips and their episodes in design/soundbites/CATALOG.md
// (every DD clip is Dootle Dots Episode 1, youtube/24khiNuF9u0). Dootle Dots "Episode 2" is fan-made and is not used anywhere.
// What the stages already say: 1-1 start = DD1 (Sam's welcome); 1-2 start = DD2, "TRY HIS HOUSE" = DD4; 1-3 start = DD25; the results card plays the joining Dot's own
// intro (Cloud DD11, Mel DD17, Baxter DD8), so the join scenes set that line up and never pre-empt it.
(function () {
  const C = window.DDCut; if (!C) return;
  const TS = 16, FY = 21 * TS;                      // the road's top surface (world px) in 1-1, 1-2, 1-3 and 1-boss
  const INK = '#1c1424';

  // ---- shared bits ----
  const clampX = (S, x) => Math.max(0, Math.min(S.L.W * TS - 320, x));
  const dotA = (id, dot, x, y, o) => Object.assign({ actor: id, dot, x, y, pose: 'idle', shadow: dot === 'cloud' ? 14 : 12 }, o);
  const hop = (id, h, t, and) => ({ move: id, hop: h, t, and: !!and });

  // Mayor Ron Dot: the level's own 48x30 sheet (frame 0 worried, frame 1 glad); a.shake makes him tremble, a.glad switches the face
  function mayorDraw(ctx, X, Y, a) {
    if (!DD.ready('w1_mayor')) return;
    const im = DD.IMG.w1_mayor, tr = a.shake ? (((DD.G.frame >> 1) & 1) ? 1 : -1) : 0;
    ctx.save(); ctx.translate(Math.round(X + tr), Math.round(Y)); if (a.flip) ctx.scale(-1, 1);
    ctx.drawImage(im, a.glad ? 24 : 0, 0, 24, 30, -12, -30, 24, 30); ctx.restore();
  }
  // a citizen Dot out of the crowd (the level's own 64x24 face strips: idle, idle, cheer, talk)
  function citDraw(col) {
    return (ctx, X, Y, a) => {
      const n = 'w1_citf_' + col; if (!DD.ready(n)) return;
      ctx.drawImage(DD.IMG[n], (a.talk ? 3 : a.cheer ? 2 : (DD.G.frame >> 5) & 1) * 16, 0, 16, 24, Math.round(X - 8), Math.round(Y - 23), 16, 24);
    };
  }
  // little sleeping Zs over an actor that has zzz: true
  function zzz(ctx, G, S) {
    for (const a of S.actors) {
      if (!a.zzz || a.alpha <= 0) continue;
      const X = DD.wx(a.x), Y = DD.wy(a.y) + (a.hopY || 0);
      for (let i = 0; i < 2; i++) {
        const t = ((G.frame + i * 45) % 90) / 90;
        ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
        DD.text('Z', Math.round(X + 5 + t * 9 + i * 4), Math.round(Y - 26 - t * 14), '#ffffff', 1, '#3a4a8a');
      }
      ctx.globalAlpha = 1;
    }
  }
  // fans that stand idle in the shot step out of it (and come back at the end or on a skip)
  const clearFans = (S, x, r) => { S.hf = S.hf || []; for (const f of DD.fans) if (Math.abs(f.x - x) < r && f.state !== 'gone') { S.hf.push([f, f.state]); f.state = 'gone'; } };
  const backFans = S => { for (const [f, st] of S.hf || []) if (f.state === 'gone') f.state = st; };
  // the tape recorder for a scene that borrows a level's script state: put it back at the end or on a skip
  const keep = (S, o, keys) => { S.keep = keys.map(k => [o, k, o[k]]); };
  const restore = S => { for (const [o, k, v] of S.keep || []) o[k] = v; };

  // ================= 1-1 =================
  // The game's cold open. Episode One's ribbon-cutting at Dot City Spaghetti, the four Dots on the stage as the cartoon has them (Sam at the podium, Cloud asleep,
  // Baxter flat, Mel snickering), a Dot from the crowd asks where the Mayor is, and the player's Dot sets off across the whole town to find him. It ends on black,
  // where the title wipe's iris opens on the Dot at the road's west end, and then DD1 ("Hello, fellow Dots...") plays as the level's own start line.
  C.scene('1-1', 'open', {
    hidePlayer: true,
    names: { crowd: 'A DOT' }, cols: { crowd: '#8ad0ff' },
    beats: (S, G) => {
      const p = G.pl, me = p.dot, sx = p.x + p.w / 2, RUN = 'd_' + me, PX = 2690;   // PX: the plaza in front of the Spaghetti shop (tile 160-172)
      const POS = { sam: 2646, cloud: 2705, baxter: 2723, mel: 2741 };            // Sam at the podium, the others on the folding chairs
      clearFans(S, PX, 250);   // no fan lurches across the stage
      for (const b of DD.bodies) if (b.kind === 'pickle' && Math.abs(b.x - PX) < 250) S.hide(b);
      const dots = ['sam', 'cloud', 'baxter', 'mel'].map(d => dotA('d_' + d, d, POS[d], FY, { flip: d === 'mel', zzz: d === 'cloud', pose: d === 'cloud' ? 'blink' : 'idle' }));
      return [
        { cam: [PX, FY], ease: 'cut' },
        ...dots,
        { actor: 'asker', x: 2600, y: FY + 4, draw: citDraw('blue'), shadow: 12 },
        { fade: 0, t: 45 },
        { third: 'DOOTLE DOTS', sub: 'EPISODE ONE: WELCOME TO DOT CITY SPAGHETTI', t: 150 },   // lore: the title card of Episode One
        { wait: 10 },
        hop('d_sam', 8, 20), hop('d_sam', 8, 20),                                  // Sam, eager at the podium
        { sfx: 'blip' }, hop('d_mel', 3, 8), { wait: 4 }, { sfx: 'blip' }, hop('d_mel', 3, 8), { wait: 4 }, { sfx: 'blip' }, hop('d_mel', 3, 8),   // Mel only snickers in Episode One
        { set: 'd_baxter', flip: true }, { wait: 26 }, { set: 'd_baxter', flip: false }, { wait: 30 },   // Baxter glances at the sleeper and back, unimpressed
        hop('asker', 5, 14), { set: 'asker', talk: true },
        { say: 'crowd', clip: 'DD2' },                                              // Episode One: a Dot at the ceremony, "Has anyone seen Mayor Ron?" (the 1-2 start line)
        { set: 'asker', talk: false },
        { set: 'd_sam', flip: true }, { set: 'd_baxter', flip: true }, { set: 'd_mel', flip: false }, { wait: 22 },     // everyone looks round for the Mayor
        { set: 'd_sam', flip: false }, { set: 'd_baxter', flip: false }, { set: 'd_mel', flip: true }, { wait: 22 },
        { fn: () => { DD.float(POS.sam, FY - 34, '!', '#ffe680'); DD.SFX.blip && DD.SFX.blip(); } },
        { move: RUN, x: POS[me] - 70, hop: 10, t: 24 },                             // whoever you are, you jump down and go to find him
        { fn: () => { DD.G.s.cheer = 600; DD.SFX.skid && DD.SFX.skid(); } },        // the crowd cheers you off
        { run: (G2, S2, t) => { const a = S2.actor(RUN); G2.cam.x = clampX(S2, a.x - 160 - 36); if (t % 4 === 0) DD.dust(a.x + 7, FY, 2, 3, '#e4e6f2'); return t >= 200; }, and: true },   // the camera chases you the length of Dot City
        { move: RUN, x: sx, y: FY, t: 200, ease: 'linear' },
        { set: RUN, flip: false, pose: 'idle' }, { fn: () => DD.dust(sx, FY, 6, 3, '#e4e6f2') },
        { wait: 24 },
      ];
    },
    draw: (ctx, G, S) => zzz(ctx, G, S),
    fin: (G, S) => { backFans(S); G.s.cheer = 0; },
  });

  // Cloud joins. Episode One: Cloud sleeps through the speeches and asks what a fishmonger is. He drifts down onto the Mayor's porch, still asleep.
  // The results card then plays his own "Hello, my name is Cloud." (DD11), so here he only gets to say "Oh, whoopsies" (DD12).
  C.scene('1-1', 'goal', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, me = p.dot, X = p.x + p.w / 2, LX = 3630, TOP = 18 * TS, cam = (LX + X) / 2;   // the porch step is tiles 226-229, its top at tile row 18
      clearFans(S, cam, 200);
      return [
        { cam: [cam, FY], t: 36 },
        me === 'cloud' ? null : dotA('d_' + me, me, X, FY, { flip: true }),
        dotA('cloud', 'cloud', LX, TOP - 190, { pose: 'fall', zzz: true, bob: 2 }),
        { third: 'CLOUD', sub: 'SLEEPS THROUGH THE SPEECH. ASKS WHAT A FISHMONGER IS.', t: 165 },   // lore: Cloud's row in the character table
        { move: 'cloud', y: TOP, t: 150, ease: 'out', walk: false },
        { fn: () => { DD.dust(LX, TOP, 8, 3, '#ffffff'); DD.SFX.land && DD.SFX.land(2); } },
        { set: 'cloud', pose: 'land' },
        me === 'cloud' ? null : { move: 'd_' + me, hop: 9, t: 18, and: true },
        { say: 'cloud', clip: 'DD12' },                                             // Episode One: "Oh, whoopsies"
        { set: 'cloud', pose: 'blink' }, { wait: 70 },                             // and he is asleep again
      ];
    },
    draw: (ctx, G, S) => zzz(ctx, G, S),
    fin: (G, S) => backFans(S),
  });

  // ================= 1-2 =================
  // Mel joins. In Episode One Mel only snickers (lore), so he gets no words at all: he skids in, the Dot jumps, and he snickers.
  // His own entrance line on the results card is the theme's roll call, "Mel" (DD17).
  C.scene('1-2', 'goal', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, me = p.dot, X = p.x + p.w / 2;
      clearFans(S, X + 30, 220);
      return [
        { cam: [X + 30, FY], t: 30 },
        me === 'mel' ? null : dotA('d_' + me, me, X, FY, { flip: false }),
        dotA('mel', 'mel', X + 230, FY, { flip: true }),
        { third: 'MEL', sub: 'ONLY SNICKERS IN EPISODE ONE', t: 150 },            // lore: Mel's row in the character table
        { wait: 40 },
        { move: 'mel', x: X + 40, t: 40, ease: 'out' },
        { set: 'mel', pose: 'skid', flip: true }, { fn: () => { DD.dust(X + 48, FY, 8, 4, '#e4e6f2'); DD.SFX.skid && DD.SFX.skid(); } },
        me === 'mel' ? null : { move: 'd_' + me, hop: 9, t: 16, and: true },
        { wait: 18 },
        { set: 'mel', pose: 'blink', flip: false },
        { sfx: 'blip' }, hop('mel', 3, 8), { wait: 3 }, { sfx: 'blip' }, hop('mel', 3, 8), { wait: 3 }, { sfx: 'blip' }, hop('mel', 3, 8),   // the snicker
        { wait: 50 },
      ];
    },
    fin: (G, S) => backFans(S),
  });

  // ================= 1-3 =================
  // Baxter joins, and with him the roll call is whole. The stage's clock has been calling Sam, Mel, Cloud and Baxter all level; here the theme finally plays out
  // in order (DD16-DD19), each Dot hopping into its light (the level's own spotlights and call board follow), Baxter coming down last with a slam, and then
  // "Introducing the Dootle Dots" (DD25). The results card then gives Baxter his own line (DD8, the short speech).
  C.scene('1-3', 'goal', {
    hidePlayer: true,
    beats: (S, G) => {
      const p = G.pl, me = p.dot, X = p.x + p.w / 2, s = G.s, SLOT = { sam: -54, mel: -18, cloud: 18, baxter: 54 };
      keep(S, s, ['call', 'hold', 'callT', 'callAge']);
      clearFans(S, X, 230);
      const call = i => ({ fn: () => { s.hold = false; s.call = i; s.callT = 0; s.callAge = 0; } });
      const enter = d => ({ move: 'd_' + d, x: X + SLOT[d], t: 50, ease: 'out' });
      const start = d => d === 'baxter' ? dotA('d_baxter', 'baxter', X + SLOT.baxter, FY - 190, { pose: 'fall' })
        : d === me ? dotA('d_' + d, d, X, FY) : dotA('d_' + d, d, X + (SLOT[d] < 0 ? -230 : 230), FY, { flip: SLOT[d] > 0 });
      const all = (h, t) => ['sam', 'mel', 'cloud', 'baxter'].map((d, i) => hop('d_' + d, h, t, i < 3));
      return [
        { fn: () => { s.hold = false; s.call = 3; } },
        { cam: [X, FY], t: 24 },
        ...['sam', 'mel', 'cloud', 'baxter'].map(start),
        { third: 'INTRODUCING THE DOOTLE DOTS', sub: "THE THEME'S ROLL CALL, EPISODE ONE: SAM. MEL. CLOUD. BAXTER.", t: 230 },   // lore: Ep 1 beat 1, the theme
        { ...enter('sam'), and: true }, { ...enter('mel'), and: true }, enter('cloud'),
        { wait: 6 },
        call(0), { clip: 'DD16' }, hop('d_sam', 10, 40),                            // Episode One theme: "Sam"
        call(1), { clip: 'DD17' }, hop('d_mel', 10, 46),                            // "Mel"
        call(2), { clip: 'DD18' }, hop('d_cloud', 8, 64),                           // "Cloud"
        call(3), { clip: 'DD19' }, { move: 'd_baxter', y: FY, t: 34, ease: 'in' },  // "Baxter", who drops in from the rafters
        { fn: () => { DD.dust(X + SLOT.baxter, FY, 14, 6, '#e4e6f2'); DD.SFX.slam && DD.SFX.slam(); G.shake = Math.max(G.shake, 6); } },
        { set: 'd_baxter', pose: 'land' }, { wait: 6 }, { set: 'd_baxter', pose: 'idle' }, { wait: 50 },
        { clip: 'DD25' },                                                           // Episode One theme: "Introducing the Dootle Dots"
        ...all(12, 34), { fn: () => { DD.stars(X, FY - 24, 10, '#ffe680'); } },
        { wait: 6 }, ...all(16, 34), { flash: '#ffffff', t: 10 }, { fn: () => { DD.stars(X, FY - 26, 14, '#ffe680'); DD.SFX.goal && DD.SFX.goal(); } },
        { wait: 70 },
      ];
    },
    fin: (G, S) => { restore(S); backFans(S); },
  });

  // ================= 1-boss =================
  // The entrance. Mayor Ron is afraid of scissors (Episode One), and the ribbon is waiting. The scissors are standing shut in the road, he trembles, and then they
  // open. He gets Episode One's "Scissors! I said it." (DD21); the walk-in line ("I can't hold those pointy nightmares") has already played from the level's script.
  C.scene('1-boss', 'boss_in', {
    sprites: ['w1_mayor'],   // the arena's sprite list does not carry him; the sheet is the same one 1-1 and 1-2 use
    cols: { mayor: '#ff7a6a' },
    beats: (S, G) => {
      const B = S.boss(), bx = B ? B.x + B.w / 2 : 884;
      S.hide(B);
      return [
        { actor: 'pn', spr: 'w1_scissors_shut', x: bx, y: FY + 3, z: 1 },
        { actor: 'mayor', draw: mayorDraw, x: 786, y: FY, shake: true, shadow: 16 },
        { cam: [790, FY], t: 80 },
        { third: 'MAYOR RON IS AFRAID OF SCISSORS', sub: 'NOT OF PUBLIC SPEAKING. EPISODE ONE: WELCOME TO DOT CITY SPAGHETTI', t: 130 },   // lore: Ep 1 beat 9
        { wait: 100 },
        { set: 'pn', spr: 'w1_scissors_idle' }, { sfx: 'buzz' }, { shake: 3 }, { wait: 26 },
        { set: 'pn', spr: 'w1_scissors_attack' }, { sfx: 'buzz' }, { shake: 5 }, { fn: () => DD.stars(bx, FY - 40, 10, '#ffffff') },
        { move: 'mayor', x: 760, hop: 9, t: 16, face: false, and: true }, { fn: () => { DD.SFX.boing && DD.SFX.boing(); } },
        { say: 'mayor', clip: 'DD21' },                                            // Episode One: "Scissors! I said it."
        { move: 'mayor', x: 560, t: 70, ease: 'in', walk: true, and: true },
        { move: 'pn', y: FY + 3, hop: 6, t: 26 },
        { cam: 'player', t: 70, and: true },
        { card: 'boss', from: 'EPISODE ONE' },
      ];
    },
  });

  // The knockout, and how Episode One ended. Sam's plan is teamwork: everyone holds the scissors together (lore, beat 10), they carry them to the ribbon, snip, and the
  // crowd has spaghetti. The Mayor says the Episode One line "Teamwork, huh? It really works." (DD23), Sam says its last line (DD6), and the end card of Episode One
  // (black, "IN LOVING MEMORY OF G. AMATO") comes up before the results and the rewind into On Cinema.
  C.scene('1-boss', 'boss_out', {
    live: true, hidePlayer: true, cols: { mayor: '#ff7a6a' },   // (w1_mayor is loaded through boss_in's sprite list)
    beats: (S, G) => {
      const B = S.boss(), p = G.pl, me = p.dot, MX = 45.5 * TS, bx = B ? B.x + B.w / 2 : 884, X = p.x + p.w / 2;
      const SLOT = [['mel', -40], ['sam', -20], ['mayor', 0], ['cloud', 20], ['baxter', 40]];   // who holds which ring
      const ids = SLOT.map(([w]) => w === 'mayor' ? 'mayor' : 'd_' + w);
      G.s.cutT = 0;   // the level started cutting its ribbon at the knockout: hold it until they cut it
      const act = ([w, off], i) => w === 'mayor' ? { actor: 'mayor', draw: mayorDraw, x: bx - 190, y: FY, glad: true, shadow: 16, z: 1 }
        : dotA('d_' + w, w, w === me ? X : (i % 2 ? bx + 220 : bx - 220), FY, { z: 1 });
      return [
        { cam: [bx - 10, FY], t: 50 },
        { wait: 16 },
        ...SLOT.map(act),
        { third: "SAM'S PLAN: TEAMWORK", sub: 'EVERYONE HOLDS THE SCISSORS TOGETHER. DOOTLE DOTS EPISODE ONE', t: 170 },   // lore: Ep 1 beat 10
        ...SLOT.map(([w, off], i) => ({ move: ids[i], x: bx + off, t: 50, ease: 'out', and: i < SLOT.length - 1 })),
        { fn: () => { S.hide(B); B.keepHidden = true; DD.SFX.switch && DD.SFX.switch(); } },
        { actor: 'sc', spr: 'w1_scissors_idle', x: bx, y: FY - 4, z: 0, shadow: 0 },
        ...SLOT.map(([w], i) => hop(ids[i], 5, 14, true)), { wait: 6 },
        { cam: [MX + 8, FY], t: 84, ease: 'inout', and: true },
        ...ids.map((id, i) => ({ move: id, x: MX + SLOT[i][1], t: 84, ease: 'inout', and: true })),   // carried together to the ribbon (all of them bob along)
        { move: 'sc', x: MX, t: 84, ease: 'inout' },
        { wait: 4 },
        { set: 'sc', spr: 'w1_scissors_shut' }, { sfx: 'buzz' }, { shake: 4 }, { fn: () => { G.s.cutT = 1; DD.stars(MX, FY - 36, 8, '#ffffff'); } },   // snip: the level's own ribbon falls from here
        { wait: 40 },
        { say: 'mayor', clip: 'DD23' },                                            // Episode One: "Teamwork, huh? It really works."
        { fn: () => { G.s.cheer = 99999; } },
        { say: 'sam', clip: 'DD6' },                                               // Episode One, its last line: "Fire up those pots and pans. It's spaghetti time!"
        { card: 'title', title: 'IN LOVING MEMORY OF G. AMATO', sub: 'DOOTLE DOTS EPISODE ONE', t: 150 },   // lore: the final card of Episode One
      ];
    },
    fin: (G, S) => {   // on a skip: the ribbon is cut, and the scissors lie under it
      if (!G.s.cutT) G.s.cutT = 1;
      const B = S.boss(); if (B) { B.x = 45.5 * TS - B.w / 2; B.cutHide = false; B.keepHidden = false; }
    },
  });
})();
