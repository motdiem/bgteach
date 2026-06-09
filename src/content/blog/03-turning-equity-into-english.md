# Turning equity into English

Here's the key insight that made the whole "teaching" part tractable: **because
the engine already knows the right answer, the explainer never has to be smart
about strategy — only about description.**

That's a huge simplification. Picking the best backgammon move by hand-written
rules is hopeless. But *describing the difference* between two positions the
engine has already judged? That's very doable.

So when you ask why a move is good (or why yours is worse), the app:

1. Plays out both moves and looks at the resulting positions.
2. Computes a handful of human-meaningful **features** of each: the pip count
   (the race), which points you made, how many blots you left and how many of
   the 36 dice rolls hit them, your prime length, your anchors, the game phase
   (race, holding, priming, blitz, bearoff…).
3. Describes what *changed*, ordered by importance — and always anchors it to
   the engine's actual numbers.

That last part matters. The prose and the math can never disagree, because the
prose is generated *from* the math. When it says "this costs about 0.08 equity
and drops your gammon chances from 18% to 12%," those are gnubg's figures, not a
vibe.

A couple of the features were satisfying little puzzles on their own. **Shot
counting** — "how many of the 36 rolls hit this blot?" — has to account for
direct hits, combination hits like 4+2 to land on a 6, and the fact that an
intervening point you own *blocks* the indirect route. Getting that right is
what lets the app say "exposed to 17 of 36 rolls" instead of hand-waving about
"some risk."

For the very first roll of the game, I leaned on decades of human and computer
analysis instead of regenerating it live — a small curated **opening book**. But
the moment you're off the beaten path, the feature-based explainer takes over.
And it turns out that "name what changed, in order of importance, with the real
numbers attached" is a surprisingly good imitation of how a strong player talks.
