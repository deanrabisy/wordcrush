import { useState } from 'react';
import { MATCH_WORD_COUNT_OPTIONS, WORD_SETS } from '@word-crush-duel/shared';

type GameSettingsProps = {
  currentWordSetId: string;
  currentTotalWords: number;
  onApply: (wordSetId: string, totalWords: number) => Promise<void> | void;
  onClose: () => void;
};

export function GameSettings({ currentWordSetId, currentTotalWords, onApply, onClose }: GameSettingsProps) {
  const [wordSetId, setWordSetId] = useState(currentWordSetId);
  const [totalWords, setTotalWords] = useState(currentTotalWords);
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    setSaving(true);
    await onApply(wordSetId, totalWords);
    setSaving(false);
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="game-settings-title">
      <div className="game-settings card">
        <div className="settings-heading">
          <div>
            <h2 id="game-settings-title">Game settings</h2>
            <p>Choose the next word pack and match length.</p>
          </div>
          <button type="button" className="secondary settings-close" onClick={onClose} aria-label="Close settings">
            X
          </button>
        </div>

        <fieldset className="settings-wordsets">
          <legend>Word pack</legend>
          <div className="settings-wordset-grid">
            {WORD_SETS.map((set) => (
              <label key={set.id} className={`settings-wordset ${wordSetId === set.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="settings-word-set"
                  checked={wordSetId === set.id}
                  onChange={() => setWordSetId(set.id)}
                />
                <span>{set.name}</span>
                <small>{set.description}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="settings-count">
          <legend>Words in game</legend>
          <div className="word-count-options">
            {MATCH_WORD_COUNT_OPTIONS.map((count) => (
              <label key={count} className={`word-count-option ${totalWords === count ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="settings-word-count"
                  checked={totalWords === count}
                  onChange={() => setTotalWords(count)}
                />
                <span>{count}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="settings-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" onClick={apply} disabled={saving}>
            {saving ? 'Starting...' : 'Start new match'}
          </button>
        </div>
      </div>
    </div>
  );
}
