# Video upload production runbook

## Architecture

Video bytes no longer pass through Next.js or the Render API process. An authenticated contributor creates a short-lived upload session, uploads directly to the configured private S3-compatible bucket, and asks the API to finalise the session. Finalisation verifies object size, content type and file signature before atomically creating the video record and changing the upload to `PENDING_REVIEW`.

The legacy `/api/account/media` endpoint remains available for audio and backward compatibility. Video clients should use:

1. `POST /api/account/video-uploads` to create a private multipart session.
2. `GET /api/account/video-uploads/{uploadId}/parts` to discover parts already received after a retry.
3. `POST /api/account/video-uploads/{uploadId}/parts` for each 10 MB part to obtain a short-lived signed URL.
4. `PUT` each part directly to object storage and retain its exposed `ETag` response header.
5. `POST /api/account/video-uploads/{uploadId}/finalize` with the ordered part numbers and ETags.

Finalisation is idempotent after object completion. Each part is retried independently, so a transient failure does not restart a 1 GB file. Cancelling aborts only the incomplete multipart session and marks its database row as a draft; completed objects are never deleted by failed finalisation.

## Backblaze B2 CORS

Configure the media bucket to allow the production and preview web origins to perform `PUT` requests. Allow the `Content-Type` request header and expose `ETag`. Do not make the bucket public and do not put application keys in Vercel.

The web CSP permits Backblaze B2 S3 endpoints. For another S3-compatible provider, set `NEXT_PUBLIC_STORAGE_ORIGIN` in Vercel to the origin only (for example `https://s3.example.com`) and redeploy. Never put application keys in Vercel. Render retains `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` for signing and verification.

Backblaze bucket CORS rule (replace the origins with the deployed Vercel domains):

```json
[
  {
    "corsRuleName": "tiv-songs-web-upload",
    "allowedOrigins": ["https://tivsong-website-web.vercel.app"],
    "allowedHeaders": ["*"],
    "allowedOperations": ["s3_put"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```

## Safe reconciliation

An administrator can request `GET /api/admin/upload-reconciliation`. The report lists recoverable sessions, database rows with missing objects, orphaned objects, stale sessions, and recommended actions. The endpoint is read-only and never publishes or deletes anything.

## Release gate

Before deploying, back up the production database and record table and bucket counts using the provider consoles. Then test a private MP4 end-to-end using an approved contributor account. The release is blocked unless storage confirms the object, the `Video` and `Upload` rows exist with the same owner, and both records are `PENDING_REVIEW`.
