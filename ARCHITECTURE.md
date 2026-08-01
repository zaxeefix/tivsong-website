# Tiv Songs Architecture

## System overview

Tiv Songs is a TypeScript monorepo containing a Next.js public/admin application and an Express API. PostgreSQL is the production system of record; SQLite is used only for local development. Prisma owns schema access. Media is validated and processed with FFmpeg before it becomes public.

The current API router remains intact for backward compatibility. New work follows a gradual module-extraction strategy described in `apps/api/src/modules/README.md`.

## Technology stack

| Layer | Technology |
|---|---|
| Web | Next.js 16 App Router, React 19, TypeScript, CSS Modules |
| API | Express 5, TypeScript, Zod |
| Data | Prisma ORM, PostgreSQL 16 production, SQLite local |
| Authentication | JWT access/refresh tokens in HttpOnly cookies, bcrypt |
| Media | Multer, file signature validation, FFmpeg |
| Realtime | Server-Sent Events |
| Security | Helmet, CORS allowlist, CSRF origin checks, rate limiting |
| Testing | Vitest, Supertest, TypeScript |
| Deployment | Render-compatible Node services, managed PostgreSQL, object storage recommended |

## Repository structure

```text
Tivsong website/
├── apps/
│   ├── api/
│   │   ├── prisma/             # schemas, migrations, seed and data normalization
│   │   └── src/
│   │       ├── config/         # validated environment
│   │       ├── database/       # Prisma lifecycle
│   │       ├── docs/           # OpenAPI contract
│   │       ├── middleware/     # centralized error handling
│   │       ├── modules/        # staged feature-module boundaries
│   │       ├── routes/         # backward-compatible API router
│   │       ├── app.ts          # HTTP middleware composition
│   │       └── server.ts       # process lifecycle
│   └── web/
│       ├── app/                # Next.js routes and server/client components
│       └── public/             # static assets and PWA files
├── assets/                     # source heritage assets
├── docker-compose.yml          # local PostgreSQL
└── *.md                        # engineering documentation
```

## Component diagram

```mermaid
flowchart LR
  Browser["Browser / PWA"] --> Web["Next.js web service"]
  Web -->|"same-origin /api rewrite"| API["Express API"]
  API --> Auth["Auth and RBAC"]
  API --> CMS["CMS and moderation"]
  API --> Media["Upload and streaming"]
  API --> Prisma["Prisma repository layer"]
  Prisma --> DB[("PostgreSQL")]
  Media --> Storage[("Local disk today\nR2/S3 target")]
  Media --> FFmpeg["FFmpeg processing"]
  API --> SSE["SSE event stream"]
  SSE --> Browser
  Admin["Administrator"] --> Web
```

## API and database flow

```mermaid
sequenceDiagram
  participant C as Client
  participant M as Express middleware
  participant R as Route/controller
  participant V as Zod
  participant P as Prisma
  participant D as PostgreSQL
  C->>M: HTTPS request
  M->>M: Helmet, CORS, rate limit, CSRF
  M->>R: Authorized request
  R->>V: Parse params/query/body
  V-->>R: Typed input
  R->>P: Query or transaction
  P->>D: Parameterized SQL
  D-->>P: Rows
  P-->>R: Typed records
  R-->>C: JSON / media / SSE
```

## Authentication flow

```mermaid
sequenceDiagram
  participant U as User
  participant A as API
  participant D as Database
  U->>A: POST /account/login
  A->>D: Find user and compare bcrypt hash
  A->>D: Record login attempt and session
  A-->>U: HttpOnly access + refresh cookies
  U->>A: Protected request
  A->>A: Verify JWT
  A->>D: Check live account status
  A-->>U: Authorized response
  U->>A: POST /account/refresh
  A->>D: Verify and rotate session hash
  A-->>U: Rotated HttpOnly cookies
```

Member and artist registration are separate. Only artist registration creates an `Artist` row. Administrators use a separate cookie and `admin`/`super_admin` role claim.

## Upload and streaming flow

```mermaid
flowchart TD
  Upload["Authenticated multipart upload"] --> Limits["Size and file-count limits"]
  Limits --> Signature["Magic-byte MIME validation"]
  Signature --> Scan{"VIRUS_SCAN_URL configured?"}
  Scan -->|Yes| Malware["Private malware scanner"]
  Scan -->|No| Process
  Malware --> Process["Bounded FFmpeg slot"]
  Process --> Variants["Audio variants / optimized MP4 or WebP"]
  Variants --> Record["Prisma media record: pending review"]
  Record --> Review["Administrator moderation"]
  Review -->|Published| Stream["Public/signed media endpoint"]
  Review -->|Rejected| Private["Remains non-public"]
```

Local media works for one API instance. Production scale requires the storage abstraction and an R2/S3 provider; FFmpeg should then run in a queue worker.

## Admin, CMS and moderation workflows

```mermaid
flowchart LR
  AdminLogin["Admin login"] --> Dashboard
  Dashboard --> Users["User moderation"]
  Dashboard --> Content["Song/video/community review"]
  Dashboard --> CMS["Settings and CMS"]
  Dashboard --> Comments["Comment queue"]
  Users --> Audit[("AuditLog")]
  Content --> Audit
  CMS --> Audit
  Comments --> Audit
  CMS --> Events["SSE broadcast"]
  Comments --> Events
  Events --> Frontend["Live frontend refresh"]
```

## Deployment architecture

```mermaid
flowchart TB
  DNS["DNS + TLS/CDN"] --> Web["Next.js service"]
  Web --> API["Express API service"]
  API --> PG[("Managed PostgreSQL")]
  API --> Object[("Cloudflare R2 / Amazon S3")]
  API --> Queue[("Redis / BullMQ target")]
  Queue --> Worker["Media worker target"]
  Worker --> Object
  Monitor["Logs, uptime, alerts"] --> Web
  Monitor --> API
  Backup["Automated backups"] --> PG
```

## Security architecture

Trust boundaries exist at the CDN/TLS edge, Next.js rewrite, API middleware, authentication middleware, Prisma, scanner and object storage. State-changing browser requests require a trusted origin. Cookies are HttpOnly, `SameSite=Lax`, secure in production and scoped to `/api`. Passwords use bcrypt; refresh tokens are stored only as SHA-256 hashes. All administrator mutations should create an audit record.

See [SECURITY.md](SECURITY.md) for controls and remaining risks.
