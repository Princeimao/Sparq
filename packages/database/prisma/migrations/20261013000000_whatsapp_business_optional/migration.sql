-- Make WhatsappIntegration.businessId optional.
-- The Meta embedded-signup flow reliably returns wabaId + phoneNumberId;
-- the business ID is not always available at exchange time and is unused
-- elsewhere, so it must not block creating the connection.
ALTER TABLE "whatsapp_integrations" ALTER COLUMN "businessId" DROP NOT NULL;
