# Tiv Songs Complete Implementation Audit

Audit date: 2026-08-09
Repository audited: `render-fix` worktree at commit `e8c783737114e31af5bd9476c8b5fc275ed07412`
Remote `origin/main` observed at: `c7b9e9f4556e61e47133e3e4a754e04956990319`
Production checked: `https://tivsong-website-web.vercel.app` and `https://tivsong-website-api.onrender.com/api`

## Executive conclusion

Tiv Songs is **not yet production-ready as a durable media platform**, although the deployed frontend, API health endpoint, Vercel API proxy, public content APIs, session guards, CMS settings, leaderboard endpoint, PWA files, sitemap, and robots file were responding during this audit.

The strongest implemented areas are registration/login, database-backed member sessions, artist approval, basic content review, user moderation, CMS primitives, comments, audit logging, public detail URLs, sharing, and PWA/SEO scaffolding. The main blockers are:

1. Uploaded files are stored on the API process filesystem. Render's filesystem is ephemeral, so uploaded audio, video, images, CMS media, and generated transcodes can disappear on restart or redeploy.
2. Song/video stream, view, and download counters have no increment endpoints or player wiring. Leaderboards, contributor statistics, badges, analytics, and rewards therefore use incomplete data.
3. Monthly rewards are manual, not automatically scheduled, and only calculate one `Top Contributor` category.
4. The API test suite currently fails in its setup hook and skips all six tests. There are no end-to-end tests for the critical user flows.
5. Admin refresh tokens are stateless and not revocable/rotated. The database role/permission model is not enforced by authorization middleware.
6. The media upload route gates video uploads using `musicUploadEnabled`, not `videoUploadEnabled`.
7. The repository/worktree state does not match `origin/main`; the audited worktree contains a local migration-lock retry commit not present on the remote branch.

No application code or database data was changed during this audit.

## Audit method and limits

- Inspected `apps/web`, `apps/api`, Prisma production/local schemas, all migrations, route definitions, middleware, components, PWA files, deployment documentation, environment validation, and package scripts.
- Mapped frontend, backend, database, admin, authorization, and production configuration for every requested feature.
- Ran the API TypeScript production build: **passed**.
- Ran the test suite: **failed** because the `beforeAll` hook timed out; all six tests were skipped.
- Attempted the web production build with required environment variables. It reached Next.js/Turbopack but failed because this audit worktree's `node_modules` symlink points outside Turbopack's filesystem root. This is an audit-environment limitation, not evidence that the Vercel build is currently broken; the deployed web app returned HTTP 200.
- Verified production read-only endpoints. `/api/health`, `/api/cms/settings`, `/api/songs`, `/api/leaderboard`, and the Vercel `/api/*` proxy returned 200. Anonymous `/api/account/me` and `/api/admin/overview` returned 401 as expected.
- Verified `/`, `/account`, `/admin`, `/community`, `/kings`, `/leaderboard`, `/rewards`, `/manifest.webmanifest`, `/sw.js`, `/sitemap.xml`, and `/robots.txt` returned 200.
- No account was created, no login credentials were used, and no mutating production request was made. Authenticated and write flows are therefore code-traced rather than destructively exercised.

### Status definitions

- **Implemented**: all essential layers exist and are coherently wired; production write behavior may still require authenticated acceptance testing.
- **Partial**: meaningful implementation exists, but one or more required layers or behaviors are missing.
- **Not implemented**: no operative end-to-end implementation was found.
- **Broken**: code exists, but a known defect prevents correct or durable behavior.
- **Configured empty**: feature is implemented but production CMS/data contains no usable content.

## Feature matrix

