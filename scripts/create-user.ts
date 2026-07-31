/**
 * Crea un usuario (sin registro público).
 * Uso:
 *   CREATE_USER_EMAIL=amigo@ejemplo.com CREATE_USER_PASSWORD='secreto' pnpm exec tsx scripts/create-user.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient, PlatformFamily } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = process.env.CREATE_USER_EMAIL?.toLowerCase().trim();
  const password = process.env.CREATE_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Faltan CREATE_USER_EMAIL o CREATE_USER_PASSWORD');
  }
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL en .env');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`El usuario ya existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      userPreferences: {
        create: {
          preferredPlatforms: [PlatformFamily.PLAYSTATION_5],
          defaultDiscoveryMonths: 12,
        },
      },
    },
  });

  console.log(`Usuario creado: ${user.email} (${user.id})`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
