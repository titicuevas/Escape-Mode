import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as finance from '../controllers/finance.controller.js';

export const offersRouter = Router();
offersRouter.use(requireAuth);
offersRouter.patch('/:id', finance.updateOffer);
offersRouter.delete('/:id', finance.deleteOffer);

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);
paymentsRouter.patch('/:id', finance.updatePayment);
paymentsRouter.delete('/:id', finance.deletePayment);

export const budgetRouter = Router();
budgetRouter.use(requireAuth);
budgetRouter.get('/', finance.budget);
