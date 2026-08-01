"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import styles from "./PublicAccountMenu.module.css";

export default function PublicAccountMenu(){
  const [open,setOpen]=useState(false);
  const [authenticated,setAuthenticated]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    setAuthenticated(Boolean(sessionStorage.getItem("tiv-account-auth")));
    const close=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[]);
  return <div className={styles.root} ref={root}>
    <button className={styles.trigger} type="button" aria-label="Open account menu" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    </button>
    {open&&<div className={styles.menu} role="menu" aria-label="Account">
      {authenticated?<><Link role="menuitem" href="/account">Dashboard</Link><Link role="menuitem" href="/account#profile">Profile</Link></>:<><Link role="menuitem" href="/account">Login</Link><Link role="menuitem" href="/account?mode=register">Register</Link></>}
    </div>}
  </div>;
}
