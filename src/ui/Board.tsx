import { Board as BoardModel, pipCount } from "../engine/board";

// SVG board rendered from the on-roll player's perspective ("you" = light).
//   top row (left→right):    13 14 15 16 17 18 | bar | 19 20 21 22 23 24
//   bottom row (left→right):  12 11 10  9  8  7 | bar |  6  5  4  3  2  1
// Your home board is the bottom-right quadrant (points 1–6); your back
// checkers start on 24 (top-right).

const W = 1000;
const H = 700;
const BORDER = 22;
const BAR_W = 56;
const TRAY_W = 64;
const PT_H = 272;
const PW = (W - BORDER * 2 - BAR_W - TRAY_W) / 12;
const R = PW * 0.43; // checker radius

function colX(col: number): number {
  return BORDER + col * PW + (col >= 6 ? BAR_W : 0);
}

interface PointGeom {
  cx: number;
  top: boolean;
  apex: number;
  base: number;
  left: number;
}

function pointGeom(point: number): PointGeom {
  const top = point >= 13;
  const col = top ? point - 13 : 12 - point;
  const left = colX(col);
  const cx = left + PW / 2;
  if (top) return { cx, top, apex: BORDER + PT_H, base: BORDER, left };
  return { cx, top, apex: H - BORDER - PT_H, base: H - BORDER, left };
}

export interface BoardProps {
  board: BoardModel;
  dice?: [number, number] | null;
  /** points highlighted as selectable sources */
  sources?: Set<number | "bar">;
  /** points highlighted as legal destinations */
  dests?: Set<number | "off">;
  /** points to outline (e.g. the move being inspected) */
  highlight?: Set<number>;
  selectedSource?: number | "bar" | null;
  onPointClick?: (point: number | "bar" | "off") => void;
  showPips?: boolean;
}

