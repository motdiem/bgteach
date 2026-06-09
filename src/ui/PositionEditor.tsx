import { useState } from "react";
import { Board, checkerCounts, cloneBoard, emptyBoard, flipPerspective } from "../engine/board";
import { PRESETS } from "../analysis/presets";
import { useStore } from "../state/store";
import BoardView from "./Board";
import PhotoImport from "./PhotoImport";

type Tool = "you" | "opp" | "remove";

export default function PositionEditor() {
  const { board, setBoard, setTab } = useStore();
  const [draft, setDraft] = useState<Board>(cloneBoard(board));
  const [tool, setTool] = useState<Tool>("you");
  const [showImport, setShowImport] = useState(false);

  const counts = checkerCounts(draft);

  const edit = (mut: (b: Board) => void) => {
    const b = cloneBoard(draft);
    mut(b);
    setDraft(b);
  };

  const onPointClick = (point: number | "bar" | "off") => {
    if (point === "bar" || point === "off") return;
    edit((b) => {
      const cur = b.points[point];
      if (tool === "you") {
        if (cur >= 0) b.points[point] = cur + 1;
        else b.points[point] = 1; // replace a lone opp checker
      } else if (tool === "opp") {
        if (cur <= 0) b.points[point] = cur - 1;
        else b.points[point] = -1;
      } else {
        if (cur > 0) b.points[point] = cur - 1;
        else if (cur < 0) b.points[point] = cur + 1;
      }
    });
  };

  const bump = (key: "youBar" | "oppBar" | "youOff" | "oppOff", delta: number) =>
    edit((b) => {
      b[key] = Math.max(0, b[key] + delta);
    });

  const use = () => {
    setBoard(draft);
    setTab("analyze");
  };

  return (
    <div className="space-y-4">
      <BoardView board={draft} onPointClick={onPointClick} selectedSource={null} />

      <button
        onClick={() => setShowImport((s) => !s)}
        className="w-full rounded-lg bg-slate-700 text-slate-100 py-2 text-sm font-medium active:scale-95"
      >
        {showImport ? "Hide photo import" : "📷 Set up from a photo"}
      </button>

      {showImport && (
        <PhotoImport
          onDetected={(b) => {
            setDraft(b);
            setShowImport(false);
          }}
        />
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Tap a point to place / remove checkers</div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["you", "Add You", "bg-stone-200 text-stone-900"],
              ["opp", "Add Opponent", "bg-slate-900 text-slate-100 border border-slate-600"],
              ["remove", "Remove", "bg-rose-500/80 text-white"],
            ] as [Tool, string, string][]
          ).map(([t, label, cls]) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`rounded-lg py-2 text-sm font-medium active:scale-95 ${cls} ${tool === t ? "ring-2 ring-teal-400" : "opacity-80"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {(
            [
              ["You on bar", "youBar"],
              ["Opp on bar", "oppBar"],
              ["You borne off", "youOff"],
              ["Opp borne off", "oppOff"],
            ] as [string, "youBar" | "oppBar" | "youOff" | "oppOff"][]
          ).map(([label, key]) => (
            <div key={key} className="flex items-center justify-between bg-slate-800 rounded-lg px-2 py-1.5">
              <span className="text-slate-300 text-xs">{label}</span>
              <span className="flex items-center gap-2">
                <button onClick={() => bump(key, -1)} className="w-6 h-6 rounded bg-slate-700">−</button>
                <span className="w-4 text-center">{draft[key]}</span>
                <button onClick={() => bump(key, +1)} className="w-6 h-6 rounded bg-slate-700">+</button>
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDraft(emptyBoard())} className="text-xs rounded-lg bg-slate-700 px-3 py-1.5">Empty</button>
          <button onClick={() => setDraft(flipPerspective(draft))} className="text-xs rounded-lg bg-slate-700 px-3 py-1.5">Swap sides</button>
        </div>

        <div className={`text-sm font-medium ${counts.you === 15 && counts.opp === 15 ? "text-teal-300" : "text-amber-300"}`}>
          You: {counts.you}/15 · Opponent: {counts.opp}/15
          {(counts.you !== 15 || counts.opp !== 15) && " — each side should have 15 checkers"}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 px-1">Presets</div>
        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setDraft(p.make())}
              className="text-left rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 active:scale-[0.99]"
            >
              <div className="font-medium text-slate-100">{p.name}</div>
              <div className="text-xs text-slate-400">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={use}
        disabled={counts.you !== 15 || counts.opp !== 15}
        className="w-full rounded-lg bg-teal-500 text-slate-900 py-3 font-semibold disabled:opacity-40 active:scale-95"
      >
        Use this position →
      </button>
    </div>
  );
}
