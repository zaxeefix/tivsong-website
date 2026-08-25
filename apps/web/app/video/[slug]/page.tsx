import type {Metadata} from "next";
import {notFound} from "next/navigation";
import PublicDetail from "../../components/PublicDetail";
import {publicApi,siteUrl,slugify} from "../../lib/public-api";

type Video={id:string;slug:string;title:string;description:string|null;thumbnailUrl:string|null;videoUrl:string|null;artist:{stageName:string;imageUrl:string|null}|null;contributor:{username:string;displayName:string;avatarUrl:string|null}|null};
const getVideo=(slug:string)=>publicApi<Video>(`/videos/${encodeURIComponent(slug)}`);
const creator=(item:Video)=>item.artist?.stageName||item.contributor?.displayName||"Tiv Songs contributor";
const creatorImage=(item:Video)=>item.thumbnailUrl||item.artist?.imageUrl||item.contributor?.avatarUrl||null;

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params,item=await getVideo(slug);if(!item)return{};
  const name=creator(item),url=`${siteUrl}/video/${item.slug}`,description=item.description||`Watch ${item.title} by ${name} on Tiv Songs.`,image=creatorImage(item)||"/assets/tiv-song-logo.jpeg";
  return{title:`${item.title} · Video`,description,alternates:{canonical:url},openGraph:{type:"video.other",url,title:item.title,description,images:[image]},twitter:{card:"summary_large_image",title:item.title,description,images:[image]}};
}

export default async function VideoPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,item=await getVideo(slug);if(!item)notFound();
  const name=creator(item),url=`${siteUrl}/video/${item.slug}`,schema={"@context":"https://schema.org","@type":"VideoObject",name:item.title,description:item.description||item.title,thumbnailUrl:item.thumbnailUrl||undefined,contentUrl:item.videoUrl||undefined,url};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replaceAll("<","\\u003c")}}/><PublicDetail kind="video" id={item.id} title={item.title} creator={name} description={item.description||"Watch this Tiv music video and join the conversation."} image={creatorImage(item)} mediaUrl={item.videoUrl} mediaKind="video" url={url} artistUrl={item.artist?`/artist/${slugify(item.artist.stageName)}`:item.contributor?`/contributor/${item.contributor.username}`:undefined}/></>;
}
