import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema, refreshTokenBodySchema, registerSchema } from "@orbit/shared";

import type { ApiEnv } from "../config/env.js";
import { asyncHandler } from "../http/async-handler.js";
import { validateBody } from "../http/validation.js";
import { prisma } from "../prisma/client.js";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";

export function createAuthRouter(env: ApiEnv) {
  const router = Router();
  const repository = new AuthRepository(prisma);
  const service = new AuthService(repository, env);
  const controller = new AuthController(service);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (request, response) => {
      response.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many auth attempts. Try again later.",
          requestId: request.id,
        },
      });
    },
  });

  router.post(
    "/register",
    authLimiter,
    validateBody(registerSchema),
    asyncHandler(controller.register)
  );
  router.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(controller.login));
  router.post("/refresh", validateBody(refreshTokenBodySchema), asyncHandler(controller.refresh));
  router.post("/logout", validateBody(refreshTokenBodySchema), asyncHandler(controller.logout));
  router.get("/me", requireAuth(env), asyncHandler(controller.me));

  return router;
}
