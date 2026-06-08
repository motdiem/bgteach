import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["engine/gnubg.wasm", "engine/wasm_exec.js", "icons/icon.svg"],
      workbox: {
        // The gnubg neural-net wasm is ~18MB; allow it to be precached so the
        // app works fully offline after the first load.
        maximumFileSizeToCacheInBytes: 24 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,wasm,svg,png,ico}"],
      },
      manifest: {
        name: "Pocket Backgammon Teacher",
        short_name: "BG Teacher",
        description: "A pocket backgammon coach that explains the best move and why.",
        theme_color: "#0f766e",
        background_color: "#0b1220",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
  },
});
