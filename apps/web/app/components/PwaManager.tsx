"use client";

import {useEffect,useState} from "react";
import styles from "./PwaManager.module.css";

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};

export default function PwaManager(){
  const [update,setUpdate]=useState<ServiceWorker|null>(null);
  const [installPrompt,setInstallPrompt]=useState<InstallPrompt|null>(null);
  const [offline,setOffline]=useState(false);

  useEffect(()=>{
    if(process.env.NODE_ENV!=="production")return;
    if(!("serviceWorker" in navigator))return;
    setOffline(!navigator.onLine);
    const online=()=>setOffline(false);
    const offlineListener=()=>setOffline(true);
    const beforeInstall=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPrompt)};
    window.addEventListener("online",online);
    window.addEventListener("offline",offlineListener);
    window.addEventListener("beforeinstallprompt",beforeInstall);
    navigator.serviceWorker.register("/sw.js").then(registration=>{
      if(registration.waiting)setUpdate(registration.waiting);
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;
        worker?.addEventListener("statechange",()=>{
          if(worker.state==="installed"&&navigator.serviceWorker.controller)setUpdate(worker);
        });
      });
    }).catch(()=>undefined);
    const reload=()=>window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange",reload);
    return()=>{
      window.removeEventListener("online",online);
      window.removeEventListener("offline",offlineListener);
      window.removeEventListener("beforeinstallprompt",beforeInstall);
      navigator.serviceWorker.removeEventListener("controllerchange",reload);
    };
  },[]);

  const install=async()=>{
    if(!installPrompt)return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  if(!update&&!offline&&!installPrompt)return null;
  return <aside className={styles.notice} role="status" aria-live="polite">
    <img src="/assets/tiv-song-logo.jpeg" alt="" width="42" height="42"/>
    <div><strong>{update?"A new version of Tiv Songs is available.":offline?"You are offline.":"Install Tiv Songs"}</strong><span>{offline?"Saved pages remain available while your connection recovers.":update?"Update safely without losing your session.":"Add the music and heritage archive to your device."}</span></div>
    {update&&<button onClick={()=>update.postMessage({type:"SKIP_WAITING"})}>Update Now</button>}
    {!update&&installPrompt&&<button onClick={install}>Install</button>}
  </aside>;
}
