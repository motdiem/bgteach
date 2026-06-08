// Positional feature extraction. These features are the vocabulary the
// explanation generator uses to describe WHY a move helps or hurts. The engine
// owns the verdict (equity); features only supply the human reasoning.

import { Board, pipCount } from "../engine/board";
import { listBlots, shotsAt } from "./shots";

export interface BlotInfo {
  point: number;
  shots: number; // rolls out of 36 that hit it
}

export interface Features {
  pip: { you: number; opp: number };
  pipLead: number; // > 0 means you are ahead in the race
  blots: BlotInfo[];
  totalCheckersExposed: number;
  ownedPoints: number[]; // points where you have >= 2
  homeBoardPoints: number; // owned points in 1..6
  homeBoardPointList: number[];
  madeKeyPoints: number[]; // owned among {5,7,4,20}
  primeLength: number; // longest run of consecutive owned points
  primeStart: number; // low end of that run (0 if none)
  anchors: number[]; // owned points in 18..24 (in opponent territory)
  backCheckers: number; // your checkers on 19..24 + bar
  builders: number; // spare checkers (beyond 2) on points 7..18
  youBar: number;
  oppBar: number;
  oppHomePoints: number; // points the opponent owns in their home (your 19..24)
  youOff: number;
  oppOff: number;
  allHome: boolean; // all your checkers in your home (1..6) or off — ready to bear off
  contact: boolean; // can either side still hit the other?
}

export function extractFeatures(b: Board): Features {
  const pip = pipCount(b);

  const blots: BlotInfo[] = listBlots(b).map((point) => ({ point, shots: shotsAt(b, point) }));

  const ownedPoints: number[] = [];
  const homeBoardPointList: number[] = [];
  for (let p = 1; p <= 24; p++) {
    if (b.points[p] >= 2) {
      ownedPoints.push(p);
      if (p <= 6) homeBoardPointList.push(p);
    }
  }

  const madeKeyPoints = [5, 7, 4, 20].filter((p) => ownedPoints.includes(p));

  // Longest consecutive run of owned points (a wall / prime).
  let primeLength = 0;
  let primeStart = 0;
  let run = 0;
  let runStart = 0;
  for (let p = 1; p <= 24; p++) {
    if (b.points[p] >= 2) {
      if (run === 0) runStart = p;
      run++;
      if (run > primeLength) {
        primeLength = run;
        primeStart = runStart;
      }
    } else {
      run = 0;
    }
  }

  const anchors = ownedPoints.filter((p) => p >= 18);

  let backCheckers = b.youBar;
  for (let p = 19; p <= 24; p++) if (b.points[p] > 0) backCheckers += b.points[p];

  let builders = 0;
  for (let p = 7; p <= 18; p++) if (b.points[p] > 2) builders += b.points[p] - 2;

  let oppHomePoints = 0;
  for (let p = 19; p <= 24; p++) if (b.points[p] <= -2) oppHomePoints++;

  // All your checkers home (ready to bear off)?
  let allHome = b.youBar === 0;
  for (let p = 7; p <= 24 && allHome; p++) if (b.points[p] > 0) allHome = false;

  // Contact: armies have not yet passed each other.
  let yourMax = b.youBar > 0 ? 25 : 0;
  let oppMin = b.oppBar > 0 ? 0 : 25;
  for (let p = 1; p <= 24; p++) {
    if (b.points[p] > 0) yourMax = Math.max(yourMax, p);
    if (b.points[p] < 0) oppMin = Math.min(oppMin, p);
  }
  const contact = yourMax > oppMin;

  return {
    pip,
    pipLead: pip.opp - pip.you,
    blots,
    totalCheckersExposed: blots.length,
    ownedPoints,
    homeBoardPoints: homeBoardPointList.length,
    homeBoardPointList,
    madeKeyPoints,
    primeLength,
    primeStart,
    anchors,
    backCheckers,
    builders,
    youBar: b.youBar,
    oppBar: b.oppBar,
    oppHomePoints,
    youOff: b.youOff,
    oppOff: b.oppOff,
    allHome,
    contact,
  };
}
