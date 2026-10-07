import { z } from "zod";

export const uuidSchema = z.uuid();

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date in YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Expected a valid calendar date");

export const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine((value) => /[a-z]/.test(value), "Password must include a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Password must include an uppercase letter")
  .refine((value) => /\d/.test(value), "Password must include a number")
  .refine((value) => !/(.)\1{5,}/.test(value), "Password is too repetitive")
  .refine(
    (value) => !["password", "password1", "password123", "qwerty123"].includes(value.toLowerCase()),
    "Password is too common"
  );

export const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

export function validateDateRange(
  value: { startDate?: string | undefined; endDate?: string | undefined },
  context: z.RefinementCtx
) {
  if (!value.startDate || !value.endDate) {
    return;
  }

  if (value.endDate < value.startDate) {
    context.addIssue({
      code: "custom",
      message: "endDate must be on or after startDate",
      path: ["endDate"],
    });
  }
}

export function rejectEmptyUpdate(value: Record<string, unknown>, context: z.RefinementCtx) {
  if (Object.values(value).every((field) => field === undefined)) {
    context.addIssue({
      code: "custom",
      message: "At least one field must be provided",
      path: [],
    });
  }
}
