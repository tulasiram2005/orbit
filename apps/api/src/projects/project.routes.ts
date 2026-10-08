import { Router } from "express";
import {
  idParamSchema,
  projectCreateSchema,
  projectQuerySchema,
  projectUpdateSchema,
} from "@orbit/shared";

import type { ApiEnv } from "../config/env.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { asyncHandler } from "../http/async-handler.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";
import { prisma } from "../prisma/client.js";
import { ProjectController } from "./project.controller.js";
import { ProjectRepository } from "./project.repository.js";
import { ProjectService } from "./project.service.js";

export function createProjectRouter(env: ApiEnv) {
  const router = Router();
  const controller = new ProjectController(new ProjectService(new ProjectRepository(prisma)));

  router.use(requireAuth(env));
  router.get("/", validateQuery(projectQuerySchema), asyncHandler(controller.list));
  router.post("/", validateBody(projectCreateSchema), asyncHandler(controller.create));
  router.get("/:id", validateParams(idParamSchema), asyncHandler(controller.get));
  router.put(
    "/:id",
    validateParams(idParamSchema),
    validateBody(projectUpdateSchema),
    asyncHandler(controller.update)
  );
  router.patch(
    "/:id",
    validateParams(idParamSchema),
    validateBody(projectUpdateSchema),
    asyncHandler(controller.update)
  );
  router.delete("/:id", validateParams(idParamSchema), asyncHandler(controller.delete));

  return router;
}
