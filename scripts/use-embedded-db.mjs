#!/usr/bin/env node
/**
 * Actualiza DATABASE_URL en .env para usar el PostgreSQL embebido.
 * No imprime secretos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const urlFile = path.join(root, 'data', 'database-url.local');
const envFile = path.join(root, '.env');

if (!fs.existsSync(urlFile)) {
  console.error('No existe data/database-url.local. Ejecuta antes: pnpm db:embedded');
  process.exit(1);
}

const url = fs.readFileSync(urlFile, 'utf8').trim();
if (!url.startsWith('postgresql://')) {
  console.error('URL de base de datos inválida.');
  process.exit(1);
}

let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
if (/^DATABASE_URL=/m.test(env)) {
  env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`);
} else {
  env = `DATABASE_URL=${url}\n${env}`;
}

fs.writeFileSync(envFile, env, { mode: 0o600 });
console.log('DATABASE_URL actualizada para PostgreSQL embebido (127.0.0.1:5433).');
