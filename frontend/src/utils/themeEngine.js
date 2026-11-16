/**
 * Theme Detection & Semantic Clustering Engine for WatchWise
 *
 * Categorizes movies and TV shows into granular narrative themes (e.g., Zombie Apocalypse,
 * Haunted House / Supernatural, Espionage & Spy Thriller, Heist & Con) rather than broad genres,
 * enabling laser-focused recommendations that distinguish between subgenres sharing the same genre.
 */

// Well-defined thematic archetypes across cinema & television
export const THEME_DEFINITIONS = [
  // 1. Horror & Thriller Themes
  {
    id: 'zombie',
    label: 'Zombie & Infection',
    sectionTitle: 'More Zombie & Infection Movies',
    tvSectionTitle: 'More Zombie & Infection Series',
    defaultKeywordIds: '12377|50009|188973',
    patterns: [
      'zombie', 'undead', 'infection', 'virus', 'pandemic', 'apocalypse',
      'flesh eater', 'living dead', 'biohazard', 'quarantine', 'outbreak'
    ],
    priority: 10
  },
  {
    id: 'supernatural',
    label: 'Supernatural & Haunted',
    sectionTitle: 'More Supernatural & Haunted Movies',
    tvSectionTitle: 'More Supernatural & Haunted Series',
    defaultKeywordIds: '3358|9712|2626|162846|241827',
    patterns: [
      'haunted house', 'ghost', 'possession', 'exorcism', 'demon', 'demonic',
      'paranormal', 'spirit', 'poltergeist', 'witchcraft', 'curse', 'occult',
      'evil spirit', 'haunting', 'seance', 'paranormal investigation', 'demonology'
    ],
    priority: 10
  },
  {
    id: 'slasher',
    label: 'Slasher & Serial Killer',
    sectionTitle: 'More Slasher & Serial Killer Movies',
    tvSectionTitle: 'More Slasher & Serial Killer Series',
    defaultKeywordIds: '12339|9713|2618',
    patterns: [
      'slasher', 'serial killer', 'masked killer', 'chainsaw', 'psychopath',
      'massacre', 'gory', 'body count', 'splatter', 'camp slasher'
    ],
    priority: 9
  },
  {
    id: 'creature',
    label: 'Creature Feature & Monster',
    sectionTitle: 'More Creature Feature & Monster Movies',
    tvSectionTitle: 'More Creature & Monster Series',
    defaultKeywordIds: '9951|3133|1299|9714',
    patterns: [
      'creature', 'giant monster', 'kaiju', 'vampire', 'werewolf', 'shark attack',
      'dinosaur', 'loch ness', 'mutant beast', 'cryptid', 'predator'
    ],
    priority: 8
  },
  {
    id: 'psychological',
    label: 'Psychological Thriller',
    sectionTitle: 'More Psychological Thrillers',
    tvSectionTitle: 'More Psychological Thrillers',
    defaultKeywordIds: '12565|10714|3684',
    patterns: [
      'psychological thriller', 'paranoia', 'hallucination', 'amnesia',
      'split personality', 'unreliable narrator', 'mind game', 'manipulation', 'gaslighting'
    ],
    priority: 7
  },

  // 2. Action & Crime Themes
  {
    id: 'spy',
    label: 'Espionage & Spy Thriller',
    sectionTitle: 'More Espionage & Spy Thrillers',
    tvSectionTitle: 'More Espionage & Spy Series',
    defaultKeywordIds: '470|9663|14544',
    patterns: [
      'spy', 'secret agent', 'espionage', 'mi6', 'cia', 'covert ops',
      'assassin', 'kgb', 'undercover agent', 'secret service', 'foreign intelligence'
    ],
    priority: 10
  },
  {
    id: 'heist',
    label: 'Heist & Con',
    sectionTitle: 'More Heist & Con Movies',
    tvSectionTitle: 'More Heist & Con Series',
    defaultKeywordIds: '10051|10453|9728',
    patterns: [
      'heist', 'bank robbery', 'con artist', 'caper', 'pickpocket', 'thief',
      'robbery', 'diamond heist', 'gold heist', 'art theft', 'inside man', 'masterplan'
    ],
    priority: 10
  },
  {
    id: 'martial_arts',
    label: 'Martial Arts & Hand-to-Hand',
    sectionTitle: 'More Martial Arts & Combat Movies',
    tvSectionTitle: 'More Martial Arts Series',
    defaultKeywordIds: '779|163076',
    patterns: [
      'martial arts', 'kung fu', 'hand to hand combat', 'sword fight',
      'samurai', 'ninja', 'karate', 'boxing', 'mma', 'wuxia'
    ],
    priority: 8
  },
  {
    id: 'mafia',
    label: 'Mafia & Organized Crime',
    sectionTitle: 'More Mafia & Crime Movies',
    tvSectionTitle: 'More Mafia & Crime Series',
    defaultKeywordIds: '242|10084|14760',
    patterns: [
      'mafia', 'gangster', 'cartel', 'organized crime', 'yakuza', 'drug cartel',
      'mobster', 'underworld', 'corrupt cop', 'gang war'
    ],
    priority: 8
  },

  // 3. Sci-Fi & Fantasy Themes
  {
    id: 'space',
    label: 'Space Exploration & Alien Invasion',
    sectionTitle: 'More Space & Sci-Fi Movies',
    tvSectionTitle: 'More Space & Sci-Fi Series',
    defaultKeywordIds: '9882|9951|161176',
    patterns: [
      'space travel', 'spacecraft', 'astronaut', 'space station', 'extraterrestrial',
      'alien invasion', 'deep space', 'galaxy', 'intergalactic', 'spaceship', 'first contact'
    ],
    priority: 9
  },
  {
    id: 'time_travel',
    label: 'Time Travel & Multiverse',
    sectionTitle: 'More Time Travel & Multiverse Movies',
    tvSectionTitle: 'More Time Travel & Multiverse Series',
    defaultKeywordIds: '4379|1930',
    patterns: [
      'time travel', 'time loop', 'multiverse', 'alternate timeline',
      'parallel world', 'temporal', 'wormhole', 'time paradox'
    ],
    priority: 9
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk & Artificial Intelligence',
    sectionTitle: 'More Cyberpunk & AI Movies',
    tvSectionTitle: 'More Cyberpunk & AI Series',
    defaultKeywordIds: '282|4565|1453',
    patterns: [
      'cyberpunk', 'artificial intelligence', 'android', 'cyborg',
      'virtual reality', 'robot', 'hacker', 'matrix', 'transhumanism', 'simulation'
    ],
    priority: 8
  },
  {
    id: 'dystopia',
    label: 'Dystopian & Post-Apocalyptic',
    sectionTitle: 'More Dystopian & Post-Apocalyptic Movies',
    tvSectionTitle: 'More Dystopian Series',
    defaultKeywordIds: '4565|2853',
    patterns: [
      'dystopia', 'post-apocalyptic', 'nuclear war', 'wasteland', 'survival horror',
      'collapse of society', 'totalitarian', 'apocalypse'
    ],
    priority: 7
  },
  {
    id: 'superhero',
    label: 'Superhero & Vigilante',
    sectionTitle: 'More Superhero & Vigilante Movies',
    tvSectionTitle: 'More Superhero & Vigilante Series',
    defaultKeywordIds: '9715|9717',
    patterns: [
      'superhero', 'vigilante', 'comic book', 'super power', 'mutant',
      'masked hero', 'anti hero', 'marvel', 'dc comics'
    ],
    priority: 9
  },

  // 4. Adventure & Drama Themes
  {
    id: 'survival',
    label: 'Wilderness & Survival',
    sectionTitle: 'More Survival & Wilderness Movies',
    tvSectionTitle: 'More Survival Series',
    defaultKeywordIds: '50009|10349|11687',
    patterns: [
      'wilderness survival', 'shipwreck', 'marooned', 'extreme weather',
      'avalanche', 'plane crash', 'desert island', 'hypothermia', 'stranded'
    ],
    priority: 7
  }
];

