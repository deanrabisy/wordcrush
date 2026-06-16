import { describe, expect, it } from 'vitest';
import { getAllWords, getInitialActiveWords, getInitialUnusedWords, getWordMeaning, WORD_SETS } from '@word-crush-duel/shared';
import { findWordInGrid, generateGrid } from './gridGenerator.js';
import { validateSelection } from './validator.js';
import {
  createInitialPools,
  fillActiveWords,
  handleWordFound,
  isGameComplete,
} from './wordScheduler.js';

describe('gridGenerator', () => {
  it('embeds both active words in every generated grid', () => {
    for (let i = 0; i < 20; i++) {
      const words = getInitialActiveWords();
      const grid = generateGrid(words);
      expect(findWordInGrid(grid, words[0])).not.toBeNull();
      expect(findWordInGrid(grid, words[1])).not.toBeNull();
    }
  });
});

describe('validator', () => {
  it('accepts a valid forward word path', () => {
    const grid = generateGrid(['CAT', 'DOG']);
    const path = findWordInGrid(grid, 'CAT')!;
    const result = validateSelection(grid, path, 'CAT', ['CAT', 'DOG']);
    expect(result.valid).toBe(true);
  });

  it('rejects non-active words', () => {
    const grid = generateGrid(['CAT', 'DOG']);
    const path = findWordInGrid(grid, 'CAT')!;
    const result = validateSelection(grid, path, 'CAT', ['DOG', 'BIG']);
    expect(result.valid).toBe(false);
  });

  it('rejects backwards selections', () => {
    const grid = generateGrid(['CAT', 'DOG']);
    const path = findWordInGrid(grid, 'CAT')!;
    const reversed = [...path].reverse();
    const result = validateSelection(grid, reversed, 'CAT', ['CAT', 'DOG']);
    expect(result.valid).toBe(false);
  });
});

describe('wordScheduler', () => {
  it('keeps the unfound sibling active and adds one fresh word', () => {
    const pools = createInitialPools(getInitialUnusedWords());
    const active = getInitialActiveWords();
    const { nextActive, deferredWord } = handleWordFound(pools, active, active[0]);

    expect(deferredWord).toBeNull();
    expect(pools.found.has(active[0])).toBe(true);
    expect(nextActive).toEqual([active[1], 'BIG']);
    expect(pools.deferred).toEqual([]);
  });

  it('returns deferred words once unused is empty', () => {
    const pools = createInitialPools([]);
    pools.deferred = ['COLD', 'SMALL'];
    pools.found = new Set(['HOT', 'BIG']);

    const next = fillActiveWords(pools);
    expect(next).toEqual(['COLD', 'SMALL']);
  });

  it('completes after the selected number of words are found', () => {
    const pools = createInitialPools([]);
    pools.found = new Set(getAllWords());
    expect(isGameComplete(pools, 16)).toBe(true);
  });

  it('simulates a full 16-find trace without losing words', () => {
    const all = getAllWords();
    let pools = createInitialPools(getInitialUnusedWords());
    let active: string[] = getInitialActiveWords();
    const foundOrder: string[] = [];

    while (!isGameComplete(pools, 16)) {
      const target = active[0];
      const { nextActive } = handleWordFound(pools, active, target);
      foundOrder.push(target);
      if (!nextActive) break;
      active = nextActive;
    }

    expect(foundOrder.length).toBe(16);
    expect(new Set(foundOrder).size).toBe(16);
    expect(all.every((word) => pools.found.has(word))).toBe(true);
  });

  it('returns a single final active word instead of duplicating it', () => {
    const pools = createInitialPools([]);
    pools.deferred = ['COLD'];
    pools.found = new Set(['HOT', 'BIG', 'SMALL', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'IN', 'OUT']);

    const next = fillActiveWords(pools);
    expect(next).toEqual(['COLD']);
  });
});

describe('word meanings', () => {
  it('has a short meaning for every word in every set', () => {
    const words = new Set(WORD_SETS.flatMap((set) => set.pairs.flat()));

    for (const word of words) {
      const meaning = getWordMeaning(word);
      expect(meaning, word).toBeTruthy();
      expect(meaning!.split(/\s+/).length, word).toBeLessThanOrEqual(6);
    }
  });
});
