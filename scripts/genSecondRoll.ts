// Generates src/analysis/secondRollBook.generated.json.
//
// For each of the 15 recommended opening plays, we play the opening from the
// standard start, flip to the replier's perspective, and ask the engine for the
// best reply to every one of the 21 distinct response rolls — then run the same
// explanation generator the app uses. Run with: `npm run gen:book`.

import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { applyNotation, applyPlay, flipPerspective, positionKey, startingPosition } from "../src/engine/board";
import { explainMove } from "../src/analysis/explain";
import { OPENING_BEST, rollKey } from "../src/analysis/openingBook";
import { getMovesNode } from "./engineNode";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../src/analysis/secondRollBook.generated.json");

// The 21 distinct rolls (high-low), including doubles.
const replyRolls: [number, number][] = [];
for (let hi = 6; hi >= 1; hi--) for (let lo = hi; lo >= 1; lo--) replyRolls.push([hi, lo]);

async function main() {
  const out: any[] = [];

  for (const [roll, bestNotation] of Object.entries(OPENING_BEST)) {
    const dice: [number, number] = [parseInt(roll[0], 10), parseInt(roll[1], 10)];
    const start = startingPosition();

    // Resolve the recommended opening play to an engine move by matching the
    // RESULTING position (notation hop-ordering is irrelevant this way).
    const openCands = await getMovesNode(start, dice);
    const targetKey = positionKey(applyNotation(start, bestNotation));
    let best = openCands.find((c) => positionKey(applyPlay(start, c.play)) === targetKey);
    if (!best) {
      console.warn(`  ! no legal match for ${roll} "${bestNotation}", using engine top`);
      best = openCands[0];
    }

    // After the opening, flip so the replier is on roll ("you").
    const replier = flipPerspective(applyPlay(start, best.play));

    const replies: Record<string, ReturnType<typeof explainMove>> = {};
    for (const rd of replyRolls) {
      const cands = await getMovesNode(replier, rd);
      replies[rollKey(rd)] = explainMove(replier, cands[0], rd, true);
    }

    out.push({
      openingRoll: roll,
      openingNotation: bestNotation,
      board: replier,
      boardKey: positionKey(replier),
      replies,
    });
    console.log(`✓ ${roll} ${bestNotation} (${Object.keys(replies).length} replies)`);
  }

  writeFileSync(outPath, JSON.stringify(out));
  console.log(`\nWrote ${out.length} openings → ${outPath}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
