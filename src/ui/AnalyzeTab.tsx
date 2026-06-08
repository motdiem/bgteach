import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { applyPlay, positionKey, Play } from "../engine/board";
import { isComplete, matchMove, nextSteps } from "../engine/moves";
import { explainAlternative, explainMove } from "../analysis/explain";
import Board from "./Board";
import DiceInput from "./DiceInput";
import MoveList from "./MoveList";
import Explanation from "./Explanation";
import { newId, saveEntry } from "../state/history";
import { formatPlay } from "../engine/moves";

export default function AnalyzeTab() {
  const { board, dice, moves, selectedIndex, loading, error, setDice, analyze, selectMove, clearAnalysis } = useStore();
  const [pending, setPending] = useState<Play>([]);
  const [selectedSource, setSelectedSource] = useState<number | "bar" | null>(null);
  const [saved, setSaved] = useState(false);

  const candidates = moves ?? [];

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

  const matched = pending.length ? matchMove(board, pending, candidates) : null;
  const complete = pending.length > 0 && isComplete(board, candidates, pending);
  const best = candidates[0] ?? null;
  const focused = matched ?? (candidates[selectedIndex] ?? null);

  // While building a move by tapping, preview those hops; otherwise preview the
  // currently focused move from the list so the board shows the result.
  const previewPlay: Play = pending.length ? pending : focused ? focused.play : [];
  const displayBoard = useMemo(() => applyPlay(board, previewPlay), [board, previewPlay]);

  // Highlight the points where your checkers ended up (final landing spots).
  const highlight = useMemo(() => {
    const s = new Set<number>();
    if (pending.length === 0 && focused) {
      for (let p = 1; p <= 24; p++) if (displayBoard.points[p] > board.points[p]) s.add(p);
    }
    return s;
  }, [displayBoard, board, focused, pending.length]);

  const previewNotation = pending.length === 0 && focused ? formatPlay(board, focused.play) : null;

  const isFocusedBest =
    !!focused && !!best && positionKey(applyPlay(board, focused.play)) === positionKey(applyPlay(board, best.play));

  const explanation = useMemo(() => {
    if (!focused || !best || !dice) return null;
    return isFocusedBest
      ? explainMove(board, focused, dice, true)
      : explainAlternative(board, best, focused, dice);
  }, [focused, best, dice, isFocusedBest, board]);

  const resetBuild = () => {
    setPending([]);
    setSelectedSource(null);
  };

  const onPointClick = (point: number | "bar" | "off") => {
    if (!candidates.length) return;
    // tapping a highlighted source selects it
    if (point !== "off" && sources.has(point)) {
      setSelectedSource(point);
      return;
    }
    // tapping a destination for the selected source adds a hop
    if (selectedSource != null && point !== "bar" && dests.has(point)) {
      const hop = {
        from: selectedSource === "bar" ? "bar" : String(selectedSource),
        to: point === "off" ? "off" : String(point),
      };
      setPending([...pending, hop]);
      setSelectedSource(null);
    }
  };

  const onAnalyze = () => {
    resetBuild();
    setSaved(false);
    analyze();
  };

  const onSelectMove = (i: number) => {
    resetBuild();
    selectMove(i);
  };

  const doSave = async () => {
    if (!dice || !moves) return;
    await saveEntry({
      id: newId(),
      createdAt: Date.now(),
      label: `${dice[0]}-${dice[1]} · ${formatPlay(board, moves[0].play)}`,
      board,
      dice,
      bestNotation: formatPlay(board, moves[0].play),
      moves: moves.slice(0, 8),
    });
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <Board
        board={displayBoard}
        dice={dice}
        sources={candidates.length ? sources : undefined}
        dests={candidates.length ? dests : undefined}
        highlight={highlight}
        selectedSource={selectedSource}
        onPointClick={candidates.length ? onPointClick : undefined}
      />

      {!moves && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="text-sm text-slate-300 mb-3">Enter the dice you rolled from this position:</div>
          <DiceInput value={dice} onChange={setDice} onAnalyze={onAnalyze} loading={loading} />
        </div>
      )}

      {error && <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 p-3 text-sm">{error}</div>}

      {moves && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-300">
              Roll <span className="font-mono text-slate-100">{dice?.[0]}-{dice?.[1]}</span>
              {pending.length > 0 && !complete && <span className="text-amber-300 ml-2">building move… tap a green point</span>}
              {previewNotation && (
                <span className="block text-xs text-slate-400">
                  Board shows the position after <span className="font-mono text-amber-300">{previewNotation}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {pending.length > 0 && (
                <button onClick={resetBuild} className="text-xs rounded-lg bg-slate-700 px-3 py-1.5 active:scale-95">
                  Clear
                </button>
              )}
              <button
                onClick={() => {
                  resetBuild();
                  setSaved(false);
                  clearAnalysis();
                }}
                className="text-xs rounded-lg bg-slate-700 px-3 py-1.5 active:scale-95"
              >
                New roll
              </button>
            </div>
          </div>

          {explanation && <Explanation exp={explanation} isBest={isFocusedBest} />}

          <MoveList board={board} moves={moves} selectedIndex={matched ? -1 : selectedIndex} onSelect={onSelectMove} />

          <button
            onClick={doSave}
            disabled={saved}
            className="w-full rounded-lg bg-slate-700 text-slate-100 py-2.5 text-sm font-medium disabled:opacity-50 active:scale-95"
          >
            {saved ? "✓ Saved to history" : "Save to history"}
          </button>
        </>
      )}
    </div>
  );
}
