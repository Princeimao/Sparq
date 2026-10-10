-- CreateEnum (additive, new types only)
CREATE TYPE "BusinessType" AS ENUM ('SALON', 'CLINIC', 'RESTAURANT', 'HOTEL', 'RETAIL', 'HOME_SERVICES', 'FITNESS', 'OTHER');
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ServiceLocation" AS ENUM ('AT_BUSINESS', 'AT_CUSTOMER', 'BOTH');

-- CreateTable: business_profiles
CREATE TABLE "business_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessName" TEXT,
  "businessType" "BusinessType",
  "description" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "industry" TEXT,
  "servicesOffered" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "addressLine1" TEXT,
  "city" TEXT,
  "state" TEXT,
  "pincode" TEXT,
  "country" TEXT NOT NULL DEFAULT 'India',
  "locationMode" "ServiceLocation",
  "serviceArea" TEXT,
  "operatingHours" JSONB,
  "staffCount" INTEGER,
  "communicationPrefs" JSONB,
  "settings" JSONB,
  "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "onboardingStep" INTEGER NOT NULL DEFAULT 0,
  "onboardingDraft" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_profiles_userId_key" ON "business_profiles"("userId");

-- AlterTable: customers add notes
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AlterTable: addresses add label + isDefault
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: services add locationMode (existing rows default to AT_BUSINESS)
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "locationMode" "ServiceLocation" NOT NULL DEFAULT 'AT_BUSINESS';

-- AlterTable: appointments link customer + visit address + location mode
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "locationMode" "ServiceLocation";
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "visitAddressId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_visitAddressId_fkey" FOREIGN KEY ("visitAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Appointment_customerId_idx" ON "Appointment"("customerId");

-- AlterTable: reservation_bookings link customer
ALTER TABLE "reservation_bookings" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
DO $$ BEGIN
  ALTER TABLE "reservation_bookings" ADD CONSTRAINT "reservation_bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "reservation_bookings_customerId_idx" ON "reservation_bookings"("customerId");
