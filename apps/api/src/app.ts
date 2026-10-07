import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import type { HealthResponse } from "@orbit/shared";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: ["http://localhost:3000"] }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());

  app.get("/health", (_request, response) => {
    const payload: HealthResponse = {
      success: true,
      data: {
        status: "ok",
        service: "api",
      },
    };

    response.json(payload);
  });

  return app;
}
