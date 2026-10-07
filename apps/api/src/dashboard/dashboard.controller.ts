import type { Request, Response } from "express";

import { requireUserId } from "../http/auth-context.js";
import { ok } from "../http/envelope.js";
import type { DashboardRepository } from "./dashboard.repository.js";

export class DashboardController {
  constructor(private readonly dashboard: DashboardRepository) {}

  get = async (_request: Request, response: Response) => {
    const userId = requireUserId(response);
    response.json(ok(await this.dashboard.get(userId)));
  };
}
