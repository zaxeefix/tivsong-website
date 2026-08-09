import {createReadStream} from "node:fs";
import {rm,stat} from "node:fs/promises";
import path from "node:path";
import {DeleteObjectCommand,GetObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {env} from "../config/env.js";

const client=env.STORAGE_PROVIDER==="s3"?new S3Client({endpoint:env.S3_ENDPOINT,region:env.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:env.S3_ACCESS_KEY_ID!,secretAccessKey:env.S3_SECRET_ACCESS_KEY!}}):null;
const safePart=(value:string)=>value.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"media";

export const objectMediaUrl=(key:string)=>`/api/media/object/${key.split("/").map(encodeURIComponent).join("/")}`;

export async function persistFile(filePath:string,folder:string,mimeType:string,removeSource=true){
  const info=await stat(filePath);const key=`${safePart(folder)}/${Date.now()}-${safePart(path.basename(filePath))}`;
  if(!client)return {provider:"local" as const,key:path.basename(filePath),url:`/api/media/${folder}/${path.basename(filePath)}`,size:info.size};
  await client.send(new PutObjectCommand({Bucket:env.S3_BUCKET!,Key:key,Body:createReadStream(filePath),ContentLength:info.size,ContentType:mimeType,CacheControl:"private, max-age=0"}));
  if(removeSource)await rm(filePath,{force:true});return {provider:"s3" as const,key,url:objectMediaUrl(key),size:info.size};
}

export async function getObject(key:string,range?:string){
  if(!client)throw new Error("Object storage is not configured");
  return client.send(new GetObjectCommand({Bucket:env.S3_BUCKET!,Key:key,Range:range}));
}

export async function deleteObject(key:string){if(client)await client.send(new DeleteObjectCommand({Bucket:env.S3_BUCKET!,Key:key}));}
