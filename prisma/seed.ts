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
  MediaFormat,
  Prisma,
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

type SampleGame = {
  title: string;
  selectedPlatform: string;
  normalizedPlatforms: PlatformFamily[];
  platforms: string[];
  releaseDate?: Date;
  earlyAccessDate?: Date;
  selectedEdition?: string;
  interestStatus: InterestStatus;
  purchaseStatus: PurchaseStatus;
  dateSource: DateSource;
  mediaFormat: MediaFormat;
  selectedStore: string;
  totalPrice: number;
  amountPaid?: number;
  purchaseUrl?: string;
  includesBonus?: boolean;
  bonusDescription?: string;
  useEarlyAccessAsMainDate?: boolean;
  notes: string;
  searchQuery?: string;
  coverUrl?: string;
};

async function fetchRawgCover(title: string, searchQuery?: string): Promise<{
  rawgId: number;
  slug: string | null;
  coverUrl: string;
} | null> {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key || key === 'local-dev-placeholder') return null;

  const query = searchQuery || title;
  const url = new URL('https://api.rawg.io/api/games');
  url.searchParams.set('key', key);
  url.searchParams.set('search', query);
  url.searchParams.set('page_size', '5');

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ id: number; name: string; slug?: string; background_image?: string | null }>;
    };
    const results = data.results ?? [];
    const exact =
      results.find((r) => r.name.toLowerCase() === title.toLowerCase()) ??
      results.find((r) => r.background_image) ??
      results[0];
    if (!exact?.background_image) return null;
    return {
      rawgId: exact.id,
      slug: exact.slug ?? null,
      coverUrl: exact.background_image,
    };
  } catch {
    return null;
  }
}

