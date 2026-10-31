// The re-shot cutscenes. Each entry takes the scene's own beat list from game/cuts/wN.js and adds the new camera and frame beats from
// game/cutfx.js at the moments the pitch called for, matched by the clip, actor or lower third they belong to, so every line, clip, fact,
// skip and fin() in the original scenes stays exactly as it was. Load after cuts/w12.js. A scene whose anchor isn't found plays as before.
(function () {
  const C = window.DDCut; if (!C) return;
  const W = (key, fn) => { const d = C.LIB[key]; if (!d || d.polished) return; d.polished = true; const orig = d.beats; d.beats = (S, G) => { const L = (orig(S, G) || []).filter(Boolean); try { return fn(L, S, G) || L; } catch (e) { console.warn('polish ' + key, e); return L; } }; };
  const at = (L, m, from = 0) => { for (let i = from; i < L.length; i++) if (m(L[i])) return i; return -1; };
  const before = (L, m, add) => { const i = at(L, m); if (i >= 0) L.splice(i, 0, ...add); return i; };
  const after = (L, m, add, skip = 0) => { const i = at(L, m); if (i >= 0) L.splice(i + 1 + skip, 0, ...add); return i; };
  const drop = (L, m) => { const i = at(L, m); if (i >= 0) L.splice(i, 1); };
  const clip = id => b => b.clip === id, sayer = w => b => b.say === w, third = s => b => typeof b.third === 'string' && b.third.indexOf(s) === 0;
  const mv = id => b => b.move === id, set = (id, k, v) => b => b.set === id && (k == null || (k in b && (v === undefined || b[k] === v)));
  const fnHas = s => b => !!b.fn && String(b.fn).indexOf(s) >= 0, card = k => b => b.card === k, isFade = v => b => b.fade === v;
  const fx = o => ({ fx: o }), pop = { flash: '#ffffff', t: 4 };

  // ---- World 1
  W('1-1:open', (L, S, G) => {
    const RUN = 'd_' + G.pl.dot;
    const i = at(L, isFade(0)); if (i >= 0) L.splice(i, 1, { iris: 0, on: [2690, 336] }, { fade: 0, t: 1 }, { iris: 1, t: 70, and: true }, { stamp: 'DOOTLE DOTS', sub: 'EPISODE ONE', col: '#ffe680', t: 150 });
    before(L, mv('d_sam'), [{ zoom: 2.6, on: 'd_sam' }, pop]);
    before(L, b => b.sfx === 'blip', [{ zoom: 2.6, on: 'd_mel' }, pop]);
    before(L, set('d_baxter', 'flip'), [{ zoom: 2.6, on: 'd_baxter' }, pop]);
    before(L, sayer('crowd'), [{ zoom: 1 }, pop]);
    before(L, b => !!b.run && b.and, [fx({ streak: 1 })]);
    after(L, b => b.move === RUN && b.ease === 'linear', [fx({ streak: 0 })]);
    L.splice(L.length - 1, 0, { iris: 0, on: RUN, t: 30 });
  });
  W('1-1:goal', L => {
    after(L, b => b.actor === 'cloud', [{ zoom: 1.4, on: 'cloud', t: 140, and: true }]);
    drop(L, third('CLOUD'));
    after(L, set('cloud', 'pose', 'land'), [{ pause: 'cloud', title: 'CLOUD', sub: 'Sleeps through the speech. Asks what a fishmonger is.', col: '#b8c4ec', label: 'DOOTLE DOTS  EP. 1' }]);
  });
  W('1-2:goal', L => {
    drop(L, third('MEL'));
    before(L, mv('mel'), [{ zoom: 2, on: 'mel', dy: -12 }, fx({ streak: 1 })]);
    after(L, set('mel', 'pose', 'skid'), [fx({ streak: 0 })]);
    before(L, set('mel', 'pose', 'blink'), [{ pause: 'mel', title: 'MEL', sub: 'Only snickers in Episode One', col: '#8a54e2', label: 'DOOTLE DOTS  EP. 1' }]);
  });
  W('1-3:goal', L => {
    const ORD = ['sam', 'mel', 'cloud', 'baxter'], DOTS = window.DD.DOTS;
    after(L, third('INTRODUCING'), [fx({ dark: 0.85, spots: ORD.map(d => ({ on: 'd_' + d })) })]);
    before(L, clip('DD16'), [fx({ panels: { layout: 'grid4', list: ORD.map(d => ({ on: 'd_' + d, z: 1.7, dy: -14, label: DOTS[d].name, col: DOTS[d].col, drop: d === 'baxter' })) } }), { panel: 0 }]);
    before(L, clip('DD17'), [{ panel: 1 }]);
    before(L, clip('DD18'), [{ panel: 2 }]);
    after(L, clip('DD19'), [{ panel: 3 }]);
    before(L, clip('DD25'), [fx({ panels: null }), pop, { tween: 'dark', to: 0.1, t: 20, and: true }, { stamp: 'THE DOOTLE DOTS', sub: 'INTRODUCING', col: '#ffe680', t: 150 }]);
  });
  W('1-boss:boss_in', L => {
    before(L, third('MAYOR RON'), [{ zoom: 3, on: 'mayor', dy: -16 }]);
    before(L, set('pn', 'spr', 'w1_scissors_idle'), [{ zoom: 1 }, pop, fx({ dark: 0.92, spots: [{ on: 'pn', r: 48, cone: false }], sil: [{ on: 'pn', glow: '#e52328' }] }), { wait: 40 }, fx({ dark: 0, sil: null })]);
    after(L, set('pn', 'spr', 'w1_scissors_attack'), [fx({ lines: 'pn' })]);
    after(L, sayer('mayor'), [fx({ lines: null })]);
  });
  W('1-boss:boss_out', L => {
    L.unshift(fx({ desat: 0.9 }), { tween: 'desat', to: 0, t: 60, and: true });
    before(L, card('title'), [{ iris: 0, on: 'mayor', t: 40 }, { wait: 12 }]);   // 40 + 12 keeps the scene inside its 1000-frame budget (tests/cuts.js)
  });

  // ---- World 2
  W('2-1:open', L => {
    before(L, isFade(0), [fx({ tape: 'NOV 2012' })]);
    after(L, b => b.shake === 4, [fx({ tape: null }), { zoom: 2, on: 'dot' }, { zoom: 1.3, t: 60, and: true }]);
  });
  W('2-boss:boss_in', L => {
    L.unshift(fx({ spots: [{ on: 'boss', r: 46 }], sil: [{ on: 'boss', glow: '#e8c060', in: 12 }] }), { tween: 'dark', to: 0.9, t: 12, and: true });   // the lights go down over the bars' slide-in, not on the first frame
    before(L, fnHas('windup'), [fx({ sil: null }), { flash: '#fff6c8', t: 6 }]);
    before(L, sayer('san'), [{ zoom: 3, on: 'boss', dy: -30 }]);
    before(L, clip('A146'), [{ zoom: 1 }, pop, { tween: 'dark', to: 0, t: 20, and: true }]);
  });
  W('2-boss:boss_out', L => {
    L.unshift(fx({ desat: 0.8 }), { tween: 'desat', to: 0, t: 50, and: true });
    before(L, clip('A147'), [fx({ grade: ['#9aff8a', 0.3] })]);
    after(L, clip('A147'), [fx({ grade: null })]);
  });

  // ---- World 3
  W('3-1:open', (L, S, G) => {
    const road = [G.pl.x + G.pl.w / 2 + 120, G.pl.y + G.pl.h];
    before(L, set('phone', 'alpha', 1), [fx({ panels: { layout: 'row3', list: [{ on: 'decker', z: 1.8, dy: -22 }, { on: road, z: 1.2, dy: -40 }, { on: 'dot', z: 2, dy: -12 }], stagger: 14 } }), { wait: 40 }, { stamp: 'DECKER: CLASSIFIED', col: '#f0c030', t: 110, wait: true }, fx({ panels: null }), pop]);
    before(L, clip('B8'), [fx({ split: ['phone', 'decker'] })]);
    after(L, clip('B8'), [fx({ split: null })]);
  });
  W('3-boss:boss_in', L => {
    before(L, b => b.flash === '#ffffff', [fx({ glitch: 1, sil: [{ on: 'boss', col: '#0a2a0e', glow: '#6eff50', a: 0.8 }] }), { wait: 30 }, fx({ glitch: 0, sil: null })]);
    before(L, clip('E37'), [{ zoom: 2, on: 'boss', dy: -26 }, fx({ lines: 'boss', linesCol: '#f0c030' })]);
    after(L, clip('E37'), [{ zoom: 1 }, fx({ lines: null })]);
  });
  W('3-boss:boss_out', L => {
    after(L, b => b.actor === 'tbc', [fx({ sepia: true, desat: 1 })]);
    before(L, clip('E31'), [fx({ sepia: false, desat: 0, tape: 'THE LOST WORKS', counter: { label: 'KICKSTARTER', to: 248000000, prefix: '$', dur: 150, t0: null } })]);
    after(L, clip('E31'), [fx({ tape: null, counter: null })]);
  });

  // ---- World 4
  W('4-1:open', L => {
    after(L, b => b.actor === 'door', [fx({ dark: 0.95, spots: [{ on: [80, 336], r: 30, cone: false }] })]);
    before(L, b => !!b.run, [{ tween: 'dark', to: 0.2, t: 50, and: true }, fx({ sil: [{ on: 'gregg', glow: '#fff0c0' }, { on: 'dot', glow: '#fff0c0' }] })]);
    before(L, third('THE VICTORVILLE'), [fx({ sil: null })]);
  });
  W('4-boss:boss_in', L => {
    let n = 0; for (let i = 0; i < L.length; i++) if (L[i].sfx === 'tick') { L.splice(i + 1, 0, { stamp: String(++n), col: '#e8302a', t: 20 }); i++; }
    after(L, b => b.shake === 9, [fx({ lines: 'boss' })]);
    before(L, clip('B69'), [fx({ lines: null })]);
  });
  W('4-boss:boss_out', L => { after(L, b => b.actor === 'tape', [{ zoom: 2.5, on: 'tape', dy: -12, t: 220, and: true }]); });

  // ---- World 5
  W('5-1:open', L => {
    before(L, clip('C79'), [{ zoom: 2.4, on: [74, 336], dy: -26 }]);
    after(L, clip('C79'), [{ zoom: 1 }]);
    const i = before(L, set('mug', 'alpha'), [{ zoom: 3, on: [108, 336], dy: -18 }]);
    if (i >= 0) L.splice(i + 4, 0, { zoom: 1, t: 20, and: true });
    before(L, clip('C18'), [{ zoom: 2.2, on: [132, 336], dy: -26, t: 30, and: true }]);
  });
  W('5-boss:boss_in', L => {
    before(L, mv('tim'), [fx({ sil: [{ on: 'tim', col: '#050404', glow: '#f8e8c8', a: 0.9 }] })]);
    after(L, b => b.sfx === 'thud', [fx({ sil: null })]);
    before(L, clip('C4'), [{ zoom: 2, on: 'tim', dy: -30, t: 30, and: true }]);
    before(L, card('boss'), [{ zoom: 1 }]);
  });
  W('5-boss:boss_out', L => {
    before(L, clip('C25'), [{ zoom: 1.6, on: 'gregg', dy: -24, t: 60, and: true }]);
    before(L, third('NOVEMBER 2017'), [{ zoom: 1 }]);
  });

  // ---- World 6
  W('6-1:open', L => {
    L.unshift(fx({ sketch: true }));
    before(L, sayer('lawyer'), [{ stamp: 'OBJECTION.', col: '#ffe680', t: 80 }]);
    const i = before(L, set('gavel', 'f', 1), [{ zoom: 3, on: 'gavel', dy: -14 }]);
    if (i >= 0) L.splice(i + 5, 0, { zoom: 1, t: 12 });
  });
  W('6-boss:boss_in', L => {
    before(L, sayer('lawyer'), [{ zoom: 1.8, on: 'tim', dy: -30, t: 30, and: true }]);
    after(L, sayer('lawyer'), [{ zoom: 1, t: 20, and: true }]);
    before(L, card('boss'), [{ stamp: 'OBJECTION!', col: '#ffe680', t: 50, wait: true }]);
  });
  W('6-boss:boss_out', L => {
    after(L, fnHas('v0'), [fx({ dark: 0.85, spots: [{ on: [674, 292], r: 22, cone: false }] })]);
    before(L, set('tim', 'f', 4), [{ pause: [674, 300], title: 'TONI NEWMAN', sub: "Held out. Later Tim's campaign manager.", col: '#6a8aaa', label: 'THE VERDICT  NOV 2017' }, fx({ dark: 0 })]);
  });

  // ---- World 7
  W('7-1:open', L => {
    after(L, b => b.actor === 'germ', [{ zoom: 2.5, on: 'tub', dy: -14 }]);
    after(L, third('SEASON 10'), [{ wait: 40 }, { zoom: 1, t: 50 }]);
  });
  W('7-boss:boss_in', L => {
    before(L, clip('C11'), [fx({ split: ['gregg', 'boss'] })]);
    after(L, clip('C11'), [fx({ split: null })]);
  });
  W('7-boss:boss_out', L => {
    before(L, clip('E4'), [fx({ poster: { lines: ['TIM', 'FOR DISTRICT', 'ATTORNEY'], spr: 'w7_timocx', t0: null } })]);
    after(L, clip('E4'), [fx({ poster: null }), pop]);
    before(L, clip('C85'), [{ zoom: 1.8, on: 'gregg', dy: -30 }]);
    after(L, clip('C85'), [{ zoom: 1, t: 20, and: true }]);
  });

  // ---- World 8
  W('8-1:open', L => {
    L.unshift(fx({ dark: 0.6 }));
    after(L, set('sign', 'alpha', 1), [{ tween: 'dark', to: 0.15, t: 12, and: true }]);
    after(L, clip('C13'), [fx({ dark: 0 })]);
  });
  W('8-boss:boss_in', L => {
    before(L, b => b.sfx === 'wind', [fx({ dark: 0.35 })]);
    before(L, mv('vfa'), [fx({ streak: -1 })]);
    after(L, b => b.shake === 9, [fx({ streak: 0, dark: 0 })]);
    before(L, sayer('joker'), [{ zoom: 2, on: 'vfa', dy: -34 }]);
    before(L, card('boss'), [{ zoom: 1 }]);
  });
  W('8-boss:boss_out', L => { for (let i = 0; i < L.length; i++) if (L[i].fade === 1) { L.splice(i, 0, fx({ noise: 24 })); i++; } });

  // ---- World 9
  W('9-1:open', L => {
    L.unshift(fx({ ticker: 'ON CINEMA AND MORE! IN THE MORNING  *  OCTOBER 26, 2022  *  THE AMATO BANQUET HALL' }));
    before(L, mv('wafer'), [{ zoom: 3, on: 'wafer' }]);
    after(L, b => b.gone === 'wafer', [{ zoom: 1, t: 20, and: true }]);
  });
  W('9-boss:boss_in', L => { after(L, fnHas('sunA'), [{ flash: '#fff8e0', t: 30 }]); });
  W('9-boss:boss_out', L => {
    after(L, b => b.actor === 'car', [{ zoom: 1.5, on: 'car', dy: -16, t: 40, and: true }]);
    const i = at(L, set('car', 'lights', false)); if (i >= 0) { L.splice(i + 1, 0, { zoom: 1 }, fx({ streak: 1 })); L.splice(i + 4, 0, fx({ streak: 0 })); }
  });

  // ---- World 10
  W('10-1:open', L => { L.unshift(fx({ rec: true })); });
  W('10-boss:boss_in', L => {
    L.unshift(fx({ eyes: [[88, 328], [216, 328], [344, 328], [600, 328]] }), { tween: 'dark', to: 0.9, t: 12, and: true });
    before(L, set('r0', 'alpha'), [fx({ eyes: null }), { tween: 'dark', to: 0.5, t: 20, and: true }]);
    before(L, set('king', 'alpha'), [fx({ dark: 0.6, sil: [{ on: 'king', glow: '#ff7040' }] })]);
    before(L, set('king', 'spr'), [fx({ dark: 0, sil: null }), { flash: '#ffffff', t: 6 }]);
  });
  W('10-boss:boss_out', L => {
    after(L, third('OSCAR SPECIAL 12'), [fx({ siren: true })]);
    before(L, isFade(1), [fx({ siren: false, bars: true }), { wait: 20 }, fx({ bars: false })]);
  });

  // ---- World 11
  W('11-1:open', L => {
    const i = at(L, b => b.flash === '#ffffff'); if (i >= 0) L.splice(i, 1, fx({ timelapse: 16, tl0: null }), { wait: 112 }, fx({ timelapse: 0 }));
    before(L, b => b.actor === 'pill1', [{ zoom: 2.6, on: 'new', dy: -38 }]);
    after(L, b => b.gone === 'bottle', [{ zoom: 1 }]);
  });
  W('11-boss:boss_in', L => {
    after(L, fnHas('bang'), [{ zoom: 2.2, on: 'new', dy: -36, t: 40, and: true }]);
    before(L, card('boss'), [{ zoom: 1 }]);
  });
  W('11-boss:boss_out', L => { L.unshift({ zoom: 1.6, on: 'boss', dy: -30 }, { zoom: 1, t: 180, and: true }); });

  // ---- World 12
  W('12-1:open', (L, S, G) => {
    const me = 'd_' + G.pl.dot;
    L.unshift(fx({ search: true, pops: true }));
    before(L, mv(me), [{ zoom: 2.5, on: me, dy: -12 }]);
    after(L, mv(me), [{ zoom: 1 }]);
    before(L, sayer('mel'), [fx({ dark: 0.5, spots: [{ on: 'm_p', r: 30 }] })]);
    after(L, sayer('mel'), [fx({ dark: 0 })]);
  });
  W('12-boss:boss_in', L => {
    after(L, b => b.actor === 'mg', [fx({ sil: [{ on: 'mg', col: '#141024', glow: '#fff6c8', in: 12 }] }), { tween: 'dark', to: 0.5, t: 12, and: true }]);
    after(L, set('mg', 'spr'), [fx({ dark: 0, sil: null })]);
    before(L, third('HIS SEALED PREDICTION'), [fx({ env: { text: 'F1', t0: null } })]);
    before(L, b => b.set === 'mg' && b.spr === 'w12_mg_idle', [fx({ env: null })]);
  });
  W('12-boss:boss_out', L => {
    let i = -1; for (let k = L.length - 1; k >= 0; k--) if (L[k].fade === 1) { i = k; break; }
    if (i >= 0) L.splice(i, 0, fx({ sketch: true }));
  });
})();
