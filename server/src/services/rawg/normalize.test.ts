import { describe, expect, it } from 'vitest';
import {
  isLikelyDlcOrAddition,
  mapGenreNamesToRawgIds,
  normalizePlatformName,
  normalizePlatforms,
  normalizeRawgDetail,
  normalizeRawgListItem,
  normalizeRawgTrailers,
  normalizeRawgYoutube,
  stripHtmlToText,
  tasteOverlapScore,
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

describe('normalizeRawgTrailers', () => {
  it('extrae hasta 3 trailers con URL de vídeo', () => {
    const trailers = normalizeRawgTrailers({
      results: [
        {
          id: 1,
          name: 'Launch Trailer',
          preview: 'https://example.com/preview.jpg',
          data: { 480: 'https://example.com/480.mp4', max: 'https://example.com/max.mp4' },
        },
        { id: 2, name: 'Sin vídeo', preview: null, data: {} },
        {
          id: 3,
          name: 'Gameplay',
          data: { 480: 'https://example.com/gp.mp4' },
        },
      ],
    });
    expect(trailers).toHaveLength(2);
    expect(trailers[0]?.videoUrl).toBe('https://example.com/max.mp4');
    expect(trailers[1]?.name).toBe('Gameplay');
  });
});

describe('normalizeRawgYoutube', () => {
  it('convierte external_id en embed de YouTube', () => {
    const trailers = normalizeRawgYoutube({
      results: [
        {
          id: 9,
          external_id: 'dQw4w9WgXcQ',
          name: 'Official Trailer',
          thumbnails: { high: { url: 'https://img.example/h.jpg' } },
        },
      ],
    });
    expect(trailers).toHaveLength(1);
    expect(trailers[0]?.embedUrl).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(trailers[0]?.previewUrl).toBe('https://img.example/h.jpg');
  });
});

describe('mapGenreNamesToRawgIds / tasteOverlapScore', () => {
  it('mapea géneros conocidos a IDs RAWG', () => {
    expect(mapGenreNamesToRawgIds(['Action', 'RPG', 'Desconocido'])).toEqual([4, 5]);
  });

  it('puntúa solape de gustos', () => {
    expect(tasteOverlapScore(['Action', 'Indie'], ['Action', 'RPG'])).toBe(1);
    expect(tasteOverlapScore(['Action', 'RPG'], ['Action', 'RPG'])).toBe(2);
  });
});
