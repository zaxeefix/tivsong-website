import { Router, type RequestHandler, type Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import {fileTypeFromFile} from "file-type";
import ffmpegPath from "ffmpeg-static";
import {spawn} from "node:child_process";
import {createHash,randomBytes,randomUUID,timingSafeEqual} from "node:crypto";
import {mkdir,rename,rm,stat} from "node:fs/promises";
import {createReadStream} from "node:fs";
import path from "node:path";
import { z } from "zod";
import type {Prisma} from "../../generated/local-client/index.js";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import {openapiDocument,swaggerHtml} from "../docs/openapi.js";
import {adminLogger,securityLogger} from "../platform/logger.js";

export const api = Router();
api.use(["/account","/admin"],(_req,res,next)=>{
  res.setHeader("Cache-Control","no-store");
  next();
});
api.use((req,res,next)=>{
  if(req.method==="GET"&&/^\/(songs|videos|artists|tor-tiv|categories|community|donation)$/.test(req.path)){
    res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=300");
  }
  next();
});

const uploadRoot=path.resolve(process.cwd(),env.UPLOAD_DIR);
const temporaryDirectory=path.join(uploadRoot,"temporary");
const audioDirectory=path.join(uploadRoot,"audio");
const videoDirectory=path.join(uploadRoot,"video");
const communityDirectory=path.join(uploadRoot,"community");
await Promise.all([temporaryDirectory,audioDirectory,videoDirectory,communityDirectory].map(directory=>mkdir(directory,{recursive:true})));

const maximumUploadBytes=env.MAX_UPLOAD_MB*1024*1024;
const mediaUpload=multer({
  dest:temporaryDirectory,
  limits:{fileSize:maximumUploadBytes,files:1},
  fileFilter:(_req,file,done)=>{
    if(file.mimetype.startsWith("audio/")||file.mimetype.startsWith("video/"))done(null,true);
    else done(new Error("Only audio and video files are accepted"));
  }
});

const communityUpload=multer({
  dest:temporaryDirectory,
  limits:{fileSize:maximumUploadBytes,files:1},
  fileFilter:(_req,file,done)=>{
    if(file.mimetype.startsWith("image/")||file.mimetype.startsWith("video/"))done(null,true);
    else done(new Error("Community activities accept one picture or video"));
  }
});
const cmsMediaUpload=multer({
  dest:temporaryDirectory,
  limits:{fileSize:maximumUploadBytes,files:1},
  fileFilter:(_req,file,done)=>{
    if(["image/","audio/","video/"].some(prefix=>file.mimetype.startsWith(prefix)))done(null,true);
    else done(new Error("The media library accepts images, audio, and video"));
  }
});

let activeTranscodes=0;
async function withTranscodeSlot<T>(operation:()=>Promise<T>):Promise<T>{
  if(activeTranscodes>=env.MAX_TRANSCODES)throw Object.assign(new Error("Media processing is busy. Please retry shortly."),{statusCode:503});
  activeTranscodes++;
  try{return await operation()}finally{activeTranscodes--}
}

async function validateUploadedFile(filePath:string,expected:"audio"|"video"|"image"){
  const detected=await fileTypeFromFile(filePath);
  if(!detected||!detected.mime.startsWith(`${expected}/`)){
    throw Object.assign(new Error(`The uploaded file is not valid ${expected}`),{statusCode:422});
  }
  if(env.VIRUS_SCAN_URL){
    const scan=await fetch(env.VIRUS_SCAN_URL,{
      method:"POST",
      headers:{"Content-Type":detected.mime,"X-Upload-Name":path.basename(filePath)},
      body:createReadStream(filePath) as unknown as BodyInit,
      duplex:"half",
      signal:AbortSignal.timeout(30_000)
    } as RequestInit&{duplex:"half"}).catch(()=>null);
    if(!scan)throw Object.assign(new Error("The upload security scanner is unavailable"),{statusCode:503});
    const result=await scan.json().catch(()=>null) as {clean?:boolean}|null;
    if(!scan.ok||result?.clean!==true)throw Object.assign(new Error("The uploaded file did not pass the security scan"),{statusCode:422});
  }
  return detected;
}

const ffmpegExecutable=(ffmpegPath as unknown as {default?:string}).default||(ffmpegPath as unknown as string);
const runFfmpeg=(args:string[])=>new Promise<void>((resolve,reject)=>{
  if(!ffmpegExecutable)return reject(new Error("FFmpeg is unavailable"));
  const child=spawn(ffmpegExecutable,args,{windowsHide:true});
  let error="";
  const timer=setTimeout(()=>{child.kill();reject(new Error("Media optimization exceeded 150 seconds"))},150_000);
  child.stderr.on("data",(chunk:Buffer)=>{error+=String(chunk).slice(-2000)});
  child.on("error",failure=>{clearTimeout(timer);reject(failure)});
  child.on("close",(code:number|null)=>{clearTimeout(timer);code===0?resolve():reject(new Error(error||`FFmpeg exited with code ${code}`))});
});

async function optimizeMedia(inputPath:string,kind:"audio"|"video",originalName:string){
  const id=randomUUID();
  const directory=kind==="audio"?audioDirectory:videoDirectory;
  const extension=kind==="audio"?".m4a":".mp4";
  const outputPath=path.join(directory,`${id}${extension}`);
  const args=kind==="audio"
    ?["-y","-i",inputPath,"-vn","-c:a","aac","-b:a","192k","-movflags","+faststart",outputPath]
    :["-y","-i",inputPath,"-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-b:a","160k","-movflags","+faststart",outputPath];
  try{
    await runFfmpeg(args);
    const [original,optimized]=await Promise.all([stat(inputPath),stat(outputPath)]);
    if(optimized.size>=original.size){
      await rm(outputPath,{force:true});
      const originalExtension=path.extname(originalName).toLowerCase()||extension;
      const preservedPath=path.join(directory,`${id}${originalExtension}`);
      await rename(inputPath,preservedPath);
      return {filePath:preservedPath,relativePath:`/api/media/${kind}/${path.basename(preservedPath)}`,originalBytes:original.size,storedBytes:original.size,optimized:false};
    }
    await rm(inputPath,{force:true});
    return {filePath:outputPath,relativePath:`/api/media/${kind}/${path.basename(outputPath)}`,originalBytes:original.size,storedBytes:optimized.size,optimized:true};
  }catch{
    const original=await stat(inputPath);
    const preservedPath=path.join(directory,`${id}${path.extname(originalName).toLowerCase()||extension}`);
    await rename(inputPath,preservedPath);
    return {filePath:preservedPath,relativePath:`/api/media/${kind}/${path.basename(preservedPath)}`,originalBytes:original.size,storedBytes:original.size,optimized:false};
  }
}

async function createAudioVariants(inputPath:string){
  const id=randomUUID();
  const highPath=path.join(audioDirectory,`${id}-high.m4a`);
  const mediumPath=path.join(audioDirectory,`${id}-medium.m4a`);
  const lowPath=path.join(audioDirectory,`${id}-low.m4a`);
  try{
    await runFfmpeg([
      "-y","-i",inputPath,"-vn",
      "-map","0:a:0","-c:a","aac","-b:a","256k","-movflags","+faststart",highPath,
      "-map","0:a:0","-c:a","aac","-b:a","128k","-movflags","+faststart",mediumPath,
      "-map","0:a:0","-c:a","aac","-b:a","64k","-movflags","+faststart",lowPath
    ]);
  }catch(error){
    await Promise.all([highPath,mediumPath,lowPath].map(file=>rm(file,{force:true}).catch(()=>undefined)));
    throw error;
  }
  const [original,high,medium,low]=await Promise.all([stat(inputPath),stat(highPath),stat(mediumPath),stat(lowPath)]);
  await rm(inputPath,{force:true});
  return {
    highPath:`/api/media/audio/${path.basename(highPath)}`,
    mediumPath:`/api/media/audio/${path.basename(mediumPath)}`,
    lowPath:`/api/media/audio/${path.basename(lowPath)}`,
    originalBytes:original.size,
    storedBytes:high.size+medium.size+low.size,
    optimized:true
  };
}

async function optimizeCommunityMedia(inputPath:string,mimeType:string){
  const id=randomUUID();
  const isImage=mimeType.startsWith("image/");
  const outputPath=path.join(communityDirectory,`${id}.${isImage?"webp":"mp4"}`);
  const args=isImage
    ?["-y","-i",inputPath,"-vf","scale='min(1600,iw)':-2","-c:v","libwebp","-quality","78",outputPath]
    :["-y","-i",inputPath,"-c:v","libx264","-preset","veryfast","-crf","25","-vf","scale='min(1280,iw)':-2","-c:a","aac","-b:a","128k","-movflags","+faststart",outputPath];
  const original=await stat(inputPath);
  try{await runFfmpeg(args)}catch(error){await rm(outputPath,{force:true}).catch(()=>undefined);throw error}
  const optimized=await stat(outputPath);
  await rm(inputPath,{force:true});
  return {
    relativePath:`/api/media/community/${path.basename(outputPath)}`,
    mediaType:isImage?"image":"video",
    originalBytes:original.size,
    storedBytes:optimized.size,
    optimized:optimized.size<original.size
  };
}

const signedMediaUrl=(mediaPath:string|null,subject:string)=>{
  if(!mediaPath)return null;
  const access=jwt.sign({role:"media",path:mediaPath,sub:subject},env.JWT_ACCESS_SECRET,{expiresIn:"30m"});
  return `${mediaPath}?access=${encodeURIComponent(access)}`;
};

const adminCookie="tiv_admin_session";
const accountCookie="tiv_account_session";
const adminRefreshCookie="tiv_admin_refresh";
const accountRefreshCookie="tiv_account_refresh";
const cookieOptions={httpOnly:true,secure:env.NODE_ENV==="production",sameSite:"lax" as const,path:"/api",maxAge:8*60*60*1000};
const accessCookieOptions={...cookieOptions,maxAge:15*60*1000};
const refreshCookieOptions=(remember:boolean)=>({...cookieOptions,path:"/api",maxAge:remember?env.REFRESH_TOKEN_DAYS*86_400_000:undefined});
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
const securityEvent=(event:string,details:Record<string,unknown>)=>securityLogger.info({event,...details},"security event");
const requestToken=(req:Parameters<RequestHandler>[0],cookieName:string)=>
  req.cookies?.[cookieName]||req.headers.authorization?.replace(/^Bearer\s+/i,"");

const jsonSafe = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));

type AdminRequest = Parameters<RequestHandler>[0] & {admin?:{email:string;role:"admin"|"super_admin"}};
const adminOnly: RequestHandler = (req:AdminRequest, res, next) => {
  const token = requestToken(req,adminCookie);
  if (!token) return void res.status(401).json({error: "Admin authentication required"});
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload !== "object" || !["admin","super_admin"].includes(String(payload.role))) {
      return void res.status(403).json({error: "Admin access required"});
    }
    req.admin={email:String(payload.sub),role:payload.role as "admin"|"super_admin"};
    next();
  } catch {
    res.status(401).json({error: "Admin session expired"});
  }
};

const superAdminOnly: RequestHandler = (req:AdminRequest, res, next) => {
  const token=requestToken(req,adminCookie);
  if(!token)return void res.status(401).json({error:"Super administrator authentication required"});
  try{
    const payload=jwt.verify(token,env.JWT_ACCESS_SECRET);
    if(typeof payload!=="object"||payload.role!=="super_admin"){
      return void res.status(403).json({error:"Only the super administrator can perform this action"});
    }
    req.admin={email:String(payload.sub),role:"super_admin"};
    next();
  }catch{
    res.status(401).json({error:"Super administrator session expired"});
  }
};

type AccountRequest = Parameters<RequestHandler>[0] & {account?: {userId:string; email:string}};
const accountOnly: RequestHandler = async (req:AccountRequest, res, next) => {
  const token = requestToken(req,accountCookie);
  if (!token) return void res.status(401).json({error: "Please sign in to continue"});
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload !== "object" || payload.role !== "account" || typeof payload.sub !== "string") {
      return void res.status(403).json({error: "Account access required"});
    }
    const user=await prisma.user.findUnique({where:{id:payload.sub},select:{id:true,email:true,status:true,suspendedUntil:true,forcePasswordReset:true}});
    if(!user)return void res.status(401).json({error:"This account no longer exists"});
    if(user.status==="SUSPENDED"&&user.suspendedUntil&&user.suspendedUntil<=new Date()){
      await prisma.user.update({where:{id:user.id},data:{status:"ACTIVE",suspendedAt:null,suspendedUntil:null,suspensionReason:null}});
      user.status="ACTIVE";
    }
    const stateErrors:Record<string,string>={
      PENDING:"Your account is awaiting administrator approval.",
      SUSPENDED:"Your account is suspended.",
      BANNED:"Your account has been banned.",
      INACTIVE:"Your account is inactive.",
      DELETED:"This account has been deleted."
    };
    if(user.status!=="ACTIVE")return void res.status(403).json({error:stateErrors[user.status]||"This account is unavailable",code:`ACCOUNT_${user.status}`});
    if(user.forcePasswordReset)return void res.status(403).json({error:"A password reset is required before you can continue.",code:"PASSWORD_RESET_REQUIRED"});
    req.account={userId:user.id,email:user.email};
    void prisma.user.update({where:{id:user.id},data:{lastActivityAt:new Date()}}).catch(()=>undefined);
    next();
  } catch {
    res.status(401).json({error: "Your session has expired. Please sign in again."});
  }
};
const featureGate=(key:"registrationEnabled"|"artistRegistrationEnabled"|"communityUploadEnabled"|"musicUploadEnabled"|"videoUploadEnabled"):RequestHandler=>async(req,res,next)=>{
  const stored=await prisma.setting.findUnique({where:{key:"website"}});
  const system=(stored?.value as {system?:Record<string,boolean>}|null)?.system;
  if(system?.[key]===false)return void res.status(403).json({error:"This website feature is currently disabled"});
  next();
};

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember:z.boolean().optional().default(false)
});

