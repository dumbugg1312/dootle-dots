// Template / test level: copy to levels/<id>.js. Shows a custom entity, a stompable enemy, a boss with an arena, theme and script hooks.
// Run it with: node tests/smoke.js _template   (not listed in worlds.js, so it never shows in the menu; open index.html?level=_template)
DD.defineEntity('walker', {   // a patrolling enemy: stomp it for popcorn, touch it and you get hurt
  spawn: t => ({ x: t.x + 1, y: t.y, w: 14, h: 14, vx: -0.5, vy: 0 }),
  update(e, G) {
    if (Math.abs(DD.cx(e) - DD.cx(G.pl)) > 320) return;
    if (DD.moveX(e, e.vx, false)) e.vx = -e.vx;
    e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) e.vy = 0;
    if (e.y > DD.L.H * 16 + 40) e.dead = true;
  },
  draw(e, ctx) { const X = DD.wx(e.x), Y = DD.wy(e.y); ctx.fillStyle = '#6a2a8a'; ctx.fillRect(X, Y, e.w, e.h); ctx.fillStyle = '#fff'; ctx.fillRect(X + (e.vx < 0 ? 2 : 9), Y + 3, 3, 3); },
  stomp(e, G) { e.dead = true; DD.addGot(2, DD.cx(e), e.y); DD.popSound(); return true; },
  touch(e, G, p) { DD.hurt(DD.cx(e)); },
});
DD.defineEntity('blob_boss', {   // boss: true gives stomp = one hit, touch = hurt
  boss: true,
  spawn: t => ({ x: t.x, y: t.y, w: 28, h: 24, vx: 0, vy: 0, dir: -1 }),
  update(e, G) {
    const B = DD.boss; if (!B || !B.engaged || B.dead) return;
    e.vx = e.dir * (0.8 + B.phase * 0.7);
    if (DD.moveX(e, e.vx, false) || e.x < B.arena[0] + 4 || e.x + e.w > B.arena[1] - 4) e.dir = -e.dir;
    e.vy = Math.min(e.vy + 0.4, 6); if (DD.moveY(e, e.vy, false)) { e.vy = 0; if (G.frame % 70 === 0) e.vy = -5; }
  },
  draw(e, ctx, G) {
    const B = DD.boss, X = DD.wx(e.x), Y = DD.wy(e.y);
    if (B && B.dead) { ctx.globalAlpha = Math.max(0, B.endT / 100); }
    else if (B && B.inv > 0 && Math.floor(B.inv / 3) % 2) return;
    ctx.fillStyle = B && B.phase ? '#c8302a' : '#3a8a4a'; ctx.fillRect(X, Y, e.w, e.h); ctx.fillStyle = '#fff'; ctx.fillRect(X + 6, Y + 6, 5, 5); ctx.fillRect(X + 17, Y + 6, 5, 5);
    ctx.globalAlpha = 1;
  },
});
window.LEVEL = {
  id: '_template', name: 'TEMPLATE', sub: 'COPY ME', world: 0,
  W: 64, H: 24, FLOOR: 21,
  SOLID: [['solid', 0, 21, 64, 3], ['oneway', 8, 17, 6, 1], ['solid', 22, 18, 3, 3], ['cracked', 28, 20, 4, 1]],
  THINGS: [['dot', 1, 20], ['walker', 16, 20], ['walker', 30, 20], ['cp', 20, 19], ['vhs', 10, 14], ['blob_boss', 52, 19]],
  POPCORN: [[4, 19, 4], [8, 15, 4], [26, 15, 3], [44, 19, 3]],
  boss: {   // tile coordinates for the arena [x0, x1]; hp pips show in the HUD; phases trigger at hp <= at
    name: 'BLOB', hp: 4, arena: [40, 63], inv: 60, phases: [{ at: 2, say: 'ANGRY BLOB', sub: 'FASTER' }],
    onDefeat: G => DD.banner('BLOB POPPED', 90),
  },
  theme: {
    tiles: { solid: ['#3a4a6a', '#6a82aa', '#1c2438'], oneway: ['#8a8aa0', '#d0d0e0', '#4a4a5a'] },
    bg(ctx, G, DD) { const g = ctx.createLinearGradient(0, 0, 0, DD.VH); g.addColorStop(0, '#16203a'); g.addColorStop(1, '#2a3a5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, DD.VW, DD.VH); },
  },
  script: { init(G) { G.s.visits = 0; }, update(G) { G.s.visits++; } },
};
