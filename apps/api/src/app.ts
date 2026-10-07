import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import type { HealthResponse } from "@orbit/shared";

import type { ApiEnv } from "./config/env.js";
import { readEnv } from "./config/env.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { createDashboardRouter } from "./dashboard/dashboard.routes.js";
import { errorHandler } from "./http/error-handler.js";
import { requestId } from "./http/request-id.js";
import { prisma } from "./prisma/client.js";
import { createProjectRouter } from "./projects/project.routes.js";
import { createProjectTasksRouter, createTaskRouter } from "./tasks/task.routes.js";

export function createApp(env: ApiEnv = readEnv()) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.API_CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(
    pinoHttp({
      enabled: env.NODE_ENV !== "test",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.refreshToken",
        "res.headers.set-cookie",
      ],
      genReqId: (request) => request.id,
    })
  );

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
  app.get("/ready", async (_request, response, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({
        success: true,
        data: {
          status: "ready",
          service: "api",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", createAuthRouter(env));
  app.use("/api/projects", createProjectTasksRouter(env));
  app.use("/api/projects", createProjectRouter(env));
  app.use("/api/tasks", createTaskRouter(env));
  app.use("/api/dashboard", createDashboardRouter(env));
  app.use(errorHandler);

  return app;
}
