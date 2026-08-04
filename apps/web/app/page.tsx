import Image from "next/image";
import Link from "next/link";
import HeroSlider from "./components/HeroSlider";

const kings=[["Makir Zakpe","1946–1956","/heritage/makir-zakpe.jpg"],["Gondo Aluor","1956–1978",null],["James Akperan Orshi","1979–1990",null],["Alfred Akawe Torkula","1991–2015","/heritage/alfred-torkula.jpg"],["Prof. James Ayatse","2017–Present","/heritage/james-ayatse.jpg"]] as const;

export default function Home(){return <><header><Link className="brand" href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="Tiv Songs" width={54} height={54} priority/>TIV SONGS</Link><nav><Link href="#music">Music</Link><Link href="#heritage">Heritage</Link><Link href="/governors">Governors</Link></nav><Link className="button light" href="/account">Sign in</Link></header><main><HeroSlider/><section id="heritage" className="section"><div className="sectionHead"><div><small>THE TOR TIV DYNASTY</small><h2>A living timeline of leadership.</h2></div></div><div className="grid">{kings.map(([name,reign,image],i)=><article className="card" key={name}><div className="portrait">{image?<Image src={image} alt={name} fill sizes="(max-width: 700px) 100vw, 300px"/>:<strong>{name.split(" ").map(x=>x[0]).join("")}</strong>}<span>TOR TIV 0{i+1}</span></div><div className="cardBody"><small>{reign}</small><h3>{name}</h3></div></article>)}</div></section></main></>}
