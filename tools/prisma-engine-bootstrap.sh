#!/usr/bin/env bash
# Sideload Prisma's schema-engine binary for network-restricted environments
# (e.g. the Claude Code cloud sandbox) where Prisma's Node downloader can't reach
# binaries.prisma.sh — it ignores HTTPS_PROXY and attempts a direct connection
# that the egress firewall resets. `curl` honors the proxy, so we fetch it with
# curl and point Prisma at it. Not needed on a normal laptop / CI / Vercel.
#
#   source tools/prisma-engine-bootstrap.sh && npx prisma generate
#
# The runtime engine is WASM (engineType = "client" + @prisma/adapter-pg), so
# only the CLI's schema-engine binary needs this; nothing ships to production.
set -e

HASH="$(node -e "console.log(require('@prisma/engines-version').enginesVersion)")"
PLATFORM="${PRISMA_PLATFORM:-debian-openssl-3.0.x}"
DIR="${PRISMA_ENGINE_DIR:-/root/prisma-engines}"
mkdir -p "$DIR"

if [ ! -x "$DIR/schema-engine" ]; then
  echo "Fetching schema-engine ($HASH, $PLATFORM) via curl…"
  curl -fsSL --max-time 120 -o "$DIR/schema-engine.gz" \
    "https://binaries.prisma.sh/all_commits/$HASH/$PLATFORM/schema-engine.gz"
  gunzip -f "$DIR/schema-engine.gz"
  chmod +x "$DIR/schema-engine"
fi

export PRISMA_SCHEMA_ENGINE_BINARY="$DIR/schema-engine"
export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-/root/.ccr/ca-bundle.crt}"
echo "PRISMA_SCHEMA_ENGINE_BINARY=$PRISMA_SCHEMA_ENGINE_BINARY"
echo "Ready: run 'npx prisma generate' or 'npx prisma migrate deploy'."
