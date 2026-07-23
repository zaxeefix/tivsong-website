import { Router } from "express";
import { prisma } from "../database/prisma.js";
export const api = Router();
api.get("/health", async (_req,res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({status:"ok",service:"tiv-songs-api",time:new Date().toISOString()});
});
api.get("/songs", async (req,res) => {
  const page=Math.max(Number(req.query.page)||1,1), take=Math.min(Math.max(Number(req.query.limit)||20,1),100);
  const [items,total]=await prisma.$transaction([
    prisma.song.findMany({where:{status:"PUBLISHED"},include:{artist:true,album:true,genre:true},orderBy:{publishedAt:"desc"},skip:(page-1)*take,take}),
    prisma.song.count({where:{status:"PUBLISHED"}})
  ]);
  res.json({items,pagination:{page,limit:take,total,pages:Math.ceil(total/take)}});
});
api.get("/tor-tiv", async (_req,res) => res.json(await prisma.torTiv.findMany({orderBy:{ordinal:"asc"}})));
