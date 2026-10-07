import type { TaskDto, TaskPriority } from "@orbit/shared";

const priorityRank: Record<TaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function dueTime(task: TaskDto) {
  return task.dueDate
    ? new Date(`${task.dueDate}T00:00:00.000Z`).getTime()
    : Number.MAX_SAFE_INTEGER;
}

function isOverdue(task: TaskDto, today: string) {
  return task.status !== "COMPLETED" && task.dueDate !== undefined && task.dueDate < today;
}

export function pickNextTask(tasks: TaskDto[], today: string): TaskDto | undefined {
  return tasks
    .filter((task) => task.status !== "COMPLETED")
    .sort((left, right) => {
      const leftOverdue = isOverdue(left, today);
      const rightOverdue = isOverdue(right, today);
      if (leftOverdue !== rightOverdue) {
        return leftOverdue ? -1 : 1;
      }

      const dueDifference = dueTime(left) - dueTime(right);
      if (dueDifference !== 0) {
        return dueDifference;
      }

      const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return left.createdAt.localeCompare(right.createdAt);
    })[0];
}

export function todayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}
