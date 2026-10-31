// sfx.js: the game's sound effects as a small NES-style chip synth. Pulse waves at 12.5 / 25 / 50% duty, the 4-bit stepped
// triangle, and LFSR noise in long (hiss) and short (metallic) modes, all driven once per 60th of a second like a tracker,
// so pitch moves in steps instead of gliding. DDSfxMake(AC, out, mute) returns a table with the same names engine.js's
// old SFX used (jump, stomp, pop ...), plus a few new ones. design/sfx/listen.html plays it against the old set.
(() => {
  const FR = 1 / 60;
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  const at = (a, i) => a ? a[Math.min(i, a.length - 1)] : 0;   // holds its last value
  const loop = (a, i) => a ? a[i % a.length] : 0;
  const dec = (a, n) => Array.from({ length: n }, (_, i) => Math.max(1, Math.round(a - (a - 1) * i / Math.max(1, n - 1))));   // a down to 1 over n frames
  const J = (a = 0.25) => (Math.random() * 2 - 1) * a;   // a little pitch drift so repeats don't sound stamped
  const PER = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];   // NES noise periods; noise n 15 is the brightest

  window.DDSfxMake = function (AC, out, mute = () => false) {
    const wave = steps => {   // one cycle of held steps -> a band-limited PeriodicWave (each step held 2048/L samples, so the DFT doesn't alias)
      const R = Math.ceil(2048 / steps.length), samples = steps.flatMap(x => Array(R).fill(x));
      const N = 64, L = samples.length, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) for (let k = 0; k < L; k++) { const a = 2 * Math.PI * n * k / L; re[n] += samples[k] * Math.cos(a) * 2 / L; im[n] += samples[k] * Math.sin(a) * 2 / L; }
      return AC.createPeriodicWave(re, im);
    };
    const pulse = d => wave(Array.from({ length: 64 }, (_, k) => k < 64 * d ? 1 : -1));
    const W = {
      p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5),
      tri: wave(Array.from({ length: 32 }, (_, k) => (k < 16 ? 15 - k : k - 16) / 7.5 - 1)),   // the 32-step 4-bit triangle
    };
    const NB = {};
    function noiseBuf(short, n) {   // LFSR noise at one of the 16 periods, looped; short mode is the 93-step metallic one
      const key = (short ? 's' : 'l') + n; if (NB[key]) return NB[key];
      const rate = 1789773 / PER[15 - n], sr = AC.sampleRate, len = short ? Math.max(64, Math.round(93 * sr / rate)) : sr;
      const b = AC.createBuffer(1, len, sr), d = b.getChannelData(0); let r = 1, acc = 0;
      for (let i = 0; i < len; i++) {
        acc += rate / sr;
        while (acc >= 1) { acc--; const fb = (r & 1) ^ ((r >> (short ? 6 : 1)) & 1); r = (r >> 1) | (fb << 14); }
        d[i] = (r & 1) ? -1 : 1;
      }
      return NB[key] = b;
    }
    const GAIN = { p12: 0.27, p25: 0.27, p50: 0.25, tri: 0.42, nz: 0.26, nzs: 0.22 };   // set so everyday sounds sit just under the music (RMS about -24 dB) and big ones level with it
    const bus = AC.createGain(), comp = AC.createDynamicsCompressor(), lim = AC.createDynamicsCompressor();   // glue, then a limiter so stacked hits never clip
    comp.threshold.value = -14; comp.knee.value = 6; comp.ratio.value = 3; comp.attack.value = 0.002; comp.release.value = 0.12;
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.06;
    bus.connect(comp); comp.connect(lim); lim.connect(out);
    let live = 0;

    // one voice. w: p12 p25 p50 tri nz nzs. n: midi note (noise: 0-15). vol: 0-15 per frame (its length is the length).
    // pit: semitones per frame, holds. arp: semitones per frame, loops (vibrato, trills). slide: semitones added per frame.
    // at: start in seconds. det: fixed detune. g: gain scale.
    function v(o) {
      if (live > 32) return;
      const t0 = AC.currentTime + 0.004 + (o.at || 0), len = o.vol.length, noise = o.w[0] === 'n', G = GAIN[o.w] * (o.g || 1);
      const g = AC.createGain(); g.gain.setValueAtTime(0, t0);
      let s;
      if (noise) { s = AC.createBufferSource(); s.buffer = noiseBuf(o.w === 'nzs', o.n); s.loop = true; }
      else { s = AC.createOscillator(); s.setPeriodicWave(W[o.w]); }
      for (let i = 0; i <= len; i++) {
        const t = t0 + i * FR;
        g.gain.setTargetAtTime(i < len ? o.vol[i] / 15 * G : 0, t, 0.0012);
        if (i === len) break;
        const semi = at(o.pit, i) + loop(o.arp, i) + (o.slide || 0) * i + (o.det || 0);
        if (noise) { const n = Math.max(0, Math.min(15, Math.round(o.n + semi))); s.playbackRate.setValueAtTime(PER[15 - o.n] / PER[15 - n], t); }
        else s.frequency.setValueAtTime(mf(o.n + semi), t);
      }
      s.connect(g); g.connect(bus); live++;
      s.onended = () => { live--; g.disconnect(); };
      if (noise) s.start(t0, Math.random() * s.buffer.duration); else s.start(t0);
      s.stop(t0 + len * FR + 0.03);
    }
    const seq = (w, notes, o = {}) => { let f = o.f0 || 0; for (const [n, fr, vol] of notes) { v({ ...o, w, n, vol: vol || dec(o.v || 11, fr), at: f * FR }); f += o.step || fr; } };
    const echo = (w, notes, d, o = {}) => seq(w, notes, { ...o, f0: (o.f0 || 0) + d, v: Math.round((o.v || 11) / 2), det: 0.06 });   // the trailing ghost a tracker adds on a spare channel
    const duck = s => { const M = window.DDMusic; if (M && M.duck) M.duck(s); };
    const last = {}, gap = (k, ms) => { const t = performance.now(); if (t - (last[k] || 0) < ms) return true; last[k] = t; return false; };
    const P5 = [0, 2, 4, 7, 9], penta = d => 12 * Math.floor(d / 5) + P5[d % 5];
    const ROOT = { sam: 72, mel: 76, cloud: 79, baxter: 67 };

    const S = {
      jump: (dot = 'sam') => {
        if (dot === 'mel') v({ w: 'p12', n: 76, pit: [0, 3, 6, 9, 12, 14, 15], vol: [11, 12, 10, 8, 6, 4, 3, 2, 1], det: J(0.3) });   // a tiny chirp
        else if (dot === 'cloud') { v({ w: 'tri', n: 64, slide: 0.7, vol: [8, 11, 12, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], det: J(0.3) }); v({ w: 'nz', n: 13, pit: [0, 0, -1, -1, -2, -2, -3], vol: [3, 5, 6, 5, 4, 3, 2, 2, 1, 1] }); }   // a breath
        else if (dot === 'baxter') {   // low and chunky
          v({ w: 'p50', n: 48, pit: [0, 1, 3, 5, 7, 8, 9, 10, 11, 12], vol: [15, 15, 13, 12, 10, 9, 7, 6, 5, 4, 3, 2, 1], det: J(0.3) });
          v({ w: 'tri', n: 36, pit: [0, 5, 9, 12], vol: [15, 13, 9, 5, 2] }); v({ w: 'nz', n: 8, vol: [10, 4] });
        } else { v({ w: 'p25', n: 62, pit: [0, 2, 4, 6, 8, 10, 11, 12], vol: [13, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], det: J(0.3) }); v({ w: 'p50', n: 50, pit: [0, 4, 8], vol: [8, 5, 2] }); }   // Sam: springy
      },
      dj: () => {   // Sam's flip: a spinning arpeggio that climbs
        v({ w: 'p25', n: 67, arp: [0, 4, 7, 12], slide: 0.35, vol: [12, 9, 12, 9, 11, 8, 10, 7, 9, 6, 7, 5, 5, 3, 3, 2, 1] });
        v({ w: 'p12', n: 79, arp: [12, 7, 4, 0], slide: 0.35, vol: [5, 4, 5, 4, 4, 3, 3, 2, 2, 1], at: 3 * FR });
      },
      land: (q = 1) => {
        if (gap('land', 40)) return; q = Math.max(1, Math.min(4, Math.round(q)));
        v({ w: 'nz', n: 3 + q, pit: [0, -1, -2], vol: [4 + q * 2, 2 + q, 2, 1] });
        v({ w: 'tri', n: 41 - q, pit: [0, -4, -9, -14], vol: q > 1 ? [11, 8, 4, 2] : [7, 4, 2], det: J(0.5) });
      },
      skid: () => { v({ w: 'nz', n: 14, pit: [0, -1, 0, -1, 0, -2, -1, -2, -1, -2], vol: [7, 8, 8, 7, 7, 6, 6, 5, 5, 4, 3, 2, 1] }); v({ w: 'p12', n: 84, arp: [0, -1], vol: [4, 4, 3, 3, 2, 2, 1, 1] }); },
      stomp: (chain = 0) => {   // a click, a squash down, a thump, and a little pip back up. chain raises it a step per stomp in a row
        const c = penta(Math.min(chain, 7));
        v({ w: 'nz', n: 15, vol: [15, 6] });
        v({ w: 'p50', n: 74 + c, pit: [0, -4, -8, -11, -14, -16, -18, -19], vol: [15, 14, 12, 10, 7, 5, 3, 1], det: J(0.2) });
        v({ w: 'tri', n: 45, pit: [0, -7, -12, -17, -20], vol: [15, 13, 9, 5, 2] });
        v({ w: 'nz', n: 9, vol: [11, 8, 5, 3, 1], at: FR });
        v({ w: 'p12', n: 86 + c, pit: [0, 5], vol: [6, 4, 2], at: 5 * FR });
      },
      pop: (p = 1) => {   // popcorn: a kernel "pok", a grace note, then the ding. The engine's combo walks it up a pentatonic scale
        if (gap('pop', 25)) return;
        const up = penta(Math.min(8, Math.max(0, Math.round(12 * Math.log2(p)))));
        v({ w: 'nz', n: 14, vol: [13, 5, 1] });
        v({ w: 'p25', n: 81 + up, vol: [11, 12], at: FR });
        v({ w: 'p25', n: 88 + up, arp: [0, 0, 0, 0, 0.1, 0, -0.1, 0], vol: [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], at: 3 * FR });
        v({ w: 'p12', n: 88 + up, det: 0.08, vol: [5, 5, 4, 4, 3, 3, 2, 2, 1], at: 6 * FR });
      },
      star: () => {   // GERM FREE starts: a two-octave run, then a trill
        const A = [72, 76, 79, 84, 88, 91, 96];
        seq('p25', A.map(m => [m, 2, [12, 10, 8, 6]])); echo('p12', A.map(m => [m, 2, [6, 5, 4, 3]]), 2);
        for (let k = 0; k < 6; k++) v({ w: 'p25', n: k % 2 ? 91 : 96, vol: [10, 8, 6, 4], at: (14 + k * 3) * FR });
        v({ w: 'tri', n: 48, pit: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7], vol: [...Array(26).fill(13), ...dec(12, 8)] });
        duck(0.8);
      },
      germsBack: () => {   // GERM FREE runs out: the run, falling
        seq('p25', [[91, 3], [88, 3], [84, 3], [79, 3], [76, 8]], { v: 10 }); echo('p12', [[91, 3], [88, 3], [84, 3], [79, 3], [76, 8]], 2, { v: 10 });
        v({ w: 'tri', n: 55, slide: -0.5, vol: dec(10, 24) });
      },
      shield: () => {   // MISTRIAL: a gavel knock, then a ring
        v({ w: 'nzs', n: 10, vol: [15, 9, 4, 1] }); v({ w: 'tri', n: 43, pit: [0, -5], vol: [15, 10, 4] }); v({ w: 'nz', n: 12, vol: [8, 3] });
        v({ w: 'p12', n: 93, arp: [0, 0.3, 0, -0.3], vol: dec(11, 20), at: 2 * FR }); v({ w: 'p25', n: 88, vol: dec(7, 14), at: 2 * FR });
      },
      ko: (p = 1) => {   // a boss hit (p 0.8) or a fan knocked out (p climbs with the chain)
        const s = 12 * Math.log2(p);
        v({ w: 'nz', n: 12, vol: [15, 13, 10, 7, 5, 3, 1] }); v({ w: 'nzs', n: 9, vol: [10, 5, 2] });
        v({ w: 'p25', n: 55 + s, slide: 2.6, vol: [14, 14, 12, 10, 8, 6, 4, 2], det: J(0.2) });
        v({ w: 'p12', n: 67 + s, slide: 2.6, vol: [6, 6, 5, 4, 3, 2, 1], at: 2 * FR });
      },
      scuffle: () => {   // a cartoon dust-up
        const vol = Array.from({ length: 30 }, (_, i) => Math.max(1, Math.round((i % 2 ? 4 : 11) * Math.min(1, (30 - i) / 8) + J(2))));
        v({ w: 'nz', n: 8, pit: vol.map(() => Math.round(J(3))), vol });
        for (let k = 0; k < 6; k++) v({ w: 'p12', n: 72 + Math.round(Math.random() * 16), vol: [6, 2], at: (k * 4 + 1) * FR });
        v({ w: 'nzs', n: 11, vol: [9, 4, 1], at: 9 * FR }); v({ w: 'nzs', n: 9, vol: [9, 4, 1], at: 19 * FR });
      },
      hurt: () => {   // a wobbling fall in pitch
        v({ w: 'nz', n: 11, vol: [14, 9, 4, 1] });
        v({ w: 'p50', n: 74, pit: [0, -1, -3, -2, -5, -4, -7, -6, -9, -8, -11, -10, -13, -12, -15, -14, -17, -16, -19, -18], vol: [15, 15, 14, 14, 13, 12, 12, 11, 10, 9, 9, 8, 7, 6, 5, 4, 4, 3, 2, 1] });
        v({ w: 'p12', n: 86, pit: [0, -3, -6, -9, -12], vol: [8, 6, 4, 2], det: 0.1 });
        duck(0.5);
      },
      slam: () => {   // Baxter's ground slam, a boss arriving, a boss going down
        v({ w: 'nz', n: 5, pit: [2, 1, 0, 0, -1, -1, -2, -2, -3], vol: [15, 15, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1] });
        v({ w: 'nz', n: 13, vol: [15, 10, 6, 3, 1] }); v({ w: 'nzs', n: 6, vol: [11, 8, 5, 3, 2, 1], at: 2 * FR });
        v({ w: 'tri', n: 40, pit: [0, -2, -4, -6, -8, -10, -12, -13, -14, -15, -16, -17, -18], vol: [15, 15, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] });
        v({ w: 'p50', n: 38, pit: [0, -3, -6, -9], vol: [13, 10, 6, 3] });
        duck(0.6);
      },
      slamWind: () => { v({ w: 'p12', n: 60, slide: 2.2, vol: [5, 6, 7, 8, 9, 10, 11, 12, 12] }); v({ w: 'tri', n: 60, slide: 2.2, vol: [6, 7, 8, 9, 10, 11, 12, 13, 13] }); },   // Baxter's hang before the drop: 9 frames, P.slamWind
      wind: () => {   // a small swish. Level enemies use it as their tell, often off screen, so it stays light
        if (gap('wind', 60)) return;
        v({ w: 'nz', n: 10, pit: [0, 1, 2, 3, 4, 4, 3, 2, 1], vol: [1, 3, 4, 5, 5, 4, 3, 2, 1] });
        v({ w: 'tri', n: 74, pit: [0, 2, 4, 5, 4, 2], vol: [2, 3, 3, 2, 1] });
      },
      roll: () => { v({ w: 'p12', n: 72, pit: [0, -5, -8, -5, 0, 5, 9, 12], vol: [10, 11, 11, 10, 9, 7, 5, 3, 1] }); v({ w: 'nz', n: 6, vol: [6, 5, 4, 3, 2, 1] }); },   // Mel curls up
      rollTick: (sp = 2) => { if (gap('roll', 80)) return; v({ w: 'nz', n: 3 + Math.min(4, Math.round(sp)), vol: [4, 3, 1] }); v({ w: 'tri', n: 36, vol: [5, 2] }); },   // the ball rumbling along, every few frames
      glide: () => { if (gap('glide', 120)) return; v({ w: 'nz', n: 12, pit: [0, 1, 1, 0, -1], vol: [1, 2, 3, 3, 2, 2, 1] }); },   // Cloud floating, every few frames
      respawn: () => { v({ w: 'tri', n: 60, slide: 1, vol: [3, 5, 7, 9, 10, 10, 9, 8, 6, 4, 2, 1] }); seq('p25', [[72, 2], [79, 2], [84, 8]], { v: 9, f0: 6 }); },   // back on the safe spot after a pit
      switch: dot => {   // a Dot tags in (each ends on its own note), or a menu confirm
        const r = ROOT[dot] || 72;
        v({ w: 'nz', n: 13, vol: [8, 3] });
        seq('p25', [[r - 12, 2], [r - 5, 2], [r, 7]], { v: 12 }); echo('p12', [[r - 12, 2], [r - 5, 2], [r, 6]], 2, { v: 12 });
      },
      cp: () => {   // a projector's clatter, then a chime
        for (let k = 0; k < 4; k++) v({ w: 'nzs', n: 12, vol: [9 - k * 2, 2], at: k * 3 * FR });
        seq('p25', [[76, 4], [81, 4]], { v: 11, f0: 2 }); v({ w: 'p25', n: 88, arp: [0, 0, 0.15, 0, -0.15, 0], vol: dec(11, 24), at: 10 * FR });
        echo('p12', [[76, 4], [81, 4], [88, 16]], 2, { v: 11, f0: 2 }); v({ w: 'tri', n: 57, vol: [...Array(10).fill(10), ...dec(10, 14)] });
      },
      thud: () => {
        if (gap('thud', 40)) return;
        v({ w: 'nz', n: 5, pit: [0, -1, -2, -3], vol: [15, 13, 10, 7, 5, 3, 2, 1] }); v({ w: 'nz', n: 11, vol: [9, 3] });
        v({ w: 'tri', n: 36, pit: [0, -3, -6, -8, -10, -11], vol: [15, 14, 11, 8, 5, 2] });
      },
      tub: () => {   // a popcorn tub: a clunk, a run up, a ring
        v({ w: 'nzs', n: 11, vol: [12, 5, 2] }); v({ w: 'nz', n: 7, vol: [10, 6, 3, 1] });
        const A = [67, 72, 76, 79, 84, 88]; seq('p25', A.map(m => [m, 2, [12, 9]])); echo('p12', A.map(m => [m, 2, [6, 4]]), 2);
        v({ w: 'p25', n: 91, arp: [0, 0, 0.15, 0, -0.15, 0], vol: dec(11, 16), at: 12 * FR }); v({ w: 'p12', n: 91, det: 0.07, vol: dec(5, 12), at: 14 * FR });
      },
      tick: () => { if (!gap('tick', 20)) v({ w: 'p12', n: 96, vol: [15, 6], g: 2 }); },
      vhs: () => {   // a tape: the deck clunks, the reels whir, a jingle
        v({ w: 'nzs', n: 9, vol: [15, 8, 3] }); v({ w: 'nz', n: 4, vol: [13, 7, 3, 1] }); v({ w: 'tri', n: 40, vol: [13, 6, 2] });
        v({ w: 'p12', n: 48, slide: 1.8, vol: [3, 4, 5, 6, 6, 6, 5, 4, 3, 2], at: 2 * FR }); v({ w: 'nz', n: 13, arp: [0, -1], vol: [2, 3, 3, 3, 3, 2, 2, 1], at: 2 * FR });
        const A = [[84, 3], [88, 3], [91, 3]]; seq('p25', A, { v: 12, f0: 10 }); echo('p12', A, 3, { v: 12, f0: 10 });
        v({ w: 'p25', n: 96, arp: [0, 0, 0.15, 0, -0.15, 0], vol: dec(12, 22), at: 19 * FR }); v({ w: 'p12', n: 96, det: 0.07, vol: dec(6, 18), at: 22 * FR });
        v({ w: 'tri', n: 48, vol: [...Array(12).fill(12), ...dec(12, 10)], at: 10 * FR });
        duck(0.9);
      },
      gate: () => {   // THE GATE OPENS: a rumble under a brass call
        v({ w: 'nz', n: 3, arp: [0, 1, 0, -1], vol: [3, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1] });
        seq('p50', [[76, 6], [81, 6]], { v: 12, f0: 12 }); v({ w: 'p50', n: 85, arp: [0, 0, 0.15, 0, -0.15, 0], vol: dec(12, 24), at: 24 * FR });
        echo('p25', [[76, 6], [81, 6], [85, 20]], 3, { v: 12, f0: 12 }); v({ w: 'tri', n: 45, vol: [...Array(24).fill(12), ...dec(12, 16)], at: 12 * FR });
        duck(1.2);
      },
      goal: () => {   // the stage is done: lead, harmony, bass, drums
        const lead = [[79, 4], [84, 4], [88, 4], [91, 8], [88, 4], [91, 26]], harm = [[76, 4], [79, 4], [84, 4], [88, 8], [84, 4], [88, 26]];
        seq('p25', lead.slice(0, 5), { v: 12 }); v({ w: 'p25', n: 91, arp: [0, 0, 0, 0.2, 0, -0.2], vol: [...Array(10).fill(12), ...dec(12, 16)], at: 24 * FR });
        seq('p50', harm.slice(0, 5), { v: 8 }); v({ w: 'p50', n: 88, vol: [...Array(10).fill(8), ...dec(8, 16)], at: 24 * FR });
        seq('tri', [[48, 8], [55, 8], [48, 8]], { v: 13 }); v({ w: 'tri', n: 43, vol: [13, 13, 13, 12, 11, 10, 9, 8], at: 24 * FR }); v({ w: 'tri', n: 48, vol: dec(13, 22), at: 32 * FR });
        for (const f of [0, 8, 16, 20, 24]) v({ w: 'nz', n: 10, vol: [12, 8, 5, 3, 1], at: f * FR });
        v({ w: 'p12', n: 96, arp: [0, 4, 7, 12], vol: dec(6, 20), at: 30 * FR });
        duck(1.6);
      },
      fall: () => { v({ w: 'p50', n: 84, slide: -1.1, arp: [0, 0, 1, 1], vol: dec(13, 40) }); v({ w: 'tri', n: 72, slide: -1.1, vol: dec(10, 40), at: 2 * FR }); duck(1); },   // down the pit
      head: () => {   // a Tim or Gregg head
        const A = [[83, 2], [87, 2], [90, 2]]; seq('p25', A, { v: 12 }); echo('p12', A, 2, { v: 12 });
        v({ w: 'p25', n: 95, arp: [0, 0, 0.15, 0, -0.15, 0], vol: dec(11, 14), at: 6 * FR }); v({ w: 'p12', n: 95, det: 0.07, vol: dec(5, 12), at: 8 * FR });
      },
      boing: () => {   // a spring
        v({ w: 'tri', n: 52, pit: [0, 4, 8, 12, 15, 17, 19], arp: [0, 0, 2, 2, -1, -1, 1, 1, 0], vol: dec(15, 22) });
        v({ w: 'p12', n: 64, pit: [0, 4, 8, 12, 15, 17, 19], arp: [0, 2, -1, 1], vol: dec(6, 16) });
      },
      buzz: () => {   // no: two flat honks
        v({ w: 'p50', n: 43, vol: [9, 9, 9, 8] }); v({ w: 'p25', n: 43, det: 0.3, vol: [5, 5, 5, 4] });
        v({ w: 'p50', n: 42, vol: [9, 9, 8, 8, 7, 5, 3, 1], at: 6 * FR }); v({ w: 'p25', n: 42, det: 0.3, vol: [5, 5, 4, 4, 4, 3, 2, 1], at: 6 * FR });
      },
      count: k => { if (!gap('count', 15)) v({ w: 'p12', n: 79 + penta((k | 0) % 10), vol: [12, 5], g: 2 }); },   // the results tally, walking a scale
      bag: () => {   // a bag fills: ka-ching
        v({ w: 'nzs', n: 12, vol: [13, 5, 1] }); v({ w: 'p25', n: 91, vol: [12, 11] });
        v({ w: 'p25', n: 96, arp: [0, 0, 0.2, 0, -0.2], vol: dec(13, 14), at: 2 * FR }); v({ w: 'p12', n: 100, vol: dec(6, 10), at: 4 * FR });
        v({ w: 'tri', n: 60, vol: [12, 8, 4, 2], at: 2 * FR });
      },
      phase: () => {   // a boss moves to its next phase: a hit, then stabs climbing over a rising bass
        v({ w: 'nz', n: 10, vol: [15, 12, 9, 6, 4, 2, 1] }); v({ w: 'nzs', n: 8, vol: [12, 9, 6, 4, 2, 1] });
        const A = [[69, 3], [72, 3], [75, 3]]; seq('p50', A, { v: 13 }); seq('p25', A.map(([m, f]) => [m - 5, f]), { v: 8 });
        v({ w: 'p50', n: 81, arp: [0, 0, 0.2, 0, -0.2, 0], vol: [...Array(8).fill(13), ...dec(13, 14)], at: 9 * FR }); v({ w: 'p25', n: 76, vol: [...Array(8).fill(8), ...dec(8, 14)], at: 9 * FR });
        v({ w: 'tri', n: 33, slide: 0.4, vol: [...Array(20).fill(14), ...dec(14, 10)] });
        duck(0.8);
      },
      crate: () => { if (gap('crate', 90)) return; v({ w: 'nz', n: 4, arp: [0, 1, -1, 0], vol: [5, 6, 5, 4, 3, 2] }); v({ w: 'nzs', n: 3, vol: [3, 3, 2, 1] }); },   // a crate scraping along, every few frames while it moves
      crumble: () => {   // cracked tiles giving way: a thump and a spill of bits
        v({ w: 'nz', n: 7, pit: [0, 0, -1, -1, -2, -2, -3, -3, -4], vol: [15, 13, 12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1] });
        v({ w: 'tri', n: 38, pit: [0, -4, -8, -11], vol: [14, 11, 7, 3] });
        for (let k = 0; k < 6; k++) v({ w: 'nzs', n: 10 + Math.round(Math.random() * 4), vol: [8 - k, 3, 1], at: (2 + k * 3 + Math.round(Math.random())) * FR });
      },
      fanCard: () => {   // a NEW FAN card slides in: a swish, then a "new entry" ding
        v({ w: 'nz', n: 13, pit: [-2, -1, 0, 1], vol: [2, 4, 5, 3, 1] });
        seq('p25', [[84, 3], [91, 3]], { v: 11, f0: 4 }); v({ w: 'p25', n: 96, arp: [0, 0, 0.15, 0, -0.15, 0], vol: dec(11, 16), at: 10 * FR });
        echo('p12', [[84, 3], [91, 3], [96, 12]], 3, { v: 11, f0: 4 }); v({ w: 'tri', n: 60, vol: [9, 9, 8, 6, 4, 2], at: 4 * FR });
      },
      irisOut: () => { v({ w: 'nz', n: 12, pit: [0, 0, -1, -1, -2, -2, -3, -3, -4, -4, -5], vol: [1, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2, 1, 1] }); v({ w: 'tri', n: 72, slide: -0.6, vol: [1, 2, 3, 3, 3, 2, 2, 1, 1], at: 4 * FR }); },   // the iris closing: a soft swish down
      irisIn: () => { v({ w: 'nz', n: 8, pit: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5], vol: [1, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2, 1, 1] }); v({ w: 'tri', n: 66, slide: 0.6, vol: [1, 2, 3, 3, 3, 2, 2, 1, 1], at: 4 * FR }); },   // and opening: up
      dsec: (dot = 'sam') => {   // a Dot secret: that Dot's own fanfare, landing an octave over its switch note, in its own voice
        const r = ROOT[dot] || 72, w = { sam: 'p25', mel: 'p12', cloud: 'tri', baxter: 'p50' }[dot] || 'p25', g = 1;
        v({ w: 'nz', n: 14, arp: [0, -2, 0, -3], vol: [6, 8, 7, 6, 5, 4, 3, 2, 1] });
        const A = [[r, 3], [r + 4, 3], [r + 7, 3], [r + 12, 3], [r + 7, 3]]; seq(w, A, { v: 12, g }); echo('p12', A, 2, { v: 12 });
        v({ w, n: r + 12, g, arp: [0, 0, 0.15, 0, -0.15, 0], vol: [...Array(8).fill(12), ...dec(12, 18)], at: 15 * FR });
        v({ w: 'p12', n: r + 24, arp: [0, 4, 7, 12], vol: dec(5, 20), at: 17 * FR });
        v({ w: 'tri', n: r - 24, vol: [...Array(15).fill(12), ...dec(12, 20)] });
        duck(0.9);
      },
      chip: () => {   // a gold chip: two clinks, a ring, a rattle
        for (const f of [0, 4]) { v({ w: 'nzs', n: 14, vol: [15, 6, 2], at: f * FR }); v({ w: 'p12', n: f ? 103 : 100, vol: dec(8, 12), at: f * FR }); }
        v({ w: 'p25', n: 96, arp: [0, 0, 0.2, 0, -0.2, 0], vol: dec(10, 22), at: 5 * FR });
        for (const f of [10, 12, 15, 19]) v({ w: 'nzs', n: 13, vol: [6 - (f - 10) / 3 | 0, 2], at: f * FR });
        duck(0.6);
      },
      blip: (f = 440) => v({ w: 'p12', n: 69 + 12 * Math.log2(f / 440), vol: [7, 2], g: 2.5 }),   // one letter of narration
    };
    for (const k in S) { const f = S[k]; S[k] = (...a) => { if (AC && !mute()) f(...a); }; }
    return S;
  };
})();
