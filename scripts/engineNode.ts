// Node-side driver for the gnubg wasm engine, used by build scripts (e.g.
// generating the second-roll book). Mirrors src/engine/gnubg.ts but loads the
// wasm from disk and runs the Go runtime under Node instead of the browser.

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { TextEncoder, TextDecoder } from "util";
import { Board, toEngineBoard } from "../src/engine/board";
import type { EngineMove } from "../src/engine/gnubg";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

let ready = false;

export async function initNodeEngine(): Promise<void> {
  if (ready) return;
  const g = globalThis as any;
  g.require = createRequire(import.meta.url);
  g.fs = await import("fs");
  g.TextEncoder = TextEncoder;
  g.TextDecoder = TextDecoder;
  // Executes wasm_exec.js, which defines globalThis.Go.
  await import(resolve(root, "public/engine/wasm_exec.js"));
  const go = new g.Go();
  const bytes = readFileSync(resolve(root, "public/engine/gnubg.wasm"));
  const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
  go.run(instance); // yields at the Go <-c, leaving wasm_get_moves registered
  await new Promise((r) => setTimeout(r, 200));
  if (typeof g.wasm_get_moves !== "function") {
    throw new Error("Node engine init failed: wasm_get_moves missing");
  }
  ready = true;
}

export async function getMovesNode(board: Board, dice: [number, number]): Promise<EngineMove[]> {
  await initNodeEngine();
  const input = JSON.stringify({
    board: toEngineBoard(board),
    dice,
    player: "x",
    "max-moves": 9999,
    "score-moves": true,
  });
  const raw = (globalThis as any).wasm_get_moves(input);
  const parsed = JSON.parse(raw);
  if (parsed && parsed.error) throw new Error(`Engine error: ${parsed.error}`);
  return parsed as EngineMove[];
}
