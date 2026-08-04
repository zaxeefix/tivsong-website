# Changelog

## 1.1.2 — 2026-08

### Fixed

- Render database deployment now retries transient PostgreSQL/Prisma advisory-lock timeouts without disabling migration safety

## 1.1.1 — 2026-08

### Improved

- Device-based profile-photo registration with signature validation, a 5 MB limit and WebP optimization
- Dependent country, Nigerian state and Benue local-government dropdowns
- Member sign-in by username or email while administrator sign-in remains email-only
- Live CMS-managed homepage hero rotation with image/video slides and no logo inside the hero
- Consistent Tiv Songs logo for site identity, favicon and route loading

## 1.1.0 — 2026-08

### Added

- Public contributor profiles for member and artist accounts, contributor uploads, follows, ranks and achievement badges
- Period-filtered leaderboards for contributors, artists, referrals, songs and community activity
- Referral attribution, abuse-resistant click tracking and private dashboard analytics
- Configurable reward campaigns, calculated winners, notifications and downloadable SVG certificates
- Expanded artist applications with contact, location, genre, social, identity and supporting-document fields
- Additive PostgreSQL migration that backfills existing artist ownership without deleting or renaming existing data

### Improved

- Comment submission feedback and automated warning flow for repeated spam
- Admin upload review compatibility for both artist and member contributors
- CMS kinds and policies for leaderboard, rewards, referrals and comment moderation

## 1.0.0 — 2026-07

### Added

- Next.js public website, PWA, heritage and community pages
- Express/Prisma API with member, artist and administrator authentication
- Music/video upload, optimization, moderation and secure streaming
- CMS settings, editorial content, media library and SSE updates
- User management, roles, warnings, notes, reports and audit logs
- Trust-based comment moderation, sharing analytics and permanent SEO URLs
- OpenAPI 3.1 contract, Swagger UI and engineering documentation

### Security

- HttpOnly rotating sessions, live account-state enforcement and session revocation
- Helmet/CSP, CORS, CSRF origin checks and rate limiting
- File signature validation, bounded FFmpeg concurrency and malware-scanner integration

### Data integrity

- Member and artist accounts separated
- Existing content owners preserved during account normalization
