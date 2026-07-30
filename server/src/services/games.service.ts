import type { Game, InterestStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { calculateRemainingAmount, decimalFrom, toNumber } from '../utils/money.js';
import { getMainDate, parseDateOnly, toDateOnlyString } from '../utils/dates.js';
import type { GameCreateInput, GameUpdateInput, GamesQueryInput } from '@grc/shared';

export type GameDto = Omit<
  Game,
  | 'totalPrice'
  | 'amountPaid'
  | 'targetPrice'
  | 'releaseDate'
  | 'earlyAccessDate'
  | 'reservationDate'
  | 'paymentDeadline'
> & {
  totalPrice: string | null;
  amountPaid: string;
  targetPrice: string | null;
  remainingAmount: string | null;
  remainingAmountLabel: string;
  mainDate: string | null;
  releaseDate: string | null;
  earlyAccessDate: string | null;
  reservationDate: string | null;
  paymentDeadline: string | null;
};

export function serializeGame(game: Game): GameDto {
  const remaining = calculateRemainingAmount(game.totalPrice, game.amountPaid);
  return {
    ...game,
    totalPrice: game.totalPrice?.toString() ?? null,
    amountPaid: game.amountPaid.toString(),
    targetPrice: game.targetPrice?.toString() ?? null,
    remainingAmount: remaining?.toString() ?? null,
    remainingAmountLabel:
      remaining == null ? 'Precio pendiente de indicar' : remaining.toString(),
    mainDate: toDateOnlyString(getMainDate(game)),
    releaseDate: toDateOnlyString(game.releaseDate),
    earlyAccessDate: toDateOnlyString(game.earlyAccessDate),
    reservationDate: toDateOnlyString(game.reservationDate),
    paymentDeadline: toDateOnlyString(game.paymentDeadline),
  };
}

function mapCreateData(userId: string, input: GameCreateInput): Prisma.GameCreateInput {
  return {
    user: { connect: { id: userId } },
    title: input.title,
    rawgId: input.rawgId ?? undefined,
    slug: input.slug ?? undefined,
    coverUrl: input.coverUrl ?? undefined,
    backgroundUrl: input.backgroundUrl ?? undefined,
    description: input.description ?? undefined,
    releaseDate: parseDateOnly(input.releaseDate ?? undefined) ?? undefined,
    earlyAccessDate: parseDateOnly(input.earlyAccessDate ?? undefined) ?? undefined,
    dateSource: input.dateSource,
    officialUrl: input.officialUrl ?? undefined,
    rawgUrl: input.rawgUrl ?? undefined,
    platforms: input.platforms,
    normalizedPlatforms: input.normalizedPlatforms,
    genres: input.genres,
    developer: input.developer ?? undefined,
    publisher: input.publisher ?? undefined,
    esrbRating: input.esrbRating ?? undefined,
    metacritic: input.metacritic ?? undefined,
    interestStatus: input.interestStatus,
    purchaseStatus: input.purchaseStatus,
    selectedPlatform: input.selectedPlatform ?? undefined,
    selectedEdition: input.selectedEdition ?? undefined,
    selectedStore: input.selectedStore ?? undefined,
    mediaFormat: input.mediaFormat,
    totalPrice: decimalFrom(input.totalPrice ?? null) ?? undefined,
    targetPrice: decimalFrom(input.targetPrice ?? null) ?? undefined,
    amountPaid: decimalFrom(input.amountPaid ?? 0) ?? undefined,
    reservationDate: parseDateOnly(input.reservationDate ?? undefined) ?? undefined,
    paymentDeadline: parseDateOnly(input.paymentDeadline ?? undefined) ?? undefined,
    orderNumber: input.orderNumber ?? undefined,
    purchaseUrl: input.purchaseUrl ?? undefined,
    includesBonus: input.includesBonus,
    bonusDescription: input.bonusDescription ?? undefined,
    useEarlyAccessAsMainDate: input.useEarlyAccessAsMainDate,
    notes: input.notes ?? undefined,
  };
}

function mapUpdateData(input: GameUpdateInput): Prisma.GameUpdateInput {
  const data: Prisma.GameUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.rawgId !== undefined) data.rawgId = input.rawgId;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.coverUrl !== undefined) data.coverUrl = input.coverUrl ?? null;
  if (input.backgroundUrl !== undefined) data.backgroundUrl = input.backgroundUrl ?? null;
  if (input.description !== undefined) data.description = input.description;
  if (input.releaseDate !== undefined) {
    data.releaseDate =
      input.releaseDate === null ? null : parseDateOnly(input.releaseDate);
  }
  if (input.earlyAccessDate !== undefined) {
    data.earlyAccessDate =
      input.earlyAccessDate === null ? null : parseDateOnly(input.earlyAccessDate);
  }
  if (input.dateSource !== undefined) data.dateSource = input.dateSource;
  if (input.officialUrl !== undefined) data.officialUrl = input.officialUrl ?? null;
  if (input.rawgUrl !== undefined) data.rawgUrl = input.rawgUrl ?? null;
  if (input.platforms !== undefined) data.platforms = input.platforms;
  if (input.normalizedPlatforms !== undefined) {
    data.normalizedPlatforms = input.normalizedPlatforms;
  }
  if (input.genres !== undefined) data.genres = input.genres;
  if (input.developer !== undefined) data.developer = input.developer;
  if (input.publisher !== undefined) data.publisher = input.publisher;
  if (input.esrbRating !== undefined) data.esrbRating = input.esrbRating;
  if (input.metacritic !== undefined) data.metacritic = input.metacritic;
  if (input.interestStatus !== undefined) data.interestStatus = input.interestStatus;
  if (input.purchaseStatus !== undefined) data.purchaseStatus = input.purchaseStatus;
  if (input.selectedPlatform !== undefined) data.selectedPlatform = input.selectedPlatform;
  if (input.selectedEdition !== undefined) data.selectedEdition = input.selectedEdition;
  if (input.selectedStore !== undefined) data.selectedStore = input.selectedStore;
  if (input.mediaFormat !== undefined) data.mediaFormat = input.mediaFormat;
  if (input.totalPrice !== undefined) {
    data.totalPrice = input.totalPrice === null ? null : decimalFrom(input.totalPrice);
  }
  if (input.targetPrice !== undefined) {
    data.targetPrice = input.targetPrice === null ? null : decimalFrom(input.targetPrice);
  }
  if (input.amountPaid !== undefined) {
    data.amountPaid = decimalFrom(input.amountPaid ?? 0) ?? undefined;
  }
  if (input.reservationDate !== undefined) {
    data.reservationDate =
      input.reservationDate === null ? null : parseDateOnly(input.reservationDate);
  }
  if (input.paymentDeadline !== undefined) {
    data.paymentDeadline =
      input.paymentDeadline === null ? null : parseDateOnly(input.paymentDeadline);
  }
  if (input.orderNumber !== undefined) data.orderNumber = input.orderNumber;
  if (input.purchaseUrl !== undefined) data.purchaseUrl = input.purchaseUrl ?? null;
  if (input.includesBonus !== undefined) data.includesBonus = input.includesBonus;
  if (input.bonusDescription !== undefined) data.bonusDescription = input.bonusDescription;
  if (input.useEarlyAccessAsMainDate !== undefined) {
    data.useEarlyAccessAsMainDate = input.useEarlyAccessAsMainDate;
  }
  if (input.notes !== undefined) data.notes = input.notes;
  return data;
}

