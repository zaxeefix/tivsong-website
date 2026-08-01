# Tiv Songs API

The API is mounted at `/api`. The authoritative machine-readable contract is available at:

- `GET /api/openapi.json` — OpenAPI 3.1
- `GET /api/docs` — interactive Swagger UI

The contract inventories every current public, account, CMS and administrator operation without changing any existing path.

## Conventions

- JSON request and response bodies use UTF-8.
- Upload endpoints use `multipart/form-data`.
- Validation failures return HTTP 422 with `{ "error": "Validation failed", "details": ... }`.
- Authentication uses HttpOnly cookies. Browsers must use same-origin `/api` requests with credentials.
- List endpoints generally accept `page`, `pageSize`/`limit`, `search`, `status`, `sort` and `direction` where documented.
- Media BigInts are serialized as strings.
- `/cms/events` is an SSE stream.

## Endpoint groups

| Group | Prefix and purpose |
|---|---|
| System/docs | `/health`, `/openapi.json`, `/docs` |
| Public catalog | `/songs`, `/videos`, `/artists`, `/categories` |
| Heritage/community | `/tor-tiv`, `/community` |
| Media | `/media/{kind}/{file}` |
| Account auth | `/account/register`, `/account/login`, `/account/refresh`, `/account/logout` |
| Account workspace | `/account/me`, `/account/songs`, `/account/videos`, `/account/community`, `/account/media`, notifications |
| Comments/reports | `/comments`, `/reports` |
| CMS/realtime | `/cms/settings`, `/cms/entries/{kind}`, `/cms/events` |
| Discovery | `/search`, `/search/suggestions`, `/analytics` |
| Admin auth | `/admin/login`, `/admin/refresh`, `/admin/logout`, `/admin/session` |
| Admin control plane | `/admin/settings`, `/admin/cms`, `/admin/media`, `/admin/comments`, `/admin/users`, `/admin/reports`, `/admin/audit`, `/admin/analytics` |

## Authentication

Account access tokens expire after 15 minutes by default. Refresh tokens are rotated and their SHA-256 hashes are stored in `Session`. Administrator sessions use separate cookies and claims. `super_admin` is required for donation mutation, permanent user erasure and backup export.

## Compatibility policy

Existing method/path combinations are public contracts. Breaking changes require a versioned `/api/v2` route, migration guide and deprecation window. Adding optional response fields is allowed; removing or renaming fields is not.
