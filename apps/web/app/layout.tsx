import type {Metadata} from "next";
import "./globals.css";
import PwaManager from "./components/PwaManager";
import CmsRuntime from "./components/CmsRuntime";
import SocialMediaBar from "./components/SocialMediaBar";

const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";

export const metadata:Metadata={
  title:{default:"Tiv Songs — Where Real Music Is",template:"%s · Tiv Songs"},
  description:"Discover, stream and preserve Tiv music, artists, Tor Tiv heritage, Benue leadership and worldwide Tiv community activities.",
  metadataBase:new URL(siteUrl),
  alternates:{canonical:"/"},
  openGraph:{type:"website",siteName:"Tiv Songs",title:"Tiv Songs — Where Real Music Is",description:"The digital home of Tiv music and cultural heritage.",url:"/",images:[{url:"/assets/tiv-song-logo.jpeg",width:1200,height:1200,alt:"Tiv Songs"}]},
  twitter:{card:"summary_large_image",title:"Tiv Songs — Where Real Music Is",description:"The digital home of Tiv music and cultural heritage.",images:["/assets/tiv-song-logo.jpeg"]},
  icons:{
    icon:[{url:"/assets/tiv-song-logo.jpeg",type:"image/jpeg"}],
    shortcut:"/assets/tiv-song-logo.jpeg",
    apple:"/icon-192.png"
  },
  robots:{index:true,follow:true},
  manifest:"/manifest.webmanifest"
};

const themeBootstrap=`(()=>{try{const saved=localStorage.getItem("tiv-songs-theme");const theme=saved==="light"||saved==="dark"?saved:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark"}})()`;
const structuredData={"@context":"https://schema.org","@type":"WebSite",name:"Tiv Songs",url:siteUrl,description:"The digital home of Tiv music and cultural heritage.",potentialAction:{"@type":"SearchAction",target:`${siteUrl}/?q={search_term_string}`,"query-input":"required name=search_term_string"}};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en" data-theme="dark" suppressHydrationWarning><head><meta name="theme-color" content="#20003b"/><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/></head><body>{children}<SocialMediaBar/><CmsRuntime/><PwaManager/></body></html>;
}
