// Spaced-repetition scheduling (SM-2). Pure functions, no I/O — easy to test.
//
// A card tracks how well you know one saved position. After each review you
// supply a quality 0..5 (5 = perfect recall); the algorithm updates the ease
// factor, the interval, and the next due date.

export interface SrsCard {
  /** Matches the HistoryEntry id this card reviews. */
  id: string;
  /** Easiness factor (>= 1.3). */
  ease: number;
  /** Current interval in days. */
  intervalDays: number;
  /** Next review time (epoch ms). */
  due: number;
  /** Successful reviews in a row. */
  reps: number;
  /** Times the card was failed. */
  lapses: number;
  /** Last quality graded (for display). */
  lastGrade?: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** A brand-new card, due immediately. */
export function newCard(id: string, now: number = Date.now()): SrsCard {
  return { id, ease: 2.5, intervalDays: 0, due: now, reps: 0, lapses: 0 };
}

/**
 * Apply an SM-2 review. `quality` is 0..5; below 3 is a lapse (the card is
 * relearned soon). Returns a new card (does not mutate).
 */
export function grade(card: SrsCard, quality: number, now: number = Date.now()): SrsCard {
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  if (q < 3) {
    // Lapse: reset progress, show again in ~10 minutes, nudge ease down.
    return {
      ...card,
      reps: 0,
      intervalDays: 0,
      lapses: card.lapses + 1,
      ease: Math.max(1.3, card.ease - 0.2),
      due: now + 10 * 60 * 1000,
      lastGrade: q,
    };
  }

  const reps = card.reps + 1;
  let intervalDays: number;
  if (reps === 1) intervalDays = 1;
  else if (reps === 2) intervalDays = 6;
  else intervalDays = Math.max(1, Math.round(card.intervalDays * card.ease));

  // Standard SM-2 ease update.
  const ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return { ...card, reps, intervalDays, ease, due: now + intervalDays * DAY, lastGrade: q };
}

/**
 * Map an equity loss (how much worse than the engine's best your move is) to an
 * SM-2 quality. The engine supplies the loss, so this is the only place the
 * coaching thresholds live.
 */
export function equityLossToQuality(loss: number): number {
  if (loss <= 0.002) return 5; // the best move (or a true tie)
  if (loss < 0.02) return 4; // negligible
  if (loss < 0.05) return 3; // a small inaccuracy — still a pass
  if (loss < 0.1) return 2; // a clear mistake
  return 1; // a blunder
}

/** Human label for a quality score, used in quiz feedback. */
export function verdict(quality: number): { label: string; tone: "good" | "ok" | "bad" } {
  if (quality >= 5) return { label: "Perfect — the best move!", tone: "good" };
  if (quality === 4) return { label: "Great — essentially best", tone: "good" };
  if (quality === 3) return { label: "Close — a small inaccuracy", tone: "ok" };
  if (quality === 2) return { label: "A clear mistake", tone: "bad" };
  return { label: "A blunder", tone: "bad" };
}

/** Short "due in…" description for a card. */
export function dueLabel(card: SrsCard, now: number = Date.now()): string {
  const ms = card.due - now;
  if (ms <= 0) return "due now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}
