import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as gamesController from '../controllers/games.controller.js';
import * as finance from '../controllers/finance.controller.js';

export const gamesRouter = Router();

gamesRouter.use(requireAuth);
gamesRouter.get('/', gamesController.list);
gamesRouter.post('/', gamesController.create);
gamesRouter.post('/actions/backfill-covers', gamesController.backfillCovers);

gamesRouter.get('/:gameId/offers', finance.listOffers);
gamesRouter.post('/:gameId/offers', finance.createOffer);
gamesRouter.get('/:gameId/payments', finance.listPayments);
gamesRouter.post('/:gameId/payments', finance.createPayment);

gamesRouter.get('/:id', gamesController.getById);
gamesRouter.patch('/:id', gamesController.update);
gamesRouter.delete('/:id', gamesController.remove);
