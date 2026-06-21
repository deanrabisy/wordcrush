import { getWordMeaning, type FoundWordRecord, type Player } from '@word-crush-duel/shared';

type MeaningOverlayProps = {
  word: string | null;
  meaning: string | null;
  active: boolean;
};

export function MeaningOverlay({ word, meaning, active }: MeaningOverlayProps) {
  if (!active || !word || !meaning) return null;

  return (
    <div className="meaning-overlay" role="status" aria-live="assertive">
      <span className="meaning-overlay-word">{word}</span>
      <span className="meaning-overlay-text">{meaning}</span>
    </div>
  );
}

type MeaningConsoleProps = {
  history: FoundWordRecord[];
  players: [Player | null, Player | null];
};

export function MeaningConsole({ history, players }: MeaningConsoleProps) {
  return (
    <div className="meaning-console card" aria-live="polite">
      <div className="meaning-console-header">
        <span>Word meanings</span>
        <span>{history.length}</span>
      </div>

      <div className="meaning-history">
        {history.length === 0 ? (
          <div className="meaning-console-empty">
            Found words will appear here.
          </div>
        ) : (
          history.map((entry, index) => {
            const meaning = getWordMeaning(entry.word) ?? '';
            const playerIndex = entry.playerId === players[0]?.id ? 0 : 1;
            const playerName = players[playerIndex]?.name ?? `Player ${playerIndex + 1}`;

            return (
              <div className="meaning-history-row" key={`${entry.word}-${entry.foundAt}-${index}`} title={`Found by ${playerName}`}>
                <span className={`history-word player-${playerIndex + 1}`}>{entry.word}</span>
                <span className="history-connector" aria-hidden="true" />
                <span className="history-meaning">{meaning}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
