import { useMemo, useState } from "react";
import { SECOND_ROLL } from "../analysis/openingBook";
import { applyNotation } from "../engine/board";
import BoardView from "./Board";
import Explanation from "./Explanation";

// The 21 distinct reply rolls (high-low).
const REPLY_ROLLS: [number, number][] = [];
for (let hi = 1; hi <= 6; hi++) for (let lo = 1; lo <= hi; lo++) REPLY_ROLLS.push([hi, lo]);
const rk = (d: [number, number]) => [d[0], d[1]].sort((a, b) => b - a).join("");

export default function OpeningsTab() {
  const openings = useMemo(
    () => [...SECOND_ROLL].sort((a, b) => a.openingRoll.localeCompare(b.openingRoll)),
    []
  );
  const [openIdx, setOpenIdx] = useState(0);
  const [replyKey, setReplyKey] = useState<string | null>(null);

  const opening = openings[openIdx];
  const reply = opening && replyKey ? opening.replies[replyKey] : null;

  if (!opening) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
        The opening reply book hasn't been generated yet. Run{" "}
        <code className="font-mono text-teal-300">npm run gen:book</code>.
      </div>
    );
  }

  // Once a reply is chosen, preview the resulting position on the board.
  const shownBoard = reply ? applyNotation(opening.board, reply.notation) : opening.board;
  const fmtRoll = (r: string) => `${r[0]}-${r[1]}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Pick the opponent's opening</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {openings.map((o, i) => (
            <button
              key={o.openingRoll}
              onClick={() => {
                setOpenIdx(i);
                setReplyKey(null);
              }}
              className={`rounded-lg px-2 py-2 text-center active:scale-95 ${
                i === openIdx ? "bg-teal-500 text-slate-900" : "bg-slate-800 text-slate-200 border border-slate-700"
              }`}
            >
              <div className="font-mono text-sm font-semibold">{fmtRoll(o.openingRoll)}</div>
              <div className="text-[10px] opacity-80 leading-tight">{o.openingNotation}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-slate-300 px-1">
        Opponent opened <span className="font-mono text-slate-100">{fmtRoll(opening.openingRoll)}</span> and played{" "}
        <span className="font-mono text-teal-300">{opening.openingNotation}</span>. Now it's your roll — pick it below.
      </div>

      <BoardView board={shownBoard} selectedSource={null} />

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-2">
        <div className="text-xs uppercase tracking-wide text-slate-400">Your reply roll</div>
        <div className="grid grid-cols-6 gap-1.5">
          {REPLY_ROLLS.map((d) => {
            const key = rk(d);
            const isDouble = d[0] === d[1];
            return (
              <button
                key={key}
                onClick={() => setReplyKey(key)}
                className={`rounded-lg py-2 text-sm font-mono active:scale-95 ${
                  replyKey === key
                    ? "bg-amber-500 text-slate-900"
                    : isDouble
                    ? "bg-slate-700 text-amber-200 border border-slate-600"
                    : "bg-slate-800 text-slate-200 border border-slate-700"
                }`}
              >
                {d[0]}-{d[1]}
              </button>
            );
          })}
        </div>
      </div>

      {reply ? (
        <Explanation exp={reply} isBest={true} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 text-center">
          Tap a reply roll to see the best response and why.
        </div>
      )}
    </div>
  );
}
