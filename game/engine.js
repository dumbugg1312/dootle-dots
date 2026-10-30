(function () {
'use strict';
// Dootle Dots engine: physics, Dots, fans and the feud, popcorn, bodies, boss pattern, camera, HUD, audio, font, title and results.
// Level content lives in game/levels/<id>.js (window.LEVEL); see game/ENGINE.md for the plugin API (window.DD).
// The Dots, fans and props use the hand-drawn sprites from design/sprites.
// Controls: move, jump, switch Dot (plus down in the air for Baxter's slam). Feel targets Mario: momentum running, speed-boosted variable jumps, coyote time, jump buffering,
// corner correction, stomp bounces, hit-stop, squash and stretch, and a platform-snapping camera.

const DD = window.DD = { spriteDir: '../design/sprites/' };
const TS = 16, VW = 320, VH = 180;
let L = null, LW = 0, LH = 0;   // the running level's data and its size in pixels
const cv = document.getElementById('c'), ctx = cv.getContext('2d', { willReadFrequently: true });   // the Dot's rim light reads the set behind it now and then; at 320x180 a CPU canvas is cheap
const Q = new URLSearchParams(location.search);
const NOPAUSE = !!window.DD_NOPAUSE || Q.has('sim');   // headless tests and bot sims: dialogue and cards run alongside play instead of pausing it

function fit() {   // fill the window edge to edge (16:9, so bars only on the side that doesn't match), even when that is not a whole number of pixels
  const k = Math.min(innerWidth / VW, innerHeight / VH);
  cv.style.width = VW * k + 'px'; cv.style.height = VH * k + 'px';
  cv.style.marginTop = Math.max(0, Math.floor((innerHeight - VH * k) / 2)) + 'px';
}
addEventListener('resize', fit); fit();

// ---------------------------------------------------------------- sprites
const IMG = {};
function loadSprites(list) {   // names of PNGs in design/sprites (no extension); already-loaded names are skipped
  for (const n of list) if (!IMG[n]) { const i = new Image(); i.src = DD.spriteDir + n + '.png'; IMG[n] = i; }
}
loadSprites(['sam', 'mel', 'cloud', 'baxter', 'greggheads_a', 'greggheads_b', 'timheads_a', 'timheads_b',
  'vhs', 'pop', 'pop_s', 'tub', 'card', 'popper_off', 'popper_on', 'tim', 'gregg', 'portrait_tim', 'portrait_gregg',
  'sam_anim', 'mel_anim', 'cloud_anim', 'baxter_anim']);   // the Dots' animation strips (design/sprites/dotframes.py)
const ready = n => !!IMG[n] && IMG[n].complete && IMG[n].naturalWidth > 0;
// draw a sprite by its bottom-centre, optionally flipped, squashed or rotated
function spr(n, x, y, flip = false, sx = 1, sy = 1, rot = 0, alpha = 1) {
  if (!ready(n)) return;
  const i = IMG[n];
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (rot) { ctx.translate(0, -i.height / 2); ctx.rotate(rot); ctx.translate(0, i.height / 2); }
  ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(i, -Math.round(i.width / 2), -i.height);
  ctx.restore();
}

// ---------------------------------------------------------------- 3x5 pixel font
const GLYPH = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010',
  ':': '000010000010000', '-': '000000111000000', '/': '001001010100100', "'": '010010000000000', '(': '001010010010001',
  ')': '100010010010100', '+': '000010111010000', '♥': '101111111010000', '=': '000111000111000', '_': '000000000000111', '*': '000101010101000', '#': '101111101111101', '"': '101101000000000', '<': '001010100010001', '>': '100010001010100', ';': '000010000010100', '[': '110100100100110', ']': '011001001001011', '$': '011110010011110', '@': '010101111100011', '~': '000011110000000', '%': '101001010100101', '&': '010101010101011', ' ': '000000000000000'
};
function text(str, x, y, col = '#fff', s = 1, shadow = '#000', align = 'left') {
  str = String(str).toUpperCase();
  const w = str.length * 4 * s - s;
  if (align === 'center') x -= Math.floor(w / 2); else if (align === 'right') x -= w;
  let outline = false;
  if (AUTOINK && str.trim()) { const k = inkCached(str, col, shadow, x, y, w, s); col = k.col; outline = k.outline; }
  // outline: the drop shadow goes all the way round, so light type still reads on a pale patch of sky
  const passes = !shadow ? [[col, 0, 0]] : outline ? [[shadow, -s, 0], [shadow, s, 0], [shadow, 0, -s], [shadow, 0, s], [shadow, s, s], [col, 0, 0]] : [[shadow, s, s], [col, 0, 0]];
  for (const [c, dx, dy] of passes) {
    ctx.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const g = GLYPH[str[i]] || GLYPH['?'];
      for (let p = 0; p < 15; p++) if (g[p] === '1')
        ctx.fillRect(Math.round(x) + i * 4 * s + (p % 3) * s + dx, Math.round(y) + Math.floor(p / 3) * s + dy, s, s);
    }
  }
}

// ---------------------------------------------------------------- legible type: every string is checked against what is already drawn under it
// Text that would fall under WCAG contrast (4.5:1 for the 3x5 font at 1x, 3:1 at 2x and up) is fixed at draw time, keeping its hue:
// shadowed light type on a light patch gets its shadow as a full outline; anything else moves lighter or darker just far enough.
// Colours that already read are untouched. ?rawink turns it off (for before/after shots).
const AUTOINK = !Q.has('rawink');
const RGB = new Map(), INKED = new Map(), SEEN = new Map();
let inkNew = 8, inkOld = 2;   // fresh reads of the canvas per frame (each one stalls the canvas a little): new strings, and re-checks; frame() refills them
function inkCached(str, col, shadow, x, y, w, s) {   // a string keeps its fix for about a third of a second, so most frames only look it up
  const key = str + '|' + col + '|' + s + '|' + shadow + '|' + (x >> 5) + ',' + (y >> 5), now = performance.now(), hit = SEEN.get(key);
  if (hit) { if (now < hit.t || inkOld <= 0) return hit.k; inkOld--; }
  else { if (inkNew <= 0) return { col, outline: false }; inkNew--; }
  if (SEEN.size > 3000) SEEN.clear();
  const k = ink(col, shadow, x, y, w, s); SEEN.set(key, { k, t: now + 250 + Math.random() * 150 }); return k;   // staggered, so the re-checks don't all land on one frame
}
function rgbOf(c) {   // '#rgb', '#rrggbb', 'rgb()' or 'rgba()' to [r, g, b, a], cached
  let v = RGB.get(c); if (v) return v;
  const s = String(c).trim(); let m;
  if (s[0] === '#') { const h = s.length === 4 ? s.slice(1).split('').map(d => d + d).join('') : s.slice(1, 7); v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1); }
  else if ((m = s.match(/rgba?\(([^)]+)\)/))) { const p = m[1].split(',').map(Number); v = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  else v = [255, 255, 255, 1];
  if (v.some(n => isNaN(n))) v = [255, 255, 255, 1];
  RGB.set(c, v); return v;
}
const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lumOf = (r, g, b) => 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function fromHsl(h, s, l) {
  const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (!s) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(v => Math.round(v * 255));
}
function ink(col, shadow, x, y, w, s) {
  const plain = { col, outline: false };
  if (rgbOf(col)[3] < 1) return plain;   // see-through type is a watermark or a ghost on purpose
  if (!ctx.getImageData || !ctx.getTransform) return plain;   // the node test harness's stub canvas
  const m = ctx.getTransform(); if (!m || m.b || m.c || m.a <= 0 || m.d <= 0) return plain;
  const X0 = Math.max(0, Math.floor(m.a * x + m.e) - 1), Y0 = Math.max(0, Math.floor(m.d * y + m.f) - 1);
  const X1 = Math.min(cv.width, Math.ceil(m.a * (x + w) + m.e) + 1), Y1 = Math.min(cv.height, Math.ceil(m.d * (y + 5 * s) + m.f) + 1);
  if (X1 - X0 < 1 || Y1 - Y0 < 1) return plain;
  let px; try { px = ctx.getImageData(X0, Y0, X1 - X0, Y1 - Y0).data; } catch (e) { return plain; }
  const ls = []; for (let i = 0; i < px.length; i += 8) ls.push(lumOf(px[i], px[i + 1], px[i + 2]));   // every other pixel is plenty
  ls.sort((a, b) => a - b);
  const bg = ls[ls.length >> 1], need = s * m.a >= 2 ? 3 : 4.5, [r, g, b] = rgbOf(col), fl = lumOf(r, g, b);
  if (ratio(fl, bg) >= need) return plain;
  if (shadow) { const [sr, sg, sb] = rgbOf(shadow), sl = lumOf(sr, sg, sb); if (sl < fl && ratio(fl, sl) >= need && bg > sl) return { col, outline: true }; }
  const key = col + '|' + need + '|' + Math.round(bg * 40);   // backgrounds bucketed, so type over moving scenery doesn't shimmer
  let out = INKED.get(key);
  if (!out) {
    const [h, sa, l0] = toHsl(r, g, b), up = ratio(1, bg) >= need && (fl >= bg || ratio(0, bg) < need) ? 1 : -1;
    let c = [r, g, b];
    for (let l = l0; l >= 0 && l <= 1; l += up * 0.02) { c = fromHsl(h, sa, Math.max(0, Math.min(1, l))); if (ratio(lumOf(c[0], c[1], c[2]), bg) >= need * 1.1) break; }   // a little over, for the pixels either side of the median
    out = 'rgb(' + c.join(',') + ')'; INKED.set(key, out);
  }
  return { col: out, outline: false };
}

// ---------------------------------------------------------------- audio: tiny synth, unlocked on first input
let AC = null, MASTER = null, TR = null, TRQ = false;   // TR: the trailer running (DD.trailer); TRQ: its world is stepping right now, so the synth stays quiet
// volume settings (options menu): music, sound effects and voices, 0-10 each, remembered. music.js and voice.js read DDVol too
const DDVol = window.DDVol = (() => {
  let v = { music: 10, sfx: 10, voice: 10 };
  try { Object.assign(v, JSON.parse(localStorage.getItem('dd-vol')) || {}); } catch (e) {}
  return {
    get: k => v[k] / 10,
    level: k => v[k],
    set(k, n) { v[k] = Math.max(0, Math.min(10, n)); try { localStorage.setItem('dd-vol', JSON.stringify(v)); } catch (e) {} if (k === 'sfx' && MASTER) MASTER.gain.value = 0.5 * DDVol.get('sfx'); if (k === 'music' && window.DDMusic && window.DDMusic.applyVol) window.DDMusic.applyVol(); },
  };
})();
function initAudio() {
  if (AC) return;
  try { AC = new AudioContext(); MASTER = AC.createGain(); MASTER.gain.value = 0.5 * DDVol.get('sfx'); MASTER.connect(AC.destination); } catch (e) { AC = null; }
}
function tone(f0, f1, dur, type = 'square', vol = 0.08, delay = 0) {
  if (!AC || TRQ) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(MASTER); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.1, freq = 800, delay = 0) {
  if (!AC || TRQ) return;
  const t = AC.currentTime + delay, n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(MASTER); s.start(t);
}
let CUT = null;   // the cutscene playing (game/cutscene.js, DD.setCut): it holds the stage while it runs and draws over it
const cue = (kind, o) => { const C = window.DDCut; return !!(C && !TR && !NOPAUSE && L && G && C.cue(kind, o)); };   // a stage moment that may open a cutscene: 'open', 'boss_in', 'boss_out', 'goal', 'tick'
const vo = (h, o) => { const V = window.DDVoice; if (V && !TR) V.say(h, o); };   // the trailer never talks   // soundbites (game/voice.js)
const SFX = {
  jump: () => tone(260, 620, 0.13, 'square', 0.06),
  dj: () => { tone(420, 980, 0.12, 'square', 0.06); tone(840, 1400, 0.08, 'triangle', 0.04, 0.04); },
  land: v => noise(0.05 + v * 0.01, 0.05 + v * 0.02, 500),
  skid: () => noise(0.12, 0.05, 1800),
  stomp: () => { tone(700, 160, 0.14, 'square', 0.08); noise(0.08, 0.08, 1200); },
  pop: p => { tone(1046 * p, 1046 * p, 0.04, 'square', 0.035); tone(1568 * p, 1568 * p, 0.07, 'square', 0.035, 0.04); },
  star: () => [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, f, 0.09, 'square', 0.045, i * 0.05)),   // GERM FREE starts
  shield: () => { tone(220, 220, 0.05, 'square', 0.07); tone(880, 1320, 0.16, 'triangle', 0.06, 0.05); },   // MISTRIAL: a hit that doesn't count
  ko: p => { tone(180 * p, 900 * p, 0.18, 'sawtooth', 0.05); noise(0.15, 0.08, 2400); },
  scuffle: () => noise(0.5, 0.06, 3000),
  hurt: () => tone(500, 90, 0.35, 'sawtooth', 0.08),
  slam: () => { noise(0.35, 0.3, 260); tone(130, 35, 0.3, 'sine', 0.25); },
  wind: () => tone(900, 300, 0.12, 'triangle', 0.05),
  switch: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.08, 'square', 0.05, i * 0.05)),
  cp: () => [660, 880, 1320].forEach((f, i) => tone(f, f, 0.12, 'triangle', 0.08, i * 0.08)),
  thud: () => { noise(0.2, 0.2, 300); tone(90, 50, 0.2, 'sine', 0.2); },
  tub: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, f * 1.01, 0.06, 'square', 0.05, i * 0.03)),
  tick: () => tone(1800, 1800, 0.03, 'square', 0.03),
  vhs: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.14, 'triangle', 0.08, i * 0.09)),
  gate: () => { noise(0.6, 0.08, 600); [330, 440, 554].forEach((f, i) => tone(f, f, 0.15, 'square', 0.05, 0.2 + i * 0.1)); },
  goal: () => [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, f, 0.16, 'square', 0.06, i * 0.11)),
  fall: () => tone(800, 120, 0.5, 'triangle', 0.07),
  head: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.07, 'square', 0.05, i * 0.04)),
  boing: () => { tone(320, 760, 0.12, 'sine', 0.08); tone(760, 420, 0.1, 'sine', 0.05, 0.1); },
  buzz: () => tone(150, 110, 0.14, 'square', 0.06),
  count: k => tone(520 + k * 12, 520 + k * 12, 0.025, 'square', 0.03),   // results tally tick, k rises with the count
  bag: () => { tone(660, 990, 0.06, 'square', 0.05); tone(1320, 1320, 0.1, 'triangle', 0.05, 0.05); },   // a bag fills
  blip: f => tone(f, f * 1.04, 0.03, 'square', 0.016),   // one letter of narration
};

// ---------------------------------------------------------------- input (keyboard + gamepad), edge-detected per step
const keys = {}, hits = {};
addEventListener('keydown', e => {
  if (!keys[e.code]) hits[e.code] = true;
  keys[e.code] = true; initAudio();
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let padNote = null, padSeen = {};   // padNote { s, until }: a strip saying a controller just showed up (or went away). readInput polls for pads every frame, so the first
const notePad = s => { padNote = { s, until: performance.now() + 2500 }; };   // button or stick push the browser passes on connects it, connection events or not
const KJ = ['KeyZ', 'Space', 'KeyK', 'ArrowUp', 'KeyW'], KS = ['KeyX', 'KeyC', 'KeyJ', 'KeyL', 'ShiftLeft', 'ShiftRight', 'Tab'];
const ORDER = ['sam', 'mel', 'cloud', 'baxter'];
const PORTRAITS = ORDER.map((dot, i) => ({ dot, x: VW - 84 + i * 20, y: 4, w: 18, h: 22 }));
let padPrev = {}, padNav = {}, padUsed = false, SCRIPT = null, clickPick = null, clickAt = null;   // per-controller button state (edges), and whether the controller was the last thing used (for the prompts)
cv.addEventListener('pointerdown', e => {
  initAudio();
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * VW / r.width, y = (e.clientY - r.top) * VH / r.height;
  for (const q of PORTRAITS) if (x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h) { clickPick = q.dot; return; }
  clickAt = { x, y };   // read once by the screen that's up: title card, dialogue, blue card, pause menu, results
});
const PAUSEBTN = { x: VW - 102, y: 6, w: 14, h: 14 };   // the HUD's pause button, for mouse players
const inBox = (c, x, y, w, h) => c && c.x >= x && c.x < x + w && c.y >= y && c.y < y + h;
const IN = { l: false, r: false, d: false, j: false, jp: false, dp: false, sp: false, pick: null, start: false };
function readInput() {
  const any = list => list.some(k => keys[k]), hit = list => list.some(k => hits[k]);
  let l = any(['ArrowLeft', 'KeyA']), r = any(['ArrowRight', 'KeyD']), d = any(['ArrowDown', 'KeyS']);
  let j = any(KJ), jp = hit(KJ), dp = hit(['ArrowDown', 'KeyS']), sp = hit(KS), start = hit(['Enter', 'Escape', 'KeyP']);
  let pick = clickPick; clickPick = null; const click = clickAt; clickAt = null;
  let ok = hit(['Enter', 'Space', 'KeyZ']);   // menu confirm (jp also fires on ArrowUp, so menus use ok/back)
  let nx = (hit(['ArrowRight', 'KeyD']) ? 1 : 0) - (hit(['ArrowLeft', 'KeyA']) ? 1 : 0), ny = (hit(['ArrowDown', 'KeyS']) ? 1 : 0) - (hit(['ArrowUp', 'KeyW']) ? 1 : 0);
  ORDER.forEach((dot, i) => { if (hits['Digit' + (i + 1)]) pick = dot; });
  let back = hit(['Escape', 'KeyX', 'Backspace']), spPrev = false, again = false, opt = hit(['KeyO']), store = hit(['KeyH']);
  if (Object.keys(hits).length) padUsed = false;   // a key was pressed: show keyboard prompts
  let anyIn = Object.keys(hits).length > 0 || !!click;   // any key, click or controller button at all: "press start" screens take it
  const pads = navigator.getGamepads ? navigator.getGamepads() : [], live = {};
  for (const p of pads) {   // PS4 / standard layout: 0 cross, 1 circle, 2 square, 3 triangle, 4 L1, 5 R1, 9 options, 12-15 d-pad
    if (!p || p.connected === false) continue;
    live[p.index] = true; if (!padSeen[p.index]) { padSeen[p.index] = true; notePad('CONTROLLER CONNECTED'); }
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, B = i => !!(p.buttons[i] && p.buttons[i].pressed), was = padPrev[p.index] || {}, nav = padNav[p.index] || {};
    const pd = ay > 0.5 || B(13), pj = B(0), pc = B(1), psw = B(5), pl1 = B(4), pt = B(3), ps = B(9), psq = B(2);
    const pa = p.buttons.some(b => b && b.pressed) || p.axes.slice(0, 4).some(a => Math.abs(a) > 0.5);   // anything on the pad: every button (PS, touchpad, share too) and either stick
    if (pa) padUsed = true;
    anyIn = anyIn || (pa && !was.a);
    l = l || ax < -0.4 || B(14); r = r || ax > 0.4 || B(15); d = d || pd;
    j = j || pj; ok = ok || (pj && !was.j); jp = jp || (pj && !was.j); sp = sp || (psw && !was.sw); spPrev = spPrev || (pl1 && !was.l1);
    start = start || (ps && !was.s); opt = opt || (ps && !was.s); dp = dp || (pd && !was.d); back = back || (pc && !was.c); again = again || (pt && !was.t); store = store || (psq && !was.q);
    padPrev[p.index] = { j: pj, sw: psw, l1: pl1, s: ps, d: pd, c: pc, t: pt, q: psq, a: pa };
    const nl = ax < -0.5 || B(14), nr = ax > 0.5 || B(15), nu = ay < -0.5 || B(12);
    nx += (nr && !nav.r ? 1 : 0) - (nl && !nav.l ? 1 : 0); ny += (pd && !nav.d ? 1 : 0) - (nu && !nav.u ? 1 : 0); padNav[p.index] = { l: nl, r: nr, u: nu, d: pd };
  }
  for (const i in padSeen) if (!live[i]) { delete padSeen[i]; delete padPrev[i]; notePad('CONTROLLER DISCONNECTED'); }
  if (SCRIPT) { const s = SCRIPT(G ? G.frame : 0); l = s.l; r = s.r; j = s.j; jp = s.jp; d = !!s.d; dp = !!s.dp; sp = !!s.sp; pick = s.pick || null; start = !!s.start; ok = !!s.ok; nx = s.nx | 0; ny = s.ny | 0; }   // start/ok/nx/ny: pause-menu input for tests
  Object.assign(IN, { l, r, d, j, jp, dp, sp, spPrev: !SCRIPT && spPrev, pick, start, nx, ny, ok, back, click, opt: !SCRIPT && opt, store: !SCRIPT && store, any: !SCRIPT && anyIn, quit: hit(['KeyQ']) });
  if (again && G && G.done && G.done.card) G.restartReq = true;   // triangle on the results card: play it again
  for (const k in hits) delete hits[k];
}

// ---------------------------------------------------------------- tuning: the feel lives here (px per frame at 60fps)
const P = {
  walk: 1.3, run: 2.1,             // top speeds: hold a direction and you build from walk to run, Mario style
  accWalk: 0.06, accRun: 0.02,     // quick to walk speed, then a slower build to a full run
  fric: 0.08, skid: 0.15,          // release slows you; reversing at speed skids
  airAcc: 0.055, airDrag: 0.995,
  airTurn: 0.1,                    // pushing against your momentum in the air bites harder, so you can steer back onto a ledge (not during a knock-back)
  jump: 4.6, jumpRun: 0.45,        // jump strength, plus a bonus that scales with running speed
  gUp: 0.19, gApex: 0.11, gDown: 0.5, gCut: 0.6, term: 5.5,   // held rise, apex hang, fall, released-early rise, max fall
  gEase0: 0.6, gEase1: 2.6,        // past the apex, held-jump gravity eases from gApex to gDown across this fall speed: no jolt, same airtime as the old hard switch
  coyote: 6, buffer: 7, corner: 5,
  ledge: 4,                        // feet this many px short of a ledge top in the air: pop up onto it instead of stopping at the wall
  dj: 4.2,                         // Sam's second jump
  glide: 0.8,                      // Cloud's max fall while holding jump
  melRun: 2.4, melRoll: 1.9,       // Mel runs a little faster, and curls into a bowling ball above melRoll
  slamWind: 9, slamV: 8,           // Baxter: hang, then drop
  stompBounce: 3.9, stompBounceHeld: 5.3,
};
const P0 = Object.assign({}, P);   // the base feel; build() puts it back, then applies the HEI store's jump and speed upgrades
const DOTS = {
  sam: { w: 12, h: 20, name: 'SAM', col: '#f89a3a', how: 'JUMP AGAIN IN THE AIR' },
  mel: { w: 12, h: 14, name: 'MEL', col: '#8a54e2', how: 'TINY. RUN TO ROLL INTO FANS' },
  cloud: { w: 18, h: 17, name: 'CLOUD', col: '#b8c4ec', how: 'HOLD JUMP TO FLOAT' },
  baxter: { w: 10, h: 32, name: 'BAXTER', col: '#3078e8', how: 'PRESS DOWN IN THE AIR TO SLAM' },
};
const GHOSTDOT = { S: 'sam', M: 'mel', C: 'cloud', B: 'baxter' };

// ---------------------------------------------------------------- world state
let G, grid, gkind, bodies, fans, pops, loose, parts, popsTotal;
const T = (x, y) => (x < 0 || x >= L.W) ? 1 : (y < 0 || y >= L.H) ? 0 : grid[y * L.W + x];
// tile kinds -> collision type: 1 solid, 2 one-way (land from above), 3 breakable by Baxter's slam. Levels add their own via LEVEL.KINDS
const TILE0 = { solid: 1, oneway: 2, cracked: 3, carpet: 1, seat: 1, riser: 1, flat: 1, ledge: 1, catwalk: 2 };
let TILE = TILE0;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const cx = e => e.x + e.w / 2, bot = e => e.y + e.h;

function build() {
  Object.assign(P, P0);
  const K = (!TR && DD.opts && DD.opts.perks) || {};   // the HEI store's upgrades (store.js perks()); never in a trailer or the node tests
  if (K.speed > 1) for (const k of ['walk', 'run', 'melRun', 'accWalk', 'accRun', 'airAcc']) P[k] *= K.speed;
  if (K.jump > 1) { P.jump *= K.jump; P.dj *= K.jump; }
  grid = new Uint8Array(L.W * L.H); gkind = new Array(L.W * L.H).fill(null);
  bodies = []; fans = []; pops = []; loose = []; parts = [];
  for (const [k, x, y, w, h] of L.SOLID) {
    if (k === 'gate') { bodies.push({ kind: 'gate', x: x * TS, y: y * TS, y0: y * TS, w: w * TS, h: h * TS, on: true, lift: 0, open: false }); continue; }
    if (TILE[k] === undefined && k !== 'hole' && k !== 'dip') console.warn('unknown tile kind: ' + k);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= L.W || yy < 0 || yy >= L.H) continue;
      const i = yy * L.W + xx;
      if (k === 'hole' || k === 'dip') { grid[i] = 0; gkind[i] = null; } else { grid[i] = TILE[k] || 0; gkind[i] = k; }
    }
  }
  if (L.GHOST_KERNELS) { const [kx, ky, kl] = L.GHOST_KERNELS; bodies.push({ kind: 'kernel', x: kx * TS, y: ky * TS, w: kl * TS, h: TS, on: false, t: 0 }); }
  G = {
    frame: 0, state: Q.has('warp') || Q.has('sim') ? 'play' : 'title', got: 0, vhs: false, hitstop: 0, shake: 0,
    banner: null, cp: null, cardT: (L.CARD_LANES || []).map(() => 0), gateRespawn: 0, done: null, restartReq: false, combo: 0, comboT: 0, chain: 0,
    secrets: {}, dsec: {}, dsecT: 0, heads: {}, cards: [], seen: { sam: true }, denyT: 0, met: {}, bq: [], things: {}, s: {}, boss: null,   // s: free scratch space for level scripts
    intro: 0, dlg: { q: [], cur: null, last: null, show: 0, gap: 0 }, lineSeen: {}, fall: null, pm: { sel: 0 }, hudGot: 0, cntT: 0, cntDir: 1, bagN: 0, bagWig: [0, 0, 0, 0, 0, 0],
    pk: K, shield: K.shield || 0, takes: K.takes || 0, star: K.star || 0, perkT: 0,   // what's left of this run's MISTRIAL hits, TAKE TWO falls and GERM FREE frames
  };
  let start = { x: 16, y: 20 * TS };
  for (const th of L.THINGS) {
    const [k, x, y] = th, px = x * TS, py = y * TS;
    if (k === 'dot') start = { x: px + 2, y: (y + 1) * TS };
    else if (k === 'gh' || k === 'th') fans.push(makeFan(k, px, py, (L.GATE_FANS || []).includes(x)));
    else if (k.startsWith('ghost')) bodies.push({ kind: 'ghost', dot: GHOSTDOT[k[5]], x: px, y: py + TS, w: 0, h: 0, on: false });
    else if (k === 'cp') bodies.push({ kind: 'cp', x: px + 6, y: (y + 2) * TS - 32, w: 20, h: 32, on: false, lit: false });
    else if (k === 'crate') bodies.push({ kind: 'crate', x: px, y: py, w: 48, h: 32, vy: 0, on: true });
    else if (k === 'stack') bodies.push({ kind: 'stack', x: px, y: py, ty: py, w: 32, h: 64, vy: 0, on: false, state: 'hidden' });
    else if (k === 'tub') bodies.push({ kind: 'tub', x: px, y: (y + 2) * TS - 22, w: 16, h: 22, on: true, squash: 0 });
    else if (k === 'plate') bodies.push({ kind: 'plate', x: px - TS, y: (y + 1) * TS - 3, w: 3 * TS, h: 3, on: false, lit: 0 });
    else if (k === 'vhs') bodies.push({ kind: 'vhs', x: px, y: py, w: 16, h: 24, on: false, got: false });
    else if (k === 'dsec') { const d = th[3] in DOTS ? th[3] : 'sam'; bodies.push({ kind: 'dsec', dot: d, x: px, y: py, w: 16, h: 16, on: false, got: false, had: !TR && !!DD.opts && (DD.opts.dsec || []).includes(d) }); }   // a Dot secret (args[0]: whose); had = found on an earlier run
    else if (k === 'gchip') bodies.push({ kind: 'gchip', x: px + 1, y: py + 1, w: 14, h: 14, on: false, got: false, had: !TR && !!window.DDCasino && window.DDCasino.hasChip(L.id) });   // the world's gold chip: three free bets at the casino
    else if (k === 'goal') bodies.push({ kind: 'goal', x: px, y: py, w: 48, h: 8 * TS, on: false });
    else if (ENT[k]) spawn(k, { x: px, y: py, tx: x, ty: y, args: th.slice(3) });
    else (G.things[k] = G.things[k] || []).push({ kind: k, x: px, y: py, tx: x, ty: y, args: th.slice(3) });   // unknown kinds are kept for level scripts
  }
  G.dsecDots = ORDER.filter(d => bodies.some(b => b.kind === 'dsec' && b.dot === d)); G.dsecHad = bodies.filter(b => b.kind === 'dsec' && b.had).map(b => b.dot);   // this stage's Dot secrets, and the ones already on the save
  for (const [x, y, n] of L.POPCORN || []) for (let i = 0; i < n; i++) addPop(x + i, y);
  for (const [x, y] of L.CLOUD_ARC || []) addPop(x, y, 'cloud');
  popsTotal = pops.length;
  unbury();
  if (K.bags) G.got = G.hudGot = Math.ceil(popsTotal * Math.min(6, K.bags) / 5);   // OUTSIDE FOOD: bags already in hand (level 6, with SIX BAGS: five and a spare)
  G.bagN = Math.floor(5 * bagFrac());
  if (L.boss) G.boss = makeBoss(L.boss);
  G.owned = ((DD.opts && DD.opts.dots) || ORDER).filter(k => k in DOTS); if (!G.owned.length) G.owned = ['sam'];   // the Dots in the cast so far (menu.js hands them over; all four otherwise)
  G.lockT = {};
  let d = Q.get('dot') in DOTS ? Q.get('dot') : 'sam'; if (!G.owned.includes(d)) d = G.owned[0];
  G.pl = makePlayer(d, start.x, start.y);
  if (Q.has('warp')) warp(+Q.get('warp'));
  const s0 = { x: G.pl.x, y: G.pl.y, f: bot(G.pl) }; G.safe = Object.assign({}, s0); G.cpSafe = Object.assign({}, s0); G.startSafe = s0; G.landed = true;
  placeFact();
  G.cam = { x: clamp(cx(G.pl) - VW / 2, 0, LW - VW), y: clamp(bot(G.pl) - VH * CAM_FEET, 0, LH - VH), look: 0 };
  hook('init', G); if (!TR) setTimeout(() => vo('level_start'), 600);
}
function unbury() {   // safety net: a kernel or pickup placed inside solid tiles is lifted to the first open space above it
  const solidAt = (x, y) => { const t = T(Math.floor(x / TS), Math.floor(y / TS)); return t === 1 || t === 3; };
  for (const c of pops) {
    if (!solidAt(c.x, c.y)) continue;
    const y0 = c.y; for (let n = 0; n < 8 && solidAt(c.x, c.y); n++) c.y -= TS;
    if (solidAt(c.x, c.y)) {   // inside a tall wall: take the nearest open spot to either side at its own height
      c.y = y0; const x0 = c.x;
      for (let d = 1; d <= 12 && solidAt(c.x, c.y); d++) { if (!solidAt(x0 - d * TS, y0)) c.x = x0 - d * TS; else if (!solidAt(x0 + d * TS, y0)) c.x = x0 + d * TS; }
    }
  }
  for (const b of bodies) if (b.kind === 'vhs' || b.kind === 'cp' || b.kind === 'gchip') {
    const inside = () => { for (let y = b.y; y < b.y + b.h; y += 4) for (let x = b.x; x < b.x + b.w; x += 4) if (!solidAt(x, y)) return false; return true; };
    for (let n = 0; n < 8 && inside(); n++) b.y -= TS;
  }
}
function addPop(x, y, tag) { pops.push({ x: x * TS + 8, y: y * TS + 8, got: false, tag, ph: (x * 7 + y * 3) % 60 }); popsTotal = pops.length; }
function setTile(x, y, kind) {   // change one tile at runtime: kind string, or null to clear
  if (x < 0 || x >= L.W || y < 0 || y >= L.H) return;
  const i = y * L.W + x; grid[i] = kind ? TILE[kind] || 0 : 0; gkind[i] = kind || null;
  depthMap = null;   // the ground's depth shading follows the change
}
const classic = () => (window.CLASSICS || {})[L.id];   // this stage's Popcorn Classic tape, rating extra and blue card (classics.js)
const bagFrac = () => popsTotal ? Math.min(1, G.got / popsTotal) : 1;
function makePlayer(dot, x, bottom) {
  const D = DOTS[dot];
  return { dot, x, y: bottom - D.h, w: D.w, h: D.h, vx: 0, vy: 0, face: 1, ground: null, onGround: false, coyote: 0, buf: 0,
    held: false, usedDJ: false, rolling: false, rollAng: 0, slam: 0, slamT: 0, inv: 0, sx: 1, sy: 1, spin: 0, skidT: 0,
    airMax: P.walk, fallFrom: bottom, anim: 0, glide: false, svx: 0, svy: 0, landT: 0, idleT: 0 };
}
function makeFan(type, x, y, gate) {
  const k = Math.floor(x / TS);
  return { type, x: x + 3, y: y + 4, w: 14, h: 28, vx: 0, vy: 0, dir: -1, state: 'idle', t: 0, anim: k * 7 % 20,
    onGround: false, gate, spawn: { x: x + 3, y: y + 4 }, rot: 0, headless: false, say: null, shouted: false,
    hair: HAIR[k % HAIR.length], ...outfit(type, k) };
}
const SHIRTS = [['#7a1a2a', '#b02a3a', '#e05a5a'], ['#1a4a2a', '#2a7a3a', '#4ab05a'], ['#1a3a6a', '#2a5aa8', '#5a8ae0'], ['#5a2a6a', '#8a4aa8', '#b87ad8'],
  ['#a87416', '#f0c030', '#ffe680'], ['#3a3a44', '#5a5a68', '#8a8a98'], ['#a85a16', '#e8862a', '#ffb860'], ['#8a8478', '#d8d0c0', '#f8f4ea'], ['#0e0c14', '#1c1a26', '#2e2c3c']];
