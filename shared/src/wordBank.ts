export const WORD_SETS = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Simple opposites',
    pairs: [
      ['HOT', 'COLD'],
      ['BIG', 'SMALL'],
      ['FAST', 'SLOW'],
      ['LIGHT', 'DARK'],
      ['HAPPY', 'SAD'],
      ['OPEN', 'CLOSE'],
      ['FULL', 'EMPTY'],
      ['CLEAN', 'DIRTY'],
    ],
  },
  {
    id: 'emotions',
    name: 'Feelings',
    description: 'Common feelings',
    pairs: [
      ['HAPPY', 'SAD'],
      ['CALM', 'ANGRY'],
      ['PROUD', 'SHY'],
      ['BRAVE', 'AFRAID'],
      ['TIRED', 'AWAKE'],
      ['KIND', 'MEAN'],
      ['HOPE', 'WORRY'],
      ['TRUST', 'DOUBT'],
    ],
  },
  {
    id: 'landscapes',
    name: 'Landscapes',
    description: 'Places outside',
    pairs: [
      ['HILL', 'VALLEY'],
      ['RIVER', 'LAKE'],
      ['BEACH', 'ISLAND'],
      ['FOREST', 'FIELD'],
      ['DESERT', 'OCEAN'],
      ['MOUNTAIN', 'PLAIN'],
      ['CAVE', 'CLIFF'],
      ['PATH', 'ROAD'],
    ],
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Sky and seasons',
    pairs: [
      ['RAIN', 'SUN'],
      ['WIND', 'CLOUD'],
      ['SNOW', 'ICE'],
      ['STORM', 'FOG'],
      ['HOT', 'COLD'],
      ['WARM', 'COOL'],
      ['DRY', 'WET'],
      ['THUNDER', 'LIGHT'],
    ],
  },
  {
    id: 'home',
    name: 'Home',
    description: 'Household nouns',
    pairs: [
      ['TABLE', 'CHAIR'],
      ['DOOR', 'WINDOW'],
      ['BED', 'SOFA'],
      ['FLOOR', 'WALL'],
      ['KITCHEN', 'BATH'],
      ['CUP', 'PLATE'],
      ['SPOON', 'FORK'],
      ['LAMP', 'CLOCK'],
    ],
  },
  {
    id: 'school',
    name: 'School',
    description: 'Classroom words',
    pairs: [
      ['BOOK', 'PEN'],
      ['DESK', 'BOARD'],
      ['TEACHER', 'STUDENT'],
      ['LESSON', 'TEST'],
      ['READ', 'WRITE'],
      ['LISTEN', 'SPEAK'],
      ['PAPER', 'PENCIL'],
      ['CLASS', 'BREAK'],
    ],
  },
  {
    id: 'food',
    name: 'Food',
    description: 'Everyday food',
    pairs: [
      ['BREAD', 'RICE'],
      ['APPLE', 'BANANA'],
      ['WATER', 'MILK'],
      ['SOUP', 'SALAD'],
      ['EGG', 'CHEESE'],
      ['FISH', 'MEAT'],
      ['SUGAR', 'SALT'],
      ['FRUIT', 'CAKE'],
    ],
  },
  {
    id: 'actions',
    name: 'Actions',
    description: 'Common verbs',
    pairs: [
      ['EAT', 'DRINK'],
      ['READ', 'WRITE'],
      ['OPEN', 'CLOSE'],
      ['SIT', 'STAND'],
      ['WALK', 'RUN'],
      ['GIVE', 'TAKE'],
      ['PUSH', 'PULL'],
      ['BUY', 'SELL'],
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Animals and plants',
    pairs: [
      ['TREE', 'FLOWER'],
      ['GRASS', 'LEAF'],
      ['BIRD', 'FISH'],
      ['HORSE', 'SHEEP'],
      ['CAT', 'DOG'],
      ['SEED', 'ROOT'],
      ['ROCK', 'SAND'],
      ['SKY', 'SEA'],
    ],
  },
  {
    id: 'strategy',
    name: 'Strategy',
    description: 'Duel tactics',
    pairs: [
      ['ATTACK', 'DEFEND'],
      ['RISK', 'SAFETY'],
      ['CHAOS', 'ORDER'],
      ['FOCUS', 'DISTRACT'],
      ['ADVANCE', 'RETREAT'],
      ['POWER', 'SHIELD'],
      ['WIN', 'LOSE'],
      ['TRAP', 'ESCAPE'],
    ],
  },
  {
    id: 'abstract',
    name: 'Abstract',
    description: 'Bigger ideas',
    pairs: [
      ['TRUTH', 'FICTION'],
      ['LOGIC', 'INSTINCT'],
      ['MEMORY', 'FORGET'],
      ['FREEDOM', 'CONTROL'],
      ['ORIGIN', 'ENDING'],
      ['REASON', 'DREAM'],
      ['CHANGE', 'STAY'],
      ['CHOICE', 'RULE'],
    ],
  },
  {
    id: 'crush',
    name: 'Crush',
    description: 'Arcade energy',
    pairs: [
      ['CRUSH', 'REVIVE'],
      ['SPARK', 'SHADOW'],
      ['BURST', 'SETTLE'],
      ['CLASH', 'HARMONY'],
      ['POWER', 'FRAGILE'],
      ['BOOST', 'BLOCK'],
      ['FLASH', 'FREEZE'],
      ['COMBO', 'BONUS'],
    ],
  },
] as const;

export const MATCH_WORD_COUNT_OPTIONS = [10, 11, 12, 13, 14, 15, 16] as const;
export const DEFAULT_TOTAL_WORDS = 16;

export function normalizeWordCount(wordCount: number | null | undefined): number {
  if (!wordCount) return DEFAULT_TOTAL_WORDS;
  const available = [...MATCH_WORD_COUNT_OPTIONS] as number[];
  return available.includes(wordCount) ? wordCount : DEFAULT_TOTAL_WORDS;
}

export type WordSetId = (typeof WORD_SETS)[number]['id'];

export const DEFAULT_WORD_SET_ID: WordSetId = 'classic';

export const WORD_PAIRS = WORD_SETS[0].pairs;

export function getWordSet(wordSetId: string | null | undefined = DEFAULT_WORD_SET_ID) {
  return WORD_SETS.find((set) => set.id === wordSetId) ?? WORD_SETS[0];
}

export function getAllWords(wordSetId?: string | null): string[] {
  return getWordSet(wordSetId).pairs.flatMap(([a, b]) => [a, b]);
}

export function getGameWords(wordSetId?: string | null, wordCount?: number | null): string[] {
  return getAllWords(wordSetId).slice(0, normalizeWordCount(wordCount));
}

export function getInitialActiveWords(wordSetId?: string | null, wordCount?: number | null): [string, string] {
  const words = getGameWords(wordSetId, wordCount);
  return [words[0], words[1]];
}

export function getInitialUnusedWords(wordSetId?: string | null, wordCount?: number | null): string[] {
  const [first, second] = getInitialActiveWords(wordSetId, wordCount);
  return getGameWords(wordSetId, wordCount).filter((word) => word !== first && word !== second);
}
