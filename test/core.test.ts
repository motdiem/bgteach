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
import { formatPlay, matchMove } from "../src/engine/moves";
import { shotsAt } from "../src/analysis/shots";
import { extractFeatures } from "../src/analysis/features";
import { lookupOpening } from "../src/analysis/openingBook";
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
