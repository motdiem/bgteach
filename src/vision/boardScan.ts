// Best-effort, fully offline board detector. Given an image of a backgammon
// board (cleanest on a top-down digital screenshot), the four corners of the
// PLAYING AREA, the board orientation, and which checker colour is "you", it
// estimates how many checkers sit on each point.
//
// This is intentionally simple (pure pixel sampling, no ML) and is expected to
// be imperfect — the UI always drops the result into the manual editor for the
// user to confirm and correct. The bar and borne-off checkers are left at 0 for
// manual entry.

import { Board, emptyBoard } from "../engine/board";

export interface Pt {
  x: number;
  y: number;
}

/** Minimal RGBA image (matches the canvas ImageData shape). */
export interface ScanImage {
  width: number;
  height: number;
  data: Uint8ClampedArray | number[];
}

export type HomeQuadrant = "br" | "bl" | "tr" | "tl";

export interface ScanOptions {
  /** Playing-area corners in image pixels, order: TL, TR, BR, BL. */
  corners: [Pt, Pt, Pt, Pt];
  /** Which physical quadrant holds YOUR home board (points 1–6). */
  homeQuadrant: HomeQuadrant;
  /** True if your checkers are the light-coloured ones. */
  youAreLight: boolean;
  /** Fraction of the width taken by the central bar (default 0.07). */
  barFrac?: number;
  /** Luminance (0..1) above which a pixel counts as a light checker. */
  lightThresh?: number;
  /** Luminance (0..1) below which a pixel counts as a dark checker. */
  darkThresh?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Bilinear interpolation of the playing-area corners → an image pixel. */
function quadPoint(corners: [Pt, Pt, Pt, Pt], u: number, v: number): Pt {
  const [tl, tr, br, bl] = corners;
  const top = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u };
  const bot = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u };
  return { x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v };
}

/** Perceived luminance (0..1) of the pixel nearest (x,y). */
function lumaAt(img: ScanImage, x: number, y: number): number {
  const px = clamp(Math.round(x), 0, img.width - 1);
  const py = clamp(Math.round(y), 0, img.height - 1);
  const i = (py * img.width + px) * 4;
  const r = img.data[i] / 255;
  const g = img.data[i + 1] / 255;
  const b = img.data[i + 2] / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

type Cls = "light" | "dark" | "bg";

/**
 * Transform normalized board coords so that, whatever the user's home quadrant,
 * we can sample as if home were bottom-right (our internal convention).
 */
function orient(u: number, v: number, home: HomeQuadrant): { u: number; v: number } {
  switch (home) {
    case "br":
      return { u, v };
    case "bl":
      return { u: 1 - u, v }; // mirror horizontally
    case "tr":
      return { u, v: 1 - v }; // mirror vertically
    case "tl":
      return { u: 1 - u, v: 1 - v };
  }
}

/**
 * Count checkers on one point and classify their colour by scanning inward from
 * the board edge along the point's column.
 *
 * @param colCenterU  horizontal centre of the column (0..1, br-oriented)
 * @param top         true for the top row (scan downward), false for bottom
 */
function scanColumn(
  img: ScanImage,
  opts: ScanOptions,
  colCenterU: number,
  colWidthU: number,
  top: boolean,
  lightT: number,
  darkT: number
): { count: number; light: boolean } {
  // A checker spans roughly one column width; in normalized v it scales by the
  // board's aspect ratio. Estimate aspect from the corner quad.
  const [tl, tr, br, bl] = opts.corners;
  const wPx = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2;
  const hPx = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;
  const aspect = wPx / Math.max(1, hPx);
  const discV = colWidthU * aspect; // a checker's height in normalized v
  const step = discV / 6; // sampling resolution
  const maxReach = Math.min(0.46, discV * 6.5); // a point holds up to ~5 shown discs

  let lightPx = 0;
  let darkPx = 0;
  let lastCheckerV = 0;
  let gap = 0;

  for (let d = step / 2; d < maxReach; d += step) {
    const v = top ? d : 1 - d;
    // Average a few horizontal samples across the column for robustness.
    let sum = 0;
    const taps = 3;
    for (let t = 0; t < taps; t++) {
      const uu = colCenterU + (t - 1) * colWidthU * 0.22;
      const o = orient(clamp(uu, 0, 1), clamp(v, 0, 1), opts.homeQuadrant);
      const p = quadPoint(opts.corners, o.u, o.v);
      sum += lumaAt(img, p.x, p.y);
    }
    const L = sum / taps;
    const cls: Cls = L >= lightT ? "light" : L <= darkT ? "dark" : "bg";
    if (cls === "bg") {
      gap += step;
      if (gap > discV * 0.75 && lastCheckerV > 0) break; // ran past the stack
    } else {
      gap = 0;
      lastCheckerV = d + step / 2;
      if (cls === "light") lightPx++;
      else darkPx++;
    }
  }

  const checkerPx = lightPx + darkPx;
  if (checkerPx === 0) return { count: 0, light: true };
  const count = clamp(Math.round(lastCheckerV / discV), 1, 15);
  return { count, light: lightPx >= darkPx };
}

/** Map a (row, half, index) to the point number in YOUR perspective (br home). */
function pointNumber(top: boolean, rightHalf: boolean, idx: number): number {
  // bottom-right (your home): nearest-bar→edge = 6,5,4,3,2,1
  // bottom-left:              edge→bar          = 12,11,10,9,8,7
  // top-left:                 edge→bar          = 13,14,15,16,17,18
  // top-right:                bar→edge          = 19,20,21,22,23,24
  if (!top && rightHalf) return 6 - idx;
  if (!top && !rightHalf) return 12 - idx;
  if (top && !rightHalf) return 13 + idx;
  return 19 + idx;
}

/**
 * Scan an image into a best-effort Board. Only the 24 points are filled; the
 * bar and borne-off counts are left at 0 for the user to set manually.
 */
export function scanBoard(img: ScanImage, opts: ScanOptions): Board {
  const board = emptyBoard();
  const barFrac = opts.barFrac ?? 0.07;
  const lightT = opts.lightThresh ?? 0.6;
  const darkT = opts.darkThresh ?? 0.26;

  const halfW = (1 - barFrac) / 2;
  const colW = halfW / 6;
  const centerU = (half: number, i: number) =>
    half === 0 ? i * colW + colW / 2 : halfW + barFrac + i * colW + colW / 2;

  for (const top of [true, false]) {
    for (let half = 0; half < 2; half++) {
      for (let i = 0; i < 6; i++) {
        const u = centerU(half, i);
        const { count, light } = scanColumn(img, opts, u, colW, top, lightT, darkT);
        if (count === 0) continue;
        const p = pointNumber(top, half === 1, i);
        const mine = light === opts.youAreLight;
        board.points[p] = mine ? count : -count;
      }
    }
  }
  return board;
}
