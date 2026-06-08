import { useEffect, useState } from "react";

interface Props {
  value: [number, number] | null;
  onChange: (d: [number, number]) => void;
  onAnalyze: () => void;
  loading: boolean;
}

const DiePips = ({ n }: { n: number }) => {
  const dot = "inline-block w-1.5 h-1.5 rounded-full bg-current";
  const grid: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const on = new Set(grid[n] ?? []);
  return (
    <span className="grid grid-cols-3 grid-rows-3 gap-0.5 w-7 h-7 p-1">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {on.has(i) ? <span className={dot} /> : null}
        </span>
      ))}
    </span>
  );
};

function DieRow({ label, selected, onPick }: { label: string; selected: number | null; onPick: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-12">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            onClick={() => onPick(n)}
            aria-label={`${label} ${n}`}
            className={`rounded-lg border transition active:scale-95 ${
              selected === n
                ? "bg-teal-500 text-slate-900 border-teal-300"
                : "bg-slate-800 text-slate-200 border-slate-700"
            }`}
          >
            <DiePips n={n} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DiceInput({ value, onChange, onAnalyze, loading }: Props) {
  const [d1, setD1] = useState<number | null>(value?.[0] ?? null);
  const [d2, setD2] = useState<number | null>(value?.[1] ?? null);

  // Report the pair whenever both dice are set (robust to rapid updates).
  useEffect(() => {
    if (d1 != null && d2 != null) onChange([d1, d2]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d1, d2]);

  const pick1 = (n: number) => setD1(n);
  const pick2 = (n: number) => setD2(n);
  const roll = () => {
    setD1(1 + Math.floor(Math.random() * 6));
    setD2(1 + Math.floor(Math.random() * 6));
  };

  const ready = d1 != null && d2 != null;

  return (
    <div className="space-y-2.5">
      <DieRow label="Die 1" selected={d1} onPick={pick1} />
      <DieRow label="Die 2" selected={d2} onPick={pick2} />
      <div className="flex gap-2 pt-1">
        <button onClick={roll} className="flex-1 rounded-lg bg-slate-700 text-slate-100 py-2.5 text-sm font-medium active:scale-95">
          🎲 Random roll
        </button>
        <button
          onClick={onAnalyze}
          disabled={!ready || loading}
          className="flex-[2] rounded-lg bg-teal-500 text-slate-900 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-95"
        >
          {loading ? "Thinking…" : "Analyze this roll"}
        </button>
      </div>
    </div>
  );
}
