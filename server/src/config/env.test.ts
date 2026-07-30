import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  RAWG_API_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_INITIAL_PASSWORD: z.string().min(8),
});

describe('validación de entorno', () => {
  it('falla si faltan variables', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const keys = result.error.issues.map((i) => i.path[0]);
      expect(keys).toContain('DATABASE_URL');
      expect(keys).toContain('RAWG_API_KEY');
    }
  });

  it('acepta un entorno válido', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      RAWG_API_KEY: 'test-key-not-real',
      SESSION_SECRET: 'a'.repeat(32),
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_INITIAL_PASSWORD: 'password123',
    });
    expect(result.success).toBe(true);
  });
});