| FEATURE | FRONTEND | BACKEND | DATABASE | ADMIN | STATUS |
|---|---|---|---|---|---|
| User registration | Full member/artist form; avatar file upload | Multipart registration, validation, hashing, referral conversion | User, Artist, Role/UserRole | Accounts list/actions | **Implemented**, but API does not require avatar and failed registrations can orphan uploaded avatar assets |
| Login/session management | Username/email login, refresh retry, logout | Rate-limited login; hashed, rotated member refresh sessions | Session and LoginAttempt | Separate admin login | **Implemented for members; partial for admins** because admin refresh tokens are stateless |
| Session persistence | HttpOnly cookies; remembered-login UI | Access/refresh cookies and member rotation | Session expiry/revocation | Force logout | **Implemented**, with status-check gap on refresh noted below |
| Cookies | First-party proxy and `credentials: include` | HttpOnly, Secure in production, SameSite=Lax, scoped to `/api` | N/A | N/A | **Implemented** |
| User music upload | File picker, category, progress, private status list/player | Multipart audio validation/transcoding | Song and MediaAsset; Upload model unused | Review/publish/reject/delete | **Broken in production durability** due local filesystem storage |
| User video upload | File picker and progress | Multipart video validation/transcoding | Video and MediaAsset; Upload model unused | Review/publish/reject/delete | **Broken/partial**: local storage and wrong feature flag gate |
| Artist registration | Artist-specific form and pending messaging | Creates pending artist account/role/profile | User + Artist + roles | Approval queue in user drawer | **Implemented** |
| Artist image upload | Profile avatar direct file upload | Avatar optimizer | MediaAsset/User avatar | Can view image | **Partial**: cover and identity/supporting documents are URL fields, not managed uploads |
| Admin approval | Pending state shown | Approve/reject artist and publish/reject content | Status, verifiedAt, roles | Explicit approval controls | **Implemented** |
| User profiles | Public contributor route | Contributor profile endpoint | User/Artist/Badge/content relations | Edit user details | **Implemented** |
| Contributor statistics | Profile cards | Aggregate function | Song/Video/Comment/Referral/Follow fields | Visible in rewards/analytics | **Broken/inaccurate** because core play/view/download events are not recorded |
| Top contributors | Leaderboard page | Period leaderboard | Derived from activity tables | No ranking override | **Partial**: endpoint works but metrics are incomplete and query pattern is expensive |
| Top referrers | Leaderboard section | Referral aggregate | User referral + ReferralVisit | Policy settings only | **Partial**: production endpoint works; configured policy limits are not enforced |
| Referral tracking | Referral capture and account stats | Click dedupe, registration conversion, notification | ReferralVisit and referredBy | CMS policy fields | **Partial**: 24-hour dedupe is hard-coded; daily limit/account-age policy is unused |
| Monthly rewards | Public rewards page | Create/calculate/publish/certificate APIs | RewardCampaign/RewardWinner | Rewards panel | **Partial**: calculation is manual, not scheduled monthly |
| Leaderboard | Period selector and multiple panels | Public cached endpoint | Aggregate queries | Settings include public flag | **Partial**: `publicLeaderboard` setting is not enforced and counters are incomplete |
| Song permanent URLs | `/song/[slug]` | Slug lookup | Unique Song.slug | Content publishing | **Implemented** |
| Social sharing | Share modal on public details/profile and utility dock | Analytics event capture | AnalyticsEvent | Analytics report | **Implemented** |
| Copy link | Buttons in share and referral UI | Analytics for content shares | AnalyticsEvent | Analytics | **Implemented** |
| WhatsApp sharing | Secure `wa.me` target | Analytics | AnalyticsEvent | Analytics | **Implemented** |
| Facebook sharing | Secure Facebook sharer target | Analytics | AnalyticsEvent | Analytics | **Implemented** |
| TikTok sharing | Copy-link fallback | Analytics | AnalyticsEvent | Analytics | **Partial**: TikTok has no web share target, so this only copies the URL |
| YouTube | Official-account link in social strip | CMS settings | Setting JSON | Website settings | **Configured empty** in production |
| Audiomack | Official-account link in social strip | CMS settings | Setting JSON | Website settings | **Configured empty** in production |
| Facebook/TikTok social handles | Branded social strip | CMS settings | Setting JSON | Enable/order/URL/custom icon fields | **Configured empty** in production; enabled icons render disabled without URLs |
| Floating social dock | A fixed right-side component exists | CMS utility-dock settings | Setting JSON | Position/visibility toggles | **Conflicting implementation**: it is a utility dock, not the social-handle bar; it remains enabled site-wide despite the later requirement to place social handles only before the footer |
| Comments | Form, replies, sorting, paging, likes, reports, live refresh | Comment CRUD/moderation endpoints | CmsComment | Moderation queue | **Implemented with defects**: feature flag not enforced on routes; likes can be repeated indefinitely |
| Automatic comment moderation | Status feedback | Rule/scoring engine | CmsComment status/moderation metadata | Rules/policies | **Implemented as deterministic rules**, not external AI moderation |
| Trusted contributors | Immediate-publication messaging | Trust calculated from approved comments/violations | CmsComment/UserWarning/Report | Trust stats | **Implemented** |
| New-user moderation | UI describes review | Minimum-approved threshold | Comment history | Policy setting | **Implemented** |
| Suspicious-comment detection | Pending/rejected response | Links, repetition, spam phrase/rule checks | CmsComment metadata/SearchRule | Moderation view | **Implemented**, but heuristic only |
| Comment reports | Report button | Report endpoint/threshold | ContentReport + reportCount | Reports in moderation | **Implemented** |
| Admin moderation queue | Comments module | Admin comment list/actions | CmsComment/Warning/Report | Approve/reject/hide/pin/warn/suspend/ban/reply | **Implemented** |
| User suspension | Admin controls | Middleware status enforcement/action API | User suspension fields | User management and comment moderation | **Implemented** |
| User banning | Admin controls | Middleware status enforcement/action API | User ban fields | User management and comment moderation | **Implemented**, but refresh validation is incomplete |
| Soft deletion | Admin control | Soft-delete action and session revocation | deletedAt/status | User management | **Implemented** |
| User restoration | Admin control | Restore action | User status/deletedAt | User management | **Implemented** |
| Admin roles | Role editor UI | Coarse `adminOnly` plus arbitrary user-role assignment | Role, Permission, join tables | Role assignment | **Partial/security risk**: permission records are not enforced; normal admin may create/assign arbitrary role names |
| Super Admin | Same admin login page | Separate environment credentials and middleware | Not database-backed | Donation, backup/permanent delete controls | **Implemented**, but stateless refresh sessions cannot be revoked |
| Audit logs | Admin audit module | `recordAudit` on many admin actions | AuditLog | Filtering/export/view | **Partial**: not every security/content mutation is guaranteed to log; persistence failures are swallowed after logging |
| CMS | Runtime and admin modules | Generic entry/settings/media/events APIs | CmsEntry/Setting/MediaAsset | Broad CMS panel | **Implemented**, with duplicate specialized/domain implementations |
| Website settings | Frontend consumes settings | Typed get/update | Setting JSON | Settings module | **Implemented**, but several saved flags are not enforced |
| Hero management | CMS-driven carousel with fallback | Hero CMS entries/events | CmsEntry | Hero module | **Implemented**; production currently has no hero entries and uses fallback |
| Tor Tiv management | Public kings/profile pages | Dedicated Tor Tiv CRUD | TorTiv | Heritage module | **Implemented**, but production returned an empty list |
| Governor management | Legacy/static public links and CMS kind | Generic CMS entries only | CmsEntry plus static profile data | Generic pages/CMS, no dedicated workflow | **Partial/conflicting**; production governor CMS list is empty |
| Artist management | Public artists and profiles | List/create/approve | Artist/User | Create/list/approval | **Partial**: no complete edit/archive/delete artist lifecycle |
| Song management | Lists/detail/upload | Create/list/status/delete | Song | Review/publish/reject/delete | **Partial**: no full edit workflow; counters/download behavior absent |
| Video management | Lists/detail/upload | List/status/delete/user upload | Video | Review/publish/reject/delete | **Partial**: no admin create/edit workflow; counters absent |
| Community management | Public feed/form/detail/comments | User upload/list/status/delete | CommunityPost | Review/publish/reject/delete | **Implemented**, but media durability is broken on ephemeral storage |
| Notification system | Utility badge and account link | List/read plus event creation | Notification | Indirect through moderation/content actions | **Partial**: polling only, no dedicated notification center/preferences/email/push delivery |
| Search | Global overlay, suggestions/recent terms | Multi-entity search and suggestions | SearchRule plus domain tables | Search-rule module | **Partial**: result links frequently route to `/?q=...` instead of entity detail pages |
| Analytics | Page/share tracking | Event ingest/admin aggregates | AnalyticsEvent | Analytics module | **Partial**: not tied to media counters; anonymous endpoint is abuse-prone and location/device data is limited |
| PWA | Install/update/offline notices | Static service worker | N/A | Version setting is informational | **Partial**: installable assets exist; background sync is only a message stub and cache version is hard-coded |
| Responsive design | Responsive CSS and mobile utility toggle | N/A | N/A | N/A | **Implemented in code**, but not comprehensively regression-tested across viewports |
| SEO | Metadata, robots, sitemap, structured data | Public APIs feed sitemap | Content slugs/timestamps | CMS description fields | **Implemented with gaps**: canonical defaults to `/`; CMS SEO settings do not fully drive global metadata |
| Open Graph | Global and detail metadata | Detail data fetch | Content records | Content fields | **Implemented** |
| Performance optimization | Lazy media/preload choices and short API cache | Compression/cache headers/transcoding | Indexes present | N/A | **Partial**: unoptimized Next images, N+1 aggregates, client waterfalls, polling, synchronous transcodes |
| Security | Origin checks, Helmet, validation, rate limits, signature checks | Auth middleware and audit logging | Hashed passwords/tokens | Moderation/admin separation | **Partial**; see security risks |
| Production configuration | Vercel proxy and Render API currently respond | Strict core env validation | PostgreSQL migrations | Admin credentials via env | **Blocked for durable media**; storage-provider env examples are not implemented |

