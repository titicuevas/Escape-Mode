export type DiscoveryDecision = 'LIKED' | 'THINKING' | 'DISMISSED' | 'MUST_BUY';

export interface RawgTrailer {
  id: number;
  name: string;
  previewUrl: string | null;
  videoUrl: string | null;
  embedUrl?: string | null;
}

export interface RawgGameCard {
  rawgId: number;
  title: string;
  slug: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  releaseDate: string | null;
  platforms: string[];
  normalizedPlatforms: string[];
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
}

export interface DiscoverResponse {
  items: RawgGameCard[];
  page: number;
  hasMore: boolean;
  rawgUnavailable?: boolean;
  tasteGenres?: string[];
  tasteApplied?: boolean;
}

export interface DismissedItem {
  id: string;
  rawgId: number;
  title: string;
  slug: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  releaseDate: string | null;
  platforms: string[];
  genres: string[];
  decidedAt: string;
}
