import { Board } from "../engine/board";
import { EngineMove } from "../engine/gnubg";
import { formatPlay } from "../engine/moves";

interface Props {
  board: Board;
  moves: EngineMove[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  limit?: number;
}

export default function MoveList({ board, moves, selectedIndex, onSelect, limit = 6 }: Props) {
  const shown = moves.slice(0, limit);
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-wide text-slate-400 px-1">Ranked moves — tap any to ask why</div>
      {shown.map((m, i) => {
        const sel = i === selectedIndex;
        const win = (m.evaluation.probability.win * 100).toFixed(1);
        const diff = m.evaluation.diff;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`w-full text-left rounded-xl px-3 py-2.5 border flex items-center gap-3 transition active:scale-[0.99] ${
              sel ? "border-teal-400 bg-teal-500/10" : "border-slate-700 bg-slate-800/60"
            }`}
          >
            <span className={`text-xs font-bold w-6 h-6 rounded-full grid place-items-center ${i === 0 ? "bg-teal-500 text-slate-900" : "bg-slate-700 text-slate-200"}`}>
              {i === 0 ? "★" : i + 1}
            </span>
            <span className="font-mono text-[15px] flex-1 text-slate-100">{formatPlay(board, m.play)}</span>
            <span className="text-right leading-tight">
              <span className="block text-xs text-slate-300">win {win}%</span>
              <span className={`block text-[11px] ${i === 0 ? "text-teal-400" : "text-rose-300"}`}>
                {i === 0 ? "best" : diff.toFixed(3)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
