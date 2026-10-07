import type { Task } from "@prisma/client";
import type { TaskDto } from "@orbit/shared";

function dateOnly(value: Date | null): string | undefined {
  return value?.toISOString().slice(0, 10);
}

export function toTaskDto(task: Task): TaskDto {
  const dto: TaskDto = {
    id: task.id,
    projectId: task.projectId,
    name: task.name,
    priority: task.priority,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
  };

  const dueDate = dateOnly(task.dueDate);

  if (task.description) {
    dto.description = task.description;
  }
  if (dueDate) {
    dto.dueDate = dueDate;
  }
  if (task.completedAt) {
    dto.completedAt = task.completedAt.toISOString();
  }

  return dto;
}
