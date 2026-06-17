ALTER TABLE "User"
  ADD COLUMN "authUserId" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastSignedInAt" TIMESTAMP(3);

UPDATE "User"
SET "isActive" = true
WHERE "role" = 'OWNER';

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'VIEWER';

CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
