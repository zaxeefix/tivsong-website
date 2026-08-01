import {redirect} from "next/navigation";
export default async function TorTivPermanentPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;redirect(`/profiles/kings/${encodeURIComponent(slug)}`)}
