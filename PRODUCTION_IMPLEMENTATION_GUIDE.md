# Tiv Songs production implementation guide

## Required deployment order

1. Back up the production PostgreSQL database.
2. Create a private Backblaze B2 bucket named `tiv-songs-beta`. Do not enable public access or listing.
3. Add the environment variables below to Render.
4. Deploy the additive Prisma migration before starting the new API build.
5. If the old Render instance still contains local uploads, run `npm --workspace @tiv-songs/api run storage:migrate` once from that instance before it is replaced.
6. Deploy the API, verify `/api/health`, then deploy the frontend.
7. Test registration, login/refresh/logout, one audio upload, one video upload, admin approval, playback, download, comments, referral conversion, and reward calculation on staging.

## Render API environment

```text
NODE_ENV=production
PORT=4000
WEB_URL=https://tivsong-website-web.vercel.app
DATABASE_URL=<Render PostgreSQL connection string>
DIRECT_URL=<Neon direct connection string for migrations; hostname must not contain -pooler>
JWT_ACCESS_SECRET=<at least 32 random characters>
JWT_REFRESH_SECRET=<a different 32+ character secret>
ADMIN_EMAIL=<administrator email>
ADMIN_PASSWORD=<unique password of at least 12 characters>
SUPER_ADMIN_EMAIL=<owner email>
SUPER_ADMIN_PASSWORD=<different password of at least 12 characters>
REFRESH_TOKEN_DAYS=30
MAX_UPLOAD_MB=1024
MAX_TRANSCODES=2
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.<your-bucket-region>.backblazeb2.com
S3_REGION=<your-bucket-region, for example us-east-005>
S3_BUCKET=tiv-songs-beta
S3_ACCESS_KEY_ID=<Backblaze application key ID>
S3_SECRET_ACCESS_KEY=<Backblaze application key>
VIRUS_SCAN_URL=<recommended production scanning service URL>
```

The API intentionally refuses to start in production with `STORAGE_PROVIDER=local`, preventing silent media loss on an ephemeral Render filesystem.

Keep `DATABASE_URL` as the pooled Neon connection for normal API traffic. In the Neon **Connect** dialog, disable connection pooling and copy that connection string into Render as `DIRECT_URL`. The deployment script uses `DIRECT_URL` only for Prisma migrations and rejects a pooled Neon migration configuration with an actionable error.

Copy the endpoint and region exactly from the Backblaze Buckets page. Create a bucket-restricted Application Key with read and write access. Do not use the Backblaze account password and do not add these server-only credentials to Vercel.

## Vercel frontend environment

```text
API_URL=https://tivsong-website-api.onrender.com/api
NEXT_PUBLIC_SITE_URL=https://tivsong-website-web.vercel.app
```

Install command: `npm ci`
Build command: `npm --workspace @tiv-songs/web run build`
Root directory: repository root

## Render commands

Build command:

```text
npm ci --include=dev && npm run db:generate && npm exec --workspace @tiv-songs/api -- prisma generate --schema prisma/schema.local.prisma && npm --workspace @tiv-songs/api run build
```

Pre-deploy command:

```text
npm --workspace @tiv-songs/api run db:deploy
```

Start command:

```text
npm --workspace @tiv-songs/api run start
```

Do not paste labels such as `Build Command:` or `Start Command:` into Render's command fields.

## Rollback safety

The new migration only adds tables, indexes, and nullable columns. Existing content rows are not deleted. During rollback, old `/api/media/audio|video|community/...` URLs remain readable. Do not remove the old upload directory until object counts, checksums, and playback have been verified.
