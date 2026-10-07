import { describe, expect, it } from "vitest";

import {
  loginSchema,
  projectCreateSchema,
  projectQuerySchema,
  projectStatusLabels,
  projectUpdateSchema,
  registerSchema,
  taskCreateSchema,
  taskPriorityLabels,
  taskQuerySchema,
  taskStatusLabels,
  taskUpdateSchema,
} from "../index.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const validPassword = "StrongPass123";

const expectInvalid = (schema: { parse: (value: unknown) => unknown }, value: unknown) => {
  expect(() => schema.parse(value)).toThrow();
};

describe("auth schemas", () => {
  it("normalizes email before validation and trims names", () => {
    expect(
      registerSchema.parse({
        email: " USER@Orbit.Test ",
        name: "  Ada Lovelace  ",
        password: validPassword,
      })
    ).toEqual({
      email: "user@orbit.test",
      name: "Ada Lovelace",
      password: validPassword,
    });

    expect(loginSchema.parse({ email: " USER@Orbit.Test ", password: "secret" }).email).toBe(
      "user@orbit.test"
    );
  });

  it("rejects invalid emails after trimming", () => {
    expectInvalid(registerSchema, { email: " bad ", name: "Ada", password: validPassword });
    expectInvalid(loginSchema, { email: "bad", password: "secret" });
  });

  it("enforces password strength, minimum length and maximum length", () => {
    expect(
      registerSchema.parse({ email: "a@b.test", name: "Ada", password: "Strong12" })
    ).toBeTruthy();
    expectInvalid(registerSchema, { email: "a@b.test", name: "Ada", password: "Short1" });
    expectInvalid(registerSchema, { email: "a@b.test", name: "Ada", password: "a".repeat(73) });
    expectInvalid(registerSchema, { email: "a@b.test", name: "Ada", password: "password123" });
    expectInvalid(registerSchema, { email: "a@b.test", name: "Ada", password: "AAAAAAAA1" });
    expectInvalid(registerSchema, { email: "a@b.test", name: "Ada", password: "lowercase1" });
    expectInvalid(registerSchema, { email: "a@b.test", name: "Ada", password: "NoNumberHere" });
  });

  it("rejects unknown fields on every auth body schema", () => {
    expectInvalid(registerSchema, {
      email: "demo@orbit.test",
      name: "Demo",
      password: validPassword,
      role: "admin",
    });
    expectInvalid(loginSchema, { email: "demo@orbit.test", password: "secret", role: "admin" });
  });
});

describe("project schemas", () => {
  it("accepts valid project input, trims names and applies defaults", () => {
    expect(
      projectCreateSchema.parse({
        name: "  Launch Plan  ",
        description: "",
        startDate: "2026-10-07",
        endDate: "2026-10-08",
      })
    ).toEqual({
      name: "Launch Plan",
      description: undefined,
      status: "NOT_STARTED",
      startDate: "2026-10-07",
      endDate: "2026-10-08",
    });
  });

  it("rejects empty, whitespace-only and too-long project names", () => {
    expectInvalid(projectCreateSchema, { name: "" });
    expectInvalid(projectCreateSchema, { name: "   " });
    expectInvalid(projectCreateSchema, { name: "A".repeat(121) });
  });

  it("rejects invalid project enums, dates and date ranges", () => {
    expectInvalid(projectCreateSchema, { name: "Plan", status: "BLOCKED" });
    expectInvalid(projectCreateSchema, { name: "Plan", startDate: "2025-13-45" });
    expectInvalid(projectCreateSchema, { name: "Plan", startDate: "2025-02-30" });
    expectInvalid(projectCreateSchema, { name: "Plan", startDate: "2025/02/20" });
    expectInvalid(projectCreateSchema, {
      name: "Plan",
      startDate: "2026-10-08",
      endDate: "2026-10-07",
    });
  });

  it("rejects unknown fields and empty project updates", () => {
    expectInvalid(projectCreateSchema, { name: "Plan", ownerId: projectId });
    expectInvalid(projectUpdateSchema, {});
    expectInvalid(projectUpdateSchema, { ownerId: projectId });
    expect(projectUpdateSchema.parse({ name: "  Renamed  " })).toEqual({ name: "Renamed" });
  });

  it("coerces project query pagination, sort and order with safe defaults", () => {
    expect(projectQuerySchema.parse({ search: "  plan ", status: "IN_PROGRESS" })).toMatchObject({
      search: "plan",
      status: "IN_PROGRESS",
      sort: "createdAt",
      order: "desc",
      page: 1,
      pageSize: 20,
    });
    expect(
      projectQuerySchema.parse({ page: "2", pageSize: "100", sort: "name", order: "asc" })
    ).toMatchObject({
      page: 2,
      pageSize: 100,
      sort: "name",
      order: "asc",
    });
    expectInvalid(projectQuerySchema, { page: "0" });
    expectInvalid(projectQuerySchema, { pageSize: "101" });
    expectInvalid(projectQuerySchema, { sort: "status" });
    expectInvalid(projectQuerySchema, { order: "sideways" });
  });
});