export default function Board({
  board,
  dice,
  sources,
  dests,
  highlight,
  selectedSource,
  onPointClick,
  showPips = true,
}: BoardProps) {
  const pips = pipCount(board);

  const renderCheckers = (point: number) => {
    const count = board.points[point];
    if (count === 0) return null;
    const mine = count > 0;
    const n = Math.abs(count);
    const g = pointGeom(point);
    const shown = Math.min(n, 5);
    const step = Math.min(2 * R * 0.92, (PT_H - R) / 5);
    const items = [];
    for (let i = 0; i < shown; i++) {
      const cy = g.top ? g.base + R + i * step : g.base - R - i * step;
      items.push(
        <g key={i}>
          <circle
            cx={g.cx}
            cy={cy}
            r={R}
            fill={mine ? "#efe7d2" : "#22262e"}
            stroke={mine ? "#b8a878" : "#05070a"}
            strokeWidth={2}
          />
          {i === shown - 1 && n > 5 && (
            <text
              x={g.cx}
              y={cy + R * 0.34}
              textAnchor="middle"
              fontSize={R * 0.9}
              fontWeight={700}
              fill={mine ? "#5b4a1f" : "#e7eaf0"}
            >
              {n}
            </text>
          )}
        </g>
      );
    }
    return items;
  };

  const renderBarCheckers = (mine: boolean) => {
    const n = mine ? board.youBar : board.oppBar;
    if (n === 0) return null;
    const cx = BORDER + 6 * PW + BAR_W / 2;
    const baseY = mine ? H - BORDER - R - 6 : BORDER + R + 6;
    const dir = mine ? -1 : 1;
    const items = [];
    const shown = Math.min(n, 4);
    for (let i = 0; i < shown; i++) {
      const cy = baseY + dir * i * (2 * R * 0.92);
      items.push(
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={R}
          fill={mine ? "#efe7d2" : "#22262e"}
          stroke={mine ? "#b8a878" : "#05070a"}
          strokeWidth={2}
        />
      );
    }
    if (n > shown) {
      items.push(
        <text key="n" x={cx} y={baseY + dir * (shown - 1) * 2 * R * 0.92 + R * 0.34} textAnchor="middle" fontSize={R * 0.9} fontWeight={700} fill={mine ? "#5b4a1f" : "#e7eaf0"}>
          {n}
        </text>
      );
    }
    return items;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none touch-manipulation" role="img" aria-label="Backgammon board">
      {/* wood frame */}
      <rect x={0} y={0} width={W} height={H} rx={14} fill="#3a2516" />
      {/* felt */}
      <rect x={BORDER} y={BORDER} width={W - BORDER * 2} height={H - BORDER * 2} fill="#0b3d2e" />
      {/* bar */}
      <rect x={BORDER + 6 * PW} y={BORDER} width={BAR_W} height={H - BORDER * 2} fill="#3a2516" />
      {/* off tray */}
      <rect x={W - BORDER - TRAY_W} y={BORDER} width={TRAY_W} height={H - BORDER * 2} fill="#082a20" stroke="#3a2516" strokeWidth={2} />

      {/* points */}
      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => {
        const g = pointGeom(p);
        const shade = (p + (g.top ? 0 : 1)) % 2 === 0 ? "#b5732f" : "#d9b38c";
        const isSource = sources?.has(p);
        const isDest = dests?.has(p);
        const isHi = highlight?.has(p);
        const isSel = selectedSource === p;
        return (
          <g key={p}>
            <polygon
              points={`${g.left},${g.base} ${g.left + PW},${g.base} ${g.cx},${g.apex}`}
              fill={shade}
              opacity={0.92}
            />
            {(isDest || isSel || isHi) && (
              <polygon
                points={`${g.left},${g.base} ${g.left + PW},${g.base} ${g.cx},${g.apex}`}
                fill={isDest ? "#34d399" : isSel ? "#fbbf24" : "none"}
                fillOpacity={isDest || isSel ? 0.28 : 0}
                stroke={isHi ? "#fbbf24" : isDest ? "#34d399" : isSel ? "#fbbf24" : "none"}
                strokeWidth={4}
              />
            )}
            {/* subtle dot marking a tappable source */}
            {isSource && !isSel && !isDest && (
              <circle cx={g.cx} cy={g.top ? g.apex + 14 : g.apex - 14} r={5} fill="#2dd4bf" opacity={0.7} />
            )}
            {renderCheckers(p)}
            {/* point number label */}
            <text
              x={g.cx}
              y={g.top ? BORDER - 6 : H - BORDER + 16}
              textAnchor="middle"
              fontSize={15}
              fill="#0b3d2e"
              opacity={0}
            >
              {p}
            </text>
            {/* tap target */}
            {onPointClick && (
              <rect
                data-point={p}
                x={g.left}
                y={g.top ? BORDER : H - BORDER - PT_H}
                width={PW}
                height={PT_H}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onPointClick(p)}
              />
            )}
          </g>
        );
      })}

      {renderBarCheckers(true)}
      {renderBarCheckers(false)}

      {/* bar tap target */}
      {onPointClick && (sources?.has("bar") || board.youBar > 0) && (
        <rect
          data-point="bar"
          x={BORDER + 6 * PW}
          y={H / 2}
          width={BAR_W}
          height={H / 2 - BORDER}
          fill={sources?.has("bar") ? "#34d399" : "transparent"}
          fillOpacity={sources?.has("bar") ? 0.25 : 0}
          style={{ cursor: "pointer" }}
          onClick={() => onPointClick("bar")}
        />
      )}

      {/* off tray tap target + borne-off counts */}
      {onPointClick && dests?.has("off") && (
        <rect
          data-point="off"
          x={W - BORDER - TRAY_W}
          y={BORDER}
          width={TRAY_W}
          height={H - BORDER * 2}
          fill="#34d399"
          fillOpacity={0.25}
          stroke="#34d399"
          strokeWidth={4}
          style={{ cursor: "pointer" }}
          onClick={() => onPointClick("off")}
        />
      )}
      {board.youOff > 0 && (
        <text x={W - BORDER - TRAY_W / 2} y={H - BORDER - 14} textAnchor="middle" fontSize={26} fontWeight={700} fill="#efe7d2">
          {board.youOff}
        </text>
      )}
      {board.oppOff > 0 && (
        <text x={W - BORDER - TRAY_W / 2} y={BORDER + 30} textAnchor="middle" fontSize={26} fontWeight={700} fill="#22262e">
          {board.oppOff}
        </text>
      )}

      {/* dice */}
      {dice && <Dice dice={dice} />}

      {/* pip counts */}
      {showPips && (
        <>
          <text x={BORDER + 8} y={H - BORDER - 10} fontSize={20} fontWeight={700} fill="#efe7d2">
            You: {pips.you}
          </text>
          <text x={BORDER + 8} y={BORDER + 24} fontSize={20} fontWeight={700} fill="#cfd6e4">
            Opp: {pips.opp}
          </text>
        </>
      )}
    </svg>
  );
}

function Dice({ dice }: { dice: [number, number] }) {
  const cx0 = BORDER + 6 * PW + BAR_W + 110;
  const y = H / 2 - 40;
  return (
    <g>
      {dice.map((d, i) => (
        <g key={i}>
          <rect x={cx0 + i * 100} y={y} width={80} height={80} rx={12} fill="#f4f1ea" stroke="#cbb88f" strokeWidth={3} />
          {pipDots(d).map(([dx, dy], j) => (
            <circle key={j} cx={cx0 + i * 100 + dx * 80} cy={y + dy * 80} r={7} fill="#1b1b1b" />
          ))}
        </g>
      ))}
    </g>
  );
}

function pipDots(n: number): [number, number][] {
  const a = 0.27,
    b = 0.5,
    c = 0.73;
  const map: Record<number, [number, number][]> = {
    1: [[b, b]],
    2: [[a, a], [c, c]],
    3: [[a, a], [b, b], [c, c]],
    4: [[a, a], [c, a], [a, c], [c, c]],
    5: [[a, a], [c, a], [b, b], [a, c], [c, c]],
    6: [[a, a], [c, a], [a, b], [c, b], [a, c], [c, c]],
  };
  return map[n] ?? [];
}