const accountRegisterSchema=z.object({
  accountType:z.enum(["individual","artist"]),
  displayName:z.string().min(2).max(100),
  username:z.string().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/),
  email:z.string().email(),
  password:z.string().min(8).max(100),
  stageName:z.string().min(2).max(100).optional(),
  bio:z.string().max(2000).optional(),
  phoneNumber:z.string().min(7).max(30).optional(),
  country:z.string().min(2).max(100).optional(),
  state:z.string().max(120).optional()
}).superRefine((value,context)=>{
  if(value.accountType==="artist"&&!value.stageName){
    context.addIssue({code:"custom",path:["stageName"],message:"Stage name is required for artist registration"});
  }
});

const accountLoginSchema=z.object({email:z.string().email(),password:z.string().min(8),remember:z.boolean().optional().default(false)});
const accountSongSchema=z.object({
  title:z.string().min(2).max(160),
  categoryId:z.string().min(1),
  description:z.string().max(3000).optional(),
  artworkUrl:z.string().url().optional().or(z.literal("")),
  audioUrl:z.string().url().optional().or(z.literal(""))
});

const mediaSubmissionSchema=z.object({
  kind:z.enum(["audio","video"]),
  title:z.string().min(2).max(160),
  categoryId:z.string().min(1),
  description:z.string().max(3000).optional()
});

const communitySubmissionSchema=z.object({
  title:z.string().min(3).max(160),
  description:z.string().min(20).max(4000),
  country:z.string().min(2).max(100),
  region:z.string().max(120).optional(),
  city:z.string().max(120).optional(),
  eventDate:z.coerce.date(),
  isUpcoming:z.enum(["true","false"]).default("false").transform(value=>value==="true")
});

const categorySeed=[
  ["Traditional Songs","traditional-songs"],
  ["Swange","swange"],
  ["Gospel","gospel"],
  ["Cultural Dance","cultural-dance"],
  ["Wedding Songs","wedding-songs"],
  ["Burial Songs","burial-songs"],
  ["Praise Songs","praise-songs"],
  ["Modern Tiv Music","modern-tiv-music"]
] as const;

async function ensureCategories(){
  return prisma.category.findMany({orderBy:{name:"asc"}});
}

const artistSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(40),
  displayName: z.string().min(2).max(100),
  stageName: z.string().min(2).max(100),
  bio: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal(""))
});

const songSchema = z.object({
  artistId: z.string().min(1),
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(3000).optional(),
  artworkUrl: z.string().url().optional().or(z.literal("")),
  audioUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"]).default("DRAFT")
});

const torTivSchema = z.object({
  ordinal: z.coerce.number().int().positive(),
  name: z.string().min(2).max(120),
  reignStart: z.coerce.date(),
  reignEnd: z.coerce.date().nullable().optional(),
  portraitUrl: z.string().url().optional().or(z.literal("")),
  biography: z.string().min(10).max(5000),
  sourceUrl: z.string().url().optional().or(z.literal(""))
});

api.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({status: "ok", service: "tiv-songs-api", time: new Date().toISOString()});
});
api.get("/openapi.json",(_req,res)=>{res.setHeader("Cache-Control","public, max-age=300");res.json(openapiDocument)});
api.get("/docs",(_req,res)=>{res.setHeader("Content-Security-Policy","default-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; connect-src 'self'");res.type("html").send(swaggerHtml)});

api.get("/songs", async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const take = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const [items, total] = await prisma.$transaction([
    prisma.song.findMany({
      where: {status: "PUBLISHED"},
      include: {artist: true, album: true, genre: true, category:true},
      orderBy: {publishedAt: "desc"},
      skip: (page - 1) * take,
      take
    }),
    prisma.song.count({where: {status: "PUBLISHED"}})
  ]);
  res.json(jsonSafe({items, pagination: {page, limit: take, total, pages: Math.ceil(total / take)}}));
});

api.get("/videos",async(req,res)=>{
  const take=Math.min(Math.max(Number(req.query.limit)||12,1),50);
  const items=await prisma.video.findMany({
    where:{status:"PUBLISHED"},
    include:{artist:true,category:true},
    orderBy:{updatedAt:"desc"},
    take
  });
  res.json(jsonSafe({items}));
});

api.get("/artists",async(_req,res)=>{
  const items=await prisma.artist.findMany({
    where:{verifiedAt:{not:null},user:{status:"ACTIVE"}},
    include:{user:{select:{displayName:true}},_count:{select:{songs:{where:{status:"PUBLISHED"}},videos:{where:{status:"PUBLISHED"}}}}},
    orderBy:{updatedAt:"desc"},
    take:24
  });
  res.json(items);
});

api.get("/tor-tiv", async (_req, res) => {
  res.json(await prisma.torTiv.findMany({orderBy: {ordinal: "asc"}}));
});

api.get("/categories", async (_req,res)=>{
  res.json(await ensureCategories());
});

api.get("/community",async(req,res)=>{
  const take=Math.min(Math.max(Number(req.query.limit)||24,1),60);
  const items=await prisma.communityPost.findMany({
    where:{status:"PUBLISHED"},
    include:{user:{select:{displayName:true}}},
    orderBy:[{isUpcoming:"desc"},{eventDate:"desc"}],
    take
  });
  res.json({items});
});

const publicSlug=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"profile";
api.get("/songs/:slug",async(req,res)=>{
  const slug=z.string().min(1).max(180).parse(req.params.slug);
  const item=await prisma.song.findFirst({where:{slug,status:"PUBLISHED"},include:{artist:{include:{user:{select:{displayName:true,avatarUrl:true}}}},album:true,genre:true,category:true}});
  if(!item)return void res.status(404).json({error:"Song not found"});res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=300");res.json(jsonSafe(item));
});
api.get("/videos/:slug",async(req,res)=>{
  const slug=z.string().min(1).max(180).parse(req.params.slug);
  const item=await prisma.video.findFirst({where:{slug,status:"PUBLISHED"},include:{artist:{include:{user:{select:{displayName:true,avatarUrl:true}}}},category:true}});
  if(!item)return void res.status(404).json({error:"Video not found"});res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=300");res.json(jsonSafe(item));
});
api.get("/artists/:slug",async(req,res)=>{
  const slug=z.string().min(1).max(180).parse(req.params.slug);
  const candidates=await prisma.artist.findMany({where:{verifiedAt:{not:null},user:{status:"ACTIVE"}},include:{user:{select:{displayName:true,avatarUrl:true}},songs:{where:{status:"PUBLISHED"},take:20,orderBy:{publishedAt:"desc"}},videos:{where:{status:"PUBLISHED"},take:20,orderBy:{createdAt:"desc"}}},take:500});
  const item=candidates.find(artist=>publicSlug(artist.stageName)===slug);
  if(!item)return void res.status(404).json({error:"Artist not found"});res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=300");res.json(jsonSafe(item));
});
api.get("/community/:slug",async(req,res)=>{
  const slug=z.string().min(1).max(240).parse(req.params.slug);const id=slug.includes("--")?slug.slice(slug.lastIndexOf("--")+2):slug;
  const item=await prisma.communityPost.findFirst({where:{id,status:"PUBLISHED"},include:{user:{select:{displayName:true,avatarUrl:true}}}});
  if(!item||`${publicSlug(item.title)}--${item.id}`!==slug)return void res.status(404).json({error:"Community post not found"});
  res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=300");res.json(jsonSafe(item));
});

const donationSchema=z.object({
  enabled:z.boolean().default(true),
  bankName:z.string().max(120).default(""),
  accountName:z.string().max(160).default(""),
  accountNumber:z.string().max(60).default(""),
  paymentLink:z.string().url().optional().or(z.literal("")),
  message:z.string().max(300).default("Support the preservation of Tiv music and culture.")
});

api.get("/donation",async(_req,res)=>{
  const setting=await prisma.setting.findUnique({where:{key:"donation"}});
  const value=donationSchema.parse(setting?.value||{});
  res.json(value);
});

api.get("/media/:kind/:file", async (req,res)=>{
  const kind=z.enum(["audio","video","community"]).parse(req.params.kind);
  const file=path.basename(z.string().min(1).parse(req.params.file));
  const mediaPath=`/api/media/${kind}/${file}`;
  let authorized=false;
  const access=typeof req.query.access==="string"?req.query.access:"";
  if(access){
    try{
      const payload=jwt.verify(access,env.JWT_ACCESS_SECRET);
      authorized=typeof payload==="object"&&payload.role==="media"&&payload.path===mediaPath;
    }catch{authorized=false}
  }
  if(!authorized){
    authorized=kind==="audio"
      ?Boolean(await prisma.song.findFirst({where:{OR:[{audioUrl:mediaPath},{audioMediumUrl:mediaPath},{audioLowUrl:mediaPath}],status:"PUBLISHED"},select:{id:true}}))
      :kind==="video"
        ?Boolean(await prisma.video.findFirst({where:{videoUrl:mediaPath,status:"PUBLISHED"},select:{id:true}}))
        :Boolean(
          await prisma.communityPost.findFirst({where:{mediaUrl:mediaPath,status:"PUBLISHED"},select:{id:true}})||
          await prisma.mediaAsset.findFirst({where:{url:mediaPath},select:{id:true}})
        );
  }
  if(!authorized)return void res.status(403).json({error:"Media access denied"});
  const directory=kind==="audio"?audioDirectory:kind==="video"?videoDirectory:communityDirectory;
  res.setHeader("Cache-Control",access?"private, max-age=300":"public, max-age=86400, immutable");
  res.sendFile(path.join(directory,file));
});

api.post("/account/register",featureGate("registrationEnabled"), async (req, res) => {
  const input=accountRegisterSchema.parse(req.body);
  if(input.accountType==="artist"){
    const website=await prisma.setting.findUnique({where:{key:"website"}});
    if((website?.value as {system?:Record<string,boolean>}|null)?.system?.artistRegistrationEnabled===false){
      return void res.status(403).json({error:"Artist registration is currently disabled"});
    }
  }
  const email=input.email.toLowerCase();
  const username=input.username.toLowerCase();
  const existing=await prisma.user.findFirst({where:{OR:[{email},{username}]}});
  if(existing) return void res.status(409).json({error:"An account already exists with that email or username"});
  if(input.accountType==="artist"&&await prisma.artist.findUnique({where:{stageName:input.stageName!}})){
    return void res.status(409).json({error:"That stage name is already registered"});
  }

  const passwordHash=await bcrypt.hash(input.password,12);
  const roleName=input.accountType==="artist"?"artist_pending":"member";
  const user=await prisma.user.create({
    data:{
      email,
      username,
      passwordHash,
      displayName:input.displayName,
      accountType:input.accountType,
      phoneNumber:input.phoneNumber||null,
      country:input.country||null,
      state:input.state||null,
      status:input.accountType==="artist"?"PENDING":"ACTIVE",
      roles:{create:{role:{connectOrCreate:{where:{name:roleName},create:{name:roleName}}}}},
      ...(input.accountType==="artist"?{artist:{create:{
        stageName:input.stageName!,
        bio:input.bio||null
      }}}:{})
    },
    include:{artist:true,roles:{include:{role:true}}}
  });
  res.status(201).json({
    success:true,
    account:{id:user.id,email:user.email,displayName:user.displayName,status:user.status,accountType:input.accountType},
    message:input.accountType==="artist"
      ?"Your artist application has been submitted for administrator approval."
      :"Your member account is ready. Sign in to follow artists and join community discussions."
  });
});

