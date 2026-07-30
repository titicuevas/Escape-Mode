import { describe, expect, it } from 'vitest';
import type { Game } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { applyMainDateFiltersAndSort } from '../services/games.service.js';
import type { GamesQueryInput } from '@grc/shared';

function fakeGame(partial: Partial<Game> & Pick<Game, 'title'>): Game {
  return {
    id: partial.id ?? crypto.randomUUID(),
    userId: partial.userId ?? 'user',
    rawgId: null,
    slug: null,
    coverUrl: null,
    backgroundUrl: null,
    description: null,
    releaseDate: null,
    earlyAccessDate: null,
    dateSource: 'MANUAL',
    officialUrl: null,
    rawgUrl: null,
    platforms: [],
    normalizedPlatforms: [],
    genres: [],
    developer: null,
    publisher: null,
    esrbRating: null,
    metacritic: null,
    interestStatus: 'THINKING',
    purchaseStatus: 'UNRESERVED',
    selectedPlatform: null,
    selectedEdition: null,
    selectedStore: null,
    mediaFormat: 'UNKNOWN',
    totalPrice: null,
    amountPaid: new Decimal(0),
    targetPrice: null,
    reservationDate: null,
    paymentDeadline: null,
    orderNumber: null,
    purchaseUrl: null,
    includesBonus: false,
    bonusDescription: null,
    useEarlyAccessAsMainDate: false,
    notes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...partial,
  };
}

describe('applyMainDateFiltersAndSort', () => {
  const games = [
    fakeGame({
      title: 'Tokon',
      releaseDate: new Date('2026-08-06T00:00:00.000Z'),
    }),
    fakeGame({
      title: 'FC 27',
      earlyAccessDate: new Date('2026-09-18T00:00:00.000Z'),
      useEarlyAccessAsMainDate: true,
    }),
    fakeGame({
      title: 'Sin fecha',
    }),
  ];

  it('ordena por fecha principal y deja sin fecha al final', () => {
    const query = {
      sort: 'date',
      order: 'asc',
      page: 1,
      pageSize: 24,
    } as GamesQueryInput;

    const result = applyMainDateFiltersAndSort(games, query);
    expect(result.map((g) => g.title)).toEqual(['Tokon', 'FC 27', 'Sin fecha']);
  });

  it('filtra knownDate=true usando mainDate', () => {
    const query = {
      knownDate: true,
      sort: 'date',
      order: 'asc',
      page: 1,
      pageSize: 24,
    } as GamesQueryInput;

    const result = applyMainDateFiltersAndSort(games, query);
    expect(result.map((g) => g.title)).toEqual(['Tokon', 'FC 27']);
  });

  it('filtra por año usando mainDate (early access)', () => {
    const query = {
      year: 2026,
      month: 9,
      sort: 'date',
      order: 'asc',
      page: 1,
      pageSize: 24,
    } as GamesQueryInput;

    const result = applyMainDateFiltersAndSort(games, query);
    expect(result.map((g) => g.title)).toEqual(['FC 27']);
  });
});
