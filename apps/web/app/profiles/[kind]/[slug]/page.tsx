import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import PublicAccountMenu from "../../../components/PublicAccountMenu";
import SiteFooter from "../../../components/SiteFooter";
import PrimaryNavLinks from "../../../components/PrimaryNavLinks";
import CommentSection from "../../../components/CommentSection";
import {getHeritageProfile,heritageProfiles} from "../../../data/heritageProfiles";
import styles from "./profile.module.css";

export const dynamicParams=false;
export function generateStaticParams(){return heritageProfiles.map(profile=>({kind:profile.kind==="king"?"kings":"governors",slug:profile.slug}))}

export default async function ProfilePage({params}:{params:Promise<{kind:string;slug:string}>}){
  const {kind,slug}=await params;
  const normalizedKind=kind==="kings"?"king":kind==="governors"?"governor":"";
  const profile=getHeritageProfile(normalizedKind,slug);
  if(!profile)notFound();
  const archiveHref=profile.kind==="king"?"/kings":"/governors.html";
  const displayImage=profile.slug==="alfred-akawe-torkula"?null:profile.image;
  return <main className={styles.page}>
    <nav className={styles.nav}><Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="" width={48} height={48}/>TIV SONGS</Link><div className={styles.links}><PrimaryNavLinks linkClassName={styles.navLink} activeClassName={styles.active}/><ThemeToggle className={styles.themeToggle}/><PublicAccountMenu/></div></nav>
    <header className={styles.hero}><div className={styles.heroInner}><div className={styles.portrait}>{displayImage?<Image src={displayImage} alt={`Portrait of ${profile.name}`} fill priority sizes="(max-width:700px) calc(100vw - 36px), (max-width:900px) 300px, 360px"/>:<div className={styles.initials} aria-label={`No verified portrait available for ${profile.name}`}>{profile.name.split(" ").map(part=>part[0]).join("").slice(0,3)}</div>}</div><div><span className={styles.type}>{profile.kind==="king"?"Tiv royal heritage":"Benue civic leadership"} · {profile.title}</span><h1>{profile.name}</h1><p className={styles.period}>{profile.period}</p><p className={styles.summary}>{profile.summary}</p></div></div></header>
    <section className={styles.main}><div className={styles.facts}>{profile.facts.map(fact=><div className={styles.fact} key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div><div className={styles.columns}><article className={styles.section}><h2>Profile</h2>{profile.biography.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</article><aside className={styles.section}><h2>Documented milestones</h2><ul className={styles.achievements}>{profile.achievements.map(item=><li key={item}>{item}</li>)}</ul><div className={styles.sources}><h2>Sources & references</h2>{profile.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<span>↗</span></a>)}</div><p className={styles.note}>This profile summarizes publicly documented information. Source links are provided for verification and further reading.</p></aside></div></section>
    <CommentSection targetType="history" targetId={`${kind}-${slug}`} title={`Discuss ${profile.name}'s legacy`}/>
    <SiteFooter variant="heritage"/>
  </main>
}
