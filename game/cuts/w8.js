// World 8 cutscenes: THE HEI NETWORK (Seasons 11 and 12, Oscar Specials 7 to 9, September 2019 to March 2022). Player and rules: game/cutscene.js, design/CUTSCENES.md.
// Sources: refs/lore/seasons-09-12.md sections 8 to 12 (S11 MoneyZap buy-back, the 7th special's wedding, the 8th special's bet, S12's HEI Network, the 9th special at the ranch);
// clips and episodes in design/soundbites/CATALOG.md. The shape here is money and weddings: a loan ad, a wedding crashed by a car, and a montage of what the money bought.
(function () {
  const C = window.DDCut; if (!C) return;
  const F = 21 * 16;   // the floor (px), the same in 8-1 and 8-boss
  const im = n => (DD.ready(n) ? DD.IMG[n] : null);

  // 8-1 opens: Season 11. On Cinema is back, bought from Delgado Media with a MoneyZap loan. The loan ad's green sign lights over the returned red seats and the bills fall.
  const SIGN = (ctx, X, Y, a, S) => {   // the MoneyZap sign, drawn at a fixed place on the screen (the scene's camera is still), with the ad's flicker
    const s = im('w8_mzsign'); if (!s || a.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= a.alpha * (S.t % 17 < 2 ? 0.5 : 1);
    DD.art.glow(160, 48, 96, '#3cff7a', 0.14); ctx.drawImage(s, 96, 18); ctx.restore();
  };
  C.scene('8-1', 'open', {
    hidePlayer: true,
    draw: (ctx, G, S) => {   // the bills coming down: little green notes, in the pixel style of the loan pad
      if (!S.mz) return; const k = S.t - S.mz, A = DD.art, fade = Math.min(1, k / 20) * (S.mzEnd ? Math.max(0, 1 - (S.t - S.mzEnd) / 30) : 1);
      if (fade <= 0) return;
      ctx.save(); ctx.globalAlpha = fade;
      for (let i = 0; i < 26; i++) {
        const x = Math.round((i * 47) % 316 + Math.sin((k + i * 13) / 18) * 8), y = Math.round((k * (0.7 + (i % 4) * 0.22) + i * 29) % 200 - 14);
        A.R(x, y, 8, 4, i % 3 ? '#3fbf5a' : '#2a9a46'); A.R(x + 1, y + 1, 6, 1, '#bff0c0'); A.R(x + 3, y + 1, 2, 2, '#1a5a2a');
      }
      ctx.restore();
    },
    beats: (S, G) => {
      const p = G.pl, px = p.x + p.w / 2, fy = p.y + p.h;
      return [
        { cam: 'player', ease: 'cut' },
        { actor: 'dot', dot: p.dot, x: px, y: fy, shadow: 10 },
        { actor: 'sign', draw: SIGN, alpha: 0, x: 0, y: 0, z: 1 },
        { fade: 0, t: 40 },
        { third: 'SEASON 11', sub: 'SEPTEMBER 2019. TIM BUYS ON CINEMA BACK ON A $25,000 LOAN', t: 240, and: true },   // lore s.8: Sept to Nov 2019; the MoneyZap loan buys it back from Delgado Media
        { wait: 40 },
        { sfx: 'switch' }, { flash: '#7aff9a', t: 7 }, { set: 'sign', alpha: 1 }, { fn: () => { S.mz = S.t; } },
        { move: 'dot', x: px, y: fy, t: 22, hop: 14 },
        { wait: 30 },
        { say: 'tim', clip: 'C5' },                                                           // S11 (Charlie's Angels / The Report): "It's On Cinema at the Cinema, season 11, with your host, me, Tim."
        { fn: () => { S.mzEnd = S.t; } }, { set: 'sign', alpha: 0 },
        { say: 'gregg', clip: 'C13' },                                                        // S11 (Black and Blue / The Last Full Measure): "Hey guys, it's Movie Time!"
        { wait: 20 },
      ];
    },
  });

  // 8-boss, the entrance: the 7th Annual Oscar Special, February 9, 2020. Tim is staging his wedding on the air; Gregg drives the Mobile VFA, dressed as the Joker, into the studio.
  C.scene('8-boss', 'boss_in', {
    beats: (S, G) => {
      const B = S.boss(), bx = B ? B.x + B.w / 2 : 794;
      return [
        { fn: () => { S.hide(B); } },
        { actor: 'vfa', spr: 'w8_joker_ram', x: 1110, y: F + 1, shadow: 40, z: 1 },          // the car, off to the right, with the Joker leaning out of it
        { cam: [470, 294], t: 70 },
        { third: 'THE 7TH ANNUAL ON CINEMA OSCAR SPECIAL', sub: 'FEBRUARY 9, 2020. TIM STAGES AN ON-AIR WEDDING', t: 200, and: true },   // lore s.9: Feb 9, 2020; Tim annuls the quick marriage to stage the wedding
        { wait: 24 },
        { clip: 'F89', wait: true },                                                          // 7th Oscar Special: the wedding vows, "I never thought that I could meet someone like you." (speaker not certain, so no caption)
        { wait: 12 },
        { sfx: 'wind' }, { shake: 2 }, { wait: 30 },                                          // an engine, offscreen
        { cam: [bx - 70, 294], t: 80, and: true },
        { move: 'vfa', x: bx, t: 80, ease: 'out', walk: false },                              // the Mobile VFA drives into the wedding set
        { shake: 9 }, { sfx: 'slam' }, { set: 'vfa', spr: 'w8_joker' },
        { fn: () => { DD.dust(bx, F, 16, 2.4, '#d8cde0'); DD.stars(bx - 10, F - 56, 8, '#ffe680'); } },
        { wait: 24 },
        { say: 'joker', clip: 'C13' },                                                        // S11 (Black and Blue): Gregg's catchphrase, "Hey guys, it's Movie Time!"
        { wait: 12 },
        { card: 'boss', from: 'FEBRUARY 2020', t: 120 },
      ];
    },
  });

  // 8-boss, the knockout: how the Mobile VFA's story ended, and what the money did next. Two tableaux in the set's own sprites, drawn full-screen over the arena.
  const ROOM = (ctx, X, Y, a, S) => {
    const A = DD.art, VW = DD.VW, VH = DD.VH; if (a.alpha <= 0) return;
    const put = (n, x, y, flip) => { const i = im(n); if (!i) return; if (flip) { ctx.save(); ctx.translate(x + i.width, y); ctx.scale(-1, 1); ctx.drawImage(i, 0, 0); ctx.restore(); } else ctx.drawImage(i, x, y); };
    const ty = 116;
    if (a.kind === 'room') {   // the HEI Screening Room: red brick under red and pink light, the two armchairs, the popcorn cart (S12, from October 2021)
      A.R(0, 0, VW, VH, '#2a0c16');
      const br = im('w8_brick'); if (br) for (let y = 0; y < ty; y += 24) for (let x = 0; x < VW; x += 32) ctx.drawImage(br, x, y);
      const g = ctx.createLinearGradient(0, 0, 0, ty); g.addColorStop(0, 'rgba(120,10,50,0.5)'); g.addColorStop(1, 'rgba(255,90,120,0.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, ty);
      put('w8_flag', 40, 22); put('w8_flag', 244, 22); put('w8_marquee', 134, 26);
      A.R(0, ty, VW, VH - ty, '#3a1824'); A.R(0, ty, VW, 1, '#8a3a4a'); A.R(0, VH - 4, VW, 4, '#ff5a8a');
      put('w8_popcart', 232, ty - 58); put('w8_armchair', 70, ty - 30); put('w8_timceo', 71, ty - 40); put('w8_coffee', 108, ty - 24);
      put('w8_bond', 160, ty - 40); put('w8_armchair_r', 158, ty - 30); put('w8_lamp', 20, ty - 56);
      A.glow(150, 60, 110, '#ff6a9a', 0.12);
    } else {   // the HEI Ranch at dusk: the Oscar 9 set on sand, the mesa, the sun, the cactus, two director's chairs and a steel drum
      const g = ctx.createLinearGradient(0, 0, 0, ty); g.addColorStop(0, '#3a2a6a'); g.addColorStop(0.55, '#c8605a'); g.addColorStop(1, '#f0a050'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, ty);
      put('w8_sun', 128, 22);
      for (let x = 0; x < VW; x += 160) { put('w8_hills_far', x, ty - 64); }
      put('w8_mesa_a', 214, ty - 56); put('w8_mesa_b', 12, ty - 52);
      for (let x = 0; x < VW; x += 160) { put('w8_hills_near', x, ty - 40); }
      A.R(0, ty, VW, VH - ty, '#c8a070'); A.R(0, ty, VW, 1, '#e8c890'); A.R(0, ty + 14, VW, VH - ty - 14, '#b08858');
      put('w8_cactus_a', 276, ty - 44); put('w8_cactus_b', 30, ty - 30); put('w8_scrub', 188, ty + 2); put('w8_scrub', 60, ty + 8);
      put('w8_dirchair', 92, ty - 30); put('w8_timranch', 90, ty - 44); put('w8_drum', 134, ty - 24); put('w8_dirchair', 170, ty - 30, true); put('w8_greggranch', 168, ty - 44);
      ctx.fillStyle = 'rgba(40,10,40,0.18)'; ctx.fillRect(0, 0, VW, VH);
    }
  };
  C.scene('8-boss', 'boss_out', {
    live: true,
    beats: (S, G) => [
      { wait: 50 },
      { cam: 'boss', dx: -20, t: 40 },
      { third: 'THE MOBILE VFA SIGNS OFF', sub: 'APRIL 2021. GREGG BETS IT ON MANK. NOMADLAND WINS', t: 170, and: true },   // lore s.10: the 8th special, Gregg bets the VFA on Mank, Nomadland wins, he signs the VFA over on camera
      { wait: 130 },
      { fade: 1, t: 30 },
      { cam: [160, 294], ease: 'cut' },                                                       // far from the car, so its smoke does not drift over the tableau
      { actor: 'room', draw: ROOM, kind: 'room', alpha: 1, x: 0, y: 0, z: 50 },
      { fade: 0, t: 30 },
      { wait: 20 },
      { say: 'ceo', clip: 'C10' },                                                            // S12E1 (Mass / No Time to Die): "It's our first episode here on the HEI Network."
      { third: 'THE HEI NETWORK', sub: 'SEASON 12. OCTOBER 2021. HEI POINTS, THE HEI RANCH', t: 130, wait: true },   // lore s.11: S12 Oct 6 - Dec 8, 2021; HEI Points and the HEI Ranch
      { fade: 1, t: 24 },
      { set: 'room', kind: 'ranch' },
      { fade: 0, t: 30 },
      { third: 'G. AMATO ARRIVES AT THE RANCH', sub: '9TH OSCAR SPECIAL, MARCH 27, 2022. NEXT: SEASON 13', t: 150, wait: true },   // lore s.12: 9th special at the HEI Ranch; G. Amato introduced as an investor; s.13 starts Oct 2022
    ],
  });
})();
