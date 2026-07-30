import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.js';
import { getDashboard } from '../services/dashboard.service.js';
import { AppError } from '../utils/errors.js';

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) throw new AppError(401, 'No autenticado');
    const data = await getDashboard(user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
