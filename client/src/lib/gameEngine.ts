import {
  BASE_POINTS,
  CASCADE_DURATION_MS,
  FORWARD_DIRECTIONS,
  GRID_SIZE,
  SPEED_BONUS,
  SPEED_BONUS_MS,
  TOTAL_WORDS,
  DEFAULT_WORD_SET_ID,
  normalizeWordCount,
  getInitialActiveWords,
  getInitialUnusedWords,
  type CellCoord,
  type GameEvent,
  type Player,
  type PublicGameState,
  type WordPools,
} from '@word-crush-duel/shared';

export type SerializableWordPools = {
  unused: string[];
  deferred: string[];
  found: string[];
};

export type FirebaseGameState = Omit<PublicGameState, 'foundWords' | 'unusedCount' | 'deferredWords'> & {
  pools: SerializableWordPools;
  playerSlots: Record<string, number>;
  createdAt: number;
  updatedAt: number;
};

const VOWELS = 'AEIOU';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function randomLetter(): string {
  const pool = Math.random() < 0.4 ? VOWELS : CONSONANTS;
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

function canPlace(grid: string[][], word: string, row: number, col: number, dr: number, dc: number, size: number): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = grid[r][c];
    if (existing && existing !== word[i]) return false;
  }
  return true;
}

function placeWord(grid: string[][], word: string, row: number, col: number, dr: number, dc: number): void {
  for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
}

function tryPlaceWord(grid: string[][], word: string, size: number): boolean {
  const positions: { row: number; col: number; dr: number; dc: number }[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dr, dc] of FORWARD_DIRECTIONS) {
        if (canPlace(grid, word, row, col, dr, dc, size)) positions.push({ row, col, dr, dc });
      }
    }
  }
  if (positions.length === 0) return false;
  const pick = positions[Math.floor(Math.random() * positions.length)];
  placeWord(grid, word, pick.row, pick.col, pick.dr, pick.dc);
  return true;
}

function fillRandom(grid: string[][], size: number): void {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) if (!grid[row][col]) grid[row][col] = randomLetter();
  }
}

function generateGrid(words: [string, string] | string[], size = GRID_SIZE): string[][] {
  const uniqueWords = [...new Set(words)];
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array.from({ length: size }, () => Array<string>(size).fill(''));
    let success = true;
    for (const word of shuffle(uniqueWords)) {
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
  throw new Error('Failed to generate grid for words: ' + words.join(', '));
}

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
    for (let row = writeRow; row >= 0; row--) grid[row][col] = '';
  }
}

function refillGrid(grid: string[][]): void {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) if (!grid[row][col]) grid[row][col] = randomLetter();
  }
}

function expandBlastPath(grid: string[][], foundPath: CellCoord[], radius = 2): CellCoord[] {
  const cells = new Map<string, CellCoord>();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (const center of foundPath) {
    for (let row = center.row - radius; row <= center.row + radius; row++) {
      for (let col = center.col - radius; col <= center.col + radius; col++) {
        if (row < 0 || col < 0 || row >= rows || col >= cols) continue;
        cells.set(row + ',' + col, { row, col });
      }
    }
  }
  return [...cells.values()];
}

function cascadeAfterFind(
  grid: string[][],
  foundPath: CellCoord[],
  foundWord: string,
  nextActiveWords: string[] | null,
): NonNullable<PublicGameState['cascadeSteps']> {
  const fromGrid = cloneGrid(grid);
  const afterRemove = cloneGrid(grid);
  const blastPath = expandBlastPath(grid, foundPath);
  for (const { row, col } of blastPath) afterRemove[row][col] = '';
  const afterGravity = cloneGrid(afterRemove);
  applyGravity(afterGravity);
  const afterRefill = cloneGrid(afterGravity);
  refillGrid(afterRefill);
  const finalGrid = nextActiveWords ? generateGrid(nextActiveWords) : afterRefill;
  return { fromGrid, afterRemove, afterGravity, afterRefill, finalGrid, foundPath: blastPath, foundWord };
}

function pathToWord(grid: string[][], path: CellCoord[]): string {
  return path.map(({ row, col }) => grid[row]?.[col] ?? '').join('');
}

function isContiguousPath(path: CellCoord[]): boolean {
  if (path.length < 2) return path.length === 1;
  const dr = path[1].row - path[0].row;
  const dc = path[1].col - path[0].col;
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return false;
  for (let i = 1; i < path.length; i++) {
    if (path[i].row - path[i - 1].row !== dr || path[i].col - path[i - 1].col !== dc) return false;
  }
  return new Set(path.map(({ row, col }) => row + ',' + col)).size === path.length;
}

