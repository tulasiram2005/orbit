import { projectStatusLabels, registerSchema, taskPriorityLabels } from "@orbit/shared";

export const sharedSmoke = {
  parsedEmail: registerSchema.parse({
    email: " MOBILE@Orbit.Test ",
    name: "Mobile User",
    password: "StrongPass123",
  }).email,
  projectLabel: projectStatusLabels.COMPLETED,
  priorityLabel: taskPriorityLabels.LOW,
};
