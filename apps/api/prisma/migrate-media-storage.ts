import path from "node:path";
import {access} from "node:fs/promises";
import {env} from "../src/config/env.js";
import {prisma} from "../src/database/prisma.js";
import {persistFile} from "../src/platform/storage.js";

if(env.STORAGE_PROVIDER!=="s3")throw new Error("Set STORAGE_PROVIDER=s3 and the S3/R2 credentials before migrating media");
const root=path.resolve(process.cwd(),env.UPLOAD_DIR);
const localFile=(url:string|null)=>{if(!url?.startsWith("/api/media/")||url.startsWith("/api/media/object/"))return null;const [,kind,file]=url.match(/^\/api\/media\/(audio|video|community)\/([^/?]+)$/)||[];return kind&&file?{kind,filePath:path.join(root,kind,path.basename(file))}:null};
const migrate=async(url:string|null,mime:string)=>{const local=localFile(url);if(!local)return url;await access(local.filePath);return (await persistFile(local.filePath,local.kind,mime,false)).url};

let changed=0;
for(const song of await prisma.song.findMany({select:{id:true,audioUrl:true,audioMediumUrl:true,audioLowUrl:true}})){
  const [audioUrl,audioMediumUrl,audioLowUrl]=await Promise.all([migrate(song.audioUrl,"audio/mp4"),migrate(song.audioMediumUrl,"audio/mp4"),migrate(song.audioLowUrl,"audio/mp4")]);
  if(audioUrl!==song.audioUrl||audioMediumUrl!==song.audioMediumUrl||audioLowUrl!==song.audioLowUrl){await prisma.song.update({where:{id:song.id},data:{audioUrl,audioMediumUrl,audioLowUrl}});changed++}
}
for(const video of await prisma.video.findMany({select:{id:true,videoUrl:true}})){const videoUrl=await migrate(video.videoUrl,"video/mp4");if(videoUrl!==video.videoUrl){await prisma.video.update({where:{id:video.id},data:{videoUrl}});changed++}}
for(const item of await prisma.communityPost.findMany({select:{id:true,mediaUrl:true,mediaType:true}})){const mediaUrl=await migrate(item.mediaUrl,item.mediaType==="image"?"image/webp":"video/mp4");if(mediaUrl!==item.mediaUrl){await prisma.communityPost.update({where:{id:item.id},data:{mediaUrl:mediaUrl!}});changed++}}
for(const asset of await prisma.mediaAsset.findMany()){const url=await migrate(asset.url,asset.mimeType);if(url!==asset.url&&url){const storageKey=decodeURIComponent(url.slice("/api/media/object/".length));await prisma.mediaAsset.update({where:{id:asset.id},data:{url,storageKey}});changed++}}
await prisma.auditLog.create({data:{actor:"system:storage-migration",role:"system",action:"MIGRATE",entity:"media",summary:`Migrated ${changed} records to durable object storage`}});
console.log(`Migrated ${changed} media records. Existing database rows were preserved.`);
await prisma.$disconnect();
