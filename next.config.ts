import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The files the stage's Send in Outlook carries ride with the one route
  // that serves them (src/lib/collateral/attachments.ts), and no other.
  outputFileTracingIncludes: {
    "/groundwork/attach/[id]": ["./collateral/**/*", "./intelligence/flyers/*.pdf"],
  },
  experimental: {
    serverActions: {
      // The vault's pieces (D8 as amended 2026-10-05 — CLAUDE.md, The Chute):
      // a dropped file travels through the server in pieces of at most 4 MB
      // (src/lib/ingest/vault.ts, VAULT_PIECE_BYTES). The default of 1 MB
      // refuses a piece; this admits one plus the form's overhead and stays
      // under Vercel's 4.5 MB request cap.
      bodySizeLimit: "4400kb",
    },
  },
};

export default nextConfig;
