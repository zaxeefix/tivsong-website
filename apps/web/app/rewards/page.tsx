"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import SiteFooter from "../components/SiteFooter";
import styles from "../leaderboard/leaderboard.module.css";

type Winner={id:string;category:string;rank:number;score:number;certificateCode:string;user:{username:string;displayName:string;avatarUrl:string|null}};
type Campaign={id:string;name:string;amount:number|null;currency:string;rewardType:string;rewardDate:string;winners:Winner[]};

export default function RewardsPage(){
  const [campaigns,setCampaigns]=useState<Campaign[]>([]),[error,setError]=useState("");
  useEffect(()=>{fetch("/api/rewards").then(async response=>{if(!response.ok)throw new Error("Rewards are temporarily unavailable");return response.json()}).then(setCampaigns).catch(reason=>setError(reason.message))},[]);
  return <main className={styles.page}><nav className={styles.nav}><Link href="/" className={styles.brand}>TIV SONGS</Link><Link className={styles.link} href="/leaderboard">Leaderboard</Link></nav><header className={styles.hero}><span>MONTHLY RECOGNITION</span><h1>Contributor Rewards</h1><p>Published winners are calculated from verified activity. Certificates can be downloaded and checked by their unique code.</p></header>{error&&<p className={styles.error}>{error}</p>}<div className={styles.grid}>{campaigns.map(campaign=><section className={styles.panel} key={campaign.id}><h2>{campaign.name}</h2><p>{campaign.rewardType}{campaign.amount?` · ${campaign.currency} ${campaign.amount.toLocaleString()}`:""} · {new Date(campaign.rewardDate).toLocaleDateString()}</p>{campaign.winners.map(winner=><article className={styles.row} key={winner.id}><b>{winner.rank}</b><span><strong>{winner.user.displayName}</strong><small>@{winner.user.username} · {winner.category.replaceAll("_"," ")} · {winner.score} pts</small></span><a href={`/api/rewards/certificates/${winner.certificateCode}`} download>Certificate</a></article>)}</section>)}{!campaigns.length&&!error&&<section className={styles.panel}><h2>No published rewards yet</h2><p>Published monthly winners will appear here.</p></section>}</div><SiteFooter variant="community"/></main>;
}
