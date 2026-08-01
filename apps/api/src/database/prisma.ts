import type { PrismaClient as CmsPrismaClient } from "../../generated/local-client/index.js";

const prismaModule = process.env.DATABASE_URL?.startsWith("file:")
  ? await import("../../generated/local-client/index.js")
  : await import("@prisma/client");

const PrismaClient = prismaModule.PrismaClient as typeof CmsPrismaClient;

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