## 1. Implemented

- Member and artist registration are separated: members become active and artist applications remain pending with `artist_pending` until approval.
- Member login accepts username or email, uses bcrypt, logs attempts, rate-limits login, and stores hashed refresh tokens in database sessions.
- Account and admin APIs are protected; production anonymous checks returned 401.
- User moderation supports suspend, unsuspend, ban, unban, disable, enable, soft delete, restore, force logout, forced password reset, email verification, and artist verification.
- Artist approval changes role/status and triggers a notification.
- Public song/video/community detail URLs, share dialogs, copy link, WhatsApp, Facebook, X, Telegram, email, and native share are wired.
- Comment posting, replies, sorting, pagination, reports, moderation states, trusted-contributor logic, admin queue, warnings, suspension, and banning are present.
- CMS settings, generic entries, media library, server-sent update events, audit log, analytics view, search rules, email templates, and backup export interfaces exist.
- Tor Tiv has dedicated database and admin CRUD support.
- PWA manifest, icons, service worker registration, install prompt, update prompt, offline state, sitemap, robots, metadata, structured data, and Open Graph exist.

## 2. Partially implemented

- Contributor/reward/leaderboard logic exists but consumes counters that are not updated by playback/download routes.
- Referral settings exist, but `enabled`, points, account age, and daily click-limit policies are not applied consistently.
- Rewards require an administrator to create, calculate, and publish; there is no scheduler.
- Artist supporting evidence uses arbitrary URLs instead of a private, managed document upload flow.
- Search produces grouped results but does not reliably navigate to the matching detail route.
- Permissions are modeled but unused by middleware; authorization remains `adminOnly`/`superAdminOnly`.
- CMS can store many content kinds, while specialized route/admin behavior is incomplete for governors, artists, songs, videos, and categories.
- Notifications are in-app polling records; no push/email delivery or preference management was found.
- CMS SEO and appearance values are only partially applied by the frontend.

