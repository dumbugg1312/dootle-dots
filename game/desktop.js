// The desktop-only card: what a phone or tablet sees instead of the game (game/index.html decides, and loads just engine.js and this).
// Drawn on the engine's canvas with its font and the theater's own sprites. A real keyboard still gets in: any key press reloads
// into the game (sessionStorage remembers for the session), as does ?desktop in the address.
(function () {
  const VW = DD.VW, VH = DD.VH, ctx = DD.ctx, text = DD.text, spr = DD.spr;
  DD.loadSprites(['w2_curtain', 'w2_sconce', 'w2_carpet', 'menu_screen', 'seat', 'tub', 'portrait_tim', 'portrait_gregg', 'sam', 'mel', 'cloud', 'baxter']);
  const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const ctext = (s, y, col, sc = 1, sh = '#000') => text(s, VW / 2, y, col, sc, sh, 'center');
  let t = 0;

  function draw() {
    const bulb = Math.floor(t / 5);
    rect('#0a0408', 0, 0, VW, VH);
    for (let x = 0; x < VW; x += 174) spr('w2_curtain', x + 87, 200, false, 1, 1, 0, 0.5);   // the back curtain, in the dark
    for (const gx of [36, 284]) { const g = ctx.createRadialGradient(gx, 92, 2, gx, 92, 34); g.addColorStop(0, 'rgba(255,214,120,0.40)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 36, 56, 72, 72); spr('w2_sconce', gx, 100); }
    // the screen, with the chasing marquee bulbs of the title
    const sx = 70, sy = 14;
    spr('menu_screen', sx + 90, sy + 104);
    for (let i = 0, x = 4; x < 180; x += 6, i++) for (const yy of [3, 99]) if ((i + bulb) % 3 === 0) { rect('#fffbd0', sx + x, sy + yy, 2, 2); rect('rgba(255,240,160,0.35)', sx + x - 1, sy + yy - 1, 4, 4); }
    for (let i = 0, y = 10; y < 104; y += 6, i++) for (const xx of [3, 171]) if ((i + bulb + 1) % 3 === 0) { rect('#fffbd0', sx + xx, sy + y, 2, 2); rect('rgba(255,240,160,0.35)', sx + xx - 1, sy + y - 1, 4, 4); }
    rect('#f4ecd8', sx + 8, sy + 8, 164, 88);   // the screen is lit
    ctext('DOOTLE DOTS', sy + 14, '#8a1c24', 2, null);
    ctext('NOW SHOWING ON DESKTOP ONLY', sy + 30, '#2a1a20', 1, null);
    // the hosts' word on it, with their portraits
    spr('portrait_gregg', sx + 24, sy + 61); spr('portrait_tim', sx + 24, sy + 83);
    text('GREGG: A FILM LIKE THIS IS', sx + 40, sy + 44, '#2a1a20', 1, null);
    text('MEANT FOR THE BIG SCREEN.', sx + 40, sy + 51, '#2a1a20', 1, null);
    text('TIM: COME BACK ON A COMPUTER', sx + 40, sy + 65, '#2a1a20', 1, null);
    text('WITH A KEYBOARD. WE\'LL WAIT.', sx + 40, sy + 72, '#2a1a20', 1, null);
    // the bag ratings: phones get none, a desktop gets all five
    text('PHONE: NONE', sx + 40, sy + 85, '#6a5a60', 1, null);
    text('DESKTOP:', sx + 96, sy + 85, '#2a1a20', 1, null);
    for (let i = 0; i < 5; i++) spr('tub', sx + 134 + i * 7, sy + 91, false, 0.5, 0.5);
    // carpet and the audience: the Dots hop on the back row like the title
    for (let x = 0; x < VW; x += 16) spr('w2_carpet', x + 8, 180);
    rect('rgba(8,2,12,0.35)', 0, 120, VW, 60);
    [['sam', 134], ['mel', 164], ['cloud', 194], ['baxter', 224]].forEach(([n, x], i) => {
      const p = ((t + i * 13) % 52) / 52, air = p < 0.62, a = air ? Math.sin(p / 0.62 * Math.PI) : 0, land = !air && p < 0.72;
      spr(n, x, 150 - Math.round(a * 14), false, land ? 1.12 : 1 - a * 0.06, land ? 0.88 : 1 + a * 0.08);
    });
    for (let i = 0; i < 12; i++) spr('seat', 14 + i * 30, 172);
    rect('rgba(6,2,10,0.45)', 0, 158, VW, 22);
    if (t % 60 < 42) ctext('GOT A KEYBOARD? PRESS ANY KEY', 162, '#fffbd0', 1, '#000');
    ctext('AN UNOFFICIAL FAN GAME', 171, '#8a1c24', 1, null);
  }
  DD.setScene({ step: () => { t++; }, draw });

  addEventListener('keydown', e => {   // a key means a keyboard: into the game
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    try { sessionStorage.setItem('dootledots.keyboard', '1'); } catch (er) {}
    location.reload();
  });
})();
