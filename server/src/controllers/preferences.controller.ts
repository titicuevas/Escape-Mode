import type { NextFunction, Request, Response } from 'express';
import { preferencesUpdateSchema } from '@grc/shared';
import type { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/errors.js';
import * as preferences from '../services/preferences.service.js';

function requireUser(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new AppError(401, 'No autenticado');
  return user;
}

export async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const prefs = await preferences.getOrCreatePreferences(user.id);
    res.json({ preferences: prefs });
  } catch (error) {
    next(error);
  }
}

export async function patchPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const body = preferencesUpdateSchema.parse(req.body);
    const prefs = await preferences.updatePreferences(user.id, body);
    res.json({ preferences: prefs });
  } catch (error) {
    next(error);
  }
}