api.post("/account/login", async (req, res) => {
  const input=accountLoginSchema.parse(req.body);
  const email=input.email.toLowerCase();
  const user=await prisma.user.findUnique({
    where:{email},
    include:{artist:true,roles:{include:{role:true}}}
  });
  const userAgent=req.get("user-agent")?.slice(0,500)||null;
  const browser=userAgent?.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/)?.[1]||null;
  const device=userAgent?(/mobile|android|iphone|ipad/i.test(userAgent)?"Mobile":"Desktop"):null;
  const logAttempt=(successful:boolean,failure?:string)=>prisma.loginAttempt.create({data:{userId:user?.id||null,email,successful,ipAddress:req.ip||null,userAgent,device,browser,country:req.get("cf-ipcountry")?.slice(0,2)||null,failure:failure||null}});
  if(!user?.passwordHash||!(await bcrypt.compare(input.password,user.passwordHash))){
    await logAttempt(false,"INVALID_CREDENTIALS");
    return void res.status(401).json({error:"Invalid email or password"});
  }
  if(user.status==="SUSPENDED"&&user.suspendedUntil&&user.suspendedUntil<=new Date()){
    await prisma.user.update({where:{id:user.id},data:{status:"ACTIVE",suspendedAt:null,suspendedUntil:null,suspensionReason:null}});
    user.status="ACTIVE";
  }
  if(user.status!=="ACTIVE"){
    await logAttempt(false,`ACCOUNT_${user.status}`);
    const messages:Record<string,string>={PENDING:"Your account is awaiting approval.",SUSPENDED:"Your account is suspended.",BANNED:"Your account has been banned.",INACTIVE:"Your account is inactive.",DELETED:"This account has been deleted."};
    return void res.status(403).json({error:messages[user.status]||"This account is unavailable",code:`ACCOUNT_${user.status}`});
  }
  if(user.forcePasswordReset){
    await logAttempt(false,"PASSWORD_RESET_REQUIRED");
    return void res.status(403).json({error:"An administrator requires you to reset your password.",code:"PASSWORD_RESET_REQUIRED"});
  }
  const roles=user.roles.map(item=>item.role.name);
  const token=jwt.sign(
    {sub:user.id,email:user.email,role:"account",roles},
    env.JWT_ACCESS_SECRET,
    {expiresIn:"15m"}
  );
  const sessionId=randomUUID();
  const refreshToken=jwt.sign({sub:user.id,role:"account_refresh",sid:sessionId,nonce:randomBytes(16).toString("hex")},env.JWT_REFRESH_SECRET,{expiresIn:env.REFRESH_TOKEN_DAYS*86_400});
  await prisma.$transaction([
    prisma.session.create({data:{id:sessionId,userId:user.id,refreshTokenHash:tokenHash(refreshToken),expiresAt:new Date(Date.now()+env.REFRESH_TOKEN_DAYS*86_400_000),userAgent,ipAddress:req.ip||null}}),
    prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date(),lastActivityAt:new Date()}}),
    prisma.loginAttempt.create({data:{userId:user.id,email,successful:true,ipAddress:req.ip||null,userAgent,device,browser,country:req.get("cf-ipcountry")?.slice(0,2)||null}})
  ]);
  res.cookie(accountCookie,token,accessCookieOptions);
  res.cookie(accountRefreshCookie,refreshToken,refreshCookieOptions(input.remember));
  securityEvent("account.login",{userId:user.id,ip:req.ip});
  res.json({account:{
    id:user.id,email:user.email,displayName:user.displayName,username:user.username,
    status:user.status,roles,artist:user.artist
  }});
});

api.post("/account/refresh",async(req,res)=>{
  const refreshToken=String(req.cookies?.[accountRefreshCookie]||"");
  try{
    const payload=jwt.verify(refreshToken,env.JWT_REFRESH_SECRET);
    if(typeof payload!=="object"||payload.role!=="account_refresh"||typeof payload.sub!=="string"||typeof payload.sid!=="string")throw new Error();
    const session=await prisma.session.findUnique({
      where:{id:payload.sid},
      include:{user:{include:{roles:{include:{role:true}}}}}
    });
    if(!session||session.revokedAt||session.expiresAt<=new Date()||session.refreshTokenHash!==tokenHash(refreshToken)||session.user.status==="SUSPENDED"||session.user.status==="DELETED")throw new Error();
    const roles=session.user.roles.map(item=>item.role.name);
    const accessToken=jwt.sign({sub:session.user.id,email:session.user.email,role:"account",roles},env.JWT_ACCESS_SECRET,{expiresIn:"15m"});
    const rotated=jwt.sign({sub:session.user.id,role:"account_refresh",sid:session.id,nonce:randomBytes(16).toString("hex")},env.JWT_REFRESH_SECRET,{expiresIn:env.REFRESH_TOKEN_DAYS*86_400});
    await prisma.session.update({where:{id:session.id},data:{refreshTokenHash:tokenHash(rotated),expiresAt:new Date(Date.now()+env.REFRESH_TOKEN_DAYS*86_400_000)}});
    res.cookie(accountCookie,accessToken,accessCookieOptions);
    res.cookie(accountRefreshCookie,rotated,refreshCookieOptions(true));
    res.json({refreshed:true});
  }catch{
    res.clearCookie(accountCookie,{...accessCookieOptions,maxAge:undefined});
    res.clearCookie(accountRefreshCookie,{...cookieOptions,maxAge:undefined});
    res.status(401).json({error:"Your session has expired. Please sign in again."});
  }
});

api.post("/account/logout",async(req,res)=>{
  const refreshToken=String(req.cookies?.[accountRefreshCookie]||"");
  if(refreshToken)await prisma.session.updateMany({where:{refreshTokenHash:tokenHash(refreshToken),revokedAt:null},data:{revokedAt:new Date()}}).catch(()=>undefined);
  res.clearCookie(accountCookie,{...cookieOptions,maxAge:undefined});
  res.clearCookie(accountRefreshCookie,{...cookieOptions,maxAge:undefined});
  res.status(204).end();
});

api.get("/account/me", accountOnly, async (req:AccountRequest, res) => {
  const user=await prisma.user.findUnique({
    where:{id:req.account!.userId},
    select:{
      id:true,email:true,username:true,displayName:true,accountType:true,status:true,createdAt:true,
      artist:{select:{id:true,stageName:true,bio:true,verifiedAt:true}},
      roles:{select:{role:{select:{name:true}}}}
    }
  });
  if(!user) return void res.status(404).json({error:"Account not found"});
  res.json({...user,roles:user.roles.map(item=>item.role.name)});
});

api.get("/account/songs", accountOnly, async (req:AccountRequest, res) => {
  const songs=await prisma.song.findMany({
    where:{artist:{userId:req.account!.userId}},
    select:{id:true,title:true,slug:true,description:true,artworkUrl:true,audioUrl:true,audioMediumUrl:true,audioLowUrl:true,status:true,createdAt:true,updatedAt:true,publishedAt:true,category:true},
    orderBy:{createdAt:"desc"},take:100
  });
  res.json(jsonSafe(songs.map(song=>({...song,
    audioUrl:signedMediaUrl(song.audioUrl,req.account!.userId),
    audioMediumUrl:signedMediaUrl(song.audioMediumUrl,req.account!.userId),
    audioLowUrl:signedMediaUrl(song.audioLowUrl,req.account!.userId)
  }))));
});

api.get("/account/videos", accountOnly, async (req:AccountRequest, res) => {
  const videos=await prisma.video.findMany({
    where:{artist:{userId:req.account!.userId}},
    select:{id:true,title:true,description:true,thumbnailUrl:true,videoUrl:true,status:true,createdAt:true,updatedAt:true,category:true},
    orderBy:{createdAt:"desc"},take:100
  });
  res.json(jsonSafe(videos.map(video=>({...video,videoUrl:signedMediaUrl(video.videoUrl,req.account!.userId)}))));
});

api.get("/account/community",accountOnly,async(req:AccountRequest,res)=>{
  const items=await prisma.communityPost.findMany({
    where:{userId:req.account!.userId},
    orderBy:{createdAt:"desc"},take:100
  });
  res.json(items.map(item=>({...item,mediaUrl:signedMediaUrl(item.mediaUrl,req.account!.userId)})));
});

api.post("/account/community",accountOnly,featureGate("communityUploadEnabled"),communityUpload.single("file"),async(req:AccountRequest,res)=>{
  if(!req.file)return void res.status(422).json({error:"Choose a picture or video"});
  try{
    const input=communitySubmissionSchema.parse(req.body);
    const expected=req.file.mimetype.startsWith("image/")?"image":"video";
    const detected=await validateUploadedFile(req.file.path,expected);
    const user=await prisma.user.findUnique({where:{id:req.account!.userId},select:{status:true}});
    if(!user||user.status!=="ACTIVE")return void res.status(403).json({error:"Your account must be active before submitting an activity"});
    const media=await withTranscodeSlot(()=>optimizeCommunityMedia(req.file!.path,detected.mime));
    const item=await prisma.communityPost.create({data:{
      userId:req.account!.userId,title:input.title,description:input.description,
      country:input.country,region:input.region||null,city:input.city||null,
      eventDate:input.eventDate,isUpcoming:input.isUpcoming,mediaType:media.mediaType,
      mediaUrl:media.relativePath,status:"PENDING_REVIEW"
    }});
    res.status(201).json({item,optimization:{originalBytes:media.originalBytes,storedBytes:media.storedBytes,optimized:media.optimized},message:"Community activity submitted for administrator review."});
  }finally{
    if(req.file)await rm(req.file.path,{force:true}).catch(()=>undefined);
  }
});

api.post("/account/songs", accountOnly,featureGate("musicUploadEnabled"), async (req:AccountRequest, res) => {
  const input=accountSongSchema.parse(req.body);
  const user=await prisma.user.findUnique({
    where:{id:req.account!.userId},
    include:{artist:true,roles:{include:{role:true}}}
  });
  if(!user||!user.artist) return void res.status(403).json({error:"Your contributor profile is unavailable"});
  const roles=user.roles.map(item=>item.role.name);
  if(user.status!=="ACTIVE"||roles.includes("artist_pending")){
    return void res.status(403).json({error:"Your artist registration is awaiting administrator approval"});
  }
  const base=input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"song";
  let slug=base;
  let suffix=1;
  while(await prisma.song.findUnique({where:{slug}})) slug=`${base}-${++suffix}`;
  const song=await prisma.song.create({
    data:{
      artistId:user.artist.id,
      categoryId:input.categoryId,
      title:input.title,
      slug,
      description:input.description||null,
      artworkUrl:input.artworkUrl||null,
      audioUrl:input.audioUrl||null,
      status:"PENDING_REVIEW"
    }
  });
  res.status(201).json(jsonSafe({song,message:"Music submitted. It will appear publicly after administrator approval."}));
});

api.post("/account/media", accountOnly,featureGate("musicUploadEnabled"), mediaUpload.single("file"), async (req:AccountRequest, res) => {
  if(!req.file)return void res.status(422).json({error:"Choose an audio or video file"});
  try{
    const input=mediaSubmissionSchema.parse(req.body);
    await validateUploadedFile(req.file.path,input.kind);
    const user=await prisma.user.findUnique({where:{id:req.account!.userId},include:{artist:true,roles:{include:{role:true}}}});
    if(!user?.artist)return void res.status(403).json({error:"Your contributor profile is unavailable"});
    if(user.status!=="ACTIVE"||user.roles.some(item=>item.role.name==="artist_pending")){
      return void res.status(403).json({error:"Your artist registration is awaiting administrator approval"});
    }
    await prisma.category.findUniqueOrThrow({where:{id:input.categoryId}});
    const base=input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||input.kind;
    let slug=base;
    let suffix=1;
    if(input.kind==="audio"){
      const audio=await withTranscodeSlot(()=>createAudioVariants(req.file!.path));
      const optimization={originalBytes:audio.originalBytes,storedBytes:audio.storedBytes,optimized:audio.optimized};
      while(await prisma.song.findUnique({where:{slug}}))slug=`${base}-${++suffix}`;
      const song=await prisma.song.create({data:{artistId:user.artist.id,categoryId:input.categoryId,title:input.title,slug,description:input.description||null,audioUrl:audio.highPath,audioMediumUrl:audio.mediumPath,audioLowUrl:audio.lowPath,status:"PENDING_REVIEW"}});
      return void res.status(201).json(jsonSafe({item:song,optimization,message:"Audio uploaded and submitted for administrator review."}));
    }
    const videoMedia=await withTranscodeSlot(()=>optimizeMedia(req.file!.path,"video",req.file!.originalname));
    const optimization={originalBytes:videoMedia.originalBytes,storedBytes:videoMedia.storedBytes,optimized:videoMedia.optimized};
    while(await prisma.video.findUnique({where:{slug}}))slug=`${base}-${++suffix}`;
    const video=await prisma.video.create({data:{artistId:user.artist.id,categoryId:input.categoryId,title:input.title,slug,description:input.description||null,videoUrl:videoMedia.relativePath,status:"PENDING_REVIEW"}});
    res.status(201).json(jsonSafe({item:video,optimization,message:"Video uploaded and submitted for administrator review."}));
  }finally{
    if(req.file)await rm(req.file.path,{force:true}).catch(()=>undefined);
  }
});

api.post("/admin/login", (req, res) => {
  const credentials = adminLoginSchema.parse(req.body);
  if(!env.ADMIN_EMAIL||!env.ADMIN_PASSWORD){
    return void res.status(503).json({error:"Administrator access is not configured"});
  }
  const safeEqual=(left:string,right:string)=>{
    const a=Buffer.from(left);const b=Buffer.from(right);
    return a.length===b.length&&timingSafeEqual(a,b);
  };
  const isSuperAdmin=Boolean(
    env.SUPER_ADMIN_EMAIL&&
    env.SUPER_ADMIN_PASSWORD&&
    safeEqual(credentials.email.toLowerCase(),env.SUPER_ADMIN_EMAIL.toLowerCase())&&
    safeEqual(credentials.password,env.SUPER_ADMIN_PASSWORD)
  );
  const isAdmin=!isSuperAdmin&&safeEqual(credentials.email.toLowerCase(),env.ADMIN_EMAIL.toLowerCase())&&safeEqual(credentials.password,env.ADMIN_PASSWORD);
  if(!isSuperAdmin&&!isAdmin){
    securityEvent("admin.login_failed",{email:credentials.email.toLowerCase(),ip:req.ip});
    return void res.status(401).json({error: "Invalid administrator credentials"});
  }
  const role=isSuperAdmin?"super_admin":"admin";
  const token = jwt.sign(
    {sub: credentials.email, role},
    env.JWT_ACCESS_SECRET,
    {expiresIn: "15m"}
  );
  const refreshToken=jwt.sign({sub:credentials.email,role:`${role}_refresh`,nonce:randomBytes(16).toString("hex")},env.JWT_REFRESH_SECRET,{expiresIn:env.REFRESH_TOKEN_DAYS*86_400});
  res.cookie(adminCookie,token,accessCookieOptions);
  res.cookie(adminRefreshCookie,refreshToken,refreshCookieOptions(credentials.remember));
  securityEvent("admin.login",{email:credentials.email.toLowerCase(),role,ip:req.ip});
  res.json({admin: {email: credentials.email, role}});
});

