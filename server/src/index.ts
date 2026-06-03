import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type PublicGameState,
  type SubmitSelectionPayload,
} from '@word-crush-duel/shared';
import { RoomManager } from './gameRoom.js';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

const roomManager = new RoomManager();
roomManager.setBroadcaster((state: PublicGameState) => {
  io.to(state.roomCode).emit(SERVER_EVENTS.ROOM_STATE, state);
});

io.on('connection', (socket) => {
  let currentRoomCode: string | null = null;

  socket.on(CLIENT_EVENTS.CREATE_ROOM, (payload: CreateRoomPayload) => {
    const room = roomManager.createRoom(socket.id, payload.playerName, payload.wordSetId);
    currentRoomCode = room.getRoomCode();
    socket.join(currentRoomCode);
    socket.emit(SERVER_EVENTS.ROOM_STATE, room.getPublicState());
  });

  socket.on(CLIENT_EVENTS.JOIN_ROOM, (payload: JoinRoomPayload) => {
    const code = payload.roomCode.toUpperCase();
    const existing = roomManager.getRoom(code);
    if (!existing) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found or full' });
      return;
    }

    currentRoomCode = code;
    socket.join(code);

    const room = roomManager.joinRoom(code, socket.id, payload.playerName);
    if (!room) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found or full' });
      return;
    }

    socket.emit(SERVER_EVENTS.ROOM_STATE, room.getPublicState());
  });

  socket.on(CLIENT_EVENTS.START_GAME, () => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.canStart()) room.startCountdown();
  });

  socket.on(CLIENT_EVENTS.SUBMIT_SELECTION, (payload: SubmitSelectionPayload) => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (!room) return;
    room.submitSelection(socket.id, payload.path, payload.word);
  });

  socket.on(CLIENT_EVENTS.REMATCH, () => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    room?.rematch();
  });

  socket.on('disconnect', () => {
    roomManager.removePlayer(socket.id);
    currentRoomCode = null;
  });
});

httpServer.listen(PORT, () => {
  console.log(`Word Crush Duel server listening on http://localhost:${PORT}`);
});
