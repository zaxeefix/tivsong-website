"use client";

import Image from "next/image";
import Link from "next/link";
import {FormEvent,useCallback,useEffect,useState} from "react";
import ThemeToggle from "../components/ThemeToggle";
import SiteFooter from "../components/SiteFooter";
import PrimaryNavLinks from "../components/PrimaryNavLinks";
import LocationFields from "./LocationFields";
import styles from "./account.module.css";

type Account={id:string;email:string;username:string;displayName:string;accountType:"individual"|"artist";status:string;roles:string[];contributorRank?:string;_count?:{contributedSongs:number;contributedVideos:number;followers:number;following:number;referrals:number};artist:{stageName:string;verifiedAt:string|null}|null};
type Referral={link:string;clicks:number;registrations:number;successful:number;score:number};
type Category={id:string;name:string;slug:string};
type Song={id:string;title:string;status:string;createdAt:string;audioUrl:string|null;category?:Category|null};
type Video={id:string;title:string;status:string;createdAt:string;videoUrl:string|null;category?:Category|null};
type View="login"|"register"|"dashboard";
const isRegisterView=(value:View):boolean=>value==="register";
// Browser traffic always uses the same-origin Next.js proxy. This keeps
// HttpOnly cookies first-party and remains compatible with the CSP.
const apiBase="/api";
const maximumMediaBytes=1024*1024*1024;

async function request<T>(path:string,options:RequestInit={}):Promise<T>{
  const isForm=options.body instanceof FormData;
  let response:Response;
  try{response=await fetch(`${apiBase}${path}`,{...options,credentials:"include",headers:{...(!isForm?{"Content-Type":"application/json"}:{}),...options.headers}})}
  catch{throw new Error("Cannot connect to the API server. Please try again shortly.")}
  const body=await response.json().catch(()=>null);
  if(response.status===401&&!["/account/login","/account/refresh"].includes(path)&&!(options.headers as Record<string,string>|undefined)?.["X-Session-Retry"]){
    const refreshed=await fetch(`${apiBase}/account/refresh`,{method:"POST",credentials:"include"}).catch(()=>null);
    if(refreshed?.ok)return request<T>(path,{...options,headers:{...options.headers,"X-Session-Retry":"1"}});
  }
  if(!response.ok){
    const fieldErrors=body?.details?.fieldErrors as Record<string,string[]>|undefined;
    const fieldIssue=fieldErrors&&Object.entries(fieldErrors).find(([,messages])=>messages?.length);
    const message=fieldIssue?`${fieldIssue[0]}: ${fieldIssue[1][0]}`:body?.error;
    throw new Error(message||`Request failed (${response.status})`);
  }
  return body;
}

function uploadWithProgress<T>(data:FormData,onProgress:(percent:number,stage:string)=>void):Promise<T>{
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open("POST",`${apiBase}/account/media`);
    xhr.withCredentials=true;
    xhr.timeout=95*60_000;
    xhr.upload.onprogress=event=>{
      if(event.lengthComputable)onProgress(Math.min(99,Math.round((event.loaded/event.total)*100)),"Uploading file");
    };
    xhr.upload.onload=()=>onProgress(99,"Optimizing media");
    xhr.onload=()=>{
      let body:null|{error?:string}=null;try{body=JSON.parse(xhr.responseText||"null")}catch{body=null}
      if(xhr.status>=200&&xhr.status<300){onProgress(100,"Complete");resolve(body as T)}
      else reject(new Error(body?.error||`Upload failed (${xhr.status})`));
    };
    xhr.onerror=()=>reject(new Error("Upload connection failed. Check your internet connection and try again."));
    xhr.ontimeout=()=>reject(new Error("The upload exceeded 95 minutes. Check the Render logs and try again."));
    xhr.send(data);
  });
}

