import type { Project, Task } from "@prisma/client";
import type { ProjectDto } from "@orbit/shared";

type ProjectWithTasks = Project & {
  tasks?: Pick<Task, "status">[];
};

function dateOnly(value: Date | null): string | undefined {
  return value?.toISOString().slice(0, 10);
}

export function toProjectDto(project: ProjectWithTasks): ProjectDto {
  const taskCount = project.tasks?.length;
  const completedCount = project.tasks?.filter((task) => task.status === "COMPLETED").length;
  const dto: ProjectDto = {
    id: project.id,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
  };

  const startDate = dateOnly(project.startDate);
  const endDate = dateOnly(project.endDate);

  if (project.description) {
    dto.description = project.description;
  }
  if (startDate) {
    dto.startDate = startDate;
  }
  if (endDate) {
    dto.endDate = endDate;
  }
  if (taskCount !== undefined) {
    dto.taskCount = taskCount;
  }
  if (completedCount !== undefined) {
    dto.completedCount = completedCount;
  }
  if (taskCount && completedCount !== undefined) {
    dto.progressPercent = Math.round((completedCount / taskCount) * 100);
  }

  return dto;
}
