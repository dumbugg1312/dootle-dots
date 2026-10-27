// The bonus Popcorn Classic screening: unlocked on Gregg's shelf by finding all four of a world's tapes.
// One generator for every world: a short arena built from that world's X-1 set (its theme, tiles and portraits),
// where popcorn rains down for 45 seconds while the world's four tapes play on the big screen. Score = bags.
// window.makeBonus(n, LEVELS) -> a LEVEL object for DD.start.
(function () {
  window.makeBonus = function (n, LEVELS) {
    const base = LEVELS[n + '-1']; if (!base) return null;
    const tiles = base.theme && base.theme.tiles ? Object.keys(base.theme.tiles) : [];
    const solids = tiles.filter(k => (base.KINDS ? base.KINDS[k] : ({ solid: 1, carpet: 1, seat: 1, riser: 1, flat: 1, ledge: 1 })[k]) === 1);
    const floor = solids[0] || 'solid', step = solids.find(k => k !== floor && k !== 'seat') || floor;   // seats are drawn by 2-1's own script, so never use them as plain steps
    const W = 44, H = 16, F = 13, ids = (window.WORLDS[n - 1].levels || []).map(l => l.id), C = window.CLASSICS || {};
    const titles = ids.map(id => C[id] && C[id].title).filter(Boolean);
    const SOLID = [[floor, 0, F, W, 3], [floor, 0, 0, 1, H], [floor, W - 1, 0, 1, H],
      [step, 6, 10, 5, 1], [step, 16, 8, 5, 1], [step, 26, 10, 5, 1], [step, 34, 7, 5, 1], [step, 12, 5, 4, 1], [step, 28, 4, 4, 1]];
    const L = {
      id: n + '-bonus', name: 'POPCORN CLASSIC SCREENING', sub: 'ALL FOUR TAPES, WORLD ' + n, world: n, W, H, FLOOR: F, SOLID,
      THINGS: [['dot', 21, 12]], POPCORN: [], KINDS: base.KINDS, sprites: base.sprites, portraits: base.portraits, names: base.names,
      theme: base.theme, intro: base.intro, ENTS: base.ENTS,
      lines: { start: [['gregg', "HEY GUYS. IT'S A POPCORN CLASSIC SCREENING."]] },
      script: {
        init(G) { Object.assign(G.s, { t: 45 * 60, drop: 0, now: 0, ended: false }); },
        update(G) {
          const s = G.s; if (G.done || s.ended) return;
          if (--s.t <= 0) { s.ended = true; DD.endLevel(1, 0); return; }
          if (s.t % (60 * 45 / Math.max(1, titles.length)) === 0) s.now = (s.now + 1) % Math.max(1, titles.length);
          if (++s.drop % 14 === 0) {   // a kernel appears somewhere on screen, falling into a platform or the floor
            const tx = 2 + Math.floor(Math.random() * (W - 4)); let ty = 1; while (ty < F - 1 && !DD.T(tx, ty + 1)) ty++;
            DD.addPop(tx, Math.max(1, ty - Math.floor(Math.random() * 3)));
          }
        },
        drawBG(ctx, G) {   // the big screen: the world's tapes, one after another
          const w = 180, h = 30, X = DD.VW / 2 - w / 2, Y = 34;   // fixed on the back wall, behind the action
          ctx.fillStyle = '#0a080c'; ctx.fillRect(X - 2, Y - 2, w + 4, h + 4); ctx.fillStyle = '#e8e4d8'; ctx.fillRect(X, Y, w, h);
          DD.text('NOW SHOWING', X + w / 2, Y + 5, '#5a1a10', 1, null, 'center');
          DD.text(titles[G.s.now] || 'A POPCORN CLASSIC', X + w / 2, Y + 17, '#1a0e14', 1, null, 'center');
        },
        drawFG(ctx, G) { const sec = Math.ceil(G.s.t / 60); DD.text(String(Math.max(0, sec)), DD.VW - 14, 30, sec <= 10 ? '#ff6a6a' : '#fff6d4', 2, '#000', 'right'); },
      },
    };
    return L;
  };
})();
