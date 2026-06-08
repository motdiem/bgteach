// Loads the gnubg neural-net engine (compiled from foochu/bgweb-api to wasm)
// and exposes a typed getMoves() wrapper. The wasm is loaded once and the Go
// runtime keeps running, exposing globalThis.wasm_get_moves(jsonString).

import { Board, Play, toEngineBoard } from "./board";

export interface MoveProbability {
  win: number;
  winG: number;
  winBG: number;
  lose: number;
  loseG: number;
  loseBG: number;
}

export interface EngineMove {
  play: Play;
  evaluation: {
    eq: number;
    diff: number; // equity loss vs the best move (<= 0)
    info: { cubeful: boolean; plies: number };
    probability: MoveProbability;
  };
}

declare global {
  // provided by wasm_exec.js
  // eslint-disable-next-line no-var
  var Go: { new (): { importObject: WebAssembly.Imports; run: (i: WebAssembly.Instance) => void } };
  // provided by our wasm module once initialized
  // eslint-disable-next-line no-var
  var wasm_get_moves: ((input: string) => string) | undefined;
}

const WASM_EXEC_URL = "/engine/wasm_exec.js";
const WASM_URL = "/engine/gnubg.wasm";

let readyPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Initialize the engine. Safe to call repeatedly; only loads once. */
export function initEngine(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await loadScript(WASM_EXEC_URL);
    const go = new globalThis.Go();
    const result = await WebAssembly.instantiateStreaming(fetch(WASM_URL), go.importObject);
    go.run(result.instance); // yields at the Go <-c, leaving wasm_get_moves registered
    // Give the Go runtime a tick to register the global function.
    await new Promise((r) => setTimeout(r, 0));
    if (typeof globalThis.wasm_get_moves !== "function") {
      throw new Error("Engine initialized but wasm_get_moves is not available");
    }
  })();
  return readyPromise;
}

export interface GetMovesOptions {
  maxMoves?: number;
  cubeful?: boolean;
}

/**
 * Return every legal move for the given dice from the player on roll, ranked
 * best-first, each scored with equity, equity-diff and win/gammon/backgammon
 * probabilities.
 */
export async function getMoves(
  board: Board,
  dice: [number, number],
  opts: GetMovesOptions = {}
): Promise<EngineMove[]> {
  await initEngine();
  const engineBoard = toEngineBoard(board);
  const input = JSON.stringify({
    board: engineBoard,
    dice,
    player: "x",
    "max-moves": opts.maxMoves ?? 9999,
    "score-moves": true,
    cubeful: opts.cubeful ?? false,
  });
  const raw = globalThis.wasm_get_moves!(input);
  const parsed = JSON.parse(raw);
  if (parsed && parsed.error) {
    throw new Error(`Engine error: ${parsed.error}`);
  }
  return parsed as EngineMove[];
}
