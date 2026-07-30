import { prisma } from '../config/prisma.js';
import { RawgService } from './rawg/rawg.service.js';

/** Portadas públicas de RAWG para títulos del seed (sin depender de la API). */
export const KNOWN_GAME_COVERS: Record<string, string> = {
  'Marvel Tōkon: Fighting Souls':
    'https://media.rawg.io/media/resize/1280/-/screenshots/4ba/4ba7897954c31431c9b38cf18b9e9fdf.jpeg',
  "Marvel's Wolverine":
    'https://media.rawg.io/media/resize/1280/-/games/28d/28d61be51ec0411e24c28f71122dcaaf.jpeg',
  'EA Sports FC 27':
    'https://media.rawg.io/media/resize/1280/-/screenshots/70f/70fb740261ef152d0d3392a9a306c9ca.jpg',
  'Grand Theft Auto VI':
    'https://media.rawg.io/media/resize/1280/-/games/734/7342a1cd82c8997ec620084ae4c2e7e4.jpg',
};

function missingCoverWhere(userId?: string) {
  return {
    ...(userId ? { userId } : {}),
    OR: [{ coverUrl: null }, { coverUrl: '' }],
  };
}

/** Rellena portadas de títulos conocidos. No llama a RAWG. */
export async function backfillKnownCovers(userId?: string): Promise<number> {
  let updated = 0;
  for (const [title, coverUrl] of Object.entries(KNOWN_GAME_COVERS)) {
    const result = await prisma.game.updateMany({
      where: {
        title,
        ...(userId ? { userId } : {}),
        OR: [{ coverUrl: null }, { coverUrl: '' }],
      },
      data: { coverUrl, backgroundUrl: coverUrl },
    });
    updated += result.count;
  }
  return updated;
}

/**
 * Rellena portadas faltantes: primero mapa conocido, luego RAWG.
 * Seguro de reejecutar (solo toca juegos sin coverUrl).
 */
export async function backfillMissingCovers(userId?: string): Promise<{
  scanned: number;
  updated: number;
}> {
  const knownUpdated = await backfillKnownCovers(userId);

  const games = await prisma.game.findMany({
    where: missingCoverWhere(userId),
    select: { id: true, title: true, rawgId: true },
  });

  if (games.length === 0) {
    return { scanned: knownUpdated, updated: knownUpdated };
  }

  const rawg = new RawgService();
  let updated = knownUpdated;

  for (const game of games) {
    let coverUrl: string | null = KNOWN_GAME_COVERS[game.title] ?? null;
    let rawgId: number | undefined;
    let slug: string | null | undefined;

    if (!coverUrl) {
      try {
        if (game.rawgId) {
          const detail = await rawg.getGame(game.rawgId);
          coverUrl = detail.coverUrl;
        } else {
          const results = await rawg.search(game.title, 5);
          const best = results.find((r) => r.coverUrl) ?? results[0];
          coverUrl = best?.coverUrl ?? null;
          rawgId = best?.rawgId;
          slug = best?.slug;
        }
      } catch {
        continue;
      }
    }

    if (!coverUrl) continue;

    await prisma.game.update({
      where: { id: game.id },
      data: {
        coverUrl,
        backgroundUrl: coverUrl,
        ...(rawgId
          ? {
              rawgId,
              slug: slug ?? undefined,
            }
          : {}),
      },
    });
    updated += 1;
  }

  return { scanned: knownUpdated + games.length, updated };
}
