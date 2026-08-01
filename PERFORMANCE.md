# Tiv Songs Performance Report

## Current strengths

- Public list/detail responses use explicit limits and cache headers.
- Next.js statically renders stable pages and server-renders dynamic SEO pages.
- Images/media use lazy loading where appropriate.
- Audio variants support bandwidth-sensitive streaming.
- FFmpeg concurrency is bounded.
- Prisma selects/includes are scoped on high-traffic routes.
- SSE avoids polling for approved comments and CMS updates.
- Production builds pass route optimization.

## Bottlenecks

| Priority | Finding | Recommendation |
|---|---|---|
| High | FFmpeg runs in the API process | Move processing to BullMQ workers with Redis, idempotent jobs and progress events. |
| High | Local disk prevents multi-instance media service | Implement R2/S3 storage adapter and CDN delivery. |
| High | A single large router increases change cost | Extract feature modules incrementally with characterization tests. |
| Medium | Artist slug lookup scans verified artists | Store a unique normalized Artist slug in a future additive migration. |
| Medium | “Most replied” comment sorting is partially in memory | Add a reply-count field or database aggregation when volume warrants it. |
| Medium | Analytics group-by queries run synchronously | Pre-aggregate daily metrics or cache the admin dashboard. |
| Medium | Search uses relational `contains` | Introduce PostgreSQL full-text/trigram indexes before catalog growth. |
| Low | Some legacy/static assets are duplicated | Inventory references, then remove only demonstrably unused copies. |

## Query and index review

Existing indexes cover publication feeds, user/status lists, sessions, comment targets, analytics dimensions and moderation queues. Add indexes only from measured query plans. Candidate future indexes include normalized Artist slug, report reporter/target uniqueness and search indexes.

## Frontend guidance

- Keep server components for SEO detail data.
- Split large admin panels by tab with dynamic imports if bundle analysis shows meaningful savings.
- Use Next/Image or an image CDN once remote storage is configured.
- Preserve stable media aspect ratios to avoid layout shift.
- Paginate rather than increasing list limits.

## Targets

| Metric | Initial target |
|---|---|
| API p95 cached read | < 300 ms |
| API p95 database mutation | < 800 ms excluding media work |
| LCP | < 2.5 s on representative mobile |
| CLS | < 0.1 |
| Error rate | < 1% excluding client validation |
| Upload job acceptance | < 1 s after queue migration |

Measure with production telemetry before optimizing.
