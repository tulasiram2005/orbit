import { PrismaClient } from "@prisma/client";
import type {
  AuthSessionDto,
  DashboardDto,
  ErrorEnvelope,
  ProjectDto,
  SuccessEnvelope,
  TaskDto,
} from "@orbit/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import type { ApiEnv } from "./config/env.js";

const prisma = new PrismaClient();
const testRun = `resources-${Date.now()}@orbit.test`;
const password = "StrongTestPassword123!";
const env: ApiEnv = {
  API_PORT: 4000,
  API_CORS_ORIGINS: ["http://localhost:3000"],
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgresql://orbit:orbit@localhost:55432/orbit?schema=public",
  JWT_ACCESS_SECRET: "test-access-secret-that-is-long-enough",
  JWT_REFRESH_SECRET: "test-refresh-secret-that-is-long-enough",
  NODE_ENV: "test",
};

const app = createApp(env);

type ListEnvelope<TData> = SuccessEnvelope<
  TData[],
  { page: number; pageSize: number; total: number }
>;

function body<TData>(response: request.Response): SuccessEnvelope<TData> {
  return response.body as SuccessEnvelope<TData>;
}

function listBody<TData>(response: request.Response): ListEnvelope<TData> {
  return response.body as ListEnvelope<TData>;
}

function errorBody(response: request.Response): ErrorEnvelope {
  return response.body as ErrorEnvelope;
}

async function register(label: string) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      email: `${label}+${testRun}`,
      name: `${label} User`,
      password,
    })
    .expect(201);

  return body<AuthSessionDto>(response).data.tokens.accessToken;
}

describe("project and task routes", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: testRun,
        },
      },
    });
    await prisma.$disconnect();
  });

  it("manages projects and hides them from other users", async () => {
    const ownerToken = await register("owner-projects");
    const otherToken = await register("other-projects");

    const created = body<ProjectDto>(
      await request(app)
        .post("/api/projects")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: " Launch Plan ",
          description: "Ship the first version",
          status: "IN_PROGRESS",
          startDate: "2026-10-01",
          endDate: "2026-10-31",
        })
        .expect(201)
    ).data;

    expect(created.name).toBe("Launch Plan");

    const ownerList = listBody<ProjectDto>(
      await request(app)
        .get("/api/projects?search=launch&status=IN_PROGRESS&page=1&pageSize=10")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200)
    );
    expect(ownerList.meta.total).toBeGreaterThanOrEqual(1);
    expect(ownerList.data.map((project) => project.id)).toContain(created.id);

    const otherGet = await request(app)
      .get(`/api/projects/${created.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
    expect(errorBody(otherGet).error.code).toBe("NOT_FOUND");

    const updated = body<ProjectDto>(
      await request(app)
        .patch(`/api/projects/${created.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ status: "COMPLETED" })
        .expect(200)
    ).data;
    expect(updated.status).toBe("COMPLETED");

    await request(app)
      .delete(`/api/projects/${created.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    await request(app)
      .get(`/api/projects/${created.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(404);
  });

  it("manages tasks, blocks cross-user project access, and reports dashboard counts", async () => {
    const ownerToken = await register("owner-tasks");
    const otherToken = await register("other-tasks");

    const project = body<ProjectDto>(
      await request(app)
        .post("/api/projects")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Sprint", status: "IN_PROGRESS" })
        .expect(201)
    ).data;

    await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ projectId: project.id, name: "Cross-user task" })
      .expect(404);

    const task = body<TaskDto>(
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          projectId: project.id,
          name: "Write tests",
          priority: "HIGH",
          dueDate: "2025-01-01",
        })
        .expect(201)
    ).data;

    const filteredTasks = listBody<TaskDto>(
      await request(app)
        .get("/api/tasks?search=write&priority=HIGH&overdue=true")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200)
    );
    expect(filteredTasks.data.map((item) => item.id)).toContain(task.id);

    const projectTasks = listBody<TaskDto>(
      await request(app)
        .get(`/api/projects/${project.id}/tasks`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200)
    );
    expect(projectTasks.data).toHaveLength(1);

    const completed = body<TaskDto>(
      await request(app)
        .post(`/api/tasks/${task.id}/complete`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200)
    ).data;
    expect(completed.status).toBe("COMPLETED");
    expect(typeof completed.completedAt).toBe("string");

    await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Not yours" })
      .expect(404);

    const dashboard = body<DashboardDto>(
      await request(app)
        .get("/api/dashboard")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200)
    ).data;
    expect(dashboard.totalProjects).toBe(1);
    expect(dashboard.totalTasks).toBe(1);
    expect(dashboard.completedTasks).toBe(1);
    expect(dashboard.completedTasks + dashboard.pendingTasks + dashboard.inProgressTasks).toBe(
      dashboard.totalTasks
    );
    expect(dashboard.projectsInProgress).toBe(1);
  });
});
