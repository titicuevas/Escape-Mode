export type DiscoveryDecision = 'LIKED' | 'THINKING' | 'DISMISSED' | 'MUST_BUY';

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
}

export interface DiscoverResponse {
  items: RawgGameCard[];
  page: number;
  hasMore: boolean;
  rawgUnavailable?: boolean;
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
