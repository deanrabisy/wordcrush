import type { CascadeSteps, CellCoord } from '@word-crush-duel/shared';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  buildParticles,
  cellKey,
  computeFallOffsets,
  computeSpawnCells,
  pathKeySet,
} from '../lib/cascadeAnimation';

type LetterGridProps = {
  grid: string[][];
  activeWords: [string, string];
  disabled: boolean;
  cascadeAnimating: boolean;
  cascadeSteps: CascadeSteps | null;
  onSubmit: (path: CellCoord[], word: string) => void;
};

type AnimPhase = 'idle' | 'celebrate' | 'explode' | 'fall' | 'rain' | 'reveal';

const CELL_PX = 60;
const PHASE_MS = {
  celebrate: 200,
  explode: 480,
  fall: 620,
  rain: 560,
  reveal: 540,
} as const;

function pathToWord(grid: string[][], path: CellCoord[]): string {
  return path.map(({ row, col }) => grid[row][col]).join('');
}

function isContiguous(path: CellCoord[]): boolean {
  if (path.length < 2) return path.length === 1;
  const dr = path[1].row - path[0].row;
  const dc = path[1].col - path[0].col;
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return false;
  for (let i = 1; i < path.length; i++) {
    if (path[i].row - path[i - 1].row !== dr || path[i].col - path[i - 1].col !== dc) return false;
  }
  return new Set(path.map(({ row, col }) => cellKey(row, col))).size === path.length;
}

function isForwardPath(path: CellCoord[]): boolean {
  if (path.length < 2) return true;
  const dr = path[1].row - path[0].row;
  const dc = path[1].col - path[0].col;
  return dr >= 0 && dc >= 0 && dr + dc > 0;
}

function matchActiveWord(text: string, activeWords: [string, string]): string | null {
  for (const word of activeWords) if (text === word) return word;
  return null;
}

function gridForPhase(phase: AnimPhase, steps: CascadeSteps): string[][] {
  switch (phase) {
    case 'celebrate':
    case 'explode':
      return steps.fromGrid;
    case 'fall':
      return steps.afterGravity;
    case 'rain':
      return steps.afterRefill;
    case 'reveal':
      return steps.finalGrid;
    default:
      return steps.finalGrid;
  }
}

