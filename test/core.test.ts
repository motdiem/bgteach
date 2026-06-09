import { describe, it, expect } from "vitest";
import {
  applyPlay,
  checkerCounts,
  emptyBoard,
  flipPerspective,
  pipCount,
  positionKey,
  startingPosition,
  toEngineBoard,
} from "../src/engine/board";
import { formatPlay, matchMove, nextSteps } from "../src/engine/moves";
import { shotsAt } from "../src/analysis/shots";
import { extractFeatures } from "../src/analysis/features";
import { applyNotation } from "../src/engine/board";
import { lookupOpening, lookupSecondRoll, OPENING_BEST, SECOND_ROLL } from "../src/analysis/openingBook";
import { equityLossToQuality, grade, newCard } from "../src/state/srs";
import type { EngineMove } from "../src/engine/gnubg";

const fakeMove = (play: any[]): EngineMove => ({
  play,
  evaluation: { eq: 0, diff: 0, info: { cubeful: false, plies: 0 }, probability: { win: 0.5, winG: 0, winBG: 0, lose: 0.5, loseG: 0, loseBG: 0 } },
});

describe("board model", () => {
  it("standard start has pip count 167 each", () => {
    const p = pipCount(startingPosition());
    expect(p.you).toBe(167);
    expect(p.opp).toBe(167);
  });

  it("standard start has 15 checkers per side", () => {
    const c = checkerCounts(startingPosition());
    expect(c.you).toBe(15);
    expect(c.opp).toBe(15);
  });

  it("toEngineBoard mirrors both sides correctly", () => {
    const eb = toEngineBoard(startingPosition());
    expect(eb.x).toEqual({ "6": 5, "8": 3, "13": 5, "24": 2 });
    expect(eb.o).toEqual({ "6": 5, "8": 3, "13": 5, "24": 2 });
  });

  it("applyPlay makes the 5-point with 8/5 6/5", () => {
    const after = applyPlay(startingPosition(), [
      { from: "8", to: "5" },
      { from: "6", to: "5" },
    ]);
    expect(after.points[5]).toBe(2);
    expect(after.points[8]).toBe(2);
    expect(after.points[6]).toBe(4);
  });

  it("applyPlay hits a lone opponent checker", () => {
    const b = emptyBoard();
    b.points[10] = 1; // your checker
    b.points[7] = -1; // opponent blot
    const after = applyPlay(b, [{ from: "10", to: "7" }]);
    expect(after.points[7]).toBe(1);
    expect(after.oppBar).toBe(1);
  });

  it("flipPerspective swaps pip counts", () => {
    const start = startingPosition();
    const flipped = flipPerspective(start);
    const p = pipCount(flipped);
    expect(p.you).toBe(167);
    expect(p.opp).toBe(167);
  });
});

describe("shot counting", () => {
  it("a blot 6 pips in front of a lone opponent checker is hit by 17 of 36", () => {
    const b = emptyBoard();
    b.points[24] = 1; // your blot
    b.points[18] = -1; // opponent checker 6 away (opponent moves 18 -> 24)
    expect(shotsAt(b, 24)).toBe(17);
  });

  it("a blot 2 pips away (one intermediate open) is hit by 12 of 36", () => {
    const b = emptyBoard();
    b.points[20] = 1; // your blot
    b.points[18] = -1; // opponent 2 away
    // direct 2s (11) + (1,1) via 18->19->20 (1) = 12
    expect(shotsAt(b, 20)).toBe(12);
  });

  it("blocking the intermediate point removes indirect shots", () => {
    const b = emptyBoard();
    b.points[20] = 1;
    b.points[18] = -1;
    b.points[19] = 2; // you own 19, blocking the (1,1) route
    expect(shotsAt(b, 20)).toBe(11); // only direct 2s
  });

  it("no opponent in range means no shots", () => {
    const b = emptyBoard();
    b.points[5] = 1; // your blot deep in your home
    b.points[24] = -1; // opponent far away, moving the other direction
    expect(shotsAt(b, 5)).toBe(0);
  });
});

describe("move matching & notation", () => {
  it("matchMove identifies a move regardless of notation (24/13 == 24/18 18/13)", () => {
    const start = startingPosition();
    const candidates = [
      fakeMove([{ from: "8", to: "5" }, { from: "6", to: "5" }]),
      fakeMove([{ from: "24", to: "18" }, { from: "18", to: "13" }]),
    ];
    // user expresses it as a single combined hop
    const m = matchMove(start, [{ from: "24", to: "13" }], candidates);
    expect(m).toBe(candidates[1]);
  });

  it("formatPlay merges chained hops into 24/13", () => {
    const start = startingPosition();
    expect(formatPlay(start, [{ from: "24", to: "18" }, { from: "18", to: "13" }])).toBe("24/13");
  });

  it("formatPlay groups duplicate hops with a multiplier", () => {
    const b = emptyBoard();
    b.points[13] = 4;
    expect(formatPlay(b, [{ from: "13", to: "11" }, { from: "13", to: "11" }])).toBe("13/11(2)");
  });

  it("formatPlay marks hits with an asterisk", () => {
    const b = emptyBoard();
    b.points[10] = 1;
    b.points[7] = -1;
    expect(formatPlay(b, [{ from: "10", to: "7" }])).toBe("10/7*");
  });

  it("nextSteps only offers legal first hops (no phantom source on an empty point)", () => {
    // A single combined move 8/4 (8->5->4). The only legal first hop is 8->5;
    // starting with 5->4 is illegal because nothing is on the 5-point yet.
    const start = startingPosition();
    const candidates = [fakeMove([{ from: "8", to: "5" }, { from: "5", to: "4" }])];
    const steps = nextSteps(start, candidates, []);
    const froms = steps.map((s) => s.from).sort();
    expect(froms).toEqual(["8"]);
  });
});

