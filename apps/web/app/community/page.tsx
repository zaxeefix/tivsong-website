"use client";

import Image from "next/image";
import Link from "next/link";
import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import ThemeToggle from "../components/ThemeToggle";
import PublicAccountMenu from "../components/PublicAccountMenu";
import SiteFooter from "../components/SiteFooter";
import CommentSection from "../components/CommentSection";
import PrimaryNavLinks from "../components/PrimaryNavLinks";
import styles from "./community.module.css";

type CommunityPost={id:string;title:string;description:string;country:string;region:string|null;city:string|null;eventDate:string;isUpcoming:boolean;mediaType:string;mediaUrl:string;user:{displayName:string}};
// Keep browser requests same-origin; next.config proxies these to the API.
const apiBase="/api";

export default function CommunityPage(){
  const [items,setItems]=useState<CommunityPost[]>([]);
  const [signedIn,setSignedIn]=useState(false);
  const [progress,setProgress]=useState(0);
  const [stage,setStage]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<"all"|"upcoming"|"activities">("all");
  const [page,setPage]=useState(1);

  const load=useCallback(async()=>{
    try{
      const response=await fetch(`${apiBase}/community?limit=60`);
      if(response.ok)setItems((await response.json()).items||[]);
    }finally{setLoading(false)}
  },[]);

  useEffect(()=>{setSignedIn(Boolean(sessionStorage.getItem("tiv-account-auth")));void load()},[load]);
  useEffect(()=>setPage(1),[query,filter]);
  const filtered=useMemo(()=>items.filter(item=>{
    const matchesType=filter==="all"||(filter==="upcoming"?item.isUpcoming:!item.isUpcoming);
    const text=[item.title,item.description,item.country,item.region,item.city].filter(Boolean).join(" ").toLowerCase();
    return matchesType&&text.includes(query.trim().toLowerCase());
  }),[items,query,filter]);
  const pageSize=6;
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const visible=filtered.slice((page-1)*pageSize,page*pageSize);

  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError("");setMessage("");setProgress(0);
    const form=event.currentTarget;
    const xhr=new XMLHttpRequest();
    xhr.open("POST",`${apiBase}/account/community`);
    xhr.withCredentials=true;
    xhr.timeout=180_000;
    xhr.upload.onprogress=upload=>{if(upload.lengthComputable){setProgress(Math.min(99,Math.round(upload.loaded/upload.total*100)));setStage("Uploading")}};
    xhr.upload.onload=()=>setStage("Compressing media");
    xhr.onload=()=>{
      const body=JSON.parse(xhr.responseText||"null");
      setBusy(false);
      if(xhr.status>=200&&xhr.status<300){setProgress(100);setStage("Complete");setMessage(body.message);form.reset()}
      else setError(body?.error||`Upload failed (${xhr.status})`);
    };
    xhr.onerror=()=>{setBusy(false);setError("Upload connection failed. Please try again.")};
    xhr.ontimeout=()=>{setBusy(false);setError("The upload exceeded three minutes. Choose a smaller file or a faster connection.")};
    xhr.send(new FormData(form));
  };

  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Primary navigation"><Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="Tiv Songs" width={48} height={48}/><span>TIV SONGS</span></Link><div className={styles.links}><PrimaryNavLinks activeClassName={styles.active}/></div><div className={styles.navControls}><ThemeToggle className={styles.theme}/><PublicAccountMenu/></div></nav>
    <header className={styles.hero}><div><span>TIV PEOPLE · WORLDWIDE</span><h1>Our activities.<br/><em>Everywhere.</em></h1><p>Discover Tiv cultural gatherings, celebrations, meetings and upcoming events from Taraba to the USA, Canada, South Africa and every community in between.</p><a href="#share" className={styles.primary}>Share an activity</a></div><aside><strong>{items.length}</strong><span>approved community stories</span></aside></header>
    <section className={styles.content}>
      <div className={styles.sectionHead}><div><span>WORLDWIDE FEED</span><h2>Latest activities and upcoming events</h2></div></div>
      <div className={styles.tools}><label><span className={styles.srOnly}>Search community activities</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by activity, country or city…"/></label><div role="group" aria-label="Filter community activities"><button className={filter==="all"?styles.selected:""} onClick={()=>setFilter("all")}>All</button><button className={filter==="upcoming"?styles.selected:""} onClick={()=>setFilter("upcoming")}>Upcoming</button><button className={filter==="activities"?styles.selected:""} onClick={()=>setFilter("activities")}>Past activities</button></div></div>
      <div className={styles.grid}>{loading?Array.from({length:6},(_,index)=><div className={styles.skeleton} key={index} aria-hidden="true"><i/><b/><span/></div>):visible.map(item=><article className={styles.card} key={item.id}><div className={styles.media}>{item.mediaType==="video"?<video controls preload="metadata" src={item.mediaUrl}/>:<img src={item.mediaUrl} alt={item.title} loading="lazy"/>}<span className={item.isUpcoming?styles.upcoming:styles.activity}>{item.isUpcoming?"Upcoming":"Activity"}</span></div><div className={styles.cardBody}><span className={styles.location}>{[item.city,item.region,item.country].filter(Boolean).join(" · ")}</span><h3>{item.title}</h3><p>{item.description}</p><footer><span>{new Date(item.eventDate).toLocaleDateString()}</span><span>Shared by {item.user.displayName}</span></footer></div></article>)}{!loading&&!visible.length&&<div className={styles.empty}>No approved community activities match this search.</div>}</div>
      {!loading&&filtered.length>pageSize&&<nav className={styles.pagination} aria-label="Community pages"><button disabled={page===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>Previous</button><span>Page {page} of {pages}</span><button disabled={page===pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>Next</button></nav>}
    </section>
    <section className={styles.share} id="share"><div><span>CONTRIBUTE RESPONSIBLY</span><h2>Share what is happening in your Tiv community.</h2><p>Pictures are compressed to WebP and videos are resized and optimized. Every submission is private until an administrator reviews and approves it.</p></div>{signedIn?<form className={styles.form} onSubmit={submit} encType="multipart/form-data"><label>Activity or event title<input name="title" minLength={3} maxLength={160} required/></label><label>Description<textarea name="description" minLength={20} maxLength={4000} rows={5} required/></label><div className={styles.formGrid}><label>Country<input name="country" placeholder="Nigeria, USA, Canada…" required/></label><label>State, province or region<input name="region"/></label><label>City or community<input name="city" placeholder="Jalingo, Toronto, Johannesburg…"/></label><label>Date<input name="eventDate" type="date" required/></label></div><label>Type<select name="isUpcoming" defaultValue="false"><option value="false">Activity that happened</option><option value="true">Upcoming event</option></select></label><label>Picture or video<input name="file" type="file" accept="image/*,video/*" required/></label>{busy&&<div className={styles.progress}><div><span>{stage}</span><strong>{progress}%</strong></div><i><b style={{width:`${progress}%`}}/></i></div>}{error&&<p className={styles.error}>{error}</p>}{message&&<p className={styles.success}>{message}</p>}<button className={styles.primary} disabled={busy}>{busy?`${stage} · ${progress}%`:"Submit for review"}</button></form>:<div className={styles.signIn}><h3>An account protects the community.</h3><p>Sign in or create an account before uploading. Your pending submission is visible only to you and administrators.</p><Link className={styles.primary} href="/account">Go to account</Link></div>}</section>
    <CommentSection targetType="community" targetId="community-page"/>
    <SiteFooter variant="community"/>
  </main>;
}
