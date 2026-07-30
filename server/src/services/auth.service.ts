import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { getEnv } from '../config/env.js';
import { generateSessionToken, hashToken } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';
import type { AuthUser } from '../types/express.js';

const GENERIC_AUTH_ERROR = 'Correo o contraseña incorrectos';

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string; expiresAt: Date }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Comparación ficticia para mitigar timing attacks si el usuario no existe
  const hashToCompare = user?.passwordHash ?? '$2b$12$invalidhashinvalidhashinvalidha';
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!user || !valid) {
    throw new AppError(401, GENERIC_AUTH_ERROR);
  }

  const env = getEnv();
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  // Limpieza oportunista de sesiones expiradas del usuario
  void prisma.session
    .deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    })
    .catch(() => undefined);

  return {
    user: { id: user.id, email: user.email },
    token,
    expiresAt,
  };
}

export async function logoutByToken(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function getUserFromSessionToken(
  token: string | undefined,
): Promise<{ user: AuthUser; sessionId: string } | null> {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  await prisma.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    user: { id: session.user.id, email: session.user.email },
    sessionId: session.id,
  };
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
