import { prisma } from '../config/prisma.js';
import { calculateRemainingAmount, toNumber } from '../utils/money.js';
import { getMainDate, toDateOnlyString } from '../utils/dates.js';

export async function exportLibrary(userId: string) {
  const games = await prisma.game.findMany({
    where: { userId },
    include: {
      offers: { orderBy: { checkedAt: 'desc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      listItems: { include: { list: { select: { name: true } } } },
    },
    orderBy: { title: 'asc' },
  });

  const exportedAt = new Date().toISOString();

  const items = games.map((g) => {
    const remaining = calculateRemainingAmount(g.totalPrice, g.amountPaid);
    return {
      id: g.id,
      title: g.title,
      rawgId: g.rawgId,
      coverUrl: g.coverUrl,
      releaseDate: toDateOnlyString(g.releaseDate),
      earlyAccessDate: toDateOnlyString(g.earlyAccessDate),
      mainDate: toDateOnlyString(getMainDate(g)),
      interestStatus: g.interestStatus,
      purchaseStatus: g.purchaseStatus,
      mediaFormat: g.mediaFormat,
      selectedPlatform: g.selectedPlatform,
      selectedEdition: g.selectedEdition,
      selectedStore: g.selectedStore,
      totalPrice: g.totalPrice != null ? toNumber(g.totalPrice) : null,
      amountPaid: toNumber(g.amountPaid),
      remainingAmount: remaining != null ? toNumber(remaining) : null,
      targetPrice: g.targetPrice != null ? toNumber(g.targetPrice) : null,
      notes: g.notes,
      purchaseUrl: g.purchaseUrl,
      useEarlyAccessAsMainDate: g.useEarlyAccessAsMainDate,
      lists: g.listItems.map((i) => i.list.name),
      offers: g.offers.map((o) => ({
        store: o.store,
        price: toNumber(o.price),
        shippingCost: toNumber(o.shippingCost),
        checkedAt: o.checkedAt.toISOString(),
        url: o.url,
        notes: o.notes,
      })),
      payments: g.payments.map((p) => ({
        amount: toNumber(p.amount),
        paymentDate: toDateOnlyString(p.paymentDate),
        paymentType: p.paymentType,
        notes: p.notes,
      })),
    };
  });

  return { exportedAt, count: items.length, games: items };
}

export function libraryToCsv(payload: Awaited<ReturnType<typeof exportLibrary>>): string {
  const header = [
    'title',
    'mainDate',
    'interestStatus',
    'purchaseStatus',
    'selectedPlatform',
    'selectedStore',
    'mediaFormat',
    'totalPrice',
    'amountPaid',
    'remainingAmount',
    'notes',
    'lists',
  ];

  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows = payload.games.map((g) =>
    [
      g.title,
      g.mainDate,
      g.interestStatus,
      g.purchaseStatus,
      g.selectedPlatform,
      g.selectedStore,
      g.mediaFormat,
      g.totalPrice,
      g.amountPaid,
      g.remainingAmount,
      g.notes,
      g.lists.join('|'),
    ]
      .map(escape)
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}
