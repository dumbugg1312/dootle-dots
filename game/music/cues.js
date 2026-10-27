// Which track plays where. Track names are music/source/<name>, built by music/build.sh into game/music/<name>.js.
// Each level STARTS with its own song (precedence: level[id], then boss[world] on boss levels, then world[world], then title).
// After that the music moves through one shared rotation of every track, so nobody has to reach World 9 to hear a song:
// it changes only on an event (a checkpoint lit, a boss fight starting or changing phase), at most twice a level.
window.CUES = {
  title: 'theme',                                   // the On Cinema theme: title, world select, and any world without its own track
  world: {
    4: 'dekkar-empty-bottle',                       // VFA & Dekkar
    5: 'dkr-mt-botl-2',                             // Six Bags (S9): DKR's MT BOTL 2.0, the version after the fire
    6: 'axiom-qui-con-me',                          // the Trial: Axiom sang Qui Con Me during it
    7: 'dekkar-mt-botl-3q',                         // OCX
    8: 'dekkar-judas-to-me',                        // HEI Network: Judas to Me, "Live at the HEI Ranch" (Oscar 9)
    9: 'dekkar-ride-with-the-devil',                // the Amato era: Dekkar re-formed without T.
    11: 'new-heidecker-daddys-gone',                // Season 16: New Heidecker's video for The Funeral of G Amato
  },
  boss: {
    2: 'dekkar-my-angel',                           // Dr. San gets his own song
    3: 'dekkar-hole-in-my-soul',                    // Abdul: Hole in My Soul, live on the set of Decker: Mindwipe
    4: 'dekkar-oscar-medley-2016',                  // Dekkar Tim, in the 2016 Oscar era
    6: 'dekkar-you-asked-for-a-hero',               // Lawyer Tim: the Decker: Unsealed hero anthem (2017)
    8: 'oscar-theme',
    9: 'dekkar-oscar-medley-2022',                  // T. Amato, Oscars 10-11
    12: 'oscar-theme',
  },
  level: {
    '3-1': 'dekkar-trigger-everything',             // written for Decker: Unclassified
    '3-2': 'dekkar-farewell-axiom',                 // Decker tracks (2016)
    '3-3': 'dekkar-decision-points',
    '12-1': 'oscar-theme',                          // the Last On Cinema Oscar Special
    '12-3': 'oscar-fever-remix',                    // the Oscar Fever stage
  },
  rotation: [   // the shared order songs move through once a level is under way (it carries on from level to level)
    'theme', 'dekkar-empty-bottle', 'dekkar-trigger-everything', 'oscar-theme', 'dkr-mt-botl-2', 'dekkar-farewell-axiom',
    'dekkar-my-angel', 'axiom-qui-con-me', 'dekkar-decision-points', 'dekkar-mt-botl-3q', 'dekkar-judas-to-me',
    'dekkar-oscar-medley-2016', 'dekkar-hole-in-my-soul', 'dekkar-ride-with-the-devil', 'dekkar-you-asked-for-a-hero',
    'dekkar-oscar-medley-2022', 'oscar-fever-remix', 'new-heidecker-daddys-gone',
  ],
  titles: {   // how the jukebox lists them
    'theme': 'ON CINEMA THEME', 'dekkar-empty-bottle': 'EMPTY BOTTLE', 'dekkar-trigger-everything': 'TRIGGER EVERYTHING',
    'oscar-theme': 'OSCAR SPECIAL THEME', 'dkr-mt-botl-2': 'MT BOTL 2.0', 'dekkar-farewell-axiom': 'FAREWELL AXIOM',
    'dekkar-my-angel': 'MY ANGEL', 'axiom-qui-con-me': 'QUI CON ME', 'dekkar-decision-points': 'DECISION POINTS',
    'dekkar-mt-botl-3q': 'MT BOTL 3Q', 'dekkar-judas-to-me': 'JUDAS TO ME', 'dekkar-oscar-medley-2016': 'OSCAR MEDLEY 2016',
    'dekkar-hole-in-my-soul': 'HOLE IN MY SOUL', 'dekkar-ride-with-the-devil': 'RIDE WITH THE DEVIL',
    'dekkar-you-asked-for-a-hero': 'YOU ASKED FOR A HERO', 'dekkar-oscar-medley-2022': 'OSCAR MEDLEY 2022', 'oscar-fever-remix': 'OSCAR FEVER REMIX',
    'new-heidecker-daddys-gone': "DADDY'S GONE",
  },
  switchesPerLevel: 2,     // at most this many song changes inside one level
  minSeconds: 40,          // and never sooner than this after the level starts or the last change
};
