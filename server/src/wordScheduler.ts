import type { WordPools } from '@word-crush-duel/shared';

export function createInitialPools(unused: string[]): WordPools {
  return { unused: [...unused], deferred: [], found: new Set() };
}

export function clonePools(pools: WordPools): WordPools {
  return {
    unused: [...pools.unused],
    deferred: [...pools.deferred],
    found: new Set(pools.found),
  };
}

export function deferUnfoundSibling(
  activeWords: string[],
  foundWord: string,
  pools: WordPools,
): string | null {
  const sibling = activeWords.find((word) => word !== foundWord);
  if (sibling && !pools.found.has(sibling)) {
    pools.deferred.push(sibling);
    return sibling;
  }
  return null;
}

export function markFound(pools: WordPools, word: string): void {
  pools.found.add(word);
}

export function fillActiveWords(pools: WordPools): string[] | null {
  const next: string[] = [];
  while (next.length < 2) {
    if (pools.unused.length > 0) next.push(pools.unused.shift()!);
    else if (pools.deferred.length > 0) next.push(pools.deferred.shift()!);
    else break;
  }

  if (next.length === 0) return null;
  return next;
}

export function handleWordFound(
  pools: WordPools,
  activeWords: string[],
  foundWord: string,
): { nextActive: string[] | null; deferredWord: string | null } {
  markFound(pools, foundWord);
  const nextActive = activeWords.filter((word) => word !== foundWord && !pools.found.has(word));

  while (nextActive.length < 2) {
    if (pools.unused.length > 0) nextActive.push(pools.unused.shift()!);
    else if (pools.deferred.length > 0) nextActive.push(pools.deferred.shift()!);
    else break;
  }

  return { nextActive: nextActive.length === 0 ? null : nextActive, deferredWord: null };
}

export function isGameComplete(pools: WordPools, totalWords: number): boolean {
  return pools.found.size >= totalWords;
}
