import { Board, emptyBoard, startingPosition } from "../engine/board";

export interface Preset {
  name: string;
  description: string;
  make: () => Board;
}

function build(you: Record<number, number>, opp: Record<number, number>, extra?: Partial<Board>): Board {
  const b = emptyBoard();
  for (const [p, n] of Object.entries(you)) b.points[+p] = n;
  for (const [p, n] of Object.entries(opp)) b.points[+p] = -n;
  return { ...b, ...extra };
}

export const PRESETS: Preset[] = [
  {
    name: "Standard start",
    description: "The normal opening position.",
    make: startingPosition,
  },
  {
    name: "Bear-off race",
    description: "No contact — pure race, all checkers home.",
    make: () =>
      build(
        { 6: 3, 5: 3, 4: 3, 3: 2, 2: 2, 1: 2 },
        { 19: 3, 20: 3, 21: 3, 22: 2, 23: 2, 24: 2 }
      ),
  },
  {
    name: "Holding game (20-anchor)",
    description: "You hold the golden anchor, behind in the race.",
    make: () =>
      build(
        { 20: 2, 13: 4, 8: 3, 6: 4, 4: 2 },
        { 1: 2, 5: 2, 11: 4, 17: 3, 19: 4 }
      ),
  },
  {
    name: "Blitz (opponent on the bar)",
    description: "Strong home board, opponent dancing on the bar.",
    make: () =>
      build(
        { 24: 2, 13: 4, 8: 3, 6: 2, 5: 2, 4: 2 },
        { 1: 1, 12: 5, 17: 4, 19: 4 },
        { oppBar: 1 }
      ),
  },
];
