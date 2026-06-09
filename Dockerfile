# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build the static PWA into /app/dist
COPY . .
RUN npm run build

# ---- Serve stage ----------------------------------------------------------
FROM nginx:alpine AS serve

# Static site config (SPA fallback, wasm MIME, caching, precompressed assets)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Pre-gzip large/compressible assets so nginx can serve them with
# gzip_static (notably the ~18MB engine wasm -> ~9MB on the wire).
RUN find /usr/share/nginx/html \
      -type f \( -name '*.wasm' -o -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' \) \
      -exec gzip -9 -k {} \;

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