## 3. Not implemented

- Durable cloud/object storage adapter for R2, S3, Cloudinary, or equivalent.
- Scheduled automatic monthly reward calculation/publication.
- Actual play/view/download event endpoints that update Song/Video counters.
- Per-user comment reaction records preventing duplicate likes.
- Fine-grained permission enforcement based on `Permission`/`RolePermission`.
- A complete category-management admin workflow.
- Complete governor-specific admin CRUD matching Tor Tiv management.
- Complete artist/song/video edit and archival workflows.
- Email/push notification delivery despite SMTP variables appearing in example configuration.
- Real background upload synchronization in the service worker.
- Broad automated unit/integration/E2E coverage for registration, login, uploads, approvals, comments, CMS, referrals, rewards, migrations, and PWA.

## 4. Broken

- **Media persistence:** uploaded and transcoded files are written beneath `UPLOAD_DIR` and served from the API instance. On a standard Render service this storage is ephemeral.
- **Activity metrics:** content views currently create generic analytics events, but do not increment `Song.playCount`, `Song.downloadCount`, `Video.viewCount`, or `Video.downloadCount`.
- **Video feature toggle:** `/account/media` is guarded only by `musicUploadEnabled`, so disabling `videoUploadEnabled` does not disable video upload.
- **Upload accounting:** successful media submissions create Song/Video records but not `Upload` records. Admin user counts and CSV exports report incorrect upload totals.
- **Comment likes:** every authenticated click increments `CmsComment.likeCount`; there is no uniqueness record, toggle, or idempotency.
- **Automated tests:** `npm test --workspaces --if-present` failed when `src/app.test.ts` timed out in `beforeAll`; all six tests were skipped.
- **Registration UI duplication:** `account/page.tsx` contains a second registration branch after an earlier return for the same view. The later branch is unreachable and has fewer fields.
- **Admin refresh revocation:** logout clears cookies but cannot invalidate an already stolen admin refresh token because admin sessions are not persisted.

