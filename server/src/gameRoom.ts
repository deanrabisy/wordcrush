import {
  BASE_POINTS,
  DISCONNECT_PAUSE_MS,
  getAllWords,
  getInitialActiveWords,
  getInitialUnusedWords,
  MEANING_DURATION_MS,
  ROUND_COUNTDOWN_MS,
  SPEED_BONUS,
  SPEED_BONUS_MS,
  CASCADE_DURATION_MS,
  TOTAL_WORDS,
  DEFAULT_WORD_SET_ID,
  normalizeWordCount,
  type CellCoord,
  type CascadeSteps,
  type FoundWordRecord,
  type GameEvent,
  type Player,
  type PublicGameState,
  type QuizState,
  type WordPools,
} from '@word-crush-duel/shared';
import { cascadeAfterFind } from './cascade.js';
import { generateGrid } from './gridGenerator.js';
import { validateSelection } from './validator.js';
import { createInitialPools, clonePools, handleWordFound, isGameComplete } from './wordScheduler.js';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

type InternalGameState = {
  roomCode: string;
  wordSetId: string;
  totalWords: number;
  players: [Player | null, Player | null];
  playerSlots: Map<string, number>;
  scores: Record<string, number>;
  wordsFoundCount: number;
  wordHistory: FoundWordRecord[];
  activeWords: string[];
  pools: WordPools;
  grid: string[][];
  status: PublicGameState['status'];
  layoutStartedAt: number;
  countdown: number | null;
  meaningUntil: number | null;
  roundReadyUntil: number | null;
  quiz: QuizState | null;
  winnerId: string | null;
  lastEvent: GameEvent | null;
  resolving: boolean;
  disconnectedPlayerId: string | null;
  pauseUntil: number | null;
  cascadeAnimating: boolean;
  lastFoundPath: CellCoord[] | null;
  lastFoundWord: string | null;
  cascadeSteps: CascadeSteps | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  countdownTimer: ReturnType<typeof setInterval> | null;
};

export class GameRoom {
  private state: InternalGameState;
  private onStateChange: (state: PublicGameState) => void;

  constructor(
    onStateChange: (state: PublicGameState) => void,
    roomCode?: string,
    wordSetId: string = DEFAULT_WORD_SET_ID,
    totalWords = TOTAL_WORDS,
  ) {
    this.onStateChange = onStateChange;
    const normalizedTotalWords = normalizeWordCount(totalWords);
    const initialActive = getInitialActiveWords(wordSetId, normalizedTotalWords);
    this.state = {
      roomCode: roomCode ?? generateRoomCode(),
      wordSetId,
      totalWords: normalizedTotalWords,
      players: [null, null],
      playerSlots: new Map(),
      scores: {},
      wordsFoundCount: 0,
      wordHistory: [],
      activeWords: initialActive,
      pools: createInitialPools(getInitialUnusedWords(wordSetId, normalizedTotalWords)),
      grid: generateGrid(initialActive),
      status: 'lobby',
      layoutStartedAt: 0,
      countdown: null,
      meaningUntil: null,
      roundReadyUntil: null,
      quiz: null,
      winnerId: null,
      lastEvent: null,
      resolving: false,
      disconnectedPlayerId: null,
      pauseUntil: null,
      cascadeAnimating: false,
      lastFoundPath: null,
      lastFoundWord: null,
      cascadeSteps: null,
      disconnectTimer: null,
      countdownTimer: null,
    };
  }

  getRoomCode(): string {
    return this.state.roomCode;
  }

  getPublicState(): PublicGameState {
    return {
      roomCode: this.state.roomCode,
      wordSetId: this.state.wordSetId,
      totalWords: this.state.totalWords,
      players: [...this.state.players],
      scores: { ...this.state.scores },
      wordsFoundCount: this.state.wordsFoundCount,
      wordHistory: [...this.state.wordHistory],
      activeWords: [...this.state.activeWords],
      unusedCount: this.state.pools.unused.length,
      deferredWords: [...this.state.pools.deferred],
      foundWords: [...this.state.pools.found],
      grid: this.state.grid.map((row) => [...row]),
      status: this.state.status,
      layoutStartedAt: this.state.layoutStartedAt,
      countdown: this.state.countdown,
      meaningUntil: this.state.meaningUntil,
      roundReadyUntil: this.state.roundReadyUntil,
      quiz: this.state.quiz,
      winnerId: this.state.winnerId,
      lastEvent: this.state.lastEvent,
      resolving: this.state.resolving,
      disconnectedPlayerId: this.state.disconnectedPlayerId,
      pauseUntil: this.state.pauseUntil,
      cascadeAnimating: this.state.cascadeAnimating,
      lastFoundPath: this.state.lastFoundPath,
      lastFoundWord: this.state.lastFoundWord,
      cascadeSteps: this.state.cascadeSteps,
    };
  }