async function seedDevGames(userId: string) {
  // En desarrollo se cargan por defecto; en producción solo con SEED_DEV_GAMES=true
  const shouldSeed =
    process.env.SEED_DEV_GAMES === 'true' ||
    (process.env.SEED_DEV_GAMES !== 'false' && process.env.NODE_ENV !== 'production');

  if (!shouldSeed) {
    console.log('Seed de juegos de ejemplo omitido (pon SEED_DEV_GAMES=true para forzar).');
    return;
  }

  const samples: SampleGame[] = [
    {
      title: 'Marvel Tōkon: Fighting Souls',
      searchQuery: 'Marvel Tokon Fighting Souls',
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      releaseDate: new Date('2026-08-06'),
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.RESERVED,
      dateSource: DateSource.OFFICIAL,
      mediaFormat: MediaFormat.PHYSICAL,
      selectedStore: 'Amazon',
      totalPrice: 59.9,
      purchaseUrl: 'https://www.amazon.es/dp/B0GP25C41K',
      coverUrl:
        'https://media.rawg.io/media/resize/1280/-/screenshots/4ba/4ba7897954c31431c9b38cf18b9e9fdf.jpeg',
      notes: 'Reserva Amazon. Físico.',
    },
    {
      title: "Marvel's Wolverine",
      searchQuery: "Marvel's Wolverine",
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      releaseDate: new Date('2026-09-15'),
      selectedEdition: 'Steelbook',
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.PARTIALLY_PAID,
      includesBonus: true,
      bonusDescription: 'Steelbook',
      dateSource: DateSource.OFFICIAL,
      mediaFormat: MediaFormat.PHYSICAL,
      selectedStore: 'GAME',
      totalPrice: 79.99,
      amountPaid: 3,
      purchaseUrl: 'https://www.game.es/videojuegos/accion/playstation-5/marvel-lobezno/253892',
      coverUrl:
        'https://media.rawg.io/media/resize/1280/-/games/28d/28d61be51ec0411e24c28f71122dcaaf.jpeg',
      notes: 'Reserva GAME con Steelbook. 3 € pagados.',
    },
    {
      title: 'EA Sports FC 27',
      searchQuery: 'EA Sports FC 26',
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      earlyAccessDate: new Date('2026-09-18'),
      selectedEdition: 'Ultimate',
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.RESERVED,
      useEarlyAccessAsMainDate: true,
      dateSource: DateSource.OFFICIAL,
      mediaFormat: MediaFormat.DIGITAL,
      selectedStore: 'PlayStation Store',
      totalPrice: 100,
      coverUrl:
        'https://media.rawg.io/media/resize/1280/-/screenshots/70f/70fb740261ef152d0d3392a9a306c9ca.jpg',
      notes: 'Edición Ultimate digital en PSN. Acceso anticipado (fecha oficial de juego).',
    },
    {
      title: 'Grand Theft Auto VI',
      searchQuery: 'Grand Theft Auto VI',
      selectedPlatform: 'PlayStation 5',
      normalizedPlatforms: [PlatformFamily.PLAYSTATION_5],
      platforms: ['PlayStation 5'],
      releaseDate: new Date('2026-11-19'),
      interestStatus: InterestStatus.MUST_BUY,
      purchaseStatus: PurchaseStatus.PAID,
      dateSource: DateSource.OFFICIAL,
      mediaFormat: MediaFormat.DIGITAL,
      selectedStore: 'PlayStation Store',
      totalPrice: 100,
      amountPaid: 100,
      coverUrl:
        'https://media.rawg.io/media/resize/1280/-/games/734/7342a1cd82c8997ec620084ae4c2e7e4.jpg',
      notes: 'Digital PSN. Pagado.',
    },
  ];

  for (const sample of samples) {
    const existing = await prisma.game.findFirst({
      where: { userId, title: sample.title },
    });

    const rawg = await fetchRawgCover(sample.title, sample.searchQuery);
    const coverUrl = rawg?.coverUrl ?? sample.coverUrl;

    const data: Prisma.GameUncheckedCreateInput = {
      userId,
      title: sample.title,
      selectedPlatform: sample.selectedPlatform,
      normalizedPlatforms: sample.normalizedPlatforms,
      platforms: sample.platforms,
      releaseDate: sample.releaseDate,
      earlyAccessDate: sample.earlyAccessDate,
      selectedEdition: sample.selectedEdition,
      interestStatus: sample.interestStatus,
      purchaseStatus: sample.purchaseStatus,
      dateSource: sample.dateSource,
      mediaFormat: sample.mediaFormat,
      selectedStore: sample.selectedStore,
      totalPrice: sample.totalPrice,
      amountPaid: sample.amountPaid ?? 0,
      purchaseUrl: sample.purchaseUrl,
      includesBonus: sample.includesBonus ?? false,
      bonusDescription: sample.bonusDescription,
      useEarlyAccessAsMainDate: sample.useEarlyAccessAsMainDate ?? false,
      notes: sample.notes,
      coverUrl,
      backgroundUrl: coverUrl,
      rawgId: rawg?.rawgId,
      slug: rawg?.slug ?? undefined,
    };

    if (existing) {
      await prisma.game.update({
        where: { id: existing.id },
        data: {
          selectedPlatform: data.selectedPlatform,
          selectedEdition: data.selectedEdition,
          interestStatus: data.interestStatus,
          purchaseStatus: data.purchaseStatus,
          mediaFormat: data.mediaFormat,
          selectedStore: data.selectedStore,
          totalPrice: data.totalPrice,
          amountPaid: data.amountPaid,
          purchaseUrl: data.purchaseUrl,
          includesBonus: data.includesBonus,
          bonusDescription: data.bonusDescription,
          useEarlyAccessAsMainDate: data.useEarlyAccessAsMainDate,
          dateSource: data.dateSource,
          notes: data.notes,
          releaseDate: data.releaseDate,
          earlyAccessDate: data.earlyAccessDate,
          coverUrl: data.coverUrl,
          backgroundUrl: data.backgroundUrl,
          ...(rawg
            ? {
                rawgId: rawg.rawgId,
                slug: rawg.slug,
              }
            : {}),
        },
      });
      console.log(
        `Juego de ejemplo actualizado: ${sample.title}${coverUrl ? ' (con portada)' : ''}`,
      );
      continue;
    }

    const game = await prisma.game.create({ data });

    if (sample.title === "Marvel's Wolverine") {
      await prisma.paymentHistory.create({
        data: {
          gameId: game.id,
          amount: 3,
          paymentDate: new Date(),
          paymentType: PaymentType.RESERVATION,
          notes: 'Reserva inicial GAME',
        },
      });
    }

    if (sample.title === 'Grand Theft Auto VI') {
      await prisma.paymentHistory.create({
        data: {
          gameId: game.id,
          amount: 100,
          paymentDate: new Date(),
          paymentType: PaymentType.PAYMENT,
          notes: 'Pago PSN',
        },
      });
    }

    console.log(`Juego de ejemplo creado: ${sample.title}${coverUrl ? ' (con portada)' : ''}`);
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
