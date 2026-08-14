import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import {apiLogger} from "./platform/logger.js";
const server=app.listen(env.PORT,()=>apiLogger.info({port:env.PORT},"API listening"));
// Large media is streamed to disk, optimized, then copied to durable object storage.
// Keep the Node request open below Render's 100-minute response ceiling.
server.requestTimeout=95*60_000;
const shutdown=async()=>{server.close();await prisma.$disconnect();process.exit(0)};
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
