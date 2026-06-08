import { MoveExplanation } from "../analysis/explain";
import { RichText } from "./RichText";

export default function Explanation({ exp, isBest }: { exp: MoveExplanation; isBest: boolean }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isBest ? "bg-teal-500 text-slate-900" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"}`}>
          {isBest ? "BEST MOVE" : "ALTERNATIVE"}
        </span>
        <span className="font-mono text-slate-100">{exp.notation}</span>
      </div>

      <h3 className="text-lg font-semibold text-slate-50">{exp.headline}</h3>

      {exp.paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-slate-200">
          <RichText text={p} />
        </p>
      ))}

      {exp.points.length > 0 && (
        <ul className="space-y-1 text-sm text-slate-200">
          {exp.points.map((pt, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-teal-400 mt-0.5">•</span>
              <span>
                <RichText text={pt} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-xs text-slate-400 font-mono pt-1 border-t border-slate-700/60">{exp.stats}</div>
    </div>
  );
}
