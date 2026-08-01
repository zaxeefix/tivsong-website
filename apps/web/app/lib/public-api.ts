export const apiOrigin=(process.env.API_URL||"http://localhost:4000/api").replace(/\/$/,"");
export async function publicApi<T>(path:string):Promise<T|null>{const response=await fetch(`${apiOrigin}${path}`,{next:{revalidate:60}}).catch(()=>null);if(!response?.ok)return null;return response.json() as Promise<T>}
export const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
export const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
