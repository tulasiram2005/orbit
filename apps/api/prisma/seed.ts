import { PrismaClient, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const testPassword = "StrongTestPassword123!";

type TaskSeed = {
  name: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
};

const demoTasks: TaskSeed[] = [
  {
    name: "Map onboarding flow",
    description: "List the first-run screens and success criteria.",
    priority: TaskPriority.HIGH,
    status: TaskStatus.COMPLETED,
    dueDate: "2026-09-30",
  },
  {
    name: "Draft API contract",
    priority: TaskPriority.HIGH,
    status: TaskStatus.IN_PROGRESS,
    dueDate: "2026-10-08",
  },
  {
    name: "Review accessibility labels",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-10",
  },
  {
    name: "Create launch checklist",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-13",
  },
  {
    name: "Archive stale project notes",
    priority: TaskPriority.LOW,
    status: TaskStatus.PENDING,
    dueDate: "2026-09-20",
  },
];

const mobileTasks: TaskSeed[] = [
  {
    name: "Design offline banner",
    priority: TaskPriority.HIGH,
    status: TaskStatus.IN_PROGRESS,
    dueDate: "2026-10-07",
  },
  {
    name: "Add pull-to-refresh behavior",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-12",
  },
  {
    name: "Test expired session message",
    priority: TaskPriority.HIGH,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-09",
  },
  {
    name: "Tune touch targets",
    priority: TaskPriority.LOW,
    status: TaskStatus.COMPLETED,
    dueDate: "2026-10-01",
  },
  {
    name: "Document Android build profile",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-15",
  },
];

const opsTasks: TaskSeed[] = [
  {
    name: "Prepare database backup notes",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueDate: "2026-09-25",
  },
  {
    name: "Review rate-limit rules",
    priority: TaskPriority.HIGH,
    status: TaskStatus.IN_PROGRESS,
    dueDate: "2026-10-11",
  },
  {
    name: "Set up release dashboard",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-16",
  },
  {
    name: "Write incident response draft",
    priority: TaskPriority.LOW,
    status: TaskStatus.PENDING,
    dueDate: "2026-10-20",
  },
  {
    name: "Validate seed data",
    priority: TaskPriority.LOW,
    status: TaskStatus.COMPLETED,
    dueDate: "2026-10-02",
  },
];

async function createProjectWithTasks(params: {
  userId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  tasks: TaskSeed[];
}) {
  const project = await prisma.project.create({
    data: {
      userId: params.userId,
      name: params.name,
      description: params.description,
      status: params.status,
      startDate: new Date(`${params.startDate}T00:00:00.000Z`),
      endDate: new Date(`${params.endDate}T00:00:00.000Z`),
    },
  });

  await prisma.task.createMany({
    data: params.tasks.map((task) => ({
      userId: params.userId,
      projectId: project.id,
      name: task.name,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: new Date(`${task.dueDate}T00:00:00.000Z`),
      completedAt: task.status === TaskStatus.COMPLETED ? new Date() : null,
    })),
  });
}

async function main() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["demo@orbit.test", "other@orbit.test"],
      },
    },
  });

  const passwordHash = await bcrypt.hash(testPassword, 12);

  const demo = await prisma.user.create({
    data: {
      email: "demo@orbit.test",
      name: "Demo User",
      passwordHash,
    },
  });

  const other = await prisma.user.create({
    data: {
      email: "other@orbit.test",
      name: "Other User",
      passwordHash,
    },
  });

  await createProjectWithTasks({
    userId: demo.id,
    name: "Web Launch",
    description: "Ship the first polished web workflow.",
    status: ProjectStatus.IN_PROGRESS,
    startDate: "2026-09-28",
    endDate: "2026-10-18",
    tasks: demoTasks,
  });

  await createProjectWithTasks({
    userId: demo.id,
    name: "Android Beta",
    description: "Prepare the Expo Android preview build.",
    status: ProjectStatus.NOT_STARTED,
    startDate: "2026-10-07",
    endDate: "2026-10-30",
    tasks: mobileTasks,
  });

  await createProjectWithTasks({
    userId: other.id,
    name: "Operations Hardening",
    description: "Security and reliability work for a separate account.",
    status: ProjectStatus.IN_PROGRESS,
    startDate: "2026-09-20",
    endDate: "2026-10-25",
    tasks: opsTasks,
  });

  process.stdout.write(
    `Seeded demo users. Login: demo@orbit.test / ${testPassword}; other@orbit.test / ${testPassword}\n`
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
