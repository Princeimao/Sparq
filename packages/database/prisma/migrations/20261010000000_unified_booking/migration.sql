-- ─── Unified booking domain ─────────────────────────────────────────────
-- Migrates hotel-style slots/bookings + appointments into Resource/Booking
-- rows, PRESERVING every existing id, then retires the old tables.
-- Safe to run on databases with zero rows (all INSERT..SELECTs are no-ops).

-- 1. New enums
CREATE TYPE "ResourceKind" AS ENUM ('STAFF', 'TABLE', 'ROOM', 'EQUIPMENT', 'OTHER');
CREATE TYPE "AssignmentMode" AS ENUM ('CUSTOMER_CHOICE', 'BUSINESS_ASSIGN', 'AUTO', 'SINGLE');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'CHECKED_IN');
CREATE TYPE "BookingSource" AS ENUM ('WHATSAPP', 'DASHBOARD', 'API');

-- 2. New tables
CREATE TABLE "resources" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "ResourceKind" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "image" TEXT,
  "color" TEXT,
  "capacity" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "locationMode" "ServiceLocation",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "resources_userId_idx" ON "resources"("userId");
CREATE INDEX "resources_userId_kind_idx" ON "resources"("userId", "kind");

CREATE TABLE "service_resources" (
  "serviceId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_resources_pkey" PRIMARY KEY ("serviceId", "resourceId")
);
CREATE INDEX "service_resources_resourceId_idx" ON "service_resources"("resourceId");

CREATE TABLE "time_offs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "staffId" TEXT,
  "resourceId" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "time_offs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "time_offs_userId_idx" ON "time_offs"("userId");
CREATE INDEX "time_offs_staffId_idx" ON "time_offs"("staffId");
CREATE INDEX "time_offs_resourceId_idx" ON "time_offs"("resourceId");

CREATE TABLE "breaks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "staffId" TEXT,
  "resourceId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "breaks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "breaks_userId_idx" ON "breaks"("userId");
CREATE INDEX "breaks_staffId_idx" ON "breaks"("staffId");
CREATE INDEX "breaks_resourceId_idx" ON "breaks"("resourceId");

CREATE TABLE "bookings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serviceId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "locationMode" "ServiceLocation",
  "visitAddressId" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "source" "BookingSource" NOT NULL DEFAULT 'DASHBOARD',
  "partySize" INTEGER,
  "notes" TEXT,
  "totalAmount" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");
CREATE INDEX "bookings_serviceId_idx" ON "bookings"("serviceId");
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");
CREATE INDEX "bookings_userId_startTime_idx" ON "bookings"("userId", "startTime");

CREATE TABLE "booking_allocations" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "staffId" TEXT,
  "resourceId" TEXT,
  "role" TEXT NOT NULL DEFAULT 'PRIMARY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "booking_allocations_bookingId_idx" ON "booking_allocations"("bookingId");
CREATE INDEX "booking_allocations_staffId_idx" ON "booking_allocations"("staffId");
CREATE INDEX "booking_allocations_resourceId_idx" ON "booking_allocations"("resourceId");

-- 3. Extend existing tables
ALTER TABLE "Service" ADD COLUMN "assignmentMode" "AssignmentMode" NOT NULL DEFAULT 'BUSINESS_ASSIGN';
ALTER TABLE "Service" ADD COLUMN "requiresPartySize" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "bufferMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "minLeadMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "maxAdvanceDays" INTEGER;

ALTER TABLE "Staff" ADD COLUMN "role" TEXT;
ALTER TABLE "Staff" ADD COLUMN "specialty" TEXT;
ALTER TABLE "Staff" ADD COLUMN "image" TEXT;
ALTER TABLE "Staff" ADD COLUMN "color" TEXT;

ALTER TABLE "Availability" ADD COLUMN "resourceId" TEXT;

ALTER TABLE "business_profiles" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- Backfill assignmentMode from the legacy bookingMode so behaviour is unchanged.
UPDATE "Service" SET "assignmentMode" = 'CUSTOMER_CHOICE' WHERE "bookingMode" = 'SELECT_STAFF';

