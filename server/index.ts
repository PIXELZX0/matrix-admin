import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { env } from "./lib/env";

const app = createApp();

serve(
  {
    fetch: app.fetch,
    hostname: env.HOST,
    port: env.PORT,
  },
  info => {
    console.log(`Matrix Admin server listening on http://${env.HOST}:${info.port}`);
  }
);
