type MeaningConsoleProps = {
  word: string | null;
  meaning: string | null;
  active: boolean;
  countdown: number | null;
};

export function MeaningConsole({ word, meaning, active, countdown }: MeaningConsoleProps) {
  return (
    <div className="meaning-console card" aria-live="polite">
      <div className="meaning-console-header">
        <span>Meaning</span>
      </div>

      {active && word && meaning ? (
        <div className="meaning-console-card" key={word}>
          <span className="meaning-word">{word}</span>
          <span className="meaning-text">{meaning}</span>
        </div>
      ) : countdown !== null ? (
        <div className="meaning-console-ready">
          <span className="meaning-ready-number">{countdown}</span>
          <span>Next words</span>
        </div>
      ) : word && meaning ? (
        <div className="meaning-console-muted">
          <span className="meaning-word small">{word}</span>
          <span>{meaning}</span>
        </div>
      ) : (
        <div className="meaning-console-muted">
          <span>Find a word</span>
          <span>Its meaning appears here.</span>
        </div>
      )}
    </div>
  );
}
