import type { NextFunction, Request, Response } from 'express';
import { getUserFromSessionToken } from '../services/auth.service.js';
import { SESSION_COOKIE_NAME } from '../config/session.js';
import { AppError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/express.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const result = await getUserFromSessionToken(token);

    if (!result) {
      throw new AppError(401, 'No autenticado');
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = result.user;
    authReq.sessionId = result.sessionId;
    next();
  } catch (error) {
    next(error);
  }
}