const PANTS = [['#1e1c26', '#34323e'], ['#141a2e', '#243250'], ['#3a2a1a', '#5a4228'], ['#4a4a3a', '#6a6a52'], ['#2a2a30', '#4a4a56']];
const SKINS = [['#9a5440', '#cc8660', '#eeb084', '#fad4ac'], ['#6a3a2a', '#9a5a3a', '#c07a50', '#d89a6a'], ['#3a2018', '#5a3424', '#7a4a32', '#a8704a'], ['#a8746a', '#d8a088', '#f0c8a8', '#fff0e0']];
function outfit(type, k) {   // body colours keyed by the sprite's palette letters
  const sh = SHIRTS[(k * 5 + (type === 'th' ? 3 : 0)) % SHIRTS.length], pa = PANTS[(k * 3) % PANTS.length], sk = SKINS[(k * 7) % SKINS.length];
  const cols = Object.assign({}, FANBODY.pal[type], { s: sk[0], S: sk[1], t: sk[2], T: sk[3] });
  if (type === 'gh') Object.assign(cols, { y: sh[0], Y: sh[1], W: sh[2], k: pa[0], K: pa[1] });
  else Object.assign(cols, { k: sh[0], K: sh[1], n: sh[2], q: pa[0], Q: pa[1] });
  return { cols, skin: sk[2] };
}
function warp(tx) {   // test helper: drop the player onto the highest floor at tile column tx
  for (let ty = 0; ty < L.H; ty++) if (T(tx, ty) && !T(tx, ty - 1) && !T(tx, ty - 2)) { G.pl.x = tx * TS + 2; G.pl.y = ty * TS - G.pl.h; return; }
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;

// ---------------------------------------------------------------- collision (axis separated, tiles + dynamic bodies)
const SOLIDK = { crate: 1, stack: 1, gate: 1, kernel: 1, tub: 1 };
const solidBody = b => b.on && (SOLIDK[b.kind] || (b.def && (typeof b.def.solid === 'function' ? b.def.solid(b) : b.def.solid)));
function moveX(e, dx, useBodies = true) {
  if (!dx) return null;
  e.x += dx;
  let hit = null;
  const y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS);
  const tx = dx > 0 ? Math.floor((e.x + e.w - 0.01) / TS) : Math.floor(e.x / TS);
  for (let ty = y0; ty <= y1; ty++) {
    const t = T(tx, ty);
    if (t === 1 || t === 3) { e.x = dx > 0 ? tx * TS - e.w : (tx + 1) * TS; hit = 'tile'; break; }
  }
  if (useBodies) for (const b of bodies) {
    if (b === e || !solidBody(b) || !ov(e, b)) continue;
    if (bot(e) <= b.y + 2) continue;               // standing on its top edge isn't a side hit
    e.x = dx > 0 ? b.x - e.w : b.x + b.w; hit = b;
  }
  return hit;
}
function moveY(e, dy, useBodies = true, cards = false) {
  e.y += dy;
  let res = null;
  const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TS), prevB = e.y + e.h - dy;
    for (let tx = x0; tx <= x1; tx++) {
      const t = T(tx, ty);
      if (t === 1 || t === 3 || (t === 2 && prevB <= ty * TS + 0.01)) { e.y = ty * TS - e.h; res = { tile: t, tx, ty }; break; }
    }
    for (const b of bodies) {
      if (b === e) continue;
      const isCard = b.kind === 'card';
      if (!(solidBody(b) || (isCard && cards))) continue;
      if (e.x + e.w <= b.x || e.x >= b.x + b.w) continue;
      if (bot(e) > b.y && prevB <= b.y + 0.5 + (isCard ? 1 : 0)) { e.y = b.y - e.h; res = { body: b }; }
    }
  } else if (dy < 0) {
    const ty = Math.floor(e.y / TS);
    for (let tx = x0; tx <= x1; tx++) {
      const t = T(tx, ty);
      if (t === 1 || t === 3) { e.y = (ty + 1) * TS; res = { ceil: true, tx, ty }; break; }
    }
    if (useBodies) for (const b of bodies) {
      if (b === e || !solidBody(b) || !ov(e, b)) continue;
      if (e.y - dy >= b.y + b.h - 0.5) { e.y = b.y + b.h; res = { ceil: true, body: b }; }
    }
  }
  return res;
}
function boxFree(x, y, w, h) {
  const e = { x, y, w, h };
  for (let ty = Math.floor(y / TS); ty <= Math.floor((y + h - 0.01) / TS); ty++)
    for (let tx = Math.floor(x / TS); tx <= Math.floor((x + w - 0.01) / TS); tx++) { const t = T(tx, ty); if (t === 1 || t === 3) return false; }
  for (const b of bodies) if (solidBody(b) && ov(e, b)) return false;
  return true;
}

// ---------------------------------------------------------------- effects
function dust(x, y, n, spread = 1, col = '#d8c8c0') {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 2.2 * spread, vy: -Math.random() * 1.2, life: 18 + Math.random() * 14, max: 32, r: 1 + Math.random() * 2, col, g: -0.01 });
}
function stars(x, y, n = 6, col = '#ffe680') {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; parts.push({ x, y, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, life: 16, max: 16, r: 1.5, col, star: true, g: 0 }); }
}
function sparkle(x, y) {   // a popcorn grab: a little butter-coloured twinkle where the kernel was
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.6; parts.push({ x, y, vx: Math.cos(a) * 1.1, vy: Math.sin(a) * 1.1, life: 10, max: 10, r: 1, col: i % 2 ? '#fff6d4' : '#f2c860', star: true, g: 0 }); }
}
function burst(x, y, n) {   // knockout popcorn: flies up to the counter
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -2.5 - Math.random() * 2, life: 50 + i * 4, max: 50 + i * 4, pop: true, g: 0.12, hud: true });
}
function banner(t, f = 120, sub = '', queue = false) {
  vo('banner', { k: t });   // a stage's set-piece banner can have its own line (game/voice/cues.js: "banner:<TEXT>")
  if (queue && G.banner) { G.bq.push({ t, sub, f, max: f }); return; }
  G.banner = { t, sub, f, max: f };
}
function float(x, y, t, col = '#fff') { if (TR) return; parts.push({ x, y, vx: 0, vy: -0.6, life: 50, max: 50, txt: t, col, g: 0 }); }
function addGot(n, x, y) {
  G.got += n;
  if (n > 1) { burst(x, y, n); float(x, y - 12, '+' + n, '#ffe680'); }
}
const CHAIN_PAY = [0, 0, 2, 3, 5, 8];   // the bonus for the Nth stomp kill in a row without touching the ground; 6 and up pay 10
function chainStomp(x, y) {   // a stomp kill: the chain grows until the Dot lands or gets hurt
  G.hitstop = Math.max(G.hitstop, 2); parts.push({ x, y: y + 4, vx: 0, vy: 0, g: 0, life: 10, max: 10, r: 3, col: '#fff6d4', ring: true });   // the hit lands: a two-frame stop and a ring
  const n = ++G.chain; if (n < 2) return;
  const b = CHAIN_PAY[n] || 10; G.got += b; burst(x, y, b);
  float(x, y - 22, 'CHAIN x' + n + '  +' + b, n >= 5 ? '#ff9a3c' : '#ffe680');
  tone(520 * Math.pow(2, Math.min(n, 8) / 12), 520 * Math.pow(2, Math.min(n, 8) / 12 + 0.5), 0.1, 'square', 0.05, 0.03);   // the stomp climbs a note per link
}
function popSound() {
  G.combo = G.comboT > 0 ? Math.min(G.combo + 1, 12) : 0; G.comboT = 24;
  SFX.pop(Math.pow(2, G.combo / 12));
}

// ---------------------------------------------------------------- plugins: custom entities, level script hooks, the boss pattern
const ENT = {};
let DEFS = null;   // while the menu loads a level file, its entity definitions are also collected here, so each level keeps its own
const hook = (name, ...a) => { const s = L && L.script; if (s && s[name]) return s[name](...a); };
function defineEntity(kind, def) {   // def: { spawn(thing, G) -> entity|null, update(e, G), draw(e, ctx, G), stomp(e, G, p), touch(e, G, p), solid, boss }
  if (def.boss) {   // boss entities: stomp = one hit, touch = hurt. Override either in def.
    def.stomp = def.stomp || (() => { hitBoss(1); return true; });
    def.touch = def.touch || (e => hurt(cx(e)));
  }
  ENT[kind] = def; if (DEFS) DEFS[kind] = def;
}
function collectDefs(on) { DEFS = on ? {} : null; return DEFS; }
function addEntity(kind, e) {   // put a ready-made {x,y,w,h,...} object into the world as an entity of that kind
  e.kind = kind; e.def = ENT[kind] || {}; if (e.on === undefined) e.on = true; bodies.push(e); return e;
}
function spawn(kind, thing) {   // run a defined entity's spawn(); also usable at runtime from update hooks
  const d = ENT[kind]; if (!d) throw new Error('no entity defined: ' + kind);
  const e = d.spawn ? d.spawn(Object.assign({ kind }, thing), G) : null;
  return e ? addEntity(kind, e) : null;
}
function makeBoss(c) {
  return { name: c.name || 'BOSS', hp: c.hp, max: c.hp, phase: 0, cfg: c, inv: 0, flash: 0, engaged: false, dead: false, endT: 0,
    arena: c.arena ? [c.arena[0] * TS, c.arena[1] * TS] : null };
}
function hitBoss(n = 1) {   // one hit on the boss: false if it is out of the fight, or invulnerable right now
  const B = G.boss; if (!B || B.dead || !B.engaged || B.inv > 0 || G.done) return false;
  if (TR) { B.inv = B.cfg.inv || 60; B.flash = B.inv; G.hitstop = Math.max(G.hitstop, 5); G.shake = Math.max(G.shake, 6); return true; }   // trailer: the hit lands (flash, shake) but the boss never loses a pip
  B.hp = Math.max(0, B.hp - n); B.inv = B.cfg.inv || 60; B.flash = B.inv; rumble(0.8, 0.5, 160);
  G.hitstop = Math.max(G.hitstop, 6); G.shake = Math.max(G.shake, 6); G.flashAt = G.frame; SFX.ko(0.8); vo('boss_hit');
  const ph = (B.cfg.phases || []).filter(q => B.hp <= q.at).length;
  if (B.hp <= 0) {
    B.dead = true; B.endT = B.cfg.endDelay || 100; SFX.slam(); G.shake = 10;
    if (B.cfg.onDefeat) B.cfg.onDefeat(G, B);
    if (!cue('boss_out')) { vo('boss_defeat'); playLines('bossDefeat'); }   // a knockout scene says its own lines
  } else if (ph > B.phase) {
    B.phase = ph; G.flareAt = G.frame; const q = B.cfg.phases[ph - 1];
    vo('boss_phase', { ph }); banner(q.say || 'PHASE ' + (ph + 1), 100, q.sub || ''); if (q.enter) q.enter(G, B);
    (L.lines && L.lines['bossPhase' + ph] ? playLines('bossPhase' + ph) : playLines('bossPhase', true));   // bossPhase1, bossPhase2... for a particular phase, else bossPhase
  }
  if (B.cfg.onHit) B.cfg.onHit(G, B, n);
  return true;
}
function updateBoss() {
  const B = G.boss; if (!B) return;
  if (!B.engaged && (!B.arena || cx(G.pl) > B.arena[0] + 24)) {   // crossing into the arena locks the camera and the walls
    B.engaged = true;
    const cut = cue('boss_in');   // a boss's entrance scene brings its own title card and lines
    if (!cut) { banner(B.name, 110, B.cfg.sub || ''); SFX.slam(); vo('boss_intro'); }
    if (B.cfg.onEngage) B.cfg.onEngage(G, B);
    if (!cut) playLines('boss');
  }
  if (B.inv > 0) B.inv--; if (B.flash > 0) B.flash--;
  if (B.dead && !CUT && --B.endT === 0) endLevel(1, 0, true);   // defeat ends the level after a short beat
}
function drawBossHUD() {   // the boss's name and health pips, in a slim plate at the top centre
  const B = G.boss; if (!B || !B.engaged) return;
  const n = B.max, pw = n * 9 - 1, nw = String(B.name).length * 4 - 1, w = Math.max(pw, nw) + 10, X = Math.round(VW / 2 - w / 2), x0 = Math.round(VW / 2 - pw / 2), y0 = 13;
  ctx.fillStyle = 'rgba(10,4,8,0.55)'; ctx.fillRect(X + 1, 3, w - 2, 20); ctx.fillRect(X, 4, w, 18);
  text(B.name, VW / 2, 5, '#ffe680', 1, '#000', 'center');
  for (let i = 0; i < n; i++) {
    const full = i < B.hp, fl = B.flash > 0 && Math.floor(B.flash / 3) % 2;
    ctx.fillStyle = '#3a2a10'; ctx.fillRect(x0 + i * 9, y0, 8, 7);
    if (full || fl) { ctx.fillStyle = fl ? '#fff' : '#f0a020'; ctx.fillRect(x0 + i * 9 + 1, y0 + 1, 6, 5); ctx.fillStyle = '#fff2a8'; if (!fl) ctx.fillRect(x0 + i * 9 + 1, y0 + 1, 6, 1); }   // gold, so it never reads as the red popcorn tubs beside it
  }
}

// ---------------------------------------------------------------- player
function setDot(dot) {
  const p = G.pl, D = DOTS[dot], c = cx(p), b = bot(p);
  if (dot === p.dot) return;
  if (!G.owned.includes(dot)) { SFX.buzz(); G.lockT[dot] = 20; float(c, p.y - 6, 'NOT IN THE CAST YET', '#ff8080'); return; }   // a Dot who hasn't joined: the portrait shakes
  if (!boxFree(c - D.w / 2, b - D.h, D.w, D.h)) { SFX.buzz(); G.denyT = 20; float(c, p.y - 6, 'NO ROOM', '#ff8080'); return; }
  p.dot = dot; p.w = D.w; p.h = D.h; p.x = c - D.w / 2; p.y = b - D.h; p.rolling = false; p.slam = 0;
  p.sy = 1.45; p.sx = 0.65; p.svx = p.svy = 0; p.landT = 0; SFX.switch(); vo('dot', { dot }); stars(c, b - D.h / 2, 10, D.col);
  if (!G.seen[dot]) { G.seen[dot] = true; banner(D.name, 110, D.how); } else float(c, b - D.h - 6, D.name, D.col);
}
function rumble(strong, weak, ms) {   // controller rumble, where the browser supports it
  if (!padUsed || TR || !navigator.getGamepads) return;
  for (const g of navigator.getGamepads()) if (g && g.vibrationActuator && g.vibrationActuator.playEffect) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
}
const BURST_LIFE = 150, BURST_KEEP = 0.7;   // frames the burst stays grabbable; the share of the lost bag that can be won back
function loseBag(x, y, frac = 1) {   // a pit costs one bag (a fifth of the stage's popcorn), a hit half a bag; capped at what you hold
  const n = Math.min(G.got, Math.max(frac < 1 ? 2 : 3, Math.ceil(popsTotal / 5 * frac)));
  if (n <= 0) return;
  G.got -= n; G.bagLost = (G.bagLost || 0) + 1; if (G.got > 0 && G.got < Math.ceil(popsTotal / 5)) vo('lastbag');
  float(x, y - 14, frac < 1 ? '-1/2 BAG' : '-1 BAG', '#ff8080');
  const back = Math.floor(n * Math.min(1, BURST_KEEP + (G.pk.keep || 0))), pieces = Math.min(12, Math.max(1, back)), life = BURST_LIFE + (G.pk.life || 0);   // FIVE-SECOND RULE
  for (let i = 0; i < pieces; i++) {   // each piece carries its share; grab them before they blink out
    const v = Math.floor(back / pieces) + (i < back % pieces ? 1 : 0), a = Math.PI * (0.15 + 0.7 * i / Math.max(1, pieces - 1));
    if (v > 0) loose.push({ x, y: y + 6, vx: -Math.cos(a) * (1.4 + Math.random()), vy: -2.6 - Math.sin(a) * 1.6, life, wait: 18, v });
  }
}
function hurt(fromX) {
  const p = G.pl;
  if (p.inv > 0 || G.done || (G.boss && G.boss.dead) || G.star > 0) return;   // GERM FREE: nothing hurts
  if (TR) { p.inv = 36; p.vx = sign(cx(p) - fromX || 1) * 2.4; p.vy = -3.2; p.slam = 0; p.rolling = false; G.hitstop = 3; G.shake = 4; return; }   // trailer: the knock-back reads, nothing is lost
  p.inv = 100; G.chain = 0; rumble(0.7, 0.4, 180); p.vx = sign(cx(p) - fromX || 1) * 2.6; p.vy = -3.4; p.slam = 0; p.rolling = false;
  if (p.h !== DOTS[p.dot].h) { p.y -= DOTS[p.dot].h - p.h; p.h = DOTS[p.dot].h; }
  if (G.shield > 0) { G.shield--; G.perkT = 40; G.hitstop = 5; G.shake = 3; SFX.shield(); stars(cx(p), p.y + p.h / 2, 8, '#ffd27a'); float(cx(p), p.y - 14, "DIDN'T COUNT!", '#ffe680'); return; }   // MISTRIAL: the knock-back, not the bag
  loseBag(cx(p), p.y, 0.5);
  G.hitstop = 5; G.shake = 4; SFX.hurt(); vo(G.boss && G.boss.engaged && !G.boss.dead ? 'boss_taunt' : 'hurt');
}
function updatePlayer() {
  const p = G.pl, dir = (IN.r ? 1 : 0) - (IN.l ? 1 : 0);
  const wasGround = p.onGround;
  if (IN.jp) p.buf = P.buffer; else if (p.buf > 0) p.buf--;
  p.held = IN.j;
  if (p.inv > 0) p.inv--;
  if (G.star > 0) {   // GERM FREE: counts down only while you're playing; rainbow sparkles trail off the Dot
    if (G.star === G.pk.star) { SFX.star(); float(cx(p), p.y - 14, 'GERM FREE!', '#ffe680'); }
    if (--G.star === 0) { SFX.wind(); float(cx(p), p.y - 10, 'GERMS ARE BACK', '#cfc6bc'); }
    if (G.frame % 3 === 0 && !TR) parts.push({ x: p.x + Math.random() * p.w, y: p.y + Math.random() * p.h, vx: (Math.random() - 0.5) * 0.8, vy: -0.4 - Math.random() * 0.6, life: 22, max: 22, r: 1.5, col: 'hsl(' + ((G.frame * 12 + Math.random() * 90) % 360 | 0) + ',95%,65%)', star: true, g: 0 });
  }

  // carried by a moving card
  const card = p.onGround && p.ground && p.ground.kind === 'card' ? p.ground : null;
  if (card) moveX(p, card.vx);

  // switch Dots any time: the switch button cycles, 1-4 or a click on a portrait picks one
  if (IN.pick) setDot(IN.pick);
  else if (IN.sp || IN.spPrev) {   // cycle through the Dots in the cast; L1 goes the other way
    const O = G.owned, i = O.indexOf(p.dot);
    if (O.length > 1) setDot(O[(i + (IN.sp ? 1 : O.length - 1)) % O.length]); else { SFX.buzz(); float(cx(p), p.y - 6, 'NO ONE ELSE YET', '#ff8080'); }
  }
  // Mel curls into a bowling ball when she's running, and to squeeze under anything lower than her full height
  const wasRolling = p.rolling;
  p.rolling = p.dot === 'mel' && (Math.abs(p.vx) > P.melRoll || !boxFree(p.x, bot(p) - 20, p.w, 20 - p.h + 1));
  if (p.rolling && !wasRolling && p.onGround) { SFX.wind(); dust(cx(p), bot(p), 3); }
  // Baxter: down in the air = hang, then slam
  if (p.dot === 'baxter' && !p.onGround && IN.dp && !p.slam) { p.slam = 1; p.slamT = P.slamWind; p.vx = 0; p.vy = 0; SFX.wind(); }

  // horizontal
  if (dir) p.face = dir;
  p.skidT = Math.max(0, p.skidT - 1);
  if (p.slam) p.vx = 0;
  else if (p.onGround) {
    if (dir && sign(p.vx) === -dir && Math.abs(p.vx) > 0.6) {
      p.vx += dir * P.skid;
      if (p.skidT === 0) { SFX.skid(); p.skidT = 12; }
      if (G.frame % 3 === 0) dust(cx(p) - dir * 4, bot(p), 1);
    } else if (dir) {
      const s = Math.abs(p.vx) * sign(p.vx) * dir, top = p.dot === 'mel' ? P.melRun : P.run;    // speed along the held direction
      if (s < P.walk) p.vx += dir * P.accWalk;
      else if (s < top) p.vx += dir * P.accRun;
      p.vx = clamp(p.vx, -top, top);
    } else {
      p.vx = Math.abs(p.vx) <= P.fric ? 0 : p.vx - sign(p.vx) * P.fric;
    }
  } else {
    const max = Math.max(P.walk, p.airMax);
    if (dir) p.vx = clamp(p.vx + dir * (sign(p.vx) === -dir && !p.inv ? P.airTurn : P.airAcc), -max, max); else p.vx *= P.airDrag;
  }

  // crate: push it while walking into it on the ground
  if (p.onGround && dir) for (const b of bodies) {
    if (b.kind !== 'crate') continue;
    const probe = { x: p.x + dir * 1.5, y: p.y + 2, w: p.w, h: p.h - 4 };
    if (ov(probe, b)) {
      const want = dir * Math.min(Math.max(Math.abs(p.vx), 0.6), 0.9), bx = b.x;
      moveX(b, want); p.vx = b.x - bx || dir * 0.01; if (G.frame % 8 === 0) dust(dir > 0 ? b.x : b.x + b.w, bot(b), 1);
    }
  }

  // jumping
  const canJump = p.onGround || p.coyote > 0;
  if (p.buf > 0 && canJump && !p.slam) {
    p.vy = -(P.jump + P.jumpRun * Math.min(1, Math.abs(p.vx) / P.run));
    p.airMax = Math.abs(p.vx); p.onGround = false; p.coyote = 0; p.buf = 0; p.usedDJ = false;
    p.sy = 1.3; p.sx = 0.75; SFX.jump(); dust(cx(p), bot(p), 4);
  } else if (IN.jp && !canJump && p.dot === 'sam' && !p.usedDJ && !p.slam) {
    p.vy = -P.dj; p.usedDJ = true; p.buf = 0; p.spin = 1; p.airMax = Math.max(p.airMax, Math.abs(p.vx));
    p.sy = 1.25; p.sx = 0.8; SFX.dj(); stars(cx(p), bot(p), 5, '#ffd27a');
  }

  // gravity
  if (p.slam === 1) { p.vy = 0; if (--p.slamT <= 0) { p.slam = 2; p.vy = P.slamV; } }
  else if (p.slam === 2) p.vy = P.slamV;
  else {
    let g;
    if (p.vy < 0) g = p.held ? (p.vy > -1.2 ? P.gApex : P.gUp) : P.gCut;
    else if (p.held) { const t = clamp((p.vy - P.gEase0) / (P.gEase1 - P.gEase0), 0, 1); g = P.gApex + (P.gDown - P.gApex) * t * t * (3 - 2 * t); }
    else g = P.gDown;
    p.vy = Math.min(p.vy + g, P.term);
    p.glide = p.dot === 'cloud' && p.held && p.vy > P.glide;
    if (p.glide) p.vy = Math.max(P.glide, p.vy - 0.4);
  }

  // move
  const x0 = p.x, hx = moveX(p, p.vx);
  if (hx && !p.onGround && !p.slam && p.vy > -1.5) {
    // ledge pop-up: feet just short of the top of what you flew into, and room above it: step up onto it and keep going
    const fy = bot(p) - 0.01, top = hx === 'tile' ? Math.floor(fy / TS) * TS : hx.y;
    if (bot(p) - top <= P.ledge && boxFree(x0 + p.vx, top - p.h, p.w, p.h)) { p.x = x0 + p.vx; p.y = top - p.h; p.vy = Math.max(p.vy, 0); }
    else { if (p.rolling && Math.abs(p.vx) > 2) { G.shake = 2; SFX.land(2); } p.vx = 0; }
  } else if (hx) { if (p.rolling && Math.abs(p.vx) > 2) { G.shake = 2; SFX.land(2); } p.vx = 0; }
  const preVy = p.vy, prevTop = p.y;
  p.onGround = false; p.ground = null;
  const r = moveY(p, p.vy, true, true);
  if (r && r.ceil) {
    // corner correction: if only a sliver of the head clips the ceiling, slide past it instead of bonking
    let fixed = false;
    for (const d of [1, -1]) for (let n = 1; n <= P.corner && !fixed; n++) {
      if (boxFree(p.x + d * n, prevTop + preVy, p.w, p.h)) { p.x += d * n; p.y = prevTop + preVy; fixed = true; }
    }
    if (!fixed) { p.vy = 0.5; SFX.land(1); }
  } else if (r) {
    if (r.tile === 2 && !wasGround && preVy > 0) p.ledgeT = G.frame;   // landed on a one-way ledge this frame (a boss under it can be stomped through it)
    if (p.slam === 2) slamLand(r);
    if (p.slam !== 2) {
      p.onGround = true; p.ground = r.body || 'tile'; p.usedDJ = false; G.chain = 0;
      if (!wasGround) {
        const v = preVy;
        p.sy = 1 - Math.min(0.35, v * 0.06); p.sx = 1 + Math.min(0.35, v * 0.06); p.svx = p.svy = 0;
        p.landT = v > 3.5 ? 8 : v > 1.5 ? 5 : 0;   // the crouch frame after a real drop
        if (v > 2) { dust(cx(p), bot(p), Math.min(10, Math.floor(v * 1.5))); SFX.land(Math.min(4, v)); }
        else if (v > 0.9) dust(cx(p), bot(p), 2, 0.6);   // a hop: a two-puff landing
      }
      p.vy = 0; p.airMax = P.walk;
    }
  }
  if (card && !p.onGround) { p.vx += card.vx; p.airMax = Math.max(p.airMax, Math.abs(p.vx)); }   // jump or step off a card and keep its speed
  if (wasGround && !p.onGround && p.vy >= 0) p.coyote = P.coyote; else if (p.coyote > 0) p.coyote--;
  if (p.onGround) p.coyote = 0;

  // standing on things
  if (p.onGround && p.ground && p.ground.kind === 'tub' && preVy > 1) tubStomp(p.ground);

  // squash and stretch spring back
  p.svx = (p.svx + (1 - p.sx) * 0.28) * 0.68; p.svy = (p.svy + (1 - p.sy) * 0.28) * 0.68;   // a damped spring, so it wobbles past 1 and settles
  p.sx += p.svx; p.sy += p.svy;
  if (p.landT > 0) p.landT--;
  p.idleT = p.onGround && !dir && Math.abs(p.vx) < 0.05 ? p.idleT + 1 : 0;
  if (p.spin) { p.spin += 1; if (p.spin > 20) p.spin = 0; }
  p.anim += Math.abs(p.vx) * 0.12;
  if (p.onGround && !p.rolling && Math.abs(p.vx) > P.run * 0.85 && G.frame % 7 === 0) dust(cx(p) - p.face * 4, bot(p), 1, 0.6);   // kicked-up dust at a full run
  if (p.rolling) p.rollAng += p.vx / 6;

  // remember a safe spot to come back to after a fall
  if (p.onGround) G.landed = true;   // stood on something since the last respawn
  if (p.onGround && p.ground === 'tile' && G.frame % 6 === 0) {
    const l = T(Math.floor((p.x - 6) / TS), Math.floor((bot(p) + 1) / TS)), rr = T(Math.floor((p.x + p.w + 6) / TS), Math.floor((bot(p) + 1) / TS));
    if (l && rr) G.safe = { x: p.x, y: p.y, f: bot(p) };
  }
  if (p.y > LH + 40 && !G.fall) { SFX.fall(); vo('death'); G.fall = { t: 0 }; }   // into a pit: the iris closes, then opens on the safe spot (updateFall)
  p.x = clamp(p.x, 0, LW - p.w);
}
const FALL_OUT = 20, FALL_IN = 22;   // frames: iris closing after a pit, iris opening on the respawn
function updateFall() {   // the respawn happens when the iris is shut (t = FALL_OUT); the opening that follows is visual only
  const f = G.fall, p = G.pl; f.t++;
  if (f.t === FALL_OUT) {
    if ((G.frame - (G.lastRespawn || -1e9) < 120 || !G.landed) && G.cpSafe) G.safe = Object.assign({}, G.cpSafe);   // died again before landing anywhere: the footing spot is a trap, go back to the checkpoint
    G.safe = respawnSpot(p);   // and never into a hole: the spot must have room and a floor under it
    G.lastRespawn = G.frame; G.landed = false;
    Object.assign(p, { x: G.safe.x, y: G.safe.y + p.h - DOTS[p.dot].h, h: DOTS[p.dot].h, vx: 0, vy: 0, inv: 60, rolling: false, slam: 0 });
    G.cam.y = clamp(bot(p) - VH * CAM_FEET, 0, LH - VH); updateCamera(true); SFX.wind();
    if (G.takes > 0) { G.takes--; G.perkT = 40; float(cx(p), p.y - 14, 'TAKE TWO!', '#ffe680'); stars(cx(p), p.y + p.h / 2, 8, '#ffe680'); }   // TAKE TWO: this fall is free
    else loseBag(cx(p), p.y);   // the pit's bag bursts out where you come back in
  }
  if (f.t >= FALL_OUT + FALL_IN) G.fall = null;
}
// a respawn spot you can stand on: room for the Dot, and a floor (tile or solid body) within a tile under its feet
function standable(x, feet, D) {
  if (x < 0 || x + D.w > LW || feet < D.h || feet > LH - 2) return false;
  for (let ty = Math.floor((feet - D.h) / TS); ty <= Math.floor((feet - 0.01) / TS); ty++)   // the whole Dot fits: no wall at the feet and head room for this Dot (Mel's crawlspace is no place for Baxter)
    for (let tx = Math.floor((x + 4) / TS); tx <= Math.floor((x + D.w - 4) / TS); tx++) { const t = T(tx, ty); if (t === 1 || t === 3) return false; }   // a few px into a side wall is fine: the first step pushes you out
  for (let ty = Math.floor((feet + 1) / TS); ty <= Math.floor((feet + TS * 8) / TS); ty++)   // a floor right under you, or a short drop onto one (a lift's checkpoint hangs at the lift's top)
    for (let tx = Math.floor((x + 2) / TS); tx <= Math.floor((x + D.w - 2) / TS); tx++) { const t = T(tx, ty); if (t === 1 || t === 2 || t === 3) return true; }
  const strip = { x, y: feet, w: D.w, h: TS * 8 };
  return bodies.some(b => solidBody(b) && ov(strip, b));
}
function respawnSpot(p) {
  const D = DOTS[p.dot], feetOf = s => s.f ?? s.y + p.h;   // f: the feet line, saved by the engine; level scripts' {x, y} spots assume the current Dot
  for (const s of [G.safe, G.cpSafe, G.startSafe]) {
    if (!s) continue;
    if (standable(s.x, feetOf(s), D)) return { x: s.x, y: feetOf(s) - p.h, f: feetOf(s) };
    const tx0 = Math.floor((s.x + D.w / 2) / TS), ty0 = Math.floor(feetOf(s) / TS);   // nearest floor tile to that spot: up to 30 tiles either way, a few rows up or down
    for (let d = 0; d <= 30; d++) for (const sx of d ? [tx0 - d, tx0 + d] : [tx0]) for (let dy = 0; dy <= 6; dy++) for (const ty of dy ? [ty0 - dy, ty0 + dy] : [ty0]) {
      const x = sx * TS + (TS - D.w) / 2, feet = ty * TS;
      if (T(sx, ty) && standable(x, feet, D)) return { x, y: feet - p.h, f: feet };
    }
  }
  return G.startSafe || G.safe;
}
function slamLand(r) {
  const p = G.pl;
  G.shake = 7; G.hitstop = 4; G.dipAt = G.frame; SFX.slam(); rumble(0.5, 0.25, 120);
  dust(cx(p), bot(p), 16, 2.2);
  // break cracked tiles under (and connected along the row)
  let broke = false;
  if (r.tile === 3) {
    const ty = r.ty;
    const go = tx => { while (T(tx, ty) === 3) { grid[ty * L.W + tx] = 0; gkind[ty * L.W + tx] = null; broke = true; depthMap = null; for (let i = 0; i < 4; i++) parts.push({ x: tx * TS + 8, y: ty * TS + 8, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 50, max: 50, r: 2.5, col: '#b08a5a', g: 0.25, chunk: true }); tx += 1; } };
    let tx = r.tx; while (T(tx - 1, ty) === 3) tx--; go(tx);
  }
  // shockwave knocks over nearby fans on the same ground
  for (const f of fans) if ((f.state === 'walk' || f.state === 'idle') && Math.abs(cx(f) - cx(p)) < 44 && Math.abs(bot(f) - bot(p)) < 10) fling(f, sign(cx(f) - cx(p)) || 1);
  if (broke) { G.secretHint = 60; return; }   // keep slamming down through the hole
  p.slam = 0;
}
function tubStomp(t) {
  const k = bodies.find(b => b.kind === 'kernel');
  if (k) { k.t = 360; k.on = true; } t.squash = 12; vo('tub'); G.pl.vy = -P.stompBounce; G.pl.onGround = false;
  SFX.tub(); stars(cx(t), t.y, 8, '#fff6d4'); G.hitstop = 3;
  float(cx(t), t.y - 10, 'POPCORN BRIDGE!', '#fff6d4');
}

