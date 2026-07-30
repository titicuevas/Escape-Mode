import type { Request } from 'express';
import type { User } from '@prisma/client';

export type AuthUser = Pick<User, 'id' | 'email'>;

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}
