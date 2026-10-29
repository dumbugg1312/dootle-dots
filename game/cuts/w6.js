// World 6 cutscenes: THE TRIAL (The Trial of Tim Heidecker, November 2017). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-09-12.md section 3 (the trial: days, judge, verdict), refs/lore/fan-culture.md and gemini-fan-culture.md (Tim's courtroom lines).
// No clip of the trial passed QA, so the voices are the lines the lore gives to Tim with certainty, plus the gavel. The shape is courtroom procedure: objection, approach, verdict.
(function () {
  const C = window.DDCut; if (!C) return;
  const F = 21 * 16;   // the floor (px), the same in 6-1 and 6-boss

  // one frame of a strip, drawn by its bottom-centre; a.f is the frame ('walk' alternates the two idle frames), a.flip mirrors it (the art faces right)
  const strip = (name, w, h) => (ctx, X, Y, a, S) => {
    if (!DD.ready(name)) return;
    const f = a.f === 'walk' ? Math.floor(S.t / 8) % 2 : (a.f || 0);
    ctx.save(); ctx.globalAlpha *= a.alpha; ctx.translate(Math.round(X), Math.round(Y)); if (a.flip) ctx.scale(-1, 1);
    ctx.drawImage(DD.IMG[name], f * w, 0, w, h, -(w >> 1), -h, w, h); ctx.restore();
  };
  const TIM = strip('w6_lawyer_tim', 36, 50);   // frames: 0 idle, 1 idle, 2 hand up, 3 gavel up, 4 both fists, 5 stunned
  const GAVEL = strip('w6_gavel', 26, 30);      // 0 raised, 1 slammed

  // 6-1 opens: the first days of the trial. Tim has fired his lawyer and objects to everything; the contempt gavel on the bench answers him.
  C.scene('6-1', 'open', {
    hidePlayer: true,
    sprites: ['w6_lawyer_tim'],
    beats: (S, G) => {
      const p = G.pl, px = p.x + p.w / 2, fy = p.y + p.h;
      return [
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x: px, y: fy, shadow: 10 },
        { actor: 'gavel', draw: GAVEL, f: 0, x: 224, y: 19 * 16 + 4, z: 1 },                          // the gavel stands on the bench platform, the way the level's contempt gavels do
        { actor: 'tim', draw: TIM, f: 'walk', x: 372, y: fy, flip: true, shadow: 14, z: 2 },
        { fade: 0, t: 40 },
        { third: 'THE TRIAL OF TIM HEIDECKER', sub: 'NOVEMBER 15-28, 2017. FIVE DAYS AND A VERDICT', t: 230, and: true },   // lore s.3: Nov 15 to 28, 2017, Days 1 to 5 plus The Verdict
        { wait: 36 },
        { move: 'tim', x: 170, t: 96, ease: 'out' },                                              // Tim, representing himself, crosses the well
        { set: 'tim', f: 0, flip: false }, { wait: 16 },
        { set: 'tim', f: 2 }, { sfx: 'wind' },
        { say: 'lawyer', text: 'OBJECTION. HEARSAY.', hold: 78 },                                // lore (gemini-fan-culture): Tim as his own defence attorney, "Objection... hearsay."
        { wait: 10 },
        { set: 'gavel', f: 1 }, { sfx: 'slam' }, { shake: 6 },                                    // the judge answers with the gavel
        { fn: () => { DD.dust(224, 19 * 16 + 4, 10, 2, '#e8c890'); DD.stars(170, fy - 40, 6, '#ffe680'); } },
        { set: 'tim', f: 5 }, { move: 'tim', x: 150, t: 12, ease: 'out', face: false, walk: false },
        { move: 'dot', x: px, y: fy, t: 18, hop: 14, and: true },
        { wait: 40 },
        { set: 'gavel', f: 0 }, { wait: 24 },
        { set: 'tim', f: 1 }, { wait: 30 },                                                       // he straightens his tie and carries on
        { set: 'tim', f: 'walk' }, { move: 'tim', x: 400, t: 120, ease: 'in' },
      ];
    },
  });

  // 6-boss, the entrance: Day 3. Tim asks to approach the bench; the judge's gavel says no, and Tim storms back to the floor of the well.
  C.scene('6-boss', 'boss_in', {
    beats: (S, G) => {
      const lt = S.boss(), st = lt ? lt.x + lt.w / 2 : 820;   // where the fight starts
      return [
        { fn: () => { S.hide(lt); } },
        { actor: 'tim', draw: TIM, f: 'walk', x: 720, y: F, flip: true, shadow: 14, z: 2 },
        { cam: [470, 294], t: 70 },
        { third: 'TRIAL DAY 3', sub: 'THE PROSECUTION CALLS FORMER ALLIES. TIM STILL REPRESENTS HIMSELF', t: 200, and: true },   // lore s.3: Day 3 former allies testify; Day 1 Tim fired Dwyer
        { wait: 30 },
        { move: 'tim', x: 520, t: 90, ease: 'out' },
        { set: 'tim', f: 2, flip: true }, { wait: 12 },
        { say: 'lawyer', text: 'MAY I APPROACH THE BENCH?', hold: 76 },                          // lore (fan-culture): Tim keeps asking to approach; the judge rarely lets him
        { fn: () => { G.s.raise = true; } }, { wait: 44 },                                        // the judge raises the gavel
        { fn: () => { G.s.raise = false; G.s.judgeT = 22; } }, { sfx: 'slam' }, { shake: 7 },
        { set: 'tim', f: 5 }, { move: 'tim', x: 570, t: 12, ease: 'out', face: false, walk: false },
        { fn: () => { DD.stars(570, F - 40, 7, '#ffffff'); DD.dust(560, F, 8, 1.6, '#e8c890'); } },
        { wait: 36 },
        { fn: () => { G.s.judgeT = 0; } },
        { set: 'tim', f: 'walk' },
        { cam: [st - 30, 294], t: 120, and: true },
        { move: 'tim', x: st, t: 120 },                                                           // back to his side of the well
        { set: 'tim', f: 3, flip: true }, { sfx: 'wind' },
        { fn: () => { DD.float(st, F - 52, 'OBJECTION!', '#ffe680'); } },
        { wait: 40 },
        { card: 'boss', from: 'NOVEMBER 2017' },
      ];
    },
    fin: (G, S) => { G.s.raise = false; G.s.judgeT = 0; },
  });

  // 6-boss, the knockout: the verdict. 19 counts hung, 11 to 1, so a mistrial; the lone holdout was juror Toni Newman.
  // The jury is drawn here, in the same pixel style as the gallery (its spectator heads, the honey wood).
  const JURY = (ctx, X, Y, a, S) => {
    const A = DD.art, im = DD.ready('w6_gallery') ? DD.IMG.w6_gallery : null; if (!A || !im) return;
    const w = 126, x0 = Math.round(X - w / 2), HOLD = 8, t = a.v0 >= 0 ? S.t - a.v0 : -1;
    A.box(x0 - 3, Y - 70, w + 6, 46, '#5a3a1c');                                          // the box's back panel
    A.R(x0, Y - 50, w, 5, '#3a4a68');                                                     // the seat backs
    for (let i = 0; i < 12; i++) {
      const back = i >= 6, k = i % 6, hx = x0 + (back ? 11 : 2) + k * 19, hy = Y - (back ? 66 : 48);
      const fr = (i * 7 + 1) % 3;
      let dy = 0;
      if (t >= 0 && i !== HOLD) dy = t < 100 ? -Math.max(0, Math.round(Math.sin(t / 3.2 + i * 1.7) * 2)) : 0;   // the other eleven rock in their seats
      ctx.drawImage(im, (i === HOLD ? 1 : fr) * 16, 0, 16, 18, hx, hy + dy, 16, 18);
    }
    A.box(x0 - 3, Y - 30, w + 6, 28, '#7a4e26'); A.R(x0 - 3, Y - 30, w + 6, 1, '#c8925a'); A.planks(x0, Y - 28, w, 24, '#7a4e26', 8, true);   // the front rail
    if (t >= 0) { const g = 0.28 + 0.1 * Math.sin(t / 6); A.glow(x0 + 11 + 2 * 19 + 8, Y - 56, 26, '#ffe680', g); }   // the holdout, in a pool of light
  };
  C.scene('6-boss', 'boss_out', {
    beats: (S, G) => {
      const lt = S.boss();
      return [
        { fn: () => { S.hide(lt); } },
        { actor: 'jury', draw: JURY, v0: -1, x: 680, y: F, z: 0 },
        { actor: 'tim', draw: TIM, f: 5, x: 520, y: F, flip: true, shadow: 14, z: 2 },
        { wait: 40 },
        { cam: [600, 294], t: 70 },
        { third: 'THE VERDICT', sub: 'NOVEMBER 2017. A HUNG JURY ON 19 COUNTS, 11 TO 1', t: 220, and: true },   // lore s.3: hung jury on 19 counts (11 to 1), so a mistrial
        { wait: 40 },
        { fn: () => { G.s.raise = true; } }, { wait: 40 },                                        // the judge raises the gavel
        { fn: () => { G.s.raise = false; G.s.judgeT = 24; } }, { sfx: 'slam' }, { shake: 7 },
        { fn: () => { S.actor('jury').v0 = S.t; DD.stars(680 - 24, F - 70, 6, '#ffe680'); } },   // eleven jurors turn to the one who will not move
        { wait: 70 },
        { fn: () => { G.s.judgeT = 0; } },
        { set: 'tim', f: 4 }, { sfx: 'boing' },                                                   // Tim takes a hung jury as a win
        { move: 'tim', x: 520, y: F, t: 20, hop: 12 },
        { wait: 30 },
        { third: 'TONI NEWMAN HELD OUT', sub: "LATER TIM'S CAMPAIGN MANAGER. NEXT: SEASON 10, MARCH 2018", t: 190, wait: true },   // lore s.3: the lone holdout, Tim's future campaign manager and wife
      ];
    },
    fin: (G, S) => { G.s.raise = false; G.s.judgeT = 0; },
  });
})();
