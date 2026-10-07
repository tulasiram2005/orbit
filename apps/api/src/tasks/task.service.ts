import { Prisma } from "@prisma/client";
import type { TaskCreateInput, TaskQuery, TaskUpdateInput } from "@orbit/shared";

import { notFound } from "../http/errors.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { toTaskDto } from "./task.mapper.js";
import type { TaskRepository } from "./task.repository.js";

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly projects: ProjectRepository
  ) {}

  async list(userId: string, query: TaskQuery) {
    const [items, total] = await Promise.all([
      this.tasks.list(userId, query),
      this.tasks.count(userId, query),
    ]);

    return {
      items: items.map(toTaskDto),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async get(userId: string, id: string) {
    const task = await this.tasks.findById(userId, id);

    if (!task) {
      throw notFound("Task not found");
    }

    return toTaskDto(task);
  }

  async create(userId: string, input: TaskCreateInput) {
    await this.ensureProject(userId, input.projectId);
    return toTaskDto(await this.tasks.create(userId, input));
  }

  async update(userId: string, id: string, input: TaskUpdateInput) {
    await this.ensureTask(userId, id);
    if (input.projectId) {
      await this.ensureProject(userId, input.projectId);
    }

    return toTaskDto(await this.tasks.update(userId, id, input));
  }

  async markCompleted(userId: string, id: string) {
    await this.ensureTask(userId, id);
    return toTaskDto(await this.tasks.markCompleted(userId, id));
  }

  async delete(userId: string, id: string) {
    await this.ensureTask(userId, id);

    try {
      await this.tasks.delete(userId, id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw notFound("Task not found");
      }

      throw error;
    }
  }

  private async ensureProject(userId: string, projectId: string) {
    const project = await this.projects.findById(userId, projectId);

    if (!project) {
      throw notFound("Project not found");
    }
  }

  private async ensureTask(userId: string, id: string) {
    const task = await this.tasks.findById(userId, id);

    if (!task) {
      throw notFound("Task not found");
    }
  }
}
