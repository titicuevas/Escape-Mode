import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/errors.js';
import { exportLibrary, libraryToCsv } from '../services/export.service.js';
import { importLibrary } from '../services/import.service.js';

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

const importBodySchema = z.object({
  mode: z.enum(['merge', 'skip']).default('merge'),
  payload: z.unknown().optional(),
  text: z.string().optional(),
});

exportRouter.post('/library/import', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const body = importBodySchema.parse(req.body);
    const source = body.text ?? body.payload;
    if (source == null) {
      throw new AppError(400, 'Envía el JSON/CSV en "payload" o "text".');
    }
    const result = await importLibrary(user.id, source, body.mode);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
