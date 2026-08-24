"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import styles from "./HeroSlider.module.css";

type Slide={id:string;label:string;title:string;excerpt:string;imageUrl:string;imageAlt:string;buttonText:string;buttonUrl:string};
const slides:Slide[]=[
  {id:"makirZakpe",label:"ROYAL HERITAGE",title:"The First Tor Tiv",excerpt:"Honouring HRM Makir Zakpe and the beginning of the modern Tor Tiv institution.",imageUrl:"/assets/kings/makir-zakpe.jpg",imageAlt:"Archival portrait of HRM Makir Zakpe, Tor Tiv I",buttonText:"Explore his history",buttonUrl:"/profiles/kings/makir-zakpe"},
  {id:"tivAttire",label:"TIV IDENTITY",title:"Proudly Tiv",excerpt:"Our attire carries the identity, dignity and shared heritage of the Tiv people.",imageUrl:"/assets/tiv-traditional-attire.jpg",imageAlt:"A Tiv man and woman wearing black-and-white striped traditional attire",buttonText:"Visit the community",buttonUrl:"/community"},
  {id:"hyacinthAlia",label:"PUBLIC LEADERSHIP",title:"Leadership and Service",excerpt:"Featuring the current Executive Governor of Benue State, Rev. Fr. Dr. Hyacinth Iormem Alia.",imageUrl:"/assets/governors/hyacinth-alia.png",imageAlt:"Rev. Fr. Dr. Hyacinth Iormem Alia, Executive Governor of Benue State",buttonText:"View governor profile",buttonUrl:"/governors/hyacinth-alia"},
  {id:"jamesAkor",label:"FAITH AND HISTORY",title:"A Tiv Priesthood Pioneer",excerpt:"Remembering Rev. Fr. James Akor, documented as the first Tiv Catholic priest.",imageUrl:"/assets/heritage/james-akor-memorial.jpg",imageAlt:"A chalice and paten representing the priestly ministry of Rev. Fr. James Akor; this is not his portrait",buttonText:"Explore Tiv heritage",buttonUrl:"/kings"},
  {id:"kwaghHir",label:"LIVING HERITAGE",title:"The Magic of Kwagh-Hir",excerpt:"Celebrating the Tiv theatrical tradition of music, dance, puppetry, masquerade and storytelling.",imageUrl:"/assets/heritage/kwagh-hir-performance.jpg",imageAlt:"An authentic Kwagh-Hir performance at the Benue Youth Carnival in Makurdi",buttonText:"Explore community culture",buttonUrl:"/community"}
];

export default function HeroSlider(){
  const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[tabHidden,setTabHidden]=useState(false);const touchStart=useRef<number|null>(null);
  const move=useCallback((direction:number)=>setActive(value=>(value+direction+slides.length)%slides.length),[]);
  useEffect(()=>{const visibility=()=>setTabHidden(document.hidden);document.addEventListener("visibilitychange",visibility);return()=>document.removeEventListener("visibilitychange",visibility)},[]);
  useEffect(()=>{if(paused||tabHidden||matchMedia("(prefers-reduced-motion: reduce)").matches)return;const timer=window.setInterval(()=>move(1),7000);return()=>window.clearInterval(timer)},[move,paused,tabHidden]);
  const current=slides[active]!;
  return <section className={styles.hero} aria-roledescription="carousel" aria-label="Tiv heritage highlights" tabIndex={0} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPaused(false)}} onKeyDown={event=>{if(event.key==="ArrowLeft")move(-1);if(event.key==="ArrowRight")move(1)}} onTouchStart={event=>{touchStart.current=event.touches[0]?.clientX??null;setPaused(true)}} onTouchEnd={event=>{if(touchStart.current!==null){const distance=(event.changedTouches[0]?.clientX??touchStart.current)-touchStart.current;if(Math.abs(distance)>45)move(distance>0?-1:1)}touchStart.current=null;setPaused(false)}}>
    <p className={styles.announcement} aria-live="polite" aria-atomic="true">Now showing: {current.title}</p>
    {slides.map((slide,index)=><article className={`${styles.slide} ${styles[slide.id]} ${index===active?styles.active:""}`} aria-hidden={index!==active} key={slide.id}><div className={styles.copy}><span className={styles.eyebrow}>{slide.label}</span><h1>{slide.title}</h1><p>{slide.excerpt}</p><div className={styles.actions}><Link className={styles.primary} href={slide.buttonUrl}>{slide.buttonText}</Link></div></div><div className={styles.visual}><img className={styles.media} src={slide.imageUrl} alt={slide.imageAlt}/></div></article>)}
    <button className={`${styles.arrow} ${styles.previous}`} aria-label="Previous featured slide" onClick={()=>move(-1)}>←</button><button className={`${styles.arrow} ${styles.next}`} aria-label="Next featured slide" onClick={()=>move(1)}>→</button><div className={styles.controls}>{slides.map((slide,index)=><button key={slide.id} aria-label={`Show ${slide.title}`} aria-current={index===active} onClick={()=>setActive(index)}/>)}</div>
  </section>;
}
