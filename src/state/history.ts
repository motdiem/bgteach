// Saved-analysis history, persisted in IndexedDB so it survives reloads and
// works offline. Each record stores the position, the roll, and a snapshot of
// the engine's top moves so a saved entry can be reopened without re-running.

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Board } from "../engine/board";
import { EngineMove } from "../engine/gnubg";
import { newCard, SrsCard } from "./srs";

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
  srs: {
    key: string;
    value: SrsCard;
    indexes: { byDue: number };
  };
}

let dbPromise: Promise<IDBPDatabase<BgDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<BgDB>("bg-teacher", 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const store = database.createObjectStore("history", { keyPath: "id" });
          store.createIndex("byCreatedAt", "createdAt");
        }
        if (oldVersion < 2) {
          const srs = database.createObjectStore("srs", { keyPath: "id" });
          srs.createIndex("byDue", "due");
          // Existing history entries are enrolled lazily on read (ensureCard),
          // so no data migration is needed here.
        }
      },
    });
  }
  return dbPromise;
}

export async function saveEntry(entry: HistoryEntry): Promise<void> {
  const d = await db();
  await d.put("history", entry);
  await ensureCard(entry.id); // every saved position joins the quiz deck
}

export async function listEntries(): Promise<HistoryEntry[]> {
  const all = await (await db()).getAllFromIndex("history", "byCreatedAt");
  return all.reverse(); // newest first
}

export async function deleteEntry(id: string): Promise<void> {
  const d = await db();
  await d.delete("history", id);
  await d.delete("srs", id); // remove the card too
}

// ---- Spaced-repetition deck (flashcards over saved positions) -------------

/** Get the SRS card for a position, creating a default one if it doesn't exist. */
export async function ensureCard(id: string): Promise<SrsCard> {
  const d = await db();
  const existing = await d.get("srs", id);
  if (existing) return existing;
  const card = newCard(id);
  await d.put("srs", card);
  return card;
}

export async function saveCard(card: SrsCard): Promise<void> {
  await (await db()).put("srs", card);
}

export interface DeckItem {
  entry: HistoryEntry;
  card: SrsCard;
}

/** The full deck: every saved position paired with its SRS card. */
export async function getDeck(): Promise<DeckItem[]> {
  const entries = await listEntries();
  const out: DeckItem[] = [];
  for (const entry of entries) out.push({ entry, card: await ensureCard(entry.id) });
  return out;
}

/** Due cards, soonest-due first. */
export async function listDueCards(now: number = Date.now()): Promise<DeckItem[]> {
  return (await getDeck()).filter((x) => x.card.due <= now).sort((a, b) => a.card.due - b.card.due);
}

export async function dueCount(now: number = Date.now()): Promise<number> {
  return (await listDueCards(now)).length;
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