  private emit(): void {
    this.onStateChange(this.getPublicState());
  }

  addPlayer(playerId: string, name: string): { ok: true; slot: number } | { ok: false; error: string } {
    if (this.state.playerSlots.has(playerId)) {
      return { ok: true, slot: this.state.playerSlots.get(playerId)! };
    }

    const slot = this.state.players.findIndex((player) => player === null);
    if (slot === -1) return { ok: false, error: 'Room is full' };

    const player: Player = { id: playerId, name: name.trim() || 'Player' };
    this.state.players[slot] = player;
    this.state.playerSlots.set(playerId, slot);
    this.state.scores[playerId] = 0;
    this.state.lastEvent = { type: 'player_joined', playerId, message: `${player.name} joined` };
    this.emit();
    return { ok: true, slot };
  }

  removePlayer(playerId: string): void {
    const slot = this.state.playerSlots.get(playerId);
    if (slot === undefined) return;

    this.state.players[slot] = null;
    this.state.playerSlots.delete(playerId);

    if (this.state.status === 'playing' || this.state.status === 'countdown') {
      this.state.disconnectedPlayerId = playerId;
      this.state.status = 'paused';
      this.state.pauseUntil = Date.now() + DISCONNECT_PAUSE_MS;
      this.state.lastEvent = {
        type: 'player_left',
        playerId,
        message: 'Opponent disconnected. Waiting 30s…',
      };
      this.clearDisconnectTimer();
      this.state.disconnectTimer = setTimeout(() => this.handleDisconnectTimeout(playerId), DISCONNECT_PAUSE_MS);
    } else {
      this.state.lastEvent = { type: 'player_left', playerId };
    }

    this.emit();
  }

  reconnectPlayer(playerId: string, name: string): boolean {
    const slot = this.state.players.findIndex((player) => player?.id === playerId);
    if (slot !== -1) {
      this.state.players[slot] = { id: playerId, name };
      this.state.playerSlots.set(playerId, slot);
    } else {
      const result = this.addPlayer(playerId, name);
      if (!result.ok) return false;
    }

    if (this.state.disconnectedPlayerId === playerId) {
      this.clearDisconnectTimer();
      this.state.disconnectedPlayerId = null;
      this.state.pauseUntil = null;
      const shouldResumePlay = this.state.wordsFoundCount > 0 || this.state.layoutStartedAt > 0;
      if (shouldResumePlay) {
        this.state.status = 'playing';
      } else if (this.state.players.every(Boolean)) {
        this.state.status = 'lobby';
        this.startCountdown();
      } else {
        this.state.status = 'lobby';
      }
    }

    this.emit();
    return true;
  }

  private clearDisconnectTimer(): void {
    if (this.state.disconnectTimer) {
      clearTimeout(this.state.disconnectTimer);
      this.state.disconnectTimer = null;
    }
  }

  private clearCountdownTimer(): void {
    if (this.state.countdownTimer) {
      clearInterval(this.state.countdownTimer);
      this.state.countdownTimer = null;
    }
  }

  private handleDisconnectTimeout(playerId: string): void {
    if (this.state.disconnectedPlayerId !== playerId) return;
    const winner = this.state.players.find((player) => player && player.id !== playerId);
    this.state.winnerId = winner?.id ?? null;
    this.state.status = 'finished';
    this.state.lastEvent = {
      type: 'game_over',
      message: winner ? `${winner.name} wins by disconnect` : 'Game ended',
    };
    this.emit();
  }

  canStart(): boolean {
    return this.state.players.every(Boolean) && this.state.status === 'lobby';
  }

