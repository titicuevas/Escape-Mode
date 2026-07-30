#!/usr/bin/env bash
set -euo pipefail
# Crea rol y base para desarrollo local (requiere privilegios de postgres)
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grc') THEN
    CREATE ROLE grc LOGIN PASSWORD 'grc_dev_local';
  END IF;
END
$$;
SELECT 'CREATE DATABASE game_calendar OWNER grc'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'game_calendar')\gexec
GRANT ALL PRIVILEGES ON DATABASE game_calendar TO grc;
\c game_calendar
GRANT ALL ON SCHEMA public TO grc;
ALTER SCHEMA public OWNER TO grc;
SQL
echo "Base de datos local lista."
