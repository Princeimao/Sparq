-- DropIndex
DROP INDEX "customers_userId_phone_key";

-- CreateIndex
CREATE INDEX "Availability_resourceId_idx" ON "Availability"("resourceId");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
