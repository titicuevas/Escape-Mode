import { describe, expect, it } from 'vitest';
import { gameCreateSchema } from '@grc/shared';

describe('gameCreateSchema', () => {
  it('exige título', () => {
    const result = gameCreateSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('acepta un juego manual mínimo', () => {
    const result = gameCreateSchema.safeParse({
      title: "Marvel's Wolverine",
      releaseDate: '2026-09-15',
      interestStatus: 'MUST_BUY',
      purchaseStatus: 'PARTIALLY_PAID',
      dateSource: 'MANUAL',
    });
    expect(result.success).toBe(true);
  });
});