api.post("/admin/refresh",(req,res)=>{
  try{
    const refreshToken=String(req.cookies?.[adminRefreshCookie]||"");
    const payload=jwt.verify(refreshToken,env.JWT_REFRESH_SECRET);
    if(typeof payload!=="object"||typeof payload.sub!=="string"||!["admin_refresh","super_admin_refresh"].includes(String(payload.role)))throw new Error();
    const role=payload.role==="super_admin_refresh"?"super_admin":"admin";
    const token=jwt.sign({sub:payload.sub,role},env.JWT_ACCESS_SECRET,{expiresIn:"15m"});
    res.cookie(adminCookie,token,accessCookieOptions);
    res.json({refreshed:true});
  }catch{
    res.clearCookie(adminCookie,{...accessCookieOptions,maxAge:undefined});
    res.clearCookie(adminRefreshCookie,{...cookieOptions,maxAge:undefined});
    res.status(401).json({error:"Admin session expired"});
  }
});

api.post("/admin/logout",(req,res)=>{
  securityEvent("admin.logout",{ip:req.ip});
  res.clearCookie(adminCookie,{...cookieOptions,maxAge:undefined});
  res.clearCookie(adminRefreshCookie,{...cookieOptions,maxAge:undefined});
  res.status(204).end();
});

api.get("/admin/session",adminOnly,(_req,res)=>res.json({authenticated:true}));

api.get("/admin/donation",superAdminOnly,async(_req,res)=>{
  const setting=await prisma.setting.findUnique({where:{key:"donation"}});
  res.json(donationSchema.parse(setting?.value||{}));
});

api.put("/admin/donation",superAdminOnly,async(req,res)=>{
  const value=donationSchema.parse(req.body);
  await prisma.setting.upsert({where:{key:"donation"},update:{value},create:{key:"donation",value}});
  res.json({success:true,value});
});

api.get("/admin/accounts", adminOnly, async (_req, res) => {
  const users=await prisma.user.findMany({
    select:{
      id:true,email:true,username:true,displayName:true,status:true,createdAt:true,
      artist:{select:{stageName:true,bio:true,verifiedAt:true}},
      roles:{select:{role:{select:{name:true}}}}
    },
    orderBy:{createdAt:"desc"},take:200
  });
  res.json(users.map(user=>({...user,roles:user.roles.map(item=>item.role.name)})));
});

api.patch("/admin/accounts/:id/approve", adminOnly, async (req:AdminRequest, res) => {
  const userId=z.string().min(1).parse(req.params.id);
  const user=await prisma.user.findUnique({where:{id:userId},include:{artist:true}});
  if(!user) return void res.status(404).json({error:"Account not found"});
  if(user.accountType!=="artist"||!user.artist)return void res.status(422).json({error:"This account does not have an artist application"});
  const artistRole=await prisma.role.upsert({where:{name:"artist"},update:{},create:{name:"artist"}});
  const pendingRole=await prisma.role.findUnique({where:{name:"artist_pending"}});
  await prisma.$transaction([
    prisma.user.update({where:{id:userId},data:{status:"ACTIVE"}}),
    prisma.artist.update({where:{userId},data:{verifiedAt:new Date()}}),
    prisma.userRole.upsert({where:{userId_roleId:{userId,roleId:artistRole.id}},update:{},create:{userId,roleId:artistRole.id}}),
    ...(pendingRole?[prisma.userRole.deleteMany({where:{userId,roleId:pendingRole.id}})]:[])
  ]);
  await notifyUser(userId,"ARTIST_APPROVED","Artist account approved","Your artist profile is verified and music submission tools are now available.",{artistId:user.artist.id});
  await recordAudit(req,"ARTIST_APPROVED","user",userId,`Approved artist account: ${user.email}`);
  res.json({success:true,message:"Artist account approved"});
});

api.patch("/admin/accounts/:id/reject", adminOnly, async (req:AdminRequest, res) => {
  const userId=z.string().min(1).parse(req.params.id);
  const user=await prisma.user.update({where:{id:userId},data:{status:"SUSPENDED",suspendedAt:new Date(),suspensionReason:"Artist application rejected"}});
  await notifyUser(userId,"ARTIST_REJECTED","Artist application update","Your artist application was not approved. Contact support if you need more information.");
  await recordAudit(req,"ARTIST_REJECTED","user",userId,`Rejected artist application: ${user.email}`);
  res.json({success:true,message:"Artist application rejected"});
});

api.get("/admin/overview", adminOnly, async (_req, res) => {
  const [artists, songs, publishedSongs, kings, users] = await prisma.$transaction([
    prisma.artist.count(),
    prisma.song.count(),
    prisma.song.count({where: {status: "PUBLISHED"}}),
    prisma.torTiv.count(),
    prisma.user.count()
  ]);
  res.json({artists, songs, publishedSongs, kings, users});
});

api.get("/admin/artists", adminOnly, async (_req, res) => {
  res.json(await prisma.artist.findMany({include: {user: true}, orderBy: {createdAt: "desc"},take:200}));
});

api.post("/admin/artists", adminOnly, async (req, res) => {
  const input = artistSchema.parse(req.body);
  const artist = await prisma.artist.create({
    data: {
      stageName: input.stageName,
      bio: input.bio || null,
      imageUrl: input.imageUrl || null,
      user: {
        create: {
          email: input.email.toLowerCase(),
          username: input.username.toLowerCase(),
          displayName: input.displayName,
          status: "ACTIVE"
        }
      }
    },
    include: {user: true}
  });
  res.status(201).json(artist);
});

api.get("/admin/songs", adminOnly, async (_req, res) => {
  const songs = await prisma.song.findMany({include: {artist: true,category:true}, orderBy: {createdAt: "desc"},take:200});
  res.json(jsonSafe(songs.map(song=>({...song,
    audioUrl:signedMediaUrl(song.audioUrl,"admin"),
    audioMediumUrl:signedMediaUrl(song.audioMediumUrl,"admin"),
    audioLowUrl:signedMediaUrl(song.audioLowUrl,"admin")
  }))));
});

api.get("/admin/videos", adminOnly, async (_req,res)=>{
  const videos=await prisma.video.findMany({include:{artist:true,category:true},orderBy:{createdAt:"desc"},take:200});
  res.json(jsonSafe(videos.map(video=>({...video,videoUrl:signedMediaUrl(video.videoUrl,"admin")}))));
});

api.get("/admin/community",adminOnly,async(_req,res)=>{
  const items=await prisma.communityPost.findMany({include:{user:{select:{displayName:true,email:true}}},orderBy:{createdAt:"desc"},take:200});
  res.json(items.map(item=>({...item,mediaUrl:signedMediaUrl(item.mediaUrl,"admin")})));
});

api.patch("/admin/community/:id/status",adminOnly,async(req,res)=>{
  const id=z.string().min(1).parse(req.params.id);
  const {status}=z.object({status:z.enum(["PUBLISHED","REJECTED","ARCHIVED"])}).parse(req.body);
  const item=await prisma.communityPost.update({where:{id},data:{status,publishedAt:status==="PUBLISHED"?new Date():null}});
  res.json(item);
});

api.delete("/admin/community/:id",adminOnly,async(req,res)=>{
  const id=z.string().min(1).parse(req.params.id);
  const item=await prisma.communityPost.findUnique({where:{id},select:{mediaUrl:true}});
  await prisma.communityPost.delete({where:{id}});
  if(item?.mediaUrl)await rm(path.join(communityDirectory,path.basename(item.mediaUrl)),{force:true}).catch(()=>undefined);
  res.status(204).end();
});

api.post("/admin/songs", adminOnly, async (req, res) => {
  const input = songSchema.parse(req.body);
  const song = await prisma.song.create({
    data: {
      ...input,
      description: input.description || null,
      artworkUrl: input.artworkUrl || null,
      audioUrl: input.audioUrl || null,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null
    },
    include: {artist: true}
  });
  res.status(201).json(jsonSafe(song));
});

api.patch("/admin/songs/:id/status", adminOnly, async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const {status} = z.object({
    status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"])
  }).parse(req.body);
  const song = await prisma.song.update({
    where: {id},
    data: {status, publishedAt: status === "PUBLISHED" ? new Date() : null}
  });
  res.json(jsonSafe(song));
});

api.patch("/admin/videos/:id/status", adminOnly, async (req,res)=>{
  const id=z.string().min(1).parse(req.params.id);
  const {status}=z.object({status:z.enum(["DRAFT","PENDING_REVIEW","PUBLISHED","REJECTED","ARCHIVED"])}).parse(req.body);
  const video=await prisma.video.update({where:{id},data:{status}});
  res.json(jsonSafe(video));
});

api.delete("/admin/videos/:id", adminOnly, async (req,res)=>{
  const id=z.string().min(1).parse(req.params.id);
  const video=await prisma.video.findUnique({where:{id},select:{videoUrl:true}});
  await prisma.video.delete({where:{id}});
  if(video?.videoUrl){
    const file=path.basename(video.videoUrl);
    await rm(path.join(videoDirectory,file),{force:true}).catch(()=>undefined);
  }
  res.status(204).end();
});

api.delete("/admin/songs/:id", adminOnly, async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const song=await prisma.song.findUnique({where:{id},select:{audioUrl:true,audioMediumUrl:true,audioLowUrl:true}});
  await prisma.song.delete({where: {id}});
  await Promise.all([song?.audioUrl,song?.audioMediumUrl,song?.audioLowUrl].filter(Boolean).map(media=>
    rm(path.join(audioDirectory,path.basename(media!)),{force:true}).catch(()=>undefined)
  ));
  res.status(204).end();
});

api.get("/admin/tor-tiv", adminOnly, async (_req, res) => {
  res.json(await prisma.torTiv.findMany({orderBy: {ordinal: "asc"}}));
});

api.post("/admin/tor-tiv", adminOnly, async (req, res) => {
  const input = torTivSchema.parse(req.body);
  const king = await prisma.torTiv.create({
    data: {
      ...input,
      reignEnd: input.reignEnd || null,
      portraitUrl: input.portraitUrl || null,
      sourceUrl: input.sourceUrl || null
    }
  });
  res.status(201).json(king);
});

api.delete("/admin/tor-tiv/:id", adminOnly, async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  await prisma.torTiv.delete({where: {id}});
  res.status(204).end();
});

