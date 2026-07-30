import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  PlatformFamily,
  InterestStatus,
  PurchaseStatus,
  DateSource,
  PaymentType,
} from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan ADMIN_EMAIL o ADMIN_INITIAL_PASSWORD. Configúralas en .env antes de ejecutar el seed.',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Usuario administrador ya existe: ${email}`);
    return existing;
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

  console.log(`Usuario administrador creado: ${email}`);
  return user;
}

async function seedDevGames(userId: string) {
  // En desarrollo se cargan por defecto; en producción solo con SEED_DEV_GAMES=true
  const shouldSeed =
    process.env.SEED_DEV_GAMES === 'true' ||
    (process.env.SEED_DEV_GAMES !== 'false' && process.env.NODE_ENV !== 'production');

  if (!shouldSeed) {
    console.log('Seed de juegos de ejemplo omitido.');
    return;
  }

  const samples = [
    {
      title: 'Marvel Tōkon: Fighting Souls',
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      releaseDate: new Date('2026-08-06'),
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.RESERVED,
      dateSource: DateSource.MANUAL,
      notes: 'Dato manual de desarrollo. Precio pendiente.',
    },
    {
      title: "Marvel's Wolverine",
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      releaseDate: new Date('2026-09-15'),
      selectedEdition: 'Steelbook',
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.PARTIALLY_PAID,
      includesBonus: true,
      bonusDescription: 'Steelbook',
      dateSource: DateSource.MANUAL,
      amountPaid: 3,
      notes: 'Dato manual de desarrollo. Precio total desconocido.',
    },
    {
      title: 'EA Sports FC 27',
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      earlyAccessDate: new Date('2026-09-18'),
      selectedEdition: 'Ultimate',
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.PAID,
      useEarlyAccessAsMainDate: true,
      dateSource: DateSource.MANUAL,
      notes: 'Dato manual de desarrollo. Precio total pendiente.',
    },
    {
      title: 'Grand Theft Auto VI',
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      releaseDate: new Date('2026-11-19'),
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.PAID,
      dateSource: DateSource.MANUAL,
      notes: 'Dato manual de desarrollo. Precio total pendiente.',
    },
  ] as const;

  for (const sample of samples) {
    const existing = await prisma.game.findFirst({
      where: { userId, title: sample.title },
    });

    if (existing) {
      console.log(`Juego de ejemplo ya existe: ${sample.title}`);
      continue;
    }

    const game = await prisma.game.create({
      data: {
        userId,
        ...sample,
      },
    });

    if (sample.title === "Marvel's Wolverine") {
      await prisma.paymentHistory.create({
        data: {
          gameId: game.id,
          amount: 3,
          paymentDate: new Date(),
          paymentType: PaymentType.RESERVATION,
          notes: 'Reserva inicial (dato de desarrollo)',
        },
      });
    }

    console.log(`Juego de ejemplo creado: ${sample.title}`);
  }
}

async function main() {
  const admin = await seedAdmin();
  await seedDevGames(admin.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(
      'Error en el seed:',
      error instanceof Error ? error.message : 'Error desconocido',
    );
    await prisma.$disconnect();
    process.exit(1);
  });
