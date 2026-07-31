import type { PlatformFamily } from '@prisma/client';

/** Mapeo de nombres RAWG → familia normalizada */
export function normalizePlatformName(name: string): PlatformFamily {
  const n = name.toLowerCase();
  if (n.includes('playstation 5') || n === 'ps5') return 'PLAYSTATION_5';
  if (n.includes('xbox series')) return 'XBOX_SERIES';
  if (n.includes('switch 2')) return 'NINTENDO_SWITCH_2';
  if (n.includes('nintendo switch') || n === 'switch') return 'NINTENDO_SWITCH';
  if (n === 'pc' || n.includes('windows') || n.includes('mac') || n.includes('linux')) return 'PC';
  return 'OTHER';
}

export function normalizePlatforms(names: string[]): PlatformFamily[] {
  return [...new Set(names.map(normalizePlatformName))];
}

/** IDs de plataforma RAWG usados en filtros de discover */
export const RAWG_PLATFORM_IDS: Record<PlatformFamily, number | null> = {
  PLAYSTATION_5: 187,
  XBOX_SERIES: 186,
  NINTENDO_SWITCH: 7,
  NINTENDO_SWITCH_2: null, // aún no estable en RAWG; se filtra por nombre después
  PC: 4,
  OTHER: null,
};

export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function isLikelyDlcOrAddition(game: {
  name?: string | null;
  slug?: string | null;
  parent_platforms?: unknown;
  genres?: Array<{ slug?: string }>;
  tags?: Array<{ slug?: string }>;
}): boolean {
  const title = (game.name ?? '').toLowerCase();
  const slug = (game.slug ?? '').toLowerCase();
  const text = `${title} ${slug}`;
  if (/\b(dlc|soundtrack|ost|expansion pack|season pass|costume pack)\b/.test(text)) {
    return true;
  }
  const tags = (game.tags ?? []).map((t) => (t.slug ?? '').toLowerCase());
  if (tags.includes('dlc') || tags.includes('soundtrack')) return true;
  return false;
}

export type NormalizedRawgGame = {
  rawgId: number;
  title: string;
  slug: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  releaseDate: string | null;
  platforms: string[];
  normalizedPlatforms: PlatformFamily[];
  genres: string[];
  rating: number | null;
  metacritic: number | null;
  description?: string | null;
  developer?: string | null;
  publisher?: string | null;
  officialUrl?: string | null;
  rawgUrl?: string | null;
  esrbRating?: string | null;
  trailers?: RawgTrailer[];
};

export type RawgTrailer = {
  id: number;
  name: string;
  previewUrl: string | null;
  videoUrl: string | null;
};

export function normalizeRawgTrailers(raw: unknown): RawgTrailer[] {
  if (!raw || typeof raw !== 'object') return [];
  const results = Array.isArray((raw as { results?: unknown }).results)
    ? ((raw as { results: unknown[] }).results)
    : [];

  const trailers: RawgTrailer[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const row = item as {
      id?: unknown;
      name?: unknown;
      preview?: unknown;
      data?: unknown;
    };
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;

    let videoUrl: string | null = null;
    if (row.data && typeof row.data === 'object') {
      const data = row.data as Record<string, unknown>;
      const max = typeof data.max === 'string' ? data.max : null;
      const sd = typeof data['480'] === 'string' ? data['480'] : null;
      videoUrl = max || sd;
    }

    if (!videoUrl) continue;
    trailers.push({
      id,
      name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Trailer',
      previewUrl: typeof row.preview === 'string' ? row.preview : null,
      videoUrl,
    });
    if (trailers.length >= 3) break;
  }
  return trailers;
}

export function normalizeRawgListItem(raw: Record<string, unknown>): NormalizedRawgGame | null {
  const id = Number(raw.id);
  const title = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!Number.isFinite(id) || !title) return null;

  const platformsRaw = Array.isArray(raw.platforms) ? raw.platforms : [];
  const platformNames = platformsRaw
    .map((p) => {
      if (p && typeof p === 'object' && 'platform' in p) {
        const plat = (p as { platform?: { name?: string } }).platform;
        return plat?.name ?? null;
      }
      return null;
    })
    .filter((n): n is string => Boolean(n));

  const genresRaw = Array.isArray(raw.genres) ? raw.genres : [];
  const genres = genresRaw
    .map((g) => (g && typeof g === 'object' && 'name' in g ? String((g as { name: string }).name) : null))
    .filter((n): n is string => Boolean(n));

  const released = typeof raw.released === 'string' ? raw.released : null;

  return {
    rawgId: id,
    title,
    slug: typeof raw.slug === 'string' ? raw.slug : null,
    coverUrl: typeof raw.background_image === 'string' ? raw.background_image : null,
    backgroundUrl: typeof raw.background_image === 'string' ? raw.background_image : null,
    releaseDate: released && /^\d{4}-\d{2}-\d{2}/.test(released) ? released.slice(0, 10) : null,
    platforms: platformNames,
    normalizedPlatforms: normalizePlatforms(platformNames),
    genres,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    metacritic: typeof raw.metacritic === 'number' ? raw.metacritic : null,
  };
}

export function normalizeRawgDetail(raw: Record<string, unknown>): NormalizedRawgGame | null {
  const base = normalizeRawgListItem(raw);
  if (!base) return null;

  const developers = Array.isArray(raw.developers) ? raw.developers : [];
  const publishers = Array.isArray(raw.publishers) ? raw.publishers : [];
  const esrb =
    raw.esrb_rating && typeof raw.esrb_rating === 'object' && raw.esrb_rating !== null
      ? String((raw.esrb_rating as { name?: string }).name ?? '')
      : null;

  return {
    ...base,
    description: stripHtmlToText(typeof raw.description === 'string' ? raw.description : ''),
    developer: developers
      .map((d) => (d && typeof d === 'object' && 'name' in d ? String((d as { name: string }).name) : null))
      .filter(Boolean)
      .join(', ') || null,
    publisher: publishers
      .map((d) => (d && typeof d === 'object' && 'name' in d ? String((d as { name: string }).name) : null))
      .filter(Boolean)
      .join(', ') || null,
    officialUrl: typeof raw.website === 'string' && raw.website ? raw.website : null,
    rawgUrl: typeof raw.slug === 'string' ? `https://rawg.io/games/${raw.slug}` : null,
    esrbRating: esrb || null,
    backgroundUrl:
      typeof raw.background_image_additional === 'string'
        ? raw.background_image_additional
        : base.backgroundUrl,
  };
}
