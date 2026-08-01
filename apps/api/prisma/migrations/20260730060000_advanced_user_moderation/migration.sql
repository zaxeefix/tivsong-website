ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'BANNED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';

ALTER TABLE "User"
  ADD COLUMN "phoneNumber" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedUntil" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "bannedAt" TIMESTAMP(3),
  ADD COLUMN "banReason" TEXT,
  ADD COLUMN "bannedBy" TEXT,
  ADD COLUMN "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "successful" BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "device" TEXT,
  "browser" TEXT,
  "country" TEXT,
  "failure" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt");
CREATE INDEX "LoginAttempt_successful_createdAt_idx" ON "LoginAttempt"("successful", "createdAt");

CREATE TABLE "UserWarning" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "issuedBy" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserWarning_userId_active_createdAt_idx" ON "UserWarning"("userId", "active", "createdAt");

CREATE TABLE "AdminNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminNote_userId_createdAt_idx" ON "AdminNote"("userId", "createdAt");

CREATE TABLE "ContentReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedTo" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");
CREATE INDEX "ContentReport_targetType_targetId_status_idx" ON "ContentReport"("targetType", "targetId", "status");
CREATE INDEX "ContentReport_reporterId_createdAt_idx" ON "ContentReport"("reporterId", "createdAt");
