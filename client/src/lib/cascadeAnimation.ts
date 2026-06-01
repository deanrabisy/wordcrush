import type { CellCoord } from '@word-crush-duel/shared';

export type FallOffset = { row: number; col: number; dy: number };

/** How far each letter falls (in cell heights) after found cells are removed. */
export function computeFallOffsets(afterRemove: string[][]): FallOffset[] {
  const size = afterRemove.length;
  const offsets: FallOffset[] = [];

  for (let col = 0; col < size; col++) {
    const letters: { row: number; letter: string }[] = [];
    for (let row = 0; row < size; row++) {
      if (afterRemove[row][col]) letters.push({ row, letter: afterRemove[row][col] });
    }

    for (let i = 0; i < letters.length; i++) {
      const targetRow = size - letters.length + i;
      const dy = targetRow - letters[i].row;
      if (dy > 0) offsets.push({ row: targetRow, col, dy });
    }
  }

  return offsets;
}

/** Cells that received a brand-new letter during refill (spawn from above). */
export function computeSpawnCells(
  afterGravity: string[][],
  afterRefill: string[][],
): CellCoord[] {
  const spawns: CellCoord[] = [];
  for (let row = 0; row < afterGravity.length; row++) {
    for (let col = 0; col < afterGravity[row].length; col++) {
      if (!afterGravity[row][col] && afterRefill[row][col]) {
        spawns.push({ row, col });
      }
    }
  }
  return spawns;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function pathKeySet(path: CellCoord[]): Set<string> {
  return new Set(path.map(({ row, col }) => cellKey(row, col)));
}

/** Particles for explode burst — stable per cell from seed. */
export function buildParticles(
  count: number,
  seed: number,
): { x: number; y: number; delay: number; hue: number }[] {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const t = seed + i * 17;
    const angle = ((t * 47) % 360) * (Math.PI / 180);
    const dist = 18 + (t % 22);
    particles.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      delay: (i % 4) * 25,
      hue: 35 + (t % 280),
    });
  }
  return particles;
}
