import { Router } from "express";
import { dashboardQuerySchema } from "@orbit/shared";

import { requireAuth } from "../auth/auth.middleware.js";
import type { ApiEnv } from "../config/env.js";
import { asyncHandler } from "../http/async-handler.js";
import { validateQuery } from "../http/validation.js";
import { prisma } from "../prisma/client.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardRepository } from "./dashboard.repository.js";

export function createDashboardRouter(env: ApiEnv) {
  const router = Router();
  const controller = new DashboardController(new DashboardRepository(prisma));

  router.use(requireAuth(env));
  router.get("/", validateQuery(dashboardQuerySchema), asyncHandler(controller.get));

  return router;
}
