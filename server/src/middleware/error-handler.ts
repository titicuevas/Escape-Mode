import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { getEnv } from '../config/env.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos no válidos',
      details: err.flatten(),
    });
    return;
  }

  const isProduction = (() => {
    try {
      return getEnv().NODE_ENV === 'production';
    } catch {
      return process.env.NODE_ENV === 'production';
    }
  })();

  console.error('Error no controlado:', err instanceof Error ? err.message : 'desconocido');

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(!isProduction && err instanceof Error ? { details: err.message } : {}),
  });
}
