export const GENRES = {
  ALTERNATIVE: [
    "indie-rock",
    "industrial",
    "shoegaze",
    "grunge",
    "goth",
    "dream-pop",
    "emo",
    "math-rock",
    "britpop",
    "jangle-pop",
  ],
  AMBIENT: [
    "chill-out",
    "drone",
    "dark-ambient",
    "electronic",
    "soundscapes",
    "field-recordings",
    "atmospheric",
    "meditation",
    "noise",
    "new-age",
  ],
  ELECTRONIC: [
    "house",
    "electronica",
    "downtempo",
    "techno",
    "electro",
    "dubstep",
    "beats",
    "dance",
    "idm",
    "drum-bass",
    "breaks",
    "breakcore",
    "vaporwave",
  ],
  EXPERIMENTAL: [
    "noise",
    "drone",
    "avant-garde",
    "experimental-rock",
    "improvisation",
    "sound-art",
    "musique-concrete",
  ],
  FOLK: [
    "singer-songwriter",
    "folk-rock",
    "indie-folk",
    "pop-folk",
    "traditional",
    "experimental-folk",
    "roots",
  ],
  "HIP-HOP": [
    "rap",
    "underground",
    "instrumental",
    "trap",
    "conscious",
    "boom-bap",
    "beat-tape",
    "hardcore",
    "grime",
  ],
  JAZZ: [
    "fusion",
    "big-band",
    "nu-jazz",
    "modern-jazz",
    "swing",
    "free-jazz",
    "soul-jazz",
    "latin-jazz",
    "vocal-jazz",
    "bebop",
    "spiritual-jazz",
  ],
  METAL: [
    "hardcore",
    "black-metal",
    "death-metal",
    "thrash-metal",
    "grindcore",
    "doom",
    "post-hardcore",
    "progressive-metal",
    "metalcore",
    "sludge",
  ],
  POP: [
    "indie-pop",
    "synth-pop",
    "power-pop",
    "new-wave",
    "dream-pop",
    "noise-pop",
    "experimental-pop",
    "electro-pop",
    "adult-contemporary",
  ],
  PUNK: [
    "hardcore",
    "garage",
    "pop-punk",
    "punk-rock",
    "post-punk",
    "post-hardcore",
    "thrash",
    "crust",
    "folk-punk",
    "emo",
    "skate",
  ],
  ROCK: [
    "indie",
    "prog",
    "post-rock",
    "rock-and-roll",
    "psychedelic",
    "hard-rock",
    "garage",
    "surf",
    "instrumental",
    "math-rock",
  ],
} as const;

export const ALL_GENRES = [...new Set(Object.values(GENRES).flat())].sort();

export type Genre = typeof ALL_GENRES[number];

// Priority-ordered lookup for theming. ELECTRONIC is first so the slug
// "electronic" (which also appears under AMBIENT) resolves to the right family.
const THEME_FAMILY_PRIORITY: Array<keyof typeof GENRES> = [
  'ELECTRONIC', 'METAL', 'PUNK', 'JAZZ', 'FOLK', 'POP',
  'ROCK', 'ALTERNATIVE', 'EXPERIMENTAL', 'AMBIENT', 'HIP-HOP',
];

export function getGenreFamily(genre: string): string | undefined {
  for (const family of THEME_FAMILY_PRIORITY) {
    if ((GENRES[family] as readonly string[]).includes(genre)) {
      return family.toLowerCase();
    }
  }
  return undefined;
}

export function isValidGenre(genre: string | null | undefined): genre is Genre {
  return genre !== null && genre !== undefined && ALL_GENRES.includes(genre as Genre);
}
