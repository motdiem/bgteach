# Why I built a coach, not another bot

There are plenty of backgammon apps that will *beat* you. That was never what I
wanted. When I lose to a bot, I learn exactly one thing: that I lost. The bot
knows why my move was bad, but it keeps that to itself and just rolls the dice
again.

So the goal here was different from day one: **a pocket coach that explains its
thinking in plain English.** Not "the equity of 24/13 is -0.082," but "that
leaves a blot your opponent hits with 17 of 36 rolls, and you give up the chance
to make your 5-point — which is why it's a mistake."

A few principles fell out of that almost immediately:

- **You should be able to ask "why not my move?"** Learning happens when the
  app engages with *your* idea, not just its own. So every position lets you
  play any legal move and get a comparison: how much equity it costs, and what
  it gives up.
- **Setting up a position has to be effortless.** Half of studying backgammon
  is replaying a spot that went wrong. Tap a few checkers, or even snap a photo
  of the board, and you're analyzing in seconds.
- **It has to live in your pocket.** Good on a phone, works on the train with no
  signal, and remembers what you studied.

The interesting tension is this: I am *not* a strong enough player to be the
teacher. The engine is. My job was never to invent backgammon wisdom — it was to
**translate** a world-class engine's cold numbers into something a human can
actually learn from. The rest of these posts are about how that translation
works.
