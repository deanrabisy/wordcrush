export const WORD_PAIRS = [
  ['HOT', 'COLD'],
  ['BIG', 'SMALL'],
  ['FAST', 'SLOW'],
  ['LIGHT', 'DARK'],
  ['HAPPY', 'SAD'],
] as const;

export function getAllWords(): string[] {
  return WORD_PAIRS.flatMap(([a, b]) => [a, b]);
}

export function getInitialActiveWords(): [string, string] {
  return [WORD_PAIRS[0][0], WORD_PAIRS[0][1]];
}

export function getInitialUnusedWords(): string[] {
  const [first, second] = getInitialActiveWords();
  return getAllWords().filter((word) => word !== first && word !== second);
}
