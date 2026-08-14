import {spawn} from "node:child_process";

const maximumAttempts=5;
const transientPattern=/P1001|P1002|advisory lock|database server is running|timed out trying to acquire/i;
const executable=process.platform==="win32"?"npx.cmd":"npx";
const pooledDatabaseUrl=process.env.DATABASE_URL?.trim();
const directDatabaseUrl=process.env.DIRECT_URL?.trim();

if(!pooledDatabaseUrl){
  console.error("DATABASE_URL is required for database deployment.");
  process.exit(1);
}
if(/-pooler\./i.test(pooledDatabaseUrl)&&!directDatabaseUrl){
  console.error("DIRECT_URL is required for Prisma migrations when DATABASE_URL uses a Neon pooled hostname. Copy the Direct connection string from Neon and add it to Render as DIRECT_URL.");
  process.exit(1);
}

const migrationUrl=(()=>{
  const value=directDatabaseUrl||pooledDatabaseUrl;
  try{
    const parsed=new URL(value);
    if(!parsed.searchParams.has("connect_timeout"))parsed.searchParams.set("connect_timeout","30");
    return parsed.toString();
  }catch{return value}
})();

const migrate=()=>new Promise(resolve=>{
  const child=spawn(executable,["prisma","migrate","deploy"],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:migrationUrl},windowsHide:true});
  let output="";
  child.stdout.on("data",chunk=>{const text=String(chunk);output+=text;process.stdout.write(text)});
  child.stderr.on("data",chunk=>{const text=String(chunk);output+=text;process.stderr.write(text)});
  child.on("error",error=>resolve({code:1,output:`${output}\n${error.message}`}));
  child.on("close",code=>resolve({code:code??1,output}));
});

for(let attempt=1;attempt<=maximumAttempts;attempt++){
  const result=await migrate();
  if(result.code===0)process.exit(0);
  if(!transientPattern.test(result.output)||attempt===maximumAttempts)process.exit(result.code);
  const delay=Math.min(attempt*10_000,30_000);
  console.warn(`Migration lock or database connection is busy. Retrying in ${delay/1000} seconds (${attempt}/${maximumAttempts})…`);
  await new Promise(resolve=>setTimeout(resolve,delay));
}
