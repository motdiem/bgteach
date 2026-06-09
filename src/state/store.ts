import { create } from "zustand";
import { Board, startingPosition } from "../engine/board";
import { EngineMove, getMoves, initEngine } from "../engine/gnubg";
import { dueCount } from "./history";

export type Tab = "analyze" | "openings" | "quiz" | "edit" | "history";

interface AppState {
  tab: Tab;
  board: Board;
  dice: [number, number] | null;
  moves: EngineMove[] | null;
  selectedIndex: number;
  loading: boolean;
  engineReady: boolean;
  error: string | null;
  dueCount: number;

  setTab: (t: Tab) => void;
  setBoard: (b: Board) => void;
  resetToStart: () => void;
  setDice: (d: [number, number] | null) => void;
  analyze: () => Promise<void>;
  selectMove: (i: number) => void;
  clearAnalysis: () => void;
  warmEngine: () => void;
  refreshDueCount: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  tab: "analyze",
  board: startingPosition(),
  dice: null,
  moves: null,
  selectedIndex: 0,
  loading: false,
  engineReady: false,
  error: null,
  dueCount: 0,

  setTab: (tab) => set({ tab }),

  refreshDueCount: async () => {
    try {
      set({ dueCount: await dueCount() });
    } catch {
      /* ignore */
    }
  },

  setBoard: (board) => set({ board, moves: null, dice: null, selectedIndex: 0, error: null }),

  resetToStart: () => set({ board: startingPosition(), moves: null, dice: null, selectedIndex: 0, error: null }),

  setDice: (dice) => set({ dice, moves: null, selectedIndex: 0, error: null }),

  selectMove: (selectedIndex) => set({ selectedIndex }),

  clearAnalysis: () => set({ moves: null, selectedIndex: 0, error: null }),

  warmEngine: () => {
    initEngine()
      .then(() => set({ engineReady: true }))
      .catch((e) => set({ error: String(e) }));
  },

  analyze: async () => {
    const { board, dice } = get();
    if (!dice) return;
    set({ loading: true, error: null });
    try {
      const moves = await getMoves(board, dice);
      set({ moves, selectedIndex: 0, loading: false, engineReady: true });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },
}));
