"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";

const links=[
  {label:"Home",href:"/",matches:(path:string,hash:string)=>path==="/"&&(!hash||hash==="#home")},
  {label:"Songs",href:"/#songs",matches:(path:string,hash:string)=>path==="/"&&hash==="#songs"},
  {label:"Videos",href:"/#videos",matches:(path:string,hash:string)=>path==="/"&&hash==="#videos"},
  {label:"Artists",href:"/#artists",matches:(path:string,hash:string)=>path==="/"&&hash==="#artists"},
  {label:"Tor Tiv",href:"/kings",matches:(path:string)=>path==="/kings"||path.startsWith("/profiles/kings/")},
  {label:"Governors",href:"/governors.html",matches:(path:string)=>path==="/governors.html"||path.startsWith("/profiles/governors/")},
  {label:"Community",href:"/community",matches:(path:string)=>path==="/community"}
] as const;

export default function PrimaryNavLinks({linkClassName="",activeClassName=""}:{linkClassName?:string;activeClassName?:string}){
  const pathname=usePathname();
  const [hash,setHash]=useState("");
  useEffect(()=>{
    const sync=()=>setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange",sync);
    return()=>window.removeEventListener("hashchange",sync);
  },[pathname]);
  return <>{links.map(link=>{
    const active=link.matches(pathname,hash);
    return <Link key={link.href} href={link.href} className={`${linkClassName} ${active?activeClassName:""}`.trim()} aria-current={active?"page":undefined}>{link.label}</Link>;
  })}</>;
}