  startCountdown(): void {
    if (!this.canStart()) return;

    this.clearCountdownTimer();
    this.state.status = 'countdown';
    this.state.countdown = 3;
    this.state.lastEvent = { type: 'game_started', message: 'Get ready!' };
    this.emit();

    this.state.countdownTimer = setInterval(() => {
      if (this.state.countdown === null) return;
      this.state.countdown -= 1;
      if (this.state.countdown <= 0) {
        this.clearCountdownTimer();
        this.beginPlaying();
      } else {
        this.emit();
      }
    }, 1000);
  }

  private beginPlaying(): void {
    const initialActive = getInitialActiveWords(this.state.wordSetId, this.state.totalWords);
    this.state.activeWords = initialActive;
    this.state.pools = createInitialPools(getInitialUnusedWords(this.state.wordSetId, this.state.totalWords));
    this.state.grid = generateGrid(initialActive);
    this.state.wordsFoundCount = 0;
    this.state.wordHistory = [];
    this.state.status = 'playing';
    this.state.countdown = null;
    this.state.meaningUntil = null;
    this.state.roundReadyUntil = Date.now() + ROUND_COUNTDOWN_MS;
    this.state.quiz = null;
    this.state.winnerId = null;
    this.state.resolving = false;
    this.state.cascadeAnimating = false;
    this.state.lastFoundPath = null;
    this.state.lastFoundWord = null;
    this.state.cascadeSteps = null;
    this.state.layoutStartedAt = this.state.roundReadyUntil;
    for (const player of this.state.players) {
      if (player) this.state.scores[player.id] = 0;
    }
    this.state.lastEvent = { type: 'game_started', message: 'Go!' };
    this.emit();
  }

  submitSelection(
    playerId: string,
    path: CellCoord[],
    claimedWord: string,
  ): { ok: true } | { ok: false; error: string } {
    if (this.state.status !== 'playing') {
      return { ok: false, error: 'Game is not in progress' };
    }
    if (this.state.resolving || this.state.cascadeAnimating) {
      return { ok: false, error: 'Wait for the board to settle' };
    }
    if (this.state.roundReadyUntil && Date.now() < this.state.roundReadyUntil) {
      return { ok: false, error: 'Get ready for the next words' };
    }
    if (!this.state.playerSlots.has(playerId)) {
      return { ok: false, error: 'You are not in this room' };
    }

    const validation = validateSelection(
      this.state.grid,
      path,
      claimedWord.toUpperCase(),
      this.state.activeWords,
    );

    if (!validation.valid) {
      this.state.lastEvent = {
        type: 'invalid_selection',
        playerId,
        message: validation.reason,
      };
      this.emit();
      return { ok: false, error: validation.reason };
    }

    this.state.resolving = true;
    const foundWord = validation.word;
    const elapsed = Date.now() - this.state.layoutStartedAt;
    let points = BASE_POINTS;
    if (elapsed <= SPEED_BONUS_MS) points += SPEED_BONUS;

    const trialPools = clonePools(this.state.pools);
    const { nextActive, deferredWord } = handleWordFound(
      trialPools,
      this.state.activeWords,
      foundWord,
    );
    const gameComplete = isGameComplete(trialPools, this.state.totalWords);

    let cascade;
    try {
      cascade = cascadeAfterFind(
        this.state.grid,
        path,
        foundWord,
        gameComplete ? null : nextActive,
      );
    } catch (err) {
      console.error('Cascade failed:', err);
      this.state.resolving = false;
      this.state.lastEvent = {
        type: 'invalid_selection',
        playerId,
        message: 'Board update failed — try again',
      };
      this.emit();
      return { ok: false, error: 'Board update failed' };
    }

    this.state.pools = trialPools;
    this.state.scores[playerId] = (this.state.scores[playerId] ?? 0) + points;
    this.state.wordsFoundCount += 1;
    this.state.wordHistory.push({ word: foundWord, playerId, foundAt: Date.now() });
    this.state.lastFoundPath = path;
    this.state.lastFoundWord = foundWord;
    this.state.cascadeAnimating = true;
    this.state.meaningUntil = null;
    this.state.roundReadyUntil = null;
    this.state.quiz = null;
    this.state.cascadeSteps = cascade;
    this.state.grid = cascade.finalGrid;

    if (nextActive && !gameComplete) {
      this.state.activeWords = nextActive;
    }

    const player = this.state.players.find((p) => p?.id === playerId);
    const lastEvent: GameEvent = {
      type: 'word_found',
      playerId,
      word: foundWord,
      points,
      message: `${player?.name ?? 'Player'} found ${foundWord}! (+${points})`,
    };
    if (deferredWord) lastEvent.deferredWord = deferredWord;
    this.state.lastEvent = lastEvent;

    this.emit();

    setTimeout(() => {
      this.state.cascadeAnimating = false;
      this.state.resolving = false;
      this.state.lastFoundPath = null;
      this.state.lastFoundWord = null;
      this.state.cascadeSteps = null;

      if (gameComplete) {
        this.finishGame();
      } else {
        this.state.meaningUntil = Date.now() + MEANING_DURATION_MS;
        this.state.roundReadyUntil = this.state.meaningUntil + ROUND_COUNTDOWN_MS;
        this.state.layoutStartedAt = this.state.roundReadyUntil;
        this.emit();
      }
    }, CASCADE_DURATION_MS);

    return { ok: true };
  }

