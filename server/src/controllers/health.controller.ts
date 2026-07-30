import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export async function health(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    console.error('Health check DB fallida');
    res.status(503).json({ status: 'ok', database: 'disconnected' });
  }
}