// ---------------------------------------------------------------- fans: superfans in giant foam heads of their hero.
// They chase a Dot for an autograph, feud with the other team, and lose the foam head when stomped or flung.
// FANBODY:BEGIN (generated by design/sprites/export_fanbodies.py)
const FANBODY = {"gh_a":[".....oyYYYYYyo......","....oyYWYYYYyo......","...otyYYooYYyto.....","...otyYocroYyto.....","...osyYoccoYyso.....","....oyYocroYyo......","....oyYooooYyo......","....oyYYYYYYyo......","....oKKKKKKKko......","....oKKkooKKko......","....oKko..oKko......","....oKko..oKko......","...ooooo..oooo......","....................","...................."],"gh_b":[".....oyYYYYYyo......","....oyYWYYYYyo......","...otyYYooYYyto.....","...otyYocroYyto.....","...osyYoccoYyso.....","....oyYocroYyo......","....oyYooooYyo......","....oyYYYYYYyo......","....oKKKKKKKko......","....oKKkooKKko......","...oKko....oKko.....","..oKko......oKko....",".oooo........oooo...","....................","...................."],"th_a":[".....okKKKKKKko.....","....okKnKtKnKko.....","..ocoKnKKKKnKko.....",".ocCcoKKKKKKKKko....",".ocCctKKKKKKKkto....","..oooKKKKKKKkoso....","....oKKKKKKKKko.....","....oQQQQQQQQqo.....","....oQQQqoQQqqo.....","....oQqo..oQqo......","....oQqo..oQqo......","....oQqo..oQqo......","...ooooo..oooo......","....................","...................."],"th_b":[".....okKKKKKKko.....","....okKnKtKnKko.....","..ocoKnKKKKnKko.....",".ocCcoKKKKKKKKko....",".ocCctKKKKKKKkto....","..oooKKKKKKKkoso....","....oKKKKKKKKko.....","....oQQQQQQQQqo.....","....oQQQqoQQqqo.....","...oQqo....oQqo.....","..oQqo......oQqo....",".oooo........oooo...","....................","....................","...................."],"pal":{"gh":{"o":"#0c080e","h":"#16101a","H":"#2a2028","J":"#4a3c46","s":"#9a5440","S":"#cc8660","t":"#eeb084","T":"#fad4ac","e":"#fffaf0","p":"#120a10","m":"#7a3436","y":"#a87416","Y":"#f0c030","W":"#ffe680","k":"#1e1c26","K":"#34323e","r":"#c02020","c":"#e8dcc4"},"th":{"o":"#160e16","h":"#2a1612","H":"#4e2c1a","j":"#7a4a28","J":"#a2703c","s":"#8a4a3c","S":"#c27a5a","t":"#e8a47a","T":"#f8d0a8","e":"#f0eae4","p":"#1a0e16","m":"#7a3436","k":"#0e0c14","K":"#1c1a26","n":"#2e2c3c","c":"#b8f0e0","C":"#6cc8b4","q":"#141a2e","Q":"#243250"}}};
// FANBODY:END
const HAIR = ['#3a2416', '#1a1418', '#c8902a', '#8a3a1a', '#5a4a3a'], SKIN = ['#f0c8a0', '#d89a6a', '#a8704a'];
const SAYS = {   // fan chatter: Greggheads are VHS purists who quote Gregg, Timheads are Tim loyalists who quote Tim (about 24 characters each)
  gh: ['HEY GUYS!', 'SIGN MY TAPE!', 'FROM? AND?', 'FIVE BAGS!', 'WHAT IS THE RUNTIME?', 'POPCORN CLASSIC!', 'IT IS MOVIE TIME!', 'KEEP IT ABOUT MOVIES', "THAT'S A CATALOG NUMBER!", 'STAR TREK 2 IS IN SF!', 'DOTS!', '♥♥'],
  th: ['SIGN MY CARD!', 'GREGG IS A GUEST!', 'APPROACH THE BENCH?', 'OSCAR FEVER!', 'SKIP IT!', 'WELCOME TO MY PROGRAM!', "I'M PISSED!", 'TURN IT OFF!', 'DOTS!', '♥♥'],
};
const INTRO = { gh: ['GREGGHEADS', "GREGG'S FANS. SORT OF VHS FREAKS"], th: ['TIMHEADS', "TIM'S FANS. IT'S HIS SHOW"] };
function say(f, txt, col = '#1a0e14', t = 70) { f.say = { txt, col, t }; }
const hush = () => !!CUT || !!(G && G.dlg && (G.dlg.cur || G.dlg.q.length || G.dlg.show > 0 || (G.intro < INTRO_T && L && L.lines && L.lines.start && !G.lineSeen.start)));   // the dialogue box is up, or the opening lines are about to be
function popHead(f, vx, vy) {
  if (f.headless) return;
  f.headless = true;
  parts.push({ head: f.type, flip: f.dir > 0, x: cx(f), y: f.y + 8, vx, vy, rot: 0, vr: vx * 0.1, life: 480, max: 480, g: 0.25, bounce: true, wait: 10 });
  SFX.boing();
}
function fling(f, dir, chain = 0) {
  popHead(f, dir * (1 + Math.random()), -4.5 - Math.random());
  f.state = 'flung'; f.vx = dir * (3.4 + Math.min(chain, 4) * 0.3); f.vy = -3.2; f.t = 0; f.say = null;
  addGot(3 + (G.pk.foam || 0), cx(f), f.y); SFX.ko(1 + Math.min(chain, 8) * 0.12); G.hitstop = Math.max(G.hitstop, 2);   // FOAM HEADS adds to the knockout
  f.chain = chain;
}
function stompFan(f) {   // the foam head pops off and the embarrassed fan underneath runs for it
  popHead(f, (Math.random() - 0.5) * 2.5, -4.2);
  f.state = 'flee'; f.t = 0; f.fleeDir = sign(cx(f) - cx(G.pl)) || 1; f.dir = f.fleeDir; f.vy = -2.2;
  if (G.pk.foam) { G.got += G.pk.foam; burst(cx(f), f.y, G.pk.foam); float(cx(f), f.y - 22, '+' + G.pk.foam, '#ffe680'); }   // FOAM HEADS
  say(f, '!!', '#d8202c', 40);
}
function spray(x, y, type) {   // what flies out of a fandom brawl
  const kind = type === 'gh' ? (Math.random() < 0.6 ? 'finger' : 'vhs') : 'card';
  parts.push({ prop: kind, x, y, vx: (Math.random() - 0.5) * 4, vy: -2.5 - Math.random() * 2, life: 50, max: 50, g: 0.22 });
}
const inView = (x, pad = 24) => x > G.cam.x + pad && x < G.cam.x + VW - pad;   // on screen, with a margin so a fight isn't half cut off
function updateFans() {
  const p = G.pl;
  for (const f of fans) {
    if (f.state === 'gone') continue;
    if (f.state === 'idle') {
      if (f.x < G.cam.x + VW + 8 && f.x > G.cam.x - 80) {
        f.state = 'walk';
        if (!G.met[f.type]) { G.met[f.type] = true; G.cards.push({ type: f.type, t: 0 }); vo('fan_' + f.type); }   // a NEW FAN card slides in at the side
      } else continue;
    }
    f.anim += 1;
    if (f.say && !hush() && --f.say.t <= 0) f.say = null;
    if (f.state === 'walk') {
      const rival = inView(cx(f)) && fans.find(o => (o.state === 'walk' || o.state === 'idle') && o.type !== f.type && inView(cx(o)) && Math.abs(cx(o) - cx(f)) < 88 && Math.abs(bot(o) - bot(f)) < 20);   // only charge a rival you can both be seen
      let tx = null, speed = 0.4, chasing = false;
      if (rival) {
        tx = cx(rival); speed = 1.15;
        if (!f.shouted) { f.shouted = true; vo('brawl'); say(f, f.type === 'gh' ? 'GREGG!' : 'TIM!', '#d8202c', 60); if (f.onGround) f.vy = -2.4; }
      } else if (Math.abs(cx(p) - cx(f)) < 128 && Math.abs(bot(p) - bot(f)) < 72 && !G.done) {
        tx = cx(p); speed = 0.65; chasing = true;
        if (!f.say && !hush() && Math.random() < 0.006) say(f, SAYS[f.type][Math.floor(Math.random() * SAYS[f.type].length)]);
      }
      if (tx !== null) { const d = tx - cx(f); f.dir = Math.abs(d) > 2 ? sign(d) : f.dir; f.vx = Math.abs(d) > 2 ? f.dir * speed : 0; }
      else f.vx = f.dir * speed;
      if (f.onGround && !rival && Math.random() < (chasing ? 0.008 : 0.012)) f.vy = -2.2;   // excited little hops
      f.vy = Math.min(f.vy + 0.35, 6);
      const hit = moveX(f, f.vx);
      if (hit && tx === null) f.dir = -f.dir;
      const r = moveY(f, f.vy);
      f.onGround = !!r && !r.ceil; if (f.onGround) f.vy = 0;
      if (f.y > LH + 40) gone(f);
    } else if (f.state === 'scuffle') {
      f.t--; f.x = f.lockX + Math.sin(G.frame * 1.7 + f.type.length) * 1.5;
      if (f.t % 7 === 0) spray(f.mid, f.y + 8, f.type);
      if (f.t <= 0) fling(f, sign(cx(f) - f.mid) || (f.type === 'gh' ? -1 : 1));
    } else if (f.state === 'flung') {
      f.t++; f.vy += 0.2; f.x += f.vx; f.y += f.vy; f.rot += f.vx * 0.06;
      for (const o of fans) if (o !== f && (o.state === 'walk' || o.state === 'idle') && ov(f, o)) fling(o, sign(f.vx), (f.chain || 0) + 1);
      if (f.y > LH + 60 || f.t > 150) gone(f);
    } else if (f.state === 'flee') {
      f.t++; f.vx = f.fleeDir * 2.3; f.vy = Math.min(f.vy + 0.35, 6);
      if (moveX(f, f.vx)) f.fleeDir = -f.fleeDir;
      const r = moveY(f, f.vy); if (r && !r.ceil) f.vy = 0;
      if (f.t > 160 || f.y > LH + 40 || Math.abs(cx(f) - (G.cam.x + VW / 2)) > VW) gone(f);
    }
  }
  // same team: queue up instead of overlapping
  for (const a of fans) for (const b of fans) {
    if (a === b || a.type !== b.type || a.state !== 'walk' || b.state !== 'walk' || !ov(a, b) || Math.abs(bot(a) - bot(b)) > 8) continue;
    const push = (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) / 2 + 0.01, s = cx(a) < cx(b) ? -1 : 1;
    moveX(a, s * push); moveX(b, -s * push);
  }
  // the feud: a GreggHead and a TimHead meet, brawl, and fly apart
  for (const a of fans) {
    if ((a.state !== 'walk' && a.state !== 'idle') || a.type !== 'gh') continue;
    for (const b of fans) {
      if ((b.state !== 'walk' && b.state !== 'idle') || b.type !== 'th') continue;
      if (a.state === 'idle' && b.state === 'idle') continue;
      if (Math.abs(cx(a) - cx(b)) < 14 && Math.abs(bot(a) - bot(b)) < 12 && inView((cx(a) + cx(b)) / 2, 40)) {   // a brawl only starts where the player can see it
        const mid = (cx(a) + cx(b)) / 2;
        for (const f of [a, b]) { f.state = 'scuffle'; f.t = 40; f.mid = mid; f.lockX = f.x; }
        say(a, 'GREGG!', '#d8202c', 40); say(b, 'TIM!', '#d8202c', 40);
        SFX.scuffle();
        G.scuffles = (G.scuffles || []).concat([{ x: mid, y: a.y + 10, t: 40 }]);
        const plate = bodies.find(o => o.kind === 'plate'), gate = bodies.find(o => o.kind === 'gate');
        if (plate && gate && !gate.open && mid > plate.x && mid < plate.x + plate.w && Math.max(bot(a), bot(b)) >= plate.y - 4) {
          gate.open = true; plate.lit = 1; SFX.gate(); banner('THE GATE OPENS', 90, 'APPROACH THE BENCH?');
        }
      }
    }
  }
  // gate fans come back until the gate opens
  const gate = bodies.find(o => o.kind === 'gate');
  if (gate && !gate.open) {
    const gf = fans.filter(f => f.gate);
    if (gf.every(f => f.state === 'gone' || f.state === 'flee' || f.state === 'flung')) {
      if (++G.gateRespawn > 120) {
        G.gateRespawn = 0;
        for (const f of gf) { Object.assign(f, makeFan(f.type, f.spawn.x - 3, f.spawn.y - 4, true)); f.state = 'idle'; stars(cx(f), f.y + 10, 6, '#fff'); }
      }
    }
  }
}
function gone(f) { f.state = 'gone'; }

// ---------------------------------------------------------------- interactions
function interact() {
  const p = G.pl;
  for (const f of fans) {
    if (f.state !== 'walk' && f.state !== 'scuffle') continue;
    if (!ov(p, f)) continue;
    if (p.rolling) { fling(f, sign(p.vx) || p.face); continue; }
    const prevB = bot(p) - p.vy;
    if ((p.vy > 0 && prevB <= f.y + 7) || p.slam === 2) {
      stompFan(f); addGot(1, cx(f), f.y); popSound(); chainStomp(cx(f), f.y);
      if (p.slam === 2) continue;
      p.vy = -(p.held ? P.stompBounceHeld : P.stompBounce); p.y = f.y - p.h; p.usedDJ = false; p.airMax = Math.max(p.airMax, Math.abs(p.vx));
      p.sy = 1.3; p.sx = 0.75; G.hitstop = 3; SFX.stomp(); stars(cx(f), f.y, 6);
    } else if (G.star > 0) fling(f, sign(cx(f) - cx(p)) || p.face);   // GERM FREE: they bounce off
    else if (p.inv <= 0) {   // a fan mob: they bump you around and grab some popcorn
      hurt(cx(f)); say(f, '♥', '#d8202c', 50); float(cx(p), p.y - 10, 'MOBBED!', '#ffb0c8');
    }
  }
  if (G.pk.magnet) {   // POPCORN MAGNET: a kernel in range locks on and homes in, speeding up as it comes
    const mx = cx(p), my = p.y + p.h / 2, R = G.pk.magnet;
    for (const c of pops.concat(loose)) {
      if (c.got || c.wait > 0) continue;
      const dx = mx - c.x, dy = my - c.y, d = Math.hypot(dx, dy) || 1;
      if (!c.mag && d > R) continue;
      c.mag = Math.min(9, (c.mag || 1.5) + 0.3); const s = Math.min(d, c.mag); c.x += dx / d * s; c.y += dy / d * s; if (c.vx !== undefined) { c.vx = 0; c.vy = 0; }
    }
  }
  // popcorn
  const box = { x: p.x - 3, y: p.y - 3, w: p.w + 6, h: p.h + 6 };
  for (const c of pops) {
    if (c.got) continue;
    if (c.x > box.x && c.x < box.x + box.w && c.y > box.y && c.y < box.y + box.h) {
      c.got = true; G.got++; popSound(); sparkle(c.x, c.y); if (pops.every(o => o.got)) vo('allpop'); parts.push({ x: c.x, y: c.y, vx: 0, vy: -1, life: 14, max: 14, r: 3, col: '#fff6d4', ring: true, g: 0 });
      parts.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 1.2, vy: -2.2, life: 34, max: 34, pop: true, g: 0.18, hud: true, hudAt: 9, sc: 0.7 });   // and the kernel flies up to the counter
      if (c.tag && !G.secrets[c.tag]) { G.secrets[c.tag] = true; }
    }
  }
  for (const c of loose) {
    if (c.wait > 0 || c.got) continue;
    if (c.x > box.x && c.x < box.x + box.w && c.y > box.y && c.y < box.y + box.h) { c.got = true; G.got += c.v || 1; popSound(); parts.push({ x: c.x, y: c.y, vx: 0, vy: -2, life: 30, max: 30, pop: true, g: 0.18, hud: true, hudAt: 7, sc: 0.7 }); }
  }
  for (const q of parts) {   // foam heads: grab them as souvenirs
    if (!q.head || q.wait-- > 0 || q.life <= 0) continue;
    if (q.x > box.x - 6 && q.x < box.x + box.w + 6 && q.y > box.y - 6 && q.y < box.y + box.h + 6) {
      q.life = 0; G.got += 5; G.heads[q.head] = (G.heads[q.head] || 0) + 1;
      SFX.head(); stars(q.x, q.y, 8, q.head === 'gh' ? '#f0c030' : '#94e0cc'); float(q.x, q.y - 10, '+5', '#ffe680');
    }
  }
  for (const b of bodies) {
    if (b.kind === 'cp' && !b.lit && ov(p, b)) {
      b.lit = true; G.safe = { x: b.x, y: bot(b) - p.h, f: bot(b) }; G.cpSafe = Object.assign({}, G.safe); SFX.cp(); vo('checkpoint'); stars(cx(b), b.y + 8, 10, '#ffe680'); float(cx(b), b.y - 8, 'CHECKPOINT', '#ffe680'); playLines('checkpoint');
    } else if (b.kind === 'vhs' && !b.got && ov(p, b)) {
      b.got = true; SFX.vhs(); vo('vhs'); stars(cx(b), b.y + 10, 14, '#ff6a6a'); gotTape();
    } else if (b.kind === 'dsec' && !b.got && ov(p, b)) {   // a Dot secret: any Dot can take it (the placement is what needs that Dot's move)
      b.got = true; G.dsec[b.dot] = true;
      if (b.had) { SFX.tick(); stars(cx(b), b.y + 8, 6, '#fff2a6'); }   // found on an earlier run: just a glint
      else { SFX.vhs(); stars(cx(b), b.y + 8, 14, DOTS[b.dot].col); stars(cx(b), b.y + 8, 8, '#fff2a6'); float(cx(b), b.y - 6, DOTS[b.dot].name + "'S SECRET!", '#ffe680'); G.dsecT = 40; G.dsecWho = b.dot; }
    } else if (b.kind === 'gchip' && !b.got && ov(p, b)) {
      b.got = true;
      if (b.had || TR || !window.DDCasino) { SFX.tick(); stars(cx(b), b.y + 7, 6, '#fff2a6'); }
      else { window.DDCasino.goldChip(L.id); SFX.vhs(); stars(cx(b), b.y + 7, 16, '#ffd24a'); stars(cx(b), b.y + 7, 8, '#fff6d4'); float(cx(b), b.y - 6, 'GOLD CHIP! 3 FREE BETS', '#ffe680'); }
    } else if (b.kind === 'fact' && !b.got && ov(p, b)) {
      b.got = true; SFX.tick(); stars(cx(b), b.y + 6, 10, '#7ab0ff'); readFact(b);
    } else if (b.kind === 'goal' && !G.done && ov(p, b)) finish(b);
  }
  // custom entities: stomp them from above (stomp returns false to refuse), otherwise they touch you
  // A boss stunned under a one-way ledge: the ledge catches a Dot before it reaches his head, so landing on the ledge right over him is the stomp
  const thru = b => p.ledgeT === G.frame && isBossBody(b) && p.x < b.x + b.w && p.x + p.w > b.x && bot(p) <= b.y + 7 && b.y - bot(p) <= 30;
  for (const b of bodies) {
    const d = b.def; if (!d || b.dead) continue;
    const hit = ov(p, b), under = thru(b); if (!hit && !under) continue;
    const prevB = bot(p) - p.vy;
    if (d.stomp && (under || (p.vy > 0 && prevB <= b.y + 7) || p.slam === 2) && d.stomp(b, G, p) !== false) {
      if (b.dead && !d.boss) chainStomp(cx(b), b.y);
      if (p.slam === 2) continue;
      p.vy = -(p.held ? P.stompBounceHeld : P.stompBounce); p.y = Math.min(p.y, b.y - p.h); p.onGround = false; p.usedDJ = false; p.airMax = Math.max(p.airMax, Math.abs(p.vx));
      p.sy = 1.3; p.sx = 0.75; G.hitstop = 3; SFX.stomp(); stars(cx(b), b.y, 6);
    } else if (d.touch && hit) d.touch(b, G, p);
  }
  hook('interact', G);
  const B = G.boss; if (B && B.engaged && B.arena && !B.dead) p.x = clamp(p.x, B.arena[0], B.arena[1] - p.w);   // arena walls
}
function finish(goal) {
  const frac = clamp((bot(goal) - bot(G.pl)) / goal.h, 0, 1), go = () => endLevel(frac, Math.round(frac * 10));
  if (!cue('goal', { then: go })) go();   // a stage-end scene (a Dot joining) plays first
}
function endLevel(frac = 1, bonus = 0, boss = false) {   // the level is won: bonus popcorn, results card
  if (G.done || TR) return;   // a trailer never finishes a stage
  const p = G.pl;
  G.got += bonus; G.done = { t: 0, frac, bonus, boss };
  p.vx = 0; p.vy = 0; p.slam = 0; p.rolling = false;
  SFX.goal(); if (!boss) vo('clear'); stars(cx(p), p.y, 16, '#ffe680'); if (bonus || !boss) float(cx(p), p.y - 10, '+' + bonus + ' BONUS', '#ffe680');
  if (!boss) playLines('goal');
  else if (!G.vhs && classic()) { SFX.vhs(); gotTape(); }   // a beaten boss drops the stage's tape
}

