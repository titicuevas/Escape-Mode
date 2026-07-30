import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/prisma.js';
import { calculateRemainingAmount, toNumber } from '../utils/money.js';
import { getMainDate, toDateOnlyString } from '../utils/dates.js';
import { serializeGame } from './games.service.js';
import type { BudgetQueryInput } from '@grc/shared';

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addBucket(map: Map<string, Decimal>, key: string, amount: Decimal) {
  map.set(key, (map.get(key) ?? new Decimal(0)).plus(amount));
}

export async function getBudget(userId: string, query: BudgetQueryInput) {
  const yearStart = new Date(Date.UTC(query.year, 0, 1));
  const yearEnd = new Date(Date.UTC(query.year + 1, 0, 1));
  const rangeStart = query.month
    ? new Date(Date.UTC(query.year, query.month - 1, 1))
    : yearStart;
  const rangeEnd = query.month
    ? new Date(Date.UTC(query.year, query.month, 1))
    : yearEnd;

  const games = await prisma.game.findMany({
    where: { userId },
    include: { payments: true },
  });

  let totalPaid = new Decimal(0);
  let totalPending = new Decimal(0);
  let totalSpend = new Decimal(0);

  const byMonth = new Map<string, Decimal>();
  const byPlatform = new Map<string, Decimal>();
  const byStore = new Map<string, Decimal>();

  const gamesWithoutPrice: ReturnType<typeof serializeGame>[] = [];
  const partiallyPaid: ReturnType<typeof serializeGame>[] = [];
  const upcomingObligations: Array<{
    game: ReturnType<typeof serializeGame>;
    due: string | null;
    remaining: string;
  }> = [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const game of games) {
    const serialized = serializeGame(game);
    const remaining = calculateRemainingAmount(game.totalPrice, game.amountPaid);

    if (game.totalPrice == null) {
      gamesWithoutPrice.push(serialized);
    }
    if (game.purchaseStatus === 'PARTIALLY_PAID') {
      partiallyPaid.push(serialized);
    }

    totalPaid = totalPaid.plus(game.amountPaid);

    if (remaining && remaining.greaterThan(0)) {
      totalPending = totalPending.plus(remaining);
      const due = game.paymentDeadline ?? getMainDate(game);
      if (due && due.getTime() >= today.getTime()) {
        upcomingObligations.push({
          game: serialized,
          due: toDateOnlyString(due),
          remaining: remaining.toString(),
        });
      }
    }

    if (query.grouping === 'PAYMENT') {
      for (const payment of game.payments) {
        if (payment.paymentType === 'REFUND') continue;
        const d = payment.paymentDate;
        if (d < rangeStart || d >= rangeEnd) continue;
        const amount = new Decimal(payment.amount.toString());
        totalSpend = totalSpend.plus(amount);
        addBucket(byMonth, monthKey(d), amount);
        addBucket(byPlatform, game.selectedPlatform || 'Sin plataforma', amount);
        addBucket(byStore, game.selectedStore || 'Sin tienda', amount);
      }
      // Restar reembolsos del periodo
      for (const payment of game.payments) {
        if (payment.paymentType !== 'REFUND') continue;
        const d = payment.paymentDate;
        if (d < rangeStart || d >= rangeEnd) continue;
        const amount = new Decimal(payment.amount.toString());
        totalSpend = totalSpend.minus(amount);
        addBucket(byMonth, monthKey(d), amount.negated());
      }
    } else {
      const anchor =
        query.grouping === 'RESERVATION'
          ? game.reservationDate
          : getMainDate(game);
      if (!anchor || anchor < rangeStart || anchor >= rangeEnd) continue;

      // Gasto asociado al ancla: amountPaid del juego
      const amount = new Decimal(game.amountPaid.toString());
      if (amount.isZero() && remaining == null) continue;

      const spendAmount =
        query.grouping === 'RELEASE' || query.grouping === 'RESERVATION'
          ? amount
          : amount;

      totalSpend = totalSpend.plus(spendAmount);
      addBucket(byMonth, monthKey(anchor), spendAmount);
      addBucket(byPlatform, game.selectedPlatform || 'Sin plataforma', spendAmount);
      addBucket(byStore, game.selectedStore || 'Sin tienda', spendAmount);
    }
  }

  upcomingObligations.sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));

  const mapToList = (map: Map<string, Decimal>) =>
    [...map.entries()]
      .map(([key, value]) => ({ key, amount: value.toFixed(2) }))
      .sort((a, b) => a.key.localeCompare(b.key));

  return {
    year: query.year,
    month: query.month ?? null,
    grouping: query.grouping,
    totalPaid: totalPaid.toFixed(2),
    totalPending: totalPending.toFixed(2),
    totalSpend: (totalSpend.isNegative() ? new Decimal(0) : totalSpend).toFixed(2),
    spendByMonth: mapToList(byMonth),
    spendByPlatform: mapToList(byPlatform).sort(
      (a, b) => Number(b.amount) - Number(a.amount),
    ),
    spendByStore: mapToList(byStore).sort((a, b) => Number(b.amount) - Number(a.amount)),
    upcomingObligations,
    gamesWithoutPrice,
    partiallyPaidGames: partiallyPaid,
    paidNumeric: toNumber(totalPaid) ?? 0,
  };
}
