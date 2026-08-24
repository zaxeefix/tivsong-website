"use client";

const providers=["Google","Apple","Facebook"] as const;

export default function SocialAuthOptions({className,dividerClassName}:{className:string;dividerClassName:string}){
  return <><div className={className} aria-label="Social sign-in providers">
    {providers.map(provider=><button key={provider} type="button" disabled aria-disabled="true" title={`${provider} authentication is awaiting secure provider configuration`}>Continue with {provider}<small>Awaiting configuration</small></button>)}
  </div><div className={dividerClassName}><span>or continue with email</span></div></>;
}
