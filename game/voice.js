// Voice: soundbites of the hosts cut from the show. Clips: game/voice/*.mp3, table game/voice/clips.js (built by
// design/soundbites/build_voice.py). Lines answer what just happened in play, placed per level in game/voice/cues.js
// (built by design/soundbites/build_cues.py): the stage opening, its scripted story beats (beat:<LEVEL.lines name>), its
// set-piece banners (banner:<TEXT>), a landmark reached (at), the first Gregg/Tim fan on screen and their first brawl, the
// tape, the blue card (fact_true / fact_wrong), the last kernel, a tub stomp, switching to a Dot (dot_<name>), a Dot joining the cast (join_<name>), standing idle,
// a hit, a pit, a checkpoint, a stage down to its last bag, and the boss: intro, phases, your first hit on it, its gloat when
// it hits you, its defeat. Per world: the era line on opening the world, and fallbacks for the era-wide reactions. The results
// card says the rating it shows. In open play the hosts also chime in (aside) after a stretch of quiet, from the stage's and
// the world's own pools, so every approved clip gets heard somewhere. Every pick prefers the clip this computer has heard the
// fewest times (dd-voice-plays), so a playthrough keeps turning up new lines instead of the same few.
// The engine calls DDVoice.say(moment, opts); V toggles voices (remembered).
(function () {
  const Q = new URLSearchParams(location.search), LOG = Q.has('voicelog');
  const BY = {}; (window.VOICE_CLIPS || []).forEach(c => { if (c.ok) BY[c.id] = c; });   // no content filter: the user curates the clips by ear (ear.html)
  const CUES = window.VOICE_CUES || { levels: {}, worlds: {}, title: [] };
  let on = true; try { on = localStorage.getItem('dd-voice') !== '0'; } catch (e) {}
  // Three kinds of moment. MUST: the beats that always land (a boss arriving or falling, the clear, the menu and results lines);
  // they wait out a line still playing. PLACED: lines written for something that just happened in this stage (its opening,
  // a scripted story beat, a set-piece banner, a boss phase, the first sight of a fandom, the tape, the blue card, the last
  // kernel); they skip the quiet gap, wait out a line still playing, and each speaks once a run. REACTIVE: things the player
  // does that can happen again and again (a hit, a pit, a checkpoint, switching Dots, standing idle); they speak up to REPEAT times a run,
  // only after GAP seconds of quiet, and never spend a line a placed spot is waiting for. BUDGET caps a stage's lines.
  const BUDGET = 24, GAP = 5, PAD = 2.5, MUST = { boss_intro: 1, boss_defeat: 1, clear: 1, perfect: 1, rating: 1, six: 1, world: 1, title: 1 };
  ['sam', 'mel', 'cloud', 'baxter'].forEach(d => { MUST['join_' + d] = 1; });   // a Dot joining always gets its intro
  const PLACED = /^(level_start|beat:|banner:|line:|boss_phase|fan_|brawl|vhs|fact_|allpop)/;
  const SKIPBEAT = /^(start|goal|checkpoint|boss|bossDefeat|bossPhase\d*)$/;   // beats that already have their own moment
  const TAUNTS = 3;
  const REPEAT = { hurt: 3, death: 3, checkpoint: 3, idle: 3, boss_hit: 5, aside: 99 };   // reactions that can speak again in a stage (each time the next take)   // boss_taunt: the boss gloats when it hits you, twice a fight at most
  const now = () => performance.now() / 1000;
  const ASIDE = [18, 30], ASIDE_FIRST = 12, BOSS_QUIET = 35;   // seconds of quiet before the hosts chime in: a random wait in this range, and never in a stage's first seconds
  let PLAYS = {}; try { PLAYS = JSON.parse(localStorage.getItem('dd-voice-plays') || '{}') || {}; } catch (e) {}
  let RECENT = []; try { RECENT = JSON.parse(localStorage.getItem('dd-voice-recent') || '[]') || []; } catch (e) {}
  const FRESH = 60;   // a reaction or an aside never repeats a clip from the last FRESH lines heard: quiet beats a rehash
  let saveT = 0; const savePlays = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('dd-voice-plays', JSON.stringify(PLAYS)); localStorage.setItem('dd-voice-recent', JSON.stringify(RECENT)); } catch (e) {} }, 500); };
  let cur = null, curKey = null, curEnd = 0, endAt = -99, lastAt = -99, asideWait = 24, stageAt = 0, levelId = null, spots = [], titled = false, still = { x: 0, y: 0, t: 0 };
  let run = { spoken: 0, said: {}, heard: {}, damage: 0, taunts: 0 }, pending = null;

  const level = () => { const D = window.DD, L = window.LEVEL; return D && !D.inMenu && L ? L : null; };
  const ids = l => (l || []).filter(id => BY[id]);
  function next(key, list, again) {   // the take this computer has heard least (ties: list order), skipping any already said this stage
    const l = ids(list); if (!l.length) return null;
    const fresh = l.filter(id => !run.heard[id] && (again || !RECENT.includes(id))), from = fresh.length ? fresh : (again ? l : []);
    let best = null; for (const id of from) if (!best || (PLAYS[id] || 0) < (PLAYS[best] || 0)) best = id;
    return best ? BY[best] : null;
  }
  const both = (a, b) => (a || []).concat((b || []).filter(x => !(a || []).includes(x)));   // a stage's own takes, then its world's
  function play(c) {
    try {
      if (cur) cur.pause();
      const a = new Audio('voice/' + c.f); a.volume = 0.95 * (window.DDVol ? window.DDVol.get('voice') : 1); a.play().catch(() => {});
      cur = a; endAt = now() + c.d; curEnd = endAt + PAD;   // a breath after each line, so a waiting line never butts straight into it
      lastAt = now(); a.onended = () => { if (cur === a) cur = null; };
      PLAYS[c.id] = (PLAYS[c.id] || 0) + 1; RECENT = RECENT.filter(i => i !== c.id).concat(c.id).slice(-FRESH); savePlays(); asideWait = ASIDE[0] + Math.random() * (ASIDE[1] - ASIDE[0]);
      const M = window.DDMusic; if (M && M.duck) M.duck(c.d + 0.15);
      if (LOG) console.log('[voice]', c.id, c.line);
    } catch (e) { return false; }
    return true;
  }
  function cueFor(moment, o) {
    const L = level(), lc = L && CUES.levels[L.id] || {}, wc = CUES.worlds[(o && o.world) || (L && L.world)] || {};
    if (moment === 'rating') {   // the card's rating, in this world's era if it has a take, else any take of that rating
      const r = o.bonus ? ['5b', 5] : [o.bags], all = Object.values(BY).filter(c => c.r != null), w = L && L.world;
      for (const v of r) {   // the least-heard take of that rating; this world's era wins a tie, so it leads without repeating
        const p = all.filter(c => c.r === v).sort((a, b) => ((PLAYS[a.id] || 0) * 2 + (a.w === w ? 0 : 1)) - ((PLAYS[b.id] || 0) * 2 + (b.w === w ? 0 : 1)));
        if (p.length) return p[0];
      }
      return null;
    }
    if (moment === 'six') return next('six', wc.six || CUES.six, 1);
    if (moment === 'world') return next('world' + o.world, wc.pick, 1);
    if (moment === 'title') return next('title', CUES.title, 1);
    if (moment.startsWith('line:')) return next(moment, (CUES.lines || {})[moment.slice(5)], 1);   // a narrator line read out by the show clip that says it
    if (PLACED.test(moment) || MUST[moment]) return next(moment, lc[moment] || wc[moment] || (CUES.any || {})[moment], 1);   // the level's own cue, else the world's, else the game-wide one
    if (moment === 'aside' || moment === 'idle') {   // chatter and standing around share one pool, so the idle lines get heard by players who never stand still
      const mine = moment === 'aside' ? both(both(lc.aside, wc.aside), both(lc.idle, wc.idle)) : both(both(lc.idle, wc.idle), both(lc.aside, wc.aside));
      const me = +((o && o.world) || (L && L.world)) || 1;
      for (const w of Object.keys(CUES.worlds).sort((a, b) => Math.abs(a - me) - Math.abs(b - me) || a - b)) {   // own era first, then the nearest eras: a level never goes quiet while any world has a fresh line
        const c = next(moment, +w === me ? mine : both((CUES.worlds[w] || {}).aside, (CUES.worlds[w] || {}).idle)); if (c) return c;
      }
      return next(moment, both((CUES.any || {}).aside, (CUES.any || {}).idle));
    }
    return next(moment, both(lc[moment], wc[moment])) || next(moment, (CUES.any || {})[moment]);   // a reaction draws on the stage's and the world's takes together; the game-wide ones only when those are spent
  }
  function spotsAhead() { return spots.filter(s => !s.done && BY[s.id]).length; }
  function keyOf(moment, o) {   // the cue key: banner:<TEXT>, beat:<name>, boss_phase<N>, dot_<dot>, or the moment itself
    if (moment === 'banner' || moment === 'beat') return o.k ? moment + ':' + o.k : null;
    if (moment === 'line') return o.k ? 'line:' + String(o.k).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim() : null;
    if (moment === 'boss_phase') return 'boss_phase' + o.ph;
    if (moment === 'dot') return 'dot_' + o.dot;
    if (moment === 'join') return 'join_' + o.dot;   // a Dot joining the cast on the results card introduces itself
    return moment;
  }
  function allowed(key) {   // the pacing rules
    if (MUST[key]) return true;
    if (key === 'boss_taunt') { if (run.taunts >= TAUNTS) return false; }
    else if ((run.said[key] || 0) >= (REPEAT[key] || 1)) return false;
    if (BUDGET - run.spoken <= 0) return false;
    if (PLACED.test(key)) return true;
    if (now() - endAt < GAP || now() < curEnd) return false;   // a reaction waits GAP seconds after the last line ENDS
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
    // world-wide and game-wide reactions used to speak once a SESSION, which is why the game went quiet after a few stages;
    // now every stage can use them, and next() walks their takes in order so the same line doesn't open every stage
    if (now() < curEnd && pending && !MUST[key]) return false;   // one line waits at a time (a must-land beat takes the slot)
    const c = cueFor(key, o); if (!c) return false;
    if (run.heard[c.id]) return false;   // never the same clip twice in a stage: a reaction speaks again only with another take
    run.heard[c.id] = 1;
    run.said[key] = (run.said[key] || 0) + 1; if (key === 'boss_taunt') run.taunts++;
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
      levelId = L.id; run = { spoken: 0, said: {}, heard: {}, damage: 0, taunts: 0 }; G.__voRun = run; stageAt = now();
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
    // standing still for 8 s in open play: the hosts notice (REPEAT.idle times a run)
    const dl = D.dialog, fight = !!(G.boss && G.boss.engaged), busy = G.state !== 'play' || G.done || G.fall || (dl && (dl.cur || dl.q.length));
    if (busy || fight || Math.abs(G.pl.x - still.x) > 2 || Math.abs(G.pl.y - still.y) > 2) still = { x: G.pl.x, y: G.pl.y, t: now() };
    else if (now() - still.t > 8) { still.t = now(); say('idle'); }
    // a stretch of quiet in open play: the hosts chime in from this stage's and world's asides (never over dialogue; in a boss
    // fight only after BOSS_QUIET seconds, so its own hits and gloats keep the floor)
    if (!busy && !cur && !pending && now() - stageAt > ASIDE_FIRST && now() - endAt > (fight ? Math.max(asideWait, BOSS_QUIET) : asideWait)) { if (!say('aside')) asideWait += 6; }
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
  function clip(id) {   // a cutscene's line: that clip now, whatever the stage's pacing; its length in seconds, or 0 when it can't play (voices off, or a clip that failed QA)
    const c = BY[id]; if (!on || !c) return 0;
    return play(c) ? c.d : 0;
  }
  // the menus: the store, the casino, the prize counter, the pause screen. Each moment has its own cooldown (seconds), so
  // browsing never nags; a line never talks over another, and the least-heard take that isn't fresh in memory goes first
  const MENU = { store_open: 40, store_buy: 15, store_poor: 45, wear_buy: 15, casino_open: 60, casino_win: 30, pause: 45 }, menuAt = {};
  function menu(key) {
    if (!on || !MENU[key] || now() < curEnd || now() - (menuAt[key] ?? -999) < MENU[key]) return false;
    const l = (CUES.any || {})[key], c = next(key, l) || next(key, l, 1); if (!c) return false;
    menuAt[key] = now(); curKey = key; return play(c);
  }
  function hush() { if (cur) { cur.pause(); cur = null; } }   // a skipped cutscene stops its line
  const line = id => BY[id] ? BY[id].line : null;   // a clip's words, for its caption
  window.DDVoice = { say, menu, preview, clip, hush, line, get on() { return on; }, set on(v) { on = !!v; }, get run() { return run; } };
})();
