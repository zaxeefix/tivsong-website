const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api")
  .replace(/\/$/, "");
const isDevelopment=process.env.NODE_ENV==="development";
const contentSecurityPolicy=[
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment?" 'unsafe-eval'":""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: blob:",
  "connect-src 'self'",
  "font-src 'self' data:",
  ...(!isDevelopment?["upgrade-insecure-requests"]:[])
].join("; ");

if (process.env.NODE_ENV === "production") {
  if (!process.env.API_URL && !process.env.NEXT_PUBLIC_API_URL) throw new Error("API_URL is required for a production build");
  if (!process.env.NEXT_PUBLIC_SITE_URL) throw new Error("NEXT_PUBLIC_SITE_URL is required for a production build");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(!isDevelopment?[{key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains; preload"}]:[]),
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source:"/assets/:path*",
        headers:[{key:"Cache-Control",value:"public, max-age=604800, stale-while-revalidate=86400"}],
      },
      {
        source:"/sw.js",
        headers:[{key:"Cache-Control",value:"no-cache, no-store, must-revalidate"},{key:"Service-Worker-Allowed",value:"/"}],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
