import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { cleanupExpiredSessions } from './services/auth.service.js';

async function main() {
  const env = loadEnv();
  const app = createApp(env);

  app.listen(env.PORT, () => {
    console.log(`Game Release Calendar escuchando en el puerto ${env.PORT}`);
    console.log(`Entorno: ${env.NODE_ENV}`);
  });

  // Limpieza periódica de sesiones expiradas (cada hora)
  const CLEANUP_MS = 60 * 60 * 1000;
  setInterval(() => {
    void cleanupExpiredSessions().catch(() => undefined);
  }, CLEANUP_MS);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error desconocido al arrancar';
  console.error(message);
  process.exit(1);
});
