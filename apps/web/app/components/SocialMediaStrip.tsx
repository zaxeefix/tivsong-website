"use client";

import {useEffect,useState} from "react";
import styles from "./SocialMediaStrip.module.css";

type Platform="facebook"|"tiktok"|"youtube"|"audiomack";
type Social={platform:Platform;enabled:boolean;url:string;order:number};
const labels:{[K in Platform]:string}={facebook:"Facebook",tiktok:"TikTok",youtube:"YouTube",audiomack:"Audiomack"};
const fallback:Social[]=(["facebook","tiktok","youtube","audiomack"] as Platform[]).map((platform,order)=>({platform,enabled:true,url:"",order}));

function BrandIcon({platform}:{platform:Platform}){
  const paths={facebook:"M14 8h3V4.5c-.5-.1-2.2-.2-4.1-.2-4 0-6.7 2.4-6.7 6.8V15H2v4h4.2v10h5.1V19h4.2l.7-4h-4.9v-3.5C11.3 10.3 11.7 8 14 8Z",tiktok:"M16.7 2c.3 2.6 1.8 4.1 4.3 4.3v4.2a10 10 0 0 1-4.2-1v7.7A6.8 6.8 0 1 1 11 10.5v4.3a2.6 2.6 0 1 0 1.6 2.4V2h4.1Z",youtube:"M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z",audiomack:"m2 16 2-8 2 8 2.3-12L11 18l2.4-9 2.1 7 2.2-11L22 18h-3l-1-4.2L16.5 20h-2.4L13 16l-1.2 4H9.2L8 13l-1 5H4.5L3.8 15 3 18H1l1-2Z"}[platform];
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={paths}/></svg>;
}

export default function SocialMediaStrip(){
  const [items,setItems]=useState<Social[]>(fallback);
  useEffect(()=>{fetch("/api/cms/settings",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(settings=>{const managed=(settings?.general?.socialMedia||fallback) as Social[],legacy=settings?.general?.socialLinks||{};setItems(managed.map(item=>({...item,url:item.url||legacy[item.platform]||""})).filter(item=>item.enabled).sort((a,b)=>a.order-b.order))}).catch(()=>undefined)},[]);
  return <section className={styles.strip} aria-label="Official Tiv Songs social media"><div><span>FOLLOW TIV SONGS</span><h2>Connect with the official community.</h2></div><nav>{items.map(item=>item.url?<a key={item.platform} className={styles[item.platform]} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Tiv Songs on ${labels[item.platform]}`}><BrandIcon platform={item.platform}/><strong>{labels[item.platform]}</strong></a>:<span key={item.platform} className={`${styles[item.platform]} ${styles.disabled}`} aria-label={`${labels[item.platform]} is not configured`}><BrandIcon platform={item.platform}/><strong>{labels[item.platform]}</strong></span>)}</nav></section>;
}
