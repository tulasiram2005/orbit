import type { Request, Response } from "express";
import type { IdParam, ProjectQuery } from "@orbit/shared";

import { ok } from "../http/envelope.js";
import { requireUserId } from "../http/auth-context.js";
import type { ProjectService } from "./project.service.js";

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const result = await this.service.list(userId, response.locals.validatedQuery as ProjectQuery);
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

  delete = async (request: Request, response: Response) => {
    const userId = requireUserId(response);
    const { id } = response.locals.validatedParams as IdParam;
    await this.service.delete(userId, id);
    response.json(ok({ deleted: true }));
  };
}
