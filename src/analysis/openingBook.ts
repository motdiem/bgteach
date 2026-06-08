// Curated opening book for the 15 distinct opening rolls, based on modern
// neural-net rollout consensus. When the board is the standard start and it's
// the first roll, we show this authoritative prose instead of (or alongside)
// the generic feature explanation.

import { Board, positionKey, startingPosition } from "../engine/board";

export interface OpeningEntry {
  bestNotation: string; // for display; the engine still supplies the ranking
  title: string;
  prose: string;
  alternatives?: string;
}

const START_KEY = positionKey(startingPosition());

// Keyed by the two dice sorted high-low, e.g. "31", "65".
const BOOK: Record<string, OpeningEntry> = {
  "31": {
    bestNotation: "8/5 6/5",
    title: "Make the 5-point",
    prose:
      "Make your 5-point — the single best opening roll. The 5-point is the most valuable point on the board: it's the key blocking point in front of the opponent's back checkers and the anchor of a strong home board. Nothing else is remotely close, so this is an automatic play.",
  },
  "61": {
    bestNotation: "13/7 8/7",
    title: "Make the bar-point",
    prose:
      "Make your bar-point (the 7-point) by bringing one checker down from the midpoint and one from your 8-point. This builds a two-point block right next to your 8-point — the start of a prime — and it's clearly best.",
  },
  "42": {
    bestNotation: "8/4 6/4",
    title: "Make the 4-point",
    prose:
      "Make your 4-point. A second home-board point this early is excellent — it blocks the opponent and starts your home board. There's no serious alternative.",
  },
  "53": {
    bestNotation: "8/3 6/3",
    title: "Make the 3-point",
    prose:
      "Make your 3-point. Modern rollouts prefer pointing on the 3 (8/3 6/3) to merely building, because a made inner-board point is worth more than the slightly deep location. A clear best play.",
  },
  "21": {
    bestNotation: "13/11 6/5",
    title: "Slot the 5-point (or split)",
    prose:
      "The two best plays are nearly tied. 13/11 6/5 'slots' the golden 5-point — you drop a builder there hoping to cover it next turn and make your best point. The quieter 24/23 13/11 splits your back checkers and brings down a builder, avoiding the risk of being hit on the 5.",
    alternatives:
      "Slotting (13/11 6/5) is a touch more aggressive; the split (24/23 13/11) is steadier. Bots rate them within a hair, so either is fine — slot when you want the upside of the 5-point.",
  },
  "41": {
    bestNotation: "24/23 13/9",
    title: "Split and build",
    prose:
      "Split your back checkers to the 23-point and bring a builder down to the 9 (24/23 13/9). The split eyes an advanced anchor while the builder helps make a new point. Note: bots demoted the old 'slot the 5' play (13/9 6/5) — leaving a blot on the 5 this early isn't worth it.",
    alternatives: "13/9 6/5 (slotting the 5-point) is playable but rated a little worse by rollouts.",
  },
  "51": {
    bestNotation: "24/23 13/8",
    title: "Run a builder, small split",
    prose:
      "Bring a checker safely to your 8-point (13/8) and make a small split to the 23 (24/23). The 13/8 is constructive and safe; the tiny split gives your back checkers a chance to anchor. Slotting the 5 (13/8 6/5) is no longer preferred.",
    alternatives: "13/8 6/5 (slot the 5-point) is close but slightly worse by modern rollouts.",
  },
  "52": {
    bestNotation: "24/22 13/8",
    title: "Split and bring one down",
    prose:
      "Play 24/22 13/8: split to the 22-point and bring a builder safely to your 8-point. The 22 split angles for an advanced anchor. Stacking with 13/11 13/8 is the main alternative but a touch passive.",
    alternatives: "13/11 13/8 (two down) is the other option, rated slightly behind the split.",
  },
  "62": {
    bestNotation: "24/18 13/11",
    title: "Run to the bar, add a builder",
    prose:
      "Run a back checker to the opponent's bar-point (24/18) and bring a builder to the 11 (13/11). Escaping a back checker to the 18 relieves pressure and the builder develops your position. It does leave two blots, but the escape is worth it.",
  },
  "43": {
    bestNotation: "13/10 13/9",
    title: "Two down (builders)",
    prose:
      "Bring two builders down from the midpoint (13/10 13/9). This flexible play aims at making your 5-, 4-, or bar-point next turn. The splitting plays are close alternatives if you prefer activity in the back.",
    alternatives:
      "24/20 13/10 (split to the golden point) and 24/21 13/9 are close behind — choose a split if you want to fight for an advanced anchor.",
  },
  "63": {
    bestNotation: "24/18 13/10",
    title: "Run to the bar, add a builder",
    prose:
      "Run a back checker out to the 18 (24/18) and bring a builder to the 10 (13/10). Escaping a back checker is the priority with a big roll like this. Running one all the way (24/15) is a reasonable alternative.",
    alternatives: "24/15 (run a single checker all the way to the 15) is the main alternative.",
  },
  "54": {
    bestNotation: "24/20 13/8",
    title: "Go for the golden anchor",
    prose:
      "Play 24/20 13/8: advance a back checker to the 20-point (the 'golden' advanced anchor point) and bring the other checker safely to your 8. Reaching toward the 20 is the standout idea here.",
    alternatives: "13/9 13/8 (two down) is the building alternative, rated slightly behind.",
  },
  "64": {
    bestNotation: "24/18 13/9",
    title: "Run and build",
    prose:
      "Run a back checker to the 18 and bring a builder to the 9 (24/18 13/9). Escaping a back checker with the 6 is the main point. Interestingly, making the 2-point (8/2 6/2) and running all the way (24/14) are both close — bots rehabilitated the once-scorned 8/2 6/2.",
    alternatives: "8/2 6/2 (make the 2-point) and 24/14 (run a single checker) are both close alternatives.",
  },
  "65": {
    bestNotation: "24/13",
    title: "Lover's leap",
    prose:
      "Run one back checker all the way to safety on your midpoint (24/18/13), the famous 'lover's leap'. With 6-5 you escape a back checker completely and land on a stacked safe point — by far the best use of this roll.",
  },
};

/** Look up opening-book prose for a position + dice, or null if not applicable. */
export function lookupOpening(board: Board, dice: [number, number]): OpeningEntry | null {
  if (positionKey(board) !== START_KEY) return null;
  const key = [dice[0], dice[1]].sort((a, b) => b - a).join("");
  return BOOK[key] ?? null;
}
