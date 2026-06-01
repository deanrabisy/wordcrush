import { FORWARD_DIRECTIONS, GRID_SIZE } from '@word-crush-duel/shared';

const VOWELS = 'AEIOU';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';

function randomLetter(): string {
  const useVowel = Math.random() < 0.4;
  const pool = useVowel ? VOWELS : CONSONANTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
  size: number,
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = grid[r][c];
    if (existing && existing !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): void {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

function tryPlaceWord(
  grid: string[][],
  word: string,
  size: number,
): { word: string; cells: { row: number; col: number }[] } | null {
  const positions: { row: number; col: number; dr: number; dc: number }[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dr, dc] of FORWARD_DIRECTIONS) {
        if (canPlace(grid, word, row, col, dr, dc, size)) {
          positions.push({ row, col, dr, dc });
        }
      }
    }
  }
  if (positions.length === 0) return null;

  const pick = positions[Math.floor(Math.random() * positions.length)];
  placeWord(grid, word, pick.row, pick.col, pick.dr, pick.dc);
  const cells = Array.from({ length: word.length }, (_, i) => ({
    row: pick.row + pick.dr * i,
    col: pick.col + pick.dc * i,
  }));
  return { word, cells };
}

function fillRandom(grid: string[][], size: number): void {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) grid[row][col] = randomLetter();
    }
  }
}

export function generateGrid(
  words: [string, string] | string[],
  size = GRID_SIZE,
): string[][] {
  const uniqueWords = [...new Set(Array.isArray(words) ? words : words)];
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array.from({ length: size }, () => Array<string>(size).fill(''));
    const orderedWords = shuffle(uniqueWords);
    let success = true;

    for (const word of orderedWords) {
      if (!tryPlaceWord(grid, word, size)) {
        success = false;
        break;
      }
    }

    if (success) {
      fillRandom(grid, size);
      return grid;
    }
  }

  throw new Error(`Failed to generate grid for words: ${words.join(', ')}`);
}

export function findWordInGrid(
  grid: string[][],
  word: string,
): { row: number; col: number }[] | null {
  const size = grid.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dr, dc] of FORWARD_DIRECTIONS) {
        const cells: { row: number; col: number }[] = [];
        let matched = true;
        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= size || c < 0 || c >= size || grid[r][c] !== word[i]) {
            matched = false;
            break;
          }
          cells.push({ row: r, col: c });
        }
        if (matched) return cells;
      }
    }
  }
  return null;
}

export { randomLetter, FORWARD_DIRECTIONS as DIRECTIONS };
