import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const bffPort = Number(process.env.BFF_PORT ?? process.env.PORT ?? 8787);
const bffBaseUrl = `http://127.0.0.1:${bffPort}`;

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": bffBaseUrl,
      "/healthz": bffBaseUrl,
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: mode === "development",
  },
  test: {
    environment: "happy-dom",
    exclude: ["e2e/**", "node_modules/**", "dist/**", "dist-server/**"],
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
    setupFiles: "./src/vitest.setup.ts",
  },
}));
