/** Build a shareable invite URL for the current room. */
export function buildInviteLink(roomCode: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('room', roomCode.toUpperCase());
  return url.toString();
}

/** Read room code from ?room=XXXXXX in the URL. */
export function getRoomCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('room');
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return normalized.length >= 4 ? normalized : null;
}

export async function copyInviteLink(roomCode: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildInviteLink(roomCode));
    return true;
  } catch {
    return false;
  }
}
