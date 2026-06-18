import type { PublicGameState } from '@word-crush-duel/shared';

type TargetBarProps = {
  activeWords: string[];
  wordsFoundCount: number;
  totalWords: number;
  deferredWords: string[];
};

export function TargetBar({
  activeWords,
  wordsFoundCount,
  totalWords,
  deferredWords,
}: TargetBarProps) {
  const uniqueActive = [...new Set(activeWords)];

  return (
    <div className={`target-bar card ${uniqueActive.length === 1 ? 'single-target' : ''}`}>
      <div className="target-header">
        <span className="progress">
          {wordsFoundCount}/{totalWords} words found
        </span>
        {deferredWords.length > 0 && (
          <span className="deferred-badge">{deferredWords.length} waiting to return</span>
        )}
      </div>
      <div className="target-words">
        {uniqueActive.map((word, index) => (
          <div key={word} className="target-slot">
            <div className="slot-window">
              <div className="slot-reel" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="slot-word ghost">{word}</span>
                <span className="slot-word">{word}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ScoreboardProps = {
  gameState: PublicGameState;
  playerId: string | null;
  selfName: string;
  opponentName: string;
};

export function Scoreboard({ gameState, playerId, selfName, opponentName }: ScoreboardProps) {
  const selfScore = playerId ? gameState.scores[playerId] ?? 0 : 0;
  const opponent = gameState.players.find((p) => p && p.id !== playerId);
  const opponentScore = opponent ? gameState.scores[opponent.id] ?? 0 : 0;

  return (
    <div className="scoreboard card">
      <div className="score-row">
        <span className="player-name you">{selfName}</span>
        <span className="score">{selfScore}</span>
      </div>
      <div className="score-row">
        <span className="player-name">{opponentName}</span>
        <span className="score">{opponentScore}</span>
      </div>
      {gameState.lastEvent?.message && (
        <p className="event-message">{gameState.lastEvent.message}</p>
      )}
    </div>
  );
}
