import { useEffect, useRef } from 'react';
import type { GameEvent } from '@word-crush-duel/shared';

function getAudioContext(): AudioContext | null {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextCtor ? new AudioContextCtor() : null;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, gain = 0.04): void {
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playEventSound(ctx: AudioContext, event: GameEvent): void {
  const now = ctx.currentTime;
  if (event.type === 'word_found') {
    tone(ctx, 440, now, 0.12, 0.05);
    tone(ctx, 660, now + 0.08, 0.16, 0.045);
    tone(ctx, 880, now + 0.18, 0.2, 0.04);
  } else if (event.type === 'invalid_selection') {
    tone(ctx, 180, now, 0.16, 0.035);
  } else if (event.type === 'game_over') {
    tone(ctx, 523, now, 0.18, 0.04);
    tone(ctx, 659, now + 0.16, 0.18, 0.04);
    tone(ctx, 784, now + 0.32, 0.28, 0.04);
  }
}

export function useSoundEffects(event: GameEvent | null | undefined, muted: boolean): void {
  const audioRef = useRef<AudioContext | null>(null);
  const lastEventRef = useRef<GameEvent | null>(null);

  useEffect(() => {
    if (!event || muted || event === lastEventRef.current) return;
    lastEventRef.current = event;
    audioRef.current ??= getAudioContext();
    const ctx = audioRef.current;
    if (!ctx) return;
    void ctx.resume().then(() => playEventSound(ctx, event)).catch(() => undefined);
  }, [event, muted]);
}