// CMS control plane. Flexible entries preserve existing tables while allowing
// administrators to add new website-managed content without a redeployment.
const cmsKinds=["hero","news","governor","history","homepage_section","announcement","faq","privacy","terms","about","footer_link","contact"] as const;
const cmsKindSchema=z.enum(cmsKinds);
const cmsStatusSchema=z.enum(["DRAFT","PUBLISHED","ARCHIVED"]);
const cmsEntrySchema=z.object({
  kind:cmsKindSchema,
  slug:z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title:z.string().min(1).max(180),
  subtitle:z.string().max(240).optional().nullable(),
  excerpt:z.string().max(500).optional().nullable(),
  body:z.string().max(100_000).optional().nullable(),
  status:cmsStatusSchema.default("DRAFT"),
  featured:z.boolean().default(false),
  pinned:z.boolean().default(false),
  sortOrder:z.number().int().min(0).max(10_000).default(0),
  publishAt:z.coerce.date().optional().nullable(),
  archiveAt:z.coerce.date().optional().nullable(),
  imageUrl:z.string().url().optional().nullable(),
  videoUrl:z.string().url().optional().nullable(),
  buttonText:z.string().max(80).optional().nullable(),
  buttonUrl:z.string().max(500).optional().nullable(),
  metadata:z.record(z.string(),z.unknown()).optional().nullable(),
  seo:z.record(z.string(),z.unknown()).optional().nullable()
});
const settingsSchema=z.object({
  general:z.object({
    websiteName:z.string().min(1).max(100),logo:z.string().max(500),favicon:z.string().max(500),footerLogo:z.string().max(500),
    websiteDescription:z.string().max(500),seoDescription:z.string().max(500),keywords:z.array(z.string().max(60)).max(30),
    contactEmail:z.string().email().or(z.literal("")),supportEmail:z.string().email().or(z.literal("")),phone:z.string().max(40),
    officeAddress:z.string().max(300),socialLinks:z.record(z.string(),z.string().max(500)),
    socialMedia:z.array(z.object({platform:z.enum(["facebook","tiktok","youtube","audiomack"]),enabled:z.boolean(),url:z.string().url().or(z.literal("")),order:z.number().int().min(0).max(20),customIcon:z.string().max(500).default("")})).length(4)
  }),
  appearance:z.object({
    primaryColor:z.string().regex(/^#[0-9a-fA-F]{6}$/),secondaryColor:z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor:z.string().regex(/^#[0-9a-fA-F]{6}$/),defaultTheme:z.enum(["light","dark","system"]),
    typography:z.string().max(100),heroAnimationSpeed:z.number().min(1).max(60)
  }),
  homepage:z.object({enabledSections:z.record(z.string(),z.boolean()),sectionOrder:z.array(z.string()).max(30),featuredSections:z.array(z.string()).max(20),banner:z.string().max(500)}),
  system:z.object({
    maintenanceMode:z.boolean(),registrationEnabled:z.boolean(),artistRegistrationEnabled:z.boolean(),communityUploadEnabled:z.boolean(),
    musicUploadEnabled:z.boolean(),videoUploadEnabled:z.boolean(),commentsEnabled:z.boolean(),donationEnabled:z.boolean()
  }),
  utilityDock:z.object({position:z.enum(["right","left"]),visibility:z.enum(["entire","homepage"]),liveStatus:z.enum(["online","offline"]),reportUrl:z.string().max(500),searchEnabled:z.boolean(),shareEnabled:z.boolean()}),
  commentPolicy:z.object({
    approvalRequired:z.boolean(),requireApprovalForNewUsers:z.boolean(),minimumApprovedForTrust:z.number().int().min(1).max(100),
    spamDetection:z.boolean(),maximumLinks:z.number().int().min(0).max(20),maximumCharacters:z.number().int().min(100).max(10_000),
    allowReplies:z.boolean(),allowEmojis:z.boolean(),allowGif:z.boolean(),enableReportButton:z.boolean(),
    autoHideThreshold:z.number().int().min(1).max(100),trustedUserThreshold:z.number().int().min(1).max(100)
  }),
  footer:z.object({about:z.string().max(500),newsletterEnabled:z.boolean(),copyright:z.string().max(200)}),
  version:z.object({currentVersion:z.string().max(40),buildNumber:z.string().max(40),releaseDate:z.string().max(40),environment:z.enum(["Production","Development","Staging"])})
});
const defaultSettings={
  general:{websiteName:"Tiv Songs",logo:"/assets/tiv-song-logo.jpeg",favicon:"/icon-192.png",footerLogo:"/assets/tiv-song-logo.jpeg",websiteDescription:"Tiv music and cultural heritage",seoDescription:"Discover Tiv music, artists and cultural heritage.",keywords:["Tiv music","Tiv culture"],contactEmail:"",supportEmail:"",phone:"",officeAddress:"",socialLinks:{facebook:"",audiomack:"",youtube:"",tiktok:""},socialMedia:[
    {platform:"facebook" as const,enabled:true,url:"",order:0,customIcon:""},{platform:"tiktok" as const,enabled:true,url:"",order:1,customIcon:""},
    {platform:"youtube" as const,enabled:true,url:"",order:2,customIcon:""},{platform:"audiomack" as const,enabled:true,url:"",order:3,customIcon:""}
  ]},
  appearance:{primaryColor:"#4d0f78",secondaryColor:"#26003f",accentColor:"#ffad73",defaultTheme:"system" as const,typography:"Arial, sans-serif",heroAnimationSpeed:8},
  homepage:{enabledSections:{hero:true,songs:true,artists:true,heritage:true,community:true,news:true},sectionOrder:["hero","songs","artists","heritage","community","news"],featuredSections:["songs","artists"],banner:""},
  system:{maintenanceMode:false,registrationEnabled:true,artistRegistrationEnabled:true,communityUploadEnabled:true,musicUploadEnabled:true,videoUploadEnabled:true,commentsEnabled:true,donationEnabled:true},
  utilityDock:{position:"right" as const,visibility:"entire" as const,liveStatus:"online" as const,reportUrl:"mailto:support@tivsongs.com",searchEnabled:true,shareEnabled:true},
  commentPolicy:{approvalRequired:false,requireApprovalForNewUsers:true,minimumApprovedForTrust:5,spamDetection:true,maximumLinks:2,maximumCharacters:3000,allowReplies:true,allowEmojis:true,allowGif:false,enableReportButton:true,autoHideThreshold:5,trustedUserThreshold:5},
  footer:{about:"The digital home of Tiv music, people, history and cultural heritage.",newsletterEnabled:true,copyright:"© 2026 Tiv Songs. All rights reserved."},
  version:{currentVersion:"1.0.0",buildNumber:"2026.07",releaseDate:"2026-07-30",environment:env.NODE_ENV==="production"?"Production" as const:"Development" as const}
};
const mergedSettings=(stored:unknown)=>{
  const value=stored&&typeof stored==="object"?stored as Record<string,unknown>:{};
  const general=value.general&&typeof value.general==="object"?value.general as Record<string,unknown>:{};
  return {...defaultSettings,...value,general:{...defaultSettings.general,...general,socialLinks:{...defaultSettings.general.socialLinks,...(general.socialLinks as Record<string,string>||{})}},appearance:{...defaultSettings.appearance,...(value.appearance as object||{})},homepage:{...defaultSettings.homepage,...(value.homepage as object||{})},system:{...defaultSettings.system,...(value.system as object||{})},utilityDock:{...defaultSettings.utilityDock,...(value.utilityDock as object||{})},commentPolicy:{...defaultSettings.commentPolicy,...(value.commentPolicy as object||{})},footer:{...defaultSettings.footer,...(value.footer as object||{})},version:{...defaultSettings.version,...(value.version as object||{})}};
};
const cmsClients=new Set<Response>();
const prismaJson=(value:unknown):Prisma.InputJsonValue|undefined=>value==null?undefined:value as Prisma.InputJsonValue;
const cmsBroadcast=(event:string,data:unknown)=>{
  const payload=`event: ${event}\ndata: ${JSON.stringify(jsonSafe(data))}\n\n`;
  for(const client of cmsClients)client.write(payload);
};
const recordAudit=async(req:AdminRequest,action:string,entity:string,entityId:string|undefined,summary:string,metadata?:Record<string,unknown>)=>{
  await prisma.auditLog.create({data:{actor:req.admin?.email||"unknown",role:req.admin?.role||"admin",action,entity,entityId,summary,ipAddress:req.ip,userAgent:req.get("user-agent"),metadata:prismaJson(metadata)}}).catch((error:unknown)=>adminLogger.error({err:error,action,entity,entityId},"audit persistence failed"));
};
const notifyUser=async(userId:string,type:string,title:string,body:string,data?:Record<string,unknown>)=>{
  const notification=await prisma.notification.create({data:{userId,type,title,body,data:prismaJson(data)}});
  cmsBroadcast("notification.created",{userId,id:notification.id});
  return notification;
};
const pageQuery=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20),search:z.string().max(100).default(""),status:z.string().max(40).optional(),sort:z.enum(["createdAt","updatedAt","title","sortOrder"]).default("updatedAt"),direction:z.enum(["asc","desc"]).default("desc")});

