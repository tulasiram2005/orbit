import { z } from "zod";

import { errorCodes, projectStatuses, taskPriorities, taskStatuses } from "./enums.js";
import {
  isoDateSchema,
  optionalTrimmedString,
  passwordSchema,
  rejectEmptyUpdate,
  trimmedString,
  uuidSchema,
} from "./validation.js";
import { validateDateRange } from "./validation.js";

export const projectStatusSchema = z.enum(projectStatuses);
export const taskStatusSchema = z.enum(taskStatuses);
export const taskPrioritySchema = z.enum(taskPriorities);
export const errorCodeSchema = z.enum(errorCodes);

export const healthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.literal("ok"),
    service: z.literal("api"),
  }),
});

export const registerSchema = z
  .object({
    email: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
      z.email().max(320)
    ),
    name: trimmedString(120),
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
      z.email().max(320)
    ),
    password: z.string().min(1).max(128),
  })
  .strict();

export const refreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(32).max(512).optional(),
  })
  .strict();

export const projectCreateSchema = z
  .object({
    name: trimmedString(120),
    description: optionalTrimmedString(1000),
    status: projectStatusSchema.optional().default("NOT_STARTED"),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine(rejectEmptyUpdate)
  .superRefine(validateDateRange);

export const projectUpdateSchema = z
  .object({
    name: trimmedString(120).optional(),
    description: optionalTrimmedString(1000),
    status: projectStatusSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine(rejectEmptyUpdate)
  .superRefine(validateDateRange);

export const taskCreateSchema = z
  .object({
    projectId: uuidSchema,
    name: trimmedString(160),
    description: optionalTrimmedString(1000),
    priority: taskPrioritySchema.optional().default("MEDIUM"),
    status: taskStatusSchema.optional().default("PENDING"),
    dueDate: isoDateSchema.optional(),
  })
  .strict();

export const taskUpdateSchema = z
  .object({
    projectId: uuidSchema.optional(),
    name: trimmedString(160).optional(),
    description: optionalTrimmedString(1000),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
    dueDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine(rejectEmptyUpdate);

const paginationSchema = {
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
} as const;

const projectSortSchema = z.coerce.string().pipe(z.enum(["createdAt", "name", "endDate"]));
const taskSortSchema = z.coerce.string().pipe(z.enum(["createdAt", "name", "dueDate", "priority"]));
const orderSchema = z.coerce.string().pipe(z.enum(["asc", "desc"]));

export const projectQuerySchema = z
  .object({
    search: optionalTrimmedString(120),
    status: projectStatusSchema.optional(),
    sort: projectSortSchema.optional().default("createdAt"),
    order: orderSchema.optional().default("desc"),
    ...paginationSchema,
  })
  .strict();

export const taskQuerySchema = z
  .object({
    projectId: uuidSchema.optional(),
    search: optionalTrimmedString(160),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueBefore: isoDateSchema.optional(),
    overdue: z.coerce.boolean().optional(),
    sort: taskSortSchema.optional().default("createdAt"),
    order: orderSchema.optional().default("desc"),
    ...paginationSchema,
  })
  .strict();

export const idParamSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const projectIdParamSchema = z
  .object({
    projectId: uuidSchema,
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
