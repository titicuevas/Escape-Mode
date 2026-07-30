import { Decimal } from '@prisma/client/runtime/library';
import type { PaymentType, PurchaseStatus } from '@prisma/client';

/** Convierte Decimal/string/number a número seguro para mostrar (no para aritmética crítica). */
export function toNumber(value: Decimal | string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return Number(value.toString());
}

export function decimalFrom(value: number | string | null | undefined): Decimal | null {
  if (value == null || value === '') return null;
  return new Decimal(value);
}

/**
 * remainingAmount = max(totalPrice - amountPaid, 0)
 * null si no hay precio total.
 */
export function calculateRemainingAmount(
  totalPrice: Decimal | string | number | null | undefined,
  amountPaid: Decimal | string | number | null | undefined,
): Decimal | null {
  if (totalPrice == null) return null;
  const total = new Decimal(totalPrice.toString());
  const paid = new Decimal((amountPaid ?? 0).toString());
  const remaining = total.minus(paid);
  return remaining.isNegative() ? new Decimal(0) : remaining;
}

/**
 * RESERVATION/PAYMENT suman; REFUND resta.
 * Los importes se almacenan siempre positivos.
 */
export function sumPaymentHistory(
  entries: Array<{ amount: Decimal | string | number; paymentType: PaymentType }>,
): Decimal {
  let total = new Decimal(0);
  for (const entry of entries) {
    const amount = new Decimal(entry.amount.toString());
    if (entry.paymentType === 'REFUND') {
      total = total.minus(amount);
    } else {
      total = total.plus(amount);
    }
  }
  return total.isNegative() ? new Decimal(0) : total;
}

export function offerFinalPrice(
  price: Decimal | string | number,
  shippingCost: Decimal | string | number | null | undefined,
): Decimal {
  return new Decimal(price.toString()).plus(new Decimal((shippingCost ?? 0).toString()));
}

export function formatMoney(value: Decimal | string | number | null | undefined): string {
  if (value == null) return 'Precio pendiente de indicar';
  const n = toNumber(value);
  if (n == null) return 'Precio pendiente de indicar';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

export function suggestPurchaseStatus(params: {
  totalPrice: Decimal | string | number | null | undefined;
  amountPaid: Decimal | string | number | null | undefined;
  current: PurchaseStatus;
}): PurchaseStatus {
  const { totalPrice, amountPaid, current } = params;
  if (
    current === 'CANCELLED' ||
    current === 'RECEIVED' ||
    current === 'PLAYING' ||
    current === 'COMPLETED'
  ) {
    return current;
  }

  const paid = new Decimal((amountPaid ?? 0).toString());
  if (totalPrice == null) {
    return current;
  }

  const total = new Decimal(totalPrice.toString());
  if (paid.lessThanOrEqualTo(0)) {
    return current;
  }
  if (paid.greaterThanOrEqualTo(total)) {
    return 'PAID';
  }
  return 'PARTIALLY_PAID';
}
