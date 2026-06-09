# Learning that sticks: flashcards & spaced repetition

Reading why a move is good is one thing. *Remembering* it three weeks later,
across the board, is another. That gap is exactly what spaced repetition was
invented to close — so the last big piece of the app turns your studying into a
deck of flashcards.

Every position you save becomes a card. In **Quiz** mode the app shows you the
board and the dice and asks you to actually *play* the move — tap the checkers,
just like a real turn. Then it grades you against the engine's best:

- nail it, and the card comes back in a few days, then a week, then a month;
- blunder it, and you'll see it again in minutes.

The scheduling is the classic **SM-2** algorithm (the one behind Anki). The only
twist is how a backgammon move maps to a "grade": I let the engine's equity loss
decide. The best move is a 5, a negligible slip is a 4, a real mistake a 2, a
blunder a 1. The board itself does the marking — no honesty system required.

Grading the move you played, by the way, leans on the same engine call as
everything else: it re-evaluates the position live, finds the move you built
among the legal plays, and reads off exactly how far from best it was. So the
quiz isn't multiple-choice over a few canned options — you can play *anything*
legal and get judged fairly.

A couple of smaller touches round it out. You can **set up a position from a
photo** — an offline, on-device guess at the checker layout that you confirm in
the editor — for when a spot comes up over the board and you want to study it
later. And the whole thing is a installable PWA: it works on a phone, survives
going offline, and keeps your history locally.

None of this makes you good at backgammon by itself. But a coach that explains,
lets you argue back, and then quizzes you until it sticks — that's the loop I
wanted in my pocket. Thanks for reading along.
