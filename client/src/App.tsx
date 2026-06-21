import { useCallback, useEffect, useState } from 'react';
import { getWordMeaning, type SelectionStatus } from '@word-crush-duel/shared';
import { GameOver } from './components/GameOver';
import { GameSettings } from './components/GameSettings';
import { LetterGrid } from './components/LetterGrid';
import { Lobby } from './components/Lobby';
import { MeaningConsole, MeaningOverlay } from './components/MeaningPopup';
import { QuizOverlay } from './components/QuizOverlay';
import { TargetBar } from './components/TargetBar';
import { useGameSocket } from './hooks/useGameSocket';
import { useSoundEffects } from './hooks/useSoundEffects';

const logoSrc = `${import.meta.env.BASE_URL}logo-round.png`;
const ownerLogoSrc = `${import.meta.env.BASE_URL}logo.png`;

export default function App() {
  const [soundMuted, setSoundMuted] = useState(() => window.localStorage.getItem('word-crush-muted') === 'true');
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    connected,
    gameState,
    error,
    playerId,
    opponent,
    createRoom,
    joinRoom,
    submitSelection,
    previewSelection,
    submitQuizAnswer,
    rematch,
    resetGame,
    updateGameSettings,
    totalWords,
    inviteRoomCode,
  } = useGameSocket();
  useSoundEffects(gameState?.lastEvent, soundMuted);
  const foundWord = gameState?.lastEvent?.type === 'word_found' ? gameState.lastEvent.word ?? null : null;
  const foundMeaning = getWordMeaning(foundWord);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    const needsClock = Boolean(gameState?.roundReadyUntil || gameState?.meaningUntil);
    if (!needsClock) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(timer);
  }, [gameState?.roundReadyUntil, gameState?.meaningUntil]);

  const handleSubmit = useCallback(
    (path: Parameters<typeof submitSelection>[1], word: string) => {
      if (!gameState) return;
      submitSelection(gameState.roomCode, path, word);
    },
    [gameState, submitSelection],
  );

  const handlePreviewSelection = useCallback(
    (path: Parameters<typeof previewSelection>[1], status?: SelectionStatus) => {
      if (!gameState) return;
      previewSelection(gameState.roomCode, path, status);
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
  const opponentSelection = opponent ? gameState.selections?.[opponent.id] ?? null : null;
  const isHost = gameState.players[0]?.id === playerId;
  const meaningActive = Boolean(
    foundWord &&
      foundMeaning &&
      !gameState.cascadeAnimating &&
      gameState.meaningUntil &&
      now < gameState.meaningUntil,
  );
  const roundLocked = Boolean(
    gameState.roundReadyUntil &&
      gameState.status === 'playing' &&
      now < gameState.roundReadyUntil,
  );
  const quizActive = Boolean(
    gameState.quiz &&
      now >= gameState.quiz.startsAt &&
      now < gameState.quiz.endsAt,
  );
  const countdownStartsAt = gameState.quiz?.endsAt ?? gameState.meaningUntil;
  const countdownActive = Boolean(
    roundLocked &&
      (!countdownStartsAt || now >= countdownStartsAt),
  );
  const roundCountdown = countdownActive && gameState.roundReadyUntil
    ? Math.max(1, Math.ceil((gameState.roundReadyUntil - now) / 1000))
    : null;
  const intermissionActive = Boolean(
    !gameState.cascadeAnimating &&
      (roundLocked || gameState.status === 'countdown'),
  );
  const visibleMeaningHistory = meaningActive
    ? gameState.wordHistory.slice(0, -1)
    : gameState.wordHistory;
  const toggleSound = () => {
    setSoundMuted((current) => {
      const next = !current;
      window.localStorage.setItem('word-crush-muted', String(next));
      return next;
    });
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen();
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
      {gameState.status === 'paused' && (
        <div className="pause-banner">Opponent disconnected - pausing...</div>
      )}

      <div className="game-layout">
        <aside className="game-control-rail">
          <div className="brand-lockup game-brand-lockup">
          <img className="brand-logo brand-logo-round" src={logoSrc} alt="Word Crush Duel logo" />
          <h1>Word Crush Duel</h1>
          </div>
          <div className="game-actions vertical-actions">
          {isHost && (
            <button type="button" className="secondary compact-button" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
          )}
          <button type="button" className="secondary compact-button" onClick={resetGame}>
            Reset
          </button>
          <button type="button" className="secondary compact-button" onClick={toggleFullscreen}>
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
          <button type="button" className="secondary compact-button" onClick={toggleSound}>
            {soundMuted ? 'Sound off' : 'Sound on'}
          </button>
          </div>
        </aside>

        <section className="board-stage">
          <TargetBar
            activeWords={gameState.activeWords}
          />

          <div className={`board-wrap ${intermissionActive ? 'intermission' : ''}`}>
            <MeaningOverlay word={foundWord} meaning={foundMeaning} active={meaningActive} />
            {quizActive && gameState.quiz && (
              <QuizOverlay
                quiz={gameState.quiz}
                playerId={playerId}
                now={now}
                onAnswer={submitQuizAnswer}
              />
            )}
            {isPlaying && (
              <>
                {gameState.status === 'countdown' && gameState.countdown !== null && (
                  <div className="round-countdown-overlay">{gameState.countdown || 'Go!'}</div>
                )}
                {roundCountdown !== null && (
                  <div className="round-countdown-overlay">{roundCountdown}</div>
                )}
                <LetterGrid
                  grid={gameState.grid}
                  activeWords={gameState.activeWords}
                  opponentSelection={opponentSelection}
                  disabled={
                    gameState.status !== 'playing' ||
                    gameState.resolving ||
                    gameState.cascadeAnimating ||
                    roundLocked
                  }
                  cascadeAnimating={gameState.cascadeAnimating}
                  cascadeSteps={gameState.cascadeSteps}
                  onPreviewSelection={handlePreviewSelection}
                  onSubmit={handleSubmit}
                />
              </>
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
        </section>

        <aside className="side-panel right-panel">
          <MeaningConsole
            history={visibleMeaningHistory}
            players={gameState.players}
            scores={gameState.scores}
            wordsFoundCount={gameState.wordsFoundCount}
            totalWords={totalWords}
          />
        </aside>
      </div>
      {settingsOpen && isHost && (
        <GameSettings
          currentWordSetId={gameState.wordSetId}
          currentTotalWords={gameState.totalWords}
          onClose={() => setSettingsOpen(false)}
          onApply={async (wordSetId, selectedTotalWords) => {
            await updateGameSettings(wordSetId, selectedTotalWords);
            setSettingsOpen(false);
          }}
        />
      )}
      <img className="owner-mark" src={ownerLogoSrc} alt="Adaptive Dean Design" />
    </main>
  );
}
