import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:{default:"Tiv Songs",template:"%s · Tiv Songs"},description:"The digital home of Tiv music and cultural heritage.",metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000")};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
