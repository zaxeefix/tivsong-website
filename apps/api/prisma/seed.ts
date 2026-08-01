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

try{
  await Promise.all(categories.map(([name,slug])=>
    prisma.category.upsert({where:{slug},update:{name},create:{name,slug}})
  ));
}finally{
  await prisma.$disconnect();
}