describe("features & opening book", () => {
  it("recognizes the made 5-point as an owned key point", () => {
    const after = applyPlay(startingPosition(), [
      { from: "8", to: "5" },
      { from: "6", to: "5" },
    ]);
    const f = extractFeatures(after);
    expect(f.madeKeyPoints).toContain(5);
    expect(f.homeBoardPoints).toBeGreaterThanOrEqual(2);
  });

  it("opening book returns the 5-point play for 3-1 from the start", () => {
    const entry = lookupOpening(startingPosition(), [3, 1]);
    expect(entry?.title).toBe("Make the 5-point");
    expect(entry?.bestNotation).toBe("8/5 6/5");
  });

  it("opening book returns null for a non-starting position", () => {
    const after = applyPlay(startingPosition(), [{ from: "24", to: "23" }]);
    expect(lookupOpening(after, [3, 1])).toBeNull();
    // positionKey changed
    expect(positionKey(after)).not.toBe(positionKey(startingPosition()));
  });
});

describe("spaced repetition (SM-2)", () => {
  const t0 = 1_000_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;

  it("maps equity loss to quality", () => {
    expect(equityLossToQuality(0)).toBe(5); // best move
    expect(equityLossToQuality(0.01)).toBe(4); // negligible
    expect(equityLossToQuality(0.03)).toBe(3); // small inaccuracy (pass)
    expect(equityLossToQuality(0.07)).toBe(2); // mistake
    expect(equityLossToQuality(0.2)).toBe(1); // blunder
  });

  it("grows the interval on successive good reviews", () => {
    let c = newCard("x", t0);
    c = grade(c, 5, t0); // first pass
    expect(c.reps).toBe(1);
    expect(c.intervalDays).toBe(1);
    expect(c.due).toBe(t0 + 1 * DAY);
    c = grade(c, 5, t0); // second pass
    expect(c.reps).toBe(2);
    expect(c.intervalDays).toBe(6);
    const i2 = c.intervalDays;
    c = grade(c, 4, t0); // third pass -> interval * ease
    expect(c.reps).toBe(3);
    expect(c.intervalDays).toBeGreaterThan(i2);
  });

  it("a lapse resets progress and reschedules soon", () => {
    let c = newCard("x", t0);
    c = grade(c, 5, t0);
    c = grade(c, 5, t0);
    const easeBefore = c.ease;
    c = grade(c, 1, t0); // blunder
    expect(c.reps).toBe(0);
    expect(c.intervalDays).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.ease).toBeLessThan(easeBefore);
    expect(c.due).toBeLessThan(t0 + DAY); // due within minutes, not days
  });

  it("never drops ease below 1.3", () => {
    let c = newCard("x", t0);
    for (let i = 0; i < 20; i++) c = grade(c, 0, t0);
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe("applyNotation", () => {
  it("reproduces 8/5 6/5 -> the made 5-point", () => {
    const after = applyNotation(startingPosition(), "8/5 6/5");
    expect(after.points[5]).toBe(2);
    expect(after.points[8]).toBe(2);
    expect(after.points[6]).toBe(4);
  });

  it("handles multipliers and combined hops", () => {
    const b = emptyBoard();
    b.points[13] = 4;
    const after = applyNotation(b, "13/11(2)");
    expect(after.points[11]).toBe(2);
    expect(after.points[13]).toBe(2);
    // combined hop 24/13 nets a checker from 24 to 13
    const c = applyNotation(startingPosition(), "24/13");
    expect(c.points[24]).toBe(1);
    expect(c.points[13]).toBe(6);
  });
});

describe("second-roll book", () => {
  it("covers all 15 openings with 21 replies each", () => {
    expect(SECOND_ROLL.length).toBe(15);
    for (const o of SECOND_ROLL) {
      expect(Object.keys(o.replies).length).toBe(21);
      expect(o.openingNotation).toBe(OPENING_BEST[o.openingRoll]);
    }
  });

  it("matches a known post-opening position to its reply card", () => {
    // Opponent opens 3-1 and plays 8/5 6/5; we are now the replier.
    const opening = SECOND_ROLL.find((o) => o.openingRoll === "31")!;
    const hit = lookupSecondRoll(opening.board, [6, 5]);
    expect(hit).not.toBeNull();
    expect(hit!.reply.notation).toBe(opening.replies["65"].notation);
  });

  it("returns null for the plain starting position", () => {
    expect(lookupSecondRoll(startingPosition(), [3, 1])).toBeNull();
  });
});
