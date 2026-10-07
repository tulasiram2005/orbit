import { Router } from "express";
import {
  idParamSchema,
  projectIdParamSchema,
  taskCreateSchema,
  taskQuerySchema,
  taskUpdateSchema,
} from "@orbit/shared";

import { requireAuth } from "../auth/auth.middleware.js";
import type { ApiEnv } from "../config/env.js";
import { asyncHandler } from "../http/async-handler.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";
import { prisma } from "../prisma/client.js";
import { ProjectRepository } from "../projects/project.repository.js";
import { TaskController } from "./task.controller.js";
import { TaskRepository } from "./task.repository.js";
import { TaskService } from "./task.service.js";

export function createTaskRouter(env: ApiEnv) {
  const router = Router();
  const service = new TaskService(new TaskRepository(prisma), new ProjectRepository(prisma));
  const controller = new TaskController(service);

  router.use(requireAuth(env));
  router.get("/", validateQuery(taskQuerySchema), asyncHandler(controller.list));
  router.post("/", validateBody(taskCreateSchema), asyncHandler(controller.create));
  router.get("/:id", validateParams(idParamSchema), asyncHandler(controller.get));
  router.patch(
    "/:id",
    validateParams(idParamSchema),
    validateBody(taskUpdateSchema),
    asyncHandler(controller.update)
  );
  router.put(
    "/:id",
    validateParams(idParamSchema),
    validateBody(taskUpdateSchema),
    asyncHandler(controller.update)
  );
  router.post(
    "/:id/complete",
    validateParams(idParamSchema),
    asyncHandler(controller.markCompleted)
  );
  router.delete("/:id", validateParams(idParamSchema), asyncHandler(controller.delete));

  return router;
}

export function createProjectTasksRouter(env: ApiEnv) {
  const router = Router();
  const service = new TaskService(new TaskRepository(prisma), new ProjectRepository(prisma));
  const controller = new TaskController(service);

  router.use(requireAuth(env));
  router.get(
    "/:projectId/tasks",
    validateParams(projectIdParamSchema),
    validateQuery(taskQuerySchema.omit({ projectId: true })),
    asyncHandler(controller.listForProject)
  );

  return router;
}
