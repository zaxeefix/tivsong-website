"use client";

import {useState} from "react";
import styles from "./ShareButton.module.css";

type Platform="whatsapp"|"facebook"|"tiktok"|"x"|"telegram"|"email"|"copy"|"native";
const icons:Record<Platform,string>={whatsapp:"M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.2 1.1-1.8 1.2-.5.1-1.2.2-3.8-.9-3.2-1.4-5.2-4.7-5.4-4.9-.2-.2-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.7c.3-.3.6-.4.9-.4h.6c.2 0 .4 0 .6.5l.8 2c.1.3.1.5 0 .7l-.4.6-.6.6c-.2.2-.4.4-.2.7.2.4.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.4.2.6.2.8-.1l1.1-1.3c.3-.3.5-.3.9-.2l2.2 1c.4.2.7.3.8.5.1.2.1.8-.1 1.4Z",facebook:"M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.7.3-1 1-1Z",tiktok:"M15 3c.4 2 1.5 3.2 3.5 3.6v3.1a8 8 0 0 1-3.5-1v6.1a6 6 0 1 1-5.2-6v3.3a2.8 2.8 0 1 0 2 2.7V3h3.2Z",x:"M4 3h4.4l4.2 5.7L17.5 3H20l-6.2 7.3L21 21h-4.4l-4.8-6.5L6.3 21H3.8l6.8-8L4 3Zm3.1 2 10.5 14h1.3L8.4 5H7.1Z",telegram:"m21 3-4 18-6.2-5.6-3.7 3.5.6-6.3L19 5.3 5 10.7 2 9.5 21 3Z",email:"M3 5h18v14H3V5Zm2 2v.5l7 5 7-5V7H5Zm14 10V10l-7 5-7-5v7h14Z",copy:"M8 8h11v12H8V8Zm-3 8H3V4h11v2H5v10Z",native:"M12 16V4m0 0L8 8m4-4 4 4M5 13v7h14v-7"};
function Icon({name}:{name:Platform}){return <svg viewBox="0 0 24 24" fill={["whatsapp","facebook","tiktok","x","telegram"].includes(name)?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={icons[name]}/></svg>}
export default function ShareButton({title,text,url,entityType,entityId}:{title:string;text:string;url:string;entityType:string;entityId:string}){
  const [open,setOpen]=useState(false);const [notice,setNotice]=useState("");
  const permanent=typeof location==="undefined"?url:new URL(url,location.origin).href;const message=`${text}\n\n${permanent}`;
  const track=(platform:Platform)=>void fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:`share_${platform}`,entityType,entityId,metadata:{url:permanent}}),keepalive:true});
  const copy=async(platform:Platform="copy")=>{await navigator.clipboard.writeText(permanent);track(platform);setNotice("Link copied successfully.")};
  const native=async()=>{if(navigator.share){try{await navigator.share({title,text,url:permanent});track("native")}catch{return}}else await copy("native")};
  const openShare=(platform:Platform,href:string)=>{track(platform);window.open(href,"_blank","noopener,noreferrer,width=720,height=620")};
  const encodedUrl=encodeURIComponent(permanent),encodedMessage=encodeURIComponent(message);
  return <><button className={styles.trigger} onClick={()=>setOpen(true)}><Icon name="native"/>Share</button>{open&&<div className={styles.overlay} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="share-title"><header className={styles.head}><div><h2 id="share-title">Share {title}</h2><p>Help more people discover Tiv music and culture.</p></div><button className={styles.close} onClick={()=>setOpen(false)} aria-label="Close share dialog">×</button></header><div className={styles.grid}>
    <button className={styles.option} style={{"--brand":"#25D366"} as React.CSSProperties} onClick={()=>openShare("whatsapp",`https://wa.me/?text=${encodedMessage}`)}><Icon name="whatsapp"/>WhatsApp</button>
    <button className={styles.option} style={{"--brand":"#1877F2"} as React.CSSProperties} onClick={()=>openShare("facebook",`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}><Icon name="facebook"/>Facebook</button>
    <button className={styles.option} style={{"--brand":"#25F4EE"} as React.CSSProperties} onClick={()=>void copy("tiktok")}><Icon name="tiktok"/>TikTok · Copy link</button>
    <button className={styles.option} style={{"--brand":"#fff"} as React.CSSProperties} onClick={()=>openShare("x",`https://x.com/intent/post?text=${encodedMessage}`)}><Icon name="x"/>X (Twitter)</button>
    <button className={styles.option} style={{"--brand":"#28A8EA"} as React.CSSProperties} onClick={()=>openShare("telegram",`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`)}><Icon name="telegram"/>Telegram</button>
    <a className={styles.option} style={{"--brand":"#ffad73"} as React.CSSProperties} onClick={()=>track("email")} href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedMessage}`}><Icon name="email"/>Email</a>
    <button className={styles.option} onClick={()=>void copy()}><Icon name="copy"/>Copy link</button>
    <button className={styles.option} onClick={()=>void native()}><Icon name="native"/>Share with device</button>
  </div>{notice&&<p className={styles.notice} role="status">{notice}</p>}</section></div>}</>;
}
