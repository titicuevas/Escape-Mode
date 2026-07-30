import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function remainingAmount(
  totalPrice: { toString(): string } | null | undefined,
  amountPaid: { toString(): string } | number,
): number | null {
  if (totalPrice == null) {
    return null;
  }
  const total = Number(totalPrice.toString());
  const paid = typeof amountPaid === 'number' ? amountPaid : Number(amountPaid.toString());
  return Math.max(total - paid, 0);
}
