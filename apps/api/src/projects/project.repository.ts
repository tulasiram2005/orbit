import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProjectCreateInput, ProjectQuery, ProjectUpdateInput } from "@orbit/shared";

import { fromDateOnly } from "../utils/date.js";

const includeTasks = {
  tasks: {
    select: {
      status: true,
    },
  },
} as const;

function whereFor(userId: string, query: ProjectQuery): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {
    userId,
  };

  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  return where;
}

export class ProjectRepository {
  constructor(private readonly db: PrismaClient) {}

  list(userId: string, query: ProjectQuery) {
    return this.db.project.findMany({
      where: whereFor(userId, query),
      include: includeTasks,
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  count(userId: string, query: ProjectQuery) {
    return this.db.project.count({ where: whereFor(userId, query) });
  }

  findById(userId: string, id: string) {
    return this.db.project.findFirst({
      where: { id, userId },
      include: includeTasks,
    });
  }

  create(userId: string, input: ProjectCreateInput) {
    const data: Prisma.ProjectUncheckedCreateInput = {
      userId,
      name: input.name,
      status: input.status,
    };

    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.startDate) {
      const startDate = fromDateOnly(input.startDate);
      if (startDate) {
        data.startDate = startDate;
      }
    }
    if (input.endDate) {
      const endDate = fromDateOnly(input.endDate);
      if (endDate) {
        data.endDate = endDate;
      }
    }

    return this.db.project.create({
      data,
      include: includeTasks,
    });
  }

  update(userId: string, id: string, input: ProjectUpdateInput) {
    const data: Prisma.ProjectUncheckedUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }
    if (input.startDate !== undefined) {
      const startDate = fromDateOnly(input.startDate);
      if (startDate) {
        data.startDate = startDate;
      }
    }
    if (input.endDate !== undefined) {
      const endDate = fromDateOnly(input.endDate);
      if (endDate) {
        data.endDate = endDate;
      }
    }

    return this.db.project.update({
      where: { id_userId: { id, userId } },
      data,
      include: includeTasks,
    });
  }

  delete(userId: string, id: string) {
    return this.db.project.delete({
      where: { id_userId: { id, userId } },
    });
  }
}
