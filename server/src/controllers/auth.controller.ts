import type { NextFunction, Request, Response } from 'express';
import { loginSchema } from '@grc/shared';
import {
  loginWithPassword,
  logoutByToken,
  getUserFromSessionToken,
} from '../services/auth.service.js';
import { getEnv } from '../config/env.js';
import { getCookieOptions, SESSION_COOKIE_NAME } from '../config/session.js';
import type { AuthenticatedRequest } from '../types/express.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const { user, token, expiresAt } = await loginWithPassword(body.email, body.password);
    const env = getEnv();
    const maxAgeMs = Math.max(expiresAt.getTime() - Date.now(), 0);

    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(env.NODE_ENV === 'production', maxAgeMs));
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await logoutByToken(token);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: getEnv().NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      res.json({ user: authReq.user });
      return;
    }

    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const result = await getUserFromSessionToken(token);
    if (!result) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
}
