import Image from "next/image";
import Link from "next/link";
import FooterCms from "./FooterCms";
import SocialMediaStrip from "./SocialMediaStrip";
import styles from "./SiteFooter.module.css";

const messages={account:"A private and responsible workspace for preserving Tiv creativity.",community:"Connecting Tiv people, activities and cultural stories worldwide.",heritage:"Preserving Tiv leadership, memory and identity across generations.",general:"The digital home of Tiv music, people, history and cultural heritage."} as const;

export default function SiteFooter({variant="general"}:{variant?:keyof typeof messages}){
  return <><SocialMediaStrip/><footer className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.identity}>
        <Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="Tiv Songs" width={46} height={46}/><span>TIV SONGS</span></Link>
        <p>{messages[variant]}</p>
        <FooterCms/>
      </div>
      <nav className={styles.links} aria-label="Footer navigation">
        <div><strong>Explore</strong><Link href="/#songs">Songs</Link><Link href="/#videos">Videos</Link><Link href="/#artists">Artists</Link></div>
        <div><strong>Culture</strong><Link href="/kings">Tor Tiv</Link><Link href="/governors.html">Governors</Link><Link href="/community">Community</Link></div>
        <div><strong>Contribute</strong><Link href="/account">Account</Link><Link href="/account?mode=register">Register</Link><Link href="/community#share">Share activity</Link></div>
        <div><strong>Support</strong><Link href="/#about">About Tiv Songs</Link><Link href="/#privacy">Privacy Policy</Link><Link href="/#terms">Terms of Service</Link><Link href="/#contact">Contact</Link></div>
      </nav>
    </div>
    <div className={styles.bottom}><span>© 2026 Tiv Songs. All rights reserved.</span><span>Where real music and culture live.</span></div>
  </footer></>;
}
