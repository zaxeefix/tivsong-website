import Image from "next/image";
import Link from "next/link";
import HeroSlider from "./components/HeroSlider";
import PrimaryNavLinks from "./components/PrimaryNavLinks";
import PublicAccountMenu from "./components/PublicAccountMenu";
import ThemeToggle from "./components/ThemeToggle";
import CommentSection from "./components/CommentSection";
import SiteFooter from "./components/SiteFooter";
import {publicApi,slugify} from "./lib/public-api";
import styles from "./home.module.css";

type Artist={id:string;slug?:string;stageName:string;imageUrl?:string|null;genre?:string|null};
type Song={id:string;slug:string;title:string;coverImageUrl?:string|null;artist?:{stageName:string}|null};
type Video={id:string;slug:string;title:string;thumbnailUrl?:string|null;artist?:{stageName:string}|null};
type TorTiv={id:string;slug?:string;name:string;portraitUrl?:string|null;ordinal:number};
type Community={id:string;slug:string;title:string;imageUrl?:string|null};
type List<T>={items:T[];pagination?:{total:number}};

const features=[
  {label:"Music",description:"Stream authentic Tiv songs.",href:"/#songs",image:"/assets/tiv-song-logo.jpeg"},
  {label:"Videos",description:"Watch culture in motion.",href:"/#videos",image:"/assets/governors/hyacinth-alia.png"},
  {label:"Artists",description:"Meet the voices of Tiv music.",href:"/#artists",image:"/heritage/james-ayatse.jpg"},
  {label:"Tor Tiv",description:"Explore the royal heritage.",href:"/kings",image:"/heritage/alfred-torkula.jpg"},
  {label:"Governors",description:"Discover Benue leadership.",href:"/governors.html",image:"/assets/governors/samuel-ortom.png"},
  {label:"Community",description:"Connect with Tiv people worldwide.",href:"/community",image:"/assets/tiv-song-logo.jpeg"}
] as const;

