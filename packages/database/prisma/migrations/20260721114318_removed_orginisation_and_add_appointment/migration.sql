/*
  Warnings:

  - You are about to drop the column `organizationId` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `integrations` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `whatsapp_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `workflows` table. All the data in the column will be lost.
  - You are about to drop the `appointments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `memberships` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `integrations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `whatsapp_integrations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `workflows` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('ANY_STAFF', 'SELECT_STAFF');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AvailabilityMode" AS ENUM ('MANUAL', 'GENERATED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'TEMPLATE', 'INTERACTIVE', 'FLOW');

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_userId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_integrations" DROP CONSTRAINT "whatsapp_integrations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "workflows" DROP CONSTRAINT "workflows_organizationId_fkey";

-- DropIndex
DROP INDEX "campaigns_organizationId_idx";

-- DropIndex
DROP INDEX "customers_organizationId_idx";

-- DropIndex
DROP INDEX "customers_organizationId_phone_key";

-- DropIndex
DROP INDEX "integrations_organizationId_idx";

-- DropIndex
DROP INDEX "integrations_organizationId_type_idx";

-- DropIndex
DROP INDEX "messages_customerId_idx";

-- DropIndex
DROP INDEX "orders_organizationId_idx";

-- DropIndex
DROP INDEX "products_organizationId_idx";

-- DropIndex
DROP INDEX "products_organizationId_name_key";

-- DropIndex
DROP INDEX "whatsapp_integrations_organizationId_idx";

-- DropIndex
DROP INDEX "workflows_organizationId_idx";

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "integrations" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "payload" JSONB,
ADD COLUMN     "type" "MessageType" NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "whatsapp_integrations" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workflows" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "appointments";

-- DropTable
DROP TABLE "memberships";

-- DropTable
DROP TABLE "organizations";

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "FlowStatus" NOT NULL DEFAULT 'DRAFT',
    "flowSchema" JSONB NOT NULL,
    "whatsappSchema" JSONB,
    "endpointUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'ANY_STAFF',
    "availabilityMode" "AvailabilityMode" NOT NULL DEFAULT 'MANUAL',
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceToStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceToStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "flows_userId_idx" ON "flows"("userId");

-- CreateIndex
CREATE INDEX "Service_userId_idx" ON "Service"("userId");

-- CreateIndex
CREATE INDEX "Staff_userId_idx" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Availability_staffId_idx" ON "Availability"("staffId");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- CreateIndex
CREATE INDEX "Appointment_staffId_idx" ON "Appointment"("staffId");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "_ServiceToStaff_B_index" ON "_ServiceToStaff"("B");

-- CreateIndex
CREATE INDEX "campaigns_userId_idx" ON "campaigns"("userId");

-- CreateIndex
CREATE INDEX "customers_userId_idx" ON "customers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_phone_key" ON "customers"("userId", "phone");

-- CreateIndex
CREATE INDEX "integrations_userId_idx" ON "integrations"("userId");

-- CreateIndex
CREATE INDEX "messages_customerId_createdAt_idx" ON "messages"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_userId_createdAt_idx" ON "messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "products_userId_idx" ON "products"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "products_userId_name_key" ON "products"("userId", "name");

-- CreateIndex
CREATE INDEX "whatsapp_integrations_userId_idx" ON "whatsapp_integrations"("userId");

-- CreateIndex
CREATE INDEX "workflows_userId_idx" ON "workflows"("userId");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToStaff" ADD CONSTRAINT "_ServiceToStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToStaff" ADD CONSTRAINT "_ServiceToStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