export function LetterGrid({
  grid,
  activeWords,
  disabled,
  cascadeAnimating,
  cascadeSteps,
  onSubmit,
}: LetterGridProps) {
  const [path, setPath] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [displayGrid, setDisplayGrid] = useState(grid);
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
  const [foundLabel, setFoundLabel] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);
  const stepsRef = useRef<CascadeSteps | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    if (!cascadeAnimating || !cascadeSteps) {
      if (!cascadeAnimating) {
        setDisplayGrid(grid);
        setAnimPhase('idle');
        setFoundLabel(null);
        stepsRef.current = null;
      }
      return;
    }

    clearTimers();
    const snapshot = cascadeSteps;
    stepsRef.current = snapshot;
    setFoundLabel(snapshot.foundWord);

    const run = (phase: AnimPhase) => {
      setAnimPhase(phase);
      setDisplayGrid(gridForPhase(phase, snapshot));
    };

    run('celebrate');
    schedule(() => run('explode'), PHASE_MS.celebrate);
    schedule(() => run('fall'), PHASE_MS.celebrate + PHASE_MS.explode);
    schedule(() => run('rain'), PHASE_MS.celebrate + PHASE_MS.explode + PHASE_MS.fall);
    schedule(() => run('reveal'), PHASE_MS.celebrate + PHASE_MS.explode + PHASE_MS.fall + PHASE_MS.rain);
    schedule(() => {
      setAnimPhase('idle');
      setDisplayGrid(snapshot.finalGrid);
      setFoundLabel(null);
      stepsRef.current = null;
    }, PHASE_MS.celebrate + PHASE_MS.explode + PHASE_MS.fall + PHASE_MS.rain + PHASE_MS.reveal);

    return clearTimers;
  }, [cascadeAnimating, cascadeSteps, clearTimers, schedule]);

  useEffect(() => {
    if (animPhase === 'idle' && !cascadeAnimating) setDisplayGrid(grid);
  }, [grid, animPhase, cascadeAnimating]);

  useEffect(() => {
    setPath([]);
    setIsDragging(false);
  }, [displayGrid, cascadeAnimating, animPhase]);

  const steps = stepsRef.current ?? cascadeSteps;
  const foundKeys = useMemo(
    () => (steps ? pathKeySet(steps.foundPath) : new Set<string>()),
    [steps],
  );

  const fallOffsets = useMemo(() => {
    if (!steps) return new Map<string, number>();
    return new Map(
      computeFallOffsets(steps.afterRemove).map((o) => [
        cellKey(o.row, o.col),
        o.dy,
      ]),
    );
  }, [steps]);

  const spawnKeys = useMemo(() => {
    if (!steps) return new Set<string>();
    return new Set(computeSpawnCells(steps.afterGravity, steps.afterRefill).map(({ row, col }) => cellKey(row, col)));
  }, [steps]);

  const revealKeys = useMemo(() => {
    if (!steps) return new Set<string>();
    const keys = new Set<string>();
    for (let row = 0; row < steps.finalGrid.length; row++) {
      for (let col = 0; col < steps.finalGrid[row].length; col++) {
        if (steps.finalGrid[row][col] !== steps.afterRefill[row][col]) {
          keys.add(cellKey(row, col));
        }
      }
    }
    return keys;
  }, [steps]);

  const pathKeys = useMemo(() => new Set(path.map(({ row, col }) => cellKey(row, col))), [path]);

  const addCell = useCallback((row: number, col: number) => {
    setPath((current) => {
      if (current.some((cell) => cell.row === row && cell.col === col)) return current;
      const next = [...current, { row, col }];
      return isContiguous(next) ? next : current;
    });
  }, []);

  const finishSelection = useCallback(() => {
    if (path.length === 0) return;
    if (!isForwardPath(path)) {
      setPath([]);
      setIsDragging(false);
      return;
    }
    const spelled = pathToWord(displayGrid, path);
    const match = matchActiveWord(spelled, activeWords);
    if (match) onSubmit(path, match);
    setPath([]);
    setIsDragging(false);
  }, [activeWords, displayGrid, onSubmit, path]);

  const handlePointerDown = (row: number, col: number) => {
    if (disabled || animPhase !== 'idle') return;
    setIsDragging(true);
    setPath([{ row, col }]);
  };

  const handlePointerEnter = (row: number, col: number) => {
    if (!isDragging || disabled || animPhase !== 'idle') return;
    addCell(row, col);
  };

  useEffect(() => {
    const up = () => {
      if (isDragging) finishSelection();
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [isDragging, finishSelection]);

  return (
    <div className={`letter-grid-wrap phase-${animPhase}`}>
      {foundLabel && animPhase !== 'idle' && animPhase !== 'reveal' && (
        <div className="found-word-burst" key={foundLabel + animPhase}>
          {foundLabel}!
        </div>
      )}

      <div className={`letter-grid card phase-${animPhase}`} style={{ touchAction: 'none' }}>
        {animPhase === 'reveal' && <div className="reveal-flash" />}

        {displayGrid.map((row, rowIndex) =>
          row ? (
          <div key={rowIndex} className="grid-row">
            {row.map((letter, colIndex) => {
              const key = cellKey(rowIndex, colIndex);
              const selected = pathKeys.has(key);
              const isFound = foundKeys.has(key);
              const fallDy = fallOffsets.get(key) ?? 0;
              const isSpawn = spawnKeys.has(key);
              const isReveal = revealKeys.has(key);

              const exploding = animPhase === 'explode' && isFound;
              const celebrating = animPhase === 'celebrate' && isFound;
              const falling = animPhase === 'fall' && fallDy > 0;
              const raining = animPhase === 'rain' && isSpawn;
              const revealing = animPhase === 'reveal' && isReveal;

              const particles = exploding
                ? buildParticles(10, rowIndex * 31 + colIndex * 13)
                : [];

              const style: CSSProperties = {};
              if (falling) {
                style.animationDuration = `${PHASE_MS.fall}ms`;
                (style as Record<string, string>)['--fall-distance'] = `${fallDy * CELL_PX}px`;
              }
              if (raining) {
                style.animationDelay = `${colIndex * 45 + rowIndex * 18}ms`;
                style.animationDuration = `${PHASE_MS.rain}ms`;
              }
              if (revealing) {
                style.animationDelay = `${(rowIndex + colIndex) * 28}ms`;
              }

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    'grid-cell',
                    selected ? 'selected' : '',
                    celebrating ? 'celebrating' : '',
                    exploding ? 'exploding' : '',
                    falling ? 'falling' : '',
                    raining ? 'raining' : '',
                    revealing ? 'revealing' : '',
                    isFound && animPhase === 'explode' ? 'found-slot' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={style}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown(rowIndex, colIndex);
                  }}
                  onPointerEnter={() => handlePointerEnter(rowIndex, colIndex)}
                >
                  <span className="cell-letter">{letter}</span>
                  {exploding &&
                    particles.map((p, i) => (
                      <span
                        key={i}
                        className="particle"
                        style={{
                          ['--px' as string]: `${p.x}px`,
                          ['--py' as string]: `${p.y}px`,
                          ['--delay' as string]: `${p.delay}ms`,
                          ['--hue' as string]: `${p.hue}`,
                        }}
                      />
                    ))}
                </button>
              );
            })}
          </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
