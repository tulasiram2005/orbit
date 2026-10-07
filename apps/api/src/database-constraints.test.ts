import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prisma = new PrismaClient();

const uniqueEmail = (label: string) => `${label}-${randomUUID()}@orbit.test`;

async function createUser(label: string) {
  return prisma.user.create({
    data: {
      email: uniqueEmail(label),
      name: `${label} user`,
      passwordHash: "hashed-test-password",
    },
  });
}

async function createProject(userId: string, name: string) {
  return prisma.project.create({
    data: {
      userId,
      name,
      status: "IN_PROGRESS",
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T00:00:00.000Z"),
    },
  });
}

describe("database constraints", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("fails when a task references another user's project through the composite FK", async () => {
    const owner = await createUser("owner");
    const intruder = await createUser("intruder");
    const project = await createProject(owner.id, "Owned Project");

    await expect(
      prisma.task.create({
        data: {
          userId: intruder.id,
          projectId: project.id,
          name: "Cross-account task",
        },
      })
    ).rejects.toThrow();
  });

  it("fails when a project endDate is before startDate", async () => {
    const user = await createUser("date-check");

    await expect(
      prisma.project.create({
        data: {
          userId: user.id,
          name: "Invalid date range",
          startDate: new Date("2026-10-10T00:00:00.000Z"),
          endDate: new Date("2026-10-09T00:00:00.000Z"),
        },
      })
    ).rejects.toThrow();
  });

  it("rejects emails that differ only by case because email is citext unique", async () => {
    const email = uniqueEmail("case");
    await prisma.user.create({
      data: {
        email,
        name: "Case User",
        passwordHash: "hashed-test-password",
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: email.toUpperCase(),
          name: "Duplicate Case User",
          passwordHash: "hashed-test-password",
        },
      })
    ).rejects.toThrow();
  });

  it("cascades project deletion to tasks", async () => {
    const user = await createUser("project-cascade");
    const project = await createProject(user.id, "Cascade Project");
    await prisma.task.create({
      data: {
        userId: user.id,
        projectId: project.id,
        name: "Deleted with project",
      },
    });

    await prisma.project.delete({
      where: {
        id_userId: {
          id: project.id,
          userId: user.id,
        },
      },
    });

    await expect(prisma.task.count({ where: { projectId: project.id } })).resolves.toBe(0);
  });

  it("cascades user deletion to projects, tasks and refresh tokens", async () => {
    const user = await createUser("user-cascade");
    const project = await createProject(user.id, "User Cascade Project");
    await prisma.task.create({
      data: {
        userId: user.id,
        projectId: project.id,
        name: "Deleted with user",
      },
    });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: `hash-${randomUUID()}`,
        familyId: randomUUID(),
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    await expect(prisma.project.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(prisma.task.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(prisma.refreshToken.count({ where: { userId: user.id } })).resolves.toBe(0);
  });

  it("prevents invalid enum values from being inserted", async () => {
    const user = await createUser("enum-check");

    await expect(
      prisma.$executeRaw(
        Prisma.sql`INSERT INTO "projects" ("user_id", "name", "status", "updated_at")
          VALUES (${user.id}::uuid, 'Invalid enum project', 'BLOCKED'::"ProjectStatus", now())`
      )
    ).rejects.toThrow();
  });
});
