import Image from "next/image";
import styles from "./loading.module.css";

export default function Loading(){
  return <main className={styles.loading} role="status" aria-live="polite">
    <div className={styles.mark}>
      <Image src="/assets/tiv-song-logo.jpeg" alt="" width={86} height={86} priority/>
    </div>
    <strong>TIV SONGS</strong>
    <span>Loading music and heritage…</span>
  </main>;
}
