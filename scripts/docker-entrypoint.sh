#!/bin/sh
set -eu

cd /app

echo "Aplicando migraciones Prisma…"
if [ -x "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy
else
  echo "No se encontró el binario de Prisma en node_modules/.bin/prisma" >&2
  exit 1
fi

echo "Arrancando Game Release Calendar en 0.0.0.0:${PORT:-3000}…"
exec node server/dist/server.js
