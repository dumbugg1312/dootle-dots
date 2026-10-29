// World 11 cutscenes: ESA TO THE MANOR (Season 16). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-13-17-and-dootle-dots.md (World 4: S16; Oscar 13 for the bridge). Season 16 aired Oct 1 - Dec 3, 2025.
// The typed lines are the show's own words from the S16 captions in refs/season-16/<episode>/captions.txt (episode and time on each line).
// Clips and their episodes: design/soundbites/CATALOG.md.
(function () {
  const C = window.DDCut; if (!C) return;
  const FL = 21 * 16;   // the floor of every World 11 stage (px)
  const SC = 1.25;      // the boss is drawn 25% bigger than his sprite (11-boss.js)
  // the level's fans are not bodies (S.hide cannot reach them): stand them down for the shot and put them back in fin
  const hideFans = (S, lo, hi) => { const fans = (DD.test && DD.test.fans && DD.test.fans()) || [], keep = []; for (const f of fans) if (f.x > lo && f.x < hi && f.state !== 'gone') { keep.push([f, f.state]); f.state = 'gone'; } S.fanBack = () => keep.forEach(([f, st]) => { f.state = st; }); };

  // 11-1 opens: the S16 premiere in Gregg's Extended Stay room. New holds up the Warp 10 bottle (two every morning) and his hair
  // goes within the week; Gregg's answer is to offer a hat. New picks the wig back up. (The stage's start lines come after.)
  C.scene('11-1', 'open', {
    hidePlayer: true,
    sprites: ['w11_new_a', 'w11_new_b', 'w11_new_bald', 'w11_new_bald_hurt', 'w11_gregg', 'w11_wig', 'w11_warpbottle', 'w11_pillcap'],
    fin: (G, S) => { if (S.fanBack) S.fanBack(); },
    beats: (S, G) => {
      const p = G.pl, X = 340;
      hideFans(S, 200, 520);
      for (const b of DD.bodies) if (/^(intern|warp)$/.test(b.kind) && b.x > 200 && b.x < 520) S.hide(b);   // the pill bottle and the intern in the shot
      return [
        { cam: [358, FL - 22], ease: 'cut' },
        { actor: 'new', spr: 'w11_new_a', x: X, y: FL, shadow: 22 },
        { actor: 'gm', spr: 'w11_gregg', x: X + 54, y: FL, shadow: 20 },
        { actor: 'dot', dot: p.dot, x: 230, y: FL, shadow: 10 },
        { fade: 0, t: 36 },
        { third: 'SEASON 16: ON CINEMA AT THE CINEMA AT THE ESA', sub: 'OCTOBER 1, 2025. THE HEI NETWORK ESA CAMPUS', t: 160, and: true },   // lore, World 4: S16 aired Oct 1 - Dec 3, 2025; the HEI Network ESA Campus (Gregg's room)
        { move: 'dot', x: 288, t: 80, and: true },
        { wait: 70 },
        { set: 'new', spr: 'w11_new_b' },
        { actor: 'bottle', spr: 'w11_warpbottle', x: X + 17, y: FL - 44, z: 3 },
        { say: 'new', clip: 'D51', and: true },                        // S16 premiere (season-16/the-strangers-chapter-2... 6:29): New, "That's Warp 10 internal de-aging system."
        { wait: 150 },
        { actor: 'pill1', spr: 'w11_pillcap', x: X + 17, y: FL - 52, z: 3 },   // "two of these every morning" (same episode, 6:33)
        { move: 'pill1', x: X - 2, y: FL - 44, t: 16, hop: 10, walk: false },
        { gone: 'pill1' }, { sfx: 'pop' },
        { actor: 'pill2', spr: 'w11_pillcap', x: X + 17, y: FL - 52, z: 3 },
        { move: 'pill2', x: X - 2, y: FL - 44, t: 16, hop: 10, walk: false },
        { gone: 'pill2' }, { sfx: 'pop' },
        { gone: 'bottle' },
        { set: 'new', spr: 'w11_new_a' },
        { wait: 24 },
        { flash: '#ffffff', t: 10 }, { sfx: 'wind' },                    // a week goes by
        { set: 'new', spr: 'w11_new_bald_hurt' },
        { actor: 'wig', spr: 'w11_wig', x: X, y: FL - 46, z: 3 },
        { move: 'wig', x: X - 44, y: FL, t: 34, hop: 26, walk: false },
        { fn: () => { DD.dust(X - 44, FL - 2, 6, 1.6, '#d8cdb0'); } },
        { set: 'new', spr: 'w11_new_bald' },
        { wait: 24 },
        { say: 'gm', hold: 100, text: "YOU DON'T HAVE TO WEAR A WIG. YOU CAN WEAR A HAT." },   // S16 premiere (the-strangers-chapter-2... captions 6:52): Gregg, after "my hair fell out, like all of it fell out within a week"
        { move: 'wig', x: X - 4, y: FL - 46, t: 26, hop: 14, walk: false },
        { gone: 'wig' },
        { set: 'new', spr: 'w11_new_a' },
        { move: 'dot', y: FL, hop: 14, t: 18 },
        { third: 'WARP 10: TWO EVERY MORNING', sub: 'HIS HAIR FELL OUT WITHIN A WEEK. HE KEPT THE WIG.', t: 130, and: true },   // the-strangers-chapter-2 captions 6:33 and 6:42 (S16 premiere)
        { wait: 70 },
      ];
    },
  });

  // 11-boss, the entrance: the Manor. S16 moves the show to the Grand Terrace Manor's activity room: seniors for an audience,
  // Mrs. Reynolds's announcements, and New in the wig, deadpan, before the bingo night turns on the Dot.
  C.scene('11-boss', 'boss_in', {
    sprites: ['w11_new_a', 'w11_new_b', 'w11_new_c'],
    beats: (S, G) => {
      const b = S.boss(), kx = b ? b.x + b.w / 2 : 817, ky = b ? b.y + b.h : FL;
      S.hide(b);
      return [
        { cam: [kx - 70, FL - 22], ease: 'cut' },
        { actor: 'new', spr: 'w11_new_a', x: kx, y: ky, sx: SC, sy: SC, shadow: 30 },
        { third: 'ON CINEMA AT THE CINEMA AT THE MANOR', sub: 'GRAND TERRACE MANOR. SEASON 16, EPISODES 5-8', t: 150, and: true },   // lore, World 4: the Manor eps 5-8, the Grand Terrace Manor activity room
        { wait: 46 },
        { set: 'new', spr: 'w11_new_b' },
        { say: 'new', hold: 230, text: 'ONE QUICK ANNOUNCEMENT. MRS. REYNOLDS WANTED ME TO LET YOU KNOW THE SHUTTLE ON FRIDAY FOR THE YAMAMOTO CASINO... IS NOW GONNA BE DEPARTING AT 10 A.M.' },   // S16 first Manor ep (bugonia-and-chainsaw-man... captions 1:27-1:47): New to the residents
        { set: 'new', spr: 'w11_new_a' },
        { wait: 40 },
        { set: 'new', spr: 'w11_new_c' },
        { fn: (G, S) => { S.bang = S.t; }},
        { sfx: 'wind' }, { shake: 5 },
        { wait: 40 },
        { card: 'boss', from: 'SEASON SIXTEEN' },
      ];
    },
    draw: (ctx, G, S) => {   // the boss's own tell: a red flash behind him and a "!" (the same marks 11-boss.js draws on his wind-up)
      const a = S.actor('new'); if (!a || !S.bang || S.t - S.bang > 40) return;
      const cx = DD.wx(a.x), by = DD.wy(a.y);
      if (Math.floor((S.t - S.bang) / 4) % 2) { ctx.fillStyle = 'rgba(255,50,40,0.4)'; ctx.fillRect(Math.round(cx - 25), Math.round(by - 66), 50, 66); }
      DD.text('!', Math.round(cx), Math.round(by - 72 - Math.sin((S.t - S.bang) / 3) * 2), '#ff5a4a', 2, '#400', 'center');
    },
  });

  // 11-boss, the knockout: S16E10, December 3, 2025 (back at the ESA: the Manor had cut them off). New announces his retirement and
  // his move to Lake Havasu. Gregg says the show can continue. New promises the Oscar special: the Last Oscar Special is next.
  C.scene('11-boss', 'boss_out', {
    live: true,
    sprites: ['w11_gregg'],
    beats: (S, G) => {
      const b = S.boss(), kx = b ? b.x + b.w / 2 : 800;
      return [
        { cam: 'boss', dx: -50, t: 50, ease: 'out', and: true },
        { say: 'new', clip: 'D48' },                                    // S16E10 (season-16/hamnet-and-ella-mccay 11:19): New, "I am announcing my retirement from broadcasting."
        { third: 'SEASON 16 FINALE: DECEMBER 3, 2025', sub: 'BACK AT THE ESA. THE MANOR HAD TURNED THE SHOW AWAY.', t: 190, and: true },   // hamnet captions 0:20 ("no longer welcome" at the Manor); lore, World 4: ep 10 at the ESA
        { actor: 'gm', spr: 'w11_gregg', x: kx - 230, y: FL, shadow: 20 },
        { move: 'gm', x: kx - 84, t: 80 },
        { say: 'gm', text: 'THE SHOW CAN CONTINUE.' },                  // S16E10 (hamnet captions 13:04): Gregg, after New's retirement speech
        { say: 'new', text: 'THANK YOU GUYS. SEE YOU IN MARCH FOR THE OSCAR SPECIAL.' },   // S16E10 (hamnet captions 14:54): New, signing off
        { third: 'THE LAST OSCAR SPECIAL', sub: 'MARCH 15, 2026. NEW HAS MOVED TO LAKE HAVASU.', t: 130, and: true },   // lore, Oscar 13 "The Last Oscar Special", March 15, 2026; New settled in Lake Havasu on New Year's Day 2026
        { wait: 40 },
        { fade: 1, t: 60, col: '#7ac0ee' },                             // the next set's sky
      ];
    },
  });
})();
