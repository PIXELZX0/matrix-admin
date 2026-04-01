import { defineConfig } from "vite";

const bffPort = Number(process.env.BFF_PORT ?? process.env.PORT ?? 8787);
const bffBaseUrl = `http://127.0.0.1:${bffPort}`;

export default defineConfig({
  preview: {
    proxy: {
      "/api": bffBaseUrl,
      "/healthz": bffBaseUrl,
    },
  },
});
