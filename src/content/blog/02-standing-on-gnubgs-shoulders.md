# Standing on gnubg's shoulders

The hardest problem in a backgammon teacher — *which move is actually best?* —
is also the one I was least qualified to solve. Luckily, it's already solved.

**GNU Backgammon (gnubg)** plays at a world-class level. Its evaluation grew out
of Gerald Tesauro's TD-Gammon, the famous 1990s experiment where a neural
network taught itself the game by playing millions of games against itself and
nudging its own weights toward whatever tended to win. The result plays better
than almost any human alive.

The catch: gnubg is a C program with a desktop GUI. I wanted something that runs
in a browser, offline, with no server to pay for. Enter a wonderful open-source
project, `bgweb-api`, which compiles gnubg's neural-net evaluator to
**WebAssembly**. That means the actual engine — the same nets — runs *inside the
phone*, no network required.

For any position and dice roll, it hands back every legal move, ranked, each
with:

- an **equity** (roughly: how many points you expect to win or lose, on average,
  playing this position out forever),
- the **equity difference** versus the best move, and
- the full **win / gammon / backgammon** probabilities.

This is the bedrock the whole app stands on. The teacher never has to *guess*
which move is best or how much a mistake costs — those numbers are ground truth,
straight from the net.

There's a tradeoff worth being honest about: those neural-net weights are big,
so the engine is a ~18 MB download the first time. The service worker caches it
once, and after that the app is fully offline. For a coach you'll open again and
again, a one-time download felt like a fair price for having a grandmaster in
your pocket with no internet.

The next post is about the fun part: turning those numbers into words.
