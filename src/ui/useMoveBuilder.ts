// Shared tap-to-build-a-move logic, used by both Analyze and Quiz. It derives
// the set of legal next hops from the engine's candidate plays (so we never
// re-implement backgammon legality) and tracks the partial move as the user
// taps source → destination.

import { useMemo, useState } from "react";
import { applyPlay, Board, Play } from "../engine/board";
import { EngineMove } from "../engine/gnubg";
import { isComplete, matchMove, nextSteps } from "../engine/moves";

export interface MoveBuilder {
  pending: Play;
  selectedSource: number | "bar" | null;
  sources: Set<number | "bar">;
  dests: Set<number | "off">;
  /** Board with the pending hops applied (live preview). */
  displayBoard: Board;
  /** The engine move matching the pending hops, or null if incomplete/illegal. */
  matched: EngineMove | null;
  complete: boolean;
  onPointClick: (point: number | "bar" | "off") => void;
  reset: () => void;
}

export function useMoveBuilder(board: Board, candidates: EngineMove[]): MoveBuilder {
  const [pending, setPending] = useState<Play>([]);
  const [selectedSource, setSelectedSource] = useState<number | "bar" | null>(null);

  const next = useMemo(
    () => (candidates.length ? nextSteps(board, candidates, pending) : []),
    [board, candidates, pending]
  );

  const sources = useMemo(() => {
    const s = new Set<number | "bar">();
    next.forEach((h) => s.add(h.from === "bar" ? "bar" : parseInt(h.from, 10)));
    return s;
  }, [next]);

  const dests = useMemo(() => {
    const d = new Set<number | "off">();
    if (selectedSource != null) {
      next
        .filter((h) => (h.from === "bar" ? "bar" : parseInt(h.from, 10)) === selectedSource)
        .forEach((h) => d.add(h.to === "off" ? "off" : parseInt(h.to, 10)));
    }
    return d;
  }, [next, selectedSource]);

  const displayBoard = useMemo(() => applyPlay(board, pending), [board, pending]);
  const matched = pending.length ? matchMove(board, pending, candidates) : null;
  const complete = pending.length > 0 && isComplete(board, candidates, pending);

  const reset = () => {
    setPending([]);
    setSelectedSource(null);
  };

  const onPointClick = (point: number | "bar" | "off") => {
    if (!candidates.length) return;
    // If a source is selected and this is a legal destination, complete the hop
    // FIRST — a point can be both a destination and a source, and finishing the
    // move the user is making takes priority over re-selecting.
    if (selectedSource != null && point !== "bar" && dests.has(point)) {
      setPending([
        ...pending,
        {
          from: selectedSource === "bar" ? "bar" : String(selectedSource),
          to: point === "off" ? "off" : String(point),
        },
      ]);
      setSelectedSource(null);
      return;
    }
    // Otherwise, tapping a highlighted source selects it.
    if (point !== "off" && sources.has(point)) {
      setSelectedSource(point);
    }
  };

  return { pending, selectedSource, sources, dests, displayBoard, matched, complete, onPointClick, reset };
}
