-- Instagram-native logins carry no Facebook Page: identity is the
-- professional account's igUserId, so pageId must be nullable.
ALTER TABLE "instagram_integrations" ALTER COLUMN "pageId" DROP NOT NULL;
