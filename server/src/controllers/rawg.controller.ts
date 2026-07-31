import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  discoveryDecideSchema,
  discoveryUndoSchema,
  rawgDiscoverQuerySchema,
  rawgSearchQuerySchema,
  recoverDismissedSchema,
} from '@grc/shared';
import type { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/errors.js';
import { rawgService } from '../services/rawg/rawg.service.js';
import * as discovery from '../services/discovery.service.js';

function requireUser(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new AppError(401, 'No autenticado');
  return user;
}

export const rawgLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas a RAWG. Espera un momento.' },
});

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    requireUser(req);
    const { query } = rawgSearchQuerySchema.parse(req.query);
    const results = await rawgService.search(query);
    res.json({ results });
  } catch (error) {
    next(error);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    requireUser(req);
    const rawgId = Number(req.params.rawgId);
    if (!Number.isFinite(rawgId)) throw new AppError(400, 'Identificador RAWG no válido');
    const game = await rawgService.getGame(rawgId);
    res.json({ game });
  } catch (error) {
    next(error);
  }
}

export async function discover(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const parsed = rawgDiscoverQuerySchema.parse(req.query);
    const [preferredPlatforms, months, excludeRawgIds, excludeTitles, preferredGenres] =
      await Promise.all([
        discovery.getUserPreferredPlatforms(user.id),
        discovery.getDiscoveryMonths(user.id),
        discovery.getExcludedRawgIds(user.id),
        discovery.getExcludedTitles(user.id),
        discovery.getPreferredGenres(user.id),
      ]);

    let dateTo = parsed.dateTo;
    if (!dateTo) {
      const to = new Date();
      to.setMonth(to.getMonth() + months);
      dateTo = to.toISOString().slice(0, 10);
    }

    const result = await rawgService.discover(
      { ...parsed, dateTo },
      {
        preferredPlatforms,
        excludeRawgIds,
        excludeTitles,
        preferredGenres,
        useTaste: parsed.useTaste,
      },
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function decide(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const body = discoveryDecideSchema.parse(req.body);
    const result = await discovery.decideDiscovery(user.id, body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function undo(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const body = discoveryUndoSchema.parse(req.body);
    const result = await discovery.undoLastDecision(user.id, body.decisionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listDismissed(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const items = await discovery.listDismissed(user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function recover(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const body = recoverDismissedSchema.parse(req.body);
    const result = await discovery.recoverDismissed(user.id, body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
