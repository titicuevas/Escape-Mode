import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga .env desde la raíz del monorepo
loadDotenv({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  RAWG_API_KEY: z.string().min(1, 'RAWG_API_KEY es obligatoria'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL debe ser un correo válido'),
  ADMIN_INITIAL_PASSWORD: z.string().min(8, 'ADMIN_INITIAL_PASSWORD debe tener al menos 8 caracteres'),
  SESSION_DURATION_DAYS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

function formatZodEnvError(error: z.ZodError): string {
  const missing = error.issues.map((issue) => {
    const key = issue.path.join('.') || 'desconocida';
    return `- ${key}: ${issue.message}`;
  });

  return [
    'Error de configuración: faltan o son inválidas variables de entorno.',
    'Revisa tu archivo .env (raíz del proyecto) o las variables de Railway.',
    ...missing,
  ].join('\n');
}

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  const source = { ...process.env, ...overrides };
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(formatZodEnvError(result.error));
  }

  return result.data;
}

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}

/** Solo para tests: reinicia la caché de entorno */
export function resetEnvCache(): void {
  cachedEnv = null;
}
