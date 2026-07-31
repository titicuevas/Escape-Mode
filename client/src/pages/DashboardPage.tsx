import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, Compass, Gamepad2, Heart, Plus, ShoppingBag, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/EmptyState';
import { CoverImage } from '../components/CoverImage';
import { formatDateEs, formatEuro, interestLabel } from '../utils/format';
import { useAuth } from '../providers/AuthProvider';
import type { Game, PurchaseStatus } from '../types/game';

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, purchaseStatus }: { id: string; purchaseStatus: PurchaseStatus }) =>
      api.updateGame(id, { purchaseStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <p className="text-danger" role="alert">
        No se pudo cargar el panel. ¿Está la base de datos disponible?
      </p>
    );
  }

  const next = data.nextRelease?.game;
  const nowPlaying = data.nowPlaying ?? [];
  const playBacklog = data.playBacklog ?? [];

  return (
    <div className="space-y-7 md:space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-muted">Hola, {user?.email}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Tu biblioteca
          </h2>
        </div>
        <Link
          to="/games/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-sm font-semibold text-surface shadow-[0_10px_30px_-12px_rgba(45,212,191,0.7)] transition hover:brightness-110"
        >
          <Plus className="size-4" aria-hidden />
          Añadir juego
        </Link>
      </header>

      <section className="rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface-elevated/40 to-focus/5 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent">
              <Gamepad2 className="size-3.5" aria-hidden />
              Ahora mismo
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Jugando y cola
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Solo juegos ya salidos (o sin fecha). Los pendientes de lanzamiento no entran aquí.
            </p>
          </div>
          <span className="rounded-lg border border-white/10 bg-surface/40 px-2.5 py-1 text-xs text-ink-muted">
            {data.playQueueCount ?? nowPlaying.length + playBacklog.length} en cola
            {(data.playBacklogTotal ?? 0) > playBacklog.length
              ? ` · mostrando ${playBacklog.length}`
              : ''}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-medium text-accent">Jugando ahora</h4>
            {nowPlaying.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-ink-muted">
                Ninguno en marcha. Empieza uno desde la cola.
              </p>
            ) : (
              <ul className="space-y-2">
                {nowPlaying.map((game) => (
                  <PlayRow
                    key={game.id}
                    game={game}
                    busy={statusMutation.isPending}
                    actions={[
                      {
                        label: 'Terminado',
                        onClick: () =>
                          statusMutation.mutate({ id: game.id, purchaseStatus: 'COMPLETED' }),
                      },
                      {
                        label: 'Pausar',
                        onClick: () =>
                          statusMutation.mutate({ id: game.id, purchaseStatus: 'RECEIVED' }),
                      },
                    ]}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium text-focus">Siguiente a jugar</h4>
            {playBacklog.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-ink-muted">
                Nada pendiente de jugar. Los pagados que aún no han salido aparecen en reservas /
                lanzamientos, no aquí.
              </p>
            ) : (
              <ul className="space-y-2">
                {playBacklog.map((game) => (
                  <PlayRow
                    key={game.id}
                    game={game}
                    busy={statusMutation.isPending}
                    actions={[
                      {
                        label: 'Empezar',
                        onClick: () =>
                          statusMutation.mutate({ id: game.id, purchaseStatus: 'PLAYING' }),
                      },
                    ]}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {next ? (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-surface-elevated/50">
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative min-h-48 overflow-hidden md:min-h-[17rem]">
              <CoverImage
                src={next.coverUrl}
                title={next.title}
                alt={`Portada de ${next.title}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-elevated/80 max-md:bg-gradient-to-t max-md:from-surface-elevated via-transparent to-transparent" />
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Próximo lanzamiento</p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                <Link to={`/games/${next.id}`} className="hover:text-accent">
                  {next.title}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-ink-muted sm:text-base">
                {formatDateEs(data.nextRelease?.mainDate)} · {data.nextRelease?.daysRemaining} días
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/games/${next.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-accent/40 px-3 text-sm text-accent hover:bg-accent/10"
                >
                  Ver ficha
                </Link>
                <Link
                  to="/calendar"
                  className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-sm text-ink-muted hover:bg-white/5"
                >
                  Calendario
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          label="Pendiente este mes"
          value={formatEuro(data.pendingAmountThisMonth)}
          hint={
            data.nextPaymentDue
              ? `Próximo: ${data.nextPaymentDue.game.title}`
              : 'Sin pagos próximos'
          }
        />
        <Kpi
          label="Reservas activas"
          value={String(data.activeReservations.length)}
          hint={
            <Link to="/reservations" className="inline-flex items-center gap-1 text-accent">
              <ShoppingBag className="size-3.5" aria-hidden /> Ver reservas
            </Link>
          }
        />
        <Kpi
          label="En posesión"
          value={String(data.paidGamesCount)}
          hint={
            <Link to="/budget" className="inline-flex items-center gap-1 text-accent">
              <Wallet className="size-3.5" aria-hidden /> Presupuesto
            </Link>
          }
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Accesos rápidos">
        <QuickLink
          to="/discover"
          icon={<Compass className="size-5 text-accent" aria-hidden />}
          title="Descubrir"
          text="Tarjetas y filtros por plataforma."
        />
        <QuickLink
          to="/calendar"
          icon={<CalendarDays className="size-5 text-focus" aria-hidden />}
          title="Calendario"
          text="Vista mensual y línea temporal."
        />
        <QuickLink
          to="/interest"
          icon={<Heart className="size-5 text-warning" aria-hidden />}
          title="Interés"
          text={`${interestLabel('THINKING')}: ${data.interestCounts.THINKING}`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold tracking-tight">Esta semana</h3>
            <span className="text-xs text-ink-muted">{data.thisWeek?.length ?? 0}</span>
          </div>
          {(data.thisWeek?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-ink-muted">
              Nada en los próximos 7 días.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.thisWeek.map((game) => (
                <li key={game.id}>
                  <Link
                    to={`/games/${game.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-elevated/40 px-3 py-2.5 text-sm hover:border-accent/30"
                  >
                    <span className="truncate font-medium">{game.title}</span>
                    <span className="shrink-0 text-xs text-accent">
                      {game.daysRemaining === 0 ? 'Hoy' : `${game.daysRemaining}d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold tracking-tight">Este mes</h3>
            <span className="text-xs text-ink-muted">{data.thisMonth?.length ?? 0}</span>
          </div>
          {(data.thisMonth?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-ink-muted">
              Sin lanzamientos este mes en tu biblioteca.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.thisMonth.slice(0, 8).map((game) => (
                <li key={game.id}>
                  <Link
                    to={`/games/${game.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-elevated/40 px-3 py-2.5 text-sm hover:border-accent/30"
                  >
                    <span className="truncate font-medium">{game.title}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {formatDateEs(game.mainDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(data.reminders?.length ?? 0) > 0 ? (
        <section className="rounded-2xl border border-warning/25 bg-warning/5 p-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">Avisos próximos</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Ventana de {data.reminderDaysBefore} días (ajustable en Ajustes).
          </p>
          <ul className="mt-3 space-y-2">
            {data.reminders.slice(0, 6).map((r) => (
              <li key={`${r.type}-${r.gameId}-${r.date}`}>
                <Link
                  to={`/games/${r.gameId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-surface/40 px-3 py-2 text-sm hover:border-warning/40"
                >
                  <span>
                    <span className="text-warning">
                      {r.type === 'payment' ? 'Pago' : 'Lanzamiento'}
                    </span>
                    {' · '}
                    {r.title}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {r.daysRemaining === 0 ? 'Hoy' : `en ${r.daysRemaining}d`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight">
              Próximos lanzamientos
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Interés y seguimiento · sin reserva ni compra todavía
            </p>
          </div>
          <Link to="/releases" className="text-sm text-accent">
            Ver todos
          </Link>
        </div>
        {data.nextFiveReleases.length === 0 ? (
          <EmptyState
            title="Nada en seguimiento"
            description="Los juegos que reserves o compres aparecen abajo. Usa Descubrir para añadir interés."
            action={
              <Link to="/discover" className="text-sm text-accent underline">
                Ir a Descubrir
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.nextFiveReleases.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight">
              Reservas y compras próximas
            </h3>
            <p className="mt-1 text-xs text-ink-muted">Ya reservados, pagados o en camino</p>
          </div>
          <Link to="/reservations" className="text-sm text-accent">
            Ver reservas
          </Link>
        </div>
        {data.upcomingCommittedReleases.length === 0 ? (
          <EmptyState
            title="Sin reservas próximas"
            description="Cuando reserves o pagues un juego con fecha, aparecerá aquí."
            action={
              <Link to="/reservations" className="text-sm text-accent underline">
                Ir a reservas
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.upcomingCommittedReleases.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ListBlock
          title="Me lo pienso"
          empty="No hay juegos en esta lista."
          items={data.thinkingGames.map((game) => ({
            id: game.id,
            title: game.title,
            meta: formatDateEs(game.mainDate),
            coverUrl: game.coverUrl,
          }))}
        />
        <ListBlock
          title="Recién actualizados"
          empty="Sin actividad reciente."
          items={data.recentlyUpdated.map((game) => ({
            id: game.id,
            title: game.title,
            meta: interestLabel(game.interestStatus),
            coverUrl: game.coverUrl,
          }))}
        />
      </section>
    </div>
  );
}

function PlayRow({
  game,
  busy,
  actions,
}: {
  game: Game;
  busy: boolean;
  actions: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface/50 px-2 py-2">
      <Link to={`/games/${game.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md">
          <CoverImage src={game.coverUrl} title={game.title} alt="" />
        </div>
        <span className="truncate text-sm font-medium">{game.title}</span>
      </Link>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={busy}
            className="min-h-9 rounded-lg border border-white/15 px-2 text-[11px] text-ink-muted hover:border-accent/40 hover:text-accent disabled:opacity-50"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-elevated/55 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 text-sm text-ink-muted">{hint}</div>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  text,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-white/10 bg-surface-elevated/45 p-5 transition hover:border-accent/30 hover:bg-white/[0.03]"
    >
      {icon}
      <h3 className="mt-3 font-display font-medium tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{text}</p>
    </Link>
  );
}

function ListBlock({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; coverUrl: string | null }>;
}) {
  return (
    <div>
      <h3 className="mb-4 font-display text-xl font-semibold tracking-tight">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/games/${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-elevated/30 px-2.5 py-2 text-sm transition hover:border-accent/25 hover:bg-white/[0.03]"
              >
                <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md">
                  <CoverImage src={item.coverUrl} title={item.title} alt="" />
                </div>
                <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                <span className="shrink-0 text-xs text-ink-muted">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
