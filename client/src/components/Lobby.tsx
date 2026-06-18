import { useEffect, useState } from 'react';
import { DEFAULT_WORD_SET_ID, MATCH_WORD_COUNT_OPTIONS, TOTAL_WORDS, WORD_SETS } from '@word-crush-duel/shared';

import { buildInviteLink, copyInviteLink } from '../lib/inviteLink';

type LobbyProps = {
  onCreate: (name: string, wordSetId?: string, totalWords?: number) => void;
  onJoin: (code: string, name: string) => void;
  connected: boolean;
  error: string | null;
  roomCode?: string;
  waiting?: boolean;
  initialJoinCode?: string | null;
};

const logoSrc = `${import.meta.env.BASE_URL}logo-word-crush-duel.png`;

export function Lobby({
  onCreate,
  onJoin,
  connected,
  error,
  roomCode,
  waiting,
  initialJoinCode,
}: LobbyProps) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(initialJoinCode ?? '');
  const [mode, setMode] = useState<'home' | 'join'>(initialJoinCode ? 'join' : 'home');
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [wordSetId, setWordSetId] = useState(DEFAULT_WORD_SET_ID);
  const [totalWords, setTotalWords] = useState(TOTAL_WORDS);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

  useEffect(() => {
    if (initialJoinCode) setJoinCode(initialJoinCode);
  }, [initialJoinCode]);

  useEffect(() => {
    if (roomCode) setInviteLink(buildInviteLink(roomCode));
  }, [roomCode]);

  useEffect(() => {
    if (error) setPendingAction(null);
  }, [error]);

  const canSubmit = name.trim().length > 0 && connected;
  const isBusy = pendingAction !== null;

  const handleCopyLink = async () => {
    if (!roomCode) return;
    const ok = await copyInviteLink(roomCode);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby card">
      <section className="lobby-brand-panel" aria-label="Word Crush Duel">
        <img className="brand-logo-full" src={logoSrc} alt="Word Crush Duel" />
        <p className="subtitle">Race to find words on a shifting word-search grid.</p>
      </section>

      <section className="lobby-control-panel">
        {!connected && <p className="status warn">Connecting to server...</p>}
        {error && <p className="status error">{error}</p>}

        {waiting && roomCode ? (
          <div className="waiting-box">
            <p className="panel-title">Invite your opponent</p>
            <label className="invite-link-field compact-invite">
              Share link
              <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
            </label>
            <button type="button" onClick={handleCopyLink}>
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
            <p className="hint">Send the link - they can join with one click.</p>
            <p className="hint fallback-code">Fallback code: {roomCode}</p>
            <p className="status">Waiting for opponent...</p>
          </div>
        ) : (
          <>
            {initialJoinCode && mode === 'join' && (
              <p className="hint">You were invited to room {initialJoinCode}. Enter your name to join.</p>
            )}

            <div className="identity-row">
              <label>
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  maxLength={16}
                />
              </label>

              {mode === 'home' && (
                <fieldset className="word-count-picker">
                  <legend>Words in game</legend>
                  <div className="word-count-options">
                    {MATCH_WORD_COUNT_OPTIONS.map((count) => (
                      <label key={count} className={`word-count-option ${totalWords === count ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="word-count"
                          value={count}
                          checked={totalWords === count}
                          onChange={() => setTotalWords(count)}
                        />
                        <span>{count}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            {mode === 'home' ? (
              <>
                <fieldset className="wordset-picker">
                  <legend>Word set</legend>
                  <div className="wordset-options">
                    {WORD_SETS.map((wordSet) => (
                      <label key={wordSet.id} className={`wordset-option ${wordSetId === wordSet.id ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="word-set"
                          value={wordSet.id}
                          checked={wordSetId === wordSet.id}
                          onChange={() => setWordSetId(wordSet.id)}
                        />
                        <span className="wordset-name">{wordSet.name}</span>
                        <span className="wordset-description">{wordSet.description}</span>
                        <span className="wordset-preview">{wordSet.pairs[0][0]} / {wordSet.pairs[0][1]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="lobby-actions horizontal-actions">
                  <button
                    disabled={!canSubmit || isBusy}
                    onClick={() => {
                      setPendingAction('create');
                      onCreate(name.trim(), wordSetId, totalWords);
                    }}
                  >
                    {pendingAction === 'create' ? 'Creating...' : 'Create Game'}
                  </button>
                  <button className="secondary" disabled={isBusy} onClick={() => setMode('join')}>
                    Join Game
                  </button>
                </div>
              </>
            ) : (
              <div className="join-form">
                <label>
                  Room code
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="6-char code"
                    maxLength={6}
                  />
                </label>
                <div className="lobby-actions horizontal-actions">
                  <button
                    disabled={!canSubmit || joinCode.trim().length < 4 || isBusy}
                    onClick={() => {
                      setPendingAction('join');
                      onJoin(joinCode.trim(), name.trim());
                    }}
                  >
                    {pendingAction === 'join' ? 'Joining...' : 'Join'}
                  </button>
                  <button className="secondary" disabled={isBusy} onClick={() => setMode('home')}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
