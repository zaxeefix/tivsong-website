import {redirect} from "next/navigation";
export default async function GovernorPermanentPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;redirect(`/profiles/governors/${encodeURIComponent(slug)}`)}
