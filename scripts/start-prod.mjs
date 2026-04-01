import { spawn } from "node:child_process";

const bffPort = process.env.BFF_PORT ?? process.env.PORT ?? "8787";
const frontendPort = process.env.FRONTEND_PORT ?? "5173";
const frontendHost = process.env.FRONTEND_HOST ?? "0.0.0.0";

const childEnv = { ...process.env };

const bff = spawn("node", ["dist-server/index.js"], {
  env: { ...childEnv, HOST: "127.0.0.1", PORT: bffPort },
  stdio: "inherit",
});

const frontend = spawn(
  "node",
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--config",
    "vite.preview.config.mjs",
    "--configLoader",
    "native",
    "--host",
    frontendHost,
    "--port",
    frontendPort,
  ],
  {
    env: { ...childEnv, BFF_PORT: bffPort },
    stdio: "inherit",
  }
);

let shuttingDown = false;
let exitedChildren = 0;
let exitCode = 0;

const terminateChildren = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  bff.kill("SIGTERM");
  frontend.kill("SIGTERM");
};

process.on("SIGINT", terminateChildren);
process.on("SIGTERM", terminateChildren);

const onChildExit = (code, signal) => {
  if (!shuttingDown) {
    exitCode = code ?? (signal ? 1 : 0);
    terminateChildren();
  } else if (code && code !== 0) {
    exitCode = code;
  }

  exitedChildren += 1;
  if (exitedChildren >= 2) {
    process.exit(exitCode);
  }
};

const onChildError = error => {
  console.error(error);
  exitCode = 1;
  terminateChildren();
};

bff.on("error", onChildError);
frontend.on("error", onChildError);

bff.on("exit", onChildExit);
frontend.on("exit", onChildExit);