api.get("/cms/settings",async(_req,res)=>{
  const stored=await prisma.setting.findUnique({where:{key:"website"}});
  res.json(mergedSettings(stored?.value));
});
api.get("/cms/entries/:kind",async(req,res)=>{
  const kind=cmsKindSchema.parse(req.params.kind);
  const now=new Date();
  const items=await prisma.cmsEntry.findMany({where:{kind,status:"PUBLISHED",AND:[{OR:[{publishAt:null},{publishAt:{lte:now}}]},{OR:[{archiveAt:null},{archiveAt:{gt:now}}]}]},orderBy:[{pinned:"desc"},{sortOrder:"asc"},{publishAt:"desc"}]});
  res.setHeader("Cache-Control","public, max-age=30, stale-while-revalidate=120");
  res.json(jsonSafe(items));
});
api.get("/cms/events",(req,res)=>{
  res.setHeader("Content-Type","text/event-stream");res.setHeader("Cache-Control","no-cache");res.setHeader("Connection","keep-alive");res.flushHeaders();
  res.write(`event: connected\ndata: {"ok":true}\n\n`);cmsClients.add(res);
  const heartbeat=setInterval(()=>res.write(": heartbeat\n\n"),25_000);
  req.on("close",()=>{clearInterval(heartbeat);cmsClients.delete(res)});
});
const commentPolicy=async()=>{const stored=await prisma.setting.findUnique({where:{key:"website"}});return mergedSettings(stored?.value).commentPolicy};
const commentTrust=async(userId:string,minimumApproved:number)=>{
  const [user,approved,rejected,warnings,uploads,commentIds]=await Promise.all([
    prisma.user.findUnique({where:{id:userId},select:{createdAt:true}}),prisma.cmsComment.count({where:{userId,status:"APPROVED"}}),
    prisma.cmsComment.count({where:{userId,status:{in:["REJECTED","SPAM","HIDDEN"]}}}),prisma.userWarning.count({where:{userId,active:true}}),
    prisma.upload.count({where:{userId,status:"PUBLISHED"}}),prisma.cmsComment.findMany({where:{userId},select:{id:true},take:1000})
  ]);
  const reports=await prisma.contentReport.count({where:{targetType:"COMMENT",targetId:{in:commentIds.map(item=>item.id)},status:{not:"DISMISSED"}}});const violations=rejected+warnings+reports;
  return {approved,rejected,reports,warnings,successfulUploads:uploads,accountAgeDays:user?Math.floor((Date.now()-user.createdAt.getTime())/86_400_000):0,violations,trusted:approved>=minimumApproved&&violations===0};
};
const scoreCommentSpam=(body:string,policy:Awaited<ReturnType<typeof commentPolicy>>)=>{
  const links=(body.match(/https?:\/\/|www\./gi)||[]).length;const repeated=/(.{8,})\1{2,}/i.test(body);const emojiRuns=(body.match(/(?:\p{Extended_Pictographic}\s*){8,}/gu)||[]).length;
  const unusual=(body.match(/[^\p{L}\p{N}\p{P}\p{Z}\p{Extended_Pictographic}]/gu)||[]).length>8;const phishing=/verify.{0,20}(account|password)|free.{0,12}(gift|money)|wallet.{0,12}(seed|password)|bit\.ly|tinyurl/i.test(body);
  const offensive=/\b(?:idiot|stupid|bastard|scam)\b/i.test(body);const tooLong=body.length>policy.maximumCharacters;const linksOver=links>policy.maximumLinks;
  const score=[repeated,emojiRuns>0,unusual,phishing,offensive,tooLong,linksOver].filter(Boolean).length/4;return {score:Math.min(1,score),suspicious:score>=.5||linksOver||tooLong};
};
api.get("/comments/:targetType/:targetId",async(req,res)=>{
  const targetType=z.enum(["song","video","community","history","artist"]).parse(req.params.targetType);const targetId=z.string().min(1).parse(req.params.targetId);
  const sort=z.enum(["newest","oldest","liked","replied"]).catch("newest").parse(req.query.sort);const page=Math.max(Number(req.query.page)||1,1);const pageSize=Math.min(Math.max(Number(req.query.pageSize)||20,1),50);
  const orderBy=sort==="liked"?{likeCount:"desc" as const}:sort==="oldest"?{createdAt:"asc" as const}:{createdAt:"desc" as const};
  const [items,total]=await Promise.all([prisma.cmsComment.findMany({where:{targetType,targetId,status:"APPROVED",parentId:null},include:{replies:{where:{status:"APPROVED"},orderBy:{createdAt:"asc"}}},orderBy:[{pinned:"desc"},orderBy],skip:(page-1)*pageSize,take:pageSize}),prisma.cmsComment.count({where:{targetType,targetId,status:"APPROVED",parentId:null}})]);
  if(sort==="replied")items.sort((a,b)=>b.replies.length-a.replies.length);
  const userIds=[...new Set(items.flatMap(item=>[item.userId,...item.replies.map(reply=>reply.userId)]))];const users=await prisma.user.findMany({where:{id:{in:userIds}},select:{id:true,displayName:true,avatarUrl:true}});const authors=new Map(users.map(user=>[user.id,user]));
  const result=items.map(item=>({...item,author:authors.get(item.userId)||{displayName:"Tiv Songs member",avatarUrl:null},replies:item.replies.map(reply=>({...reply,author:authors.get(reply.userId)||{displayName:"Tiv Songs member",avatarUrl:null}}))}));
  res.setHeader("Cache-Control","public, max-age=10, stale-while-revalidate=30");res.json(req.query.format==="page"?{items:result,pagination:{page,pageSize,total,pages:Math.max(1,Math.ceil(total/pageSize))}}:result);
});
api.post("/comments",accountOnly,async(req:AccountRequest,res)=>{
  const stored=await prisma.setting.findUnique({where:{key:"website"}});const settings=mergedSettings(stored?.value);if(!settings.system.commentsEnabled)return void res.status(403).json({error:"Comments are currently disabled"});
  const policy=settings.commentPolicy;const input=z.object({targetType:z.enum(["song","video","community","history","artist"]),targetId:z.string().min(1),parentId:z.string().optional(),body:z.string().min(2).max(policy.maximumCharacters)}).parse(req.body);
  if(input.parentId&&!policy.allowReplies)return void res.status(403).json({error:"Comment replies are currently disabled"});if(!policy.allowEmojis&&/\p{Extended_Pictographic}/u.test(input.body))return void res.status(422).json({error:"Emojis are disabled by the comment policy"});if(!policy.allowGif&&/https?:\/\/\S+\.gif(?:\?|$)/i.test(input.body))return void res.status(422).json({error:"GIF links are disabled by the comment policy"});
  const duplicate=await prisma.cmsComment.findFirst({where:{userId:req.account!.userId,body:input.body,createdAt:{gte:new Date(Date.now()-86_400_000)}}});const trust=await commentTrust(req.account!.userId,policy.minimumApprovedForTrust);const spam=scoreCommentSpam(input.body,policy);
  const suspicious=policy.spamDetection&&(spam.suspicious||Boolean(duplicate));const status=suspicious?"SPAM":policy.approvalRequired||(policy.requireApprovalForNewUsers&&!trust.trusted)?"PENDING":"APPROVED";
  const item=await prisma.cmsComment.create({data:{...input,userId:req.account!.userId,spamScore:suspicious?Math.max(spam.score,duplicate?.spamScore||.7):spam.score,status}});
  if(input.parentId&&status==="APPROVED"){const parent=await prisma.cmsComment.findUnique({where:{id:input.parentId},select:{userId:true}});if(parent&&parent.userId!==req.account!.userId)await notifyUser(parent.userId,"COMMENT_REPLIED","New reply to your comment",input.body.slice(0,180),{commentId:item.id})}
  cmsBroadcast(status==="APPROVED"?"comment.approved":"comment.submitted",{id:item.id,targetType:item.targetType,targetId:item.targetId,status});res.status(201).json({id:item.id,status,autoPublished:status==="APPROVED",message:status==="APPROVED"?"Your comment is now live.":"Your comment is awaiting review."});
});
api.post("/comments/:id/like",accountOnly,async(req,res)=>{const id=z.string().parse(req.params.id);const item=await prisma.cmsComment.update({where:{id,status:"APPROVED"},data:{likeCount:{increment:1}}});cmsBroadcast("comment.liked",{id,likeCount:item.likeCount});res.json({likeCount:item.likeCount})});
api.post("/comments/:id/report",accountOnly,async(req:AccountRequest,res)=>{
  const id=z.string().parse(req.params.id);const policy=await commentPolicy();if(!policy.enableReportButton)return void res.status(403).json({error:"Comment reporting is disabled"});const comment=await prisma.cmsComment.findUnique({where:{id},select:{userId:true}});
  if(!comment)return void res.status(404).json({error:"Comment not found"});if(comment.userId===req.account!.userId)return void res.status(422).json({error:"You cannot report your own comment"});
  if(await prisma.contentReport.findFirst({where:{reporterId:req.account!.userId,targetType:"COMMENT",targetId:id,status:{in:["OPEN","REVIEWING"]}}}))return void res.status(409).json({error:"You already reported this comment"});
  const reason=z.object({reason:z.enum(["SPAM","HARASSMENT","COPYRIGHT","FAKE_INFORMATION","ABUSE","OTHER"]).default("OTHER"),details:z.string().max(500).optional()}).parse(req.body);await prisma.contentReport.create({data:{reporterId:req.account!.userId,targetType:"COMMENT",targetId:id,...reason}});
  const reports=await prisma.contentReport.findMany({where:{targetType:"COMMENT",targetId:id,status:{in:["OPEN","REVIEWING"]}},select:{reporterId:true}});let trustedReports=0;for(const reporterId of [...new Set(reports.map(report=>report.reporterId))])if((await commentTrust(reporterId,policy.minimumApprovedForTrust)).trusted)trustedReports++;
  const hidden=trustedReports>=Math.max(policy.autoHideThreshold,policy.trustedUserThreshold);const item=await prisma.cmsComment.update({where:{id},data:{reportCount:reports.length,...(hidden?{status:"HIDDEN"}:{})}});
  if(hidden)await notifyUser(comment.userId,"COMMENT_HIDDEN","Comment hidden for review","Your comment was temporarily hidden after community reports.",{commentId:id});cmsBroadcast(hidden?"comment.hidden":"comment.reported",{id,reportCount:item.reportCount,trustedReports});res.status(202).json({reported:true,hidden});
});
api.post("/reports",accountOnly,async(req:AccountRequest,res)=>{
  const input=z.object({targetType:z.enum(["USER","ARTIST","SONG","VIDEO","COMMENT","COMMUNITY_POST"]),targetId:z.string().min(1).max(100),reason:z.enum(["SPAM","HARASSMENT","COPYRIGHT","FAKE_INFORMATION","ABUSE","OTHER"]),details:z.string().max(2000).optional()}).parse(req.body);
  const report=await prisma.contentReport.create({data:{reporterId:req.account!.userId,...input}});
  cmsBroadcast("report.created",{id:report.id,targetType:report.targetType});
  res.status(201).json({id:report.id,status:report.status});
});
api.post("/analytics",async(req,res)=>{
  const input=z.object({event:z.string().min(1).max(50),entityType:z.string().max(50).optional(),entityId:z.string().max(100).optional(),searchTerm:z.string().max(100).optional(),metadata:z.record(z.string(),z.unknown()).optional()}).parse(req.body);
  await prisma.analyticsEvent.create({data:{...input,metadata:prismaJson(input.metadata),userId:undefined,country:req.get("cf-ipcountry"),device:/mobile/i.test(req.get("user-agent")||"")?"mobile":"desktop",browser:req.get("user-agent")?.slice(0,120)}});
  res.status(202).json({accepted:true});
});
api.get("/search",async(req,res)=>{
  const q=z.string().min(2).max(100).parse(req.query.q);
  const blocked=await prisma.searchRule.findFirst({where:{type:"BLOCKED",active:true,keyword:{equals:q}}});
  if(blocked)return void res.json({songs:[],videos:[],artists:[],community:[],kings:[],history:[]});
  const contains={contains:q};
  const [songs,videos,artists,community,kings,history]=await Promise.all([
    prisma.song.findMany({where:{status:"PUBLISHED",title:contains},take:6,select:{id:true,title:true,slug:true,artworkUrl:true,artist:{select:{stageName:true}}}}),
    prisma.video.findMany({where:{status:"PUBLISHED",title:contains},take:6,select:{id:true,title:true,slug:true,thumbnailUrl:true,artist:{select:{stageName:true}}}}),
    prisma.artist.findMany({where:{stageName:contains},take:6,select:{id:true,stageName:true,imageUrl:true}}),
    prisma.communityPost.findMany({where:{status:"PUBLISHED",OR:[{title:contains},{description:contains}]},take:6,select:{id:true,title:true,mediaUrl:true}}),
    prisma.torTiv.findMany({where:{OR:[{name:contains},{biography:contains}]},take:6,select:{id:true,name:true,portraitUrl:true}}),
    prisma.historyArticle.findMany({where:{OR:[{title:contains},{body:contains}]},take:6,select:{id:true,title:true,slug:true,coverUrl:true}})
  ]);
  void prisma.analyticsEvent.create({data:{event:"search",searchTerm:q,device:/mobile/i.test(req.get("user-agent")||"")?"mobile":"desktop"}}).catch(()=>undefined);
  res.json({songs,videos,artists:artists.map(item=>({...item,slug:publicSlug(item.stageName)})),community:community.map(item=>({...item,slug:`${publicSlug(item.title)}--${item.id}`})),kings,history});
});
api.get("/search/suggestions",async(_req,res)=>{const items=await prisma.searchRule.findMany({where:{active:true,type:{in:["TRENDING","SUGGESTION"]}},orderBy:{weight:"desc"},take:12,select:{keyword:true,type:true}});res.json(items)});
api.get("/account/notifications",accountOnly,async(req:AccountRequest,res)=>{const items=await prisma.notification.findMany({where:{userId:req.account!.userId},orderBy:{createdAt:"desc"},take:50});res.json({items,unread:items.filter(item=>!item.readAt).length})});
api.patch("/account/notifications/read",accountOnly,async(req:AccountRequest,res)=>{await prisma.notification.updateMany({where:{userId:req.account!.userId,readAt:null},data:{readAt:new Date()}});res.status(204).end()});

api.get("/admin/settings",adminOnly,async(_req,res)=>{const stored=await prisma.setting.findUnique({where:{key:"website"}});res.json(mergedSettings(stored?.value))});
api.put("/admin/settings",adminOnly,async(req:AdminRequest,res)=>{
  const value=settingsSchema.parse(req.body);
  await prisma.setting.upsert({where:{key:"website"},create:{key:"website",value},update:{value}});
  await recordAudit(req,"SETTINGS_CHANGE","website","website","Updated website settings");
  cmsBroadcast("settings.updated",value);res.json(value);
});
api.get("/admin/cms/:kind",adminOnly,async(req,res)=>{
  const kind=cmsKindSchema.parse(req.params.kind);const query=pageQuery.parse(req.query);const skip=(query.page-1)*query.pageSize;
  const where={kind,...(query.status?{status:query.status}:{}),...(query.search?{OR:[{title:{contains:query.search,mode:"insensitive" as const}},{slug:{contains:query.search,mode:"insensitive" as const}}]}:{})};
  const [items,total]=await Promise.all([prisma.cmsEntry.findMany({where,skip,take:query.pageSize,orderBy:{[query.sort]:query.direction}}),prisma.cmsEntry.count({where})]);
  res.json(jsonSafe({items,total,page:query.page,pageSize:query.pageSize,pages:Math.ceil(total/query.pageSize)}));
});
api.post("/admin/cms",adminOnly,async(req:AdminRequest,res)=>{
  const input=cmsEntrySchema.parse(req.body);const item=await prisma.cmsEntry.create({data:{...input,metadata:prismaJson(input.metadata),seo:prismaJson(input.seo),createdBy:req.admin?.email,updatedBy:req.admin?.email}});
  await recordAudit(req,"CREATE","cms_entry",item.id,`Created ${item.kind}: ${item.title}`);cmsBroadcast("content.updated",{kind:item.kind,id:item.id});res.status(201).json(jsonSafe(item));
});
api.put("/admin/cms/:id",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().min(1).parse(req.params.id);const input=cmsEntrySchema.parse(req.body);const item=await prisma.cmsEntry.update({where:{id},data:{...input,metadata:prismaJson(input.metadata),seo:prismaJson(input.seo),updatedBy:req.admin?.email}});
  await recordAudit(req,"EDIT","cms_entry",item.id,`Updated ${item.kind}: ${item.title}`);cmsBroadcast("content.updated",{kind:item.kind,id:item.id});res.json(jsonSafe(item));
});
api.patch("/admin/cms/:id/status",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().min(1).parse(req.params.id);const {status}=z.object({status:cmsStatusSchema}).parse(req.body);const item=await prisma.cmsEntry.update({where:{id},data:{status,updatedBy:req.admin?.email,publishAt:status==="PUBLISHED"?new Date():undefined}});
  await recordAudit(req,status==="PUBLISHED"?"PUBLISH":"STATUS_CHANGE","cms_entry",id,`${status}: ${item.title}`);cmsBroadcast("content.updated",{kind:item.kind,id,status});res.json(item);
});
api.delete("/admin/cms/:id",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().min(1).parse(req.params.id);const item=await prisma.cmsEntry.delete({where:{id}});await recordAudit(req,"DELETE","cms_entry",id,`Deleted ${item.kind}: ${item.title}`);cmsBroadcast("content.updated",{kind:item.kind,id,deleted:true});res.status(204).end();
});
api.post("/admin/cms/bulk",adminOnly,async(req:AdminRequest,res)=>{
  const input=z.object({ids:z.array(z.string()).min(1).max(100),action:z.enum(["PUBLISH","ARCHIVE","DELETE"])}).parse(req.body);
  if(input.action==="DELETE")await prisma.cmsEntry.deleteMany({where:{id:{in:input.ids}}});else await prisma.cmsEntry.updateMany({where:{id:{in:input.ids}},data:{status:input.action==="PUBLISH"?"PUBLISHED":"ARCHIVED",updatedBy:req.admin?.email}});
  await recordAudit(req,"BULK_"+input.action,"cms_entry",undefined,`${input.action} ${input.ids.length} CMS records`);cmsBroadcast("content.updated",{bulk:true});res.json({updated:input.ids.length});
});
api.get("/admin/cms/:kind/export",adminOnly,async(req,res)=>{
  const kind=cmsKindSchema.parse(req.params.kind);const items=await prisma.cmsEntry.findMany({where:{kind},orderBy:{updatedAt:"desc"}});
  res.setHeader("Content-Disposition",`attachment; filename="${kind}.json"`);res.json(jsonSafe(items));
});

