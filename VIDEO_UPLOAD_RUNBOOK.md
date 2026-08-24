# Video upload production runbook

## Architecture

Video bytes no longer pass through Next.js or the Render API process. An authenticated contributor creates a short-lived upload session, uploads directly to the configured private S3-compatible bucket, and asks the API to finalise the session. Finalisation verifies object size, content type and file signature before atomically creating the video record and changing the upload to `PENDING_REVIEW`.

The legacy `/api/account/media` endpoint remains available for audio and backward compatibility. Video clients should use:

1. `POST /api/account/video-uploads`
2. `PUT` the file to the returned signed URL
3. `POST /api/account/video-uploads/{uploadId}/finalize`

Finalisation is idempotent. Cancelling marks the session as a draft and never deletes an uploaded object automatically.

## Backblaze B2 CORS

Configure the media bucket to allow the production and preview web origins to perform `PUT` requests. Allow the `Content-Type` request header and expose `ETag`. Do not make the bucket public and do not put application keys in Vercel.

The Vercel build environment must also contain `S3_ENDPOINT` so the generated Content Security Policy permits direct connections to that exact origin. Render retains `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` for signing and verification.

## Safe reconciliation

An administrator can request `GET /api/admin/upload-reconciliation`. The report lists recoverable sessions, database rows with missing objects, orphaned objects, stale sessions, and recommended actions. The endpoint is read-only and never publishes or deletes anything.

## Release gate

Before deploying, back up the production database and record table and bucket counts using the provider consoles. Then test a private MP4 end-to-end using an approved contributor account. The release is blocked unless storage confirms the object, the `Video` and `Upload` rows exist with the same owner, and both records are `PENDING_REVIEW`.