// Noise keywords that do not represent core plot themes
const NOISE_KEYWORDS = new Set([
  'aftercreditsstinger', 'duringcreditsstinger', 'sequel', 'prequel', 'remake',
  'woman director', 'based on novel or book', 'based on true story', 'independent film',
  'standalone sequel', '1970s', '1980s', '1990s', '2000s', '1960s', '1950s', '1940s',
  'flashback', 'death', 'murder', 'blood', 'violence', 'tragedy', 'friendship',
  'husband wife relationship', 'father son relationship', 'mother daughter relationship',
  'brother sister relationship', 'male protagonist', 'female protagonist', 'family relationship',
  'loss of loved one', 'investigation', 'police', 'small town', 'secret'
]);

/**
 * Detects the dominant thematic archetype and relevant keyword IDs
 * from TMDB movie or TV show keywords.
 */
export function detectThemeFromKeywords(rawKeywords = [], isTv = false) {
  if (!Array.isArray(rawKeywords) || rawKeywords.length === 0) {
    return {
      themeLabel: null,
      sectionTitle: isTv ? 'Similar Shows' : 'Similar Movies',
      themeKeywordIds: [],
      matchedThemeId: null,
      themeKeywordsList: []
    };
  }

  // Filter out noisy tags
  const cleanKeywords = rawKeywords.filter(k => 
    k?.name && !NOISE_KEYWORDS.has(k.name.toLowerCase().trim())
  );

  let bestTheme = null;
  let bestMatchScore = -1;
  const bestThemeKeywordIds = [];

  for (const theme of THEME_DEFINITIONS) {
    const matchedKws = cleanKeywords.filter(k => {
      const name = k.name.toLowerCase();
      return theme.patterns.some(pattern => name.includes(pattern));
    });

    if (matchedKws.length > 0) {
      const score = (matchedKws.length * 10) + theme.priority;
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestTheme = theme;
        bestThemeKeywordIds.length = 0;
        matchedKws.forEach(k => bestThemeKeywordIds.push(k.id));
      }
    }
  }

  if (bestTheme) {
    return {
      themeLabel: bestTheme.label,
      sectionTitle: isTv ? bestTheme.tvSectionTitle : bestTheme.sectionTitle,
      themeKeywordIds: bestThemeKeywordIds,
      matchedThemeId: bestTheme.id,
      themeKeywordsList: cleanKeywords
        .filter(k => bestThemeKeywordIds.includes(k.id))
        .map(k => k.name)
    };
  }

  // Fallback: If no predefined theme pattern matched, take the top 2-3 clean keywords
  const fallbackKws = cleanKeywords.slice(0, 3);
  return {
    themeLabel: null,
    sectionTitle: isTv ? 'Similar Shows' : 'Similar Movies',
    themeKeywordIds: fallbackKws.map(k => k.id),
    matchedThemeId: null,
    themeKeywordsList: fallbackKws.map(k => k.name)
  };
}

