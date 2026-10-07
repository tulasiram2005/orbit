import { Prisma } from "@prisma/client";
import type { ProjectCreateInput, ProjectQuery, ProjectUpdateInput } from "@orbit/shared";

import { notFound } from "../http/errors.js";
import { toProjectDto } from "./project.mapper.js";
import type { ProjectRepository } from "./project.repository.js";

export class ProjectService {
  constructor(private readonly projects: ProjectRepository) {}

  async list(userId: string, query: ProjectQuery) {
    const [items, total] = await Promise.all([
      this.projects.list(userId, query),
      this.projects.count(userId, query),
    ]);

    return {
      items: items.map(toProjectDto),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async get(userId: string, id: string) {
    const project = await this.projects.findById(userId, id);

    if (!project) {
      throw notFound("Project not found");
    }

    return toProjectDto(project);
  }

  async create(userId: string, input: ProjectCreateInput) {
    return toProjectDto(await this.projects.create(userId, input));
  }

  async update(userId: string, id: string, input: ProjectUpdateInput) {
    try {
      return toProjectDto(await this.projects.update(userId, id, input));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw notFound("Project not found");
      }

      throw error;
    }
  }

  async delete(userId: string, id: string) {
    try {
      await this.projects.delete(userId, id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw notFound("Project not found");
      }

      throw error;
    }
  }
}
