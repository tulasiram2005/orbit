import { projectStatusLabels, registerSchema, taskPriorityLabels } from "@orbit/shared";

export const sharedSmoke = {
  parsedEmail: registerSchema.parse({
    email: " SMOKE@Orbit.Test ",
    name: "Smoke User",
    password: "StrongPass123",
  }).email,
  projectLabel: projectStatusLabels.IN_PROGRESS,
  priorityLabel: taskPriorityLabels.HIGH,
};
