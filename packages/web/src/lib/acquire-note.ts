const ACQUIRE_NOTE_KEY = "fondof:acquire-note";

export function stashAcquireNote(note: string) {
  try {
    sessionStorage.setItem(ACQUIRE_NOTE_KEY, note);
  } catch {
    // ignore
  }
}

export function takeAcquireNote(): string | null {
  try {
    const n = sessionStorage.getItem(ACQUIRE_NOTE_KEY);
    if (n) sessionStorage.removeItem(ACQUIRE_NOTE_KEY);
    return n;
  } catch {
    return null;
  }
}
