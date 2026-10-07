import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";

const env = readEnv();
const app = createApp(env);

app.listen(env.API_PORT, () => {
  process.stdout.write(`Orbit API listening on ${env.API_PORT}\n`);
});
