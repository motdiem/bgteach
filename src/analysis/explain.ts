// The explanation generator. The engine decides which move is best and the
// exact equity of every move; this module turns those numbers — plus the
// positional feature deltas a move produces — into plain-English coaching.

import { applyPlay, Board, pointName } from "../engine/board";
import { formatPlay } from "../engine/moves";
import { EngineMove } from "../engine/gnubg";
import { extractFeatures, Features } from "./features";
import { classifyPhase } from "./phase";
import { lookupOpening } from "./openingBook";
import { shotsAt } from "./shots";

export interface MoveExplanation {
  notation: string;
  /** Short headline, e.g. "Make the 5-point". */
  headline: string;
  /** Paragraphs of explanation. */
  paragraphs: string[];
  /** Bullet reasons (positives and risks). */
  points: string[];
  /** Stats line: equity + win/gammon. */
  stats: string;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function statsLine(m: EngineMove): string {
  const p = m.evaluation.probability;
  return `Equity ${m.evaluation.eq.toFixed(3)} · wins ${pct(p.win)} (gammons ${pct(p.winG)})`;
}

/** Severity wording for an equity loss (gnubg-style thresholds). */
function severity(loss: number): { word: string; adjective: string } {
  if (loss < 0.02) return { word: "essentially as good", adjective: "negligible" };
  if (loss < 0.04) return { word: "slightly worse", adjective: "a small inaccuracy" };
  if (loss < 0.08) return { word: "worse", adjective: "a clear mistake" };
  if (loss < 0.16) return { word: "much worse", adjective: "a bad error" };
  return { word: "far worse", adjective: "a serious blunder" };
}

/** Things a move accomplishes, comparing the position before and after. */
function accomplishments(board: Board, after: Board, fb: Features, fa: Features): string[] {
  const out: string[] = [];

  // Points made.
  const madeNow = fa.ownedPoints.filter((p) => !fb.ownedPoints.includes(p));
  for (const p of madeNow) {
    if (p === 5) out.push("makes your **5-point** — the golden point, the most valuable point on the board");
    else if (p === 7) out.push("makes your **bar-point**, extending your blockade");
    else if (p === 20) out.push("makes the **20-point**, the golden advanced anchor in the opponent's home board");
    else if (p === 4 || p === 6) out.push(`makes your **${pointName(p)}**, a strong home-board point`);
    else if (p >= 18) out.push(`makes an **advanced anchor** on your ${p}-point`);
    else out.push(`makes your **${pointName(p)}**`);
  }

  // Hits.
  const hits = after.oppBar - board.oppBar;
  if (hits === 1) out.push("**hits a blot**, sending an opponent checker to the bar and gaining tempo");
  else if (hits > 1) out.push(`**hits ${hits} blots**, sending two opponent checkers to the bar`);

  // Escaping back checkers.
  if (fa.backCheckers < fb.backCheckers) {
    const n = fb.backCheckers - fa.backCheckers;
    out.push(`**escapes ${n === 1 ? "a back checker" : `${n} back checkers`}** from the opponent's home board`);
  }

  // Bearing off.
  if (fa.youOff > fb.youOff) {
    out.push(`bears off ${fa.youOff - fb.youOff} checker${fa.youOff - fb.youOff > 1 ? "s" : ""}`);
  }

  // Prime growth.
  if (fa.primeLength > fb.primeLength && fa.primeLength >= 3) {
    out.push(`extends your blockade to a **${fa.primeLength}-point wall**`);
  }

  // Builders / flexibility (only worth mentioning if nothing flashier happened).
  if (out.length === 0 && fa.builders > fb.builders) {
    out.push("brings down builders, adding flexibility to make a new point next turn");
  }

  return out;
}

/** Risks/downsides of the resulting position. */
function risks(fa: Features): string[] {
  const out: string[] = [];

  if (fa.blots.length > 0) {
    const sorted = [...fa.blots].sort((a, b) => b.shots - a.shots);
    const worst = sorted[0];
    if (fa.blots.length === 1) {
      if (worst.shots > 0)
        out.push(`leaves a blot on the ${worst.point}-point, exposed to **${worst.shots} of 36** rolls`);
    } else {
      out.push(
        `leaves ${fa.blots.length} blots; the most exposed (the ${worst.point}-point) can be hit by **${worst.shots} of 36** rolls`
      );
    }
  }

  if (fa.youBar > 0) out.push(`leaves ${fa.youBar} checker(s) on the bar`);

  return out;
}

/** Build a full explanation for a single move (used for the best move too). */
export function explainMove(board: Board, move: EngineMove, dice: [number, number], isBest: boolean): MoveExplanation {
  const notation = formatPlay(board, move.play);
  const after = applyPlay(board, move.play);
  const fb = extractFeatures(board);
  const fa = extractFeatures(after);
  const phase = classifyPhase(board, fb);

  const paragraphs: string[] = [];
  let headline = notation;

  // Opening book takes precedence for the recommended play from the start.
  const opening = lookupOpening(board, dice);
  if (opening && isBest) {
    headline = opening.title;
    paragraphs.push(opening.prose);
    if (opening.alternatives) paragraphs.push(opening.alternatives);
  } else {
    paragraphs.push(`${phase.label}: ${phase.description}`);
  }

  const pos = accomplishments(board, after, fb, fa);
  const neg = risks(fa);
  const points = [...pos, ...neg];

  if (!opening || !isBest) {
    // Compose a short rationale paragraph from the structured points.
    if (pos.length > 0) {
      const lead = isBest ? "This is the engine's top choice because it " : "This play ";
      paragraphs.push(lead + joinClauses(pos) + ".");
    }
    if (neg.length > 0) {
      paragraphs.push("Downside: it " + joinClauses(neg) + ".");
    }
    if (pos.length === 0 && neg.length === 0) {
      paragraphs.push("A quiet developing play with no points made and nothing left exposed.");
    }
  }

  return { notation, headline, paragraphs, points, stats: statsLine(move) };
}

/** Explain why an alternative is worse than the engine's best move. */
export function explainAlternative(
  board: Board,
  best: EngineMove,
  alt: EngineMove,
  _dice?: [number, number]
): MoveExplanation {
  const notation = formatPlay(board, alt.play);
  const bestNotation = formatPlay(board, best.play);
  const loss = -alt.evaluation.diff; // diff is <= 0
  const sev = severity(loss);

  const afterAlt = applyPlay(board, alt.play);
  const afterBest = applyPlay(board, best.play);
  const fb = extractFeatures(board);
  const faAlt = extractFeatures(afterAlt);
  const faBest = extractFeatures(afterBest);

  const paragraphs: string[] = [];

  const winDelta = best.evaluation.probability.win - alt.evaluation.probability.win;
  if (loss < 0.02) {
    paragraphs.push(
      `**${notation}** is ${sev.word} as **${bestNotation}** — only ${loss.toFixed(3)} equity behind. This is a fine alternative; pick whichever you prefer.`
    );
  } else {
    paragraphs.push(
      `**${notation}** is ${sev.word} than the best play **${bestNotation}** — it costs about **${loss.toFixed(
        3
      )} equity** (${sev.adjective}), dropping your winning chances by roughly **${pct(Math.max(0, winDelta))}**.`
    );
  }

  // What the best move does that this one doesn't.
  const bestMade = faBest.ownedPoints.filter((p) => !fb.ownedPoints.includes(p));
  const altMade = faAlt.ownedPoints.filter((p) => !fb.ownedPoints.includes(p));
  const missedPoints = bestMade.filter((p) => !altMade.includes(p));
  const reasons: string[] = [];
  for (const p of missedPoints) {
    reasons.push(`the best play makes your **${pointName(p)}**, which this move gives up`);
  }

  // Extra exposure compared with best.
  const altWorstShots = faAlt.blots.length ? Math.max(...faAlt.blots.map((b) => b.shots)) : 0;
  const bestWorstShots = faBest.blots.length ? Math.max(...faBest.blots.map((b) => b.shots)) : 0;
  if (faAlt.blots.length > faBest.blots.length || altWorstShots > bestWorstShots + 2) {
    if (altWorstShots > 0) {
      reasons.push(
        `it leaves more shots — your most exposed blot can be hit by **${altWorstShots} of 36** rolls (vs ${bestWorstShots} for the best play)`
      );
    }
  }

  // Hits given up.
  const bestHits = afterBest.oppBar - board.oppBar;
  const altHits = afterAlt.oppBar - board.oppBar;
  if (bestHits > altHits) {
    reasons.push("the best play hits a blot for tempo, while this one doesn't");
  }

  // Back checkers stuck.
  if (faAlt.backCheckers > faBest.backCheckers) {
    reasons.push("it leaves more checkers stuck in the back");
  }

  if (reasons.length > 0 && loss >= 0.02) {
    paragraphs.push("Specifically, " + joinClauses(reasons) + ".");
  }

  const points = [...accomplishments(board, afterAlt, fb, faAlt), ...risks(faAlt)];

  return { notation, headline: `Why not ${notation}?`, paragraphs, points, stats: statsLine(alt) };
}

function joinClauses(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Re-export for callers that want raw shot data.
export { shotsAt };
