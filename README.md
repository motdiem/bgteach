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

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (board math, shot counting, move matching, book)
npm run build    # production PWA build into dist/
```

## Deploy with Docker

The app is a static PWA, so deployment is just static hosting. The included
multi-stage `Dockerfile` builds the site with Node and serves it with nginx
(correct `application/wasm` MIME type, SPA fallback, long-cache for hashed
assets, and pre-gzipped files so the ~18 MB engine ships as ~9 MB).

```bash
# Build and run with Docker
docker build -t pocket-backgammon-teacher .
docker run --rm -p 8080:8080 pocket-backgammon-teacher
# → open http://localhost:8080

# …or with Docker Compose
docker compose up --build -d      # serves on http://localhost:8080
docker compose down
```

No environment variables or secrets are needed — the engine, analysis, and
history all run in the browser. Behind a reverse proxy (Caddy, Traefik, nginx),
forward to the container's port `8080` and terminate TLS there; serving over
HTTPS is required for the PWA/service-worker to install. The first visit
downloads the engine once, after which the app works offline.

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
