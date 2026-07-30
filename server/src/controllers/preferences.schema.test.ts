import { describe, expect, it } from 'vitest';
import { preferencesSchema, preferencesUpdateSchema } from '@grc/shared';

describe('preferences schemas', () => {
  it('acepta valores por defecto', () => {
    const parsed = preferencesSchema.parse({});
    expect(parsed.defaultDiscoveryMonths).toBe(12);
    expect(parsed.hideDismissedGames).toBe(true);
  });

  it('valida meses de descubrimiento', () => {
    expect(preferencesUpdateSchema.safeParse({ defaultDiscoveryMonths: 0 }).success).toBe(false);
    expect(preferencesUpdateSchema.safeParse({ defaultDiscoveryMonths: 18 }).success).toBe(true);
  });
});
