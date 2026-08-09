"use client";

import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import styles from "./HeroSlider.module.css";

type Slide={id:string;title:string;subtitle:string|null;excerpt:string|null;imageUrl:string|null;videoUrl:string|null;buttonText:string|null;buttonUrl:string|null;metadata?:{animation?:string}|null};
const fallback:Slide={id:"default",title:"The home of Tiv music & culture.",subtitle:"Benue State · Nigeria",excerpt:"Stream, discover and preserve authentic Tiv sound and cultural heritage for generations.",imageUrl:"/assets/kings/james-ayatse.jpg",videoUrl:null,buttonText:"Start listening",buttonUrl:"#music",metadata:{animation:"fade"}};

export default function HeroSlider(){
  const [slides,setSlides]=useState<Slide[]>([fallback]),[active,setActive]=useState(0),[enabled,setEnabled]=useState(true),[speed,setSpeed]=useState(7);
  const load=useCallback(()=>Promise.all([fetch("/api/cms/entries/hero",{cache:"no-store"}),fetch("/api/cms/settings",{cache:"no-store"})]).then(async([entries,settingsResponse])=>{const items=entries.ok?await entries.json() as Slide[]:[];const settings=settingsResponse.ok?await settingsResponse.json() as {homepage?:{enabledSections?:Record<string,boolean>};appearance?:{heroAnimationSpeed?:number}}:{};setSlides(items.length?items:[fallback]);setEnabled(settings.homepage?.enabledSections?.hero!==false);setSpeed(Math.max(1,settings.appearance?.heroAnimationSpeed||7));setActive(0)}).catch(()=>setSlides([fallback])),[]);
  useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener("cms:content-updated",refresh);return()=>window.removeEventListener("cms:content-updated",refresh)},[load]);
  useEffect(()=>{if(slides.length<2)return;const timer=window.setInterval(()=>setActive(value=>(value+1)%slides.length),speed*1000);return()=>window.clearInterval(timer)},[slides.length,speed]);
  if(!enabled)return null;
  return <section className={styles.hero} aria-roledescription="carousel" aria-label="Featured Tiv Songs content">{slides.map((slide,index)=><article className={`${styles.slide} ${index===active?styles.active:""}`} aria-hidden={index!==active} key={slide.id}>{slide.videoUrl?<video className={styles.media} src={slide.videoUrl} autoPlay muted loop playsInline/>:slide.imageUrl?<img className={styles.media} src={slide.imageUrl} alt=""/>:<div className={styles.media}/>}<div className={styles.overlay}/><div className={styles.content}><span className={styles.eyebrow}>{slide.subtitle||"TIV SONGS FEATURED"}</span><h1>{slide.title}</h1>{slide.excerpt&&<p>{slide.excerpt}</p>}{slide.buttonText&&slide.buttonUrl&&<Link className="button light" href={slide.buttonUrl}>{slide.buttonText}</Link>}</div></article>)}{slides.length>1&&<div className={styles.controls}>{slides.map((slide,index)=><button key={slide.id} aria-label={`Show slide ${index+1}`} aria-current={index===active} onClick={()=>setActive(index)}/>)}</div>}</section>;
}
