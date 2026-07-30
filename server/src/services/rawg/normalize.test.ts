import { describe, expect, it } from 'vitest';
import {
  isLikelyDlcOrAddition,
  normalizePlatformName,
  normalizePlatforms,
  normalizeRawgDetail,
  normalizeRawgListItem,
  stripHtmlToText,
} from './normalize.js';

describe('normalizePlatformName', () => {
  it('mapea familias conocidas', () => {
    expect(normalizePlatformName('PlayStation 5')).toBe('PLAYSTATION_5');
    expect(normalizePlatformName('Xbox Series X/S')).toBe('XBOX_SERIES');
    expect(normalizePlatformName('Nintendo Switch')).toBe('NINTENDO_SWITCH');
    expect(normalizePlatformName('PC')).toBe('PC');
    expect(normalizePlatformName('Dreamcast')).toBe('OTHER');
  });
});

describe('normalizePlatforms', () => {
  it('deduplica', () => {
    expect(normalizePlatforms(['PC', 'Windows', 'PlayStation 5'])).toEqual([
      'PC',
      'PLAYSTATION_5',
    ]);
  });
});

describe('stripHtmlToText', () => {
  it('elimina etiquetas y entidades básicas', () => {
    expect(stripHtmlToText('<p>Hola&nbsp;<b>mundo</b></p>')).toBe('Hola mundo');
  });
});

describe('isLikelyDlcOrAddition', () => {
  it('detecta dlc por título o tags', () => {
    expect(isLikelyDlcOrAddition({ name: 'Game DLC Pack' })).toBe(true);
    expect(isLikelyDlcOrAddition({ name: 'Base Game', tags: [{ slug: 'soundtrack' }] })).toBe(
      true,
    );
    expect(isLikelyDlcOrAddition({ name: 'Base Game' })).toBe(false);
  });
});

describe('normalizeRawgListItem', () => {
  it('normaliza un ítem de listado', () => {
    const item = normalizeRawgListItem({
      id: 42,
      name: 'Demo Game',
      slug: 'demo-game',
      background_image: 'https://example.com/cover.jpg',
      released: '2026-08-01',
      platforms: [{ platform: { name: 'PlayStation 5' } }],
      genres: [{ name: 'Action' }],
      rating: 4.2,
      metacritic: 88,
    });
    expect(item).toMatchObject({
      rawgId: 42,
      title: 'Demo Game',
      releaseDate: '2026-08-01',
      normalizedPlatforms: ['PLAYSTATION_5'],
      genres: ['Action'],
      metacritic: 88,
    });
  });

  it('rechaza ítems sin id o título', () => {
    expect(normalizeRawgListItem({ id: 1, name: '' })).toBeNull();
    expect(normalizeRawgListItem({ name: 'X' })).toBeNull();
  });
});

describe('normalizeRawgDetail', () => {
  it('añade descripción limpia y metadatos', () => {
    const detail = normalizeRawgDetail({
      id: 7,
      name: 'Full Game',
      slug: 'full-game',
      description: '<p>Texto <b>rico</b></p>',
      developers: [{ name: 'Studio A' }],
      publishers: [{ name: 'Pub B' }],
      website: 'https://example.com',
      esrb_rating: { name: 'Teen' },
      platforms: [],
      genres: [],
    });
    expect(detail?.description).toBe('Texto rico');
    expect(detail?.developer).toBe('Studio A');
    expect(detail?.publisher).toBe('Pub B');
    expect(detail?.rawgUrl).toBe('https://rawg.io/games/full-game');
    expect(detail?.esrbRating).toBe('Teen');
  });
});