/**
 * Detects theme from an item's title, overview, and synopsis text.
 */
export function getItemTheme(item) {
  if (!item) return null;
  const text = `${item.title || item.name || item.title_english || ''} ${item.overview || item.synopsis || ''}`.toLowerCase();
  
  for (const theme of THEME_DEFINITIONS) {
    if (theme.patterns.some(pattern => text.includes(pattern))) {
      return theme.id;
    }
  }
  return null;
}

/**
 * Determines whether a title is a Hollywood / US English production.
 */
export function isHollywoodMedia(media) {
  if (!media) return false;
  const isEnglish = media.original_language === 'en';
  const hasUS = media.origin_country?.includes('US') ||
    media.production_countries?.some(c => c.iso_3166_1 === 'US');
  return isEnglish && (hasUS || !media.production_countries || media.production_countries.length === 0);
}

/**
 * Extracts the 4-digit release / air year from a media item.
 */
export function getMediaYear(item) {
  if (!item) return 2000;
  const rawDate = item.release_date || item.first_air_date || (item.aired?.prop?.from?.year?.toString());
  if (!rawDate) return 2000;
  const parsed = parseInt(String(rawDate).split('-')[0], 10);
  return isNaN(parsed) ? 2000 : parsed;
}

/**
 * Unified Quality & Relevance Scoring Formula
 * 
 * Enforces:
 * 1. Popularity weighting (rewarding established/trending content)
 * 2. Rating & confidence weighting (vote average scaled by vote count)
 * 3. Thematic alignment bonus if matching a targeted theme
 * 4. Hollywood / Regional origin alignment (prioritizes Hollywood movies for Hollywood titles)
 * 
 * (Note: Post-2000 sorting is enforced structurally as a mandatory partition rather than a score bias)
 * 
 * @param {Object} item 
 * @param {string|null} targetThemeId 
 * @param {string|null} targetLanguage
 * @param {boolean} isTargetHollywood
 * @returns {number}
 */
