import { getEnv } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import {
  isLikelyDlcOrAddition,
  mapGenreNamesToRawgIds,
  normalizeRawgDetail,
  normalizeRawgListItem,
  normalizeRawgTrailers,
  RAWG_PLATFORM_IDS,
  tasteOverlapScore,
  type NormalizedRawgGame,
} from './normalize.js';
import type { PlatformFamily } from '@prisma/client';
import type { RawgDiscoverQuery } from '@grc/shared';
import { normalizeGameTitle } from '../discovery.service.js';

const RAWG_BASE = 'https://api.rawg.io/api';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 2 * 60 * 1000;

type CacheEntry = { expiresAt: number; payload: unknown };

const memoryCache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function setCache(key: string, payload: unknown) {
  memoryCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  // limpieza simple
  if (memoryCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.expiresAt < now) memoryCache.delete(k);
    }
  }
}

async function rawgFetch(path: string, params: Record<string, string | number | undefined>) {
  const env = getEnv();
  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set('key', env.RAWG_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const cacheKey = url.toString().replace(env.RAWG_API_KEY, 'REDACTED');
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      throw new AppError(503, 'RAWG está limitando peticiones. Inténtalo en unos minutos.');
    }
    if (!response.ok) {
      throw new AppError(502, 'No se pudo consultar RAWG en este momento.');
    }

    const data: unknown = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'Tiempo de espera agotado al consultar RAWG.');
    }
    throw new AppError(502, 'Error de red al consultar RAWG.');
  } finally {
    clearTimeout(timer);
  }
}

export class RawgService {
  async search(query: string, pageSize = 10): Promise<NormalizedRawgGame[]> {
    const data = (await rawgFetch('/games', {
      search: query,
      page_size: Math.min(pageSize, 10),
    })) as { results?: Record<string, unknown>[] };

    const results = data.results ?? [];
    return results
      .map((item) => normalizeRawgListItem(item))
      .filter((g): g is NormalizedRawgGame => g !== null)
      .slice(0, 10);
  }

  async getGame(rawgId: number): Promise<NormalizedRawgGame> {
    const [data, movies] = await Promise.all([
      rawgFetch(`/games/${rawgId}`, {}) as Promise<Record<string, unknown>>,
      rawgFetch(`/games/${rawgId}/movies`, {}).catch(() => ({ results: [] })),
    ]);
    const normalized = normalizeRawgDetail(data);
    if (!normalized) {
      throw new AppError(404, 'Juego no encontrado en RAWG');
    }
    return {
      ...normalized,
      trailers: normalizeRawgTrailers(movies),
    };
  }

  async discover(
    query: RawgDiscoverQuery,
    options: {
      preferredPlatforms: PlatformFamily[];
      excludeRawgIds: Set<number>;
      excludeTitles?: Set<string>;
      preferredGenres?: string[];
      useTaste?: boolean;
    },
  ): Promise<{
    items: NormalizedRawgGame[];
    page: number;
    hasMore: boolean;
    rawgUnavailable?: boolean;
    tasteGenres?: string[];
    tasteApplied?: boolean;
  }> {
    const today = new Date();
    const defaultTo = new Date(today);
    defaultTo.setMonth(defaultTo.getMonth() + 12);

    const dateFrom = query.dateFrom ?? today.toISOString().slice(0, 10);
    const dateTo = query.dateTo ?? defaultTo.toISOString().slice(0, 10);

    const platforms =
      query.platforms && query.platforms.length > 0
        ? query.platforms
        : options.preferredPlatforms.length > 0
          ? options.preferredPlatforms
          : (['PLAYSTATION_5'] as PlatformFamily[]);

    const platformIds = platforms
      .map((p) => RAWG_PLATFORM_IDS[p])
      .filter((id): id is number => id != null);

    const preferredGenres = options.preferredGenres ?? [];
    const useTaste = options.useTaste !== false && preferredGenres.length > 0;
    const tasteGenreIds = useTaste ? mapGenreNamesToRawgIds(preferredGenres) : [];
    const manualGenres = query.genres?.trim() || undefined;
    const tasteGenresParam =
      !manualGenres && tasteGenreIds.length > 0 ? tasteGenreIds.join(',') : undefined;

    const fetchPage = async (genresParam?: string) =>
      (await rawgFetch('/games', {
        dates: `${dateFrom},${dateTo}`,
        platforms: platformIds.length > 0 ? platformIds.join(',') : undefined,
        ordering: query.ordering,
        page: query.page,
        page_size: query.pageSize,
        genres: genresParam || manualGenres || undefined,
        exclude_additions: 'true',
      })) as { results?: Record<string, unknown>[]; next?: string | null };

    const process = (data: { results?: Record<string, unknown>[]; next?: string | null }) => {
      const excludeTitles = options.excludeTitles ?? new Set<string>();
      let items = (data.results ?? [])
        .filter((raw) => !isLikelyDlcOrAddition(raw as never))
        .map((item) => normalizeRawgListItem(item))
        .filter((g): g is NormalizedRawgGame => g !== null)
        .filter((g) => !options.excludeRawgIds.has(g.rawgId))
        .filter((g) => !excludeTitles.has(normalizeGameTitle(g.title)))
        .filter((g) => (query.requireDate ? Boolean(g.releaseDate) : true))
        .filter((g) => {
          if (g.normalizedPlatforms.length === 0) return false;
          return g.normalizedPlatforms.some((p) => platforms.includes(p) || p === 'OTHER');
        });

      if (useTaste && preferredGenres.length > 0) {
        items = [...items].sort((a, b) => {
          const scoreDiff =
            tasteOverlapScore(b.genres, preferredGenres) -
            tasteOverlapScore(a.genres, preferredGenres);
          if (scoreDiff !== 0) return scoreDiff;
          const da = a.releaseDate ?? '';
          const db = b.releaseDate ?? '';
          return da.localeCompare(db);
        });
      }

      return {
        items,
        hasMore: Boolean(data.next),
      };
    };

    try {
      let tasteApplied = Boolean(tasteGenresParam);
      let data = await fetchPage(tasteGenresParam);
      let processed = process(data);

      // Si el filtro de gustos deja el mazo vacío, ampliamos sin géneros
      if (tasteApplied && processed.items.length === 0 && query.page === 1) {
        tasteApplied = false;
        data = await fetchPage(undefined);
        processed = process(data);
      }

      return {
        items: processed.items,
        page: query.page,
        hasMore: processed.hasMore,
        tasteGenres: preferredGenres,
        tasteApplied,
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          items: [],
          page: query.page,
          hasMore: false,
          rawgUnavailable: true,
          tasteGenres: preferredGenres,
          tasteApplied: false,
        };
      }
      throw error;
    }
  }
}

export const rawgService = new RawgService();
