"use client";

import {useEffect} from "react";

const record=(entityType:string,entityId:string,event:"play"|"download")=>fetch(`/api/content/${entityType}/${encodeURIComponent(entityId)}/engagement`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({event}),keepalive:true}).catch(()=>undefined);

export default function ContentViewTracker({entityType,entityId}:{entityType:string;entityId:string}){
  useEffect(()=>{
    void fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"shared_page_view",entityType,entityId,metadata:{referrer:document.referrer||"direct",source:new URLSearchParams(location.search).get("utm_source")||"direct"}}),keepalive:true});
    if(!["song","video"].includes(entityType))return;
    const media=document.querySelector<HTMLMediaElement>(entityType==="song"?"audio":"video");
    if(!media)return;let sent=false;const played=()=>{if(sent)return;sent=true;void record(entityType,entityId,"play")};media.addEventListener("play",played,{once:true});return()=>media.removeEventListener("play",played);
  },[entityId,entityType]);
  return null;
}

export function TrackedDownloadLink({entityType,entityId,href}:{entityType:"song"|"video";entityId:string;href:string}){
  return <a href={href} download onClick={()=>void record(entityType,entityId,"download")}>Download</a>;
}
