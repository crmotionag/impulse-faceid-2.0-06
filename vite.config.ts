import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// NOTE: Shen.AI SDK requires SharedArrayBuffer (COOP/COEP headers).
// We DO NOT set those headers at the dev/preview server level because they
// break the Lovable preview iframe. Instead, the COI service worker
// (`public/coi-serviceworker.js`, registered from `index.html`) injects
// the headers on the client side, and only when needed.

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "shenai-sdk": path.resolve(__dirname, "./vendor/shenai-sdk/index.mjs"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
