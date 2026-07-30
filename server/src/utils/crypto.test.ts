import { describe, expect, it } from 'vitest';
import { remainingAmount, hashToken, generateSessionToken } from './crypto.js';

describe('remainingAmount', () => {
  it('devuelve null si no hay precio total', () => {
    expect(remainingAmount(null, 10)).toBeNull();
  });

  it('calcula el pendiente sin valores negativos', () => {
    expect(remainingAmount({ toString: () => '50' }, 20)).toBe(30);
    expect(remainingAmount({ toString: () => '50' }, 80)).toBe(0);
  });
});

describe('session tokens', () => {
  it('genera tokens y hashes distintos', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).not.toBe(hashToken(b));
    expect(hashToken(a)).toHaveLength(64);
  });
});
