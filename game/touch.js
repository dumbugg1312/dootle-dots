// Touch controls: what a phone or tablet gets over the game (game/index.html decides, and loads this after the game's scripts).
// Design: design/TOUCH-PITCH.md. Five targets and no more: a slide pad for LEFT / RIGHT / DOWN under the left thumb, JUMP and
// SWITCH under the right, and a pause button. The engine's keyboard state is private to it, so the pad and buttons send synthetic
// keydown / keyup events for the same key codes a keyboard would (arrows, Z, X, P): the engine's own listener then does its edge
// detection, jump buffering, coyote time and variable jumps exactly as for a real keyboard. Taps on the canvas itself still reach the
// engine and the menus the way a mouse click does (portraits, pause menu, dialogue, the blue card, every menu screen).
// Also here: the scale is allowed to be fractional (engine.js floors it), a rotate-me card covers the game in portrait, and the
// overlay hides itself when a real keyboard key is pressed (a tablet with a keyboard) until the next touch. What shows depends on
// what is on screen (mode() below), so the buttons never sit over a menu, a line of dialogue, a card or a caption.
(function () {
  const VW = 320, VH = 180, cv = document.getElementById('c');
  const SPR = (window.DD && DD.spriteDir) || '../design/sprites/';

  // ---- styles and the DOM: the controls, and the portrait card
  const style = document.createElement('style');
  style.textContent = `
    html, body { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; overscroll-behavior: none; }
    #tc { position: fixed; inset: 0; pointer-events: none; font: bold 11px/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: 1px; color: #fff6d4; z-index: 5; }
    #tc.kb { display: none; }
    #tc > div { position: absolute; pointer-events: auto; box-sizing: border-box; opacity: 0.42; transition: opacity 0.08s; }
    #tc > div.on { opacity: 0.85; }
    #tc .pad { left: max(14px, env(safe-area-inset-left)); bottom: max(18px, calc(env(safe-area-inset-bottom) + 8px)); width: 150px; height: 100px; border: 2px solid #ffe680; border-radius: 14px; background: rgba(20,8,14,0.45); }
    #tc .pad i { position: absolute; font-style: normal; font-size: 16px; color: #ffe680; }
    #tc .pad .l { left: 22px; top: 28px; } #tc .pad .r { right: 22px; top: 28px; } #tc .pad .d { left: 50%; bottom: 6px; margin-left: -6px; }
    #tc .pad:before { content: ''; position: absolute; left: 50%; top: 10px; bottom: 36px; border-left: 1px dashed rgba(255,230,128,0.45); }
    #tc .pad:after { content: ''; position: absolute; left: 10px; right: 10px; bottom: 32px; border-top: 1px dashed rgba(255,230,128,0.45); }
    #tc .btn { border-radius: 50%; border: 2px solid #ffe680; background: rgba(138,28,36,0.55); display: flex; align-items: center; justify-content: center; text-shadow: 1px 1px 0 #000; }
    #tc .jump { right: max(18px, env(safe-area-inset-right)); bottom: max(22px, calc(env(safe-area-inset-bottom) + 12px)); width: 76px; height: 76px; font-size: 13px; }
    #tc .sw { right: calc(max(18px, env(safe-area-inset-right)) + 90px); bottom: max(30px, calc(env(safe-area-inset-bottom) + 20px)); width: 58px; height: 58px; font-size: 10px; }
    /* what is on screen decides what the overlay shows (mode() below): play gets everything; a menu gets JUMP and SWITCH as two
       small pills in the bottom corners, clear of the keycap row (or out in the side bars on a wide phone); dialogue, cards, the
       pause menu and the results card are all taps, so nothing covers them; in a cutscene the whole screen is the JUMP button */
    #tc.m-menu .pad, #tc.m-menu .pause, #tc.m-tap > div, #tc.m-cut > div { display: none; }
    #tc.m-menu .btn { width: 62px; height: 28px; border-radius: 14px; font-size: 11px; bottom: max(3px, env(safe-area-inset-bottom)); opacity: 0.75; }
    #tc.m-menu .btn.on { opacity: 1; }
    #tc.m-menu .jump { right: max(4px, env(safe-area-inset-right)); }
    #tc.m-menu .sw { right: auto; left: max(4px, env(safe-area-inset-left)); }
    #tc.m-menu.wide .btn { bottom: max(12px, env(safe-area-inset-bottom)); }
    #tc.m-menu.wide .jump { right: calc((var(--bar) - 62px) / 2); }
    #tc.m-menu.wide .sw { left: calc((var(--bar) - 62px) / 2); }
    #tc .pause { left: 50%; top: max(6px, env(safe-area-inset-top)); width: 44px; height: 30px; margin-left: -22px; border-radius: 8px; border: 2px solid #ffe680; background: rgba(20,8,14,0.55); }
    #tc .pause:before, #tc .pause:after { content: ''; position: absolute; top: 8px; width: 4px; height: 10px; background: #fff6d4; }
    #tc .pause:before { left: 15px; } #tc .pause:after { left: 23px; }
    #tr { position: fixed; inset: 0; display: none; background: #0a0408; color: #fff6d4; z-index: 9; text-align: center; font: bold 13px/1.7 ui-monospace, Menlo, Consolas, monospace; letter-spacing: 1px; }
    #tr .cur { position: absolute; left: 0; right: 0; top: 0; height: 40%; background: url(${SPR}w2_curtain.png) repeat-x center bottom / auto 100%; image-rendering: pixelated; opacity: 0.7; }
    #tr .card { position: absolute; left: 8%; right: 8%; top: 44%; padding: 16px 8px; background: #f4ecd8; color: #2a1a20; border: 3px solid #ffe680; box-shadow: 0 0 0 3px #8a1c24; }
    #tr .card b { display: block; color: #8a1c24; font-size: 18px; margin-bottom: 8px; }
    #tr .card .ph { display: inline-block; width: 22px; height: 38px; border: 3px solid #2a1a20; border-radius: 5px; margin: 10px 0 4px; animation: trturn 1.6s ease-in-out infinite; }
    @keyframes trturn { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
    @media (orientation: portrait) { #tr { display: block; } #tc { display: none; } }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'tc';
  root.innerHTML = '<div class="pad"><i class="l">&#9664;</i><i class="r">&#9654;</i><i class="d">&#9660;</i></div><div class="btn sw">SWITCH</div><div class="btn jump">JUMP</div><div class="pause"></div>';
  const rot = document.createElement('div'); rot.id = 'tr';
  rot.innerHTML = '<div class="cur"></div><div class="card"><b>DOOTLE DOTS</b>THIS FILM IS PRESENTED IN WIDESCREEN.<br>TURN YOUR PHONE SIDEWAYS.<br><span class="ph"></span></div>';
  document.body.appendChild(root); document.body.appendChild(rot);
  const pad = root.querySelector('.pad'), jumpB = root.querySelector('.jump'), swB = root.querySelector('.sw'), pauseB = root.querySelector('.pause');

  // ---- keys: one synthetic keydown per logical press, one keyup when the last finger holding it lets go
  const held = {};   // code -> number of touches holding it
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^(Key|Arrow)/, ''), bubbles: true, cancelable: true }));
  function press(code) { held[code] = (held[code] || 0) + 1; if (held[code] === 1) key('keydown', code); }
  function release(code) { if (!held[code]) return; if (--held[code] === 0) key('keyup', code); }
  function releaseAll() { for (const c in held) { if (held[c] > 0) key('keyup', c); held[c] = 0; } fingers.clear(); for (const el of [pad, jumpB, swB]) el.classList.remove('on'); }
  const tap = code => { key('keydown', code); key('keyup', code); };   // the engine reads the press edge from the keydown

  // ---- the pad: where the thumb is decides. Left half / right half, the bottom third adds DOWN; in a menu the top band is UP
  // (UP is also Jump in play, so it is never sent while the level runs). The pad keeps tracking a thumb that slides off it.
  let dirHist = 0;   // the direction last sent, for a little hysteresis at the pad's middle
  const menuUp = () => !!(window.DD && (DD.inMenu || (DD.G && DD.G.state === 'pause')));
  function padCodes(t) {
    const r = pad.getBoundingClientRect(), fx = (t.clientX - r.left) / r.width, fy = (t.clientY - r.top) / r.height;
    const dir = fx < 0.5 - 0.06 ? -1 : fx > 0.5 + 0.06 ? 1 : (dirHist || (fx < 0.5 ? -1 : 1));
    dirHist = dir;
    const codes = [dir < 0 ? 'ArrowLeft' : 'ArrowRight'];
    if (fy > 0.66) codes.push('ArrowDown'); else if (fy < 0.2 && menuUp()) codes.push('ArrowUp');
    return codes;
  }
  const fingers = new Map();   // touch identifier -> { zone, codes }
  function setCodes(f, codes) {
    for (const c of f.codes) if (!codes.includes(c)) release(c);
    for (const c of codes) if (!f.codes.includes(c)) press(c);
    f.codes = codes;
  }
  function zoneAt(t) {
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el || !root.contains(el)) return null;
    return el === pad || pad.contains(el) ? 'pad' : el === jumpB ? 'jump' : el === swB ? 'sw' : el === pauseB ? 'pause' : null;
  }
  function begin(t) {   // a finger lands (or moves after a blur dropped it): the zone under it decides what it holds
    const z = zoneAt(t); if (!z) return;
    if (z === 'pause') { tap('KeyP'); return; }
    const f = { zone: z, codes: [] }; fingers.set(t.identifier, f);
    setCodes(f, z === 'pad' ? padCodes(t) : [z === 'jump' ? 'KeyZ' : 'KeyX']);
    (z === 'pad' ? pad : z === 'jump' ? jumpB : swB).classList.add('on');
  }
  root.addEventListener('touchstart', e => {
    e.preventDefault(); root.classList.remove('kb');
    for (const t of e.changedTouches) begin(t);
  }, { passive: false });
  root.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) { const f = fingers.get(t.identifier); if (!f) begin(t); else if (f.zone === 'pad') setCodes(f, padCodes(t)); }
  }, { passive: false });
  function end(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const f = fingers.get(t.identifier); if (!f) continue;
      setCodes(f, []); fingers.delete(t.identifier);
      const el = f.zone === 'pad' ? pad : f.zone === 'jump' ? jumpB : swB;
      if (![...fingers.values()].some(o => o.zone === f.zone)) el.classList.remove('on');
    }
  }
  root.addEventListener('touchend', end, { passive: false }); root.addEventListener('touchcancel', end, { passive: false });
  // taps on the canvas itself (portraits, menus, dialogue) go to the engine's pointer handlers; just keep the page from scrolling or zooming
  document.addEventListener('touchmove', e => { if (!root.contains(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchstart', () => root.classList.remove('kb'), { passive: true });
  addEventListener('keydown', e => { if (e.isTrusted) root.classList.add('kb'); });
  window.DDTouch = { on: () => !root.classList.contains('kb') };   // prompts say JUMP (the on-screen button) while the overlay is up   // a real key: a keyboard is here, step aside
  addEventListener('blur', () => { for (const c in held) held[c] = 0; fingers.clear(); });   // the engine drops its keys on blur too
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  // ---- modes: play, title (the level's controls card, which names these buttons), menu, tap (dialogue, blue card, pause menu,
  // results: all taps on the canvas) and cut. Polled every frame.
  function mode() {
    const D = window.DD, G = D && D.G;
    if (!D || D.inMenu || !G) return 'menu';
    if (D.cut) return 'cut';
    if (G.state === 'pause') return G.pm && G.pm.opt ? 'menu' : 'tap';   // the pause menu's OPTIONS run the menu screens
    if (G.done || (G.intro >= 72 && (G.fact || (G.dlg && (G.dlg.cur || G.dlg.q.length))))) return 'tap';   // 72: engine.js INTRO_T, when talk starts pausing play
    return G.state === 'title' ? 'title' : 'play';
  }
  const cutHeld = new Set();   // a cutscene: a finger anywhere is JUMP (tap to move a caption on, hold to skip), which the canvas alone can't give
  let cur = '';
  (function poll() {
    const m = mode();
    if (m !== cur) {   // into or out of a menu or a cutscene the buttons change meaning: let go of everything. A thumb held on the pad
      if (/menu|cut/.test(m + cur)) { releaseAll(); cutHeld.clear(); }   // through a line of dialogue keeps holding, like a held key
      root.classList.remove('m-' + cur); root.classList.add('m-' + m); cur = m;
    }
    requestAnimationFrame(poll);
  })();
  document.addEventListener('touchstart', e => { if (cur !== 'cut') return; for (const t of e.changedTouches) if (!cutHeld.has(t.identifier)) { cutHeld.add(t.identifier); press('KeyZ'); } }, { passive: true });
  const cutEnd = e => { for (const t of e.changedTouches) if (cutHeld.delete(t.identifier)) release('KeyZ'); };
  document.addEventListener('touchend', cutEnd, { passive: true }); document.addEventListener('touchcancel', cutEnd, { passive: true });

  const portrait = matchMedia('(orientation: portrait)');
  (portrait.addEventListener ? portrait.addEventListener.bind(portrait, 'change') : portrait.addListener.bind(portrait))(() => releaseAll());

  // ---- scale: same fill as engine.js, refit on rotation and when the phone's toolbars slide in and out
  function fit() {
    const k = Math.min(innerWidth / VW, innerHeight / VH);
    cv.style.width = VW * k + 'px'; cv.style.height = VH * k + 'px';
    cv.style.marginTop = Math.max(0, Math.floor((innerHeight - VH * k) / 2)) + 'px';
    const bar = (innerWidth - VW * k) / 2;   // the side bars beside a 16:9 game on a wider phone: menu pills sit out there when they fit
    root.style.setProperty('--bar', bar + 'px'); root.classList.toggle('wide', bar >= 72);
  }
  addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 50));
  if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  fit();
})();