/** Filtros Prisma seguros (sin mezclar OR de plataforma/fecha). */
export function buildWhere(userId: string, query: GamesQueryInput): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [{ userId }];

  if (query.q) {
    and.push({ title: { contains: query.q, mode: 'insensitive' } });
  }

  if (query.platform) {
    and.push({
      OR: [
        { selectedPlatform: { contains: query.platform, mode: 'insensitive' } },
        { platforms: { has: query.platform } },
      ],
    });
  }

  if (query.interestStatus) {
    and.push({ interestStatus: query.interestStatus });
  }

  // Prioridad: paid > reserved > purchaseStatus explícito
  if (query.paid === true) {
    and.push({ purchaseStatus: 'PAID' });
  } else if (query.reserved === true) {
    and.push({
      purchaseStatus: { in: ['RESERVED', 'PARTIALLY_PAID', 'WAITING_OFFER'] },
    });
  } else if (query.purchaseStatus) {
    and.push({ purchaseStatus: query.purchaseStatus });
  }

  if (query.unknownPrice === true) {
    and.push({ totalPrice: null });
  }

  if (query.pendingPayment === true) {
    and.push({ totalPrice: { not: null } });
    and.push({ NOT: { purchaseStatus: { in: ['PAID', 'CANCELLED'] } } });
  }

  return { AND: and };
}

function inDateRange(main: Date, query: GamesQueryInput): boolean {
  const t = main.getTime();

  if (query.dateFrom) {
    const from = parseDateOnly(query.dateFrom);
    if (from && t < from.getTime()) return false;
  }
  if (query.dateTo) {
    const to = parseDateOnly(query.dateTo);
    if (to && t > to.getTime()) return false;
  }
  if (query.year) {
    const start = Date.UTC(query.year, (query.month ?? 1) - 1, 1);
    const end = query.month
      ? Date.UTC(query.year, query.month, 1)
      : Date.UTC(query.year + 1, 0, 1);
    if (t < start || t >= end) return false;
  }

  return true;
}