-- 4. Migrate reservation slots -> resources (ids preserved).
INSERT INTO "resources" ("id", "userId", "name", "kind", "description", "capacity", "image", "isActive", "metadata", "createdAt", "updatedAt")
SELECT
  "id", "userId", "name",
  CASE "type"
    WHEN 'RESTAURANT_TABLE' THEN 'TABLE'::"ResourceKind"
    WHEN 'HOTEL_ROOM' THEN 'ROOM'::"ResourceKind"
    WHEN 'MEETING_ROOM' THEN 'ROOM'::"ResourceKind"
    WHEN 'EVENT_SPACE' THEN 'ROOM'::"ResourceKind"
    ELSE 'OTHER'::"ResourceKind"
  END,
  "description", "capacity", "image", "isActive",
  jsonb_build_object(
    'migratedFrom', 'ReservationSlot',
    'legacyType', "type",
    'pricePerUnit', "pricePerUnit",
    'priceUnit', "priceUnit",
    'amenities', "amenities"
  ),
  "createdAt", "updatedAt"
FROM "reservation_slots";

-- 5. Migrate appointments -> bookings (ids preserved) + staff allocations.
INSERT INTO "bookings" ("id", "userId", "serviceId", "customerId", "customerName", "customerEmail", "customerPhone", "locationMode", "visitAddressId", "startTime", "endTime", "status", "source", "notes", "createdAt", "updatedAt")
SELECT
  "id", "userId", "serviceId", "customerId", "customerName", "customerEmail", "customerPhone",
  "locationMode", "visitAddressId", "startTime", "endTime",
  "status"::text::"BookingStatus",
  -- Origin channel is unknowable for legacy rows; DASHBOARD is the neutral default.
  'DASHBOARD'::"BookingSource",
  "notes", "createdAt", "updatedAt"
FROM "Appointment";

INSERT INTO "booking_allocations" ("id", "bookingId", "staffId", "role", "createdAt")
SELECT 'alloc_' || "id", "id", "staffId", 'PRIMARY', CURRENT_TIMESTAMP
FROM "Appointment"
WHERE "staffId" IS NOT NULL;

-- 6. Migrate reservation bookings -> bookings (ids preserved) + table allocations.
INSERT INTO "bookings" ("id", "userId", "serviceId", "customerId", "customerName", "customerEmail", "customerPhone", "startTime", "endTime", "status", "source", "partySize", "notes", "totalAmount", "createdAt", "updatedAt")
SELECT
  "id", "userId", NULL, "customerId", "customerName", "customerEmail", "customerPhone",
  "startDate", "endDate",
  "status"::text::"BookingStatus",
  -- Origin channel is unknowable for legacy rows; DASHBOARD is the neutral default.
  'DASHBOARD'::"BookingSource",
  "guestCount", "specialRequests", "totalAmount", "createdAt", "updatedAt"
FROM "reservation_bookings";

INSERT INTO "booking_allocations" ("id", "bookingId", "resourceId", "role", "createdAt")
SELECT 'alloc_' || "id", "id", "slotId", 'TABLE', CURRENT_TIMESTAMP
FROM "reservation_bookings";

-- 7. Remap onboarding modules: orders->products, appointments/reservations->bookings.
UPDATE "business_profiles" SET "enabledModules" = (
  SELECT COALESCE(array_agg(DISTINCT CASE m
    WHEN 'orders' THEN 'products'
    WHEN 'appointments' THEN 'bookings'
    WHEN 'reservations' THEN 'bookings'
    ELSE m
  END), '{}')
  FROM unnest("enabledModules") AS m
);

-- 8. Foreign keys for the new tables.
ALTER TABLE "resources" ADD CONSTRAINT "resources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_offs" ADD CONSTRAINT "time_offs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_offs" ADD CONSTRAINT "time_offs_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_offs" ADD CONSTRAINT "time_offs_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_visitAddressId_fkey" FOREIGN KEY ("visitAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_allocations" ADD CONSTRAINT "booking_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_allocations" ADD CONSTRAINT "booking_allocations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_allocations" ADD CONSTRAINT "booking_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Retire the superseded tables (data already preserved above with same ids).
DROP TABLE "reservation_bookings";
DROP TABLE "reservation_slots";
DROP TABLE "Appointment";

-- 10. Drop now-unused enums.
DROP TYPE "ReservationStatus";
DROP TYPE "ReservationSlotType";
DROP TYPE "AppointmentStatus";
