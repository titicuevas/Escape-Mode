import type { LoginInput, MeResponse } from '../types/auth';
import type { DashboardResponse, Game, GamesListResponse } from '../types/game';
import type { BudgetResponse, OffersResponse, Payment, StoreOffer } from '../types/finance';
import type { DismissedItem, DiscoverResponse, RawgGameCard } from '../types/rawg';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Ha ocurrido un error';
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export type GamesQuery = Record<string, string | number | boolean | undefined>;

function toQuery(params?: GamesQuery): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export const api = {
  getMe: () => request<MeResponse | null>('/api/auth/me').catch(() => null),
  login: (input: LoginInput) =>
    request<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  health: () => request<{ status: string; database?: string }>('/api/health'),
  getDashboard: () => request<DashboardResponse>('/api/dashboard'),
  listGames: (params?: GamesQuery) =>
    request<GamesListResponse>(`/api/games${toQuery(params)}`),
  getGame: (id: string) => request<{ game: Game }>(`/api/games/${id}`),
  createGame: (body: Record<string, unknown>) =>
    request<{ game: Game }>('/api/games', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateGame: (id: string, body: Record<string, unknown>) =>
    request<{ game: Game }>(`/api/games/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteGame: (id: string) =>
    request<void>(`/api/games/${id}`, {
      method: 'DELETE',
    }),
  listOffers: (gameId: string) => request<OffersResponse>(`/api/games/${gameId}/offers`),
  createOffer: (gameId: string, body: Record<string, unknown>) =>
    request<{ offer: StoreOffer }>(`/api/games/${gameId}/offers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateOffer: (id: string, body: Record<string, unknown>) =>
    request<{ offer: StoreOffer }>(`/api/offers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteOffer: (id: string) => request<void>(`/api/offers/${id}`, { method: 'DELETE' }),
  listPayments: (gameId: string) =>
    request<{ payments: Payment[] }>(`/api/games/${gameId}/payments`),
  createPayment: (gameId: string, body: Record<string, unknown>) =>
    request<{ payment: Payment }>(`/api/games/${gameId}/payments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updatePayment: (id: string, body: Record<string, unknown>) =>
    request<{ payment: Payment }>(`/api/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePayment: (id: string) => request<void>(`/api/payments/${id}`, { method: 'DELETE' }),
  getBudget: (params: { year: number; month?: number; grouping?: string }) =>
    request<BudgetResponse>(`/api/budget${toQuery(params)}`),
  rawgSearch: (query: string) =>
    request<{ results: RawgGameCard[] }>(`/api/rawg/search${toQuery({ query })}`),
  rawgDetail: (rawgId: number) =>
    request<{ game: RawgGameCard }>(`/api/rawg/games/${rawgId}`),
  rawgDiscover: (params?: GamesQuery) =>
    request<DiscoverResponse>(`/api/rawg/discover${toQuery(params)}`),
  discoveryDecide: (body: Record<string, unknown>) =>
    request<{
      decision: { id: string; rawgId: number; title: string; decision: string };
      gameId: string | null;
    }>('/api/discovery/decide', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  discoveryUndo: (decisionId: string) =>
    request<{ ok: boolean; restoredRawgId: number }>('/api/discovery/undo', {
      method: 'POST',
      body: JSON.stringify({ decisionId }),
    }),
  listDismissed: () => request<{ items: DismissedItem[] }>('/api/discovery/dismissed'),
  recoverDismissed: (body: { rawgId: number; interestStatus: string }) =>
    request<{ game: Game }>('/api/discovery/recover', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getPreferences: () =>
    request<{ preferences: import('@grc/shared').Preferences }>('/api/preferences'),
  updatePreferences: (body: import('@grc/shared').PreferencesUpdateInput) =>
    request<{ preferences: import('@grc/shared').Preferences }>('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export { ApiError };
