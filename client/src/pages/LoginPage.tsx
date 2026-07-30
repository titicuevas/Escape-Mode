import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@grc/shared';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      const from =
        typeof location.state === 'object' &&
        location.state !== null &&
        'from' in location.state &&
        typeof (location.state as { from: unknown }).from === 'string'
          ? (location.state as { from: string }).from
          : '/';
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('No se pudo iniciar sesión. Inténtalo de nuevo.');
      }
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8 safe-top safe-bottom">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-elevated/90 p-6 shadow-2xl shadow-black/40 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-muted">Acceso privado</p>
        <h1 className="mt-2 text-xl font-semibold text-accent sm:text-2xl">Game Release Calendar</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Inicia sesión para gestionar tus lanzamientos, reservas y presupuesto.
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-ink">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent/50"
              {...register('email')}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-danger" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent/50"
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-danger" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-lg bg-accent-strong px-4 py-2.5 text-sm font-semibold text-surface transition hover:bg-accent disabled:opacity-60"
          >
            {isSubmitting ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