function gotTape() {   // a Popcorn Classic: title, year, runtime, director and red-tape code, then Gregg's take
  if (G.vhs) return;
  G.vhs = true; const c = classic();
  if (!c) { banner('POPCORN CLASSIC FOUND!', 120, 'SHELVED AT THE VFA'); return; }
  banner(c.title, 200, c.year + '  ' + c.min + ' MIN  DIR. ' + c.dir + '  RED TAPE ' + c.code, true);
  sayLine('gregg', c.line, { now: true });
}
function readFact(b) {   // Tim's blue card for the film: the player calls it TRUE or FALSE (left / right, then jump), and a right call pays popcorn
  const c = classic(); if (!c) return;
  G.fact = { c, t: 0, pick: null, ans: null, at: 0 }; G.factGot = 'found';
}
function answerFact(pick) {   // lock in the call; when Tim's card is wrong, Gregg corrects him afterwards either way
  const f = G.fact; if (!f || f.ans) return;
  const c = f.c, right = (pick === 'F') === !!c.wrong;
  f.pick = pick; f.ans = right ? 'right' : 'missed'; f.at = f.t; G.factGot = f.ans;
  if (right) { addGot(25, cx(G.pl), G.pl.y); SFX.vhs(); } else SFX.buzz();
  vo(c.wrong ? 'fact_wrong' : 'fact_true');
  if (c.wrong) sayLine('gregg', c.truth, { now: true });
}
function placeFact() {   // the blue card sits on a kernel about a third of the way in (kernels are placed to be reachable)
  if (!classic()) return;
  if (L.FACT) { bodies.push({ kind: 'fact', x: L.FACT[0] * TS + 1, y: L.FACT[1] * TS + 2, w: 14, h: 12, on: false, got: false }); return; }   // a level can pin its blue card (LEVEL.FACT = [tx, ty])
  const want = LW * 0.36, cand = pops.filter(c => c.tag !== 'cloud').sort((a, b) => Math.abs(a.x - want) - Math.abs(b.x - want));
  let x = G.pl.x + 96, y = G.pl.y - 16;
  for (const c of cand) {   // above the kernel when there's room; else on the kernel itself. Never inside a wall
    const spots = [[c.x - 7, c.y - 22], [c.x - 7, c.y - 6]], ok = spots.find(([sx, sy]) => boxFree(sx, sy, 14, 12));
    if (ok) { [x, y] = ok; break; }
  }
  bodies.push({ kind: 'fact', x, y, w: 14, h: 12, on: false, got: false });
}

// ---------------------------------------------------------------- world: stacks, cards, kernels, gate, crates, entities, boss (2-1's argument and tantrum are in its level script)
function updateWorld() {
  const p = G.pl;
  // Gregg sees you and sets down a stack of tapes as stairs
  const st = bodies.find(b => b.kind === 'stack');
  if (st && st.state === 'hidden' && p.x > (L.STACK_TRIGGER ?? st.x / TS - 10) * TS) { st.state = 'drop'; st.y = st.ty - 120; st.vy = 0; G.greggAlert = 40; }
  if (st && st.state === 'drop') {
    st.vy += 0.5; st.y += st.vy;
    if (st.y >= st.ty) { st.y = st.ty; st.state = 'down'; st.on = true; G.shake = 4; SFX.thud(); dust(cx(st), bot(st), 12, 1.6); }
  }
  // Tim flicks blue cards across the gaps; ride them
  (L.CARD_LANES || []).forEach(([x0, x1, row, speed], i) => {
    const near = p.x > (x0 - 12) * TS && p.x < (x1 + 2) * TS;
    if (near && --G.cardT[i] <= 0) {
      G.cardT[i] = 95;
      bodies.push({ kind: 'card', x: x0 * TS, y: row * TS, w: 32, h: 6, vx: speed, on: true, lane: i, end: x1 * TS });
      parts.push({ x: x0 * TS, y: row * TS - 4, vx: 0, vy: 0, life: 12, max: 12, r: 6, col: '#94e0cc', ring: true, g: 0 });
    }
  });
  for (const b of bodies) if (b.kind === 'card') { b.x += b.vx; if (b.x > b.end) b.dead = true; }
  // the kernel bridge
  const k = bodies.find(b => b.kind === 'kernel');
  if (k && k.t > 0) { k.t--; if (k.t < 90 && k.t % 15 === 0) SFX.tick(); if (k.t === 0) k.on = false; }
  const tub = bodies.find(b => b.kind === 'tub'); if (tub && tub.squash > 0) tub.squash--;
  // the gate slides up
  const gate = bodies.find(b => b.kind === 'gate');
  if (gate && gate.open && gate.lift < gate.h) { gate.lift = Math.min(gate.h, gate.lift + 3); gate.y = gate.y0 - gate.lift; if (G.frame % 4 === 0) G.shake = 1; }
  // crate gravity
  for (const b of bodies) if (b.kind === 'crate') { b.vy = Math.min(b.vy + 0.4, 6); const r = moveY(b, b.vy, false); if (r) b.vy = 0; }
  for (const b of bodies) if (b.def && b.def.update && !b.dead) b.def.update(b, G);
  bodies = bodies.filter(b => !b.dead);
  updateBoss();
  hook('update', G);
  if (G.done) G.done.t++;
}

// ---------------------------------------------------------------- particles
function updateParts() {
  for (const q of parts) {
    if (q.hud && q.max - q.life > (q.hudAt ?? 22)) {   // homing on the counter, faster the closer it gets
      const k = Math.min(0.5, 0.16 + (q.max - q.life - (q.hudAt ?? 22)) * 0.02);
      q.x += (G.cam.x + 13 - q.x) * k; q.y += (G.cam.y + 12 - q.y) * k; q.vx = q.vy = q.g = 0;
      if (Math.abs(G.cam.x + 13 - q.x) + Math.abs(G.cam.y + 12 - q.y) < 3) { q.life = 0; G.hudPopT = 8; }
    }
    q.x += q.vx; q.y += q.vy; q.vy += q.g || 0; q.life--;
    if (q.vr) q.rot += q.vr;
    if (q.bounce && q.vy > 0) {
      const t = T(Math.floor(q.x / TS), Math.floor((q.y + 7) / TS));
      if (t === 1 || t === 3 || t === 2) { q.y = Math.floor((q.y + 7) / TS) * TS - 7; q.vy *= -0.45; q.vx *= 0.7; q.vr *= 0.5; if (Math.abs(q.vy) < 0.6) q.vy = 0; }
    }
  }
  parts = parts.filter(q => q.life > 0);
  for (const c of loose) {
    if (c.got) continue;
    c.wait--; c.life--; c.vy = Math.min(c.vy + 0.25, 5);
    const e = { x: c.x - 3, y: c.y - 3, w: 6, h: 6 };
    if (moveX(e, c.vx, false)) c.vx *= -0.6;
    const r = moveY(e, c.vy, false); if (r && !r.ceil) { c.vy *= -0.5; c.vx *= 0.8; }
    c.x = e.x + 3; c.y = e.y + 3;
  }
  loose = loose.filter(c => !c.got && c.life > 0 && c.y < LH + 40);
  if (G.scuffles) { for (const s of G.scuffles) s.t--; G.scuffles = G.scuffles.filter(s => s.t > 0); }
  if (G.comboT > 0) G.comboT--;
  if (cardGo()) { G.cards[0].t++; if (G.cards[0].t > 240) G.cards.shift(); }   // cards wait for the title wipe and for anyone talking
  if (G.banner && !dlgUp() && --G.banner.f <= 0) G.banner = null;   // a banner waits while a dialogue is up
  if (!G.banner && G.bq.length) G.banner = G.bq.shift();
  if (G.greggAlert) G.greggAlert--;
  if (G.fact) { const f = ++G.fact.t; if (!G.fact.ans && f === 60) answerFact(G.fact.c.wrong ? 'F' : 'T'); if (f > 300) G.fact = null; }   // runs alongside play (tests, sims): it calls itself right
  if (G.denyT > 0) G.denyT--;
}

// ---------------------------------------------------------------- camera: look ahead, snap to the floor you land on
const CAM_FEET = 0.74;   // where the Dot's feet sit down the screen when standing: low, Mario-style, so the set fills the frame and only a few tiles of floor show
function updateCamera(snap = false) {
  const p = G.pl, c = G.cam;
  const want = Math.abs(p.vx) > 1 ? p.face * 36 : c.look;
  c.look += (want - c.look) * 0.03;
  let tx = clamp(cx(p) - VW / 2 + c.look, 0, LW - VW);
  const B = G.boss; if (B && B.engaged && B.arena && !B.dead) tx = clamp(tx, B.arena[0], Math.max(B.arena[0], B.arena[1] - VW));   // boss arena: camera locks
  c.x += (tx - c.x) * (snap ? 1 : 0.14);
  let ty = c.y;
  if (p.onGround) ty = bot(p) - VH * CAM_FEET;
  if (p.y < c.y + 28) ty = p.y - 28;
  if (bot(p) > c.y + VH - 24) ty = bot(p) - VH + 24;
  ty = clamp(ty, 0, LH - VH);
  c.y += (ty - c.y) * (snap ? 1 : p.onGround ? 0.08 : 0.12);
  hook('camera', G, c, snap);   // a level can take the camera over (2-3's auto-scroll)
}

// ---------------------------------------------------------------- narrators: DD.say(who, text, opts) queues a line in the dialogue box. Play pauses while a line, a NEW FAN card or a blue card is up; jump advances
const SPEAK = { tim: { col: '#6cc8b4', pitch: 200 }, gregg: { col: '#e8707a', pitch: 285 } };   // box colour and blip pitch per narrator; others get a default
const speaker = who => SPEAK[who] || { col: '#ffe680', pitch: 230 + (String(who).length * 17 % 5) * 22 };
function sayLine(who, txt, o = {}) {   // queue one line: who 'tim' | 'gregg' | a key of LEVEL.portraits. o: { name, hold (frames after typing), col, now (cut in front) }
  if (!G || !G.dlg) return;
  txt = String(txt).replace(/[‘’]/g, "'").replace(/[“”"]/g, '').replace(/[—–]/g, '-').replace(/…/g, '...').replace(/;/g, ',').toUpperCase();
  const lines = []; let cur = '';
  for (const w of txt.split(/\s+/)) { if (cur && cur.length + 1 + w.length > 64) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) lines.push(cur);
  const sp = speaker(who), q = { who, name: String(o.name || (L.names && L.names[who]) || who).toUpperCase(), lines: lines.slice(0, 3), hold: o.hold || 120, col: o.col || sp.col, pitch: sp.pitch, t: 0, n: 0, done: 0 };
  q.len = q.lines.reduce((a, l) => a + l.length, 0);
  if (o.now) { G.dlg.q.unshift(q); G.dlg.cur = null; G.dlg.gap = 0; } else G.dlg.q.push(q);
}
function playLines(name, again) {   // play LEVEL.lines[name] (an array of [who, text]); each name plays once per run unless `again`
  const ls = L && L.lines && L.lines[name]; if (!ls || !G || (G.lineSeen[name] && !again)) return false;
  G.lineSeen[name] = true; vo('beat', { k: name }); for (const [who, t, o] of ls) sayLine(who, t, o); return true;   // the beat can have a voice line ("beat:<name>")
}
function portraitFor(who) { const n = (L.portraits && L.portraits[who]) || 'portrait_' + who; return ready(n) ? n : null; }
function updateDlg() {
  const D = G.dlg, c = D.cur;
  D.show = clamp(D.show + (c || D.q.length ? 0.125 : -0.125), 0, 1);
  if (!c) { if (D.gap > 0) D.gap--; else if (D.q.length) { D.last = D.cur = D.q.shift(); vo('line', { k: D.cur.lines.join(' ') }); } return; }   // a line can be read out by the show clip that says it (cues.js "lines")
  c.t++;
  if (c.n < c.len) {
    if (c.t % 2 === 0) { c.n++; if (c.n % 2 && c.n <= c.len) SFX.blip(c.pitch * (1 + (c.n % 3) * 0.06)); }
    if (IN.jp && c.t > 10) c.n = c.len;   // jump finishes the line at once
  } else if (((NOPAUSE || G.done) && ++c.done >= c.hold) || (IN.jp && ++c.done > 6)) { D.cur = null; D.gap = 8; }   // jump for the next line (auto-advance only when play isn't paused for it)
  else if (!(NOPAUSE || G.done)) c.done++;
}
function talking() {   // the game is paused for a card or a line: run that instead of the world (true while paused)
  if (NOPAUSE || G.done || G.intro < INTRO_T) return false;
  if (IN.click && !G.fact && (G.dlg.cur || G.dlg.q.length)) IN.jp = true;   // a click advances dialogue like Jump
  if (G.fact) {   // Tim's blue card: pick TRUE (left) or FALSE (right), jump to lock it in, jump again to close; then Gregg's correction
    const f = G.fact; f.t++;
    const fY = 62 + Math.round(Math.max(0, 10 - f.t) * 2) + 38, fX = VW / 2 - 92;   // the TRUE / FALSE buttons, as drawFact places them
    if (!f.ans && f.t > 24 && IN.click) { if (inBox(IN.click, fX + 16, fY - 2, 68, 16)) answerFact('T'); else if (inBox(IN.click, fX + 100, fY - 2, 68, 16)) answerFact('F'); }
    else if (f.ans && IN.click) IN.jp = true;   // after the call, a click closes the card
    if (!f.ans) { if (f.t <= 24) {} else if ((IN.l || IN.nx < 0) && f.pick !== 'T') { f.pick = 'T'; SFX.tick(); } else if ((IN.r || IN.nx > 0) && f.pick !== 'F') { f.pick = 'F'; SFX.tick(); } else if (f.t > 24 && IN.jp && f.pick) answerFact(f.pick); }
    else if (f.t - f.at > 20 && IN.jp) { G.fact = null; SFX.tick(); }
    return true;
  }
  if (G.dlg.cur || G.dlg.q.length) { updateDlg(); return true; }   // (any banner waits for the dialogue)
  return false;
}
function drawDialog() {
  const D = G.dlg, c = D.cur || D.last; if (!c || D.show <= 0 || (G.done && G.done.card)) return;
  const paused = !NOPAUSE && !G.done, e = 1 - Math.pow(1 - D.show, 2), top = !paused && ((G.boss && G.boss.engaged) || L.dialogTop);   // paused: always at the bottom over a dimmed scene; otherwise up top in a boss fight or when a level asks (LEVEL.dialogTop)
  if (paused) { ctx.fillStyle = `rgba(4,2,6,${0.55 * e})`; ctx.fillRect(0, 0, VW, VH); }
  const y = top ? Math.round(30 - (1 - e) * 48) : Math.round(VH - 39 + (1 - e) * 48), pn = portraitFor(c.who), tx = pn ? 44 : 16;
  ctx.fillStyle = 'rgba(10,4,8,0.9)'; ctx.fillRect(10, y, 300, 35);
  ctx.fillStyle = c.col; ctx.fillRect(10, y, 300, 1); ctx.fillRect(10, y + 34, 300, 1); ctx.fillRect(10, y, 1, 35); ctx.fillRect(309, y, 1, 35);
  if (pn) { ctx.fillStyle = c.col; ctx.fillRect(13, y + 4, 26, 26); ctx.fillStyle = '#1a0a12'; ctx.fillRect(14, y + 5, 24, 24); ctx.drawImage(IMG[pn], 14, y + 5); }
  text(c.name, tx, y + 3, c.col, 1, '#000');
  let left = D.cur ? c.n : c.len;
  c.lines.forEach((ln, i) => { const k = Math.min(ln.length, left); left -= k; if (k > 0) text(ln.slice(0, k), tx, y + 11 + i * 8, '#fff', 1, '#000'); });
  if (D.cur && c.n >= c.len && Math.floor(c.done / 15) % 2 === 0) { ctx.fillStyle = c.col; ctx.fillRect(301, y + 27, 5, 1); ctx.fillRect(302, y + 28, 3, 1); ctx.fillRect(303, y + 29, 1, 1); }   // the little "next" arrow
}

// ---------------------------------------------------------------- transitions: iris wipes, the level-title wipe, the pause menu
const INTRO_T = 72;   // level title wipe, frames (1.2 s); the player can move the whole time
function drawIris(r, x, y) {   // black everywhere outside a circle of radius r at (x, y), in chunky 3-px bands so it stays pixel-art
  ctx.fillStyle = '#000'; x = Math.round(x); y = Math.round(y);
  for (let yy = 0; yy < VH; yy += 3) {
    const dy = yy + 1.5 - y, hw = r > Math.abs(dy) ? Math.round(Math.sqrt(r * r - dy * dy)) : 0;
    if (hw <= 0) ctx.fillRect(0, yy, VW, 3); else { if (x - hw > 0) ctx.fillRect(0, yy, x - hw, 3); if (x + hw < VW) ctx.fillRect(x + hw, yy, VW - x - hw, 3); }
  }
}
const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3), IRIS_MAX = 380;
const backOut = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);   // ease out with a little overshoot
function playerScreen() { const p = G.pl; return [wx(cx(p)), wy(p.y + p.h / 2)]; }
function introIris() {   // an iris opens on the player as the level starts
  const t = G.intro; if (G.state === 'title' || t >= INTRO_T) return;
  const [px, py] = playerScreen(), r = IRIS_MAX * ease((t - 6) / 40);
  if (r < IRIS_MAX) drawIris(r, px, py);
}
function introStrip() {   // film-leader strip with the level id and name slides through the middle (LEVEL.intro = {bg, fg, edge} recolours it)
  const t = G.intro; if (G.state === 'title' || t >= INTRO_T) return;
  const I = L.intro || {}, bg = I.bg || '#120808', fg = I.fg || '#ffe680', edge = I.edge || '#3a2a24', out = INTRO_T - 20;
  const X = t < 14 ? -Math.round((1 - ease(t / 14)) * (VW + 20)) : t > out ? Math.round(ease((t - out) / 20) * (VW + 20)) : 0;   // in from the left, out to the right
  const Y = 54, H = 72;
  ctx.fillStyle = bg; ctx.fillRect(X, Y, VW, H);
  ctx.fillStyle = edge; ctx.fillRect(X, Y, VW, 2); ctx.fillRect(X, Y + H - 2, VW, 2);
  for (let sx = 4 - (t * 3 % 12); sx < VW; sx += 12) { ctx.fillRect(X + sx, Y + 4, 6, 4); ctx.fillRect(X + sx, Y + H - 8, 6, 4); }   // sprocket holes scroll past
  const nm = (L.name || '').toUpperCase(), sc = [3, 2, 1].find(s => nm.length * 4 * s - s <= 296) || 1;
  text((L.id || '').toUpperCase(), X + VW / 2 + 2, Y + 14, '#5a1a10', 5, null, 'center'); text((L.id || '').toUpperCase(), X + VW / 2, Y + 12, fg, 5, null, 'center');
  text(nm, X + VW / 2, Y + 42, '#fff', sc, '#000', 'center');
  if (L.sub) text(String(L.sub).toUpperCase(), X + VW / 2, Y + 42 + sc * 5 + 4, '#ffb4a4', 1, '#000', 'center');
}
function drawFallIris() {
  const f = G.fall; if (!f) return;
  if (f.t < FALL_OUT) { const p = G.pl; drawIris(IRIS_MAX * (1 - ease(f.t / FALL_OUT)), clamp(wx(cx(p)), 8, VW - 8), VH - 4); }   // closes on the spot where you fell out of the screen
  else { const [px, py] = playerScreen(); drawIris(IRIS_MAX * ease((f.t - FALL_OUT) / FALL_IN), px, py); }
}
function drawEndIris() {   // the level is won: the iris closes on the player, then the results card goes up on black
  const d = G.done; if (!d) return;
  const [px, py] = playerScreen(); drawIris(IRIS_MAX * (1 - ease((d.t - 4) / 44)), px, py);
}
const pauseOpts = () => window.__menu && window.__menu.pauseOptions;   // the menu's options screen (volumes, jukebox, unlocks, save data), opened over the paused level
const pauseItems = () => ['RESUME', 'RESTART'].concat(pauseOpts() ? ['OPTIONS'] : [], DD.opts && DD.opts.onExit ? ['QUIT TO MAP'] : []);
function updatePause() {
  const m = G.pm, items = pauseItems(), n = items.length;
  if (m.opt) { pauseOpts().step(IN); return; }   // the options are up: they close themselves back to this menu
  if (IN.quit) { leave(true); return; }
  if (IN.ny) { m.sel = (m.sel + (IN.ny > 0 ? 1 : n - 1)) % n; SFX.tick(); }
  let ok = IN.ok;
  if (IN.click) { const i = items.findIndex((it, k) => inBox(IN.click, VW / 2 - 70, 74 + k * 20, 140, 17)); if (i >= 0) { m.sel = i; ok = true; } else { G.state = 'play'; return; } }   // click an item to pick it; click outside to resume
  if (ok) { const it = items[m.sel]; if (it === 'OPTIONS') { m.opt = true; pauseOpts().open(() => { m.opt = false; }); return; } SFX.switch(); if (it === 'RESUME') G.state = 'play'; else if (it === 'RESTART') G.restartReq = true; else leave(true); }
  else if (IN.start || IN.back) G.state = 'play';
}
function drawPause() {
  if (G.pm.opt) { pauseOpts().draw(); return; }
  ctx.fillStyle = 'rgba(8,2,6,0.84)'; ctx.fillRect(0, 0, VW, VH);
  text('PAUSED', VW / 2, 34, '#ffe680', 3, '#7a2a10', 'center');
  pauseItems().forEach((it, i) => {
    const on = i === G.pm.sel, y = 78 + i * 20;
    if (on) { ctx.fillStyle = 'rgba(232,80,74,0.35)'; ctx.fillRect(VW / 2 - 70, y - 4, 140, 17); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.fillRect(VW / 2 - 64 + i, y + i, 1, 9 - 2 * i); ctx.fillRect(VW / 2 + 60 - i, y + i, 1, 9 - 2 * i); } }   // the selection arrows
    text(it, VW / 2, y, on ? '#fff' : '#9a8a90', 2, '#000', 'center');
  });
  text(padUsed ? 'UP/DOWN + CROSS.  OPTIONS: RESUME' : 'UP/DOWN + ENTER, OR CLICK.  ESC: RESUME', VW / 2, VH - 16, '#cfc6bc', 1, '#000', 'center');
}

