import { z } from "zod";

export const portSchema = z.coerce.number().int().positive().max(65535);
