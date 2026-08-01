import type {Metadata} from "next";

export const metadata:Metadata={
  title:"Worldwide Tiv Community Activities",
  description:"Explore past and upcoming Tiv cultural events, gatherings and activities from Nigeria and Tiv communities around the world.",
  alternates:{canonical:"/community"},
  openGraph:{title:"Worldwide Tiv Community Activities",description:"Tiv events and cultural activities from communities around the world.",url:"/community",images:["/assets/tiv-song-logo.jpeg"]},
  twitter:{card:"summary_large_image",title:"Worldwide Tiv Community Activities",description:"Tiv events and cultural activities from communities around the world.",images:["/assets/tiv-song-logo.jpeg"]}
};

export default function CommunityLayout({children}:{children:React.ReactNode}){return children}
