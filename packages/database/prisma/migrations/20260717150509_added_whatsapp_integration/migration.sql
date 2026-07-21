/*
  Warnings:

  - The values [WHATSAPP,PAYMENT,STORE,CUSTOM_API] on the enum `IntegrationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IntegrationType_new" AS ENUM ('STRIPE', 'RAZORPAY', 'CALCOM', 'GOOGLE_CALENDAR', 'WOOCOMMERCE');
ALTER TABLE "integrations" ALTER COLUMN "type" TYPE "IntegrationType_new" USING ("type"::text::"IntegrationType_new");
ALTER TYPE "IntegrationType" RENAME TO "IntegrationType_old";
ALTER TYPE "IntegrationType_new" RENAME TO "IntegrationType";
DROP TYPE "public"."IntegrationType_old";
COMMIT;

-- CreateTable
CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_integrations_organizationId_idx" ON "whatsapp_integrations"("organizationId");

-- AddForeignKey
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
