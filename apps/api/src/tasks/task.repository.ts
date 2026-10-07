import type { Prisma, PrismaClient } from "@prisma/client";
import type { TaskCreateInput, TaskQuery, TaskUpdateInput } from "@orbit/shared";

import { fromDateOnly, todayDateOnlyInTimeZone } from "../utils/date.js";

function whereFor(userId: string, query: TaskQuery): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    userId,
  };

  if (query.projectId) {
    where.projectId = query.projectId;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.priority) {
    where.priority = query.priority;
  }
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }
  if (query.dueBefore) {
    const dueBefore = fromDateOnly(query.dueBefore);
    if (dueBefore) {
      where.dueDate = { lte: dueBefore };
    }
  }
  if (query.overdue) {
    where.dueDate = { lt: todayDateOnlyInTimeZone(query.timezone) };
    where.status = { not: "COMPLETED" };
  }

  return where;
}

export class TaskRepository {
  constructor(private readonly db: PrismaClient) {}

  list(userId: string, query: TaskQuery) {
    return this.db.task.findMany({
      where: whereFor(userId, query),
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  count(userId: string, query: TaskQuery) {
    return this.db.task.count({ where: whereFor(userId, query) });
  }

  findById(userId: string, id: string) {
    return this.db.task.findFirst({ where: { id, userId } });
  }

  create(userId: string, input: TaskCreateInput) {
    const data: Prisma.TaskUncheckedCreateInput = {
      userId,
      projectId: input.projectId,
      name: input.name,
      priority: input.priority,
      status: input.status,
    };

    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.dueDate) {
      const dueDate = fromDateOnly(input.dueDate);
      if (dueDate) {
        data.dueDate = dueDate;
      }
    }
    if (input.status === "COMPLETED") {
      data.completedAt = new Date();
    }

    return this.db.task.create({
      data,
    });
  }

  update(userId: string, id: string, input: TaskUpdateInput) {
    const data: Prisma.TaskUncheckedUpdateInput = {};

    if (input.projectId !== undefined) {
      data.projectId = input.projectId;
    }
    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.priority !== undefined) {
      data.priority = input.priority;
    }
    if (input.dueDate !== undefined) {
      const dueDate = fromDateOnly(input.dueDate);
      if (dueDate) {
        data.dueDate = dueDate;
      }
    }
    if (input.status === "COMPLETED") {
      data.status = input.status;
      data.completedAt = new Date();
    } else if (input.status) {
      data.status = input.status;
      data.completedAt = null;
    }

    return this.db.task.update({
      where: { id, userId },
      data,
    });
  }

  markCompleted(userId: string, id: string) {
    return this.db.task.update({
      where: { id, userId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  delete(userId: string, id: string) {
    return this.db.task.delete({ where: { id, userId } });
  }
}