  private finishGame(): void {
    const [p1, p2] = this.state.players;
    const s1 = p1 ? this.state.scores[p1.id] ?? 0 : 0;
    const s2 = p2 ? this.state.scores[p2.id] ?? 0 : 0;

    if (s1 === s2) {
      this.state.winnerId = null;
      this.state.lastEvent = {
        type: 'game_over',
        message: "It's a tie!",
      };
    } else {
      const winner = s1 > s2 ? p1 : p2;
      this.state.winnerId = winner?.id ?? null;
      this.state.lastEvent = {
        type: 'game_over',
        playerId: winner?.id,
        message: `${winner?.name ?? 'Player'} wins!`,
      };
    }

    this.state.status = 'finished';
    this.emit();
  }

  rematch(): void {
    if (!this.state.players.every(Boolean)) return;
    this.clearDisconnectTimer();
    this.state.disconnectedPlayerId = null;
    this.state.pauseUntil = null;
    this.state.status = 'lobby';
    this.state.countdown = null;
    this.state.meaningUntil = null;
    this.state.roundReadyUntil = null;
    this.state.quiz = null;
    this.state.winnerId = null;
    this.state.wordsFoundCount = 0;
    this.state.wordHistory = [];
    this.state.lastEvent = { type: 'rematch', message: 'Rematch ready' };
    this.startCountdown();
  }

  destroy(): void {
    this.clearDisconnectTimer();
    this.clearCountdownTimer();
  }
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private playerRooms = new Map<string, string>();
  private broadcaster: ((state: PublicGameState) => void) | null = null;

  setBroadcaster(fn: (state: PublicGameState) => void): void {
    this.broadcaster = fn;
  }

  createRoom(playerId: string, name: string, wordSetId: string = DEFAULT_WORD_SET_ID, totalWords = TOTAL_WORDS): GameRoom {
    const room = new GameRoom((state) => this.broadcaster?.(state), undefined, wordSetId, totalWords);
    this.rooms.set(room.getRoomCode(), room);
    room.addPlayer(playerId, name);
    this.playerRooms.set(playerId, room.getRoomCode());
    return room;
  }

  joinRoom(roomCode: string, playerId: string, name: string): GameRoom | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return null;
    const result = room.addPlayer(playerId, name);
    if (!result.ok) return null;
    this.playerRooms.set(playerId, roomCode.toUpperCase());
    if (room.canStart()) room.startCountdown();
    return room;
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  getRoomForPlayer(playerId: string): GameRoom | undefined {
    const code = this.playerRooms.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  removePlayer(playerId: string): void {
    const room = this.getRoomForPlayer(playerId);
    if (!room) return;
    room.removePlayer(playerId);
    this.playerRooms.delete(playerId);
    const state = room.getPublicState();
    if (!state.players.some(Boolean)) {
      room.destroy();
      this.rooms.delete(state.roomCode);
    }
  }
}

export { getAllWords };
