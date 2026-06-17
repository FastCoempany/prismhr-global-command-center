DROP INDEX IF EXISTS "User_authUserId_key";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "authUserId";
