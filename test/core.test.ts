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
import { scanBoard } from "../src/vision/boardScan";
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

describe("photo board scan", () => {
  // Render a board to a synthetic RGBA image (gray felt + light/dark stacks),
  // then assert the scanner recovers it. Exercises geometry, counting, colour
  // classification and the column→point mapping.
  const SIZE = 600;
  const BAR = 0.07;
  const colW = (1 - BAR) / 12;
  const discV = colW; // square image -> aspect 1
  const centerU = (right: boolean, i: number) =>
    right ? (1 - BAR) / 2 + BAR + i * colW + colW / 2 : i * colW + colW / 2;

  function locate(p: number): { top: boolean; right: boolean; i: number } {
    if (p <= 6) return { top: false, right: true, i: 6 - p };
    if (p <= 12) return { top: false, right: false, i: 12 - p };
    if (p <= 18) return { top: true, right: false, i: p - 13 };
    return { top: true, right: true, i: p - 19 };
  }

  function render(board: ReturnType<typeof startingPosition>): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  } {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let i = 0; i < SIZE * SIZE; i++) {
      data[i * 4] = 115;
      data[i * 4 + 1] = 115;
      data[i * 4 + 2] = 115; // gray bg, luma ~0.45 (between thresholds)
      data[i * 4 + 3] = 255;
    }
    const paintRect = (u0: number, v0: number, u1: number, v1: number, val: number) => {
      const x0 = Math.round(u0 * SIZE),
        x1 = Math.round(u1 * SIZE);
      const y0 = Math.round(v0 * SIZE),
        y1 = Math.round(v1 * SIZE);
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const idx = (y * SIZE + x) * 4;
          data[idx] = data[idx + 1] = data[idx + 2] = val;
        }
    };
    for (let p = 1; p <= 24; p++) {
      const c = board.points[p];
      if (c === 0) continue;
      const n = Math.abs(c);
      const val = c > 0 ? 240 : 20; // your=light, opp=dark
      const { top, right, i } = locate(p);
      const u = centerU(right, i);
      for (let k = 0; k < n; k++) {
        const vc = top ? (k + 0.5) * discV : 1 - (k + 0.5) * discV;
        paintRect(u - colW * 0.45, vc - discV * 0.45, u + colW * 0.45, vc + discV * 0.45, val);
      }
    }
    return { width: SIZE, height: SIZE, data };
  }

  it("recovers the standard starting position from a clean render", () => {
    const start = startingPosition();
    const img = render(start);
    const detected = scanBoard(img, {
      corners: [
        { x: 0, y: 0 },
        { x: SIZE, y: 0 },
        { x: SIZE, y: SIZE },
        { x: 0, y: SIZE },
      ],
      homeQuadrant: "br",
      youAreLight: true,
    });
    expect(detected.points.slice(1, 25)).toEqual(start.points.slice(1, 25));
  });
});