export default async function Home(){
  const [songData,videoData,artists,torTiv,community]=await Promise.all([
    publicApi<List<Song>>("/songs?limit=6"),publicApi<List<Video>>("/videos?limit=6"),publicApi<Artist[]>("/artists"),publicApi<TorTiv[]>("/tor-tiv"),publicApi<List<Community>>("/community?limit=3")
  ]);
  const songs=songData?.items||[],videos=videoData?.items||[],artistItems=artists||[],leaders=torTiv||[],communityItems=community?.items||[];
  const stats=[{label:"Songs archived",value:songData?.pagination?.total??songs.length},{label:"Verified artists",value:artistItems.length},{label:"Featured videos",value:videos.length},{label:"Tor Tiv records",value:leaders.length}].filter(item=>item.value>0);
  return <div className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="Tiv Songs" width={50} height={50} priority/><span>TIV SONGS<small>Where Tiv music lives</small></span></Link><nav className={styles.desktopNav} aria-label="Primary navigation"><PrimaryNavLinks linkClassName={styles.navLink} activeClassName={styles.activeLink}/></nav><div className={styles.headerTools}><ThemeToggle/><PublicAccountMenu/><Link className={styles.signIn} href="/account">Sign in</Link></div><details className={styles.mobileMenu}><summary aria-label="Open navigation">Menu</summary><nav><PrimaryNavLinks linkClassName={styles.mobileLink} activeClassName={styles.activeLink}/><Link className={styles.mobileLink} href="/account">Sign in</Link></nav></details></header>
    <main><HeroSlider/>
      <section className={styles.features} aria-labelledby="explore-title"><div className={styles.sectionIntro}><span>EXPLORE TIV SONGS</span><h2 id="explore-title">Music, people and living heritage.</h2></div><div className={styles.featureGrid}>{features.map(feature=><Link className={styles.feature} data-label={feature.label} href={feature.href} key={feature.label}><span className={styles.featureImage}><Image src={feature.image} alt="" fill sizes="(max-width: 600px) 42vw, 180px"/></span><strong>{feature.label}</strong><p>{feature.description}</p></Link>)}</div></section>
      {stats.length>0&&<section className={styles.stats} aria-label="Tiv Songs archive statistics">{stats.map(item=><div key={item.label}><strong>{item.value.toLocaleString()}</strong><span>{item.label}</span></div>)}</section>}
      <section className={styles.promise} aria-labelledby="preserve-title"><h2 id="preserve-title">Upload. Review. Preserve.</h2><p>Contribute original Tiv music through the existing review and approval process.</p></section>
      <ContentSection id="songs" eyebrow="LATEST RELEASES" title="The sound of Tiv today." link="/#songs" linkText="Explore songs">{songs.length?songs.map(song=><Link className={styles.mediaCard} href={`/song/${song.slug}`} key={song.id}><Artwork src={song.coverImageUrl} title={song.title}/><span><small>{song.artist?.stageName||"Tiv Songs artist"}</small><strong>{song.title}</strong></span></Link>):<EmptyState label="No published songs yet."/>}</ContentSection>
      <ContentSection id="videos" eyebrow="WATCH" title="Stories in rhythm and motion." link="/#videos" linkText="Explore videos">{videos.length?videos.map(video=><Link className={styles.mediaCard} href={`/video/${video.slug}`} key={video.id}><Artwork src={video.thumbnailUrl} title={video.title}/><span><small>{video.artist?.stageName||"Tiv Songs"}</small><strong>{video.title}</strong></span></Link>):<EmptyState label="No published videos yet."/>}</ContentSection>
      <ContentSection id="artists" eyebrow="TIV VOICES" title="Artists carrying culture forward." link="/#artists" linkText="Meet the artists">{artistItems.slice(0,6).length?artistItems.slice(0,6).map(artist=><Link className={`${styles.mediaCard} ${styles.artistCard}`} href={`/artist/${artist.slug||slugify(artist.stageName)}`} key={artist.id}><Artwork src={artist.imageUrl} title={artist.stageName}/><span><small>{artist.genre||"Tiv artist"}</small><strong>{artist.stageName}</strong></span></Link>):<EmptyState label="Artist profiles will appear here after verification."/>}</ContentSection>
      {leaders.length>0&&<section className={styles.heritage}><div><span>LIVING HERITAGE</span><h2>The Tor Tiv institution.</h2><p>Preserving the leadership, memory and identity of the Tiv nation for future generations.</p><Link href="/kings">Explore the full history →</Link></div><div className={styles.leaders}>{leaders.slice(-3).map(leader=><Link href={`/profiles/kings/${leader.slug||slugify(leader.name)}`} key={leader.id}><Artwork src={leader.portraitUrl} title={leader.name}/><strong>{leader.name}</strong><small>Tor Tiv {String(leader.ordinal).padStart(2,"0")}</small></Link>)}</div></section>}
      {communityItems.length>0&&<ContentSection id="community" eyebrow="COMMUNITY" title="Tiv people, everywhere." link="/community" linkText="Visit community">{communityItems.map(item=><Link className={styles.mediaCard} href={`/community/${item.slug}`} key={item.id}><Artwork src={item.imageUrl} title={item.title}/><span><small>Community story</small><strong>{item.title}</strong></span></Link>)}</ContentSection>}
      <section className={styles.contribute}><span>PRESERVE THE SOUND</span><h2>Your music belongs in the archive.</h2><p>Create a contributor or artist account, upload original work and follow its review status securely.</p><Link href="/account?mode=register">Create an account</Link></section>
      <CommentSection targetType="community" targetId="homepage" title="Join the Tiv Songs conversation"/>
    </main><SiteFooter/>
  </div>;
}

function ContentSection({id,eyebrow,title,link,linkText,children}:{id:string;eyebrow:string;title:string;link:string;linkText:string;children:React.ReactNode}){return <section className={styles.contentSection} id={id}><div className={styles.sectionHead}><div><span>{eyebrow}</span><h2>{title}</h2></div><Link href={link}>{linkText} →</Link></div><div className={styles.mediaGrid}>{children}</div></section>}
function Artwork({src,title}:{src?:string|null;title:string}){return <span className={styles.artwork}>{src?<img src={src} alt={`${title} artwork`} loading="lazy"/>:<span aria-hidden="true">{title.slice(0,1)}</span>}</span>}
function EmptyState({label}:{label:string}){return <div className={styles.empty}>{label}</div>}