## 5. Duplicated

- `Comment` and `CmsComment` are parallel comment models; the current frontend uses `CmsComment`, while contributor statistics also count legacy `Comment` records.
- Generic CMS kinds (`song`, `video`, `artist`, `category`, `community`, `tor_tiv`, `governor`) overlap domain-specific database models and APIs.
- The account page contains two separate registration form implementations, one unreachable.
- Sharing logic is duplicated between `ShareButton` and the utility dock's `ShareDialog`.
- Social settings contain both legacy `socialLinks` and managed `socialMedia` arrays.
- Static heritage profiles coexist with TorTiv/CMS-backed heritage data.

## 6. Conflicting implementations

- The later design request placed official social handles before the footer, which `SocialMediaStrip` does, but a site-wide floating `SocialMediaBar` still exists. It is now a utility dock, creating naming and requirement ambiguity.
- `videoUploadEnabled` exists in CMS settings, but upload code applies `musicUploadEnabled` to both media types.
- `commentsEnabled`, referral-policy fields, reward-policy fields, homepage section order, and public-leaderboard settings can be saved but are not consistently enforced by routes/rendering.
- `.env.example`/deployment guidance mentions cloud storage, SMTP, payment, and OAuth variables, but `env.ts` neither accepts nor uses most of them.
- `ACCESS_TOKEN_TTL` is accepted, but access JWTs are hard-coded to 15 minutes.
- Production and repository state differ: the audited worktree has commit `e8c7837` while `origin/main` is `c7b9e9f`.

## 7. Security risks

### High

- Admin refresh JWTs are stateless, are not stored or rotated, and cannot be revoked at logout or force-logout.
- Normal admin middleware protects the arbitrary role-assignment endpoint. It can create any role name; permission tables are not used to constrain privileges.
- Media scanning is optional (`VIRUS_SCAN_URL`). MIME prefix checks plus file signatures reduce risk but do not replace malware scanning for public uploads.
- External identity/support-document URLs can expose sensitive documents through third-party hosts and are not protected by Tiv Songs access controls.

### Medium

