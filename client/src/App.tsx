import { useCallback, useState } from 'react';
import { GameOver } from './components/GameOver';
import { LetterGrid } from './components/LetterGrid';
import { Lobby } from './components/Lobby';
import { Scoreboard, TargetBar } from './components/TargetBar';
import { useGameSocket } from './hooks/useGameSocket';
import { useSoundEffects } from './hooks/useSoundEffects';

const logoSrc = `${import.meta.env.BASE_URL}logo-round.png`;

export default function App() {
  const [soundMuted, setSoundMuted] = useState(() => window.localStorage.getItem('word-crush-muted') === 'true');
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
    previewSelection,
    rematch,
    resetGame,
    totalWords,
    inviteRoomCode,
  } = useGameSocket();
  useSoundEffects(gameState?.lastEvent, soundMuted);

  const handleSubmit = useCallback(
    (path: Parameters<typeof submitSelection>[1], word: string) => {
      if (!gameState) return;
      submitSelection(gameState.roomCode, path, word);
    },
    [gameState, submitSelection],
  );

  const handlePreviewSelection = useCallback(
    (path: Parameters<typeof previewSelection>[1]) => {
      if (!gameState) return;
      previewSelection(gameState.roomCode, path);
    },
    [gameState, previewSelection],
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
  const opponentPath = opponent ? gameState.selections?.[opponent.id]?.path ?? [] : [];
  const toggleSound = () => {
    setSoundMuted((current) => {
      const next = !current;
      window.localStorage.setItem('word-crush-muted', String(next));
      return next;
    });
  };

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
          <img className="brand-logo brand-logo-round" src={logoSrc} alt="Word Crush Duel logo" />
          <h1>Word Crush Duel</h1>
        </div>
        <div className="game-actions">
          <span className="room-pill">Room {gameState.roomCode}</span>
          <button type="button" className="secondary compact-button" onClick={resetGame}>
            Reset
          </button>
          <button type="button" className="secondary compact-button" onClick={toggleSound}>
            {soundMuted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </header>

      {gameState.status === 'countdown' && gameState.countdown !== null && (
        <div className="countdown-overlay">{gameState.countdown || 'Go!'}</div>
      )}

      {gameState.status === 'paused' && (
        <div className="pause-banner">Opponent disconnected - pausing...</div>
      )}

      <div className="game-layout">
        <aside className="side-panel left-panel">
          <Scoreboard
            gameState={gameState}
            playerId={playerId}
            selfName={self?.name ?? 'You'}
            opponentName={opponent?.name ?? 'Opponent'}
          />
        </aside>

        {isPlaying && (
          <LetterGrid
            grid={gameState.grid}
            activeWords={gameState.activeWords}
            opponentPath={opponentPath}
            disabled={
              gameState.status !== 'playing' ||
              gameState.resolving ||
              gameState.cascadeAnimating
            }
            cascadeAnimating={gameState.cascadeAnimating}
            cascadeSteps={gameState.cascadeSteps}
            onPreviewSelection={handlePreviewSelection}
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

        <aside className="side-panel right-panel">
          <TargetBar
            activeWords={gameState.activeWords}
            wordsFoundCount={gameState.wordsFoundCount}
            totalWords={totalWords}
            deferredWords={gameState.deferredWords}
          />
        </aside>
      </div>
    </main>
  );
}
