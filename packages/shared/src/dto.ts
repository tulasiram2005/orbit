import type { ErrorCode, ProjectStatus, TaskPriority, TaskStatus } from "./enums.js";

export type UserDto = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type ProjectDto = {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  taskCount?: number;
  completedCount?: number;
  progressPercent?: number;
};

export type TaskDto = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
};

export type DashboardDto = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  projectsInProgress: number;
};

export type SuccessEnvelope<TData, TMeta = undefined> = TMeta extends undefined
  ? { success: true; data: TData }
  : { success: true; data: TData; meta: TMeta };

export type ErrorEnvelope = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string[]>;
    requestId: string;
  };
};