- Account refresh rejects suspended/deleted sessions but does not reject all non-active states such as banned/inactive/pending before issuing a fresh access token. Subsequent `accountOnly` checks limit use, but token issuance is inconsistent.
- CMS media existence is enough to authorize public media access; pending/private asset publication state is not modeled strongly.
- CSP permits `'unsafe-inline'` for scripts and styles, weakening XSS containment. HSTS is not set in application headers.
- Comment likes and analytics ingestion can be manipulated; analytics has no authentication and only global rate limiting.
- Referral fraud controls are limited to a 24-hour visitor hash and do not enforce configured daily limits/account-age requirements.
- Audit persistence errors are logged but do not fail the protected action, so an action may complete without an audit record.

### Low/operational

- Admin identity is environment-based rather than database-session-based, limiting revocation, history, MFA, and credential lifecycle controls.
- A single exact `WEB_URL` supports only one allowed browser origin; preview/custom-domain deployments can fail unless configuration is changed deliberately.
- Registration can leave orphan avatar media when a later uniqueness/database operation fails.

## 8. Performance issues

- Leaderboard loads up to 250 users and invokes `contributorStats` separately for each user; each call performs multiple queries. This is an N+1 pattern that can generate well over a thousand queries per request.
- Reward calculation repeats the same per-user aggregate pattern and runs synchronously in an HTTP request.
- FFmpeg transcoding runs inside API requests with only an in-process concurrency counter. It is not a durable queue and does not coordinate across multiple instances.
- Audio upload creates three variants, increasing storage and CPU use even when the variants provide little benefit.
- `images.unoptimized=true` disables Next.js image optimization, while many pages also use raw `<img>` elements.
- Admin startup loads overview, artists, songs, videos, kings, accounts, and community records concurrently; several lists are unpaginated.
- The utility dock polls notifications every 30 seconds on every non-admin page, including anonymous users who receive 401 responses.
- Client components independently fetch CMS settings, footer data, search suggestions, notifications, comments, and content, creating request waterfalls.
- Service-worker cache version is static (`v1.0.0`), increasing stale-cache risk after releases.

## 9. Production blockers

### P0 — must fix before accepting real uploads

1. Replace process-local media storage with private object storage, signed delivery URLs, durable object keys, and cleanup/rollback handling. Migrate existing media without deleting records.
2. Implement atomic, abuse-resistant play/view/download tracking and connect players/download controls. Recalculate affected contributor statistics only after defining a migration/backfill policy.
3. Correct the video feature gate and either create `Upload` rows transactionally or remove the unused model/count dependency through a safe migration.

### P1 — must fix before public launch/reward claims

4. Make the test suite deterministic and passing; add end-to-end acceptance tests for registration, login/refresh/logout, artist approval, upload/publish, comments/moderation, referral conversion, and deployment migrations.
5. Persist/rotate/revoke administrator refresh sessions and restrict role management to Super Admin or enforced fine-grained permissions.
6. Add idempotent comment reactions and enforce `commentsEnabled`, referral policy, reward policy, and leaderboard visibility settings server-side.
7. Replace N+1 leaderboard/reward queries with grouped database aggregates or cached materialized statistics; move reward calculation and transcoding to background jobs.
8. Reconcile and push the intended migration/deployment commits so GitHub, Render, and the audited code share one source of truth.

### P2 — required for complete requirement compliance

9. Add scheduled monthly rewards and required categories (top contributor, top referrer, featured artist) with an auditable manual override.
10. Complete governor/category/artist/song/video admin lifecycle management without replacing working modules.
11. Consolidate duplicate registration, comment, sharing, social-settings, and CMS/domain implementations through compatibility migrations.
12. Configure actual official social URLs in production and resolve whether the utility dock remains based on the final approved requirement.

## Safest implementation order

