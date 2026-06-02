import { useEffect, useState } from 'react';

import { buildInviteLink, copyInviteLink } from '../lib/inviteLink';



type LobbyProps = {

  onCreate: (name: string) => void;

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



  useEffect(() => {

    if (initialJoinCode) setJoinCode(initialJoinCode);

  }, [initialJoinCode]);



  useEffect(() => {

    if (roomCode) setInviteLink(buildInviteLink(roomCode));

  }, [roomCode]);



  const canSubmit = name.trim().length > 0 && connected;



  const handleCopyLink = async () => {

    if (!roomCode) return;

    const ok = await copyInviteLink(roomCode);

    setCopied(ok);

    if (ok) window.setTimeout(() => setCopied(false), 2000);

  };



  return (

    <div className="lobby card">

      <div className="brand-lockup lobby-brand">
        <img className="brand-logo-full" src={logoSrc} alt="Word Crush Duel" />
      </div>

      <p className="subtitle">Race to find words on a shifting word-search grid.</p>



      {!connected && <p className="status warn">Connecting to server...</p>}

      {error && <p className="status error">{error}</p>}



      {waiting && roomCode ? (

        <div className="waiting-box">

          <p>Invite your opponent</p>

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



          <label>

            Your name

            <input

              value={name}

              onChange={(e) => setName(e.target.value)}

              placeholder="Enter name"

              maxLength={16}

            />

          </label>



          {mode === 'home' ? (

            <div className="lobby-actions">

              <button disabled={!canSubmit} onClick={() => onCreate(name.trim())}>

                Create Game

              </button>

              <button className="secondary" onClick={() => setMode('join')}>

                Join Game

              </button>

            </div>

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

              <div className="lobby-actions">

                <button

                  disabled={!canSubmit || joinCode.trim().length < 4}

                  onClick={() => onJoin(joinCode.trim(), name.trim())}

                >

                  Join

                </button>

                <button className="secondary" onClick={() => setMode('home')}>

                  Back

                </button>

              </div>

            </div>

          )}

        </>

      )}

    </div>

  );

}


