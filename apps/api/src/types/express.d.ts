import type { AuthContext } from "../auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }

    interface Locals {
      auth?: AuthContext;
    }
  }
}

export {};
