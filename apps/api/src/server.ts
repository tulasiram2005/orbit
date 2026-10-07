import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(currentDir, "../.env");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const env = readEnv();
const app = createApp(env);

app.listen(env.API_PORT, () => {
  process.stdout.write(`Orbit API listening on ${env.API_PORT}\n`);
});