api.get("/admin/audit",adminOnly,async(req,res)=>{const query=pageQuery.parse(req.query);const [items,total]=await Promise.all([prisma.auditLog.findMany({skip:(query.page-1)*query.pageSize,take:query.pageSize,orderBy:{createdAt:"desc"}}),prisma.auditLog.count()]);res.json({items,total,page:query.page})});
api.get("/admin/analytics",adminOnly,async(_req,res)=>{
  const since=new Date(Date.now()-30*86_400_000);
  const today=new Date();today.setHours(0,0,0,0);
  const [events,users,topSongs,topVideos,pendingComments,approvedToday,spamDetected,activeCommenters,reportedComments,reportedUsers,sharePlatforms]=await Promise.all([
    prisma.analyticsEvent.groupBy({by:["event"],where:{createdAt:{gte:since}},_count:{_all:true}}),
    prisma.user.count({where:{createdAt:{gte:since}}}),
    prisma.song.findMany({take:10,orderBy:{playCount:"desc"},select:{id:true,title:true,playCount:true,downloadCount:true}}),
    prisma.video.findMany({take:10,orderBy:{viewCount:"desc"},select:{id:true,title:true,viewCount:true}}),
    prisma.cmsComment.count({where:{status:"PENDING"}}),prisma.cmsComment.count({where:{status:"APPROVED",moderatedAt:{gte:today}}}),prisma.cmsComment.count({where:{status:"SPAM",createdAt:{gte:since}}}),
    prisma.cmsComment.groupBy({by:["userId"],where:{createdAt:{gte:since}},_count:{_all:true},orderBy:{_count:{userId:"desc"}},take:10}),
    prisma.cmsComment.findMany({where:{reportCount:{gt:0}},orderBy:{reportCount:"desc"},take:10,select:{id:true,userId:true,body:true,reportCount:true,status:true}}),
    prisma.contentReport.groupBy({by:["targetId"],where:{targetType:"USER",createdAt:{gte:since}},_count:{_all:true},orderBy:{_count:{targetId:"desc"}},take:10}),
    prisma.analyticsEvent.groupBy({by:["event"],where:{event:{startsWith:"share_"},createdAt:{gte:since}},_count:{_all:true}})
  ]);
  res.json(jsonSafe({period:"30 days",events,newUsers:users,topSongs,topVideos,comments:{pending:pendingComments,approvedToday,spamDetected,mostActiveUsers:activeCommenters,mostReportedComments:reportedComments,mostReportedUsers:reportedUsers},sharing:{platforms:sharePlatforms,total:sharePlatforms.reduce((sum,item)=>sum+item._count._all,0)}}));
});
api.get("/admin/search-rules",adminOnly,async(_req,res)=>res.json(await prisma.searchRule.findMany({orderBy:[{type:"asc"},{weight:"desc"}]})));
api.post("/admin/search-rules",adminOnly,async(req:AdminRequest,res)=>{const input=z.object({keyword:z.string().min(1).max(100),type:z.enum(["TRENDING","SUGGESTION","BLOCKED"]),weight:z.number().int().default(0),active:z.boolean().default(true)}).parse(req.body);const item=await prisma.searchRule.upsert({where:{keyword:input.keyword},create:input,update:input});await recordAudit(req,"EDIT","search_rule",item.id,`Updated search rule: ${item.keyword}`);res.json(item)});
api.delete("/admin/search-rules/:id",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);await prisma.searchRule.delete({where:{id}});await recordAudit(req,"DELETE","search_rule",id,"Deleted search rule");res.status(204).end()});
api.get("/admin/email-templates",adminOnly,async(_req,res)=>res.json(await prisma.emailTemplate.findMany({orderBy:{name:"asc"}})));
api.put("/admin/email-templates/:key",adminOnly,async(req:AdminRequest,res)=>{const key=z.string().regex(/^[a-z0-9_]+$/).parse(req.params.key);const input=z.object({name:z.string().min(1),subject:z.string().min(1),html:z.string().min(1).max(100_000),text:z.string().max(100_000).optional(),active:z.boolean().default(true)}).parse(req.body);const item=await prisma.emailTemplate.upsert({where:{key},create:{key,...input,updatedBy:req.admin?.email},update:{...input,updatedBy:req.admin?.email}});await recordAudit(req,"EDIT","email_template",item.id,`Updated email template: ${item.name}`);res.json(item)});

api.get("/admin/media",adminOnly,async(req,res)=>{const query=pageQuery.parse(req.query);const where=query.search?{name:{contains:query.search,mode:"insensitive" as const}}:{};const [items,total,usage]=await Promise.all([prisma.mediaAsset.findMany({where,skip:(query.page-1)*query.pageSize,take:query.pageSize,orderBy:{createdAt:"desc"}}),prisma.mediaAsset.count({where}),prisma.mediaAsset.aggregate({_sum:{sizeBytes:true}})]);res.json(jsonSafe({items,total,page:query.page,storageBytes:usage._sum.sizeBytes||0}))});
api.post("/admin/media",adminOnly,cmsMediaUpload.single("file"),async(req:AdminRequest,res)=>{
  if(!req.file)return void res.status(422).json({error:"Choose a media file"});
  const detected=await fileTypeFromFile(req.file.path);if(!detected)throw Object.assign(new Error("The file type could not be verified"),{statusCode:422});
  const kind=detected.mime.split("/")[0]||"";if(!["image","audio","video"].includes(kind))throw Object.assign(new Error("Unsupported media type"),{statusCode:422});
  await validateUploadedFile(req.file.path,kind as "image"|"audio"|"video");
  const directory=kind==="audio"?audioDirectory:kind==="video"?videoDirectory:communityDirectory;
  const filename=`cms-${randomUUID()}.${detected.ext}`;const destination=path.join(directory,filename);await rename(req.file.path,destination);
  const mediaKind=kind==="image"?"community":kind;const asset=await prisma.mediaAsset.create({data:{name:req.body.name||req.file.originalname,folder:req.body.folder||"/",kind,mimeType:detected.mime,url:`/api/media/${mediaKind}/${filename}`,storageKey:filename,sizeBytes:req.file.size,altText:req.body.altText||null,uploadedBy:req.admin?.email}});
  await recordAudit(req,"UPLOAD","media",asset.id,`Uploaded ${asset.name}`);cmsBroadcast("media.updated",{id:asset.id});res.status(201).json(jsonSafe(asset));
});
api.patch("/admin/media/:id",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);const input=z.object({name:z.string().min(1).max(180).optional(),folder:z.string().max(180).optional(),altText:z.string().max(300).optional()}).parse(req.body);const item=await prisma.mediaAsset.update({where:{id},data:input});await recordAudit(req,"EDIT","media",id,`Updated media: ${item.name}`);res.json(jsonSafe(item))});
api.delete("/admin/media/:id",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);const item=await prisma.mediaAsset.delete({where:{id}});const directory=item.kind==="audio"?audioDirectory:item.kind==="video"?videoDirectory:communityDirectory;if(item.storageKey)await rm(path.join(directory,path.basename(item.storageKey)),{force:true}).catch(()=>undefined);await recordAudit(req,"DELETE","media",id,`Deleted media: ${item.name}`);cmsBroadcast("media.updated",{id,deleted:true});res.status(204).end()});

api.get("/admin/comments",adminOnly,async(req,res)=>{const query=pageQuery.parse(req.query);const where=query.status?{status:query.status}:{};const [items,total]=await Promise.all([prisma.cmsComment.findMany({where,skip:(query.page-1)*query.pageSize,take:query.pageSize,orderBy:{createdAt:"desc"},include:{replies:true}}),prisma.cmsComment.count({where})]);res.json({items,total,page:query.page})});
api.patch("/admin/comments/:id",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().parse(req.params.id);const input=z.object({status:z.enum(["PENDING","APPROVED","REJECTED","SPAM","HIDDEN"]).optional(),pinned:z.boolean().optional()}).parse(req.body);
  const item=await prisma.cmsComment.update({where:{id},data:{...input,moderatedBy:req.admin?.email,moderatedAt:new Date()}});if(input.status)await notifyUser(item.userId,`COMMENT_${input.status}`,`Comment ${input.status.toLowerCase()}`,input.status==="APPROVED"?"Your comment is now public.":`Your comment was marked ${input.status.toLowerCase()}.`,{commentId:id});
  await recordAudit(req,"MODERATE","comment",id,`Comment changed to ${item.status}`);cmsBroadcast("comment.updated",{id,status:item.status,targetType:item.targetType,targetId:item.targetId});res.json(item)
});
api.delete("/admin/comments/:id",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);await prisma.cmsComment.delete({where:{id}});await recordAudit(req,"DELETE","comment",id,"Deleted comment");cmsBroadcast("comment.updated",{id,deleted:true});res.status(204).end()});
api.post("/admin/comments/:id/action",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().parse(req.params.id);const input=z.object({action:z.enum(["WARN","SUSPEND","BAN","REPLY"]),message:z.string().min(2).max(2000)}).parse(req.body);const comment=await prisma.cmsComment.findUnique({where:{id}});if(!comment)return void res.status(404).json({error:"Comment not found"});
  if(input.action==="WARN"){await prisma.userWarning.create({data:{userId:comment.userId,level:"WARNING",reason:input.message,issuedBy:req.admin!.email}});await notifyUser(comment.userId,"ACCOUNT_WARNING","Comment policy warning",input.message,{commentId:id})}
  if(input.action==="SUSPEND"||input.action==="BAN"){await prisma.user.update({where:{id:comment.userId},data:input.action==="SUSPEND"?{status:"SUSPENDED",suspendedAt:new Date(),suspensionReason:input.message}:{status:"BANNED",bannedAt:new Date(),banReason:input.message,bannedBy:req.admin!.email}});await prisma.session.updateMany({where:{userId:comment.userId,revokedAt:null},data:{revokedAt:new Date()}});await notifyUser(comment.userId,`ACCOUNT_${input.action}`,`Account ${input.action.toLowerCase()}`,input.message)}
  if(input.action==="REPLY"){const moderator=await prisma.user.upsert({where:{email:"moderation@tivsongs.local"},update:{displayName:"Tiv Songs Moderation",status:"ACTIVE"},create:{email:"moderation@tivsongs.local",username:"tiv_songs_moderation",displayName:"Tiv Songs Moderation",status:"ACTIVE",emailVerifiedAt:new Date()}});const reply=await prisma.cmsComment.create({data:{userId:moderator.id,targetType:comment.targetType,targetId:comment.targetId,parentId:id,body:input.message,status:"APPROVED",moderatedBy:req.admin!.email,moderatedAt:new Date()}});await notifyUser(comment.userId,"COMMENT_REPLIED","Tiv Songs replied to your comment",input.message,{commentId:reply.id});cmsBroadcast("comment.approved",{id:reply.id,targetType:reply.targetType,targetId:reply.targetId})}
  await recordAudit(req,`COMMENT_${input.action}`,"comment",id,input.message);res.json({success:true});
});

