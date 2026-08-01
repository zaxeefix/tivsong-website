CREATE TABLE "CmsEntry" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "excerpt" TEXT,
  "body" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "publishAt" TIMESTAMP(3),
  "archiveAt" TIMESTAMP(3),
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "buttonText" TEXT,
  "buttonUrl" TEXT,
  "metadata" JSONB,
  "seo" JSONB,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsEntry_kind_slug_key" ON "CmsEntry"("kind", "slug");
CREATE INDEX "CmsEntry_kind_status_sortOrder_idx" ON "CmsEntry"("kind", "status", "sortOrder");
CREATE INDEX "CmsEntry_kind_publishAt_idx" ON "CmsEntry"("kind", "publishAt");

CREATE TABLE "CmsComment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "parentId" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "reportCount" INTEGER NOT NULL DEFAULT 0,
  "spamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "moderatedBy" TEXT,
  "moderatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CmsComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CmsComment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CmsComment_targetType_targetId_status_createdAt_idx" ON "CmsComment"("targetType", "targetId", "status", "createdAt");
CREATE INDEX "CmsComment_userId_createdAt_idx" ON "CmsComment"("userId", "createdAt");

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "folder" TEXT NOT NULL DEFAULT '/',
  "kind" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "storageKey" TEXT,
  "sizeBytes" BIGINT NOT NULL DEFAULT 0,
  "altText" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MediaAsset_folder_kind_createdAt_idx" ON "MediaAsset"("folder", "kind", "createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actor_createdAt_idx" ON "AuditLog"("actor", "createdAt");
CREATE INDEX "AuditLog_action_entity_idx" ON "AuditLog"("action", "entity");

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "userId" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "country" TEXT,
  "device" TEXT,
  "browser" TEXT,
  "searchTerm" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");
CREATE INDEX "AnalyticsEvent_entityType_entityId_createdAt_idx" ON "AnalyticsEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AnalyticsEvent_searchTerm_createdAt_idx" ON "AnalyticsEvent"("searchTerm", "createdAt");

CREATE TABLE "SearchRule" (
  "id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SearchRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SearchRule_keyword_key" ON "SearchRule"("keyword");
CREATE INDEX "SearchRule_type_active_weight_idx" ON "SearchRule"("type", "active", "weight");

CREATE TABLE "EmailTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "text" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");
