import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"Tiv Songs — Music & Cultural Heritage",
    short_name:"Tiv Songs",
    description:"Stream Tiv music and explore Tiv cultural heritage, leadership and community.",
    start_url:"/",
    scope:"/",
    display:"standalone",
    orientation:"any",
    background_color:"#20003b",
    theme_color:"#20003b",
    categories:["music","entertainment","education"],
    icons:[
      {src:"/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
      {src:"/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},
      {src:"/icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}
    ],
    shortcuts:[
      {name:"Songs",short_name:"Songs",url:"/#songs"},
      {name:"Tor Tiv",short_name:"Tor Tiv",url:"/kings"},
      {name:"Community",short_name:"Community",url:"/community"}
    ]
  };
}
