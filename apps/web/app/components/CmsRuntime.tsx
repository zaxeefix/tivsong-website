"use client";

import {useEffect,useState} from "react";

type Settings={general:{websiteName:string;favicon:string};appearance:{primaryColor:string;secondaryColor:string;accentColor:string;typography:string};system:{maintenanceMode:boolean}};

export default function CmsRuntime(){
  const [maintenance,setMaintenance]=useState(false);
  useEffect(()=>{
    let alive=true;
    const apply=async()=>{
      const response=await fetch("/api/cms/settings",{credentials:"include",cache:"no-store"}).catch(()=>null);
      if(!response?.ok)return;
      const settings=await response.json() as Settings;if(!alive)return;
      document.documentElement.style.setProperty("--cms-primary",settings.appearance.primaryColor);
      document.documentElement.style.setProperty("--cms-secondary",settings.appearance.secondaryColor);
      document.documentElement.style.setProperty("--cms-accent",settings.appearance.accentColor);
      document.documentElement.style.setProperty("--font-sans",settings.appearance.typography);
      document.title=settings.general.websiteName;
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href",settings.general.favicon);
      setMaintenance(settings.system.maintenanceMode);
    };
    void apply();
    const events=new EventSource("/api/cms/events",{withCredentials:true});
    events.addEventListener("settings.updated",()=>void apply());
    events.addEventListener("content.updated",()=>window.dispatchEvent(new CustomEvent("cms:content-updated")));
    return()=>{alive=false;events.close()};
  },[]);
  if(!maintenance)return null;
  return <div role="alert" style={{position:"fixed",inset:0,zIndex:10000,display:"grid",placeItems:"center",padding:24,background:"var(--cms-secondary,#26003f)",color:"#fff",textAlign:"center"}}><div><img src="/assets/tiv-song-logo.jpeg" alt="" width="84" height="84" style={{borderRadius:"50%"}}/><h1>We’ll be back shortly</h1><p>Tiv Songs is undergoing scheduled maintenance.</p></div></div>;
}
