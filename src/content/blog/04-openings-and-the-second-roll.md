# Openings, and teaching the second roll

Opening theory is where backgammon is most *teachable*, because the position is
always the same — only the dice change. There are exactly 15 distinct opening
rolls (no doubles on the first roll), and modern neural-net rollouts have
basically settled the best play for each.

Some of those answers overturned decades of human dogma, which I love. Players
used to "slot" the 5-point with an opening 2-1 or 4-1 — dropping a builder there
and hoping to cover it. The bots looked at millions of rollouts and said: mostly,
don't. And the once-scorned 8/2 6/2 on a 6-4 turns out to be perfectly
respectable. The opening book in the app reflects the bot consensus, not the old
textbooks.

But the question I really wanted to answer was the *next* one: **your opponent
opened, played the book move — now what do you do?**

This is a much bigger space. After each of the 15 openings, you can roll any of
21 combinations, so there are a few hundred "second roll" positions. Too many to
hand-write, but perfectly bounded for a computer.

So I wrote a little build script that does, offline and ahead of time, exactly
what the app does live: it plays each opening, flips the board to your side, asks
the engine for the best reply to all 21 rolls, and runs the *same* explanation
generator over each one. The result is a small data file the app ships with — a
browsable reference of "best response, and why" for every standard opening
reply. No engine calls needed at study time; it's just there.

The nice thing about generating it from the live machinery, rather than typing
it up, is that it can't drift. Improve the explainer, regenerate the book, and
every one of those few-hundred explanations gets better at once.
