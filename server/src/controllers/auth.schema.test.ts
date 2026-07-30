import { describe, expect, it } from 'vitest';
import { loginSchema } from '@grc/shared';

describe('loginSchema', () => {
  it('rechaza cuerpo vacío', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('acepta credenciales con formato válido', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secreto',
    });
    expect(result.success).toBe(true);
  });
});
