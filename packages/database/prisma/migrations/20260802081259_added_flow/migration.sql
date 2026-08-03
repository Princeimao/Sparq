/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `whatsapp_integrations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "whatsapp_integrations_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_integrations_userId_key" ON "whatsapp_integrations"("userId");
