import type { Request, Response } from "express";
import type { IdParam, ProjectIdParam, TaskQuery } from "@orbit/shared";

import { requireUserId } from "../http/auth-context.js";
import { ok } from "../http/envelope.js";
import type { TaskService } from "./task.service.js";

export class TaskController {
  constructor(private readonly service: TaskService) {}

  list = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const result = await this.service.list(userId, response.locals.validatedQuery as TaskQuery);
    response.json(ok(result.items, result.meta));
  };

  listForProject = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const { projectId } = response.locals.validatedParams as ProjectIdParam;
    const result = await this.service.list(userId, {
      ...(response.locals.validatedQuery as TaskQuery),
      projectId,
    });
    response.json(ok(result.items, result.meta));
  };

  get = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const { id } = response.locals.validatedParams as IdParam;
    response.json(ok(await this.service.get(userId, id)));
  };

  create = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    response.status(201).json(ok(await this.service.create(userId, request.body)));
  };

  update = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const { id } = response.locals.validatedParams as IdParam;
    response.json(ok(await this.service.update(userId, id, request.body)));
  };

  markCompleted = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const { id } = response.locals.validatedParams as IdParam;
    response.json(ok(await this.service.markCompleted(userId, id)));
  };

  delete = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const { id } = response.locals.validatedParams as IdParam;
    await this.service.delete(userId, id);
    response.json(ok({ deleted: true }));
  };
}
