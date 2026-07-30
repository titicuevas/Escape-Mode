#!/usr/bin/env node
/**
 * Arranca PostgreSQL embebido para desarrollo local (sin Docker ni sudo).
 * Puerto por defecto: 5433
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const databaseDir = path.join(root, 'data', 'pg');
const port = Number(process.env.EMBEDDED_PG_PORT || 5433);
const password = process.env.EMBEDDED_PG_PASSWORD || 'grc_dev_local';
const database = process.env.EMBEDDED_PG_DATABASE || 'game_calendar';

fs.mkdirSync(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password,
  port,
  persistent: true,
  onLog: () => undefined,
  onError: (message) => {
    console.error('[embedded-pg]', message);
  },
});

const marker = path.join(databaseDir, '.grc-initialized');

async function main() {
  const alreadyInit = fs.existsSync(marker);

  if (!alreadyInit) {
    console.log('Inicializando PostgreSQL embebido…');
    await pg.initialise();
    fs.writeFileSync(marker, new Date().toISOString());
  }

  console.log(`Arrancando PostgreSQL en 127.0.0.1:${port}…`);
  await pg.start();

  try {
    await pg.createDatabase(database);
    console.log(`Base de datos «${database}» lista.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      // En reinicios la DB ya existe: OK
      if (!alreadyInit) throw error;
    }
  }

  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/${database}`;
  console.log('PostgreSQL embebido en marcha.');
  console.log(`Usa DATABASE_URL apuntando a 127.0.0.1:${port}/${database}`);
  console.log('Mantén esta terminal abierta mientras desarrollas.');
  console.log('Ctrl+C para detener.');

  // Exponer URL en archivo local ignorado (sin imprimir password en logs de más)
  fs.writeFileSync(
    path.join(root, 'data', 'database-url.local'),
    `${url}\n`,
    { mode: 0o600 },
  );

  const stop = async () => {
    console.log('\nDeteniendo PostgreSQL embebido…');
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());

  // Mantener proceso vivo
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error('No se pudo arrancar PostgreSQL embebido:', error instanceof Error ? error.message : error);
  process.exit(1);
});
