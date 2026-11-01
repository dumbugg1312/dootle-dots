// The rewind between Dot City and Season One (menu.js st 'rewind'): Dot City's ribbon is cut, the tape rewinds through every era,
// a stage gimmick and then the boss for Worlds 12 down to 3, and Season One plays. One drawing function of time:
// RewindReel.draw(ctx, seconds, RewindReel.cues, { total: RewindReel.total }). The shot list and its lengths are SCENES below
// (authored in the Rewind Cutscene preview); the sound it wants (the music loop and four voice lines) is RewindReel.AUDIO, played by menu.js.
(function () {
  const VW = 320, VH = 180, BAR = 12, GROUND = 162;
  const R = window.RewindReel = {};
  let ctx = null, IMG = (window.DD && window.DD.IMG) || {};
  const DIR = 'design/sprites/';

  // ---------------------------------------------------------------- data (game/worlds.js, menu.js)
  const W = (n, title, seasons, tag, boss, bg, band, fg, accent, dots) => ({ n, title, seasons, tag, boss, bg, band, fg, accent, dots });
  const WORLDS = [
    W(1, 'DOT CITY', 'THE CARTOON', 'FIND THE MAYOR. CUT THE RIBBON.', 'POINTY NIGHTMARES', '#3a8ed8', '#3ca752', '#ffffff', '#e52328', ['sam', 'cloud']),
    W(2, 'THE RED SEATS', 'SEASONS 1-4', 'WELCOME TO MY PROGRAM.', 'DR. SAN', '#3a0e1c', '#6a1a26', '#ffe9c0', '#e8c060', ['sam', 'mel']),
    W(3, 'DECKER', 'SEASONS 5-6 + DECKER 1-3', 'STARRING TIM HEIDECKER AS DECKER', 'ABDUL', '#5a4a40', '#8a7a6a', '#e8e8f0', '#f0c030', ['baxter', 'sam']),
    W(4, 'VFA & DEKKAR', 'SEASONS 7-8', 'LUCKY SEASON SEVEN.', 'DEKKAR TIM', '#1a0c0c', '#46211e', '#f4e0d0', '#e8302a', ['cloud', 'mel']),
    W(5, 'SIX BAGS', 'SEASON 9', "IT'S SIX BAG CINEMA TIME.", 'SIX BAGS TIM', '#0e0c0b', '#2a2420', '#f8e8c8', '#e8a040', ['mel', 'baxter']),
    W(6, 'THE TRIAL', '2017', 'MAY I APPROACH?', 'LAWYER TIM', '#6a4a2a', '#b08050', '#f4ecda', '#6a8aaa', ['sam', 'baxter']),
    W(7, 'OCX', 'SEASON 10', 'IMAGINE BEING GERM FREE.', 'OCX TIM', '#06080c', '#102030', '#ffffff', '#30d8f0', ['cloud', 'sam']),
    W(8, 'HEI NETWORK', 'SEASONS 11-12 + OSCARS 7-9', "ON CINEMA'S BACK. WE GOT THE MONEY.", 'JOKER GREGG', '#8a2a44', '#2a5ac8', '#fff2e0', '#f0c040', ['mel', 'cloud']),
    W(9, 'THE AMATO ERA', 'SEASONS 13-14 + OSCARS 10-11', 'GOOD MORNING, EVERYBODY.', 'T. AMATO', '#e8dce8', '#d8b048', '#2a2440', '#f08030', ['baxter', 'cloud']),
    W(10, 'MOVIE HOUSE', 'SEASON 15 + OSCAR 12', 'IF A HOUSE COULD BE A MOVIE.', 'THE RAT KING', '#142418', '#2e4a30', '#d8f0d0', '#7ab860', ['mel', 'sam']),
    W(11, 'ESA TO THE MANOR', 'SEASON 16', 'MY ROOM, MY RULES.', 'WARP-10 NEW', '#c8603a', '#2a8a8a', '#fff0d8', '#30c0b0', ['cloud', 'baxter']),
    W(12, 'THE LAST OSCAR SPECIAL', 'THE FINALE', 'THE LAST OSCAR SPECIAL.', 'MICHAEL GREGG', '#7ac0ee', '#f4f4fa', '#2a3a6a', '#e8602a', ['sam', 'mel', 'cloud', 'baxter']),
  ];
  const WN = n => WORLDS[n - 1];
  const DOTS = {
    sam: { name: 'SAM', col: '#f89a3a', how: ['JUMP AGAIN', 'IN THE AIR'] },
    mel: { name: 'MEL', col: '#8a54e2', how: ['TINY. RUN TO', 'ROLL INTO FANS'] },
    cloud: { name: 'CLOUD', col: '#b8c4ec', how: ['HOLD JUMP', 'TO FLOAT'] },
    baxter: { name: 'BAXTER', col: '#3078e8', how: ['PRESS DOWN IN', 'THE AIR TO SLAM'] },
  };
  const DOT_FRAMES = ['idle', 'blink', 'walk0', 'walk1', 'walk2', 'walk3', 'jump', 'apex', 'fall', 'land', 'skid', 'hurt'];
  const BOSS_ART = { 1: ['w1_scissors_idle'], 2: ['drsan'], 3: ['w3_abdul_idle'], 4: ['w4_dekkar'], 5: ['w5_timboss'], 6: ['w6_lawyer_tim', 36], 7: ['w7_timocx'],
    8: ['w8_joker'], 9: ['w9_amato_0'], 10: ['w10_ratking'], 11: ['w11_new_a'], 12: ['w12_mg_idle'] };
  const T = {   // the shelf thumbnails (42x26)
    1: [['w1_cloud_a', 12, 9, .5], ['w1_hills_far', 24, 22, .5], 'G', ['w1_tree_a', 8, 24, .5], ['w1_lamp', 34, 28, .5]],
    2: [['w2_curtain', 0, 40, .5, { tile: 1 }], ['w2_screen', 21, 25, .25], 'G', ['seat', 8, 28, .5], ['seat', 21, 30, .5], ['seat', 34, 28, .5]],
    3: [['w3_hills', 21, 21, .5], ['w3_moon', 32, 10, .5], 'G', ['w3_palm', 10, 24, .5], ['w3_crypt', 31, 24, .5]],
    4: [['w4_curtain', 0, 36, .5, { tile: 1 }], ['w4_neon', 21, 13, .45], 'G', ['w4_lucky7', 9, 21, .5], ['w4_projector', 32, 24, .5]],
    5: [['w5_screen', 21, 21, .5], 'G', ['w5_recliner_bg', 9, 25, .5], ['w5_recliner_bg', 33, 25, .5]],
    6: [['w6_wall', 0, 40, .5, { tile: 1 }], ['w6_seal', 21, 17, .5], 'G', ['w6_gavel', 21, 24, .5], ['w6_lamp', 7, 24, .5]],
    7: [['w7_oxc', 21, 24, .25], 'G', ['w7_ladder', 6, 24, .5], ['w7_hat', 35, 24, .75]],
    8: [['w8_sun', 31, 14, .5], ['w8_hills_far', 21, 22, .5], 'G', ['w8_saloon', 17, 24, .5], ['w8_lamppost', 37, 26, .5]],
    9: [['w9_mesas', 21, 22, .5], ['w9_logo', 21, 22, .5], 'G', ['w9_torch', 5, 26, .5], ['w9_torch', 37, 26, .5]],
    10: [['w10_wallpaper', 0, 40, .5, { tile: 1 }], ['w10_window', 9, 22, .5], 'G', ['w10_ratking', 28, 26, .5], ['w10_lamp', 17, 24, .5]],
    11: [['w11_curtain', 0, 30, .5, { tile: 1 }], ['w11_showtime', 21, 9, .5], 'G', ['w11_popcart', 9, 26, .5], ['w11_door', 33, 26, .5]],
    12: [['w12_sky', 21, 26, .25], ['w12_city', 21, 21, .5], ['w12_hills_near', 21, 23, .5], 'G', ['w12_tree', 8, 26, .25], ['w12_statue', 33, 26, .5]],
  };
  const B = {   // the era backdrops (menu.js B)
    1: [['w1_cloud_a', 60, 66, 1, { par: .12 }], ['w1_cloud_b', 250, 54, 1, { par: .08 }], ['w1_cloud_c', 150, 40, 1, { par: .05 }], ['w1_hills_far', 0, 150, 1, { tile: 1, par: .05 }],
      ['w1_hills_near', 0, 162, 1, { tile: 1, par: .12 }], ['w1_shop_bank', 52, 162, 1], ['w1_shop_pickles', 266, 162, 1], ['w1_tree_a', 126, 162, 1], ['w1_lamp', 196, 164, 1]],
    2: [['w2_curtain', 0, 200, 1, { tile: 1 }], ['w2_sconce', 22, 92, 1], ['w2_sconce', 298, 92, 1]],
    3: [['w3_moon', 262, 74, 1], ['w3_far', 0, 118, 1, { tile: 1, par: .05 }], ['w3_hills', 0, 152, 1, { tile: 1, par: .1 }], ['w3_palm', 34, 164, 1], ['w3_palm', 288, 164, 1], ['w3_tikibar', 250, 164, 1, { a: .9 }]],
    4: [['w4_door', 40, 162, 1], ['w4_door', 280, 162, 1], ['w4_neon', 70, 44, 1], ['w4_lucky7', 252, 62, 1], ['w4_projector', 160, 162, 1], ['w4_vfa', 262, 112, 1]],
    5: [['w5_curtain', 0, 120, 1, { tile: 1 }], ['w5_screen', 160, 76, 1], ['w5_recliner_bg', 40, 162, 1], ['w5_recliner_bg', 280, 162, 1], ['w5_menuboard', 54, 66, 1]],
    6: [['w6_wall', 0, 150, 1, { tile: 1 }], ['w6_flags', 22, 162, 1], ['w6_flags', 298, 162, 1], ['w6_seal', 160, 70, 1], ['w6_judgebench', 160, 164, 1]],
    7: [['w7_oxc', 160, 130, 1, { a: .85 }], ['w7_ladder', 24, 162, 1], ['w7_vrcam', 292, 162, 1], ['w7_fallO', 270, 60, 1, { a: .8 }]],
    8: [['w8_sun', 250, 90, 1], ['w8_hills_far', 0, 150, 1, { tile: 1, par: .05 }], ['w8_hills_near', 0, 162, 1, { tile: 1, par: .1 }], ['w8_saloon', 56, 162, 1], ['w8_column', 288, 162, 1]],
    9: [['w9_mesas', 0, 134, 1, { tile: 1, par: .05 }], ['w9_bgcol', 22, 166, 1], ['w9_bgcol', 298, 166, 1], ['w9_chandelier', 160, 66, 1, { a: .9 }], ['w9_booth', 92, 164, 1], ['w9_clock', 244, 70, 1]],
    10: [['w10_wallpaper', 0, 164, 1, { tile: 1 }], ['w10_window', 44, 110, 1], ['w10_window', 276, 110, 1], ['w10_lamp', 90, 164, 1], ['w10_ratking', 250, 164, 1], ['w10_doorway', 160, 164, 1]],
    11: [['w11_curtain', 0, 162, 1, { tile: 1 }], ['w11_showtime', 56, 54, 1], ['w11_popcart', 36, 164, 1], ['w11_door', 280, 164, 1], ['w11_bingosign', 252, 62, 1], ['w11_alf', 210, 164, 1]],
    12: [['w12_sky', 0, 180, 1, { tile: 1 }], ['w12_city', 0, 130, 1, { tile: 1, par: .04 }], ['w12_hills_far', 0, 150, 1, { tile: 1, par: .06 }], ['w12_hills_near', 0, 162, 1, { tile: 1, par: .12 }],
      ['w12_tree', 36, 164, 1], ['w12_tree', 288, 164, 1], ['w12_shop', 250, 164, 1], ['w12_statue', 60, 164, 1], ['w12_heaven', 160, 90, 1, { a: .8 }]],
  };
  // the boss shot drops the backdrop's own copy of the boss (10's rat king) and sets pieces that sit where the boss stands
  const B_SKIP = { 10: ['w10_ratking'] };

  const SPRITES = (() => {
    const o = {};
    ['sam', 'mel', 'cloud', 'baxter', 'sam_anim', 'mel_anim', 'cloud_anim', 'baxter_anim', 'seat', 'pop', 'tub', 'greggheads_a', 'menu_screen',
      'w2_curtain', 'w2_valance', 'w2_carpet', 'w2_sconce', 'w1_bunting', 'w1_mayor', 'w1_scissors_shut',
      'w1_cit_blue', 'w1_cit_pink', 'w1_cit_yellow', 'w1_cit_lime', 'w1_cit_orange',
      'w12_tvstand', 'w12_scoophop_0', 'w12_scoophop_1', 'w12_scoophop_2', 'w12_mascot_o1', 'w12_mascot_o2', 'w11_warpbottle', 'w11_pill_a', 'w11_pill_b',
      'w10_kiosk', 'w10_rat_a', 'w10_rat_b', 'w10_bag', 'w10_airmover', 'w9_jet', 'w9_grate', 'w9_gwtim_0', 'w9_gwtim_1', 'w8_mzpad', 'w8_mzsign', 'w8_larue_a', 'w8_larue_b',
      'w7_germ', 'w7_germ2', 'w7_hat', 'w6_gavel', 'w6_procserver_0', 'w6_procserver_1', 'w6_procserver_2', 'w6_procserver_3', 'w5_recliner_mot', 'w5_lenard', 'w5_lenard_throw', 'w5_food',
      'w4_roadie_0', 'w4_roadie_1', 'w4_roadie_wind', 'w4_roadie_shove', 'w4_box', 'w3_parasail'].forEach(n => o[n] = 1);
    [T, B].forEach(M => Object.keys(M).forEach(k => M[k].forEach(l => { if (l !== 'G') o[l[0]] = 1; })));
    Object.keys(BOSS_ART).forEach(k => o[BOSS_ART[k][0]] = 1);
    return Object.keys(o);
  })();
  R.SPRITES = SPRITES;
  const SCENES = [["DotCity",5],["Rewind",1.4],["G12",2.8],["B12",2.6],["G11",2.6],["B11",2.4],["G10",2.6],["B10",2.4],["G9",2.4],["B9",2.3],["G8",2.4],["B8",2.3],["G7",2.3],["B7",2.2],["G6",2.2],["B6",2.1],["G5",2.1],["B5",2],["G4",2],["B4",3],["G3",2],["B3",2.2],["Whip",1.4],["Stop",1],["SeasonOne",6.5]];   // [section, seconds]
  R.cues = {}; R.total = 0; for (const [n, d] of SCENES) { R.cues[n] = R.total; R.total = Math.round((R.total + d) * 1000) / 1000; }
  R.SECTIONS = SCENES.map(s => s[0]);
  // the sound: the Empty Bottle loop under the rewind, and four lines from the show (game/voice/<id>.mp3, lines from game/voice/clips.js)
  R.AUDIO = {
    music: { track: 'dekkar-empty-bottle', from: 'Rewind', until: 'Stop' },
    voice: [
      { id: 'DD23', at: ['DotCity', 0.4], d: 3.51, who: 'MAYOR RON', col: '#ff7a6a', line: 'TEAMWORK, HUH? IT REALLY WORKS.' },
      { id: 'D4', at: ['G10', 0.15], d: 1.74, who: 'GREGG', col: '#e8707a', line: "IT'S MOVIE HOUSE!" },
      { id: 'B69', at: ['B4', 0.35], d: 2.49, who: 'TIM', col: '#6cc8b4', line: 'TITLE TRACK IS CALLED EMPTY BOTTLE.' },
      { id: 'A7', at: ['SeasonOne', 2.6], d: 3.02, who: 'TIM', col: '#6cc8b4', line: "HAVE YOU EVER WONDERED WHAT MOVIE SHOULD I SEE THIS WEEKEND? WELL, WE'RE HERE TO HELP." },
    ],
  };
  R.load = (dir = DIR, onAll) => {
    let left = 0;
    for (const n of SPRITES) if (!IMG[n]) { left++; const i = new Image(); i.onload = i.onerror = () => { if (--left === 0 && onAll) onAll(); }; i.src = dir + n + '.png'; IMG[n] = i; }
    if (!left && onAll) onAll();
  };
  R.useImages = map => { IMG = map; };
  R.prepare = () => { if (window.DD) { IMG = window.DD.IMG; window.DD.loadSprites(SPRITES); } };   // the menu calls this as the rewind starts
  R.speaking = (T, cues = R.cues) => R.AUDIO.voice.some(v => { const t0 = cues[v.at[0]] + v.at[1]; return T >= t0 && T <= t0 + v.d + 0.3; });

  // ---------------------------------------------------------------- engine helpers (engine.js spr / text, menu.js drawLayer / logoWord / beam)
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // the three motion curves; nothing else eases
  const MOTION = {
    enter: k => 1 - Math.pow(1 - clamp(k, 0, 1), 3),                                           // things arriving
    pop: k => { k = clamp(k, 0, 1); return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); },   // slams, with overshoot
    glide: k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },  // camera and the tape motor
  };
  const ready = n => !!IMG[n] && IMG[n].complete && IMG[n].naturalWidth > 0;
  const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function spr(n, x, y, flip = false, sx = 1, sy = 1, rot = 0, alpha = 1) {
    if (!ready(n)) return;
    const i = IMG[n];
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(x), Math.round(y));
    if (rot) { ctx.translate(0, -i.height / 2); ctx.rotate(rot); ctx.translate(0, i.height / 2); }
    ctx.scale(flip ? -sx : sx, sy); ctx.drawImage(i, -Math.round(i.width / 2), -i.height); ctx.restore();
  }
  function frame(n, fi, fw, x, y, flip = false, sx = 1, sy = 1, rot = 0, alpha = 1) {   // one frame of a horizontal strip, by its bottom-centre
    if (!ready(n)) return;
    const im = IMG[n];
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(x), Math.round(y));
    if (rot) { ctx.translate(0, -im.height * sy / 2); ctx.rotate(rot); ctx.translate(0, im.height * sy / 2); }
    ctx.scale(flip ? -sx : sx, sy); ctx.drawImage(im, fi * fw, 0, fw, im.height, -Math.round(fw / 2), -im.height, fw, im.height); ctx.restore();
  }
  function dot(d, pose, x, y, flip, s = 1, sx = 1, sy = 1, rot = 0) {   // engine.js drawDot, at an integer scale s
    const n = d + '_anim'; if (!ready(n)) return spr(d, x, y, flip, s * sx, s * sy, rot);
    frame(n, Math.max(0, DOT_FRAMES.indexOf(pose)), IMG[n].width / DOT_FRAMES.length, x, y, flip, s * sx, s * sy, rot);
  }
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
    ')': '100010010010100', '+': '000010111010000', '=': '000111000111000', '_': '000000000000111', '*': '000101010101000', '#': '101111101111101', '"': '101101000000000', '<': '001010100010001', '>': '100010001010100', '[': '110100100100110', ']': '011001001001011', '&': '010101010101011', ' ': '000000000000000', '|': '010010010010010'
  };
  const tw = (s, k = 1) => s.length * 4 * k - k;
  function text(str, x, y, col = '#fff', s = 1, shadow = '#000', align = 'left') {
    str = String(str).toUpperCase();
    const w = tw(str, s);
    if (align === 'center') x -= Math.floor(w / 2); else if (align === 'right') x -= w;
    const passes = shadow ? [[shadow, s, s], [col, 0, 0]] : [[col, 0, 0]];
    for (const [c, dx, dy] of passes) {
      ctx.fillStyle = c;
      for (let i = 0; i < str.length; i++) { const g = GLYPH[str[i]] || GLYPH['?']; for (let p = 0; p < 15; p++) if (g[p] === '1') ctx.fillRect(Math.round(x) + i * 4 * s + (p % 3) * s + dx, Math.round(y) + Math.floor(p / 3) * s + dy, s, s); }
    }
  }
  const fitScale = (str, maxW, max) => Math.max(1, Math.min(max, Math.floor((maxW + 1) / (str.length * 4 - 1))));
  const lumOf = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3; };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) * k)).join(',') + ')'; };
  const onDark = c => lumOf(c) > 130 ? c : '#fffbd0';
  const clip = (x, y, w, h) => { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); };
  const GOLD = ['#fff6c0', '#ffe27a', '#f0c84a', '#d89a28', '#b06a18'];
  function logoWord(str, cx, y, s, glint) {
    const x = cx - Math.floor(tw(str, s) / 2);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) text(str, x + dx, y + dy, '#3a1408', s, null);
    text(str, x + Math.max(1, s >> 2), y + Math.max(1, s >> 1), '#8a5a1c', s, null);
    for (let r = 0; r < 5; r++) { clip(x - 4, y + r * s, tw(str, s) + 8, s); text(str, x, y, GOLD[r], s, null); ctx.restore(); }
    if (glint != null) { ctx.save(); ctx.beginPath(); const gx = glint; ctx.moveTo(gx, y - 4); ctx.lineTo(gx + 12, y - 4); ctx.lineTo(gx + 2, y + 5 * s + 4); ctx.lineTo(gx - 10, y + 5 * s + 4); ctx.closePath(); ctx.clip(); text(str, x, y, '#ffffff', s, null); ctx.restore(); }
  }
  function drawLayer(l, ox, oy, f, region, skip) {
    const nm = l[0], sc = l[3] || 1, o = l[4] || {};
    if (!ready(nm) || (skip && skip.includes(nm))) return;
    const w = IMG[nm].width * sc;
    if (o.tile) { const drift = o.par ? ((f * o.par) % w + w) % w : 0; for (let x = ox - drift - w - (((ox % w) + w) % w); x < region + w; x += w) spr(nm, x + w / 2, oy + l[2], false, sc, sc, 0, o.a === undefined ? 1 : o.a); }
    else spr(nm, ox + l[1] + (o.par ? Math.sin(f * o.par / 12) * 6 : 0), oy + l[2], !!o.flip, sc, sc, 0, o.a === undefined ? 1 : o.a);
  }
  function backdrop(w, f, pan = 0, skip) {   // the era backdrop, the near set pieces panned further than the tiled far layers
    rect(w.bg, 0, 0, VW, VH);
    for (const l of B[w.n] || []) drawLayer(l, l[4] && l[4].tile ? pan * 0.5 : pan, 0, f, VW, skip);
    rect(w.band, 0, GROUND, VW, VH - GROUND); rect(w.accent, 0, GROUND, VW, 1); rect('rgba(0,0,0,0.25)', 0, GROUND + 1, VW, 2);
  }
  function thumb(w, f, x, y, s) {   // the shelf thumbnail, blown up s times from a 42x26 buffer
    const b = buf('thumb', 42, 26), c0 = ctx; ctx = b.c; ctx.imageSmoothingEnabled = false;
    rect(w.bg, 0, 0, 42, 26); let gd = false;
    const ground = () => { gd = true; rect(w.band, 0, 21, 42, 5); rect(w.accent, 0, 21, 42, 1); };
    for (const l of T[w.n] || []) { if (l === 'G') ground(); else drawLayer(l, 0, 0, f, 42); }
    if (!gd) ground();
    ctx = c0; ctx.drawImage(b.cv, 0, 0, 42, 26, Math.round(x), Math.round(y), 42 * s, 26 * s);
  }
  const BUFS = {};
  function buf(id, w = VW, h = VH) {
    let b = BUFS[id];
    if (!b) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; b = BUFS[id] = { cv, c: cv.getContext('2d') }; }
    b.c.setTransform(1, 0, 0, 1, 0, 0); b.c.globalAlpha = 1; b.c.clearRect(0, 0, w, h); b.c.imageSmoothingEnabled = false;
    return b;
  }
  function boss(n, cx, by, maxH, f, sy = 1) {   // a boss bottom-centred at (cx, by), at the biggest whole scale under maxH
    const a = BOSS_ART[n], im = a && IMG[a[0]]; if (!im || !ready(a[0])) return;
    const fw = a[1] || im.width, k = Math.max(1, Math.floor(maxH / im.height)), fi = 0;
    frame(a[0], fi, fw, cx, by, n === 6 || n === 8 ? false : cx > VW / 2, k * (2 - sy), k * sy);
  }
  const typed = (str, u, cps) => str.slice(0, Math.max(0, Math.min(str.length, Math.floor(u * cps))));
  const moon = f => ['walk3', 'walk2', 'walk1', 'walk0'][Math.floor(f / 5) % 4];   // a walk cycle played backwards: the rewind's moonwalk
  const walk = f => ['walk0', 'walk1', 'walk2', 'walk3'][Math.floor(f / 5) % 4];

  // ---------------------------------------------------------------- 1. DOT CITY: the ribbon is cut, everyone celebrates (scene time s can run backwards)
  const CITS = [['w1_cit_blue', 22, 0], ['w1_cit_pink', 48, 7], ['w1_cit_yellow', 252, 3], ['w1_cit_lime', 276, 11], ['w1_cit_orange', 300, 5], ['w1_cit_blue', 228, 9]];
  const CONF = ['#e52328', '#ffe680', '#3a8ed8', '#ffffff', '#3ca752', '#f89a3a'];
  function dotCity(s) {
    const f = s * 60, w = WN(1), pan = -Math.round(s * 5);
    backdrop(w, f, pan);
    for (let x = -32; x < VW + 32; x += 32) spr('w1_bunting', x + 16 + (pan % 32), 34 + Math.round(Math.sin((x + f) / 30)));   // the bunting over the square
    spr('w1_scissors_shut', 160 + pan, GROUND - 1, false, 1, 1, -0.5);
    CITS.forEach(([n, x, ph], i) => { const hop = Math.abs(Math.sin((f + ph * 9) / 9)) * 7; frame(n, Math.floor((f + ph * 5) / 8) % 4, 16, x + pan, GROUND - hop, x > 160); });
    frame('w1_mayor', Math.floor(f / 12) % 2, 24, 196 + pan, GROUND - Math.abs(Math.sin(f / 11)) * 4, true);
    ['mel', 'sam', 'cloud', 'baxter'].forEach((d, i) => {
      const p = ((f + i * 13) % 40) / 40, air = p < 0.6, a = air ? Math.sin(p / 0.6 * Math.PI) : 0;
      dot(d, air ? (p < 0.3 ? 'jump' : 'fall') : 'land', 112 + i * 18 + pan, GROUND - Math.round(a * 16), i % 2 === 1, 1, air ? 1 : 1.12, air ? 1 : 0.88);
    });
    for (let i = 0; i < 60; i++) {   // confetti: falls forward in time, flies back up when s runs backwards
      const x0 = hash(i) * VW, sp = 18 + hash(i + 7) * 26, y = ((hash(i + 3) * 200 + s * sp) % 200) - 20, x = x0 + Math.sin(s * 3 + i) * 6 + pan;
      rect(CONF[i % CONF.length], ((x % VW) + VW) % VW, y, hash(i + 1) > 0.5 ? 2 : 1, 2);
    }
    const msg = 'DOT CITY IS SAVED...';
    const k = typed(msg, s - 0.5, 24);
    if (k) text(k, VW / 2 - Math.floor(tw(msg, 2) / 2), 56, '#ffe680', 2, '#7a2a10');
  }

  // ---------------------------------------------------------------- 2. an era shot: backdrop dolly, the boss slams down, its card slams in, two Dots moonwalk past
  function eraShot(n, u, dur, side) {
    const w = WN(n), f = u * 60, k = u / dur, R2 = side === 'R';
    const pan = Math.round((R2 ? -1 : 1) * (8 - u * 14));
    backdrop(w, f, pan, B_SKIP[n]);
    // the Dots, backwards across the floor
    w.dots.slice(0, 2).forEach((d, i) => dot(d, moon(f + i * 7), VW + 30 - (u * 150 + i * 30) % (VW + 80), GROUND, false));
    // the boss drops in at 0.12, lands with a squash
    const t0 = dur * 0.12, drop = MOTION.enter((u - t0) / 0.16), land = u - t0 - 0.16;
    const bx = R2 ? 232 : 88, by = GROUND - Math.round((1 - drop) * 150);
    const sq = land > 0 && land < 0.12 ? 0.85 + land / 0.12 * 0.15 : 1, bob = land > 0.12 ? Math.round(Math.sin(f / 12) * 2) : 0;
    if (u > t0) { rect('rgba(0,0,0,0.3)', bx - 22, GROUND - 1, 44, 2); boss(n, bx, by + bob, 104, f, sq); }
    // the card: a plate wipes in on the other side, the world types on, the boss name slams
    const pw = 176, px = R2 ? -pw + Math.round(MOTION.enter(u / 0.22) * pw) : VW - Math.round(MOTION.enter(u / 0.22) * pw);
    ctx.fillStyle = 'rgba(8,4,10,0.86)'; ctx.fillRect(px, BAR, pw, GROUND - BAR);
    rect(w.accent, R2 ? px + pw - 2 : px, BAR, 2, GROUND - BAR);
    const x0 = px + (R2 ? 12 : 16), fg = onDark(w.fg);
    const tab = 'WORLD ' + n; rect(w.accent, x0, 28, tw(tab) + 6, 9); text(tab, x0 + 3, 30, '#000', 1, null);
    const ts = fitScale(w.title, 150, 3), tl = typed(w.title, u - 0.1, 40);
    if (tl) text(tl, x0, 44, fg, ts, '#000');
    const ty = 44 + ts * 5 + 5; if (u > 0.2) text(w.seasons.length > 26 ? w.seasons.split(' + ')[0] : w.seasons, x0, ty, w.accent, 1, '#000');
    const b0 = Math.min(0.42, dur * 0.24), bk = (u - b0) / 0.2;
    if (bk > 0) {
      const bs = fitScale(w.boss, 150, 3), dx = Math.round((1 - MOTION.pop(bk)) * (R2 ? -60 : 60));
      rect('#e8302a', x0 + dx, 98, 22, 9); text('BOSS', x0 + 11 + dx, 100, '#fffbd0', 1, null, 'center');
      text(w.boss, x0 + dx, 112, '#ffffff', bs, '#000');
      if (u > b0 + 0.3) text('"' + w.tag + '"', x0, 112 + bs * 5 + 8, '#a8a0b8', 1, '#000');
    }
    return { flash: bk > 0 && bk < 0.12 ? 0.6 : land > 0 && land < 0.05 ? 0.35 : 0, shake: land > 0 && land < 0.2 ? Math.round((0.2 - land) * 20) : 0 };
  }

  // ---------------------------------------------------------------- 3. the stage shots: each world's signature gimmick, staged with the stage's own sprites
  const STAGES = {   // [stage id, name, sub] (game/levels/<id>.js)
    12: ['12-1', 'COUNTDOWN', 'LIVE FROM THE SPECIAL'], 11: ['11-1', 'THE ESA ROOM', 'STARRING GREGG: THE MOVIE'], 10: ['10-1', 'THE LOBBY', 'MOVIE HOUSE: COMING SOON'],
    9: ['9-1', 'THE MORNING SHOW', 'HAPPY. HEALTHY. HEI.'], 8: ['8-1', 'BREAKING NEWS', 'STARRING HEI CEO TIM'], 7: ['7-1', 'THE BLACK BOX', 'OCX'],
    6: ['6-1', 'OBJECTION!', 'THE TRIAL OF TIM HEIDECKER'], 5: ['5-1', 'THE RECLINER ROOM', 'STARRING SIX BAGS TIM'], 4: ['4-1', 'THE VFA', 'STORAGE UNIT B, ROLL-UP DOOR'],
    3: ['3-2', 'EYES IN THE SKY', 'I NEED EYES IN THE SKY'],
  };
  function stageCard(w, n, u) {   // the stage's tab, name and subtitle, sliding in along the top
    const [id, name, sub] = STAGES[n], k = MOTION.enter(u / 0.25), wd = Math.max(tw(name, 2), tw(sub)) + 42, ox = Math.round((1 - k) * -(wd + 4));
    ctx.fillStyle = 'rgba(0,0,0,0.74)'; ctx.fillRect(ox, 17, wd, 29); rect(w.accent, ox, 46, wd, 1); rect(w.accent, ox + wd - 1, 17, 1, 30);
    rect(w.accent, ox + 5, 21, tw(id) + 6, 11); text(id, ox + 8, 24, '#000', 1, null);
    text(name, ox + 9 + tw(id) + 6, 20, onDark(w.fg), 2, '#000'); text(sub, ox + 9 + tw(id) + 6, 35, '#a8a0b8', 1, '#000');
  }
  function arc(u, t0, t1, x0, y0, x1, y1, h) {   // a hop between two points: linear across, a sine high
    const k = clamp((u - t0) / (t1 - t0), 0, 1);
    return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * h, k, pose: k <= 0 ? 'idle' : k >= 1 ? 'land' : k < 0.5 ? 'jump' : 'fall' };
  }
  function burst(x, y, v, n = 7, seed = 0) {   // popcorn spraying out of a stomp
    if (v < 0 || v > 0.9) return;
    for (let i = 0; i < n; i++) { const a = Math.PI * (0.15 + 0.7 * hash(seed + i)), sp = 70 + hash(seed + i * 3) * 70;
      spr('pop', x + Math.cos(a) * sp * v * (i % 2 ? 1 : -1), y - Math.sin(a) * sp * v + 260 * v * v, false, 1, 1, v * 6 * (i % 2 ? 1 : -1), 1 - Math.pow(v / 0.9, 3)); }
  }
  function sparks(x, y, v, col = '#ffffff') {   // a ring of little crosses
    if (v < 0 || v > 0.3) return;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 4 + v * 70, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r); rect(col, px, py - 1, 1, 3); rect(col, px - 1, py, 3, 1); }
  }
  function pop(str, x, y, u, t0, col, s = 2, sh = '#000') {   // a word that slams in over the action and floats up
    const v = u - t0; if (v < 0 || v > 1.1) return;
    const k = MOTION.pop(v / 0.18), yy = y - Math.round(v * 10);
    ctx.save(); ctx.globalAlpha = clamp((1.1 - v) / 0.25, 0, 1); ctx.translate(x, yy); ctx.scale(k, k); ctx.translate(-x, -yy);
    text(str, x, yy, col, s, sh, 'center'); ctx.restore();
  }
  const squash = (v, d = 0.12) => v > 0 && v < d ? [1.25 - v / d * 0.25, 0.6 + v / d * 0.4] : [1, 1];
  const fan = (n, a, b, f) => Math.floor(f / 10) % 2 ? b : a;

  const GIM = {
    12: (u, w) => {   // ride the TV stand over the hole, hop off onto a Hav-A-Scoop server
      const f = u * 60, pan = -Math.round(u * 10);
      backdrop(w, f, pan);
      rect('#0a0c18', 112 + pan, GROUND, 104, VH - GROUND); rect(w.accent, 112 + pan, GROUND, 1, 4); rect(w.accent, 215 + pan, GROUND, 1, 4);
      frame('w12_mascot_o1', 0, 24, 40 + u * 14 + pan, GROUND, false); if (Math.floor(f / 12) % 2) frame('w12_mascot_o2', 0, 24, 40 + u * 14 + pan, GROUND, false);
      const k = MOTION.glide((u - 0.15) / 1.05), tx = 104 + k * 110 + pan;
      spr('w12_tvstand', tx, GROUND + 8);
      const hop = arc(u, 1.25, 1.6, tx, GROUND, 262 + pan, GROUND - 24, 26), hit = u - 1.6;
      const sc = hit < 0 ? (u > 0.95 ? 'w12_scoophop_1' : 'w12_scoophop_0') : 'w12_scoophop_2', [sx, sy] = squash(hit, 0.15);
      if (hit < 0.3) spr(sc, 266 + pan, GROUND, true, sx, sy);
      sparks(266 + pan, GROUND - 14, hit, '#fff6d4'); burst(266 + pan, GROUND - 12, hit, 8, 12);
      const after = arc(u, 1.6, 1.95, 262 + pan, GROUND - 24, 290 + pan, GROUND, 18);
      const d = u < 1.25 ? { x: tx, y: GROUND, pose: u > 0.15 && u < 1.2 ? 'idle' : 'idle' } : u < 1.6 ? hop : after;
      dot('sam', d.pose, d.x, d.y, false);
      return { shake: hit > 0 && hit < 0.12 ? 3 : 0 };
    },
    11: (u, w) => {   // grab the WARP 10 bottle and tear across the room, bowling pillbots over
      const f = u * 60, grab = 0.55, run = Math.max(0, u - grab), pan = -Math.round(u * 8 + run * run * 60 + run * 170);
      backdrop(w, f, pan);
      const cx = u < grab ? 40 + u / grab * 76 : 116 + Math.min(1, run / 0.4) * 34;
      if (u < grab) spr('w11_warpbottle', 124 + pan, GROUND - 4 + Math.round(Math.sin(f / 8) * 2));
      pop('WARP 10', 124, 66, u, grab, '#30c0b0', 3, '#000');
      sparks(124, GROUND - 14, u - grab, '#30c0b0');
      if (run > 0) { for (let i = 0; i < 10; i++) { const y = 60 + hash(i) * 100, x = ((hash(i + 5) * VW - run * 900 * (0.6 + hash(i + 2))) % VW + VW) % VW; rect('rgba(255,255,255,0.55)', x, y, 18 + hash(i + 9) * 20, 1); }
        for (let g = 3; g >= 1; g--) { ctx.globalAlpha = 0.18 * (4 - g); dot('cloud', walk(f + g * 2), cx - g * 9, GROUND, false); ctx.globalAlpha = 1; } }
      [[300, 0], [420, 1], [470, 0]].forEach(([wx, ph]) => {
        const sx = wx + pan - (u * 20), d = cx + 6 - sx;
        if (d < 0) spr(fan(0, 'w11_pill_a', 'w11_pill_b', f + ph * 5), sx, GROUND, true);
        else spr('w11_pill_a', cx + 10 + d * 0.5, GROUND - d * 0.9 + d * d * 0.004, false, 1, 1, d * 0.08);
      });
      dot('cloud', u < grab ? walk(f) : walk(f * 2.5), cx, GROUND, false);
      return { flash: u - grab > 0 && u - grab < 0.05 ? 0.4 : 0 };
    },
    10: (u, w) => {   // stomp the Smart Start kiosk for ITEM NOT FOUND and a spray of popcorn; the rats go for the bag
      const f = u * 60, pan = -Math.round(u * 6);
      backdrop(w, f, pan, ['w10_ratking']);
      frame('w10_airmover', 0, 40, 262 + pan, GROUND, false);
      for (let i = 0; i < 4; i++) { const x = 282 + ((f * 3 + i * 14) % 40) + pan; rect('rgba(255,255,255,0.5)', x, GROUND - 24 + i * 5, 8, 1); }
      spr('w10_bag', 54 + pan, GROUND);
      [[0.3, 0], [0.55, 1]].forEach(([t0, i]) => { const k = clamp((u - t0) / 1.2, 0, 1), x = 330 - k * 262 + i * 14 + pan; spr(fan(0, 'w10_rat_a', 'w10_rat_b', f + i * 5), x, GROUND, false); });
      const hit = u - 0.85, kx = 150 + pan;
      frame('w10_kiosk', hit > 0 ? 1 : 0, 22, kx, GROUND);
      pop('ITEM NOT FOUND', kx, 74, u, 0.85, '#ff6a5a', 2);
      burst(kx, GROUND - 34, hit, 9, 3);
      const j = u < 0.55 ? { x: 30 + u / 0.55 * 90 + pan, y: GROUND, pose: walk(f) } : u < 0.85 ? arc(u, 0.55, 0.85, 120 + pan, GROUND, kx, GROUND - 34, 30) : arc(u, 0.85, 1.25, kx, GROUND - 34, 196 + pan, GROUND, 34);
      if (j.k === 1 && u > 1.25) j.pose = u < 1.35 ? 'land' : 'idle';
      dot('mel', j.pose, j.x, j.y, false);
      return { shake: hit > 0 && hit < 0.14 ? 3 : 0 };
    },
    9: (u, w) => {   // the ranch-well geyser throws Baxter up to the stars
      const f = u * 60, pan = -Math.round(u * 8), gx = 132 + pan;
      backdrop(w, f, pan);
      spr('w9_grate', gx, GROUND + 3); spr('w9_grate', 236 + pan, GROUND + 3);
      frame(fan(0, 'w9_gwtim_0', 'w9_gwtim_1', f), 0, 24, 290 - u * 18 + pan, GROUND, true);
      const jk = u < 0.45 ? 0 : MOTION.enter((u - 0.45) / 0.35) * (u > 1.4 ? Math.max(0, 1 - (u - 1.4) / 0.4) : 1), H = Math.round(jk * 92);
      if (u > 0.3 && u < 0.45) for (let i = 0; i < 5; i++) rect('#c8a070', gx - 6 + hash(i + Math.floor(f / 3)) * 12, GROUND - 2 - hash(i * 3 + Math.floor(f / 3)) * 8, 2, 2);
      for (let y = GROUND; y > GROUND - H; y -= 28) { clip(0, GROUND - H, VW, H); frame('w9_jet', Math.floor(f / 6) % 2, 12, gx, y); ctx.restore(); }
      rect('#2a2440', 186 + pan, 72, 56, 5); rect('#f08030', 186 + pan, 72, 56, 1);
      [[132, 52], [160, 44], [190, 52], [214, 60]].forEach(([sx, sy], i) => { const got = 0.95 + i * 0.12; if (u < got) { const c = '#ffe680'; rect(c, sx + pan - 1, sy - 3, 3, 7); rect(c, sx + pan - 3, sy - 1, 7, 3); rect('#fff6d4', sx + pan, sy, 1, 1); } else sparks(sx + pan, sy, u - got, '#ffe680'); });
      const d = u < 0.45 ? { x: 70 + u / 0.45 * 62 + pan, y: GROUND, pose: walk(f) } : u < 0.95 ? { x: gx, y: GROUND - H, pose: 'jump' } : arc(u, 0.95, 1.45, gx, GROUND - 92, 214 + pan, 72, 30);
      if (u > 1.45) d.pose = u < 1.55 ? 'land' : 'idle';
      dot('baxter', d.pose, d.x, d.y, false);
      return {};
    },
    8: (u, w) => {   // the MoneyZap pad: LOAN APPROVED, and Mel goes sky high with LaRue in pursuit
      const f = u * 60, pan = -Math.round(u * 6), px = 168 + pan, land = 0.7;
      backdrop(w, f, pan);
      spr('w8_mzsign', 168 + pan, 104, false, 1, 1, 0, 0.95);
      frame('w8_mzpad', u > land && u < land + 0.5 ? 1 : 0, 32, px, GROUND);
      pop('LOAN APPROVED', px, 110, u, land, '#7cff7c', 2);
      const lx = -30 + u * 110 + pan; spr(fan(0, 'w8_larue_a', 'w8_larue_b', f), lx, GROUND, false);
      const d = u < 0.4 ? { x: 70 + u / 0.4 * 50 + pan, y: GROUND, pose: walk(f) } : u < land ? arc(u, 0.4, land, 120 + pan, GROUND, px, GROUND - 10, 26) : arc(u, land, land + 1.3, px, GROUND - 10, px + 30, GROUND - 10, 150);
      const [sx, sy] = squash(u - land, 0.1);
      dot('mel', d.pose, d.x, d.y, false, 1, sx, sy);
      return { shake: u - land > 0 && u - land < 0.1 ? 2 : 0 };
    },
    7: (u, w) => {   // Germ Shield-X fans hop; Cloud floats down onto one and picks up Gregg's caps
      const f = u * 60, pan = -Math.round(u * 8);
      backdrop(w, f, pan);
      const hit = u - 0.75;
      [[150, 0], [250, 7]].forEach(([x, ph], i) => { const h = Math.abs(Math.sin((f + ph * 6) / 16)) * 10; if (i === 0 && hit > 0.2) return; const [sx, sy] = i === 0 ? squash(hit, 0.2) : [1, 1];
        spr(fan(0, 'w7_germ', 'w7_germ2', f + ph), x + pan, GROUND - (i === 0 && hit > 0 ? 0 : h), true, sx, sy); });
      sparks(150 + pan, GROUND - 30, hit); burst(150 + pan, GROUND - 30, hit, 7, 21);
      [[196, 110], [236, 96], [276, 110]].forEach(([x, y], i) => { const got = 1.05 + i * 0.2; if (u < got) spr('w7_hat', x + pan, y + Math.round(Math.sin(f / 9 + i) * 2)); else sparks(x + pan, y - 4, u - got, '#30d8f0'); });
      const d = u < 0.75 ? { x: 60 + u / 0.75 * 90 + pan, y: 60 + MOTION.enter(u / 0.75) * (GROUND - 36 - 60), pose: 'fall' } : u < 1.05 ? arc(u, 0.75, 1.05, 150 + pan, GROUND - 36, 196 + pan, 116, 34) : u < 1.25 ? arc(u, 1.05, 1.25, 196 + pan, 116, 236 + pan, 102, 12) : arc(u, 1.25, 1.45, 236 + pan, 102, 276 + pan, 116, 12);
      if (u > 1.45) { const v = u - 1.45; d.y = Math.min(GROUND, 116 + v * v * 300); d.pose = d.y >= GROUND ? 'land' : 'fall'; }
      dot('cloud', d.pose, d.x, d.y, false);
      return { shake: hit > 0 && hit < 0.1 ? 2 : 0 };
    },
    6: (u, w) => {   // OBJECTION! The gavel comes down, the shockwave rolls, Sam clears it
      const f = u * 60, pan = -Math.round(u * 6), gx = 140 + pan, slam = 0.55;
      backdrop(w, f, pan);
      [[40, 1], [300, -1]].forEach(([x, dir], i) => frame('w6_procserver_' + (Math.floor(f / 8) % 4), 0, 24, x + dir * u * 14 + pan, GROUND, dir < 0));
      const gy = u < slam ? 30 + MOTION.enter(u / slam) * 0 + (u / slam) * (u / slam) * (GROUND - 30) : GROUND;
      spr('w6_gavel', gx, gy, false, 2, 2, u < slam ? -0.6 + u / slam * 0.6 : 0);
      const v = u - slam;
      if (v > 0) for (const dir of [-1, 1]) { const x = gx + dir * v * 200; if (x > -10 && x < VW + 10) { rect(w.band, x - 6, GROUND - 4, 12, 4); rect(w.accent, x - 6, GROUND - 4, 12, 1); rect('#fff6d4', x - 2, GROUND - 6, 4, 2); } }
      pop('OBJECTION!', 160, 60, u, slam, '#ffffff', 3, '#8a1c24');
      const d = u < 0.6 ? { x: 220 + pan, y: GROUND, pose: 'idle' } : arc(u, 0.68, 1.02, 220 + pan, GROUND, 236 + pan, GROUND, 28);
      dot('sam', d.k === 1 && u > 1.12 ? 'idle' : d.pose, d.x, d.y, true);
      return { shake: v > 0 && v < 0.2 ? 4 : 0, flash: v > 0 && v < 0.04 ? 0.35 : 0 };
    },
    5: (u, w) => {   // the motorised recliners rise and fall; Baxter rides them while Chef Lenard throws food
      const f = u * 60, pan = -Math.round(u * 8);
      backdrop(w, f, pan);
      const RX = [80, 150, 220], lift = i => Math.round(22 * (0.5 - 0.5 * Math.cos(u * 3.4 + i * 2.1)));
      RX.forEach((x, i) => spr('w5_recliner_mot', x + pan, GROUND - lift(i)));
      const seat = i => GROUND - lift(i) - 18;
      const thr = [0.25, 0.85, 1.45];
      spr(thr.some(t => u > t - 0.12 && u < t + 0.08) ? 'w5_lenard_throw' : 'w5_lenard', 292, GROUND, true);
      thr.forEach((t, i) => { const v = u - t; if (v < 0 || v > 0.9) return; const x = 282 - v * 190, y = GROUND - 34 - Math.sin(clamp(v / 0.9, 0, 1) * Math.PI) * 40 + v * 30; frame('w5_food', i % 3, 14, x, y, false, 1, 1, v * 8); });
      let d;
      if (u < 0.45) d = { x: RX[0] + pan, y: seat(0), pose: 'idle' };
      else if (u < 0.8) d = arc(u, 0.45, 0.8, RX[0] + pan, seat(0), RX[1] + pan, seat(1), 34);
      else if (u < 1.2) d = { x: RX[1] + pan, y: seat(1), pose: 'idle' };
      else if (u < 1.55) d = arc(u, 1.2, 1.55, RX[1] + pan, seat(1), RX[2] + pan, seat(2), 34);
      else d = { x: RX[2] + pan, y: seat(2), pose: u < 1.65 ? 'land' : 'idle' };
      dot('baxter', d.pose, d.x, d.y, false);
      return {};
    },
    4: (u, w) => {   // a roadie winds up and shoves; Mel goes over the top and stomps him
      const f = u * 60, pan = -Math.round(u * 8), rx = 210 - Math.min(u, 0.55) * 30 + pan;
      backdrop(w, f, pan);
      spr('w4_box', 40 + pan, GROUND); spr('w4_box', 72 + pan, GROUND); spr('w4_box', 56 + pan, GROUND - 32);
      const hit = u - 1.1, [sx, sy] = squash(hit, 0.2);
      const rs = u < 0.55 ? 'w4_roadie_' + (Math.floor(f / 10) % 2) : u < 0.8 ? 'w4_roadie_wind' : 'w4_roadie_shove';
      if (hit < 0.25) spr(rs, rx - (u > 0.8 && u < 1.1 ? (u - 0.8) * 60 : 0), GROUND, true, sx, sy);
      sparks(rx - 18, GROUND - 30, hit); burst(rx - 18, GROUND - 28, hit, 8, 31);
      const d = u < 0.7 ? { x: 100 + u / 0.7 * 40 + pan, y: GROUND, pose: walk(f) } : u < 1.1 ? arc(u, 0.7, 1.1, 140 + pan, GROUND, rx - 18, GROUND - 32, 40) : arc(u, 1.1, 1.45, rx - 18, GROUND - 32, rx + 20, GROUND, 22);
      if (u > 1.45) d.pose = u < 1.55 ? 'land' : 'idle';
      dot('mel', d.pose, d.x, d.y, false);
      return { shake: hit > 0 && hit < 0.12 ? 3 : 0 };
    },
    3: (u, w) => {   // thermal columns lift Cloud up among the parasail fans; one gets stomped out of the sky
      const f = u * 60, pan = -Math.round(u * 6), cols = [110, 220];
      backdrop(w, f, pan);
      cols.forEach(cx => { for (let y = 20; y < GROUND; y += 3) { const dx = Math.round(Math.sin(y / 9 + f / 6) * 3); rect('rgba(255,236,190,0.10)', cx - 14 + dx + pan, y, 28, 2); if ((y + Math.floor(f)) % 18 < 2) rect('rgba(255,255,255,0.35)', cx - 8 + dx + pan, y, 2, 2); } });
      const hit = u - 1.25;
      [[260, 58, 0], [330, 96, 1]].forEach(([x0, y0, i]) => { const x = x0 - u * 34 + pan, y = y0 + Math.sin(f / 20 + i) * 4;
        if (i === 0 && hit > 0) { const v = hit; spr('greggheads_a', x, y + 40 + v * v * 400, false, 1, 1, v * 6); return; }
        spr('w3_parasail', x, y); spr('greggheads_a', x, y + 36); });
      const gx = 260 - 1.25 * 34 + pan, gy = 58 + Math.sin(75 / 20) * 4;
      sparks(gx, gy - 20, hit);
      const rise = MOTION.glide(u / 0.9), d = u < 0.9 ? { x: cols[0] + pan + Math.sin(f / 10) * 3, y: GROUND - rise * 100, pose: 'jump' } : u < 1.25 ? arc(u, 0.9, 1.25, cols[0] + pan, GROUND - 100, gx, gy - 22, 30) : arc(u, 1.25, 1.75, gx, gy - 22, cols[1] + pan, GROUND - 60, 20);
      if (u > 1.75) { d.x = cols[1] + pan + Math.sin(f / 10) * 3; d.y = GROUND - 60 - (u - 1.75) * 30; d.pose = 'fall'; }
      dot('cloud', d.pose, d.x, d.y, false);
      return {};
    },
  };
  function gimmick(n, u, dur) { const w = WN(n), fx = GIM[n](u, w) || {}; stageCard(w, n, u); return { flash: fx.flash || 0, shake: fx.shake || 0 }; }

  // ---------------------------------------------------------------- 5. WHIP: the tape races the rest of the way, every era's sleeve flicking past and slowing
  function whip(u, dur) {
    const k = clamp(u / dur, 0, 1), seq = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    const i = Math.min(seq.length - 1, Math.floor(Math.pow(k, 0.55) * seq.length)), w = WN(seq[i]);   // slowing: each sleeve stays a little longer
    rect(w.bg, 0, 0, VW, VH);
    ctx.fillStyle = shade(w.bg, 0.7); for (let y = BAR; y < VH - BAR; y += 8) ctx.fillRect(0, y, VW, 4);
    rect('#000', 52, 23, 216, 136); rect(w.accent, 53, 24, 214, 134);
    thumb(w, u * 60, 55, 26, 5);
    rect('rgba(0,0,0,0.6)', 0, 140, VW, 22);
    text(w.n === 2 ? 'SEASON ONE' : 'WORLD ' + w.n + ' - ' + w.title, VW / 2, 147, '#ffffff', 1, null, 'center');
    return { flash: 0, shake: 0, roll: Math.round((1 - k) * (u * 900 % 180)) * (k < 0.85 ? 1 : 0) };
  }

  // ---------------------------------------------------------------- 6. SEASON ONE: the red seats (menu.js drawTitle's theater)
  const CURT = 174;
  function curtain(x0, w, shadeA, off) { clip(x0, 0, w, VH); for (let x = -CURT + off; x < VW + CURT; x += CURT) spr('w2_curtain', x + CURT / 2, 216); if (shadeA) rect('rgba(8,2,12,' + shadeA + ')', x0, 0, w, VH); ctx.restore(); }
  function beam(k, f) { for (let y = 12; y < 130; y++) { const q = (y - 12) / 118, hw = 4 + q * 96, a = k * (1 - q * 0.6) * (1 + 0.15 * Math.sin(f / 14)); rect('rgba(255,236,190,' + a.toFixed(3) + ')', 160 - hw, y, hw * 2, 1); } }
  const DROP = [['sam', 134, 2.1], ['mel', 164, 2.35], ['cloud', 194, 2.6], ['baxter', 224, 2.85]];
  function theater(u, open) {   // u: seconds into Season One (negative: the frozen frame under STOP)
    const f = Math.max(0, u) * 60, bulb = Math.floor(f / 5);
    rect('#0a0408', 0, 0, VW, VH);
    curtain(0, VW, 0.5, 0);
    for (const gx of [36, 284]) { const g = ctx.createRadialGradient(gx, 92, 2, gx, 92, 34); g.addColorStop(0, 'rgba(255,214,120,0.40)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 36, 56, 72, 72); spr('w2_sconce', gx, 100); }
    beam(0.1, f);
    const sx = 70, sy = 26;
    spr('menu_screen', sx + 90, sy + 104);
    for (let i = 0, x = 4; x < 180; x += 6, i++) for (const yy of [3, 99]) if ((i + bulb) % 3 === 0) { rect('#fffbd0', sx + x, sy + yy, 2, 2); rect('rgba(255,240,160,0.35)', sx + x - 1, sy + yy - 1, 4, 4); }
    for (let i = 0, y = 10; y < 104; y += 6, i++) for (const xx of [3, 171]) if ((i + bulb + 1) % 3 === 0) { rect('#fffbd0', sx + xx, sy + y, 2, 2); rect('rgba(255,240,160,0.35)', sx + xx - 1, sy + y - 1, 4, 4); }
    rect('#f4ecd8', sx + 8, sy + 8, 164, 88);   // the screen, blank, waiting for the line
    const l1 = "LET'S GO BACK TO", a = typed(l1, u - 0.9, 26);
    if (a) text(a, VW / 2 - Math.floor(tw(l1, 2) / 2), 52, '#8a1c24', 2, null);
    const sk = (u - 1.6) / 0.25;
    if (sk > 0) { const s = MOTION.pop(sk), gl = u > 2.2 && u < 2.9 ? 80 + (u - 2.2) * 260 : null; ctx.save(); ctx.translate(160, 92); ctx.scale(s, s); ctx.translate(-160, -92); logoWord('SEASON ONE', 160, 77, 4, gl); ctx.restore(); }
    if (u > 2.4) text('ON CINEMA AT THE CINEMA', VW / 2, 108, '#8a1c24', 1, null, 'center');
    beam(0.03, f);
    for (let x = 0; x < VW; x += 16) spr('w2_carpet', x + 8, 180);
    rect('rgba(8,2,12,0.35)', 0, 120, VW, 60);
    DROP.forEach(([d, x, t0], i) => {   // the Dots drop into the back row, one by one, then hop like the title screen
      const v = u - t0; if (v < 0) return;
      const fall = clamp(v / 0.28, 0, 1), y = 150 - Math.round((1 - fall * fall) * 170);
      if (fall < 1) return dot(d, 'fall', x, y, false);
      const lv = v - 0.28; if (lv < 0.12) return dot(d, 'land', x, 150, false, 1, 1.15, 0.85);
      const p = ((lv * 60 + i * 13) % 52) / 52, air = p < 0.62, k = air ? Math.sin(p / 0.62 * Math.PI) : 0;
      dot(d, air ? (p < 0.31 ? 'jump' : 'fall') : 'idle', x, 150 - Math.round(k * 14), false, 1, air ? 1 - k * 0.06 : 1.12, air ? 1 + k * 0.08 : 0.88);
    });
    for (let i = 0; i < 12; i++) spr('seat', 14 + i * 30, 172);
    for (let i = 0; i < 11; i++) spr('seat', 29 + i * 30, 196);
    rect('rgba(6,2,10,0.45)', 0, 158, VW, 22);
    for (let x = 0; x < VW; x += 40) spr('w2_valance', x + 20, 26);
    rect('rgba(0,0,0,0.25)', 0, 26, VW, 2);
    if (open < 1) { const half = VW / 2, travel = (half - 30) * open; curtain(0, half - travel, 0, -travel); curtain(half + travel, half - travel, 0, travel); for (let x = 0; x < VW; x += 40) spr('w2_valance', x + 20, 26); }
    for (let i = 0; i < 8; i++) { rect('rgba(0,0,0,' + (0.07 * (8 - i) / 8).toFixed(3) + ')', i * 3, 28, 3, VH - 28); rect('rgba(0,0,0,' + (0.07 * (8 - i) / 8).toFixed(3) + ')', VW - i * 3 - 3, 28, 3, VH - 28); }
  }

  // ---------------------------------------------------------------- the VHS layer
  function snow(seed, n) { for (let i = 0; i < n; i++) rect(hash(seed + i * 1.7) < 0.5 ? '#fff' : '#777', (hash(seed * 3 + i) * VW) | 0, (hash(seed * 7 + i * 3.1) * VH) | 0, 2, 1); }
  function tracking(F, k) {
    for (let i = 0; i < 2; i++) { const y = (VH - ((F * 3 + i * 97) % (VH + 20))) | 0; rect('rgba(255,255,255,' + (0.14 * k).toFixed(2) + ')', 0, y, VW, 1); rect('rgba(0,0,0,' + (0.22 * k).toFixed(2) + ')', 0, y + 1, VW, 3); }
    for (let y = 1; y < VH; y += 3) rect('rgba(0,0,0,0.07)', 0, y, VW, 1);
  }
  function blit(src, F, skew, roll, sh) {   // the picture onto the screen in rows: a rewinding tape drags the rows sideways, and the head-switch band tears the bottom
    const ox = sh ? Math.round((hash(F) - 0.5) * sh * 2) : 0, oy = sh ? Math.round((hash(F + 9) - 0.5) * sh * 2) : 0;
    if (!skew && !roll) { ctx.drawImage(src, ox, oy); return; }
    for (let y = 0; y < VH; y += 2) {
      const sy = ((y + roll) % VH + VH) % VH, band = Math.abs(y - (153 + Math.sin(F / 13) * 3)) < 4 ? 1 : 0;
      const wob = skew > 0.9 ? (hash(Math.floor(F / 2) + y) - 0.5) * (skew - 0.9) * 3 : 0;   // only the fastest scan breaks the rows up
      const dx = Math.round(skew * (Math.sin(y / 23 + F / 5) * 0.8 + (y < 22 ? (22 - y) / 5 : 0)) + band * skew * (hash(F + y) * 12 - 4) + wob);
      ctx.drawImage(src, 0, sy, VW, 2, dx + ox, y + oy, VW, 2);
    }
  }

  // ---------------------------------------------------------------- the reel
  function at(cues, T) { let best = null; for (const n of R.SECTIONS) { const c = cues[n]; if (c != null && !isNaN(c) && T >= c) best = n; } return best || R.SECTIONS[0]; }
  function len(cues, n, total) { const i = R.SECTIONS.indexOf(n), nx = R.SECTIONS[i + 1]; return (nx ? cues[nx] : total) - cues[n]; }
  function counter(T, cues, total) {   // the tape counter: forward through Dot City, racing back to 0:00:00, forward again from Season One
    const s0 = cues.Rewind, s1 = cues.Stop, s2 = cues.SeasonOne, START = 7 * 3600 + 51 * 60 + 12;
    let sec;
    if (T < s0) sec = START + T * 1.0;
    else if (T < s1) { const k = (T - s0) / (s1 - s0); sec = (START + s0) * (1 - MOTION.glide(k)); }
    else if (T < s2) sec = 0; else sec = T - s2;
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 3600) + ':' + String(Math.floor(sec / 60) % 60).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }
  const osd = (s, x, y, col, align) => { text(s, x + 1, y + 1, '#000', 1, null, align); text(s, x, y, col, 1, null, align); };

  R.draw = function (out, T, cues, opts = {}) {
    const total = opts.total || 40, vhs = opts.vhs !== false;
    const name = at(cues, T), u = T - cues[name], dur = len(cues, name, total), F = Math.floor(T * 60);
    const b = buf('scene'); ctx = b.c;
    let fx = { flash: 0, shake: 0 }, skew = 0, roll = 0, mode = 'PLAY >', modeCol = '#7cff7c', cut = -1, big = null;
    if (name === 'DotCity') {
      const freeze = dur - 0.55, s = Math.min(u, freeze);
      dotCity(s);
      if (u > freeze) { mode = '|| PAUSE'; skew = 0.25; fx.flash = u - freeze < 0.05 ? 0.25 : 0; }
    } else if (name === 'Rewind') {   // the same square, running backwards, faster and faster
      const freeze = len(cues, 'DotCity', total) - 0.55, s = freeze - (u * 1.2 + u * u * 4.5);
      dotCity(s); mode = '<< REWIND'; skew = 0.6 + u / dur * 1.4;
      const bk = MOTION.pop(u / 0.22);
      big = { s: '<< REWIND', k: bk };
      fx.flash = u < 0.06 ? 0.4 : 0; fx.shake = u < 0.15 ? 2 : 0;
    } else if (/^B\d+$/.test(name)) {
      const n = +name.slice(1);
      fx = eraShot(n, u, dur, n % 2 ? 'L' : 'R'); mode = '<< REWIND'; skew = 0.4; cut = u;
    } else if (/^G\d+$/.test(name)) { fx = gimmick(+name.slice(1), u, dur); mode = '<< REWIND'; skew = 0.35; cut = u; }
    else if (name === 'Whip') { fx = whip(u, dur); mode = '<<<< REWIND'; skew = 1.1; roll = fx.roll || 0; cut = u; }
    else if (name === 'Stop') {
      theater(-1, 0); mode = 'STOP'; modeCol = '#ffffff';
      const k = clamp(u / (dur * 0.7), 0, 1); roll = Math.round((1 - MOTION.enter(k)) * 70); skew = (1 - k) * 2;
      fx.shake = u < 0.12 ? 3 : 0;
    } else {   // SeasonOne
      const open = MOTION.glide((u - 0.15) / 1.4);
      theater(u, open);
      if (u > dur - 0.6) { ctx.fillStyle = 'rgba(0,0,0,' + clamp((u - (dur - 0.6)) / 0.5, 0, 1).toFixed(2) + ')'; ctx.fillRect(0, 0, VW, VH); }
    }
    // onto the screen
    ctx = out; ctx.imageSmoothingEnabled = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    rect('#000', 0, 0, VW, VH);
    blit(b.cv, F, vhs ? skew : 0, vhs ? roll : 0, fx.shake);
    if (vhs) {
      const rew = name !== 'DotCity' && name !== 'SeasonOne';
      tracking(F, rew ? 1 : 0.35);
      if (cut >= 0 && cut < 0.15) { snow(F, Math.round(260 * (1 - cut / 0.15))); rect('rgba(255,255,255,' + (cut < 0.03 ? 0.75 : (0.15 - cut) * 2).toFixed(2) + ')', 0, 0, VW, VH); }
      if (name === 'Whip') snow(F, 70);
      if (name === 'Stop' && u > len(cues, 'Stop', total) - 0.18) { snow(F, 300); rect('rgba(255,255,255,0.5)', 0, 0, VW, VH); }
    }
    if (fx.flash) rect('rgba(255,255,255,' + fx.flash.toFixed(2) + ')', 0, 0, VW, VH);
    if (big) { const s = 3, y = 74, x = VW / 2 - Math.round(big.k * 0) ; ctx.save(); ctx.translate(VW / 2, y + 7); ctx.scale(big.k, big.k); ctx.translate(-VW / 2, -(y + 7)); if (Math.floor(F / 8) % 2 === 0 || u < 0.4) { text(big.s, x + 2, y + 2, '#000', s, null, 'center'); text(big.s, x, y, '#7cff7c', s, null, 'center'); } ctx.restore(); }
    // letterbox, the deck's display
    rect('#000', 0, 0, VW, BAR); rect('#000', 0, VH - BAR, VW, BAR);
    if (name === 'SeasonOne') { if (u < 1.6) osd(mode, 8, 4, modeCol); }
    else if (Math.floor(F / 20) % 2 === 0 || !mode.includes('PAUSE')) osd(mode, 8, 4, modeCol);
    if (name !== 'SeasonOne' || u < 1.6) osd(counter(T, cues, total), VW - 8, 4, modeCol, 'right');
    if (name !== 'SeasonOne' && name !== 'DotCity' && name !== 'Stop') {   // the tape position: a sliver racing left along the top bar
      const k = clamp((T - cues.Rewind) / (cues.Stop - cues.Rewind), 0, 1); rect('#1a2a1a', 110, 6, 100, 1); rect('#7cff7c', 110 + Math.round((1 - MOTION.glide(k)) * 96), 5, 4, 3);
    }
    if (opts.subs !== false) for (const v of R.AUDIO.voice) {   // the line being said, captioned over the bottom bar
      const t0 = cues[v.at[0]] + v.at[1]; if (T < t0 || T > t0 + v.d + 0.3) continue;
      const words = (v.who + ': ' + v.line).split(' '), lines = []; let cur = '';
      for (const wd of words) { if (cur && (cur + ' ' + wd).length > 72) { lines.push(cur); cur = wd; } else cur = cur ? cur + ' ' + wd : wd; }
      lines.push(cur);
      const h = lines.length * 8 + 3, y0 = VH - h;
      rect('#000', 0, y0, VW, h);
      lines.forEach((ln, i) => { const x = VW / 2 - Math.floor(tw(ln) / 2); if (i === 0) { text(v.who + ':', x, y0 + 2, v.col, 1, null); text(ln.slice(v.who.length + 1), x + tw(v.who + ':') + 1, y0 + 2, '#ffffff', 1, null); } else text(ln, x, y0 + 2 + i * 8, '#ffffff', 1, null); });
    }
  };
})();
