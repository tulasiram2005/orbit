import { PrismaClient } from "@prisma/client";
import type { AuthSessionDto, ErrorEnvelope, SuccessEnvelope, UserDto } from "@orbit/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import type { ApiEnv } from "../config/env.js";

const prisma = new PrismaClient();
const testRun = `auth-${Date.now()}@orbit.test`;
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

function authBody(response: request.Response): SuccessEnvelope<AuthSessionDto> {
  return response.body as SuccessEnvelope<AuthSessionDto>;
}

function userBody(response: request.Response): SuccessEnvelope<UserDto> {
  return response.body as SuccessEnvelope<UserDto>;
}

function errorBody(response: request.Response): ErrorEnvelope {
  return response.body as ErrorEnvelope;
}

function expectNoSensitiveFields(response: request.Response) {
  const text = JSON.stringify(response.body);
  expect(text).not.toContain("passwordHash");
  expect(text).not.toContain("tokenHash");
}

describe("auth routes", () => {
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

  it("registers a user with normalized email and no password in the response", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: ` New.User+${testRun.toUpperCase()} `,
        name: "New User",
        password,
      })
      .expect(201);

    const body = authBody(response);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(`new.user+${testRun}`);
    expect(typeof body.data.tokens.accessToken).toBe("string");
    expect(typeof body.data.tokens.refreshToken).toBe("string");
    expectNoSensitiveFields(response);
  });

  it("rejects duplicate emails case-insensitively", async () => {
    const email = `duplicate+${testRun}`;
    await request(app)
      .post("/api/auth/register")
      .send({ email, name: "First User", password })
      .expect(201);

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: email.toUpperCase(), name: "Second User", password })
      .expect(409);

    expect(errorBody(response).error.code).toBe("CONFLICT");
  });

  it("uses a generic invalid credentials response", async () => {
    const email = `login-fail+${testRun}`;
    await request(app)
      .post("/api/auth/register")
      .send({ email, name: "Login Failure", password })
      .expect(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPassword123!" })
      .expect(401);

    expect(errorBody(response).error.message).toBe("Invalid credentials");
    expectNoSensitiveFields(response);
  });

  it("rate limits the sixth rapid bad login", async () => {
    const rateLimitApp = createApp(env);
    const email = `rate-limit+${testRun}`;
    await request(rateLimitApp)
      .post("/api/auth/register")
      .send({ email, name: "Rate Limit User", password })
      .expect(201);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(rateLimitApp)
        .post("/api/auth/login")
        .send({ email, password: "WrongPassword123!" })
        .expect(401);
      expectNoSensitiveFields(response);
    }

    const limited = await request(rateLimitApp)
      .post("/api/auth/login")
      .send({ email, password: "WrongPassword123!" })
      .expect(429);

    expect(errorBody(limited).error.code).toBe("RATE_LIMITED");
    expectNoSensitiveFields(limited);
  });

  it("logs in and reads the current user with an access token", async () => {
    const email = `me+${testRun}`;
    await request(app)
      .post("/api/auth/register")
      .send({ email, name: "Current User", password })
      .expect(201);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: email.toUpperCase(), password })
      .expect(200);

    const token = authBody(loginResponse).data.tokens.accessToken;
    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(userBody(meResponse).data.email).toBe(email);
    expectNoSensitiveFields(meResponse);
  });

  it("rejects /me without a bearer token", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    expect(errorBody(response).error.code).toBe("UNAUTHENTICATED");
  });

  it("rotates refresh tokens and rejects reuse of the old token", async () => {
    const email = `refresh+${testRun}`;
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ email, name: "Refresh User", password })
      .expect(201);

    const firstRefreshToken = authBody(registerResponse).data.tokens.refreshToken;
    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefreshToken })
      .expect(200);

    const secondRefreshToken = authBody(refreshResponse).data.tokens.refreshToken;
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
  });

  it("logs out by revoking the active refresh token", async () => {
    const email = `logout+${testRun}`;
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ email, name: "Logout User", password })
      .expect(201);

    const refreshToken = authBody(registerResponse).data.tokens.refreshToken;
    await request(app).post("/api/auth/logout").send({ refreshToken }).expect(200);
    await request(app).post("/api/auth/refresh").send({ refreshToken }).expect(401);
  });
});
