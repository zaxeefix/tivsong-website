"use client";

import {FormEvent,useEffect,useState} from "react";
import styles from "./FooterCms.module.css";

type Data={general:{contactEmail:string;supportEmail:string};footer:{about:string;newsletterEnabled:boolean;copyright:string};version:{currentVersion:string;buildNumber:string;environment:string}};
export default function FooterCms(){
  const [data,setData]=useState<Data|null>(null);const [subscribed,setSubscribed]=useState(false);
  useEffect(()=>{fetch("/api/cms/settings",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(setData).catch(()=>undefined)},[]);
  if(!data)return null;
  const subscribe=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setSubscribed(true);event.currentTarget.reset()};
  return <div className={styles.cms}><p>{data.footer.about}</p>{data.footer.newsletterEnabled&&<form onSubmit={subscribe}><label htmlFor="footerEmail">Newsletter</label><div><input id="footerEmail" type="email" required placeholder="Email address"/><button>Subscribe</button></div>{subscribed&&<small>Thank you for subscribing.</small>}</form>}<div className={styles.meta}><span>{data.footer.copyright}</span><span>Version {data.version.currentVersion} · Build {data.version.buildNumber} · {data.version.environment}</span>{data.general.contactEmail&&<a href={`mailto:${data.general.contactEmail}`}>Contact</a>}</div></div>;
}
