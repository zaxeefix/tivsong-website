-- Additive production migration: no existing rows or columns are removed.
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsCommentLike" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CmsCommentLike_pkey" PRIMARY KEY ("commentId", "userId")
);

CREATE TABLE "MediaEngagement" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaEngagement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminSession_refreshTokenHash_key" ON "AdminSession"("refreshTokenHash");
CREATE INDEX "AdminSession_email_expiresAt_idx" ON "AdminSession"("email", "expiresAt");
CREATE INDEX "CmsCommentLike_userId_createdAt_idx" ON "CmsCommentLike"("userId", "createdAt");
CREATE UNIQUE INDEX "MediaEngagement_entityType_entityId_event_visitorHash_bucket_key" ON "MediaEngagement"("entityType", "entityId", "event", "visitorHash", "bucket");
CREATE INDEX "MediaEngagement_entityType_entityId_event_createdAt_idx" ON "MediaEngagement"("entityType", "entityId", "event", "createdAt");
CREATE INDEX "MediaEngagement_userId_createdAt_idx" ON "MediaEngagement"("userId", "createdAt");
ALTER TABLE "CmsCommentLike" ADD CONSTRAINT "CmsCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CmsComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Upload" ADD COLUMN "entityType" TEXT,
ADD COLUMN "entityId" TEXT;
CREATE INDEX "Upload_entityType_entityId_idx" ON "Upload"("entityType", "entityId");
