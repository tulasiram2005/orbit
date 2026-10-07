import { portSchema } from "@orbit/config";

import { createApp } from "./app.js";

const port = portSchema.parse(process.env.API_PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  process.stdout.write(`Orbit API listening on ${port}\n`);
});
