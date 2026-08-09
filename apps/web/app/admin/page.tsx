"use client";

import Image from "next/image";
import Link from "next/link";
import {FormEvent, useCallback, useEffect, useState} from "react";
import ThemeToggle from "../components/ThemeToggle";
import CmsPanel from "./CmsPanel";
import UserManagement from "./UserManagement";
import RewardsPanel from "./RewardsPanel";
import styles from "./admin.module.css";

type Artist = {id:string;stageName:string;user:{displayName:string;email:string}};
type Song = {id:string;title:string;description:string|null;status:string;audioUrl:string|null;artist:{stageName:string};category:{name:string}|null};
type Video = {id:string;title:string;description:string|null;status:string;videoUrl:string|null;artist:{stageName:string};category:{name:string}|null};
type CommunityPost={id:string;title:string;description:string;country:string;region:string|null;city:string|null;eventDate:string;isUpcoming:boolean;mediaType:string;mediaUrl:string;status:string;user:{displayName:string;email:string}};
type King = {id:string;ordinal:number;name:string;reignStart:string;reignEnd:string|null};
type Category={id:string;name:string;slug:string};
type Account = {id:string;email:string;username:string;displayName:string;status:string;createdAt:string;roles:string[];artist:{stageName:string;bio:string|null;verifiedAt:string|null}|null};
type Overview = {artists:number;songs:number;publishedSongs:number;kings:number;users:number};
type Donation = {enabled:boolean;bankName:string;accountName:string;accountNumber:string;paymentLink:string;message:string};
type Tab = "accounts" | "songs" | "categories" | "community" | "artists" | "heritage" | "donation" | "rewards" | "settings" | "hero" | "news" | "pages" | "comments" | "media" | "analytics" | "audit" | "search" | "email" | "backup";
type ApiStatus="connecting"|"checking"|"connected"|"unavailable";
const tabDetails:Record<Tab,{label:string;description:string}>={
  accounts:{label:"Accounts",description:"Approvals and access"},
  songs:{label:"Songs",description:"Audio and video review"},
  categories:{label:"Categories",description:"Music and video taxonomy"},
  community:{label:"Community",description:"Activities and events"},
  artists:{label:"Artists",description:"Profiles and contributors"},
  heritage:{label:"Heritage",description:"Tor Tiv records"},
  donation:{label:"Donation",description:"Campaign settings"},
  rewards:{label:"Rewards",description:"Rankings, winners and certificates"},
  settings:{label:"Website Settings",description:"Brand, appearance and system"},
  hero:{label:"Hero Slides",description:"Homepage banners and order"},
  news:{label:"News",description:"Publishing and scheduling"},
  pages:{label:"Pages & Content",description:"FAQs, policies and sections"},
  comments:{label:"Comments",description:"Moderation and reports"},
  media:{label:"Media Library",description:"Images, audio and video"},
  analytics:{label:"Analytics",description:"Traffic and content activity"},
  audit:{label:"Audit Logs",description:"Administrator activity"},
  search:{label:"Search",description:"Keywords and suggestions"},
  email:{label:"Email Templates",description:"Transactional messages"},
  backup:{label:"Backup & Export",description:"Download CMS data"}
};

