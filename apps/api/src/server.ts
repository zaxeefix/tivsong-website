import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
const server=app.listen(env.PORT,()=>console.log(`Tiv Songs API listening on :${env.PORT}`));
const shutdown=async()=>{server.close();await prisma.$disconnect();process.exit(0)};
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
