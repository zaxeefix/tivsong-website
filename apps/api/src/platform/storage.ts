import {createReadStream} from "node:fs";
import {rm,stat} from "node:fs/promises";
import path from "node:path";
import {AbortMultipartUploadCommand,CompleteMultipartUploadCommand,CreateMultipartUploadCommand,DeleteObjectCommand,GetObjectCommand,HeadObjectCommand,ListObjectsV2Command,ListPartsCommand,PutObjectCommand,S3Client,UploadPartCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
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

export function storageSupportsDirectUpload(){return Boolean(client);}

export async function createSignedUpload(key:string,mimeType:string,size:number){
  if(!client)throw Object.assign(new Error("Direct uploads require S3-compatible storage"),{statusCode:503});
  const command=new PutObjectCommand({Bucket:env.S3_BUCKET!,Key:key,ContentType:mimeType,ContentLength:size,CacheControl:"private, max-age=0"});
  return getSignedUrl(client,command,{expiresIn:15*60});
}

export async function createMultipartUpload(key:string,mimeType:string){
  if(!client)throw Object.assign(new Error("Multipart uploads require S3-compatible storage"),{statusCode:503});
  const result=await client.send(new CreateMultipartUploadCommand({Bucket:env.S3_BUCKET!,Key:key,ContentType:mimeType,CacheControl:"private, max-age=0"}));
  if(!result.UploadId)throw new Error("Object storage did not create an upload session");
  return result.UploadId;
}

export async function createSignedUploadPart(key:string,uploadId:string,partNumber:number){
  if(!client)throw Object.assign(new Error("Multipart uploads require S3-compatible storage"),{statusCode:503});
  return getSignedUrl(client,new UploadPartCommand({Bucket:env.S3_BUCKET!,Key:key,UploadId:uploadId,PartNumber:partNumber}),{expiresIn:15*60});
}

export async function listMultipartParts(key:string,uploadId:string){
  if(!client)throw Object.assign(new Error("Multipart uploads require S3-compatible storage"),{statusCode:503});
  const result=await client.send(new ListPartsCommand({Bucket:env.S3_BUCKET!,Key:key,UploadId:uploadId,MaxParts:10000}));
  return (result.Parts||[]).flatMap(part=>part.PartNumber&&part.ETag?[{partNumber:part.PartNumber,etag:part.ETag,size:Number(part.Size||0)}]:[]);
}

export async function completeMultipartUpload(key:string,uploadId:string,parts:{partNumber:number;etag:string}[]){
  if(!client)throw Object.assign(new Error("Multipart uploads require S3-compatible storage"),{statusCode:503});
  await client.send(new CompleteMultipartUploadCommand({Bucket:env.S3_BUCKET!,Key:key,UploadId:uploadId,MultipartUpload:{Parts:parts.sort((a,b)=>a.partNumber-b.partNumber).map(part=>({PartNumber:part.partNumber,ETag:part.etag}))}}));
}

export async function abortMultipartUpload(key:string,uploadId:string){
  if(client)await client.send(new AbortMultipartUploadCommand({Bucket:env.S3_BUCKET!,Key:key,UploadId:uploadId}));
}

export async function inspectObject(key:string){
  if(!client)throw Object.assign(new Error("Object storage is not configured"),{statusCode:503});
  const object=await client.send(new HeadObjectCommand({Bucket:env.S3_BUCKET!,Key:key}));
  return {size:Number(object.ContentLength||0),mimeType:object.ContentType||"application/octet-stream",metadata:object.Metadata||{}};
}

export async function listObjects(prefix="videos/"){
  if(!client)return {objects:[],truncated:false};
  const result=await client.send(new ListObjectsV2Command({Bucket:env.S3_BUCKET!,Prefix:prefix,MaxKeys:1000}));
  return {objects:(result.Contents||[]).flatMap(item=>item.Key?[{key:item.Key,size:Number(item.Size||0),updatedAt:item.LastModified||null}]:[]),truncated:Boolean(result.IsTruncated)};
}

export async function deleteObject(key:string){if(client)await client.send(new DeleteObjectCommand({Bucket:env.S3_BUCKET!,Key:key}));}
