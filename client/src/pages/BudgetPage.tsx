import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { formatEuro } from '../utils/format';
import type { BudgetGrouping } from '../types/finance';
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

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h2 className="text-2xl font-semibold sm:text-3xl">Presupuesto</h2>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Resumen claro de lo pagado, lo pendiente y el gasto agrupado.
        </p>
      </header>

      <form
        className="grid gap-3 rounded-xl border border-white/10 bg-surface-elevated/40 p-3 sm:p-4 md:grid-cols-3"
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
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
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
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
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
            className="touch-field w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
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
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Total pagado</p>
              <p className="mt-2 text-2xl font-semibold">{formatEuro(data.totalPaid)}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Total pendiente</p>
              <p className="mt-2 text-2xl font-semibold">{formatEuro(data.totalPending)}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Gasto del periodo</p>
              <p className="mt-2 text-2xl font-semibold">{formatEuro(data.totalSpend)}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <BucketList title="Gasto por mes" items={data.spendByMonth} />
            <BucketList title="Gasto por plataforma" items={data.spendByPlatform} />
            <BucketList title="Gasto por tienda" items={data.spendByStore} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-lg font-semibold">Próximas obligaciones</h3>
              {data.upcomingObligations.length === 0 ? (
                <p className="text-sm text-ink-muted">No hay pagos próximos.</p>
              ) : (
                <ul className="space-y-2">
                  {data.upcomingObligations.map((item) => (
                    <li key={item.game.id}>
                      <Link
                        to={`/games/${item.game.id}`}
                        className="flex justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                      >
                        <span>{item.game.title}</span>
                        <span className="text-ink-muted">
                          {item.due} · {formatEuro(item.remaining)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-lg font-semibold">Parcialmente pagados</h3>
              {data.partiallyPaidGames.length === 0 ? (
                <p className="text-sm text-ink-muted">Ninguno.</p>
              ) : (
                <ul className="space-y-2">
                  {data.partiallyPaidGames.map((game) => (
                    <li key={game.id}>
                      <Link
                        to={`/games/${game.id}`}
                        className="flex justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                      >
                        <span>{game.title}</span>
                        <span className="text-ink-muted">
                          {formatEuro(game.amountPaid)} / {formatEuro(game.totalPrice)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-semibold">Juegos sin precio total</h3>
            {data.gamesWithoutPrice.length === 0 ? (
              <EmptyState title="Todos tienen precio" description="No hay juegos sin total indicado." />
            ) : (
              <ul className="space-y-2">
                {data.gamesWithoutPrice.map((game) => (
                  <li key={game.id}>
                    <Link
                      to={`/games/${game.id}`}
                      className="block rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      {game.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
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
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin datos.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <span>{item.key}</span>
              <span className="text-ink-muted">{formatEuro(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
