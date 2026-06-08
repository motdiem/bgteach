// Board model for the Pocket Backgammon Teacher.
//
// Everything is stored from the perspective of the player ON ROLL ("you").
// Points are absolute 1..24 in YOUR numbering:
//   - points 1..6   = your home board (you bear off at 0)
//   - point  24     = your back checkers (deepest in the opponent's home)
//   - your checkers move from high points toward 1, then off.
//   - the opponent moves the opposite way; an opponent checker sitting on your
//     point p is, in the opponent's own numbering, on point (25 - p).
//
// points[p] > 0  => that many of YOUR checkers on point p
// points[p] < 0  => that many OPPONENT checkers on point p
//
// This single coordinate frame makes engine conversion and rendering trivial.

export type CheckerPlay = { from: string; to: string }; // "1".."24" | "bar" | "off"
export type Play = CheckerPlay[];

export interface Board {
  /** index 1..24 used; index 0 unused. Positive = you, negative = opponent. */
  points: number[];
  youBar: number;
  oppBar: number;
  youOff: number;
  oppOff: number;
}

export function emptyBoard(): Board {
  return { points: new Array(25).fill(0), youBar: 0, oppBar: 0, youOff: 0, oppOff: 0 };
}

/** The standard backgammon starting position, from the on-roll player's view. */
export function startingPosition(): Board {
  const b = emptyBoard();
  // You (positive)
  b.points[24] = 2;
  b.points[13] = 5;
  b.points[8] = 3;
  b.points[6] = 5;
  // Opponent (negative) — mirror image
  b.points[1] = -2;
  b.points[12] = -5;
  b.points[17] = -3;
  b.points[19] = -5;
  return b;
}

export function cloneBoard(b: Board): Board {
  return {
    points: b.points.slice(),
    youBar: b.youBar,
    oppBar: b.oppBar,
    youOff: b.youOff,
    oppOff: b.oppOff,
  };
}

/** Total checkers on each side (should be 15 for a legal board). */
export function checkerCounts(b: Board): { you: number; opp: number } {
  let you = b.youBar + b.youOff;
  let opp = b.oppBar + b.oppOff;
  for (let p = 1; p <= 24; p++) {
    if (b.points[p] > 0) you += b.points[p];
    else if (b.points[p] < 0) opp += -b.points[p];
  }
  return { you, opp };
}

/** Pip count for both sides. You bear off at 0 (distance = point #). */
export function pipCount(b: Board): { you: number; opp: number } {
  let you = b.youBar * 25;
  let opp = b.oppBar * 25;
  for (let p = 1; p <= 24; p++) {
    const c = b.points[p];
    if (c > 0) you += c * p;
    else if (c < 0) opp += -c * (25 - p);
  }
  return { you, opp };
}

const N = (s: string) => parseInt(s, 10);

/**
 * Apply a full play (one die-use per CheckerPlay) for the player on roll,
 * returning a NEW board. Handles entering from the bar, bearing off, and hits.
 * Assumes the play is legal (the engine only ever returns legal plays).
 */
export function applyPlay(board: Board, play: Play): Board {
  const b = cloneBoard(board);
  for (const mv of play) {
    // remove a checker from the source
    if (mv.from === "bar") {
      b.youBar -= 1;
    } else {
      b.points[N(mv.from)] -= 1;
    }
    // place it on the destination
    if (mv.to === "off") {
      b.youOff += 1;
    } else {
      const to = N(mv.to);
      if (b.points[to] === -1) {
        // hit: send the lone opponent checker to the bar
        b.points[to] = 0;
        b.oppBar += 1;
      }
      b.points[to] += 1;
    }
  }
  return b;
}

/** Canonical string used to compare positions regardless of move notation. */
export function positionKey(b: Board): string {
  return `${b.points.slice(1, 25).join(",")}|yb${b.youBar}|ob${b.oppBar}|yo${b.youOff}|oo${b.oppOff}`;
}

export type PlayerLayout = Record<string, number>; // point/"bar" -> count
export interface EngineBoard {
  x: PlayerLayout; // the player on roll ("you")
  o: PlayerLayout; // the opponent
}

/** Convert the internal board to bgweb-api's per-player layout (you = "x"). */
export function toEngineBoard(b: Board): EngineBoard {
  const x: PlayerLayout = {};
  const o: PlayerLayout = {};
  for (let p = 1; p <= 24; p++) {
    const c = b.points[p];
    if (c > 0) x[String(p)] = c;
    else if (c < 0) o[String(25 - p)] = -c; // opponent's own numbering
  }
  if (b.youBar) x.bar = b.youBar;
  if (b.oppBar) o.bar = b.oppBar;
  return { x, o };
}

/** Swap perspective: the opponent becomes the player on roll. */
export function flipPerspective(b: Board): Board {
  const nb = emptyBoard();
  for (let p = 1; p <= 24; p++) {
    nb.points[25 - p] = -b.points[p];
  }
  nb.youBar = b.oppBar;
  nb.oppBar = b.youBar;
  nb.youOff = b.oppOff;
  nb.oppOff = b.youOff;
  return nb;
}

/** Human-readable point label, e.g. naming key points. */
export function pointName(p: number): string {
  if (p === 5) return "5-point";
  if (p === 7) return "bar-point";
  if (p === 20) return "20-point (golden anchor)";
  return `${p}-point`;
}
