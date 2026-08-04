-- Backward-compatible contributor, referral, reward and artist-verification extension.
ALTER TABLE "User"
  ADD COLUMN "coverUrl" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "localGovernment" TEXT,
  ADD COLUMN "socialLinks" JSONB,
  ADD COLUMN "preferredGenre" TEXT,
  ADD COLUMN "contributorRank" TEXT NOT NULL DEFAULT 'New Contributor',
  ADD COLUMN "contributorVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "referredById" TEXT;

ALTER TABLE "Artist"
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "genre" TEXT,
  ADD COLUMN "socialLinks" JSONB,
  ADD COLUMN "identityStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "identityDocumentUrl" TEXT,
  ADD COLUMN "supportingDocuments" JSONB;

ALTER TABLE "Song" ADD COLUMN "contributorId" TEXT;
ALTER TABLE "Video" ADD COLUMN "contributorId" TEXT;
ALTER TABLE "Video" ADD COLUMN "downloadCount" BIGINT NOT NULL DEFAULT 0;

UPDATE "Song" SET "contributorId" = "Artist"."userId" FROM "Artist" WHERE "Song"."artistId" = "Artist"."id";
UPDATE "Video" SET "contributorId" = "Artist"."userId" FROM "Artist" WHERE "Video"."artistId" = "Artist"."id";

ALTER TABLE "Song" DROP CONSTRAINT "Song_artistId_fkey";
ALTER TABLE "Song" ALTER COLUMN "artistId" DROP NOT NULL;
ALTER TABLE "Song" ADD CONSTRAINT "Song_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Video" DROP CONSTRAINT "Video_artistId_fkey";
ALTER TABLE "Video" ALTER COLUMN "artistId" DROP NOT NULL;
ALTER TABLE "Video" ADD CONSTRAINT "Video_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReferralVisit" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "convertedUserId" TEXT,
  "visitorHash" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Follow" (
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId", "followingId")
);

CREATE TABLE "Badge" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBadge" (
  "userId" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("userId", "badgeId")
);

CREATE TABLE "RewardCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amount" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "rewardType" TEXT NOT NULL,
  "numberOfWinners" INTEGER NOT NULL DEFAULT 1,
  "rewardDate" TIMESTAMP(3) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardWinner" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "certificateCode" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardWinner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralVisit_convertedUserId_key" ON "ReferralVisit"("convertedUserId");
CREATE INDEX "ReferralVisit_referrerId_createdAt_idx" ON "ReferralVisit"("referrerId", "createdAt");
CREATE INDEX "ReferralVisit_visitorHash_createdAt_idx" ON "ReferralVisit"("visitorHash", "createdAt");
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");
CREATE INDEX "UserBadge_awardedAt_idx" ON "UserBadge"("awardedAt");
CREATE INDEX "RewardCampaign_status_rewardDate_idx" ON "RewardCampaign"("status", "rewardDate");
CREATE UNIQUE INDEX "RewardWinner_certificateCode_key" ON "RewardWinner"("certificateCode");
CREATE UNIQUE INDEX "RewardWinner_campaignId_category_rank_key" ON "RewardWinner"("campaignId", "category", "rank");
CREATE INDEX "RewardWinner_userId_createdAt_idx" ON "RewardWinner"("userId", "createdAt");
CREATE INDEX "User_referredById_createdAt_idx" ON "User"("referredById", "createdAt");
CREATE INDEX "Song_contributorId_status_createdAt_idx" ON "Song"("contributorId", "status", "createdAt");
CREATE INDEX "Video_contributorId_status_createdAt_idx" ON "Video"("contributorId", "status", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Song" ADD CONSTRAINT "Song_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardWinner" ADD CONSTRAINT "RewardWinner_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RewardCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardWinner" ADD CONSTRAINT "RewardWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
