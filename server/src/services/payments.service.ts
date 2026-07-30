import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  decimalFrom,
  offerFinalPrice,
  sumPaymentHistory,
  suggestPurchaseStatus,
} from '../utils/money.js';
import { parseDateOnly, toDateOnlyString } from '../utils/dates.js';
import type { PaymentCreateInput, PaymentUpdateInput } from '@grc/shared';
import type { PaymentHistory } from '@prisma/client';

async function assertGameOwned(userId: string, gameId: string) {
  const game = await prisma.game.findFirst({ where: { id: gameId, userId } });
  if (!game) throw new AppError(404, 'Juego no encontrado');
  return game;
}

export function serializePayment(payment: PaymentHistory) {
  return {
    ...payment,
    amount: payment.amount.toString(),
    paymentDate: toDateOnlyString(payment.paymentDate),
  };
}

async function recalculateGamePayments(gameId: string) {
  const [game, payments] = await Promise.all([
    prisma.game.findUniqueOrThrow({ where: { id: gameId } }),
    prisma.paymentHistory.findMany({ where: { gameId } }),
  ]);

  const amountPaid = sumPaymentHistory(payments);
  const purchaseStatus = suggestPurchaseStatus({
    totalPrice: game.totalPrice,
    amountPaid,
    current: game.purchaseStatus,
  });

  return prisma.game.update({
    where: { id: gameId },
    data: {
      amountPaid,
      purchaseStatus,
    },
  });
}

export async function listPayments(userId: string, gameId: string) {
  await assertGameOwned(userId, gameId);
  const payments = await prisma.paymentHistory.findMany({
    where: { gameId },
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
  });
  return payments.map(serializePayment);
}

export async function createPayment(userId: string, gameId: string, input: PaymentCreateInput) {
  await assertGameOwned(userId, gameId);
  const paymentDate = input.paymentDate ?? new Date().toISOString().slice(0, 10);

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentHistory.create({
      data: {
        gameId,
        amount: decimalFrom(input.amount)!,
        paymentDate: parseDateOnly(paymentDate)!,
        paymentType: input.paymentType,
        notes: input.notes ?? undefined,
      },
    });

    const payments = await tx.paymentHistory.findMany({ where: { gameId } });
    const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
    const amountPaid = sumPaymentHistory(payments);
    const purchaseStatus = suggestPurchaseStatus({
      totalPrice: game.totalPrice,
      amountPaid,
      current: game.purchaseStatus,
    });

    await tx.game.update({
      where: { id: gameId },
      data: { amountPaid, purchaseStatus },
    });

    return created;
  });

  return serializePayment(payment);
}

export async function updatePayment(userId: string, paymentId: string, input: PaymentUpdateInput) {
  const existing = await prisma.paymentHistory.findUnique({
    where: { id: paymentId },
    include: { game: true },
  });
  if (!existing || existing.game.userId !== userId) {
    throw new AppError(404, 'Pago no encontrado');
  }

  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.paymentHistory.update({
      where: { id: paymentId },
      data: {
        ...(input.amount !== undefined ? { amount: decimalFrom(input.amount)! } : {}),
        ...(input.paymentDate !== undefined
          ? { paymentDate: parseDateOnly(input.paymentDate)! }
          : {}),
        ...(input.paymentType !== undefined ? { paymentType: input.paymentType } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    const payments = await tx.paymentHistory.findMany({ where: { gameId: existing.gameId } });
    const game = await tx.game.findUniqueOrThrow({ where: { id: existing.gameId } });
    const amountPaid = sumPaymentHistory(payments);
    const purchaseStatus = suggestPurchaseStatus({
      totalPrice: game.totalPrice,
      amountPaid,
      current: game.purchaseStatus,
    });

    await tx.game.update({
      where: { id: existing.gameId },
      data: { amountPaid, purchaseStatus },
    });

    return updated;
  });

  return serializePayment(payment);
}

export async function deletePayment(userId: string, paymentId: string) {
  const existing = await prisma.paymentHistory.findUnique({
    where: { id: paymentId },
    include: { game: true },
  });
  if (!existing || existing.game.userId !== userId) {
    throw new AppError(404, 'Pago no encontrado');
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentHistory.delete({ where: { id: paymentId } });
    const payments = await tx.paymentHistory.findMany({ where: { gameId: existing.gameId } });
    const game = await tx.game.findUniqueOrThrow({ where: { id: existing.gameId } });
    const amountPaid = sumPaymentHistory(payments);
    const purchaseStatus = suggestPurchaseStatus({
      totalPrice: game.totalPrice,
      amountPaid,
      current: game.purchaseStatus,
    });
    await tx.game.update({
      where: { id: existing.gameId },
      data: { amountPaid, purchaseStatus },
    });
  });
}

export { recalculateGamePayments, offerFinalPrice };
