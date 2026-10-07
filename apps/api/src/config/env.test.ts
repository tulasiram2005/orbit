import { afterEach, describe, expect, it } from "vitest";

import { readEnv } from "./env.js";

const originalEnv = { ...process.env };

function setBaseEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.API_PORT = "4000";
  process.env.API_CORS_ORIGINS = "http://localhost:3000,https://orbit.example";
  process.env.DATABASE_URL = "postgresql://orbit:orbit@localhost:55432/orbit?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  process.env.NODE_ENV = "test";

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("environment validation", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses an explicit CORS allow-list", () => {
    setBaseEnv();

    expect(readEnv().API_CORS_ORIGINS).toEqual(["http://localhost:3000", "https://orbit.example"]);
  });

  it("fails fast for wildcard CORS and invalid database URLs", () => {
    setBaseEnv({ API_CORS_ORIGINS: "*" });
    expect(() => readEnv()).toThrow();

    setBaseEnv({ DATABASE_URL: "not-a-url" });
    expect(() => readEnv()).toThrow();
  });
});
