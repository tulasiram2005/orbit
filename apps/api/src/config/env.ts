import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().max(65535).default(4000),
  API_CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function readEnv(): ApiEnv {
  return envSchema.parse(process.env);
}