// ---------------------------------------------------------------- results: the count-up (popcorn, bags, VHS, foam heads, rating, NEXT tease)
const RATINGS = ['ZERO BAGS. SKIP IT.', 'ONE BAG OF POPCORN.', 'TWO BAGS OF POPCORN.', 'THREE BAGS OF POPCORN.', "FOUR BAGS. YOU CAN'T LOSE.", 'FIVE BAGS. FIVE IS THE HIGHEST.'];   // Gregg's rating garnishes, worst to best
function nextTease() {   // the next level's name from the menu's manifest (window.WORLDS and the menu's loaded levels), or null
  try {
    const Ws = window.WORLDS, m = window.__menu; if (!Ws || !L) return null;
    const flat = [].concat(...Ws.map(w => w.levels)), i = flat.findIndex(l => l.id === L.id);
    if (i < 0 || i + 1 >= flat.length) return null;
    const n = flat[i + 1]; if (m && m.have && !m.have(n.id)) return null;   // not built yet
    const nm = (m && m.LEVELS && m.LEVELS[n.id] && m.LEVELS[n.id].name) || n.name;
    return nm ? String(nm).toUpperCase() : null;
  } catch (e) { return null; }
}
const SIX_T = 100;   // frames of the six-bag gag
function cardSetup(d) {   // lay out the count-up timeline (card clock c, in frames)
  const bags = Math.floor(5 * bagFrac()), cdur = clamp(Math.round(G.got * 0.4), 16, 80), cnt0 = 8, bag0 = cnt0 + cdur + 14;
  const six = bags === 5, g0 = bag0 + bags * 20 + 4, tally = g0 + 6 + (six ? SIX_T : 0), cl = classic();   // five bags: Tim tries to add a sixth, Gregg cites the VFA maximum
  const sixWin = six && !!(G.pk && G.pk.six);   // the HEI store's SIX BAGS: this time the sixth bag stays
  const rating = sixWin ? (cl ? 'SIX BAGS AND ' + cl.garnish : "SIX BAGS. TIM'S CALL.") : bags === 5 && cl ? 'FIVE BAGS AND ' + cl.garnish : RATINGS[bags], nxt = nextTease(), r0 = tally + 40, n0 = r0 + rating.length * 2 + 16;
  let rl = [rating]; if (rating.length > 34) { const k = / BAGS AND /.test(rating) ? rating.indexOf(' AND ') + 4 : rating.lastIndexOf(' ', 34); rl = [rating.slice(0, k), rating.slice(k + 1)]; }   // two lines when the extra runs long
  Object.assign(d, { card: true, c: 0, bags, cnt0, cdur, bag0, six, sixWin, g0, tally, rating, rl, r0, next: nxt, n0, END: (nxt ? n0 + (nxt.length + 6) * 2 : r0 + rating.length * 2) + 24 + (DD.opts && DD.opts.joins ? 130 : 0) });
  G.dlg.q.length = 0; G.dlg.cur = null;
  if (!TR && DD.opts && DD.opts.perks && window.DDStore) d.hei = window.DDStore.award(result());   // the HEI store's pay-out (store.js award)
}
const HEIBTN = { x: VW - 70, y: 15, w: 46, h: 32 };   // the results card's HEI Points box, which opens the store (inside the card, which runs x 20 to VW - 20, and right of the SIX BAGS sixth tub at x 229-247)
function updateResults() {
  const d = G.done; if (!d) return;
  if (!d.card) { if (d.t >= 50 && (!(G.dlg.cur || G.dlg.q.length) || d.t >= 300)) cardSetup(d); return; }   // goal lines get to play over the closed iris first
  const sto = DD.opts && DD.opts.store;   // the menu's stages can stop at the HEI store on the way to the next one
  if (IN.click && sto && d.hei && d.c >= d.tally + 18 && IN.click.x >= HEIBTN.x && IN.click.y >= HEIBTN.y && IN.click.x < HEIBTN.x + HEIBTN.w && IN.click.y < HEIBTN.y + HEIBTN.h) { leave(false, { store: true }); return; }   // the HEI Points on the card are a button: spend them, then on to the next stage
  if (IN.click) { if (d.c > d.END && IN.click.y > VH - 30 && IN.click.x > VW * (sto ? 0.62 : 0.5)) { G.restartReq = true; return; } if (sto && d.c > d.END && IN.click.y > VH - 30 && IN.click.x > VW * 0.38) { leave(false, { store: true }); return; } IN.jp = true; }   // click: skip, then continue (bottom right: play it again)
  if (d.c > d.END) { if (sto && (IN.sp || IN.store)) leave(false, { store: true }); else if (IN.jp || IN.start) leave(false); return; }
  if (IN.jp && d.c > 12) { d.c = d.END + 1; return; }   // jump skips the count-up
  const c = ++d.c;
  if (c === d.r0 && !d.sixWin) vo('rating', { bags: d.bags, bonus: d.rating !== RATINGS[d.bags] }); if (d.six && c === d.g0 + 6) vo('six');   // Tim reads the rating out
  if (c > d.cnt0 && c <= d.cnt0 + d.cdur && (c - d.cnt0) % 3 === 0) SFX.count((c - d.cnt0) / 3);
  for (let i = 0; i < d.bags; i++) if (c === d.bag0 + i * 20 + 12) { SFX.bag(); d.pop = { i, t: 0 }; }
  if (d.pop) d.pop.t++;
  if (d.six) { const t = c - d.g0; if (t === 18) SFX.bag(); if (d.sixWin) { if (t === 50) SFX.goal(); } else if (t === 50 || t === 64) SFX.tick(); }
  if (c === d.tally) G.vhs ? SFX.vhs() : SFX.tick(); if (c === d.tally + 18) SFX.tick();
  if (c >= d.r0 && c < d.r0 + d.rating.length * 2 && c % 4 === 0) SFX.tick();
  if (d.next && c >= d.n0 && c < d.n0 + (d.next.length + 6) * 2 && c % 4 === 0) SFX.tick();
}
function drawResults() {
  const d = G.done; if (!d || !d.card) return;
  const c = d.c > d.END ? 1e6 : d.c, a = Math.min(1, d.c / 8), typed = (s, t0) => s.slice(0, Math.max(0, Math.floor((c - t0) / 2)));
  ctx.globalAlpha = a;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const rEnd = d.r0 + d.rating.length * 2, hit = c >= rEnd && c < rEnd + 10 ? Math.sin((c - rEnd) * 2.2) * 2 * (1 - (c - rEnd) / 10) : 0;   // the rating lands with a thump
  const pk = backOut(clamp(d.c / 16, 0, 1)), pz = 0.7 + 0.3 * pk;   // the card swings up into place, overshooting a touch
  ctx.save(); ctx.translate(VW / 2 + Math.round(hit), VH / 2 + Math.round((1 - pk) * 30)); ctx.scale(pz, pz); ctx.translate(-VW / 2, -VH / 2);
  ctx.fillStyle = '#1e52bc'; ctx.fillRect(20, 8, VW - 40, 164);
  ctx.fillStyle = '#0e2e7a'; for (let x = 26; x < VW - 26; x += 12) { ctx.fillRect(x, 11, 6, 4); ctx.fillRect(x, 165, 6, 4); }
  const gt = d.six ? c - d.g0 : -1;
  if (gt >= 0 && gt < 50) text('TIM: SIX BAGS. MY CALL.', VW / 2, 20, '#94e0cc', 2, '#0a1a4a', 'center');
  else if (gt >= 50 && gt < SIX_T) text(d.sixWin ? "IT'S SIX BAGS CINEMA TIME." : 'GREGG: FIVE IS THE HIGHEST.', VW / 2, 20, d.sixWin ? '#94e0cc' : '#ffe680', 2, '#0a1a4a', 'center');
  else text(d.sixWin && gt >= SIX_T ? "TIM'S RATING:" : "GREGG'S RATING:", VW / 2, 20, d.sixWin && gt >= SIX_T ? '#94e0cc' : '#fff', 2, '#0a1a4a', 'center');
  if (d.sixWin && gt >= 18) { const sx = VW / 2 - 61 + 5 * 26, p = gt >= 50 && gt < 64 ? Math.round(Math.sin((gt - 50) / 14 * Math.PI) * 5) : 0; drawBag(sx, 38 - p, 1, 0.35, 0, 1 + p * 0.04); }   // SIX BAGS: the sixth stays on the scale
  else if (gt >= 0 && gt < SIX_T) {   // the sixth bag slides in from Tim's side, then Gregg knocks it off the scale
    const sx = VW / 2 - 61 + 5 * 26, x = gt < 18 ? sx + (VW + 10 - sx) * (1 - gt / 18) ** 2 : sx, fall = Math.max(0, gt - 64);
    drawBag(x + fall * 1.5, 38 + fall * fall * 0.12, 1, 0.35, fall * 0.12, 1);
    if (gt >= 50 && gt < 64) text('VFA RULES', sx + 8, 30, '#ff5a5a', 1, '#000', 'center');
  }
  for (let i = 0; i < 5; i++) {   // the bags fill one at a time, each with a pop
    const t0 = d.bag0 + i * 20, on = i < d.bags, fill = on ? clamp((c - t0) / 12, 0, 1) : 0, pop = d.pop && d.pop.i === i ? d.pop.t : 99;
    drawBag(VW / 2 - 61 + i * 26, 38 - (pop < 14 ? Math.round(Math.sin(pop / 14 * Math.PI) * 5) : 0), fill, 0.35, pop < 14 ? Math.sin(pop * 1.1) * 0.3 * (1 - pop / 14) : 0, pop < 14 ? 1 + 0.25 * Math.sin(pop / 14 * Math.PI) : 1);
  }
  const k = clamp((c - d.cnt0) / d.cdur, 0, 1), shown = Math.round(G.got * k);
  const cj = k > 0 && k < 1 && (c - d.cnt0) % 3 < 1 ? 1 : 0;   // the count ticks with a little jump
  text('POPCORN  ' + shown + ' / ' + popsTotal, VW / 2, 66 - cj, '#fff6d4', 1, '#000', 'center');
  if (c > d.cnt0 + d.cdur) {
    if (!d.boss) text('LANDED ' + Math.round(d.frac * 100) + '% UP THE TAPE  +' + d.bonus, VW / 2, 76, '#cfd8ff', 1, '#000', 'center');
    else text((G.boss ? G.boss.name : 'BOSS') + ' DEFEATED', VW / 2, 76, '#cfd8ff', 1, '#000', 'center');
  }
  const cl = classic(), two = d.rl.length > 1;
  if (c >= d.tally) text('POPCORN CLASSIC  ' + (G.vhs && cl ? cl.title + ' (' + cl.year + ')' : G.vhs ? 'FOUND' : 'STILL OUT THERE'), VW / 2, 84, G.vhs ? '#ffe680' : '#9aa8d8', 1, '#000', 'center');
  if (c >= d.tally + 18) {   // foam heads, and the stage's Dot secrets beside them when it has any
    const fh = 'FOAM HEADS  GREGG ' + (G.heads.gh || 0) + '   TIM ' + (G.heads.th || 0), ds = G.dsecDots || [];
    if (!ds.length) text(fh, VW / 2, 93, '#fff', 1, '#000', 'center');
    else { const sw = 46 + ds.length * 8, x0 = Math.round(VW / 2 - (sw + 14 + fh.length * 4) / 2); text('DOT SECRETS', x0, 93, '#ffe680', 1, '#000'); ds.forEach((q, k) => secPip(x0 + 47 + k * 8, 93, DOTS[q].col, !!G.dsec[q] || G.dsecHad.includes(q), 0)); text(fh, x0 + sw + 14, 93, '#fff', 1, '#000'); }
  }
  if (c >= d.tally + 18 && cl) text('BLUE CARD  ' + (G.factGot === 'right' ? 'YOU CALLED IT +25' : G.factGot ? 'YOU CALLED IT WRONG' : 'STILL OUT THERE'), VW / 2, 102, G.factGot ? '#7ab0ff' : '#9aa8d8', 1, '#000', 'center');
  if (hit) { ctx.fillStyle = 'rgba(255,240,200,' + (0.25 * (1 - (c - rEnd) / 10)) + ')'; ctx.fillRect(24, two ? 110 : 115, VW - 48, two ? 28 : 16); }
  if (c >= d.r0) { let t0 = d.r0; d.rl.forEach((l, i) => { text(typed(l, t0), VW / 2 - Math.floor((l.length * 8 - 2) / 2), (two ? 113 : 118) + i * 13, '#ffd27a', 2, '#000'); t0 += l.length * 2 + 2; }); }
  const jn = DD.opts && DD.opts.joins, jy = jn ? 136 : 142;
  if (d.next && c >= d.n0) { const s = 'NEXT: ' + d.next; text(typed(s, d.n0), VW / 2 - Math.floor((s.length * 4 - 1) / 2), jy, '#94e0cc', 1, '#000'); }
  if (jn && DOTS[jn]) {   // a new Dot joins the cast: walks on from the right, then the line types out
    const j0 = d.next ? d.n0 + 12 : d.r0 + 12, D = DOTS[jn], k = clamp((c - j0) / 40, 0, 1), sx = Math.round(VW + 20 - k * 60);
    if (c === j0) SFX.switch(); if (c === j0 + 40) { SFX.bag(); vo('join', { dot: jn }); }
    if (c >= j0 && ready(jn)) { const z = Math.min(1, 22 / IMG[jn].height), ar = c - j0 - 40, pose = k < 1 ? 'walk' + (Math.floor(c / 6) % 4) : ar < 8 ? 'land' : ar % 200 < 6 ? 'blink' : 'idle'; drawDot(jn, pose, sx, 152, true, z, z, k < 1 ? -0.08 : 0); }   // walks on with a real walk cycle
    if (c >= j0 + 40) { const s = D.name + ' JOINED THE CAST: ' + D.how; text(typed(s, j0 + 40), VW / 2 - 14 - Math.floor((s.length * 4 - 1) / 2), 146, D.col, 1, '#000'); }
  }
  if (d.hei && c >= d.tally + 18) {   // HEI Points, top right of the card: a coin and the pay-out
    const k = clamp((c - d.tally - 18) / 24, 0, 1), n = Math.round(d.hei.n * k), S = window.DDStore;
    if (c === d.tally + 18) SFX.bag();
    const B = HEIBTN, sto2 = DD.opts && DD.opts.store, lit = sto2 && Math.floor(d.t / 24) % 2;
    if (sto2) { ctx.fillStyle = '#000'; ctx.fillRect(B.x - 1, B.y - 1, B.w + 2, B.h + 3); ctx.fillStyle = lit ? '#3a2a6a' : '#2a1e52'; ctx.fillRect(B.x, B.y, B.w, B.h); ctx.fillStyle = '#6a5ab0'; ctx.fillRect(B.x, B.y, B.w, 1); ctx.fillStyle = '#140c30'; ctx.fillRect(B.x, B.y + B.h - 1, B.w, 1); }   // a raised button: click it to spend
    if (S) S.icon('rewards', B.x + 3, 18, 1, d.t);
    text('+' + n, B.x + 14, 18, '#ffe680', 2, '#0a1a4a'); text('HEI POINTS', B.x + 3, 30, '#fff6d4', 1, '#0a1a4a');
    if (sto2) text('SPEND >', B.x + 3, 39, lit ? '#ffe680' : '#c8b8f0', 1, '#0a1a4a');
    if (d.hei.first) text('FIRST CLEAR', B.x + 3, sto2 ? 50 : 39, '#94e0cc', 1, '#0a1a4a');
  }
  const sto = DD.opts && DD.opts.store;
  if (c > d.END - 24 && Math.floor(d.t / 30) % 2) text(padUsed ? (DD.opts && DD.opts.onExit ? (sto ? 'CROSS: CONTINUE  SQUARE: STORE  TRIANGLE: AGAIN' : 'CROSS: CONTINUE   TRIANGLE: AGAIN') : 'TRIANGLE: PLAY AGAIN') : DD.opts && DD.opts.onExit ? (sto ? jumpKey() + ': CONTINUE   X: HEI STORE   R: AGAIN' : jumpKey() + ': CONTINUE   R: AGAIN') : 'PRESS R TO PLAY AGAIN', VW / 2, 156, '#fff', 1, '#000', 'center');
  else if (c <= d.END - 24 && Math.floor(d.t / 30) % 2) text(jumpKey() + ': SKIP', VW / 2, 156, '#7a90d8', 1, null, 'center');
  ctx.restore(); ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the step
function step() {
  if (G.fall) { if (G.fall.t + 1 < FALL_OUT) { G.fall.t++; return; } updateFall(); }   // the iris is closing after a pit: nothing runs, not even the script clock or input, so a fall costs the simulation nothing
  readInput();
  if (G.restartReq) { restart(); return; }
  G.frame++;
  if (CUT) { if (CUT.step(IN)) { if (CUT.live) cutLive(); updateParts(); if (G.shake > 0) G.shake *= 0.86; return; } CUT = null; }   // a cutscene holds the stage
  if (!G.cutOpen) { G.cutOpen = true; if (cue('open')) return; }   // the stage's opening scene, before the controls card and the title wipe
  if (G.state === 'title') { if (IN.jp || IN.start || IN.sp || IN.click || IN.any) { G.state = 'play'; try { localStorage.setItem('dd_controls_seen', '1'); } catch (e) {} } return; }   // the level title wipe (introStrip) takes over from here
  if (G.state === 'pause') { updatePause(); return; }
  if ((IN.start || (IN.click && inBox(IN.click, PAUSEBTN.x - 2, PAUSEBTN.y - 2, PAUSEBTN.w + 4, PAUSEBTN.h + 4))) && !G.done) { G.state = 'pause'; G.pm.sel = 0; SFX.tick(); return; }
  if (G.intro < INTRO_T) { if (++G.intro === 60) playLines('start'); }
  if (talking()) return;
  updateDlg();
  if (G.shake > 0) G.shake *= 0.86;
  if (G.hitstop > 0) { G.hitstop--; return; }
  if (!G.done) { updatePlayer(); cue('tick'); } else { G.pl.vy = Math.min(G.pl.vy + 0.3, 4); const r = moveY(G.pl, G.pl.vy); if (r) G.pl.vy = 0; G.pl.sx += (1 - G.pl.sx) * 0.2; G.pl.sy += (1 - G.pl.sy) * 0.2; }
  updateWorld();
  updateFans();
  if (!G.done) interact();
  updateParts();
  updateHUD();
  updateCamera();
  updateResults();
}

// ---------------------------------------------------------------- drawing
const KC0 = { solid: ['#4a4a5a', '#7a7a8c', '#2a2a36'], oneway: ['#6a6a78', '#c8c8d4', '#3a3a46'], cracked: ['#9a7448', '#d8b07a', '#5a3e22'] };   // fallback tile colours
function drawBG() {   // LEVEL.theme.bg paints the backdrop; the script's drawBG adds to it
  const th = L.theme || {};
  if (th.bg) th.bg(ctx, G, DD);
  else { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#202a44'); g.addColorStop(1, '#0e1220'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  hook('drawBG', ctx, G);
}
function drawTiles() {   // LEVEL.theme: tiles {kind: [body, top edge, underside]}, tile(...) full custom draw, deco(...) extra detail, crawl [fill, top]
  const c = G.cam, th = L.theme || {}, cols = th.tiles || {}, cr = th.crawl || ['#12060c', '#060204'];
  const x0 = Math.floor(c.x / TS), x1 = Math.ceil((c.x + VW) / TS), y0 = Math.floor(c.y / TS), y1 = Math.ceil((c.y + VH) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || tx >= L.W || ty < 0 || ty >= L.H) continue;
    const k = gkind[ty * L.W + tx];
    if (!k) {   // a low gap under something solid reads as a dark crawlspace
      const up = ty > 0 && gkind[(ty - 1) * L.W + tx], dn = ty < L.H - 1 && gkind[(ty + 1) * L.W + tx];
      if (up && TILE[up] !== 2 && dn) {
        const X = tx * TS - Math.round(c.x), Y = ty * TS - Math.round(c.y);
        ctx.fillStyle = cr[0]; ctx.fillRect(X, Y, TS, TS); ctx.fillStyle = cr[1]; ctx.fillRect(X, Y, TS, 3);
      }
      continue;
    }
    const col = cols[k] || KC0[k] || (TILE[k] === 2 ? KC0.oneway : TILE[k] === 3 ? KC0.cracked : KC0.solid), [b, hi, lo] = col;
    const X = tx * TS - Math.round(c.x), Y = ty * TS - Math.round(c.y);
    if (th.tile && th.tile(ctx, k, X, Y, tx, ty, col)) continue;
    if (TILE[k] === 2) { ctx.fillStyle = b; ctx.fillRect(X, Y, TS, 4); ctx.fillStyle = hi; ctx.fillRect(X, Y, TS, 1); continue; }
    const above = ty > 0 ? gkind[(ty - 1) * L.W + tx] : null, below = ty < L.H - 1 ? gkind[(ty + 1) * L.W + tx] : null;
    ctx.fillStyle = b; ctx.fillRect(X, Y, TS, TS);
    if (th.deco) th.deco(ctx, k, X, Y, tx, ty, col, above, below);
    if (above !== k && !(above && k !== 'cracked' && TILE[above] !== 2)) { ctx.fillStyle = hi; ctx.fillRect(X, Y, TS, 2); }
    if (!below) { ctx.fillStyle = lo; ctx.fillRect(X, Y + TS - 2, TS, 2); }
  }
}
function wx(x) { return Math.round(x - G.cam.x); }
function wy(y) { return Math.round(y - G.cam.y); }
function drawBodies() {
  for (const b of bodies) {
    if (b.cutHide) continue;   // a cutscene has this one off stage
    const X = wx(b.x), Y = wy(b.y);
    if (X > VW + 64 || X + b.w < -64) continue;
    switch (b.kind) {
      case 'crate':
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(X, Y, b.w, b.h); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(X + 1, Y + 1, b.w - 2, b.h - 2);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#1c1a24' : '#2e2c3a'; ctx.fillRect(X + 3 + i * 6, Y + 5, 5, 22); ctx.fillStyle = '#f4ecda'; ctx.fillRect(X + 4 + i * 6, Y + 9, 3, 6); ctx.fillStyle = '#d8202c'; ctx.fillRect(X + 3 + i * 6, Y + 24, 5, 2); }
        ctx.fillStyle = '#c08a4a'; ctx.fillRect(X + 1, Y + 1, b.w - 2, 2);
        break;
      case 'stack':
        if (b.state === 'hidden') break;
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? '#1c1a24' : '#2e2c3a'; ctx.fillRect(X + (i % 3 === 1 ? 1 : 0), Y + i * 8, 32, 8);
          ctx.fillStyle = '#f4ecda'; ctx.fillRect(X + 4, Y + i * 8 + 2, 14, 4); ctx.fillStyle = '#d8202c'; ctx.fillRect(X + 22, Y + i * 8 + 2, 6, 4);
        }
        ctx.fillStyle = '#fff2c0'; ctx.fillRect(X, Y, 32, 1);
        break;
      case 'gate':
        ctx.fillStyle = '#3a3a46'; ctx.fillRect(X, Y, b.w, b.h);
        for (let i = 2; i < b.w; i += 4) { ctx.fillStyle = '#c8c8d4'; ctx.fillRect(X + i, Y, 2, b.h); }
        ctx.fillStyle = '#f0c84a'; ctx.fillRect(X, Y + b.h - 4, b.w, 4);
        break;
      case 'kernel': {
        const blink = b.on && b.t < 90 && Math.floor(b.t / 6) % 2;
        for (let i = 0; i < b.w / TS; i++) {
          const kx = X + i * TS;
          if (b.on && !blink) { spr('pop', kx + 8, Y + 12); ctx.fillStyle = '#e8b040'; ctx.fillRect(kx, Y + 12, TS, 4); ctx.fillStyle = '#fff6d4'; ctx.fillRect(kx, Y + 12, TS, 1); }
          else { ctx.fillStyle = 'rgba(240,224,160,0.45)'; for (let d = 0; d < 16; d += 4) { ctx.fillRect(kx + d, Y + 12, 2, 1); ctx.fillRect(kx + d, Y + 15, 2, 1); } ctx.fillRect(kx + 7, Y + 6, 2, 2); }
        }
        break;
      }
      case 'tub': spr('tub', X + 8, Y + 22, false, 1 + b.squash * 0.02, 1 - b.squash * 0.03); break;
      case 'plate': ctx.fillStyle = b.lit ? '#ffe680' : '#a8862a'; ctx.fillRect(X + 4, Y, b.w - 8, 3); ctx.fillStyle = '#fff6c0'; if (b.lit) ctx.fillRect(X + 4, Y, b.w - 8, 1); break;
      case 'card': spr('card', X + 16, Y + 9); break;
      case 'ghost': {
        if (G.pl.dot === b.dot) break;
        const a = 0.28 + 0.15 * Math.sin(G.frame / 12);
        spr(b.dot, X + 8, Y, false, 1, 1, 0, a);
        text('?', X + 7, Y - 34 + Math.sin(G.frame / 15) * 2, DOTS[b.dot].col, 1, null);
        break;
      }
      case 'cp': {
        if (b.lit && b.litT === undefined) b.litT = 0;
        const lt = b.lit ? b.litT++ : 99, hop = lt < 24 ? Math.sin(lt / 24 * Math.PI) : 0, wig = b.lit && lt >= 24 ? Math.sin(G.frame / 9) * 0.03 : 0;
        spr(b.lit ? 'popper_on' : 'popper_off', X + 10, Y + 32 - Math.round(hop * 6), false, 1 - hop * 0.15 + wig, 1 + hop * 0.2 - wig);
        if (b.lit && lt >= 24 && G.frame % 50 === 0) parts.push({ x: cx(b) + (Math.random() - 0.5) * 6, y: b.y + 2, vx: (Math.random() - 0.5) * 1.4, vy: -2.4, life: 40, max: 40, pop: true, g: 0.14, sc: 0.6 });
        break;
      }
      case 'vhs': if (!b.got) { const turn = Math.cos(G.frame / 26); spr('vhs', X + 8, Y + 24 + Math.round(Math.sin(G.frame / 14) * 2), turn < 0, Math.max(0.15, Math.abs(turn)), 1); if (G.frame % 40 < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(X + 12, Y + 2, 2, 2); } } break;
      case 'dsec': if (!b.got) drawSecret(b, X, Y); break;
      case 'gchip': if (!b.got) drawGoldChip(b, X, Y); break;
      case 'fact': if (!b.got) { const yy = Y + Math.round(Math.sin(G.frame / 12 + 1) * 2); ctx.fillStyle = '#0e2e7a'; ctx.fillRect(X, yy, 14, 11); ctx.fillStyle = '#3a78e8'; ctx.fillRect(X + 1, yy + 1, 12, 9); ctx.fillStyle = '#cfe0ff'; ctx.fillRect(X + 3, yy + 3, 8, 1); ctx.fillRect(X + 3, yy + 5, 8, 1); ctx.fillRect(X + 3, yy + 7, 5, 1); if (G.frame % 50 < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(X + 11, yy - 1, 2, 2); } } break;
      case 'goal': {
        if (L.drawGoal && L.drawGoal(ctx, G, b, X, Y)) break;   // a level can draw its own finish (return true to skip the default tape)
        ctx.fillStyle = '#0a080e'; ctx.fillRect(X - 1, Y - 1, b.w + 2, b.h + 2);
        ctx.fillStyle = '#1c1a24'; ctx.fillRect(X, Y, b.w, b.h);
        ctx.fillStyle = '#f4ecda'; ctx.fillRect(X + 6, Y + 10, b.w - 12, b.h - 34);
        ctx.fillStyle = '#d8202c'; ctx.fillRect(X, Y + b.h - 18, b.w, 8);
        for (let i = 0; i < 'CLASSICS'.length; i++) text('CLASSICS'[i], X + b.w / 2 - 1, Y + 16 + i * 10, '#d8202c', 1, null);
        for (let i = 0; i <= 4; i++) { ctx.fillStyle = i % 2 ? '#f0c84a' : '#c98f22'; ctx.fillRect(X + b.w + 2, Y + i * (b.h / 4) - 1, 4, 2); }
        break;
      }
      default: if (b.def && b.def.draw) {   // custom entities; a character (one that drew a sprite last frame) standing on a floor gets a shadow
        const char = b.def.shadow !== false && !b.def.solid && b._img >= G.frame - 2 && b.w <= 64 && b.h >= 12;
        if (char) { const fy = floorBelow(b.x + b.w / 2, b.y + b.h - 2, 6); if (fy !== null) shadowAt(b.x + b.w / 2, fy, Math.min(40, Math.max(12, b.w + 4)), true); }
        const di = ctx.drawImage, own = Object.prototype.hasOwnProperty.call(ctx, 'drawImage');
        ctx.drawImage = function () { b._img = G.frame; return di.apply(ctx, arguments); };
        try { if (isBossBody(b)) drawBossBody(b); else b.def.draw(b, ctx, G); } finally { if (own) ctx.drawImage = di; else delete ctx.drawImage; }
      }
    }
  }
}
const FACE = ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'sesssses', 'sbssssbs', 'sssmmsss', '.ssssss.', '..ssss..'];
const FINGER = ['.yY..', '.yY..', '.yY..', 'yYYY.', 'yYYYY', 'yYYYy', '.yyy.', '..k..', '..k..'];
function pix(map, cols, x, y) {
  for (let r = 0; r < map.length; r++) for (let c = 0; c < map[r].length; c++) {
    const col = cols[map[r][c]]; if (col) { ctx.fillStyle = col; ctx.fillRect(x + c, y + r, 1, 1); }
  }
}
function fanSprite(f) { return (f.type === 'gh' ? 'greggheads_' : 'timheads_') + (Math.floor(f.anim / 10) % 2 ? 'b' : 'a'); }
function drawFoamHead(type, x, y, rot, flip, alpha = 1) {   // the head half of the fan sprite, centred on its middle
  const n = type === 'gh' ? 'greggheads_a' : 'timheads_a'; if (!ready(n)) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(IMG[n], 0, 0, 20, 15, -10, -8, 20, 15); ctx.restore();
}
function drawFans() {
  const placed = [];   // this frame's speech bubbles, so two never sit on top of each other
  for (const f of fans) {
    if (!f.cols) { const k = Math.floor((f.spawn ? f.spawn.x : f.x) / TS); Object.assign(f, { hair: f.hair || HAIR[k % HAIR.length] }, outfit(f.type, k)); }   // a fan a level built by hand (2-boss's flute pair) gets clothes too
    if (f.state === 'gone' || f.state === 'idle' && (wx(f.x) > VW + 32)) continue;
    const name = fanSprite(f); if (!ready(name)) continue;
    if (f.state !== 'flung') shadowAt(cx(f), bot(f) + 2, 16, f.onGround);
    const im = IMG[name], X = wx(cx(f)), Y = wy(bot(f)) + 2, flip = (f.state === 'flung' ? f.vx : f.dir) > 0;
    const walking = (f.state === 'walk' && Math.abs(f.vx) > 0.1) || f.state === 'flee';
    const bob = walking ? -Math.round(Math.abs(Math.sin(f.anim * 0.35)) * 2) : 0;
    const tilt = f.state === 'scuffle' ? Math.sin(G.frame * 1.3) * 0.25 : walking ? Math.sin(f.anim * 0.35) * 0.1 : 0;
    ctx.save(); ctx.translate(X, Y);
    if (f.state === 'flung') { ctx.translate(0, -15); ctx.rotate(f.rot); ctx.translate(0, 15); }
    if (flip) ctx.scale(-1, 1);
    pix(FANBODY[f.type + (name.endsWith('b') ? '_b' : '_a')], f.cols, -10, -15);   // body: their own clothes and skin
    const cols = { h: f.hair, s: f.skin, e: '#1a0e14', b: '#e87a8a', m: '#7a3436' };
    if (f.headless) {
      pix(FACE, cols, -4, -23);   // just a regular person, now very embarrassed
      if (f.state === 'flee' && f.t % 20 < 12) { ctx.fillStyle = '#9ad8ff'; ctx.fillRect(4, -22, 1, 2); }
    } else {
      ctx.fillStyle = f.skin; ctx.fillRect(-2, -17, 4, 3);   // their real neck shows when the foam head bounces
      ctx.save(); ctx.translate(0, -15 + bob); ctx.rotate(tilt);
      ctx.drawImage(im, 0, 0, 20, 15, -10, -15, 20, 15);
      const mx = f.type === 'gh' ? -3 : -4, mw = f.type === 'gh' ? 4 : 5;   // the person inside, peering out of the foam mouth
      ctx.fillStyle = '#1a0e14'; ctx.fillRect(mx, -4, mw, 2);
      ctx.fillStyle = '#f8e8d8'; ctx.fillRect(mx, -4, 1, 1); ctx.fillRect(mx + mw - 1, -4, 1, 1);
      ctx.restore();
    }
    if (f.type === 'gh' && f.state !== 'flung') {   // GreggHeads pump a yellow #1 foam finger
      const pump = walking || f.state === 'scuffle' ? -Math.round(Math.abs(Math.sin(f.anim * 0.35 + 1)) * 2) : 0;
      pix(FINGER, { Y: '#f0c030', y: '#a87416', k: '#5a3a10' }, 7, -27 + pump);
    }
    ctx.restore();
    if (f.say && f.state !== 'flung' && !hush()) {   // speech bubble (held back while a line is up)
      const t = f.say.txt, w = t.length * 4 + 3, bx = Math.round(X - w / 2); let by = Y - 46 + (f.headless ? 8 : 0) - (f.state === 'scuffle' && f.type === 'gh' ? 10 : 0);
      for (let n = 0; n < 4; n++) { const hit = placed.find(q => bx < q[0] + q[2] + 2 && bx + w + 2 > q[0] && by < q[1] + 11 && by + 11 > q[1]); if (!hit) break; by = hit[1] - 12; }
      placed.push([bx, by, w]);
      ctx.fillStyle = '#1a0e14'; ctx.fillRect(bx - 1, by - 1, w + 2, 9); ctx.fillRect(X - 1, by + 8, 3, 2);
      ctx.fillStyle = '#fff6ec'; ctx.fillRect(bx, by, w, 7); ctx.fillRect(X, by + 7, 1, 2);
      text(t, bx + 2, by + 1, f.say.col, 1, null);
    }
  }
  for (const s of G.scuffles || []) {
    const X = wx(s.x), Y = wy(s.y);
    for (let i = 0; i < 7; i++) { const a = G.frame * 0.4 + i; ctx.fillStyle = i % 2 ? '#f0e8e0' : '#c8bcb8'; ctx.beginPath(); ctx.arc(X + Math.cos(a) * 10, Y + Math.sin(a * 1.3) * 7, 6, 0, 7); ctx.fill(); }
    text(['!', '#', '?', '%'][Math.floor(G.frame / 5) % 4], X - 1, Y - 18, '#d8202c', 2, '#000');
  }
}
const DOT_FRAMES = ['idle', 'blink', 'walk0', 'walk1', 'walk2', 'walk3', 'jump', 'apex', 'fall', 'land', 'skid', 'hurt'];   // order of the <dot>_anim strips
function dotPose(p) {   // which frame of the strip the Dot is in right now
  if (p.inv > 72) return 'hurt';
  if (p.slam === 1) return 'apex';
  if (p.slam === 2) return 'fall';
  if (!p.onGround) return p.glide ? 'apex' : p.vy < -1.2 ? 'jump' : p.vy < 1 ? 'apex' : 'fall';
  if (p.landT > 0) return 'land';
  if (p.skidT > 4) return 'skid';
  if (Math.abs(p.vx) > 0.3) return 'walk' + (Math.floor(p.anim * 0.9) % 4);
  const t = G.frame + p.dot.length * 37, cyc = t % 230;   // blink every ~4 s, with a double blink now and then
  return cyc < 6 || (Math.floor(t / 230) % 3 === 2 && cyc > 12 && cyc < 18) ? 'blink' : 'idle';
}
const RIMS = {};
function rimStrip(n) {   // the 1-px ring just outside every frame of a strip, in warm white (built once per strip)
  if (RIMS[n] !== undefined) return RIMS[n];
  RIMS[n] = null;
  try {
    const im = IMG[n], F = DOT_FRAMES.length, fw = im.width / F, h = im.height, c = document.createElement('canvas'); c.width = (fw + 2) * F; c.height = h + 2;
    const x = c.getContext('2d');
    for (let f = 0; f < F; f++) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.drawImage(im, f * fw, 0, fw, h, f * (fw + 2) + 1 + dx, 1 + dy, fw, h);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff4dc'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-out'; for (let f = 0; f < F; f++) x.drawImage(im, f * fw, 0, fw, h, f * (fw + 2) + 1, 1, fw, h);
    RIMS[n] = c;
  } catch (e) { RIMS[n] = null; }
  return RIMS[n];
}
function drawDot(dot, pose, X, Y, flip, sx, sy, rot, alpha = 1, rim = 0) {   // one frame of a Dot's strip by its bottom-centre (the base sprite if the strip isn't loaded); rim 0..1 adds the light ring
  const n = dot + '_anim';
  if (!ready(n)) return spr(dot, X, Y, flip, sx, sy, rot, alpha);
  const im = IMG[n], fw = im.width / DOT_FRAMES.length, fi = Math.max(0, DOT_FRAMES.indexOf(pose));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(X), Math.round(Y));
  if (rot) { ctx.translate(0, -im.height / 2); ctx.rotate(rot); ctx.translate(0, im.height / 2); }
  ctx.scale(flip ? -sx : sx, sy);
  const rs = rim > 0.02 && rimStrip(n);
  if (rs) { const a = ctx.globalAlpha; ctx.globalAlpha = a * rim; ctx.drawImage(rs, fi * (fw + 2), 0, fw + 2, im.height + 2, -Math.round(fw / 2) - 1, -im.height - 1, fw + 2, im.height + 2); ctx.globalAlpha = a; }
  const dz = window.DDWear && window.DDWear.frame(dot, im, fi, fw);   // the casino wardrobe's outfit and texture (wardrobe.js), or the plain frame
  if (dz) ctx.drawImage(dz.c, 0, 0, dz.w, dz.h, -Math.round(fw / 2) - dz.ox, -im.height - dz.oy, dz.w, dz.h);
  else ctx.drawImage(im, fi * fw, 0, fw, im.height, -Math.round(fw / 2), -im.height, fw, im.height);
  ctx.restore();
}
function groundBelow(p) {   // world y of the surface under the Dot (within 6 tiles), or null over a pit
  if (p.onGround) return bot(p);
  const tx = Math.floor(cx(p) / TS);
  for (let ty = Math.max(0, Math.floor((bot(p) - 1) / TS) + 1), n = 0; n < 7 && ty < L.H; ty++, n++) { const t = T(tx, ty); if (t && ty * TS >= bot(p) - 1) return ty * TS; }
  return null;
}
function drawGoldChip(b, X, Y) {   // a gold casino chip turning in the air; one found on an earlier run is a faint ghost of it
  const turn = Math.cos(G.frame / 18), w = Math.max(1, Math.round(Math.abs(turn) * 6)), cx0 = Math.round(X + 7), cy0 = Math.round(Y + 7 + Math.sin(G.frame / 14) * 2);
  ctx.save(); if (b.had) ctx.globalAlpha = 0.35;
  const row = (dy, hw, c) => { ctx.fillStyle = c; ctx.fillRect(cx0 - hw, cy0 + dy, hw * 2, 1); };
  for (let dy = -6; dy <= 6; dy++) { const hw = Math.round(w * Math.sqrt(1 - (dy / 6.5) ** 2)); if (hw <= 0) continue; row(dy, hw + 1, '#5a3008'); }
  for (let dy = -5; dy <= 5; dy++) { const hw = Math.round(w * Math.sqrt(1 - (dy / 6.5) ** 2)); if (hw <= 0) continue; row(dy, hw, turn > 0 ? '#e8b030' : '#c8902a'); }
  if (w >= 3) { for (let dy = -5; dy <= 5; dy += 2) { ctx.fillStyle = '#fff6d4'; ctx.fillRect(cx0 - w + 1, cy0 + dy, 1, 1); ctx.fillRect(cx0 + w - 2, cy0 + dy, 1, 1); } ctx.fillStyle = '#b06a18'; ctx.fillRect(cx0 - Math.max(1, w - 3), cy0 - 2, Math.max(2, (w - 3) * 2), 4); ctx.fillStyle = '#fff0a0'; ctx.fillRect(cx0 - 1, cy0 - 1, 2, 1); }
  if (!b.had && G.frame % 40 < 6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx0 + 3, cy0 - 7, 1, 3); ctx.fillRect(cx0 + 2, cy0 - 6, 3, 1); }
  ctx.restore();
}
function drawShadow(p, X) {   // a soft oval on the floor that shrinks and fades as the Dot rises
  if (p.rolling) return;
  const gy = groundBelow(p); if (gy === null) return;
  const k = 1 - Math.min(1, (gy - bot(p)) / 72); if (k <= 0) return;
  const w = Math.round((p.w + 6) * (0.55 + 0.45 * k)), a = (0.34 * k).toFixed(3), SY = wy(gy), L0 = X - (w >> 1);
  ctx.fillStyle = `rgba(10,4,14,${a})`;
  ctx.fillRect(L0 + 2, SY - 1, w - 4, 1); ctx.fillRect(L0, SY, w, 1); ctx.fillRect(L0 + 2, SY + 1, w - 4, 1);
}
let rimLum = 255, rimAt = -99;
function rimFor(X, Y) {   // how much rim light the Dot needs: measures the set behind it now and then (0 on a bright set)
  if (G.frame - rimAt >= 12 || G.frame < rimAt) {
    rimAt = G.frame;
    try { const d = ctx.getImageData(Math.max(0, X - 12), Math.max(0, Y - 30), 24, 30).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 12) { s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++; } rimLum = n ? s / n : 255; }
    catch (e) { rimLum = 255; }
  }
  return clamp((78 - rimLum) / 60, 0, 1) * 0.5;
}
// contact shadows: a soft dark oval on the floor under every character, so they stand on the set instead of floating over it.
// Off the ground it stays on the floor below and shrinks and fades with the height.
function floorBelow(x, y, max = 96) {   // world y of the first standable tile top at or below world (x, y), or null
  const tx = Math.floor(x / TS); for (let ty = Math.max(0, Math.floor(y / TS)); ty * TS < y + max && ty < L.H; ty++) if (T(tx, ty)) return ty * TS;
  return null;
}
function shadowAt(x, footY, w, onGround) {   // world x (centre), world y of the feet, width in px
  const fy = onGround ? Math.round(footY) : floorBelow(x, footY); if (fy === null) return;
  const h = fy - footY, k = Math.max(0, 1 - h / 80); if (k <= 0.05) return;
  const W = Math.max(4, Math.round(w * (0.55 + 0.45 * k))), X = Math.round(wx(x) - W / 2), Y = wy(fy);
  ctx.fillStyle = `rgba(8,3,10,${(0.46 * k).toFixed(3)})`;
  ctx.fillRect(X + 2, Y - 1, W - 4, 1); ctx.fillRect(X, Y, W, 1); ctx.fillRect(X + 2, Y + 1, W - 4, 1);
}
function drawPlayer() {   // GERM FREE wraps the Dot in a cycling rainbow (a hue filter, and a glow behind for browsers without canvas filters)
  const st = G.star > 0 && !G.done && (G.star > 120 || Math.floor(G.star / 6) % 2);   // it flickers out over the last two seconds
  { const p = G.pl; if (!G.done || p.onGround) shadowAt(cx(p), bot(p), p.dot === 'baxter' ? 12 : 16, p.onGround); }
  if (window.DDWear && !G.pl.rolling) window.DDWear.trail(G, G.pl, cx(G.pl), bot(G.pl), wx, wy, dotPose(G.pl));   // the wardrobe's running trail, behind the Dot
  if (!st) return drawDotNow();
  const p = G.pl, X = wx(cx(p)), Y = wy(p.y + p.h / 2), hue = (G.frame * 14) % 360;
  ctx.save(); const gl = ctx.createRadialGradient(X, Y, 2, X, Y, p.h * 0.9);
  gl.addColorStop(0, `hsla(${hue},100%,70%,0.55)`); gl.addColorStop(1, `hsla(${(hue + 120) % 360},100%,60%,0)`); ctx.fillStyle = gl; ctx.fillRect(X - p.h, Y - p.h, p.h * 2, p.h * 2);
  ctx.filter = `hue-rotate(${hue}deg) saturate(2.4) brightness(1.2)`;
  try { drawDotNow(); } finally { ctx.restore(); }
}
function drawDotNow() {
  const p = G.pl;
  if (p.inv > 0 && p.inv <= 72 && Math.floor(p.inv / 3) % 2 && !G.done) return;
  const X = wx(cx(p)), Y = wy(bot(p)), pose = dotPose(p);
  let rot = 0, sx = p.sx, sy = p.sy;
  if (p.rolling) rot = p.rollAng;
  if (p.spin) rot = p.face * (p.spin / 20) * Math.PI * 2;
  if (p.slam === 1) { sx = 1.15; sy = 0.85; rot = Math.sin(p.slamT) * 0.1; }
  if (p.slam === 2) { sx = 0.8; sy = 1.3; }
  if (p.glide) rot = Math.sin(G.frame / 8) * 0.08;
  if (!p.spin && !p.rolling && !p.slam && !p.glide) {
    if (pose.startsWith('walk')) rot = p.face * Math.min(0.1, Math.abs(p.vx) * 0.045);   // lean into the run
    else if (pose === 'skid') rot = -p.face * 0.16;                                        // lean back against the skid
    else if (pose === 'hurt') rot = -sign(p.vx || -p.face) * 0.25;                        // knocked back
    else if (!p.onGround) rot = clamp(p.vx * 0.04, -0.12, 0.12);
  }
  drawShadow(p, X);
  const rim = rimFor(X, Y);
  if (p.onGround && p.idleT > 20 && !p.slam) {   // standing still: breathe (Cloud floats a little instead)
    const b = Math.sin(p.idleT / (p.dot === 'baxter' ? 40 : 28));
    if (p.dot === 'cloud') { drawDot(p.dot, pose, X, Y - 1 - Math.round((b + 1) * 1.2), p.face < 0, sx, sy, rot, 1, rim); return; }
    sy *= 1 + b * 0.025; sx *= 1 - b * 0.015;
  }
  if (p.rolling) { ctx.save(); ctx.translate(X, Y - 6); ctx.rotate(rot); ctx.scale(0.75, 0.75); if (ready('mel')) ctx.drawImage(IMG.mel, -8, -10); ctx.restore(); }
  else drawDot(p.dot, pose, X, Y, p.face < 0, sx, sy, rot, 1, rim);
  if (p.skidT > 6 && p.onGround) { ctx.fillStyle = '#fff'; ctx.fillRect(X + p.face * 9, Y - 14, 2, 2); }
}
// ---------------------------------------------------------------- boss pose life: every boss gets wind-up and follow-through on each new move,
// a recoil when hit, a breath at rest and a hop-and-wobble when beaten, without the boss files knowing. While a boss draws itself,
// any image it draws over its own body is bent by the pose (about its feet); telegraphs and far-off projectiles are left alone.
const isBossBody = b => !!(b.def.boss || /_boss$/.test(b.kind));
function bossPose(e) {
  const B = G.boss, a = e._pose || (e._pose = { st: e.st, f: G.frame, sx: 1, sy: 1, vx: 0, vy: 0, kx: 0, fl: 0, deadT: -1 });
  if (a.f === G.frame) return a;   // the spring runs at the sim rate, not the display rate
  a.f = G.frame;
  if (e.st !== a.st) { if (G.frame - (a.at || 0) > 8) { a.sx = 1.12; a.sy = 0.86; a.vx = a.vy = 0; } a.st = e.st; a.at = G.frame; }   // new move: squash into it, then spring out past it (not for flickers)
  const fl = B ? B.flash : 0;
  if (fl > a.fl) { a.sx = 0.84; a.sy = 1.16; a.vx = a.vy = 0; a.kx = -(e.dir || 1) * 5; }      // hit: stretch and get knocked back
  a.fl = fl;
  if (B && B.dead && a.deadT < 0) { a.deadT = 0; a.sx = 1.25; a.sy = 0.75; }
  if (a.deadT >= 0) a.deadT++;
  a.vx = (a.vx + (1 - a.sx) * 0.22) * 0.72; a.vy = (a.vy + (1 - a.sy) * 0.22) * 0.72;
  a.sx += a.vx; a.sy += a.vy; a.kx *= 0.82;
  return a;
}
function drawBossBody(e) {
  const a = bossPose(e);
  const base = ctx.getTransform && ctx.getTransform();
  if (!base || !base.inverse || typeof DOMPoint === 'undefined') return e.def.draw(e, ctx, G);   // headless
  let sx = a.sx, sy = a.sy, rot = 0, dy = 0;
  if (a.deadT < 0) { const br = Math.sin(G.frame / 22); sy *= 1 + br * 0.02; sx *= 1 - br * 0.012; }   // breathing
  else { const t = a.deadT; dy = -Math.sin(Math.min(1, t / 26) * Math.PI) * 12; rot = Math.sin(t * 0.45) * 0.22 * Math.exp(-t / 45); }   // beaten: a hop, then a wobble that dies away
  const fx = wx(cx(e)), fy = wy(e.y + e.h), L0 = wx(e.x) - 14, R0 = wx(e.x + e.w) + 14, T0 = wy(e.y) - 24, B0 = fy + 8;
  const inv = base.inverse(), draw = ctx.drawImage, own = Object.prototype.hasOwnProperty.call(ctx, 'drawImage');
  ctx.drawImage = function (im, ...r) {
    const [dx0, dy0, dw, dh] = r.length >= 8 ? r.slice(4, 8) : r.length >= 4 ? r : [r[0], r[1], im.width, im.height];
    const rel = inv.multiply(ctx.getTransform()), p = rel.transformPoint(new DOMPoint(dx0 + dw / 2, dy0 + dh / 2));
    if (p.x < L0 || p.x > R0 || p.y < T0 || p.y > B0) return draw.call(ctx, im, ...r);   // not the boss: leave it be
    ctx.save(); ctx.setTransform(base);
    ctx.translate(fx + a.kx, fy + dy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-fx, -fy);
    ctx.transform(rel.a, rel.b, rel.c, rel.d, rel.e, rel.f);
    draw.call(ctx, im, ...r); ctx.restore();
  };
  try { e.def.draw(e, ctx, G); } finally { if (own) ctx.drawImage = draw; else delete ctx.drawImage; }
}
function drawPops() {
  for (const c of pops) {
    if (c.got) continue;
    const X = wx(c.x), Y = wy(c.y);
    if (X < -12 || X > VW + 12 || Y < -12 || Y > VH + 12) continue;
    const bob = Math.round(Math.sin((G.frame + c.ph * 3) / 14) * 1.5);
    const wob = Math.sin((G.frame + c.ph * 5) / 18) * 0.18;
    const k = ready('pop_s') ? 'pop_s' : 'pop', dy = k === 'pop_s' ? 4 : 5;   // the field kernel is the 9x8 one, so pickups don't drown the set
    if (c.tag === 'cloud') { ctx.globalAlpha = 0.85; spr(k, X, Y + dy + bob, false, 1, 1, wob); ctx.globalAlpha = 1; ctx.fillStyle = '#b8c4ec'; ctx.fillRect(X - 1, Y + 6, 2, 1); }
    else spr(k, X, Y + dy + bob, false, 1, 1, wob);
    if ((G.frame + c.ph * 23) % 180 < 5) { ctx.fillStyle = '#fff'; ctx.fillRect(X + 1, Y - 2 + bob, 1, 1); ctx.fillRect(X, Y - 1 + bob, 3, 1); ctx.fillRect(X + 1, Y + bob, 1, 1); }   // a glint now and then
  }
  for (const c of loose) {
    if (c.life < 60 && Math.floor(c.life / 4) % 2) continue;
    if (c.v > 1) spr('pop', wx(c.x), wy(c.y) + 5, false, 1.5, 1.5); else spr('pop', wx(c.x), wy(c.y) + 5);
  }
}
function drawParts() {
  for (const q of parts) {
    const a = q.life / q.max;
    if (q.txt) { text(q.txt, wx(q.x), wy(q.y), q.col, 1, '#000', 'center'); continue; }
    if (q.head) { drawFoamHead(q.head, wx(q.x), wy(q.y), q.rot, q.flip, q.life < 90 && Math.floor(q.life / 4) % 2 ? 0.3 : 1); continue; }
    if (q.prop) {
      const X = wx(q.x), Y = wy(q.y);
      if (q.prop === 'finger') { ctx.fillStyle = '#f0c030'; ctx.fillRect(X, Y - 3, 2, 3); ctx.fillRect(X - 1, Y, 4, 3); }
      else if (q.prop === 'card') { ctx.fillStyle = '#94e0cc'; ctx.fillRect(X - 2, Y, 5, 3); ctx.fillStyle = '#2a6e68'; ctx.fillRect(X - 2, Y + 2, 5, 1); }
      else { ctx.fillStyle = '#1c1a24'; ctx.fillRect(X - 2, Y, 5, 3); ctx.fillStyle = '#d8202c'; ctx.fillRect(X - 2, Y + 2, 5, 1); }
      continue;
    }
    if (q.pop) {
      const k = q.sc || 1; spr('pop', wx(q.x), wy(q.y) + 5, false, k, k, (q.max - q.life) * 0.3); continue;
    }
    ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = q.col;
    if (q.ring) { ctx.strokeStyle = q.col; ctx.beginPath(); ctx.arc(wx(q.x), wy(q.y), q.r + (1 - a) * 8, 0, 7); ctx.stroke(); }
    else if (q.star) { ctx.fillRect(wx(q.x) - 1, wy(q.y), 3, 1); ctx.fillRect(wx(q.x), wy(q.y) - 1, 1, 3); }
    else ctx.fillRect(wx(q.x) - q.r / 2, wy(q.y) - q.r / 2, q.r, q.r);
    ctx.globalAlpha = 1;
  }
}
function drawBag(x, y, fill = 1, empty = 0.22, rot = 0, sc = 1, dim = 0.35) {   // the popcorn tub sprite; fill 0..1 fills it from the bottom, the rest is a dim ghost (dim: its brightness); rot/sc wiggle it about its base
  if (!ready('tub')) return;
  const im = IMG.tub, w = im.width, h = im.height, from = Math.round(h - fill * h);
  ctx.save();
  if (rot || sc !== 1) { ctx.translate(Math.round(x + w / 2), y + h); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-w / 2, -h); x = 0; y = 0; }
  ctx.save(); ctx.globalAlpha *= empty; ctx.filter = 'grayscale(1) brightness(' + dim + ')'; ctx.drawImage(im, x, y); ctx.restore();   // grey: an empty tub never reads as a full red one
  if (fill > 0) ctx.drawImage(im, 0, from, w, h - from, x, y + from, w, h - from);
  if (fill > 0.02 && fill < 1) { ctx.fillStyle = 'rgba(255,246,212,0.9)'; ctx.fillRect(x + 2, y + from - 1, w - 4, 2); }   // the fill line, so a part-full tub shows how far it has to go
  ctx.restore();
}
function updateHUD() {   // the popcorn counter bounces when it changes; a bag wiggles (and dings) when it fills
  if (G.got !== G.hudGot) { G.cntDir = sign(G.got - G.hudGot); G.cntT = 12; G.hudGot = G.got; }
  if (G.cntT > 0) G.cntT--;
  const nb = Math.floor(5 * bagFrac());
  if (nb > G.bagN) { for (let i = G.bagN; i < nb; i++) G.bagWig[i] = 34; if (nb === 5 && G.pk && G.pk.six) G.bagWig[5] = 34; SFX.bag(); }
  G.bagN = nb;
  for (let i = 0; i < 5; i++) if (G.bagWig[i] > 0) G.bagWig[i]--;
}
// ---------------------------------------------------------------- depth, foreground and grade: game-wide set dressing over every stage
// Depth: solid ground darkens the further it is from open air, so walkable edges stay bright and big fills stop reading as wallpaper.
// LEVEL.theme.depth = false turns it off; theme.depthCol = 'r,g,b' tints it.
let depthMap = null, depthKey = null;
function depthAt() {
  if (depthMap && depthKey === gkind) return depthMap;
  const W = L.W, H = L.H, d = new Uint8Array(W * H), q = [];
  for (let i = 0; i < W * H; i++) { const k = gkind[i]; if (k && TILE[k] !== 2) d[i] = 9; else q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i - x) / W, nd = d[i] + 1; if (nd > 4) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (d[j] > nd) { d[j] = nd; q.push(j); } }
  }
  depthMap = d; depthKey = gkind; return d;
}
const DEPTH_A = [0, 0, 0.16, 0.3, 0.42];
function drawDepth() {
  const th = L.theme || {}; if (th.depth === false) return;
  const d = depthAt(), c = G.cam, W = L.W, col = th.depthCol || '8,3,12';
  const x0 = Math.max(0, Math.floor(c.x / TS)), x1 = Math.min(W - 1, Math.ceil((c.x + VW) / TS)), y0 = Math.max(0, Math.floor(c.y / TS)), y1 = Math.min(L.H - 1, Math.ceil((c.y + VH) / TS));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * W + tx, v = Math.min(4, d[i]); if (v < 2) continue;
    const X = tx * TS - Math.round(c.x), Y = ty * TS - Math.round(c.y), up = ty > 0 ? Math.min(4, d[i - W]) : v;
    if (up >= 1 && up < v) {   // the step down from the row above: two bands, so it shades in rather than steps
      ctx.fillStyle = `rgba(${col},${(DEPTH_A[up] + DEPTH_A[v]) / 2})`; ctx.fillRect(X, Y, TS, TS / 2);
      ctx.fillStyle = `rgba(${col},${DEPTH_A[v]})`; ctx.fillRect(X, Y + TS / 2, TS, TS / 2);
    } else { ctx.fillStyle = `rgba(${col},${DEPTH_A[v]})`; ctx.fillRect(X, Y, TS, TS); }
  }
}
// Bloom: the set's own lights (lamps, screens, signs, marquees, windows, sun) bleed a soft glow into the air around them.
// The frame so far is shrunk to a quarter, thresholded and blurred, then screened back on. It runs after the set and before
// popcorn and characters, so only the set glows. [strength] per world, stronger on the dark sets; LEVEL.bloom = n or 0 overrides.
const BLOOM = { 1: 0.14, 2: 0.34, 3: 0.16, 4: 0.3, 5: 0.34, 6: 0.22, 7: 0.34, 8: 0.26, 9: 0.18, 10: 0.18, 11: 0.22, 12: 0.26 };
let bloomCv = null, bloomOK = true;
function drawBloom() {
  let a = L.bloom !== undefined ? L.bloom : BLOOM[parseInt(L.id, 10)] || 0; if (!a || !bloomOK || DD.noBloom) return;
  const fl = G.frame - (G.flareAt ?? -999), dp = G.frame - (G.dipAt ?? -999);
  if (fl < 50) a *= 1 + 1.4 * (1 - fl / 50);   // a boss changes phase: the lights flare up and settle
  if (dp < 14 && dp % 5 < 2) a *= 0.25;         // Baxter's slam shakes the rig: the lights flicker
  try {
    if (!bloomCv) { bloomCv = document.createElement('canvas'); bloomCv.width = VW / 4; bloomCv.height = VH / 4; if (!('filter' in bloomCv.getContext('2d'))) { bloomOK = false; return; } }
    const b = bloomCv.getContext('2d'), w = bloomCv.width, h = bloomCv.height;
    b.globalCompositeOperation = 'copy'; b.filter = 'brightness(0.72) contrast(2.8) saturate(1.3) blur(2px)'; b.imageSmoothingEnabled = true;
    b.drawImage(ctx.canvas, 0, 0, w, h); b.filter = 'none';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bloomCv, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); ctx.imageSmoothingEnabled = false;
  } catch (e) { bloomOK = false; }
}
// The boss arena's follow spot: a soft beam from the rig onto the Dot and a pool at its feet, trailing a little like a real operator.
function drawFollowSpot() {
  const B = G.boss; if (!B || !B.engaged || B.dead || parseInt(L.id, 10) === 1 || L.spot === false || !DD.art) return;
  const p = G.pl, X = wx(cx(p)), Y = wy(bot(p));
  G.spotX = G.spotX === undefined || Math.abs(G.spotX - X) > 80 ? X : G.spotX + (X - G.spotX) * 0.1;
  const dp = G.frame - (G.dipAt ?? -999), k = dp < 14 && dp % 5 < 2 ? 0.3 : 1, sx = Math.round(G.spotX);
  DD.art.cone(sx, 0, Math.max(20, Y), 20, '#fff4dc', 0.075 * k); DD.art.glow(sx, Y - 2, 20, '#fff4dc', 0.12 * k);
}
function drawHitFlash() {   // a boss hit: the frame flashes white for a few frames, faintly
  const t = G.frame - (G.flashAt ?? -999); if (t < 0 || t > 4) return;
  ctx.fillStyle = `rgba(255,248,236,${(0.14 * (1 - t / 5)).toFixed(3)})`; ctx.fillRect(0, 0, VW, VH);
}
// Grade: each world gets a light colour cast (blend 'color', so brightness is kept) and, on the dark sets, a lift so blacks keep their detail.
// [tint, strength, lift]; LEVEL.grade = [...] or false overrides it.
const GRADE = {
  1: ['#ffd8a0', 0.08], 2: ['#ff8a5a', 0.08], 3: ['#ffb070', 0.08], 4: ['#ff6a4a', 0.08],
  5: ['#ffb060', 0.10, '#0e0a0c'], 6: ['#e8a868', 0.08], 7: ['#60d8ff', 0.08], 8: ['#ff80b8', 0.06],
  9: ['#e0c0ff', 0.05], 10: ['#a8e078', 0.08], 11: ['#60e0d0', 0.06], 12: ['#a8d0ff', 0.05],
};
function drawGrade() {
  const g = L.grade !== undefined ? L.grade : GRADE[parseInt(L.id, 10)]; if (!g) return;
  ctx.save();
  ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = g[1]; ctx.fillStyle = g[0]; ctx.fillRect(0, 0, VW, VH);
  if (g[2]) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 1; ctx.fillStyle = g[2]; ctx.fillRect(0, 0, VW, VH); }
  ctx.restore();
}
// Foreground: dark set pieces right up against the camera, sliding past faster than the play layer, along the bottom of the screen.
// They sink away when the camera climbs, hide over pits and low floors, and go see-through when the Dot is behind one.
// Each world has its own pieces (FG_KIND); LEVEL.theme.fg = a kind or false overrides it; theme.fgCol = [body, top edge].
const FG_KIND = { 1: 'hedge', 2: 'seats', 3: 'brush', 4: 'seats', 5: 'rail', 6: 'pews', 7: 'tripod', 8: 'tripod', 9: 'crowd', 10: 'plants', 11: 'plants', 12: 'crowd' };
const FG_MIX = { 1: 'plants', 2: 'tripod', 4: 'crates', 5: 'seats', 6: 'tripod', 7: 'rail', 8: 'seats', 9: 'plants', 10: 'crowd', 12: 'tripod' };   // a second piece mixed into about a third of a world's slots, so the row doesn't repeat
const FG_COL = {   // [body, lit top edge] per world
  1: ['#173f1f', '#2e6e38'], 2: ['#1a0608', '#4a1418'], 3: ['#2a1a10', '#4e3422'], 4: ['#160606', '#3a1210'], 5: ['#120c0a', '#6a5020'], 6: ['#1e120a', '#4a2e18'],
  7: ['#06080c', '#1c3040'], 8: ['#0e0810', '#3a2040'], 9: ['#120e16', '#2e2638'], 10: ['#0c1a0c', '#22401e'], 11: ['#0c1a16', '#1e4038'], 12: ['#0e1020', '#2a3050'],
};
const FG_STAGE = { '3-2': 'rail', '3-boss': false, '4-1': 'crates', '4-3': 'crates', '8-1': 'seats', '8-2': ['brush', 3], '8-3': 'crates', '9-1': ['plants', 10], '9-3': 'crates', '9-boss': 'tripod', '12-1': ['hedge', 1] };   // [kind, the world whose colours it borrows]
const fgHash = i => { let n = Math.imul(i | 0, 2654435761) >>> 0; n = (n ^ (n >>> 13)) >>> 0; return n / 4294967296; };
function fgPiece(kind, X, B, v, R) {   // one piece standing on screen y B, about 20 px tall at most; R(x, y, w, h) fills in the current colour
  const disc = (x, y, r) => { for (let d = -r; d <= r; d++) { const w = Math.round(Math.sqrt(r * r - d * d)); R(x - w, y + d, w * 2, 1); } };
  if (kind === 'hedge') { disc(X + 7, B - 8, 7); disc(X + 18, B - 11, 9); disc(X + 30, B - 8, 7); disc(X + 39, B - 5, 5); R(X, B - 4, 44, 4); return; }
  if (kind === 'plants') {   // a potted fern: a tapered pot, fronds fanning out and drooping at the tips
    R(X + 4, B - 8, 14, 2); R(X + 5, B - 6, 12, 3); R(X + 6, B - 3, 10, 3);
    for (let f = 0; f < 7; f++) { const a = -1.25 + f * 0.42, len = 12 - Math.abs(f - 3) * 1.2; for (let t = 0; t < len; t++) { const x = X + 11 + Math.sin(a) * t, y = B - 9 - Math.cos(a) * t + (t * t) * 0.035 * Math.abs(Math.sin(a)) * 2; R(Math.round(x), Math.round(y), 2, 1); } }
    return; }
  if (kind === 'crowd') { for (let h = 0; h < 4; h++) { const x = X + 5 + h * 13, y = B - 14 - ((h + Math.round(v * 3)) % 2) * 2; disc(x, y, 4); R(x - 6, y + 5, 12, B - y - 5); R(x - 5, y + 4, 10, 1); } return; }
  if (kind === 'seats') { for (let s = 0; s < 3; s++) { const x = X + s * 16; R(x + 2, B - 18, 10, 1); R(x + 1, B - 17, 12, 1); R(x, B - 16, 14, 16); R(x - 2, B - 7, 2, 7); } R(X + 46, B - 7, 2, 7); }
  else if (kind === 'rail') { for (const x of [X, X + 44]) { R(x + 1, B - 22, 3, 3); R(x + 2, B - 19, 1, 17); R(x, B - 3, 5, 3); } for (let i = 0; i <= 40; i += 2) { const sag = Math.round(Math.sin(i / 40 * Math.PI) * 6); R(X + 3 + i, B - 18 + sag, 2, 2); } }
  else if (kind === 'brush') { R(X, B - 6, 14, 6); R(X + 2, B - 8, 9, 2); for (let i = 0; i < 7; i++) { const h = 6 + Math.round(v * 6 + (i * 37 % 7)); R(X + 16 + i * 3, B - h, 1, h); R(X + 15 + i * 3, B - h + 2, 1, 1); } R(X + 36, B - 4, 8, 4); }
  else if (kind === 'hedge') { R(X + 4, B - 16, 20, 2); R(X + 1, B - 14, 28, 4); R(X, B - 10, 34, 10); R(X + 22, B - 18, 10, 6); R(X + 26, B - 20, 5, 2); }
  else if (kind === 'pews') { R(X, B - 15, 64, 3); R(X + 2, B - 12, 60, 6); R(X, B - 6, 3, 6); R(X + 61, B - 6, 3, 6); R(X + 30, B - 6, 3, 6); R(X - 1, B - 17, 4, 2); R(X + 61, B - 17, 4, 2); }
  else if (kind === 'tripod') { R(X + 4, B - 22, 14, 9); R(X + 18, B - 20, 4, 5); R(X + 10, B - 13, 2, 3); for (let i = 0; i < 10; i++) { R(X + 10 - i, B - 10 + i, 1, 1); R(X + 11 + i, B - 10 + i, 1, 1); R(X + 10, B - 10 + i, 2, 1); } }
  else if (kind === 'crowd') { for (let h = 0; h < 4; h++) { const x = X + h * 13, y = B - 14 - ((h + Math.round(v * 3)) % 2) * 2; R(x + 2, y, 6, 1); R(x + 1, y + 1, 8, 6); R(x + 2, y + 7, 6, 1); R(x - 1, y + 8, 12, B - y - 8); } }
  else if (kind === 'plants') { R(X + 4, B - 7, 12, 7); R(X + 3, B - 8, 14, 2); const L0 = [[9, 20, 2], [5, 17, 2], [13, 18, 2], [2, 13, 3], [15, 14, 3], [7, 15, 2]]; for (const [x, h, w] of L0) R(X + x, B - h, w, h - 8); R(X + 3, B - 17, 3, 2); R(X + 14, B - 18, 3, 2); }
  else if (kind === 'crates') { R(X, B - 14, 18, 14); R(X + 18, B - 10, 14, 10); R(X + 4, B - 20, 12, 6); }
}
let fgTone = null, fgToneFor = null;
function sampleFloorTone() {   // the average colour of the bottom of the screen, once per stage, so the foreground is cut from the set's own palette
  if (fgToneFor === L.id) return fgTone;
  fgToneFor = L.id; fgTone = null;
  try { const d = ctx.getImageData(0, VH - 14, VW, 10).data; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 28) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } if (n) fgTone = [r / n, g / n, b / n]; } catch (e) { fgTone = null; }
  return fgTone;
}
const toneHex = (c, k) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
function drawFGLayer() {
  const th = L.theme || {};
  let kind = th.fg !== undefined ? th.fg : FG_STAGE[L.id] !== undefined ? FG_STAGE[L.id] : FG_KIND[parseInt(L.id, 10)], cw = parseInt(L.id, 10);
  if (Array.isArray(kind)) { cw = kind[1]; kind = kind[0]; }
  if (!kind || G.state === 'title') return;
  const c = G.cam, par = 1.35, sink = Math.round((LH - (c.y + VH)) * par); if (sink > 30) return;
  const B = VH + sink + 2, step = 210, p = G.pl, px = wx(cx(p)), pt = wy(p.y), fixed = th.fgCol || FG_COL[cw] || ['#0a060a', '#2a2028'];
  const mix = th.fg === undefined && FG_STAGE[L.id] === undefined && FG_MIX[cw], base = kind;
  const colFor = k => { const tone = !th.fgCol && !/^(hedge|brush|plants)$/.test(k) && sampleFloorTone(); return tone ? [toneHex(tone, 0.42), toneHex(tone, 0.62)] : fixed; };   // the set's floor, a good deal darker
  const R = (x, y, w, h) => ctx.fillRect(x, y, w, h);   // drawn at double size: nearer the camera, bigger pixels
  for (let i = Math.floor(c.x * par / step) - 1; ; i++) {
    const v = fgHash(i * 7 + 3); if (v < 0.35) continue;   // not every slot gets a piece
    kind = mix && fgHash(i * 13 + 5) < 0.34 ? mix : base; const col = colFor(kind);
    const X = Math.round(i * step - c.x * par + v * 50); if (X > VW + 10) break; if (X < -70) continue;
    // keep floors and pits readable: find the highest surface in the bottom of the screen under this piece and stay well below it
    let room = 99;
    for (let sx = X; sx < X + 128; sx += 8) {
      const tx = Math.floor((sx + c.x) / TS); let top = null;
      for (let ty = Math.floor((c.y + VH - 56) / TS); ty < L.H && ty * TS < c.y + VH; ty++) if (gkind[ty * L.W + tx] && (top === null)) top = ty * TS - c.y;
      room = Math.min(room, top === null ? -99 : VH + sink + 2 - top - 40);   // a pit under it: no piece; else its top stays below the floor's surface
    }
    let a = clamp((room + 6) / 8, 0, 1); if (a <= 0) continue;
    if (px > X - 10 && px < X + 140 && pt > B - 60) a *= 0.4;   // the Dot is behind it: see through
    ctx.save(); ctx.globalAlpha *= 0.94 * a;
    ctx.fillStyle = col[1]; ctx.save(); ctx.translate(X, B - 1); ctx.scale(2, 2); fgPiece(kind, 0, 0, v, R); ctx.restore();   // the lit top edge
    ctx.fillStyle = col[0]; ctx.translate(X, B); ctx.scale(2, 2); fgPiece(kind, 0, 0, v, R);   // (keeps the screen-shake transform)
    ctx.restore();
  }
}

