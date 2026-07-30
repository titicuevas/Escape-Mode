import type { DiscoveryDecisionType, InterestStatus, PlatformFamily, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { parseDateOnly, toDateOnlyString } from '../utils/dates.js';
import type { DiscoveryDecideInput, RecoverDismissedInput } from '@grc/shared';
import { serializeGame } from './games.service.js';

const decisionToInterest: Record<
  Exclude<DiscoveryDecisionType, 'DISMISSED'>,
  InterestStatus
> = {
  LIKED: 'INTERESTED',
  THINKING: 'THINKING',
  MUST_BUY: 'MUST_BUY',
};

/** Última decisión por usuario en esta instancia (sesión de proceso). */
const lastDecisionByUser = new Map<string, string>();

export function getLastDecisionId(userId: string): string | undefined {
  return lastDecisionByUser.get(userId);
}

export async function getExcludedRawgIds(userId: string): Promise<Set<number>> {
  const [games, decisions] = await Promise.all([
    prisma.game.findMany({
      where: { userId, rawgId: { not: null } },
      select: { rawgId: true },
    }),
    prisma.discoveryDecision.findMany({
      where: { userId },
      select: { rawgId: true },
    }),
  ]);

  const ids = new Set<number>();
  for (const g of games) {
    if (g.rawgId != null) ids.add(g.rawgId);
  }
  for (const d of decisions) ids.add(d.rawgId);
  return ids;
}

/** Títulos ya en biblioteca (para no volver a mostrarlos en Descubrir si faltaba rawgId). */
export async function getExcludedTitles(userId: string): Promise<Set<string>> {
  const games = await prisma.game.findMany({
    where: { userId },
    select: { title: true },
  });
  return new Set(games.map((g) => normalizeGameTitle(g.title)));
}

export function normalizeGameTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

async function findExistingLibraryGame(
  tx: Prisma.TransactionClient,
  userId: string,
  rawgId: number,
  title: string,
) {
  const byRawg = await tx.game.findFirst({
    where: { userId, rawgId },
  });
  if (byRawg) return byRawg;

  const candidates = await tx.game.findMany({
    where: { userId },
    select: { id: true, title: true, rawgId: true },
  });
  const needle = normalizeGameTitle(title);
  const match = candidates.find(
    (g) => g.rawgId == null && normalizeGameTitle(g.title) === needle,
  );
  if (!match) return null;
  return tx.game.findUniqueOrThrow({ where: { id: match.id } });
}

export async function decideDiscovery(userId: string, input: DiscoveryDecideInput) {
  const interest =
    input.decision === 'DISMISSED' ? null : decisionToInterest[input.decision];

  const result = await prisma.$transaction(async (tx) => {
    const decision = await tx.discoveryDecision.upsert({
      where: {
        userId_rawgId: { userId, rawgId: input.rawgId },
      },
      create: {
        userId,
        rawgId: input.rawgId,
        title: input.title,
        slug: input.slug ?? undefined,
        coverUrl: input.coverUrl ?? undefined,
        backgroundUrl: input.backgroundUrl ?? undefined,
        releaseDate: parseDateOnly(input.releaseDate ?? undefined) ?? undefined,
        platforms: input.platforms,
        genres: input.genres,
        decision: input.decision,
      },
      update: {
        title: input.title,
        slug: input.slug ?? undefined,
        coverUrl: input.coverUrl ?? undefined,
        backgroundUrl: input.backgroundUrl ?? undefined,
        releaseDate: parseDateOnly(input.releaseDate ?? undefined),
        platforms: input.platforms,
        genres: input.genres,
        decision: input.decision,
        decidedAt: new Date(),
      },
    });

    let gameId: string | null = null;

    if (interest) {
      const existing = await findExistingLibraryGame(tx, userId, input.rawgId, input.title);

      if (existing) {
        const updated = await tx.game.update({
          where: { id: existing.id },
          data: {
            interestStatus: interest,
            rawgId: existing.rawgId ?? input.rawgId,
            slug: existing.slug ?? input.slug ?? undefined,
            coverUrl: existing.coverUrl ?? input.coverUrl ?? undefined,
            backgroundUrl: existing.backgroundUrl ?? input.backgroundUrl ?? undefined,
          },
        });
        gameId = updated.id;
      } else {
        const created = await tx.game.create({
          data: {
            userId,
            rawgId: input.rawgId,
            title: input.title,
            slug: input.slug ?? undefined,
            coverUrl: input.coverUrl ?? undefined,
            backgroundUrl: input.backgroundUrl ?? undefined,
            description: input.description ?? undefined,
            releaseDate: parseDateOnly(input.releaseDate ?? undefined) ?? undefined,
            dateSource: 'RAWG',
            platforms: input.platforms,
            normalizedPlatforms: input.normalizedPlatforms as PlatformFamily[],
            genres: input.genres,
            metacritic: input.metacritic ?? undefined,
            interestStatus: interest,
            purchaseStatus: 'UNRESERVED',
            rawgUrl: input.slug ? `https://rawg.io/games/${input.slug}` : undefined,
          },
        });
        gameId = created.id;
      }
    }

    return { decision, gameId };
  });

  lastDecisionByUser.set(userId, result.decision.id);

  return {
    decision: {
      id: result.decision.id,
      rawgId: result.decision.rawgId,
      title: result.decision.title,
      decision: result.decision.decision,
      decidedAt: result.decision.decidedAt.toISOString(),
    },
    gameId: result.gameId,
  };
}

export async function undoLastDecision(userId: string, decisionId: string) {
  const lastId = lastDecisionByUser.get(userId);
  if (!lastId || lastId !== decisionId) {
    throw new AppError(409, 'Solo se puede deshacer la última decisión de esta sesión');
  }

  const decision = await prisma.discoveryDecision.findFirst({
    where: { id: decisionId, userId },
  });
  if (!decision) {
    throw new AppError(404, 'Decisión no encontrada');
  }

  await prisma.$transaction(async (tx) => {
    const game = await tx.game.findFirst({
      where: { userId, rawgId: decision.rawgId },
      include: {
        payments: { take: 1 },
        offers: { take: 1 },
      },
    });

    // Solo borrar el juego si fue creado por descubrir y no tiene datos personales extra
    if (game) {
      const hasPersonalData =
        game.payments.length > 0 ||
        game.offers.length > 0 ||
        game.totalPrice != null ||
        game.notes != null ||
        game.purchaseUrl != null ||
        game.selectedStore != null ||
        game.orderNumber != null ||
        Number(game.amountPaid.toString()) > 0 ||
        game.purchaseStatus !== 'UNRESERVED';

      if (!hasPersonalData && game.dateSource === 'RAWG') {
        await tx.game.delete({ where: { id: game.id } });
      }
    }

    await tx.discoveryDecision.delete({ where: { id: decision.id } });
  });

  lastDecisionByUser.delete(userId);
  return { ok: true, restoredRawgId: decision.rawgId };
}

export async function listDismissed(userId: string) {
  const items = await prisma.discoveryDecision.findMany({
    where: { userId, decision: 'DISMISSED' },
    orderBy: { decidedAt: 'desc' },
  });

  return items.map((d) => ({
    id: d.id,
    rawgId: d.rawgId,
    title: d.title,
    slug: d.slug,
    coverUrl: d.coverUrl,
    backgroundUrl: d.backgroundUrl,
    releaseDate: toDateOnlyString(d.releaseDate),
    platforms: d.platforms,
    genres: d.genres,
    decidedAt: d.decidedAt.toISOString(),
  }));
}

export async function recoverDismissed(userId: string, input: RecoverDismissedInput) {
  const decision = await prisma.discoveryDecision.findFirst({
    where: { userId, rawgId: input.rawgId, decision: 'DISMISSED' },
  });
  if (!decision) {
    throw new AppError(404, 'Juego descartado no encontrado');
  }

  const game = await prisma.$transaction(async (tx) => {
    await tx.discoveryDecision.update({
      where: { id: decision.id },
      data: {
        decision:
          input.interestStatus === 'MUST_BUY'
            ? 'MUST_BUY'
            : input.interestStatus === 'INTERESTED'
              ? 'LIKED'
              : 'THINKING',
        decidedAt: new Date(),
      },
    });

    const existing = await tx.game.findFirst({
      where: { userId, rawgId: input.rawgId },
    });

    if (existing) {
      return tx.game.update({
        where: { id: existing.id },
        data: { interestStatus: input.interestStatus },
      });
    }

    return tx.game.create({
      data: {
        userId,
        rawgId: decision.rawgId,
        title: decision.title,
        slug: decision.slug ?? undefined,
        coverUrl: decision.coverUrl ?? undefined,
        backgroundUrl: decision.backgroundUrl ?? undefined,
        releaseDate: decision.releaseDate ?? undefined,
        dateSource: 'RAWG',
        platforms: decision.platforms,
        genres: decision.genres,
        interestStatus: input.interestStatus,
        purchaseStatus: 'UNRESERVED',
      },
    });
  });

  return { game: serializeGame(game) };
}

export async function getUserPreferredPlatforms(userId: string): Promise<PlatformFamily[]> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  return prefs?.preferredPlatforms ?? ['PLAYSTATION_5'];
}

export async function getDiscoveryMonths(userId: string): Promise<number> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  return prefs?.defaultDiscoveryMonths ?? 12;
}
