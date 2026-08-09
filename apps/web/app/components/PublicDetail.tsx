import Link from "next/link";
import CommentSection from "./CommentSection";
import ContentViewTracker,{TrackedDownloadLink} from "./ContentViewTracker";
import ShareButton from "./ShareButton";
import SiteFooter from "./SiteFooter";
import styles from "./PublicDetail.module.css";

export default function PublicDetail({kind,id,title,creator,description,image,mediaUrl,mediaKind="image",url,artistUrl,children}:{kind:"song"|"video"|"community"|"artist";id:string;title:string;creator:string;description:string;image?:string|null;mediaUrl?:string|null;mediaKind?:"image"|"audio"|"video";url:string;artistUrl?:string;children?:React.ReactNode}){
  const text=kind==="song"?`🎵 Listen to "${title}" by ${creator} on Tiv Songs.`:kind==="video"?`Watch "${title}" by ${creator} on Tiv Songs.`:`Discover "${title}" on Tiv Songs.`;
  return <main className={styles.page}><ContentViewTracker entityType={kind} entityId={id}/><nav className={styles.nav}><Link className={styles.brand} href="/"><img src="/assets/tiv-song-logo.jpeg" alt="" width="45" height="45"/>TIV SONGS</Link><Link className={styles.back} href={kind==="community"?"/community":"/"}>← Back</Link></nav>
    <header className={styles.hero}><div className={styles.heroInner}><div className={styles.media}>{mediaKind==="video"&&mediaUrl?<video controls preload="metadata" src={mediaUrl}/>:image?<img src={image} alt=""/>:<div className={styles.fallback}>{title.slice(0,1)}</div>}</div><div><span className={styles.type}>{kind.toUpperCase()} · TIV SONGS</span><h1>{title}</h1><p className={styles.byline}>{creator}</p><p className={styles.description}>{description}</p>{mediaKind==="audio"&&mediaUrl&&<audio className={styles.player} controls preload="metadata" src={mediaUrl}/>}<div className={styles.actions}><ShareButton title={title} text={text} url={url} entityType={kind} entityId={id}/>{mediaUrl&&(kind==="song"||kind==="video")&&<TrackedDownloadLink entityType={kind} entityId={id} href={mediaUrl}/>} {artistUrl&&<Link className={styles.artistLink} href={artistUrl}>View artist</Link>}</div></div></div></header>
    {children&&<section className={styles.content}>{children}</section>}<CommentSection targetType={kind} targetId={id} title={`Discuss ${title}`}/><SiteFooter variant={kind==="community"?"community":"general"}/></main>
}
