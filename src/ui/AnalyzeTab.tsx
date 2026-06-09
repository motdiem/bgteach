import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { applyPlay, positionKey } from "../engine/board";
import { explainAlternative, explainMove } from "../analysis/explain";
import { formatPlay } from "../engine/moves";
import { useMoveBuilder } from "./useMoveBuilder";
import Board from "./Board";
import DiceInput from "./DiceInput";
import MoveList from "./MoveList";
import Explanation from "./Explanation";
import { newId, saveEntry } from "../state/history";

export default function AnalyzeTab() {
  const { board, dice, moves, selectedIndex, loading, error, setDice, analyze, selectMove, clearAnalysis, refreshDueCount } =
    useStore();
  const [saved, setSaved] = useState(false);

  const candidates = moves ?? [];
  const builder = useMoveBuilder(board, candidates);
  const { pending, selectedSource, sources, dests, displayBoard, matched, complete, onPointClick, reset } = builder;

  const best = candidates[0] ?? null;
  const focused = matched ?? (candidates[selectedIndex] ?? null);

  const isFocusedBest =
    !!focused && !!best && positionKey(applyPlay(board, focused.play)) === positionKey(applyPlay(board, best.play));

  const explanation = useMemo(() => {
    if (!focused || !best || !dice) return null;
    return isFocusedBest
      ? explainMove(board, focused, dice, true)
      : explainAlternative(board, best, focused, dice);
  }, [focused, best, dice, isFocusedBest, board]);

  const onAnalyze = () => {
    reset();
    setSaved(false);
    analyze();
  };

  const onSelectMove = (i: number) => {
    reset();
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
    await refreshDueCount();
  };

  return (
    <div className="space-y-4">
      <Board
        board={displayBoard}
        dice={dice}
        sources={candidates.length ? sources : undefined}
        dests={candidates.length ? dests : undefined}
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
            </div>
            <div className="flex gap-2">
              {pending.length > 0 && (
                <button onClick={reset} className="text-xs rounded-lg bg-slate-700 px-3 py-1.5 active:scale-95">
                  Clear
                </button>
              )}
              <button
                onClick={() => {
                  reset();
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
