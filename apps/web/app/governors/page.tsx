import Image from "next/image";
import Link from "next/link";
import CommentSection from "../components/CommentSection";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import {heritageProfiles} from "../data/heritageProfiles";
import styles from "./governors.module.css";

export const metadata={title:"Governors of Benue State | Tiv Songs",description:"A verified cultural archive of elected governors of Benue State."};

export default function GovernorsPage(){
  const governors=heritageProfiles.filter(profile=>profile.kind==="governor");
  return <main className={styles.page}>
    <SiteHeader/>
    <header className={styles.hero}><div><span>BENUE LEADERSHIP ARCHIVE</span><h1>Governors through the years.</h1><p>A carefully sourced record of elected leadership, public service and lasting contributions to Benue State.</p></div></header>
    <section className={styles.archive} aria-labelledby="governors-title"><div className={styles.intro}><div><small>THE GOVERNORS</small><h2 id="governors-title">Leadership in public memory.</h2></div><p>Open a profile to read the biography, achievements, key facts and supporting sources for each administration.</p></div>
      <div className={styles.grid}>{governors.map((governor,index)=><article className={styles.card} key={governor.slug}>
        <div className={styles.image}>{governor.image?<Image src={governor.image} alt={`Portrait of ${governor.name}`} fill sizes="(max-width: 700px) 100vw, 360px"/>:<span>{governor.name.split(" ").map(part=>part[0]).join("").slice(0,3)}</span>}<b>{String(index+1).padStart(2,"0")}</b></div>
        <div className={styles.content}><small>{governor.period}</small><h3>{governor.name}</h3><strong>{governor.title}</strong><p>{governor.summary}</p><Link href={`/governors/${governor.slug}`}>View profile &amp; sources →</Link></div>
      </article>)}</div>
    </section>
    <CommentSection targetType="history" targetId="governors-archive" title="Discuss Benue leadership history"/>
    <SiteFooter variant="heritage"/>
  </main>;
}
