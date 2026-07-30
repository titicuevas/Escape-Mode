import { describe, expect, it } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateRemainingAmount,
  suggestPurchaseStatus,
  formatMoney,
  sumPaymentHistory,
  offerFinalPrice,
} from './money.js';

describe('calculateRemainingAmount', () => {
  it('devuelve null sin precio total', () => {
    expect(calculateRemainingAmount(null, 10)).toBeNull();
  });

  it('calcula pendiente y no baja de cero', () => {
    expect(calculateRemainingAmount(new Decimal('50'), new Decimal('20'))?.toString()).toBe('30');
    expect(calculateRemainingAmount('50', '80')?.toString()).toBe('0');
  });
});

describe('sumPaymentHistory', () => {
  it('suma pagos/reservas y resta reembolsos', () => {
    const total = sumPaymentHistory([
      { amount: '10', paymentType: 'RESERVATION' },
      { amount: '40', paymentType: 'PAYMENT' },
      { amount: '5', paymentType: 'REFUND' },
    ]);
    expect(total.toString()).toBe('45');
  });
});

describe('offerFinalPrice', () => {
  it('suma precio y envío', () => {
    expect(offerFinalPrice('59.99', '3.01').toString()).toBe('63');
  });
});

describe('suggestPurchaseStatus', () => {
  it('pasa a PARTIALLY_PAID o PAID según importes', () => {
    expect(
      suggestPurchaseStatus({
        totalPrice: '100',
        amountPaid: '30',
        current: 'RESERVED',
      }),
    ).toBe('PARTIALLY_PAID');

    expect(
      suggestPurchaseStatus({
        totalPrice: '100',
        amountPaid: '100',
        current: 'PARTIALLY_PAID',
      }),
    ).toBe('PAID');
  });

  it('no marca PAID sin precio total', () => {
    expect(
      suggestPurchaseStatus({
        totalPrice: null,
        amountPaid: '50',
        current: 'RESERVED',
      }),
    ).toBe('RESERVED');
  });
});

describe('formatMoney', () => {
  it('indica precio pendiente', () => {
    expect(formatMoney(null)).toBe('Precio pendiente de indicar');
  });
});
