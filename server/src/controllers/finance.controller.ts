import type { NextFunction, Request, Response } from 'express';
import {
  paymentCreateSchema,
  paymentUpdateSchema,
  storeOfferCreateSchema,
  storeOfferUpdateSchema,
  budgetQuerySchema,
} from '@grc/shared';
import type { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/errors.js';
import * as paymentsService from '../services/payments.service.js';
import * as offersService from '../services/offers.service.js';
import { getBudget } from '../services/budget.service.js';

function requireUser(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new AppError(401, 'No autenticado');
  return user;
}

export async function listPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const gameId = String(req.params.gameId);
    const payments = await paymentsService.listPayments(user.id, gameId);
    res.json({ payments });
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const gameId = String(req.params.gameId);
    const body = paymentCreateSchema.parse(req.body);
    const payment = await paymentsService.createPayment(user.id, gameId, body);
    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
}

export async function updatePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    const body = paymentUpdateSchema.parse(req.body);
    const payment = await paymentsService.updatePayment(user.id, id, body);
    res.json({ payment });
  } catch (error) {
    next(error);
  }
}

export async function deletePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    await paymentsService.deletePayment(user.id, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const gameId = String(req.params.gameId);
    const data = await offersService.listOffers(user.id, gameId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const gameId = String(req.params.gameId);
    const body = storeOfferCreateSchema.parse(req.body);
    const offer = await offersService.createOffer(user.id, gameId, body);
    res.status(201).json({ offer });
  } catch (error) {
    next(error);
  }
}

export async function updateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    const body = storeOfferUpdateSchema.parse(req.body);
    const offer = await offersService.updateOffer(user.id, id, body);
    res.json({ offer });
  } catch (error) {
    next(error);
  }
}

export async function deleteOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const id = String(req.params.id);
    await offersService.deleteOffer(user.id, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function budget(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const query = budgetQuerySchema.parse(req.query);
    const data = await getBudget(user.id, query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
