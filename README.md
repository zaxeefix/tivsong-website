# Tiv Songs

Tiv Songs is a music-streaming and cultural-heritage platform for preserving and promoting Tiv music.

## Engineering documentation

- [Architecture](ARCHITECTURE.md)
- [Database and ERD](DATABASE.md)
- [API and Swagger](API.md)
- [Security](SECURITY.md)
- [Deployment](DEPLOYMENT.md)
- [Performance](PERFORMANCE.md)
- [Project health](PROJECT_HEALTH.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)

When the API is running, open `http://localhost:4000/api/docs` for Swagger UI or `/api/openapi.json` for the OpenAPI 3.1 document.

## Production release

Requirements: Node.js 20+, PostgreSQL 16+, FFmpeg support from the bundled API dependency, TLS at the reverse proxy, and persistent storage for `UPLOAD_DIR`.

1. Copy `.env.example` into your secret manager. Never commit the populated file.
2. Set unique 32+ character JWT secrets and different 12+ character administrator passwords.
3. Set `WEB_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_SITE_URL` to HTTPS production origins.
4. Provision PostgreSQL and run `npm run db:deploy`.
5. Run `npm ci`, `npm run lint`, `npm test`, and `npm run build`.
6. Start the API and web workspaces behind a TLS reverse proxy. Enable HTTP/2 or HTTP/3 and Brotli compression at the proxy; Next.js and the API already emit production cache and security policies.
7. Persist and back up `UPLOAD_DIR`. For multi-instance deployments, replace local uploads with shared object storage and move FFmpeg work to a queue-backed media worker.
8. Set `VIRUS_SCAN_URL` to a private malware-scanning service before accepting public uploads. The API streams the raw upload to that endpoint and fails closed if scanning fails.
9. Configure centralized logs, uptime checks against `/api/health`, database backups, disk alerts, and process restarts.

Production startup deliberately fails when administrator credentials or required web URLs are missing. Access tokens are short-lived and refresh credentials are HttpOnly cookies; “Remember me” controls refresh-cookie persistence. The web app includes a production-only service worker, offline fallback, install prompt, and explicit update notification.

Do not place the API directly on the public internet. Restrict the scanner and database to the private network, terminate TLS at the proxy, forward the original client IP safely, and rotate all secrets through the deployment secret manager.
