import "dotenv/config";
import {prisma} from "../src/database/prisma.js";

async function normalizeAccountTypes(){
  const individuals=await prisma.user.findMany({
    where:{accountType:"individual"},
    include:{artist:{include:{_count:{select:{songs:true,videos:true,albums:true}}}},roles:{include:{role:true}}}
  });
  const memberRole=await prisma.role.upsert({where:{name:"member"},update:{},create:{name:"member"}});
  const artistRole=await prisma.role.upsert({where:{name:"artist"},update:{},create:{name:"artist"}});
  let members=0,artists=0;
  for(const user of individuals){
    const content=(user.artist?._count.songs||0)+(user.artist?._count.videos||0)+(user.artist?._count.albums||0);
    if(user.artist&&content>0){
      await prisma.$transaction([
        prisma.user.update({where:{id:user.id},data:{accountType:"artist"}}),
        prisma.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:artistRole.id}},update:{},create:{userId:user.id,roleId:artistRole.id}})
      ]);
      artists++;continue;
    }
    await prisma.$transaction([
      ...(user.artist?[prisma.artist.delete({where:{id:user.artist.id}})]:[]),
      prisma.userRole.deleteMany({where:{userId:user.id,role:{name:{in:["uploader","artist","artist_pending"]}}}}),
      prisma.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:memberRole.id}},update:{},create:{userId:user.id,roleId:memberRole.id}})
    ]);
    members++;
  }
  console.info(`Account normalization complete: ${members} members, ${artists} content owners preserved as artists.`);
}

normalizeAccountTypes().finally(()=>prisma.$disconnect());
