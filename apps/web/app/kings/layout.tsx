import type {Metadata} from "next";

export const metadata:Metadata={
  title:"The Tor Tiv Dynasty",
  description:"Explore the kings and paramount rulers of the Tiv nation through the Tiv Songs heritage archive."
};

export default function KingsLayout({children}:{children:React.ReactNode}){
  return children;
}
