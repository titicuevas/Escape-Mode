import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CoverImage } from '../components/CoverImage';
import { formatEuro } from '../utils/format';
import type { BudgetGrouping } from '../types/finance';
import type { Game } from '../types/game';
import { usePreferences } from '../providers/PreferencesProvider';

export function BudgetPage() {
  const now = new Date();
  const { preferences } = usePreferences();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | ''>('');
  const [grouping, setGrouping] = useState<BudgetGrouping>('RELEASE');
  const [prefsApplied, setPrefsApplied] = useState(false);

  useEffect(() => {
    if (prefsApplied || !preferences) return;
    setGrouping(preferences.defaultBudgetGrouping);
    setPrefsApplied(true);
  }, [preferences, prefsApplied]);

  const params = useMemo(
    () => ({
      year,
      month: month === '' ? undefined : month,
      grouping,
    }),
    [year, month, grouping],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['budget', params],
    queryFn: () => api.getBudget(params),
  });

  const paidRatio = useMemo(() => {
    if (!data) return 0;
    const paid = Number(data.totalPaid);
    const pending = Number(data.totalPending);
    const total = paid + pending;
    if (!total || Number.isNaN(total)) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }, [data]);

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent/80">Finanzas</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Presupuesto
        </h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Lo pagado, lo que queda y dónde se va el dinero.
        </p>
      </header>

      <form
        className="grid gap-3 rounded-2xl border border-white/10 bg-surface-elevated/50 p-3 sm:p-4 md:grid-cols-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor="year" className="mb-1 block text-xs text-ink-muted">
            Año
          </label>
          <input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="touch-field w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="month" className="mb-1 block text-xs text-ink-muted">
            Mes (opcional)
          </label>
          <input
            id="month"
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
            className="touch-field w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="grouping" className="mb-1 block text-xs text-ink-muted">
            Agrupación
          </label>
          <select
            id="grouping"
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as BudgetGrouping)}
            className="touch-field w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm"
          >
            <option value="RELEASE">Por lanzamiento</option>
            <option value="RESERVATION">Por reserva</option>
            <option value="PAYMENT">Por pago real</option>
          </select>
        </div>
      </form>

      {isLoading ? <PageSkeleton /> : null}
      {isError ? (
        <p className="text-danger" role="alert">
          No se pudo cargar el presupuesto.
        </p>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total pagado"
              value={formatEuro(data.totalPaid)}
              tone="success"
            />
            <StatCard
              label="Total pendiente"
              value={formatEuro(data.totalPending)}
              tone="warning"
            />
            <StatCard
              label="Gasto del periodo"
              value={formatEuro(data.totalSpend)}
              tone="accent"
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-surface-elevated/40 p-4 sm:p-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Progreso de pagos</h3>
                <p className="text-sm text-ink-muted">Pagado frente al pendiente del periodo</p>
              </div>
              <p className="font-display text-2xl font-semibold text-accent">{paidRatio}%</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-focus transition-[width] duration-500"
                style={{ width: `${paidRatio}%` }}
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <BucketList title="Gasto por mes" items={data.spendByMonth} />
            <BucketList title="Gasto por plataforma" items={data.spendByPlatform} />
            <BucketList title="Gasto por tienda" items={data.spendByStore} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <GameMoneyList
              title="Próximas obligaciones"
              empty="No hay pagos próximos."
              items={data.upcomingObligations.map((item) => ({
                game: item.game,
                meta: `${item.due ?? 'Sin fecha'} · ${formatEuro(item.remaining)}`,
              }))}
            />
            <GameMoneyList
              title="Parcialmente pagados"
              empty="Ninguno."
              items={data.partiallyPaidGames.map((game) => ({
                game,
                meta: `${formatEuro(game.amountPaid)} / ${formatEuro(game.totalPrice)}`,
                progress:
                  game.totalPrice && Number(game.totalPrice) > 0
                    ? Math.min(100, Math.round((Number(game.amountPaid) / Number(game.totalPrice)) * 100))
                    : 0,
              }))}
            />
          </section>

          <section>
            <h3 className="mb-3 font-display text-lg font-semibold">Juegos sin precio total</h3>
            {data.gamesWithoutPrice.length === 0 ? (
              <EmptyState title="Todos tienen precio" description="No hay juegos sin total indicado." />
            ) : (
              <GameMoneyList
                title=""
                empty=""
                items={data.gamesWithoutPrice.map((game) => ({
                  game,
                  meta: 'Sin total',
                }))}
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'accent';
}) {
  const bar =
    tone === 'success'
      ? 'from-success/80 to-success/20'
      : tone === 'warning'
        ? 'from-warning/80 to-warning/20'
        : 'from-accent/80 to-focus/30';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/60 p-5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar}`} />
      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function BucketList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; amount: string }>;
}) {
  const max = Math.max(...items.map((i) => Number(i.amount) || 0), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-elevated/40 p-4">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin datos.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const amount = Number(item.amount) || 0;
            const width = Math.max(6, Math.round((amount / max) * 100));
            return (
              <li key={item.key}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate">{item.key}</span>
                  <span className="shrink-0 text-ink-muted">{formatEuro(item.amount)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GameMoneyList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ game: Game; meta: string; progress?: number }>;
}) {
  return (
    <div>
      {title ? <h3 className="mb-3 font-display text-lg font-semibold">{title}</h3> : null}
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ game, meta, progress }) => (
            <li key={game.id}>
              <Link
                to={`/games/${game.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-elevated/30 p-2.5 transition hover:border-accent/30 hover:bg-white/[0.03]"
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg">
                  <CoverImage src={game.coverUrl} title={game.title} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{game.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{meta}</p>
                  {progress != null ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-warning/80"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
