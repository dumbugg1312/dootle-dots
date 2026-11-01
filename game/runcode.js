// RUN CODE: the 13-letter code printed on a speedrun's RUN CARD, so a time in a screenshot can be checked against the code beside it
// (check.html). It packs the category, the date and the time to the frame, plus a hash of all three. It stops a typed-over or
// photo-edited time, nothing more: the game runs in the browser, so a code is not proof of a run. Video is (see design/SPEEDRUN-COM.md).
// 64 bits: version 2, category 1, day 14 (days from 2026-01-01), frames 24, hash 23. Crockford base32, read as XXXX-XXXX-XXXXX.
(function () {
  const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', CATS = ['any', 'full'], DAY0 = Date.UTC(2026, 0, 1), V = 0;
  const hash = (v, c, d, f) => { let h = 2166136261; for (const ch of 'dootle-dots-run|' + v + '|' + c + '|' + d + '|' + f) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) & 0x7fffff; };
  const dayOf = iso => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - DAY0) / 864e5);
  const isoOf = d => new Date(DAY0 + d * 864e5).toISOString().slice(0, 10);

  function make(cat, frames, iso) {   // iso: YYYY-MM-DD, the player's own date
    const c = Math.max(0, CATS.indexOf(cat)), d = Math.max(0, Math.min(16383, dayOf(iso))), f = Math.max(0, Math.min(0xffffff, Math.round(frames)));
    let n = (BigInt(V) << 62n) | (BigInt(c) << 61n) | (BigInt(d) << 47n) | (BigInt(f) << 23n) | BigInt(hash(V, c, d, f)), s = '';
    for (let i = 0; i < 13; i++) { s = A[Number(n & 31n)] + s; n >>= 5n; }   // 65 bits of room, the top one always 0
    return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
  }
  function read(code) {   // null if it isn't a code the game made
    const s = String(code).toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (!/^[0-9A-HJKMNP-TV-Z]{13}$/.test(s)) return null;
    let n = 0n; for (const ch of s) n = (n << 5n) | BigInt(A.indexOf(ch));
    const v = Number((n >> 62n) & 3n), c = Number((n >> 61n) & 1n), d = Number((n >> 47n) & 16383n), f = Number((n >> 23n) & 0xffffffn), h = Number(n & 0x7fffffn);
    if (n >> 64n || v !== V || h !== hash(v, c, d, f)) return null;
    return { cat: CATS[c], frames: f, date: isoOf(d) };
  }
  window.DDRunCode = { make, read };
})();
