import {beforeAll,describe,expect,it} from "vitest";
import request from "supertest";
import type {Express} from "express";

let app:Express;
const adminEmail="admin@example.com";
const adminPassword="correct-horse-battery";

beforeAll(async()=>{
  Object.assign(process.env,{
    NODE_ENV:"test",
    WEB_URL:"http://localhost:3000",
    DATABASE_URL:"postgresql://postgres:postgres@localhost:5432/tiv_songs_test",
    JWT_ACCESS_SECRET:"access-secret-that-is-at-least-32-characters",
    JWT_REFRESH_SECRET:"refresh-secret-that-is-at-least-32-characters",
    ADMIN_EMAIL:adminEmail,
    ADMIN_PASSWORD:adminPassword,
    SUPER_ADMIN_EMAIL:"owner@example.com",
    SUPER_ADMIN_PASSWORD:"another-correct-horse-battery"
  });
  app=(await import("./app.js")).app;
});

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
});
