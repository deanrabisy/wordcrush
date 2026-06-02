export type CellCoord = { row: number; col: number };

export type CascadeSteps = {
  fromGrid: string[][];
  afterRemove: string[][];
  afterGravity: string[][];
  afterRefill: string[][];
  finalGrid: string[][];
  foundPath: CellCoord[];
  foundWord: string;
};

export const CASCADE_DURATION_MS = 2400;

export type Player = {
  id: string;
  name: string;
};

export type GameStatus = 'lobby' | 'countdown' | 'playing' | 'finished' | 'paused';

export type GameEvent = {
  type:
    | 'word_found'
    | 'invalid_selection'
    | 'player_joined'
    | 'player_left'
    | 'game_started'
    | 'game_over'
    | 'rematch';
  playerId?: string;
  word?: string;
  points?: number;
  message?: string;
  deferredWord?: string;
};

export type SelectionStatus = 'selecting' | 'valid' | 'invalid';

export type SelectionPreview = {
  path: CellCoord[];
  status: SelectionStatus;
  updatedAt: number;
};

export type PublicGameState = {
  roomCode: string;
  players: [Player | null, Player | null];
  scores: Record<string, number>;
  wordsFoundCount: number;
  activeWords: string[];
  selections?: Record<string, SelectionPreview>;
  unusedCount: number;
  deferredWords: string[];
  foundWords: string[];
  grid: string[][];
  status: GameStatus;
  layoutStartedAt: number;
  countdown: number | null;
  winnerId: string | null;
  lastEvent: GameEvent | null;
  resolving: boolean;
  disconnectedPlayerId: string | null;
  pauseUntil: number | null;
  cascadeAnimating: boolean;
  lastFoundPath: CellCoord[] | null;
  lastFoundWord: string | null;
  cascadeSteps: CascadeSteps | null;
};

export type WordPools = {
  unused: string[];
  deferred: string[];
  found: Set<string>;
};

export type SubmitSelectionPayload = {
  roomCode: string;
  path: CellCoord[];
  word: string;
};

export type CreateRoomPayload = { playerName: string };
export type JoinRoomPayload = { roomCode: string; playerName: string };

export const CLIENT_EVENTS = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  START_GAME: 'start_game',
  SUBMIT_SELECTION: 'submit_selection',
  REMATCH: 'rematch',
} as const;

export const SERVER_EVENTS = {
  ROOM_STATE: 'room_state',
  ERROR: 'error',
} as const;

export const GRID_SIZE = 8;

/** ESL level 1: left→right, top→down, diagonal ↘ only (no backwards). */
export const FORWARD_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
];
export const TOTAL_WORDS = 10;
export const BASE_POINTS = 10;
export const SPEED_BONUS = 5;
export const SPEED_BONUS_MS = 3000;
export const DISCONNECT_PAUSE_MS = 30000;
