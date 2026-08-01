import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import {apiLogger} from "./platform/logger.js";
const server=app.listen(env.PORT,()=>apiLogger.info({port:env.PORT},"API listening"));
const shutdown=async()=>{server.close();await prisma.$disconnect();process.exit(0)};
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
