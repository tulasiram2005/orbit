import type { TaskDto } from "@orbit/shared";
import { describe, expect, it } from "vitest";

import { pickNextTask } from "./dashboard-logic";

function task(input: Partial<TaskDto> & Pick<TaskDto, "name">): TaskDto {
  return {
    createdAt: "2026-10-01T00:00:00.000Z",
    id: input.name,
    priority: input.priority ?? "MEDIUM",
    projectId: input.projectId ?? "project-id",
    status: input.status ?? "PENDING",
    ...input,
  };
}

describe("dashboard task ranking", () => {
  it("ranks overdue tasks first, then earliest due date, then priority", () => {
    const nextTask = pickNextTask(
      [
        task({
          dueDate: "2026-10-15",
          name: "Document Android build profile",
          priority: "MEDIUM",
        }),
        task({
          dueDate: "2026-09-20",
          name: "Archive stale project notes",
          priority: "LOW",
        }),
        task({
          dueDate: "2026-10-07",
          name: "Design offline banner",
          priority: "HIGH",
          status: "IN_PROGRESS",
        }),
        task({
          dueDate: "2026-09-01",
          name: "Completed old task",
          priority: "HIGH",
          status: "COMPLETED",
        }),
      ],
      "2026-10-08"
    );

    expect(nextTask?.name).toBe("Archive stale project notes");
  });

  it("uses priority when due dates match", () => {
    const nextTask = pickNextTask(
      [
        task({ dueDate: "2026-10-09", name: "Medium task", priority: "MEDIUM" }),
        task({ dueDate: "2026-10-09", name: "High task", priority: "HIGH" }),
      ],
      "2026-10-08"
    );

    expect(nextTask?.name).toBe("High task");
  });
});
