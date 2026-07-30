export const SESSION_COOKIE_NAME = 'grc_session';

export function getCookieOptions(isProduction: boolean, maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}
