import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, Compass, Plus, ShoppingBag, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/EmptyState';
import { formatDateEs, formatEuro, interestLabel } from '../utils/format';
import { useAuth } from '../providers/AuthProvider';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <p className="text-danger" role="alert">
        No se pudo cargar el panel. ¿Está la base de datos disponible?
      </p>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-muted">Hola, {user?.email}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Panel principal</h2>
        </div>
        <Link
          to="/games/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-strong px-3 py-2 text-sm font-semibold text-surface"
        >
          <Plus className="size-4" aria-hidden />
          Añadir juego
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-surface-muted/60 p-5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Próximo lanzamiento</p>
          {data.nextRelease ? (
            <>
              <p className="mt-2 text-lg font-semibold">{data.nextRelease.game.title}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {formatDateEs(data.nextRelease.mainDate)} · {data.nextRelease.daysRemaining} días
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Sin próximos lanzamientos</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-muted/60 p-5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Pendiente este mes</p>
          <p className="mt-2 text-lg font-semibold">{formatEuro(data.pendingAmountThisMonth)}</p>
          {data.nextPaymentDue ? (
            <p className="mt-1 text-sm text-ink-muted">
              Próximo: {data.nextPaymentDue.game.title} ({formatEuro(data.nextPaymentDue.remaining)})
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Sin pagos próximos</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-muted/60 p-5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Reservas activas</p>
          <p className="mt-2 text-lg font-semibold">{data.activeReservations.length}</p>
          <Link to="/reservations" className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
            <ShoppingBag className="size-3.5" aria-hidden /> Ver reservas
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-muted/60 p-5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Juegos pagados</p>
          <p className="mt-2 text-lg font-semibold">{data.paidGamesCount}</p>
          <Link to="/budget" className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
            <Wallet className="size-3.5" aria-hidden /> Presupuesto
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Accesos rápidos">
        <Link
          to="/discover"
          className="rounded-xl border border-white/10 bg-surface-muted/60 p-5 transition hover:border-accent/30"
        >
          <Compass className="size-5 text-accent" aria-hidden />
          <h3 className="mt-3 font-medium">Descubrir</h3>
          <p className="mt-1 text-sm text-ink-muted">Tarjetas deslizables y filtros por plataforma.</p>
        </Link>
        <Link
          to="/calendar"
          className="rounded-xl border border-white/10 bg-surface-muted/60 p-5 transition hover:border-accent/30"
        >
          <CalendarDays className="size-5 text-focus" aria-hidden />
          <h3 className="mt-3 font-medium">Calendario</h3>
          <p className="mt-1 text-sm text-ink-muted">Vista mensual y línea temporal.</p>
        </Link>
        <Link
          to="/interest"
          className="rounded-xl border border-white/10 bg-surface-muted/60 p-5 transition hover:border-accent/30"
        >
          <h3 className="font-medium">Interés</h3>
          <p className="mt-2 text-sm text-ink-muted">
            {interestLabel('THINKING')}: {data.interestCounts.THINKING} · Pendientes de valorar:{' '}
            {data.pendingReviewCount}
          </p>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Próximos cinco lanzamientos</h3>
          <Link to="/releases" className="text-sm text-accent">
            Ver todos
          </Link>
        </div>
        {data.nextFiveReleases.length === 0 ? (
          <EmptyState
            title="Todavía no hay lanzamientos"
            description="Añade juegos manualmente o espera a la integración RAWG."
            action={
              <Link to="/games/new" className="text-sm text-accent underline">
                Añadir juego
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {data.nextFiveReleases.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-xl font-semibold">Me lo pienso</h3>
          {data.thinkingGames.length === 0 ? (
            <p className="text-sm text-ink-muted">No hay juegos en esta lista.</p>
          ) : (
            <ul className="space-y-2">
              {data.thinkingGames.map((game) => (
                <li key={game.id}>
                  <Link
                    to={`/games/${game.id}`}
                    className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                  >
                    <span>{game.title}</span>
                    <span className="text-ink-muted">{formatDateEs(game.mainDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-4 text-xl font-semibold">Recién actualizados</h3>
          <ul className="space-y-2">
            {data.recentlyUpdated.map((game) => (
              <li key={game.id}>
                <Link
                  to={`/games/${game.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                >
                  <span>{game.title}</span>
                  <span className="text-ink-muted">{interestLabel(game.interestStatus)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
