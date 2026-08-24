"use client";

import Image from "next/image";
import Link from "next/link";
import PrimaryNavLinks from "./PrimaryNavLinks";
import PublicAccountMenu from "./PublicAccountMenu";
import ThemeToggle from "./ThemeToggle";
import {HeaderSearchButton} from "./HeaderActions";
import styles from "./SiteHeader.module.css";

export default function SiteHeader(){
  return <header className={styles.header}>
    <Link className={styles.brand} href="/"><Image src="/assets/tiv-song-logo.jpeg" alt="Tiv Songs" width={50} height={50} priority/><span>TIV SONGS<small>Where Tiv music lives</small></span></Link>
    <nav className={styles.desktopNav} aria-label="Primary navigation"><PrimaryNavLinks linkClassName={styles.navLink} activeClassName={styles.active}/></nav>
    <div className={styles.tools}><ThemeToggle/><HeaderSearchButton className={styles.search}/><PublicAccountMenu/></div>
    <details className={styles.mobileMenu}><summary aria-label="Open navigation">Menu</summary><nav><PrimaryNavLinks linkClassName={styles.mobileLink} activeClassName={styles.active}/><Link className={styles.mobileLink} href="/account">Account</Link></nav></details>
  </header>;
}
