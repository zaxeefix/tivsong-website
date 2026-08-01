"use client";
import {useEffect} from "react";
export default function ContentViewTracker({entityType,entityId}:{entityType:string;entityId:string}){useEffect(()=>{void fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"shared_page_view",entityType,entityId,metadata:{referrer:document.referrer||"direct",source:new URLSearchParams(location.search).get("utm_source")||"direct"}}),keepalive:true})},[entityId,entityType]);return null}
