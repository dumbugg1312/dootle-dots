'use strict';
// Music: plays the SNES-style arrangements in game/music/<name>.js (window.MUSIC[name]).
// Tracks from music/loop.py (the ones we use) are a seamless loop of the song's hook: chip voices over the softened bitcrush,
// looped gaplessly, and one song crossfades into the next. Older routes: crush.py (one file), snesify.py (4 synced layers);
// tracks from music/convert.py are note data synthesised live. Either way a level's track builds as it escalates:
//   0 calm: the song and bass, drums low   1 argument: full drums, + the chip lead   2 tantrum / boss phase 2: all of it. The tempo never changes.
// Which track plays where comes from game/music/cues.js (window.CUES). M mutes (remembered).
(() => {
  const CUES = window.CUES || {}, MUSIC = window.MUSIC = window.MUSIC || {}, LOG = /musiclog/.test(location.search);
  const MV = () => (window.DDVol ? window.DDVol.get('music') : 1);   // the options menu's music volume
  let AC = null, OUT = null, PULSE = null, NOISE = null, cur = null, muted = false, deck = null;
  try { muted = localStorage.getItem('dd-mute') === '1'; } catch (e) {}

  // tracks load on demand (each is ~300-500KB of embedded Ogg): the title theme now, a level's song when its world opens in the
  // menu (DDMusic.prepare), the rotation's next song while the current one plays (prime), a jukebox song when it's highlighted.
  // A missing file is remembered and just stays silent.
  const WANTED = new Set(), MISSING = {};
  function load(n) {
    if (!n || MUSIC[n] || WANTED.has(n)) return; WANTED.add(n);
    const s = document.createElement('script'); s.src = 'music/' + n + '.js'; s.onerror = () => { MISSING[n] = 1; }; document.head.appendChild(s);
    if (LOG) console.log('MUSIC loading ' + n);
  }
  load(CUES.title);

  function init() {
    if (AC) return;
    try { AC = new AudioContext(); } catch (e) { return; }
    OUT = AC.createGain(); OUT.gain.value = muted ? 0 : 0.32 * MV();
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;   // the SNES's soft top end
    const echo = AC.createDelay(1), fb = AC.createGain(), efl = AC.createBiquadFilter(), wet = AC.createGain();   // the SNES echo
    echo.delayTime.value = 0.24; fb.gain.value = 0.42; efl.type = 'lowpass'; efl.frequency.value = 2600; wet.gain.value = 0.28;
    OUT.connect(lp); lp.connect(AC.destination); OUT.connect(echo); echo.connect(efl); efl.connect(fb); fb.connect(echo); efl.connect(wet); wet.connect(AC.destination);
    const re = new Float32Array(32), im = new Float32Array(32);   // 25% pulse wave
    for (let k = 1; k < 32; k++) { re[k] = 0; im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25); }
    PULSE = AC.createPeriodicWave(re, im);
    NOISE = AC.createBuffer(1, AC.sampleRate * 0.3, AC.sampleRate);
    const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const unlock = () => { init(); if (AC && AC.state === 'suspended') AC.resume(); if (deck) deck.blocked = false; };
  addEventListener('keydown', e => {
    unlock();
    if (e.code === 'KeyM') { muted = !muted; try { localStorage.setItem('dd-mute', muted ? '1' : '0'); } catch (er) {} if (OUT) OUT.gain.value = muted ? 0 : 0.32 * MV(); }
  });
  addEventListener('pointerdown', unlock);
  init();   // created up front (allowed without a gesture); it stays suspended until the first key or click where the browser requires that

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(part, m, t, dur, vel) {
    const o = AC.createOscillator(), g = AC.createGain(), v = 0.6 + 0.4 * vel;
    if (part === 'lead') { o.setPeriodicWave(PULSE); o.frequency.value = hz(m); }
    else if (part === 'harm') { o.type = 'sawtooth'; o.frequency.value = hz(m); }
    else { o.type = 'triangle'; o.frequency.value = hz(m); }
    const peak = { lead: 0.22, harm: 0.06, bass: 0.34 }[part] * v, a = part === 'harm' ? 0.05 : 0.008;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * (part === 'bass' ? 0.55 : 0.75), t + a, 0.08);
    g.gain.setTargetAtTime(0, t + Math.max(a, dur - 0.02), 0.04);
    let node = o;
    if (part === 'harm') { const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; o.connect(f); node = f; }
    node.connect(g); g.connect(OUT); o.start(t); o.stop(t + dur + 0.3);
  }
  function hit(kind, t) {
    const g = AC.createGain(); g.connect(OUT);
    if (kind === 'k') {
      const o = AC.createOscillator(); o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g); o.start(t); o.stop(t + 0.22);
    } else {
      const s = AC.createBufferSource(), f = AC.createBiquadFilter(); s.buffer = NOISE;
      f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
      g.gain.setValueAtTime(kind === 's' ? 0.3 : 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 's' ? 0.16 : 0.05));
      s.connect(f); f.connect(g); s.start(t); s.stop(t + 0.2);
    }
  }

  // the rotation: each level plays its own song start to finish; a boss fight moves once through one shared order of every track
  const ROT = (CUES.rotation || []).filter(Boolean), RKEY = 'dootledots.music.rot';
  let rotAt = 0; try { rotAt = (+localStorage.getItem(RKEY) || 0) % Math.max(1, ROT.length); } catch (e) {}
  let preview = null, carry = null;   // carry: the song the last level ended on   // the jukebox plays the highlighted song
  let run = null;   // this level's music: { G, name, switches, last, cps, engaged, phase }
  const startSong = (id, world, isBoss) => (CUES.level || {})[id] || (isBoss ? (CUES.boss || {})[world] : null) || (CUES.world || {})[world] || CUES.title;
  // the jukebox's choices: songs taken out of the rotation, and shuffle; saved with the game
  const PKEY = 'dootledots.music.prefs';
  let prefs = { off: [], shuffle: false };
  const reloadPrefs = () => { prefs = { off: [], shuffle: false }; try { const p = JSON.parse(localStorage.getItem(PKEY) || 'null'); if (p) prefs = { off: Array.isArray(p.off) ? p.off : [], shuffle: !!p.shuffle }; } catch (e) {} };
  const savePrefs = () => { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) {} };
  reloadPrefs();
  const isOn = n => prefs.off.indexOf(n) < 0;
  const nextSong = cur => {   // the next track in the shared order (or a random one, on shuffle) that's switched on and isn't playing; remembered across sessions
    if (prefs.shuffle) { const pool = ROT.filter(n => n !== cur && isOn(n) && !MISSING[n]); return pool.length ? pool[Math.floor(Math.random() * pool.length)] : cur; }
    for (let k = 0; k < ROT.length; k++) { const n = ROT[rotAt % ROT.length]; rotAt = (rotAt + 1) % ROT.length; if (n !== cur && isOn(n) && !MISSING[n]) { try { localStorage.setItem(RKEY, rotAt); } catch (e) {} return n; } }
    return cur;
  };
  const prime = n => { const song = MUSIC[n]; if (!song) return load(n); if (AC && song.ogg && !song.buffer && !song.decoding) playLoop({ name: n, layer: 0 }, song, true); };   // fetch and decode ahead, so a change is instant
  const prepare = (id, world, isBoss) => load(startSong(id, world, isBoss));   // the menu: fetch a stage's opening song before it starts
  function levelSong(DD, G, id, world, isBoss) {
    const now = performance.now() / 1000;
    if (!run || run.G !== G) {   // a new level, or a restart: back to this level's own song
      let first = startSong(id, world, isBoss); if (!isOn(first)) first = nextSong(first);   // its own song, unless the jukebox switched that one off
      run = { G, name: first, switches: 0, last: now, cps: 0, engaged: false, phase: 0 };
      run.upnext = ROT.length ? ROT[rotAt % ROT.length] : null;
    }
    const cps = (DD.bodies || []).filter(b => b.kind === 'cp' && b.lit).length, B = G.boss;
    const event = cps > run.cps || (B && B.engaged && !run.engaged) || (B && B.phase > run.phase);
    run.cps = cps; if (B) { run.engaged = !!B.engaged; run.phase = B.phase || 0; }
    const cap = isBoss ? (CUES.bossSwitches != null ? CUES.bossSwitches : 1) : (CUES.switchesPerLevel != null ? CUES.switchesPerLevel : 0);   // a stage keeps its song; a boss fight changes it once
    if (event && !G.done && run.switches < cap && now - run.last >= (CUES.minSeconds || 40)) {
      run.name = nextSong(run.name); run.switches++; run.last = now; if (LOG) console.log('MUSIC rotates to ' + run.name);
    }
    if (run.upnext !== ROT[rotAt % ROT.length]) run.upnext = ROT[rotAt % ROT.length];
    if (run.upnext) prime(run.upnext === run.name ? ROT[(rotAt + 1) % ROT.length] : run.upnext);
    return run.name;
  }

  // which track, and how intense, right now
  function want() {
    const DD = window.DD; if (!DD) return null;
    if (DD.inMenu || !DD.G) { if (run) carry = run.name; run = null; return { name: preview || carry || CUES.title, layer: 1 }; }   // back in the menu the last level's song keeps going
    if (preview) return { name: preview, layer: 1 };   // the jukebox opened from the pause menu: the level's run waits underneath
    const G = DD.G, L = DD.L || {}, id = L.id || '', world = parseInt(id, 10);
    const isBoss = /boss/.test(id);
    const name = levelSong(DD, G, id, world, isBoss);
    let layer = 0;
    if (G.s && G.s.intensity !== undefined) layer = G.s.intensity;
    else if (isBoss) layer = G.boss && G.boss.engaged ? (G.boss.phase >= 1 ? 2 : 1) : 0;
    else if (G.s && G.s.tantrum) layer = 2;
    else if (G.s && G.s.argument) layer = 1;
    else if (G.pl && L.W) { const k = G.pl.x / (L.W * 16); layer = k > 0.75 ? 2 : k > 0.4 ? 1 : 0; }
    if (G.done) layer = 0;
    return { name, layer };
  }
  const plays = (part, layer, kind) => part === 'bass' || part === 'harm' || (part === 'drums' && (kind === 'h' || layer >= 1)) || (part === 'lead' && layer >= 1);

  // layered audio tracks: one <audio> per layer, started together and kept in step with the drums
  const MIX = [{ back: 1, bass: 1, drums: 0.35, lead: 0 }, { back: 1, bass: 1, drums: 1, lead: 1 }, { back: 1, bass: 1, drums: 1, lead: 1 }];   // per-layer volumes; a single 'song' layer just plays at full
  function stopDeck() { if (deck) { for (const a of Object.values(deck.els)) a.pause(); deck = null; } }
  function playDeck(w, song) {
    if (!deck || deck.name !== w.name) {
      stopDeck();
      deck = { name: w.name, els: {}, started: false };
      for (const [k, src] of Object.entries(song.layers)) { const a = new Audio(src); a.preload = 'auto'; a.volume = 0; deck.els[k] = a; }
    }
    const els = deck.els, lead = els.drums || Object.values(els)[0];
    if (!deck.started) {
      if (deck.pending || deck.blocked || Object.values(els).some(a => a.readyState < 1)) return;   // one play() at a time; Chrome only buffers past metadata once playing
      deck.pending = true;
      Promise.all(Object.values(els).map(a => a.play())).then(() => {
        deck.pending = false; deck.started = true; if (LOG) console.log('MUSIC playing ' + w.name + ' layers ' + Object.keys(els).join(','));
      }).catch(e => { deck.pending = false; if (e && e.name === 'NotAllowedError') deck.blocked = true; });   // the browser wants a key or click first
      return;
    }
    if (lead.ended || lead.currentTime >= song.seconds - 0.05) for (const a of Object.values(els)) { a.currentTime = 0; a.play().catch(() => {}); }   // loop together
    const mix = MIX[w.layer] || MIX[1];
    for (const [k, a] of Object.entries(els)) {
      const want = muted ? 0 : 0.6 * (mix[k] ?? 1) * duckK() * MV();
      a.volume += (want - a.volume) * 0.15;                          // fade layers in and out
      if (a !== lead && Math.abs(a.currentTime - lead.currentTime) > 0.06) a.currentTime = lead.currentTime;   // keep in step
    }
    if (LOG && Math.random() < 0.02) console.log('MUSIC t=' + lead.currentTime.toFixed(2) + ' layer ' + w.layer + ' drift ' + Math.max(...Object.values(els).map(a => Math.abs(a.currentTime - lead.currentTime))).toFixed(3));
  }

  // loops from music/loop.py: the hook of the song, embedded as Ogg and looped sample-accurately by WebAudio (no gap).
  // A change of song is a crossfade: the old loop fades out over XF seconds while the new one fades in under it
  const XF = 2.5;
  let looper = null;
  function stopLoop() {
    if (!looper) return;
    const l = looper, g = l.gain.gain, t = AC.currentTime; looper = null;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + XF);
    setTimeout(() => { try { l.src.stop(); } catch (e) {} }, XF * 1000 + 200);
  }
  function playLoop(w, song, onlyDecode) {
    if (!song.buffer) {
      if (song.decoding) return;
      song.decoding = true;
      const bin = atob(song.ogg), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      AC.decodeAudioData(bytes.buffer).then(b => { song.buffer = b; }).catch(() => { song.decoding = false; });
      return;
    }
    if (onlyDecode) return;
    if (!looper || looper.name !== w.name) {
      stopLoop();
      const src = AC.createBufferSource(), gain = AC.createGain();
      src.buffer = song.buffer; src.loop = true; gain.gain.value = 0;
      src.connect(gain); gain.connect(AC.destination); src.start();
      looper = { name: w.name, src, gain, born: AC.currentTime };
      if (LOG) console.log('MUSIC looping ' + w.name + ' ' + song.buffer.duration.toFixed(2) + 's');
    }
    const fadeIn = Math.min(1, (AC.currentTime - looper.born) / XF);   // rises under the old song's fade-out
    looper.gain.gain.setTargetAtTime(muted ? 0 : 0.55 * duckK() * fadeIn * MV(), AC.currentTime, duckK() < 1 ? 0.06 : fadeIn < 1 ? 0.05 : 0.25);
  }

  // look-ahead scheduler: every 50ms, queue the notes falling in the next 250ms
  setInterval(() => {
    const w = want(), song = w && w.name && MUSIC[w.name];
    if (w && w.name && !song) load(w.name);   // wanted but not fetched yet: silence until it lands, then it fades in
    if (LOG && Math.random() < 0.05) console.log('MUSIC ac ' + (AC ? AC.state : 'none') + ' ogg ' + !!(song && song.ogg) + ' buf ' + !!(song && song.buffer) + ' dec ' + !!(song && song.decoding) + ' want ' + JSON.stringify(w) + ' have ' + Object.keys(MUSIC).join(',') + (deck ? ' deck ' + deck.name + ' started ' + deck.started + ' ready ' + Object.values(deck.els).map(a => a.readyState).join('') : ''));
    if (song && song.ogg) { cur = null; stopDeck(); if (AC && AC.state === 'running') playLoop(w, song); return; }
    if (AC) stopLoop();
    if (song && song.layers) { cur = null; playDeck(w, song); return; }
    stopDeck();
    if (!AC || AC.state !== 'running') return;
    if (!song) { cur = null; return; }
    if (!cur || cur.name !== w.name) cur = { name: w.name, beat: 0, t: AC.currentTime + 0.1 };
    const spb = 60 / song.bpm, loopLen = Math.ceil(song.beats / 4) * 4, horizon = AC.currentTime + 0.25;
    while (cur.t < horizon) {
      const b0 = cur.beat, b1 = b0 + 0.25;
      for (const part of ['lead', 'harm', 'bass']) for (const n of song[part]) if (n[0] >= b0 && n[0] < b1 && plays(part, w.layer))
        note(part, n[2], cur.t + (n[0] - b0) * spb, n[1] * spb, n[3]);
      for (const h of song.drums) if (h[0] >= b0 && h[0] < b1 && plays('drums', w.layer, h[1])) hit(h[1], cur.t + (h[0] - b0) * spb);
      cur.beat = b1 >= loopLen ? 0 : b1; cur.t += 0.25 * spb;
    }
  }, 50);
  // soften the music under a voice line (game/voice.js), then bring it back. All three ways music plays follow it: the
  // synth arrangements through OUT, and the recorded loops and layered decks, which read duckK() on their volume updates
  const DUCK = 0.45; let duckUntil = 0;
  function duckK() { return performance.now() < duckUntil ? DUCK : 1; }
  function duck(sec) {
    duckUntil = Math.max(duckUntil, performance.now() + sec * 1000);
    if (!OUT || muted || !AC) return; const g = OUT.gain, t = AC.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(0.32 * DUCK * MV(), t, 0.06); g.setTargetAtTime(0.32 * MV(), t + sec, 0.3);
  }
  function applyVol() { if (OUT && AC && !muted) { const g = OUT.gain; g.cancelScheduledValues(AC.currentTime); g.value = 0.32 * MV() * duckK(); } }   // the options slider moved
  window.DDMusic = { want, duck, applyVol, get muted() { return muted; }, get run() { return run; }, get rotAt() { return rotAt; },
    get preview() { return preview; }, set preview(n) { preview = n || null; },
    get prefs() { return prefs; }, reloadPrefs, isOn, load, prepare, missing: n => !!MISSING[n],
    toggle(n) { const i = prefs.off.indexOf(n); if (i >= 0) prefs.off.splice(i, 1); else if (ROT.filter(isOn).length > 1) prefs.off.push(n); else return false; savePrefs(); return true; },
    setShuffle(v) { prefs.shuffle = !!v; savePrefs(); } };
})();