function isForwardPath(path: CellCoord[]): boolean {
  if (path.length < 2) return true;
  const dr = path[1].row - path[0].row;
  const dc = path[1].col - path[0].col;
  return dr >= 0 && dc >= 0 && dr + dc > 0;
}

function validateSelection(
  grid: string[][],
  path: CellCoord[],
  claimedWord: string,
  activeWords: string[],
): { valid: true; word: string } | { valid: false; reason: string } {
  if (path.length === 0) return { valid: false, reason: 'Empty selection' };
  for (const { row, col } of path) {
    if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return { valid: false, reason: 'Selection out of bounds' };
  }
  if (!isContiguousPath(path)) return { valid: false, reason: 'Selection must be a straight line' };
  if (!isForwardPath(path)) return { valid: false, reason: 'Read left-to-right or top-down (no backwards)' };
  const spelled = pathToWord(grid, path);
  const activeMatch = activeWords.find((word) => word === spelled);
  if (!activeMatch) return { valid: false, reason: 'Word is not an active target' };
  if (claimedWord !== activeMatch) return { valid: false, reason: 'Claimed word does not match selection' };
  return { valid: true, word: activeMatch };
}

function toPools(pools: SerializableWordPools): WordPools {
  return { unused: [...pools.unused], deferred: [...pools.deferred], found: new Set(pools.found) };
}

function serializePools(pools: WordPools): SerializableWordPools {
  return { unused: [...pools.unused], deferred: [...pools.deferred], found: [...pools.found] };
}

function createInitialPools(unused: string[]): WordPools {
  return { unused: [...unused], deferred: [], found: new Set() };
}

function handleWordFound(pools: WordPools, activeWords: string[], foundWord: string): { nextActive: string[] | null; deferredWord: string | null } {
  pools.found.add(foundWord);
  const next = activeWords.filter((word) => word !== foundWord && !pools.found.has(word));
  while (next.length < 2) {
    if (pools.unused.length > 0) next.push(pools.unused.shift()!);
    else if (pools.deferred.length > 0) next.push(pools.deferred.shift()!);
    else break;
  }
  const nextActive = next.length === 0 ? null : next;
  return { nextActive, deferredWord: null };
}

function normalizePlayers(players: unknown): [Player | null, Player | null] {
  if (Array.isArray(players)) return [(players[0] as Player | null) ?? null, (players[1] as Player | null) ?? null];
  const keyed = players as Record<string, Player | null> | null | undefined;
  return [keyed?.['0'] ?? null, keyed?.['1'] ?? null];
}

function normalizeSelections(selections: FirebaseGameState['selections']): NonNullable<FirebaseGameState['selections']> {
  const normalized: NonNullable<FirebaseGameState['selections']> = {};
  for (const [playerId, selection] of Object.entries(selections ?? {})) {
    normalized[playerId] = {
      path: selection?.path ?? [],
      status: selection?.status ?? 'selecting',
      updatedAt: selection?.updatedAt ?? 0,
    };
  }
  return normalized;
}

function inferTotalWords(state: FirebaseGameState): number {
  const words = new Set<string>();
  for (const word of state.activeWords ?? []) words.add(word);
  for (const word of state.pools?.unused ?? []) words.add(word);
  for (const word of state.pools?.deferred ?? []) words.add(word);
  for (const word of state.pools?.found ?? []) words.add(word);
  return words.size || TOTAL_WORDS;
}

export function normalizeRoomState(state: FirebaseGameState): FirebaseGameState {
  const wordSetId = state.wordSetId ?? DEFAULT_WORD_SET_ID;
  const totalWords = normalizeWordCount(state.totalWords ?? inferTotalWords(state));
  return {
    ...state,
    wordSetId,
    totalWords,
    players: normalizePlayers(state.players),
    scores: state.scores ?? {},
    playerSlots: state.playerSlots ?? {},
    pools: { unused: state.pools?.unused ?? [], deferred: state.pools?.deferred ?? [], found: state.pools?.found ?? [] },
    activeWords: [...(state.activeWords ?? [])],
    selections: normalizeSelections(state.selections),
    grid: state.grid ?? [],
    countdown: state.countdown ?? null,
    winnerId: state.winnerId ?? null,
    lastEvent: state.lastEvent ?? null,
    resolving: Boolean(state.resolving),
    disconnectedPlayerId: state.disconnectedPlayerId ?? null,
    pauseUntil: state.pauseUntil ?? null,
    cascadeAnimating: Boolean(state.cascadeAnimating),
    lastFoundPath: state.lastFoundPath ?? null,
    lastFoundWord: state.lastFoundWord ?? null,
    cascadeSteps: state.cascadeSteps ?? null,
  };
}

