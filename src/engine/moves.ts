// Move notation, position-based matching, and tap-to-move step generation.
//
// All of these lean on the engine's list of legal candidate plays, so we never
// re-implement backgammon's legality rules (use-both-dice, max-dice, doubles).

import { applyPlay, Board, cloneBoard, Play, positionKey } from "./board";
import { EngineMove } from "./gnubg";

const N = (s: string) => parseInt(s, 10);

/** Apply a single hop and report whether it hit a blot (for notation). */
function applyHopWithHit(b: Board, hop: { from: string; to: string }): boolean {
  let hit = false;
  if (hop.from === "bar") b.youBar -= 1;
  else b.points[N(hop.from)] -= 1;
  if (hop.to === "off") {
    b.youOff += 1;
  } else {
    const to = N(hop.to);
    if (b.points[to] === -1) {
      hit = true;
      b.points[to] = 0;
      b.oppBar += 1;
    }
    b.points[to] += 1;
  }
  return hit;
}

interface Segment {
  from: string;
  to: string;
  hit: boolean;
}

/**
 * Convert an engine play into standard human notation, e.g.
 *   [{24,18},{18,13}]            -> "24/13"
 *   [{13,7},{13,7}]              -> "13/7(2)"
 *   [{bar,20}] hitting           -> "bar/20*"
 */
export function formatPlay(board: Board, play: Play): string {
  // Detect hits hop-by-hop on a working copy.
  const work = cloneBoard(board);
  const hops: Segment[] = play.map((h) => ({ from: h.from, to: h.to, hit: applyHopWithHit(work, h) }));

  // Merge chained hops belonging to one travelling checker (a.to === b.from).
  const segments: Segment[] = [];
  for (const hop of hops) {
    const prev = segments.find((s) => s.to === hop.from && s.to !== "off");
    if (prev) {
      prev.to = hop.to;
      prev.hit = prev.hit || hop.hit;
    } else {
      segments.push({ ...hop });
    }
  }

  // Group identical segments into "from/to(xN)" with a hit marker.
  const groups = new Map<string, { seg: Segment; count: number }>();
  const order: string[] = [];
  for (const s of segments) {
    const key = `${s.from}/${s.to}${s.hit ? "*" : ""}`;
    if (!groups.has(key)) {
      groups.set(key, { seg: s, count: 0 });
      order.push(key);
    }
    groups.get(key)!.count += 1;
  }

  return order
    .map((key) => {
      const { seg, count } = groups.get(key)!;
      const base = `${seg.from}/${seg.to}${seg.hit ? "*" : ""}`;
      return count > 1 ? `${base}(${count})` : base;
    })
    .join(" ");
}

/** Find the engine move whose resulting position matches the given play. */
export function matchMove(board: Board, play: Play, candidates: EngineMove[]): EngineMove | null {
  const target = positionKey(applyPlay(board, play));
  return candidates.find((c) => positionKey(applyPlay(board, c.play)) === target) ?? null;
}

/** All distinct orderings of a play's hops (small: <=24 for doubles). */
function orderings<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of orderings(rest)) {
      const candidate = [arr[i], ...perm];
      const k = candidate.map((h: any) => `${h.from}>${h.to}`).join("|");
      if (!seen.has(k)) {
        seen.add(k);
        out.push(candidate);
      }
    }
  }
  return out;
}

/** Board-state sequence produced by applying each hop of a play in order. */
function stateSequence(board: Board, play: Play): string[] {
  const keys: string[] = [];
  let b = board;
  for (const hop of play) {
    b = applyPlay(b, [hop]);
    keys.push(positionKey(b));
  }
  return keys;
}

/**
 * Given the chosen hops so far (`pending`), return the set of legal next hops
 * for tap-to-move, derived from the candidate plays. Returns an empty array
 * when the move is already complete.
 */
export function nextSteps(board: Board, candidates: EngineMove[], pending: Play): { from: string; to: string }[] {
  const pendingKeys = stateSequence(board, pending);
  const result = new Map<string, { from: string; to: string }>();

  for (const cand of candidates) {
    if (cand.play.length <= pending.length) continue;
    for (const ord of orderings(cand.play)) {
      const seq = stateSequence(board, ord);
      // Does this ordering reproduce the pending prefix exactly?
      let ok = true;
      for (let i = 0; i < pending.length; i++) {
        if (seq[i] !== pendingKeys[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const next = ord[pending.length];
        result.set(`${next.from}>${next.to}`, { from: next.from, to: next.to });
      }
    }
  }
  return [...result.values()];
}

/** True once the pending hops form a complete legal move. */
export function isComplete(board: Board, candidates: EngineMove[], pending: Play): boolean {
  return matchMove(board, pending, candidates) !== null && nextSteps(board, candidates, pending).length === 0;
}
