import type { NextFunction, Request, Response } from 'express';
import { gameCreateSchema, gameUpdateSchema, gamesQuerySchema } from '@grc/shared';
import type { AuthenticatedRequest } from '../types/express.js';
import * as gamesService from '../services/games.service.js';
import { backfillMissingCovers } from '../services/covers.service.js';
import { getOrCreatePreferences } from '../services/preferences.service.js';
import { AppError } from '../utils/errors.js';

function requireUser(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new AppError(401, 'No autenticado');
  return user;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const query = gamesQuerySchema.parse(req.query);
    const prefs = await getOrCreatePreferences(user.id);
    const result = await gamesService.listGames(user.id, query, {
      hideDismissedGames: prefs.hideDismissedGames,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    const game = await gamesService.getGameById(user.id, id);
    res.json({ game });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const body = gameCreateSchema.parse(req.body);
    const game = await gamesService.createGame(user.id, body);
    res.status(201).json({ game });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    const body = gameUpdateSchema.parse(req.body);
    const game = await gamesService.updateGame(user.id, id, body);
    res.json({ game });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    await gamesService.deleteGame(user.id, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function backfillCovers(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await backfillMissingCovers(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