const api = async <T,>(path:string, options:RequestInit = {}):Promise<T> => {
  let response:Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials:"include",
      headers: {"Content-Type":"application/json", ...options.headers}
    });
  } catch {
    throw new Error("Unable to connect. Check the API service and try again.");
  }
  if(response.status===401&&!["/admin/login","/admin/refresh"].includes(path)&&!(options.headers as Record<string,string>|undefined)?.["X-Session-Retry"]){
    const refreshed=await fetch("/api/admin/refresh",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"}}).catch(()=>null);
    if(refreshed?.ok)return api<T>(path,{...options,headers:{...options.headers,"X-Session-Retry":"1"}});
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {error?:string}|null;
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error("Unable to connect. The API service did not respond.");
    }
    throw new Error(body?.error || `Admin request failed (${response.status}).`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
};

export default function AdminPage(){
  const [authenticated,setAuthenticated]=useState(false);
  const [signingIn,setSigningIn]=useState(false);
  const [tab,setTab]=useState<Tab>("songs");
  const [overview,setOverview]=useState<Overview|null>(null);
  const [artists,setArtists]=useState<Artist[]>([]);
  const [songs,setSongs]=useState<Song[]>([]);
  const [videos,setVideos]=useState<Video[]>([]);
  const [community,setCommunity]=useState<CommunityPost[]>([]);
  const [kings,setKings]=useState<King[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [adminRole,setAdminRole]=useState("");
  const [apiStatus,setApiStatus]=useState<ApiStatus>("connecting");
  const [donation,setDonation]=useState<Donation>({enabled:true,bankName:"",accountName:"",accountNumber:"",paymentLink:"",message:"Support the preservation of Tiv music and culture."});

  const load = useCallback(async()=>{
    try{
      const [summary,artistItems,songItems,videoItems,kingItems,accountItems,communityItems,categoryItems]=await Promise.all([
        api<Overview>("/admin/overview"),
        api<Artist[]>("/admin/artists"),
        api<Song[]>("/admin/songs"),
        api<Video[]>("/admin/videos"),
        api<King[]>("/admin/tor-tiv"),
        api<Account[]>("/admin/accounts"),
        api<CommunityPost[]>("/admin/community"),
        api<Category[]>("/categories")
      ]);
      const role=sessionStorage.getItem("tiv-admin-role")||"admin";
      if(role==="super_admin")setDonation(await api<Donation>("/admin/donation"));
      setAdminRole(role);setOverview(summary);setArtists(artistItems);setSongs(songItems);setVideos(videoItems);setKings(kingItems);setAccounts(accountItems);setCommunity(communityItems);setCategories(categoryItems);setAuthenticated(true);setError("");
    }catch(reason){
      setError(reason instanceof Error ? reason.message : "Unable to load admin");
      if ((reason as Error).message.includes("session")) {sessionStorage.removeItem("tiv-admin-auth");setAuthenticated(false);}
    }
  },[]);

  const checkApi=useCallback(async()=>{
    setApiStatus("checking");
    try{
      const response=await fetch("/api/health",{cache:"no-store",credentials:"include"});
      if(!response.ok)throw new Error();
      setApiStatus("connected");
      setError("");
      if(sessionStorage.getItem("tiv-admin-auth"))void load();
    }catch{
      setApiStatus("unavailable");
    }
  },[load]);

  useEffect(()=>{void checkApi()},[checkApi]);

  const login=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError("");setSigningIn(true);
    const data=new FormData(event.currentTarget);
    try{
      const result=await api<{admin:{role:string}}>("/admin/login",{method:"POST",body:JSON.stringify({email:data.get("email"),password:data.get("password"),remember:data.get("remember")==="on"})});
      sessionStorage.setItem("tiv-admin-auth","1");sessionStorage.setItem("tiv-admin-role",result.admin.role);setAdminRole(result.admin.role);setAuthenticated(true);await load();
    }catch(reason){setError(reason instanceof Error?reason.message:"Login failed");}
    finally{setSigningIn(false);}
  };

  const submit=async(event:FormEvent<HTMLFormElement>,path:string)=>{
    event.preventDefault();setError("");setMessage("");
    const form=event.currentTarget;const payload=Object.fromEntries(new FormData(form));
    try{await api(path,{method:"POST",body:JSON.stringify(payload)});form.reset();setMessage("Saved successfully.");await load();}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to save");}
  };

  const remove=async(path:string)=>{
    if(!window.confirm("Delete this item permanently?")) return;
    try{await api(path,{method:"DELETE"});setMessage("Deleted.");await load();}catch(reason){setError(reason instanceof Error?reason.message:"Unable to delete");}
  };

  const moderateAccount=async(id:string,decision:"approve"|"reject")=>{
    setError("");setMessage("");
    try{await api(`/admin/accounts/${id}/${decision}`,{method:"PATCH"});setMessage(`Account ${decision==="approve"?"approved":"rejected"}.`);await load()}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to update account")}
  };

  const saveDonation=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError("");setMessage("");
    const data=new FormData(event.currentTarget);
    const value={enabled:data.get("enabled")==="on",bankName:String(data.get("bankName")||""),accountName:String(data.get("accountName")||""),accountNumber:String(data.get("accountNumber")||""),paymentLink:String(data.get("paymentLink")||""),message:String(data.get("message")||"")};
    try{await api("/admin/donation",{method:"PUT",body:JSON.stringify(value)});setDonation(value);setMessage("Donation details published safely.");}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to save donation details")}
  };

  if(!authenticated)return <main className={styles.shell}><section className={styles.login}>
    <div className={styles.loginTop}><div className={styles.brand}><Image className={styles.logo} src="/assets/tiv-song-logo.jpeg" alt="Tiv Songs" width={52} height={52}/><div><h1 className={styles.title}>Admin access</h1><span className={styles.muted}>Tiv Songs control room</span></div></div><ThemeToggle className={styles.themeToggle}/></div>
    <p className={styles.muted}>Sign in with the administrator details configured on the API server.</p>
    <div className={`${styles.connection} ${styles[apiStatus]}`} role="status" aria-live="polite"><span aria-hidden="true"/><strong>{apiStatus==="connecting"?"Connecting…":apiStatus==="checking"?"Checking API…":apiStatus==="connected"?"Connected":"Unable to connect."}</strong>{apiStatus==="unavailable"&&<button type="button" onClick={checkApi}>Retry</button>}</div>
    {error&&<p className={styles.error}>{error}</p>}
    <form className={styles.form} method="post" onSubmit={login}><label>Email<input name="email" type="email" autoComplete="username" defaultValue="admin@tivsongs.local" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><label className={styles.remember}><input name="remember" type="checkbox"/> Remember login on this device</label><button type="submit" className={`${styles.button} ${styles.primary}`} disabled={signingIn||apiStatus!=="connected"}>{signingIn?"Signing in…":apiStatus==="connected"?"Sign in":"Waiting for API"}</button></form>
  </section></main>;

  return <main className={styles.shell}><div className={styles.wrap}>
    <header className={styles.header}><div className={styles.brand}><Image className={styles.logo} src="/assets/tiv-song-logo.jpeg" alt="" width={52} height={52}/><div><h1 className={styles.title}>Tiv Songs Admin</h1><span className={styles.muted}>Content and heritage management</span></div></div><div className={styles.rowActions}><ThemeToggle className={styles.themeToggle}/><Link className={styles.button} href="/">View website</Link><button className={styles.button} onClick={async()=>{await api("/admin/logout",{method:"POST"});sessionStorage.removeItem("tiv-admin-auth");sessionStorage.removeItem("tiv-admin-role");setAuthenticated(false)}}>Log out</button></div></header>
    {overview&&<section className={styles.stats}>{Object.entries(overview).map(([label,value])=><div className={styles.stat} key={label}><strong>{value}</strong><span className={styles.muted}>{label.replace(/([A-Z])/g," $1")}</span></div>)}</section>}
    <div className={styles.workspace}>
    <nav className={styles.tabs} aria-label="Admin sections">{(["settings","hero","news","pages","accounts","songs","categories","community","artists","heritage","rewards","comments","media","analytics","audit","search","email","backup",...(adminRole==="super_admin"?["donation" as const]:[])] as Tab[]).map(item=><button key={item} type="button" onClick={()=>setTab(item)} aria-current={tab===item?"page":undefined} aria-controls={`admin-panel-${item}`} className={`${styles.button} ${tab===item?styles.active:""}`}><span>{tabDetails[item].label}</span><small>{tabDetails[item].description}</small></button>)}</nav>
    <div className={styles.content} id={`admin-panel-${tab}`}>
    {error&&<p className={styles.error}>{error}</p>}{message&&<p className={styles.success}>{message}</p>}
    {tab==="accounts"&&<section className={styles.panel}><UserManagement isSuperAdmin={adminRole==="super_admin"}/></section>}
    {tab==="rewards"&&<section className={styles.panel}><RewardsPanel/></section>}
    {tab==="categories"&&<section className={`${styles.panel} ${styles.columns}`}><form className={styles.form} onSubmit={event=>submit(event,"/admin/categories")}><h2>Add category</h2><label>Name<input name="name" required minLength={2}/></label><label>Slug<input name="slug" required pattern="[a-z0-9-]+" placeholder="traditional-songs"/></label><button className={`${styles.button} ${styles.primary}`}>Create category</button></form><div className={styles.list}>{categories.map(category=><article className={styles.row} key={category.id}><div><h3>{category.name}</h3><p>{category.slug}</p></div><button className={`${styles.button} ${styles.danger}`} onClick={()=>remove(`/admin/categories/${category.id}`)}>Delete</button></article>)}{!categories.length&&<div className={styles.empty}>No categories configured.</div>}</div></section>}
    {tab==="artists"&&<section className={`${styles.panel} ${styles.columns}`}><form className={styles.form} onSubmit={event=>submit(event,"/admin/artists")}><h2>Add artist</h2><label>Account email<input name="email" type="email" required/></label><label>Username<input name="username" required/></label><label>Display name<input name="displayName" required/></label><label>Stage name<input name="stageName" required/></label><label>Biography<textarea name="bio"/></label><label>Image URL<input name="imageUrl" type="url"/></label><button className={`${styles.button} ${styles.primary}`}>Create artist</button></form><div className={styles.list}>{artists.length?artists.map(artist=><article className={styles.row} key={artist.id}><div><h3>{artist.stageName}</h3><p>{artist.user.displayName} · {artist.user.email}</p></div></article>):<div className={styles.empty}>No artists yet.</div>}</div></section>}
    {tab==="songs"&&<section className={styles.panel}><div className={styles.panelHead}><div><h2>Audio and video review</h2><p className={styles.muted}>Play each submission completely, check language and ownership, then publish or reject it.</p></div></div><div className={styles.list}>{songs.map(song=><article className={`${styles.row} ${styles.mediaRow}`} key={song.id}><div><h3>{song.title}</h3><p>Audio · {song.artist.stageName} · {song.category?.name||"Uncategorized"}</p><p className={styles.reviewDescription}>{song.description||"No description was provided."}</p>{song.audioUrl?<audio className={styles.audioPlayer} controls preload="none" src={song.audioUrl}/>:<p>No playable file attached.</p>}</div><div className={styles.rowActions}><span className={styles.status}>{song.status}</span>{song.status!=="PUBLISHED"&&<button className={`${styles.button} ${styles.primary}`} onClick={()=>api(`/admin/songs/${song.id}/status`,{method:"PATCH",body:JSON.stringify({status:"PUBLISHED"})}).then(load)}>Approve &amp; publish</button>}{song.status!=="REJECTED"&&<button className={styles.button} onClick={()=>api(`/admin/songs/${song.id}/status`,{method:"PATCH",body:JSON.stringify({status:"REJECTED"})}).then(load)}>Reject</button>}<button className={`${styles.button} ${styles.danger}`} onClick={()=>remove(`/admin/songs/${song.id}`)}>Delete</button></div></article>)}{videos.map(video=><article className={`${styles.row} ${styles.mediaRow}`} key={video.id}><div><h3>{video.title}</h3><p>Video · {video.artist.stageName} · {video.category?.name||"Uncategorized"}</p><p className={styles.reviewDescription}>{video.description||"No description was provided."}</p>{video.videoUrl?<video className={styles.videoPlayer} controls preload="metadata" src={video.videoUrl}/>:<p>No playable file attached.</p>}</div><div className={styles.rowActions}><span className={styles.status}>{video.status}</span>{video.status!=="PUBLISHED"&&<button className={`${styles.button} ${styles.primary}`} onClick={()=>api(`/admin/videos/${video.id}/status`,{method:"PATCH",body:JSON.stringify({status:"PUBLISHED"})}).then(load)}>Approve &amp; publish</button>}{video.status!=="REJECTED"&&<button className={styles.button} onClick={()=>api(`/admin/videos/${video.id}/status`,{method:"PATCH",body:JSON.stringify({status:"REJECTED"})}).then(load)}>Reject</button>}<button className={`${styles.button} ${styles.danger}`} onClick={()=>remove(`/admin/videos/${video.id}`)}>Delete</button></div></article>)}{!songs.length&&!videos.length&&<div className={styles.empty}>No media submissions yet.</div>}</div></section>}
    {tab==="heritage"&&<section className={`${styles.panel} ${styles.columns}`}><form className={styles.form} onSubmit={event=>submit(event,"/admin/tor-tiv")}><h2>Add Tor Tiv</h2><label>Ordinal<input name="ordinal" type="number" min="1" required/></label><label>Name<input name="name" required/></label><label>Reign began<input name="reignStart" type="date" required/></label><label>Reign ended<input name="reignEnd" type="date"/></label><label>Portrait URL<input name="portraitUrl" type="url"/></label><label>Biography<textarea name="biography" required/></label><label>Source URL<input name="sourceUrl" type="url"/></label><button className={`${styles.button} ${styles.primary}`}>Add ruler</button></form><div className={styles.list}>{kings.length?kings.map(king=><article className={styles.row} key={king.id}><div><h3>Tor Tiv {king.ordinal}: {king.name}</h3><p>{new Date(king.reignStart).getFullYear()} – {king.reignEnd?new Date(king.reignEnd).getFullYear():"Present"}</p></div><button className={`${styles.button} ${styles.danger}`} onClick={()=>remove(`/admin/tor-tiv/${king.id}`)}>Delete</button></article>):<div className={styles.empty}>No heritage records yet.</div>}</div></section>}
    {tab==="donation"&&adminRole==="super_admin"&&<section className={styles.panel}><div className={styles.panelHead}><div><h2>Donation campaign</h2><p className={styles.muted}>Only this super-admin session can change the public donation details.</p></div></div><form className={styles.form} onSubmit={saveDonation}><label><input name="enabled" type="checkbox" defaultChecked={donation.enabled}/> Show the donation button publicly</label><label>Bank name<input name="bankName" defaultValue={donation.bankName}/></label><label>Account name<input name="accountName" defaultValue={donation.accountName}/></label><label>Account number<input name="accountNumber" defaultValue={donation.accountNumber}/></label><label>Secure payment link<input name="paymentLink" type="url" defaultValue={donation.paymentLink}/></label><label>Public message<textarea name="message" defaultValue={donation.message}/></label><button className={`${styles.button} ${styles.primary}`}>Save donation details</button></form></section>}
    {tab==="community"&&<section className={styles.panel}><div className={styles.panelHead}><div><h2>Worldwide community activities</h2><p className={styles.muted}>Review the media, event details and location before publishing.</p></div></div><div className={styles.list}>{community.length?community.map(item=><article className={`${styles.row} ${styles.mediaRow}`} key={item.id}><div><h3>{item.title}</h3><p>{item.isUpcoming?"Upcoming event":"Community activity"} · {[item.city,item.region,item.country].filter(Boolean).join(", ")} · {new Date(item.eventDate).toLocaleDateString()}</p><p>{item.user.displayName} · {item.user.email}</p><p className={styles.reviewDescription}>{item.description}</p>{item.mediaType==="video"?<video className={styles.videoPlayer} controls preload="metadata" src={item.mediaUrl}/>:<img className={styles.communityImage} src={item.mediaUrl} alt={item.title}/>}</div><div className={styles.rowActions}><span className={styles.status}>{item.status}</span>{item.status!=="PUBLISHED"&&<button className={`${styles.button} ${styles.primary}`} onClick={()=>api(`/admin/community/${item.id}/status`,{method:"PATCH",body:JSON.stringify({status:"PUBLISHED"})}).then(load)}>Approve &amp; publish</button>}{item.status!=="REJECTED"&&<button className={styles.button} onClick={()=>api(`/admin/community/${item.id}/status`,{method:"PATCH",body:JSON.stringify({status:"REJECTED"})}).then(load)}>Reject</button>}<button className={`${styles.button} ${styles.danger}`} onClick={()=>remove(`/admin/community/${item.id}`)}>Delete</button></div></article>):<div className={styles.empty}>No community submissions yet.</div>}</div></section>}
    {(["settings","hero","news","pages","comments","media","analytics","audit","search","email","backup"] as Tab[]).includes(tab)&&<CmsPanel module={tab as "settings"|"hero"|"news"|"pages"|"comments"|"media"|"analytics"|"audit"|"search"|"email"|"backup"} isSuperAdmin={adminRole==="super_admin"}/>}
    </div>
    </div>
  </div></main>;
}
