import {beforeAll,describe,expect,it,vi} from "vitest";
import request from "supertest";
import type {Express} from "express";

let app:Express;
const adminEmail="admin@example.com";
const adminPassword="correct-horse-battery";

beforeAll(async()=>{
  Object.assign(process.env,{
    NODE_ENV:"test",
    WEB_URL:"http://localhost:3000",
    DATABASE_URL:"file:./test.db",
    JWT_ACCESS_SECRET:"access-secret-that-is-at-least-32-characters",
    JWT_REFRESH_SECRET:"refresh-secret-that-is-at-least-32-characters",
    ADMIN_EMAIL:adminEmail,
    ADMIN_PASSWORD:adminPassword,
    SUPER_ADMIN_EMAIL:"owner@example.com",
    SUPER_ADMIN_PASSWORD:"another-correct-horse-battery"
  });
  const sessions=new Map<string,Record<string,unknown>>();
  vi.doMock("./database/prisma.js",()=>({prisma:{adminSession:{
    create:vi.fn(async({data}:{data:Record<string,unknown>})=>{sessions.set(String(data.id),data);return data}),
    findUnique:vi.fn(async({where}:{where:{id:string}})=>sessions.get(where.id)||null),
    update:vi.fn(async({where,data}:{where:{id:string};data:Record<string,unknown>})=>{const value={...sessions.get(where.id),...data};sessions.set(where.id,value);return value}),
    updateMany:vi.fn(async({where,data}:{where:{refreshTokenHash?:string};data:Record<string,unknown>})=>{let count=0;for(const [id,value] of sessions)if(!where.refreshTokenHash||value.refreshTokenHash===where.refreshTokenHash){sessions.set(id,{...value,...data});count++}return {count}})
  }}}));
  app=(await import("./app.js")).app;
},60_000);

describe("API security boundaries",()=>{
  it("does not expose framework identity",async()=>{
    const response=await request(app).get("/api/not-a-route");
    expect(response.status).toBe(404);
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects cross-site state-changing requests",async()=>{
    const response=await request(app).post("/api/admin/login")
      .set("Origin","https://attacker.example")
      .send({email:adminEmail,password:adminPassword});
    expect(response.status).toBe(403);
  });

  it("rejects browser-declared cross-site mutations without an Origin header",async()=>{
    const response=await request(app).post("/api/admin/login")
      .set("Sec-Fetch-Site","cross-site")
      .send({email:adminEmail,password:adminPassword});
    expect(response.status).toBe(403);
  });

  it("issues an HttpOnly cookie without returning the JWT",async()=>{
    const response=await request(app).post("/api/admin/login")
      .set("Origin","http://localhost:3000")
      .send({email:adminEmail,password:adminPassword});
    expect(response.status).toBe(200);
    expect(response.body.token).toBeUndefined();
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
  });

  it("protects administrator endpoints and accepts the session cookie",async()=>{
    await request(app).get("/api/admin/session").expect(401);
    const agent=request.agent(app);
    await agent.post("/api/admin/login")
      .set("Origin","http://localhost:3000")
      .send({email:adminEmail,password:adminPassword})
      .expect(200);
    const response=await agent.get("/api/admin/session");
    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
  });

  it("refreshes a remembered administrator session using only HttpOnly cookies",async()=>{
    const agent=request.agent(app);
    const login=await agent.post("/api/admin/login")
      .set("Origin","http://localhost:3000")
      .send({email:adminEmail,password:adminPassword,remember:true});
    expect(login.status).toBe(200);
    expect(String(login.headers["set-cookie"])).toContain("admin_refresh=");

    const refreshed=await agent.post("/api/admin/refresh")
      .set("Origin","http://localhost:3000");
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refreshed).toBe(true);
    expect(refreshed.body.token).toBeUndefined();
  });

  it("revokes the administrator refresh session on logout",async()=>{
    const agent=request.agent(app);
    await agent.post("/api/admin/login").set("Origin","http://localhost:3000").send({email:adminEmail,password:adminPassword,remember:true}).expect(200);
    await agent.post("/api/admin/logout").set("Origin","http://localhost:3000").expect(204);
    await agent.post("/api/admin/refresh").set("Origin","http://localhost:3000").expect(401);
  });
});
