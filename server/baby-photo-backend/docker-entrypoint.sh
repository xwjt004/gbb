#!/bin/sh
set -e

echo "=== Running database sync (db push) ==="
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  db push failed, but continuing..."

echo "=== Starting application ==="
exec node dist/main.js
