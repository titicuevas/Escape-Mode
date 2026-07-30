import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { decimalFrom, offerFinalPrice } from '../utils/money.js';
import { parseDateOnly } from '../utils/dates.js';
import type { StoreOfferCreateInput, StoreOfferUpdateInput } from '@grc/shared';
import type { StoreOffer } from '@prisma/client';

async function assertGameOwned(userId: string, gameId: string) {
  const game = await prisma.game.findFirst({ where: { id: gameId, userId } });
  if (!game) throw new AppError(404, 'Juego no encontrado');
  return game;
}

export function serializeOffer(offer: StoreOffer, selectedStore?: string | null) {
  const finalPrice = offerFinalPrice(offer.price, offer.shippingCost);
  return {
    ...offer,
    price: offer.price.toString(),
    shippingCost: offer.shippingCost.toString(),
    finalPrice: finalPrice.toString(),
    checkedAt: offer.checkedAt.toISOString(),
    isSelectedStore: Boolean(selectedStore && selectedStore === offer.store),
  };
}

export async function listOffers(userId: string, gameId: string) {
  const game = await assertGameOwned(userId, gameId);
  const offers = await prisma.storeOffer.findMany({
    where: { gameId },
    orderBy: [{ checkedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const serialized = offers.map((o) => serializeOffer(o, game.selectedStore));
  const lowest = serialized.reduce<string | null>((min, o) => {
    if (min == null) return o.finalPrice;
    return Number(o.finalPrice) < Number(min) ? o.finalPrice : min;
  }, null);

  return {
    offers: serialized.map((o) => ({
      ...o,
      isLowestPrice: lowest != null && o.finalPrice === lowest,
      targetReached:
        game.targetPrice != null && Number(o.finalPrice) <= Number(game.targetPrice.toString()),
    })),
    targetPrice: game.targetPrice?.toString() ?? null,
    selectedStore: game.selectedStore,
  };
}

export async function createOffer(userId: string, gameId: string, input: StoreOfferCreateInput) {
  await assertGameOwned(userId, gameId);
  const offer = await prisma.storeOffer.create({
    data: {
      gameId,
      store: input.store,
      edition: input.edition ?? undefined,
      platform: input.platform ?? undefined,
      price: decimalFrom(input.price)!,
      shippingCost: decimalFrom(input.shippingCost ?? 0)!,
      url: input.url ?? undefined,
      availability: input.availability,
      includesBonus: input.includesBonus,
      bonusDescription: input.bonusDescription ?? undefined,
      checkedAt: parseDateOnly(input.checkedAt ?? undefined) ?? new Date(),
      notes: input.notes ?? undefined,
    },
  });
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  return serializeOffer(offer, game.selectedStore);
}

export async function updateOffer(userId: string, offerId: string, input: StoreOfferUpdateInput) {
  const existing = await prisma.storeOffer.findUnique({
    where: { id: offerId },
    include: { game: true },
  });
  if (!existing || existing.game.userId !== userId) {
    throw new AppError(404, 'Oferta no encontrada');
  }

  const offer = await prisma.storeOffer.update({
    where: { id: offerId },
    data: {
      ...(input.store !== undefined ? { store: input.store } : {}),
      ...(input.edition !== undefined ? { edition: input.edition } : {}),
      ...(input.platform !== undefined ? { platform: input.platform } : {}),
      ...(input.price !== undefined ? { price: decimalFrom(input.price)! } : {}),
      ...(input.shippingCost !== undefined
        ? { shippingCost: decimalFrom(input.shippingCost)! }
        : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.availability !== undefined ? { availability: input.availability } : {}),
      ...(input.includesBonus !== undefined ? { includesBonus: input.includesBonus } : {}),
      ...(input.bonusDescription !== undefined
        ? { bonusDescription: input.bonusDescription }
        : {}),
      ...(input.checkedAt !== undefined
        ? { checkedAt: parseDateOnly(input.checkedAt) ?? new Date() }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  return serializeOffer(offer, existing.game.selectedStore);
}

export async function deleteOffer(userId: string, offerId: string) {
  const existing = await prisma.storeOffer.findUnique({
    where: { id: offerId },
    include: { game: true },
  });
  if (!existing || existing.game.userId !== userId) {
    throw new AppError(404, 'Oferta no encontrada');
  }
  await prisma.storeOffer.delete({ where: { id: offerId } });
}
