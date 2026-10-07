export const projectStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export const taskStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export const projectStatusLabels: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const errorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "TOKEN_EXPIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof errorCodes)[number];
