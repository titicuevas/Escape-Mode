import { Router } from 'express';
import {
  gameListCreateSchema,
  gameListItemCreateSchema,
  gameListUpdateSchema,
} from '@grc/shared';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/errors.js';
import * as lists from '../services/lists.service.js';
import type { Request, Response, NextFunction } from 'express';

export const listsRouter = Router();
listsRouter.use(requireAuth);

function requireUser(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new AppError(401, 'No autenticado');
  return user;
}

listsRouter.get('/', async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.json(await lists.listGameLists(user.id));
  } catch (error) {
    next(error);
  }
});

listsRouter.post('/', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const body = gameListCreateSchema.parse(req.body);
    const result = await lists.createGameList(user.id, body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

listsRouter.get('/:listId', async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.json(await lists.getGameList(user.id, String(req.params.listId)));
  } catch (error) {
    next(error);
  }
});

listsRouter.patch('/:listId', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const body = gameListUpdateSchema.parse(req.body);
    res.json(await lists.updateGameList(user.id, String(req.params.listId), body));
  } catch (error) {
    next(error);
  }
});

listsRouter.delete('/:listId', async (req, res, next) => {
  try {
    const user = requireUser(req);
    await lists.deleteGameList(user.id, String(req.params.listId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

listsRouter.post('/:listId/games', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const body = gameListItemCreateSchema.parse(req.body);
    res.status(201).json(await lists.addGameToList(user.id, String(req.params.listId), body));
  } catch (error) {
    next(error);
  }
});

listsRouter.delete('/:listId/games/:gameId', async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.json(
      await lists.removeGameFromList(
        user.id,
        String(req.params.listId),
        String(req.params.gameId),
      ),
    );
  } catch (error) {
    next(error);
  }
});
