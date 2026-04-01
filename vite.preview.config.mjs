const bffPort = Number(process.env.BFF_PORT ?? process.env.PORT ?? 8787);
const bffBaseUrl = `http://127.0.0.1:${bffPort}`;

/** @type {import("vite").UserConfig} */
const config = {
  preview: {
    proxy: {
      "/api": bffBaseUrl,
      "/healthz": bffBaseUrl,
    },
  },
};

export default config;