const dlgUp = () => !!(G.dlg.cur || G.dlg.show > 0.05);
let hudA = 0;
function hudWanted() {   // the HUD steps aside for the title card, the level wipe, a dialogue that holds play, the blue card, the pause menu and the win
  if (DD.hideHUD || CUT || G.state !== 'play' || G.done || G.intro < INTRO_T) return false;
  if (!NOPAUSE && (G.dlg.cur || G.dlg.q.length || G.fact)) return false;
  return true;
}
const cardGo = () => G.cards.length && G.intro >= INTRO_T && !CUT && (G.cards[0].t > 0 || (!dlgUp() && !G.dlg.q.length && !G.fact));   // a NEW FAN card starts only once nobody is talking
const perkRow = () => G.shield > 0 || G.takes > 0 || G.star > 0;
function cardK() { if (!G.cards.length || !G.cards[0].t) return 0; const t = G.cards[0].t; return 1 - Math.pow(1 - Math.min(1, t / 14, (240 - t) / 14), 3); }
function leftStack() { return (perkRow() ? 13 : 0) + Math.round(32 * cardK()); }   // how far below y 24 the left column (popcorn strip, perk row, NEW FAN card) reaches
function rightStack() { return G.dsecDots && G.dsecDots.length ? 7 : 0; }   // the Dot plate grows when the stage has Dot secrets
function readout(x, y, w, h, fn, accent) {   // a stage's own readout (counters, pips): one plate style, pushed down past the HUD so nothing ever covers it
  ctx.save(); ctx.translate(0, Math.max(x < VW / 2 ? leftStack() : 0, x + w > VW / 2 ? rightStack() : 0));   // a wide one clears both
  pill(x, y, w, h, 0.72); ctx.fillStyle = accent || 'rgba(255,240,210,0.18)'; ctx.fillRect(x + 1, y, w - 2, 1);
  fn(); ctx.restore();
}
function jumpKey() { return padUsed ? 'CROSS' : window.DDTouch && window.DDTouch.on() ? 'JUMP' : 'Z'; }   // what every prompt calls the jump button: the key itself on a keyboard
function pill(x, y, w, h, a = 0.45) { ctx.fillStyle = `rgba(10,4,8,${a})`; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2); }
function secDisc(x, y, r, sx, col) {   // a pixel disc, squeezed to sx wide (a coin turning)
  ctx.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.max(0, Math.round(Math.sqrt(r * r - dy * dy + r * 0.6) * sx)); if (hw) ctx.fillRect(x - hw, y + dy, hw * 2, 1); }
}
function drawSecret(b, X, Y) {   // a Dot secret: a turning gold medallion with that Dot's face in a soft halo. Faint once it's on the save; dimmer while that Dot isn't in the cast yet
  const D = DOTS[b.dot], turn = Math.cos(G.frame / 30 + b.x * 0.01), sx = Math.max(0.15, Math.abs(turn)), x = Math.round(X + 8), y = Math.round(Y + 8 + Math.sin(G.frame / 14 + b.x) * 2);
  ctx.save(); ctx.globalAlpha = b.had ? 0.35 : G.owned.includes(b.dot) ? 1 : 0.5;
  if (!b.had) secDisc(x, y, 11, 1, 'rgba(255,236,150,' + (0.16 + 0.08 * Math.sin(G.frame / 10)).toFixed(3) + ')');
  secDisc(x, y, 8, sx, '#4a2e06'); secDisc(x, y, 7, sx, turn < 0 ? '#c8962a' : '#f0c84a'); secDisc(x, y, 5, sx, turn < 0 ? '#a87a1e' : D.col);
  if (turn > 0.55 && ready(b.dot)) { const im = IMG[b.dot], k = Math.min(10 / im.width, 10 / im.height); ctx.save(); ctx.translate(x, y + 5); ctx.scale(k * sx, k); ctx.drawImage(im, -im.width / 2, -im.height); ctx.restore(); }
  ctx.restore();
  if (!b.had && G.frame % 50 < 5) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 5, 2, 1); ctx.fillRect(x - 4, y - 6, 1, 3); }   // a glint
}
function secPip(x, y, col, on, pop) {   // the HUD's Dot-secret mark: a 5-px gold diamond (dark and hollow until found)
  const rows = [[2, 1], [1, 3], [0, 5], [1, 3], [2, 1]], s = pop > 0 ? -Math.round(Math.sin(pop / 40 * Math.PI) * 3) : 0;
  ctx.fillStyle = '#140a10'; rows.forEach(([o, w], r) => ctx.fillRect(x + o - 1, y + r + s, w + 2, 1)); ctx.fillRect(x + 1, y - 1 + s, 3, 7);
  ctx.fillStyle = on ? '#ffe680' : '#4a3640'; rows.forEach(([o, w], r) => ctx.fillRect(x + o, y + r + s, w, 1));
  if (on) { ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2 + s, 1, 1); }
}
function dotPip(x, y, col, on) {   // a tiny Dot: a 7-px disc in the Dot's colour with a dark rim (dim and hollow if it isn't in the cast yet)
  const rows = [[2, 3], [1, 5], [0, 7], [0, 7], [0, 7], [1, 5], [2, 3]];
  ctx.fillStyle = '#140a10'; rows.forEach(([o, w], r) => { ctx.fillRect(x + o, y + r, w + 2, 1); ctx.fillRect(x + o + 1, y + r - 1, w, 3); });
  ctx.fillStyle = on ? col : '#715864'; rows.forEach(([o, w], r) => ctx.fillRect(x + o + 1, y + r, w, 1));
  if (on) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 3, y + 1, 2, 1); ctx.fillRect(x + 2, y + 2, 1, 1); }
}
function drawHUDCore() {
  // the popcorn strip: kernel, count and the five tubs it's worth, at half size
  const bo = G.cntT > 0 ? Math.round(Math.sin(G.cntT / 12 * Math.PI) * 2) : 0;   // counter hop
  const gp = G.hudPopT > 0 ? 1 + Math.sin(G.hudPopT / 8 * Math.PI) * 0.45 : 1; if (G.hudPopT > 0) G.hudPopT--;
  const NB = G.pk && G.pk.six ? 6 : 5, num = String(G.got), bx = 19 + Math.max(3, num.length) * 4 + 3, end = bx + NB * 11 + (G.vhs ? 11 : 0) + 1;   // NB: SIX BAGS adds a sixth tub
  pill(3, 3, end - 3, 15, 0.72); ctx.fillStyle = 'rgba(255,240,210,0.18)'; ctx.fillRect(4, 3, end - 5, 1);   // a faint lit edge
  spr('pop', 10, 16 - bo, false, gp, gp);
  text(num, 18, 8 - bo, G.cntT > 0 ? (G.cntDir > 0 ? '#ffe680' : '#ff8080') : '#fff6d4', 1);
  const bf = bagFrac() * 5, bags = Math.floor(bf), frac = bf % 1;
  for (let i = 0; i < 5; i++) { const w = G.bagWig[i]; drawBag(bx + i * 11 - 4, -6, i < bags ? 1 : i === bags ? frac : 0, 0.75, w > 0 ? Math.sin(w * 0.9) * 0.4 * (w / 34) : 0, 0.5 * (w > 0 ? 1 + 0.2 * Math.sin(w / 34 * Math.PI) : 1), 0.62); }   // empty tubs: a ghost bright enough to count against the dark plate
  if (NB > 5) { const w = G.bagWig[5], on = bags >= 5; if (on) { ctx.fillStyle = 'rgba(232,48,42,0.55)'; ctx.fillRect(bx + 5 * 11 - 3, 4, 9, 13); } drawBag(bx + 5 * 11 - 4, -6, on ? 1 : 0, 0.75, w > 0 ? Math.sin(w * 0.9) * 0.4 * (w / 34) : 0, 0.5 * (w > 0 ? 1 + 0.2 * Math.sin(w / 34 * Math.PI) : 1), 0.62); }   // the sixth: lit red once all five are full
  if (G.vhs) spr('vhs', bx + NB * 11 + 4, 16, false, 0.5, 0.5);
  drawPerkHUD();
  // the Dots, top right: the one you are is a framed portrait, the rest are little coloured pips (click one, press 1-4, or switch)
  const P = PORTRAITS, wOf = q => G.pl.dot === q.dot ? 18 : 11, total = P.reduce((s, q) => s + wOf(q), 0) + 2 * (P.length - 1);
  let x = VW - 3 - total;
  pill(x - (!padUsed && !G.done ? 21 : 3), 2, VW - x + (!padUsed && !G.done ? 20 : 2), G.dsecDots && G.dsecDots.length ? 30 : 22, 0.62);   // taller when the stage has Dot secrets: their marks sit under the Dots   // a plate behind the Dots (and pause), so they read over any set
  if (!padUsed && !G.done) { const B = PAUSEBTN; B.x = x - 18; B.y = 3; B.w = 12; B.h = 12; pill(B.x, B.y, B.w, B.h); ctx.fillStyle = '#fff6d4'; ctx.fillRect(B.x + 4, B.y + 3, 1, 6); ctx.fillRect(B.x + 7, B.y + 3, 1, 6); }   // pause, for the mouse
  for (const q of P) {
    const on = G.pl.dot === q.dot, D = DOTS[q.dot], lk = G.lockT[q.dot] || 0, shake = on && G.denyT ? Math.round(Math.sin(G.denyT * 2) * 2) : lk ? Math.round(Math.sin(lk * 2) * 2) : 0;
    if (lk) G.lockT[q.dot]--;
    q.x = x; q.y = 3; q.w = wOf(q); q.h = on ? 20 : 11; x += q.w + 2;
    if (!on) { const own = G.owned.includes(q.dot); dotPip(q.x + 1 + shake, q.y + 2, D.col, own); if (!padUsed) text(String(ORDER.indexOf(q.dot) + 1), q.x + 6 + shake, q.y + 12, own ? '#fff6d4' : '#715864', 1, null, 'center'); continue; }   // its number key underneath
    ctx.fillStyle = D.col; ctx.fillRect(q.x + 1 + shake, q.y, q.w - 2, q.h); ctx.fillRect(q.x + shake, q.y + 1, q.w, q.h - 2);
    ctx.fillStyle = 'rgba(10,4,8,0.78)'; ctx.fillRect(q.x + 1 + shake, q.y + 1, q.w - 2, q.h - 2);
    const im = IMG[q.dot];
    if (ready(q.dot)) { const k = Math.min(1, 14 / im.width, 17 / im.height); ctx.save(); ctx.translate(q.x + q.w / 2 + shake, q.y + q.h - 2); ctx.scale(k, k); ctx.drawImage(im, -im.width / 2, -im.height); ctx.restore(); }
  }
  if (G.dsecDots && G.dsecDots.length) { if (G.dsecT > 0) G.dsecT--; for (const q of P) if (G.dsecDots.includes(q.dot)) secPip(q.x + Math.floor(q.w / 2) - 2, 25, DOTS[q.dot].col, !!G.dsec[q.dot] || G.dsecHad.includes(q.dot), G.dsecWho === q.dot ? G.dsecT : 0); }   // each Dot's secret, under that Dot
}
function drawPerkHUD() {   // under the popcorn strip: MISTRIAL hits and TAKE TWO falls left, and the GERM FREE clock
  const S = window.DDStore, items = [];
  if (G.shield > 0) items.push(['shield', 'x' + G.shield]); if (G.takes > 0) items.push(['takes', 'x' + G.takes]); if (G.star > 0) items.push(['star', null]);
  if (!items.length || !S) return;
  const w = items.reduce((s, it) => s + (it[1] ? 11 + it[1].length * 4 : 36) + 3, 3), pw = G.perkT > 0 ? Math.round(Math.sin(G.perkT / 40 * Math.PI * 4) * 2) : 0;
  if (G.perkT > 0) G.perkT--;
  pill(3, 20, w, 12, 0.6); let x = 6;
  for (const [id, n] of items) {
    S.icon(id, x, 22 + (id !== 'star' ? pw : 0), 1, G.frame);
    if (n) { text(n, x + 10, 24, '#fff6d4', 1, null); x += 11 + n.length * 4 + 3; continue; }
    const k = G.star / (G.pk.star || 1), bw = Math.ceil(24 * k), fl = G.star < 120 && Math.floor(G.star / 6) % 2;   // the clock: a rainbow bar that runs down
    ctx.fillStyle = '#000'; ctx.fillRect(x + 10, 24, 26, 5);
    for (let i = 0; i < bw; i++) { ctx.fillStyle = fl ? '#fff' : `hsl(${(G.frame * 6 + i * 15) % 360},90%,62%)`; ctx.fillRect(x + 11 + i, 25, 1, 3); }
    x += 39;
  }
}
function drawHUD() {
  const want = hudWanted();
  hudA += ((want ? 1 : 0) - hudA) * 0.2; if (!want && hudA < 0.03) hudA = 0;
  if (hudA > 0) { ctx.save(); ctx.globalAlpha = hudA; drawHUDCore(); drawBossHUD(); ctx.restore(); }
  if (G.cards.length && G.cards[0].t > 0 && !CUT) {   // NEW FAN card: slides in under the popcorn counter (and the perk row), holds, slides out; a stage readout steps down for it
    const c = G.cards[0], X = Math.round(-176 + 180 * cardK()), Y = perkRow() ? 35 : 22;   // play never stops for it
    const [name, sub] = INTRO[c.type], [l1, l2] = sub.split('. ');
    ctx.fillStyle = 'rgba(10,4,8,0.82)'; ctx.fillRect(X, Y, 172, 30);
    ctx.fillStyle = c.type === 'gh' ? '#f0c030' : '#94e0cc'; ctx.fillRect(X, Y, 172, 1); ctx.fillRect(X, Y + 29, 172, 1); ctx.fillRect(X + 171, Y, 1, 30);
    drawFoamHead(c.type, X + 15, Y + 15, 0, false);
    text('NEW FAN', X + 30, Y + 3, '#ff8080', 1, null); text(name, X + 62, Y + 3, '#ffe680', 1, '#000');
    text(l1 + '.', X + 30, Y + 12, '#fff', 1, null); if (l2) text(l2, X + 30, Y + 20, '#cfc6bc', 1, null);
  }
  if (G.banner && !dlgUp()) {   // a banner never shows through a dialogue: it waits its turn
    const b = G.banner, a = Math.min(1, b.f / 15, (b.max - b.f) / 10);
    ctx.globalAlpha = a;
    const by = G.cards.length && G.cards[0].t ? (perkRow() ? 75 : 62) : (G.boss && G.boss.engaged ? 34 : 30);   // below a NEW FAN card or the boss plate
    text(b.t, VW / 2, by, '#ffe680', 2, '#000', 'center');
    if (b.sub) text(b.sub, VW / 2, by + 14, '#fff', 1, '#000', 'center');
    ctx.globalAlpha = 1;
  }
  drawFact();
}
function drawFact() {   // the blue card slides in under the banner; a wrong one gets Gregg's red WRONG
  const f = G.fact; if (!f) return;
  const c = f.c, a = NOPAUSE ? Math.min(1, f.t / 10, (300 - f.t) / 15) : Math.min(1, f.t / 10), X = VW / 2 - 92, Y = (NOPAUSE && ((G.boss && G.boss.engaged) || L.dialogTop) ? 100 : 62) + Math.round(Math.max(0, 10 - f.t) * 2);
  if (!NOPAUSE) { ctx.fillStyle = `rgba(4,2,6,${0.55 * a})`; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalAlpha = a;
  ctx.fillStyle = '#0e2e7a'; ctx.fillRect(X - 1, Y - 1, 186, 36); ctx.fillStyle = '#1e52bc'; ctx.fillRect(X, Y, 184, 34);
  ctx.fillStyle = '#3a78e8'; for (let yy = Y + 13; yy < Y + 33; yy += 7) ctx.fillRect(X + 4, yy + 6, 176, 1);
  text("TIM'S BLUE CARD", X + 4, Y + 3, '#ffe680', 1, '#0a1a4a');
  const w = c.fact.split(' '), ls = ['']; for (const t of w) { if ((ls[ls.length - 1] + ' ' + t).trim().length > 44) ls.push(t); else ls[ls.length - 1] = (ls[ls.length - 1] + ' ' + t).trim(); }
  ls.slice(0, 3).forEach((l, i) => text(l, X + 4, Y + 13 + i * 7, '#fff', 1, '#0a1a4a'));
  // (the old blinking next-arrow is replaced by the TRUE / FALSE prompt)
  const bY = Y + 38;   // the call: TRUE on the left, FALSE on the right
  [['T', 'TRUE', X + 16], ['F', 'FALSE', X + 100]].forEach(([k, lab, bx]) => {
    const sel = f.pick === k, lit = f.ans ? (k === (c.wrong ? 'F' : 'T')) : sel;
    ctx.fillStyle = '#0a1a4a'; ctx.fillRect(bx - 1, bY - 1, 70, 14);
    ctx.fillStyle = lit ? (f.ans ? '#2a8a5a' : '#ffe680') : '#1e52bc'; ctx.fillRect(bx, bY, 68, 12);
    text(lab, bx + 34, bY + 3, lit && !f.ans ? '#0a1a4a' : '#fff', 1, null, 'center');
  });
  if (!f.ans) { if (f.t > 24) text(f.pick ? jumpKey() + ' TO LOCK IT IN' : 'LEFT: TRUE   RIGHT: FALSE', VW / 2, bY + 16, '#ffe680', 1, '#000', 'center'); }
  else { const s = f.ans === 'right' ? 'YOU CALLED IT! +25' : 'NOPE. NO POPCORN.'; text(s, X + 180 - s.length * 4, Y + 3, f.ans === 'right' ? '#94e0cc' : '#ff5a5a', 1, '#000'); }
  ctx.globalAlpha = 1;
}
// the full controls card shows on 1-1 and until a first stage is started; later stages open on just their name
const showControls = () => { if (L.id === '1-1') return true; try { return !localStorage.getItem('dd_controls_seen'); } catch (e) { return true; } };
function drawTitle() {
  ctx.fillStyle = 'rgba(8,2,6,0.85)'; ctx.fillRect(0, 0, VW, VH);
  text('DOOTLE DOTS', VW / 2, 20, '#ffe680', 3, '#7a2a10', 'center');
  text('LEVEL ' + (L.id || '').toUpperCase() + '  ' + (L.name || ''), VW / 2, 42, '#e8504a', 1, '#000', 'center');
  const rows = padUsed ? [['STICK', 'MOVE. HOLD TO BUILD SPEED'], ['CROSS', 'JUMP. HOLD FOR HIGHER'], ['R1 / L1', 'NEXT DOT / DOT BEFORE'],
    ['DOWN', 'BAXTER SLAMS IN THE AIR'], ['OPTIONS', 'PAUSE']]
    : [['ARROWS', 'MOVE. HOLD TO BUILD SPEED'], ['Z', 'JUMP. HOLD FOR HIGHER'], ['X', 'SWITCH DOT  (OR 1-4, OR CLICK)'],
    ['DOWN', 'BAXTER SLAMS IN THE AIR'], ['ENTER', 'PAUSE']];
  if (!showControls()) { text('PRESS ' + jumpKey() + ' TO START', VW / 2, 100, '#fff', 1, '#000', 'center'); ORDER.forEach((n, i) => drawDot(n, 'idle', VW / 2 - 48 + i * 32, 130)); return; }
  rows.forEach(([k, v], i) => { text(k, 50, 60 + i * 11, '#ffd27a', 1, '#000'); text(v, 92, 60 + i * 11, '#fff', 1, '#000'); });
  ORDER.forEach((n, i) => { const ph = Math.sin(G.frame / 10 + i); drawDot(n, ph < -0.4 ? 'jump' : ph > 0.85 ? 'land' : 'idle', VW / 2 - 48 + i * 32, 158 + Math.round(ph * 2)); });
  if (Math.floor(G.frame / 30) % 2) text('PRESS ' + jumpKey() + ' TO START', VW / 2, 168, '#fff', 1, '#000', 'center');
}
function cutLive() {   // a live cutscene: the stage keeps running around a Dot who stands still
  for (const k of ['l', 'r', 'd', 'j', 'jp', 'dp', 'sp']) IN[k] = false; IN.pick = null; IN.nx = 0;
  if (!G.done) updatePlayer(); updateWorld(); updateFans();
}
// the simulation runs at 60Hz, the display at whatever it runs at: the Dot and the camera are drawn between their last two steps,
// so a 120Hz or 144Hz screen (or a 60Hz one drifting against the step clock) gets smooth motion instead of doubled or dropped steps
let lerpG = null, lerpA = 1;
const LERP = [];   // [x, y] of the Dot then the camera, before the latest step
function keepPrev() {
  if (!G || !G.pl) { lerpG = null; return; }
  lerpG = G; LERP[0] = G.pl.x; LERP[1] = G.pl.y; LERP[2] = G.cam.x; LERP[3] = G.cam.y;
}
function render() {
  const p = G.pl, c = G.cam;
  if (lerpG !== G || lerpA >= 1) return renderNow();
  const real = [p.x, p.y, c.x, c.y], a = lerpA;
  const mix = (i, v) => Math.abs(v - LERP[i]) > 24 ? v : LERP[i] + (v - LERP[i]) * a;   // a big jump is a teleport (respawn, door, snap): draw it where it is
  p.x = mix(0, p.x); p.y = mix(1, p.y); c.x = mix(2, c.x); c.y = mix(3, c.y);
  try { renderNow(); } finally { p.x = real[0]; p.y = real[1]; c.x = real[2]; c.y = real[3]; }
}
function renderNow() {
  ctx.imageSmoothingEnabled = false;
  const sh = G.shake > 0.3 ? G.shake : 0, ox = (Math.random() - 0.5) * sh * 2, oy = (Math.random() - 0.5) * sh * 2;
  ctx.save(); ctx.translate(Math.round(ox), Math.round(oy));
  drawBG(); drawTiles(); drawDepth(); hook('drawMid', ctx, G); drawBloom(); drawFollowSpot(); drawBodies(); drawPops(); drawFans(); if (!(CUT && CUT.hidePlayer)) drawPlayer(); if (CUT) CUT.drawWorld(ctx); drawFGLayer(); hook('drawFG', ctx, G); drawParts(); drawGoalFlags(); drawDoorCues();
  ctx.restore();
  drawGrade(); drawHitFlash();
  if (!CUT) introIris(); drawFallIris(); drawEndIris();
  drawHUD();
  if (!CUT && G.state !== 'pause') drawDialog();   // the pause menu covers the scene, not a half-hidden dialogue box
  if (!CUT) introStrip();
  if (CUT) CUT.drawOver(ctx);   // letterbox, captions and cards
  if (G.state === 'title' && !CUT) drawTitle();
  if (G.state === 'pause') drawPause();
  drawResults();
}

// ---------------------------------------------------------------- film stock: each season's footage, very lightly. A fine grain at screen resolution
// (never game-pixel noise) everywhere but Dot City, faint scanlines on the broadcast-era sets (Decker, the Trial feed, the live finale) and a
// barely-there projector flicker on the cinema sets. It's a DOM overlay on the canvas, so it costs the canvas nothing and canvas captures don't
// carry it; menus hide it. {g grain, s scanlines, f flicker} as opacities; LEVEL.stock = {...} or false overrides; ?nostock or DD.noStock turns it off.
const STOCK = {
  2: { g: 0.075, f: 0.014 }, 3: { g: 0.08, s: 0.045 }, 4: { g: 0.065 }, 5: { g: 0.065, f: 0.012 }, 6: { g: 0.065, s: 0.035 }, 7: { g: 0.05 },
  8: { g: 0.055 }, 9: { g: 0.055 }, 10: { g: 0.075, f: 0.014 }, 11: { g: 0.06 }, 12: { g: 0.055, s: 0.03 },
};
let stockEl = null, stockOK = true;
function makeStock() {
  const n = document.createElement('canvas'); n.width = n.height = 256; const nc = n.getContext('2d'), im = nc.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.max(0, Math.min(255, Math.round(128 + (Math.random() + Math.random() + Math.random() - 1.5) * 150))); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  nc.putImageData(im, 0, 0);
  const div = css => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;inset:0;pointer-events:none;' + css; return d; };
  const root = div('position:fixed;z-index:3;overflow:hidden;display:none'), grain = div(`background-image:url(${n.toDataURL()});mix-blend-mode:overlay`), scan = div(''), flick = div('background:#000');
  root.append(grain, scan, flick); document.body.appendChild(root);
  return { root, grain, scan, flick, t: 0, on: false, cfg: null };
}
function stockTick() {
  if (!stockOK) return;
  try {
    const want = !scene && L && !DD.noStock && !Q.has('nostock') ? (L.stock !== undefined ? L.stock : STOCK[parseInt(L.id, 10)]) : null;
    if (!stockEl) { if (!want || typeof document === 'undefined' || !document.body) return; stockEl = makeStock(); }
    const st = stockEl;
    if (!want) { if (st.on) { st.root.style.display = 'none'; st.on = false; } return; }
    if (!st.on || st.cfg !== want || st.t % 30 === 0) {   // place it over the canvas (and follow window resizes)
      const r = ctx.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, per = r.height / VH;
      Object.assign(st.root.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      st.grain.style.opacity = want.g || 0; st.grain.style.backgroundSize = (256 / dpr) + 'px';
      st.scan.style.opacity = want.s || 0; st.scan.style.background = want.s && per >= 2 ? `repeating-linear-gradient(to bottom, #000 0, #000 1px, transparent 1px, transparent ${per}px)` : 'none';
      st.on = true; st.cfg = want;
    }
    if (++st.t % 2 === 0) {   // grain moves at about film rate; the flicker wanders
      st.grain.style.backgroundPosition = `${Math.floor(Math.random() * 256)}px ${Math.floor(Math.random() * 256)}px`;
      st.flick.style.opacity = want.f ? (want.f * Math.random()).toFixed(4) : 0;
    }
  } catch (e) { stockOK = false; }
}
// ---------------------------------------------------------------- main loop: fixed 60Hz simulation, render every display frame
let acc = 0, last = 0, scene = null, looping = false, hooked = false;
let frameErrs = 0;
function frame(now) {
  inkNew = 8; inkOld = 2;
  requestAnimationFrame(frame);   // ask for the next frame first: an error in one frame is logged, and the game never freezes on it
  try {
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { acc -= 1000 / 60; if (scene) { readInput(); scene.step(IN); } else { keepPrev(); step(); } }
    if (scene) { lerpG = null; scene.draw(ctx); } else { lerpA = acc / (1000 / 60); render(); }
    stockTick(); drawPadNote(now);
  } catch (e) { if (frameErrs++ < 20) console.error('[frame]', e); }
}
function drawPadNote(now) {   // over the menu and the game alike, fading out at the end
  if (!padNote) return;
  const left = padNote.until - now; if (left <= 0) { padNote = null; return; }
  ctx.globalAlpha = Math.min(1, left / 300); ctx.fillStyle = '#0a0408'; ctx.fillRect(0, VH - 13, VW, 13);
  text(padNote.s, VW / 2, VH - 10, '#9ac8a0', 1, null, 'center'); ctx.globalAlpha = 1;
}
function run() { if (!looping) { looping = true; last = performance.now(); requestAnimationFrame(frame); } }
function setScene(s) { scene = s; run(); }   // a menu scene {step(IN), draw(ctx)} replaces the game until start() is called
function leave(quit, extra) {   // level over (or quit from pause): hand the result to opts.onExit (extra: { store: true } stops at the HEI store)
  const o = DD.opts && DD.opts.onExit; if (!o || G.left) return;
  G.left = true;
  o(quit ? { id: L.id, quit: true } : Object.assign(result(), extra));
}
const result = () => ({ id: L.id, six: !!(G.pk && G.pk.six) && bagFrac() >= 1, got: G.got, total: popsTotal, bags: Math.floor(5 * bagFrac()), vhs: G.vhs, dsec: Object.keys(G.dsec), dsecAll: (G.dsecDots || []).slice(), fact: G.factGot || null, allPop: pops.length > 0 && pops.every(c => c.got), boss: !!(G.done && G.done.boss) });
function restart() {   // play it again: a won run is saved first (opts.onSave), so AGAIN on the results card never throws the win away
  if (G.done && !G.left && DD.opts && DD.opts.onSave) DD.opts.onSave(result());
  build(); G.state = 'play';
}
function start(level, opts = {}) {
  L = level; DD.opts = opts; LW = L.W * TS; LH = L.H * TS;
  window.LEVEL = level;                      // level scripts read LEVEL at runtime
  if (level.ENTS) { for (const k in ENT) delete ENT[k]; Object.assign(ENT, level.ENTS); }   // only this level's own entities: a map label in one level (a 'secret' or 'note') must never spawn another level's pickup or sign
  TILE = Object.assign({}, TILE0, L.KINDS);
  loadSprites(L.sprites || []); loadSprites(Object.values(L.portraits || {}));
  scene = null; build();
  if (!hooked) { hooked = true; testHooks(); }
  run();
}

// test hooks: ?test=physics logs jump measurements; ?sim=N runs N frames of scripted running first (for screenshots); ?warp=TILE
function testHooks() {
  // test hooks: ?test=physics logs jump measurements; ?sim=N runs N frames of scripted running first (for screenshots)
  if (Q.get('test') === 'physics') {
    const out = {};
    const measure = (dot, runup, holdFrames, dj) => {
      build(); G.state = 'play'; setDotQuiet(dot); warp(2);
      const p = G.pl; let f = 0, y0 = null, minY = 1e9, x0 = null, airborne = false, xLand = null;
      SCRIPT = fr => {
        const r = { l: false, r: runup > 0, j: false, a: false, jp: false, ap: false };
        if (f === runup) { r.jp = true; r.j = true; }
        if (f > runup && f < runup + holdFrames) r.j = true;
        if (dj && f === runup + 26) { r.jp = true; r.j = true; }
        if (dj && f > runup + 26 && f < runup + 26 + holdFrames) r.j = true;
        return r;
      };
      for (; f < runup + 200; f++) {
        step();
        if (f === runup) { y0 = bot(p); x0 = p.x; }
        if (f > runup) { minY = Math.min(minY, bot(p)); if (!p.onGround) airborne = true; else if (airborne && xLand === null) xLand = p.x; }
      }
      SCRIPT = null;
      return { up: ((y0 - minY) / TS).toFixed(2), across: xLand !== null ? ((xLand - x0) / TS).toFixed(2) : '-' };
    };
    window.setDotQuiet = d => { const D = DOTS[d], p = G.pl; p.dot = d; p.w = D.w; p.h = D.h; };
    out.standTap = measure('sam', 0, 1, false); out.standHold = measure('sam', 0, 60, false);
    out.runHold = measure('sam', 70, 60, false); out.samDouble = measure('sam', 70, 60, true);
    out.baxterRun = measure('baxter', 70, 60, false);
    console.log('PHYSICS ' + JSON.stringify(out));
    build();
  }
  if (Q.has('sim')) {
    const n = +Q.get('sim');
    let stuck = 0, lastX = 0;
    SCRIPT = fr => {   // hold right; jump when blocked; hold jump for a while
      const p = G.pl, blocked = Math.abs(p.x - lastX) < 0.2; lastX = p.x; stuck = blocked ? stuck + 1 : 0;
      const jp = stuck === 3 || (fr % 90 === 0);
      return { l: false, r: true, j: jp || (fr % 90) < 20 || stuck > 3, a: false, jp, ap: false };
    };
    for (let i = 0; i < n; i++) step();
    SCRIPT = null;
    updateCamera(true);
    if (Q.has('end')) { G.lineSeen.goal = true; endLevel(0.9, 9); for (let i = 0; i < (+Q.get('end') || 0); i++) step(); }   // ?end=N: win, then run N frames of the results card (for screenshots)
    if (Q.has('pause')) { G.state = 'pause'; G.pm.sel = 1; }   // ?pause: open the pause menu (for screenshots)
    if (Q.has('fall')) G.pl.y = LH + 60;   // ?fall: drop into a pit (for screenshots of the respawn iris)
    console.log('SIM at tile ' + (G.pl.x / TS).toFixed(1) + ' row ' + (bot(G.pl) / TS).toFixed(1) + ' got ' + G.got + ' fans ' + fans.filter(f => f.state === 'gone').length + ' gone');
  }
}
window.__G = () => G;

// ---------------------------------------------------------------- the art kit: DD.art, shared drawing helpers so every set can reach the cover screen's detail
// (3-tone shading on every surface, texture, trim, light that glows and pools, a little motion). All take screen coords.
const art = (() => {
  const hx = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (h, k) => { const c = hx(h), t = k < 0 ? 0 : 255, a = Math.abs(k); return '#' + c.map(v => Math.round(v + (t - v) * a).toString(16).padStart(2, '0')).join(''); };   // k > 0 lighter, k < 0 darker
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  return {
    mix, hash,
    box(x, y, w, h, base, o = {}) {   // a solid object: body, lit top-left edge, shaded bottom-right edge, optional dark outline
      if (o.outline !== false) R(x - 1, y - 1, w + 2, h + 2, o.outline || mix(base, -0.7));
      R(x, y, w, h, base); R(x, y, w, 1, mix(base, 0.35)); R(x, y, 1, h, mix(base, 0.18)); R(x, y + h - 1, w, 1, mix(base, -0.4)); R(x + w - 1, y, 1, h, mix(base, -0.3));
    },
    tex(x, y, w, h, base, density = 0.08, seed = 0) {   // speckle: lighter and darker flecks, fixed per position so it doesn't shimmer
      for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) { const r = hash(Math.floor((x + xx) / 2) + seed * 97, Math.floor((y + yy) / 2)); if (r < density) R(x + xx, y + yy, 1, 1, mix(base, r < density / 2 ? -0.25 : 0.2)); }
    },
    planks(x, y, w, h, base, step = 8, vertical = false) {   // boards or panels with seams and a highlight per board
      for (let k = 0; k < (vertical ? w : h); k += step) { if (vertical) { R(x + k, y, 1, h, mix(base, -0.35)); R(x + k + 1, y, 1, h, mix(base, 0.15)); } else { R(x, y + k, w, 1, mix(base, -0.35)); R(x, y + k + 1, w, 1, mix(base, 0.15)); } }
    },
    glow(x, y, r, col = '#ffe6b0', a = 0.25) {   // a soft light, added
      const g = ctx.createRadialGradient(x, y, 1, x, y, r), c = hx(col); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
    },
    cone(x, y, len, spread, col = '#fff2c0', a = 0.14) {   // a spotlight beam from (x, y) downward
      const g = ctx.createLinearGradient(0, y, 0, y + len), c = hx(col); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); ctx.lineTo(x + spread, y + len); ctx.lineTo(x - spread, y + len); ctx.fill(); ctx.restore();
    },
    bulbs(x, y, len, gap = 8, t = 0, col = '#fffbd0', dim = '#8a5a1c', vertical = false) {   // marquee bulbs that chase
      for (let i = 0, k = 0; i < len; i += gap, k++) { const on = (k + Math.floor(t / 6)) % 3 !== 0, X = vertical ? x : x + i, Y = vertical ? y + i : y; R(X - 1, Y - 1, 3, 3, mix(dim, -0.5)); R(X, Y, 2, 2, on ? col : dim); if (on) art.glow(X + 1, Y + 1, 5, col, 0.18); }
    },
    fringe(x, y, w, col = '#c98f22') {   // a gold fringe, like the valance on the title screen
      R(x, y, w, 2, mix(col, 0.25)); R(x, y + 2, w, 1, mix(col, -0.35)); for (let i = 0; i < w; i += 3) R(x + i, y + 3, 1, 3 + (i % 2), mix(col, (i % 6) ? -0.1 : 0.3));
    },
    trim(x, y, w, col = '#c98f22') { R(x, y, w, 1, mix(col, 0.4)); R(x, y + 1, w, 1, col); R(x, y + 2, w, 1, mix(col, -0.45)); },   // a gilt rail or moulding
    motes(G, col = '#fff6d4', n = 18, a = 0.5) {   // dust drifting through the light, screen space
      ctx.save(); ctx.globalAlpha = a; for (let i = 0; i < n; i++) { const x = (hash(i, 7) * VW + G.frame * (0.1 + hash(i, 3) * 0.2) - G.cam.x * 0.2) % VW, y = (hash(i, 11) * VH + Math.sin(G.frame / 60 + i) * 6) % VH; R((x + VW) % VW, y, 1, 1, col); } ctx.restore();
    },
    vignette(a = 0.35) { const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); },
    R,
  };
})();

