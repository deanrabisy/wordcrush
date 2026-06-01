import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  TOTAL_WORDS,
  type CellCoord,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type PublicGameState,
  type SubmitSelectionPayload,
} from '@word-crush-duel/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRoomCodeFromUrl } from '../lib/inviteLink';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [inviteRoomCode] = useState(() => getRoomCodeFromUrl());

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setPlayerId(socket.id ?? null);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on(SERVER_EVENTS.ROOM_STATE, (state: PublicGameState) => {
      setGameState(state);
      setError(null);
    });

    socket.on(SERVER_EVENTS.ERROR, (payload: { message: string }) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    const payload: CreateRoomPayload = { playerName };
    socketRef.current?.emit(CLIENT_EVENTS.CREATE_ROOM, payload);
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const payload: JoinRoomPayload = { roomCode, playerName };
    socketRef.current?.emit(CLIENT_EVENTS.JOIN_ROOM, payload);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit(CLIENT_EVENTS.START_GAME);
  }, []);

  const submitSelection = useCallback((roomCode: string, path: CellCoord[], word: string) => {
    const payload: SubmitSelectionPayload = { roomCode, path, word };
    socketRef.current?.emit(CLIENT_EVENTS.SUBMIT_SELECTION, payload);
  }, []);

  const rematch = useCallback(() => {
    socketRef.current?.emit(CLIENT_EVENTS.REMATCH);
  }, []);

  const self = useMemo(
    () => gameState?.players.find((player) => player?.id === playerId) ?? null,
    [gameState, playerId],
  );

  const opponent = useMemo(
    () => gameState?.players.find((player) => player && player.id !== playerId) ?? null,
    [gameState, playerId],
  );

  return {
    connected,
    gameState,
    error,
    playerId,
    self,
    opponent,
    createRoom,
    joinRoom,
    startGame,
    submitSelection,
    rematch,
    totalWords: TOTAL_WORDS,
    inviteRoomCode,
  };
}
