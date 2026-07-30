import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export async function health(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch {
    console.error('Health check DB fallida');
    // 503 hace fallar el healthcheck de Railway; respondemos 200 con estado degradado
    // solo si el proceso está vivo pero la DB aún no responde (arranque).
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
}
