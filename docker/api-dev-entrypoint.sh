#!/bin/sh
# Dev-mode start for the api container: the source is bind-mounted from the
# host, so generate the Prisma client, apply migrations, seed and ingest, then
# run the API under tsx watch so it restarts whenever a file changes.
set -e
cd /app/apps/api

echo "Generating Prisma client..."
npx prisma generate

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding database (no-op if already seeded)..."
npx tsx prisma/seed.ts

echo "Ingesting World Bank data (no-op if already populated)..."
npx tsx src/ingest/worldbank.ts

echo "Starting API in watch mode..."
exec npx tsx watch src/index.ts
