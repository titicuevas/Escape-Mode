import type { DateSource, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { parseDateOnly, toDateOnlyString } from '../utils/dates.js';
import { RawgService } from './rawg/rawg.service.js';
import type { NormalizedRawgGame } from './rawg/normalize.js';

/** Fechas oficiales conocidas (prioridad sobre RAWG). */
export const KNOWN_OFFICIAL_DATES: Record<
  string,
  {
    releaseDate?: string;
    earlyAccessDate?: string | null;
    useEarlyAccessAsMainDate?: boolean;
  }
> = {
  'Marvel Tōkon: Fighting Souls': { releaseDate: '2026-08-06' },
  "Marvel's Wolverine": { releaseDate: '2026-09-15' },
  'EA Sports FC 27': {
    earlyAccessDate: '2026-09-18',
    useEarlyAccessAsMainDate: true,
  },
  'Grand Theft Auto VI': { releaseDate: '2026-11-19' },
};

function datesEqual(a: Date | null, b: Date | null): boolean {
  return toDateOnlyString(a) === toDateOnlyString(b);
}

async function canAssignRawgId(
  userId: string,
  gameId: string,
  rawgId: number,
): Promise<boolean> {
  const clash = await prisma.game.findFirst({
    where: { userId, rawgId, NOT: { id: gameId } },
    select: { id: true },
  });
  return !clash;
}

/** Aplica fechas oficiales del mapa conocido. No llama a RAWG. */
export async function backfillKnownOfficialDates(userId?: string): Promise<number> {
  let updated = 0;
  for (const [title, known] of Object.entries(KNOWN_OFFICIAL_DATES)) {
    const games = await prisma.game.findMany({
      where: { title, ...(userId ? { userId } : {}) },
      select: {
        id: true,
        releaseDate: true,
        earlyAccessDate: true,
        useEarlyAccessAsMainDate: true,
        dateSource: true,
      },
    });

    for (const game of games) {
      const releaseDate = known.releaseDate ? parseDateOnly(known.releaseDate) : game.releaseDate;
      const earlyAccessDate =
        known.earlyAccessDate === undefined
          ? game.earlyAccessDate
          : known.earlyAccessDate === null
            ? null
            : parseDateOnly(known.earlyAccessDate);
      const useEarlyAccessAsMainDate =
        known.useEarlyAccessAsMainDate ?? game.useEarlyAccessAsMainDate;

      const needsUpdate =
        !datesEqual(game.releaseDate, releaseDate ?? null) ||
        !datesEqual(game.earlyAccessDate, earlyAccessDate ?? null) ||
        game.useEarlyAccessAsMainDate !== useEarlyAccessAsMainDate ||
        game.dateSource !== 'OFFICIAL';

      if (!needsUpdate) continue;

      await prisma.game.update({
        where: { id: game.id },
        data: {
          releaseDate: releaseDate ?? null,
          earlyAccessDate: earlyAccessDate ?? null,
          useEarlyAccessAsMainDate,
          dateSource: 'OFFICIAL',
        },
      });
      updated += 1;
    }
  }
  return updated;
}

export type RefreshMetadataResult = {
  scanned: number;
  updated: number;
  skippedOfficial: number;
  failed: number;
};

/**
 * Actualiza fechas y metadata desde RAWG.
 * - Títulos del mapa oficial → siempre OFFICIAL (no RAWG).
 * - dateSource OFFICIAL sin mapa → no pisa fechas (sí puede completar portada/rawgId).
 * - Resto → releaseDate + metadata desde RAWG.
 */
export async function refreshMetadataFromRawg(
  userId: string,
  options?: { gameId?: string },
): Promise<RefreshMetadataResult> {
  const games = await prisma.game.findMany({
    where: {
      userId,
      ...(options?.gameId ? { id: options.gameId } : {}),
    },
    select: {
      id: true,
      title: true,
      rawgId: true,
      coverUrl: true,
      backgroundUrl: true,
      description: true,
      releaseDate: true,
      earlyAccessDate: true,
      useEarlyAccessAsMainDate: true,
      dateSource: true,
      platforms: true,
      genres: true,
      slug: true,
      developer: true,
      publisher: true,
      metacritic: true,
      officialUrl: true,
      rawgUrl: true,
    },
  });

  if (games.length === 0) {
    return { scanned: 0, updated: 0, skippedOfficial: 0, failed: 0 };
  }

  const rawg = new RawgService();
  let updated = 0;
  let skippedOfficial = 0;
  let failed = 0;

  for (const game of games) {
    const known = KNOWN_OFFICIAL_DATES[game.title];
    if (known) {
      const releaseDate = known.releaseDate ? parseDateOnly(known.releaseDate) : game.releaseDate;
      const earlyAccessDate =
        known.earlyAccessDate === undefined
          ? game.earlyAccessDate
          : known.earlyAccessDate === null
            ? null
            : parseDateOnly(known.earlyAccessDate);
      const useEarlyAccessAsMainDate =
        known.useEarlyAccessAsMainDate ?? game.useEarlyAccessAsMainDate;

      const data: Prisma.GameUpdateInput = {
        releaseDate: releaseDate ?? null,
        earlyAccessDate: earlyAccessDate ?? null,
        useEarlyAccessAsMainDate,
        dateSource: 'OFFICIAL' satisfies DateSource,
      };

      // Completar portada/rawgId si falta
      if (!game.coverUrl || !game.rawgId) {
        try {
          const detail = game.rawgId
            ? await rawg.getGame(game.rawgId)
            : (await rawg.search(game.title, 5))[0];
          if (detail) {
            if (!game.coverUrl && detail.coverUrl) {
              data.coverUrl = detail.coverUrl;
              data.backgroundUrl = detail.backgroundUrl ?? detail.coverUrl;
            }
            if (
              !game.rawgId &&
              (await canAssignRawgId(userId, game.id, detail.rawgId))
            ) {
              data.rawgId = detail.rawgId;
              data.slug = detail.slug ?? undefined;
              data.rawgUrl = detail.rawgUrl ?? undefined;
            }
          }
        } catch {
          /* ignore */
        }
      }

      try {
        await prisma.game.update({ where: { id: game.id }, data });
        updated += 1;
      } catch {
        failed += 1;
      }
      continue;
    }

    let detail: NormalizedRawgGame | null | undefined;
    try {
      if (game.rawgId) {
        detail = await rawg.getGame(game.rawgId);
      } else {
        const results = await rawg.search(game.title, 5);
        const first = results[0];
        if (first) {
          detail = await rawg.getGame(first.rawgId).catch(() => first);
        }
      }
    } catch {
      failed += 1;
      continue;
    }

    if (!detail) {
      failed += 1;
      continue;
    }

    const protectDates = game.dateSource === 'OFFICIAL';
    if (protectDates) skippedOfficial += 1;

    const data: Prisma.GameUpdateInput = {
      slug: detail.slug ?? game.slug,
      rawgUrl: detail.rawgUrl ?? game.rawgUrl,
      platforms: detail.platforms.length ? detail.platforms : game.platforms,
      normalizedPlatforms: detail.normalizedPlatforms.length
        ? detail.normalizedPlatforms
        : undefined,
      genres: detail.genres.length ? detail.genres : game.genres,
      developer: detail.developer ?? game.developer,
      publisher: detail.publisher ?? game.publisher,
      metacritic: detail.metacritic ?? game.metacritic,
      officialUrl: detail.officialUrl ?? game.officialUrl,
    };

    if (
      detail.rawgId &&
      (game.rawgId === detail.rawgId ||
        (await canAssignRawgId(userId, game.id, detail.rawgId)))
    ) {
      data.rawgId = detail.rawgId;
    }

    if (!game.coverUrl && detail.coverUrl) {
      data.coverUrl = detail.coverUrl;
      data.backgroundUrl = detail.backgroundUrl ?? detail.coverUrl;
    } else if (detail.coverUrl && !game.backgroundUrl) {
      data.backgroundUrl = detail.backgroundUrl ?? detail.coverUrl;
    }

    if (!game.description && detail.description) {
      data.description = detail.description;
    }

    if (!protectDates && detail.releaseDate) {
      data.releaseDate = parseDateOnly(detail.releaseDate);
      data.dateSource = 'RAWG';
    }

    try {
      await prisma.game.update({ where: { id: game.id }, data });
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    scanned: games.length,
    updated,
    skippedOfficial,
    failed,
  };
}
