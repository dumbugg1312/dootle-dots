// Voice: soundbites of the hosts cut from the show. Clips: game/voice/*.mp3, table game/voice/clips.js (built by
// design/soundbites/build_voice.py). Lines answer what just happened in play, placed per level in game/voice/cues.js
// (built by design/soundbites/build_cues.py): the stage opening, its scripted story beats (beat:<LEVEL.lines name>), its
// set-piece banners (banner:<TEXT>), a landmark reached (at), the first Gregg/Tim fan on screen and their first brawl, the
// tape, the blue card (fact_true / fact_wrong), the last kernel, a tub stomp, switching to a Dot (dot_<name>), a Dot joining the cast (join_<name>), standing idle,
// a hit, a pit, a checkpoint, a stage down to its last bag, and the boss: intro, phases, your first hit on it, its gloat when
// it hits you, its defeat. Per world: the era line on opening the world, and fallbacks for the era-wide reactions. The results
// card says the rating it shows. Nothing plays at random or on a timer: a moment with no line stays quiet.
// The engine calls DDVoice.say(moment, opts); V toggles voices (remembered).
(function () {
  const Q = new URLSearchParams(location.search), UNCUT = Q.has('uncut'), LOG = Q.has('voicelog');
  const BY = {}; (window.VOICE_CLIPS || []).forEach(c => { if (c.ok && (UNCUT || !(c.x || []).some(f => f === 'explicit' || f === 'political'))) BY[c.id] = c; });
  const CUES = window.VOICE_CUES || { levels: {}, worlds: {}, title: [] };
  let on = true; try { on = localStorage.getItem('dd-voice') !== '0'; } catch (e) {}
  // Three kinds of moment. MUST: the beats that always land (a boss arriving or falling, the clear, the menu and results lines);
  // they wait out a line still playing. PLACED: lines written for something that just happened in this stage (its opening,
  // a scripted story beat, a set-piece banner, a boss phase, the first sight of a fandom, the tape, the blue card, the last
  // kernel); they skip the quiet gap, wait out a line still playing, and each speaks once a run. REACTIVE: things the player
  // does that can happen again and again (a hit, a pit, a checkpoint, switching Dots, standing idle); they speak once a run,
  // only after GAP seconds of quiet, and never spend a line a placed spot is waiting for. BUDGET caps a stage's lines.
  const BUDGET = 6, GAP = 12, MUST = { boss_intro: 1, boss_defeat: 1, clear: 1, perfect: 1, rating: 1, six: 1, world: 1, title: 1 };
  ['sam', 'mel', 'cloud', 'baxter'].forEach(d => { MUST['join_' + d] = 1; });   // a Dot joining always gets its intro
  const PLACED = /^(level_start|beat:|banner:|boss_phase|fan_|brawl|vhs|fact_|allpop)/;
  const SKIPBEAT = /^(start|goal|checkpoint|boss|bossDefeat|bossPhase\d*)$/;   // beats that already have their own moment
  const TAUNTS = 2;   // boss_taunt: the boss gloats when it hits you, twice a fight at most
  const anySaid = {};   // game-wide fallback lines (CUES.any) speak once a session, so they don't open every stage
  const used = {}, now = () => performance.now() / 1000;
  let cur = null, curKey = null, curEnd = 0, lastAt = -99, levelId = null, spots = [], titled = false, still = { x: 0, y: 0, t: 0 };
  let run = { spoken: 0, said: {}, damage: 0, taunts: 0 }, pending = null;

  const level = () => { const D = window.DD, L = window.LEVEL; return D && !D.inMenu && L ? L : null; };
  const ids = l => (l || []).filter(id => BY[id]);
  function next(key, list) {   // walk a cue list in order across replays, so repeat visits hear the next take, not the same one
    const l = ids(list); if (!l.length) return null;
    const k = used[key] || 0; used[key] = k + 1; return BY[l[k % l.length]];
  }
  function play(c) {
    try {
      if (cur) cur.pause();
      const a = new Audio('voice/' + c.f); a.volume = 0.95 * (window.DDVol ? window.DDVol.get('voice') : 1); a.play().catch(() => {});
      cur = a; curEnd = now() + c.d + 1.0;   // a breath after each line, so a waiting line never butts straight into it
      lastAt = now(); a.onended = () => { if (cur === a) cur = null; };
      const M = window.DDMusic; if (M && M.duck) M.duck(c.d + 0.15);
      if (LOG) console.log('[voice]', c.id, c.line);
    } catch (e) { return false; }
    return true;
  }
  function cueFor(moment, o) {
    const L = level(), lc = L && CUES.levels[L.id] || {}, wc = CUES.worlds[(o && o.world) || (L && L.world)] || {};
    if (moment === 'rating') {   // the card's rating, in this world's era if it has a take, else any take of that rating
      const r = o.bonus ? ['5b', 5] : [o.bags], all = Object.values(BY).filter(c => c.r != null);
      for (const v of r) {
        const mine = all.filter(c => c.r === v && c.w === (L && L.world)), any = all.filter(c => c.r === v);
        const p = mine.length ? mine : any; if (p.length) return p[Math.floor(Math.random() * p.length)];
      }
      return null;
    }
    if (moment === 'six') return next('six', wc.six || CUES.six);
    if (moment === 'world') return next('world' + o.world, wc.pick);
    if (moment === 'title') return next('title', CUES.title);
    return next(L && L.id + ':' + moment, lc[moment] || wc[moment] || (CUES.any || {})[moment]);   // the level's own cue, else the world's, else the game-wide one
  }
  function spotsAhead() { return spots.filter(s => !s.done && BY[s.id]).length; }
  function keyOf(moment, o) {   // the cue key: banner:<TEXT>, beat:<name>, boss_phase<N>, dot_<dot>, or the moment itself
    if (moment === 'banner' || moment === 'beat') return o.k ? moment + ':' + o.k : null;
    if (moment === 'boss_phase') return 'boss_phase' + o.ph;
    if (moment === 'dot') return 'dot_' + o.dot;
    if (moment === 'join') return 'join_' + o.dot;   // a Dot joining the cast on the results card introduces itself
    return moment;
  }
  function allowed(key) {   // the pacing rules
    if (MUST[key]) return true;
    if (key === 'boss_taunt') { if (run.taunts >= TAUNTS) return false; }
    else if (run.said[key]) return false;
    if (BUDGET - run.spoken <= 0) return false;
    if (PLACED.test(key)) return true;
    if (now() - lastAt < GAP || now() < curEnd) return false;
    return BUDGET - run.spoken - spotsAhead() > 0;   // a hit or a checkpoint never spends a line a placed spot is waiting for
  }
  function say(moment, o) {
    o = o || {};
    if (moment === 'beat' && SKIPBEAT.test(o.k || '')) return false;
    if (moment === 'hurt' || moment === 'death' || moment === 'boss_taunt') run.damage++;
    if (moment === 'clear' && run.damage === 0 && cueFor('perfect', o)) moment = 'perfect';   // a clean run gets its own line
    const key = keyOf(moment, o); if (!key || !on) return false;
    if (/^dot_/.test(key) && cur && /^dot_/.test(curKey || '')) { cur.pause(); cur = null; curEnd = 0; lastAt = -99; if (pending && /^dot_/.test(pending.key || '')) pending = null; }   // switching again cuts the last Dot's line, so a Dot never speaks over another Dot
    if (!allowed(key)) return false;
    const L = level(), w = (o.world) || (L && L.world), mine = L && (CUES.levels[L.id] || {})[key], era = (CUES.worlds[w] || {})[key], own = mine || era;
    if (!own && !MUST[key] && (CUES.any || {})[key]) { if (anySaid[key]) return false; }
    // a world-wide reaction (a hit, a pit, idling...) covers every stage of that world, so it speaks once a session, not once
    // a stage: otherwise the same line greets the first hit of every stage in the world
    const eraOnce = !mine && era && !MUST[key] && !PLACED.test(key) ? 'w' + w + ':' + key : null;
    if (eraOnce && anySaid[eraOnce]) return false;
    if (now() < curEnd && pending && !MUST[key]) return false;   // one line waits at a time (a must-land beat takes the slot)
    const c = cueFor(key, o); if (!c) return false;
    run.said[key] = 1; if (key === 'boss_taunt') run.taunts++;
    if (!own && (CUES.any || {})[key]) anySaid[key] = 1;
    if (eraOnce) anySaid[eraOnce] = 1;
    if (now() < curEnd) { pending = { c, key, t: now(), count: !MUST[key] }; return true; }   // wait out the line playing
    if (!MUST[key]) run.spoken++;
    curKey = key; return play(c);
  }
  function tick() {
    const D = window.DD;
    if (pending && now() >= curEnd) { const p = pending; pending = null; if (now() - p.t < 5) { if (p.count) run.spoken++; curKey = p.key; play(p.c); } }
    const L = level(); if (!on || !L || !D) return;
    const G = D.G; if (!G || !G.pl) return;
    if (L.id !== levelId || G.__voRun !== run) {   // a new stage, or a restart: fresh budget, re-armed spots
      levelId = L.id; run = { spoken: 0, said: {}, damage: 0, taunts: 0 }; G.__voRun = run;
      spots = ((CUES.levels[L.id] || {}).at || []).map(s => ({ ...s, done: false }));
    }
    const tx = (G.pl.x + G.pl.w / 2) / 16;
    // spot lines name a landmark the player has just reached; they skip the quiet gap and only wait out a line still playing
    const reached = spots.filter(s => !s.done && tx >= s.x);
    if (reached.length && now() >= curEnd) {
      reached.forEach(s => { s.done = true; });
      const s = reached[reached.length - 1];
      if (BY[s.id] && BUDGET - run.spoken > 0) { run.spoken++; curKey = 'spot'; play(BY[s.id]); }
    }
    // standing still for 8 s in open play: the hosts notice (once a run)
    const dl = D.dialog, busy = G.state !== 'play' || G.done || G.fall || (dl && (dl.cur || dl.q.length)) || (G.boss && G.boss.engaged);
    if (busy || Math.abs(G.pl.x - still.x) > 2 || Math.abs(G.pl.y - still.y) > 2) still = { x: G.pl.x, y: G.pl.y, t: now() };
    else if (now() - still.t > 8) { still.t = now(); say('idle'); }
  }
  addEventListener('keydown', e => {
    if (!titled && window.DD && window.DD.inMenu) { titled = true; setTimeout(() => say('title'), 250); }   // the first key also unlocks audio
    if (e.code === 'KeyV' && !e.repeat) { on = !on; try { localStorage.setItem('dd-voice', on ? '1' : '0'); } catch (er) {} if (!on && cur) { cur.pause(); cur = null; } }
  });
  setInterval(tick, 250);
  let prevAt = 0;
  function preview() {   // the options menu's voice slider: a short line at the new volume
    if (now() - prevAt < 0.5) return; prevAt = now();
    const c = BY.DD25 || BY.DD16; if (!c) return;
    if (cur) cur.pause();
    const a = new Audio('voice/' + c.f); a.volume = 0.95 * (window.DDVol ? window.DDVol.get('voice') : 1); a.play().catch(() => {}); cur = a; curKey = 'preview';
  }
  window.DDVoice = { say, preview, get on() { return on; }, set on(v) { on = !!v; }, get run() { return run; } };
})();
