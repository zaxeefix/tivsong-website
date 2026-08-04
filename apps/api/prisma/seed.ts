import {PrismaClient} from "@prisma/client";

const prisma=new PrismaClient();
const categories=[
  ["Traditional Songs","traditional-songs"],
  ["Swange","swange"],
  ["Gospel","gospel"],
  ["Cultural Dance","cultural-dance"],
  ["Wedding Songs","wedding-songs"],
  ["Burial Songs","burial-songs"],
  ["Praise Songs","praise-songs"],
  ["Modern Tiv Music","modern-tiv-music"]
] as const;
const badges=[
  ["new-contributor","New Contributor","Published a first approved contribution","spark"],
  ["top-contributor","Top Contributor","Ranked among the leading Tiv Songs contributors","trophy"],
  ["verified-artist","Verified Artist","Completed administrator artist verification","verified"],
  ["downloads-100","100 Downloads","Contributions reached one hundred downloads","download"],
  ["streams-1000","1000 Streams","Contributions reached one thousand streams","headphones"],
  ["community-champion","Community Champion","Made a sustained positive community contribution","community"],
  ["top-referrer","Top Referrer","Introduced active new members to Tiv Songs","referral"],
  ["monthly-winner","Monthly Winner","Won a published monthly Tiv Songs reward","medal"]
] as const;

try{
  await Promise.all(categories.map(([name,slug])=>
    prisma.category.upsert({where:{slug},update:{name},create:{name,slug}})
  ));
  await Promise.all(badges.map(([key,name,description,icon])=>
    prisma.badge.upsert({where:{key},update:{name,description,icon,active:true},create:{key,name,description,icon}})
  ));
}finally{
  await prisma.$disconnect();
}
