ALTER TYPE "PermissionStatus" RENAME TO "PermissionState";

ALTER TABLE "TerritoryAccount"
  RENAME COLUMN "permissionStatus" TO "permissionState";

ALTER INDEX "TerritoryAccount_permissionStatus_idx"
  RENAME TO "TerritoryAccount_permissionState_idx";

ALTER TABLE "PermissionHistory"
  RENAME COLUMN "status" TO "state";

ALTER INDEX "PermissionHistory_status_idx"
  RENAME TO "PermissionHistory_state_idx";
