export const cloudDataPolicy = {
  domainStorage: "cloud-database-only",
  browserLocalStorageAllowed: false,
  sensitiveRecordStorage:
    "Prospects, relationship notes, HML output, permission states, and source evidence must persist in Supabase Postgres.",
} as const;