/** Filtros y ordenación que dependen de la fecha principal (post-Prisma). */
export function applyMainDateFiltersAndSort(
  games: Game[],
  query: GamesQueryInput,
): Game[] {
  let result = games;

  if (query.knownDate === true) {
    result = result.filter((g) => getMainDate(g) !== null);
  } else if (query.knownDate === false) {
    result = result.filter((g) => getMainDate(g) === null);
  }

  const needsRange =
    Boolean(query.dateFrom) || Boolean(query.dateTo) || Boolean(query.year);
  if (needsRange) {
    result = result.filter((g) => {
      const main = getMainDate(g);
      if (!main) return false;
      return inDateRange(main, query);
    });
  }

  if (query.pendingPayment === true) {
    result = result.filter((g) => {
      const remaining = calculateRemainingAmount(g.totalPrice, g.amountPaid);
      return remaining != null && remaining.greaterThan(0);
    });
  }

  const order = query.order === 'desc' ? -1 : 1;

  if (query.sort === 'title') {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'es') * order);
  } else if (query.sort === 'updated') {
    result = [...result].sort(
      (a, b) => (a.updatedAt.getTime() - b.updatedAt.getTime()) * order,
    );
  } else {
    // sort=date por fecha principal; sin fecha al final en ASC
    result = [...result].sort((a, b) => {
      const da = getMainDate(a)?.getTime();
      const db = getMainDate(b)?.getTime();
      if (da == null && db == null) return a.title.localeCompare(b.title, 'es');
      if (da == null) return 1;
      if (db == null) return -1;
      if (da !== db) return (da - db) * order;
      return a.title.localeCompare(b.title, 'es');
    });
  }

  return result;
}

export async function listGames(
  userId: string,
  query: GamesQueryInput,
  options?: { hideDismissedGames?: boolean },
) {
  const where = buildWhere(userId, query);
  if (options?.hideDismissedGames && !query.interestStatus) {
    const and = Array.isArray(where.AND)
      ? [...where.AND]
      : where.AND
        ? [where.AND]
        : [{ userId }];
    and.push({ interestStatus: { not: 'NOT_INTERESTED' } });
    where.AND = and;
  }
  const games = await prisma.game.findMany({ where });
  const filtered = applyMainDateFiltersAndSort(games, query);

  const total = filtered.length;
  const skip = (query.page - 1) * query.pageSize;
  const pageItems = filtered.slice(skip, skip + query.pageSize);

  return {
    items: pageItems.map(serializeGame),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getGameById(userId: string, id: string): Promise<GameDto> {
  const game = await prisma.game.findFirst({ where: { id, userId } });
  if (!game) throw new AppError(404, 'Juego no encontrado');
  return serializeGame(game);
}

export async function createGame(userId: string, input: GameCreateInput): Promise<GameDto> {
  if (input.rawgId) {
    const existing = await prisma.game.findFirst({
      where: { userId, rawgId: input.rawgId },
    });
    if (existing) {
      throw new AppError(409, 'Ya tienes este juego de RAWG en tu colección');
    }
  }

  const game = await prisma.game.create({
    data: mapCreateData(userId, input),
  });
  return serializeGame(game);
}

export async function updateGame(
  userId: string,
  id: string,
  input: GameUpdateInput,
): Promise<GameDto> {
  const existing = await prisma.game.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Juego no encontrado');

  if (input.rawgId) {
    const clash = await prisma.game.findFirst({
      where: { userId, rawgId: input.rawgId, NOT: { id } },
    });
    if (clash) {
      throw new AppError(409, 'Ya tienes este juego de RAWG en tu colección');
    }
  }

  const game = await prisma.game.update({
    where: { id },
    data: mapUpdateData(input),
  });
  return serializeGame(game);
}

export async function deleteGame(userId: string, id: string): Promise<void> {
  const existing = await prisma.game.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Juego no encontrado');
  await prisma.game.delete({ where: { id } });
}

export async function updateInterest(
  userId: string,
  id: string,
  interestStatus: InterestStatus,
): Promise<GameDto> {
  return updateGame(userId, id, { interestStatus });
}

export async function updatePurchaseStatus(
  userId: string,
  id: string,
  purchaseStatus: PurchaseStatus,
): Promise<GameDto> {
  return updateGame(userId, id, { purchaseStatus });
}

export { toNumber };
