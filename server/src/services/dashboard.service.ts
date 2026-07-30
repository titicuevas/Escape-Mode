import { prisma } from '../config/prisma.js';
import { calculateRemainingAmount, toNumber } from '../utils/money.js';
import { daysUntil, getMainDate, startOfDayUTC, toDateOnlyString } from '../utils/dates.js';
import { serializeGame } from './games.service.js';

export async function getDashboard(userId: string) {
  const now = new Date();
  const today = startOfDayUTC(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const games = await prisma.game.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const withMain = games
    .map((g) => ({ game: g, mainDate: getMainDate(g) }))
    .filter((x) => x.mainDate !== null) as Array<{
    game: (typeof games)[number];
    mainDate: Date;
  }>;

  const upcoming = withMain
    .filter((x) => x.mainDate.getTime() >= today.getTime())
    .sort((a, b) => a.mainDate.getTime() - b.mainDate.getTime());

  const nextRelease = upcoming[0] ?? null;
  const nextFive = upcoming.slice(0, 5).map((x) => serializeGame(x.game));

  const activeReservations = games.filter((g) =>
    ['RESERVED', 'PARTIALLY_PAID', 'WAITING_OFFER'].includes(g.purchaseStatus),
  );
  const paidGames = games.filter((g) => g.purchaseStatus === 'PAID');
  const thinking = games.filter((g) => g.interestStatus === 'THINKING');
  const pendingReview = games.filter((g) => g.interestStatus === 'THINKING').length;

  const interestCounts = {
    MUST_BUY: games.filter((g) => g.interestStatus === 'MUST_BUY').length,
    INTERESTED: games.filter((g) => g.interestStatus === 'INTERESTED').length,
    THINKING: thinking.length,
    NOT_INTERESTED: games.filter((g) => g.interestStatus === 'NOT_INTERESTED').length,
  };

  let pendingThisMonth = 0;
  for (const g of games) {
    const remaining = calculateRemainingAmount(g.totalPrice, g.amountPaid);
    if (!remaining) continue;
    const deadline = g.paymentDeadline ?? getMainDate(g);
    if (!deadline) continue;
    if (deadline >= monthStart && deadline < monthEnd) {
      pendingThisMonth += toNumber(remaining) ?? 0;
    }
  }

  const nextPaymentDue = games
    .map((g) => {
      const remaining = calculateRemainingAmount(g.totalPrice, g.amountPaid);
      if (!remaining || remaining.isZero()) return null;
      const due = g.paymentDeadline ?? getMainDate(g);
      if (!due || startOfDayUTC(due).getTime() < today.getTime()) return null;
      return { game: serializeGame(g), due: toDateOnlyString(due), remaining: remaining.toString() };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.due! < b!.due! ? -1 : 1))[0] ?? null;

  const recentlyUpdated = games.slice(0, 8).map(serializeGame);

  return {
    nextRelease: nextRelease
      ? {
          game: serializeGame(nextRelease.game),
          mainDate: toDateOnlyString(nextRelease.mainDate),
          daysRemaining: daysUntil(nextRelease.mainDate, now),
        }
      : null,
    nextFiveReleases: nextFive,
    activeReservations: activeReservations.map(serializeGame),
    paidGamesCount: paidGames.length,
    pendingAmountThisMonth: pendingThisMonth.toFixed(2),
    nextPaymentDue,
    recentlyUpdated,
    interestCounts,
    pendingReviewCount: pendingReview,
    thinkingGames: thinking.slice(0, 6).map(serializeGame),
  };
}