export function toPublicGameState(state: FirebaseGameState): PublicGameState {
  const normalized = normalizeRoomState(state);
  return {
    roomCode: normalized.roomCode,
    wordSetId: normalized.wordSetId,
    totalWords: normalized.totalWords,
    players: normalized.players,
    scores: normalized.scores,
    wordsFoundCount: normalized.wordsFoundCount,
    activeWords: normalized.activeWords,
    selections: normalized.selections,
    unusedCount: normalized.pools.unused.length,
    deferredWords: normalized.pools.deferred,
    foundWords: normalized.pools.found,
    grid: normalized.grid,
    status: normalized.status,
    layoutStartedAt: normalized.layoutStartedAt,
    countdown: normalized.countdown,
    winnerId: normalized.winnerId,
    lastEvent: normalized.lastEvent,
    resolving: normalized.resolving,
    disconnectedPlayerId: normalized.disconnectedPlayerId,
    pauseUntil: normalized.pauseUntil,
    cascadeAnimating: normalized.cascadeAnimating,
    lastFoundPath: normalized.lastFoundPath,
    lastFoundWord: normalized.lastFoundWord,
    cascadeSteps: normalized.cascadeSteps,
  };
}

function beginPlaying(state: FirebaseGameState, now: number): FirebaseGameState {
  const wordSetId = state.wordSetId ?? DEFAULT_WORD_SET_ID;
  const totalWords = normalizeWordCount(state.totalWords);
  const activeWords = getInitialActiveWords(wordSetId, totalWords);
  const scores = { ...state.scores };
  for (const player of state.players) if (player) scores[player.id] = 0;
  return {
    ...state,
    wordSetId,
    totalWords,
    scores,
    wordsFoundCount: 0,
    activeWords,
    pools: serializePools(createInitialPools(getInitialUnusedWords(wordSetId, totalWords))),
    grid: generateGrid(activeWords),
    status: 'playing',
    layoutStartedAt: now,
    countdown: null,
    winnerId: null,
    lastEvent: { type: 'game_started', message: 'Go!' },
    resolving: false,
    disconnectedPlayerId: null,
    pauseUntil: null,
    cascadeAnimating: false,
    lastFoundPath: null,
    lastFoundWord: null,
    cascadeSteps: null,
    selections: {},
    updatedAt: now,
  };
}

