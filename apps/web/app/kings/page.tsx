"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect, useState} from "react";
import ThemeToggle from "../components/ThemeToggle";
import PublicAccountMenu from "../components/PublicAccountMenu";
import SiteFooter from "../components/SiteFooter";
import CommentSection from "../components/CommentSection";
import PrimaryNavLinks from "../components/PrimaryNavLinks";
import {heritageProfiles} from "../data/heritageProfiles";
import styles from "./kings.module.css";

type King={id?:string;ordinal:number;name:string;reignStart:string;reignEnd:string|null;portraitUrl:string|null;biography:string;sourceUrl?:string|null};

const fallback:King[]=[
  {ordinal:1,name:"Makir Zakpe",reignStart:"1946-01-01",reignEnd:"1956-01-01",portraitUrl:"/assets/kings/makir-zakpe.jpg",biography:"The first Tor Tiv and the foundational paramount ruler of the Tiv people, whose reign shaped the modern institution of Tiv traditional leadership."},
  {ordinal:2,name:"Gondo Aluor",reignStart:"1956-01-01",reignEnd:"1978-01-01",portraitUrl:null,biography:"A respected teacher and former chief scribe of the Tiv Native Authority who guided the institution through a period of social and political change."},
  {ordinal:3,name:"James Akperan Orshi",reignStart:"1979-01-01",reignEnd:"1990-01-01",portraitUrl:null,biography:"The third Tor Tiv, remembered for his service to the Tiv nation and through institutions that continue to carry his name."},
  {ordinal:4,name:"Alfred Akawe Torkula",reignStart:"1991-01-01",reignEnd:"2015-01-01",portraitUrl:"/assets/kings/alfred-torkula.jpg",biography:"A long-serving Tor Tiv whose reign of more than twenty-four years strengthened the voice of the traditional institution in Benue State."},
  {ordinal:5,name:"Prof. James Ayatse",reignStart:"2017-01-01",reignEnd:null,portraitUrl:"/assets/kings/james-ayatse.jpg",biography:"The fifth Tor Tiv and current paramount ruler, bringing a distinguished academic and public-service background to the leadership of the Tiv nation."}
];

const year=(value:string|null)=>value?new Date(value).getFullYear():"Present";
const normalizeName=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
const kingProfiles=heritageProfiles.filter(profile=>profile.kind==="king");
const profileFor=(king:King)=>kingProfiles.find(profile=>normalizeName(profile.name)===normalizeName(king.name))
  ??kingProfiles.find(profile=>profile.title===`Tor Tiv ${["I","II","III","IV","V"][king.ordinal-1]}`);

export default function KingsPage(){
  const [kings,setKings]=useState<King[]>(fallback);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/tor-tiv",{signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject(new Error("Tor Tiv archive is unavailable")))
      .then(data=>{if(Array.isArray(data)&&data.length)setKings([...data].sort((a,b)=>a.ordinal-b.ordinal))})
      .catch(error=>{if(error instanceof Error&&error.name!=="AbortError")console.warn(error.message)});
    return ()=>controller.abort();
  },[]);
  return <main className={styles.page}>
    <nav className={styles.nav}>
      <Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="" width={48} height={48}/>TIV SONGS</Link>
      <div className={styles.links}><PrimaryNavLinks linkClassName={styles.link} activeClassName={styles.active}/><ThemeToggle className={styles.themeToggle}/><PublicAccountMenu/></div>
    </nav>
    <header className={styles.hero}><div className={styles.heroInner}><div><span className={styles.eyebrow}>Tiv Royal Heritage · Since 1946</span><h1>The throne.<br/><span>The story.</span><br/>The people.</h1><p className={styles.lead}>Meet the Tor Tiv—custodians of identity, unity and cultural memory across generations of the Tiv nation.</p></div><aside className={styles.heroNote}><strong>{kings.length}</strong><span>paramount rulers chronicled in a living digital archive, from Makir Zakpe to the present day.</span></aside></div></header>
    <section className={styles.main}><div className={styles.intro}><div><small>THE TOR TIV DYNASTY</small><h2>Leadership across generations.</h2></div><p>The office of the Tor Tiv is more than a throne. It is a shared cultural institution that carries the history, aspirations and collective voice of Tiv people. This timeline presents each reign with dignity, clarity and room for the archive to grow.</p></div>
      <div className={styles.timeline}>{kings.map(king=>{const profile=profileFor(king);return <article className={styles.card} key={`${king.ordinal}-${king.name}`}><div className={styles.portrait}><span className={styles.ordinal}>TOR TIV {String(king.ordinal).padStart(2,"0")}</span>{king.portraitUrl?<Image src={king.portraitUrl} alt={`Portrait of ${king.name}`} fill sizes="(max-width:620px) 100vw, 280px"/>:<div className={styles.initials}>{king.name.split(" ").map(part=>part[0]).join("").slice(0,3)}</div>}</div><div className={styles.content}><span className={styles.reign}>{year(king.reignStart)} — {year(king.reignEnd)}</span><h3>{king.name}</h3><p>{king.biography}</p>{profile&&<Link className={styles.profileLink} href={`/profiles/kings/${profile.slug}`}>View profile &amp; achievements →</Link>}</div></article>})}</div>
    </section>
    <CommentSection targetType="history" targetId="tor-tiv-archive" title="Discuss Tiv royal heritage"/>
    <SiteFooter variant="heritage"/>
  </main>;
}
