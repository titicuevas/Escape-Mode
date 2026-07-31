import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/errors.js';
import { exportLibrary, libraryToCsv } from '../services/export.service.js';

export const exportRouter = Router();
exportRouter.use(requireAuth);

function requireUser(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new AppError(401, 'No autenticado');
  return user;
}

exportRouter.get('/library.json', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const payload = await exportLibrary(user.id);
    res.setHeader('Content-Disposition', 'attachment; filename="game-release-calendar.json"');
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

exportRouter.get('/library.csv', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const payload = await exportLibrary(user.id);
    const csv = libraryToCsv(payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="game-release-calendar.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});
