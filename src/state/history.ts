// Saved-analysis history, persisted in IndexedDB so it survives reloads and
// works offline. Each record stores the position, the roll, and a snapshot of
// the engine's top moves so a saved entry can be reopened without re-running.

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Board } from "../engine/board";
import { EngineMove } from "../engine/gnubg";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  label: string; // e.g. "3-1 from the opening"
  board: Board;
  dice: [number, number];
  bestNotation: string;
  moves: EngineMove[]; // snapshot of the ranked moves
}

interface BgDB extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { byCreatedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<BgDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<BgDB>("bg-teacher", 1, {
      upgrade(database) {
        const store = database.createObjectStore("history", { keyPath: "id" });
        store.createIndex("byCreatedAt", "createdAt");
      },
    });
  }
  return dbPromise;
}

export async function saveEntry(entry: HistoryEntry): Promise<void> {
  await (await db()).put("history", entry);
}

export async function listEntries(): Promise<HistoryEntry[]> {
  const all = await (await db()).getAllFromIndex("history", "byCreatedAt");
  return all.reverse(); // newest first
}

export async function deleteEntry(id: string): Promise<void> {
  await (await db()).delete("history", id);
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
