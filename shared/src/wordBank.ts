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
    ],
  },
  {
    id: 'emotions',
    name: 'Emotions',
    description: 'Feeling states',
    pairs: [
      ['JOY', 'GRIEF'],
      ['CALM', 'PANIC'],
      ['PRIDE', 'SHAME'],
      ['TRUST', 'DOUBT'],
      ['HOPE', 'DREAD'],
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
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Elemental shifts',
    pairs: [
      ['TIDE', 'SHORE'],
      ['FROST', 'THAW'],
      ['EMBER', 'ASH'],
      ['BLOOM', 'WITHER'],
      ['STORM', 'STILL'],
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
    ],
  },
] as const;

export type WordSetId = (typeof WORD_SETS)[number]['id'];

export const DEFAULT_WORD_SET_ID: WordSetId = 'classic';

export const WORD_PAIRS = WORD_SETS[0].pairs;

export function getWordSet(wordSetId: string | null | undefined = DEFAULT_WORD_SET_ID) {
  return WORD_SETS.find((set) => set.id === wordSetId) ?? WORD_SETS[0];
}

export function getAllWords(wordSetId?: string | null): string[] {
  return getWordSet(wordSetId).pairs.flatMap(([a, b]) => [a, b]);
}

export function getInitialActiveWords(wordSetId?: string | null): [string, string] {
  const pairs = getWordSet(wordSetId).pairs;
  return [pairs[0][0], pairs[0][1]];
}

export function getInitialUnusedWords(wordSetId?: string | null): string[] {
  const [first, second] = getInitialActiveWords(wordSetId);
  return getAllWords(wordSetId).filter((word) => word !== first && word !== second);
}
