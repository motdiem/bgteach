// Shot counting: how many of the 36 dice rolls let the OPPONENT hit one of
// YOUR blots on their next turn.
//
// Frame of reference (see board.ts): you move from high points toward 1; the
// opponent moves from low points toward 24 and enters from the bar onto your
// points 1..6 (pseudo-source point 0). You "block" a point when you own it
// (>= 2 of your checkers there).

import { Board } from "../engine/board";

/** Points where you have exactly one checker (a blot the opponent could hit). */
export function listBlots(b: Board): number[] {
  const blots: number[] = [];
  for (let p = 1; p <= 24; p++) if (b.points[p] === 1) blots.push(p);
  return blots;
}

function blocked(b: Board, k: number): boolean {
  return k >= 1 && k <= 24 && b.points[k] >= 2;
}

/** Opponent source points: on-board checkers plus the bar (pseudo-point 0). */
function oppSources(b: Board): number[] {
  const src: number[] = [];
  if (b.oppBar > 0) src.push(0);
  for (let q = 1; q <= 24; q++) if (b.points[q] < 0) src.push(q);
  return src;
}

/** Can the opponent travel from q to target p using the dice values in order? */
function reaches(b: Board, q: number, p: number, dice: number[]): boolean {
  let pos = q;
  for (let i = 0; i < dice.length; i++) {
    pos += dice[i];
    if (pos > 24) return false; // overshot the board
    const isFinal = i === dice.length - 1;
    if (isFinal) {
      if (pos !== p) return false;
    } else if (blocked(b, pos)) {
      return false; // intermediate landing blocked
    }
  }
  return pos === p;
}

/** Die sequences available for a roll (single die, both dice, doubles up to 4). */
function sequences(d1: number, d2: number): number[][] {
  if (d1 === d2) return [[d1], [d1, d1], [d1, d1, d1], [d1, d1, d1, d1]];
  return [[d1], [d2], [d1, d2], [d2, d1]];
}

/** Does roll (d1,d2) let the opponent hit any of the target blots? */
function rollHits(b: Board, targets: number[], srcs: number[], d1: number, d2: number): boolean {
  const seqs = sequences(d1, d2);
  for (const p of targets) {
    for (const q of srcs) {
      for (const seq of seqs) {
        if (reaches(b, q, p, seq)) return true;
      }
    }
  }
  return false;
}

/** Number of the 36 rolls that hit the blot on point `p`. */
export function shotsAt(b: Board, p: number): number {
  const srcs = oppSources(b);
  let count = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      if (rollHits(b, [p], srcs, d1, d2)) count++;
    }
  }
  return count;
}

/** Number of the 36 rolls that hit ANY of your blots (the union). */
export function shotsHittingAny(b: Board): number {
  const targets = listBlots(b);
  if (targets.length === 0) return 0;
  const srcs = oppSources(b);
  let count = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      if (rollHits(b, targets, srcs, d1, d2)) count++;
    }
  }
  return count;
}
