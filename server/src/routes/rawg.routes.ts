import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as rawg from '../controllers/rawg.controller.js';

export const rawgRouter = Router();
rawgRouter.use(requireAuth);
rawgRouter.use(rawg.rawgLimiter);

rawgRouter.get('/search', rawg.search);
rawgRouter.get('/games/:rawgId', rawg.detail);
rawgRouter.get('/discover', rawg.discover);

export const discoveryRouter = Router();
discoveryRouter.use(requireAuth);
discoveryRouter.post('/decide', rawg.decide);
discoveryRouter.post('/undo', rawg.undo);
discoveryRouter.get('/dismissed', rawg.listDismissed);
discoveryRouter.post('/recover', rawg.recover);
