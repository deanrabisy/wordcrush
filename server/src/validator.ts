import type { CellCoord } from '@word-crush-duel/shared';

export function pathToWord(grid: string[][], path: CellCoord[]): string {
  return path.map(({ row, col }) => grid[row][col]).join('');
}

export function isContiguousPath(path: CellCoord[]): boolean {
  if (path.length < 2) return path.length === 1;

  const dr = path[1].row - path[0].row;
  const dc = path[1].col - path[0].col;
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return false;

  for (let i = 1; i < path.length; i++) {
    const stepDr = path[i].row - path[i - 1].row;
    const stepDc = path[i].col - path[i - 1].col;
    if (stepDr !== dr || stepDc !== dc) return false;
  }

  const seen = new Set(path.map(({ row, col }) => `${row},${col}`));
  return seen.size === path.length;
}

/** ESL level 1: only →, ↓, and ↘ (no backwards). */
export function isForwardPath(path: CellCoord[]): boolean {
  if (path.length < 2) return true;
  const dr = path[1].row - path[0].row;
  const dc = path[1].col - path[0].col;
  return dr >= 0 && dc >= 0 && dr + dc > 0;
}

export function matchesActiveWord(selected: string, activeWords: string[]): string | null {
  for (const word of activeWords) {
    if (selected === word) return word;
  }
  return null;
}

export function validateSelection(
  grid: string[][],
  path: CellCoord[],
  claimedWord: string,
  activeWords: string[],
): { valid: true; word: string } | { valid: false; reason: string } {
  if (path.length === 0) return { valid: false, reason: 'Empty selection' };

  for (const { row, col } of path) {
    if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) {
      return { valid: false, reason: 'Selection out of bounds' };
    }
  }

  if (!isContiguousPath(path)) {
    return { valid: false, reason: 'Selection must be a straight line' };
  }

  if (!isForwardPath(path)) {
    return { valid: false, reason: 'Read left-to-right or top-down (no backwards)' };
  }

  const spelled = pathToWord(grid, path);
  const activeMatch = matchesActiveWord(spelled, activeWords);

  if (!activeMatch) {
    return { valid: false, reason: 'Word is not an active target' };
  }

  if (claimedWord !== activeMatch) {
    return { valid: false, reason: 'Claimed word does not match selection' };
  }

  if (spelled !== activeMatch) {
    return { valid: false, reason: 'Letters do not spell the target word' };
  }

  return { valid: true, word: activeMatch };
}
