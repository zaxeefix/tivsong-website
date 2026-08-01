import type {Metadata} from "next";

export const metadata:Metadata={
  title:"Account",
  description:"Sign in, register and manage private music, video and community submissions on Tiv Songs.",
  alternates:{canonical:"/account"},
  robots:{index:false,follow:false}
};

export default function AccountLayout({children}:{children:React.ReactNode}){
  return children;
}