// ---------------------------------------------------------------- doors: every walk-through door waits for Down, like a Mario pipe
// DD.door(e) is called from a door entity's update with its box (x, y, w, h, or a box given as the second argument). While the
// Dot stands in it on the ground, a bobbing arrow shows over it; it returns true on the frame Down is pressed there.
let doorCues = [];
function door(e, box) {
  const b = box || e, p = G.pl;
  if (!p || G.fall || !ov(p, b)) return false;
  if (!p.onGround) return false;
  doorCues.push({ x: b.x + b.w / 2, y: b.y, f: G.frame });
  return !!IN.dp;
}
// every stage's finish gets a Mario-style flagpole on its left (the side you run in from): a rainbow pennant runs up and down until you touch it, then drops
const RAINBOW = ['#ff4a4a', '#ff9a3a', '#ffe64a', '#5ae05a', '#4ab0ff', '#8a6aff', '#e05ae0'];
function drawGoalFlags() {
  for (const b of bodies) {
    if (b.kind !== 'goal') continue;
    const px = Math.round(wx(b.x - 6)), top = Math.round(wy(b.y)), bot = Math.round(wy(b.y + b.h));
    if (px < -20 || px > VW + 30 || bot < -10 || top > VH + 10) continue;
    ctx.fillStyle = '#000'; ctx.fillRect(px - 1, top - 1, 4, bot - top + 1);
    ctx.fillStyle = '#e8d8a0'; ctx.fillRect(px, top, 2, bot - top);
    ctx.fillStyle = '#000'; ctx.fillRect(px - 3, top - 7, 8, 8);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(px - 2, top - 6, 6, 6); ctx.fillStyle = '#fff6c0'; ctx.fillRect(px - 1, top - 5, 2, 2);
    const run = G.done ? 1 : (1 - Math.cos(G.frame / 45)) / 2, fy = Math.round(top + 4 + run * (bot - top - 20));   // up and down the pole; down and parked once the stage is cleared
    for (let r = 0; r < 12; r++) {   // a pennant, each row a band of the rainbow, the colours cycling
      const w = 14 - Math.abs(r - 5.5) * 2.2, col = RAINBOW[(r + Math.floor(G.frame / 4)) % RAINBOW.length];
      ctx.fillStyle = '#000'; ctx.fillRect(px - Math.round(w) - 1, fy + r, Math.round(w) + 1, 1);   // the pennant flies left, toward the player
      ctx.fillStyle = col; ctx.fillRect(px - Math.round(w), fy + r, Math.round(w), 1);
    }
  }
}
function drawDoorCues() {
  doorCues = doorCues.filter(c => G.frame - c.f <= 1);
  for (const c of doorCues) {
    const X = Math.round(wx(c.x)), Y = Math.round(wy(c.y) - 12 + Math.sin(G.frame / 8) * 2);
    ctx.fillStyle = '#000'; ctx.fillRect(X - 5, Y - 1, 11, 4); ctx.fillRect(X - 4, Y + 3, 9, 2); ctx.fillRect(X - 2, Y + 5, 5, 2);
    ctx.fillStyle = '#ffe680'; ctx.fillRect(X - 4, Y, 9, 2); ctx.fillRect(X - 3, Y + 2, 7, 2); ctx.fillRect(X - 1, Y + 4, 3, 2);
  }
}

