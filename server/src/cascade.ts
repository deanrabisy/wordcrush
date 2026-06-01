import type { CascadeSteps, CellCoord } from '@word-crush-duel/shared';
import { generateGrid, randomLetter } from './gridGenerator.js';

function cloneGrid(grid: string[][]): string[][] {
  return grid.map((row) => [...row]);
}

function applyGravity(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0].length;

  for (let col = 0; col < cols; col++) {
    let writeRow = rows - 1;
    for (let row = rows - 1; row >= 0; row--) {
      if (grid[row][col]) {
        grid[writeRow][col] = grid[row][col];
        if (writeRow !== row) grid[row][col] = '';
        writeRow--;
      }
    }
    for (let row = writeRow; row >= 0; row--) {
      grid[row][col] = '';
    }
  }
}

function refillGrid(grid: string[][]): void {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) grid[row][col] = randomLetter();
    }
  }
}

export type CascadeResult = CascadeSteps;

export function cascadeAfterFind(
  grid: string[][],
  foundPath: CellCoord[],
  foundWord: string,
  nextActiveWords: [string, string] | null,
): CascadeResult {
  const fromGrid = cloneGrid(grid);
  const afterRemove = cloneGrid(grid);

  for (const { row, col } of foundPath) {
    afterRemove[row][col] = '';
  }

  const afterGravity = cloneGrid(afterRemove);
  applyGravity(afterGravity);

  const afterRefill = cloneGrid(afterGravity);
  refillGrid(afterRefill);

  const finalGrid = nextActiveWords ? generateGrid(nextActiveWords) : afterRefill;

  return {
    fromGrid,
    afterRemove,
    afterGravity,
    afterRefill,
    finalGrid,
    foundPath,
    foundWord,
  };
}

export function regenerateGrid(activeWords: [string, string]): string[][] {
  return generateGrid(activeWords);
}
