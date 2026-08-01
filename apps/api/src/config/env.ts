import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(12).optional(),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(500).default(100),
  MAX_TRANSCODES: z.coerce.number().int().min(1).max(8).default(2),
  VIRUS_SCAN_URL:z.string().url().optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production") {
    for (const key of ["ADMIN_EMAIL", "ADMIN_PASSWORD", "SUPER_ADMIN_EMAIL", "SUPER_ADMIN_PASSWORD"] as const) {
      if (!value[key]) context.addIssue({code:"custom",path:[key],message:`${key} is required in production`});
    }
    if (value.ADMIN_PASSWORD === value.SUPER_ADMIN_PASSWORD) {
      context.addIssue({code:"custom",path:["SUPER_ADMIN_PASSWORD"],message:"Administrator passwords must be different"});
    }
  }
});

export const env = schema.parse(process.env);
