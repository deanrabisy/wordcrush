type MeaningPopupProps = {
  word: string | null;
  meaning: string | null;
  visible: boolean;
};

export function MeaningPopup({ word, meaning, visible }: MeaningPopupProps) {
  if (!visible || !word || !meaning) return null;

  return (
    <div className="meaning-popup" role="status" aria-live="polite">
      <span className="meaning-word">{word}</span>
      <span className="meaning-text">{meaning}</span>
    </div>
  );
}