export default function AccountPage(){
  const [view,setView]=useState<View>("login");
  const [account,setAccount]=useState<Account|null>(null);
  const [songs,setSongs]=useState<Song[]>([]);
  const [videos,setVideos]=useState<Video[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [mediaKind,setMediaKind]=useState<"audio"|"video">("audio");
  const [accountType,setAccountType]=useState<"individual"|"artist">("individual");
  const [busy,setBusy]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(0);
  const [uploadStage,setUploadStage]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [referrals,setReferrals]=useState<Referral|null>(null);

  const load=useCallback(async()=>{
    try{
      const [me,items,videoItems,categoryItems]=await Promise.all([request<Account>("/account/me"),request<Song[]>("/account/songs"),request<Video[]>("/account/videos"),request<Category[]>("/categories")]);
      setAccount(me);setSongs(items);setVideos(videoItems);setCategories(categoryItems);setView("dashboard");setError("");request<Referral>("/account/referrals").then(setReferrals).catch(()=>undefined);
    }catch(reason){
      sessionStorage.removeItem("tiv-account-auth");
      setError(reason instanceof Error?reason.message:"Unable to load account");
      setView("login");
    }
  },[]);

  useEffect(()=>{const query=new URLSearchParams(window.location.search),ref=query.get("ref");if(ref){sessionStorage.setItem("tiv-referral",ref);void fetch(`/api/referrals/${encodeURIComponent(ref)}/click`,{method:"POST"})}if(sessionStorage.getItem("tiv-account-auth"))void load();else if(query.get("mode")==="register")setView("register")},[load]);

  const submit=async(event:FormEvent<HTMLFormElement>,kind:"login"|"register"|"media")=>{
    event.preventDefault();setBusy(true);setError("");setMessage("");setUploadProgress(0);setUploadStage("");
    const form=event.currentTarget;
    const payload=Object.fromEntries(new FormData(form));
    try{
      if(kind==="login"){
        await request("/account/login",{method:"POST",body:JSON.stringify({...payload,remember:payload.remember==="on"})});
        sessionStorage.setItem("tiv-account-auth","1");await load();
      }else if(kind==="register"){
        const socialLinks=Object.fromEntries([["facebook",payload.facebook],["youtube",payload.youtube],["tiktok",payload.tiktok],["audiomack",payload.audiomack]].filter(([,value])=>value));const supportingDocuments=String(payload.supportingDocuments||"").split(",").map(value=>value.trim()).filter(Boolean);const registrationData=new FormData(form);
        registrationData.set("accountType",accountType);registrationData.set("socialLinks",JSON.stringify(socialLinks));registrationData.set("supportingDocuments",JSON.stringify(supportingDocuments));const referral=sessionStorage.getItem("tiv-referral");if(referral)registrationData.set("referral",referral);
        const result=await request<{message:string}>("/account/register",{method:"POST",body:registrationData});sessionStorage.removeItem("tiv-referral");
        form.reset();setMessage(result.message);setView("login");
      }else{
        const mediaData=new FormData(form);
        const file=mediaData.get("file");
        if(!(file instanceof File)||file.size===0)throw new Error("Choose an audio or video file");
        if(file.size>maximumMediaBytes)throw new Error("The maximum audio or video file size is 1 GB");
        mediaData.set("kind",mediaKind);
        const result=await uploadWithProgress<{message:string}>(mediaData,(percent,stage)=>{setUploadProgress(percent);setUploadStage(stage)});
        form.reset();setMessage(result.message);await load();
      }
    }catch(reason){setError(reason instanceof Error?reason.message:"Request failed")}
    finally{setBusy(false)}
  };

  const logout=async()=>{await request("/account/logout",{method:"POST"});sessionStorage.removeItem("tiv-account-auth");setAccount(null);setSongs([]);setVideos([]);setView("login")};

  if(isRegisterView(view))return <main className={styles.page}>
    <nav className={styles.nav}><Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="" width={48} height={48}/>TIV SONGS</Link><div className={styles.navActions}><PrimaryNavLinks linkClassName={styles.navLink} activeClassName={styles.activeNav}/><ThemeToggle className={styles.theme}/></div></nav>
    <section className={styles.shell}><div className={styles.intro}><span>JOIN TIV SONGS</span><h1>Create the right account.</h1><p>Member accounts are for listening and community participation. Artist accounts create a professional profile and require administrator approval before uploading music.</p><div className={styles.promises}><div><strong>Accurate</strong><small>Contact and location information helps protect your account.</small></div><div><strong>Private</strong><small>Your phone and account details are not displayed publicly.</small></div><div><strong>Verified</strong><small>Artist applications are reviewed before publication.</small></div></div></div>
      <section className={styles.card}><div className={styles.cardHead}><div><span>CREATE ACCOUNT</span><h2>{accountType==="artist"?"Artist application":"Member registration"}</h2></div><button className={styles.textButton} onClick={()=>{setView("login");setError("");setMessage("")}}>Sign in</button></div>{error&&<p className={styles.error}>{error}</p>}{message&&<p className={styles.success}>{message}</p>}
        <div className={styles.accountTypes}><button type="button" className={accountType==="individual"?styles.selected:""} onClick={()=>setAccountType("individual")}><strong>Individual</strong><small>Listen, follow and join discussions</small></button><button type="button" className={accountType==="artist"?styles.selected:""} onClick={()=>setAccountType("artist")}><strong>Artist</strong><small>Apply for a professional artist profile</small></button></div>
        <form className={`${styles.form} ${styles.formGrid}`} onSubmit={event=>submit(event,"register")}>
          <label>Full name<input name="displayName" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_]+"/></label>
          <label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Phone number<input name="phoneNumber" type="tel" autoComplete="tel" required minLength={7} maxLength={30}/></label>
          <LocationFields/><label>Profile photo<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required/><small>Choose a clear JPG, PNG or WebP image from your phone or computer (maximum 5 MB).</small></label>
          <label className={styles.full}>Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={100} required/></label>
          {accountType==="artist"&&<><label>Stage name<input name="stageName" required minLength={2} maxLength={100}/></label><label>Genre<input name="genre" maxLength={100}/></label><label>Cover image URL<input name="coverImageUrl" type="url"/></label><label>Identity document URL<input name="identityDocumentUrl" type="url"/></label><label className={styles.full}>Professional biography<textarea name="bio" rows={5} maxLength={2000} required/></label><label>Facebook<input name="facebook" type="url"/></label><label>YouTube<input name="youtube" type="url"/></label><label>TikTok<input name="tiktok" type="url"/></label><label>Audiomack<input name="audiomack" type="url"/></label><label className={styles.full}>Supporting document URLs<textarea name="supportingDocuments" rows={3} placeholder="Separate multiple secure URLs with commas"/></label><p className={`${styles.notice} ${styles.full}`}>Your application will appear in the administrator&apos;s artist approval queue. Upload tools unlock only after approval.</p></>}
          <button className={`${styles.primary} ${styles.full}`} disabled={busy}>{busy?"Creating account…":accountType==="artist"?"Submit artist application":"Create member account"}</button>
        </form>
      </section>
    </section><SiteFooter variant="account"/>
  </main>;

  return <main className={styles.page}>
    <nav className={styles.nav}><Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="" width={48} height={48}/>TIV SONGS</Link><div className={styles.navActions}><PrimaryNavLinks linkClassName={styles.navLink} activeClassName={styles.activeNav}/><ThemeToggle className={styles.theme}/>{view==="dashboard"&&<button className={styles.navLink} onClick={logout}>Log out</button>}</div></nav>
    <section className={styles.shell}>
      {view!=="dashboard"&&<div className={styles.intro}><span>CONTRIBUTOR ACCOUNTS</span><h1>Share Tiv music responsibly.</h1><p>Create a private workspace, submit music for review and follow its approval status. Your drafts and activity are never visible to another contributor.</p><div className={styles.promises}><div><strong>Private</strong><small>Only you and administrators see pending work.</small></div><div><strong>Reviewed</strong><small>Music appears publicly only after approval.</small></div><div><strong>Professional</strong><small>Artists receive a verified profile after review.</small></div></div></div>}

      {view==="login"&&<section className={styles.card}><div className={styles.cardHead}><div><span>WELCOME BACK</span><h2>Sign in</h2></div><button className={styles.textButton} onClick={()=>{setView("register");setError("");setMessage("")}}>Create account</button></div>{error&&<p className={styles.error}>{error}</p>}{message&&<p className={styles.success}>{message}</p>}<form className={styles.form} onSubmit={event=>submit(event,"login")}><label>Username or email<input name="identifier" type="text" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required/></label><label className={styles.remember}><input name="remember" type="checkbox"/> Remember login on this device</label><button className={styles.primary} disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></section>}

      {view==="register"&&<section className={styles.card}><div className={styles.cardHead}><div><span>JOIN THE ARCHIVE</span><h2>Create account</h2></div><button className={styles.textButton} onClick={()=>{setView("login");setError("");setMessage("")}}>Sign in</button></div>{error&&<p className={styles.error}>{error}</p>}<div className={styles.accountTypes}><button className={accountType==="individual"?styles.selected:""} onClick={()=>setAccountType("individual")}><strong>Individual</strong><small>Submit music under your name</small></button><button className={accountType==="artist"?styles.selected:""} onClick={()=>setAccountType("artist")}><strong>Artist</strong><small>Apply for a verified artist profile</small></button></div><form className={`${styles.form} ${styles.formGrid}`} onSubmit={event=>submit(event,"register")}><label>Full name<input name="displayName" required minLength={2}/></label><label>Username<input name="username" required minLength={3} pattern="[A-Za-z0-9_]+"/></label><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label>{accountType==="artist"&&<><label>Stage name<input name="stageName" required minLength={2}/></label><label className={styles.full}>Professional biography<textarea name="bio" rows={4} placeholder="Experience, releases, performances and cultural contribution" required/></label><p className={`${styles.notice} ${styles.full}`}>Artist registrations require administrator review before music can be submitted.</p></>}<button className={`${styles.primary} ${styles.full}`} disabled={busy}>{busy?"Creating account…":"Create account"}</button></form></section>}

      {view==="dashboard"&&account&&<div className={styles.dashboard}><header className={styles.dashboardHead}><div><span>PRIVATE WORKSPACE</span><h1>Welcome, {account.displayName}</h1><p>{account.artist?.stageName||account.email}</p></div><div className={`${styles.badge} ${account.status==="ACTIVE"?styles.approved:styles.pending}`}>{account.status==="ACTIVE"?"Account active":"Approval pending"}</div></header>{error&&<p className={styles.error}>{error}</p>}{message&&<p className={styles.success}>{message}</p>}<div className={styles.dashboardGrid}><section className={styles.card}><span>UPLOAD MEDIA</span><h2>New submission</h2>{account.status==="ACTIVE"?<><div className={styles.accountTypes}><button className={mediaKind==="audio"?styles.selected:""} onClick={()=>setMediaKind("audio")}><strong>Audio</strong><small>MP3, WAV, M4A and other audio</small></button><button className={mediaKind==="video"?styles.selected:""} onClick={()=>setMediaKind("video")}><strong>Video</strong><small>MP4, MOV, WebM and other video</small></button></div><form className={styles.form} encType="multipart/form-data" onSubmit={event=>submit(event,"media")}><label>{mediaKind==="audio"?"Song title":"Video title"}<input name="title" required minLength={2}/></label><label>Category<select name="categoryId" required defaultValue=""><option value="" disabled>Select category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Description<textarea name="description" rows={4}/></label><label>{mediaKind==="audio"?"Audio file":"Video file"}<input name="file" type="file" accept={mediaKind==="audio"?"audio/*":"video/*"} required/></label>{busy&&<div className={styles.progressWrap} aria-live="polite"><div className={styles.progressMeta}><span>{uploadStage||"Preparing upload"}</span><strong>{uploadProgress}%</strong></div><div className={styles.progressTrack}><span style={{width:`${uploadProgress}%`}}/></div></div>}<button className={styles.primary} disabled={busy}>{busy?`${uploadStage||"Uploading"} · ${uploadProgress}%`:"Upload for approval"}</button><small className={styles.help}>Maximum file size: 1 GB. The server optimizes the file when that reduces its size. Only you and administrators can access it until approval.</small></form></>:<p className={styles.notice}>Your artist registration is being reviewed. Submission tools will unlock after approval.</p>}</section><section className={styles.card}><span>YOUR SUBMISSIONS ONLY</span><h2>Review status</h2><div className={styles.songList}>{songs.map(song=><article className={styles.song} key={song.id}><div><strong>{song.title}</strong><small>Audio · {song.category?.name||"Uncategorized"} · {new Date(song.createdAt).toLocaleDateString()}</small>{song.audioUrl&&<audio className={styles.player} controls preload="none" src={song.audioUrl}/>}</div><span className={styles.status}>{song.status.replaceAll("_"," ")}</span></article>)}{videos.map(video=><article className={styles.song} key={video.id}><div><strong>{video.title}</strong><small>Video · {video.category?.name||"Uncategorized"} · {new Date(video.createdAt).toLocaleDateString()}</small>{video.videoUrl&&<video className={styles.videoPlayer} controls preload="metadata" src={video.videoUrl}/>}</div><span className={styles.status}>{video.status.replaceAll("_"," ")}</span></article>)}{!songs.length&&!videos.length&&<div className={styles.empty}>You have not submitted audio or video yet.</div>}</div></section></div></div>}
    </section>
    {view==="dashboard"&&account&&referrals&&<section className={styles.shell}><section className={styles.card}><span>CONTRIBUTOR &amp; REFERRALS</span><h2>{account.contributorRank||"New Contributor"}</h2><p>Your public profile and referral activity update automatically after approved contributions.</p><div className={styles.promises}><div><strong>{referrals.clicks}</strong><small>Referral clicks</small></div><div><strong>{referrals.registrations}</strong><small>Registrations</small></div><div><strong>{referrals.successful}</strong><small>Successful referrals</small></div></div><label>Personal referral link<input readOnly value={referrals.link} onFocus={event=>event.currentTarget.select()}/></label><div className={styles.navActions}><Link className={styles.primary} href={`/contributor/${account.username}`}>View public profile</Link><button className={styles.textButton} type="button" onClick={()=>navigator.clipboard.writeText(referrals.link).then(()=>setMessage("Referral link copied."))}>Copy referral link</button></div></section></section>}
    <SiteFooter variant="account"/>
  </main>
}
