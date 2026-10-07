import { projectStatusLabels, registerSchema, taskPriorityLabels } from "@orbit/shared";

export const sharedSmoke = {
  parsedEmail: registerSchema.parse({
    email: " WEB@Orbit.Test ",
    name: "Web User",
    password: "StrongPass123",
  }).email,
  projectLabel: projectStatusLabels.NOT_STARTED,
  priorityLabel: taskPriorityLabels.MEDIUM,
};
