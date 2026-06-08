// Classify the game phase, so explanations can frame advice in the right
// strategic context (a holding game wants different things than a race).

import { Board } from "../engine/board";
import { extractFeatures, Features } from "./features";

export type Phase =
  | "bearoff"
  | "race"
  | "blitz"
  | "priming"
  | "backgame"
  | "holding"
  | "opening"
  | "middle";

export interface PhaseInfo {
  phase: Phase;
  label: string;
  description: string;
}

export function classifyPhase(board: Board, f: Features = extractFeatures(board)): PhaseInfo {
  // Bearing off: everything home and no contact.
  if (f.allHome && !f.contact) {
    return {
      phase: "bearoff",
      label: "Bear-off",
      description: "All your checkers are home — you're racing to take them off safely.",
    };
  }

  // Pure race: the armies have passed each other, no hits are possible.
  if (!f.contact) {
    return {
      phase: "race",
      label: "Race",
      description:
        "There's no more contact — this is a pure race, so the only thing that matters is efficient pips and a smooth bear-in.",
    };
  }

  // Blitz: opponent on the bar against a developing home board.
  if (f.oppBar >= 1 && f.homeBoardPoints >= 2) {
    return {
      phase: "blitz",
      label: "Blitz",
      description:
        "You've got the opponent on the bar with a building home board — keep attacking to try to close them out.",
    };
  }

  // Backgame: you hold two or more anchors deep in the opponent's home board.
  const deepAnchors = f.anchors.filter((p) => p >= 20);
  if (deepAnchors.length >= 2 && f.pipLead < -20) {
    return {
      phase: "backgame",
      label: "Back game",
      description:
        "You're well behind with multiple deep anchors — you're playing a back game, waiting for a shot while keeping your timing.",
    };
  }

  // Priming: a long wall trapping the opponent's back checkers.
  if (f.primeLength >= 4) {
    return {
      phase: "priming",
      label: "Priming game",
      description: `You have a ${f.primeLength}-point wall — the plan is to trap the opponent's back checkers behind your prime.`,
    };
  }

  // Holding game: you keep an anchor and are behind in the race, waiting for a shot.
  if (f.anchors.length >= 1 && f.pipLead < 0) {
    return {
      phase: "holding",
      label: "Holding game",
      description:
        "You're behind in the race but holding an anchor — stay back and wait for a shot rather than running.",
    };
  }

  // Opening: still close to the starting structure (few pips spent, no big
  // structures yet, back checkers undeveloped).
  const totalOff = f.youOff + f.oppOff;
  if (totalOff === 0 && f.pip.you >= 150 && f.pip.opp >= 150 && f.ownedPoints.length <= 6 && f.backCheckers >= 2) {
    return {
      phase: "opening",
      label: "Opening",
      description: "Early game — develop builders, make key points, and decide whether to split or stay back.",
    };
  }

  return {
    phase: "middle",
    label: "Middle game",
    description: "A positional middle game — balance making points, safety, and racing.",
  };
}