export function calculateQualityScore(item, targetThemeId = null, targetLanguage = null, isTargetHollywood = false) {
  if (!item) return 0;

  // 1. Popularity Score (0 - 100): Log-scaled
  const popularity = Number(item.popularity) || (Number(item.score) * 10) || 0;
  const popScore = Math.min(100, Math.log10(popularity + 1) * 55);

  // 2. Rating Score (0 - 100, weighted by vote count confidence)
  const rating = Number(item.vote_average || item.score) || 0;
  const voteCount = Number(item.vote_count || item.scored_by) || 0;
  const voteConfidence = Math.min(1, voteCount / 350);
  const ratingScore = (rating * 10) * (0.6 + 0.4 * voteConfidence);

  // Balanced base quality score (50% popularity, 50% rating)
  const baseScore = (popScore * 0.50) + (ratingScore * 0.50);

  // 3. Thematic alignment bonus
  let themeBonus = 0;
  if (targetThemeId) {
    const itemTheme = getItemTheme(item);
    if (itemTheme === targetThemeId) {
      themeBonus = 40; // Significant boost for matching theme
    }
  }

  // 4. Hollywood / Regional Alignment
  let originScore = 0;
  if (isTargetHollywood) {
    if (item.original_language === 'en') {
      originScore = 50; // Priority for Hollywood / English releases
    } else {
      originScore = -150; // Heavy penalty: Hollywood movies strictly dominate
    }
  } else if (targetLanguage) {
    if (item.original_language === targetLanguage) {
      originScore = 30; // Priority for same origin language
    }
  }

  return baseScore + themeBonus + originScore;
}

/**
 * Mandatory partition rule:
 * Post-2000 (>= 2000) movies MUST appear first.
 * Pre-2000 (< 2000) movies appear ONLY after all post-2000 movies are exhausted.
 */
export function partitionAndSortByYear(items, targetThemeId = null, targetLanguage = null, isTargetHollywood = false) {
  const post2000 = [];
  const pre2000 = [];

  for (const item of items) {
    if (getMediaYear(item) >= 2000) {
      post2000.push(item);
    } else {
      pre2000.push(item);
    }
  }

  const scoreFn = (a) => calculateQualityScore(a, targetThemeId, targetLanguage, isTargetHollywood);

  post2000.sort((a, b) => scoreFn(b) - scoreFn(a));
  pre2000.sort((a, b) => scoreFn(b) - scoreFn(a));

  return {
    post2000,
    pre2000,
    combined: [...post2000, ...pre2000]
  };
}
