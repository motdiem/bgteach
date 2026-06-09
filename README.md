# Pocket Backgammon Teacher

A mobile-friendly, fully client-side web app that coaches you on backgammon. Set
up any position, enter a dice roll, and get the **best move explained in plain
English** — plus the ability to ask why any alternative is worse. Keeps a
history of the positions you've studied. Works offline as an installable PWA.

## How it works

- **Engine (ground truth):** GNU Backgammon's neural-net evaluator, compiled to
  WebAssembly via [`foochu/bgweb-api`](https://github.com/foochu/bgweb-api) (MIT).
  It runs entirely in the browser and returns, for every legal move, the equity,
  the equity loss vs. the best move, and win/gammon/backgammon probabilities.
- **Explanations (offline, rule-based):** the engine decides *which* move is
  best; the app explains *why* using positional features (pip count, blots and
  shot counts, points made, primes, anchors, game phase) anchored to the
  engine's numbers. The 15 opening rolls use a curated rollout-based book.
- **No backend.** Everything — engine, analysis, and history (IndexedDB) — runs
  in the browser. The service worker caches the engine so it works offline.
- **Set up from a photo (beta).** In the *Set up* tab you can load a photo or
  screenshot of a board; an on-device, offline heuristic estimates the checker
  positions and drops them into the editor for you to confirm and correct. It
  works best on clear, top-down digital boards and is intentionally best-effort
  — always check the result before analyzing.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (board math, shot counting, move matching, book)
npm run build    # production PWA build into dist/
```

## Regenerating the engine

`public/engine/gnubg.wasm` and `wasm_exec.js` are built from `foochu/bgweb-api`:

```bash
git clone https://github.com/foochu/bgweb-api
cd bgweb-api && GOARCH=wasm GOOS=js go build -o lib.wasm ./cmd/wasm/main.go
cp lib.wasm /path/to/this/repo/public/engine/gnubg.wasm
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" /path/to/this/repo/public/engine/
```

## Licensing note

`bgweb-api` is MIT, but the bundled gnubg neural-net weights are GPL. Shipping
the weights makes a distributed build subject to the **GPL**.
