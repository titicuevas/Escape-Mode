import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { serializeGame } from './games.service.js';
import type { GameListCreateInput, GameListItemCreateInput, GameListUpdateInput } from '@grc/shared';

function serializeList(
  list: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      note: string | null;
      addedAt: Date;
      game: Parameters<typeof serializeGame>[0];
    }>;
  },
  includeGames: boolean,
) {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    itemCount: list.items.length,
    items: includeGames
      ? list.items.map((item) => ({
          id: item.id,
          note: item.note,
          addedAt: item.addedAt.toISOString(),
          game: serializeGame(item.game),
        }))
      : undefined,
  };
}

export async function listGameLists(userId: string) {
  const lists = await prisma.gameList.findMany({
    where: { userId },
    include: {
      items: {
        include: { game: true },
        orderBy: { addedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return { lists: lists.map((l) => serializeList(l, false)) };
}

export async function getGameList(userId: string, listId: string) {
  const list = await prisma.gameList.findFirst({
    where: { id: listId, userId },
    include: {
      items: {
        include: { game: true },
        orderBy: { addedAt: 'desc' },
      },
    },
  });
  if (!list) throw new AppError(404, 'Lista no encontrada');
  return { list: serializeList(list, true) };
}

export async function createGameList(userId: string, input: GameListCreateInput) {
  try {
    const list = await prisma.gameList.create({
      data: {
        userId,
        name: input.name,
        description: input.description ?? null,
      },
      include: { items: { include: { game: true } } },
    });
    return { list: serializeList(list, true) };
  } catch {
    throw new AppError(409, 'Ya tienes una lista con ese nombre');
  }
}

export async function updateGameList(userId: string, listId: string, input: GameListUpdateInput) {
  const existing = await prisma.gameList.findFirst({ where: { id: listId, userId } });
  if (!existing) throw new AppError(404, 'Lista no encontrada');
  try {
    const list = await prisma.gameList.update({
      where: { id: listId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: {
        items: { include: { game: true }, orderBy: { addedAt: 'desc' } },
      },
    });
    return { list: serializeList(list, true) };
  } catch {
    throw new AppError(409, 'Ya tienes una lista con ese nombre');
  }
}

export async function deleteGameList(userId: string, listId: string) {
  const existing = await prisma.gameList.findFirst({ where: { id: listId, userId } });
  if (!existing) throw new AppError(404, 'Lista no encontrada');
  await prisma.gameList.delete({ where: { id: listId } });
}

export async function addGameToList(
  userId: string,
  listId: string,
  input: GameListItemCreateInput,
) {
  const list = await prisma.gameList.findFirst({ where: { id: listId, userId } });
  if (!list) throw new AppError(404, 'Lista no encontrada');

  const game = await prisma.game.findFirst({ where: { id: input.gameId, userId } });
  if (!game) throw new AppError(404, 'Juego no encontrado');

  try {
    await prisma.gameListItem.create({
      data: {
        listId,
        gameId: input.gameId,
        note: input.note ?? null,
      },
    });
  } catch {
    throw new AppError(409, 'Ese juego ya está en la lista');
  }

  return getGameList(userId, listId);
}

export async function removeGameFromList(userId: string, listId: string, gameId: string) {
  const list = await prisma.gameList.findFirst({ where: { id: listId, userId } });
  if (!list) throw new AppError(404, 'Lista no encontrada');

  const item = await prisma.gameListItem.findFirst({ where: { listId, gameId } });
  if (!item) throw new AppError(404, 'El juego no está en la lista');

  await prisma.gameListItem.delete({ where: { id: item.id } });
  return getGameList(userId, listId);
}