// ---------------------------------------------------------------- trailer: a real stage playing itself, for the menu's rewind (DD.trailer)
// DD.trailer(level, shot) builds a level into the engine without leaving the menu: the menu's scene stays up, so music.js keeps the menu's song
// (no level track, no fade under) and voice.js stays quiet. It returns { step(), draw(), end(), ok } or null if the level won't build.
// A demo bot plays (look-ahead runs and jumps, a Dot switch now and then, dodging and stomping in a boss arena); the Dot can be knocked back
// but loses nothing, a pit just puts it back, the boss flashes but never loses a pip, and nothing is won, saved or said: no HUD, title card,
// intro iris, dialogue, banners, NEW FAN or blue cards. end() puts back the engine exactly as it was, so the stage after it starts clean.
// shot: { x: start tile column, boss: true (start inside the arena, engaged), pre: frames run unseen first (so a boss is mid-attack),
//         speed: sim steps per drawn frame (1.5 = a touch fast), dot: the first Dot, swap: frames between Dot switches,
//         pan: px per frame, a steady dolly right instead of following the Dot (it runs along under it) }
function trailer(level, shot = {}) {
  if (TR) TR.end();
  const keep = { L, LW, LH, TILE, G, grid, gkind, bodies, fans, pops, loose, parts, popsTotal, SCRIPT, doorCues, opts: DD.opts, LEVEL: window.LEVEL, ENT: Object.assign({}, ENT) };
  const me = TR = { shot, keep, f: 0, acc: 0, ok: true, bot: null, step: trStep, draw: trDraw, end: () => { if (TR === me) trEnd(); } };
  try {
    L = level; LW = L.W * TS; LH = L.H * TS; window.LEVEL = level; DD.opts = { trailer: true }; SCRIPT = null;
    if (level.ENTS) { for (const k in ENT) delete ENT[k]; Object.assign(ENT, level.ENTS); }   // only this level's own entities, as start() does
    TILE = Object.assign({}, TILE0, L.KINDS);
    loadSprites(L.sprites || []);
    TRQ = true; build();
    G.state = 'play'; G.intro = INTRO_T; G.owned = ORDER.slice(); ORDER.forEach(d => { G.seen[d] = true; }); G.met = { gh: true, th: true };   // the whole cast, no first-time banners or cards
    const p = G.pl, B = G.boss;
    if (shot.dot && shot.dot !== p.dot) { const D = DOTS[shot.dot], b0 = bot(p); Object.assign(p, { dot: shot.dot, w: D.w, h: D.h, y: b0 - D.h }); }
    const bb = shot.boss && bodies.find(o => o.def && isBossBody(o)), a0 = B && B.arena ? Math.floor(B.arena[0] / TS) + 3 : 2;
    const tx = shot.x !== undefined ? shot.x : bb ? Math.max(a0, Math.floor(cx(bb) / TS) - 9) : shot.boss ? a0 : undefined;   // a boss shot starts a few strides from the boss
    if (tx !== undefined) trWarp(tx);
    const s0 = { x: p.x, y: p.y, f: bot(p) }; G.safe = Object.assign({}, s0); G.cpSafe = Object.assign({}, s0); G.startSafe = s0;
    if (shot.boss && B && B.arena && p.x < B.arena[0] + 30) p.x = B.arena[0] + 30;   // over the threshold: the boss engages on the first step
    G.cam.y = clamp(bot(p) - VH * CAM_FEET, 0, LH - VH); updateCamera(true);
    me.pre = shot.pre || 0;   // frames to run ahead unseen, so the fight is already on when the shot cuts in (trStep spreads them over the splice)
  } catch (e) { console.warn('trailer: ' + (level && level.id) + ' would not build', e); me.ok = false; }
  TRQ = false;
  if (!me.ok) { trEnd(); return null; }
  return me;
}
function trEnd() {   // put the engine back as it was before the trailer
  const k = TR && TR.keep; if (!k) return;
  TR = null; TRQ = false;
  ({ L, LW, LH, TILE, G, grid, gkind, bodies, fans, pops, loose, parts, popsTotal, SCRIPT, doorCues } = k);
  DD.opts = k.opts; window.LEVEL = k.LEVEL;
  for (const n in ENT) delete ENT[n]; Object.assign(ENT, k.ENT);
}
function trStep() {   // one drawn frame of the trailer: shot.speed steps of the world, the player's own input left alone for the menu
  const me = TR; if (!me || !me.ok) return;
  const save = Object.assign({}, IN);
  TRQ = true;
  try {
    if (me.pre > 0) { const n = Math.min(me.pre, 45); for (let i = 0; i < n; i++) trTick(); me.pre -= n; if (!me.pre) updateCamera(true); }   // the run-ahead, a slice a frame (under the splice's snow)
    else { me.acc += me.shot.speed || 1; while (me.acc >= 1) { me.acc--; trTick(); } }
  }
  catch (e) { console.warn('trailer: ' + L.id + ' stopped', e); me.ok = false; }
  TRQ = false; Object.assign(IN, save);
}
function trTick() {
  const me = TR, p = G.pl;
  trBot(); G.frame++; me.f++;
  if (G.shake > 0) G.shake *= 0.86;
  if (G.hitstop > 0) G.hitstop--;
  else {
    updatePlayer();
    if (G.fall || p.y > LH) trBack();   // a pit: straight back on the last safe footing, no iris
    updateWorld(); updateFans(); interact(); updateParts(); updateCamera();
    if (me.shot.pan && !(G.boss && G.boss.engaged)) G.cam.x = clamp((me.panX = (me.panX ?? G.cam.x) + me.shot.pan), 0, LW - VW);
    const B = G.boss, boss = B && B.engaged && bodies.find(o => o.def && isBossBody(o));
    if (boss) {   // a boss shot frames the fight, the Dot and the boss both, wherever they are in a wide arena
      const c = G.cam, lo = B.arena ? B.arena[0] : 0, hi = B.arena ? Math.max(lo, B.arena[1] - VW) : LW - VW;
      // the arena bounds give way so a boss at the wall is never cut off
      const mid = clamp((cx(p) + cx(boss)) / 2 - VW / 2, boss.x + Math.min(boss.w, 120) + 24 - VW, boss.x - 24);   // the boss always in shot
      const tx = clamp(mid, Math.max(0, Math.min(lo - 8, boss.x - 24)), Math.min(LW - VW, Math.max(hi + 8, boss.x + Math.min(boss.w, 120) + 24 - VW))), ty = clamp(Math.max(bot(p), bot(boss)) - VH * 0.74, 0, LH - VH);   // the floor just above the menu's lower third
      c.x += (tx - c.x) * (me.pre > 0 ? 1 : 0.1); c.y += (ty - c.y) * (me.pre > 0 ? 1 : 0.1);
    }
  }
  const D = G.dlg; D.q.length = 0; D.cur = null; D.show = 0; G.banner = null; G.bq.length = 0; G.cards.length = 0; G.fact = null; G.done = null;   // nothing pops up over the footage
}
function trWarp(tx) {   // onto the highest floor the Dot can stand on at column tx, or the nearest column that has one
  const p = G.pl, D = DOTS[p.dot];
  for (let d = 0; d <= 12; d++) for (const x of d ? [tx + d, tx - d] : [tx]) {
    if (x < 1 || x >= L.W - 1) continue;
    for (let ty = 1; ty < L.H; ty++) if (T(x, ty) && !T(x, ty - 1) && standable(x * TS + 2, ty * TS, D)) { p.x = x * TS + 2; p.y = ty * TS - p.h; return true; }
  }
  return false;
}
function trBack() {
  const p = G.pl; G.fall = null;
  const s = respawnSpot(p); Object.assign(p, { x: s.x, y: s.f - p.h, vx: 0, vy: 0, slam: 0, rolling: false, inv: 0 });
  G.cam.y = clamp(bot(p) - VH * CAM_FEET, 0, LH - VH); updateCamera(true);
}
const solidT = t => t === 1 || t === 3;
function trBot() {   // the demo player: writes IN the way readInput would
  const me = TR, s = me.shot, p = G.pl, B = G.boss, f = me.f;
  const b = me.bot || (me.bot = { hold: 0, still: 0, lx: p.x, tgt: null, tgtT: 0, swapT: s.swap || 0, dir: 1 });
  let l = false, r = false, j = false, jp = false, sp = false, dp = false, pick = null;
  const row = Math.floor((bot(p) - 1) / TS), floorAt = x => { for (let k = 1; k <= 4; k++) if (T(x, row + k)) return true; return bodies.some(o => solidBody(o) && o.x <= x * TS + 8 && o.x + o.w >= x * TS + 8 && o.y > bot(p) - 4 && o.y < bot(p) + 4 * TS); };
  if (B && B.engaged && !B.dead) {   // boss arena: weave left and right, hop over whatever's coming, jump onto the boss when close
    const boss = bodies.find(o => o.def && isBossBody(o)), bx = boss ? cx(boss) : cx(p) + 60, ar = B.arena || [G.cam.x, G.cam.x + VW];
    if (--b.tgtT <= 0 || b.tgt === null || Math.abs(b.tgt - cx(p)) < 6) {
      const near = Math.abs(bx - cx(p)) < 70, lo = ar[0] + 20, hi = ar[1] - 20;
      b.tgt = near ? clamp(cx(p) + (cx(p) < bx ? -1 : 1) * (60 + hash01(f) * 50), lo, hi) : clamp(bx + (hash01(f + 3) - 0.5) * 40, lo, hi);
      b.tgtT = 50 + Math.floor(hash01(f + 7) * 40);
    }
    const d = b.tgt - cx(p); r = d > 6; l = d < -6;
    const threat = bodies.some(o => o !== boss && o.def && !o.dead && Math.abs(cx(o) - cx(p)) < 44 && o.y < bot(p) + 4 && bot(o) > p.y - 20 && o.w < 80) || fans.some(o => o.state !== 'gone' && Math.abs(cx(o) - cx(p)) < 30);
    const stomp = boss && Math.abs(bx - cx(p)) < 48 && boss.y > p.y - 40;
    if (p.onGround && (threat || stomp || f % 53 === 0)) b.hold = 22;
    if (!p.onGround && p.dot === 'sam' && !p.usedDJ && p.vy > 0.3 && threat) { jp = true; b.hold = 14; }
  } else {   // a stage: run right, jump at walls, gaps and fans with a little look-ahead, double-jump or glide on over a gap
    r = true;
    const fx = Math.floor((p.x + p.w + 4 + Math.abs(p.vx) * 5) / TS);
    const wall = [0, 1, 2].some(k => solidT(T(fx, row - k))), gap = !floorAt(fx) || !floorAt(fx + 1);
    const foe = fans.some(o => o.state !== 'gone' && !o.headless && o.x > p.x - 4 && o.x - p.x < 46 && Math.abs(bot(o) - bot(p)) < 26)
      || bodies.some(o => o.def && !o.dead && !solidBody(o) && (o.def.stomp || o.def.touch) && o.x > p.x && o.x - p.x < 40 && Math.abs(bot(o) - bot(p)) < 26);
    if (p.onGround && (wall || gap || foe || b.still > 12)) b.hold = 24;
    const below = !floorAt(Math.floor(cx(p) / TS)) && !floorAt(Math.floor(cx(p) / TS) + 1);
    if (!p.onGround && p.vy > 0.2 && p.dot === 'sam' && !p.usedDJ && (wall || below)) { jp = true; b.hold = 16; }
    if (!p.onGround && p.dot === 'cloud' && below) j = true;
    if (b.still > 90 && p.onGround) { pick = 'sam'; b.still = 30; }   // stuck: Sam's double jump gets over most things
    if (b.still > 200) { trWarp(Math.floor(p.x / TS) + 4); b.still = 0; }   // still stuck: a quiet hop forward
  }
  if (b.hold === 24 || b.hold === 22) jp = true;
  if (b.hold > 0) { j = true; b.hold--; }
  b.still = Math.abs(p.x - b.lx) < 0.3 ? b.still + 1 : 0; b.lx = p.x;
  if (s.swap && --b.swapT <= 0 && p.onGround && !pick) { b.swapT = s.swap; sp = true; }   // a different Dot now and then, for variety
  Object.assign(IN, { l, r, d: dp, j, jp, dp, sp, spPrev: false, pick, start: false, nx: 0, ny: 0, ok: false, back: false, click: null, opt: false, quit: false });
}
const hash01 = n => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function trDraw() {   // the world only: no HUD, dialogue, iris, title or results
  if (!TR || !TR.ok) return;
  try {
    ctx.imageSmoothingEnabled = false;
    const sh = G.shake > 0.3 ? G.shake : 0;
    ctx.save(); ctx.translate(Math.round((Math.random() - 0.5) * sh * 2), Math.round((Math.random() - 0.5) * sh * 2));
    drawBG(); drawTiles(); drawDepth(); hook('drawMid', ctx, G); drawBloom(); drawBodies(); drawPops(); drawFans(); drawPlayer(); drawFGLayer(); hook('drawFG', ctx, G); drawParts(); drawGoalFlags();
    ctx.restore(); drawGrade();
  } catch (e) { ctx.restore(); console.warn('trailer: ' + L.id + ' would not draw', e); TR.ok = false; }
}

// ---------------------------------------------------------------- the plugin API (see game/ENGINE.md)
Object.defineProperties(DD, Object.getOwnPropertyDescriptors({
  TS, VW, VH, P, DOTS, ORDER, SFX, IMG, IN, ctx,
  spr, drawDot, text, pix, ready, loadSprites, tone, noise, art,
  dust, stars, burst, float, banner, addGot, hurt, fling, popSound, addPop,
  drop: o => loose.push(Object.assign({ vx: 0, vy: 0, life: 240, wait: 0 }, o)),   // loose popcorn: {x, y, vx, vy, life, wait}
  part: o => parts.push(o),
  T, setTile, boxFree, moveX, moveY, ov, cx, bot, clamp, sign, wx, wy, setDot, door,
  defineEntity, collectDefs, addEntity, spawn, hitBoss, endLevel, start, setScene, leave, trailer, readout, jumpKey,
  setCut: c => { CUT = c; }, get cut() { return CUT; },   // cutscenes (game/cutscene.js)
  get trailing() { return !!TR; },   // a trailer is running (DD.trailer)
  get padUsed() { return padUsed; }, rumble,
  say: sayLine, lines: playLines,   // narrators: DD.say(who, text, opts), DD.lines(name, again)
  get dialog() { return G && G.dlg; },
  get hush() { return hush(); },
  standable,   // a line is up: NPC speech boards and fan chatter wait for it
  kindAt: (x, y) => (x < 0 || y < 0 || x >= L.W || y >= L.H) ? null : gkind[y * L.W + x],   // the tile kind at a tile position, or null
  get inMenu() { return !!scene; }, get G() { return G; }, get L() { return L; }, get bodies() { return bodies; }, get fans() { return fans; }, get pops() { return pops; }, get boss() { return G && G.boss; },
  test: {   // internals for the node harness (game/tests)
    get G() { return G; }, get L() { return L; }, step, build, warp, setDot, bodies: () => bodies, fans: () => fans, pops: () => pops, loose: () => loose, get popsTotal() { return popsTotal; }, loseBag, grid: () => grid,
    P, DOTS, TS, set SCRIPT(f) { SCRIPT = f; }, bot, cx, T, render, IMG, DD, parts: () => parts,
  },
}));
})();