1. **Freeze schema/content writes briefly and establish backups.** Export PostgreSQL and inventory every existing media URL/object. Do not run destructive migrations.
2. **Align source control and deployment.** Decide whether `e8c7837` belongs on `main`, verify Render/Vercel build/start commands, and deploy from an immutable commit.
3. **Make verification trustworthy.** Repair the test bootstrap timeout, add a disposable PostgreSQL test database, and create smoke tests for current behavior before refactoring.
4. **Introduce durable storage behind an adapter.** Preserve current URLs, dual-read during migration, copy and checksum existing assets, then switch new writes. Do not delete local files until production verification succeeds.
5. **Repair correctness defects.** Fix video gating, transactional upload records/cleanup, refresh status checks, admin session revocation, and unique comment reactions.
6. **Add event accounting.** Define deduplication and fraud rules, implement play/view/download events, then backfill or explicitly reset public statistics with an audit record.
7. **Optimize aggregates and jobs.** Replace N+1 queries and move transcodes/reward calculations to a durable queue/scheduler.
8. **Enforce existing CMS policy switches.** Apply comment, referral, reward, leaderboard, upload, and homepage settings on both API and frontend.
9. **Resolve duplicates conservatively.** Mark legacy paths deprecated, migrate data, verify reads, and only remove dead code/models in a later release.
10. **Complete missing admin workflows and production acceptance.** Test authenticated behavior on a staging clone, run migration rehearsal/rollback, then deploy with monitoring.

## Evidence map

- Authentication, uploads, admin/CMS/comments/referrals/rewards/analytics: `apps/api/src/routes/index.ts`
- Environment requirements: `apps/api/src/config/env.ts`
- Security middleware: `apps/api/src/app.ts`
- Database entities and indexes: `apps/api/prisma/schema.prisma`
- Production migrations: `apps/api/prisma/migrations/`
- Registration/login/upload UI: `apps/web/app/account/page.tsx`
- Admin navigation and domain review: `apps/web/app/admin/page.tsx`
- User governance: `apps/web/app/admin/UserManagement.tsx`
- CMS modules: `apps/web/app/admin/CmsPanel.tsx`
- Comments: `apps/web/app/components/CommentSection.tsx`
- Sharing: `apps/web/app/components/ShareButton.tsx` and `SocialMediaBar.tsx`
- Social handles before footer: `apps/web/app/components/SocialMediaStrip.tsx` and `SiteFooter.tsx`
- PWA/SEO: `apps/web/app/layout.tsx`, `manifest.ts`, `sitemap.ts`, `robots.ts`, and `apps/web/public/sw.js`
- Deployment/build scripts: root `package.json`, `apps/api/package.json`, `apps/web/package.json`, and deployment documentation.

## Final readiness verdict

The current system is a substantial working beta with a responsive deployed frontend and live API, but it should **not** be represented as 100% production-ready. The P0 and P1 items above must be completed and verified against a staging copy of production data before real user uploads, public rewards, or irreversible moderation operations are relied upon.

## Implementation update — 2026-08-09

The code-level P0/P1 findings identified by this audit were subsequently implemented in this worktree:

- Added private S3-compatible/R2 storage, authenticated object delivery, byte-range streaming, deletion handling, and a non-destructive migration utility for existing local media.
- Production now refuses ephemeral local storage configuration.
- Added database-backed, rotated, revocable administrator refresh sessions.
- Tightened member refresh to active accounts without a forced-password-reset requirement.
- Added idempotent comment reactions and server-side comment-policy enforcement.
- Added deduplicated play/view/download events and wired public players/downloads to the counters.
- Corrected separate music/video feature gating.
- Connected Upload rows to content and synchronized review statuses.
- Replaced leaderboard/reward per-user query fan-out with batch aggregation.
- Added automatic monthly calculation for Top Contributor, Top Referrer, and Featured Artist categories using an advisory lock.
- Enforced referral enablement, account-age, daily-limit, and configurable points policies.
- Restricted role assignment to Super Admin.
- Added category administration, CMS referral/reward controls, hero visibility/timing controls, direct search-result navigation, HSTS, image optimization, and reduced anonymous notification polling.
- Updated vulnerable production dependencies; `npm audit --omit=dev` reports zero vulnerabilities.
- Repaired the security test harness and added logout/revocation coverage; seven tests pass.
- Added an additive migration and a production deployment/migration guide.

External infrastructure configuration, database backup, migration execution, media copying, and staging acceptance remain deployment operations and cannot be completed by source-code changes alone. Follow `PRODUCTION_IMPLEMENTATION_GUIDE.md` before deploying this implementation.
