import { describe, expect, it } from 'vitest';
import { daysUntil, getMainDate } from './dates.js';

describe('getMainDate', () => {
  it('usa acceso anticipado cuando está activado', () => {
    const early = new Date('2026-09-18T00:00:00.000Z');
    const release = new Date('2026-09-25T00:00:00.000Z');
    expect(
      getMainDate({
        releaseDate: release,
        earlyAccessDate: early,
        useEarlyAccessAsMainDate: true,
      }),
    ).toEqual(early);
  });

  it('usa releaseDate por defecto', () => {
    const early = new Date('2026-09-18T00:00:00.000Z');
    const release = new Date('2026-09-25T00:00:00.000Z');
    expect(
      getMainDate({
        releaseDate: release,
        earlyAccessDate: early,
        useEarlyAccessAsMainDate: false,
      }),
    ).toEqual(release);
  });
});

describe('daysUntil', () => {
  it('calcula días restantes', () => {
    const from = new Date('2026-07-30T12:00:00.000Z');
    const target = new Date('2026-08-06T00:00:00.000Z');
    expect(daysUntil(target, from)).toBe(7);
  });
});
