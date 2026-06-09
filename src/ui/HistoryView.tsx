import { useEffect, useState } from "react";
import { deleteEntry, DeckItem, getDeck, HistoryEntry } from "../state/history";
import { dueLabel } from "../state/srs";
import { useStore } from "../state/store";
import BoardView from "./Board";

export default function HistoryView() {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const { setBoard, setDice, setTab, refreshDueCount } = useStore();

  const refresh = () => getDeck().then(setItems);
  useEffect(() => {
    refresh();
  }, []);

  const reopen = (e: HistoryEntry) => {
    setBoard(e.board);
    setDice(e.dice);
    setTab("analyze");
  };

  const remove = async (id: string) => {
    await deleteEntry(id);
    await refreshDueCount();
    refresh();
  };

  if (items.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16">
        <div className="text-4xl mb-2">📜</div>
        <div>No saved positions yet.</div>
        <div className="text-sm mt-1">Analyze a roll and tap “Save to history”.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 px-1">
        Saved positions become flashcards — practice them in the <span className="text-teal-300">Quiz</span> tab.
      </div>
      {items.map(({ entry: e, card }) => (
        <div key={e.id} className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
          <button
            onClick={() => setOpen(open === e.id ? null : e.id)}
            className="w-full flex items-center justify-between px-3 py-3 text-left"
          >
            <span>
              <span className="font-mono text-slate-100">{e.label}</span>
              <span className="block text-xs text-slate-400">
                {new Date(e.createdAt).toLocaleString()} · review {dueLabel(card)}
                {card.reps > 0 && ` · ${card.reps} review${card.reps > 1 ? "s" : ""}`}
              </span>
            </span>
            <span className="text-slate-500">{open === e.id ? "▲" : "▼"}</span>
          </button>
          {open === e.id && (
            <div className="px-3 pb-3 space-y-2">
              <BoardView board={e.board} dice={e.dice} showPips />
              <div className="text-sm text-slate-300">
                Best: <span className="font-mono text-teal-300">{e.bestNotation}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => reopen(e)} className="flex-1 rounded-lg bg-teal-500 text-slate-900 py-2 text-sm font-medium active:scale-95">
                  Reopen in Analyze
                </button>
                <button onClick={() => remove(e.id)} className="rounded-lg bg-rose-500/80 text-white px-4 py-2 text-sm active:scale-95">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
