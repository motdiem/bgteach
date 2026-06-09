import { useEffect, useState } from "react";
import { applyPlay, positionKey, startingPosition } from "../engine/board";
import { getMoves, EngineMove } from "../engine/gnubg";
import { explainAlternative, explainMove, MoveExplanation } from "../analysis/explain";
import { DeckItem, getDeck, listDueCards, saveCard } from "../state/history";
import { equityLossToQuality, grade, verdict } from "../state/srs";
import { useStore } from "../state/store";
import { useMoveBuilder } from "./useMoveBuilder";
import Board from "./Board";
import Explanation from "./Explanation";

interface Graded {
  quality: number;
  played: MoveExplanation;
  isBest: boolean;
}

export default function QuizTab() {
  const { setTab, refreshDueCount } = useStore();
  const [queue, setQueue] = useState<DeckItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [candidates, setCandidates] = useState<EngineMove[] | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const current = queue?.[idx] ?? null;
  const board = current?.entry.board ?? startingPosition();
  const dice = current?.entry.dice ?? null;

  const builder = useMoveBuilder(board, candidates ?? []);

  // Load the due queue on mount.
  useEffect(() => {
    listDueCards().then(setQueue);
  }, []);

  // When the current card changes, fetch the full live candidate list.
  useEffect(() => {
    if (!current) return;
    setLoadingCard(true);
    setCandidates(null);
    setGraded(null);
    builder.reset();
    getMoves(current.entry.board, current.entry.dice)
      .then((m) => setCandidates(m))
      .finally(() => setLoadingCard(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.entry.id]);

  // Grade automatically once a complete move is built.
  useEffect(() => {
    if (graded || !current || !candidates || !builder.complete || !builder.matched) return;
    const best = candidates[0];
    const matched = builder.matched;
    const isBest = positionKey(applyPlay(board, matched.play)) === positionKey(applyPlay(board, best.play));
    const quality = equityLossToQuality(-matched.evaluation.diff);
    const played = isBest
      ? explainMove(board, matched, current.entry.dice, true)
      : explainAlternative(board, best, matched, current.entry.dice);
    setGraded({ quality, played, isBest });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builder.complete, builder.matched, candidates, graded]);

  const startPracticeAll = async () => {
    const all = await getDeck();
    setQueue(all);
    setIdx(0);
  };

  const reveal = () => {
    if (!current || !candidates) return;
    const best = candidates[0];
    setGraded({ quality: 1, played: explainMove(board, best, current.entry.dice, true), isBest: true });
  };

  const next = async () => {
    if (current && graded) {
      await saveCard(grade(current.card, graded.quality));
      await refreshDueCount();
    }
    setGraded(null);
    setCandidates(null);
    builder.reset();
    setIdx((i) => i + 1);
  };

  // ---- Render states -------------------------------------------------------

  if (queue === null) {
    return <div className="text-center text-slate-400 py-16">Loading your deck…</div>;
  }

  if (queue.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16 space-y-3">
        <div className="text-4xl">🎉</div>
        <div className="text-slate-200 font-medium">You're all caught up!</div>
        <div className="text-sm">Save positions from Analyze to build your deck, then come back to review.</div>
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={startPracticeAll} className="rounded-lg bg-slate-700 text-slate-100 px-4 py-2 text-sm active:scale-95">
            Practice all anyway
          </button>
          <button onClick={() => setTab("analyze")} className="rounded-lg bg-teal-500 text-slate-900 px-4 py-2 text-sm font-medium active:scale-95">
            Go to Analyze
          </button>
        </div>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="text-center text-slate-400 py-16 space-y-3">
        <div className="text-4xl">✅</div>
        <div className="text-slate-200 font-medium">Session complete — {queue.length} card{queue.length > 1 ? "s" : ""} reviewed.</div>
        <button
          onClick={() => {
            listDueCards().then((q) => {
              setQueue(q);
              setIdx(0);
            });
          }}
          className="rounded-lg bg-teal-500 text-slate-900 px-4 py-2 text-sm font-medium active:scale-95"
        >
          Check for more
        </button>
      </div>
    );
  }

  const v = graded ? verdict(graded.quality) : null;
  const toneCls =
    v?.tone === "good"
      ? "bg-teal-500/15 border-teal-500/40 text-teal-200"
      : v?.tone === "ok"
      ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
      : "bg-rose-500/15 border-rose-500/40 text-rose-200";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Card {idx + 1} / {queue.length}
        </span>
        <span className="text-slate-300">
          You rolled <span className="font-mono text-slate-100">{dice?.[0]}-{dice?.[1]}</span> — play your best move
        </span>
      </div>

      <Board
        board={builder.displayBoard}
        dice={dice}
        sources={!graded && candidates ? builder.sources : undefined}
        dests={!graded && candidates ? builder.dests : undefined}
        selectedSource={builder.selectedSource}
        onPointClick={!graded && candidates ? builder.onPointClick : undefined}
      />

      {!graded && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-amber-300">
            {loadingCard ? "Thinking…" : builder.pending.length > 0 ? "building move… tap a green point" : "Tap a checker to move it"}
          </div>
          <div className="flex gap-2">
            {builder.pending.length > 0 && (
              <button onClick={builder.reset} className="text-xs rounded-lg bg-slate-700 px-3 py-1.5 active:scale-95">
                Clear
              </button>
            )}
            <button onClick={reveal} disabled={!candidates} className="text-xs rounded-lg bg-slate-700 px-3 py-1.5 active:scale-95 disabled:opacity-40">
              Reveal answer
            </button>
          </div>
        </div>
      )}

      {graded && v && (
        <>
          <div className={`rounded-lg border p-3 text-sm font-medium ${toneCls}`}>{v.label}</div>
          <Explanation exp={graded.played} isBest={graded.isBest} />
          <button onClick={next} className="w-full rounded-lg bg-teal-500 text-slate-900 py-3 font-semibold active:scale-95">
            Next card →
          </button>
        </>
      )}
    </div>
  );
}
