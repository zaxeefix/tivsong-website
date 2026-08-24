"use client";

export function HeaderSearchButton({className}:{className?:string}){
  return <button className={className} type="button" aria-label="Search Tiv Songs" onClick={()=>window.dispatchEvent(new CustomEvent("tiv:open-search"))}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  </button>;
}
