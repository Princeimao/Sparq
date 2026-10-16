-- Instagram channel: per-user Page connection for professional
-- (business or creator) Instagram accounts linked to a Facebook Page.
CREATE TABLE "instagram_integrations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "pageId" TEXT NOT NULL,
  "pageName" TEXT,
  "igUserId" TEXT,
  "igUsername" TEXT,
  "accessToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instagram_integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "instagram_integrations_userId_key" ON "instagram_integrations"("userId");
ALTER TABLE "instagram_integrations"
  ADD CONSTRAINT "instagram_integrations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer channel: a person reachable on both WhatsApp and Instagram
-- becomes two rows. Backfills existing rows as WHATSAPP.
ALTER TABLE "customers" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_userId_phone_key";
CREATE UNIQUE INDEX IF NOT EXISTS "customers_userId_channel_phone_key"
  ON "customers"("userId", "channel", "phone");
