// Pre-generated second-roll reference: for each of the 15 recommended opening
// plays, the best reply (with explanation) for all 21 distinct response rolls.
//
// The data is produced offline by `scripts/genSecondRoll.ts` (which drives the
// gnubg engine in Node and reuses the same explanation generator the app uses),
// so there are no runtime engine calls for the study screen. Regenerate with
// `npm run gen:book`.

import { Board } from "../engine/board";
import { MoveExplanation } from "./explain";
import data from "./secondRollBook.generated.json";

/** A single best-reply card — exactly the app's MoveExplanation shape. */
export type SecondRollReply = MoveExplanation;

export interface SecondRollOpening {
  /** Opening roll, high-low, e.g. "31". */
  openingRoll: string;
  /** The recommended opening play, e.g. "8/5 6/5". */
  openingNotation: string;
  /** The position the REPLIER faces (replier = "you" in this board). */
  board: Board;
  /** positionKey(board) — used to match a live board to this opening. */
  boardKey: string;
  /** Best reply keyed by reply roll high-low, e.g. "65". */
  replies: Record<string, SecondRollReply>;
}

export const SECOND_ROLL: SecondRollOpening[] = data as unknown as SecondRollOpening[];

export const SECOND_ROLL_BY_KEY: Map<string, SecondRollOpening> = new Map(
  SECOND_ROLL.map((o) => [o.boardKey, o])
);
