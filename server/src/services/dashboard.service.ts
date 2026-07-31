import { prisma } from '../config/prisma.js';
import { calculateRemainingAmount, toNumber } from '../utils/money.js';
import { addDaysUTC, daysUntil, getMainDate, startOfDayUTC, toDateOnlyString } from '../utils/dates.js';
import { serializeGame } from './games.service.js';
import { getOrCreatePreferences } from './preferences.service.js';
import type { PurchaseStatus } from '@prisma/client';

/** Compra en marcha o ya pagada: van a reservas / presupuesto, no a la lista de descubrimiento. */
const COMMITTED_PURCHASE: PurchaseStatus[] = [
  'RESERVED',
  'PARTIALLY_PAID',
  'PAID',
  'RECEIVED',
  'PLAYING',
  'COMPLETED',
];

function isCommitted(status: PurchaseStatus) {
  return COMMITTED_PURCHASE.includes(status);
}

export async function getDashboard(userId: string) {
  const now = new Date();
  const today = startOfDayUTC(now);
  const weekEnd = addDaysUTC(today, 7);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const prefs = await getOrCreatePreferences(userId);
  const remindUntil = addDaysUTC(today, prefs.reminderDaysBefore);

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

  const upcomingWatchlist = upcoming.filter((x) => !isCommitted(x.game.purchaseStatus));
  const upcomingCommitted = upcoming.filter((x) => isCommitted(x.game.purchaseStatus));

  const nextRelease = upcoming[0] ?? null;
  const nextFive = upcomingWatchlist.slice(0, 5).map((x) => serializeGame(x.game));
  const nextCommitted = upcomingCommitted.slice(0, 5).map((x) => serializeGame(x.game));

  const thisWeek = upcoming
    .filter((x) => x.mainDate.getTime() < weekEnd.getTime())
    .slice(0, 12)
    .map((x) => ({
      ...serializeGame(x.game),
      mainDate: toDateOnlyString(x.mainDate),
      daysRemaining: daysUntil(x.mainDate, now),
    }));

  const thisMonth = upcoming
    .filter((x) => x.mainDate >= monthStart && x.mainDate < monthEnd)
    .slice(0, 20)
    .map((x) => ({
      ...serializeGame(x.game),
      mainDate: toDateOnlyString(x.mainDate),
      daysRemaining: daysUntil(x.mainDate, now),
    }));

  const activeReservations = games.filter((g) =>
    ['RESERVED', 'PARTIALLY_PAID', 'WAITING_OFFER'].includes(g.purchaseStatus),
  );
  const paidGames = games.filter((g) => g.purchaseStatus === 'PAID');
  const thinking = games.filter((g) => g.interestStatus === 'THINKING');
  const pendingReview = games.filter((g) => g.interestStatus === 'THINKING').length;

  const interestRank = (status: string) => {
    if (status === 'MUST_BUY') return 0;
    if (status === 'INTERESTED') return 1;
    if (status === 'THINKING') return 2;
    return 3;
  };

  /** Varios a la vez: todos los que están en PLAYING. */
  const nowPlaying = games
    .filter((g) => g.purchaseStatus === 'PLAYING')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map(serializeGame);

  /** Cola: recibidos o pagados esperando empezar (sin estar jugando aún). */
  const playBacklog = games
    .filter((g) => g.purchaseStatus === 'RECEIVED' || g.purchaseStatus === 'PAID')
    .sort((a, b) => {
      const ir = interestRank(a.interestStatus) - interestRank(b.interestStatus);
      if (ir !== 0) return ir;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })
    .slice(0, 12)
    .map(serializeGame);

  const playQueueCount =
    games.filter((g) => g.purchaseStatus === 'PLAYING').length +
    games.filter((g) => g.purchaseStatus === 'RECEIVED' || g.purchaseStatus === 'PAID').length;

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

  const nextPaymentDue =
    games
      .map((g) => {
        const remaining = calculateRemainingAmount(g.totalPrice, g.amountPaid);
        if (!remaining || remaining.isZero()) return null;
        const due = g.paymentDeadline ?? getMainDate(g);
        if (!due || startOfDayUTC(due).getTime() < today.getTime()) return null;
        return {
          game: serializeGame(g),
          due: toDateOnlyString(due),
          remaining: remaining.toString(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.due! < b!.due! ? -1 : 1))[0] ?? null;

  const recentlyUpdated = games.slice(0, 8).map(serializeGame);

  const releaseReminders = upcoming
    .filter((x) => x.mainDate.getTime() <= remindUntil.getTime())
    .slice(0, 10)
    .map((x) => ({
      type: 'release' as const,
      gameId: x.game.id,
      title: x.game.title,
      date: toDateOnlyString(x.mainDate),
      daysRemaining: daysUntil(x.mainDate, now),
    }));

  const paymentReminders = games
    .map((g) => {
      const remaining = calculateRemainingAmount(g.totalPrice, g.amountPaid);
      if (!remaining || remaining.isZero()) return null;
      const due = g.paymentDeadline;
      if (!due) return null;
      const dueDay = startOfDayUTC(due);
      if (dueDay.getTime() < today.getTime() || dueDay.getTime() > remindUntil.getTime()) {
        return null;
      }
      return {
        type: 'payment' as const,
        gameId: g.id,
        title: g.title,
        date: toDateOnlyString(due),
        daysRemaining: daysUntil(due, now),
        remaining: remaining.toString(),
      };
    })
    .filter(Boolean);

  return {
    nextRelease: nextRelease
      ? {
          game: serializeGame(nextRelease.game),
          mainDate: toDateOnlyString(nextRelease.mainDate),
          daysRemaining: daysUntil(nextRelease.mainDate, now),
        }
      : null,
    nextFiveReleases: nextFive,
    upcomingCommittedReleases: nextCommitted,
    thisWeek,
    thisMonth,
    reminders: [...releaseReminders, ...paymentReminders].sort(
      (a, b) => (a!.daysRemaining ?? 0) - (b!.daysRemaining ?? 0),
    ),
    reminderDaysBefore: prefs.reminderDaysBefore,
    browserNotifications: prefs.browserNotifications,
    activeReservations: activeReservations.map(serializeGame),
    paidGamesCount: paidGames.length,
    pendingAmountThisMonth: pendingThisMonth.toFixed(2),
    nextPaymentDue,
    recentlyUpdated,
    interestCounts,
    pendingReviewCount: pendingReview,
    thinkingGames: thinking.slice(0, 6).map(serializeGame),
    nowPlaying,
    playBacklog,
    playQueueCount,
  };
}
