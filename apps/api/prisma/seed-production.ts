import { PrismaClient, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const seedPassword = process.env.ORBIT_PRODUCTION_SEED_PASSWORD;
const allowSeed = process.env.ORBIT_ALLOW_PRODUCTION_SEED === "true";

async function main() {
  if (!allowSeed) {
    throw new Error("Set ORBIT_ALLOW_PRODUCTION_SEED=true to run the production demo seed.");
  }
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("Set ORBIT_PRODUCTION_SEED_PASSWORD to at least 12 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: "demo.production@orbit.test" },
  });
  if (existing) {
    process.stdout.write("Production demo seed already exists. No changes made.\n");
    return;
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const user = await prisma.user.create({
    data: {
      email: "demo.production@orbit.test",
      name: "Production Demo User",
      passwordHash,
    },
  });
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Production Demo Project",
      description: "Clearly fake test data for production smoke checks.",
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T00:00:00.000Z"),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        projectId: project.id,
        name: "Fake production smoke task",
        description: "Safe disposable data for post-deploy verification.",
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        dueDate: new Date("2026-10-15T00:00:00.000Z"),
      },
    ],
  });

  process.stdout.write("Production demo seed created demo.production@orbit.test.\n");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
