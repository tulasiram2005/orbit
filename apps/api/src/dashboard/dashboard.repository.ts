import type { PrismaClient } from "@prisma/client";

import { todayDateOnlyInTimeZone } from "../utils/date.js";

export class DashboardRepository {
  constructor(private readonly db: PrismaClient) {}

  async get(userId: string, timezone: string) {
    const [
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      projectsInProgress,
    ] = await Promise.all([
      this.db.project.count({ where: { userId } }),
      this.db.task.count({ where: { userId } }),
      this.db.task.count({ where: { userId, status: "COMPLETED" } }),
      this.db.task.count({ where: { userId, status: "PENDING" } }),
      this.db.task.count({ where: { userId, status: "IN_PROGRESS" } }),
      this.db.task.count({
        where: {
          userId,
          dueDate: { lt: todayDateOnlyInTimeZone(timezone) },
          status: { not: "COMPLETED" },
        },
      }),
      this.db.project.count({ where: { userId, status: "IN_PROGRESS" } }),
    ]);

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      projectsInProgress,
    };
  }
}
