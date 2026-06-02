import { TOTAL_WORDS, type CellCoord, type PublicGameState } from '@word-crush-duel/shared';
import { child, get, onValue, ref, runTransaction, set } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFirebaseDatabase, firebaseConfigured } from '../lib/firebase';
import {
  CASCADE_DURATION_MS,
  createRoomState,
  generateRoomCode,
  joinRoomState,
  rematchState,
  settleCascadeState,
  submitSelectionState,
  toPublicGameState,
  type FirebaseGameState,
} from '../lib/gameEngine';
import { getRoomCodeFromUrl } from '../lib/inviteLink';

function getStoredPlayerId(): string {
  const key = 'word-crush-player-id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const generated = window.crypto?.randomUUID?.() ?? 'player-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  window.sessionStorage.setItem(key, generated);
  return generated;
}

function roomPath(roomCode: string): string {
  return 'rooms/' + roomCode.toUpperCase();
}

export function useGameSocket() {
  const [connected, setConnected] = useState(firebaseConfigured);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(
    firebaseConfigured ? null : 'Firebase config is missing. Add your VITE_FIREBASE_* values.',
  );
  const [playerId] = useState(() => getStoredPlayerId());
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [inviteRoomCode] = useState(() => getRoomCodeFromUrl());
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setConnected(firebaseConfigured);
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !activeRoomCode) return undefined;
    const db = getFirebaseDatabase();
    const roomRef = ref(db, roomPath(activeRoomCode));
    return onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setGameState(null);
        setError('Room not found');
        return;
      }
      setGameState(toPublicGameState(snapshot.val() as FirebaseGameState));
      setError(null);
    });
  }, [activeRoomCode]);

  useEffect(() => {
    if (!firebaseConfigured || !activeRoomCode || !gameState?.cascadeAnimating) return undefined;
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const db = getFirebaseDatabase();
      void runTransaction(ref(db, roomPath(activeRoomCode)), (current: FirebaseGameState | null) => {
        if (!current) return current;
        return settleCascadeState(current);
      });
    }, CASCADE_DURATION_MS);

    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    };
  }, [activeRoomCode, gameState?.cascadeAnimating]);

  const createRoom = useCallback(
    async (playerName: string) => {
      if (!firebaseConfigured) return;
      const db = getFirebaseDatabase();
      setError(null);
      for (let attempt = 0; attempt < 8; attempt++) {
        const roomCode = generateRoomCode();
        const roomRef = child(ref(db), roomPath(roomCode));
        const snapshot = await get(roomRef);
        if (snapshot.exists()) continue;
        await set(roomRef, createRoomState(roomCode, playerId, playerName));
        setActiveRoomCode(roomCode);
        return;
      }
      setError('Could not create a unique room. Try again.');
    },
    [playerId],
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      if (!firebaseConfigured) return;
      const code = roomCode.trim().toUpperCase();
      if (!code) return;
      const db = getFirebaseDatabase();
      const roomRef = ref(db, roomPath(code));
      const existingRoom = await get(roomRef);
      if (!existingRoom.exists()) {
        setError('Room not found');
        return;
      }

      let transactionError: string | null = null;
      const result = await runTransaction(roomRef, (current: FirebaseGameState | null) => {
        if (!current) {
          transactionError = 'Room not found';
          return current;
        }
        const next = joinRoomState(current, playerId, playerName);
        transactionError = next.error;
        return next.state;
      });
      if (!result.committed || transactionError) {
        setError(transactionError ?? 'Could not join room');
        return;
      }
      setActiveRoomCode(code);
      setError(null);
    },
    [playerId],
  );

  const submitSelection = useCallback(
    async (roomCode: string, path: CellCoord[], word: string) => {
      if (!firebaseConfigured) return;
      const db = getFirebaseDatabase();
      let transactionError: string | null = null;
      await runTransaction(ref(db, roomPath(roomCode)), (current: FirebaseGameState | null) => {
        if (!current) {
          transactionError = 'Room not found';
          return current;
        }
        const next = submitSelectionState(current, playerId, path, word);
        transactionError = next.error;
        return next.state;
      });
      if (transactionError) setError(transactionError);
    },
    [playerId],
  );

  const rematch = useCallback(async () => {
    if (!firebaseConfigured || !gameState) return;
    const db = getFirebaseDatabase();
    await runTransaction(ref(db, roomPath(gameState.roomCode)), (current: FirebaseGameState | null) => {
      if (!current) return current;
      return rematchState(current);
    });
  }, [gameState]);

  const self = useMemo(() => gameState?.players.find((player) => player?.id === playerId) ?? null, [gameState, playerId]);
  const opponent = useMemo(() => gameState?.players.find((player) => player && player.id !== playerId) ?? null, [gameState, playerId]);

  return {
    connected,
    gameState,
    error,
    playerId,
    self,
    opponent,
    createRoom,
    joinRoom,
    startGame: () => undefined,
    submitSelection,
    rematch,
    totalWords: TOTAL_WORDS,
    inviteRoomCode,
  };
}
