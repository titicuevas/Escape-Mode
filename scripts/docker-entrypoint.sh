#!/bin/sh
set -eu
echo "Aplicando migraciones Prisma…"
pnpm exec prisma migrate deploy
echo "Arrancando Game Release Calendar…"
exec node server/dist/server.js
