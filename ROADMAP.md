# Tiv Songs Roadmap

## Next: production hardening

- Integrate Cloudflare R2/S3 storage provider
- Add private malware scanner
- Centralize JSON logs and alerts
- Add CI dependency/secret/container scanning
- Expand integration tests around registration, uploads and moderation

## Scale phase

- Introduce Redis and BullMQ
- Move FFmpeg, thumbnails, email and notifications to workers
- Add idempotent job records and dead-letter handling
- Add WebSocket gateway only for bidirectional features; retain SSE for broadcast updates

## Maintainability phase

- Extract auth and accounts from the legacy router first
- Extract uploads/media, comments/moderation, CMS and admin in bounded pull requests
- Generate request/response schemas into the OpenAPI contract
- Add database-backed staff accounts, permissions and MFA

## Product phase

- Native-app universal links
- Artist analytics and royalty-ready reporting
- Localization and Tiv-language editorial workflows
- Enhanced search indexing and CDN media delivery

Each phase must retain existing URLs and migrate data with expand/migrate/contract releases.