const userDirectoryQuery=z.object({
  page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20),
  search:z.string().max(100).default(""),status:z.enum(["PENDING","ACTIVE","SUSPENDED","BANNED","INACTIVE","DELETED"]).optional(),
  role:z.string().max(50).optional(),accountType:z.enum(["individual","artist"]).optional(),
  sort:z.enum(["createdAt","lastLoginAt","displayName","email","status"]).default("createdAt"),direction:z.enum(["asc","desc"]).default("desc")
});
api.get("/admin/users",adminOnly,async(req,res)=>{
  const query=userDirectoryQuery.parse(req.query);
  const where:Prisma.UserWhereInput={
    ...(query.status?{status:query.status}:{}),...(query.accountType?{accountType:query.accountType}:{}),
    ...(query.role?{roles:{some:{role:{name:query.role}}}}:{}),
    ...(query.search?{OR:[{displayName:{contains:query.search}},{username:{contains:query.search}},{email:{contains:query.search}},{phoneNumber:{contains:query.search}}]}:{})
  };
  const direction=query.direction;
  const orderBy:Prisma.UserOrderByWithRelationInput=query.sort==="lastLoginAt"?{lastLoginAt:direction}:query.sort==="displayName"?{displayName:direction}:query.sort==="email"?{email:direction}:query.sort==="status"?{status:direction}:{createdAt:direction};
  const [items,total]=await Promise.all([
    prisma.user.findMany({where,skip:(query.page-1)*query.pageSize,take:query.pageSize,orderBy,select:{
      id:true,email:true,username:true,displayName:true,avatarUrl:true,phoneNumber:true,country:true,state:true,accountType:true,status:true,emailVerifiedAt:true,
      createdAt:true,lastLoginAt:true,lastActivityAt:true,suspendedUntil:true,forcePasswordReset:true,
      artist:{select:{stageName:true,imageUrl:true,verifiedAt:true}},roles:{select:{role:{select:{name:true}}}},_count:{select:{uploads:true,comments:true,communityPosts:true}}
    }}),prisma.user.count({where})
  ]);
  res.json(jsonSafe({items:items.map(user=>({...user,roles:user.roles.map(item=>item.role.name)})),total,page:query.page,pageSize:query.pageSize,pages:Math.max(1,Math.ceil(total/query.pageSize))}));
});
api.get("/admin/users/export",adminOnly,async(req,res)=>{
  const query=userDirectoryQuery.parse({...req.query,page:1,pageSize:100});
  const where:Prisma.UserWhereInput={...(query.status?{status:query.status}:{}),...(query.accountType?{accountType:query.accountType}:{}),...(query.search?{OR:[{displayName:{contains:query.search}},{username:{contains:query.search}},{email:{contains:query.search}}]}:{})};
  const users=await prisma.user.findMany({where,take:10_000,orderBy:{createdAt:"desc"},include:{roles:{include:{role:true}},_count:{select:{uploads:true,comments:true}}}});
  const csvCell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
  const lines=[["Name","Username","Email","Phone","Location","Type","Status","Roles","Registered","Last login","Uploads","Comments"].map(csvCell).join(","),
    ...users.map(user=>[user.displayName,user.username,user.email,user.phoneNumber,[user.state,user.country].filter(Boolean).join(", "),user.accountType,user.status,user.roles.map(role=>role.role.name).join("|"),user.createdAt.toISOString(),user.lastLoginAt?.toISOString(),user._count.uploads,user._count.comments].map(csvCell).join(","))];
  res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition",'attachment; filename="tiv-songs-users.csv"');res.send(`\uFEFF${lines.join("\r\n")}`);
});
api.get("/admin/users/:id",adminOnly,async(req,res)=>{
  const id=z.string().parse(req.params.id);
  const user=await prisma.user.findUnique({where:{id},include:{artist:true,roles:{include:{role:true}},_count:{select:{uploads:true,comments:true,communityPosts:true,sessions:true,notifications:true}}}});
  if(!user)return void res.status(404).json({error:"User not found"});
  res.json(jsonSafe({...user,passwordHash:undefined,roles:user.roles.map(item=>item.role.name)}));
});
api.patch("/admin/users/:id",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().parse(req.params.id);
  const input=z.object({displayName:z.string().min(2).max(100).optional(),username:z.string().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/).optional(),email:z.string().email().optional(),phoneNumber:z.string().max(30).nullable().optional(),country:z.string().max(100).nullable().optional(),state:z.string().max(120).nullable().optional(),accountType:z.enum(["individual","artist"]).optional()}).parse(req.body);
  const user=await prisma.user.update({where:{id},data:{...input,email:input.email?.toLowerCase(),username:input.username?.toLowerCase()}});
  await recordAudit(req,"USER_EDIT","user",id,`Updated ${user.email}`,{fields:Object.keys(input)});res.json(jsonSafe(user));
});
api.post("/admin/users/:id/actions",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().parse(req.params.id);
  const input=z.object({action:z.enum(["SUSPEND","UNSUSPEND","BAN","UNBAN","DISABLE","ENABLE","SOFT_DELETE","RESTORE","VERIFY_EMAIL","VERIFY_ARTIST","FORCE_LOGOUT","FORCE_PASSWORD_RESET"]),reason:z.string().max(1000).optional(),durationDays:z.number().int().min(1).max(3650).optional(),contentAction:z.enum(["KEEP","HIDE","ARCHIVE","DELETE","TRANSFER"]).default("KEEP"),targetUserId:z.string().optional()}).parse(req.body);
  const current=await prisma.user.findUnique({where:{id},include:{artist:true}});
  if(!current)return void res.status(404).json({error:"User not found"});
  if(["SUSPEND","BAN","SOFT_DELETE"].includes(input.action)&&!input.reason?.trim())return void res.status(422).json({error:"A reason is required for this action"});
  if(input.contentAction==="DELETE"&&req.admin?.role!=="super_admin")return void res.status(403).json({error:"Only the super administrator may permanently delete user content"});
  if(input.contentAction==="TRANSFER"&&!input.targetUserId)return void res.status(422).json({error:"Choose the account that will receive this content"});
  const now=new Date();const data:Prisma.UserUpdateInput={};
  if(input.action==="SUSPEND")Object.assign(data,{status:"SUSPENDED",suspendedAt:now,suspendedUntil:input.durationDays?new Date(now.getTime()+input.durationDays*86_400_000):null,suspensionReason:input.reason});
  if(input.action==="UNSUSPEND")Object.assign(data,{status:"ACTIVE",suspendedAt:null,suspendedUntil:null,suspensionReason:null});
  if(input.action==="BAN")Object.assign(data,{status:"BANNED",bannedAt:now,banReason:input.reason,bannedBy:req.admin?.email});
  if(input.action==="UNBAN")Object.assign(data,{status:"ACTIVE",bannedAt:null,banReason:null,bannedBy:null});
  if(input.action==="DISABLE")Object.assign(data,{status:"INACTIVE"});
  if(input.action==="ENABLE"||input.action==="RESTORE")Object.assign(data,{status:"ACTIVE",deletedAt:null});
  if(input.action==="SOFT_DELETE")Object.assign(data,{status:"DELETED",deletedAt:now});
  if(input.action==="VERIFY_EMAIL")Object.assign(data,{emailVerifiedAt:now});
  if(input.action==="FORCE_PASSWORD_RESET")Object.assign(data,{forcePasswordReset:true});
  const user=await prisma.user.update({where:{id},data});
  if(input.action==="VERIFY_ARTIST"&&current.artist)await prisma.artist.update({where:{id:current.artist.id},data:{verifiedAt:now}});
  if(["SUSPEND","BAN","DISABLE","SOFT_DELETE","FORCE_LOGOUT","FORCE_PASSWORD_RESET"].includes(input.action))await prisma.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:now}});
  if(current.artist&&["HIDE","ARCHIVE"].includes(input.contentAction)){
    await Promise.all([prisma.song.updateMany({where:{artistId:current.artist.id},data:{status:"ARCHIVED"}}),prisma.video.updateMany({where:{artistId:current.artist.id},data:{status:"ARCHIVED"}}),prisma.communityPost.updateMany({where:{userId:id},data:{status:"ARCHIVED"}})]);
  }
  if(input.contentAction==="TRANSFER"){
    const target=await prisma.user.findUnique({where:{id:input.targetUserId!},include:{artist:true}});
    if(!target?.artist)return void res.status(422).json({error:"The receiving account must have an artist profile"});
    if(current.artist)await Promise.all([prisma.song.updateMany({where:{artistId:current.artist.id},data:{artistId:target.artist.id}}),prisma.video.updateMany({where:{artistId:current.artist.id},data:{artistId:target.artist.id}}),prisma.album.updateMany({where:{artistId:current.artist.id},data:{artistId:target.artist.id}})]);
    await Promise.all([prisma.communityPost.updateMany({where:{userId:id},data:{userId:target.id}}),prisma.upload.updateMany({where:{userId:id},data:{userId:target.id}})]);
  }
  if(input.contentAction==="DELETE"){
    await prisma.$transaction(async transaction=>{
      await transaction.communityPost.deleteMany({where:{userId:id}});await transaction.upload.deleteMany({where:{userId:id}});
      if(current.artist){await transaction.song.deleteMany({where:{artistId:current.artist.id}});await transaction.video.deleteMany({where:{artistId:current.artist.id}});await transaction.album.deleteMany({where:{artistId:current.artist.id}})}
    });
  }
  await notifyUser(id,`ACCOUNT_${input.action}`,"Account update",input.reason||`An administrator performed: ${input.action.replaceAll("_"," ").toLowerCase()}.`,{action:input.action});
  await recordAudit(req,`USER_${input.action}`,"user",id,`${input.action}: ${current.email}`,{reason:input.reason,durationDays:input.durationDays,contentAction:input.contentAction});
  res.json({id:user.id,status:user.status,action:input.action});
});
api.patch("/admin/users/:id/status",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);const {status}=z.object({status:z.enum(["PENDING","ACTIVE","SUSPENDED","BANNED","INACTIVE","DELETED"])}).parse(req.body);const user=await prisma.user.update({where:{id},data:{status}});if(status!=="ACTIVE")await prisma.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});await recordAudit(req,"USER_STATUS","user",id,`${user.email}: ${status}`);res.json({id:user.id,status:user.status})});
api.patch("/admin/users/:id/password",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);const {password}=z.object({password:z.string().min(12).max(100)}).parse(req.body);await prisma.user.update({where:{id},data:{passwordHash:await bcrypt.hash(password,12),forcePasswordReset:true}});await prisma.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});await notifyUser(id,"PASSWORD_RESET","Password reset required","An administrator reset your password. Change it when you next sign in.");await recordAudit(req,"PASSWORD_RESET","user",id,"Administrator reset user password and revoked sessions");res.status(204).end()});
api.patch("/admin/users/:id/roles",adminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().parse(req.params.id);const {roles}=z.object({roles:z.array(z.string().regex(/^[a-z0-9_-]+$/)).max(20)}).parse(req.body);
  await prisma.$transaction(async transaction=>{await transaction.userRole.deleteMany({where:{userId:id}});for(const name of [...new Set(roles)]){const role=await transaction.role.upsert({where:{name},create:{name},update:{}});await transaction.userRole.create({data:{userId:id,roleId:role.id}})}});
  await recordAudit(req,"USER_ROLES","user",id,"Updated user roles",{roles});res.json({roles});
});
api.get("/admin/users/:id/activity",adminOnly,async(req,res)=>{const id=z.string().parse(req.params.id);const [sessions,uploads,history,notifications,logins,warnings,notes,reports]=await Promise.all([prisma.session.findMany({where:{userId:id},orderBy:{createdAt:"desc"},take:50}),prisma.upload.findMany({where:{userId:id},orderBy:{createdAt:"desc"},take:50}),prisma.history.findMany({where:{userId:id},orderBy:{playedAt:"desc"},take:50}),prisma.notification.findMany({where:{userId:id},orderBy:{createdAt:"desc"},take:50}),prisma.loginAttempt.findMany({where:{userId:id},orderBy:{createdAt:"desc"},take:100}),prisma.userWarning.findMany({where:{userId:id},orderBy:{createdAt:"desc"}}),prisma.adminNote.findMany({where:{userId:id},orderBy:{createdAt:"desc"}}),prisma.contentReport.findMany({where:{OR:[{reporterId:id},{targetType:"USER",targetId:id}]},orderBy:{createdAt:"desc"}})]);res.json(jsonSafe({sessions,uploads,history,notifications,logins,warnings,notes,reports}))});
api.post("/admin/users/:id/warnings",adminOnly,async(req:AdminRequest,res)=>{const userId=z.string().parse(req.params.id);const input=z.object({level:z.enum(["NOTICE","WARNING","FINAL"]),reason:z.string().min(3).max(2000)}).parse(req.body);const item=await prisma.userWarning.create({data:{userId,...input,issuedBy:req.admin!.email}});await notifyUser(userId,"ACCOUNT_WARNING",`${input.level.toLowerCase()} from Tiv Songs`,input.reason,{warningId:item.id});await recordAudit(req,"USER_WARNING","user",userId,`${input.level}: ${input.reason}`);res.status(201).json(item)});
api.patch("/admin/users/:id/warnings/:warningId",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.warningId);const item=await prisma.userWarning.update({where:{id},data:{active:false,resolvedAt:new Date()}});await recordAudit(req,"WARNING_RESOLVED","user",item.userId,`Resolved warning ${id}`);res.json(item)});
api.post("/admin/users/:id/notes",adminOnly,async(req:AdminRequest,res)=>{const userId=z.string().parse(req.params.id);const {body}=z.object({body:z.string().min(1).max(5000)}).parse(req.body);const note=await prisma.adminNote.create({data:{userId,body,createdBy:req.admin!.email}});await recordAudit(req,"ADMIN_NOTE","user",userId,"Added a private administrator note");res.status(201).json(note)});
api.delete("/admin/users/:id/notes/:noteId",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.noteId);const note=await prisma.adminNote.delete({where:{id}});await recordAudit(req,"ADMIN_NOTE_DELETE","user",note.userId,"Deleted a private administrator note");res.status(204).end()});
api.get("/admin/reports",adminOnly,async(req,res)=>{const query=pageQuery.parse(req.query);const where=query.status?{status:query.status}:{};const [items,total]=await Promise.all([prisma.contentReport.findMany({where,skip:(query.page-1)*query.pageSize,take:query.pageSize,orderBy:{createdAt:"desc"}}),prisma.contentReport.count({where})]);res.json({items,total,page:query.page})});
api.patch("/admin/reports/:id",adminOnly,async(req:AdminRequest,res)=>{const id=z.string().parse(req.params.id);const input=z.object({status:z.enum(["OPEN","REVIEWING","RESOLVED","DISMISSED"]),assignedTo:z.string().max(200).nullable().optional(),resolution:z.string().max(2000).nullable().optional()}).parse(req.body);const item=await prisma.contentReport.update({where:{id},data:{...input,resolvedAt:["RESOLVED","DISMISSED"].includes(input.status)?new Date():null}});await recordAudit(req,"REPORT_MODERATION","report",id,`Report changed to ${item.status}`);res.json(item)});
api.delete("/admin/users/:id/permanent",superAdminOnly,async(req:AdminRequest,res)=>{
  const id=z.string().parse(req.params.id);const {confirmEmail}=z.object({confirmEmail:z.string().email()}).parse(req.body);
  const user=await prisma.user.findUnique({where:{id},select:{email:true,status:true}});
  if(!user)return void res.status(404).json({error:"User not found"});
  if(user.status!=="DELETED")return void res.status(409).json({error:"Soft-delete the account before permanent deletion"});
  if(user.email.toLowerCase()!==confirmEmail.toLowerCase())return void res.status(422).json({error:"The confirmation email does not match this account"});
  await prisma.$transaction([
    prisma.cmsComment.deleteMany({where:{userId:id}}),prisma.loginAttempt.deleteMany({where:{userId:id}}),
    prisma.userWarning.deleteMany({where:{userId:id}}),prisma.adminNote.deleteMany({where:{userId:id}}),
    prisma.contentReport.deleteMany({where:{OR:[{reporterId:id},{targetType:"USER",targetId:id}]}}),
    prisma.upload.deleteMany({where:{userId:id}}),prisma.payment.deleteMany({where:{userId:id}}),prisma.subscription.deleteMany({where:{userId:id}}),
    prisma.user.delete({where:{id}})
  ]);
  await recordAudit(req,"USER_PERMANENT_DELETE","user",id,`Permanently erased soft-deleted account ${user.email}`,{confirmed:true});
  res.status(204).end();
});

api.get("/admin/backup",superAdminOnly,async(req:AdminRequest,res)=>{
  const [settings,cms,templates,searchRules]=await Promise.all([prisma.setting.findMany(),prisma.cmsEntry.findMany(),prisma.emailTemplate.findMany(),prisma.searchRule.findMany()]);
  await recordAudit(req,"BACKUP","system",undefined,"Exported CMS configuration backup");
  res.setHeader("Content-Disposition",`attachment; filename="tiv-songs-cms-${new Date().toISOString().slice(0,10)}.json"`);res.json(jsonSafe({version:1,createdAt:new Date(),settings,cms,templates,searchRules}));
});
