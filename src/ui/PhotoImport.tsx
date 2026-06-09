import { useRef, useState } from "react";
import { Board } from "../engine/board";
import { HomeQuadrant, scanBoard } from "../vision/boardScan";

interface Props {
  onDetected: (board: Board) => void;
}

type Corner = "tl" | "tr" | "br" | "bl";
const CORNER_ORDER: Corner[] = ["tl", "tr", "br", "bl"];

export default function PhotoImport({ onDetected }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [youAreLight, setYouAreLight] = useState(true);
  const [home, setHome] = useState<HomeQuadrant>("br");
  const [drag, setDrag] = useState<Corner | null>(null);
  // Corners as fractions (0..1) of the displayed image, default slight inset.
  const [corners, setCorners] = useState<Record<Corner, { x: number; y: number }>>({
    tl: { x: 0.03, y: 0.03 },
    tr: { x: 0.97, y: 0.03 },
    br: { x: 0.97, y: 0.97 },
    bl: { x: 0.03, y: 0.97 },
  });
  const boxRef = useRef<HTMLDivElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const moveCorner = (clientX: number, clientY: number) => {
    if (!drag || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    setCorners((c) => ({ ...c, [drag]: { x, y } }));
  };

  const detect = async () => {
    if (!src || !natural) return;
    const img = new Image();
    img.src = src;
    await img.decode().catch(() => {});
    const canvas = document.createElement("canvas");
    canvas.width = natural.w;
    canvas.height = natural.h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, natural.w, natural.h);
    const toPx = (c: { x: number; y: number }) => ({ x: c.x * natural.w, y: c.y * natural.h });
    const board = scanBoard(
      { width: natural.w, height: natural.h, data: data.data },
      {
        corners: [toPx(corners.tl), toPx(corners.tr), toPx(corners.br), toPx(corners.bl)],
        homeQuadrant: home,
        youAreLight,
      }
    );
    onDetected(board);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">Scan a photo (beta)</div>
      <p className="text-xs text-slate-400">
        Best-effort detection from a clear, top-down photo or screenshot. Drag the four corners to the edge of the
        playing area, then tap Detect — you can fix any miscounts in the editor below.
      </p>

      <label className="block">
        <span className="sr-only">Choose an image</span>
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-500 file:px-3 file:py-1.5 file:text-slate-900 file:font-medium"
        />
      </label>

      {src && (
        <>
          <div
            ref={boxRef}
            className="relative w-full select-none touch-none overflow-hidden rounded-lg border border-slate-600"
            onPointerMove={(e) => drag && moveCorner(e.clientX, e.clientY)}
            onPointerUp={() => setDrag(null)}
            onPointerLeave={() => setDrag(null)}
          >
            <img src={src} onLoad={onImgLoad} className="block w-full h-auto pointer-events-none" alt="board to scan" />
            {/* quad outline */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={CORNER_ORDER.map((k) => `${corners[k].x * 100},${corners[k].y * 100}`).join(" ")}
                fill="rgba(45,212,191,0.12)"
                stroke="#2dd4bf"
                strokeWidth={0.6}
              />
            </svg>
            {CORNER_ORDER.map((k) => (
              <div
                key={k}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setDrag(k);
                }}
                style={{ left: `${corners[k].x * 100}%`, top: `${corners[k].y * 100}%` }}
                className="absolute -ml-3 -mt-3 w-6 h-6 rounded-full bg-teal-400/90 border-2 border-white shadow touch-none"
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Your checkers are</div>
              <div className="flex gap-1.5">
                {[
                  [true, "Light"],
                  [false, "Dark"],
                ].map(([val, label]) => (
                  <button
                    key={String(val)}
                    onClick={() => setYouAreLight(val as boolean)}
                    className={`flex-1 rounded-lg py-1.5 text-sm active:scale-95 ${
                      youAreLight === val ? "bg-teal-500 text-slate-900" : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Your home is</div>
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    ["bl", "◣ B-L"],
                    ["br", "◢ B-R"],
                    ["tl", "◤ T-L"],
                    ["tr", "◥ T-R"],
                  ] as [HomeQuadrant, string][]
                ).map(([q, label]) => (
                  <button
                    key={q}
                    onClick={() => setHome(q)}
                    className={`rounded-lg py-1 text-xs active:scale-95 ${
                      home === q ? "bg-teal-500 text-slate-900" : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={detect}
            disabled={!natural}
            className="w-full rounded-lg bg-teal-500 text-slate-900 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-95"
          >
            Detect board →
          </button>
        </>
      )}
    </div>
  );
}
