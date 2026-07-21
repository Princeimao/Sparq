/*
  Warnings:

  - You are about to drop the column `address` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `optedIn` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `campaigns` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_userId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_campaignId_fkey";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "address",
DROP COLUMN "externalId",
DROP COLUMN "optedIn",
ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "campaignId",
ADD COLUMN     "shippingAddressId" TEXT;

-- DropTable
DROP TABLE "campaigns";

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'SHIPPING',
    "name" TEXT,
    "phone" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT NOT NULL,
    "landmark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
