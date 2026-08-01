import type {MetadataRoute} from "next";
import {heritageProfiles} from "./data/heritageProfiles";
import {publicApi,slugify} from "./lib/public-api";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";
  const [songs,videos,artists,community]=await Promise.all([
    publicApi<{items:Array<{slug:string;updatedAt:string}>}>("/songs?limit=100"),
    publicApi<{items:Array<{slug:string;updatedAt:string}>}>("/videos?limit=50"),
    publicApi<Array<{stageName:string;updatedAt:string}>>("/artists"),
    publicApi<{items:Array<{id:string;title:string;updatedAt:string}>}>("/community?limit=60")
  ]);
  return [
    {url:base,changeFrequency:"daily",priority:1},
    {url:`${base}/community`,changeFrequency:"daily",priority:.9},
    {url:`${base}/kings`,changeFrequency:"monthly",priority:.8},
    {url:`${base}/governors.html`,changeFrequency:"monthly",priority:.7},
    {url:`${base}/account`,changeFrequency:"monthly",priority:.5},
    ...(songs?.items||[]).map(item=>({url:`${base}/song/${item.slug}`,lastModified:new Date(item.updatedAt),changeFrequency:"weekly" as const,priority:.8})),
    ...(videos?.items||[]).map(item=>({url:`${base}/video/${item.slug}`,lastModified:new Date(item.updatedAt),changeFrequency:"weekly" as const,priority:.75})),
    ...(artists||[]).map(item=>({url:`${base}/artist/${slugify(item.stageName)}`,lastModified:new Date(item.updatedAt),changeFrequency:"weekly" as const,priority:.8})),
    ...(community?.items||[]).map(item=>({url:`${base}/community/${slugify(item.title)}--${item.id}`,lastModified:new Date(item.updatedAt),changeFrequency:"weekly" as const,priority:.7})),
    ...heritageProfiles.map(item=>({url:item.kind==="king"?`${base}/heritage/tor-tiv/${item.slug}`:`${base}/governors/${item.slug}`,changeFrequency:"yearly" as const,priority:.65}))
  ];
}
