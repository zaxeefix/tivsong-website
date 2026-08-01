"use client";

import {useEffect, useState} from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "dark"|"light";
const storageKey = "tiv-songs-theme";

function preferredTheme():Theme {
  const saved=localStorage.getItem(storageKey);
  if(saved==="dark"||saved==="light") return saved;
  return matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
}

export default function ThemeToggle({className=""}:{className?:string}){
  const [theme,setTheme]=useState<Theme>("dark");
  useEffect(()=>{
    const apply=(next:Theme)=>{
      document.documentElement.dataset.theme=next;
      document.documentElement.style.colorScheme=next;
      setTheme(next);
    };
    const sync=()=>apply(preferredTheme());
    const onThemeChange=(event:Event)=>apply((event as CustomEvent<Theme>).detail);
    const media=matchMedia("(prefers-color-scheme: light)");
    const onSystemChange=()=>{if(!localStorage.getItem(storageKey)) sync();};
    sync();
    window.addEventListener("storage",sync);
    window.addEventListener("pageshow",sync);
    window.addEventListener("tiv-theme-change",onThemeChange);
    media.addEventListener("change",onSystemChange);
    return ()=>{
      window.removeEventListener("storage",sync);
      window.removeEventListener("pageshow",sync);
      window.removeEventListener("tiv-theme-change",onThemeChange);
      media.removeEventListener("change",onSystemChange);
    };
  },[]);
  const toggle=()=>{
    const next=theme==="dark"?"light":"dark";
    document.documentElement.dataset.theme=next;
    document.documentElement.style.colorScheme=next;
    localStorage.setItem(storageKey,next);
    window.dispatchEvent(new CustomEvent<Theme>("tiv-theme-change",{detail:next}));
    setTheme(next);
  };
  return <button type="button" className={`${styles.control} ${className}`.trim()} onClick={toggle} aria-label={`Switch to ${theme==="dark"?"day":"night"} mode`} title={`Switch to ${theme==="dark"?"day":"night"} mode`}>
    {theme==="dark"
      ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
  </button>;
}