export function createRoomState(
  roomCode: string,
  playerId: string,
  name: string,
  wordSetId: string = DEFAULT_WORD_SET_ID,
  totalWords = TOTAL_WORDS,
  now = Date.now(),
): FirebaseGameState {
  const normalizedTotalWords = normalizeWordCount(totalWords);
  const activeWords = getInitialActiveWords(wordSetId, normalizedTotalWords);
  const player = { id: playerId, name: name.trim() || 'Player' };
  return {
    roomCode,
    wordSetId,
    totalWords: normalizedTotalWords,
    players: [player, null],
    playerSlots: { [playerId]: 0 },
    scores: { [playerId]: 0 },
    wordsFoundCount: 0,
    activeWords,
    pools: serializePools(createInitialPools(getInitialUnusedWords(wordSetId, normalizedTotalWords))),
    grid: generateGrid(activeWords),
    status: 'lobby',
    layoutStartedAt: 0,
    countdown: null,
    winnerId: null,
    lastEvent: { type: 'player_joined', playerId, message: player.name + ' joined' },
    resolving: false,
    disconnectedPlayerId: null,
    pauseUntil: null,
    cascadeAnimating: false,
    lastFoundPath: null,
    lastFoundWord: null,
    cascadeSteps: null,
    selections: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function joinRoomState(current: FirebaseGameState, playerId: string, name: string, now = Date.now()): { state: FirebaseGameState; error: string | null } {
  let state = normalizeRoomState(current);
  if (state.playerSlots[playerId] !== undefined) return { state, error: null };
  const slot = state.players.findIndex((player) => player === null);
  if (slot === -1) return { state, error: 'Room is full' };
  const player = { id: playerId, name: name.trim() || 'Player' };
  const players = [...state.players] as [Player | null, Player | null];
  players[slot] = player;
  state = { ...state, players, playerSlots: { ...state.playerSlots, [playerId]: slot }, scores: { ...state.scores, [playerId]: 0 }, lastEvent: { type: 'player_joined', playerId, message: player.name + ' joined' }, updatedAt: now };
  if (players.every(Boolean) && state.status === 'lobby') state = beginPlaying(state, now);
  return { state, error: null };
}

export function submitSelectionState(current: FirebaseGameState, playerId: string, path: CellCoord[], claimedWord: string, now = Date.now()): { state: FirebaseGameState; error: string | null } {
  const state = normalizeRoomState(current);
  if (state.status !== 'playing') return { state, error: 'Game is not in progress' };
  if (state.resolving || state.cascadeAnimating) return { state, error: 'Wait for the board to settle' };
  if (state.playerSlots[playerId] === undefined) return { state, error: 'You are not in this room' };
  const validation = validateSelection(state.grid, path, claimedWord.toUpperCase(), state.activeWords);
  if (!validation.valid) return { state: { ...state, lastEvent: { type: 'invalid_selection', playerId, message: validation.reason }, updatedAt: now }, error: validation.reason };
  const foundWord = validation.word;
  const elapsed = now - state.layoutStartedAt;
  const points = BASE_POINTS + (elapsed <= SPEED_BONUS_MS ? SPEED_BONUS : 0);
  const pools = toPools(state.pools);
  const { nextActive, deferredWord } = handleWordFound(pools, state.activeWords, foundWord);
  const gameComplete = pools.found.size >= state.totalWords;
  const cascadeSteps = cascadeAfterFind(state.grid, path, foundWord, gameComplete ? null : nextActive);
  const player = state.players.find((candidate) => candidate?.id === playerId);
  const lastEvent: GameEvent = {
    type: 'word_found',
    playerId,
    word: foundWord,
    points,
    message: (player?.name ?? 'Player') + ' found ' + foundWord + '! (+' + points + ')',
  };
  if (deferredWord) lastEvent.deferredWord = deferredWord;
  return {
    state: {
      ...state,
      pools: serializePools(pools),
      scores: { ...state.scores, [playerId]: (state.scores[playerId] ?? 0) + points },
      wordsFoundCount: state.wordsFoundCount + 1,
      activeWords: nextActive && !gameComplete ? nextActive : state.activeWords,
      grid: cascadeSteps.finalGrid,
      resolving: true,
      cascadeAnimating: true,
      lastFoundPath: path,
      lastFoundWord: foundWord,
      cascadeSteps,
      selections: {},
      lastEvent,
      updatedAt: now,
    },
    error: null,
  };
}

function finishGame(state: FirebaseGameState): FirebaseGameState {
  const [p1, p2] = state.players;
  const s1 = p1 ? state.scores[p1.id] ?? 0 : 0;
  const s2 = p2 ? state.scores[p2.id] ?? 0 : 0;
  if (s1 === s2) return { ...state, winnerId: null, status: 'finished', lastEvent: { type: 'game_over', message: "It's a tie!" } };
  const winner = s1 > s2 ? p1 : p2;
  return { ...state, winnerId: winner?.id ?? null, status: 'finished', lastEvent: { type: 'game_over', playerId: winner?.id, message: (winner?.name ?? 'Player') + ' wins!' } };
}

export function settleCascadeState(current: FirebaseGameState, now = Date.now()): FirebaseGameState {
  let state = normalizeRoomState(current);
  if (!state.cascadeAnimating) return state;
  state = { ...state, cascadeAnimating: false, resolving: false, lastFoundPath: null, lastFoundWord: null, cascadeSteps: null, updatedAt: now };
  if (state.pools.found.length >= state.totalWords) return { ...finishGame(state), updatedAt: now };
  return { ...state, layoutStartedAt: now };
}

export function rematchState(current: FirebaseGameState, now = Date.now()): FirebaseGameState {
  const state = normalizeRoomState(current);
  if (!state.players.every(Boolean)) return state;
  return beginPlaying({ ...state, status: 'lobby', lastEvent: { type: 'rematch', message: 'Rematch ready' } }, now);
}

export function resetGameState(current: FirebaseGameState, now = Date.now()): FirebaseGameState {
  const state = normalizeRoomState(current);
  if (state.players.every(Boolean)) return beginPlaying({ ...state, lastEvent: { type: 'rematch', message: 'Game reset' } }, now);

  const wordSetId = state.wordSetId ?? DEFAULT_WORD_SET_ID;
  const totalWords = normalizeWordCount(state.totalWords);
  const activeWords = getInitialActiveWords(wordSetId, totalWords);
  const scores = { ...state.scores };
  for (const player of state.players) if (player) scores[player.id] = 0;
  return {
    ...state,
    wordSetId,
    totalWords,
    scores,
    wordsFoundCount: 0,
    activeWords,
    pools: serializePools(createInitialPools(getInitialUnusedWords(wordSetId, totalWords))),
    grid: generateGrid(activeWords),
    status: 'lobby',
    layoutStartedAt: 0,
    countdown: null,
    winnerId: null,
    lastEvent: { type: 'rematch', message: 'Game reset' },
    resolving: false,
    disconnectedPlayerId: null,
    pauseUntil: null,
    cascadeAnimating: false,
    lastFoundPath: null,
    lastFoundWord: null,
    cascadeSteps: null,
    selections: {},
    updatedAt: now,
  };
}

export { CASCADE_DURATION_MS };
