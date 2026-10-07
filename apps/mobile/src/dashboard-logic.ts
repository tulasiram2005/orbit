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

      const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const dueDifference = dueTime(left) - dueTime(right);
      if (dueDifference !== 0) {
        return dueDifference;
      }

      return left.createdAt.localeCompare(right.createdAt);
    })[0];
}

export function userTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function todayDateOnly(timezone = userTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const date = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${date}`;
}