describe("task schemas", () => {
  it("accepts valid task input, trims names and applies defaults", () => {
    expect(
      taskCreateSchema.parse({
        projectId,
        name: "  Draft milestones  ",
        dueDate: "2026-10-14",
      })
    ).toEqual({
      projectId,
      name: "Draft milestones",
      description: undefined,
      priority: "MEDIUM",
      status: "PENDING",
      dueDate: "2026-10-14",
    });
  });

  it("rejects empty, whitespace-only and too-long task names", () => {
    expectInvalid(taskCreateSchema, { projectId, name: "" });
    expectInvalid(taskCreateSchema, { projectId, name: "   " });
    expectInvalid(taskCreateSchema, { projectId, name: "A".repeat(161) });
  });

  it("rejects invalid task ids, enums, dates and unknown fields", () => {
    expectInvalid(taskCreateSchema, { projectId: "nope", name: "Task" });
    expectInvalid(taskCreateSchema, { projectId, name: "Task", priority: "URGENT" });
    expectInvalid(taskCreateSchema, { projectId, name: "Task", status: "DONE" });
    expectInvalid(taskCreateSchema, { projectId, name: "Task", dueDate: "2025-13-45" });
    expectInvalid(taskCreateSchema, { projectId, name: "Task", dueDate: "2025-02-30" });
    expectInvalid(taskCreateSchema, { projectId, name: "Task", dueDate: "02-30-2025" });
    expectInvalid(taskCreateSchema, { projectId, name: "Task", extra: true });
  });

  it("rejects unknown fields and empty task updates", () => {
    expectInvalid(taskUpdateSchema, {});
    expectInvalid(taskUpdateSchema, { extra: true });
    expect(taskUpdateSchema.parse({ name: "  Task  " })).toEqual({ name: "Task" });
  });

  it("coerces combinable task query filters and enforces bounds", () => {
    expect(
      taskQuerySchema.parse({
        projectId,
        search: "  draft ",
        status: "PENDING",
        priority: "HIGH",
        page: "2",
        pageSize: "10",
        sort: "priority",
        order: "asc",
      })
    ).toMatchObject({
      projectId,
      search: "draft",
      status: "PENDING",
      priority: "HIGH",
      page: 2,
      pageSize: 10,
      sort: "priority",
      order: "asc",
    });
    expect(taskQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      order: "desc",
    });
    expectInvalid(taskQuerySchema, { page: "0" });
    expectInvalid(taskQuerySchema, { pageSize: "101" });
    expectInvalid(taskQuerySchema, { sort: "project" });
    expectInvalid(taskQuerySchema, { order: "sideways" });
  });
});

describe("labels", () => {
  it("contains labels for every public enum value", () => {
    expect(projectStatusLabels.COMPLETED).toBe("Completed");
    expect(taskStatusLabels.IN_PROGRESS).toBe("In progress");
    expect(taskPriorityLabels.HIGH).toBe("High");
  });
});
