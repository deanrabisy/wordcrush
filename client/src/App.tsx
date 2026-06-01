import { useCallback } from 'react';
import { GameOver } from './components/GameOver';
import { LetterGrid } from './components/LetterGrid';
import { Lobby } from './components/Lobby';
import { Scoreboard, TargetBar } from './components/TargetBar';
import { useGameSocket } from './hooks/useGameSocket';

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

export default function App() {
  const {
    connected,
    gameState,
    error,
    playerId,
    self,
    opponent,
    createRoom,
    joinRoom,
    submitSelection,
    rematch,
    totalWords,
    inviteRoomCode,
  } = useGameSocket();

  const handleSubmit = useCallback(
    (path: Parameters<typeof submitSelection>[1], word: string) => {
      if (!gameState) return;
      submitSelection(gameState.roomCode, path, word);
    },
    [gameState, submitSelection],
  );

  if (!gameState) {
    return (
      <main className="app">
        <Lobby
          connected={connected}
          error={error}
          onCreate={createRoom}
          onJoin={joinRoom}
          initialJoinCode={inviteRoomCode}
        />
      </main>
    );
  }

  const inLobby = gameState.status === 'lobby';
  const waitingForOpponent = inLobby && !gameState.players.every(Boolean);
  const isPlaying =
    gameState.status === 'playing' ||
    gameState.status === 'countdown' ||
    gameState.status === 'paused';
  const isFinished = gameState.status === 'finished';

  if (inLobby) {
    return (
      <main className="app">
        <Lobby
          connected={connected}
          error={error}
          roomCode={gameState.roomCode}
          waiting={waitingForOpponent}
          onCreate={createRoom}
          onJoin={joinRoom}
          initialJoinCode={inviteRoomCode}
        />
      </main>
    );
  }

  return (
    <main className="app game">
      <header className="game-header">
        <div className="brand-lockup">
          <img className="brand-logo" src={logoSrc} alt="Word Crush Duel logo" />
          <h1>Word Crush Duel</h1>
        </div>
        <span className="room-pill">Room {gameState.roomCode}</span>
      </header>

      {gameState.status === 'countdown' && gameState.countdown !== null && (
        <div className="countdown-overlay">{gameState.countdown || 'Go!'}</div>
      )}

      {gameState.status === 'paused' && (
        <div className="pause-banner">Opponent disconnected — pausing…</div>
      )}

      <div className="game-layout">
        <Scoreboard
          gameState={gameState}
          playerId={playerId}
          selfName={self?.name ?? 'You'}
          opponentName={opponent?.name ?? 'Opponent'}
        />

        <TargetBar
          activeWords={gameState.activeWords}
          wordsFoundCount={gameState.wordsFoundCount}
          totalWords={totalWords}
          deferredWords={gameState.deferredWords}
        />

        {isPlaying && (
          <LetterGrid
            grid={gameState.grid}
            activeWords={gameState.activeWords}
            disabled={
              gameState.status !== 'playing' ||
              gameState.resolving ||
              gameState.cascadeAnimating
            }
            cascadeAnimating={gameState.cascadeAnimating}
            cascadeSteps={gameState.cascadeSteps}
            onSubmit={handleSubmit}
          />
        )}

        {isFinished && (
          <GameOver
            message={gameState.lastEvent?.message ?? 'Game over'}
            winnerId={gameState.winnerId}
            playerId={playerId}
            onRematch={rematch}
          />
        )}
      </div>
    </main>
  );
}
