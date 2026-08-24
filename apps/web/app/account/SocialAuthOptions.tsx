"use client";

const providers=[
  {name:"Google",enabled:process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED==="true",href:"/api/account/oauth/google"},
  {name:"Apple",enabled:process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED==="true",href:"/api/account/oauth/apple"},
  {name:"Facebook",enabled:process.env.NEXT_PUBLIC_FACEBOOK_AUTH_ENABLED==="true",href:"/api/account/oauth/facebook"}
].filter(provider=>provider.enabled);

export default function SocialAuthOptions({className,dividerClassName}:{className:string;dividerClassName:string}){
  if(!providers.length)return null;
  return <><div className={className} aria-label="Social sign-in providers">
    {providers.map(provider=><a key={provider.name} href={provider.href}>Continue with {provider.name}</a>)}
  </div><div className={dividerClassName}><span>or continue with email</span></div></>;
}
